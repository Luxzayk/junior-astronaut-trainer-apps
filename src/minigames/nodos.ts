// Lógica pura del minijuego "Nodos" (generación, rotación y evaluación de circuito)

import { NODOS_COLS, NODOS_FILAS } from '../game/balance';

export type Direccion = 'N' | 'E' | 'S' | 'O';
export type TipoPieza = 'recto' | 'codo' | 'te';

export interface CeldaNodos {
  col: number;
  fila: number;
  tipo: TipoPieza;
  rotacion: number; // 0..3 en sentido horario
  energizado: boolean;
}

export interface TableroNodos {
  cols: number;
  filas: number;
  filaEntrada: number;
  filaSalida: number;
  celdas: CeldaNodos[][];
  completado: boolean;
}

const ORDEN_DIRECCIONES: readonly Direccion[] = ['N', 'E', 'S', 'O'];

const CONEXIONES_BASE: Record<TipoPieza, readonly Direccion[]> = {
  recto: ['N', 'S'],
  codo: ['N', 'E'],
  te: ['N', 'E', 'O'],
};

const DELTA_DIR: Record<Direccion, { dc: number; df: number; opuesta: Direccion }> = {
  N: { dc: 0, df: -1, opuesta: 'S' },
  E: { dc: 1, df: 0, opuesta: 'O' },
  S: { dc: 0, df: 1, opuesta: 'N' },
  O: { dc: -1, df: 0, opuesta: 'E' },
};

function rotarDireccion(dir: Direccion, pasos: number): Direccion {
  const idx = ORDEN_DIRECCIONES.indexOf(dir);
  const nuevoIdx = (((idx + pasos) % 4) + 4) % 4;
  return ORDEN_DIRECCIONES[nuevoIdx];
}

export function obtenerConexionesCelda(
  tipo: TipoPieza,
  rotacion: number,
): Direccion[] {
  const base = CONEXIONES_BASE[tipo];
  return base.map((dir) => rotarDireccion(dir, rotacion));
}

function sonOpuestas(a: Direccion, b: Direccion): boolean {
  return DELTA_DIR[a].opuesta === b;
}

function elegirPiezaYRotacion(
  entrada: Direccion,
  salida: Direccion,
  rng: () => number,
): { tipo: TipoPieza; rotacion: number } {
  const candidatos: TipoPieza[] = sonOpuestas(entrada, salida)
    ? ['recto', 'recto', 'te']
    : ['codo', 'codo', 'te'];
  const tipo = candidatos[Math.floor(rng() * candidatos.length)];

  for (let rot = 0; rot < 4; rot++) {
    const conexiones = obtenerConexionesCelda(tipo, rot);
    if (conexiones.includes(entrada) && conexiones.includes(salida)) {
      return { tipo, rotacion: rot };
    }
  }

  return { tipo: 'te', rotacion: 0 };
}

interface PasoCamino {
  col: number;
  fila: number;
  entrada: Direccion;
  salida: Direccion;
}

function construirCaminoSolvable(
  cols: number,
  filas: number,
  filaEntrada: number,
  filaSalida: number,
  rng: () => number,
): PasoCamino[] {
  const pasos: PasoCamino[] = [];
  let filaActual = filaEntrada;
  let dirEntrada: Direccion = 'O';

  for (let col = 0; col < cols; col++) {
    let filaObjetivo = filaSalida;
    if (col < cols - 1) {
      const opciones: number[] = [];
      for (let f = 0; f < filas; f++) {
        if (f !== filaActual || col === 0) {
          opciones.push(f);
        }
      }
      filaObjetivo = opciones[Math.floor(rng() * opciones.length)];
    }

    while (filaActual !== filaObjetivo) {
      const dirSalida: Direccion = filaObjetivo > filaActual ? 'S' : 'N';
      pasos.push({
        col,
        fila: filaActual,
        entrada: dirEntrada,
        salida: dirSalida,
      });
      filaActual += dirSalida === 'S' ? 1 : -1;
      dirEntrada = DELTA_DIR[dirSalida].opuesta;
    }

    pasos.push({
      col,
      fila: filaActual,
      entrada: dirEntrada,
      salida: 'E',
    });
    dirEntrada = 'O';
  }

  return pasos;
}

