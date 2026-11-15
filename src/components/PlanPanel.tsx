import { useLayoutEffect, useRef, useState } from 'react';
import { CUP_EDGE_DISTANCE, PLATE_FRONT_DISTANCE } from '../lib/doors';
import { mm } from '../lib/format';
import { tr } from '../lib/i18n';
import { SHOE_LABEL } from '../lib/shoes';
import type { DrawerResult, KneeResult, ShelfUnit, ShelfUnitResult, SlideType } from '../lib/types';
import { FRONT_PAD, FrontView, SIDE_PAD, SideView, sideExtra } from './FrontView';
import { Segmented } from './ui';

interface Props {
  unit: ShelfUnit;
  result: ShelfUnitResult;
}

/** Tipo de corredera, en minúscula para usar dentro de una frase. */
function slideLabel(type: SlideType): string {
  if (type === 'cierre-suave') return tr('correderas telescópicas con cierre suave', 'soft-close full-extension slides');
  if (type === 'rodillo') return tr('correderas de rodillos', 'roller slides');
  return tr('correderas telescópicas', 'full-extension slides');
}

/**
 * Medidas de cada cajón: una línea si todos son iguales; si no, una por cajón, de arriba hacia
 * abajo como en el dibujo.
 */
function SizeLines({ heights, line }: { heights: number[]; line: (h: number) => string }) {
  if (heights.every((h) => h === heights[0])) return <>{line(heights[0])}</>;
  return (
    <>
      {[...heights].reverse().map((h, i) => (
        <span key={i} style={{ display: 'block' }}>
          {line(h)}
        </span>
      ))}
    </>
  );
}

