// Lógica pura del tutorial interactivo de 7 pasos en Jornada 1 (sin Phaser)

import type { ClaveI18n } from '../i18n';
import type { NombreObjetivoUI } from '../ui/targets';
import { DISTANCIA_TUTORIAL } from './balance';
import type { SalaId } from './map';
import { getAjustes, updateAjustes, type Ajustes } from './settings';
import type { EstadoJuego, GameState, GameStateManager } from './state';

export type IdPasoTutorial =
  | 'objetivo'
  | 'moverse'
  | 'ir_estacion'
  | 'usar'
  | 'minijuego'
  | 'elegir'
  | 'cierre';

export type FaseTutorial = 'inactivo' | 'activo' | 'esperando_cierre' | 'completado';

export interface DefinicionPasoTutorial {
  id: IdPasoTutorial;
  numero: number;
  objetivoUI: NombreObjetivoUI;
  pausaReloj: boolean;
  requiereEntendido: boolean;
  textoClave: ClaveI18n;
}

export const PASOS_TUTORIAL: readonly DefinicionPasoTutorial[] = [
  {
    id: 'objetivo',
    numero: 1,
    objetivoUI: 'barras',
    pausaReloj: true,
    requiereEntendido: true,
    textoClave: 'tutorial.objetivoTexto',
  },
  {
    id: 'moverse',
    numero: 2,
    objetivoUI: 'mapa',
    pausaReloj: false,
    requiereEntendido: false,
    textoClave: 'tutorial.moverseTexto',
  },
  {
    id: 'ir_estacion',
    numero: 3,
    objetivoUI: 'estacion-energia',
    pausaReloj: false,
    requiereEntendido: false,
    textoClave: 'tutorial.irEstacionTexto',
  },
  {
    id: 'usar',
    numero: 4,
    objetivoUI: 'boton-usar',
    pausaReloj: false,
    requiereEntendido: false,
    textoClave: 'tutorial.usarTexto',
  },
  {
    id: 'minijuego',
    numero: 5,
    objetivoUI: 'mapa',
    pausaReloj: false,
    requiereEntendido: false,
    textoClave: 'tutorial.minijuegoTexto',
  },
  {
    id: 'elegir',
    numero: 6,
    objetivoUI: 'eleccion',
    pausaReloj: true,
    requiereEntendido: false,
    textoClave: 'tutorial.elegirTexto',
  },
  {
    id: 'cierre',
    numero: 7,
    objetivoUI: 'reloj',
    pausaReloj: true,
    requiereEntendido: true,
    textoClave: 'tutorial.cierreTexto',
  },
] as const;

export function debeIniciarTutorial(
  snap: Readonly<Pick<GameState, 'jornada' | 'modo'>>,
  ajustes: Pick<Ajustes, 'tutorialVisto'> = getAjustes(),
): boolean {
  return snap.jornada === 1 && snap.modo !== 'demo' && !ajustes.tutorialVisto;
}

export interface EstadoTutorialSnapshot {
  fase: FaseTutorial;
  visible: boolean;
  pasoActual: DefinicionPasoTutorial | null;
  indicePaso: number;
  totalPasos: number;
  pausaReloj: boolean;
  distanciaAcumulada: number;
}

type ListenerTutorial = (estado: EstadoTutorialSnapshot) => void;

export class TutorialManager {
  private fase: FaseTutorial = 'inactivo';
  private indicePaso = 0;
  private distanciaAcumulada = 0;
  private cercaDeEnergia = false;
  private estadoJuegoActual: EstadoJuego = 'jugando';
  private listeners = new Set<ListenerTutorial>();
  private persistirVisto: () => void;

  constructor(persistirVisto: () => void = () => updateAjustes({ tutorialVisto: true })) {
    this.persistirVisto = persistirVisto;
  }

