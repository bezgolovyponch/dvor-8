# HOW THE REFERENCE CONVERTS A PHOTO — read from its own code, and what that means for our path

The operator asked the right question: *how did the reference (the .html / the video) get the photo right, and what is
the most probable path for us?* The answer is in the reference's own SPEC, and it is unambiguous.

## 1. The reference's architecture: a deterministic painter with a GIVEN geometry

`tools/v13/engine-v13.txt` (byte-exact copy of the operator's file) declares every stage with its rule, method and
source. The decisive one is **S7, "Detector contract"**, in the file's own words:

> Objects arrive as labelled shapes: facade {quad of 4 corners TL, TR, BR, BL; optional clip polygon; kind
> auto|curtain|checker|masonry}, vehicle {box x, y, w, h; …}, prop {rect|line|pole}. People and trees are never
> annotated: they stay photo pixels. **Shapes come from manual annotation or from any detector** (e.g. YOLO-family on
> the COCO car/bus/truck classes, or a facade segmenter). **Everything after this point is deterministic.**

And the scenes are hard-coded annotation data — the actual `SCENES` entry for the tower photograph:

```
{ id: 'prague-tower', gy: 334, h0: 327, sky: 'auto', src: 'assets/prague.jpg',
  buildings: [
    { id: 1, name: 'ОФИСНАЯ БАШНЯ',  kind: 'auto',    quad: [[0,0],[141,0],[126,289],[0,258]] },
    { id: 2, name: 'ШАХМАТНЫЙ ДОМ', kind: 'checker', quad: [[125,206],[213,206],[213,334],[125,334]],
                                                     clip: [[125,249],[180,206],[213,206],[213,334],[125,334]] }],
  cars: [ … boxes … ] }
```

So the pipeline splits into two halves, and only the *first* half looks at the photograph:

| stages | what they decide | input needed | automatic? |
|---|---|---|---|
| S0 frame · S1 palette · S2 snap+reduce · S3 clean · S4 edges · S5 sky region · S6 sky style | the grid, the tones, the sky | **the photograph only** | **yes** — region growing (Adams & Bischof), Sobel, Otsu, value noise |
| **S7 → S11 facade** | where each building is, its lattice, its panes | **a quad per building, the ground line `gy`, the horizon `h0`** | **no — given** |
| **S12 vehicles** | the cut-out per car | **a box per car** | **no — given** |
| S13–S19 silhouette, pieces, damage, glass | the game | the above | yes |

## 2. The detailed answer to "how did Claude design convert the photo correctly?"

**It did not convert the photo. It painted a photograph it had already been told how to read.**

Four properties make the result look right, and every one of them is a *consequence of the given geometry*, not of a
perception step:

1. **The pixels are the photograph's.** S11: *"The facade is the photo itself in the working palette, so its own
   perspective, ornaments, brick and floors stay exactly where the camera saw them: no re-projection."* The art is the
   photo quantised — nothing is *re-drawn*, so the eye never disagrees with it.
2. **The windows are the photograph's holes, found inside a given quad.** S10: homography (S8, Heckbert 1989) → Otsu
   (1979) for glass walls / Niblack (1986) for punched facades → 4-connected components → the class owning the largest
   component is the frame. Because the quad is exact, "inside the facade" is exact, and the local threshold works.
3. **The lattice is measured from the rectified facade, not guessed at frame scale.** S9: projection profiles +
   autocorrelation inside the rectified square. That is why its checker has the building's own 3-px cells while my
   pipeline divided the whole frame by a number fitted on a different building ("432 × 45 px", D28).
4. **Cars are cut from given boxes.** S12: a magic-wand flood from the box border, a 2-class colour model, 3 rounds of
   ICM, largest component, contour smoothing — all *inside a box that is known to contain one car*. My pipeline asks a
   COCO detector to find cars and then cuts its own boxes; when one box is wrong, the cut is wrong.

The reference is therefore **not** a general "photo → pixel art" converter. It is a **deterministic renderer whose
perception layer is a human with a pen** — and it says so itself, offering the alternative in the same sentence:
*"…or from any detector (e.g. YOLO-family … or a facade segmenter)"*.

## 3. Why my product kept failing where the reference never does

My app must do *both* halves. I built the second half well (seven verified bricks, byte-identical extractions, the
deterministic painter) and left the first half — the geometry — as an unvalidated pile of heuristics: the semantic parse,
the plan, the wall pass, three pitch fits. On the photograph the tune was fitted to, those heuristics happen to
reproduce what an annotator would have drawn; on the next photograph they return a 432-px pitch and the frame has no
windows at all. The reference never has that failure because it never asks the question.

**This is the whole explanation of the last two rounds of screenshots**: not a bad palette, not a bad outline (that one
was real and is fixed), but a *perception layer with no ground truth*, standing where the reference has an annotation.

## 4. The viable paths, ranked by probability of reaching the expected result

**P1 — the reference's own input model, productised: the player's tap is the annotation. (MOST PROBABLE.)**
The game already talks to the player in exactly these terms: *"ИНФО · НАЖМИ НА ЗДАНИЕ ИЛИ МАШИНУ"*, *"Сфотографируй
двор… Машины, скамейки, велосипеды на снимке станут целями"*. A tap is a point of ground truth **given by the user**,
and the app already has the gesture. From a tap:
- **the facade quad**: four taps (the reference's exact format), or **one tap + region growing** over the photograph
  (the same seeded-growth machinery as S5, applied to the wall's own colours/edges) → the grown mask's minimum-area
  quad; the player sees the quad and can drag its corners (an edit step, like a crop box);
- **the ground line `gy`**: one tap on the kerb, or the bottom of the grown mask;
- **the horizon `h0`**: the sky region's own bottom (S5 already measures the skyline);
- **cars**: the existing COCO detector gives the boxes (the reference explicitly allows YOLO for cars); a tap/box drag
  corrects one.
This eliminates the failing layer **by construction** — there is no perception decision behind the quad, so the frame
cannot silently lose its windows.

**P2 — auto-detect, tap-correct.** Cars: YOLO (already in the app). Buildings: straight-line detection
(LSD/Hough) + a Manhattan/vanishing-point fit, then "a quad is admissible only if the lattice found inside it is
plausible" (D28's validity contract) — with the tap as the fallback when no quad passes. This is the reference's
"…or from any detector (e.g. … a facade segmenter)" taken literally.

**P3 — general segmentation models (best masks, worst fit here).** SAM-family mask proposals (with mobile variants such
as MobileSAM/FastSAM) or a depth model (Depth Anything V2 Small runs on-device with WebGPU) would give building/ground
masks without a tap; but they are large, slow on a phone, and the app's promise is *"Снимок не покидает телефон"* — a
local model is possible but heavy enough to change the product's nature. Use only if P1's tap proves unacceptable.

**Ready-made pieces that already do the painting half** (all with sources the project already cites): [PixelOE
(selection-based downscale, in use)](https://pypi.org/project/pixeloe/1.0.0/), [image2pixel-web (browser pixel-art
tool)](https://github.com/32comic/image2pixel-web), [OpenCV morphology for the 1-px outline](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html),
[LSD/Hough line detection](https://docs.opencv.org/4.x/d9/db0/tutorial_hough_lines.html) for P2, and
[Depth Anything V2 Small on WebGPU in a browser](https://cloud.tencent.com.cn/developer/article/2721026?from=15425&frompage=seopage)
for P3. None of them supplies the *geometry contract* the reference uses — that is the piece we must add.

**VERDICT.** The most probable path to the expected results is **P1 with P2 as an accelerator**: the app's own tap
becomes the annotation, in the reference's JSON shape (`quad`, `clip`, `gy`, `h0`, car boxes), and then the painter we
already built and verified produces the frame — deterministically, for any photograph, with no silent failure mode.

## 5. What that changes in the codebase (bricks, in order)

1. `pieces/scene-annotation.js` — the **contract** from the reference's S7: `{ gy, h0, buildings: [{quad, clip?, kind}],
   cars: [{box, view}] }`, validated (a quad inside the frame, non-degenerate, a lattice admissible — D28's test), and
   serialisable. Its check: the reference's own four SCENES parse and validate; a 432-px pitch annotation is refused.
2. `pieces/region-grow.js` — a tap → the grown mask → the quad (`regionGrow(photo, seed, tolerance)` + minimum-area
   quad). Its check: a synthetic wall with a window and a shadow grows to the wall (not into the window, not into the
   shadow at a stated tolerance); deterministic.
3. The app flow: **tap a building → its quad appears → confirm/adjust → the player's yard is built from the
   annotation**. The tap replaces the parse for geometry; the parse may still *pre-fill* a guess, but the frame never
   depends on a guess it cannot show.
4. Only then: the visual gaps (band D29, the checker pitch — now measured inside a *correct* quad — the HUD).

The first two bricks are small, have exact checks, and are the difference between "the converter works on my photograph"
and "the converter works".
