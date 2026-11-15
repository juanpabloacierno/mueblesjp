# MueblesJP · Melamine cut list

*[Versión en español](README.md)*

A web app to design melamine furniture and know exactly what to cut: **wardrobes**
(built into an alcove or freestanding), **desks**, **bookcases and shelving**, **media
units and sideboards**, **bedroom furniture** and wall shelves. The interface is available in Spanish and English: use the ES/EN switch in the
top bar (the first time it follows your browser's language).

Enter the size of the unit (or of the alcove, if it is built in) and the app gives you:

- **Dimensioned plan**: front view and side section, with the clear space of every
  compartment and column.
- **Spaces and marks**: the height of each shelf (from the floor and from the unit's
  bottom panel) and where each divider goes, so you can mark them before assembly.
- **Cut list**: pieces with quantity, length, width and which edges get edge banding.
  Copy it with one tap to send it to the cutting shop, or download it as CSV.
- **Board selection**: brand, type, size, thickness and color (with the decor code) for
  the exterior, the interior and the back panel. Includes the Egger, Faplac and Sadepan
  catalogs with their lines and colors, and you can add and save your supplier's boards.
  If a piece does not fit, it suggests a board that does.
- **Exterior and interior colors**: doors and drawer fronts always use the outside color;
  shelves, dividers and drawers use the inside one; the carcass is your choice. Each color
  gets its own boards, cut list and edge banding.
- **3D view** with the chosen colors: rotate and zoom with your finger or the mouse, with
  doors closed, open (drawers pulled out) or removed.
- **Boards**: how the pieces fit on the boards (edge-to-edge cuts, like a panel saw), how
  many boards to buy and which offcuts are left.
- **Doors**: hinged (full overlay or inset, full height or only the lower part, on the
  columns you choose) or sliding. It works out each door's size, which hinge to use
  (full overlay, half overlay or inset), the height of each hinge and how much clear space
  you need in front to open them.
- **Wardrobes**: alcove size with clearances, top storage with its own doors, and in each
  compartment shelves, a **hanging rod**, **drawers** or a **shoe rack** (slanted shelves
  with a stop, two bars per level, or flat shelves). Typical layouts are included to start
  quickly (long hanging, double hanging, short hanging + shoe rack, drawers + shelves…). It
  warns you when there is not enough height or depth to hang clothes and when the
  assembled unit cannot be stood up inside the alcove.
- **Custom drawers**: in the *Drawers* section you choose for the whole unit the drawer
  bottom (nailed under or in a groove), the fronts (inset or overlay) and the slides
  (full-extension, soft-close or roller); in each compartment, the number of drawers and
  whether they are equal or graduated (taller at the bottom).
- **Shopping list**: everything you may need, grouped into boards and cutting, hardware,
  screws and fixings, supplies and tools. The essentials come checked; optional items
  (cam locks, dowels, soft-close dampers, tools…) are checked by hand. Enter each item's
  price once and it is used for every unit.
- **Illustrated assembly instructions**: a sheet with every piece drawn (with its letter,
  quantity, size and banded edges) and the hardware, then the steps in order, each with
  its own drawing: what is already assembled in white, the new pieces highlighted and
  pulled apart, with arrows to where they go and their cut-list letter, plus the pieces
  and hardware each step needs. The drawings come from the 3D model, so they always match
  your unit.
- **Starting models** (**+ New** menu), grouped:
  - *Wardrobes*: with sliding doors, with hinged doors, or just the interior.
  - *Desks*: simple (top, side panels and modesty panel), with a drawer pedestal, with
    drawers and a cabinet with a door, with two drawer pedestals, with shelves, and a
    standalone drawer unit.
  - *Bookcases and shelving*: bookcase, with lower doors, with drawers below, double with
    doors, built-in floor to ceiling, low shelving unit, cube organizer and wall shelf.
  - *Media units and sideboards*: low cabinet with doors, TV unit and TV stand, sideboard
    with drawers, china cabinet and cabinet with sliding doors.
  - *Bedroom*: nightstand and chest of drawers.
- **Desks with a knee space**: any column can be marked as a knee space. That column has
  no bottom, shelves or back panel; its sides go down to the floor (*Inner side panel*)
  and a **modesty panel** goes at the back, under the top, to stiffen the desk. The other
  columns become drawer pedestals or cabinets, each with its own bottom, plinth and back
  panel. It warns you if the knee space is too narrow (under 600 mm) or too low (under
  620 mm).
- **Warnings**: shelves too long that will sag, tall units that must be fixed to the wall,
  pieces that do not fit on the board, and so on.

Your units are saved automatically in the browser. From the **⋯** menu you can duplicate
or delete them, or download a `.json` backup to move them to another computer.

## How it is calculated

All measurements are in millimeters.

| Piece | Size |
| --- | --- |
| Side panels | Total height (minus one thickness if the top sits **on** the sides) × unit depth |
| Top | Between the sides: width − 2 thicknesses. On the sides: total width |
| Bottom | Width − 2 thicknesses. With a plinth it is raised to the plinth height |
| Plinth | Width − 2 thicknesses × plinth height |
| Dividers | Inside height (bottom to top) |
| Fixed shelves | Clear width of the column |
| Adjustable shelves | Clear width of the column − clearance (2 mm by default) |
| Nailed-on back | Width − 2 × height − 2 (1 mm inside each edge) |
| Back in a groove | Inside clear space + 2 × (groove depth − 1) each way |
| Full overlay door | Covers the whole side panel and half a divider: covered width ÷ doors − gap (3 mm) |
| Inset door | (Clear width of the column − gaps) ÷ doors; clear height − 2 gaps |
| Sliding door | (Inside width + overlaps) ÷ panels; clear height − the kit's deduction |
| Built-in unit | Alcove − 5 mm per side, − 20 mm at the top, − 10 mm at the back |
| Top storage shelf | Width − 2 thicknesses; columns and dividers reach up to it |
| Hanging rod | Clear width of the column − 2 mm, centered 50 mm below the compartment's top |
| Inset drawer front | Clear width − 6 mm × (compartment height − 3 mm per gap) ÷ drawers |
| Overlay drawer front | Like an overlay door: covers the whole side panel and half a divider, the bottom (or half a shelf) below; covered width − 3 mm |
| Drawer box | Clear width − 26 mm (13 mm per slide) × drawer slot − 30 mm (max. 250), slide length |
| Nailed drawer bottom | Slide length × box width |
| Drawer bottom in a groove | Inside of the box + 2 × (groove depth − 1 mm), both ways |
| Slanted shoe rack | Clear width of the column × up to 330 mm run at 15° (342 mm along the slope), with a 50 mm stop |
| Shoe rack with bars | 2 bars per level, clear width − 2 mm: front bar 60 mm from the front, back bar 200 mm further in and 70 mm higher |
| Flat shoe rack | Shelves on pins: clear width − clearance × compartment depth |
| Inner side panel (desk) | Floor to top × unit depth, next to the knee space |
| Modesty panel | Clear width of the knee space × modesty panel height (350 mm by default) |
| Bottom, plinth and back panel with a knee space | One per run of columns with a bottom (each pedestal or cabinet) |

- The **depth** you enter is the total depth including the back: with a nailed-on back,
  the side panels are the depth minus the back thickness.
- **Length = grain direction.** Side panels and dividers have vertical grain; top, bottom
  and shelves, horizontal. If the melamine has a grain, pieces are not rotated on the board.
- Compartments are split in whole millimeters; any remainder goes to the lower ones. You
  can fix the height of any compartment and the rest is split automatically.
- Edge banding is shown with the length of each edge (`1 × 764` = one 764 mm edge). With
  thick banding (1 or 2 mm PVC) turn on *Subtract edge banding* so the finished piece
  measures exactly right.
- Hinged doors: 2 per column if the column is wider than 60 cm. Hinges per door by
  height (2 up to 90 cm, 3 up to 160 cm, 4 up to 2 m), 100 mm from the ends. Full overlay
  hinges on the side panels, half overlay on the dividers, inset hinges for inset doors;
  with inset doors the shelves behind are shortened by one thickness + 2 mm.
- Sliding doors: shelves and dividers are set back from the front by the space the tracks
  take (50 mm by default). The height deduction depends on the kit: check its instructions.
- Wardrobes: hanging clothes needs about 520 mm of clear depth (ideally 550–600), 950 mm of
  height for shirts and 1500 mm for dresses or long coats. The drawer slide is the longest
  that fits (250 to 600 mm, in 50 mm steps). The shelf above a hanging rod or drawers is
  fixed. To stand the assembled unit up you need more height than the side panel's
  diagonal.
- Desks: the usual height is 720 to 760 mm. The knee space has no doors, and a unit with
  a knee space has no top storage or sliding doors. If every column is a knee space, the
  desk is just a top, side panels and a modesty panel.
- Drawers:
  - *Bottom*: nailed under the box (every 10 cm) or set in a groove in the sides, front and
    back of the box (by default 8 mm deep, 12 mm above the bottom edge, as wide as the
    bottom panel + 1 mm). A grooved bottom needs no nails, but the groove has to be ordered
    from the cutting service or cut with a saw or router.
  - *Fronts*: inset inside the compartment with a 3 mm gap, or overlay, covering the edges
    like overlay doors and adding their thickness to the front of the unit. Drawers behind
    a door always stay inset. With overlay fronts the box can be longer (the slide does not
    subtract the front).
  - *Slides*: full-extension from 250 to 600 mm, soft-close full-extension (same lengths)
    or roller slides from 250 to 550 mm (cheaper, they do not open all the way). The longest
    that fits is chosen, in 50 mm steps.
  - *Heights*: equal, or graduated: each drawer adds a quarter of the top drawer's height
    (4 drawers end up in a 1.75 : 1.5 : 1.25 : 1 ratio from bottom to top).
- Shoe racks: levels are spread evenly in the compartment; about 200 mm per slanted level,
  180 with bars and 170 per flat row are recommended. It warns you if they are too close.
- Defaults: Egger melamine 2600 × 1830 × 18 mm, 3 mm thin MDF back, 4 mm saw kerf, 10 mm
  trim per edge, 22 × 0.45 mm edge banding. Boards are changed in *Boards* and the rest in
  *Cutting and edge banding*.
- Reference catalog (check with your supplier): Egger 2600 × 1830 (melamine 15 and 18 mm,
  melamine on MDF 18 mm, 3 and 5.5 mm backs); Faplac 2750 × 1830 (melamine 15, 18 and
  25 mm, MDF and particleboard 18 mm); Sadepan 2820 × 1830 (melamine 18 mm); generic thin
  MDF and white back 2600 × 1830. Wood colors turn on the grain. With raw MDF or
  particleboard, edge banding is optional.

The board layout is a guide: it tries several guillotine cutting strategies (with the saw
kerf and the trim) and keeps the one that uses the fewest boards.

### Brand colors

The colors come from the brands' websites, their launches and listings from stores in
Argentina (Easy, DAC Maderas, Alnora, DIAC, Maderwil, Trumar, Multiplacas and others), as
of November 2026. Codes are each brand's own (Egger W954, H3170…; Faplac 098, 135…;
Sadepan 780, TM4…). Those marked "to be confirmed" only appeared in stores. The color in
the 3D view is an approximation based on the name: the real board may look different.
Thicknesses: Egger in 18 mm (15 mm only in Blanco, Negro, Gris Sombra and Fineline Crema);
Faplac in 18 mm (15 and 25 mm confirmed in Blanco); Sadepan lists 10 to 25 mm, but colors
are mostly available in 18 mm.

