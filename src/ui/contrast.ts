// Utilidades puras de luminancia relativa y contraste WCAG (sin Phaser)

import { COLORES_HEX } from './theme';

export type NivelContraste = 'normal' | 'grande' | 'foco';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ParContrasteTema {
  nombre: string;
  fg: string;
  bg: string;
  nivel: NivelContraste;
}

export interface ResultadoEvaluacionContraste extends ParContrasteTema {
  ratio: number;
  minimo: number;
  cumple: boolean;
}

export const UMBRAL_WCAG_TEXTO_NORMAL = 4.5;
export const UMBRAL_WCAG_TEXTO_GRANDE = 3.0;
export const UMBRAL_WCAG_FOCO = 3.0;

export function obtenerUmbralWCAG(nivel: NivelContraste): number {
  return nivel === 'normal'
    ? UMBRAL_WCAG_TEXTO_NORMAL
    : nivel === 'grande'
      ? UMBRAL_WCAG_TEXTO_GRANDE
      : UMBRAL_WCAG_FOCO;
}

export function hexARgb(hex: string): RgbColor {
  const limpio = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(limpio)) {
    const r = parseInt(limpio[0] + limpio[0], 16);
    const g = parseInt(limpio[1] + limpio[1], 16);
    const b = parseInt(limpio[2] + limpio[2], 16);
    return { r, g, b };
  }
  if (/^[0-9a-fA-F]{6}$/.test(limpio)) {
    const r = parseInt(limpio.slice(0, 2), 16);
    const g = parseInt(limpio.slice(2, 4), 16);
    const b = parseInt(limpio.slice(4, 6), 16);
    return { r, g, b };
  }
  throw new Error(`Color hexadecimal inválido: "${hex}"`);
}

function linealizarCanal(valor0a255: number): number {
  const srgb = valor0a255 / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
}

export function luminanciaRelativa(hex: string): number {
  const { r, g, b } = hexARgb(hex);
  const rl = linealizarCanal(r);
  const gl = linealizarCanal(g);
  const bl = linealizarCanal(b);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminanciaRelativa(hex1);
  const l2 = luminanciaRelativa(hex2);
  const clara = Math.max(l1, l2);
  const oscura = Math.min(l1, l2);
  return (clara + 0.05) / (oscura + 0.05);
}

export function cumpleWCAG(
  hex1: string,
  hex2: string,
  nivel: NivelContraste = 'normal',
): boolean {
  return contrastRatio(hex1, hex2) >= obtenerUmbralWCAG(nivel);
}

