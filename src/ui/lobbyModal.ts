// Modal corto del Lobby: bitácora, dato NASA/glosario y sintonizar antena

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  localEventosProvider,
  obtenerTextoFuenteCurado,
  obtenerTextoNinosCurado,
} from '../data/eventosLoader';
import {
  filtrarEntradasPorJornada,
  type EntradaBitacora,
} from '../game/bitacora';
import {
  obtenerTerminoGlosario,
  type IdTerminoGlosario,
} from '../game/glosario';
import { obtenerEventoDeJornada } from '../game/missions';
import { getAjustes } from '../game/settings';
import { gameState } from '../game/state';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from './focus';
import { dibujarIconoLobby } from './icons';
import {
  COLORES,
  COLORES_HEX,
  escalarTamanoTexto,
  ESPACIADO,
  FUENTE_FAMILIA,
  OVERLAY_METRICAS,
  TAMANOS_TEXTO,
} from './theme';

const TERMINOS_POR_JORNADA: readonly IdTerminoGlosario[] = [
  'jornada',
  'soporte_vida',
  'fulguracion',
  'modulo_danado',
  'escudo',
];

export interface OpcionesModalLobby {
  padre?: Phaser.GameObjects.Container | null;
  alAbrir?: () => void;
  alCerrar?: () => void;
  alAviso?: (mensaje: string) => void;
}

export interface ControlModalLobby {
  abrir(): void;
  cerrar(): void;
  estaAbierto(): boolean;
  destroy(): void;
}

type VistaLobby = 'menu' | 'bitacora' | 'dato' | 'antena';

function formatearLineaBitacora(entrada: EntradaBitacora): string {
  return t('lobby.bitacoraLinea', {
    tipo: entrada.tipo,
    id: entrada.id,
    aire: entrada.deltas.aire,
    energia: entrada.deltas.energia,
    escudo: entrada.deltas.escudo,
  });
}

