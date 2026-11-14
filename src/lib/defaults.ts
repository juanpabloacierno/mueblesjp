import { newId } from './format';
import type { ColumnSpec, Material, Prices, ShelfUnit } from './types';

export const DEFAULT_MATERIAL: Material = {
  color: 'Blanco',
  boardLength: 2600,
  boardWidth: 1830,
  thickness: 18,
  hasGrain: false,
  kerf: 4,
  trim: 10,
  backThickness: 3,
  backBoardLength: 2600,
  backBoardWidth: 1830,
  edgeThickness: 0.45,
  edgeWidth: 22,
  subtractEdge: false,
};

export const DEFAULT_PRICES: Prices = { board: 0, backBoard: 0, edgePerMeter: 0, cutPerBoard: 0 };

export function column(shelves: number, shelfType: ColumnSpec['shelfType'] = 'movil', width: number | null = null): ColumnSpec {
  return { width, shelves, shelfType, gaps: [] };
}

type PresetUnit = Omit<ShelfUnit, 'id' | 'material' | 'prices' | 'updatedAt' | 'kind' | 'movableClearance' | 'shelfSetback'>;

export interface Preset {
  key: string;
  label: string;
  description: string;
  unit: PresetUnit;
}

export const PRESETS: Preset[] = [
  {
    key: 'biblioteca',
    label: 'Biblioteca',
    description: '80 × 180 cm, 4 estantes móviles',
    unit: {
      name: 'Biblioteca',
      width: 800,
      height: 1800,
      depth: 300,
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: { mode: 'clavado', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: true,
      columns: [column(4)],
    },
  },
  {
    key: 'baja',
    label: 'Estantería baja',
    description: '120 × 80 cm, 2 columnas',
    unit: {
      name: 'Estantería baja',
      width: 1200,
      height: 800,
      depth: 350,
      top: 'sobre',
      plinth: { enabled: true, height: 60, setback: 20 },
      back: { mode: 'clavado', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: true,
      columns: [column(1, 'fijo'), column(1, 'fijo')],
    },
  },
  {
    key: 'cubos',
    label: 'Organizador 3 × 3',
    description: '9 cubos iguales',
    unit: {
      name: 'Organizador de cubos',
      width: 1050,
      height: 1050,
      depth: 350,
      top: 'entre',
      plinth: { enabled: false, height: 60, setback: 0 },
      back: { mode: 'clavado', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: true,
      columns: [column(2, 'fijo'), column(2, 'fijo'), column(2, 'fijo')],
    },
  },
  {
    key: 'tv',
    label: 'Mueble de TV',
    description: '160 cm, columna central ancha',
    unit: {
      name: 'Mueble de TV',
      width: 1600,
      height: 500,
      depth: 400,
      top: 'sobre',
      plinth: { enabled: true, height: 80, setback: 30 },
      back: { mode: 'clavado', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: false,
      columns: [column(1, 'fijo'), column(1, 'movil', 700), column(1, 'fijo')],
    },
  },
  {
    key: 'pared',
    label: 'Estante de pared',
    description: 'Caja abierta para colgar',
    unit: {
      name: 'Estante de pared',
      width: 800,
      height: 250,
      depth: 200,
      top: 'entre',
      plinth: { enabled: false, height: 60, setback: 0 },
      back: { mode: 'ninguno', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: true,
      columns: [column(0)],
    },
  },
];

export function createFromPreset(preset: Preset, material: Material = DEFAULT_MATERIAL, prices: Prices = DEFAULT_PRICES): ShelfUnit {
  return {
    kind: 'estanteria',
    id: newId(),
    ...structuredClone(preset.unit),
    movableClearance: 2,
    shelfSetback: 0,
    material: { ...material },
    prices: { ...prices },
    updatedAt: Date.now(),
  };
}

/** Completa campos faltantes de muebles guardados con versiones anteriores. */
export function normalizeUnit(raw: Partial<ShelfUnit>): ShelfUnit {
  const base = createFromPreset(PRESETS[0]);
  return {
    ...base,
    ...raw,
    plinth: { ...base.plinth, ...raw.plinth },
    back: { ...base.back, ...raw.back },
    material: { ...DEFAULT_MATERIAL, ...raw.material },
    prices: { ...DEFAULT_PRICES, ...raw.prices },
    columns: (raw.columns?.length ? raw.columns : base.columns).map((c) => ({ ...column(0), ...c, gaps: c.gaps ?? [] })),
    kind: 'estanteria',
    id: raw.id ?? base.id,
  };
}
