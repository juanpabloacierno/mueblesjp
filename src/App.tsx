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

type Tab = 'medidas' | 'plano' | '3d' | 'despiece' | 'placas' | 'compras' | 'armado';

const RESULT_TABS: { key: Exclude<Tab, 'medidas'>; label: string }[] = [
  { key: 'plano', label: 'Plano y espacios' },
  { key: '3d', label: '3D' },
  { key: 'despiece', label: 'Despiece' },
  { key: 'placas', label: 'Placas' },
  { key: 'compras', label: 'Compras' },
  { key: 'armado', label: 'Armado' },
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

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect x="2" y="2" width="28" height="28" rx="4" fill="var(--accent)" />
      <path d="M9 7v18M23 7v18M9 12.5h14M9 18.5h14" stroke="var(--accent-ink)" strokeWidth="2.6" fill="none" />
    </svg>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('plano');
  const [toast, setToast] = useState<string | null>(null);
  const [menu, setMenu] = useState<null | 'nuevo' | 'mas'>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wide = useIsWide();
  const topbarRef = useRef<HTMLElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => saveState(state), [state]);

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
  const result = useMemo(() => computeShelfUnit(built), [built]);
  const summary = useMemo(() => summarize(built, result.pieces), [built, result]);
  const shopping = useMemo(() => buildShoppingList(built, result, summary), [built, result, summary]);
  const assembly = useMemo(() => buildAssembly(built, result, summary), [built, result, summary]);
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
    notify(`Nuevo mueble: ${preset.label}`);
  };

  const duplicate = () => {
    const copy = { ...structuredClone(unit), id: newId(), name: `${unit.name} (copia)`, updatedAt: Date.now() };
    setState((s) => ({ ...s, projects: [...s.projects, copy], activeId: copy.id }));
    setMenu(null);
    notify('Mueble duplicado');
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
    notify('Mueble eliminado');
  };

  const importFile = async (file: File) => {
    try {
      const imported = parseState(JSON.parse(await file.text()));
      setState((s) => {
        const ids = new Set(s.projects.map((p) => p.id));
        const incoming = imported.projects.map((p) => (ids.has(p.id) ? { ...p, id: newId() } : p));
        return { ...s, projects: [...s.projects, ...incoming], activeId: incoming[0].id };
      });
      notify(`Importados ${imported.projects.length} muebles`);
    } catch {
      notify('No se pudo leer el archivo: tiene que ser un respaldo de esta app (.json)');
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
              <p>Despiece de melamina</p>
            </div>
          </div>
          <div className="projectbar">
            <label className="field-label" htmlFor="project-select" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
              Mueble
            </label>
            <select id="project-select" value={unit.id} onChange={(e) => setState((s) => ({ ...s, activeId: e.target.value }))}>
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || 'Sin nombre'}
                </option>
              ))}
            </select>
            <div>
              <button type="button" className="btn btn-primary" aria-expanded={menu === 'nuevo'} onClick={() => setMenu((m) => (m === 'nuevo' ? null : 'nuevo'))}>
                + Nuevo
              </button>
              {menu === 'nuevo' && (
                <div className="popover" role="menu">
                  {(['placard', 'estanteria'] as const).map((kind) => (
                    <div key={kind} role="group" aria-label={kind === 'placard' ? 'Placares' : 'Estanterías y muebles'}>
                      <div className="popover-group">{kind === 'placard' ? 'Placares' : 'Estanterías y muebles'}</div>
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
                aria-label="Más acciones"
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
                <span className="menu-label">Más</span>
              </button>
              {menu === 'mas' && (
                <div className="popover" role="menu">
                  <button type="button" role="menuitem" onClick={duplicate}>
                    <strong>Duplicar</strong>
                    <span>Copia de “{unit.name}” para hacer una variante</span>
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
                        <strong>Descargar respaldo</strong>
                        <span>Todos tus muebles en un archivo .json</span>
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          fileRef.current?.click();
                          setMenu(null);
                        }}
                      >
                        <strong>Importar respaldo</strong>
                        <span>Agrega los muebles de un archivo .json</span>
                      </button>
                    </>
                  )}
                  <hr />
                  {confirmDelete ? (
                    <button type="button" role="menuitem" className="danger" onClick={remove}>
                      <strong>Sí, eliminar “{unit.name}”</strong>
                      <span>No se puede deshacer</span>
                    </button>
                  ) : (
                    <button type="button" role="menuitem" className="danger" onClick={() => setConfirmDelete(true)}>
                      <strong>Eliminar este mueble</strong>
                      <span>Te pide confirmación</span>
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

      <nav className="tabs mobile-tabs" role="tablist" aria-label="Secciones">
        {[{ key: 'medidas' as Tab, label: 'Medidas' }, ...RESULT_TABS.map((t) => ({ ...t, label: t.key === 'plano' ? 'Plano' : t.label }))].map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main className="workspace">
        <aside className={`editor ${!wide && tab !== 'medidas' ? 'is-inactive' : ''}`} aria-label="Medidas del mueble">
          <ShelfForm
            unit={unit}
            result={result}
            update={update}
            onSaveDefaults={() => {
              setState((s) => ({ ...s, defaults: { material: { ...unit.material } } }));
              notify('Guardado: los muebles nuevos usan estas placas');
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
              notify(`Guardada en tus placas: ${board.brand}`);
            }}
            onRemoveBoard={(board) => {
              setState((s) => ({
                ...s,
                customBoards: s.customBoards.filter((b) => !(b.brand === board.brand && b.type === board.type && b.length === board.length && b.width === board.width)),
              }));
              notify(`Quitada de tus placas: ${board.brand}`);
            }}
          />
        </aside>

        <section className={`results ${!wide && tab === 'medidas' ? 'is-inactive' : ''}`} aria-label="Resultados">
          <div className="results-head">
            <h2>{unit.name || 'Sin nombre'}</h2>
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
                    {b.pack.sheets.length === 1 ? 'placa' : 'placas'}{' '}
                    {summary.interior
                      ? `${b.finish === 'interior' ? 'interior' : 'exterior'} (${b.material.color})`
                      : b.material.boardType === 'mdf'
                        ? 'de MDF'
                        : b.material.boardType === 'aglomerado'
                          ? 'de aglomerado'
                          : 'de melamina'}
                  </span>
                </div>
              ))}
              {summary.fondo && (
                <div className="stat">
                  <span className="stat-value">{summary.fondo.pack.sheets.length}</span>
                  <span className="stat-label">{summary.fondo.pack.sheets.length === 1 ? 'placa' : 'placas'} de fondo</span>
                </div>
              )}
              <div className="stat">
                <span className="stat-value">
                  {num(summary.edgeMeters, 1)}
                  <small>m</small>
                </span>
                <span className="stat-label">de tapacanto</span>
              </div>
              <div className="stat">
                <span className="stat-value">{totalPieces}</span>
                <span className="stat-label">piezas a cortar</span>
              </div>
              {result.doors.doors.length > 0 && (
                <div className="stat">
                  <span className="stat-value">{result.doors.doors.length}</span>
                  <span className="stat-label">
                    {unit.doors.type === 'corrediza' ? 'hojas corredizas' : result.doors.doors.length === 1 ? 'puerta con bisagras' : 'puertas con bisagras'}
                  </span>
                </div>
              )}
              {total > 0 && (
                <div className="stat">
                  <span className="stat-value">{money(total)}</span>
                  <span className="stat-label">materiales tildados</span>
                </div>
              )}
            </div>
          )}

          {allWarnings.length > 0 && (
            <ul className="warnings">
              {allWarnings.map((w, i) => (
                <li key={i} className={`warning ${w.level}`}>
                  <span className="warning-tag">{w.level === 'error' ? 'Error' : w.level === 'aviso' ? 'Ojo' : 'Tip'}</span>
                  <span>{w.text}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="tabs desktop-tabs" role="tablist" aria-label="Resultados">
            {RESULT_TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={activeResultTab === t.key} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className={`tab-panel ${activeResultTab === 'plano' ? '' : 'is-inactive'}`} role="tabpanel">
            {hasPieces ? <PlanPanel unit={built} result={result} /> : <p className="empty-note">Corregí los errores de arriba para ver el plano.</p>}
          </div>
          <div className={`tab-panel no-print ${activeResultTab === '3d' ? '' : 'is-inactive'}`} role="tabpanel">
            {activeResultTab === '3d' &&
              (hasPieces ? (
                <Suspense fallback={<p className="empty-note">Cargando la vista 3D…</p>}>
                  <Furniture3D unit={built} result={result} />
                </Suspense>
              ) : (
                <p className="empty-note">Corregí los errores de arriba para ver el mueble en 3D.</p>
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
