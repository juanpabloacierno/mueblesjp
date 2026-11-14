import type { Summary } from './cutlist';
import { CUP_EDGE_DISTANCE, PLATE_FRONT_DISTANCE } from './doors';
import { mm } from './format';
import type { ShelfUnit, ShelfUnitResult } from './types';

export interface Step {
  key: string;
  title: string;
  detail: string;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

/** Pasos de armado en orden, con las medidas de este mueble. */
export function buildSteps(unit: ShelfUnit, result: ShelfUnitResult, summary: Summary): Step[] {
  if (result.pieces.length === 0) return [];
  const steps: Step[] = [];
  const { width: W, height: H, depth: D } = result.size;
  const n = unit.niche;
  const doors = result.doors.doors;
  const hinged = unit.doors.type === 'batiente' && doors.length > 0;
  const sliding = unit.doors.type === 'corrediza' && doors.length > 0;
  const movable = result.columns.some((c) => c.shelves.some((s) => s.type === 'movil'));
  const fixed = result.columns.some((c) => c.shelves.some((s) => s.type === 'fijo'));
  const mal = result.maletero;
  const pieces = result.pieces.reduce((s, p) => s + p.qty, 0);
  // En un hueco más bajo que la diagonal del lateral, la caja se arma parada en el lugar.
  const tooTall = n.enabled && result.diagonal > n.height;

  if (n.enabled) {
    steps.push({
      key: 'medir',
      title: 'Medí el hueco',
      detail: `Medí el ancho arriba, al medio y abajo, y el alto a la izquierda, al centro y a la derecha. Cargá siempre la medida más chica. La app descuenta ${mm(n.sideGap)} mm por costado, ${mm(n.topGap)} mm arriba y ${mm(n.backGap)} mm atrás: el mueble queda de ${mm(W)} × ${mm(H)} × ${mm(D)} mm.`,
    });
  }

  const boards = summary.melamina.pack.sheets.length;
  const backBoards = summary.fondo?.pack.sheets.length ?? 0;
  steps.push({
    key: 'cortes',
    title: 'Pedí los cortes',
    detail: `Mandá la lista de la pestaña Despiece al aserradero: son ${pieces} piezas en ${boards} ${boards === 1 ? 'placa' : 'placas'} de melamina${
      backBoards ? ` y ${backBoards} de fondo` : ''
    }. Pedí el tapacanto pegado en los lados que marca la lista. Cuando las recibas, medí algunas piezas y escribí la letra de cada una en un canto que no se vea.`,
  });

  const marks = ['las alturas de los estantes fijos'];
  if (result.rods.length) marks.push('los barrales');
  if (result.drawers.length) marks.push('las correderas');
  steps.push({
    key: 'marcar',
    title: 'Marcá laterales y divisores',
    detail: `Con la tabla de Espacios y marcas, marcá con lápiz ${list(marks)} en las caras de adentro. ${
      result.dividers.length ? `Marcá también dónde va cada divisor en el piso, el techo${mal ? ' y el estante maletero' : ''}.` : ''
    }`.trim(),
  });

  const holes = ['agujeros guía de 3 mm para los tornillos de las uniones'];
  if (movable) holes.push('agujeros de 5 mm para los pernos de los estantes móviles (usá plantilla)');
  if (hinged) holes.push(`las cazoletas de 35 mm en las puertas, con el centro a ${CUP_EDGE_DISTANCE} mm del borde y 12 mm de profundidad`);
  steps.push({
    key: 'perforar',
    title: 'Perforá antes de armar',
    detail: `Con las piezas acostadas es mucho más fácil. Hacé ${list(holes)}.`,
  });

  const box = ['el piso', ...(unit.plinth.enabled ? ['el zócalo'] : []), 'el techo', ...(mal ? ['el estante maletero'] : [])];
  const groove = unit.back.mode === 'ranurado' ? ' Antes de cerrar con el segundo lateral, pasá el fondo por las ranuras con un poco de cola.' : '';
  steps.push({
    key: 'caja',
    title: tooTall ? 'Armá la caja parada, en el lugar' : 'Armá la caja',
    detail: tooTall
      ? `La diagonal del lateral (${mm(result.diagonal)} mm) es más que el alto del hueco (${mm(n.height)} mm): armado acostado no se puede parar. Entrá las piezas al hueco, pará un lateral y atornillale ${list(box)} con tornillos 4 × 50, ${result.counts.screwsPerJoint} por unión, con ayuda de otra persona. Después el otro lateral.${groove}`
      : `Acostá un lateral y atornillá ${list(box)} con tornillos 4 × 50, ${result.counts.screwsPerJoint} por unión. Después poné el otro lateral.${groove}`,
  });

  if (unit.back.mode === 'clavado') {
    steps.push({
      key: 'escuadra',
      title: 'Escuadrá y clavá el fondo',
      detail: 'Medí las dos diagonales del frente: tienen que dar lo mismo. Recién ahí clavá el fondo cada 15 cm por el borde y sobre los estantes fijos y divisores. El fondo es lo que mantiene el mueble en escuadra.',
    });
  }

  if (H > 1200 && !tooTall) {
    steps.push({
      key: 'parar',
      title: 'Pará el mueble',
      detail: `Para pararlo armado hacen falta ${mm(result.diagonal)} mm de alto libre. Levantalo entre dos personas, apoyando primero la base.`,
    });
  }

  if (result.dividers.length || fixed) {
    steps.push({
      key: 'divisores',
      title: result.dividers.length ? 'Colocá divisores y estantes fijos' : 'Colocá los estantes fijos',
      detail: `${result.dividers.length ? 'Entrá los divisores por el frente y atornillalos desde abajo y desde arriba en las marcas. ' : ''}${
        fixed ? 'Seguí con los estantes fijos, de abajo hacia arriba, controlando que queden a nivel.' : ''
      }`.trim(),
    });
  }

  if (result.rods.length) {
    const heights = [...new Set(result.rods.map((r) => mm(r.y)))];
    const lengths = [...new Set(result.rods.map((r) => mm(r.length)))];
    steps.push({
      key: 'barrales',
      title: 'Colocá los barrales',
      detail: `Atornillá los soportes con el centro a ${list(heights)} mm del suelo, en la mitad de la profundidad. Cortá cada barral con sierra para metal a ${list(lengths)} mm.`,
    });
  }

  if (result.drawers.length) {
    const centers = [...new Set(result.drawers.flatMap((d) => d.slideCenters.map((c) => mm(c))))];
    steps.push({
      key: 'cajones',
      title: 'Armá y colocá los cajones',
      detail: `Armá cada caja con sus laterales y travesaños, clavale el fondo abajo controlando la escuadra. Atornillá las correderas en el mueble con el centro a ${list(
        centers,
      )} mm del suelo, enganchá las cajas y fijá cada frente desde adentro con tornillos 4 × 30, dejando 3 mm de luz entre frentes.`,
    });
  }

  if (hinged) {
    steps.push({
      key: 'puertas',
      title: 'Colgá las puertas',
      detail: `Atornillá las bisagras en las cazoletas y las bases en el lateral o divisor, a ${PLATE_FRONT_DISTANCE} mm del frente y a la altura de cada bisagra. Colgá cada puerta y regulá con los tornillos de la bisagra hasta que la luz quede pareja (${mm(
        unit.doors.gap,
      )} mm).`,
    });
  } else if (sliding) {
    steps.push({
      key: 'puertas',
      title: 'Montá las corredizas',
      detail: `Atornillá el riel de abajo sobre el piso y el de arriba bajo ${mal ? 'el estante maletero' : 'el techo'}${
        result.doors.trackSets > 1 ? ', y otro par en el maletero' : ''
      }, al ras del frente y bien paralelos. Calzá cada hoja primero arriba y después abajo, y regulá las ruedas para que corra derecha y cierre pareja.`,
    });
  }

  if (H > 1200) {
    steps.push({
      key: 'pared',
      title: 'Fijalo a la pared',
      detail: 'Atornillá dos escuadras arriba, contra la pared, con tarugos de 8 mm. Así no vuelca aunque abras todo de golpe.',
    });
  }

  const finish = ['los tapatornillos'];
  if (movable) finish.push('los pernos y los estantes móviles');
  if (doors.length || result.drawers.length) finish.push('los tiradores');
  if (n.enabled) finish.push('la tapajunta contra la pared, si queda luz');
  steps.push({
    key: 'terminar',
    title: 'Terminaciones',
    detail: `Poné ${list(finish)}. Limpiá la melamina con un paño apenas húmedo.`,
  });

  return steps;
}
