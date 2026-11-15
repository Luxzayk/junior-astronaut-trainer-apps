// Definición de las 3 semanas lunares seleccionables (lógica pura, sin Phaser)

import {
  localEventosProvider,
  type EventoClimaCurado,
  type EventosProvider,
} from '../data/eventosLoader';
import { getAjustes, type Idioma } from './settings';

export type IdSemana = 'semana-1' | 'semana-2' | 'semana-3';

export interface DefinicionSemana {
  id: IdSemana;
  nombre: {
    es: string;
    en: string;
  };
  descripcion: {
    es: string;
    en: string;
  };
  ventana: {
    inicio: string;
    fin: string;
  };
  eventos: {
    j3: string;
    j5: string;
  };
}

export const SEMANAS: readonly DefinicionSemana[] = [
  {
    id: 'semana-1',
    nombre: {
      es: 'Semana 1 · Órbita tranquila',
      en: 'Week 1 · Steady Orbit',
    },
    descripcion: {
      es: 'Escenario base para entrenar operaciones del puesto lunar.',
      en: 'Baseline week to train lunar outpost operations.',
    },
    ventana: { inicio: '2026-09-01', fin: '2026-09-07' },
    eventos: {
      j3: 'semana-1-j3',
      j5: 'semana-1-j5',
    },
  },
  {
    id: 'semana-2',
    nombre: {
      es: 'Semana 2 · Pulso solar',
      en: 'Week 2 · Solar Pulse',
    },
    descripcion: {
      es: 'Semana centrada en alertas de fulguración y control de fugas.',
      en: 'Week focused on solar flare alerts and leak response.',
    },
    ventana: { inicio: '2026-07-27', fin: '2026-08-02' },
    eventos: {
      j3: 'semana-2-j3',
      j5: 'semana-2-j5',
    },
  },
  {
    id: 'semana-3',
    nombre: {
      es: 'Semana 3 · Alta actividad',
      en: 'Week 3 · High Activity',
    },
    descripcion: {
      es: 'Semana exigente para probar escudos y energía al máximo.',
      en: 'Challenging week to test shields and power reserves.',
    },
    ventana: { inicio: '2026-08-17', fin: '2026-08-23' },
    eventos: {
      j3: 'semana-3-j3',
      j5: 'semana-3-j5',
    },
  },
];

export function esIdSemana(valor: string | null | undefined): valor is IdSemana {
  return valor === 'semana-1' || valor === 'semana-2' || valor === 'semana-3';
}

export function obtenerSemanaPorId(id?: string | null): DefinicionSemana {
  if (esIdSemana(id)) {
    const encontrada = SEMANAS.find((s) => s.id === id);
    if (encontrada) {
      return encontrada;
    }
  }
  return SEMANAS[0];
}

export function obtenerSemanaActiva(): DefinicionSemana {
  return obtenerSemanaPorId(getAjustes().ultimaSemana);
}

export function elegirSemanaAlAzar(
  randomFn: () => number = Math.random,
): DefinicionSemana {
  const raw = randomFn();
  const clamped = Math.max(0, Math.min(0.999999, Number.isFinite(raw) ? raw : 0));
  const idx = Math.floor(clamped * SEMANAS.length);
  return SEMANAS[idx] ?? SEMANAS[0];
}

export function obtenerEventosDeSemana(
  semanaId: IdSemana,
  provider: EventosProvider = localEventosProvider,
): { j3: EventoClimaCurado; j5: EventoClimaCurado } {
  const def = obtenerSemanaPorId(semanaId);
  const j3 =
    provider.obtenerPorId(def.eventos.j3) ??
    provider.obtenerPorSemanaYJornada(semanaId, 3);
  const j5 =
    provider.obtenerPorId(def.eventos.j5) ??
    provider.obtenerPorSemanaYJornada(semanaId, 5);
  return { j3, j5 };
}

export function semanaTieneDatosVerificados(
  semanaId: IdSemana,
  provider: EventosProvider = localEventosProvider,
): boolean {
  const { j3, j5 } = obtenerEventosDeSemana(semanaId, provider);
  return !j3.esEjemplo && !j5.esEjemplo;
}

export function formatearVentanaSemana(
  semana: DefinicionSemana,
  idioma: Idioma = getAjustes().idioma,
): string {
  const { inicio, fin } = semana.ventana;
  if (inicio.trim().length > 0 && fin.trim().length > 0) {
    return `${inicio} · ${fin}`;
  }
  return idioma === 'en'
    ? 'Window: sample scenario (no dates yet)'
    : 'Ventana: escenario de ejemplo (sin fechas todavía)';
}
