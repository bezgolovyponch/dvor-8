# THE MECHANICS — what is outlined, what is destroyable, and the algorithm that keeps it

The creator's rule, in their own terms: **buildings and cars are the objects that get an outline, and only those
objects can be destroyed. Windows are destroyable but are NOT outlined.**

## The policy table (this is the whole rule)

| kind | outlined? | destroyable? | how it is drawn | how it breaks |
|---|---|---|---|---|
| **building** (house, tower, block) | **YES** — 1 px, the darkest entry | **YES** | drawn plane, 2–3 tones of its own family, drawn window sprites on the photo's column/floor pitch | cells come out storey by storey; a chunk whose support is gone falls; rubble stays |
| **car** (car, truck, bus, van) | **YES** — 1 px, the darkest entry | **YES** | own photo pixels, cut out | scraped one tone → torn along its own edges → small void; remains kept |
| **window** | **NO** | **YES** | dark frame, glass, sill | glass breaks → cracks → darkens → panels leave the frame → the frame falls |
| **tree, bush, ground, road, paving, person, bin, bicycle, street furniture** | **NO** | **NO** | drawn mass (foliage) or the photograph's own layout | not destroyable: the yard bends, the trees and the people do not |

## The algorithm that keeps it — three gates, no prose

1. **One place decides the kinds.** `OUTLINED` and `DESTROYABLE` are sets of kinds in `src/render.js` and
   `src/world.js`. A render or a strike reads them; nothing else may decide.
2. **The renderer draws an outline if and only if the kind is in `OUTLINED`.** No "every visible region", which is
   what produced the rings: an outline that marks everything marks nothing.
3. **A strike hits if and only if the kind is in `DESTROYABLE`.** A person is never a target (the suite asserts it);
   a tree, a bin or the road are not targets either.
4. **A predicate per line of this table lives in `tools/criteria-check.mjs`**, so the rule is checked on every run
   and a criterion without a predicate counts as NOT MET.

## Why the earlier build failed this

The outline was drawn for **every visible region** (so the cars read as rings), and the aim highlight marked
everything at once. Windows were outlined as well, which doubled the rings on every facade. The policy above is now
the only thing that decides, and it is checked.

### The whole frame compared to the accepted one (composition row 10, criterion R1)

The comparability of the drawn frame with the creator's accepted frame is measured by `tools/accepted-frame.py`, the
owner's referee: the accepted frame is extracted from `reference/v10a-accepted-frame-screenshot.png` (lossy VP8 WebP,
art rect exactly 1.25x, HUD/rings/seams masked), and **our** dump and that extraction are measured with the same
family classifier inside the HUD mask. The criterion passes when every family share (white, mullion, blue, other) is
within **0.05** of the accepted's. The extraction reproduces the owner's own cross-check on 11 of 13 lines, which is
the premise; the criterion is the whole-frame comparison, and today it reads worst 0.173 (mullion), so R1 is NOT MET.
