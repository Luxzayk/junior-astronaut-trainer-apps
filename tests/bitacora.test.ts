import { describe, expect, it } from 'vitest';
import {
  crearEntradaBitacora,
  filtrarDecisionesDificiles,
  filtrarEntradasPorJornada,
} from '../src/game/bitacora';
import {
  COSTO_INTENTO_MINIJUEGO,
  EFECTOS_APAGON,
  EFECTOS_EVENTO_FLR,
  ELECCIONES,
} from '../src/game/balance';
import { GameStateManager } from '../src/game/state';

describe('Bitácora de decisiones y acciones', () => {
  it('registra intentos, elecciones, eventos, apagones y fugas con sus deltas y persiste entre jornadas', () => {
    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');

    // J1: intento + eleccion
    gm.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    gm.finalizarMinijuego('exito', 'energia', 'j1_energia');
    gm.aplicarEleccion('envio_energia', 'mandarAire', 'j1_energia');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    // J2: fuga
    gm.irAJornadaDebug(2);
    gm.forzarEventoJornadaDebug(); // fuga
    gm.completarMision('j2_fuga_tanque');

    // J3: evento clima
    gm.irAJornadaDebug(3);
    gm.forzarEventoClimaDebug();
    gm.resolverEventoClima('seguirTrabajando', 'FULGURACION');

    // J4: apagon
    gm.irAJornadaDebug(4);
    gm.forzarEventoJornadaDebug();
    gm.resolverApagon('soporteVida');

    const bitacora = gm.getSnapshot().bitacora;
    const tipos = bitacora.map((e) => e.tipo);

    expect(tipos).toContain('intento');
    expect(tipos).toContain('eleccion');
    expect(tipos).toContain('fuga');
    expect(tipos).toContain('evento');
    expect(tipos).toContain('apagon');

    const intento = bitacora.find((e) => e.tipo === 'intento');
    expect(intento?.deltas.energia).toBe(COSTO_INTENTO_MINIJUEGO.nodos.energia);

    const eleccion = bitacora.find((e) => e.tipo === 'eleccion');
    expect(eleccion?.deltas).toEqual(ELECCIONES.envio_energia.mandarAire);

    const evento = bitacora.find((e) => e.tipo === 'evento');
    expect(evento?.jornada).toBe(3);
    expect(evento?.deltas.escudo).toBe(EFECTOS_EVENTO_FLR.seguirTrabajando.escudo);

    const apagon = bitacora.find((e) => e.tipo === 'apagon');
    expect(apagon?.jornada).toBe(4);
    expect(apagon?.deltas.aire).toBe(EFECTOS_APAGON.soporteVida.aire);

    const dificiles = filtrarDecisionesDificiles(bitacora);
    expect(dificiles.map((d) => d.tipo)).toEqual(['evento', 'apagon']);
  });

  it('reinicia la bitácora en partida nueva y restaura snapshot al reiniciar jornada actual', () => {
    const gm = new GameStateManager();
    gm.iniciarSemana('semana-1');

    gm.iniciarMinijuego('energia', 'j1_energia', 'nodos');
    gm.finalizarMinijuego('exito', 'energia', 'j1_energia');
    gm.aplicarEleccion('envio_energia', 'mandarEscudo', 'j1_energia');
    gm.forzarFinJornada();
    gm.siguienteJornada();

    expect(gm.getSnapshot().bitacora.length).toBe(2);

    // Acciones en J2 que deben revertirse con reiniciarJornadaActual()
    gm.iniciarMinijuego('invernadero', 'j2_invernadero', 'valvulas');
    expect(gm.getSnapshot().bitacora.length).toBe(3);

    gm.reiniciarJornadaActual();
    expect(gm.getSnapshot().bitacora.length).toBe(2);
    expect(filtrarEntradasPorJornada(gm.getSnapshot().bitacora, 2)).toEqual([]);

    // Reset total limpia la bitácora por completo
    gm.reset();
    expect(gm.getSnapshot().bitacora).toEqual([]);
  });

  it('normaliza entradas puras con deltas parciales', () => {
    const entrada = crearEntradaBitacora({
      jornada: 3,
      tipo: 'evento',
      id: 'refugiarte',
      deltas: { energia: -12 },
    });
    expect(entrada.deltas).toEqual({ aire: 0, energia: -12, escudo: 0 });
  });
});
