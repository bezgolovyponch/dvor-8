# THE BUILD PLAN — layers, techniques, sources, and the comparison with the target frame

## 1. Research: the techniques that exist, verified against our case

| technique | source (open, real, checked) | fits our case? |
|---|---|---|
| **photograph→pixel-art: block-average downsample → snap to a fixed palette → contrast-aware outline pass** | PixelOE · https://pypi.org/project/pixeloe/1.0.0/ · image2pixel-web · https://github.com/32comic/image2pixel-web | **yes** — this IS the ground layer (road, pavement, markings, cars, people). Our `RoadRule` (5×5 area mean) and the owner-map outline are these three steps |
| **1-px outline as morphology** (dilate − shape) | OpenCV · https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html | **yes** — `world.edgesOf` and the owner map; the outline must mark buildings and cars only (creator's rule) |
| **boundary tracing + polyline simplification** | https://en.wikipedia.org/wiki/Marching_squares · https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm | **yes** — `world.borderOf`, `simplify()` |
| **destruction as a cell wave / pieces off / blocks** | Bomberman 1983 · https://en.wikipedia.org/wiki/Bomberman_(video_game) · Rampage 1986 · https://en.wikipedia.org/wiki/Rampage_(video_game) · Rampart 1990 | **yes** — `breakCells` (wave), `wreckAlong` (pieces), cells with support |
| **three-beat disaster envelope** | SimCity 1989 · https://en.wikipedia.org/wiki/SimCity_(1989_video_game) | **yes** — `src/disaster.js` |
| **on-device detection** (no server) | MediaPipe ObjectDetector · https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector | **yes** — but **COCO has no building class**, so buildings must be structural (they are: `world.structures`) |
| **palette discipline** (one small table, ramps) | Lospec · https://lospec.com/palette-list | **yes** — 50 entries, 8 ramps × 6 tones |
| **tile-based construction of facades** (v6's own method) | the creator's accepted screens (`docs/V10A.md`) | **yes** — plane + window grid on the photo's column/floor pitch |

## 2. The layers, in the order each depends on the one before

| # | layer | method | depends on | state |
|---|---|---|---|---|
| 1 | photograph layer (road, pavement, markings, people, car bodies) | 5×5 area mean, palette snap, never smoothed | — | **built** |
| 2 | sky | designed plane + horizon band + clouds, painted **last** | 1 | **built** (23% of the frame is the designed blue) |
| 3 | facades | plane in 2–3 tones of one family, grain-free | 1 | **built** |
| 4 | windows | sprites (frame · glass · sill) **snapped to the facade's own grid** | 3 | **built** (rectangles now form rows) |
| 5 | things (cars, bins, people) | cut out, **largest connected cluster**, one outline | 1 | **built** |
| 6 | outlines | buildings + cars only; aimed pink, picked cyan/blinking; nothing when idle | 3,5 | **built** |
| 7 | destruction | ladder + cells with support + per-material profiles | 5,6 | **built** |
| 8 | interaction + HUD + on-page self-test | aim, info, selection, `ПРОВЕРИТЬ` | 5–7 | **built** |
| 9 | gates | preflight → criteria → composition → suite → delivery → page → families | all | **built** |

## 3. The comparison with the target frame (`Screenshot 2026-10-14 15.52.07`)

| element of the target | ours | verdict |
|---|---|---|
| designed blue sky with **white puffy clouds**, ~40% of the frame | blue ✓ 23% of pixels; **clouds are pale stone, not white** | **short** |
| left tower: dark blue-grey **fine window grid**, every floor | plane + window rows ✓ | **close** |
| mid-rise: **checkerboard of white/blue tiles** | plane with windows, not a checkerboard | **short** |
| cars: **their own colours** (white BMW, dark Audi) with a thin outline on their own pixels | present, outlines ✓, but colours read grey | **short** |
| road: photo pixels, markings, kerbs, the bike symbol | ✓ present | **met** |
| dark outlines on cars and buildings, nothing else | ✓ rule holds | **met** |
| HUD: score, `РАЗБИТО n`, danger meter, brick + disaster buttons, big yellow throw | score, danger, bar ✓; **no `РАЗБИТО n` readout** | **short** |
| the whole frame in ONE palette, flat, no speckle | 80 tones, largest 27% ✓ | **met** |

## 4. The missing pieces, each with its constraint (the fixes to make next)

1. **CLOUDS MUST BE WHITE.** `cloudColour` resolves through the neutral ramp. Constraint: the cloud tones are
   COMPUTED ONCE with the sky flag on (the block that does this exists but the clouds are still chosen off it).
2. **THE CHECKERED FACADE.** The target's mid-rise is a pattern of alternating light/dark tiles. Method: for a facade
   whose photograph shows alternating bays, paint every second bay one tone up — a two-tone checker on the facade's
   own grid (`FacadeRule`). Constraint: only where the photograph shows the alternation, never invented.
3. **CARS KEEP THEIR COLOUR.** The cut-out goes through the palette once; a white car must come out white-ish, a dark
   one dark. Constraint: the cut-out uses the pixel's own family (saturation rule now in `entryFor`), and the outline
   is one entry, the darkest.
4. **`РАЗБИТО n`** — a counter of what the player has broken, in the HUD, as the target shows.
5. **UNIVERSALITY.** Every layer above is already parameterised by the photograph (pitch from the openings, skyline
   from the edge map, cells from the facade's own size). The remaining per-photo constants to remove: the cloud size,
   the window pitch floor, and the 0.05/0.12 thresholds — each must be derived from the picture, not typed.

## 5. Completion

Steps 1–4 are the plan above; the state column is measured, not asserted. The build order is fixed by dependency:
clouds (1) → cut-out colour (3) → checkerboard (2) → HUD counter (4) → universality (5), each one change, each judged
by `6 PAGE` (does it build), `6b FAMILIES` (is it a wash) and **the frame itself**.
