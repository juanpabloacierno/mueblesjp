import { mm } from './format';
import { tr } from './i18n';
import type { ColumnResult, Door, DoorSpec, DoorsResult, HingeType, ShelfPosition, ShelfUnit, Warning } from './types';

/** Ancho a partir del cual una columna lleva dos puertas en modo automático. */
export const MAX_SINGLE_DOOR = 600;
/** Distancia del centro de la cazoleta al borde de la puerta (bisagra de 35 mm). */
export const CUP_EDGE_DISTANCE = 22;
/** Distancia de la base de la bisagra al frente del lateral (sistema 32). */
export const PLATE_FRONT_DISTANCE = 37;

export const HINGE_LABEL: Record<HingeType, string> = {
  get recta() {
    return tr('recta (codo 0)', 'full overlay (straight arm)');
  },
  get codo9() {
    return tr('codo 9', 'half overlay (9 mm crank)');
  },
  get codo18() {
    return tr('codo 18', 'inset (18 mm crank)');
  },
};

export function hingeCount(height: number): number {
  if (height <= 900) return 2;
  if (height <= 1600) return 3;
  if (height <= 2000) return 4;
  return 5;
}

/** Centros de las bisagras desde el borde de abajo de la puerta. */
export function hingePositions(height: number): number[] {
  const n = hingeCount(height);
  const margin = height < 400 ? 70 : 100;
  if (height <= 2 * margin) return [Math.round(height / 2)];
  return Array.from({ length: n }, (_, i) => Math.round(margin + (i * (height - 2 * margin)) / (n - 1)));
}

export function columnHasDoors(spec: DoorSpec, index: number): boolean {
  return spec.type === 'batiente' && (spec.columns[index] ?? true);
}

/** El estante `j` (desde 0) de una columna queda detrás de una puerta embutida. */
export function shelfBehindInsetDoor(spec: DoorSpec, column: number, shelfIndex: number, shelvesInColumn: number): boolean {
  if (spec.type !== 'batiente' || spec.mount !== 'embutida' || !columnHasDoors(spec, column)) return false;
  if (spec.upToShelf === null || spec.upToShelf > shelvesInColumn) return true;
  return shelfIndex < spec.upToShelf - 1;
}

/** El hueco `j` (desde 0) de una columna queda detrás de una puerta embutida. */
export function compartmentBehindInsetDoor(spec: DoorSpec, column: number, index: number, shelvesInColumn: number): boolean {
  if (spec.type !== 'batiente' || spec.mount !== 'embutida' || !columnHasDoors(spec, column)) return false;
  if (spec.upToShelf === null || spec.upToShelf > shelvesInColumn) return true;
  return index < spec.upToShelf;
}

interface Context {
  unit: ShelfUnit;
  columns: ColumnResult[];
  baseY: number;
  topY: number;
  zh: number;
  interiorWidth: number;
  /** Cara de abajo del estante maletero o `null` si no hay maletero. */
  maleteroShelfBottom: number | null;
}

interface ZoneColumn {
  index: number;
  x: number;
  width: number;
  shelves: ShelfPosition[];
}

interface Zone {
  name: 'principal' | 'maletero';
  columns: ZoneColumn[];
  /** Límites de puertas superpuestas (cubren cantos) y embutidas (dentro del hueco). */
  overlay: [number, number];
  inset: [number, number];
  /** Solo en la zona principal: respeta columnas sin puertas y "hasta el estante". */
  main: boolean;
}

const NO_DOORS: DoorsResult = {
  doors: [],
  extraDepth: 0,
  swing: 0,
  hingeCounts: { recta: 0, codo9: 0, codo18: 0 },
  trackLength: 0,
  trackSets: 0,
};

function zones(ctx: Context): Zone[] {
  const { unit, columns, baseY, topY, zh, maleteroShelfBottom } = ctx;
  const t = unit.material.thickness;
  const top = unit.top === 'entre' ? unit.height : unit.height - t;
  const main: Zone = {
    name: 'principal',
    columns,
    overlay: [zh, maleteroShelfBottom === null ? top : maleteroShelfBottom + t / 2],
    inset: [baseY, maleteroShelfBottom ?? topY],
    main: true,
  };
  if (maleteroShelfBottom === null) return [main];
  const malCols: ZoneColumn[] = unit.maletero.dividers
    ? columns.map((c) => ({ index: c.index, x: c.x, width: c.width, shelves: [] }))
    : [{ index: 0, x: t, width: ctx.interiorWidth, shelves: [] }];
  return [
    main,
    {
      name: 'maletero',
      columns: malCols,
      overlay: [maleteroShelfBottom + t / 2, top],
      inset: [maleteroShelfBottom + t, topY],
      main: false,
    },
  ];
}

