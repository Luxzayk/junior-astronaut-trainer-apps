import Phaser from 'phaser';
import { generarTexturaMenu, TEXTURA_MENU } from '../art/texturas';
import { audioEngine } from '../audio/audio';
import { SCENE_KEYS } from '../config';
import { obtenerEventoMasRecienteSemana } from '../data/eventosLoader';
import { menuViewModel } from '../ui/menuViewModel';
import { obtenerSemanaActiva } from '../game/semanas';
import { getAjustes, updateAjustes, type Idioma } from '../game/settings';
import { gameState } from '../game/state';
import { t, type ClaveI18n } from '../i18n';
import { crearGestorFoco, type GestorFoco, type ItemFoco } from '../ui/focus';
import { MENU, menuLayout, vecinoMenu, ORDEN_FOCO_MENU, type RectMenu, type AccionMenu } from '../ui/menuLayout';
import { dibujarMascotaLuni } from '../art/mascota';
import { dibujarIconoAire, dibujarIconoEnergia, dibujarIconoEscudo, dibujarIconoSonido } from '../ui/icons';
import { COLORES, COLORES_HEX, FUENTE_FAMILIA } from '../ui/theme';
import { desregistrarObjetivoUI, registrarObjetivoUI } from '../ui/targets';

export function lanzarEscenasJuego(scenePlugin: Phaser.Scenes.ScenePlugin): void {
  scenePlugin.launch(SCENE_KEYS.base);
  scenePlugin.launch(SCENE_KEYS.hud);
  scenePlugin.launch(SCENE_KEYS.minigame);
  scenePlugin.launch(SCENE_KEYS.choice);
  scenePlugin.launch(SCENE_KEYS.event);
  scenePlugin.launch(SCENE_KEYS.apagon);
  scenePlugin.launch(SCENE_KEYS.overlay);
  scenePlugin.launch(SCENE_KEYS.informe);
  scenePlugin.launch(SCENE_KEYS.tutorial);

  scenePlugin.bringToTop(SCENE_KEYS.hud);
  scenePlugin.bringToTop(SCENE_KEYS.minigame);
  scenePlugin.bringToTop(SCENE_KEYS.choice);
  scenePlugin.bringToTop(SCENE_KEYS.event);
  scenePlugin.bringToTop(SCENE_KEYS.apagon);
  scenePlugin.bringToTop(SCENE_KEYS.overlay);
  scenePlugin.bringToTop(SCENE_KEYS.informe);
  scenePlugin.bringToTop(SCENE_KEYS.tutorial);
}

export function detenerEscenasJuego(scenePlugin: Phaser.Scenes.ScenePlugin): void {
  const claves = [
    SCENE_KEYS.tutorial,
    SCENE_KEYS.informe,
    SCENE_KEYS.overlay,
    SCENE_KEYS.apagon,
    SCENE_KEYS.event,
    SCENE_KEYS.choice,
    SCENE_KEYS.minigame,
    SCENE_KEYS.hud,
    SCENE_KEYS.base,
  ];
  for (const clave of claves) {
    if (scenePlugin.isActive(clave)) {
      scenePlugin.stop(clave);
    }
  }
}

export class MenuScene extends Phaser.Scene {
  private gestorFoco: GestorFoco | null = null;
  private items: ItemFoco[] = [];
  constructor() { super(SCENE_KEYS.menu); }

