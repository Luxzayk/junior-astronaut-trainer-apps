// Lógica pura de eventos de clima espacial y apagón (sin Phaser)

import {
  getCostosPorNivel,
  localEventosProvider,
  obtenerTextoFuenteCurado,
  obtenerTextoNinosCurado,
  type EventoClimaCurado,
  type NivelEvento,
} from '../data/eventosLoader';
import { getAjustes } from './settings';
import { t } from '../i18n';
import {
  BONUS_ANTENA_REFUGIO_ENERGIA,
  COSTO_REFUGIARTE_SELLADO,
  EFECTOS_APAGON,
} from './balance';
import type { MapaDeltasRecursos } from './missions';

export interface ModificadoresRefugio {
  refugioSellado?: boolean;
  antenaSintonizada?: boolean;
}

export interface DefinicionEventoClima {
  id: string;
  tipo: string;
  fecha: string;
  intensidad: string;
  clase?: string;
  nivel?: NivelEvento;
  semana?: string;
  jornada?: number;
  fuenteNombre: string;
  fuenteUrl: string;
  consultadoEn?: string;
  textoNinos: string;
  verificado: boolean;
  esEjemplo?: boolean;
}

export type IdOpcionEventoFLR = 'refugiarte' | 'seguirTrabajando';
export type TipoOpcionesClima = 'FULGURACION' | 'TORMENTA_GRANDE';
export type IdOpcionApagon = 'soporteVida' | 'escudos' | 'invernadero';

export interface OpcionEventoClima {
  id: IdOpcionEventoFLR;
  titulo: string;
  descripcion: string;
  efectos: MapaDeltasRecursos;
}

export interface OpcionApagon {
  id: IdOpcionApagon;
  titulo: string;
  descripcion: string;
  efectos: MapaDeltasRecursos;
  pierdeInvernadero: boolean;
}

export const ID_EVENTO_JORNADA_3 = 'j3-fulguracion';
export const ID_EVENTO_JORNADA_5 = 'j5-tormenta-grande';

function adaptarCuradoADefinicion(
  ev: EventoClimaCurado,
): DefinicionEventoClima {
  const idioma = getAjustes().idioma;
  const texto =
    idioma === 'en' ? ev.textoNinos.en.trim() : ev.textoNinos.es.trim();
  return {
    id: ev.id,
    tipo: ev.tipo,
    fecha: ev.fecha,
    intensidad: ev.clase,
    clase: ev.clase,
    nivel: ev.nivel,
    semana: ev.semana,
    jornada: ev.jornada,
    fuenteNombre: ev.fuenteNombre,
    fuenteUrl: ev.fuenteUrl,
    consultadoEn: ev.consultadoEn,
    textoNinos: texto,
    verificado: !ev.esEjemplo,
    esEjemplo: ev.esEjemplo,
  };
}

function normalizarEventoClima(raw: unknown): DefinicionEventoClima | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  if (!id) {
    return null;
  }
  const idioma = getAjustes().idioma;
  let textoNinos = '';
  if (typeof obj.textoNinos === 'string') {
    textoNinos = obj.textoNinos;
  } else if (typeof obj.textoNinos === 'object' && obj.textoNinos !== null) {
    const tn = obj.textoNinos as Record<string, unknown>;
    const rawTxt = idioma === 'en' ? tn.en : tn.es;
    textoNinos = typeof rawTxt === 'string' ? rawTxt : '';
  }

  const intensidad =
    typeof obj.clase === 'string' && obj.clase.trim()
      ? obj.clase
      : typeof obj.intensidad === 'string'
        ? obj.intensidad
        : '';

  return {
    id,
    tipo: typeof obj.tipo === 'string' && obj.tipo.trim() ? obj.tipo : 'FLR',
    fecha: typeof obj.fecha === 'string' ? obj.fecha : '',
    intensidad,
    clase: intensidad,
    fuenteNombre:
      typeof obj.fuenteNombre === 'string' && obj.fuenteNombre.trim()
        ? obj.fuenteNombre
        : 'NASA DONKI',
    fuenteUrl: typeof obj.fuenteUrl === 'string' ? obj.fuenteUrl : '',
    consultadoEn: typeof obj.consultadoEn === 'string' ? obj.consultadoEn : '',
    textoNinos,
    verificado: obj.verificado === true,
  };
}

export function parsearEventosClimaSeguro(
  origen: unknown,
): readonly DefinicionEventoClima[] {
  if (!Array.isArray(origen)) {
    return [];
  }
  const lista: DefinicionEventoClima[] = [];
  for (const item of origen) {
    const normalizado = normalizarEventoClima(item);
    if (normalizado) {
      lista.push(normalizado);
    }
  }
  return lista;
}

export function obtenerEventosClima(): readonly DefinicionEventoClima[] {
  return localEventosProvider.obtenerTodos().map(adaptarCuradoADefinicion);
}

export function obtenerEventoClimaPorId(
  id: string,
): DefinicionEventoClima | null {
  const encontrado = localEventosProvider.obtenerPorId(id);
  return encontrado ? adaptarCuradoADefinicion(encontrado) : null;
}

export function obtenerEventoJornada3(): DefinicionEventoClima {
  return (
    obtenerEventoClimaPorId(ID_EVENTO_JORNADA_3) ?? {
      id: ID_EVENTO_JORNADA_3,
      tipo: 'FLR',
      fecha: '',
      intensidad: '',
      clase: '',
      nivel: 'media',
      fuenteNombre: 'NASA DONKI',
      fuenteUrl: '',
      consultadoEn: '',
      textoNinos: '',
      verificado: false,
      esEjemplo: true,
    }
  );
}

