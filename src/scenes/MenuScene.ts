// Escena de menú principal: semanas, demo 4 min, glosario, fuentes, ajustes y última consulta

import Phaser from 'phaser';
import { audioEngine } from '../audio/audio';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  obtenerEtiquetaSelloEvento,
  obtenerEventoMasRecienteSemana,
} from '../data/eventosLoader';
import { obtenerSemanaActiva } from '../game/semanas';
import { getAjustes, updateAjustes, type Idioma } from '../game/settings';
import { gameState } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import {
  dibujarIconoAire,
  dibujarIconoEnergia,
  dibujarIconoEscudo,
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
  dibujarIconoSonido,
} from '../ui/icons';
import { desregistrarObjetivoUI, registrarObjetivoUI } from '../ui/targets';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

export function lanzarEscenasJuego(scenePlugin: Phaser.Scenes.ScenePlugin): void {
  scenePlugin.launch(SCENE_KEYS.base);
  scenePlugin.launch(SCENE_KEYS.hud);
  scenePlugin.launch(SCENE_KEYS.minigame);
  scenePlugin.launch(SCENE_KEYS.choice);
  scenePlugin.launch(SCENE_KEYS.event);
  scenePlugin.launch(SCENE_KEYS.apagon);
  scenePlugin.launch(SCENE_KEYS.overlay);
  scenePlugin.launch(SCENE_KEYS.informe);
  scenePlugin.launch(SCENE_KEYS.tutorial);

  scenePlugin.bringToTop(SCENE_KEYS.hud);
  scenePlugin.bringToTop(SCENE_KEYS.minigame);
  scenePlugin.bringToTop(SCENE_KEYS.choice);
  scenePlugin.bringToTop(SCENE_KEYS.event);
  scenePlugin.bringToTop(SCENE_KEYS.apagon);
  scenePlugin.bringToTop(SCENE_KEYS.overlay);
  scenePlugin.bringToTop(SCENE_KEYS.informe);
  scenePlugin.bringToTop(SCENE_KEYS.tutorial);
}

export function detenerEscenasJuego(scenePlugin: Phaser.Scenes.ScenePlugin): void {
  const claves = [
    SCENE_KEYS.tutorial,
    SCENE_KEYS.informe,
    SCENE_KEYS.overlay,
    SCENE_KEYS.apagon,
    SCENE_KEYS.event,
    SCENE_KEYS.choice,
    SCENE_KEYS.minigame,
    SCENE_KEYS.hud,
    SCENE_KEYS.base,
  ];
  for (const clave of claves) {
    if (scenePlugin.isActive(clave)) {
      scenePlugin.stop(clave);
    }
  }
}

export class MenuScene extends Phaser.Scene {
  private gestorFoco: GestorFoco | null = null;

  constructor() {
    super(SCENE_KEYS.menu);
  }

  public create(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 6;
    const ancho = 760;
    const alto = 616;
    const top = cy - alto / 2;
    const ajustes = getAjustes();
    const idioma = ajustes.idioma;
    const textoGrande = ajustes.textoGrande;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.fondoLienzo, 1);
    fondo.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    fondo.fillStyle(COLORES.panelHud, 1);
    fondo.fillRoundedRect(
      cx - ancho / 2,
      top,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
    fondo.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.bordePanel, 1);
    fondo.strokeRoundedRect(
      cx - ancho / 2,
      top,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );

    dibujarIconoAire(fondo, cx - 72, top + 54, 32, COLORES.aire);
    dibujarIconoEnergia(fondo, cx, top + 54, 34, COLORES.energia);
    dibujarIconoEscudo(fondo, cx + 72, top + 54, 32, COLORES.escudo);

    this.add
      .text(cx, top + 112, t('menu.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 38)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: ancho - 48 },
      })
      .setOrigin(0.5);

    this.add
      .text(cx, top + 154, t('menu.subtitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 48 },
      })
      .setOrigin(0.5);

    const irASemanas = (): void => {
      this.scene.stop();
      this.scene.start(SCENE_KEYS.semanas);
    };

