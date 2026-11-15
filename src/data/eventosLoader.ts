// Cargador puro de eventos locales curados de clima espacial (sin red, sin Phaser)

import {
  EFECTOS_EVENTO_FLR,
  EFECTOS_EVENTO_TORMENTA_GRANDE,
} from '../game/balance';
import type { IdOpcionEventoFLR } from '../game/events';
import type { MapaDeltasRecursos } from '../game/missions';
import { getAjustes, type Idioma } from '../game/settings';
import { t } from '../i18n';
import eventosJson from './eventos.json';

export type TipoEventoClima = 'FLR' | 'SEP';
export type NivelEvento = 'media' | 'fuerte';

export const NIVELES_PERMITIDOS_POR_JORNADA: Readonly<
  Record<number, readonly NivelEvento[]>
> = {
  3: ['media'],
  5: ['media', 'fuerte'],
};

export function obtenerNivelesPermitidosJornada(
  jornada: number,
): readonly NivelEvento[] {
  return NIVELES_PERMITIDOS_POR_JORNADA[jornada] ?? ['media', 'fuerte'];
}

export function esNivelPermitidoEnJornada(
  jornada: number,
  nivel: NivelEvento,
): boolean {
  return obtenerNivelesPermitidosJornada(jornada).includes(nivel);
}

export interface TextoBilingue {
  es: string;
  en: string;
}

export interface EventoClimaCurado {
  id: string;
  semana: string;
  jornada: number;
  tipo: TipoEventoClima;
  fecha: string;
  clase: string;
  intensidad: string;
  nivel: NivelEvento;
  fuenteNombre: string;
  fuenteUrl: string;
  consultadoEn: string;
  textoNinos: TextoBilingue;
  verificado: boolean;
  esEjemplo: boolean;
}

export interface EventosProvider {
  obtenerTodos(): readonly EventoClimaCurado[];
  obtenerPorId(id: string): EventoClimaCurado | null;
  obtenerPorSemanaYJornada(semanaId: string, jornada: number): EventoClimaCurado;
}

export function esFechaIsoValida(valor: string): boolean {
  const limpio = valor.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.+)?$/.exec(limpio);
  if (!match) {
    return false;
  }
  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return false;
  }
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia &&
    !Number.isNaN(Date.parse(limpio))
  );
}

function normalizarTextoNinos(raw: unknown): TextoBilingue {
  if (typeof raw === 'string') {
    return { es: raw.trim(), en: '' };
  }
  if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return {
      es: typeof obj.es === 'string' ? obj.es.trim() : '',
      en: typeof obj.en === 'string' ? obj.en.trim() : '',
    };
  }
  return { es: '', en: '' };
}

function deducirNivel(
  rawNivel: unknown,
  jornada: number,
  tipo: TipoEventoClima,
): NivelEvento {
  const candidato: NivelEvento =
    rawNivel === 'fuerte' || rawNivel === 'media'
      ? rawNivel
      : jornada >= 5 || tipo === 'SEP'
        ? 'fuerte'
        : 'media';

  const permitidos = obtenerNivelesPermitidosJornada(jornada);
  if (!permitidos.includes(candidato)) {
    console.warn(
      `[eventosLoader] Nivel '${candidato}' no permitido en Jornada ${jornada}; restringido a '${permitidos[0]}'.`,
    );
    return permitidos[0];
  }
  return candidato;
}

function calcularEsEjemplo(params: {
  verificado: boolean;
  fecha: string;
  clase: string;
  fuenteUrl: string;
  consultadoEn: string;
  textoNinos: TextoBilingue;
}): boolean {
  const completo =
    params.verificado === true &&
    esFechaIsoValida(params.fecha) &&
    params.clase.trim().length > 0 &&
    params.fuenteUrl.trim().length > 0 &&
    params.consultadoEn.trim().length > 0 &&
    params.textoNinos.es.trim().length > 0 &&
    params.textoNinos.en.trim().length > 0;
  return !completo;
}

