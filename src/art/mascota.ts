// Mascota procedural "Luni" (personaje ficticio del juego, no datos de NASA)

import type Phaser from 'phaser';
import { MASCOTA_UMBRAL_CONTENTA, UMBRAL_BAJO, UMBRAL_CRITICO } from '../game/balance';
import { getAjustes, type Idioma } from '../game/settings';
import { t } from '../i18n';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  TAMANOS_TEXTO,
} from '../ui/theme';

export type EstadoMascota = 'contenta' | 'neutral' | 'preocupada' | 'asustada';

export type ContextoFraseMascota =
  | 'hud'
  | 'evento'
  | 'cierreCompleta'
  | 'cierreIncompleta'
  | 'cierreEvacuacion'
  | 'informeBien'
  | 'informeNormal'
  | 'informeEvacuacion';

export function estadoMascota(aire: number, escudo: number): EstadoMascota {
  if (aire < UMBRAL_CRITICO || escudo < UMBRAL_CRITICO) {
    return 'asustada';
  }
  if (aire < UMBRAL_BAJO || escudo < UMBRAL_BAJO) {
    return 'preocupada';
  }
  if (aire >= MASCOTA_UMBRAL_CONTENTA && escudo >= MASCOTA_UMBRAL_CONTENTA) {
    return 'contenta';
  }
  return 'neutral';
}

export function obtenerFraseMascota(
  estado: EstadoMascota,
  contexto: ContextoFraseMascota = 'hud',
  idioma?: Idioma,
): string {
  switch (contexto) {
    case 'evento':
      return t('mascota.frases.evento', undefined, idioma);
    case 'cierreCompleta':
      return t('mascota.frases.cierreCompleta', undefined, idioma);
    case 'cierreIncompleta':
      return t('mascota.frases.cierreIncompleta', undefined, idioma);
    case 'cierreEvacuacion':
      return t('mascota.frases.cierreEvacuacion', undefined, idioma);
    case 'informeBien':
      return t('mascota.frases.informeBien', undefined, idioma);
    case 'informeNormal':
      return t('mascota.frases.informeNormal', undefined, idioma);
    case 'informeEvacuacion':
      return t('mascota.frases.informeEvacuacion', undefined, idioma);
    case 'hud':
    default:
      return t(`mascota.frases.${estado}`, undefined, idioma);
  }
}

export function obtenerColorEstadoMascota(estado: EstadoMascota): number {
  switch (estado) {
    case 'asustada':
      return COLORES.peligro;
    case 'preocupada':
      return COLORES.aviso;
    case 'contenta':
      return COLORES.ok;
    case 'neutral':
    default:
      return COLORES.aire;
  }
}