export function computeDoors(ctx: Context): { result: DoorsResult; warnings: Warning[] } {
  const spec = ctx.unit.doors;
  if (spec.type === 'ninguna') return { result: { ...NO_DOORS, doors: [] }, warnings: [] };
  const result: DoorsResult = { ...NO_DOORS, doors: [], hingeCounts: { recta: 0, codo9: 0, codo18: 0 } };
  const warnings: Warning[] = [];
  for (const zone of zones(ctx)) {
    const part = spec.type === 'batiente' ? hinged(ctx, zone) : sliding(ctx, zone);
    for (const d of part.doors) result.doors.push({ ...d, index: result.doors.length });
    warnings.push(...part.warnings);
    for (const k of Object.keys(result.hingeCounts) as HingeType[]) result.hingeCounts[k] += part.hingeCounts[k];
    if (part.trackLength) {
      result.trackLength = part.trackLength;
      result.trackSets += 1;
    }
  }
  const t = ctx.unit.material.thickness;
  result.extraDepth = spec.type === 'batiente' && spec.mount === 'superpuesta' && result.doors.length ? t : 0;
  result.swing = spec.type === 'batiente' ? result.doors.reduce((m, d) => Math.max(m, d.w), 0) : 0;
  return { result, warnings };
}

interface ZoneDoors {
  doors: Door[];
  warnings: Warning[];
  hingeCounts: Record<HingeType, number>;
  trackLength: number;
}

function hinged({ unit }: Context, zone: Zone): ZoneDoors {
  const spec = unit.doors;
  const t = unit.material.thickness;
  const g = spec.gap;
  const n = zone.columns.length;
  const overlay = spec.mount === 'superpuesta';
  const warnings: Warning[] = [];
  const doors: Door[] = [];
  const counts: Record<HingeType, number> = { recta: 0, codo9: 0, codo18: 0 };
  const prefix = zone.main ? '' : tr('Maletero, ', 'Top storage, ');
  const label = (i: number) => (n > 1 ? `${prefix}${tr('columna', 'column')} ${i + 1}: ` : zone.main ? '' : tr('Maletero: ', 'Top storage: '));

  for (const col of zone.columns) {
    const i = col.index;
    if (zone.main && !columnHasDoors(spec, i)) continue;

    const limit = zone.main && spec.upToShelf !== null ? col.shelves[spec.upToShelf - 1] : undefined;
    if (zone.main && spec.upToShelf !== null && !limit) {
      warnings.push({ level: 'aviso', text: label(i) + tr(`no hay estante ${spec.upToShelf}, así que la puerta cubre todo el alto.`, `there is no shelf ${spec.upToShelf}, so the door covers the full height.`) });
    }
    if (limit && limit.type === 'movil') {
      warnings.push({ level: 'aviso', text:
          label(i) +
          tr(
            `las puertas terminan en el estante ${spec.upToShelf}, que es móvil: conviene que sea fijo para que cierren contra él.`,
            `the doors end at shelf ${spec.upToShelf}, which is adjustable: make it fixed so the doors close against it.`,
          ), });
    }

    let left: number;
    let right: number;
    let bottom: number;
    let top: number;
    if (overlay) {
      left = col.x - (i === 0 ? t : t / 2);
      right = col.x + col.width + (i === n - 1 ? t : t / 2);
      [bottom, top] = zone.overlay;
      if (limit) top = limit.top;
    } else {
      left = col.x;
      right = col.x + col.width;
      [bottom, top] = zone.inset;
      if (limit) top = limit.bottom;
    }
    const cover = right - left;
    const k = spec.perColumn || (cover > MAX_SINGLE_DOOR ? 2 : 1);
    const w = Math.floor(overlay ? cover / k - g : (cover - (k + 1) * g) / k);
    const h = Math.floor(overlay ? top - bottom - g : top - bottom - 2 * g);
    if (w < 80 || h < 80) {
      warnings.push({ level: 'error', text: label(i) + tr(`no hay lugar para una puerta (quedaría de ${mm(w)} × ${mm(h)} mm).`, `there is no room for a door (it would be ${mm(w)} × ${mm(h)} mm).`) });
      continue;
    }
    if (w > MAX_SINGLE_DOOR) {
      warnings.push({
        level: 'aviso',
        text:
          label(i) +
          tr(
            `cada puerta mide ${mm(w)} mm de ancho. Con más de ${MAX_SINGLE_DOOR} mm pesa mucho para las bisagras y barre mucho espacio al abrir: ${
              k === 1 ? 'mejor 2 puertas' : 'agrega un divisor'
            }.`,
            `each door is ${mm(w)} mm wide. Over ${MAX_SINGLE_DOOR} mm it is too heavy for the hinges and sweeps a lot of space when opening: ${
              k === 1 ? 'better use 2 doors' : 'add a divider'
            }.`,
          ),
      });
    }

    for (let j = 0; j < k; j++) {
      const x = overlay ? left + (j * cover) / k + g / 2 : left + g + j * (w + g);
      const y = overlay ? bottom + g / 2 : bottom + g;
      let side: 'izquierda' | 'derecha';
      if (k === 2) side = j === 0 ? 'izquierda' : 'derecha';
      else side = n === 1 || i <= (n - 1) / 2 ? 'izquierda' : 'derecha';
      const onSide = side === 'izquierda' ? i === 0 : i === n - 1;
      const type: HingeType = overlay ? (onSide ? 'recta' : 'codo9') : 'codo18';
      const hinges = hingePositions(h);
      counts[type] += hinges.length;
      doors.push({ index: 0, zone: zone.name, column: zone.main || unit.maletero.dividers ? i : null, x, y, w, h, hingeSide: side, hingeType: type, hinges, track: null });
    }
  }
  return { doors, warnings, hingeCounts: counts, trackLength: 0 };
}