export function crearModalLobby(
  scene: Phaser.Scene,
  opciones: OpcionesModalLobby = {},
): ControlModalLobby {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const ancho = 680;
  const alto = 420;

  const raiz = scene.add.container(0, 0);
  if (opciones.padre) {
    opciones.padre.add(raiz);
  }
  raiz.setVisible(false);

  const telon = scene.add
    .rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, COLORES.fondoLienzo, 0.8)
    .setInteractive();

  const panel = scene.add.graphics();
  panel.fillStyle(COLORES.panelHud, 1);
  panel.fillRoundedRect(
    cx - ancho / 2,
    cy - alto / 2,
    ancho,
    alto,
    ESPACIADO.radioPanel,
  );
  panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.lobby, 1);
  panel.strokeRoundedRect(
    cx - ancho / 2,
    cy - alto / 2,
    ancho,
    alto,
    ESPACIADO.radioPanel,
  );

  const icono = scene.add.graphics();
  dibujarIconoLobby(icono, cx - ancho / 2 + 42, cy - alto / 2 + 40, 28, COLORES.lobby);

  const textoTitulo = scene.add
    .text(cx - ancho / 2 + 68, cy - alto / 2 + 40, '', {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${TAMANOS_TEXTO.boton}px`,
      fontStyle: 'bold',
      color: COLORES_HEX.lobby,
    })
    .setOrigin(0, 0.5);

  const textoCuerpo = scene.add
    .text(cx, cy - 20, '', {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${TAMANOS_TEXTO.subtitulo}px`,
      color: COLORES_HEX.textoPrincipal,
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: ancho - 72 },
    })
    .setOrigin(0.5);

  const botonesRoot = scene.add.container(0, 0);
  raiz.add([telon, panel, icono, textoTitulo, textoCuerpo, botonesRoot]);

  let vista: VistaLobby = 'menu';
  let pasoAntena = 0;
  let gestorFoco: GestorFoco | null = null;

  const limpiarBotones = (): void => {
    botonesRoot.removeAll(true);
    if (gestorFoco) {
      gestorFoco.destroy();
      gestorFoco = null;
    }
  };

  const cerrar = (): void => {
    if (!raiz.visible) {
      return;
    }
    raiz.setVisible(false);
    limpiarBotones();
    opciones.alCerrar?.();
  };

  const crearBoton = (
    x: number,
    y: number,
    etiqueta: string,
    alPulsar: () => void,
    deshabilitado = false,
  ): { contenedor: Phaser.GameObjects.Container; item: ItemFoco } => {
    const btnW = 280;
    const btnH = 52;
    const fondo = scene.add.graphics();
    const color = deshabilitado ? COLORES.bordePanel : COLORES.aire;
    fondo.fillStyle(color, deshabilitado ? 0.45 : 1);
    fondo.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, ESPACIADO.radioBoton);
    fondo.lineStyle(2, COLORES.bordePanel, 1);
    fondo.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, ESPACIADO.radioBoton);

    const label = scene.add
      .text(0, 0, etiqueta, {
        fontFamily: FUENTE_FAMILIA,
        fontSize: `${TAMANOS_TEXTO.boton - 2}px`,
        fontStyle: 'bold',
        color: COLORES_HEX.botonTextoOscuro,
        align: 'center',
        wordWrap: { width: btnW - 16 },
      })
      .setOrigin(0.5);

    const zona = scene.add.zone(0, 0, btnW, btnH);
    if (!deshabilitado) {
      zona.setInteractive({ useHandCursor: true });
      zona.on('pointerdown', alPulsar);
    }

    const contenedor = scene.add.container(x, y, [fondo, label, zona]);
    botonesRoot.add(contenedor);

    return {
      contenedor,
      item: {
        x,
        y,
        ancho: btnW,
        alto: btnH,
        activar: deshabilitado ? () => undefined : alPulsar,
      },
    };
  };

  const aplicarTipografia = (): void => {
    const grande = getAjustes().textoGrande;
    textoTitulo.setFontSize(escalarTamanoTexto(24, grande, 28));
    textoCuerpo.setFontSize(escalarTamanoTexto(18, grande, 22));
  };

  const renderMenu = (): void => {
    vista = 'menu';
    pasoAntena = 0;
    limpiarBotones();
    aplicarTipografia();
    textoTitulo.setText(t('lobby.titulo'));
    textoCuerpo.setText('');

    const snap = gameState.getSnapshot();
    const antenaHecha = snap.antenaSintonizada;
    const items: ItemFoco[] = [];
    const y0 = cy - 40;

    items.push(
      crearBoton(cx, y0, t('lobby.bitacora'), () => renderBitacora()).item,
    );
    items.push(
      crearBoton(cx, y0 + 62, t('lobby.datoDia'), () => renderDato()).item,
    );
    items.push(
      crearBoton(
        cx,
        y0 + 124,
        antenaHecha ? t('lobby.sintonizarHecho') : t('lobby.sintonizar'),
        () => renderAntena(),
        antenaHecha,
      ).item,
    );
    items.push(crearBoton(cx, cy + alto / 2 - 48, t('lobby.cerrar'), cerrar).item);

    gestorFoco = crearGestorFoco(scene, {
      items,
      padre: raiz,
      mostrarInicial: true,
      habilitado: () => raiz.visible,
      onCancelar: cerrar,
    });
  };

  const renderBitacora = (): void => {
    vista = 'bitacora';
    limpiarBotones();
    aplicarTipografia();
    textoTitulo.setText(t('lobby.bitacora'));
    const snap = gameState.getSnapshot();
    const entradas = filtrarEntradasPorJornada(snap.bitacora, snap.jornada).slice(
      -5,
    );
    textoCuerpo.setText(
      entradas.length === 0
        ? t('lobby.bitacoraVacia')
        : entradas.map(formatearLineaBitacora).join('\n'),
    );
    const items: ItemFoco[] = [
      crearBoton(cx, cy + alto / 2 - 48, t('comun.volver'), renderMenu).item,
    ];
    gestorFoco = crearGestorFoco(scene, {
      items,
      padre: raiz,
      mostrarInicial: true,
      habilitado: () => raiz.visible,
      onCancelar: renderMenu,
    });
  };

  const renderDato = (): void => {
    vista = 'dato';
    limpiarBotones();
    aplicarTipografia();
    const snap = gameState.getSnapshot();
    const eventoDef = obtenerEventoDeJornada(snap.jornada);
    const idioma = getAjustes().idioma;

    if (eventoDef?.tipo === 'clima') {
      const curado = localEventosProvider.obtenerPorSemanaYJornada(
        snap.semanaId,
        snap.jornada,
      );
      textoTitulo.setText(t('lobby.datoNasaTitulo'));
      const cuerpo = [
        obtenerTextoNinosCurado(curado, idioma),
        obtenerTextoFuenteCurado(curado, idioma),
      ]
        .filter((s) => s.trim().length > 0)
        .join('\n\n');
      textoCuerpo.setText(cuerpo);
    } else {
      const idTermino =
        TERMINOS_POR_JORNADA[
          Math.max(0, Math.min(TERMINOS_POR_JORNADA.length - 1, snap.jornada - 1))
        ] ?? 'jornada';
      const termino = obtenerTerminoGlosario(idTermino);
      textoTitulo.setText(t('lobby.glosarioTitulo'));
      textoCuerpo.setText(
        termino
          ? `${termino.nombre[idioma]}\n\n${termino.definicion[idioma]}`
          : '',
      );
    }

    const items: ItemFoco[] = [
      crearBoton(cx, cy + alto / 2 - 48, t('comun.volver'), renderMenu).item,
    ];
    gestorFoco = crearGestorFoco(scene, {
      items,
      padre: raiz,
      mostrarInicial: true,
      habilitado: () => raiz.visible,
      onCancelar: renderMenu,
    });
  };

  const completarAntena = (): void => {
    const ok = gameState.sintonizarAntena();
    if (!ok) {
      renderMenu();
      return;
    }
    const snap = gameState.getSnapshot();
    const eventoDef = obtenerEventoDeJornada(snap.jornada);
    let aviso: string;
    if (eventoDef && !snap.eventoDisparadoEnJornada) {
      const faltan = Math.max(0, Math.ceil(eventoDef.segundo - snap.segundos));
      aviso = t('lobby.avisoEvento', { segundos: faltan });
    } else {
      aviso = t('lobby.avisoSinEvento');
    }
    const mensaje = t('lobby.sintonizarOk', { aviso });
    opciones.alAviso?.(mensaje);
    cerrar();
  };

  const renderAntena = (): void => {
    vista = 'antena';
    limpiarBotones();
    aplicarTipografia();
    textoTitulo.setText(t('lobby.sintonizar'));
    if (pasoAntena === 0) {
      textoCuerpo.setText(t('lobby.sintonizarPaso1'));
      const items: ItemFoco[] = [
        crearBoton(cx, cy + 40, t('lobby.sintonizarPaso1'), () => {
          pasoAntena = 1;
          renderAntena();
        }).item,
        crearBoton(cx, cy + alto / 2 - 48, t('comun.volver'), renderMenu).item,
      ];
      gestorFoco = crearGestorFoco(scene, {
        items,
        padre: raiz,
        mostrarInicial: true,
        habilitado: () => raiz.visible,
        onCancelar: renderMenu,
      });
      return;
    }
    textoCuerpo.setText(t('lobby.sintonizarPaso2'));
    const items: ItemFoco[] = [
      crearBoton(cx, cy + 40, t('lobby.sintonizarPaso2'), completarAntena).item,
      crearBoton(cx, cy + alto / 2 - 48, t('comun.volver'), renderMenu).item,
    ];
    gestorFoco = crearGestorFoco(scene, {
      items,
      padre: raiz,
      mostrarInicial: true,
      habilitado: () => raiz.visible,
      onCancelar: renderMenu,
    });
  };

  const abrir = (): void => {
    if (opciones.padre) {
      opciones.padre.bringToTop(raiz);
    } else {
      raiz.setDepth(500);
    }
    raiz.setVisible(true);
    renderMenu();
    opciones.alAbrir?.();
  };

  telon.on('pointerdown', () => {
    if (vista === 'menu') {
      cerrar();
    }
  });

  return {
    abrir,
    cerrar,
    estaAbierto: () => raiz.visible,
    destroy: () => {
      limpiarBotones();
      raiz.destroy(true);
    },
  };
}
