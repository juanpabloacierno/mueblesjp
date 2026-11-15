import { tr } from './i18n';

/**
 * Diseños (colores) de cada marca, con un color aproximado para la vista 3D.
 * Fuentes: sitios de las marcas, lanzamientos y listados de vendedores en Argentina
 * (ver README). Los colores hex son estimaciones a partir del nombre y la descripción.
 */
export interface Decor {
  brand: string;
  line: string;
  /** Nombre como lo vende la marca (con su código si tiene). */
  name: string;
  code: string | null;
  /** Nombre con el que lo venden algunos comercios ("Cedro", "Wengue"…). */
  alias?: string;
  hex: string;
  wood: boolean;
  /** No se pudo confirmar que se venda hoy en Argentina. */
  uncertain?: boolean;
  /** Espesores en que se consigue, si se sabe (si falta: los de la línea). */
  thicknesses?: number[];
  /** Solo en esta medida de placa (largo, ancho), p. ej. la línea Táctil de Faplac. */
  size?: [number, number];
  /** Solo en este tipo de placa. */
  types?: ('melamina' | 'melamina-mdf')[];
}

const sadepan = (line: string, items: [string, string | null, string, boolean, string?, boolean?][]): Decor[] =>
  items.map(([name, code, hex, wood, alias, uncertain]) => ({ brand: 'Sadepan', line, name, code, hex, wood, alias, uncertain }));

/** Egger: el nombre lleva el código al final, como lo piden en el aserradero ("Roble Kendal Natural H3170"). */
const egger = (line: string, items: [string, string | null, string, boolean, number[]?, string?][]): Decor[] =>
  items.map(([name, code, hex, wood, thicknesses, alias]) => ({
    brand: 'Egger',
    line,
    name: code ? `${name} ${code}` : name,
    code,
    hex,
    wood,
    thicknesses: thicknesses ?? [18],
    alias,
  }));

/** Faplac: código de diseño de 3 cifras al final ("Roble Escandinavo 098"). */
const faplac = (line: string, items: [string, string | null, string, boolean, number[]?][], extra: Partial<Decor> = {}): Decor[] =>
  items.map(([name, code, hex, wood, thicknesses]) => ({
    brand: 'Faplac',
    line,
    name: code ? `${name} ${code}` : name,
    code,
    hex,
    wood,
    thicknesses: thicknesses ?? [18],
    ...extra,
  }));

