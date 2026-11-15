import type { ReactElement } from 'react';
import type { HardwareKind, HardwareUse } from '../lib/assembly';
import { mm } from '../lib/format';
import type { Piece } from '../lib/types';

/** Dibujitos de herrajes, en línea, como en un manual de armado. */
export function HardwareIcon({ kind, size = 30 }: { kind: HardwareKind; size?: number }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const thread = (y0: number, y1: number) =>
    Array.from({ length: Math.floor((y1 - y0) / 2.6) }, (_, i) => `M10 ${y0 + i * 2.6}l4 1.3`).join(' ');
  let body: ReactElement;
  switch (kind) {
    case 'tornillo':
      body = <path {...common} d={`M8.5 2.5h7l-1 2.5h-5z M12 5v15.5 M12 20.5l0 1.5 ${thread(6.5, 19)}`} />;
      break;
    case 'tornillo-corto':
      body = <path {...common} d={`M8.5 5.5h7l-1 2.5h-5z M12 8v10 M12 18l0 1.5 ${thread(9.5, 17)}`} />;
      break;
    case 'tornillo-chico':
      body = <path {...common} d={`M9 7.5h6l-1 2h-4z M12 9.5v7 ${thread(11, 15.5)}`} />;
      break;
    case 'clavo':
      body = <path {...common} d="M8.5 4h7 M12 4v15 l0 2" />;
      break;
    case 'perno':
      body = <path {...common} d="M5 10.5h8v3H5z M13 11h6v2h-6 M9 13.5v4" />;
      break;
    case 'bisagra':
      body = (
        <g {...common}>
          <circle cx="7.5" cy="12" r="4.5" />
          <path d="M11.5 10h9v4h-9 M16 10v4" />
        </g>
      );
      break;
    case 'corredera':
      body = <path {...common} d="M2.5 9h19v6h-19z M5 12h14 M4.5 15v2 M19.5 15v2" />;
      break;
    case 'soporte':
      body = <path {...common} d="M7 4v9a5 5 0 0 0 10 0V4 M5 4h4 M15 4h4" />;
      break;
    case 'barral':
      body = <rect {...common} x="2.5" y="9.5" width="19" height="5" rx="2.5" />;
      break;
    case 'tirador':
      body = <path {...common} d="M3 15h18 M6 15v-4h12v4" />;
      break;
    case 'escuadra':
      body = (
        <g {...common}>
          <path d="M5 4v15h15v-4H9V4z" />
          <circle cx="7" cy="8" r="0.8" />
          <circle cx="15" cy="17" r="0.8" />
        </g>
      );
      break;
    case 'tarugo':
      body = <path {...common} d="M9 4h6v16H9z M9 8h6 M9 12h6 M9 16h6" />;
      break;
    case 'riel':
      body = <path {...common} d="M2.5 9v6h19V9 M7 15V11 M12 15V11 M17 15V11" />;
      break;
    case 'ruedas':
      body = (
        <g {...common}>
          <circle cx="12" cy="13" r="5" />
          <circle cx="12" cy="13" r="1.2" />
          <path d="M8 6h8" />
        </g>
      );
      break;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {body}
    </svg>
  );
}

export function HardwareChip({ h }: { h: HardwareUse }) {
  return (
    <span className="hw-chip" title={h.label}>
      <HardwareIcon kind={h.kind} size={26} />
      <span className="hw-qty num">{h.qty}×</span>
      <span className="hw-label">{h.label}</span>
    </span>
  );
}

/** Pieza dibujada como una tabla en perspectiva, con el tapacanto marcado. */
export function PieceSlab({ piece, width = 150, height = 84 }: { piece: Piece; width?: number; height?: number }) {
  const L = piece.length;
  const Wd = piece.width;
  const T = Math.max(piece.thickness, Math.max(L, Wd) * 0.03);
  const c = Math.cos(Math.PI / 6);
  const s = Math.sin(Math.PI / 6);
  const P = (x: number, y: number, z: number): [number, number] => [(x - y) * c, (x + y) * s - z];
  const top = [P(0, 0, T), P(L, 0, T), P(L, Wd, T), P(0, Wd, T)];
  const front = [P(0, Wd, 0), P(L, Wd, 0), P(L, Wd, T), P(0, Wd, T)];
  const right = [P(L, 0, 0), P(L, Wd, 0), P(L, Wd, T), P(L, 0, T)];
  const pts = [...top, ...front, ...right];
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const bw = Math.max(...xs) - minX;
  const bh = Math.max(...ys) - minY;
  const k = Math.min((width - 8) / bw, (height - 8) / bh);
  const toStr = (poly: [number, number][]) => poly.map(([x, y]) => `${(x - minX) * k + 4},${(y - minY) * k + 4}`).join(' ');
  const banded = piece.material === 'melamina';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="piece-slab">
      <polygon points={toStr(top)} fill="var(--panel)" stroke="var(--panel-stroke)" strokeWidth="1" strokeLinejoin="round" />
      <polygon
        points={toStr(front)}
        fill={banded && piece.edges.long >= 1 ? 'var(--edge)' : 'var(--panel-shade)'}
        stroke="var(--panel-stroke)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <polygon
        points={toStr(right)}
        fill={banded && piece.edges.short >= 1 ? 'var(--edge)' : 'var(--surface-2)'}
        stroke="var(--panel-stroke)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PieceCard({ piece }: { piece: Piece }) {
  return (
    <div className="piece-card">
      <PieceSlab piece={piece} />
      <div className="piece-card-info">
        <span className="code">{piece.code}</span>
        <span className="piece-card-qty num">{piece.qty}×</span>
      </div>
      <span className="piece-card-name">{piece.name}</span>
      <span className="piece-card-dims num">
        {mm(piece.length)} × {mm(piece.width)} × {mm(piece.thickness)}
      </span>
    </div>
  );
}
