import { describe, expect, it, vi } from 'vitest';
import {
  ELECCIONES,
  MAX_JORNADAS,
} from '../src/game/balance';
import { JORNADAS } from '../src/game/jornadas';
import { ESTACIONES } from '../src/game/map';
import type { RecursoNombre } from '../src/game/state';

vi.mock('phaser', () => ({ default: {} }));

import { MINIGAME_REGISTRY } from '../src/minigames/registry';

function esDominada(
  a: Readonly<Record<RecursoNombre, number>>,
  b: Readonly<Record<RecursoNombre, number>>,
): boolean {
  const bEsIgualOMejorEnTodo =
    b.aire >= a.aire && b.energia >= a.energia && b.escudo >= a.escudo;
  const bEsEstrictamenteMejorEnAlgo =
    b.aire > a.aire || b.energia > a.energia || b.escudo > a.escudo;
  return bEsIgualOMejorEnTodo && bEsEstrictamenteMejorEnAlgo;
}

function esGratis(efecto: Readonly<Record<RecursoNombre, number>>): boolean {
  return efecto.aire >= 0 && efecto.energia >= 0 && efecto.escudo >= 0;
}

describe('Integridad de las 5 jornadas, elecciones y eventos', () => {
  it('define exactamente 5 jornadas numeradas del 1 al 5', () => {
    expect(JORNADAS).toHaveLength(MAX_JORNADAS);
    expect(JORNADAS.map((j) => j.jornada)).toEqual([1, 2, 3, 4, 5]);
  });

  it('cada misión tiene estación y minijuego válidos en registry', () => {
    const estacionesValidas = new Set(ESTACIONES.map((e) => e.salaId));
    const minijuegosValidos = new Set(Object.keys(MINIGAME_REGISTRY));

    for (const j of JORNADAS) {
      expect(j.misiones.length).toBeGreaterThan(0);
      for (const m of j.misiones) {
        expect(estacionesValidas.has(m.estacionId)).toBe(true);
        expect(minijuegosValidos.has(m.minijuego)).toBe(true);
        expect(typeof MINIGAME_REGISTRY[m.minijuego]).toBe('function');
      }
    }
  });

  it('la dificultad (pasos) nunca disminuye de una jornada a la siguiente', () => {
    let maxPasosAnterior = 0;
    const maxPorMinijuego: Record<string, number> = {};

    for (const j of JORNADAS) {
      let maxJornada = 0;
      for (const m of j.misiones) {
        expect(m.pasos).toBeGreaterThanOrEqual(maxPasosAnterior);
        const previoTipo = maxPorMinijuego[m.minijuego] ?? 0;
        expect(m.pasos).toBeGreaterThanOrEqual(previoTipo);
        maxPorMinijuego[m.minijuego] = Math.max(previoTipo, m.pasos);
        maxJornada = Math.max(maxJornada, m.pasos);
      }
      maxPasosAnterior = Math.max(maxPasosAnterior, maxJornada);
    }
  });

  it('cada elección de ELECCIONES tiene 2 opciones no dominadas y ninguna es gratis', () => {
    const tipos = Object.keys(ELECCIONES) as Array<keyof typeof ELECCIONES>;
    expect(tipos).toEqual(['envio_energia', 'invernadero', 'escudo_potencia']);

    for (const tipo of tipos) {
      const opciones = Object.values(ELECCIONES[tipo]) as Array<
        Readonly<Record<RecursoNombre, number>>
      >;
      expect(opciones).toHaveLength(2);
      const [opA, opB] = opciones;

      expect(esGratis(opA)).toBe(false);
      expect(esGratis(opB)).toBe(false);
      expect(esDominada(opA, opB)).toBe(false);
      expect(esDominada(opB, opA)).toBe(false);
    }
  });

  it('distribuye eventos correctamente: fuga en J2, clima en J3 y J5, apagón en J4', () => {
    expect(JORNADAS[0].evento).toBeNull();
    expect(JORNADAS[1].evento?.tipo).toBe('fuga');
    expect(JORNADAS[2].evento?.tipo).toBe('clima');
    expect(JORNADAS[3].evento?.tipo).toBe('apagon');
    expect(JORNADAS[4].evento?.tipo).toBe('clima');
  });
});