export const DECORS: Decor[] = [
  ...faplac('Lisos', [
    ['Blanco Tundra', '135', '#f2f2ef', false, [15, 18, 25]],
    ['Almendra', '180', '#e2d5bd', false],
    ['Ceniza', '105', '#c8c6c1', false],
    ['Litio', '205', '#d0cdc6', false],
    ['Aluminio', '202', '#b3b5b6', false],
    ['Gris Humo', '108', '#8a8b8c', false],
    ['Grafito', '107', '#3b3d40', false],
    ['Azul Lago', '170', '#3e5d7c', false],
    ['Negro Profundo', '303', '#1b1b1c', false],
  ]),
  ...faplac('Nature', [
    ['Blanco Nature', '135', '#f0efea', false],
    ['Mont Blanc', '072', '#d2c6b2', true],
    ['Gaudí', '027', '#c9b598', true],
    ['Teka Artico', '047', '#c4b8a5', true],
    ['Venezia', '160', '#9d8a73', true],
    ['Carvalho Mezzo', '042', '#b48c60', true],
    ['Cajú', '065', '#a47a52', true],
    ['Nocce Milano', '041', '#6e4c35', true],
    ['Nogal Terracota', '046', '#7b4b33', true],
  ]),
  ...faplac('Nórdica', [
    ['Helsinki', '089', '#dcd2c2', true],
    ['Roble Escandinavo', '098', '#cbad85', true],
    ['Olmo Finlandés', '096', '#c4a47e', true],
    ['Báltico', '097', '#a29888', true],
  ]),
  ...faplac('Maderas clásicas', [
    ['Roble Americano', '030', '#ba8b5b', true],
    ['Roble Dakar', '031', '#8a5d3c', true],
    ['Cedro', '064', '#9a5a3d', true],
    ['Ébano Negro', '016', '#2f2521', true],
  ]),
  ...faplac('Hilados', [
    ['Lino Blanco', '135', '#ebeae5', false],
    ['Lino Chiaro', '153', '#d6ccbb', false],
    ['Seda Giorno', '150', '#cdc6b8', false],
    ['Seda Notte', '151', '#4e4a46', false],
    ['Lino Negro', '303', '#2a2a2b', false],
  ]),
  ...faplac('Mesopotamia', [
    ['Kiri', '219', '#dccab0', true],
    ['Paraíso', '218', '#9b6345', true],
    ['Petiribí', '225', '#a87b50', true],
    ['Yute', '224', '#c3ae8d', false],
    ['Gris Caliza', '215', '#c9c7c1', false],
    ['Gris Basalto', '214', '#7e8082', false],
    ['Gris Tapir', '216', '#5f5b57', false],
    ['Jade', '217', '#9fb6a3', false],
    ['Amatista', '213', '#a99cba', false],
    ['Terracota', '223', '#b5593b', false],
  ]),
  ...faplac('Imperial', [
    ['Beige Imperial', '233', '#d8c7ad', false],
    ['Sándalo', '228', '#c3a481', true],
    ['Castaño', '229', '#8b5f3f', true],
    ['Bordeaux', '231', '#6b2e32', true],
    ['Travertino', '232', '#d5c6ad', false],
    ['Kisa', null, '#c9c8c4', false],
  ]),
  ...faplac('Blend', [
    ['Amaranto', '143', '#cdb28c', true],
    ['Camellia', '140', '#c8a47c', true],
    ['Scotch', '142', '#9b6b42', true],
    ['Merlot', '141', '#5a3a2c', true],
    ['Pinot Gris', '120', '#8e8690', true],
    ['Sauco', '212', '#b39b7c', true],
  ]),
  ...faplac('Étnica', [
    ['Everest', '116', '#f3f2ee', false],
    ['Sahara', '112', '#d3bd97', false],
    ['Himalaya', '113', '#d8b6ae', false],
    ['Tribal', '111', '#8a6a50', false],
    ['Safari', '115', '#5c634f', false],
    ['Tuareg', '114', '#2c3a52', false],
  ]),
  ...faplac('Urban Concept', [
    ['Home', '025', '#d2cdc4', false],
    ['Viena', '026', '#a69e93', false],
    ['Street', null, '#6f6c68', false],
    ['Coliseo', '119', '#aaa194', false],
    ['Praga', '028', '#8d7b67', true],
    ['Amberes', '058', '#2a2a2c', false],
  ]),
  ...faplac(
    'Táctil (placa de 2750 × 1300)',
    [
      ['White Extreme Gloss', '944', '#f5f5f3', false],
      ['Grey Extreme Matt', null, '#6c6d6f', false],
      ['Black Extreme Matt', null, '#1d1d1e', false],
    ],
    { size: [2750, 1300], types: ['melamina-mdf'] },
  ),
  ...egger('Blancos y negros', [
    ['Blanco', 'W954', '#efefeb', false, [15, 18], 'Absolut Blanco'],
    ['Negro', 'U999', '#2a2a2a', false, [15, 18]],
  ]),
  ...egger('Unicolores', [
    ['Gris Perla', 'U763', '#c4c3bd', false],
    ['Gris Cachemira', 'U702', '#b5ada1', false],
    ['Gris Arcilla', 'U727', '#8e8a82', false],
    ['Gris Macadán', 'U732', '#6e6f6c', false],
    ['Gris Cubanita', 'U767', '#67635e', false],
    ['Gris Sombra', 'U963', '#58595a', false, [15, 18]],
    ['Azul Cósmico', 'U504', '#3d5874', false],
    ['Naranja de Siena', 'U350', '#c5643a', false],
    ['Rojo Cereza', 'U323', '#9c2b2b', false],
    ['Amarillo Girasol', 'U114', '#f0c02f', false],
  ]),
  ...egger('Maderas', [
    ['Roble Nebraska Natural', 'H3331', '#a8865c', true],
    ['Roble Nebraska Gris', 'H3332', '#8e8478', true],
    ['Roble Denver Marrón Trufa', 'H1399', '#5b4636', true, undefined, 'Roble Den Marrón'],
    ['Roble Denver Grafito', 'H1387', '#4e4945', true],
    ['Roble Davos Natural', 'H3131', '#b08c62', true],
    ['Roble Davos Trufa Marrón', 'H3133', '#6a5140', true, undefined, 'Roble Davos Marrón'],
    ['Roble Kendal Natural', 'H3170', '#b38b5d', true],
    ['Roble Kendal Coñac', 'H3398', '#8b5e3b', true],
    ['Roble Vicenza Gris', 'H3158', '#b9b2a6', true],
    ['Roble Termo Negro', 'H1199', '#3b302a', true],
    ['Roble Whiteriver Gris Marrón', 'H1313', '#897d70', true, undefined, 'Roble WR Grismarrón'],
    ['Roble Norwich', 'H3003', '#b49672', true],
    ['Roble Lorenzo Arena', 'H3146', '#c2a885', true],
    ['Castaño Kentucky Arena', 'H1710', '#b7986f', true],
    ['Nogal Lincoln', 'H1714', '#7a5a43', true],
    ['Nogal Brianza', null, '#6e5241', true],
    ['Hickory Natural', 'H3730', '#b8946c', true],
    ['Pino Aland Blanco', 'H3430', '#ddd4c5', true],
    ['Pino Cascina', 'H1401', '#c8ae88', true],
    ['Coco Bolo', 'H3012', '#7a4a32', true],
    ['Fineline Crema', 'H1424', '#dcd1bc', true, [15, 18]],
    ['Fineline Marrón Metalizado', null, '#5c4b3f', true],
  ]),
  ...egger('Materiales (textiles, piedras y metálicos)', [
    ['Chromix Blanco', 'F637', '#dcdcd8', false],
    ['Chromix Plata', 'F638', '#a7a9a8', false],
    ['Textil Beige', 'F416', '#c3b59f', false],
    ['Textil Gris', 'F417', '#8a8885', false],
    ['Lino Topo', 'F424', '#8a7d70', false],
    ['Pietra Grigia', 'F206', '#3b3b3d', false, undefined, 'Mármol Negro'],
  ]),
  ...sadepan('Semplice (lisos)', [
    ['Bianco 780', '780', '#f2f2ef', false, 'Blanco'],
    ['Nero 348', '348', '#1f1f1f', false, 'Negro'],
    ['Grigio 251', '251', '#b9bab6', false, 'Gris claro'],
    ['Grigio D47', 'D47', '#c8c5bd', false, 'Gris claro'],
    ['Grigio 068', '068', '#5a5c5e', false, 'Gris oscuro'],
    ['Blu 555', '555', '#1f3a68', false, 'Azul'],
    ['Arancio WE3', 'WE3', '#e36f1e', false, 'Naranja'],
    ['Panna 499', '499', '#ece3cc', false, 'Crema', true],
  ]),
  ...sadepan('Ragazzi (lisos)', [
    ['Rosso WE1', 'WE1', '#b3262a', false, 'Rojo'],
    ['Verde Alpi 0KY', '0KY', '#4f8a3c', false, 'Verde', true],
  ]),
  ...sadepan('Piacere (maderados)', [
    ['Melo 129', '129', '#b9784a', true, 'Melo Cerezo'],
    ['Rovere 837', '837', '#a86a45', true, 'Cerejeira'],
    ['Ciliegio Europeo 563', '563', '#9a5a3c', true, 'Cedro'],
    ['Faggio 896', '896', '#d9b48a', true, 'Haya'],
    ['Teak 12D', '12D', '#a8743f', true],
    ['Rovere Foscari A98', 'A98', '#3b2a22', true, 'Wengue'],
    ['Noce Guarnieri 165', '165', '#6b4a32', true, undefined, true],
  ]),
  ...sadepan('Potenza (maderados)', [
    ['Atakama TM4', 'TM4', '#a0704a', true],
    ['Orinoco 016', '016', '#d2b07a', true],
    ['Walnut WM7', 'WM7', '#6e4b33', true],
    ['Larice Scuro D14', 'D14', '#7d7a74', true],
    ['Olmo Fidia T91', 'T91', '#5e5a55', true],
    ['Canyon Monument D18', 'D18', '#6f5e4e', true],
    ['Noce Flamenco TR5', 'TR5', '#7a5338', true],
    ['Tiger Wood DP8', 'DP8', '#9b6a3c', true],
    ['Aged Oak DV6', 'DV6', '#b8ad9c', true],
    ['Rovere Riviera D99', 'D99', '#b88a5a', true],
    ['Rovere Nodato 988', '988', '#8a6544', true],
    ['Rovere Vecchio DV4', 'DV4', '#8f7458', true, undefined, true],
  ]),
  ...sadepan('Sensazioni (maderados)', [
    ['Canyon Oak 765', '765', '#4a4440', true],
    ['Grey Oak GR4', 'GR4', '#9a958c', true],
    ['Olmo 44R', '44R', '#9b7b5c', true],
    ['Noce Antico 009', '009', '#5a3d2b', true],
    ['Rovere Chiaro 021', '021', '#d4b98f', true],
    ['Ciliegio AN5', 'AN5', '#a2603f', true],
    ['Rigoletto D9M', 'D9M', '#4a3326', true, 'Wengue'],
    ['Zebrano D1F', 'D1F', '#b89a6e', true, undefined, true],
  ]),
];

