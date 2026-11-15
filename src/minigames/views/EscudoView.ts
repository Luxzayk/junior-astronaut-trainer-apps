// Vista del minijuego "Escudo" adaptada a MinigameView

import Phaser from 'phaser';
import { getAjustes } from '../../game/settings';
import { t } from '../../i18n';
import { dibujarIconoEnergia, dibujarIconoEscudo } from '../../ui/icons';
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
  alineados,
  calcularConsumoEnergia,
  generarNivel,
  proteccion,
  resultado,
  rotarPanel,
  tick,
  type DireccionTormenta,
  type NivelEscudo,
} from '../escudo';
import type { MinigameParams, MinigameResult, MinigameView } from '../types';

interface PanelVisual {
  id: number;
  contenedor: Phaser.GameObjects.Container;
  fondo: Phaser.GameObjects.Graphics;
  textoDir: Phaser.GameObjects.Text;
  textoMarca: Phaser.GameObjects.Text;
}

const ANGULO_POR_DIRECCION: Record<DireccionTormenta, number> = {
  N: -Math.PI / 2,
  E: 0,
  S: Math.PI / 2,
  O: Math.PI,
};

export class EscudoView implements MinigameView {
  private host: Phaser.GameObjects.Container | null = null;
  private nivel: NivelEscudo | null = null;
  private onResult: ((r: MinigameResult) => void) | null = null;

  private capaIndicadores: Phaser.GameObjects.Graphics | null = null;
  private textoProteccion: Phaser.GameObjects.Text | null = null;
  private textoConsumo: Phaser.GameObjects.Text | null = null;
  private textoResultado: Phaser.GameObjects.Text | null = null;
  private panelesVisuales: PanelVisual[] = [];

  private focusIdx = 0;
  private pistaActiva = false;
  private fasePista = 0;
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
    this.panelesVisuales = [];
    this.focusIdx = 0;
    this.pistaActiva = false;
    this.fasePista = 0;
    this.notificado = false;
    this.cierreTimer = 0;
    this.resultadoPendiente = null;

    this.nivel = generarNivel(params.pasos, params.semilla, params.tiempoLimite);
    const scene = host.scene;
    const textoGrande = getAjustes().textoGrande;

    // Dirección de la tormenta (flecha grande superior + etiqueta)
    const gTormenta = scene.add.graphics();
    this.dibujarFlecha(gTormenta, -145, -108, 22, this.nivel.objetivo, COLORES.aviso);

