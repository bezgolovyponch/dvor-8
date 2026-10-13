# Ten ways to make the transfer stable — and what each one costs

Research only. **No game code was changed for this document.** It exists so the style can be chosen before
anything is built.

The complaint that started it: the photograph → 8-bit transfer is not stable. Facades are not clearly separated,
windows are not reliably found, and the outlines of buildings do not look deliberately redrawn — the edges are
whatever the lens and the dither happened to produce. What follows is ten routes, each an existing, verified
tool or method (or a small assembly of them), scored on the four things that were asked for:

**F** facades separated · **W** windows as individual destroyable objects · **A** straight edges and consistent
angles · **L** licence and browser fit for this game (no build step, on-device, a phone).

Evidence classes as everywhere in this project: `VERIFIED` = the source was opened by the research pass,
`UNVERIFIED` = could not be opened and justifies nothing.

---

## What is wrong today, measured

| | |
|---|---|
| Windows found by the game | **1** on the sunset photograph, **4** on the church, **1** on the street canyon; 6 of the drawn yard's 15. They are found by a geometric guess (a dark opening in a brighter wall) |
| Facades | There is no notion of a facade. Regions are merged by colour similarity, and Felzenszwalb's own paper shows it merging across weak boundaries — a low-contrast facade seam is *expected* to merge, not a bug |
| Angles | The line layer follows a difference-of-Gaussians of the photograph, so every angle is the camera's. Nothing in the pipeline is capable of producing two parallel lines on purpose |

---

## 1. CMP-style rectified facade grid (rectify → fit axis-aligned rectangles)

**The finding that changes the plan.** The **CMP Facade Database** is not only a segmentation set: it ships one
`<object>` per element with corner coordinates. Across all 378 base images: 32,899 objects, **12,222 `window`
objects, and 12,221 of 12,222 windows are exactly axis-aligned rectangles**; median 28 windows per image; the
photographs are already **rectified (fronto-parallel)**. Licence CC BY-SA, downloads live. `VERIFIED`

**F** a facade is a plane, so it is one region by construction · **W** windows are rectangles, which is what the
game needs for a destroyable object · **A** everything is axis-aligned to the rectified frame — the only route
here that *guarantees* the angle requirement · **L** clean: the geometry is our own code; CMP is only needed if
we train something on it.

**Cost** high: two vanishing points → homography → rectify → line detection → grid fit. **Risk** rectification
fails on a photo with no visible vanishing points (a flat-on wall, or a courtyard looking down).

## 2. ADE20K semantic segmentation (SegFormer-B0, 4.4 MB ONNX) + rectangle fitting

Windows, doors, walls, buildings, fences, sky, road, sidewalk are all ADE20K classes, and the B0 model runs in a
browser: `onnx/model_quantized.onnx` = **4,418,863 B**, `model.onnx` = 15,335,446 B, 3,753,206 parameters,
transformers.js supports SegFormer on WASM and WebGPU. `VERIFIED`

