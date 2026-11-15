// Vista del minijuego "Válvulas" adaptada a MinigameView

import Phaser from 'phaser';
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
import type { MinigameParams, MinigameResult, MinigameView } from '../types';
import {
  generarNivel,
  pulsarValvula,
  resultado,
  tick,
  type EstadoValvulas,
  type FormaValvula,
  type ValvulaItem,
} from '../valvulas';

interface NodoValvulaVisual {
  item: ValvulaItem;
  baseX: number;
  baseY: number;
  contenedor: Phaser.GameObjects.Container;
  fondo: Phaser.GameObjects.Graphics;
  etiquetaEstado: Phaser.GameObjects.Text;
}

export class ValvulasView implements MinigameView {
  private host: Phaser.GameObjects.Container | null = null;
  private estado: EstadoValvulas | null = null;
  private onResult: ((r: MinigameResult) => void) | null = null;

  private capaTuberia: Phaser.GameObjects.Graphics | null = null;
  private capaMedidor: Phaser.GameObjects.Graphics | null = null;
  private textoMedidor: Phaser.GameObjects.Text | null = null;
  private textoResultado: Phaser.GameObjects.Text | null = null;
  private nodos: NodoValvulaVisual[] = [];

  private focusVisualIdx = 0;
  private pistaActiva = false;
  private fasePista = 0;
  private shakeId: number | null = null;
  private shakeTimer = 0;
  private notificado = false;
  private cierreTimer = 0;
  private resultadoPendiente: MinigameResult | null = null;
  private desuscribirTeclado: (() => void) | null = null;

  public start(
    host: Phaser.GameObjects.Container,
    params: MinigameParams,
    onResult: (r: MinigameResult) => void,
  ): void {
    this.host = host;
    this.onResult = onResult;
    this.nodos = [];
    this.focusVisualIdx = 0;
    this.pistaActiva = false;
    this.fasePista = 0;
    this.shakeId = null;
    this.shakeTimer = 0;
    this.notificado = false;
    this.cierreTimer = 0;
    this.resultadoPendiente = null;

    this.estado = generarNivel(params.pasos, params.semilla, params.tiempoLimite);

    const scene = host.scene;
    const textoGrande = getAjustes().textoGrande;
    this.capaMedidor = scene.add.graphics();
    this.textoMedidor = scene.add
      .text(0, -130, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.capaTuberia = scene.add.graphics();

    const altoPanel = MINIJUEGO_NODOS_METRICAS.panelAlto;
    this.textoResultado = scene.add
      .text(0, altoPanel / 2 - 90, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.ok,
      })
      .setOrigin(0.5);

    host.add([
      this.capaMedidor,
      this.textoMedidor,
      this.capaTuberia,
      this.textoResultado,
    ]);

    this.crearNodosVisuales(scene, host);
    this.configurarTeclado(scene);
    this.redibujar();
  }

