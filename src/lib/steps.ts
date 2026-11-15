import type { Summary } from './cutlist';
import { CUP_EDGE_DISTANCE, PLATE_FRONT_DISTANCE } from './doors';
import { mm } from './format';
import { tr } from './i18n';
import { BAR_FRONT, BAR_SPACING, TOPE_HEIGHT } from './shoes';
import type { ShelfUnit, ShelfUnitResult } from './types';

export interface Step {
  key: string;
  title: string;
  detail: string;
}

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')}${tr(' y ', ' and ')}${items[items.length - 1]}`;
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
  // En un hueco más bajo que la diagonal del lateral, la caja se arma de pie en el lugar.
  const tooTall = n.enabled && result.diagonal > n.height;

  if (n.enabled) {
    steps.push({
      key: 'medir',
      title: tr('Mide el hueco', 'Measure the alcove'),
      detail: tr(
        `Mide el ancho arriba, en el medio y abajo, y el alto a la izquierda, en el centro y a la derecha. Usa siempre la medida más pequeña. La app descuenta ${mm(n.sideGap)} mm por lado, ${mm(n.topGap)} mm arriba y ${mm(n.backGap)} mm atrás: el mueble queda de ${mm(W)} × ${mm(H)} × ${mm(D)} mm.`,
        `Measure the width at the top, middle and bottom, and the height at the left, center and right. Always enter the smallest measurement. The app subtracts ${mm(n.sideGap)} mm per side, ${mm(n.topGap)} mm at the top and ${mm(n.backGap)} mm at the back: the unit ends up ${mm(W)} × ${mm(H)} × ${mm(D)} mm.`,
      ),
    });
  }

  const boards = summary.boards.reduce((n, b) => n + b.pack.sheets.length, 0);
  const backBoards = summary.fondo?.pack.sheets.length ?? 0;
  const colors = summary.interior
    ? tr(
        ` (${summary.melamina.pack.sheets.length} ${summary.melamina.material.color} por fuera y ${summary.interior.pack.sheets.length} ${summary.interior.material.color} por dentro)`,
        ` (${summary.melamina.pack.sheets.length} ${summary.melamina.material.color} outside and ${summary.interior.pack.sheets.length} ${summary.interior.material.color} inside)`,
      )
    : '';
  steps.push({
    key: 'cortes',
    title: tr('Pide los cortes', 'Order the cuts'),
    detail: tr(
      `Envía la lista de la pestaña Despiece al centro de corte: son ${pieces} piezas en ${boards} ${boards === 1 ? 'tablero' : 'tableros'} de melamina${colors}${
        backBoards ? ` y ${backBoards} de fondo` : ''
      }. Pide el tapacanto pegado en los lados que indica la lista, del color de cada pieza. Cuando las recibas, mide algunas piezas y escribe la letra de cada una en un canto que no se vea.`,
      `Send the list from the Cut list tab to the cutting shop: ${pieces} pieces from ${boards} melamine ${boards === 1 ? 'board' : 'boards'}${colors}${
        backBoards ? ` and ${backBoards} back panel ${backBoards === 1 ? 'board' : 'boards'}` : ''
      }. Ask for edge banding applied on the sides the list shows, in each piece's color. When you get them, measure a few pieces and write each piece's letter on an edge that won't show.`,
    ),
  });

  const marks = [tr('las alturas de los estantes fijos', 'the fixed shelf heights')];
  if (result.rods.length) marks.push(tr('las barras de colgar', 'the hanging rods'));
  if (result.drawers.length) marks.push(tr('las correderas', 'the drawer slides'));
  if (result.shoeRacks.length) marks.push(tr('los niveles del zapatero', 'the shoe rack levels'));
  steps.push({
    key: 'marcar',
    title: tr('Marca laterales y divisores', 'Mark the side panels and dividers'),
    detail: tr(
      `Con la tabla de Espacios y marcas, marca con lápiz ${list(marks)} en las caras interiores. ${
        result.dividers.length ? `Marca también dónde va cada divisor en el piso, el techo${mal ? ' y el estante maletero' : ''}.` : ''
      }`,
      `Using the Spaces and marks table, pencil-mark ${list(marks)} on the inner faces. ${
        result.dividers.length ? `Also mark where each divider goes on the bottom, the top${mal ? ' and the top storage shelf' : ''}.` : ''
      }`,
    ).trim(),
  });

  const holes = [tr('agujeros guía de 3 mm para los tornillos de las uniones', '3 mm pilot holes for the joint screws')];
  if (movable) holes.push(tr('agujeros de 5 mm para los pernos de los estantes móviles (usa una plantilla)', '5 mm holes for the adjustable shelf pins (use a jig)'));
  if (hinged) {
    holes.push(
      tr(
        `las cazoletas de 35 mm en las puertas, con el centro a ${CUP_EDGE_DISTANCE} mm del borde y 12 mm de profundidad`,
        `the 35 mm hinge cups in the doors, centered ${CUP_EDGE_DISTANCE} mm from the edge and 12 mm deep`,
      ),
    );
  }
  steps.push({
    key: 'perforar',
    title: tr('Perfora antes de armar', 'Drill before assembling'),
    detail: tr(`Con las piezas acostadas es mucho más fácil. Haz ${list(holes)}.`, `It's much easier with the pieces lying flat. Drill ${list(holes)}.`),
  });

  const box = [
    tr('el piso', 'the bottom'),
    ...(unit.plinth.enabled ? [tr('el zócalo', 'the plinth')] : []),
    tr('el techo', 'the top'),
    ...(mal ? [tr('el estante maletero', 'the top storage shelf')] : []),
  ];
  const groove =
    unit.back.mode === 'ranurado'
      ? tr(
          ' Antes de cerrar con el segundo lateral, pasa el fondo por las ranuras con un poco de cola.',
          ' Before closing with the second side panel, slide the back panel into the grooves with a little glue.',
        )
      : '';
  steps.push({
    key: 'caja',
    title: tooTall ? tr('Arma la caja de pie, en el lugar', 'Assemble the carcass upright, in place') : tr('Arma la caja', 'Assemble the carcass'),
    detail: tooTall
      ? tr(
          `La diagonal del lateral (${mm(result.diagonal)} mm) es mayor que el alto del hueco (${mm(n.height)} mm): si lo armas acostado, no podrás ponerlo de pie. Lleva las piezas al hueco, pon de pie un lateral y atorníllale ${list(box)} con tornillos 4 × 50, ${result.counts.screwsPerJoint} por unión, con ayuda de otra persona. Después, el otro lateral.${groove}`,
          `The side panel's diagonal (${mm(result.diagonal)} mm) is more than the alcove height (${mm(n.height)} mm): if you assemble it lying down, you won't be able to stand it up. Bring the pieces into the alcove, stand one side panel up and screw ${list(box)} to it with 4 × 50 screws, ${result.counts.screwsPerJoint} per joint, with someone helping you. Then the other side panel.${groove}`,
        )
      : tr(
          `Acuesta un lateral y atorníllale ${list(box)} con tornillos 4 × 50, ${result.counts.screwsPerJoint} por unión. Después pon el otro lateral.${groove}`,
          `Lay one side panel flat and screw ${list(box)} to it with 4 × 50 screws, ${result.counts.screwsPerJoint} per joint. Then add the other side panel.${groove}`,
        ),
  });

  if (unit.back.mode === 'clavado') {
    steps.push({
      key: 'escuadra',
      title: tr('Revisa la escuadra y clava el fondo', 'Square up and nail on the back panel'),
      detail: tr(
        'Mide las dos diagonales del frente: tienen que medir lo mismo. Solo entonces clava el fondo cada 15 cm por el borde y sobre los estantes fijos y divisores. El fondo es lo que mantiene el mueble en escuadra.',
        'Measure both diagonals of the front: they must be equal. Only then nail the back panel every 15 cm along the edge and over the fixed shelves and dividers. The back panel is what keeps the unit square.',
      ),
    });
  }

  if (H > 1200 && !tooTall) {
    steps.push({
      key: 'parar',
      title: tr('Pon el mueble de pie', 'Stand the unit up'),
      detail: tr(
        `Para ponerlo de pie ya armado hacen falta ${mm(result.diagonal)} mm de altura libre. Levántalo entre dos personas, apoyando primero la base.`,
        `To stand it up once assembled you need ${mm(result.diagonal)} mm of clear height. Lift it with two people, resting the base on the floor first.`,
      ),
    });
  }

  if (result.dividers.length || fixed) {
    steps.push({
      key: 'divisores',
      title: result.dividers.length
        ? tr('Coloca divisores y estantes fijos', 'Fit the dividers and fixed shelves')
        : tr('Coloca los estantes fijos', 'Fit the fixed shelves'),
      detail: `${
        result.dividers.length
          ? tr(
              'Mete los divisores por el frente y atorníllalos desde abajo y desde arriba en las marcas. ',
              'Slide the dividers in from the front and screw them from below and above at the marks. ',
            )
          : ''
      }${
        fixed
          ? tr(
              'Sigue con los estantes fijos, de abajo hacia arriba, comprobando que queden a nivel.',
              'Continue with the fixed shelves, from bottom to top, checking that they are level.',
            )
          : ''
      }`.trim(),
    });
  }

  if (result.rods.length) {
    const heights = [...new Set(result.rods.map((r) => mm(r.y)))];
    const lengths = [...new Set(result.rods.map((r) => mm(r.length)))];
    steps.push({
      key: 'barrales',
      title: tr('Coloca las barras de colgar', 'Fit the hanging rods'),
      detail: tr(
        `Atornilla los soportes con el centro a ${list(heights)} mm del suelo, en la mitad de la profundidad. Corta cada barra con una sierra para metal a ${list(lengths)} mm.`,
        `Screw the supports with their center ${list(heights)} mm above the floor, halfway back. Cut each rod to ${list(lengths)} mm with a hacksaw.`,
      ),
    });
  }

  if (result.drawers.length) {
    const centers = list([...new Set(result.drawers.flatMap((d) => d.slideCenters.map((c) => mm(c))))]);
    steps.push({
      key: 'cajones',
      title: tr('Arma y coloca los cajones', 'Build and fit the drawers'),
      detail: tr(
        `Arma cada caja con sus laterales y travesaños, y clávale el fondo por debajo comprobando la escuadra. Atornilla las correderas en el mueble con el centro a ${centers} mm del suelo, engancha las cajas y fija cada frente desde adentro con tornillos 4 × 30, dejando 3 mm de separación entre frentes.`,
        `Build each box from its sides and cross pieces, and nail the bottom on underneath, checking that it is square. Screw the slides into the unit with their center ${centers} mm above the floor, hook the boxes on and fix each front from the inside with 4 × 30 screws, leaving a 3 mm gap between fronts.`,
      ),
    });
  }

  const racks = result.shoeRacks;
  if (racks.length) {
    const parts: string[] = [];
    const inclined = racks.filter((z) => z.style === 'inclinado');
    const bars = racks.filter((z) => z.style === 'barras');
    const flat = racks.filter((z) => z.style === 'plano' && z.levels.length);
    if (inclined.length) {
      const marks = inclined.flatMap((z) => z.levels.map((l) => `${mm(l.front)} → ${mm(l.back)}`)).join(', ');
      const run = mm(inclined[0].run);
      parts.push(
        tr(
          `Estantes inclinados: en cada lado traza una línea desde la altura de adelante hasta la de atrás (${marks} mm del suelo, ${run} mm de recorrido). Atornilla cada estante con 2 tornillos 4 × 50 por lado y después el tope de ${TOPE_HEIGHT} mm al frente con 3 tornillos 4 × 30.`,
          `Slanted shelves: on each side, draw a line from the front height to the back height (${marks} mm above the floor, ${run} mm deep). Screw each shelf with two 4 × 50 screws per side, then fix the ${TOPE_HEIGHT} mm stop at the front with three 4 × 30 screws.`,
        ),
      );
    }
    if (bars.length) {
      const marks = bars.flatMap((z) => z.levels.map((l) => `${mm(l.front)}${tr(' y ', ' and ')}${mm(l.back)}`)).join('; ');
      parts.push(
        tr(
          `Barras: atornilla los soportes de la barra delantera a ${BAR_FRONT} mm del frente del hueco y los de la trasera ${BAR_SPACING} mm más atrás, a ${marks} mm del suelo. Corta cada barra 2 mm más corta que el ancho libre.`,
          `Bars: screw the front bar supports ${BAR_FRONT} mm from the front of the compartment and the back ones ${BAR_SPACING} mm further back, at ${marks} mm above the floor. Cut each bar 2 mm shorter than the clear width.`,
        ),
      );
    }
    if (flat.length) {
      parts.push(
        tr(
          'Estantes planos: haz los agujeros para los pernos a las alturas de la tabla y apoya los estantes.',
          'Flat shelves: drill the pin holes at the heights in the table and set the shelves on the pins.',
        ),
      );
    }
    steps.push({ key: 'zapatero', title: tr('Arma el zapatero', 'Build the shoe rack'), detail: parts.join(' ') });
  }

  if (hinged) {
    steps.push({
      key: 'puertas',
      title: tr('Cuelga las puertas', 'Hang the doors'),
      detail: tr(
        `Atornilla las bisagras en las cazoletas y las bases en el lateral o divisor, a ${PLATE_FRONT_DISTANCE} mm del frente y a la altura de cada bisagra. Cuelga cada puerta y regula con los tornillos de la bisagra hasta que la separación quede pareja (${mm(unit.doors.gap)} mm).`,
        `Screw the hinges into the cups and the mounting plates onto the side panel or divider, ${PLATE_FRONT_DISTANCE} mm from the front and level with each hinge. Hang each door and adjust the hinge screws until the gap is even (${mm(unit.doors.gap)} mm).`,
      ),
    });
  } else if (sliding) {
    const twoSets = result.doors.trackSets > 1;
    steps.push({
      key: 'puertas',
      title: tr('Monta las puertas corredizas', 'Install the sliding doors'),
      detail: tr(
        `Atornilla el riel inferior sobre el piso y el superior debajo ${mal ? 'del estante maletero' : 'del techo'}${
          twoSets ? ', y otro par en el maletero' : ''
        }, al ras del frente y bien paralelos. Encaja cada hoja primero arriba y después abajo, y regula las ruedas para que corra derecha y cierre pareja.`,
        `Screw the bottom track onto the bottom panel and the top track under ${mal ? 'the top storage shelf' : 'the top'}${
          twoSets ? ', plus another pair in the top storage' : ''
        }, flush with the front and perfectly parallel. Fit each door panel at the top first, then at the bottom, and adjust the wheels so it runs straight and closes evenly.`,
      ),
    });
  }

  if (H > 1200) {
    steps.push({
      key: 'pared',
      title: tr('Fíjalo a la pared', 'Fix it to the wall'),
      detail: tr(
        'Atornilla dos escuadras arriba, contra la pared, con tacos de 8 mm. Así no se vuelca aunque abras todo de golpe.',
        "Screw two angle brackets at the top into the wall, with 8 mm wall plugs. That way it won't tip over even if you open everything at once.",
      ),
    });
  }

  const finish = [tr('los tapatornillos', 'the screw caps')];
  if (movable) finish.push(tr('los pernos y los estantes móviles', 'the shelf pins and adjustable shelves'));
  if (doors.length || result.drawers.length) finish.push(tr('los tiradores', 'the handles'));
  if (n.enabled) finish.push(tr('el tapajuntas contra la pared, si queda separación', 'the trim strip against the wall, if there is a gap'));
  steps.push({
    key: 'terminar',
    title: tr('Acabados', 'Finishing touches'),
    detail: tr(`Pon ${list(finish)}. Limpia la melamina con un paño apenas húmedo.`, `Add ${list(finish)}. Wipe the melamine with a slightly damp cloth.`),
  });

  return steps;
}
