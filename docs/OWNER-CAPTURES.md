# OWNER CAPTURES — THE SIGN-OFF SHEET

The last line of the DONE list is **"owner's three captures accepted"**. This sheet is what the operator signs.
Each acceptance line can be checked **by looking at the picture** — no code, no terminal, no gate output.
Where a line is also measured by a named gate, the gate is cited; where it is only the eye's, that is said.

**How to use it:** open each capture, read the "look at" column, mark **accept / reject / note** for each line, then
sign at the bottom. A single **reject** blocks that capture; a note is recorded but does not block.

The captures are phone-frame screenshots (412 × 915) of **two yards** - the judged photograph (`photos-test/v10a.jpg`) and
the operator's own (`photos-test/yard2-new.jpg`) - produced by `tools/owner-captures.mjs` from the SHIPPED tree. The framed picture inside them starts at roughly **x 50, y 113** and runs down to the chip row (about two thirds
of the height); everything outside it is the app's chrome (HUD, tool chips, buttons, panels).

### judged photograph (v10a)

| # | file | bytes | sha256 | what it shows |
|---|---|---|---|---|
| 1 | `/tmp/oc-v10a/1-imported-scene.png` | 313 200 | `d0fa6f087fab532242c1596b9b73a747aa4da79a9ef7fa9f5673182c459c2812` | the yard as first built |
| 2 | `/tmp/oc-v10a/2-drawer-open.png` | 199 949 | `aae510182480bc7787d28201b0e3d4eb31a43bf362c45a842c892f3a6972d764` | the drawer a thumb opens |
| 3 | `/tmp/oc-v10a/3-after-damage.png` | 328 223 | `1ea759287a1e1760872d6b34c6a5a1515ff0b44501551292b27a0e47b2e40caa` | after the scripted hits |

### the operator's second yard (yard2-new)

| # | file | bytes | sha256 | what it shows |
|---|---|---|---|---|
| 1 | `/tmp/oc-yard2/1-imported-scene.png` | 278 305 | `187c1aedfa68eaeeb4c278f64154fdd1fdb8633a5fb450102ff7b92a386b6516` | the yard as first built |
| 2 | `/tmp/oc-yard2/2-drawer-open.png` | 175 572 | `9e70ecf2c33030401256c3a15e999d48e59cc55f47eed29860afb50e09345282` | the drawer a thumb opens |
| 3 | `/tmp/oc-yard2/3-after-damage.png` | 304 743 | `c5aafc05cc7faa669f6125aa6b00f81411a8fa8529f760f04ebeac4703dbb84a` | after the scripted hits |


