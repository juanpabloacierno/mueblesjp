import { mm } from './format';
import type { BackType, BoardType, Finish, Material } from './types';

export type { BackType, BoardType };

export const BOARD_TYPES: { value: BoardType; label: string; hint: string }[] = [
  { value: 'melamina', label: 'Melamina', hint: 'Melamina sobre aglomerado: la más común y económica.' },
  { value: 'melamina-mdf', label: 'Melamina sobre MDF', hint: 'Cantos más firmes y mejor agarre de tornillos y bisagras. Más cara y pesada.' },
  { value: 'mdf', label: 'MDF crudo', hint: 'Para pintar o laquear. El tapacanto pasa a ser opcional.' },
  { value: 'aglomerado', label: 'Aglomerado crudo', hint: 'Para enchapar o para partes que no se ven.' },
];

export const BACK_TYPES: { value: BackType; label: string; hint: string }[] = [
  { value: 'fibrofacil', label: 'Fibrofácil', hint: 'MDF fino crudo: el fondo más barato.' },
  { value: 'fondo-blanco', label: 'Fondo blanco', hint: 'MDF fino con una cara blanca: queda prolijo por dentro.' },
];

export const TYPE_LABEL: Record<BoardType | BackType, string> = {
  melamina: 'Melamina',
  'melamina-mdf': 'Melamina sobre MDF',
  mdf: 'MDF crudo',
  aglomerado: 'Aglomerado crudo',
  fibrofacil: 'Fibrofácil',
  'fondo-blanco': 'Fondo blanco',
};

export interface CatalogBoard {
  brand: string;
  type: BoardType | BackType;
  length: number;
  width: number;
  thicknesses: number[];
  /** Agregada por el usuario ("Mis placas"). */
  custom?: boolean;
}

/** Marca para cargar las medidas a mano. */
export const CUSTOM_BRAND = 'Otra';
/** Marcas que no se distinguen al guardar precios (mismo precio que antes de existir el catálogo). */
const GENERIC_BRANDS = [CUSTOM_BRAND, 'Genérica'];

/**
 * Formatos de referencia que se venden en Argentina. Las medidas y espesores varían
 * según el proveedor: por eso cada mueble muestra la placa elegida y se puede cargar otra.
 */
export const CATALOG: CatalogBoard[] = [
  { brand: 'Egger', type: 'melamina', length: 2600, width: 1830, thicknesses: [15, 18] },
  { brand: 'Egger', type: 'melamina-mdf', length: 2600, width: 1830, thicknesses: [18] },
  { brand: 'Egger', type: 'fondo-blanco', length: 2600, width: 1830, thicknesses: [3] },
  { brand: 'Egger', type: 'fibrofacil', length: 2600, width: 1830, thicknesses: [3, 5.5] },
  { brand: 'Faplac', type: 'melamina', length: 2750, width: 1830, thicknesses: [15, 18, 25] },
  { brand: 'Faplac', type: 'melamina-mdf', length: 2750, width: 1830, thicknesses: [18] },
  // Línea Táctil: MDF con film polimérico, en placa más angosta.
  { brand: 'Faplac', type: 'melamina-mdf', length: 2750, width: 1300, thicknesses: [18] },
  { brand: 'Faplac', type: 'mdf', length: 2750, width: 1830, thicknesses: [18] },
  { brand: 'Faplac', type: 'aglomerado', length: 2750, width: 1830, thicknesses: [18] },
  { brand: 'Sadepan', type: 'melamina', length: 2820, width: 1830, thicknesses: [10, 12, 15, 18, 25] },
  { brand: 'Genérica', type: 'fibrofacil', length: 2600, width: 1830, thicknesses: [3, 5.5] },
  { brand: 'Genérica', type: 'fondo-blanco', length: 2600, width: 1830, thicknesses: [3] },
];

export const COLOR_SUGGESTIONS = [
  'Blanco',
  'Negro',
  'Gris',
  'Gris humo',
  'Grafito',
  'Almendra',
  'Roble',
  'Roble claro',
  'Nogal',
  'Cerezo',
  'Wengue',
  'Cedro',
  'Haya',
  'Teca',
  'Fresno',
];

const WOOD = /roble|nogal|cerezo|wengu|cedro|haya|teca|fresno|olmo|pino|peral|guindo|madera|caoba|maple|arce|abedul|eucalip|petirib|para[ií]so|cerejeira|carvalho|melo|vintage|r[uú]stic|n[oó]rdic|ceniza|kendal|nebraska|moro|vicenza|venato|vetas?/i;

