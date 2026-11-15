import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DRENAJE_BASE_POR_SEG,
  DURACION_JORNADA,
  MULT_DRENAJE_POR_JORNADA,
  RECURSOS_INICIALES,
  SEGUNDO_EVENTO_CLIMA,
  SEGUNDO_EVENTO_FUGA,
  VENTANA_FUGA,
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

  it('avanza el reloj y drena recursos durante un minijuego y difiere eventos popup hasta volver a jugando', () => {
    // Jornada 3 tiene evento 'clima' en SEGUNDO_EVENTO_CLIMA (90s)
    gameState.siguienteJornada();
    gameState.siguienteJornada();
    const alAbrirEvento = vi.fn();
    const desuscribir = gameState.on('evento:abrir', alAbrirEvento);

    gameState.iniciarMinijuego('energia', 'j3_energia', 'nodos');
    expect(gameState.getSnapshot().estado).toBe('minijuego');

    const aireAntes = gameState.getSnapshot().aire;
    gameState.tick(SEGUNDO_EVENTO_CLIMA + 2);

    const durante = gameState.getSnapshot();
    expect(durante.segundos).toBe(SEGUNDO_EVENTO_CLIMA + 2);
    expect(durante.aire).toBeLessThan(aireAntes);
    expect(durante.estado).toBe('minijuego');
    expect(alAbrirEvento).not.toHaveBeenCalled();

    // Al salir del minijuego vuelve a 'jugando' y en el siguiente tick dispara el evento diferido
    gameState.finalizarMinijuego('salida', 'energia', 'j3_energia');
    expect(gameState.getSnapshot().estado).toBe('jugando');

    gameState.tick(0.5);
    expect(gameState.getSnapshot().estado).toBe('evento');
    expect(alAbrirEvento).toHaveBeenCalledTimes(1);

    desuscribir();
  });

  it('evacua durante un minijuego si el aire llega a 0 y no abre elección fantasma si la fuga expiró dentro del minijuego', () => {
    // 1. Evacuación durante minijuego
    gameState.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    gameState.cambiarRecurso('aire', -99);
    gameState.tick(10);
    expect(gameState.getSnapshot().aire).toBe(0);
    expect(gameState.getSnapshot().estado).toBe('evacuacion');

    // 2. Expiración de fuga urgente durante minijuego sin abrir elección fantasma
    gameState.reset();
    gameState.siguienteJornada(); // Jornada 2
    gameState.tick(SEGUNDO_EVENTO_FUGA);
    expect(gameState.getSnapshot().misionUrgente?.mision.id).toBe(
      'j2_fuga_tanque',
    );

    gameState.iniciarMinijuego('tanque', 'j2_fuga_tanque', 'valvulas');
    gameState.tick(VENTANA_FUGA + 2); // expira la ventana durante el minijuego

    expect(gameState.getSnapshot().misionUrgente).toBeNull();
    expect(gameState.getSnapshot().misionesPerdidas).toContain(
      'j2_fuga_tanque',
    );

    gameState.finalizarMinijuego('exito', 'tanque', 'j2_fuga_tanque');
    expect(gameState.getSnapshot().estado).toBe('jugando');
  });
});
