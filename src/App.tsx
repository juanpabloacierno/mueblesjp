import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { BoardsView } from './components/BoardsView';
import { CutList } from './components/CutList';
import { PlanPanel } from './components/PlanPanel';
import { ShelfForm, type Updater } from './components/ShelfForm';
import { ShoppingPanel } from './components/ShoppingPanel';
import { StepsPanel } from './components/StepsPanel';

// La vista 3D (three.js) se carga recién cuando se abre la pestaña.
const Furniture3D = lazy(() => import('./components/Furniture3D'));
import type { CatalogBoard } from './lib/catalog';
import { resolveUnit } from './lib/resolve';
import { buildAssembly } from './lib/assembly';
import { downloadFile } from './components/ui';
import { summarize } from './lib/cutlist';
import { buildShoppingList, shoppingTotals } from './lib/shopping';
import { PRESETS, createFromPreset } from './lib/defaults';
import { mm, money, newId, num } from './lib/format';
import { computeShelfUnit } from './lib/shelf';
import { loadState, parseState, saveState, type AppState } from './lib/storage';
import type { Warning } from './lib/types';
import { LANGS, loadLang, saveLang, setLang, tr, type Lang } from './lib/i18n';

type Tab = 'medidas' | 'plano' | '3d' | 'despiece' | 'placas' | 'compras' | 'armado';

const resultTabs = (): { key: Exclude<Tab, 'medidas'>; label: string }[] => [
  { key: 'plano', label: tr('Plano y espacios', 'Plan & spaces') },
  { key: '3d', label: '3D' },
  { key: 'despiece', label: tr('Despiece', 'Cut list') },
  { key: 'placas', label: tr('Tableros', 'Boards') },
  { key: 'compras', label: tr('Compras', 'Shopping') },
  { key: 'armado', label: tr('Armado', 'Assembly') },
];

function useIsWide() {
  const query = '(min-width: 960px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return wide;
}

