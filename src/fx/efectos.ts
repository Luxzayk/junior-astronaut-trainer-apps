// Efectos visuales por estado de recursos (lógica pura evaluable + controladores Phaser)

import type Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, HUD_H, MAP_OFFSET_Y } from '../config';
import {
  DURACION_TEMBLOR_MAX_MS,
  FX_MAX_PARTICULAS,
  PERIODO_PARPADEO_ENERGIA_MS,
  PERIODO_PULSO_LENTO_MS,
  UMBRAL_BAJO,
  UMBRAL_CRITICO,
} from '../game/balance';
import { COLORES, COLORES_HEX, FUENTE_FAMILIA } from '../ui/theme';

export type NivelEfecto = 'normal' | 'bajo' | 'critico';

export interface RecursosParaEfectos {
  aire: number;
  energia: number;
  escudo: number;
}

export interface EstadoEfectosActivos {
  nivelAire: NivelEfecto;
  nivelEnergia: NivelEfecto;
  nivelEscudo: NivelEfecto;
  veloAire: boolean;
  pulsoAire: boolean;
  atenuacionEnergia: boolean;
  oscurecimientoEnergia: boolean;
  parpadeoEnergia: boolean;
  rayasEscudo: boolean;
  estaticaEscudo: boolean;
  temblorEscudo: boolean;
  bordeEstaticoAire: boolean;
  bordeEstaticoEnergia: boolean;
  bordeEstaticoEscudo: boolean;
  indicadorAlerta: boolean;
  maxParticulas: number;
  periodoPulsoAireMs: number;
  periodoParpadeoEnergiaMs: number;
  duracionTemblorMs: number;
}

export function limitarParticulas(solicitadas: number): number {
  if (!Number.isFinite(solicitadas) || solicitadas <= 0) {
    return 0;
  }
  return Math.min(FX_MAX_PARTICULAS, Math.floor(solicitadas));
}

function evaluarNivelInclusivo(valor: number): NivelEfecto {
  if (valor <= UMBRAL_CRITICO) {
    return 'critico';
  }
  if (valor <= UMBRAL_BAJO) {
    return 'bajo';
  }
  return 'normal';
}

export function evaluarEfectosActivos(
  recursos: RecursosParaEfectos,
  enEventoClima: boolean,
  movimientoReducido: boolean,
): EstadoEfectosActivos {
  const nivelAire = evaluarNivelInclusivo(recursos.aire);
  const nivelEnergia = evaluarNivelInclusivo(recursos.energia);
  const nivelEscudo = evaluarNivelInclusivo(recursos.escudo);

  const veloAire = nivelAire !== 'normal';
  const pulsoAire = nivelAire === 'critico' && !movimientoReducido;

  const atenuacionEnergia = nivelEnergia !== 'normal';
  const oscurecimientoEnergia = nivelEnergia === 'critico';
  const parpadeoEnergia = atenuacionEnergia && !movimientoReducido;

  const escudoBajoEnEvento = nivelEscudo !== 'normal' && enEventoClima;
  const escudoCriticoEnEvento = nivelEscudo === 'critico' && enEventoClima;

  const rayasEscudo = escudoBajoEnEvento && !movimientoReducido;
  const estaticaEscudo = escudoCriticoEnEvento;
  const temblorEscudo = escudoCriticoEnEvento && !movimientoReducido;

  const bordeEstaticoAire = movimientoReducido && veloAire;
  const bordeEstaticoEnergia = movimientoReducido && atenuacionEnergia;
  const bordeEstaticoEscudo = movimientoReducido && escudoBajoEnEvento;
  const indicadorAlerta =
    bordeEstaticoAire || bordeEstaticoEnergia || bordeEstaticoEscudo;

  return {
    nivelAire,
    nivelEnergia,
    nivelEscudo,
    veloAire,
    pulsoAire,
    atenuacionEnergia,
    oscurecimientoEnergia,
    parpadeoEnergia,
    rayasEscudo,
    estaticaEscudo,
    temblorEscudo,
    bordeEstaticoAire,
    bordeEstaticoEnergia,
    bordeEstaticoEscudo,
    indicadorAlerta,
    maxParticulas: rayasEscudo ? limitarParticulas(22) : 0,
    periodoPulsoAireMs: Math.max(1200, PERIODO_PULSO_LENTO_MS),
    periodoParpadeoEnergiaMs: Math.max(1000, PERIODO_PARPADEO_ENERGIA_MS),
    duracionTemblorMs: Math.min(250, DURACION_TEMBLOR_MAX_MS),
  };
}

