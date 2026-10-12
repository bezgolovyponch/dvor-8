# Photograph → pixel art in one style: the pipeline, the research, the measurements

Built 2026-10-12. Answers the creator's request: take real photographs, find the existing models and modules
for photo → detailed 8-bit pixel art in **one unified style** (the reference named: Hotline Miami), break the
problem into its mechanics, and build the transition from ready-made parts, adjusted, brick by brick.

Tags as in `docs/style.md`: `OPENED` means the page or repository was opened in this session and the code or
text was read. `SNIPPET` means it was seen only in a search result. `MEASURED` means it was run here on the
test photographs. `CHOICE` is this project's decision.

---

## 1. The test photographs, and what each one asks of the pipeline

Four photographs were supplied. Two of them are byte-identical (same MD5), so there are three scenes. They
are kept out of git (`photos-test/` is ignored).

| # | Scene | What makes it hard |
|---|---|---|
| 1 | Sunset over an elevated road. Bus, railings, parked cars, blocks of flats. The sky is about 45% of the frame. | Backlight: everything below the horizon is a silhouette. A huge cloudy sky with orange and blue in it. Sun glare on the asphalt. |
| 2 | Overcast, from a high balcony. A brick church with gold domes and scaffolding, a park, small parked cars, tram tracks. | **The game's own case.** Flat light and low contrast. Dull olive foliage. The cars are 6–10 pixels long at game size. |
| 3 | A street canyon in Prague. Backlit facades, smoke plumes, parked cars, shop signs. | Strong glare. The facades are fine ornament in shadow, and a small blue sky. |

**What "one style" must mean on these three:** a sunset, an overcast day and a backlit street have to come
out looking like the same game, while a red car stays red and a tree stays green. The old pipeline passed the
second requirement and failed the first, because each photograph got its own palette.

---

## 2. The mechanics, broken down

The problem decomposes into six mechanics. Each needs its own component, and each was tried on its own.

| # | Mechanic | What it has to do | Failure if it is missing |
|---|---|---|---|
| M1 | **Shrink** | 1125×2000 down to 192×256, keeping thin structure | Railings, poles and window frames average into the background |
| M2 | **Unify colour** | Every photograph into ONE fixed palette | Each yard looks like its own photograph, not like the game |
| M3 | **Assign colour** | Each pixel to the right ramp and step of that palette | Trees turn brown, grey walls turn blue, halos form round things |
| M4 | **Shade** | Few flat tones per surface, a gradient only where it is a gradient | Banding everywhere, or speckle everywhere |
| M5 | **Clean** | No single stray pixels | Noise reads as detail |
| M6 | **Outline** | A dark line round shapes, in the shape's own colour | Shapes do not separate. This was the creator's earlier complaint that "the borders are not detailed" |

Two further mechanics were investigated and left out, with measurements: **M7, semantics** (what a surface
is) and **M8, depth** (what is in front). See §5.

---

## 3. What exists: the candidates, and the verdict on each

### 3.1 Learned, end to end

| Candidate | What it is | Verdict |
|---|---|---|
| **Pixelization**, "Make Your Own Sprites: Aliasing-Aware and Cell-Controllable Pixelization", SIGGRAPH Asia 2022 (github.com/WuZongWei6/Pixelization) — `OPENED` | The closest learned model to the request: photo → pixel art at any cell size. Networks: a VGG-19 structure extractor, AliasNet, I2PNet, P2INet. | **Rejected: licence.** The README says verbatim: "Software Copyright License for **non-commercial scientific research purposes**" and "**Unauthorized commercial use is prohibited**." The weights are on Google Drive, which is not reachable from this build environment either. |
| **Diffusion img2img** with a pixel-art LoRA plus ControlNet (SD 1.5 / SDXL) | Strongest style transfer that exists | **Rejected for the game, on four counts.** (1) It needs a GPU, or about 2 GB of weights in the browser, and minutes per image on a phone. (2) The photograph would have to leave the phone, which breaks the project's rule. (3) It **invents geometry**: the detector's boxes are found on the real photograph, and a car redrawn 4 px to the left is a target in the wrong place. (4) It needs a model host. Hugging Face is blocked from this environment, and the game makes no such request. |
| **ai2pixelart** (HF) — `SNIPPET` | Cleans up AI pseudo pixel art | Rejected: CC BY-NC 4.0 weights, and it solves a different problem. |

