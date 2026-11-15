import { describe, expect, it } from 'vitest';
import { PRESETS, createFromPreset, knee } from './defaults';
import { resolveUnit } from './resolve';
import { computeShelfUnit } from './shelf';

const preset = (key: string) => resolveUnit(createFromPreset(PRESETS.find((p) => p.key === key)!));
const piece = (r: ReturnType<typeof computeShelfUnit>, name: string) => r.pieces.find((p) => p.name === name);

describe('escritorios (hueco para las piernas)', () => {
  it('escritorio simple: tapa, dos laterales y faldón, sin piso ni fondo', () => {
    const u = preset('escritorio-simple');
    const r = computeShelfUnit(u);
    expect(r.pieces.map((p) => `${p.qty} ${p.name}`)).toEqual(['2 Lateral', '1 Techo', '1 Faldón']);
    // Sin fondo, los laterales y la tapa tienen toda la profundidad.
    expect(piece(r, 'Lateral')).toMatchObject({ length: 732, width: 600 });
    expect(piece(r, 'Techo')).toMatchObject({ length: 1200, width: 600 });
    expect(piece(r, 'Faldón')).toMatchObject({ length: 1164, width: 350 });
    expect(r.bases).toEqual([]);
    expect(r.knees).toEqual([{ column: 0, x: 18, width: 1164, height: 732, modesty: { y: 382, h: 350 } }]);
  });

  it('con cajonera: el piso, el zócalo y el fondo son solo de la cajonera', () => {
    const r = computeShelfUnit(preset('escritorio-cajonera'));
    expect(r.bases).toEqual([{ from: 1, to: 1, x: 782, w: 400 }]);
    expect(piece(r, 'Piso')).toMatchObject({ qty: 1, length: 400 });
    expect(piece(r, 'Zócalo')).toMatchObject({ qty: 1, length: 400 });
    // El costado de la cajonera llega al suelo, como un lateral.
    expect(piece(r, 'Lateral interior')).toMatchObject({ qty: 1, length: 732, width: 597 });
    expect(piece(r, 'Divisor')).toBeUndefined();
    // Fondo: de la cara de afuera del costado a la del lateral, menos 1 mm por lado.
    expect(piece(r, 'Fondo')).toMatchObject({ qty: 1, length: 748, width: 434 });
    expect(piece(r, 'Faldón')).toMatchObject({ length: 746 });
    expect(r.drawers).toHaveLength(1);
    expect(r.drawers[0]).toMatchObject({ count: 3, frontW: 394, slide: 550 });
    expect(r.panels.filter((p) => p.role === 'lateral')).toHaveLength(3);
    expect(r.panels.filter((p) => p.role === 'faldon')).toHaveLength(1);
  });

  it('dos cajoneras: dos tramos con piso y el hueco al medio', () => {
    const r = computeShelfUnit(preset('escritorio-doble'));
    expect(r.bases.map((b) => [b.from, b.to])).toEqual([
      [0, 0],
      [2, 2],
    ]);
    expect(piece(r, 'Piso')?.qty).toBe(2);
    expect(piece(r, 'Lateral interior')?.qty).toBe(2);
    expect(piece(r, 'Fondo')?.qty).toBe(2);
    expect(r.knees[0].width).toBe(728);
  });

  it('el hueco para las piernas no lleva puertas, maletero ni corredizas', () => {
    const base = createFromPreset(PRESETS.find((p) => p.key === 'escritorio-gabinete')!);
    let r = computeShelfUnit(resolveUnit(base));
    expect(r.doors.doors.map((d) => d.column)).toEqual([2]);
    const sliding = { ...base, doors: { ...base.doors, type: 'corrediza' as const }, maletero: { ...base.maletero, enabled: true } };
    r = computeShelfUnit(resolveUnit(sliding));
    expect(r.doors.doors).toHaveLength(0);
    expect(r.maletero).toBeNull();
  });

  it('avisa si el hueco es angosto o bajo', () => {
    const u = createFromPreset(PRESETS.find((p) => p.key === 'escritorio-cajonera')!);
    u.width = 900;
    u.height = 600;
    const texts = computeShelfUnit(resolveUnit(u)).warnings.map((w) => w.text);
    expect(texts.some((t) => t.includes('al menos 600 mm'))).toBe(true);
    expect(texts.some((t) => t.includes('al menos 620 mm'))).toBe(true);
  });

  it('sin hueco para las piernas el cálculo no cambia', () => {
    const u = preset('biblioteca');
    const r = computeShelfUnit(u);
    expect(r.bases).toEqual([{ from: 0, to: 0, x: 18, w: 764 }]);
    expect(r.knees).toEqual([]);
    expect(piece(r, 'Fondo')).toMatchObject({ length: 1798, width: 798 });
    // Un hueco para las piernas agregado a mano usa la misma regla.
    const desk = { ...u, height: 750, columns: [knee(), u.columns[0]] };
    expect(computeShelfUnit(resolveUnit(desk)).bases).toHaveLength(1);
  });
});

describe('modelos nuevos', () => {
  it('todos calculan sin errores', () => {
    for (const p of PRESETS) {
      const r = computeShelfUnit(resolveUnit(createFromPreset(p)));
      expect(r.warnings.filter((w) => w.level === 'error'), p.key).toEqual([]);
      expect(r.pieces.length, p.key).toBeGreaterThan(0);
    }
  });
});
