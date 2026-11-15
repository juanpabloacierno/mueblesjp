import { describe, expect, it } from 'vitest';
import { buildAssembly } from './assembly';
import { summarize } from './cutlist';
import { PRESETS, createFromPreset } from './defaults';
import { setLang } from './i18n';
import { computeShelfUnit } from './shelf';
import type { ShelfUnit } from './types';

function plan(key: string, tweak: (u: ShelfUnit) => void = () => {}) {
  const unit = createFromPreset(PRESETS.find((p) => p.key === key)!);
  tweak(unit);
  const r = computeShelfUnit(unit);
  return { unit, r, a: buildAssembly(unit, r, summarize(unit, r.pieces)) };
}

describe('instrucciones de armado ilustradas', () => {
  it('biblioteca: orden de pasos y cada pieza en un solo paso', () => {
    const { a } = plan('biblioteca');
    expect(a.prep.map((s) => s.key)).toEqual(['cortes', 'marcar', 'perforar']);
    expect(a.steps.map((s) => s.key)).toEqual(['a-base', 'a-techo', 'a-lateral', 'a-fondo', 'a-parar', 'a-moviles', 'a-pared', 'a-terminar']);
    const added = a.steps.flatMap((s) => s.add);
    expect(new Set(added).size).toBe(added.length);
    expect(added.length).toBe(a.scene.length);
  });

  it('cada paso dice qué piezas (con su letra) y qué herrajes lleva', () => {
    const { a, r } = plan('biblioteca');
    const base = a.steps[0];
    const code = (name: string) => r.pieces.find((p) => p.name === name)!.code;
    expect(base.pieces).toEqual([
      { code: code('Lateral'), name: 'Lateral', qty: 1 },
      { code: code('Piso'), name: 'Piso', qty: 1 },
      { code: code('Zócalo'), name: 'Zócalo', qty: 1 },
    ]);
    // 2 tornillos piso-lateral (300 mm de profundidad) + 2 del zócalo.
    expect(base.hardware).toEqual([{ kind: 'tornillo', label: 'Tornillo 4 × 50', qty: 4 }]);
    expect(a.steps.find((s) => s.key === 'a-moviles')?.hardware).toEqual([{ kind: 'perno', label: 'Perno de estante', qty: 16 }]);
    expect(a.steps.find((s) => s.key === 'a-fondo')).toMatchObject({ view: 'atras', pieces: [{ code: code('Fondo'), qty: 1 }] });
  });

  it('los tornillos de la caja suman lo mismo que la lista de compras', () => {
    const { a, r } = plan('placard-batiente');
    const screws = a.hardware.find((h) => h.kind === 'tornillo')?.qty;
    expect(screws).toBe(r.counts.screws);
  });

  it('placard: maletero, divisores, barral, cajones y puertas con bisagras', () => {
    const { a } = plan('placard-batiente');
    expect(a.steps.map((s) => s.key)).toEqual([
      'a-base',
      'a-techo',
      'a-lateral',
      'a-fondo',
      'a-parar',
      'a-divisores',
      'a-fijos',
      'a-barrales',
      'a-cajones',
      'a-moviles',
      'a-puertas',
      'a-pared',
      'a-terminar',
    ]);
    const cajones = a.steps.find((s) => s.key === 'a-cajones')!;
    expect(cajones.pieces.map((p) => [p.name, p.qty])).toEqual([
      ['Frente de cajón', 3],
      ['Lateral de cajón', 6],
      ['Frente y contrafrente de cajón', 6],
      ['Fondo de cajón', 3],
    ]);
    expect(cajones.hardware.find((h) => h.kind === 'corredera')?.qty).toBe(3);
    const puertas = a.steps.find((s) => s.key === 'a-puertas')!;
    expect(puertas.hardware.filter((h) => h.kind === 'bisagra').reduce((n, h) => n + h.qty, 0)).toBe(12);
    expect(puertas.pieces.map((p) => [p.name, p.qty])).toEqual([
      ['Puerta', 2],
      ['Puerta de maletero', 2],
    ]);
    // La base del primer paso no se mueve en el dibujo.
    expect(a.steps[0].fixed).toHaveLength(1);
  });

  it('con techo sobre los laterales, el techo va después del segundo lateral', () => {
    const { a } = plan('baja');
    const keys = a.steps.map((s) => s.key);
    expect(keys.indexOf('a-techo')).toBeGreaterThan(keys.indexOf('a-lateral'));
    expect(a.steps.find((s) => s.key === 'a-techo')?.explode.y).toBeGreaterThan(0);
  });

  it('en inglés, los mismos pasos, piezas y herrajes', () => {
    const es = plan('placard-batiente');
    setLang('en');
    try {
      const en = plan('placard-batiente');
      expect(en.a.steps.map((s) => [s.key, s.pieces])).toEqual(es.a.steps.map((s) => [s.key, s.pieces]));
      expect(en.a.hardware.map((h) => [h.kind, h.qty])).toEqual(es.a.hardware.map((h) => [h.kind, h.qty]));
      expect(en.a.steps[0].hardware[0].label).toBe('Screw 4 × 50');
      expect(en.a.prep.find((s) => s.key === 'cortes')?.title).toBe('Order the cuts');
    } finally {
      setLang('es');
    }
  });
  it('escritorios: los tornillos de cada paso suman lo mismo que la lista de compras', () => {
    for (const key of ['escritorio-simple', 'escritorio-cajonera', 'escritorio-gabinete', 'escritorio-doble']) {
      const { a, r } = plan(key);
      expect(a.hardware.find((h) => h.kind === 'tornillo')?.qty, key).toBe(r.counts.screws);
      // Cada pieza del dibujo entra en un solo paso.
      const added = a.steps.flatMap((s) => s.add);
      expect(new Set(added).size, key).toBe(added.length);
      expect(added.length, key).toBe(a.scene.length);
    }
  });

  it('escritorio con cajonera y gabinete: cada módulo como una caja, después faldón, tapa y fondos', () => {
    const { a } = plan('escritorio-gabinete');
    expect(a.steps.map((s) => s.key)).toEqual([
      'a-base',
      'a-lateral',
      'a-base-2',
      'a-lateral-2',
      'a-faldon',
      'a-techo',
      'a-fondo',
      'a-cajones',
      'a-moviles',
      'a-puertas',
      'a-terminar',
    ]);
    expect(a.steps.map((s) => s.title).slice(0, 4)).toEqual([
      'Cajonera izquierda: costado, piso y zócalo',
      'Cajonera izquierda: otro costado',
      'Gabinete derecho: costado, piso y zócalo',
      'Gabinete derecho: otro costado',
    ]);
    const names = (key: string) => a.steps.find((s) => s.key === key)!.add.map((i) => a.scene[i].name);
    expect(names('a-base-2')).toEqual(['Lateral interior', 'Piso', 'Zócalo']);
    expect(names('a-faldon')).toEqual(['Faldón']);
    expect(names('a-fondo')).toEqual(['Fondo', 'Fondo']);
    expect(a.steps.find((s) => s.key === 'a-fondo')?.view).toBe('atras');
  });

  it('escritorio simple: un lateral queda quieto, se suman faldón y el otro lateral, y la tapa', () => {
    const { a } = plan('escritorio-simple');
    expect(a.steps.map((s) => s.key)).toEqual(['a-faldon', 'a-techo', 'a-terminar']);
    expect(a.steps[0].fixed).toHaveLength(1);
    expect(a.prep.map((s) => s.key)).toEqual(['cortes', 'marcar', 'perforar']);
  });

  it('cómoda (frentes superpuestos, escalonados): tornillos y clavos suman lo de la lista de compras', () => {
    const { a, r } = plan('comoda');
    expect(a.hardware.find((h) => h.kind === 'tornillo')?.qty).toBe(r.counts.screws);
    expect(a.hardware.filter((h) => h.kind === 'clavo').reduce((s, h) => s + h.qty, 0)).toBe(r.counts.backNails);
    const added = a.steps.flatMap((s) => s.add);
    expect(new Set(added).size).toBe(added.length);
    expect(added.length).toBe(a.scene.length);
    expect(a.steps.find((s) => s.key === 'a-cajones')?.detail).toContain('separadores de 3 mm');
  });

  it('fondos de cajón en ranura: sin clavos en los cajones y la ranura se pide con los cortes', () => {
    const { a, r } = plan('cajonera', (u) => {
      u.drawers = { ...u.drawers, bottom: 'ranura', slide: 'cierre-suave' };
    });
    const cajones = a.steps.find((s) => s.key === 'a-cajones')!;
    expect(cajones.hardware.some((h) => h.kind === 'clavo')).toBe(false);
    expect(cajones.hardware.find((h) => h.kind === 'corredera')).toMatchObject({ label: 'Par de correderas telescópicas con cierre suave', qty: 3 });
    expect(cajones.detail).toContain('ranura');
    expect(a.hardware.filter((h) => h.kind === 'clavo').reduce((s, h) => s + h.qty, 0)).toBe(r.counts.backNails);
    expect(a.hardware.find((h) => h.kind === 'tornillo')?.qty).toBe(r.counts.screws);
    expect(a.prep.find((s) => s.key === 'cortes')?.detail).toContain('ranura para el fondo de los cajones');
  });

  it('correderas de rodillos: se colocan por el borde de abajo de la caja', () => {
    const { a } = plan('cajonera', (u) => {
      u.drawers = { ...u.drawers, slide: 'rodillo' };
    });
    const cajones = a.steps.find((s) => s.key === 'a-cajones')!;
    expect(cajones.hardware.find((h) => h.kind === 'corredera')?.label).toBe('Par de correderas de rodillos');
    expect(cajones.detail).toContain('Correderas de rodillos');
  });
});
