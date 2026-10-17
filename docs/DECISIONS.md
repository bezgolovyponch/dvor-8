# DECISIONS — every choice this project makes is taken from an open-source definition

RULE: a decision is not made here. It is TAKEN from a published definition or a published implementation,
and recorded with its source. If no open source defines it, it is written as an OPEN QUESTION, not as a
default. Any new decision must be added to this table BEFORE it is used in the pipeline or a gate.

| # | decision | taken from (open source) | why it applies here | what would change it |
|---|---|---|---|---|
| D1 | pseudo-random generation in the build | **mulberry32** - Tommy Ettinger, public domain, and ALREADY VENDORED in this repo (`src/rng.js`) | it is the repo's own precedent: a choice already carried by real code beats a new dependency. 32-bit state, period 2^32 | if a build ever needs > 2^32 draws or multiple independent streams -> **splitmix64 seed expansion + xoshiro256\*\*** (Vigna, "Scrambled Linear Pseudorandom Number Generators", ACM TOMS 2021, arXiv:1805.01407) or **PCG** (O'Neill 2014, pcg-random.org) |
| D2 | reproducible neural inference | **ONNX Runtime session options, as documented by the project**: `intraOpNumThreads = 1`, `interOpNumThreads = 1`, `executionMode = ORT_SEQUENTIAL`, fixed `graphOptimizationLevel` | threaded reductions are not bit-reproducible; this is the library's own documented way to make inference deterministic, not our invention | if a measured speed need outweighs determinism, the option is revisited WITH the detgate number that forced it |
| D3 | reduction of the photograph to the art grid | **PixelOE** (contrast-aware selection rather than averaging) - https://pypi.org/project/pixeloe/1.0.0/ ; **image2pixel-web** - https://github.com/32comic/image2pixel-web | published photograph->pixel-art method, cited by this repo's own method docs; the repo's `src/pieces/downscale.js` is its local implementation | if the published implementation can be vendored and called directly, do that instead of maintaining a local one |
| D4 | the 1-px outline | **morphological gradient** (dilate minus shape) - OpenCV morphology tutorial, https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html | the published definition of a one-pixel boundary on a raster; the outline pass is that operation, not a hand-rolled neighbourhood test | a different structuring element is a CHOICE and must be recorded as one |
| D5 | palette quantisation of the accepted frame | **median cut** via Pillow (`Image.quantize(method=MEDIANCUT)`) - the implementation already used for `reference/v10a-art-canvas.png` | published, in-repo precedent, verifiable by re-running it | higher-fidelity quantisation -> **libimagequant** (published, used by pngquant); the artefact (the 1:1 canvas) decides, not preference |
| D6 | frame-against-frame comparison | **pixelmatch 6.0.0 + pngjs 7.0.0** (MIT), installed and pinned in `gates/package.json` | the industry-standard image differ, already mutation-proven in this repo (same frame 0 px, 3-px shift 30.95%, size mismatch withheld) | never: a published judge already exists, so a self-written one is forbidden |
| D7 | perceptual similarity, if a single number is ever needed | **SSIM** - Wang, Bovik, Sheikh, Simoncelli, "Image quality assessment: from error visibility to structural similarity", IEEE TIP 2004; implementation in scikit-image (`skimage.metrics.structural_similarity`) | published metric with a standard implementation; NOT yet installed here - install is a decision with a command, not an assumption | not needed while pixelmatch answers the question |
| D8 | boundary tracing / path simplification (if the outline becomes vector) | **marching squares** (https://en.wikipedia.org/wiki/Marching_squares) and **Ramer-Douglas-Peucker** | published algorithms for exactly this step | not used yet; listed so nobody invents one |

## OPEN QUESTIONS (no open source decides these yet - they must not be defaulted silently)

  O1  What identifies a CHECKERED facade? Luminance distributions were measured and rejected (they fire on the
      tower too: match-check 6/7 -> 4/7, style 8/8 -> 5/8). A spatial alternation measure is the current
      hypothesis; no published facade-classification rule has been sourced for it yet.
  O2  Which tonal register the ground's own ladder should stop at, when the accepted frame's road is 46.6% dark
      and the style's register requires a lighter grey. Currently rung 2 of 3 by measurement, recorded in
      src/vector.js with the four measured configurations.
