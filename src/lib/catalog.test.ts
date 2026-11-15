import { describe, expect, it } from 'vitest';
import { BOARD_TYPES, backLabel, boardLabel, boardsFor, boardsThatFit, brandLabel, brandsFor, edgeWidthFor, looksLikeWood } from './catalog';
import { summarize } from './cutlist';
import { DEFAULT_MATERIAL, PRESETS, createFromPreset, normalizeMaterial } from './defaults';
import { setLang } from './i18n';
import { computeShelfUnit } from './shelf';
import { backBoardKey, boardKey, buildShoppingList } from './shopping';

describe('catálogo de placas', () => {
  it('separa marcas y tipos para el cuerpo y el fondo', () => {
    expect(brandsFor('cuerpo')).toEqual(['Egger', 'Faplac', 'Sadepan']);
    expect(brandsFor('fondo')).toEqual(['Egger', 'Genérica']);
    expect(boardsFor('fondo').every((b) => b.type === 'fibrofacil' || b.type === 'fondo-blanco')).toBe(true);
    const mine = [{ brand: 'Maderera Pepe', type: 'melamina' as const, length: 2440, width: 1830, thicknesses: [18], custom: true }];
    expect(brandsFor('cuerpo', mine)).toContain('Maderera Pepe');
  });

  it('nombra la placa con tipo, marca, color y espesor', () => {
    expect(boardLabel(DEFAULT_MATERIAL)).toBe('Melamina Egger Blanco 18 mm');
    expect(backLabel(DEFAULT_MATERIAL)).toBe('MDF delgado 3 mm');
    expect(boardLabel({ ...DEFAULT_MATERIAL, brand: 'Faplac', boardType: 'mdf' })).toBe('MDF crudo Faplac 18 mm');
    expect(boardLabel({ ...DEFAULT_MATERIAL, brand: 'Otra', color: 'Roble' })).toBe('Melamina Roble 18 mm');
    expect(backLabel({ ...DEFAULT_MATERIAL, backBrand: 'Egger', backType: 'fondo-blanco' })).toBe('Fondo blanco Egger 3 mm');
  });

  it('nombra la placa en inglés y traduce las marcas genéricas', () => {
    setLang('en');
    try {
      expect(boardLabel(DEFAULT_MATERIAL)).toBe('Melamine Egger Blanco 18 mm');
      expect(backLabel(DEFAULT_MATERIAL)).toBe('Thin MDF 3 mm');
      expect(boardLabel({ ...DEFAULT_MATERIAL, brand: 'Faplac', boardType: 'mdf' })).toBe('Raw MDF Faplac 18 mm');
      expect(BOARD_TYPES.map((t) => t.label)).toEqual(['Melamine', 'Melamine on MDF', 'Raw MDF', 'Raw particleboard']);
      expect(brandLabel('Genérica')).toBe('Generic');
      expect(brandLabel('Egger')).toBe('Egger');
    } finally {
      setLang('es');
    }
    expect(BOARD_TYPES[0].label).toBe('Melamina');
    expect(brandLabel('Genérica')).toBe('Genérica');
  });

  it('reconoce diseños con veta y sugiere el ancho de tapacanto', () => {
    expect(looksLikeWood('Roble Kendal')).toBe(true);
    expect(looksLikeWood('Nogal')).toBe(true);
    expect(looksLikeWood('Blanco')).toBe(false);
    expect(looksLikeWood('Gris humo')).toBe(false);
    expect(edgeWidthFor(18)).toBe(22);
    expect(edgeWidthFor(25)).toBe(33);
  });

  it('sugiere placas más largas cuando una pieza no entra', () => {
    expect(boardsThatFit(DEFAULT_MATERIAL, 2700, 587).map((b) => b.brand)).toEqual(['Faplac', 'Sadepan']);
    expect(boardsThatFit(DEFAULT_MATERIAL, 2790, 587).map((b) => b.brand)).toEqual(['Sadepan']);
    const unit = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!);
    unit.height = 2700;
    const r = computeShelfUnit(unit);
    const warning = summarize(unit, r.pieces).warnings.find((w) => w.text.includes('Lateral'));
    expect(warning?.text).toContain('Entra en Faplac de 2750 × 1830 o Sadepan de 2820 × 1830');
  });

  it('con Faplac de 2750 entra un placard de piso a techo de 2,70 m', () => {
    const unit = createFromPreset(PRESETS.find((p) => p.key === 'placard-corredizo')!);
    unit.niche.height = 2720;
    unit.material = { ...unit.material, brand: 'Faplac', boardLength: 2750 };
    const r = computeShelfUnit(unit);
    expect(r.size.height).toBe(2700);
    expect(summarize(unit, r.pieces).warnings).toEqual([]);
  });
});

describe('materiales guardados antes del catálogo', () => {
  it('quedan como placa "Otra" con sus medidas y conservan la clave de precio', () => {
    const old = { color: 'Blanco', boardLength: 2600, boardWidth: 1830, thickness: 18 };
    const m = normalizeMaterial(old as never);
    expect(m).toMatchObject({ brand: 'Otra', boardType: 'melamina', backBrand: 'Genérica', backType: 'fibrofacil', boardLength: 2600 });
    expect(boardKey(m)).toBe('placa-melamina|blanco|18|2600x1830');
    expect(backBoardKey(m)).toBe('placa-fondo|3|2600x1830');
  });

  it('las marcas tienen su propia clave de precio', () => {
    expect(boardKey(DEFAULT_MATERIAL)).toBe('placa|egger|melamina|blanco|18|2600x1830');
    expect(backBoardKey({ ...DEFAULT_MATERIAL, backBrand: 'Egger', backType: 'fondo-blanco' })).toBe('placa-fondo|egger|fondo-blanco|3|2600x1830');
  });
});

describe('placa cruda', () => {
  it('con MDF crudo el tapacanto pasa a ser opcional', () => {
    const unit = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!);
    unit.material = { ...unit.material, brand: 'Faplac', boardType: 'mdf', boardLength: 2750 };
    const r = computeShelfUnit(unit);
    const items = buildShoppingList(unit, r, summarize(unit, r.pieces));
    const edge = items.find((i) => i.key.startsWith('tapacanto'));
    expect(edge).toMatchObject({ defaultOn: false, optional: true });
    expect(items[0].name).toBe('Tablero de MDF crudo Faplac 18 mm');
  });
});
