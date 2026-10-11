# ДВОР-8 / DVOR-8

You are on a balcony. The yard below is ordinary. You scan it, and everything the scan recognises is
replaced by its 8-bit copy — then you can knock things over with a rock. There are no people to hurt and
nothing is scored by how much you break.

**Web first.** No build step, no dependencies, no key needed.

## Run it

    python3 -m http.server 4310 --bind 127.0.0.1

Open `http://127.0.0.1:4310/`.

## Play

| Action | Control |
|---|---|
| look along the yard | `←` / `→` or `A` / `D` |
| scan the yard | **СКАНИРОВАТЬ ДВОР** |
| throw a rock | click the yard |
| start over | **ЗАНОВО** |

The scan is the opening move: it recognises all 32 objects and swaps each one for its pixel form. Six rocks.
A bin takes two hits, a bench two, a tree three.

## Test

    node test.mjs

27 checks: the yard is deterministic and inside its bounds, the scan recognises everything and cannot
double-count, a throw costs a rock and hits what was aimed at, destruction is counted, rocks run out, and
the look obeys the pinned 2D art standard — five parallax layers at increasing speeds, atmospheric
perspective from 20% to 100% saturation, every colour on the 8-step ladder.

## Structure

    index.html          the page: a frame, a HUD, three buttons
    style.css           plain, so nothing competes with the yard
    src/state.js        the world: layers, object kinds, what a hit does
    src/yard.js         the yard, generated from a seed — deterministic, testable
    src/palette.js      the 8-bit palette, with the saturation band enforced per depth
    src/sprites.js      each object drawn twice: real, and its 8-bit copy
    src/render.js       five parallax layers, the camera, the balcony rail
    src/scan.js         the scan, and the seam where an LLM recogniser plugs in
    src/throw.js        one rock, one arc, one hit
    src/main.js         the loop and the controls
    standards/          the pinned 2D art standards this look obeys
    docs/routing.md     what the previous project learned about free-tier LLM routing
    brief.md            the intake: twelve answered questions, Gate G0 met
    game-skeleton/      the seven files of the game-creation skeleton

## Where this came from

Built from `Game Skeleton Master Prompt.md` at `/Users/m/Documents/`. The intake is complete: all twelve
Phase 0 questions answered, **Gate G0 met**, so the research phases may begin. The seven skeleton files
exist with their run states recorded rather than filled with placeholders.

The look is checked against the 2D art standards in `standards/`, which are pinned: five parallax layers at
0.05 / 0.15 / 0.40 / 0.75 / 1.00, and saturation rising from 20% in the sky to 100% in the gameplay layer.
**8-bit is a look, not a limit set** — the brief's Q3 settled that, so there is no resolution, palette-size
or input restriction except the 8-step colour ladder the era implies.

## What this is not yet

- **No camera scan.** `src/yard.js` generates the yard from a seed; a real scan that reads a photograph
  replaces that one module and nothing else.
- **No LLM recogniser.** `src/scan.js` has the seam — an async `recognise` function and a `source` field —
  and the routed implementation is not written. See `docs/routing.md`.
- **No residents.** The concept names a courier and angry drunks; neither exists yet. The scan's interface
  deliberately returns object kinds only, so adding people is a product decision rather than a plumbing one.
