import { DECORS, matchDecor } from './decors';
import type { BackType, BoardType } from './types';

/** Colores aproximados por palabra clave, para diseños que no están en el catálogo. */
const KEYWORDS: [RegExp, string][] = [
  [/blanc|white|nieve|polar/i, '#f1f1ee'],
  [/negr|nero|black|ebano|ébano/i, '#262626'],
  [/grafit|antracit|carbon|carbón|plomo/i, '#3d3f42'],
  [/humo|topo|taupe/i, '#8a8580'],
  [/gris|grey|gray|perla|ceniza|cenizo|cemento|concret|macad/i, '#9b9b98'],
  [/carrara|m[aá]rmol|marble/i, '#e9e8e4'],
  [/almendra|marfil|crema|vainilla|arena|beige|lino|hueso/i, '#e3d6bf'],
  [/wengu|wenge/i, '#3c2b22'],
  [/nogal|walnut|tabaco|chocolate|caf[eé]/i, '#6e4b33'],
  [/caoba|mahog/i, '#6d2f22'],
  [/cerez|cherry|cerejeira|melo|guindo/i, '#9b5b3d'],
  [/cedro|orinoco/i, '#a5653f'],
  [/teca|teak|tiza/i, '#8b6a40'],
  [/haya|beech/i, '#d6b08a'],
  [/fresno|ash|n[oó]rdic|abedul|birch|maple|arce/i, '#d9c9ab'],
  [/pino|pine/i, '#d8b680'],
  [/olmo|elm/i, '#a88b6a'],
  [/roble|oak|carvalho|kendal|vicenza|moro|nebraska|denver/i, '#c39a6b'],
  [/azul|blue|marino|petr[oó]leo/i, '#3d5a80'],
  [/verde|green|oliva|salvia/i, '#5c7a5c'],
  [/roj|red|bord[oó]/i, '#9c2f2f'],
  [/amarill|yellow|mostaza/i, '#d8b13a'],
];

export interface DecorLook {
  hex: string;
  wood: boolean;
}

/** Color aproximado de un diseño: primero el catálogo de la marca, después el nombre. */
export function decorLook(brand: string, color: string, boardType: BoardType, hasGrain: boolean): DecorLook {
  if (boardType === 'mdf') return { hex: '#b89a75', wood: false };
  if (boardType === 'aglomerado') return { hex: '#cdb289', wood: false };
  const name = color.trim().toLowerCase();
  const known = matchDecor(DECORS.filter((d) => d.brand === brand), name) ?? matchDecor(DECORS, name);
  if (known) return { hex: known.hex, wood: known.wood };
  let hex = '#d9d4cc';
  // "Roble gris" es gris; "Gris" solo, también: gana la última palabra que coincide.
  let best = -1;
  for (const [re, h] of KEYWORDS) {
    const match = re.exec(color);
    if (match && match.index >= best) {
      best = match.index;
      hex = h;
    }
  }
  if (/roble.*gris|gris.*roble/i.test(color)) hex = '#a59d92';
  return { hex, wood: hasGrain };
}

export function backLook(type: BackType): DecorLook {
  return type === 'fondo-blanco' ? { hex: '#efefec', wood: false } : { hex: '#9c7a55', wood: false };
}
