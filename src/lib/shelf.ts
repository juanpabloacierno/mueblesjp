import { distribute } from './distribute';
import { HINGE_LABEL, computeDoors, shelfBehindInsetDoor } from './doors';
import { mm, pieceCode } from './format';
import type {
  ColumnResult,
  DividerPosition,
  DoorsResult,
  Edges,
  FastenerCounts,
  FrontPanel,
  Piece,
  PieceMaterial,
  ShelfPosition,
  ShelfUnit,
  ShelfUnitResult,
  Warning,
} from './types';

interface RawPiece {
  name: string;
  qty: number;
  length: number;
  width: number;
  thickness: number;
  material: PieceMaterial;
  edges: Edges;
  canRotate: boolean;
  notes: string[];
  cols: number[];
}

/** Luz máxima recomendada para estantes cargados (libros), según el espesor. */
export function maxShelfSpan(thickness: number): number {
  if (thickness < 16) return 600;
  if (thickness < 20) return 800;
  if (thickness < 24) return 900;
  return 1000;
}

/** Tornillos por unión según la profundidad del panel. */
export function screwsPerJoint(depth: number): number {
  if (depth <= 300) return 2;
  if (depth <= 450) return 3;
  return 4;
}

/** Medidas útiles de una placa, descontando el refilado. */
export function usableBoard(length: number, width: number, trim: number) {
  return { length: length - 2 * trim, width: width - 2 * trim };
}

function fitsBoard(a: number, b: number, L: number, W: number): boolean {
  return (a <= L && b <= W) || (a <= W && b <= L);
}

const EMPTY_DOORS: DoorsResult = { doors: [], extraDepth: 0, swing: 0, hingeCounts: { recta: 0, codo9: 0, codo18: 0 }, trackLength: 0 };
const EMPTY_COUNTS: FastenerCounts = { screwsPerJoint: 0, joints: 0, screws: 0, visibleScrews: 0, shelfPins: 0, backNails: 0 };

