import { beforeEach, describe, expect, it } from 'vitest';
import {
  AGUA_BAJA_MULT_AIRE,
  DEMO_DURACION,
  DEMO_EVENTO_SEGUNDO,
  DEMO_JORNADA,
  DEMO_RECURSOS,
  DRENAJE_BASE_POR_SEG,
  DURACION_JORNADA,
  EFECTOS_APAGON,
  EFECTOS_EVENTO_FLR,
  EFECTOS_EVENTO_TORMENTA_GRANDE,
  MULT_DRENAJE_POR_JORNADA,
  MULT_MODULO_DANADO,
  RECARGA_COMPLETA,
  REFUERZO_CONTROL_MISION,
  SEGUNDO_EVENTO_APAGON,
  SEGUNDO_EVENTO_CLIMA,
  SEGUNDO_EVENTO_FUGA,
  SEGUNDO_EVENTO_TORMENTA_GRANDE,
  VENTANA_FUGA,
} from '../src/game/balance';
import {
  evaluarCierreJornada,
  obtenerMultiplicadorModuloDanado,
  obtenerRecursoDeEstacion,
} from '../src/game/closing';
import {
  obtenerEventoJornada3,
  obtenerEventoJornada5,
  obtenerOpcionesEventoClima,
  obtenerOpcionesEventoFLR,
  obtenerTextoEventoParaNinos,
  obtenerTextoFuenteEvento,
  parsearEventosClimaSeguro,
} from '../src/game/events';
import { obtenerEstadoMision } from '../src/game/missions';
import { resetAjustes } from '../src/game/settings';
import { gameState } from '../src/game/state';
import { t } from '../src/i18n';

