import { cutListCsv, cutListText, cutSize, edgeLabel, type MaterialPlan, type Summary } from '../lib/cutlist';
import { mm, num } from '../lib/format';
import { pieceName, tr } from '../lib/i18n';
import type { Piece, ShelfUnit } from '../lib/types';
import { CopyButton, downloadFile, slug } from './ui';

/** Dibujito de la pieza con los lados que llevan tapacanto marcados. */
export function EdgeIcon({ piece, size = 34 }: { piece: Piece; size?: number }) {
  const ratio = Math.min(Math.max(piece.width / piece.length, 0.25), 1);
  const w = size;
  const h = Math.max(8, Math.round(size * ratio * 0.75));
  const pad = 3;
  const { long, short } = piece.edges;
  const stroke = 3;
  return (
    <svg width={w + pad * 2} height={h + pad * 2} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`} aria-hidden="true">
      <rect x={0} y={0} width={w} height={h} fill="var(--panel)" stroke="var(--panel-stroke)" strokeWidth={1} />
      {long >= 1 && <line x1={0} y1={h} x2={w} y2={h} stroke="var(--edge)" strokeWidth={stroke} />}
      {long >= 2 && <line x1={0} y1={0} x2={w} y2={0} stroke="var(--edge)" strokeWidth={stroke} />}
      {short >= 1 && <line x1={w} y1={0} x2={w} y2={h} stroke="var(--edge)" strokeWidth={stroke} />}
      {short >= 2 && <line x1={0} y1={0} x2={0} y2={h} stroke="var(--edge)" strokeWidth={stroke} />}
    </svg>
  );
}

function PieceTable({ plan }: { plan: MaterialPlan }) {
  const isMel = plan.pieces[0]?.material === 'melamina';
  return (
    <>
      <div className="mat-heading">
        <h4>{plan.label}</h4>
        <span>
          {tr(`Tablero ${plan.boardLabel} · ${num(plan.area)} m² de piezas`, `Board ${plan.boardLabel} · ${num(plan.area)} m² of pieces`)}
        </span>
      </div>
      <div className="table-wrap">
        <table className="cut-table">
          <colgroup>
            <col className="c-code" />
            <col />
            <col className="c-qty" />
            <col className="c-dim" />
            <col className="c-dim" />
            <col className="c-edge" />
          </colgroup>
          <thead>
            <tr>
              <th />
              <th>{tr('Pieza', 'Piece')}</th>
              <th className="n">{tr('Cant.', 'Qty')}</th>
              <th className="n">{tr('Largo', 'Length')}</th>
              <th className="n">{tr('Ancho', 'Width')}</th>
              <th>{isMel ? tr('Tapacanto', 'Edge banding') : ''}</th>
            </tr>
          </thead>
          <tbody>
            {plan.pieces.map((p) => {
              const size = cutSize(p, plan.material);
              const adjusted = size.length !== p.length || size.width !== p.width;
              return (
                <tr key={p.code}>
                  <td>
                    <span className="code">{p.code}</span>
                  </td>
                  <td>
                    <span className="piece-name">{pieceName(p.name)}</span>
                    {(p.notes.length > 0 || adjusted) && (
                      <span className="piece-notes">
                        {[...p.notes, ...(adjusted ? [tr(`Terminada: ${mm(p.length)} × ${mm(p.width)}`, `Finished: ${mm(p.length)} × ${mm(p.width)}`)] : [])].join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="n">{p.qty}</td>
                  <td className="n">{mm(size.length)}</td>
                  <td className="n">{mm(size.width)}</td>
                  <td>
                    {isMel ? (
                      <span className="edge-cell">
                        <EdgeIcon piece={p} />
                        <span className={p.edges.long || p.edges.short ? 'num' : 'muted'}>{edgeLabel(p)}</span>
                      </span>
                    ) : (
                      <span className="muted">{tr(`${mm(p.thickness)} mm, sin tapacanto`, `${mm(p.thickness)} mm, no edge banding`)}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

interface Props {
  unit: ShelfUnit;
  summary: Summary;
  pieces: Piece[];
  notify: (msg: string) => void;
}

export function CutList({ unit, summary, pieces, notify }: Props) {
  const m = unit.material;
  if (pieces.length === 0) return <p className="empty-note">{tr('Corrige los errores de arriba para ver el despiece.', 'Fix the errors above to see the cut list.')}</p>;
  return (
    <div className="card">
      <div className="card-title">
        <h3>{tr('Lista de cortes', 'Cut list')}</h3>
        <p>
          {m.subtractEdge
            ? tr(`Medidas de corte, ya descontado el tapacanto de ${num(m.edgeThickness)} mm.`, `Cutting sizes, with the ${num(m.edgeThickness)} mm edge banding already subtracted.`)
            : tr('Medidas en mm.', 'Sizes in mm.')}{' '}
          {tr('Largo = sentido de la veta.', 'Length = grain direction.')}
        </p>
      </div>
      <div className="toolbar no-print" style={{ marginBottom: 14 }}>
        <CopyButton className="btn btn-primary" label={tr('Copiar para WhatsApp', 'Copy for WhatsApp')} text={() => cutListText(unit, summary)} onCopied={notify} />
        {!__SINGLE_FILE__ && (
          <>
            <button type="button" className="btn" onClick={() => downloadFile(`${tr('despiece', 'cut-list')}-${slug(unit.name)}.csv`, '﻿' + cutListCsv(unit, pieces), 'text/csv;charset=utf-8')}>
              {tr('Descargar CSV', 'Download CSV')}
            </button>
            <button type="button" className="btn" onClick={() => window.print()}>
              {tr('Imprimir', 'Print')}
            </button>
          </>
        )}
      </div>
      {summary.boards.map((b) => (
        <PieceTable key={b.label} plan={b} />
      ))}
      {summary.fondo && <PieceTable plan={summary.fondo} />}
      {summary.edgeMeters > 0 && (
        <p className="field-hint" style={{ margin: '14px 0 0' }}>
          {tr(
            `El tapacanto naranja del dibujo marca qué lados van cubiertos. Total: ${num(summary.edgeMeters, 1)} m de tapacanto de ${mm(m.edgeWidth)} mm.`,
            `The orange edges in the small drawing show which sides get edge banding. Total: ${num(summary.edgeMeters, 1)} m of ${mm(m.edgeWidth)} mm edge banding.`,
          )}
        </p>
      )}
    </div>
  );
}
