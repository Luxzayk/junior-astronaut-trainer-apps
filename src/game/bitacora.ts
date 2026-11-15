// Registro puro de bitácora de decisiones, eventos, fugas e intentos (sin Phaser)

export type TipoRegistroBitacora =
  | 'eleccion'
  | 'evento'
  | 'apagon'
  | 'fuga'
  | 'intento';

export interface DeltasBitacora {
  aire: number;
  energia: number;
  escudo: number;
}

export interface EntradaBitacora {
  jornada: number;
  tipo: TipoRegistroBitacora;
  id: string;
  deltas: DeltasBitacora;
  nota?: string;
}

export function normalizarDeltasBitacora(
  deltas?: Partial<DeltasBitacora>,
): DeltasBitacora {
  return {
    aire: typeof deltas?.aire === 'number' && Number.isFinite(deltas.aire) ? deltas.aire : 0,
    energia:
      typeof deltas?.energia === 'number' && Number.isFinite(deltas.energia)
        ? deltas.energia
        : 0,
    escudo:
      typeof deltas?.escudo === 'number' && Number.isFinite(deltas.escudo)
        ? deltas.escudo
        : 0,
  };
}

export function crearEntradaBitacora(params: {
  jornada: number;
  tipo: TipoRegistroBitacora;
  id: string;
  deltas?: Partial<DeltasBitacora>;
  nota?: string;
}): EntradaBitacora {
  const entrada: EntradaBitacora = {
    jornada: params.jornada,
    tipo: params.tipo,
    id: params.id,
    deltas: normalizarDeltasBitacora(params.deltas),
  };
  if (params.nota !== undefined && params.nota.length > 0) {
    entrada.nota = params.nota;
  }
  return entrada;
}

export function clonarBitacora(
  bitacora: readonly EntradaBitacora[],
): EntradaBitacora[] {
  return bitacora.map((entrada) => ({
    ...entrada,
    deltas: { ...entrada.deltas },
  }));
}

export function filtrarDecisionesDificiles(
  bitacora: readonly EntradaBitacora[],
): EntradaBitacora[] {
  return bitacora
    .filter((entrada) => entrada.tipo === 'evento' || entrada.tipo === 'apagon')
    .map((entrada) => ({
      ...entrada,
      deltas: { ...entrada.deltas },
    }));
}

export function filtrarEntradasPorJornada(
  bitacora: readonly EntradaBitacora[],
  jornada: number,
): EntradaBitacora[] {
  return bitacora
    .filter((entrada) => entrada.jornada === jornada)
    .map((entrada) => ({
      ...entrada,
      deltas: { ...entrada.deltas },
    }));
}
