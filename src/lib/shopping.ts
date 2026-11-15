import type { Summary } from './cutlist';
import { backLabel, boardLabel, isGenericBrand, isRawBoard } from './catalog';
import { HINGE_LABEL } from './doors';
import { mm, money, num } from './format';
import { tr } from './i18n';
import type { HingeType, Material, ShelfUnit, ShelfUnitResult } from './types';

export type ShoppingCategory = 'placas' | 'herrajes' | 'fijaciones' | 'insumos' | 'herramientas';

// Los textos son getters: cambian con el idioma activo.
export const CATEGORIES: { key: ShoppingCategory; label: string; hint?: string }[] = [
  {
    key: 'placas',
    get label() {
      return tr('Tableros y cortes', 'Boards and cutting');
    },
  },
  {
    key: 'herrajes',
    get label() {
      return tr('Herrajes', 'Hardware');
    },
  },
  {
    key: 'fijaciones',
    get label() {
      return tr('Tornillos y fijaciones', 'Screws and fasteners');
    },
  },
  {
    key: 'insumos',
    get label() {
      return tr('Insumos', 'Supplies');
    },
  },
  {
    key: 'herramientas',
    get label() {
      return tr('Herramientas', 'Tools');
    },
    get hint() {
      return tr('Solo si no las tienes', "Only if you don't have them");
    },
  },
];

export type ShoppingUnit = 'placa' | 'm' | 'u' | 'juego';

export interface ShoppingItem {
  /** Clave estable: guarda el precio (para todos los muebles) y si está marcado. */
  key: string;
  category: ShoppingCategory;
  name: string;
  qty: number;
  unit: ShoppingUnit;
  note?: string;
  /** Viene marcado para comprar. Los opcionales y las herramientas vienen sin marcar. */
  defaultOn: boolean;
  optional?: boolean;
}

export type PriceList = Record<string, number>;

/** Placas genéricas o "Otra": misma clave que antes del catálogo, para no perder precios cargados. */
export const boardKey = (m: Material) =>
  isGenericBrand(m.brand) && m.boardType === 'melamina'
    ? `placa-melamina|${m.color.trim().toLowerCase()}|${m.thickness}|${m.boardLength}x${m.boardWidth}`
    : `placa|${m.brand.trim().toLowerCase()}|${m.boardType}|${isRawBoard(m) ? '' : m.color.trim().toLowerCase()}|${m.thickness}|${m.boardLength}x${m.boardWidth}`;
export const backBoardKey = (m: Material) =>
  isGenericBrand(m.backBrand) && m.backType === 'fibrofacil'
    ? `placa-fondo|${m.backThickness}|${m.backBoardLength}x${m.backBoardWidth}`
    : `placa-fondo|${m.backBrand.trim().toLowerCase()}|${m.backType}|${m.backThickness}|${m.backBoardLength}x${m.backBoardWidth}`;
export const edgeKey = (m: Material) => `tapacanto|${m.color.trim().toLowerCase()}|${m.edgeWidth}x${m.edgeThickness}`;
export const CUT_KEY = 'corte-placa';

