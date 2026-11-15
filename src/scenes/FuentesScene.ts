// Escena informativa de fuentes científicas, ventanas de semanas y estado de archivo (scroll)

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  localEventosProvider,
  obtenerEtiquetaSelloEvento,
} from '../data/eventosLoader';
import { FUENTES_DATOS, obtenerReglaNivelOrientativa } from '../data/fuentes';
import { formatearVentanaSemana, SEMANAS } from '../game/semanas';
import { getAjustes } from '../game/settings';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco } from '../ui/focus';
import {
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
} from '../ui/icons';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  TAMANOS_TEXTO,
} from '../ui/theme';

export interface DatosNavegacionSubescena {
  volverA?: 'menu' | 'pausa';
}

export class FuentesScene extends Phaser.Scene {
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
    super(SCENE_KEYS.fuentes);
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
      .text(cx, 44, t('fuentes.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 84, t('fuentes.subtitulo'), {
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

    const viewX = 96;
    const viewW = GAME_WIDTH - 192;
    this.mascaraShape = this.make.graphics({ x: 0, y: 0 }, false);
    this.mascaraShape.fillStyle(0xffffff, 1);
    this.mascaraShape.fillRect(viewX, this.viewportY, viewW, this.viewportAlto);
    const mascara = this.mascaraShape.createGeometryMask();
    this.scrollContenedor.setMask(mascara);

    let yCursor = 8;
    const cardW = viewW - 36;

    // 1. Fuentes registradas (DONKI con etiqueta "De archivo", Balance, Tecnología)
    for (const fuente of FUENTES_DATOS) {
      const etiquetaTipo =
        fuente.tipo === 'archivo'
          ? t('fuentes.etiquetaArchivo')
          : fuente.tipo === 'balance'
            ? t('fuentes.etiquetaBalance')
            : t('fuentes.etiquetaTecnologia');

      const lineasTexto = [
        fuente.descripcion[idioma],
        fuente.url ? `${fuente.url}` : '',
        fuente.nota[idioma],
      ]
        .filter((s) => s.length > 0)
        .join('\n');

      const altoCard = textoGrande ? 190 : 164;
      this.agregarTarjetaInformativa(
        cx,
        yCursor,
        cardW,
        altoCard,
        fuente.titulo[idioma],
        etiquetaTipo,
        fuente.tipo === 'archivo' ? COLORES.aire : COLORES.energia,
        lineasTexto,
        textoGrande,
      );
      yCursor += altoCard + 16;
    }

    // 2. Ventanas de las 3 semanas
    const lineasVentanas = SEMANAS.map(
      (s) => `• ${s.nombre[idioma]}: ${formatearVentanaSemana(s, idioma)}`,
    ).join('\n');
    const altoVentanas = textoGrande ? 176 : 152;
    this.agregarTarjetaInformativa(
      cx,
      yCursor,
      cardW,
      altoVentanas,
      t('fuentes.ventanasTitulo'),
      t('fuentes.etiquetaArchivo'),
      COLORES.aire,
      lineasVentanas,
      textoGrande,
    );
    yCursor += altoVentanas + 16;

    // 3. Estado de los 6 eventos
    const eventos = localEventosProvider.obtenerTodos();
    const altoEventos = 84 + Math.max(1, eventos.length) * (textoGrande ? 42 : 34);
    this.agregarTarjetaEventos(
      cx,
      yCursor,
      cardW,
      altoEventos,
      eventos,
      idioma,
      textoGrande,
    );
    yCursor += altoEventos + 16;

    // 4. Regla orientativa de nivel + aviso sin red
    const altoRegla = textoGrande ? 154 : 134;
    this.agregarTarjetaInformativa(
      cx,
      yCursor,
      cardW,
      altoRegla,
      t('fuentes.reglaNivelTitulo'),
      t('fuentes.etiquetaBalance'),
      COLORES.escudo,
      `${obtenerReglaNivelOrientativa(idioma)}\n${t('fuentes.sinRedAviso')}`,
      textoGrande,
    );
    yCursor += altoRegla + 16;

    this.maxScroll = Math.max(0, yCursor - this.viewportAlto);
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

  private agregarTarjetaInformativa(
    cx: number,
    yTop: number,
    ancho: number,
    alto: number,
    titulo: string,
    tagTexto: string,
    colorAcento: number,
    cuerpo: string,
    textoGrande: boolean,
  ): void {
    if (!this.scrollContenedor) {
      return;
    }
    const left = cx - ancho / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);
    g.lineStyle(2, COLORES.bordePanel, 1);
    g.strokeRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);

    const tagW = Math.min(220, Math.max(136, tagTexto.length * 11 + 28));
    g.fillStyle(COLORES.pistaBarra, 1);
    g.fillRoundedRect(
      left + ancho - tagW - 18,
      yTop + 14,
      tagW,
      32,
      ESPACIADO.radioBarra,
    );
    g.lineStyle(1.5, colorAcento, 0.9);
    g.strokeRoundedRect(
      left + ancho - tagW - 18,
      yTop + 14,
      tagW,
      32,
      ESPACIADO.radioBarra,
    );

    const txtTag = this.add
      .text(left + ancho - tagW / 2 - 18, yTop + 30, tagTexto, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color:
          colorAcento === COLORES.aire
            ? COLORES_HEX.aire
            : colorAcento === COLORES.escudo
              ? COLORES_HEX.escudo
              : COLORES_HEX.energia,
      })
      .setOrigin(0.5);

    const txtTitulo = this.add
      .text(left + 22, yTop + 30, titulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        wordWrap: { width: ancho - tagW - 60 },
      })
      .setOrigin(0, 0.5);

    const txtCuerpo = this.add
      .text(left + 22, yTop + 58, cuerpo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        lineSpacing: 6,
        wordWrap: { width: ancho - 44 },
      })
      .setOrigin(0, 0);

    this.scrollContenedor.add([g, txtTag, txtTitulo, txtCuerpo]);
  }

  private agregarTarjetaEventos(
    cx: number,
    yTop: number,
    ancho: number,
    alto: number,
    eventos: ReturnType<typeof localEventosProvider.obtenerTodos>,
    idioma: 'es' | 'en',
    textoGrande: boolean,
  ): void {
    if (!this.scrollContenedor) {
      return;
    }
    const left = cx - ancho / 2;
    const g = this.add.graphics();
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);
    g.lineStyle(2, COLORES.bordePanel, 1);
    g.strokeRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);

    const txtTitulo = this.add
      .text(left + 22, yTop + 28, t('fuentes.eventosTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);

    this.scrollContenedor.add([g, txtTitulo]);

    const pasoFila = textoGrande ? 40 : 34;
    eventos.forEach((ev, idx) => {
      const fy = yTop + 68 + idx * pasoFila;
      const verificado = !ev.esEjemplo;
      if (verificado) {
        dibujarIconoMisionLista(g, left + 34, fy, 18, COLORES.ok);
      } else {
        dibujarIconoMisionActiva(g, left + 34, fy, 18, COLORES.energia);
      }

      const etiqueta = `${ev.id} (${ev.tipo} · ${ev.nivel}) — ${obtenerEtiquetaSelloEvento(ev, idioma)}`;
      const txtFila = this.add
        .text(left + 54, fy, etiqueta, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'normal',
          color: verificado ? COLORES_HEX.ok : COLORES_HEX.textoSecundario,
          wordWrap: { width: ancho - 76 },
        })
        .setOrigin(0, 0.5);
      this.scrollContenedor?.add(txtFila);
    });
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
    const trackX = GAME_WIDTH - 78;
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
