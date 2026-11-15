import { describe, expect, it } from 'vitest';
import { PRESETS, createFromPreset } from './defaults';
import { resolveUnit } from './resolve';
import { computeShelfUnit, splitDrawerHeights } from './shelf';
import type { DrawerSpec, ShelfUnit } from './types';

const preset = (key: string) => createFromPreset(PRESETS.find((p) => p.key === key)!);
const calc = (u: ShelfUnit) => computeShelfUnit(resolveUnit(u));
const piece = (r: ReturnType<typeof calc>, name: string) => r.pieces.filter((p) => p.name === name);
/** Cajonera de 40 × 60 con 3 cajones iguales, embutidos, telescópicas y fondo clavado. */
function cajonera(drawers: Partial<DrawerSpec> = {}) {
  const u = preset('cajonera');
  u.drawers = { ...u.drawers, front: 'embutido', ...drawers };
  return u;
}

describe('fondo de los cajones', () => {
  it('clavado: del tamaño de la caja, clavado abajo', () => {
    const r = calc(cajonera());
    const d = r.drawers[0];
    expect(piece(r, 'Fondo de cajón')[0]).toMatchObject({ qty: 3, length: d.slide, width: d.boxW });
    expect(r.counts.backNails).toBeGreaterThan(0);
  });

  it('en ranura: más chico (entra en la ranura de los 4 lados) y sin clavos', () => {
    const nailed = calc(cajonera());
    const r = calc(cajonera({ bottom: 'ranura', grooveDepth: 8, grooveOffset: 12 }));
    const d = r.drawers[0];
    // Caja interior + 7 mm de cada lado (ranura de 8 menos 1 de juego).
    expect(piece(r, 'Fondo de cajón')[0]).toMatchObject({ qty: 3, length: d.slide - 36 + 14, width: d.boxW - 36 + 14 });
    expect(piece(r, 'Lateral de cajón')[0].notes.join(' ')).toContain('Ranura de 4 × 8 mm a 12 mm');
    expect(piece(r, 'Frente y contrafrente de cajón')[0].notes.join(' ')).toContain('Ranura');
    const drawerNails = nailed.drawers.reduce((s, x) => s + x.count * Math.ceil((2 * (x.boxW + x.slide)) / 100), 0);
    expect(r.counts.backNails).toBe(nailed.counts.backNails - drawerNails);
  });

  it('avisa si la ranura es demasiado profunda', () => {
    const r = calc(cajonera({ bottom: 'ranura', grooveDepth: 18 }));
    expect(r.warnings.some((w) => w.text.includes('ranura de 18 mm'))).toBe(true);
  });
});

describe('frentes de cajón', () => {
  it('embutidos: dentro del hueco con 3 mm de luz', () => {
    const d = calc(cajonera()).drawers[0];
    expect(d.overlay).toBe(false);
    expect(d.frontW).toBe(364 - 6);
    expect(d.x).toBe(18 + 3);
  });

  it('superpuestos: tapan los laterales, el piso y llegan bajo la tapa; la caja puede ser más larga', () => {
    const inset = calc(cajonera());
    const r = calc(cajonera({ front: 'superpuesto' }));
    const d = r.drawers[0];
    expect(d.overlay).toBe(true);
    // De lateral a lateral menos 3 mm de luz.
    expect(d.frontW).toBe(400 - 3);
    expect(d.x).toBe(1.5);
    // Desde el zócalo (cubre el piso) hasta debajo de la tapa que apoya sobre los laterales.
    expect(d.fronts[0]).toBe(60 + 1.5);
    const top = d.fronts[2] + d.frontHs[2];
    expect(top).toBeLessThanOrEqual(600 - 18 - 1.5);
    expect(d.slide).toBeGreaterThanOrEqual(inset.drawers[0].slide);
    expect(r.doors.extraDepth).toBe(18);
  });

  it('detrás de una puerta van embutidos aunque se elijan superpuestos', () => {
    const u = preset('placard-batiente');
    u.drawers = { ...u.drawers, front: 'superpuesto' };
    const r = calc(u);
    expect(r.drawers.every((d) => !d.overlay)).toBe(true);
  });
});

describe('alturas y correderas', () => {
  it('escalonados: cada cajón más alto que el de arriba y suman lo mismo', () => {
    expect(splitDrawerHeights(750, 3, 'iguales')).toEqual([250, 250, 250]);
    const hs = splitDrawerHeights(750, 3, 'escalonados');
    expect(hs[0]).toBeGreaterThan(hs[1]);
    expect(hs[1]).toBeGreaterThan(hs[2]);
    expect(hs.reduce((a, b) => a + b, 0)).toBe(750);
  });

  it('la cómoda tiene 4 cajones escalonados con frentes de distinto alto', () => {
    const r = calc(preset('comoda'));
    const d = r.drawers[0];
    expect(d.frontHs).toHaveLength(4);
    expect(new Set(d.frontHs).size).toBe(4);
    expect(piece(r, 'Frente de cajón')).toHaveLength(4);
    expect(d.boxHs.every((h, i) => i === 0 || h <= d.boxHs[i - 1])).toBe(true);
  });

  it('las correderas de rodillos llegan hasta 550 mm', () => {
    const u = preset('escritorio-doble');
    expect(calc(u).drawers[0].slide).toBe(600);
    u.drawers = { ...u.drawers, slide: 'rodillo' };
    const d = calc(u).drawers[0];
    expect(d.slide).toBe(550);
    expect(d.slideType).toBe('rodillo');
  });
});
