import { newId } from './format';
import { tr } from './i18n';
import type { ColumnSpec, DoorSpec, FurnitureKind, MaleteroSpec, Material, NicheSpec, ShelfUnit } from './types';

export const DEFAULT_MATERIAL: Material = {
  brand: 'Egger',
  boardType: 'melamina',
  backBrand: 'Genérica',
  backType: 'fibrofacil',
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
  interior: { enabled: false, brand: 'Egger', boardType: 'melamina', color: 'Blanco', boardLength: 2600, boardWidth: 1830, hasGrain: false, body: 'exterior' },
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

export const DEFAULT_NICHE: NicheSpec = { enabled: false, width: 1800, height: 2400, depth: 600, sideGap: 5, topGap: 20, backGap: 10 };
export const DEFAULT_MALETERO: MaleteroSpec = { enabled: false, height: 400, dividers: false };

export function column(
  shelves: number,
  shelfType: ColumnSpec['shelfType'] = 'movil',
  width: number | null = null,
  gaps: (number | null)[] = [],
  fill: ColumnSpec['fill'] = [],
): ColumnSpec {
  return { width, shelves, shelfType, gaps, fill };
}

type PresetUnit = Omit<
  ShelfUnit,
  'id' | 'material' | 'updatedAt' | 'kind' | 'movableClearance' | 'shelfSetback' | 'shopping' | 'progress' | 'doors' | 'niche' | 'maletero'
> & {
  kind?: FurnitureKind;
  doors?: Partial<DoorSpec>;
  niche?: Partial<NicheSpec>;
  maletero?: Partial<MaleteroSpec>;
};

const BARRAL = { kind: 'barral' as const };
const CAJONES_3 = { kind: 'cajones' as const, count: 3 };

export interface Preset {
  key: string;
  label: string;
  description: string;
  unit: PresetUnit;
}

type Text = [es: string, en: string];

/** Modelo con textos en los dos idiomas: se leen en el idioma activo (también el nombre del mueble). */
function preset(d: { key: string; label: Text; description: Text; name: Text; unit: Omit<PresetUnit, 'name'> }): Preset {
  return {
    key: d.key,
    get label() {
      return tr(...d.label);
    },
    get description() {
      return tr(...d.description);
    },
    unit: {
      ...d.unit,
      get name() {
        return tr(...d.name);
      },
    },
  };
}

const CLAVADO = { mode: 'clavado' as const, grooveDepth: 8, grooveOffset: 12 };

export const PRESETS: Preset[] = [
  preset({
    key: 'placard-corredizo',
    label: ['Clóset con corredizas', 'Wardrobe with sliding doors'],
    description: ['Empotrado de 180 × 240, cajonera, zapatero y maletero', 'Built-in 180 × 240, drawers, shoe rack and top storage'],
    name: ['Clóset del dormitorio', 'Bedroom wardrobe'],
    unit: {
      kind: 'placard',
      width: 1790,
      height: 2380,
      depth: 590,
      niche: { enabled: true, width: 1800, height: 2400, depth: 600 },
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: false,
      columns: [
        column(0, 'fijo', null, [], [BARRAL]),
        column(4, 'movil', null, [560], [CAJONES_3]),
        column(1, 'fijo', null, [null, 1000], [{ kind: 'zapatero', style: 'inclinado', levels: 4 }, BARRAL]),
      ],
      maletero: { enabled: true, height: 400 },
      doors: { type: 'corrediza', leaves: 2 },
    },
  }),
  preset({
    key: 'placard-batiente',
    label: ['Clóset con puertas batientes', 'Wardrobe with hinged doors'],
    description: ['120 × 220, barra de colgar, cajonera y maletero', '120 × 220, hanging rod, drawers and top storage'],
    name: ['Clóset con puertas', 'Wardrobe with doors'],
    unit: {
      kind: 'placard',
      width: 1200,
      height: 2200,
      depth: 580,
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: false,
      columns: [column(0, 'fijo', null, [], [BARRAL]), column(3, 'movil', null, [560], [CAJONES_3])],
      maletero: { enabled: true, height: 350, dividers: true },
      doors: { type: 'batiente', mount: 'superpuesta' },
    },
  }),
  preset({
    key: 'interior-placard',
    label: ['Interior de clóset', 'Wardrobe interior'],
    description: ['Para un hueco con el frente ya hecho', 'For an alcove whose front is already built'],
    name: ['Interior de clóset', 'Wardrobe interior'],
    unit: {
      kind: 'placard',
      width: 1490,
      height: 2480,
      depth: 590,
      niche: { enabled: true, width: 1500, height: 2500, depth: 600 },
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: false,
      columns: [column(1, 'fijo', null, [], [BARRAL, BARRAL]), column(4, 'movil', null, [560], [CAJONES_3])],
      maletero: { enabled: true, height: 450, dividers: true },
    },
  }),
  preset({
    key: 'biblioteca',
    label: ['Librero', 'Bookcase'],
    description: ['80 × 180 cm, 4 estantes móviles', '80 × 180 cm, 4 adjustable shelves'],
    name: ['Librero', 'Bookcase'],
    unit: {
      width: 800,
      height: 1800,
      depth: 300,
      top: 'entre',
      plinth: { enabled: true, height: 70, setback: 0 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(4)],
    },
  }),
  preset({
    key: 'biblioteca-puertas',
    label: ['Librero con puertas abajo', 'Bookcase with lower doors'],
    description: ['80 × 190 cm, 2 puertas con bisagras', '80 × 190 cm, 2 hinged doors'],
    name: ['Librero con puertas', 'Bookcase with doors'],
    unit: {
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
  }),
  preset({
    key: 'aparador',
    label: ['Mueble bajo con puertas', 'Low cabinet with doors'],
    description: ['100 × 85 cm, 2 columnas con puerta', '100 × 85 cm, 2 columns with doors'],
    name: ['Mueble bajo', 'Low cabinet'],
    unit: {
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
  }),
  preset({
    key: 'armario',
    label: ['Armario con corredizas', 'Cabinet with sliding doors'],
    description: ['120 × 180 cm, 2 hojas corredizas', '120 × 180 cm, 2 sliding door panels'],
    name: ['Armario con corredizas', 'Cabinet with sliding doors'],
    unit: {
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
  }),
  preset({
    key: 'baja',
    label: ['Estantería baja', 'Low shelving unit'],
    description: ['120 × 80 cm, 2 columnas abiertas', '120 × 80 cm, 2 open columns'],
    name: ['Estantería baja', 'Low shelving unit'],
    unit: {
      width: 1200,
      height: 800,
      depth: 350,
      top: 'sobre',
      plinth: { enabled: true, height: 60, setback: 20 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(1, 'fijo'), column(1, 'fijo')],
    },
  }),
  preset({
    key: 'cubos',
    label: ['Organizador 3 × 3', '3 × 3 cube organizer'],
    description: ['9 cubos iguales', '9 equal cubes'],
    name: ['Organizador de cubos', 'Cube organizer'],
    unit: {
      width: 1050,
      height: 1050,
      depth: 350,
      top: 'entre',
      plinth: { enabled: false, height: 60, setback: 0 },
      back: CLAVADO,
      sameShelves: true,
      columns: [column(2, 'fijo'), column(2, 'fijo'), column(2, 'fijo')],
    },
  }),
  preset({
    key: 'tv',
    label: ['Mueble de TV', 'TV unit'],
    description: ['160 cm, puertas a los costados', '160 cm, doors on the sides'],
    name: ['Mueble de TV', 'TV unit'],
    unit: {
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
  }),
  preset({
    key: 'pared',
    label: ['Estante de pared', 'Wall shelf'],
    description: ['Caja abierta para colgar', 'Open box to hang on the wall'],
    name: ['Estante de pared', 'Wall shelf'],
    unit: {
      width: 800,
      height: 250,
      depth: 200,
      top: 'entre',
      plinth: { enabled: false, height: 60, setback: 0 },
      back: { mode: 'ninguno', grooveDepth: 8, grooveOffset: 12 },
      sameShelves: true,
      columns: [column(0)],
    },
  }),
];

export function createFromPreset(preset: Preset, material: Material = DEFAULT_MATERIAL): ShelfUnit {
  const { doors, niche, maletero, kind, ...rest } = structuredClone(preset.unit);
  return {
    id: newId(),
    ...rest,
    kind: kind ?? 'estanteria',
    movableClearance: 2,
    shelfSetback: 0,
    doors: { ...DEFAULT_DOORS, ...doors },
    niche: { ...DEFAULT_NICHE, ...niche },
    maletero: { ...DEFAULT_MALETERO, ...maletero },
    material: { ...material },
    shopping: {},
    progress: {},
    updatedAt: Date.now(),
  };
}

/**
 * Completa un material guardado con versiones anteriores. Los que no tenían marca
 * quedan como tablero "Otra" con sus mismas medidas.
 */
export function normalizeMaterial(raw: Partial<Material> | undefined): Material {
  if (!raw) return { ...DEFAULT_MATERIAL };
  const legacy = !('brand' in raw);
  return {
    ...DEFAULT_MATERIAL,
    ...(legacy ? { brand: 'Otra', boardType: 'melamina' as const, backBrand: 'Genérica', backType: 'fibrofacil' as const } : {}),
    ...raw,
    interior: { ...DEFAULT_MATERIAL.interior, ...raw.interior },
  };
}

/** Completa campos faltantes de muebles guardados con versiones anteriores. */
export function normalizeUnit(raw: Partial<ShelfUnit> & { prices?: unknown }): ShelfUnit {
  const base = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!);
  const { prices: _legacy, ...data } = raw;
  return {
    ...base,
    ...data,
    plinth: { ...base.plinth, ...raw.plinth },
    back: { ...base.back, ...raw.back },
    doors: { ...DEFAULT_DOORS, ...raw.doors },
    niche: { ...DEFAULT_NICHE, ...raw.niche },
    maletero: { ...DEFAULT_MALETERO, ...raw.maletero },
    material: normalizeMaterial(raw.material),
    shopping: { ...raw.shopping },
    progress: { ...raw.progress },
    columns: (raw.columns?.length ? raw.columns : base.columns).map((c) => ({ ...column(0), ...c, gaps: c.gaps ?? [], fill: c.fill ?? [] })),
    kind: raw.kind === 'placard' ? 'placard' : 'estanteria',
    id: raw.id ?? base.id,
  };
}
