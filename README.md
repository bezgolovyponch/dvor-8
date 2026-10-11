# ДВОР-8 / DVOR-8

Photograph your yard from the balcony. The scan turns it into a neon pixel level, finds the things in it,
and you take them apart — fast, with a combo, and again.

**Web first.** No build step, no dependencies, no account. The photograph stays on the phone unless you
enter a model key.

## Run it

    python3 -m http.server 4310 --bind 127.0.0.1        # this computer: http://127.0.0.1:4310/

**On a phone, same Wi-Fi:**

    python3 -m http.server 4310 --bind 0.0.0.0
    ipconfig getifaddr en0        # e.g. 192.168.88.237 → http://192.168.88.237:4310/

This serves the whole folder to everyone on that network for as long as it runs. Stop it with Ctrl-C.

## Play

| | |
|---|---|
| **СНЯТЬ ДВОР** | opens the phone's camera; on a computer, a file picker |
| **ДЕМО-ДВОР** | a drawn stand-in, for a desk without a yard |
| tap a bracketed thing | throw a rock at it; big things take up to three |
| hit again within 2.5 s | the combo climbs and multiplies the points |
| **ТРЕЗВЫЙ · ТРАВА · АЛКОГОЛЬ · ДЕПРЕССИЯ** | how you see it: colours and motion, never the rules |
| **ЗАНОВО** / **ЕЩЁ РАЗ** | the same yard, clean, at once |

## Test

    node test.mjs

63 checks, in eight groups: the look, the filters, photograph → picture, finding things, hitting, feel,
the view, and naming through the model cascade (network stubbed). They assert behaviour — any photograph
becomes a playable yard, a tap hits what was under it, every interaction is answered. **They do not and
cannot assert that it is fun**; see the last section of `docs/concept.md`.

## Structure

    index.html, style.css   the page; the look is as much here as in the canvas
    src/palette.js          18 colours, and the same 18 under each filter
    src/stylise.js          photograph → picture of palette indices
    src/segment.js          picture → the things in it, found on the device
    src/demo.js             the stand-in photograph
    src/world.js            what a hit does: cracks, breaks, combo, score
    src/fx.js               what a hit feels like: pause, shake, flash, pieces, rubble
    src/view.js             tilt and sway, and the way back from a finger to a pixel
    src/render.js           drawing
    src/audio.js            sound from oscillators; no files
    src/recognise.js        one bounded model call per yard, to name things
    src/llm.js              providers, limits and the router, carried over from partner-sim
    src/main.js             the flow and the wiring
    docs/concept.md         the concept on the skeleton's twelve slots — read this first
    docs/style.md           every look-and-feel decision, its source, its test
    docs/routing.md         the model call: request, cost, routing sequence
    brief.md, game-skeleton/  the intake and the skeleton files

`standards/` holds the 2D art standards the first build followed. The rebuilt look does not use parallax
layers and does not follow them; they are kept for the record.

## What this is not yet

- **Not played by anyone.** Driven in headless Chrome with three real photographs; never on a phone.
- **Shapes, not objects.** Without a model the device finds patches of tone, not bins and benches.
- **No live model call.** The naming path is tested against a stubbed network only, and which providers
  accept an image is unverified.
- **No live viewfinder.** The camera opens through the phone's own camera app. A viewfinder in the page
  needs HTTPS.
- **No reason to come back.** No best score, no memory of yards, no story, no residents.
- **The skeleton's research is not done.** Runs B–F of the master prompt have not run.
