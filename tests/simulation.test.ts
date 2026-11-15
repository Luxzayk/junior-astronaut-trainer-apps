import { describe, expect, it } from 'vitest';
import {
  ELECCIONES,
} from '../src/game/balance';
import {
  obtenerOpcionesApagon,
  obtenerOpcionesEventoClima,
} from '../src/game/events';
import { simularSemana } from '../src/game/simulation';
import type { RecursoNombre } from '../src/game/state';

function normalizarEfecto(
  ef: Partial<Record<RecursoNombre, number>>,
): Record<RecursoNombre, number> {
  return {
    aire: ef.aire ?? 0,
    energia: ef.energia ?? 0,
    escudo: ef.escudo ?? 0,
  };
}

function verificarParNoDominado(
  aRaw: Partial<Record<RecursoNombre, number>>,
  bRaw: Partial<Record<RecursoNombre, number>>,
): boolean {
  const a = normalizarEfecto(aRaw);
  const b = normalizarEfecto(bRaw);
  const bMejorIgualTodo =
    b.aire >= a.aire && b.energia >= a.energia && b.escudo >= a.escudo;
  const bMejorAlgo =
    b.aire > a.aire || b.energia > a.energia || b.escudo > a.escudo;
  return bMejorIgualTodo && bMejorAlgo;
}

