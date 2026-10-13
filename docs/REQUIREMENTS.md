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
| 22 | Disasters: hurricane, tsunami, Godzilla, Beyoncé | DONE | all four ship. The fault that hid the beasts was an `if (at)` guard in the renderer swallowing a null: `beastAt()` was returning null whenever the active disaster was a hurricane, and nothing said so. The draw now reports itself (`window.__beast`: 3358 pixels, 0 skipped, 0 bad colours) |
| 23 | Pac-Man-style side view, head shake | **PARTLY** — chomp, head shake and the bite wedge are implemented; the silhouette is now tall and narrow (Beyoncé 64x310 px, ratio 0.21; Godzilla 48x309, 0.16), which is what a side view needs, but it is still built from a column profile rather than drawn as a side view with a face and limbs | remains: the drawn side view |
| 24 | Toolbar: arrow, name + dropdown, no word "weapon", disasters, info right | DONE | L3 `docs/shots/toolbar.png` |
| 25 | Info: pick an object, true random fact, always a different theme, **and the object must be OUTLINED** | DONE | the thing's own border (`world.borderOf`) is drawn as a dashed help outline for six seconds while the answer is on screen; facts unchanged |
| 26 | Disaster destruction with borders, decomposed, reusing verified pieces | DONE | `borderOf` + `wreckAlong`; disasters call the same path |
| 27 | Mandatory baseline that forces completion | DONE | `tools/baseline-check.mjs`, 22 rows, L3 = pictures |
| 28 | **Hurricane and tsunami must ROLL THE CARS OVER** | DONE | `world.rollOver`; the front rolls each vehicle once (7596 pixels lifted, measured) |
| 29 | **Windows and structures must be destroyed by the hurricane/tsunami, leaving ruins to share** | DONE | the front now hits every region in its path once, in the region's own border: windows pop, structures break, vehicles roll; the ruins stay and the card shares them |
| 31 | **BUILDINGS must be destroyable: the facade structure tears and the windows in it pop, leaving ruins to share** | DONE | `vector.js` hands each facade plane over as a **structure** with pixels and a border; `world.js` gives it 3 hit points; the hurricane front bites its own border each pass (`СТЕНА 1/3` … `СТЕНА ОБРУШИЛАСЬ`); windows inside pop with their own hits; the ruins stay and are what the card shows. Checks: a structure exists with hp 3 and its true area, a bite tears 100+ pixels in its own border, the void stays under 5% of it, and a wall with its hits spent is marked a ruin while its pixels remain |
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
