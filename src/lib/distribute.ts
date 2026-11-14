export interface Distribution {
  values: number[];
  /** Lo que sobra (positivo) o falta (negativo) cuando no hay valores automáticos. */
  mismatch: number;
  /** Los valores fijos superan el total disponible. */
  overflow: boolean;
}

/**
 * Reparte `total` mm entre varios espacios. Los valores fijos se respetan y los `null`
 * se reparten en partes iguales, en milímetros enteros (el resto va a los primeros).
 */
export function distribute(total: number, specified: (number | null)[]): Distribution {
  const fixedSum = specified.reduce<number>((s, v) => s + (v ?? 0), 0);
  const autoIdx = specified.flatMap((v, i) => (v === null ? [i] : []));
  const remaining = total - fixedSum;
  const values = specified.map((v) => v ?? 0);

  if (autoIdx.length === 0) {
    return { values, mismatch: remaining, overflow: remaining < 0 };
  }
  if (remaining < 0) {
    return { values, mismatch: 0, overflow: true };
  }

  const base = Math.floor(remaining / autoIdx.length);
  let extra = Math.round(remaining - base * autoIdx.length);
  for (const i of autoIdx) {
    values[i] = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
  }
  // Si el total tiene decimales (p. ej. espesor 15,5), el último automático absorbe la diferencia.
  const diff = total - values.reduce((s, v) => s + v, 0);
  if (Math.abs(diff) > 1e-9) values[autoIdx[autoIdx.length - 1]] += diff;
  return { values, mismatch: 0, overflow: false };
}
