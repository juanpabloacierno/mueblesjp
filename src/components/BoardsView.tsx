import type { MaterialPlan, Summary } from '../lib/cutlist';
import { mm, num } from '../lib/format';
import type { Sheet } from '../lib/packing';
import type { Piece, ShelfUnit } from '../lib/types';

function SheetDrawing({ sheet, plan, boardL, boardW, trim, grain, id }: { sheet: Sheet; plan: MaterialPlan; boardL: number; boardW: number; trim: number; grain: boolean; id: string }) {
  const fs = boardL * 0.022;
  const byCode = new Map<string, Piece>(plan.pieces.map((p) => [p.code, p]));
  const edgeW = Math.max(boardL * 0.004, 6);
  const isMel = plan.pieces[0]?.material === 'melamina';
  const padTop = fs * 1.8;

  return (
    <svg className="sheet-svg" viewBox={`0 ${-padTop} ${boardL} ${boardW + padTop}`} role="img" aria-label={`Placa de ${mm(boardL)} por ${mm(boardW)} con ${sheet.placements.length} piezas`}>
      <defs>
        <pattern id={`hatch-${id}`} width={fs * 0.9} height={fs * 0.9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={fs * 0.9} height={fs * 0.9} fill="var(--core)" />
          <line x1="0" y1="0" x2="0" y2={fs * 0.9} stroke="var(--core-line)" strokeWidth={fs * 0.12} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={boardL} height={boardW} fill={`url(#hatch-${id})`} stroke="var(--panel-stroke)" strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
      {trim > 0 && (
        <rect
          x={trim}
          y={trim}
          width={boardL - 2 * trim}
          height={boardW - 2 * trim}
          fill="none"
          stroke="var(--core-line)"
          strokeWidth={1}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* Sobrantes aprovechables */}
      {sheet.free
        .filter((f) => f.w >= 150 && f.h >= 150)
        .map((f, i) => (
          <text
            key={`f-${i}`}
            x={f.x + f.w / 2}
            y={f.y + f.h / 2 + fs * 0.35}
            fontSize={Math.min(fs * 0.85, f.w / 7)}
            textAnchor="middle"
            style={{ fill: 'var(--muted)' }}
          >
            {mm(f.w)} × {mm(f.h)}
          </text>
        ))}

      {sheet.placements.map((p, i) => {
        const piece = byCode.get(p.ref)!;
        const minSide = Math.min(p.w, p.h);
        const labelFs = Math.min(fs * 1.25, minSide * 0.45);
        const vertical = p.h > p.w * 1.6 && p.w < fs * 6;
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h / 2;
        const showDims = (vertical ? p.h : p.w) > fs * 7 && minSide > fs * 2.6;
        // Lados del largo de la pieza: horizontales si no está girada.
        const longEdges = piece.edges.long;
        const shortEdges = piece.edges.short;
        const lines: [number, number, number, number][] = [];
        if (isMel) {
          if (!p.rotated) {
            if (longEdges >= 1) lines.push([p.x, p.y + p.h, p.x + p.w, p.y + p.h]);
            if (longEdges >= 2) lines.push([p.x, p.y, p.x + p.w, p.y]);
            if (shortEdges >= 1) lines.push([p.x + p.w, p.y, p.x + p.w, p.y + p.h]);
            if (shortEdges >= 2) lines.push([p.x, p.y, p.x, p.y + p.h]);
          } else {
            if (longEdges >= 1) lines.push([p.x + p.w, p.y, p.x + p.w, p.y + p.h]);
            if (longEdges >= 2) lines.push([p.x, p.y, p.x, p.y + p.h]);
            if (shortEdges >= 1) lines.push([p.x, p.y + p.h, p.x + p.w, p.y + p.h]);
            if (shortEdges >= 2) lines.push([p.x, p.y, p.x + p.w, p.y]);
          }
        }
        const inset = edgeW / 2;
        return (
          <g key={i}>
            <rect x={p.x} y={p.y} width={p.w} height={p.h} fill="var(--panel)" stroke="var(--panel-stroke)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            {lines.map(([x1, y1, x2, y2], k) => {
              // Corre la línea hacia adentro para que no tape el borde.
              const dx = x1 === x2 ? (x1 === p.x ? inset : -inset) : 0;
              const dy = y1 === y2 ? (y1 === p.y ? inset : -inset) : 0;
              return <line key={k} x1={x1 + dx} y1={y1 + dy} x2={x2 + dx} y2={y2 + dy} stroke="var(--edge)" strokeWidth={edgeW} />;
            })}
            <g transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}>
              <text x={cx} y={cy + (showDims ? -labelFs * 0.05 : labelFs * 0.36)} fontSize={labelFs} textAnchor="middle" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                {p.ref}
              </text>
              {showDims && (
                <text x={cx} y={cy + labelFs * 0.95} fontSize={fs * 0.72} textAnchor="middle" style={{ fill: 'var(--muted)' }}>
                  {mm(p.rotated ? p.h : p.w)} × {mm(p.rotated ? p.w : p.h)}
                </text>
              )}
            </g>
          </g>
        );
      })}

      {grain && (
        <g>
          <text x={0} y={-fs * 0.55} fontSize={fs * 0.9} style={{ fill: 'var(--muted)' }}>
            Veta ⟶
          </text>
        </g>
      )}
      <text x={boardL} y={-fs * 0.55} fontSize={fs * 0.9} textAnchor="end" style={{ fill: 'var(--muted)' }}>
        {mm(boardL)} × {mm(boardW)}
      </text>
    </svg>
  );
}

