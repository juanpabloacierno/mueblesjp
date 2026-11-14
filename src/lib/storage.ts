import { DEFAULT_MATERIAL, DEFAULT_PRICES, PRESETS, createFromPreset, normalizeUnit } from './defaults';
import type { Furniture, Material, Prices } from './types';

const KEY = 'mueblesjp:v1';

export interface AppState {
  projects: Furniture[];
  activeId: string;
  /** Material y precios que se copian a cada mueble nuevo. */
  defaults: { material: Material; prices: Prices };
}

export function initialState(): AppState {
  const sample = createFromPreset(PRESETS[0]);
  sample.name = 'Biblioteca (ejemplo)';
  return {
    projects: [sample],
    activeId: sample.id,
    defaults: { material: { ...DEFAULT_MATERIAL }, prices: { ...DEFAULT_PRICES } },
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
  const d = data as Partial<AppState>;
  if (!d || !Array.isArray(d.projects) || d.projects.length === 0) throw new Error('Archivo sin muebles');
  const projects = d.projects.map((p) => normalizeUnit(p));
  const activeId = projects.some((p) => p.id === d.activeId) ? (d.activeId as string) : projects[0].id;
  return {
    projects,
    activeId,
    defaults: {
      material: { ...DEFAULT_MATERIAL, ...d.defaults?.material },
      prices: { ...DEFAULT_PRICES, ...d.defaults?.prices },
    },
  };
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Sin almacenamiento disponible (modo privado): la app sigue funcionando sin guardar.
  }
}