## Using it

On a computer or phone, after enabling GitHub Pages (once):
**Settings → Pages → Source: GitHub Actions**. Every change that reaches `main` is
published automatically at `https://<user>.github.io/mueblesjp/`.

To run it locally you need Node 22:

```bash
npm install
npm run dev        # development server
npm test           # calculation tests
npm run build      # production build, in dist/
npm run build:single  # a single self-contained index.html, in dist-single/
```

## Code

- `src/lib/shelf.ts`: unit geometry, pieces, positions, hardware and warnings.
- `src/lib/packing.ts`: board cutting optimization (guillotine, with saw kerf and trim).
- `src/lib/doors.ts`: hinged and sliding doors (lower part and top storage).
- `src/lib/resolve.ts` and `src/lib/templates.ts`: alcove sizes and typical layouts.
- `src/lib/shoes.ts`: shoe racks.
- `src/lib/catalog.ts`: board catalog (brands, types, sizes and thicknesses) and which
  pieces use the exterior or interior color.
- `src/lib/decors.ts`: each brand's lines and colors, with an approximate color for 3D.
- `src/lib/scene.ts` and `src/components/Furniture3D.tsx`: 3D view (three.js).
- `src/lib/steps.ts` and `src/lib/assembly.ts`: assembly steps (text, pieces and hardware
  per step); `src/components/assemblyRender.ts` draws them.
- `src/lib/cutlist.ts`: cut sizes, edge banding and export texts.
- `src/lib/shopping.ts`: shopping list, prices and totals.
- `src/lib/i18n.ts`: languages. Every visible text is written in both languages with
  `tr('español', 'English')`; piece names are shown with `pieceName()`.
- `src/components/`: React interface.

Wardrobes and shelving units share the same calculation (`kind: 'placard' | 'estanteria'`):
a carcass with columns, where each compartment can be empty or hold a hanging rod, drawers
or a shoe rack.
