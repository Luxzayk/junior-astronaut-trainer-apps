// Ajustes persistentes del jugador (lógica pura, sin Phaser)

export type Idioma = 'es' | 'en';

export interface Ajustes {
  idioma: Idioma;
  textoGrande: boolean; // escala UI x1.25 donde sea posible
  movimientoReducido: boolean; // por defecto = prefers-reduced-motion del navegador
  tutorialVisto: boolean;
  ultimaSemana: string | null;
}

export const CLAVE_STORAGE_AJUSTES = 'entrenador_lunar_ajustes_v1';

type ListenerAjustes = (ajustes: Ajustes) => void;

const listenersAjustes = new Set<ListenerAjustes>();

function detectarMovimientoReducidoSistema(): boolean {
  try {
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      return Boolean(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      );
    }
  } catch {
    return false;
  }
  return false;
}

export function crearAjustesPorDefecto(): Ajustes {
  return {
    idioma: 'es',
    textoGrande: false,
    movimientoReducido: detectarMovimientoReducidoSistema(),
    tutorialVisto: false,
    ultimaSemana: null,
  };
}

function normalizarAjustes(
  raw: unknown,
  base: Ajustes = crearAjustesPorDefecto(),
): Ajustes {
  if (typeof raw !== 'object' || raw === null) {
    return { ...base };
  }
  const obj = raw as Record<string, unknown>;

  const idioma: Idioma = obj.idioma === 'en' ? 'en' : obj.idioma === 'es' ? 'es' : base.idioma;
  const textoGrande =
    typeof obj.textoGrande === 'boolean' ? obj.textoGrande : base.textoGrande;
  const movimientoReducido =
    typeof obj.movimientoReducido === 'boolean'
      ? obj.movimientoReducido
      : base.movimientoReducido;
  const tutorialVisto =
    typeof obj.tutorialVisto === 'boolean'
      ? obj.tutorialVisto
      : base.tutorialVisto;
  const ultimaSemana =
    obj.ultimaSemana === null
      ? null
      : typeof obj.ultimaSemana === 'string' && obj.ultimaSemana.trim().length > 0
        ? obj.ultimaSemana
        : base.ultimaSemana;

  return {
    idioma,
    textoGrande,
    movimientoReducido,
    tutorialVisto,
    ultimaSemana,
  };
}

function obtenerStorageSeguro(): Storage | null {
  try {
    if (typeof window !== 'undefined' && 'localStorage' in window) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

function leerDeStorage(): Ajustes {
  const defecto = crearAjustesPorDefecto();
  try {
    const storage = obtenerStorageSeguro();
    if (!storage) {
      return ajustesEnMemoria ? { ...ajustesEnMemoria } : defecto;
    }
    const raw = storage.getItem(CLAVE_STORAGE_AJUSTES);
    if (!raw) {
      return dirtySoloMemoria && ajustesEnMemoria
        ? { ...ajustesEnMemoria }
        : defecto;
    }
    const parsed: unknown = JSON.parse(raw);
    return normalizarAjustes(parsed, defecto);
  } catch {
    return dirtySoloMemoria && ajustesEnMemoria
      ? { ...ajustesEnMemoria }
      : defecto;
  }
}

function escribirEnStorage(ajustes: Ajustes): boolean {
  try {
    const storage = obtenerStorageSeguro();
    if (!storage) {
      return false;
    }
    storage.setItem(CLAVE_STORAGE_AJUSTES, JSON.stringify(ajustes));
    return true;
  } catch {
    // Modo privado o cuota llena: mantenemos funcionamiento en memoria sin fallar
    return false;
  }
}

function emitirCambio(ajustes: Ajustes): void {
  const copia = { ...ajustes };
  for (const listener of listenersAjustes) {
    listener(copia);
  }
}

let ajustesEnMemoria: Ajustes | null = null;
let dirtySoloMemoria = false;

export function getAjustes(): Ajustes {
  if (dirtySoloMemoria && ajustesEnMemoria) {
    return { ...ajustesEnMemoria };
  }
  ajustesEnMemoria = leerDeStorage();
  return { ...ajustesEnMemoria };
}

export function updateAjustes(parcial: Partial<Ajustes>): Ajustes {
  const actuales = getAjustes();
  const nuevos = normalizarAjustes({ ...actuales, ...parcial }, actuales);
  ajustesEnMemoria = nuevos;
  const persistido = escribirEnStorage(nuevos);
  dirtySoloMemoria = !persistido;
  emitirCambio(nuevos);
  return { ...nuevos };
}

export function resetAjustes(): Ajustes {
  const defecto = crearAjustesPorDefecto();
  ajustesEnMemoria = null;
  dirtySoloMemoria = false;
  try {
    const storage = obtenerStorageSeguro();
    if (storage) {
      storage.removeItem(CLAVE_STORAGE_AJUSTES);
    }
  } catch {
    // Ignoramos errores de almacenamiento en entornos restringidos
  }
  emitirCambio(defecto);
  return { ...defecto };
}

export function suscribirAjustes(listener: ListenerAjustes): () => void {
  listenersAjustes.add(listener);
  return () => {
    listenersAjustes.delete(listener);
  };
}
