import { beforeEach, describe, expect, it } from 'vitest';
import {
  COSTO_INTENTO_MINIJUEGO,
  COSTO_INTENTO_NODOS,
  ELECCIONES,
  MAX_JORNADAS,
} from '../src/game/balance';
import {
  contarMisionesJornada,
  formatearSignoValor,
  obtenerCostoIntento,
  obtenerMisionActivaParaEstacion,
  obtenerMisionesDeJornada,
  obtenerOpcionesPorTipoEleccion,
  obtenerSiguienteMisionPendiente,
} from '../src/game/missions';
import { gameState } from '../src/game/state';

describe('Sistema de misiones de 5 jornadas y elecciones por estación', () => {
  beforeEach(() => {
    gameState.reset();
  });

  it('define misiones jugables para las 5 jornadas con minijuegos y elecciones esperados', () => {
    for (let j = 1; j <= MAX_JORNADAS; j++) {
      const misiones = obtenerMisionesDeJornada(j);
      expect(misiones.length).toBeGreaterThan(0);
    }

    expect(obtenerMisionesDeJornada(1).map((m) => m.minijuego)).toEqual([
      'nodos',
      'escudo',
    ]);
    expect(obtenerMisionesDeJornada(2).map((m) => m.minijuego)).toEqual(['valvulas']);
    expect(obtenerMisionesDeJornada(3).map((m) => m.minijuego)).toEqual([
      'nodos',
      'escudo',
    ]);
    expect(obtenerMisionesDeJornada(4).map((m) => m.minijuego)).toEqual([
      'nodos',
      'valvulas',
      'valvulas',
    ]);
    expect(obtenerMisionesDeJornada(4).map((m) => m.id)).toContain('j4_tanque');
    expect(contarMisionesJornada(4, [])).toEqual({ completadas: 0, total: 2 });
    expect(obtenerMisionesDeJornada(5).map((m) => m.minijuego)).toEqual([
      'valvulas',
      'escudo',
    ]);
    expect(obtenerMisionesDeJornada(99)).toEqual([]);
  });

  it('encuentra misiones pendientes por estación y calcula conteos', () => {
    const activaJ1 = obtenerMisionActivaParaEstacion(1, 'energia', []);
    expect(activaJ1?.id).toBe('j1_energia');
    expect(obtenerMisionActivaParaEstacion(1, 'escudos', [])?.id).toBe(
      'j1_escudos',
    );
    expect(obtenerMisionActivaParaEstacion(1, 'invernadero', [])).toBeNull();
    expect(contarMisionesJornada(1, [])).toEqual({ completadas: 0, total: 2 });

    const siguientePendiente = obtenerSiguienteMisionPendiente(1, []);
    expect(siguientePendiente?.id).toBe('j1_energia');

    expect(
      obtenerMisionActivaParaEstacion(1, 'energia', ['j1_energia']),
    ).toBeNull();
    expect(contarMisionesJornada(1, ['j1_energia'])).toEqual({
      completadas: 1,
      total: 2,
    });
    expect(contarMisionesJornada(1, ['j1_energia', 'j1_escudos'])).toEqual({
      completadas: 2,
      total: 2,
    });
  });

  it('expone costos visibles para los 3 minijuegos y opciones para los 3 tipos de elección', () => {
    expect(obtenerCostoIntento('nodos')).toEqual(COSTO_INTENTO_NODOS);
    expect(obtenerCostoIntento('valvulas')).toEqual(COSTO_INTENTO_MINIJUEGO.valvulas);
    expect(obtenerCostoIntento('escudo')).toEqual(COSTO_INTENTO_MINIJUEGO.escudo);
    expect(obtenerCostoIntento('proximamente')).toEqual({});

    expect(obtenerOpcionesPorTipoEleccion('envio_energia').map((o) => o.titulo)).toEqual([
      'Mandar al Aire',
      'Mandar al Escudo',
    ]);
    expect(obtenerOpcionesPorTipoEleccion('invernadero').map((o) => o.titulo)).toEqual([
      'Plena luz',
      'Modo ahorro',
    ]);
    expect(obtenerOpcionesPorTipoEleccion('escudo_potencia').map((o) => o.titulo)).toEqual([
      'Potencia alta',
      'Potencia baja',
    ]);

    expect(formatearSignoValor(24)).toEqual({ signo: '+', valorAbs: 24 });
    expect(formatearSignoValor(-5)).toEqual({ signo: '-', valorAbs: 5 });
  });

  it('aplica costo de intento y permite salir de minijuego sin completar la misión', () => {
    const energiaAntes = gameState.getSnapshot().energia;
    gameState.iniciarMinijuego('energia', 'j1_energia', 'nodos', {
      pasos: 12,
      tiempoLimite: 60,
    });
    const enMinijuego = gameState.getSnapshot();
    expect(enMinijuego.estado).toBe('minijuego');
    expect(enMinijuego.energia).toBe(
      energiaAntes + COSTO_INTENTO_NODOS.energia,
    );

    gameState.finalizarMinijuego('salida', 'energia', 'j1_energia');
    const trasSalir = gameState.getSnapshot();
    expect(trasSalir.estado).toBe('jugando');
    expect(trasSalir.misionesHechas).toEqual([]);
  });

  it('transiciona de minijuego completado a ChoiceScene en los 3 tipos de elección', () => {
    gameState.cambiarRecurso('aire', -30);
    const aireAntesJ1 = gameState.getSnapshot().aire;
    gameState.iniciarMinijuego('energia', 'j1_energia', 'nodos', {
      pasos: 12,
      tiempoLimite: 60,
    });
    gameState.finalizarMinijuego('exito', 'energia', 'j1_energia');

    expect(gameState.getSnapshot().estado).toBe('eleccion');

    const energiaAntes = gameState.getSnapshot().energia;
    gameState.aplicarEleccion('envio_energia', 'mandarAire', 'j1_energia');

    const despuesJ1 = gameState.getSnapshot();
    expect(despuesJ1.estado).toBe('jugando');
    expect(despuesJ1.misionesHechas).toContain('j1_energia');
    expect(despuesJ1.aire).toBe(
      aireAntesJ1 + ELECCIONES.envio_energia.mandarAire.aire,
    );
    expect(despuesJ1.energia).toBe(
      energiaAntes + ELECCIONES.envio_energia.mandarAire.energia,
    );

    // Jornada 3: elección de Escudo
    gameState.irAJornadaDebug(3);
    gameState.cambiarRecurso('escudo', -30);
    const escudoAntesJ3 = gameState.getSnapshot().escudo;
    gameState.iniciarMinijuego('escudos', 'j3_escudos', 'escudo', {
      pasos: 3,
      tiempoLimite: 35,
    });
    gameState.finalizarMinijuego('exito', 'escudos', 'j3_escudos');
    expect(gameState.getSnapshot().estado).toBe('eleccion');

    gameState.aplicarEleccion('escudo_potencia', 'potenciaAlta', 'j3_escudos');
    const despuesJ3 = gameState.getSnapshot();
    expect(despuesJ3.misionesHechas).toContain('j3_escudos');
    expect(despuesJ3.escudo).toBe(
      escudoAntesJ3 + ELECCIONES.escudo_potencia.potenciaAlta.escudo,
    );
  });
});
