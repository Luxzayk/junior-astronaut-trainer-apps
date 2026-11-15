// Lógica pura de Rango, causa principal de evacuación e Informe Final (sin Phaser)

import {
  formatearFechaEvento,
  localEventosProvider,
  obtenerEtiquetaSelloEvento,
  type EventoClimaCurado,
  type EventosProvider,
} from '../data/eventosLoader';
import {
  obtenerFuenteOsdrOpcional,
  type EntradaOsdr,
} from '../data/fuentes';
import { t, type ClaveI18n } from '../i18n';
import { MAX_JORNADAS, RANGOS } from './balance';
import {
  filtrarDecisionesDificiles,
  type DeltasBitacora,
  type EntradaBitacora,
} from './bitacora';
import { obtenerMisionesDeJornada } from './missions';
import { obtenerEventosDeSemana, obtenerSemanaPorId, type DefinicionSemana } from './semanas';
import { getAjustes, type Idioma } from './settings';
import type { GameState } from './state';

export type RangoId = 'commander' | 'specialist' | 'cadet' | 'trainee';

export interface ResultadoRango {
  id: RangoId;
  tituloClave: ClaveI18n;
  fraseClave: ClaveI18n;
  titulo: string;
  frase: string;
  jornadasCompletadas: number;
}

export interface ResumenJornadaInforme {
  jornada: number;
  completa: boolean;
  jugada: boolean;
  etiquetaEstado: string;
}

export interface DecisionDificilInforme {
  entrada: EntradaBitacora;
  titulo: string;
  textoDeltas: string;
  lineaCompleta: string;
}

export interface EventoResumenInforme {
  jornada: number;
  tipo: string;
  clase: string;
  fecha: string;
  fuenteNombre: string;
  sello: string;
  esEjemplo: boolean;
  linea: string;
}

export interface CausaEvacuacionInforme {
  entrada: EntradaBitacora;
  titulo: string;
  deltaAire: number;
  linea: string;
}

export interface DatosInformeFinal {
  modo: 'completo' | 'evacuacion';
  jornadaActual: number;
  semana: DefinicionSemana;
  jornadasCompletadas: number;
  rango: ResultadoRango;
  jornadas: readonly ResumenJornadaInforme[];
  decisionesDificiles: readonly DecisionDificilInforme[];
  aprendizajes: readonly string[];
  datosUsados: {
    j3: EventoResumenInforme;
    j5: EventoResumenInforme;
  };
  osdr: EntradaOsdr | null;
  causaEvacuacion: CausaEvacuacionInforme | null;
  textoParaCopiar: string;
}

export interface OpcionesGenerarInforme {
  idioma?: Idioma;
  eventosProvider?: EventosProvider;
  osdrRaw?: unknown;
}

export function calcularRango(
  jornadasCompletadas: number,
  idioma: Idioma = getAjustes().idioma,
): ResultadoRango {
  const seguras = Math.max(0, Math.floor(jornadasCompletadas));
  let id: RangoId = 'trainee';
  if (seguras >= RANGOS.commander.minCompletas) {
    id = 'commander';
  } else if (seguras >= RANGOS.specialist.minCompletas) {
    id = 'specialist';
  } else if (seguras >= RANGOS.cadet.minCompletas) {
    id = 'cadet';
  }

  const claves: Record<RangoId, { titulo: ClaveI18n; frase: ClaveI18n }> = {
    commander: {
      titulo: 'rangos.commanderTitulo',
      frase: 'rangos.commanderFrase',
    },
    specialist: {
      titulo: 'rangos.specialistTitulo',
      frase: 'rangos.specialistFrase',
    },
    cadet: {
      titulo: 'rangos.cadetTitulo',
      frase: 'rangos.cadetFrase',
    },
    trainee: {
      titulo: 'rangos.traineeTitulo',
      frase: 'rangos.traineeFrase',
    },
  };

  const par = claves[id];
  return {
    id,
    tituloClave: par.titulo,
    fraseClave: par.frase,
    titulo: t(par.titulo, undefined, idioma),
    frase: t(par.frase, undefined, idioma),
    jornadasCompletadas: seguras,
  };
}

