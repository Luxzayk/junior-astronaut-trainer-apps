// Escena overlay de elecciones por estación con chips de costo visible

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import type { OpcionEleccion, TipoEleccion } from '../game/jornadas';
import {
  formatearSignoValor,
  obtenerOpcionesPorTipoEleccion,
} from '../game/missions';
import { getAjustes } from '../game/settings';
import { gameState, type RecursoNombre } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import { dibujarIconoRecurso } from '../ui/icons';
import { desregistrarObjetivoUI, registrarObjetivoUI } from '../ui/targets';
import {
  COLORES,
  COLORES_HEX,
  ELECCION_METRICAS,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

export class ChoiceScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private tituloTexto: Phaser.GameObjects.Text | null = null;
  private subtituloTexto: Phaser.GameObjects.Text | null = null;
  private tarjetasContainer: Phaser.GameObjects.Container | null = null;
  private gestorFoco: GestorFoco | null = null;
  private misionActualId: string | null = null;
  private tipoEleccionActual: TipoEleccion = 'envio_energia';
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.choice);
  }

  public create(): void {
    this.desuscripciones = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = ELECCION_METRICAS.panelAncho;
    const alto = ELECCION_METRICAS.panelAlto;

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
    panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.energia, 0.9);
    panel.strokeRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );

    this.tituloTexto = this.add
      .text(cx, cy - alto / 2 + 44, t('eleccionEnergia.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.titulo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.subtituloTexto = this.add
      .text(cx, cy - alto / 2 + 86, t('eleccionEnergia.subtitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 64 },
      })
      .setOrigin(0.5);

    this.tarjetasContainer = this.add.container(0, 0);
    this.raiz = this.add.container(0, 0, [
      fondoAtenuado,
      panel,
      this.tituloTexto,
      this.subtituloTexto,
      this.tarjetasContainer,
    ]);
    this.raiz.setVisible(false);

    this.gestorFoco = crearGestorFoco(this, {
      items: [],
      padre: this.raiz,
      habilitado: () => Boolean(this.raiz?.visible),
    });

    this.suscribirEventos();
    registrarObjetivoUI('eleccion', {
      x: cx - ancho / 2,
      y: cy - alto / 2,
      ancho,
      alto,
    });
    this.events.once('shutdown', this.limpiar, this);
  }

  private suscribirEventos(): void {
    this.desuscripciones.push(
      gameState.on('eleccion:abrir', (ev) => {
        this.abrir(ev.misionId, ev.tipoEleccion);
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', (ev) => {
        if (ev.estado !== 'eleccion') {
          this.raiz?.setVisible(false);
          this.gestorFoco?.actualizarItems([]);
        }
      }),
    );
  }

  private abrir(misionId: string | null, tipoEleccion: TipoEleccion): void {
    this.misionActualId = misionId;
    this.tipoEleccionActual = tipoEleccion;
    const textoGrande = getAjustes().textoGrande;

    const titulo =
      tipoEleccion === 'invernadero'
        ? t('eleccionEnergia.tituloInvernadero')
        : tipoEleccion === 'escudo_potencia'
          ? t('eleccionEnergia.tituloEscudo')
          : t('eleccionEnergia.titulo');
    this.tituloTexto?.setText(titulo);
    this.tituloTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36),
    );
    this.subtituloTexto?.setText(t('eleccionEnergia.subtitulo'));
    this.subtituloTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 22),
    );

    this.construirTarjetas(tipoEleccion);
    this.raiz?.setVisible(true);
  }

  private construirTarjetas(tipoEleccion: TipoEleccion): void {
    if (!this.tarjetasContainer) {
      return;
    }
    this.tarjetasContainer.removeAll(true);

    const opciones = obtenerOpcionesPorTipoEleccion(tipoEleccion);
    const ancho = 352;
    const sep = 28;
    const totalW = opciones.length * ancho + (opciones.length - 1) * sep;
    const xInicio = GAME_WIDTH / 2 - totalW / 2 + ancho / 2;
    const yCentro = GAME_HEIGHT / 2 + 44;

    const itemsFoco: ItemFoco[] = [];
    opciones.forEach((opcion, indice) => {
      const tx = xInicio + indice * (ancho + sep);
      const tarjeta = this.crearTarjetaOpcion(indice, tx, yCentro, ancho, opcion);
      this.tarjetasContainer?.add(tarjeta);
      itemsFoco.push({
        x: tx,
        y: yCentro,
        ancho,
        alto: ELECCION_METRICAS.tarjetaAlto,
        radio: ESPACIADO.radioPanel,
        activar: () => {
          gameState.aplicarEleccion(
            this.tipoEleccionActual,
            opcion.id,
            this.misionActualId,
          );
        },
      });
    });
    this.gestorFoco?.actualizarItems(itemsFoco, false);
  }

  private crearTarjetaOpcion(
    indice: number,
    cx: number,
    cy: number,
    ancho: number,
    opcion: OpcionEleccion,
  ): Phaser.GameObjects.Container {
    const alto = ELECCION_METRICAS.tarjetaAlto;
    const textoGrande = getAjustes().textoGrande;

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
      fondo.lineStyle(
        hover ? 3 : 2,
        hover ? opcion.colorAcento : COLORES.bordePanel,
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

    const icono = this.add.graphics();
    dibujarIconoRecurso(
      icono,
      opcion.recursoPrincipal,
      0,
      -alto / 2 + 34,
      32,
      opcion.colorAcento,
    );

    const titulo = this.add
      .text(0, -alto / 2 + 74, opcion.titulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(24, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -alto / 2 + 112, opcion.descripcion, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 32 },
      })
      .setOrigin(0.5);

    const contenedor = this.add.container(cx, cy, [
      fondo,
      icono,
      titulo,
      desc,
    ]);

    const ordenRecursos: readonly RecursoNombre[] = ['energia', 'aire', 'escudo'];
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

    const gChips = this.add.graphics();
    contenedor.add(gChips);

    const recursosConCambio = ordenRecursos.filter(
      (rec) => opcion.efectos[rec] !== 0,
    );

    recursosConCambio.forEach((rec, idx) => {
      const delta = opcion.efectos[rec];
      const { signo, valorAbs } = formatearSignoValor(delta);
      const esPositivo = delta >= 0;
      const chipY = 34 + idx * (ELECCION_METRICAS.chipAlto + 10);
      const chipW = ancho - 48;
      const chipH = ELECCION_METRICAS.chipAlto;

      gChips.fillStyle(COLORES.pistaBarra, 1);
      gChips.fillRoundedRect(
        -chipW / 2,
        chipY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );
      gChips.lineStyle(
        1.5,
        esPositivo ? COLORES.ok : COLORES.peligro,
        0.95,
      );
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
        -chipW / 2 + 24,
        chipY,
        18,
        coloresRecurso[rec],
      );

      const textoChip = this.add
        .text(
          -chipW / 2 + 46,
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
            color: esPositivo ? COLORES_HEX.ok : COLORES_HEX.peligro,
          },
        )
        .setOrigin(0, 0.5);

      contenedor.add(textoChip);
    });

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
      gameState.aplicarEleccion(
        this.tipoEleccionActual,
        opcion.id,
        this.misionActualId,
      );
    });

    return contenedor;
  }

  private limpiar(): void {
    desregistrarObjetivoUI('eleccion');
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
  }
}
