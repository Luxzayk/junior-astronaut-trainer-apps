import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DRENAJE_BASE_POR_SEG,
  DURACION_JORNADA,
  MULT_DRENAJE_POR_JORNADA,
  RECURSOS_INICIALES,
} from '../src/game/balance';
import { gameState } from '../src/game/state';

describe('GameStateManager (state.ts)', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('mantiene todos los recursos siempre entre 0 y 100', () => {
    gameState.cambiarRecurso('energia', 500);
    expect(gameState.getSnapshot().energia).toBe(100);

    gameState.cambiarRecurso('energia', -500);
    expect(gameState.getSnapshot().energia).toBe(0);

    gameState.cambiarRecurso('escudo', 120);
    expect(gameState.getSnapshot().escudo).toBe(100);

    gameState.cambiarRecurso('aire', -200);
    expect(gameState.getSnapshot().aire).toBe(0);
  });

  it('aplica el multiplicador de drenaje correspondiente a la jornada', () => {
    const dt = 10;
    const multJ1 = MULT_DRENAJE_POR_JORNADA[0];
    gameState.tick(dt);

    const snapJ1 = gameState.getSnapshot();
    expect(snapJ1.aire).toBeCloseTo(
      RECURSOS_INICIALES.aire - DRENAJE_BASE_POR_SEG.aire * multJ1 * dt,
      5,
    );
    expect(snapJ1.energia).toBeCloseTo(
      RECURSOS_INICIALES.energia - DRENAJE_BASE_POR_SEG.energia * multJ1 * dt,
      5,
    );
    expect(snapJ1.escudo).toBeCloseTo(
      RECURSOS_INICIALES.escudo - DRENAJE_BASE_POR_SEG.escudo * multJ1 * dt,
      5,
    );

    // Pasar a jornada 3 (índice 2 -> multiplicador 1.00)
    gameState.siguienteJornada();
    gameState.siguienteJornada();
    const aireAntesJ3 = gameState.getSnapshot().aire;
    const multJ3 = MULT_DRENAJE_POR_JORNADA[2];

    gameState.tick(dt);
    const snapJ3 = gameState.getSnapshot();
    expect(snapJ3.jornada).toBe(3);
    expect(snapJ3.aire).toBeCloseTo(
      aireAntesJ3 - DRENAJE_BASE_POR_SEG.aire * multJ3 * dt,
      5,
    );
  });

  it('dispara evacuación y evento al llegar aire a 0', () => {
    const alEvacuar = vi.fn();
    const desuscribir = gameState.on('evacuacion', alEvacuar);

    gameState.cambiarRecurso('aire', -99);
    expect(gameState.getSnapshot().estado).toBe('jugando');

    gameState.tick(10);
    const snap = gameState.getSnapshot();

    expect(snap.aire).toBe(0);
    expect(snap.estado).toBe('evacuacion');
    expect(alEvacuar).toHaveBeenCalledTimes(1);

    desuscribir();
  });

  it('dispara finJornada y evento al alcanzar DURACION_JORNADA', () => {
    const alTerminar = vi.fn();
    const desuscribir = gameState.on('jornada:fin', alTerminar);

    // Subir aire periódicamente para llegar al final de la jornada sin evacuar
    for (let i = 0; i < 18; i++) {
      gameState.cambiarRecurso('aire', 50);
      gameState.tick(10);
    }

    const snap = gameState.getSnapshot();
    expect(snap.segundos).toBe(DURACION_JORNADA);
    expect(snap.estado).toBe('finJornada');
    expect(alTerminar).toHaveBeenCalledTimes(1);

    desuscribir();
  });

  it('conserva los recursos al pasar a la siguiente jornada y reinicia segundos', () => {
    gameState.tick(10);
    const antes = gameState.getSnapshot();

    gameState.siguienteJornada();
    const despues = gameState.getSnapshot();

    expect(despues.jornada).toBe(2);
    expect(despues.segundos).toBe(0);
    expect(despues.aire).toBeCloseTo(antes.aire, 6);
    expect(despues.energia).toBeCloseTo(antes.energia, 6);
    expect(despues.escudo).toBeCloseTo(antes.escudo, 6);
    expect(despues.estado).toBe('jugando');
  });

  it('no avanza ni drena recursos durante tick cuando está en pausa', () => {
    gameState.tick(5);
    const antesPausa = gameState.getSnapshot();

    gameState.setPausa(true);
    gameState.tick(20);
    const durantePausa = gameState.getSnapshot();

    expect(durantePausa.pausado).toBe(true);
    expect(durantePausa.estado).toBe('pausa');
    expect(durantePausa.segundos).toBe(antesPausa.segundos);
    expect(durantePausa.aire).toBe(antesPausa.aire);
    expect(durantePausa.energia).toBe(antesPausa.energia);
    expect(durantePausa.escudo).toBe(antesPausa.escudo);
  });

  it('restaura todos los valores iniciales al llamar reset()', () => {
    gameState.tick(15);
    gameState.siguienteJornada();
    gameState.cambiarRecurso('aire', -100);

    expect(gameState.getSnapshot().estado).toBe('evacuacion');

    gameState.reset();
    const reiniciado = gameState.getSnapshot();

    expect(reiniciado.jornada).toBe(1);
    expect(reiniciado.segundos).toBe(0);
    expect(reiniciado.aire).toBe(RECURSOS_INICIALES.aire);
    expect(reiniciado.energia).toBe(RECURSOS_INICIALES.energia);
    expect(reiniciado.escudo).toBe(RECURSOS_INICIALES.escudo);
    expect(reiniciado.misionesHechas).toEqual([]);
    expect(reiniciado.pausado).toBe(false);
    expect(reiniciado.estado).toBe('jugando');
  });
});