**Copies live in the repository** - `reference/owner/` (the judged photograph) and `reference/owner-yard2/` (the operator's yard), byte-identical to the tables above - so the sheet and the pictures travel together.

The files are byte-identical to the ones this sheet describes as long as their sha256 matches the table. If a capture
is regenerated, its hash changes and this sheet must be re-signed.

---

## Capture 1 — the imported scene (`1-imported-scene.png`)

| # | look at | what "acceptable" means | measured by | operator |
|---|---|---|---|---|
| 1.1 | the whole framed picture | it is **recognisably your photographed yard**: the tall building on the left, the lower block on the right, the road with the parked cars, the green strip | pairing-check (`PAIRED`, IoU 0.69 on the sky) + your eye | accept / reject / note |
| 1.2 | the sky | **one flat blue** with a few **white drawn clouds**; no gradient, no photographic grain, no banding | reference-palette-check (`MATCHES`), concept gate (`the SKY is a plane`) | accept / reject / note |
| 1.3 | between the buildings and the ground | **one dark line** runs across, separating the picture's upper structures from the ground — the frame's spine | `plan-check` line A/B (the accepted frame's own horizon, row 352) and the band plan, `docs/DECISIONS.md` D15 | accept / reject / note |
| 1.4 | the left building | reads as **one dark facade with a regular window grid** (dark plane, light-grained windows) | `match-check` "tower dark plane dominates" (≥35%, ours 35.3%) | accept / reject / note |
| 1.5 | the right building | reads as **light and dark panels alternating** (the checkered facade), not as a flat wall | `match-check` "midrise checkerboard" (white 28% / blue 44%) | accept / reject / note |
| 1.6 | the road and the parked cars | the cars keep the **photograph's own shapes and positions**; every silhouette carries a **one-pixel dark outline** | style-check (8/8), delivery line 2 ("window sprites ≥40") and 2b (wall tones) | accept / reject / note |
| 1.7 | the HUD, outside the picture | untouched: `0 очки · 60 осталось · 0 разбито`, the tool chips (`КИРПИЧ`, `СТИХИЯ`), `СПРЯТАТЬ`, the panel below | style-check (8/8) — the HUD is the app's chrome, not the converted frame | accept / reject / note |

**What would make this capture unacceptable**
- any part of the framed picture still looks like **the photograph itself** (smooth grain, real gradients) instead of
  drawn flat planes;
- the sky is a **gradient** or carries more than a handful of cloud shapes, or the clouds are cut by a hard band;
- **no horizon line**, or several competing lines;
- the two buildings read the **same** (no dark plane, no alternating panels) — the frame has lost its two archetypes;
- a parked car is **missing or moved** relative to the photograph, or a silhouette has **no outline**;
- the HUD reads anything other than `0 / 60 / 0` on first build.

---

## Capture 2 — the drawer open (`2-drawer-open.png`)

| # | look at | what "acceptable" means | measured by | operator |
|---|---|---|---|---|
| 2.1 | the drawer | **all throwables are listed**, each with its name and a one-line description, and **none is cut off** (this build shows nine cards) | page self-test (7 rows drawn, 0 FAIL) — the panel's own readout | accept / reject / note |
| 2.2 | the cards' text | legible at phone size, no overlapping or clipped lines | your eye | accept / reject / note |
| 2.3 | the picture behind the drawer | it is **still the same yard** — the drawer sits over it, it does not replace it | pairing-check (`PAIRED`) on the same frame | accept / reject / note |
| 2.4 | the tool chips | show the selected tool (`КАМЕНЬ`) and the line `В РУКЕ КАМЕНЬ` | your eye | accept / reject / note |
| 2.5 | the drawer's frame | stays **inside the app's chrome**, does not spill over the HUD or the bottom panel | your eye | accept / reject / note |
| 2.6 | the HUD | unchanged from capture 1 (`0 / 60 / 0`) | your eye | accept / reject / note |

**What would make this capture unacceptable**
- a throwable is **missing from the drawer**, or a card is clipped so its description cannot be read;
- the drawer **covers the whole picture** or the picture behind it is a different frame;
- the selected-tool line contradicts the highlighted chip;
- the drawer overlaps the HUD numbers or the bottom panel.

---

## Capture 3 — after damage (`3-after-damage.png`)

| # | look at | what "acceptable" means | measured by | operator |
|---|---|---|---|---|
| 3.1 | the three counters | they moved **together and consistently**: score up (`300`), remaining down (`59`), broken shows `1` | the page's own damage routine; the counters are printed in the capture | accept / reject / note |
| 3.2 | the thing that was hit | the hit is **visible on the object itself** — its surface changes where it was struck, and it keeps its outline | `test.mjs` (chip mark, `done` when nothing stands) | accept / reject / note |
| 3.3 | everything else | looks as in capture 1 — **the frame was not redrawn or shuffled** | pairing-check (`PAIRED`) | accept / reject / note |
| 3.4 | the sky and the horizon line | unchanged: same flat blue, same clouds, same single line | reference-palette-check (`MATCHES`) | accept / reject / note |
| 3.5 | the HUD | outside the picture, untouched except the three numbers | your eye | accept / reject / note |
| 3.6 | leftovers | **no full-screen flash, freeze or overlay** left behind after the hit | your eye | accept / reject / note |

**What would make this capture unacceptable**
- the counters disagree (score rose but `разбито` is 0, or remaining rose);
- **no visible change** on the object that was hit;
- the whole picture **re-rendered differently** between capture 1 and capture 3 (objects moved, sky changed);
- a damage flash or overlay is still covering the frame.

---

## What these captures do NOT settle

The captures are the operator's eye on **the judged yard** (`v10a`) at **one viewport** (412 × 915). They do not settle:

1. **R1 — comparability with the accepted frame.** The frame is still 0.173 off on the neutral family (mullion) at the
   worst; the chain stops at `1 CRITERIA`. Numbers and the band-by-band map: `RUNLOG.md` T+74, T+77.
2. **The tower's glass ratio.** The pane sweep (T+78) proved that no ring-around-a-pane ratio can carry the accepted
   frame's 35% dark together with its 30–50% blue; the drawing structure (grid mullions) is the next change. The
   capture's left building is **acceptable to the eye** but **short of the accepted frame's own ratio**.
3. **The open baseline rows.** `baseline-check` reads 32 OK / 18 FAIL of 50 (`RUNLOG.md` T+68); the failing rows are
   listed in `docs/BASELINE.md`. They need work **or the operator's signature**, per the DONE list
   ("baseline 50/50 or signed").
4. **The concept gate's one failing row** — "no single colour has swallowed the picture" (largest colour below the
   sky 37–41% against ≤32%). It is the same dark dominance as item 1 and is not visible as a defect in these
   captures, which is exactly why it is listed here rather than accepted.
5. **Other photographs.** These three captures are `v10a` only. On a different yard `match-check`'s regions are the
   accepted frame's rectangles, so its verdicts must not be read as conformance for that yard (measured 5/7 on
   `photos-test/yard2-new.jpg`).
6. **Other viewports, audio, haptics, and the real phone.** The captures are headless screenshots at one size; nothing
   here proves the game behaves the same on the operator's own device.

**UNVERIFIED BY THIS SHEET:** the exact per-hit damage model on screen (the captures show one hit, not a sequence);
whether the sound and vibration fire (not visible in a screenshot); the frame at viewport sizes other than 412 × 915.

---

## Signature

I have looked at the three captures and marked each line above.

- **Capture 1 — accepted / accepted with notes / rejected** — notes: ______________________________
- **Capture 2 — accepted / accepted with notes / rejected** — notes: ______________________________
- **Capture 3 — accepted / accepted with notes / rejected** — notes: ______________________________

**Owner:** __________________________  **Date:** ______________

**Overall verdict:** ACCEPT / ACCEPT WITH NOTES / REJECT
**These captures are from the shipped build `v0.5.2`** (the release the README links to), taken with
`tools/owner-captures.mjs` on `photos-test/v10a.jpg` at 412x915 — the same tree the chain passed on. If the code moves,
re-run the tool and this sheet's hashes, or the sheet describes a build that no longer exists.
