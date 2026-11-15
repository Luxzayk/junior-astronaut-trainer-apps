import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LocalProvider,
  esNivelPermitidoEnJornada,
  formatearFechaEvento,
  getCostosPorNivel,
  localEventosProvider,
  obtenerEtiquetaSelloEvento,
  obtenerEventoMasRecienteSemana,
  obtenerNivelesPermitidosJornada,
  obtenerTextoFuenteCurado,
  obtenerTextoNinosCurado,
  parsearEventosLoaderSeguro,
} from '../src/data/eventosLoader';
import {
  EFECTOS_EVENTO_FLR,
  EFECTOS_EVENTO_TORMENTA_GRANDE,
} from '../src/game/balance';
import {
  SEMANAS,
  elegirSemanaAlAzar,
  formatearVentanaSemana,
  obtenerEventosDeSemana,
  semanaTieneDatosVerificados,
} from '../src/game/semanas';
import { getAjustes, resetAjustes } from '../src/game/settings';
import { gameState } from '../src/game/state';

describe('Cargador de eventos curados (DONKI local) y 3 semanas', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetAjustes();
    gameState.reset();
  });

  it('carga las 6 plantillas de eventos.json con IDs únicos y vinculación válida desde las 3 semanas', () => {
    const todos = localEventosProvider.obtenerTodos();
    expect(todos).toHaveLength(6);

    const ids = todos.map((ev) => ev.id);
    expect(new Set(ids).size).toBe(6);

    expect(SEMANAS).toHaveLength(3);
    for (const semana of SEMANAS) {
      const porIdJ3 = localEventosProvider.obtenerPorId(semana.eventos.j3);
      const porIdJ5 = localEventosProvider.obtenerPorId(semana.eventos.j5);
      expect(porIdJ3).not.toBeNull();
      expect(porIdJ5).not.toBeNull();
      expect(porIdJ3?.jornada).toBe(3);
      expect(porIdJ5?.jornada).toBe(5);

      const { j3, j5 } = obtenerEventosDeSemana(semana.id);
      expect(j3.id).toBe(semana.eventos.j3);
      expect(j5.id).toBe(semana.eventos.j5);
      expect(j3.esEjemplo).toBe(false);
      expect(j5.esEjemplo).toBe(false);
      expect(semanaTieneDatosVerificados(semana.id)).toBe(true);
    }
  });

  it('marca esEjemplo: true cuando verificado es false o falta cualquier campo requerido', () => {
    const parcial = new LocalProvider([
      {
        id: 'semana-1-j3',
        semana: 'semana-1',
        jornada: 3,
        tipo: 'FLR',
        fecha: '2024-05-10',
        clase: 'M8.2',
        nivel: 'media',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: '', // Falta URL
        consultadoEn: '2026-01-15',
        textoNinos: { es: 'Texto es', en: 'Text en' },
        verificado: true,
      },
      {
        id: 'semana-1-j5',
        semana: 'semana-1',
        jornada: 5,
        tipo: 'SEP',
        fecha: 'fecha-mala', // Fecha ISO inválida
        clase: 'SEP fuerte',
        nivel: 'fuerte',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        consultadoEn: '2026-01-15',
        textoNinos: { es: 'Texto es', en: 'Text en' },
        verificado: true,
      },
      {
        id: 'semana-2-j3',
        semana: 'semana-2',
        jornada: 3,
        tipo: 'FLR',
        fecha: '2024-05-10',
        clase: 'M5.0',
        nivel: 'media',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        consultadoEn: '2026-01-15',
        textoNinos: { es: 'Texto es', en: 'Text en' },
        verificado: false, // No verificado
      },
    ]);

    expect(parcial.obtenerPorId('semana-1-j3')?.esEjemplo).toBe(true);
    expect(parcial.obtenerPorId('semana-1-j5')?.esEjemplo).toBe(true);
    expect(parcial.obtenerPorId('semana-2-j3')?.esEjemplo).toBe(true);
  });

  it('marca esEjemplo: false solo cuando verificado es true y todos los campos son válidos', () => {
    const provider = new LocalProvider([
      {
        id: 'semana-1-j5',
        semana: 'semana-1',
        jornada: 5,
        tipo: 'SEP',
        fecha: '2024-05-10T12:00Z',
        clase: 'X1.2',
        nivel: 'fuerte',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        consultadoEn: '2026-01-15',
        textoNinos: {
          es: 'Tormenta solar real captada en archivo.',
          en: 'Archived solar storm recorded.',
        },
        verificado: true,
      },
    ]);

    const ev = provider.obtenerPorId('semana-1-j5');
    expect(ev).not.toBeNull();
    expect(ev?.esEjemplo).toBe(false);
    expect(ev?.nivel).toBe('fuerte');

    if (ev) {
      expect(obtenerTextoNinosCurado(ev, 'es')).toBe(
        'Tormenta solar real captada en archivo.',
      );
      expect(obtenerTextoNinosCurado(ev, 'en')).toBe(
        'Archived solar storm recorded.',
      );
      expect(obtenerEtiquetaSelloEvento(ev, 'es')).toContain('Datos de archivo');
      expect(obtenerEtiquetaSelloEvento(ev, 'en')).toContain('Archive data');
      expect(obtenerTextoFuenteCurado(ev, 'es')).toContain('NASA DONKI');
      expect(obtenerTextoFuenteCurado(ev, 'es')).toContain('X1.2');
      expect(formatearFechaEvento('2024-05-10T12:00Z', 'es')).toContain('2024');
      expect(obtenerEventoMasRecienteSemana('semana-1', provider).id).toBe(
        'semana-1-j5',
      );
    }
  });

  it('restringe Jornada 3 a nivel media según calibración y permite media o fuerte en Jornada 5', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(obtenerNivelesPermitidosJornada(3)).toEqual(['media']);
    expect(obtenerNivelesPermitidosJornada(5)).toEqual(['media', 'fuerte']);
    expect(esNivelPermitidoEnJornada(3, 'media')).toBe(true);
    expect(esNivelPermitidoEnJornada(3, 'fuerte')).toBe(false);
    expect(esNivelPermitidoEnJornada(5, 'fuerte')).toBe(true);

    const provider = new LocalProvider([
      {
        id: 'semana-1-j3',
        semana: 'semana-1',
        jornada: 3,
        tipo: 'FLR',
        fecha: '2024-05-10T12:00Z',
        clase: 'X1.2',
        nivel: 'fuerte',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        consultadoEn: '2026-01-15',
        textoNinos: { es: 'Evento J3', en: 'J3 event' },
        verificado: true,
      },
    ]);

    const ev = provider.obtenerPorId('semana-1-j3');
    expect(ev?.nivel).toBe('media');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('mantiene compatibilidad con el esquema legado (intensidad y textoNinos string)', () => {
    const legado = new LocalProvider([
      {
        id: 'j3-fulguracion',
        tipo: 'FLR',
        fecha: '2024-05-10',
        intensidad: 'M4.5',
        fuenteNombre: 'NASA DONKI',
        fuenteUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        consultadoEn: '2026-01-15',
        textoNinos: 'Texto legado en español.',
        verificado: false,
      },
    ]);

    const ev = legado.obtenerPorId('j3-fulguracion');
    expect(ev).not.toBeNull();
    expect(ev?.clase).toBe('M4.5');
    expect(ev?.intensidad).toBe('M4.5');
    expect(ev?.textoNinos.es).toBe('Texto legado en español.');
    expect(ev?.esEjemplo).toBe(true);
  });

  it('no lanza excepciones ante JSON roto o corrupto y devuelve fallback seguro', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(parsearEventosLoaderSeguro(null)).toEqual([]);
    expect(parsearEventosLoaderSeguro('corrupto')).toEqual([]);
    expect(parsearEventosLoaderSeguro({ mal: true })).toEqual([]);

    const providerRoto = new LocalProvider({ invalido: 123 });
    expect(providerRoto.obtenerTodos()).toEqual([]);

    const fallback = providerRoto.obtenerPorSemanaYJornada('semana-2', 5);
    expect(fallback.id).toBe('semana-2-j5');
    expect(fallback.tipo).toBe('SEP');
    expect(fallback.nivel).toBe('fuerte');
    expect(fallback.esEjemplo).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('devuelve los costos del balance según nivel media o fuerte', () => {
    const media = getCostosPorNivel('media');
    expect(media.refugiarte.energia).toBe(EFECTOS_EVENTO_FLR.refugiarte.energia);
    expect(media.seguirTrabajando.escudo).toBe(
      EFECTOS_EVENTO_FLR.seguirTrabajando.escudo,
    );

    const fuerte = getCostosPorNivel('fuerte');
    expect(fuerte.refugiarte.energia).toBe(
      EFECTOS_EVENTO_TORMENTA_GRANDE.refugiarte.energia,
    );
    expect(fuerte.seguirTrabajando.escudo).toBe(
      EFECTOS_EVENTO_TORMENTA_GRANDE.seguirTrabajando.escudo,
    );
  });

  it('permite elegir semana al azar, formatear ventana y persistir ultimaSemana al iniciar', () => {
    expect(elegirSemanaAlAzar(() => 0).id).toBe('semana-1');
    expect(elegirSemanaAlAzar(() => 0.5).id).toBe('semana-2');
    expect(elegirSemanaAlAzar(() => 0.99).id).toBe('semana-3');

    expect(formatearVentanaSemana(SEMANAS[0], 'es')).toBe('2026-09-01 · 2026-09-07');
    expect(formatearVentanaSemana(SEMANAS[0], 'en')).toBe('2026-09-01 · 2026-09-07');

    gameState.iniciarSemana('semana-3');
    expect(gameState.getSnapshot().semanaId).toBe('semana-3');
    expect(getAjustes().ultimaSemana).toBe('semana-3');
  });
});