export function computeShelfUnit(unit: ShelfUnit): ShelfUnitResult {
  const m = unit.material;
  const t = m.thickness;
  const tb = m.backThickness;
  const { width: W, height: H, depth: D } = unit;
  const warnings: Warning[] = [];

  const zh = unit.plinth.enabled ? unit.plinth.height : 0;
  const backMode = unit.back.mode;
  const carcassDepth = backMode === 'clavado' ? D - tb : D;
  const backInset = backMode === 'ranurado' ? unit.back.grooveOffset + tb : 0;
  const interiorDepth = carcassDepth - backInset;
  const frontInset = unit.doors.type === 'corrediza' ? unit.doors.trackDepth : 0;
  const shelfDepth = interiorDepth - unit.shelfSetback;
  const sideHeight = unit.top === 'sobre' ? H - t : H;
  const baseY = zh + t;
  const topY = H - t;
  const interiorHeight = topY - baseY;
  const interiorWidth = W - 2 * t;
  const n = Math.max(1, unit.columns.length);

  const empty: ShelfUnitResult = {
    pieces: [],
    panels: [],
    columns: [],
    dividers: [],
    interior: { width: interiorWidth, height: interiorHeight, depth: interiorDepth, baseY, topY },
    shelfDepth,
    frontInset,
    doors: EMPTY_DOORS,
    counts: EMPTY_COUNTS,
    warnings,
  };

  // --- Validaciones que impiden calcular ---
  if (interiorWidth - (n - 1) * t < 20 * n) {
    warnings.push({ level: 'error', text: `El ancho (${mm(W)} mm) no alcanza para ${n} columnas con melamina de ${mm(t)} mm.` });
  }
  if (interiorHeight < 20) {
    warnings.push({ level: 'error', text: `El alto (${mm(H)} mm) es muy chico para el zócalo, el piso y el techo.` });
  }
  if (shelfDepth - frontInset < 20) {
    warnings.push({
      level: 'error',
      text: frontInset
        ? `La profundidad (${mm(D)} mm) no alcanza para los rieles de ${mm(frontInset)} mm: quedan ${mm(shelfDepth - frontInset)} mm para los estantes.`
        : `La profundidad (${mm(D)} mm) no alcanza: quedan ${mm(shelfDepth)} mm útiles.`,
    });
  }
  if (backMode === 'ranurado' && unit.back.grooveDepth >= t) {
    warnings.push({ level: 'error', text: `La ranura (${mm(unit.back.grooveDepth)} mm) no puede ser tan profunda como la melamina (${mm(t)} mm).` });
  }
  if (warnings.some((w) => w.level === 'error')) return empty;

  // --- Columnas ---
  const colDist = distribute(
    interiorWidth - (n - 1) * t,
    unit.columns.map((c) => c.width),
  );
  if (colDist.overflow) {
    warnings.push({ level: 'error', text: 'Los anchos de columna que fijaste suman más que el ancho interior disponible.' });
    return empty;
  }
  if (colDist.mismatch !== 0) {
    const last = colDist.values.length - 1;
    colDist.values[last] += colDist.mismatch;
    warnings.push({
      level: 'aviso',
      text: `Los anchos fijos no completan el mueble: la última columna queda de ${mm(colDist.values[last])} mm. Dejá alguna columna en automático.`,
    });
  }
  const widths = colDist.values;
  if (widths.some((w) => w < 20)) {
    warnings.push({ level: 'error', text: 'Alguna columna queda demasiado angosta.' });
    return empty;
  }

  const columns: ColumnResult[] = [];
  const dividers: DividerPosition[] = [];
  const insetDoorRecess = t + 2;
  let x = t;
  for (let i = 0; i < n; i++) {
    const spec = unit.sameShelves ? unit.columns[0] : unit.columns[i];
    const k = Math.max(0, Math.floor(spec.shelves));
    const gapSpecs = Array.from({ length: k + 1 }, (_, j) => spec.gaps[j] ?? null);
    const gapDist = distribute(interiorHeight - k * t, gapSpecs);
    const label = n > 1 ? `Columna ${i + 1}: ` : '';
    if (gapDist.overflow) {
      warnings.push({ level: 'error', text: `${label}las alturas fijas de los huecos no entran en el alto interior (${mm(interiorHeight)} mm).` });
      return empty;
    }
    if (gapDist.mismatch !== 0) {
      gapDist.values[k] += gapDist.mismatch;
      warnings.push({
        level: 'aviso',
        text: `${label}el hueco de arriba se ajustó a ${mm(gapDist.values[k])} mm para completar la altura.`,
      });
    }
    const gaps = gapDist.values;
    const shelves: ShelfPosition[] = [];
    let y = baseY;
    for (let j = 0; j < k; j++) {
      y += gaps[j];
      const depth = shelfDepth - frontInset - (shelfBehindInsetDoor(unit.doors, i, j, k) ? insetDoorRecess : 0);
      shelves.push({ index: j, bottom: y, top: y + t, bottomFromBase: y - baseY, type: spec.shelfType, depth });
      y += t;
    }
    const minGap = Math.min(...gaps);
    if (minGap < 60) {
      warnings.push({ level: 'aviso', text: `${label}hay un hueco de solo ${mm(minGap)} mm de alto.` });
    }
    columns.push({ index: i, x, width: widths[i], gaps, shelves });
    x += widths[i];
    if (i < n - 1) {
      dividers.push({ index: i, left: x, leftFromInside: x - t });
      x += t;
    }
  }

  // --- Puertas ---
  const doorCalc = computeDoors({ unit, columns, baseY, topY, zh, interiorWidth, interiorHeight });
  warnings.push(...doorCalc.warnings);
  const doors = doorCalc.result;

  // --- Piezas ---
  const canRotate = !m.hasGrain;
  const raw: RawPiece[] = [];
  const add = (p: Omit<RawPiece, 'thickness' | 'material' | 'canRotate' | 'notes' | 'cols'> & Partial<RawPiece>) =>
    raw.push({ thickness: t, material: 'melamina', canRotate, notes: [], cols: [], ...p });

  add({
    name: 'Lateral',
    qty: 2,
    length: sideHeight,
    width: carcassDepth,
    edges: { long: 1, short: unit.top === 'entre' ? 1 : 0 },
    notes: ['Veta vertical'],
  });
  if (unit.top === 'entre') {
    add({ name: 'Techo', qty: 1, length: interiorWidth, width: carcassDepth, edges: { long: 1, short: 0 } });
  } else {
    add({ name: 'Techo', qty: 1, length: W, width: carcassDepth, edges: { long: 1, short: 2 }, notes: ['Apoya sobre los laterales'] });
  }
  add({ name: 'Piso', qty: 1, length: interiorWidth, width: carcassDepth, edges: { long: 1, short: 0 } });
  if (unit.plinth.enabled) {
    add({
      name: 'Zócalo',
      qty: 1,
      length: interiorWidth,
      width: zh,
      edges: { long: 0, short: 0 },
      notes: unit.plinth.setback > 0 ? [`Retirado ${mm(unit.plinth.setback)} mm del frente`] : ['Al ras del frente'],
    });
    if (backMode !== 'clavado') {
      add({ name: 'Zócalo trasero', qty: 1, length: interiorWidth, width: zh, edges: { long: 0, short: 0 }, notes: ['Refuerzo atrás'] });
    }
  }
  if (n > 1) {
    const notes = ['Veta vertical'];
    if (backMode === 'ranurado') notes.push('Termina contra el fondo');
    if (frontInset) notes.push(`Retirado ${mm(frontInset)} mm del frente por los rieles`);
    add({
      name: 'Divisor',
      qty: n - 1,
      length: interiorHeight,
      width: (backMode === 'ranurado' ? interiorDepth : carcassDepth) - frontInset,
      edges: { long: 1, short: 0 },
      notes,
    });
  }
  columns.forEach((col) => {
    for (const s of col.shelves) {
      const fixed = s.type === 'fijo';
      add({
        name: fixed ? 'Estante fijo' : 'Estante móvil',
        qty: 1,
        length: fixed ? col.width : col.width - unit.movableClearance,
        width: s.depth,
        edges: { long: 1, short: 0 },
        notes: fixed ? [] : [`${mm(unit.movableClearance)} mm de holgura`],
        cols: [col.index + 1],
      });
    }
  });
  for (const d of doors.doors) {
    const isSliding = d.track !== null;
    add({
      name: isSliding ? 'Puerta corrediza' : 'Puerta',
      qty: 1,
      length: d.h,
      width: d.w,
      edges: { long: 2, short: 2 },
      notes: isSliding ? [`Solape ${mm(unit.doors.overlap)} mm`, 'Veta vertical'] : [`Bisagra ${HINGE_LABEL[d.hingeType!]}`, 'Veta vertical'],
      cols: d.column !== null ? [d.column + 1] : [],
    });
  }

  // --- Fondo ---
  if (backMode !== 'ninguno') {
    const backLen = backMode === 'clavado' ? H - 2 : interiorHeight + 2 * (unit.back.grooveDepth - 1);
    const backWid = backMode === 'clavado' ? W - 2 : interiorWidth + 2 * (unit.back.grooveDepth - 1);
    const board = usableBoard(m.backBoardLength, m.backBoardWidth, m.trim);
    const parts = splitBack(backLen, backWid, board.length, board.width, backMode === 'clavado' ? dividers.map((d) => d.left + t / 2 - 1) : []);
    const notes = backMode === 'clavado' ? ['Va clavado atrás, 1 mm adentro de cada borde'] : [`Entra ${mm(unit.back.grooveDepth - 1)} mm en cada ranura`];
    if (parts.length > 1) {
      warnings.push({
        level: 'aviso',
        text: `El fondo (${mm(backLen)} × ${mm(backWid)} mm) no entra en una placa: se corta en ${parts.length} partes. Cada unión tiene que caer sobre un divisor, un estante fijo o un listón.`,
      });
    }
    for (const p of uniqueParts(parts)) {
      raw.push({
        name: parts.length > 1 ? 'Fondo (parte)' : 'Fondo',
        qty: p.qty,
        length: p.length,
        width: p.width,
        thickness: tb,
        material: 'fondo',
        edges: { long: 0, short: 0 },
        canRotate: true,
        notes,
        cols: [],
      });
    }
  }

  const pieces = mergePieces(raw, n);

  // --- Plano de frente ---
  const panels: FrontPanel[] = [
    { role: 'lateral', x: 0, y: 0, w: t, h: sideHeight },
    { role: 'lateral', x: W - t, y: 0, w: t, h: sideHeight },
    unit.top === 'entre'
      ? { role: 'techo', x: t, y: H - t, w: interiorWidth, h: t }
      : { role: 'techo', x: 0, y: H - t, w: W, h: t },
    { role: 'piso', x: t, y: zh, w: interiorWidth, h: t },
  ];
  if (unit.plinth.enabled) {
    panels.push({ role: 'zocalo', x: t, y: 0, w: interiorWidth, h: zh, recessed: unit.plinth.setback > 0 });
  }
  for (const d of dividers) panels.push({ role: 'divisor', x: d.left, y: baseY, w: t, h: interiorHeight, recessed: frontInset > 0 });
  for (const col of columns) {
    for (const s of col.shelves) {
      panels.push({
        role: s.type === 'fijo' ? 'estante-fijo' : 'estante-movil',
        x: col.x,
        y: s.bottom,
        w: col.width,
        h: t,
        recessed: s.depth < shelfDepth,
      });
    }
  }

  // --- Avisos generales ---
  const span = maxShelfSpan(t);
  columns.forEach((col) => {
    if (col.shelves.length > 0 && col.width > span) {
      warnings.push({
        level: 'aviso',
        text: `${n > 1 ? `Columna ${col.index + 1}: ` : ''}estantes de ${mm(col.width)} mm de luz. Con ${mm(t)} mm conviene no pasar de ${span} mm si van a cargar peso (libros): agregá un divisor o usá una placa más gruesa.`,
      });
    }
  });
  for (let i = 0; i < dividers.length; i++) {
    const a = columns[i].shelves.filter((s) => s.type === 'fijo');
    const b = columns[i + 1].shelves.filter((s) => s.type === 'fijo');
    if (a.some((sa) => b.some((sb) => Math.abs(sa.bottom - sb.bottom) < 30))) {
      warnings.push({
        level: 'info',
        text: `Hay estantes fijos a la misma altura a los dos lados del divisor ${i + 1}: los tornillos chocarían. Atornillá uno y fijá el otro con tarugos o minifix, o desfasalos unos centímetros.`,
      });
      break;
    }
  }
  if (H > 1200) {
    warnings.push({
      level: H / D > 5 ? 'aviso' : 'info',
      text: `Fijá el mueble a la pared con escuadras: mide ${mm(H)} mm de alto y ${mm(D)} mm de profundidad, y puede volcar.`,
    });
  }

  return {
    pieces,
    panels,
    columns,
    dividers,
    interior: { width: interiorWidth, height: interiorHeight, depth: interiorDepth, baseY, topY },
    shelfDepth,
    frontInset,
    doors,
    counts: countFasteners(unit, columns, dividers, carcassDepth, interiorWidth, interiorHeight),
    warnings,
  };
}