function PlanSheets({ plan, isBack }: { plan: MaterialPlan; isBack: boolean }) {
  const m = plan.material;
  const boardL = isBack ? m.backBoardLength : m.boardLength;
  const boardW = isBack ? m.backBoardWidth : m.boardWidth;
  const total = plan.pack.sheets.length;
  if (total === 0) return null;
  return (
    <div className="card">
      <div className="card-title">
        <h3>{plan.label}</h3>
        <p>
          {total} {total === 1 ? 'placa' : 'placas'} de {plan.boardLabel} · aprovechamiento {Math.round(plan.pack.efficiency * 100)} %
        </p>
      </div>
      <div className="sheet-list">
        {plan.pack.sheets.map((sheet, i) => {
          const counts = new Map<string, number>();
          for (const p of sheet.placements) counts.set(p.ref, (counts.get(p.ref) ?? 0) + 1);
          const pct = Math.round((sheet.usedArea / (boardL * boardW)) * 100);
          return (
            <div key={i}>
              <div className="row-between" style={{ marginBottom: 6 }}>
                <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                  Placa {i + 1} de {total}
                </strong>
                <span className="field-hint">
                  {sheet.placements.length} piezas · {pct} % usado
                </span>
              </div>
              <SheetDrawing sheet={sheet} plan={plan} boardL={boardL} boardW={boardW} trim={m.trim} grain={!isBack && m.hasGrain} id={`${isBack ? 'b' : 'm'}${i}`} />
              <div className="sheet-legend">
                {[...counts.entries()].map(([code, qty]) => {
                  const p = plan.pieces.find((x) => x.code === code)!;
                  return (
                    <div key={code}>
                      <span className="code">{code}</span>
                      <span>
                        {p.name} <span className="num muted">×{qty}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BoardsView({ unit, summary }: { unit: ShelfUnit; summary: Summary }) {
  const m = unit.material;
  if (summary.melamina.pieces.length === 0) return <p className="empty-note">Corregí los errores de arriba para ver las placas.</p>;
  return (
    <div className="panel-body">
      <p className="footer-note" style={{ margin: 0 }}>
        Distribución orientativa con cortes de lado a lado (como una seccionadora), sierra de {mm(m.kerf)} mm y {mm(m.trim)} mm de refilado por borde.
        {summary.boards.some((b) => b.material.hasGrain) ? ' Las piezas con veta no se giran.' : ' Sin veta: las piezas se pueden girar.'} Las medidas en gris son los sobrantes aprovechables. El
        aserradero puede acomodarlas distinto.
      </p>
      {summary.boards.map((b) => (
        <PlanSheets key={b.label} plan={b} isBack={false} />
      ))}
      {summary.fondo && <PlanSheets plan={summary.fondo} isBack />}
      <p className="field-hint" style={{ margin: 0 }}>
        Total de piezas: {num(summary.boards.reduce((a, b) => a + b.area, 0) + (summary.fondo?.area ?? 0))} m².
      </p>
    </div>
  );
}
