# MueblesJP · Despiece de melamina

*[English version](README.en.md)*

App web para diseñar muebles de melamina y saber exactamente qué cortar: **clósets**
(empotrados o sueltos), **escritorios**, **libreros y estanterías**, **modulares y
aparadores**, **muebles de dormitorio** y estantes de pared.
La interfaz está en español e inglés (selector ES/EN en la barra superior).

Cargas las medidas del mueble (o del hueco, si va empotrado) y la app te da:

- **Plano con cotas**: vista de frente y corte lateral, con el espacio libre de cada hueco
  y de cada columna.
- **Espacios y marcas**: a qué altura va cada estante (desde el suelo y desde el piso del
  mueble) y dónde va cada divisor, para marcar antes de armar.
- **Despiece**: lista de piezas con cantidad, largo, ancho y en qué lados lleva tapacanto.
  Se copia con un toque para enviarla por WhatsApp al taller de corte, o se descarga en CSV.
- **Elección de tableros**: marca, tipo, medida, espesor y color (con el código del
  diseño) para el exterior, el interior y el fondo. Catálogo de Egger, Faplac y Sadepan
  con sus líneas y colores, y la opción de cargar y guardar los tableros de tu proveedor.
  Si una pieza no cabe, sugiere qué tablero sí.
- **Color exterior e interior**: puertas y frentes de cajón siempre con el color de
  afuera; estantes, divisores y cajones con el de adentro; la caja, a elección. Cada color
  tiene sus tableros, su lista de cortes y su tapacanto.
- **Vista 3D** con los colores elegidos: se gira y se acerca con el dedo o el mouse, con
  puertas cerradas, abiertas (cajones afuera) o sin puertas.
- **Tableros**: cómo caben las piezas en los tableros (cortes de lado a lado, como una
  seccionadora), cuántos tableros comprar y qué sobrantes quedan.
- **Puertas**: con bisagras (superpuestas o embutidas, en todo el alto o solo abajo, en
  las columnas que elijas) o corredizas. Calcula la medida de cada puerta, qué bisagra va
  (recta, codo 9 o codo 18), a qué altura va cada bisagra y cuánto espacio hace falta
  adelante para abrirlas.
- **Clósets**: medidas del hueco con holguras, maletero arriba con sus puertas, y en cada
  hueco estantes, **barra de colgar**, **cajones** o **zapatero** (estantes inclinados con
  tope, dos barras por nivel o estantes planos). Hay interiores típicos para armar rápido
  (colgado largo, doble colgado, colgado corto + zapatero, cajonera + estantes…). Avisa si
  falta alto o profundidad para colgar y si el mueble armado no se podrá levantar dentro
  del hueco.
- **Cajones a medida**: en la sección *Cajones* eliges para todo el mueble el fondo del
  cajón (clavado abajo o en ranura), los frentes (embutidos o superpuestos) y las
  correderas (telescópicas, con cierre suave o de rodillos); en cada hueco, la cantidad
  de cajones y si son iguales o escalonados (más altos abajo).
- **Lista de compras**: todo lo que puede hacer falta, agrupado en tableros y cortes,
  herrajes, tornillos y fijaciones, insumos y herramientas. Lo necesario viene marcado;
  los opcionales (minifix, espigas, amortiguadores, herramientas…) se marcan a mano.
  Cargas el precio de cada artículo una vez y sirve para todos los muebles.
- **Instrucciones de armado ilustradas**: una hoja con todas las piezas dibujadas (con su
  letra, cantidad, medidas y cantos con tapacanto) y los herrajes, y después los pasos en
  orden, cada uno con su dibujo: lo ya armado en blanco, las piezas nuevas resaltadas y
  separadas, con flechas hasta su lugar y la letra del despiece, más qué piezas y herrajes
  lleva el paso. Los dibujos salen del modelo 3D, así que siempre coinciden con tu mueble.
