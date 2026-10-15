# START HERE — for a new chat. Read this, run two commands, continue.

## The one-line brief

DVOR-8: a phone photo of a yard becomes a playable 8-bit level. The frame must look like the creator's accepted
frame (a **drawn** scene: designed sky, drawn facades with window grids, the photograph's own road/cars with one
outline), buildings and cars destroyable with outlines that follow their shape, windows destroyable and never
outlined. Everything else is in `docs/`.

## Run these two, always

```
node tools/preflight.mjs     # the preamble, its load-bearing statements, 19 parts — or nothing starts
node tools/chain.mjs         # criteria → composition → suite → delivery → PAGE → FAMILIES
```

A step that fails names the next action. Steps 0–4 gate continuing; `6 PAGE` and `6b FAMILIES` gate showing.

## The next action, exactly

**Row 65: buildings are not regions.** The live self-evaluation prints
`REGIONS 61 · CARS 4 outlined 4 · worstClusters 1 · WINDOWS 55 outlined 0 · OUTLINED_KINDS 0 buildings`.
The detector's building boxes are dropped between detection and region building, so buildings are never outlined
and never destroyable. Make a building a thing with a mask (largest connected cluster, as cars now are), then
re-run the probe and expect `OUTLINED_KINDS` to contain buildings.

**And behind it, row 66: the sky is painted blue into `idx` (37,435 px, `window.__skyPainted`) and the canvas's top
band still measures grey.** The three candidates and the one-command test are in `docs/PREAMBLE.md` §7.

## The rules that cost the most to learn (all recorded in `docs/`)

1. **The frame is the judge, not the number.** Three times an instrument of mine lied (a comment grepped as an
   import, a wrapper iterated as a list, a screenshot of a transient measured as the frame). Look at the picture.
2. **A thing is one mass** (largest connected cluster). Patches produce outlines around specks.
3. **A window is glass in a light frame**, never a near-black block.
4. **Outlined kinds: buildings and cars only. Destroyable: buildings, cars, windows. People never.**
5. **Never report instead of building where the input exists.** Look → name the one fault → fix → look again.
6. **The photograph is a source of FACTS, not of pixels**: road/ground/cars keep its pixels, sky/buildings/windows
   are drawn.
