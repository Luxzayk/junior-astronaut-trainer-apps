// Escena de selección entre las 3 semanas lunares y opción Sorpresa

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  formatearVentanaSemana,
  obtenerSemanaActiva,
  SEMANAS,
  elegirSemanaAlAzar,
  semanaTieneDatosVerificados,
  type DefinicionSemana,
} from '../game/semanas';
import { getAjustes, updateAjustes } from '../game/settings';
import { gameState } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
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
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';
import { lanzarEscenasJuego } from './MenuScene';

export class SemanaScene extends Phaser.Scene {
  private gestorFoco: GestorFoco | null = null;

  constructor() {
    super(SCENE_KEYS.semanas);
  }

  public create(): void {
    const cx = GAME_WIDTH / 2;
    const ajustes = getAjustes();
    const idioma = ajustes.idioma;
    const textoGrande = ajustes.textoGrande;
    const semanaActiva = obtenerSemanaActiva();

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.fondoLienzo, 1);
    fondo.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(cx, 52, t('semanas.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 38)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(cx, 96, t('semanas.subtitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
      })
      .setOrigin(0.5);

    const iniciarConSemana = (semana: DefinicionSemana): void => {
      updateAjustes({ ultimaSemana: semana.id });
      gameState.iniciarSemana(semana.id);
      lanzarEscenasJuego(this.scene);
      this.scene.stop();
    };

    const volverMenu = (): void => {
      this.scene.stop();
      this.scene.start(SCENE_KEYS.menu);
    };

    const sorpresa = (): void => {
      const elegida = elegirSemanaAlAzar();
      iniciarConSemana(elegida);
    };

    const cardW = 364;
    const cardH = 382;
    const gap = 28;
    const totalW = SEMANAS.length * cardW + (SEMANAS.length - 1) * gap;
    const xInicio = cx - totalW / 2 + cardW / 2;
    const yCards = 344;

    const itemsFoco: ItemFoco[] = [];

    SEMANAS.forEach((semana, idx) => {
      const x = xInicio + idx * (cardW + gap);
      const esActiva = semana.id === semanaActiva.id;
      this.crearTarjetaSemana(
        idx,
        x,
        yCards,
        cardW,
        cardH,
        semana,
        esActiva,
        idioma,
        textoGrande,
        () => iniciarConSemana(semana),
      );
      itemsFoco.push({
        x,
        y: yCards,
        ancho: cardW,
        alto: cardH,
        radio: ESPACIADO.radioPanel,
        activar: () => iniciarConSemana(semana),
      });
    });

    const yBotones = 622;
    const btnVolverX = cx - 180;
    const btnSorpresaX = cx + 180;

