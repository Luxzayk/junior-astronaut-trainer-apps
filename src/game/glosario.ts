// Glosario educativo para niños de 7 a 12 años (definiciones máx. 2 líneas)

export type IdTerminoGlosario =
  | 'fulguracion'
  | 'particulas_solares'
  | 'radiacion'
  | 'escudo'
  | 'soporte_vida'
  | 'jornada'
  | 'modulo_danado'
  | 'nivel_evento';

export interface TerminoGlosario {
  id: IdTerminoGlosario;
  nombre: {
    es: string;
    en: string;
  };
  definicion: {
    es: string;
    en: string;
  };
}

export const TERMINOS_GLOSARIO: readonly TerminoGlosario[] = [
  {
    id: 'fulguracion',
    nombre: {
      es: 'Fulguración solar',
      en: 'Solar flare',
    },
    definicion: {
      es: 'Destello gigante de luz y radiación que sale del Sol.\nPuede afectar antenas y sistemas del puesto lunar.',
      en: 'A giant burst of light and radiation from the Sun.\nIt can disrupt antennas and systems at the lunar base.',
    },
  },
  {
    id: 'particulas_solares',
    nombre: {
      es: 'Partículas solares (SEP)',
      en: 'Solar particles (SEP)',
    },
    definicion: {
      es: 'Partículas muy rápidas lanzadas por el Sol hacia el espacio.\nTardan poco en llegar a la Luna y exigen más escudo.',
      en: 'Very fast charged particles shot out by the Sun.\nThey reach the Moon quickly and demand extra shielding.',
    },
  },
  {
    id: 'radiacion',
    nombre: {
      es: 'Radiación espacial',
      en: 'Space radiation',
    },
    definicion: {
      es: 'Energía invisible que viaja por el espacio fuera de la Tierra.\nEn la Luna no hay atmósfera gruesa que la frene.',
      en: 'Invisible energy traveling through deep space.\nThe Moon has no thick atmosphere to block it.',
    },
  },
  {
    id: 'escudo',
    nombre: {
      es: 'Escudo deflector',
      en: 'Deflector shield',
    },
    definicion: {
      es: 'Barrera del puesto lunar que frena las tormentas solares.\nSi baja demasiado, la tripulación corre más riesgo.',
      en: 'Protective barrier that blocks solar storm radiation.\nIf it gets too low, the crew faces higher risk.',
    },
  },
  {
    id: 'soporte_vida',
    nombre: {
      es: 'Soporte de vida',
      en: 'Life support',
    },
    definicion: {
      es: 'Conjunto de sistemas que mantienen aire respirable y agua limpia.\nSi el Aire llega a 0 %, hay que evacuar la base.',
      en: 'Systems that keep breathable air and clean water flowing.\nIf Air hits 0%, the crew must evacuate the base.',
    },
  },
  {
    id: 'jornada',
    nombre: {
      es: 'Jornada lunar',
      en: 'Lunar shift (jornada)',
    },
    definicion: {
      es: 'Un turno completo de trabajo de 3 minutos en el puesto lunar.\nLos recursos no se reinician al pasar de una jornada a otra.',
      en: 'One full 3-minute work shift at the lunar outpost.\nResources carry over from one shift to the next.',
    },
  },
  {
    id: 'modulo_danado',
    nombre: {
      es: 'Módulo dañado',
      en: 'Damaged module',
    },
    definicion: {
      es: 'Estación sin completar al cierre de una jornada.\nGasta su recurso un 25 % más rápido hasta repararla.',
      en: 'Unfinished station left open at shift end.\nDrains its resource 25% faster until you repair it.',
    },
  },
  {
    id: 'nivel_evento',
    nombre: {
      es: 'Nivel del evento',
      en: 'Event severity level',
    },
    definicion: {
      es: 'Indica si la tormenta es media (M) o fuerte (X / SEP intenso).\nUn evento fuerte cuesta más Energía o daña más el Escudo.',
      en: 'Shows whether a storm is medium (M) or strong (X / intense SEP).\nStrong events cost more Power or hit Shield harder.',
    },
  },
];

export const IDS_GLOSARIO_EVENTO_FLR: readonly IdTerminoGlosario[] = [
  'fulguracion',
  'radiacion',
];

export const IDS_GLOSARIO_EVENTO_SEP: readonly IdTerminoGlosario[] = [
  'particulas_solares',
  'nivel_evento',
];

export const IDS_GLOSARIO_CIERRE: readonly IdTerminoGlosario[] = [
  'modulo_danado',
  'jornada',
];

export function obtenerTerminoGlosario(
  id: IdTerminoGlosario,
): TerminoGlosario | null {
  return TERMINOS_GLOSARIO.find((item) => item.id === id) ?? null;
}

export function listarTerminosGlosario(): readonly TerminoGlosario[] {
  return TERMINOS_GLOSARIO;
}
