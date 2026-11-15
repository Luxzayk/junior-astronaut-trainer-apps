// Lista honesta de fuentes y tecnologías utilizadas por el juego (sin llamadas de red)

import type { Idioma } from '../game/settings';
import { esFechaIsoValida } from './eventosLoader';
import osdrJson from './osdr.json';

export type TipoFuenteDatos = 'archivo' | 'balance' | 'tecnologia';

export interface DefinicionFuente {
  id: string;
  tipo: TipoFuenteDatos;
  titulo: { es: string; en: string };
  descripcion: { es: string; en: string };
  url: string;
  urlWeb: string;
  nota: { es: string; en: string };
}

export interface EntradaOsdr {
  titulo: string;
  fuenteNombre: string;
  fuenteUrl: string;
  consultadoEn: string;
  textoNinos: {
    es: string;
    en: string;
  };
  verificado: boolean;
}

export const FUENTES_DATOS: readonly DefinicionFuente[] = [
  {
    id: 'nasa-donki',
    tipo: 'archivo',
    titulo: {
      es: 'NASA DONKI (FLR y SEP) · de archivo',
      en: 'NASA DONKI (FLR & SEP) · archive',
    },
    descripcion: {
      es: 'Catálogo de fulguraciones solares (FLR) y tormentas de partículas energéticas (SEP) consultado offline para archivo.',
      en: 'Catalog of solar flares (FLR) and solar energetic particle events (SEP) queried offline for archival snapshots.',
    },
    url: 'https://api.nasa.gov',
    urlWeb: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
    nota: {
      es: 'Etiqueta fija: datos de archivo locales. El juego nunca hace peticiones de red.',
      en: 'Fixed label: local archive data. The game never makes network requests.',
    },
  },
  {
    id: 'balance-juego',
    tipo: 'balance',
    titulo: {
      es: 'Balance educativo del juego',
      en: 'Educational game balance',
    },
    descripcion: {
      es: 'Los costos de energía, ritmos de drenaje y protección estimada del escudo son reglas del juego, no mediciones de la NASA.',
      en: 'Power costs, drain rates, and estimated shield protection are game balance rules, not NASA measurements.',
    },
    url: '',
    urlWeb: '',
    nota: {
      es: 'Regla orientativa de nivel: clase X o SEP fuerte = nivel fuerte; clase M = nivel medio.',
      en: 'Level guide: X-class or strong SEP = strong level; M-class = medium level.',
    },
  },
  {
    id: 'tecnologia-base',
    tipo: 'tecnologia',
    titulo: {
      es: 'Tipografía Nunito (OFL) y Phaser 3',
      en: 'Nunito Font (OFL) & Phaser 3',
    },
    descripcion: {
      es: 'Tipografía legible Nunito bajo licencia SIL Open Font License (OFL) y motor de juego 2D Phaser 3 (MIT) con gráficos procedurales.',
      en: 'Readable Nunito typeface under the SIL Open Font License (OFL) and Phaser 3 2D game engine (MIT) with procedural graphics.',
    },
    url: '',
    urlWeb: '',
    nota: {
      es: 'Todos los recursos tipográficos y gráficos están empaquetados localmente.',
      en: 'All font and graphic assets are bundled locally.',
    },
  },
  {
    id: 'personaje-luni',
    tipo: 'tecnologia',
    titulo: {
      es: 'Mascota Luni (personaje del juego)',
      en: 'Mascot Luni (game character)',
    },
    descripcion: {
      es: 'Luni es un robot-astronauta ficticio generado de forma procedural para acompañar a niñas y niños en el puesto lunar.',
      en: 'Luni is a procedurally drawn fictional robot-astronaut created to guide kids around the lunar outpost.',
    },
    url: '',
    urlWeb: '',
    nota: {
      es: 'Personaje ficticio educativo; no representa telemetría ni misiones de la NASA.',
      en: 'Fictional educational character; does not represent NASA telemetry or missions.',
    },
  },
];

export function validarDatosOsdr(raw: unknown): EntradaOsdr | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (obj.verificado !== true) {
    return null;
  }
  const titulo = typeof obj.titulo === 'string' ? obj.titulo.trim() : '';
  const fuenteNombre =
    typeof obj.fuenteNombre === 'string' ? obj.fuenteNombre.trim() : '';
  const fuenteUrl =
    typeof obj.fuenteUrl === 'string' ? obj.fuenteUrl.trim() : '';
  const consultadoEn =
    typeof obj.consultadoEn === 'string' ? obj.consultadoEn.trim() : '';

  if (
    titulo.length === 0 ||
    fuenteNombre.length === 0 ||
    fuenteUrl.length === 0 ||
    !esFechaIsoValida(consultadoEn)
  ) {
    return null;
  }

  if (typeof obj.textoNinos !== 'object' || obj.textoNinos === null) {
    return null;
  }
  const tn = obj.textoNinos as Record<string, unknown>;
  const es = typeof tn.es === 'string' ? tn.es.trim() : '';
  const en = typeof tn.en === 'string' ? tn.en.trim() : '';
  if (es.length === 0 || en.length === 0) {
    return null;
  }

  return {
    titulo,
    fuenteNombre,
    fuenteUrl,
    consultadoEn,
    textoNinos: { es, en },
    verificado: true,
  };
}

export function obtenerFuenteOsdrOpcional(
  raw: unknown = osdrJson,
): EntradaOsdr | null {
  return validarDatosOsdr(raw);
}

export function obtenerFuentesActivas(
  osdrRaw: unknown = osdrJson,
): readonly DefinicionFuente[] {
  const osdr = validarDatosOsdr(osdrRaw);
  if (!osdr) {
    return FUENTES_DATOS;
  }
  const entradaOsdr: DefinicionFuente = {
    id: 'nasa-osdr',
    tipo: 'archivo',
    titulo: {
      es: `${osdr.fuenteNombre} · ${osdr.titulo}`,
      en: `${osdr.fuenteNombre} · ${osdr.titulo}`,
    },
    descripcion: {
      es: osdr.textoNinos.es,
      en: osdr.textoNinos.en,
    },
    url: osdr.fuenteUrl,
    urlWeb: osdr.fuenteUrl,
    nota: {
      es: `Datos de archivo · consultados el ${osdr.consultadoEn}`,
      en: `Archive data · checked on ${osdr.consultadoEn}`,
    },
  };
  return [FUENTES_DATOS[0], entradaOsdr, ...FUENTES_DATOS.slice(1)];
}

export function obtenerReglaNivelOrientativa(idioma: Idioma): string {
  return idioma === 'en'
    ? 'Level guide: X-class flare or strong SEP = strong; M-class = medium.'
    : 'Regla orientativa: clase X o SEP fuerte = fuerte; clase M = media.';
}

