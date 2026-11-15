import { describe, expect, it } from 'vitest';
import { avanzarBarra, crearEstadoBarra, CONFIG_BARRA_FX } from '../src/ui/hudFx';

describe('Barras del HUD', () => {
  it('converge, conserva estela en bajadas discretas y luego la agota', () => {
    let estado = avanzarBarra(crearEstadoBarra(80), 50, 16, CONFIG_BARRA_FX);
    expect(estado.estela).toBe(80);
    expect(estado.mostrado).toBeGreaterThan(50);
    for (let i = 0; i < 200; i++) estado = avanzarBarra(estado, 50, 16, CONFIG_BARRA_FX);
    expect(estado.mostrado).toBe(50);
    expect(estado.estela).toBe(50);
  });
  it('no deja estela al subir ni con drenaje pequeño continuo', () => {
    let estado = crearEstadoBarra(50);
    for (let i = 0; i < 200; i++) {
      estado = avanzarBarra(estado, 80, 16, CONFIG_BARRA_FX);
      expect(estado.estela).toBe(estado.mostrado);
    }
    for (let i = 0; i < 200; i++) {
      estado = avanzarBarra(estado, 80 - i * 0.02, 16, CONFIG_BARRA_FX);
      expect(estado.estela).toBe(estado.mostrado);
    }
  });
  it('movimiento reducido usa valores reales y marcador estático temporal', () => {
    const config = { ...CONFIG_BARRA_FX, movimientoReducido: true };
    const estado = avanzarBarra(crearEstadoBarra(80), 50, 16, config);
    expect(estado.mostrado).toBe(50); expect(estado.estela).toBe(50);
    expect(estado.perdidaDesde).toBe(80); expect(estado.perdidaHasta).toBe(50);
    expect(avanzarBarra(estado, 50, 1600, config).marcadorMs).toBe(0);
  });
});

import { detectarCambioDiscreto, agruparCambios } from '../src/ui/hudFx';
import { AGUA_BAJA_MULT_AIRE, DEBUG_VELOCIDADES, DRENAJE_BASE_POR_SEG, MULT_DRENAJE_POR_JORNADA, MULT_MODULO_DANADO } from '../src/game/balance';
import { readFileSync } from 'node:fs';
import { UI_CONFIG } from '../src/ui/uiConfig';

describe('Cambios discretos del HUD', () => {
  it('el drenaje máximo por tick real, incluso en debug, no activa flotantes', () => {
    const base = readFileSync(new URL('../src/scenes/BaseScene.ts', import.meta.url), 'utf8');
    const limite = /Math\.min\(delta \/ 1000, ([\d.]+)\)/.exec(base);
    expect(limite).not.toBeNull();
    const dtMax = Number(limite?.[1]) * Math.max(...DEBUG_VELOCIDADES);
    for (const recurso of ['aire', 'energia', 'escudo'] as const) {
      const drenaje = DRENAJE_BASE_POR_SEG[recurso] * Math.max(...MULT_DRENAJE_POR_JORNADA) * MULT_MODULO_DANADO * (recurso === 'aire' ? AGUA_BAJA_MULT_AIRE : 1) * dtMax;
      expect(detectarCambioDiscreto(-drenaje, UI_CONFIG.umbralDeltaFlotante)).toBe(false);
    }
    expect(detectarCambioDiscreto(-6)).toBe(true); expect(detectarCambioDiscreto(30)).toBe(true);
  });
  it('agrupa por recurso dentro de 300 ms sin alterar entradas', () => {
    const cambios = [{ recurso: 'energia' as const, delta: -6, instanteMs: 0 }, { recurso: 'aire' as const, delta: 30, instanteMs: 50 }, { recurso: 'energia' as const, delta: -4, instanteMs: 200 }, { recurso: 'energia' as const, delta: 8, instanteMs: 301 }];
    const grupos = agruparCambios(cambios, UI_CONFIG.ventanaAgrupacionMs);
    expect(grupos.map(g => g.delta)).toEqual([-10, 30, 8]); expect(cambios[0].delta).toBe(-6);
  });
});

import { calcularPreview } from '../src/ui/hudFx';
describe('Vista previa de costos', () => {
  it('acota la subida a 100 y la bajada a 0 sin cambiar el valor actual', () => {
    expect(calcularPreview(90, 30)).toEqual({ desde: 90, hasta: 100, tipo: 'subida' });
    expect(calcularPreview(4, -6)).toEqual({ desde: 4, hasta: 0, tipo: 'bajada' });
    expect(calcularPreview(50, -6)).toEqual({ desde: 50, hasta: 44, tipo: 'bajada' });
    expect(calcularPreview(50, 0).tipo).toBe('sinCambio');
  });
});

