// Generación de texturas procedurales al inicio y detalles de arte de la base lunar

import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MAP_OFFSET_Y, TILE } from '../config';
import { CRATERES_DECORATIVOS, SALAS, type SalaId } from '../game/map';
import { COLORES, MAPA_METRICAS } from '../ui/theme';

export const TEXTURA_ASTRONAUTA = 'astronauta';
export const TEXTURA_ASTRONAUTA_PASO_1 = 'astronauta_paso_1';
export const TEXTURA_ASTRONAUTA_PASO_2 = 'astronauta_paso_2';
export const TEXTURA_ASTRONAUTA_PASO_3 = 'astronauta_paso_3';

export const TEXTURAS_ASTRONAUTA_CAMINATA: readonly string[] = [
  TEXTURA_ASTRONAUTA,
  TEXTURA_ASTRONAUTA_PASO_1,
  TEXTURA_ASTRONAUTA_PASO_2,
  TEXTURA_ASTRONAUTA_PASO_3,
];

export const TEXTURA_ESTRELLAS = 'fondo_estrellas';
export const TEXTURA_SUELO_LUNAR = 'suelo_lunar_estatico';

function dibujarFrameAstronauta(
  scene: Phaser.Scene,
  clave: string,
  pieIzqOffsetY: number,
  pieDerOffsetY: number,
  cuerpoOffsetY: number,
): void {
  if (scene.textures.exists(clave)) {
    return;
  }

  const tam = MAPA_METRICAS.astronautaTexturaTamano;
  const radio = MAPA_METRICAS.astronautaRadioVisual;
  const cx = tam / 2 + 3;
  const cy = tam / 2 + cuerpoOffsetY;

  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Botas sutiles en la base del traje
  g.fillStyle(COLORES.bordePanel, 1);
  g.fillRoundedRect(cx - 12, cy + 13 + pieIzqOffsetY, 9, 6, 3);
  g.fillRoundedRect(cx + 2, cy + 13 + pieDerOffsetY, 9, 6, 3);

  // Mochila pequeña en la espalda
  g.fillStyle(COLORES.astronautaSombraTraje, 1);
  g.fillRoundedRect(cx - radio - 6, cy - 11, 10, 22, 4);
  g.lineStyle(2, COLORES.bordePanel, 0.9);
  g.strokeRoundedRect(cx - radio - 6, cy - 11, 10, 22, 4);

  // Casco / cuerpo principal
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

  g.generateTexture(clave, tam, tam);
  g.destroy();
}

function generarTexturaEstrellas(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURA_ESTRELLAS)) {
    return;
  }

  const ancho = GAME_WIDTH + 48;
  const alto = GAME_HEIGHT - MAP_OFFSET_Y + 48;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Semilla fija determinista para estrellas suaves sin llamadas en update()
  let semilla = 20260419;
  const sig = (): number => {
    semilla = (semilla * 1664525 + 1013904223) >>> 0;
    return semilla / 0x100000000;
  };

  for (let i = 0; i < 86; i++) {
    const sx = Math.round(sig() * ancho);
    const sy = Math.round(sig() * alto);
    const radio = i % 7 === 0 ? 2 : 1.2;
    const color =
      i % 9 === 0
        ? COLORES.aire
        : i % 11 === 0
          ? COLORES.energia
          : COLORES.textoPrincipal;
    const alpha = 0.25 + sig() * 0.5;
    g.fillStyle(color, alpha);
    g.fillCircle(sx, sy, radio);
  }

  g.generateTexture(TEXTURA_ESTRELLAS, ancho, alto);
  g.destroy();
}

function generarTexturaSueloLunar(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURA_SUELO_LUNAR)) {
    return;
  }

  const ancho = GAME_WIDTH;
  const alto = GAME_HEIGHT - MAP_OFFSET_Y;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  // Terreno lunar base semitransparente con relieve sutil
  g.fillStyle(COLORES.craterOscuro, 0.28);
  g.fillRect(0, 0, ancho, alto);

  // Bandas suaves de regolito lunar
  g.fillStyle(COLORES.craterBorde, 0.22);
  g.fillEllipse(210, 140, 320, 90);
  g.fillEllipse(1040, 480, 360, 110);
  g.fillEllipse(240, 520, 280, 84);

  // Cráteres pre-renderizados con borde iluminado suave
  for (const crater of CRATERES_DECORATIVOS) {
    const cyLocal = crater.y - MAP_OFFSET_Y;
    g.fillStyle(COLORES.craterOscuro, 0.92);
    g.fillCircle(crater.x, cyLocal, crater.radio);
    g.lineStyle(2, COLORES.craterBorde, 0.72);
    g.strokeCircle(crater.x, cyLocal, crater.radio);
    g.lineStyle(1.5, COLORES.bordePanel, 0.28);
    g.strokeCircle(crater.x - 2, cyLocal - 2, Math.max(4, crater.radio - 4));
  }

  // Pequeños guijarros deterministas en zona exterior
  let s = 918273;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
  for (let i = 0; i < 42; i++) {
    const px = Math.round(rnd() * ancho);
    const py = Math.round(rnd() * alto);
    g.fillStyle(COLORES.craterBorde, 0.55);
    g.fillCircle(px, py, 2 + (i % 3));
  }

  g.generateTexture(TEXTURA_SUELO_LUNAR, ancho, alto);
  g.destroy();
}

