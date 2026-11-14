import { describe, expect, it } from 'vitest';
import { summarize } from './cutlist';
import { PRESETS, createFromPreset } from './defaults';
import { resolveUnit } from './resolve';
import { computeShelfUnit } from './shelf';
import { buildShoppingList } from './shopping';
import { buildSteps } from './steps';
import { applyTemplate } from './templates';
import type { ShelfUnit } from './types';

function preset(key: string): ShelfUnit {
  return createFromPreset(PRESETS.find((p) => p.key === key)!);
}

describe('placard empotrado con corredizas', () => {
  const unit = preset('placard-corredizo');
  const r = computeShelfUnit(unit);
  const piece = (name: string) => r.pieces.find((p) => p.name === name);

  it('descuenta las holguras del hueco', () => {
    expect(r.size).toEqual({ width: 1790, height: 2380, depth: 590 });
    expect(resolveUnit(resolveUnit(unit)).width).toBe(1790);
  });

  it('el maletero corta el alto de las columnas', () => {
    expect(r.maletero).toEqual({ shelfBottom: 1944, shelfTop: 1962, height: 400 });
    expect(r.columnsTop).toBe(1944);
    expect(piece('Estante maletero')).toMatchObject({ qty: 1, length: 1754, width: 587 });
    expect(piece('Divisor')).toMatchObject({ qty: 2, length: 1856, width: 537 });
    expect(piece('Divisor de maletero')).toBeUndefined();
  });

  it('colgado largo: barral a 5 cm del techo del hueco', () => {
    expect(r.columns.map((c) => c.width)).toEqual([573, 573, 572]);
    expect(r.columns[0].compartments[0].rod).toMatchObject({ y: 1894, length: 571, hanging: 1806, supports: 2 });
  });

  it('cajonera: frentes, cajas y correderas', () => {
    const d = r.columns[1].compartments[0].drawers!;
    expect(d).toMatchObject({ count: 3, frontW: 567, frontH: 182, boxW: 547, boxH: 150, slide: 500 });
    expect(d.fronts).toEqual([91, 276, 461]);
    expect(d.slideCenters).toEqual([176, 361, 546]);
    // El estante arriba de los cajones queda fijo.
    expect(r.columns[1].shelves.map((s) => s.type)).toEqual(['fijo', 'movil', 'movil', 'movil']);
    expect(piece('Frente de cajón')).toMatchObject({ qty: 3, length: 567, width: 182, edges: { long: 2, short: 2 } });
    expect(piece('Lateral de cajón')).toMatchObject({ qty: 6, length: 500, width: 150 });
    expect(piece('Frente y contrafrente de cajón')).toMatchObject({ qty: 6, length: 511, width: 150 });
    expect(piece('Fondo de cajón')).toMatchObject({ qty: 3, length: 500, width: 547, material: 'fondo' });
  });

  it('colgado corto arriba con zapatero abajo', () => {
    const col = r.columns[2];
    expect(col.gaps).toEqual([838, 1000]);
    expect(col.compartments[0].shoes).toMatchObject({ style: 'inclinado', levels: [{ front: 108 }, { front: 313 }, { front: 517 }, { front: 722 }] });
    expect(col.compartments[1].rod).toMatchObject({ y: 1894, hanging: 950, length: 570 });
  });

  it('corredizas abajo y en el maletero', () => {
    const main = r.doors.doors.filter((d) => d.zone === 'principal');
    const top = r.doors.doors.filter((d) => d.zone === 'maletero');
    expect(main.map((d) => [d.w, d.h])).toEqual([
      [892, 1836],
      [892, 1836],
    ]);
    expect(top.map((d) => [d.w, d.h])).toEqual([
      [892, 380],
      [892, 380],
    ]);
    expect(r.doors.trackSets).toBe(2);
    expect(piece('Puerta corrediza de maletero')).toMatchObject({ qty: 2, length: 380 });
  });

  it('avisa que armado no se puede parar en el hueco', () => {
    expect(r.diagonal).toBe(2452);
    expect(r.warnings.some((w) => w.text.includes('no se puede parar'))).toBe(true);
  });

  it('lista de compras con barrales, correderas y rieles dobles', () => {
    const items = buildShoppingList(unit, r, summarize(unit, r.pieces));
    const get = (k: string) => items.find((i) => i.key === k);
    expect(get('barral')).toMatchObject({ qty: 1.141, unit: 'm' });
    expect(get('soporte-barral')?.qty).toBe(4);
    expect(get('corredera|500')).toMatchObject({ qty: 3, unit: 'juego' });
    expect(get('tirador-cajon')?.qty).toBe(3);
    // 4 por frente de cajón y 3 por tope de zapatero.
    expect(get('tornillo-4x30')?.qty).toBe(3 * 4 + 4 * 3);
    expect(get('riel-superior')?.qty).toBe(3.508);
    expect(get('ruedas-corrediza')?.qty).toBe(4);
    expect(get('tornillo-3.5x16')?.qty).toBe(52 + 36 + 12);
    expect(get('tapajunta')).toMatchObject({ defaultOn: false });
  });

  it('pasos de armado en orden, con medidas', () => {
    const steps = buildSteps(unit, r, summarize(unit, r.pieces));
    expect(steps.map((s) => s.key)).toEqual([
      'medir',
      'cortes',
      'marcar',
      'perforar',
      'caja',
      'escuadra',
      'divisores',
      'barrales',
      'cajones',
      'zapatero',
      'puertas',
      'pared',
      'terminar',
    ]);
    expect(steps.find((s) => s.key === 'barrales')?.detail).toContain('1894 mm');
    // No entra parado en el hueco: se arma parado en el lugar.
    expect(steps.find((s) => s.key === 'caja')?.title).toBe('Armá la caja parada, en el lugar');
    const other = preset('placard-batiente');
    const ro = computeShelfUnit(other);
    expect(buildSteps(other, ro, summarize(other, ro.pieces)).find((s) => s.key === 'parar')?.detail).toContain('2275 mm');
  });
});

