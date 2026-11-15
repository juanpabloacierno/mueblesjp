// Todas las medidas están en milímetros.

/** Placa para el cuerpo del mueble. */
export type BoardType = 'melamina' | 'melamina-mdf' | 'mdf' | 'aglomerado';
/** Placa para el fondo. */
export type BackType = 'fondo-blanco' | 'fibrofacil';

/** Placa interior: misma espesor que la exterior, otra marca, tipo, medida o color. */
export interface InteriorBoard {
  enabled: boolean;
  brand: string;
  boardType: BoardType;
  color: string;
  boardLength: number;
  boardWidth: number;
  hasGrain: boolean;
  /** El cuerpo (laterales, techo, piso, zócalo, maletero) va con el color exterior o el interior. */
  body: 'exterior' | 'interior';
}

export type Finish = 'exterior' | 'interior';

/** Material y parámetros de corte de un mueble. */
export interface Material {
  /** Marca de la placa del cuerpo ("Otra" = medidas cargadas a mano). */
  brand: string;
  boardType: BoardType;
  /** Marca y tipo de la placa del fondo. */
  backBrand: string;
  backType: BackType;
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
  /** Color interior distinto del exterior (estantes, divisores, cajones…). */
  interior: InteriorBoard;
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
export type FurnitureKind = 'estanteria' | 'placard';

/** Zapatero: estantes inclinados con tope, dos barras por nivel o estantes planos. */
export type ShoeRackStyle = 'inclinado' | 'barras' | 'plano';

/** Qué lleva un hueco además de ser espacio libre. */
export type CompartmentFill =
  | { kind: 'barral' }
  | { kind: 'cajones'; count: number }
  | { kind: 'zapatero'; style: ShoeRackStyle; levels: number };

export interface ColumnSpec {
  /** Luz interior de la columna. `null` = se reparte automáticamente. */
  width: number | null;
  shelves: number;
  shelfType: ShelfType;
  /** Alturas libres de los huecos desde abajo. `null` = automática. */
  gaps: (number | null)[];
  /** Contenido de cada hueco desde abajo. `null` = libre (estantes). */
  fill: (CompartmentFill | null)[];
  /**
   * Hueco para las piernas (escritorios): sin piso, estantes ni fondo; los costados que lo
   * rodean llegan al suelo y atrás lleva el faldón.
   */
  knee?: boolean;
}

/** Mueble empotrado: se cargan las medidas del hueco y se descuentan holguras. */
export interface NicheSpec {
  enabled: boolean;
  width: number;
  height: number;
  depth: number;
  /** Holgura en cada costado. */
  sideGap: number;
  /** Holgura arriba (también ayuda a pararlo). */
  topGap: number;
  /** Holgura atrás por paredes desparejas. */
  backGap: number;
}

/** Maletero: estante fijo de lado a lado arriba, con puertas propias. */
export interface MaleteroSpec {
  enabled: boolean;
  /** Alto libre del maletero. */
  height: number;
  /** Divisores en el maletero alineados con los de abajo. */
  dividers: boolean;
}

/** Faldón de los escritorios. */
export interface ModestySpec {
  enabled: boolean;
  /** Alto del faldón. */
  height: number;
}

export interface ShelfUnit {
  kind: FurnitureKind;
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
  niche: NicheSpec;
  maletero: MaleteroSpec;
  /** Faldón: tablero atrás de cada hueco para las piernas, debajo de la tapa. */
  modesty: ModestySpec;
  material: Material;
  /** Ítems de la lista de compras marcados o desmarcados a mano (clave → comprar). */
  shopping: Record<string, boolean>;
  /** Pasos de armado ya hechos. */
  progress: Record<string, boolean>;
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
  /** Color de la pieza de melamina; `null` en el fondo. */
  finish: Finish | null;
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
  | 'maletero'
  | 'divisor-maletero'
  | 'faldon'
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

export interface RodResult {
  column: number;
  /** Centro del barral desde el suelo. */
  y: number;
  length: number;
  /** Largo libre para colgar: del barral al piso del hueco. */
  hanging: number;
  supports: number;
}

export interface DrawerResult {
  column: number;
  count: number;
  /** Frente (tapa) terminado. */
  frontW: number;
  frontH: number;
  /** Borde de abajo de cada frente, desde el suelo. */
  fronts: number[];
  x: number;
  /** Caja del cajón: ancho exterior, alto de los costados y largo (= corredera). */
  boxW: number;
  boxH: number;
  slide: number;
  /** Centro de cada corredera desde el suelo (para marcar laterales y divisores). */
  slideCenters: number[];
}

export interface ShoeLevel {
  /**
   * Inclinado: cara de abajo del estante adelante y atrás. Barras: centro de la barra de
   * adelante y de la de atrás. Plano: cara de abajo del estante (las dos iguales).
   * Todo desde el suelo.
   */
  front: number;
  back: number;
}

export interface ShoeRackResult {
  column: number;
  style: ShoeRackStyle;
  /** Luz de la columna y su borde izquierdo. */
  x: number;
  width: number;
  bottom: number;
  height: number;
  /** Profundidad desde el frente del mueble hasta donde empieza el hueco. */
  frontOffset: number;
  levels: ShoeLevel[];
  /** Inclinado y barras: recorrido horizontal y cuánto sube hacia atrás. */
  run: number;
  rise: number;
  /** Alto libre por nivel (adelante). */
  pitch: number;
}

export interface CompartmentResult {
  index: number;
  /** Piso del hueco (cara de arriba del estante o piso de abajo), desde el suelo. */
  bottom: number;
  height: number;
  /** Profundidad útil del hueco. */
  depth: number;
  fill: CompartmentFill | null;
  rod?: RodResult;
  drawers?: DrawerResult;
  shoes?: ShoeRackResult;
}

export interface ColumnResult {
  index: number;
  /** Cara izquierda de la luz interior, desde el borde exterior izquierdo. */
  x: number;
  width: number;
  /** Alturas libres de cada hueco, de abajo hacia arriba. */
  gaps: number[];
  shelves: ShelfPosition[];
  compartments: CompartmentResult[];
  /** Hueco para las piernas (un solo hueco del suelo a la tapa). */
  knee?: boolean;
}

export interface DividerPosition {
  index: number;
  /** Cara izquierda del divisor desde el borde exterior izquierdo. */
  left: number;
  /** Desde la cara interior del lateral izquierdo. */
  leftFromInside: number;
  /** Junto a un hueco para las piernas: llega al suelo (pieza "Lateral interior"). */
  full?: boolean;
}

/** Tramo de columnas seguidas con piso (entre huecos para las piernas): lleva piso, zócalo y fondo. */
export interface BaseSegment {
  /** Primera y última columna del tramo. */
  from: number;
  to: number;
  /** Borde izquierdo y largo del piso. */
  x: number;
  w: number;
}

/** Hueco para las piernas. */
export interface KneeResult {
  column: number;
  x: number;
  width: number;
  /** Alto libre del suelo a la tapa. */
  height: number;
  /** Faldón: borde de abajo desde el suelo y alto. */
  modesty: { y: number; h: number } | null;
}

export type WarningLevel = 'error' | 'aviso' | 'info';

export interface Warning {
  level: WarningLevel;
  text: string;
}

export interface Door extends Rect {
  index: number;
  zone: 'principal' | 'maletero';
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
  /** Juegos de rieles (uno abajo y otro en el maletero). */
  trackSets: number;
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
  /** Medidas reales del mueble (en empotrados, el hueco menos las holguras). */
  size: { width: number; height: number; depth: number };
  pieces: Piece[];
  panels: FrontPanel[];
  columns: ColumnResult[];
  dividers: DividerPosition[];
  /** Tramos con piso (sin huecos para las piernas es uno solo, de lateral a lateral). */
  bases: BaseSegment[];
  knees: KneeResult[];
  interior: { width: number; height: number; depth: number; baseY: number; topY: number };
  /** Techo de la zona de columnas: cara de abajo del estante maletero, o del techo. */
  columnsTop: number;
  maletero: { shelfBottom: number; shelfTop: number; height: number } | null;
  /** Diagonal del lateral: alto libre que hace falta para parar el mueble armado. */
  diagonal: number;
  rods: RodResult[];
  drawers: DrawerResult[];
  shoeRacks: ShoeRackResult[];
  /** Profundidad útil de los estantes (sin contar retiros por puertas o rieles). */
  shelfDepth: number;
  /** Lo que se retiran del frente estantes y divisores por los rieles de corredizas. */
  frontInset: number;
  doors: DoorsResult;
  counts: FastenerCounts;
  warnings: Warning[];
}
