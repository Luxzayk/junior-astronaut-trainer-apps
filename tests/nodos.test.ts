import { describe, expect, it } from 'vitest';
import { NODOS_COLS, NODOS_FILAS } from '../src/game/balance';
import {
  evaluarConexionesNodos,
  generarPuzzleNodos,
  obtenerConexionesCelda,
  rotarCeldaNodos,
  type CeldaNodos,
  type TableroNodos,
} from '../src/minigames/nodos';

function crearRngDeterminista(semillaInicial: number): () => number {
  let estado = semillaInicial >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

function crearTableroRectoBase(): TableroNodos {
  const filas = 3;
  const cols = 4;
  const celdas: CeldaNodos[][] = [];
  for (let f = 0; f < filas; f++) {
    const fila: CeldaNodos[] = [];
    for (let c = 0; c < cols; c++) {
      fila.push({
        col: c,
        fila: f,
        tipo: 'recto',
        rotacion: f === 1 ? 1 : 0, // E-O en la fila central
        energizado: false,
      });
    }
    celdas.push(fila);
  }
  return {
    cols,
    filas,
    filaEntrada: 1,
    filaSalida: 1,
    celdas,
    completado: false,
  };
}

describe('Minijuego Nodos (nodos.ts)', () => {
  it('genera tableros 4x3 que nunca empiezan ya resueltos', () => {
    for (let semilla = 1; semilla <= 25; semilla++) {
      const tablero = generarPuzzleNodos(
        NODOS_COLS,
        NODOS_FILAS,
        crearRngDeterminista(semilla),
      );
      expect(tablero.cols).toBe(NODOS_COLS);
      expect(tablero.filas).toBe(NODOS_FILAS);
      expect(tablero.celdas).toHaveLength(NODOS_FILAS);
      expect(tablero.celdas[0]).toHaveLength(NODOS_COLS);
      expect(tablero.completado).toBe(false);
    }
  });

  it('calcula conexiones al rotar cada tipo de pieza', () => {
    expect(obtenerConexionesCelda('recto', 0)).toEqual(['N', 'S']);
    expect(obtenerConexionesCelda('recto', 1)).toEqual(['E', 'O']);
    expect(obtenerConexionesCelda('codo', 0)).toEqual(['N', 'E']);
    expect(obtenerConexionesCelda('codo', 1)).toEqual(['E', 'S']);
    expect(obtenerConexionesCelda('te', 0)).toEqual(['N', 'E', 'O']);
    expect(obtenerConexionesCelda('te', 2)).toEqual(['S', 'O', 'E']);
  });

  it('evalúa circuito por BFS y detecta cuando se completa o se corta', () => {
    const conectado = evaluarConexionesNodos(crearTableroRectoBase());
    expect(conectado.completado).toBe(true);
    expect(conectado.celdas[1].every((celda) => celda.energizado)).toBe(true);

    const cortado = rotarCeldaNodos(conectado, 2, 1);
    expect(cortado.completado).toBe(false);
    expect(cortado.celdas[1][0].energizado).toBe(true);
    expect(cortado.celdas[1][1].energizado).toBe(true);
    expect(cortado.celdas[1][2].energizado).toBe(false);
    expect(cortado.celdas[1][3].energizado).toBe(false);

    const reconectado = rotarCeldaNodos(cortado, 2, 1);
    expect(reconectado.completado).toBe(true);
  });

  it('cicla rotación 0..3 y mantiene el tablero intacto si la coordenada está fuera de rango', () => {
    const base = crearTableroRectoBase();
    const r1 = rotarCeldaNodos(base, 0, 0);
    const r2 = rotarCeldaNodos(r1, 0, 0);
    const r3 = rotarCeldaNodos(r2, 0, 0);
    const r4 = rotarCeldaNodos(r3, 0, 0);

    expect(r1.celdas[0][0].rotacion).toBe(1);
    expect(r2.celdas[0][0].rotacion).toBe(2);
    expect(r3.celdas[0][0].rotacion).toBe(3);
    expect(r4.celdas[0][0].rotacion).toBe(0);

    const fuera = rotarCeldaNodos(base, -1, 10);
    expect(fuera).toBe(base);
  });
});
