// Escena de glosario espacial bilingüe para niños (scroll táctil, rueda y teclado)

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import { TERMINOS_GLOSARIO } from '../game/glosario';
import { getAjustes } from '../game/settings';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco } from '../ui/focus';
import { dibujarIconoLobby } from '../ui/icons';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  TAMANOS_TEXTO,
} from '../ui/theme';
import type { DatosNavegacionSubescena } from './FuentesScene';

export class GlosarioScene extends Phaser.Scene {
  private gestorFoco: GestorFoco | null = null;
  private volverA: 'menu' | 'pausa' = 'menu';
  private scrollContenedor: Phaser.GameObjects.Container | null = null;
  private barraScroll: Phaser.GameObjects.Graphics | null = null;
  private mascaraShape: Phaser.GameObjects.Graphics | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private arrastrando = false;
  private ultimoPointerY = 0;
  private viewportY = 130;
  private viewportAlto = 472;
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.glosario);
  }

  public init(data?: DatosNavegacionSubescena): void {
    this.volverA = data?.volverA === 'pausa' ? 'pausa' : 'menu';
  }

  public create(): void {
    this.desuscripciones = [];
    this.scrollY = 0;
    this.maxScroll = 0;

    const cx = GAME_WIDTH / 2;
    const ajustes = getAjustes();
    const idioma = ajustes.idioma;
    const textoGrande = ajustes.textoGrande;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.fondoLienzo, 1);
    fondo.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 44, t('glosario.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 84, t('glosario.subtitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 22)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 112, t('fuentes.desplazarHint'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.aire,
        align: 'center',
      })
      .setOrigin(0.5);

    this.scrollContenedor = this.add.container(0, this.viewportY);

    const viewX = 72;
    const viewW = GAME_WIDTH - 144;
    this.mascaraShape = this.make.graphics({ x: 0, y: 0 }, false);
    this.mascaraShape.fillStyle(0xffffff, 1);
    this.mascaraShape.fillRect(viewX, this.viewportY, viewW, this.viewportAlto);
    const mascara = this.mascaraShape.createGeometryMask();
    this.scrollContenedor.setMask(mascara);

    const cardW = 520;
    const cardH = textoGrande ? 174 : 150;
    const gapX = 28;
    const gapY = 18;
    const xCol0 = cx - cardW / 2 - gapX / 2;
    const xCol1 = cx + cardW / 2 + gapX / 2;

    TERMINOS_GLOSARIO.forEach((termino, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const cardCx = col === 0 ? xCol0 : xCol1;
      const yTop = 10 + row * (cardH + gapY);

      const g = this.add.graphics();
      g.fillStyle(COLORES.panelHud, 1);
      g.fillRoundedRect(
        cardCx - cardW / 2,
        yTop,
        cardW,
        cardH,
        ESPACIADO.radioPanel,
      );
      g.lineStyle(2, COLORES.bordePanel, 1);
      g.strokeRoundedRect(
        cardCx - cardW / 2,
        yTop,
        cardW,
        cardH,
        ESPACIADO.radioPanel,
      );

      dibujarIconoLobby(
        g,
        cardCx - cardW / 2 + 28,
        yTop + 30,
        22,
        COLORES.aire,
      );

      const txtNombre = this.add
        .text(cardCx - cardW / 2 + 48, yTop + 30, termino.nombre[idioma], {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(21, textoGrande, 24)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.aire,
          wordWrap: { width: cardW - 68 },
        })
        .setOrigin(0, 0.5);

      const txtDef = this.add
        .text(cardCx - cardW / 2 + 22, yTop + 56, termino.definicion[idioma], {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.textoPrincipal,
          lineSpacing: 5,
          wordWrap: { width: cardW - 44 },
        })
        .setOrigin(0, 0);

      this.scrollContenedor?.add([g, txtNombre, txtDef]);
    });

    const totalFilas = Math.ceil(TERMINOS_GLOSARIO.length / 2);
    const totalAlto = 10 + totalFilas * (cardH + gapY);
    this.maxScroll = Math.max(0, totalAlto - this.viewportAlto);

    this.barraScroll = this.add.graphics();
    this.actualizarScrollVisual();
    this.configurarScroll();

    const volver = (): void => {
      if (this.volverA === 'pausa') {
        this.scene.stop();
        return;
      }
      this.scene.stop();
      this.scene.start(SCENE_KEYS.menu);
    };

    const btnY = 656;
    const btnW = 260;
    const btnH = 58;
    this.crearBotonVolver(cx, btnY, btnW, btnH, textoGrande, volver);

    this.gestorFoco = crearGestorFoco(this, {
      items: [
        {
          x: cx,
          y: btnY,
          ancho: btnW,
          alto: btnH,
          activar: volver,
        },
      ],
      grosorBorde: 4,
      onCancelar: volver,
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  private configurarScroll(): void {
    const moverScroll = (delta: number): void => {
      if (this.maxScroll <= 0) {
        return;
      }
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
      if (this.scrollContenedor) {
        this.scrollContenedor.y = this.viewportY - this.scrollY;
      }
      this.actualizarScrollVisual();
    };

    const onWheel = (
      _pointer: Phaser.Input.Pointer,
      _objs: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
    ): void => {
      moverScroll(dy * 0.65);
    };

    const onDown = (pointer: Phaser.Input.Pointer): void => {
      if (
        pointer.y >= this.viewportY &&
        pointer.y <= this.viewportY + this.viewportAlto
      ) {
        this.arrastrando = true;
        this.ultimoPointerY = pointer.y;
      }
    };

    const onMove = (pointer: Phaser.Input.Pointer): void => {
      if (!this.arrastrando || !pointer.isDown) {
        return;
      }
      const dy = this.ultimoPointerY - pointer.y;
      this.ultimoPointerY = pointer.y;
      moverScroll(dy);
    };

    const onUp = (): void => {
      this.arrastrando = false;
    };

    this.input.on('wheel', onWheel);
    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);

    this.desuscripciones.push(() => {
      this.input.off('wheel', onWheel);
      this.input.off('pointerdown', onDown);
      this.input.off('pointermove', onMove);
      this.input.off('pointerup', onUp);
    });

    const teclado = this.input.keyboard;
    if (teclado) {
      const onKey = (ev: KeyboardEvent): void => {
        if (ev.code === 'ArrowDown' || ev.code === 'PageDown') {
          ev.preventDefault();
          moverScroll(ev.code === 'PageDown' ? 180 : 56);
        } else if (ev.code === 'ArrowUp' || ev.code === 'PageUp') {
          ev.preventDefault();
          moverScroll(ev.code === 'PageUp' ? -180 : -56);
        }
      };
      teclado.on('keydown', onKey);
      this.desuscripciones.push(() => {
        teclado.off('keydown', onKey);
      });
    }
  }

  private actualizarScrollVisual(): void {
    if (!this.barraScroll) {
      return;
    }
    this.barraScroll.clear();
    if (this.maxScroll <= 0) {
      return;
    }
    const trackX = GAME_WIDTH - 64;
    const trackY = this.viewportY + 8;
    const trackH = this.viewportAlto - 16;

    this.barraScroll.fillStyle(COLORES.pistaBarra, 1);
    this.barraScroll.fillRoundedRect(trackX, trackY, 10, trackH, 5);

    const fracVisible =
      this.viewportAlto / (this.viewportAlto + this.maxScroll);
    const thumbH = Math.max(44, Math.round(trackH * fracVisible));
    const progreso = this.scrollY / this.maxScroll;
    const thumbY = trackY + Math.round((trackH - thumbH) * progreso);

    this.barraScroll.fillStyle(COLORES.aire, 0.9);
    this.barraScroll.fillRoundedRect(trackX, thumbY, 10, thumbH, 5);
  }

  private crearBotonVolver(
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    textoGrande: boolean,
    alPulsar: () => void,
  ): void {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(COLORES.aire, hover ? 0.9 : 1);
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, COLORES.bordePanel, 1);
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
      .text(0, 0, t('comun.volver'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.botonTextoOscuro,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(0, false);
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(1.02);
      }
    });
    zona.on('pointerout', () => {
      dibujar(false);
      contenedor.setScale(1);
    });
    zona.on('pointerdown', alPulsar);
  }

  private limpiar(): void {
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    this.mascaraShape?.destroy();
    this.mascaraShape = null;
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
  }
}
