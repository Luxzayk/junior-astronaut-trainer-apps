// Escena overlay genérica para minijuegos (host de Nodos, Válvulas y Escudo)

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../config';
import {
  ESCUDO_MIN_PANELES,
  MINIJUEGO_TIEMPO_LIMITE,
  MINIJUEGO_TIEMPO_PISTA_SEG,
  NODOS_COLS,
  NODOS_FILAS,
  VALVULAS_MIN_PASOS,
} from '../game/balance';
import type { SalaId } from '../game/map';
import { obtenerCostoIntento } from '../game/missions';
import { getAjustes, suscribirAjustes } from '../game/settings';
import { gameState } from '../game/state';
import { t } from '../i18n';
import { crearVistaMinijuego } from '../minigames/registry';
import type {
  MinigameId,
  MinigameParams,
  MinigameResult,
  MinigameView,
} from '../minigames/types';
import {
  dibujarIconoAire,
  dibujarIconoEnergia,
  dibujarIconoEscudo,
} from '../ui/icons';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  MINIJUEGO_NODOS_METRICAS,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

export class MinigameScene extends Phaser.Scene {
  private raiz: Phaser.GameObjects.Container | null = null;
  private panel: Phaser.GameObjects.Graphics | null = null;
  private iconoHeader: Phaser.GameObjects.Graphics | null = null;
  private tituloTexto: Phaser.GameObjects.Text | null = null;
  private instruccionTexto: Phaser.GameObjects.Text | null = null;
  private costoTexto: Phaser.GameObjects.Text | null = null;
  private arcoTiempo: Phaser.GameObjects.Graphics | null = null;
  private tiempoTexto: Phaser.GameObjects.Text | null = null;
  private vistaHost: Phaser.GameObjects.Container | null = null;
  private btnSalir: Phaser.GameObjects.Container | null = null;
  private btnSalirTexto: Phaser.GameObjects.Text | null = null;

  private vistaActual: MinigameView | null = null;
  private minijuegoActualId: MinigameId = 'nodos';
  private estacionActual: SalaId = 'energia';
  private misionActualId: string | null = null;

