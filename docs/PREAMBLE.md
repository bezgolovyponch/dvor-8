# THE PREAMBLE — what every request starts from, by default, without being asked

This file is prepended to every piece of work in this project. It exists because the project kept losing track: each
round began wherever attention landed. Nothing is started, changed or reported before this is read and
`node tools/preflight.mjs` passes.


## 0. THE CONCEPT LOGIC — the causal chain every change must fit into

**The photograph is a source of FACTS, not of pixels.** The facts are: where the sky ends, where each facade stands
and what its column and floor pitch is, where the road runs, which mass is a tree, where the cars and the people are.
Nothing else is taken from it.

**Every kind then has exactly one method**, decided by whether its value IS its appearance:

| kind | source of its look | method |
|---|---|---|
| sky | none — designed | one blue plane, horizon band, designed clouds |
| buildings | layout only | a plane in 2–3 tones + a **regular window grid** on the photo's own pitch + a 1-px outline against the sky |
| windows | layout only | drawn sprites: frame · glass · sill — **destroyable, never outlined** |
| road, pavement, markings, shadows | the photograph | **converted**: 5×5 area mean, one game pixel per block at the same position, never smoothed |
| cars, people, bins, bicycles | the photograph | **converted**: cut out of the reduced picture, one silhouette outline |

**The rules that follow, and never bend:** outlined kinds are **buildings and cars only**; destroyable kinds are
**buildings, cars and windows**; **a person is never a target**; **damage changes the shape, so the outline follows
the shape** (version-stamped cache); **one 50-entry palette** for the whole frame, dithering only in the sky's
horizon band.

**Why the chain of work is what it is:** the facts must be read before the kinds can be drawn (layers 1–3), the kinds
must exist before they can be outlined (4–5), an outline cannot follow a shape that cannot change (6), and nothing
may be shown until the frame can be compared to the accepted one (7). **A step built on a missing earlier step is
the whole history of this project's failures.**

## 1. The task

**DVOR-8** — a photograph of a courtyard, taken on a phone, becomes a playable 8-bit level: the real cars, benches,
windows and walls in it are the targets, and what is broken stays broken. The frame is a **stylish pixelated
reconstruction** of that place.

## 2. The definition of done (verbatim criteria: `docs/CRITERIA.md`; the standard frame: `docs/V10A.md`)

Road, pavement, markings = **the photograph's own layout, pixelated, unmoved** (5×5 area mean, same position). Sky =
**drawn**: one blue plane, horizon band, designed clouds. Buildings = **drawn**: a plane in 2–3 tones carrying a
**regular window grid** on the photo's own column/floor pitch, with a **1-px outline against the sky**. Windows =
**destroyable, never outlined**. Cars = **their own pixels, cut out, one outline**. **Outlined kinds: buildings and
cars only.** Destroyable kinds: buildings, cars, windows — never a person. One 50-entry palette for the whole frame;
no dithering outside the sky's horizon band.

## 3. The critical findings — the ones that must never be re-learned

- **THE CRITICAL BUG:** every instrument I author can be moved by me, and I moved three of them in one session. The
  one instrument that cannot be moved — **the comparison against the accepted frame** — must be wired before any
  claim. *If a bar and the picture disagree, the picture wins; the bar is re-derived or deleted.*
- **A conversion pipeline cannot produce a construction result.** The road and the cars are converted; the sky, the
  walls and the windows are **drawn**. Sixty rounds of conversion polish never produced the frame.
- **An outline that marks everything marks nothing** (the rings on every car). Buildings and cars only.
- **Never measure or show a transient** (the tile counter, the scan wipe, a grade) — three faults were "fixed" that
  were never broken.
- **The reference may be authoritative about style, never about content** (v6 invented trees that are not there).
- **A number whose premises are not printed is not evidence** (R17).

## 4. The chain — the only order of work

```
node tools/preflight.mjs    0  the preamble is present and the project is intact
node tools/chain.mjs        1 criteria · 2 composition · 3 suite · 4 delivery · 5 reference
```

Steps 1–4 gate **continuing**; step 5 gates **showing**. A step that fails names the next action, and the only
permissible report from a broken chain is the step it stopped at.

## 5. The dependency order of the build (from `docs/AUDIT.md`)

1 the reference measurable → 2 the photograph layer → 3 the sky → 4 **the facades** (plane grain-free, grid on top) →
5 the objects and their one outline → 6 destruction **per material** → 7 the HUD and the on-page criteria panel.

## 6. The protocol for every change

**Before:** read this file; find the composition element the change serves (`docs/COMPOSITION.md`).
**While:** one kind, one module, **named after the requirement**, with the requirement quoted in its header
(`src/criteria/*`).
**After:** `node tools/chain.mjs`. Report the criterion/element it closes, with its predicate's output — never a
judgement.
**Never:** adjust an instrument to agree with me; show a frame that has not passed step 5; claim a result whose
premise is not printed.