function sliding({ unit, interiorWidth }: Context, zone: Zone): ZoneDoors {
  const spec = unit.doors;
  const t = unit.material.thickness;
  const n = Math.max(2, Math.floor(spec.leaves));
  const warnings: Warning[] = [];
  const empty: ZoneDoors = { doors: [], warnings, hingeCounts: { recta: 0, codo9: 0, codo18: 0 }, trackLength: 0 };
  const [bottom, top] = zone.inset;
  const w = Math.floor((interiorWidth + (n - 1) * spec.overlap) / n);
  const h = Math.floor(top - bottom - spec.heightDeduction);
  if (h < 80 || w < 80) {
    warnings.push({
      level: 'error',
      text: zone.main
        ? tr('No hay lugar para las puertas corredizas con estas medidas.', 'There is no room for the sliding doors with these dimensions.')
        : tr('No hay lugar para las puertas corredizas del maletero con estas medidas.', 'There is no room for the top storage sliding doors with these dimensions.'),
    });
    return empty;
  }
  if (zone.main) {
    if (interiorWidth < 600) {
      warnings.push({ level: 'aviso', text: tr(
          `Con ${mm(interiorWidth)} mm de ancho interior, las corredizas dejan abrir muy poco a la vez: conviene usar bisagras.`,
          `With ${mm(interiorWidth)} mm of interior width, sliding doors open very little at a time: hinged doors are a better choice.`,
        ), });
    } else if (w < 300) {
      warnings.push({ level: 'aviso', text: tr(`Las hojas corredizas quedan de ${mm(w)} mm: muy angostas. Prueba con menos hojas.`, `The sliding door panels end up ${mm(w)} mm wide: too narrow. Try fewer panels.`) });
    }
  }
  const doors: Door[] = Array.from({ length: n }, (_, j) => ({
    index: j,
    zone: zone.name,
    column: null,
    x: t + j * (w - spec.overlap),
    y: bottom + spec.heightDeduction / 2,
    w,
    h,
    hingeSide: null,
    hingeType: null,
    hinges: [],
    track: j % 2 === 0 ? 'trasero' : 'delantero',
  }));
  return { ...empty, doors, trackLength: interiorWidth };
}
