// Lógica pura de misiones, costos de intento y opciones de elección (sin Phaser)

import { COSTO_INTENTO_MINIJUEGO } from './balance';
import {
  JORNADAS,
  OPCIONES_DESTINO_ENERGIA,
  OPCIONES_POR_TIPO_ELECCION,
  type DefinicionJornada,
  type DefinicionMision,
  type EventoJornada,
  type IdOpcionEnergia,
  type OpcionDestinoEnergia,
  type OpcionEleccion,
  type TipoEleccion,
  type TipoMinijuego,
} from './jornadas';
import type { SalaId } from './map';
import type { RecursoNombre } from './state';
import { t } from '../i18n';

export type MapaDeltasRecursos = Partial<Record<RecursoNombre, number>>;

export type EstadoMision = 'pendiente' | 'lista' | 'perdida';

export function obtenerTextosMision(mision: DefinicionMision): {
  titulo: string;
  descripcionCorta: string;
} {
  return {
    titulo: mision.tituloClave ? t(mision.tituloClave) : mision.titulo,
    descripcionCorta: mision.descripcionClave
      ? t(mision.descripcionClave)
      : mision.descripcionCorta,
  };
}

function traducirMision(mision: DefinicionMision): DefinicionMision {
  const textos = obtenerTextosMision(mision);
  return {
    ...mision,
    titulo: textos.titulo,
    descripcionCorta: textos.descripcionCorta,
  };
}

export function obtenerDefinicionJornada(
  jornada: number,
): DefinicionJornada | null {
  return JORNADAS.find((j) => j.jornada === jornada) ?? null;
}

export function obtenerEventoDeJornada(jornada: number): EventoJornada | null {
  return obtenerDefinicionJornada(jornada)?.evento ?? null;
}

export function obtenerMisionesDeJornada(
  jornada: number,
): readonly DefinicionMision[] {
  const misiones = obtenerDefinicionJornada(jornada)?.misiones ?? [];
  return misiones.filter((m) => m.urgente === undefined).map(traducirMision);
}

export function obtenerMisionPorId(
  jornada: number,
  misionId: string | null,
  misionUrgente?: DefinicionMision | null,
): DefinicionMision | null {
  if (!misionId) {
    return null;
  }
  if (misionUrgente && misionUrgente.id === misionId) {
    return traducirMision(misionUrgente);
  }
  const misiones = obtenerMisionesDeJornada(jornada);
  return misiones.find((m) => m.id === misionId) ?? null;
}

export function estaMisionCompletada(
  misionId: string,
  misionesHechas: readonly string[],
): boolean {
  return misionesHechas.includes(misionId);
}

export function estaMisionPerdida(
  misionId: string,
  misionesPerdidas: readonly string[],
): boolean {
  return misionesPerdidas.includes(misionId);
}

export function obtenerEstadoMision(
  misionId: string,
  misionesHechas: readonly string[],
  misionesPerdidas: readonly string[] = [],
): EstadoMision {
  if (estaMisionCompletada(misionId, misionesHechas)) {
    return 'lista';
  }
  if (estaMisionPerdida(misionId, misionesPerdidas)) {
    return 'perdida';
  }
  return 'pendiente';
}

export function obtenerMisionActivaParaEstacion(
  jornada: number,
  estacionId: SalaId,
  misionesHechas: readonly string[],
  misionesPerdidas: readonly string[] = [],
  misionUrgente?: DefinicionMision | null,
): DefinicionMision | null {
  if (
    misionUrgente &&
    misionUrgente.estacionId === estacionId &&
    obtenerEstadoMision(misionUrgente.id, misionesHechas, misionesPerdidas) ===
      'pendiente'
  ) {
    return traducirMision(misionUrgente);
  }

  const misiones = obtenerMisionesDeJornada(jornada);
  for (const mision of misiones) {
    if (
      mision.estacionId === estacionId &&
      obtenerEstadoMision(mision.id, misionesHechas, misionesPerdidas) ===
        'pendiente'
    ) {
      return mision;
    }
  }
  return null;
}

export function obtenerSiguienteMisionPendiente(
  jornada: number,
  misionesHechas: readonly string[],
  misionesPerdidas: readonly string[] = [],
  misionUrgente?: DefinicionMision | null,
): DefinicionMision | null {
  if (
    misionUrgente &&
    obtenerEstadoMision(misionUrgente.id, misionesHechas, misionesPerdidas) ===
      'pendiente'
  ) {
    return traducirMision(misionUrgente);
  }

  const misiones = obtenerMisionesDeJornada(jornada);
  for (const mision of misiones) {
    if (
      obtenerEstadoMision(mision.id, misionesHechas, misionesPerdidas) ===
      'pendiente'
    ) {
      return mision;
    }
  }
  return null;
}

export function contarMisionesJornada(
  jornada: number,
  misionesHechas: readonly string[],
): { completadas: number; total: number } {
  const misiones = obtenerMisionesDeJornada(jornada).filter(
    (m) => m.obligatoria,
  );
  let completadas = 0;
  for (const mision of misiones) {
    if (estaMisionCompletada(mision.id, misionesHechas)) {
      completadas += 1;
    }
  }
  return { completadas, total: misiones.length };
}

export function obtenerCostoIntento(
  minijuego: TipoMinijuego,
): MapaDeltasRecursos {
  if (minijuego === 'proximamente') {
    return {};
  }
  return { ...COSTO_INTENTO_MINIJUEGO[minijuego] };
}

export function obtenerOpcionesPorTipoEleccion(
  tipo: TipoEleccion,
): readonly OpcionEleccion[] {
  return OPCIONES_POR_TIPO_ELECCION[tipo].map((op) => ({
    ...op,
    titulo: op.tituloClave ? t(op.tituloClave) : op.titulo,
    descripcion: op.descripcionClave ? t(op.descripcionClave) : op.descripcion,
  }));
}

export function obtenerOpcionEleccionPorId(
  tipo: TipoEleccion,
  opcionId: string,
): OpcionEleccion | null {
  return (
    obtenerOpcionesPorTipoEleccion(tipo).find((op) => op.id === opcionId) ??
    null
  );
}

export function obtenerOpcionesEnergia(): readonly OpcionDestinoEnergia[] {
  return OPCIONES_DESTINO_ENERGIA.map((op) => ({
    ...op,
    titulo: op.tituloClave ? t(op.tituloClave) : op.titulo,
    descripcion: op.descripcionClave ? t(op.descripcionClave) : op.descripcion,
  }));
}

export function obtenerOpcionEnergiaPorId(
  id: IdOpcionEnergia,
): OpcionDestinoEnergia | null {
  return obtenerOpcionesEnergia().find((op) => op.id === id) ?? null;
}

export function formatearSignoValor(delta: number): {
  signo: string;
  valorAbs: number;
} {
  return {
    signo: delta >= 0 ? '+' : '-',
    valorAbs: Math.abs(Math.round(delta)),
  };
}
