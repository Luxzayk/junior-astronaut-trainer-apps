import { describe, expect, it } from 'vitest';
import { TILE } from '../src/config';
import { VELOCIDAD_JUGADOR } from '../src/game/balance';
import { ESTACIONES, isWalkable, obtenerSalaEnTile } from '../src/game/map';
import { encontrarCamino } from '../src/game/pathfinding';

describe('Pathfinding BFS (pathfinding.ts)', () => {
  it('encuentra camino de Energía a Invernadero pasando por el Lobby', () => {
    const energia = ESTACIONES.find((e) => e.id === 'energia');
    const invernadero = ESTACIONES.find((e) => e.id === 'invernadero');

    expect(energia).toBeDefined();
    expect(invernadero).toBeDefined();
    if (!energia || !invernadero) return;

    const camino = encontrarCamino(energia.tile, invernadero.tile);

    expect(camino.length).toBeGreaterThan(2);
    expect(camino[0]).toEqual(energia.tile);
    expect(camino[camino.length - 1]).toEqual(invernadero.tile);

    const pasaPorLobby = camino.some(
      (paso) => obtenerSalaEnTile(paso.col, paso.fila)?.id === 'lobby',
    );
    expect(pasaPorLobby).toBe(true);

    // Verifica que el trayecto entre Energía e Invernadero toma entre 4 y 8 segundos
    const pasos = camino.length - 1;
    const distanciaPx = pasos * TILE;
    const duracionSeg = distanciaPx / VELOCIDAD_JUGADOR;
    expect(duracionSeg).toBeGreaterThanOrEqual(4);
    expect(duracionSeg).toBeLessThanOrEqual(8);
  });

  it('no atraviesa tiles de vacío o pared (#)', () => {
    const refugio = ESTACIONES.find((e) => e.id === 'refugio');
    const tanque = ESTACIONES.find((e) => e.id === 'tanque');

    expect(refugio).toBeDefined();
    expect(tanque).toBeDefined();
    if (!refugio || !tanque) return;

    const camino = encontrarCamino(refugio.tile, tanque.tile);
    expect(camino.length).toBeGreaterThan(0);

    for (const paso of camino) {
      expect(isWalkable(paso.col, paso.fila)).toBe(true);
    }
  });

  it('devuelve un arreglo vacío si el destino es inalcanzable', () => {
    // Caso 1: destino sobre pared/vacío
    const caminoPared = encontrarCamino({ col: 9, fila: 5 }, { col: 0, fila: 0 });
    expect(caminoPared).toEqual([]);

    // Caso 2: destino caminable pero aislado en mapa personalizado
    const mapaAislado = [
      '.....',
      '#####',
      '.....',
    ];
    const esCaminableAislado = (col: number, fila: number): boolean =>
      mapaAislado[fila]?.[col] === '.';

    const caminoAislado = encontrarCamino(
      { col: 0, fila: 0 },
      { col: 4, fila: 2 },
      esCaminableAislado,
    );
    expect(caminoAislado).toEqual([]);
  });
});
