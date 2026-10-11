# ДВОР-8 / DVOR-8

You are on a balcony. The yard below is ordinary. You scan it, and everything the scan recognises is
replaced by its 8-bit copy — then you can knock things over with a rock. There are no people to hurt and
nothing is scored by how much you break.

**Web first.** No build step, no dependencies, no key needed. With a free model key the scan also asks a
model to name what it found — one small request per scan, routed across free tiers.

## Run it

    python3 -m http.server 4310 --bind 127.0.0.1

Open `http://127.0.0.1:4310/`.

**On a phone, same Wi-Fi:** bind to every interface instead and open the computer's address:

    python3 -m http.server 4310 --bind 0.0.0.0
    ipconfig getifaddr en0        # e.g. 192.168.88.237 → http://192.168.88.237:4310/

This serves the whole folder to everyone on that network for as long as it runs. Stop it with Ctrl-C.

## Play

| Action | Control |
|---|---|
| look along the yard | `←` / `→`, `A` / `D`, or hold **◀ ▶** |
| change how you see it | **ТРЕЗВЫЙ · ТРАВА · АЛКОГОЛЬ · ДЕПРЕССИЯ** |
| scan the yard | **СКАНИРОВАТЬ ДВОР** |
| throw a rock | click or tap the yard |
| start over | **ЗАНОВО** |

The scan is the opening move: it recognises all 32 objects and swaps each one for its pixel form. Six rocks.
A bin takes two hits, a bench two, a tree three.

## Test

    node test.mjs

52 checks: the yard is deterministic and inside its bounds, the scan recognises everything and cannot
double-count, a throw costs a rock and hits what was aimed at, destruction is counted, rocks run out, and
the look obeys the pinned 2D art standard — five parallax layers at increasing speeds, atmospheric
perspective from 20% to 100% saturation, every colour on the 8-step ladder. Eleven of them cover the
routed scan against a stubbed network: one request per scan, a `429` cools the lane and the next one serves,
a `413` is split, a rejected key is not a cooldown, and with the network down the yard is still recognised.

## Structure

    index.html          the page: a frame, a HUD, three buttons
    style.css           plain, so nothing competes with the yard
    src/state.js        the world: layers, object kinds, what a hit does
    src/yard.js         the yard, generated from a seed — deterministic, testable
    src/palette.js      the 8-bit palette, with the saturation band enforced per depth
    src/sprites.js      each object drawn twice: real, and its 8-bit copy
    src/render.js       five parallax layers, the camera, the balcony rail
    src/scan.js         the scan; `source` says whether a model's names were applied
    src/recognise.js    one bounded model call per scan, down the free-tier cascade
    src/llm.js          providers, limits and the router, carried over from partner-sim
    src/throw.js        one rock, one arc, one hit
    src/main.js         the loop and the controls
    standards/          the pinned 2D art standards this look obeys
    docs/filters.md     the four looks: every decision, its source and its test
    docs/routing.md     the routing sequence, the request and its measured cost
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
- **No live model call yet.** The routed scan is written and tested against a stubbed network only; no
  provider has been called. The first scan with a real key is the first real evidence. See `docs/routing.md`.
- **No residents.** The concept names a courier and angry drunks; neither exists yet. The scan's interface
  deliberately returns object kinds only, so adding people is a product decision rather than a plumbing one.
