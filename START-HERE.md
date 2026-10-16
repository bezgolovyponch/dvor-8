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

## Where the self-evaluation stands (measured in the live page)

```
REGIONS 65 · HOUSES 6 — outlined 6/6, one mass each      ← row 65, DONE
           · CARS 4 — outlined 4/4, one mass each        ← worst clustering was 24 patches, now 1
           · WINDOWS 55 — outlined 0/55                  ← destroyable, never outlined
page: 65 targets · console clean · 116 tones, largest 31% (no collapse)
```

Buildings exist as things because **COCO has no building class**: they are the world's own `structures` (6 on the
creator's photograph), turned into regions.

## Where the product stands (two unseen photographs, both measured)

```
photo 1  Prague street      64 targets · sky 31% · 85 tones · largest non-sky entry 27% · console clean
photo 2  balcony car park   93 targets · sky 38% · 22 tones · largest non-sky entry 28% · console clean
gates    preflight OK · imports clean · tones no collapse (sky exempt) · page builds
proven   each gate REFUSES a mutation: a deleted import, a synthetic wash, an altered load-bearing statement
```

## The next action, exactly

**The cut-out's colour, and it must be done inside `styliseVector`.** A car keeps its pixels but not its colour: the
areas-first reduction averages a whole region into the wall's tones, so a red car, a white van and a dark estate all
come out neutral. It was attempted as a post-pass over `world.idx` in `main.js` and it BROKE the build (an empty yard
with a clean console, because the throw was swallowed by the build's own try/catch) - the reason is recorded in the
source where the attempt was. The fix belongs at the point the region's pixels are REDUCED: give each region its own
family (saturation >= 0.30 never resolves to concrete) and choose tones inside it.

Then: the checkered facade (every second bay one tone up, only where the photograph shows it), and the last typed
constants (cloud inset, pitch floors, the smoothness bound) derived from the picture.

## The next action, exactly

**The clouds do not reach the frame: cloud-white measures 0% of pixels.** Measured progress on the sky this round:
blue **3% → 34%** of the frame, by making the sky region the class map's own sky candidates and painting it, then its
clouds, LAST. What remains is one cause, identified: **`cls[]` is REUSED** — the wall pass writes `cls[p] = 1` for
walls, so by the time the cloud block asks `cls[p] === 1` to mean "sky", the map no longer says sky. The fix is to
**snapshot the sky-candidate set into its own array at the moment the sky analysis computes it** (`skyCand = cls.slice()`
there), and use that snapshot for the sky region, the skyline and the cloud placement. One line of snapshot, three uses.

**After that: the frame is neutral where the accepted frame is blue** — the facades carry the photograph's grey-blue
in three tones instead of drawn planes under a designed sky (`docs/V10A.md` is the target, element by element).

## The rules that cost the most to learn (all recorded in `docs/`)

1. **The frame is the judge, not the number.** Three times an instrument of mine lied (a comment grepped as an
   import, a wrapper iterated as a list, a screenshot of a transient measured as the frame). Look at the picture.
2. **A thing is one mass** (largest connected cluster). Patches produce outlines around specks.
3. **A window is glass in a light frame**, never a near-black block.
4. **Outlined kinds: buildings and cars only. Destroyable: buildings, cars, windows. People never.**
5. **Never report instead of building where the input exists.** Look → name the one fault → fix → look again.
6. **The photograph is a source of FACTS, not of pixels**: road/ground/cars keep its pixels, sky/buildings/windows
   are drawn.

## Driving the page from a browser plugin (no harness, no file picker)

```
open  http://127.0.0.1:4312/game/index.html?clean=1&photo=/game/photos-test/v10a.jpg
wait  ~8 s (the note reads «нашёл за N с: машина ×4, окон N»)
click button|ПРОВЕРИТЬ        # the on-page self-test panel
screenshot                    # and LOOK at the frame
```

Two documented test hooks make this possible, both inert unless the parameter is present:
`?photo=<url>` loads a photograph through the **same handler as the picker** (a test runner cannot set a file input,
and a synthetic File hung the decoder); `?test=1` reveals the inputs for a runner that needs them.
