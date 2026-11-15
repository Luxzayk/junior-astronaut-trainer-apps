// Escena de arranque: genera texturas procedurales y lanza MenuScene o Demo directa

import Phaser from 'phaser';
import { isDemoEnabled, SCENE_KEYS } from '../config';
import { gameState } from '../game/state';
import { COLORES, MAPA_METRICAS } from '../ui/theme';
import { lanzarEscenasJuego } from './MenuScene';

export const TEXTURA_ASTRONAUTA = 'astronauta';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  public create(): void {
    this.generarTexturaAstronauta();

    if (isDemoEnabled()) {
      gameState.iniciarDemo();
      lanzarEscenasJuego(this.scene);
    } else {
      this.scene.launch(SCENE_KEYS.menu);
    }

    this.scene.stop();
  }

  private generarTexturaAstronauta(): void {
    if (this.textures.exists(TEXTURA_ASTRONAUTA)) {
      return;
    }

    const tam = MAPA_METRICAS.astronautaTexturaTamano;
    const radio = MAPA_METRICAS.astronautaRadioVisual;
    const cx = tam / 2 + 3;
    const cy = tam / 2;

    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // Mochila pequeña en la espalda
    g.fillStyle(COLORES.astronautaSombraTraje, 1);
    g.fillRoundedRect(cx - radio - 6, cy - 11, 10, 22, 4);
    g.lineStyle(2, COLORES.bordePanel, 0.9);
    g.strokeRoundedRect(cx - radio - 6, cy - 11, 10, 22, 4);

    // Cuerpo / casco redondo blanco-gris claro (~40 px de diámetro)
    g.fillStyle(COLORES.astronautaTraje, 1);
    g.fillCircle(cx, cy, radio);
    g.lineStyle(2.5, COLORES.textoSecundario, 0.9);
    g.strokeCircle(cx, cy, radio);

    // Visor azul oscuro orientado hacia el frente
    g.fillStyle(COLORES.astronautaVisor, 1);
    g.fillRoundedRect(cx - 4, cy - 9, 20, 16, 7);

    // Reflejo en el visor
    g.fillStyle(COLORES.astronautaReflejo, 0.9);
    g.fillEllipse(cx + 8, cy - 4, 7, 3.5);

    g.generateTexture(TEXTURA_ASTRONAUTA, tam, tam);
    g.destroy();
  }
}
