export interface RectMenu { x: number; y: number; ancho: number; alto: number }
export const MENU = {
  texturaPanel: 'menu_panel_estatico',
  ancho: 1280, alto: 720, margen: 48, gap: 16, radio: 16,
  cieloBandas: 90, horizonte: 560, estrellas: 80, semilla: 2026,
  pesoTitulo: '800',
  titulo: 44, subtitulo: 20, texto: 18, boton: 24, icono: 28,
  escalaGrande: 1.25, borde: 3, foco: 4, padding: 24,
  alphaPanel: 0.97, alphaHover: 0.14, alphaBoton: 0.8, alphaSobre: 0.9, alphaPulsado: 0.75,
  arte: {
    banda: 8, bordeEstrella: 4, tamanoMaximoEstrella: 3, cadaEstrellaBrillante: 29,
    brilloEstrella: 0.35, variacionBrillo: 0.4, haloAlpha: 0.08, haloRadio: 8,
    superficie: { x: 640, y: 760, ancho: 1800, alto: 400 },
    relieveBase: { x: 976, y: 560, ancho: 640, alto: 480 },
    crateres: { cantidad: 8, x: 72, pasoX: 168, y: 600, filas: 3, pasoY: 40, ancho: 112, alto: 32, sombraX: 4, sombraY: -3, sombraW: 96, sombraH: 24, bordeAlpha: 0.12, sombraAlpha: 0.3 },
    roca: { x: 56, y: 24, ancho: 16, alto: 8 },
    modulo: { radio: 24, corredor: 20, extremo1: 64, extremo2: 400, centroArriba: 32, centroAbajo: 120, ventanaX: 16, ventanaY: 16, ventanaW: 104, ventanaH: 16, ventanaRadio: 8, ventanaAlpha: 0.3, luces: 4, luzX: 24, luzY: 40, pasoLuz: 24, luzTamano: 8, luzAlpha: 0.85 },
    antena: { x: 968, pie: 176, y: 136, platoX: 960, ancho: 48, alto: 24, extremoX: 984, extremoY: 112, grosor: 4 },
    solares: { posiciones: [728, 1112], y: 128, ancho: 80, alto: 32, lineas: 4, paso: 20, pie: 176 },
  },
  base: { x: 696, y: 176, ancho: 512, alto: 152, moduloW: 136, moduloH: 64, gapX: 32, gapY: 24 },
} as const;
export const ORDEN_FOCO_MENU = ['jugar', 'demo', 'glosario', 'fuentes', 'ajustes', 'creditos', 'es', 'en', 'sonido', 'origen'] as const;
export type AccionMenu = typeof ORDEN_FOCO_MENU[number];
const MENU_RECTANGULOS = {
  panel: [32, 112, 576, 592], titulo: [48, 112, 544, 120], subtitulo: [48, 232, 544, 56],
  chips: [[48, 296, 168, 56], [232, 296, 176, 56], [424, 296, 168, 56]],
  frase: [48, 352, 544, 32], ilustracion: [656, 120, 576, 240], tarjeta: [656, 376, 576, 328],
  mascota: [608, 352, 48, 56], burbuja: [680, 336, 528, 40], demoHint: [48, 544, 544, 32],
  datosTitulo: [728, 400, 480, 40], datosEtiqueta: [728, 440, 480, 32],
  datosEvento: [680, 472, 528, 56], datosFuente: [680, 528, 528, 56], datosSemana: [680, 592, 528, 48],
  jugar: [48, 384, 544, 88], demo: [48, 480, 544, 64],
  es: [1072, 48, 72, 56], en: [1160, 48, 72, 56], sonido: [48, 48, 56, 56], origen: [680, 640, 528, 56],
  secundarios: [[48, 584, 128, 56], [192, 584, 128, 56], [336, 584, 120, 56], [472, 584, 120, 56]],
  secundariosGrandes: [[48, 536, 264, 56], [328, 536, 264, 56], [48, 608, 264, 56], [328, 608, 264, 56]],
  grande: {
    panel: [32, 32, 576, 656], titulo: [128, 48, 464, 120], subtitulo: [48, 176, 544, 56],
    chips: [[48, 240, 168, 56], [232, 240, 176, 56], [424, 240, 168, 56]],
    frase: [48, 296, 544, 32], jugar: [48, 336, 544, 88], demo: [48, 432, 544, 64], demoHint: [48, 496, 544, 32],
  },
} as const;

export function menuLayout(textoGrande = false) {
  const rect = ([x, y, ancho, alto]: readonly [number, number, number, number]): RectMenu => ({ x, y, ancho, alto });
  const r = MENU_RECTANGULOS;
  const v = textoGrande ? r.grande : r;
  const secundarios = (textoGrande ? r.secundariosGrandes : r.secundarios).map(rect);
  return {
    panel: rect(v.panel), titulo: rect(v.titulo), subtitulo: rect(v.subtitulo),
    chips: v.chips.map(rect), frase: rect(v.frase), ilustracion: rect(r.ilustracion), tarjeta: rect(r.tarjeta),
    mascota: rect(r.mascota), burbuja: rect(r.burbuja), demoHint: rect(v.demoHint),
    datosTitulo: rect(r.datosTitulo), datosEtiqueta: rect(r.datosEtiqueta), datosEvento: rect(r.datosEvento),
    datosFuente: rect(r.datosFuente), datosSemana: rect(r.datosSemana),
    interactivos: {
      jugar: rect(v.jugar), demo: rect(v.demo), glosario: secundarios[0], fuentes: secundarios[1],
      ajustes: secundarios[2], creditos: secundarios[3], es: rect(r.es), en: rect(r.en),
      sonido: rect(r.sonido), origen: rect(r.origen),
    },
  };
}
/** Vecino más cercano en la dirección pedida; Tab conserva el orden explícito. */
export function vecinoMenu(rectangulos: readonly RectMenu[], indice: number, codigo: string): number {
  const origen = rectangulos[indice];
  if (!origen) return indice;
  const horizontal = codigo === 'ArrowLeft' || codigo === 'ArrowRight';
  const signo = codigo === 'ArrowLeft' || codigo === 'ArrowUp' ? -1 : 1;
  let elegido = indice;
  let distancia = Infinity;
  rectangulos.forEach((rect, i) => {
    const dx = rect.x + rect.ancho / 2 - origen.x - origen.ancho / 2;
    const dy = rect.y + rect.alto / 2 - origen.y - origen.alto / 2;
    const avance = (horizontal ? dx : dy) * signo;
    const lateral = Math.abs(horizontal ? dy : dx);
    const coste = avance + lateral * 3;
    if (avance > 0 && coste < distancia) { elegido = i; distancia = coste; }
  });
  return elegido;
}