  public onCambio(listener: ListenerTutorial): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitir(): void {
    const snap = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snap);
    }
  }

  public getSnapshot(): EstadoTutorialSnapshot {
    const visible = this.fase === 'activo';
    const pasoActual = visible ? PASOS_TUTORIAL[this.indicePaso] ?? null : null;
    return {
      fase: this.fase,
      visible,
      pasoActual,
      indicePaso: this.indicePaso,
      totalPasos: PASOS_TUTORIAL.length,
      pausaReloj: this.estaPausandoReloj(),
      distanciaAcumulada: this.distanciaAcumulada,
    };
  }

  public estaActivo(): boolean {
    return this.fase === 'activo' || this.fase === 'esperando_cierre';
  }

  public estaPausandoReloj(): boolean {
    if (this.fase !== 'activo') {
      return false;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    return Boolean(paso?.pausaReloj);
  }

  public obtenerPasoActual(): DefinicionPasoTutorial | null {
    if (this.fase !== 'activo') {
      return null;
    }
    return PASOS_TUTORIAL[this.indicePaso] ?? null;
  }

  public reiniciarParaTest(): void {
    this.fase = 'inactivo';
    this.indicePaso = 0;
    this.distanciaAcumulada = 0;
    this.cercaDeEnergia = false;
    this.estadoJuegoActual = 'jugando';
    this.emitir();
  }

  public iniciarSiCorresponde(
    snap: Readonly<Pick<GameState, 'jornada' | 'modo' | 'estado'>>,
    ajustes: Pick<Ajustes, 'tutorialVisto'> = getAjustes(),
  ): boolean {
    this.estadoJuegoActual = snap.estado;
    if (!debeIniciarTutorial(snap, ajustes)) {
      if (this.fase !== 'completado') {
        this.fase = 'inactivo';
        this.indicePaso = 0;
        this.distanciaAcumulada = 0;
        this.emitir();
      }
      return false;
    }

    this.fase = 'activo';
    this.indicePaso = 0;
    this.distanciaAcumulada = 0;
    this.cercaDeEnergia = false;
    this.emitir();
    return true;
  }

  public confirmarEntendido(): void {
    if (this.fase !== 'activo') {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (!paso) {
      return;
    }
    if (paso.id === 'objetivo') {
      this.avanzarA('moverse');
    } else if (paso.id === 'cierre') {
      this.completarTutorial();
    }
  }

  public saltar(): void {
    if (!this.estaActivo()) {
      return;
    }
    this.completarTutorial();
  }

  public registrarMovimiento(distanciaPx: number): void {
    if (this.fase !== 'activo' || distanciaPx <= 0) {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (!paso || paso.id !== 'moverse') {
      return;
    }
    this.distanciaAcumulada += distanciaPx;
    if (this.distanciaAcumulada >= DISTANCIA_TUTORIAL) {
      if (this.cercaDeEnergia) {
        this.avanzarA('usar');
      } else {
        this.avanzarA('ir_estacion');
      }
    }
  }

  public registrarProximidadEstacion(
    estacionId: SalaId | null,
    enRadio: boolean,
  ): void {
    this.cercaDeEnergia = estacionId === 'energia' && enRadio;
    if (this.fase !== 'activo') {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (paso?.id === 'ir_estacion' && this.cercaDeEnergia) {
      this.avanzarA('usar');
    }
  }

  public manejarEstadoJuego(estado: EstadoJuego): void {
    this.estadoJuegoActual = estado;
  }

  public obtenerEstadoJuegoActual(): EstadoJuego {
    return this.estadoJuegoActual;
  }

  public alAbrirMinijuego(estacionId?: SalaId): void {
    if (this.fase !== 'activo') {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (paso?.id === 'usar' && (!estacionId || estacionId === 'energia')) {
      this.avanzarA('minijuego');
    }
  }

  public alResultadoMinijuego(
    resultado: 'completa' | 'fallo' | 'salida',
  ): void {
    if (this.fase !== 'activo') {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (paso?.id !== 'minijuego') {
      return;
    }
    // Si el jugador sale o falla, el tutorial se mantiene en el paso 5 (minijuego)
    if (resultado === 'completa') {
      this.avanzarA('elegir');
    } else {
      this.emitir();
    }
  }

  public alConfirmarEleccion(): void {
    if (this.fase !== 'activo') {
      return;
    }
    const paso = PASOS_TUTORIAL[this.indicePaso];
    if (paso?.id !== 'elegir') {
      return;
    }
    // Paso 6 completado: esperamos cierre de jornada sin pausar el reloj
    this.indicePaso = this.buscarIndice('cierre');
    this.fase = 'esperando_cierre';
    this.emitir();
  }

  public alFinJornada(jornada: number): void {
    if (jornada !== 1) {
      return;
    }
    if (this.fase === 'esperando_cierre') {
      this.indicePaso = this.buscarIndice('cierre');
      this.fase = 'activo';
      this.emitir();
    } else if (this.fase === 'activo') {
      this.indicePaso = this.buscarIndice('cierre');
      this.emitir();
    }
  }

  public alEvacuacion(): void {
    if (this.estaActivo()) {
      this.fase = 'inactivo';
      this.emitir();
    }
  }

  public conectarMotor(
    motor: Pick<GameStateManager, 'on' | 'getSnapshot'>,
    ajustes: Pick<Ajustes, 'tutorialVisto'> = getAjustes(),
  ): () => void {
    this.iniciarSiCorresponde(motor.getSnapshot(), ajustes);

    const desuscripciones: Array<() => void> = [
      motor.on('jornada:nueva', (ev) => {
        if (ev.jornada === 1) {
          this.iniciarSiCorresponde(motor.getSnapshot(), getAjustes());
        } else if (this.estaActivo()) {
          this.fase = 'inactivo';
          this.emitir();
        }
      }),
      motor.on('estado:cambio', (ev) => {
        this.manejarEstadoJuego(ev.estado);
      }),
      motor.on('minijuego:abrir', (ev) => {
        this.alAbrirMinijuego(ev.estacionId);
      }),
      motor.on('mision:completa', () => {
        this.alResultadoMinijuego('completa');
      }),
      motor.on('mision:fallo', () => {
        this.alResultadoMinijuego('fallo');
      }),
      motor.on('mision:salida', () => {
        this.alResultadoMinijuego('salida');
      }),
      motor.on('eleccion:confirmada', () => {
        this.alConfirmarEleccion();
      }),
      motor.on('jornada:fin', (ev) => {
        this.alFinJornada(ev.jornada);
      }),
      motor.on('evacuacion', () => {
        this.alEvacuacion();
      }),
    ];

    return () => {
      for (const off of desuscripciones) {
        off();
      }
    };
  }

  private buscarIndice(id: IdPasoTutorial): number {
    const idx = PASOS_TUTORIAL.findIndex((p) => p.id === id);
    return idx >= 0 ? idx : 0;
  }

  private avanzarA(id: IdPasoTutorial): void {
    this.indicePaso = this.buscarIndice(id);
    this.fase = 'activo';
    this.emitir();
  }

  private completarTutorial(): void {
    this.fase = 'completado';
    this.persistirVisto();
    this.emitir();
  }
}

export const tutorialManager = new TutorialManager();