export function dibujarMascotaLuni(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  escala: number,
  estado: EstadoMascota,
): void {
  const s = Math.max(0.4, escala);
  const colorAcento = obtenerColorEstadoMascota(estado);

  // Antena superior con luz de estado
  g.lineStyle(Math.max(2, 2.5 * s), COLORES.textoSecundario, 1);
  g.lineBetween(cx, cy - 19 * s, cx, cy - 29 * s);
  g.fillStyle(colorAcento, 0.35);
  g.fillCircle(cx, cy - 31 * s, 6.5 * s);
  g.fillStyle(colorAcento, 1);
  g.fillCircle(cx, cy - 31 * s, 4 * s);

  // Orejeras / transmisores laterales del casco
  g.fillStyle(COLORES.astronautaSombraTraje, 1);
  g.fillRoundedRect(cx - 24 * s, cy - 9 * s, 6 * s, 14 * s, 3 * s);
  g.fillRoundedRect(cx + 18 * s, cy - 9 * s, 6 * s, 14 * s, 3 * s);

  // Pequeño cuerpo / traje inferior
  g.fillStyle(COLORES.astronautaSombraTraje, 1);
  g.fillRoundedRect(cx - 14 * s, cy + 12 * s, 28 * s, 12 * s, 5 * s);
  g.lineStyle(Math.max(1.5, 2 * s), COLORES.bordePanel, 1);
  g.strokeRoundedRect(cx - 14 * s, cy + 12 * s, 28 * s, 12 * s, 5 * s);
  g.fillStyle(colorAcento, 1);
  g.fillCircle(cx, cy + 18 * s, 3 * s);

  // Cabeza / casco redondeado de Luni
  g.fillStyle(COLORES.astronautaTraje, 1);
  g.fillRoundedRect(cx - 20 * s, cy - 19 * s, 40 * s, 34 * s, 13 * s);
  g.lineStyle(Math.max(2, 2.5 * s), colorAcento, 0.95);
  g.strokeRoundedRect(cx - 20 * s, cy - 19 * s, 40 * s, 34 * s, 13 * s);

  // Visor oscuro interior
  g.fillStyle(COLORES.astronautaVisor, 1);
  g.fillRoundedRect(cx - 15 * s, cy - 13 * s, 30 * s, 21 * s, 8 * s);

  // Reflejo en esquina superior del visor
  g.fillStyle(COLORES.astronautaReflejo, 0.45);
  g.fillEllipse(cx - 9 * s, cy - 9 * s, 6 * s, 2.8 * s);

  // Expresión facial según el estado (4 expresiones claras y amigables)
  g.lineStyle(Math.max(1.8, 2.2 * s), COLORES.astronautaReflejo, 1);

  if (estado === 'contenta') {
    // Ojos felices curvados ^ ^
    g.beginPath();
    g.arc(cx - 6 * s, cy - 3 * s, 3.2 * s, Math.PI, 0, false);
    g.strokePath();
    g.beginPath();
    g.arc(cx + 6 * s, cy - 3 * s, 3.2 * s, Math.PI, 0, false);
    g.strokePath();
    // Sonrisa amplia
    g.beginPath();
    g.arc(cx, cy + 0.5 * s, 5 * s, 0.15 * Math.PI, 0.85 * Math.PI, false);
    g.strokePath();
  } else if (estado === 'neutral') {
    // Ojos calmados y sonrisa suave
    g.fillStyle(COLORES.astronautaReflejo, 1);
    g.fillCircle(cx - 6 * s, cy - 4 * s, 2.4 * s);
    g.fillCircle(cx + 6 * s, cy - 4 * s, 2.4 * s);
    g.lineBetween(cx - 4 * s, cy + 2.5 * s, cx + 4 * s, cy + 2.5 * s);
  } else if (estado === 'preocupada') {
    // Cejas inclinadas + boca ondulada/recta corta
    g.lineBetween(cx - 9.5 * s, cy - 7 * s, cx - 3 * s, cy - 9 * s);
    g.lineBetween(cx + 9.5 * s, cy - 7 * s, cx + 3 * s, cy - 9 * s);
    g.fillStyle(COLORES.energia, 1);
    g.fillCircle(cx - 6 * s, cy - 3.5 * s, 2.3 * s);
    g.fillCircle(cx + 6 * s, cy - 3.5 * s, 2.3 * s);
    g.lineStyle(Math.max(1.8, 2.2 * s), COLORES.energia, 1);
    g.beginPath();
    g.arc(cx, cy + 5.5 * s, 4 * s, 1.15 * Math.PI, 1.85 * Math.PI, false);
    g.strokePath();
  } else {
    // Asustada: ojos bien abiertos + boquita en "o"
    g.fillStyle(COLORES.astronautaReflejo, 1);
    g.fillCircle(cx - 6 * s, cy - 4 * s, 3.3 * s);
    g.fillCircle(cx + 6 * s, cy - 4 * s, 3.3 * s);
    g.fillStyle(COLORES.astronautaVisor, 1);
    g.fillCircle(cx - 6 * s, cy - 4 * s, 1.3 * s);
    g.fillCircle(cx + 6 * s, cy - 4 * s, 1.3 * s);
    g.lineStyle(Math.max(1.6, 2 * s), COLORES.peligro, 1);
    g.strokeCircle(cx, cy + 3 * s, 2.8 * s);
  }
}

export interface OpcionesWidgetMascota {
  x: number;
  y: number;
  escala?: number;
  estadoInicial?: EstadoMascota;
  mostrarFrase?: boolean;
  anchoFrase?: number;
  alineacionFrase?: 'izquierda' | 'derecha' | 'abajo';
  contexto?: ContextoFraseMascota;
}

export interface WidgetMascota {
  container: Phaser.GameObjects.Container;
  setEstado: (
    estado: EstadoMascota,
    frasePersonalizada?: string,
    idioma?: Idioma,
  ) => void;
  setEscondida: (escondida: boolean) => void;
  setSaltando: (saltando: boolean) => void;
  destroy: () => void;
}

