// Mapa ASCII del puesto lunar, salas, estaciones, coordenadas y colisión

import { MAP_COLS, MAP_OFFSET_Y, MAP_ROWS, TILE } from '../config';
import { t } from '../i18n';
import { COLORES } from '../ui/theme';
import { RADIO_JUGADOR } from './balance';
import type { RecursoNombre } from './state';

export interface TileCoord {
  col: number;
  fila: number;
}

export interface PuntoPx {
  x: number;
  y: number;
}

export type SalaId =
  | 'escudos'
  | 'tanque'
  | 'energia'
  | 'lobby'
  | 'invernadero'
  | 'refugio';

export interface DefinicionSala {
  id: SalaId;
  nombre: string;
  colInicio: number;
  colFin: number;
  filaInicio: number;
  filaFin: number;
  colorAcento: number;
  etiquetaDesplazadaX?: number;
}

export interface DefinicionEstacion {
  id: SalaId;
  salaId: SalaId;
  nombre: string;
  tile: TileCoord;
  colorAcento: number;
  recurso?: RecursoNombre;
}

export interface CraterDecorativo {
  x: number;
  y: number;
  radio: number;
}

export const MAPA_ASCII: readonly string[] = [
  '########....##.....#',
  '########....##.....#',
  '########....##.....#',
  '#########..#####.###',
  '#.....##....##.....#',
  '#..................#',
  '#..................#',
  '#########..#########',
  '########....########',
  '########....########',
];

export const POSICION_INICIAL_TILE: TileCoord = { col: 10, fila: 6 };

export function obtenerNombreSala(salaId: SalaId): string {
  return t(`salas.${salaId}`);
}

export function obtenerNombreEstacion(estacionId: SalaId): string {
  return t(`estaciones.${estacionId}`);
}

export const SALAS: readonly DefinicionSala[] = [
  {
    id: 'escudos',
    nombre: t('salas.escudos'),
    colInicio: 8,
    colFin: 11,
    filaInicio: 0,
    filaFin: 2,
    colorAcento: COLORES.escudo,
    etiquetaDesplazadaX: 56,
  },
  {
    id: 'tanque',
    nombre: t('salas.tanque'),
    colInicio: 14,
    colFin: 18,
    filaInicio: 0,
    filaFin: 2,
    colorAcento: COLORES.tanque,
    etiquetaDesplazadaX: 48,
  },
  {
    id: 'energia',
    nombre: t('salas.energia'),
    colInicio: 1,
    colFin: 5,
    filaInicio: 4,
    filaFin: 6,
    colorAcento: COLORES.energia,
  },
  {
    id: 'lobby',
    nombre: t('salas.lobby'),
    colInicio: 8,
    colFin: 11,
    filaInicio: 4,
    filaFin: 6,
    colorAcento: COLORES.lobby,
  },
  {
    id: 'invernadero',
    nombre: t('salas.invernadero'),
    colInicio: 14,
    colFin: 18,
    filaInicio: 4,
    filaFin: 6,
    colorAcento: COLORES.aire,
  },
  {
    id: 'refugio',
    nombre: t('salas.refugio'),
    colInicio: 8,
    colFin: 11,
    filaInicio: 8,
    filaFin: 9,
    colorAcento: COLORES.refugio,
  },
];

export const ESTACIONES: readonly DefinicionEstacion[] = [
  {
    id: 'energia',
    salaId: 'energia',
    nombre: t('estaciones.energia'),
    tile: { col: 1, fila: 5 },
    colorAcento: COLORES.energia,
    recurso: 'energia',
  },
  {
    id: 'invernadero',
    salaId: 'invernadero',
    nombre: t('estaciones.invernadero'),
    tile: { col: 18, fila: 5 },
    colorAcento: COLORES.aire,
    recurso: 'aire',
  },
  {
    id: 'escudos',
    salaId: 'escudos',
    nombre: t('estaciones.escudos'),
    tile: { col: 9, fila: 0 },
    colorAcento: COLORES.escudo,
    recurso: 'escudo',
  },
  {
    id: 'tanque',
    salaId: 'tanque',
    nombre: t('estaciones.tanque'),
    tile: { col: 14, fila: 0 },
    colorAcento: COLORES.tanque,
  },
  {
    id: 'lobby',
    salaId: 'lobby',
    nombre: t('estaciones.lobby'),
    tile: { col: 9, fila: 5 },
    colorAcento: COLORES.lobby,
  },
  {
    id: 'refugio',
    salaId: 'refugio',
    nombre: t('estaciones.refugio'),
    tile: { col: 9, fila: 9 },
    colorAcento: COLORES.refugio,
  },
];

