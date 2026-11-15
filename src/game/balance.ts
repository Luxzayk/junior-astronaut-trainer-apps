// Estos valores son balance de juego, no datos de NASA.

export const DURACION_JORNADA = 180; // segundos

export const MAX_JORNADAS = 5;

export const RECURSOS_INICIALES = {
  aire: 100,
  energia: 100,
  escudo: 100,
} as const;

export const DRENAJE_BASE_POR_SEG = {
  aire: 0.26,
  energia: 0.11,
  escudo: 0.08,
} as const; // balance de juego, no datos de NASA

// Índice = jornada - 1
export const MULT_DRENAJE_POR_JORNADA: readonly number[] = [
  0.70,
  0.85,
  1.00,
  1.15,
  1.25,
];

export const UMBRAL_BAJO = 35;
export const UMBRAL_CRITICO = 15;

export const VELOCIDAD_JUGADOR = 220; // px/s
export const RADIO_JUGADOR = 18; // px
export const RADIO_INTERACCION = 90; // px

export const DURACION_AVISO_ESTACION_MS = 2000;

export const DEBUG_DELTA_RECURSO = 10;
export const DEBUG_VELOCIDADES = [1, 10] as const;

// --- Fase 2 (Bloque 1): Misiones, Nodos y Elección de Energía ---
// balance de juego, no datos de NASA.

export const NODOS_COLS = 4; // balance de juego, no datos de NASA
export const NODOS_FILAS = 3; // balance de juego, no datos de NASA

export const COSTO_INTENTO_NODOS = {
  energia: -3,
} as const; // balance de juego, no datos de NASA

export const EFECTOS_ELECCION_ENERGIA = {
  invernadero: {
    aire: 24,
    energia: 8,
    escudo: -5,
  },
  bateriaCentral: {
    energia: 28,
    aire: -4,
    escudo: -4,
  },
  escudos: {
    escudo: 24,
    energia: 8,
    aire: -5,
  },
} as const; // balance de juego, no datos de NASA

// --- Fase 2 (Bloque 2): Cierre de jornada y Evento de clima espacial ---
// balance de juego, no datos de NASA.

export const RECARGA_COMPLETA = 20; // balance de juego, no datos de NASA
export const MULT_MODULO_DANADO = 1.25; // balance de juego, no datos de NASA
export const UMBRAL_INCOMPLETAS_REFUERZO = 2; // balance de juego, no datos de NASA

export const REFUERZO_CONTROL_MISION = {
  energia: 15,
  aire: 10,
} as const; // balance de juego, no datos de NASA

export const JORNADA_EVENTO_CLIMA = 3; // balance de juego, no datos de NASA
export const SEGUNDO_EVENTO_CLIMA = 90; // balance de juego, no datos de NASA

export const EFECTOS_EVENTO_FLR = {
  refugiarte: {
    energia: -12,
  },
  seguirTrabajando: {
    escudo: -25,
  },
} as const; // balance de juego, no datos de NASA

// --- Fase 3 (Bloque 1): Minijuegos Válvulas y Escudo ---
// balance de juego, no datos de NASA.

export const MINIJUEGO_TIEMPO_LIMITE = {
  nodos: 60,
  valvulas: 45,
  escudo: 45,
} as const; // balance de juego, no datos de NASA

export const MINIJUEGO_TIEMPO_PISTA_SEG = 10; // balance de juego, no datos de NASA

export const VALVULAS_MIN_PASOS = 3; // balance de juego, no datos de NASA
export const VALVULAS_MAX_PASOS = 5; // balance de juego, no datos de NASA
export const VALVULAS_MEDIDOR_INICIAL = 30; // balance de juego, no datos de NASA
export const VALVULAS_MEDIDOR_MAX = 100; // balance de juego, no datos de NASA
export const MEDIDOR_SUBE_POR_SEG = 2.5; // balance de juego, no datos de NASA
export const MEDIDOR_BAJA_ACIERTO = 15; // balance de juego, no datos de NASA
export const MEDIDOR_SUBE_ERROR = 18; // balance de juego, no datos de NASA

export const ESCUDO_MIN_PANELES = 4; // balance de juego, no datos de NASA
export const ESCUDO_MAX_PANELES = 5; // balance de juego, no datos de NASA
export const ESCUDO_CONSUMO_BASE = 4; // balance de juego, no datos de NASA
export const ESCUDO_CONSUMO_POR_PANEL = 3; // balance de juego, no datos de NASA

// --- Fase 3 (Bloque 2): 5 Jornadas, Elecciones, Eventos y Modo Demo ---
// balance de juego, no datos de NASA.

export const COSTO_INTENTO_MINIJUEGO = {
  nodos: COSTO_INTENTO_NODOS,
  valvulas: { energia: -2 },
  escudo: { energia: -2 },
} as const; // balance de juego, no datos de NASA

export const ELECCIONES = {
  envio_energia: {
    mandarAire: { aire: 30, energia: -6, escudo: 0 },
    mandarEscudo: { aire: 0, energia: -6, escudo: 30 },
  },
  invernadero: {
    plenaLuz: { aire: 38, energia: -8, escudo: 0 },
    ahorro: { aire: 24, energia: -3, escudo: 0 },
  },
  escudo_potencia: {
    potenciaAlta: { aire: 0, energia: -8, escudo: 32 },
    potenciaBaja: { aire: 0, energia: -3, escudo: 20 },
  },
} as const; // balance de juego, no datos de NASA

export const SEGUNDO_EVENTO_FUGA = 70; // balance de juego, no datos de NASA
export const VENTANA_FUGA = 40; // balance de juego, no datos de NASA
export const AGUA_BAJA_MULT_AIRE = 1.15; // balance de juego, no datos de NASA

export const SEGUNDO_EVENTO_APAGON = 70; // balance de juego, no datos de NASA
export const DURACION_BANNER_APAGON_MS = 3000; // balance de juego, no datos de NASA
export const EFECTOS_APAGON = {
  soporteVida: { aire: -16 },
  escudos: { escudo: -22 },
  invernadero: { energia: -10 },
} as const; // balance de juego, no datos de NASA

export const SEGUNDO_EVENTO_TORMENTA_GRANDE = 100; // balance de juego, no datos de NASA
export const EFECTOS_EVENTO_TORMENTA_GRANDE = {
  refugiarte: {
    energia: -15,
  },
  seguirTrabajando: {
    escudo: -35,
  },
} as const; // balance de juego, no datos de NASA

export const DEMO_JORNADA = 3; // balance de juego, no datos de NASA
export const DEMO_DURACION = 150; // segundos, balance de juego, no datos de NASA
export const DEMO_EVENTO_SEGUNDO = 60; // balance de juego, no datos de NASA
export const DEMO_RECURSOS = {
  aire: 70,
  energia: 65,
  escudo: 80,
} as const; // balance de juego, no datos de NASA

export const SIM_TIEMPO_MISION = 30; // segundos por misión, balance de juego, no datos de NASA

// --- Fase 4 (Bloque 3): Tutorial interactivo ---
export const DISTANCIA_TUTORIAL = 80; // px caminados para completar el paso 2, balance de juego, no datos de NASA
