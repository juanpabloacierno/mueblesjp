import { describe, expect, it } from 'vitest';
import { PRESETS, createFromPreset } from './defaults';
import { hingePositions } from './doors';
import { computeShelfUnit } from './shelf';
import type { ShelfUnit } from './types';

function preset(key: string): ShelfUnit {
  return createFromPreset(PRESETS.find((p) => p.key === key)!);
}

function piece(unit: ShelfUnit, name: string) {
  return computeShelfUnit(unit).pieces.find((p) => p.name === name);
}

describe('bisagras', () => {
  it('reparte las bisagras según el alto de la puerta', () => {
    expect(hingePositions(633)).toEqual([100, 533]);
    expect(hingePositions(1727)).toEqual([100, 609, 1118, 1627]);
    expect(hingePositions(300)).toEqual([70, 230]);
  });
});

describe('puertas con bisagras superpuestas', () => {
  it('una columna ancha lleva dos puertas que tapan los laterales', () => {
    const unit = preset('biblioteca');
    unit.doors = { ...unit.doors, type: 'batiente', mount: 'superpuesta' };
    const r = computeShelfUnit(unit);
    expect(r.doors.doors).toHaveLength(2);
    const [a, b] = r.doors.doors;
    expect(a).toMatchObject({ x: 1.5, y: 71.5, w: 397, h: 1727, hingeSide: 'izquierda', hingeType: 'recta' });
    expect(b).toMatchObject({ x: 401.5, w: 397, hingeSide: 'derecha', hingeType: 'recta' });
    expect(r.doors.hingeCounts).toEqual({ recta: 8, codo9: 0, codo18: 0 });
    expect(r.doors.extraDepth).toBe(18);
    expect(r.doors.swing).toBe(397);
    expect(piece(unit, 'Puerta')).toMatchObject({ qty: 2, length: 1727, width: 397, edges: { long: 2, short: 2 } });
    // Las puertas superpuestas no cambian la profundidad de los estantes.
    expect(r.columns[0].shelves.every((s) => s.depth === 297)).toBe(true);
  });

  it('en un divisor usa bisagras codo 9 y cada puerta tapa medio divisor', () => {
    const unit = preset('cubos');
    unit.doors = { ...unit.doors, type: 'batiente', mount: 'superpuesta' };
    const r = computeShelfUnit(unit);
    expect(r.doors.doors.map((d) => [d.w, d.h, d.hingeSide, d.hingeType])).toEqual([
      [350, 1047, 'izquierda', 'recta'],
      [341, 1047, 'izquierda', 'codo9'],
      [350, 1047, 'derecha', 'recta'],
    ]);
    // Cada puerta tapa hasta la mitad del divisor, con 3 mm de luz entre puertas.
    const [a, b] = r.doors.doors;
    expect(b.x - (a.x + a.w)).toBe(3);
  });

  it('se pueden dejar columnas sin puertas', () => {
    const r = computeShelfUnit(preset('tv'));
    expect(r.doors.doors.map((d) => d.column)).toEqual([0, 2]);
  });

  it('puertas solo abajo, hasta el primer estante', () => {
    const unit = preset('biblioteca-puertas');
    const r = computeShelfUnit(unit);
    expect(r.columns[0].shelves[0]).toMatchObject({ bottom: 688, top: 706 });
    expect(r.doors.doors).toHaveLength(2);
    expect(r.doors.doors[0]).toMatchObject({ y: 71.5, h: 633, w: 397, hinges: [100, 533] });
    expect(r.warnings.filter((w) => w.level !== 'info' && !w.text.includes('pared'))).toEqual([]);
  });

  it('avisa si las puertas terminan en un estante móvil o inexistente', () => {
    const unit = preset('biblioteca');
    unit.doors = { ...unit.doors, type: 'batiente', upToShelf: 2 };
    expect(computeShelfUnit(unit).warnings.some((w) => w.text.includes('es móvil'))).toBe(true);
    unit.doors.upToShelf = 9;
    const r = computeShelfUnit(unit);
    expect(r.warnings.some((w) => w.text.includes('no hay estante 9'))).toBe(true);
    expect(r.doors.doors[0].h).toBe(1727);
  });

  it('avisa si una sola puerta queda muy ancha', () => {
    const unit = preset('biblioteca');
    unit.doors = { ...unit.doors, type: 'batiente', perColumn: 1 };
    const r = computeShelfUnit(unit);
    expect(r.doors.doors[0].w).toBe(797);
    expect(r.warnings.some((w) => w.text.includes('mejor 2 puertas'))).toBe(true);
  });
});

describe('puertas con bisagras embutidas', () => {
  it('van dentro del hueco con codo 18 y los estantes se retiran', () => {
    const unit = preset('biblioteca');
    unit.doors = { ...unit.doors, type: 'batiente', mount: 'embutida' };
    const r = computeShelfUnit(unit);
    expect(r.doors.doors.map((d) => [d.x, d.y, d.w, d.h, d.hingeType])).toEqual([
      [21, 91, 377, 1688, 'codo18'],
      [401, 91, 377, 1688, 'codo18'],
    ]);
    expect(r.doors.extraDepth).toBe(0);
    expect(r.columns[0].shelves.every((s) => s.depth === 297 - 20)).toBe(true);
    expect(piece(unit, 'Estante móvil')).toMatchObject({ qty: 4, width: 277 });
  });

  it('el estante donde terminan las puertas queda entero', () => {
    const unit = preset('biblioteca-puertas');
    unit.doors.mount = 'embutida';
    const r = computeShelfUnit(unit);
    expect(r.columns[0].shelves.map((s) => s.depth)).toEqual([347, 347, 347, 347]);
    unit.doors.upToShelf = 3;
    expect(computeShelfUnit(unit).columns[0].shelves.map((s) => s.depth)).toEqual([327, 327, 347, 347]);
  });
});

describe('puertas corredizas', () => {
  const unit = preset('armario');
  const r = computeShelfUnit(unit);

  it('calcula las hojas con solape', () => {
    expect(r.doors.doors).toHaveLength(2);
    expect(r.doors.doors.map((d) => [d.x, d.w, d.h, d.track])).toEqual([
      [18, 597, 1674, 'trasero'],
      [585, 597, 1674, 'delantero'],
    ]);
    expect(r.doors.trackLength).toBe(1164);
    expect(r.doors.swing).toBe(0);
    expect(piece(unit, 'Puerta corrediza')).toMatchObject({ qty: 2, length: 1674, width: 597 });
  });

  it('estantes y divisores arrancan detrás de los rieles', () => {
    expect(r.frontInset).toBe(50);
    expect(r.columns.flatMap((c) => c.shelves.map((s) => s.depth))).toEqual(Array(8).fill(447));
    expect(piece(unit, 'Divisor')).toMatchObject({ width: 447 });
    expect(piece(unit, 'Divisor')?.notes).toContain('Retirado 50 mm del frente por los rieles');
  });

  it('tres hojas cubren todo el ancho interior', () => {
    const u = preset('armario');
    u.doors.leaves = 3;
    const doors = computeShelfUnit(u).doors.doors;
    const last = doors[doors.length - 1];
    expect(doors.map((d) => d.track)).toEqual(['trasero', 'delantero', 'trasero']);
    expect(Math.abs(last.x + last.w - (1200 - 18))).toBeLessThanOrEqual(3);
  });

  it('da error si los rieles no dejan profundidad', () => {
    const u = preset('armario');
    u.doors.trackDepth = 480;
    expect(computeShelfUnit(u).warnings[0].level).toBe('error');
  });
});
