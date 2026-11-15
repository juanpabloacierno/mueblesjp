import { useState } from 'react';
import {
  BACK_TYPES,
  BOARD_TYPES,
  CUSTOM_BRAND,
  boardsFor,
  brandLabel,
  colorSuggestions,
  edgeWidthFor,
  looksLikeWood,
  type BackType,
  type BoardType,
  type CatalogBoard,
} from '../lib/catalog';
import { decorsForBoard, lineLabel, matchDecor } from '../lib/decors';
import { mm } from '../lib/format';
import { tr } from '../lib/i18n';
import type { Material } from '../lib/types';
import { NumberField, Switch } from './ui';

type Role = 'cuerpo' | 'interior' | 'fondo';

const OTHER = '__otro';

interface Props {
  role: Role;
  material: Material;
  custom: CatalogBoard[];
  /** Cambia el material del mueble. */
  change: (fn: (m: Material) => void) => void;
  onSaveCustom: (board: CatalogBoard) => void;
  onRemoveCustom: (board: CatalogBoard) => void;
}

/** Campos del material según sea la placa del cuerpo o la del fondo. */
function read(m: Material, role: Role) {
  if (role === 'cuerpo') return { brand: m.brand, type: m.boardType as BoardType | BackType, length: m.boardLength, width: m.boardWidth, thickness: m.thickness };
  if (role === 'interior') {
    const i = m.interior;
    return { brand: i.brand, type: i.boardType as BoardType | BackType, length: i.boardLength, width: i.boardWidth, thickness: m.thickness };
  }
  return { brand: m.backBrand, type: m.backType as BoardType | BackType, length: m.backBoardLength, width: m.backBoardWidth, thickness: m.backThickness };
}

function write(m: Material, role: Role, v: Partial<ReturnType<typeof read>>) {
  if (role === 'cuerpo') {
    if (v.brand !== undefined) m.brand = v.brand;
    if (v.type !== undefined) m.boardType = v.type as BoardType;
    if (v.length !== undefined) m.boardLength = v.length;
    if (v.width !== undefined) m.boardWidth = v.width;
    if (v.thickness !== undefined && v.thickness !== m.thickness) {
      m.thickness = v.thickness;
      m.edgeWidth = edgeWidthFor(v.thickness);
    }
  } else if (role === 'interior') {
    // El interior comparte el espesor del exterior: la geometría del mueble es una sola.
    if (v.brand !== undefined) m.interior.brand = v.brand;
    if (v.type !== undefined) m.interior.boardType = v.type as BoardType;
    if (v.length !== undefined) m.interior.boardLength = v.length;
    if (v.width !== undefined) m.interior.boardWidth = v.width;
  } else {
    if (v.brand !== undefined) m.backBrand = v.brand;
    if (v.type !== undefined) m.backType = v.type as BackType;
    if (v.length !== undefined) m.backBoardLength = v.length;
    if (v.width !== undefined) m.backBoardWidth = v.width;
    if (v.thickness !== undefined) m.backThickness = v.thickness;
  }
}

const sizeKey = (b: { length: number; width: number }) => `${b.length}x${b.width}`;

/** Elige el espesor pedido si existe; si no, el más cercano. */
function closest(list: number[], wanted: number): number {
  return list.reduce((best, t) => (Math.abs(t - wanted) < Math.abs(best - wanted) ? t : best), list[0]);
}