/** Fondo de cajón en ranura: largo × ancho. */
function grooveBottom(unit: ShelfUnit, d: DrawerResult): string {
  const t = unit.material.thickness;
  const gIn = unit.drawers.grooveDepth - 1;
  return `${mm(d.slide - 2 * t + 2 * gIn)} × ${mm(d.boxW - 2 * t + 2 * gIn)}`;
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

const HINGE_SHORT = {
  get recta() {
    return tr('bisagra recta', 'full overlay hinge');
  },
  get codo9() {
    return tr('bisagra codo 9', 'half overlay hinge');
  },
  get codo18() {
    return tr('bisagra codo 18', 'inset hinge');
  },
};

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

/** Filas de la lista de espacios para un hueco para las piernas. */
function KneeRows({ knee, label }: { knee: KneeResult; label: string }) {
  return (
    <>
      <dt>
        {tr('Hueco para las piernas (ancho × alto)', 'Knee space (width × height)')}
        {label}
      </dt>
      <dd>
        {mm(knee.width)} × {mm(knee.height)}
      </dd>
      {knee.modesty && (
        <>
          <dt>{tr('Faldón: alto · borde de abajo desde el suelo', 'Modesty panel: height · bottom edge from the floor')}</dt>
          <dd>
            {mm(knee.modesty.h)} · {mm(knee.modesty.y)}
          </dd>
        </>
      )}
    </>
  );
}

/** Texto del hueco para las piernas en el bloque de su columna. */
function KneeNote({ knee }: { knee: KneeResult | undefined }) {
  if (!knee) return null;
  return (
    <p className="field-hint" style={{ margin: 0 }}>
      {tr(
        `Hueco para las piernas: ${mm(knee.width)} × ${mm(knee.height)} mm (ancho × alto), del suelo a la tapa. Sin piso, estantes ni fondo.`,
        `Knee space: ${mm(knee.width)} × ${mm(knee.height)} mm (width × height), from the floor to the top. No bottom panel, shelves or back panel.`,
      )}
      {knee.modesty &&
        ` ${tr(
          `Faldón de ${mm(knee.modesty.h)} mm atrás, contra la tapa: marca en los dos costados la línea de su borde de abajo, a ${mm(knee.modesty.y)} mm del suelo.`,
          `${mm(knee.modesty.h)} mm modesty panel at the back, against the top: mark the line of its bottom edge on both sides, ${mm(knee.modesty.y)} mm from the floor.`,
        )}`}
    </p>
  );
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
  const fullDividers = result.dividers.filter((d) => d.full).length;
  const dividersTitle =
    fullDividers === 0
      ? tr('Divisores', 'Dividers')
      : fullDividers === result.dividers.length
        ? fullDividers === 1
          ? tr('Lateral interior', 'Inner side panel')
          : tr('Laterales interiores', 'Inner side panels')
        : tr('Divisores y laterales interiores', 'Dividers and inner side panels');

  return (
    <div className="plan-grid">
      <div className="card">
        <div className="card-title">
          <h3>{tr('Plano', 'Plan')}</h3>
          <p>{tr('Medidas en mm. Los números verdes son espacios libres.', 'Dimensions in mm. Green numbers are clear spaces.')}</p>
        </div>
        {doors.length > 0 && (
          <div className="no-print" style={{ maxWidth: 280, marginBottom: 12 }}>
            <Segmented
              value={doorView}
              onChange={setDoorView}
              options={[
                { value: 'con', label: tr('Con puertas', 'With doors') },
                { value: 'sin', label: tr('Sin puertas', 'Without doors') },
              ]}
            />
          </div>
        )}
        <div ref={viewsRef} className={`views ${layout.sideBySide ? '' : 'stacked'}`}>
          {width > 0 && (
            <>
              <figure style={{ width: layout.frontPx }}>
                <FrontView unit={unit} result={result} fs={layout.fs} scale={layout.scale} showDoors={showDoors} />
                <figcaption>{tr('Frente', 'Front')}</figcaption>
              </figure>
              <figure style={{ width: layout.sidePx }}>
                <SideView unit={unit} result={result} fs={layout.fs} scale={layout.scale} showDoors={showDoors} column={sideCol} />
                <figcaption>
                  {tr('Corte lateral', 'Side section')}
                  {result.columns.length > 1 && (
                    <span className="col-pick" role="group" aria-label={tr('Columna del corte lateral', 'Column for the side section')}>
                      {result.columns.map((c) => (
                        <button
                          key={c.index}
                          type="button"
                          aria-pressed={c.index === sideCol}
                          aria-label={tr(`Corte por la columna ${c.index + 1}`, `Section through column ${c.index + 1}`)}
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
            <i className="swatch" style={{ background: 'var(--panel)' }} /> {tr('Melamina', 'Melamine')} {mm(t)} mm
          </span>
          {unit.back.mode !== 'ninguno' && (
            <span>
              <i className="swatch" style={{ background: 'var(--back)' }} /> {tr('Fondo', 'Back panel')}
            </span>
          )}
          {result.knees.some((k) => k.modesty) && (
            <span>
              <i className="swatch" style={{ background: 'var(--panel-shade)' }} /> {tr('Faldón (atrás)', 'Modesty panel (at the back)')}
            </span>
          )}
          {result.columns.some((c) => c.shelves.some((s) => s.type === 'movil')) && (
            <span>
              <i className="swatch" style={{ background: 'var(--panel)', borderStyle: 'dashed' }} /> {tr('Estante móvil', 'Adjustable shelf')}
            </span>
          )}
          {showDoors && unit.doors.type === 'batiente' && (
            <span>
              <i className="swatch" style={{ borderRadius: '50%', width: 11, height: 11, borderColor: 'var(--edge)', background: 'transparent' }} />{' '}
              {tr('Bisagra · la punta de la línea marca el lado de las bisagras', 'Hinge · the tip of the line points to the hinge side')}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>{tr('Espacios y marcas', 'Spaces and marks')}</h3>
          <p>{tr('Para marcar laterales y divisores antes de armar.', 'To mark side panels and dividers before assembly.')}</p>
        </div>
        <div className="spaces">
          <dl className="kv">
            <dt>{tr('Espacio que ocupa (an × al × prof.)', 'Space it takes (W × H × D)')}</dt>
            <dd>
              {mm(unit.width)} × {mm(unit.height)} × {mm(unit.depth + result.doors.extraDepth)}
            </dd>
            {result.doors.extraDepth > 0 && (
              <>
                <dt>
                  {(() => {
                    // Lo que sobresale: puertas superpuestas, frentes de cajón superpuestos o los dos.
                    const doorsAdd = unit.doors.type === 'batiente' && unit.doors.mount === 'superpuesta' && result.doors.doors.length > 0;
                    const frontsAdd = result.drawers.some((d) => d.overlay);
                    if (frontsAdd && !doorsAdd) return tr('Profundidad sin frentes de cajón · con frentes', 'Depth without drawer fronts · with fronts');
                    if (frontsAdd) return tr('Profundidad sin puertas ni frentes · con puertas y frentes', 'Depth without doors or fronts · with doors and fronts');
                    return tr('Profundidad sin puertas · con puertas', 'Depth without doors · with doors');
                  })()}
                </dt>
                <dd>
                  {mm(unit.depth)} · {mm(unit.depth + result.doors.extraDepth)}
                </dd>
              </>
            )}
            {result.doors.swing > 0 && (
              <>
                <dt>{tr('Espacio libre adelante para abrir las puertas', 'Clear space in front to open the doors')}</dt>
                <dd>{mm(result.doors.swing)}</dd>
              </>
            )}
            {result.bases.length > 0 && (
              <>
                <dt>{tr('Alto interior, de piso a techo', 'Inside height, bottom to top')}</dt>
                <dd>{mm(result.interior.height)}</dd>
              </>
            )}
            {result.knees.map((k) => (
              <KneeRows key={k.column} knee={k} label={result.columns.length > 1 ? tr(` (columna ${k.column + 1})`, ` (column ${k.column + 1})`) : ''} />
            ))}
            {result.maletero && (
              <>
                <dt>{tr('Estante maletero, cara de abajo desde el suelo', 'Top storage shelf, underside from the floor')}</dt>
                <dd>{mm(result.maletero.shelfBottom)}</dd>
              </>
            )}
            {unit.height > 1200 && (
              <>
                <dt>{tr('Alto libre para levantarlo armado (diagonal)', 'Clear height to stand it up assembled (diagonal)')}</dt>
                <dd>{mm(result.diagonal)}</dd>
              </>
            )}
            {result.bases.length > 0 && (
              <>
                <dt>{tr('Profundidad de los estantes', 'Shelf depth')}</dt>
                <dd>{shelfDepthLabel}</dd>
              </>
            )}
            {unit.plinth.enabled && result.bases.length > 0 && (
              <>
                <dt>{tr('Cara de arriba del piso, desde el suelo', 'Top face of the bottom panel, from the floor')}</dt>
                <dd>{mm(result.interior.baseY)}</dd>
              </>
            )}
          </dl>

          {doors.length > 0 && unit.doors.type === 'batiente' && (
            <div className="space-block">
              <h4>{tr('Puertas y bisagras', 'Doors and hinges')}</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>{tr('Puerta', 'Door')}</th>
                      <th className="n">{tr('Ancho × alto', 'Width × height')}</th>
                      <th className="n">{tr('Bisagras, desde abajo de la puerta', 'Hinges, from the bottom of the door')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doors.map((d) => (
                      <tr key={d.index}>
                        <td>
                          {d.zone === 'maletero' ? tr('Maletero', 'Top storage') : tr('Puerta', 'Door')} {doors.filter((x) => x.zone === d.zone).indexOf(d) + 1}
                          <span className="piece-notes">
                            {result.columns.length > 1 && d.column !== null ? `Col. ${d.column + 1} · ` : ''}
                            {d.hingeSide === 'izquierda' ? tr('izq.', 'left') : tr('der.', 'right')} · {HINGE_SHORT[d.hingeType!]}
                          </span>
                        </td>
                        <td className="n">
                          {mm(d.w)} × {mm(d.h)}
                        </td>
                        <td className="n">
                          {d.hinges.map((p) => mm(p)).join(' · ')}
                          <span className="piece-notes">{tr('desde el suelo:', 'from the floor:')} {d.hinges.map((p) => mm(Math.round(d.y + p))).join(' · ')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                {tr(
                  `Cazoleta de 35 mm: centro a ${CUP_EDGE_DISTANCE} mm del borde de la puerta y 12 mm de profundidad. La base va en el lateral o divisor, a ${PLATE_FRONT_DISTANCE} mm del frente y a la misma altura que cada bisagra. Revisa la plantilla de tus bisagras.`,
                  `35 mm hinge cup: center ${CUP_EDGE_DISTANCE} mm from the door edge and 12 mm deep. The mounting plate goes on the side panel or divider, ${PLATE_FRONT_DISTANCE} mm from the front and at the same height as each hinge. Check your hinges' template.`,
                )}
              </p>
            </div>
          )}

          {doors.length > 0 && unit.doors.type === 'corrediza' && (
            <div className="space-block">
              <h4>{tr('Puertas corredizas', 'Sliding doors')}</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>{tr('Hoja', 'Door panel')}</th>
                      <th className="n">{tr('Ancho × alto', 'Width × height')}</th>
                      <th className="n">{tr('Riel', 'Track')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doors.map((d) => (
                      <tr key={d.index}>
                        <td>
                          {d.zone === 'maletero' ? tr('Maletero, hoja', 'Top storage, panel') : tr('Hoja', 'Panel')} {doors.filter((x) => x.zone === d.zone).indexOf(d) + 1}
                        </td>
                        <td className="n">
                          {mm(d.w)} × {mm(d.h)}
                        </td>
                        <td className="n">{d.track === 'trasero' ? tr('de atrás', 'back') : tr('de adelante', 'front')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                {tr(
                  `Rieles de ${mm(result.doors.trackLength)} mm arriba y abajo. Las hojas se superponen ${mm(unit.doors.overlap)} mm. Estantes y divisores van ${mm(result.frontInset)} mm más atrás para dejarlas pasar.`,
                  `${mm(result.doors.trackLength)} mm tracks at the top and bottom. The panels overlap ${mm(unit.doors.overlap)} mm. Shelves and dividers sit ${mm(result.frontInset)} mm further back to let them pass.`,
                )}
              </p>
            </div>
          )}

          {result.drawers.length > 0 && (
            <div className="space-block">
              <h4>{tr('Cajones', 'Drawers')}</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>{tr('Cajonera', 'Drawer stack')}</th>
                      <th className="n">{tr('Frente', 'Front')}</th>
                      <th className="n">{tr('Caja (an × al × largo)', 'Box (W × H × L)')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.drawers.map((d) => {
                      const kind = slideLabel(d.slideType);
                      const centers = d.slideCenters.map((c) => mm(c)).join(' · ');
                      return (
                        <tr key={`${d.column}-${d.fronts[0]}`}>
                          <td>
                            {d.count} × {result.columns.length > 1 ? `col. ${d.column + 1}` : tr('cajones', 'drawers')}
                            <span className="piece-notes">
                              {tr(
                                `${kind.charAt(0).toUpperCase() + kind.slice(1)} de ${d.slide} mm, centro a ${centers} del suelo`,
                                `${d.slide} mm ${kind}, center at ${centers} from the floor`,
                              )}
                              {d.overlay ? tr(' · frentes superpuestos', ' · overlay fronts') : ''}
                              {unit.drawers.bottom === 'ranura'
                                ? tr(` · fondo en ranura de ${grooveBottom(unit, d)}`, ` · ${grooveBottom(unit, d)} bottom in a groove`)
                                : ''}
                            </span>
                          </td>
                          <td className="n">
                            <SizeLines heights={d.frontHs} line={(h) => `${mm(d.frontW)} × ${mm(h)}`} />
                          </td>
                          <td className="n">
                            <SizeLines heights={d.boxHs} line={(h) => `${mm(d.boxW)} × ${mm(h)} × ${d.slide}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                {(() => {
                  const kinds = [...new Set(result.drawers.map((d) => d.slideType))].map(slideLabel).join(tr(' y ', ' and '));
                  const anyOverlay = result.drawers.some((d) => d.overlay);
                  const allOverlay = result.drawers.every((d) => d.overlay);
                  const graduated = result.drawers.some((d) => d.frontHs.some((h) => h !== d.frontHs[0]));
                  const parts: string[] = [];
                  if (!anyOverlay) {
                    parts.push(
                      tr(
                        `Frentes embutidos con 3 mm de holgura. La caja va 13 mm más angosta de cada lado para las ${kinds} y apoya 10 mm arriba del borde de abajo del frente.`,
                        `Inset fronts with a 3 mm gap. The box is 13 mm narrower on each side for the ${kinds} and sits 10 mm above the bottom edge of the front.`,
                      ),
                    );
                  } else {
                    parts.push(
                      allOverlay
                        ? tr(
                            'Frentes superpuestos: tapan los cantos del mueble (entero en los laterales, la mitad en divisores y estantes), con 3 mm de luz entre ellos.',
                            'Overlay fronts: they cover the unit edges (fully on the side panels, half on dividers and shelves), with a 3 mm gap between them.',
                          )
                        : tr(
                            'Frentes superpuestos donde no hay puerta delante (tapan los cantos del mueble); detrás de una puerta van embutidos con 3 mm de holgura.',
                            'Overlay fronts where there is no door in front (they cover the unit edges); behind a door they are inset with a 3 mm gap.',
                          ),
                    );
                    parts.push(
                      tr(
                        `La caja va 13 mm más angosta de cada lado para las ${kinds} y apoya 10 mm arriba del piso de su lugar en el hueco.`,
                        `The box is 13 mm narrower on each side for the ${kinds} and sits 10 mm above the floor of its slot in the compartment.`,
                      ),
                    );
                  }
                  if (graduated) parts.push(tr('Cajones de distinto alto: de arriba hacia abajo, como en el dibujo.', 'Drawers of different heights: listed top to bottom, as in the drawing.'));
                  if (unit.drawers.bottom === 'ranura') {
                    const tb = unit.material.backThickness;
                    parts.push(
                      tr(
                        `Fondo en ranura: ranura de ${mm(tb + 1)} × ${mm(unit.drawers.grooveDepth)} mm a ${mm(unit.drawers.grooveOffset)} mm del canto de abajo en los costados, el frente y el contrafrente de la caja; el fondo entra ${mm(unit.drawers.grooveDepth - 1)} mm de cada lado.`,
                        `Bottom in a groove: ${mm(tb + 1)} × ${mm(unit.drawers.grooveDepth)} mm groove ${mm(unit.drawers.grooveOffset)} mm above the bottom edge of the box sides, front and back; the bottom goes ${mm(unit.drawers.grooveDepth - 1)} mm in on each side.`,
                      ),
                    );
                  }
                  return parts.join(' ');
                })()}
              </p>
            </div>
          )}

          {result.dividers.length > 0 && (
            <div className="space-block">
              <h4>{dividersTitle}</h4>
              <div className="table-wrap">
                <table className="compact">
                  <thead>
                    <tr>
                      <th>{tr('Cara izquierda', 'Left face')}</th>
                      <th className="n">{tr('Desde el borde exterior', 'From the outer edge')}</th>
                      <th className="n">{tr('Desde adentro del lateral', 'From the inside of the side panel')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.dividers.map((d) => (
                      <tr key={d.index}>
                        <td>
                          {d.full ? tr('Lateral interior', 'Inner side panel') : tr('Divisor', 'Divider')} {d.index + 1}
                          {d.full && <span className="piece-notes">{tr('llega al suelo', 'reaches the floor')}</span>}
                        </td>
                        <td className="n">{mm(d.left)}</td>
                        <td className="n">{mm(d.leftFromInside)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="field-hint" style={{ margin: '6px 0 0' }}>
                {tr('Márcalas en el piso y en el techo, por dentro, midiendo desde la izquierda.', 'Mark them on the bottom and top, on the inside, measuring from the left.')}
                {result.dividers.some((d) => d.full) &&
                  ` ${tr(
                    'Los laterales interiores van del suelo a la tapa: marca su lugar debajo de la tapa y en el piso de la cajonera que sostienen.',
                    'The inner side panels run from the floor to the top: mark their place under the top and on the bottom panel of the pedestal they hold.',
                  )}`}
              </p>
            </div>
          )}

          {result.columns.map((col) => (
            <div className="space-block" key={col.index}>
              <h4>
                {result.columns.length > 1 ? tr(`Columna ${col.index + 1}`, `Column ${col.index + 1}`) : tr('Huecos y estantes', 'Compartments and shelves')} ·{' '}
                <span className="num">{tr(`espacio libre ${mm(col.width)} mm`, `clear ${mm(col.width)} mm`)}</span>
              </h4>
              {col.knee ? (
                <KneeNote knee={result.knees.find((k) => k.column === col.index)} />
              ) : col.shelves.length === 0 && !col.compartments[0]?.fill ? (
                <p className="field-hint" style={{ margin: 0 }}>
                  {tr(`Sin estantes: un hueco de ${mm(col.gaps[0])} mm de alto.`, `No shelves: one compartment ${mm(col.gaps[0])} mm high.`)}
                </p>
              ) : (
                <div className="table-wrap">
                  <table className="compact">
                    <thead>
                      <tr>
                        <th>{tr('De abajo hacia arriba', 'Bottom to top')}</th>
                        <th className="n">{tr('Alto libre', 'Clear height')}</th>
                        <th className="n">{tr('Desde el suelo', 'From the floor')}</th>
                        <th className="n">{tr('Desde el piso', 'From the bottom panel')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {col.gaps.flatMap((g, j) => {
                        const s = col.shelves[j];
                        const comp = col.compartments[j];
                        const what = comp?.drawers
                          ? ` · ${comp.drawers.count} ${comp.drawers.count === 1 ? tr('cajón', 'drawer') : tr('cajones', 'drawers')}`
                          : comp?.rod
                            ? tr(' · colgado', ' · hanging')
                            : comp?.shoes
                              ? ` · ${SHOE_LABEL[comp.shoes.style].toLowerCase()}`
                              : '';
                        const rows = [
                          <tr key={`g${j}`} className="gap-row">
                            <td>
                              {tr('Hueco', 'Compartment')} {j + 1}
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
                                  {z.style === 'barras'
                                    ? tr(`Barras nivel ${k + 1}`, `Bars level ${k + 1}`)
                                    : z.style === 'plano'
                                      ? tr(`Estante para zapatos ${k + 1}`, `Shoe shelf ${k + 1}`)
                                      : tr(`Zapatero nivel ${k + 1}`, `Shoe rack level ${k + 1}`)}
                                  {k === 0 && (
                                    <span className="piece-notes">
                                      {z.style === 'inclinado'
                                        ? tr(`Cara de abajo adelante → atrás · ${mm(z.pitch)} mm por nivel`, `Underside front → back · ${mm(z.pitch)} mm per level`)
                                        : z.style === 'barras'
                                          ? tr(`Centro de la barra de adelante / de atrás · ${mm(z.pitch)} mm por nivel`, `Center of the front / back bar · ${mm(z.pitch)} mm per level`)
                                          : tr(`${mm(z.pitch)} mm por fila`, `${mm(z.pitch)} mm per row`)}
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
                                {tr('Barra de colgar', 'Hanging rod')} <span className="muted">{tr('centro', 'center')}</span>
                                <span className="piece-notes">
                                  {tr(
                                    `${mm(comp.rod.hanging)} mm para colgar · ${mm(comp.rod.length)} mm de largo`,
                                    `${mm(comp.rod.hanging)} mm hanging space · ${mm(comp.rod.length)} mm long`,
                                  )}
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
                                {tr('Estante', 'Shelf')} {j + 1}{' '}
                                <span className="muted">{s.type === 'fijo' ? tr('fijo', 'fixed') : tr('móvil', 'adjustable')}</span>
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
          {result.bases.length > 0 && (
            <p className="footer-note" style={{ margin: 0 }}>
              {tr(
                `Las alturas de los estantes son de su cara inferior. “Desde el suelo” se mide desde el extremo inferior del lateral; “desde el piso”, desde la cara de arriba del piso del mueble (sirve para marcar los divisores). El tornillo de un estante fijo va ${mm(t / 2)} mm más arriba.`,
                `Shelf heights are to their underside. “From the floor” is measured from the bottom end of the side panel; “from the bottom panel”, from the top face of the unit's bottom panel (useful to mark the dividers). The screw for a fixed shelf goes ${mm(t / 2)} mm higher.`,
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
