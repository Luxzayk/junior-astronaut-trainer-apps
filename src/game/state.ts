// Estado único del juego y emisor de eventos desacoplado de Phaser

import {
  localEventosProvider,
  type EventosProvider,
} from '../data/eventosLoader';
import { t } from '../i18n';
import type {
  MinigameId,
  MinigameParams,
  MinigameResult,
} from '../minigames/types';
import {
  AGUA_BAJA_MULT_AIRE,
  DEMO_DURACION,
  DEMO_EVENTO_SEGUNDO,
  DEMO_JORNADA,
  DEMO_RECURSOS,
  DRENAJE_BASE_POR_SEG,
  DURACION_JORNADA,
  generarRecursosIniciales,
  MAX_JORNADAS,
} from './balance';
import { obtenerMultiplicadorJornada } from './clock';
import {
  crearEntradaBitacora,
  clonarBitacora,
  type EntradaBitacora,
} from './bitacora';
import {
  evaluarCierreJornada,
  obtenerMultiplicadorModuloDanado,
  type GastoRecursos,
  type ResultadoCierreJornada,
} from './closing';
import {
  obtenerEfectosApagon,
  obtenerEfectosOpcionEventoClima,
  type IdOpcionApagon,
  type IdOpcionEventoFLR,
  type TipoOpcionesClima,
} from './events';
import {
  crearMisionFugaUrgente,
  JORNADAS,
  type DefinicionMision,
  type IdOpcionEnergia,
  type TipoEleccion,
} from './jornadas';
import type { SalaId } from './map';
import {
  obtenerCostoIntento,
  obtenerEstadoMision,
  obtenerEventoDeJornada,
  obtenerMisionesDeJornada,
  obtenerMisionPorId,
  obtenerOpcionEleccionPorId,
  obtenerOpcionEnergiaPorId,
  type MapaDeltasRecursos,
} from './missions';
import {
  obtenerSemanaActiva,
  obtenerSemanaPorId,
  type IdSemana,
} from './semanas';
import { updateAjustes } from './settings';

export type RecursoNombre = 'aire' | 'energia' | 'escudo';
export type ModoJuego = 'semana' | 'demo';

export type EstadoJuego =
  | 'jugando'
  | 'pausa'
  | 'finJornada'
  | 'evacuacion'
  | 'minijuego'
  | 'eleccion'
  | 'evento'
  | 'apagon';

export interface MisionUrgenteActiva {
  mision: DefinicionMision;
  tiempoRestante: number;
}

export interface ResumenJornadaEstado {
  jornada: number;
  completa: boolean;
}

export interface GameState {
  modo: ModoJuego;
  semanaId: IdSemana;
  jornada: number; // 1..5
  segundos: number; // tiempo transcurrido en la jornada
  aire: number; // 0..100
  energia: number; // 0..100
  escudo: number; // 0..100
  misionesHechas: string[];
  misionesPerdidas: string[];
  pausado: boolean;
  estado: EstadoJuego;
  incompletasSeguidas: number;
  moduloDanado: SalaId | null;
  refuerzoControlUsado: boolean;
  aguaBaja: boolean;
  aguaBajaPendiente: boolean;
  misionUrgente: MisionUrgenteActiva | null;
  gastoJornada: GastoRecursos;
  ultimoCierre: ResultadoCierreJornada | null;
  eventoClimaDisparado: boolean;
  eventoDisparadoEnJornada: boolean;
  eventoActivo: string | null;
  bitacora: EntradaBitacora[];
  resultadosJornadas: ResumenJornadaEstado[];
}

export interface EventoRecursoCambio {
  recurso: RecursoNombre;
  valor: number;
  anterior: number;
}

export interface EventoJornadaTick {
  jornada: number;
  segundos: number;
}

export interface EventoResultadoJornada {
  jornada: number;
  aire: number;
  energia: number;
  escudo: number;
}

export interface EventoJornadaNueva {
  jornada: number;
}

export interface EventoPausa {
  pausado: boolean;
  estado: EstadoJuego;
}

export interface EventoMisionCompletada {
  misionId: string;
  misionesHechas: readonly string[];
}

export interface EventoAbrirMinijuego {
  estacionId: SalaId;
  misionId: string | null;
  minigameId: MinigameId;
  params?: MinigameParams;
}

export interface EventoAbrirEleccion {
  estacionId: SalaId;
  misionId: string | null;
  tipoEleccion: TipoEleccion;
}

export interface EventoAbrirEventoClima {
  eventoId: string;
  opciones: TipoOpcionesClima;
}

export interface EventoApagonResuelto {
  opcionId: IdOpcionApagon;
  resumen: string;
}

export interface EventoFugaResultado {
  reparada: boolean;
}

export interface EventoMisionResultado {
  estacionId: SalaId;
  misionId: string | null;
}

export interface EventoEleccionConfirmada {
  tipoEleccion: TipoEleccion;
  opcionId: string;
  misionId: string | null;
}

export interface EventoEstadoCambio {
  estado: EstadoJuego;
}

