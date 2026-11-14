import { autoShoeLevels } from './shoes';
import type { ColumnSpec } from './types';

export type TemplateKey =
  | 'estantes'
  | 'colgado-largo'
  | 'doble-colgado'
  | 'colgado-estantes'
  | 'colgado-zapatero'
  | 'cajonera-estantes'
  | 'cajonera-colgado'
  | 'zapatero'
  | 'zapatero-estantes';

export const TEMPLATES: { key: TemplateKey; label: string; description: string }[] = [
  { key: 'colgado-largo', label: 'Colgado largo', description: 'Vestidos, sobretodos, camperas largas' },
  { key: 'doble-colgado', label: 'Doble colgado', description: 'Dos barrales para camisas y sacos' },
  { key: 'colgado-estantes', label: 'Colgado corto + estantes', description: 'Barral arriba, estantes abajo' },
  { key: 'colgado-zapatero', label: 'Colgado corto + zapatero', description: 'Barral arriba, zapatero inclinado abajo' },
  { key: 'cajonera-estantes', label: 'Cajonera + estantes', description: '3 cajones abajo y estantes arriba' },
  { key: 'cajonera-colgado', label: 'Cajonera + colgado', description: '3 cajones abajo y barral arriba' },
  { key: 'estantes', label: 'Estantes', description: 'Ropa doblada, cada 33 cm' },
  { key: 'zapatero', label: 'Zapatero', description: 'Toda la columna con estantes inclinados' },
  { key: 'zapatero-estantes', label: 'Zapatero + estantes', description: '3 niveles de zapatos abajo, estantes arriba' },
];

/** Alto libre de un hueco de colgado corto (camisas y sacos). */
export const SHORT_HANGING = 1000;
/** Alto del hueco de una cajonera de 3 cajones. */
export const DRAWER_BLOCK = 560;
/** Alto del hueco de un zapatero inclinado de 3 niveles. */
export const SHOE_BLOCK = 640;

type Interior = Pick<ColumnSpec, 'shelves' | 'shelfType' | 'gaps' | 'fill'>;

/** Cantidad de estantes para repartir `height` en huecos de ~`pitch` mm. */
function shelvesFor(height: number, pitch: number, t: number): number {
  return Math.max(0, Math.round((height + t) / (pitch + t)) - 1);
}

/**
 * Arma el interior de una columna a partir de una plantilla.
 * `height` es el alto libre de la columna (del piso al techo o al maletero).
 */
export function applyTemplate(key: TemplateKey, height: number, t: number): Interior {
  switch (key) {
    case 'estantes':
      return { shelves: shelvesFor(height, 330, t), shelfType: 'movil', gaps: [], fill: [] };
    case 'zapatero':
      return { shelves: 0, shelfType: 'fijo', gaps: [], fill: [{ kind: 'zapatero', style: 'inclinado', levels: autoShoeLevels('inclinado', height, t) }] };
    case 'zapatero-estantes': {
      const above = height - SHOE_BLOCK - t;
      const k = 1 + shelvesFor(Math.max(0, above), 330, t);
      return { shelves: k, shelfType: 'movil', gaps: [SHOE_BLOCK], fill: [{ kind: 'zapatero', style: 'inclinado', levels: 3 }] };
    }
    case 'colgado-zapatero': {
      const below = height - SHORT_HANGING - t;
      if (below < 220) return { shelves: 0, shelfType: 'fijo', gaps: [], fill: [{ kind: 'barral' }] };
      return {
        shelves: 1,
        shelfType: 'fijo',
        gaps: [null, SHORT_HANGING],
        fill: [{ kind: 'zapatero', style: 'inclinado', levels: autoShoeLevels('inclinado', below, t) }, { kind: 'barral' }],
      };
    }
    case 'colgado-largo':
      // Si sobra alto, un estante arriba del barral para guardar cosas.
      return height > 1850
        ? { shelves: 1, shelfType: 'fijo', gaps: [null, 300], fill: [{ kind: 'barral' }] }
        : { shelves: 0, shelfType: 'fijo', gaps: [], fill: [{ kind: 'barral' }] };
    case 'doble-colgado':
      return { shelves: 1, shelfType: 'fijo', gaps: [], fill: [{ kind: 'barral' }, { kind: 'barral' }] };
    case 'colgado-estantes': {
      const below = height - SHORT_HANGING - t;
      if (below < 250) return { shelves: 0, shelfType: 'fijo', gaps: [], fill: [{ kind: 'barral' }] };
      const k = shelvesFor(below, 330, t) + 1;
      const gaps: (number | null)[] = Array.from({ length: k + 1 }, () => null);
      gaps[k] = SHORT_HANGING;
      const fill: ColumnSpec['fill'] = Array.from({ length: k + 1 }, () => null);
      fill[k] = { kind: 'barral' };
      return { shelves: k, shelfType: 'movil', gaps, fill };
    }
    case 'cajonera-estantes': {
      const above = height - DRAWER_BLOCK - t;
      const k = 1 + shelvesFor(Math.max(0, above), 330, t);
      return { shelves: k, shelfType: 'movil', gaps: [DRAWER_BLOCK], fill: [{ kind: 'cajones', count: 3 }] };
    }
    case 'cajonera-colgado':
      return height >= DRAWER_BLOCK + SHORT_HANGING + 2 * t + 150
        ? { shelves: 2, shelfType: 'movil', gaps: [DRAWER_BLOCK, null, SHORT_HANGING], fill: [{ kind: 'cajones', count: 3 }, null, { kind: 'barral' }] }
        : { shelves: 1, shelfType: 'movil', gaps: [DRAWER_BLOCK], fill: [{ kind: 'cajones', count: 3 }, { kind: 'barral' }] };
  }
}
