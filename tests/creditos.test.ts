import { describe, expect, it } from 'vitest';
import {
  DATOS_CREDITOS,
  obtenerSeccionesCreditos,
} from '../src/data/creditos';

describe('Datos de Créditos y Licencias', () => {
  it('incluye el aviso obligatorio de independencia en español e inglés', () => {
    expect(DATOS_CREDITOS.avisoIndependencia.es).toBe(
      'Proyecto independiente creado para NASA Space Apps 2026; no está afiliado ni respaldado por la NASA.',
    );
    expect(DATOS_CREDITOS.avisoIndependencia.en).toContain(
      'not affiliated with or endorsed by NASA',
    );
    expect(DATOS_CREDITOS.evento.es).toBe('Hecho para NASA Space Apps 2026');
  });

  it('declara tecnologías, tipografía Nunito OFL, fuentes de archivo, uso de IA y placeholders de equipo', () => {
    expect(DATOS_CREDITOS.tecnologias).toEqual(
      expect.arrayContaining(['Phaser 3 (MIT)', 'TypeScript', 'Vite', 'Vitest']),
    );
    expect(DATOS_CREDITOS.tipografia.es).toContain('Nunito');
    expect(DATOS_CREDITOS.tipografia.es).toContain('OFL');
    expect(DATOS_CREDITOS.avisoIA.es).toContain('herramientas de IA');
    expect(DATOS_CREDITOS.equipo.some((item) => item.includes('[nombre]'))).toBe(
      true,
    );
  });

  it('genera secciones completas para ambos idiomas con el aviso destacado', () => {
    const es = obtenerSeccionesCreditos('es');
    const en = obtenerSeccionesCreditos('en');
    expect(es.length).toBeGreaterThanOrEqual(4);
    expect(en.length).toBe(es.length);
    expect(es[0].destacado).toBe(true);
    expect(en[0].destacado).toBe(true);
    expect(es.every((s) => s.titulo.length > 0 && s.cuerpo.length > 0)).toBe(
      true,
    );
    expect(en.every((s) => s.titulo.length > 0 && s.cuerpo.length > 0)).toBe(
      true,
    );
  });
});