describe('placard con puertas de abrir y maletero dividido', () => {
  const unit = preset('placard-batiente');
  const r = computeShelfUnit(unit);

  it('puertas abajo y arriba que se encuentran en el estante maletero', () => {
    const main = r.doors.doors.filter((d) => d.zone === 'principal');
    const top = r.doors.doors.filter((d) => d.zone === 'maletero');
    expect(main.map((d) => [d.w, d.h, d.hingeSide, d.hingeType])).toEqual([
      [597, 1750, 'izquierda', 'recta'],
      [597, 1750, 'derecha', 'recta'],
    ]);
    expect(top.map((d) => [d.y, d.w, d.h])).toEqual([
      [1824.5, 597, 374],
      [1824.5, 597, 374],
    ]);
    // Luz de 3 mm entre la puerta de abajo y la del maletero.
    expect(top[0].y - (main[0].y + main[0].h)).toBe(3);
    expect(r.doors.hingeCounts.recta).toBe(4 * 2 + 2 * 2);
    expect(r.pieces.find((p) => p.name === 'Divisor de maletero')).toMatchObject({ qty: 1, length: 350 });
  });

  it('avisa del suplemento para cajones detrás de puertas con bisagras', () => {
    expect(r.warnings.some((w) => w.text.includes('suplemento'))).toBe(true);
  });
});

describe('avisos de colgado', () => {
  it('poca profundidad o poco alto para colgar', () => {
    const unit = preset('placard-batiente');
    unit.depth = 450;
    unit.columns[0] = { ...unit.columns[0], shelves: 1, gaps: [700], fill: [{ kind: 'barral' }] };
    const r = computeShelfUnit(unit);
    expect(r.warnings.some((w) => w.text.includes('profundidad libre'))).toBe(true);
    expect(r.warnings.some((w) => w.text.includes('650 mm para colgar'))).toBe(true);
  });

  it('cajones que no entran en el hueco', () => {
    const unit = preset('placard-batiente');
    unit.columns[1] = { ...unit.columns[1], gaps: [200], fill: [{ kind: 'cajones', count: 3 }] };
    const r = computeShelfUnit(unit);
    expect(r.columns[1].compartments[0].drawers).toBeUndefined();
    expect(r.warnings.some((w) => w.text.includes('usá menos cajones'))).toBe(true);
  });
});

describe('plantillas de columna', () => {
  it('arman interiores típicos según el alto', () => {
    expect(applyTemplate('colgado-estantes', 1856, 18)).toEqual({
      shelves: 2,
      shelfType: 'movil',
      gaps: [null, null, 1000],
      fill: [null, null, { kind: 'barral' }],
    });
    expect(applyTemplate('cajonera-estantes', 1856, 18)).toMatchObject({ shelves: 4, gaps: [560], fill: [{ kind: 'cajones', count: 3 }] });
    expect(applyTemplate('colgado-largo', 1900, 18)).toMatchObject({ shelves: 1, gaps: [null, 300] });
    expect(applyTemplate('colgado-largo', 1700, 18)).toMatchObject({ shelves: 0 });
    expect(applyTemplate('cajonera-colgado', 1856, 18)).toMatchObject({ shelves: 2, fill: [{ kind: 'cajones', count: 3 }, null, { kind: 'barral' }] });
    expect(applyTemplate('zapatero', 1856, 18)).toMatchObject({ shelves: 0, fill: [{ kind: 'zapatero', style: 'inclinado', levels: 9 }] });
    expect(applyTemplate('colgado-zapatero', 1856, 18)).toEqual({
      shelves: 1,
      shelfType: 'fijo',
      gaps: [null, 1000],
      fill: [{ kind: 'zapatero', style: 'inclinado', levels: 4 }, { kind: 'barral' }],
    });
    expect(applyTemplate('zapatero-estantes', 1856, 18)).toMatchObject({ gaps: [640], fill: [{ kind: 'zapatero', levels: 3 }] });
  });
});