export const PARES_CONTRASTE_TEMA: readonly ParContrasteTema[] = [
  {
    nombre: 'textoPrincipal sobre fondoLienzo',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.fondoLienzo,
    nivel: 'normal',
  },
  {
    nombre: 'textoPrincipal sobre panelHud',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'textoPrincipal sobre botonFondo',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.botonFondo,
    nivel: 'normal',
  },
  {
    nombre: 'textoPrincipal sobre botonHover',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.botonHover,
    nivel: 'normal',
  },
  {
    nombre: 'textoPrincipal sobre sueloSala',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.sueloSala,
    nivel: 'normal',
  },
  {
    nombre: 'textoPrincipal sobre pistaBarra',
    fg: COLORES_HEX.textoPrincipal,
    bg: COLORES_HEX.pistaBarra,
    nivel: 'normal',
  },
  {
    nombre: 'textoSecundario sobre fondoLienzo',
    fg: COLORES_HEX.textoSecundario,
    bg: COLORES_HEX.fondoLienzo,
    nivel: 'normal',
  },
  {
    nombre: 'textoSecundario sobre panelHud',
    fg: COLORES_HEX.textoSecundario,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'textoSecundario sobre botonFondo',
    fg: COLORES_HEX.textoSecundario,
    bg: COLORES_HEX.botonFondo,
    nivel: 'normal',
  },
  {
    nombre: 'textoSecundario sobre botonHover',
    fg: COLORES_HEX.textoSecundario,
    bg: COLORES_HEX.botonHover,
    nivel: 'normal',
  },
  {
    nombre: 'botonTextoOscuro sobre ok',
    fg: COLORES_HEX.botonTextoOscuro,
    bg: COLORES_HEX.ok,
    nivel: 'normal',
  },
  {
    nombre: 'botonTextoOscuro sobre aire',
    fg: COLORES_HEX.botonTextoOscuro,
    bg: COLORES_HEX.aire,
    nivel: 'normal',
  },
  {
    nombre: 'botonTextoOscuro sobre aviso',
    fg: COLORES_HEX.botonTextoOscuro,
    bg: COLORES_HEX.aviso,
    nivel: 'normal',
  },
  {
    nombre: 'botonTextoOscuro sobre energia',
    fg: COLORES_HEX.botonTextoOscuro,
    bg: COLORES_HEX.energia,
    nivel: 'normal',
  },
  {
    nombre: 'aire sobre panelHud',
    fg: COLORES_HEX.aire,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'energia sobre panelHud',
    fg: COLORES_HEX.energia,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'escudo sobre panelHud',
    fg: COLORES_HEX.escudo,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'aviso sobre panelHud',
    fg: COLORES_HEX.aviso,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'aviso sobre pistaBarra',
    fg: COLORES_HEX.aviso,
    bg: COLORES_HEX.pistaBarra,
    nivel: 'normal',
  },
  {
    nombre: 'peligro sobre panelHud',
    fg: COLORES_HEX.peligro,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'peligro sobre pistaBarra',
    fg: COLORES_HEX.peligro,
    bg: COLORES_HEX.pistaBarra,
    nivel: 'normal',
  },
  {
    nombre: 'peligro sobre botonFondo',
    fg: COLORES_HEX.peligro,
    bg: COLORES_HEX.botonFondo,
    nivel: 'normal',
  },
  {
    nombre: 'ok sobre panelHud',
    fg: COLORES_HEX.ok,
    bg: COLORES_HEX.panelHud,
    nivel: 'normal',
  },
  {
    nombre: 'ok sobre pistaBarra',
    fg: COLORES_HEX.ok,
    bg: COLORES_HEX.pistaBarra,
    nivel: 'normal',
  },
  {
    nombre: 'ok sobre botonFondo',
    fg: COLORES_HEX.ok,
    bg: COLORES_HEX.botonFondo,
    nivel: 'normal',
  },
  {
    nombre: 'focoBorde sobre fondoLienzo',
    fg: COLORES_HEX.focoBorde,
    bg: COLORES_HEX.fondoLienzo,
    nivel: 'foco',
  },
  {
    nombre: 'focoBorde sobre panelHud',
    fg: COLORES_HEX.focoBorde,
    bg: COLORES_HEX.panelHud,
    nivel: 'foco',
  },
  {
    nombre: 'focoBorde sobre botonFondo',
    fg: COLORES_HEX.focoBorde,
    bg: COLORES_HEX.botonFondo,
    nivel: 'foco',
  },
  {
    nombre: 'focoBorde sobre botonHover',
    fg: COLORES_HEX.focoBorde,
    bg: COLORES_HEX.botonHover,
    nivel: 'foco',
  },
  {
    nombre: 'focoSecundario sobre panelHud',
    fg: COLORES_HEX.focoSecundario,
    bg: COLORES_HEX.panelHud,
    nivel: 'foco',
  },
  {
    nombre: 'focoSecundario sobre botonFondo',
    fg: COLORES_HEX.focoSecundario,
    bg: COLORES_HEX.botonFondo,
    nivel: 'foco',
  },
];

export function evaluarParesTema(
  pares: readonly ParContrasteTema[] = PARES_CONTRASTE_TEMA,
): ResultadoEvaluacionContraste[] {
  return pares.map((par) => {
    const ratio = contrastRatio(par.fg, par.bg);
    const minimo = obtenerUmbralWCAG(par.nivel);
    return {
      ...par,
      ratio,
      minimo,
      cumple: ratio >= minimo,
    };
  });
}
