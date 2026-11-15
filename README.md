# MueblesJP · Despiece de melamina

App web para diseñar muebles de melamina y saber exactamente qué cortar: **placares**
(empotrados o sueltos), **estanterías, bibliotecas, muebles bajos y estantes de pared**.

Cargás las medidas del mueble (o del hueco, si va empotrado) y la app te da:

- **Plano con cotas**: vista de frente y corte lateral, con la luz libre de cada hueco y
  de cada columna.
- **Espacios y marcas**: a qué altura va cada estante (desde el suelo y desde el piso del
  mueble) y dónde va cada divisor, para marcar antes de armar.
- **Despiece**: lista de piezas con cantidad, largo, ancho y en qué lados lleva tapacanto.
  Se copia en un toque para mandarla por WhatsApp al aserradero, o se descarga en CSV.
- **Elección de placas**: marca, tipo, medida y espesor para el cuerpo y para el fondo,
  con un catálogo de referencia (Egger, Faplac, Sadepan y fondos genéricos) y la opción de
  cargar y guardar las placas de tu proveedor. Si una pieza no entra, sugiere qué placa sí.
- **Placas**: cómo entran las piezas en las placas (cortes de lado a lado, como una
  seccionadora), cuántas placas comprar y qué sobrantes quedan.
- **Puertas**: con bisagras (superpuestas o embutidas, en todo el alto o solo abajo, en
  las columnas que elijas) o corredizas. Calcula la medida de cada puerta, qué bisagra va
  (recta, codo 9 o codo 18), a qué altura va cada bisagra y cuánto lugar hace falta
  adelante para abrirlas.
- **Placares**: medidas del hueco con holguras, maletero arriba con sus puertas, y en cada
  hueco estantes, **barral**, **cajones** o **zapatero** (estantes inclinados con tope, dos
  barras por nivel o estantes planos). Hay interiores típicos para armar rápido
  (colgado largo, doble colgado, colgado corto + zapatero, cajonera + estantes…). Avisa si falta alto o
  profundidad para colgar y si el mueble armado no se va a poder parar en el hueco.
- **Lista de compras**: todo lo que puede hacer falta, agrupado en placas y cortes,
  herrajes, tornillos y fijaciones, insumos y herramientas. Viene tildado lo necesario;
  los opcionales (minifix, tarugos, amortiguadores, herramientas…) se tildan a mano.
  Cargás el precio de cada ítem una vez y sirve para todos los muebles.
- **Armado**: los pasos en orden con las medidas de tu mueble (marcar, perforar, armar la
  caja, escuadrar, barrales, cajones, puertas), para ir tildando en el taller.
- **Avisos**: estantes demasiado largos que se van a pandear, muebles altos que hay que
  fijar a la pared, piezas que no entran en la placa, etc.

Los muebles se guardan solos en el navegador. Desde el menú **⋯** podés duplicarlos,
borrarlos o bajar un respaldo `.json` para pasarlos a otra compu.

## Cómo se calcula

Todas las medidas son en milímetros.

| Pieza | Medida |
| --- | --- |
| Laterales | Alto total (menos un espesor si el techo va **sobre** los laterales) × profundidad del mueble |
| Techo | Entre laterales: ancho − 2 espesores. Sobre laterales: ancho total |
| Piso | Ancho − 2 espesores. Con zócalo queda elevado a la altura del zócalo |
| Zócalo | Ancho − 2 espesores × alto del zócalo |
| Divisores | Alto interior (de piso a techo) |
| Estantes fijos | Luz de la columna |
| Estantes móviles | Luz de la columna − holgura (2 mm por defecto) |
| Fondo clavado | Ancho − 2 × alto − 2 (queda 1 mm adentro de cada borde) |
| Fondo en ranura | Luz interior + 2 × (profundidad de ranura − 1) en cada sentido |
| Puerta superpuesta | Tapa el lateral entero y medio divisor: ancho cubierto ÷ puertas − luz (3 mm) |
| Puerta embutida | (Luz de la columna − luces) ÷ puertas; alto libre − 2 luces |
| Puerta corrediza | (Ancho interior + solapes) ÷ hojas; alto libre − descuento del kit |
| Mueble empotrado | Hueco − 5 mm por costado, − 20 mm arriba, − 10 mm atrás |
| Estante maletero | Ancho − 2 espesores; las columnas y divisores llegan hasta él |
| Barral | Luz de la columna − 2 mm, con el centro a 50 mm del techo del hueco |
| Frente de cajón | Luz − 6 mm × (alto del hueco − 3 mm por luz) ÷ cajones |
| Caja de cajón | Luz − 26 mm (correderas telescópicas) × frente − 30 mm, largo de la corredera |
| Zapatero inclinado | Luz de la columna × hasta 330 mm de recorrido a 15° (342 mm de pendiente), con tope de 50 mm |
| Zapatero con barras | 2 barras por nivel de luz − 2 mm: adelante a 60 mm del frente, atrás 200 mm más adentro y 70 mm más arriba |
| Zapatero plano | Estantes sobre pernos: luz − holgura × profundidad del hueco |