export function buildShoppingList(unit: ShelfUnit, result: ShelfUnitResult, summary: Summary): ShoppingItem[] {
  if (result.pieces.length === 0) return [];
  const m = unit.material;
  const items: ShoppingItem[] = [];
  const add = (item: ShoppingItem) => {
    if (item.qty > 0) items.push(item);
  };
  const doors = result.doors.doors;
  const hinged = unit.doors.type === 'batiente' && doors.length > 0;
  const sliding = unit.doors.type === 'corrediza' && doors.length > 0;
  const tall = result.size.height > 1200;
  const rods = result.rods;
  const drawers = result.drawers;
  const drawerCount = drawers.reduce((n, d) => n + d.count, 0);
  const shoeBars = result.shoeRacks.filter((z) => z.style === 'barras');
  // Cada nivel de zapatero con barras lleva 2 barras y 4 soportes.
  const barLengths = [...rods.map((r) => r.length), ...shoeBars.flatMap((z) => z.levels.flatMap(() => [z.width - 2, z.width - 2]))];
  const rodSupports = rods.reduce((n, r) => n + r.supports, 0) + shoeBars.reduce((n, z) => n + z.levels.length * 4, 0);
  const topes = result.shoeRacks.filter((z) => z.style === 'inclinado').reduce((n, z) => n + z.levels.length, 0);
  const color = m.color.trim();

  // --- Placas y cortes ---
  const melSheets = summary.boards.reduce((n, b) => n + b.pack.sheets.length, 0);
  const backBoards = summary.fondo?.pack.sheets.length ?? 0;
  for (const plan of summary.boards) {
    const pm = plan.material;
    add({
      key: boardKey(pm),
      category: 'placas',
      // "Tablero de melamina Egger Blanco 18 mm", "Tablero de MDF crudo Faplac 18 mm".
      name:
        tr(`Tablero de ${boardLabel(pm).replace(/^(Melamina|Aglomerado)/, (w) => w.toLowerCase())}`, `Board: ${boardLabel(pm)}`) +
        (summary.interior ? (plan.finish === 'interior' ? ' (interior)' : ' (exterior)') : ''),
      qty: plan.pack.sheets.length,
      unit: 'placa',
      note: tr(
        `${plan.boardLabel} · aprovechamiento ${Math.round(plan.pack.efficiency * 100)} %`,
        `${plan.boardLabel} · ${Math.round(plan.pack.efficiency * 100)} % yield`,
      ),
      defaultOn: true,
    });
  }
  if (summary.fondo) {
    add({
      key: backBoardKey(m),
      category: 'placas',
      name: tr(`Tablero de fondo: ${backLabel(m)}`, `Back panel board: ${backLabel(m)}`),
      qty: backBoards,
      unit: 'placa',
      note: summary.fondo.boardLabel,
      defaultOn: true,
    });
  }
  add({
    key: CUT_KEY,
    category: 'placas',
    name: tr('Servicio de corte en seccionadora', 'Panel saw cutting service'),
    qty: melSheets + backBoards,
    unit: 'placa',
    note: tr('Pídelo con la lista de cortes de la pestaña Despiece', 'Order it with the list from the Cut list tab'),
    defaultOn: true,
  });
  // Un tapacanto por color (si el interior es del mismo color, se suman en un solo ítem).
  const edges = new Map<string, { m: Material; meters: number }>();
  for (const plan of summary.boards) {
    const k = edgeKey(plan.material);
    const prev = edges.get(k);
    edges.set(k, { m: plan.material, meters: (prev?.meters ?? 0) + plan.edgeMeters });
  }
  for (const [key, { m: em, meters }] of edges) {
    if (meters <= 0) continue;
    add({
      key,
      category: 'placas',
      name: tr(
        `Tapacanto ${em.color.trim()} ${mm(m.edgeWidth)} × ${num(m.edgeThickness)} mm`,
        `Edge banding ${em.color.trim()} ${mm(m.edgeWidth)} × ${num(m.edgeThickness)} mm`,
      ).replace(/\s+/g, ' '),
      qty: Math.ceil(meters * 1.1),
      unit: 'm',
      note: isRawBoard(em)
        ? tr(
            'Opcional en tablero crudo: si lo vas a pintar, los cantos se rellenan con masilla y se lijan',
            "Optional on a raw board: if you're going to paint it, fill and sand the edges instead",
          )
        : tr(`${num(meters, 1)} m justos + 10 % para recortes`, `${num(meters, 1)} m exact + 10 % for offcuts`),
      defaultOn: !isRawBoard(em),
      optional: isRawBoard(em),
    });
  }
  add({
    key: 'pegado-tapacanto',
    category: 'placas',
    name: tr('Pegado de tapacanto (servicio)', 'Edge banding application (service)'),
    qty: Math.ceil(summary.edgeMeters),
    unit: 'm',
    note: tr('Si te lo pega el centro de corte', 'If the cutting shop applies it'),
    defaultOn: false,
    optional: true,
  });

  // --- Herrajes ---
  if (hinged) {
    for (const type of ['recta', 'codo9', 'codo18'] as HingeType[]) {
      add({
        key: `bisagra|${type}`,
        category: 'herrajes',
        name: tr(`Bisagra cazoleta 35 mm ${HINGE_LABEL[type]}`, `35 mm concealed hinge, ${HINGE_LABEL[type]}`),
        qty: result.doors.hingeCounts[type],
        unit: 'u',
        note: tr('Con base (calzo). Mejor de cierre suave.', 'With mounting plate. Soft-close is best.'),
        defaultOn: true,
      });
    }
    add({
      key: 'tirador',
      category: 'herrajes',
      name: tr('Tirador para puerta', 'Door handle'),
      qty: doors.length,
      unit: 'u',
      note: tr('Con sus tornillos', 'With screws'),
      defaultOn: true,
    });
    add({
      key: 'amortiguador',
      category: 'herrajes',
      name: tr('Amortiguador de cierre para puerta', 'Soft-close damper for doors'),
      qty: doors.length,
      unit: 'u',
      note: tr('Solo si las bisagras no son de cierre suave', "Only if the hinges aren't soft-close"),
      defaultOn: false,
      optional: true,
    });
  }
  if (sliding) {
    const sets = Math.max(1, result.doors.trackSets);
    const meters = (Math.round(result.doors.trackLength) * sets) / 1000;
    const trackNote = tr(
      `${sets} ${sets === 1 ? 'tramo' : 'tramos'} de ${mm(result.doors.trackLength)} mm${sets > 1 ? ' (abajo y en el maletero)' : ''}. Se vende en tiras de 2 o 3 m.`,
      `${sets} ${sets === 1 ? 'length' : 'lengths'} of ${mm(result.doors.trackLength)} mm${sets > 1 ? ' (main section and top storage)' : ''}. Sold in 2 or 3 m lengths.`,
    );
    add({
      key: 'riel-superior',
      category: 'herrajes',
      name: tr('Riel superior doble para corredizas', 'Double top track for sliding doors'),
      qty: meters,
      unit: 'm',
      note: trackNote,
      defaultOn: true,
    });
    add({
      key: 'riel-inferior',
      category: 'herrajes',
      name: tr('Riel inferior doble para corredizas', 'Double bottom track for sliding doors'),
      qty: meters,
      unit: 'm',
      note: trackNote,
      defaultOn: true,
    });
    add({
      key: 'ruedas-corrediza',
      category: 'herrajes',
      name: tr('Juego de ruedas y guías para puerta corrediza', 'Wheel and guide set for sliding doors'),
      qty: doors.length,
      unit: 'juego',
      note: tr('Uno por hoja. Muchos kits traen rieles y ruedas juntos.', 'One per door panel. Many kits include tracks and wheels together.'),
      defaultOn: true,
    });
    add({
      key: 'tirador-embutido',
      category: 'herrajes',
      name: tr('Tirador embutido (uñero) para corrediza', 'Recessed finger pull for sliding doors'),
      qty: doors.length,
      unit: 'u',
      note: tr('Embutido para que las hojas pasen una delante de otra', 'Recessed so the panels can slide past each other'),
      defaultOn: true,
    });
    add({
      key: 'tope-corrediza',
      category: 'herrajes',
      name: tr('Topes para riel', 'Track stops'),
      qty: 2,
      unit: 'u',
      note: tr('Si el kit no los trae', "If the kit doesn't include them"),
      defaultOn: false,
      optional: true,
    });
  }
  if (barLengths.length) {
    const lengths = new Map<number, number>();
    for (const l of barLengths) lengths.set(l, (lengths.get(l) ?? 0) + 1);
    add({
      key: 'barral',
      category: 'herrajes',
      name: tr('Barra ovalada cromada', 'Chrome oval rod'),
      qty: Math.round(barLengths.reduce((m, l) => m + l, 0)) / 1000,
      unit: 'm',
      note: tr(
        `Cortada en ${[...lengths.entries()].map(([l, q]) => `${q} de ${mm(l)} mm`).join(', ')}`,
        `Cut into ${[...lengths.entries()].map(([l, q]) => `${q} × ${mm(l)} mm`).join(', ')}`,
      ),
      defaultOn: true,
    });
    add({
      key: 'soporte-barral',
      category: 'herrajes',
      name: tr('Soportes de barra', 'Rod supports'),
      qty: rodSupports,
      unit: 'u',
      note: shoeBars.length
        ? tr(
            'Dos por barra de colgar (y por barra de zapatero), más uno central en las de más de 1 m',
            'Two per hanging rod (and per shoe bar), plus one in the middle on rods over 1 m',
          )
        : tr('Dos por barra, más uno central en las de más de 1 m', 'Two per rod, plus one in the middle on rods over 1 m'),
      defaultOn: true,
    });
  }
  const slideCounts = new Map<number, number>();
  for (const d of drawers) slideCounts.set(d.slide, (slideCounts.get(d.slide) ?? 0) + d.count);
  for (const [length, qty] of [...slideCounts.entries()].sort((a, b) => a[0] - b[0])) {
    add({
      key: `corredera|${length}`,
      category: 'herrajes',
      name: tr(`Correderas telescópicas de ${length} mm`, `${length} mm full-extension drawer slides`),
      qty,
      unit: 'juego',
      note: tr('Un par por cajón. Mejor con cierre suave.', 'One pair per drawer. Soft-close is best.'),
      defaultOn: true,
    });
  }
  add({
    key: 'tirador-cajon',
    category: 'herrajes',
    name: tr('Tirador para cajón', 'Drawer handle'),
    qty: drawerCount,
    unit: 'u',
    note: tr('Con sus tornillos', 'With screws'),
    defaultOn: true,
  });
  add({
    key: 'perno-estante',
    category: 'herrajes',
    name: tr('Soportes para estante (pernos de 5 mm)', 'Shelf supports (5 mm pins)'),
    qty: result.counts.shelfPins,
    unit: 'u',
    note: tr('4 por estante móvil', '4 per adjustable shelf'),
    defaultOn: true,
  });
  add({
    key: 'escuadra-pared',
    category: 'herrajes',
    name: tr('Escuadras para fijar a la pared', 'Angle brackets for wall fixing'),
    qty: 2,
    unit: 'u',
    note: tall ? tr('Evitan que el mueble se vuelque', 'Keep the unit from tipping over') : tr('Para asegurarlo o colgarlo', 'To secure or hang it'),
    defaultOn: tall,
    optional: !tall,
  });
  if (!unit.plinth.enabled) {
    add({
      key: 'regaton',
      category: 'herrajes',
      name: tr('Patas niveladoras o protectores de base', 'Leveling feet or furniture glides'),
      qty: result.size.width > 1200 ? 6 : 4,
      unit: 'u',
      note: tr('Protegen la base y nivelan el mueble', 'Protect the base and level the unit'),
      defaultOn: true,
    });
  }

  // --- Tornillos y fijaciones ---
  const c = result.counts;
  add({
    key: 'tornillo-4x50',
    category: 'fijaciones',
    name: tr('Tornillos para aglomerado 4 × 50 mm', 'Particleboard screws 4 × 50 mm'),
    qty: c.screws,
    unit: 'u',
    note: tr(
      `${c.screwsPerJoint} por unión, con agujero guía. También sirven tornillos confirmat 7 × 50.`,
      `${c.screwsPerJoint} per joint, with a pilot hole. Confirmat 7 × 50 screws also work.`,
    ),
    defaultOn: true,
  });
  const hingeScrews = Object.values(result.doors.hingeCounts).reduce((s, v) => s + v, 0) * 4;
  const trackScrews = sliding ? 2 * Math.max(1, result.doors.trackSets) * (Math.ceil(result.doors.trackLength / 150) + 1) : 0;
  const slideScrews = drawerCount * 12;
  const supportScrews = rodSupports * 3;
  add({
    key: 'tornillo-3.5x16',
    category: 'fijaciones',
    name: tr('Tornillos 3,5 × 16 mm', 'Screws 3.5 × 16 mm'),
    qty: hingeScrews + trackScrews + slideScrews + supportScrews,
    unit: 'u',
    note: [
      hingeScrews ? tr('4 por bisagra', '4 per hinge') : '',
      trackScrews ? tr('rieles cada 15 cm', 'tracks every 15 cm') : '',
      slideScrews ? tr('12 por par de correderas', '12 per pair of slides') : '',
      supportScrews ? tr('3 por soporte de barra', '3 per rod support') : '',
    ]
      .filter(Boolean)
      .join(', '),
    defaultOn: true,
  });
  add({
    key: 'tornillo-4x30',
    category: 'fijaciones',
    name: tr('Tornillos 4 × 30 mm', 'Screws 4 × 30 mm'),
    qty: drawerCount * 4 + topes * 3,
    unit: 'u',
    note: [
      drawerCount ? tr('Frentes de cajón desde adentro, 4 por cajón', 'Drawer fronts from the inside, 4 per drawer') : '',
      topes ? tr('topes del zapatero, 3 por tope', 'shoe stops, 3 per stop') : '',
    ]
      .filter(Boolean)
      .join('; '),
    defaultOn: true,
  });
  add({
    key: 'clavo-fondo',
    category: 'fijaciones',
    name: drawerCount
      ? tr('Clavos de 1" o grapas para fondos', '1" nails or staples for back panels and drawer bottoms')
      : tr('Clavos de 1" o grapas para el fondo', '1" nails or staples for the back panel'),
    qty: c.backNails,
    unit: 'u',
    note: drawerCount
      ? tr('Fondo del mueble cada 15 cm y fondos de cajón cada 10 cm', 'Unit back panel every 15 cm and drawer bottoms every 10 cm')
      : tr('Cada 15 cm en el borde, sobre estantes fijos y divisores', 'Every 15 cm along the edge, over fixed shelves and dividers'),
    defaultOn: true,
  });
  add({
    key: `tapatornillo|${color.toLowerCase()}`,
    category: 'fijaciones',
    name: tr(`Tapatornillos adhesivos ${color}`, `Adhesive screw caps ${color}`).trim(),
    qty: c.visibleScrews,
    unit: 'u',
    note: tr('Para las cabezas que quedan a la vista', 'For screw heads left in view'),
    defaultOn: true,
  });
  add({
    key: 'taco-pared',
    category: 'fijaciones',
    name: tr('Tacos de 8 mm y tornillos para pared', '8 mm wall plugs and screws'),
    qty: 4,
    unit: 'u',
    note: tr('Para las escuadras', 'For the angle brackets'),
    defaultOn: tall,
    optional: !tall,
  });
  add({
    key: 'tarugo-madera',
    category: 'fijaciones',
    name: tr('Espigas de madera 8 × 30 mm', 'Wooden dowels 8 × 30 mm'),
    qty: c.joints * 2,
    unit: 'u',
    note: tr('Opcional: uniones más firmes, con cola', 'Optional: stronger joints, with glue'),
    defaultOn: false,
    optional: true,
  });
  add({
    key: 'minifix',
    category: 'fijaciones',
    name: tr('Minifix (excéntrica + perno)', 'Minifix (cam + bolt)'),
    qty: c.joints * 2,
    unit: 'u',
    note: tr('Opcional: uniones desarmables y sin tornillos a la vista', 'Optional: knock-down joints with no visible screws'),
    defaultOn: false,
    optional: true,
  });

  if (unit.niche.enabled) {
    add({
      key: 'tapajunta',
      category: 'insumos',
      name: tr('Tapajuntas o moldura de terminación', 'Trim strip or finishing molding'),
      qty: Math.ceil((2 * result.size.height + result.size.width) / 100) / 10,
      unit: 'm',
      note: tr('Para tapar la separación entre el mueble y la pared', 'To cover the gap between the unit and the wall'),
      defaultOn: false,
      optional: true,
    });
  }

  // --- Insumos ---
  add({
    key: 'cola-vinilica',
    category: 'insumos',
    name: tr('Cola blanca para carpintería', 'Wood glue'),
    qty: 1,
    unit: 'u',
    note:
      unit.back.mode === 'ranurado'
        ? tr('Para la ranura del fondo y las espigas', 'For the back panel groove and the dowels')
        : tr('Para espigas o refuerzos', 'For dowels or reinforcement'),
    defaultOn: unit.back.mode === 'ranurado',
    optional: unit.back.mode !== 'ranurado',
  });
  const extra = (key: string, name: string, note: string, qty = 1) => add({ key, category: 'insumos', name, qty, unit: 'u', note, defaultOn: false, optional: true });
  extra('cola-contacto', tr('Cola de contacto', 'Contact cement'), tr('Si pegas tapacanto común a mano', 'If you apply plain edge banding by hand'));
  extra(
    'cinta-papel',
    tr('Cinta de enmascarar', 'Masking tape'),
    tr('Para marcar sin rayar y evitar astillas al cortar', 'To mark without scratching and to avoid chipping when cutting'),
  );
  extra('lija-180', tr('Lija fina grano 180', 'Fine sandpaper, 180 grit'), tr('Para repasar los cantos del tapacanto', 'To smooth the edge banding'), 2);

  // --- Herramientas ---
  const tool = (key: string, name: string, note: string, qty = 1, unitName: ShoppingUnit = 'u') =>
    add({ key, category: 'herramientas', name, qty, unit: unitName, note, defaultOn: false, optional: true });
  if (hinged) tool('mecha-cazoleta', tr('Broca Forstner de 35 mm', '35 mm Forstner bit'), tr('Para la cazoleta de las bisagras', 'For the hinge cups'));
  tool(
    'mechas-guia',
    tr('Brocas de 3 y 4 mm + avellanador', '3 and 4 mm drill bits + countersink'),
    tr('Agujeros guía para que no se abra el aglomerado', "Pilot holes so the particleboard doesn't split"),
    1,
    'juego',
  );
  if (c.shelfPins > 0) {
    tool(
      'plantilla-pernos',
      tr('Broca de 5 mm con tope + plantilla para pernos', '5 mm drill bit with depth stop + shelf pin jig'),
      tr('Para los agujeros de los estantes móviles', 'For the adjustable shelf holes'),
    );
  }
  tool('refilador-tapacanto', tr('Refilador de tapacanto', 'Edge banding trimmer'), tr('Si pegas el tapacanto tú mismo', 'If you apply the edge banding yourself'));
  tool('sargentos', tr('Prensas tipo sargento', 'Bar clamps'), tr('Para sostener las piezas al atornillar', 'To hold the pieces while you screw them'), 2);
  tool('escuadra-carpintero', tr('Escuadra de carpintero', "Carpenter's square"), tr('Para comprobar que todo quede a 90°', 'To check that everything is at 90°'));

  return items;
}

