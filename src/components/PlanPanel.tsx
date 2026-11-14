import { useLayoutEffect, useRef, useState } from 'react';
import { mm } from '../lib/format';
import type { ShelfUnit, ShelfUnitResult } from '../lib/types';
import { FRONT_PAD, FrontView, SIDE_PAD, SideView } from './FrontView';

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
    side: unit.depth + 2 * SIDE_PAD.side * fs,
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

  return (
    <div className="plan-grid">
      <div className="card">
        <div className="card-title">
          <h3>Plano</h3>
          <p>Medidas en mm. Los números verdes son luces libres.</p>
        </div>
        <div ref={viewsRef} className={`views ${layout.sideBySide ? '' : 'stacked'}`}>
          {width > 0 && (
            <>
              <figure style={{ width: layout.frontPx }}>
                <FrontView unit={unit} result={result} fs={layout.fs} scale={layout.scale} />
                <figcaption>Frente</figcaption>
              </figure>
              <figure style={{ width: layout.sidePx }}>
                <SideView unit={unit} result={result} fs={layout.fs} scale={layout.scale} />
                <figcaption>Corte lateral</figcaption>
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
              {mm(unit.width)} × {mm(unit.height)} × {mm(unit.depth)}
            </dd>
            <dt>Alto interior, de piso a techo</dt>
            <dd>{mm(result.interior.height)}</dd>
            <dt>Profundidad de los estantes</dt>
            <dd>{mm(result.shelfDepth)}</dd>
            {unit.plinth.enabled && (
              <>
                <dt>Cara de arriba del piso, desde el suelo</dt>
                <dd>{mm(result.interior.baseY)}</dd>
              </>
            )}
          </dl>

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
              {col.shelves.length === 0 ? (
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
                        const rows = [
                          <tr key={`g${j}`} className="gap-row">
                            <td>Hueco {j + 1}</td>
                            <td className="n">{mm(g)}</td>
                            <td />
                            <td />
                          </tr>,
                        ];
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
