import type { Summary } from './cutlist';
import { HINGE_LABEL } from './doors';
import { mm } from './format';
import { buildScene, type SceneBox } from './scene';
import { buildSteps, type Step } from './steps';
import type { HingeType, Piece, ShelfUnit, ShelfUnitResult } from './types';

/** Herrajes que aparecen en las instrucciones, cada uno con su dibujito. */
export type HardwareKind =
  | 'tornillo'
  | 'tornillo-corto'
  | 'tornillo-chico'
  | 'clavo'
  | 'perno'
  | 'bisagra'
  | 'corredera'
  | 'soporte'
  | 'barral'
  | 'tirador'
  | 'escuadra'
  | 'tarugo'
  | 'riel'
  | 'ruedas';

export interface HardwareUse {
  kind: HardwareKind;
  label: string;
  qty: number;
}

export interface PieceUse {
  code: string;
  name: string;
  qty: number;
}

export interface AssemblyStep {
  key: string;
  title: string;
  detail: string;
  /** Piezas nuevas de este paso (índices en `scene`). */
  add: number[];
  /** Dirección en que se dibujan separadas las piezas nuevas, en mm. */
  explode: { x: number; y: number; z: number };
  /** Piezas nuevas que quedan quietas (la base sobre la que se arma). */
  fixed?: number[];
  /** Desde dónde se mira el dibujo. */
  view: 'frente' | 'atras';
  pieces: PieceUse[];
  hardware: HardwareUse[];
}

export interface AssemblyPlan {
  /** Pasos previos, sin dibujo (medir, pedir cortes, marcar, perforar). */
  prep: Step[];
  steps: AssemblyStep[];
  scene: SceneBox[];
  /** Herrajes de todo el mueble, para la hoja de piezas. */
  hardware: HardwareUse[];
}

const LABELS: Record<HardwareKind, string> = {
  tornillo: 'Tornillo 4 × 50',
  'tornillo-corto': 'Tornillo 4 × 30',
  'tornillo-chico': 'Tornillo 3,5 × 16',
  clavo: 'Clavo 1"',
  perno: 'Perno de estante',
  bisagra: 'Bisagra',
  corredera: 'Par de correderas',
  soporte: 'Soporte de barral',
  barral: 'Barral',
  tirador: 'Tirador',
  escuadra: 'Escuadra',
  tarugo: 'Tarugo de pared',
  riel: 'Riel',
  ruedas: 'Juego de ruedas',
};

function hw(kind: HardwareKind, qty: number, label = LABELS[kind]): HardwareUse[] {
  return qty > 0 ? [{ kind, label, qty }] : [];
}

/** Letra del despiece que corresponde a una caja del dibujo. */
export function codeForBox(box: SceneBox, pieces: Piece[]): Piece | undefined {
  const same = pieces.filter((p) => p.name === box.name);
  if (same.length <= 1) return same[0];
  const dims = [box.w, box.h, box.d].map((v) => Math.round(v));
  const close = (a: number, b: number) => Math.abs(a - b) <= 2;
  return same.find((p) => dims.some((d) => close(d, p.length)) && dims.some((d) => close(d, p.width))) ?? same[0];
}

