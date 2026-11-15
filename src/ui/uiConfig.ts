/** Tiempos y límites exclusivamente visuales; no son balance del juego. */
export const UI_CONFIG = {
  suavizadoMs: 80, esperaEstelaMs: 400, velocidadEstela: 40, epsilonBarra: 0.05,
  umbralEstela: 1.5, umbralDeltaFlotante: 1.5,
  marcadorReducidoMs: 1500, ventanaAgrupacionMs: 300, flotanteMs: 1200,
  desplazamientoFlotante: 24, maxFlotantes: 6, conteoMs: 800, easingConteo: 3,
  cierre: { alto: 592, altoAgua: 624, gastoY: 164, restanteY: 228, iconosY: 282, efectoY: 330, aguaY: 374, chipsY: 408, chipsAguaY: 440 },
  previewTextoAncho: 72,
  alphaEstela: 0.35, alphaPreview: 0.65, pasoRayado: 6, grosorRayado: 2,
  flotanteX: 60, flotanteSeparacionX: 88, flotanteIconoOffset: 20, flotanteTexto: 18, flotanteIcono: 18,
  marcadorIcono: 18, marcadorX: 494, marcadorY: 40, marcadorEtiquetaOffset: 20, marcadorLinea: 10, marcadorTick: 6, marcadorAtenuado: 0.45,
} as const;