    const iniciarDemo = (): void => {
      const semanaActiva = obtenerSemanaActiva();
      gameState.iniciarDemo(semanaActiva.id);
      lanzarEscenasJuego(this.scene);
      this.scene.stop();
    };

    const abrirSubescena = (clave: string): void => {
      this.scene.stop();
      this.scene.start(clave, { volverA: 'menu' });
    };

    const itemsFoco: ItemFoco[] = [];

    // 1. Jugar la semana (>= 64px)
    const yJugar = top + 224;
    this.crearBotonMenu(
      itemsFoco.length,
      cx,
      yJugar,
      420,
      68,
      t('menu.jugarSemana'),
      COLORES.ok,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      irASemanas,
    );
    registrarObjetivoUI('menu-jugar', {
      x: cx - 210,
      y: yJugar - 34,
      ancho: 420,
      alto: 68,
    });
    itemsFoco.push({
      x: cx,
      y: yJugar,
      ancho: 420,
      alto: 68,
      activar: irASemanas,
    });

    // 2. Demo de 4 minutos (>= 64px)
    const yDemo = top + 306;
    this.crearBotonMenu(
      itemsFoco.length,
      cx,
      yDemo,
      420,
      64,
      t('menu.demo4Min'),
      COLORES.aire,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      iniciarDemo,
    );
    registrarObjetivoUI('menu-demo', {
      x: cx - 210,
      y: yDemo - 32,
      ancho: 420,
      alto: 64,
    });
    itemsFoco.push({
      x: cx,
      y: yDemo,
      ancho: 420,
      alto: 64,
      activar: iniciarDemo,
    });

    // 3, 4, 5, 6. Glosario, Fuentes, Ajustes, Créditos (>= 62px)
    const ySecundarios = top + 390;
    const secW = 158;
    const secH = 62;
    const secGap = 16;
    const secBotones: Array<{ etiqueta: string; clave: string }> = [
      { etiqueta: t('menu.glosario'), clave: SCENE_KEYS.glosario },
      { etiqueta: t('menu.fuentes'), clave: SCENE_KEYS.fuentes },
      { etiqueta: t('menu.ajustes'), clave: SCENE_KEYS.ajustes },
      { etiqueta: t('menu.creditos'), clave: SCENE_KEYS.creditos },
    ];
    const totalSecW =
      secBotones.length * secW + (secBotones.length - 1) * secGap;

    secBotones.forEach((btn, idx) => {
      const bx = cx - totalSecW / 2 + secW / 2 + idx * (secW + secGap);
      const activar = (): void => abrirSubescena(btn.clave);
      this.crearBotonMenu(
        itemsFoco.length,
        bx,
        ySecundarios,
        secW,
        secH,
        btn.etiqueta,
        COLORES.botonFondo,
        COLORES_HEX.textoPrincipal,
        textoGrande,
        activar,
      );
      itemsFoco.push({
        x: bx,
        y: ySecundarios,
        ancho: secW,
        alto: secH,
        activar,
      });
    });

    // Tarjeta "Clima espacial: última consulta"
    this.dibujarTarjetaUltimaConsulta(cx, top + 516, 680, 128, idioma, textoGrande);

    // Botón rápido de sonido en esquina superior izquierda (>= 56px)
    const soundX = 114;
    const soundY = 48;
    const soundW = 188;
    const soundH = 56;
    const alternarSonido = (): void => {
      audioEngine.registrarGestoUsuario();
      const nuevo = updateAjustes({ sonido: !getAjustes().sonido });
      if (nuevo.sonido) {
        audioEngine.reproducir('clic');
      }
      this.scene.restart();
    };
    this.crearBotonSonidoMenu(
      itemsFoco.length,
      soundX,
      soundY,
      soundW,
      soundH,
      ajustes.sonido,
      textoGrande,
      alternarSonido,
    );
    itemsFoco.push({
      x: soundX,
      y: soundY,
      ancho: soundW,
      alto: soundH,
      activar: alternarSonido,
    });

