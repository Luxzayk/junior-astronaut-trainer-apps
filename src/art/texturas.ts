// Generación de texturas procedurales al inicio y detalles de arte de la base lunar

import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, MAP_OFFSET_Y, TILE } from '../config';
import { CRATERES_DECORATIVOS, SALAS, type SalaId } from '../game/map';
import { getAjustes } from '../game/settings';
import { COLORES, MAPA_METRICAS } from '../ui/theme';

const COLOR_HIDROPONICO = 0x9c6bff;

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
  const movimientoReducido = getAjustes().movimientoReducido;

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

  // Rover lunar en zona # inferior izquierda
  const rx = 72;
  const ry = MAP_OFFSET_Y + 560;
  g.fillStyle(COLORES.panelHud, 1);
  g.fillRoundedRect(rx, ry, 54, 24, 5);
  g.lineStyle(2, COLORES.textoSecundario, 0.85);
  g.strokeRoundedRect(rx, ry, 54, 24, 5);
  g.fillStyle(COLORES.craterOscuro, 1);
  g.fillCircle(rx + 12, ry + 26, 7);
  g.fillCircle(rx + 42, ry + 26, 7);
  g.fillStyle(COLORES.aire, 0.85);
  g.fillRoundedRect(rx + 34, ry - 10, 18, 12, 3);
  g.lineStyle(2, COLORES.energia, 0.7);
  g.lineBetween(rx + 18, ry + 4, rx + 18, ry - 14);
  g.lineBetween(rx + 12, ry - 14, rx + 24, ry - 14);

  // Huellas cerca de esclusas exteriores (pasillo inferior cols 8..11)
  const huella = (hx: number, hy: number, angDeg: number): void => {
    const rad = (angDeg * Math.PI) / 180;
    const dx = Math.cos(rad) * 5;
    const dy = Math.sin(rad) * 5;
    g.fillStyle(COLORES.craterBorde, 0.55);
    g.fillEllipse(hx, hy, 7, 4);
    g.fillEllipse(hx + dx, hy + dy, 6, 3.5);
  };
  huella(520, MAP_OFFSET_Y + 470, 20);
  huella(536, MAP_OFFSET_Y + 482, 25);
  huella(552, MAP_OFFSET_Y + 492, 18);
  huella(760, MAP_OFFSET_Y + 478, -15);
  huella(776, MAP_OFFSET_Y + 490, -20);

  // Rocas / cantos junto a cráteres
  const roca = (x: number, y: number, r: number): void => {
    g.fillStyle(COLORES.craterBorde, 0.9);
    g.fillCircle(x, y, r);
    g.fillStyle(COLORES.bordePanel, 0.45);
    g.fillCircle(x - r * 0.25, y - r * 0.2, r * 0.45);
  };
  roca(140, MAP_OFFSET_Y + 175, 8);
  roca(290, MAP_OFFSET_Y + 250, 11);
  roca(210, MAP_OFFSET_Y + 620, 9);
  roca(980, MAP_OFFSET_Y + 660, 10);
  roca(1160, MAP_OFFSET_Y + 630, 7);

  // Baliza de aterrizaje (estática si movimiento reducido)
  const bx = 1188;
  const by = MAP_OFFSET_Y + 520;
  g.lineStyle(3, COLORES.textoSecundario, 0.8);
  g.lineBetween(bx, by, bx, by + 28);
  g.lineBetween(bx - 10, by + 28, bx + 10, by + 28);
  g.fillStyle(COLORES.ok, movimientoReducido ? 0.85 : 1);
  g.fillCircle(bx, by - 4, 5);
  if (!movimientoReducido) {
    g.fillStyle(COLORES.ok, 0.25);
    g.fillCircle(bx, by - 4, 10);
  }
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
    const gx = x1 - 46;
    const gy = y1 - 36;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(gx - 20, gy - 14, 40, 28, 6);
    g.lineStyle(2, COLORES.energia, 0.75);
    g.strokeRoundedRect(gx - 20, gy - 14, 40, 28, 6);
    g.lineBetween(gx - 8, gy - 10, gx - 8, gy + 10);
    g.lineBetween(gx + 8, gy - 10, gx + 8, gy + 10);
    // Cables hacia el Lobby (borde este)
    g.lineStyle(2.5, COLORES.energia, 0.55);
    g.lineBetween(gx + 20, gy, x1 - 4, gy - 8);
    g.lineBetween(gx + 20, gy + 6, x1 - 4, gy + 10);
    g.lineStyle(2, 0xff9800, 0.45);
    g.lineBetween(gx + 20, gy + 3, x1 - 4, gy + 2);
  } else if (salaId === 'invernadero') {
    const px = x0 + 24;
    const py = y1 - 34;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(px, py, 72, 24, 6);
    g.lineStyle(2, COLORES.aire, 0.7);
    g.strokeRoundedRect(px, py, 72, 24, 6);
    g.fillStyle(COLOR_HIDROPONICO, 0.35);
    g.fillRoundedRect(px + 2, py + 2, 68, 8, 3);
    g.fillStyle(COLORES.ok, 0.9);
    g.fillCircle(px + 14, py + 14, 5);
    g.fillCircle(px + 28, py + 12, 6);
    g.fillCircle(px + 42, py + 14, 5);
    g.fillCircle(px + 56, py + 13, 4);
    // Cilindro O₂
    const ox = x1 - 36;
    const oy = y1 - 42;
    g.fillStyle(COLORES.panelHud, 0.9);
    g.fillRoundedRect(ox - 10, oy - 16, 20, 34, 8);
    g.lineStyle(2, COLORES.aire, 0.85);
    g.strokeRoundedRect(ox - 10, oy - 16, 20, 34, 8);
    g.fillStyle(COLORES.aire, 0.75);
    g.fillCircle(ox, oy - 20, 4);
  } else if (salaId === 'escudos') {
    const nodos = [
      { x: x0 + 28, y: y0 + 48 },
      { x: x1 - 28, y: y0 + 48 },
    ];
    for (const n of nodos) {
      g.fillStyle(COLORES.escudo, 0.85);
      g.fillCircle(n.x, n.y, 7);
      g.lineStyle(2, COLORES.bordePanel, 0.7);
      g.strokeCircle(n.x, n.y, 7);
    }
    g.lineStyle(2.5, COLORES.escudo, 0.45);
    g.beginPath();
    g.arc((x0 + x1) / 2, y0 + 58, 48, Math.PI * 1.15, Math.PI * 1.85, false);
    g.strokePath();
    const ex = x1 - 44;
    const ey = y0 + 54;
    g.lineStyle(3, COLORES.escudo, 0.65);
    g.beginPath();
    g.arc(ex, ey + 10, 22, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(COLORES.escudo, 0.8);
    g.fillCircle(ex, ey + 10, 6);
  } else if (salaId === 'tanque') {
    const tx = x1 - 48;
    const ty = y0 + 54;
    g.fillStyle(COLORES.panelHud, 0.85);
    g.fillRoundedRect(tx - 18, ty - 14, 36, 42, 10);
    g.lineStyle(2, COLORES.tanque, 0.85);
    g.strokeRoundedRect(tx - 18, ty - 14, 36, 42, 10);
    g.lineStyle(2, COLORES.aire, 0.7);
    g.lineBetween(tx - 10, ty + 4, tx + 10, ty + 4);
    // Tuberías hacia Invernadero (borde oeste/sur)
    g.lineStyle(3, COLORES.tanque, 0.55);
    g.lineBetween(x0 + 8, y1 - 18, x0 + 8, y1 - 4);
    g.lineBetween(x0 + 8, y1 - 4, x0 + 40, y1 - 4);
    g.lineBetween(x0 + 8, y0 + 70, x0 + 8, y1 - 18);
  } else if (salaId === 'lobby') {
    // Consola holográfica (evita centro estación col 9 fila 5)
    const cx = (x0 + x1) / 2;
    const cy = y1 - 40;
    g.fillStyle(COLORES.panelHud, 0.92);
    g.fillRoundedRect(cx - 46, cy - 18, 92, 36, 8);
    g.lineStyle(2, COLORES.lobby, 0.8);
    g.strokeRoundedRect(cx - 46, cy - 18, 92, 36, 8);
    g.fillStyle(COLORES.aire, 0.35);
    g.fillEllipse(cx - 10, cy, 22, 14);
    g.fillStyle(COLORES.lobby, 0.55);
    g.fillEllipse(cx + 12, cy + 1, 14, 10);
    for (let i = 0; i < 5; i += 1) {
      g.fillStyle(i % 2 === 0 ? COLORES.ok : COLORES.energia, 0.9);
      g.fillCircle(cx - 32 + i * 16, cy + 22, 3);
    }
    // Emblema en pared superior
    const ex = cx;
    const ey = y0 + 28;
    g.lineStyle(2, COLORES.lobby, 0.75);
    g.strokeCircle(ex, ey, 12);
    g.fillStyle(COLORES.aire, 0.5);
    g.fillCircle(ex - 3, ey, 5);
    g.fillStyle(COLORES.lobby, 0.7);
    g.fillCircle(ex + 4, ey + 2, 3);
  } else if (salaId === 'refugio') {
    // Literas en esquinas inferiores
    const litera = (lx: number, ly: number): void => {
      g.fillStyle(COLORES.panelHud, 0.9);
      g.fillRoundedRect(lx, ly, 36, 16, 4);
      g.lineStyle(2, COLORES.refugio, 0.7);
      g.strokeRoundedRect(lx, ly, 36, 16, 4);
      g.fillStyle(COLORES.bordePanel, 0.8);
      g.fillRoundedRect(lx + 2, ly + 2, 12, 12, 3);
    };
    litera(x0 + 10, y1 - 28);
    litera(x1 - 46, y1 - 28);
    // Compuerta blindada en entrada norte
    g.fillStyle(COLORES.panelHud, 0.95);
    g.fillRoundedRect((x0 + x1) / 2 - 28, y0 + 2, 56, 14, 4);
    g.lineStyle(3, COLORES.refugio, 0.85);
    g.strokeRoundedRect((x0 + x1) / 2 - 28, y0 + 2, 56, 14, 4);
    g.lineStyle(2, COLORES.textoSecundario, 0.7);
    g.lineBetween((x0 + x1) / 2 - 8, y0 + 9, (x0 + x1) / 2 + 8, y0 + 9);
    // Botiquín en muro
    g.fillStyle(COLORES.ok, 0.25);
    g.fillRoundedRect(x1 - 28, y0 + 36, 18, 22, 3);
    g.lineStyle(2, COLORES.ok, 0.85);
    g.strokeRoundedRect(x1 - 28, y0 + 36, 18, 22, 3);
    g.lineBetween(x1 - 19, y0 + 42, x1 - 19, y0 + 52);
    g.lineBetween(x1 - 24, y0 + 47, x1 - 14, y0 + 47);
  }
}