  public update(dtSeg: number): void {
    if (!this.estado) {
      return;
    }

    if (this.resultadoPendiente !== null && !this.notificado) {
      this.cierreTimer -= dtSeg;
      if (this.cierreTimer <= 0) {
        this.notificado = true;
        this.onResult?.(this.resultadoPendiente);
      }
      return;
    }

    if (this.shakeTimer > 0 && this.shakeId !== null) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dtSeg);
      const nodoError = this.nodos.find((n) => n.item.id === this.shakeId);
      if (nodoError) {
        const offsetX =
          this.shakeTimer > 0 && !getAjustes().movimientoReducido
            ? Math.sin(this.shakeTimer * 48) * 5 * (this.shakeTimer / 0.24)
            : 0;
        nodoError.contenedor.setPosition(nodoError.baseX + offsetX, nodoError.baseY);
      }
      if (this.shakeTimer === 0) {
        this.shakeId = null;
      }
    }

    if (this.pistaActiva && !getAjustes().movimientoReducido) {
      this.fasePista += dtSeg * 3;
    }

    this.estado = tick(this.estado, dtSeg);
    this.sincronizarItems();
    this.redibujarMedidor();
    this.redibujarNodos();

    const res = resultado(this.estado);
    if (res !== 'jugando' && this.resultadoPendiente === null) {
      this.programarResultado(res);
    }
  }

  public mostrarPista(): void {
    if (!this.estado || resultado(this.estado) !== 'jugando') {
      return;
    }
    this.pistaActiva = true;
    this.fasePista = 0;
    this.redibujarNodos();
  }

  public destroy(): void {
    this.desuscribirTeclado?.();
    this.desuscribirTeclado = null;
    this.host?.removeAll(true);
    this.host = null;
    this.estado = null;
    this.capaTuberia = null;
    this.capaMedidor = null;
    this.textoMedidor = null;
    this.textoResultado = null;
    this.nodos = [];
    this.onResult = null;
  }

  private crearNodosVisuales(
    scene: Phaser.Scene,
    host: Phaser.GameObjects.Container,
  ): void {
    if (!this.estado) {
      return;
    }
    const cantidad = this.estado.valvulas.length;
    const anchoDisp = 580;
    const pasoX = cantidad > 1 ? anchoDisp / (cantidad - 1) : 0;
    const xInicio = -anchoDisp / 2;
    const yCentro = 18;
    const tamZona = 96;

    this.estado.valvulas.forEach((item, posIdx) => {
      const bx = xInicio + posIdx * pasoX;
      const by = yCentro;

      const fondo = scene.add.graphics();
      const numTexto = scene.add
        .text(0, 0, `${item.id}`, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: '26px',
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        })
        .setOrigin(0.5);

      const etiquetaEstado = scene.add
        .text(0, 56, '', {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, getAjustes().textoGrande, 20)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.ok,
        })
        .setOrigin(0.5);

      const zona = scene.add
        .zone(0, 0, tamZona, tamZona)
        .setInteractive({ useHandCursor: true });

      const contenedor = scene.add.container(bx, by, [
        fondo,
        numTexto,
        etiquetaEstado,
        zona,
      ]);

      zona.on('pointerdown', () => {
        this.focusVisualIdx = posIdx;
        this.intentarCerrar(item.id);
      });

      host.add(contenedor);
      this.nodos.push({
        item,
        baseX: bx,
        baseY: by,
        contenedor,
        fondo,
        etiquetaEstado,
      });
    });
  }

  private configurarTeclado(scene: Phaser.Scene): void {
    const teclado = scene.input.keyboard;
    if (!teclado) {
      return;
    }

    const alPulsar = (ev: KeyboardEvent): void => {
      if (ev.repeat || !this.estado || this.resultadoPendiente !== null) {
        return;
      }
      const total = this.nodos.length;
      if (total === 0) {
        return;
      }
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowUp') {
        this.focusVisualIdx = (this.focusVisualIdx - 1 + total) % total;
        this.redibujarNodos();
      } else if (ev.code === 'ArrowRight' || ev.code === 'ArrowDown') {
        this.focusVisualIdx = (this.focusVisualIdx + 1) % total;
        this.redibujarNodos();
      } else if (ev.code === 'Space' || ev.code === 'Enter') {
        const nodo = this.nodos[this.focusVisualIdx];
        if (nodo) {
          this.intentarCerrar(nodo.item.id);
        }
      }
    };

    teclado.on('keydown', alPulsar);
    this.desuscribirTeclado = () => {
      teclado.off('keydown', alPulsar);
    };
  }

  private intentarCerrar(id: number): void {
    if (!this.estado || this.resultadoPendiente !== null) {
      return;
    }
    const anterior = this.estado;
    const siguiente = pulsarValvula(anterior, id);
    this.estado = siguiente;
    this.sincronizarItems();

    if (siguiente.ultimoAciertoId === id) {
      this.pistaActiva = false;
    } else if (siguiente.ultimoErrorId === id && !getAjustes().movimientoReducido) {
      this.shakeId = id;
      this.shakeTimer = 0.24;
    }

    this.redibujar();

    const res = resultado(siguiente);
    if (res !== 'jugando') {
      this.programarResultado(res);
    }
  }

  private programarResultado(res: 'exito' | 'fallo'): void {
    this.resultadoPendiente = res;
    this.cierreTimer = 0.45;
    if (this.textoResultado) {
      this.textoResultado.setColor(
        res === 'exito' ? COLORES_HEX.ok : COLORES_HEX.peligro,
      );
      this.textoResultado.setText(
        res === 'exito'
          ? t('minijuegoValvulas.completado')
          : t('minijuegoValvulas.fallo'),
      );
    }
  }

  private sincronizarItems(): void {
    if (!this.estado) {
      return;
    }
    for (const nodo of this.nodos) {
      const actualizado = this.estado.valvulas.find(
        (v) => v.id === nodo.item.id,
      );
      if (actualizado) {
        nodo.item = actualizado;
      }
    }
  }

  private redibujar(): void {
    this.redibujarMedidor();
    this.redibujarTuberiaYFlechas();
    this.redibujarNodos();
  }

  private redibujarMedidor(): void {
    if (!this.estado || !this.capaMedidor || !this.textoMedidor) {
      return;
    }
    const valor = this.estado.medidor;
    this.textoMedidor.setText(
      t('minijuegoValvulas.medidorFuga', { valor: Math.round(valor) }),
    );

    const anchoBarra = 480;
    const altoBarra = 22;
    const x = -anchoBarra / 2;
    const y = -104;

    const color =
      valor >= 75
        ? COLORES.peligro
        : valor >= 50
          ? COLORES.aviso
          : COLORES.aire;

    const g = this.capaMedidor;
    g.clear();
    g.fillStyle(COLORES.pistaBarra, 1);
    g.fillRoundedRect(x, y, anchoBarra, altoBarra, ESPACIADO.radioBarra);
    const fillW = Math.max(0, Math.min(1, valor / 100)) * anchoBarra;
    if (fillW > 0) {
      g.fillStyle(color, 1);
      g.fillRoundedRect(x, y, fillW, altoBarra, ESPACIADO.radioBarra);
    }
    g.lineStyle(2, COLORES.bordePanel, 1);
    g.strokeRoundedRect(x, y, anchoBarra, altoBarra, ESPACIADO.radioBarra);
  }

  private redibujarTuberiaYFlechas(): void {
    if (!this.capaTuberia || this.nodos.length === 0) {
      return;
    }
    const g = this.capaTuberia;
    g.clear();

    const primero = this.nodos[0];
    const ultimo = this.nodos[this.nodos.length - 1];

    // Tubería horizontal principal con brillo metálico y bridas de acople
    g.lineStyle(18, 0x263156, 1);
    g.lineBetween(primero.baseX - 36, primero.baseY, ultimo.baseX + 36, ultimo.baseY);
    g.lineStyle(4, COLORES.astronautaReflejo, 0.18);
    g.lineBetween(primero.baseX - 36, primero.baseY - 4, ultimo.baseX + 36, ultimo.baseY - 4);
    g.lineStyle(4, COLORES.bordePanel, 1);
    g.lineBetween(primero.baseX - 36, primero.baseY - 9, ultimo.baseX + 36, ultimo.baseY - 9);
    g.lineBetween(primero.baseX - 36, primero.baseY + 9, ultimo.baseX + 36, ultimo.baseY + 9);

    for (const nodo of this.nodos) {
      g.fillStyle(COLORES.bordePanel, 1);
      g.fillRoundedRect(nodo.baseX - 46, nodo.baseY - 12, 6, 24, 2);
      g.fillRoundedRect(nodo.baseX + 40, nodo.baseY - 12, 6, 24, 2);
    }

    // Rutas de flujo real 1 -> 2 -> 3... con flechas direccionales claras
    const ordenados = [...this.nodos].sort((a, b) => a.item.id - b.item.id);
    for (let i = 0; i < ordenados.length - 1; i++) {
      const a = ordenados[i];
      const b = ordenados[i + 1];
      const arriba = i % 2 === 0;
      const carrilY = arriba ? -56 - Math.floor(i / 2) * 16 : 92 + Math.floor(i / 2) * 16;

      g.lineStyle(3, COLORES.aire, 0.85);
      g.beginPath();
      g.moveTo(a.baseX, a.baseY + (arriba ? -44 : 44));
      g.lineTo(a.baseX, carrilY);
      g.lineTo(b.baseX, carrilY);
      g.lineTo(b.baseX, b.baseY + (arriba ? -44 : 44));
      g.strokePath();

      // Punta de flecha en el tramo horizontal indicando dirección a -> b
      const midX = (a.baseX + b.baseX) / 2;
      const dir = b.baseX >= a.baseX ? 1 : -1;
      g.fillStyle(COLORES.aire, 1);
      g.fillTriangle(
        midX + dir * 9,
        carrilY,
        midX - dir * 6,
        carrilY - 6,
        midX - dir * 6,
        carrilY + 6,
      );
    }
  }

  private redibujarNodos(): void {
    if (!this.estado) {
      return;
    }

    this.nodos.forEach((nodo, idx) => {
      const esFoco = idx === this.focusVisualIdx;
      const esPista =
        this.pistaActiva &&
        !nodo.item.cerrada &&
        nodo.item.id === this.estado?.siguienteId;

      const colorFondo = nodo.item.cerrada ? 0x17332b : COLORES.botonFondo;
      const colorBorde = nodo.item.cerrada
        ? COLORES.ok
        : esFoco
          ? COLORES.aire
          : COLORES.energia;

      const g = nodo.fondo;
      g.clear();

      if (esPista) {
        const alpha = getAjustes().movimientoReducido
          ? 0.9
          : 0.55 + 0.35 * Math.sin(this.fasePista);
        g.lineStyle(5, COLORES.aire, alpha);
        this.dibujarForma(g, nodo.item.forma, 48);
      }

      g.fillStyle(colorFondo, 1);
      this.rellenarForma(g, nodo.item.forma, 40);

      // Radios y aro sutil de volante de válvula conservando la silueta exterior
      g.lineStyle(2, COLORES.astronautaReflejo, nodo.item.cerrada ? 0.25 : 0.16);
      g.lineBetween(-22, 0, 22, 0);
      g.lineBetween(0, -22, 0, 22);
      g.strokeCircle(0, 0, 22);

      g.lineStyle(esFoco ? 4 : 3, colorBorde, 1);
      this.dibujarForma(g, nodo.item.forma, 40);

      nodo.etiquetaEstado.setText(
        nodo.item.cerrada ? t('minijuegoValvulas.estadoCerrada') : '',
      );
    });
  }

  private rellenarForma(
    g: Phaser.GameObjects.Graphics,
    forma: FormaValvula,
    radio: number,
  ): void {
    if (forma === 'circulo') {
      g.fillCircle(0, 0, radio);
    } else if (forma === 'cuadrado') {
      g.fillRoundedRect(-radio, -radio, radio * 2, radio * 2, 10);
    } else {
      g.fillPoints(this.puntosPoligono(forma, radio), true);
    }
  }

  private dibujarForma(
    g: Phaser.GameObjects.Graphics,
    forma: FormaValvula,
    radio: number,
  ): void {
    if (forma === 'circulo') {
      g.strokeCircle(0, 0, radio);
    } else if (forma === 'cuadrado') {
      g.strokeRoundedRect(-radio, -radio, radio * 2, radio * 2, 10);
    } else {
      g.strokePoints(this.puntosPoligono(forma, radio), true);
    }
  }

  private puntosPoligono(
    forma: FormaValvula,
    radio: number,
  ): Phaser.Math.Vector2[] {
    if (forma === 'triangulo') {
      return [
        new Phaser.Math.Vector2(0, -radio),
        new Phaser.Math.Vector2(radio * 0.95, radio * 0.85),
        new Phaser.Math.Vector2(-radio * 0.95, radio * 0.85),
      ];
    }
    if (forma === 'rombo') {
      return [
        new Phaser.Math.Vector2(0, -radio),
        new Phaser.Math.Vector2(radio, 0),
        new Phaser.Math.Vector2(0, radio),
        new Phaser.Math.Vector2(-radio, 0),
      ];
    }
    // Hexágono
    const puntos: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 6; i++) {
      const ang = (Math.PI / 3) * i - Math.PI / 6;
      puntos.push(
        new Phaser.Math.Vector2(Math.cos(ang) * radio, Math.sin(ang) * radio),
      );
    }
    return puntos;
  }
}
