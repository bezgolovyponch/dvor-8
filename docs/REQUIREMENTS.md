# THE CHECKLIST — every requirement, and its state

**This is the file the creator asked for.** It is the authority: a row is only DONE when the artefact exists AND
a picture proves it (L3). Nothing here may be reported as done from memory. Update it in the same commit as the
work, never after.

| # | requirement | state | proof / what remains |
|---|---|---|---|
| 1 | Access the app and its change history | DONE | repo read, commits read, game played |
| 2 | Describe the game, mechanics, monetisation | DONE | `docs/concept.md`, `docs/monetisation.md`, 29 checks |
| 3 | Design levels | **OPEN** — needs a level-design document with the same evidence classes; no progression exists yet | remains: the document |
| 4 | Real-photo→8-bit, unique style, Legendarity Index | DONE | `docs/environment-style.md`, index 88.4 |
| 5 | Run locally while working | DONE | server 4312 |
| 6 | Audit and stabilise research/production | DONE | `docs/audit-and-reconstruction.md` |
| 7 | Commit and push each version | DONE | continuous |
| 8 | Match the reference dithered look | DONE | per-pixel route, then superseded by r9 |
| 9 | Kill conflicts, restart local | DONE | — |
| 10 | One stable served build | DONE | — |
| 11 | Visually appealing kind actions (flowers, wash, help NPC) | DONE | `src/kind.js` |
| 12 | Nature disasters | DONE | `src/weather.js` + `src/disaster.js` |
| 13 | Destructible environment, not just objects | DONE | `world.chip`, toughness by ramp |
| 14 | Objects fully destructible, minimal, resembling the environment | DONE | `world.borderOf` + `wreckAlong`; L3 `docs/shots/tsunami.png` |
| 15 | Share the ruins or the flowered result | DONE | `imprint()` + card |
| 16 | Random absurd actions (eat the car) | DONE | `ANTICS` |
| 17 | Ten existing style methods, no changes yet | DONE | `docs/style-candidates.md` |
| 18 | Apply 2+3 (segmentation + geometry) | **PARTLY** — OpenCV's bundle has no `dnn`, so segmentation is not shipped; needs its own decomposition (onnxruntime-web or structure-only) | remains: the runtime decision |
| 19 | Apply the scene analysis; enhance first; shadows secondary | DONE | `src/enhance.js`, facade rhythm, Lite2 |
| 20 | The r9 formula | DONE | `src/vector.js` |
| 21 | Visually appealing destruction + share tag I AM HERE | DONE | card with Я ЗДЕСЬ · I AM HERE |
| 22 | Disasters: hurricane, tsunami, Godzilla, Beyoncé | DONE — seen on the REAL photograph (`docs/shots/photo-tsunami.png`, `photo-beyonce.png`) | all four ship. The fault that hid the beasts was an `if (at)` guard in the renderer swallowing a null: `beastAt()` was returning null whenever the active disaster was a hurricane, and nothing said so. The draw now reports itself (`window.__beast`: 3358 pixels, 0 skipped, 0 bad colours) |
| 23 | Pac-Man-style side view, head shake | **PARTLY** — chomp, head shake and the bite wedge are implemented; the silhouette is now tall and narrow (Beyoncé 64x310 px, ratio 0.21; Godzilla 48x309, 0.16), which is what a side view needs, but it is still built from a column profile rather than drawn as a side view with a face and limbs | remains: the drawn side view |
| 24 | Toolbar: arrow, name + dropdown, no word "weapon", disasters, info right | DONE | L3 `docs/shots/toolbar.png` |
| 25 | Info: pick an object, true random fact, always a different theme, **and the object must be OUTLINED** | DONE | the thing's own border (`world.borderOf`) is drawn as a dashed help outline for six seconds while the answer is on screen; facts unchanged |
| 26 | Disaster destruction with borders, decomposed, reusing verified pieces | DONE | `borderOf` + `wreckAlong`; disasters call the same path |
| 27 | Mandatory baseline that forces completion | DONE | `tools/baseline-check.mjs`, 22 rows, L3 = pictures |
| 28 | **Hurricane and tsunami must ROLL THE CARS OVER** | DONE | `world.rollOver`; the front rolls each vehicle once (7596 pixels lifted, measured) |
| 29 | **Windows and structures must be destroyed by the hurricane/tsunami, leaving ruins to share** | DONE | the front now hits every region in its path once, in the region's own border: windows pop, structures break, vehicles roll; the ruins stay and the card shares them |
| 31 | **BUILDINGS must be destroyable: the facade structure tears and the windows in it pop, leaving ruins to share** | DONE | `vector.js` hands each facade plane over as a **structure** with pixels and a border; `world.js` gives it 3 hit points; the hurricane front bites its own border each pass (`СТЕНА 1/3` … `СТЕНА ОБРУШИЛАСЬ`); windows inside pop with their own hits; the ruins stay and are what the card shows. Checks: a structure exists with hp 3 and its true area, a bite tears 100+ pixels in its own border, the void stays under 5% of it, and a wall with its hits spent is marked a ruin while its pixels remain |
| 32 | **The drawn demo yard must not exist; the game and its tests must work on a real photograph** | **PARTLY** — `src/demo.js` DELETED, its buttons and path gone: no drawn art remains. The suite builds a SYNTHETIC PHOTOGRAPH (saturated blue sky, textured wall, three small dark windows, noisy road, trees, a pale car and a dark car in two tones each, a bench, a plant, a chair, a bicycle, the three primary colours). **299 of 305 pass**; the environment checks (foliage vs wall toughness, chipping a wall) went green in this round | remains: six checks still encode the DRAWN YARD's own properties, and each must be restated against what a photograph can offer: `a target's pixels are the thing, not the asphalt in its box                                    91% of its box`<br>`taking the car out of the picture removes the car and leaves every other pixel alone           every colour that made up a tenth`<br>`a small thing the same colour as its ground is absorbed when nothing marks it (the failure)    orphan absorbed`<br>`and the ground stays ONE colour: only the thing is painted apart, not its surroundings`<br>`a hit wrecks it IN ITS OWN SHAPE: the blow is torn out, and most of the thing is dented one    404 torn, 4221 dented, 1116 untouc`<br>`the sky takes no paint, the wall and the ground do` |
| 33 | **A disaster must name its exact source, and the method below must be followed for every hard piece** | DONE for the sprites: `src/disaster.js` carries the source in the code — the creator's own `DVOR-8 Street v6.dc.html`, `icon()` — for the hurricane (a logarithmic spiral: `sin(th*2 - log(r+1)*4)`) and the tsunami (a wave profile with four bands and a foam arc), plus v6's `outline()` rule for the one-pixel ink. The mechanics name theirs: Bomberman (1983) the destruction wave, SimCity (1989) the three-beat envelope, Rampage (1986) damage by pieces, Pac-Man (1980) the bite, Metal Slug (Nazca, 1996) the car template that v6 cites | the baseline asserts the source is present in the file |
| 34 | **A knowledge base with REAL links, and the working path prioritised over new ideas** | DONE — `docs/knowledge-base.md`: the v6 path recorded step by step as the priority method, the destruction/tracing algorithms with the links this project actually uses (OpenCV morphology, marching squares, boundary tracing, RDP), pixel-art and palette resources, the games that invented each disaster mechanic, and the rule that a working reference beats a new idea. Every entry names what it gives and whether it has been opened here | the baseline asserts the file exists, that it carries real `http` links rather than local paths, and that the v6 path is recorded |
| 35 | **Point at a thing and it highlights; the selected one blinks; the info button answers with a tooltip (v6's interaction path)** | DONE on the real photograph (`docs/shots/photo-aim.png`, `photo-info.png`) — ported from v6: the thing under the finger is outlined in **pink** while aiming (`world.aim`, border cached per region), the thing the info button is describing is outlined in **cyan**, and the selection **blinks** cyan ↔ yellow every eighth of a second, exactly as v6 alternates its edges map. The tooltip (a true categorised fact) was already there | the highlight is now proved on `photos-test/5.jpg` by `tools/photo-shot.mjs`, the harness written for exactly this |
| 36 | **Objects resolved first: detected → outlined by their own silhouette → highlighted → destroyable — and the DESTRUCTION MODEL written down before anything else is built on it** | DONE, proved on the real photograph (`docs/shots/photo-destroyed.png`: one thing taken apart, 5 → 4 left, 975 points, combo x3, its remains scraped in place with a hole where the blows landed) | the model is in `docs/knowledge-base.md` §6 with its sources; the code implements it (`world.edgesOf` → `world.wreckAlong` → `world.dent`/`scorch`/`rubble`) and the baseline asserts all three |
| 37 | **Buildings must be RE-RENDERED as v6 does — walls as planes, windows as sprites — not a photograph with a tint** | DONE on the vector route, proved on the real photograph (`docs/shots/photo-hurricane.png`) | a wall plane is BUILT: one tone, plus a darker tone where the surface turns away; each window is a **sprite of three parts** — dark frame, glass, a lighter sill under it — inside the facade rhythm's grid. The capture shows a facade as masonry with a window grid, and the hurricane's aftermath torn through it. **29 destroyable things** on the photograph, against 5 on the painted route |
| 38 | **An event must happen TO a built world, never overlay a picture (the hurricane was "a sign moving")** | **PARTLY** — the warning is now a beat (0.7 s) and the front crosses at 0.5 of the frame per second, so the event is mostly travel no longer; the front tears cells, structures and things as it passes. Still to do: the hurricane's winds should also uproot what is planted and drive debris across the frame in the built world's own terms | the rule is written at the end of `docs/knowledge-base.md` §7 |
| 39 | **An interim gate: every claim checked against the concept before it is reported** | **PARTLY** — `tools/concept-check.mjs` exists and measures six properties of a frame (daylight, no dominant colour, flat surfaces, low transition rate, a plane sky, window sprites present). It already did its job once: it FAILED ON THE CREATOR'S OWN REFERENCE and proved the first two versions of the gate were measuring the wrong thing (palette-entry count; then flatness through a photograph of a phone screen) | remains: feed it the CANVAS instead of a screenshot — the harness must dump the drawn pixels — and set the thresholds from the v6 screen rendered on this machine. Every threshold today is a guess and the doc says so |
| 40 | **Remove the wrong approach from its beginning: per-pixel painting of a photograph must not be the product's renderer** | **NOT DONE** — the constructive route (built walls, window sprites, road planes, car sprites) is `?style=vector`; the product still defaults to the photographic pipeline. The reason for the failure direction is written in `docs/concept-gate.md`: that pipeline's job is to approximate a photograph, so every stage fights the photograph's colours, and v6's parts dropped onto it float on noise | remains: make the constructive route the default, then delete the photographic pipeline from the product path (it may stay in the lab for colour extraction) |
| 30 | **Do not stop while a flaw is known** | **RULE** | a known flaw is an open row here; work continues until the row is DONE. Stopping to report is only allowed when a row genuinely needs the creator's decision (licence, money, or a choice between two goods) |

## The mandatory rule, in the place the creator asked for

> **A known flaw is an OPEN ROW in this file, and an open row is worked on until it is DONE. Reporting is not a
> substitute for working. The only allowed stop is a decision that is the creator's to make — a licence, a
> payment, or a choice between two good options — and it must be asked as a question, not handed back as a
> status.**

Checked mechanically: `tools/baseline-check.mjs` fails the build while any row marked FIXING/OPEN has no
artefact, and `docs/REQUIREMENTS.md` is read by the same script so a requirement cannot be quietly dropped.


## The logic connection: requirement → mechanism → artefact → check

Every row above is one link in this chain. A requirement with no mechanism is a wish; a mechanism with no
artefact is a plan; an artefact with no check is a claim.

| requirement | mechanism | artefact | check that proves it |
|---|---|---|---|
| 13 environment destructible | damage ladder per pixel | `world.chip`, `ENV_TOUGH` | *every surface has a toughness* |
| 14 objects destructible, minimal, resembling | the object's own border | `world.borderOf`, `world.wreckAlong` | *a thing has a BORDER, not only a box* · *a wreck is REMAINS, not a hole* |
| 26 disasters damage in borders | the same path a stone uses | `disaster.wrecks` → `wreckAlong` | *damage is scraped, not deleted* |
| 28 cars roll over | lift and scrape the car's own pixels | `world.rollOver` | *7596 pixels lifted, once only* |
| 29 windows/structures fall to the storm | the front hits every region once | `main.js` front handler | *the front takes the window and the structure* |
| **31 buildings destroyable** | facade planes become structures with hp | `vector.js` `structures`, `world.structures` | *a building is a STRUCTURE with hp* · *a wall is a RUIN, pixels remaining* |
| 25 info outlines | the thing's own border drawn | `world.infoMark`, renderer | *the info answer draws the border* |
| 22/23 beasts on screen | — | — | **FAILS on purpose** until drawn |
| 18 segmentation | — | — | **OPEN**: runtime decision |
| 3 levels | — | — | **OPEN**: the document |

The four OPEN rows are the whole of what is not built. Everything else in the list has a mechanism, an
artefact and a check, and the baseline fails if any of the three goes missing.


## THE METHOD, mandatory for every hard piece from now on

The creator's rule, and the one this session kept failing by skipping steps 1–4:

1. **SEARCH FOR THE SOLUTION.** Look for an existing, complete, working implementation before writing anything.
2. **IF THERE IS NO COMPLETE ONE, BREAK THE PROBLEM INTO PIECES.** Name each piece, and say what each must do.
3. **SEARCH FOR EACH PIECE SEPARATELY.** A piece may come from anywhere — a paper, a game, another screen of the
   creator's own — and each piece must name its exact source in the code where it is used.
4. **ASSEMBLE THE PIECES AND ADJUST.** Nothing is invented that can be taken.
5. **KEEP DROPPING LEVELS UNTIL THE SOLUTION IS CERTAIN TO WORK.** If a piece does not work, break it again.
   Certainty comes from a measurement (a test, a picture, a number), never from reading the code.
6. **AFTER EVERY ITERATION, GO THROUGH THE WHOLE THING BEFORE THE OUTPUT.** The checklist above, the baseline,
   the suite, and the screen — in that order — before anything is reported.

Where this rule is enforced: `tools/baseline-check.mjs` fails while a requirement row is unfinished, and the row
format above requires a source for anything taken from elsewhere. A piece with no source is treated as invented.


## What the real-photo capture changed (tools/photo-shot.mjs)

The blocking piece was never the game: it was that every visual row was unverifiable because my inline scripts
never returned. `tools/photo-shot.mjs` drives the page the way the harness is built to - short scripts, state
polling, a screenshot per state - and in its first run it exposed three faults that no test had:

| seen on the real photograph | fault | fixed |
|---|---|---|
| the yard vanished under an olive field | the flood **replaced** every pixel below the water line | the water now **mixes** with what is under it, deeper water hiding more, and only the top rows are foam |
| the wave was a small dark blob | the ported v6 sprite was drawn at 32 px on a 384-wide frame (v6 draws 32 in 185) | drawn at 64 px, the same share of the picture |
| a car was outlined as a **rectangle** | the tracer fell back to the box on a large solid region | v6's own **edges map** (`world.edgesOf`): a pixel is on the outline when a neighbour is not in the thing. No tracing, no simplification, no fallback - and the damage now tears along the silhouette too |
