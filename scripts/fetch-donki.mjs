// Script manual offline para consultar eventos reales de NASA DONKI (FLR y SEP).
// AVISO IMPORTANTE:
// - DEMO_KEY tiene límites muy bajos (aprox. 30 peticiones/hora y 50/día). NO ejecutar en bucle.
// - Los archivos *.raw.json generados en src/data/donki/ son SOLO para trazabilidad y archivo.
// - Nunca importes los *.raw.json dentro de src/; el juego lee únicamente src/data/eventos.json curado.
//
// Uso manual (cuando tengas fechas reales):
//   NASA_API_KEY=TU_CLAVE node scripts/fetch-donki.mjs

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ_PROYECTO = resolve(__dirname, '..');
const CARPETA_DONKI = resolve(RAIZ_PROYECTO, 'src/data/donki');
const API_KEY = process.env.NASA_API_KEY || 'DEMO_KEY';
const PAUSA_ENTRE_PETICIONES_MS = 2000;

// Reemplaza AAAA-MM-DD por las ventanas reales antes de ejecutar manualmente.
const SEMANAS = [
  { id: 'semana-1', inicio: 'AAAA-MM-DD', fin: 'AAAA-MM-DD' },
  { id: 'semana-2', inicio: 'AAAA-MM-DD', fin: 'AAAA-MM-DD' },
  { id: 'semana-3', inicio: 'AAAA-MM-DD', fin: 'AAAA-MM-DD' },
];

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function esFechaIsoSimple(fecha) {
  return /^\d{4}-\d{2}-\d{2}$/.test(fecha);
}

async function consultarEndpointDonki(tipo, inicio, fin) {
  const url = new URL(`https://api.nasa.gov/DONKI/${tipo}`);
  url.searchParams.set('startDate', inicio);
  url.searchParams.set('endDate', fin);
  url.searchParams.set('api_key', API_KEY);

  const respuesta = await fetch(url);
  if (!respuesta.ok) {
    throw new Error(
      `Error HTTP ${respuesta.status} (${respuesta.statusText}) al consultar DONKI/${tipo} para ${inicio}..${fin}`,
    );
  }
  return respuesta.json();
}

async function ejecutar() {
  mkdirSync(CARPETA_DONKI, { recursive: true });

  for (let i = 0; i < SEMANAS.length; i++) {
    const semana = SEMANAS[i];
    if (!esFechaIsoSimple(semana.inicio) || !esFechaIsoSimple(semana.fin)) {
      throw new Error(
        `La semana "${semana.id}" tiene fechas placeholder (${semana.inicio} .. ${semana.fin}). Define fechas YYYY-MM-DD antes de ejecutar.`,
      );
    }

    const flr = await consultarEndpointDonki('FLR', semana.inicio, semana.fin);
    await esperar(PAUSA_ENTRE_PETICIONES_MS);

    const sep = await consultarEndpointDonki('SEP', semana.inicio, semana.fin);

    const salida = {
      consultadoEn: new Date().toISOString(),
      ventana: {
        inicio: semana.inicio,
        fin: semana.fin,
      },
      flr,
      sep,
    };

    const rutaDestino = resolve(CARPETA_DONKI, `${semana.id}.raw.json`);
    writeFileSync(rutaDestino, `${JSON.stringify(salida, null, 2)}\n`, 'utf8');
    console.log(`Guardado ${rutaDestino}`);

    if (i < SEMANAS.length - 1) {
      await esperar(PAUSA_ENTRE_PETICIONES_MS);
    }
  }
}

ejecutar().catch((err) => {
  console.error('Fallo en fetch-donki:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
