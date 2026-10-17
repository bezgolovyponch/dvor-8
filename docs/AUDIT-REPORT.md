# AUDIT — DVOR-8 at finalisation: the skeleton, what is verified, what is not, and the order to finish

**Status:** read-only audit. No file under `src/`, `test.mjs` or `tools/` was modified. This document and one
`RUNLOG.md` line are the only writes.

**Evidence base (read, not re-derived):** `docs/CONSTRUCTOR.md` (680 lines, ten segments, each with its published
source + verbatim snippet + our counterpart at file:line + the gate), `data/constructor.json` (10 entries),
`data/modules.json` (34 modules, 14 buckets, licences quoted from source), `docs/MODULES.md`, `docs/DECISIONS.md`
(8 decisions, 2 open questions), `RUNLOG.md` (Q0…T+52), `docs/CRITERIA.md`, `docs/DETERMINISM.md`, `docs/LOOP.md`
(§9 iteration log, §10 mechanism rule, §11 external gate).

**Labels used below.** MEASURED = a number produced in this audit with the command shown; RECORDED = a number
produced by the evidence base with its command (Q9.2, T+52); SOURCED = an external publication, linked; CHOICE = a
decision with a reason; DERIVED = computed from the other three. No number in this document is a preference.

**The three rules this audit obeys, as set by the owner.** (1) A licence is not an answer: every blocked module is
worked through to a named permissive equivalent, or stays blocked with the queries and registries recorded. (2) Fonts
are filler, not skeleton: the font bucket is dropped from the structural map entirely. (3) The skeleton is the
deliverable: for every layer a CONTRACT (input, output, invariant, owner, fallback, gate), not a snippet.

---

## 1. VERDICT

**What the game is.** A photograph of a street becomes a 288×512, 50-colour pixel-art frame; the frame is
decomposed into buildings split into floor-by-floor cells, windows and objects; the player wrecks cells and every
cell whose support is gone falls, leaving rubble. (SOURCED: `docs/CRITERIA.md` rows B1–B4, I1.)

**What is verified to work — measured at report time or recorded in the evidence base, command in brackets (labels in §6).**

| what | number | command |
|---|---|---|
| frame determinism | **0** differing pixels of 147,456, bar 500, pins `7.5@7.5 · 7.5@7.5`, exit 0 | `node tools/detgate.mjs` |
| parse determinism | 0 px, 11 masks, sky hash 1464554359 four times | `node tools/detgate-parse.mjs` |
| detector determinism | 58/58 raw, 5/5 merged | `node tools/detgate-detect.mjs` |
| world determinism | all 20 fields SAME | `node tools/detgate-world.mjs` |
| render + clock determinism | byte-identical | `node tools/detgate-render.mjs`, `node tools/detgate-clock.mjs` |
| the parse is a real model | **11 of 19** Cityscapes classes, sky **27.4%** of the frame | `node --experimental-websocket tools/detgate-parse.mjs` |
| the frame is in the style | **8 of 8** style lines | `node tools/style-check.mjs <canvas.json>` |
| palette | MATCHES the accepted frame | `node tools/reference-palette-check.mjs` |
| pairing | PAIRED (IoU 0.66, dark 83%) | `node tools/pairing-check.mjs` |
| behaviour | **PASS 313  FAIL 7  of 320** checks, exit 1 | `node test.mjs` |
| baseline | **31 OK / 19 FAIL of 50** | `node tools/baseline-check.mjs` |
| criteria | **15 of 19** with the stored dump; 11 of 19 with no frame (four frame criteria cannot be judged) | `DUMP=/tmp/chain-page/canvas.json node tools/criteria-check.mjs` |

**What is broken — measured.**

1. **7 of 320 checks FAIL**, named by the suite itself [`node test.mjs`]:
   `wrecking everything ends the yard (score 3000)`, `depression: nearly colourless, darker, colder (sat 0.30 → 0.19, heat -10.3 → -1.5)`,
   `a thing on the new stretch can be picked and wrecked like any other (bicycle(not a target),…)`,
   `more street means the yard is not finished`, `a hit on the yard chips it (stone 1/3)`,
   `every module has its reason written down in docs/concept.md`, `every element the page names is used by the game (selfTest)`.
2. **I3 is NOT built.** The page's self-test panel draws 0 rows on load and 0 after the click. Reproduced this
   audit, verbatim: `NOT MET  I3  the box was emptied and #selfRun clicked, and no row came back: the button is not
   wired to the panel - it threw: ReferenceError: PX is not defined at runSelfTest
   (http://127.0.0.1:4312/game/src/main.js:224:77)`. `#selfTest` is named at `index.html:171` and by no line of
   `src/main.js`; `window.__err` is read at `:226` and never set.
3. **B4 and I1 are gated on a green suite.** Their witnesses are verified present and passing
   (`/support is gone FALLS/`, `/the lost cells become rubble/`, `/5 corners on a 12x10 window/`, `/9 shards/`), and
   the criteria are still NOT MET because the suite reports 7 failures.
4. **Reduction inverts its own rule.** On a 5×5 patch of 24 dark + 1 bright pixel, `src/pieces/downscale.js` selects
   **L=210**, the 1-pixel minority; the published rule selects the dark mass. Reproduced this audit:
   `node /tmp/audit-reduce-probe.mjs` → `ours picks L=210.0 -> BRIGHT (the 1-px minority)`. The existing piece gate
   (`node tools/piece-downscale-check.mjs`, 4/4 ok) does **not** cover this case: it tests a 1-px dark *line*, not an
   asymmetric patch.
5. **The outline is drawn on the sky's complement.** `src/vector.js:1257-1272` outlines pixels that **are sky** and
   writes the outline index **into sky pixels**; the declared rule (`src/criteria/OutlineRule.js:18-24`) is never
   consulted by the drawing code.
6. **The damage cascade is one column sweep.** `src/world.js:215-228` walks rows from the bottom once and never
   re-checks a neighbour, so an L-overhang whose column is removed stays floating (CONSTRUCTOR §9).
7. **The bay pitch is a scored candidate loop.** `src/vector.js:1503-1520` invents `cand*0.25` and `hits >= 2`; the
   file's own comment (1494-1502) records a wall read as 7 and then 14.
8. **The object cut is hand-rolled.** Three independent thresholds decide "is this real"
   (`src/detect.js:25` `scoreThreshold: 0.2, maxResults: 25`; `src/objects.js:22-23` `MIN_SCORE = 0.4`,
   `MIN_AREA = 0.0008`) plus a ring test, a 70th-percentile cut and a flood fill (`src/objects.js:65-175`).
9. **Palette provenance is typed, and the palette builder is dead.** `src/flat.js:66-94` declares 8 `(hue, sat)` pairs
   as if measured; `src/palette.js:83-115` (`buildPalette`, invented `Math.sqrt(box.length)` weighting at 93 and a
   backfill at 103) is dead on the photo path.
10. **R1 is NOT COMPARABLE.** Measured this audit: `NOT MET  R1  off on: distinct colours, flat share, stray share,
    largest colour` (4 named measures; RUNLOG records 4 of 5). `reference-check` has withheld entirely on the
    resampled-screenshot route; the on-disk creator frame is a lossy RGB decode (48 values, 5.349 bpp — 1-LSB
    variants of ~35 colours), which is why no palette-exact frame can reach 0 against it.
11. **Two owners are licence-blocked** (scene-parse weights; the Endesga palette dataset). §3 names a permissive
    replacement for the weights; the palette dataset is the one entry that stays blocked, and no contract in §2
    depends on it.

**How far from the concept, numbers only.** 15 of 19 criteria MET · 313 of 320 checks · 31 of 50 baseline rows ·
6 of 7 region matches · 8 of 8 style lines · 0 of 147,456 pixels unstable · 11 of 19 classes from the parse.

**The honest gate line.**

- **PASS:** preflight (17 parts) · imports (46 modules) · detgate 0 px · the five determinism sub-gates · style 8/8 ·
  palette MATCHES · pairing PAIRED · match 6/7 · 313/320 suite checks.
- **FAIL:** suite 7 checks · criteria 4 of 19 (B4, I1, I3, R1) · match 1 of 7 (midrise checkerboard) · baseline 19 of 50 ·
  concept 1 (largest colour below the sky 37% vs ≤32%).
- **BLOCKED:** B4 and I1 on a green suite · I3 on an artefact that is not built · R1 on a palette-exact accepted frame.

---

## 2. THE SKELETON

Eleven layers, in pipeline order. Each block is a **contract**, not a code excerpt: a snippet is evidence for the
contract and is quoted only where it proves a point. The font bucket is **not** a layer (Rule 2) — HUD glyphs are
filled in during ordinary development and carry no contract of their own.

