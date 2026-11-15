// Secuencias animadas de cierre de jornada (~4s) y evacuación tranquila (saltables)

import type Phaser from 'phaser';
import { crearWidgetMascota, type WidgetMascota } from '../art/mascota';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  DURACION_ANIMACION_CIERRE_MS,
  FX_MAX_PARTICULAS,
  RECARGA_COMPLETA,
} from '../game/balance';
import { ESTACIONES, obtenerNombreSala, type SalaId, tileACentroPx } from '../game/map';
import { getAjustes } from '../game/settings';
import { t } from '../i18n';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  TAMANOS_TEXTO,
} from '../ui/theme';
import { limitarParticulas } from './efectos';

export type TipoAnimacionCierre =
  | 'completa'
  | 'incompleta'
  | 'refuerzo'
  | 'evacuacion';

export interface OpcionesSecuenciaCierre {
  tipo: TipoAnimacionCierre;
  jornada: number;
  moduloDanado: SalaId | null;
  alTerminar: () => void;
}

export interface ControlSecuenciaCierre {
  skip: () => void;
  destroy: () => void;
}

const MAX_CHISPAS_INCOMPLETA = 24; // <= FX_MAX_PARTICULAS (60)

export function calcularParticulasChispas(movimientoReducido: boolean): number {
  if (movimientoReducido) {
    return 0;
  }
  return Math.min(FX_MAX_PARTICULAS, limitarParticulas(MAX_CHISPAS_INCOMPLETA));
}

function dibujarCapsulaEscape(g: Phaser.GameObjects.Graphics): void {
  // Propulsor suave de salida
  g.fillStyle(COLORES.aire, 0.45);
  g.fillTriangle(-44, 0, -24, -10, -24, 10);

  // Cuerpo de la cápsula lunar
  g.fillStyle(COLORES.astronautaTraje, 1);
  g.fillRoundedRect(-26, -18, 56, 36, 16);
  g.lineStyle(3, COLORES.aire, 1);
  g.strokeRoundedRect(-26, -18, 56, 36, 16);

  // Ventana de cabina
  g.fillStyle(COLORES.astronautaVisor, 1);
  g.fillCircle(10, 0, 10);
  g.fillStyle(COLORES.astronautaReflejo, 0.8);
  g.fillCircle(13, -3, 3.5);
}

