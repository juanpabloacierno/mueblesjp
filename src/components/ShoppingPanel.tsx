import { useEffect, useRef, useState } from 'react';
import { money } from '../lib/format';
import { CATEGORIES, formatQty, isChecked, shoppingText, shoppingTotals, unitLabel, type PriceList, type ShoppingItem } from '../lib/shopping';
import type { ShelfUnit } from '../lib/types';
import { CopyButton } from './ui';

interface Props {
  unit: ShelfUnit;
  items: ShoppingItem[];
  prices: PriceList;
  setPrice: (key: string, value: number | null) => void;
  setChecked: (key: string, value: boolean) => void;
  resetChecks: () => void;
  notify: (msg: string) => void;
}

const domId = (key: string) => key.replace(/[^a-z0-9-]/gi, '_');

function PriceInput({ id, value, unitName, onChange }: { id: string; value: number | undefined; unitName: string; onChange: (v: number | null) => void }) {
  const show = (v: number | undefined) => (v && v > 0 ? String(v).replace('.', ',') : '');
  const [text, setText] = useState(show(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);
  return (
    <span className="price-input">
      <span aria-hidden="true">$</span>
      <input
        id={id}
        className="input"
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={`por ${unitName}`}
        aria-label={`Precio por ${unitName}`}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(show(value));
        }}
        onChange={(e) => {
          setText(e.target.value);
          const raw = e.target.value.replace(/\./g, '').replace(',', '.').trim();
          if (raw === '') return onChange(null);
          const n = Number(raw);
          if (Number.isFinite(n) && n >= 0) onChange(n);
        }}
      />
    </span>
  );
}

export function ShoppingPanel({ unit, items, prices, setPrice, setChecked, resetChecks, notify }: Props) {
  if (items.length === 0) return <p className="empty-note">Corregí los errores de arriba para ver la lista de compras.</p>;
  const totals = shoppingTotals(unit, items, prices);
  const customized = Object.keys(unit.shopping).length > 0;

  return (
    <div className="panel-body">
      <div className="card">
        <div className="card-title">
          <h3>Lista de compras</h3>
          <p>Todo lo que puede hacer falta. Tildá lo que vas a comprar y cargá tus precios para estimar el costo.</p>
        </div>
        <div className="stats" style={{ marginBottom: 14 }}>
          <div className="stat">
            <span className="stat-value">{totals.total > 0 ? money(totals.total) : '—'}</span>
            <span className="stat-label">total estimado</span>
          </div>
          <div className="stat">
            <span className="stat-value">
              {totals.checked}
              <small>de {items.length}</small>
            </span>
            <span className="stat-label">ítems para comprar</span>
          </div>
          <div className="stat">
            <span className="stat-value">{totals.missingPrice}</span>
            <span className="stat-label">{totals.missingPrice === 1 ? 'ítem sin precio' : 'ítems sin precio'}</span>
          </div>
        </div>
        <div className="toolbar no-print">
          <CopyButton className="btn btn-primary" label="Copiar lista para WhatsApp" text={() => shoppingText(unit, items, prices)} onCopied={notify} />
          {customized && (
            <button type="button" className="btn" onClick={resetChecks}>
              Volver a lo recomendado
            </button>
          )}
        </div>
      </div>

      {CATEGORIES.map((cat) => {
        const list = items.filter((i) => i.category === cat.key);
        if (list.length === 0) return null;
        const sub = totals.byCategory[cat.key];
        return (
          <div className="card" key={cat.key}>
            <div className="card-title">
              <h3>{cat.label}</h3>
              <p>
                {cat.hint ? `${cat.hint} · ` : ''}
                {sub > 0 ? money(sub) : `${list.filter((i) => isChecked(unit, i)).length} de ${list.length} tildados`}
              </p>
            </div>
            <ul className="shop-list">
              {list.map((it) => {
                const on = isChecked(unit, it);
                const price = prices[it.key];
                const id = domId(it.key);
                return (
                  <li key={it.key} className={`shop-row ${on ? '' : 'off'}`}>
                    <input id={`buy-${id}`} type="checkbox" checked={on} onChange={(e) => setChecked(it.key, e.target.checked)} />
                    <label htmlFor={`buy-${id}`} className="shop-name">
                      <span>
                        {it.name}
                        {it.optional && it.category !== 'herramientas' && <span className="tag">Opcional</span>}
                      </span>
                      {it.note && <span className="piece-notes">{it.note}</span>}
                    </label>
                    <span className="shop-qty num">{formatQty(it.qty, it.unit)}</span>
                    <PriceInput id={`price-${id}`} value={price} unitName={unitLabel(it.unit)} onChange={(v) => setPrice(it.key, v)} />
                    <span className="shop-sub num">{price > 0 ? money(price * it.qty) : '—'}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="footer-note" style={{ margin: 0 }}>
        Los precios se guardan para todos tus muebles: cargalos una vez. Las cantidades de tornillos y clavos son estimadas; conviene comprar algunos de más.
      </p>
    </div>
  );
}
