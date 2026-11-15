// Lista honesta de fuentes y tecnologías utilizadas por el juego (sin llamadas de red)

import type { Idioma } from '../game/settings';

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
    urlWeb: '',
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
];

export function obtenerReglaNivelOrientativa(idioma: Idioma): string {
  return idioma === 'en'
    ? 'Level guide: X-class flare or strong SEP = strong; M-class = medium.'
    : 'Regla orientativa: clase X o SEP fuerte = fuerte; clase M = media.';
}