  public create(): void {
    this.items = [];
    const ajustes = getAjustes();
    const layout = menuLayout(ajustes.textoGrande);
    generarTexturaMenu(this);
    this.add.image(0, 0, TEXTURA_MENU).setOrigin(0);
    const panel = this.add.graphics();
    panel.fillStyle(COLORES.panelHud, MENU.alphaPanel);
    panel.fillRoundedRect(layout.panel.x, layout.panel.y, layout.panel.ancho, layout.panel.alto, MENU.radio);
    this.texto(layout.titulo, t('menu.titulo'), MENU.titulo, true).setLineSpacing(-MENU.gap).setFontStyle(MENU.pesoTitulo);
    this.texto(layout.subtitulo, t('menu.subtitulo'), MENU.subtitulo, false, COLORES_HEX.textoSecundario);
    const recursos = [
      { clave: 'recursos.aire' as const, dibujar: dibujarIconoAire, color: COLORES.aire },
      { clave: 'recursos.energia' as const, dibujar: dibujarIconoEnergia, color: COLORES.energia },
      { clave: 'recursos.escudo' as const, dibujar: dibujarIconoEscudo, color: COLORES.escudo },
    ];
    recursos.forEach((recurso, indice) => {
      const rect = layout.chips[indice];
      panel.fillStyle(COLORES.pistaBarra);
      panel.fillRoundedRect(rect.x, rect.y, rect.ancho, rect.alto, MENU.radio);
      recurso.dibujar(panel, rect.x + MENU.padding, rect.y + rect.alto / 2, MENU.icono, recurso.color);
      const etiqueta = this.texto({ ...rect, x: rect.x + MENU.padding * 2, ancho: rect.ancho - MENU.padding * 2 - MENU.gap / 2 }, t(recurso.clave), MENU.texto, true);
      etiqueta.y = rect.y + (rect.alto - etiqueta.height) / 2;
    });
    this.texto(layout.frase, t('menu.costoDecision'), MENU.texto, false, COLORES_HEX.textoSecundario);
    this.texto(layout.demoHint, t('menu.demoHint'), MENU.texto, false, COLORES_HEX.textoSecundario);
    panel.fillStyle(COLORES.panelHud, MENU.alphaPanel);
    panel.fillRoundedRect(layout.burbuja.x, layout.burbuja.y, layout.burbuja.ancho, layout.burbuja.alto, MENU.radio);
    this.texto(layout.burbuja, t('menu.listoComandante'), MENU.texto);
    dibujarMascotaLuni(panel, layout.mascota.x + layout.mascota.ancho / 2, layout.mascota.y + layout.mascota.alto / 2, 1, 'contenta');
    const irASemanas = (): void => { this.scene.start(SCENE_KEYS.semanas); };
    const iniciarDemo = (): void => {
      gameState.iniciarDemo(obtenerSemanaActiva().id);
      lanzarEscenasJuego(this.scene);
      this.scene.stop();
    };
    const abrir = (clave: string): void => { this.scene.start(clave, { volverA: 'menu' }); };
    this.boton('jugar', layout.interactivos.jugar, t('menu.jugarSemana'), 'play', irASemanas, true);
    this.boton('demo', layout.interactivos.demo, t('menu.demo4Min'), 'reloj', iniciarDemo);
    const secundarios: ReadonlyArray<{ id: AccionMenu; texto: ClaveI18n; escena: string; icono: IconoMenu }> = [
      { id: 'glosario', texto: 'menu.glosario', escena: SCENE_KEYS.glosario, icono: 'libro' },
      { id: 'fuentes', texto: 'menu.fuentes', escena: SCENE_KEYS.fuentes, icono: 'documento' },
      { id: 'ajustes', texto: 'menu.ajustes', escena: SCENE_KEYS.ajustes, icono: 'ajustes' },
      { id: 'creditos', texto: 'menu.creditos', escena: SCENE_KEYS.creditos, icono: 'estrella' },
    ];
    secundarios.forEach(item => this.boton(item.id, layout.interactivos[item.id], t(item.texto), item.icono, () => abrir(item.escena)));
    const cambiarIdioma = (idioma: Idioma): void => {
      updateAjustes({ idioma });
      this.scene.restart();
    };
    this.boton('es', layout.interactivos.es, t('menu.idiomaEs'), 'idioma', () => cambiarIdioma('es'), false, ajustes.idioma === 'es');
    this.boton('en', layout.interactivos.en, t('menu.idiomaEn'), 'idioma', () => cambiarIdioma('en'), false, ajustes.idioma === 'en');
    this.boton('sonido', layout.interactivos.sonido, '', 'sonido', () => {
      updateAjustes({ sonido: !getAjustes().sonido });
      this.scene.restart();
    });
    const semana = obtenerSemanaActiva();
    const datos = menuViewModel(obtenerEventoMasRecienteSemana(semana.id), semana, ajustes.idioma);
    panel.fillStyle(COLORES.panelHud, MENU.alphaPanel);
    panel.fillRoundedRect(layout.tarjeta.x, layout.tarjeta.y, layout.tarjeta.ancho, layout.tarjeta.alto, MENU.radio);
    panel.lineStyle(MENU.borde / 1.5, COLORES.bordePanel);
    panel.strokeRoundedRect(layout.tarjeta.x, layout.tarjeta.y, layout.tarjeta.ancho, layout.tarjeta.alto, MENU.radio);
    const solX = layout.tarjeta.x + MENU.padding * 1.5;
    const solY = layout.datosTitulo.y + MENU.gap;
    panel.lineStyle(MENU.borde / 1.5, COLORES.textoPrincipal);
    panel.strokeCircle(solX, solY, MENU.icono / 3);
    for (let i = 0; i < MENU.arte.modulo.luces * 2; i++) {
      const a = i * Math.PI / 4;
      panel.lineBetween(solX + Math.cos(a) * MENU.icono / 2, solY + Math.sin(a) * MENU.icono / 2,
        solX + Math.cos(a) * MENU.icono / 1.5, solY + Math.sin(a) * MENU.icono / 1.5);
    }
    dibujarIconoMenu(panel, 'documento', solX, layout.datosEtiqueta.y + MENU.gap, MENU.subtitulo, COLORES.textoSecundario);
    this.texto(layout.datosTitulo, datos.titulo, MENU.subtitulo, true);
    this.texto(layout.datosEtiqueta, datos.etiqueta, MENU.texto, true, COLORES_HEX.textoSecundario);
    this.texto(layout.datosEvento, datos.linea1, MENU.texto);
    this.texto(layout.datosFuente, datos.linea2, MENU.texto, false, COLORES_HEX.textoSecundario);
    this.texto(layout.datosSemana, datos.semana, MENU.texto);
    this.boton('origen', layout.interactivos.origen, t('menu.origenDatos'), 'documento', () => abrir(SCENE_KEYS.fuentes));
    const clavePanel = `${MENU.texturaPanel}-${ajustes.textoGrande}`;
    if (!this.textures.exists(clavePanel)) panel.generateTexture(clavePanel, MENU.ancho, MENU.alto);
    panel.destroy();
    const capaPanel = this.add.image(0, 0, clavePanel).setOrigin(0);
    this.children.moveTo(capaPanel, 1);
    this.gestorFoco = crearGestorFoco(this, {
      items: this.items, mostrarInicial: true, colorBorde: COLORES.focoMenu, grosorBorde: MENU.foco,
      resolverFlecha: (indice, codigo) => vecinoMenu(ORDEN_FOCO_MENU.slice(0, this.items.length).map(id => layout.interactivos[id]), indice, codigo),
    });
    this.events.once('shutdown', () => {
      this.gestorFoco?.destroy();
      this.gestorFoco = null;
      desregistrarObjetivoUI('menu-jugar');
      desregistrarObjetivoUI('menu-demo');
    });
  }

