// Tipos comunes e interfaz de vistas de minijuegos

import type Phaser from 'phaser';

export type MinigameId = 'nodos' | 'valvulas' | 'escudo';
export type MinigameResult = 'exito' | 'fallo' | 'salida';

export interface MinigameParams {
  pasos: number;
  tiempoLimite: number;
  semilla?: number;
}

export interface MinigameView {
  start(
    host: Phaser.GameObjects.Container,
    params: MinigameParams,
    onResult: (r: MinigameResult) => void,
  ): void;
  update(dtSeg: number): void;
  destroy(): void;
  mostrarPista?(): void;
}
