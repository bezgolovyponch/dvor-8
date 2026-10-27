# ДВОР-8 / DVOR-8

Photograph your yard from the balcony. It becomes an 8-bit picture of the same yard, the real cars,
benches and bicycles in it are found and named, and you take them apart.

**Web first.** No build step, no account, no key. The photograph never leaves the phone: the things in it
are found by a detector running on the phone itself.

## Android app

**[Download dvor-8-0.6.5.apk](https://github.com/bezgolovyponch/dvor-8/releases/download/v0.6.5/dvor-8-0.6.5.apk)** (64 MB, Android 8 and later).

### Building and publishing

`sh android/build.sh` builds the signed APK from this tree with the Android SDK's own tools (no Gradle).
`sh android/release.sh <version> <versionCode>` publishes it - and it **refuses unless `node tools/chain.mjs`
exits 0**: a release is made only from a chain-green tree, and the release asset is the artefact while the
repository only points at it. The signing key lives outside the repository (`~/.android/dvor8.keystore`), so
updates install over the previous build.

The repository is private, so the link works for a browser signed in to GitHub with access to it. On the
phone: open the file, allow installing from that source when Android asks, install. The app is the same game
with its files inside the package: it plays with no Wi-Fi and no computer. Only the headlines go to the
network, and **НОВОСТИ** turns that off.

    sh android/build.sh      # builds android/out/dvor-8-<version>.apk; needs a JDK and the Android SDK

`android/` holds the whole wrapper: one activity that shows the page, hands a photograph in from the camera
or the gallery, and hands the line or the card out to the share sheet. It is signed with a key kept at
`~/.android/dvor8.keystore`; a phone installs an update only over a build signed with the same key.

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
| tap a window | found in the walls by eye, not by the detector: the first stone cracks it, the second breaks it into shards that fly from where the stone landed |
| **КРАСКА** in the hand | a ball of colour, a new one each throw. The splat stays where it landed — wall, car, ground — and is on the card you send. It breaks nothing. The sky takes none |
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
other everyday things. It does not know bins, swings or trees. Windows are not the detector's: they are found
from the picture as dark openings in a brighter wall, and that is a guess (see below). People and animals in the photograph are never targets. The people the game draws walking through the yard can only be soaked.

## Test

    node test.mjs                                                  # the suite; it prints its own PASS/FAIL count (321 checks, no browser today)
    node --experimental-websocket tools/check.mjs out/ a.jpg       # plays the real page in headless Chrome
    node --experimental-websocket tools/walk-check.mjs out/ a.jpg  # the same for walking, the street, the bottle, the album
    node --experimental-websocket tools/news-check.mjs out/        # the plane, the airship, a throw at each; needs the network
    node --experimental-websocket tools/folk-check.mjs out/        # the people: soak, hide, the call, the police, seen
    node --experimental-websocket tools/paint-check.mjs out/ a.jpg # a window cracked and broken, a wall painted, the sky refusing

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
    src/frame.js            the windows in the walls, found from the picture; and where paint sticks
    src/glass.js            how a window breaks: two hits, shards small where the stone landed
    src/decal.js            the colour thrown at the yard, kept
    src/parts.js            the pieces that fly: glass, paint, a miss — one list, capped
    src/materials.js, throwables.js   what a surface is drawn as; what is in the hand
    android/                the Android app: a window onto the same page, and its build script
    src/font.js             5×7 letters, Russian and Latin, for words inside the picture
    src/audio.js, demo.js, rng.js, main.js
    vendor/mediapipe/       the detector runtime and model (Apache 2.0), pinned
    tools/                  a dependency-free headless-Chrome driver, the play-through checks, and serve.py
    docs/concept.md         the concept, the "nothing in vain" rule, what went wrong before — read first
    docs/style.md           every look-and-feel decision, its source, its test
    docs/feasibility.md     similar games, what the evidence says, and whether to go on
    docs/structure.md       the game taken apart: atoms, loops, hooks, and what the research does and does not support
    docs/request-neighbours.md  the people-and-police request: what is built, what similar games show, open questions
    docs/pyramid.html       what stands on what
    brief.md, game-skeleton/, standards/   the intake and earlier material, kept for the record

**This build is `v0.4.0`**: windows that break, paint that stays, and the Android app. Since `v0.3.0` (walking, the street, the bottle, the album) it also gained the news over the yard, the people and the police, six things to throw, and the ink and material layers. Before it, `v0.2.0` (also tagged `mvp-2-real-objects`). The earlier build is `mvp-1-miami` (neon
heat-map, tone patches, model-naming cascade).

## What this is not yet

- **The Android app has not been opened on a real phone.** It was run in an emulator only (Android 14, WebView 113): the detector loaded, the drawn yard played, a window was cracked and broken, and a photograph picked from the gallery was searched in 3.2 s and played. **СНЯТЬ ДВОР** (the camera hand-off) and both share buttons were not tried even there, and nothing says how long the search takes on a phone.
- **Windows are a guess.** On the two test photographs: on the first, three boxes — two on dark openings in the wall behind the car, one small one at the top edge that may not be a window; on the second, where the real windows are two or three pixels across, none of them and one false box in the branches of a tree. A window in shadow or behind branches is missed.
- **Paint and glass have been thrown by a script only.** Whether a splat reads as paint at this size, and whether the shards read as glass, needs a person looking at a phone.
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