export function isChecked(unit: ShelfUnit, item: ShoppingItem): boolean {
  return unit.shopping[item.key] ?? item.defaultOn;
}

export function formatQty(qty: number, unit: ShoppingUnit): string {
  switch (unit) {
    case 'placa':
      return qty === 1 ? tr(`${qty} tablero`, `${qty} board`) : tr(`${qty} tableros`, `${qty} boards`);
    case 'm':
      return `${num(qty)} m`;
    case 'juego':
      return qty === 1 ? tr(`${qty} juego`, `${qty} set`) : tr(`${qty} juegos`, `${qty} sets`);
    default:
      return tr(`${qty} u.`, `${qty} pcs`);
  }
}

export function unitLabel(unit: ShoppingUnit): string {
  if (unit === 'placa') return tr('tablero', 'board');
  if (unit === 'm') return tr('metro', 'meter');
  if (unit === 'juego') return tr('juego', 'set');
  return tr('unidad', 'unit');
}

export interface ShoppingTotals {
  total: number;
  checked: number;
  missingPrice: number;
  byCategory: Record<ShoppingCategory, number>;
}

export function shoppingTotals(unit: ShelfUnit, items: ShoppingItem[], prices: PriceList): ShoppingTotals {
  const byCategory: Record<ShoppingCategory, number> = { placas: 0, herrajes: 0, fijaciones: 0, insumos: 0, herramientas: 0 };
  let checked = 0;
  let missingPrice = 0;
  for (const it of items) {
    if (!isChecked(unit, it)) continue;
    checked += 1;
    const price = prices[it.key];
    if (price > 0) byCategory[it.category] += price * it.qty;
    else missingPrice += 1;
  }
  return { total: Object.values(byCategory).reduce((s, v) => s + v, 0), checked, missingPrice, byCategory };
}

