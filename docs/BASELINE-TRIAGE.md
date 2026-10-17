# BASELINE TRIAGE — the 18 failing rows, adjudicated one by one

**What this is.** `node tools/baseline-check.mjs` prints `BASELINE 32 OK  18 FAIL  of 50`. The operator's DONE list
requires "baseline 50/50 or signed". This file does not fix anything: it takes each failing row **verbatim**, finds
where its requirement lives, and classifies it under one of four headings, so the operator can sign the rows that
are a renegotiation and order the work on the rows that are not.

**The governing rule**, quoted from `docs/BASELINE.md:12`:

> "A row that fails is not deleted — it is either fixed or the request it names is renegotiated with the creator in
> writing."

**Classes used below** (exactly one per row):

- **(a) STALE** — the row describes something the project has since decided differently; the decision is quoted.
- **(b) MET-BY-OTHER-GATE** — a named gate now measures the same requirement; the gate's line is quoted.
- **(c) OPEN-WORK** — a real unmet requirement; one concrete sentence says what closes it.
- **(d) UNMEASURABLE** — the row cannot be measured as written. (None of the 18 is in this class.)

Every evidence claim cites `file:line`. No sign-off is invented here; the signature column is the operator's.

---

## The 18 rows

| # | row (verbatim, with its `[source]`) | class | evidence (file:line + quote) | what would close it |
|---|---|---|---|---|
| 1 | `L3 A disaster on a REAL photo: water that shows the street, a wave that reads  [docs/shots/photo-tsunami.png]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:47-48` asserts `existsSync(shot('photo-tsunami.png')) && shotNewerThan('photo-tsunami.png', 'src/render.js')`; the file exists but `docs/shots/photo-tsunami.png` is dated **2026-10-16 12:31** while `src/render.js` is **2026-10-17 13:47**; no current tool writes `docs/shots/` (`grep -rl "docs/shots" tools/ src/` → only `tools/baseline-check.mjs`) | re-capture the tsunami frame from the current build under that exact filename (a tool must be named to write `docs/shots/*`), or the operator renegotiates the proof's filename in writing |
| 2 | `L2 The frame is FLAT by measurement: despeckle and shaped markings  [src/vector.js]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:53-54` greps `DESPECKLE`, `mk.area < 14`, `four neighbours agree`; the first two no longer exist (`grep -c "DESPECKLE" src/vector.js` → 0; the despeckle survives only as prose at `src/vector.js:1159` and `:2276`); **and the flatness measure is computed but never asserted**: `tools/concept-check.mjs:110` computes `flatShare`/`transPerPx`, but the `ROWS` array (`tools/concept-check.mjs:139-152`) has no row that reads them | assert the flatness the gate already computes (a row in `tools/concept-check.mjs:139`), and re-point the baseline row at that measurement instead of at removed constant names |
| 3 | `L1 The product renders constructively by default, on measurement  [src/main.js]` | **(a) STALE** | `tools/baseline-check.mjs:55-56` greps `get('style') || 'vector'`; that option is gone, and the decision is written in the code: `src/main.js:366` — "ONE RENDERER, AND IT IS THE CONSTRUCTIVE ONE" | the operator signs the decision at `src/main.js:366` (there is no "default" to measure any more); the row is then retired or re-worded |
| 4 | `L1 The layer-3 model is chosen by MEASUREMENT, with its licence and size  [docs/knowledge-base.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:59-60` reads `docs/knowledge-base.md`; the file does not exist, but `docs/archive/knowledge-base.md` does (169 lines) and carries **every token the row requires** (`slimsam-77-uniform`, `Apache-2.0`, `13.8 MB quantized`, `3b-1` — verified by direct string test) | restore `docs/archive/knowledge-base.md` → `docs/knowledge-base.md` (mechanical, closes rows 4, 5, 12 and 15 at once), or the operator signs that the archive is now the home of that material |
| 5 | `L1 Requirement 18 is decomposed in layers, with the licence question answered per layer  [docs/knowledge-base.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:61-62`; the same archived file carries `decomposed in layers`, `nvidia/mit-b0`, `PaddleSeg`, `class-agnostic`, `THE ORDER` (verified); the live checklist still cites it as authority: `docs/REQUIREMENTS.md:26` — "**PARTLY, now decomposed in three layers** (`docs/knowledge-base.md` §8)" | restore the file (as row 4); the live `docs/REQUIREMENTS.md:26` citation then resolves |
| 6 | `L1 THE PLAN exists: layers bottom-up, dependencies, and what cannot precede what  [docs/PLAN.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:63-64`; `docs/PLAN.md` absent, `docs/archive/PLAN.md` (61 lines) has `R14`, `FAITHFUL PIXELATED TRANSCRIPTION`, `L0`, `L8`, `L9`, `cannot be built before what` (verified); `docs/REQUIREMENTS.md:56` still names it as the plan's home | restore `docs/archive/PLAN.md` → `docs/PLAN.md` |
| 7 | `L1 The MASTER specification exists: pipeline, machine specs, bars, restrictions, method  [docs/MASTER.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:65-66`; `docs/MASTER.md` absent, `docs/archive/MASTER.md` (106 lines) has `288×512`, `50 entries`, `7,515,971`, `13.8 MB quantized`, `R13`, `The method (mandatory)` (verified) | restore `docs/archive/MASTER.md` → `docs/MASTER.md` |
| 8 | `L1 THE FAIL LOG exists: every failure, its cause, its fix and its restriction  [docs/FAILS.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:70-71` requires ≥10 `\| F<n> ` rows and `R13`, `the cause was wrong`; `docs/archive/FAILS.md` (48 lines) has **12** F-rows and both phrases (verified); `docs/REQUIREMENTS.md:158` still cites it: "attempting a fix whose cause is not named in `docs/FAILS.md`" | restore `docs/archive/FAILS.md` → `docs/FAILS.md` |
| 9 | `L1 The dependency chain from v6 is in the baseline, in order  [docs/FAILS.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:72-73`; `docs/archive/FAILS.md` carries all four phrases (`the world is constructed`, `things are cut out and templated`, `interaction is drawn from the EDGES map`, `events act on that world`) and nothing outside `docs/archive/` does | restore the file (as row 8) |
| 10 | `L3 The outlines are SILHOUETTES on a real photo (a picture proves it)  [docs/shots/version-outlines.png]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:76-77` — `existsSync && shotNewerThan(..., 'src/render.js')`; the shot exists at **2026-10-16 12:31**, `src/render.js` is **2026-10-17 13:47** | re-capture the outline frame from the current build under that filename, or sign a renegotiated proof |
| 11 | `L2 No thing is drawn as a box when its shape is known  [src/render.js]` | **(b) MET-BY-OTHER-GATE** | `tools/baseline-check.mjs:78-79` greps `edgesOf(world, r)` and `THE THING IS OUTLINED IN ITS OWN SHAPE`; the call is live at `src/render.js:489` — "`list = own ? list : edgesOf(world, r);`" — and the behaviour is measured by the dedicated gate `tools/outline-check.mjs:7` ("drawn on the thing's own silhouette, so a pixel over the sky means it was drawn on the sky's side") and by criteria row F2 (`tools/criteria-check.mjs:85`, `/mayBeOutlined\(r\)/` + `/own\[p\]/`) | re-point the row's predicate at `tools/outline-check.mjs` (the gate that measures what the row names); the requirement itself is met |
| 12 | `L1 THE CORE ISSUE is recorded as a rule: adopt the reference's ARCHITECTURE, not its parts  [docs/knowledge-base.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:82-83`; the five phrases (`THE CORE ISSUE IN MY APPROACH`, `ADOPT THE REFERENCE'S ARCHITECTURE FOR THAT LAYER`, `BUILD THE WORLD`, `BUILD THE THINGS`, `THEN THE EVENTS`) exist **only** in `docs/archive/knowledge-base.md` | restore the file (as row 4) |
| 13 | `L2 A wall is BUILT: a plane tone plus a turned-away tone  [src/vector.js]` | **(b) MET-BY-OTHER-GATE** | `tools/baseline-check.mjs:86` greps `shadeEntry` and the old expression `en.line[p2] > 0.25 ? shadeEntry : entry`; `shadeEntry` is live (`src/vector.js:707`, `:732` — "`const face = m > t2 ? litEntry : m > t1 ? midEntry : shadeEntry;`"), the old single-edge expression was replaced by the three-face rule, and the wall's tones are measured by delivery line 2b (`tools/deliver-check.mjs:112` — "2b WALL (DESIGNED): no more tones than the accepted frame's wall, and its largest tone owns at least as much") | re-point the row at the current three-face rule and at delivery line 2b; the requirement (a wall is built from tones, not one flat fill) is met |
| 14 | `L3 Buildings re-rendered on a REAL photo, with a storm through them  [docs/shots/photo-hurricane.png]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:87-88` — `shotNewerThan('photo-hurricane.png', 'src/vector.js')`; the shot is **2026-10-16 12:31**, `src/vector.js` is **2026-10-17 17:46** | re-capture the storm frame from the current build under that filename |
| 15 | `L1 The destruction model is written down with its sources  [docs/knowledge-base.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:89-90`; `THE DESTRUCTION MODEL`, `the LADDER`, `the CARRIER`, `the TRANSITION`, `What was tried and rejected` are in `docs/archive/knowledge-base.md` only | restore the file (as row 4) |
| 16 | `L3 One thing is destroyed on a REAL photo, with remains  [docs/shots/photo-destroyed.png]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:93-94` — `shotNewerThan('photo-destroyed.png', 'src/world.js')`; the shot is **2026-10-16 12:31**, `src/world.js` is **2026-10-17 14:13** | re-capture the destruction frame from the current build under that filename |
| 17 | `L1 The checklist exists and every requirement has a state  [docs/REQUIREMENTS.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:125-126` requires every row's state cell to match `/DONE\|OPEN\|PARTLY\|FIXING\|RULE/`; exactly **two** rows fail it: `docs/REQUIREMENTS.md:62` (`\| 55 \| ... \| — — a facade is a stack of its own window/panel cells ...`) and `docs/REQUIREMENTS.md:72` (`\| 61 \| ... \| **DELIVERED as far as the material allows, ...**`) | give those two rows a state from the vocabulary (`DONE`, `OPEN`, `PARTLY`, `FIXING`, `RULE`); note row 55 is also **duplicated** (it appears again, DONE, at `docs/REQUIREMENTS.md:63`) |
| 18 | `L2 The checklist is honest: unfinished rows are named, not hidden  [docs/REQUIREMENTS.md]` | **(c) OPEN-WORK** | `tools/baseline-check.mjs:127-128` requires every open row to match `/remains\|FIXING NOW\|withdrawn\|not shipped\|needs/i`; **two** rows fail: `docs/REQUIREMENTS.md:62` (row 55, the `— —` row, names no remaining work) and `docs/REQUIREMENTS.md:71` (row 60: "**PARTLY, with v9's own code as the specification.**" — no "remains"/"needs") | state what remains on those two rows (the vocabulary the gate reads), which is also the honest thing to say |

