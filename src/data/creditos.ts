// Datos puros y bilingües de créditos, licencias y aviso de independencia (sin red)

import type { Idioma } from '../game/settings';

export interface SeccionCreditos {
  titulo: { es: string; en: string };
  lineas: { es: readonly string[]; en: readonly string[] };
}

export interface DatosCreditos {
  tituloJuego: { es: string; en: string };
  evento: { es: string; en: string };
  avisoIndependencia: { es: string; en: string };
  equipo: readonly string[];
  tecnologias: readonly string[];
  tipografia: { es: string; en: string };
  fuentesDatos: { es: readonly string[]; en: readonly string[] };
  avisoIA: { es: string; en: string };
}

export const DATOS_CREDITOS: DatosCreditos = {
  tituloJuego: {
    es: 'Entrenador Lunar Junior',
    en: 'Junior Lunar Trainer',
  },
  evento: {
    es: 'Hecho para NASA Space Apps 2026',
    en: 'Made for NASA Space Apps 2026',
  },
  avisoIndependencia: {
    es: 'Proyecto independiente creado para NASA Space Apps 2026; no está afiliado ni respaldado por la NASA.',
    en: 'Independent project created for NASA Space Apps 2026; not affiliated with or endorsed by NASA.',
  },
  equipo: [
    '[nombre] — Diseño de juego y narrativa educativa',
    '[nombre] — Programación y sistemas',
    '[nombre] — Curación de datos y ciencia',
    '[nombre] — Accesibilidad, pruebas y demostración',
  ],
  tecnologias: [
    'Phaser 3 (MIT)',
    'TypeScript',
    'Vite',
    'Vitest',
  ],
  tipografia: {
    es: 'Tipografía Nunito — SIL Open Font License (OFL), empaquetada localmente.',
    en: 'Nunito typeface — SIL Open Font License (OFL), bundled locally.',
  },
  fuentesDatos: {
    es: [
      'NASA DONKI (CCMC) — eventos históricos FLR y SEP guardados en archivo local.',
      'Modo offline sin conexión: ninguna llamada de red en tiempo de ejecución.',
      'Los porcentajes de Aire, Energía y Escudo son balance educativo del juego.',
      'Luni es un personaje procedural ficticio del juego (no dato ni robot de la NASA).',
    ],
    en: [
      'NASA DONKI (CCMC) — historical FLR and SEP events stored in local archive.',
      'Offline mode: zero network calls at runtime.',
      'Air, Power, and Shield percentages are educational game balance.',
      'Luni is a fictional procedural game character (not a NASA robot or data).',
    ],
  },
  avisoIA: {
    es: 'Hecho con ayuda de herramientas de IA (ver README).',
    en: 'Made with the help of AI tools (see README).',
  },
};

export function obtenerSeccionesCreditos(
  idioma: Idioma,
): readonly { titulo: string; cuerpo: string; destacado?: boolean }[] {
  const esEn = idioma === 'en';
  return [
    {
      titulo: esEn
        ? DATOS_CREDITOS.evento.en
        : DATOS_CREDITOS.evento.es,
      cuerpo: esEn
        ? DATOS_CREDITOS.avisoIndependencia.en
        : DATOS_CREDITOS.avisoIndependencia.es,
      destacado: true,
    },
    {
      titulo: esEn ? 'Team' : 'Equipo',
      cuerpo: DATOS_CREDITOS.equipo.join('\n'),
    },
    {
      titulo: esEn ? 'Technologies & Font' : 'Tecnologías y tipografía',
      cuerpo: `${DATOS_CREDITOS.tecnologias.join(' · ')}\n${
        esEn ? DATOS_CREDITOS.tipografia.en : DATOS_CREDITOS.tipografia.es
      }`,
    },
    {
      titulo: esEn ? 'Data sources & AI note' : 'Fuentes de datos y nota de IA',
      cuerpo: `${(esEn ? DATOS_CREDITOS.fuentesDatos.en : DATOS_CREDITOS.fuentesDatos.es).join('\n')}\n${
        esEn ? DATOS_CREDITOS.avisoIA.en : DATOS_CREDITOS.avisoIA.es
      }`,
    },
  ];
}
