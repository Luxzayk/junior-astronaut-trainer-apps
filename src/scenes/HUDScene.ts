// HUD superior (altura 80 px): 3 barras con iconos, reloj en arco, indicador Agua baja y botón de pausa

import Phaser from 'phaser';
import { avanzarBarra, crearEstadoBarra, calcularPreview, marcadorEvento, type MarcadorEventoFx, RECURSOS_HUD, EVENTO_PREVIEW_COSTO, detectarCambioDiscreto, agruparCambios, type EstadoBarraFx, type ConfigBarraFx } from '../ui/hudFx';
import type { MapaDeltasRecursos } from '../game/missions';
import { JORNADAS } from '../game/jornadas';
import { UI_CONFIG } from '../ui/uiConfig';
import {
  crearWidgetMascota,
  estadoMascota,
  type WidgetMascota,
} from '../art/mascota';
import { audioEngine } from '../audio/audio';
import { GAME_WIDTH, HUD_H, SCENE_KEYS } from '../config';
import { ControladorEfectosHUD, evaluarEfectosActivos } from '../fx/efectos';
import {
  MAX_JORNADAS,
  PERIODO_PULSO_LENTO_MS,
  UMBRAL_BAJO,
  UMBRAL_CRITICO,
} from '../game/balance';
import {
  calcularFraccionRestante,
  formatearTiempoMMSS,
  obtenerTiempoRestante,
} from '../game/clock';
import { gameState, type ModoJuego, type RecursoNombre } from '../game/state';
import { getAjustes, suscribirAjustes, updateAjustes } from '../game/settings';
import { tutorialManager } from '../game/tutorial';
import { t } from '../i18n';
import {
  dibujarIconoRecurso,
  dibujarIconoAire,
  dibujarIconoEnergia,
  dibujarIconoEscudo,
  dibujarIconoPausa,
  dibujarIconoSonido,
  dibujarIconoTanque,
} from '../ui/icons';
import { desregistrarObjetivoUI, registrarObjetivoUI } from '../ui/targets';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  HUD_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

type EstadoBarra = 'normal' | 'bajo' | 'critico';

interface BarraUI {
  preview: Phaser.GameObjects.Graphics;
  textoPreview: Phaser.GameObjects.Text;
  fx: EstadoBarraFx;
  valorReal: number;
  recurso: RecursoNombre;
  colorBase: number;
  xTrack: number;
  yTrack: number;
  yCentro: number;
  relleno: Phaser.GameObjects.Graphics;
  bordeEstado: Phaser.GameObjects.Graphics;
  textoPorcentaje: Phaser.GameObjects.Text;
  textoEstado: Phaser.GameObjects.Text;
  tweenCritico: Phaser.Tweens.Tween | null;
  estadoActual: EstadoBarra;
  ultimoValor: number;
}

