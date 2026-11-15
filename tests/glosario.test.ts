import { describe, expect, it } from 'vitest';
import {
  IDS_GLOSARIO_CIERRE,
  IDS_GLOSARIO_EVENTO_FLR,
  IDS_GLOSARIO_EVENTO_SEP,
  TERMINOS_GLOSARIO,
  listarTerminosGlosario,
  obtenerTerminoGlosario,
} from '../src/game/glosario';

describe('Glosario educativo ES/EN', () => {
  it('incluye los 8 términos esperados con IDs únicos', () => {
    const lista = listarTerminosGlosario();
    expect(lista).toHaveLength(8);
    expect(TERMINOS_GLOSARIO).toHaveLength(8);

    const ids = lista.map((t) => t.id);
    expect(new Set(ids).size).toBe(8);
  });

  it('cada término tiene nombre y definición no vacías de máximo 2 líneas en ES y EN', () => {
    for (const termino of TERMINOS_GLOSARIO) {
      expect(termino.nombre.es.trim().length).toBeGreaterThan(0);
      expect(termino.nombre.en.trim().length).toBeGreaterThan(0);
      expect(termino.definicion.es.trim().length).toBeGreaterThan(0);
      expect(termino.definicion.en.trim().length).toBeGreaterThan(0);

      const lineasEs = termino.definicion.es.split('\n');
      const lineasEn = termino.definicion.en.split('\n');
      expect(lineasEs.length).toBeLessThanOrEqual(2);
      expect(lineasEn.length).toBeLessThanOrEqual(2);
    }
  });

  it('todos los IDs de chips usados en EventScene y OverlayScene existen en el glosario', () => {
    const todosLosChips = [
      ...IDS_GLOSARIO_EVENTO_FLR,
      ...IDS_GLOSARIO_EVENTO_SEP,
      ...IDS_GLOSARIO_CIERRE,
    ];
    expect(todosLosChips.length).toBeGreaterThanOrEqual(6);

    for (const id of todosLosChips) {
      const encontrado = obtenerTerminoGlosario(id);
      expect(encontrado).not.toBeNull();
      expect(encontrado?.id).toBe(id);
    }
  });
});