**Conclusion of 3.1:** no learned photo→pixel-art model is both permissively licensed and small enough to
run on a phone without inventing geometry. The game's needs (on the device, pixel-true, offline, 18+
worldwide with no business model) rule out the generative route. **The pipeline is therefore assembled from
classical components, each from an existing open-source module, adjusted.**

### 3.2 Classical modules: these are the bricks

| Module | Licence | What was taken | `OPENED` |
|---|---|---|---|
| **photo2pixel** (github.com/Jzou44/photo2pixel) | Apache-2.0 | `module_pixel_effect.py`: each output cell takes the mean colour of its **most populated intensity bin** (4 bins). From `module_edge_detector.py`, the idea of a Sobel edge mask drawn as dark lines. | cloned, source read |
| **unfake.js** (github.com/jenissimo/unfake.js) | MIT | `content_adaptive.rs`: Kopf/Öztireli content-adaptive downscaling (EM over Gaussian kernels in CIELAB, 5 iterations, eigenvalue clamp). `downscale.rs` also has a "dominant" cell reducer, and `morphology.rs` an orphan clean-up. | cloned, source read |
| **OKLab** (Ottosson, 2020) | public domain | The colour space. Equal steps of L look equal, and hue can be turned without changing lightness. | constants as published |
| Pixel-art practice: hue-shifted ramps | — | Ramps whose shadows turn toward blue-purple and lights toward yellow (Slynyrd, Pixelblog 1). | `SNIPPET`: the page did not open (DNS failure); the convention is standard |
| Gerstner et al., "Pixelated Image Abstraction" (2012) | — | The diagnosis: "downsampling followed by median cut color quantization" loses detail and vibrancy. | from `docs/environment-transfer.md` |

---

## 4. The pipeline as built (`src/stylise.js` → `downscale.js`, `ramps.js`, `pixelart.js`)

    3× crop ─M1 bin-vote shrink + thin-darks-win─▶ 192×256
            ─M3 grade (OKLab: stretch L to 1–99%, chroma ×1.55)
            ─   local contrast on L (unsharp, r 3, ×0.8)
            ─M2/M3 hue picks the ramp (edge-aware neighbourhood vote), L picks the step
            ─M4 2×2 checker between two steps, only where the surface is smooth
            ─M5 orphan clean-up
            ─M6 selective outline on the dark side, one step down its own ramp
            ─▶ indices into the fixed 28 + 2 table

The return value has the same shape the rest of the game was built on (`idx`, `palette`, `smooth`,
`surfaces`). Nothing downstream changed except that `main.js` now hands in the 3× crop it already made for
the window finder.

### The iterations, and what each one fixed (all `MEASURED` on the three photographs)

| Iteration | Change | What the pictures showed |
|---|---|---|
| v1 | Fixed ramp palette, plain nearest colour in OKLab | **One look across all three.** But overcast trees came out olive-brown, grey facades went flat, and the overcast sky went cream. |
| probe | Measured the graded OKLab of key surfaces | Foliage: **hue 108–117, chroma 0.086**. The 2nd photo's sky: chroma 0.028 (truly grey). The 3rd photo's sky: **L 0.92, chroma 0.076**. A blue-grey wall: chroma 0.039. |
| v2 | **Hue picks the ramp, lightness picks the step** | Trees became green. But low-chroma surfaces jumped to full-strength colour: a concrete wall turned bright blue. |
| v3 | Green hue moved to 124 and yellow to 88, so the boundary falls below the foliage. Grey cut-off 0.05, from the probe. A 4th light-blue step on the blue ramp. The ramp is voted by the neighbourhood. The checker is used only on smooth surfaces. | The church came out red-brick, the domes gold, the sky blue with readable smoke, and concrete grey. **The style held across sunset, overcast and backlight.** |
| halo | Box-blurred hue vote → **edge-aware (bilateral) vote** | Found by a failing test: the red car's hue bled 2 px into the asphalt and took the red ramp's dark step, putting a red halo round every coloured thing. Dark-red pixels in the ring round the car went from **70 to 0**. |
| shadows | A dark pixel needs 1.6× the chroma before it is trusted to have a hue | Grey asphalt in low sun stopped flickering into dark red. |
| ramps | Light-step hue shift cut from 18° to 8°; light-step chroma 0.72 → 0.85 | At 18° the light steps of yellow, orange and green converged on one tan. The closest pair in the palette is now **25.9 apart** (tested > 12). |

