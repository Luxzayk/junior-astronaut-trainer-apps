// Pathfinding BFS puro sobre la cuadrícula (4 direcciones)

import { MAP_COLS, MAP_ROWS } from '../config';
import { isWalkable, tileACentroPx, type TileCoord } from './map';

export type WalkableCheck = (col: number, fila: number) => boolean;

const DIRECCIONES: readonly TileCoord[] = [
  { col: 0, fila: -1 },
  { col: 1, fila: 0 },
  { col: 0, fila: 1 },
  { col: -1, fila: 0 },
];

function claveTile(col: number, fila: number): string {
  return `${col},${fila}`;
}

export function encontrarCamino(
  origen: TileCoord,
  destino: TileCoord,
  esCaminable: WalkableCheck = isWalkable,
): TileCoord[] {
  if (
    !esCaminable(origen.col, origen.fila) ||
    !esCaminable(destino.col, destino.fila)
  ) {
    return [];
  }

  if (origen.col === destino.col && origen.fila === destino.fila) {
    return [{ col: destino.col, fila: destino.fila }];
  }

  const cola: TileCoord[] = [{ col: origen.col, fila: origen.fila }];
  const visitados = new Set<string>([claveTile(origen.col, origen.fila)]);
  const padre = new Map<string, TileCoord>();

  let cabeza = 0;
  while (cabeza < cola.length) {
    const actual = cola[cabeza];
    cabeza += 1;

    if (actual.col === destino.col && actual.fila === destino.fila) {
      const camino: TileCoord[] = [];
      let cursor: TileCoord | undefined = actual;
      while (cursor !== undefined) {
        camino.push({ col: cursor.col, fila: cursor.fila });
        cursor = padre.get(claveTile(cursor.col, cursor.fila));
      }
      camino.reverse();
      return camino;
    }

    for (const dir of DIRECCIONES) {
      const sigCol = actual.col + dir.col;
      const sigFila = actual.fila + dir.fila;
      const clave = claveTile(sigCol, sigFila);

      if (!visitados.has(clave) && esCaminable(sigCol, sigFila)) {
        visitados.add(clave);
        padre.set(clave, actual);
        cola.push({ col: sigCol, fila: sigFila });
      }
    }
  }

  return [];
}

export function encontrarTileCaminableMasCercano(
  xPx: number,
  yPx: number,
  esCaminable: WalkableCheck = isWalkable,
): TileCoord | null {
  let mejorTile: TileCoord | null = null;
  let mejorDistSq = Number.POSITIVE_INFINITY;

  for (let fila = 0; fila < MAP_ROWS; fila++) {
    for (let col = 0; col < MAP_COLS; col++) {
      if (!esCaminable(col, fila)) {
        continue;
      }
      const centro = tileACentroPx(col, fila);
      const dx = centro.x - xPx;
      const dy = centro.y - yPx;
      const distSq = dx * dx + dy * dy;
      if (distSq < mejorDistSq) {
        mejorDistSq = distSq;
        mejorTile = { col, fila };
      }
    }
  }

  return mejorTile;
}