    const nombreDir = t(`minijuegoEscudo.direcciones.${this.nivel.objetivo}`);
    const textoTormenta = scene.add
      .text(-110, -108, t('minijuegoEscudo.tormentaDesde', { dir: nombreDir }), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 24)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aviso,
      })
      .setOrigin(0, 0.5);

    // Indicadores en vivo: Protección estimada (%) y Consumo de energía
    this.capaIndicadores = scene.add.graphics();
    const tamInd = escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20);
    this.textoProteccion = scene.add
      .text(-165, -54, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamInd}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.escudo,
      })
      .setOrigin(0.5);

    this.textoConsumo = scene.add
      .text(175, -54, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamInd}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.energia,
      })
      .setOrigin(0.5);

    const avisoFijo = scene.add
      .text(0, 140, t('minijuegoEscudo.avisoSimulacion'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamInd}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0.5);

    const altoPanel = MINIJUEGO_NODOS_METRICAS.panelAlto;
    this.textoResultado = scene.add
      .text(0, altoPanel / 2 - 88, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.ok,
      })
      .setOrigin(0.5);

    host.add([
      gTormenta,
      textoTormenta,
      this.capaIndicadores,
      this.textoProteccion,
      this.textoConsumo,
      avisoFijo,
      this.textoResultado,
    ]);

    this.crearPaneles(scene, host);
    this.configurarTeclado(scene);
    this.redibujar();
  }

  public update(dtSeg: number): void {
    if (!this.nivel) {
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

    if (this.pistaActiva && !getAjustes().movimientoReducido) {
      this.fasePista += dtSeg * 3;
      this.redibujarPaneles();
    }

    this.nivel = tick(this.nivel, dtSeg);
    const res = resultado(this.nivel);
    if (res !== 'jugando' && this.resultadoPendiente === null) {
      this.programarResultado(res);
    }
  }

  public mostrarPista(): void {
    if (!this.nivel || resultado(this.nivel) !== 'jugando') {
      return;
    }
    this.pistaActiva = true;
    this.fasePista = 0;
    this.redibujarPaneles();
  }

  public destroy(): void {
    this.desuscribirTeclado?.();
    this.desuscribirTeclado = null;
    this.host?.removeAll(true);
    this.host = null;
    this.nivel = null;
    this.capaIndicadores = null;
    this.textoProteccion = null;
    this.textoConsumo = null;
    this.textoResultado = null;
    this.panelesVisuales = [];
    this.onResult = null;
  }

  private crearPaneles(
    scene: Phaser.Scene,
    host: Phaser.GameObjects.Container,
  ): void {
    if (!this.nivel) {
      return;
    }
    const cantidad = this.nivel.paneles.length;
    const tam = 104;
    const sep = 18;
    const totalW = cantidad * tam + (cantidad - 1) * sep;
    const xInicio = -totalW / 2 + tam / 2;
    const yCentro = 48;

    this.nivel.paneles.forEach((panel, idx) => {
      const px = xInicio + idx * (tam + sep);
      const fondo = scene.add.graphics();
      const tamPanelTexto = escalarTamanoTexto(
        TAMANOS_TEXTO.minimo,
        getAjustes().textoGrande,
        20,
      );
      const textoDir = scene.add
        .text(0, 26, panel.direccion, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${tamPanelTexto}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        })
        .setOrigin(0.5);

      const textoMarca = scene.add
        .text(0, -34, '', {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${tamPanelTexto}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.ok,
        })
        .setOrigin(0.5);

      const zona = scene.add
        .zone(0, 0, tam, tam)
        .setInteractive({ useHandCursor: true });

      const contenedor = scene.add.container(px, yCentro, [
        fondo,
        textoDir,
        textoMarca,
        zona,
      ]);

      zona.on('pointerdown', () => {
        this.focusIdx = idx;
        this.girarPanel(panel.id);
      });

      host.add(contenedor);
      this.panelesVisuales.push({
        id: panel.id,
        contenedor,
        fondo,
        textoDir,
        textoMarca,
      });
    });
  }

  private configurarTeclado(scene: Phaser.Scene): void {
    const teclado = scene.input.keyboard;
    if (!teclado) {
      return;
    }

    const alPulsar = (ev: KeyboardEvent): void => {
      if (ev.repeat || !this.nivel || this.resultadoPendiente !== null) {
        return;
      }
      const total = this.panelesVisuales.length;
      if (total === 0) {
        return;
      }
      if (ev.code === 'ArrowLeft' || ev.code === 'ArrowUp') {
        this.focusIdx = (this.focusIdx - 1 + total) % total;
        this.redibujarPaneles();
      } else if (ev.code === 'ArrowRight' || ev.code === 'ArrowDown') {
        this.focusIdx = (this.focusIdx + 1) % total;
        this.redibujarPaneles();
      } else if (ev.code === 'Space' || ev.code === 'Enter') {
        const panel = this.panelesVisuales[this.focusIdx];
        if (panel) {
          this.girarPanel(panel.id);
        }
      }
    };

    teclado.on('keydown', alPulsar);
    this.desuscribirTeclado = () => {
      teclado.off('keydown', alPulsar);
    };
  }

  private girarPanel(id: number): void {
    if (!this.nivel || this.resultadoPendiente !== null) {
      return;
    }
    const antesAlineados = alineados(this.nivel);
    this.nivel = rotarPanel(this.nivel, id);
    if (alineados(this.nivel) > antesAlineados) {
      this.pistaActiva = false;
    }
    this.redibujar();

    const res = resultado(this.nivel);
    if (res !== 'jugando') {
      this.programarResultado(res);
    }
  }

  private programarResultado(res: 'exito' | 'fallo'): void {
    this.resultadoPendiente = res;
    this.cierreTimer = 0.45;
    if (this.textoResultado && res === 'exito') {
      this.textoResultado.setText(t('minijuegoEscudo.completado'));
    }
  }

  private redibujar(): void {
    this.redibujarIndicadores();
    this.redibujarPaneles();
  }

  private redibujarIndicadores(): void {
    if (
      !this.nivel ||
      !this.capaIndicadores ||
      !this.textoProteccion ||
      !this.textoConsumo
    ) {
      return;
    }

    const prot = proteccion(this.nivel);
    const consumo = calcularConsumoEnergia(this.nivel);

    this.textoProteccion.setText(
      t('minijuegoEscudo.proteccionEstimada', { porcentaje: Math.round(prot) }),
    );
    this.textoConsumo.setText(
      t('minijuegoEscudo.consumoEnergia', { valor: Math.round(consumo) }),
    );

    const g = this.capaIndicadores;
    g.clear();

    // Caja Protección
    g.fillStyle(COLORES.pistaBarra, 1);
    g.fillRoundedRect(-330, -76, 320, 44, ESPACIADO.radioBarra);
    g.lineStyle(2, COLORES.escudo, 0.9);
    g.strokeRoundedRect(-330, -76, 320, 44, ESPACIADO.radioBarra);
    dibujarIconoEscudo(g, -308, -54, 20, COLORES.escudo);

    // Caja Consumo Energía
    g.fillStyle(COLORES.pistaBarra, 1);
    g.fillRoundedRect(10, -76, 320, 44, ESPACIADO.radioBarra);
    g.lineStyle(2, COLORES.energia, 0.9);
    g.strokeRoundedRect(10, -76, 320, 44, ESPACIADO.radioBarra);
    dibujarIconoEnergia(g, 32, -54, 20, COLORES.energia);
  }

  private redibujarPaneles(): void {
    if (!this.nivel) {
      return;
    }
    const tam = 104;
    const primerDesalineado = this.nivel.paneles.find(
      (p) => p.direccion !== this.nivel?.objetivo,
    );

    this.panelesVisuales.forEach((pv, idx) => {
      const dato = this.nivel?.paneles.find((p) => p.id === pv.id);
      if (!dato || !this.nivel) {
        return;
      }

      const estaAlineado = dato.direccion === this.nivel.objetivo;
      const esFoco = idx === this.focusIdx;
      const esPista =
        this.pistaActiva && !estaAlineado && primerDesalineado?.id === dato.id;

      const g = pv.fondo;
      g.clear();

      if (esPista) {
        const alpha = getAjustes().movimientoReducido
          ? 0.9
          : 0.55 + 0.35 * Math.sin(this.fasePista);
        g.lineStyle(4, COLORES.aire, alpha);
        g.strokeRoundedRect(
          -tam / 2 - 5,
          -tam / 2 - 5,
          tam + 10,
          tam + 10,
          ESPACIADO.radioBoton + 2,
        );
      }

      g.fillStyle(estaAlineado ? 0x17332b : COLORES.botonFondo, 1);
      g.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, ESPACIADO.radioBoton);
      g.lineStyle(
        esFoco ? 4 : 2.5,
        estaAlineado ? COLORES.ok : esFoco ? COLORES.aire : COLORES.bordePanel,
        1,
      );
      g.strokeRoundedRect(-tam / 2, -tam / 2, tam, tam, ESPACIADO.radioBoton);

      this.dibujarFlecha(
        g,
        0,
        -6,
        18,
        dato.direccion,
        estaAlineado ? COLORES.ok : COLORES.escudo,
      );

      pv.textoDir.setText(
        t(`minijuegoEscudo.direccionesCortas.${dato.direccion}`),
      );
      pv.textoMarca.setText(estaAlineado ? t('minijuegoEscudo.panelOk') : '');
    });
  }

  private dibujarFlecha(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    radio: number,
    dir: DireccionTormenta,
    color: number,
  ): void {
    const ang = ANGULO_POR_DIRECCION[dir];
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);

    const tipX = cx + cos * radio;
    const tipY = cy + sin * radio;
    const tailX = cx - cos * radio * 0.85;
    const tailY = cy - sin * radio * 0.85;

    g.lineStyle(5, color, 1);
    g.lineBetween(tailX, tailY, cx + cos * (radio * 0.3), cy + sin * (radio * 0.3));

    const perpX = -sin * (radio * 0.52);
    const perpY = cos * (radio * 0.52);
    const baseX = cx + cos * (radio * 0.15);
    const baseY = cy + sin * (radio * 0.15);

    g.fillStyle(color, 1);
    g.fillTriangle(
      tipX,
      tipY,
      baseX + perpX,
      baseY + perpY,
      baseX - perpX,
      baseY - perpY,
    );
  }
}
