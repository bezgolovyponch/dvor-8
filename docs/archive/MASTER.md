# DVOR-8 — the master specification

Everything decided, measured and forbidden in this project, compressed into one file. Read this before touching
the code; read `docs/REQUIREMENTS.md` for the live state and `docs/FAILS.md` for every failure and its cause.

## 1. What the game is

A photograph of your own courtyard, taken on a phone, becomes a playable 8-bit level. The real cars, benches,
bicycles and windows in it are the targets. You throw things at them from the balcony, or walk down into the yard.
Nothing is uploaded: detection, conversion and rendering all happen on the device.

**The rules everything is held to**
- **Nothing in vain**: every module, element and mode is listed with its reason, and a test fails if one is
  missing or unused.
- **People are never targets** — not for the player and not for a disaster (a disaster is not even handed the
  people; the suite asserts it).
- **Permanence**: what is broken stays broken (`world.rubble` is never cleared).
- **No loss (D27)**: nothing takes points away from the player.
- **One renderer**: the product renders constructively; per-pixel painting of the photograph is not reachable.

## 2. The machine specifications

| | |
|---|---|
| Picture | **288×512** logical (SHORT×LONG), sprites drawn at **PX = 2**, so the canvas is 576×1024 |
| Palette | **50 entries**: 8 ramps × 6 tones + OUTLINE + VOID, built once in `flat.js` and shared by every yard |
| Ramps | sky, foliage, earth, stone, metal, warm, dusk, sand — hue decides the family, value the tone |
| Movement | SPEED 92 · JUMP 300 · FALL 1040 · BOUNCE 250 · CLEAR 10 · NEAR 14 · CHAIN_RANGE 160 · STRIP 32 (px, px/s) |
| Detection | EfficientDet-**Lite2** int8, **7,515,971 B**, `DETECT_LONG = 1600` |
| Cut-out model (chosen) | `Xenova/slimsam-77-uniform`, **Apache-2.0**, ONNX, **13.8 MB quantized** (encoder 8.9 + decoder 4.9) |
| Weather | rain, snow, fog, storm (lightning) — a GRADE on the palette first, particles second |
| Disasters | hurricane (spiral), tsunami (wave), Godzilla, Beyoncé — three-beat envelope, v6's sprites |
| Files | `src/` — see the table in `docs/concept.md`; every file listed with its reason |
| Control | `node test.mjs` (311 checks) · `node tools/baseline-check.mjs` (47 rows) · `node tools/concept-check.mjs <canvas.json>` (7 rows) |

## 3. The pipeline, in order (each step only begins when the one above is green)

1. **PHOTOGRAPH** → decode, fit to the picture's aspect (never forced), 288×512.
2. **DETECT** → Lite2 over the large image, tiled, merged; boxes are the only thing the painter is told.
3. **ENHANCE** (`enhance.js`) → flatten the lighting (divide out a large blur), open local contrast, smooth the
   grain, and measure two maps: **edge strength** and **long-straight-run density** (which separates sky from a
   distant city; depth alone cannot).
4. **BUILD THE WORLD** (`vector.js`) → sky (blue core grown through its own clouds, stopped at the skyline,
   designed clouds above it) · foliage masses · **facades as planes** (one tone plus a turned-away tone) with
   **window sprites**: dark FRAME, GLASS, lighter SILL, on the facade rhythm's grid · **road** as the
   photograph's own luma terciles, each a distinct flat plane, with **markings as shaped components** (≥14 px) ·
   **despeckle** (a pixel whose four neighbours agree joins them).
5. **CUT OUT THE THINGS** (`objects.js`) → adaptive cut taken from the ring's own distances, **no fallback to the
   box**; a plane is never treated as a thing (above 6% of the frame it is skipped).
6. **TEMPLATE THE THINGS** (Metal Slug, via v6) → 4-tone ramp from the thing's paint, diagonal **windshield
   glint**, **amber running light**, 1-px outline.
7. **OUTLINE AND INTERACT** → `world.edgesOf` (a pixel is on the edge when a neighbour is not in the thing):
   **pink** on aim, **cyan** in info mode, the selection **blinking yellow**, a tooltip with a **true** fact
   (never the same theme twice). Outlines are for things, not planes (above 5% of the frame: skipped).
8. **DESTROY** → the model in §4.
9. **EVENTS** → the three-beat envelope (siren → impact → calm), the front tearing cells, structures and things,
   cars rolling over, windows popping, walls collapsing into ruins.
10. **SHARE** → the card with **Я ЗДЕСЬ · I AM HERE**, БЫЛО/СТАЛО, the yard's own verdict, hashtags.

## 4. The destruction model (settled; `docs/knowledge-base.md` §6)

1. **The ladder**: intact → scraped one tone (its own ramp; **up** if it has nowhere darker to go) → torn → void.
2. **The carrier**: damage follows the thing's own **edges map** — never a box, never a radius alone.
3. **The transition**: intact → wrecked in place, losing pieces; only a small core becomes void.

Rejected, with the measurement that rejected them: delete-the-region (no remains — the black boxes);
scorch-everything (a dark car became a black mass); trace-a-polyline (a car outlined as a rectangle);
paint-the-flood-flat (the yard vanished under an olive field).

## 5. The numeric bars (the gate, on a CLEAN canvas dump — `?clean=1`)

| measure | bar | class |
|---|---|---|
| surfaces flat | ≥ 55% | MEASURED (18% before the surfaces were built) |
| colour changes per pixel | ≤ 0.34 | MEASURED (0.79 before) |
| sky palette entries (top fifth) | ≤ 8 | MEASURED |
| window sprites present | ≥ 8 | MEASURED |
| one colour below the sky | ≤ 32% | **CHOICE** — the 6% it was first set from came from a photo of a phone screen |
| palette entries in the frame | = the project's own table | IDENTITY |

Current: **GATE 7 OK / 0 FAIL** · **311 checks / 0 FAIL** on the Prague photograph.

## 6. The restrictions (each because it was done and was wrong)

R1 never draw a thing as a box when its shape is known · R2 never let an event be an overlay on a picture ·
R3 never paint per pixel what should be a surface · R4 never delete a thing instead of wrecking it ·
R5 never show the raw photograph inside the game frame · R6 never measure a frame carrying overlays or grades ·
R7 never claim a result without a picture of it on a real photograph · R8 never read a measurement without
checking the patch landed · R9 never invent a mechanic when a working reference exists · R10 never draw a
monochrome frame · R11 never treat a plane as a thing · R12 never outline a plane · **R13 no fix is reported
without its picture and its number, and no fix is attempted before its cause is named in `docs/FAILS.md`.**

## 7. The method (mandatory)

1 Search for a solution. 2 If none is complete, break the problem into pieces. 3 Search for each piece
separately, and name its exact source in the code. 4 Assemble and adjust. 5 Keep dropping levels until the
result is certain — certainty is a measurement, never a reading of the code. 6 After every iteration, go through
everything before the output.

## 8. Sources

`docs/knowledge-base.md` holds every link: OpenCV morphology (the outline rule), marching squares, boundary
tracing, Ramer–Douglas–Peucker, Lospec palettes, Kenney/OpenGameArt assets, js13kGames, PICO-8, NESdev,
Red Blob Games, and the games that invented each mechanic (Bomberman 1983, SimCity 1989, Rampage 1986,
Pac-Man 1980, Metal Slug 1996, Dig Dug 1982, Rampart 1990, Populous 1989), plus the model cards measured
for licence and size.
