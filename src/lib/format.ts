const mmFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1, useGrouping: false });
const moneyFormat = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});
const decimalFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });

/** Milímetros: enteros sin decimales, si no con un decimal ("764", "763,6"). */
export function mm(value: number): string {
  return mmFormat.format(Math.round(value * 10) / 10);
}

export function money(value: number): string {
  return moneyFormat.format(value);
}

export function num(value: number, digits = 2): string {
  return digits === 2 ? decimalFormat.format(value) : value.toFixed(digits).replace('.', ',');
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
