# ДВОР-8 / DVOR-8

Photograph your yard from the balcony. It becomes an 8-bit picture of the same yard, the real cars,
benches and bicycles in it are found and named, and you take them apart.

**Web first.** No build step, no account, no key. The photograph never leaves the phone: the things in it
are found by a detector running on the phone itself.

## Run it

    python3 -m http.server 4310 --bind 127.0.0.1        # this computer: http://127.0.0.1:4310/

**On a phone, same Wi-Fi:**

    python3 tools/serve.py 4310   # as above, and tells the phone to keep no old copies of the game
    ipconfig getifaddr en0        # e.g. 192.168.0.216 → http://192.168.0.216:4310/ (it changes with the network)

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
| **ВО ДВОР** / **НА БАЛКОН** | go down into the yard and come back up (V on a keyboard) |
| stick, **ПРЫЖОК** | walk round things, jump them, or land on one: that is a hit, and you bounce (arrows or WASD, space) |
| walk right | the street goes on past the photograph, made from it; today's street is not tomorrow's |
| **+ СНИМОК** | add a photograph: it becomes the exact next yard on the street, up to nine |
| **ГЛОТОК** (alcohol only) | drink from the bottle: a wider burst, a worse hand, and it wears off (E) |
| **НОВОСТИ** | on by default: a plane with a banner and an airship with a running board carry the day's real headlines over the yard. Tap one to throw at it: the next headline comes sooner. Off: the sky is empty and the game makes no request |
| tap a person | a ball of water, whatever is in the hand; nobody can be harmed. They look up: «!» |
| **СПРЯТАТЬСЯ** / **ВЫГЛЯНУТЬ** (H) | hidden, nobody sees you and you cannot throw. Whoever is looking loses you («?») and leaves |
| **ОПАСНОСТЬ** | climbs while someone looks at you in the open. Five marks: seen, and the run ends as «ЗАМЕТИЛИ». What the album holds is kept |
| soak someone twice | they run and call the police («112»); the angry lady calls at once, the drunk never. The police look in turns: act while they look away |
| **ХВАТИТ** | end the walk and see the card |
| **ПОКАЗАТЬ СТРОКОЙ** / **КАРТИНКОЙ** | a line of what the yard held and what became of it, or the game's picture of it |
| **АЛЬБОМ** | every kind of thing you have ever wrecked, and what is still out there |

Each filter is a way to play:

| | in the hand | how it plays | what you see |
|---|---|---|---|
| **ТРЕЗВЫЙ** | stone | lands where you tap, fast | everything sharp |
| **ТРАВА** | slipper | slow, then skips to two more things; combos last twice as long | edges go soft, colours drift |
| **АЛКОГОЛЬ** | bottle | bursts over everything near, but strays from your aim | nothing in focus, double vision |
| **ДЕПРЕССИЯ** | brick | wrecks anything in one throw, slow to throw again | only a small circle round your finger — drag to look, tap to throw |

It recognises cars, trucks, buses, motorcycles, bicycles, benches, chairs, potted plants and a few dozen
other everyday things. It does not know bins, swings or trees. People and animals in the photograph are never targets. The people the game draws walking through the yard can only be soaked.

## Test

    node test.mjs                                                  # 160 checks, no browser
    node --experimental-websocket tools/check.mjs out/ a.jpg       # plays the real page in headless Chrome
    node --experimental-websocket tools/walk-check.mjs out/ a.jpg  # the same for walking, the street, the bottle, the album
    node --experimental-websocket tools/news-check.mjs out/        # the plane, the airship, a throw at each; needs the network
    node --experimental-websocket tools/folk-check.mjs out/        # the people: soak, hide, the call, the police, seen

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
    src/street.js           more yard beyond the photograph, made only from photographs
    src/walk.js             whoever goes down into the yard
    src/drink.js            the bottle
    src/album.js            what is kept between visits, and the line to show someone
    src/news.js             the day's headlines (Wikipedia, «Текущие события»), or the yard's own
    src/sky.js              the plane and the airship that carry them, and what a hit does to each
    src/folk.js             the people passing through, who has seen you, and the police
    src/font.js             5×7 letters, Russian and Latin, for words inside the picture
    src/audio.js, demo.js, rng.js, main.js
    vendor/mediapipe/       the detector runtime and model (Apache 2.0), pinned
    tools/                  a dependency-free headless-Chrome driver, the play-through checks, and serve.py
    docs/concept.md         the concept, the "nothing in vain" rule, what went wrong before — read first
    docs/style.md           every look-and-feel decision, its source, its test
    docs/feasibility.md     similar games, what the evidence says, and whether to go on
    docs/structure.md       the game taken apart: atoms, loops, hooks, and what the research does and does not support
    docs/pyramid.html       what stands on what
    brief.md, game-skeleton/, standards/   the intake and earlier material, kept for the record

**This build is `v0.3.0` plus the news over the yard** (not yet tagged). `v0.3.0`: walking, the street, the bottle, the album. Before it, `v0.2.0` (also tagged `mvp-2-real-objects`). The earlier build is `mvp-1-miami` (neon
heat-map, tone patches, model-naming cascade).

## What this is not yet

- **Not played by anyone in this form.** The stick and the buttons have only been driven by a script.
- **Untimed on a phone.** The search takes 1.6–1.8 s on a Mac; a phone will be slower.
- **Tried on street-level photographs only.** From a high balcony cars are small; slicing is there for
  that and is untested on such a view.
- **Reasons to come back are built and unproven**: an album, days, a daily street. Nobody has come back yet.
- **Sharing works fully only over https.** On a plain `http://` address the line is copied and the picture
  is saved as a file, because the phone's share sheet is not offered there.
- **The news is one request a day to Wikipedia**, for the date's «Текущие события»; the headlines are theirs (CC BY-SA), cut to 150 letters and shown in capitals. It carries nothing about the player or the photograph, but it is a request, and the game made none before. **НОВОСТИ** turns it off. The headlines are whatever the day holds, wars included, and nothing filters them.
- **Scores are still not comparable between players**: every yard is different. No story, no residents.
- **The skeleton's research runs B–F are not done.**
