import { describe, expect, it } from 'vitest';
import { cutListCsv, summarize } from './cutlist';
import { PRESETS, createFromPreset } from './defaults';
import { setLang } from './i18n';
import { computeShelfUnit } from './shelf';
import { boardKey, buildShoppingList, isChecked, shoppingText, shoppingTotals } from './shopping';
import { parseState } from './storage';
import type { ShelfUnit } from './types';

function setup(key: string, tweak?: (u: ShelfUnit) => void) {
  const unit = createFromPreset(PRESETS.find((p) => p.key === key)!);
  tweak?.(unit);
  const result = computeShelfUnit(unit);
  const items = buildShoppingList(unit, result, summarize(unit, result.pieces));
  const get = (k: string) => items.find((i) => i.key === k);
  return { unit, result, items, get };
}

describe('lista de compras', () => {
  it('biblioteca sin puertas: placas, tapacanto, pernos y fijaciones', () => {
    const { items, get, unit } = setup('biblioteca');
    expect(get(boardKey(unit.material))).toMatchObject({ qty: 1, unit: 'placa', defaultOn: true });
    expect(get('corte-placa')).toMatchObject({ qty: 2 });
    expect(get('perno-estante')).toMatchObject({ qty: 16 });
    expect(get('tornillo-4x50')).toMatchObject({ qty: 12 });
    expect(get('clavo-fondo')?.qty).toBeGreaterThan(0);
    expect(items.some((i) => i.key.startsWith('bisagra'))).toBe(false);
    expect(get('tornillo-3.5x16')).toBeUndefined();
    // Sin zócalo no hay regatones; esta tiene zócalo.
    expect(get('regaton')).toBeUndefined();
  });

  it('las herramientas y los opcionales vienen sin marcar', () => {
    const { items, unit } = setup('biblioteca');
    const tools = items.filter((i) => i.category === 'herramientas');
    expect(tools.length).toBeGreaterThan(0);
    expect(tools.every((i) => !isChecked(unit, i))).toBe(true);
    expect(items.filter((i) => i.optional).every((i) => !i.defaultOn)).toBe(true);
  });

  it('puertas con bisagras: bisagras, tiradores, tornillos y mecha de cazoleta', () => {
    const { get } = setup('biblioteca-puertas');
    expect(get('bisagra|recta')).toMatchObject({ qty: 4 });
    expect(get('tirador')).toMatchObject({ qty: 2 });
    expect(get('tornillo-3.5x16')).toMatchObject({ qty: 16 });
    expect(get('amortiguador')).toMatchObject({ qty: 2, defaultOn: false });
    expect(get('mecha-cazoleta')).toMatchObject({ defaultOn: false });
  });

  it('dos columnas con una puerta cada una abren hacia los costados: solo bisagras rectas', () => {
    const { get } = setup('aparador');
    expect(get('bisagra|recta')?.qty).toBe(4);
    expect(get('bisagra|codo9')).toBeUndefined();
  });

  it('corredizas: rieles, ruedas y tiradores embutidos', () => {
    const { get } = setup('armario');
    expect(get('riel-superior')).toMatchObject({ qty: 1.164, unit: 'm' });
    expect(get('riel-inferior')).toMatchObject({ qty: 1.164 });
    expect(get('ruedas-corrediza')).toMatchObject({ qty: 2, unit: 'juego' });
    expect(get('tirador-embutido')).toMatchObject({ qty: 2 });
    expect(get('tornillo-3.5x16')).toMatchObject({ qty: 18 });
    expect(get('tirador')).toBeUndefined();
  });

  it('suma el total con los precios cargados y cuenta los que faltan', () => {
    const { unit, items } = setup('biblioteca');
    const prices = { [boardKey(unit.material)]: 60000, 'perno-estante': 50 };
    const totals = shoppingTotals(unit, items, prices);
    expect(totals.total).toBe(60000 + 16 * 50);
    expect(totals.byCategory.placas).toBe(60000);
    expect(totals.missingPrice).toBe(totals.checked - 2);
  });

  it('se puede desmarcar un ítem y no entra en el total ni en el texto', () => {
    const { unit, items } = setup('biblioteca', (u) => {
      u.shopping = { 'perno-estante': false, minifix: true };
    });
    const prices = { 'perno-estante': 50 };
    expect(shoppingTotals(unit, items, prices).total).toBe(0);
    const text = shoppingText(unit, items, prices);
    expect(text).not.toContain('pernos');
    expect(text).toContain('Minifix');
    expect(text).toContain('1 tablero · Tablero de melamina Egger Blanco 18 mm');
  });

  it('pasa los precios de la versión anterior a la lista de precios', () => {
    const old = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!) as ShelfUnit & { prices?: unknown };
    old.prices = { board: 55000, backBoard: 0, edgePerMeter: 900, cutPerBoard: 0 };
    const state = parseState({ projects: [old], activeId: old.id });
    expect(state.priceList[boardKey(old.material)]).toBe(55000);
    expect(state.priceList['tapacanto|blanco|22x0.45']).toBe(900);
    expect('prices' in state.projects[0]).toBe(false);
    expect(state.projects[0].doors.type).toBe('ninguna');
  });

  it('en inglés cambian los textos, no las claves ni las cantidades', () => {
    const es = setup('placard-corredizo');
    setLang('en');
    try {
      const en = setup('placard-corredizo');
      expect(en.items.map((i) => [i.key, i.qty, i.unit, i.defaultOn])).toEqual(es.items.map((i) => [i.key, i.qty, i.unit, i.defaultOn]));
      expect(en.get(boardKey(en.unit.material))?.name).toMatch(/^Board: /);
      expect(en.get('tornillo-4x50')?.name).toBe('Particleboard screws 4 × 50 mm');
      expect(shoppingText(en.unit, en.items, {})).toContain('*Shopping list: ');
      expect(cutListCsv(en.unit, en.result.pieces).split('\n')[0]).toMatch(/^Code,Piece,Quantity,/);
    } finally {
      setLang('es');
    }
  });

  it('correderas según su tipo; las telescópicas conservan la clave de antes', () => {
    const tele = setup('cajonera');
    const len = tele.result.drawers[0].slide;
    expect(tele.get(`corredera|${len}`)).toMatchObject({ qty: 3, name: `Correderas telescópicas de ${len} mm` });
    const soft = setup('cajonera', (u) => void (u.drawers.slide = 'cierre-suave'));
    expect(soft.get(`corredera|cierre-suave|${len}`)?.name).toBe(`Correderas telescópicas con cierre suave de ${len} mm`);
    expect(soft.get(`corredera|${len}`)).toBeUndefined();
    const roller = setup('cajonera', (u) => void (u.drawers.slide = 'rodillo'));
    const rl = roller.result.drawers[0].slide;
    expect(roller.get(`corredera|rodillo|${rl}`)?.name).toBe(`Correderas de rodillos de ${rl} mm`);
  });

  it('fondos de cajón en ranura: sin clavos para los cajones, con cola y la herramienta para ranurar', () => {
    const nailed = setup('cajonera');
    const grooved = setup('cajonera', (u) => void (u.drawers.bottom = 'ranura'));
    expect(nailed.get('clavo-fondo')?.name).toContain('fondos');
    expect(nailed.get('clavo-fondo')?.note).toContain('cajón');
    expect(grooved.get('clavo-fondo')?.qty).toBe(grooved.result.counts.backNails);
    expect(grooved.get('clavo-fondo')?.qty).toBeLessThan(nailed.get('clavo-fondo')!.qty);
    expect(grooved.get('clavo-fondo')?.note).not.toContain('cajón');
    expect(grooved.get('cola-vinilica')).toMatchObject({ defaultOn: true });
    expect(grooved.get('fresadora-ranura')).toMatchObject({ category: 'herramientas', defaultOn: false });
    expect(nailed.get('fresadora-ranura')).toBeUndefined();
  });
});