- La **profundidad** que cargás es la total, con el fondo incluido: con fondo clavado, los
  laterales miden la profundidad menos el espesor del fondo.
- **Largo = sentido de la veta.** Los laterales y divisores llevan la veta vertical; techo,
  piso y estantes, horizontal. Si la melamina tiene veta, las piezas no se giran en la placa.
- Los huecos se reparten en milímetros enteros; el sobrante va a los de abajo. Podés fijar
  la altura de cualquier hueco y el resto se reparte solo.
- El tapacanto se indica con la medida de cada lado (`1 × 764` = un lado de 764 mm). Con
  tapacanto grueso (PVC de 1 o 2 mm) activá *Descontar el tapacanto* para que la pieza
  terminada mida justo.
- Puertas con bisagras: 2 por columna si la columna mide más de 60 cm. Bisagras por
  puerta según el alto (2 hasta 90 cm, 3 hasta 160 cm, 4 hasta 2 m), a 100 mm de los
  bordes. Recta en los laterales, codo 9 en los divisores, codo 18 si son embutidas;
  con embutidas los estantes de atrás se acortan espesor + 2 mm.
- Corredizas: estantes y divisores se retiran del frente lo que ocupan los rieles
  (50 mm por defecto). El descuento de alto depende del kit: revisalo en sus instrucciones.
- Placares: para colgar hacen falta unos 520 mm de profundidad libre (ideal 550–600),
  950 mm de alto para camisas y 1500 mm para vestidos o sobretodos. La corredera es la
  más larga que entra (250 a 600 mm, de a 50). El estante de arriba de un barral o de
  cajones queda fijo. Para pararlo armado hace falta más alto que la diagonal del lateral.
- Zapateros: los niveles se reparten parejo en el hueco; se recomiendan unos 200 mm por
  nivel inclinado, 180 con barras y 170 por fila plana. Avisa si quedan muy juntos.
- Valores por defecto: melamina Egger de 2600 × 1830 × 18 mm, fondo de fibrofácil de
  3 mm, sierra de 4 mm, 10 mm de refilado por borde, tapacanto de 22 × 0,45 mm. Las
  placas se cambian en *Placas* y el resto en *Corte y tapacanto*.
- Catálogo de referencia (confirmá con tu proveedor): Egger 2600 × 1830 (melamina 15 y
  18 mm, melamina sobre MDF 18 mm, fondos de 3 y 5,5 mm); Faplac 2750 × 1830 (melamina
  15, 18 y 25 mm, MDF y aglomerado 18 mm); Sadepan 2820 × 1830 (melamina 18 mm);
  fibrofácil y fondo blanco genéricos 2600 × 1830. Los colores de madera activan la veta.
  Con MDF o aglomerado crudo el tapacanto queda como opcional.

La distribución en placas es orientativa: prueba varias estrategias de corte guillotina
(con el espesor de sierra y el refilado) y se queda con la que usa menos placas.

## Usarla

En la compu o el celular, después de activar GitHub Pages (una sola vez):
**Settings → Pages → Source: GitHub Actions**. Cada cambio que llega a `main` se publica
solo en `https://<usuario>.github.io/mueblesjp/`.

Para correrla localmente hace falta Node 22:

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del cálculo
npm run build      # versión para publicar, en dist/
npm run build:single  # un único index.html autocontenido, en dist-single/
```

## Código

- `src/lib/shelf.ts`: geometría de la estantería, piezas, posiciones, herrajes y avisos.
- `src/lib/packing.ts`: optimización de cortes en placa (guillotina, con sierra y refilado).
- `src/lib/doors.ts`: puertas con bisagras y corredizas (abajo y en el maletero).
- `src/lib/resolve.ts` y `src/lib/templates.ts`: medidas del hueco e interiores típicos.
- `src/lib/shoes.ts`: zapateros.
- `src/lib/catalog.ts`: catálogo de placas (marcas, tipos, medidas y espesores).
- `src/lib/steps.ts`: pasos de armado.
- `src/lib/cutlist.ts`: medidas de corte, tapacanto y textos para exportar.
- `src/lib/shopping.ts`: lista de compras, precios y totales.
- `src/components/`: interfaz en React.

Placares y estanterías usan el mismo cálculo (`kind: 'placard' | 'estanteria'`): una caja
con columnas, y cada hueco puede ser libre, barral, cajones o zapatero.