export function causaPrincipal(
  bitacora: readonly EntradaBitacora[],
  jornada: number,
): EntradaBitacora | null {
  let peor: EntradaBitacora | null = null;
  for (const entrada of bitacora) {
    if (entrada.jornada !== jornada) {
      continue;
    }
    if (entrada.deltas.aire >= 0) {
      continue;
    }
    if (peor === null || entrada.deltas.aire < peor.deltas.aire) {
      peor = {
        ...entrada,
        deltas: { ...entrada.deltas },
      };
    }
  }
  return peor;
}

export function obtenerEtiquetaAccionBitacora(
  entrada: EntradaBitacora,
  idioma: Idioma = getAjustes().idioma,
): string {
  if (entrada.tipo === 'evento') {
    return entrada.id === 'refugiarte'
      ? t('informe.accionRefugiarte', undefined, idioma)
      : t('informe.accionSeguir', undefined, idioma);
  }
  if (entrada.tipo === 'apagon') {
    if (entrada.id === 'soporteVida') {
      return t('informe.accionSoporte', undefined, idioma);
    }
    if (entrada.id === 'escudos') {
      return t('informe.accionEscudos', undefined, idioma);
    }
    return t('informe.accionInvernadero', undefined, idioma);
  }
  if (entrada.tipo === 'fuga') {
    return t('informe.accionFuga', undefined, idioma);
  }
  if (entrada.tipo === 'intento') {
    return t('informe.accionIntento', undefined, idioma);
  }
  return t('informe.accionEleccion', undefined, idioma);
}

export function formatearDeltasBitacora(
  deltas: DeltasBitacora,
  idioma: Idioma = getAjustes().idioma,
): string {
  const partes: string[] = [];
  const agregar = (clave: ClaveI18n, valor: number): void => {
    if (valor === 0) {
      return;
    }
    partes.push(
      t(
        clave,
        {
          signo: valor > 0 ? '+' : '-',
          valor: Math.abs(Math.round(valor)),
        },
        idioma,
      ),
    );
  };

  agregar('informe.deltaAire', deltas.aire);
  agregar('informe.deltaEnergia', deltas.energia);
  agregar('informe.deltaEscudo', deltas.escudo);

  if (partes.length === 0) {
    return t('informe.sinCambiosDelta', undefined, idioma);
  }
  return partes.join(' · ');
}

function obtenerResumenJornadas(
  snap: Readonly<GameState>,
  idioma: Idioma,
): ResumenJornadaInforme[] {
  const mapaResultados = new Map<number, boolean>();
  for (const r of snap.resultadosJornadas ?? []) {
    mapaResultados.set(r.jornada, r.completa);
  }

  const lista: ResumenJornadaInforme[] = [];
  for (let j = 1; j <= MAX_JORNADAS; j += 1) {
    const tieneResultado = mapaResultados.has(j);
    let completa = mapaResultados.get(j) ?? false;
    let jugada = tieneResultado || j <= snap.jornada;

    if (!tieneResultado && j < snap.jornada) {
      const misiones = obtenerMisionesDeJornada(j);
      completa =
        misiones.length > 0 &&
        misiones.every((m) => snap.misionesHechas.includes(m.id));
      jugada = true;
    } else if (!tieneResultado && j === snap.jornada && snap.ultimoCierre?.jornada === j) {
      completa = snap.ultimoCierre.tipo === 'completa';
      jugada = true;
    }

    const etiquetaEstado = !jugada
      ? t('informe.estadoSinJugar', undefined, idioma)
      : completa
        ? t('informe.estadoCompleta', undefined, idioma)
        : t('informe.estadoIncompleta', undefined, idioma);

    lista.push({
      jornada: j,
      completa,
      jugada,
      etiquetaEstado,
    });
  }
  return lista;
}

function resumirEventoInforme(
  ev: EventoClimaCurado,
  idioma: Idioma,
): EventoResumenInforme {
  const fechaTexto = ev.esEjemplo
    ? t('sellos.datosEjemplo', undefined, idioma)
    : formatearFechaEvento(ev.fecha, idioma);
  const claseTexto = ev.esEjemplo || !ev.clase ? '—' : ev.clase;
  const sello = obtenerEtiquetaSelloEvento(ev, idioma);
  return {
    jornada: ev.jornada,
    tipo: ev.tipo,
    clase: claseTexto,
    fecha: fechaTexto,
    fuenteNombre: ev.fuenteNombre,
    sello,
    esEjemplo: ev.esEjemplo,
    linea: t(
      'informe.datosEventoLinea',
      {
        jornada: ev.jornada,
        tipo: ev.tipo,
        clase: claseTexto,
        fecha: fechaTexto,
        fuente: ev.fuenteNombre,
        sello,
      },
      idioma,
    ),
  };
}

