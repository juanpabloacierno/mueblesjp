import type { Summary } from '../lib/cutlist';
import { mm, money, num } from '../lib/format';
import type { ShelfUnit, ShelfUnitResult } from '../lib/types';
import { CopyButton } from './ui';

interface Props {
  unit: ShelfUnit;
  result: ShelfUnitResult;
  summary: Summary;
  notify: (msg: string) => void;
}

function shoppingText(unit: ShelfUnit, result: ShelfUnitResult, summary: Summary): string {
  const m = unit.material;
  const lines = [`*Compras: ${unit.name}*`];
  lines.push(`• ${summary.melamina.pack.sheets.length} placa(s) de melamina ${m.color} ${mm(m.thickness)} mm (${summary.melamina.boardLabel})`);
  if (summary.fondo) lines.push(`• ${summary.fondo.pack.sheets.length} placa(s) de fondo ${mm(m.backThickness)} mm (${summary.fondo.boardLabel})`);
  if (summary.edgeToBuy) lines.push(`• ${summary.edgeToBuy} m de tapacanto ${m.color} ${mm(m.edgeWidth)} mm`);
  for (const h of result.hardware) lines.push(`• ${h.qty} ${h.unit === 'u' ? '' : h.unit + ' '}${h.name}`.replace('  ', ' '));
  if (summary.costTotal > 0) lines.push('', `Materiales estimados: ${money(summary.costTotal)}`);
  return lines.join('\n');
}

export function ShoppingPanel({ unit, result, summary, notify }: Props) {
  const m = unit.material;
  if (result.pieces.length === 0) return <p className="empty-note">Corregí los errores de arriba para ver la lista de compras.</p>;
  return (
    <div className="plan-grid">
      <div className="card">
        <div className="card-title">
          <h3>Materiales</h3>
          <CopyButton className="btn btn-sm no-print" label="Copiar lista" text={() => shoppingText(unit, result, summary)} onCopied={notify} />
        </div>
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>
                  Placa de melamina {m.color} {mm(m.thickness)} mm
                  <span className="piece-notes">
                    {summary.melamina.boardLabel} · aprovechamiento {Math.round(summary.melamina.pack.efficiency * 100)} %
                  </span>
                </td>
                <td className="n">{summary.melamina.pack.sheets.length}</td>
              </tr>
              {summary.fondo && (
                <tr>
                  <td>
                    Placa de fondo {mm(m.backThickness)} mm
                    <span className="piece-notes">
                      {summary.fondo.boardLabel} · {num(summary.fondo.area)} m² de piezas
                    </span>
                  </td>
                  <td className="n">{summary.fondo.pack.sheets.length}</td>
                </tr>
              )}
              {summary.edgeToBuy > 0 && (
                <tr>
                  <td>
                    Tapacanto {m.color} {mm(m.edgeWidth)} mm × {num(m.edgeThickness)} mm
                    <span className="piece-notes">{num(summary.edgeMeters, 1)} m justos + 10 % para recortes</span>
                  </td>
                  <td className="n">{summary.edgeToBuy} m</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mat-heading" style={{ marginTop: 20 }}>
          <h4>Herrajes y tornillos</h4>
          <span>Cantidades estimadas</span>
        </div>
        <div className="table-wrap">
          <table>
            <tbody>
              {result.hardware.map((h) => (
                <tr key={h.name}>
                  <td>
                    {h.name}
                    {h.notes && <span className="piece-notes">{h.notes}</span>}
                  </td>
                  <td className="n">
                    {h.qty}
                    {h.unit !== 'u' ? ` ${h.unit}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">
          <h3>Costo de materiales</h3>
        </div>
        {summary.cost.length === 0 ? (
          <p className="empty-note" style={{ margin: 0 }}>
            Cargá los precios de tu proveedor en la sección “Precios” del formulario para estimar el costo.
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <tbody>
                {summary.cost.map((c) => (
                  <tr key={c.label}>
                    <td>
                      {c.label}
                      <span className="piece-notes">{c.qty}</span>
                    </td>
                    <td className="n">{money(c.amount)}</td>
                  </tr>
                ))}
                <tr className="cost-total">
                  <td>Total estimado</td>
                  <td className="n">{money(summary.costTotal)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
        <p className="field-hint" style={{ margin: '12px 0 0' }}>
          No incluye herrajes ni cola. Las placas se cuentan enteras; algunos aserraderos venden por m² o medias placas.
        </p>
      </div>
    </div>
  );
}
