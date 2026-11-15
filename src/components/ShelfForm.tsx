import { useEffect, useRef, useState, type ReactNode } from 'react';
import { column } from '../lib/defaults';
import { mm } from '../lib/format';
import { getLang, tr } from '../lib/i18n';
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
              <span className="chev-open">{tr('Ocultar ▲', 'Hide ▲')}</span>
              <span className="chev-closed">{tr('Mostrar ▼', 'Show ▼')}</span>
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
      <Section title={unit.niche.enabled ? tr('Medidas del hueco', 'Alcove dimensions') : tr('Medidas exteriores', 'Outside dimensions')}>
        <TextField id="f-name" label={tr('Nombre del mueble', 'Unit name')} value={unit.name} onChange={(v) => update((d) => void (d.name = v))} />
        <Switch
          id="f-niche"
          label={tr('Va empotrado en un hueco de pared', 'Built into a wall alcove')}
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
              <NumberField id="f-niche-w" label={tr('Ancho del hueco', 'Alcove width')} value={unit.niche.width} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.width = v))} />
              <NumberField id="f-niche-h" label={tr('Alto del hueco', 'Alcove height')} value={unit.niche.height} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.height = v))} />
              <NumberField id="f-niche-d" label={tr('Prof. del hueco', 'Alcove depth')} value={unit.niche.depth} min={1} onChange={(v) => v !== null && update((d) => void (d.niche.depth = v))} />
            </div>
            <div className="grid-3">
              <NumberField id="f-niche-sg" label={tr('Holgura por lado', 'Side clearance')} value={unit.niche.sideGap} onChange={(v) => v !== null && update((d) => void (d.niche.sideGap = v))} />
              <NumberField id="f-niche-tg" label={tr('Holgura arriba', 'Top clearance')} value={unit.niche.topGap} onChange={(v) => v !== null && update((d) => void (d.niche.topGap = v))} />
              <NumberField id="f-niche-bg" label={tr('Holgura atrás', 'Back clearance')} value={unit.niche.backGap} onChange={(v) => v !== null && update((d) => void (d.niche.backGap = v))} />
            </div>
            <span className="field-hint">
              {tr(
                'Ingresa la medida más pequeña del hueco (las paredes nunca están rectas). El mueble queda de',
                'Enter the smallest measurement of the alcove (walls are never straight). The unit will be',
              )}{' '}
              <strong className="num">
                {mm(result.size.width)} × {mm(result.size.height)} × {mm(result.size.depth)}
              </strong>{' '}
              mm.
            </span>
          </>
        ) : (
          <>
            <div className="grid-3">
              <NumberField id="f-width" label={tr('Ancho', 'Width')} value={unit.width} min={1} onChange={(v) => v !== null && update((d) => void (d.width = v))} />
              <NumberField id="f-height" label={tr('Alto', 'Height')} value={unit.height} min={1} onChange={(v) => v !== null && update((d) => void (d.height = v))} />
              <NumberField id="f-depth" label={tr('Profundidad', 'Depth')} value={unit.depth} min={1} onChange={(v) => v !== null && update((d) => void (d.depth = v))} />
            </div>
            <span className="field-hint">
              {tr(
                'Medidas totales del mueble terminado, con el fondo incluido. Es el espacio que ocupa en la pared.',
                'Overall size of the finished unit, back panel included. This is the space it takes up on the wall.',
              )}
            </span>
          </>
        )}
      </Section>

      <Section title={tr('Estructura', 'Structure')}>
        <Segmented
          label={tr('Techo', 'Top')}
          value={unit.top}
          onChange={(v) => update((d) => void (d.top = v))}
          options={[
            { value: 'entre', label: tr('Entre laterales', 'Between sides'), icon: <TopIcon over={false} /> },
            { value: 'sobre', label: tr('Sobre laterales', 'On top of sides'), icon: <TopIcon over /> },
          ]}
          hint={
            unit.top === 'entre'
              ? tr('Los laterales llegan hasta arriba. Lo más común en libreros altos.', 'The sides run all the way up. Most common for tall bookcases.')
              : tr('El techo cubre los laterales: queda una tapa lisa, ideal para muebles bajos.', 'The top covers the sides, leaving a clean flat top. Ideal for low units.')
          }
        />

        <Switch id="f-plinth" label={tr('Zócalo (el piso queda elevado)', 'Plinth (raises the bottom)')} checked={unit.plinth.enabled} onChange={(v) => update((d) => void (d.plinth.enabled = v))} />
        {unit.plinth.enabled && (
          <div className="grid-2">
            <NumberField id="f-plinth-h" label={tr('Alto del zócalo', 'Plinth height')} value={unit.plinth.height} min={1} onChange={(v) => v !== null && update((d) => void (d.plinth.height = v))} />
            <NumberField id="f-plinth-s" label={tr('Retiro del frente', 'Front setback')} value={unit.plinth.setback} onChange={(v) => v !== null && update((d) => void (d.plinth.setback = v))} hint={tr('0 = al ras', '0 = flush')} />
          </div>
        )}

        <Segmented
          label={tr('Fondo', 'Back panel')}
          value={unit.back.mode}
          onChange={(v) => update((d) => void (d.back.mode = v))}
          options={[
            { value: 'clavado', label: tr('Clavado atrás', 'Nailed on') },
            { value: 'ranurado', label: tr('En ranura', 'In a groove') },
            { value: 'ninguno', label: tr('Sin fondo', 'No back') },
          ]}
          hint={
            unit.back.mode === 'clavado'
              ? tr(
                  `MDF delgado de ${mm(m.backThickness)} mm clavado o atornillado sobre los cantos traseros. Es lo más simple y mantiene el mueble a escuadra.`,
                  `${mm(m.backThickness)} mm thin MDF nailed or screwed onto the back edges. It is the simplest option and keeps the unit square.`,
                )
              : unit.back.mode === 'ranurado'
                ? tr(
                    'El fondo entra en una ranura hecha en laterales, piso y techo. Necesitas sierra o router para la ranura.',
                    'The back panel slides into a groove cut in the sides, bottom and top. You need a saw or router for the groove.',
                  )
                : tr('Sin fondo el mueble se puede descuadrar: conviene atornillarlo a la pared.', 'Without a back panel the unit can rack out of square: screw it to the wall.')
          }
        />
        {unit.back.mode === 'ranurado' && (
          <div className="grid-2">
            <NumberField id="f-groove-d" label={tr('Profundidad de ranura', 'Groove depth')} value={unit.back.grooveDepth} min={1} onChange={(v) => v !== null && update((d) => void (d.back.grooveDepth = v))} />
            <NumberField id="f-groove-o" label={tr('Distancia al borde trasero', 'Distance from back edge')} value={unit.back.grooveOffset} onChange={(v) => v !== null && update((d) => void (d.back.grooveOffset = v))} />
          </div>
        )}

        <Switch id="f-maletero" label={tr('Maletero arriba (estante de lado a lado)', 'Top storage (full-width shelf)')} checked={unit.maletero.enabled} onChange={(v) => update((d) => void (d.maletero.enabled = v))} />
        {unit.maletero.enabled && (
          <>
            <NumberField
              id="f-maletero-h"
              label={tr('Alto libre del maletero', 'Top storage clear height')}
              value={unit.maletero.height}
              min={1}
              onChange={(v) => v !== null && update((d) => void (d.maletero.height = v))}
              hint={
                result.maletero
                  ? tr(
                      `Estante maletero: cara de abajo a ${mm(result.maletero.shelfBottom)} mm del suelo. Las columnas llegan hasta ahí.`,
                      `Top storage shelf: underside at ${mm(result.maletero.shelfBottom)} mm from the floor. The columns end there.`,
                    )
                  : undefined
              }
            />
            {n > 1 && (
              <Switch id="f-maletero-div" label={tr('Divisores también en el maletero', 'Dividers in the top storage too')} checked={unit.maletero.dividers} onChange={(v) => update((d) => void (d.maletero.dividers = v))} />
            )}
          </>
        )}
      </Section>

      <Section title={tr('Columnas y estantes', 'Columns and shelves')}>
        <div className="row-between">
          <Stepper label={tr('Columnas', 'Columns')} value={n} min={1} max={8} onChange={setColumns} />
          {n > 1 && (
            <span className="field-hint" style={{ textAlign: 'right' }}>
              {tr(`${n - 1} ${n - 1 === 1 ? 'divisor' : 'divisores'} de ${mm(m.thickness)} mm`, `${n - 1} ${mm(m.thickness)} mm ${n - 1 === 1 ? 'divider' : 'dividers'}`)}
            </span>
          )}
        </div>

        {n > 1 && (
          <div className="field">
            <span className="field-label">{tr('Ancho libre de cada columna', 'Clear width of each column')}</span>
            <div className="gap-grid">
              {unit.columns.map((c, i) => (
                <ColumnWidthInput key={i} index={i} spec={c} computed={result.columns[i]?.width} update={update} />
              ))}
            </div>
            <span className="field-hint">
              {tr('Vacío = se reparte en partes iguales. Escribe una medida para fijar esa columna.', 'Empty = split evenly. Type a size to fix that column.')}
            </span>
          </div>
        )}

        {n > 1 && (
          <Switch
            id="f-same"
            label={tr('Mismos estantes en todas las columnas', 'Same shelves in every column')}
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
            title={unit.sameShelves || n === 1 ? null : tr(`Columna ${i + 1}`, `Column ${i + 1}`)}
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

      <Section title={tr('Tableros', 'Boards')}>
        <div className="subcard">
          <h3>{m.interior.enabled ? tr('Color exterior', 'Exterior color') : tr('Tablero del mueble', 'Unit board')}</h3>
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
          <h3>{tr('Color interior', 'Interior color')}</h3>
          <Switch
            id="f-int"
            label={tr('El interior va de otro color', 'Interior in a different color')}
            checked={m.interior.enabled}
            onChange={(v) =>
              update((d) => {
                d.material.interior.enabled = v;
                // Por defecto el interior blanco y el cuerpo según si se ve: en un empotrado no se ve.
                if (v) d.material.interior.body = d.niche.enabled ? 'interior' : 'exterior';
              })
            }
          />
          {m.interior.enabled ? (
            <>
              <BoardPicker
                role="interior"
                material={m}
                custom={customBoards}
                change={(fn) => update((d) => fn(d.material))}
                onSaveCustom={onSaveBoard}
                onRemoveCustom={onRemoveBoard}
              />
              <Segmented
                label={tr('Laterales, techo, piso y zócalo', 'Sides, top, bottom and plinth')}
                value={m.interior.body}
                onChange={(v) => update((d) => void (d.material.interior.body = v))}
                options={[
                  { value: 'exterior', label: tr('Color exterior', 'Exterior color') },
                  { value: 'interior', label: tr('Color interior', 'Interior color') },
                ]}
                hint={
                  m.interior.body === 'exterior'
                    ? tr(
                        'Puertas, frentes de cajón y la caja van con el color exterior; estantes, divisores y cajones, con el interior.',
                        'Doors, drawer fronts and the carcass use the exterior color; shelves, dividers and drawer boxes use the interior color.',
                      )
                    : tr(
                        'Solo puertas y frentes de cajón van con el color exterior: ideal para un empotrado, donde la caja no se ve.',
                        'Only doors and drawer fronts use the exterior color: ideal for a built-in unit, where the carcass is hidden.',
                      )
                }
              />
            </>
          ) : (
            <span className="field-hint">{tr('Por ejemplo, frentes en Roble y todo el interior en Blanco.', 'For example, oak fronts and an all-white interior.')}</span>
          )}
        </div>
        <div className="subcard">
          <h3>{tr('Tablero del fondo', 'Back panel board')}</h3>
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
          {tr(
            'Medidas de referencia de cada marca: confírmalas con tu proveedor de cortes. Si tu proveedor tiene otra medida, elige “Otra” y guárdala en tus tableros.',
            'Reference sizes for each brand: confirm them with your cutting supplier. If your supplier has a different size, choose “Other” and save it to your boards.',
          )}
        </span>
      </Section>

      <Section title={tr('Corte y tapacanto', 'Cutting and edge banding')} collapsible defaultOpen={false}>
        <div className="grid-2">
          <NumberField id="f-kerf" label={tr('Espesor de sierra', 'Saw kerf')} value={m.kerf} onChange={(v) => v !== null && update((d) => void (d.material.kerf = v))} />
          <NumberField id="f-trim" label={tr('Refilado por borde', 'Edge trim per side')} value={m.trim} onChange={(v) => v !== null && update((d) => void (d.material.trim = v))} />
        </div>
        <div className="grid-2">
          <NumberField id="f-edge-t" label={tr('Espesor del tapacanto', 'Edge banding thickness')} value={m.edgeThickness} onChange={(v) => v !== null && update((d) => void (d.material.edgeThickness = v))} />
          <NumberField id="f-edge-w" label={tr('Ancho del tapacanto', 'Edge banding width')} value={m.edgeWidth} min={1} onChange={(v) => v !== null && update((d) => void (d.material.edgeWidth = v))} />
        </div>
        <Switch
          id="f-edge-sub"
          label={tr('Descontar el tapacanto de la medida de corte', 'Subtract edge banding from the cut size')}
          checked={m.subtractEdge}
          onChange={(v) => update((d) => void (d.material.subtractEdge = v))}
        />
        <span className="field-hint">
          {tr(
            'Actívalo con tapacanto grueso (PVC de 1 o 2 mm) para que la pieza terminada mida exacto. Con tapacanto de 0,45 mm no hace falta.',
            'Turn it on with thick edge banding (1 or 2 mm PVC) so the finished piece is exact. Not needed with 0.45 mm edge banding.',
          )}
        </span>
        <div className="grid-2">
          <NumberField id="f-clear" label={tr('Holgura de estantes móviles', 'Adjustable shelf clearance')}
            value={unit.movableClearance}
            onChange={(v) => v !== null && update((d) => void (d.movableClearance = v))}
            hint={tr('Total, se resta al ancho', 'Total, subtracted from the width')} />
          <NumberField id="f-setback" label={tr('Retiro de estantes', 'Shelf setback')}
            value={unit.shelfSetback}
            onChange={(v) => v !== null && update((d) => void (d.shelfSetback = v))}
            hint={tr('Desde el frente', 'From the front')} />
        </div>
      </Section>

      <section className="form-section">
        <button type="button" className="btn" onClick={onSaveDefaults}>
          {tr('Usar estos tableros en muebles nuevos', 'Use these boards for new units')}
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
        label={tr(`Col. ${index + 1}`, `Col. ${index + 1}`)}
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
          {tr('Armado rápido', 'Quick layout')}
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
          <option value="">{placard ? tr('Elige un interior típico…', 'Choose a typical interior…') : tr('Elige una distribución…', 'Choose a layout…')}</option>
          {TEMPLATES.map((tpl) => (
            <option key={tpl.key} value={tpl.key}>
              {tpl.label}: {tpl.description}
            </option>
          ))}
        </select>
      </div>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <Stepper
          label={tr('Estantes', 'Shelves')}
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
              label={tr('Tipo', 'Type')}
              value={spec.shelfType}
              onChange={(v) => update((d) => void (d.columns[index].shelfType = v))}
              options={[
                { value: 'movil', label: tr('Móviles', 'Adjustable') },
                { value: 'fijo', label: tr('Fijos', 'Fixed') },
              ]}
            />
          </div>
        )}
      </div>
      <div className="field">
        <span className="field-label">{tr('Huecos, de abajo hacia arriba', 'Compartments, bottom to top')}</span>
        <div className="hueco-list">
          {Array.from({ length: k + 1 }, (_, j) => {
            const f = spec.fill?.[j] ?? null;
            const key = fillKey(f);
            return (
              <div key={j} className="hueco-row">
                <label className="hueco-label" htmlFor={`f-gap-${index}-${j}`}>
                  {tr(`Hueco ${j + 1}`, `Comp. ${j + 1}`)}
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
                  aria-label={tr(`Contenido del hueco ${j + 1}`, `Contents of compartment ${j + 1}`)}
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
                  <option value="libre">{tr('Libre', 'Open')}</option>
                  <option value="barral">{tr('Barra', 'Rod')}</option>
                  <option value="cajones">{tr('Cajones', 'Drawers')}</option>
                  <option value="zapatero">{tr('Zapatero', 'Shoe rack')}</option>
                </select>
                {f?.kind === 'zapatero' ? (
                  <select
                    id={`f-shoes-${index}-${j}`}
                    className="input"
                    aria-label={tr(`Niveles del zapatero del hueco ${j + 1}`, `Shoe rack levels in compartment ${j + 1}`)}
                    value={f.levels}
                    onChange={(e) => setFill(j, { ...f, levels: Number(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, x) => x + 1).map((c) => (
                      <option key={c} value={c}>
                        {c} {c === 1 ? tr('nivel', 'level') : tr('niv.', 'lvls')}
                      </option>
                    ))}
                  </select>
                ) : f?.kind === 'cajones' ? (
                  <select
                    id={`f-drawers-${index}-${j}`}
                    className="input"
                    aria-label={tr(`Cantidad de cajones del hueco ${j + 1}`, `Number of drawers in compartment ${j + 1}`)}
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
                        { value: 'inclinado', label: tr('Inclinado', 'Slanted') },
                        { value: 'barras', label: tr('Barras', 'Bars') },
                        { value: 'plano', label: tr('Plano', 'Flat') },
                      ]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <span className="field-hint">
          {tr(
            'Alto vacío = automático. La barra de colgar va a 5 cm del techo del hueco; los cajones y el zapatero llenan el hueco en partes iguales. El estante de arriba de una barra, cajones o zapatero queda fijo.',
            'Empty height = automatic. The hanging rod goes 5 cm below the top of the compartment; drawers and shoe racks fill the compartment evenly. The shelf above a rod, drawers or a shoe rack is fixed.',
          )}
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
  const show = (v: number | null) => (v === null ? '' : getLang() === 'en' ? String(v) : String(v).replace('.', ','));
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
    <Section title={tr('Puertas', 'Doors')}>
      <Segmented
        label={tr('Tipo de puertas', 'Door type')}
        value={d.type}
        onChange={(v) => set('type', v)}
        options={[
          { value: 'ninguna', label: tr('Sin puertas', 'No doors') },
          { value: 'batiente', label: tr('Con bisagras', 'Hinged') },
          { value: 'corrediza', label: tr('Corredizas', 'Sliding') },
        ]}
        hint={
          d.type === 'batiente'
            ? tr('Bisagras de cazoleta de 35 mm. Necesitan espacio libre adelante para abrir.', '35 mm concealed hinges. They need clear space in front to open.')
            : d.type === 'corrediza'
              ? tr('No necesitan espacio para abrir, pero solo dejan ver una parte a la vez.', 'They need no space to open, but only show part of the inside at a time.')
              : undefined
        }
      />

      {d.type === 'batiente' && (
        <>
          <Segmented
            label={tr('Montaje', 'Mounting')}
            value={d.mount}
            onChange={(v) => set('mount', v)}
            options={[
              { value: 'superpuesta', label: tr('Superpuestas', 'Full overlay') },
              { value: 'embutida', label: tr('Embutidas', 'Inset') },
            ]}
            hint={
              d.mount === 'superpuesta'
                ? tr(
                    `Tapan el canto del mueble. Bisagra recta en los laterales y semiacodada en los divisores. Suman ${mm(t)} mm al frente.`,
                    `They cover the unit's front edges. Full-overlay hinges on the sides and half-overlay hinges on the dividers. They add ${mm(t)} mm to the front.`,
                  )
                : tr(
                    `Quedan dentro del hueco, al ras del frente. Bisagra acodada; los estantes de atrás se acortan ${mm(t + 2)} mm.`,
                    `They sit inside the opening, flush with the front. Inset hinges; the shelves behind them are ${mm(t + 2)} mm shallower.`,
                  )
            }
          />
          <Segmented
            label={tr('Puertas por columna', 'Doors per column')}
            value={String(d.perColumn) as '0' | '1' | '2'}
            onChange={(v) => set('perColumn', Number(v) as 0 | 1 | 2)}
            options={[
              { value: '0', label: tr('Automático', 'Auto') },
              { value: '1', label: tr('1 puerta', '1 door') },
              { value: '2', label: tr('2 puertas', '2 doors') },
            ]}
            hint={d.perColumn === 0 ? tr('Automático: 2 puertas si la columna mide más de 60 cm.', 'Auto: 2 doors if the column is wider than 60 cm.') : undefined}
          />
          {n > 1 && (
            <div className="field">
              <span className="field-label">{tr('Columnas con puertas', 'Columns with doors')}</span>
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
                    {tr('Col.', 'Col.')} {i + 1}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="field">
            <label className="field-label" htmlFor="f-door-up">
              {tr('Alto de las puertas', 'Door height')}
            </label>
            <select id="f-door-up" className="input" value={d.upToShelf ?? ''} onChange={(e) => set('upToShelf', e.target.value === '' ? null : Number(e.target.value))}>
              <option value="">{tr('Todo el alto', 'Full height')}</option>
              {shelves.map((s) => (
                <option key={s.index} value={s.index + 1}>
                  {tr(`Hasta el estante ${s.index + 1} (${mm(s.top)} mm del suelo)`, `Up to shelf ${s.index + 1} (${mm(s.top)} mm from the floor)`)}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {tr('Por ejemplo, un librero con puertas solo abajo. Conviene que ese estante sea fijo.', 'For example, a bookcase with doors only at the bottom. That shelf should be fixed.')}
            </span>
          </div>
          <NumberField
            id="f-door-gap"
            label={tr('Separación entre puertas', 'Door gap')}
            value={d.gap}
            onChange={(v) => v !== null && set('gap', v)}
            hint={tr('Entre puertas y con los bordes', 'Between doors and at the edges')}
          />
        </>
      )}

      {d.type === 'corrediza' && (
        <>
          <Stepper label={tr('Hojas', 'Door panels')} value={d.leaves} min={2} max={4} onChange={(v) => set('leaves', v)} />
          <div className="grid-3">
            <NumberField id="f-slide-ov" label={tr('Solape', 'Overlap')} value={d.overlap} onChange={(v) => v !== null && set('overlap', v)} />
            <NumberField id="f-slide-ded" label={tr('Descuento de alto', 'Height deduction')} value={d.heightDeduction} onChange={(v) => v !== null && set('heightDeduction', v)} />
            <NumberField id="f-slide-depth" label={tr('Espacio de rieles', 'Track depth')} value={d.trackDepth} onChange={(v) => v !== null && set('trackDepth', v)} />
          </div>
          <span className="field-hint">
            {tr(
              `Alto de cada hoja = alto libre − descuento (revísalo en las instrucciones de tu kit). Estantes y divisores empiezan ${mm(d.trackDepth)} mm más atrás para dejar pasar las hojas.`,
              `Each panel's height = clear height − deduction (check your kit's instructions). Shelves and dividers start ${mm(d.trackDepth)} mm further back so the panels can pass.`,
            )}
          </span>
        </>
      )}
    </Section>
  );
}
