// Escena overlay del evento Apagón en Jornada 4

import Phaser from 'phaser';
import { EVENTO_PREVIEW_COSTO } from '../ui/hudFx';
import type { MapaDeltasRecursos } from '../game/missions';
import { GAME_HEIGHT, GAME_WIDTH, HUD_H, SCENE_KEYS } from '../config';
import {
  obtenerOpcionesApagon,
  type OpcionApagon,
} from '../game/events';
import { formatearSignoValor } from '../game/missions';
import { getAjustes } from '../game/settings';
import { gameState, type RecursoNombre } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import { dibujarIconoEnergia, dibujarIconoRecurso } from '../ui/icons';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

export class ApagonScene extends Phaser.Scene {
  private efectosPreview: readonly MapaDeltasRecursos[] = [];
  private raiz: Phaser.GameObjects.Container | null = null;
  private contenido: Phaser.GameObjects.Container | null = null;
  private gestorFoco: GestorFoco | null = null;
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.apagon);
  }

  public create(): void {
    this.desuscripciones = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = 860;
    const alto = 470;

    const fondoAtenuado = this.add
      .rectangle(
        cx,
        (GAME_HEIGHT + HUD_H) / 2,
        GAME_WIDTH,
        GAME_HEIGHT - HUD_H,
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

    this.gestorFoco = crearGestorFoco(this, {
      items: [],
      alCambiarFoco: indice => this.previewCosto(this.efectosPreview[indice] ?? null),
      padre: this.raiz,
      habilitado: () => Boolean(this.raiz?.visible),
    });

    this.suscribirEventos();
    this.events.once('shutdown', this.limpiar, this);
  }

  private suscribirEventos(): void {
    this.desuscripciones.push(
      gameState.on('apagon:abrir', () => {
        this.abrir();
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', (ev) => {
        if (ev.estado !== 'apagon') {
          this.previewCosto(null);
          this.raiz?.setVisible(false);
          this.contenido?.removeAll(true);
          this.gestorFoco?.actualizarItems([]);
        }
      }),
    );
  }

  private abrir(): void {
    if (!this.contenido || !this.raiz) {
      return;
    }
    this.contenido.removeAll(true);

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const alto = 470;
    const top = cy - alto / 2;
    const textoGrande = getAjustes().textoGrande;

    const icono = this.add.graphics();
    dibujarIconoEnergia(icono, cx - 150, top + 48, 32, COLORES.aviso);

    const titulo = this.add
      .text(cx + 18, top + 48, t('apagon.titulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.titulo, textoGrande, 36)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    const mensaje = this.add
      .text(cx, top + 98, t('apagon.mensaje'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
      })
      .setOrigin(0.5);

    this.contenido.add([icono, titulo, mensaje]);

    const opciones = obtenerOpcionesApagon();
    const tarjetaW = 252;
    const tarjetaH = 276;
    const sep = 20;
    const totalW = opciones.length * tarjetaW + (opciones.length - 1) * sep;
    const xInicio = cx - totalW / 2 + tarjetaW / 2;
    const yTarjetas = top + 286;

    this.efectosPreview = opciones.map(opcion => opcion.efectos);
    const itemsFoco: ItemFoco[] = [];
    opciones.forEach((opcion, idx) => {
      const tx = xInicio + idx * (tarjetaW + sep);
      const tarjeta = this.crearTarjetaOpcion(idx, tx, yTarjetas, opcion);
      this.contenido?.add(tarjeta);
      itemsFoco.push({
        x: tx,
        y: yTarjetas,
        ancho: tarjetaW,
        alto: tarjetaH,
        radio: ESPACIADO.radioPanel,
        activar: () => {
          this.previewCosto(null);
          gameState.resolverApagon(opcion.id);
        },
      });
    });

    this.gestorFoco?.actualizarItems(itemsFoco, false);
    this.raiz.setVisible(true);
  }

  private crearTarjetaOpcion(
    indice: number,
    cx: number,
    cy: number,
    opcion: OpcionApagon,
  ): Phaser.GameObjects.Container {
    const ancho = 252;
    const alto = 276;
    const textoGrande = getAjustes().textoGrande;
    const colorAcento =
      opcion.id === 'soporteVida'
        ? COLORES.aire
        : opcion.id === 'escudos'
          ? COLORES.escudo
          : COLORES.energia;

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
        hover ? colorAcento : COLORES.bordePanel,
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

    const titulo = this.add
      .text(0, -alto / 2 + 38, opcion.titulo, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(21, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: ancho - 24 },
      })
      .setOrigin(0.5);

    const desc = this.add
      .text(0, -alto / 2 + 106, opcion.descripcion, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 26 },
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
    const chipW = ancho - 28;
    const chipH = 36;
    const chipYBase = opcion.pierdeInvernadero ? alto / 2 - 70 : alto / 2 - 36;

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
      gChips.lineStyle(1.5, COLORES.peligro, 0.95);
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
        -chipW / 2 + 20,
        chipY,
        18,
        coloresRecurso[rec],
      );

      const txt = this.add
        .text(
          -chipW / 2 + 38,
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
            color: COLORES_HEX.peligro,
          },
        )
        .setOrigin(0, 0.5);

      contenedor.add(txt);
    });

    if (opcion.pierdeInvernadero) {
      const chipY = alto / 2 - 26;
      gChips.fillStyle(COLORES.pistaBarra, 1);
      gChips.fillRoundedRect(
        -chipW / 2,
        chipY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );
      gChips.lineStyle(1.5, COLORES.peligro, 0.95);
      gChips.strokeRoundedRect(
        -chipW / 2,
        chipY - chipH / 2,
        chipW,
        chipH,
        ESPACIADO.radioBarra,
      );
      gChips.fillStyle(COLORES.peligro, 1);
      gChips.fillCircle(-chipW / 2 + 20, chipY, 7);

      const txtPerdida = this.add
        .text(-chipW / 2 + 36, chipY, t('apagon.chipInvernaderoPerdida'), {
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

    zona.on('pointerover', (pointer: Phaser.Input.Pointer) => {
      dibujar(true);
      if (!pointer.wasTouch) this.previewCosto(opcion.efectos);
      this.gestorFoco?.sincronizarIndice(indice, false);
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(1.02);
      }
    });
    zona.on('pointerout', () => {
      this.previewCosto(null);
      dibujar(false);
      contenedor.setScale(1);
    });
    zona.on('pointerdown', () => {
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(0.98);
      }
      this.previewCosto(null);
      gameState.resolverApagon(opcion.id);
    });

    return contenedor;
  }

  private previewCosto(deltas: MapaDeltasRecursos | null): void {
    this.game.events.emit(EVENTO_PREVIEW_COSTO, deltas === null ? null : {
      aire: deltas.aire ?? 0, energia: deltas.energia ?? 0, escudo: deltas.escudo ?? 0,
    });
  }

  private limpiar(): void {
    this.previewCosto(null);
    this.gestorFoco?.destroy();
    this.gestorFoco = null;
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
  }
}
