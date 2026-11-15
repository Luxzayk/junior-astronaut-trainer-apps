import { describe, expect, it } from 'vitest';
import {
  MotorAudio,
  type ContextoAudioMinimo,
  type NodoGananciaAudio,
  type NodoOsciladorAudio,
  type ParametroAudio,
} from '../src/audio/audio';
import {
  calcularGananciaSuave,
  MAX_VOCES_SIMULTANEAS,
  MIN_ESPACIADO_ALERTA_MS,
  SONIDOS,
} from '../src/audio/sonidos';
import { GameStateManager } from '../src/game/state';

function crearParametroMock(inicial = 0): ParametroAudio {
  return {
    value: inicial,
    setValueAtTime: () => {},
    linearRampToValueAtTime: () => {},
  };
}

interface MockAudioResultado {
  contexto: ContextoAudioMinimo;
  osciladores: NodoOsciladorAudio[];
  ganancias: NodoGananciaAudio[];
  getResumeCalls: () => number;
}

function crearAudioContextMock(estadoInicial = 'running'): MockAudioResultado {
  const osciladores: NodoOsciladorAudio[] = [];
  const ganancias: NodoGananciaAudio[] = [];
  let resumeCalls = 0;

  const contexto: ContextoAudioMinimo = {
    currentTime: 1.0,
    state: estadoInicial,
    destination: {},
    resume: async () => {
      resumeCalls += 1;
    },
    createOscillator: () => {
      const osc: NodoOsciladorAudio = {
        type: 'sine',
        frequency: crearParametroMock(440),
        onended: null,
        connect: () => {},
        start: () => {},
        stop: () => {},
        disconnect: () => {},
      };
      osciladores.push(osc);
      return osc;
    },
    createGain: () => {
      const gain: NodoGananciaAudio = {
        gain: crearParametroMock(0),
        connect: () => {},
        disconnect: () => {},
      };
      ganancias.push(gain);
      return gain;
    },
  };

  return {
    contexto,
    osciladores,
    ganancias,
    getResumeCalls: () => resumeCalls,
  };
}

