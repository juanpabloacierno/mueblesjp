import type { ShelfUnit } from './types';

/**
 * Medidas reales del mueble. En un empotrado salen del hueco menos las holguras.
 * Con un hueco para las piernas no hay maletero ni corredizas, y ese hueco no lleva puertas.
 * Se puede aplicar varias veces sin cambiar el resultado.
 */
export function resolveUnit(unit: ShelfUnit): ShelfUnit {
  let out = unit;
  const n = unit.niche;
  if (n.enabled) {
    out = { ...out, width: n.width - 2 * n.sideGap, height: n.height - n.topGap, depth: n.depth - n.backGap };
  }
  if (unit.columns.some((c) => c.knee)) {
    const doors = unit.doors.type === 'corrediza' ? { ...unit.doors, type: 'ninguna' as const } : unit.doors;
    out = {
      ...out,
      // Sin ninguna columna con piso no hay fondo (escritorio de tapa y dos laterales).
      back: unit.columns.every((c) => c.knee) ? { ...unit.back, mode: 'ninguno' as const } : unit.back,
      maletero: { ...unit.maletero, enabled: false },
      doors: { ...doors, columns: unit.columns.map((c, i) => !c.knee && (unit.doors.columns[i] ?? true)) },
    };
  }
  return out;
}
