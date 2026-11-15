import { mm } from './format';
import { tr } from './i18n';
import type { ShoeRackResult, ShoeRackStyle } from './types';

/** Inclinación de los estantes zapateros. */
export const SHOE_ANGLE_DEG = 15;
/** Recorrido horizontal máximo del estante inclinado: un zapato largo mide unos 32 cm. */
export const SHOE_RUN_MAX = 330;
/** Alto del tope que va al frente del estante inclinado. */
export const TOPE_HEIGHT = 50;
/** El primer nivel arranca esta medida arriba del piso del hueco. */
export const SHOE_BASE = 20;
/** Barras: la de adelante a 60 mm del frente, la de atrás 200 mm más atrás y 70 mm más arriba. */
export const BAR_FRONT = 60;
export const BAR_SPACING = 200;
export const BAR_RISE = 70;

export const SHOE_LABEL: Record<ShoeRackStyle, string> = {
  get inclinado() {
    return tr('Zapatero inclinado', 'Slanted shoe rack');
  },
  get barras() {
    return tr('Zapatero con barras', 'Shoe rack with bars');
  },
  get plano() {
    return tr('Zapatero plano', 'Flat shoe rack');
  },
};

/** Alto mínimo por nivel para que entren zapatos de hombre. */
const MIN_PITCH: Record<ShoeRackStyle, number> = { inclinado: 170, barras: 160, plano: 140 };

/** Cantidad de niveles que entran cómodos en un hueco. */
export function autoShoeLevels(style: ShoeRackStyle, height: number, t: number): number {
  switch (style) {
    case 'inclinado':
      return Math.max(1, Math.floor((height - SHOE_BASE) / 200));
    case 'barras':
      return Math.max(1, Math.floor((height - 40) / 180));
    case 'plano':
      return Math.max(1, Math.floor((height + t) / (170 + t)));
  }
}

/** Ancho del estante inclinado medido sobre la pendiente. */
export function slopeWidth(run: number): number {
  return Math.round(run / Math.cos((SHOE_ANGLE_DEG * Math.PI) / 180));
}

export interface ShoeLayout {
  rack: ShoeRackResult | null;
  warnings: string[];
}

export function layoutShoeRack(
  column: number,
  x: number,
  width: number,
  bottom: number,
  height: number,
  depth: number,
  frontOffset: number,
  style: ShoeRackStyle,
  levelsWanted: number,
  t: number,
): ShoeLayout {
  const n = Math.max(1, Math.floor(levelsWanted));
  const warnings: string[] = [];
  const base = { column, style, x, width, bottom, height, frontOffset };

  if (style === 'inclinado') {
    const run = Math.min(depth - 10, SHOE_RUN_MAX);
    if (run < 200) return { rack: null, warnings: [tr(`el zapatero inclinado necesita al menos 210 mm de profundidad y hay ${mm(depth)} mm.`, `the slanted shoe rack needs at least 210 mm of depth and there are ${mm(depth)} mm.`)] };
    const rise = Math.round(run * Math.tan((SHOE_ANGLE_DEG * Math.PI) / 180));
    const pitch = (height - SHOE_BASE) / n;
    if (pitch < MIN_PITCH.inclinado) {
      warnings.push(
        tr(
          `${n} niveles de zapatero en ${mm(height)} mm quedan a ${mm(Math.floor(pitch))} mm: usa menos niveles (hacen falta unos ${MIN_PITCH.inclinado} mm por nivel).`,
          `${n} shoe rack levels in ${mm(height)} mm end up ${mm(Math.floor(pitch))} mm apart: use fewer levels (each level needs about ${MIN_PITCH.inclinado} mm).`,
        ),
      );
    } else if (pitch - rise - t < 70) {
      warnings.push(
        tr(
          `el último nivel del zapatero queda con ${mm(Math.floor(pitch - rise - t))} mm atrás: quita un nivel o deja el hueco más alto.`,
          `the top shoe rack level is left with ${mm(Math.floor(pitch - rise - t))} mm at the back: remove a level or make the compartment taller.`,
        ),
      );
    }
    const levels = Array.from({ length: n }, (_, i) => {
      const front = Math.round(bottom + SHOE_BASE + i * pitch);
      return { front, back: front + rise };
    });
    return { rack: { ...base, levels, run, rise, pitch: Math.floor(pitch) }, warnings };
  }

  if (style === 'barras') {
    if (depth < BAR_FRONT + BAR_SPACING + 20) {
      return { rack: null, warnings: [tr(`el zapatero con barras necesita ${BAR_FRONT + BAR_SPACING + 20} mm de profundidad y hay ${mm(depth)} mm.`, `the shoe rack with bars needs ${BAR_FRONT + BAR_SPACING + 20} mm of depth and there are ${mm(depth)} mm.`)] };
    }
    const pitch = (height - 40) / n;
    if (pitch < MIN_PITCH.barras) {
      warnings.push(tr(`${n} niveles de barras en ${mm(height)} mm quedan a ${mm(Math.floor(pitch))} mm: usa menos niveles.`, `${n} bar levels in ${mm(height)} mm end up ${mm(Math.floor(pitch))} mm apart: use fewer levels.`));
    }
    const levels = Array.from({ length: n }, (_, i) => {
      const front = Math.round(bottom + 40 + i * pitch);
      return { front, back: front + BAR_RISE };
    });
    return { rack: { ...base, levels, run: BAR_SPACING, rise: BAR_RISE, pitch: Math.floor(pitch) }, warnings };
  }

  // Plano: n filas de zapatos, con n − 1 estantes (el piso del hueco es la primera fila).
  const row = (height - (n - 1) * t) / n;
  if (row < MIN_PITCH.plano) {
    warnings.push(tr(`${n} filas de zapatos en ${mm(height)} mm quedan de ${mm(Math.floor(row))} mm: usa menos filas.`, `${n} rows of shoes in ${mm(height)} mm end up ${mm(Math.floor(row))} mm high: use fewer rows.`));
  }
  const levels = Array.from({ length: n - 1 }, (_, i) => {
    const y = Math.round(bottom + (i + 1) * row + i * t);
    return { front: y, back: y };
  });
  return { rack: { ...base, levels, run: depth, rise: 0, pitch: Math.floor(row) }, warnings };
}