**F** wall / building / fence masks give real facade separation · **W** partial — `windowpane` is **ONE semantic
class, not instances**: all windows come back as a single merged mask at 1.98% of pixels against `wall` at
15.76%, so the *splitting into individual windows is our work* (connected components + rectangle fit) · **A**
none — a mask has no angles · **L** the blocker: **NVIDIA Source Code License, non-commercial** ("research or
evaluation purposes only").
The only ADE20K model verified with a permissive tag is **OneFormer Swin-L (`license: mit`)** — but it is ~219 M
parameters and server-side. Mask2Former Swin-L is 215,986,594 parameters and its repo is archived. `VERIFIED`

## 3. OpenCV.js geometry toolkit (Apache-2.0, 10,964,323 B)

The JS whitelist is verified to include exactly the geometry this needs: **Canny, `createLineSegmentDetector`
(LSD), HoughLines/HoughLinesP, findContours, minAreaRect, approxPolyDP, connectedComponentsWithStats,
getPerspectiveTransform, warpPerspective, findHomography**, plus `dnn` for ONNX. OpenCV is Apache-2.0 and the
build is the standard `opencv.js`. `VERIFIED`

**F** contours + connected components separate facades and openings · **W** rectangles from `minAreaRect` /
`approxPolyDP` on dark openings — windows become objects · **A** rectification and line detection in one library
· **L** clean licence, but 10.5 MB and a 10 MB+ WASM payload on a phone, and it is a dependency (though it can be
lazy-loaded, not a build step).

## 4. imagetracerjs — quantise, trace, 8 directions (Unlicense / public domain)

Pure JavaScript, no build step, synchronous `imagedataToSVG()`. Its pipeline quantises colour, builds per-colour
layers with marching-squares edge nodes, then **interpolates so that "every line segment in the new path has one
of the 8 directions (E, NE, N, NW, W, SW, S, SE)"**. `VERIFIED`

**A** this is the closest existing match to "machine drawn": angles come from a set of eight, by construction ·
**F** each quantised layer is its own closed path, so a facade is a shape · **W** a dark window inside a lighter
facade is a separate closed polygon — an object — though the frame around it is not modelled · **L** the
cleanest licence in this list (public domain).
**Cost** small: port the tracer as-is, then snap its polygons to the 288×512 grid and fill each closed region
from the fixed palette. **Risk** author-stated: "very little error handling… out of memory can happen easily with
big images or many layers"; its output is splines, so polyline simplification is needed.

## 5. Potrace with grid quantisation (GPL-2.0)

The established bitmap→vector tracer; **`-u/--unit N` "quantize output to 1/unit pixels (default 10)"** is the
published precedent for grid snapping, and `--turdsize` suppresses speckles. Every JS/WASM port found
(`esm-potrace-wasm`, `kilobtye/Potrace`) is **GPL-2.0** and says so in its README. `VERIFIED`

**A/F/W** as candidate 4, with curves rather than 8 directions · **L** the problem: GPL-2.0 is copyleft and this
game is meant to ship. Usable as a *design reference* for the snapping step, not as a dependency.

## 6. Primitive (MIT) — axis-aligned rectangles fitted by hill climbing

From a blank canvas of the average colour, random shapes are mutated and kept when they lower RMSE; **`-m 2` is
axis-aligned rectangles**, output SVG, "around 50 to 200 shapes are needed". MIT, offline, 13,510 stars.
`VERIFIED`

**A** the most literally rectilinear, consistent-angle abstraction available · **F/W** none by itself — a window
appears only if a rectangle wins the error competition · **L** clean licence, but it is a Go program: we would
re-implement the loop in JS (~150 lines) or run it offline to produce reference art.

## 7. linedraw (MIT) — plotter-style polyline redraw

Canny → contour simplification → hatching → **stroke order optimisation**, output polyline SVG "for plotters".
Windows come out as thin closed polylines, i.e. objects by nature. MIT, but Python + OpenCV and its "sketchy
style" adds Perlin noise which *breaks* angle consistency and must be switched off. `VERIFIED`

**A** yes for contours, no for colour · **F/W** natural · **L** the algorithm is portable and MIT; the code is
not a browser library.

## 8. Hybrid: keep the current pipeline, add a snapping step (our own code, no new dependency)

Keep the model-free parts that already work here (XDoG ink, the fixed palette, the per-region painting), and add
the geometry step that is missing: detect the dominant straight lines (Canny/Hough or a small LSD in JS),
cluster them into two vanishing directions, rectify, then **snap every region boundary to the rectified axes**
and treat each closed opening as a window object.

**F** facades separated by their own straight seams · **W** windows from connected components on the rectified
plane · **A** consistent by construction, because every boundary is snapped to the same two axes · **L** nothing
new to licence, nothing to download, works on a phone.
**Cost** the most work of any candidate here, and the geometry is ours to get right. **Risk** a photograph with
no usable vanishing points degrades to today's behaviour.

## 9. Cloud pixel-art APIs — PixelLab, Retro Diffusion (verified, paid)

**PixelLab** `POST /v2/image-to-pixelart`: "Output up to 320x320 … **Keep the same aspect ratio as the input**",
"the image is downsized 4 times", optional target palette, ~**$0.006 to $0.01164 per image**, commercial use
allowed, no training on inputs. **Retro Diffusion** `rd_pro__pixelate` (16–256 px, **$0.03–$0.18 per image**)
plus free deterministic helpers (`k_centroid_downscale`, `color_reducer`, `palette_converter`) and a Pixel Fixer
that "restores enlarged art to its detected native grid"; its Aseprite extension ($65) runs locally but is
desktop-only and being phased out. **ClipDrop's pixel-art tool is dead (HTTP 404).** `VERIFIED`

**A** the models are trained to produce deliberate pixels; angles are *plausible* rather than guaranteed ·
**W** not objects — the output is a picture, so windows would still have to be found separately · **L** online
only, per-image cost, a third-party dependency — but the best-looking results per hour of work.

## 10. Diffusion + ControlNet (Lineart / Canny) with a pixel-art LoRA

The mainstream authoring route. ControlNet's *code* is Apache-2.0 but the *weights* are `openrail`, and
`lllyasviel/Annotators` (the Canny/HED/Lineart detectors) is tagged `license: other` with a model card whose
entire content is front-matter — a genuine licence ambiguity. Multi-GB weights, GPU, not a phone. `VERIFIED`

**Use** as a tool to *author reference art* for the style we build by hand, not as the game's pipeline.

---

## The comparison

| # | Route | F | W | A | Licence | Browser/phone | Effort |
|---|---|---|---|---|---|---|---|
| 1 | CMP-style rectified grid | ●●● | ●●● | ●●● | clean (CMP CC BY-SA if trained) | yes, own code | high |
| 2 | ADE20K SegFormer-B0 | ●●● | ●● | ○ | **non-commercial** | yes, 4.4 MB ONNX | medium |
| 3 | OpenCV.js geometry | ●●● | ●●● | ●●● | Apache-2.0 | yes, 10.5 MB | medium |
| 4 | imagetracerjs 8-direction | ●●● | ●● | ●●● | **Unlicense** | yes, pure JS | low |
| 5 | Potrace + `-u` snap | ●●● | ●● | ●●● | **GPL-2.0** | port only | low |
| 6 | Primitive, axis-aligned rects | ●● | ○ | ●●● | MIT | re-implement in JS | low |
| 7 | linedraw plotter style | ●● | ●● | ●● | MIT | re-implement in JS | medium |
| 8 | Hybrid: snap our own pipeline | ●●● | ●●● | ●●● | clean | yes | high |
| 9 | Cloud APIs (PixelLab, RD) | ●● | ○ | ●● | commercial terms | **online, paid** | very low |
| 10 | ControlNet + pixel LoRA | ●●● | ○ | ●● | **ambiguous** | no (GPU) | low for art, not for the game |

## What the evidence points at

Nothing off the shelf emits *rectilinear simplified regions + a fixed palette + object-level windows* in one
pass. The assembly the research supports is:

**candidate 4 as the painter** (public-domain tracer, eight directions by construction → the machine-drawn look
and closed regions that can each become an object) **+ candidate 1/3 as the geometry** (rectify, then snap every
boundary and every opening to the axes, so windows are rectangles and facades are planes) **+ the palette and
dither rules that already exist in this repo** (which is what keeps every yard looking like one game).

## The three decisions only the creator can make

1. **Is a non-commercial model acceptable?** SegFormer-B0 ADE20K is 4.4 MB and gives walls, buildings,
   windows and doors — but its licence forbids commercial use. The permissive alternative finds no windows at
   all (DeepLab v3 Cityscapes, Apache-2.0).
2. **May the game download 10.5 MB of OpenCV.js** (Apache-2.0) to get rectification, LSD, Hough and
   `minAreaRect` in the browser — or must everything stay hand-written and dependency-free?
3. **Is an online call acceptable** for the best-looking conversion (PixelLab ~$0.01 per photograph, Retro
   Diffusion up to $0.18)? Today the promise is that the photograph never leaves the phone.
