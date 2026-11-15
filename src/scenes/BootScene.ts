// Escena de arranque: genera texturas procedurales y lanza MenuScene o Demo directa

import Phaser from 'phaser';
import { generarTexturasJuego, TEXTURA_ASTRONAUTA } from '../art/texturas';
import { isDemoEnabled, SCENE_KEYS } from '../config';
import { gameState } from '../game/state';
import { lanzarEscenasJuego } from './MenuScene';

export { TEXTURA_ASTRONAUTA };

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  public create(): void {
    generarTexturasJuego(this);

    if (isDemoEnabled()) {
      gameState.iniciarDemo();
      lanzarEscenasJuego(this.scene);
    } else {
      this.scene.launch(SCENE_KEYS.menu);
    }

    this.scene.stop();
  }
}