export function obtenerEventoJornada5(): DefinicionEventoClima {
  return (
    obtenerEventoClimaPorId(ID_EVENTO_JORNADA_5) ?? {
      id: ID_EVENTO_JORNADA_5,
      tipo: 'SEP',
      fecha: '',
      intensidad: '',
      clase: '',
      nivel: 'fuerte',
      fuenteNombre: 'NASA DONKI',
      fuenteUrl: '',
      consultadoEn: '',
      textoNinos: '',
      verificado: false,
      esEjemplo: true,
    }
  );
}

export function obtenerTextoEventoParaNinos(
  evento: DefinicionEventoClima,
): string {
  const curado = localEventosProvider.obtenerPorId(evento.id);
  if (curado) {
    return obtenerTextoNinosCurado(curado);
  }
  const texto = evento.textoNinos.trim();
  if (texto.length > 0) {
    return texto;
  }
  return evento.id === ID_EVENTO_JORNADA_5 || evento.tipo === 'SEP'
    ? t('eventoClima.tormentaTextoNinos')
    : t('eventoClima.flrTextoNinos');
}

export function obtenerTextoFuenteEvento(
  evento: DefinicionEventoClima,
): string {
  const curado = localEventosProvider.obtenerPorId(evento.id);
  if (curado) {
    return obtenerTextoFuenteCurado(curado);
  }
  if (
    evento.verificado &&
    evento.esEjemplo !== true &&
    evento.fecha.trim().length > 0 &&
    evento.fuenteNombre.trim().length > 0 &&
    evento.fuenteUrl.trim().length > 0 &&
    (evento.consultadoEn ?? '').trim().length > 0
  ) {
    return t('eventoClima.fuenteVerificada', {
      fuente: evento.fuenteNombre,
      fecha: evento.fecha,
      intensidad: evento.clase ?? evento.intensidad,
    }).trim();
  }
  return t('eventoClima.fuentePorVerificar');
}

export function calcularEfectosRefugiarte(
  tipoOpciones: TipoOpcionesClima = 'FULGURACION',
  mods: ModificadoresRefugio = {},
): MapaDeltasRecursos {
  const nivel: NivelEvento =
    tipoOpciones === 'TORMENTA_GRANDE' ? 'fuerte' : 'media';
  const tabla = getCostosPorNivel(nivel);
  let energia = mods.refugioSellado
    ? COSTO_REFUGIARTE_SELLADO
    : (tabla.refugiarte.energia ?? 0);
  if (mods.antenaSintonizada) {
    energia = Math.min(0, energia + BONUS_ANTENA_REFUGIO_ENERGIA);
  }
  return { energia };
}

export function obtenerOpcionesEventoClima(
  tipoOpciones: TipoOpcionesClima = 'FULGURACION',
  mods: ModificadoresRefugio = {},
): readonly OpcionEventoClima[] {
  const nivel: NivelEvento =
    tipoOpciones === 'TORMENTA_GRANDE' ? 'fuerte' : 'media';
  const tabla = getCostosPorNivel(nivel);
  return [
    {
      id: 'refugiarte',
      titulo: t('eventoClima.opcionRefugiarteTitulo'),
      descripcion: t('eventoClima.opcionRefugiarteDesc'),
      efectos: calcularEfectosRefugiarte(tipoOpciones, mods),
    },
    {
      id: 'seguirTrabajando',
      titulo: t('eventoClima.opcionSeguirTitulo'),
      descripcion: t('eventoClima.opcionSeguirDesc'),
      efectos: { ...tabla.seguirTrabajando },
    },
  ];
}

export function obtenerOpcionesEventoFLR(): readonly OpcionEventoClima[] {
  return obtenerOpcionesEventoClima('FULGURACION');
}

export function obtenerEfectosOpcionEventoClima(
  opcionId: IdOpcionEventoFLR,
  tipoOpciones: TipoOpcionesClima = 'FULGURACION',
  mods: ModificadoresRefugio = {},
): MapaDeltasRecursos {
  if (opcionId === 'refugiarte') {
    return calcularEfectosRefugiarte(tipoOpciones, mods);
  }
  const nivel: NivelEvento =
    tipoOpciones === 'TORMENTA_GRANDE' ? 'fuerte' : 'media';
  const tabla = getCostosPorNivel(nivel);
  return { ...tabla[opcionId] };
}

export function obtenerEfectosOpcionEventoFLR(
  opcionId: IdOpcionEventoFLR,
): MapaDeltasRecursos {
  return obtenerEfectosOpcionEventoClima(opcionId, 'FULGURACION');
}

export function obtenerOpcionesApagon(): readonly OpcionApagon[] {
  return [
    {
      id: 'soporteVida',
      titulo: t('apagon.opcionSoporteTitulo'),
      descripcion: t('apagon.opcionSoporteDesc'),
      efectos: { ...EFECTOS_APAGON.soporteVida },
      pierdeInvernadero: false,
    },
    {
      id: 'escudos',
      titulo: t('apagon.opcionEscudosTitulo'),
      descripcion: t('apagon.opcionEscudosDesc'),
      efectos: { ...EFECTOS_APAGON.escudos },
      pierdeInvernadero: false,
    },
    {
      id: 'invernadero',
      titulo: t('apagon.opcionInvernaderoTitulo'),
      descripcion: t('apagon.opcionInvernaderoDesc'),
      efectos: { ...EFECTOS_APAGON.invernadero },
      pierdeInvernadero: true,
    },
  ];
}

export function obtenerEfectosApagon(
  opcionId: IdOpcionApagon,
): MapaDeltasRecursos {
  return { ...EFECTOS_APAGON[opcionId] };
}

