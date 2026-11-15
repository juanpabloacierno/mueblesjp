import { finishFor, pieceGroup } from './catalog';
import { BAR_FRONT, BAR_SPACING, SHOE_ANGLE_DEG, TOPE_HEIGHT, slopeWidth } from './shoes';
import type { Finish, ShelfUnit, ShelfUnitResult } from './types';

/**
 * Escena 3D del mueble en milímetros. Ejes: x a la derecha, y hacia arriba desde el suelo,
 * z hacia el frente (z = 0 es la pared de atrás, z = profundidad es el frente del mueble).
 */
export type SceneFinish = Finish | 'fondo' | 'metal';

export interface SceneBox {
  name: string;
  finish: SceneFinish;
  /** Esquina mínima y tamaño. */
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  shape?: 'box' | 'cylinder';
  /** Inclinación alrededor del eje x (estantes zapateros), en radianes; sube hacia atrás. */
  tilt?: number;
  /** Puerta con bisagras: lado de giro. Corrediza: corrimiento al abrir (mm en x). Cajón: recorrido. */
  hinge?: 'izquierda' | 'derecha';
  /** Eje de giro de la puerta (x, z); el tirador usa el mismo eje que su puerta. */
  pivotX?: number;
  pivotZ?: number;
  slideX?: number;
  pullZ?: number;
}

