# THE FUNDAMENTAL ISSUE — measured on a photograph the pipeline loses completely

Written at T+137, after the operator photographed the result on their phone and it showed **13 named targets, no
windows, no cars, and diagonal spill** over a grey picture. Reproduced and measured on the project's own photographs.

## The evidence

| | a photograph the tune was fitted to (`5.jpg`) | a photograph it was not (`b.jpg`) — same failure class as the screenshot |
|---|---|---|
| the facade bay grid | `bays: 2880, drawn: 798, px2: 8, py2: 6, spritePx: 36492` | `bays: 0, drawn: 0, px2: **432**, py2: **45**, spritePx: 0` |
| window regions | 513 | 69 |
| **glass in the picture** | **32.5 % of the frame** | **0.0 % of the frame** (not one pane pixel) |
| cars | 4 | 8 |
| what the operator sees | a street with windows, cars, a road | a grey mush with stray ink and stripes |

A pitch of **432 px on a 288-px-wide frame**, and a vertical pitch of 45, is *impossible geometry*. Nothing rejects it.
The bay loop then divides the facade by 432 and draws nothing, the checker pass uses the same pitch and paints huge
diagonal cells (the "spill" in the screenshot), and the frame is left with no windows at all — while the HUD truthfully
reports 13 objects, because the *regions* exist. The picture and the model disagree, and no gate noticed.

## Why every gate passed while the product failed

Every frame gate measures **shares**: distinct tones, the dominant tone's share, a region's IoU, a distance. On `b.jpg`
the frame still *has* structure (a bench, a road, a wall), so every share is plausible — and the one thing that
matters, *"are the windows drawn?"*, is not a share. There is no gate on **derived-geometry validity** and none on
**"a target with pixels in the model and none in the picture"**. The v13 lines, the chain, the six verified bricks: all
of them measured the photograph the tune was fitted to.

## The definitive answer: the painting was built to the reference; the FINDING was not

The operator's engine (`tools/v13/engine-v13.txt`) never has this failure **because it is told the geometry**: every
scene carries `sc.buildings` (quads with clips), `sc.cars` (boxes) and `gY` by hand — S8–S11 only ever *paint against*
a given quad, never search for one. What this project imported from it is the **painting**: S5 (sky region), S6 (sky
style), S8–S11 (facade lattice), S14 (pieces). What it did NOT build to the same standard is the **finding**: the
skyline, the building instances, the parking spaces, the car boxes — the layer that turns a photograph into the
geometry the engine is given for free.

That layer in this codebase is implicit: it lives across the parse's masks, the plan, the wall pass and three
different pitch fits, with no contract, no check, no refusal and no fallback. So it does what unguarded heuristics do:
it produces a number for every input — 432 px — and the pipeline has no way to know the number is impossible.

**The rule this project already wrote applies and was not applied to this layer:** *a gate that cannot fail is not a
gate*, and *the artefact wins over the bar*. The finder had no gate, so it could not fail, and it was believed.

## The missing brick (the next one, and it is the important one)

`src/pieces/lattice.js` — **derived geometry with a validity contract**, the brick every other brick already assumes:

1. **contract**: from a facade's rectified profiles → (pitch, phase, rows, cols) with a *validity test*: pitch within
   `[3, w/4] × [3, h/8]`, at least two rows and two columns inside the instance, and a measured pane coverage.
2. **refusal + fallback**: an invalid fit is not used. The fallback is the pane boxes the facade-photo piece already
   found (b.jpg: **120 panes**, 20 150 owned pixels — they exist and are thrown away), drawn as the window sprites.
   If there are none either, the facade is marked **unreadable** (`window.__unreadable`), its wall is painted flat, and
   the picture never shows diagonal spill.
3. **check** (`tools/piece-lattice-check.mjs`): a synthetic comb with a known pitch returns it · a 432-px pitch is
   REJECTED · a blank wall returns "no lattice" · the fallback returns the panes it was given · the piece is
   deterministic.
4. **frame gates** (the two lines that would have caught the screenshot):
   - `every window region has drawn pixels` — b.jpg reads **0 of 69**, `5.jpg` 513 of 513;
   - `no derived pitch exceeds the frame's own bounds` — b.jpg's 432 against the bar 72.

Until that brick exists and is wired, the honest claim about this product is exactly what the screenshot shows: **it
paints well on the photograph it was fitted to, and it degrades silently on the next one**, because the layer that
finds the geometry has never been held to the same standard as the layer that paints it.