export function buildAssembly(unit: ShelfUnit, r: ShelfUnitResult, summary: Summary): AssemblyPlan {
  const scene = buildScene(unit, r);
  const all = buildSteps(unit, r, summary);
  const text = (key: string) => all.find((s) => s.key === key);
  const prep = all.filter((s) => ['medir', 'cortes', 'marcar', 'perforar'].includes(s.key));
  if (scene.length === 0) return { prep, steps: [], scene, hardware: [] };

  const { width: W, height: H, depth: D } = r.size;
  const used = new Set<number>();
  const take = (pred: (b: SceneBox, i: number) => boolean) => {
    const out: number[] = [];
    scene.forEach((b, i) => {
      if (!used.has(i) && pred(b, i)) {
        used.add(i);
        out.push(i);
      }
    });
    return out;
  };
  const spj = r.counts.screwsPerJoint;
  const steps: AssemblyStep[] = [];
  const side = Math.max(W, D) * 0.45;
  const front = Math.max(D * 1.3, 450);
  const push = (s: Omit<AssemblyStep, 'pieces' | 'view'> & { view?: AssemblyStep['view']; pieceNames?: string[] }) => {
    const { pieceNames, ...rest } = s;
    if (pieceNames) {
      // Piezas que en el dibujo son un solo bloque (caja del cajón, fondo partido).
      const list = r.pieces.filter((p) => pieceNames.includes(p.name)).map((p) => ({ code: p.code, name: p.name, qty: p.qty }));
      steps.push({ view: 'frente', ...rest, pieces: list });
      return;
    }
    // Cuenta las piezas del despiece que entran en este paso.
    const counts = new Map<string, PieceUse>();
    for (const i of s.add) {
      const p = codeForBox(scene[i], r.pieces);
      if (!p) continue;
      const prev = counts.get(p.code);
      counts.set(p.code, { code: p.code, name: p.name, qty: (prev?.qty ?? 0) + 1 });
    }
    steps.push({ view: 'frente', ...rest, pieces: [...counts.values()].sort((a, b) => a.code.localeCompare(b.code)) });
  };

  const plinths = scene.filter((b) => b.name.startsWith('Zócalo')).length;
  const mal = r.maletero !== null;

  // --- 1. Primer lateral, piso y zócalo ---
  const firstSide = take((b) => b.name === 'Lateral' && b.x === 0);
  push({
    key: 'a-base',
    title: unit.plinth.enabled ? 'Lateral, piso y zócalo' : 'Lateral y piso',
    detail: `Acostá el lateral izquierdo y atornillale el piso${unit.plinth.enabled ? ' y el zócalo' : ''} en las marcas, con agujero guía.`,
    add: [...firstSide, ...take((b) => b.name === 'Piso' || b.name.startsWith('Zócalo'))],
    fixed: firstSide,
    explode: { x: side, y: 0, z: 0 },
    hardware: hw('tornillo', spj + plinths * 2),
  });

  // --- 2. Techo y estante maletero (o el otro lateral si el techo apoya arriba) ---
  if (unit.top === 'entre') {
    push({
      key: 'a-techo',
      title: mal ? 'Techo y estante maletero' : 'Techo',
      detail: `Atornillá el techo${mal ? ' y el estante maletero' : ''} al mismo lateral.`,
      add: take((b) => b.name === 'Techo' || b.name === 'Estante maletero'),
      explode: { x: side, y: 0, z: 0 },
      hardware: hw('tornillo', spj * (mal ? 2 : 1)),
    });
    push({
      key: 'a-lateral',
      title: 'Segundo lateral',
      detail: 'Presentá el otro lateral y atornillalo al piso, al techo y al resto, siempre en las marcas.',
      add: take((b) => b.name === 'Lateral'),
      explode: { x: side, y: 0, z: 0 },
      hardware: hw('tornillo', spj * (2 + (mal ? 1 : 0)) + plinths * 2),
    });
  } else {
    if (mal) {
      push({
        key: 'a-maletero',
        title: 'Estante maletero',
        detail: 'Atornillá el estante maletero al lateral, en su marca.',
        add: take((b) => b.name === 'Estante maletero'),
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj),
      });
    }
    push({
      key: 'a-lateral',
      title: 'Segundo lateral',
      detail: 'Presentá el otro lateral y atornillalo al piso y al resto.',
      add: take((b) => b.name === 'Lateral'),
      explode: { x: side, y: 0, z: 0 },
      hardware: hw('tornillo', spj * (1 + (mal ? 1 : 0)) + plinths * 2),
    });
    push({
      key: 'a-techo',
      title: 'Techo',
      detail: 'Apoyá el techo sobre los laterales, alineado con el frente, y atornillalo desde arriba.',
      add: take((b) => b.name === 'Techo'),
      explode: { x: 0, y: Math.max(H * 0.18, 200), z: 0 },
      hardware: hw('tornillo', spj * 2),
    });
  }

  // --- Fondo ---
  const drawerNails = r.drawers.reduce((s, d) => s + d.count * Math.ceil((2 * (d.boxW + d.slide)) / 100), 0);
  if (unit.back.mode !== 'ninguno') {
    push({
      key: 'a-fondo',
      title: 'Fondo',
      detail:
        unit.back.mode === 'clavado'
          ? `${text('escuadra')?.detail ?? ''}`
          : 'El fondo va en la ranura: pasalo antes de cerrar con el segundo lateral, con un poco de cola.',
      add: take((b) => b.name === 'Fondo'),
      explode: { x: 0, y: 0, z: -Math.max(D * 0.8, 250) },
      view: 'atras',
      pieceNames: ['Fondo', 'Fondo (parte)'],
      hardware: unit.back.mode === 'clavado' ? hw('clavo', Math.max(0, r.counts.backNails - drawerNails)) : [],
    });
  }

  const parar = text('parar');
  if (parar) push({ key: 'a-parar', title: parar.title, detail: parar.detail, add: [], explode: { x: 0, y: 0, z: 0 }, hardware: [] });

  // --- Divisores ---
  const divs = take((b) => b.name === 'Divisor' || b.name === 'Divisor de maletero');
  if (divs.length) {
    push({
      key: 'a-divisores',
      title: divs.length === 1 ? 'Divisor' : 'Divisores',
      detail: 'Entrá cada divisor por el frente hasta el fondo y atornillalo desde abajo y desde arriba, en las marcas.',
      add: divs,
      explode: { x: 0, y: 0, z: front },
      hardware: hw('tornillo', divs.length * 2 * spj),
    });
  }

  // --- Estantes fijos ---
  const fixed = take((b) => b.name === 'Estante fijo');
  if (fixed.length) {
    push({
      key: 'a-fijos',
      title: fixed.length === 1 ? 'Estante fijo' : 'Estantes fijos',
      detail: 'Colocá los estantes fijos de abajo hacia arriba, a nivel, y atornillalos por los costados.',
      add: fixed,
      explode: { x: 0, y: 0, z: front },
      hardware: hw('tornillo', fixed.length * 2 * spj),
    });
  }

  // --- Barrales ---
  const rods = take((b) => b.name === 'Barral');
  if (rods.length) {
    const supports = r.rods.reduce((s, x) => s + x.supports, 0);
    push({
      key: 'a-barrales',
      title: rods.length === 1 ? 'Barral' : 'Barrales',
      detail: text('barrales')?.detail ?? '',
      add: rods,
      explode: { x: 0, y: 0, z: front * 0.7 },
      hardware: [...hw('barral', rods.length, 'Barral cortado a medida'), ...hw('soporte', supports), ...hw('tornillo-chico', supports * 3)],
    });
  }

  // --- Cajones ---
  const drawerBoxes = take((b) => b.name === 'Frente de cajón' || b.name === 'Lateral de cajón' || (b.name === 'Tirador' && !!b.pullZ));
  if (drawerBoxes.length) {
    const n = r.drawers.reduce((s, d) => s + d.count, 0);
    push({
      key: 'a-cajones',
      title: n === 1 ? 'Cajón' : 'Cajones',
      detail: text('cajones')?.detail ?? '',
      add: drawerBoxes,
      explode: { x: 0, y: 0, z: front },
      pieceNames: ['Frente de cajón', 'Lateral de cajón', 'Frente y contrafrente de cajón', 'Fondo de cajón'],
      hardware: [
        ...hw('clavo', drawerNails, 'Clavo 1" (fondos de cajón)'),
        ...hw('corredera', n),
        ...hw('tornillo', n * 8),
        ...hw('tornillo-chico', n * 12),
        ...hw('tornillo-corto', n * 4),
        ...hw('tirador', n),
      ],
    });
  }

  // --- Zapatero ---
  const shoes = take((b) => b.name === 'Estante zapatero inclinado' || b.name === 'Tope de zapatero' || b.name === 'Barra' || b.name === 'Estante zapatero');
  if (shoes.length) {
    const inclined = r.shoeRacks.filter((z) => z.style === 'inclinado').reduce((s, z) => s + z.levels.length, 0);
    const barLevels = r.shoeRacks.filter((z) => z.style === 'barras').reduce((s, z) => s + z.levels.length, 0);
    const flat = r.shoeRacks.filter((z) => z.style === 'plano').reduce((s, z) => s + z.levels.length, 0);
    push({
      key: 'a-zapatero',
      title: 'Zapatero',
      detail: text('zapatero')?.detail ?? '',
      add: shoes,
      explode: { x: 0, y: 0, z: front },
      hardware: [
        ...hw('tornillo', inclined * 4),
        ...hw('tornillo-corto', inclined * 3),
        ...hw('barral', barLevels * 2, 'Barra cortada a medida'),
        ...hw('soporte', barLevels * 4),
        ...hw('tornillo-chico', barLevels * 12),
        ...hw('perno', flat * 4),
      ],
    });
  }

  // --- Estantes móviles ---
  const movable = take((b) => b.name === 'Estante móvil');
  if (movable.length) {
    push({
      key: 'a-moviles',
      title: movable.length === 1 ? 'Estante móvil' : 'Estantes móviles',
      detail: 'Poné 4 pernos por estante en los agujeros, a la altura que quieras, y apoyá cada estante.',
      add: movable,
      explode: { x: 0, y: 0, z: front },
      hardware: hw('perno', movable.length * 4),
    });
  }

  // --- Puertas ---
  const doorBoxes = take((b) => b.name.startsWith('Puerta') || b.name === 'Tirador');
  if (doorBoxes.length) {
    const doors = r.doors.doors;
    const hinged = unit.doors.type === 'batiente';
    const hinges = (Object.entries(r.doors.hingeCounts) as [HingeType, number][]).flatMap(([type, qty]) => hw('bisagra', qty, `Bisagra ${HINGE_LABEL[type]}`));
    const hingeTotal = Object.values(r.doors.hingeCounts).reduce((s, v) => s + v, 0);
    const sets = Math.max(1, r.doors.trackSets);
    push({
      key: 'a-puertas',
      title: hinged ? (doors.length === 1 ? 'Puerta' : 'Puertas') : 'Puertas corredizas',
      detail: text('puertas')?.detail ?? '',
      add: doorBoxes,
      explode: { x: 0, y: 0, z: front },
      hardware: hinged
        ? [...hinges, ...hw('tornillo-chico', hingeTotal * 4), ...hw('tirador', doors.length)]
        : [
            ...hw('riel', sets * 2, `Riel de ${mm(r.doors.trackLength)} mm`),
            ...hw('ruedas', doors.length),
            ...hw('tornillo-chico', 2 * sets * (Math.ceil(r.doors.trackLength / 150) + 1)),
            ...hw('tirador', doors.length, 'Tirador embutido'),
          ],
    });
  }

  // Lo que haya quedado sin paso (por si se agregan piezas nuevas a la escena).
  const rest = take(() => true);
  if (rest.length) {
    push({ key: 'a-resto', title: 'Resto de las piezas', detail: 'Colocá las piezas que faltan.', add: rest, explode: { x: 0, y: 0, z: front }, hardware: [] });
  }

  const pared = text('pared');
  if (pared) {
    push({ key: 'a-pared', title: pared.title, detail: pared.detail, add: [], explode: { x: 0, y: 0, z: 0 }, hardware: [...hw('escuadra', 2), ...hw('tarugo', 4)] });
  }
  const fin = text('terminar');
  if (fin) {
    push({ key: 'a-terminar', title: fin.title, detail: fin.detail, add: [], explode: { x: 0, y: 0, z: 0 }, hardware: [] });
  }

  // Herrajes totales para la hoja de piezas.
  const totals = new Map<string, HardwareUse>();
  for (const s of steps) {
    for (const h of s.hardware) {
      const prev = totals.get(h.label);
      totals.set(h.label, { ...h, qty: (prev?.qty ?? 0) + h.qty });
    }
  }
  return { prep, steps, scene, hardware: [...totals.values()] };
}
