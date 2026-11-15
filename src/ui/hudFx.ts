import { DEMO_EVENTO_SEGUNDO } from '../game/balance';
import type { DefinicionJornada } from '../game/jornadas';
import type { ModoJuego } from '../game/state';
import { UI_CONFIG } from './uiConfig';

export interface EstadoBarraFx {
  mostrado: number; estela: number; realAnterior: number; esperaMs: number;
  perdidaDesde: number; perdidaHasta: number; marcadorMs: number;
}
export interface ConfigBarraFx {
  movimientoReducido: boolean; suavizadoMs: number; esperaEstelaMs: number;
  velocidadEstela: number; epsilonBarra: number; umbralEstela: number; marcadorReducidoMs: number;
}
export function crearEstadoBarra(valor: number): EstadoBarraFx {
  return { mostrado: valor, estela: valor, realAnterior: valor, esperaMs: 0, perdidaDesde: valor, perdidaHasta: valor, marcadorMs: 0 };
}
export function avanzarBarra(estado: Readonly<EstadoBarraFx>, valorReal: number, dt: number, config: Readonly<ConfigBarraFx>): EstadoBarraFx {
  const real = Math.max(0, Math.min(100, valorReal));
  const tiempo = Math.max(0, dt);
  const perdida = estado.realAnterior - real;
  const discreta = perdida >= config.umbralEstela;
  const marcadorMs = discreta ? config.marcadorReducidoMs : Math.max(0, estado.marcadorMs - tiempo);
  const perdidaDesde = discreta ? estado.realAnterior : estado.perdidaDesde;
  const perdidaHasta = discreta ? real : estado.perdidaHasta;
  if (config.movimientoReducido) return { mostrado: real, estela: real, realAnterior: real, esperaMs: 0, perdidaDesde, perdidaHasta, marcadorMs };
  let mostrado = real + (estado.mostrado - real) * Math.exp(-tiempo / config.suavizadoMs);
  if (Math.abs(mostrado - real) <= config.epsilonBarra) mostrado = real;
  const esperaInicial = discreta ? config.esperaEstelaMs : estado.esperaMs;
  const esperaMs = Math.max(0, esperaInicial - tiempo);
  let estela = discreta ? Math.max(estado.realAnterior, estado.estela) : estado.estela;
  if (real > estado.realAnterior) estela = mostrado;
  else if (esperaMs === 0) estela = Math.max(mostrado, estela - config.velocidadEstela * Math.max(0, tiempo - esperaInicial) / 1000);
  if (!discreta && estado.esperaMs === 0 && estado.estela <= estado.mostrado + config.epsilonBarra) estela = mostrado;
  return { mostrado, estela: Math.max(mostrado, estela), realAnterior: real, esperaMs, perdidaDesde, perdidaHasta, marcadorMs };
}
export const CONFIG_BARRA_FX = { ...UI_CONFIG, movimientoReducido: false };

export const RECURSOS_HUD = ['aire', 'energia', 'escudo'] as const;
export type RecursoFx = typeof RECURSOS_HUD[number];
export interface CambioHud { recurso: RecursoFx; delta: number; instanteMs: number }
export function detectarCambioDiscreto(delta: number, umbral = UI_CONFIG.umbralDeltaFlotante): boolean {
  return Number.isFinite(delta) && Math.abs(delta) >= umbral;
}
/** Ventanas ancladas al primer cambio, no encadenadas indefinidamente. */
export function agruparCambios(cambios: readonly CambioHud[], ventanaMs: number): CambioHud[] {
  const grupos: CambioHud[] = [];
  for (const cambio of [...cambios].sort((a, b) => a.instanteMs - b.instanteMs)) {
    const previo = grupos.find(g => g.recurso === cambio.recurso && cambio.instanteMs - g.instanteMs <= ventanaMs);
    if (previo) previo.delta += cambio.delta;
    else grupos.push({ ...cambio });
  }
  return grupos;
}

export const EVENTO_PREVIEW_COSTO = 'preview:costo';
export function calcularPreview(valorActual: number, delta: number): { desde: number; hasta: number; tipo: 'subida' | 'bajada' | 'sinCambio' } {
  const desde = Math.max(0, Math.min(100, valorActual));
  const hasta = Math.max(0, Math.min(100, desde + delta));
  return { desde, hasta, tipo: delta > 0 ? 'subida' : delta < 0 ? 'bajada' : 'sinCambio' };
}


export interface MarcadorEventoFx { fraccion: number; tipo: 'fuga' | 'clima' | 'apagon' }
export function marcadorEvento(jornadaDef: Pick<DefinicionJornada, 'evento'>, modo: ModoJuego, duracion: number): MarcadorEventoFx | null {
  const evento = modo === 'demo' ? { segundo: DEMO_EVENTO_SEGUNDO, tipo: 'clima' as const } : jornadaDef.evento;
  if (!evento) return null;
  if (duracion <= 0 || evento.segundo < 0 || evento.segundo > duracion) {
    console.warn('[hudFx] Marcador de evento fuera de la duración de jornada.');
    return null;
  }
  return { fraccion: evento.segundo / duracion, tipo: evento.tipo };
}

export function valorConteo(t: number, final: number, duracion: number): number {
  if (duracion <= 0 || t >= duracion) return final;
  if (t <= 0) return 0;
  const fraccion = Math.max(0, Math.min(1, t / duracion));
  return final * (1 - Math.pow(1 - fraccion, UI_CONFIG.easingConteo));
}
