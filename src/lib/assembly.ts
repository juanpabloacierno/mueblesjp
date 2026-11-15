import type { Summary } from './cutlist';
import { HINGE_LABEL } from './doors';
import { mm } from './format';
import { tr } from './i18n';
import { resolveUnit } from './resolve';
import { buildScene, type SceneBox } from './scene';
import { screwsPerJoint } from './shelf';
import { buildSteps, type Step } from './steps';
import type { BaseSegment, HingeType, Piece, ShelfUnit, ShelfUnitResult } from './types';

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

/** Nombre de cada herraje en el idioma activo. */
function hardwareLabel(kind: HardwareKind): string {
  switch (kind) {
    case 'tornillo':
      return tr('Tornillo 4 × 50', 'Screw 4 × 50');
    case 'tornillo-corto':
      return tr('Tornillo 4 × 30', 'Screw 4 × 30');
    case 'tornillo-chico':
      return tr('Tornillo 3,5 × 16', 'Screw 3.5 × 16');
    case 'clavo':
      return tr('Clavo 1"', 'Nail 1"');
    case 'perno':
      return tr('Perno de estante', 'Shelf pin');
    case 'bisagra':
      return tr('Bisagra', 'Hinge');
    case 'corredera':
      return tr('Par de correderas', 'Pair of drawer slides');
    case 'soporte':
      return tr('Soporte de barra', 'Rod support');
    case 'barral':
      return tr('Barra de colgar', 'Hanging rod');
    case 'tirador':
      return tr('Tirador', 'Handle');
    case 'escuadra':
      return tr('Escuadra', 'Angle bracket');
    case 'tarugo':
      return tr('Taco de pared', 'Wall plug');
    case 'riel':
      return tr('Riel', 'Track');
    case 'ruedas':
      return tr('Juego de ruedas', 'Wheel set');
  }
}

