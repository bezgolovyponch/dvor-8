# DETERMINISM — a contract of the algorithm and the analyzer, defined BEFORE either is extended

WHY THIS FILE EXISTS BEFORE THE FIX. Determinism cannot be recovered after the fact: if the unified
algorithm and its analyzer are built first and made reproducible later, every number they produced before
that point is unattributable (this repo measured two UNPATCHED runs differing by 3237 px, and every pixel
claim made earlier inherits that noise). So the contract is defined here first, from real published
practice, and the algorithm and the analyzer are then built/adjusted to satisfy it.

## 1. THE REQUIREMENT (one sentence, two subjects)

  ALGORITHM:  same photograph + same seed + same code  =>  byte-identical 288x512 frame.
  ANALYZER:   same frame dump + same code              =>  identical numbers, no network, no clock.

A frame that cannot satisfy this is not "noisy", it is UNDEFINED: its measurements are not evidence.

## 2. SOURCES (published, read and adjusted - not invented)

  - mulberry32 - Tommy Ettinger's published 32-bit PRNG, public domain. ALREADY VENDORED IN THIS REPO as
    `src/rng.js: export function mulberry32(seed)`. It is the project's own published-evidence baseline.
  - splitmix64 / xoshiro256** - Sebastiano Vigna, "Scrambled Linear Pseudorandom Number Generators",
    ACM TOMS 2021 (https://arxiv.org/abs/1805.01407). The standard answer when a 32-bit state is too
    short for a long build: seed expansion by splitmix64, stream by xoshiro.
  - PCG - M. E. O'Neill, "PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for
    Random Number Generation" (2014, https://www.pcg-random.org/paper.html). Third independent family, so a
    choice here is multi-source and not a preference of ours.
  - Deterministic rendering as a contract (state -> output, no hidden inputs): the same discipline used by
    reproducible-build practice (https://reproducible-builds.org/docs/) - no time, no network, no
    unordered iteration, in the render path.

## 3. THE RULES (each is checkable, and each has bitten this repo already)

  R1 no `Math.random` may be REACHED during a build. A module may DECLARE `rnd = Math.random` as a default,
     but every construction call site must pass a seeded generator. Measured defaults today:
       src/weather.js:77  src/world.js:144  src/world.js:196  src/world.js:388
       src/disaster.js:90  src/lore.js:39
  R2 no network-fed content may be drawn into the frame. Bitten: the news ticker put fetched headlines into
     the sky band (rows y=2..23, 172-255 differing px per row); `?news=0` exists for the gate.
  R3 no wall-clock, no Date.now(), no performance.now() in the render or analysis path.
  R4 iteration over Map/Set/object keys must not decide pixel order; where it does, sort by a stable key.
  R5 the seed enters at ONE place (the build entry point) and is recorded with the frame, so any frame can
     be reproduced from its dump alone.

## 4. HOW IT IS VERIFIED (the gates that must exist before the next feature)

  G-DET-FRAME   `node tools/detgate.mjs`
                two unpatched captures, same photo, same settings; judged by the published pixelmatch
                6.0.0 + pngjs 7.0.0 (threshold 0.1, 288x512); prints premises; bar 500 px.
                readings so far: 3237 px (unpatched) -> 2063 px (news ticker off) -> target <= 500.
  G-DET-ANALYZE (to add) run any analyzer twice on the SAME dump and require identical output bytes.
  G-DET-SEED    (to add) build twice with the same explicit seed, require 0 px; build with a different
                seed and require > 0 px (a seed that changes nothing is not a seed).

## 5. THE DECOMPOSITION LADDER (what to do when a level refuses)

  Level 1  WHOLE-PAGE capture is not reproducible
             -> drop to the module that differs (read the row/column distribution of the differing pixels).
  Level 2  A MODULE is not reproducible (e.g. weather, world, lore)
             -> drop to the function that rolls: pass the seed explicitly at its call site.
  Level 3  A FUNCTION still differs (its caller cannot supply a seed)
             -> pin the value at the boundary: freeze the drawn result, record it as a CHOICE with reason.
  Level 4  A VALUE cannot be pinned without changing the picture
             -> the value is a STYLE constant: it moves to src/style/index.js with its measurement, and the
                analyzer treats it as a premise (printed), never as a hidden input.
  At every level: fix, then re-run THE WHOLE CHECK (preflight -> imports -> chain -> criteria -> suite ->
  style -> palette -> pairing -> baseline -> detgate) and only then go to the next queue entry. A level that
  is dropped is recorded in RUNLOG.md with the measurement that forced the drop.

## 6. STATUS (evidence, 2026-10-16)

  SUPERSEDED READINGS - DO NOT QUOTE. The readings 3237 / 2063 / 2846 px and the geometry "(2,26)..(2,29)" were taken
  from /tmp/det-a|b dumps that have since been OVERWRITTEN; an independent audit re-measured the stored pair at
  1547 exact / 1584 judged px and the current whole-cell pattern at (12,39)-(12,41) and (22,47)-(22,49). The
  claims "rows y=2..23, 172-255 differing px per row" and "worst rows y=221..228 at 34 px each" are FALSE against
  every dump on disk and are retracted. The live reading is now 0 px (Q9.2, see below).


  detgate 2063 px of 147456 (1.40%), bar 500 -> FAIL. Differing rows after the news ticker was switched
  off are NOT in the headline band (y<40 carries 100 px of 2846 exact differences); worst rows y=221..228
  at 34 px each = a drawn element re-rolling. R1 is therefore the open rule; Levels 1-2 are the live path.

## 7. LEVEL-2 FINDING (2026-10-16) - it is probably NOT the renderer

  Decomposed the 2846 exact differing px of the two unpatched runs: the worst cells are WHOLE 8x8 cells that
  differ completely ((2,26)..(2,29) at x~16-23 y~208-239; (21,27)..(21,28) at x~168-175), and the differences
  split 1526 above / 1320 below the horizon. A cell that changes ENTIRELY is a bay that took a different
  branch (white panel vs glass), i.e. its DECISION input moved - not a dithered colour.

  The decision is `bayLight = bayLuma > wallMedian`, and both come from the WALL MASK, which comes from the
  neural scene parse. ONNX Runtime's threaded reductions are not bit-reproducible, so the parse can shift a
  mask edge between runs and flip a bay. Therefore the next measurement is at the PARSE BOUNDARY, before
  touching the renderer:

    G-DET-PARSE  run the parse twice on the same photograph and diff the mask (or its area per class).
                 PASS = identical masks. Only if it passes is the renderer the culprit.

  Published remedy if it fails, from ONNX Runtime's own documentation (session options, not our invention):
  `intraOpNumThreads = 1`, `interOpNumThreads = 1`, `executionMode: ORT_SEQUENTIAL`, and a fixed
  `graphOptimizationLevel` - the standard reproducible-inference configuration.

## 8. Q9.2 RESULT - THE HYPOTHESIS IN §7 WAS WRONG, AND THE LADDER SAID SO

  The §7 guess (the neural parse is not bit-reproducible) was REFUTED by measurement, level by level:
    L2 parse      G-DET-PARSE   the parse run TWICE on one stored canvas: 0 px differ, 11 masks + horizon identical
                                across two page loads (sky hash 1464554359 four times). ONNX is bit-reproducible here;
                                no session options were needed, and src/scene-parse.js:47 already sets
                                env.backends.onnx.wasm.numThreads = 1.
    L2 detector   G-DET-DETECT  MediaPipe EfficientDet-Lite2 twice per load: 58/58 raw and 5/5 merged identical.
    L2 build      G-DET-WORLD   window.__world hashed across two builds: all 20 fields SAME. The build was ALREADY
                                deterministic.
    L3 function   G-DET-RENDER  at a fixed world, the real input named at the call site: particles 49->48 and
                                fx.clock 30.13->31.40 BETWEEN TWO FRAMES OF ONE BUILD.
  CAUSE: the free-running SIMULATION PHASE, not a re-rolled decision. No `rnd = Math.random` default is reached
  (makeWeather('clear') reads rnd only when kind === 'storm'; every other site passes the seeded stream, and
  rollOver/breakCells/chip are reached only with an explicit rnd) - seeding them would have been a measured no-op.
  FIX KEPT: `?clock=<s>` pins the animation clock, dt, fx.clock and the simulate block, all inside `if (clockPin >= 0)`
  so product expressions are unchanged; detgate reads the pin BACK from both captured pages and WITHHOLDS the verdict
  (exit 2) when it did not arrive - proven: unpinned `-1@32.33 · -1@32.28`, 2308 px, exit 2; pinned `7.5@7.5`, 0 px, exit 0.
  LIVE READING: detgate 0 px (bar 500) - PASS. Product claim that remains open: a gate wanting the game PLAYING
  reproducibly still needs the seeded rnd at the call site; the frame gate does not.
