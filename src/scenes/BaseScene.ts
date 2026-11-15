// Escena principal del puesto lunar: mapa, colisiones, astronauta, estaciones, fuga urgente y entrada

import Phaser from 'phaser';
import { audioEngine } from '../audio/audio';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  HUD_H,
  isDebugEnabled,
  isPerfEnabled,
  MAP_COLS,
  MAP_OFFSET_Y,
  MAP_ROWS,
  SCENE_KEYS,
  TILE,
} from '../config';
import {
  DEBUG_DELTA_RECURSO,
  DEBUG_VELOCIDADES,
  DESCANSO_REFUGIO_ESCUDO,
  DESCANSO_REFUGIO_SEG,
  DURACION_AVISO_ESTACION_MS,
  DURACION_BANNER_APAGON_MS,
  RADIO_INTERACCION,
  RADIO_JUGADOR,
  VELOCIDAD_JUGADOR,
} from '../game/balance';
import {
  dibujarDetallesBaseExterior,
  dibujarDetalleSalaProcedural,
  TEXTURA_ASTRONAUTA,
  TEXTURA_ESTRELLAS,
  TEXTURA_SUELO_LUNAR,
  TEXTURAS_ASTRONAUTA_CAMINATA,
} from '../art/texturas';
import { ControladorEfectosBase, evaluarEfectosActivos } from '../fx/efectos';
import {
  ESTACIONES,
  isWalkable,
  obtenerNombreEstacion,
  obtenerNombreSala,
  obtenerSalaEnTile,
  POSICION_INICIAL_TILE,
  pxATile,
  resolverMovimientoConColision,
  SALAS,
  tileACentroPx,
  type DefinicionEstacion,
  type PuntoPx,
  type TileCoord,
} from '../game/map';
import {
  contarMisionesJornada,
  obtenerEstadoMision,
  obtenerMisionActivaParaEstacion,
  obtenerMisionesDeJornada,
  obtenerSiguienteMisionPendiente,
  obtenerTextosMision,
} from '../game/missions';
import {
  encontrarCamino,
  encontrarTileCaminableMasCercano,
} from '../game/pathfinding';
import { getAjustes, suscribirAjustes, updateAjustes } from '../game/settings';
import { gameState } from '../game/state';
import { tutorialManager } from '../game/tutorial';
import { t } from '../i18n';
import {
  dibujarIconoEstacion,
  dibujarIconoMisionActiva,
  dibujarIconoMisionLista,
} from '../ui/icons';
import {
  crearModalLobby,
  type ControlModalLobby,
} from '../ui/lobbyModal';
import { desregistrarObjetivoUI, registrarObjetivoUI } from '../ui/targets';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  MAPA_METRICAS,
  MISION_PANEL_METRICAS,
  TAMANOS_TEXTO,
} from '../ui/theme';

interface EstacionVisual {
  definicion: DefinicionEstacion;
  contenedor: Phaser.GameObjects.Container;
  indicadorMision: Phaser.GameObjects.Graphics;
  textoUrgente: Phaser.GameObjects.Text;
  centro: PuntoPx;
  tweenPulso: Phaser.Tweens.Tween | null;
}

interface TeclasMovimiento {
  arriba: Phaser.Input.Keyboard.Key;
  abajo: Phaser.Input.Keyboard.Key;
  izquierda: Phaser.Input.Keyboard.Key;
  derecha: Phaser.Input.Keyboard.Key;
  w: Phaser.Input.Keyboard.Key;
  s: Phaser.Input.Keyboard.Key;
  a: Phaser.Input.Keyboard.Key;
  d: Phaser.Input.Keyboard.Key;
}

export class BaseScene extends Phaser.Scene {
  private jugador: Phaser.GameObjects.Image | null = null;
  private sombraJugador: Phaser.GameObjects.Ellipse | null = null;
  private marcadorDestino: Phaser.GameObjects.Graphics | null = null;
  private estacionesVisuales: EstacionVisual[] = [];
  private estacionCercana: EstacionVisual | null = null;

  private botonUsar: Phaser.GameObjects.Container | null = null;
  private botonUsarTexto: Phaser.GameObjects.Text | null = null;
  private avisoContainer: Phaser.GameObjects.Container | null = null;
  private avisoTexto: Phaser.GameObjects.Text | null = null;
  private timerAviso: Phaser.Time.TimerEvent | null = null;

  private bannerFugaContainer: Phaser.GameObjects.Container | null = null;
  private bannerFugaTexto: Phaser.GameObjects.Text | null = null;
  private flechaTanque: Phaser.GameObjects.Container | null = null;

  private teclas: TeclasMovimiento | null = null;
  private rutaActual: PuntoPx[] = [];
  private indiceRuta = 0;

  private modoDebug = false;
  private perfVisible = false;
  private debugVelocidadIdx = 0;
  private textoDebug: Phaser.GameObjects.Text | null = null;
  private textoPerf: Phaser.GameObjects.Text | null = null;
  private debugMisionesContainer: Phaser.GameObjects.Container | null = null;
  private debugMisionesTexto: Phaser.GameObjects.Text | null = null;

  private panelMisionesFondo: Phaser.GameObjects.Graphics | null = null;
  private panelMisionesContenido: Phaser.GameObjects.Container | null = null;
  private etiquetasSalas: Array<{
    salaId: (typeof SALAS)[number]['id'];
    texto: Phaser.GameObjects.Text;
  }> = [];

  private fondoEstrellas: Phaser.GameObjects.Image | null = null;
  private efectosBase: ControladorEfectosBase | null = null;
  private distanciaCaminataFrame = 0;
  private frameAstronautaIdx = 0;
  private modalLobby: ControlModalLobby | null = null;

  private desuscripciones: Array<() => void> = [];

  constructor() {
    super(SCENE_KEYS.base);
  }

  public create(): void {
    this.desuscripciones = [];
    this.estacionesVisuales = [];
    this.etiquetasSalas = [];
    this.estacionCercana = null;
    this.rutaActual = [];
    this.indiceRuta = 0;
    this.modoDebug = isDebugEnabled();
    this.perfVisible = isPerfEnabled();
    this.debugVelocidadIdx = 0;
    this.distanciaCaminataFrame = 0;
    this.frameAstronautaIdx = 0;

    this.dibujarMapa();
    registrarObjetivoUI('mapa', {
      x: 0,
      y: MAP_OFFSET_Y,
      ancho: GAME_WIDTH,
      alto: GAME_HEIGHT - MAP_OFFSET_Y,
    });
    this.crearPanelMisiones();
    this.crearEstaciones();
    this.crearMarcadorDestino();
    this.crearJugador();
    this.crearBotonUsar();
    this.crearBannerFuga();
    this.crearFlechaTanque();
    this.crearAvisoEstacion();
    this.modalLobby = crearModalLobby(this, {
      alAviso: (mensaje) => this.mostrarAvisoEstacion(mensaje, 3200),
    });
    this.efectosBase = new ControladorEfectosBase(this, 45);
    this.configurarEntrada();
    this.configurarDebug();
    this.suscribirEstado();
    this.desuscripciones.push(
      tutorialManager.conectarMotor(gameState, getAjustes()),
    );
    this.actualizarPanelMisiones();
    this.actualizarIndicadoresMisionEstaciones();
    this.actualizarEfectosBase();

    this.events.once('shutdown', this.limpiar, this);
  }

