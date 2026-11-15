import { afterEach, describe, expect, it } from 'vitest';
import { buildAssembly } from './assembly';
import { summarize } from './cutlist';
import { PRESETS, createFromPreset } from './defaults';
import { pieceName, setLang, type Lang } from './i18n';
import { resolveUnit } from './resolve';
import { computeShelfUnit } from './shelf';
import { CATEGORIES, buildShoppingList } from './shopping';
import type { ShelfUnit } from './types';

/** Calcula todo un mueble en un idioma. */
function run(unit: ShelfUnit, lang: Lang) {
  setLang(lang);
  const built = resolveUnit(unit);
  const r = computeShelfUnit(built);
  const summary = summarize(built, r.pieces);
  const shopping = buildShoppingList(built, r, summary);
  const plan = buildAssembly(built, r, summary);
  return { r, summary, shopping, plan };
}

/** Todos los textos visibles que salen del cálculo. */
function texts(out: ReturnType<typeof run>): string[] {
  const { r, summary, shopping, plan } = out;
  return [
    ...r.warnings.map((w) => w.text),
    ...summary.warnings.map((w) => w.text),
    ...r.pieces.flatMap((p) => [pieceName(p.name), ...p.notes]),
    ...shopping.flatMap((i) => [i.name, i.note ?? '']),
    ...CATEGORIES.flatMap((c) => [c.label, c.hint ?? '']),
    ...plan.prep.flatMap((s) => [s.title, s.detail]),
    ...plan.steps.flatMap((s) => [s.title, s.detail, ...s.pieces.map((p) => pieceName(p.name)), ...s.hardware.map((h) => h.label)]),
    ...plan.hardware.map((h) => h.label),
  ].filter(Boolean);
}

/** Variantes que cubren puertas, cajones, zapateros, maletero y colores interior/exterior. */
function units(): ShelfUnit[] {
  setLang('es');
  const list = PRESETS.map((p) => createFromPreset(p));
  const twoTone = createFromPreset(PRESETS.find((p) => p.key === 'placard-batiente')!);
  twoTone.material.interior.enabled = true;
  twoTone.maletero.enabled = true;
  list.push(twoTone);
  return list;
}

/** Palabras sueltas (sirve también con acentos, donde \\b no funciona). */
const words = (list: string) => new RegExp(`(?<!\\p{L})(${list})(?!\\p{L})`, 'iu');

// Palabras comunes del español que no deberían quedar en inglés.
const SPANISH = words('el|los|las|del|para|con|que|por|una|y|en|de|puerta|estante|tablero|cajón|tornillos?|clavos?');
// Voseo y regionalismos argentinos que no deberían quedar en español neutro.
const VOSEO = words(
  'necesitás|tenés|podés|querés|sabés|usás|fijate|asegurate|acordate|medí|cortá|armá|poné|hacé|tené|elegí|corregí|probá|cerrá|colgá|usá|marcá|pegá|atornillá|clavá|colocá|apoyá|perforá|revisá|agregá|sacá|dejá|tildá|anotá|comprá|pedí|seguí|empezá|ponelo|dejalo|apretá|centrá|encolá|limpiá|lijá|levantá|subí|bajá|abrí|ajustá|regulá|montá|presentá|calzá|deslizá|repetí',
);
const REGIONAL = words('placas?|placard|placares|barral(es)?|fibrofácil|tarugos?|mechas?|agujereadora|tild\\p{L}*|acá|remeras?|camperas?|polleras?|corralón');

afterEach(() => setLang('es'));

describe('idiomas', () => {
  it('los cálculos son iguales en español y en inglés', () => {
    for (const unit of units()) {
      const es = run(unit, 'es');
      const en = run(unit, 'en');
      const shape = (o: ReturnType<typeof run>) => ({
        pieces: o.r.pieces.map((p) => [p.code, p.name, p.qty, p.length, p.width, p.thickness, p.finish, p.material]),
        warnings: o.r.warnings.map((w) => w.level),
        boards: o.summary.boards.map((b) => b.pack.sheets.length),
        shopping: o.shopping.map((i) => [i.key, i.qty, i.unit, i.category, i.defaultOn]),
        steps: o.plan.steps.map((s) => [s.key, s.add, s.pieces.map((p) => [p.code, p.qty]), s.hardware.map((h) => [h.kind, h.qty])]),
        prep: o.plan.prep.map((s) => s.key),
      });
      expect(shape(en), unit.name).toEqual(shape(es));
    }
  });

  it('en inglés no quedan textos en español', () => {
    for (const unit of units()) {
      for (const t of texts(run(unit, 'en'))) expect(t, unit.name).not.toMatch(SPANISH);
    }
  });

  it('en español no hay voseo ni regionalismos', () => {
    for (const unit of units()) {
      for (const t of texts(run(unit, 'es'))) {
        expect(t, unit.name).not.toMatch(VOSEO);
        expect(t, unit.name).not.toMatch(REGIONAL);
      }
    }
  });
});