/** Lista para mandar por WhatsApp: solo lo marcado, agrupado por rubro. */
export function shoppingText(unit: ShelfUnit, items: ShoppingItem[], prices: PriceList): string {
  const lines = [tr(`*Lista de compras: ${unit.name}*`, `*Shopping list: ${unit.name}*`)];
  for (const cat of CATEGORIES) {
    const list = items.filter((it) => it.category === cat.key && isChecked(unit, it));
    if (!list.length) continue;
    lines.push('', `_${cat.label}_`);
    for (const it of list) {
      const price = prices[it.key];
      lines.push(`• ${formatQty(it.qty, it.unit)} · ${it.name}${price > 0 ? ` (${money(price * it.qty)})` : ''}`);
    }
  }
  const totals = shoppingTotals(unit, items, prices);
  if (totals.total > 0) {
    const missing = totals.missingPrice;
    lines.push(
      '',
      tr(
        `Total estimado: ${money(totals.total)}${missing ? ` (faltan precios de ${missing} ${missing === 1 ? 'ítem' : 'ítems'})` : ''}`,
        `Estimated total: ${money(totals.total)}${missing ? ` (${missing} ${missing === 1 ? 'item' : 'items'} without a price)` : ''}`,
      ),
    );
  }
  return lines.join('\n');
}
