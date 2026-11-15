// Escena de ajustes accesibles: idioma, texto grande, movimiento reducido y tutorial

import Phaser from 'phaser';
import { audioEngine } from '../audio/audio';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  getAjustes,
  resetAjustes,
  updateAjustes,
} from '../game/settings';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import {
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
  dibujarIconoSonido,
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
import type { DatosNavegacionSubescena } from './FuentesScene';

export interface DatosAjustesScene extends DatosNavegacionSubescena {
  tutorialReiniciado?: boolean;
}

export class AjustesScene extends Phaser.Scene {
  private gestorFoco: GestorFoco | null = null;
  private volverA: 'menu' | 'pausa' = 'menu';
  private tutorialReiniciado = false;

  constructor() {
    super(SCENE_KEYS.ajustes);
  }

  public init(data?: DatosAjustesScene): void {
    this.volverA = data?.volverA === 'pausa' ? 'pausa' : 'menu';
    this.tutorialReiniciado = Boolean(data?.tutorialReiniciado);
  }

  public create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ajustes = getAjustes();
    const textoGrande = ajustes.textoGrande;

    const panelW = 880;
    const panelH = 684;
    const left = cx - panelW / 2;
    const top = cy - panelH / 2;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.fondoLienzo, this.volverA === 'pausa' ? 0.88 : 1);
    fondo.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Bloqueador de clics detrás cuando se abre sobre Pausa
    this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORES.fondoLienzo, 0.01)
      .setInteractive();

    const panel = this.add.graphics();
    panel.fillStyle(COLORES.panelHud, 1);
    panel.fillRoundedRect(left, top, panelW, panelH, ESPACIADO.radioPanel);
    panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.bordePanel, 1);
    panel.strokeRoundedRect(left, top, panelW, panelH, ESPACIADO.radioPanel);

    this.add
      .text(cx, top + 40, t('ajustes.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 38)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.add
      .text(cx, top + 78, t('ajustes.subtitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 22)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0.5);

    const recargar = (conAvisoTutorial = false): void => {
      this.scene.restart({
        volverA: this.volverA,
        tutorialReiniciado: conAvisoTutorial,
      });
    };

    const volver = (): void => {
      if (this.volverA === 'pausa') {
        this.scene.stop();
        return;
      }
      this.scene.stop();
      this.scene.start(SCENE_KEYS.menu);
    };

    const itemsFoco: ItemFoco[] = [];
    const labelX = left + 40;
    const descX = left + 40;

    // Fila 1: Idioma (ES / EN)
    const fila1Y = top + 140;
    this.dibujarFilaBase(left + 26, fila1Y - 38, panelW - 52, 76);
    this.add
      .text(labelX, fila1Y, t('ajustes.idiomaEtiqueta'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(22, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);

    const btnEsX = left + panelW - 296;
    const btnEnX = left + panelW - 122;
    const esActivo = ajustes.idioma === 'es';
    const enActivo = ajustes.idioma === 'en';

    this.crearBotonToggle(
      itemsFoco.length,
      btnEsX,
      fila1Y,
      154,
      56,
      t('ajustes.idiomaEs'),
      esActivo,
      textoGrande,
      () => {
        updateAjustes({ idioma: 'es' });
        recargar(this.tutorialReiniciado);
      },
    );
    itemsFoco.push({
      x: btnEsX,
      y: fila1Y,
      ancho: 154,
      alto: 56,
      activar: () => {
        updateAjustes({ idioma: 'es' });
        recargar(this.tutorialReiniciado);
      },
    });

    this.crearBotonToggle(
      itemsFoco.length,
      btnEnX,
      fila1Y,
      154,
      56,
      t('ajustes.idiomaEn'),
      enActivo,
      textoGrande,
      () => {
        updateAjustes({ idioma: 'en' });
        recargar(this.tutorialReiniciado);
      },
    );
    itemsFoco.push({
      x: btnEnX,
      y: fila1Y,
      ancho: 154,
      alto: 56,
      activar: () => {
        updateAjustes({ idioma: 'en' });
        recargar(this.tutorialReiniciado);
      },
    });

    // Fila 2: Texto grande (x1.25)
    const fila2Y = top + 230;
    this.dibujarFilaBase(left + 26, fila2Y - 40, panelW - 52, 80);
    this.add
      .text(labelX, fila2Y - 14, t('ajustes.textoGrandeEtiqueta'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(descX, fila2Y + 18, t('ajustes.textoGrandeDesc'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0, 0.5);

    const toggleTextoX = left + panelW - 142;
    const alternarTextoGrande = (): void => {
      updateAjustes({ textoGrande: !getAjustes().textoGrande });
      recargar(this.tutorialReiniciado);
    };
    this.crearBotonEstado(
      itemsFoco.length,
      toggleTextoX,
      fila2Y,
      194,
      56,
      ajustes.textoGrande,
      textoGrande,
      alternarTextoGrande,
    );
    itemsFoco.push({
      x: toggleTextoX,
      y: fila2Y,
      ancho: 194,
      alto: 56,
      activar: alternarTextoGrande,
    });

    // Fila 3: Movimiento reducido
    const fila3Y = top + 322;
    this.dibujarFilaBase(left + 26, fila3Y - 40, panelW - 52, 80);
    this.add
      .text(labelX, fila3Y - 14, t('ajustes.movimientoReducidoEtiqueta'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(descX, fila3Y + 18, t('ajustes.movimientoReducidoDesc'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0, 0.5);

    const toggleMovX = left + panelW - 142;
    const alternarMovimiento = (): void => {
      updateAjustes({ movimientoReducido: !getAjustes().movimientoReducido });
      recargar(this.tutorialReiniciado);
    };
    this.crearBotonEstado(
      itemsFoco.length,
      toggleMovX,
      fila3Y,
      194,
      56,
      ajustes.movimientoReducido,
      textoGrande,
      alternarMovimiento,
    );
    itemsFoco.push({
      x: toggleMovX,
      y: fila3Y,
      ancho: 194,
      alto: 56,
      activar: alternarMovimiento,
    });

    // Fila 4: Sonido y Volumen
    const fila4Y = top + 416;
    this.dibujarFilaBase(left + 26, fila4Y - 42, panelW - 52, 84);
    const iconoSonidoG = this.add.graphics();
    dibujarIconoSonido(
      iconoSonidoG,
      labelX + 12,
      fila4Y - 14,
      22,
      ajustes.sonido ? COLORES.aire : COLORES.textoSecundario,
      ajustes.sonido,
    );
    this.add
      .text(labelX + 34, fila4Y - 14, t('sonido.etiqueta'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);
    this.add
      .text(
        descX,
        fila4Y + 18,
        t('sonido.volumen', { valor: Math.round(ajustes.volumen * 100) }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.textoSecundario,
        },
      )
      .setOrigin(0, 0.5);

    const btnVolMenosX = left + panelW - 350;
    const btnVolMasX = left + panelW - 252;
    const toggleSonidoX = left + panelW - 118;

    const cambiarVolumen = (delta: number): void => {
      audioEngine.registrarGestoUsuario();
      const actual = getAjustes();
      const siguienteVol = Math.max(
        0,
        Math.min(1, Math.round((actual.volumen + delta) * 4) / 4),
      );
      updateAjustes({
        volumen: siguienteVol,
        sonido: siguienteVol > 0 ? actual.sonido : false,
      });
      if (siguienteVol > 0 && actual.sonido) {
        audioEngine.reproducir('clic');
      }
      recargar(this.tutorialReiniciado);
    };

    this.crearBotonSimple(
      itemsFoco.length,
      btnVolMenosX,
      fila4Y,
      86,
      56,
      t('sonido.bajarVolumen'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      textoGrande,
      () => cambiarVolumen(-0.25),
    );
    itemsFoco.push({
      x: btnVolMenosX,
      y: fila4Y,
      ancho: 86,
      alto: 56,
      activar: () => cambiarVolumen(-0.25),
    });

    this.crearBotonSimple(
      itemsFoco.length,
      btnVolMasX,
      fila4Y,
      86,
      56,
      t('sonido.subirVolumen'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      textoGrande,
      () => cambiarVolumen(0.25),
    );
    itemsFoco.push({
      x: btnVolMasX,
      y: fila4Y,
      ancho: 86,
      alto: 56,
      activar: () => cambiarVolumen(0.25),
    });

    const alternarSonido = (): void => {
      audioEngine.registrarGestoUsuario();
      const actual = getAjustes();
      const nuevoActivo = !actual.sonido;
      const volumenNuevo =
        nuevoActivo && actual.volumen <= 0 ? 0.5 : actual.volumen;
      updateAjustes({ sonido: nuevoActivo, volumen: volumenNuevo });
      if (nuevoActivo) {
        audioEngine.reproducir('clic');
      }
      recargar(this.tutorialReiniciado);
    };
    this.crearBotonEstado(
      itemsFoco.length,
      toggleSonidoX,
      fila4Y,
      146,
      56,
      ajustes.sonido,
      textoGrande,
      alternarSonido,
    );
    itemsFoco.push({
      x: toggleSonidoX,
      y: fila4Y,
      ancho: 146,
      alto: 56,
      activar: alternarSonido,
    });

    // Fila 5: Ver el tutorial otra vez
    const fila5Y = top + 516;
    const btnTutW = 360;
    const btnTutH = 56;
    const accionReiniciarTut = (): void => {
      updateAjustes({ tutorialVisto: false });
      recargar(true);
    };
    this.crearBotonSimple(
      itemsFoco.length,
      cx,
      fila5Y,
      btnTutW,
      btnTutH,
      t('ajustes.reiniciarTutorial'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      textoGrande,
      accionReiniciarTut,
    );
    itemsFoco.push({
      x: cx,
      y: fila5Y,
      ancho: btnTutW,
      alto: btnTutH,
      activar: accionReiniciarTut,
    });

    if (this.tutorialReiniciado) {
      this.add
        .text(cx, fila5Y + 42, t('ajustes.tutorialReiniciado'), {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${TAMANOS_TEXTO.minimo}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.ok,
        })
        .setOrigin(0.5);
    }

    // Pie: Restablecer + Volver
    const pieY = top + panelH - 50;
    const btnResetX = cx - 170;
    const btnVolverX = cx + 170;

    const accionReset = (): void => {
      resetAjustes();
      recargar(false);
    };
    this.crearBotonSimple(
      itemsFoco.length,
      btnResetX,
      pieY,
      270,
      58,
      t('ajustes.restablecer'),
      COLORES.botonFondo,
      COLORES_HEX.textoSecundario,
      textoGrande,
      accionReset,
    );
    itemsFoco.push({
      x: btnResetX,
      y: pieY,
      ancho: 270,
      alto: 58,
      activar: accionReset,
    });

    this.crearBotonSimple(
      itemsFoco.length,
      btnVolverX,
      pieY,
      270,
      58,
      t('comun.volver'),
      COLORES.aire,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      volver,
    );
    itemsFoco.push({
      x: btnVolverX,
      y: pieY,
      ancho: 270,
      alto: 58,
      activar: volver,
    });

    this.gestorFoco = crearGestorFoco(this, {
      items: itemsFoco,
      grosorBorde: 4,
      onCancelar: volver,
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  private dibujarFilaBase(x: number, y: number, w: number, h: number): void {
    const g = this.add.graphics();
    g.fillStyle(COLORES.pistaBarra, 0.85);
    g.fillRoundedRect(x, y, w, h, ESPACIADO.radioBoton);
    g.lineStyle(1.5, COLORES.bordePanel, 1);
    g.strokeRoundedRect(x, y, w, h, ESPACIADO.radioBoton);
  }

  private crearBotonToggle(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    activo: boolean,
    textoGrande: boolean,
    alPulsar: () => void,
  ): void {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(
        activo ? COLORES.aire : hover ? COLORES.botonHover : COLORES.botonFondo,
        1,
      );
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, activo ? COLORES.energia : COLORES.bordePanel, 1);
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
        fontSize: `${escalarTamanoTexto(20, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: activo ? COLORES_HEX.botonTextoOscuro : COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(indice, false);
    });
    zona.on('pointerout', () => dibujar(false));
    zona.on('pointerdown', alPulsar);
  }

  private crearBotonEstado(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    activo: boolean,
    textoGrande: boolean,
    alPulsar: () => void,
  ): void {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(
        activo ? COLORES.ok : hover ? COLORES.botonHover : COLORES.botonFondo,
        1,
      );
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, activo ? COLORES.ok : COLORES.bordePanel, 1);
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      if (activo) {
        dibujarIconoMisionLista(fondo, -ancho / 2 + 28, 0, 20, COLORES.fondoLienzo);
      } else {
        dibujarIconoMisionActiva(fondo, -ancho / 2 + 28, 0, 18, COLORES.textoSecundario);
      }
    };
    dibujar(false);

    const etiqueta = activo ? t('comun.activado') : t('comun.desactivado');
    const texto = this.add
      .text(12, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(20, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color: activo ? COLORES_HEX.botonTextoOscuro : COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(indice, false);
    });
    zona.on('pointerout', () => dibujar(false));
    zona.on('pointerdown', alPulsar);
  }

  private crearBotonSimple(
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
        fontSize: `${escalarTamanoTexto(20, textoGrande, 24)}px`,
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
    zona.on('pointerdown', () => {
      audioEngine.reproducir('clic');
      alPulsar();
    });
  }

  private limpiar(): void {
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
  }
}
