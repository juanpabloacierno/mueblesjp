import { useEffect, useRef, useState, type ReactNode } from 'react';
import { column } from '../lib/defaults';
import { mm } from '../lib/format';
import type { CatalogBoard } from '../lib/catalog';
import { columnHasDoors } from '../lib/doors';
import { BoardPicker } from './BoardPicker';
import { resolveUnit } from '../lib/resolve';
import { TEMPLATES, applyTemplate, type TemplateKey } from '../lib/templates';
import { autoShoeLevels } from '../lib/shoes';
import type { ColumnSpec, CompartmentFill, DoorSpec, ShelfUnit, ShelfUnitResult, ShoeRackStyle } from '../lib/types';
import { NumberField, Segmented, Stepper, Switch, TextField } from './ui';

export type Updater = (fn: (draft: ShelfUnit) => void) => void;

interface Props {
  customBoards: CatalogBoard[];
  onSaveBoard: (board: CatalogBoard) => void;
  onRemoveBoard: (board: CatalogBoard) => void;
  unit: ShelfUnit;
  result: ShelfUnitResult;
  update: Updater;
  onSaveDefaults: () => void;
}

function Section({ title, children, collapsible, defaultOpen = true, aside }: { title: string; children: ReactNode; collapsible?: boolean; defaultOpen?: boolean; aside?: ReactNode }) {
  if (collapsible) {
    return (
      <details className="form-section" open={defaultOpen}>
        <summary>
          <div className="section-head">
            <h2>{title}</h2>
            <span className="chev">
              <span className="chev-open">Ocultar ▲</span>
              <span className="chev-closed">Mostrar ▼</span>
            </span>
          </div>
        </summary>
        {children}
      </details>
    );
  }
  return (
    <section className="form-section">
      <div className="section-head">
        <h2>{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const TopIcon = ({ over }: { over: boolean }) => (
  <svg viewBox="0 0 22 18" aria-hidden="true" fill="currentColor">
    {over ? (
      <>
        <rect x="1" y="1" width="20" height="3" />
        <rect x="2" y="5" width="3" height="12" />
        <rect x="17" y="5" width="3" height="12" />
      </>
    ) : (
      <>
        <rect x="2" y="1" width="3" height="16" />
        <rect x="17" y="1" width="3" height="16" />
        <rect x="6" y="1" width="10" height="3" />
      </>
    )}
  </svg>
);

export function ShelfForm({ unit, result, update, onSaveDefaults, customBoards, onSaveBoard, onRemoveBoard }: Props) {
  const m = unit.material;
  const n = unit.columns.length;

  const setColumns = (count: number) =>
    update((d) => {
      while (d.columns.length < count) {
        const last = d.columns[d.columns.length - 1] ?? column(2);
        d.columns.push({ ...structuredClone(last), width: null });
      }
      d.columns.length = count;
    });

  const shelfEditors = unit.sameShelves ? [0] : unit.columns.map((_, i) => i);

  return (
    <div>
      <Section title={unit.niche.enabled ? 'Medidas del hueco' : 'Medidas exteriores'}>
        <TextField id="f-name" label="Nombre del mueble" value={unit.name} onChange={(v) => update((d) => void (d.name = v))} />
        <Switch
          id="f-niche"
          label="Va empotrado en un hueco de pared"
          checked={unit.niche.enabled}
          onChange={(v) =>
            update((d) => {
              if (v) {
                d.niche = { ...d.niche, enabled: true, width: d.width + 2 * d.niche.sideGap, height: d.height + d.niche.topGap, depth: d.depth + d.niche.backGap };
              } else {
                const r = resolveUnit(d);
                d.width = r.width;
                d.height = r.height;
                d.depth = r.depth;
                d.niche.enabled = false;
              }
            })
          }
        />
        {unit.niche.enabled ? (
          <>
            <div className="grid-3">
              <NumberField id="f-niche-w" label="Ancho hueco" value={unit.niche.width} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.width = v))} />
              <NumberField id="f-niche-h" label="Alto hueco" value={unit.niche.height} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.height = v))} />
              <NumberField id="f-niche-d" label="Prof. hueco" value={unit.niche.depth} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.depth = v))} />
            </div>
            <div className="grid-3">
              <NumberField id="f-niche-sg" label="Luz por costado" value={unit.niche.sideGap} onChange={(v) => v !== null && update((d) => void (d.niche.sideGap = v))} />
              <NumberField id="f-niche-tg" label="Luz arriba" value={unit.niche.topGap} onChange={(v) => v !== null && update((d) => void (d.niche.topGap = v))} />
              <NumberField id="f-niche-bg" label="Luz atrás" value={unit.niche.backGap} onChange={(v) => v !== null && update((d) => void (d.niche.backGap = v))} />
            </div>
            <span className="field-hint">
              Cargá la medida más chica del hueco (las paredes nunca están derechas). El mueble queda de{' '}
              <strong className="num">
                {mm(result.size.width)} × {mm(result.size.height)} × {mm(result.size.depth)}
              </strong>{' '}
              mm.
            </span>
          </>
        ) : (
          <>
            <div className="grid-3">
              <NumberField id="f-width" label="Ancho" value={unit.width} min={1} onChange={(v) => v !== null && update((d) => void (d.width = v))} />
              <NumberField id="f-height" label="Alto" value={unit.height} min={1} onChange={(v) => v !== null && update((d) => void (d.height = v))} />
              <NumberField id="f-depth" label="Profundidad" value={unit.depth} min={1} onChange={(v) => v !== null && update((d) => void (d.depth = v))} />
            </div>
            <span className="field-hint">Medidas totales del mueble terminado, con el fondo incluido. Es el lugar que ocupa en la pared.</span>
          </>
        )}
      </Section>

      <Section title="Estructura">
        <Segmented
          label="Techo"
          value={unit.top}
          onChange={(v) => update((d) => void (d.top = v))}
          options={[
            { value: 'entre', label: 'Entre laterales', icon: <TopIcon over={false} /> },
            { value: 'sobre', label: 'Sobre laterales', icon: <TopIcon over /> },
          ]}
          hint={unit.top === 'entre' ? 'Los laterales llegan hasta arriba. Lo más común en bibliotecas altas.' : 'El techo cubre los laterales: queda una tapa lisa, ideal para muebles bajos.'}
        />

        <Switch id="f-plinth" label="Zócalo (el piso queda elevado)" checked={unit.plinth.enabled} onChange={(v) => update((d) => void (d.plinth.enabled = v))} />
        {unit.plinth.enabled && (
          <div className="grid-2">
            <NumberField id="f-plinth-h" label="Alto del zócalo" value={unit.plinth.height} min={1} onChange={(v) => v !== null && update((d) => void (d.plinth.height = v))} />
            <NumberField id="f-plinth-s" label="Retiro del frente" value={unit.plinth.setback} onChange={(v) => v !== null && update((d) => void (d.plinth.setback = v))} hint="0 = al ras" />
          </div>
        )}

        <Segmented
          label="Fondo"
          value={unit.back.mode}
          onChange={(v) => update((d) => void (d.back.mode = v))}
          options={[
            { value: 'clavado', label: 'Clavado atrás' },
            { value: 'ranurado', label: 'En ranura' },
            { value: 'ninguno', label: 'Sin fondo' },
          ]}
          hint={
            unit.back.mode === 'clavado'
              ? `Fibrofácil de ${mm(m.backThickness)} mm clavado o atornillado sobre los cantos traseros. Es lo más simple y le da escuadra al mueble.`
              : unit.back.mode === 'ranurado'
                ? 'El fondo entra en una ranura hecha en laterales, piso y techo. Necesita sierra o router para la ranura.'
                : 'Sin fondo el mueble se puede descuadrar: conviene atornillarlo a la pared.'
          }
        />
        {unit.back.mode === 'ranurado' && (
          <div className="grid-2">
            <NumberField id="f-groove-d" label="Profundidad de ranura" value={unit.back.grooveDepth} min={1} onChange={(v) => v !== null && update((d) => void (d.back.grooveDepth = v))} />
            <NumberField id="f-groove-o" label="Distancia al borde trasero" value={unit.back.grooveOffset} onChange={(v) => v !== null && update((d) => void (d.back.grooveOffset = v))} />
          </div>
        )}

        <Switch id="f-maletero" label="Maletero arriba (estante de lado a lado)" checked={unit.maletero.enabled} onChange={(v) => update((d) => void (d.maletero.enabled = v))} />
        {unit.maletero.enabled && (
          <>
            <NumberField
              id="f-maletero-h"
              label="Alto libre del maletero"
              value={unit.maletero.height}
              min={1}
              onChange={(v) => v !== null && update((d) => void (d.maletero.height = v))}
              hint={result.maletero ? `Estante maletero: cara de abajo a ${mm(result.maletero.shelfBottom)} mm del suelo. Las columnas llegan hasta ahí.` : undefined}
            />
            {n > 1 && (
              <Switch id="f-maletero-div" label="Divisores también en el maletero" checked={unit.maletero.dividers} onChange={(v) => update((d) => void (d.maletero.dividers = v))} />
            )}
          </>
        )}
      </Section>

      <Section title="Columnas y estantes">
        <div className="row-between">
          <Stepper label="Columnas" value={n} min={1} max={8} onChange={setColumns} />
          {n > 1 && (
            <span className="field-hint" style={{ textAlign: 'right' }}>
              {n - 1} {n - 1 === 1 ? 'divisor' : 'divisores'} de {mm(m.thickness)} mm
            </span>
          )}
        </div>

        {n > 1 && (
          <div className="field">
            <span className="field-label">Ancho libre de cada columna</span>
            <div className="gap-grid">
              {unit.columns.map((c, i) => (
                <ColumnWidthInput key={i} index={i} spec={c} computed={result.columns[i]?.width} update={update} />
              ))}
            </div>
            <span className="field-hint">Vacío = se reparte en partes iguales. Escribí una medida para fijar esa columna.</span>
          </div>
        )}

        {n > 1 && (
          <Switch
            id="f-same"
            label="Mismos estantes en todas las columnas"
            checked={unit.sameShelves}
            onChange={(v) =>
              update((d) => {
                d.sameShelves = v;
                if (!v) {
                  const first = d.columns[0];
                  d.columns = d.columns.map((c) => ({ ...c, shelves: first.shelves, shelfType: first.shelfType, gaps: [...first.gaps], fill: [...(first.fill ?? [])] }));
                }
              })
            }
          />
        )}

        {shelfEditors.map((i) => (
          <ShelfEditor
            key={i}
            index={i}
            title={unit.sameShelves || n === 1 ? null : `Columna ${i + 1}`}
            spec={unit.columns[i]}
            gaps={result.columns[i]?.gaps ?? []}
            columnHeight={result.columnsTop - result.interior.baseY}
            thickness={m.thickness}
            placard={unit.kind === 'placard'}
            update={update}
          />
        ))}
      </Section>

      <DoorsForm unit={unit} result={result} update={update} />

      <Section title="Placas">
        <div className="subcard">
          <h3>Placa del mueble</h3>
          <BoardPicker
            role="cuerpo"
            material={m}
            custom={customBoards}
            change={(fn) => update((d) => fn(d.material))}
            onSaveCustom={onSaveBoard}
            onRemoveCustom={onRemoveBoard}
          />
        </div>
        <div className="subcard">
          <h3>Placa del fondo</h3>
          <BoardPicker
            role="fondo"
            material={m}
            custom={customBoards}
            change={(fn) => update((d) => fn(d.material))}
            onSaveCustom={onSaveBoard}
            onRemoveCustom={onRemoveBoard}
          />
        </div>
        <span className="field-hint">
          Medidas de referencia de cada marca: confirmalas con tu aserradero. Si tu proveedor tiene otra medida, elegí “Otra” y guardala en tus placas.
        </span>
      </Section>

      <Section title="Corte y tapacanto" collapsible defaultOpen={false}>
        <div className="grid-2">
          <NumberField id="f-kerf" label="Espesor de sierra" value={m.kerf} onChange={(v) => v !== null && update((d) => void (d.material.kerf = v))} />
          <NumberField id="f-trim" label="Refilado por borde" value={m.trim} onChange={(v) => v !== null && update((d) => void (d.material.trim = v))} />
        </div>
        <div className="grid-2">
          <NumberField id="f-edge-t" label="Espesor tapacanto" value={m.edgeThickness} onChange={(v) => v !== null && update((d) => void (d.material.edgeThickness = v))} />
          <NumberField id="f-edge-w" label="Ancho tapacanto" value={m.edgeWidth} min={1} onChange={(v) => v !== null && update((d) => void (d.material.edgeWidth = v))} />
        </div>
        <Switch
          id="f-edge-sub"
          label="Descontar el tapacanto de la medida de corte"
          checked={m.subtractEdge}
          onChange={(v) => update((d) => void (d.material.subtractEdge = v))}
        />
        <span className="field-hint">Activalo con tapacanto grueso (PVC de 1 o 2 mm) para que la pieza terminada mida justo. Con tapacanto de 0,45 mm no hace falta.</span>
        <div className="grid-2">
          <NumberField id="f-clear" label="Holgura estantes móviles" value={unit.movableClearance} onChange={(v) => v !== null && update((d) => void (d.movableClearance = v))} hint="Total, se resta al ancho" />
          <NumberField id="f-setback" label="Retiro de estantes" value={unit.shelfSetback} onChange={(v) => v !== null && update((d) => void (d.shelfSetback = v))} hint="Desde el frente" />
        </div>
      </Section>

      <section className="form-section">
        <button type="button" className="btn" onClick={onSaveDefaults}>
          Usar estas placas en muebles nuevos
        </button>
      </section>
    </div>
  );
}