  private tiempoLimite = 60;
  private tiempoRestante = 60;
  private tiempoSinAvance = 0;
  private pistaSolicitada = false;
  private cerrando = false;

  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.minigame);
  }

  public create(): void {
    this.desuscripciones = [];

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = MINIJUEGO_NODOS_METRICAS.panelAncho;
    const alto = MINIJUEGO_NODOS_METRICAS.panelAlto;

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
    this.dibujarPanel(COLORES.energia);

    this.iconoHeader = this.add.graphics();
    this.tituloTexto = this.add
      .text(cx, cy - alto / 2 + 34, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: '28px',
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.instruccionTexto = this.add
      .text(cx, cy - alto / 2 + 72, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
        align: 'center',
        wordWrap: { width: ancho - 160 },
      })
      .setOrigin(0.5);

    this.costoTexto = this.add
      .text(cx, cy - alto / 2 + 104, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.energia,
      })
      .setOrigin(0.5);

    this.arcoTiempo = this.add.graphics();
    this.tiempoTexto = this.add
      .text(cx + ancho / 2 - 48, cy - alto / 2 + 44, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.btnSalir = this.crearBotonSalir(
      cx,
      cy + alto / 2 - 42,
      MINIJUEGO_NODOS_METRICAS.botonAncho,
      MINIJUEGO_NODOS_METRICAS.botonAlto,
    );

    // vistaHost se coloca después de btnSalir para permitir botones propios sobre el pie cuando aplique (p. ej. Elegir destino en Nodos)
    this.vistaHost = this.add.container(cx, cy);

    this.raiz = this.add.container(0, 0, [
      fondoAtenuado,
      this.panel,
      this.iconoHeader,
      this.tituloTexto,
      this.instruccionTexto,
      this.costoTexto,
      this.arcoTiempo,
      this.tiempoTexto,
      this.btnSalir,
      this.vistaHost,
    ]);
    this.raiz.setVisible(false);

    this.configurarDetectorActividad();
    this.suscribirEventos();
    this.events.once('shutdown', this.limpiar, this);
  }

  public override update(_time: number, delta: number): void {
    const snap = gameState.getSnapshot();
    if (
      !this.raiz?.visible ||
      this.cerrando ||
      snap.estado !== 'minijuego' ||
      !this.vistaActual
    ) {
      return;
    }

    const dtSeg = Math.min(delta / 1000, 0.05);
    this.tiempoRestante -= dtSeg;
    this.dibujarArcoTiempo();

    this.tiempoSinAvance += dtSeg;
    if (!this.pistaSolicitada && this.tiempoSinAvance >= MINIJUEGO_TIEMPO_PISTA_SEG) {
      this.pistaSolicitada = true;
      this.vistaActual.mostrarPista?.();
    }

    this.vistaActual.update(dtSeg);

    if (this.tiempoRestante <= -0.5 && !this.cerrando) {
      this.alTerminarVista('fallo');
    }
  }

  private dibujarPanel(colorAcento: number): void {
    if (!this.panel) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = MINIJUEGO_NODOS_METRICAS.panelAncho;
    const alto = MINIJUEGO_NODOS_METRICAS.panelAlto;

    this.panel.clear();
    this.panel.fillStyle(COLORES.panelHud, 1);
    this.panel.fillRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
    this.panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, colorAcento, 0.9);
    this.panel.strokeRoundedRect(
      cx - ancho / 2,
      cy - alto / 2,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
  }

  private configurarDetectorActividad(): void {
    const reiniciarSinAvance = (): void => {
      if (this.raiz?.visible) {
        this.tiempoSinAvance = 0;
      }
    };

    this.input.on('pointerdown', reiniciarSinAvance);
    this.desuscripciones.push(() => {
      this.input.off('pointerdown', reiniciarSinAvance);
    });

    const teclado = this.input.keyboard;
    if (teclado) {
      const alPulsarTecla = (ev: KeyboardEvent): void => {
        reiniciarSinAvance();
        if (
          ev.code === 'Escape' &&
          !ev.repeat &&
          this.raiz?.visible &&
          !this.cerrando &&
          gameState.getSnapshot().estado === 'minijuego'
        ) {
          ev.preventDefault();
          this.alTerminarVista('salida');
        }
      };
      teclado.on('keydown', alPulsarTecla);
      this.desuscripciones.push(() => {
        teclado.off('keydown', alPulsarTecla);
      });
    }
  }

  private suscribirEventos(): void {
    this.desuscripciones.push(
      gameState.on('minijuego:abrir', (ev) => {
        this.abrir(
          ev.minigameId ?? 'nodos',
          ev.estacionId,
          ev.misionId,
          ev.params,
        );
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', (ev) => {
        if (ev.estado !== 'minijuego') {
          this.destruirVistaActual();
          this.raiz?.setVisible(false);
        }
      }),
    );

    this.desuscripciones.push(
      suscribirAjustes(() => {
        if (this.raiz?.visible) {
          this.actualizarCabecera(this.minijuegoActualId);
        }
      }),
    );
  }

  private obtenerParamsPorDefecto(id: MinigameId): MinigameParams {
    if (id === 'valvulas') {
      return {
        pasos: VALVULAS_MIN_PASOS,
        tiempoLimite: MINIJUEGO_TIEMPO_LIMITE.valvulas,
      };
    }
    if (id === 'escudo') {
      return {
        pasos: ESCUDO_MIN_PANELES,
        tiempoLimite: MINIJUEGO_TIEMPO_LIMITE.escudo,
      };
    }
    return {
      pasos: NODOS_COLS * NODOS_FILAS,
      tiempoLimite: MINIJUEGO_TIEMPO_LIMITE.nodos,
    };
  }

  private abrir(
    id: MinigameId,
    estacionId: SalaId,
    misionId: string | null,
    paramsOpcionales?: MinigameParams,
  ): void {
    if (!this.vistaHost) {
      return;
    }

    this.destruirVistaActual();
    this.cerrando = false;
    this.minijuegoActualId = id;
    this.estacionActual = estacionId;
    this.misionActualId = misionId;

    const params = paramsOpcionales ?? this.obtenerParamsPorDefecto(id);
    this.tiempoLimite = Math.max(1, params.tiempoLimite);
    this.tiempoRestante = this.tiempoLimite;
    this.tiempoSinAvance = 0;
    this.pistaSolicitada = false;

    this.actualizarCabecera(id);
    this.dibujarArcoTiempo();

    const vista = crearVistaMinijuego(id);
    this.vistaActual = vista;
    this.raiz?.setVisible(true);

    vista.start(this.vistaHost, params, (resultado) => {
      this.alTerminarVista(resultado);
    });
  }

  private actualizarCabecera(id: MinigameId): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const alto = MINIJUEGO_NODOS_METRICAS.panelAlto;

    const colorAcento =
      id === 'valvulas'
        ? COLORES.aire
        : id === 'escudo'
          ? COLORES.escudo
          : COLORES.energia;

    this.dibujarPanel(colorAcento);

    if (this.iconoHeader) {
      this.iconoHeader.clear();
      const ix = cx - 220;
      const iy = cy - alto / 2 + 34;
      if (id === 'valvulas') {
        dibujarIconoAire(this.iconoHeader, ix, iy, 26, colorAcento);
      } else if (id === 'escudo') {
        dibujarIconoEscudo(this.iconoHeader, ix, iy, 26, colorAcento);
      } else {
        dibujarIconoEnergia(this.iconoHeader, ix, iy, 26, colorAcento);
      }
    }

    const titulo =
      id === 'valvulas'
        ? t('minijuegoValvulas.titulo')
        : id === 'escudo'
          ? t('minijuegoEscudo.titulo')
          : t('minijuegoNodos.titulo');

    const instruccion =
      id === 'valvulas'
        ? t('minijuegoValvulas.instruccion')
        : id === 'escudo'
          ? t('minijuegoEscudo.instruccion')
          : t('minijuegoNodos.instruccion');

    const costo = obtenerCostoIntento(id).energia ?? 0;
    const textoGrande = getAjustes().textoGrande;
    this.tituloTexto?.setText(titulo);
    this.tituloTexto?.setFontSize(escalarTamanoTexto(28, textoGrande, 31));
    this.instruccionTexto?.setText(instruccion);
    this.instruccionTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20),
    );
    this.costoTexto?.setText(t('minijuegoNodos.costoIntento', { valor: costo }));
    this.costoTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20),
    );
    this.tiempoTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20),
    );
    this.btnSalirTexto?.setText(t('minijuegoNodos.salir'));
    this.btnSalirTexto?.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26),
    );
  }

  private dibujarArcoTiempo(): void {
    if (!this.arcoTiempo || !this.tiempoTexto) {
      return;
    }
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const ancho = MINIJUEGO_NODOS_METRICAS.panelAncho;
    const alto = MINIJUEGO_NODOS_METRICAS.panelAlto;
    const ax = cx + ancho / 2 - 48;
    const ay = cy - alto / 2 + 44;
    const radio = 24;

    const fraccion = Math.max(
      0,
      Math.min(1, this.tiempoRestante / this.tiempoLimite),
    );
    const color = fraccion <= 0.25 ? COLORES.peligro : COLORES.aire;

    this.arcoTiempo.clear();
    this.arcoTiempo.lineStyle(5, COLORES.pistaBarra, 1);
    this.arcoTiempo.strokeCircle(ax, ay, radio);

    if (fraccion > 0) {
      this.arcoTiempo.lineStyle(5, color, 1);
      this.arcoTiempo.beginPath();
      this.arcoTiempo.arc(
        ax,
        ay,
        radio,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * fraccion,
        false,
      );
      this.arcoTiempo.strokePath();
    }

    this.tiempoTexto.setText(
      t('minijuegoNodos.tiempoSeg', {
        segundos: Math.max(0, Math.ceil(this.tiempoRestante)),
      }),
    );
  }

  private alTerminarVista(resultado: MinigameResult): void {
    if (this.cerrando) {
      return;
    }
    this.cerrando = true;
    const estacion = this.estacionActual;
    const mision = this.misionActualId;

    this.destruirVistaActual();
    this.raiz?.setVisible(false);

    gameState.finalizarMinijuego(resultado, estacion, mision);
  }

  private destruirVistaActual(): void {
    if (this.vistaActual) {
      this.vistaActual.destroy();
      this.vistaActual = null;
    }
    this.vistaHost?.removeAll(true);
  }

  private crearBotonSalir(
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
  ): Phaser.GameObjects.Container {
    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(COLORES.botonFondo, hover ? 0.9 : 1);
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
      .text(0, 0, t('minijuegoNodos.salir'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, getAjustes().textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);
    this.btnSalirTexto = texto;

    const zona = this.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(cx, cy, [fondo, texto, zona]);

    zona.on('pointerover', () => {
      dibujar(true);
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
      this.alTerminarVista('salida');
    });

    return contenedor;
  }

  private limpiar(): void {
    this.destruirVistaActual();
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
  }
}
