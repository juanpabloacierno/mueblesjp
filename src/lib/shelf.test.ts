import { describe, expect, it } from 'vitest';
import { PRESETS, column, createFromPreset } from './defaults';
import { computeShelfUnit, splitBack } from './shelf';
import { cutSize, summarize } from './cutlist';
import type { ShelfUnit } from './types';

function preset(key: string): ShelfUnit {
  return createFromPreset(PRESETS.find((p) => p.key === key)!);
}

function piece(r: ReturnType<typeof computeShelfUnit>, name: string) {
  const p = r.pieces.find((x) => x.name === name);
  if (!p) throw new Error(`No existe la pieza ${name}`);
  return p;
}

describe('biblioteca 800 × 1800 × 300, laterales enteros, zócalo y fondo clavado', () => {
  const unit = preset('biblioteca');
  const r = computeShelfUnit(unit);

  it('no tiene errores', () => {
    expect(r.warnings.filter((w) => w.level === 'error')).toEqual([]);
  });

  it('calcula los laterales con la profundidad menos el fondo', () => {
    const p = piece(r, 'Lateral');
    expect(p).toMatchObject({ qty: 2, length: 1800, width: 297, edges: { long: 1, short: 1 } });
  });

  it('techo, piso y zócalo van entre laterales', () => {
    expect(piece(r, 'Techo')).toMatchObject({ qty: 1, length: 764, width: 297 });
    expect(piece(r, 'Piso')).toMatchObject({ qty: 1, length: 764, width: 297 });
    expect(piece(r, 'Zócalo')).toMatchObject({ qty: 1, length: 764, width: 70, edges: { long: 0, short: 0 } });
  });

  it('los estantes móviles llevan holgura', () => {
    expect(piece(r, 'Estante móvil')).toMatchObject({ qty: 4, length: 762, width: 297 });
  });

  it('reparte los huecos en milímetros enteros y completa la altura interior', () => {
    expect(r.interior).toMatchObject({ baseY: 88, topY: 1782, height: 1694, width: 764 });
    expect(r.columns[0].gaps).toEqual([325, 325, 324, 324, 324]);
    expect(r.columns[0].shelves.map((s) => s.bottom)).toEqual([413, 756, 1098, 1440]);
    expect(r.columns[0].shelves.map((s) => s.bottomFromBase)).toEqual([325, 668, 1010, 1352]);
    const total = r.columns[0].gaps.reduce((a, b) => a + b, 0) + 4 * 18;
    expect(total).toBe(r.interior.height);
  });

  it('el fondo clavado queda 1 mm adentro de cada borde', () => {
    const p = piece(r, 'Fondo');
    expect(p).toMatchObject({ qty: 1, length: 1798, width: 798, thickness: 3, material: 'fondo' });
  });

  it('asigna códigos con la melamina primero', () => {
    expect(r.pieces.map((p) => `${p.code}:${p.name}`)).toEqual([
      'A:Lateral',
      'B:Techo',
      'C:Piso',
      'D:Zócalo',
      'E:Estante móvil',
      'F:Fondo',
    ]);
  });

  it('entra en una placa de melamina y una de fondo', () => {
    const s = summarize(unit, r.pieces);
    expect(s.melamina.pack.sheets).toHaveLength(1);
    expect(s.fondo?.pack.sheets).toHaveLength(1);
    expect(s.warnings).toEqual([]);
    // Tapacanto: laterales (1800 + 297) × 2 + techo 764 + piso 764 + estantes 762 × 4
    expect(s.edgeMeters).toBeCloseTo((2 * (1800 + 297) + 764 + 764 + 4 * 762) / 1000, 6);
    expect(s.edgeToBuy).toBe(Math.ceil(s.edgeMeters * 1.1));
  });

  it('pide fijarlo a la pared', () => {
    expect(r.warnings.some((w) => w.text.includes('pared'))).toBe(true);
    expect(r.hardware.some((h) => h.name.includes('Escuadras'))).toBe(true);
  });
});

