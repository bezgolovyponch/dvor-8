# THE METHODS — proven, published, and assembled in the order they must run

**What this document is for.** Every stage below is a published method with a source, an input, an output and an
acceptance test. The build does not invent rules where a method exists; the two rules I invented that this document
replaces are named at the end, and they are the reason the sky keeps landing in the wrong place.

**What the job is, stated once.** *Convert a phone photograph into pixel art in the accepted style (V6): the frame is
built from the photograph's own geometry at 5×5 → 1 px, with the sky, the buildings and the windows DRAWN and the
road, ground, cars and people KEPT, and the result playable and destructible.* **The result must be recognisable as
the place** — that is the acceptance, before any question of beauty.

## STAGE 1 — SCENE PARSE: what is on the screen at all

**The method:** semantic segmentation, per pixel, into a fixed class set.
**The reference:** *PIDNet-S, Cityscapes* — real-time, on-device
([litert-community/PIDNet-S-Cityscapes-LiteRT](https://huggingface.co/litert-community/PIDNet-S-Cityscapes-LiteRT);
[LiteRT compiled-model sample](https://raw.githubusercontent.com/google-ai-edge/litert-samples/pull/199/head/compiled_model_api/image_segmentation/pidnet_kotlin_gpu/README.md)).
Its classes are exactly the ones this game needs: **road · sidewalk · building · wall · fence · pole · traffic light ·
traffic sign · vegetation · terrain · sky · person · rider · car · truck · bus · train · motorcycle · bicycle**.
**Input** the photograph. **Output** a class label per pixel, hence a mask per class.
**Acceptance:** the sky mask's area is within ±5 points of the frame's painted sky; the building mask covers the
towers; the road mask covers the asphalt. (Today's colour heuristics scored IoU 0.52–0.68 against the photograph —
a segmentation mask is the thing those heuristics were approximating badly.)

Nothing else in the pipeline may run before this. Every later stage asks the parse a question instead of testing a
colour: "where is the sky", "which pixels are a building", "which are a car".

## STAGE 2 — THE HORIZON, from the sky mask, not from a brightness test

**The method:** the horizon is the lower boundary of the sky class; where the sky is occluded, it is interpolated along
the boundary. Where a stronger estimate is wanted: horizon-line detection from edge cues
([CVIU 2019](https://www.cse.unr.edu/~bebis/CVIU2019.pdf)) or a vanishing-point estimate from the building mask's
vertical edges.
**Rule, and it is not mine:** **the sky is everything above the horizon and above the building outlines.** Within the
sky class's own mask, the sky continues behind a building that occludes it — which is why a hole torn in a wall shows
sky, and why the sky's region is the class mask plus the occlusion fill, and NEVER more than that.
**Acceptance:** painted sky ⊆ (sky class ∪ occluded-by-sky-class-neighbours); the pairing gate's IoU ≥ 0.75.

## STAGE 3 — GEOMETRY: the facades as planes

**The method:** vertical-edge / vanishing-point estimation on the building mask, then each facade's plane is fitted to
its own edges; window openings come from the openings the photograph shows, and the grid's **pitch is the fundamental
bay fitted to their centre gaps** (multiples treated as one bay).
**References:** classical rectification via vanishing points; the facade piece already built and confirmed here
(`src/pieces/facade.js`, 5 assertions) is the drawing half.
**Acceptance:** every wall pixel carries one of its own plane's tones, **0** foreign pixels; the grid's pitch is
derived, not typed; the count of drawn windows is within ±20% of the openings detected.

## STAGE 4 — THE PHOTOGRAPH'S OWN LAYER: reduction by selection

**The method:** contrast-aware outline expansion, then representative-pixel downsampling
([PixelOE](https://pypi.org/project/pixeloe/1.0.0/): *"if a patch has skewed distribution on low value, the minimum
value will be selected to keep the dark detail and vice versa"*).
**Implemented and confirmed here:** `src/pieces/downscale.js` (measured: a 1-px line survives 8/8 cells; an area mean
keeps 0/8).
**Acceptance:** the pairing gate's "dark structures stay dark" ≥ 60%; the road markings and the kerbs survive at 5×.

## STAGE 5 — OBJECTS: cut-outs and the outline rule

**The method:** the detector's boxes (already vendored: MediaPipe + EfficientDet-Lite2) intersected with the
segmentation masks — a car is a `car` class mask inside a detected box, and its pixels are ONE connected mass.
**Acceptance:** worst clusters per thing = 1; outlined kinds = buildings and cars only; windows and people never
outlined.

## STAGE 6 — THE STYLE, APPLIED LAST

Palette (measured from the accepted frame), register, sky design, window sprite, HUD — all defined in
`src/style/index.js` and checked by `tools/style-check.mjs`. The conversion produces structure; the style decides the
tones.

## THE ORDER, IN ONE LINE

```
SEGMENT → HORIZON → FACADE GEOMETRY → CONTRAST-AWARE REDUCTION → OBJECT CUT-OUTS → STYLE → OUTLINES → HUD
```

## THE TWO INVENTED RULES THIS REPLACES

1. **"The sky is a colour test."** (`s > 0.06 && hue in [SKY_HUE]`, then a flood, then a candidate set.) It put the
   sky at 55–57% of a frame whose photograph has 43%, painting over the city, and it is why the sky "cannot be
   placed". **Replaced by Stage 1 + 2.**
2. **"The facades are found by hue and straight runs."** It produced 1075 fragments of ~19 px. **Replaced by the
   `building` class mask + Stage 3.**

## THE MODULES, FETCHED AND IN THE REPOSITORY

| module | what it is | licence | where | fetched |
|---|---|---|---|---|
| `vendor/seg/model_quantized.onnx` | SegFormer-B0 · Cityscapes · **19 classes incl. sky, building, road, car, vegetation, person** | nvidia SegFormer weights: *other* (research; personal use) · ONNX export by Xenova | 4.38 MB | ✔ |
| `vendor/seg/config.json` | the class list (verified: 19 labels) | — | 1.8 KB | ✔ |
| `vendor/seg/preprocessor_config.json` | the model's own normalisation | — | 374 B | ✔ |
| `vendor/tjs/transformers.min.js` | transformers.js v3 (pipeline + ONNX runtime loader), Apache-2.0 | Apache-2.0 | 748 KB | ✔ |
| `vendor/tjs/ort-wasm-simd-threaded.jsep.wasm` | ONNX Runtime Web's WASM backend, so inference runs from OUR server with no network | MIT | 21.7 MB | ✔ |
| `src/scene-parse.js` | stage 1 + 2: the parse, the class masks, and the horizon from the sky class | — | — | ✔ written |

**Everything the pipeline needs is now on disk** — runtime, model, class list and the horizon rule. The remaining
work is wiring, and it is wiring only.

## WHAT IS MISSING FROM THE BUILD, EXACTLY

- the wiring of Stages 1–3 into the conversion, in the order above: the parse must run BEFORE the sky is decided,
  the sky must come from the `sky` class (plus occlusion fill), and the facades must come from the `building` class.
- nothing else. The model, the runtime and the horizon rule are in the repository (table above).

Nothing else. Every other piece — palette, style, register, reduction, facade drawing, outline rule, damage, HUD —
exists, is confirmed, and has a check.
