# Scene analysis, applied

The study this file records arrived as `dvor8-scene-analysis.pdf` (four pages, `~/Downloads`) describing a scene
parser and a redraw built on it, living in a scratch folder. **That scratch folder is not on this machine** — no
Lite2 file, no GrabCut module, no `photos-test/5.jpg` — so the findings were re-applied here from the document,
in this repository, and every number below is this repo's own measurement.

## What the study found, and what each finding became

| the study | applied here as | measured |
|---|---|---|
| EfficientDet-**Lite2** instead of Lite0: 13 cars where Lite0 found 8, no facade called a truck, no wall called a boat, same 7.5 MB, ~1.5 s slower | `efficientdet_lite2.tflite` vendored (7,515,971 B, int8) and `loadDetector()` defaults to it — D54 | model in place; the per-photo detections are re-run by the harnesses |
| **Enhance the picture before parsing it**; shadows are secondary | `src/enhance.js`: divide out a large-radius blur, tile-wise local contrast, edge-preserving smoothing, and two maps — edge strength and **long-straight-run density** — D53 | shapes straightened 228–284 → **259–399** with stray pixels unchanged at 0.09–0.10% |
| **Depth alone cannot tell sky from a distant city; straight-line density can** | a blue area full of long straight runs is not sky: it stays a shape, and distant towers remain a separate layer rather than being painted as sky | in `src/vector.js`, `en.line[i] > 0.34` |
| **Rejected there**: sky by smoothness (carves clouds into fake buildings), and cutting buildings at gaps in the sky (slices walls into stripes) | not implemented; the sky is grown through its own clouds and stopped at the skyline instead, which is the route that survived | — |
| **Buildings split where depth jumps**; each building tappable | the wall is taken from the *structure* (flat, bright, not sky, not foliage) and joined into connected planes, one plane per facade | planes found on all three photographs |
| **"The tower's window grid reads"** | the facade-rhythm reader: peaks in a wall's own row and column profiles give the openings and the pitch, and the grid is completed across the wall where the wall actually is — D55 | **windows 1/2/1 → 22/15/15** |
| Open in the study: photo 1's clouds join the horizon and render as grey strips | already fixed here: the sky's blue core grows through its own clouds and stops at the skyline | clouds 3 per photograph, placed clear of the skyline |

## Now applied on top of the study

- **The windows the route finds are things with hit points.** The per-pixel route *guessed* at openings in a wall
  ("на глаз"); the vector route reads the facade's rhythm and returns rectangles, and those rectangles are now
  added to the world as `window` regions with the same hit points as any other thing. On `photos-test/a.jpg` the
  yard went from **6 targets (one truck and five guessed windows) to 13 (one truck and twelve found ones)**, and
  the run scored 14,025 with 671 holes knocked in the scenery and no page errors.
- **One tone per facade** (`src/vector.js`, stage 5a): each wall plane gets its own shade of its own family, so
  two buildings at right angles tell themselves apart by tone — which is the study's "buildings now each get
  their own shading", and something colour-driven merging could never do.
- **The object fundamentals pass** (stage 5d): each thing the detector marked is drawn as OUTLINE (one pixel of
  ink round its silhouette), BODY (one flat tone from its own colour) and GLASS (its dark half, one darker tone
  of the same family, split by luma rather than by a model). That is the study's "white body, dark glass,
  outline" for a car, done without GrabCut: the details kept are the ones that CREATE the shape, and the texture
  of the paint is dropped.

## Not yet applied, and named as such

- **The car redraw.** The study's "BMW looks like a car (white body, dark glass, outline)" is a per-object
  fundamentals pass — cut the object out, then paint body, glass and one outline. The window grid is the same
  idea for buildings and it is in; the vehicle half is not, and small cars are still rough in both.
- **GrabCut.** The study cuts each vehicle out with GrabCut seeded by depth. This repo has no depth model and no
  GrabCut; the object outline would have to come from the enhanced picture's edges instead, which is the cheap
  version of the same idea.
- **A depth model.** Not shipped: 99 MB as downloaded, unknown cost on a phone. Everything above that the study
  got from depth is done here from structure instead — position, straight-line density, connectivity, and the
  sky band — which is the substitution this repo can defend.
