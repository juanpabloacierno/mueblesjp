import { tr } from './i18n';
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

const tpl = (key: TemplateKey, label: [string, string], description: [string, string]) => ({
  key,
  get label() {
    return tr(...label);
  },
  get description() {
    return tr(...description);
  },
});

export const TEMPLATES: { key: TemplateKey; label: string; description: string }[] = [
  tpl('colgado-largo', ['Colgado largo', 'Long hanging'], ['Vestidos, abrigos, chaquetas largas', 'Dresses, coats, long jackets']),
  tpl('doble-colgado', ['Doble colgado', 'Double hanging'], ['Dos barras de colgar para camisas y sacos', 'Two hanging rods for shirts and blazers']),
  tpl('colgado-estantes', ['Colgado corto + estantes', 'Short hanging + shelves'], ['Barra de colgar arriba, estantes abajo', 'Hanging rod on top, shelves below']),
  tpl('colgado-zapatero', ['Colgado corto + zapatero', 'Short hanging + shoe rack'], ['Barra de colgar arriba, zapatero inclinado abajo', 'Hanging rod on top, slanted shoe rack below']),
  tpl('cajonera-estantes', ['Cajonera + estantes', 'Drawers + shelves'], ['3 cajones abajo y estantes arriba', '3 drawers below, shelves on top']),
  tpl('cajonera-colgado', ['Cajonera + colgado', 'Drawers + hanging'], ['3 cajones abajo y barra de colgar arriba', '3 drawers below, hanging rod on top']),
  tpl('estantes', ['Estantes', 'Shelves'], ['Ropa doblada, cada 33 cm', 'Folded clothes, every 33 cm']),
  tpl('zapatero', ['Zapatero', 'Shoe rack'], ['Toda la columna con estantes inclinados', 'The whole column with slanted shelves']),
  tpl('zapatero-estantes', ['Zapatero + estantes', 'Shoe rack + shelves'], ['3 niveles de zapatos abajo, estantes arriba', '3 shoe levels below, shelves on top']),
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
