// Paleta visual, tipografía y métricas de interfaz

export const COLORES_HEX = {
  fondoLienzo: '#0B1020',
  panelHud: '#141B34',
  bordePanel: '#2A3566',
  textoPrincipal: '#EAF0FF',
  textoSecundario: '#9FB0E0',
  aire: '#4FC3F7',
  energia: '#FFD54F',
  escudo: '#B388FF',
  aviso: '#FF9800',
  peligro: '#FF6666',
  ok: '#69F0AE',
  focoBorde: '#FFD54F',
  focoSecundario: '#4FC3F7',
  sueloSala: '#3A4160',
  baldosaLinea: '#333A57',
  sueloPasillo: '#2F3550',
  tanque: '#81D4FA',
  lobby: '#EAF0FF',
  refugio: '#FF9800',
  craterOscuro: '#070B16',
  craterBorde: '#131B36',
  botonFondo: '#1F2A4D',
  botonHover: '#2B3A6A',
  botonTextoOscuro: '#0B1020',
  astronautaTraje: '#F4F7FF',
  astronautaSombraTraje: '#CBD5F0',
  astronautaVisor: '#1E3A5F',
  astronautaReflejo: '#EAF6FF',
  pistaBarra: '#0D1326',
} as const;

export const COLORES = {
  fondoLienzo: 0x0b1020,
  panelHud: 0x141b34,
  bordePanel: 0x2a3566,
  textoPrincipal: 0xeaf0ff,
  textoSecundario: 0x9fb0e0,
  aire: 0x4fc3f7,
  energia: 0xffd54f,
  escudo: 0xb388ff,
  aviso: 0xff9800,
  peligro: 0xff6666,
  ok: 0x69f0ae,
  focoBorde: 0xffd54f,
  focoSecundario: 0x4fc3f7,
  sueloSala: 0x3a4160,
  baldosaLinea: 0x333a57,
  sueloPasillo: 0x2f3550,
  tanque: 0x81d4fa,
  lobby: 0xeaf0ff,
  refugio: 0xff9800,
  craterOscuro: 0x070b16,
  craterBorde: 0x131b36,
  botonFondo: 0x1f2a4d,
  botonHover: 0x2b3a6a,
  astronautaTraje: 0xf4f7ff,
  astronautaSombraTraje: 0xcbd5f0,
  astronautaVisor: 0x1e3a5f,
  astronautaReflejo: 0xeaf6ff,
  pistaBarra: 0x0d1326,
  sombra: 0x050812,
} as const;

export const FUENTE_FAMILIA = 'Nunito, sans-serif';

export const TAMANOS_TEXTO = {
  minimo: 18,
  etiquetaSala: 18,
  barra: 18,
  reloj: 18,
  subtitulo: 20,
  boton: 24,
  titulo: 32,
} as const;

export const ESCALA_TEXTO_GRANDE = 1.25;

export function escalarTamanoTexto(
  basePx: number,
  textoGrande: boolean,
  maxPx?: number,
): number {
  const escalado = textoGrande
    ? Math.round(basePx * ESCALA_TEXTO_GRANDE)
    : basePx;
  const conMinimo = Math.max(TAMANOS_TEXTO.minimo, escalado);
  return typeof maxPx === 'number' ? Math.min(maxPx, conMinimo) : conMinimo;
}

export const ESPACIADO = {
  base: 8,
  margen: 16,
  radioPanel: 16,
  radioBoton: 12,
  radioBarra: 8,
} as const;

export const HUD_METRICAS = {
  barraAncho: 260,
  barraAlto: 20,
  barraSeparacion: 8,
  barraXIcono: 16,
  barraXTrack: 48,
  barraXPorcentaje: 316,
  barraXEstado: 382,
  barraYInicial: 4,
  iconoTamano: 20,
  relojRadio: 30,
  relojGrosor: 6,
  relojCentroY: 49,
  relojTextoJornadaY: 11,
  botonPausaTamano: 60,
  botonPausaMargenDer: 16,
} as const;

export const MAPA_METRICAS = {
  grosorBordeSala: 4,
  grosorBaldosa: 1,
  estacionTamano: 48,
  estacionRadio: 10,
  estacionIconoTamano: 24,
  astronautaTexturaTamano: 56,
  astronautaRadioVisual: 20,
  marcadorDestinoRadio: 14,
  botonUsarTamano: 96,
  botonUsarMargen: 24,
  avisoMaxAncho: 440,
  avisoAlto: 56,
} as const;

export const OVERLAY_METRICAS = {
  panelAncho: 640,
  panelAlto: 360,
  finPanelAncho: 740,
  finPanelAlto: 440,
  fondoAlpha: 0.72,
  bordeGrosor: 3,
  botonAncho: 260,
  botonAlto: 64,
  botonAnchoCompleto: 300,
  botonSeparacion: 24,
} as const;

export const MISION_PANEL_METRICAS = {
  x: 16,
  y: 92,
  ancho: 464,
  alto: 204,
  bordeGrosor: 2,
  filaAlto: 66,
  iconoTamano: 22,
} as const;

export const MINIJUEGO_NODOS_METRICAS = {
  panelAncho: 760,
  panelAlto: 540,
  celdaTamano: 104,
  celdaSeparacion: 12,
  grosorCable: 16,
  botonAncho: 220,
  botonAlto: 56,
  badgePuertoAncho: 92,
  badgePuertoAlto: 44,
} as const;

export const ELECCION_METRICAS = {
  panelAncho: 860,
  panelAlto: 480,
  tarjetaAncho: 252,
  tarjetaAlto: 292,
  tarjetaSeparacion: 20,
  chipAlto: 36,
  chipAncho: 220,
} as const;

export const EVENTO_METRICAS = {
  panelAncho: 780,
  panelAlto: 496,
  tarjetaAncho: 332,
  tarjetaAlto: 196,
  tarjetaSeparacion: 28,
  chipAncho: 142,
  chipAlto: 36,
} as const;

