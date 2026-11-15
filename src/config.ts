// Constantes globales de pantalla, cuadrícula y modo debug

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE = 64;
export const HUD_H = 80;

export const MAP_COLS = 20;
export const MAP_ROWS = 10;
export const MAP_OFFSET_Y = HUD_H;

export const SCENE_KEYS = {
  boot: 'BootScene',
  menu: 'MenuScene',
  semanas: 'SemanaScene',
  fuentes: 'FuentesScene',
  glosario: 'GlosarioScene',
  ajustes: 'AjustesScene',
  base: 'BaseScene',
  hud: 'HUDScene',
  minigame: 'MinigameScene',
  choice: 'ChoiceScene',
  event: 'EventScene',
  apagon: 'ApagonScene',
  overlay: 'OverlayScene',
  tutorial: 'TutorialScene',
} as const;

export const DEBUG_QUERY_PARAM = 'debug';
export const DEBUG_QUERY_VALUE = '1';
export const DEMO_QUERY_PARAM = 'demo';
export const DEMO_QUERY_VALUE = '1';

export function isDebugEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(DEBUG_QUERY_PARAM) === DEBUG_QUERY_VALUE;
}

export function isDemoEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get(DEMO_QUERY_PARAM) === DEMO_QUERY_VALUE;
}
