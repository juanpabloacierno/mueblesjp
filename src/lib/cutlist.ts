import { backLabel, boardLabel, boardsThatFit, materialFor } from './catalog';
import { mm, num } from './format';
import { packPieces, type PackItem, type PackResult } from './packing';
import type { CutSize, Finish, Furniture, Material, Piece, Warning } from './types';

/** Medida de corte: la terminada menos el espesor del tapacanto en los lados que lo llevan. */
export function cutSize(piece: Piece, material: Material): CutSize {
  if (!material.subtractEdge || piece.material !== 'melamina') {
    return { length: piece.length, width: piece.width };
  }
  const e = material.edgeThickness;
  return {
    length: round1(piece.length - piece.edges.short * e),
    width: round1(piece.width - piece.edges.long * e),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Milímetros de tapacanto de una pieza (todas sus unidades). */
export function edgeLength(piece: Piece): number {
  return (piece.edges.long * piece.length + piece.edges.short * piece.width) * piece.qty;
}

/** Descripción del tapacanto con las medidas de cada lado: "1 × 764 + 2 × 282". */
export function edgeLabel(piece: Piece): string {
  const parts: string[] = [];
  if (piece.edges.long) parts.push(`${piece.edges.long} × ${mm(piece.length)}`);
  if (piece.edges.short) parts.push(`${piece.edges.short} × ${mm(piece.width)}`);
  return parts.length ? parts.join(' + ') : 'Sin tapacanto';
}

export interface MaterialPlan {
  label: string;
  boardLabel: string;
  pieces: Piece[];
  pack: PackResult;
  /** m² de piezas. */
  area: number;
  /** Material efectivo de esta placa (exterior, interior o fondo). */
  material: Material;
  kind: 'melamina' | 'fondo';
  finish: Finish | null;
  /** Tapacanto de las piezas de esta placa. */
  edgeMeters: number;
  edgeToBuy: number;
}

export interface Summary {
  /** Melamina exterior (o la única, si no hay color interior). */
  melamina: MaterialPlan;
  /** Melamina interior, si el mueble tiene otro color adentro. */
  interior: MaterialPlan | null;
  fondo: MaterialPlan | null;
  /** Todas las placas de melamina (exterior e interior). */
  boards: MaterialPlan[];
  /** Metros de tapacanto sin margen (total). */
  edgeMeters: number;
  /** Metros a comprar (+10 %, redondeado hacia arriba). */
  edgeToBuy: number;
  warnings: Warning[];
}

function expand(pieces: Piece[], material: Material): PackItem[] {
  return pieces.flatMap((p) => {
    const size = cutSize(p, material);
    return Array.from({ length: p.qty }, () => ({ ref: p.code, w: size.length, h: size.width, canRotate: p.canRotate }));
  });
}

const area = (list: Piece[]) => list.reduce((s, p) => s + p.length * p.width * p.qty, 0) / 1e6;

function plan(pieces: Piece[], material: Material, kind: 'melamina' | 'fondo', finish: Finish | null, labelSuffix: string): MaterialPlan {
  const L = kind === 'melamina' ? material.boardLength : material.backBoardLength;
  const W = kind === 'melamina' ? material.boardWidth : material.backBoardWidth;
  const pack = packPieces(expand(pieces, material), { boardLength: L, boardWidth: W, kerf: material.kerf, trim: material.trim });
  const edgeMeters = kind === 'melamina' ? pieces.reduce((s, p) => s + edgeLength(p), 0) / 1000 : 0;
  return {
    label: (kind === 'melamina' ? boardLabel(material) : backLabel(material)) + labelSuffix,
    boardLabel: `${mm(L)} × ${mm(W)} mm`,
    pieces,
    pack,
    area: area(pieces),
    material,
    kind,
    finish,
    edgeMeters,
    edgeToBuy: edgeMeters > 0 ? Math.ceil(edgeMeters * 1.1) : 0,
  };
}

export function summarize(furniture: Furniture, pieces: Piece[]): Summary {
  const m = furniture.material;
  const warnings: Warning[] = [];
  const split = m.interior.enabled;
  const ext = pieces.filter((p) => p.material === 'melamina' && (!split || p.finish !== 'interior'));
  const int = split ? pieces.filter((p) => p.material === 'melamina' && p.finish === 'interior') : [];
  const back = pieces.filter((p) => p.material === 'fondo');

  const melamina = plan(ext, m, 'melamina', 'exterior', split ? ' · exterior' : '');
  const interior = split && int.length ? plan(int, materialFor(m, 'interior'), 'melamina', 'interior', ' · interior') : null;
  const fondo = back.length ? plan(back, m, 'fondo', null, '') : null;

  for (const pl of [melamina, interior, fondo]) {
    if (!pl) continue;
    const pm = pl.material;
    const refs = [...new Set(pl.pack.unplaced.map((u) => u.ref))];
    for (const ref of refs) {
      const p = pl.pieces.find((x) => x.code === ref)!;
      const size = cutSize(p, pm);
      const fits = pl.kind === 'melamina' ? boardsThatFit(pm, size.length, size.width) : [];
      const tip = fits.length
        ? ` Entra en ${fits.map((b) => `${b.brand} de ${mm(b.length)} × ${mm(b.width)}`).join(' o ')}: cambiá la placa en la sección Placas.`
        : '';
      warnings.push({
        level: 'error',
        text: `La pieza ${p.code} (${p.name}, ${mm(p.length)} × ${mm(p.width)} mm) no entra en la placa de ${pl.boardLabel}${pm.trim ? ` con ${mm(pm.trim)} mm de refilado` : ''}.${tip}`,
      });
    }
  }

  const boards = interior ? [melamina, interior] : [melamina];
  const edgeMeters = boards.reduce((s, b) => s + b.edgeMeters, 0);
  return {
    melamina,
    interior,
    fondo,
    boards,
    edgeMeters,
    edgeToBuy: boards.reduce((s, b) => s + b.edgeToBuy, 0),
    warnings,
  };
}

/** Texto listo para mandar por WhatsApp o mail al corralón / aserradero. */
export function cutListText(furniture: Furniture, summary: Summary): string {
  const m = furniture.material;
  const lines: string[] = [];
  lines.push(`*Despiece: ${furniture.name}*`);
  lines.push(`Mueble terminado: ${mm(furniture.width)} ancho × ${mm(furniture.height)} alto × ${mm(furniture.depth)} prof. (mm)`);
  if (m.subtractEdge) lines.push(`Medidas de corte (ya descontado el tapacanto de ${num(m.edgeThickness)} mm)`);
  lines.push('');
  const block = (pl: MaterialPlan) => {
    lines.push(`*${pl.label}* (placa ${pl.boardLabel}${pl.kind === 'melamina' && pl.material.hasGrain ? ', con veta: el largo va en el sentido de la veta' : ''})`);
    for (const p of pl.pieces) {
      const size = cutSize(p, pl.material);
      const edge = p.edges.long || p.edges.short ? ` · tapacanto: ${edgeLabel(p)}` : '';
      lines.push(`${p.code}) ${p.name}: ${p.qty} u. de ${mm(size.length)} × ${mm(size.width)}${edge}`);
    }
    if (pl.edgeToBuy) lines.push(`Tapacanto ${pl.material.color} ${mm(m.edgeWidth)} mm: ${num(pl.edgeMeters, 1)} m (comprar ${pl.edgeToBuy} m)`.replace(/\s+/g, ' '));
    lines.push('');
  };
  for (const b of summary.boards) block(b);
  if (summary.fondo) block(summary.fondo);
  const counts = summary.boards.map((b) => `${b.pack.sheets.length} de ${b.label}`);
  if (summary.fondo) counts.push(`${summary.fondo.pack.sheets.length} de fondo`);
  lines.push(`Placas estimadas: ${counts.join(', ')} (sierra ${mm(m.kerf)} mm)`);
  return lines.join('\n');
}

/** CSV con punto y coma (lo abre bien Excel en español). */
export function cutListCsv(furniture: Furniture, pieces: Piece[]): string {
  const m = furniture.material;
  const header = ['Código', 'Pieza', 'Cantidad', 'Largo', 'Ancho', 'Espesor', 'Material', 'Tapacanto lados largo', 'Tapacanto lados ancho', 'Se puede girar', 'Notas'];
  const rows = pieces.map((p) => {
    const size = cutSize(p, m);
    return [
      p.code,
      p.name,
      String(p.qty),
      mm(size.length),
      mm(size.width),
      mm(p.thickness),
      p.material === 'melamina' ? boardLabel(materialFor(m, p.finish ?? 'exterior')) : backLabel(m),
      String(p.edges.long),
      String(p.edges.short),
      p.canRotate ? 'Sí' : 'No',
      p.notes.join(' / '),
    ];
  });
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(';')).join('\n');
}