---

## Counts

| class | count | rows |
|---|---|---|
| (a) STALE | **1** | 3 |
| (b) MET-BY-OTHER-GATE | **2** | 11, 13 |
| (c) OPEN-WORK | **15** | 1, 2, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 17, 18 |
| (d) UNMEASURABLE | **0** | — |
| **total** | **18** | |

## The three most consequential

1. **Row 2 — the flatness the concept gate computes and never asserts.** `flatShare` and `transPerPx` are computed at
   `tools/concept-check.mjs:110` and **no row in `ROWS` (`:139-152`) reads them**; the baseline row that should have
   measured flatness instead greps two constants that no longer exist. The project's own audit class — "computed and
   never tested" — is live in the gate the concept rests on.
2. **Rows 4-9, 12, 15 — eight rows whose documents live only in `docs/archive/`, while the authoritative checklist
   still cites them by live path** (`docs/REQUIREMENTS.md:26`, `:42`, `:44`, `:56`, `:158`). Every one of the eight
   passes its token test against the archived file (verified), so the gap is a **move, not a loss** — but the
   checklist the operator signs currently points at files that are not there.
3. **Rows 17-18 — the checklist that demands honesty fails its own honesty row**, on two rows: `#55` has no state at
   all (`— —`, and it is duplicated at `:62`/`:63`) and `#61` uses "DELIVERED", which is not in the vocabulary the
   gate recognises.

