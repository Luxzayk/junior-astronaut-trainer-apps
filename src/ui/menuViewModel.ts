import { esFechaIsoValida, type EventoClimaCurado } from '../data/eventosLoader';
import type { DefinicionSemana } from '../game/semanas';
import type { Idioma } from '../game/settings';
import { t } from '../i18n';

export interface DatosMenuVM {
  esEjemplo: boolean;
  titulo: string;
  linea1: string;
  linea2: string;
  semana: string;
  etiqueta: string;
}
export type FormatoFechaMenu = (fecha: string, idioma: Idioma) => string;
export const formatearFechaMenu: FormatoFechaMenu = (fecha, idioma) =>
  new Intl.DateTimeFormat(idioma === 'es' ? 'es-ES' : 'en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(fecha));

/** No consulta ajustes, reloj ni red: toda la información procede de sus entradas. */
export function menuViewModel(
  evento: EventoClimaCurado | null,
  semana: DefinicionSemana,
  idioma: Idioma,
  formatear: FormatoFechaMenu = formatearFechaMenu,
): DatosMenuVM {
  const real = evento !== null && evento.verificado && !evento.esEjemplo &&
    esFechaIsoValida(evento.fecha) && esFechaIsoValida(evento.consultadoEn) &&
    evento.clase.trim().length > 0 && evento.fuenteUrl.trim().length > 0 &&
    evento.textoNinos.es.trim().length > 0 && evento.textoNinos.en.trim().length > 0;
  return {
    esEjemplo: !real,
    titulo: t(real ? 'menu.datosReales' : 'menu.datosEjemplo', undefined, idioma),
    linea1: real ? t('menu.eventoArchivo', { tipo: evento.tipo, clase: evento.clase, fecha: formatear(evento.fecha, idioma) }, idioma)
      : t('menu.eventoEjemplo', undefined, idioma),
    linea2: real ? t('menu.fuenteArchivo', { fecha: formatear(evento.consultadoEn, idioma) }, idioma) : '',
    semana: t('menu.semanaActualEtiqueta', { nombre: semana.nombre[idioma] }, idioma),
    etiqueta: t(real ? 'menu.etiquetaArchivo' : 'menu.etiquetaEjemplo', undefined, idioma),
  };
}