describe('Simulación de 5 jornadas y criterios de calibración', () => {
  it('política perfecto completa las 5 jornadas sin evacuación, con mínimos >= 10 y final retador (< 40)', () => {
    const res = simularSemana('perfecto');

    expect(res.evacuado).toBe(false);
    expect(res.semanaCompletada).toBe(true);
    expect(res.jornadaAlcanzada).toBe(5);
    expect(res.minimosSemana.aire).toBeGreaterThanOrEqual(10);
    expect(res.minimosSemana.energia).toBeGreaterThanOrEqual(10);
    expect(res.minimosSemana.escudo).toBeGreaterThanOrEqual(10);

    const minFinal = Math.min(
      res.finalesSemana.aire,
      res.finalesSemana.energia,
      res.finalesSemana.escudo,
    );
    expect(minFinal).toBeLessThan(40);
  });

  it('política pasivo sufre evacuación a más tardar en la Jornada 3', () => {
    const res = simularSemana('pasivo');

    expect(res.evacuado).toBe(true);
    expect(res.jornadaEvacuacion).not.toBeNull();
    expect(res.jornadaEvacuacion!).toBeLessThanOrEqual(3);
  });

  it('política mediocre sobrevive hasta Jornada >= 3 pero no completa las 5 jornadas', () => {
    const res = simularSemana('mediocre');

    expect(res.jornadaAlcanzada).toBeGreaterThanOrEqual(3);
    expect(res.evacuado).toBe(true);
    expect(res.semanaCompletada).toBe(false);
  });

  it('ninguna opción de elección ni de evento es estrictamente superior a otra en todos los recursos', () => {
    for (const tipo of Object.keys(ELECCIONES) as Array<keyof typeof ELECCIONES>) {
      const ops = Object.values(ELECCIONES[tipo]);
      for (let i = 0; i < ops.length; i++) {
        for (let j = 0; j < ops.length; j++) {
          if (i !== j) {
            expect(verificarParNoDominado(ops[i], ops[j])).toBe(false);
          }
        }
      }
    }

    for (const tipoClima of ['FULGURACION', 'TORMENTA_GRANDE'] as const) {
      const ops = obtenerOpcionesEventoClima(tipoClima);
      expect(verificarParNoDominado(ops[0].efectos, ops[1].efectos)).toBe(false);
      expect(verificarParNoDominado(ops[1].efectos, ops[0].efectos)).toBe(false);
    }

    const opsApagon = obtenerOpcionesApagon();
    for (let i = 0; i < opsApagon.length; i++) {
      for (let j = 0; j < opsApagon.length; j++) {
        if (i !== j) {
          expect(
            verificarParNoDominado(opsApagon[i].efectos, opsApagon[j].efectos),
          ).toBe(false);
        }
      }
    }
  });

  it('combinaciones válidas con J3 media (J5 media o fuerte) cumplen todos los criterios en las 3 políticas', () => {
    for (const nivelJ5 of ['media', 'fuerte'] as const) {
      const perfecto = simularSemana('perfecto', { nivelJ3: 'media', nivelJ5 });
      expect(perfecto.evacuado).toBe(false);
      expect(perfecto.semanaCompletada).toBe(true);
      expect(perfecto.minimosSemana.aire).toBeGreaterThanOrEqual(10);
      expect(perfecto.minimosSemana.energia).toBeGreaterThanOrEqual(10);
      expect(perfecto.minimosSemana.escudo).toBeGreaterThanOrEqual(10);
      const minFinal = Math.min(
        perfecto.finalesSemana.aire,
        perfecto.finalesSemana.energia,
        perfecto.finalesSemana.escudo,
      );
      expect(minFinal).toBeLessThan(40);

      const mediocre = simularSemana('mediocre', { nivelJ3: 'media', nivelJ5 });
      expect(mediocre.jornadaAlcanzada).toBeGreaterThanOrEqual(3);
      expect(mediocre.evacuado).toBe(true);
      expect(mediocre.semanaCompletada).toBe(false);

      const pasivo = simularSemana('pasivo', { nivelJ3: 'media', nivelJ5 });
      expect(pasivo.evacuado).toBe(true);
      expect(pasivo.jornadaEvacuacion).not.toBeNull();
      expect(pasivo.jornadaEvacuacion!).toBeLessThanOrEqual(3);
    }
  });

  it('confirma que J3 nivel fuerte bajaría Energía por debajo de 10 (motivo de restringir J3 a media)', () => {
    for (const nivelJ5 of ['media', 'fuerte'] as const) {
      const perfecto = simularSemana('perfecto', { nivelJ3: 'fuerte', nivelJ5 });
      expect(perfecto.evacuado).toBe(false);
      expect(perfecto.semanaCompletada).toBe(true);
      expect(perfecto.minimosSemana.energia).toBeLessThan(10);

      const mediocre = simularSemana('mediocre', { nivelJ3: 'fuerte', nivelJ5 });
      expect(mediocre.evacuado).toBe(true);
      expect(mediocre.jornadaAlcanzada).toBeGreaterThanOrEqual(3);

      const pasivo = simularSemana('pasivo', { nivelJ3: 'fuerte', nivelJ5 });
      expect(pasivo.evacuado).toBe(true);
      expect(pasivo.jornadaEvacuacion!).toBeLessThanOrEqual(3);
    }
  });

  it('mantiene supervivencia perfecto y evacuación pasivo/mediocre en los extremos 70% y 80% iniciales', () => {
    for (const inicio of [70, 80]) {
      const recursosIniciales = { aire: inicio, energia: inicio, escudo: inicio };
      const perfecto = simularSemana('perfecto', {
        nivelJ3: 'media',
        nivelJ5: 'fuerte',
        recursosIniciales,
      });
      expect(perfecto.evacuado).toBe(false);
      expect(perfecto.semanaCompletada).toBe(true);

      const mediocre = simularSemana('mediocre', {
        nivelJ3: 'media',
        nivelJ5: 'fuerte',
        recursosIniciales,
      });
      expect(mediocre.evacuado).toBe(true);
      expect(mediocre.jornadaAlcanzada).toBeGreaterThanOrEqual(3);

      const pasivo = simularSemana('pasivo', {
        nivelJ3: 'media',
        nivelJ5: 'fuerte',
        recursosIniciales,
      });
      expect(pasivo.evacuado).toBe(true);
      expect(pasivo.jornadaEvacuacion!).toBeLessThanOrEqual(3);
    }
  });
});
