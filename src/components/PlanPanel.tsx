import { useLayoutEffect, useRef, useState } from 'react';
import { CUP_EDGE_DISTANCE, PLATE_FRONT_DISTANCE } from '../lib/doors';
import { mm } from '../lib/format';
import { SHOE_LABEL } from '../lib/shoes';
import type { ShelfUnit, ShelfUnitResult } from '../lib/types';
import { FRONT_PAD, FrontView, SIDE_PAD, SideView, sideExtra } from './FrontView';
import { Segmented } from './ui';

interface Props {
  unit: ShelfUnit;
  result: ShelfUnitResult;
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

const HINGE_SHORT = { recta: 'bisagra recta', codo9: 'bisagra codo 9', codo18: 'bisagra codo 18' } as const;

const TARGET_FONT_PX = 12;
const VIEW_GAP_PX = 16;

/**
 * Elige el tamaño de letra (en mm) y la escala para que las cotas se lean a ~12 px
 * con el ancho disponible, y decide si la vista lateral va al costado o debajo.
 */
export function layoutViews(unit: ShelfUnit, containerWidth: number, maxHeight: number) {
  const big = Math.max(unit.width, unit.height);
  const sizes = (fs: number) => ({
    front: unit.width + 2 * FRONT_PAD.side * fs,
    side: unit.depth + 2 * SIDE_PAD.side * fs + sideExtra(unit),
    height: unit.height + (FRONT_PAD.top + FRONT_PAD.bottom) * fs,
  });
  const solve = (sideBySide: boolean) => {
    const scaleFor = (fs: number) => {
      const s = sizes(fs);
      const byWidth = sideBySide ? (containerWidth - VIEW_GAP_PX) / (s.front + s.side) : containerWidth / s.front;
      return Math.min(byWidth, maxHeight / s.height);
    };
    let fs = big * 0.03;
    for (let i = 0; i < 8; i++) {
      fs = Math.min(Math.max(TARGET_FONT_PX / scaleFor(fs), big * 0.018), big * 0.07);
    }
    return { fs, scale: scaleFor(fs) };
  };
  const together = solve(true);
  const stacked = solve(false);
  // Apilar solo conviene en muebles bajos y anchos (p. ej. un mueble de TV en el celular):
  // la vista lateral debajo casi no suma altura y el frente se ve mucho más grande.
  const stackedHeight = 2 * sizes(stacked.fs).height * stacked.scale;
  const useStacked = stacked.scale > together.scale * 1.25 && stackedHeight <= maxHeight;
  const chosen = useStacked ? stacked : together;
  const s = sizes(chosen.fs);
  return { ...chosen, sideBySide: !useStacked, frontPx: s.front * chosen.scale, sidePx: s.side * chosen.scale };
}

export function PlanPanel({ unit, result }: Props) {
  const t = unit.material.thickness;
  const [viewsRef, width] = useElementWidth<HTMLDivElement>();
  const maxHeight = typeof window !== 'undefined' ? Math.max(360, window.innerHeight * 0.72) : 700;
  const layout = layoutViews(unit, width || 600, maxHeight);
  const [doorView, setDoorView] = useState<'con' | 'sin'>('con');
  const [sideColumn, setSideColumn] = useState(0);
  const sideCol = Math.min(sideColumn, result.columns.length - 1);
  const doors = result.doors.doors;
  const showDoors = doors.length > 0 && doorView === 'con';
  const depths = [...new Set(result.columns.flatMap((c) => c.shelves.map((sh) => sh.depth)))].sort((a, b) => b - a);
  const shelfDepthLabel = depths.length ? depths.map((d) => mm(d)).join(' / ') : mm(result.shelfDepth - result.frontInset);

  return (
    <div className="plan-grid">
      <div className="card">
        <div className="card-title">
          <h3>Plano</h3>
          <p>Medidas en mm. Los números verdes son luces libres.</p>
        </div>
        {doors.length > 0 && (
          <div className="no-print" style={{ maxWidth: 280, marginBottom: 12 }}>
            <Segmented
              value={doorView}
              onChange={setDoorView}
              options={[
                { value: 'con', label: 'Con puertas' },
                { value: 'sin', label: 'Sin puertas' },
              ]}
            />
          </div>
        )}
        <div ref={viewsRef} className={`views ${layout.sideBySide ? '' : 'stacked'}`}>
          {width > 0 && (
            <>
              <figure style={{ width: layout.frontPx }}>
                <FrontView unit={unit} result={result} fs={layout.fs} scale={layout.scale} showDoors={showDoors} />
                <figcaption>Frente</figcaption>
              </figure>
              <figure style={{ width: layout.sidePx }}>
                <SideView unit={unit} result={result} fs={layout.fs} scale={layout.scale} showDoors={showDoors} column={sideCol} />
                <figcaption>
                  Corte lateral
                  {result.columns.length > 1 && (
                    <span className="col-pick" role="group" aria-label="Columna del corte lateral">
                      {result.columns.map((c) => (
                        <button
                          key={c.index}
                          type="button"
                          aria-pressed={c.index === sideCol}
                          aria-label={`Corte por la columna ${c.index + 1}`}
                          onClick={() => setSideColumn(c.index)}
                        >
                          {c.index + 1}
                        </button>
                      ))}
                    </span>
                  )}
                </figcaption>
              </figure>
            </>
          )}
        </div>
        <div className="legend">
          <span>
            <i className="swatch" style={{ background: 'var(--panel)' }} /> Melamina {mm(t)} mm
          </span>
          {unit.back.mode !== 'ninguno' && (
            <span>
              <i className="swatch" style={{ background: 'var(--back)' }} /> Fondo
            </span>
          )}
          {result.columns.some((c) => c.shelves.some((s) => s.type === 'movil')) && (
            <span>
              <i className="swatch" style={{ background: 'var(--panel)', borderStyle: 'dashed' }} /> Estante móvil
            </span>
          )}
          {showDoors && unit.doors.type === 'batiente' && (
            <span>
              <i className="swatch" style={{ borderRadius: '50%', width: 11, height: 11, borderColor: 'var(--edge)', background: 'transparent' }} /> Bisagra · la punta
              de la línea marca el lado de las bisagras
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Espacios y marcas</h3>
          <p>Para marcar laterales y divisores antes de armar.</p>
        </div>
        <div className="spaces">
          <dl className="kv">
            <dt>Lugar que ocupa (an × al × prof.)</dt>
            <dd>
              {mm(unit.width)} × {mm(unit.height)} × {mm(unit.depth + result.doors.extraDepth)}
            </dd>
            {result.doors.extraDepth > 0 && (
              <>
                <dt>Profundidad sin puertas · con puertas</dt>
                <dd>
                  {mm(unit.depth)} · {mm(unit.depth + result.doors.extraDepth)}
                </dd>
              </>
            )}
            {result.doors.swing > 0 && (
              <>
                <dt>Lugar libre adelante para abrir las puertas</dt>
                <dd>{mm(result.doors.swing)}</dd>
              </>
            )}
            <dt>Alto interior, de piso a techo</dt>
            <dd>{mm(result.interior.height)}</dd>
            {result.maletero && (
              <>
                <dt>Estante maletero, cara de abajo desde el suelo</dt>
                <dd>{mm(result.maletero.shelfBottom)}</dd>
              </>
            )}
            {unit.height > 1200 && (
              <>
                <dt>Alto libre para pararlo armado (diagonal)</dt>
                <dd>{mm(result.diagonal)}</dd>
              </>
            )}
            <dt>Profundidad de los estantes</dt>
            <dd>{shelfDepthLabel}</dd>
            {unit.plinth.enabled && (
              <>
                <dt>Cara de arriba del piso, desde el suelo</dt>
                <dd>{mm(result.interior.baseY)}</dd>
              </>
            )}
          </dl>

          {doors.length > 0 && unit.doors.type === 'batiente' && (
            <div className="space-block">
              <h4>Puertas y bisagras</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>Puerta</th>
                      <th className="n">Ancho × alto</th>
                      <th className="n">Bisagras, desde abajo de la puerta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doors.map((d) => (
                      <tr key={d.index}>
                        <td>
                          {d.zone === 'maletero' ? 'Maletero' : 'Puerta'} {doors.filter((x) => x.zone === d.zone).indexOf(d) + 1}
                          <span className="piece-notes">
                            {result.columns.length > 1 && d.column !== null ? `Col. ${d.column + 1} · ` : ''}
                            {d.hingeSide === 'izquierda' ? 'izq.' : 'der.'} · {HINGE_SHORT[d.hingeType!]}
                          </span>
                        </td>
                        <td className="n">
                          {mm(d.w)} × {mm(d.h)}
                        </td>
                        <td className="n">
                          {d.hinges.map((p) => mm(p)).join(' · ')}
                          <span className="piece-notes">desde el suelo: {d.hinges.map((p) => mm(Math.round(d.y + p))).join(' · ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                Cazoleta de 35 mm: centro a {CUP_EDGE_DISTANCE} mm del borde de la puerta y 12 mm de profundidad. La base va en el lateral o divisor, a{' '}
                {PLATE_FRONT_DISTANCE} mm del frente y a la misma altura que cada bisagra. Revisá la plantilla de tus bisagras.
              </p>
            </div>
          )}

          {doors.length > 0 && unit.doors.type === 'corrediza' && (
            <div className="space-block">
              <h4>Puertas corredizas</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>Hoja</th>
                      <th className="n">Ancho × alto</th>
                      <th className="n">Riel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doors.map((d) => (
                      <tr key={d.index}>
                        <td>
                          {d.zone === 'maletero' ? 'Maletero, hoja' : 'Hoja'} {doors.filter((x) => x.zone === d.zone).indexOf(d) + 1}
                        </td>
                        <td className="n">
                          {mm(d.w)} × {mm(d.h)}
                        </td>
                        <td className="n">{d.track === 'trasero' ? 'de atrás' : 'de adelante'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                Rieles de {mm(result.doors.trackLength)} mm arriba y abajo. Las hojas se superponen {mm(unit.doors.overlap)} mm. Estantes y divisores van{' '}
                {mm(result.frontInset)} mm más atrás para dejarlas pasar.
              </p>
            </div>
          )}

          {result.drawers.length > 0 && (
            <div className="space-block">
              <h4>Cajones</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>Cajonera</th>
                      <th className="n">Frente</th>
                      <th className="n">Caja (an × al × largo)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.drawers.map((d) => (
                      <tr key={`${d.column}-${d.fronts[0]}`}>
                        <td>
                          {d.count} × {result.columns.length > 1 ? `col. ${d.column + 1}` : 'cajones'}
                          <span className="piece-notes">
                            Correderas de {d.slide} mm, centro a {d.slideCenters.map((c) => mm(c)).join(' · ')} del suelo
                          </span>
                        </td>
                        <td className="n">
                          {mm(d.frontW)} × {mm(d.frontH)}
                        </td>
                        <td className="n">
                          {mm(d.boxW)} × {mm(d.boxH)} × {d.slide}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                Frentes embutidos con 3 mm de luz. La caja va 13 mm más angosta de cada lado para las correderas telescópicas y apoya 10 mm arriba del borde de
                abajo del frente.
              </p>
            </div>
          )}

          {result.dividers.length > 0 && (
            <div className="space-block">
              <h4>Divisores</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>Cara izquierda</th>
                      <th className="n">Desde el borde exterior</th>
                      <th className="n">Desde adentro del lateral</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dividers.map((d) => (
                      <tr key={d.index}>
                        <td>Divisor {d.index + 1}</td>
                        <td className="n">{mm(d.left)}</td>
                        <td className="n">{mm(d.leftFromInside)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                Marcalas en el piso y en el techo, por adentro, midiendo desde la izquierda.
              </p>
            </div>
          )}

          {result.columns.map((col) => (
            <div className="space-block" key={col.index}>
              <h4>
                {result.columns.length > 1 ? `Columna ${col.index + 1}` : 'Huecos y estantes'} · <span className="num">luz {mm(col.width)} mm</span>
              </h4>
              {col.shelves.length === 0 && !col.compartments[0]?.fill ? (
                <p className="field-hint" style={{ margin: 0 }}>
                  Sin estantes: un hueco de {mm(col.gaps[0])} mm de alto.
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="compact">
                    <thead>
                      <tr>
                        <th>De abajo hacia arriba</th>
                        <th className="n">Alto libre</th>
                        <th className="n">Desde el suelo</th>
                        <th className="n">Desde el piso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.gaps.flatMap((g, j) => {
                        const s = col.shelves[j];
                        const comp = col.compartments[j];
                        const what = comp?.drawers
                          ? ` · ${comp.drawers.count} ${comp.drawers.count === 1 ? 'cajón' : 'cajones'}`
                          : comp?.rod
                            ? ' · colgado'
                            : comp?.shoes
                              ? ` · ${SHOE_LABEL[comp.shoes.style].toLowerCase()}`
                              : '';
                        const rows = [
                          <tr key={`g${j}`} className="gap-row">
                            <td>
                              Hueco {j + 1}
                              {what}
                            </td>
                            <td className="n">{mm(g)}</td>
                            <td />
                            <td />
                          </tr>,
                        ];
                        if (comp?.shoes) {
                          const z = comp.shoes;
                          const base = result.interior.baseY;
                          z.levels.forEach((l, k) => {
                            const same = l.front === l.back;
                            rows.push(
                              <tr key={`z${j}-${k}`}>
                                <td>
                                  {z.style === 'barras' ? `Barras nivel ${k + 1}` : z.style === 'plano' ? `Estante zapatero ${k + 1}` : `Zapatero nivel ${k + 1}`}
                                  {k === 0 && (
                                    <span className="piece-notes">
                                      {z.style === 'inclinado'
                                        ? `Cara de abajo adelante → atrás · ${mm(z.pitch)} mm por nivel`
                                        : z.style === 'barras'
                                          ? `Centro de la barra de adelante / de atrás · ${mm(z.pitch)} mm por nivel`
                                          : `${mm(z.pitch)} mm por fila`}
                                    </span>
                                  )}
                                </td>
                                <td />
                                <td className="n">{same ? mm(l.front) : `${mm(l.front)} ${z.style === 'barras' ? '/' : '→'} ${mm(l.back)}`}</td>
                                <td className="n">
                                  {same ? mm(l.front - base) : `${mm(l.front - base)} ${z.style === 'barras' ? '/' : '→'} ${mm(l.back - base)}`}
                                </td>
                              </tr>,
                            );
                          });
                        }
                        if (comp?.rod) {
                          rows.push(
                            <tr key={`r${j}`}>
                              <td>
                                Barral <span className="muted">centro</span>
                                <span className="piece-notes">
                                  {mm(comp.rod.hanging)} mm para colgar · {mm(comp.rod.length)} mm de largo
                                </span>
                              </td>
                              <td />
                              <td className="n">{mm(comp.rod.y)}</td>
                              <td className="n">{mm(comp.rod.y - result.interior.baseY)}</td>
                            </tr>,
                          );
                        }
                        if (s) {
                          rows.push(
                            <tr key={`s${j}`}>
                              <td>
                                Estante {j + 1} <span className="muted">{s.type === 'fijo' ? 'fijo' : 'móvil'}</span>
                              </td>
                              <td />
                              <td className="n">{mm(s.bottom)}</td>
                              <td className="n">{mm(s.bottomFromBase)}</td>
                            </tr>,
                          );
                        }
                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
          <p className="footer-note" style={{ margin: 0 }}>
            Las alturas de los estantes son de su cara inferior. “Desde el suelo” se mide desde la punta de abajo del lateral; “desde el piso”, desde la cara
            de arriba del piso del mueble (sirve para marcar los divisores). El tornillo de un estante fijo va {mm(t / 2)} mm más arriba.
          </p>
        </div>
      </div>
    </div>
  );
}
