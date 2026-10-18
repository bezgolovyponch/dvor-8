# AUDIT — the product against the operator's v13 file (2026-10-18)

> **What this is.** The audit the operator asked for before the definitive loop: the current work, the main chain, the
> baseline, the mandatory protocols and the machine-loop instructions, read against the new input
> (`DVOR-8 Photo2Pixel v13.dc.html`, analysed in `docs/V13-ANALYSIS.md`). Every finding carries the measurement that
> produced it. The gate suite built for this round is named, and its mutation proofs are recorded. Nothing in this
> document is a plan for what "should" look right: the work list is the failing gate lines.

## 1. WHAT WAS READ AND RUN

```
read   docs/V13-ANALYSIS.md (the line-by-line analysis of the operator's file)
read   START-HERE.md · docs/LOOP.md (§1–§11) · docs/PROTOCOL.md's role · docs/OWNER-CAPTURES.md · RUNLOG.md tail
ran    node tools/preflight.mjs            exit 0 (17 parts, 19 criteria rows)
ran    node tools/chain.mjs                exit 1 — stopped at 5 SHEET (see F4); all other steps PASS
ran    node tools/match-check.mjs <dump>   8 of 8 (the share gate passes — see F6)
ran    node tools/v13/refs.mjs             reference frames written, 4 scenes, two builds each with equal FNV
ran    node tools/v13-check.mjs prague-tower  6 of 7 lines FAIL (see §4)
ran    node tools/sheet-check.mjs          exit 0 after the fix (F4)
HEAD   db26c77 · branch main · tree clean apart from the new reference/gate files this round adds
```

## 2. THE STATE THE OPERATOR'S INSTRUCTION FOUND

The tree was carrying an **uncommitted, unmeasured experiment**: a perspective "curtain wall" piece
(`src/pieces/curtain.js`, +56 lines in `src/vector.js`, `WINDOWS_MAX 6 → 400` in `src/frame.js`, a `?plain=1`
probe in `src/main.js`). Its own comments claim the T+122 round; the RUNLOG has no T+122 entry and the chain had
never been run on it in this session.

