import { mm } from '../lib/format';
import { CUP_EDGE_DISTANCE } from '../lib/doors';
import { BAR_FRONT, BAR_SPACING, TOPE_HEIGHT } from '../lib/shoes';
import type { Door, ShelfUnit, ShelfUnitResult } from '../lib/types';

interface Props {
  unit: ShelfUnit;
  result: ShelfUnitResult;
  /** Tamaño de letra en mm del dibujo. */
  fs: number;
  /** Píxeles por mm. */
  scale: number;
  /** Dibujar las puertas cerradas. */
  showDoors?: boolean;
  /** Columna por la que pasa el corte lateral. */
  column?: number;
}

/** Pares de zapatos vistos de frente, apoyados a la altura `y` (desde el suelo). */
function Shoes({ x, width, y, Y }: { x: number; width: number; y: number; Y: (v: number) => number }) {
  const pairs = Math.max(1, Math.floor((width - 20) / 210));
  const step = width / pairs;
  return (
    <g fill="none" stroke="var(--muted)" strokeWidth={1} opacity={0.8}>
      {Array.from({ length: pairs }, (_, k) => {
        const cx = x + step * (k + 0.5);
        return [cx - 47, cx + 5].map((sx) => (
          <rect key={`${k}-${sx}`} x={sx} y={Y(y + 95)} width={42} height={95} rx={18} vectorEffect="non-scaling-stroke" />
        ));
      })}
    </g>
  );
}

/** Márgenes del dibujo en múltiplos del tamaño de letra (los usa también el cálculo de escala). */
export const FRONT_PAD = { side: 3.2, top: 2.6, bottom: 2.8 };
export const SIDE_PAD = { side: 1.2 };

/** Lugar extra a la izquierda del corte lateral para dibujar puertas superpuestas. */
export function sideExtra(unit: ShelfUnit): number {
  return unit.doors.type === 'batiente' && unit.doors.mount === 'superpuesta' ? unit.material.thickness : 0;
}