describe('Audio sintetizado con WebAudio (audio.ts y sonidos.ts)', () => {
  it('con sonido: false o sin gesto de usuario no crea ningún oscilador ni contexto', () => {
    const mock = crearAudioContextMock();
    let creacionesContexto = 0;
    let sonidoActivo = false;

    const motor = new MotorAudio({
      crearContexto: () => {
        creacionesContexto += 1;
        return mock.contexto;
      },
      ahoraMs: () => 1000,
      getAjustes: () => ({ sonido: sonidoActivo, volumen: 0.5 }),
    });

    // Con sonido: false incluso después de gesto
    motor.registrarGestoUsuario();
    // Si sonido está apagado, reproducir devuelve false y no crea osciladores
    expect(motor.reproducir('mision_ok')).toBe(false);
    expect(mock.osciladores.length).toBe(0);

    // Con sonido: true pero SIN gesto previo
    sonidoActivo = true;
    creacionesContexto = 0;
    const motorSinGesto = new MotorAudio({
      crearContexto: () => {
        creacionesContexto += 1;
        return mock.contexto;
      },
      ahoraMs: () => 1000,
      getAjustes: () => ({ sonido: true, volumen: 0.8 }),
    });
    expect(motorSinGesto.reproducir('clic')).toBe(false);
    expect(creacionesContexto).toBe(0);
    expect(mock.osciladores.length).toBe(0);

    // Tras gesto, ya suena
    motorSinGesto.registrarGestoUsuario();
    expect(creacionesContexto).toBe(1);
    expect(motorSinGesto.reproducir('clic')).toBe(true);
    expect(mock.osciladores.length).toBe(1);
  });

  it('respeta el tope de máximo 4 voces simultáneas', () => {
    const mock = crearAudioContextMock();
    let tiempoActual = 1000;

    const motor = new MotorAudio({
      crearContexto: () => mock.contexto,
      ahoraMs: () => tiempoActual,
      getAjustes: () => ({ sonido: true, volumen: 0.8 }),
    });

    motor.registrarGestoUsuario();

    // Cada alerta_barra consume 1 voz de ~130ms; usamos tipos distintos para no chocar con cooldown
    expect(motor.reproducir('clic')).toBe(true); // 1 voz
    expect(motor.reproducir('alerta_barra')).toBe(true); // 2 voces
    expect(motor.reproducir('mision_fallo')).toBe(true); // 3 voces
    expect(motor.reproducir('mision_ok')).toBe(true); // mision_ok tiene 3 notas -> solo cabe 1 más (total 4)

    expect(motor.obtenerVocesActivasCount()).toBe(MAX_VOCES_SIMULTANEAS);
    expect(mock.osciladores.length).toBe(MAX_VOCES_SIMULTANEAS);

    // Cualquier sonido adicional con las 4 voces activas es ignorado
    expect(motor.reproducir('evento_inicio')).toBe(false);
    expect(mock.osciladores.length).toBe(MAX_VOCES_SIMULTANEAS);

    // Cuando expira el tiempo de las voces o disparan onended, vuelve a permitir sonido
    tiempoActual += 500;
    expect(motor.obtenerVocesActivasCount()).toBe(0);
    expect(motor.reproducir('evento_inicio')).toBe(true);
    expect(mock.osciladores.length).toBe(4 + SONIDOS.evento_inicio.notas.length);
  });

  it('bloquea ráfagas de la misma alerta con menos de 150 ms de separación', () => {
    const mock = crearAudioContextMock();
    let tiempoActual = 2000;

    const motor = new MotorAudio({
      crearContexto: () => mock.contexto,
      ahoraMs: () => tiempoActual,
      getAjustes: () => ({ sonido: true, volumen: 0.5 }),
    });

    motor.registrarGestoUsuario();

    expect(motor.reproducir('alerta_barra')).toBe(true);
    expect(mock.osciladores.length).toBe(1);

    tiempoActual += MIN_ESPACIADO_ALERTA_MS - 1; // 149 ms -> bloqueado
    expect(motor.reproducir('alerta_barra')).toBe(false);
    expect(mock.osciladores.length).toBe(1);

    tiempoActual += 200; // pasa cooldown y expira la voz anterior
    expect(motor.reproducir('alerta_barra')).toBe(true);
    expect(mock.osciladores.length).toBe(2);
  });

  it('falla en silencio absoluto si AudioContext lanza excepciones o no existe', () => {
    const motorSinApi = new MotorAudio({
      crearContexto: () => null,
      ahoraMs: () => 1000,
      getAjustes: () => ({ sonido: true, volumen: 0.7 }),
    });
    expect(() => motorSinApi.registrarGestoUsuario()).not.toThrow();
    expect(motorSinApi.reproducir('clic')).toBe(false);

    const motorQueLanza = new MotorAudio({
      crearContexto: () => {
        throw new Error('AudioContext bloqueado por política del navegador');
      },
      ahoraMs: () => 1000,
      getAjustes: () => ({ sonido: true, volumen: 0.7 }),
    });
    expect(() => motorQueLanza.registrarGestoUsuario()).not.toThrow();
    expect(() => motorQueLanza.reproducir('evacuacion')).not.toThrow();
    expect(motorQueLanza.reproducir('evacuacion')).toBe(false);

    const motorOsciladorRoto = new MotorAudio({
      crearContexto: () => ({
        currentTime: 0,
        state: 'suspended',
        destination: {},
        resume: () => Promise.reject(new Error('Autoplay bloqueado')),
        createOscillator: () => {
          throw new Error('Fallo interno de hardware');
        },
        createGain: () => ({
          gain: crearParametroMock(0),
          connect: () => {},
        }),
      }),
      ahoraMs: () => 1000,
      getAjustes: () => ({ sonido: true, volumen: 0.7 }),
    });
    expect(() => motorOsciladorRoto.registrarGestoUsuario()).not.toThrow();
    expect(motorOsciladorRoto.reproducir('jornada_completa')).toBe(false);
  });

  it('conecta con eventos del juego al cruzar umbrales <35% y <15% sin estridencias', () => {
    const mock = crearAudioContextMock('suspended');
    let tiempoActual = 5000;
    const manager = new GameStateManager();
    const motor = new MotorAudio({
      crearContexto: () => mock.contexto,
      ahoraMs: () => tiempoActual,
      getAjustes: () => ({ sonido: true, volumen: 0.5 }),
    });

    motor.registrarGestoUsuario();
    const desconectar = motor.conectarEventosJuego(manager);

    // Baja energía por debajo de 35% -> alerta_barra
    const energiaAntes = manager.getSnapshot().energia;
    manager.cambiarRecurso('energia', -(energiaAntes - 30)); // -> 30
    expect(mock.osciladores.length).toBe(SONIDOS.alerta_barra.notas.length);

    tiempoActual += 400;
    // Baja aire por debajo de 15% -> critico_barra
    const aireAntes = manager.getSnapshot().aire;
    manager.cambiarRecurso('aire', -(aireAntes - 10)); // -> 10
    expect(mock.osciladores.length).toBe(
      SONIDOS.alerta_barra.notas.length + SONIDOS.critico_barra.notas.length,
    );

    expect(calcularGananciaSuave(0.5)).toBeLessThan(0.2);
    expect(mock.getResumeCalls()).toBeGreaterThanOrEqual(1);

    desconectar();
  });
});
