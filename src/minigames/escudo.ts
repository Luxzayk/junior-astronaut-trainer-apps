// Lógica pura del minijuego "Escudo" (alineación de paneles a la tormenta, sin Phaser)

import {
  ESCUDO_CONSUMO_BASE,
  ESCUDO_CONSUMO_POR_PANEL,
  ESCUDO_MAX_PANELES,
  ESCUDO_MIN_PANELES,
  MINIJUEGO_TIEMPO_LIMITE,
} from '../game/balance';

export type DireccionTormenta = 'N' | 'E' | 'S' | 'O';

export interface PanelEscudo {
  id: number;
  direccion: DireccionTormenta;
}

export interface NivelEscudo {
  pasos: number;
  objetivo: DireccionTormenta;
  paneles: PanelEscudo[];
  tiempoRestante: number;
}

export type ResultadoEscudo = 'jugando' | 'exito' | 'fallo';

const ORDEN_DIRECCIONES: readonly DireccionTormenta[] = ['N', 'E', 'S', 'O'];

function crearRng(semilla?: number): () => number {
  if (typeof semilla !== 'number' || !Number.isFinite(semilla)) {
    return Math.random;
  }
  let estado = (Math.floor(semilla) >>> 0) || 1;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

export function rotarDireccion90(dir: DireccionTormenta): DireccionTormenta {
  const idx = ORDEN_DIRECCIONES.indexOf(dir);
  return ORDEN_DIRECCIONES[(idx + 1) % ORDEN_DIRECCIONES.length];
}

export function generarNivel(
  pasos: number = ESCUDO_MIN_PANELES,
  semilla?: number,
  tiempoLimite: number = MINIJUEGO_TIEMPO_LIMITE.escudo,
): NivelEscudo {
  const pasosSeguros = Math.max(
    ESCUDO_MIN_PANELES,
    Math.min(ESCUDO_MAX_PANELES, Math.round(pasos)),
  );
  const rng = crearRng(semilla);
  const objetivo =
    ORDEN_DIRECCIONES[Math.floor(rng() * ORDEN_DIRECCIONES.length)];
  const desalineadas = ORDEN_DIRECCIONES.filter((dir) => dir !== objetivo);

  const paneles: PanelEscudo[] = Array.from(
    { length: pasosSeguros },
    (_, id) => ({
      id,
      direccion: desalineadas[Math.floor(rng() * desalineadas.length)],
    }),
  );

  return {
    pasos: pasosSeguros,
    objetivo,
    paneles,
    tiempoRestante: Math.max(1, tiempoLimite),
  };
}

export function alineados(nivel: NivelEscudo): number {
  let cuenta = 0;
  for (const panel of nivel.paneles) {
    if (panel.direccion === nivel.objetivo) {
      cuenta += 1;
    }
  }
  return cuenta;
}

export function proteccion(nivel: NivelEscudo): number {
  if (nivel.paneles.length === 0) {
    return 0;
  }
  return Math.round((alineados(nivel) / nivel.paneles.length) * 100);
}

export function calcularConsumoEnergia(nivel: NivelEscudo): number {
  return ESCUDO_CONSUMO_BASE + alineados(nivel) * ESCUDO_CONSUMO_POR_PANEL;
}

export function resultado(nivel: NivelEscudo): ResultadoEscudo {
  if (alineados(nivel) === nivel.paneles.length && nivel.paneles.length > 0) {
    return 'exito';
  }
  if (nivel.tiempoRestante <= 0) {
    return 'fallo';
  }
  return 'jugando';
}

export function rotarPanel(nivel: NivelEscudo, id: number): NivelEscudo {
  if (resultado(nivel) !== 'jugando') {
    return nivel;
  }

  let modificado = false;
  const paneles = nivel.paneles.map((panel) => {
    if (panel.id === id) {
      modificado = true;
      return {
        ...panel,
        direccion: rotarDireccion90(panel.direccion),
      };
    }
    return { ...panel };
  });

  if (!modificado) {
    return nivel;
  }

  return {
    ...nivel,
    paneles,
  };
}

export function tick(nivel: NivelEscudo, dtSeg: number): NivelEscudo {
  if (resultado(nivel) !== 'jugando' || dtSeg <= 0) {
    return nivel;
  }
  return {
    ...nivel,
    tiempoRestante: Math.max(0, nivel.tiempoRestante - dtSeg),
  };
}
