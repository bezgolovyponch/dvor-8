# THE CREATOR'S CRITERIA — in their own words, one file, and checked

This file exists because the definition of done lived **only in the creator's screens and messages** and in my prose
about them. Every tool I built measured my own inventions instead. The words below are quoted from the creator's own
panels and messages; each row says how it is checked. `tools/baseline-check.mjs` reads this file.

## The frame

| id | criterion — the creator's own words | checked by |
|---|---|---|
| F1 | *"One palette for the whole frame."* | the gate: palette entries = the project's own table, on the drawn canvas |
| F2 | *"One outline rule (the darkest palette colour, 1 px) on every target, never mixed."* | `render.js` draws outlines from the owner map in one entry; the suite asserts a single outline colour |
| F3 | *"Stray pixels cleaned."* | the stray-share measure in `tools/reference-check.mjs` and the cleanup pass in `vector.js` |
| F4 | *"Dithering only in the sky's horizon band."* | the gate's sky band rows |

## The photograph, and where it is kept

| id | criterion | checked by |
|---|---|---|
| P1 | *"The road, sidewalk, hedge, trees, people and all 6 cars are the photo, pixelated: averaged into 288×512 and snapped to one palette, with nothing redrawn."* | the gate's road row (≥8 tones of the road's own ramp, layout unmoved) |
| P2 | *"Every block of 5×5 photo pixels becomes one game pixel at the same position, so the game frame lines up with the photo exactly."* | **MET** — the photograph is drawn at 5× the game grid and reduced by `flat.js boxDown`: five by five source pixels become one game pixel at the same position. The mush went with the browser interpolation that the criterion replaces |
| P3 | *"Each car gets a 1-px outline."* | the owner-map outline in `render.js` |

## The sky

| id | criterion | checked by |
|---|---|---|
| S1 | *"The sky is the v6 design: one blue with designed clouds."* | delivery line 1: one blue plane, one tone owning ≥35% of the band |

## The buildings and the windows

| id | criterion | checked by |
|---|---|---|
| B1 | *"The buildings are the v6 approach: rebuilt on the photo's column and floor grid, so every window and every floor can break."* | window sprites counted per frame (delivery line 2) + `world.cellsOf` pitch from the facade's own windows |
| B2 | *"v6 rebuilt on the photo grid **liked** · v7 invented **rejected**."* | the wall is a plane in one family, 2–3 tones (delivery line 2b) |
| B3 | *"Every glass cell is a window object."* | window sprites are first-class targets (`kind: 'window'`) |
| B4 | *"Each facade is split into chunks floor by floor, and each chunk knows which chunk holds it up."* | `world.breakCells`: a cell whose support is gone falls (suite check) |
| B5 | *"The tower's glass wall and the checkered block are rebuilt on the photo's own column and floor spacing."* | `cellsOf` takes the pitch from the facade's own window medians |

## The objects and the interactions

| id | criterion | checked by |
|---|---|---|
| O1 | *"Each car gets a 1-px outline"* and *"v9 photo pixels plus one shared outline"* (the cartoon template is **rejected**) | the cut-out keeps the thing's own pixels; one outline from the owner map |
| I1 | *"Throw at a window: the glass breaks. Hit the same spot again: it cracks, then darkens, then the panels fall off and leave the frame, then the frame falls. Anything above a missing piece falls after it, and the rubble stays."* | the damage ladder + `breakCells` + glass particles + permanence (suite) |
| I2 | *"An object's edge is every pixel that touches a pixel of another object. Buildings get a 1-px outline against the sky. Aiming shows a pink edge, info mode a cyan one, and a selected object blinks cyan and yellow."* | `render.js`: aim pink, info cyan, selection blinking; outline from the owner map |
| I3 | *"Baseline: the 10 checks … run automatically every time the page loads, and the results are shown on the page. There's also a button to run them again."* | the page's OWN panel, read by the page step: rows present at load, then the box emptied and `#selfRun` clicked (`tools/photo-shot.mjs` → `selftest.json` beside `canvas.json` → `tools/criteria-check.mjs`); no page step = no verdict |

## The outlines follow the shape

| id | criterion — the creator's own words | checked by |
|---|---|---|
| D1 | *"the buildings and cars have to be destructable, so their outline will be also changing as the shape changes"* | `world.touch()` bumps a version on every damage path; `render.js` caches an outline only while the version matches, so a wrecked thing is outlined by its WRECKED silhouette |

## The reference itself

| id | criterion | checked by |
|---|---|---|
| R1 | the result must be comparable to the creator's own accepted frame | `tools/accepted-frame.py` (the owner's referee, PART A.3): the accepted frame is EXTRACTED from `reference/v10a-accepted-frame-screenshot.png` (lossy WebP, HUD masked), and both frames are measured with the same family classifier INSIDE the mask; comparable when every family share is within 0.05. The method is validated by reproducing the owner's own sky cross-check to 0.01. `tools/reference-check.mjs` against the DERIVED canvas stays as a printed diagnostic only |
