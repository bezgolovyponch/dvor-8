# DVOR-8 — the concept

**Your own yard, photographed from your balcony, becomes an 8-bit level. The real cars, benches and
bicycles in it are the targets. You take them apart.**

## The rule everything is held to: nothing in vain

Every part of the game must have a reason a player can feel, and must say it. A part that cannot say why
it is there is removed, not kept "for later". This is checked, not hoped for:

- every source module is listed below with its reason, and a test fails if one is missing or unused;
- every element the page names must be used by the game, or a test fails;
- every play mode must state why it exists and must differ from sober in both the throw and the focus.

### Every part, and its reason

| Part | Why it is there |
|---|---|
| `detect.js` | The point of the game: the targets are the real things in your photograph. Without it they are patterns. |
| `objects.js` | Decides which found things are fair to hit (never people or animals) and which pixels are the thing. |
| `stylise.js` | Makes the photograph an 8-bit picture of the *same* yard — the transformation is the opening hook. |
| `palette.js` | Lets one picture be seen four ways at no cost: a mode's look is a different table. |
| `modes.js` | Makes each filter a different way to play, so choosing one is a decision and not a decoration. |
| `world.js` | What a hit does: dent, crack, wreck, combo, score. The rules, with no drawing in them. |
| `fx.js` | Makes a hit felt: pause, kick, flash, pieces, wreckage that stays. Without it a wreck is a pixel swap. |
| `view.js` | The lean and sway that give each mode its body — and the way back from a finger to a pixel, so aim stays true. |
| `render.js` | Shows all of the above, including what is out of focus and what is in the hand. |
| `audio.js` | A run of hits is *heard* as a run: pitch rises with the combo. |
| `demo.js` | A yard for a desk with no balcony, and a fixed one for the tests. |
| `rng.js` | Everything that looks random can be replayed exactly, so a test can assert it. |
| `street.js` | One yard is one level. This makes more of the same place out of the photographs already given — re-ordered strips of the picture, copies of the real things — and puts a photograph the player adds in as the exact next yard. It invents nothing. |
| `walk.js` | Going down into your own yard: walking round the things, jumping, and coming down on your neighbour's car. A jump is a hit made with the feet. |
| `drink.js` | Under alcohol the bottle can be drunk before it is thrown: each swig widens the burst and loosens the hand, so how drunk the mode plays is the player's own doing. |
| `album.js` | A reason to come back that cannot be lost: every kind of thing ever wrecked, the days visited, the records — and the line a player sends to someone else. |
| `main.js` | Wires the parts to the page and the finger. |
| the score, combo and best score | A reason to throw faster, and a number to beat on «ЕЩЁ РАЗ». |
| brackets and pips on targets | What can be hit, and how much it can take, is never a guess. |
| the "nothing recognised" card | If the photograph has nothing the game can name, it says so and asks for another, rather than inventing targets. |

### What was removed for having no reason

- **The model-naming call and its free-tier routing** (`llm.js`, `recognise.js`, the key fields). They named
  shapes the device could not; the detector now names things itself, on the device, with no key. The code
  is kept in git at tag `mvp-1-miami`.
- **Tone-patch "objects"** (`segment.js`). They were targets with no meaning.
- **Rubble along the bottom of the picture.** In a photograph with perspective, that is not where things fall.

## What went wrong in the first two builds

1. **The capability was never researched, only the style.** The whole point — real things from the
   photograph in the game — needs an object detector. Neither build had one. The second found "things" by
   grouping pixels of similar brightness, and put brackets on foliage while ignoring the cars.
2. **The picture threw the yard away.** Brightness was mapped onto two fixed neon ramps. Every yard became
   the same purple-and-pink heat-map and nothing in it could be recognised.
3. **Filters were decoration.** They changed colours and were declared, in writing, to be "a look, never a
   rule". From the player's side that is a filter that does nothing.
4. **It was called tested before a person had seen it.** The checks passed and were true, and the game
   still missed its point. The first real evidence was three screenshots from a phone.

## On the skeleton's slots

The skeleton's research runs B–F are still not done. `PROPOSED` marks the builder's working answer, not the
method's output. `CREATOR` is the creator's word. `BUILT` exists and is tested.

- **0 Brief** — `CREATOR`: web first; 18+; no business model; sandbox destruction, not violent; no
  punishing loss; real photograph → styled → real objects found → interaction; a detailed 8-bit view of
  your own yard; filters must change at least the focus and the thing thrown; nothing in vain.
- **1 Hook** — `PROPOSED`: *your own real yard snaps into pixels under the scan line, the scan names your
  neighbour's car, and the first thing you tap in it breaks.*
- **2 Spectra** — `PROPOSED`: stored investment high (it is your yard) · feedback instant · input one tap ·
  cost of failure none · restart one tap · outcome certain when sober and deliberately less so by mode ·
  closure open until the last thing is wrecked.
- **3 Atoms** — `BUILT`: tap → throw → hit → combo → score; brackets and pips as information; pause,
  kick, flash, pieces, sound as feedback; no penalty, no chance except alcohol's stated scatter.
- **4 Loops** — micro (tap to wreck; jump, stomp, bounce; swig, throw), core (photograph to score; down
  into the yard and along the street) and meta (album, days, records, a street remade by the date, a line
  to show someone) `BUILT`. Whether the meta loops bring anyone back is untested. `docs/structure.md`.
- **5 Scenario** — one beat: search, scan, clear. No story, no residents.
- **6 Feedback** — `BUILT`; `docs/style.md`.
- **7 First minute** — open → «СНЯТЬ ДВОР» → camera → a few seconds of search → 1.4 s scan → tap.
- **8 Progression** — nothing is unlocked and nothing is lost. What grows is the album, the days and the
  street the player has photographed.
- **9 Ethics** — people and animals are never targets; the photograph never leaves the phone; nothing is
  taken from the player. The modes are named for weed, alcohol and depression at the creator's request,
  for adults. Depression is a mode the player chooses and leaves; it is not something the game does to them.
- **10 Self-test** — `PROPOSED`, untested with players: a copy without the photograph is a tapping toy.
- **11 Open** — What brings a player back? Should the yard react? Should things not in the detector's
  80 — bins, swings, trees — become targets, which needs a different model?

## What is verified, and what is not

**Verified.** `node test.mjs`: 109 checks. `tools/walk-check.mjs` in headless Chrome: down into the demo
yard, things stomped, the street walked past the picture's edge, a real photograph added and walked into,
a bottle drunk dry and thrown, the card, the line, the album; no page errors. And, from the build before: `tools/check.mjs` in headless Chrome: the demo yard played to the
end in each of the four modes; three real street photographs searched in 1.6–1.8 s on a Mac, with cars, a
bench and a motorcycle found, named and wrecked; no page errors.

**Not verified.** That it is fun — nobody has played this build, and nobody has walked, jumped or drunk in
it with a thumb: the stick and the buttons have only been driven by a script. Whether a made yard reads as
more of the player's street. Whether anything here brings a player back. How long the search takes on a phone.
Whether the detector loads on an older phone. What it finds in *your* yard: from a high balcony, cars are
small, and the slicing is there for that, but it has only been tried on street-level photographs.
