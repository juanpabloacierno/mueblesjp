import { useState } from 'react';
import {
  BACK_TYPES,
  BOARD_TYPES,
  COLOR_SUGGESTIONS,
  CUSTOM_BRAND,
  boardsFor,
  edgeWidthFor,
  looksLikeWood,
  type BackType,
  type BoardType,
  type CatalogBoard,
} from '../lib/catalog';
import { mm } from '../lib/format';
import type { Material } from '../lib/types';
import { NumberField, Switch } from './ui';

type Role = 'cuerpo' | 'fondo';

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
  return role === 'cuerpo'
    ? { brand: m.brand, type: m.boardType as BoardType | BackType, length: m.boardLength, width: m.boardWidth, thickness: m.thickness }
    : { brand: m.backBrand, type: m.backType as BoardType | BackType, length: m.backBoardLength, width: m.backBoardWidth, thickness: m.backThickness };
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
  const id = role === 'cuerpo' ? 'b' : 'bk';
  const cur = read(material, role);
  const boards = boardsFor(role, custom);
  const types = role === 'cuerpo' ? BOARD_TYPES : BACK_TYPES;
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
    });
  };

  return (
    <div className="board-picker">
      <div className="grid-2">
        <div className="field">
          <label className="field-label" htmlFor={`f-${id}-brand`}>
            Marca
          </label>
          <select id={`f-${id}-brand`} className="input" value={isCustom ? CUSTOM_BRAND : cur.brand} onChange={(e) => pick(e.target.value)}>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
                {custom.some((c) => c.brand === b) ? ' (mía)' : ''}
              </option>
            ))}
            <option value={CUSTOM_BRAND}>Otra: medidas a mano</option>
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor={`f-${id}-type`}>
            Tipo
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
            <NumberField id={`f-${id}-l`} label="Largo" value={cur.length} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { length: v }))} />
            <NumberField id={`f-${id}-w`} label="Ancho" value={cur.width} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { width: v }))} />
            <NumberField id={`f-${id}-t`} label="Espesor" value={cur.thickness} min={1} onChange={(v) => v !== null && change((m) => write(m, role, { thickness: v }))} />
          </div>
          <div className="save-board">
            <input
              id={`f-${id}-save`}
              className="input"
              type="text"
              placeholder="Marca o proveedor, p. ej. Maderera López"
              aria-label="Nombre para guardar esta placa"
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
              Guardar en mis placas
            </button>
          </div>
        </>
      ) : (
        <div className="grid-2">
          <div className="field">
            <label className="field-label" htmlFor={`f-${id}-size`}>
              Medida
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
              Espesor
            </label>
            <select id={`f-${id}-thick`} className="input" value={cur.thickness} onChange={(e) => change((m) => write(m, role, { thickness: Number(e.target.value) }))}>
              {thicknesses.map((t) => (
                <option key={t} value={t}>
                  {mm(t)} mm
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <span className="field-hint">
        {typeHint}
        {!isCustom && selected?.custom && (
          <>
            {' '}
            <button type="button" className="link-btn" onClick={() => onRemoveCustom(selected)}>
              Quitar de mis placas
            </button>
          </>
        )}
      </span>

      {role === 'cuerpo' && (
        <>
          {material.boardType !== 'mdf' && material.boardType !== 'aglomerado' && (
            <div className="field">
              <label className="field-label" htmlFor="f-color">
                Color o diseño
              </label>
              <input
                id="f-color"
                className="input"
                type="text"
                list="color-suggestions"
                value={material.color}
                placeholder="Blanco, Roble, Gris humo…"
                onChange={(e) => {
                  const color = e.target.value;
                  change((m) => {
                    m.color = color;
                    // Los diseños de madera tienen veta; los lisos no.
                    if (color.trim().length >= 3) m.hasGrain = looksLikeWood(color);
                  });
                }}
              />
              <datalist id="color-suggestions">
                {COLOR_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          )}
          <Switch id="f-grain" label="Tiene veta (las piezas no se giran en la placa)" checked={material.hasGrain} onChange={(v) => change((m) => void (m.hasGrain = v))} />
        </>
      )}
    </div>
  );
}