function ColumnWidthInput({ index, spec, computed, update }: { index: number; spec: ColumnSpec; computed?: number; update: Updater }) {
  return (
    <div className="gap-item">
      <NumberField
        id={`f-colw-${index}`}
        label={`Col. ${index + 1}`}
        value={spec.width}
        allowEmpty
        min={1}
        placeholder={computed !== undefined ? mm(computed) : 'auto'}
        onChange={(v) => update((d) => void (d.columns[index].width = v))}
      />
    </div>
  );
}

type FillKey = 'libre' | 'barral' | 'cajones' | 'zapatero';

function fillKey(f: CompartmentFill | null | undefined): FillKey {
  return f ? f.kind : 'libre';
}

function ShelfEditor({
  index,
  title,
  spec,
  gaps,
  columnHeight,
  thickness,
  placard,
  update,
}: {
  index: number;
  title: string | null;
  spec: ColumnSpec;
  gaps: number[];
  columnHeight: number;
  thickness: number;
  placard: boolean;
  update: Updater;
}) {
  const k = spec.shelves;
  const setFill = (j: number, f: CompartmentFill | null) =>
    update((d) => {
      const c = d.columns[index];
      const arr = Array.from({ length: c.shelves + 1 }, (_, x) => c.fill?.[x] ?? null);
      arr[j] = f;
      while (arr.length && arr[arr.length - 1] === null) arr.pop();
      c.fill = arr;
    });
  const body = (
    <>
      <div className="field">
        <label className="field-label" htmlFor={`f-tpl-${index}`}>
          Armado rápido
        </label>
        <select
          id={`f-tpl-${index}`}
          className="input"
          value=""
          onChange={(e) => {
            const key = e.target.value as TemplateKey;
            if (!key) return;
            update((d) => {
              const c = d.columns[index];
              Object.assign(c, applyTemplate(key, columnHeight, thickness));
            });
          }}
        >
          <option value="">{placard ? 'Elegí un interior típico…' : 'Elegí una distribución…'}</option>
          {TEMPLATES.map((tpl) => (
            <option key={tpl.key} value={tpl.key}>
              {tpl.label}: {tpl.description}
            </option>
          ))}
        </select>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Stepper
          label="Estantes"
          value={k}
          min={0}
          max={20}
          onChange={(v) =>
            update((d) => {
              const c = d.columns[index];
              c.shelves = v;
              c.gaps = c.gaps.slice(0, v + 1);
              c.fill = (c.fill ?? []).slice(0, v + 1);
            })
          }
        />
        {k > 0 && (
          <div style={{ flex: '1 1 180px' }}>
            <Segmented
              label="Tipo"
              value={spec.shelfType}
              onChange={(v) => update((d) => void (d.columns[index].shelfType = v))}
              options={[
                { value: 'movil', label: 'Móviles' },
                { value: 'fijo', label: 'Fijos' },
              ]}
            />
          </div>
        )}
      </div>
      <div className="field">
        <span className="field-label">Huecos, de abajo hacia arriba</span>
        <div className="hueco-list">
          {Array.from({ length: k + 1 }, (_, j) => {
            const f = spec.fill?.[j] ?? null;
            const key = fillKey(f);
            return (
              <div key={j} className="hueco-row">
                <label className="hueco-label" htmlFor={`f-gap-${index}-${j}`}>
                  Hueco {j + 1}
                </label>
                <GapInput
                  id={`f-gap-${index}-${j}`}
                  value={spec.gaps[j] ?? null}
                  placeholder={gaps[j] !== undefined ? mm(gaps[j]) : ''}
                  onChange={(v) =>
                    update((d) => {
                      const c = d.columns[index];
                      const arr = Array.from({ length: c.shelves + 1 }, (_, x) => c.gaps[x] ?? null);
                      arr[j] = v;
                      while (arr.length && arr[arr.length - 1] === null) arr.pop();
                      c.gaps = arr;
                    })
                  }
                />
                <select
                  id={`f-fill-${index}-${j}`}
                  className="input"
                  aria-label={`Contenido del hueco ${j + 1}`}
                  value={key}
                  onChange={(e) => {
                    const v = e.target.value as FillKey;
                    if (v === 'zapatero') {
                      setFill(j, { kind: 'zapatero', style: 'inclinado', levels: autoShoeLevels('inclinado', gaps[j] ?? 600, thickness) });
                      return;
                    }
                    setFill(j, v === 'libre' ? null : v === 'barral' ? { kind: 'barral' } : { kind: 'cajones', count: 3 });
                  }}
                >
                  <option value="libre">Libre</option>
                  <option value="barral">Barral</option>
                  <option value="cajones">Cajones</option>
                  <option value="zapatero">Zapatero</option>
                </select>
                {f?.kind === 'zapatero' ? (
                  <select
                    id={`f-shoes-${index}-${j}`}
                    className="input"
                    aria-label={`Niveles del zapatero del hueco ${j + 1}`}
                    value={f.levels}
                    onChange={(e) => setFill(j, { ...f, levels: Number(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, x) => x + 1).map((c) => (
                      <option key={c} value={c}>
                        {c} {c === 1 ? 'nivel' : 'niv.'}
                      </option>
                    ))}
                  </select>
                ) : f?.kind === 'cajones' ? (
                  <select
                    id={`f-drawers-${index}-${j}`}
                    className="input"
                    aria-label={`Cantidad de cajones del hueco ${j + 1}`}
                    value={f.count}
                    onChange={(e) => setFill(j, { kind: 'cajones', count: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span />
                )}
                {f?.kind === 'zapatero' && (
                  <div className="hueco-sub">
                    <Segmented
                      value={f.style}
                      onChange={(style: ShoeRackStyle) =>
                        // Al cambiar de tipo, recalcula los niveles para el alto del hueco.
                        setFill(j, { kind: 'zapatero', style, levels: autoShoeLevels(style, gaps[j] ?? 600, thickness) })
                      }
                      options={[
                        { value: 'inclinado', label: 'Inclinado' },
                        { value: 'barras', label: 'Barras' },
                        { value: 'plano', label: 'Plano' },
                      ]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span className="field-hint">
          Alto vacío = automático. El barral va a 5 cm del techo del hueco; los cajones y el zapatero llenan el hueco en partes iguales. El estante de arriba de un
          barral, cajones o zapatero queda fijo.
        </span>
      </div>
    </>
  );
  if (!title) return body;
  return (
    <div className="subcard">
      <h3>{title}</h3>
      {body}
    </div>
  );
}

function GapInput({ id, value, placeholder, onChange }: { id: string; value: number | null; placeholder: string; onChange: (v: number | null) => void }) {
  const show = (v: number | null) => (v === null ? '' : String(v).replace('.', ','));
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);
  return (
    <input
      id={id}
      className="input"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      onFocus={() => (focused.current = true)}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
      onChange={(e) => {
        setText(e.target.value);
        const t = e.target.value.trim().replace(',', '.');
        if (t === '') return onChange(null);
        const v = Number(t);
        if (Number.isFinite(v) && v > 0) onChange(v);
      }}
    />
  );
}

function DoorsForm({ unit, result, update }: { unit: ShelfUnit; result: ShelfUnitResult; update: Updater }) {
  const d = unit.doors;
  const n = unit.columns.length;
  const t = unit.material.thickness;
  const set = <K extends keyof DoorSpec>(key: K, value: DoorSpec[K]) => update((draft) => void (draft.doors[key] = value));
  const refColumn = result.columns.find((c) => columnHasDoors(d, c.index)) ?? result.columns[0];
  const shelves = refColumn?.shelves ?? [];

  return (
    <Section title="Puertas">
      <Segmented
        label="Tipo de puertas"
        value={d.type}
        onChange={(v) => set('type', v)}
        options={[
          { value: 'ninguna', label: 'Sin puertas' },
          { value: 'batiente', label: 'Con bisagras' },
          { value: 'corrediza', label: 'Corredizas' },
        ]}
        hint={
          d.type === 'batiente'
            ? 'Bisagras cazoleta de 35 mm. Necesitan lugar libre adelante para abrir.'
            : d.type === 'corrediza'
              ? 'No necesitan lugar para abrir, pero solo dejan ver una parte a la vez.'
              : undefined
        }
      />

      {d.type === 'batiente' && (
        <>
          <Segmented
            label="Montaje"
            value={d.mount}
            onChange={(v) => set('mount', v)}
            options={[
              { value: 'superpuesta', label: 'Superpuestas' },
              { value: 'embutida', label: 'Embutidas' },
            ]}
            hint={
              d.mount === 'superpuesta'
                ? `Tapan el canto del mueble. Bisagra recta en los laterales y codo 9 en los divisores. Suman ${mm(t)} mm al frente.`
                : `Quedan dentro del hueco, al ras del frente. Bisagra codo 18; los estantes de atrás se acortan ${mm(t + 2)} mm.`
            }
          />
          <Segmented
            label="Puertas por columna"
            value={String(d.perColumn) as '0' | '1' | '2'}
            onChange={(v) => set('perColumn', Number(v) as 0 | 1 | 2)}
            options={[
              { value: '0', label: 'Automático' },
              { value: '1', label: '1 puerta' },
              { value: '2', label: '2 puertas' },
            ]}
            hint={d.perColumn === 0 ? 'Automático: 2 puertas si la columna mide más de 60 cm.' : undefined}
          />
          {n > 1 && (
            <div className="field">
              <span className="field-label">Columnas con puertas</span>
              <div className="chip-checks">
                {unit.columns.map((_, i) => (
                  <label key={i} className="chip-check" htmlFor={`f-door-col-${i}`}>
                    <input
                      id={`f-door-col-${i}`}
                      type="checkbox"
                      checked={d.columns[i] ?? true}
                      onChange={(e) =>
                        update((draft) => {
                          const cols = Array.from({ length: n }, (_, x) => draft.doors.columns[x] ?? true);
                          cols[i] = e.target.checked;
                          draft.doors.columns = cols;
                        })
                      }
                    />
                    Col. {i + 1}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="f-door-up">
              Alto de las puertas
            </label>
            <select id="f-door-up" className="input" value={d.upToShelf ?? ''} onChange={(e) => set('upToShelf', e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">Todo el alto</option>
              {shelves.map((s) => (
                <option key={s.index} value={s.index + 1}>
                  Hasta el estante {s.index + 1} ({mm(s.top)} mm del suelo)
                </option>
              ))}
            </select>
            <span className="field-hint">Por ejemplo, una biblioteca con puertas solo abajo. Ese estante conviene que sea fijo.</span>
          </div>
          <NumberField id="f-door-gap" label="Luz entre puertas" value={d.gap} onChange={(v) => v !== null && set('gap', v)} hint="Separación entre puertas y con los bordes" />
        </>
      )}

      {d.type === 'corrediza' && (
        <>
          <Stepper label="Hojas" value={d.leaves} min={2} max={4} onChange={(v) => set('leaves', v)} />
          <div className="grid-3">
            <NumberField id="f-slide-ov" label="Solape" value={d.overlap} onChange={(v) => v !== null && set('overlap', v)} />
            <NumberField id="f-slide-ded" label="Descuento alto" value={d.heightDeduction} onChange={(v) => v !== null && set('heightDeduction', v)} />
            <NumberField id="f-slide-depth" label="Lugar rieles" value={d.trackDepth} onChange={(v) => v !== null && set('trackDepth', v)} />
          </div>
          <span className="field-hint">
            Alto de cada hoja = alto libre − descuento (revisalo en las instrucciones de tu kit). Estantes y divisores arrancan {mm(d.trackDepth)} mm más atrás para dejar
            pasar las hojas.
          </span>
        </>
      )}
    </Section>
  );
}
