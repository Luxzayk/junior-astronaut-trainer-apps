// Escena de superposiciones: pausa (con Ajustes/Glosario/Fuentes), fin de jornada (con chips de glosario), fin de demo y evacuación

import Phaser from 'phaser';
import { audioEngine } from '../audio/audio';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import { MAX_JORNADAS } from '../game/balance';
import {
  IDS_GLOSARIO_CIERRE,
  type IdTerminoGlosario,
} from '../game/glosario';
import {
  getAjustes,
  suscribirAjustes,
  updateAjustes,
  type Idioma,
} from '../game/settings';
import { gameState, type GameState } from '../game/state';
import { tutorialManager } from '../game/tutorial';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import {
  crearModalGlosario,
  type ControlModalGlosario,
} from '../ui/glosarioModal';
import {
  dibujarIconoAire,
  dibujarIconoEnergia,
  dibujarIconoEscudo,
  dibujarIconoLobby,
  dibujarIconoSonido,
} from '../ui/icons';
import {
  crearWidgetMascota,
  estadoMascota,
} from '../art/mascota';
import {
  crearSecuenciaCierre,
  type ControlSecuenciaCierre,
} from '../fx/cierres';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';
import { debeMostrarInformeFinal } from './InformeScene';

export class OverlayScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private panel: Phaser.GameObjects.Graphics | null = null;
  private contenido: Phaser.GameObjects.Container | null = null;
  private gestorFoco: GestorFoco | null = null;
  private modalGlosario: ControlModalGlosario | null = null;
  private secuenciaCierre: ControlSecuenciaCierre | null = null;
  private cierreMostradoParaClave = '';
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.overlay);
  }

  public create(): void {
    this.desuscripciones = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const fondoAtenuado = this.add
      .rectangle(
        cx,
        cy,
        GAME_WIDTH,
        GAME_HEIGHT,
        COLORES.fondoLienzo,
        OVERLAY_METRICAS.fondoAlpha,
      )
      .setInteractive();

    this.panel = this.add.graphics();
    this.dibujarPanel(
      OVERLAY_METRICAS.panelAncho,
      OVERLAY_METRICAS.panelAlto,
      COLORES.bordePanel,
    );

    this.contenido = this.add.container(0, 0);
    this.raiz = this.add.container(0, 0, [
      fondoAtenuado,
      this.panel,
      this.contenido,
    ]);
    this.raiz.setVisible(false);

    this.modalGlosario = crearModalGlosario(this, {
      padre: this.raiz,
    });

    this.gestorFoco = crearGestorFoco(this, {
      items: [],
      padre: this.raiz,
      habilitado: () =>
        Boolean(this.raiz?.visible) &&
        !this.modalGlosario?.estaAbierto() &&
        !this.esSubescenaPausaActiva() &&
        !tutorialManager.estaPausandoReloj(),
      onCancelar: () => {
        if (gameState.getSnapshot().estado === 'pausa') {
          gameState.setPausa(false);
        }
      },
    });

    this.suscribirEventos();
    this.sincronizarConEstado(gameState.getSnapshot());

    this.events.once('shutdown', this.limpiar, this);
  }

  private esSubescenaPausaActiva(): boolean {
    return (
      this.scene.isActive(SCENE_KEYS.ajustes) ||
      this.scene.isActive(SCENE_KEYS.glosario) ||
      this.scene.isActive(SCENE_KEYS.fuentes) ||
      this.scene.isActive(SCENE_KEYS.creditos)
    );
  }

  private abrirSubescenaPausa(clave: string): void {
    if (this.scene.isActive(clave)) {
      this.scene.bringToTop(clave);
      return;
    }
    this.scene.launch(clave, { volverA: 'pausa' });
    this.scene.bringToTop(clave);
  }

  private dibujarPanel(
    ancho: number,
    alto: number,
    colorBorde: number,
  ): void {
    if (!this.panel) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.panel.clear();
    this.panel.fillStyle(COLORES.panelHud, 1);
    this.panel.fillRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
    this.panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, colorBorde, 1);
    this.panel.strokeRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
  }

  private suscribirEventos(): void {
    const actualizar = (): void => {
      this.sincronizarConEstado(gameState.getSnapshot());
    };

    this.desuscripciones.push(gameState.on('pausa', actualizar));
    this.desuscripciones.push(gameState.on('jornada:fin', actualizar));
    this.desuscripciones.push(gameState.on('evacuacion', actualizar));
    this.desuscripciones.push(gameState.on('jornada:nueva', actualizar));
    this.desuscripciones.push(gameState.on('estado:cambio', actualizar));
    this.desuscripciones.push(
      suscribirAjustes(() => {
        if (this.raiz?.visible) {
          this.sincronizarConEstado(gameState.getSnapshot());
        }
      }),
    );
  }

  private sincronizarConEstado(snap: Readonly<GameState>): void {
    if (!this.raiz || !this.contenido) {
      return;
    }

    if (
      snap.estado === 'jugando' ||
      snap.estado === 'minijuego' ||
      snap.estado === 'eleccion' ||
      snap.estado === 'evento' ||
      snap.estado === 'apagon' ||
      debeMostrarInformeFinal(snap)
    ) {
      this.secuenciaCierre?.destroy();
      this.secuenciaCierre = null;
      this.cierreMostradoParaClave = '';
      this.modalGlosario?.cerrar();
      this.raiz.setVisible(false);
      this.contenido.removeAll(true);
      this.gestorFoco?.actualizarItems([]);
      return;
    }

    if (snap.estado === 'pausa') {
      this.secuenciaCierre?.destroy();
      this.secuenciaCierre = null;
      this.raiz.setVisible(true);
      this.contenido.removeAll(true);
      this.dibujarPanel(
        OVERLAY_METRICAS.panelAncho,
        512,
        COLORES.bordePanel,
      );
      this.construirVistaPausa();
      return;
    }

    // Secuencia animada (~4s, saltable) antes de mostrar tarjeta de cierre o evacuación
    const claveCierre = `${snap.modo}:${snap.estado}:${snap.jornada}`;
    const puedeAnimar =
      (snap.estado === 'finJornada' || snap.estado === 'evacuacion') &&
      !tutorialManager.estaPausandoReloj() &&
      this.cierreMostradoParaClave !== claveCierre;

    if (puedeAnimar) {
      this.cierreMostradoParaClave = claveCierre;
      this.raiz.setVisible(false);
      this.contenido.removeAll(true);
      this.gestorFoco?.actualizarItems([]);
      this.secuenciaCierre?.destroy();

      const tipoAnim =
        snap.estado === 'evacuacion'
          ? 'evacuacion'
          : snap.ultimoCierre?.tipo === 'completa'
            ? 'completa'
            : 'incompleta';

      this.secuenciaCierre = crearSecuenciaCierre(this, {
        tipo: tipoAnim,
        jornada: snap.jornada,
        moduloDanado: snap.moduloDanado,
        alTerminar: () => {
          this.secuenciaCierre = null;
          this.mostrarTarjetaCierre(gameState.getSnapshot());
        },
      });
      return;
    }

    if (this.secuenciaCierre) {
      return;
    }

    this.mostrarTarjetaCierre(snap);
  }

  private mostrarTarjetaCierre(snap: Readonly<GameState>): void {
    if (!this.raiz || !this.contenido) {
      return;
    }
    if (
      snap.estado !== 'finJornada' &&
      snap.estado !== 'evacuacion'
    ) {
      return;
    }
    if (debeMostrarInformeFinal(snap)) {
      return;
    }

    this.raiz.setVisible(true);
    this.contenido.removeAll(true);

    if (snap.modo === 'demo') {
      this.dibujarPanel(
        OVERLAY_METRICAS.finPanelAncho,
        420,
        snap.estado === 'evacuacion' ? COLORES.peligro : COLORES.aire,
      );
      this.construirVistaFinDemo(snap);
      return;
    }

    if (snap.estado === 'finJornada') {
      const esCompleta = snap.ultimoCierre?.tipo === 'completa';
      const tieneLineaAgua =
        Boolean(snap.ultimoCierre?.aguaBajaAplicada) ||
        Boolean(snap.ultimoCierre?.aguaBajaProxima);
      this.dibujarPanel(
        OVERLAY_METRICAS.finPanelAncho,
        tieneLineaAgua ? 544 : 512,
        esCompleta ? COLORES.ok : COLORES.aviso,
      );
      this.construirVistaFinJornada(snap);
    } else if (snap.estado === 'evacuacion') {
      this.dibujarPanel(
        OVERLAY_METRICAS.panelAncho,
        OVERLAY_METRICAS.panelAlto,
        COLORES.peligro,
      );
      this.construirVistaEvacuacion(snap);
    }
  }

  private construirVistaPausa(): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panelAlto = 512;
    const top = cy - panelAlto / 2;
    const ajustes = getAjustes();
    const textoGrande = ajustes.textoGrande;

    const titulo = this.add
      .text(cx, top + 46, t('overlays.pausaTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 38)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    const continuar = (): void => gameState.setPausa(false);
    const reiniciar = (): void => gameState.reiniciarJornadaActual();
    const alternarSonido = (): void => {
      audioEngine.registrarGestoUsuario();
      const nuevo = updateAjustes({ sonido: !getAjustes().sonido });
      if (nuevo.sonido) {
        audioEngine.reproducir('clic');
      }
    };
    const abrirAjustes = (): void => this.abrirSubescenaPausa(SCENE_KEYS.ajustes);
    const abrirGlosario = (): void =>
      this.abrirSubescenaPausa(SCENE_KEYS.glosario);
    const abrirFuentes = (): void => this.abrirSubescenaPausa(SCENE_KEYS.fuentes);
    const abrirCreditos = (): void =>
      this.abrirSubescenaPausa(SCENE_KEYS.creditos);

    const btnContinuar = this.crearBoton(
      0,
      cx,
      top + 114,
      360,
      60,
      t('overlays.continuar'),
      COLORES.aire,
      COLORES_HEX.botonTextoOscuro,
      continuar,
    );

    const btnReiniciar = this.crearBoton(
      1,
      cx,
      top + 186,
      360,
      58,
      t('overlays.reiniciarJornada'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      reiniciar,
    );

    const btnSonido = this.crearBotonSonidoPausa(
      2,
      cx,
      top + 258,
      360,
      56,
      ajustes.sonido,
      textoGrande,
      alternarSonido,
    );

    const subW = 248;
    const subH = 56;
    const subGapX = 18;
    const subRow1Y = top + 346;
    const subRow2Y = top + 418;
    const subBotones: Array<{ etiqueta: string; accion: () => void }> = [
      { etiqueta: t('overlays.abrirAjustes'), accion: abrirAjustes },
      { etiqueta: t('overlays.abrirGlosario'), accion: abrirGlosario },
      { etiqueta: t('overlays.abrirFuentes'), accion: abrirFuentes },
      { etiqueta: t('overlays.abrirCreditos'), accion: abrirCreditos },
    ];

    const itemsFoco: ItemFoco[] = [
      {
        x: cx,
        y: top + 114,
        ancho: 360,
        alto: 60,
        activar: continuar,
      },
      {
        x: cx,
        y: top + 186,
        ancho: 360,
        alto: 58,
        activar: reiniciar,
      },
      {
        x: cx,
        y: top + 258,
        ancho: 360,
        alto: 56,
        activar: alternarSonido,
      },
    ];

    this.contenido.add([titulo, btnContinuar, btnReiniciar, btnSonido]);

    subBotones.forEach((btn, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const bx = cx + (col === 0 ? -1 : 1) * (subW / 2 + subGapX / 2);
      const by = row === 0 ? subRow1Y : subRow2Y;
      const nodo = this.crearBoton(
        itemsFoco.length,
        bx,
        by,
        subW,
        subH,
        btn.etiqueta,
        COLORES.pistaBarra,
        COLORES_HEX.aire,
        btn.accion,
      );
      this.contenido?.add(nodo);
      itemsFoco.push({
        x: bx,
        y: by,
        ancho: subW,
        alto: subH,
        activar: btn.accion,
      });
    });

    this.gestorFoco?.actualizarItems(itemsFoco);
  }

  private crearBotonSonidoPausa(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    activo: boolean,
    textoGrande: boolean,
    alPulsar: () => void,
  ): Phaser.GameObjects.Container {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(hover ? COLORES.botonHover : COLORES.botonFondo, 1);
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
        -ancho / 2 + 32,
        0,
        24,
        activo ? COLORES.aire : COLORES.textoSecundario,
        activo,
      );
    };
    dibujar(false);

    const texto = this.add
      .text(12, 0, activo ? t('sonido.on') : t('sonido.off'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color: activo ? COLORES_HEX.textoPrincipal : COLORES_HEX.aviso,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(cx, cy, [fondo, texto, zona]);
    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(indice, false);
    });
    zona.on('pointerout', () => dibujar(false));
    zona.on('pointerdown', alPulsar);
    return contenedor;
  }

  private construirVistaFinDemo(snap: Readonly<GameState>): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const top = cy - 210;
    const textoGrande = getAjustes().textoGrande;

    const titulo = this.add
      .text(cx, top + 52, t('overlays.finDemoTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36)}px`,
        fontStyle: 'bold',
        color: snap.estado === 'evacuacion' ? COLORES_HEX.peligro : COLORES_HEX.aire,
      })
      .setOrigin(0.5);

    const subtitulo = this.add
      .text(
        cx,
        top + 100,
        snap.estado === 'evacuacion'
          ? t('overlays.evacuacionTitulo')
          : t('overlays.finDemoSubtitulo'),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.textoSecundario,
          align: 'center',
          wordWrap: { width: OVERLAY_METRICAS.finPanelAncho - 64 },
        },
      )
      .setOrigin(0.5);

    const misionesHechas = snap.ultimoCierre?.misionesHechasCount ?? 0;
    const misionesTotal = snap.ultimoCierre?.misionesTotal ?? 2;
    const textoMisiones = this.add
      .text(
        cx,
        top + 148,
        t('overlays.misionesResumen', {
          hechas: misionesHechas,
          total: misionesTotal,
        }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        },
      )
      .setOrigin(0.5);

    const resumenIconos = this.crearResumenRecursos(cx, top + 206, snap);

    const jugarSemana = (): void => gameState.iniciarSemana();
    const repetirDemo = (): void => gameState.iniciarDemo();

    const btnSemana = this.crearBoton(
      0,
      cx,
      top + 286,
      360,
      62,
      t('overlays.jugarSemanaCompleta'),
      COLORES.ok,
      COLORES_HEX.botonTextoOscuro,
      jugarSemana,
    );

    const btnRepetir = this.crearBoton(
      1,
      cx,
      top + 362,
      360,
      58,
      t('overlays.repetirDemo'),
      COLORES.aire,
      COLORES_HEX.botonTextoOscuro,
      repetirDemo,
    );

    const luniDemo = crearWidgetMascota(this, {
      x: cx - 296,
      y: top + 56,
      escala: 0.78,
      estadoInicial:
        snap.estado === 'evacuacion'
          ? 'asustada'
          : estadoMascota(snap.aire, snap.escudo),
      mostrarFrase: false,
    });

    this.contenido.add([
      luniDemo.container,
      titulo,
      subtitulo,
      textoMisiones,
      resumenIconos,
      btnSemana,
      btnRepetir,
    ]);
    this.gestorFoco?.actualizarItems([
      { x: cx, y: top + 286, ancho: 360, alto: 62, activar: jugarSemana },
      { x: cx, y: top + 362, ancho: 360, alto: 58, activar: repetirDemo },
    ]);
  }

  private construirVistaFinJornada(snap: Readonly<GameState>): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const cierre = snap.ultimoCierre;
    const tieneLineaAgua =
      Boolean(cierre?.aguaBajaAplicada) || Boolean(cierre?.aguaBajaProxima);
    const panelAlto = tieneLineaAgua ? 544 : 512;
    const top = cy - panelAlto / 2;
    const esUltima = snap.jornada >= MAX_JORNADAS;
    const tipo = cierre?.tipo ?? 'completa';
    const ajustes = getAjustes();
    const idioma = ajustes.idioma;
    const textoGrande = ajustes.textoGrande;

    const textoTitulo = esUltima
      ? t('overlays.finSemanaTitulo')
      : tipo === 'completa'
        ? t('overlays.jornadaCompleta', { jornada: snap.jornada })
        : t('overlays.jornadaIncompleta', { jornada: snap.jornada });

    const colorTitulo =
      tipo === 'completa'
        ? COLORES_HEX.ok
        : tipo === 'refuerzo'
          ? COLORES_HEX.aire
          : COLORES_HEX.aviso;

    const titulo = this.add
      .text(cx, top + 50, textoTitulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(esUltima ? 28 : TAMANOS_TEXTO.titulo, textoGrande, 34)}px`,
        fontStyle: 'bold',
        color: colorTitulo,
        align: 'center',
        lineSpacing: 4,
      })
      .setOrigin(0.5);

    const misionesHechas = cierre?.misionesHechasCount ?? 0;
    const misionesTotal = cierre?.misionesTotal ?? 0;

    const textoMisiones = this.add
      .text(
        cx,
        top + 108,
        t('overlays.misionesResumen', {
          hechas: misionesHechas,
          total: misionesTotal,
        }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        },
      )
      .setOrigin(0.5);

    const gasto = cierre?.gastoJornada ?? snap.gastoJornada;
    const textoGasto = this.add
      .text(
        cx,
        top + 148,
        t('overlays.gastoResumen', {
          aire: gasto.aire,
          energia: gasto.energia,
          escudo: gasto.escudo,
        }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 22)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.textoSecundario,
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const restante = cierre?.recursosFinales ?? {
      aire: snap.aire,
      energia: snap.energia,
      escudo: snap.escudo,
    };
    const textoRestante = this.add
      .text(
        cx,
        top + 184,
        t('overlays.restanteResumen', {
          aire: restante.aire,
          energia: restante.energia,
          escudo: restante.escudo,
        }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 22)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
          align: 'center',
        },
      )
      .setOrigin(0.5);

    const resumenIconos = this.crearResumenRecursos(cx, top + 230, snap);

    const textoEfecto = this.add
      .text(cx, top + 282, cierre?.mensajeEfecto ?? t('overlays.efectoCompleta'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color:
          tipo === 'completa'
            ? COLORES_HEX.ok
            : tipo === 'refuerzo'
              ? COLORES_HEX.aire
              : COLORES_HEX.aviso,
        align: 'center',
        wordWrap: { width: OVERLAY_METRICAS.finPanelAncho - 64 },
      })
      .setOrigin(0.5);

    const luniCierre = crearWidgetMascota(this, {
      x: cx - 304,
      y: top + 58,
      escala: 0.78,
      estadoInicial:
        tipo === 'completa'
          ? 'contenta'
          : estadoMascota(restante.aire, restante.escudo),
      mostrarFrase: false,
    });

    this.contenido.add([
      luniCierre.container,
      titulo,
      textoMisiones,
      textoGasto,
      textoRestante,
      resumenIconos,
      textoEfecto,
    ]);

    if (tieneLineaAgua) {
      const textoAgua = cierre?.aguaBajaAplicada
        ? t('overlays.efectoAguaBaja')
        : t('overlays.efectoAguaBajaProxima');
      const lineaAgua = this.add
        .text(cx, top + 326, textoAgua, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.aviso,
          align: 'center',
        })
        .setOrigin(0.5);
      this.contenido.add(lineaAgua);
    }

    const textoBoton = esUltima
      ? t('overlays.jugarDeNuevo')
      : t('overlays.siguienteJornada');
    const accion = esUltima
      ? (): void => gameState.reset()
      : (): void => gameState.siguienteJornada();

    const itemsFoco: ItemFoco[] = [];
    const chipsY = tieneLineaAgua ? top + 392 : top + 360;
    const chipW = 300;
    const chipH = 56;
    const chipGap = 20;

    IDS_GLOSARIO_CIERRE.forEach((idTermino, idx) => {
      const chipX = cx + (idx === 0 ? -1 : 1) * (chipW / 2 + chipGap / 2);
      const etiqueta = this.etiquetaChipCierre(idTermino, idioma);
      const abrirTermino = (): void => {
        this.modalGlosario?.abrir(idTermino, idioma);
      };
      const chip = this.crearChipGlosario(
        itemsFoco.length,
        chipX,
        chipsY,
        chipW,
        chipH,
        etiqueta,
        abrirTermino,
      );
      this.contenido?.add(chip);
      itemsFoco.push({
        x: chipX,
        y: chipsY,
        ancho: chipW,
        alto: chipH,
        activar: abrirTermino,
      });
    });

    const btnY = top + panelAlto - 56;
    const btnAccion = this.crearBoton(
      itemsFoco.length,
      cx,
      btnY,
      OVERLAY_METRICAS.botonAnchoCompleto,
      OVERLAY_METRICAS.botonAlto,
      textoBoton,
      esUltima ? COLORES.aire : COLORES.ok,
      COLORES_HEX.botonTextoOscuro,
      accion,
    );

    this.contenido.add(btnAccion);
    itemsFoco.push({
      x: cx,
      y: btnY,
      ancho: OVERLAY_METRICAS.botonAnchoCompleto,
      alto: OVERLAY_METRICAS.botonAlto,
      activar: accion,
    });
    this.gestorFoco?.actualizarItems(itemsFoco);
  }

  private etiquetaChipCierre(
    idTermino: IdTerminoGlosario,
    idioma: Idioma,
  ): string {
    return idTermino === 'modulo_danado'
      ? t('glosario.chipModulo', undefined, idioma)
      : t('glosario.chipJornada', undefined, idioma);
  }

  private crearChipGlosario(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    alPulsar: () => void,
  ): Phaser.GameObjects.Container {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(hover ? COLORES.botonHover : COLORES.pistaBarra, 1);
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
      fondo.lineStyle(2, COLORES.aire, 0.9);
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioBoton,
      );
    };
    dibujar(false);

    dibujarIconoLobby(fondo, -ancho / 2 + 24, 0, 20, COLORES.aire);

    const textoGrande = getAjustes().textoGrande;
    const texto = this.add
      .text(12, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aire,
      })
      .setOrigin(0.5);

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
      this.gestorFoco?.sincronizarIndice(indice, false);
    });
    zona.on('pointerout', () => dibujar(false));
    zona.on('pointerdown', alPulsar);

    return contenedor;
  }

  private construirVistaEvacuacion(snap: Readonly<GameState>): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const textoGrande = getAjustes().textoGrande;

    const luniEvac = crearWidgetMascota(this, {
      x: cx - 252,
      y: cy - 92,
      escala: 0.82,
      estadoInicial: estadoMascota(snap.aire, snap.escudo),
      mostrarFrase: false,
    });

    const titulo = this.add
      .text(cx, cy - 92, t('overlays.evacuacionTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(28, textoGrande, 34)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: OVERLAY_METRICAS.panelAncho - 160 },
      })
      .setOrigin(0.5);

    const motivo = this.add
      .text(cx, cy - 22, t('overlays.evacuacionMotivo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: OVERLAY_METRICAS.panelAncho - 64 },
      })
      .setOrigin(0.5);

    const reintentar = (): void => gameState.reset();
    const btnReintentar = this.crearBoton(
      0,
      cx,
      cy + 82,
      OVERLAY_METRICAS.botonAncho,
      OVERLAY_METRICAS.botonAlto,
      t('overlays.reintentar'),
      COLORES.aviso,
      COLORES_HEX.botonTextoOscuro,
      reintentar,
    );

    this.contenido.add([luniEvac.container, titulo, motivo, btnReintentar]);
    this.gestorFoco?.actualizarItems([
      {
        x: cx,
        y: cy + 82,
        ancho: OVERLAY_METRICAS.botonAncho,
        alto: OVERLAY_METRICAS.botonAlto,
        activar: reintentar,
      },
    ]);
  }

  private crearResumenRecursos(
    cx: number,
    y: number,
    snap: Readonly<GameState>,
  ): Phaser.GameObjects.Container {
    const contenedor = this.add.container(0, 0);
    const items = [
      {
        nombre: t('recursos.aire'),
        valor: snap.aire,
        color: COLORES.aire,
        xOffset: -190,
        dibujar: dibujarIconoAire,
      },
      {
        nombre: t('recursos.energia'),
        valor: snap.energia,
        color: COLORES.energia,
        xOffset: 0,
        dibujar: dibujarIconoEnergia,
      },
      {
        nombre: t('recursos.escudo'),
        valor: snap.escudo,
        color: COLORES.escudo,
        xOffset: 190,
        dibujar: dibujarIconoEscudo,
      },
    ];

    const g = this.add.graphics();
    contenedor.add(g);

    const textoGrande = getAjustes().textoGrande;
    for (const item of items) {
      const ix = cx + item.xOffset;
      item.dibujar(g, ix - 56, y, 22, item.color);
      const etiqueta = this.add
        .text(
          ix - 38,
          y,
          t('overlays.resumenRecurso', {
            nombre: item.nombre,
            valor: item.valor,
          }),
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 22)}px`,
            fontStyle: 'bold',
            color: COLORES_HEX.textoPrincipal,
          },
        )
        .setOrigin(0, 0.5);
      contenedor.add(etiqueta);
    }

    return contenedor;
  }

  private crearBoton(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
    etiqueta: string,
    colorFondo: number,
    colorTexto: string,
    alPulsar: () => void,
  ): Phaser.GameObjects.Container {
    const textoGrande = getAjustes().textoGrande;
    const fondo = this.add.graphics();
    const dibujar = (esHover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(colorFondo, esHover ? 0.9 : 1);
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
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 24)}px`,
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

    return contenedor;
  }

  private limpiar(): void {
    this.secuenciaCierre?.destroy();
    this.secuenciaCierre = null;
    this.modalGlosario?.destroy();
    this.modalGlosario = null;
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
  }
}
