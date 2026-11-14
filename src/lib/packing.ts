import type { Rect } from './types';

/**
 * Optimización de cortes en placa con cortes de guillotina (de lado a lado), que es
 * como corta una seccionadora o una sierra de mesa.
 *
 * Coordenadas: x en el largo de la placa (sentido de la veta), y en el ancho.
 * Una pieza sin giro se ubica con su largo sobre x.
 */

export interface PackItem {
  /** Identificador de la pieza (código del despiece). */
  ref: string;
  /** Medida sobre el largo de la placa (sentido de la veta). */
  w: number;
  /** Medida sobre el ancho de la placa. */
  h: number;
  canRotate: boolean;
}

export interface Placement extends Rect {
  ref: string;
  rotated: boolean;
}

export interface Sheet {
  placements: Placement[];
  /** Sobrantes aprovechables (zonas libres), en coordenadas de la placa. */
  free: Rect[];
  usedArea: number;
}

export interface PackOptions {
  boardLength: number;
  boardWidth: number;
  kerf: number;
  trim: number;
}

export interface PackResult {
  sheets: Sheet[];
  unplaced: PackItem[];
  usedArea: number;
  /** Área usada sobre el área total de las placas (0–1). */
  efficiency: number;
}

type ChoiceRule = 'area' | 'short' | 'long';
type SplitRule = 'shorter' | 'longer' | 'minArea' | 'maxArea' | 'horizontal' | 'vertical';
type SortRule = (a: PackItem, b: PackItem) => number;

const SORTS: SortRule[] = [
  (a, b) => b.w * b.h - a.w * a.h || Math.max(b.w, b.h) - Math.max(a.w, a.h),
  (a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || Math.min(b.w, b.h) - Math.min(a.w, a.h),
  (a, b) => b.w - a.w || b.h - a.h,
  (a, b) => b.h - a.h || b.w - a.w,
  (a, b) => b.w + b.h - (a.w + a.h),
];
const CHOICES: ChoiceRule[] = ['area', 'short', 'long'];
const SPLITS: SplitRule[] = ['shorter', 'longer', 'minArea', 'maxArea', 'horizontal', 'vertical'];

interface Candidate {
  sheet: number;
  rect: number;
  w: number;
  h: number;
  rotated: boolean;
  score: [number, number];
}

function score(rule: ChoiceRule, free: Rect, w: number, h: number): [number, number] {
  const dw = free.w - w;
  const dh = free.h - h;
  const short = Math.min(dw, dh);
  const long = Math.max(dw, dh);
  switch (rule) {
    case 'area':
      return [free.w * free.h - w * h, short];
    case 'short':
      return [short, long];
    case 'long':
      return [long, short];
  }
}

function better(a: [number, number], b: [number, number]): boolean {
  return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
}

function splitFree(free: Rect, w: number, h: number, kerf: number, rule: SplitRule): Rect[] {
  const dw = free.w - w;
  const dh = free.h - h;
  let horizontal: boolean;
  switch (rule) {
    case 'shorter':
      horizontal = dw <= dh;
      break;
    case 'longer':
      horizontal = dw > dh;
      break;
    case 'minArea':
      horizontal = w * dh > dw * h;
      break;
    case 'maxArea':
      horizontal = w * dh <= dw * h;
      break;
    case 'horizontal':
      horizontal = true;
      break;
    case 'vertical':
      horizontal = false;
      break;
  }
  const rightW = dw - kerf;
  const topH = dh - kerf;
  const out: Rect[] = [];
  if (horizontal) {
    // Primer corte a lo largo de toda la zona libre, por encima de la pieza.
    if (rightW > 0) out.push({ x: free.x + w + kerf, y: free.y, w: rightW, h });
    if (topH > 0) out.push({ x: free.x, y: free.y + h + kerf, w: free.w, h: topH });
  } else {
    if (rightW > 0) out.push({ x: free.x + w + kerf, y: free.y, w: rightW, h: free.h });
    if (topH > 0) out.push({ x: free.x, y: free.y + h + kerf, w, h: topH });
  }
  return out;
}

function fitsEmpty(item: PackItem, W: number, H: number): boolean {
  return (item.w <= W && item.h <= H) || (item.canRotate && item.h <= W && item.w <= H);
}

function packOnce(items: PackItem[], W: number, H: number, kerf: number, choice: ChoiceRule, split: SplitRule) {
  const sheets: { placements: Placement[]; free: Rect[]; usedArea: number }[] = [];
  for (const item of items) {
    let best: Candidate | null = null;
    const tryPlace = (si: number) => {
      sheets[si].free.forEach((fr, ri) => {
        const orientations: [number, number, boolean][] = [[item.w, item.h, false]];
        if (item.canRotate && item.w !== item.h) orientations.push([item.h, item.w, true]);
        for (const [w, h, rotated] of orientations) {
          if (w <= fr.w && h <= fr.h) {
            const s = score(choice, fr, w, h);
            if (!best || better(s, best.score)) best = { sheet: si, rect: ri, w, h, rotated, score: s };
          }
        }
      });
    };
    for (let si = 0; si < sheets.length; si++) tryPlace(si);
    if (!best) {
      sheets.push({ placements: [], free: [{ x: 0, y: 0, w: W, h: H }], usedArea: 0 });
      tryPlace(sheets.length - 1);
    }
    const c = best as Candidate | null;
    if (!c) continue; // No debería pasar: se filtran antes las piezas que no entran.
    const sheet = sheets[c.sheet];
    const fr = sheet.free[c.rect];
    sheet.placements.push({ ref: item.ref, x: fr.x, y: fr.y, w: c.w, h: c.h, rotated: c.rotated });
    sheet.usedArea += c.w * c.h;
    sheet.free.splice(c.rect, 1, ...splitFree(fr, c.w, c.h, kerf, split));
  }
  return sheets;
}

/** Ubica las piezas en la menor cantidad de placas probando varias estrategias. */
export function packPieces(items: PackItem[], opts: PackOptions): PackResult {
  const W = opts.boardLength - 2 * opts.trim;
  const H = opts.boardWidth - 2 * opts.trim;
  const fitting = items.filter((it) => fitsEmpty(it, W, H));
  const unplaced = items.filter((it) => !fitsEmpty(it, W, H));

  let best: Sheet[] | null = null;
  let bestKey: [number, number] = [Infinity, Infinity];
  if (fitting.length > 0) {
    for (const sort of SORTS) {
      const sorted = [...fitting].sort(sort);
      for (const choice of CHOICES) {
        for (const split of SPLITS) {
          const sheets = packOnce(sorted, W, H, opts.kerf, choice, split);
          // Menos placas; a igual cantidad, la última lo más vacía posible (sobrante más útil).
          const key: [number, number] = [sheets.length, sheets[sheets.length - 1].usedArea];
          if (better(key, bestKey)) {
            bestKey = key;
            best = sheets;
          }
        }
      }
    }
  }

  const sheets: Sheet[] = (best ?? []).map((s) => ({
    usedArea: s.usedArea,
    placements: s.placements.map((p) => ({ ...p, x: p.x + opts.trim, y: p.y + opts.trim })),
    free: s.free.map((f) => ({ ...f, x: f.x + opts.trim, y: f.y + opts.trim })),
  }));
  // La placa más llena primero.
  sheets.sort((a, b) => b.usedArea - a.usedArea);
  const usedArea = sheets.reduce((s, sh) => s + sh.usedArea, 0);
  const total = sheets.length * opts.boardLength * opts.boardWidth;
  return { sheets, unplaced, usedArea, efficiency: total > 0 ? usedArea / total : 0 };
}