  private texto(rect: RectMenu, contenido: string, tamano: number, negrita = false, color: string = COLORES_HEX.textoPrincipal): Phaser.GameObjects.Text {
    return this.add.text(rect.x, rect.y, contenido, {
      fontFamily: FUENTE_FAMILIA, fontSize: tamano * (getAjustes().textoGrande ? MENU.escalaGrande : 1),
      fontStyle: negrita ? 'bold' : 'normal', color,
      wordWrap: { width: rect.ancho, useAdvancedWrap: true },
      lineSpacing: -MENU.gap / 2,
    });
  }

  private boton(id: AccionMenu, rect: RectMenu, etiqueta: string, icono: IconoMenu, activar: () => void, principal = false, seleccionado = false): void {
    const indice = this.items.length;
    const g = this.add.graphics();
    const demo = id === 'demo';
    const controlIdioma = icono === 'idioma';
    const color = principal || seleccionado ? COLORES.fondoLienzo : COLORES.textoPrincipal;
    g.fillStyle(principal ? COLORES.ok : seleccionado ? COLORES.aire : COLORES.panelHud, principal || seleccionado ? 1 : MENU.alphaBoton);
    g.fillRoundedRect(rect.x, rect.y, rect.ancho, rect.alto, MENU.radio);
    if (!principal) {
      g.lineStyle(demo ? MENU.borde : MENU.borde / 2, demo ? COLORES.aire : COLORES.bordePanel);
      g.strokeRoundedRect(rect.x, rect.y, rect.ancho, rect.alto, MENU.radio);
    }
    if (icono === 'sonido') {
      dibujarIconoSonido(g, rect.x + rect.ancho / 2, rect.y + rect.alto / 2, MENU.icono, color, getAjustes().sonido);
    } else if (controlIdioma) {
      if (seleccionado) {
        const x = rect.x + rect.ancho - MENU.gap;
        const y = rect.y + MENU.gap;
        g.lineStyle(MENU.borde, COLORES.fondoLienzo);
        g.lineBetween(x - MENU.gap / 2, y, x - MENU.gap / 4, y + MENU.gap / 4);
        g.lineBetween(x - MENU.gap / 4, y + MENU.gap / 4, x + MENU.gap / 4, y - MENU.gap / 4);
      }
    } else dibujarIconoMenu(g, icono, rect.x + (principal || demo ? MENU.padding : MENU.gap), rect.y + rect.alto / 2, principal || demo ? MENU.icono : MENU.subtitulo, color);
    const pequeno = !principal && !demo;
    const inset = controlIdioma ? MENU.gap : pequeno ? MENU.icono + MENU.gap / 2 : MENU.padding * 3;
    const texto = this.texto({ ...rect, x: rect.x + inset, ancho: rect.ancho - inset - MENU.gap / 2 }, etiqueta,
      pequeno ? MENU.texto : MENU.boton, principal || demo,
      principal || seleccionado ? COLORES_HEX.botonTextoOscuro : COLORES_HEX.textoPrincipal);
    texto.y = rect.y + (rect.alto - texto.height) / 2;
    if (controlIdioma) texto.x = rect.x + (rect.ancho - texto.width) / 2;
    const zona = this.add.zone(rect.x + rect.ancho / 2, rect.y + rect.alto / 2, rect.ancho, rect.alto).setInteractive({ useHandCursor: true });
    zona.on('pointerover', () => { g.setAlpha(MENU.alphaSobre); this.gestorFoco?.sincronizarIndice(indice, false); });
    zona.on('pointerout', () => g.setAlpha(1));
    zona.on('pointerdown', () => { g.setAlpha(MENU.alphaPulsado); audioEngine.registrarGestoUsuario(); audioEngine.reproducir('clic'); activar(); });
    this.items.push({ x: zona.x, y: zona.y, ancho: rect.ancho, alto: rect.alto, activar });
    if (id === 'jugar' || id === 'demo') registrarObjetivoUI(`menu-${id}`, rect);
  }
}