**Matrix (owner and status at a glance):**

| # | layer | owner | licence | status | current code that must go |
|---|---|---|---|---|---|
| 1 | scene-parse | transformers.js + NVIDIA SegFormer-B0 | Apache-2.0 code / **NVIDIA non-commercial weights** | BLOCKED owner, replacement found | `src/scene-parse.js:21-57,60-67,80` |
| 2 | horizon | `Bakkopi/sky-region-detector` | **none declared** | BLOCKED method, replacement found | `src/scene-parse.js:109-116` |
| 3 | facade-geometry | numpy/scipy autocorrelation + projection-profile | BSD-3 / MIT | permissive | `src/vector.js:1503-1520` |
| 4 | reduction | PixelOE 1.0.0 | Apache-2.0 | permissive | `src/pieces/downscale.js:46-55,71-94` |
| 5 | palette | Pillow MEDIANCUT (index buffer) | MIT-CMU | permissive (owner), dataset blocked | `src/flat.js:66-94,569-575`; `src/palette.js:83-115` |
| 6 | objects | MediaPipe + OpenCV CCstats; **imgly AGPL** | Apache-2.0 / **AGPL-3.0** | BLOCKED mask→sprite, replacement found | `src/detect.js:25`; `src/objects.js:22-23,65-175` |
| 7 | outlines | sproutline (public domain) + OpenCV | public domain / Apache-2.0 | permissive | `src/vector.js:1257-1272` |
| 8 | style-register | `.gpl` format + PixelOE colour match | public format / Apache-2.0 | permissive (owner), dataset blocked | `src/flat.js:66-94`; `src/style/register.js:19-54` |
| 9 | damage-cascade | Luanti `falling.lua` | LGPL-2.1+ (rule, not code) | not blocked for a reimplementation | `src/world.js:215-228,231-244` |
| 10 | gates | pixelmatch / skimage | ISC / BSD-3 | permissive | `gates/external.sh:13-14` |
| 11 | determinism | ONNX Runtime + mulberry32 | MIT / public domain | permissive | the two missing gates (DETERMINISM §4) |

---

### 1. scene-parse

**CONTRACT.**
- **in:** one photograph as `HTMLCanvasElement` or `RawImage`, RGB, any size ≥ 64×64. Preconditions: the chosen
  checkpoint's own `preprocessor_config.json` is used verbatim (`image_mean`, `image_std`, `rescale_factor`,
  `resample`), and **no caller-side resize happens**; the caller passes the image, not a re-encoded copy.
- **out:** `{ masks: Record<label, Uint8Array(w*h)|0/1>, classes: number, input: [iw,ih] }` at the caller's target
  size, one binary mask per **present** label, class identity carried by the model's own `id2label`; `score === null`
  for the semantic subtask.
- **invariant:** the label map equals the model's `post_process_semantic_segmentation` argmax **pixel for pixel**
  (0 differing pixels); the key set is exactly the set of labels present; the parse is run once per build and never
  touches the network after weights load.

**OWNING PUBLISHED IMPLEMENTATION (blocked).** `huggingface/transformers.js` tag **3.0.2** @ `bd839b9849af`,
`src/processors.js` `post_process_semantic_segmentation` (161-213), **Apache-2.0**; the vendored model is
`vendor/seg/config.json` → `nvidia/segformer-b0-finetuned-cityscapes-1024-1024`, 19 labels. The **weights** are
`license:other` (HF API, verified 2026-10-17): NVIDIA Source Code License §3.3, *"non-commercially … research or
evaluation purposes only"*.

**PERMISSIVE REPLACEMENT (found).** `microsoft/beit-base-finetuned-ade-640-640` — HF API cardData
`"license":"apache-2.0"`, `architectures:["BeitForSemanticSegmentation"]`, `dataset:scene_parse_150` (ADE20K, 150
classes: wall, building, sky, windowpane, house, road, car, tree). Code path: transformers.js supports the
`BeitForSemanticSegmentation` architecture; **no ONNX conversion of it exists** — search
`https://huggingface.co/api/models?filter=transformers.js&search=beit&limit=20` returned 9 BEiT models, all
`image-classification`; the second permissive route is `open-mmlab/mmsegmentation` (LICENSE fetched: Apache-2.0) with
its documented ONNX export. Class-agnostic alternative when only silhouettes are needed:
`Xenova/slimsam-77-uniform` (`license:apache-2.0`, ONNX files present) prompted by the detector boxes.

**CURRENT CODE THAT MUST BE REPLACED.**
- `src/scene-parse.js:21-57` loads the non-commercial checkpoint id; the licence block is in the file the pipeline
  calls, not in a comment.
- `src/scene-parse.js:60-67, 80` resizes to 512 **and** passes a PNG data URL, so the processor resizes a second
  time — two bilinear passes where the published pipeline has one (CONSTRUCTOR §1).
- `src/scene-parse.js:84-106` reads `part.mask` correctly but never guards `part.score === null`, so a change of
  subtask would silently change the mask semantics.
- Note the catalogue drift: `data/modules.json` describes an **ADE20K 150-class** SegFormer; the vendored model is
  **Cityscapes 19-class**. Both are NVIDIA-licensed; only one of them is in the page.

**GATE THAT PROVES THE CONTRACT.**
`node --experimental-websocket tools/detgate-parse.mjs` → prints `<w>|<h>|<classes>|<maskDiff>|<horizonDiff>|<skyHashA>|<skyHashB>`,
expected **11 classes of 19, sky present, mask-argmax diff 0 px**, sky hash equal. After a checkpoint swap the
expected class count changes (19 → 150) and the gate **must print the model id it loaded**, so a stale baseline
cannot pass as a new one. The unfakeable half: rebuild the label map from our masks by argmax against `id2label` and
compare to the pipeline's own `segmentation.data` — expected 0 differing pixels.

**DEPENDENCIES.** None. Feeds horizon, facade-geometry, objects.

**RISK.** A checkpoint swap changes every downstream number (class ids, masks, horizon, object count) and
invalidates the whole measured vector; the ONNX export of BEiT is unpublished work (no repo found that ships it).

**EFFORT.** **L** — export + re-baseline every gate; **M** if mmseg's `tools/deploy.py` exports without surprises.

---

### 2. horizon

**CONTRACT.**
- **in:** `masks.sky` as `Uint8Array(w*h)` of 0/1 plus `w, h`. Preconditions: the sky is top-connected; at least one
  column carries sky; the mask comes from the parse, not from a brightness edge.
- **out:** `Int32Array(w)`, `horizon[x]` = row index of the **first non-sky row from the top**, per column;
  every column imputed (left neighbour first, then right), head and tail padded; no sentinel survives the call.
- **invariant:** `horizon[x]` equals the published array on a frame whose sky is one top-connected region
  (0 columns differ) and the FNV hash of the two arrays is equal; a column with no sky is clamped to `h`, never left
  at `-1`; the number of differing columns equals the number of columns containing an interior sky hole — a
  measurement, not a tolerance.

**OWNING PUBLISHED IMPLEMENTATION (blocked).** `Bakkopi/sky-region-detector` @ `43b952646d67`,
`SkyRegionDetector.py` `edgesToMask` (54-98). **Licence: none declared** → the method may be used, the file may not.

**PERMISSIVE REPLACEMENT (found, in two pieces).**
- *sky mask:* `xiongzhu666/Sky-Segmentation-and-Post-processing` — GitHub licence field `mit` (verified through
  `https://api.github.com/search/repositories?q=sky+segmentation+in:name,description`), 245 stars; its README states
  the model is U-2-Net (`xuebinqin/U-2-Net` LICENSE fetched: **Apache-2.0**), and it ships `mask_refine.cpp`
  (`probability_to_confidence`, a low/high-threshold confidence model). Its own README records the failure mode:
  *"in the scene of building, some detail of building will be considered as sky by mistake."*
- *the boundary:* OpenCV `HoughLinesP` (**Apache-2.0**) for the dominant near-horizontal line, or the per-column
  rule itself, which is a **method** (the paper behind the MIT repo, arXiv:2006.10172) and carries no licence.
- **Searches that found nothing better:** GitHub repo search for `sky segmentation`, `skyline`, `horizon detection`;
  web queries `skyline extraction horizon detection github MIT license python`,
  `sky region segmentation MIT license repository skyfinder horizon`. **No repository was found that both extracts a
  skyline and carries a licence** — the honest replacement is a permissive mask plus a permissive line primitive.

**CURRENT CODE THAT MUST BE REPLACED.** `src/scene-parse.js:109-116`: the inner loop starts at `h-1` and takes the
**lowest** sky row, so an interior sky hole (a torn wall) drags the horizon down in that column; there is no
"no sky at all" guard, so a photograph without sky yields `-1` everywhere and every `y < horizon[x]` consumer reads
`0 > -1` (CONSTRUCTOR §2).

