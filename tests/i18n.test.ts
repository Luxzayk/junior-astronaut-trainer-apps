import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetAjustes, updateAjustes } from '../src/game/settings';
import {
  interpolarPlantilla,
  obtenerTextos,
  t,
  textos,
  type ClaveI18n,
} from '../src/i18n';

function recolectarHojas(
  obj: Record<string, unknown>,
  prefijo = '',
): Array<{ clave: string; valor: string }> {
  const resultado: Array<{ clave: string; valor: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const ruta = prefijo ? `${prefijo}.${k}` : k;
    if (typeof v === 'string') {
      resultado.push({ clave: ruta, valor: v });
    } else if (typeof v === 'object' && v !== null) {
      resultado.push(...recolectarHojas(v as Record<string, unknown>, ruta));
    }
  }
  return resultado;
}

function extraerPlaceholders(texto: string): string[] {
  const encontrados = new Set<string>();
  const regex = /\{([a-zA-Z0-9_]+)\}/g;
  let match: RegExpExecArray | null = regex.exec(texto);
  while (match !== null) {
    encontrados.add(match[1]);
    match = regex.exec(texto);
  }
  return [...encontrados].sort();
}

describe('Sistema bilingüe i18n (ES/EN)', () => {
  beforeEach(() => {
    resetAjustes();
  });

  afterEach(() => {
    resetAjustes();
  });

  it('mantiene exactamente el mismo conjunto de claves y placeholders entre es y en', () => {
    const hojasEs = recolectarHojas(textos.es as unknown as Record<string, unknown>);
    const hojasEn = recolectarHojas(textos.en as unknown as Record<string, unknown>);

    const mapaEs = new Map(hojasEs.map((item) => [item.clave, item.valor]));
    const mapaEn = new Map(hojasEn.map((item) => [item.clave, item.valor]));

    expect([...mapaEs.keys()].sort()).toEqual([...mapaEn.keys()].sort());
    expect(hojasEs.length).toBeGreaterThan(100);

    for (const [clave, valorEs] of mapaEs.entries()) {
      const valorEn = mapaEn.get(clave);
      expect(valorEs.trim().length, `ES vacío en ${clave}`).toBeGreaterThan(0);
      expect(valorEn?.trim().length, `EN vacío en ${clave}`).toBeGreaterThan(0);

      expect(
        extraerPlaceholders(valorEs),
        `Placeholders distintos en ${clave}`,
      ).toEqual(extraerPlaceholders(valorEn ?? ''));
    }
  });

  it('interpola parámetros y respeta el idioma activo de ajustes o forzado', () => {
    expect(
      t('hud.jornadaDe', { actual: 2, total: 5 }),
    ).toBe('Jornada 2 de 5');

    expect(
      t('hud.jornadaDe', { actual: 2, total: 5 }, 'en'),
    ).toBe('Day 2 of 5');

    updateAjustes({ idioma: 'en' });
    expect(t('menu.jugarSemana')).toBe('Play the week');
    expect(obtenerTextos().menu.demo4Min).toBe('4-minute demo');

    updateAjustes({ idioma: 'es' });
    expect(t('menu.jugarSemana')).toBe('Jugar la semana');
    expect(obtenerTextos('en').comun.cerrar).toBe('Close');
  });

  it('conserva placeholders sin valor e ignora claves desconocidas con fallback seguro', () => {
    expect(interpolarPlantilla('Hola {nombre}', {})).toBe('Hola {nombre}');
    expect(
      interpolarPlantilla('Aire: {valor}%', { valor: 84 }),
    ).toBe('Aire: 84%');

    const claveInvalida = 'inexistente.clave' as ClaveI18n;
    expect(t(claveInvalida)).toBe('inexistente.clave');
  });
});