import { vi } from 'vitest';
import { marcadorEvento } from '../src/ui/hudFx';
import { JORNADAS } from '../src/game/jornadas';
import { DEMO_DURACION, DEMO_EVENTO_SEGUNDO, DURACION_JORNADA } from '../src/game/balance';
describe('Marcador del evento en el reloj', () => {
  it('lee tiempos y tipos de cada jornada y los valores propios de demo', () => {
    expect(marcadorEvento(JORNADAS[0], 'semana', DURACION_JORNADA)).toBeNull();
    for (const jornada of JORNADAS.slice(1)) {
      const marcador = marcadorEvento(jornada, 'semana', DURACION_JORNADA);
      expect(marcador?.fraccion).toBe(jornada.evento!.segundo / DURACION_JORNADA);
      expect(marcador?.tipo).toBe(jornada.evento!.tipo);
    }
    expect(marcadorEvento(JORNADAS[0], 'demo', DEMO_DURACION)).toEqual({ fraccion: DEMO_EVENTO_SEGUNDO / DEMO_DURACION, tipo: 'clima' });
  });
  it('rechaza segundos fuera de rango y deja un aviso controlado', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      expect(marcadorEvento({ evento: { tipo: 'apagon', segundo: 121 } }, 'semana', 120)).toBeNull();
      expect(aviso).toHaveBeenCalledOnce();
    } finally { aviso.mockRestore(); }
  });
});

import { valorConteo } from '../src/ui/hudFx';
describe('Conteo del cierre', () => {
  it('respeta extremos exactos y crece monótonamente sin superar el final', () => {
    for (const final of [0, 6, 30, 74.12345, 100, 123.4]) {
      expect(valorConteo(0, final, UI_CONFIG.conteoMs)).toBe(0);
      expect(valorConteo(UI_CONFIG.conteoMs, final, UI_CONFIG.conteoMs)).toBe(final);
      expect(valorConteo(UI_CONFIG.conteoMs + 1, final, UI_CONFIG.conteoMs)).toBe(final);
      let previo = 0;
      for (let t = 0; t <= UI_CONFIG.conteoMs; t += 16) {
        const valor = valorConteo(t, final, UI_CONFIG.conteoMs);
        expect(valor).toBeGreaterThanOrEqual(previo); expect(valor).toBeLessThanOrEqual(final); previo = valor;
      }
    }
    expect(valorConteo(0, 30, 0)).toBe(30);
  });
});

import { COSTO_INTENTO_MINIJUEGO, EFECTOS_APAGON, EFECTOS_EVENTO_FLR, EFECTOS_EVENTO_TORMENTA_GRANDE, ELECCIONES, RECARGA_COMPLETA, REFUERZO_CONTROL_MISION } from '../src/game/balance';
describe('Cobertura de los orígenes reales de cambios discretos', () => {
  it('reconoce costos y refuerzos de todas las definiciones aplicadas por el juego', () => {
    const deltas = [
      ...Object.values(ELECCIONES).flatMap(opciones => Object.values(opciones).flatMap(efectos => Object.values(efectos))),
      ...Object.values(EFECTOS_APAGON).flatMap(efectos => Object.values(efectos)),
      ...Object.values(EFECTOS_EVENTO_FLR).flatMap(efectos => Object.values(efectos)),
      ...Object.values(EFECTOS_EVENTO_TORMENTA_GRANDE).flatMap(efectos => Object.values(efectos)),
      ...Object.values(COSTO_INTENTO_MINIJUEGO).flatMap(efectos => Object.values(efectos)),
      RECARGA_COMPLETA, ...Object.values(REFUERZO_CONTROL_MISION),
    ];
    for (const delta of deltas) {
      expect(typeof delta).toBe('number');
      if (typeof delta === 'number' && delta !== 0) expect(detectarCambioDiscreto(delta)).toBe(true);
    }
  });
  it('dt cero conserva el progreso de las barras y la espera de la estela', () => {
    const estado = avanzarBarra(crearEstadoBarra(80), 50, 16, CONFIG_BARRA_FX);
    const pausado = avanzarBarra(estado, 50, 0, CONFIG_BARRA_FX);
    expect(pausado.mostrado).toBeCloseTo(estado.mostrado);
    expect(pausado.estela).toBe(estado.estela);
    expect(pausado.esperaMs).toBe(estado.esperaMs);
    expect(pausado.marcadorMs).toBe(estado.marcadorMs);
  });
});
