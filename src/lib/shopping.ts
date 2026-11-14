import type { Summary } from './cutlist';
import { HINGE_LABEL } from './doors';
import { mm, money, num } from './format';
import type { HingeType, Material, ShelfUnit, ShelfUnitResult } from './types';

export type ShoppingCategory = 'placas' | 'herrajes' | 'fijaciones' | 'insumos' | 'herramientas';

export const CATEGORIES: { key: ShoppingCategory; label: string; hint?: string }[] = [
  { key: 'placas', label: 'Placas y cortes' },
  { key: 'herrajes', label: 'Herrajes' },
  { key: 'fijaciones', label: 'Tornillos y fijaciones' },
  { key: 'insumos', label: 'Insumos' },
  { key: 'herramientas', label: 'Herramientas', hint: 'Solo si no las tenés' },
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

export const boardKey = (m: Material) => `placa-melamina|${m.color.trim().toLowerCase()}|${m.thickness}|${m.boardLength}x${m.boardWidth}`;
export const backBoardKey = (m: Material) => `placa-fondo|${m.backThickness}|${m.backBoardLength}x${m.backBoardWidth}`;
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
  const tall = unit.height > 1200;
  const color = m.color.trim();

  // --- Placas y cortes ---
  const boards = summary.melamina.pack.sheets.length;
  const backBoards = summary.fondo?.pack.sheets.length ?? 0;
  add({
    key: boardKey(m),
    category: 'placas',
    name: `Placa de melamina ${color} ${mm(m.thickness)} mm`.replace(/\s+/g, ' '),
    qty: boards,
    unit: 'placa',
    note: `${summary.melamina.boardLabel} · aprovechamiento ${Math.round(summary.melamina.pack.efficiency * 100)} %`,
    defaultOn: true,
  });
  if (summary.fondo) {
    add({
      key: backBoardKey(m),
      category: 'placas',
      name: `Placa de fondo ${mm(m.backThickness)} mm (fibrofácil)`,
      qty: backBoards,
      unit: 'placa',
      note: summary.fondo.boardLabel,
      defaultOn: true,
    });
  }
  add({
    key: CUT_KEY,
    category: 'placas',
    name: 'Servicio de corte en seccionadora',
    qty: boards + backBoards,
    unit: 'placa',
    note: 'Pedilo con la lista de cortes de la pestaña Despiece',
    defaultOn: true,
  });
  add({
    key: edgeKey(m),
    category: 'placas',
    name: `Tapacanto ${color} ${mm(m.edgeWidth)} × ${num(m.edgeThickness)} mm`.replace(/\s+/g, ' '),
    qty: summary.edgeToBuy,
    unit: 'm',
    note: `${num(summary.edgeMeters, 1)} m justos + 10 % para recortes`,
    defaultOn: true,
  });
  add({
    key: 'pegado-tapacanto',
    category: 'placas',
    name: 'Pegado de tapacanto (servicio)',
    qty: Math.ceil(summary.edgeMeters),
    unit: 'm',
    note: 'Si te lo pega el aserradero',
    defaultOn: false,
    optional: true,
  });

  // --- Herrajes ---
  if (hinged) {
    for (const type of ['recta', 'codo9', 'codo18'] as HingeType[]) {
      add({
        key: `bisagra|${type}`,
        category: 'herrajes',
        name: `Bisagra cazoleta 35 mm ${HINGE_LABEL[type]}`,
        qty: result.doors.hingeCounts[type],
        unit: 'u',
        note: 'Con base (calzo). Mejor de cierre suave.',
        defaultOn: true,
      });
    }
    add({
      key: 'tirador',
      category: 'herrajes',
      name: 'Tirador para puerta',
      qty: doors.length,
      unit: 'u',
      note: 'Con sus tornillos',
      defaultOn: true,
    });
    add({
      key: 'amortiguador',
      category: 'herrajes',
      name: 'Amortiguador de cierre para puerta',
      qty: doors.length,
      unit: 'u',
      note: 'Solo si las bisagras no son de cierre suave',
      defaultOn: false,
      optional: true,
    });
  }
  if (sliding) {
    const meters = Math.round(result.doors.trackLength) / 1000;
    const trackNote = `1 tramo de ${mm(result.doors.trackLength)} mm (se vende en tiras de 2 o 3 m)`;
    add({ key: 'riel-superior', category: 'herrajes', name: 'Riel superior doble para corredizas', qty: meters, unit: 'm', note: trackNote, defaultOn: true });
    add({ key: 'riel-inferior', category: 'herrajes', name: 'Riel inferior doble para corredizas', qty: meters, unit: 'm', note: trackNote, defaultOn: true });
    add({
      key: 'ruedas-corrediza',
      category: 'herrajes',
      name: 'Juego de ruedas y guías para puerta corrediza',
      qty: doors.length,
      unit: 'juego',
      note: 'Uno por hoja. Muchos kits traen rieles y ruedas juntos.',
      defaultOn: true,
    });
    add({
      key: 'tirador-embutido',
      category: 'herrajes',
      name: 'Tirador embutido (uñero) para corrediza',
      qty: doors.length,
      unit: 'u',
      note: 'Embutido para que las hojas pasen una delante de otra',
      defaultOn: true,
    });
    add({ key: 'tope-corrediza', category: 'herrajes', name: 'Topes para riel', qty: 2, unit: 'u', note: 'Si el kit no los trae', defaultOn: false, optional: true });
  }
  add({
    key: 'perno-estante',
    category: 'herrajes',
    name: 'Soportes para estante (pernos de 5 mm)',
    qty: result.counts.shelfPins,
    unit: 'u',
    note: '4 por estante móvil',
    defaultOn: true,
  });
  add({
    key: 'escuadra-pared',
    category: 'herrajes',
    name: 'Escuadras para fijar a la pared',
    qty: 2,
    unit: 'u',
    note: tall ? 'Evitan que el mueble vuelque' : 'Para asegurarlo o colgarlo',
    defaultOn: tall,
    optional: !tall,
  });
  if (!unit.plinth.enabled) {
    add({
      key: 'regaton',
      category: 'herrajes',
      name: 'Regatones o patas niveladoras',
      qty: unit.width > 1200 ? 6 : 4,
      unit: 'u',
      note: 'Protegen la base y nivelan el mueble',
      defaultOn: true,
    });
  }

  // --- Tornillos y fijaciones ---
  const c = result.counts;
  add({
    key: 'tornillo-4x50',
    category: 'fijaciones',
    name: 'Tornillos para aglomerado 4 × 50 mm',
    qty: c.screws,
    unit: 'u',
    note: `${c.screwsPerJoint} por unión, con agujero guía. También sirven confirmat 7 × 50.`,
    defaultOn: true,
  });
  const hingeScrews = Object.values(result.doors.hingeCounts).reduce((s, v) => s + v, 0) * 4;
  const trackScrews = sliding ? 2 * (Math.ceil(result.doors.trackLength / 150) + 1) : 0;
  add({
    key: 'tornillo-3.5x16',
    category: 'fijaciones',
    name: 'Tornillos 3,5 × 16 mm',
    qty: hingeScrews + trackScrews,
    unit: 'u',
    note: [hingeScrews ? '4 por bisagra' : '', trackScrews ? 'rieles cada 15 cm' : ''].filter(Boolean).join(', '),
    defaultOn: true,
  });
  add({
    key: 'clavo-fondo',
    category: 'fijaciones',
    name: 'Clavos de 1" o grapas para el fondo',
    qty: c.backNails,
    unit: 'u',
    note: 'Cada 15 cm en el borde, sobre estantes fijos y divisores',
    defaultOn: true,
  });
  add({
    key: `tapatornillo|${color.toLowerCase()}`,
    category: 'fijaciones',
    name: `Tapatornillos adhesivos ${color}`.trim(),
    qty: c.visibleScrews,
    unit: 'u',
    note: 'Para las cabezas que quedan a la vista',
    defaultOn: true,
  });
  add({
    key: 'taco-pared',
    category: 'fijaciones',
    name: 'Tarugos de 8 mm y tornillos para pared',
    qty: 4,
    unit: 'u',
    note: 'Para las escuadras',
    defaultOn: tall,
    optional: !tall,
  });
  add({
    key: 'tarugo-madera',
    category: 'fijaciones',
    name: 'Tarugos de madera 8 × 30 mm',
    qty: c.joints * 2,
    unit: 'u',
    note: 'Opcional: uniones más firmes, con cola',
    defaultOn: false,
    optional: true,
  });
  add({
    key: 'minifix',
    category: 'fijaciones',
    name: 'Minifix (excéntrica + perno)',
    qty: c.joints * 2,
    unit: 'u',
    note: 'Opcional: uniones desarmables y sin tornillos a la vista',
    defaultOn: false,
    optional: true,
  });

  // --- Insumos ---
  add({
    key: 'cola-vinilica',
    category: 'insumos',
    name: 'Cola vinílica para carpintería',
    qty: 1,
    unit: 'u',
    note: unit.back.mode === 'ranurado' ? 'Para la ranura del fondo y los tarugos' : 'Para tarugos o refuerzos',
    defaultOn: unit.back.mode === 'ranurado',
    optional: unit.back.mode !== 'ranurado',
  });
  add({ key: 'cola-contacto', category: 'insumos', name: 'Cola de contacto', qty: 1, unit: 'u', note: 'Si pegás tapacanto común a mano', defaultOn: false, optional: true });
  add({ key: 'cinta-papel', category: 'insumos', name: 'Cinta de papel', qty: 1, unit: 'u', note: 'Para marcar sin rayar y evitar astillas al cortar', defaultOn: false, optional: true });
  add({ key: 'lija-180', category: 'insumos', name: 'Lija fina grano 180', qty: 2, unit: 'u', note: 'Para repasar los cantos del tapacanto', defaultOn: false, optional: true });

  // --- Herramientas ---
  const tool = (key: string, name: string, note: string, qty = 1, unitName: ShoppingUnit = 'u') =>
    add({ key, category: 'herramientas', name, qty, unit: unitName, note, defaultOn: false, optional: true });
  if (hinged) tool('mecha-cazoleta', 'Mecha Forstner de 35 mm', 'Para la cazoleta de las bisagras');
  tool('mechas-guia', 'Mechas de 3 y 4 mm + avellanador', 'Agujeros guía para que no se abra el aglomerado', 1, 'juego');
  if (c.shelfPins > 0) tool('plantilla-pernos', 'Mecha de 5 mm con tope + plantilla para pernos', 'Para los agujeros de los estantes móviles');
  tool('refilador-tapacanto', 'Refilador de tapacanto', 'Si pegás el tapacanto vos');
  tool('sargentos', 'Prensas tipo sargento', 'Para sostener las piezas al atornillar', 2);
  tool('escuadra-carpintero', 'Escuadra de carpintero', 'Para controlar que todo quede a 90°');

  return items;
}

export function isChecked(unit: ShelfUnit, item: ShoppingItem): boolean {
  return unit.shopping[item.key] ?? item.defaultOn;
}

export function formatQty(qty: number, unit: ShoppingUnit): string {
  switch (unit) {
    case 'placa':
      return `${qty} ${qty === 1 ? 'placa' : 'placas'}`;
    case 'm':
      return `${num(qty)} m`;
    case 'juego':
      return `${qty} ${qty === 1 ? 'juego' : 'juegos'}`;
    default:
      return `${qty} u.`;
  }
}

export function unitLabel(unit: ShoppingUnit): string {
  return unit === 'placa' ? 'placa' : unit === 'm' ? 'metro' : unit === 'juego' ? 'juego' : 'unidad';
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
  const lines = [`*Lista de compras: ${unit.name}*`];
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
    lines.push('', `Total estimado: ${money(totals.total)}${totals.missingPrice ? ` (faltan precios de ${totals.missingPrice} ítems)` : ''}`);
  }
  return lines.join('\n');
}
