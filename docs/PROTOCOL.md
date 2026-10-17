# THE PROTOCOL — one file, no contradictions. Everything else is either evidence or archived.

## 1. THE CONCEPT, in three sentences

A phone photograph of a yard becomes a playable pixel-art level **in a fixed style defined before any photograph is
converted**. The photograph supplies **facts — where things are, their shapes, what is light and dark**; the style
supplies **everything drawn** (sky, facades, windows) and the palette. The player must **recognise their own yard** and
be able to **break it**, and what is broken stays broken; people are never targets.

## 2. THE PIPELINE — published methods, in this order, and no others

```
1  SCENE PARSE     SegFormer-B0 Cityscapes, on-device (vendor/seg, 4.4 MB, 19 classes)
                   → sky · building · road · sidewalk · car · person · vegetation · wall · pole · …
2  HORIZON         the sky class's lower boundary per column, interpolated where a building occludes it
3  FACADE GEOMETRY building masks → planes; window pitch fitted to the photograph's own openings
4  REDUCTION       contrast-aware SELECTION per 5×5 block (PixelOE), never an average
5  OBJECTS         detector boxes ∩ class masks → one connected mass per thing, own colours
6  STYLE           palette, register (mid tones carry the frame), sky design, window sprite, HUD
7  OUTLINES        buildings and cars only · silhouette only · aimed gold, picked cyan, damaged grey
```

**Rules that are not mine, and that may not be replaced by a heuristic:**
the sky is **above the horizon and the building outlines**; the sky region **never exceeds** the sky class; the grid
pitch is **measured**; the reduction is a **selection**; **one mass per thing**.

## 3. THE GATES — each with its command, what it proves, and its mutation proof

| gate | command | proves | can it fail? |
|---|---|---|---|
| wiring | `node tools/undefined-check.mjs` | every used name is imported; every import is real | **yes** — deleted import → exit 1 |
| preflight | `node tools/preflight.mjs` | the canon documents exist and carry the load-bearing statements | **yes** — altered statement → exit 1 |
| builds | `node tools/chain.mjs` (step 6) | a yard is built from a real photograph, console clean | **yes** — empty build → left 0 |
| not a wash | `node tools/family-check.mjs <dump>` | many tones, none dominant (sky exempt) | **yes** — synthetic wash → exit 1 |
| **matches the photograph** | `node tools/pairing-check.mjs <photo> <dump>` | the drawn sky sits where the photograph's sky is (IoU ≥ 0.60) | **yes** — greedy sky failed on 4 of 6 photos |
| **matches the example** | `node tools/match-check.mjs <dump>` | region by region against **reference/TARGET.json**, extracted from the creator's own frame | **yes** — 3 of 7 today |
| palette | `node tools/reference-palette-check.mjs <dump>` | sky hue/sat, white clouds, grey warmth and lightness | **yes** — sky was 11° and 0.36 off |
| pieces | `node tools/piece-facade-check.mjs`, `node tools/piece-downscale-check.mjs` | a piece is correct BEFORE it enters the pipeline | **yes** — a 1-px line: selection 8/8, area mean 0/8 |

**THE LAW: nothing is called done while any gate fails.** A failing gate names the next action; a gate that cannot
fail is not a gate and must be shown to refuse a deliberate fault before it is trusted.

## 4. THE LOOP — the only working method in this project's history

```
LOOK at the frame  →  NAME the one fault in the frame's own words  →  FIX it at its source  →  LOOK again
```

and around it: `undefined-check` + `preflight` **before**, `match-check` + `pairing-check` **after**. Every real
improvement in this project came from that loop; every wasted hour came from replacing "look" with a number I authored.

## 5. THE FAILURE TAXONOMY — my mistake patterns, each with the rule that prevents it

| # | pattern | what it looked like here | the rule |
|---|---|---|---|
| 1 | **Instrument lies** | a comment grepped as an import; a cache wrapper iterated as a list; a transient frame captured as the frame; a phone screenshot measured for numbers; a hidden canvas measured instead of the game's | every instrument prints its premises and withholds the verdict; capture only finished frames |
| 2 | **Inventing what exists** | sky by colour test (should be the `sky` class); facades by hue and straight runs (should be the `building` class); a fixed 9×11 window grid (should be measured pitch) | research the published method first; a heuristic is allowed only where no method exists |
| 3 | **Averaging instead of selecting** | 5×5 area mean, which erases the 1-px structure the eye reads as structure | contrast-aware selection, proven 8/8 vs 0/8 |
| 4 | **Silent catch** | `await sceneParse(...).catch(() => null)` hid an ImageData-not-canvas throw; "the parse never ran" with no error | a caught error is recorded and shown; never swallow |
| 5 | **Painting last that erases earlier work** | the sky repaint wiped the clouds; the register lift broke the spread | order the passes explicitly and assert the invariants after each |
| 6 | **Documentation over building** | 47 docs, several contradicting, while the frame was wrong | one protocol, evidence elsewhere; a doc that contradicts the frame is a bug |
| 7 | **Scope drift to the easy thing** | banners, HUD, docs — while sky/road could not be told apart | the work list is the failing gate lines, in their order |
| 8 | **Restarting from scratch** | re-deriving rules already measured | every rule lives in this file or `reference/`, with its measurement |
| 9 | **Claiming progress** | "done", "fixed", "matches" from runs that never compared to the example | the only admissible claim is a gate's line |
| 10 | **Losing the yardstick** | the creator's frame was in front of me for weeks and never became a target | the example is `reference/TARGET.json` and `match-check` is binding |