- **Modelos para empezar** (menú **+ Nuevo**), agrupados:
  - *Clósets*: con corredizas, con puertas batientes o solo el interior.
  - *Escritorios*: simple (tapa, laterales y faldón), con cajonera, con cajonera y
    gabinete con puerta, con dos cajoneras, con estantes, y una cajonera suelta.
  - *Libreros y estanterías*: librero, con puertas abajo, con cajones abajo, doble con
    puertas, empotrado de piso a techo, estantería baja, organizador de cubos y estante de
    pared.
  - *Modulares y aparadores*: mueble bajo con puertas, mueble y rack de TV, aparador con
    cajones, vajillero y armario con corredizas.
  - *Dormitorio*: mesa de noche y cómoda.
- **Escritorios con hueco para las piernas**: cualquier columna se puede marcar como
  hueco para las piernas. Esa columna no lleva piso, estantes ni fondo; sus costados bajan
  hasta el suelo (*Lateral interior*) y atrás, debajo de la tapa, va el **faldón**, que
  rigidiza el escritorio. Las demás columnas quedan como cajoneras o gabinetes, cada una con
  su piso, su zócalo y su fondo. Avisa si el hueco queda angosto (menos de 600 mm) o bajo
  (menos de 620 mm).
- **Avisos**: estantes demasiado largos que se van a combar, muebles altos que hay que
  fijar a la pared, piezas que no caben en el tablero, etc.

Los muebles se guardan solos en el navegador. Desde el menú **⋯** puedes duplicarlos,
borrarlos o descargar un respaldo `.json` para pasarlos a otra computadora.

## Cómo se calcula

Todas las medidas son en milímetros.

| Pieza | Medida |
| --- | --- |
| Laterales | Alto total (menos un espesor si el techo va **sobre** los laterales) × profundidad del mueble |
| Techo | Entre laterales: ancho − 2 espesores. Sobre laterales: ancho total |
| Piso | Ancho − 2 espesores. Con zócalo queda elevado a la altura del zócalo |
| Zócalo | Ancho − 2 espesores × alto del zócalo |
| Divisores | Alto interior (de piso a techo) |
| Estantes fijos | Espacio libre de la columna |
| Estantes móviles | Espacio libre de la columna − holgura (2 mm por defecto) |
| Fondo clavado | Ancho − 2 × alto − 2 (queda 1 mm adentro de cada borde) |
| Fondo en ranura | Espacio libre interior + 2 × (profundidad de ranura − 1) en cada sentido |
| Puerta superpuesta | Tapa el lateral entero y medio divisor: ancho cubierto ÷ puertas − holgura (3 mm) |
| Puerta embutida | (Espacio libre de la columna − holguras) ÷ puertas; alto libre − 2 holguras |
| Puerta corrediza | (Ancho interior + solapes) ÷ hojas; alto libre − descuento del kit |
| Mueble empotrado | Hueco − 5 mm por costado, − 20 mm arriba, − 10 mm atrás |
| Estante maletero | Ancho − 2 espesores; las columnas y divisores llegan hasta él |
| Barra de colgar | Espacio libre de la columna − 2 mm, con el centro a 50 mm del techo del hueco |
| Frente de cajón embutido | Espacio libre − 6 mm × (alto del hueco − 3 mm por holgura) ÷ cajones |
| Frente de cajón superpuesto | Como una puerta superpuesta: tapa el lateral entero y medio divisor, el piso (o medio estante) abajo; ancho cubierto − 3 mm |
| Caja de cajón | Espacio libre − 26 mm (13 mm por corredera) × lugar del cajón − 30 mm (máx. 250), largo de la corredera |
| Fondo de cajón clavado | Largo de la corredera × ancho de la caja |
| Fondo de cajón en ranura | Caja por dentro + 2 × (profundidad de la ranura − 1 mm), en los dos sentidos |
| Zapatero inclinado | Espacio libre de la columna × hasta 330 mm de recorrido a 15° (342 mm de pendiente), con tope de 50 mm |
| Zapatero con barras | 2 barras por nivel de espacio libre − 2 mm: adelante a 60 mm del frente, atrás 200 mm más adentro y 70 mm más arriba |
| Zapatero plano | Estantes sobre soportes: espacio libre − holgura × profundidad del hueco |
| Lateral interior (escritorio) | Del suelo a la tapa × profundidad del mueble, junto al hueco para las piernas |
| Faldón | Espacio libre del hueco para las piernas × alto del faldón (350 mm por defecto) |
| Piso, zócalo y fondo con hueco para las piernas | Uno por cada tramo de columnas con piso (cada cajonera o gabinete) |

