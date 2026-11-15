// Escena overlay del tutorial interactivo de 7 pasos en Jornada 1

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import { getAjustes, suscribirAjustes } from '../game/settings';
import { gameState } from '../game/state';
import { tutorialManager, type DefinicionPasoTutorial } from '../game/tutorial';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import { obtenerObjetivoUI, type RectObjetivo } from '../ui/targets';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

interface GeometriaTarjeta {
  cx: number;
  cy: number;
  ancho: number;
  alto: number;
  horizontal: boolean;
}

export class TutorialScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private bloqueador: Phaser.GameObjects.Rectangle | null = null;
  private capaDim: Phaser.GameObjects.Graphics | null = null;
  private capaFlecha: Phaser.GameObjects.Graphics | null = null;
  private capaTarjeta: Phaser.GameObjects.Container | null = null;
  private gestorFoco: GestorFoco | null = null;
  private tweenFlecha: Phaser.Tweens.Tween | null = null;
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.tutorial);
  }

  public create(): void {
    this.desuscripciones = [];

    this.bloqueador = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        COLORES.fondoLienzo,
        0.001,
      )
      .setInteractive();
    this.bloqueador.disableInteractive();

    this.capaDim = this.add.graphics();
    this.capaFlecha = this.add.graphics();
    this.capaTarjeta = this.add.container(0, 0);

    this.raiz = this.add.container(0, 0, [
      this.bloqueador,
      this.capaDim,
      this.capaFlecha,
      this.capaTarjeta,
    ]);
    this.raiz.setVisible(false);

    this.gestorFoco = crearGestorFoco(this, {
      items: [],
      padre: this.raiz,
      mostrarInicial: true,
      habilitado: () => {
        const paso = tutorialManager.obtenerPasoActual();
        return Boolean(this.raiz?.visible && paso?.requiereEntendido);
      },
      onCancelar: () => {
        tutorialManager.saltar();
      },
    });

    this.desuscripciones.push(
      tutorialManager.onCambio(() => {
        this.redibujar();
      }),
    );
    this.desuscripciones.push(
      gameState.on('estado:cambio', () => {
        this.redibujar();
      }),
    );
    this.desuscripciones.push(
      suscribirAjustes(() => {
        this.redibujar();
      }),
    );

    this.time.delayedCall(0, () => {
      this.redibujar();
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  private detenerTweenFlecha(): void {
    if (this.tweenFlecha) {
      this.tweenFlecha.stop();
      this.tweenFlecha = null;
    }
    this.capaFlecha?.setPosition(0, 0);
  }

  private debeOcultarPorEstado(
    paso: DefinicionPasoTutorial,
    estadoJuego: string,
  ): boolean {
    if (estadoJuego === 'pausa' || estadoJuego === 'evento' || estadoJuego === 'apagon' || estadoJuego === 'evacuacion') {
      return true;
    }
    if (paso.id === 'cierre') {
      return estadoJuego !== 'finJornada';
    }
    if (paso.id === 'elegir') {
      return estadoJuego !== 'eleccion';
    }
    if (paso.id === 'minijuego') {
      return estadoJuego !== 'minijuego';
    }
    return estadoJuego === 'finJornada';
  }

  private redibujar(): void {
    if (
      !this.raiz ||
      !this.bloqueador ||
      !this.capaDim ||
      !this.capaFlecha ||
      !this.capaTarjeta
    ) {
      return;
    }

    this.detenerTweenFlecha();
    this.capaDim.clear();
    this.capaFlecha.clear();
    this.capaTarjeta.removeAll(true);

    const snapTutorial = tutorialManager.getSnapshot();
    const paso = snapTutorial.pasoActual;
    const estadoJuego = gameState.getSnapshot().estado;

    if (!snapTutorial.visible || !paso || this.debeOcultarPorEstado(paso, estadoJuego)) {
      this.bloqueador.disableInteractive();
      this.raiz.setVisible(false);
      this.gestorFoco?.actualizarItems([]);
      return;
    }

    this.raiz.setVisible(true);

    if (paso.requiereEntendido) {
      this.bloqueador.setInteractive();
    } else {
      this.bloqueador.disableInteractive();
    }

    const objetivo = obtenerObjetivoUI(paso.objetivoUI);
    this.dibujarFocoObjetivo(paso, objetivo);

    const geom = this.calcularGeometriaTarjeta(paso);
    this.construirTarjetaPaso(paso, snapTutorial.totalPasos, geom);

    if (objetivo && paso.objetivoUI !== 'mapa') {
      this.dibujarFlechaHacia(objetivo, geom);
    }
  }

  private dibujarFocoObjetivo(
    paso: DefinicionPasoTutorial,
    objetivo: RectObjetivo | null,
  ): void {
    if (!this.capaDim) {
      return;
    }

    const alphaDim = paso.requiereEntendido
      ? OVERLAY_METRICAS.fondoAlpha
      : paso.id === 'elegir'
        ? 0.45
        : 0;

    if (alphaDim > 0 && objetivo) {
      const pad = 6;
      const rx = Math.max(0, objetivo.x - pad);
      const ry = Math.max(0, objetivo.y - pad);
      const rw = Math.min(GAME_WIDTH - rx, objetivo.ancho + pad * 2);
      const rh = Math.min(GAME_HEIGHT - ry, objetivo.alto + pad * 2);

      this.capaDim.fillStyle(COLORES.fondoLienzo, alphaDim);
      // 4 franjas alrededor del rectángulo objetivo para mantenerlo nítido e interactivo
      if (ry > 0) {
        this.capaDim.fillRect(0, 0, GAME_WIDTH, ry);
      }
      const bottomY = ry + rh;
      if (bottomY < GAME_HEIGHT) {
        this.capaDim.fillRect(0, bottomY, GAME_WIDTH, GAME_HEIGHT - bottomY);
      }
      if (rx > 0) {
        this.capaDim.fillRect(0, ry, rx, rh);
      }
      const rightX = rx + rw;
      if (rightX < GAME_WIDTH) {
        this.capaDim.fillRect(rightX, ry, GAME_WIDTH - rightX, rh);
      }

      this.capaDim.lineStyle(3, COLORES.focoBorde, 1);
      this.capaDim.strokeRoundedRect(rx, ry, rw, rh, ESPACIADO.radioBoton);
      return;
    }

    if (alphaDim > 0) {
      this.capaDim.fillStyle(COLORES.fondoLienzo, alphaDim);
      this.capaDim.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      return;
    }

    if (objetivo && paso.objetivoUI !== 'mapa') {
      const pad = 6;
      this.capaDim.lineStyle(3, COLORES.focoBorde, 0.95);
      this.capaDim.strokeRoundedRect(
        objetivo.x - pad,
        objetivo.y - pad,
        objetivo.ancho + pad * 2,
        objetivo.alto + pad * 2,
        ESPACIADO.radioBoton,
      );
    }
  }

  private calcularGeometriaTarjeta(paso: DefinicionPasoTutorial): GeometriaTarjeta {
    if (paso.id === 'objetivo') {
      return { cx: 344, cy: 204, ancho: 560, alto: 184, horizontal: false };
    }
    if (paso.id === 'cierre') {
      return { cx: GAME_WIDTH / 2, cy: 212, ancho: 580, alto: 184, horizontal: false };
    }
    if (paso.id === 'minijuego' || paso.id === 'elegir') {
      return {
        cx: GAME_WIDTH / 2,
        cy: GAME_HEIGHT - 44,
        ancho: 880,
        alto: 78,
        horizontal: true,
      };
    }
    // moverse, ir_estacion, usar: esquina inferior izquierda sobre zona de cráteres no caminable
    return { cx: 266, cy: 626, ancho: 500, alto: 162, horizontal: false };
  }

  private construirTarjetaPaso(
    paso: DefinicionPasoTutorial,
    totalPasos: number,
    geom: GeometriaTarjeta,
  ): void {
    if (!this.capaTarjeta) {
      return;
    }
    const ajustes = getAjustes();
    const textoGrande = ajustes.textoGrande;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.panelHud, 0.98);
    fondo.fillRoundedRect(
      geom.cx - geom.ancho / 2,
      geom.cy - geom.alto / 2,
      geom.ancho,
      geom.alto,
      ESPACIADO.radioPanel,
    );
    fondo.lineStyle(3, COLORES.focoBorde, 1);
    fondo.strokeRoundedRect(
      geom.cx - geom.ancho / 2,
      geom.cy - geom.alto / 2,
      geom.ancho,
      geom.alto,
      ESPACIADO.radioPanel,
    );
    this.capaTarjeta.add(fondo);

    const itemsFoco: ItemFoco[] = [];
    const etiquetaPaso = t('tutorial.pasoDe', {
      actual: paso.numero,
      total: totalPasos,
    });
    const mensaje = t(paso.textoClave);

    if (geom.horizontal) {
      const leftX = geom.cx - geom.ancho / 2 + 24;
      const badge = this.add
        .text(leftX, geom.cy - 18, etiquetaPaso, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.aire,
        })
        .setOrigin(0, 0.5);

      const texto = this.add
        .text(leftX, geom.cy + 14, mensaje, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
          wordWrap: { width: geom.ancho - 280 },
        })
        .setOrigin(0, 0.5);

      const btnSaltarW = 224;
      const btnSaltarH = 56;
      const btnSaltarX = geom.cx + geom.ancho / 2 - btnSaltarW / 2 - 16;
      const btnSaltarY = geom.cy;
      const btnSaltar = this.crearBotonTarjeta(
        btnSaltarX,
        btnSaltarY,
        btnSaltarW,
        btnSaltarH,
        t('tutorial.saltarTutorial'),
        COLORES.botonFondo,
        COLORES_HEX.textoPrincipal,
        COLORES.aire,
        textoGrande,
        () => tutorialManager.saltar(),
      );

      this.capaTarjeta.add([badge, texto, btnSaltar]);
      this.gestorFoco?.actualizarItems([]);
      return;
    }

    const top = geom.cy - geom.alto / 2;
    const badge = this.add
      .text(geom.cx - geom.ancho / 2 + 24, top + 24, etiquetaPaso, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aire,
      })
      .setOrigin(0, 0.5);

    const texto = this.add
      .text(geom.cx, top + 66, mensaje, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: geom.ancho - 48 },
      })
      .setOrigin(0.5);

    this.capaTarjeta.add([badge, texto]);

    const btnY = geom.cy + geom.alto / 2 - 40;
    const btnH = 56;

    if (paso.requiereEntendido) {
      const btnW = 220;
      const xEntendido = geom.cx - btnW / 2 - 12;
      const xSaltar = geom.cx + btnW / 2 + 12;

      const btnEntendido = this.crearBotonTarjeta(
        xEntendido,
        btnY,
        btnW,
        btnH,
        t('tutorial.entendido'),
        COLORES.ok,
        COLORES_HEX.botonTextoOscuro,
        COLORES.bordePanel,
        textoGrande,
        () => tutorialManager.confirmarEntendido(),
      );
      const btnSaltar = this.crearBotonTarjeta(
        xSaltar,
        btnY,
        btnW,
        btnH,
        t('tutorial.saltarTutorial'),
        COLORES.botonFondo,
        COLORES_HEX.textoPrincipal,
        COLORES.aire,
        textoGrande,
        () => tutorialManager.saltar(),
      );

      this.capaTarjeta.add([btnEntendido, btnSaltar]);
      itemsFoco.push(
        {
          x: xEntendido,
          y: btnY,
          ancho: btnW,
          alto: btnH,
          activar: () => tutorialManager.confirmarEntendido(),
        },
        {
          x: xSaltar,
          y: btnY,
          ancho: btnW,
          alto: btnH,
          activar: () => tutorialManager.saltar(),
        },
      );
      this.gestorFoco?.actualizarItems(itemsFoco, false);
      this.gestorFoco?.sincronizarIndice(0, true);
    } else {
      const btnSaltarW = 240;
      const btnSaltar = this.crearBotonTarjeta(
        geom.cx,
        btnY,
        btnSaltarW,
        btnH,
        t('tutorial.saltarTutorial'),
        COLORES.botonFondo,
        COLORES_HEX.textoPrincipal,
        COLORES.aire,
        textoGrande,
        () => tutorialManager.saltar(),
      );
      this.capaTarjeta.add(btnSaltar);
      this.gestorFoco?.actualizarItems([]);
    }
  }

  private dibujarFlechaHacia(
    objetivo: RectObjetivo,
    geom: GeometriaTarjeta,
  ): void {
    if (!this.capaFlecha) {
      return;
    }

    const tx = objetivo.x + objetivo.ancho / 2;
    const ty = objetivo.y + objetivo.alto / 2;
    const dx = tx - geom.cx;
    const dy = ty - geom.cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 1) {
      return;
    }

    const ux = dx / dist;
    const uy = dy / dist;

    // Punto cercano al objetivo sin taparlo
    const margenObj = Math.max(objetivo.ancho, objetivo.alto) / 2 + 18;
    const puntaX = tx - ux * Math.min(margenObj, dist * 0.45);
    const puntaY = ty - uy * Math.min(margenObj, dist * 0.45);
    const colaX = puntaX - ux * 42;
    const colaY = puntaY - uy * 42;

    const g = this.capaFlecha;
    g.lineStyle(6, COLORES.focoBorde, 1);
    g.lineBetween(colaX, colaY, puntaX - ux * 10, puntaY - uy * 10);

    const perpX = -uy * 14;
    const perpY = ux * 14;
    const baseX = puntaX - ux * 18;
    const baseY = puntaY - uy * 18;

    g.fillStyle(COLORES.focoBorde, 1);
    g.fillTriangle(
      puntaX,
      puntaY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY,
    );

    if (!getAjustes().movimientoReducido) {
      this.tweenFlecha = this.tweens.add({
        targets: this.capaFlecha,
        x: ux * 7,
        y: uy * 7,
        duration: 550,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private crearBotonTarjeta(
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    colorFondo: number,
    colorTexto: string,
    colorBorde: number,
    textoGrande: boolean,
    alPulsar: () => void,
  ): Phaser.GameObjects.Container {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(hover ? COLORES.botonHover : colorFondo, 1);
      if (hover && colorFondo === COLORES.ok) {
        fondo.fillStyle(COLORES.ok, 0.88);
      }
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, colorBorde, 1);
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
    };
    dibujar(false);

    const texto = this.add
      .text(0, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 22)}px`,
        fontStyle: 'bold',
        color: colorTexto,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(1.02);
      }
    });
    zona.on('pointerout', () => {
      dibujar(false);
      contenedor.setScale(1);
    });
    zona.on('pointerdown', () => {
      alPulsar();
    });

    return contenedor;
  }

  private limpiar(): void {
    this.detenerTweenFlecha();
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    for (const off of this.desuscripciones) {
      off();
    }
    this.desuscripciones = [];
  }
}