export function generarInformeFinal(
  snap: Readonly<GameState>,
  opciones: OpcionesGenerarInforme = {},
): DatosInformeFinal {
  const idioma = opciones.idioma ?? getAjustes().idioma;
  const provider = opciones.eventosProvider ?? localEventosProvider;
  const modo = snap.estado === 'evacuacion' ? 'evacuacion' : 'completo';
  const semana = obtenerSemanaPorId(snap.semanaId);

  const jornadas = obtenerResumenJornadas(snap, idioma);
  const jornadasCompletadas = jornadas.filter((j) => j.completa).length;
  const rango = calcularRango(jornadasCompletadas, idioma);

  const decisionesRaw = filtrarDecisionesDificiles(snap.bitacora ?? []);
  const decisionesDificiles: DecisionDificilInforme[] = decisionesRaw.map(
    (entrada) => {
      const titulo = obtenerEtiquetaAccionBitacora(entrada, idioma);
      const textoDeltas = formatearDeltasBitacora(entrada.deltas, idioma);
      return {
        entrada,
        titulo,
        textoDeltas,
        lineaCompleta: t(
          'informe.decisionFila',
          {
            jornada: entrada.jornada,
            titulo,
            deltas: textoDeltas,
          },
          idioma,
        ),
      };
    },
  );

  const aprendizajes = [
    t('informe.aprendiste1', undefined, idioma),
    t('informe.aprendiste2', undefined, idioma),
    t('informe.aprendiste3', undefined, idioma),
  ] as const;

  const eventosSemana = obtenerEventosDeSemana(semana.id, provider);
  const datosUsados = {
    j3: resumirEventoInforme(eventosSemana.j3, idioma),
    j5: resumirEventoInforme(eventosSemana.j5, idioma),
  };

  const osdr =
    opciones.osdrRaw !== undefined
      ? obtenerFuenteOsdrOpcional(opciones.osdrRaw)
      : obtenerFuenteOsdrOpcional();

  const peorAire = causaPrincipal(snap.bitacora ?? [], snap.jornada);
  const causaEvacuacion: CausaEvacuacionInforme | null = peorAire
    ? (() => {
        const titulo = obtenerEtiquetaAccionBitacora(peorAire, idioma);
        const deltaAire = Math.round(peorAire.deltas.aire);
        return {
          entrada: peorAire,
          titulo,
          deltaAire,
          linea: t(
            'informe.causaDetalle',
            {
              jornada: peorAire.jornada,
              titulo,
              delta: deltaAire,
            },
            idioma,
          ),
        };
      })()
    : null;

  const lineasCopiar: string[] = [
    t('informe.copiaEncabezado', { semana: semana.nombre[idioma] }, idioma),
    t(
      'informe.copiaRango',
      { rango: rango.titulo, completas: jornadasCompletadas },
      idioma,
    ),
    jornadas
      .map(
        (j) =>
          `${t('informe.jornadaChip', { jornada: j.jornada }, idioma)}: ${j.etiquetaEstado}`,
      )
      .join(' | '),
  ];

  if (decisionesDificiles.length > 0) {
    lineasCopiar.push(t('informe.decisionesTitulo', undefined, idioma));
    for (const d of decisionesDificiles) {
      lineasCopiar.push(`- ${d.lineaCompleta}`);
    }
  }
  lineasCopiar.push(datosUsados.j3.linea);
  lineasCopiar.push(datosUsados.j5.linea);

  return {
    modo,
    jornadaActual: snap.jornada,
    semana,
    jornadasCompletadas,
    rango,
    jornadas,
    decisionesDificiles,
    aprendizajes,
    datosUsados,
    osdr,
    causaEvacuacion,
    textoParaCopiar: lineasCopiar.join('\n'),
  };
}
