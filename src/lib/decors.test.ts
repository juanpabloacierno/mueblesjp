import { describe, expect, it } from 'vitest';
import { decorLook } from './decor';
import { DECORS, decorsFor, decorsForBoard, lineLabel, matchDecor } from './decors';
import { setLang } from './i18n';

describe('catálogo de diseños', () => {
  it('tiene diseños de las tres marcas, sin repetidos y con color válido', () => {
    for (const brand of ['Egger', 'Faplac', 'Sadepan']) {
      const list = decorsFor(brand);
      expect(list.length).toBeGreaterThan(20);
      expect(new Set(list.map((d) => d.name)).size).toBe(list.length);
    }
    expect(DECORS.every((d) => /^#[0-9a-f]{6}$/i.test(d.hex))).toBe(true);
  });

  it('filtra por tipo y medida de placa (Táctil solo en 2750 × 1300)', () => {
    const tactil = decorsForBoard('Faplac', 'melamina-mdf', 2750, 1300);
    expect(tactil.map((d) => d.name)).toEqual(['White Extreme Gloss 944', 'Grey Extreme Matt', 'Black Extreme Matt']);
    const comun = decorsForBoard('Faplac', 'melamina', 2750, 1830);
    expect(comun.some((d) => d.line.startsWith('Táctil'))).toBe(false);
    expect(comun.some((d) => d.name === 'Roble Escandinavo 098')).toBe(true);
  });

  it('reconoce el nombre sin código y el nombre de los comercios', () => {
    expect(matchDecor(decorsFor('Egger'), 'Blanco')?.name).toBe('Blanco W954');
    expect(matchDecor(decorsFor('Egger'), 'Roble Den Marrón')?.code).toBe('H1399');
    expect(matchDecor(decorsFor('Sadepan'), 'Cedro')?.name).toBe('Ciliegio Europeo 563');
    expect(decorLook('Sadepan', 'Wengue', 'melamina', false)).toEqual({ hex: '#3b2a22', wood: true });
    expect(decorLook('Egger', 'Roble Kendal Natural H3170', 'melamina', false).wood).toBe(true);
    // Un color que no está en el catálogo se aproxima por el nombre.
    expect(decorLook('Otra', 'Roble gris claro', 'melamina', true)).toEqual({ hex: '#a59d92', wood: true });
    // También en inglés, para quien escribe el color en ese idioma.
    expect(decorLook('Otra', 'Light grey oak', 'melamina', true)).toEqual({ hex: '#a59d92', wood: true });
  });

  it('traduce las líneas descriptivas y deja los nombres comerciales', () => {
    expect(lineLabel('Piacere (maderados)')).toBe('Piacere (maderas)');
    setLang('en');
    try {
      expect(lineLabel('Lisos')).toBe('Solid colors');
      expect(lineLabel('Nature')).toBe('Nature');
    } finally {
      setLang('es');
    }
  });
});