interface FlotanteHud {
  texto: Phaser.GameObjects.Text; icono: Phaser.GameObjects.Graphics;
  recurso: RecursoNombre; delta: number; inicioMs: number; edadMs: number; activo: boolean;
}
export class HUDScene extends Phaser.Scene {
  private flotantes: FlotanteHud[] = [];
  private tiempoFxMs = 0;
  private animacionesPausadas = false;
  private configBarra: ConfigBarraFx = { ...UI_CONFIG, movimientoReducido: getAjustes().movimientoReducido };
  private barras: Record<RecursoNombre, BarraUI> | null = null;
  private marcaEvento: MarcadorEventoFx | null = null;
  private graficoMarca: Phaser.GameObjects.Graphics | null = null;
  private textoMarca: Phaser.GameObjects.Text | null = null;
  private eventoMarcadoOcurrido = false;
  private textoJornada: Phaser.GameObjects.Text | null = null;
  private textoReloj: Phaser.GameObjects.Text | null = null;
  private arcoReloj: Phaser.GameObjects.Graphics | null = null;
  private fondoBotonPausa: Phaser.GameObjects.Graphics | null = null;
  private fondoBotonSonido: Phaser.GameObjects.Graphics | null = null;
  private iconoBotonSonido: Phaser.GameObjects.Graphics | null = null;
  private textoBotonSonido: Phaser.GameObjects.Text | null = null;
  private sonidoHover = false;
  private indicadorAguaBaja: Phaser.GameObjects.Container | null = null;
  private textoAguaBaja: Phaser.GameObjects.Text | null = null;
  private widgetLuni: WidgetMascota | null = null;
  private efectosHud: ControladorEfectosHUD | null = null;
  private ultimoTextoTiempo = '';
  private ultimaFraccionReloj = -1;
  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.hud);
  }

  public create(): void {
    this.desuscripciones = [];
    this.configBarra.movimientoReducido = getAjustes().movimientoReducido;
    this.ultimoTextoTiempo = '';
    this.ultimaFraccionReloj = -1;
    this.sonidoHover = false;

    this.dibujarFondoHud();
    this.crearBarras();
    this.crearPoolFlotantes();
    this.crearReloj();
    this.crearIndicadorAguaBaja();
    this.crearMascotaHud();
    this.crearBotonSonido();
    this.crearBotonPausa();
    this.efectosHud = new ControladorEfectosHUD(this);
    this.configurarAtajosPausa();
    this.suscribirEventos();

    const snap = gameState.getSnapshot();
    this.actualizarBarra('aire', snap.aire);
    this.actualizarBarra('energia', snap.energia);
    this.actualizarBarra('escudo', snap.escudo);
    this.actualizarEtiquetaJornada(snap.jornada, snap.modo);
    this.configurarMarcaEvento();
    this.actualizarIndicadorAguaBaja(snap.aguaBaja);
    this.actualizarReloj(snap.segundos);
    this.actualizarEstadoVisualHud();

    registrarObjetivoUI('barras', {
      x: HUD_METRICAS.barraXIcono,
      y: 2,
      ancho: 430,
      alto: HUD_H - 4,
    });
    registrarObjetivoUI('reloj', {
      x: GAME_WIDTH / 2 - 120,
      y: 2,
      ancho: 240,
      alto: HUD_H - 4,
    });
    registrarObjetivoUI('pausa', {
      x:
        GAME_WIDTH -
        HUD_METRICAS.botonPausaMargenDer -
        HUD_METRICAS.botonPausaTamano,
      y: HUD_H / 2 - HUD_METRICAS.botonPausaTamano / 2,
      ancho: HUD_METRICAS.botonPausaTamano,
      alto: HUD_METRICAS.botonPausaTamano,
    });

    this.events.once('shutdown', this.limpiar, this);
  }

  public override update(_time: number, delta: number): void {
    const snap = gameState.getSnapshot();
    this.actualizarReloj(snap.segundos);
    if (snap.pausado || snap.estado === 'pausa' || tutorialManager.estaPausandoReloj()) {
      if (!this.animacionesPausadas) { this.tweens.pauseAll(); this.animacionesPausadas = true; }
      return;
    }
    if (this.animacionesPausadas) { this.tweens.resumeAll(); this.animacionesPausadas = false; }
    this.tiempoFxMs += delta;
    this.avanzarFlotantes(delta);
    if (this.barras) for (const recurso of RECURSOS_HUD) {
      const barra = this.barras[recurso];
      barra.fx = avanzarBarra(barra.fx, barra.valorReal, delta, this.configBarra);
      this.dibujarBarraFx(barra);
    }
  }

  private dibujarFondoHud(): void {
    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.panelHud, 1);
    fondo.fillRect(0, 0, GAME_WIDTH, HUD_H);
    fondo.lineStyle(2, COLORES.bordePanel, 1);
    fondo.lineBetween(0, HUD_H - 1, GAME_WIDTH, HUD_H - 1);
  }

  private crearBarras(): void {
    const definiciones: ReadonlyArray<{
      recurso: RecursoNombre;
      color: number;
      dibujarIcono: (
        g: Phaser.GameObjects.Graphics,
        cx: number,
        cy: number,
        tamano: number,
        color: number,
      ) => void;
    }> = [
      { recurso: 'aire', color: COLORES.aire, dibujarIcono: dibujarIconoAire },
      {
        recurso: 'energia',
        color: COLORES.energia,
        dibujarIcono: dibujarIconoEnergia,
      },
      {
        recurso: 'escudo',
        color: COLORES.escudo,
        dibujarIcono: dibujarIconoEscudo,
      },
    ];

    const estatico = this.add.graphics();
    const mapaBarras = {} as Record<RecursoNombre, BarraUI>;

    definiciones.forEach((def, indice) => {
      const yTrack =
        2 + indice * (HUD_METRICAS.barraAlto + HUD_METRICAS.barraSeparacion);
      const yCentro = yTrack + HUD_METRICAS.barraAlto / 2;

      def.dibujarIcono(
        estatico,
        HUD_METRICAS.barraXIcono + HUD_METRICAS.iconoTamano / 2,
        yCentro,
        HUD_METRICAS.iconoTamano,
        def.color,
      );

      estatico.fillStyle(COLORES.pistaBarra, 1);
      estatico.fillRoundedRect(
        HUD_METRICAS.barraXTrack,
        yTrack,
        HUD_METRICAS.barraAncho,
        HUD_METRICAS.barraAlto,
        ESPACIADO.radioBarra,
      );
      estatico.lineStyle(1, COLORES.bordePanel, 1);
      estatico.strokeRoundedRect(
        HUD_METRICAS.barraXTrack,
        yTrack,
        HUD_METRICAS.barraAncho,
        HUD_METRICAS.barraAlto,
        ESPACIADO.radioBarra,
      );

      const relleno = this.add.graphics();
      const bordeEstado = this.add.graphics();
      const textoGrande = getAjustes().textoGrande;

      const textoPorcentaje = this.add
        .text(
          HUD_METRICAS.barraXPorcentaje,
          yCentro,
          t('hud.porcentaje', { valor: 100 }),
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.barra, textoGrande, 22)}px`,
            fontStyle: 'bold',
            color: COLORES_HEX.textoPrincipal,
          },
        )
        .setOrigin(0, 0.5);

      const textoEstado = this.add
        .text(HUD_METRICAS.barraXEstado, yCentro, '', {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.barra, textoGrande, 21)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.aviso,
        })
        .setOrigin(0, 0.5);

      mapaBarras[def.recurso] = {
        preview: this.add.graphics().setDepth(8),
        textoPreview: this.add.text(0, yCentro, '', { fontFamily: FUENTE_FAMILIA, fontSize: escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande), fontStyle: 'bold', backgroundColor: COLORES_HEX.panelHud }).setOrigin(0, 0.5).setDepth(9),
        fx: crearEstadoBarra(gameState.getSnapshot()[def.recurso]),
        valorReal: gameState.getSnapshot()[def.recurso],
        recurso: def.recurso,
        colorBase: def.color,
        xTrack: HUD_METRICAS.barraXTrack,
        yTrack,
        yCentro,
        relleno,
        bordeEstado,
        textoPorcentaje,
        textoEstado,
        tweenCritico: null,
        estadoActual: 'normal',
        ultimoValor: -1,
      };
    });

    this.barras = mapaBarras;
  }

  private crearReloj(): void {
    const cx = GAME_WIDTH / 2;
    const textoGrande = getAjustes().textoGrande;

    this.textoJornada = this.add
      .text(cx, HUD_METRICAS.relojTextoJornadaY, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.reloj, textoGrande, 21)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5, 0.5);

    const fondoAnillo = this.add.graphics();
    fondoAnillo.lineStyle(HUD_METRICAS.relojGrosor, COLORES.bordePanel, 1);
    fondoAnillo.strokeCircle(
      cx,
      HUD_METRICAS.relojCentroY,
      HUD_METRICAS.relojRadio,
    );

    this.arcoReloj = this.add.graphics();
    this.graficoMarca = this.add.graphics();
    this.textoMarca = this.add.text(UI_CONFIG.marcadorX + UI_CONFIG.marcadorEtiquetaOffset, UI_CONFIG.marcadorY, '', {
      fontFamily: FUENTE_FAMILIA, fontSize: escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande), color: COLORES_HEX.textoPrincipal,
    }).setOrigin(0, 0.5);

    this.textoReloj = this.add
      .text(cx, HUD_METRICAS.relojCentroY, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.reloj, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5, 0.5);
  }

  private crearIndicadorAguaBaja(): void {
    const x = 832;
    const y = HUD_H / 2;
    const ancho = 186;
    const alto = 46;
    const textoGrande = getAjustes().textoGrande;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.pistaBarra, 1);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);
    fondo.lineStyle(3, COLORES.aviso, 1);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);

    dibujarIconoTanque(fondo, -ancho / 2 + 22, 0, 22, COLORES.tanque);

    this.textoAguaBaja = this.add
      .text(-ancho / 2 + 40, 0, `! ${t('hud.aguaBaja')}`, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aviso,
      })
      .setOrigin(0, 0.5);

    this.indicadorAguaBaja = this.add.container(x, y, [fondo, this.textoAguaBaja]);
    this.indicadorAguaBaja.setVisible(false);
  }

  private crearMascotaHud(): void {
    this.widgetLuni = crearWidgetMascota(this, {
      x: 946,
      y: HUD_H / 2 + 2,
      escala: 0.7,
      estadoInicial: 'contenta',
      mostrarFrase: true,
      anchoFrase: 146,
      alineacionFrase: 'derecha',
      contexto: 'hud',
    });
  }

  private actualizarEstadoVisualHud(): void {
    const snap = gameState.getSnapshot();
    const mood = estadoMascota(snap.aire, snap.escudo);
    this.widgetLuni?.setEstado(mood);

    if (this.efectosHud) {
      const enEventoClima =
        snap.eventoClimaDisparado ||
        snap.estado === 'evento' ||
        snap.eventoActivo === 'FULGURACION' ||
        snap.eventoActivo === 'TORMENTA_GRANDE';
      const estadoFx = evaluarEfectosActivos(
        { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
        enEventoClima,
        getAjustes().movimientoReducido,
      );
      this.efectosHud.aplicarEstado(estadoFx);
    }
  }

  private crearBotonSonido(): void {
    const tam = 58;
    const cx =
      GAME_WIDTH -
      HUD_METRICAS.botonPausaMargenDer -
      HUD_METRICAS.botonPausaTamano -
      10 -
      tam / 2;
    const cy = HUD_H / 2;
    const textoGrande = getAjustes().textoGrande;

    this.fondoBotonSonido = this.add.graphics();
    this.iconoBotonSonido = this.add.graphics();
    this.textoBotonSonido = this.add
      .text(cx, cy + 14, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0.5);

    this.actualizarBotonSonidoVisual(cx, cy, tam);

    const zona = this.add
      .zone(cx, cy, tam, tam)
      .setInteractive({ useHandCursor: true });

    zona.on('pointerover', () => {
      this.sonidoHover = true;
      this.actualizarBotonSonidoVisual(cx, cy, tam);
    });
    zona.on('pointerout', () => {
      this.sonidoHover = false;
      this.actualizarBotonSonidoVisual(cx, cy, tam);
    });
    zona.on('pointerdown', () => {
      audioEngine.registrarGestoUsuario();
      const nuevo = updateAjustes({ sonido: !getAjustes().sonido });
      if (nuevo.sonido) {
        audioEngine.reproducir('clic');
      }
      this.actualizarBotonSonidoVisual(cx, cy, tam);
    });
  }

  private actualizarBotonSonidoVisual(
    cx = GAME_WIDTH -
      HUD_METRICAS.botonPausaMargenDer -
      HUD_METRICAS.botonPausaTamano -
      10 -
      29,
    cy = HUD_H / 2,
    tam = 58,
  ): void {
    if (
      !this.fondoBotonSonido ||
      !this.iconoBotonSonido ||
      !this.textoBotonSonido
    ) {
      return;
    }
    const ajustes = getAjustes();
    const activo = ajustes.sonido;
    this.fondoBotonSonido.clear();
    this.fondoBotonSonido.fillStyle(
      this.sonidoHover ? COLORES.botonHover : COLORES.botonFondo,
      1,
    );
    this.fondoBotonSonido.fillRoundedRect(
      cx - tam / 2,
      cy - tam / 2,
      tam,
      tam,
      ESPACIADO.radioBoton,
    );
    this.fondoBotonSonido.lineStyle(
      2,
      activo ? COLORES.bordePanel : COLORES.aviso,
      1,
    );
    this.fondoBotonSonido.strokeRoundedRect(
      cx - tam / 2,
      cy - tam / 2,
      tam,
      tam,
      ESPACIADO.radioBoton,
    );

    this.iconoBotonSonido.clear();
    dibujarIconoSonido(
      this.iconoBotonSonido,
      cx,
      cy - 10,
      20,
      activo ? COLORES.aire : COLORES.textoSecundario,
      activo,
    );
    this.textoBotonSonido.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.minimo, ajustes.textoGrande, 20),
    );
    this.textoBotonSonido.setText(
      activo ? t('sonido.onCorto') : t('sonido.offCorto'),
    );
    this.textoBotonSonido.setColor(
      activo ? COLORES_HEX.textoPrincipal : COLORES_HEX.aviso,
    );
  }

  private crearBotonPausa(): void {
    const tam = HUD_METRICAS.botonPausaTamano;
    const cx = GAME_WIDTH - HUD_METRICAS.botonPausaMargenDer - tam / 2;
    const cy = HUD_H / 2;

    this.fondoBotonPausa = this.add.graphics();
    this.dibujarFondoBotonPausa(cx, cy, tam, false);

    const icono = this.add.graphics();
    dibujarIconoPausa(icono, cx, cy, 28, COLORES.textoPrincipal);

    const zonaTactil = this.add
      .zone(cx, cy, tam, tam)
      .setInteractive({ useHandCursor: true });

    zonaTactil.on('pointerover', () => {
      this.dibujarFondoBotonPausa(cx, cy, tam, true);
    });
    zonaTactil.on('pointerout', () => {
      this.dibujarFondoBotonPausa(cx, cy, tam, false);
    });
    zonaTactil.on('pointerdown', () => {
      audioEngine.reproducir('clic');
      const snap = gameState.getSnapshot();
      if (snap.estado === 'jugando') {
        gameState.setPausa(true);
      } else if (snap.estado === 'pausa') {
        gameState.setPausa(false);
      }
    });
  }

  private dibujarFondoBotonPausa(
    cx: number,
    cy: number,
    tam: number,
    hover: boolean,
  ): void {
    if (!this.fondoBotonPausa) {
      return;
    }
    this.fondoBotonPausa.clear();
    this.fondoBotonPausa.fillStyle(
      hover ? COLORES.botonHover : COLORES.botonFondo,
      1,
    );
    this.fondoBotonPausa.fillRoundedRect(
      cx - tam / 2,
      cy - tam / 2,
      tam,
      tam,
      ESPACIADO.radioBoton,
    );
    this.fondoBotonPausa.lineStyle(2, COLORES.bordePanel, 1);
    this.fondoBotonPausa.strokeRoundedRect(
      cx - tam / 2,
      cy - tam / 2,
      tam,
      tam,
      ESPACIADO.radioBoton,
    );
  }

  private configurarAtajosPausa(): void {
    const teclado = this.input.keyboard;
    if (!teclado) {
      return;
    }
    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.repeat) {
        return;
      }
      if (evento.code === 'Escape' || evento.code === 'KeyP') {
        const subescenaPausaAbierta =
          this.scene.isActive(SCENE_KEYS.ajustes) ||
          this.scene.isActive(SCENE_KEYS.glosario) ||
          this.scene.isActive(SCENE_KEYS.fuentes) ||
          this.scene.isActive(SCENE_KEYS.creditos);
        if (subescenaPausaAbierta) {
          return;
        }
        if (evento.code === 'Escape' && tutorialManager.estaPausandoReloj()) {
          return;
        }
        const snap = gameState.getSnapshot();
        if (snap.estado === 'jugando') {
          gameState.setPausa(true);
        } else if (snap.estado === 'pausa') {
          gameState.setPausa(false);
        }
      }
    };
    teclado.on('keydown', alPulsar);
    this.desuscripciones.push(() => {
      teclado.off('keydown', alPulsar);
    });
  }

  private suscribirEventos(): void {
    const recibirPreview = (deltas: MapaDeltasRecursos | null): void => this.dibujarPreview(deltas);
    this.game.events.on(EVENTO_PREVIEW_COSTO, recibirPreview);
    this.desuscripciones.push(() => this.game.events.off(EVENTO_PREVIEW_COSTO, recibirPreview));
    this.desuscripciones.push(
      gameState.on('recurso:cambio', (ev) => {
        if (detectarCambioDiscreto(ev.valor - ev.anterior)) this.mostrarFlotante(ev.recurso, ev.valor - ev.anterior);
        this.actualizarBarra(ev.recurso, ev.valor);
        this.actualizarEstadoVisualHud();
      }),
    );

    this.desuscripciones.push(
      gameState.on('evento:abrir', () => {
        this.actualizarEstadoVisualHud();
      }),
    );

    this.desuscripciones.push(
      gameState.on('jornada:nueva', (ev) => {
        this.dibujarPreview(null);
        for (const f of this.flotantes) { f.activo = false; f.texto.setVisible(false); f.icono.setVisible(false); }
        if (this.barras) for (const recurso of RECURSOS_HUD) this.barras[recurso].fx = crearEstadoBarra(this.barras[recurso].valorReal);
        const snap = gameState.getSnapshot();
        this.ultimaFraccionReloj = -1;
        this.ultimoTextoTiempo = '';
        this.actualizarEtiquetaJornada(ev.jornada, snap.modo);
            this.configurarMarcaEvento();
        this.actualizarIndicadorAguaBaja(snap.aguaBaja);
        this.actualizarBarra('aire', snap.aire);
        this.actualizarBarra('energia', snap.energia);
        this.actualizarBarra('escudo', snap.escudo);
        this.actualizarReloj(snap.segundos);
        this.actualizarEstadoVisualHud();
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', () => {
        this.dibujarPreview(null);
        const snap = gameState.getSnapshot();
        this.actualizarEtiquetaJornada(snap.jornada, snap.modo);
        this.configurarMarcaEvento();
        this.actualizarIndicadorAguaBaja(snap.aguaBaja);
        this.actualizarEstadoVisualHud();
      }),
    );

    this.desuscripciones.push(
      suscribirAjustes((ajustes) => {
        const snap = gameState.getSnapshot();
        const textoGrande = ajustes.textoGrande;
        this.configBarra.movimientoReducido = ajustes.movimientoReducido;
        this.textoJornada?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.reloj, textoGrande, 21),
        );
        this.textoReloj?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.reloj, textoGrande, 20),
        );
        this.textoAguaBaja?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20),
        );
        this.actualizarEtiquetaJornada(snap.jornada, snap.modo);
        this.configurarMarcaEvento();
        this.textoAguaBaja?.setText(`! ${t('hud.aguaBaja')}`);
        this.actualizarBotonSonidoVisual();
        this.actualizarEstadoVisualHud();
        if (this.barras) {
          for (const key of RECURSOS_HUD) {
            const b = this.barras[key];
            b.fx = avanzarBarra(b.fx, b.valorReal, 0, this.configBarra);
            this.dibujarBarraFx(b);
            b.textoPorcentaje.setFontSize(
              escalarTamanoTexto(TAMANOS_TEXTO.barra, textoGrande, 22),
            );
            b.textoEstado.setFontSize(
              escalarTamanoTexto(TAMANOS_TEXTO.barra, textoGrande, 21),
            );
            if (b.estadoActual === 'bajo') {
              b.textoEstado.setText(`! ${t('estadosBarra.bajo')}`);
            } else if (b.estadoActual === 'critico') {
              b.textoEstado.setText(`! ${t('estadosBarra.critico')}`);
              if (ajustes.movimientoReducido) {
                this.detenerPulsoCritico(b);
              } else {
                this.iniciarPulsoCritico(b);
              }
            }
          }
        }
      }),
    );
  }

  private actualizarBarra(recurso: RecursoNombre, valor: number): void {
    if (!this.barras) {
      return;
    }
    const barra = this.barras[recurso];
    barra.valorReal = valor;
    barra.fx = avanzarBarra(barra.fx, valor, 0, this.configBarra);
    const valorRedondeado = Math.round(valor);

    let nuevoEstado: EstadoBarra = 'normal';
    if (valor < UMBRAL_CRITICO) {
      nuevoEstado = 'critico';
    } else if (valor < UMBRAL_BAJO) {
      nuevoEstado = 'bajo';
    }

    if (
      valorRedondeado !== barra.ultimoValor ||
      nuevoEstado !== barra.estadoActual
    ) {
      barra.ultimoValor = valorRedondeado;
      barra.textoPorcentaje.setText(
        t('hud.porcentaje', { valor: Math.round(valor) }),
      );
    }

    this.dibujarBarraFx(barra);

    if (nuevoEstado !== barra.estadoActual) {
      barra.estadoActual = nuevoEstado;
      barra.bordeEstado.clear();
      if (nuevoEstado === 'normal') {
        barra.textoEstado.setText('');
        this.detenerPulsoCritico(barra);
      } else if (nuevoEstado === 'bajo') {
        barra.textoEstado.setText(`! ${t('estadosBarra.bajo')}`);
        barra.textoEstado.setColor(COLORES_HEX.aviso);
        barra.bordeEstado.lineStyle(2.5, COLORES.aviso, 1);
        barra.bordeEstado.strokeRoundedRect(
          barra.xTrack,
          barra.yTrack,
          HUD_METRICAS.barraAncho,
          HUD_METRICAS.barraAlto,
          ESPACIADO.radioBarra,
        );
        this.detenerPulsoCritico(barra);
      } else {
        barra.textoEstado.setText(`! ${t('estadosBarra.critico')}`);
        barra.textoEstado.setColor(COLORES_HEX.peligro);
        barra.bordeEstado.lineStyle(3, COLORES.peligro, 1);
        barra.bordeEstado.strokeRoundedRect(
          barra.xTrack,
          barra.yTrack,
          HUD_METRICAS.barraAncho,
          HUD_METRICAS.barraAlto,
          ESPACIADO.radioBarra,
        );
        this.iniciarPulsoCritico(barra);
      }
    }
  }

  private dibujarPreview(deltas: MapaDeltasRecursos | null): void {
    if (!this.barras) return;
    for (const recurso of RECURSOS_HUD) {
      const b = this.barras[recurso];
      b.preview.clear(); b.textoPreview.setText('');
      const delta = deltas?.[recurso] ?? 0;
      if (delta === 0) continue;
      const p = calcularPreview(b.valorReal, delta);
      const escala = HUD_METRICAS.barraAncho / 100;
      const x = b.xTrack + Math.min(p.desde, p.hasta) * escala;
      const fin = b.xTrack + Math.max(p.desde, p.hasta) * escala;
      const positivo = p.tipo === 'subida';
      b.preview.fillStyle(positivo ? COLORES.ok : COLORES.peligro, UI_CONFIG.alphaPreview);
      b.preview.fillRect(x, b.yTrack, fin - x, HUD_METRICAS.barraAlto);
      if (!positivo) {
        b.preview.lineStyle(UI_CONFIG.grosorRayado, COLORES.textoPrincipal);
        for (let rx = x; rx < fin; rx += UI_CONFIG.pasoRayado) b.preview.lineBetween(rx, b.yTrack + HUD_METRICAS.barraAlto, Math.min(fin, rx + UI_CONFIG.pasoRayado), b.yTrack);
      }
      b.textoPreview.setX(Math.max(b.xTrack, Math.min(x, b.xTrack + HUD_METRICAS.barraAncho - UI_CONFIG.previewTextoAncho)));
      b.textoPreview.setFontSize(escalarTamanoTexto(TAMANOS_TEXTO.minimo, getAjustes().textoGrande));
      b.textoPreview.setColor(positivo ? COLORES_HEX.ok : COLORES_HEX.peligro);
      b.textoPreview.setText(t(positivo ? 'hud.deltaPositivo' : 'hud.deltaNegativo', { valor: Math.abs(delta) }));
    }
  }
  private crearPoolFlotantes(): void {
    this.tiempoFxMs = 0;
    this.flotantes = [];
    for (let i = 0; i < UI_CONFIG.maxFlotantes; i++) {
      const texto = this.add.text(0, 0, '', { fontFamily: FUENTE_FAMILIA, fontSize: escalarTamanoTexto(UI_CONFIG.flotanteTexto, getAjustes().textoGrande), fontStyle: 'bold', backgroundColor: COLORES_HEX.panelHud }).setOrigin(0, 0.5).setVisible(false).setDepth(10);
      const icono = this.add.graphics().setVisible(false).setDepth(10);
      this.flotantes.push({ texto, icono, recurso: 'aire', delta: 0, inicioMs: 0, edadMs: 0, activo: false });
    }
  }

  private mostrarFlotante(recurso: RecursoNombre, delta: number): void {
    const previo = this.flotantes.find(f => f.activo && f.recurso === recurso);
    const agrupable = previo && this.tiempoFxMs - previo.inicioMs <= UI_CONFIG.ventanaAgrupacionMs;
    const f = previo ?? this.flotantes.find(f => !f.activo);
    if (!f || !this.barras) return;
    if (agrupable) {
      f.delta = agruparCambios([{ recurso, delta: f.delta, instanteMs: f.inicioMs }, { recurso, delta, instanteMs: this.tiempoFxMs }], UI_CONFIG.ventanaAgrupacionMs)[0].delta;
    } else { f.delta = delta; f.inicioMs = this.tiempoFxMs; }
    f.recurso = recurso; f.edadMs = 0; f.activo = true;
    const indice = recurso === 'aire' ? 0 : recurso === 'energia' ? 1 : 2;
    const x = UI_CONFIG.flotanteX + indice * UI_CONFIG.flotanteSeparacionX;
    f.texto.setPosition(x + UI_CONFIG.flotanteIconoOffset, this.barras[recurso].yCentro + (this.configBarra.movimientoReducido ? 0 : UI_CONFIG.desplazamientoFlotante));
    f.texto.setFontSize(escalarTamanoTexto(UI_CONFIG.flotanteTexto, getAjustes().textoGrande));
    f.texto.setText(t(f.delta >= 0 ? 'hud.deltaPositivo' : 'hud.deltaNegativo', { valor: Math.abs(Math.round(f.delta * 10) / 10) }));
    f.texto.setColor(f.delta >= 0 ? COLORES_HEX.ok : COLORES_HEX.peligro).setAlpha(1).setVisible(true);
    f.icono.clear();
    dibujarIconoRecurso(f.icono, recurso, 0, 0, UI_CONFIG.flotanteIcono, this.barras[recurso].colorBase);
    f.icono.setPosition(x, f.texto.y).setAlpha(1).setVisible(true);
  }

  private avanzarFlotantes(delta: number): void {
    for (const f of this.flotantes) {
      if (!f.activo || !this.barras) continue;
      f.edadMs += delta;
      const reducido = this.configBarra.movimientoReducido;
      const duracion = reducido ? UI_CONFIG.marcadorReducidoMs : UI_CONFIG.flotanteMs;
      if (f.edadMs >= duracion) { f.activo = false; f.texto.setVisible(false); f.icono.setVisible(false); continue; }
      const fraccion = f.edadMs / duracion;
      const y = this.barras[f.recurso].yCentro + (reducido ? 0 : UI_CONFIG.desplazamientoFlotante * (1 - fraccion));
      f.texto.setY(y).setAlpha(reducido ? 1 : 1 - fraccion);
      f.icono.setY(y).setAlpha(reducido ? 1 : 1 - fraccion);
    }
  }
  private dibujarBarraFx(barra: BarraUI): void {
    const g = barra.relleno;
    const escala = HUD_METRICAS.barraAncho / 100;
    g.clear();
    if (!this.configBarra.movimientoReducido && barra.fx.estela > barra.fx.mostrado) {
      g.fillStyle(barra.colorBase, UI_CONFIG.alphaEstela);
      g.fillRect(barra.xTrack, barra.yTrack, barra.fx.estela * escala, HUD_METRICAS.barraAlto);
    }
    const color = barra.valorReal < UMBRAL_CRITICO ? COLORES.peligro : barra.valorReal < UMBRAL_BAJO ? COLORES.aviso : barra.colorBase;
    g.fillStyle(color);
    g.fillRect(barra.xTrack, barra.yTrack, barra.fx.mostrado * escala, HUD_METRICAS.barraAlto);
    if (this.configBarra.movimientoReducido && barra.fx.marcadorMs > 0) {
      const inicio = barra.xTrack + barra.fx.perdidaHasta * escala;
      const fin = barra.xTrack + barra.fx.perdidaDesde * escala;
      g.lineStyle(UI_CONFIG.grosorRayado, COLORES.textoPrincipal);
      for (let x = inicio; x < fin; x += UI_CONFIG.pasoRayado) g.lineBetween(x, barra.yTrack + HUD_METRICAS.barraAlto, Math.min(fin, x + UI_CONFIG.pasoRayado), barra.yTrack);
    }
  }
  private iniciarPulsoCritico(barra: BarraUI): void {
    if (barra.tweenCritico || getAjustes().movimientoReducido) {
      return;
    }
    barra.tweenCritico = this.tweens.add({
      targets: [barra.relleno, barra.textoEstado],
      alpha: { from: 1, to: 0.45 },
      duration: PERIODO_PULSO_LENTO_MS,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private detenerPulsoCritico(barra: BarraUI): void {
    if (barra.tweenCritico) {
      barra.tweenCritico.stop();
      barra.tweenCritico = null;
    }
    barra.relleno.setAlpha(1);
    barra.textoEstado.setAlpha(1);
  }

  private actualizarEtiquetaJornada(jornada: number, modo: ModoJuego): void {
    const etiqueta =
      modo === 'demo'
        ? t('hud.demoJornadaDe', { actual: jornada, total: MAX_JORNADAS })
        : t('hud.jornadaDe', { actual: jornada, total: MAX_JORNADAS });
    this.textoJornada?.setText(etiqueta);
  }

  private actualizarIndicadorAguaBaja(activa: boolean): void {
    this.indicadorAguaBaja?.setVisible(activa);
  }

  private configurarMarcaEvento(): void {
    const snap = gameState.getSnapshot();
    this.marcaEvento = marcadorEvento(JORNADAS[snap.jornada - 1], snap.modo, gameState.obtenerDuracionJornadaActual());
    this.eventoMarcadoOcurrido = this.marcaEvento !== null && snap.segundos >= this.marcaEvento.fraccion * gameState.obtenerDuracionJornadaActual();
    this.textoMarca?.setText(this.marcaEvento ? t('hud.eventoMarca') : '').setFontSize(escalarTamanoTexto(TAMANOS_TEXTO.minimo, getAjustes().textoGrande));
    this.dibujarMarcaEvento();
  }

  private dibujarMarcaEvento(): void {
    const g = this.graficoMarca;
    if (!g) return;
    g.clear();
    if (!this.marcaEvento) return;
    const marca = this.marcaEvento;
    // El arco representa tiempo restante, por eso se invierte la fracción transcurrida.
    const angulo = -Math.PI / 2 + Math.PI * 2 * (1 - marca.fraccion);
    const x = GAME_WIDTH / 2 + Math.cos(angulo) * HUD_METRICAS.relojRadio;
    const y = HUD_METRICAS.relojCentroY + Math.sin(angulo) * HUD_METRICAS.relojRadio;
    g.lineStyle(UI_CONFIG.grosorRayado, COLORES.textoPrincipal);
    g.lineBetween(x, y, x + Math.cos(angulo) * UI_CONFIG.marcadorLinea, y + Math.sin(angulo) * UI_CONFIG.marcadorLinea);
    if (marca.tipo === 'fuga') dibujarIconoTanque(g, UI_CONFIG.marcadorX, UI_CONFIG.marcadorY, UI_CONFIG.marcadorIcono, COLORES.textoPrincipal);
    else dibujarIconoEnergia(g, UI_CONFIG.marcadorX, UI_CONFIG.marcadorY, UI_CONFIG.marcadorIcono, COLORES.textoPrincipal);
    if (marca.tipo === 'apagon') g.lineBetween(UI_CONFIG.marcadorX - UI_CONFIG.marcadorTick, UI_CONFIG.marcadorY + UI_CONFIG.marcadorTick, UI_CONFIG.marcadorX + UI_CONFIG.marcadorTick, UI_CONFIG.marcadorY - UI_CONFIG.marcadorTick);
    if (this.eventoMarcadoOcurrido) {
      const r = UI_CONFIG.marcadorTick;
      g.lineBetween(x - r, y, x, y + r);
      g.lineBetween(x, y + r, x + r, y - r);
    }
    const alpha = this.eventoMarcadoOcurrido ? UI_CONFIG.marcadorAtenuado : 1;
    g.setAlpha(alpha); this.textoMarca?.setAlpha(alpha);
  }
  private actualizarReloj(segundosTranscurridos: number): void {
    const duracion = gameState.obtenerDuracionJornadaActual();
    if (this.marcaEvento && !this.eventoMarcadoOcurrido && segundosTranscurridos >= this.marcaEvento.fraccion * duracion) {
      this.eventoMarcadoOcurrido = true;
      this.dibujarMarcaEvento();
    }
    const restantes = obtenerTiempoRestante(segundosTranscurridos, duracion);
    const texto = formatearTiempoMMSS(restantes);
    if (texto !== this.ultimoTextoTiempo) {
      this.ultimoTextoTiempo = texto;
      this.textoReloj?.setText(texto);
    }

    const fraccion = calcularFraccionRestante(segundosTranscurridos, duracion);
    if (Math.abs(fraccion - this.ultimaFraccionReloj) < 0.002) {
      return;
    }
    this.ultimaFraccionReloj = fraccion;

    if (!this.arcoReloj) {
      return;
    }
    this.arcoReloj.clear();
    if (fraccion <= 0) {
      return;
    }

    const cx = GAME_WIDTH / 2;
    const inicioAngulo = -Math.PI / 2;
    const finAngulo = inicioAngulo + Math.PI * 2 * fraccion;

    this.arcoReloj.lineStyle(HUD_METRICAS.relojGrosor, COLORES.aire, 1);
    this.arcoReloj.beginPath();
    this.arcoReloj.arc(
      cx,
      HUD_METRICAS.relojCentroY,
      HUD_METRICAS.relojRadio,
      inicioAngulo,
      finAngulo,
      false,
    );
    this.arcoReloj.strokePath();
  }

  private limpiar(): void {
    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];
    this.configBarra.movimientoReducido = getAjustes().movimientoReducido;
    if (this.barras) {
      this.detenerPulsoCritico(this.barras.aire);
      this.detenerPulsoCritico(this.barras.energia);
      this.detenerPulsoCritico(this.barras.escudo);
    }
    this.widgetLuni?.destroy();
    this.widgetLuni = null;
    this.efectosHud?.destroy();
    this.efectosHud = null;
    desregistrarObjetivoUI('barras');
    desregistrarObjetivoUI('reloj');
    desregistrarObjetivoUI('pausa');
  }
}