### M1: the shrink, three candidates measured

| Downscaler | Time per photo (Node, this machine) | A 1-source-px dark railing at 3:1 | Look |
|---|---|---|---|
| Browser area resize (the old path) | ~0 | **160** (the average: gone) | soft |
| Content-adaptive, Kopf 2013 (ported from unfake.js) | **2.0–3.0 s** | **160**: the port averages it too | slightly crisper car edges |
| **photo2pixel bin vote + thin-darks-win** (shipped) | **0.05–0.14 s** | **20** (kept) | as crisp as adaptive on the photographs |

The bin vote on its own **also loses the railing (230)**, because one-third of a cell loses every vote. The
added rule is that a bin at least two steps darker than the winner, holding a whole line through the cell,
takes the cell. That is what keeps it, and a test proves the rule is the reason (`without the rule 230`).
Content-adaptive stays in `downscale.js` as the measured alternative. It is 20–40× slower on a desktop and a
phone would be slower still, for no visible gain on these photographs.

### The palette (`ramps.js`)

28 colours, the count the game was built around:

- seven hue ramps of three steps: red 25°, orange 58°, yellow 88°, green 124°, teal 200°, blue 260°, pink 338°
- a fourth, light step on blue for a clear sky
- a five-step grey ramp, cool in the dark and warm in the light
- one deep purple shadow

Each ramp turns its shadow 18° toward purple (290°) and its light 8° toward yellow (85°). Chroma is pulled
in until every step is inside sRGB, so no step is clipped into a different hue.

**Why this is "the Hotline Miami direction" and what is still interpretation:**

- What is sourced: Hotline Miami is "pixel art with a high-contrast colour palette" in "garish neon"
  (`docs/style.md` F8, F9), with ONE palette across the game.
- What is `CHOICE`: everything that makes it read that way here — one fixed high-chroma palette, flat
  shading in 3–4 steps, dark selective outlines, purple shadows, and the pink/cyan UI already in place.
- Not attempted: a top-down camera and night-neon recolouring. The yard must stay recognisably the
  photograph (brief, Q4).

---

## 5. Investigated and NOT shipped, with the evidence

### M8 Depth: Depth Anything V2 Small

- **Source:** ONNX from github.com/fabio-sim/Depth-Anything-ONNX release v2.0.0, `depth_anything_v2_vits.onnx`.
- **Licence:** Apache-2.0 for Small, per `docs/style.md` F23.
- **Measured here:** 99.4 MB fp32, fixed 518×518 input, 0.8–1.3 s per photograph on this machine's CPU
  (onnxruntime).

The depth maps are excellent. They separate the sky, each tree crown, the church and every parked car
cleanly, and they ignore texture.

**Tried as a silhouette-outline stage** (an outline wherever a pixel is nearer than its neighbour by 6% of
depth). Zoomed side by side, it added **little over the colour outline**: the boundaries it finds are mostly
already dark, either shadow sides or silhouettes against the sky. **The stage was removed rather than shipped
unused.**

Where depth WOULD earn its cost, none of which is built:

- a reliable sky mask, which `materials.js` now guesses from position
- parallax layers for the lean and sway
- separating a thing from the ground it stands on

The cost would be about 25 MB if int8-quantised (not measured), plus a phone inference time that has not been
measured. That is a decision for the creator, not a default. See item 3 below.

### M7 Semantics: ADE20K segmentation

