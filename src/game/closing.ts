// Lógica pura de cierre de jornada, módulo dañado y refuerzo del Control de Misión (sin Phaser)

import { t } from '../i18n';
import {
  MULT_MODULO_DANADO,
  RECARGA_COMPLETA,
  REFUERZO_CONTROL_MISION,
  UMBRAL_INCOMPLETAS_REFUERZO,
} from './balance';
import type { SalaId } from './map';
import { obtenerMisionesDeJornada } from './missions';
import type { RecursoNombre } from './state';

export interface GastoRecursos {
  aire: number;
  energia: number;
  escudo: number;
}

export type TipoCierre = 'completa' | 'incompleta' | 'refuerzo';

export interface ResultadoCierreJornada {
  jornada: number;
  tipo: TipoCierre;
  misionesHechasCount: number;
  misionesTotal: number;
  gastoJornada: GastoRecursos;
  recursosFinales: GastoRecursos;
  deltaEnergia: number;
  deltaAire: number;
  moduloDanado: SalaId | null;
  incompletasSeguidas: number;
  refuerzoEnviado: boolean;
  aguaBajaAplicada: boolean;
  aguaBajaProxima: boolean;
  mensajeEfecto: string;
}

export interface ParametrosCierreJornada {
  jornada: number;
  aire: number;
  energia: number;
  escudo: number;
  misionesHechas: readonly string[];
  gastoJornada: GastoRecursos;
  incompletasSeguidasActual: number;
  refuerzoControlUsadoActual: boolean;
  moduloDanadoActual: SalaId | null;
  aguaBajaAplicada?: boolean;
  aguaBajaProxima?: boolean;
}

export interface EvaluacionCierreOutput {
  resultado: ResultadoCierreJornada;
  nuevoEstadoCierre: {
    aire: number;
    energia: number;
    incompletasSeguidas: number;
    moduloDanado: SalaId | null;
    refuerzoControlUsado: boolean;
  };
}

function limitar(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

export function obtenerRecursoDeEstacion(
  estacionId: SalaId | null,
): RecursoNombre | null {
  switch (estacionId) {
    case 'energia':
      return 'energia';
    case 'invernadero':
    case 'tanque':
      return 'aire';
    case 'escudos':
      return 'escudo';
    default:
      return null;
  }
}

export function obtenerMultiplicadorModuloDanado(
  recurso: RecursoNombre,
  moduloDanado: SalaId | null,
): number {
  const recursoAfectado = obtenerRecursoDeEstacion(moduloDanado);
  return recursoAfectado === recurso ? MULT_MODULO_DANADO : 1;
}

export function evaluarCierreJornada(
  params: ParametrosCierreJornada,
): EvaluacionCierreOutput {
  const misiones = obtenerMisionesDeJornada(params.jornada).filter(
    (m) => m.urgente === undefined && m.obligatoria,
  );
  const misionesTotal = misiones.length;
  let misionesHechasCount = 0;
  let primeraPendiente: SalaId | null = null;

  for (const mision of misiones) {
    if (params.misionesHechas.includes(mision.id)) {
      misionesHechasCount += 1;
    } else if (primeraPendiente === null) {
      primeraPendiente = mision.estacionId;
    }
  }

  const todasHechas =
    misionesTotal > 0 ? misionesHechasCount >= misionesTotal : true;
  const recursosVivos =
    params.aire > 0 && params.energia > 0 && params.escudo > 0;
  const jornadaCompleta = todasHechas && recursosVivos;
  const aguaBajaAplicada = Boolean(params.aguaBajaAplicada);
  const aguaBajaProxima = Boolean(params.aguaBajaProxima);

  if (jornadaCompleta) {
    const nuevaEnergia = limitar(params.energia + RECARGA_COMPLETA);
    const deltaEnergia = nuevaEnergia - params.energia;
    const nuevoModuloDanado = params.moduloDanadoActual;

    const resultado: ResultadoCierreJornada = {
      jornada: params.jornada,
      tipo: 'completa',
      misionesHechasCount,
      misionesTotal,
      gastoJornada: { ...params.gastoJornada },
      recursosFinales: {
        aire: params.aire,
        energia: nuevaEnergia,
        escudo: params.escudo,
      },
      deltaEnergia,
      deltaAire: 0,
      moduloDanado: nuevoModuloDanado,
      incompletasSeguidas: 0,
      refuerzoEnviado: false,
      aguaBajaAplicada,
      aguaBajaProxima,
      mensajeEfecto: t('overlays.efectoCompleta'),
    };

    return {
      resultado,
      nuevoEstadoCierre: {
        aire: params.aire,
        energia: nuevaEnergia,
        incompletasSeguidas: 0,
        moduloDanado: nuevoModuloDanado,
        refuerzoControlUsado: params.refuerzoControlUsadoActual,
      },
    };
  }

  const nuevoModuloDanado = primeraPendiente ?? params.moduloDanadoActual;
  const incompletasAcumuladas = params.incompletasSeguidasActual + 1;
  const debeEnviarRefuerzo =
    incompletasAcumuladas >= UMBRAL_INCOMPLETAS_REFUERZO &&
    !params.refuerzoControlUsadoActual;

  if (debeEnviarRefuerzo) {
    const nuevaEnergia = limitar(
      params.energia + REFUERZO_CONTROL_MISION.energia,
    );
    const nuevoAire = limitar(params.aire + REFUERZO_CONTROL_MISION.aire);
    const deltaEnergia = nuevaEnergia - params.energia;
    const deltaAire = nuevoAire - params.aire;

    const resultado: ResultadoCierreJornada = {
      jornada: params.jornada,
      tipo: 'refuerzo',
      misionesHechasCount,
      misionesTotal,
      gastoJornada: { ...params.gastoJornada },
      recursosFinales: {
        aire: nuevoAire,
        energia: nuevaEnergia,
        escudo: params.escudo,
      },
      deltaEnergia,
      deltaAire,
      moduloDanado: nuevoModuloDanado,
      incompletasSeguidas: 0,
      refuerzoEnviado: true,
      aguaBajaAplicada,
      aguaBajaProxima,
      mensajeEfecto: t('overlays.efectoRefuerzo'),
    };

    return {
      resultado,
      nuevoEstadoCierre: {
        aire: nuevoAire,
        energia: nuevaEnergia,
        incompletasSeguidas: 0,
        moduloDanado: nuevoModuloDanado,
        refuerzoControlUsado: true,
      },
    };
  }

  const resultado: ResultadoCierreJornada = {
    jornada: params.jornada,
    tipo: 'incompleta',
    misionesHechasCount,
    misionesTotal,
    gastoJornada: { ...params.gastoJornada },
    recursosFinales: {
      aire: params.aire,
      energia: params.energia,
      escudo: params.escudo,
    },
    deltaEnergia: 0,
    deltaAire: 0,
    moduloDanado: nuevoModuloDanado,
    incompletasSeguidas: incompletasAcumuladas,
    refuerzoEnviado: false,
    aguaBajaAplicada,
    aguaBajaProxima,
    mensajeEfecto: t('overlays.efectoIncompleta', { jornada: params.jornada }),
  };

  return {
    resultado,
    nuevoEstadoCierre: {
      aire: params.aire,
      energia: params.energia,
      incompletasSeguidas: incompletasAcumuladas,
      moduloDanado: nuevoModuloDanado,
      refuerzoControlUsado: params.refuerzoControlUsadoActual,
    },
  };
}