export function crearEventoEjemploFallback(
  semanaId = 'semana-1',
  jornada = 3,
): EventoClimaCurado {
  const esJ5 = jornada >= 5;
  const tipo: TipoEventoClima = esJ5 ? 'SEP' : 'FLR';
  return {
    id: `${semanaId}-j${jornada}`,
    semana: semanaId,
    jornada,
    tipo,
    fecha: '',
    clase: '',
    intensidad: '',
    nivel: esJ5 ? 'fuerte' : 'media',
    fuenteNombre: 'NASA DONKI',
    fuenteUrl: '',
    consultadoEn: '',
    textoNinos: { es: '', en: '' },
    verificado: false,
    esEjemplo: true,
  };
}

function normalizarEventoCurado(raw: unknown): EventoClimaCurado | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  const id = typeof obj.id === 'string' ? obj.id.trim() : '';
  if (!id) {
    return null;
  }

  const tipo: TipoEventoClima =
    obj.tipo === 'SEP' ? 'SEP' : obj.tipo === 'FLR' ? 'FLR' : id.includes('j5') || id.includes('tormenta') ? 'SEP' : 'FLR';

  const jornada =
    typeof obj.jornada === 'number' && Number.isFinite(obj.jornada)
      ? obj.jornada
      : id.includes('j5') || tipo === 'SEP'
        ? 5
        : 3;

  const semana =
    typeof obj.semana === 'string' && obj.semana.trim().length > 0
      ? obj.semana.trim()
      : 'semana-1';

  const fecha = typeof obj.fecha === 'string' ? obj.fecha.trim() : '';
  const claseRaw =
    typeof obj.clase === 'string' && obj.clase.trim().length > 0
      ? obj.clase.trim()
      : typeof obj.intensidad === 'string'
        ? obj.intensidad.trim()
        : '';

  const fuenteNombre =
    typeof obj.fuenteNombre === 'string' && obj.fuenteNombre.trim().length > 0
      ? obj.fuenteNombre.trim()
      : 'NASA DONKI';
  const fuenteUrl =
    typeof obj.fuenteUrl === 'string' ? obj.fuenteUrl.trim() : '';
  const consultadoEn =
    typeof obj.consultadoEn === 'string' ? obj.consultadoEn.trim() : '';
  const textoNinos = normalizarTextoNinos(obj.textoNinos);
  const verificado = obj.verificado === true;
  const nivel = deducirNivel(obj.nivel, jornada, tipo);

  const esEjemplo = calcularEsEjemplo({
    verificado,
    fecha,
    clase: claseRaw,
    fuenteUrl,
    consultadoEn,
    textoNinos,
  });

  return {
    id,
    semana,
    jornada,
    tipo,
    fecha,
    clase: claseRaw,
    intensidad: claseRaw,
    nivel,
    fuenteNombre,
    fuenteUrl,
    consultadoEn,
    textoNinos,
    verificado,
    esEjemplo,
  };
}

export function parsearEventosLoaderSeguro(
  origen: unknown,
): readonly EventoClimaCurado[] {
  if (!Array.isArray(origen)) {
    console.warn(
      '[eventosLoader] eventos.json inválido o corrupto; usando fallback de ejemplo.',
    );
    return [];
  }

  const salida: EventoClimaCurado[] = [];
  for (const item of origen) {
    const norm = normalizarEventoCurado(item);
    if (norm) {
      salida.push(norm);
    } else {
      console.warn(
        '[eventosLoader] entrada de evento descartada por formato inválido.',
      );
    }
  }
  return salida;
}

export class LocalProvider implements EventosProvider {
  private readonly eventos: readonly EventoClimaCurado[];

  constructor(origen: unknown = eventosJson) {
    this.eventos = parsearEventosLoaderSeguro(origen);
  }

  public obtenerTodos(): readonly EventoClimaCurado[] {
    return this.eventos;
  }

  public obtenerPorId(id: string): EventoClimaCurado | null {
    return this.eventos.find((ev) => ev.id === id) ?? null;
  }