// Cráteres estáticos en las zonas vacías del exterior lunar
export const CRATERES_DECORATIVOS: readonly CraterDecorativo[] = [
  { x: 110, y: 150, radio: 26 },
  { x: 260, y: 220, radio: 38 },
  { x: 390, y: 135, radio: 18 },
  { x: 190, y: 590, radio: 34 },
  { x: 360, y: 650, radio: 22 },
  { x: 930, y: 635, radio: 30 },
  { x: 1120, y: 605, radio: 42 },
  { x: 1235, y: 250, radio: 16 },
];

export function isWalkable(col: number, fila: number): boolean {
  if (col < 0 || col >= MAP_COLS || fila < 0 || fila >= MAP_ROWS) {
    return false;
  }
  return MAPA_ASCII[fila]?.[col] === '.';
}

export function tileACentroPx(col: number, fila: number): PuntoPx {
  return {
    x: col * TILE + TILE / 2,
    y: MAP_OFFSET_Y + fila * TILE + TILE / 2,
  };
}

export function pxATile(x: number, y: number): TileCoord {
  const col = Math.max(0, Math.min(MAP_COLS - 1, Math.floor(x / TILE)));
  const fila = Math.max(
    0,
    Math.min(MAP_ROWS - 1, Math.floor((y - MAP_OFFSET_Y) / TILE)),
  );
  return { col, fila };
}

export function obtenerSalaEnTile(
  col: number,
  fila: number,
): DefinicionSala | null {
  for (const sala of SALAS) {
    if (
      col >= sala.colInicio &&
      col <= sala.colFin &&
      fila >= sala.filaInicio &&
      fila <= sala.filaFin
    ) {
      return sala;
    }
  }
  return null;
}

function circuloTocaRect(
  cx: number,
  cy: number,
  radio: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number,
): boolean {
  const cercanoX = Math.max(rx, Math.min(cx, rx + rw));
  const cercanoY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - cercanoX;
  const dy = cy - cercanoY;
  return dx * dx + dy * dy < radio * radio;
}

function obtenerTilesSolidosCercanos(
  cx: number,
  cy: number,
  radio: number,
): TileCoord[] {
  const minCol = Math.max(0, Math.floor((cx - radio) / TILE));
  const maxCol = Math.min(MAP_COLS - 1, Math.floor((cx + radio) / TILE));
  const minFila = Math.max(0, Math.floor((cy - radio - MAP_OFFSET_Y) / TILE));
  const maxFila = Math.min(
    MAP_ROWS - 1,
    Math.floor((cy + radio - MAP_OFFSET_Y) / TILE),
  );

  const solidos: TileCoord[] = [];
  for (let fila = minFila; fila <= maxFila; fila++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (!isWalkable(col, fila)) {
        solidos.push({ col, fila });
      }
    }
  }
  return solidos;
}

// Resolución de colisiones por ejes separados (primero X, luego Y)
export function resolverMovimientoConColision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  radio: number = RADIO_JUGADOR,
): PuntoPx {
  const minX = radio;
  const maxX = MAP_COLS * TILE - radio;
  const minY = MAP_OFFSET_Y + radio;
  const maxY = MAP_OFFSET_Y + MAP_ROWS * TILE - radio;

  let nx = Math.max(minX, Math.min(maxX, x + dx));
  if (dx !== 0) {
    for (const tile of obtenerTilesSolidosCercanos(nx, y, radio)) {
      const rx = tile.col * TILE;
      const ry = MAP_OFFSET_Y + tile.fila * TILE;
      if (circuloTocaRect(nx, y, radio, rx, ry, TILE, TILE)) {
        if (dx > 0) {
          nx = Math.min(nx, rx - radio);
        } else {
          nx = Math.max(nx, rx + TILE + radio);
        }
      }
    }
  }

  let ny = Math.max(minY, Math.min(maxY, y + dy));
  if (dy !== 0) {
    for (const tile of obtenerTilesSolidosCercanos(nx, ny, radio)) {
      const rx = tile.col * TILE;
      const ry = MAP_OFFSET_Y + tile.fila * TILE;
      if (circuloTocaRect(nx, ny, radio, rx, ry, TILE, TILE)) {
        if (dy > 0) {
          ny = Math.min(ny, ry - radio);
        } else {
          ny = Math.max(ny, ry + TILE + radio);
        }
      }
    }
  }

  return { x: nx, y: ny };
}
