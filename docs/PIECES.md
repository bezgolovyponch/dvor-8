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

## The extraction proof (how a refactor is accepted here)

The sky's style was lifted out of the monolith verbatim. The proof that it is the *same* brick and not a
reinterpretation: **the frame after the extraction is byte-identical to the frame before it** — the same
`canvas.json` `px` string on the judged photograph, 0 differing pixels. A piece is accepted when its check passes AND
its extraction changes no pixel; anything else is a new design and must go through the gates as one.

## What is still inside the monolith (the pending bricks, in pipeline order)

A brick is only a brick when it can be checked alone; these are the ones still inline in `src/vector.js`, with the
contract they will have when lifted (the same shape as the sky's):

| stage | the inline block | the brick it becomes | its check will assert |
|---|---|---|---|
| 5e / v13 S2–S3 | the road/pavement block (1 300 lines in) | `pieces/ground-planes.js` | the two-plane split at the photograph's own 40 % share · the paint mask closed · five mode passes · no isolated tone |
| the reduction | "AREAS FIRST" + the register lift | `pieces/reduce.js` | a per-block selection, the ground's own tones carried, one mode pass per stage |
| the outline | 5i's 1-px line against the sky | `pieces/outline.js` | exactly 1-px, only where a building or a car meets the sky, never on a window |
| the palette | `src/style/working-palette.js` (already a module, not yet under `pieces/`) | `pieces/working-palette.js` | ≤ keep tones · structural entries pinned · the same-family remap law · deterministic |

## The assembly (once the bricks are finalised)

`docs/PROTOCOL.md` §2 is the pipeline; the assembly is that pipeline expressed as the pieces in order:

```
photograph → downscale → palette → sky region → facade geometry (facade-photo) → reduction → objects → outlines
             → the sky's style (sky-style) is painted last, over the frame's own mask and its measured skyline
```

Each arrow is a piece with its own check, and the *frame* gates (`v13-check`, `concept`, `delivery`, `match`, …) judge
only the assembled result — never a piece's internals. That is the difference between tuning a result and building a
product: the pieces carry the method, the frame carries the proof.