- La **profundidad** que cargas es la total, con el fondo incluido: con fondo clavado, los
  laterales miden la profundidad menos el espesor del fondo.
- **Largo = sentido de la veta.** Los laterales y divisores llevan la veta vertical; techo,
  piso y estantes, horizontal. Si la melamina tiene veta, las piezas no se giran en el tablero.
- Los huecos se reparten en milímetros enteros; el sobrante va a los de abajo. Puedes fijar
  la altura de cualquier hueco y el resto se reparte solo.
- El tapacanto se indica con la medida de cada lado (`1 × 764` = un lado de 764 mm). Con
  tapacanto grueso (PVC de 1 o 2 mm) activa *Descontar el tapacanto* para que la pieza
  terminada mida justo.
- Puertas con bisagras: 2 por columna si la columna mide más de 60 cm. Bisagras por
  puerta según el alto (2 hasta 90 cm, 3 hasta 160 cm, 4 hasta 2 m), a 100 mm de los
  bordes. Recta en los laterales, codo 9 en los divisores, codo 18 si son embutidas;
  con embutidas los estantes de atrás se acortan espesor + 2 mm.
- Corredizas: estantes y divisores se retiran del frente lo que ocupan los rieles
  (50 mm por defecto). El descuento de alto depende del kit: revísalo en sus instrucciones.
- Clósets: para colgar hacen falta unos 520 mm de profundidad libre (ideal 550–600),
  950 mm de alto para camisas y 1500 mm para vestidos o abrigos largos. La corredera es la
  más larga que cabe (250 a 600 mm, de 50 en 50). El estante de arriba de una barra de
  colgar o de cajones queda fijo. Para levantarlo armado hace falta más alto que la
  diagonal del lateral.
- Escritorios: la altura habitual es de 720 a 760 mm. El hueco para las piernas no lleva
  puertas, y un mueble con hueco para las piernas no lleva maletero ni corredizas. Si todas
  las columnas son hueco para las piernas, el escritorio es solo tapa, laterales y faldón.
- Cajones:
  - *Fondo*: clavado abajo de la caja (cada 10 cm) o en una ranura de los laterales, el
    frente y el contrafrente de la caja (por defecto 8 mm de profundidad a 12 mm del canto
    de abajo, del ancho del fondo + 1 mm). En ranura no lleva clavos, pero la ranura se
    pide en el centro de corte o se hace con sierra o router.
  - *Frentes*: embutidos dentro del hueco, con 3 mm de luz, o superpuestos, que tapan los
    cantos como las puertas superpuestas y suman su espesor al frente del mueble. Detrás de
    una puerta los cajones quedan siempre embutidos. Con frente superpuesto la caja puede
    ser más larga (la corredera no descuenta el frente).
  - *Correderas*: telescópicas de 250 a 600 mm, telescópicas con cierre suave (mismos
    largos) o de rodillos de 250 a 550 mm (más económicas, no se abren del todo). Se elige
    la más larga que entra, de 50 en 50 mm.
  - *Alturas*: iguales, o escalonadas: cada cajón suma un cuarto del alto del de más
    arriba (4 cajones quedan en proporción 1,75 : 1,5 : 1,25 : 1 de abajo hacia arriba).
- Zapateros: los niveles se reparten de forma pareja en el hueco; se recomiendan unos
  200 mm por nivel inclinado, 180 con barras y 170 por fila plana. Avisa si quedan muy juntos.