## 6. THE EXACT NEXT ACTIONS, in order — the failing lines and nothing else

RE-MEASURED 2026-10-16 with `node tools/match-check.mjs <canvas dump of the live page on photos-test/v10a.jpg>`:
**4 of 7 lines match.** The clouds line of the previous edition is CLOSED — `6d REFERENCE` in the chain and
`tools/style-check.mjs` ("clouds pure white") both pass it. The road line has MOVED the other way: our road is now
too LIGHT, not too dark. This list replaces the previous edition, as §5-#6 requires (a doc that contradicts the
frame is a bug).

```
FAIL  tower   blue-glass windows  example ≥10% blue     ours 4%     → facade sprite: glass rgb(77,100,180) lit,
                                                                       rgb(49,62,122) shaded; light frame
FAIL  midrise checkerboard        white+dark-blue       white 0%    → facade checker mode: alternate bays where the
                                  ≥8% each              blue 17%      photograph alternates
CLOSED road   the asphalt tone    rgb(98,94,105) L0.39  L0.38       → closed 2026-10-16: the ground's register ladder
                                  warmth -7             warmth -11    now climbs ONE rung (stylise.js groundMaxTone),
                                                                      measured against the accepted frame's road
                                                                      (its own region: luma 90, 46.6% dark). The
                                                                      road line PASSES in tools/match-check.mjs
```

Each is one change in one module, each is judged by `match-check` and `pairing-check`, and **the job is finished when
7 of 7 lines pass on both of the creator's photographs.**


---

# ANSWERS TO THE OPERATIONAL QUESTIONS

## "How can I manually improve your performance?"

1. **Keep the example frame binding.** `reference/TARGET.json` + `tools/match-check.mjs` is the only thing that has
   ever stopped the drift. If a session does not run `match-check`, it is guessing.
2. **Ask for gate output, never for adjectives.** "Show me `match-check` and `pairing-check`" ends the circling in one
   message. Any answer without those two is a story.
3. **Name the frame.** "The sky is above the horizon" beat every heuristic I invented; the creator's own words are the
   strongest specification available.
4. **Refuse scope drift.** When I reach for banners, docs or dashboards while a `match-check` line fails, stop me: the
   work list is the failing lines, in order.
5. **One fault per turn.** A turn that fixes three things has verified none.

## "Do I need a new chat?"

**Yes, and it is now cheap and safe.** This session carries dozens of dead ends; a fresh one starts from
`docs/PROTOCOL.md` (concept, pipeline, gates, loop, failure taxonomy), `docs/METHODS.md` (the published method set),
`reference/TARGET.json` (the example, measured) and the four failing lines. Nothing else is needed — the canon is
self-contained, and the archived documents are explicitly not canon.

## "What plugins do I have to add?"

**None.** Everything needed exists: the browser plugins drive the real page (`?photo=<url>` loads a photograph with no
file picker), subagents run fixes in their own contexts, and the models are vendored (`vendor/seg/`,
`vendor/tjs/`, `vendor/mediapipe/`). What is worth adding is not a plugin but a **habit**: run the gates before
believing anything, including me.

## THE FIRST FOUR COMMANDS OF THE NEXT SESSION

```
node tools/preflight.mjs                                             # the canon is present and consistent
node tools/match-check.mjs <a captured canvas.json>                   # 3 of 7 today; 7 of 7 is the goal
node tools/pairing-check.mjs photos-test/v10a.jpg <the same dump>     # PAIRED today; must stay PAIRED
node tools/piece-facade-check.mjs && node tools/piece-downscale-check.mjs   # the pieces before the pipeline
```

then the four failing lines, in order: **white clouds → blue-glass windows → checkerboard mid-rise → the road's
register**, each one change in one module, each verified by re-running `match-check`.
