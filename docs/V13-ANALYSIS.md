# V13 ANALYSIS — the operator's file, line by line

> **What this file is.** A structural, line-by-line reading of `/Users/m/Downloads/DVOR-8 Photo2Pixel v13.dc.html`
> (864 lines, 133,246 bytes, sha256 of the file recorded below), written before any porting decision. It states what
> the file *is*, what it *contains*, which of its mechanisms are proven (they carry a published source) and which are
> its own annotation contract, and where our product diverges from it. It is not a plan; it is the map the plan is
> drawn on.

File identity (measured):

```
file      /Users/m/Downloads/DVOR-8 Photo2Pixel v13.dc.html
bytes     133246 · lines 864
engine    lines 123–861, the `class Component` text, 115,511 chars — extracted verbatim to tools/v13/engine-v13.txt
          sha256 a2a61d019216f3f109cfb0873d475a5602d1ee4221696f4f91b2b90eedcb082b
runtime   <script src="./support.js"> — the Design-Canvas runtime, NOT present next to the file (see §11)
```

## 1. THE CONTAINER (lines 1–29, 120–122, 862–864)

| lines | what it is |
|---|---|
| 1–8 | HTML shell: `<meta charset>`, viewport, `<script src="./support.js">`, body, `<x-dc>` custom element. The file is a **Design Canvas document**, not a standalone app. |
| 9–19 | `<helmet>`: page background `#0b0018`, link hover colours, `image-rendering: pixelated` on canvases. |
| 20–29 | The page header: title "ДВОР-8 · v13 · PHOTO → PIXEL ENGINE", the one-paragraph statement of the contract ("One deterministic pipeline … Give it any 9:16 photo plus a list of labelled shapes … It returns the same styled, destructible game screen"), and the INPUT PHOTO chips (`sc-for` over `{{ scenes }}`). |
| 30–77 | Column **13a**: the phone (576×1024 canvas = 288×512 at PX 2), status bar, score, danger, banner, fact card, weapon drawer, disaster drawer, the four-ring toolbar, and the one-line instruction. |
| 78–104 | Column 2: the SOURCE PHOTO at 432×768, the six PIPELINE STAGE canvases (S0, S2–S3, S5, S4, S9–S11, S13–S14), the FACADE RECOGNITION panel (`{{ rep }}`), and SCENE JSON. |
| 105–118 | Column 3: the RULEBOOK (SPEC) and the BASELINE (`{{ base }}`, with a RERUN button). |
| 120–122 | Close `</section>`, `</x-dc>`. |
| 862–864 | `</script></body></html>`. |

So the deliverable artefact of the file is **a printed design document that runs**: the game plays in column 13a,
and its own claims are measured live in columns 2–3 and printed as the BASELINE list.

## 2. THE MARKUP CONTRACT (lines 30–119)

The markup is not a static mock-up; it is bound to the component's `renderVals()` (line 509):

- `{{ scoreTxt }}`, `{{ wrecked }}`, `{{ danger }}`, `{{ showBanner }}`, `{{ phaseTxt }}`, `{{ disName }}`,
  `{{ showHint }}`, `{{ showFact }}`, `{{ fact.* }}`, `{{ menuW }}`, `{{ menuD }}`, `{{ weapons }}`, `{{ disasters }}`,
  `{{ barW }}`, `{{ arrow }}`, `{{ infoBg }}`, `{{ infoColor }}` — the game state.