## Recommendation for the operator

**Fifteen rows are work, not signature** — and most of it is mechanical: restoring four documents from `docs/archive/`
to the live paths they are already cited under closes **eight** rows (4, 5, 6, 7, 8, 9, 12, 15) with no new writing;
giving two checklist rows a state from the vocabulary and naming what remains closes **two** more (17, 18); asserting
the flatness the concept gate already computes closes **one** (2) and is the only one of the fifteen that adds a real
measurement. The remaining **four** (1, 10, 14, 16) are picture proofs: every shot under `docs/shots/` is dated
**2026-10-16 12:31**, the code is **2026-10-17**, and no current tool writes those filenames — so either a capture tool
is named and told to write them, or the operator renegotiates the proof in writing. **Two rows are a signature, not
work**: row 3 is STALE by the project's own decision at `src/main.js:366` ("ONE RENDERER, AND IT IS THE CONSTRUCTIVE
ONE") — there is no renderer default to measure — and rows 11 and 13 are met by gates that measure exactly what they
name (`tools/outline-check.mjs:7` + criteria F2 for row 11; delivery line 2b (`tools/deliver-check.mjs:112`) for row 13), so their predicates, not
their requirements, are what should change. Nothing here is signed: the signature column, and the decision on whether
the archive is the intended home of the four documents, are the operator's.
