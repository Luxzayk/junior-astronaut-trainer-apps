// Motor de simulación pura de 5 jornadas (sin Phaser) reutilizando la lógica real del juego

import type { EventosProvider, NivelEvento } from '../data/eventosLoader';
import {
  MAX_JORNADAS,
  RECURSOS_INICIALES,
  SIM_TIEMPO_MISION,
} from './balance';
import type { TipoCierre } from './closing';
import {
  obtenerOpcionesApagon,
  obtenerOpcionesEventoClima,
  type IdOpcionApagon,
  type IdOpcionEventoFLR,
  type TipoOpcionesClima,
} from './events';
import type { OpcionEleccion, TipoEleccion } from './jornadas';
import {
  obtenerEstadoMision,
  obtenerMisionesDeJornada,
  obtenerOpcionesPorTipoEleccion,
} from './missions';
import { GameStateManager, type RecursoNombre } from './state';

export type PoliticaSimulacion = 'perfecto' | 'pasivo' | 'mediocre';

export interface OpcionesSimulacionSemana {
  nivelJ3?: NivelEvento;
  nivelJ5?: NivelEvento;
  recursosIniciales?: MinimosRecursos;
}

export interface MinimosRecursos {
  aire: number;
  energia: number;
  escudo: number;
}

export interface ResultadoJornadaSim {
  jornada: number;
  completadaSinEvacuacion: boolean;
  evacuado: boolean;
  segundoEvacuacion: number | null;
  tipoCierre: TipoCierre | null;
  misionesHechas: number;
  misionesTotal: number;
  minimos: MinimosRecursos;
  finales: MinimosRecursos;
  aguaBajaActiva: boolean;
  moduloDanadoAlCerrar: string | null;
}

export interface ResultadoSemanaSim {
  politica: PoliticaSimulacion;
  semanaCompletada: boolean;
  evacuado: boolean;
  jornadaAlcanzada: number;
  jornadaEvacuacion: number | null;
  segundoEvacuacion: number | null;
  minimosSemana: MinimosRecursos;
  finalesSemana: MinimosRecursos;
  jornadas: ResultadoJornadaSim[];
}

function limitar(valor: number): number {
  return Math.max(0, Math.min(100, valor));
}

function recursoMasBajo(snap: MinimosRecursos): RecursoNombre {
  if (snap.aire <= snap.energia && snap.aire <= snap.escudo) {
    return 'aire';
  }
  if (snap.energia <= snap.escudo) {
    return 'energia';
  }
  return 'escudo';
}

function elegirOpcionEleccion(
  politica: PoliticaSimulacion,
  tipo: TipoEleccion,
  actual: MinimosRecursos,
): OpcionEleccion {
  const opciones = obtenerOpcionesPorTipoEleccion(tipo);
  if (politica !== 'perfecto') {
    return opciones[0];
  }

  const objetivo = recursoMasBajo(actual);
  let mejor = opciones[0];
  let mejorPuntaje = -Infinity;

  for (const op of opciones) {
    const postAire = limitar(actual.aire + op.efectos.aire);
    const postEnergia = limitar(actual.energia + op.efectos.energia);
    const postEscudo = limitar(actual.escudo + op.efectos.escudo);
    const valorEnObjetivo =
      objetivo === 'aire'
        ? postAire
        : objetivo === 'energia'
          ? postEnergia
          : postEscudo;
    const minimoPost = Math.min(postAire, postEnergia, postEscudo);
    const puntaje = valorEnObjetivo * 10 + minimoPost;

    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = op;
    }
  }

  return mejor;
}

function elegirOpcionClima(
  politica: PoliticaSimulacion,
  tipoOpciones: TipoOpcionesClima,
  actual: MinimosRecursos,
  hayMisionesPendientes: boolean,
  mods: { refugioSellado?: boolean; antenaSintonizada?: boolean } = {},
): IdOpcionEventoFLR {
  if (politica === 'pasivo') {
    return 'refugiarte';
  }

  const opciones = obtenerOpcionesEventoClima(tipoOpciones, mods);
  if (politica === 'mediocre') {
    return 'seguirTrabajando';
  }

  const refugiarte = opciones[0];
  const seguir = opciones[1];

  const escudoTrasSeguir = limitar(actual.escudo + (seguir.efectos.escudo ?? 0));
  if (hayMisionesPendientes && escudoTrasSeguir > 0) {
    return 'seguirTrabajando';
  }

  const energiaTrasRefugio = limitar(
    actual.energia + (refugiarte.efectos.energia ?? 0),
  );
  const minRefugio = Math.min(actual.aire, energiaTrasRefugio, actual.escudo);
  const minSeguir = Math.min(actual.aire, actual.energia, escudoTrasSeguir);

  return minSeguir >= minRefugio ? 'seguirTrabajando' : 'refugiarte';
}