**GATE THAT PROVES THE CONTRACT.** A python gate: `edgeInv = sky ? 0 : 1`, run the published `edgesToMask`, diff
`skylinePoints` against `horizon + 1`; print **columns differing** and the **FNV hash of both arrays**; expected
`0` and equal on a top-connected-sky frame.

**DEPENDENCIES.** Layer 1 (the sky mask). Feeds style-register (F4, dither band) and reduction (sky band).

**RISK.** The permissive path is a C++/OpenCV offline step or a JS port; in the browser the only licensed thing is
the rule, so the mask quality drops from a fine-tune to a U-2-Net matte known to leak building detail into sky.

**EFFORT.** **M** — a 10-line fix in the page plus a python gate; the replacement path is **L**.

---

### 3. facade-geometry

**CONTRACT.**
- **in:** the wall/building/window class masks + `w, h`; precondition: the wall mask is the one taken **before** the
  openings were removed from it.
- **out:** per facade plane `{ pitchX, pitchY, originX, originY }`, integers ≥ `MIN_PITCH = 5`; the pitch is the
  **fundamental of that wall's own 1-D column profile autocorrelation**; the origin is the first detected opening's
  centre, never 0.
- **invariant:** `pitch == peaks[0]` of `np.correlate(prof, prof, 'full')[len-1:]` with `find_peaks` at all
  defaults; if the top-3 lags are not integer multiples of one another the pass **must refuse to draw a grid**; `5`
  is the grid's own resolution limit (5×5→1 px), not a tuned floor.

**OWNING PUBLISHED IMPLEMENTATION (permissive).** `numpy.correlate` (`mode='full'`) + `scipy.signal.find_peaks`
(`scipy/signal/_peak_finding.py:729`), **BSD-3-Clause**; plus `projection-profile` (**MIT**) and `window-heatmaps`
(**MIT**). `facade-segformer-cmp` is MIT in its model card but starts from NVIDIA's non-commercial ADE20K checkpoint
— **blocked in effect**, and not needed: the two MIT modules plus the autocorrelation primitive cover the layer.

**CURRENT CODE THAT MUST BE REPLACED.** `src/vector.js:1503-1520` (`pitchOf`): a candidate loop from `MIN_PITCH` to
`median(gaps)` scoring `1/k` residues with `tolerance = max(1, cand*0.25)` and requiring `hits >= 2`, falling back to
`Math.round(base)`. Every constant except `MIN_PITCH` is invented; the comment at 1494-1502 records the 7→14
instability that the autocorrelation does not have (CONSTRUCTOR §3).

**GATE THAT PROVES THE CONTRACT.** A python gate printing the **top three autocorrelation lags** for one facade and
`pitchOf()`'s own answer: expected `lags 7, 14, 21` (integer multiples) and `pitchOf() == peaks[0]`; a non-multiple
top-3 must produce a refusal, not a grid.

**DEPENDENCIES.** Layer 1 (wall/window classes). Feeds reduction/grid, outlines, damage-cascade (cell size).

