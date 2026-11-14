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

/** Precios de la versión anterior (antes de la lista de compras). Solo para migrar. */
export interface LegacyPrices {
  board: number;
  backBoard: number;
  edgePerMeter: number;
  cutPerBoard: number;
}

export type TopMode = 'entre' | 'sobre';
export type DoorType = 'ninguna' | 'batiente' | 'corrediza';
/** Superpuesta: la puerta tapa el canto del mueble. Embutida: va adentro del hueco. */
export type DoorMount = 'superpuesta' | 'embutida';
/** Bisagras cazoleta 35 mm: recta (codo 0), codo 9 (media tapa), codo 18 (embutida). */
export type HingeType = 'recta' | 'codo9' | 'codo18';

export interface DoorSpec {
  type: DoorType;
  mount: DoorMount;
  /** Puertas por columna: 0 = automático (2 si la columna es ancha). */
  perColumn: 0 | 1 | 2;
  /** Columnas con puertas (por índice). Si falta un valor, la columna lleva puertas. */
  columns: boolean[];
  /** Las puertas cubren desde abajo hasta este estante (1 = el primero). `null` = todo el alto. */
  upToShelf: number | null;
  /** Luz entre puertas y bordes. */
  gap: number;
  /** Corredizas: cantidad de hojas. */
  leaves: number;
  /** Corredizas: cuánto se superponen dos hojas vecinas. */
  overlap: number;
  /** Corredizas: alto de puerta = alto libre − este valor (depende del kit). */
  heightDeduction: number;
  /** Corredizas: profundidad que ocupan los rieles; estantes y divisores van detrás. */
  trackDepth: number;
}
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
  doors: DoorSpec;
  material: Material;
  /** Ítems de la lista de compras marcados o desmarcados a mano (clave → comprar). */
  shopping: Record<string, boolean>;
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
  | 'estante-movil'
  | 'puerta';

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
  /** Profundidad del estante (menor detrás de puertas embutidas o rieles). */
  depth: number;
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

export interface Door extends Rect {
  index: number;
  /** Columna que cierra (`null` en corredizas, que cubren todo el ancho). */
  column: number | null;
  hingeSide: 'izquierda' | 'derecha' | null;
  hingeType: HingeType | null;
  /** Centro de cada bisagra medido desde el borde de abajo de la puerta. */
  hinges: number[];
  track: 'trasero' | 'delantero' | null;
}

export interface DoorsResult {
  doors: Door[];
  /** Profundidad que suman las puertas por delante del mueble. */
  extraDepth: number;
  /** Lugar libre necesario al frente para abrir (ancho de la puerta más ancha). */
  swing: number;
  hingeCounts: Record<HingeType, number>;
  /** Largo de cada riel (superior e inferior) en corredizas. */
  trackLength: number;
}

/** Cantidades de uniones y fijaciones para la lista de compras. */
export interface FastenerCounts {
  screwsPerJoint: number;
  joints: number;
  screws: number;
  visibleScrews: number;
  shelfPins: number;
  backNails: number;
}

export interface ShelfUnitResult {
  pieces: Piece[];
  panels: FrontPanel[];
  columns: ColumnResult[];
  dividers: DividerPosition[];
  interior: { width: number; height: number; depth: number; baseY: number; topY: number };
  /** Profundidad útil de los estantes (sin contar retiros por puertas o rieles). */
  shelfDepth: number;
  /** Lo que se retiran del frente estantes y divisores por los rieles de corredizas. */
  frontInset: number;
  doors: DoorsResult;
  counts: FastenerCounts;
  warnings: Warning[];
}