type IconoMenu = 'idioma' | 'sonido' | 'play' | 'reloj' | 'libro' | 'documento' | 'ajustes' | 'estrella';
function dibujarIconoMenu(g: Phaser.GameObjects.Graphics, tipo: IconoMenu, x: number, y: number, tamano: number, color: number): void {
  const r = tamano / 2;
  g.lineStyle(MENU.borde / 1.5, color);
  g.fillStyle(color);
  switch (tipo) {
    case 'play': g.fillTriangle(x - r / 2, y - r, x - r / 2, y + r, x + r, y); break;
    case 'reloj': g.strokeCircle(x, y, r); g.lineBetween(x, y, x, y - r / 1.5); g.lineBetween(x, y, x + r / 2, y); break;
    case 'libro':
      g.strokeRoundedRect(x - r, y - r, tamano, tamano, r / 4); g.lineBetween(x, y - r, x, y + r); break;
    case 'documento':
      g.strokeRoundedRect(x - r, y - r, tamano, tamano, r / 4);
      g.lineBetween(x - r / 2, y - r / 3, x + r / 2, y - r / 3);
      g.lineBetween(x - r / 2, y + r / 3, x + r / 2, y + r / 3); break;
    case 'ajustes':
      g.strokeCircle(x, y, r / 1.5); g.strokeCircle(x, y, r / 3);
      for (let i = 0; i < MENU.arte.modulo.luces * 2; i++) {
        const a = i * Math.PI / 4;
        g.lineBetween(x + Math.cos(a) * r / 1.5, y + Math.sin(a) * r / 1.5, x + Math.cos(a) * r, y + Math.sin(a) * r);
      } break;
    case 'estrella': {
      const puntos = Array.from({ length: 10 }, (_, i) => {
        const a = i * Math.PI / 5 - Math.PI / 2;
        const radio = i % 2 ? r / 2 : r;
        return new Phaser.Math.Vector2(x + Math.cos(a) * radio, y + Math.sin(a) * radio);
      });
      g.strokePoints(puntos, true); break;
    }
  }
}