  public override update(_time: number, delta: number): void {
    const dtSeg = Math.min(delta / 1000, 0.05);
    const snap = gameState.getSnapshot();
    const pausadoTutorial = tutorialManager.estaPausandoReloj();

    const puedeAvanzarReloj =
      (snap.estado === 'jugando' || snap.estado === 'minijuego') &&
      !snap.pausado &&
      !pausadoTutorial;

    if (puedeAvanzarReloj) {
      const multTiempo = this.modoDebug
        ? DEBUG_VELOCIDADES[this.debugVelocidadIdx]
        : 1;
      gameState.tick(dtSeg * multTiempo);
    }

    if (snap.estado === 'jugando' && !snap.pausado && !pausadoTutorial) {
      this.actualizarMovimiento(dtSeg);
      this.actualizarEstacionCercana();
    } else {
      this.establecerBotonUsarVisible(false);
      this.reiniciarFrameQuieto();
    }

    this.efectosBase?.update(dtSeg);
    this.actualizarUIFugaUrgente();

    if (this.modoDebug) {
      this.actualizarTextoDebug();
      this.actualizarTextoPerf();
    }
  }

  private dibujarMapa(): void {
    const mapCentroX = GAME_WIDTH / 2;
    const mapCentroY = MAP_OFFSET_Y + (GAME_HEIGHT - MAP_OFFSET_Y) / 2;

    const fondoBase = this.add.graphics();
    fondoBase.fillStyle(COLORES.fondoLienzo, 1);
    fondoBase.fillRect(0, MAP_OFFSET_Y, GAME_WIDTH, GAME_HEIGHT - MAP_OFFSET_Y);

    if (this.textures.exists(TEXTURA_ESTRELLAS)) {
      this.fondoEstrellas = this.add.image(
        mapCentroX,
        mapCentroY,
        TEXTURA_ESTRELLAS,
      );
    }

    if (this.textures.exists(TEXTURA_SUELO_LUNAR)) {
      this.add.image(mapCentroX, mapCentroY, TEXTURA_SUELO_LUNAR);
    }

    const g = this.add.graphics();
    dibujarDetallesBaseExterior(g);

    for (let fila = 0; fila < MAP_ROWS; fila++) {
      for (let col = 0; col < MAP_COLS; col++) {
        if (!isWalkable(col, fila)) {
          continue;
        }
        const x = col * TILE;
        const y = MAP_OFFSET_Y + fila * TILE;
        const sala = obtenerSalaEnTile(col, fila);

        g.fillStyle(sala ? COLORES.sueloSala : COLORES.sueloPasillo, 1);
        g.fillRect(x, y, TILE, TILE);

        g.lineStyle(
          MAPA_METRICAS.grosorBaldosa,
          COLORES.baldosaLinea,
          sala ? 0.9 : 0.45,
        );
        g.strokeRect(x, y, TILE, TILE);
      }
    }

    for (const sala of SALAS) {
      g.lineStyle(MAPA_METRICAS.grosorBordeSala, sala.colorAcento, 1);
      for (let fila = sala.filaInicio; fila <= sala.filaFin; fila++) {
        for (let col = sala.colInicio; col <= sala.colFin; col++) {
          const x = col * TILE;
          const y = MAP_OFFSET_Y + fila * TILE;

          if (fila === sala.filaInicio && !isWalkable(col, fila - 1)) {
            g.lineBetween(x, y, x + TILE, y);
          }
          if (fila === sala.filaFin && !isWalkable(col, fila + 1)) {
            g.lineBetween(x, y + TILE, x + TILE, y + TILE);
          }
          if (col === sala.colInicio && !isWalkable(col - 1, fila)) {
            g.lineBetween(x, y, x, y + TILE);
          }
          if (col === sala.colFin && !isWalkable(col + 1, fila)) {
            g.lineBetween(x + TILE, y, x + TILE, y + TILE);
          }
        }
      }

      dibujarDetalleSalaProcedural(g, sala.id);

      const centroSalaX =
        ((sala.colInicio + sala.colFin + 1) / 2) * TILE +
        (sala.etiquetaDesplazadaX ?? 0);
      const yEtiqueta = MAP_OFFSET_Y + sala.filaInicio * TILE + 8;

      const textoGrande = getAjustes().textoGrande;
      const etiquetaSala = this.add
        .text(centroSalaX, yEtiqueta, obtenerNombreSala(sala.id), {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.etiquetaSala, textoGrande, 22)}px`,
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        })
        .setOrigin(0.5, 0)
        .setAlpha(0.92);
      this.etiquetasSalas.push({ salaId: sala.id, texto: etiquetaSala });
    }
  }

  private crearEstaciones(): void {
    const tam = MAPA_METRICAS.estacionTamano;

    for (const def of ESTACIONES) {
      const centro = tileACentroPx(def.tile.col, def.tile.fila);
      const g = this.add.graphics();

      g.fillStyle(COLORES.panelHud, 1);
      g.fillRoundedRect(
        -tam / 2,
        -tam / 2,
        tam,
        tam,
        MAPA_METRICAS.estacionRadio,
      );
      g.lineStyle(3, def.colorAcento, 1);
      g.strokeRoundedRect(
        -tam / 2,
        -tam / 2,
        tam,
        tam,
        MAPA_METRICAS.estacionRadio,
      );

      dibujarIconoEstacion(
        g,
        def.salaId,
        0,
        0,
        MAPA_METRICAS.estacionIconoTamano,
        def.colorAcento,
      );

      const indicadorMision = this.add.graphics();
      const textoUrgente = this.add
        .text(tam / 2 - 2, -tam / 2 + 2, '!', {
          fontFamily: FUENTE_FAMILIA,
          fontSize: '18px',
          fontStyle: 'bold',
          color: COLORES_HEX.textoPrincipal,
        })
        .setOrigin(0.5)
        .setVisible(false);

      const contenedor = this.add.container(centro.x, centro.y, [
        g,
        indicadorMision,
        textoUrgente,
      ]);

      registrarObjetivoUI(`estacion-${def.id}`, {
        x: centro.x - tam / 2,
        y: centro.y - tam / 2,
        ancho: tam,
        alto: tam,
      });

      this.estacionesVisuales.push({
        definicion: def,
        contenedor,
        indicadorMision,
        textoUrgente,
        centro,
        tweenPulso: null,
      });
    }
  }

  private crearPanelMisiones(): void {
    this.panelMisionesFondo = this.add.graphics();
    this.dibujarFondoPanelMisiones(MISION_PANEL_METRICAS.alto);
    this.panelMisionesContenido = this.add.container(0, 0);
  }

  private dibujarFondoPanelMisiones(alto: number): void {
    if (!this.panelMisionesFondo) {
      return;
    }
    const x = MISION_PANEL_METRICAS.x;
    const y = MISION_PANEL_METRICAS.y;
    const ancho = MISION_PANEL_METRICAS.ancho;

    this.panelMisionesFondo.clear();
    this.panelMisionesFondo.fillStyle(COLORES.panelHud, 0.94);
    this.panelMisionesFondo.fillRoundedRect(
      x,
      y,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
    this.panelMisionesFondo.lineStyle(
      MISION_PANEL_METRICAS.bordeGrosor,
      COLORES.bordePanel,
      1,
    );
    this.panelMisionesFondo.strokeRoundedRect(
      x,
      y,
      ancho,
      alto,
      ESPACIADO.radioPanel,
    );
  }

  private actualizarPanelMisiones(): void {
    if (!this.panelMisionesContenido) {
      return;
    }
    this.panelMisionesContenido.removeAll(true);

    const snap = gameState.getSnapshot();
    const x = MISION_PANEL_METRICAS.x;
    const y = MISION_PANEL_METRICAS.y;
    const ancho = MISION_PANEL_METRICAS.ancho;
    const misionesRegulares = obtenerMisionesDeJornada(snap.jornada);
    const misionesMostradas = snap.misionUrgente
      ? [snap.misionUrgente.mision, ...misionesRegulares]
      : [...misionesRegulares];
    const conteo = contarMisionesJornada(snap.jornada, snap.misionesHechas);

    const textoGrande = getAjustes().textoGrande;
    const filaAlto = textoGrande ? MISION_PANEL_METRICAS.filaAlto + 10 : MISION_PANEL_METRICAS.filaAlto;
    const filasAlto = misionesMostradas.length * filaAlto;
    const altoDanado = snap.moduloDanado !== null ? (textoGrande ? 46 : 38) : 0;
    const altoTotal = Math.max(
      MISION_PANEL_METRICAS.alto,
      62 + filasAlto + altoDanado + 12,
    );
    this.dibujarFondoPanelMisiones(altoTotal);
    registrarObjetivoUI('panel-misiones', {
      x,
      y,
      ancho,
      alto: altoTotal,
    });

    const tamTitulo = escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21);

    const titulo = this.add
      .text(x + ESPACIADO.margen, y + 12, t('misiones.panelTitulo'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${tamTitulo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
      })
      .setOrigin(0, 0);

    const contador = this.add
      .text(
        x + ancho - ESPACIADO.margen,
        y + 12,
        t('misiones.contador', {
          hechas: conteo.completadas,
          total: conteo.total,
        }),
        {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${tamTitulo}px`,
          fontStyle: 'bold',
          color:
            conteo.completadas === conteo.total
              ? COLORES_HEX.ok
              : COLORES_HEX.textoSecundario,
        },
      )
      .setOrigin(1, 0);