Measured on it: `match-check` 7 of 8, **tower dark plane 14.2%** against the ≥35% bar, tower blue 78.1% (the bar is
≥10%, and the reference reading is blue 35.1% / dark 30.2% in the same region). The frame showed the tower as a
per-pixel blue speckle. It was **reverted with its measurement** (the project's own rule for a rejected variant):
patch kept at `/tmp/curtain-attempt.patch`, file kept at `/tmp/curtain.js.attempt`, recorded as D21's fourth attempt.

After the revert the chain measures: criteria 19/19 · composition 10/10 · suite 321/0 · delivery 12/12 · PAGE 58 left,
console clean · families PASS · pairing PAIRED (IoU 0.85) · reference MATCHES · plan 8/8 · **match 8/8** · SHEET and
DOCS as below. That is the green baseline this audit starts from.

## 3. AUDIT FINDINGS

### F1 — the uncommitted facade experiment broke the match gate (CLOSED: reverted, measured)

Evidence: `match-check` tower dark 14.2% / blue 78.1%; the frame `/tmp/chain-page/frame-now.png` (rendered from the
dump) shows the tower as per-pixel blue noise. Cause: it painted a synthetic pane grid instead of keeping the
photograph (the reference's S11). Reverting restored match 8/8. Status: closed, patch preserved, to be recorded in
DECISIONS D21 with the numbers.

### F2 — "the v13 reference" was a locally patched engine, not the operator's file (CLOSED: extracted exactly)

`tools/v13/shot.mjs` reads `tools/v13/engine.txt` (sha256 `1b2cb4d1…`, 125,762 chars), which is **not** in the
operator's HTML. The operator's engine is 115,511 chars, sha256 `ea0273fe…` (committed byte-exact as
`tools/v13/engine-v13.txt` and re-verified from the HTML on every reference run). The fork's three deltas are
defensible fixes to measured defects (strongest period, profile read inside the facade mask, glass decided before the
checker), but they were never recorded as a fork, and the runner called itself "v13". Status: closed — the canonical
reference is now the operator's engine; the fork stays as `engine.txt` with the delta documented in
`docs/V13-ANALYSIS.md §11`.

### F3 — the first reference frames were corrupted by a 2× blit into a 1× canvas (CLOSED: caught by looking)

The reference runner's first PNGs were scanline noise: `blit2()` writes 2×2 blocks for a 576×1024 phone buffer, and it
was fed a 288×512 canvas. The tool reported success; only **looking at the artefact** found it (the skill's rule).
Fixed to a 1:1 index blit; the four frames are now legible and match the operator's screenshots' content. Status:
closed.

### F4 — the owner's sheet used mtime as "freshness" and produced a false red (CLOSED: content-addressed)

`tools/sheet-check.mjs` failed all six owner captures on `mtime < newest src` after `git checkout` restored unchanged
files (the sha256 rows passed). A timestamp measures the filesystem, not the build — and `touch` can fake the other
direction. Fixed: `tools/build-hash.mjs` hashes `src/**` + `index.html` + `style.css` by content
(51 files, sha256 `5251d642…`), the sheet records it, the gate recomputes it, and `tools/owner-captures.mjs` prints it
so a re-capture can be re-signed. Mutation proof: appending one byte to `src/rng.js` makes the gate report
`SHEET: 1 row not true` (exit 1); restoring makes it exit 0. Status: closed. The baseline gate's `shotNewerThan`
helper is the same class and is **open** (F9).

### F5 — the product is far from the reference on every drawing law (OPEN: the work list)

`tools/v13-check.mjs prague-tower /tmp/v13chk/canvas.json` (reference = the operator's engine on the same photo):

```
FAIL V1 PALETTE   distinct tones 37 ≤ 24        (reference 16; v13 S1: 12 photo + ≤5 sky + 4 glass + outline + void)
FAIL V2 SKY       largest tone 85.7% of the sky  (bar ≤70%; reference 50.1%)
FAIL V3 GROUND    largest tone 72.0% of ground   (bar ≤60%; reference 45.6%)
ok   V4 CARS      largest tone 33.4% of cars     (bar ≤35%; reference 28.7%)
FAIL V5 FACADE    ОФИСНАЯ БАШНЯ: tones 7 ≥ 10 · one tone 42.1% ≤ 35% · top3 99.2% ≤ 85%   (reference 16 / 26.6% / 58.9%)
FAIL V6 WINDOWS   windows 50 ≥ 132               (10% of the reference's 1321 panes; tower 48/1262, checker 1/228)
FAIL V7 DISTANCE  ours 69.31% differs from the reference   (bar ≤56.66% = the accepted frame's 51.66% + 5)
```

Reading of each line against the operator's words:

- **"color pattern/palette is overcomplicated and visually not appealing"** — V1 + V2 + V3: 37 tones, a sky that is
  85.7% one blue, a ground that is 72% one tone. The reference uses 16 tones and a dithered sky (one tone 50.1%).
- **"facade is all noisy"** — V5: the tower is **three tones** (top3 99.2%), i.e. a pattern, not a photographed wall;
  the reference's same region uses 16 tones and its largest is 26.6%.
- **"no windows are detected to be breakable"** — V6: the build makes 50 window objects on this photo, but they are
  all contrast patches; the reference makes 1321 pane objects on this photo (1262 on the tower alone).
- **"wrong angle projection"** — V5/V7: the tower's cells are drawn on an axis-aligned lattice (the synthetic grid);
  the reference keeps the photograph's own mullions, so its gradient structure is the building's.
- **"working for all possible photo"** — the chain has no step that builds any photograph other than v10a; see F7.

### F6 — the match gate is share-based and cannot see F5 (OPEN: the gate that DOES see it now exists)

`match-check` reads 8 of 8 while V5 fails: the tower's two-tone checker happens to reproduce the reference's dark/blue
**shares** exactly. This is D20's class again ("a line that NAMES a property while testing a proxy"). The new gate is
the structural check (tone distribution, window count, distance to the reference). Status: the new gate exists; the
old gate is not weakened, it is kept as one of the many lines.

### F7 — universality is untested by the chain (OPEN)

`tools/chain.mjs` hardcodes `PHOTO = v10a.jpg` for the PAGE step and every downstream frame gate. The reference runs
**four** scenes (prague-tower, prague-street, aerial-church, sunset-bus) and its self-test measures each. Our product
has never had a chain step that builds the street, the aerial or the sunset photograph, which is exactly where the
operator's "no windows / noisy facade" observation comes from. Status: `v13-check` accepts any of the four scenes and
the reference frames now exist; the chain step is not yet added.

### F8 — the protocol documents have drifted from the measured state (OPEN, mechanical gate exists)

`docs/LOOP.md §9` says "iteration 1 … chain 1 (stops at 1 CRITERIA) … suite FAILING (legacy bicycle/chair fixture) …
next line: match-check tower blue-glass windows" — none of that is true today (chain green, suite 321/0, match 8/8).
`START-HERE.md` carries two "the next action, exactly" sections, one of them the old cloud paragraph. The docs gate
(5b DOCS) checks numbers quoted from tools, not the protocol's own state block. Status: open; the fix is to make
`LOOP.md §9` state that it is history and point at RUNLOG, and to remove the stale duplicate.

### F9 — the baseline's picture freshness is the same mtime class as F4 (OPEN)

`tools/baseline-check.mjs:19` `shotNewerThan()` compares mtimes. It is not a chain step, so it does not block the
chain, but it will produce the same false reds/greens on `docs/shots/*`. Status: open (same fix as F4 when touched).

### F10 — the v13 tooling folder was untracked and undocumented (OPEN, this round documents it)

`tools/v13/` was an untracked directory with two engine copies, a generated page and a runner that wrote to `/tmp`.
This round adds `refs.mjs` (canonical, verified), `reference/v13/` (the four reference frames + provenance + readout),
and this audit. The fork `engine.txt` and the generated `page.html` remain as the experimental engine; the README
line is in `tools/v13/README.md`.

## 4. THE GATE SUITE BUILT THIS ROUND (and its mutation proofs)

```
node tools/v13/refs.mjs                 reference frames; refuses when the committed extraction ≠ the HTML slice,
                                        when the operator's file is missing, or when two builds differ
node tools/v13-check.mjs <scene> <dump> V1..V7 above; prints premises; exit 2 when a premise fails
node tools/build-hash.mjs               the build's content identity, 51 files
node tools/sheet-check.mjs              now content-addressed (F4)
```

Mutation proofs (required by docs/LOOP.md S4):

```
SHEET   a one-byte edit to src/rng.js  -> "SHEET: 1 row(s) not true"  (restored -> exit 0)
PALETTE a deliberately flat 3-tone frame -> V5 fails by construction (the tower region cannot reach 10 tones)
REFUSAL tools/v13/refs.mjs with a mismatched engine-v13.txt -> "REFERENCE WITHHELD", exit 2
```

The reference numbers (MEASURED, this session, same machine):

```
scene           FNV      working palette  windows  largest facade (tones / largest / top3)
prague-tower    7204df6f 12               1321     ОФИСНАЯ БАШНЯ 16 / 26.6% / 58.9%
prague-street   d0fe012f 12               120      ДОМ С ВЫВЕСКОЙ  (see the street run)
aerial-church   3d4718fa 12               23       ХРАМ 11
sunset-bus      e580ce31 12               16       НОВОСТРОЙКА 10
```

## 5. THE WORK LIST, IN THE ORDER THE GATES IMPLY

The order is dependency, not preference: a facade that is a photograph cannot be judged until the reduction stops
inventing tones, and windows cannot be panes until the facade analysis produces panes.

1. **Facade mechanism (V5, V7).** Replace the synthetic bay grid for a plan instance with the reference's S8–S11:
   silhouette → quad → homography → profiles/period → Otsu/Niblack → components → frame largest → panes recoloured,
   the photo kept. This is the operator's "copy the core issues from the existing complete use case".
2. **Windows as panes (V6).** Every detected pane becomes a window object (the reference's `WN`), attached to its
   piece; the `WINDOWS_MAX = 6` cap applies only to the contrast finder, not to pane-derived windows.
3. **Palette/reduction (V1, V2, V3).** The working-palette discipline (12 photo entries, Lab remap, mode passes) and
   the designed sky/ground treatment, so one tone does not own the sky or the road.
4. **Universality (F7).** Run `v13-check` on all four scenes as a chain step; the street scene is the operator's own
   example.
5. **Docs (F8).** LOOP §9 becomes history; START-HERE's stale section is removed; this audit and the analysis are
   linked from START-HERE.

## 6. WHAT THIS AUDIT DOES NOT CLAIM

- It does not claim the reference is perfect: its own fork deltas (F2) are real defects found on the street photo, and
  they stay documented rather than silently imported.
- It does not claim the bars are the reference's exact values: V2/V3/V4/V5 bars sit in the measured gap **between** the
  reference's value and today's value, and V6's 10% is a staged floor (stated in the gate's header). No bar is passed
  by the artefact today except V4.
- It does not claim the four reference frames are what the operator's browser shows: they are the engine's clean
  buffer at 288×512, which is the like-for-like artefact the gates need; the operator's screenshots are the phone
  view of the same buffer at 2×.
