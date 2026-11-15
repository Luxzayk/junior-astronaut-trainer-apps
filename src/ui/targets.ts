// Registro ligero de elementos de UI y mapa por nombre (para tutorial y foco)

export interface RectObjetivo {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export type NombreObjetivoUI =
  | 'barras'
  | 'reloj'
  | 'pausa'
  | 'panel-misiones'
  | 'estacion-energia'
  | 'estacion-invernadero'
  | 'estacion-escudos'
  | 'estacion-tanque'
  | 'boton-usar'
  | 'mapa'
  | 'eleccion'
  | 'menu-jugar'
  | 'menu-demo'
  | (string & {});

const registroObjetivos = new Map<string, RectObjetivo>();

export function registrarObjetivoUI(
  nombre: NombreObjetivoUI,
  rect: RectObjetivo,
): void {
  registroObjetivos.set(nombre, {
    x: rect.x,
    y: rect.y,
    ancho: rect.ancho,
    alto: rect.alto,
  });
}

export function desregistrarObjetivoUI(nombre: NombreObjetivoUI): void {
  registroObjetivos.delete(nombre);
}

export function obtenerObjetivoUI(
  nombre: NombreObjetivoUI,
): RectObjetivo | null {
  const encontrado = registroObjetivos.get(nombre);
  return encontrado ? { ...encontrado } : null;
}

export function listarObjetivosUI(): Record<string, RectObjetivo> {
  const salida: Record<string, RectObjetivo> = {};
  for (const [clave, rect] of registroObjetivos.entries()) {
    salida[clave] = { ...rect };
  }
  return salida;
}

export function limpiarObjetivosUI(): void {
  registroObjetivos.clear();
}
