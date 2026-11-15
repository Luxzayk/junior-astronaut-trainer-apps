// Definiciones de las 5 jornadas, misiones, eventos y opciones de elección

import { t, type ClaveI18n } from '../i18n';
import type { MinigameId } from '../minigames/types';
import { COLORES } from '../ui/theme';
import {
  EFECTOS_ELECCION_ENERGIA,
  ELECCIONES,
  SEGUNDO_EVENTO_APAGON,
  SEGUNDO_EVENTO_CLIMA,
  SEGUNDO_EVENTO_FUGA,
  SEGUNDO_EVENTO_TORMENTA_GRANDE,
  VENTANA_FUGA,
} from './balance';
import type { SalaId } from './map';
import type { RecursoNombre } from './state';

export type TipoMinijuego = MinigameId | 'proximamente';

export type TipoEleccion = 'envio_energia' | 'invernadero' | 'escudo_potencia';

export type EventoJornada =
  | {
      tipo: 'fuga';
      segundo: number;
      pasos: number;
      tiempoLimite: number;
      ventana: number;
    }
  | {
      tipo: 'clima';
      segundo: number;
      eventoId: string;
      opciones: 'FULGURACION' | 'TORMENTA_GRANDE';
    }
  | {
      tipo: 'apagon';
      segundo: number;
    };

export interface MisionDef {
  id: string;
  jornada: number;
  estacionId: SalaId;
  minijuego: MinigameId;
  pasos: number;
  tiempoLimite: number;
  eleccion: TipoEleccion | null;
  titulo: string;
  descripcionCorta: string;
  tituloClave?: ClaveI18n;
  descripcionClave?: ClaveI18n;
  obligatoria: boolean;
  sinEleccion?: boolean;
  urgente?: {
    ventana: number;
  };
}

export type DefinicionMision = MisionDef;

export interface DefinicionJornada {
  jornada: number;
  titulo: string;
  tituloClave?: ClaveI18n;
  misiones: readonly MisionDef[];
  evento: EventoJornada | null;
}

export type IdOpcionEnergia = 'invernadero' | 'bateriaCentral' | 'escudos';

export interface OpcionDestinoEnergia {
  id: IdOpcionEnergia;
  recursoPrincipal: RecursoNombre;
  colorAcento: number;
  titulo: string;
  descripcion: string;
  tituloClave?: ClaveI18n;
  descripcionClave?: ClaveI18n;
  efectos: Readonly<Record<RecursoNombre, number>>;
}

export interface OpcionEleccion {
  id: string;
  tipo: TipoEleccion;
  recursoPrincipal: RecursoNombre;
  colorAcento: number;
  titulo: string;
  descripcion: string;
  tituloClave?: ClaveI18n;
  descripcionClave?: ClaveI18n;
  efectos: Readonly<Record<RecursoNombre, number>>;
}

