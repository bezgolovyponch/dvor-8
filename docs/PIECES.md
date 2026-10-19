# THE PIECES — the bricks the product is assembled from

Rule: **a piece is a brick only when it has a contract, parameters with a source, and its own check that runs on a
synthetic input.** `tools/pieces-check.mjs` is the gate (chain step `0c PIECES`): it refuses a file in `src/pieces/`
that is not registered, and it runs every registered check — a piece that fails its own contract stops the chain.

| piece | contract | parameters, and where they come from | check | state |
|---|---|---|---|---|
| `src/pieces/downscale.js` | photograph → the art grid, by **selection** (not an average) | PixelOE (contrast-aware L selection, chroma medians) | `tools/piece-downscale-check.mjs` | **VERIFIED** — a 3-px line survives, a 1-px line is lost exactly as an area mean loses it |
| `src/pieces/facade.js` | a facade plane + a window-sprite grid at the photograph's own pitch | PROTOCOL 3: the pitch is **measured**, never typed | `tools/piece-facade-check.mjs` | **VERIFIED** — 9×9 grid, 20 windows, 1728 wall px |
| `src/pieces/facade-photo.js` | quad homography → the photo kept, panes recoloured, nothing invented | v13 S8–S11: Heckbert 1989 homography, projection-profile period, Otsu 1979 / Niblack 1986, 4-connected components, frame = largest | `tools/piece-facade-photo-check.mjs` | **VERIFIED** — 30 panes from 5×6 openings, 0 on a blank wall, a trapezoid fits, a 10-px comb returns 10 |
| `src/pieces/sky-style.js` | sky mask + palette → a deterministic plane-and-cloud field | v13 S6: two-octave value noise (Perlin lineage), shade sampled 2.5 px higher, threshold lifted toward the zenith and pushed toward the horizon (D25 — the reference's `-(ys-150)/60*0.2` is top-heavy and S1 requires a plane at the zenith) | `tools/piece-sky-check.mjs` | **VERIFIED** — 6 of 6 promises; cover **27.0 %** against the reference's own ~28 % |
| `src/pieces/ground-planes.js` | one paved pad + the photograph's luma → its own two planes and its closed paint | v13 S2–S3 (selection per block + mode passes) · the split at **40 %** (the reference's own dark-plane share, D26) · the closing (morphology) | `tools/piece-ground-check.mjs` | **VERIFIED** — 5 of 5 promises; the darker plane is **40.9 %** of the synthetic asphalt, the stripe and its 1-px gap are filled, 0 isolated |
| `src/pieces/working-palette.js` | a frame + the palette → at most 22 tones | v13 S1–S2: a 50-entry master palette, a working subset by popularity, nearest-entry remap | `tools/piece-working-palette-check.mjs` | **VERIFIED** — 4 of 4 promises: the cap holds, outline/void pinned, **0 of 85 869** remapped pixels crossed a surviving family, deterministic |

## The extraction proof (how a refactor is accepted here)

The sky's style was lifted out of the monolith verbatim. The proof that it is the *same* brick and not a
reinterpretation: **the frame after the extraction is byte-identical to the frame before it** — the same
`canvas.json` `px` string on the judged photograph, 0 differing pixels. A piece is accepted when its check passes AND
its extraction changes no pixel; anything else is a new design and must go through the gates as one.

## Two bricks were found by extraction (the bricks-first method paying for itself)

- **The ground's erosion had never run.** Lifting the road block into a piece exposed that its erosion test read
  `pad[p2 - 1]` where `pad` was the pad *object*, so the neighbour count was always 4 and the paint mask was only
  **dilated**. The piece implements the intended closing — and the measurement says the dilation-only version is
  **better**: with the intended erosion the judged frame reads V3 57.3 % (against 50.2 %) and V7 55.99 % (against
  55.39 %), because more paint mass on the ground lowers the asphalt's dominant share. The erosion therefore stays in
  the piece **switched off, with its numbers**, and the frame is byte-identical to the shipped one.
- **A 1-px stripe cannot survive a surface mean.** The same check caught my own test fixture assuming it could; the
  fixture now uses a surface-sized mark, which is what the piece's rule implies.

## What is still inside the monolith (the pending bricks, in pipeline order)

A brick is only a brick when it can be checked alone; these are the ones still inline in `src/vector.js`, with the
contract they will have when lifted (the same shape as the sky's):

| stage | the inline block | the brick it becomes | its check will assert |
|---|---|---|---|
| the reduction | "AREAS FIRST" + the register lift | `pieces/reduce.js` | a per-block selection, the ground's own tones carried, one mode pass per stage |
| the outline | 5i's 1-px line against the sky | `pieces/outline.js` | exactly 1-px, only where a building or a car meets the sky, never on a window |

## The assembly (once the bricks are finalised)

`docs/PROTOCOL.md` §2 is the pipeline; the assembly is that pipeline expressed as the pieces in order:

```
photograph → downscale → palette → sky region → facade geometry (facade-photo) → reduction → objects → outlines
             → the sky's style (sky-style) is painted last, over the frame's own mask and its measured skyline
```

Each arrow is a piece with its own check, and the *frame* gates (`v13-check`, `concept`, `delivery`, `match`, …) judge
only the assembled result — never a piece's internals. That is the difference between tuning a result and building a
product: the pieces carry the method, the frame carries the proof.