/** Líneas con nombre descriptivo (las demás son nombres comerciales y no se traducen). */
const LINE_LABELS: Record<string, [es: string, en: string]> = {
  Lisos: ['Lisos', 'Solid colors'],
  'Maderas clásicas': ['Maderas clásicas', 'Classic woods'],
  Hilados: ['Hilados', 'Textile look'],
  'Táctil (placa de 2750 × 1300)': ['Táctil (tablero de 2750 × 1300)', 'Táctil (2750 × 1300 board)'],
  'Blancos y negros': ['Blancos y negros', 'Whites and blacks'],
  Unicolores: ['Unicolores', 'Solid colors'],
  Maderas: ['Maderas', 'Woods'],
  'Materiales (textiles, piedras y metálicos)': ['Materiales (textiles, piedras y metálicos)', 'Materials (textiles, stones and metallics)'],
  'Semplice (lisos)': ['Semplice (lisos)', 'Semplice (solid colors)'],
  'Ragazzi (lisos)': ['Ragazzi (lisos)', 'Ragazzi (solid colors)'],
  'Piacere (maderados)': ['Piacere (maderas)', 'Piacere (woods)'],
  'Potenza (maderados)': ['Potenza (maderas)', 'Potenza (woods)'],
  'Sensazioni (maderados)': ['Sensazioni (maderas)', 'Sensazioni (woods)'],
};

