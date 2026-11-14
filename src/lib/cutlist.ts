import { mm, num } from './format';
import { packPieces, type PackItem, type PackResult } from './packing';
import type { CutSize, Furniture, Material, Piece, Warning } from './types';

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
}

export interface Summary {
  melamina: MaterialPlan;
  fondo: MaterialPlan | null;
  /** Metros de tapacanto sin margen. */
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

export function summarize(furniture: Furniture, pieces: Piece[]): Summary {
  const m = furniture.material;
  const warnings: Warning[] = [];
  const mel = pieces.filter((p) => p.material === 'melamina');
  const back = pieces.filter((p) => p.material === 'fondo');

  const melPack = packPieces(expand(mel, m), {
    boardLength: m.boardLength,
    boardWidth: m.boardWidth,
    kerf: m.kerf,
    trim: m.trim,
  });
  const backPack = back.length
    ? packPieces(expand(back, m), {
        boardLength: m.backBoardLength,
        boardWidth: m.backBoardWidth,
        kerf: m.kerf,
        trim: m.trim,
      })
    : null;

  for (const [pack, list, board] of [
    [melPack, mel, `${mm(m.boardLength)} × ${mm(m.boardWidth)}`],
    [backPack, back, `${mm(m.backBoardLength)} × ${mm(m.backBoardWidth)}`],
  ] as const) {
    if (!pack) continue;
    const refs = [...new Set(pack.unplaced.map((u) => u.ref))];
    for (const ref of refs) {
      const p = list.find((x) => x.code === ref)!;
      warnings.push({
        level: 'error',
        text: `La pieza ${p.code} (${p.name}, ${mm(p.length)} × ${mm(p.width)} mm) no entra en la placa de ${board} mm${m.trim ? ` con ${mm(m.trim)} mm de refilado` : ''}.`,
      });
    }
  }

  const edgeMm = mel.reduce((s, p) => s + edgeLength(p), 0);
  const edgeMeters = edgeMm / 1000;
  const edgeToBuy = edgeMeters > 0 ? Math.ceil(edgeMeters * 1.1) : 0;

  const area = (list: Piece[]) => list.reduce((s, p) => s + p.length * p.width * p.qty, 0) / 1e6;
  return {
    melamina: {
      label: `Melamina ${m.color} ${mm(m.thickness)} mm`.replace(/\s+/g, ' '),
      boardLabel: `${mm(m.boardLength)} × ${mm(m.boardWidth)} mm`,
      pieces: mel,
      pack: melPack,
      area: area(mel),
    },
    fondo: backPack
      ? {
          label: `Fondo ${mm(m.backThickness)} mm`,
          boardLabel: `${mm(m.backBoardLength)} × ${mm(m.backBoardWidth)} mm`,
          pieces: back,
          pack: backPack,
          area: area(back),
        }
      : null,
    edgeMeters,
    edgeToBuy,
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
  const block = (plan: MaterialPlan) => {
    lines.push(`*${plan.label}* (placa ${plan.boardLabel}${m.hasGrain && plan.pieces[0]?.material === 'melamina' ? ', con veta: el largo va en el sentido de la veta' : ''})`);
    for (const p of plan.pieces) {
      const size = cutSize(p, m);
      const edge = p.edges.long || p.edges.short ? ` · tapacanto: ${edgeLabel(p)}` : '';
      lines.push(`${p.code}) ${p.name}: ${p.qty} u. de ${mm(size.length)} × ${mm(size.width)}${edge}`);
    }
    lines.push('');
  };
  block(summary.melamina);
  if (summary.fondo) block(summary.fondo);
  if (summary.edgeToBuy) lines.push(`Tapacanto ${mm(m.edgeWidth)} mm: ${num(summary.edgeMeters, 1)} m (comprar ${summary.edgeToBuy} m)`);
  lines.push(
    `Placas estimadas: ${summary.melamina.pack.sheets.length} de melamina${summary.fondo ? `, ${summary.fondo.pack.sheets.length} de fondo` : ''} (sierra ${mm(m.kerf)} mm)`,
  );
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
      p.material === 'melamina' ? `Melamina ${m.color}`.trim() : 'Fondo',
      String(p.edges.long),
      String(p.edges.short),
      p.canRotate ? 'Sí' : 'No',
      p.notes.join(' / '),
    ];
  });
  const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return [header, ...rows].map((r) => r.map(esc).join(';')).join('\n');
}
