# OWNER CAPTURES — THE SIGN-OFF SHEET

The last line of the DONE list is **"owner's three captures accepted"**. This sheet is what the operator signs.
Each acceptance line can be checked **by looking at the picture** — no code, no terminal, no gate output.
Where a line is also measured by a named gate, the gate is cited; where it is only the eye's, that is said.

**How to use it:** open each capture, read the "look at" column, mark **accept / reject / note** for each line, then
sign at the bottom. A single **reject** blocks that capture; a note is recorded but does not block.

The captures are phone-frame screenshots (412 × 915) of **two yards** - the judged photograph (`photos-test/v10a.jpg`) and
the operator's own (`photos-test/yard2-new.jpg`) - produced by `tools/owner-captures.mjs` from the SHIPPED tree. The framed picture inside them starts at roughly **x 50, y 113** and runs down to the chip row (about two thirds
of the height); everything outside it is the app's chrome (HUD, tool chips, buttons, panels).

### the build these captures describe

build: `57dcd49be1d7ec8e0cbd37d20d4ee43fa76e41c08ca7d3107896bf5fd7f1fc0b`

That hash is sha256 over the sorted paths and bytes of every file that can change the frame (`src/**`, `index.html`,
`style.css`; 52 files, printed by `node tools/build-hash.mjs`). `tools/sheet-check.mjs` recomputes it and fails when
the tree has moved, so these pictures cannot describe a build that changed. A timestamp is not evidence: restoring
unchanged files moves their mtime while the build stays byte-identical, and `touch` moves a timestamp without changing
a byte.

### judged photograph (v10a)

| # | file | bytes | sha256 | what it shows |
|---|---|---|---|---|
| 1 | `reference/owner/1-imported-scene.png` | 314,334 | `a67ba8ef727001461ceb5747ba9122694d575eb0c1125ab19ea84d365fa95296` | the yard as first built |
| 2 | `reference/owner/2-drawer-open.png` | 208,112 | `43d95b80d7ce518b1cac2fbc7488ee8ca3ae5b9875c460b4d1a202381b5b6289` | the drawer a thumb opens: all nine hands, opened by its caret and verified open |
| 3 | `reference/owner/3-after-damage.png` | 364,605 | `f77eb1fa978c32a1acec03cecd52cf200ea2f8e94a43b4514aa01813505865f6` | after the scripted hits: the frame darkens, the score and the combo move |

### the operator's second yard (yard2-new)

| # | file | bytes | sha256 | what it shows |
|---|---|---|---|---|
| 1 | `reference/owner-yard2/1-imported-scene.png` | 297,579 | `b6b142878e5ae19eaa1871b44981580742b015bdd855a1fbd7cefe61a14c00a2` | the yard as first built |
| 2 | `reference/owner-yard2/2-drawer-open.png` | 179,174 | `6468577d74a5f582bc7602019b929734a2e367432955ddfa4932ac7643524756` | the drawer a thumb opens: all nine hands, opened by its caret and verified open |
| 3 | `reference/owner-yard2/3-after-damage.png` | 294,890 | `78c1e1c4526fef0663f874c693935d34345066abaf6c55cafd6e320b32778a2e` | after the scripted hits: the frame darkens, the score and the combo move |

