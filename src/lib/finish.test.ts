import { describe, expect, it } from 'vitest';
import { summarize } from './cutlist';
import { PRESETS, createFromPreset } from './defaults';
import { computeShelfUnit } from './shelf';
import { buildShoppingList } from './shopping';
import type { ShelfUnit } from './types';

function biblioteca(tweak: (u: ShelfUnit) => void = () => {}) {
  const unit = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca-puertas')!);
  // Exterior en Faplac Roble (con veta), interior en Egger Blanco.
  unit.material = { ...unit.material, brand: 'Faplac', boardLength: 2750, color: 'Roble', hasGrain: true };
  unit.material.interior = { ...unit.material.interior, enabled: true, brand: 'Egger', color: 'Blanco', boardLength: 2600, hasGrain: false };
  tweak(unit);
  const r = computeShelfUnit(unit);
  return { unit, r, s: summarize(unit, r.pieces) };
}

describe('colores exterior e interior', () => {
  it('frentes y cuerpo por fuera, estantes por dentro', () => {
    const { r, s } = biblioteca();
    const finish = (name: string) => r.pieces.find((p) => p.name === name)?.finish;
    expect(finish('Lateral')).toBe('exterior');
    expect(finish('Techo')).toBe('exterior');
    expect(finish('Puerta')).toBe('exterior');
    expect(finish('Estante fijo')).toBe('interior');
    expect(r.pieces.find((p) => p.name === 'Fondo')?.finish).toBeNull();
    // La veta depende de la placa de cada pieza.
    expect(r.pieces.find((p) => p.name === 'Lateral')?.canRotate).toBe(false);
    expect(r.pieces.find((p) => p.name === 'Estante fijo')?.canRotate).toBe(true);
    expect(s.melamina.label).toBe('Melamina Faplac Roble 18 mm · exterior');
    expect(s.interior?.label).toBe('Melamina Egger Blanco 18 mm · interior');
    expect(s.melamina.pieces.map((p) => p.name)).toEqual(['Lateral', 'Techo', 'Piso', 'Zócalo', 'Puerta']);
    expect(s.interior?.pieces.map((p) => p.name)).toEqual(['Estante fijo']);
    expect(s.boards).toHaveLength(2);
    // Códigos: exterior primero, después interior y fondo.
    expect(r.pieces.map((p) => `${p.code}:${p.finish ?? 'fondo'}`)).toEqual(['A:exterior', 'B:exterior', 'C:exterior', 'D:exterior', 'E:exterior', 'F:interior', 'G:fondo']);
  });

  it('el cuerpo puede ir con el color interior (placard empotrado)', () => {
    const { r, s } = biblioteca((u) => void (u.material.interior.body = 'interior'));
    expect(r.pieces.find((p) => p.name === 'Lateral')?.finish).toBe('interior');
    expect(s.melamina.pieces.map((p) => p.name)).toEqual(['Puerta']);
  });

  it('la lista de compras lleva una placa y un tapacanto por color', () => {
    const { unit, r, s } = biblioteca();
    const items = buildShoppingList(unit, r, s);
    const boards = items.filter((i) => i.category === 'placas' && i.unit === 'placa' && i.name.startsWith('Placa de melamina'));
    expect(boards.map((b) => b.name)).toEqual(['Placa de melamina Faplac Roble 18 mm (exterior)', 'Placa de melamina Egger Blanco 18 mm (interior)']);
    const edges = items.filter((i) => i.key.startsWith('tapacanto'));
    expect(edges.map((e) => e.name)).toEqual(['Tapacanto Roble 22 × 0,45 mm', 'Tapacanto Blanco 22 × 0,45 mm']);
    expect(edges.reduce((n, e) => n + e.qty, 0)).toBe(s.edgeToBuy);
  });

  it('sin color interior todo va en una sola placa', () => {
    const unit = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!);
    const r = computeShelfUnit(unit);
    const s = summarize(unit, r.pieces);
    expect(r.pieces.every((p) => p.finish === 'exterior' || p.finish === null)).toBe(true);
    expect(s.interior).toBeNull();
    expect(s.boards).toHaveLength(1);
  });
});