interface BackPart {
  length: number;
  width: number;
}

/**
 * Divide el fondo si no entra en una placa. Intenta cortar a lo ancho en el centro de
 * los divisores (`joints`, medido desde el borde izquierdo del fondo); si no, en partes iguales.
 */
export function splitBack(length: number, width: number, boardL: number, boardW: number, joints: number[]): BackPart[] {
  if (fitsBoard(length, width, boardL, boardW)) return [{ length, width }];

  // Ancho máximo de cada parte si se corta a lo ancho.
  const maxPartWidth = length <= boardW ? boardL : length <= boardL ? boardW : 0;
  if (maxPartWidth > 0 && joints.length > 0) {
    const cuts: number[] = [];
    let start = 0;
    let ok = true;
    while (width - start > maxPartWidth) {
      const candidates = joints.filter((j) => j > start && j - start <= maxPartWidth);
      if (candidates.length === 0) {
        ok = false;
        break;
      }
      const next = Math.max(...candidates);
      cuts.push(next);
      start = next;
    }
    if (ok) {
      const edges = [0, ...cuts, width];
      return edges.slice(1).map((e, i) => ({ length, width: Math.round((e - edges[i]) * 10) / 10 }));
    }
  }

  for (let k = 2; k <= 8; k++) {
    if (maxPartWidth > 0 && width / k <= maxPartWidth) {
      return equalParts(width, k).map((w) => ({ length, width: w }));
    }
    const maxPartLength = width <= boardW ? boardL : width <= boardL ? boardW : 0;
    if (maxPartLength > 0 && length / k <= maxPartLength) {
      return equalParts(length, k).map((l) => ({ length: l, width }));
    }
  }
  return [{ length, width }];
}