    this.crearBotonPie(
      SEMANAS.length,
      btnVolverX,
      yBotones,
      260,
      60,
      t('comun.volver'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      textoGrande,
      volverMenu,
    );
    itemsFoco.push({
      x: btnVolverX,
      y: yBotones,
      ancho: 260,
      alto: 60,
      activar: volverMenu,
    });

    this.crearBotonPie(
      SEMANAS.length + 1,
      btnSorpresaX,
      yBotones,
      280,
      60,
      t('semanas.sorpresa'),
      COLORES.energia,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      sorpresa,
    );
    itemsFoco.push({
      x: btnSorpresaX,
      y: yBotones,
      ancho: 280,
      alto: 60,
      activar: sorpresa,
    });

    this.gestorFoco = crearGestorFoco(this, {
      items: itemsFoco,
      grosorBorde: 4,
      onCancelar: volverMenu,
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  private crearTarjetaSemana(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    semana: DefinicionSemana,
    esActiva: boolean,
    idioma: 'es' | 'en',
    textoGrande: boolean,
    alPulsar: () => void,
  ): void {
    const verificada = semanaTieneDatosVerificados(semana.id);
    const fondo = this.add.graphics();
    const colorBordeBase = esActiva ? COLORES.aire : COLORES.bordePanel;

    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(hover ? COLORES.botonHover : COLORES.panelHud, 1);
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioPanel,
      );
      fondo.lineStyle(
        hover || esActiva ? OVERLAY_METRICAS.bordeGrosor : 2,
        hover ? COLORES.energia : colorBordeBase,
        1,
      );
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioPanel,
      );
    };
    dibujar(false);

    const contenedor = this.add.container(cx, cy, [fondo]);

    // Badge icono + texto de verificación (nunca solo color)
    const badgeW = ancho - 36;
    const badgeH = 38;
    const badgeY = -alto / 2 + 34;
    const gBadge = this.add.graphics();
    gBadge.fillStyle(COLORES.pistaBarra, 1);
    gBadge.fillRoundedRect(
      -badgeW / 2,
      badgeY - badgeH / 2,
      badgeW,
      badgeH,
      ESPACIADO.radioBarra,
    );
    gBadge.lineStyle(1.5, verificada ? COLORES.ok : COLORES.energia, 0.9);
    gBadge.strokeRoundedRect(
      -badgeW / 2,
      badgeY - badgeH / 2,
      badgeW,
      badgeH,
      ESPACIADO.radioBarra,
    );

    if (verificada) {
      dibujarIconoMisionLista(
        gBadge,
        -badgeW / 2 + 22,
        badgeY,
        20,
        COLORES.ok,
      );
    } else {
      dibujarIconoMisionActiva(
        gBadge,
        -badgeW / 2 + 22,
        badgeY,
        20,
        COLORES.energia,
      );
    }

    const txtBadge = this.add
      .text(
        -badgeW / 2 + 40,
        badgeY,
        verificada ? t('sellos.datosVerificados') : t('sellos.datosEjemplo'),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${TAMANOS_TEXTO.minimo}px`,
          fontStyle: 'bold',
          color: verificada ? COLORES_HEX.ok : COLORES_HEX.energia,
        },
      )
      .setOrigin(0, 0.5);

    contenedor.add([gBadge, txtBadge]);

    if (esActiva) {
      const txtActiva = this.add
        .text(badgeW / 2 - 10, badgeY, t('semanas.activaTag'), {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${TAMANOS_TEXTO.minimo}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.aire,
        })
        .setOrigin(1, 0.5);
      contenedor.add(txtActiva);
    }

    const nombre = this.add
      .text(0, -alto / 2 + 96, semana.nombre[idioma], {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(23, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: ancho - 36 },
      })
      .setOrigin(0.5);

    const ventana = this.add
      .text(0, -alto / 2 + 160, formatearVentanaSemana(semana, idioma), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aire,
        align: 'center',
        wordWrap: { width: ancho - 36 },
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -alto / 2 + 232, semana.descripcion[idioma], {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        lineSpacing: 4,
        wordWrap: { width: ancho - 36 },
      })
      .setOrigin(0.5);

    const ctaW = ancho - 48;
    const ctaH = 56;
    const ctaY = alto / 2 - 46;
    const gCta = this.add.graphics();
    gCta.fillStyle(esActiva ? COLORES.ok : COLORES.aire, 1);
    gCta.fillRoundedRect(
      -ctaW / 2,
      ctaY - ctaH / 2,
      ctaW,
      ctaH,
      ESPACIADO.radioBoton,
    );

    const txtCta = this.add
      .text(0, ctaY, t('semanas.jugarSeleccionada'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(20, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.botonTextoOscuro,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    contenedor.add([nombre, ventana, desc, gCta, txtCta, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(indice, false);
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

  private crearBotonPie(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    colorFondo: number,
    colorTexto: string,
    textoGrande: boolean,
    alPulsar: () => void,
  ): void {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(colorFondo, hover ? 0.9 : 1);
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
      .text(0, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26)}px`,
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
      this.gestorFoco?.sincronizarIndice(indice, false);
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
  }
}