export const JORNADAS: readonly DefinicionJornada[] = [
  {
    jornada: 1,
    get titulo(): string {
      return t('misiones.j1Titulo');
    },
    tituloClave: 'misiones.j1Titulo',
    misiones: [
      {
        id: 'j1_energia',
        jornada: 1,
        estacionId: 'energia',
        minijuego: 'nodos',
        pasos: 3,
        tiempoLimite: 60,
        eleccion: 'envio_energia',
        get titulo(): string {
          return t('misiones.j1EnergiaTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j1EnergiaDesc');
        },
        tituloClave: 'misiones.j1EnergiaTitulo',
        descripcionClave: 'misiones.j1EnergiaDesc',
        obligatoria: true,
      },
    ],
    evento: null,
  },
  {
    jornada: 2,
    get titulo(): string {
      return t('misiones.j2Titulo');
    },
    tituloClave: 'misiones.j2Titulo',
    misiones: [
      {
        id: 'j2_invernadero',
        jornada: 2,
        estacionId: 'invernadero',
        minijuego: 'valvulas',
        pasos: 3,
        tiempoLimite: 35,
        eleccion: 'invernadero',
        get titulo(): string {
          return t('misiones.j2InvernaderoTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j2InvernaderoDesc');
        },
        tituloClave: 'misiones.j2InvernaderoTitulo',
        descripcionClave: 'misiones.j2InvernaderoDesc',
        obligatoria: true,
      },
    ],
    evento: {
      tipo: 'fuga',
      segundo: SEGUNDO_EVENTO_FUGA,
      pasos: 3,
      tiempoLimite: 25,
      ventana: VENTANA_FUGA,
    },
  },
  {
    jornada: 3,
    get titulo(): string {
      return t('misiones.j3Titulo');
    },
    tituloClave: 'misiones.j3Titulo',
    misiones: [
      {
        id: 'j3_energia',
        jornada: 3,
        estacionId: 'energia',
        minijuego: 'nodos',
        pasos: 3,
        tiempoLimite: 60,
        eleccion: 'envio_energia',
        get titulo(): string {
          return t('misiones.j3EnergiaTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j3EnergiaDesc');
        },
        tituloClave: 'misiones.j3EnergiaTitulo',
        descripcionClave: 'misiones.j3EnergiaDesc',
        obligatoria: true,
      },
      {
        id: 'j3_escudos',
        jornada: 3,
        estacionId: 'escudos',
        minijuego: 'escudo',
        pasos: 3,
        tiempoLimite: 35,
        eleccion: 'escudo_potencia',
        get titulo(): string {
          return t('misiones.j3EscudosTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j3EscudosDesc');
        },
        tituloClave: 'misiones.j3EscudosTitulo',
        descripcionClave: 'misiones.j3EscudosDesc',
        obligatoria: true,
      },
    ],
    evento: {
      tipo: 'clima',
      segundo: SEGUNDO_EVENTO_CLIMA,
      eventoId: 'j3-fulguracion',
      opciones: 'FULGURACION',
    },
  },
  {
    jornada: 4,
    get titulo(): string {
      return t('misiones.j4Titulo');
    },
    tituloClave: 'misiones.j4Titulo',
    misiones: [
      {
        id: 'j4_energia',
        jornada: 4,
        estacionId: 'energia',
        minijuego: 'nodos',
        pasos: 4,
        tiempoLimite: 55,
        eleccion: 'envio_energia',
        get titulo(): string {
          return t('misiones.j4EnergiaTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j4EnergiaDesc');
        },
        tituloClave: 'misiones.j4EnergiaTitulo',
        descripcionClave: 'misiones.j4EnergiaDesc',
        obligatoria: true,
      },
      {
        id: 'j4_invernadero',
        jornada: 4,
        estacionId: 'invernadero',
        minijuego: 'valvulas',
        pasos: 4,
        tiempoLimite: 35,
        eleccion: 'invernadero',
        get titulo(): string {
          return t('misiones.j4InvernaderoTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j4InvernaderoDesc');
        },
        tituloClave: 'misiones.j4InvernaderoTitulo',
        descripcionClave: 'misiones.j4InvernaderoDesc',
        obligatoria: true,
      },
    ],
    evento: {
      tipo: 'apagon',
      segundo: SEGUNDO_EVENTO_APAGON,
    },
  },
  {
    jornada: 5,
    get titulo(): string {
      return t('misiones.j5Titulo');
    },
    tituloClave: 'misiones.j5Titulo',
    misiones: [
      {
        id: 'j5_invernadero',
        jornada: 5,
        estacionId: 'invernadero',
        minijuego: 'valvulas',
        pasos: 4,
        tiempoLimite: 35,
        eleccion: 'invernadero',
        get titulo(): string {
          return t('misiones.j5InvernaderoTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j5InvernaderoDesc');
        },
        tituloClave: 'misiones.j5InvernaderoTitulo',
        descripcionClave: 'misiones.j5InvernaderoDesc',
        obligatoria: true,
      },
      {
        id: 'j5_escudos',
        jornada: 5,
        estacionId: 'escudos',
        minijuego: 'escudo',
        pasos: 4,
        tiempoLimite: 35,
        eleccion: 'escudo_potencia',
        get titulo(): string {
          return t('misiones.j5EscudosTitulo');
        },
        get descripcionCorta(): string {
          return t('misiones.j5EscudosDesc');
        },
        tituloClave: 'misiones.j5EscudosTitulo',
        descripcionClave: 'misiones.j5EscudosDesc',
        obligatoria: true,
      },
    ],
    evento: {
      tipo: 'clima',
      segundo: SEGUNDO_EVENTO_TORMENTA_GRANDE,
      eventoId: 'j5-tormenta-grande',
      opciones: 'TORMENTA_GRANDE',
    },
  },
];

export function crearMisionFugaUrgente(
  jornada: number,
  pasos = 3,
  tiempoLimite = 25,
  ventana = VENTANA_FUGA,
): MisionDef {
  return {
    id: `j${jornada}_fuga_tanque`,
    jornada,
    estacionId: 'tanque',
    minijuego: 'valvulas',
    pasos,
    tiempoLimite,
    eleccion: null,
    sinEleccion: true,
    urgente: { ventana },
    get titulo(): string {
      return t('misiones.j2FugaTitulo');
    },
    get descripcionCorta(): string {
      return t('misiones.j2FugaDesc');
    },
    tituloClave: 'misiones.j2FugaTitulo',
    descripcionClave: 'misiones.j2FugaDesc',
    obligatoria: false,
  };
}

export const OPCIONES_POR_TIPO_ELECCION: Record<
  TipoEleccion,
  readonly OpcionEleccion[]
