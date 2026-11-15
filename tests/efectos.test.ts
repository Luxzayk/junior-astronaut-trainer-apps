import { describe, expect, it } from 'vitest';
import { calcularParticulasChispas } from '../src/fx/cierres';
import {
  evaluarEfectosActivos,
  limitarParticulas,
} from '../src/fx/efectos';
import { FX_MAX_PARTICULAS } from '../src/game/balance';

describe('Evaluación de efectos por estado de recursos', () => {
  it('evalúa umbrales inclusivos exactos de Aire (36, 35, 16, 15, 14)', () => {
    const en36 = evaluarEfectosActivos(
      { aire: 36, energia: 80, escudo: 80 },
      false,
      false,
    );
    expect(en36.nivelAire).toBe('normal');
    expect(en36.veloAire).toBe(false);
    expect(en36.pulsoAire).toBe(false);

    const en35 = evaluarEfectosActivos(
      { aire: 35, energia: 80, escudo: 80 },
      false,
      false,
    );
    expect(en35.nivelAire).toBe('bajo');
    expect(en35.veloAire).toBe(true);
    expect(en35.pulsoAire).toBe(false);

    const en16 = evaluarEfectosActivos(
      { aire: 16, energia: 80, escudo: 80 },
      false,
      false,
    );
    expect(en16.nivelAire).toBe('bajo');
    expect(en16.pulsoAire).toBe(false);

    const en15 = evaluarEfectosActivos(
      { aire: 15, energia: 80, escudo: 80 },
      false,
      false,
    );
    expect(en15.nivelAire).toBe('critico');
    expect(en15.veloAire).toBe(true);
    expect(en15.pulsoAire).toBe(true);
    expect(en15.periodoPulsoAireMs).toBeGreaterThanOrEqual(1200);

    const en14 = evaluarEfectosActivos(
      { aire: 14, energia: 80, escudo: 80 },
      false,
      false,
    );
    expect(en14.nivelAire).toBe('critico');
    expect(en14.pulsoAire).toBe(true);
  });

  it('evalúa umbrales inclusivos exactos de Energía (36, 35, 15, 14)', () => {
    const en36 = evaluarEfectosActivos(
      { aire: 80, energia: 36, escudo: 80 },
      false,
      false,
    );
    expect(en36.atenuacionEnergia).toBe(false);
    expect(en36.oscurecimientoEnergia).toBe(false);
    expect(en36.parpadeoEnergia).toBe(false);

    const en35 = evaluarEfectosActivos(
      { aire: 80, energia: 35, escudo: 80 },
      false,
      false,
    );
    expect(en35.atenuacionEnergia).toBe(true);
    expect(en35.oscurecimientoEnergia).toBe(false);
    expect(en35.parpadeoEnergia).toBe(true);
    expect(en35.periodoParpadeoEnergiaMs).toBeGreaterThanOrEqual(1000);

    const en15 = evaluarEfectosActivos(
      { aire: 80, energia: 15, escudo: 80 },
      false,
      false,
    );
    expect(en15.nivelEnergia).toBe('critico');
    expect(en15.oscurecimientoEnergia).toBe(true);

    const en14 = evaluarEfectosActivos(
      { aire: 80, energia: 14, escudo: 80 },
      false,
      false,
    );
    expect(en14.nivelEnergia).toBe('critico');
    expect(en14.oscurecimientoEnergia).toBe(true);
  });

  it('activa efectos de Escudo solo durante evento de clima espacial y limita temblor <= 250 ms', () => {
    const fueraDeEvento = evaluarEfectosActivos(
      { aire: 80, energia: 80, escudo: 14 },
      false,
      false,
    );
    expect(fueraDeEvento.rayasEscudo).toBe(false);
    expect(fueraDeEvento.estaticaEscudo).toBe(false);
    expect(fueraDeEvento.temblorEscudo).toBe(false);
    expect(fueraDeEvento.maxParticulas).toBe(0);

    const enEvento36 = evaluarEfectosActivos(
      { aire: 80, energia: 80, escudo: 36 },
      true,
      false,
    );
    expect(enEvento36.rayasEscudo).toBe(false);

    const enEvento35 = evaluarEfectosActivos(
      { aire: 80, energia: 80, escudo: 35 },
      true,
      false,
    );
    expect(enEvento35.rayasEscudo).toBe(true);
    expect(enEvento35.estaticaEscudo).toBe(false);
    expect(enEvento35.maxParticulas).toBeGreaterThan(0);
    expect(enEvento35.maxParticulas).toBeLessThanOrEqual(FX_MAX_PARTICULAS);

    const enEvento15 = evaluarEfectosActivos(
      { aire: 80, energia: 80, escudo: 15 },
      true,
      false,
    );
    expect(enEvento15.rayasEscudo).toBe(true);
    expect(enEvento15.estaticaEscudo).toBe(true);
    expect(enEvento15.temblorEscudo).toBe(true);
    expect(enEvento15.duracionTemblorMs).toBeLessThanOrEqual(250);
  });

  it('con movimientoReducido desactiva pulsos, parpadeos, temblor y partículas y activa bordes estáticos + "!"', () => {
    const criticoReducido = evaluarEfectosActivos(
      { aire: 14, energia: 14, escudo: 14 },
      true,
      true,
    );

    expect(criticoReducido.pulsoAire).toBe(false);
    expect(criticoReducido.parpadeoEnergia).toBe(false);
    expect(criticoReducido.rayasEscudo).toBe(false);
    expect(criticoReducido.temblorEscudo).toBe(false);
    expect(criticoReducido.maxParticulas).toBe(0);

    // Mantiene capas estáticas informativas + bordes gruesos e indicador "!"
    expect(criticoReducido.veloAire).toBe(true);
    expect(criticoReducido.oscurecimientoEnergia).toBe(true);
    expect(criticoReducido.estaticaEscudo).toBe(true);
    expect(criticoReducido.bordeEstaticoAire).toBe(true);
    expect(criticoReducido.bordeEstaticoEnergia).toBe(true);
    expect(criticoReducido.bordeEstaticoEscudo).toBe(true);
    expect(criticoReducido.indicadorAlerta).toBe(true);
  });

  it('respeta el tope máximo de 60 partículas en efectos y cierres', () => {
    expect(FX_MAX_PARTICULAS).toBe(60);
    expect(limitarParticulas(120)).toBe(60);
    expect(limitarParticulas(25)).toBe(25);
    expect(limitarParticulas(-5)).toBe(0);

    expect(calcularParticulasChispas(false)).toBeGreaterThan(0);
    expect(calcularParticulasChispas(false)).toBeLessThanOrEqual(60);
    expect(calcularParticulasChispas(true)).toBe(0);
  });
});
