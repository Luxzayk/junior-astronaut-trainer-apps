// Punto de entrada: carga Nunito local y arranca Phaser 3

import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { AjustesScene } from './scenes/AjustesScene';
import { ApagonScene } from './scenes/ApagonScene';
import { BaseScene } from './scenes/BaseScene';
import { BootScene } from './scenes/BootScene';
import { ChoiceScene } from './scenes/ChoiceScene';
import { CreditosScene } from './scenes/CreditosScene';
import { EventScene } from './scenes/EventScene';
import { FuentesScene } from './scenes/FuentesScene';
import { GlosarioScene } from './scenes/GlosarioScene';
import { HUDScene } from './scenes/HUDScene';
import { InformeScene } from './scenes/InformeScene';
import { MenuScene } from './scenes/MenuScene';
import { MinigameScene } from './scenes/MinigameScene';
import { OverlayScene } from './scenes/OverlayScene';
import { SemanaScene } from './scenes/SemanaScene';
import { TutorialScene } from './scenes/TutorialScene';
import { COLORES_HEX } from './ui/theme';

async function cargarFuentes(): Promise<void> {
  if (typeof document === 'undefined' || !('fonts' in document)) {
    return;
  }
  await Promise.all([
    document.fonts.load('400 18px Nunito'),
    document.fonts.load('700 18px Nunito'),
    document.fonts.load('700 24px Nunito'),
    document.fonts.load('800 32px Nunito'),
  ]);
  await document.fonts.ready;
}

async function iniciarJuego(): Promise<void> {
  await cargarFuentes();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: COLORES_HEX.fondoLienzo,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: {
      activePointers: 2,
    },
    render: {
      antialias: true,
      roundPixels: true,
    },
    scene: [
      BootScene,
      MenuScene,
      SemanaScene,
      FuentesScene,
      GlosarioScene,
      AjustesScene,
      CreditosScene,
      BaseScene,
      HUDScene,
      MinigameScene,
      ChoiceScene,
      EventScene,
      ApagonScene,
      OverlayScene,
      InformeScene,
      TutorialScene,
    ],
  };

  new Phaser.Game(config);
}

void iniciarJuego();
