# THE PLAN FROM THE REAL PRODUCT — pieces, scopes, and gates taken from the operator's own engine

Question answered here: *which parts of the real product exist, what is each for, which of them is wired in our app,
and where do the mechanical gates come from?* The answer to the last part is: **they come from the engine's own
per-stage readout**, which this repository already produces, not from numbers I invent.

## 1. The real product's pieces (the conversion half, from the engine's own SPEC)

`tools/v13/engine-v13.txt` is a byte-exact extraction of the operator's file (`tools/v13/refs.mjs` refuses to run if
it is not). Its `SPEC` declares 24 stages. The conversion is these, and every one has a stated rule, method and source:

| stage | scope (its rule, in the file's words) | source it cites | our code | wired? |
|---|---|---|---|---|
| S0 Frame | cover-fit to 9:16, box-average to **288×512**, PX = 2 | box-filter resampling | `pieces/downscale.js` | **yes**, verified |
| S1 Palette | **one fixed 50-entry** master table (8 ramps × 6 + outline 48 + void 49) | indexed colour (Aseprite discipline) | `src/flat.js` | yes |
| S2 Snap + reduce | snap by the v10 two-class rule; **keep the 12 most-used non-sky entries**, remap the rest in **CIE Lab** | Heckbert 1982, Lab, Kuwahara | `pieces/working-palette.js` | **yes**, 4/4 verified — but **keeps 22, the reference keeps 12** |
| S3 Clean | 3×3 majority: 2 passes ground, 1 vehicles | rank-order filtering | `pieces/ground-planes.js` + vector passes | partly |
| S4 Edges | Sobel \|∇L\| drives sky growth and facade grids | Sobel & Feldman 1968 | inside vector/facade | yes |
| S5 Sky region | seeded 4-connected growth, hole filling by reconstruction, 2-pass mode | Adams & Bischof 1994, Soille 2003 | inside vector | yes |
| S6 Sky style | theme + one base + **Bayer band + 2-tone clouds**, ≤8 entries | Bayer 1973, Perlin lineage | `pieces/sky-style.js` | **yes**, 6/6 — the band is off (D29) |
| **S7 Detector contract** | objects **arrive** as `{quad, clip, kind}` / `{box, view}`; *"everything after this point is deterministic"* | YOLO/COCO, a facade segmenter | `pieces/scene-annotation.js` | **just wired**, 6/6 — the reference's own SCENES validate |
| S8 Facade rectification | homography from the unit square to the **given** quad | Heckbert 1989 | `pieces/facade-photo.js` | yes |
| S9 Facade grid | profile + autocorrelation **inside the rectified** facade | Lee & Nevatia 2004; Müller et al. 2007 | `pieces/facade-photo.js` | yes |
| S10 Facade analysis | **Otsu** (glass) / **Niblack** (punched), 4-connected components, the largest class is the frame, pane filters | Otsu 1979, Rosenfeld & Pfaltz 1966, Teboul 2010 | `pieces/facade-photo.js` | yes |
| S11 Facade rebuild | **the photo itself** in the working palette; only panes recoloured to the glass ramp; each pane its own window | the reference screen | `pieces/facade-photo.js` | yes |
| S12 Vehicles | inside a **given box**: fuzzy-select flood + 2-class colour model + 3 ICM rounds + largest component + contour vote | GrabCut (Rother 2004), ICM (Besag 1986) | `src/detect.js` + vector cut-out | partly |
| S13 Silhouette | edge = A − erosion(A), 4-neighbour; aim pink, info cyan, never a box | Serra 1982 | `pieces/outline.js` | **just fixed**, 5/5 |
| S22 Determinism | one PRNG seeded from the scene; two builds = one FNV hash | mulberry32, FNV-1a | per-frame determinism gates | yes |

## 2. The gates, taken from the real product's own readout

`reference/v13/readout.json` is the engine's report on its own four scenes (it prints, per scene: the FNV of two
builds, the working palette, the window count, and per facade `lu×lv` grid, `nw` panes, `pf`/`bf` periods, `corr`,
`glassDom`, Otsu `T`, `cover`, the wall entry). These are the real product's numbers — the bars our frame must meet,
per stage, on the same photograph:

| the real product says (prague-tower, the judged photo) | our frame says | gap |
|---|---|---|
| **working palette 12** entries: `[21,20,23,22,19,2,1,0,18,28,36,3]` | **17** (`V1 PALETTE distinct tones 17`) | **+5** — `pieces/working-palette.js` keeps 22; the reference keeps 12 (S2) |
| **windows 1321** (1321 pane objects in the yard) | **468** window objects (the paint finds **1253 panes**) | the piece's panes exist; **the object creation drops ~63 %** |
| tower facade: grid **10×11**, panes **1262**, `T` **102**, `cover` **0.313**, wall entry **20**, `glassDom` true, `pf` 0.268, `bf` 0.986 | our facade box: panes **1253** (close!), but the **lattice 10×11 / T / cover are not measured by any gate of ours** | 3 of the 7 facade numbers are ungated |
| checker facade: grid **6×7**, panes **228**, `T` **72**, `cover` 0.363 | not compared | ungated |
| FNV equal on two builds of every scene | our frame determinism is per-frame gated | ok |
| the other three scenes: palette 12, windows 120 / 23 / 16 | not compared | ungated |

**These are the mechanical gates the product needs, and they exist already as data**: a gate that reads
`reference/v13/readout.json` and compares our frame's own readout to it, per stage, on the same photograph — palette
count, window count, per-facade `lu×lv`, `T`, `cover`, `pf`/`bf`. No invented thresholds, no share proxies.

## 3. The plan, in the real product's own order

1. **Run the engine as the converter.** It is available, byte-exact, and executable in this repo (`tools/v13/refs.mjs`
   lifts the class, verifies the sha, and runs `build(img, scene, seed)` in a page). The app should do **the same**
   instead of my re-derivation: load the photo, take the annotation (S7), call `build`, show `c.clean`. That makes the
   unified system *identical to the real product by construction*, and every remaining brick of ours serves the
   *annotation* and the *game*, not the converter.
2. **The annotation from the product's own interaction.** The player's tap is the reference's S7 input: a tap + seeded
   growth (`pieces/region-grow.js`, S5's machinery applied to a wall) → a quad; or four taps = the file's `quad`
   format; the ground line `gy` from a kerb tap or the mask; `h0` from S5's skyline; car boxes from the existing COCO
   detector with a tap-drag correction. `pieces/scene-annotation.js` (verified) is the contract that receives them.
3. **Gates from the readout** (section 2): our frame's readout against `reference/v13/readout.json`, per stage, and
   the FNV-determinism of our build. This replaces the share-based bars with the real product's numbers.
4. Only then the visual gaps that remain between the engine's frame and ours *disappear by construction* (the band,
   the checker pitch, the road contrast, the 12-entry palette) — because they are the engine's own output, not a
   re-tuning.

**What was missing, exactly:** not the pieces and not the sources — **the engine itself was never the converter.**
Everything I built re-derived stages S0–S13 from the SPEC, and the two halves that decide the result — the **annotation**
and the **engine's own execution** — were absent. The annotation contract is now a verified brick; the engine's execution
exists as a tool; the plan is to make it the app's converter and to gate our frame on the engine's own readout.
