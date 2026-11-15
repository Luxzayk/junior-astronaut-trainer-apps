import { describe, expect, it } from 'vitest';
import {
  ESCUDO_CONSUMO_BASE,
  ESCUDO_CONSUMO_POR_PANEL,
} from '../src/game/balance';
import {
  alineados,
  calcularConsumoEnergia,
  generarNivel,
  proteccion,
  resultado,
  rotarPanel,
  tick,
} from '../src/minigames/escudo';

describe('Minijuego Escudo (escudo.ts)', () => {
  it('nunca empieza alineado y siempre tiene solución', () => {
    for (const pasos of [4, 5]) {
      for (let semilla = 1; semilla <= 10; semilla++) {
        let nivel = generarNivel(pasos, semilla);
        expect(nivel.paneles).toHaveLength(pasos);
        expect(alineados(nivel)).toBe(0);
        expect(proteccion(nivel)).toBe(0);
        expect(resultado(nivel)).toBe('jugando');

        for (const panel of nivel.paneles) {
          let guard = 0;
          while (
            nivel.paneles.find((p) => p.id === panel.id)?.direccion !==
              nivel.objetivo &&
            guard < 4
          ) {
            nivel = rotarPanel(nivel, panel.id);
            guard += 1;
          }
        }

        expect(alineados(nivel)).toBe(pasos);
        expect(proteccion(nivel)).toBe(100);
        expect(resultado(nivel)).toBe('exito');
      }
    }
  });

  it('rotarPanel gira 90 grados y calcula alineados y protección con precisión', () => {
    let nivel = generarNivel(4, 12);
    expect(alineados(nivel)).toBe(0);
    expect(proteccion(nivel)).toBe(0);

    // Alinear panel 0
    while (nivel.paneles[0].direccion !== nivel.objetivo) {
      nivel = rotarPanel(nivel, 0);
    }
    expect(alineados(nivel)).toBe(1);
    expect(proteccion(nivel)).toBe(25);

    // Alinear panel 1
    while (nivel.paneles[1].direccion !== nivel.objetivo) {
      nivel = rotarPanel(nivel, 1);
    }
    expect(alineados(nivel)).toBe(2);
    expect(proteccion(nivel)).toBe(50);

    // Rotar id inexistente mantiene estado
    const igual = rotarPanel(nivel, 99);
    expect(igual).toBe(nivel);
  });

  it('el consumo de energía crece con los paneles alineados', () => {
    let nivel = generarNivel(5, 9);
    const consumos: number[] = [calcularConsumoEnergia(nivel)];
    expect(consumos[0]).toBe(ESCUDO_CONSUMO_BASE);

    for (let i = 0; i < nivel.paneles.length; i++) {
      while (nivel.paneles[i].direccion !== nivel.objetivo) {
        nivel = rotarPanel(nivel, i);
      }
      const c = calcularConsumoEnergia(nivel);
      expect(c).toBe(ESCUDO_CONSUMO_BASE + (i + 1) * ESCUDO_CONSUMO_POR_PANEL);
      expect(c).toBeGreaterThan(consumos[consumos.length - 1]);
      consumos.push(c);
    }
  });

  it('falla cuando se agota el tiempo restante', () => {
    let nivel = generarNivel(4, 4, 15);
    nivel = tick(nivel, 15);
    expect(nivel.tiempoRestante).toBe(0);
    expect(resultado(nivel)).toBe('fallo');
  });
});