function DoorShape({ door, unit, fs, Y }: { door: Door; unit: ShelfUnit; fs: number; Y: (y: number) => number }) {
  const { x, y, w, h } = door;
  const top = Y(y + h);
  const bottom = Y(y);
  const sliding = door.track !== null;
  const front = door.track !== 'trasero';
  const label = `${mm(w)} × ${mm(h)}`;
  const labelFs = Math.min(fs * 0.85, w / 6.5);
  // Tirador: del lado que abre (bisagras) o del lado de afuera (corredizas).
  const n = sliding ? unit.doors.leaves : 0;
  const handleRight = sliding ? door.index === n - 1 || (door.index > 0 && door.index >= n / 2) : door.hingeSide === 'izquierda';
  const handleLen = Math.min(128, h * 0.3);
  const handleX = handleRight ? x + w - 40 : x + 40;
  const handleCy = sliding ? y + h / 2 : y + h > 1100 ? Math.min(Math.max(1000, y + handleLen), y + h - handleLen) : y + h - 40 - handleLen / 2;
  return (
    <g>
      <rect
        x={x}
        y={top}
        width={w}
        height={h}
        fill={front ? 'var(--door)' : 'var(--door-back)'}
        stroke="var(--panel-stroke)"
        strokeWidth={1.2}
        vectorEffect="non-scaling-stroke"
      />
      {door.hingeSide && (
        <>
          <polyline
            points={
              door.hingeSide === 'izquierda'
                ? `${x + w},${top} ${x},${(top + bottom) / 2} ${x + w},${bottom}`
                : `${x},${top} ${x + w},${(top + bottom) / 2} ${x},${bottom}`
            }
            fill="none"
            stroke="var(--muted)"
            strokeWidth={0.8}
            strokeDasharray="6 4"
            vectorEffect="non-scaling-stroke"
          />
          {door.hinges.map((pos) => (
            <circle
              key={pos}
              cx={door.hingeSide === 'izquierda' ? x + CUP_EDGE_DISTANCE : x + w - CUP_EDGE_DISTANCE}
              cy={Y(y + pos)}
              r={17.5}
              fill="none"
              stroke="var(--edge)"
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </>
      )}
      {sliding && (
        <text x={x + w / 2} y={Y(y + h * 0.3)} fontSize={fs * 1.3} textAnchor="middle" style={{ fill: 'var(--muted)' }}>
          ⟷
        </text>
      )}
      <rect
        x={handleX - 6}
        y={Y(handleCy + handleLen / 2)}
        width={12}
        height={handleLen}
        rx={6}
        fill={sliding ? 'none' : 'var(--panel-stroke)'}
        stroke="var(--panel-stroke)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <rect x={x + w / 2 - labelFs * 3.4} y={Y(y + h / 2) - labelFs * 0.72} width={labelFs * 6.8} height={labelFs * 1.4} rx={labelFs * 0.2} fill="var(--surface)" opacity={0.92} />
      <text x={x + w / 2} y={Y(y + h / 2) + labelFs * 0.36} fontSize={labelFs} textAnchor="middle" style={{ fill: 'var(--ink)', fontWeight: 500 }}>
        {label}
      </text>
    </g>
  );
}

/** Cota con marcas a 45° (como en los planos de carpintería). */
function Dim({
  x1,
  y1,
  x2,
  y2,
  label,
  fs,
  side = 'above',
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  fs: number;
  side?: 'above' | 'below' | 'left' | 'right' | 'center';
}) {
  const tick = fs * 0.35;
  const vertical = x1 === x2;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  let tx = mx;
  let ty = my;
  let rotate = 0;
  if (vertical) {
    rotate = -90;
    tx = side === 'right' ? mx + fs * 0.75 : side === 'center' ? mx : mx - fs * 0.45;
  } else {
    ty = side === 'below' ? my + fs * 1.05 : side === 'center' ? my + fs * 0.35 : my - fs * 0.4;
  }
  return (
    <g className="dim">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dim)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {[
        [x1, y1],
        [x2, y2],
      ].map(([x, y], i) => (
        <line key={i} x1={x - tick} y1={y + tick} x2={x + tick} y2={y - tick} stroke="var(--dim)" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      ))}
      <text
        x={tx}
        y={ty}
        fontSize={fs}
        textAnchor="middle"
        transform={rotate ? `rotate(${rotate} ${tx} ${ty})` : undefined}
        style={{ fill: 'var(--dim)', fontWeight: 500 }}
        {...(side === 'center' && vertical ? { dominantBaseline: 'middle' } : {})}
      >
        {label}
      </text>
    </g>
  );
}

/** Línea de referencia fina que une la pieza con la cota. */
function Ext({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--dim)" strokeWidth={0.6} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" opacity={0.7} />;
}

export function FrontView({ unit, result, fs, scale, showDoors }: Props) {
  const W = unit.width;
  const H = unit.height;
  const t = unit.material.thickness;
  const pad = fs * FRONT_PAD.side;
  const padTop = fs * FRONT_PAD.top;
  const padBottom = fs * FRONT_PAD.bottom;
  const vbW = W + pad * 2;
  const vbH = H + padTop + padBottom;
  const Y = (y: number) => H - y; // y del suelo hacia arriba → coordenadas SVG
  const hasBack = unit.back.mode !== 'ninguno';

  return (
    <svg
      className="drawing"
      viewBox={`${-pad} ${-padTop} ${vbW} ${vbH}`}
      width={vbW * scale}
      height={vbH * scale}
      role="img"
      aria-label={`Vista de frente: ${mm(W)} de ancho por ${mm(H)} de alto`}
    >
      <defs>
        <pattern id="wall" width={fs * 0.6} height={fs * 0.6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2={fs * 0.6} stroke="var(--line)" strokeWidth={fs * 0.08} />
        </pattern>
      </defs>

      {/* Fondo visto por los huecos */}
      {result.columns.map((col) => (
        <rect
          key={`bg-${col.index}`}
          x={col.x}
          y={Y(result.columnsTop)}
          width={col.width}
          height={result.columnsTop - result.interior.baseY}
          fill={hasBack ? 'var(--back)' : 'url(#wall)'}
        />
      ))}
      {result.maletero && (
        <rect
          x={t}
          y={Y(result.interior.topY)}
          width={result.interior.width}
          height={result.maletero.height}
          fill={hasBack ? 'var(--back)' : 'url(#wall)'}
        />
      )}

      {/* Suelo */}
      <line x1={-pad * 0.6} y1={H} x2={W + pad * 0.6} y2={H} stroke="var(--muted)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />

      {/* Paneles */}
      {result.panels.map((p, i) => (
        <rect
          key={i}
          x={p.x}
          y={Y(p.y + p.h)}
          width={p.w}
          height={p.h}
          fill={p.recessed ? 'var(--panel-shade)' : 'var(--panel)'}
          stroke="var(--panel-stroke)"
          strokeWidth={1}
          strokeDasharray={p.role === 'estante-movil' ? '5 3' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {/* Soportes de estantes móviles */}
      {result.columns.flatMap((col) =>
        col.shelves
          .filter((s) => s.type === 'movil')
          .flatMap((s) =>
            [col.x + t * 0.6, col.x + col.width - t * 0.6].map((cx, k) => (
              <circle key={`pin-${col.index}-${s.index}-${k}`} cx={cx} cy={Y(s.bottom) + t * 0.5} r={t * 0.28} fill="var(--panel-stroke)" />
            )),
          ),
      )}

      {/* Barrales con perchas vistas de canto */}
      {result.rods.map((r) => {
        const col = result.columns[r.column];
        const count = Math.min(8, Math.max(2, Math.floor(col.width / 120)));
        return (
          <g key={`rod-${r.column}-${r.y}`}>
            {Array.from({ length: count }, (_, k) => {
              const hx = col.x + ((k + 0.5) * col.width) / count;
              const top = Y(r.y) - 8;
              return (
                <g key={k} stroke="var(--muted)" strokeWidth={1} fill="none" vectorEffect="non-scaling-stroke">
                  <path d={`M ${hx} ${top} c 0 -22 22 -22 22 -4`} vectorEffect="non-scaling-stroke" />
                  <line x1={hx} y1={top} x2={hx} y2={top + Math.min(160, r.hanging * 0.18)} vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
            <rect x={col.x + 2} y={Y(r.y) - 8} width={col.width - 4} height={16} rx={8} fill="var(--panel-stroke)" />
            {[col.x, col.x + col.width - 10].map((sx) => (
              <rect key={sx} x={sx} y={Y(r.y) - 22} width={10} height={44} rx={2} fill="var(--muted)" />
            ))}
          </g>
        );
      })}

      {/* Frentes de cajones */}
      {result.drawers.flatMap((d) =>
        d.fronts.map((fy, k) => {
          const handleW = Math.min(128, d.frontW * 0.3);
          return (
            <g key={`drw-${d.column}-${fy}`}>
              <rect
                x={d.x}
                y={Y(fy + d.frontH)}
                width={d.frontW}
                height={d.frontH}
                fill="var(--door)"
                stroke="var(--panel-stroke)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <rect x={d.x + d.frontW / 2 - handleW / 2} y={Y(fy + d.frontH - 30)} width={handleW} height={12} rx={6} fill="var(--panel-stroke)" />
              {k === 0 && d.frontH > fs * 1.8 && (
                <text x={d.x + d.frontW / 2} y={Y(fy + d.frontH / 2) + fs * 0.25} fontSize={Math.min(fs * 0.75, d.frontH * 0.3)} textAnchor="middle" style={{ fill: 'var(--muted)' }}>
                  {d.count} × {mm(d.frontW)} × {mm(d.frontH)}
                </text>
              )}
            </g>
          );
        }),
      )}

      {/* Zapateros */}
      {result.shoeRacks.map((z) => (
        <g key={`shoe-${z.column}-${z.bottom}`}>
          {z.style === 'plano' && <Shoes x={z.x} width={z.width} y={z.bottom} Y={Y} />}
          {z.levels.map((l, k) => {
            if (z.style === 'inclinado') {
              return (
                <g key={k}>
                  <rect
                    x={z.x}
                    y={Y(l.back + t)}
                    width={z.width}
                    height={l.back + t - l.front}
                    fill="var(--panel-shade)"
                    stroke="var(--panel-stroke)"
                    strokeWidth={0.6}
                    vectorEffect="non-scaling-stroke"
                  />
                  <Shoes x={z.x} width={z.width} y={l.back + t - 30} Y={Y} />
                  <rect
                    x={z.x}
                    y={Y(l.front + TOPE_HEIGHT)}
                    width={z.width}
                    height={TOPE_HEIGHT}
                    fill="var(--panel)"
                    stroke="var(--panel-stroke)"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            }
            if (z.style === 'barras') {
              return (
                <g key={k}>
                  <rect x={z.x + 2} y={Y(l.back) - 6} width={z.width - 4} height={12} rx={6} fill="var(--muted)" />
                  <Shoes x={z.x} width={z.width} y={l.front + 4} Y={Y} />
                  <rect x={z.x + 2} y={Y(l.front) - 8} width={z.width - 4} height={16} rx={8} fill="var(--panel-stroke)" />
                </g>
              );
            }
            return (
              <g key={k}>
                <rect
                  x={z.x}
                  y={Y(l.front + t)}
                  width={z.width}
                  height={t}
                  fill="var(--panel)"
                  stroke="var(--panel-stroke)"
                  strokeWidth={1}
                  strokeDasharray="5 3"
                  vectorEffect="non-scaling-stroke"
                />
                <Shoes x={z.x} width={z.width} y={l.front + t} Y={Y} />
              </g>
            );
          })}
        </g>
      ))}

      {/* Alto libre del maletero */}
      {result.maletero && (
        <g>
          <rect
            x={W / 2 - fs * 1.35}
            y={Y(result.maletero.shelfTop + result.maletero.height / 2) - fs * 0.62}
            width={fs * 2.7}
            height={fs * 1.24}
            rx={fs * 0.2}
            fill="var(--surface)"
            opacity={0.92}
          />
          <text x={W / 2} y={Y(result.maletero.shelfTop + result.maletero.height / 2) + fs * 0.36} fontSize={fs} textAnchor="middle" style={{ fill: 'var(--dim)', fontWeight: 500 }}>
            {mm(result.maletero.height)}
          </text>
        </g>
      )}

      {/* Alturas libres dentro de cada hueco */}
      {result.columns.map((col) => {
        let y = result.interior.baseY;
        const cx = col.x + col.width / 2;
        const showLine = col.width > fs * 2.2;
        return col.gaps.map((g, j) => {
          const y0 = y;
          y += g + t;
          const yTop = y0 + g;
          const small = g < fs * 2.2;
          if (col.compartments[j]?.drawers || col.compartments[j]?.shoes) return null;
          return (
            <g key={`gap-${col.index}-${j}`}>
              {showLine && !small && (
                <Dim x1={cx} y1={Y(y0)} x2={cx} y2={Y(yTop)} label="" fs={fs} side="center" />
              )}
              <rect
                x={cx - fs * 1.35}
                y={Y(y0 + g / 2) - fs * 0.62}
                width={fs * 2.7}
                height={fs * 1.24}
                rx={fs * 0.2}
                fill="var(--surface)"
                opacity={0.92}
              />
              <text x={cx} y={Y(y0 + g / 2) + fs * 0.36} fontSize={fs} textAnchor="middle" style={{ fill: 'var(--dim)', fontWeight: 500 }}>
                {mm(g)}
              </text>
            </g>
          );
        });
      })}

      {/* Puertas: primero las del riel de atrás */}
      {showDoors &&
        [...result.doors.doors]
          .sort((a, b) => (a.track === 'trasero' ? 0 : 1) - (b.track === 'trasero' ? 0 : 1))
          .map((d) => <DoorShape key={d.index} door={d} unit={unit} fs={fs} Y={Y} />)}

      {/* Ancho total arriba */}
      <Ext x1={0} y1={-padTop * 0.15} x2={0} y2={-padTop * 0.62} />
      <Ext x1={W} y1={-padTop * 0.15} x2={W} y2={-padTop * 0.62} />
      <Dim x1={0} y1={-padTop * 0.5} x2={W} y2={-padTop * 0.5} label={`${mm(W)}`} fs={fs} />

      {/* Alto total a la izquierda */}
      <Dim x1={-pad * 0.55} y1={0} x2={-pad * 0.55} y2={H} label={`${mm(H)}`} fs={fs} />

      {/* Zócalo a la derecha */}
      {unit.plinth.enabled && (
        <Dim x1={W + pad * 0.35} y1={Y(unit.plinth.height)} x2={W + pad * 0.35} y2={H} label={mm(unit.plinth.height)} fs={fs * 0.85} side="right" />
      )}

      {/* Luz de cada columna abajo */}
      {result.columns.map((col) => (
        <Dim
          key={`w-${col.index}`}
          x1={col.x}
          y1={H + padBottom * 0.42}
          x2={col.x + col.width}
          y2={H + padBottom * 0.42}
          label={mm(col.width)}
          fs={col.width < fs * 3 ? fs * 0.7 : fs}
          side="below"
        />
      ))}
    </svg>
  );
}

/** Corte lateral: muestra la profundidad, el fondo y el retiro de estantes. */
export function SideView({ unit, result, fs, scale, showDoors, column = 0 }: Props) {
  const H = unit.height;
  const D = unit.depth;
  const t = unit.material.thickness;
  const tb = unit.material.backThickness;
  const pad = fs * SIDE_PAD.side;
  const extra = sideExtra(unit);
  const padTop = fs * FRONT_PAD.top;
  const padBottom = fs * FRONT_PAD.bottom;
  const vbW = D + pad * 2 + extra;
  const vbH = H + padTop + padBottom;
  const Y = (y: number) => H - y;
  const mode = unit.back.mode;
  const carcassDepth = mode === 'clavado' ? D - tb : D;
  // x = 0 en el frente, crece hacia atrás.
  const backX = mode === 'clavado' ? carcassDepth : mode === 'ranurado' ? D - unit.back.grooveOffset - tb : null;
  const col = result.columns[column] ?? result.columns[0];
  const shelfY = col?.shelves ?? [];
  const shelfDepth = shelfY[0]?.depth ?? result.shelfDepth - result.frontInset;
  const sideTop = unit.top === 'sobre' ? H - t : H;
  const sideDoor = result.doors.doors.find((d) => d.column === 0 || d.column === null) ?? result.doors.doors[0];

  return (
    <svg
      className="drawing"
      viewBox={`${-pad - extra} ${-padTop} ${vbW} ${vbH}`}
      width={vbW * scale}
      height={vbH * scale}
      role="img"
      aria-label={`Corte lateral: ${mm(D)} de profundidad`}
    >
      <line x1={-pad - extra} y1={H} x2={D + pad} y2={H} stroke="var(--muted)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      {/* Lateral visto desde adentro */}
      <rect x={0} y={Y(sideTop)} width={carcassDepth} height={sideTop} fill="var(--panel-shade)" stroke="var(--panel-stroke)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {/* Techo */}
      <rect x={0} y={0} width={carcassDepth} height={t} fill="var(--panel)" stroke="var(--panel-stroke)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {/* Piso */}
      <rect
        x={0}
        y={Y(result.interior.baseY)}
        width={carcassDepth}
        height={t}
        fill="var(--panel)"
        stroke="var(--panel-stroke)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {/* Zócalo */}
      {unit.plinth.enabled && (
        <rect
          x={unit.plinth.setback}
          y={Y(unit.plinth.height)}
          width={t}
          height={unit.plinth.height}
          fill="var(--panel)"
          stroke="var(--panel-stroke)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {/* Estante maletero */}
      {result.maletero && (
        <rect
          x={0}
          y={Y(result.maletero.shelfTop)}
          width={carcassDepth}
          height={t}
          fill="var(--panel)"
          stroke="var(--panel-stroke)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {/* Barrales y cajones de la primera columna */}
      {(col?.compartments ?? []).map((c) => {
        const front = result.interior.depth - c.depth;
        if (c.shoes) {
          const z = c.shoes;
          return (
            <g key={`z${c.index}`}>
              {z.levels.map((l, k) => {
                if (z.style === 'inclinado') {
                  const x0 = front + t;
                  return (
                    <g key={k}>
                      <polygon
                        points={`${x0},${Y(l.front)} ${x0 + z.run - t},${Y(l.back)} ${x0 + z.run - t},${Y(l.back + t)} ${x0},${Y(l.front + t)}`}
                        fill="var(--panel)"
                        stroke="var(--panel-stroke)"
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                      <rect x={front} y={Y(l.front + TOPE_HEIGHT)} width={t} height={TOPE_HEIGHT} fill="var(--panel)" stroke="var(--panel-stroke)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                    </g>
                  );
                }
                if (z.style === 'barras') {
                  return (
                    <g key={k} fill="var(--panel-stroke)">
                      <circle cx={front + BAR_FRONT} cy={Y(l.front)} r={10} />
                      <circle cx={front + BAR_FRONT + BAR_SPACING} cy={Y(l.back)} r={10} />
                    </g>
                  );
                }
                return (
                  <rect
                    key={k}
                    x={front}
                    y={Y(l.front + t)}
                    width={c.depth}
                    height={t}
                    fill="var(--panel)"
                    stroke="var(--panel-stroke)"
                    strokeWidth={1}
                    strokeDasharray="5 3"
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </g>
          );
        }
        if (c.rod) {
          return <ellipse key={`r${c.index}`} cx={front + c.depth / 2} cy={Y(c.rod.y)} rx={15} ry={8} fill="var(--panel-stroke)" />;
        }
        if (c.drawers) {
          const d = c.drawers;
          return (
            <g key={`d${c.index}`}>
              {d.fronts.map((fy) => (
                <g key={fy}>
                  <rect x={front} y={Y(fy + d.frontH)} width={t} height={d.frontH} fill="var(--door)" stroke="var(--panel-stroke)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
                  <rect
                    x={front + t}
                    y={Y(fy + 10 + d.boxH)}
                    width={d.slide}
                    height={d.boxH}
                    fill="none"
                    stroke="var(--panel-stroke)"
                    strokeWidth={0.8}
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ))}
            </g>
          );
        }
        return null;
      })}
      {/* Estantes de la primera columna (apoyados contra el fondo) */}
      {shelfY.map((s) => (
        <rect
          key={s.index}
          x={result.interior.depth - s.depth}
          y={Y(s.top)}
          width={s.depth}
          height={t}
          fill="var(--panel)"
          stroke="var(--panel-stroke)"
          strokeWidth={1}
          strokeDasharray={s.type === 'movil' ? '5 3' : undefined}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {/* Fondo */}
      {backX !== null && (
        <rect
          x={backX}
          y={mode === 'clavado' ? 1 : Y(result.interior.topY + unit.back.grooveDepth - 1)}
          width={tb}
          height={mode === 'clavado' ? H - 2 : result.interior.height + 2 * (unit.back.grooveDepth - 1)}
          fill="var(--core-line)"
        />
      )}

      {/* Puertas */}
      {showDoors && sideDoor && unit.doors.type === 'batiente' && (
        <rect
          x={unit.doors.mount === 'superpuesta' ? -t : 0}
          y={Y(sideDoor.y + sideDoor.h)}
          width={t}
          height={sideDoor.h}
          fill="var(--door)"
          stroke="var(--panel-stroke)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {showDoors && sideDoor && unit.doors.type === 'corrediza' && (
        <>
          {[6, 6 + t + 6].map((dx, k) => (
            <rect
              key={k}
              x={dx}
              y={Y(sideDoor.y + sideDoor.h)}
              width={t}
              height={sideDoor.h}
              fill={k === 0 ? 'var(--door)' : 'var(--door-back)'}
              stroke="var(--panel-stroke)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <rect x={0} y={Y(result.interior.topY)} width={result.frontInset} height={10} fill="var(--muted)" opacity={0.6} />
          <rect x={0} y={Y(result.interior.baseY + 6)} width={result.frontInset} height={6} fill="var(--muted)" opacity={0.6} />
        </>
      )}

      <Dim x1={0} y1={-padTop * 0.5} x2={D} y2={-padTop * 0.5} label={mm(D)} fs={fs} />
      <Ext x1={0} y1={-padTop * 0.15} x2={0} y2={-padTop * 0.62} />
      <Ext x1={D} y1={-padTop * 0.15} x2={D} y2={-padTop * 0.62} />
      <Dim
        x1={result.interior.depth - shelfDepth}
        y1={H + padBottom * 0.42}
        x2={result.interior.depth}
        y2={H + padBottom * 0.42}
        label={mm(shelfDepth)}
        fs={fs}
        side="below"
      />
    </svg>
  );
}