interface RayaTormentaPool {
  nodo: Phaser.GameObjects.Rectangle;
  velocidadX: number;
  velocidadY: number;
  baseY: number;
}

const MAX_RAYAS_TORMENTA = 22; // siempre <= FX_MAX_PARTICULAS (60)
const INTERVALO_TEMBLOR_MS = 2800;

export class ControladorEfectosBase {
  private readonly scene: Phaser.Scene;
  private readonly capaOscuridad: Phaser.GameObjects.Graphics;
  private readonly capaVeloAire: Phaser.GameObjects.Graphics;
  private readonly capaEstatica: Phaser.GameObjects.Graphics;
  private readonly capaBordeEstatico: Phaser.GameObjects.Graphics;
  private readonly badgeAlertaEstatico: Phaser.GameObjects.Container;
  private readonly poolRayas: RayaTormentaPool[] = [];

  private tweenPulsoAire: Phaser.Tweens.Tween | null = null;
  private tweenParpadeoEnergia: Phaser.Tweens.Tween | null = null;
  private estadoActual: EstadoEfectosActivos | null = null;
  private cooldownTemblorMs = 0;

  constructor(scene: Phaser.Scene, depthBase = 40) {
    this.scene = scene;

    // 1. Oscurecimiento / atenuación de energía
    this.capaOscuridad = scene.add.graphics();
    this.capaOscuridad.setDepth(depthBase);
    this.capaOscuridad.setVisible(false);

    // 2. Velo azul y escarcha en bordes por aire bajo / crítico
    this.capaVeloAire = scene.add.graphics();
    this.capaVeloAire.setDepth(depthBase + 1);
    this.capaVeloAire.setVisible(false);

    // 3. Pool pre-asignado de rayas de escudo (máximo 22, cero alloc en update)
    const mapH = GAME_HEIGHT - MAP_OFFSET_Y;
    for (let i = 0; i < MAX_RAYAS_TORMENTA; i++) {
      const ancho = 26 + (i % 4) * 14;
      const y = MAP_OFFSET_Y + 24 + ((i * 53) % (mapH - 48));
      const x = (i * 97) % GAME_WIDTH;
      const rect = scene.add.rectangle(x, y, ancho, 3, COLORES.escudo, 0.55);
      rect.setRotation(-0.32);
      rect.setDepth(depthBase + 2);
      rect.setVisible(false);
      this.poolRayas.push({
        nodo: rect,
        velocidadX: 290 + (i % 5) * 45,
        velocidadY: 95 + (i % 3) * 20,
        baseY: y,
      });
    }

    // 4. Estática visual cuando escudo <= 15 en evento de clima
    this.capaEstatica = scene.add.graphics();
    this.capaEstatica.setDepth(depthBase + 3);
    this.capaEstatica.setVisible(false);
    this.dibujarEstaticaEscudo();

    // 5. Bordes gruesos estáticos + badge "!" para movimientoReducido
    this.capaBordeEstatico = scene.add.graphics();
    this.capaBordeEstatico.setDepth(depthBase + 4);
    this.capaBordeEstatico.setVisible(false);

    const badgeFondo = scene.add.graphics();
    badgeFondo.fillStyle(COLORES.pistaBarra, 0.96);
    badgeFondo.fillRoundedRect(-22, -22, 44, 44, 10);
    badgeFondo.lineStyle(3, COLORES.aviso, 1);
    badgeFondo.strokeRoundedRect(-22, -22, 44, 44, 10);
    const badgeTxt = scene.add
      .text(0, 0, '!', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: '26px',
        fontStyle: 'bold',
        color: COLORES_HEX.peligro,
      })
      .setOrigin(0.5);
    this.badgeAlertaEstatico = scene.add.container(
      GAME_WIDTH - 42,
      MAP_OFFSET_Y + 42,
      [badgeFondo, badgeTxt],
    );
    this.badgeAlertaEstatico.setDepth(depthBase + 5);
    this.badgeAlertaEstatico.setVisible(false);
  }

  public aplicarEstado(estado: EstadoEfectosActivos): void {
    this.estadoActual = estado;
    this.cooldownTemblorMs = 0;

    // Aire: velo azul en bordes + pulso lento cuando <= 15 y !movimientoReducido
    this.detenerPulsoAire();
    if (estado.veloAire) {
      this.dibujarVeloAire(estado.nivelAire === 'critico');
      this.capaVeloAire.setVisible(true);
      this.capaVeloAire.setAlpha(estado.nivelAire === 'critico' ? 0.58 : 0.36);
      if (estado.pulsoAire) {
        this.tweenPulsoAire = this.scene.tweens.add({
          targets: this.capaVeloAire,
          alpha: { from: 0.42, to: 0.72 },
          duration: estado.periodoPulsoAireMs,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      this.capaVeloAire.setVisible(false);
    }

    // Energía: atenuación o oscurecimiento general + parpadeo lento
    this.detenerParpadeoEnergia();
    if (estado.atenuacionEnergia) {
      this.dibujarCapaEnergia(estado.oscurecimientoEnergia);
      this.capaOscuridad.setVisible(true);
      this.capaOscuridad.setAlpha(estado.oscurecimientoEnergia ? 0.36 : 0.16);
      if (estado.parpadeoEnergia) {
        this.tweenParpadeoEnergia = this.scene.tweens.add({
          targets: this.capaOscuridad,
          alpha: {
            from: estado.oscurecimientoEnergia ? 0.3 : 0.12,
            to: estado.oscurecimientoEnergia ? 0.48 : 0.24,
          },
          duration: estado.periodoParpadeoEnergiaMs,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: -1,
        });
      }
    } else {
      this.capaOscuridad.setVisible(false);
    }

    // Escudo en evento: rayas pre-asignadas + estática
    const mostrarRayas = estado.rayasEscudo;
    for (let i = 0; i < this.poolRayas.length; i++) {
      this.poolRayas[i].nodo.setVisible(mostrarRayas && i < estado.maxParticulas);
    }
    this.capaEstatica.setVisible(estado.estaticaEscudo);
    this.capaEstatica.setAlpha(estado.estaticaEscudo ? 0.52 : 0);

    if (estado.temblorEscudo) {
      this.dispararMicroTemblor(estado.duracionTemblorMs);
    }

    // Bordes gruesos estáticos + "!" para movimientoReducido
    this.dibujarBordesEstaticos(estado);
    this.badgeAlertaEstatico.setVisible(estado.indicadorAlerta);
  }

  public update(dtSeg: number): void {
    const estado = this.estadoActual;
    if (!estado) {
      return;
    }

    if (estado.rayasEscudo) {
      const limite = estado.maxParticulas;
      const mapH = GAME_HEIGHT - MAP_OFFSET_Y;
      for (let i = 0; i < limite; i++) {
        const raya = this.poolRayas[i];
        let nx = raya.nodo.x + raya.velocidadX * dtSeg;
        let ny = raya.nodo.y + raya.velocidadY * dtSeg;
        if (nx > GAME_WIDTH + 40) {
          nx = -40;
          ny = raya.baseY;
        }
        if (ny > MAP_OFFSET_Y + mapH) {
          ny = MAP_OFFSET_Y + 12;
        }
        raya.nodo.setPosition(nx, ny);
      }
    }

    if (estado.temblorEscudo) {
      this.cooldownTemblorMs += dtSeg * 1000;
      if (this.cooldownTemblorMs >= INTERVALO_TEMBLOR_MS) {
        this.cooldownTemblorMs = 0;
        this.dispararMicroTemblor(estado.duracionTemblorMs);
      }
    }
  }

  public destroy(): void {
    this.detenerPulsoAire();
    this.detenerParpadeoEnergia();
    this.capaOscuridad.destroy();
    this.capaVeloAire.destroy();
    this.capaEstatica.destroy();
    this.capaBordeEstatico.destroy();
    this.badgeAlertaEstatico.destroy(true);
    for (const raya of this.poolRayas) {
      raya.nodo.destroy();
    }
    this.poolRayas.length = 0;
  }

  private dispararMicroTemblor(duracionMs: number): void {
    const duracionSegura = Math.min(250, Math.max(80, duracionMs));
    this.scene.cameras.main.shake(duracionSegura, 0.0028);
  }

  private dibujarVeloAire(critico: boolean): void {
    const g = this.capaVeloAire;
    g.clear();
    const mapH = GAME_HEIGHT - MAP_OFFSET_Y;
    const grosor = critico ? 46 : 28;
    g.fillStyle(COLORES.aire, critico ? 0.24 : 0.14);
    g.fillRect(0, MAP_OFFSET_Y, GAME_WIDTH, grosor);
    g.fillRect(0, GAME_HEIGHT - grosor, GAME_WIDTH, grosor);
    g.fillRect(0, MAP_OFFSET_Y, grosor, mapH);
    g.fillRect(GAME_WIDTH - grosor, MAP_OFFSET_Y, grosor, mapH);

    // Escarcha sutil en esquinas del mapa
    g.lineStyle(2, COLORES.astronautaReflejo, critico ? 0.55 : 0.35);
    g.strokeRect(4, MAP_OFFSET_Y + 4, GAME_WIDTH - 8, mapH - 8);
  }

  private dibujarCapaEnergia(critico: boolean): void {
    const g = this.capaOscuridad;
    g.clear();
    const mapH = GAME_HEIGHT - MAP_OFFSET_Y;
    g.fillStyle(COLORES.craterOscuro, critico ? 0.88 : 0.55);
    g.fillRect(0, MAP_OFFSET_Y, GAME_WIDTH, mapH);
  }

  private dibujarEstaticaEscudo(): void {
    const g = this.capaEstatica;
    g.clear();
    g.lineStyle(2, COLORES.escudo, 0.65);
    for (let i = 0; i < 8; i++) {
      const y = MAP_OFFSET_Y + 34 + i * 74;
      const x1 = (i % 2) * 140 + 40;
      g.lineBetween(x1, y, x1 + 220, y);
      g.lineBetween(GAME_WIDTH - x1 - 180, y + 18, GAME_WIDTH - x1, y + 18);
    }
  }

  private dibujarBordesEstaticos(estado: EstadoEfectosActivos): void {
    const g = this.capaBordeEstatico;
    g.clear();
    if (!estado.indicadorAlerta) {
      g.setVisible(false);
      return;
    }
    const mapH = GAME_HEIGHT - MAP_OFFSET_Y;
    const color = estado.bordeEstaticoAire
      ? COLORES.aire
      : estado.bordeEstaticoEscudo
        ? COLORES.escudo
        : COLORES.energia;
    g.lineStyle(6, color, 0.95);
    g.strokeRect(3, MAP_OFFSET_Y + 3, GAME_WIDTH - 6, mapH - 6);
    g.setVisible(true);
  }

  private detenerPulsoAire(): void {
    if (this.tweenPulsoAire) {
      this.tweenPulsoAire.stop();
      this.tweenPulsoAire = null;
    }
  }

  private detenerParpadeoEnergia(): void {
    if (this.tweenParpadeoEnergia) {
      this.tweenParpadeoEnergia.stop();
      this.tweenParpadeoEnergia = null;
    }
  }
}

export class ControladorEfectosHUD {
  private readonly capaEnergiaHud: Phaser.GameObjects.Graphics;
  private readonly capaBordeHud: Phaser.GameObjects.Graphics;
  private readonly badgeAlertaHud: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.capaEnergiaHud = scene.add.graphics();
    this.capaEnergiaHud.fillStyle(COLORES.craterOscuro, 0.25);
    this.capaEnergiaHud.fillRect(0, 0, GAME_WIDTH, HUD_H);
    this.capaEnergiaHud.setVisible(false);

    this.capaBordeHud = scene.add.graphics();
    this.capaBordeHud.setVisible(false);

    this.badgeAlertaHud = scene.add
      .text(446, 12, '!', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: '20px',
        fontStyle: 'bold',
        color: COLORES_HEX.peligro,
      })
      .setOrigin(0.5)
      .setVisible(false);
  }

  public aplicarEstado(estado: EstadoEfectosActivos): void {
    this.capaEnergiaHud.setVisible(estado.oscurecimientoEnergia);
    this.capaBordeHud.clear();

    if (estado.indicadorAlerta) {
      const color = estado.bordeEstaticoAire
        ? COLORES.aire
        : estado.bordeEstaticoEscudo
          ? COLORES.escudo
          : COLORES.energia;
      this.capaBordeHud.lineStyle(4, color, 1);
      this.capaBordeHud.strokeRect(2, 2, GAME_WIDTH - 4, HUD_H - 4);
      this.capaBordeHud.setVisible(true);
      this.badgeAlertaHud.setVisible(true);
    } else {
      this.capaBordeHud.setVisible(false);
      this.badgeAlertaHud.setVisible(false);
    }
  }

  public destroy(): void {
    this.capaEnergiaHud.destroy();
    this.capaBordeHud.destroy();
    this.badgeAlertaHud.destroy();
  }
}