function elegirOpcionApagon(
  politica: PoliticaSimulacion,
  actual: MinimosRecursos,
  tieneInvernaderoPendiente: boolean,
): IdOpcionApagon {
  const opciones = obtenerOpcionesApagon();
  if (politica !== 'perfecto') {
    return opciones[0].id;
  }

  const candidatas = tieneInvernaderoPendiente
    ? opciones.filter((op) => !op.pierdeInvernadero)
    : opciones;

  let mejor = candidatas[0];
  let mejorMinimo = -Infinity;

  for (const op of candidatas) {
    const postAire = limitar(actual.aire + (op.efectos.aire ?? 0));
    const postEnergia = limitar(actual.energia + (op.efectos.energia ?? 0));
    const postEscudo = limitar(actual.escudo + (op.efectos.escudo ?? 0));
    const minimoPost = Math.min(postAire, postEnergia, postEscudo);

    if (minimoPost > mejorMinimo) {
      mejorMinimo = minimoPost;
      mejor = op;
    }
  }

  return mejor.id;
}

function crearProviderSimulacion(
  opciones?: OpcionesSimulacionSemana,
): EventosProvider | undefined {
  if (!opciones?.nivelJ3 && !opciones?.nivelJ5) {
    return undefined;
  }
  const nivelJ3: NivelEvento = opciones.nivelJ3 ?? 'media';
  const nivelJ5: NivelEvento = opciones.nivelJ5 ?? 'fuerte';
  const eventoJ3 = {
    id: 'sim-j3',
    semana: 'semana-1',
    jornada: 3,
    tipo: 'FLR' as const,
    fecha: '',
    clase: '',
    intensidad: '',
    nivel: nivelJ3,
    fuenteNombre: 'NASA DONKI',
    fuenteUrl: '',
    consultadoEn: '',
    textoNinos: { es: '', en: '' },
    verificado: false,
    esEjemplo: true,
  };
  const eventoJ5 = {
    id: 'sim-j5',
    semana: 'semana-1',
    jornada: 5,
    tipo: 'SEP' as const,
    fecha: '',
    clase: '',
    intensidad: '',
    nivel: nivelJ5,
    fuenteNombre: 'NASA DONKI',
    fuenteUrl: '',
    consultadoEn: '',
    textoNinos: { es: '', en: '' },
    verificado: false,
    esEjemplo: true,
  };
  return {
    obtenerTodos: () => [eventoJ3, eventoJ5],
    obtenerPorId: (id) =>
      id === eventoJ3.id ? eventoJ3 : id === eventoJ5.id ? eventoJ5 : null,
    obtenerPorSemanaYJornada: (_semanaId, jornada) =>
      jornada >= 5 ? eventoJ5 : eventoJ3,
  };
}

