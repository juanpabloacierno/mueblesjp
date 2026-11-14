# MueblesJP · Despiece de melamina

App web para diseñar muebles de melamina y saber exactamente qué cortar. Hoy arma
**estanterías, bibliotecas y estantes**; los **placares** vienen después.

Cargás las medidas exteriores del mueble y la app te da:

- **Plano con cotas**: vista de frente y corte lateral, con la luz libre de cada hueco y
  de cada columna.
- **Espacios y marcas**: a qué altura va cada estante (desde el suelo y desde el piso del
  mueble) y dónde va cada divisor, para marcar antes de armar.
- **Despiece**: lista de piezas con cantidad, largo, ancho y en qué lados lleva tapacanto.
  Se copia en un toque para mandarla por WhatsApp al aserradero, o se descarga en CSV.
- **Placas**: cómo entran las piezas en las placas (cortes de lado a lado, como una
  seccionadora), cuántas placas comprar y qué sobrantes quedan.
- **Compras**: placas, metros de tapacanto, tornillos, soportes, clavos para el fondo y,
  si cargás precios, el costo de materiales.
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

- La **profundidad** que cargás es la total, con el fondo incluido: con fondo clavado, los
  laterales miden la profundidad menos el espesor del fondo.
- **Largo = sentido de la veta.** Los laterales y divisores llevan la veta vertical; techo,
  piso y estantes, horizontal. Si la melamina tiene veta, las piezas no se giran en la placa.
- Los huecos se reparten en milímetros enteros; el sobrante va a los de abajo. Podés fijar
  la altura de cualquier hueco y el resto se reparte solo.
- El tapacanto se indica con la medida de cada lado (`1 × 764` = un lado de 764 mm). Con
  tapacanto grueso (PVC de 1 o 2 mm) activá *Descontar el tapacanto* para que la pieza
  terminada mida justo.
- Valores por defecto: placa de 2600 × 1830 × 18 mm, fondo de 3 mm, sierra de 4 mm,
  10 mm de refilado por borde, tapacanto de 22 × 0,45 mm. Todo se cambia en
  *Material y corte*.

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
- `src/lib/cutlist.ts`: medidas de corte, tapacanto, costos y textos para exportar.
- `src/components/`: interfaz en React.

Para sumar placares, la idea es agregar un nuevo `kind` de mueble que reutilice la caja
(laterales, techo, piso, zócalo, fondo, divisores) y sume puertas, cajones, barral y
maletero sobre las mismas columnas.
