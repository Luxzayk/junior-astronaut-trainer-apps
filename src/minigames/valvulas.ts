// Lógica pura del minijuego "Válvulas" (secuencia de cierre y medidor de fuga, sin Phaser)

import {
  MEDIDOR_BAJA_ACIERTO,
  MEDIDOR_SUBE_ERROR,
  MEDIDOR_SUBE_POR_SEG,
  MINIJUEGO_TIEMPO_LIMITE,
  VALVULAS_MAX_PASOS,
  VALVULAS_MEDIDOR_INICIAL,
  VALVULAS_MEDIDOR_MAX,
  VALVULAS_MIN_PASOS,
} from '../game/balance';

export type FormaValvula =
  | 'circulo'
  | 'cuadrado'
  | 'triangulo'
  | 'rombo'
  | 'hexagono';

export interface ValvulaItem {
  id: number; // Orden real de flujo: 1..pasos
  posicionVisual: number; // Índice visual mezclado: 0..pasos-1
  forma: FormaValvula;
  cerrada: boolean;
}

export interface EstadoValvulas {
  pasos: number;
  valvulas: ValvulaItem[]; // Ordenadas por posicionVisual
  siguienteId: number;
  medidor: number; // 0..100
  tiempoRestante: number;
  ultimoErrorId: number | null;
  ultimoAciertoId: number | null;
}

export type ResultadoValvulas = 'jugando' | 'exito' | 'fallo';

const FORMAS_DISPONIBLES: readonly FormaValvula[] = [
  'circulo',
  'cuadrado',
  'triangulo',
  'rombo',
  'hexagono',
];

function crearRng(semilla?: number): () => number {
  if (typeof semilla !== 'number' || !Number.isFinite(semilla)) {
    return Math.random;
  }
  let estado = (Math.floor(semilla) >>> 0) || 1;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

function mezclarIds(pasos: number, rng: () => number): number[] {
  const ids = Array.from({ length: pasos }, (_, idx) => idx + 1);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = ids[i];
    ids[i] = ids[j];
    ids[j] = temp;
  }
  // Garantiza que nunca queden en orden trivial 1, 2, 3...
  const esIdentidad = ids.every((id, idx) => id === idx + 1);
  if (esIdentidad && ids.length >= 2) {
    const primero = ids[0];
    ids[0] = ids[1];
    ids[1] = primero;
  }
  return ids;
}

export function generarNivel(
  pasos: number = VALVULAS_MIN_PASOS,
  semilla?: number,
  tiempoLimite: number = MINIJUEGO_TIEMPO_LIMITE.valvulas,
): EstadoValvulas {
  const pasosSeguros = Math.max(
    VALVULAS_MIN_PASOS,
    Math.min(VALVULAS_MAX_PASOS, Math.round(pasos)),
  );
  const rng = crearRng(semilla);
  const ordenVisual = mezclarIds(pasosSeguros, rng);

  const valvulas: ValvulaItem[] = ordenVisual.map((id, pos) => ({
    id,
    posicionVisual: pos,
    forma: FORMAS_DISPONIBLES[(id - 1) % FORMAS_DISPONIBLES.length],
    cerrada: false,
  }));

  return {
    pasos: pasosSeguros,
    valvulas,
    siguienteId: 1,
    medidor: VALVULAS_MEDIDOR_INICIAL,
    tiempoRestante: Math.max(1, tiempoLimite),
    ultimoErrorId: null,
    ultimoAciertoId: null,
  };
}

export function resultado(estado: EstadoValvulas): ResultadoValvulas {
  if (estado.valvulas.every((v) => v.cerrada)) {
    return 'exito';
  }
  if (
    estado.medidor >= VALVULAS_MEDIDOR_MAX ||
    estado.tiempoRestante <= 0
  ) {
    return 'fallo';
  }
  return 'jugando';
}

export function pulsarValvula(
  estado: EstadoValvulas,
  id: number,
): EstadoValvulas {
  if (resultado(estado) !== 'jugando') {
    return estado;
  }

  const objetivo = estado.valvulas.find((v) => v.id === id);
  if (!objetivo || objetivo.cerrada) {
    return estado;
  }

  if (objetivo.id === estado.siguienteId) {
    const nuevasValvulas = estado.valvulas.map((v) =>
      v.id === id ? { ...v, cerrada: true } : { ...v },
    );
    return {
      ...estado,
      valvulas: nuevasValvulas,
      siguienteId: estado.siguienteId + 1,
      medidor: Math.max(0, estado.medidor - MEDIDOR_BAJA_ACIERTO),
      ultimoErrorId: null,
      ultimoAciertoId: id,
    };
  }

  return {
    ...estado,
    valvulas: estado.valvulas.map((v) => ({ ...v })),
    medidor: Math.min(
      VALVULAS_MEDIDOR_MAX,
      estado.medidor + MEDIDOR_SUBE_ERROR,
    ),
    ultimoErrorId: id,
    ultimoAciertoId: null,
  };
}

export function tick(estado: EstadoValvulas, dtSeg: number): EstadoValvulas {
  if (resultado(estado) !== 'jugando' || dtSeg <= 0) {
    return estado;
  }

  const nuevoMedidor = Math.min(
    VALVULAS_MEDIDOR_MAX,
    estado.medidor + MEDIDOR_SUBE_POR_SEG * dtSeg,
  );
  const nuevoTiempo = Math.max(0, estado.tiempoRestante - dtSeg);

  return {
    ...estado,
    medidor: nuevoMedidor,
    tiempoRestante: nuevoTiempo,
  };
}