**Copies live in the repository** - `reference/owner/` (the judged photograph) and `reference/owner-yard2/` (the operator's yard), byte-identical to the tables above - so the sheet and the pictures travel together.

The files are byte-identical to the ones this sheet describes as long as their sha256 matches the table. If a capture
is regenerated, its hash changes and this sheet must be re-signed.

---

## Capture 1 — the imported scene (`1-imported-scene.png`)

| # | look at | what "acceptable" means | measured by | operator |
|---|---|---|---|---|
| 1.1 | the whole framed picture | it is **recognisably your photographed yard**: the tall building on the left, the lower block on the right, the road with the parked cars, the green strip | pairing-check (`PAIRED`, IoU 0.69 on the sky) + your eye | accept / reject / note |
| 1.2 | the sky | a **blue plane at the top of the frame** carrying a **drawn cloudscape** below it: white clouds whose shaded undersides are the sky ramp's own blue, an irregular silhouette per cloud, no traced photographic cloud, no grain | delivery-check S1 (the band's most common colour is still the blue plane, 42% of it), v13-check V2 (largest tone 64.2% of the sky, bar ≤70), reference-palette-check (`MATCHES`) | accept / reject / note |
| 1.3 | between the buildings and the ground | **one dark line** runs across, separating the picture's upper structures from the ground — the frame's spine | `plan-check` line A/B (the accepted frame's own horizon, row 352) and the band plan, `docs/DECISIONS.md` D15 | accept / reject / note |
| 1.4 | the left building | reads as **one dark facade with a regular window grid** (dark plane, light-grained windows) | `match-check` "tower dark plane dominates" (≥35%, ours 35.3%) | accept / reject / note |
| 1.5 | the right building | reads as **light and dark panels alternating** (the checkered facade), not as a flat wall | `match-check` "midrise checkerboard" (white 28% / blue 44%) | accept / reject / note |
| 1.6 | the road and the parked cars | the cars keep the **photograph's own shapes and positions**; every silhouette carries a **one-pixel dark outline** | style-check (8/8), delivery line 2 ("window sprites ≥40") and 2b (wall tones) | accept / reject / note |
| 1.7 | the HUD, outside the picture | untouched: `0 очки · 60 осталось · 0 разбито`, the tool chips (`КИРПИЧ`, `СТИХИЯ`), `СПРЯТАТЬ`, the panel below | style-check (8/8) — the HUD is the app's chrome, not the converted frame | accept / reject / note |

**What would make this capture unacceptable**
- any part of the framed picture still looks like **the photograph itself** (smooth grain, real gradients) instead of
  drawn flat planes;
- the sky carries **the photograph's own clouds** (traced shapes with the photo's grain) instead of drawn ones, or its
  cloud tones are cut off along a **hard horizontal band**;
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
| 3.4 | the sky and the horizon line | unchanged: the same blue plane and the same drawn cloudscape, the same single horizon line | reference-palette-check (`MATCHES`) | accept / reject / note |
| 3.5 | the HUD | outside the picture, untouched except the three numbers | your eye | accept / reject / note |
| 3.6 | leftovers | **no full-screen flash, freeze or overlay** left behind after the hit | your eye | accept / reject / note |

**What would make this capture unacceptable**
- the counters disagree (score rose but `разбито` is 0, or remaining rose);
- **no visible change** on the object that was hit;
- the whole picture **re-rendered differently** between capture 1 and capture 3 (objects moved, sky changed);
- a damage flash or overlay is still covering the frame.

---

## What these captures do NOT settle

The captures are the operator's eye on **two yards** at **one viewport** (412 × 915). They do not settle:

1. **R1 — comparability with the accepted frame.** *At the time of writing* the chain's R1 line reads **0.044** on the
   worst family (bar 0.05) and reports 19 of 19 criteria MET. Earlier rounds recorded 0.173 while the mullion family
   was open; that number is history, not the build on this sheet — the gate prints its own figure on every run.
2. **The tower's glass ratio.** The pane sweep proved no ring-around-a-pane ratio carries the accepted frame's 35% dark
   **and** its 30–50% blue; the structure that does is the grid mullions, and the left building in capture 1 is drawn
   that way. The capture is the evidence; the accepted frame's own ratio is the bar.
3. **The baseline rows.** `baseline-check` reads **49 OK / 0 FAIL of 49** — one row fewer than the DONE list's
   "50/50", because a row claiming a beast on a photograph was **withdrawn** (D23: the walking beasts never reach the
   canvas). The DONE list's number is therefore met as **49/49**, and the withdrawal is recorded rather than hidden.
4. **Other photographs.** Capture 3 of each yard is the same yard after damage; `match-check`'s regions are the accepted
   frame's rectangles, so its verdicts are conformance **for the judged photograph only** (the plan and pairing gates
   are the photo-agnostic ones, and both yards pass them).
5. **Other viewports, audio, haptics, and the real phone.** The captures are headless screenshots at one size; nothing
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
**These captures are from the shipped build `v0.5.4`** (the release the README links to), taken with
`tools/owner-captures.mjs` on `photos-test/v10a.jpg` at 412x915 — the same tree the chain passed on. If the code moves,
re-run the tool and this sheet's hashes, or the sheet describes a build that no longer exists.
