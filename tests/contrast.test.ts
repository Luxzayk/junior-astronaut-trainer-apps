import { describe, expect, it } from 'vitest';
import {
  contrastRatio,
  cumpleWCAG,
  evaluarParesTema,
  hexARgb,
  luminanciaRelativa,
  UMBRAL_WCAG_FOCO,
  UMBRAL_WCAG_TEXTO_GRANDE,
  UMBRAL_WCAG_TEXTO_NORMAL,
} from '../src/ui/contrast';
import {
  desregistrarObjetivoUI,
  limpiarObjetivosUI,
  listarObjetivosUI,
  obtenerObjetivoUI,
  registrarObjetivoUI,
} from '../src/ui/targets';
import { escalarTamanoTexto, TAMANOS_TEXTO } from '../src/ui/theme';

describe('Accesibilidad: contraste WCAG, escala de texto y registro de objetivos UI', () => {
  it('convierte hex válidos a RGB y rechaza valores inválidos', () => {
    expect(hexARgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexARgb('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexARgb('4fc3f7')).toEqual({ r: 79, g: 195, b: 247 });
    expect(() => hexARgb('no-es-hex')).toThrow();
  });

  it('calcula luminancia relativa y ratio WCAG correctamente', () => {
    expect(luminanciaRelativa('#000000')).toBeCloseTo(0, 6);
    expect(luminanciaRelativa('#FFFFFF')).toBeCloseTo(1, 6);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#141B34', '#141B34')).toBeCloseTo(1, 5);

    expect(UMBRAL_WCAG_TEXTO_NORMAL).toBe(4.5);
    expect(UMBRAL_WCAG_TEXTO_GRANDE).toBe(3.0);
    expect(UMBRAL_WCAG_FOCO).toBe(3.0);
    expect(cumpleWCAG('#EAF0FF', '#141B34', 'normal')).toBe(true);
    expect(cumpleWCAG('#2A3566', '#141B34', 'normal')).toBe(false);
  });

  it('garantiza que todos los pares de texto (>=4.5) y foco (>=3.0) del tema cumplen WCAG', () => {
    const resultados = evaluarParesTema();
    expect(resultados.length).toBeGreaterThan(20);

    const fallos = resultados.filter((r) => !r.cumple);
    expect(
      fallos,
      fallos
        .map((f) => `${f.nombre}: ${f.ratio.toFixed(2)} < ${f.minimo}`)
        .join(', '),
    ).toEqual([]);
  });

  it('escala tamaños de texto respetando mínimo 18px y tope opcional', () => {
    expect(escalarTamanoTexto(16, false)).toBe(TAMANOS_TEXTO.minimo);
    expect(escalarTamanoTexto(20, false)).toBe(20);
    expect(escalarTamanoTexto(20, true)).toBe(25);
    expect(escalarTamanoTexto(24, true, 26)).toBe(26);
  });

  it('registra, consulta y limpia coordenadas de objetivos UI por nombre', () => {
    limpiarObjetivosUI();
    expect(obtenerObjetivoUI('barras')).toBeNull();

    registrarObjetivoUI('barras', { x: 10, y: 8, ancho: 360, alto: 80 });
    registrarObjetivoUI('pausa', { x: 1200, y: 16, ancho: 60, alto: 60 });

    expect(obtenerObjetivoUI('barras')).toEqual({
      x: 10,
      y: 8,
      ancho: 360,
      alto: 80,
    });
    expect(Object.keys(listarObjetivosUI())).toEqual(['barras', 'pausa']);

    desregistrarObjetivoUI('barras');
    expect(obtenerObjetivoUI('barras')).toBeNull();

    limpiarObjetivosUI();
    expect(listarObjetivosUI()).toEqual({});
  });
});
