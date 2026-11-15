// Escena de Informe Final (Jornada 5 completa y versión corta en Evacuación)

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import { MAX_JORNADAS } from '../game/balance';
import {
  generarInformeFinal,
  type DatosInformeFinal,
} from '../game/informe';
import { getAjustes, suscribirAjustes } from '../game/settings';
import { gameState, type GameState } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import {
  dibujarIconoAire,
  dibujarIconoEnergia,
  dibujarIconoEscudo,
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
} from '../ui/icons';
import {
  crearWidgetMascota,
  estadoMascota,
  obtenerFraseMascota,
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
import { detenerEscenasJuego } from './MenuScene';

export function debeMostrarInformeFinal(snap: Readonly<GameState>): boolean {
  if (snap.modo !== 'semana') {
    return false;
  }
  if (snap.estado === 'evacuacion') {
    return true;
  }
  return snap.estado === 'finJornada' && snap.jornada >= MAX_JORNADAS;
}

export class InformeScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private contenido: Phaser.GameObjects.Container | null = null;
  private scrollContenedor: Phaser.GameObjects.Container | null = null;
  private barraScroll: Phaser.GameObjects.Graphics | null = null;
  private mascaraShape: Phaser.GameObjects.Graphics | null = null;
  private gestorFoco: GestorFoco | null = null;
  private fallbackTextarea: HTMLTextAreaElement | null = null;
  private modalFallback: Phaser.GameObjects.Container | null = null;
  private textoEstadoCopia: Phaser.GameObjects.Text | null = null;
  private scrollY = 0;
  private maxScroll = 0;
  private arrastrando = false;
  private ultimoPointerY = 0;
  private viewportY = 178;
  private viewportAlto = 416;
  private secuenciaCierre: ControlSecuenciaCierre | null = null;
  private cierreMostradoParaClave = '';
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.informe);
  }

  public create(): void {
    this.desuscripciones = [];
    this.scrollY = 0;
    this.maxScroll = 0;

    const fondoAtenuado = this.add
      .rectangle(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        GAME_WIDTH,
        GAME_HEIGHT,
        COLORES.fondoLienzo,
        0.92,
      )
      .setInteractive();

    this.contenido = this.add.container(0, 0);
    this.raiz = this.add.container(0, 0, [fondoAtenuado, this.contenido]);
    this.raiz.setVisible(false);

    this.gestorFoco = crearGestorFoco(this, {
      items: [],
      padre: this.raiz,
      habilitado: () => Boolean(this.raiz?.visible),
      grosorBorde: 4,
    });

    this.configurarScroll();
    this.suscribirEventos();
    this.sincronizarConEstado(gameState.getSnapshot());

    this.events.once('shutdown', this.limpiar, this);
  }

  private suscribirEventos(): void {
    const actualizar = (): void => {
      this.sincronizarConEstado(gameState.getSnapshot());
    };

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

  private limpiarContenidoDinamico(): void {
    this.cerrarModalFallback();
    this.mascaraShape?.destroy();
    this.mascaraShape = null;
    this.scrollContenedor = null;
    this.barraScroll = null;
    this.textoEstadoCopia = null;
    this.contenido?.removeAll(true);
    this.scrollY = 0;
    this.maxScroll = 0;
  }

  private sincronizarConEstado(snap: Readonly<GameState>): void {
    if (!this.raiz || !this.contenido) {
      return;
    }

    if (!debeMostrarInformeFinal(snap)) {
      this.secuenciaCierre?.destroy();
      this.secuenciaCierre = null;
      this.cierreMostradoParaClave = '';
      this.limpiarContenidoDinamico();
      this.raiz.setVisible(false);
      this.gestorFoco?.actualizarItems([]);
      return;
    }

    const claveCierre = `${snap.modo}:${snap.estado}:${snap.jornada}`;
    if (this.cierreMostradoParaClave !== claveCierre) {
      this.cierreMostradoParaClave = claveCierre;
      this.limpiarContenidoDinamico();
      this.raiz.setVisible(false);
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
          this.mostrarVistaInforme(gameState.getSnapshot());
        },
      });
      return;
    }

    if (this.secuenciaCierre) {
      return;
    }

    this.mostrarVistaInforme(snap);
  }

  private mostrarVistaInforme(snap: Readonly<GameState>): void {
    if (!this.raiz || !this.contenido || !debeMostrarInformeFinal(snap)) {
      return;
    }

    this.limpiarContenidoDinamico();
    this.raiz.setVisible(true);

    const informe = generarInformeFinal(snap);
    if (informe.modo === 'evacuacion') {
      this.construirVistaEvacuacion(snap, informe);
    } else {
      this.construirVistaCompleta(snap, informe);
    }
  }

  private construirVistaEvacuacion(
    snap: Readonly<GameState>,
    informe: DatosInformeFinal,
  ): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const textoGrande = getAjustes().textoGrande;
    const panelW = 760;
    const panelH = 440;
    const left = cx - panelW / 2;
    const top = cy - panelH / 2;

    const panel = this.add.graphics();
    panel.fillStyle(COLORES.panelHud, 1);
    panel.fillRoundedRect(left, top, panelW, panelH, ESPACIADO.radioPanel);
    panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.peligro, 1);
    panel.strokeRoundedRect(left, top, panelW, panelH, ESPACIADO.radioPanel);

    const luniEvac = crearWidgetMascota(this, {
      x: left + 76,
      y: top + 64,
      escala: 0.9,
      estadoInicial: estadoMascota(snap.aire, snap.escudo),
      mostrarFrase: false,
    });

    const gIcono = this.add.graphics();
    dibujarIconoAire(gIcono, cx, top + 52, 34, COLORES.peligro);

    const titulo = this.add
      .text(cx, top + 104, t('informe.tituloEvacuacion'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.peligro,
        align: 'center',
        wordWrap: { width: panelW - 180 },
      })
      .setOrigin(0.5);

    const subtitulo = this.add
      .text(
        cx,
        top + 150,
        `${t('informe.subtituloEvacuacion', { jornada: informe.jornadaActual })} · ${obtenerFraseMascota('asustada', 'informeEvacuacion')}`,
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 21)}px`,
          fontStyle: 'normal',
          color: COLORES_HEX.textoSecundario,
          align: 'center',
          wordWrap: { width: panelW - 56 },
        },
      )
      .setOrigin(0.5);

    // Caja causa principal
    const boxW = panelW - 72;
    const boxH = 112;
    const boxY = top + 242;
    panel.fillStyle(COLORES.pistaBarra, 1);
    panel.fillRoundedRect(cx - boxW / 2, boxY - boxH / 2, boxW, boxH, ESPACIADO.radioBoton);
    panel.lineStyle(2, COLORES.aviso, 1);
    panel.strokeRoundedRect(cx - boxW / 2, boxY - boxH / 2, boxW, boxH, ESPACIADO.radioBoton);

    const txtCausaTitulo = this.add
      .text(cx, boxY - 26, t('informe.causaPrincipalTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(20, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aviso,
        align: 'center',
      })
      .setOrigin(0.5);

    const textoCausa = informe.causaEvacuacion
      ? informe.causaEvacuacion.linea
      : t('informe.causaSinRegistro');

    const txtCausaDetalle = this.add
      .text(cx, boxY + 18, textoCausa, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 22)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: boxW - 36 },
      })
      .setOrigin(0.5);

    const reintentar = (): void => {
      gameState.reset();
    };
    const irMenu = (): void => {
      detenerEscenasJuego(this.scene);
      this.scene.start(SCENE_KEYS.menu);
    };

    const btnY = top + panelH - 58;
    const btnReintentar = this.crearBoton(
      0,
      cx - 146,
      btnY,
      260,
      60,
      t('informe.reintentar'),
      COLORES.aviso,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      reintentar,
    );
    const btnMenu = this.crearBoton(
      1,
      cx + 146,
      btnY,
      220,
      60,
      t('informe.menuPrincipal'),
      COLORES.botonFondo,
      COLORES_HEX.textoPrincipal,
      textoGrande,
      irMenu,
    );

    this.contenido.add([
      panel,
      luniEvac.container,
      gIcono,
      titulo,
      subtitulo,
      txtCausaTitulo,
      txtCausaDetalle,
      btnReintentar,
      btnMenu,
    ]);

    this.gestorFoco?.actualizarItems([
      {
        x: cx - 146,
        y: btnY,
        ancho: 260,
        alto: 60,
        activar: reintentar,
      },
      {
        x: cx + 146,
        y: btnY,
        ancho: 220,
        alto: 60,
        activar: irMenu,
      },
    ]);
  }

  private construirVistaCompleta(
    snap: Readonly<GameState>,
    informe: DatosInformeFinal,
  ): void {
    if (!this.contenido) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const ajustes = getAjustes();
    const textoGrande = ajustes.textoGrande;
    const idioma = ajustes.idioma;

    // Cabecera fija: Título + Rango obtenido
    const titulo = this.add
      .text(cx, 38, t('informe.tituloCompleto'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 34)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    const gHeader = this.add.graphics();
    const rangoW = 860;
    const rangoH = 84;
    const rangoTop = 64;
    gHeader.fillStyle(COLORES.panelHud, 1);
    gHeader.fillRoundedRect(cx - rangoW / 2, rangoTop, rangoW, rangoH, ESPACIADO.radioPanel);
    gHeader.lineStyle(2.5, COLORES.ok, 1);
    gHeader.strokeRoundedRect(cx - rangoW / 2, rangoTop, rangoW, rangoH, ESPACIADO.radioPanel);

    dibujarIconoAire(gHeader, cx - rangoW / 2 + 34, rangoTop + 42, 22, COLORES.aire);
    dibujarIconoEnergia(gHeader, cx - rangoW / 2 + 64, rangoTop + 42, 24, COLORES.energia);
    dibujarIconoEscudo(gHeader, cx - rangoW / 2 + 94, rangoTop + 42, 22, COLORES.escudo);

    const txtRango = this.add
      .text(
        cx - rangoW / 2 + 124,
        rangoTop + 26,
        t('informe.rangoEtiqueta', { rango: informe.rango.titulo }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(23, textoGrande, 26)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.ok,
        },
      )
      .setOrigin(0, 0.5);

    const txtFrase = this.add
      .text(cx - rangoW / 2 + 124, rangoTop + 58, informe.rango.frase, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoPrincipal,
        wordWrap: { width: rangoW - 224 },
      })
      .setOrigin(0, 0.5);

    const estadoLuniInforme =
      informe.jornadasCompletadas >= 4
        ? 'contenta'
        : estadoMascota(snap.aire, snap.escudo);
    const luniInforme = crearWidgetMascota(this, {
      x: cx + rangoW / 2 - 48,
      y: rangoTop + 46,
      escala: 0.78,
      estadoInicial: estadoLuniInforme,
      mostrarFrase: false,
    });

    const txtHint = this.add
      .text(cx, 162, t('informe.desplazarHint'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.aire,
      })
      .setOrigin(0.5);

    this.contenido.add([
      titulo,
      gHeader,
      txtRango,
      txtFrase,
      luniInforme.container,
      txtHint,
    ]);

    // Zona scrolleable
    this.scrollContenedor = this.add.container(0, this.viewportY);
    this.contenido.add(this.scrollContenedor);

    const viewX = 96;
    const viewW = GAME_WIDTH - 192;
    this.mascaraShape = this.make.graphics({ x: 0, y: 0 }, false);
    this.mascaraShape.fillStyle(0xffffff, 1);
    this.mascaraShape.fillRect(viewX, this.viewportY, viewW, this.viewportAlto);
    const mascara = this.mascaraShape.createGeometryMask();
    this.scrollContenedor.setMask(mascara);

    let yCursor = 6;
    const cardW = viewW - 36;

    // 1. Fila visual de las 5 jornadas (icono + forma + etiqueta, nunca solo color)
    yCursor += this.agregarTarjetaJornadas(cx, yCursor, cardW, informe, textoGrande) + 14;

    // 2. Tus decisiones difíciles
    const cuerpoDecisiones =
      informe.decisionesDificiles.length === 0
        ? t('informe.sinDecisiones')
        : informe.decisionesDificiles.map((d) => `• ${d.lineaCompleta}`).join('\n');
    yCursor +=
      this.agregarTarjetaTexto(
        cx,
        yCursor,
        cardW,
        t('informe.decisionesTitulo'),
        cuerpoDecisiones,
        COLORES.energia,
        textoGrande,
      ) + 14;

    // 3. Lo que aprendiste (3 ideas fijas)
    yCursor +=
      this.agregarTarjetaTexto(
        cx,
        yCursor,
        cardW,
        t('informe.aprendisteTitulo'),
        informe.aprendizajes.join('\n'),
        COLORES.aire,
        textoGrande,
      ) + 14;

    // 4. Datos usados (J3 y J5)
    const cuerpoDatos = `${informe.datosUsados.j3.linea}\n${informe.datosUsados.j5.linea}`;
    yCursor +=
      this.agregarTarjetaTexto(
        cx,
        yCursor,
        cardW,
        t('informe.datosUsadosTitulo'),
        cuerpoDatos,
        COLORES.escudo,
        textoGrande,
      ) + 14;

    // 5. Bloque opcional OSDR (solo si verificado === true y completo)
    if (informe.osdr) {
      const textoOsdr =
        idioma === 'en' ? informe.osdr.textoNinos.en : informe.osdr.textoNinos.es;
      const selloOsdr = t('sellos.archivoConsultado', {
        fecha: informe.osdr.consultadoEn,
      });
      const cuerpoOsdr = `${textoOsdr}\n${informe.osdr.fuenteNombre} · ${informe.osdr.fuenteUrl} · ${selloOsdr}`;
      yCursor +=
        this.agregarTarjetaTexto(
          cx,
          yCursor,
          cardW,
          t('informe.osdrTitulo', { titulo: informe.osdr.titulo }),
          cuerpoOsdr,
          COLORES.ok,
          textoGrande,
        ) + 14;
    }

    this.maxScroll = Math.max(0, yCursor - this.viewportAlto);
    this.barraScroll = this.add.graphics();
    this.contenido.add(this.barraScroll);
    this.actualizarScrollVisual();

    // Estado de copia
    this.textoEstadoCopia = this.add
      .text(cx, 610, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.ok,
        align: 'center',
      })
      .setOrigin(0.5);
    this.contenido.add(this.textoEstadoCopia);

    // 4 botones >= 56px en barra inferior
    const btnY = 660;
    const btnH = 58;
    const btnSpecs: Array<{
      ancho: number;
      etiqueta: string;
      colorFondo: number;
      colorTexto: string;
      accion: () => void;
    }> = [
      {
        ancho: 230,
        etiqueta: t('informe.jugarDeNuevo'),
        colorFondo: COLORES.ok,
        colorTexto: COLORES_HEX.botonTextoOscuro,
        accion: () => gameState.iniciarSemana(snap.semanaId),
      },
      {
        ancho: 250,
        etiqueta: t('informe.cambiarSemana'),
        colorFondo: COLORES.aire,
        colorTexto: COLORES_HEX.botonTextoOscuro,
        accion: () => {
          detenerEscenasJuego(this.scene);
          this.scene.start(SCENE_KEYS.semanas);
        },
      },
      {
        ancho: 240,
        etiqueta: t('informe.copiarResultado'),
        colorFondo: COLORES.energia,
        colorTexto: COLORES_HEX.botonTextoOscuro,
        accion: () => {
          void this.copiarResultado(informe.textoParaCopiar);
        },
      },
      {
        ancho: 170,
        etiqueta: t('informe.menuPrincipal'),
        colorFondo: COLORES.botonFondo,
        colorTexto: COLORES_HEX.textoPrincipal,
        accion: () => {
          detenerEscenasJuego(this.scene);
          this.scene.start(SCENE_KEYS.menu);
        },
      },
    ];

    const gap = 16;
    const totalW =
      btnSpecs.reduce((acc, b) => acc + b.ancho, 0) +
      (btnSpecs.length - 1) * gap;
    let xCursor = cx - totalW / 2;
    const itemsFoco: ItemFoco[] = [];

    btnSpecs.forEach((spec, idx) => {
      const bx = xCursor + spec.ancho / 2;
      const nodo = this.crearBoton(
        idx,
        bx,
        btnY,
        spec.ancho,
        btnH,
        spec.etiqueta,
        spec.colorFondo,
        spec.colorTexto,
        textoGrande,
        spec.accion,
      );
      this.contenido?.add(nodo);
      itemsFoco.push({
        x: bx,
        y: btnY,
        ancho: spec.ancho,
        alto: btnH,
        activar: spec.accion,
      });
      xCursor += spec.ancho + gap;
    });

    this.gestorFoco?.actualizarItems(itemsFoco);
  }

  private agregarTarjetaJornadas(
    cx: number,
    yTop: number,
    ancho: number,
    informe: DatosInformeFinal,
    textoGrande: boolean,
  ): number {
    if (!this.scrollContenedor) {
      return 0;
    }
    const left = cx - ancho / 2;
    const alto = textoGrande ? 136 : 122;
    const g = this.add.graphics();
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);
    g.lineStyle(2, COLORES.bordePanel, 1);
    g.strokeRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);

    const txtTitulo = this.add
      .text(left + 22, yTop + 16, t('informe.jornadasResumenTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(20, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0);

    this.scrollContenedor.add([g, txtTitulo]);

    const cols = informe.jornadas.length;
    const chipGap = 12;
    const chipW = Math.floor((ancho - 44 - (cols - 1) * chipGap) / cols);
    const chipH = textoGrande ? 68 : 60;
    const chipY = yTop + 48;

    informe.jornadas.forEach((j, idx) => {
      const chipX = left + 22 + idx * (chipW + chipGap);
      const colorBorde = j.completa
        ? COLORES.ok
        : j.jugada
          ? COLORES.aviso
          : COLORES.bordePanel;
      g.fillStyle(COLORES.pistaBarra, 1);
      g.fillRoundedRect(chipX, chipY, chipW, chipH, ESPACIADO.radioBarra);
      g.lineStyle(2, colorBorde, 1);
      g.strokeRoundedRect(chipX, chipY, chipW, chipH, ESPACIADO.radioBarra);

      if (j.completa) {
        dibujarIconoMisionLista(g, chipX + 22, chipY + chipH / 2, 20, COLORES.ok);
      } else {
        dibujarIconoMisionActiva(
          g,
          chipX + 22,
          chipY + chipH / 2,
          20,
          j.jugada ? COLORES.aviso : COLORES.textoSecundario,
        );
      }

      const txtJ = this.add
        .text(
          chipX + 40,
          chipY + 12,
          t('informe.jornadaChip', { jornada: j.jornada }),
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${TAMANOS_TEXTO.minimo}px`,
            fontStyle: 'bold',
            color: COLORES_HEX.textoPrincipal,
          },
        )
        .setOrigin(0, 0);

      const txtEstado = this.add
        .text(chipX + 40, chipY + 34, j.etiquetaEstado, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${TAMANOS_TEXTO.minimo}px`,
          fontStyle: 'bold',
          color: j.completa
            ? COLORES_HEX.ok
            : j.jugada
              ? COLORES_HEX.aviso
              : COLORES_HEX.textoSecundario,
        })
        .setOrigin(0, 0);

      this.scrollContenedor?.add([txtJ, txtEstado]);
    });

    return alto;
  }

  private agregarTarjetaTexto(
    cx: number,
    yTop: number,
    ancho: number,
    titulo: string,
    cuerpo: string,
    colorAcento: number,
    textoGrande: boolean,
  ): number {
    if (!this.scrollContenedor) {
      return 0;
    }
    const left = cx - ancho / 2;

    const txtTitulo = this.add
      .text(left + 22, yTop + 16, titulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(20, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color:
          colorAcento === COLORES.aire
            ? COLORES_HEX.aire
            : colorAcento === COLORES.energia
              ? COLORES_HEX.energia
              : colorAcento === COLORES.ok
                ? COLORES_HEX.ok
                : COLORES_HEX.escudo,
        wordWrap: { width: ancho - 44 },
      })
      .setOrigin(0, 0);

    const cuerpoY = yTop + 22 + txtTitulo.height + 6;
    const txtCuerpo = this.add
      .text(left + 22, cuerpoY, cuerpo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoPrincipal,
        lineSpacing: 6,
        wordWrap: { width: ancho - 44 },
      })
      .setOrigin(0, 0);

    const alto = Math.max(92, 16 + txtTitulo.height + 12 + txtCuerpo.height + 18);
    const g = this.add.graphics();
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);
    g.lineStyle(2, COLORES.bordePanel, 1);
    g.strokeRoundedRect(left, yTop, ancho, alto, ESPACIADO.radioPanel);

    this.scrollContenedor.add([g, txtTitulo, txtCuerpo]);
    return alto;
  }

  private async copiarResultado(texto: string): Promise<void> {
    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === 'function'
      ) {
        await navigator.clipboard.writeText(texto);
        if (this.textoEstadoCopia && this.scene.isActive()) {
          this.textoEstadoCopia.setText(t('informe.copiadoOk'));
        }
        return;
      }
    } catch {
      // Fall through to selectable manual copy box without window.alert
    }

    this.mostrarModalFallbackCopia(texto);
  }

  private mostrarModalFallbackCopia(texto: string): void {
    this.cerrarModalFallback();
    if (!this.contenido) {
      return;
    }

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const boxW = 700;
    const boxH = 380;
    const left = cx - boxW / 2;
    const top = cy - boxH / 2;
    const textoGrande = getAjustes().textoGrande;

    const fondo = this.add
      .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORES.fondoLienzo, 0.78)
      .setInteractive();

    const g = this.add.graphics();
    g.fillStyle(COLORES.panelHud, 1);
    g.fillRoundedRect(left, top, boxW, boxH, ESPACIADO.radioPanel);
    g.lineStyle(3, COLORES.energia, 1);
    g.strokeRoundedRect(left, top, boxW, boxH, ESPACIADO.radioPanel);

    const titulo = this.add
      .text(cx, top + 34, t('informe.copiarFallbackTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(22, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.energia,
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(cx, top + 66, t('informe.copiarFallbackHint'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0.5);

    const preview = this.add
      .text(left + 32, top + 96, texto, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoPrincipal,
        wordWrap: { width: boxW - 64 },
      })
      .setOrigin(0, 0);

    const btnCerrar = this.crearBoton(
      99,
      cx,
      top + boxH - 44,
      220,
      56,
      t('comun.cerrar'),
      COLORES.aire,
      COLORES_HEX.botonTextoOscuro,
      textoGrande,
      () => this.cerrarModalFallback(),
    );

    this.modalFallback = this.add.container(0, 0, [
      fondo,
      g,
      titulo,
      hint,
      preview,
      btnCerrar,
    ]);
    this.contenido.add(this.modalFallback);

    if (typeof document !== 'undefined') {
      const parent = document.getElementById('app') ?? document.body;
      const textarea = document.createElement('textarea');
      textarea.readOnly = true;
      textarea.value = texto;
      textarea.setAttribute('aria-label', t('informe.copiarFallbackTitulo'));
      textarea.style.position = 'fixed';
      textarea.style.left = '50%';
      textarea.style.top = '50%';
      textarea.style.transform = 'translate(-50%, -55%)';
      textarea.style.width = 'min(620px, 84vw)';
      textarea.style.height = '180px';
      textarea.style.padding = '12px';
      textarea.style.fontFamily = 'Nunito, sans-serif';
      textarea.style.fontSize = '18px';
      textarea.style.background = COLORES_HEX.pistaBarra;
      textarea.style.color = COLORES_HEX.textoPrincipal;
      textarea.style.border = `2px solid ${COLORES_HEX.energia}`;
      textarea.style.borderRadius = '12px';
      textarea.style.zIndex = '20';
      parent.appendChild(textarea);
      textarea.focus();
      textarea.select();
      this.fallbackTextarea = textarea;
    }
  }

  private cerrarModalFallback(): void {
    if (this.fallbackTextarea) {
      this.fallbackTextarea.remove();
      this.fallbackTextarea = null;
    }
    if (this.modalFallback) {
      this.modalFallback.destroy(true);
      this.modalFallback = null;
    }
  }

  private configurarScroll(): void {
    const moverScroll = (delta: number): void => {
      if (this.maxScroll <= 0 || !this.scrollContenedor) {
        return;
      }
      this.scrollY = Math.max(0, Math.min(this.maxScroll, this.scrollY + delta));
      this.scrollContenedor.y = this.viewportY - this.scrollY;
      this.actualizarScrollVisual();
    };

    const onWheel = (
      _pointer: Phaser.Input.Pointer,
      _objs: Phaser.GameObjects.GameObject[],
      _dx: number,
      dy: number,
    ): void => {
      if (!this.raiz?.visible || this.modalFallback) {
        return;
      }
      moverScroll(dy * 0.65);
    };

    const onDown = (pointer: Phaser.Input.Pointer): void => {
      if (!this.raiz?.visible || this.modalFallback) {
        return;
      }
      if (
        pointer.y >= this.viewportY &&
        pointer.y <= this.viewportY + this.viewportAlto
      ) {
        this.arrastrando = true;
        this.ultimoPointerY = pointer.y;
      }
    };

    const onMove = (pointer: Phaser.Input.Pointer): void => {
      if (!this.arrastrando || !pointer.isDown || !this.raiz?.visible) {
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
        if (!this.raiz?.visible) {
          return;
        }
        if (this.modalFallback && ev.code === 'Escape') {
          ev.preventDefault();
          this.cerrarModalFallback();
          return;
        }
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

  private crearBoton(
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
  ): Phaser.GameObjects.Container {
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
      if (indice < 90) {
        this.gestorFoco?.sincronizarIndice(indice, false);
      }
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(1.02);
      }
    });
    zona.on('pointerout', () => {
      dibujar(false);
      contenedor.setScale(1);
    });
    zona.on('pointerdown', alPulsar);

    return contenedor;
  }

  private limpiar(): void {
    this.secuenciaCierre?.destroy();
    this.secuenciaCierre = null;
    this.cerrarModalFallback();
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
