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
| `downscale.js` | Shrinks the photograph so thin things survive: each game pixel takes the dominant-lightness colour of its cell (photo2pixel's vote), and a whole dark line through a cell wins over the light majority, so railings, frames and poles are not averaged away. The content-adaptive method (Kopf 2013, ported from unfake.js) is kept beside it as the measured alternative it beat on speed. |
| `ramps.js` | The game's ONE palette: seven hue-shifted ramps, a grey ramp, a deep shadow — 28 colours, the same for every photograph. This is what makes two yards look like one game instead of two photographs. Hues set from measured foliage and sky. |
| `pixelart.js` | The pixel artist's steps, in order: grade in OKLab, hue picks the ramp and light picks the step, a checker only on smooth surfaces, stray pixels cleaned up, a selective outline on the dark side of every boundary. |
| `palette.js` | Lets one picture be seen four ways at no cost: a mode's look is a different table. |
| `modes.js` | How you SEE: the focus and the lean. A mode is a way of looking, nothing more. |
| `materials.js` | What each part of the picture is MADE of, and what that material looks like at 192 pixels: sky dithers as a smooth gradient, ground gets the organic random pattern, foliage clustered blobs, asphalt fine speckle. Since the fixed palette (`ramps.js`) its patterns are no longer drawn into the picture — the flat ramps are the style now — and the picture uses only its sky/ground map; the patterns remain for `tools/material-*.mjs`. It deliberately does NOT decide what a surface is — the measurements at the top of it show colour and texture cannot separate a tree from a bench (spread 8.6 vs 5.2, texture 18.7 vs 18.0), so it takes a surface map from whatever can supply one and draws it. Only sky and ground are found geometrically, because those two are defined by position rather than appearance. |
| `throwables.js` | What is in your HAND: six things, each flying and landing its own way, and each naming why it exists. Kept apart from the modes because holding a thing and seeing the yard are different decisions — the split means a player who wants a wide splash no longer has to accept a wandering hand. |
| `world.js` | What a hit does: dent, crack, wreck, combo, score. The rules, with no drawing in them. |
| `fx.js` | Makes a hit felt: pause, kick, flash, pieces, wreckage that stays — and makes the three kinds of hit felt *differently*, so the player can feel progress toward a break. The shake is Eiserloh's trauma model (trauma accumulates, decays linearly, offset is the cube) rather than an invented decay. Without it a wreck is a pixel swap. |
| `view.js` | The lean and sway that give each mode its body, the duck that puts the player behind the rail (symmetric, so hiding and standing up cost the same), and the way back from a finger to a pixel, so aim stays true. |
| `render.js` | Shows all of the above, including what is out of focus and what is in the hand. |
| `audio.js` | A run of hits is *heard* as a run: pitch rises with the combo. |
| `demo.js` | A yard for a desk with no balcony, and a fixed one for the tests. |
| `rng.js` | Everything that looks random can be replayed exactly, so a test can assert it. |
| `street.js` | One yard is one level. This makes more of the same place out of the photographs already given — re-ordered strips of the picture, copies of the real things — and puts a photograph the player adds in as the exact next yard. It invents nothing. |
| `walk.js` | Going down into your own yard: walking round the things, jumping, and coming down on your neighbour's car. A jump is a hit made with the feet. |
| `drink.js` | Under alcohol the bottle can be drunk before it is thrown: each swig widens the burst and loosens the hand, so how drunk the mode plays is the player's own doing. |
| `album.js` | A reason to come back that cannot be lost: every kind of thing ever wrecked, the days visited, the records — and the line a player sends to someone else. |
| `font.js` | The page's own type smears when a 192-pixel picture is scaled, and it differs from phone to phone. So the words that fly over the yard are written the way an 8-bit console wrote them: one fixed set of dots, readable on any screen. |
| `news.js` | The sky over the yard carries something that is not the player's own doings — what the world did today, from Wikipedia's «Текущие события» box, with no key and no account, asked for once a day — and when there is no network, the yard's own news instead. Nothing is invented in its place. |
| `sky.js` | The line needs a carrier that belongs in the picture and can be played with: a plane towing a banner, an airship with a running board. They take turns because they are read differently. A throw at either turns the page — the next line comes sooner — so the news is a thing in the yard and not a caption over it. |
| `folk.js` | A yard that only stands still is a shooting range. People pass through it — a courier on a bicycle, a walker, a drunk, an angry lady — and none of them can be harmed: all that is ever thrown at one is a ball of water, and all it does is make them look up. Being looked at while in the open is the danger; hiding ends it; soaking someone twice brings the police, who look in turns. It gives the run a way to be lost that is the player's own doing, at the creator's request. |
| `frame.js` | The creator asked to break a window. A window is not one of the detector's 80 things, so this finds it from the picture itself: a small dark patch that fills its own box, in a brighter wall, searched at three picture-pixels to one of the game's so that it still has a shape. It is a guess and says so: on the two test photographs it boxes two dark openings in the wall behind the car and one doubtful patch on the first, and on the second, where the real windows are two or three pixels across, none of them and one false box in a tree. It also answers where paint sticks: anywhere but the sky. |
| `glass.js` | A window must break like glass and not like a car. The model is the one Half-Life 2 shipped (`func_breakable_surf`): one four-sided pane, a damage count, two hits. It remembers where it was struck, and when it goes it is cut into shards that are small round the strikes and large far from them, so the break shows where the stone landed. |
| `decal.js` | The creator asked to throw colour at a wall. This keeps every splat — where, how big, which of six named colours — in a pool of 96, and writes them into the one layer the picture is drawn through, so a mark is still there after the next throw, on the card, and down in the yard. It is the only thing in the game that adds to the yard. |
| `parts.js` | Glass, paint and a miss each throw different pieces, and all of them go into the one particle list the game already steps, capped at 220 live so two bursts in a frame cannot slow a phone. A shard leaves as one piece because every pixel of it is given the same velocity. |
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

**Verified.** `node test.mjs`: see the count it prints. `tools/folk-check.mjs` in headless Chrome: a courier soaked and looking up, the player hidden and lost, a second soaking and a call, the police arriving and looking, a thing wrecked while they looked away, the player seen in the open and the run ended as «ЗАМЕТИЛИ»; no page errors. `tools/news-check.mjs` in headless Chrome, with the network: the day's six real headlines fetched and kept; the plane and its banner over the demo yard, the banner cut loose by a throw (+25), the airship and its board from the balcony and from down in the yard, the board put out by a throw, the news turned off; no page errors. `tools/walk-check.mjs` in headless Chrome: down into the demo
yard, things stomped, the street walked past the picture's edge, a real photograph added and walked into,
a bottle drunk dry and thrown, the card, the line, the album; no page errors. And, from the build before: `tools/check.mjs` in headless Chrome: the demo yard played to the
end in each of the four modes; three real street photographs searched in 1.6–1.8 s on a Mac, with cars, a
bench and a motorcycle found, named and wrecked; no page errors.

**Not verified.** Whether the people are fun or only a nuisance; whether 0.3–1.2 s of warning is enough for a thumb to reach СПРЯТАТЬСЯ; whether the «!», «?» and «112» marks are read on a phone. Every number in `folk.js` is a first guess. Whether a headline can be read on a phone while playing, at six letters a second in letters five dots wide. Whether real news over a yard being wrecked is wanted at all: on the day this was built two of the six lines were about people killed in a war, and a throw at the banner scores. That it is fun — nobody has played this build, and nobody has walked, jumped or drunk in
it with a thumb: the stick and the buttons have only been driven by a script. Whether a made yard reads as
more of the player's street. Whether anything here brings a player back. How long the search takes on a phone.
Whether the detector loads on an older phone. What it finds in *your* yard: from a high balcony, cars are
small, and the slicing is there for that, but it has only been tried on street-level photographs.
