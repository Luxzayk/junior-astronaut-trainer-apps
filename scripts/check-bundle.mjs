#!/usr/bin/env node
// Auditoría offline del bundle dist/: tamaño total, gzip JS <= 1.2 MB y verificación de URLs externas

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_DIR = join(process.cwd(), 'dist');
const LIMITE_GZIP_JS_BYTES = Math.floor(1.2 * 1024 * 1024); // 1.2 MB = 1,258,291 bytes

// URLs de documentación/licencias permitidas únicamente como texto estático o metadato informativo
const PREFIJOS_URL_PERMITIDOS = [
  'https://phaser.io',
  'http://phaser.io',
  'https://opensource.org',
  'http://opensource.org',
  'https://www.w3.org',
  'http://www.w3.org',
  'https://api.nasa.gov',
  'https://ccmc.gsfc.nasa.gov',
  'https://osdr.nasa.gov',
  'https://github.com/phaserjs',
  'https://github.com/photonstorm',
  'https://developer.mozilla.org',
  'https://ecma-international.org',
  'https://fonts.google.com/specimen/Nunito',
  'https://scripts.sil.org/OFL',
];

function recolectarArchivos(dir) {
  const resultado = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    const info = statSync(ruta);
    if (info.isDirectory()) {
      resultado.push(...recolectarArchivos(ruta));
    } else {
      resultado.push(ruta);
    }
  }
  return resultado;
}

function formatearKB(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB (${bytes} bytes)`;
}

function esUrlPermitida(url) {
  return PREFIJOS_URL_PERMITIDOS.some((prefijo) => url.startsWith(prefijo));
}

function main() {
  if (!existsSync(DIST_DIR)) {
    console.error('[check-bundle] Error: no existe dist/. Ejecuta `npm run build` primero.');
    process.exit(1);
  }

  const archivos = recolectarArchivos(DIST_DIR);
  let totalDistBytes = 0;
  let totalJsRawBytes = 0;
  let totalJsGzipBytes = 0;

  const archivosJs = [];
  const urlsNoPermitidas = [];

  for (const ruta of archivos) {
    const rel = relative(DIST_DIR, ruta).replace(/\\/g, '/');
    const contenidoBuf = readFileSync(ruta);
    totalDistBytes += contenidoBuf.length;

    const ext = extname(ruta).toLowerCase();
    if (ext === '.js' || ext === '.mjs') {
      const gzipSize = gzipSync(contenidoBuf, { level: 9 }).length;
      totalJsRawBytes += contenidoBuf.length;
      totalJsGzipBytes += gzipSize;
      archivosJs.push({ rel, raw: contenidoBuf.length, gzip: gzipSize });
    }

    if (ext === '.js' || ext === '.mjs' || ext === '.css' || ext === '.html') {
      const texto = contenidoBuf.toString('utf8');
      const matches = texto.match(/https?:\/\/[^\s"'`)\\<>]+/g) ?? [];
      for (const url of matches) {
        if (!esUrlPermitida(url)) {
          urlsNoPermitidas.push({ archivo: rel, url });
        }
      }
    }
  }

  console.log('=== Auditoría de bundle (dist/) ===');
  console.log(`Archivos analizados : ${archivos.length}`);
  console.log(`Tamaño total dist/  : ${formatearKB(totalDistBytes)}`);
  console.log(`JS sin comprimir    : ${formatearKB(totalJsRawBytes)}`);
  console.log(
    `JS gzip             : ${formatearKB(totalJsGzipBytes)} (límite: ${formatearKB(LIMITE_GZIP_JS_BYTES)})`,
  );

  for (const item of archivosJs) {
    console.log(
      `  - ${item.rel}: raw ${formatearKB(item.raw)}, gzip ${formatearKB(item.gzip)}`,
    );
  }

  let fallo = false;

  if (totalJsGzipBytes > LIMITE_GZIP_JS_BYTES) {
    console.error(
      `[check-bundle] ERROR: el tamaño gzip del JS (${totalJsGzipBytes} B) supera el límite de 1.2 MB (${LIMITE_GZIP_JS_BYTES} B).`,
    );
    fallo = true;
  }

  if (urlsNoPermitidas.length > 0) {
    console.error('[check-bundle] ERROR: se detectaron URLs externas no permitidas en dist/:');
    for (const hallazgo of urlsNoPermitidas) {
      console.error(`  - ${hallazgo.archivo}: ${hallazgo.url}`);
    }
    fallo = true;
  }

  if (fallo) {
    process.exit(1);
  }

  console.log('[check-bundle] OK: presupuesto gzip y política sin red verificados.');
}

main();
