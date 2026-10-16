# THE REFERENCE — the accepted design, and how it may be used

| file | what it is | how it may be used |
|---|---|---|
| `v10a-target.webp` | the creator's **accepted frame** — a photograph of the phone screen (`docs/shots/target-v10a.webp`) | **comparison BY EYE only.** It is a third kind of artefact (a screen photographed, then re-encoded), so it can never produce a number that another number is compared against |
| `current.webp` | our frame at the time of the comparison, same kind | eye only, same reason |

## Why the mechanical check refuses it

```
node tools/reference-check.mjs <my-canvas.json> reference/v10a-target.webp
→ THE REFERENCE COULD NOT BE READ AS ART: best candidate 11-28% flat. No verdict is given.
```

The tool is right to refuse: it locates a regular art grid, and a phone screenshot has the phone's own scaling and
soft pixels on top of the art. Producing a number from it would be exactly the fault this project has paid for six
times — a measurement of something that is not the thing being measured.

## What IS comparable, and must be

- **canvas dump ↔ canvas dump** (both 288×512, exact palette indices): `tools/family-check.mjs`, `tools/photo-shot.mjs`
- **frame ↔ frame, art to art**: only when the accepted frame exists as a 288×512 PNG export of the game itself.
  **That export is the missing artefact of this project.** Until it exists, the design comparison is done by eye —
  and by eye is how every real improvement in this project was found.

## The design elements to check by eye, from the accepted frame

1. sky: one flat blue plane, large white cloud masses, **no speckle**
2. towers: smooth planes with a fine regular window grid, floor by floor
3. the mid-rise: a clean **checkerboard** of light and dark tiles
4. outlines: **none on undamaged, un-aimed things**; a thin dark line on the vehicles
5. HUD: `РАЗБИТО n` left, danger meter right, and the bottom bar — info · current weapon (▴) · СТИХИЯ · big yellow throw
