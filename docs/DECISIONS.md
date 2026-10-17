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

| D9 | what «осталось» counts (the win condition) | **docs/CRITERIA.md D1** (buildings, cars, windows are the destroyable kinds) + **operator sign-off 2026-10-18** (PART A answer 2) | the HUD's «осталось» is the game's win condition. Counting EVERY region (world.js:463/:518) made a bench or a bicycle block clear forever, because the rules refuse to destroy them; only declared-destroyable things may count, furniture stays interactable and never blocks, people are never destructible, and the disaster path uses the same predicate | if the creator restates the clear condition in CRITERIA (a new kind added or removed), this row is re-derived from that text, never from taste |
| D10 | the referee for "does it look like the accepted frame" | **reference/v10a-accepted-frame-screenshot.png** (the approved example, already in the repo), extracted in-session: P3-decode, grid by palette-purity optimum, HUD + selection/aim rings + blend seams masked; a copy snapped to the repo palette's nearest entries for share/hue/parity measures ONLY | every other reference/ file measures 0.0% palette-exact, so none of them is a pixel referee; the approved screenshot is the creator's own example and the extraction makes it measurable. It is never a pixel target, and no engine export, stub or operator image is used | if the creator supplies a true 1:1 export of the accepted frame (288x512, palette-exact), that file replaces the extraction and every share is re-read from it |
| D11 | may the build consume a seed? | **no** - measured at 079f119: a different `?seed` changed 0 px of 147456, because the build reads no seed; only post-hit debris/glass do | a seed that changes nothing is not a seed. The build stays seed-independent; the play-time `rnd = Math.random` defaults (world.js:144/196, disaster.js:90, weather.js:77, lore.js:39, audio.js:31) stay; detgate-parse and detgate-render remain the standing determinism proof | if a later build draws a decision from rnd, the seed re-enters at that one entry point WITH a gate that shows a different seed changing pixels |
| D12 | the day's news over the yard | **concept feature** - README.md:50 (a plane with a banner and an airship carry the day's real headlines; tap one to throw) | it is product text, not filler. Gate captures stay `?clean=1` and offline (docs/DETERMINISM.md R2); the `?news=0` / `?newsOn` / `?clean=1` switches are documented in docs/DETERMINISM.md; the I-NEWS-DET sprint proves the offline fallback (no network => the yard's own news, 0 requests) and the tap-to-throw row | if the creator removes the feature from README/CONCEPT, the switch and its sprint go with it |

| D13 | the bar on delivery line 2b (the wall's tones) | **the accepted frame's own wall window**, measured in-run from `reference/v10a-art-canvas.png` (left 30% x rows 12-45%: 30 tones, largest 18.8%) | the old bar - "at most 8 tones, largest >= 40%" - was a round number, and the creator's accepted frame FAILS it (18.8% largest, 30 tones). "Designed, not blurred" is the requirement; the reference is the only honest instrument, so the line now asks for no more tones than the reference and a largest tone at least as large | if the owner supplies a true indexed export of the accepted frame, its window is re-measured and the bar moves with it |

| D14 | R1's referee and the two owner lines it cannot reproduce | **tools/accepted-frame.py**: the approved frame extracted from `reference/v10a-accepted-frame-screenshot.png` (lossy VP8 WebP, art rect 360x640 = exactly 1.25x, HUD/rings/seams masked, snapped to the repo palette), cross-checked against the owner's table | 11 of 13 lines reproduce within 0.05 (all checker, road and sky shares, both tower tones, the mid-rise parity). The two that do not CANNOT: under the predicate that reproduces the checker's blues .21 and the mid-rise parity .361, the tower facade measures .40-.42 blues and .34-.36 parity, and the accepted 48-colour canvas gives .79/.48 - so the owner's tower blues .30 and tower parity .047 were measured on a different rect (the .047 matches a flat wall patch). They are re-derived, not used as bars | if the owner supplies the tower rect, those two lines return to the table |

## OPEN QUESTIONS (no open source decides these yet - they must not be defaulted silently)

  O1  What identifies a CHECKERED facade? Luminance distributions were measured and rejected (they fire on the
      tower too: match-check 6/7 -> 4/7, style 8/8 -> 5/8). A spatial alternation measure is the current
      hypothesis; no published facade-classification rule has been sourced for it yet.
  O2  Which tonal register the ground's own ladder should stop at, when the accepted frame's road is 46.6% dark
      and the style's register requires a lighter grey. Currently rung 2 of 3 by measurement, recorded in
      src/vector.js with the four measured configurations.

## D15 — THE COMPOSITION IS A PLAN, NOT A NUMBER (2026-10-18, operator directive)

**The operator's ruling:** "it's not a palette first — you have to verify the acceptance; the main is the conceptual
look of the result; get WHY composition and conceptually the desired and expected result looks how it looks, and add
the structure for it. Deterministic, not just numbered, but conceptual."

**Read off the accepted frame's own pixels** (`tools/plan-check.mjs` re-reads it every run):

| rows | band | the rule it obeys |
|---|---|---|
| 0–352 | **sky** | one flat blue plane (rgb(77,156,232)) carrying drawn white clouds; one colour owns the band, no gradient |
| 352–384 | **horizon** | one dark line (rgb(27,18,32), 25–29% of its rows) — the frame's structural spine |
| 384–512 | **ground** | the photograph's own tones (road rgb(98,94,105), asphalt rgb(74,70,80)), vehicles kept from the photo |
| everywhere | **facades** | exactly two archetypes: `checker` (light/dark panels alternating; accepted mid-rise white 16.0%, dark blue 38.5%, 2-D parity .361) and `dark-plane` (dark ≥35% carrying blue glass ≥10%); `grid` is the unclaimed case |

**The structure:** `src/plan.js` produces `scenePlan({w,h,horizon,parts,rgb})` — bands in order, facades with a role,
deterministic (same input, same plan; the check asserts it), and `buildingsFrom(mask,w,h)` — buildings as instances by
connected components on the semantic mask. `tools/plan-check.mjs` judges the plan: 7 structural lines, three of them
read from the accepted frame's own pixels (horizon row 352, sky band, band structure) and four on our plan.

**Measured:** our plan's bands are `sky 0–358 · horizon 358–390 · ground 390–512` — the accepted's structure within
6 rows. **Open finding:** the parse's building mask MERGES the tower and the mid-rise into one component (box
`0,0,211,342`), so the plan can name `dark-plane` but not yet both archetypes; instance segmentation of touching
buildings (edges/watershed on the mask) is the next structural step, and it is what the accepted frame's two
archetypes require.

**Split into instances:** `splitByTone()` splits a merged component by its own two tones (Otsu 1979) - measured on the judged frame, the tower arrives as `dark-plane@0,0,131,342` (dark 93.6%) and the mid-rise as `checker@160,201,209,258`, both named on SEPARATE buildings, 8 of 8 structural lines. The dark-plane bar is dark >=35% (the accepted frame's own), not the mask's blue share: the mask is the silhouette (1.1% blue), the glass is drawn over it (11.7% of the region). **The plan is a DIAGNOSTIC for now:** the painter still decides for itself; inverting that (drawing FROM the plan) is the next structural step.

**A bug this exposed:** `vector.js` re-declared `wallParts` inside the facade block, shadowing the function's own, so
every `wallParts` the renderer returned was EMPTY. Fixed (assignment, not declaration).

## D17 — A RELEASE IS MADE ONLY FROM A CHAIN-GREEN TREE (2026-10-18, operator directive)

**The operator's rule:** "when you get a stable version push it on the link in repo APK".

**The link:** the README's `Download dvor-8-<version>.apk` points at a GitHub release asset on
`github.com/bezgolovyponch/dvor-8/releases`. The repo also carries `android/` — a WebView app that packages the
game's own files, built by `android/build.sh` with the Android SDK's tools (no Gradle), signed with a key kept
outside the repository so updates install over the previous build.

**The rule, implemented:** `android/release.sh <version> <code>` refuses unless `node tools/chain.mjs` exits 0; it
then builds, creates the release with the measured vector in its notes, rewrites the README's link, and commits only
the README. **Stability is the chain's verdict, not a judgement call** — which is why nothing was published today:
the chain stops at 1 CRITERIA (R1, whole-frame comparability 0.111), and the release script said REFUSED.

