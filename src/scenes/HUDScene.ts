// HUD superior (altura 80 px): 3 barras con iconos, reloj en arco, indicador Agua baja y botón de pausa

import Phaser from 'phaser';
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
import { t } from '../i18n';
import {
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

export class HUDScene extends Phaser.Scene {
  private barras: Record<RecursoNombre, BarraUI> | null = null;
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
    this.ultimoTextoTiempo = '';
    this.ultimaFraccionReloj = -1;
    this.sonidoHover = false;

    this.dibujarFondoHud();
    this.crearBarras();
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

  public override update(): void {
    const snap = gameState.getSnapshot();
    this.actualizarReloj(snap.segundos);
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
      x: 956,
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
    const tam = 56;
    const cx =
      GAME_WIDTH -
      HUD_METRICAS.botonPausaMargenDer -
      HUD_METRICAS.botonPausaTamano -
      12 -
      tam / 2;
    const cy = HUD_H / 2;

    this.fondoBotonSonido = this.add.graphics();
    this.iconoBotonSonido = this.add.graphics();
    this.textoBotonSonido = this.add
      .text(cx, cy + 16, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: '14px',
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
      12 -
      28,
    cy = HUD_H / 2,
    tam = 56,
  ): void {
    if (
      !this.fondoBotonSonido ||
      !this.iconoBotonSonido ||
      !this.textoBotonSonido
    ) {
      return;
    }
    const activo = getAjustes().sonido;
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
      cy - 7,
      22,
      activo ? COLORES.aire : COLORES.textoSecundario,
      activo,
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
          this.scene.isActive(SCENE_KEYS.fuentes);
        if (subescenaPausaAbierta) {
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
    this.desuscripciones.push(
      gameState.on('recurso:cambio', (ev) => {
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
        const snap = gameState.getSnapshot();
        this.ultimaFraccionReloj = -1;
        this.ultimoTextoTiempo = '';
        this.actualizarEtiquetaJornada(ev.jornada, snap.modo);
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
        const snap = gameState.getSnapshot();
        this.actualizarEtiquetaJornada(snap.jornada, snap.modo);
        this.actualizarIndicadorAguaBaja(snap.aguaBaja);
        this.actualizarEstadoVisualHud();
      }),
    );

    this.desuscripciones.push(
      suscribirAjustes((ajustes) => {
        const snap = gameState.getSnapshot();
        const textoGrande = ajustes.textoGrande;
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
        this.textoAguaBaja?.setText(`! ${t('hud.aguaBaja')}`);
        this.actualizarBotonSonidoVisual();
        this.actualizarEstadoVisualHud();
        if (this.barras) {
          for (const key of ['aire', 'energia', 'escudo'] as const) {
            const b = this.barras[key];
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

    let colorRelleno = barra.colorBase;
    if (nuevoEstado === 'critico') {
      colorRelleno = COLORES.peligro;
    } else if (nuevoEstado === 'bajo') {
      colorRelleno = COLORES.aviso;
    }

    const anchoRelleno = Math.max(
      0,
      Math.min(HUD_METRICAS.barraAncho, (valor / 100) * HUD_METRICAS.barraAncho),
    );

    barra.relleno.clear();
    if (anchoRelleno > 0) {
      barra.relleno.fillStyle(colorRelleno, 1);
      barra.relleno.fillRoundedRect(
        barra.xTrack,
        barra.yTrack,
        Math.max(ESPACIADO.radioBarra, anchoRelleno),
        HUD_METRICAS.barraAlto,
        ESPACIADO.radioBarra,
      );
    }

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

  private actualizarReloj(segundosTranscurridos: number): void {
    const duracion = gameState.obtenerDuracionJornadaActual();
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