export function buildScene(unit: ShelfUnit, r: ShelfUnitResult): SceneBox[] {
  if (r.pieces.length === 0) return [];
  const m = unit.material;
  const t = m.thickness;
  const tb = m.backThickness;
  const { width: W, height: H, depth: D } = r.size;
  const boxes: SceneBox[] = [];
  const fin = (name: string): SceneFinish => finishFor(m, pieceGroup(name));
  const add = (b: SceneBox) => {
    if (b.w > 0 && b.h > 0 && b.d > 0) boxes.push(b);
  };

  const back = unit.back.mode;
  const z0 = back === 'clavado' ? tb : 0; // trasera de la caja
  const zIB = D - r.interior.depth; // cara de atrás del interior (donde apoyan los estantes)
  const zh = unit.plinth.enabled ? unit.plinth.height : 0;
  const sideH = unit.top === 'sobre' ? H - t : H;
  const Wi = r.interior.width;
  const caja = { z: z0, d: D - z0 };

  // --- Caja ---
  add({ name: 'Lateral', finish: fin('Lateral'), x: 0, y: 0, ...caja, w: t, h: sideH });
  add({ name: 'Lateral', finish: fin('Lateral'), x: W - t, y: 0, ...caja, w: t, h: sideH });
  if (unit.top === 'entre') add({ name: 'Techo', finish: fin('Techo'), x: t, y: H - t, ...caja, w: Wi, h: t });
  else add({ name: 'Techo', finish: fin('Techo'), x: 0, y: H - t, ...caja, w: W, h: t });
  add({ name: 'Piso', finish: fin('Piso'), x: t, y: zh, ...caja, w: Wi, h: t });
  if (unit.plinth.enabled) {
    add({ name: 'Zócalo', finish: fin('Zócalo'), x: t, y: 0, z: D - unit.plinth.setback - t, w: Wi, h: zh, d: t });
    if (back !== 'clavado') add({ name: 'Zócalo trasero', finish: fin('Zócalo trasero'), x: t, y: 0, z: z0, w: Wi, h: zh, d: t });
  }

  // --- Fondo ---
  if (back === 'clavado') {
    add({ name: 'Fondo', finish: 'fondo', x: 1, y: 1, z: 0, w: W - 2, h: H - 2, d: tb });
  } else if (back === 'ranurado') {
    const g = unit.back.grooveDepth - 1;
    add({ name: 'Fondo', finish: 'fondo', x: t - g, y: r.interior.baseY - g, z: unit.back.grooveOffset, w: Wi + 2 * g, h: r.interior.height + 2 * g, d: tb });
  }

  // --- Divisores y maletero ---
  const divDepth = (back === 'ranurado' ? r.interior.depth : D - z0) - r.frontInset;
  const divZ = D - r.frontInset - divDepth;
  const colH = r.columnsTop - r.interior.baseY;
  for (const dv of r.dividers) add({ name: 'Divisor', finish: fin('Divisor'), x: dv.left, y: r.interior.baseY, z: divZ, w: t, h: colH, d: divDepth });
  if (r.maletero) {
    const md = back === 'ranurado' ? r.interior.depth : D - z0;
    add({ name: 'Estante maletero', finish: fin('Estante maletero'), x: t, y: r.maletero.shelfBottom, z: D - md, w: Wi, h: t, d: md });
    if (unit.maletero.dividers) {
      for (const dv of r.dividers) {
        add({ name: 'Divisor de maletero', finish: fin('Divisor de maletero'), x: dv.left, y: r.maletero.shelfTop, z: divZ, w: t, h: r.maletero.height, d: divDepth });
      }
    }
  }

  // --- Interior de cada columna ---
  for (const col of r.columns) {
    for (const s of col.shelves) {
      const name = s.type === 'fijo' ? 'Estante fijo' : 'Estante móvil';
      const gap = s.type === 'fijo' ? 0 : unit.movableClearance / 2;
      add({ name, finish: fin(name), x: col.x + gap, y: s.bottom, z: zIB, w: col.width - 2 * gap, h: t, d: s.depth });
    }
    for (const c of col.compartments) {
      const front = zIB + c.depth; // frente útil del hueco
      if (c.rod) {
        add({ name: 'Barral', finish: 'metal', shape: 'cylinder', x: col.x + 1, y: c.rod.y - 12, z: zIB + c.depth / 2 - 12, w: c.rod.length, h: 24, d: 24 });
      }
      if (c.drawers) {
        const d = c.drawers;
        for (const fy of d.fronts) {
          const pull = d.slide * 0.75;
          add({ name: 'Frente de cajón', finish: fin('Frente de cajón'), x: d.x, y: fy, z: front - t, w: d.frontW, h: d.frontH, d: t, pullZ: pull });
          add({ name: 'Lateral de cajón', finish: fin('Lateral de cajón'), x: col.x + 13, y: fy + 10, z: front - t - d.slide, w: d.boxW, h: d.boxH, d: d.slide, pullZ: pull });
          const hw = Math.min(128, d.frontW * 0.3);
          // Tirador de perfil bajo: detrás de corredizas no hay lugar para uno saliente.
          add({ name: 'Tirador', finish: 'metal', x: d.x + d.frontW / 2 - hw / 2, y: fy + d.frontH - 40, z: front, w: hw, h: 12, d: r.frontInset ? 4 : 22, pullZ: pull });
        }
      }
      if (c.shoes) {
        const z = c.shoes;
        for (const l of z.levels) {
          if (z.style === 'inclinado') {
            const tilt = (SHOE_ANGLE_DEG * Math.PI) / 180;
            const sw = slopeWidth(z.run);
            // Caja centrada en la mitad del estante inclinado.
            const zc = front - t - z.run / 2;
            const yc = (l.front + l.back) / 2 + t / 2;
            add({ name: 'Estante zapatero inclinado', finish: fin('Estante zapatero inclinado'), x: col.x, y: yc - t / 2, z: zc - sw / 2, w: col.width, h: t, d: sw, tilt });
            add({ name: 'Tope de zapatero', finish: fin('Tope de zapatero'), x: col.x, y: l.front, z: front - t, w: col.width, h: TOPE_HEIGHT, d: t });
          } else if (z.style === 'barras') {
            const fz = front - BAR_FRONT;
            add({ name: 'Barra', finish: 'metal', shape: 'cylinder', x: col.x + 1, y: l.front - 8, z: fz - 8, w: col.width - 2, h: 16, d: 16 });
            add({ name: 'Barra', finish: 'metal', shape: 'cylinder', x: col.x + 1, y: l.back - 8, z: fz - BAR_SPACING - 8, w: col.width - 2, h: 16, d: 16 });
          } else {
            add({ name: 'Estante zapatero', finish: fin('Estante zapatero'), x: col.x + 1, y: l.front, z: zIB, w: col.width - 2, h: t, d: c.depth });
          }
        }
      }
    }
  }

  // --- Puertas ---
  for (const door of r.doors.doors) {
    const name = door.track ? 'Puerta corrediza' : 'Puerta';
    const finish = fin(name);
    if (door.track) {
      // Hoja de adelante a 4 mm del frente; la de atrás, 4 mm más adentro.
      const zf = door.track === 'delantero' ? D - 4 - t : D - 8 - 2 * t;
      const n = r.doors.doors.filter((x) => x.zone === door.zone).length;
      const idx = r.doors.doors.filter((x) => x.zone === door.zone).indexOf(door);
      // Al abrir, las hojas de adelante se corren sobre la de su izquierda.
      const slideX = door.track === 'delantero' ? -(door.w - unit.doors.overlap) : idx === n - 1 && n > 2 ? -(door.w - unit.doors.overlap) : 0;
      add({ name, finish, x: door.x, y: door.y, z: zf, w: door.w, h: door.h, d: t, slideX });
    } else {
      const mount = unit.doors.mount === 'superpuesta';
      const hinge = door.hingeSide ?? 'izquierda';
      const pivot = { hinge, pivotX: hinge === 'izquierda' ? door.x : door.x + door.w, pivotZ: D };
      add({ name, finish, x: door.x, y: door.y, z: mount ? D : D - t, w: door.w, h: door.h, d: t, ...pivot });
      const hl = Math.min(128, door.h * 0.3);
      const hx = door.hingeSide === 'izquierda' ? door.x + door.w - 46 : door.x + 34;
      const hy = door.y + door.h > 1100 ? Math.min(Math.max(1000, door.y + hl), door.y + door.h - hl) - hl / 2 : door.y + door.h - 40 - hl;
      add({ name: 'Tirador', finish: 'metal', x: hx, y: hy, z: mount ? D + t : D, w: 12, h: hl, d: 22, ...pivot });
    }
  }
  return boxes;
}

/** Caja que envuelve toda la escena (para encuadrar la cámara). */
export function sceneBounds(boxes: SceneBox[]) {
  const min = { x: Infinity, y: Infinity, z: Infinity };
  const max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const b of boxes) {
    min.x = Math.min(min.x, b.x);
    min.y = Math.min(min.y, b.y);
    min.z = Math.min(min.z, b.z);
    max.x = Math.max(max.x, b.x + b.w);
    max.y = Math.max(max.y, b.y + b.h);
    max.z = Math.max(max.z, b.z + b.d);
  }
  return { min, max };
}