/** "3 tableros de melamina", "1 board interior (Blanco)"… sin el número. */
function boardStatLabel(sheets: number, finish: 'interior' | 'exterior' | null, color: string, boardType: string): string {
  const one = sheets === 1;
  if (finish) {
    const es = `${one ? 'tablero' : 'tableros'} ${finish} (${color})`;
    const en = `${finish} ${one ? 'board' : 'boards'} (${color})`;
    return tr(es, en);
  }
  const kind = boardType === 'mdf' ? ['de MDF', 'MDF'] : boardType === 'aglomerado' ? ['de aglomerado', 'particleboard'] : ['de melamina', 'melamine'];
  return tr(`${one ? 'tablero' : 'tableros'} ${kind[0]}`, `${kind[1]} ${one ? 'board' : 'boards'}`);
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="4" fill="var(--accent)" />
      <path d="M9 7v18M23 7v18M9 12.5h14M9 18.5h14" stroke="var(--accent-ink)" strokeWidth="2.6" fill="none" />
    </svg>
  );
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(loadLang);
  // El idioma se fija antes de calcular y dibujar: todo lo de abajo lo lee.
  setLang(lang);
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('plano');
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | 'nuevo' | 'mas'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wide = useIsWide();
  const topbarRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
    document.title = tr('MueblesJP · Despiece de melamina', 'MueblesJP · Melamine cut list');
  }, [lang]);

  // Altura real de la barra superior para las piezas pegajosas.
  useLayoutEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const unit = state.projects.find((p) => p.id === state.activeId) ?? state.projects[0];
  // Medidas reales (en empotrados, el hueco menos las holguras) para todo lo que se calcula y dibuja.
  const built = useMemo(() => resolveUnit(unit), [unit]);
  // `lang` en las dependencias: los avisos, la lista de compras y los pasos se escriben en el idioma activo.
  const result = useMemo(() => computeShelfUnit(built), [built, lang]);
  const summary = useMemo(() => summarize(built, result.pieces), [built, result]);
  const shopping = useMemo(() => buildShoppingList(built, result, summary), [built, result, summary]);
  const assembly = useMemo(() => buildAssembly(built, result, summary), [built, result, summary]);
  const RESULT_TABS = resultTabs();
  const total = shoppingTotals(built, shopping, state.priceList).total;

  const update: Updater = useCallback(
    (fn) =>
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) => {
          if (p.id !== s.activeId) return p;
          const draft = structuredClone(p);
          fn(draft);
          draft.updatedAt = Date.now();
          return draft;
        }),
      })),
    [],
  );

  const notify = useCallback((msg: string) => setToast(msg), []);

  const addFromPreset = (key: string) => {
    const preset = PRESETS.find((p) => p.key === key)!;
    const created = createFromPreset(preset, state.defaults.material);
    setState((s) => ({ ...s, projects: [...s.projects, created], activeId: created.id }));
    setMenu(null);
    setTab(wide ? 'plano' : 'medidas');
    notify(tr(`Nuevo mueble: ${preset.label}`, `New unit: ${preset.label}`));
  };

  const duplicate = () => {
    const copy = { ...structuredClone(unit), id: newId(), name: `${unit.name} ${tr('(copia)', '(copy)')}`, updatedAt: Date.now() };
    setState((s) => ({ ...s, projects: [...s.projects, copy], activeId: copy.id }));
    setMenu(null);
    notify(tr('Mueble duplicado', 'Unit duplicated'));
  };

  const remove = () => {
    setState((s) => {
      const rest = s.projects.filter((p) => p.id !== s.activeId);
      if (rest.length === 0) {
        const fresh = createFromPreset(PRESETS.find((p) => p.key === 'biblioteca')!, s.defaults.material);
        return { ...s, projects: [fresh], activeId: fresh.id };
      }
      return { ...s, projects: rest, activeId: rest[rest.length - 1].id };
    });
    setConfirmDelete(false);
    setMenu(null);
    notify(tr('Mueble eliminado', 'Unit deleted'));
  };

  const importFile = async (file: File) => {
    try {
      const imported = parseState(JSON.parse(await file.text()));
      setState((s) => {
        const ids = new Set(s.projects.map((p) => p.id));
        const incoming = imported.projects.map((p) => (ids.has(p.id) ? { ...p, id: newId() } : p));
        return { ...s, projects: [...s.projects, ...incoming], activeId: incoming[0].id };
      });
      notify(tr(`Se importaron ${imported.projects.length} muebles`, `Imported ${imported.projects.length} units`));
    } catch {
      notify(tr('No se pudo leer el archivo: debe ser un respaldo de esta app (.json)', 'Could not read the file: it must be a backup from this app (.json)'));
    }
  };

  const allWarnings: Warning[] = [...result.warnings, ...summary.warnings];
  const order = { error: 0, aviso: 1, info: 2 } as const;
  allWarnings.sort((a, b) => order[a.level] - order[b.level]);
  const hasPieces = result.pieces.length > 0;
  const totalPieces = result.pieces.reduce((s, p) => s + p.qty, 0);
  const activeResultTab: Exclude<Tab, 'medidas'> = tab === 'medidas' ? 'plano' : tab;

  return (
    <>
      <header className="topbar" ref={topbarRef}>
        <div className="topbar-inner">
          <div className="brand">
            <BrandMark />
            <div>
              <h1>MueblesJP</h1>
              <p>{tr('Despiece de melamina', 'Melamine cut list')}</p>
            </div>
          </div>
          <div className="segmented lang-switch" role="radiogroup" aria-label={tr('Idioma', 'Language')}>
            {LANGS.map((l) => (
              <button key={l.key} type="button" role="radio" aria-checked={lang === l.key} lang={l.key} title={l.name} onClick={() => setLangState(l.key)}>
                {l.label}
              </button>
            ))}
          </div>
          <div className="projectbar">
            <label className="field-label" htmlFor="project-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              {tr('Mueble', 'Unit')}
            </label>
            <select id="project-select" value={unit.id} onChange={(e) => setState((s) => ({ ...s, activeId: e.target.value }))}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || tr('Sin nombre', 'Untitled')}
                </option>
              ))}
            </select>
            <div>
              <button type="button" className="btn btn-primary" aria-expanded={menu === 'nuevo'} onClick={() => setMenu((m) => (m === 'nuevo' ? null : 'nuevo'))}>
                {tr('+ Nuevo', '+ New')}
              </button>
              {menu === 'nuevo' && (
                <div className="popover" role="menu">
                  {(['placard', 'estanteria'] as const).map((kind) => (
                    <div key={kind} role="group" aria-label={kind === 'placard' ? tr('Clósets', 'Wardrobes') : tr('Estanterías y muebles', 'Shelving and cabinets')}>
                      <div className="popover-group">{kind === 'placard' ? tr('Clósets', 'Wardrobes') : tr('Estanterías y muebles', 'Shelving and cabinets')}</div>
                      {PRESETS.filter((p) => (p.unit.kind ?? 'estanteria') === kind).map((p) => (
                        <button key={p.key} type="button" role="menuitem" onClick={() => addFromPreset(p.key)}>
                          <strong>{p.label}</strong>
                          <span>{p.description}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                className="btn"
                aria-expanded={menu === 'mas'}
                aria-label={tr('Más acciones', 'More actions')}
                onClick={() => {
                  setConfirmDelete(false);
                  setMenu((m) => (m === 'mas' ? null : 'mas'));
                }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <circle cx="3" cy="8" r="1.5" />
                  <circle cx="8" cy="8" r="1.5" />
                  <circle cx="13" cy="8" r="1.5" />
                </svg>
                <span className="menu-label">{tr('Más', 'More')}</span>
              </button>
              {menu === 'mas' && (
                <div className="popover" role="menu">
                  <button type="button" role="menuitem" onClick={duplicate}>
                    <strong>{tr('Duplicar', 'Duplicate')}</strong>
                    <span>{tr(`Copia de “${unit.name}” para hacer una variante`, `Copy of “${unit.name}” to make a variant`)}</span>
                  </button>
                  {!__SINGLE_FILE__ && (
                    <>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          downloadFile(`mueblesjp-respaldo.json`, JSON.stringify(state, null, 2), 'application/json');
                          setMenu(null);
                        }}
                      >
                        <strong>{tr('Descargar respaldo', 'Download backup')}</strong>
                        <span>{tr('Todos tus muebles en un archivo .json', 'All your units in a .json file')}</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          fileRef.current?.click();
                          setMenu(null);
                        }}
                      >
                        <strong>{tr('Importar respaldo', 'Import backup')}</strong>
                        <span>{tr('Agrega los muebles de un archivo .json', 'Adds the units from a .json file')}</span>
                      </button>
                    </>
                  )}
                  <hr />
                  {confirmDelete ? (
                    <button type="button" role="menuitem" className="danger" onClick={remove}>
                      <strong>{tr(`Sí, eliminar “${unit.name}”`, `Yes, delete “${unit.name}”`)}</strong>
                      <span>{tr('No se puede deshacer', 'This cannot be undone')}</span>
                    </button>
                  ) : (
                    <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDelete(true)}>
                      <strong>{tr('Eliminar este mueble', 'Delete this unit')}</strong>
                      <span>{tr('Te pide confirmación', 'Asks for confirmation')}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
            {!__SINGLE_FILE__ && (
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importFile(f);
                  e.target.value = '';
                }}
              />
            )}
          </div>
        </div>
      </header>

      <nav className="tabs mobile-tabs" role="tablist" aria-label={tr('Secciones', 'Sections')}>
        {[{ key: 'medidas' as Tab, label: tr('Medidas', 'Dimensions') }, ...RESULT_TABS.map((t) => ({ ...t, label: t.key === 'plano' ? tr('Plano', 'Plan') : t.label }))].map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="workspace" key={lang}>
        <aside className={`editor ${!wide && tab !== 'medidas' ? 'is-inactive' : ''}`} aria-label={tr('Medidas del mueble', 'Unit dimensions')}>
          <ShelfForm
            unit={unit}
            result={result}
            update={update}
            onSaveDefaults={() => {
              setState((s) => ({ ...s, defaults: { material: { ...unit.material } } }));
              notify(tr('Guardado: los muebles nuevos usan estos tableros', 'Saved: new units will use these boards'));
            }}
            customBoards={state.customBoards}
            onSaveBoard={(board) => {
              setState((s) => {
                const same = (b: CatalogBoard) => b.brand === board.brand && b.type === board.type && b.length === board.length && b.width === board.width;
                const existing = s.customBoards.find(same);
                const customBoards = existing
                  ? s.customBoards.map((b) => (same(b) ? { ...b, thicknesses: [...new Set([...b.thicknesses, ...board.thicknesses])].sort((x, y) => x - y) } : b))
                  : [...s.customBoards, board];
                return { ...s, customBoards };
              });
              notify(tr(`Guardado en tus tableros: ${board.brand}`, `Saved to your boards: ${board.brand}`));
            }}
            onRemoveBoard={(board) => {
              setState((s) => ({
                ...s,
                customBoards: s.customBoards.filter((b) => !(b.brand === board.brand && b.type === board.type && b.length === board.length && b.width === board.width)),
              }));
              notify(tr(`Quitado de tus tableros: ${board.brand}`, `Removed from your boards: ${board.brand}`));
            }}
          />
        </aside>

        <section className={`results ${!wide && tab === 'medidas' ? 'is-inactive' : ''}`} aria-label={tr('Resultados', 'Results')}>
          <div className="results-head">
            <h2>{unit.name || tr('Sin nombre', 'Untitled')}</h2>
            <span className="dims">
              {mm(result.size.width)} × {mm(result.size.height)} × {mm(result.size.depth + result.doors.extraDepth)} mm
            </span>
          </div>

          {hasPieces && (
            <div className="stats">
              {summary.boards.map((b) => (
                <div className="stat" key={b.label}>
                  <span className="stat-value">{b.pack.sheets.length}</span>
                  <span className="stat-label">
                    {boardStatLabel(b.pack.sheets.length, summary.interior ? (b.finish === 'interior' ? 'interior' : 'exterior') : null, b.material.color, b.material.boardType)}
                  </span>
                </div>
              ))}
              {summary.fondo && (
                <div className="stat">
                  <span className="stat-value">{summary.fondo.pack.sheets.length}</span>
                  <span className="stat-label">{summary.fondo.pack.sheets.length === 1 ? tr('tablero de fondo', 'back panel board') : tr('tableros de fondo', 'back panel boards')}</span>
                </div>
              )}
              <div className="stat">
                <span className="stat-value">
                  {num(summary.edgeMeters, 1)}
                  <small>m</small>
                </span>
                <span className="stat-label">{tr('de tapacanto', 'of edge banding')}</span>
              </div>
              <div className="stat">
                <span className="stat-value">{totalPieces}</span>
                <span className="stat-label">{tr('piezas a cortar', 'pieces to cut')}</span>
              </div>
              {result.doors.doors.length > 0 && (
                <div className="stat">
                  <span className="stat-value">{result.doors.doors.length}</span>
                  <span className="stat-label">
                    {unit.doors.type === 'corrediza'
                      ? tr('hojas corredizas', 'sliding door panels')
                      : result.doors.doors.length === 1
                        ? tr('puerta con bisagras', 'hinged door')
                        : tr('puertas con bisagras', 'hinged doors')}
                  </span>
                </div>
              )}
              {total > 0 && (
                <div className="stat">
                  <span className="stat-value">{money(total)}</span>
                  <span className="stat-label">{tr('materiales marcados', 'checked materials')}</span>
                </div>
              )}
            </div>
          )}

          {allWarnings.length > 0 && (
            <ul className="warnings">
              {allWarnings.map((w, i) => (
                <li key={i} className={`warning ${w.level}`}>
                  <span className="warning-tag">{w.level === 'error' ? 'Error' : w.level === 'aviso' ? tr('Atención', 'Warning') : tr('Consejo', 'Tip')}</span>
                  <span>{w.text}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="tabs desktop-tabs" role="tablist" aria-label={tr('Resultados', 'Results')}>
            {RESULT_TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={activeResultTab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className={`tab-panel ${activeResultTab === 'plano' ? '' : 'is-inactive'}`} role="tabpanel">
            {hasPieces ? <PlanPanel unit={built} result={result} /> : <p className="empty-note">{tr('Corrige los errores de arriba para ver el plano.', 'Fix the errors above to see the plan.')}</p>}
          </div>
          <div className={`tab-panel no-print ${activeResultTab === '3d' ? '' : 'is-inactive'}`} role="tabpanel">
            {activeResultTab === '3d' &&
              (hasPieces ? (
                <Suspense fallback={<p className="empty-note">{tr('Cargando la vista 3D…', 'Loading the 3D view…')}</p>}>
                  <Furniture3D unit={built} result={result} />
                </Suspense>
              ) : (
                <p className="empty-note">{tr('Corrige los errores de arriba para ver el mueble en 3D.', 'Fix the errors above to see the unit in 3D.')}</p>
              ))}
          </div>
          <div className={`tab-panel ${activeResultTab === 'despiece' ? '' : 'is-inactive'}`} role="tabpanel">
            <CutList unit={built} summary={summary} pieces={result.pieces} notify={notify} />
          </div>
          <div className={`tab-panel ${activeResultTab === 'placas' ? '' : 'is-inactive'}`} role="tabpanel">
            <BoardsView unit={built} summary={summary} />
          </div>
          <div className={`tab-panel ${activeResultTab === 'compras' ? '' : 'is-inactive'}`} role="tabpanel">
            <ShoppingPanel
              unit={built}
              items={shopping}
              prices={state.priceList}
              notify={notify}
              setPrice={(key, value) =>
                setState((s) => {
                  const priceList = { ...s.priceList };
                  if (value && value > 0) priceList[key] = value;
                  else delete priceList[key];
                  return { ...s, priceList };
                })
              }
              setChecked={(key, value) => update((d) => void (d.shopping[key] = value))}
              resetChecks={() => update((d) => void (d.shopping = {}))}
            />
          </div>
          <div className={`tab-panel ${activeResultTab === 'armado' ? '' : 'is-inactive'}`} role="tabpanel">
            <StepsPanel
              unit={built}
              plan={assembly}
              pieces={result.pieces}
              notify={notify}
              setDone={(key, value) => update((d) => void (d.progress[key] = value))}
              reset={() => update((d) => void (d.progress = {}))}
            />
          </div>
        </section>
      </main>

      {menu && <div style={{ position: 'fixed', inset: 0, zIndex: 19 }} onClick={() => setMenu(null)} aria-hidden="true" />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}