export function BoardPicker({ role, material, custom, change, onSaveCustom, onRemoveCustom }: Props) {
  const id = role === 'cuerpo' ? 'b' : role === 'interior' ? 'bi' : 'bk';
  const cur = read(material, role);
  const kind = role === 'fondo' ? 'fondo' : 'cuerpo';
  const boards = boardsFor(kind, custom);
  const types = kind === 'cuerpo' ? BOARD_TYPES : BACK_TYPES;
  const brands = [...new Set(boards.map((b) => b.brand))];
  const isCustom = cur.brand === CUSTOM_BRAND || !brands.includes(cur.brand);
  const ofBrand = boards.filter((b) => b.brand === cur.brand);
  const typeOptions = isCustom ? types : types.filter((t) => ofBrand.some((b) => b.type === t.value));
  const ofType = ofBrand.filter((b) => b.type === cur.type);
  const sizes = [...new Map(ofType.map((b) => [sizeKey(b), b])).values()];
  const selected = ofType.find((b) => sizeKey(b) === sizeKey(cur)) ?? ofType[0];
  const thicknesses = selected?.thicknesses ?? [];
  const typeHint = types.find((t) => t.value === cur.type)?.hint;
  const [saveName, setSaveName] = useState('');
  const decors = isCustom ? [] : decorsForBoard(cur.brand, cur.type, cur.length, cur.width);
  const lines = [...new Set(decors.map((d) => d.line))];
  const decor = matchDecor(decors, role === 'interior' ? material.interior.color : material.color);

  /** Aplica una placa del catálogo conservando el espesor si se puede. */
  const pick = (brand: string, type?: BoardType | BackType, size?: string) => {
    change((m) => {
      if (brand === CUSTOM_BRAND) {
        write(m, role, { brand });
        return;
      }
      const list = boards.filter((b) => b.brand === brand);
      const t = type && list.some((b) => b.type === type) ? type : list.some((b) => b.type === cur.type) ? cur.type : list[0].type;
      const ofT = list.filter((b) => b.type === t);
      const board = ofT.find((b) => sizeKey(b) === size) ?? ofT[0];
      write(m, role, { brand, type: t, length: board.length, width: board.width, thickness: closest(board.thicknesses, read(m, role).thickness) });
      if (role === 'fondo') return;
      // Conserva el color si la marca lo tiene; si no, el más parecido por nombre ("Blanco" → "Blanco Tundra 135").
      const target = role === 'interior' ? m.interior : m;
      const options = decorsForBoard(brand, t, board.length, board.width);
      const word = target.color.trim().split(/\s+/)[0]?.toLowerCase() ?? '';
      const next = matchDecor(options, target.color) ?? (word.length >= 3 ? options.find((d) => d.name.toLowerCase().startsWith(word)) : undefined);
      if (next) {
        target.color = next.name;
        target.hasGrain = next.wood;
      }
    });
  };

  return (
    <div className="board-picker">
      <div className="grid-2">
        <div className="field">
          <label className="field-label" htmlFor={`f-${id}-brand`}>
            {tr('Marca', 'Brand')}
          </label>
          <select id={`f-${id}-brand`} className="input" value={isCustom ? CUSTOM_BRAND : cur.brand} onChange={(e) => pick(e.target.value)}>
            {brands.map((b) => (
              <option key={b} value={b}>
                {brandLabel(b)}
                {custom.some((c) => c.brand === b) ? tr(' (mía)', ' (mine)') : ''}
              </option>
            ))}
            <option value={CUSTOM_BRAND}>{tr('Otra: medidas a mano', 'Other: enter sizes by hand')}</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`f-${id}-type`}>
            {tr('Tipo', 'Type')}
          </label>
          <select
            id={`f-${id}-type`}
            className="input"
            value={cur.type}
            onChange={(e) => (isCustom ? change((m) => write(m, role, { type: e.target.value as BoardType })) : pick(cur.brand, e.target.value as BoardType))}
          >
            {typeOptions.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isCustom ? (
        <>
          <div className="grid-3">
            <NumberField id={`f-${id}-l`} label={tr('Largo', 'Length')} value={cur.length} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { length: v }))} />
            <NumberField id={`f-${id}-w`} label={tr('Ancho', 'Width')} value={cur.width} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { width: v }))} />
            {role === 'interior' ? (
              <div className="field">
                <span className="field-label">{tr('Espesor', 'Thickness')}</span>
                <span className="input num" style={{ display: 'flex', alignItems: 'center' }}>
                  {mm(cur.thickness)} mm
                </span>
              </div>
            ) : (
              <NumberField id={`f-${id}-t`} label={tr('Espesor', 'Thickness')} value={cur.thickness} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { thickness: v }))} />
            )}
          </div>
          <div className="save-board">
            <input
              id={`f-${id}-save`}
              className="input"
              type="text"
              placeholder={tr('Marca o proveedor, p. ej. Maderas López', 'Brand or supplier, e.g. Smith Lumber')}
              aria-label={tr('Nombre para guardar este tablero', 'Name to save this board')}
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-sm"
              disabled={!saveName.trim()}
              onClick={() => {
                const brand = saveName.trim();
                onSaveCustom({ brand, type: cur.type, length: cur.length, width: cur.width, thicknesses: [cur.thickness], custom: true });
                change((m) => write(m, role, { brand }));
                setSaveName('');
              }}
            >
              {tr('Guardar en mis tableros', 'Save to my boards')}
            </button>
          </div>
        </>
      ) : (
        <div className="grid-2">
          <div className="field">
            <label className="field-label" htmlFor={`f-${id}-size`}>
              {tr('Medida', 'Size')}
            </label>
            <select id={`f-${id}-size`} className="input" value={sizeKey(cur)} onChange={(e) => pick(cur.brand, cur.type, e.target.value)}>
              {sizes.map((b) => (
                <option key={sizeKey(b)} value={sizeKey(b)}>
                  {mm(b.length)} × {mm(b.width)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`f-${id}-thick`}>
              {tr('Espesor', 'Thickness')}
            </label>
            {role === 'interior' ? (
              <input id={`f-${id}-thick`} className="input" readOnly value={`${mm(cur.thickness)} mm`} title={tr('El interior va del mismo espesor que el exterior', 'The interior uses the same thickness as the exterior')} />
            ) : (
              <select id={`f-${id}-thick`} className="input" value={cur.thickness} onChange={(e) => change((m) => write(m, role, { thickness: Number(e.target.value) }))}>
                {thicknesses.map((t) => (
                  <option key={t} value={t}>
                    {mm(t)} mm
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      )}

      <span className="field-hint">
        {role === 'interior' && !isCustom && selected && !selected.thicknesses.includes(cur.thickness) && (
          <strong>{tr(`Este tablero no figura en ${mm(cur.thickness)} mm: confírmalo con tu proveedor. `, `This board is not listed in ${mm(cur.thickness)} mm: check with your supplier. `)}</strong>
        )}
        {typeHint}
        {!isCustom && selected?.custom && (
          <>
            {' '}
            <button type="button" className="link-btn" onClick={() => onRemoveCustom(selected)}>
              {tr('Quitar de mis tableros', 'Remove from my boards')}
            </button>
          </>
        )}
      </span>

      {role !== 'fondo' && (
        <>
          {cur.type !== 'mdf' && cur.type !== 'aglomerado' && decors.length > 0 && (
            <div className="field">
              <label className="field-label" htmlFor={`f-${id}-decor`}>
                Color · {cur.brand}
              </label>
              <select
                id={`f-${id}-decor`}
                className="input"
                value={decor ? decor.name : OTHER}
                onChange={(e) => {
                  const d = decors.find((x) => x.name === e.target.value);
                  change((m) => {
                    const target = role === 'interior' ? m.interior : m;
                    if (d) {
                      target.color = d.name;
                      target.hasGrain = d.wood;
                    } else if (decor) {
                      target.color = '';
                    }
                  });
                }}
              >
                {lines.map((line) => (
                  <optgroup key={line} label={lineLabel(line)}>
                    {decors
                      .filter((d) => d.line === line)
                      .map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                          {d.alias ? ` · ${d.alias}` : ''}
                          {d.uncertain ? tr(' (a confirmar)', ' (to be confirmed)') : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
                <option value={OTHER}>{tr('Otro color (escribir)', 'Other color (type it)')}</option>
              </select>
              {decor && (
                <span className="decor-chip">
                  <i className="swatch" style={{ background: decor.hex }} />
                  {decor.wood ? tr('Diseño de madera, con veta', 'Wood design, with grain') : tr('Liso', 'Solid color')}
                  {decor.code ? tr(` · código ${decor.code}`, ` · code ${decor.code}`) : ''}
                  {decor.thicknesses && !decor.thicknesses.includes(cur.thickness) && (
                    <strong>
                      {tr(
                        ` · figura en ${decor.thicknesses.map((x) => mm(x)).join(', ')} mm: confirma ${mm(cur.thickness)} mm`,
                        ` · listed in ${decor.thicknesses.map((x) => mm(x)).join(', ')} mm: confirm ${mm(cur.thickness)} mm`,
                      )}
                    </strong>
                  )}
                </span>
              )}
            </div>
          )}
          {cur.type !== 'mdf' && cur.type !== 'aglomerado' && (decors.length === 0 || !decor) && (
            <div className="field">
              <label className="field-label" htmlFor={`f-${id}-color`}>
                {decors.length ? tr('Nombre del color', 'Color name') : tr('Color o diseño', 'Color or design')}
              </label>
              <input
                id={`f-${id}-color`}
                className="input"
                type="text"
                list="color-suggestions"
                value={role === 'interior' ? material.interior.color : material.color}
                placeholder={tr('Blanco, Roble, Gris humo…', 'White, Oak, Smoke grey…')}
                onChange={(e) => {
                  const color = e.target.value;
                  change((m) => {
                    const target = role === 'interior' ? m.interior : m;
                    target.color = color;
                    // Los diseños de madera tienen veta; los lisos no.
                    if (color.trim().length >= 3) target.hasGrain = looksLikeWood(color);
                  });
                }}
              />
            </div>
          )}
          <Switch
            id={`f-${id}-grain`}
            label={tr('Tiene veta (las piezas no se giran en el tablero)', 'Has grain (pieces are not rotated on the board)')}
            checked={role === 'interior' ? material.interior.hasGrain : material.hasGrain}
            onChange={(v) => change((m) => void ((role === 'interior' ? m.interior : m).hasGrain = v))}
          />
        </>
      )}
      {role === 'cuerpo' && (
        <datalist id="color-suggestions">
          {colorSuggestions().map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      )}
    </div>
  );
}
