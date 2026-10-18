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

## Where the product stands (measured 2026-10-18, the judged photograph)

```
chain     0 PREFLIGHT 19 criteria rows · 0b IMPORTS 48 modules · 1 CRITERIA 19/19 (R1 0.044) · 2 COMPOSITION 10/10
          3 SUITE 321 pass 0 fail · 4 DELIVERY 12/12 · 5 SHEET OK (build hash) · 5b DOCS OK
          6 PAGE left 58, console clean · 6b FAMILIES 37 entries, largest 26% · 6c PAIRING PAIRED IoU 0.85
          6d REFERENCE MATCHES · 6e PLAN 8/8 · 6f MATCH 8 of 8
v13       the operator's engine on the same photo: reference/v13/prague-tower.png
          node tools/v13-check.mjs prague-tower /tmp/v13chk/canvas.json -> 6 of 7 lines FAIL (see docs/AUDIT-V13.md)
```

The other photographs are not in the chain: only the judged photograph builds end-to-end. `tools/v13-check.mjs`
accepts the four reference scenes (prague-tower, prague-street, aerial-church, sunset-bus) and is the gate that will
make the chain universal; it is red today, on purpose, and its lines are the work list.


## The next action, exactly

**Read `docs/AUDIT-V13.md` and take its work list, first line first.** The operator's v13 design file is the reference
now (`docs/V13-ANALYSIS.md` is its line-by-line analysis; `reference/v13/` holds its frames for the four scenes;
`tools/v13-check.mjs` measures the product against them). The first work item is the facade mechanism (V5/V7): the
photograph itself in the working palette with its detected panes recoloured — not a drawn bay grid. The second is the
panes as window objects (V6). Each item is closed only by the gate lines moving, then the whole chain re-runs.

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

## THE PIECE KIT — the fix for the conceptual error (docs/CONCEPT.md)

The game is NOT a photograph-to-pixel-art converter with a game attached. It is a **draft assembled from ready-made,
individually confirmed pieces**, where the photograph supplies only the facts. Build a piece, confirm it alone, then
assemble. Never edit the pipeline and hope.

```
src/pieces/facade.js            PIECE CONFIRMED  (tools/piece-facade-check.mjs: 5 assertions, 0 failures)
                                flat plane in one family's tones + a regular window grid at the pitch
                                MEASURED FROM THE PHOTOGRAPH's own openings; no pixel inside a wall may carry
                                anything but a wall tone or a sprite entry
src/pieces/{sky,window,ground,thing,outline,damage,hud}.js   to build the same way
```

Assembly order, and no pass may write a pixel another piece owns:
**ground -> sky -> facade -> window -> thing -> outline -> damage -> hud**

The game in one sentence: **you photograph your own yard and then you break it.** What is broken stays broken; people
are never targets. The photograph must stay recognisable — that is the identity, not the drawing.

## THE STYLE COMES FIRST (docs/STYLE.md, src/style/index.js, tools/style-check.mjs)

The conversion is primary, and the STYLE governs it: the style is defined and constructed BEFORE a photograph is
converted, then applied. Every value in `src/style/index.js` is measured from the creator's accepted frame
(`reference/v10a-target-hi.webp`) unless marked CHOICE, and `tools/style-check.mjs` measures a converted frame
against it — so "is it in the style?" is a check, not an opinion. Eight conformance lines; seven pass on the current
frame, and the eighth is named with its numbers below.

THE ONE OPEN TENSION, measured: two style lines pull against each other on a DARK photograph.
  * "grey warmth and lightness" wants the dominant grey at lightness 0.35 (the accepted frame: rgb(89,85,95)), which
    needs the converted frame's dark end lifted;
  * "no wash: many tones, none dominant" forbids one tone owning more than 35%, and lifting the dark end makes one.
  Lifting one tone satisfies the spread and misses the lightness; lifting two satisfies the lightness and breaks the
  spread. THE RESOLUTION IS NOT A THRESHOLD: the PLANES (walls, road) must be BUILT in the style's middle register
  from the start — tones 2..4 of the neutral ramps, never 0..1 — so nothing has to be lifted afterwards. That is a
  change in the facade piece (`src/pieces/facade.js` already takes its tones as a parameter: pass tones.slice(2))
  and in the ground's tone choice, not in the style and not in `register.js`.