export function evaluarConexionesNodos(tablero: TableroNodos): TableroNodos {
  const energizados: boolean[][] = Array.from({ length: tablero.filas }, () =>
    Array.from({ length: tablero.cols }, () => false),
  );

  const cola: Array<{ col: number; fila: number }> = [];
  const celdaInicial = tablero.celdas[tablero.filaEntrada]?.[0];

  if (
    celdaInicial &&
    obtenerConexionesCelda(celdaInicial.tipo, celdaInicial.rotacion).includes('O')
  ) {
    energizados[tablero.filaEntrada][0] = true;
    cola.push({ col: 0, fila: tablero.filaEntrada });
  }

  let cabeza = 0;
  while (cabeza < cola.length) {
    const actual = cola[cabeza];
    cabeza += 1;

    const celda = tablero.celdas[actual.fila][actual.col];
    const salidas = obtenerConexionesCelda(celda.tipo, celda.rotacion);

    for (const dir of salidas) {
      const info = DELTA_DIR[dir];
      const nCol = actual.col + info.dc;
      const nFila = actual.fila + info.df;

      if (
        nCol < 0 ||
        nCol >= tablero.cols ||
        nFila < 0 ||
        nFila >= tablero.filas
      ) {
        continue;
      }
      if (energizados[nFila][nCol]) {
        continue;
      }

      const vecina = tablero.celdas[nFila][nCol];
      const conexionesVecina = obtenerConexionesCelda(
        vecina.tipo,
        vecina.rotacion,
      );
      if (conexionesVecina.includes(info.opuesta)) {
        energizados[nFila][nCol] = true;
        cola.push({ col: nCol, fila: nFila });
      }
    }
  }

  const celdaFinal = tablero.celdas[tablero.filaSalida]?.[tablero.cols - 1];
  const completado =
    Boolean(energizados[tablero.filaSalida]?.[tablero.cols - 1]) &&
    Boolean(celdaFinal) &&
    obtenerConexionesCelda(celdaFinal.tipo, celdaFinal.rotacion).includes('E');

  const nuevasCeldas: CeldaNodos[][] = tablero.celdas.map((fila, fIdx) =>
    fila.map((celda, cIdx) => ({
      ...celda,
      energizado: energizados[fIdx][cIdx],
    })),
  );

  return {
    ...tablero,
    celdas: nuevasCeldas,
    completado,
  };
}

export function rotarCeldaNodos(
  tablero: TableroNodos,
  col: number,
  fila: number,
): TableroNodos {
  if (
    fila < 0 ||
    fila >= tablero.filas ||
    col < 0 ||
    col >= tablero.cols
  ) {
    return tablero;
  }

  const nuevasCeldas = tablero.celdas.map((filaCeldas, fIdx) =>
    filaCeldas.map((celda, cIdx) => {
      if (fIdx === fila && cIdx === col) {
        return {
          ...celda,
          rotacion: (celda.rotacion + 1) % 4,
        };
      }
      return { ...celda };
    }),
  );

  return evaluarConexionesNodos({
    ...tablero,
    celdas: nuevasCeldas,
  });
}

export function generarPuzzleNodos(
  cols: number = NODOS_COLS,
  filas: number = NODOS_FILAS,
  rng: () => number = Math.random,
): TableroNodos {
  const filaEntrada = Math.floor(filas / 2);
  const filaSalida = Math.floor(filas / 2);

  const camino = construirCaminoSolvable(
    cols,
    filas,
    filaEntrada,
    filaSalida,
    rng,
  );

  const mapaCamino = new Map<string, { tipo: TipoPieza; rotacion: number }>();
  for (const paso of camino) {
    mapaCamino.set(
      `${paso.col},${paso.fila}`,
      elegirPiezaYRotacion(paso.entrada, paso.salida, rng),
    );
  }

  const tiposRelleno: readonly TipoPieza[] = ['recto', 'codo', 'te'];
  const celdas: CeldaNodos[][] = [];

  for (let fila = 0; fila < filas; fila++) {
    const filaCeldas: CeldaNodos[] = [];
    for (let col = 0; col < cols; col++) {
      const enCamino = mapaCamino.get(`${col},${fila}`);
      const tipo: TipoPieza = enCamino
        ? enCamino.tipo
        : tiposRelleno[Math.floor(rng() * tiposRelleno.length)];

      const rotacionInicial = Math.floor(rng() * 4);
      filaCeldas.push({
        col,
        fila,
        tipo,
        rotacion: rotacionInicial,
        energizado: false,
      });
    }
    celdas.push(filaCeldas);
  }

  let tablero = evaluarConexionesNodos({
    cols,
    filas,
    filaEntrada,
    filaSalida,
    celdas,
    completado: false,
  });

  // Garantiza que el tablero nunca empiece ya resuelto
  if (tablero.completado) {
    const primerPaso = camino[0];
    if (primerPaso) {
      tablero = rotarCeldaNodos(tablero, primerPaso.col, primerPaso.fila);
    }
  }

  return tablero;
}
