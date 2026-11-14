import { describe, expect, it } from 'vitest';
import { packPieces, type PackItem, type PackResult } from './packing';

const board = { boardLength: 2600, boardWidth: 1830, kerf: 4, trim: 10 };

function items(n: number, w: number, h: number, canRotate = false, ref = 'A'): PackItem[] {
  return Array.from({ length: n }, () => ({ ref, w, h, canRotate }));
}

/** Comprueba que ninguna pieza se superpone (contando la sierra) ni se sale de la placa útil. */
function expectValid(result: PackResult, opts = board) {
  for (const sheet of result.sheets) {
    for (const p of sheet.placements) {
      expect(p.x).toBeGreaterThanOrEqual(opts.trim);
      expect(p.y).toBeGreaterThanOrEqual(opts.trim);
      expect(p.x + p.w).toBeLessThanOrEqual(opts.boardLength - opts.trim + 1e-9);
      expect(p.y + p.h).toBeLessThanOrEqual(opts.boardWidth - opts.trim + 1e-9);
    }
    const ps = sheet.placements;
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i];
        const b = ps[j];
        const apart =
          a.x + a.w + opts.kerf <= b.x + 1e-9 ||
          b.x + b.w + opts.kerf <= a.x + 1e-9 ||
          a.y + a.h + opts.kerf <= b.y + 1e-9 ||
          b.y + b.h + opts.kerf <= a.y + 1e-9;
        expect(apart).toBe(true);
      }
    }
  }
}

describe('packPieces', () => {
  it('ubica 4 piezas que llenan la placa justo con la sierra', () => {
    // (2580 - 4) / 2 = 1288 ; (1810 - 4) / 2 = 903
    const r = packPieces(items(4, 1288, 903), board);
    expect(r.sheets).toHaveLength(1);
    expect(r.unplaced).toEqual([]);
    expectValid(r);
  });

  it('si no queda lugar para la sierra, abre otra placa', () => {
    const r = packPieces(items(4, 1289, 903), board);
    expect(r.sheets).toHaveLength(2);
    expectValid(r);
  });

  it('respeta la veta: sin giro una pieza más ancha que la placa no entra', () => {
    const r = packPieces(items(1, 1000, 2000), board);
    expect(r.sheets).toHaveLength(0);
    expect(r.unplaced).toHaveLength(1);
  });

  it('sin veta la gira para que entre', () => {
    const r = packPieces(items(1, 1000, 2000, true), board);
    expect(r.sheets).toHaveLength(1);
    expect(r.sheets[0].placements[0]).toMatchObject({ w: 2000, h: 1000, rotated: true });
  });

  it('nunca gira piezas con veta', () => {
    const list = [...items(6, 1800, 297, false, 'A'), ...items(8, 762, 297, false, 'B'), ...items(3, 764, 297, false, 'C')];
    const r = packPieces(list, board);
    for (const s of r.sheets) for (const p of s.placements) expect(p.rotated).toBe(false);
    expectValid(r);
  });

  it('ubica todas las piezas de un despiece mixto sin superponer', () => {
    const list = [
      ...items(2, 1800, 297, false, 'A'),
      ...items(2, 764, 297, false, 'B'),
      ...items(1, 764, 70, false, 'C'),
      ...items(4, 762, 297, false, 'D'),
      ...items(5, 400, 350, true, 'E'),
      ...items(3, 1200, 500, true, 'F'),
    ];
    const r = packPieces(list, board);
    const placed = r.sheets.reduce((s, sh) => s + sh.placements.length, 0);
    expect(placed).toBe(list.length);
    expectValid(r);
    const area = list.reduce((s, it) => s + it.w * it.h, 0);
    expect(r.usedArea).toBe(area);
    expect(r.efficiency).toBeCloseTo(area / (r.sheets.length * 2600 * 1830), 9);
  });

  it('usa la menor cantidad de placas posible en un caso conocido', () => {
    // 20 estantes de 800 × 300: 3 por fila (2408 mm) y 6 filas (1820 > 1810), entonces 5 filas = 15 por placa.
    const r = packPieces(items(20, 800, 300), board);
    expect(r.sheets).toHaveLength(2);
    expectValid(r);
  });
});
