import { afterEach, describe, expect, it } from 'vitest';
import { DISTANCIA_TUTORIAL, DURACION_JORNADA } from '../src/game/balance';
import { getAjustes, resetAjustes } from '../src/game/settings';
import { GameStateManager } from '../src/game/state';
import {
  debeIniciarTutorial,
  PASOS_TUTORIAL,
  TutorialManager,
} from '../src/game/tutorial';

describe('Tutorial interactivo de 7 pasos en Jornada 1', () => {
  afterEach(() => {
    resetAjustes();
  });

  it('se activa solo en Jornada 1 cuando tutorialVisto es false y modo no es demo', () => {
    expect(debeIniciarTutorial({ jornada: 1, modo: 'semana' }, { tutorialVisto: false })).toBe(
      true,
    );
    expect(debeIniciarTutorial({ jornada: 2, modo: 'semana' }, { tutorialVisto: false })).toBe(
      false,
    );
    expect(debeIniciarTutorial({ jornada: 1, modo: 'demo' }, { tutorialVisto: false })).toBe(
      false,
    );
    expect(debeIniciarTutorial({ jornada: 1, modo: 'semana' }, { tutorialVisto: true })).toBe(
      false,
    );
  });

  it('recorre los 7 pasos en orden, pausa el reloj solo en pasos 1/6/7 y permanece en paso 5 ante salida o fallo', () => {
    const motor = new GameStateManager();
    const mgr = new TutorialManager();
    const off = mgr.conectarMotor(motor, getAjustes());

    expect(PASOS_TUTORIAL.map((p) => p.id)).toEqual([
      'objetivo',
      'moverse',
      'ir_estacion',
      'usar',
      'minijuego',
      'elegir',
      'cierre',
    ]);

    // Paso 1: objetivo (pausa reloj)
    expect(mgr.obtenerPasoActual()?.id).toBe('objetivo');
    expect(mgr.estaPausandoReloj()).toBe(true);
    mgr.confirmarEntendido();

    // Paso 2: moverse (no pausa)
    expect(mgr.obtenerPasoActual()?.id).toBe('moverse');
    expect(mgr.estaPausandoReloj()).toBe(false);
    mgr.registrarMovimiento(DISTANCIA_TUTORIAL - 10);
    expect(mgr.obtenerPasoActual()?.id).toBe('moverse');
    mgr.registrarMovimiento(10);

    // Paso 3: ir_estacion (no pausa)
    expect(mgr.obtenerPasoActual()?.id).toBe('ir_estacion');
    expect(mgr.estaPausandoReloj()).toBe(false);
    mgr.registrarProximidadEstacion('invernadero', true);
    expect(mgr.obtenerPasoActual()?.id).toBe('ir_estacion');
    mgr.registrarProximidadEstacion('energia', true);

    // Paso 4: usar (no pausa)
    expect(mgr.obtenerPasoActual()?.id).toBe('usar');
    expect(mgr.estaPausandoReloj()).toBe(false);

    // Abre minijuego -> Paso 5: minijuego (no pausa)
    motor.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    expect(mgr.obtenerPasoActual()?.id).toBe('minijuego');
    expect(mgr.estaPausandoReloj()).toBe(false);

    // Si sale o falla, se mantiene en paso 5
    motor.finalizarMinijuego('salida', 'energia', 'j1_energia');
    expect(mgr.obtenerPasoActual()?.id).toBe('minijuego');

    motor.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    motor.finalizarMinijuego('fallo', 'energia', 'j1_energia');
    expect(mgr.obtenerPasoActual()?.id).toBe('minijuego');

    // Al completar, pasa al paso 6: elegir (pausa reloj)
    motor.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    motor.finalizarMinijuego('exito', 'energia', 'j1_energia');
    expect(mgr.obtenerPasoActual()?.id).toBe('elegir');
    expect(mgr.estaPausandoReloj()).toBe(true);

    // Confirmar elección oculta el tutorial sin pausar el reloj hasta fin de jornada
    motor.aplicarEleccion('envio_energia', 'mandar_aire', 'j1_energia');
    expect(mgr.getSnapshot().fase).toBe('esperando_cierre');
    expect(mgr.getSnapshot().visible).toBe(false);
    expect(mgr.estaPausandoReloj()).toBe(false);

    // Al cerrar Jornada 1 aparece paso 7: cierre (pausa reloj)
    motor.tick(DURACION_JORNADA);
    expect(mgr.obtenerPasoActual()?.id).toBe('cierre');
    expect(mgr.getSnapshot().visible).toBe(true);
    expect(mgr.estaPausandoReloj()).toBe(true);

    // Entendido completa el tutorial y persiste tutorialVisto: true
    mgr.confirmarEntendido();
    expect(mgr.getSnapshot().fase).toBe('completado');
    expect(mgr.estaPausandoReloj()).toBe(false);
    expect(getAjustes().tutorialVisto).toBe(true);

    // No vuelve a activarse en un nuevo reinicio si ya fue visto
    motor.reset();
    expect(mgr.getSnapshot().visible).toBe(false);

    off();
  });

  it('saltar tutorial desde cualquier paso lo marca como completado y persiste tutorialVisto', () => {
    const motor = new GameStateManager();
    const mgr = new TutorialManager();
    const off = mgr.conectarMotor(motor, getAjustes());

    expect(mgr.obtenerPasoActual()?.id).toBe('objetivo');
    mgr.saltar();

    expect(mgr.getSnapshot().fase).toBe('completado');
    expect(mgr.getSnapshot().visible).toBe(false);
    expect(mgr.estaPausandoReloj()).toBe(false);
    expect(getAjustes().tutorialVisto).toBe(true);

    off();
  });
});
