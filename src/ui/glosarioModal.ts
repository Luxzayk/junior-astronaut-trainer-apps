// Modal ligero de glosario para EventScene y OverlayScene (accesible y bilingüe)

import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import {
  obtenerTerminoGlosario,
  type IdTerminoGlosario,
} from '../game/glosario';
import { getAjustes, type Idioma } from '../game/settings';
import { t } from '../i18n';
import { crearGestorFoco, type GestorFoco } from './focus';
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

export interface OpcionesModalGlosario {
  padre?: Phaser.GameObjects.Container | null;
  alAbrir?: () => void;
  alCerrar?: () => void;
}

export interface ControlModalGlosario {
  abrir(idTermino: IdTerminoGlosario, idioma?: Idioma): void;
  cerrar(): void;
  estaAbierto(): boolean;
  destroy(): void;
}

export function crearModalGlosario(
  scene: Phaser.Scene,
  opciones: OpcionesModalGlosario = {},
): ControlModalGlosario {
  const cx = GAME_WIDTH / 2;
  const cy = GAME_HEIGHT / 2;
  const ancho = 640;
  const alto = 290;

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
  panel.lineStyle(OVERLAY_METRICAS.bordeGrosor, COLORES.aire, 1);
  panel.strokeRoundedRect(
    cx - ancho / 2,
    cy - alto / 2,
    ancho,
    alto,
    ESPACIADO.radioPanel,
  );

  const icono = scene.add.graphics();
  dibujarIconoLobby(icono, cx - ancho / 2 + 42, cy - alto / 2 + 44, 28, COLORES.aire);

  const textoTitulo = scene.add
    .text(cx - ancho / 2 + 68, cy - alto / 2 + 44, '', {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${TAMANOS_TEXTO.boton}px`,
      fontStyle: 'bold',
      color: COLORES_HEX.aire,
    })
    .setOrigin(0, 0.5);

  const textoDefinicion = scene.add
    .text(cx, cy - 8, '', {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${TAMANOS_TEXTO.subtitulo}px`,
      fontStyle: 'normal',
      color: COLORES_HEX.textoPrincipal,
      align: 'center',
      lineSpacing: 8,
      wordWrap: { width: ancho - 64 },
    })
    .setOrigin(0.5);

  const btnW = 240;
  const btnH = 58;
  const btnY = cy + alto / 2 - 48;

  const btnFondo = scene.add.graphics();
  const dibujarBoton = (hover: boolean): void => {
    btnFondo.clear();
    btnFondo.fillStyle(COLORES.aire, hover ? 0.9 : 1);
    btnFondo.fillRoundedRect(
      -btnW / 2,
      -btnH / 2,
      btnW,
      btnH,
      ESPACIADO.radioBoton,
    );
    btnFondo.lineStyle(2, COLORES.bordePanel, 1);
    btnFondo.strokeRoundedRect(
      -btnW / 2,
      -btnH / 2,
      btnW,
      btnH,
      ESPACIADO.radioBoton,
    );
  };
  dibujarBoton(false);

  const btnTexto = scene.add
    .text(0, 0, t('comun.entendido'), {
      fontFamily: FUENTE_FAMILIA,
      fontSize: `${TAMANOS_TEXTO.boton}px`,
      fontStyle: 'bold',
      color: COLORES_HEX.botonTextoOscuro,
    })
    .setOrigin(0.5);

  const btnZona = scene.add
    .zone(0, 0, btnW, btnH)
    .setInteractive({ useHandCursor: true });

  const btnContenedor = scene.add.container(cx, btnY, [
    btnFondo,
    btnTexto,
    btnZona,
  ]);

  raiz.add([telon, panel, icono, textoTitulo, textoDefinicion, btnContenedor]);

  const cerrar = (): void => {
    if (!raiz.visible) {
      return;
    }
    raiz.setVisible(false);
    gestorFoco.establecerVisible(false);
    opciones.alCerrar?.();
  };

  const gestorFoco: GestorFoco = crearGestorFoco(scene, {
    items: [
      {
        x: cx,
        y: btnY,
        ancho: btnW,
        alto: btnH,
        activar: cerrar,
      },
    ],
    padre: raiz,
    mostrarInicial: true,
    habilitado: () => raiz.visible,
    onCancelar: cerrar,
  });

  btnZona.on('pointerover', () => {
    dibujarBoton(true);
    if (!getAjustes().movimientoReducido) {
      btnContenedor.setScale(1.02);
    }
  });
  btnZona.on('pointerout', () => {
    dibujarBoton(false);
    btnContenedor.setScale(1);
  });
  btnZona.on('pointerdown', () => {
    cerrar();
  });

  const abrir = (idTermino: IdTerminoGlosario, idioma?: Idioma): void => {
    const termino = obtenerTerminoGlosario(idTermino);
    if (!termino) {
      return;
    }
    const ajustes = getAjustes();
    const lang = idioma ?? ajustes.idioma;
    const textoGrande = ajustes.textoGrande;

    textoTitulo.setText(termino.nombre[lang]);
    textoTitulo.setFontSize(escalarTamanoTexto(24, textoGrande, 28));

    textoDefinicion.setText(termino.definicion[lang]);
    textoDefinicion.setFontSize(escalarTamanoTexto(20, textoGrande, 24));

    btnTexto.setText(t('comun.entendido', undefined, lang));
    btnTexto.setFontSize(
      escalarTamanoTexto(TAMANOS_TEXTO.boton, textoGrande, 26),
    );

    if (opciones.padre) {
      opciones.padre.bringToTop(raiz);
    } else {
      raiz.setDepth(500);
    }
    raiz.setVisible(true);
    gestorFoco.sincronizarIndice(0, true);
    opciones.alAbrir?.();
  };

  return {
    abrir,
    cerrar,
    estaAbierto: () => raiz.visible,
    destroy: () => {
      gestorFoco.destroy();
      raiz.destroy(true);
    },
  };
}