- **DeepLab v3, ADE20K base, in tfjs-models.**
  - **Licence:** Apache-2.0, `OPENED`: `deeplab/src/config.ts` lists the 150 ADE20K labels, including
    windowpane, door, building, sky, tree, road and sidewalk.
  - **Weights:** served from tfhub.dev, which now redirects to Kaggle. Both are **blocked from this build
    environment**, and the Google Storage mirror returns 403. **Not evaluated here.**
  - This is the permissive route to "a wall is grey, a tree is green, a window is a window" decided by
    *what it is* rather than by its colour. It is the strongest next brick, and it fits behind
    `mapRamps` as a per-pixel ramp override.
- **SegFormer-B0 ADE20K.**
  - **Licence:** NVIDIA non-commercial (`docs/environment-transfer.md`). Not taken.

---

## 6. What runs, as verified

- `node test.mjs`: **233 pass, 0 fail.** New checks cover every stage: ramps and hue shift, no
  near-duplicate colours, hue-first mapping of dull foliage, a grey wall staying grey, no halo, orphan
  clean-up keeping a 1-px line, the selective outline on the dark side, the railing kept by the thin-dark
  rule (and lost without it), and one palette for two different photographs.
- **Three tests were rewritten, not loosened, because they encoded the old per-photo palette:**
  - The palette-use floor went from 22 to 14 colours. A fixed palette is not fully used by one yard; the
    photographs use 12–21.
  - The car-clearing redness is now measured against the ground it stood on. The new grey asphalt has a
    redness of 18 of its own.
  - The street seam is now measured in colour distance over 40 days rather than exact indices on one day.
    The matched join is 38% cheaper on average and wins 32 of 40.
- **In headless Chromium** (`tools/check.mjs`, with Chrome needing `--no-sandbox` as root):
  - the demo yard played in all four modes
  - all three photographs were searched and played: 4, 9 and 8 targets, found in 5.4 s, 3.9 s and 4.0 s
  - no page errors
- **Not measured:** `stylise` time on a phone. In Node it is 0.12–0.25 s per photograph.

---

## 7. Open items, numbered, each with its next action

1. **Nobody has looked at it on a phone.** Next: build the APK (`sh android/build.sh`), photograph a real
   yard from a balcony, and judge the look at phone size.
2. **Backlit facades (photo 3) flatten to two dark greys**, so ornament and windows in shadow are lost.
   Next: try a shadow-only local-contrast boost (DETAIL scaled up where L < 0.35) and judge it on photo 3.
3. **Depth is decided by the creator, not by default.** Next, if wanted:
   - int8-quantise `depth_anything_v2_vits.onnx` and measure its size
   - time it in onnxruntime-web on a phone
   - use it first for the sky mask and parallax, not for outlines (§5)
4. **Semantic ramps (ADE20K DeepLab, Apache-2.0)** cannot be fetched from this environment. Next: on a
   machine with tfhub/Kaggle access, download `deeplab/ade20k/1/quantized/2` and vendor it under
   `vendor/`. Then add a per-class ramp override in `mapRamps`: sky → blue/grey, vegetation → green,
   building/wall → grey, road → deep/grey.
5. **The sun glare on the road in photo 1 becomes a red streak.** It is stylised, but it is not what the
   photograph shows. Next: decide whether strong glare should map to the orange ramp's light step, by
   detecting L > 0.8 with a warm hue in the ground half.
6. **The palette numbers are `CHOICE`, set on three photographs.** Next: run the same sheet on ten more yards,
   especially at night and in snow, before tuning further.

## Sources opened in this session (2026-10-12)

- github.com/WuZongWei6/Pixelization: README, licence summary
- github.com/Jzou44/photo2pixel: README, `models/*.py` (Apache-2.0)
- github.com/jenissimo/unfake.js: README, `crates/unfake-core/src/{content_adaptive,downscale}.rs`, LICENSE (MIT)
- github.com/tensorflow/tfjs-models: `deeplab/README.md`, `deeplab/src/{config,utils}.ts`, LICENSE (Apache-2.0)
- github.com/fabio-sim/Depth-Anything-ONNX: release v2.0.0 asset `depth_anything_v2_vits.onnx`, downloaded and run
- npm registry: `@tensorflow-models/deeplab`, `@aizoo/deeplab`. Neither bundles weights.
- **Not opened** (search result only): Slynyrd Pixelblog 1 (DNS failure); TU Delft colour-ramp thesis; the
  Pixel Snapper and unfake Python port pages.