> = {
  envio_energia: [
    {
      id: 'mandarAire',
      tipo: 'envio_energia',
      recursoPrincipal: 'aire',
      colorAcento: COLORES.aire,
      get titulo(): string {
        return t('eleccionEnergia.mandarAireTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.mandarAireDesc');
      },
      tituloClave: 'eleccionEnergia.mandarAireTitulo',
      descripcionClave: 'eleccionEnergia.mandarAireDesc',
      efectos: ELECCIONES.envio_energia.mandarAire,
    },
    {
      id: 'mandarEscudo',
      tipo: 'envio_energia',
      recursoPrincipal: 'escudo',
      colorAcento: COLORES.escudo,
      get titulo(): string {
        return t('eleccionEnergia.mandarEscudoTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.mandarEscudoDesc');
      },
      tituloClave: 'eleccionEnergia.mandarEscudoTitulo',
      descripcionClave: 'eleccionEnergia.mandarEscudoDesc',
      efectos: ELECCIONES.envio_energia.mandarEscudo,
    },
  ],
  invernadero: [
    {
      id: 'plenaLuz',
      tipo: 'invernadero',
      recursoPrincipal: 'aire',
      colorAcento: COLORES.aire,
      get titulo(): string {
        return t('eleccionEnergia.plenaLuzTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.plenaLuzDesc');
      },
      tituloClave: 'eleccionEnergia.plenaLuzTitulo',
      descripcionClave: 'eleccionEnergia.plenaLuzDesc',
      efectos: ELECCIONES.invernadero.plenaLuz,
    },
    {
      id: 'ahorro',
      tipo: 'invernadero',
      recursoPrincipal: 'aire',
      colorAcento: COLORES.ok,
      get titulo(): string {
        return t('eleccionEnergia.ahorroTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.ahorroDesc');
      },
      tituloClave: 'eleccionEnergia.ahorroTitulo',
      descripcionClave: 'eleccionEnergia.ahorroDesc',
      efectos: ELECCIONES.invernadero.ahorro,
    },
  ],
  escudo_potencia: [
    {
      id: 'potenciaAlta',
      tipo: 'escudo_potencia',
      recursoPrincipal: 'escudo',
      colorAcento: COLORES.escudo,
      get titulo(): string {
        return t('eleccionEnergia.potenciaAltaTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.potenciaAltaDesc');
      },
      tituloClave: 'eleccionEnergia.potenciaAltaTitulo',
      descripcionClave: 'eleccionEnergia.potenciaAltaDesc',
      efectos: ELECCIONES.escudo_potencia.potenciaAlta,
    },
    {
      id: 'potenciaBaja',
      tipo: 'escudo_potencia',
      recursoPrincipal: 'escudo',
      colorAcento: COLORES.ok,
      get titulo(): string {
        return t('eleccionEnergia.potenciaBajaTitulo');
      },
      get descripcion(): string {
        return t('eleccionEnergia.potenciaBajaDesc');
      },
      tituloClave: 'eleccionEnergia.potenciaBajaTitulo',
      descripcionClave: 'eleccionEnergia.potenciaBajaDesc',
      efectos: ELECCIONES.escudo_potencia.potenciaBaja,
    },
  ],
};

export const OPCIONES_DESTINO_ENERGIA: readonly OpcionDestinoEnergia[] = [
  {
    id: 'invernadero',
    recursoPrincipal: 'aire',
    colorAcento: COLORES.aire,
    get titulo(): string {
      return t('eleccionEnergia.invernaderoTitulo');
    },
    get descripcion(): string {
      return t('eleccionEnergia.invernaderoDesc');
    },
    tituloClave: 'eleccionEnergia.invernaderoTitulo',
    descripcionClave: 'eleccionEnergia.invernaderoDesc',
    efectos: EFECTOS_ELECCION_ENERGIA.invernadero,
  },
  {
    id: 'bateriaCentral',
    recursoPrincipal: 'energia',
    colorAcento: COLORES.energia,
    get titulo(): string {
      return t('eleccionEnergia.bateriaTitulo');
    },
    get descripcion(): string {
      return t('eleccionEnergia.bateriaDesc');
    },
    tituloClave: 'eleccionEnergia.bateriaTitulo',
    descripcionClave: 'eleccionEnergia.bateriaDesc',
    efectos: EFECTOS_ELECCION_ENERGIA.bateriaCentral,
  },
  {
    id: 'escudos',
    recursoPrincipal: 'escudo',
    colorAcento: COLORES.escudo,
    get titulo(): string {
      return t('eleccionEnergia.escudosTitulo');
    },
    get descripcion(): string {
      return t('eleccionEnergia.escudosDesc');
    },
    tituloClave: 'eleccionEnergia.escudosTitulo',
    descripcionClave: 'eleccionEnergia.escudosDesc',
    efectos: EFECTOS_ELECCION_ENERGIA.escudos,
  },
];