export function simularSemana(
  politica: PoliticaSimulacion,
  opciones?: OpcionesSimulacionSemana,
): ResultadoSemanaSim {
  const provider = crearProviderSimulacion(opciones);
  const motor = new GameStateManager(provider);
  motor.iniciarSemana(
    undefined,
    opciones?.recursosIniciales ?? { ...RECURSOS_INICIALES },
  );

  let eventoClimaOpciones: TipoOpcionesClima = 'FULGURACION';
  motor.on('evento:abrir', (ev) => {
    eventoClimaOpciones = ev.opciones;
  });

  const jornadas: ResultadoJornadaSim[] = [];
  const minimosSemana: MinimosRecursos = {
    aire: motor.getSnapshot().aire,
    energia: motor.getSnapshot().energia,
    escudo: motor.getSnapshot().escudo,
  };

  let evacuado = false;
  let jornadaEvacuacion: number | null = null;
  let segundoEvacuacion: number | null = null;
  let jornadaAlcanzada = 1;

  for (let j = 1; j <= MAX_JORNADAS; j++) {
    const snapInicio = motor.getSnapshot();
    jornadaAlcanzada = snapInicio.jornada;

    const todasNormales = obtenerMisionesDeJornada(snapInicio.jornada);
    const misionesObligatorias = todasNormales.filter((m) => m.obligatoria);
    const misionesObjetivo =
      politica === 'perfecto'
        ? misionesObligatorias
        : politica === 'pasivo'
          ? []
          : misionesObligatorias.length === 1
            ? misionesObligatorias.slice(0, 1)
            : misionesObligatorias.slice(
                0,
                Math.floor(misionesObligatorias.length / 2),
              );

    let indiceMision = 0;
    let progresoMision = 0;
    let progresoUrgente = 0;

    const minimosJornada: MinimosRecursos = {
      aire: snapInicio.aire,
      energia: snapInicio.energia,
      escudo: snapInicio.escudo,
    };

    const registrarMinimos = (): void => {
      const s = motor.getSnapshot();
      minimosJornada.aire = Math.min(minimosJornada.aire, s.aire);
      minimosJornada.energia = Math.min(minimosJornada.energia, s.energia);
      minimosJornada.escudo = Math.min(minimosJornada.escudo, s.escudo);

      minimosSemana.aire = Math.min(minimosSemana.aire, s.aire);
      minimosSemana.energia = Math.min(minimosSemana.energia, s.energia);
      minimosSemana.escudo = Math.min(minimosSemana.escudo, s.escudo);
    };

    registrarMinimos();

    const duracion = motor.obtenerDuracionJornadaActual();
    for (let paso = 0; paso < duracion + 5; paso++) {
      let snap = motor.getSnapshot();

      if (snap.estado === 'evacuacion' || snap.estado === 'finJornada') {
        break;
      }

      if (snap.estado === 'evento') {
        const hayPendientes = misionesObligatorias.some(
          (m) =>
            obtenerEstadoMision(
              m.id,
              snap.misionesHechas,
              snap.misionesPerdidas,
            ) === 'pendiente',
        );
        const opClima = elegirOpcionClima(
          politica,
          eventoClimaOpciones,
          { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
          hayPendientes,
          {
            refugioSellado: snap.refugioSellado,
            antenaSintonizada: snap.antenaSintonizada,
          },
        );
        motor.resolverEventoClima(opClima, eventoClimaOpciones);
        registrarMinimos();
        snap = motor.getSnapshot();
      }

      if (snap.estado === 'apagon') {
        const tieneInvPendiente = misionesObligatorias.some(
          (m) =>
            m.estacionId === 'invernadero' &&
            obtenerEstadoMision(
              m.id,
              snap.misionesHechas,
              snap.misionesPerdidas,
            ) === 'pendiente',
        );
        const opApagon = elegirOpcionApagon(
          politica,
          { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
          tieneInvPendiente,
        );
        motor.resolverApagon(opApagon);
        registrarMinimos();
        snap = motor.getSnapshot();
      }

      if (snap.estado === 'evacuacion' || snap.estado === 'finJornada') {
        break;
      }

      motor.tick(1);
      registrarMinimos();
      snap = motor.getSnapshot();

      if (snap.estado === 'evacuacion') {
        break;
      }

      if (snap.estado === 'evento') {
        const hayPendientes = misionesObligatorias.some(
          (m) =>
            obtenerEstadoMision(
              m.id,
              snap.misionesHechas,
              snap.misionesPerdidas,
            ) === 'pendiente',
        );
        const opClima = elegirOpcionClima(
          politica,
          eventoClimaOpciones,
          { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
          hayPendientes,
          {
            refugioSellado: snap.refugioSellado,
            antenaSintonizada: snap.antenaSintonizada,
          },
        );
        motor.resolverEventoClima(opClima, eventoClimaOpciones);
        registrarMinimos();
        snap = motor.getSnapshot();
      } else if (snap.estado === 'apagon') {
        const tieneInvPendiente = misionesObligatorias.some(
          (m) =>
            m.estacionId === 'invernadero' &&
            obtenerEstadoMision(
              m.id,
              snap.misionesHechas,
              snap.misionesPerdidas,
            ) === 'pendiente',
        );
        const opApagon = elegirOpcionApagon(
          politica,
          { aire: snap.aire, energia: snap.energia, escudo: snap.escudo },
          tieneInvPendiente,
        );
        motor.resolverApagon(opApagon);
        registrarMinimos();
        snap = motor.getSnapshot();
      }

      if (snap.estado === 'jugando') {
        if (snap.misionUrgente !== null && politica === 'perfecto') {
          progresoUrgente += 1;
          if (progresoUrgente >= SIM_TIEMPO_MISION) {
            const mUrg = snap.misionUrgente.mision;
            progresoUrgente = 0;
            motor.iniciarMinijuego(mUrg.estacionId, mUrg.id, mUrg.minijuego, {
              pasos: mUrg.pasos,
              tiempoLimite: mUrg.tiempoLimite,
            });
            motor.finalizarMinijuego('exito', mUrg.estacionId, mUrg.id);
            registrarMinimos();
          }
        } else if (indiceMision < misionesObjetivo.length) {
          const mision = misionesObjetivo[indiceMision];
          const estadoMision = obtenerEstadoMision(
            mision.id,
            snap.misionesHechas,
            snap.misionesPerdidas,
          );
          if (estadoMision !== 'pendiente') {
            indiceMision += 1;
            progresoMision = 0;
          } else {
            progresoMision += 1;
            if (progresoMision >= SIM_TIEMPO_MISION) {
              progresoMision = 0;
              indiceMision += 1;
              motor.iniciarMinijuego(
                mision.estacionId,
                mision.id,
                mision.minijuego,
                {
                  pasos: mision.pasos,
                  tiempoLimite: mision.tiempoLimite,
                },
              );
              motor.finalizarMinijuego('exito', mision.estacionId, mision.id);
              const trasMini = motor.getSnapshot();
              if (trasMini.estado === 'eleccion' && mision.eleccion !== null) {
                const op = elegirOpcionEleccion(politica, mision.eleccion, {
                  aire: trasMini.aire,
                  energia: trasMini.energia,
                  escudo: trasMini.escudo,
                });
                motor.aplicarEleccion(mision.eleccion, op.id, mision.id);
              }
              registrarMinimos();
            }
          }
        }
      }

      const trasPaso = motor.getSnapshot();
      if (trasPaso.estado === 'evacuacion' || trasPaso.estado === 'finJornada') {
        break;
      }
    }

    const snapFin = motor.getSnapshot();
    const huboEvac = snapFin.estado === 'evacuacion';
    const cierre = snapFin.ultimoCierre;

    jornadas.push({
      jornada: j,
      completadaSinEvacuacion: !huboEvac,
      evacuado: huboEvac,
      segundoEvacuacion: huboEvac ? snapFin.segundos : null,
      tipoCierre: cierre?.tipo ?? null,
      misionesHechas: cierre?.misionesHechasCount ?? 0,
      misionesTotal: cierre?.misionesTotal ?? todasNormales.length,
      minimos: { ...minimosJornada },
      finales: {
        aire: snapFin.aire,
        energia: snapFin.energia,
        escudo: snapFin.escudo,
      },
      aguaBajaActiva: snapInicio.aguaBaja,
      moduloDanadoAlCerrar: snapFin.moduloDanado,
    });

    if (huboEvac) {
      evacuado = true;
      jornadaEvacuacion = j;
      segundoEvacuacion = snapFin.segundos;
      break;
    }

    if (j < MAX_JORNADAS) {
      motor.siguienteJornada();
    }
  }

  const ultimoSnap = motor.getSnapshot();
  return {
    politica,
    semanaCompletada: !evacuado && jornadas.length === MAX_JORNADAS,
    evacuado,
    jornadaAlcanzada,
    jornadaEvacuacion,
    segundoEvacuacion,
    minimosSemana,
    finalesSemana: {
      aire: ultimoSnap.aire,
      energia: ultimoSnap.energia,
      escudo: ultimoSnap.escudo,
    },
    jornadas,
  };
}
