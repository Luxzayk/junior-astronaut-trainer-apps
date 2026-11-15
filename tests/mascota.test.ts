import { describe, expect, it } from 'vitest';
import {
  estadoMascota,
  obtenerFraseMascota,
  type EstadoMascota,
} from '../src/art/mascota';
import { DATOS_CREDITOS } from '../src/data/creditos';
import { FUENTES_DATOS } from '../src/data/fuentes';

describe('Mascota procedural Luni', () => {
  it('evalúa los 4 estados de ánimo en límites exactos (50, 49, 35, 34, 15, 14)', () => {
    expect(estadoMascota(100, 100)).toBe('contenta');
    expect(estadoMascota(50, 50)).toBe('contenta');

    expect(estadoMascota(49, 50)).toBe('neutral');
    expect(estadoMascota(50, 49)).toBe('neutral');
    expect(estadoMascota(35, 35)).toBe('neutral');
    expect(estadoMascota(35, 80)).toBe('neutral');
    expect(estadoMascota(80, 35)).toBe('neutral');

    expect(estadoMascota(34, 80)).toBe('preocupada');
    expect(estadoMascota(80, 34)).toBe('preocupada');
    expect(estadoMascota(15, 80)).toBe('preocupada');
    expect(estadoMascota(80, 15)).toBe('preocupada');

    expect(estadoMascota(14, 80)).toBe('asustada');
    expect(estadoMascota(80, 14)).toBe('asustada');
    expect(estadoMascota(14, 34)).toBe('asustada');
    expect(estadoMascota(0, 100)).toBe('asustada');
  });

  it('devuelve frases cortas alentadoras en ES y EN para todos los estados y contextos', () => {
    const estados: readonly EstadoMascota[] = [
      'contenta',
      'neutral',
      'preocupada',
      'asustada',
    ];
    for (const estado of estados) {
      const es = obtenerFraseMascota(estado, 'hud', 'es');
      const en = obtenerFraseMascota(estado, 'hud', 'en');
      expect(es.length).toBeGreaterThan(5);
      expect(en.length).toBeGreaterThan(5);
      expect(es.split('\n').length).toBeLessThanOrEqual(2);
      expect(en.split('\n').length).toBeLessThanOrEqual(2);
    }

    for (const ctx of [
      'evento',
      'cierreCompleta',
      'cierreIncompleta',
      'cierreEvacuacion',
      'informeEvacuacion',
    ] as const) {
      expect(obtenerFraseMascota('neutral', ctx, 'es').length).toBeGreaterThan(5);
      expect(obtenerFraseMascota('neutral', ctx, 'en').length).toBeGreaterThan(5);
    }
  });

  it('declara a Luni en fuentes y créditos como personaje del juego y no dato de NASA', () => {
    const fuenteLuni = FUENTES_DATOS.find((f) => f.id === 'personaje-luni');
    expect(fuenteLuni).toBeDefined();
    expect(fuenteLuni?.titulo.es).toContain('Luni');
    expect(fuenteLuni?.nota.es.toLowerCase()).toContain('ficticio');

    const notaCreditosEs = DATOS_CREDITOS.fuentesDatos.es.join(' ');
    const notaCreditosEn = DATOS_CREDITOS.fuentesDatos.en.join(' ');
    expect(notaCreditosEs).toContain('Luni');
    expect(notaCreditosEn).toContain('Luni');
  });
});