export interface MapaEventosJuego {
  'recurso:cambio': EventoRecursoCambio;
  'jornada:tick': EventoJornadaTick;
  'jornada:fin': EventoResultadoJornada;
  evacuacion: EventoResultadoJornada;
  'jornada:nueva': EventoJornadaNueva;
  pausa: EventoPausa;
  'mision:completada': EventoMisionCompletada;
  'mision:completa': EventoMisionResultado;
  'mision:fallo': EventoMisionResultado;
  'mision:salida': EventoMisionResultado;
  'minijuego:abrir': EventoAbrirMinijuego;
  'eleccion:abrir': EventoAbrirEleccion;
  'eleccion:confirmada': EventoEleccionConfirmada;
  'evento:abrir': EventoAbrirEventoClima;
  'apagon:abrir': Record<string, never>;
  'apagon:resuelto': EventoApagonResuelto;
  'fuga:inicio': Record<string, never>;
  'fuga:fin': EventoFugaResultado;
  'estado:cambio': EventoEstadoCambio;
}

export type NombreEventoJuego = keyof MapaEventosJuego;

type Listener<K extends NombreEventoJuego> = (
  payload: MapaEventosJuego[K],
) => void;

type RecursosSnapshot = {
  aire: number;
  energia: number;
  escudo: number;
};

interface SnapshotInicioJornada {
  recursos: RecursosSnapshot;
  incompletasSeguidas: number;
  moduloDanado: SalaId | null;
  refuerzoControlUsado: boolean;
  aguaBaja: boolean;
  aguaBajaPendiente: boolean;
  eventoClimaDisparado: boolean;
  bitacora: EntradaBitacora[];
  resultadosJornadas: ResumenJornadaEstado[];
}

