// Escena overlay del evento de clima espacial en Jornada 3 y Jornada 5

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  localEventosProvider,
  obtenerEtiquetaSelloEvento,
  obtenerTextoFuenteCurado,
  obtenerTextoNinosCurado,
  type EventoClimaCurado,
} from '../data/eventosLoader';
import {
  obtenerOpcionesEventoClima,
  type OpcionEventoClima,
  type TipoOpcionesClima,
} from '../game/events';
import {
  IDS_GLOSARIO_EVENTO_FLR,
  IDS_GLOSARIO_EVENTO_SEP,
  type IdTerminoGlosario,
} from '../game/glosario';
import { formatearSignoValor } from '../game/missions';
import { getAjustes, type Idioma } from '../game/settings';
import { gameState, type RecursoNombre } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import {
  crearModalGlosario,
  type ControlModalGlosario,
} from '../ui/glosarioModal';
import {
  dibujarIconoEscudo,
  dibujarIconoLobby,
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
  dibujarIconoRecurso,
} from '../ui/icons';
import {
  crearWidgetMascota,
  estadoMascota,
} from '../art/mascota';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  EVENTO_METRICAS,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

const PANEL_EVENTO_ALTO = 620;

export class EventScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private contenido: Phaser.GameObjects.Container | null = null;
  private gestorFoco: GestorFoco | null = null;
  private modalGlosario: ControlModalGlosario | null = null;
  private tipoOpcionesActual: TipoOpcionesClima = 'FULGURACION';
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.event);
  }

  public create(): void {
    this.desuscripciones = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = EVENTO_METRICAS.panelAncho;
    const alto = PANEL_EVENTO_ALTO;

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

    const panel = this.add.graphics();
    panel.fillStyle(COLORES.panelHud, 1);
    panel.fillRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
    panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.aviso, 1);
    panel.strokeRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );

    this.contenido = this.add.container(0, 0);
    this.raiz = this.add.container(0, 0, [
      fondoAtenuado,
      panel,
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
        Boolean(this.raiz?.visible) && !this.modalGlosario?.estaAbierto(),
    });

    this.suscribirEventos();
    this.events.once('shutdown', this.limpiar, this);
  }

  private suscribirEventos(): void {
    this.desuscripciones.push(
      gameState.on('evento:abrir', (ev) => {
        this.tipoOpcionesActual = ev.opciones;
        const snap = gameState.getSnapshot();
        const jornadaFallback = ev.opciones === 'TORMENTA_GRANDE' ? 5 : 3;
        const evento =
          localEventosProvider.obtenerPorId(ev.eventoId) ??
          localEventosProvider.obtenerPorSemanaYJornada(
            snap.semanaId,
            jornadaFallback,
          );
        this.abrir(evento, ev.opciones);
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', (ev) => {
        if (ev.estado !== 'evento') {
          this.modalGlosario?.cerrar();
          this.raiz?.setVisible(false);
          this.contenido?.removeAll(true);
          this.gestorFoco?.actualizarItems([]);
        }
      }),
    );
  }

  private abrir(
    evento: EventoClimaCurado,
    tipoOpciones: TipoOpcionesClima,
  ): void {
    if (!this.contenido || !this.raiz) {
      return;
    }
    this.contenido.removeAll(true);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const alto = PANEL_EVENTO_ALTO;
    const ancho = EVENTO_METRICAS.panelAncho;
    const top = cy - alto / 2;
    const ajustes = getAjustes();
    const idioma = ajustes.idioma;
    const textoGrande = ajustes.textoGrande;

    const iconoAlerta = this.add.graphics();
    dibujarIconoEscudo(iconoAlerta, cx - 224, top + 40, 32, COLORES.aviso);

    const titulo = this.add
      .text(cx + 12, top + 40, t('eventoClima.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 35)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    const subtituloTexto =
      evento.tipo === 'SEP'
        ? t('eventoClima.subtituloSEP', { tipo: evento.tipo })
        : t('eventoClima.subtituloFLR', { tipo: evento.tipo });

    const subtitulo = this.add
      .text(cx, top + 80, subtituloTexto, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aviso,
      })
      .setOrigin(0.5);

    const descripcion = this.add
      .text(cx, top + 132, obtenerTextoNinosCurado(evento, idioma), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 22)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: ancho - 72 },
      })
      .setOrigin(0.5);

    const fuente = this.add
      .text(cx, top + 186, obtenerTextoFuenteCurado(evento, idioma), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 72 },
      })
      .setOrigin(0.5);

    // Sello fijo de archivo o indicador de ejemplo (sin inventar datos)
    const selloTexto = evento.esEjemplo
      ? t('sellos.datosEjemplo')
      : obtenerEtiquetaSelloEvento(evento, idioma);
    const selloColor = evento.esEjemplo ? COLORES.energia : COLORES.ok;
    const selloHex = evento.esEjemplo ? COLORES_HEX.energia : COLORES_HEX.ok;
    const gSello = this.add.graphics();
    const selloY = top + 220;
    const selloW = Math.min(ancho - 96, Math.max(240, selloTexto.length * 10 + 68));
    gSello.fillStyle(COLORES.pistaBarra, 1);
    gSello.fillRoundedRect(cx - selloW / 2, selloY - 16, selloW, 32, ESPACIADO.radioBarra);
    gSello.lineStyle(1.5, selloColor, 0.9);
    gSello.strokeRoundedRect(cx - selloW / 2, selloY - 16, selloW, 32, ESPACIADO.radioBarra);
    if (evento.esEjemplo) {
      dibujarIconoMisionActiva(gSello, cx - selloW / 2 + 22, selloY, 16, selloColor);
    } else {
      dibujarIconoMisionLista(gSello, cx - selloW / 2 + 22, selloY, 16, selloColor);
    }

    const txtSello = this.add
      .text(cx + 12, selloY, selloTexto, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: selloHex,
      })
      .setOrigin(0.5);

    const snap = gameState.getSnapshot();
    const estadoLuniBase = estadoMascota(snap.aire, snap.escudo);
    const estadoLuniEvento =
      estadoLuniBase === 'asustada' ? 'asustada' : 'preocupada';

    const luniEvento = crearWidgetMascota(this, {
      x: cx - 196,
      y: top + 258,
      escala: 0.78,
      estadoInicial: estadoLuniEvento,
      mostrarFrase: true,
      anchoFrase: 356,
      alineacionFrase: 'derecha',
      contexto: 'evento',
    });

    this.contenido.add([
      iconoAlerta,
      titulo,
      subtitulo,
      descripcion,
      fuente,
      gSello,
      txtSello,
      luniEvento.container,
    ]);

    const snapClima = gameState.getSnapshot();
    const opciones = obtenerOpcionesEventoClima(tipoOpciones, {
      refugioSellado: snapClima.refugioSellado,
      antenaSintonizada: snapClima.antenaSintonizada,
    });
    const tAncho = EVENTO_METRICAS.tarjetaAncho;
    const tAlto = EVENTO_METRICAS.tarjetaAlto;
    const sep = EVENTO_METRICAS.tarjetaSeparacion;
    const totalW = opciones.length * tAncho + (opciones.length - 1) * sep;
    const xInicio = cx - totalW / 2 + tAncho / 2;
    const yTarjetas = top + 402;

    const itemsFoco: ItemFoco[] = [];
    opciones.forEach((opcion, idx) => {
      const tx = xInicio + idx * (tAncho + sep);
      const tarjeta = this.crearTarjetaOpcion(idx, tx, yTarjetas, opcion);
      this.contenido?.add(tarjeta);
      itemsFoco.push({
        x: tx,
        y: yTarjetas,
        ancho: tAncho,
        alto: tAlto,
        radio: ESPACIADO.radioPanel,
        activar: () => {
          gameState.resolverEventoClima(opcion.id, this.tipoOpcionesActual);
        },
      });
    });

    // Chips clicables de glosario (>= 56 px de alto)
    const idsGlosario =
      evento.tipo === 'SEP' ? IDS_GLOSARIO_EVENTO_SEP : IDS_GLOSARIO_EVENTO_FLR;
    const chipW = 316;
    const chipH = 56;
    const chipGap = 24;
    const chipY = top + 566;

    idsGlosario.forEach((idTermino, idx) => {
      const chipX = cx + (idx === 0 ? -1 : 1) * (chipW / 2 + chipGap / 2);
      const etiqueta = this.etiquetaChipGlosario(idTermino, idioma);
      const indiceFoco = itemsFoco.length;
      const abrirTermino = (): void => {
        this.modalGlosario?.abrir(idTermino, idioma);
      };
      const chip = this.crearChipGlosario(
        indiceFoco,
        chipX,
        chipY,
        chipW,
        chipH,
        etiqueta,
        abrirTermino,
      );
      this.contenido?.add(chip);
      itemsFoco.push({
        x: chipX,
        y: chipY,
        ancho: chipW,
        alto: chipH,
        activar: abrirTermino,
      });
    });

    this.gestorFoco?.actualizarItems(itemsFoco, false);
    this.raiz.setVisible(true);
  }

  private etiquetaChipGlosario(
    idTermino: IdTerminoGlosario,
    idioma: Idioma,
  ): string {
    switch (idTermino) {
      case 'fulguracion':
        return t('glosario.chipFulguracion', undefined, idioma);
      case 'radiacion':
        return t('glosario.chipRadiacion', undefined, idioma);
      case 'particulas_solares':
        return t('glosario.chipParticulas', undefined, idioma);
      case 'nivel_evento':
        return t('glosario.chipNivel', undefined, idioma);
      default:
        return t('glosario.chipFulguracion', undefined, idioma);
    }
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

    const texto = this.add
      .text(12, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, getAjustes().textoGrande, 20)}px`,
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

  private crearTarjetaOpcion(
    indice: number,
    cx: number,
    cy: number,
    opcion: OpcionEventoClima,
  ): Phaser.GameObjects.Container {
    const ancho = EVENTO_METRICAS.tarjetaAncho;
    const alto = EVENTO_METRICAS.tarjetaAlto;
    const textoGrande = getAjustes().textoGrande;
    const colorAcento =
      opcion.id === 'refugiarte' ? COLORES.energia : COLORES.escudo;

    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(hover ? COLORES.botonHover : COLORES.botonFondo, 1);
      fondo.fillRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioPanel,
      );
      fondo.lineStyle(hover ? 3 : 2, hover ? colorAcento : COLORES.bordePanel, 1);
      fondo.strokeRoundedRect(
        -ancho / 2,
        -alto / 2,
        ancho,
        alto,
        ESPACIADO.radioPanel,
      );
    };
    dibujar(false);

    const titulo = this.add
      .text(0, -alto / 2 + 28, opcion.titulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(22, textoGrande, 25)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -alto / 2 + 76, opcion.descripcion, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 28 },
      })
      .setOrigin(0.5);

    const contenedor = this.add.container(cx, cy, [fondo, titulo, desc]);

    const gChips = this.add.graphics();
    contenedor.add(gChips);

    const recursosOrden: readonly RecursoNombre[] = ['aire', 'energia', 'escudo'];
    const nombresRecurso: Record<RecursoNombre, string> = {
      aire: t('recursos.aire'),
      energia: t('recursos.energia'),
      escudo: t('recursos.escudo'),
    };
    const coloresRecurso: Record<RecursoNombre, number> = {
      aire: COLORES.aire,
      energia: COLORES.energia,
      escudo: COLORES.escudo,
    };

    const chipsRecurso = recursosOrden.filter(
      (rec) => typeof opcion.efectos[rec] === 'number' && opcion.efectos[rec] !== 0,
    );
    const chipH = EVENTO_METRICAS.chipAlto;
    const chipW = ancho - 36;
    const chipYBase = opcion.id === 'refugiarte' ? alto / 2 - 64 : alto / 2 - 42;

    chipsRecurso.forEach((rec, idx) => {
      const delta = opcion.efectos[rec] ?? 0;
      const { signo, valorAbs } = formatearSignoValor(delta);
      const chipY = chipYBase + idx * (chipH + 8);

      gChips.fillStyle(COLORES.pistaBarra, 1);
      gChips.fillRoundedRect(
        -chipW / 2,
        chipY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );
      gChips.lineStyle(1.5, COLORES.aviso, 0.9);
      gChips.strokeRoundedRect(
        -chipW / 2,
        chipY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );

      dibujarIconoRecurso(
        gChips,
        rec,
        -chipW / 2 + 22,
        chipY,
        18,
        coloresRecurso[rec],
      );

      const textoChip = this.add
        .text(
          -chipW / 2 + 40,
          chipY,
          t('eleccionEnergia.chipRecurso', {
            signo,
            valor: valorAbs,
            nombre: nombresRecurso[rec],
          }),
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
            fontStyle: 'bold',
            color: COLORES_HEX.aviso,
          },
        )
        .setOrigin(0, 0.5);

      contenedor.add(textoChip);
    });

    if (opcion.id === 'refugiarte') {
      const chipPerdidaY = alto / 2 - 22;
      gChips.fillStyle(COLORES.pistaBarra, 1);
      gChips.fillRoundedRect(
        -chipW / 2,
        chipPerdidaY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );
      gChips.lineStyle(1.5, COLORES.peligro, 0.95);
      gChips.strokeRoundedRect(
        -chipW / 2,
        chipPerdidaY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );

      gChips.fillStyle(COLORES.peligro, 1);
      gChips.fillCircle(-chipW / 2 + 22, chipPerdidaY, 7);

      const txtPerdida = this.add
        .text(-chipW / 2 + 40, chipPerdidaY, t('eventoClima.chipMisionesPerdidas'), {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.peligro,
        })
        .setOrigin(0, 0.5);

      contenedor.add(txtPerdida);
    }

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });
    contenedor.add(zona);

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
      gameState.resolverEventoClima(opcion.id, this.tipoOpcionesActual);
    });

    return contenedor;
  }

  private limpiar(): void {
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
