// Registro central de vistas de minijuegos

import type { MinigameId, MinigameView } from './types';
import { EscudoView } from './views/EscudoView';
import { NodosView } from './views/NodosView';
import { ValvulasView } from './views/ValvulasView';

export type FabricaMinijuego = () => MinigameView;

export const MINIGAME_REGISTRY: Readonly<Record<MinigameId, FabricaMinijuego>> = {
  nodos: () => new NodosView(),
  valvulas: () => new ValvulasView(),
  escudo: () => new EscudoView(),
};

export function crearVistaMinijuego(id: MinigameId): MinigameView {
  return MINIGAME_REGISTRY[id]();
}