    // Selector rápido de idioma ES / EN en esquina superior derecha (>= 56px)
    const yLang = 48;
    const btnEsX = GAME_WIDTH - 144;
    const btnEnX = GAME_WIDTH - 58;
    const cambiarIdioma = (nuevo: Idioma): void => {
      audioEngine.reproducir('clic');
      if (getAjustes().idioma === nuevo) {
        return;
      }
      updateAjustes({ idioma: nuevo });
      this.scene.restart();
    };

    this.crearBotonIdioma(
      itemsFoco.length,
      btnEsX,
      yLang,
      76,
      56,
      'ES',
      idioma === 'es',
      () => cambiarIdioma('es'),
    );
    itemsFoco.push({
      x: btnEsX,
      y: yLang,
      ancho: 76,
      alto: 56,
      activar: () => cambiarIdioma('es'),
    });

    this.crearBotonIdioma(
      itemsFoco.length,
      btnEnX,
      yLang,
      76,
      56,
      'EN',
      idioma === 'en',
      () => cambiarIdioma('en'),
    );
    itemsFoco.push({
      x: btnEnX,
      y: yLang,
      ancho: 76,
      alto: 56,
      activar: () => cambiarIdioma('en'),
    });

    this.gestorFoco = crearGestorFoco(this, {
      items: itemsFoco,
      grosorBorde: 4,
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  private dibujarTarjetaUltimaConsulta(
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    idioma: Idioma,
    textoGrande: boolean,
  ): void {
    const semanaActiva = obtenerSemanaActiva();
    const evento = obtenerEventoMasRecienteSemana(semanaActiva.id);
    const verificado = !evento.esEjemplo;

    const g = this.add.graphics();
    g.fillStyle(COLORES.pistaBarra, 1);
    g.fillRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioBoton,
    );
    g.lineStyle(2, verificado ? COLORES.ok : COLORES.bordePanel, 1);
    g.strokeRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioBoton,
    );

    if (verificado) {
      dibujarIconoMisionLista(g, cx - ancho / 2 + 34, cy - 28, 22, COLORES.ok);
    } else {
      dibujarIconoMisionActiva(
        g,
        cx - ancho / 2 + 34,
        cy - 28,
        22,
        COLORES.energia,
      );
    }

    this.add
      .text(cx - ancho / 2 + 56, cy - 28, t('menu.ultimaConsultaTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(19, textoGrande, 22)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0.5);

    this.add
      .text(
        cx,
        cy + 4,
        t('menu.semanaActualEtiqueta', { nombre: semanaActiva.nombre[idioma] }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.aire,
          align: 'center',
          wordWrap: { width: ancho - 48 },
        },
      )
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 36, obtenerEtiquetaSelloEvento(evento, idioma), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: verificado ? COLORES_HEX.ok : COLORES_HEX.energia,
        align: 'center',
        wordWrap: { width: ancho - 48 },
      })
      .setOrigin(0.5);
  }

  private crearBotonMenu(
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
    zona.on('pointerdown', () => {
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(0.98);
      }
      audioEngine.reproducir('clic');
      alPulsar();
    });
  }

  private crearBotonSonidoMenu(
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
        hover ? COLORES.botonHover : COLORES.botonFondo,
        1,
      );
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, activo ? COLORES.aire : COLORES.aviso, 1);
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      dibujarIconoSonido(
        fondo,
        -ancho / 2 + 26,
        0,
        24,
        activo ? COLORES.aire : COLORES.textoSecundario,
        activo,
      );
    };
    dibujar(false);

    const etiqueta = activo ? t('sonido.on') : t('sonido.off');
    const texto = this.add
      .text(14, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(19, textoGrande, 22)}px`,
        fontStyle: 'bold',
        color: activo ? COLORES_HEX.textoPrincipal : COLORES_HEX.aviso,
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

  private crearBotonIdioma(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    activo: boolean,
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
        fontSize: `${TAMANOS_TEXTO.subtitulo}px`,
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

  private limpiar(): void {
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    desregistrarObjetivoUI('menu-jugar');
    desregistrarObjetivoUI('menu-demo');
  }
}
