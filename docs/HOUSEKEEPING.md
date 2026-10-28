# HOUSEKEEPING — what was removed, and why

The operator's instruction: *"make some housekeeping, clean old mess and failures, reiterate with working proven code
from external sources."* This is the list, with the evidence for each row.

## Removed

| what | evidence it was dead | replaced by |
|---|---|---|
| `src/pieces/quad-lines.js` (8 063 bytes) | nothing in `src/` imported it: the Hough snap was tried for the tap→quad step and **rejected on measurement** (it landed on a glass tower's own pane row: `[[76,103]…[95,176]]` inside the building) | the tap's plain quad + the four draggable handles |
| `tools/piece-quad-lines-check.mjs` | its only caller was the piece registry row for the module above | — |
| `src/style/ref-style.js` (4 333 bytes) | nothing imported it | the HUD is styled by `style.css` against the template's own ratios (`0g HTML`) |
| the pieces-registry row for `quad-lines` | the gate now reads **9 of 9** verified bricks, not a count padded with a piece the flow never touches | — |
| the **band-of-chunks** destruction model (mine) | it measured **0.00 %** as the reference's model did not; the app's damaged frame drifted from the engine's (the operator's "half-erased slab", "cars are not destructible") | **the engine's own model**: `damageAt` at the impact point, the four-step ladder on one piece — back to **0.00 % (0 px)** against the engine's damaged frame |
| the ledger's `damage.heavyGone` / `damage.lostPx` rows | they locked *my* band model's numbers | the identity row `app.damagedPx = 0`, restored (reversal recorded in `docs/ledger-history.md`) |
| the detector's **tile counter** in the banner (`ИЩУ ВЕЩИ 14/14`) | "14" reads as a target count; it is how many detector tiles a photo needs (the operator asked twice) | the banner shows `ИЩУ ВЕЩИ…` while it works, and clears when it is done |

## Kept, though they look like duplication — and why

- **Two destruction paths**: the engine's (engine frames) and the app's hp model (vector frames). That is deliberate:
  the vector route is the fallback for photographs without an annotation. The proven path is the engine's; the fallback
  is documented as a fallback in `docs/PIECES.md`, and its hp values are what the suite's criteria name.
- **`src/ref/engine.js`** (a generated copy of the operator's class): not duplication but the byte-exact artefact, gated
  by `0d ENGINE` (sha256 + the operator's own FNV).

## The rules this pass leaves behind

1. A module nothing imports is not part of the product: either it is wired and gated, or it is deleted (this pass).
2. A model that measured 0.00 % against the reference may not be replaced by an invented one without proving the new one
   on the reference's own terms first (the band mistake).
3. A number in the UI must name what it counts (the "14").
