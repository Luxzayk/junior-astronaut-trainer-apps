import { describe, expect, it } from 'vitest';
import {
  FUENTES_DATOS,
  obtenerFuenteOsdrOpcional,
  obtenerFuentesActivas,
} from '../src/data/fuentes';
import { generarInformeFinal } from '../src/game/informe';
import { GameStateManager } from '../src/game/state';

describe('Soporte opcional para NASA OSDR', () => {
  it('omite OSDR por completo cuando osdr.json tiene verificado: false o campos vacíos', () => {
    expect(obtenerFuenteOsdrOpcional()).toBeNull();
    expect(obtenerFuentesActivas()).toEqual(FUENTES_DATOS);

    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');
    const informe = generarInformeFinal(gm.getSnapshot(), { idioma: 'es' });
    expect(informe.osdr).toBeNull();
  });

  it('omite OSDR si verificado es true pero falta algún campo obligatorio o la fecha es inválida', () => {
    const incompleto = {
      titulo: 'Crecimiento vegetal en microgravedad',
      fuenteNombre: 'NASA OSDR',
      fuenteUrl: '',
      consultadoEn: '2026-09-01',
      textoNinos: { es: 'Texto ES', en: 'Text EN' },
      verificado: true,
    };
    expect(obtenerFuenteOsdrOpcional(incompleto)).toBeNull();
    expect(obtenerFuentesActivas(incompleto)).toEqual(FUENTES_DATOS);

    const fechaMala = {
      ...incompleto,
      fuenteUrl: 'https://osdr.nasa.gov/bio/',
      consultadoEn: 'no-es-fecha',
    };
    expect(obtenerFuenteOsdrOpcional(fechaMala)).toBeNull();
  });

  it('incluye OSDR en fuentes activas y en el informe solo cuando está completo y verificado === true', () => {
    const valido = {
      titulo: 'Plantas y radiación espacial (OSD-test)',
      fuenteNombre: 'NASA OSDR',
      fuenteUrl: 'https://osdr.nasa.gov/bio/repo/',
      consultadoEn: '2026-09-10',
      textoNinos: {
        es: 'Estudia cómo crecen las semillas cerca de radiación espacial.',
        en: 'Studies how seeds grow under space radiation.',
      },
      verificado: true,
    };

    const osdr = obtenerFuenteOsdrOpcional(valido);
    expect(osdr).not.toBeNull();
    expect(osdr?.titulo).toBe(valido.titulo);

    const activas = obtenerFuentesActivas(valido);
    expect(activas.length).toBe(FUENTES_DATOS.length + 1);
    expect(activas.some((f) => f.id === 'nasa-osdr')).toBe(true);

    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');
    const informe = generarInformeFinal(gm.getSnapshot(), {
      idioma: 'es',
      osdrRaw: valido,
    });
    expect(informe.osdr).toEqual(valido);
  });
});