export function crearWidgetMascota(
  scene: Phaser.Scene,
  opciones: OpcionesWidgetMascota,
): WidgetMascota {
  const escala = opciones.escala ?? 1;
  const mostrarFrase = opciones.mostrarFrase ?? true;
  const alineacion = opciones.alineacionFrase ?? 'derecha';
  const anchoFrase = opciones.anchoFrase ?? 220;
  const contexto = opciones.contexto ?? 'hud';
  let estadoActual: EstadoMascota = opciones.estadoInicial ?? 'contenta';
  let escondida = false;
  let tweenSalto: Phaser.Tweens.Tween | null = null;

  const cuerpo = scene.add.container(0, 0);
  const graficoLuni = scene.add.graphics();
  const graficoEscudoEscondido = scene.add.graphics();
  graficoEscudoEscondido.setVisible(false);

  // Pequeña cubierta protectora cuando Luni se esconde en cierre incompleto
  graficoEscudoEscondido.fillStyle(COLORES.botonFondo, 1);
  graficoEscudoEscondido.fillRoundedRect(-24 * escala, 2 * escala, 48 * escala, 26 * escala, 8 * escala);
  graficoEscudoEscondido.lineStyle(2, COLORES.aviso, 1);
  graficoEscudoEscondido.strokeRoundedRect(-24 * escala, 2 * escala, 48 * escala, 26 * escala, 8 * escala);

  cuerpo.add([graficoLuni, graficoEscudoEscondido]);

  const elementos: Phaser.GameObjects.GameObject[] = [cuerpo];
  let fondoBurbuja: Phaser.GameObjects.Graphics | null = null;
  let textoFrase: Phaser.GameObjects.Text | null = null;

  if (mostrarFrase) {
    fondoBurbuja = scene.add.graphics();
    const textoGrande = getAjustes().textoGrande;
    const tamTexto = escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20);

    const bx =
      alineacion === 'derecha'
        ? 30 * escala + 10
        : alineacion === 'izquierda'
          ? -(30 * escala + anchoFrase + 10)
          : -anchoFrase / 2;
    const by = alineacion === 'abajo' ? 30 * escala + 8 : -28;

    textoFrase = scene.add
      .text(bx + anchoFrase / 2, by + 28, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamTexto}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: anchoFrase - 20 },
      })
      .setOrigin(0.5);

    elementos.push(fondoBurbuja, textoFrase);
  }

  const container = scene.add.container(opciones.x, opciones.y, elementos);

  const redibujarBurbuja = (colorBorde: number): void => {
    if (!fondoBurbuja || !textoFrase) {
      return;
    }
    const altoBurbuja = Math.max(54, Math.ceil(textoFrase.height + 16));
    const bx =
      alineacion === 'derecha'
        ? 30 * escala + 10
        : alineacion === 'izquierda'
          ? -(30 * escala + anchoFrase + 10)
          : -anchoFrase / 2;
    const by =
      alineacion === 'abajo' ? 30 * escala + 8 : -Math.round(altoBurbuja / 2);

    textoFrase.setPosition(bx + anchoFrase / 2, by + altoBurbuja / 2);

    fondoBurbuja.clear();
    fondoBurbuja.fillStyle(COLORES.pistaBarra, 0.96);
    fondoBurbuja.fillRoundedRect(
      bx,
      by,
      anchoFrase,
      altoBurbuja,
      ESPACIADO.radioBoton,
    );
    fondoBurbuja.lineStyle(2, colorBorde, 0.95);
    fondoBurbuja.strokeRoundedRect(
      bx,
      by,
      anchoFrase,
      altoBurbuja,
      ESPACIADO.radioBoton,
    );
  };

  const redibujar = (frasePersonalizada?: string, idioma?: Idioma): void => {
    graficoLuni.clear();
    dibujarMascotaLuni(
      graficoLuni,
      0,
      escondida ? 8 * escala : 0,
      escala,
      estadoActual,
    );
    graficoEscudoEscondido.setVisible(escondida);

    if (textoFrase) {
      const tamTexto = escalarTamanoTexto(
        TAMANOS_TEXTO.minimo,
        getAjustes().textoGrande,
        20,
      );
      textoFrase.setFontSize(tamTexto);
      textoFrase.setText(
        frasePersonalizada ?? obtenerFraseMascota(estadoActual, contexto, idioma),
      );
      redibujarBurbuja(obtenerColorEstadoMascota(estadoActual));
    }
  };

  const detenerSalto = (): void => {
    if (tweenSalto) {
      tweenSalto.stop();
      tweenSalto = null;
    }
    cuerpo.y = 0;
  };

  const setSaltando = (saltando: boolean): void => {
    detenerSalto();
    if (!saltando || getAjustes().movimientoReducido) {
      return;
    }
    tweenSalto = scene.tweens.add({
      targets: cuerpo,
      y: { from: 0, to: -12 * escala },
      duration: 520,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  };

  const setEscondida = (valor: boolean): void => {
    escondida = valor;
    if (escondida) {
      detenerSalto();
    }
    redibujar();
  };

  const setEstado = (
    nuevoEstado: EstadoMascota,
    frasePersonalizada?: string,
    idioma?: Idioma,
  ): void => {
    estadoActual = nuevoEstado;
    redibujar(frasePersonalizada, idioma);
  };

  redibujar();

  return {
    container,
    setEstado,
    setEscondida,
    setSaltando,
    destroy: () => {
      detenerSalto();
      container.destroy(true);
    },
  };
}
