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

## The next action, exactly

**The sky.** It is painted blue into `idx` — measured: the right palette entry (`rgb(86,118,185)`) over 37,435 px,
read from the page as `window.__skyPainted` — and the canvas's top band still measures
`34% pale grey · 31% mid grey · 24% dark grey · 4% blue`. One of three things is true, and the test that decides
between them is written in `docs/PREAMBLE.md` §7: read the canvas's own top band and `__skyPainted` in the SAME run.

- **band blue there** → the product is right and my capture is wrong (the fourth instrument lie to fix);
- **band grey there** → the overwrite is real: bisect the passes after the sky paint, one dump per stage.

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
