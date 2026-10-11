# ДВОР-8 / DVOR-8

Photograph your yard from the balcony. It becomes an 8-bit picture of the same yard, the real cars,
benches and bicycles in it are found and named, and you take them apart.

**Web first.** No build step, no account, no key. The photograph never leaves the phone: the things in it
are found by a detector running on the phone itself.

## Run it

    python3 -m http.server 4310 --bind 127.0.0.1        # this computer: http://127.0.0.1:4310/

**On a phone, same Wi-Fi:**

    python3 -m http.server 4310 --bind 0.0.0.0
    ipconfig getifaddr en0        # e.g. 192.168.88.237 → http://192.168.88.237:4310/

This serves the whole folder to everyone on that network for as long as it runs. Stop it with Ctrl-C.
The first load fetches about 20 MB (the detector and its model) from your computer.

## Play

| | |
|---|---|
| **СНЯТЬ ДВОР** | the phone's camera; on a computer, a file picker |
| **ДЕМО-ДВОР** | a drawn yard, for a desk without a balcony |
| tap a bracketed thing | throw at it; the pips under it are the hits it can still take |
| hit again quickly | the combo climbs and multiplies the points |
| **ЗАНОВО** / **ЕЩЁ РАЗ** | the same yard, clean, at once |

Each filter is a way to play:

| | in the hand | how it plays | what you see |
|---|---|---|---|
| **ТРЕЗВЫЙ** | stone | lands where you tap, fast | everything sharp |
| **ТРАВА** | slipper | slow, then skips to two more things; combos last twice as long | edges go soft, colours drift |
| **АЛКОГОЛЬ** | bottle | bursts over everything near, but strays from your aim | nothing in focus, double vision |
| **ДЕПРЕССИЯ** | brick | wrecks anything in one throw, slow to throw again | only a small circle round your finger — drag to look, tap to throw |

It recognises cars, trucks, buses, motorcycles, bicycles, benches, chairs, potted plants and a few dozen
other everyday things. It does not know bins, swings or trees. People and animals are never targets.

## Test

    node test.mjs                                              # 70 checks, no browser
    node --experimental-websocket tools/check.mjs out/ a.jpg   # plays the real page in headless Chrome

The first asserts behaviour: a red car stays red, people are never targets, a tap hits what was under it,
every mode plays differently and says why, every part has a written reason. The second runs the detector
on real photographs (paths under the served folder) and saves screenshots. **Neither can say whether it
is fun.**

## Structure

    index.html, style.css   the page
    src/detect.js           the object detector, on the device
    src/objects.js          found things → fair targets and their pixels
    src/stylise.js          photograph → 8-bit picture of the same yard
    src/palette.js          the yard's own 28 colours, and the same through each mode
    src/modes.js            the four ways to play
    src/world.js            what a hit does
    src/fx.js               what a hit feels like
    src/view.js             lean, sway, and the way back from a finger to a pixel
    src/render.js           drawing
    src/audio.js, demo.js, rng.js, main.js
    vendor/mediapipe/       the detector runtime and model (Apache 2.0), pinned
    tools/                  a dependency-free headless-Chrome driver and the play-through check
    docs/concept.md         the concept, the "nothing in vain" rule, what went wrong before — read first
    docs/style.md           every look-and-feel decision, its source, its test
    brief.md, game-skeleton/, standards/   the intake and earlier material, kept for the record

Earlier builds are tags: `mvp-1-miami` (neon heat-map, tone patches, model-naming cascade).

## What this is not yet

- **Not played by anyone in this form.**
- **Untimed on a phone.** The search takes 1.6–1.8 s on a Mac; a phone will be slower.
- **Tried on street-level photographs only.** From a high balcony cars are small; slicing is there for
  that and is untested on such a view.
- **No reason to come back** beyond a best score. No story, no residents.
- **The skeleton's research runs B–F are not done.**