**RISK.** Per-wall pitch changes the window count on every facade; the origin is not decided by any source
(the constructor's open question), so it is recorded as an open question, not a constant.

**EFFORT.** **M** — 12 lines replaced, but every downstream count re-baselines.

---

### 4. reduction

**CONTRACT.**
- **in:** RGBA photograph at 5× the art grid; `block` = the grid's own 5 (5×5 source pixels → 1 game pixel).
  Precondition: work in CIELAB; the patch size comes from the grid, not from PixelOE's `target_size` default.
- **out:** RGBA at 288×512, one pixel per patch: **L** selected by the distribution's asymmetry, **a** and **b**
  replaced by the patch **medians**.
- **invariant:** **no threshold anywhere**; on a 25-pixel patch of 24 at L=10 and 1 at L=200 the selected L is 10 and
  the chroma source is the patch median; a flat block keeps the centre pixel.

**OWNING PUBLISHED IMPLEMENTATION (permissive).** PixelOE **1.0.0**, Apache-2.0,
`src/pixeloe/legacy/downscale/contrast_based.py` `find_pixel` (10-24) and `contrast_based_downscale` (27-56);
the JS structure is `Jannchie/PixelOE.js` `src/core/downscale.ts` `contrastDownscale`. `image2pixel-web` (custom
non-commercial) is **blocked** and is not needed: it was only ever a baseline.

**CURRENT CODE THAT MUST BE REPLACED.** `src/pieces/downscale.js:46-55`: `span > 24`, `* 1.35`, and a whole-RGB pick
of one pixel; `:71-94` (`expandContrast`) has its own invented `threshold = 40`. On the asymmetric patch this
**inverts** the rule — reproduced in this audit:

```
node /tmp/audit-reduce-probe.mjs
input: 24 px L~18.0, 1 px L~210.0
ours picks L=210.0 -> BRIGHT (the 1-px minority)
```

**GATE THAT PROVES THE CONTRACT.** `node /tmp/audit-reduce-probe.mjs` (a 25-pixel patch through the real
`downscaleContrast`) → expected `selectedL 10`, `chroma_source patch_median`. It must be **added to**
`tools/piece-downscale-check.mjs`, which today passes 4/4 on a 1-px dark *line* and therefore does not test this
case. Second, end-to-end: the pass must print `{dark, bright, mean}` counts and `dark` must be ≥ today's count.

**DEPENDENCIES.** The art grid (5×5) and nothing else; feeds palette and style-register.

**RISK.** Low to reason about, high to measure: this is the first pixel the eye sees, so every share line
(match, style, palette, pairing, concept) re-baselines.

**EFFORT.** **S** — the rule is 8 lines.

---

### 5. palette

**CONTRACT.**
- **in:** an RGB frame of any size; a table fixed **before** the frame (criterion F1: one palette for the whole
  frame). Precondition: the table is declared, not derived per frame.
- **out:** `{ idx: Uint8Array|Uint16Array(w*h) of palette indices, table: RGB[] }` — palette-exact **by
  construction** (an index buffer plus a table), not by inspection.
- **invariant:** every index `< table.length`; distinct colours ≤ `table.length`; Shannon entropy ≤ log₂(table.length)
  = **5.6439 bpp** for 50 entries (a hard bound, not a threshold).

**OWNING PUBLISHED IMPLEMENTATION (permissive).** Pillow **11.3.0**, **MIT-CMU**, `Image.quantize(method=MEDIANCUT)`
→ mode `P` + `getpalette()` — an index buffer. Verified in this audit:

```
python3 - <<'PY'
from PIL import Image
im = Image.new('RGB',(4,4)); px = im.load()
cols = [(190,74,47),(216,118,68),(234,212,170),(228,166,114)]
for y in range(4):
    for x in range(4): px[x,y] = cols[(x+y) % 4]
q = im.quantize(colors=4, method=Image.Quantize.MEDIANCUT)
idx = list(q.getdata())
print('mode', q.mode)
print('index buffer (first 16):', idx)
print('palette table (4 entries):', q.getpalette()[:12])
print('num distinct indices:', len(set(idx)))
PY
# → mode P
# → index buffer (first 16): [3, 2, 0, 1, 2, 0, 1, 3, 0, 1, 3, 2, 1, 3, 2, 0]
# → palette table (4 entries): [234, 212, 170, 228, 166, 114, 216, 118, 68, 190, 74, 47]
# → num distinct indices: 4
```

`libimagequant` **GPL-3.0-or-later is blocked** for linking (CLI gate only); permissive alternatives with index
output: Pillow (MIT-CMU, in-process), `image-q` 4.0.0 (**MIT**, RGBQuant/WuQuant + `NearestColor` ditherer),
npm `quantize` 1.0.2 (**MIT**, Leptonica median cut). Palette **data**: Lospec Endesga 32 has **no licence stated**
(§3, still blocked); the replacement is measurement — the accepted frame's own 48 colours — plus the MIT `cga16`
table as a licence-clean fixture.

**CURRENT CODE THAT MUST BE REPLACED.** `src/flat.js:569-575` (`PALETTE`, fixed 8×6+2) is the live route through
`paletteOf()`; `src/palette.js:83-115` (`buildPalette`, invented `Math.sqrt(box.length)` weighting at 93, invented
backfill at 103) is **dead on the photo path** and must be deleted or put behind an explicit flag — today it is the
file a reader assumes is in use (CONSTRUCTOR §5).

**GATE THAT PROVES THE CONTRACT.** On our rendered frame:
`python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open(f).convert('RGB')).reshape(-1,3); c,n=np.unique(a,axis=0,return_counts=True); p=n/n.sum(); print(len(c), -(p*np.log2(p)).sum())"`
→ expected **≤ 50** and **≤ 5.6439**. Reference canvas prints `48 5.349`; `v10a-art.png` prints `56573 12.859` —
which is how you know that file cannot be the oracle.

**DEPENDENCIES.** Reduction (layer 4) produces the pixels. Feeds outlines, style-register, damage-cascade (void).

**RISK.** The accepted frame on disk is not indexed, so palette-exactness can only be proven on our side; a wrong
bound bites silently at `nearest()` (`src/palette.js:108-115`, the `scorchMap` post-mortem at 117-129).

**EFFORT.** **S** to delete the dead builder and pin the index-buffer contract; **M** to make the table measured.

---

### 6. objects

**CONTRACT.**
- **in:** the photograph canvas + `detections[]` produced **at the model's own threshold**; precondition: the
  detector is called with the published defaults (`scoreThreshold` unset → model metadata; `maxResults` = −1).
- **out:** per object `{ box:[x,y,w,h], mask: Uint8Array (largest 8-connected component), label, score }`, where the
  mask is `connectedComponentsWithStats(classMask ∩ box, connectivity=8)` largest-by-`area`.
- **invariant:** our component's `area` and `[x,y,w,h]` equal OpenCV's **exactly**; `n_meta` and `n_0.2` are both
  printed beside the count, so any detection above the model's threshold is visibly ours.

**OWNING PUBLISHED IMPLEMENTATION.** MediaPipe ObjectDetector (**Apache-2.0**, vendored at
`vendor/mediapipe/vision_bundle.js`) + OpenCV `connectedComponentsWithStats` (**Apache-2.0**). The mask→sprite half
is **blocked**: `@imgly/background-removal` 1.7.0, **AGPL-3.0**.

**PERMISSIVE REPLACEMENT (found).** `Xenova/slimsam-77-uniform` — HF API `license:apache-2.0`, `library:transformers.js`,
`pipeline_tag: mask-generation`, ONNX files `onnx/vision_encoder_quantized.onnx` +
`onnx/prompt_encoder_mask_decoder_quantized.onnx` (the previously measured 13.8 MB quantized total is recorded in
`docs/archive/knowledge-base.md` §8); prompted by the detector box it yields the silhouette, which is then cut with
`connectedComponentsWithStats`. If a learned matte is genuinely needed, `danielgatis/rembg` (**MIT**, LICENSE.txt
fetched) on U-2-Net (**Apache-2.0**).

**CURRENT CODE THAT MUST BE REPLACED.** `src/detect.js:25` overrides both published defaults
(`scoreThreshold: 0.2, maxResults: 25`); `src/objects.js:22-23` adds `MIN_SCORE = 0.4` and `MIN_AREA = 0.0008`;
`src/objects.js:65-175` hand-rolls the connected-component step (perimeter ring 76-77, `Math.max(18*18, spread*1.3)`
at 97, rounded-box fallback 108-110, below-25% retry 118-131, flood fill with `MIN 12` at 138-163). The file's own
comment (line 80) records that the previous version produced *"every outline in the game was a rectangle"*.

**GATE THAT PROVES THE CONTRACT.** A page gate printing `n_meta` and `n_0.2` (expected `n_0.2 ≥ n_meta`) and, for one
car, `labels.max()` and the kept component's `area` and `[x,y,w,h]` from OpenCV — ours must equal it to the pixel.

**DEPENDENCIES.** Layer 1 (class masks) and layer 11 (a reproducible capture); feeds outlines and damage-cascade.

**RISK.** Replacing three thresholds changes the object count on every photograph; the AGPL module is the one
place where a licence decision was already taken in code, and it was taken wrong.

**EFFORT.** **M** — wire SlimSAM (or the same boxes to OpenCV) and re-baseline the counts.

---

### 7. outlines

**CONTRACT.**
- **in:** a per-thing mask for kinds in `OUTLINED_KINDS` (`car|truck|bus|van|building|house|tower|block`,
  `src/criteria/OutlineRule.js:18`), plus `idx` and the palette; precondition: windows are **never** outlined.
- **out:** mutated `idx` with the shared outline index on every **solid** pixel that has at least one **4-neighbour
  that is not solid**; post: `outline_px` reported, **0** outline pixels inside the sky mask.
- **invariant:** `outline_px` equals the independent numpy count exactly; the outline never consumes sky area;
  one colour, 1 px, no kernel.

**OWNING PUBLISHED IMPLEMENTATION (permissive).** `ands/sproutline` v0.10 @ `a7da8950e788`, **public domain** —
`s2o_thresholded_to_outlined` is literally "solid ∧ some 4-neighbour not solid"; and OpenCV
`MORPH_GRADIENT` (**Apache-2.0**) for the dilate−erode form. Two independent implementations agree, which satisfies
the mechanism rule's multi-source condition.

**CURRENT CODE THAT MUST BE REPLACED.** `src/vector.js:1257-1272`: the predicate is applied to the **complement**
(`if (!sky[p2]) continue;` skips non-sky pixels) and writes `idx[p2] = OUTS` **into a sky pixel**, consuming sky
area; `src/criteria/OutlineRule.js` declares the real rule and is never consulted by the drawing code. The
constructor's proof: the gate's sky-inside count equals `sky.__edge` today (CONSTRUCTOR §8).

**GATE THAT PROVES THE CONTRACT.** A python gate computing
`outline_px = |{(x,y): solid(x,y) ∧ ∃4-neighbour ¬solid}|` on the object mask, compared with our pass — expected
**equal**; and outline pixels inside the sky mask = **0**.

**DEPENDENCIES.** Layer 6 (per-object masks) and layer 5 (the outline index). Feeds damage-cascade (silhouette
follows the wreck, criterion D1).

**RISK.** Moving the outline from the sky side to the object side moves the sky's measured share (F4/S1) and every
silhouette; the `outline` cache must be versioned by `world.touch()` or wrecked shapes keep the old outline.

**EFFORT.** **S** — five lines, plus wiring the rule module.

---

### 8. style-register

**CONTRACT.**
- **in:** `idx` + table + horizon; precondition: ramps are **declared data** — an ordered list of named tones per hue
  family, monotone in luminance, in a text format a real editor reads.
- **out:** register-lifted `idx`: only within a ramp, `lift = index + 1`, with the number of lifted rungs coming from
  the measured ladder.
- **invariant:** exactly **8** hue clusters recovered from the accepted frame, each with **6 strictly increasing**
  luminances; `OUTLINE` and the void are the frame's own two darkest structural entries (`#090013` at 2.70% and
  `#04000a` at 2.18%).

**OWNING PUBLISHED IMPLEMENTATION (permissive).** The **GIMP palette format** (`.gpl`: first line `GIMP Palette`,
`R G B [A] <name>`, `#` comments, `Channels: RGBA` as an Aseprite extension) — a public text format, no code needed;
plus `pixeloe-color-match` **Apache-2.0** (LAB/wavelet matching) for the actual lift. Palette **data**: Endesga 32
via Lospec is **no licence stated** (§3, still blocked); replacement = the 8 ramps **measured** from
`reference/v10a-art-canvas.png`, with MIT `cga16` as the licence-clean fixture.

**CURRENT CODE THAT MUST BE REPLACED.** `src/flat.js:66-94`: `RAMPS` is 8 `{name, hue, sat}` records with typed
numbers whose comment claims they were measured — the measurement that would make them legitimate is exactly the gate
below; `src/style/register.js:19-54` lifts tones by `maxTone = 1`, an invented step count (the published equivalent
is "the next entry in the same ramp").

**GATE THAT PROVES THE CONTRACT.** A python gate that clusters the reference's 48 colours by hue, fits a 6-tone
ladder per cluster and prints, per ramp, `(hue, sat, 6 luminances)`; expected **8** clusters and **strict
monotonicity**; a cluster that fails monotonicity means the ladder is not a ramp and must not be added.

**DEPENDENCIES.** Layer 5 (the table) and the accepted-frame asset. Feeds reduction (sky band) and the damage
palette (`world.dent`).

**RISK.** Without a palette-exact accepted frame the recovered ramps are approximate; the 48 on-disk values are
1-LSB variants of ~35 colours.

**EFFORT.** **M** — a measurement plus a data change; the lift itself is already correct in structure.

---

### 9. damage-cascade

**CONTRACT.**
- **in:** a cell grid (`rows × cols`, `cw × ch`), the `gone` set and the palette/`idx`; precondition: the ground
  storey rests on the ground (`cy === rows-1` never falls).
- **out:** `{ taken: [{cx,cy,k,fell}], windows }` and rubble written into `idx`; every taken cell's pixels become
  rubble, and a storey that falls is re-readable as debris, not void.