function equalParts(total: number, k: number): number[] {
  const base = Math.floor(total / k);
  const parts = Array.from({ length: k }, () => base);
  parts[k - 1] += Math.round((total - base * k) * 10) / 10;
  return parts;
}

function uniqueParts(parts: BackPart[]): (BackPart & { qty: number })[] {
  const out: (BackPart & { qty: number })[] = [];
  for (const p of parts) {
    const same = out.find((o) => o.length === p.length && o.width === p.width);
    if (same) same.qty += 1;
    else out.push({ ...p, qty: 1 });
  }
  return out;
}

function mergePieces(raw: RawPiece[], columnCount: number): Piece[] {
  const merged: RawPiece[] = [];
  for (const p of raw) {
    const same = merged.find(
      (o) =>
        o.name === p.name &&
        o.material === p.material &&
        o.thickness === p.thickness &&
        o.length === p.length &&
        o.width === p.width &&
        o.edges.long === p.edges.long &&
        o.edges.short === p.edges.short &&
        o.canRotate === p.canRotate,
    );
    if (same) {
      same.qty += p.qty;
      for (const c of p.cols) if (!same.cols.includes(c)) same.cols.push(c);
      for (const note of p.notes) if (!same.notes.includes(note)) same.notes.push(note);
    } else {
      merged.push({ ...p, notes: [...p.notes], cols: [...p.cols], edges: { ...p.edges } });
    }
  }
  // Melamina primero, después el fondo.
  merged.sort((a, b) => (a.material === b.material ? 0 : a.material === 'melamina' ? -1 : 1));
  return merged.map((p, i) => {
    const notes = [...p.notes];
    if (columnCount > 1 && p.cols.length > 0 && p.cols.length < columnCount) {
      notes.unshift(`${p.cols.length === 1 ? 'Columna' : 'Columnas'} ${p.cols.sort((a, b) => a - b).join(', ')}`);
    }
    return {
      code: pieceCode(i),
      name: p.name,
      qty: p.qty,
      length: p.length,
      width: p.width,
      thickness: p.thickness,
      material: p.material,
      edges: p.edges,
      canRotate: p.canRotate,
      notes,
    };
  });
}