function limitarRecurso(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

function crearGastoVacio(): GastoRecursos {
  return { aire: 0, energia: 0, escudo: 0 };
}

function obtenerEstacionDeMision(misionId: string): SalaId | null {
  for (const jornada of JORNADAS) {
    for (const mision of jornada.misiones) {
      if (mision.id === misionId) {
        return mision.estacionId;
      }
    }
  }
  return null;
}

export class GameStateManager {
  private state: GameState;
  private inicioJornada: SnapshotInicioJornada;
  private readonly eventosProvider: EventosProvider;
  private listeners: {
    [K in NombreEventoJuego]: Set<Listener<K>>;
  };

  constructor(eventosProvider: EventosProvider = localEventosProvider) {
    this.eventosProvider = eventosProvider;
    this.state = this.crearEstadoInicial('semana');
    this.inicioJornada = this.capturarInicioJornada();
    this.listeners = {
      'recurso:cambio': new Set(),
      'jornada:tick': new Set(),
      'jornada:fin': new Set(),
      evacuacion: new Set(),
      'jornada:nueva': new Set(),
      pausa: new Set(),
      'mision:completada': new Set(),
      'mision:completa': new Set(),
      'mision:fallo': new Set(),
      'mision:salida': new Set(),
      'minijuego:abrir': new Set(),
      'eleccion:abrir': new Set(),
      'eleccion:confirmada': new Set(),
      'evento:abrir': new Set(),
      'apagon:abrir': new Set(),
      'apagon:resuelto': new Set(),
      'fuga:inicio': new Set(),
      'fuga:fin': new Set(),
      'estado:cambio': new Set(),
    };
  }

  private crearEstadoInicial(
    modo: ModoJuego,
    semanaId?: IdSemana,
    recursosIniciales?: RecursosSnapshot,
  ): GameState {
    const semanaActiva = semanaId
      ? obtenerSemanaPorId(semanaId).id
      : obtenerSemanaActiva().id;

    if (modo === 'demo') {
      return {
        modo: 'demo',
        semanaId: semanaActiva,
        jornada: DEMO_JORNADA,
        segundos: 0,
        aire: DEMO_RECURSOS.aire,
        energia: DEMO_RECURSOS.energia,
        escudo: DEMO_RECURSOS.escudo,
        misionesHechas: [],
        misionesPerdidas: [],
        pausado: false,
        estado: 'jugando',
        incompletasSeguidas: 0,
        moduloDanado: null,
        refuerzoControlUsado: false,
        aguaBaja: false,
        aguaBajaPendiente: false,
        misionUrgente: null,
        gastoJornada: crearGastoVacio(),
        ultimoCierre: null,
        eventoClimaDisparado: false,
        eventoDisparadoEnJornada: false,
        eventoActivo: null,
        bitacora: [],
        resultadosJornadas: [],
      };
    }

    const iniciales = recursosIniciales ?? generarRecursosIniciales();

    return {
      modo: 'semana',
      semanaId: semanaActiva,
      jornada: 1,
      segundos: 0,
      aire: limitarRecurso(iniciales.aire),
      energia: limitarRecurso(iniciales.energia),
      escudo: limitarRecurso(iniciales.escudo),
      misionesHechas: [],
      misionesPerdidas: [],
      pausado: false,
      estado: 'jugando',
      incompletasSeguidas: 0,
      moduloDanado: null,
      refuerzoControlUsado: false,
      aguaBaja: false,
      aguaBajaPendiente: false,
      misionUrgente: null,
      gastoJornada: crearGastoVacio(),
      ultimoCierre: null,
      eventoClimaDisparado: false,
      eventoDisparadoEnJornada: false,
      eventoActivo: null,
      bitacora: [],
      resultadosJornadas: [],
    };
  }

  private capturarInicioJornada(): SnapshotInicioJornada {
    return {
      recursos: {
        aire: this.state.aire,
        energia: this.state.energia,
        escudo: this.state.escudo,
      },
      incompletasSeguidas: this.state.incompletasSeguidas,
      moduloDanado: this.state.moduloDanado,
      refuerzoControlUsado: this.state.refuerzoControlUsado,
      aguaBaja: this.state.aguaBaja,
      aguaBajaPendiente: this.state.aguaBajaPendiente,
      eventoClimaDisparado: this.state.eventoClimaDisparado,
      bitacora: clonarBitacora(this.state.bitacora),
      resultadosJornadas: this.state.resultadosJornadas.map((r) => ({ ...r })),
    };
  }

  public obtenerDuracionJornadaActual(): number {
    return this.state.modo === 'demo' ? DEMO_DURACION : DURACION_JORNADA;
  }

  public getSnapshot(): Readonly<GameState> {
    return {
      ...this.state,
      misionesHechas: [...this.state.misionesHechas],
      misionesPerdidas: [...this.state.misionesPerdidas],
      misionUrgente: this.state.misionUrgente
        ? {
            mision: { ...this.state.misionUrgente.mision },
            tiempoRestante: this.state.misionUrgente.tiempoRestante,
          }
        : null,
      gastoJornada: { ...this.state.gastoJornada },
      ultimoCierre: this.state.ultimoCierre
        ? {
            ...this.state.ultimoCierre,
            gastoJornada: { ...this.state.ultimoCierre.gastoJornada },
            recursosFinales: { ...this.state.ultimoCierre.recursosFinales },
          }
        : null,
      bitacora: clonarBitacora(this.state.bitacora),
      resultadosJornadas: this.state.resultadosJornadas.map((r) => ({ ...r })),
    };
  }

  public on<K extends NombreEventoJuego>(
    evento: K,
    listener: Listener<K>,
  ): () => void {
    this.listeners[evento].add(listener);
    return () => {
      this.off(evento, listener);
    };
  }

  public off<K extends NombreEventoJuego>(
    evento: K,
    listener: Listener<K>,
  ): void {
    this.listeners[evento].delete(listener);
  }

  private emit<K extends NombreEventoJuego>(
    evento: K,
    payload: MapaEventosJuego[K],
  ): void {
    for (const listener of this.listeners[evento]) {
      listener(payload);
    }
  }

  public reset(recursosIniciales?: RecursosSnapshot): void {
    this.iniciarModo('semana', undefined, recursosIniciales);
  }

  public iniciarSemana(
    semanaId?: IdSemana,
    recursosIniciales?: RecursosSnapshot,
  ): void {
    if (semanaId) {
      updateAjustes({ ultimaSemana: obtenerSemanaPorId(semanaId).id });
    }
    this.iniciarModo('semana', semanaId, recursosIniciales);
  }

  public iniciarDemo(semanaId?: IdSemana): void {
    this.iniciarModo('demo', semanaId);
  }

  private iniciarModo(
    modo: ModoJuego,
    semanaId?: IdSemana,
    recursosIniciales?: RecursosSnapshot,
  ): void {
    const anteriores: RecursosSnapshot = {
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    };
    this.state = this.crearEstadoInicial(modo, semanaId, recursosIniciales);
    this.inicioJornada = this.capturarInicioJornada();

    this.emitirCambiosRecursos(anteriores);
    this.emit('pausa', {
      pausado: this.state.pausado,
      estado: this.state.estado,
    });
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('jornada:nueva', { jornada: this.state.jornada });
  }

  public reiniciarJornadaActual(): void {
    const anteriores: RecursosSnapshot = {
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    };

    const prefijoJornada = `j${this.state.jornada}_`;
    this.state.misionesHechas = this.state.misionesHechas.filter(
      (id) => !id.startsWith(prefijoJornada),
    );
    this.state.misionesPerdidas = this.state.misionesPerdidas.filter(
      (id) => !id.startsWith(prefijoJornada),
    );

    this.state.segundos = 0;
    this.state.aire = this.inicioJornada.recursos.aire;
    this.state.energia = this.inicioJornada.recursos.energia;
    this.state.escudo = this.inicioJornada.recursos.escudo;
    this.state.incompletasSeguidas = this.inicioJornada.incompletasSeguidas;
    this.state.moduloDanado = this.inicioJornada.moduloDanado;
    this.state.refuerzoControlUsado = this.inicioJornada.refuerzoControlUsado;
    this.state.aguaBaja = this.inicioJornada.aguaBaja;
    this.state.aguaBajaPendiente = this.inicioJornada.aguaBajaPendiente;
    this.state.misionUrgente = null;
    this.state.eventoClimaDisparado = this.inicioJornada.eventoClimaDisparado;
    this.state.eventoDisparadoEnJornada = false;
    this.state.eventoActivo = null;
    this.state.gastoJornada = crearGastoVacio();
    this.state.ultimoCierre = null;
    this.state.bitacora = clonarBitacora(this.inicioJornada.bitacora);
    this.state.resultadosJornadas = this.inicioJornada.resultadosJornadas.map(
      (r) => ({ ...r }),
    );
    this.state.pausado = false;
    this.state.estado = 'jugando';

    this.emitirCambiosRecursos(anteriores);
    this.emit('pausa', {
      pausado: this.state.pausado,
      estado: this.state.estado,
    });
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('jornada:nueva', { jornada: this.state.jornada });
  }

  private emitirCambiosRecursos(anteriores: RecursosSnapshot): void {
    const nombres: readonly RecursoNombre[] = ['aire', 'energia', 'escudo'];
    for (const nombre of nombres) {
      if (this.state[nombre] !== anteriores[nombre]) {
        this.emit('recurso:cambio', {
          recurso: nombre,
          valor: this.state[nombre],
          anterior: anteriores[nombre],
        });
      }
    }
  }

  private registrarGasto(nombre: RecursoNombre, deltaNegativo: number): void {
    if (deltaNegativo > 0) {
      this.state.gastoJornada[nombre] += deltaNegativo;
    }
  }

  private cerrarJornadaActual(): void {
    const anteriores: RecursosSnapshot = {
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    };

    const { resultado, nuevoEstadoCierre } = evaluarCierreJornada({
      jornada: this.state.jornada,
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
      misionesHechas: this.state.misionesHechas,
      gastoJornada: this.state.gastoJornada,
      incompletasSeguidasActual: this.state.incompletasSeguidas,
      refuerzoControlUsadoActual: this.state.refuerzoControlUsado,
      moduloDanadoActual: this.state.moduloDanado,
      aguaBajaAplicada: this.state.aguaBaja,
      aguaBajaProxima: this.state.aguaBajaPendiente,
    });

    this.state.aire = nuevoEstadoCierre.aire;
    this.state.energia = nuevoEstadoCierre.energia;
    this.state.incompletasSeguidas = nuevoEstadoCierre.incompletasSeguidas;
    this.state.moduloDanado = nuevoEstadoCierre.moduloDanado;
    this.state.refuerzoControlUsado = nuevoEstadoCierre.refuerzoControlUsado;
    this.state.aguaBaja = false;
    this.state.misionUrgente = null;
    this.state.eventoActivo = null;
    this.state.ultimoCierre = resultado;
    const otrosResultados = this.state.resultadosJornadas.filter(
      (r) => r.jornada !== this.state.jornada,
    );
    this.state.resultadosJornadas = [
      ...otrosResultados,
      { jornada: this.state.jornada, completa: resultado.tipo === 'completa' },
    ].sort((a, b) => a.jornada - b.jornada);
    this.state.estado = 'finJornada';

    this.emitirCambiosRecursos(anteriores);
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('jornada:fin', {
      jornada: this.state.jornada,
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    });
  }

  public tick(dtSeg: number): void {
    const enJuegoOMinijuego =
      this.state.estado === 'jugando' || this.state.estado === 'minijuego';
    if (!enJuegoOMinijuego || this.state.pausado || dtSeg <= 0) {
      return;
    }

    const duracion = this.obtenerDuracionJornadaActual();
    const mult = obtenerMultiplicadorJornada(this.state.jornada);
    const multAireModulo = obtenerMultiplicadorModuloDanado(
      'aire',
      this.state.moduloDanado,
    );
    const multAguaBaja = this.state.aguaBaja ? AGUA_BAJA_MULT_AIRE : 1;
    const multEnergia = obtenerMultiplicadorModuloDanado(
      'energia',
      this.state.moduloDanado,
    );
    const multEscudo = obtenerMultiplicadorModuloDanado(
      'escudo',
      this.state.moduloDanado,
    );

    const anteriores: RecursosSnapshot = {
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    };

    this.state.aire = limitarRecurso(
      this.state.aire -
        DRENAJE_BASE_POR_SEG.aire * mult * multAireModulo * multAguaBaja * dtSeg,
    );
    this.state.energia = limitarRecurso(
      this.state.energia -
        DRENAJE_BASE_POR_SEG.energia * mult * multEnergia * dtSeg,
    );
    this.state.escudo = limitarRecurso(
      this.state.escudo -
        DRENAJE_BASE_POR_SEG.escudo * mult * multEscudo * dtSeg,
    );

    this.registrarGasto('aire', anteriores.aire - this.state.aire);
    this.registrarGasto('energia', anteriores.energia - this.state.energia);
    this.registrarGasto('escudo', anteriores.escudo - this.state.escudo);

    this.emitirCambiosRecursos(anteriores);

    if (this.state.aire <= 0) {
      this.state.aire = 0;
      this.state.estado = 'evacuacion';
      this.emit('estado:cambio', { estado: this.state.estado });
      this.emit('evacuacion', {
        jornada: this.state.jornada,
        aire: this.state.aire,
        energia: this.state.energia,
        escudo: this.state.escudo,
      });
      return;
    }

    this.state.segundos += dtSeg;
    this.emit('jornada:tick', {
      jornada: this.state.jornada,
      segundos: this.state.segundos,
    });

    if (this.state.misionUrgente !== null) {
      this.state.misionUrgente.tiempoRestante -= dtSeg;
      if (this.state.misionUrgente.tiempoRestante <= 0) {
        const idUrgente = this.state.misionUrgente.mision.id;
        this.state.misionUrgente = null;
        this.state.eventoActivo = null;
        if (!this.state.misionesPerdidas.includes(idUrgente)) {
          this.state.misionesPerdidas = [
            ...this.state.misionesPerdidas,
            idUrgente,
          ];
        }
        this.state.aguaBajaPendiente = true;
        this.registrarEnBitacora({
          tipo: 'fuga',
          id: 'fuga_perdida',
          nota: 'aguaBaja',
        });
        this.emit('fuga:fin', { reparada: false });
        this.emit('estado:cambio', { estado: this.state.estado });
      }
    }

    const eventoDef = obtenerEventoDeJornada(this.state.jornada);
    if (
      eventoDef &&
      !this.state.eventoDisparadoEnJornada &&
      this.state.estado === 'jugando'
    ) {
      const segundoObjetivo =
        this.state.modo === 'demo' ? DEMO_EVENTO_SEGUNDO : eventoDef.segundo;
      if (
        this.state.segundos >= segundoObjetivo &&
        this.state.segundos < duracion
      ) {
        this.dispararEventoJornada();
        if (this.state.estado !== 'jugando') {
          return;
        }
      }
    }

    if (this.state.segundos >= duracion) {
      this.state.segundos = duracion;
      this.cerrarJornadaActual();
    }
  }

  private dispararEventoJornada(): void {
    const eventoDef = obtenerEventoDeJornada(this.state.jornada);
    this.state.eventoDisparadoEnJornada = true;

    if (!eventoDef) {
      const eventoCurado = this.eventosProvider.obtenerPorSemanaYJornada(
        this.state.semanaId,
        3,
      );
      const opciones: TipoOpcionesClima =
        eventoCurado.nivel === 'fuerte' ? 'TORMENTA_GRANDE' : 'FULGURACION';
      this.state.eventoClimaDisparado = true;
      this.state.eventoActivo = opciones;
      this.state.estado = 'evento';
      this.emit('estado:cambio', { estado: this.state.estado });
      this.emit('evento:abrir', {
        eventoId: eventoCurado.id,
        opciones,
      });
      return;
    }

    if (eventoDef.tipo === 'fuga') {
      const misionFuga = crearMisionFugaUrgente(
        this.state.jornada,
        eventoDef.pasos,
        eventoDef.tiempoLimite,
        eventoDef.ventana,
      );
      this.state.misionUrgente = {
        mision: misionFuga,
        tiempoRestante: eventoDef.ventana,
      };
      this.state.eventoActivo = 'fuga';
      this.registrarEnBitacora({
        tipo: 'fuga',
        id: 'fuga_inicio',
      });
      this.emit('fuga:inicio', {});
      this.emit('estado:cambio', { estado: this.state.estado });
      return;
    }

    if (eventoDef.tipo === 'clima') {
      const eventoCurado = this.eventosProvider.obtenerPorSemanaYJornada(
        this.state.semanaId,
        this.state.jornada,
      );
      const opciones: TipoOpcionesClima =
        eventoCurado.nivel === 'fuerte' ? 'TORMENTA_GRANDE' : 'FULGURACION';
      this.state.eventoClimaDisparado = true;
      this.state.eventoActivo = opciones;
      this.state.estado = 'evento';
      this.emit('estado:cambio', { estado: this.state.estado });
      this.emit('evento:abrir', {
        eventoId: eventoCurado.id,
        opciones,
      });
      return;
    }

    this.state.eventoActivo = 'apagon';
    this.state.estado = 'apagon';
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('apagon:abrir', {});
  }

  public cambiarRecurso(nombre: RecursoNombre, delta: number): void {
    const anterior = this.state[nombre];
    const nuevo = limitarRecurso(anterior + delta);
    this.state[nombre] = nuevo;

    if (nuevo < anterior) {
      this.registrarGasto(nombre, anterior - nuevo);
    }

    if (nuevo !== anterior) {
      this.emit('recurso:cambio', {
        recurso: nombre,
        valor: nuevo,
        anterior,
      });
    }

    if (
      nombre === 'aire' &&
      this.state.aire <= 0 &&
      (this.state.estado === 'jugando' ||
        this.state.estado === 'minijuego' ||
        this.state.estado === 'eleccion' ||
        this.state.estado === 'evento' ||
        this.state.estado === 'apagon')
    ) {
      this.state.estado = 'evacuacion';
      this.emit('estado:cambio', { estado: this.state.estado });
      this.emit('evacuacion', {
        jornada: this.state.jornada,
        aire: this.state.aire,
        energia: this.state.energia,
        escudo: this.state.escudo,
      });
    }
  }

  public aplicarDeltasRecursos(deltas: MapaDeltasRecursos): void {
    const nombres: readonly RecursoNombre[] = ['energia', 'escudo', 'aire'];
    for (const nombre of nombres) {
      const delta = deltas[nombre];
      if (typeof delta === 'number' && delta !== 0) {
        this.cambiarRecurso(nombre, delta);
      }
    }
  }

  public completarMision(misionId: string): void {
    if (
      this.state.misionesHechas.includes(misionId) ||
      this.state.misionesPerdidas.includes(misionId)
    ) {
      return;
    }
    this.state.misionesHechas = [...this.state.misionesHechas, misionId];

    if (
      this.state.misionUrgente &&
      this.state.misionUrgente.mision.id === misionId
    ) {
      this.state.misionUrgente = null;
      this.state.eventoActivo = null;
      this.registrarEnBitacora({
        tipo: 'fuga',
        id: 'fuga_reparada',
      });
      this.emit('fuga:fin', { reparada: true });
    }

    const estacionMision = obtenerEstacionDeMision(misionId);
    let limpioModulo = false;
    if (estacionMision !== null && this.state.moduloDanado === estacionMision) {
      this.state.moduloDanado = null;
      limpioModulo = true;
    }

    this.emit('mision:completada', {
      misionId,
      misionesHechas: [...this.state.misionesHechas],
    });

    if (limpioModulo) {
      this.emit('estado:cambio', { estado: this.state.estado });
    }
  }

  public fallarMision(misionId: string): void {
    if (
      this.state.misionesHechas.includes(misionId) ||
      this.state.misionesPerdidas.includes(misionId)
    ) {
      return;
    }
    this.state.misionesPerdidas = [...this.state.misionesPerdidas, misionId];

    if (
      this.state.misionUrgente &&
      this.state.misionUrgente.mision.id === misionId
    ) {
      this.state.misionUrgente = null;
      this.state.eventoActivo = null;
      this.state.aguaBajaPendiente = true;
      this.registrarEnBitacora({
        tipo: 'fuga',
        id: 'fuga_perdida',
        nota: 'aguaBaja',
      });
      this.emit('fuga:fin', { reparada: false });
    }

    this.emit('estado:cambio', { estado: this.state.estado });
  }

  private registrarEnBitacora(params: {
    tipo: EntradaBitacora['tipo'];
    id: string;
    deltas?: Partial<EntradaBitacora['deltas']>;
    nota?: string;
  }): void {
    this.state.bitacora = [
      ...this.state.bitacora,
      crearEntradaBitacora({
        jornada: this.state.jornada,
        tipo: params.tipo,
        id: params.id,
        deltas: params.deltas,
        nota: params.nota,
      }),
    ];
  }

  public iniciarMinijuego(
    estacionId: SalaId,
    misionId: string | null,
    minigameId: MinigameId,
    params?: MinigameParams,
  ): void {
    if (this.state.estado !== 'jugando' || this.state.pausado) {
      return;
    }
    const costo = obtenerCostoIntento(minigameId);
    this.registrarEnBitacora({
      tipo: 'intento',
      id: minigameId,
      deltas: costo,
      nota: misionId ?? estacionId,
    });
    this.aplicarDeltasRecursos(costo);

    this.state.estado = 'minijuego';
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('minijuego:abrir', {
      estacionId,
      misionId,
      minigameId,
      params,
    });
  }

  public iniciarMinijuegoNodos(estacionId: SalaId, misionId: string | null): void {
    this.iniciarMinijuego(estacionId, misionId, 'nodos');
  }

  public finalizarMinijuego(
    resultado: MinigameResult,
    estacionId: SalaId,
    misionId: string | null,
  ): void {
    if (this.state.estado !== 'minijuego') {
      return;
    }

    if (resultado === 'exito') {
      this.emit('mision:completa', { estacionId, misionId });

      const mision = obtenerMisionPorId(
        this.state.jornada,
        misionId,
        this.state.misionUrgente?.mision ?? null,
      );

      if (mision && !mision.sinEleccion && mision.eleccion !== null) {
        this.state.estado = 'eleccion';
        this.emit('estado:cambio', { estado: this.state.estado });
        this.emit('eleccion:abrir', {
          estacionId,
          misionId,
          tipoEleccion: mision.eleccion,
        });
        return;
      }

      if (
        misionId &&
        !mision &&
        !this.state.misionesPerdidas.includes(misionId) &&
        !misionId.includes('fuga_tanque')
      ) {
        this.state.estado = 'eleccion';
        this.emit('estado:cambio', { estado: this.state.estado });
        this.emit('eleccion:abrir', {
          estacionId,
          misionId,
          tipoEleccion: 'envio_energia',
        });
        return;
      }

      if (misionId) {
        this.completarMision(misionId);
      }
    } else if (resultado === 'fallo') {
      this.emit('mision:fallo', { estacionId, misionId });
    } else {
      this.emit('mision:salida', { estacionId, misionId });
    }

    this.state.estado = 'jugando';
    this.emit('estado:cambio', { estado: this.state.estado });
  }

  public finalizarMinijuegoNodos(
    completado: boolean,
    estacionId: SalaId,
    misionId: string | null,
  ): void {
    if (this.state.estado !== 'minijuego') {
      return;
    }
    if (completado) {
      this.emit('mision:completa', { estacionId, misionId });
      const mision = obtenerMisionPorId(
        this.state.jornada,
        misionId,
        this.state.misionUrgente?.mision ?? null,
      );
      const tipoEleccion = mision?.eleccion ?? 'envio_energia';
      this.state.estado = 'eleccion';
      this.emit('estado:cambio', { estado: this.state.estado });
      this.emit('eleccion:abrir', {
        estacionId,
        misionId,
        tipoEleccion,
      });
      return;
    }
    this.emit('mision:salida', { estacionId, misionId });
    this.state.estado = 'jugando';
    this.emit('estado:cambio', { estado: this.state.estado });
  }

  public aplicarEleccion(
    tipoEleccion: TipoEleccion,
    opcionId: string,
    misionId: string | null,
  ): void {
    if (this.state.estado !== 'eleccion') {
      return;
    }
    const opcion = obtenerOpcionEleccionPorId(tipoEleccion, opcionId);
    this.registrarEnBitacora({
      tipo: 'eleccion',
      id: opcionId,
      deltas: opcion?.efectos,
      nota: tipoEleccion,
    });
    if (opcion) {
      this.aplicarDeltasRecursos(opcion.efectos);
    }
    if (misionId) {
      this.completarMision(misionId);
    }

    this.emit('eleccion:confirmada', { tipoEleccion, opcionId, misionId });

    if (this.state.estado === 'eleccion') {
      this.state.estado = 'jugando';
      this.emit('estado:cambio', { estado: this.state.estado });
    }
  }

  public aplicarEleccionEnergia(
    opcionId: IdOpcionEnergia,
    misionId: string | null,
  ): void {
    if (this.state.estado !== 'eleccion') {
      return;
    }
    const opcion = obtenerOpcionEnergiaPorId(opcionId);
    this.registrarEnBitacora({
      tipo: 'eleccion',
      id: opcionId,
      deltas: opcion?.efectos,
      nota: 'envio_energia',
    });
    if (opcion) {
      this.aplicarDeltasRecursos(opcion.efectos);
    }
    if (misionId) {
      this.completarMision(misionId);
    }

    this.emit('eleccion:confirmada', {
      tipoEleccion: 'envio_energia',
      opcionId,
      misionId,
    });

    if (this.state.estado === 'eleccion') {
      this.state.estado = 'jugando';
      this.emit('estado:cambio', { estado: this.state.estado });
    }
  }

  public resolverEventoClima(
    opcionId: IdOpcionEventoFLR,
    tipoOpciones: TipoOpcionesClima = 'FULGURACION',
  ): void {
    if (this.state.estado !== 'evento') {
      return;
    }
    const efectos = obtenerEfectosOpcionEventoClima(opcionId, tipoOpciones);
    this.registrarEnBitacora({
      tipo: 'evento',
      id: opcionId,
      deltas: efectos,
      nota: tipoOpciones,
    });
    this.aplicarDeltasRecursos(efectos);

    if (opcionId === 'refugiarte') {
      const misionesJornada = obtenerMisionesDeJornada(this.state.jornada);
      const nuevasPerdidas: string[] = [];
      for (const mision of misionesJornada) {
        if (
          obtenerEstadoMision(
            mision.id,
            this.state.misionesHechas,
            this.state.misionesPerdidas,
          ) === 'pendiente'
        ) {
          nuevasPerdidas.push(mision.id);
        }
      }
      if (nuevasPerdidas.length > 0) {
        this.state.misionesPerdidas = [
          ...this.state.misionesPerdidas,
          ...nuevasPerdidas,
        ];
      }
    }

    this.state.eventoActivo = null;
    if (this.state.estado === 'evento') {
      this.state.estado = 'jugando';
      this.emit('estado:cambio', { estado: this.state.estado });
    }
  }

  public resolverApagon(opcionId: IdOpcionApagon): void {
    if (this.state.estado !== 'apagon') {
      return;
    }
    const efectos = obtenerEfectosApagon(opcionId);
    this.registrarEnBitacora({
      tipo: 'apagon',
      id: opcionId,
      deltas: efectos,
    });
    this.aplicarDeltasRecursos(efectos);

    let resumen = '';
    if (opcionId === 'soporteVida') {
      resumen = t('apagon.resumenOpcion', {
        titulo: t('apagon.opcionSoporteTitulo'),
        delta: efectos.aire ?? 0,
        recurso: t('recursos.aire'),
      });
    } else if (opcionId === 'escudos') {
      resumen = t('apagon.resumenOpcion', {
        titulo: t('apagon.opcionEscudosTitulo'),
        delta: efectos.escudo ?? 0,
        recurso: t('recursos.escudo'),
      });
    } else {
      const misionesJornada = obtenerMisionesDeJornada(this.state.jornada);
      const nuevasPerdidas: string[] = [];
      for (const mision of misionesJornada) {
        if (
          mision.estacionId === 'invernadero' &&
          obtenerEstadoMision(
            mision.id,
            this.state.misionesHechas,
            this.state.misionesPerdidas,
          ) === 'pendiente'
        ) {
          nuevasPerdidas.push(mision.id);
        }
      }
      if (nuevasPerdidas.length > 0) {
        this.state.misionesPerdidas = [
          ...this.state.misionesPerdidas,
          ...nuevasPerdidas,
        ];
      }
      resumen = t('apagon.resumenOpcion', {
        titulo: t('apagon.opcionInvernaderoTitulo'),
        delta: efectos.energia ?? 0,
        recurso: t('recursos.energia'),
      });
    }

    this.state.eventoActivo = null;
    this.emit('apagon:resuelto', { opcionId, resumen });

    if (this.state.estado === 'apagon') {
      this.state.estado = 'jugando';
      this.emit('estado:cambio', { estado: this.state.estado });
    }
  }

  public siguienteJornada(): void {
    if (this.state.modo === 'demo') {
      return;
    }
    if (this.state.jornada < MAX_JORNADAS) {
      this.state.jornada += 1;
    }
    this.state.segundos = 0;
    this.state.pausado = false;
    this.state.estado = 'jugando';
    this.state.aguaBaja = this.state.aguaBajaPendiente;
    this.state.aguaBajaPendiente = false;
    this.state.misionUrgente = null;
    this.state.eventoDisparadoEnJornada = false;
    this.state.eventoClimaDisparado = false;
    this.state.eventoActivo = null;
    this.state.gastoJornada = crearGastoVacio();
    this.state.ultimoCierre = null;
    this.inicioJornada = this.capturarInicioJornada();

    this.emit('pausa', {
      pausado: this.state.pausado,
      estado: this.state.estado,
    });
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('jornada:nueva', { jornada: this.state.jornada });
  }

  public setPausa(pausado: boolean): void {
    if (this.state.estado !== 'jugando' && this.state.estado !== 'pausa') {
      return;
    }
    this.state.pausado = pausado;
    this.state.estado = pausado ? 'pausa' : 'jugando';
    this.emit('pausa', {
      pausado: this.state.pausado,
      estado: this.state.estado,
    });
    this.emit('estado:cambio', { estado: this.state.estado });
  }

  public forzarFinJornada(): void {
    if (this.state.estado === 'evacuacion') {
      return;
    }
    this.state.pausado = false;
    this.state.segundos = this.obtenerDuracionJornadaActual();
    this.emit('jornada:tick', {
      jornada: this.state.jornada,
      segundos: this.state.segundos,
    });
    this.cerrarJornadaActual();
  }

  public forzarEvacuacion(): void {
    const anterior = this.state.aire;
    this.state.pausado = false;
    this.state.aire = 0;
    this.state.estado = 'evacuacion';
    if (anterior !== 0) {
      this.emit('recurso:cambio', {
        recurso: 'aire',
        valor: 0,
        anterior,
      });
    }
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('evacuacion', {
      jornada: this.state.jornada,
      aire: this.state.aire,
      energia: this.state.energia,
      escudo: this.state.escudo,
    });
  }

  public irAJornadaDebug(jornadaDestino: number): void {
    const jornadaSegura = Math.max(
      1,
      Math.min(MAX_JORNADAS, Math.round(jornadaDestino)),
    );
    this.state.jornada = jornadaSegura;
    this.state.segundos = 0;
    this.state.pausado = false;
    this.state.estado = 'jugando';
    this.state.misionUrgente = null;
    this.state.eventoDisparadoEnJornada = false;
    this.state.eventoClimaDisparado = false;
    this.state.eventoActivo = null;
    this.state.gastoJornada = crearGastoVacio();
    this.state.ultimoCierre = null;
    this.inicioJornada = this.capturarInicioJornada();

    this.emit('pausa', {
      pausado: this.state.pausado,
      estado: this.state.estado,
    });
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('jornada:nueva', { jornada: this.state.jornada });
  }

  public forzarEventoJornadaDebug(): void {
    if (this.state.estado === 'evacuacion') {
      return;
    }
    this.state.pausado = false;
    this.state.estado = 'jugando';
    this.dispararEventoJornada();
  }

  public forzarEventoClimaDebug(): void {
    if (this.state.estado === 'evacuacion') {
      return;
    }
    const jornadaClima = this.state.jornada >= 5 ? 5 : 3;
    const eventoCurado = this.eventosProvider.obtenerPorSemanaYJornada(
      this.state.semanaId,
      jornadaClima,
    );
    const opciones: TipoOpcionesClima =
      eventoCurado.nivel === 'fuerte' ? 'TORMENTA_GRANDE' : 'FULGURACION';
    this.state.pausado = false;
    this.state.eventoClimaDisparado = true;
    this.state.eventoDisparadoEnJornada = true;
    this.state.eventoActivo = opciones;
    this.state.estado = 'evento';
    this.emit('estado:cambio', { estado: this.state.estado });
    this.emit('evento:abrir', {
      eventoId: eventoCurado.id,
      opciones,
    });
  }

  public alternarAguaBajaDebug(): void {
    this.state.aguaBaja = !this.state.aguaBaja;
    this.emit('estado:cambio', { estado: this.state.estado });
  }

  public alternarModuloDanadoDebug(estacionId: SalaId): void {
    this.state.moduloDanado =
      this.state.moduloDanado === estacionId ? null : estacionId;
    this.emit('estado:cambio', { estado: this.state.estado });
  }

  public forzarFinJornadaDebug(completa: boolean): void {
    if (this.state.estado === 'evacuacion') {
      return;
    }
    const misiones = obtenerMisionesDeJornada(this.state.jornada);
    if (completa) {
      const hechas = new Set(this.state.misionesHechas);
      for (const m of misiones) {
        hechas.add(m.id);
      }
      this.state.misionesHechas = [...hechas];
      this.state.misionesPerdidas = this.state.misionesPerdidas.filter(
        (id) => !misiones.some((m) => m.id === id),
      );
      this.state.misionUrgente = null;
    } else if (misiones.length > 0) {
      const idsJornada = new Set(misiones.map((m) => m.id));
      this.state.misionesHechas = this.state.misionesHechas.filter(
        (id) => !idsJornada.has(id),
      );
      this.state.misionesPerdidas = [
        ...new Set([
          ...this.state.misionesPerdidas,
          misiones[0].id,
        ]),
      ];
    }
    this.forzarFinJornada();
  }

  public abrirInformeDebug(): void {
    this.state.modo = 'semana';
    this.state.jornada = MAX_JORNADAS;
    this.state.pausado = false;
    this.state.aire = Math.max(28, this.state.aire);
    this.state.energia = Math.max(36, this.state.energia);
    this.state.escudo = Math.max(42, this.state.escudo);
    this.state.resultadosJornadas = [
      { jornada: 1, completa: true },
      { jornada: 2, completa: true },
      { jornada: 3, completa: false },
      { jornada: 4, completa: true },
      { jornada: 5, completa: true },
    ];
    if (this.state.bitacora.length === 0) {
      this.registrarEnBitacora({
        tipo: 'eleccion',
        id: 'mandarAire',
        deltas: { aire: 30, energia: -6 },
        nota: 'envio_energia',
      });
      this.registrarEnBitacora({
        tipo: 'evento',
        id: 'seguirTrabajando',
        deltas: { escudo: -25 },
        nota: 'FULGURACION',
      });
      this.registrarEnBitacora({
        tipo: 'apagon',
        id: 'escudos',
        deltas: { escudo: -22 },
      });
    }
    const misionesJ5 = obtenerMisionesDeJornada(MAX_JORNADAS);
    this.state.misionesHechas = [
      ...new Set([...this.state.misionesHechas, ...misionesJ5.map((m) => m.id)]),
    ];
    this.forzarFinJornada();
  }
}

export const gameState = new GameStateManager();
