# THE STRATEGY — how the blockage is passed, issue by issue, with its dependencies

## The blockage, exactly

`R1` (compare the result to the accepted frame) cannot run on a **screenshot**. The tool is built and works; its
input is not art. Two attempts measured the black page background instead of the frame, because the frame sits
inside a wide dark page and every automatic locator I wrote searched only symmetric margins. The honest statement is:
**the comparison is blocked on its INPUT, not on the tool.**

## The solution, in order of reliability

1. **Feed it ART: the 288×512 PNG of the accepted frame.** Exported from the design file it is exactly the game grid,
   one sample per pixel, no capture artefacts, no locator needed. This is the path to take; it makes `R1` a real
   measurement in one step.
2. **If it must come from a screenshot**, the locator needs a real search: candidates are *rectangles* whose reduced
   image has (a) a bright, low-chroma band at the top — a sky — and (b) flat structure below it. Symmetric margins
   cannot find a phone inside a wide page; a sliding rectangle can. Median-of-block sampling is already implemented
   and is what makes a screenshot measurable at all (it cut the reference from 30,152 colours to 5,141).

## The guidance that follows from it, kept as a rule

**A measurement may only be compared when both sides are the same KIND of thing.** Art against art, canvas dump
against canvas dump. A screenshot photographed off a phone is a third kind, and it may be used to *judge* a frame by
eye — never to produce a number that another number is compared against. That is the same lesson as R17 (the
instrument states its premises) applied to the reference.

## The issues, in dependency order — each one blocks the next

| # | issue | depends on | how it is verified |
|---|---|---|---|
| 1 | **The reference input**: the 288×512 PNG of the accepted frame | nothing | `reference-check.mjs` prints the reference's own measures and they look like art (tens of colours, flat ≥ 55%, strays ≤ 3%) |
| 2 | **Wire `R1` as a hard line** in `tools/deliver-check.mjs` | 1 | the rule exits non-zero while my frame differs, and prints COMPARABLE only when it does not |
| 3 | **The photograph layer through `RoadRule`** (done: 5×5 blocks, same position, never smoothed) | — | `P2` predicate, now written |
| 4 | **The facades through `FacadeRule`** (done: plane + regular window grid + outline) | 3 | window sprites counted per frame; the wall reads ≤ 8 tones |
| 5 | **`P3` the single car outline** — outlines only buildings and cars (done), each car cut out of the reduced picture (done), the outline from the owner map (done) | 3,4 | `O1`/`P3` predicates |
| 6 | **`I1` the damage ladder per material** — brick, glass and metal each break by their own ramp | 5 | the suite's ladder check plus a per-material predicate |
| 7 | **`I3` the baseline panel ON THE PAGE** with its re-run button — the accepted frame shows its checks in the picture, mine only in a terminal | 2 | the page runs `criteria-check` in the browser and prints MET/NOT MET per criterion |
| 8 | **`F1` one palette across the frame** and **`F3` strays** | 4,5 | the gate's palette and stray rows on a clean dump |

**The order is not a preference: 1 and 2 come first**, because until the comparison is real I have no way to know
whether 3–8 are closing the gap to the accepted frame or moving away from it — which is exactly how the whole
project drifted while its own checks passed.
