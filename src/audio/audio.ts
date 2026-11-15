// Motor de audio WebAudio sin archivos externos, con límite de voces, cooldown y respaldo silencioso

import { UMBRAL_BAJO, UMBRAL_CRITICO } from '../game/balance';
import { getAjustes, type Ajustes } from '../game/settings';
import type { GameStateManager } from '../game/state';
import {
  calcularGananciaSuave,
  MAX_VOCES_SIMULTANEAS,
  MIN_ESPACIADO_ALERTA_MS,
  SONIDOS,
  type TipoSonido,
} from './sonidos';

export interface ParametroAudio {
  value: number;
  setValueAtTime(valor: number, tiempo: number): void;
  linearRampToValueAtTime(valor: number, tiempo: number): void;
  exponentialRampToValueAtTime?(valor: number, tiempo: number): void;
}

export interface NodoGananciaAudio {
  gain: ParametroAudio;
  connect(destino: unknown): void;
  disconnect?(): void;
}

export interface NodoOsciladorAudio {
  type: string;
  frequency: ParametroAudio;
  onended: (() => void) | null;
  connect(destino: unknown): void;
  start(cuando?: number): void;
  stop(cuando?: number): void;
  disconnect?(): void;
}

export interface ContextoAudioMinimo {
  readonly currentTime: number;
  readonly state: string;
  readonly destination: unknown;
  resume?(): Promise<void>;
  createOscillator(): NodoOsciladorAudio;
  createGain(): NodoGananciaAudio;
}

export interface DependenciasMotorAudio {
  crearContexto?: () => ContextoAudioMinimo | null;
  ahoraMs?: () => number;
  getAjustes?: () => Pick<Ajustes, 'sonido' | 'volumen'>;
}

function crearContextoAudioNativo(): ContextoAudioMinimo | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    const win = window as unknown as {
      AudioContext?: new () => ContextoAudioMinimo;
      webkitAudioContext?: new () => ContextoAudioMinimo;
    };
    const Ctor = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) {
      return null;
    }
    return new Ctor();
  } catch {
    return null;
  }
}

export class MotorAudio {
  private readonly crearContextoFn: () => ContextoAudioMinimo | null;
  private readonly ahoraMsFn: () => number;
  private readonly getAjustesFn: () => Pick<Ajustes, 'sonido' | 'volumen'>;

  private contexto: ContextoAudioMinimo | null = null;
  private gestoRecibido = false;
  private falloCreacion = false;
  private inicializadoDom = false;
  private vocesActivas: Array<{ expiraMs: number }> = [];
  private readonly ultimoTiempoPorSonido = new Map<TipoSonido, number>();
  private desuscripcionesJuego: Array<() => void> = [];

  constructor(deps: DependenciasMotorAudio = {}) {
    this.crearContextoFn = deps.crearContexto ?? crearContextoAudioNativo;
    this.ahoraMsFn = deps.ahoraMs ?? (() => Date.now());
    this.getAjustesFn = deps.getAjustes ?? (() => getAjustes());
  }

  public inicializar(): void {
    if (this.inicializadoDom || typeof window === 'undefined') {
      return;
    }
    this.inicializadoDom = true;

    const alInteractuar = (): void => {
      this.registrarGestoUsuario();
    };

    window.addEventListener('pointerdown', alInteractuar, { passive: true });
    window.addEventListener('keydown', alInteractuar, { passive: true });
  }

  public registrarGestoUsuario(): void {
    this.gestoRecibido = true;
    const ctx = this.obtenerOCrearContexto();
    if (ctx && ctx.state === 'suspended' && typeof ctx.resume === 'function') {
      try {
        void ctx.resume().catch(() => {
          // Respaldo silencioso si el navegador bloquea resume
        });
      } catch {
        // Sin propagación de error
      }
    }
  }

  public conectarEventosJuego(manager: GameStateManager): () => void {
    this.desconectarEventosJuego();

    const desuscribirRecurso = manager.on('recurso:cambio', (ev) => {
      if (ev.anterior >= UMBRAL_CRITICO && ev.valor < UMBRAL_CRITICO) {
        this.reproducir('critico_barra');
      } else if (ev.anterior >= UMBRAL_BAJO && ev.valor < UMBRAL_BAJO) {
        this.reproducir('alerta_barra');
      }
    });

    const desuscribirMisionOk = manager.on('mision:completada', () => {
      this.reproducir('mision_ok');
    });

    const desuscribirMisionFallo = manager.on('mision:fallo', () => {
      this.reproducir('mision_fallo');
    });

    const desuscribirEvento = manager.on('evento:abrir', () => {
      this.reproducir('evento_inicio');
    });

    const desuscribirApagon = manager.on('apagon:abrir', () => {
      this.reproducir('evento_inicio');
    });

    const desuscribirFugaInicio = manager.on('fuga:inicio', () => {
      this.reproducir('evento_inicio');
    });

    const desuscribirFugaFin = manager.on('fuga:fin', (ev) => {
      if (!ev.reparada) {
        this.reproducir('mision_fallo');
      }
    });

    const desuscribirJornadaFin = manager.on('jornada:fin', () => {
      const snap = manager.getSnapshot();
      if (snap.ultimoCierre?.tipo === 'completa') {
        this.reproducir('jornada_completa');
      } else {
        this.reproducir('jornada_incompleta');
      }
    });

    const desuscribirEvacuacion = manager.on('evacuacion', () => {
      this.reproducir('evacuacion');
    });

    this.desuscripcionesJuego = [
      desuscribirRecurso,
      desuscribirMisionOk,
      desuscribirMisionFallo,
      desuscribirEvento,
      desuscribirApagon,
      desuscribirFugaInicio,
      desuscribirFugaFin,
      desuscribirJornadaFin,
      desuscribirEvacuacion,
    ];

    return () => {
      this.desconectarEventosJuego();
    };
  }

