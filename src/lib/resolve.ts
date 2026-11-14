import type { ShelfUnit } from './types';

/**
 * Medidas reales del mueble. En un empotrado salen del hueco menos las holguras;
 * se puede aplicar varias veces sin cambiar el resultado.
 */
export function resolveUnit(unit: ShelfUnit): ShelfUnit {
  const n = unit.niche;
  if (!n.enabled) return unit;
  return {
    ...unit,
    width: n.width - 2 * n.sideGap,
    height: n.height - n.topGap,
    depth: n.depth - n.backGap,
  };
}
