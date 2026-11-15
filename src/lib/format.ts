import { getLang, locale } from './i18n';

// Formateadores por idioma (se crean una vez por idioma).
const cache = new Map<string, { mm: Intl.NumberFormat; money: Intl.NumberFormat; decimal: Intl.NumberFormat }>();
function formats() {
  const loc = locale();
  let f = cache.get(loc);
  if (!f) {
    f = {
      mm: new Intl.NumberFormat(loc, { maximumFractionDigits: 1, useGrouping: false }),
      money: new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }),
      decimal: new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }),
    };
    cache.set(loc, f);
  }
  return f;
}

/** Milímetros: enteros sin decimales, si no con un decimal ("764", "763,6" / "763.6"). */
export function mm(value: number): string {
  return formats().mm.format(Math.round(value * 10) / 10);
}

/** Importe con signo $ (la moneda es la que use el usuario al cargar los precios). */
export function money(value: number): string {
  return `$${getLang() === 'en' ? '' : ' '}${formats().money.format(value)}`;
}

export function num(value: number, digits = 2): string {
  if (digits === 2) return formats().decimal.format(value);
  const s = value.toFixed(digits);
  return getLang() === 'en' ? s : s.replace('.', ',');
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** A, B, …, Z, AA, AB… */
export function pieceCode(index: number): string {
  let s = '';
  let i = index;
  do {
    s = String.fromCharCode(65 + (i % 26)) + s;
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return s;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
