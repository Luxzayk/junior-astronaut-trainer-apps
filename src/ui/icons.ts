// Iconos vectoriales dibujados exclusivamente con Phaser Graphics

import Phaser from 'phaser';
import type { SalaId } from '../game/map';
import { COLORES } from './theme';

export function dibujarIconoAire(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const r = tamano * 0.42;
  // Anillo exterior de aire
  g.lineStyle(2, color, 1);
  g.strokeCircle(cx, cy, r);
  // Gota interior de oxígeno
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy + r * 0.14, r * 0.42);
  g.fillTriangle(
    cx - r * 0.4,
    cy + r * 0.08,
    cx + r * 0.4,
    cy + r * 0.08,
    cx,
    cy - r * 0.56,
  );
}

export function dibujarIconoEnergia(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const s = tamano * 0.46;
  // Polígono en zigzag de rayo
  const puntos: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(cx + s * 0.15, cy - s),
    new Phaser.Math.Vector2(cx - s * 0.55, cy + s * 0.08),
    new Phaser.Math.Vector2(cx - s * 0.04, cy + s * 0.08),
    new Phaser.Math.Vector2(cx - s * 0.22, cy + s),
    new Phaser.Math.Vector2(cx + s * 0.58, cy - s * 0.1),
    new Phaser.Math.Vector2(cx + s * 0.06, cy - s * 0.1),
  ];
  g.fillStyle(color, 1);
  g.fillPoints(puntos, true);
}

export function dibujarIconoEscudo(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const s = tamano * 0.45;
  // Polígono de escudo protector
  const puntos: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(cx, cy - s * 0.95),
    new Phaser.Math.Vector2(cx + s * 0.82, cy - s * 0.55),
    new Phaser.Math.Vector2(cx + s * 0.68, cy + s * 0.35),
    new Phaser.Math.Vector2(cx, cy + s),
    new Phaser.Math.Vector2(cx - s * 0.68, cy + s * 0.35),
    new Phaser.Math.Vector2(cx - s * 0.82, cy - s * 0.55),
  ];
  g.fillStyle(color, 1);
  g.fillPoints(puntos, true);
  g.lineStyle(2, COLORES.panelHud, 0.85);
  g.lineBetween(cx, cy - s * 0.55, cx, cy + s * 0.58);
}

export function dibujarIconoTanque(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const r = tamano * 0.34;
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy + r * 0.35, r);
  g.fillTriangle(
    cx - r * 0.95,
    cy + r * 0.2,
    cx + r * 0.95,
    cy + r * 0.2,
    cx,
    cy - r * 1.25,
  );
}

export function dibujarIconoLobby(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const s = tamano * 0.42;
  // Antena de comunicaciones
  g.lineStyle(2.5, color, 1);
  g.lineBetween(cx, cy + s, cx, cy - s * 0.25);
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy - s * 0.4, s * 0.24);
  g.lineStyle(2, color, 0.95);
  g.beginPath();
  g.arc(cx, cy - s * 0.4, s * 0.58, -Math.PI * 0.8, -Math.PI * 0.2, false);
  g.strokePath();
  g.beginPath();
  g.arc(cx, cy - s * 0.4, s * 0.95, -Math.PI * 0.82, -Math.PI * 0.18, false);
  g.strokePath();
}

export function dibujarIconoRefugio(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const s = tamano * 0.44;
  g.fillStyle(color, 1);
  g.fillTriangle(cx - s, cy - s * 0.05, cx + s, cy - s * 0.05, cx, cy - s);
  g.fillRoundedRect(cx - s * 0.7, cy - s * 0.05, s * 1.4, s * 0.95, 3);
  g.fillStyle(COLORES.panelHud, 1);
  g.fillRoundedRect(cx - s * 0.24, cy + s * 0.25, s * 0.48, s * 0.65, 2);
}

