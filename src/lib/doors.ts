import { mm } from './format';
import type { ColumnResult, Door, DoorSpec, DoorsResult, HingeType, ShelfUnit, Warning } from './types';

/** Ancho a partir del cual una columna lleva dos puertas en modo automático. */
export const MAX_SINGLE_DOOR = 600;
/** Distancia del centro de la cazoleta al borde de la puerta (bisagra de 35 mm). */
export const CUP_EDGE_DISTANCE = 22;
/** Distancia de la base de la bisagra al frente del lateral (sistema 32). */
export const PLATE_FRONT_DISTANCE = 37;

export const HINGE_LABEL: Record<HingeType, string> = {
  recta: 'recta (codo 0)',
  codo9: 'codo 9',
  codo18: 'codo 18',
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

interface Context {
  unit: ShelfUnit;
  columns: ColumnResult[];
  baseY: number;
  topY: number;
  zh: number;
  interiorWidth: number;
  interiorHeight: number;
}

const NO_DOORS: DoorsResult = {
  doors: [],
  extraDepth: 0,
  swing: 0,
  hingeCounts: { recta: 0, codo9: 0, codo18: 0 },
  trackLength: 0,
};

export function computeDoors(ctx: Context): { result: DoorsResult; warnings: Warning[] } {
  const spec = ctx.unit.doors;
  if (spec.type === 'ninguna') return { result: NO_DOORS, warnings: [] };
  return spec.type === 'batiente' ? hinged(ctx) : sliding(ctx);
}

function hinged({ unit, columns, baseY, topY, zh }: Context): { result: DoorsResult; warnings: Warning[] } {
  const spec = unit.doors;
  const t = unit.material.thickness;
  const H = unit.height;
  const g = spec.gap;
  const n = columns.length;
  const overlay = spec.mount === 'superpuesta';
  const warnings: Warning[] = [];
  const doors: Door[] = [];
  const counts: Record<HingeType, number> = { recta: 0, codo9: 0, codo18: 0 };
  const label = (i: number) => (n > 1 ? `Columna ${i + 1}: ` : '');

  for (const col of columns) {
    const i = col.index;
    if (!columnHasDoors(spec, i)) continue;

    let limit = spec.upToShelf !== null ? col.shelves[spec.upToShelf - 1] : undefined;
    if (spec.upToShelf !== null && !limit) {
      warnings.push({ level: 'aviso', text: `${label(i)}no hay estante ${spec.upToShelf}, así que la puerta cubre todo el alto.` });
    }
    if (limit && limit.type === 'movil') {
      warnings.push({ level: 'aviso', text: `${label(i)}las puertas terminan en el estante ${spec.upToShelf}, que es móvil: conviene que sea fijo para que cierren contra él.` });
    }

    let left: number;
    let right: number;
    let bottom: number;
    let top: number;
    if (overlay) {
      left = col.x - (i === 0 ? t : t / 2);
      right = col.x + col.width + (i === n - 1 ? t : t / 2);
      bottom = zh;
      top = limit ? limit.top : unit.top === 'entre' ? H : H - t;
    } else {
      left = col.x;
      right = col.x + col.width;
      bottom = baseY;
      top = limit ? limit.bottom : topY;
    }
    const cover = right - left;
    const k = spec.perColumn || (cover > MAX_SINGLE_DOOR ? 2 : 1);
    const w = Math.floor(overlay ? cover / k - g : (cover - (k + 1) * g) / k);
    const h = Math.floor(overlay ? top - bottom - g : top - bottom - 2 * g);
    if (w < 80 || h < 80) {
      warnings.push({ level: 'error', text: `${label(i)}no hay lugar para una puerta (quedaría de ${mm(w)} × ${mm(h)} mm).` });
      continue;
    }
    if (k === 1 && w > MAX_SINGLE_DOOR) {
      warnings.push({
        level: 'aviso',
        text: `${label(i)}la puerta mide ${mm(w)} mm de ancho. Con más de ${MAX_SINGLE_DOOR} mm pesa mucho para las bisagras y barre mucho lugar al abrir: mejor 2 puertas.`,
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
      doors.push({ index: doors.length, column: i, x, y, w, h, hingeSide: side, hingeType: type, hinges, track: null });
    }
  }

  return {
    result: {
      doors,
      extraDepth: overlay && doors.length ? t : 0,
      swing: doors.reduce((m, d) => Math.max(m, d.w), 0),
      hingeCounts: counts,
      trackLength: 0,
    },
    warnings,
  };
}

function sliding({ unit, baseY, interiorWidth, interiorHeight }: Context): { result: DoorsResult; warnings: Warning[] } {
  const spec = unit.doors;
  const t = unit.material.thickness;
  const n = Math.max(2, Math.floor(spec.leaves));
  const warnings: Warning[] = [];
  const w = Math.floor((interiorWidth + (n - 1) * spec.overlap) / n);
  const h = Math.floor(interiorHeight - spec.heightDeduction);
  if (h < 80 || w < 80) {
    warnings.push({ level: 'error', text: 'No hay lugar para las puertas corredizas con estas medidas.' });
    return { result: { ...NO_DOORS }, warnings };
  }
  if (interiorWidth < 600) {
    warnings.push({ level: 'aviso', text: `Con ${mm(interiorWidth)} mm de ancho interior, las corredizas dejan abrir muy poco a la vez: conviene usar bisagras.` });
  } else if (w < 300) {
    warnings.push({ level: 'aviso', text: `Las hojas corredizas quedan de ${mm(w)} mm: muy angostas. Probá con menos hojas.` });
  }
  const doors: Door[] = Array.from({ length: n }, (_, j) => ({
    index: j,
    column: null,
    x: t + j * (w - spec.overlap),
    y: baseY + spec.heightDeduction / 2,
    w,
    h,
    hingeSide: null,
    hingeType: null,
    hinges: [],
    track: j % 2 === 0 ? 'trasero' : 'delantero',
  }));
  return {
    result: { doors, extraDepth: 0, swing: 0, hingeCounts: { recta: 0, codo9: 0, codo18: 0 }, trackLength: interiorWidth },
    warnings,
  };
}
