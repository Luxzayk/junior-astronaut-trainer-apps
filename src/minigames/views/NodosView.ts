// Vista del minijuego "Nodos" adaptada a MinigameView

import Phaser from 'phaser';
import { NODOS_COLS, NODOS_FILAS } from '../../game/balance';
import { getAjustes } from '../../game/settings';
import { t } from '../../i18n';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  MINIJUEGO_NODOS_METRICAS,
  TAMANOS_TEXTO,
} from '../../ui/theme';
import {
  generarPuzzleNodos,
  obtenerConexionesCelda,
  rotarCeldaNodos,
  type CeldaNodos,
  type TableroNodos,
} from '../nodos';
import type { MinigameParams, MinigameResult, MinigameView } from '../types';

function crearRngOpcional(semilla?: number): (() => number) | undefined {
  if (typeof semilla !== 'number' || !Number.isFinite(semilla)) {
    return undefined;
  }
  let estado = (Math.floor(semilla) >>> 0) || 1;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

export class NodosView implements MinigameView {
  private host: Phaser.GameObjects.Container | null = null;
  private capaPuertos: Phaser.GameObjects.Graphics | null = null;
  private capaTablero: Phaser.GameObjects.Graphics | null = null;
  private capaPista: Phaser.GameObjects.Graphics | null = null;
  private capaFoco: Phaser.GameObjects.Graphics | null = null;
  private textoEstado: Phaser.GameObjects.Text | null = null;
  private btnContinuar: Phaser.GameObjects.Container | null = null;

  private tablero: TableroNodos | null = null;
  private onResult: ((r: MinigameResult) => void) | null = null;
  private celdaPista: { col: number; fila: number } | null = null;
  private fasePista = 0;
  private focusCol = 0;
  private focusFila = 1;
  private focoVisible = false;
  private desuscribirTeclado: (() => void) | null = null;

  public start(
    host: Phaser.GameObjects.Container,
    params: MinigameParams,
    onResult: (r: MinigameResult) => void,
  ): void {
    this.host = host;
    this.onResult = onResult;
    this.celdaPista = null;
    this.fasePista = 0;
    this.focusCol = 0;
    this.focusFila = 1;
    this.focoVisible = false;

    const rng = crearRngOpcional(params.semilla);
    this.tablero = generarPuzzleNodos(NODOS_COLS, NODOS_FILAS, rng);

    const gridCy = 12;
    this.capaPuertos = host.scene.add.graphics();
    this.capaTablero = host.scene.add.graphics();
    this.capaPista = host.scene.add.graphics();
    this.capaFoco = host.scene.add.graphics();

    const zonasCeldas = this.crearZonasTablero(host.scene, 0, gridCy);
    const etiquetasPuertos = this.crearEtiquetasPuertos(host.scene, 0, gridCy);

    const altoPanel = MINIJUEGO_NODOS_METRICAS.panelAlto;
    const textoGrande = getAjustes().textoGrande;
    this.textoEstado = host.scene.add
      .text(0, altoPanel / 2 - 84, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.ok,
      })
      .setOrigin(0.5);

    this.btnContinuar = this.crearBotonContinuar(
      host.scene,
      0,
      altoPanel / 2 - 42,
      MINIJUEGO_NODOS_METRICAS.botonAncho + 40,
      MINIJUEGO_NODOS_METRICAS.botonAlto,
    );
    this.btnContinuar.setVisible(false);

    host.add([
      this.capaPuertos,
      this.capaTablero,
      this.capaPista,
      this.capaFoco,
      ...etiquetasPuertos,
      ...zonasCeldas,
      this.textoEstado,
      this.btnContinuar,
    ]);

    this.configurarTeclado(host.scene);
    this.redibujarTablero();
  }

  public update(dtSeg: number): void {
    if (!this.celdaPista || !this.capaPista || this.tablero?.completado) {
      return;
    }
    if (!getAjustes().movimientoReducido) {
      this.fasePista += dtSeg * 3.2;
      this.dibujarResaltadoPista();
    }
  }

  public mostrarPista(): void {
    if (!this.tablero || this.tablero.completado) {
      return;
    }
    for (let fila = 0; fila < this.tablero.filas; fila++) {
      for (let col = 0; col < this.tablero.cols; col++) {
        if (!this.tablero.celdas[fila][col].energizado) {
          this.celdaPista = { col, fila };
          this.fasePista = 0;
          this.dibujarResaltadoPista();
          return;
        }
      }
    }
  }

  public destroy(): void {
    this.desuscribirTeclado?.();
    this.desuscribirTeclado = null;
    this.host?.removeAll(true);
    this.host = null;
    this.capaPuertos = null;
    this.capaTablero = null;
    this.capaPista = null;
    this.capaFoco = null;
    this.textoEstado = null;
    this.btnContinuar = null;
    this.tablero = null;
    this.onResult = null;
    this.celdaPista = null;
  }

  private obtenerOrigenGrid(cx: number, cy: number): { x0: number; y0: number } {
    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const totalW = NODOS_COLS * tam + (NODOS_COLS - 1) * sep;
    const totalH = NODOS_FILAS * tam + (NODOS_FILAS - 1) * sep;
    return {
      x0: cx - totalW / 2,
      y0: cy - totalH / 2,
    };
  }

  private crearZonasTablero(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Zone[] {
    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const { x0, y0 } = this.obtenerOrigenGrid(cx, cy);
    const zonas: Phaser.GameObjects.Zone[] = [];

    for (let fila = 0; fila < NODOS_FILAS; fila++) {
      for (let col = 0; col < NODOS_COLS; col++) {
        const zx = x0 + col * (tam + sep) + tam / 2;
        const zy = y0 + fila * (tam + sep) + tam / 2;

        const zona = scene.add
          .zone(zx, zy, tam, tam)
          .setInteractive({ useHandCursor: true });

        zona.on('pointerdown', () => {
          this.focusCol = col;
          this.focusFila = fila;
          this.focoVisible = false;
          this.alTocarCelda(col, fila);
        });

        zonas.push(zona);
      }
    }

    return zonas;
  }

  private crearEtiquetasPuertos(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
  ): Phaser.GameObjects.Text[] {
    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const { x0, y0 } = this.obtenerOrigenGrid(cx, cy);
    const totalW = NODOS_COLS * tam + (NODOS_COLS - 1) * sep;
    const filaMediaY = y0 + Math.floor(NODOS_FILAS / 2) * (tam + sep) + tam / 2;
    const anchoBadge = MINIJUEGO_NODOS_METRICAS.badgePuertoAncho;
    const tamPuerto = escalarTamanoTexto(
      TAMANOS_TEXTO.minimo,
      getAjustes().textoGrande,
      20,
    );

    const entradaTxt = scene.add
      .text(x0 - 24 - anchoBadge / 2, filaMediaY, t('minijuegoNodos.fuente'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamPuerto}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.energia,
      })
      .setOrigin(0.5);

    const salidaTxt = scene.add
      .text(
        x0 + totalW + 24 + anchoBadge / 2,
        filaMediaY,
        t('minijuegoNodos.salida'),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${tamPuerto}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        },
      )
      .setOrigin(0.5);

    return [entradaTxt, salidaTxt];
  }

  private configurarTeclado(scene: Phaser.Scene): void {
    const teclado = scene.input.keyboard;
    if (!teclado) {
      return;
    }

    const alPulsar = (ev: KeyboardEvent): void => {
      if (ev.repeat || !this.tablero) {
        return;
      }

      if (this.tablero.completado) {
        if (ev.code === 'Space' || ev.code === 'Enter') {
          ev.preventDefault();
          this.onResult?.('exito');
        }
        return;
      }

      if (ev.code === 'ArrowLeft') {
        ev.preventDefault();
        this.focusCol = (this.focusCol - 1 + NODOS_COLS) % NODOS_COLS;
        this.focoVisible = true;
        this.dibujarFoco();
      } else if (ev.code === 'ArrowRight') {
        ev.preventDefault();
        this.focusCol = (this.focusCol + 1) % NODOS_COLS;
        this.focoVisible = true;
        this.dibujarFoco();
      } else if (ev.code === 'ArrowUp') {
        ev.preventDefault();
        this.focusFila = (this.focusFila - 1 + NODOS_FILAS) % NODOS_FILAS;
        this.focoVisible = true;
        this.dibujarFoco();
      } else if (ev.code === 'ArrowDown') {
        ev.preventDefault();
        this.focusFila = (this.focusFila + 1) % NODOS_FILAS;
        this.focoVisible = true;
        this.dibujarFoco();
      } else if (ev.code === 'Space' || ev.code === 'Enter') {
        ev.preventDefault();
        this.focoVisible = true;
        this.alTocarCelda(this.focusCol, this.focusFila);
      }
    };

    teclado.on('keydown', alPulsar);
    this.desuscribirTeclado = () => {
      teclado.off('keydown', alPulsar);
    };
  }

  private dibujarFoco(): void {
    if (!this.capaFoco || !this.tablero) {
      return;
    }
    this.capaFoco.clear();
    if (this.tablero.completado) {
      const altoPanel = MINIJUEGO_NODOS_METRICAS.panelAlto;
      const bw = MINIJUEGO_NODOS_METRICAS.botonAncho + 40;
      const bh = MINIJUEGO_NODOS_METRICAS.botonAlto;
      const by = altoPanel / 2 - 42;
      this.capaFoco.lineStyle(4, COLORES.focoBorde, 1);
      this.capaFoco.strokeRoundedRect(
        -bw / 2 - 5,
        by - bh / 2 - 5,
        bw + 10,
        bh + 10,
        ESPACIADO.radioBoton + 4,
      );
      return;
    }
    if (!this.focoVisible) {
      return;
    }
    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const { x0, y0 } = this.obtenerOrigenGrid(0, 12);
    const fx = x0 + this.focusCol * (tam + sep);
    const fy = y0 + this.focusFila * (tam + sep);
    this.capaFoco.lineStyle(4, COLORES.focoBorde, 1);
    this.capaFoco.strokeRoundedRect(
      fx - 4,
      fy - 4,
      tam + 8,
      tam + 8,
      ESPACIADO.radioBoton + 3,
    );
  }

  private alTocarCelda(col: number, fila: number): void {
    if (!this.tablero || this.tablero.completado) {
      return;
    }
    this.celdaPista = null;
    this.capaPista?.clear();
    this.tablero = rotarCeldaNodos(this.tablero, col, fila);
    this.redibujarTablero();
  }

  private dibujarResaltadoPista(): void {
    if (!this.capaPista || !this.celdaPista) {
      return;
    }
    this.capaPista.clear();
    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const { x0, y0 } = this.obtenerOrigenGrid(0, 12);
    const x = x0 + this.celdaPista.col * (tam + sep);
    const y = y0 + this.celdaPista.fila * (tam + sep);
    const alpha = getAjustes().movimientoReducido
      ? 0.9
      : 0.5 + 0.35 * Math.sin(this.fasePista);

    this.capaPista.lineStyle(4, COLORES.aire, alpha);
    this.capaPista.strokeRoundedRect(
      x - 3,
      y - 3,
      tam + 6,
      tam + 6,
      ESPACIADO.radioBoton + 2,
    );
  }

  private redibujarTablero(): void {
    if (!this.tablero || !this.capaTablero || !this.capaPuertos) {
      return;
    }

    const tam = MINIJUEGO_NODOS_METRICAS.celdaTamano;
    const sep = MINIJUEGO_NODOS_METRICAS.celdaSeparacion;
    const { x0, y0 } = this.obtenerOrigenGrid(0, 12);
    const totalW = NODOS_COLS * tam + (NODOS_COLS - 1) * sep;
    const filaMediaY = y0 + this.tablero.filaEntrada * (tam + sep) + tam / 2;

    this.dibujarPuertos(
      x0,
      totalW,
      filaMediaY,
      this.tablero.completado,
    );

    this.capaTablero.clear();
    for (let fila = 0; fila < this.tablero.filas; fila++) {
      for (let col = 0; col < this.tablero.cols; col++) {
        const celda = this.tablero.celdas[fila][col];
        const cellX = x0 + col * (tam + sep);
        const cellY = y0 + fila * (tam + sep);
        this.dibujarCelda(
          this.capaTablero,
          celda,
          cellX,
          cellY,
          tam,
          this.tablero.completado,
        );
      }
    }

    if (this.tablero.completado) {
      this.capaPista?.clear();
      this.textoEstado?.setText(t('minijuegoNodos.completado'));
      this.btnContinuar?.setVisible(true);
    } else {
      this.textoEstado?.setText('');
      this.btnContinuar?.setVisible(false);
    }
    this.dibujarFoco();
  }

  private dibujarPuertos(
    x0: number,
    totalW: number,
    filaMediaY: number,
    completado: boolean,
  ): void {
    if (!this.capaPuertos) {
      return;
    }
    const g = this.capaPuertos;
    g.clear();

    const anchoBadge = MINIJUEGO_NODOS_METRICAS.badgePuertoAncho;
    const altoBadge = MINIJUEGO_NODOS_METRICAS.badgePuertoAlto;

    const xEntrada = x0 - 24 - anchoBadge;
    g.fillStyle(COLORES.botonFondo, 1);
    g.fillRoundedRect(
      xEntrada,
      filaMediaY - altoBadge / 2,
      anchoBadge,
      altoBadge,
      ESPACIADO.radioBoton,
    );
    g.lineStyle(2.5, COLORES.energia, 1);
    g.strokeRoundedRect(
      xEntrada,
      filaMediaY - altoBadge / 2,
      anchoBadge,
      altoBadge,
      ESPACIADO.radioBoton,
    );
    g.lineStyle(8, completado ? COLORES.ok : COLORES.energia, 1);
    g.lineBetween(xEntrada + anchoBadge, filaMediaY, x0, filaMediaY);

    const xSalida = x0 + totalW + 24;
    const colorSalida = completado ? COLORES.ok : COLORES.bordePanel;
    g.fillStyle(COLORES.botonFondo, 1);
    g.fillRoundedRect(
      xSalida,
      filaMediaY - altoBadge / 2,
      anchoBadge,
      altoBadge,
      ESPACIADO.radioBoton,
    );
    g.lineStyle(2.5, colorSalida, 1);
    g.strokeRoundedRect(
      xSalida,
      filaMediaY - altoBadge / 2,
      anchoBadge,
      altoBadge,
      ESPACIADO.radioBoton,
    );
    g.lineStyle(8, completado ? COLORES.ok : COLORES.bordePanel, 1);
    g.lineBetween(x0 + totalW, filaMediaY, xSalida, filaMediaY);
  }

  private dibujarCelda(
    g: Phaser.GameObjects.Graphics,
    celda: CeldaNodos,
    x: number,
    y: number,
    tam: number,
    completado: boolean,
  ): void {
    const fondoColor =
      completado && celda.energizado
        ? 0x17332b
        : celda.energizado
          ? 0x1b274b
          : COLORES.pistaBarra;

    const bordeColor =
      completado && celda.energizado
        ? COLORES.ok
        : celda.energizado
          ? COLORES.energia
          : COLORES.bordePanel;

    g.fillStyle(fondoColor, 1);
    g.fillRoundedRect(x, y, tam, tam, ESPACIADO.radioBoton);
    g.lineStyle(2.5, bordeColor, 1);
    g.strokeRoundedRect(x, y, tam, tam, ESPACIADO.radioBoton);

    const cx = x + tam / 2;
    const cy = y + tam / 2;
    const mitad = tam / 2;
    const grosor = MINIJUEGO_NODOS_METRICAS.grosorCable;

    const colorCable =
      completado && celda.energizado
        ? COLORES.ok
        : celda.energizado
          ? COLORES.energia
          : 0x5c6b9c;

    const conexiones = obtenerConexionesCelda(celda.tipo, celda.rotacion);

    g.lineStyle(grosor, colorCable, 1);
    for (const dir of conexiones) {
      let tx = cx;
      let ty = cy;
      if (dir === 'N') ty = y + 4;
      if (dir === 'S') ty = y + tam - 4;
      if (dir === 'O') tx = x + 4;
      if (dir === 'E') tx = x + tam - 4;

      g.lineBetween(cx, cy, tx, ty);

      // Brillo metálico central en el conducto
      g.lineStyle(
        Math.max(3, Math.round(grosor * 0.25)),
        COLORES.astronautaReflejo,
        celda.energizado ? 0.55 : 0.22,
      );
      g.lineBetween(cx, cy, tx, ty);
      g.lineStyle(grosor, colorCable, 1);

      // Collarín de unión en el puerto de salida
      g.fillStyle(COLORES.bordePanel, 1);
      g.fillCircle(tx, ty, grosor * 0.56);
      g.fillStyle(colorCable, 1);
      g.fillCircle(tx, ty, grosor * 0.42);
    }

    // Nodo central con anillo metálico de acople
    g.fillStyle(COLORES.bordePanel, 1);
    g.fillCircle(cx, cy, grosor * 0.85);
    g.fillStyle(colorCable, 1);
    g.fillCircle(cx, cy, grosor * 0.7);
    g.lineStyle(2, COLORES.astronautaReflejo, celda.energizado ? 0.6 : 0.25);
    g.strokeCircle(cx, cy, grosor * 0.52);
    g.fillStyle(fondoColor, 1);
    g.fillCircle(cx, cy, Math.max(4, mitad * 0.14));
  }

  private crearBotonContinuar(
    scene: Phaser.Scene,
    cx: number,
    cy: number,
    ancho: number,
    alto: number,
  ): Phaser.GameObjects.Container {
    const fondo = scene.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(COLORES.ok, hover ? 0.9 : 1);
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

    const texto = scene.add
      .text(0, 0, t('minijuegoNodos.continuar'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, getAjustes().textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.botonTextoOscuro,
      })
      .setOrigin(0.5);

    const zona = scene.add
      .zone(0, 0, ancho, alto)
      .setInteractive({ useHandCursor: true });

    const contenedor = scene.add.container(cx, cy, [fondo, texto, zona]);

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
      this.onResult?.('exito');
    });

    return contenedor;
  }
}