- Valores por defecto: melamina Egger de 2600 × 1830 × 18 mm, fondo de MDF delgado de
  3 mm, sierra de 4 mm, 10 mm de refilado por borde, tapacanto de 22 × 0,45 mm. Los
  tableros se cambian en *Tableros* y el resto en *Corte y tapacanto*.
- Catálogo de referencia (confirma con tu proveedor): Egger 2600 × 1830 (melamina 15 y
  18 mm, melamina sobre MDF 18 mm, fondos de 3 y 5,5 mm); Faplac 2750 × 1830 (melamina
  15, 18 y 25 mm, MDF y aglomerado 18 mm); Sadepan 2820 × 1830 (melamina 18 mm);
  MDF delgado y fondo blanco genéricos 2600 × 1830. Los colores de madera activan la veta.
  Con MDF o aglomerado crudo el tapacanto queda como opcional.

La distribución en tableros es orientativa: prueba varias estrategias de corte guillotina
(con el espesor de sierra y el refilado) y se queda con la que usa menos tableros.

### Colores de las marcas

Los colores salen de los sitios de las marcas, sus lanzamientos y listados de comercios
de Argentina (Easy, DAC Maderas, Alnora, DIAC, Maderwil, Trumar, Multiplacas y otros), en
noviembre de 2026. Los códigos son los de cada marca (Egger W954, H3170…; Faplac 098,
135…; Sadepan 780, TM4…). Los marcados "a confirmar" solo aparecieron en comercios. El
color que se ve en el 3D es una aproximación por el nombre: el tablero real puede verse
distinto. Espesores: Egger en 18 mm (15 mm solo Blanco, Negro, Gris Sombra y Fineline
Crema); Faplac en 18 mm (15 y 25 mm confirmado en Blanco); Sadepan informa de 10 a 25 mm,
pero los colores se consiguen sobre todo en 18 mm.

## Usarla

En la computadora o el celular, después de activar GitHub Pages (una sola vez):
**Settings → Pages → Source: GitHub Actions**. Cada cambio que llega a `main` se publica
solo en `https://<usuario>.github.io/mueblesjp/`.

Para ejecutarla localmente hace falta Node 22:

```bash
npm install
npm run dev        # servidor de desarrollo
npm test           # tests del cálculo
npm run build      # versión para publicar, en dist/
npm run build:single  # un único index.html autocontenido, en dist-single/
```

## Código

- `src/lib/shelf.ts`: geometría de la estantería, piezas, posiciones, herrajes y avisos.
- `src/lib/packing.ts`: optimización de cortes en el tablero (guillotina, con sierra y refilado).
- `src/lib/doors.ts`: puertas con bisagras y corredizas (abajo y en el maletero).
- `src/lib/resolve.ts` y `src/lib/templates.ts`: medidas del hueco e interiores típicos.
- `src/lib/shoes.ts`: zapateros.
- `src/lib/catalog.ts`: catálogo de tableros (marcas, tipos, medidas y espesores) y qué
  piezas van con el color exterior o interior.
- `src/lib/decors.ts`: líneas y colores de cada marca, con color aproximado para el 3D.
- `src/lib/scene.ts` y `src/components/Furniture3D.tsx`: vista 3D (three.js).
- `src/lib/steps.ts` y `src/lib/assembly.ts`: pasos de armado (texto, piezas y herrajes
  de cada paso); `src/components/assemblyRender.ts` los dibuja.
- `src/lib/cutlist.ts`: medidas de corte, tapacanto y textos para exportar.
- `src/lib/shopping.ts`: lista de compras, precios y totales.
- `src/lib/i18n.ts`: idiomas. Cada texto visible se escribe en los dos idiomas con
  `tr('español', 'English')`; los nombres de piezas se muestran con `pieceName()`.
- `src/components/`: interfaz en React.

Clósets y estanterías usan el mismo cálculo (`kind: 'placard' | 'estanteria'`): una caja
con columnas, y cada hueco puede ser libre, barra de colgar, cajones o zapatero.