describe('zapateros', () => {
  function withShoes(style: 'inclinado' | 'barras' | 'plano', levels = 4) {
    const unit = preset('placard-corredizo');
    // Columna 3: zapatero abajo (838 mm libres) y colgado corto arriba.
    unit.columns[2] = { width: null, shelves: 1, shelfType: 'movil', gaps: [null, 1000], fill: [{ kind: 'zapatero', style, levels }, { kind: 'barral' }] };
    const r = computeShelfUnit(unit);
    return { unit, r, rack: r.columns[2].compartments[0].shoes!, piece: (name: string) => r.pieces.find((p) => p.name === name) };
  }

  it('inclinado: niveles, subida y piezas con tope', () => {
    const { r, rack, piece } = withShoes('inclinado');
    expect(r.columns[2].compartments[0]).toMatchObject({ bottom: 88, height: 838, depth: 537 });
    expect(rack).toMatchObject({ style: 'inclinado', run: 330, rise: 88, frontOffset: 50, pitch: 204 });
    expect(rack.levels).toEqual([
      { front: 108, back: 196 },
      { front: 313, back: 401 },
      { front: 517, back: 605 },
      { front: 722, back: 810 },
    ]);
    expect(r.columns[2].shelves[0].type).toBe('fijo');
    expect(piece('Estante zapatero inclinado')).toMatchObject({ qty: 4, length: 572, width: 342, edges: { long: 0, short: 0 } });
    expect(piece('Tope de zapatero')).toMatchObject({ qty: 4, length: 572, width: 50, edges: { long: 1, short: 0 } });
    expect(r.warnings.filter((w) => w.text.includes('zapatero'))).toEqual([]);
  });

  it('inclinado: compras y pasos de armado', () => {
    const { unit, r } = withShoes('inclinado');
    const plain = preset('placard-corredizo');
    plain.columns[2] = { ...plain.columns[2], fill: [null, { kind: 'barral' }] };
    expect(r.counts.screws - computeShelfUnit(plain).counts.screws).toBe(16);
    const s = summarize(unit, r.pieces);
    const items = buildShoppingList(unit, r, s);
    expect(items.find((i) => i.key === 'tornillo-4x30')?.qty).toBe(3 * 4 + 4 * 3);
    const step = buildSteps(unit, r, s).find((x) => x.key === 'zapatero');
    expect(step?.detail).toContain('108 → 196');
  });

  it('barras: dos barras por nivel y 4 soportes', () => {
    const { unit, r, rack } = withShoes('barras');
    expect(rack.levels.map((l) => [l.front, l.back])).toEqual([
      [128, 198],
      [328, 398],
      [527, 597],
      [727, 797],
    ]);
    expect(r.pieces.some((p) => p.name.includes('zapatero'))).toBe(false);
    const items = buildShoppingList(unit, r, summarize(unit, r.pieces));
    // Barrales de colgar (571 y 570) + 8 barras de 570.
    expect(items.find((i) => i.key === 'barral')?.qty).toBe((571 + 570 + 8 * 570) / 1000);
    expect(items.find((i) => i.key === 'soporte-barral')?.qty).toBe(4 + 16);
  });

  it('plano: filas de zapatos sobre pernos', () => {
    const { r, rack, piece } = withShoes('plano');
    expect(rack.pitch).toBe(196);
    expect(rack.levels.map((l) => l.front)).toEqual([284, 498, 712]);
    expect(piece('Estante zapatero')).toMatchObject({ qty: 3, length: 570, width: 537 });
    // Columna 2: 3 estantes móviles. Columna 3: 3 estantes zapateros. 4 pernos cada uno.
    expect(r.counts.shelfPins).toBe((3 + 3) * 4);
  });

  it('avisa si los niveles quedan muy juntos', () => {
    const { r } = withShoes('inclinado', 6);
    expect(r.warnings.some((w) => w.text.includes('usá menos niveles'))).toBe(true);
  });
});