export function crearSecuenciaCierre(
  scene: Phaser.Scene,
  opciones: OpcionesSecuenciaCierre,
): ControlSecuenciaCierre {
  const ajustes = getAjustes();
  const reducido = ajustes.movimientoReducido;
  const textoGrande = ajustes.textoGrande;
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;

  let finalizada = false;
  let timerFin: Phaser.Time.TimerEvent | null = null;
  let timerChispas: Phaser.Time.TimerEvent | null = null;
  let tweenPrincipal: Phaser.Tweens.Tween | null = null;
  let widgetLuni: WidgetMascota | null = null;
  const chispas: Phaser.GameObjects.Rectangle[] = [];

  const capaRaiz = scene.add.container(0, 0);
  capaRaiz.setDepth(90);

  const fondo = scene.add
    .rectangle(
      cx,
      cy,
      GAME_WIDTH,
      GAME_HEIGHT,
      COLORES.fondoLienzo,
      opciones.tipo === 'evacuacion' ? 0.92 : 0.78,
    )
    .setInteractive({ useHandCursor: true });

  capaRaiz.add(fondo);

  const gDeco = scene.add.graphics();
  capaRaiz.add(gDeco);

  let tituloTexto = '';
  let subtituloTexto = '';
  let colorAcento: number = COLORES.ok;
  let colorAcentoHex: string = COLORES_HEX.ok;

  if (opciones.tipo === 'completa') {
    colorAcento = COLORES.ok;
    colorAcentoHex = COLORES_HEX.ok;
    tituloTexto = t('cierres.completaTitulo', { jornada: opciones.jornada });
    subtituloTexto = t('cierres.completaSubtitulo', {
      recarga: RECARGA_COMPLETA,
    });

    // Luces cálidas alrededor del banner
    gDeco.fillStyle(COLORES.energia, 0.16);
    gDeco.fillCircle(cx, cy - 30, 190);
    gDeco.fillStyle(COLORES.ok, 0.12);
    gDeco.fillCircle(cx, cy - 30, 130);

    widgetLuni = crearWidgetMascota(scene, {
      x: cx - 190,
      y: cy - 36,
      escala: 1.45,
      estadoInicial: 'contenta',
      alineacionFrase: 'derecha',
      anchoFrase: 320,
      contexto: 'cierreCompleta',
    });
    widgetLuni.setSaltando(true);
    capaRaiz.add(widgetLuni.container);
  } else if (opciones.tipo === 'evacuacion') {
    colorAcento = COLORES.aire;
    colorAcentoHex = COLORES_HEX.aire;
    tituloTexto = t('cierres.evacuacionTitulo');
    subtituloTexto = t('cierres.evacuacionSubtitulo');

    const capsula = scene.add.container(reducido ? cx : cx - 150, cy - 90);
    const gCapsula = scene.add.graphics();
    dibujarCapsulaEscape(gCapsula);
    capsula.add(gCapsula);
    capaRaiz.add(capsula);

    if (!reducido) {
      tweenPrincipal = scene.tweens.add({
        targets: capsula,
        x: cx + 170,
        y: cy - 165,
        duration: DURACION_ANIMACION_CIERRE_MS - 300,
        ease: 'Sine.easeInOut',
      });
    }

    widgetLuni = crearWidgetMascota(scene, {
      x: cx - 180,
      y: cy + 36,
      escala: 1.35,
      estadoInicial: 'asustada',
      alineacionFrase: 'derecha',
      anchoFrase: 320,
      contexto: 'cierreEvacuacion',
    });
    capaRaiz.add(widgetLuni.container);
  } else {
    colorAcento = COLORES.aviso;
    colorAcentoHex = COLORES_HEX.aviso;
    tituloTexto = t('cierres.incompletaTitulo', { jornada: opciones.jornada });
    const moduloNombre = opciones.moduloDanado
      ? obtenerNombreSala(opciones.moduloDanado)
      : t('salas.energia');
    subtituloTexto = t('cierres.incompletaSubtitulo', {
      modulo: moduloNombre,
    });

    // Alarma visual suave ámbar
    gDeco.lineStyle(8, COLORES.aviso, 0.72);
    gDeco.strokeRect(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);

    const estObjetivo =
      ESTACIONES.find((e) => e.id === opciones.moduloDanado) ?? ESTACIONES[0];
    const centroMod = tileACentroPx(estObjetivo.tile.col, estObjetivo.tile.fila);

    if (reducido) {
      gDeco.lineStyle(4, COLORES.aviso, 0.95);
      gDeco.strokeCircle(centroMod.x, centroMod.y, 44);
      gDeco.lineBetween(
        centroMod.x - 16,
        centroMod.y - 16,
        centroMod.x + 16,
        centroMod.y + 16,
      );
      gDeco.lineBetween(
        centroMod.x + 16,
        centroMod.y - 16,
        centroMod.x - 16,
        centroMod.y + 16,
      );
    } else {
      const numChispas = calcularParticulasChispas(false);
      for (let i = 0; i < numChispas; i++) {
        const ang = (Math.PI * 2 * i) / numChispas;
        const radio = 18 + (i % 4) * 14;
        const rect = scene.add.rectangle(
          centroMod.x + Math.cos(ang) * radio,
          centroMod.y + Math.sin(ang) * radio,
          7,
          7,
          i % 2 === 0 ? COLORES.aviso : COLORES.energia,
          0.9,
        );
        chispas.push(rect);
        capaRaiz.add(rect);
      }

      let paso = 0;
      timerChispas = scene.time.addEvent({
        delay: 140,
        loop: true,
        callback: () => {
          paso += 1;
          for (let i = 0; i < chispas.length; i++) {
            const ang = (Math.PI * 2 * i) / chispas.length + paso * 0.25;
            const r = 14 + ((i + paso) % 5) * 11;
            chispas[i].setPosition(
              centroMod.x + Math.cos(ang) * r,
              centroMod.y + Math.sin(ang) * r,
            );
            chispas[i].setAlpha(((i + paso) % 3) * 0.3 + 0.35);
          }
        },
      });
    }

    widgetLuni = crearWidgetMascota(scene, {
      x: cx - 185,
      y: cy + 28,
      escala: 1.35,
      estadoInicial: 'preocupada',
      alineacionFrase: 'derecha',
      anchoFrase: 330,
      contexto: 'cierreIncompleta',
    });
    widgetLuni.setEscondida(true);
    capaRaiz.add(widgetLuni.container);
  }

  // Banner informativo central
  const bannerW = 680;
  const bannerH = 128;
  const bannerY = cy + 146;
  const gBanner = scene.add.graphics();
  gBanner.fillStyle(COLORES.panelHud, 0.96);
  gBanner.fillRoundedRect(
    cx - bannerW / 2,
    bannerY - bannerH / 2,
    bannerW,
    bannerH,
    ESPACIADO.radioPanel,
  );
  gBanner.lineStyle(3, colorAcento, 1);
  gBanner.strokeRoundedRect(
    cx - bannerW / 2,
    bannerY - bannerH / 2,
    bannerW,
    bannerH,
    ESPACIADO.radioPanel,
  );

  const txtTitulo = scene.add
    .text(cx, bannerY - 30, tituloTexto, {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${escalarTamanoTexto(28, textoGrande, 34)}px`,
      fontStyle: 'bold',
      color: colorAcentoHex,
      align: 'center',
    })
    .setOrigin(0.5);

  const txtSubtitulo = scene.add
    .text(cx, bannerY + 12, subtituloTexto, {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
      fontStyle: 'normal',
      color: COLORES_HEX.textoPrincipal,
      align: 'center',
      wordWrap: { width: bannerW - 44 },
    })
    .setOrigin(0.5);

  const txtSaltar = scene.add
    .text(cx, GAME_HEIGHT - 36, t('cierres.saltarHint'), {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 22)}px`,
      fontStyle: 'bold',
      color: COLORES_HEX.aire,
    })
    .setOrigin(0.5);

  capaRaiz.add([gBanner, txtTitulo, txtSubtitulo, txtSaltar]);

  const limpiarRecursos = (): void => {
    if (timerFin) {
      timerFin.remove(false);
      timerFin = null;
    }
    if (timerChispas) {
      timerChispas.remove(false);
      timerChispas = null;
    }
    if (tweenPrincipal) {
      tweenPrincipal.stop();
      tweenPrincipal = null;
    }
    if (widgetLuni) {
      widgetLuni.destroy();
      widgetLuni = null;
    }
    scene.input.keyboard?.off('keydown', alPulsarTecla);
    capaRaiz.destroy(true);
  };

  const finalizar = (): void => {
    if (finalizada) {
      return;
    }
    finalizada = true;
    limpiarRecursos();
    opciones.alTerminar();
  };

  const alPulsarTecla = (ev: KeyboardEvent): void => {
    if (ev.repeat) {
      return;
    }
    if (ev.code === 'Enter' || ev.code === 'Space' || ev.code === 'Escape') {
      ev.preventDefault();
      finalizar();
    }
  };

  fondo.on('pointerdown', finalizar);
  scene.input.keyboard?.on('keydown', alPulsarTecla);

  timerFin = scene.time.delayedCall(DURACION_ANIMACION_CIERRE_MS, finalizar);

  return {
    skip: finalizar,
    destroy: () => {
      if (!finalizada) {
        finalizada = true;
        limpiarRecursos();
      }
    },
  };
}