function hw(kind: HardwareKind, qty: number, label = hardwareLabel(kind)): HardwareUse[] {
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

export function buildAssembly(input: ShelfUnit, r: ShelfUnitResult, summary: Summary): AssemblyPlan {
  // Las mismas reglas que el cálculo (empotrado, hueco para las piernas).
  const unit = resolveUnit(input);
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

  /**
   * Escritorio: primero cada cajonera o gabinete (tramo con piso) como una caja, después el
   * faldón con los laterales sueltos, y la tapa encima. El fondo va al final (también se clava
   * al canto de la tapa).
   */
  function buildDeskFrame() {
    const t = unit.material.thickness;
    const n = r.columns.length;
    const isSide = (b: SceneBox) => b.name === 'Lateral' || b.name === 'Lateral interior';
    const near = (a: number, b: number) => Math.abs(a - b) < 0.5;
    const inSeg = (seg: BaseSegment, x: number) => x >= seg.x - t - 0.5 && x <= seg.x + seg.w + 0.5;
    r.bases.forEach((seg, k) => {
      const leftX = seg.from === 0 ? 0 : r.dividers[seg.from - 1].left;
      const rightX = seg.to === n - 1 ? W - t : r.dividers[seg.to].left;
      const label = segmentName(seg, k);
      const suffix = k === 0 ? '' : `-${k + 1}`;
      const plinths = scene.filter((b) => b.name.startsWith('Zócalo') && inSeg(seg, b.x)).length;
      const left = take((b) => isSide(b) && near(b.x, leftX));
      push({
        key: `a-base${suffix}`,
        title: unit.plinth.enabled
          ? tr(`${label.es}: costado, piso y zócalo`, `${label.en}: side, bottom and plinth`)
          : tr(`${label.es}: costado y piso`, `${label.en}: side and bottom`),
        detail: tr(
          `Acuesta el costado izquierdo y atorníllale el piso${unit.plinth.enabled ? ' y el zócalo' : ''} en las marcas, con agujero guía.`,
          `Lay the left side flat and screw the bottom${unit.plinth.enabled ? ' and the plinth' : ''} to it at the marks, with pilot holes.`,
        ),
        add: [...left, ...take((b) => (b.name === 'Piso' || b.name.startsWith('Zócalo')) && inSeg(seg, b.x))],
        fixed: left,
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj + plinths * 2),
      });
      push({
        key: `a-lateral${suffix}`,
        title: tr(`${label.es}: otro costado`, `${label.en}: other side`),
        detail:
          unit.back.mode === 'ranurado'
            ? tr(
                'Pasa el fondo por las ranuras con un poco de cola y cierra con el otro costado, atornillado al piso y al zócalo.',
                'Slide the back panel into the grooves with a little glue and close with the other side, screwed to the bottom and the plinth.',
              )
            : tr(
                'Coloca el otro costado y atorníllalo al piso y al zócalo. Comprueba que la caja quede en escuadra.',
                'Position the other side and screw it to the bottom and the plinth. Check that the box is square.',
              ),
        add: take((b) => isSide(b) && near(b.x, rightX)),
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj + plinths * 2),
      });
    });

    // Faldón y laterales sueltos (patas del escritorio).
    const firstLeg = r.bases.length === 0 ? take((b) => b.name === 'Lateral' && b.x === 0) : [];
    const legs = [...firstLeg, ...take(isSide)];
    const others = legs.filter((i) => !firstLeg.includes(i)).map((i) => scene[i]);
    const faldones = take((b) => b.name === 'Faldón');
    // "la cajonera", "el gabinete", "las cajoneras", "los módulos"…
    const kinds = r.bases.map(segmentKind);
    const pedestals =
      kinds.length === 1
        ? { cajonera: { es: 'la cajonera', en: 'the drawer pedestal' }, gabinete: { es: 'el gabinete', en: 'the cabinet' }, modulo: { es: 'el módulo', en: 'the module' } }[kinds[0]]
        : kinds.every((k) => k === 'cajonera')
          ? { es: 'las cajoneras', en: 'the drawer pedestals' }
          : { es: 'los módulos', en: 'the pedestals' };
    const modestyScrews = r.knees.reduce((sum, k) => sum + (k.modesty ? 2 * screwsPerJoint(k.modesty.h) : 0), 0);
    if (legs.length || faldones.length) {
      const leftOnly = others.length > 0 && others.every((b) => b.x < W / 2);
      const rightOnly = others.length > 0 && others.every((b) => b.x >= W / 2);
      const explode =
        r.bases.length === 0 || rightOnly ? { x: side, y: 0, z: 0 } : leftOnly ? { x: -side, y: 0, z: 0 } : { x: 0, y: Math.max(H * 0.35, 250), z: 0 };
      const sideCount = legs.length;
      const title = faldones.length
        ? sideCount === 0
          ? tr('Faldón', 'Modesty panel')
          : sideCount === 1
            ? tr('Faldón y lateral', 'Modesty panel and side panel')
            : tr('Faldón y laterales', 'Modesty panel and side panels')
        : sideCount === 1
          ? tr('Lateral', 'Side panel')
          : tr('Laterales', 'Side panels');
      const screwsPerSide = r.knees.find((k) => k.modesty)?.modesty ? screwsPerJoint(r.knees.find((k) => k.modesty)!.modesty!.h) : 0;
      let detail: string;
      if (!faldones.length) {
        detail = tr('Pon de pie el lateral suelto en su lugar: lo une la tapa en el paso siguiente.', 'Stand the loose side panel in place: the top joins it in the next step.');
      } else if (r.bases.length === 0) {
        detail = tr(
          `Acuesta un lateral, atorníllale el faldón atrás, al ras del borde de arriba, y cierra con el otro lateral. Usa ${screwsPerSide} tornillos 4 × 50 por lado.`,
          `Lay one side panel flat, screw the modesty panel to it at the back, flush with the top edge, and close with the other side panel. Use ${screwsPerSide} 4 × 50 screws per side.`,
        );
      } else if (others.length) {
        detail = tr(
          `Pon de pie ${pedestals.es} en su lugar. Atornilla el faldón atrás, al ras del borde de arriba, y une el lateral suelto en el otro extremo, con ${screwsPerSide} tornillos 4 × 50 por lado.`,
          `Stand ${pedestals.en} in place. Screw the modesty panel at the back, flush with the top edge, and join the loose side panel at the other end, with ${screwsPerSide} 4 × 50 screws per side.`,
        );
      } else {
        detail = tr(
          `Pon de pie ${pedestals.es} a la distancia justa y atornilla el faldón de un costado al otro, atrás y al ras del borde de arriba, con ${screwsPerSide} tornillos 4 × 50 por lado.`,
          `Stand ${pedestals.en} at the right distance and screw the modesty panel from one side to the other, at the back and flush with the top edge, with ${screwsPerSide} 4 × 50 screws per side.`,
        );
      }
      push({
        key: 'a-faldon',
        title,
        detail,
        add: [...legs, ...faldones],
        fixed: firstLeg.length ? firstLeg : undefined,
        explode,
        hardware: hw('tornillo', modestyScrews),
      });
    }

    // Tapa: apoya sobre todo (o techo entre los laterales).
    const fullSides = r.dividers.filter((d) => d.full).length;
    push({
      key: 'a-techo',
      title: unit.top === 'sobre' ? tr('Tapa', 'Desktop') : tr('Techo', 'Top'),
      detail:
        unit.top === 'sobre'
          ? tr(
              'Apoya la tapa encima, alineada atrás y a los costados, y atorníllala desde arriba en las marcas. Si prefieres que no se vean tornillos, fíjala desde abajo con escuadras.',
              'Rest the desktop on top, flush at the back and the sides, and screw it down from above at the marks. If you prefer no visible screws, fix it from below with angle brackets.',
            )
          : tr(
              'Mete el techo entre los laterales, al ras de arriba, y atorníllalo por los laterales y desde arriba a los costados interiores.',
              'Fit the top between the side panels, flush at the top, and screw it through the side panels and down into the inner sides.',
            ),
      add: take((b) => b.name === 'Techo'),
      explode: { x: 0, y: Math.max(H * 0.25, 200), z: 0 },
      hardware: hw('tornillo', spj * (2 + fullSides)),
    });
  }

  /** Qué es un tramo con piso: cajonera (si tiene cajones), gabinete (si tiene puerta) o módulo. */
  function segmentKind(seg: BaseSegment): 'cajonera' | 'gabinete' | 'modulo' {
    const cols = (c: number | null) => c !== null && c >= seg.from && c <= seg.to;
    if (r.drawers.some((d) => cols(d.column))) return 'cajonera';
    if (r.doors.doors.some((d) => cols(d.column))) return 'gabinete';
    return 'modulo';
  }

  /** "Cajonera izquierda", "Gabinete derecho", "Módulo"… según lo que lleve el tramo. */
  function segmentName(seg: BaseSegment, k: number): { es: string; en: string } {
    const kind = segmentKind(seg);
    const [es, en, fem] =
      kind === 'cajonera' ? ['Cajonera', 'drawer pedestal', true] : kind === 'gabinete' ? ['Gabinete', 'cabinet', false] : ['Módulo', 'module', false];
    const enCap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
    if (r.bases.length === 1) return { es, en: enCap(en) };
    const pos = k === 0 ? 0 : k === r.bases.length - 1 ? 2 : 1;
    const esPos = fem ? ['izquierda', 'central', 'derecha'][pos] : ['izquierdo', 'central', 'derecho'][pos];
    const enPos = ['Left', 'Center', 'Right'][pos];
    return { es: `${es} ${esPos}`, en: `${enPos} ${en}` };
  }

  const plinths = scene.filter((b) => b.name.startsWith('Zócalo')).length;
  const mal = r.maletero !== null;

  const drawerNails = r.drawers.reduce((s, d) => s + d.count * Math.ceil((2 * (d.boxW + d.slide)) / 100), 0);
  if (r.knees.length > 0) {
    buildDeskFrame();
  } else {
    // --- 1. Primer lateral, piso y zócalo ---
    const firstSide = take((b) => b.name === 'Lateral' && b.x === 0);
    push({
      key: 'a-base',
      title: unit.plinth.enabled ? tr('Lateral, piso y zócalo', 'Side panel, bottom and plinth') : tr('Lateral y piso', 'Side panel and bottom'),
      detail: tr(
        `Acuesta el lateral izquierdo y atorníllale el piso${unit.plinth.enabled ? ' y el zócalo' : ''} en las marcas, con agujero guía.`,
        `Lay the left side panel flat and screw the bottom${unit.plinth.enabled ? ' and the plinth' : ''} to it at the marks, with pilot holes.`,
      ),
      add: [...firstSide, ...take((b) => b.name === 'Piso' || b.name.startsWith('Zócalo'))],
      fixed: firstSide,
      explode: { x: side, y: 0, z: 0 },
      hardware: hw('tornillo', spj + plinths * 2),
    });

    // --- 2. Techo y estante maletero (o el otro lateral si el techo apoya arriba) ---
    if (unit.top === 'entre') {
      push({
        key: 'a-techo',
        title: mal ? tr('Techo y estante maletero', 'Top and top storage shelf') : tr('Techo', 'Top'),
        detail: tr(`Atornilla el techo${mal ? ' y el estante maletero' : ''} al mismo lateral.`, `Screw the top${mal ? ' and the top storage shelf' : ''} to the same side panel.`),
        add: take((b) => b.name === 'Techo' || b.name === 'Estante maletero'),
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj * (mal ? 2 : 1)),
      });
      push({
        key: 'a-lateral',
        title: tr('Segundo lateral', 'Second side panel'),
        detail: tr(
          'Coloca el otro lateral y atorníllalo al piso, al techo y al resto, siempre en las marcas.',
          'Position the other side panel and screw it to the bottom, the top and the rest, always at the marks.',
        ),
        add: take((b) => b.name === 'Lateral'),
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj * (2 + (mal ? 1 : 0)) + plinths * 2),
      });
    } else {
      if (mal) {
        push({
          key: 'a-maletero',
          title: tr('Estante maletero', 'Top storage shelf'),
          detail: tr('Atornilla el estante maletero al lateral, en su marca.', 'Screw the top storage shelf to the side panel, at its mark.'),
          add: take((b) => b.name === 'Estante maletero'),
          explode: { x: side, y: 0, z: 0 },
          hardware: hw('tornillo', spj),
        });
      }
      push({
        key: 'a-lateral',
        title: tr('Segundo lateral', 'Second side panel'),
        detail: tr('Coloca el otro lateral y atorníllalo al piso y al resto.', 'Position the other side panel and screw it to the bottom and the rest.'),
        add: take((b) => b.name === 'Lateral'),
        explode: { x: side, y: 0, z: 0 },
        hardware: hw('tornillo', spj * (1 + (mal ? 1 : 0)) + plinths * 2),
      });
      push({
        key: 'a-techo',
        title: tr('Techo', 'Top'),
        detail: tr(
          'Apoya el techo sobre los laterales, alineado con el frente, y atorníllalo desde arriba.',
          'Rest the top on the side panels, flush with the front, and screw it down from above.',
        ),
        add: take((b) => b.name === 'Techo'),
        explode: { x: 0, y: Math.max(H * 0.18, 200), z: 0 },
        hardware: hw('tornillo', spj * 2),
      });
    }

  }

  // --- Fondo ---
  if (unit.back.mode !== 'ninguno') {
    push({
      key: 'a-fondo',
      title: tr('Fondo', 'Back panel'),
      detail:
        unit.back.mode === 'clavado'
          ? `${text('escuadra')?.detail ?? ''}`
          : tr(
              'El fondo va en la ranura: pásalo antes de cerrar con el segundo lateral, con un poco de cola.',
              'The back panel sits in the groove: slide it in before closing with the second side panel, with a little glue.',
            ),
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
      title: divs.length === 1 ? tr('Divisor', 'Divider') : tr('Divisores', 'Dividers'),
      detail: tr(
        'Mete cada divisor por el frente hasta el fondo y atorníllalo desde abajo y desde arriba, en las marcas.',
        'Slide each divider in from the front all the way to the back and screw it from below and above, at the marks.',
      ),
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
      title: fixed.length === 1 ? tr('Estante fijo', 'Fixed shelf') : tr('Estantes fijos', 'Fixed shelves'),
      detail: tr(
        'Coloca los estantes fijos de abajo hacia arriba, a nivel, y atorníllalos por los lados.',
        'Fit the fixed shelves from bottom to top, level, and screw them through the side panels.',
      ),
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
      title: rods.length === 1 ? tr('Barra de colgar', 'Hanging rod') : tr('Barras de colgar', 'Hanging rods'),
      detail: text('barrales')?.detail ?? '',
      add: rods,
      explode: { x: 0, y: 0, z: front * 0.7 },
      hardware: [...hw('barral', rods.length, tr('Barra de colgar cortada a medida', 'Hanging rod cut to size')), ...hw('soporte', supports), ...hw('tornillo-chico', supports * 3)],
    });
  }

  // --- Cajones ---
  const drawerBoxes = take((b) => b.name === 'Frente de cajón' || b.name === 'Lateral de cajón' || (b.name === 'Tirador' && !!b.pullZ));
  if (drawerBoxes.length) {
    const n = r.drawers.reduce((s, d) => s + d.count, 0);
    push({
      key: 'a-cajones',
      title: n === 1 ? tr('Cajón', 'Drawer') : tr('Cajones', 'Drawers'),
      detail: text('cajones')?.detail ?? '',
      add: drawerBoxes,
      explode: { x: 0, y: 0, z: front },
      pieceNames: ['Frente de cajón', 'Lateral de cajón', 'Frente y contrafrente de cajón', 'Fondo de cajón'],
      hardware: [
        ...hw('clavo', drawerNails, tr('Clavo 1" (fondos de cajón)', 'Nail 1" (drawer bottoms)')),
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
      title: tr('Zapatero', 'Shoe rack'),
      detail: text('zapatero')?.detail ?? '',
      add: shoes,
      explode: { x: 0, y: 0, z: front },
      hardware: [
        ...hw('tornillo', inclined * 4),
        ...hw('tornillo-corto', inclined * 3),
        ...hw('barral', barLevels * 2, tr('Barra para zapatos cortada a medida', 'Shoe bar cut to size')),
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
      title: movable.length === 1 ? tr('Estante móvil', 'Adjustable shelf') : tr('Estantes móviles', 'Adjustable shelves'),
      detail: tr(
        'Pon 4 pernos por estante en los agujeros, a la altura que quieras, y apoya cada estante.',
        'Push 4 pins per shelf into the holes, at the height you want, and set each shelf on them.',
      ),
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
    const hinges = (Object.entries(r.doors.hingeCounts) as [HingeType, number][]).flatMap(([type, qty]) => hw('bisagra', qty, tr(`Bisagra ${HINGE_LABEL[type]}`, `Hinge, ${HINGE_LABEL[type]}`)));
    const hingeTotal = Object.values(r.doors.hingeCounts).reduce((s, v) => s + v, 0);
    const sets = Math.max(1, r.doors.trackSets);
    push({
      key: 'a-puertas',
      title: hinged ? (doors.length === 1 ? tr('Puerta', 'Door') : tr('Puertas', 'Doors')) : tr('Puertas corredizas', 'Sliding doors'),
      detail: text('puertas')?.detail ?? '',
      add: doorBoxes,
      explode: { x: 0, y: 0, z: front },
      hardware: hinged
        ? [...hinges, ...hw('tornillo-chico', hingeTotal * 4), ...hw('tirador', doors.length)]
        : [
            ...hw('riel', sets * 2, tr(`Riel de ${mm(r.doors.trackLength)} mm`, `${mm(r.doors.trackLength)} mm track`)),
            ...hw('ruedas', doors.length),
            ...hw('tornillo-chico', 2 * sets * (Math.ceil(r.doors.trackLength / 150) + 1)),
            ...hw('tirador', doors.length, tr('Tirador embutido', 'Recessed handle')),
          ],
    });
  }

  // Lo que haya quedado sin paso (por si se agregan piezas nuevas a la escena).
  const rest = take(() => true);
  if (rest.length) {
    push({ key: 'a-resto', title: tr('Resto de las piezas', 'Remaining pieces'), detail: tr('Coloca las piezas que faltan.', 'Fit the remaining pieces.'), add: rest, explode: { x: 0, y: 0, z: front }, hardware: [] });
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
