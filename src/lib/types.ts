// Todas las medidas están en milímetros.

/** Material y parámetros de corte de un mueble. */
export interface Material {
  /** Nombre o color de la melamina, p. ej. "Blanco" o "Roble Kendal". */
  color: string;
  /** Largo de la placa (sentido de la veta). */
  boardLength: number;
  /** Ancho de la placa. */
  boardWidth: number;
  /** Espesor de la melamina. */
  thickness: number;
  /** La melamina tiene veta: las piezas no se pueden girar en la placa. */
  hasGrain: boolean;
  /** Espesor de la hoja de sierra (lo que se pierde en cada corte). */
  kerf: number;
  /** Refilado: lo que se descarta en cada borde de la placa. */
  trim: number;
  /** Espesor del fondo (fibrofácil / fondo de melamina). */
  backThickness: number;
  backBoardLength: number;
  backBoardWidth: number;
  /** Espesor del tapacanto. */
  edgeThickness: number;
  /** Ancho del rollo de tapacanto. */
  edgeWidth: number;
  /** Restar el espesor del tapacanto a la medida de corte. */
  subtractEdge: boolean;
}

export interface Prices {
  board: number;
  backBoard: number;
  edgePerMeter: number;
  cutPerBoard: number;
}

export type TopMode = 'entre' | 'sobre';
export type BackMode = 'clavado' | 'ranurado' | 'ninguno';
export type ShelfType = 'fijo' | 'movil';

export interface ColumnSpec {
  /** Luz interior de la columna. `null` = se reparte automáticamente. */
  width: number | null;
  shelves: number;
  shelfType: ShelfType;
  /** Alturas libres de los huecos desde abajo. `null` = automática. */
  gaps: (number | null)[];
}

export interface ShelfUnit {
  kind: 'estanteria';
  id: string;
  name: string;
  width: number;
  height: number;
  /** Profundidad total, incluido el fondo. */
  depth: number;
  top: TopMode;
  plinth: { enabled: boolean; height: number; setback: number };
  back: { mode: BackMode; grooveDepth: number; grooveOffset: number };
  /** Si es verdadero, todas las columnas usan los estantes de la primera. */
  sameShelves: boolean;
  columns: ColumnSpec[];
  /** Holgura total para estantes móviles (se resta al ancho). */
  movableClearance: number;
  /** Retiro de los estantes respecto del frente. */
  shelfSetback: number;
  material: Material;
  prices: Prices;
  updatedAt: number;
}

export type Furniture = ShelfUnit;

export type PieceMaterial = 'melamina' | 'fondo';

/**
 * Tapacanto: cuántos lados de cada medida van cubiertos.
 * `long` = lados que miden lo mismo que el largo (0–2).
 * `short` = lados que miden lo mismo que el ancho (0–2).
 */
export interface Edges {
  long: 0 | 1 | 2;
  short: 0 | 1 | 2;
}

export interface Piece {
  /** Letra que identifica la pieza en el despiece y en las placas. */
  code: string;
  name: string;
  qty: number;
  /** Largo terminado: medida en el sentido de la veta. */
  length: number;
  /** Ancho terminado. */
  width: number;
  thickness: number;
  material: PieceMaterial;
  edges: Edges;
  /** La pieza se puede girar 90° en la placa. */
  canRotate: boolean;
  notes: string[];
}

/** Medida de corte (terminada menos tapacanto si corresponde). */
export interface CutSize {
  length: number;
  width: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PanelRole =
  | 'lateral'
  | 'techo'
  | 'piso'
  | 'zocalo'
  | 'divisor'
  | 'estante-fijo'
  | 'estante-movil';

/** Panel visto de frente (para dibujar el plano). y = 0 es el suelo. */
export interface FrontPanel extends Rect {
  role: PanelRole;
  /** Panel retirado del frente (se dibuja más claro). */
  recessed?: boolean;
}

export interface ShelfPosition {
  index: number;
  /** Cara inferior del estante medida desde el suelo. */
  bottom: number;
  /** Cara superior del estante medida desde el suelo. */
  top: number;
  /** Cara inferior medida desde la cara superior del piso del mueble. */
  bottomFromBase: number;
  type: ShelfType;
}

export interface ColumnResult {
  index: number;
  /** Cara izquierda de la luz interior, desde el borde exterior izquierdo. */
  x: number;
  width: number;
  /** Alturas libres de cada hueco, de abajo hacia arriba. */
  gaps: number[];
  shelves: ShelfPosition[];
}

export interface DividerPosition {
  index: number;
  /** Cara izquierda del divisor desde el borde exterior izquierdo. */
  left: number;
  /** Desde la cara interior del lateral izquierdo. */
  leftFromInside: number;
}

export type WarningLevel = 'error' | 'aviso' | 'info';

export interface Warning {
  level: WarningLevel;
  text: string;
}

export interface HardwareItem {
  name: string;
  qty: number;
  unit: string;
  notes?: string;
}

export interface ShelfUnitResult {
  pieces: Piece[];
  panels: FrontPanel[];
  columns: ColumnResult[];
  dividers: DividerPosition[];
  interior: { width: number; height: number; depth: number; baseY: number; topY: number };
  /** Profundidad útil de los estantes. */
  shelfDepth: number;
  warnings: Warning[];
  hardware: HardwareItem[];
}
