// Definiciones puras de tonos WebAudio suaves para oídos infantiles (sin música continua)

export type TipoSonido =
  | 'clic'
  | 'mision_ok'
  | 'mision_fallo'
  | 'alerta_barra'
  | 'critico_barra'
  | 'evento_inicio'
  | 'jornada_completa'
  | 'jornada_incompleta'
  | 'evacuacion';

export type FormaOnda = 'sine' | 'triangle';

export interface NotaSintesis {
  frecuenciaInicial: number;
  frecuenciaFinal?: number;
  inicioSeg: number;
  duracionSeg: number;
  forma: FormaOnda;
  nivelRelativo: number; // 0..1 dentro de la ganancia maestra suave
}

export interface DefinicionSonido {
  tipo: TipoSonido;
  notas: readonly NotaSintesis[];
}

export const MAX_VOCES_SIMULTANEAS = 4;
export const MIN_ESPACIADO_ALERTA_MS = 150;
export const GANANCIA_MAESTRA_MAX = 0.24; // Suave para niños de 7 a 12 años

export function calcularGananciaSuave(volumen: number): number {
  if (!Number.isFinite(volumen) || volumen <= 0) {
    return 0;
  }
  const acotado = Math.max(0, Math.min(1, volumen));
  return acotado * GANANCIA_MAESTRA_MAX;
}

export const SONIDOS: Readonly<Record<TipoSonido, DefinicionSonido>> = {
  clic: {
    tipo: 'clic',
    notas: [
      {
        frecuenciaInicial: 520,
        frecuenciaFinal: 580,
        inicioSeg: 0,
        duracionSeg: 0.055,
        forma: 'sine',
        nivelRelativo: 0.45,
      },
    ],
  },
  mision_ok: {
    tipo: 'mision_ok',
    notas: [
      {
        frecuenciaInicial: 523.25, // C5
        inicioSeg: 0,
        duracionSeg: 0.11,
        forma: 'triangle',
        nivelRelativo: 0.75,
      },
      {
        frecuenciaInicial: 659.25, // E5
        inicioSeg: 0.09,
        duracionSeg: 0.12,
        forma: 'triangle',
        nivelRelativo: 0.78,
      },
      {
        frecuenciaInicial: 783.99, // G5
        inicioSeg: 0.19,
        duracionSeg: 0.18,
        forma: 'sine',
        nivelRelativo: 0.85,
      },
    ],
  },
  mision_fallo: {
    tipo: 'mision_fallo',
    notas: [
      {
        frecuenciaInicial: 360,
        frecuenciaFinal: 260,
        inicioSeg: 0,
        duracionSeg: 0.22,
        forma: 'triangle',
        nivelRelativo: 0.7,
      },
    ],
  },
  alerta_barra: {
    tipo: 'alerta_barra',
    notas: [
      {
        frecuenciaInicial: 440, // A4 suave
        inicioSeg: 0,
        duracionSeg: 0.13,
        forma: 'sine',
        nivelRelativo: 0.65,
      },
    ],
  },
  critico_barra: {
    tipo: 'critico_barra',
    notas: [
      {
        frecuenciaInicial: 493.88, // B4 suave
        inicioSeg: 0,
        duracionSeg: 0.12,
        forma: 'triangle',
        nivelRelativo: 0.72,
      },
      {
        frecuenciaInicial: 440,
        inicioSeg: 0.13,
        duracionSeg: 0.14,
        forma: 'sine',
        nivelRelativo: 0.68,
      },
    ],
  },
  evento_inicio: {
    tipo: 'evento_inicio',
    notas: [
      {
        frecuenciaInicial: 329.63, // E4
        inicioSeg: 0,
        duracionSeg: 0.15,
        forma: 'triangle',
        nivelRelativo: 0.72,
      },
      {
        frecuenciaInicial: 440, // A4
        inicioSeg: 0.14,
        duracionSeg: 0.2,
        forma: 'sine',
        nivelRelativo: 0.75,
      },
    ],
  },
  jornada_completa: {
    tipo: 'jornada_completa',
    notas: [
      {
        frecuenciaInicial: 440, // A4
        inicioSeg: 0,
        duracionSeg: 0.12,
        forma: 'triangle',
        nivelRelativo: 0.75,
      },
      {
        frecuenciaInicial: 554.37, // C#5
        inicioSeg: 0.1,
        duracionSeg: 0.12,
        forma: 'triangle',
        nivelRelativo: 0.78,
      },
      {
        frecuenciaInicial: 659.25, // E5
        inicioSeg: 0.2,
        duracionSeg: 0.22,
        forma: 'sine',
        nivelRelativo: 0.85,
      },
    ],
  },
  jornada_incompleta: {
    tipo: 'jornada_incompleta',
    notas: [
      {
        frecuenciaInicial: 392, // G4
        inicioSeg: 0,
        duracionSeg: 0.16,
        forma: 'sine',
        nivelRelativo: 0.68,
      },
      {
        frecuenciaInicial: 329.63, // E4
        inicioSeg: 0.15,
        duracionSeg: 0.22,
        forma: 'sine',
        nivelRelativo: 0.64,
      },
    ],
  },
  evacuacion: {
    tipo: 'evacuacion',
    notas: [
      {
        frecuenciaInicial: 246.94, // B3 grave y calmado
        frecuenciaFinal: 164.81, // E3
        inicioSeg: 0,
        duracionSeg: 0.42,
        forma: 'sine',
        nivelRelativo: 0.78,
      },
      {
        frecuenciaInicial: 196, // G3
        frecuenciaFinal: 146.83, // D3
        inicioSeg: 0.34,
        duracionSeg: 0.45,
        forma: 'sine',
        nivelRelativo: 0.7,
      },
    ],
  },
};