  public obtenerPorSemanaYJornada(
    semanaId: string,
    jornada: number,
  ): EventoClimaCurado {
    const porSemanaYJornada = this.eventos.find(
      (ev) => ev.semana === semanaId && ev.jornada === jornada,
    );
    if (porSemanaYJornada) {
      return porSemanaYJornada;
    }

    const porIdEsperado = this.obtenerPorId(`${semanaId}-j${jornada}`);
    if (porIdEsperado) {
      return porIdEsperado;
    }

    console.warn(
      `[eventosLoader] No se encontró evento para ${semanaId} jornada ${jornada}; usando fallback de ejemplo.`,
    );
    return crearEventoEjemploFallback(semanaId, jornada);
  }
}

export const localEventosProvider = new LocalProvider();

export function getCostosPorNivel(
  nivel: NivelEvento,
): Readonly<Record<IdOpcionEventoFLR, MapaDeltasRecursos>> {
  const tabla =
    nivel === 'fuerte' ? EFECTOS_EVENTO_TORMENTA_GRANDE : EFECTOS_EVENTO_FLR;
  return {
    refugiarte: { ...tabla.refugiarte },
    seguirTrabajando: { ...tabla.seguirTrabajando },
  };
}

export function formatearFechaEvento(
  fechaIso: string,
  idioma: Idioma = getAjustes().idioma,
): string {
  const limpio = fechaIso.trim();
  if (!limpio) {
    return '';
  }
  const timestamp = Date.parse(limpio);
  if (Number.isNaN(timestamp)) {
    return limpio;
  }
  try {
    return new Intl.DateTimeFormat(idioma === 'en' ? 'en-US' : 'es-ES', {
      dateStyle: 'medium',
      timeZone: 'UTC',
    }).format(new Date(timestamp));
  } catch {
    return limpio;
  }
}

export function obtenerTextoNinosCurado(
  evento: EventoClimaCurado,
  idioma: Idioma = getAjustes().idioma,
): string {
  const candidato =
    idioma === 'en' ? evento.textoNinos.en.trim() : evento.textoNinos.es.trim();
  if (!evento.esEjemplo && candidato.length > 0) {
    return candidato;
  }
  if (candidato.length > 0) {
    return candidato;
  }
  return evento.tipo === 'SEP' || evento.jornada >= 5
    ? t('eventoClima.tormentaTextoNinos', undefined, idioma)
    : t('eventoClima.flrTextoNinos', undefined, idioma);
}

export function obtenerEtiquetaSelloEvento(
  evento: EventoClimaCurado,
  idioma: Idioma = getAjustes().idioma,
): string {
  if (!evento.esEjemplo) {
    return t(
      'sellos.archivoConsultado',
      { fecha: formatearFechaEvento(evento.consultadoEn, idioma) },
      idioma,
    );
  }
  return t('eventoClima.ejemploSinDato', undefined, idioma);
}

export function obtenerTextoFuenteCurado(
  evento: EventoClimaCurado,
  idioma: Idioma = getAjustes().idioma,
): string {
  if (!evento.esEjemplo) {
    return t(
      'eventoClima.fuenteVerificada',
      {
        fuente: evento.fuenteNombre,
        fecha: formatearFechaEvento(evento.fecha, idioma),
        intensidad: evento.clase,
      },
      idioma,
    ).trim();
  }
  return t('eventoClima.fuentePorVerificar', undefined, idioma);
}

export function obtenerEventoMasRecienteSemana(
  semanaId: string,
  provider: EventosProvider = localEventosProvider,
): EventoClimaCurado {
  const j3 = provider.obtenerPorSemanaYJornada(semanaId, 3);
  const j5 = provider.obtenerPorSemanaYJornada(semanaId, 5);
  const verificados = [j5, j3].filter((ev) => !ev.esEjemplo);
  if (verificados.length === 0) {
    return j3;
  }
  verificados.sort((a, b) => {
    const ta = Date.parse(a.consultadoEn || a.fecha) || 0;
    const tb = Date.parse(b.consultadoEn || b.fecha) || 0;
    return tb - ta;
  });
  return verificados[0];
}