- **invariant:** destroying the base of a 6-cell column yields **exactly 6** taken (the hit + 5 above); an
  L-overhang whose supporting column is removed falls **entirely** — the traversal re-checks each neighbour, so
  "things above self fall all at once" holds for a shape, not only for a column.

**OWNING PUBLISHED IMPLEMENTATION.** `minetest/minetest` @ `db44f2f58f68`, `builtin/game/falling.lua` 441-520,
**LGPL-2.1+**. The licence covers the **Lua file**; what this layer needs is the **rule** ("support = the cell below
is not walkable; walk down-first, up last") plus the ordered neighbour table, which is behaviour, not code. A
reimplementation is therefore not blocked — but no permissive published implementation of falling-node support
exists, so the LGPL file remains the only source and no line of it may be copied verbatim.

**CURRENT CODE THAT MUST BE REPLACED.** `src/world.js:215-228`: one descending row sweep per column, no recursion
into neighbours, so (a) only a column collapses, (b) a cell whose only support was lateral stays floating;
`:231-244` writes rubble for every taken cell, where the source removes the node and lets it exist as an entity.

**GATE THAT PROVES THE CONTRACT.** A node gate on a synthetic grid: a 6-cell column with its base removed →
`taken.length === 6`; then a 3×1 overhang whose column is removed → minetest's walk takes the whole row, ours takes
only the column and prints the **names of the cells left floating**.

**DEPENDENCIES.** Layers 3/6 (the cells) and 5 (void/rubble indices). Feeds nothing downstream; it is a leaf.

**RISK.** The single sweep is the only thing keeping whole-column collapse correct today; a naive recursive rewrite
can double-count or loop.

**EFFORT.** **S** — ~30 lines, one gate.

---

### 10. gates

**CONTRACT.**
- **in:** two frames of identical size, or one frame plus the reference; preconditions **printed with the verdict**
  (size, distinct colours, entropy, the reference's provenance); a failed premise **withholds** the verdict
  (exit 2) instead of defaulting to success.
- **out:** `DIFFERING PIXELS: n of N = p%` + exit 0/1/2; SSIM to 4 dp; `shannon_entropy(base=2)` in bpp.
- **invariant:** two runs of the same build → 0 differing pixels; a size mismatch → exit 2 and no verdict; no
  self-authored comparator while a published one exists; every share predicate reads **our** frame, not the
  reference.

**OWNING PUBLISHED IMPLEMENTATION (permissive).** `mapbox/pixelmatch` 6.0.0 **ISC** (`threshold 0.1`,
`maxDelta = 35215·t²`), `pngjs` 7.0.0 **MIT**, `scikit-image` v0.25.2 **BSD-3**
(`structural_similarity`: 7×7 uniform window, K1 0.01, K2 0.03; `shannon_entropy(base=2)`), `imagehash` **BSD-2**.
Note: DECISIONS D6 still says pixelmatch is MIT — the RUNLOG correction (T+40.2) is right: **ISC**.

**CURRENT CODE THAT MUST BE REPLACED.** `gates/frame-diff.mjs:18` is the correct call; the defects are the
reference (`gates/external.sh:7` was defaulted to the resampled screenshot until T+50 — now the canvas) and the
in-line home-made "flat" measure at `gates/external.sh:13-14`, which is un-published and computed **on the
reference**. Every remaining share predicate (dark / blue / white) is still self-authored.

**GATE THAT PROVES THE CONTRACT.** `sh gates/external.sh <canvas.json>` → same frame **0.00%, exit 0**; a size
mismatch → **exit 2, verdict withheld**; and the entropy one-liner on our frame **≤ 5.6439 bpp**.

**DEPENDENCIES.** None — these must exist before anything else is measurable.

**RISK.** A self-authored bar can be tuned to agree with the author; every bar still authored here is a place where
the artefact and the bar can disagree without anyone noticing.

**EFFORT.** **S**.

---

### 11. determinism

**CONTRACT.**
- **in:** photograph + seed + code (+ the `?clock=<s>` pin for the frame gate). Preconditions: no network-fed
  content drawn into the frame, no wall clock, no `Math.random` **reached**, no unordered iteration deciding pixel
  order.
- **out:** a byte-identical 288×512 frame; the dump carries the seed and the pin it used; the analyzer produces
  identical numbers from the same dump.
- **invariant:** two builds → **0** differing pixels; a different seed → **> 0** (a seed that changes nothing is not
  a seed); with the pin absent from either captured page the gate **withholds** and exits 2.

**OWNING PUBLISHED IMPLEMENTATION (permissive).** ONNX Runtime **MIT** (documented session options
`intraOpNumThreads=1`, `interOpNumThreads=1`, `ORT_SEQUENTIAL`, fixed `graphOptimizationLevel` — measured
unnecessary here), mulberry32 **public domain** (already vendored, `src/rng.js`), splitmix64/xoshiro256** **CC0**
(Vigna, TOMS 2021), PCG **Apache-2.0** (O'Neill 2014).

**CURRENT CODE (nothing to replace in the pass; two gates to add).** `src/main.js:73` `clockPin` read from the query string; the pin covers `dt` (`:1121`) and
`fx.clock` (`:1150`) and the simulate block. Live reading: **detgate 0 px**, pins `7.5@7.5 · 7.5@7.5`.
The six `rnd = Math.random` defaults remain **declared but unreached** (`src/weather.js:77`, `src/world.js:144`,
`src/world.js:196`, `src/world.js:388`, `src/disaster.js:90`, `src/lore.js:39`). `docs/DETERMINISM.md §4` still lists
**G-DET-ANALYZE** and **G-DET-SEED** as "to add" — the contract is not yet fully owned by gates.

**GATE THAT PROVES THE CONTRACT.** `node tools/detgate.mjs` → `DIFFERING PIXELS: 0 of 147456 = 0.00%`,
`G-DET PASS`, exit 0. Plus the two missing gates: seed (0 px same seed, > 0 different seed) and analyze
(same dump twice → identical bytes).

**DEPENDENCIES.** Nothing. **Everything else depends on it**: without it no other number is evidence.

**RISK.** The frame gate is deterministic, but a gate wanting the game **playing** reproducibly still needs the
seeded `rnd` at the call site (the product claim RUNLOG T+41 leaves open).

**EFFORT.** **S** for the two missing gates; the frame gate is already done.

---

## 3. LICENCE REPLACEMENT TABLE

Worked through per Rule 1. Every external URL below was fetched during this audit, or is quoted from the evidence base
with that file named; the licence is quoted from the source, not from memory. "Blocked" means the module cannot be
shipped or linked as it stands.

| # | blocked module | why blocked | permissive equivalent found | evidence (URL / file / snippet) | what changes in our integration |
|---|---|---|---|---|---|
| 1 | `nvidia/segformer-b0-finetuned-ade-512-512` (and the vendored cityscapes sibling) | weights `license:other` = NVIDIA Source Code License §3.3, non-commercial | **`microsoft/beit-base-finetuned-ade-640-640`**, apache-2.0, 150 ADE20K classes | `https://huggingface.co/api/models/nvidia/segformer-b0-finetuned-ade-512-512` → `"tags":[…"license:other"]`; `https://huggingface.co/api/models/microsoft/beit-base-finetuned-ade-640-640` → `"license":"apache-2.0"`, `"architectures":["BeitForSemanticSegmentation"]` | checkpoint id + `vendor/seg/*` configs; preprocess 512→640; an ONNX/vendor export step (no transformers.js conversion exists); re-baseline the 11-of-19 class gate |
| 2 | `facade-segformer-cmp` | MIT model card but fine-tuned from NVIDIA's non-commercial ADE20K base | **`window-heatmaps` (MIT) + `projection-profile` (MIT) + numpy/scipy autocorrelation (BSD-3)** | `data/modules.json` entry's own caveat; `raw.githubusercontent.com/open-mmlab/mmsegmentation/main/LICENSE` → Apache-2.0 for the alternative route | no facade model is needed at all; pitch comes from the wall's own profile |
| 3 | `skyline-oneformer` | GPL-3.0 + PyTorch | **sky mask: `xiongzhu666/Sky-Segmentation-and-Post-processing` (MIT)** + **`cv2.HoughLinesP` (Apache-2.0)** for the line | GitHub search API `q=sky+segmentation…` → `"license":{"key":"mit"…}`; `…/README.md` (states the model is U-2-Net; U-2-Net's LICENSE is Apache-2.0) and `…/mask_refine.cpp` (`probability_to_confidence`) | the horizon becomes sky-mask + per-column rule + optional Hough line; a new python step or a JS port |
| 4 | `Bakkopi/sky-region-detector` | **no licence declared** | same as #3 | `data/modules.json` / CONSTRUCTOR §2 record "none declared"; LICENSE probes `…/sky-region-detection/master/LICENSE` → 404 | method only (per-column first non-sky row); no line of it may be copied |
| 5 | `libimagequant` 4.4.1 | GPL-3.0-or-later (COPYRIGHT) | **Pillow `quantize(method=MEDIANCUT)` → mode `P`** (index buffer + table), MIT-CMU; `image-q` 4.0.0 (MIT), npm `quantize` 1.0.2 (MIT) | verified locally: `q.mode == 'P'`, `list(q.getdata())` = indices, `q.getpalette()` = table; `https://registry.npmjs.org/quantize` → `"license":{"type":"MIT"}`; `https://registry.npmjs.org/image-q` → `"license":"MIT"` | drop the external `liq` step from the palette path; the index-buffer contract is already what `src/flat.js` does |
| 6 | `@imgly/background-removal` 1.7.0 | **AGPL-3.0** (network copyleft) | **`Xenova/slimsam-77-uniform`** apache-2.0 ONNX (box-prompted mask) + **OpenCV `connectedComponentsWithStats`** (Apache-2.0); `rembg` MIT + U-2-Net Apache-2.0 if a matte is needed | `https://huggingface.co/api/models/Xenova/slimsam-77-uniform` → `"license":"apache-2.0"`, `onnx/vision_encoder_quantized.onnx`, `onnx/prompt_encoder_mask_decoder_quantized.onnx`; `https://raw.githubusercontent.com/xuebinqin/U-2-Net/master/LICENSE` → Apache-2.0; `…/danielgatis/rembg/main/LICENSE.txt` → MIT | replace the cut-out with box→mask→largest component; the sprite's alpha comes from the component label image |
| 7 | `image2pixel-web` | custom licence: personal/educational/non-commercial only | **PixelOE 1.0.0 (Apache-2.0)** — and the JS port `Jannchie/PixelOE.js`, whose README says *"This project follows the same license as the original PixelOE implementation"* (no LICENSE file: `…/PixelOE.js/main/LICENSE` → 404) | `pypi.org/project/pixeloe/1.0.0/` + `src/pixeloe/legacy/downscale/contrast_based.py` (quoted in CONSTRUCTOR §4); README fetch above | it was only a baseline; the reduction contract is PixelOE's `find_pixel`, so nothing is lost |
| 8 | Lospec **Endesga 32** palette data | **no licence stated** on the page or the JSON endpoint | **measured ramps from the accepted frame** (`reference/v10a-art-canvas.png`, 48 colours) + MIT `cga16` as a licence-clean fixture | `data/modules.json` entry + CONSTRUCTOR §7; the measurement is the §8 gate | the table becomes a measurement, not a dataset; **this entry stays blocked if a third-party 32-colour dataset is required** |
| — | `luanti-falling` (LGPL-2.1+) | not in the owner's blocked classes | no permissive published equivalent exists; the **rule** is reimplemented, the **file** is not copied | `builtin/game/falling.lua` 441-520 | record as "rule taken, code not taken"; no licence obligation attaches to the rule |

**Count: 7 permissive replacements found, 1 still blocked** (the Lospec Endesga 32 dataset — and it is not
structural: no contract in §2 depends on it). `luanti-falling` is LGPL-2.1+, not one of the blocked licence classes,
and is resolved by reimplementation rather than by a replacement module.

**Searches actually run (so a later session can repeat or extend them):**
- HuggingFace hub API by licence: `?filter=license:apache-2.0&search=segformer` (20 results: sidewalk finetunes),
  `?filter=license:apache-2.0&search=ade20k` (27 results, incl. mmsegmentation-format `aadex/upernet-*`),
  `?filter=transformers.js&search=segmentation` (4 results: audio only), `?filter=transformers.js&search=beit`
  (9 results: image-classification only), `?search=ade20k%20onnx` (3 results).
- HuggingFace model cards by id: `nvidia/segformer-…` (`other`), `microsoft/beit-base-finetuned-ade-640-640`
  (`apache-2.0`), `Xenova/segformer-…` (no licence tag at all), `Xenova/slimsam-77-uniform` (`apache-2.0`),
  `facebook/sam-vit-base` (`apache-2.0`), `onnx-community/depth-anything-v2-small` (`apache-2.0`),
  `facebook/maskformer-resnet50-ade20k-full` (no licence tag).
- GitHub repository search: `sky segmentation in:name,description` (190 hits; only `xiongzhu666/…` and an unrelated
  satellite repo carry a licence; the horizon repos are unlicensed or licence-null).
- Licences fetched raw: `open-mmlab/mmsegmentation` (Apache-2.0), `xuebinqin/U-2-Net` (Apache-2.0),
  `danielgatis/rembg` (MIT), `Jannchie/PixelOE.js` (no LICENSE file).
- Registries: npm `quantize` (MIT), npm `image-q` (MIT, 4.0.0).
- Web queries: `skyline extraction horizon detection github MIT license python`,
  `sky region segmentation MIT license repository skyfinder horizon`, `CC0 pixel art palette collection github`,
  `open source pixel art palette MIT license named ramps gpl` — **no CC0/MIT named-ramp palette dataset** was found
  that replaces Endesga 32 one-for-one.

---

## 4. THE ORDERED STEPS TO FINALISATION

Ordered by dependency, not preference: determinism and the gates first, because every later step's claim is
unmeasurable without them. Each step is **one change**. "Acceptance" means: the named gate turns green and **no other
line in the measured vector (§6) regresses**; if a line does regress, the step is reverted and recorded, as the loop's
iteration 2 and 9-10 did.

**Step 1 — determinism — record the frame gate, no code change.**
Gate: `node tools/detgate.mjs` → `DIFFERING PIXELS: 0 of 147456 = 0.00%`, `G-DET PASS`, exit 0.
Acceptance: run twice; both 0 px. Depends on: nothing. Status: **already green** (measured this audit); this step
exists so every later step starts from a known-good frame.

**Step 2 — determinism — add G-DET-SEED.**
Gate: a new `node tools/detgate-seed.mjs` → prints `same seed: 0 px` and `different seed: > 0 px`.
Acceptance: both lines, and the whole-page detgate stays 0 px. Depends on: Step 1. Effort S.

**Step 3 — determinism — add G-DET-ANALYZE.**
Gate: `node tools/detgate-analyze.mjs` → `identical bytes` on the same dump, twice.
Acceptance: no share line moves. Depends on: Step 1. Effort S.
With Steps 1-3, `docs/DETERMINISM.md §4` has no "to add" gate left.

**Step 4 — gates — replace the home-made flat measure with `shannon_entropy` on both frames.**
Change: `gates/external.sh:13-14` calls `skimage.measure.shannon_entropy(img, base=2)` on our frame and on the
reference, and prints `2**H` beside "distinct colours".
Gate: `sh gates/external.sh <canvas.json>` → prints ours and the reference's `(distinct, entropy)`; ours **≤ 50 /
≤ 5.6439**, reference `48 / 5.349`. Acceptance: the same-frame case still 0 px, exit 0; size mismatch still exit 2.
Depends on: nothing. Effort S. (This is the step that makes every share number interpretable.)

**Step 5 — gates — make the share predicates read our frame.**
Change: the dark/blue/white predicates in `gates/external.sh` take their pixels from the canvas dump, not from the
reference. Gate: `sh gates/external.sh <canvas.json>` prints a share per predicate with its band.
Acceptance: no verdict is printed when the band is empty. Depends on: Step 4.

**Step 6 — gates (the page instrument) — fix I3's artefact: `PX` and the `#selfTest` wiring.**
Change: declare/replace `PX` at `src/main.js:224` with the module's own frame scale, and make `#selfTest` referenced
by `main.js` (today `index.html:171` names it and no line of `main.js` does).
Gate: the page step — `BASE='http://127.0.0.1:4312/game/index.html?clean=1' node --experimental-websocket tools/photo-shot.mjs /tmp/audit-i3 photos-test/v10a.jpg` →
`selftest.json` has **rows > 0 at load** and **rows > 0 after the click**, no throw; then
`DUMP=/tmp/audit-i3/canvas.json node tools/criteria-check.mjs` → **I3 MET**.
Acceptance: suite FAIL count drops by exactly 1 (the `selfTest` row) and nothing else changes.
Depends on: Steps 1-5 (a page gate needs a deterministic frame). Status: **not blocked**; Effort S.

**Step 7 — style-register — close suite FAIL "depression: nearly colourless, darker, colder".**
Change: the depression pass's saturation path, re-derived from the measured register (sat 0.30 → 0.19 against a bar
of 0.165 today). Gate: `node test.mjs` → that check passes. Acceptance: exactly one fewer FAIL, and
`node tools/style-check.mjs` stays 8/8. Depends on: Step 6's page determinism. Effort S.

**Step 8 — damage-cascade (environment hit) — close suite FAIL "a hit on the yard chips it" (scored, not painted).**
Change: paint the chip at the hit point (`kind=chip broke=false points=8 ENV_HIT_POINTS=8`, pixel `moved=false`
recorded at T+52). Gate: `node test.mjs` → the check passes. Acceptance: one fewer FAIL, no outline line moves.
Depends on: the palette index contract (layer 5). Effort S.

**Step 9 — objects/street — close suite FAIL "a thing on the new stretch can be picked and wrecked like any other".**
Change: the new stretch must carry at least one kind `mayBeDestroyed` accepts (it carries `bicycle,bicycle,chair,bicycle`
today). Gate: `node test.mjs` → the check passes and prints the kind it wrecked. Acceptance: one fewer FAIL, no
object count line moves. Depends on: Step 6. Effort S.

**Step 10 — docs — close suite FAIL "every module has its reason written down in docs/concept.md".**
Change: add the missing reasons (`album.js audio.js decal.js detect…`). Gate: `node test.mjs` → the check passes.
Acceptance: one fewer FAIL. Depends on: nothing. Effort S.

**Step 11 — product decision — close suite FAILs "wrecking everything ends the yard" and "more street means the yard
is not finished". BOTH BLOCKED on the parked win-condition/HUD question.**
The cause is measured: `src/world.js:463/:518` count **every** region, so a bench/bicycle can never be broken, and
the HUD's «осталось» is `src/main.js:246`. Evidence for the decision: sign-off B (RUNLOG T+42) parked the
win-condition/counter semantics; the suite cannot go green until the counting rule is decided. **No code change may
be made here before that decision.**

**Step 12 — criteria — re-run B4 and I1 with a green suite (no change).**
Gate: `DUMP=<dir>/canvas.json node tools/criteria-check.mjs` → **B4 MET** and **I1 MET**, 17 of 19.
Acceptance: the two witnesses still print exactly once (`/support is gone FALLS/`,
`/the lost cells become rubble/`, `/5 corners on a 12x10 window/`, `/9 shards/`). Depends on: Steps 6-11.

**Step 13 — reduction — replace `find_pixel` with the published rule (L only; a/b = patch medians).**
Gate: `node /tmp/audit-reduce-probe.mjs` → `selectedL 10`, `chroma_source patch_median`; then the same case added to
`tools/piece-downscale-check.mjs` (today 4/4, does not cover it).
Acceptance: the patch case passes; `node test.mjs` FAIL count does not rise; every share line is re-baselined in a
new RUNLOG line (expected: several move, which is why this step comes after the gates are trustworthy).
Depends on: Steps 1-5. Effort S.

**Step 14 — outlines — move the predicate from the sky complement to the object mask.**
Gate: python `outline_px` both ways → **equal**, and outline pixels **inside** the sky mask = **0**.
Acceptance: `node test.mjs` and `node tools/style-check.mjs` do not regress; the sky share is re-recorded.
Depends on: Step 13 (the mask must be the object's, not the sky's). Effort S.

**Step 15 — damage-cascade — replace the single sweep with the neighbour re-check (down first, up last).**
Gate: synthetic grid → column 6/6 taken; L-overhang → the whole row falls and **no cell is left floating**.
Acceptance: the column case stays 6; `node test.mjs` damage checks unchanged. Depends on: nothing structural. Effort S.

**Step 16 — horizon — take the first non-sky row from the top, clamp no-sky columns to `h`.**
Gate: python diff of `skylinePoints` vs `horizon+1` → **0 columns differ**, FNV equal. Acceptance: the sky share and
`S1`/`F4` lines do not regress. Depends on: layer 1's sky mask (today's model, or the replacement). Effort M.

**Step 17 — facade-geometry — replace `pitchOf` with the autocorrelogram's first peak.**
Gate: python top-3 lags → integer multiples (e.g. 7/14/21), `pitchOf() == peaks[0]`; a non-multiple must refuse a
grid. Acceptance: match-check 6/7 does not fall; the window count is re-recorded. Depends on: Step 16 (walls) and
layer 1. Effort M.

**Step 18 — palette — delete the dead builder and pin the index-buffer contract.**
Change: `src/palette.js:83-115` removed or flagged; `nearest()` stays the only place a colour becomes an index.
Gate: the entropy one-liner → **≤ 50 / ≤ 5.6439**; `node tools/reference-palette-check.mjs` → MATCHES.
Acceptance: nothing else changes (this is a deletion). Depends on: Step 4. Effort S.

**Step 19 — style-register — measure the 8 ramps from the accepted frame.**
Gate: python hue-cluster gate → **8 ramps, 6 strictly increasing luminances each**; the printed `(hue, sat)` pairs
replace the typed ones. Acceptance: `node tools/style-check.mjs` stays 8/8 and `reference-palette-check` MATCHES.
Depends on: Step 18 (a stable table). Effort M.

**Step 20 — objects — restore the published detector defaults and cut with OpenCV.**
Change: `src/detect.js:25` unset `scoreThreshold`/`maxResults`; `src/objects.js` uses
`connectedComponentsWithStats(connectivity=8)` and drops `MIN_SCORE`/`MIN_AREA`/the ring test.
Gate: page gate printing `n_meta`, `n_0.2` and the component equality (`area`, `[x,y,w,h]`) → exact match.
Acceptance: the suite's object checks and match-check's car line do not regress. Depends on: Step 1 (deterministic
capture). Effort M.

**Step 21 — scene-parse — swap the non-commercial checkpoint for the apache-2.0 one.**
Change: `src/scene-parse.js:21-57` checkpoint id + `vendor/seg/*` → BEiT ADE20K; export ONNX; drop the second resize
at `:60-67,80`; guard `score === null`.
Gate: `node --experimental-websocket tools/detgate-parse.mjs` → prints the model id, **150** classes of 150 labels,
mask-argmax diff 0 px; then the whole chain.
Acceptance: every gate re-baselined and recorded in one RUNLOG line; no licence-blocked weight remains in the page.
Depends on: Steps 13-20 (do not swap the model while the layers it feeds are still being fixed). Effort L.

**Step 22 — R1 — compare against a palette-exact accepted frame. BLOCKED on an asset.**
The creator's frame on disk is a lossy RGB decode (48 values / 5.349 bpp = 1-LSB noise around ~35 colours), so
`tools/reference-check.mjs` correctly withholds. Gate: `node tools/reference-check.mjs <ours> <palette-exact-ref.png>`
→ a verdict (5 measures), not "withheld". Evidence that would unblock: an accepted frame exported as an indexed
canvas (one table + indices), or permission to treat the snapped 50-entry version as the oracle.

**Step count: 22.** Blocked: **Step 11** (product decision: win-condition/HUD counting) and **Step 22** (asset:
a palette-exact accepted frame). Steps 12 depends on 6-11; Step 21 is the only L.

**The first three, with their gates:**

1. **Step 1 — `node tools/detgate.mjs` → `DIFFERING PIXELS: 0 of 147456 = 0.00%`, `G-DET PASS`, exit 0.**
2. **Step 2 — `node tools/detgate-seed.mjs` → `same seed: 0 px` / `different seed: > 0 px`.**
3. **Step 3 — `node tools/detgate-analyze.mjs` → `identical bytes` on the same dump, twice.**

Why these three: at 313/320 and 15/19 every other measurement is made against a frame whose reproducibility is the
only reason any number in this report means anything; the two missing gates are the two lines
`docs/DETERMINISM.md §4` still lists as "to add", so closing them makes determinism the first layer with no
un-owned contract.

---

## 5. WHAT THE REPORT CANNOT DECIDE

**O1 — what identifies a CHECKERED facade.** `docs/DECISIONS.md` O1: luminance populations were tried and rejected
by measurement (match-check 6/7 → 4/7, style 8/8 → 5/8, external 71.91% → 73.67%, RUNLOG "it 9-10"); the current
hypothesis is a **spatial alternation** measure. What would settle it: a published facade-classification rule that
defines alternation (none sourced), or a measured alternation statistic on the reference's mid-rise that separates it
from the tower (share of consecutive bays that flip sides of the facade median). Until then the mid-rise white share
stays at **5% against a bar of ≥8%** (T+52 recorded 5% → 4% between two unpinned captures: the number
moves, the bar does not).

**O2 — the ground's tonal register.** `docs/DECISIONS.md` O2: the accepted frame's road is **46.6% dark** while the
style's register requires a lighter grey; the current setting is rung 2 of 3, recorded in `src/vector.js` with the
four measured configurations. What would settle it: the reference's own road histogram measured at palette-exactness
(after the reference is snapped to one table), because the lossy frame's road share is diluted by 1-LSB variants.

**The win-condition semantics (parked, sign-off B).** `src/world.js:463/:518` count every region, so `world.done`
cannot be reached while a bench or bicycle exists; the HUD's «осталось» is `src/main.js:246`. What would settle it:
a product decision naming what "finished" counts — and it is the only thing gating the last two destructive suite
checks (Step 11). No measurement can decide a definition of done.

**The creator's "10 checks" list.** `docs/CRITERIA.md:47` (I3) quotes the requirement — *"the 10 checks … run
automatically every time the page loads, and the results are shown on the page"* — but **no such list exists in the
repo** (RUNLOG T+26 Q7), and the panel draws 0 rows today because `PX` is undefined at `src/main.js:224`. What would
settle it: the creator's own ten lines, or the panel's rows once Step 6 runs — a page run with `selftest.json`
beside the canvas dump is the only evidence that can name them.

**Also undecided, and recorded rather than defaulted:** the grid **origin** (CONSTRUCTOR §3 — the honest origin is
the first detected opening's centre, not 0) and whether a sprite is an alpha cut-out or palette-snapped indices in a
rectangular cell (CONSTRUCTOR §6 — our renderer draws indices, so the second, which is a decision to state).

---

## 6. APPENDIX

### A. The measured vector at report time

Every row names the command. MEASURED = run during this audit; RECORDED = produced by RUNLOG/Q9.2 with the command
shown; the date is the same machine and the same tree (`HEAD f9ab99c`, working tree clean).

| # | line | command | value |
|---|---|---|---|
| 1 | preflight | `node tools/preflight.mjs` | `PREFLIGHT OK — 17 parts present` |
| 2 | imports | `node tools/undefined-check.mjs` | `every import in 46 modules names an export that exists` |
| 3 | suite | `node test.mjs` | `PASS 313   FAIL 7   of 320 checks`, exit 1 |
| 4 | criteria (no frame) | `node tools/criteria-check.mjs` | `11 of 19 criteria MET`, blocked F1 F3 F4 P1 B4 I1 I3 R1 (the four frame criteria cannot be judged without a dump) |
| 5 | criteria (with dump) | `DUMP=/tmp/chain-page/canvas.json node tools/criteria-check.mjs` | `15 of 19 criteria MET`, blocked B4 I1 I3 R1 |
| 6 | determinism, whole page | `node tools/detgate.mjs` | `0 of 147456 = 0.00%`, pins `7.5@7.5 · 7.5@7.5`, exit 0 |
| 7 | determinism, parse | `node tools/detgate-parse.mjs` | 0 px, 11 masks, sky hash 1464554359 ×4 (RECORDED) |
| 8 | determinism, detector | `node tools/detgate-detect.mjs` | 58/58 raw, 5/5 merged (RECORDED) |
| 9 | determinism, world | `node tools/detgate-world.mjs` | 20/20 fields SAME (RECORDED) |
| 10 | determinism, render + clock | `node tools/detgate-render.mjs`, `node tools/detgate-clock.mjs` | byte-identical (RECORDED) |
| 11 | style | `node tools/style-check.mjs <canvas.json>` | 8/8 IN THE STYLE (RECORDED) |
| 12 | palette vs reference | `node tools/reference-palette-check.mjs` | MATCHES (RECORDED) |
| 13 | pairing | `node tools/pairing-check.mjs` | PAIRED, IoU 0.66, dark 83% (RECORDED) |
| 14 | region match | `node tools/match-check.mjs <canvas.json>` | 6 of 7; midrise white 5% (4% in the second T+52 capture) vs ≥8% (RECORDED) |
| 15 | baseline | `node tools/baseline-check.mjs` | 31 OK / 19 FAIL of 50 (RECORDED) |
| 16 | concept | `node tools/concept-check.mjs <canvas.json>` | 7 OK 1 FAIL (largest colour below sky 37% vs ≤32%) (RECORDED) |
| 17 | chain | `node tools/chain.mjs` | stops at `1 CRITERIA`, 6 PAGE `left 38, console clean` (RECORDED) |
| 18 | entropy / distinct, reference | `python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open('reference/v10a-art-canvas.png').convert('RGB')).reshape(-1,3); c,n=np.unique(a,axis=0,return_counts=True); p=n/n.sum(); print(len(c), -(p*np.log2(p)).sum())"` | `48 5.349` |
| 19 | entropy / distinct, screenshot | same command on `reference/v10a-art.png` | `56573 12.859` |
| 20 | palette bound | `log2(50)` | `5.6439` bpp |
| 21 | reduction defect | `node /tmp/audit-reduce-probe.mjs` | `ours picks L=210.0 -> BRIGHT (the 1-px minority)` |
| 22 | Pillow index buffer | the snippet in §2.5 | `mode P`, indices `[3,2,0,1,…]`, 4 distinct, table printed |
| 23 | piece gate | `node tools/piece-downscale-check.mjs` | 4/4 ok — and it does **not** cover row 21 |

### B. Retracted claims — do not resurrect these

From RUNLOG `[T+40]` (the independent audit `460ee509`), each retracted as false-as-written:

1. **"3-px shift 30.95%"** — arithmetically impossible: 3 of 288 px is 1.04% of a 288×512 frame. RETRACTED. The
   re-runnable truth: `gates/frame-diff.mjs` exits 0 on identical frames and exits 2 with the verdict withheld on a
   size mismatch.
2. **"pixelmatch 6.0.0 is MIT"** — it is **ISC** (installed package metadata + LICENSE, Mapbox); pngjs is MIT.
   `docs/DECISIONS.md` D6 still carries the wrong word.
3. **"`node tools/detgate.mjs` does not run from the repo root"** — it **does**; the working form is the root one.
   The original sentence inverted the cause: pixelmatch/pngjs resolve from `gates/frame-diff.mjs`'s own location.
   (RUNLOG `[T+52] CORRECTION of [T+40](3)`; re-confirmed this audit, exit 0.)
4. **LOOP.md §9's citations `:1414/:1480/:1643/:1957`** belong to `src/vector.js` (stylise.js is 170 lines), and
   "src/scene.js renderScene" is `src/vector.js:2154`.
5. **"rows y=2..23, 172-255 differing px per row"**, **"worst rows y=221..228 at 34 px each"**, and the pixel counts
   **3237 / 2063 / 2846** with the cell coordinates **(2,26)…** — the dumps were overwritten; superseded. The stored
   pair at the time of retraction: 1547 exact / 1584 judged, cells (12,39)-(12,41) and (22,47)-(22,49).
   `docs/DETERMINISM.md §6` says the same: **do not quote 3237/2063/2846.**
6. **R1's cause is not "4 of 5 off"** — with the predicate's own default reference it is **5 of 5** off and
   reference-check withholds on both routes; with the palette-exact canvas it is **4 of 5**.
7. **"suite 6/7"** is not a reproducible line: the suite used to crash at `test.mjs:439` and never print
   `PASS n FAIL m`. (It now prints `PASS 313 FAIL 7 of 320`.)
8. **PAIRING.md's TARGET.json md5 `76bbc3cc`** is the HEAD value; the working file is `c78583c9`.
9. **"all seven are 1440×2560"** — false for the directory (`a.jpg` 1600×1200; one is 796×1310).
10. **The ONNX-nondeterminism claim and the four session options were uncited** — and are refuted by measurement:
    parse 0 px across loads, detector 58/58, world 20/20. The residual was the free-running simulation phase, not
    the model.

Also retracted / corrected elsewhere and not to be re-derived:
- **`game/index.html` does not exist** — the live URL is an alias mounted outside the repo
  (`dvor-style-lab/serve.py:29`), so `chain.mjs:37`'s BASE depends on a file outside this repository (RUNLOG T+22/
  T+26 premise correction).
- **"I3's artefact already exists"** — REFUTED: the panel draws 0 rows, `ReferenceError: PX is not defined` at
  `src/main.js:224`, and `window.__err` is read at `:226` but never set (RUNLOG T+52 I3).
- **"I1 is unfixable / it is a suite-crash bug only"** — the I1 witness is now three suite-printed names and all
  three pass; I1 is NOT MET only because the suite reports 7 failures.
- **CONSTRUCTOR's `git ls-remote` SHAs** for minetest/scipy/sklearn are HEAD-at-fetch, not tags — do not present them
  as pinned releases.

---

*End of audit. 6 sections. No number in this report was produced by a model; each names its command, and the numbers
carried from the evidence base are marked RECORDED with the RUNLOG/Q9.2 entry that produced them.*
