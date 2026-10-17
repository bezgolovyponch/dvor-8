# THE DEFINITION OF DONE (the creator's v10 frame is the standard)

**Done = a frame on the creator's own photograph, at 288×512, in which:** (a) road, pavement, kerbs and markings are
the photograph's own layout, pixelated, unmoved; (b) the sky is a **designed** plane — one blue, a horizon band,
designed clouds — never the photo's sky; (c) every building is **rebuilt on the photo's own column and floor grid**:
drawn planes in 2–3 tones, drawn window sprites (frame · glass · sill), each floor a breakable chunk; (d) trees and
bushes are **drawn masses** of 2–3 greens; (e) cars, people, bins, bicycles keep **their own photo pixels**, cut out,
with **one 1-px outline** in the darkest entry; (f) a hit on a window breaks the glass, then cracks, darkens, empties
the frame, drops the panels, and **everything above a missing piece falls**, rubble staying; (g) info mode outlines
in cyan and blinks the selection, with a true fact; (h) `tools/reference-check.mjs` prints **COMPARABLE** on all five
measures against the v10 frame; (i) suite 320/0, delivery rule 10/10, gate 8/8, no page errors — and the picture is
looked at on a phone.

## WHAT IS MISSING, exactly

| # | missing | where it goes | measured now |
|---|---|---|---|
| 1 | **The ground and the objects are not scene kinds yet** — they still pass through the majority reduction, which softens the photograph's own pixels | `scene.ground`, `scene.objects`, painted FIRST and LAST, with **v10's own rule: every 5×5 block of photo pixels becomes one game pixel at the same position** | my road: 16 entries, layout kept, but smoothed; v10 keeps the block average crisp |
| 2 | **Walls are not painted through the scene** — the facade plane is drawn, then later passes re-touch it | `scene.walls` with `{ mask, tones[3], windows[] }` on the photo's column/floor pitch | wall 6 tones / 48% dominant (bar 8 / 40%) |
| 3 | **The sky's clouds are derived, not designed** — v6 places designed puffs on a flat base | `scene.sky.clouds` | sky 36% one tone, blue ✓ |
| 4 | **The HUD is not at parity**: no score readout of the v10 form, no "МАШИН n / n" counter, no danger meter, no throw button in the bar | `index.html` + `style.css` + `src/main.js` | bar has arrow, weapon, disaster, info |
| 5 | **Nothing is gated on the reference** — the comparison tool exists but is not wired into the delivery rule | `tools/deliver-check.mjs` line 10 | `reference-check` written, first run refused a browser screenshot as input |
| 6 | **Floors are chunks of 22 px, not the photo's own floor pitch** | `world.cellsOf` | pitch taken from window medians |

**The order they must be taken in** (each depends on the one above): 1 and 2 are both scene work and can be done
together; 3 is one function; 4 is independent and cheap; 5 must come before any claim, because it is the only
mechanism that knows what the result should look like; 6 rides on 2.