export function generarTexturasJuego(scene: Phaser.Scene): void {
  dibujarFrameAstronauta(scene, TEXTURA_ASTRONAUTA, 0, 0, 0);
  dibujarFrameAstronauta(scene, TEXTURA_ASTRONAUTA_PASO_1, -2.5, 1.5, -1);
  dibujarFrameAstronauta(scene, TEXTURA_ASTRONAUTA_PASO_2, 0, 0, 0);
  dibujarFrameAstronauta(scene, TEXTURA_ASTRONAUTA_PASO_3, 1.5, -2.5, -1);
  generarTexturaEstrellas(scene);
  generarTexturaSueloLunar(scene);
}

// Props exteriores puramente decorativos en zonas no caminables (sin alterar colisión)
export function dibujarDetallesBaseExterior(g: Phaser.GameObjects.Graphics): void {
  // Paneles solares exteriores arriba-izquierda (cols 2..4, fila 1..2 — '#' en MAPA_ASCII)
  const panelSolar = (px: number, py: number): void => {
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(px, py, 96, 46, 6);
    g.lineStyle(2, COLORES.aire, 0.75);
    g.strokeRoundedRect(px, py, 96, 46, 6);
    g.lineStyle(1, COLORES.bordePanel, 0.9);
    g.lineBetween(px + 32, py + 2, px + 32, py + 44);
    g.lineBetween(px + 64, py + 2, px + 64, py + 44);
    g.lineBetween(px + 2, py + 23, px + 94, py + 23);
    // Soporte metálico
    g.lineStyle(3, COLORES.textoSecundario, 0.7);
    g.lineBetween(px + 48, py + 46, px + 48, py + 58);
  };

  panelSolar(78, MAP_OFFSET_Y + 126);
  panelSolar(204, MAP_OFFSET_Y + 126);
  panelSolar(964, MAP_OFFSET_Y + 498);

  // Antena de comunicaciones exterior derecha-arriba (no caminable en col 19, fila 0..2)
  const ax = 1236;
  const ay = MAP_OFFSET_Y + 86;
  g.lineStyle(3, COLORES.textoSecundario, 0.85);
  g.lineBetween(ax, ay, ax, ay + 48);
  g.lineBetween(ax - 12, ay + 48, ax + 12, ay + 48);
  g.lineStyle(2.5, COLORES.lobby, 0.9);
  g.beginPath();
  g.arc(ax, ay, 18, Math.PI * 0.75, Math.PI * 1.65, false);
  g.strokePath();
  g.fillStyle(COLORES.energia, 1);
  g.fillCircle(ax - 8, ay - 8, 3.5);
}

// Detalles temáticos sutiles dentro de cada sala sin tapar estación ni etiquetas
export function dibujarDetalleSalaProcedural(
  g: Phaser.GameObjects.Graphics,
  salaId: SalaId,
): void {
  const sala = SALAS.find((s) => s.id === salaId);
  if (!sala) {
    return;
  }

  const x0 = sala.colInicio * TILE;
  const x1 = (sala.colFin + 1) * TILE;
  const y0 = MAP_OFFSET_Y + sala.filaInicio * TILE;
  const y1 = MAP_OFFSET_Y + (sala.filaFin + 1) * TILE;

  if (salaId === 'energia') {
    // Bobinas de generador en esquina inferior derecha de Energía
    const gx = x1 - 46;
    const gy = y1 - 36;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(gx - 20, gy - 14, 40, 28, 6);
    g.lineStyle(2, COLORES.energia, 0.75);
    g.strokeRoundedRect(gx - 20, gy - 14, 40, 28, 6);
    g.lineBetween(gx - 8, gy - 10, gx - 8, gy + 10);
    g.lineBetween(gx + 8, gy - 10, gx + 8, gy + 10);
  } else if (salaId === 'invernadero') {
    // Jardineras y cilindros O₂ en esquinas de Invernadero
    const px = x0 + 24;
    const py = y1 - 34;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(px, py, 56, 22, 6);
    g.lineStyle(2, COLORES.aire, 0.7);
    g.strokeRoundedRect(px, py, 56, 22, 6);
    g.fillStyle(COLORES.ok, 0.85);
    g.fillCircle(px + 14, py + 11, 6);
    g.fillCircle(px + 28, py + 10, 7);
    g.fillCircle(px + 42, py + 11, 6);
  } else if (salaId === 'escudos') {
    // Arco reflector superior en Escudos
    const ex = x1 - 44;
    const ey = y0 + 54;
    g.lineStyle(3, COLORES.escudo, 0.65);
    g.beginPath();
    g.arc(ex, ey + 10, 22, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(COLORES.escudo, 0.8);
    g.fillCircle(ex, ey + 10, 6);
  } else if (salaId === 'tanque') {
    // Tanque presurizado en esquina derecha de Tanque de agua
    const tx = x1 - 48;
    const ty = y0 + 54;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(tx - 18, ty - 14, 36, 42, 10);
    g.lineStyle(2, COLORES.tanque, 0.85);
    g.strokeRoundedRect(tx - 18, ty - 14, 36, 42, 10);
    g.lineStyle(2, COLORES.aire, 0.7);
    g.lineBetween(tx - 10, ty + 4, tx + 10, ty + 4);
  }
}
