import { newId } from './format';
import type { ColumnSpec, DoorSpec, Material, ShelfUnit } from './types';

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

export const DEFAULT_DOORS: DoorSpec = {
  type: 'ninguna',
  mount: 'superpuesta',
  perColumn: 0,
  columns: [],
  upToShelf: null,
  gap: 3,
  leaves: 2,
  overlap: 30,
  heightDeduction: 20,
  trackDepth: 50,
};

export function column(shelves: number, shelfType: ColumnSpec['shelfType'] = 'movil', width: number | null = null, gaps: (number | null)[] = []): ColumnSpec {
  return { width, shelves, shelfType, gaps };
}

type PresetUnit = Omit<ShelfUnit, 'id' | 'material' | 'updatedAt' | 'kind' | 'movableClearance' | 'shelfSetback' | 'shopping' | 'doors'> & {
  doors?: Partial<DoorSpec>;
};

export interface Preset {
  key: string;
  label: string;
  description: string;
  unit: PresetUnit;
}

const CLAVADO = { mode: 'clavado' as const, grooveDepth: 8, grooveOffset: 12 };

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
      back: CLAVADO,
      sameShelves: true,
      columns: [column(4)],
    },
  },
  {
    key: 'biblioteca-puertas',
    label: 'Biblioteca con puertas abajo',
    description: '80 × 190 cm, 2 puertas con bisagras',
    unit: {
      name: 'Biblioteca con puertas',
      width: 800,
      height: 1900,
      depth: 350,
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(4, 'fijo', null, [600])],
      doors: { type: 'batiente', mount: 'superpuesta', perColumn: 2, upToShelf: 1 },
    },
  },
  {
    key: 'aparador',
    label: 'Mueble bajo con puertas',
    description: '100 × 85 cm, 2 columnas con puerta',
    unit: {
      name: 'Mueble bajo',
      width: 1000,
      height: 850,
      depth: 400,
      top: 'sobre',
      plinth: { enabled: true, height: 80, setback: 30 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(1, 'movil'), column(1, 'movil')],
      doors: { type: 'batiente', mount: 'superpuesta' },
    },
  },
  {
    key: 'armario',
    label: 'Armario con corredizas',
    description: '120 × 180 cm, 2 hojas corredizas',
    unit: {
      name: 'Armario con corredizas',
      width: 1200,
      height: 1800,
      depth: 500,
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(4, 'movil'), column(4, 'movil')],
      doors: { type: 'corrediza', leaves: 2 },
    },
  },
  {
    key: 'baja',
    label: 'Estantería baja',
    description: '120 × 80 cm, 2 columnas abiertas',
    unit: {
      name: 'Estantería baja',
      width: 1200,
      height: 800,
      depth: 350,
      top: 'sobre',
      plinth: { enabled: true, height: 60, setback: 20 },
      back: CLAVADO,
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
      back: CLAVADO,
      sameShelves: true,
      columns: [column(2, 'fijo'), column(2, 'fijo'), column(2, 'fijo')],
    },
  },
  {
    key: 'tv',
    label: 'Mueble de TV',
    description: '160 cm, puertas a los costados',
    unit: {
      name: 'Mueble de TV',
      width: 1600,
      height: 500,
      depth: 400,
      top: 'sobre',
      plinth: { enabled: true, height: 80, setback: 30 },
      back: CLAVADO,
      sameShelves: false,
      columns: [column(1, 'fijo'), column(1, 'movil', 700), column(1, 'fijo')],
      doors: { type: 'batiente', mount: 'superpuesta', columns: [true, false, true] },
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

export function createFromPreset(preset: Preset, material: Material = DEFAULT_MATERIAL): ShelfUnit {
  const { doors, ...rest } = structuredClone(preset.unit);
  return {
    kind: 'estanteria',
    id: newId(),
    ...rest,
    movableClearance: 2,
    shelfSetback: 0,
    doors: { ...DEFAULT_DOORS, ...doors },
    material: { ...material },
    shopping: {},
    updatedAt: Date.now(),
  };
}

/** Completa campos faltantes de muebles guardados con versiones anteriores. */
export function normalizeUnit(raw: Partial<ShelfUnit> & { prices?: unknown }): ShelfUnit {
  const base = createFromPreset(PRESETS[0]);
  const { prices: _legacy, ...data } = raw;
  return {
    ...base,
    ...data,
    plinth: { ...base.plinth, ...raw.plinth },
    back: { ...base.back, ...raw.back },
    doors: { ...DEFAULT_DOORS, ...raw.doors },
    material: { ...DEFAULT_MATERIAL, ...raw.material },
    shopping: { ...raw.shopping },
    columns: (raw.columns?.length ? raw.columns : base.columns).map((c) => ({ ...column(0), ...c, gaps: c.gaps ?? [] })),
    kind: 'estanteria',
    id: raw.id ?? base.id,
  };
}
