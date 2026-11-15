import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CLAVE_STORAGE_AJUSTES,
  crearAjustesPorDefecto,
  getAjustes,
  resetAjustes,
  suscribirAjustes,
  updateAjustes,
} from '../src/game/settings';

function crearStorageMemoria(): Storage {
  const store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

describe('Ajustes persistentes (settings.ts)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAjustes();
  });

  it('devuelve valores por defecto válidos y lee prefers-reduced-motion de forma segura', () => {
    const porDefectoSinWindow = crearAjustesPorDefecto();
    expect(porDefectoSinWindow).toEqual({
      idioma: 'es',
      textoGrande: false,
      movimientoReducido: false,
      tutorialVisto: false,
      ultimaSemana: null,
      sonido: true,
      volumen: 0.5,
    });

    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
      }),
    });
    expect(crearAjustesPorDefecto().movimientoReducido).toBe(true);

    vi.stubGlobal('window', {
      matchMedia: () => {
        throw new Error('matchMedia no disponible');
      },
    });
    expect(crearAjustesPorDefecto().movimientoReducido).toBe(false);
  });

  it('persiste cambios en localStorage, acota volumen, notifica suscriptores y permite resetear', () => {
    const storage = crearStorageMemoria();
    vi.stubGlobal('window', {
      localStorage: storage,
      matchMedia: () => ({ matches: false }),
    });

    const historial: string[] = [];
    const desuscribir = suscribirAjustes((aj) => {
      historial.push(
        `${aj.idioma}:${aj.textoGrande}:${aj.tutorialVisto}:${aj.sonido}:${aj.volumen}`,
      );
    });

    const actualizado = updateAjustes({
      idioma: 'en',
      textoGrande: true,
      ultimaSemana: '1989-halloween',
      sonido: false,
      volumen: 0.75,
    });
    expect(actualizado).toEqual({
      idioma: 'en',
      textoGrande: true,
      movimientoReducido: false,
      tutorialVisto: false,
      ultimaSemana: '1989-halloween',
      sonido: false,
      volumen: 0.75,
    });
    expect(getAjustes()).toEqual(actualizado);
    expect(storage.getItem(CLAVE_STORAGE_AJUSTES)).not.toBeNull();

    const acotadoAlto = updateAjustes({ volumen: 2.5 });
    expect(acotadoAlto.volumen).toBe(1);
    const acotadoBajo = updateAjustes({ volumen: -0.4 });
    expect(acotadoBajo.volumen).toBe(0);

    const trasReset = resetAjustes();
    expect(trasReset.idioma).toBe('es');
    expect(trasReset.textoGrande).toBe(false);
    expect(trasReset.ultimaSemana).toBeNull();
    expect(trasReset.sonido).toBe(true);
    expect(trasReset.volumen).toBe(0.5);
    expect(storage.getItem(CLAVE_STORAGE_AJUSTES)).toBeNull();

    desuscribir();
    updateAjustes({ tutorialVisto: true });
    expect(historial).toEqual([
      'en:true:false:false:0.75',
      'en:true:false:false:1',
      'en:true:false:false:0',
      'es:false:false:true:0.5',
    ]);
  });

  it('recupera valores por defecto si localStorage contiene JSON corrupto', () => {
    const storage = crearStorageMemoria();
    storage.setItem(CLAVE_STORAGE_AJUSTES, '{json-roto');
    vi.stubGlobal('window', {
      localStorage: storage,
      matchMedia: () => ({ matches: false }),
    });

    expect(getAjustes()).toEqual({
      idioma: 'es',
      textoGrande: false,
      movimientoReducido: false,
      tutorialVisto: false,
      ultimaSemana: null,
      sonido: true,
      volumen: 0.5,
    });
  });

  it('no lanza excepciones si localStorage lanza SecurityError o QuotaExceededError', () => {
    const storageHostil: Storage = {
      length: 0,
      clear: () => {
        throw new DOMException('Bloqueado', 'SecurityError');
      },
      getItem: () => {
        throw new DOMException('Bloqueado', 'SecurityError');
      },
      key: () => null,
      removeItem: () => {
        throw new DOMException('Bloqueado', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Sin espacio', 'QuotaExceededError');
      },
    };

    vi.stubGlobal('window', {
      localStorage: storageHostil,
    });

    expect(() => getAjustes()).not.toThrow();
    expect(() => updateAjustes({ idioma: 'en', textoGrande: true })).not.toThrow();
    expect(getAjustes().idioma).toBe('en');
    expect(getAjustes().textoGrande).toBe(true);
    expect(() => resetAjustes()).not.toThrow();
    expect(getAjustes().idioma).toBe('es');

    // Incluso si el propio getter window.localStorage lanza SecurityError
    const ventanaHostil = {};
    Object.defineProperty(ventanaHostil, 'localStorage', {
      get: () => {
        throw new DOMException('Acceso denegado', 'SecurityError');
      },
    });
    vi.stubGlobal('window', ventanaHostil);

    expect(() => getAjustes()).not.toThrow();
    expect(() => updateAjustes({ movimientoReducido: true })).not.toThrow();
    expect(getAjustes().movimientoReducido).toBe(true);
    expect(() => resetAjustes()).not.toThrow();
  });
});
