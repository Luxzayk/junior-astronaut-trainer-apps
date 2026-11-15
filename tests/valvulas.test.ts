import { describe, expect, it } from 'vitest';
import {
  MEDIDOR_BAJA_ACIERTO,
  MEDIDOR_SUBE_ERROR,
  MEDIDOR_SUBE_POR_SEG,
  VALVULAS_MEDIDOR_INICIAL,
  VALVULAS_MEDIDOR_MAX,
} from '../src/game/balance';
import {
  generarNivel,
  pulsarValvula,
  resultado,
  tick,
} from '../src/minigames/valvulas';

describe('Minijuego Válvulas (valvulas.ts)', () => {
  it('siempre tiene solución y nunca empieza resuelto ni en orden trivial', () => {
    for (let pasos = 3; pasos <= 5; pasos++) {
      for (let semilla = 1; semilla <= 10; semilla++) {
        let estado = generarNivel(pasos, semilla);
        expect(estado.valvulas).toHaveLength(pasos);
        expect(resultado(estado)).toBe('jugando');
        expect(estado.valvulas.every((v) => !v.cerrada)).toBe(true);
        expect(estado.medidor).toBe(VALVULAS_MEDIDOR_INICIAL);

        const idsVisuales = estado.valvulas.map((v) => v.id);
        const esTrivial = idsVisuales.every((id, idx) => id === idx + 1);
        expect(esTrivial).toBe(false);

        for (let id = 1; id <= pasos; id++) {
          estado = pulsarValvula(estado, id);
        }
        expect(resultado(estado)).toBe('exito');
      }
    }
  });

  it('cierra la válvula en orden correcto y baja el medidor', () => {
    const inicial = generarNivel(4, 7);
    const trasAcierto = pulsarValvula(inicial, 1);

    expect(trasAcierto.siguienteId).toBe(2);
    expect(trasAcierto.valvulas.find((v) => v.id === 1)?.cerrada).toBe(true);
    expect(trasAcierto.medidor).toBe(
      VALVULAS_MEDIDOR_INICIAL - MEDIDOR_BAJA_ACIERTO,
    );
    expect(trasAcierto.ultimoErrorId).toBeNull();
    expect(trasAcierto.ultimoAciertoId).toBe(1);
  });

  it('mantiene abierta la válvula en orden incorrecto y sube el medidor', () => {
    const inicial = generarNivel(4, 7);
    const trasError = pulsarValvula(inicial, 3);

    expect(trasError.siguienteId).toBe(1);
    expect(trasError.valvulas.find((v) => v.id === 3)?.cerrada).toBe(false);
    expect(trasError.medidor).toBe(
      VALVULAS_MEDIDOR_INICIAL + MEDIDOR_SUBE_ERROR,
    );
    expect(trasError.ultimoErrorId).toBe(3);
  });

  it('falla cuando el medidor llega a 100', () => {
    let estado = generarNivel(4, 3, 120);
    // Subir por errores repetidos hasta llegar a 100
    for (let i = 0; i < 4; i++) {
      estado = pulsarValvula(estado, 2);
    }
    expect(estado.medidor).toBe(VALVULAS_MEDIDOR_MAX);
    expect(resultado(estado)).toBe('fallo');

    // También sube por segundo con tick hasta llegar a 100
    let porTiempo = generarNivel(4, 3, 120);
    porTiempo = tick(porTiempo, 28);
    expect(porTiempo.medidor).toBeCloseTo(
      Math.min(100, VALVULAS_MEDIDOR_INICIAL + MEDIDOR_SUBE_POR_SEG * 28),
      5,
    );
    expect(resultado(porTiempo)).toBe('fallo');
  });

  it('falla cuando el tiempo límite se agota', () => {
    let estado = generarNivel(4, 5, 10);
    estado = tick(estado, 10);
    expect(estado.tiempoRestante).toBe(0);
    expect(resultado(estado)).toBe('fallo');
  });
});
