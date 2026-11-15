// Helper reutilizable de navegación por teclado y anillo de foco visible (>= 3 px)

import Phaser from 'phaser';
import { COLORES, ESPACIADO } from './theme';

export interface ItemFoco {
  x: number;
  y: number;
  ancho: number;
  alto: number;
  radio?: number;
  activar: () => void;
}

export interface OpcionesGestorFoco {
  items: readonly ItemFoco[];
  padre?: Phaser.GameObjects.Container | null;
  onCancelar?: () => void;
  alCambiarFoco?: (indice: number) => void;
  grosorBorde?: number;
  colorBorde?: number;
  mostrarInicial?: boolean;
  resolverFlecha?: (indice: number, codigo: string) => number;
  habilitado?: () => boolean;
}

export class GestorFoco {
  private scene: Phaser.Scene;
  private anillo: Phaser.GameObjects.Graphics;
  private items: readonly ItemFoco[];
  private indice = 0;
  private visible = false;
  private resolverFlecha?: (indice: number, codigo: string) => number;
  private grosorBorde: number;
  private colorBorde: number;
  private onCancelar?: () => void;
  private alCambiarFoco?: (indice: number) => void;
  private habilitado: () => boolean;
  private desuscribirTeclado: (() => void) | null = null;

  constructor(scene: Phaser.Scene, opciones: OpcionesGestorFoco) {
    this.scene = scene;
    this.items = opciones.items;
    this.resolverFlecha = opciones.resolverFlecha;
    this.grosorBorde = Math.max(3, opciones.grosorBorde ?? 4);
    this.colorBorde = opciones.colorBorde ?? COLORES.focoBorde;
    this.onCancelar = opciones.onCancelar;
    this.alCambiarFoco = opciones.alCambiarFoco;
    this.habilitado = opciones.habilitado ?? (() => true);

    this.anillo = scene.add.graphics();
    if (opciones.padre) {
      opciones.padre.add(this.anillo);
    }

    if (opciones.mostrarInicial && this.items.length > 0) {
      this.visible = true;
      this.dibujarAnillo();
    } else {
      this.anillo.setVisible(false);
    }

    this.conectarTeclado();
  }

  public actualizarItems(items: readonly ItemFoco[], mantenerIndice = false): void {
    this.items = items;
    if (this.items.length === 0) {
      this.indice = 0;
      this.visible = false;
      this.anillo.setVisible(false);
      return;
    }
    this.indice = mantenerIndice
      ? Math.max(0, Math.min(this.items.length - 1, this.indice))
      : 0;
    if (this.visible) {
      this.dibujarAnillo();
    }
  }

  public establecerVisible(visible: boolean): void {
    this.visible = visible && this.items.length > 0;
    if (this.visible) {
      this.dibujarAnillo();
    } else {
      this.anillo.setVisible(false);
    }
  }

  public sincronizarIndice(indice: number, mostrar = true): void {
    if (indice < 0 || indice >= this.items.length) {
      return;
    }
    this.indice = indice;
    this.visible = mostrar;
    if (this.visible) {
      this.dibujarAnillo();
    } else {
      this.anillo.setVisible(false);
    }
  }

  public obtenerIndice(): number {
    return this.indice;
  }

  private moverFoco(delta: number): void {
    if (this.items.length === 0) {
      return;
    }
    if (!this.visible) {
      this.visible = true;
      this.indice = delta >= 0 ? 0 : this.items.length - 1;
    } else {
      this.indice =
        (this.indice + delta + this.items.length) % this.items.length;
    }
    this.dibujarAnillo();
    this.alCambiarFoco?.(this.indice);
  }

  private dibujarAnillo(): void {
    const item = this.items[this.indice];
    if (!item || !this.visible) {
      this.anillo.setVisible(false);
      return;
    }

    const margen = 5;
    const radio = (item.radio ?? ESPACIADO.radioBoton) + 4;
    const x = item.x - item.ancho / 2 - margen;
    const y = item.y - item.alto / 2 - margen;
    const w = item.ancho + margen * 2;
    const h = item.alto + margen * 2;

    this.anillo.clear();
    this.anillo.lineStyle(this.grosorBorde + 3, COLORES.fondoLienzo, 0.92);
    this.anillo.strokeRoundedRect(x, y, w, h, radio);
    this.anillo.lineStyle(this.grosorBorde, this.colorBorde, 1);
    this.anillo.strokeRoundedRect(x, y, w, h, radio);
    this.anillo.setVisible(true);
  }

  private conectarTeclado(): void {
    const teclado = this.scene.input.keyboard;
    if (!teclado) {
      return;
    }

    const alPulsar = (evento: KeyboardEvent): void => {
      if (evento.repeat || !this.habilitado()) {
        return;
      }

      if (evento.code === 'Tab') {
        if (this.items.length === 0) {
          return;
        }
        evento.preventDefault();
        this.moverFoco(evento.shiftKey ? -1 : 1);
        return;
      }

      if (this.resolverFlecha && ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(evento.code)) {
        evento.preventDefault();
        this.sincronizarIndice(this.resolverFlecha(this.indice, evento.code));
        return;
      }

      if (evento.code === 'ArrowRight' || evento.code === 'ArrowDown') {
        if (this.items.length === 0) {
          return;
        }
        evento.preventDefault();
        this.moverFoco(1);
        return;
      }

      if (evento.code === 'ArrowLeft' || evento.code === 'ArrowUp') {
        if (this.items.length === 0) {
          return;
        }
        evento.preventDefault();
        this.moverFoco(-1);
        return;
      }

      if (evento.code === 'Enter' || evento.code === 'Space') {
        if (this.items.length === 0) {
          return;
        }
        if (!this.visible) {
          this.establecerVisible(true);
          return;
        }
        evento.preventDefault();
        this.items[this.indice]?.activar();
        return;
      }

      if (evento.code === 'Escape' && this.onCancelar) {
        evento.preventDefault();
        this.onCancelar();
      }
    };

    teclado.on('keydown', alPulsar);
    this.desuscribirTeclado = () => {
      teclado.off('keydown', alPulsar);
    };
  }

  public destroy(): void {
    this.desuscribirTeclado?.();
    this.desuscribirTeclado = null;
    this.anillo.destroy();
  }
}

export function crearGestorFoco(
  scene: Phaser.Scene,
  opciones: OpcionesGestorFoco,
): GestorFoco {
  return new GestorFoco(scene, opciones);
}