export function dibujarIconoEstacion(
  g: Phaser.GameObjects.Graphics,
  salaId: SalaId,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  switch (salaId) {
    case 'energia':
      dibujarIconoEnergia(g, cx, cy, tamano, color);
      break;
    case 'invernadero':
      dibujarIconoAire(g, cx, cy, tamano, color);
      break;
    case 'escudos':
      dibujarIconoEscudo(g, cx, cy, tamano, color);
      break;
    case 'tanque':
      dibujarIconoTanque(g, cx, cy, tamano, color);
      break;
    case 'lobby':
      dibujarIconoLobby(g, cx, cy, tamano, color);
      break;
    case 'refugio':
      dibujarIconoRefugio(g, cx, cy, tamano, color);
      break;
  }
}

export function dibujarIconoPausa(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const anchoBarra = Math.max(4, Math.round(tamano * 0.22));
  const altoBarra = Math.round(tamano * 0.72);
  const separacion = Math.round(tamano * 0.2);

  g.fillStyle(color, 1);
  g.fillRoundedRect(
    cx - separacion / 2 - anchoBarra,
    cy - altoBarra / 2,
    anchoBarra,
    altoBarra,
    2,
  );
  g.fillRoundedRect(
    cx + separacion / 2,
    cy - altoBarra / 2,
    anchoBarra,
    altoBarra,
    2,
  );
}

export function dibujarIconoMisionActiva(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const r = tamano * 0.45;
  const puntos: Phaser.Math.Vector2[] = [
    new Phaser.Math.Vector2(cx, cy - r),
    new Phaser.Math.Vector2(cx + r, cy),
    new Phaser.Math.Vector2(cx, cy + r),
    new Phaser.Math.Vector2(cx - r, cy),
  ];
  g.fillStyle(color, 1);
  g.fillPoints(puntos, true);
  g.lineStyle(2, COLORES.panelHud, 0.9);
  g.strokePoints(puntos, true);
}

export function dibujarIconoMisionLista(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  const r = tamano * 0.46;
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy, r);
  g.lineStyle(3, COLORES.panelHud, 1);
  g.beginPath();
  g.moveTo(cx - r * 0.42, cy + r * 0.04);
  g.lineTo(cx - r * 0.08, cy + r * 0.38);
  g.lineTo(cx + r * 0.46, cy - r * 0.34);
  g.strokePath();
}

export function dibujarIconoRecurso(
  g: Phaser.GameObjects.Graphics,
  recurso: 'aire' | 'energia' | 'escudo',
  cx: number,
  cy: number,
  tamano: number,
  color: number,
): void {
  if (recurso === 'aire') {
    dibujarIconoAire(g, cx, cy, tamano, color);
  } else if (recurso === 'energia') {
    dibujarIconoEnergia(g, cx, cy, tamano, color);
  } else {
    dibujarIconoEscudo(g, cx, cy, tamano, color);
  }
}

export function dibujarIconoSonido(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  tamano: number,
  color: number,
  activo: boolean,
): void {
  const s = tamano * 0.44;
  // Cuerpo del altavoz
  g.fillStyle(color, 1);
  g.fillRoundedRect(cx - s * 0.85, cy - s * 0.36, s * 0.5, s * 0.72, 2);
  g.fillTriangle(
    cx - s * 0.42,
    cy - s * 0.36,
    cx + s * 0.16,
    cy - s * 0.82,
    cx + s * 0.16,
    cy + s * 0.82,
  );
  g.fillTriangle(
    cx - s * 0.42,
    cy + s * 0.36,
    cx - s * 0.42,
    cy - s * 0.36,
    cx + s * 0.16,
    cy + s * 0.82,
  );

  if (activo) {
    g.lineStyle(2.2, color, 0.95);
    g.beginPath();
    g.arc(cx + s * 0.22, cy, s * 0.45, -0.75, 0.75, false);
    g.strokePath();
    g.beginPath();
    g.arc(cx + s * 0.22, cy, s * 0.8, -0.78, 0.78, false);
    g.strokePath();
  } else {
    g.lineStyle(2.5, COLORES.peligro, 1);
    g.lineBetween(cx + s * 0.34, cy - s * 0.42, cx + s * 0.96, cy + s * 0.42);
    g.lineBetween(cx + s * 0.96, cy - s * 0.42, cx + s * 0.34, cy + s * 0.42);
  }
}

