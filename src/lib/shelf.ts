import { distribute } from './distribute';
import { HINGE_LABEL, compartmentBehindInsetDoor, computeDoors, shelfBehindInsetDoor } from './doors';
import { mm, pieceCode } from './format';
import { tr } from './i18n';
import { finishFor, materialFor, pieceGroup } from './catalog';
import { resolveUnit } from './resolve';
import { SHOE_ANGLE_DEG, TOPE_HEIGHT, layoutShoeRack, slopeWidth } from './shoes';
import type {
  BaseSegment,
  ColumnResult,
  KneeResult,
  CompartmentResult,
  DividerPosition,
  DrawerResult,
  RodResult,
  ShoeRackResult,
  DoorsResult,
  DrawerSizing,
  Edges,
  FastenerCounts,
  Finish,
  FrontPanel,
  Piece,
  PieceMaterial,
  ShelfPosition,
  ShelfUnit,
  ShelfUnitResult,
  SlideType,
  Warning,
} from './types';

interface RawPiece {
  name: string;
  qty: number;
  length: number;
  width: number;
  thickness: number;
  material: PieceMaterial;
  finish: Finish | null;
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

const EMPTY_DOORS: DoorsResult = { doors: [], extraDepth: 0, swing: 0, hingeCounts: { recta: 0, codo9: 0, codo18: 0 }, trackLength: 0, trackSets: 0 };

/** Largos comerciales de correderas telescópicas. */
export const SLIDE_LENGTHS = [250, 300, 350, 400, 450, 500, 550, 600];
/** Largos comerciales de correderas de rodillos. */
export const ROLLER_LENGTHS = [250, 300, 350, 400, 450, 500, 550];
/** Luz entre frentes de cajón. */
export const DRAWER_GAP = 3;
/** Lugar que ocupa cada corredera (telescópica o de rodillos) a cada lado de la caja. */
export const SLIDE_SPACE = 13;
/** Distancia del centro del barral al techo del hueco. */
export const ROD_DROP = 50;
/** Profundidad libre mínima para colgar perchas. */
export const HANGING_DEPTH = 520;

export function slideLengths(type: SlideType): number[] {
  return type === 'rodillo' ? ROLLER_LENGTHS : SLIDE_LENGTHS;
}

/** Reparte un alto entre `n` cajones, de abajo hacia arriba. Escalonados: cada uno 25 % más alto que el de arriba. */
export function splitDrawerHeights(total: number, n: number, sizing: DrawerSizing): number[] {
  if (sizing !== 'escalonados') return Array.from({ length: n }, () => Math.floor(total / n));
  const weights = Array.from({ length: n }, (_, i) => 1 + 0.25 * (n - 1 - i));
  const sum = weights.reduce((a, b) => a + b, 0);
  const hs = weights.map((w) => Math.floor((total * w) / sum));
  hs[0] += Math.floor(total - hs.reduce((a, b) => a + b, 0));
  return hs;
}

export interface DrawerLayoutInput {
  column: number;
  compartment: number;
  /** Luz del hueco: borde izquierdo, ancho, piso y alto. */
  x: number;
  width: number;
  bottom: number;
  height: number;
  /** Profundidad útil del hueco. */
  depth: number;
  count: number;
  sizing: DrawerSizing;
  t: number;
  slideType: SlideType;
  /** Frentes superpuestos: hasta dónde llegan (tapan los cantos). `null` = embutidos. */
  overlay: { left: number; right: number; bottom: number; top: number } | null;
}

/**
 * Cajones dentro de un hueco: frentes embutidos (con 3 mm de luz dentro del hueco) o superpuestos
 * (tapan los cantos, como las puertas superpuestas), alturas iguales o escalonadas, y correderas.
 * Las cajas siempre van dentro del hueco, una por "lugar" del reparto embutido.
 */
export function layoutDrawers(p: DrawerLayoutInput): DrawerResult | string {
  const { t, overlay } = p;
  const n = Math.max(1, Math.floor(p.count));
  const g = DRAWER_GAP;
  // Lugares dentro del hueco (son los frentes si van embutidos).
  const inner = splitDrawerHeights(p.height - (n + 1) * g, n, p.sizing);
  const innerBottoms: number[] = [];
  let y = p.bottom + g;
  for (const h of inner) {
    innerBottoms.push(y);
    y += h + g;
  }
  let frontHs = inner;
  let fronts = innerBottoms;
  let frontW = p.width - 2 * g;
  let x = p.x + g;
  if (overlay) {
    frontHs = splitDrawerHeights(overlay.top - overlay.bottom - n * g, n, p.sizing);
    fronts = [];
    let fy = overlay.bottom + g / 2;
    for (const h of frontHs) {
      fronts.push(fy);
      fy += h + g;
    }
    frontW = Math.floor(overlay.right - overlay.left - g);
    x = overlay.left + g / 2;
  }
  const smallest = Math.min(...inner);
  if (smallest < 80) {
    return tr(
      `${n} cajones en un hueco de ${mm(p.height)} mm quedan de ${mm(smallest)} mm de alto: usa menos cajones o un hueco más alto.`,
      `${n} drawers in a ${mm(p.height)} mm compartment end up ${mm(smallest)} mm high: use fewer drawers or a taller compartment.`,
    );
  }
  // El frente superpuesto va por delante del mueble: la caja puede ser más larga.
  const lengths = slideLengths(p.slideType);
  const room = p.depth - (overlay ? 0 : t) - 10;
  const slide = [...lengths].reverse().find((l) => l <= room);
  if (!slide) {
    return tr(
      `no hay profundidad para correderas (${mm(p.depth)} mm libres; la más corta pide ${lengths[0] + (overlay ? 0 : t) + 10} mm).`,
      `there is not enough depth for drawer slides (${mm(p.depth)} mm free; the shortest needs ${lengths[0] + (overlay ? 0 : t) + 10} mm).`,
    );
  }
  const boxHs = inner.map((h) => Math.min(250, Math.max(60, Math.floor((h - 30) / 10) * 10)));
  const boxBottoms = innerBottoms.map((b) => b + 10);
  return {
    column: p.column,
    compartment: p.compartment,
    count: n,
    overlay: !!overlay,
    frontW,
    frontH: Math.max(...frontHs),
    frontHs,
    fronts,
    x,
    boxW: p.width - 2 * SLIDE_SPACE,
    boxH: Math.max(...boxHs),
    boxHs,
    boxBottoms,
    slide,
    slideType: p.slideType,
    slideCenters: boxBottoms.map((b, i) => Math.round(b + boxHs[i] / 2)),
  };
}
const EMPTY_COUNTS: FastenerCounts = { screwsPerJoint: 0, joints: 0, screws: 0, visibleScrews: 0, shelfPins: 0, backNails: 0 };

export function computeShelfUnit(input: ShelfUnit): ShelfUnitResult {
  const unit = resolveUnit(input);
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
  // Huecos para las piernas (escritorios): sin piso ni estantes, del suelo a la tapa.
  const knee = Array.from({ length: n }, (_, i) => !!unit.columns[i]?.knee);
  const hasKnee = knee.some(Boolean);
  const mal = unit.maletero.enabled && !hasKnee ? unit.maletero : null;
  const maleteroShelfBottom = mal ? topY - mal.height - t : null;
  const columnsTop = maleteroShelfBottom ?? topY;
  const columnHeight = columnsTop - baseY;
  const sideTop = unit.top === 'sobre' ? H - t : H;
  const diagonal = Math.ceil(Math.hypot(sideTop, carcassDepth));

  const empty: ShelfUnitResult = {
    pieces: [],
    panels: [],
    columns: [],
    dividers: [],
    bases: [],
    knees: [],
    interior: { width: interiorWidth, height: interiorHeight, depth: interiorDepth, baseY, topY },
    shelfDepth,
    frontInset,
    doors: EMPTY_DOORS,
    counts: EMPTY_COUNTS,
    warnings,
    size: { width: W, height: H, depth: D },
    columnsTop,
    maletero: null,
    diagonal,
    rods: [],
    drawers: [],
    shoeRacks: [],
  };

  // --- Validaciones que impiden calcular ---
  if (interiorWidth - (n - 1) * t < 20 * n) {
    warnings.push({ level: 'error', text: tr(`El ancho (${mm(W)} mm) no alcanza para ${n} columnas con melamina de ${mm(t)} mm.`, `The width (${mm(W)} mm) is not enough for ${n} columns with ${mm(t)} mm melamine.`) });
  }
  if (interiorHeight < 20) {
    warnings.push({ level: 'error', text: tr(`El alto (${mm(H)} mm) es muy poco para el zócalo, el piso y el techo.`, `The height (${mm(H)} mm) is too small for the plinth, bottom and top.`) });
  }
  if (shelfDepth - frontInset < 20) {
    warnings.push({
      level: 'error',
      text: frontInset
        ? tr(
            `La profundidad (${mm(D)} mm) no alcanza para los rieles de ${mm(frontInset)} mm: quedan ${mm(shelfDepth - frontInset)} mm para los estantes.`,
            `The depth (${mm(D)} mm) is not enough for the ${mm(frontInset)} mm tracks: only ${mm(shelfDepth - frontInset)} mm are left for the shelves.`,
          )
        : tr(`La profundidad (${mm(D)} mm) no alcanza: quedan ${mm(shelfDepth)} mm útiles.`, `The depth (${mm(D)} mm) is not enough: only ${mm(shelfDepth)} mm are usable.`),
    });
  }
  if (mal && (mal.height < 100 || columnHeight < 200)) {
    warnings.push({
      level: 'error',
      text:
        mal.height < 100
          ? tr(`El maletero de ${mm(mal.height)} mm es muy bajo.`, `The ${mm(mal.height)} mm top storage is too low.`)
          : tr(`Con un maletero de ${mm(mal.height)} mm no queda espacio abajo: hazlo más bajo.`, `With a ${mm(mal.height)} mm top storage there is no room left below: make it lower.`),
    });
  }
  if (backMode === 'ranurado' && unit.back.grooveDepth >= t) {
    warnings.push({ level: 'error', text: tr(`La ranura (${mm(unit.back.grooveDepth)} mm) no puede ser tan profunda como la melamina (${mm(t)} mm).`, `The groove (${mm(unit.back.grooveDepth)} mm) cannot be as deep as the melamine is thick (${mm(t)} mm).`) });
  }
  if (warnings.some((w) => w.level === 'error')) return empty;

  // --- Columnas ---
  const colDist = distribute(
    interiorWidth - (n - 1) * t,
    unit.columns.map((c) => c.width),
  );
  if (colDist.overflow) {
    warnings.push({ level: 'error', text: tr('Los anchos de columna que fijaste suman más que el ancho interior disponible.', 'The column widths you set add up to more than the available interior width.') });
    return empty;
  }
  if (colDist.mismatch !== 0) {
    const last = colDist.values.length - 1;
    colDist.values[last] += colDist.mismatch;
    warnings.push({
      level: 'aviso',
      text: tr(
        `Los anchos fijos no completan el mueble: la última columna queda de ${mm(colDist.values[last])} mm. Deja alguna columna en automático.`,
        `The fixed widths do not fill the unit: the last column ends up ${mm(colDist.values[last])} mm. Leave some column on automatic.`,
      ),
    });
  }
  const widths = colDist.values;
  if (widths.some((w) => w < 20)) {
    warnings.push({ level: 'error', text: tr('Alguna columna queda demasiado angosta.', 'A column ends up too narrow.') });
    return empty;
  }

  const columns: ColumnResult[] = [];
  const dividers: DividerPosition[] = [];
  const insetDoorRecess = t + 2;
  // Hueco con una puerta delante (sus cajones van embutidos).
  const behindDoor = (i: number, j: number) => {
    const ds = unit.doors;
    if (ds.type === 'ninguna') return false;
    if (ds.type === 'corrediza') return true;
    if (!(ds.columns[i] ?? true)) return false;
    return ds.upToShelf === null || j < ds.upToShelf;
  };
  // Faldón: solo con huecos para las piernas; nunca más alto que el espacio bajo la tapa.
  const modestyH = hasKnee && unit.modesty?.enabled ? Math.max(0, Math.min(unit.modesty.height, columnsTop)) : 0;
  if (modestyH > 0 && modestyH > columnsTop - 100) {
    warnings.push({
      level: 'aviso',
      text: tr(
        `El faldón de ${mm(unit.modesty.height)} mm llega casi al suelo: con 300 a 400 mm alcanza para rigidizar el escritorio.`,
        `The ${mm(unit.modesty.height)} mm modesty panel almost reaches the floor: 300 to 400 mm is enough to stiffen the desk.`,
      ),
    });
  }
  // Con "mismos estantes" se copian los de la primera columna que no es hueco para las piernas.
  const shelfSpec = unit.columns.find((c) => !c.knee) ?? unit.columns[0];
  let x = t;
  for (let i = 0; i < n; i++) {
    if (knee[i]) {
      columns.push({
        index: i,
        x,
        width: widths[i],
        gaps: [columnsTop],
        shelves: [],
        compartments: [{ index: 0, bottom: 0, height: columnsTop, depth: carcassDepth - (modestyH ? t : 0), fill: null }],
        knee: true,
      });
      x += widths[i];
      if (i < n - 1) {
        dividers.push({ index: i, left: x, leftFromInside: x - t, full: true });
        x += t;
      }
      continue;
    }
    const spec = unit.sameShelves ? shelfSpec : unit.columns[i];
    const k = Math.max(0, Math.floor(spec.shelves));
    const gapSpecs = Array.from({ length: k + 1 }, (_, j) => spec.gaps[j] ?? null);
    const gapDist = distribute(columnHeight - k * t, gapSpecs);
    const label = n > 1 ? `${tr('Columna', 'Column')} ${i + 1}: ` : '';
    if (gapDist.overflow) {
      warnings.push({ level: 'error', text: label + tr(`las alturas fijas de los huecos no entran en el alto interior (${mm(columnHeight)} mm).`, `the fixed compartment heights do not fit in the interior height (${mm(columnHeight)} mm).`) });
      return empty;
    }
    if (gapDist.mismatch !== 0) {
      gapDist.values[k] += gapDist.mismatch;
      warnings.push({
        level: 'aviso',
        text: label + tr(`el hueco de arriba se ajustó a ${mm(gapDist.values[k])} mm para completar la altura.`, `the top compartment was adjusted to ${mm(gapDist.values[k])} mm to fill the height.`),
      });
    }
    const gaps = gapDist.values;
    const shelves: ShelfPosition[] = [];
    let y = baseY;
    const fills = Array.from({ length: k + 1 }, (_, j) => spec.fill?.[j] ?? null);
    for (let j = 0; j < k; j++) {
      y += gaps[j];
      const depth = shelfDepth - frontInset - (shelfBehindInsetDoor(unit.doors, i, j, k) ? insetDoorRecess : 0);
      // Arriba de cajones o de un barral el estante va fijo.
      const type = fills[j] ? 'fijo' : spec.shelfType;
      shelves.push({ index: j, bottom: y, top: y + t, bottomFromBase: y - baseY, type, depth });
      y += t;
    }
    const compartments: CompartmentResult[] = gaps.map((g, j) => {
      const bottom = j === 0 ? baseY : shelves[j - 1].top;
      const depth = interiorDepth - frontInset - (compartmentBehindInsetDoor(unit.doors, i, j, k) ? insetDoorRecess : 0);
      const comp: CompartmentResult = { index: j, bottom, height: g, depth, fill: fills[j] };
      const fill = fills[j];
      if (fill?.kind === 'barral') {
        const rodY = bottom + g - ROD_DROP;
        comp.rod = { column: i, y: rodY, length: widths[i] - 2, hanging: rodY - bottom, supports: widths[i] > 1000 ? 3 : 2 };
      } else if (fill?.kind === 'cajones') {
        // Superpuestos solo si no hay una puerta delante; si no, van embutidos.
        const overlay =
          unit.drawers.front === 'superpuesto' && !behindDoor(i, j)
            ? {
                left: x - (i === 0 ? t : t / 2),
                right: x + widths[i] + (i === n - 1 ? t : t / 2),
                bottom: j === 0 ? zh : bottom - t / 2,
                top: j === k ? (maleteroShelfBottom !== null ? maleteroShelfBottom + t / 2 : unit.top === 'entre' ? H : H - t) : bottom + g + t / 2,
              }
            : null;
        const d = layoutDrawers({
          column: i,
          compartment: j,
          x,
          width: widths[i],
          bottom,
          height: g,
          depth,
          count: fill.count,
          sizing: fill.sizing ?? 'iguales',
          t,
          slideType: unit.drawers.slide,
          overlay,
        });
        if (typeof d === 'string') warnings.push({ level: 'aviso', text: `${label}${d}` });
        else comp.drawers = d;
      } else if (fill?.kind === 'zapatero') {
        const z = layoutShoeRack(i, x, widths[i], bottom, g, depth, interiorDepth - depth, fill.style, fill.levels, t);
        for (const w of z.warnings) warnings.push({ level: 'aviso', text: `${label}${w}` });
        if (z.rack) comp.shoes = z.rack;
      }
      return comp;
    });
    const minGap = Math.min(...gaps);
    if (minGap < 60) {
      warnings.push({ level: 'aviso', text: label + tr(`hay un hueco de solo ${mm(minGap)} mm de alto.`, `there is a compartment only ${mm(minGap)} mm high.`) });
    }
    columns.push({ index: i, x, width: widths[i], gaps, shelves, compartments });
    x += widths[i];
    if (i < n - 1) {
      dividers.push({ index: i, left: x, leftFromInside: x - t, full: knee[i + 1] });
      x += t;
    }
  }

  // Tramos con piso: columnas seguidas que no son hueco para las piernas.
  const bases: BaseSegment[] = [];
  for (let i = 0; i < n; ) {
    if (knee[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < n && !knee[j + 1]) j++;
    bases.push({ from: i, to: j, x: columns[i].x, w: columns[j].x + columns[j].width - columns[i].x });
    i = j + 1;
  }
  const knees: KneeResult[] = columns
    .filter((c) => c.knee)
    .map((c) => ({ column: c.index, x: c.x, width: c.width, height: columnsTop, modesty: modestyH ? { y: columnsTop - modestyH, h: modestyH } : null }));

  // --- Puertas ---
  const doorCalc = computeDoors({ unit, columns, baseY, topY, zh, interiorWidth, maleteroShelfBottom });
  warnings.push(...doorCalc.warnings);
  const doors = doorCalc.result;
  // Los frentes de cajón superpuestos suman su espesor por delante, como las puertas superpuestas.
  if (columns.some((c) => c.compartments.some((cp) => cp.drawers?.overlay))) doors.extraDepth = Math.max(doors.extraDepth, t);
  // Ranura del fondo de los cajones.
  const ds = unit.drawers;
  const anyDrawers = columns.some((c) => c.compartments.some((cp) => cp.drawers));
  if (anyDrawers && ds.bottom === 'ranura') {
    if (ds.grooveDepth < 4 || ds.grooveDepth >= t) {
      warnings.push({
        level: 'aviso',
        text: tr(
          `La ranura de ${mm(ds.grooveDepth)} mm para el fondo de los cajones no sirve con melamina de ${mm(t)} mm: usa de 6 a 10 mm.`,
          `A ${mm(ds.grooveDepth)} mm groove for the drawer bottoms does not work with ${mm(t)} mm melamine: use 6 to 10 mm.`,
        ),
      });
    }
    const lowest = Math.min(...columns.flatMap((c) => c.compartments.flatMap((cp) => cp.drawers?.boxHs ?? [])));
    if (lowest < ds.grooveOffset + tb + 30) {
      warnings.push({
        level: 'aviso',
        text: tr(
          `La caja de cajón más baja mide ${mm(lowest)} mm: con la ranura a ${mm(ds.grooveOffset)} mm del canto casi no queda lugar adentro. Baja la ranura o usa menos cajones.`,
          `The lowest drawer box is ${mm(lowest)} mm high: with the groove ${mm(ds.grooveOffset)} mm up there is hardly any room inside. Lower the groove or use fewer drawers.`,
        ),
      });
    }
  }

  // --- Piezas ---
  const raw: RawPiece[] = [];
  // Cada pieza toma el color exterior o interior según su grupo; la veta depende de esa placa.
  const add = (p: Omit<RawPiece, 'thickness' | 'material' | 'finish' | 'canRotate' | 'notes' | 'cols'> & Partial<RawPiece>) => {
    const finish = finishFor(m, pieceGroup(p.name));
    raw.push({ thickness: t, material: 'melamina', finish, canRotate: !materialFor(m, finish).hasGrain, notes: [], cols: [], ...p });
  };

  add({
    name: 'Lateral',
    qty: 2,
    length: sideHeight,
    width: carcassDepth,
    edges: { long: 1, short: unit.top === 'entre' ? 1 : 0 },
    notes: [tr('Veta vertical', 'Vertical grain')],
  });
  if (unit.top === 'entre') {
    add({ name: 'Techo', qty: 1, length: interiorWidth, width: carcassDepth, edges: { long: 1, short: 0 } });
  } else {
    add({ name: 'Techo', qty: 1, length: W, width: carcassDepth, edges: { long: 1, short: 2 }, notes: [tr('Apoya sobre los laterales', 'Rests on top of the side panels')] });
  }
  for (const b of bases) add({ name: 'Piso', qty: 1, length: b.w, width: carcassDepth, edges: { long: 1, short: 0 } });
  if (unit.plinth.enabled) {
    for (const b of bases) {
      add({
        name: 'Zócalo',
        qty: 1,
        length: b.w,
        width: zh,
        edges: { long: 0, short: 0 },
        notes: unit.plinth.setback > 0 ? [tr(`Retirado ${mm(unit.plinth.setback)} mm del frente`, `Set back ${mm(unit.plinth.setback)} mm from the front`)] : [tr('Al ras del frente', 'Flush with the front')],
      });
      if (backMode !== 'clavado') {
        add({ name: 'Zócalo trasero', qty: 1, length: b.w, width: zh, edges: { long: 0, short: 0 }, notes: [tr('Refuerzo atrás', 'Rear reinforcement')] });
      }
    }
  }
  const fullDividers = dividers.filter((d) => d.full).length;
  const plainDividers = dividers.length - fullDividers;
  if (fullDividers > 0) {
    const notes = [tr('Veta vertical', 'Vertical grain'), tr('Llega al suelo: es el costado del hueco para las piernas', 'Reaches the floor: it is the side of the knee space')];
    if (backMode === 'ranurado') notes.push(tr('Lleva la ranura del fondo', 'Has the back panel groove'));
    add({ name: 'Lateral interior', qty: fullDividers, length: columnsTop, width: carcassDepth, edges: { long: 1, short: 0 }, notes });
  }
  if (plainDividers > 0) {
    const notes = [tr('Veta vertical', 'Vertical grain')];
    if (backMode === 'ranurado') notes.push(tr('Termina contra el fondo', 'Ends against the back panel'));
    if (frontInset) notes.push(tr(`Retirado ${mm(frontInset)} mm del frente por los rieles`, `Set back ${mm(frontInset)} mm from the front for the tracks`));
    add({
      name: 'Divisor',
      qty: plainDividers,
      length: columnHeight,
      width: (backMode === 'ranurado' ? interiorDepth : carcassDepth) - frontInset,
      edges: { long: 1, short: 0 },
      notes,
    });
  }
  if (mal) {
    add({
      name: 'Estante maletero',
      qty: 1,
      length: interiorWidth,
      width: backMode === 'ranurado' ? interiorDepth : carcassDepth,
      edges: { long: 1, short: 0 },
      notes: [tr('Fijo, de lateral a lateral', 'Fixed, from side panel to side panel')],
    });
    if (mal.dividers && n > 1) {
      add({
        name: 'Divisor de maletero',
        qty: n - 1,
        length: mal.height,
        width: (backMode === 'ranurado' ? interiorDepth : carcassDepth) - frontInset,
        edges: { long: 1, short: 0 },
        notes: [tr('Alineado con los divisores de abajo', 'Aligned with the dividers below')],
      });
    }
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
        notes: fixed ? [] : [tr(`${mm(unit.movableClearance)} mm de holgura`, `${mm(unit.movableClearance)} mm clearance`)],
        cols: [col.index + 1],
      });
    }
  });
  for (const col of columns) {
    for (const comp of col.compartments) {
      const d = comp.drawers;
      if (!d) continue;
      const cols = [col.index + 1];
      const groove = ds.bottom === 'ranura';
      const gIn = ds.grooveDepth - 1;
      const grooveNote = tr(
        `Ranura de ${mm(tb + 1)} × ${mm(ds.grooveDepth)} mm a ${mm(ds.grooveOffset)} mm del canto de abajo, para el fondo`,
        `${mm(tb + 1)} × ${mm(ds.grooveDepth)} mm groove ${mm(ds.grooveOffset)} mm above the bottom edge, for the bottom panel`,
      );
      const frontNotes = d.overlay ? [tr('Superpuesto: tapa los cantos del mueble', 'Overlay: covers the edges of the unit')] : [];
      for (const h of d.frontHs) add({ name: 'Frente de cajón', qty: 1, length: d.frontW, width: h, edges: { long: 2, short: 2 }, notes: frontNotes, cols });
      for (const h of d.boxHs) {
        add({
          name: 'Lateral de cajón',
          qty: 2,
          length: d.slide,
          width: h,
          edges: { long: 1, short: 0 },
          notes: [tr('Tapacanto en el canto de arriba', 'Edge banding on the top edge'), ...(groove ? [grooveNote] : [])],
          cols,
        });
      }
      for (const h of d.boxHs) {
        add({
          name: 'Frente y contrafrente de cajón',
          qty: 2,
          length: d.boxW - 2 * t,
          width: h,
          edges: { long: 1, short: 0 },
          notes: [tr('Van entre los laterales de la caja', 'Fit between the drawer box sides'), ...(groove ? [grooveNote] : [])],
          cols,
        });
      }
      raw.push({
        name: 'Fondo de cajón',
        qty: d.count,
        length: groove ? d.slide - 2 * t + 2 * gIn : d.slide,
        width: groove ? d.boxW - 2 * t + 2 * gIn : d.boxW,
        thickness: tb,
        material: 'fondo',
        finish: null,
        edges: { long: 0, short: 0 },
        canRotate: true,
        notes: [groove ? tr(`Va en la ranura: entra ${mm(gIn)} mm de cada lado`, `Sits in the groove: ${mm(gIn)} mm in on each side`) : tr('Clavado abajo de la caja', 'Nailed under the box')],
        cols,
      });
    }
  }
  for (const col of columns) {
    for (const comp of col.compartments) {
      const z = comp.shoes;
      if (!z) continue;
      const cols = [col.index + 1];
      if (z.style === 'inclinado') {
        add({
          name: 'Estante zapatero inclinado',
          qty: z.levels.length,
          length: col.width,
          width: slopeWidth(z.run),
          edges: { long: 0, short: 0 },
          notes: [tr(`Inclinado ${SHOE_ANGLE_DEG}°, atornillado a los costados`, `Slanted ${SHOE_ANGLE_DEG}°, screwed to the sides`), tr('El tope tapa el canto de adelante', 'The stop covers the front edge')],
          cols,
        });
        add({
          name: 'Tope de zapatero',
          qty: z.levels.length,
          length: col.width,
          width: TOPE_HEIGHT,
          edges: { long: 1, short: 0 },
          notes: [tr('Atornillado al frente del estante inclinado', 'Screwed to the front of the slanted shelf')],
          cols,
        });
      } else if (z.style === 'plano' && z.levels.length) {
        add({
          name: 'Estante zapatero',
          qty: z.levels.length,
          length: col.width - unit.movableClearance,
          width: comp.depth,
          edges: { long: 1, short: 0 },
          notes: [tr(`${mm(unit.movableClearance)} mm de holgura`, `${mm(unit.movableClearance)} mm clearance`)],
          cols,
        });
      }
    }
  }
  for (const k of knees) {
    if (!k.modesty) continue;
    add({
      name: 'Faldón',
      qty: 1,
      length: k.width,
      width: k.modesty.h,
      edges: { long: 1, short: 0 },
      notes: [tr('Atrás del hueco para las piernas, debajo de la tapa', 'At the back of the knee space, under the top'), tr('Tapacanto en el canto de abajo', 'Edge banding on the bottom edge')],
      cols: [k.column + 1],
    });
  }
  for (const d of doors.doors) {
    const isSliding = d.track !== null;
    add({
      name: (isSliding ? 'Puerta corrediza' : 'Puerta') + (d.zone === 'maletero' ? ' de maletero' : ''),
      qty: 1,
      length: d.h,
      width: d.w,
      edges: { long: 2, short: 2 },
      notes: isSliding
        ? [tr(`Solape ${mm(unit.doors.overlap)} mm`, `${mm(unit.doors.overlap)} mm overlap`), tr('Veta vertical', 'Vertical grain')]
        : [tr(`Bisagra ${HINGE_LABEL[d.hingeType!]}`, `Hinge: ${HINGE_LABEL[d.hingeType!]}`), tr('Veta vertical', 'Vertical grain')],
      cols: d.column !== null ? [d.column + 1] : [],
    });
  }

  // --- Fondo (uno por tramo con piso; el hueco para las piernas queda abierto) ---
  if (backMode !== 'ninguno') {
    const board = usableBoard(m.backBoardLength, m.backBoardWidth, m.trim);
    const g = unit.back.grooveDepth - 1;
    const notes =
      backMode === 'clavado'
        ? [tr('Va clavado atrás, 1 mm adentro de cada borde', 'Nailed on the back, 1 mm in from each edge')]
        : [tr(`Entra ${mm(g)} mm en cada ranura`, `Goes ${mm(g)} mm into each groove`)];
    for (const b of bases) {
      // Clavado: de la cara de afuera de un costado a la del otro.
      const left = b.from === 0 ? 0 : dividers[b.from - 1].left;
      const right = b.to === n - 1 ? W : dividers[b.to].left + t;
      const backLen = backMode === 'clavado' ? H - 2 : interiorHeight + 2 * g;
      const backWid = backMode === 'clavado' ? right - left - 2 : b.w + 2 * g;
      const joints = backMode === 'clavado' ? dividers.filter((d) => d.index >= b.from && d.index < b.to).map((d) => d.left + t / 2 - 1 - left) : [];
      const parts = splitBack(backLen, backWid, board.length, board.width, joints);
      if (parts.length > 1) {
        warnings.push({
          level: 'aviso',
          text: tr(
            `El fondo (${mm(backLen)} × ${mm(backWid)} mm) no entra en un tablero: se corta en ${parts.length} partes. Cada unión tiene que caer sobre un divisor, un estante fijo o un listón.`,
            `The back panel (${mm(backLen)} × ${mm(backWid)} mm) does not fit on one board: it is cut in ${parts.length} parts. Each joint must land on a divider, a fixed shelf or a batten.`,
          ),
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
          finish: null,
          edges: { long: 0, short: 0 },
          canRotate: true,
          notes,
          cols: [],
        });
      }
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
  ];
  for (const b of bases) {
    panels.push({ role: 'piso', x: b.x, y: zh, w: b.w, h: t });
    if (unit.plinth.enabled) panels.push({ role: 'zocalo', x: b.x, y: 0, w: b.w, h: zh, recessed: unit.plinth.setback > 0 });
  }
  for (const d of dividers) {
    if (d.full) panels.push({ role: 'lateral', x: d.left, y: 0, w: t, h: columnsTop });
    else panels.push({ role: 'divisor', x: d.left, y: baseY, w: t, h: columnHeight, recessed: frontInset > 0 });
  }
  for (const k of knees) {
    if (k.modesty) panels.push({ role: 'faldon', x: k.x, y: k.modesty.y, w: k.width, h: k.modesty.h, recessed: true });
  }
  if (mal && maleteroShelfBottom !== null) {
    panels.push({ role: 'maletero', x: t, y: maleteroShelfBottom, w: interiorWidth, h: t });
    if (mal.dividers) {
      for (const d of dividers) panels.push({ role: 'divisor-maletero', x: d.left, y: maleteroShelfBottom + t, w: t, h: mal.height, recessed: frontInset > 0 });
    }
  }
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
        text:
          (n > 1 ? `${tr('Columna', 'Column')} ${col.index + 1}: ` : '') +
          tr(
            `estantes de ${mm(col.width)} mm de luz. Con ${mm(t)} mm conviene no pasar de ${span} mm si van a cargar peso (libros): agrega un divisor o usa un tablero más grueso.`,
            `shelves with a ${mm(col.width)} mm span. With ${mm(t)} mm it is best not to exceed ${span} mm if they will carry weight (books): add a divider or use a thicker board.`,
          ),
      });
    }
  });
  for (let i = 0; i < dividers.length; i++) {
    const a = columns[i].shelves.filter((s) => s.type === 'fijo');
    const b = columns[i + 1].shelves.filter((s) => s.type === 'fijo');
    if (a.some((sa) => b.some((sb) => Math.abs(sa.bottom - sb.bottom) < 30))) {
      warnings.push({
        level: 'info',
        text: tr(
          `Hay estantes fijos a la misma altura a los dos lados del divisor ${i + 1}: los tornillos chocarían. Atornilla uno y fija el otro con espigas o minifix, o desfásalos unos centímetros.`,
          `There are fixed shelves at the same height on both sides of divider ${i + 1}: the screws would collide. Screw one and fix the other with dowels or cam locks, or offset them a few centimeters.`,
        ),
      });
      break;
    }
  }
  const rods: RodResult[] = columns.flatMap((c) => c.compartments.flatMap((comp) => (comp.rod ? [comp.rod] : [])));
  const drawers: DrawerResult[] = columns.flatMap((c) => c.compartments.flatMap((comp) => (comp.drawers ? [comp.drawers] : [])));
  const shoeRacks: ShoeRackResult[] = columns.flatMap((c) => c.compartments.flatMap((comp) => (comp.shoes ? [comp.shoes] : [])));
  for (const col of columns) {
    const label = n > 1 ? `${tr('Columna', 'Column')} ${col.index + 1}: ` : '';
    for (const comp of col.compartments) {
      if (!comp.rod) continue;
      if (comp.rod.hanging < 850) {
        warnings.push({
          level: 'aviso',
          text:
            label +
            tr(
              `la barra de colgar deja solo ${mm(comp.rod.hanging)} mm para colgar. Las camisas piden unos 950 mm y los vestidos o abrigos 1500 mm.`,
              `the hanging rod leaves only ${mm(comp.rod.hanging)} mm for hanging. Shirts need about 950 mm and dresses or coats 1500 mm.`,
            ),
        });
      }
      if (comp.depth < HANGING_DEPTH) {
        warnings.push({
          level: 'aviso',
          text:
            label +
            tr(
              `para colgar ganchos hacen falta al menos ${HANGING_DEPTH} mm de profundidad libre (ideal 550 a 600) y hay ${mm(comp.depth)} mm.`,
              `hangers need at least ${HANGING_DEPTH} mm of free depth (ideally 550 to 600) and there are ${mm(comp.depth)} mm.`,
            ),
        });
      }
      if (comp.rod.length > 1000) {
        warnings.push({ level: 'info', text: label + tr(`la barra de colgar mide ${mm(comp.rod.length)} mm: pon un soporte central para que no se doble.`, `the hanging rod is ${mm(comp.rod.length)} mm long: add a center support so it does not sag.`) });
      }
    }
    if (unit.doors.type === 'corrediza' && col.compartments.some((c) => c.drawers)) {
      warnings.push({
        level: 'info',
        text:
          label +
          tr(
            `cajones detrás de corredizas: usa tiradores embutidos o de perfil (que no sobresalgan más de 2 mm), así no rozan la hoja de atrás.`,
            `drawers behind sliding doors: use recessed or profile handles (sticking out no more than 2 mm) so they do not rub the rear door panel.`,
          ),
      });
    }
    if (unit.doors.type === 'batiente' && col.compartments.some((c) => c.drawers) && (unit.doors.columns[col.index] ?? true)) {
      warnings.push({
        level: 'info',
        text:
          label +
          tr(
            `cajones detrás de puertas con bisagras: pon un suplemento de 20 mm a cada lado (o haz los cajones más angostos) para que no choquen con las bisagras.`,
            `drawers behind hinged doors: add a 20 mm spacer on each side (or make the drawers narrower) so they do not hit the hinges.`,
          ),
      });
    }
  }
  for (const k of knees) {
    const label = n > 1 ? `${tr('Columna', 'Column')} ${k.column + 1}: ` : '';
    if (k.width < 600) {
      warnings.push({
        level: 'aviso',
        text: label + tr(
          `el hueco para las piernas mide ${mm(k.width)} mm de ancho: para sentarse cómodo hacen falta al menos 600 mm (mejor 700 o más).`,
          `the knee space is ${mm(k.width)} mm wide: you need at least 600 mm to sit comfortably (700 or more is better).`,
        ),
      });
    }
    if (k.height < 620) {
      warnings.push({
        level: 'aviso',
        text: label + tr(
          `debajo de la tapa quedan ${mm(k.height)} mm: para las piernas hacen falta al menos 620 mm.`,
          `there are ${mm(k.height)} mm under the top: legs need at least 620 mm.`,
        ),
      });
    }
    if (k.width > 1000 && t < 25) {
      warnings.push({
        level: 'info',
        text: label + tr(
          `la tapa queda sin apoyo en ${mm(k.width)} mm. El faldón atornillado evita que se combe; si vas a apoyar mucho peso, usa un tablero de 25 mm o un listón de refuerzo debajo.`,
          `the top is unsupported over ${mm(k.width)} mm. The screwed-on modesty panel keeps it from sagging; for heavy loads, use a 25 mm board or a reinforcing batten underneath.`,
        ),
      });
    }
  }
  if (hasKnee && (H < 680 || H > 800)) {
    warnings.push({
      level: 'info',
      text: tr(`Un escritorio suele medir de 720 a 760 mm de alto, y este mide ${mm(H)} mm.`, `A desk is usually 720 to 760 mm high; this one is ${mm(H)} mm.`),
    });
  }
  if (input.niche.enabled && diagonal > input.niche.height) {
    warnings.push({
      level: 'aviso',
      text: tr(
        `La diagonal del lateral mide ${mm(diagonal)} mm y el hueco ${mm(input.niche.height)} mm: ya armado no se puede levantar. Ármalo de pie en su lugar o reduce el alto.`,
        `The side panel diagonal is ${mm(diagonal)} mm and the alcove ${mm(input.niche.height)} mm: once assembled it cannot be stood up. Assemble it upright in place or reduce the height.`,
      ),
    });
  } else if (H > 2000) {
    warnings.push({
      level: 'info',
      text: tr(
        `Para levantarlo ya armado hacen falta ${mm(diagonal)} mm de alto libre (la diagonal del lateral). Mide el techo antes de armarlo acostado.`,
        `To stand it up once assembled you need ${mm(diagonal)} mm of free height (the side panel diagonal). Measure the ceiling before assembling it lying down.`,
      ),
    });
  }
  if (H > 1200) {
    warnings.push({
      level: H / D > 5 ? 'aviso' : 'info',
      text: tr(
        `Fija el mueble a la pared con escuadras: mide ${mm(H)} mm de alto y ${mm(D)} mm de profundidad, y puede volcarse.`,
        `Fix the unit to the wall with angle brackets: it is ${mm(H)} mm high and ${mm(D)} mm deep, and it can tip over.`,
      ),
    });
  }

  return {
    pieces,
    panels,
    columns,
    dividers,
    bases,
    knees,
    interior: { width: interiorWidth, height: interiorHeight, depth: interiorDepth, baseY, topY },
    shelfDepth,
    frontInset,
    doors,
    counts: countFasteners(unit, columns, dividers, bases, knees, carcassDepth, columnHeight, drawers, shoeRacks),
    warnings,
    size: { width: W, height: H, depth: D },
    columnsTop,
    maletero: mal && maleteroShelfBottom !== null ? { shelfBottom: maleteroShelfBottom, shelfTop: maleteroShelfBottom + t, height: mal.height } : null,
    diagonal,
    rods,
    drawers,
    shoeRacks,
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
        o.finish === p.finish &&
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
  // Melamina exterior, melamina interior y después el fondo.
  const rank = (p: RawPiece) => (p.material === 'fondo' ? 2 : p.finish === 'interior' ? 1 : 0);
  merged.sort((a, b) => rank(a) - rank(b));
  return merged.map((p, i) => {
    const notes = [...p.notes];
    if (columnCount > 1 && p.cols.length > 0 && p.cols.length < columnCount) {
      notes.unshift(`${p.cols.length === 1 ? tr('Columna', 'Column') : tr('Columnas', 'Columns')} ${p.cols.sort((a, b) => a - b).join(', ')}`);
    }
    return {
      code: pieceCode(i),
      name: p.name,
      qty: p.qty,
      length: p.length,
      width: p.width,
      thickness: p.thickness,
      material: p.material,
      finish: p.finish,
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
  bases: BaseSegment[],
  knees: KneeResult[],
  carcassDepth: number,
  columnHeight: number,
  drawers: DrawerResult[],
  shoeRacks: ShoeRackResult[],
): FastenerCounts {
  const spj = screwsPerJoint(carcassDepth);
  const n = columns.length;
  const fixed = columns.flatMap((c) => c.shelves.filter((s) => s.type === 'fijo').map(() => c));
  const movable = columns.reduce((s, c) => s + c.shelves.filter((sh) => sh.type === 'movil').length, 0);
  const plinthPieces = unit.plinth.enabled ? bases.length * (unit.back.mode === 'clavado' ? 1 : 2) : 0;

  const mal = unit.maletero.enabled;
  const malDividers = mal && unit.maletero.dividers ? dividers.length : 0;
  // Techo: 2 uniones. Cada piso: 2. Divisor: arriba y abajo; el que llega al suelo, solo arriba
  // (el piso de su tramo ya cuenta la unión de abajo).
  const full = dividers.filter((d) => d.full).length;
  const plain = dividers.length - full;
  const modesty = knees.filter((k) => k.modesty);
  const joints = 2 + 2 * bases.length + plain * 2 + full + fixed.length * 2 + (mal ? 2 : 0) + malDividers * 2 + modesty.length * 2;
  const drawerCount = drawers.reduce((s, d) => s + d.count, 0);
  // Cada caja de cajón: 4 uniones con 2 tornillos.
  // Estantes zapateros inclinados: 2 tornillos por costado.
  const inclined = shoeRacks.filter((z) => z.style === 'inclinado').reduce((s, z) => s + z.levels.length, 0);
  const flatShoeShelves = shoeRacks.filter((z) => z.style === 'plano').reduce((s, z) => s + z.levels.length, 0);
  // Faldón: tornillos según su alto.
  const modestyScrews = modesty.reduce((s, k) => s + 2 * screwsPerJoint(k.modesty!.h), 0);
  const screws = (joints - modesty.length * 2) * spj + modestyScrews + plinthPieces * 2 * 2 + drawerCount * 8 + inclined * 4;
  // Cabezas a la vista: atraviesan los laterales o el techo (o los costados del hueco para las piernas).
  const edgeShelfJoints = n === 1 ? fixed.length * 2 : fixed.filter((c) => c.index === 0 || c.index === n - 1).length;
  const edgeInclined = shoeRacks
    .filter((z) => z.style === 'inclinado' && (z.column === 0 || z.column === n - 1))
    .reduce((sum, z) => sum + z.levels.length * (n === 1 ? 4 : 2), 0);
  const visibleScrews =
    (2 + 2 * bases.length + edgeShelfJoints + dividers.length + (mal ? 2 : 0)) * spj + modestyScrews + (unit.plinth.enabled ? 4 * bases.length : 0) + edgeInclined;

  let backNails = 0;
  if (unit.back.mode === 'clavado') {
    // Un fondo por tramo: clavos por el contorno y sobre lo que queda adentro.
    for (const b of bases) {
      const left = b.from === 0 ? 0 : dividers[b.from - 1].left;
      const right = b.to === n - 1 ? unit.width : dividers[b.to].left + unit.material.thickness;
      const inside = columns.slice(b.from, b.to + 1);
      const inner =
        inside.reduce((s, c) => s + c.shelves.filter((sh) => sh.type === 'fijo').length * c.width, 0) +
        (b.to - b.from) * columnHeight +
        (unit.plinth.enabled ? b.w : 0) +
        (mal ? b.w + malDividers * unit.maletero.height : 0);
      backNails += Math.ceil((2 * (right - left + unit.height)) / 150 + inner / 200);
    }
  }
  // Fondos de cajón clavados cada 10 cm (en ranura no llevan clavos).
  if (unit.drawers.bottom !== 'ranura') backNails += drawers.reduce((s, d) => s + d.count * Math.ceil((2 * (d.boxW + d.slide)) / 100), 0);
  return { screwsPerJoint: spj, joints: joints + plinthPieces * 2, screws, visibleScrews, shelfPins: (movable + flatShoeShelves) * 4, backNails };
}