describe('columnas y divisores', () => {
  it('organizador 3 × 3: columnas iguales y posición de los divisores', () => {
    const r = computeShelfUnit(preset('cubos'));
    expect(r.columns.map((c) => c.width)).toEqual([326, 326, 326]);
    expect(r.dividers.map((d) => d.left)).toEqual([344, 688]);
    expect(r.dividers.map((d) => d.leftFromInside)).toEqual([326, 670]);
    expect(piece(r, 'Divisor')).toMatchObject({ qty: 2, length: 1014, width: 347 });
    // Sin zócalo: el piso está en el suelo.
    expect(r.interior.baseY).toBe(18);
    expect(piece(r, 'Estante fijo')).toMatchObject({ qty: 6, length: 326 });
    // 2 estantes fijos a la misma altura a cada lado del divisor.
    expect(r.warnings.some((w) => w.level === 'info' && w.text.includes('divisor'))).toBe(true);
  });

  it('respeta un ancho fijo y reparte el resto', () => {
    const r = computeShelfUnit(preset('tv'));
    expect(r.columns.map((c) => c.width)).toEqual([414, 700, 414]);
    // Techo sobre los laterales: laterales más cortos y techo del ancho total.
    expect(piece(r, 'Lateral')).toMatchObject({ length: 482, edges: { long: 1, short: 0 } });
    expect(piece(r, 'Techo')).toMatchObject({ length: 1600, edges: { long: 1, short: 2 } });
    expect(r.pieces.find((p) => p.name === 'Estante fijo')?.notes[0]).toBe('Columnas 1, 3');
    expect(r.pieces.find((p) => p.name === 'Estante móvil')).toMatchObject({ length: 698, notes: ['Columna 2', '2 mm de holgura'] });
  });

  it('avisa si un estante supera la luz recomendada', () => {
    const unit = preset('biblioteca');
    unit.width = 1000;
    const r = computeShelfUnit(unit);
    expect(r.warnings.some((w) => w.level === 'aviso' && w.text.includes('964 mm'))).toBe(true);
  });

  it('da error si los anchos fijos no entran', () => {
    const unit = preset('cubos');
    unit.columns = [column(1, 'fijo', 600), column(1, 'fijo', 600)];
    const r = computeShelfUnit(unit);
    expect(r.warnings[0].level).toBe('error');
    expect(r.pieces).toEqual([]);
  });

  it('cada columna puede tener sus propios estantes', () => {
    const unit = preset('cubos');
    unit.sameShelves = false;
    unit.columns = [column(0), column(3, 'movil'), column(1, 'fijo')];
    const r = computeShelfUnit(unit);
    expect(r.columns.map((c) => c.shelves.length)).toEqual([0, 3, 1]);
  });
});

describe('alturas de huecos a medida', () => {
  it('fija el primer hueco y reparte el resto', () => {
    const unit = preset('biblioteca');
    unit.columns = [{ ...column(4), gaps: [400] }];
    const r = computeShelfUnit(unit);
    const gaps = r.columns[0].gaps;
    expect(gaps[0]).toBe(400);
    expect(gaps.slice(1)).toEqual([306, 306, 305, 305]);
    expect(gaps.reduce((a, b) => a + b, 0) + 72).toBe(1694);
  });

  it('ajusta el último hueco si todas las alturas son fijas y no suman', () => {
    const unit = preset('biblioteca');
    unit.columns = [{ ...column(1), gaps: [500, 500] }];
    const r = computeShelfUnit(unit);
    expect(r.columns[0].gaps).toEqual([500, 1694 - 18 - 500]);
    expect(r.warnings.some((w) => w.level === 'aviso' && w.text.includes('hueco de arriba'))).toBe(true);
  });

  it('da error si no entran', () => {
    const unit = preset('biblioteca');
    unit.columns = [{ ...column(2), gaps: [1000, 1000] }];
    expect(computeShelfUnit(unit).warnings[0].level).toBe('error');
  });
});

describe('fondo', () => {
  it('en ranura: divisores y estantes terminan contra el fondo', () => {
    const unit = preset('cubos');
    unit.back = { mode: 'ranurado', grooveDepth: 8, grooveOffset: 12 };
    const r = computeShelfUnit(unit);
    expect(piece(r, 'Lateral').width).toBe(350);
    expect(piece(r, 'Divisor').width).toBe(335);
    expect(piece(r, 'Estante fijo').width).toBe(335);
    expect(piece(r, 'Fondo')).toMatchObject({ length: 1014 + 14, width: 1014 + 14 });
  });

  it('sin fondo no hay pieza de fondo ni clavos', () => {
    const r = computeShelfUnit(preset('pared'));
    expect(r.pieces.some((p) => p.material === 'fondo')).toBe(false);
    expect(r.hardware.some((h) => h.name.includes('Clavos'))).toBe(false);
  });

  it('divide un fondo grande en el centro de los divisores', () => {
    // Fondo 1998 × 1998 en placa útil 2580 × 1810; divisor centrado en 999.
    expect(splitBack(1998, 1998, 2580, 1810, [999])).toEqual([
      { length: 1998, width: 999 },
      { length: 1998, width: 999 },
    ]);
  });

  it('si no hay divisores divide en partes iguales', () => {
    expect(splitBack(1998, 2001, 2580, 1810, [])).toEqual([
      { length: 1998, width: 1000 },
      { length: 1998, width: 1001 },
    ]);
  });
});

describe('medida de corte con tapacanto grueso', () => {
  it('resta el espesor en los lados con tapacanto', () => {
    const unit = preset('biblioteca');
    unit.material = { ...unit.material, subtractEdge: true, edgeThickness: 2 };
    const r = computeShelfUnit(unit);
    const lateral = piece(r, 'Lateral');
    expect(cutSize(lateral, unit.material)).toEqual({ length: 1798, width: 295 });
    const fondo = piece(r, 'Fondo');
    expect(cutSize(fondo, unit.material)).toEqual({ length: 1798, width: 798 });
  });
});

describe('validaciones', () => {
  it('rechaza un mueble demasiado chico', () => {
    const unit = preset('biblioteca');
    unit.height = 100;
    const r = computeShelfUnit(unit);
    expect(r.warnings[0]).toMatchObject({ level: 'error' });
    expect(r.pieces).toEqual([]);
  });

  it('avisa si una pieza no entra en la placa', () => {
    const unit = preset('biblioteca');
    unit.height = 2700;
    const r = computeShelfUnit(unit);
    const s = summarize(unit, r.pieces);
    expect(s.warnings.some((w) => w.level === 'error' && w.text.includes('Lateral'))).toBe(true);
  });
});