/** Los diseños que imitan madera tienen veta: las piezas no se pueden girar en la placa. */
export function looksLikeWood(color: string): boolean {
  return WOOD.test(color);
}

/** Ancho de tapacanto que conviene para un espesor de placa. */
export function edgeWidthFor(thickness: number): number {
  if (thickness <= 19) return 22;
  if (thickness <= 30) return 33;
  return 45;
}

export function isBackType(type: BoardType | BackType): type is BackType {
  return type === 'fondo-blanco' || type === 'fibrofacil';
}

/** Placas del catálogo (más las propias) para el cuerpo o el fondo. */
export function boardsFor(role: 'cuerpo' | 'fondo', custom: CatalogBoard[] = []): CatalogBoard[] {
  return [...CATALOG, ...custom].filter((b) => (role === 'fondo') === isBackType(b.type));
}

export function brandsFor(role: 'cuerpo' | 'fondo', custom: CatalogBoard[] = []): string[] {
  return [...new Set(boardsFor(role, custom).map((b) => b.brand))];
}

/** El tipo de placa no lleva melamina: el tapacanto es opcional. */
export function isRawBoard(m: Material): boolean {
  return m.boardType === 'mdf' || m.boardType === 'aglomerado';
}

/** "Melamina Egger Blanco 18 mm", "MDF crudo Faplac 18 mm". */
export function boardLabel(m: Material): string {
  const brand = GENERIC_BRANDS.includes(m.brand) ? '' : m.brand;
  const color = isRawBoard(m) ? '' : m.color;
  return `${TYPE_LABEL[m.boardType]} ${brand} ${color} ${mm(m.thickness)} mm`.replace(/\s+/g, ' ').trim();
}

/** "Fibrofácil 3 mm", "Fondo blanco Egger 3 mm". */
export function backLabel(m: Material): string {
  const brand = GENERIC_BRANDS.includes(m.backBrand) ? '' : m.backBrand;
  return `${TYPE_LABEL[m.backType]} ${brand} ${mm(m.backThickness)} mm`.replace(/\s+/g, ' ').trim();
}

/** Para guardar precios: las marcas genéricas usan la misma clave que antes del catálogo. */
export function isGenericBrand(brand: string): boolean {
  return GENERIC_BRANDS.includes(brand);
}

/** Placas del catálogo del mismo tipo y espesor donde entra una pieza que no entra en la actual. */
export function boardsThatFit(m: Material, pieceLength: number, pieceWidth: number): CatalogBoard[] {
  return CATALOG.filter((b) => {
    if (b.type !== m.boardType || !b.thicknesses.includes(m.thickness)) return false;
    const L = b.length - 2 * m.trim;
    const W = b.width - 2 * m.trim;
    return (pieceLength <= L && pieceWidth <= W) || (!m.hasGrain && pieceLength <= W && pieceWidth <= L);
  });
}

/** Qué color lleva cada pieza: frentes siempre exterior, interior siempre interior, el cuerpo se elige. */
export type PieceGroup = 'frente' | 'cuerpo' | 'interior';

const GROUPS: [RegExp, PieceGroup][] = [
  [/^(Puerta|Frente de cajón)/, 'frente'],
  [/^(Lateral|Techo|Piso|Zócalo|Estante maletero)$|^Zócalo trasero$/, 'cuerpo'],
];

export function pieceGroup(name: string): PieceGroup {
  for (const [re, g] of GROUPS) if (re.test(name)) return g;
  return 'interior';
}

/** Color de una pieza de melamina según su grupo y la configuración interior. */
export function finishFor(m: Material, group: PieceGroup): Finish {
  if (!m.interior.enabled) return 'exterior';
  if (group === 'frente') return 'exterior';
  if (group === 'interior') return 'interior';
  return m.interior.body;
}

/** Material efectivo de la placa exterior o interior (el resto de los datos se comparte). */
export function materialFor(m: Material, finish: Finish): Material {
  if (finish === 'exterior' || !m.interior.enabled) return m;
  const i = m.interior;
  return { ...m, brand: i.brand, boardType: i.boardType, color: i.color, boardLength: i.boardLength, boardWidth: i.boardWidth, hasGrain: i.hasGrain };
}
