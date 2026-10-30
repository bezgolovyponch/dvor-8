# THE CONCEPT GATE — the look measured on the DRAWN CANVAS, never on a screenshot

## Why

The operator: *"you have to first gather the understanding of the target concept, not just the particular photo."*
A concept is a set of measurable rules about the drawn frame. **The gate cannot be calibrated from a screenshot** — this
was measured, not assumed: `reference/TARGET.webp` and `reference/v10a-target.webp` are two artefacts of the SAME frame and
they agree on only **22.76 %** of their pixels within ΔE ≤ 24, because the HUD, the bezel and the scale differ. Any
percentage taken from a screenshot is a percentage of the screenshot's furniture.

So the gate reads what the app **drew** (`tools/photo-shot.mjs` dumps `#yard` to `canvas.json`, the same file every other
frame gate reads), and the published target is used for two things only: the eye, and the *rules* extracted from it
(`tools/concept-audit.mjs`, which reports the same metrics for any image so the target's numbers can be quoted beside ours).

## The rows

| row | what it measures | why it is the concept |
|---|---|---|
| **flatShare** | the share of the frame in flat areas (runs of one palette index at least 3 px long, no edge) | a pixel-art frame is *flat by measurement*: calm surfaces, no speckle. The target's look is calm walls with crisp detail on top - not noise |
| **transPerPx** | palette-index transitions per pixel along rows and columns | detail density: how much structure the art carries per pixel (mullions, dither, glints) |
| **window sprites** | how many of the drawn objects are window sprites (the engine's own `WN` panes) | the published look's facades are made of panes; a frame with no panes is a photograph, not the look |
| tones / warm | tones in use at ≥ 0.2 % share, and the warm-pixel share | the palette's breadth, and the target's bronze/foliage warmth (the open row, see `AUDIT-COMPLETE.md` §8) |

## The target's numbers, quoted beside ours

Measured with `tools/concept-audit.mjs` at the art's own 288×512: tones **32**, detail **44.62**, sky detail **40.98**,
warm share **1.76 %** whole-frame. Ours: **30 / 43.50 / 43.43 / 0.00 %**. Density and tones match; warmth is the row the
next change must move, and `tools/concept-check.mjs` is where it is judged.