    const gIconos = this.add.graphics();
    gIconos.lineStyle(1, COLORES.bordePanel, 0.9);
    gIconos.lineBetween(
      x + ESPACIADO.margen,
      y + 42,
      x + ancho - ESPACIADO.margen,
      y + 42,
    );

    this.panelMisionesContenido.add([titulo, contador, gIconos]);

    misionesMostradas.forEach((mision, idx) => {
      const esUrgente = mision.urgente !== undefined;
      const estadoMision = obtenerEstadoMision(
        mision.id,
        snap.misionesHechas,
        snap.misionesPerdidas,
      );
      const filaY = y + 54 + idx * filaAlto;

      if (esUrgente) {
        gIconos.fillStyle(COLORES.peligro, 1);
        gIconos.fillCircle(x + ESPACIADO.margen + 12, filaY + 22, 11);
      } else if (estadoMision === 'lista') {
        dibujarIconoMisionLista(
          gIconos,
          x + ESPACIADO.margen + 12,
          filaY + 22,
          MISION_PANEL_METRICAS.iconoTamano,
          COLORES.ok,
        );
      } else if (estadoMision === 'perdida') {
        gIconos.fillStyle(COLORES.peligro, 1);
        gIconos.fillCircle(x + ESPACIADO.margen + 12, filaY + 22, 9);
      } else {
        dibujarIconoMisionActiva(
          gIconos,
          x + ESPACIADO.margen + 12,
          filaY + 22,
          MISION_PANEL_METRICAS.iconoTamano,
          COLORES.energia,
        );
      }

      const colorTitulo = esUrgente
        ? COLORES_HEX.peligro
        : estadoMision === 'lista'
          ? COLORES_HEX.ok
          : estadoMision === 'perdida'
            ? COLORES_HEX.peligro
            : COLORES_HEX.textoPrincipal;

      const textosMision = obtenerTextosMision(mision);
      const textoEstado = esUrgente
        ? t('misiones.tituloUrgenteFormato', { titulo: textosMision.titulo })
        : estadoMision === 'perdida'
          ? t('misiones.tituloPerdidaFormato', {
              titulo: textosMision.titulo,
              estado: t('misiones.estadoPerdida'),
            })
          : textosMision.titulo;

      const anchoMaxTexto = ancho - ESPACIADO.margen * 2 - 36;
      const tamItem = escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 21);

      const txtTitulo = this.add
        .text(x + ESPACIADO.margen + 32, filaY + 2, textoEstado, {
          fontFamily: FUENTE_FAMILIA,
          fontSize: `${tamItem}px`,
          fontStyle: 'bold',
          color: colorTitulo,
          wordWrap: { width: anchoMaxTexto },
        })
        .setOrigin(0, 0);

      const txtDesc = this.add
        .text(
          x + ESPACIADO.margen + 32,
          filaY + (textoGrande ? 29 : 26),
          textosMision.descripcionCorta,
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${tamItem}px`,
            fontStyle: 'normal',
            color: esUrgente ? COLORES_HEX.aviso : COLORES_HEX.textoSecundario,
            wordWrap: { width: anchoMaxTexto },
          },
        )
        .setOrigin(0, 0);

      this.panelMisionesContenido?.add([txtTitulo, txtDesc]);
    });

    if (snap.moduloDanado !== null) {
      const avisoY = y + 54 + filasAlto + 4;
      const nombreSala = obtenerNombreSala(snap.moduloDanado);
      gIconos.fillStyle(COLORES.aviso, 1);
      gIconos.fillCircle(x + ESPACIADO.margen + 12, avisoY + 11, 8);
      const txtDanado = this.add
        .text(
          x + ESPACIADO.margen + 28,
          avisoY,
          `! ${t('misiones.moduloDanadoAviso', { nombreSala })}`,
          {
            fontFamily: FUENTE_FAMILIA,
            fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.minimo, textoGrande, 20)}px`,
            fontStyle: 'bold',
            color: COLORES_HEX.aviso,
            wordWrap: { width: ancho - ESPACIADO.margen * 2 - 28 },
          },
        )
        .setOrigin(0, 0);
      this.panelMisionesContenido.add(txtDanado);
    }
  }

  private actualizarIndicadoresMisionEstaciones(): void {
    const snap = gameState.getSnapshot();
    const misiones = obtenerMisionesDeJornada(snap.jornada);
    const tam = MAPA_METRICAS.estacionTamano;

    for (const est of this.estacionesVisuales) {
      est.indicadorMision.clear();
      est.textoUrgente.setVisible(false);

      const esUrgenteAqui =
        snap.misionUrgente !== null &&
        snap.misionUrgente.mision.estacionId === est.definicion.id;

      if (esUrgenteAqui) {
        est.indicadorMision.lineStyle(4, COLORES.peligro, 1);
        est.indicadorMision.strokeRoundedRect(
          -tam / 2 - 6,
          -tam / 2 - 6,
          tam + 12,
          tam + 12,
          MAPA_METRICAS.estacionRadio + 4,
        );
        const badgeX = tam / 2 - 2;
        const badgeY = -tam / 2 + 2;
        est.indicadorMision.fillStyle(COLORES.peligro, 1);
        est.indicadorMision.fillCircle(badgeX, badgeY, 12);
        est.indicadorMision.lineStyle(2, COLORES.textoPrincipal, 1);
        est.indicadorMision.strokeCircle(badgeX, badgeY, 12);
        est.textoUrgente.setPosition(badgeX, badgeY);
        est.textoUrgente.setVisible(true);
        continue;
      }

      if (snap.moduloDanado === est.definicion.id) {
        est.indicadorMision.lineStyle(4, COLORES.aviso, 1);
        est.indicadorMision.strokeRoundedRect(
          -tam / 2 - 5,
          -tam / 2 - 5,
          tam + 10,
          tam + 10,
          MAPA_METRICAS.estacionRadio + 3,
        );
        // Icono + texto '!' para no depender solo de color en módulo dañado
        const badgeDanadoX = -tam / 2 + 2;
        const badgeDanadoY = -tam / 2 + 2;
        est.indicadorMision.fillStyle(COLORES.aviso, 1);
        est.indicadorMision.fillCircle(badgeDanadoX, badgeDanadoY, 11);
        est.indicadorMision.lineStyle(2, COLORES.fondoLienzo, 1);
        est.indicadorMision.strokeCircle(badgeDanadoX, badgeDanadoY, 11);
        est.textoUrgente.setPosition(badgeDanadoX, badgeDanadoY);
        est.textoUrgente.setColor(COLORES_HEX.botonTextoOscuro);
        est.textoUrgente.setVisible(true);
      } else {
        est.textoUrgente.setColor(COLORES_HEX.textoPrincipal);
      }

      const misionEst = misiones.find(
        (m) => m.estacionId === est.definicion.id,
      );
      if (!misionEst) {
        continue;
      }
      const estadoMision = obtenerEstadoMision(
        misionEst.id,
        snap.misionesHechas,
        snap.misionesPerdidas,
      );
      const badgeX = MAPA_METRICAS.estacionTamano / 2 - 2;
      const badgeY = -MAPA_METRICAS.estacionTamano / 2 + 2;

      if (estadoMision === 'lista') {
        dibujarIconoMisionLista(
          est.indicadorMision,
          badgeX,
          badgeY,
          20,
          COLORES.ok,
        );
      } else if (estadoMision === 'perdida') {
        est.indicadorMision.fillStyle(COLORES.peligro, 1);
        est.indicadorMision.fillCircle(badgeX, badgeY, 9);
      } else {
        dibujarIconoMisionActiva(
          est.indicadorMision,
          badgeX,
          badgeY,
          20,
          COLORES.energia,
        );
      }
    }
  }

  private crearMarcadorDestino(): void {
    const g = this.add.graphics();
    g.lineStyle(3, COLORES.aire, 0.9);
    g.strokeCircle(0, 0, MAPA_METRICAS.marcadorDestinoRadio);
    g.fillStyle(COLORES.aire, 0.2);
    g.fillCircle(0, 0, MAPA_METRICAS.marcadorDestinoRadio);
    g.setVisible(false);
    this.marcadorDestino = g;
  }

  private crearJugador(): void {
    const inicio = tileACentroPx(
      POSICION_INICIAL_TILE.col,
      POSICION_INICIAL_TILE.fila,
    );

    this.sombraJugador = this.add.ellipse(
      inicio.x,
      inicio.y + 18,
      34,
      14,
      COLORES.sombra,
      0.42,
    );

    this.jugador = this.add.image(inicio.x, inicio.y, TEXTURA_ASTRONAUTA);
  }

  private crearBotonUsar(): void {
    const tam = MAPA_METRICAS.botonUsarTamano;
    const x = GAME_WIDTH - MAPA_METRICAS.botonUsarMargen - tam / 2;
    const y = GAME_HEIGHT - MAPA_METRICAS.botonUsarMargen - tam / 2;

    const fondo = this.add.graphics();
    const dibujar = (hover: boolean): void => {
      fondo.clear();
      fondo.fillStyle(COLORES.aire, hover ? 0.9 : 1);
      fondo.fillRoundedRect(-tam / 2, -tam / 2, tam, tam, ESPACIADO.radioPanel);
      fondo.lineStyle(3, COLORES.textoPrincipal, 0.9);
      fondo.strokeRoundedRect(
        -tam / 2,
        -tam / 2,
        tam,
        tam,
        ESPACIADO.radioPanel,
      );
    };
    dibujar(false);

    const textoGrande = getAjustes().textoGrande;
    const etiqueta = this.add
      .text(0, 0, t('interaccion.usar'), {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.botonTextoOscuro,
      })
      .setOrigin(0.5);
    this.botonUsarTexto = etiqueta;

    const zona = this.add
      .zone(0, 0, tam, tam)
      .setInteractive({ useHandCursor: true });

    const contenedor = this.add.container(x, y, [fondo, etiqueta, zona]);
    contenedor.setVisible(false);

    zona.on('pointerover', () => {
      dibujar(true);
      if (!getAjustes().movimientoReducido) {
        contenedor.setScale(1.03);
      }
    });
    zona.on('pointerout', () => {
      dibujar(false);
      contenedor.setScale(1);
    });
    zona.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _lx: number,
        _ly: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event.stopPropagation();
        this.activarEstacionCercana();
      },
    );

    this.botonUsar = contenedor;
    registrarObjetivoUI('boton-usar', {
      x: x - tam / 2,
      y: y - tam / 2,
      ancho: tam,
      alto: tam,
    });
  }

  private crearBannerFuga(): void {
    const cx = GAME_WIDTH / 2 + 120;
    const cy = HUD_H + 34;
    const ancho = 500;
    const alto = 48;
    const textoGrande = getAjustes().textoGrande;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.panelHud, 0.96);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);
    fondo.lineStyle(3, COLORES.peligro, 1);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);

    const texto = this.add
      .text(0, 0, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.peligro,
      })
      .setOrigin(0.5);

    this.bannerFugaTexto = texto;
    this.bannerFugaContainer = this.add.container(cx, cy, [fondo, texto]);
    this.bannerFugaContainer.setVisible(false);
  }

  private crearFlechaTanque(): void {
    const g = this.add.graphics();
    g.fillStyle(COLORES.peligro, 1);
    g.fillTriangle(18, 0, -14, -13, -14, 13);
    g.lineStyle(2, COLORES.textoPrincipal, 1);
    g.strokeTriangle(18, 0, -14, -13, -14, 13);

    this.flechaTanque = this.add.container(0, 0, [g]);
    this.flechaTanque.setVisible(false);
  }

  private actualizarUIFugaUrgente(): void {
    const snap = gameState.getSnapshot();
    const urgente = snap.misionUrgente;

    if (!urgente || snap.estado !== 'jugando') {
      this.bannerFugaContainer?.setVisible(false);
      this.flechaTanque?.setVisible(false);
      return;
    }

    if (this.bannerFugaContainer && this.bannerFugaTexto) {
      this.bannerFugaTexto.setText(
        t('fuga.banner', {
          segundos: Math.max(0, Math.ceil(urgente.tiempoRestante)),
        }),
      );
      this.bannerFugaContainer.setVisible(true);
    }

    if (!this.flechaTanque || !this.jugador) {
      return;
    }

    const estTanque = this.estacionesVisuales.find(
      (e) => e.definicion.id === urgente.mision.estacionId,
    );
    if (!estTanque) {
      this.flechaTanque.setVisible(false);
      return;
    }

    const dx = estTanque.centro.x - this.jugador.x;
    const dy = estTanque.centro.y - this.jugador.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= RADIO_INTERACCION) {
      this.flechaTanque.setVisible(false);
      return;
    }

    const minX = 44;
    const maxX = GAME_WIDTH - 44;
    const minY = HUD_H + 44;
    const maxY = GAME_HEIGHT - 44;

    const dirX = dx / dist;
    const dirY = dy / dist;

    let tMin = Infinity;
    if (dirX > 0.0001) {
      tMin = Math.min(tMin, (maxX - this.jugador.x) / dirX);
    } else if (dirX < -0.0001) {
      tMin = Math.min(tMin, (minX - this.jugador.x) / dirX);
    }
    if (dirY > 0.0001) {
      tMin = Math.min(tMin, (maxY - this.jugador.y) / dirY);
    } else if (dirY < -0.0001) {
      tMin = Math.min(tMin, (minY - this.jugador.y) / dirY);
    }

    const posX = Math.max(minX, Math.min(maxX, this.jugador.x + dirX * tMin));
    const posY = Math.max(minY, Math.min(maxY, this.jugador.y + dirY * tMin));

    this.flechaTanque.setPosition(posX, posY);
    this.flechaTanque.setRotation(Math.atan2(dy, dx));
    this.flechaTanque.setVisible(true);
  }

  private crearAvisoEstacion(): void {
    const cx = GAME_WIDTH / 2;
    const cy = HUD_H + 88;
    const ancho = 540;
    const alto = MAPA_METRICAS.avisoAlto;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.panelHud, 0.96);
    fondo.fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);
    fondo.lineStyle(2, COLORES.aire, 1);
    fondo.strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, ESPACIADO.radioBoton);

    const textoGrande = getAjustes().textoGrande;
    const texto = this.add
      .text(0, 0, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23)}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoPrincipal,
        align: 'center',
        wordWrap: { width: ancho - 32 },
      })
      .setOrigin(0.5);

    this.avisoTexto = texto;
    this.avisoContainer = this.add.container(cx, cy, [fondo, texto]);
    this.avisoContainer.setVisible(false);
  }

  private configurarEntrada(): void {
    const teclado = this.input.keyboard;
    if (teclado) {
      this.teclas = {
        arriba: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
        abajo: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
        izquierda: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
        derecha: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
        w: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        s: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        a: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        d: teclado.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      const alPulsarTecla = (evento: KeyboardEvent): void => {
        if (evento.repeat || tutorialManager.estaPausandoReloj()) {
          return;
        }
        if (evento.code === 'KeyE' || evento.code === 'Space') {
          this.activarEstacionCercana();
        }
      };
      teclado.on('keydown', alPulsarTecla);
      this.desuscripciones.push(() => {
        teclado.off('keydown', alPulsarTecla);
      });

      const limpiarTeclasAlPerderFoco = (): void => {
        if (this.teclas) {
          Object.values(this.teclas).forEach((k: Phaser.Input.Keyboard.Key) => {
            k.reset();
          });
        }
      };
      window.addEventListener('blur', limpiarTeclasAlPerderFoco);
      this.desuscripciones.push(() => {
        window.removeEventListener('blur', limpiarTeclasAlPerderFoco);
      });
    }

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const snap = gameState.getSnapshot();
      if (
        snap.estado !== 'jugando' ||
        snap.pausado ||
        tutorialManager.estaPausandoReloj()
      ) {
        return;
      }
      if (pointer.y < MAP_OFFSET_Y) {
        return;
      }
      if (this.puntoDentroDeBotonUsar(pointer.x, pointer.y)) {
        return;
      }
      this.irAlPunto(pointer.worldX, pointer.worldY);
    });
  }

  private puntoDentroDeBotonUsar(px: number, py: number): boolean {
    if (!this.botonUsar || !this.botonUsar.visible) {
      return false;
    }
    const mitad = MAPA_METRICAS.botonUsarTamano / 2;
    return (
      Math.abs(px - this.botonUsar.x) <= mitad &&
      Math.abs(py - this.botonUsar.y) <= mitad
    );
  }

  private configurarDebug(): void {
    if (!this.modoDebug) {
      return;
    }

    this.textoDebug = this.add
      .text(ESPACIADO.margen, GAME_HEIGHT - 28, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.textoSecundario,
      })
      .setOrigin(0, 0.5);

    this.textoPerf = this.add
      .text(GAME_WIDTH - ESPACIADO.margen, HUD_H + 20, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.aire,
        backgroundColor: COLORES_HEX.pistaBarra,
        padding: { x: 8, y: 4 },
      })
      .setOrigin(1, 0.5)
      .setDepth(80)
      .setVisible(this.perfVisible);

    this.actualizarTextoDebug();
    this.actualizarTextoPerf();

    const teclado = this.input.keyboard;
    if (!teclado) {
      return;
    }

    const alPulsarDebug = (evento: KeyboardEvent): void => {
      if (evento.repeat) {
        return;
      }

      if (evento.altKey) {
        const mapaJornadas: Record<string, number> = {
          Digit1: 1,
          Numpad1: 1,
          Digit2: 2,
          Numpad2: 2,
          Digit3: 3,
          Numpad3: 3,
          Digit4: 4,
          Numpad4: 4,
          Digit5: 5,
          Numpad5: 5,
        };
        const jornadaDestino = mapaJornadas[evento.code];
        if (typeof jornadaDestino === 'number') {
          evento.preventDefault();
          gameState.irAJornadaDebug(jornadaDestino);
          return;
        }
      }

      const delta = evento.shiftKey ? DEBUG_DELTA_RECURSO : -DEBUG_DELTA_RECURSO;
      switch (evento.code) {
        case 'Digit1':
        case 'Numpad1':
          gameState.cambiarRecurso('aire', delta);
          break;
        case 'Digit2':
        case 'Numpad2':
          gameState.cambiarRecurso('energia', delta);
          break;
        case 'Digit3':
        case 'Numpad3':
          gameState.cambiarRecurso('escudo', delta);
          break;
        case 'KeyN':
          gameState.siguienteJornada();
          break;
        case 'KeyT':
          this.debugVelocidadIdx =
            (this.debugVelocidadIdx + 1) % DEBUG_VELOCIDADES.length;
          this.actualizarTextoDebug();
          break;
        case 'KeyK':
          gameState.forzarFinJornada();
          break;
        case 'KeyL':
          gameState.forzarEvacuacion();
          break;
        case 'KeyE':
          // KeyE sin Shift se conserva para usar estación; Shift+E fuerza evacuación
          if (evento.shiftKey) {
            gameState.forzarEvacuacion();
          }
          break;
        case 'KeyO':
          this.alternarOverlayDebugMisiones();
          break;
        case 'KeyM': {
          const snap = gameState.getSnapshot();
          const pendiente = obtenerSiguienteMisionPendiente(
            snap.jornada,
            snap.misionesHechas,
            snap.misionesPerdidas,
            snap.misionUrgente?.mision ?? null,
          );
          if (pendiente) {
            gameState.completarMision(pendiente.id);
          }
          break;
        }
        case 'KeyX': {
          const snap = gameState.getSnapshot();
          const pendiente = obtenerSiguienteMisionPendiente(
            snap.jornada,
            snap.misionesHechas,
            snap.misionesPerdidas,
            snap.misionUrgente?.mision ?? null,
          );
          if (pendiente) {
            gameState.fallarMision(pendiente.id);
          }
          break;
        }
        case 'KeyJ':
          gameState.irAJornadaDebug(3);
          break;
        case 'KeyV':
          gameState.forzarEventoJornadaDebug();
          break;
        case 'KeyB':
          gameState.alternarAguaBajaDebug();
          break;
        case 'KeyG':
          gameState.alternarModuloDanadoDebug('energia');
          break;
        case 'KeyI':
          gameState.abrirInformeDebug();
          break;
        case 'KeyC':
          gameState.forzarFinJornadaDebug(!evento.shiftKey);
          break;
        case 'KeyF':
          this.perfVisible = !this.perfVisible;
          this.textoPerf?.setVisible(this.perfVisible);
          this.actualizarTextoPerf();
          break;
        case 'KeyS':
          // KeyS sin Shift se conserva para caminar hacia abajo (WASD); Shift+S alterna sonido
          if (evento.shiftKey) {
            audioEngine.registrarGestoUsuario();
            const nuevo = updateAjustes({ sonido: !getAjustes().sonido });
            if (nuevo.sonido) {
              audioEngine.reproducir('clic');
            }
          }
          break;
      }
    };

    teclado.on('keydown', alPulsarDebug);
    this.desuscripciones.push(() => {
      teclado.off('keydown', alPulsarDebug);
    });

    this.crearOverlayDebugMisiones();
  }

  private crearOverlayDebugMisiones(): void {
    const ancho = 464;
    const alto = 180;
    const x = MISION_PANEL_METRICAS.x;
    const y = 492;

    const fondo = this.add.graphics();
    fondo.fillStyle(COLORES.panelHud, 0.96);
    fondo.fillRoundedRect(x, y, ancho, alto, ESPACIADO.radioBoton);
    fondo.lineStyle(2, COLORES.aviso, 1);
    fondo.strokeRoundedRect(x, y, ancho, alto, ESPACIADO.radioBoton);

    const texto = this.add
      .text(x + 12, y + 12, '', {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.minimo}px`,
        fontStyle: 'normal',
        color: COLORES_HEX.textoPrincipal,
        wordWrap: { width: ancho - 24 },
      })
      .setOrigin(0, 0);

    this.debugMisionesTexto = texto;
    this.debugMisionesContainer = this.add.container(0, 0, [fondo, texto]);
    this.debugMisionesContainer.setVisible(false);
  }

  private alternarOverlayDebugMisiones(): void {
    if (!this.debugMisionesContainer) {
      return;
    }
    const visible = !this.debugMisionesContainer.visible;
    this.debugMisionesContainer.setVisible(visible);
    if (visible) {
      this.actualizarOverlayDebugMisiones();
    }
  }

  private actualizarOverlayDebugMisiones(): void {
    if (!this.debugMisionesTexto || !this.debugMisionesContainer?.visible) {
      return;
    }
    const snap = gameState.getSnapshot();
    const misiones = obtenerMisionesDeJornada(snap.jornada);
    const lineas = [
      t('debug.misionesTitulo'),
      t('debug.misionesResumen', {
        jornada: snap.jornada,
        estado: snap.estado,
        hechas:
          snap.misionesHechas.length > 0
            ? snap.misionesHechas.join(', ')
            : t('debug.ninguna'),
      }),
      t('debug.moduloInfo', {
        modulo: snap.moduloDanado ?? t('debug.ninguno'),
        seguidas: snap.incompletasSeguidas,
      }),
      ...misiones.map((m) => {
        const estadoM = obtenerEstadoMision(
          m.id,
          snap.misionesHechas,
          snap.misionesPerdidas,
        );
        const tag =
          estadoM === 'lista'
            ? t('debug.tagLista')
            : estadoM === 'perdida'
              ? t('debug.tagPerdida')
              : t('debug.tagPendiente');
        return t('debug.atributosMision', { tag, id: m.id });
      }),
    ];
    this.debugMisionesTexto.setText(lineas.join('\n'));
  }

  private actualizarTextoDebug(): void {
    if (!this.textoDebug) {
      return;
    }
    const snap = gameState.getSnapshot();
    const velocidad = DEBUG_VELOCIDADES[this.debugVelocidadIdx];
    this.textoDebug.setText(
      t('debug.etiqueta', {
        modo: snap.modo.toUpperCase(),
        jornada: snap.jornada,
        segundos: Math.round(snap.segundos),
        velocidad,
        aguaBaja: snap.aguaBaja ? t('debug.si') : t('debug.no'),
        eventoActivo: snap.eventoActivo ? t('debug.si') : t('debug.no'),
      }),
    );
  }

  private actualizarTextoPerf(): void {
    if (!this.textoPerf || !this.perfVisible) {
      return;
    }
    const fps = Math.round(this.game.loop.actualFps);
    const particulas = this.efectosBase?.obtenerConteoParticulasVivas() ?? 0;
    this.textoPerf.setText(
      t('debug.perfEtiqueta', {
        fps,
        particulas,
      }),
    );
  }

  private suscribirEstado(): void {
    this.desuscripciones.push(
      gameState.on('recurso:cambio', () => {
        this.actualizarEfectosBase();
      }),
    );

    this.desuscripciones.push(
      gameState.on('evento:abrir', () => {
        this.actualizarEfectosBase();
      }),
    );

    this.desuscripciones.push(
      gameState.on('jornada:nueva', () => {
        this.reiniciarPosicionJugador();
        this.actualizarPanelMisiones();
        this.actualizarIndicadoresMisionEstaciones();
        this.actualizarOverlayDebugMisiones();
        this.actualizarEfectosBase();
      }),
    );

    this.desuscripciones.push(
      gameState.on('mision:completada', () => {
        this.actualizarPanelMisiones();
        this.actualizarIndicadoresMisionEstaciones();
        this.actualizarOverlayDebugMisiones();
      }),
    );

    this.desuscripciones.push(
      gameState.on('fuga:fin', (ev) => {
        this.mostrarAvisoEstacion(
          ev.reparada ? t('fuga.reparada') : t('fuga.perdida'),
        );
      }),
    );

    this.desuscripciones.push(
      gameState.on('apagon:resuelto', (ev) => {
        this.mostrarAvisoEstacion(
          t('apagon.bannerResumen', { detalle: ev.resumen }),
          DURACION_BANNER_APAGON_MS,
        );
      }),
    );

    this.desuscripciones.push(
      gameState.on('estado:cambio', (ev) => {
        if (ev.estado !== 'jugando' && this.teclas) {
          Object.values(this.teclas).forEach((k: Phaser.Input.Keyboard.Key) => {
            k.reset();
          });
        }
        this.actualizarPanelMisiones();
        this.actualizarIndicadoresMisionEstaciones();
        this.actualizarOverlayDebugMisiones();
        this.actualizarEfectosBase();
      }),
    );

    this.desuscripciones.push(
      suscribirAjustes((ajustes) => {
        const textoGrande = ajustes.textoGrande;
        for (const item of this.etiquetasSalas) {
          item.texto.setText(obtenerNombreSala(item.salaId));
          item.texto.setFontSize(
            escalarTamanoTexto(TAMANOS_TEXTO.etiquetaSala, textoGrande, 22),
          );
        }
        this.botonUsarTexto?.setText(t('interaccion.usar'));
        this.botonUsarTexto?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26),
        );
        this.bannerFugaTexto?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23),
        );
        this.avisoTexto?.setFontSize(
          escalarTamanoTexto(TAMANOS_TEXTO.subtitulo, textoGrande, 23),
        );
        this.actualizarPanelMisiones();
        this.actualizarEfectosBase();
        if (ajustes.movimientoReducido) {
          this.reiniciarFrameQuieto();
          this.actualizarParallaxEstrellas(GAME_WIDTH / 2, GAME_HEIGHT / 2, true);
          for (const est of this.estacionesVisuales) {
            this.detenerPulsoEstacion(est);
          }
        } else if (this.estacionCercana) {
          this.iniciarPulsoEstacion(this.estacionCercana);
        }
      }),
    );
  }

  private actualizarEfectosBase(): void {
    if (!this.efectosBase) {
      return;
    }
    const snap = gameState.getSnapshot();
    const enEventoClima =
      snap.eventoClimaDisparado ||
      snap.estado === 'evento' ||
      snap.eventoActivo === 'FULGURACION' ||
      snap.eventoActivo === 'TORMENTA_GRANDE';
    const estado = evaluarEfectosActivos(
      { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
      enEventoClima,
      getAjustes().movimientoReducido,
    );
    this.efectosBase.aplicarEstado(estado);
  }

  private reiniciarPosicionJugador(): void {
    const inicio = tileACentroPx(
      POSICION_INICIAL_TILE.col,
      POSICION_INICIAL_TILE.fila,
    );
    this.rutaActual = [];
    this.indiceRuta = 0;
    this.marcadorDestino?.setVisible(false);

    if (this.jugador && this.sombraJugador) {
      this.jugador.setPosition(inicio.x, inicio.y);
      this.jugador.setFlipX(false);
      this.sombraJugador.setPosition(inicio.x, inicio.y + 18);
      this.reiniciarFrameQuieto();
      this.actualizarParallaxEstrellas(
        inicio.x,
        inicio.y,
        getAjustes().movimientoReducido,
      );
    }
    this.actualizarEstacionCercana();
  }

  private irAlPunto(worldX: number, worldY: number): void {
    if (!this.jugador) {
      return;
    }
    const tilePulsado = pxATile(worldX, worldY);
    let tileDestino: TileCoord | null = tilePulsado;

    if (!isWalkable(tileDestino.col, tileDestino.fila)) {
      tileDestino = encontrarTileCaminableMasCercano(worldX, worldY);
    }
    if (!tileDestino) {
      return;
    }

    const tileOrigen = pxATile(this.jugador.x, this.jugador.y);
    const caminoTiles = encontrarCamino(tileOrigen, tileDestino);
    if (caminoTiles.length === 0) {
      return;
    }

    const puntos = caminoTiles.map((tile) => tileACentroPx(tile.col, tile.fila));
    if (
      puntos.length > 1 &&
      Phaser.Math.Distance.Between(
        this.jugador.x,
        this.jugador.y,
        puntos[0].x,
        puntos[0].y,
      ) < 8
    ) {
      puntos.shift();
    }

    this.rutaActual = puntos;
    this.indiceRuta = 0;

    const ultimo = puntos[puntos.length - 1];
    if (this.marcadorDestino && ultimo) {
      this.marcadorDestino.setPosition(ultimo.x, ultimo.y);
      this.marcadorDestino.setVisible(true);
    }
  }

  private actualizarMovimiento(dtSeg: number): void {
    if (!this.jugador || !this.sombraJugador) {
      return;
    }

    let vx = 0;
    let vy = 0;

    if (this.teclas) {
      if (this.teclas.izquierda.isDown || this.teclas.a.isDown) vx -= 1;
      if (this.teclas.derecha.isDown || this.teclas.d.isDown) vx += 1;
      if (this.teclas.arriba.isDown || this.teclas.w.isDown) vy -= 1;
      if (this.teclas.abajo.isDown || this.teclas.s.isDown) vy += 1;
    }

    if (vx !== 0 || vy !== 0) {
      if (this.rutaActual.length > 0) {
        this.rutaActual = [];
        this.indiceRuta = 0;
        this.marcadorDestino?.setVisible(false);
      }

      const magnitud = Math.hypot(vx, vy);
      const dx = (vx / magnitud) * VELOCIDAD_JUGADOR * dtSeg;
      const dy = (vy / magnitud) * VELOCIDAD_JUGADOR * dtSeg;
      this.moverJugadorConColision(dx, dy);
      return;
    }

    if (this.rutaActual.length > 0 && this.indiceRuta < this.rutaActual.length) {
      this.avanzarPorRuta(dtSeg);
      return;
    }

    this.reiniciarFrameQuieto();
  }

  private avanzarPorRuta(dtSeg: number): void {
    if (!this.jugador) {
      return;
    }
    let pasoRestante = VELOCIDAD_JUGADOR * dtSeg;

    while (pasoRestante > 0 && this.indiceRuta < this.rutaActual.length) {
      const objetivo = this.rutaActual[this.indiceRuta];
      const dx = objetivo.x - this.jugador.x;
      const dy = objetivo.y - this.jugador.y;
      const dist = Math.hypot(dx, dy);

      if (dist <= pasoRestante || dist < 1) {
        this.moverJugadorConColision(dx, dy);
        pasoRestante -= dist;
        this.indiceRuta += 1;
      } else {
        const movX = (dx / dist) * pasoRestante;
        const movY = (dy / dist) * pasoRestante;
        this.moverJugadorConColision(movX, movY);
        pasoRestante = 0;
      }
    }

    if (this.indiceRuta >= this.rutaActual.length) {
      this.rutaActual = [];
      this.indiceRuta = 0;
      this.marcadorDestino?.setVisible(false);
    }
  }

  private moverJugadorConColision(dx: number, dy: number): void {
    if (!this.jugador || !this.sombraJugador) {
      return;
    }

    if (dx < -0.1) {
      this.jugador.setFlipX(true);
    } else if (dx > 0.1) {
      this.jugador.setFlipX(false);
    }

    const prevX = this.jugador.x;
    const prevY = this.jugador.y;

    const pos = resolverMovimientoConColision(
      prevX,
      prevY,
      dx,
      dy,
      RADIO_JUGADOR,
    );

    this.jugador.setPosition(pos.x, pos.y);
    this.sombraJugador.setPosition(pos.x, pos.y + 18);

    const distMovida = Math.hypot(pos.x - prevX, pos.y - prevY);
    const reducido = getAjustes().movimientoReducido;
    if (distMovida > 0) {
      tutorialManager.registrarMovimiento(distMovida);
      if (reducido) {
        this.reiniciarFrameQuieto();
      } else {
        this.distanciaCaminataFrame += distMovida;
        if (this.distanciaCaminataFrame >= 20) {
          this.distanciaCaminataFrame = 0;
          this.frameAstronautaIdx =
            (this.frameAstronautaIdx + 1) % TEXTURAS_ASTRONAUTA_CAMINATA.length;
          const tex = TEXTURAS_ASTRONAUTA_CAMINATA[this.frameAstronautaIdx];
          if (this.textures.exists(tex)) {
            this.jugador.setTexture(tex);
          }
        }
      }
      this.actualizarParallaxEstrellas(pos.x, pos.y, reducido);
    } else {
      this.reiniciarFrameQuieto();
    }
  }

  private reiniciarFrameQuieto(): void {
    if (this.frameAstronautaIdx !== 0) {
      this.frameAstronautaIdx = 0;
      this.distanciaCaminataFrame = 0;
      this.jugador?.setTexture(TEXTURA_ASTRONAUTA);
    }
  }

  private actualizarParallaxEstrellas(
    jugadorX: number,
    jugadorY: number,
    reducido: boolean,
  ): void {
    if (!this.fondoEstrellas) {
      return;
    }
    const baseCx = GAME_WIDTH / 2;
    const baseCy = MAP_OFFSET_Y + (GAME_HEIGHT - MAP_OFFSET_Y) / 2;
    if (reducido) {
      this.fondoEstrellas.setPosition(baseCx, baseCy);
      return;
    }
    const offX = Math.max(-18, Math.min(18, (baseCx - jugadorX) * 0.025));
    const offY = Math.max(-18, Math.min(18, (baseCy - jugadorY) * 0.025));
    this.fondoEstrellas.setPosition(baseCx + offX, baseCy + offY);
  }

  private actualizarEstacionCercana(): void {
    if (!this.jugador) {
      return;
    }

    let masCercana: EstacionVisual | null = null;
    let mejorDist = RADIO_INTERACCION;

    for (const est of this.estacionesVisuales) {
      const d = Phaser.Math.Distance.Between(
        this.jugador.x,
        this.jugador.y,
        est.centro.x,
        est.centro.y,
      );
      if (d <= mejorDist) {
        mejorDist = d;
        masCercana = est;
      }
    }

    if (masCercana !== this.estacionCercana) {
      if (this.estacionCercana) {
        this.detenerPulsoEstacion(this.estacionCercana);
      }
      this.estacionCercana = masCercana;
      if (this.estacionCercana) {
        this.iniciarPulsoEstacion(this.estacionCercana);
      }
    }

    tutorialManager.registrarProximidadEstacion(
      this.estacionCercana?.definicion.id ?? null,
      this.estacionCercana !== null,
    );

    this.establecerBotonUsarVisible(this.estacionCercana !== null);
  }

  private iniciarPulsoEstacion(estacion: EstacionVisual): void {
    if (estacion.tweenPulso || getAjustes().movimientoReducido) {
      return;
    }
    estacion.tweenPulso = this.tweens.add({
      targets: estacion.contenedor,
      scale: { from: 1, to: 1.09 },
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private detenerPulsoEstacion(estacion: EstacionVisual): void {
    if (estacion.tweenPulso) {
      estacion.tweenPulso.stop();
      estacion.tweenPulso = null;
    }
    estacion.contenedor.setScale(1);
  }

  private establecerBotonUsarVisible(visible: boolean): void {
    if (this.botonUsar && this.botonUsar.visible !== visible) {
      this.botonUsar.setVisible(visible);
    }
  }

  private activarEstacionCercana(): void {
    const snap = gameState.getSnapshot();
    if (
      snap.estado !== 'jugando' ||
      snap.pausado ||
      !this.estacionCercana ||
      this.modalLobby?.estaAbierto()
    ) {
      return;
    }
    audioEngine.reproducir('clic');

    const estacion = this.estacionCercana.definicion;
    const misionActiva = obtenerMisionActivaParaEstacion(
      snap.jornada,
      estacion.id,
      snap.misionesHechas,
      snap.misionesPerdidas,
      snap.misionUrgente?.mision ?? null,
    );

    if (misionActiva) {
      gameState.iniciarMinijuego(
        estacion.id,
        misionActiva.id,
        misionActiva.minijuego,
        {
          pasos: misionActiva.pasos,
          tiempoLimite: misionActiva.tiempoLimite,
        },
      );
      return;
    }

    const nombreEstacion = obtenerNombreEstacion(estacion.id);
    if (estacion.id === 'lobby') {
      this.modalLobby?.abrir();
      return;
    }

    if (estacion.id === 'refugio') {
      this.activarRefugio(snap.jornada, snap.refugioSellado, snap.descansoRefugioUsado, snap.eventoDisparadoEnJornada, snap.eventoActivo);
      return;
    }

    if (estacion.id === 'tanque') {
      this.activarTanque(snap.tanqueInspeccionado, snap.jornada);
      return;
    }

    if (
      estacion.id === 'energia' ||
      estacion.id === 'invernadero' ||
      estacion.id === 'escudos'
    ) {
      const misionesEstacion = obtenerMisionesDeJornada(snap.jornada).filter(
        (m) => m.estacionId === estacion.id,
      );
      if (misionesEstacion.length > 0) {
        this.mostrarAvisoEstacion(
          t('interaccion.misionYaLista', { nombreEstacion }),
        );
      } else {
        this.mostrarAvisoEstacion(
          t('interaccion.sinMisionHoy', { nombreEstacion }),
        );
      }
      return;
    }

    this.mostrarAvisoEstacion(t('interaccion.proximamente', { nombreEstacion }));
  }

  private activarRefugio(
    jornada: number,
    refugioSellado: boolean,
    descansoUsado: boolean,
    eventoDisparado: boolean,
    eventoActivo: string | null,
  ): void {
    const puedeSellar =
      (jornada === 3 || jornada === 5) && !eventoDisparado && !refugioSellado;
    if (puedeSellar) {
      if (gameState.sellarRefugio()) {
        this.mostrarAvisoEstacion(t('interaccion.refugioSellado'), 2800);
      } else {
        this.mostrarAvisoEstacion(t('interaccion.refugioYaSellado'));
      }
      return;
    }

    if (!descansoUsado && !eventoActivo) {
      if (gameState.descansarEnRefugio()) {
        this.mostrarAvisoEstacion(
          t('interaccion.refugioDescanso', {
            escudo: DESCANSO_REFUGIO_ESCUDO,
            segundos: DESCANSO_REFUGIO_SEG,
          }),
          2800,
        );
      } else {
        this.mostrarAvisoEstacion(t('interaccion.refugioDescansoUsado'));
      }
      return;
    }

    if (refugioSellado) {
      this.mostrarAvisoEstacion(t('interaccion.refugioDescansoUsado'));
      return;
    }
    if (jornada === 3 || jornada === 5) {
      this.mostrarAvisoEstacion(t('interaccion.refugioYaSellado'));
      return;
    }
    this.mostrarAvisoEstacion(t('interaccion.refugioNoClima'));
  }

  private activarTanque(tanqueInspeccionado: boolean, jornada: number): void {
    if (!tanqueInspeccionado && jornada === 2) {
      if (gameState.inspeccionarTanque()) {
        this.mostrarAvisoEstacion(t('interaccion.tanqueInspeccionado'), 2800);
      } else {
        this.mostrarAvisoEstacion(t('interaccion.tanqueYaInspeccionado'));
      }
      return;
    }

    const misionesTanque = obtenerMisionesDeJornada(jornada).filter(
      (m) => m.estacionId === 'tanque',
    );
    if (misionesTanque.length > 0) {
      this.mostrarAvisoEstacion(
        t('interaccion.misionYaLista', {
          nombreEstacion: obtenerNombreEstacion('tanque'),
        }),
      );
      return;
    }

    if (tanqueInspeccionado) {
      this.mostrarAvisoEstacion(t('interaccion.tanqueYaInspeccionado'));
      return;
    }
    this.mostrarAvisoEstacion(t('interaccion.tanqueSinAccion'));
  }

  private mostrarAvisoEstacion(
    mensaje: string,
    duracionMs = DURACION_AVISO_ESTACION_MS,
  ): void {
    if (!this.avisoContainer || !this.avisoTexto) {
      return;
    }
    this.avisoTexto.setText(mensaje);
    this.avisoContainer.setVisible(true);

    if (this.timerAviso) {
      this.timerAviso.remove(false);
    }
    this.timerAviso = this.time.delayedCall(duracionMs, () => {
      this.avisoContainer?.setVisible(false);
      this.timerAviso = null;
    });
  }

  private limpiar(): void {
    desregistrarObjetivoUI('mapa');
    desregistrarObjetivoUI('panel-misiones');
    desregistrarObjetivoUI('boton-usar');
    for (const def of ESTACIONES) {
      desregistrarObjetivoUI(`estacion-${def.id}`);
    }

    for (const desuscribir of this.desuscripciones) {
      desuscribir();
    }
    this.desuscripciones = [];

    for (const est of this.estacionesVisuales) {
      this.detenerPulsoEstacion(est);
    }

    this.efectosBase?.destroy();
    this.efectosBase = null;
    this.fondoEstrellas = null;
    this.modalLobby?.destroy();
    this.modalLobby = null;

    if (this.timerAviso) {
      this.timerAviso.remove(false);
      this.timerAviso = null;
    }
  }
}