- `{{ sceneLabel }}`, `{{ photoSrc }}`, `{{ skyTxt }}`, `{{ detTxt }}` — the current scene.
- `{{ rep }}` — one row per facade: name, kind, and the detection note ("GLASS WALL · Otsu T …, frame = light
  class · N panes from M components · rows × columns · glass %").
- `{{ sceneJson }}` — the annotation input, pretty-printed.
- `{{ spec }}` — the 24-stage rulebook.
- `{{ base }}` / `{{ baseSum }}` / `{{ rerun }}` — the self-test rows and their pass count.

Handlers: `onPointerMove`/`onPointerLeave`/`onClick` on the game canvas (aim, leave, tap), `onClick` on the four
toolbar roles (`info`, `weapon`, `disaster`, `toggle`), and the scene chips. The toolbar is data-driven by
`data-role` (line 68–73) and checked by self-test I1.

## 3. THE CLASS: FIELDS AND CONSTANTS (lines 124–131, 157–201, 558–594)

```
124  class Component extends DCLogic        — the Design-Canvas logic base (support.js)
125–129 the contract comment: SPEC = rulebook · SCENES = annotation · build() = converter ·
        D-model = destruction · dis_* = disasters · same photo + annotation → same frame (FNV)
130  state = { weapon, open, menu, info, fact, score, wrecked, phase, disId, disName, base, scene, report, det }
131  GY = 334; CARIDS; TARGETS; NAMES; CARNAMES; BGY; curGY; tok; _s = 1; stEls
158–199 SCENES: four scenes — prague-tower (2 facades, 6 cars, props: lamp, tram pole, cables),
        prague-street (5 facades, 6 cars), aerial-church (5 facades, 11 cars), sunset-bus (3 facades, 4 cars)
200  SKYTHEMES = { day: {base 3, band 4, hi 29, lo 28}, overcast: {base 27, band 28, hi 29, lo 23},
        sunset: {base 1, band 34, band2 35, hi 38, lo 37} }
558  W = 288; H = 512 (the game grid); refs/spr/frames/hover/sel/score/proj/parts/dis/errs/fs
559  PAL — 50 hex entries: 8 ramps × 6 tones (indices 0–47), outline 48 = #1a1220, void 49 = #0b0018
560  WEAPONS = stone, brick, slipper, bottle, paint (Russian labels)
561  DIS = hurricane, tsunami, godzilla, beyonce (Russian labels)
562  PHASE = siren / impact / calm
563–593 FACTS — 30 curated facts in 10 themes
```

The palette is the same 8×6+2 structure our repo carries, and the sky themes are exactly its five entries per theme.
**The reference's palette is our palette** — this matters for every "compare like with like" gate below.

## 4. THE RULEBOOK: SPEC (lines 132–157) — 24 stages, each with rule · method · source

Each entry is `{ id, name, rule, method, src }`. The published sources it names (not our invention):

| stage | subject | method | source named in the file |
|---|---|---|---|
| S0 | frame | cover-fit 9:16, box-average to 288×512 | standard box-filter resampling |
| S1 | palette | one 50-entry master palette, ≤12 working entries | indexed-colour framebuffers; Aseprite/Pyxel Edit discipline |
| S2 | snap + reduce | two-class snap (grey → neutral by luma, colour → chromatic by 2,4,3), popularity 12, Lab remap; Kuwahara r=2 only for facade luma | Heckbert 1982 (popularity); CIE 1976 Lab; Kuwahara 1976 |
| S3 | clean | 3×3 mode filter, 2 passes ground / 1 vehicles | rank-order (Tukey-style) |
| S4 | edges | Sobel magnitude / 4 | Sobel & Feldman 1968 |
| S5 | sky | seeded region growing + hole filling + 2-pass mode | Adams & Bischof 1994; Soille 2003 |
| S6 | sky style | theme from the photo, Bayer band, value-noise clouds | Bayer 1973; Perlin-lineage value noise |
| S7 | detector contract | annotation JSON: facade quad (+clip), vehicle box + view, props | YOLO (Redmon 2016); COCO (Lin 2014) |
| S8 | facade rectification | square→quad homography, inverse mapped | Heckbert 1989 |
| S9 | facade grid | projection profiles + unbiased autocorrelation | Lee & Nevatia 2004; Müller et al. 2007 |
| S10 | facade analysis | blue ≥30% → glass wall (Otsu); else Niblack local window rule; 4-connected components; frame = largest component; panes = compact components off the outline; size consistency; floors/columns clustered; fallback lattice | Otsu 1979; Rosenfeld & Pfaltz 1966; Teboul 2010; OpenCV |
| S11 | facade rebuild | **the facade is the photo itself in the working palette** — no re-projection; only detected panes recoloured, one glass ramp (5–95% brightness); each pane its own window object; frame pixels stay | v6/v10 approved look |
| S12 | vehicles | front-view template + road-like peeling, or magic-wand flood + GrabCut-style colour models + ICM, largest component, contour vote, holes filled; photo pixels + 1-px outline | Rother et al. 2004 (GrabCut); Besag 1986 (ICM); floodFill |
| S13 | silhouette | ID buffer; edge = A − erosion(A); pink aim / cyan info; blinks 125 ms | Serra 1982 |
| S14 | pieces | building piece = 2 facade columns × 1 floor; vehicle 6×4; support below/beside | grid-keyed chunk graph |
| S15 | damage ladder | intact → cracked → darkened → gutted → gone; one hit = one step; window breaks before its piece | FEMA HAZUS-MH states |
| S16 | collapse | unsupported piece falls after 4 cascade ticks (every 3rd frame) | GSA 2003; UFC 4-023-03 |
| S17 | particles | Euler g = 0.15 px/frame²; bounce once; rubble height map | Reeves 1983 |
| S18 | reveal | gone shows sky if ≥40% top border touches sky, else dark interior; 15% interior; vehicles show the back buffer | Porter & Duff 1984 |
| S19 | glass | 75% of px particles, border shards 28/4, rest dark 48/49; windshield star | polar fracture |
| S20 | weapons | drawn at bottom centre; arc lerp − 70·sin(πt) over 22 frames | — |
| S21 | disasters | siren 60 → impact → calm; hurricane log-spiral; tsunami Gaussian crest + water LUT; Godzilla 26-frame step; Beyoncé bites | Senn & Hiser 1959 |
| S22 | determinism | mulberry32 seeded from the scene index; sin-hash texture; same build → same FNV | Ettinger; FNV |
| S23 | info | shuffle-bag without replacement, no theme repeated | — |

**This table is the file's own "proven source" claim, and it is checkable**: every stage names a method and a published
origin. That is the standard the operator's instruction ("all the processes not invented, but taken from proven
trustworthy source") points at.

## 5. SCENES: THE ANNOTATION CONTRACT (lines 158–199)

The file's only per-photo input. Measured shape:

```
{ id, label, src, gy, [h0], sky: 'auto',
  buildings: [ { id, name, kind: 'auto'|'checker'|'facade', quad: [[x,y]×4], [clip: polygon] } ],
  cars:      [ { x, y, w, h, type: 'hatch'|'van'|'suv'|'mpv'|'box', name } ],
  props:     [ { t: 'rect'|'line'|'pole', ... } ] }
```

Four scenes are inscribed: Prague tower (2 buildings), Prague street (5 buildings), aerial church (5), sunset bus (3).
`gy` is the ground line; `kind: 'auto'` means the engine decides glass vs checker from `corr`/`bf` (line 287);
`clip` is a polygon that makes the shared party wall of two buildings explicit.

**The operator's screenshots are these scenes**: screenshot 2 is `prague-tower` / `prague-street` with the
"FACADE RECOGNITION" panel showing the per-facade detection notes; screenshot 1 is `sunset-bus`.

## 6. THE HELPERS (lines 202–223, 595–655, 852–859)

| line | helper | what it does |
|---|---|---|
| 202–203 | `seed`/`rnd` | mulberry32; the only randomness; seeded from `si * 7919 + 1` at build start |
| 204 | `fnv` | FNV-1a over the frame indices — the determinism witness |
| 205–207 | `isTarget`/`objName`/`revealB` | id ranges (1–9 buildings, 10–39 cars, 40+ props); reveal rule |
| 208 | `skyStyle` | the designed sky: base, Bayer band toward the horizon, two flat cloud tones from value noise |
| 209 | `lab` | sRGB → CIE Lab (for the popularity remap) |
| 210–213 | `sq2quad`/`inv3`/`hApply`/`inPoly` | Heckbert square↔quad homography, inverse, point test |
| 214–223 | `period` | gradient projection → unbiased autocorrelation → peaks → smallest strong peak (pane), phase by comb sum; fallback p=6 |
| 595–596 | `hash`/`vn` | sin-hash and value noise |
| 598–609 | `initPal` | builds RGB/LUM/P32/KEYS/NEU/CHR/WATER/SIREN from PAL |
| 610–616 | `quant` | the two-class snap: `sat<0.26` or `mx<45` → nearest neutral by luma; else nearest chromatic by 2,4,3 |
| 617 | `bayer` | 4×4 ordered dither |
| 620–623 | `maj` | 3×3 majority (mode) filter |
| 624–626 | `grid`/`px`/`outline` | sprite buffers and 1-px morphological outline |
| 627–654 | `ell`/`rectG`/`item`/`itemGrid` | the five weapon sprites drawn in code |
| 655–700 | `headPix`/`headGrid`/`kaijuPix`/`kaijuGrid` | Beyoncé head and Godzilla sprites |
| 852–859 | `snap`/`measure` | palette membership test; flat/transition/dominance/sky measurements |

## 7. build() — THE PIPELINE (lines 224–391), in execution order

| lines | stage | what the code does |
|---|---|---|
| 224–226 | entry | init palettes, seed from scene index, `GY = sc.gy`; `SC = sc` |
| 227–231 | **S0** | draw the photo into a 576×1024 canvas with `imageSmoothingQuality:'high'`, cover-fit, then 2×2 mean per game pixel → R/G/B/Lp |
| 234–235 | **S4** | Sobel |∇L| / 4 |
| 236–240 | **S7** | annotation mask: polygon fill for buildings (clip if given), box for cars |
| 241–249 | **S5** | sky: seed top row, 4-connected growth with the smoothness OR sky-colour test, reach from the ground row, hole fill, 2 mode passes, annotation/ground cleared |
| 250–252 | **S2** | Kuwahara r=2 (4 overlapping 3×3 quadrants, lowest-variance mean) → Rk/Gk/Bk/Lk (the luma the facade analysis reads) |
| 253–258 | **S2/S3** | `q0 = quant(R,G,B)`; popularity histogram over non-sky; keep the 12 most-used entries < 48; remap the rest to the nearest kept entry in Lab; `qc` = 1 mode pass, `q` = 2, `qf` = 2 (for cars) |
| 259–265 | **S6** | horizon h0 from the sky's lowest run (or `sc.h0`), theme from orange share / saturation, build `skyL` per pixel and 1 mode pass |
| 266–269 | buffers | `base`, `ID`, `back`, `backID`, `bb`, `frame`, `chK` (chunk key), `wnK` (window key), `GRID`, `PROP`; `set()`/`setP()` write index+ID and grow bounding boxes |
| 270–328 | **S8–S11** | per building: homography from its quad, rectified grid (RU×RV), projection profiles → periods/phases, per-cell luminance/blue statistics, correlation (checker test), mask of the facade (clip + optional occlusion), **glass-vs-punched decision** (blue ≥30% or blue cells ≥50%), Otsu or Niblack classification, 4-connected components, frame = largest component, panes = compact components off the outline (or the lattice fallback), floors/columns clustering, then either **checker** (parity cells, light mullions 27, blue panes 1/2, cream 28/29) or **facade** (the photo's own pixels in `qf`, panes recoloured to one glass ramp 1→4 / 0→2 by each pane's 5–95% brightness, frame pixels flagged, `chK` = 2 columns × 1 floor, `wnK` = pane id) |
| 329 | outline | 1-px outline wherever a building pixel meets the sky |
| 330 | reveal | per building: REVEAL (top border sky share), INT (bottom 15%), BGY (ground line) |
| 331–337 | props | rect/line/pole drawing with ids (lamps, tram pole, cables) |
| 338–376 | **S12** | per car: 6×4 pieces; front views use the view template and peel road-like boundary pixels; `box` views use the magic-wand flood from the border + 3 rounds of 3-luma-tertile colour models with 3×3 majority (ICM) + largest component + 2 passes of 5×5 two-thirds vote + hole fill; spurs removed; photo pixels written with the 1-px outline; windows = template or darkest 35% of the upper 55%; fallback to the rounded box if the mask < 25% |
| 377–386 | **S14** | chunk and window objects: `CH` (key, bid, pix, box, wins, below), `WN` (bid, pix, ch); support graph (`sup`); `TARGETS` = buildings + cars; per-chunk ground line |
| 387–391 | assemble | state buffers `S = {base, ID, back, backID, bb, hits, cgb, st, ft, wb, pile, edges, fills, dirty}`, `recompute`, `clean = base.slice()`, `F` |

Two properties are load-bearing and line-level:

1. **The facade is the photo** (S11, line 321–324): `col = qf[k]` for every non-pane pixel, i.e. the photo's own
   colour after the 2-pass mode filter. Only pane pixels are recoloured. That is why v13's tower keeps its brown
   mullions, its perspective and its ornaments — and why no synthetic grid is ever drawn.
2. **Every pane is its own object** (S11, line 324: `wnK[k] = wi`; line 381: each `wnK` becomes a `WN` entry;
   line 383: panes are attached to their chunk). The composite count is what the "windows breakable" claim means.

## 8. THE UI AND THE FRAME LOOP (lines 392–556, 819–851)

- `loadScene(i)` (392–407) resets state, loads the photo, calls `build` **twice** and compares the FNV hashes
  (`detOK`), then draws the six stage canvases and ticks. A throw is caught and logged (`console.error`) — a silent
  empty frame is possible here too, which is why the self-test's A-rows exist.
- `drawStages()` (408–418) renders S0 photo, S1 palette, S2/S5 sky+annotation+h0, S3 Sobel, S9–S11 grid+windows,
  S13–S14 object map + pieces.
- `sceneJson()` (419) prints the annotation the current scene uses.
- `renderVals()` (509–556) binds the state to the markup; `st0..st5` are refs that paint the stages; toolbar, drawers
  and fact card handlers.
- `tick(now)` (819–841): cascade every 3rd frame; recompute dirty silhouettes; paint base; siren; selection/hover
  silhouette; disasters; the throw arc (22 frames, `−ARC·sin(πt)`); particles; weapon sprite; blit ×2; HUD updates
  every 8 frames.
- `componentDidMount` (846–850) wraps `console.error` and `window.onerror` into `errs` (self-test J3), starts rAF.

## 9. THE FILE'S OWN ACCEPTANCE TESTS (lines 420–508) — the gate vocabulary to reuse

`runTests()` measures the live page and prints 43 rows. This is the operator's "mechanical gate" standard, and our
gates should quote it:

```
A1  scene visible · one coherent palette (every sampled px in PAL; ≥10 entries; SUB printed)
A2  photo 9:16 · canvas 576×1024 · no crop/stretch
A3  objects at photo positions · nothing invented (0 non-photo px outside annotated objects)
A4  photo beside phone · same aspect
A5  one fixed 50-entry palette · every live px in it
B1  ground/greenery/people = photo pixelated (mean brightness error ≤ 24/255, 0 redrawn)
B2  vehicles = photo pixels + 1-px outline (every car: outline ≥4 px, >90% of non-outline px = photo)
B3  facades rebuilt on the photo grid · kind rules · outline vs sky (each facade has its key panes)
B4  unified sky: one base, dithered band, flat clouds, ≤8 entries
B5  cables 1-px dark · poles follow the photo
C1  targets = facades + vehicles · people/props never
C2  hover = own silhouette (A − erosion(A), 0 mismatches; pink aim / cyan info)
C3  selection blinks every 125 ms
C4  outlines update as pieces go
D1  pieces: facade column pair × floor · vehicle 6×4
D2  ladder intact→cracked→dark→gutted→gone
D3  one hit = one piece, one step · no instant deletion
D4  unsupported piece falls next
D5  debris lands, piles as rubble, stays
D6  gone = sky / interior / road, never black boxes
D7  wrecks stay recognisable (≥60% shape after 12 hits)
E1  each window breaks alone · shards + dark · piece intact
E2  glass falls, bounces once, glitter stays
E3  windshield star crack + particles
F1  five weapons present; F2 chosen weapon on canvas; F3 tap → arc → D-model
G1  four disasters; G2 hurricane columns; G3 tsunami mix; G4 Godzilla steps; G5 Beyoncé bites; G6 all via D-model
H1  info toggles · true fact; H2 no theme repeat until all shown
I1  toolbar order right→left; I2 no HUD overlap; I3 score/danger positions
J1  new file per version; J2 every baseline row measured live; J3 zero console errors
K1  deterministic build (FNV equal); K2 rulebook embedded (24 stages, each rule·method·src);
K3  working palette ≤12 photo entries (popularity)
```

These are **the reference's own predicates**. The ones our product must meet to answer the operator are A1/A5/K3
(palette), B3 (facade on the photo grid, kind rules), C1/C2 (targets, silhouette), D1–D3 (pieces, damage),
E1 (window breaks alone), and K1 (determinism).

## 10. WHAT THE FILE PROVES, AND WHAT IT ASSUMES

**Proven (carries code + a published method):** every stage S0–S23 is implemented in this one class and runs; the
frame is deterministic (FNV); the palette is one 50-entry table; the facades are photo-preserving; the windows are
detected panes; the destruction ladder, collapse and glass are implemented; the self-test measures all 43 rows live.

**Assumed (the part the operator supplies):** the annotation — the facade quads, car boxes and props are *given per
photo* by SCENES. The file does not detect a building or a car by itself. A production product must derive those
shapes from the photograph (our repo does this with the ADE20K parse + mediapipe + the opening finder); the
difference between "given a quad" and "measured a quad" is exactly where our universality risk lives.

## 11. RUNNING THE REFERENCE LOCALLY — the current tooling flaw

The page needs `support.js` (the Design-Canvas runtime), which is not next to the file. Our repo therefore runs the
engine by extracting the class text into a standalone page (`tools/v13/page.html`) and calling `build()` directly.

**Audit finding:** the existing `tools/v13/shot.mjs` reads `tools/v13/engine.txt` — which is **not** the operator's
engine. Measured:

```
tools/v13/engine-v13.txt  115,512 chars  sha256 a2a61d019216f3f109cfb0873d475a5602d1ee4221696f4f91b2b90eedcb082b
                          = the exact slice of lines 123–861 of the operator's file
tools/v13/engine.txt      125,762 chars  sha256 1b2cb4d1be039de3b77177ebf3cb31cd11834f0854efe04a2faa5ef299e78455
                          = a LOCAL FORK: `period()` picks the largest strong peak (P/phL/rawL), the rectified
                          profile is read only inside the facade mask (sky and ground excluded), and glassDom is
                          decided before the checker test
```

The fork's three deltas are defensible as *fixes to measured defects* (the Prague street's 45-px strips, the
rectangle around the roof feeding the profile, the tower's alternating rows tripping the checker test), but they are
not the operator's file and were not recorded as a fork. Until now, "the v13 reference" was the fork.

The canonical reference for every gate in this repo is therefore **the extracted operator engine**
(`engine-v13.txt`, and re-extraction verified byte-for-byte from the HTML before each run). The fork stays as
`tools/v13/engine.txt` with this note, and any use of it must say so.

## 12. OUR PRODUCT vs THE REFERENCE — the deltas behind the four complaints

| the operator's words | the reference's mechanism | our product today | the delta |
|---|---|---|---|
| "color pattern/palette is overcomplicated and visually not appealing" | S1–S3: one 50-entry palette; two-class snap; popularity 12; Lab remap; 2 mode passes on ground | `src/flat.js` regions + `src/palette.js`; measured on the last frame: flat share 77% vs reference 38%, largest tone 26% vs 6%, sky one tone 47% vs 10%, stray 1.5% vs 10.1% (T+121) | our reduction preserves large uniform fields and adds per-pixel speckle; the reference's reduction is per-photo popularity (12 entries) over the photo's own pixels |
| "no windows are detected to be breakable" | S10/S11: every detected pane becomes its own `WN` object; S14 attaches panes to pieces | `src/frame.js` `WINDOWS_MAX = 6` ("more than this and the yard is windows") | the cap removes 44 of the 50 openings the finder detects on the judged photo before they can be targets |
| "facade is all noisy" | S11: the facade is the photo's own pixels in the working palette; only panes recoloured | `src/pieces/facade.js` paints a flat plane + a synthetic window sprite grid; the bay loop draws ink mullions | texture is manufactured (sprites and tones) instead of kept (photo + 2 mode passes) |
| "the buildings has a wrong angle projection" | S8: every facade is a quad + homography; the pane lattice lives in (u,v) of the facade | `src/vector.js` draws the grid on the plan's **axis-aligned box** (`darkBoxes`, `paintCells`) | a square lattice on an angled tower — the wrong-angle projection is structural, not a constant |
| "working for all possible photo" | S7 annotation supplies quads; the engine is scene-agnostic | our chain runs end-to-end on v10a only; the second yard fails pairing (IoU 0.43) | no gate runs the other photographs through the product; the v13 reference runs four scenes |

## 13. THE DRAWING LAWS TO PORT (from the reference, with the line that carries each)

1. **The photo is the facade** — S11, line 321–324. Keep `qf[k]` for every non-pane facade pixel; recolour only panes.
2. **Every pane is a window object** — S11 line 324 (`wnK`), S14 line 381 (`WN`), line 383 (attach to chunk).
3. **Panes take one glass ramp** — S11 line 320 (`RAMP`): glass wall/light panes 1→2→3→4; dark punched 0→0→1→2,
   spread over the panes' own 5–95% brightness range.
4. **The frame is the largest component; panes are compact components that never touch the outline** — S10, lines
   293–303, with the size-consistency filter (0.4–2.5× the median) at line 303.
5. **The kind is decided before the drawing** — S10 line 287/290: blue ≥30% ⇒ glass; else Niblack; checker only when
   |corr| > 0.3 and blue cells ≥ 30%.
6. **Checker is parity, not luminance** — S11 line 313: `(((ci+ri)&1) ^ hash) === 1` picks the blue cell; mullions 27.
7. **Pieces are 2 columns × 1 floor; vehicles 6×4** — S14, lines 314/324/381–385.
8. **A window breaks before its piece takes damage** — S15, `damageAt` (line 739) and `breakWin` (line 706).
9. **The badge of correctness is the FNV hash** — S22, line 225/400: build twice, same hash.

## 14. WHAT THIS DOCUMENT DOES NOT DECIDE

Whether the product keeps our neural parse (to derive quads and car boxes automatically) or replaces it with the
reference's annotation contract is a CHOICE the operator's instruction points at ("robust simple unified mechanism,
working for all possible photo"). The reference assumes annotation; our product must not, or it stops being universal.
The gates in `docs/AUDIT-V13.md` therefore test the **drawing and window mechanism** against the reference frame,
while the **shape source** stays our detection, gated separately by pairing and by the per-photo sweep.