function countFasteners(
  unit: ShelfUnit,
  columns: ColumnResult[],
  dividers: DividerPosition[],
  carcassDepth: number,
  interiorWidth: number,
  interiorHeight: number,
): FastenerCounts {
  const spj = screwsPerJoint(carcassDepth);
  const n = columns.length;
  const fixed = columns.flatMap((c) => c.shelves.filter((s) => s.type === 'fijo').map(() => c));
  const movable = columns.reduce((s, c) => s + c.shelves.filter((sh) => sh.type === 'movil').length, 0);
  const plinthPieces = unit.plinth.enabled ? (unit.back.mode === 'clavado' ? 1 : 2) : 0;

  const joints = 2 + 2 + dividers.length * 2 + fixed.length * 2;
  const screws = joints * spj + plinthPieces * 2 * 2;
  // Cabezas a la vista: atraviesan los laterales o el techo.
  const edgeShelfJoints = n === 1 ? fixed.length * 2 : fixed.filter((c) => c.index === 0 || c.index === n - 1).length;
  const visibleScrews = (2 + 2 + edgeShelfJoints + dividers.length) * spj + (unit.plinth.enabled ? 4 : 0);

  let backNails = 0;
  if (unit.back.mode === 'clavado') {
    const perimeter = 2 * (unit.width + unit.height);
    const inner = fixed.reduce((s, c) => s + c.width, 0) + dividers.length * interiorHeight + (unit.plinth.enabled ? interiorWidth : 0);
    backNails = Math.ceil(perimeter / 150 + inner / 200);
  }
  return { screwsPerJoint: spj, joints: joints + plinthPieces * 2, screws, visibleScrews, shelfPins: movable * 4, backNails };
}
