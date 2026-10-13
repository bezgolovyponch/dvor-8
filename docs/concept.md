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
| `stylise.js` | The seam between the photograph and the drawn scene: runs the flat route and answers what the rest of the game asks a styled picture for — the palette index per pixel, the region list, and where the sky is. |
| `palette.js` | Lets one picture be seen four ways at no cost: a mode's look is a different table. |
| `modes.js` | How you SEE: the focus and the lean. A mode is a way of looking, nothing more. |
| `flat.js` | The photograph -> drawn scene transition that replaced quantising the photo's own pixels: an ink gate (difference of Gaussians, XDoG 2012), Felzenszwalb regions (IJCV 2004) that a found object's own pixels can bar, a region-adjacency merge the photograph's own ink can veto, a FIXED palette of seven hue-shifted ramps so every yard looks like the same game, tones that follow the region's value and the one light, a material pattern on rough surfaces only, and a line layer drawn per pair of regions where the photograph has a border. A region is one colour, or two adjacent tones of its own ramp. Aspect ratio is the photograph's own. Why each stage exists, and what it is measured at, is `docs/environment-style.md`. |
| `surfaces.js` | What the picture is made of, as far as anything needs to know: SKY or OTHER. It used to hold a material classifier and a sky/ground finder; both are gone because they were measured and did not work — on the courtyard photograph TREE and BENCH differ by 4.4 in colour spread and 0.7 in local texture, and ASPHALT and TREE overlap on both, so the classifier put the bench in the trees. The numbers are in docs/environment-transfer.md. The question the game actually asks is answered by flat.js, which chose the ramp and therefore knows. |
| `vector.js` | **The r9 route: flat designed surfaces with straight edges**, one colour per shape. The per-pixel painter was faithful and unstable — it dithered every surface into a halftone, merged facades of similar tone, and left pixel-jagged borders. This route refuses to paint per pixel: it finds the sky (a blue core grown through its own clouds, stopped at the skyline), finds the shapes, gives each shape ONE colour chosen by hue family and value, straightens every border by tracing its outline and simplifying it into a polyline, fills it back, cuts the staircase corners, places 1–5 designed clouds, and draws one line along the skyline. Measured on the three photographs: stray pixels 13–15% → 0.04–0.09%, specks under four pixels 18–19% → 0.22–0.36%, same-colour blobs per 1000 px 19–23 → 2.0–4.2, at 40–110 ms. Behind `?style=vector`; the per-pixel route stays the default until this one is chosen. |
| `world.js` | The yard as a thing that can be hit — and, since the environment became destructible, **everything in the picture is a thing that can be hit**: the detected objects by their own hit points, and every surface behind them (wall, asphalt, kerb, foliage, fence, ground) by a toughness table keyed to the ramp the painter chose, which is already a statement about what the material is. A hit dents it one tone down its own ramp; enough hits tear a hole that is written into the rubble layer and never cleared. Nothing is a backdrop. |
| `weather.js` | **The day's sky, and the disasters that come with it**: rain, snow, fog and a storm that throws lightning. Weather is first a GRADE on the palette table — a whole-screen mood is a different table, which is the rule this project already decided for filters (D1) — and only then a set of particles, so a wet yard is wet in every pixel rather than in an overlay in front of it. It moves the people (they hurry out of rain and dawdle in snow), and lightning blackens one standing thing and has no code path to a person at all. The day decides which one, so the same date gives the same sky, the same street and the same yard (D28). Numbers are CHOICE; the directions are sourced. |
| `kind.js` | **The three things you can do to a yard that are not wrecking it**: flowers that are planted where they land and stay (the only thing that adds to the picture and keeps it), a sponge that washes a thing one tone up its own ramp (the only thing that gets lighter), and the courier's parcel, carried back for points and a mark off the danger meter (the only action that lowers it). All three are thrown with the same hand as everything else, none of them breaks anything and none of them takes a point away. Why each exists, and what it looks like: `docs/kind-actions.md`. |
| `throwables.js` | What is in your HAND: eight things, each flying and landing its own way, and each naming why it exists. Kept apart from the modes because holding a thing and seeing the yard are different decisions — the split means a player who wants a wide splash no longer has to accept a wandering hand. |
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
| `decal.js` | The creator asked to throw colour at a wall. This keeps every splat — where, how big, which of six named colours — in a pool of 96, and writes them into the one layer the picture is drawn through, so a mark is still there after the next throw, on the card, and down in the yard. Together with kind.js it is one of the two ways the picture grows rather than loses. |
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
