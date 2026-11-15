// Lógica pura del reloj de jornada y multiplicadores

import {
  DURACION_JORNADA,
  MULT_DRENAJE_POR_JORNADA,
} from './balance';

export function obtenerTiempoRestante(
  segundosTranscurridos: number,
  duracionTotal: number = DURACION_JORNADA,
): number {
  return Math.max(0, duracionTotal - segundosTranscurridos);
}

export function formatearTiempoMMSS(segundosRestantes: number): string {
  const totalEntero = Math.max(0, Math.ceil(segundosRestantes));
  const minutos = Math.floor(totalEntero / 60);
  const segundos = totalEntero % 60;
  const minTxt = String(minutos).padStart(2, '0');
  const segTxt = String(segundos).padStart(2, '0');
  return `${minTxt}:${segTxt}`;
}

export function calcularFraccionRestante(
  segundosTranscurridos: number,
  duracionTotal: number = DURACION_JORNADA,
): number {
  if (duracionTotal <= 0) {
    return 0;
  }
  const fraccion = 1 - segundosTranscurridos / duracionTotal;
  return Math.max(0, Math.min(1, fraccion));
}

export function obtenerMultiplicadorJornada(jornada: number): number {
  const indice = Math.max(
    0,
    Math.min(MULT_DRENAJE_POR_JORNADA.length - 1, Math.floor(jornada) - 1),
  );
  return MULT_DRENAJE_POR_JORNADA[indice];
}
