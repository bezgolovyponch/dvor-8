# SOURCES OF TRUTH — what each method is based on, where it is used, and how to recheck it

Every line is a real, external source. The point of the file is that a claim in this project can be traced to
something outside it, and rechecked in a minute.

## The methods

| # | what it confirms | source | used in | recheck |
|---|---|---|---|---|
| 1 | **The photograph→pixel-art pipeline**: block-average downsample → snap to a fixed palette → an outline pass, with the outline deliberately widened where contrast is high | **PixelOE — "Detail-Oriented Pixelization based on Contrast-Aware Outline Expansion"** · https://pypi.org/project/pixeloe/1.0.0/ | `src/criteria/RoadRule.js` (5×5 area mean), `src/criteria/OutlineRule.js` | `node tools/undefined-check.mjs && node tools/family-check.mjs <dump>` |
| 2 | The same three steps in a browser tool | **image2pixel-web** · https://github.com/32comic/image2pixel-web | the whole `src/vector.js` route | — |
| 3 | **The 1-pixel outline rule** (dilation minus the shape) as a standard morphological operation | **OpenCV — Morphological Transformations** · https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html | `world.edgesOf`, the owner-map outline in `src/render.js` | look at any frame: outlines on buildings and cars only |
| 4 | **Tracing a region's boundary** rather than testing pixels for edges | **Marching squares** · https://en.wikipedia.org/wiki/Marching_squares · **Boundary tracing** · https://en.wikipedia.org/wiki/Boundary_tracing | `world.borderOf` | `node test.mjs` (border checks) |
| 5 | **Simplifying a traced border** into a polyline | **Ramer–Douglas–Peucker** · https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm | `simplify()` in `src/vector.js` | — |
| 6 | **Palette discipline**: one small table, ramps of tones, no colour outside it | **Lospec palette list** · https://lospec.com/palette-list | `src/flat.js` (`RAMPS`, `tones()`, 50 entries) | the gate's palette row; `tools/family-check.mjs` |
| 7 | **A destruction wave advancing cell by cell** | **Bomberman (1983)** · https://en.wikipedia.org/wiki/Bomberman_(video_game) | `world.breakCells` | `node test.mjs` (cells, support, collapse) |
| 8 | **Damage by pieces off a thing** | **Rampage (1986)** · https://en.wikipedia.org/wiki/Rampage_(video_game) | `world.wreckAlong`, `touch()` versioning | `node test.mjs` (the ladder check) |
| 9 | **A wall as blocks, rebuilt as it breaks** | **Rampart (1990)** · https://en.wikipedia.org/wiki/Rampart_(video_game) | `src/criteria/FacadeRule.js`, `world.cellsOf` | `D1`/`D2` predicates in `tools/criteria-check.mjs` |
| 10 | **A bite cycle read as eating** | **Pac-Man (1980)** · https://en.wikipedia.org/wiki/Pac-Man | `disaster.beastPixels` | the beast's two-frame bite in `src/disaster.js` |
| 11 | **Exaggerated vehicle sprites** (and why v9's audit rejects them for this game) | **Metal Slug (1996)** · https://en.wikipedia.org/wiki/Metal_Slug_(video_game) | `docs/V10A.md`, the REJECTED note | `docs/MECHANICS.md` |
| 12 | **The three-beat disaster envelope** (warning → event → aftermath) | **SimCity (1989)** · https://en.wikipedia.org/wiki/SimCity_(1989_video_game) | `src/disaster.js` (`warn`/`impact`/`aftermath`) | a full run: `disaster` step in the harness output |
| 13 | **On-device object detection** without a server | **MediaPipe ObjectDetector (EfficientDet-Lite)** · https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector | `src/detect.js`, `vendor/mediapipe/` (7,515,971 B int8) | the harness reports `left: 55` on the Prague photograph |
| 14 | **Decoding a File without a blob URL** (the fix for the hang) | **MDN — `createImageBitmap()`** · https://developer.mozilla.org/en-US/docs/Web/API/createImageBitmap | `decode()` in `src/main.js` | the page gate: `left > 0` |
| 15 | Reading a canvas's pixels for measurement | **MDN — Canvas API / `getImageData`** · https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API | `tools/photo-shot.mjs`, the gate | `tools/concept-check.mjs` prints its premises |
| 16 | ES modules are cached by the browser, so a fix can be invisible on a phone | **MDN — JavaScript modules** · https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules | why `Cache-Control: no-store` and hard reloads matter | `curl -I` on a served module shows `Cache-Control: no-store` |

## The model that was measured and NOT chosen

| what | source | why not |
|---|---|---|
| ADE20K finetune of SegFormer | https://huggingface.co/nvidia/segformer-b0-finetuned-ade-512-512 | `license: other` — non-commercial. The **backbone** `nvidia/mit-b0` is Apache-2.0 and is the permissive route if a segmentation head is ever needed |
| Class-agnostic cut-out model | **`Xenova/slimsam-77-uniform`** · https://huggingface.co/Xenova/slimsam-77-uniform | **Apache-2.0, ONNX, 13.8 MB quantized** — chosen in `docs/knowledge-base.md` §8, not yet wired |

## The recheck, in one line each

```
node tools/preflight.mjs                 the preamble, the parts, the findings — or nothing starts
node tools/undefined-check.mjs           every import names an export that exists
node test.mjs                            the behaviour (320 checks)
node tools/chain.mjs                     criteria → composition → suite → delivery → page → families
```
