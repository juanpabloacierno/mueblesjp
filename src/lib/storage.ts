import type { CatalogBoard } from './catalog';
import { DEFAULT_MATERIAL, PRESETS, createFromPreset, normalizeMaterial, normalizeUnit } from './defaults';
import { tr } from './i18n';
import { CUT_KEY, backBoardKey, boardKey, edgeKey, type PriceList } from './shopping';
import type { Furniture, LegacyPrices, Material } from './types';

const KEY = 'mueblesjp:v1';

export interface AppState {
  projects: Furniture[];
  activeId: string;
  /** Material que se copia a cada mueble nuevo. */
  defaults: { material: Material };
  /** Precios por ítem de la lista de compras, compartidos por todos los muebles. */
  priceList: PriceList;
  /** Tableros que cargó el usuario además del catálogo ("Mis tableros"). */
  customBoards: CatalogBoard[];
}

export function initialState(): AppState {
  const sample = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!);
  sample.name = tr('Librero (ejemplo)', 'Bookcase (example)');
  return {
    projects: [sample],
    activeId: sample.id,
    defaults: { material: { ...DEFAULT_MATERIAL } },
    priceList: {},
    customBoards: [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    return parseState(JSON.parse(raw));
  } catch {
    return initialState();
  }
}

export function parseState(data: unknown): AppState {
  const d = data as Partial<AppState> & { projects?: (Partial<Furniture> & { prices?: LegacyPrices })[] };
  if (!d || !Array.isArray(d.projects) || d.projects.length === 0) throw new Error(tr('El archivo no tiene muebles', 'The file has no units'));
  const priceList: PriceList = { ...(d.priceList ?? {}) };

  // Versión anterior: precios guardados en cada mueble.
  for (const p of d.projects) {
    if (!p.prices) continue;
    const material = normalizeMaterial(p.material);
    const set = (key: string, value: number) => {
      if (value > 0 && !(priceList[key] > 0)) priceList[key] = value;
    };
    set(boardKey(material), p.prices.board);
    set(backBoardKey(material), p.prices.backBoard);
    set(edgeKey(material), p.prices.edgePerMeter);
    set(CUT_KEY, p.prices.cutPerBoard);
  }

  const projects = d.projects.map((p) => normalizeUnit(p));
  const activeId = projects.some((p) => p.id === d.activeId) ? (d.activeId as string) : projects[0].id;
  return {
    projects,
    activeId,
    defaults: { material: d.defaults?.material ? normalizeMaterial(d.defaults.material) : { ...DEFAULT_MATERIAL } },
    priceList,
    customBoards: Array.isArray(d.customBoards) ? d.customBoards.map((b) => ({ ...b, custom: true })) : [],
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento disponible (modo privado): la app sigue funcionando sin guardar.
  }
}