describe('Cierre de jornada, módulo dañado, eventos (Fuga, Clima, Apagón) y Demo', () => {
  beforeEach(() => {
    resetAjustes();
    gameState.reset();
  });

  it('otorga recarga de energía al completar todas las misiones de la jornada', () => {
    const evalCompleta = evaluarCierreJornada({
      jornada: 1,
      aire: 70,
      energia: 60,
      escudo: 80,
      misionesHechas: ['j1_energia'],
      gastoJornada: { aire: 30, energia: 40, escudo: 20 },
      incompletasSeguidasActual: 1,
      refuerzoControlUsadoActual: false,
      moduloDanadoActual: null,
    });

    expect(evalCompleta.resultado.tipo).toBe('completa');
    expect(evalCompleta.resultado.misionesHechasCount).toBe(1);
    expect(evalCompleta.resultado.misionesTotal).toBe(1);
    expect(evalCompleta.resultado.deltaEnergia).toBe(RECARGA_COMPLETA);
    expect(evalCompleta.nuevoEstadoCierre.energia).toBe(60 + RECARGA_COMPLETA);
    expect(evalCompleta.nuevoEstadoCierre.incompletasSeguidas).toBe(0);
    expect(evalCompleta.resultado.mensajeEfecto).toBe(
      t('overlays.efectoCompleta'),
    );
  });

  it('marca módulo dañado al cerrar jornada incompleta y aplica drenaje x1.25 hasta repararlo', () => {
    gameState.forzarFinJornada();
    const trasCierre = gameState.getSnapshot();

    expect(trasCierre.estado).toBe('finJornada');
    expect(trasCierre.ultimoCierre?.tipo).toBe('incompleta');
    expect(trasCierre.moduloDanado).toBe('energia');
    expect(trasCierre.incompletasSeguidas).toBe(1);

    expect(obtenerRecursoDeEstacion('energia')).toBe('energia');
    expect(obtenerRecursoDeEstacion('invernadero')).toBe('aire');
    expect(obtenerRecursoDeEstacion('tanque')).toBe('aire');
    expect(obtenerRecursoDeEstacion('escudos')).toBe('escudo');
    expect(obtenerRecursoDeEstacion('lobby')).toBeNull();
    expect(obtenerMultiplicadorModuloDanado('energia', 'energia')).toBe(
      MULT_MODULO_DANADO,
    );

    gameState.siguienteJornada();
    const energiaInicioJ2 = gameState.getSnapshot().energia;
    const dt = 10;
    const multJ2 = MULT_DRENAJE_POR_JORNADA[1];

    gameState.tick(dt);
    const trasTickJ2 = gameState.getSnapshot();
    expect(trasTickJ2.energia).toBeCloseTo(
      energiaInicioJ2 -
        DRENAJE_BASE_POR_SEG.energia * multJ2 * MULT_MODULO_DANADO * dt,
      5,
    );

    // En J2 la misión principal es j2_invernadero, así que probamos limpiar módulo en J3 con j3_energia
    gameState.irAJornadaDebug(3);
    gameState.completarMision('j3_energia');
    expect(gameState.getSnapshot().moduloDanado).toBeNull();
  });

  it('envía refuerzo único del Control de Misión tras 2 jornadas incompletas seguidas', () => {
    gameState.cambiarRecurso('energia', -50);
    gameState.cambiarRecurso('aire', -40);
    gameState.forzarFinJornada();
    expect(gameState.getSnapshot().incompletasSeguidas).toBe(1);
    expect(gameState.getSnapshot().refuerzoControlUsado).toBe(false);

    gameState.siguienteJornada();
    const aireAntesJ2 = gameState.getSnapshot().aire;
    const energiaAntesJ2 = gameState.getSnapshot().energia;
    gameState.forzarFinJornada();

    const trasRefuerzo = gameState.getSnapshot();
    expect(trasRefuerzo.ultimoCierre?.tipo).toBe('refuerzo');
    expect(trasRefuerzo.ultimoCierre?.refuerzoEnviado).toBe(true);
    expect(trasRefuerzo.ultimoCierre?.mensajeEfecto).toBe(
      t('overlays.efectoRefuerzo'),
    );
    expect(trasRefuerzo.energia).toBe(
      energiaAntesJ2 + REFUERZO_CONTROL_MISION.energia,
    );
    expect(trasRefuerzo.aire).toBe(aireAntesJ2 + REFUERZO_CONTROL_MISION.aire);
    expect(trasRefuerzo.refuerzoControlUsado).toBe(true);
    expect(trasRefuerzo.incompletasSeguidas).toBe(0);

    gameState.siguienteJornada();
    gameState.forzarFinJornada();
    gameState.siguienteJornada();
    gameState.forzarFinJornada();
    const trasCuarta = gameState.getSnapshot();
    expect(trasCuarta.ultimoCierre?.refuerzoEnviado).toBe(false);
    expect(trasCuarta.ultimoCierre?.tipo).toBe('incompleta');
    expect(trasCuarta.incompletasSeguidas).toBe(2);
  });

  it('dispara fuga en J2, no pausa, activa aguaBaja en J3 si expira y no cuenta como misión normal', () => {
    gameState.irAJornadaDebug(2);
    gameState.tick(SEGUNDO_EVENTO_FUGA);

    const enFuga = gameState.getSnapshot();
    expect(enFuga.estado).toBe('jugando');
    expect(enFuga.misionUrgente).not.toBeNull();
    expect(enFuga.misionUrgente?.mision.estacionId).toBe('tanque');
    expect(enFuga.misionUrgente?.tiempoRestante).toBeCloseTo(VENTANA_FUGA, 5);

    // Si vence la ventana, se pierde la misión urgente y prepara aguaBaja para J3
    gameState.tick(VENTANA_FUGA + 1);
    const trasExpirar = gameState.getSnapshot();
    expect(trasExpirar.misionUrgente).toBeNull();
    expect(trasExpirar.misionesPerdidas).toContain('j2_fuga_tanque');
    expect(trasExpirar.aguaBajaPendiente).toBe(true);

    // Completar j2_invernadero sigue dando cierre 'completa' aunque la fuga urgente expirara
    gameState.completarMision('j2_invernadero');
    gameState.forzarFinJornada();
    const cierreJ2 = gameState.getSnapshot().ultimoCierre;
    expect(cierreJ2?.tipo).toBe('completa');
    expect(cierreJ2?.misionesTotal).toBe(1);
    expect(cierreJ2?.aguaBajaProxima).toBe(true);

    // En J3 se activa aguaBaja con drenaje de Aire x1.15 y se limpia al cerrar J3
    gameState.siguienteJornada();
    const inicioJ3 = gameState.getSnapshot();
    expect(inicioJ3.aguaBaja).toBe(true);

    const dt = 10;
    const multJ3 = MULT_DRENAJE_POR_JORNADA[2];
    gameState.tick(dt);
    const trasTickJ3 = gameState.getSnapshot();
    expect(trasTickJ3.aire).toBeCloseTo(
      inicioJ3.aire -
        DRENAJE_BASE_POR_SEG.aire * multJ3 * AGUA_BAJA_MULT_AIRE * dt,
      5,
    );

    gameState.forzarFinJornada();
    const finJ3 = gameState.getSnapshot();
    expect(finJ3.ultimoCierre?.aguaBajaAplicada).toBe(true);
    expect(finJ3.aguaBaja).toBe(false);
  });

  it('permite resolver la fuga de J2 sin abrir ChoiceScene cuando se completan Válvulas en Tanque', () => {
    gameState.irAJornadaDebug(2);
    gameState.tick(SEGUNDO_EVENTO_FUGA);
    const idUrgente = gameState.getSnapshot().misionUrgente?.mision.id ?? null;
    expect(idUrgente).toBe('j2_fuga_tanque');

    gameState.iniciarMinijuego('tanque', idUrgente, 'valvulas', {
      pasos: 3,
      tiempoLimite: 25,
    });
    gameState.finalizarMinijuego('exito', 'tanque', idUrgente);

    const trasReparar = gameState.getSnapshot();
    expect(trasReparar.estado).toBe('jugando');
    expect(trasReparar.misionUrgente).toBeNull();
    expect(trasReparar.misionesHechas).toContain('j2_fuga_tanque');
    expect(trasReparar.aguaBajaPendiente).toBe(false);
  });

  it('lee eventos.json con fallback seguro, dispara FLR en J3 y TORMENTA_GRANDE en J5', () => {
    expect(DURACION_JORNADA).toBe(180);
    expect(SEGUNDO_EVENTO_CLIMA).toBe(90);

    const evento3 = obtenerEventoJornada3();
    const evento5 = obtenerEventoJornada5();
    expect(evento3.id).toBe('j3-fulguracion');
    expect(evento5.id).toBe('j5-tormenta-grande');
    expect(obtenerTextoFuenteEvento(evento3)).toBe(
      'Evento de ejemplo (sin dato real todavía)',
    );
    expect(obtenerTextoFuenteEvento(evento5)).toBe(
      'Evento de ejemplo (sin dato real todavía)',
    );
    expect(parsearEventosClimaSeguro('invalido')).toEqual([]);
    expect(obtenerTextoEventoParaNinos(evento3)).toBe(
      t('eventoClima.flrTextoNinos'),
    );
    expect(obtenerOpcionesEventoFLR().map((op) => op.titulo)).toEqual([
      t('eventoClima.opcionRefugiarteTitulo'),
      t('eventoClima.opcionSeguirTitulo'),
    ]);

    gameState.irAJornadaDebug(3);
    gameState.tick(SEGUNDO_EVENTO_CLIMA);
    const enEvento3 = gameState.getSnapshot();
    expect(enEvento3.estado).toBe('evento');

    const energiaAntes = enEvento3.energia;
    gameState.resolverEventoClima('refugiarte', 'FULGURACION');
    const trasRefugiarte = gameState.getSnapshot();
    expect(trasRefugiarte.estado).toBe('jugando');
    expect(trasRefugiarte.energia).toBeCloseTo(
      energiaAntes + EFECTOS_EVENTO_FLR.refugiarte.energia,
      5,
    );
    expect(trasRefugiarte.misionesPerdidas).toEqual(['j3_energia', 'j3_escudos']);
    expect(
      obtenerEstadoMision(
        'j3_energia',
        trasRefugiarte.misionesHechas,
        trasRefugiarte.misionesPerdidas,
      ),
    ).toBe('perdida');

    // J5 Tormenta grande: -15 Energía vs -35 Escudo
    const opcionesJ5 = obtenerOpcionesEventoClima('TORMENTA_GRANDE');
    expect(opcionesJ5[0].efectos.energia).toBe(
      EFECTOS_EVENTO_TORMENTA_GRANDE.refugiarte.energia,
    );
    expect(opcionesJ5[1].efectos.escudo).toBe(
      EFECTOS_EVENTO_TORMENTA_GRANDE.seguirTrabajando.escudo,
    );

    gameState.reset();
    gameState.irAJornadaDebug(5);
    gameState.tick(SEGUNDO_EVENTO_TORMENTA_GRANDE);
    expect(gameState.getSnapshot().estado).toBe('evento');
    const escudoAntesJ5 = gameState.getSnapshot().escudo;
    gameState.resolverEventoClima('seguirTrabajando', 'TORMENTA_GRANDE');
    expect(gameState.getSnapshot().escudo).toBeCloseTo(
      escudoAntesJ5 + EFECTOS_EVENTO_TORMENTA_GRANDE.seguirTrabajando.escudo,
      5,
    );
  });

  it('dispara apagón en J4 a los 70s y aplica consecuencias de sus 3 opciones', () => {
    gameState.irAJornadaDebug(4);
    gameState.tick(SEGUNDO_EVENTO_APAGON);
    expect(gameState.getSnapshot().estado).toBe('apagon');

    const antes = gameState.getSnapshot();
    gameState.resolverApagon('invernadero');
    const despues = gameState.getSnapshot();

    expect(despues.estado).toBe('jugando');
    expect(despues.energia).toBeCloseTo(
      antes.energia + EFECTOS_APAGON.invernadero.energia,
      5,
    );
    expect(despues.misionesPerdidas).toContain('j4_invernadero');
    expect(despues.misionesPerdidas).not.toContain('j4_energia');
    expect(despues.gastoJornada.energia).toBeGreaterThan(0);

    // Probar soporteVida y escudos
    gameState.irAJornadaDebug(4);
    gameState.forzarEventoJornadaDebug();
    const aireAntes = gameState.getSnapshot().aire;
    gameState.resolverApagon('soporteVida');
    expect(gameState.getSnapshot().aire).toBeCloseTo(
      aireAntes + EFECTOS_APAGON.soporteVida.aire,
      5,
    );

    gameState.irAJornadaDebug(4);
    gameState.forzarEventoJornadaDebug();
    const escudoAntes = gameState.getSnapshot().escudo;
    gameState.resolverApagon('escudos');
    expect(gameState.getSnapshot().escudo).toBeCloseTo(
      escudoAntes + EFECTOS_APAGON.escudos.escudo,
      5,
    );
  });

  it('soporta Modo Demo en Jornada 3 con 150s, recursos iniciales y evento a los 60s', () => {
    gameState.iniciarDemo();
    const inicio = gameState.getSnapshot();

    expect(inicio.modo).toBe('demo');
    expect(inicio.jornada).toBe(DEMO_JORNADA);
    expect(inicio.aire).toBe(DEMO_RECURSOS.aire);
    expect(inicio.energia).toBe(DEMO_RECURSOS.energia);
    expect(inicio.escudo).toBe(DEMO_RECURSOS.escudo);
    expect(gameState.obtenerDuracionJornadaActual()).toBe(DEMO_DURACION);

    gameState.tick(DEMO_EVENTO_SEGUNDO);
    expect(gameState.getSnapshot().estado).toBe('evento');
    gameState.resolverEventoClima('seguirTrabajando', 'FULGURACION');

    gameState.forzarFinJornada();
    const finDemo = gameState.getSnapshot();
    expect(finDemo.estado).toBe('finJornada');
    expect(finDemo.modo).toBe('demo');

    // En demo, siguienteJornada no avanza a J4
    gameState.siguienteJornada();
    expect(gameState.getSnapshot().jornada).toBe(DEMO_JORNADA);
  });
});
