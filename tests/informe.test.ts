import { describe, expect, it } from 'vitest';
import { crearEntradaBitacora } from '../src/game/bitacora';
import {
  calcularRango,
  causaPrincipal,
  generarInformeFinal,
} from '../src/game/informe';
import { GameStateManager } from '../src/game/state';

describe('Rango, causa principal de evacuación e Informe Final', () => {
  it('calcula el rango exacto para 5, 4, 3, 2, 1 y 0 jornadas completas', () => {
    expect(calcularRango(5, 'es').id).toBe('commander');
    expect(calcularRango(5, 'es').titulo).toBe('Comandante');
    expect(calcularRango(5, 'en').titulo).toBe('Commander');

    expect(calcularRango(4, 'es').id).toBe('specialist');
    expect(calcularRango(4, 'es').titulo).toBe('Especialista');

    expect(calcularRango(3, 'es').id).toBe('cadet');
    expect(calcularRango(2, 'es').id).toBe('cadet');
    expect(calcularRango(2, 'es').titulo).toBe('Cadete');

    expect(calcularRango(1, 'es').id).toBe('trainee');
    expect(calcularRango(0, 'es').id).toBe('trainee');
    expect(calcularRango(0, 'es').titulo).toBe('Astronauta en entrenamiento');
    expect(calcularRango(0, 'en').titulo).toBe('Astronaut in training');
  });

  it('causaPrincipal devuelve la entrada con mayor pérdida de Aire en la jornada o null si no hubo pérdidas', () => {
    const bitacora = [
      crearEntradaBitacora({
        jornada: 3,
        tipo: 'eleccion',
        id: 'mandarAire',
        deltas: { aire: 30, energia: -6 },
      }),
      crearEntradaBitacora({
        jornada: 4,
        tipo: 'eleccion',
        id: 'bateriaCentral',
        deltas: { energia: 28, aire: -4, escudo: -4 },
      }),
      crearEntradaBitacora({
        jornada: 4,
        tipo: 'apagon',
        id: 'soporteVida',
        deltas: { aire: -16 },
      }),
      crearEntradaBitacora({
        jornada: 5,
        tipo: 'evento',
        id: 'seguirTrabajando',
        deltas: { escudo: -35 },
      }),
    ];

    const causaJ4 = causaPrincipal(bitacora, 4);
    expect(causaJ4).not.toBeNull();
    expect(causaJ4?.id).toBe('soporteVida');
    expect(causaJ4?.deltas.aire).toBe(-16);

    expect(causaPrincipal(bitacora, 3)).toBeNull();
    expect(causaPrincipal(bitacora, 5)).toBeNull();
    expect(causaPrincipal([], 1)).toBeNull();
  });

  it('genera el informe completo al cerrar la Jornada 5 con 5 jornadas, decisiones, 3 aprendizajes y datos', () => {
    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');

    // Completar J1
    gm.completarMision('j1_energia');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    // Completar J2
    gm.completarMision('j2_invernadero');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    // J3: evento + misiones
    gm.forzarEventoClimaDebug();
    gm.resolverEventoClima('seguirTrabajando', 'FULGURACION');
    gm.completarMision('j3_energia');
    gm.completarMision('j3_escudos');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    // J4: apagon + misiones
    gm.forzarEventoJornadaDebug();
    gm.resolverApagon('escudos');
    gm.completarMision('j4_energia');
    gm.completarMision('j4_invernadero');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    // J5: completar misiones y cerrar semana
    gm.completarMision('j5_invernadero');
    gm.completarMision('j5_escudos');
    gm.forzarFinJornada();

    const snap = gm.getSnapshot();
    const informe = generarInformeFinal(snap, { idioma: 'es' });

    expect(informe.modo).toBe('completo');
    expect(informe.jornadas.length).toBe(5);
    expect(informe.jornadasCompletadas).toBe(5);
    expect(informe.rango.id).toBe('commander');
    expect(informe.decisionesDificiles.length).toBe(2);
    expect(informe.aprendizajes.length).toBe(3);
    expect(informe.datosUsados.j3.jornada).toBe(3);
    expect(informe.datosUsados.j5.jornada).toBe(5);
    expect(informe.osdr).toBeNull();
    expect(informe.textoParaCopiar).toContain('Comandante');
  });

  it('genera la versión corta de evacuación identificando lo que más aire gastó', () => {
    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');
    gm.irAJornadaDebug(4);
    gm.cambiarRecurso('aire', -88); // aire en 12
    gm.forzarEventoJornadaDebug();
    gm.resolverApagon('soporteVida'); // -16 aire -> evacua en J4

    const snap = gm.getSnapshot();
    expect(snap.estado).toBe('evacuacion');

    const informe = generarInformeFinal(snap, { idioma: 'es' });
    expect(informe.modo).toBe('evacuacion');
    expect(informe.causaEvacuacion).not.toBeNull();
    expect(informe.causaEvacuacion?.entrada.id).toBe('soporteVida');
    expect(informe.causaEvacuacion?.deltaAire).toBe(-16);
  });
});