  public desconectarEventosJuego(): void {
    for (const off of this.desuscripcionesJuego) {
      off();
    }
    this.desuscripcionesJuego = [];
  }

  public reproducir(tipo: TipoSonido): boolean {
    try {
      const ajustes = this.getAjustesFn();
      const gananciaMaestra = calcularGananciaSuave(ajustes.volumen);
      if (!ajustes.sonido || gananciaMaestra <= 0) {
        return false;
      }

      if (!this.gestoRecibido) {
        return false;
      }

      const ahora = this.ahoraMsFn();
      const ultimo = this.ultimoTiempoPorSonido.get(tipo);
      if (ultimo !== undefined && ahora - ultimo < MIN_ESPACIADO_ALERTA_MS) {
        return false;
      }

      this.depurarVocesExpiradas(ahora);
      if (this.vocesActivas.length >= MAX_VOCES_SIMULTANEAS) {
        return false;
      }

      const ctx = this.obtenerOCrearContexto();
      if (!ctx) {
        return false;
      }

      if (ctx.state === 'suspended' && typeof ctx.resume === 'function') {
        try {
          void ctx.resume().catch(() => {
            // Respaldo silencioso
          });
        } catch {
          // Respaldo silencioso
        }
      }

      const definicion = SONIDOS[tipo];
      this.ultimoTiempoPorSonido.set(tipo, ahora);

      let reproducida = false;
      for (const nota of definicion.notas) {
        if (this.vocesActivas.length >= MAX_VOCES_SIMULTANEAS) {
          break;
        }
        const ok = this.programarNota(ctx, nota, gananciaMaestra, ahora);
        if (ok) {
          reproducida = true;
        }
      }
      return reproducida;
    } catch {
      return false;
    }
  }

  public obtenerVocesActivasCount(): number {
    this.depurarVocesExpiradas(this.ahoraMsFn());
    return this.vocesActivas.length;
  }

  private obtenerOCrearContexto(): ContextoAudioMinimo | null {
    if (this.contexto) {
      return this.contexto;
    }
    if (!this.gestoRecibido || this.falloCreacion) {
      return null;
    }
    try {
      const creado = this.crearContextoFn();
      if (!creado) {
        this.falloCreacion = true;
        return null;
      }
      this.contexto = creado;
      return creado;
    } catch {
      this.falloCreacion = true;
      return null;
    }
  }

  private depurarVocesExpiradas(ahoraMs: number): void {
    this.vocesActivas = this.vocesActivas.filter((v) => v.expiraMs > ahoraMs);
  }

  private programarNota(
    ctx: ContextoAudioMinimo,
    nota: (typeof SONIDOS)[TipoSonido]['notas'][number],
    gananciaMaestra: number,
    ahoraMs: number,
  ): boolean {
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const inicio = ctx.currentTime + nota.inicioSeg;
      const fin = inicio + nota.duracionSeg;
      const ataque = Math.min(0.015, nota.duracionSeg * 0.25);
      const pico = Math.max(0.001, gananciaMaestra * nota.nivelRelativo);

      osc.type = nota.forma;
      osc.frequency.setValueAtTime(nota.frecuenciaInicial, inicio);
      if (
        typeof nota.frecuenciaFinal === 'number' &&
        nota.frecuenciaFinal !== nota.frecuenciaInicial
      ) {
        osc.frequency.linearRampToValueAtTime(nota.frecuenciaFinal, fin);
      }

      gain.gain.setValueAtTime(0.0001, inicio);
      gain.gain.linearRampToValueAtTime(pico, inicio + ataque);
      gain.gain.linearRampToValueAtTime(0.0001, fin);

      osc.connect(gain);
      gain.connect(ctx.destination);

      const registroVoz = {
        expiraMs: ahoraMs + (nota.inicioSeg + nota.duracionSeg) * 1000 + 25,
      };
      this.vocesActivas.push(registroVoz);

      osc.onended = () => {
        const idx = this.vocesActivas.indexOf(registroVoz);
        if (idx >= 0) {
          this.vocesActivas.splice(idx, 1);
        }
        try {
          osc.disconnect?.();
          gain.disconnect?.();
        } catch {
          // Respaldo silencioso
        }
      };

      osc.start(inicio);
      osc.stop(fin + 0.01);
      return true;
    } catch {
      return false;
    }
  }
}

export const audioEngine = new MotorAudio();
