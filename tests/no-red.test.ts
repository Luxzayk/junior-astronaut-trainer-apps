/// <reference types="node" />
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const RAIZ_SRC = join(process.cwd(), 'src');
const EXTENSIONES_CODIGO = new Set(['.ts', '.tsx', '.js', '.mjs']);

function recolectarArchivos(dir: string): string[] {
  const resultado: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    const info = statSync(ruta);
    if (info.isDirectory()) {
      resultado.push(...recolectarArchivos(ruta));
    } else if (EXTENSIONES_CODIGO.has(extname(entrada))) {
      resultado.push(ruta);
    }
  }
  return resultado;
}

function quitarComentarios(codigo: string): string {
  return codigo
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('Política cero red en tiempo de ejecución (src/)', () => {
  it('no contiene llamadas fetch, api_key ni importaciones de archivos .raw.json en src/', () => {
    const archivos = recolectarArchivos(RAIZ_SRC);
    expect(archivos.length).toBeGreaterThan(10);

    for (const ruta of archivos) {
      const rel = relative(process.cwd(), ruta).replace(/\\/g, '/');
      const contenidoSinComentarios = quitarComentarios(
        readFileSync(ruta, 'utf8'),
      );

      expect(contenidoSinComentarios, `${rel} no debe usar fetch(`).not.toMatch(
        /\bfetch\s*\(/,
      );
      expect(
        contenidoSinComentarios,
        `${rel} no debe contener api_key`,
      ).not.toMatch(/\bapi_key\b/i);
      expect(
        contenidoSinComentarios,
        `${rel} no debe importar archivos .raw.json`,
      ).not.toContain('.raw.json');

      const permitidoApiNasa =
        rel === 'src/data/fuentes.ts' || rel === 'src/i18n.ts';
      if (!permitidoApiNasa) {
        expect(
          contenidoSinComentarios,
          `${rel} no debe referenciar api.nasa.gov`,
        ).not.toContain('api.nasa.gov');
      }
    }
  });
});