/** Nombre de una línea de diseños para mostrar, en el idioma activo. */
export function lineLabel(line: string): string {
  const l = LINE_LABELS[line];
  return l ? tr(...l) : line;
}

export function decorsFor(brand: string): Decor[] {
  return DECORS.filter((d) => d.brand === brand);
}

/** Diseños que se consiguen en esta placa: marca, tipo y medida. */
export function decorsForBoard(brand: string, type: string, length: number, width: number): Decor[] {
  const all = decorsFor(brand).filter((d) => !d.types || d.types.includes(type as 'melamina'));
  const special = all.some((d) => d.size && d.size[0] === length && d.size[1] === width);
  return all.filter((d) => (special ? d.size && d.size[0] === length && d.size[1] === width : !d.size));
}

/** Busca un diseño por nombre completo, por nombre sin código o por el nombre de los comercios. */
export function matchDecor(list: Decor[], color: string): Decor | undefined {
  const c = color.trim().toLowerCase();
  if (!c) return undefined;
  const plain = (d: Decor) => (d.code ? d.name.replace(new RegExp(`\\s*${d.code}$`), '') : d.name).toLowerCase();
  return list.find((d) => d.name.toLowerCase() === c) ?? list.find((d) => plain(d) === c) ?? list.find((d) => d.alias?.toLowerCase() === c);
}
