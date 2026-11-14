import { mm } from '../lib/format';
import { CUP_EDGE_DISTANCE } from '../lib/doors';
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
          y={Y(result.interior.topY)}
          width={col.width}
          height={result.interior.height}
          fill={hasBack ? 'var(--back)' : 'url(#wall)'}
        />
      ))}

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
export function SideView({ unit, result, fs, scale, showDoors }: Props) {
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
  const shelfY = result.columns[0]?.shelves ?? [];
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
