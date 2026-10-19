# THE PROGRESS AUDIT — what the gates actually gated, when they were weakened, and when the failure began

Audit at T+138, on the shipped build `abb06285…` (v0.5.8, 55 files), with the history bisected by running the
converter on a photograph outside the fitted set.

## 1. The wiring matrix — which question each gate answers, and where it runs

| the question | gate | wired to the chain? | compared against the reference? | state |
|---|---|---|---|---|
| does the code hang together | `0 PREFLIGHT` · `0b IMPORTS` | **yes** | no (structural) | wired |
| are the bricks themselves right | `0c PIECES` (6 checks) | **yes** | each check asserts its **contract** | wired |
| are the criteria met | `1 CRITERIA` (19 rows incl. R1) | **yes** | R1 vs the accepted frame (0.09, D24) | wired |
| is the composition bound | `2 COMPOSITION` (10 elements) | **yes** | elements → requirement → baseline | wired |
| is the behaviour right | `3 SUITE` (321 checks) | **yes** | contract-level | wired |
| is the frame deliverable | `4 DELIVERY` (12 lines, S1 sky…) | **yes** | S1/S2 vs the accepted frame | wired |
| is the sheet true of the build | `5 SHEET` | **yes** | content hashes | wired |
| do the documents quote the tools | `5b DOCS` | **yes** | tool output | wired |
| does the page build a yard | `6 PAGE` | **yes** | runtime only | wired |
| families / pairing / palette / plan / match | `6b … 6f` | **yes** | match + pairing + palette vs the accepted frame | wired |
| **is the frame the operator's reference** | `tools/v13-check.mjs` V1–V7 | **NO — it is the work list, not a chain step** | yes, patch for patch | **not wired** |
| **is each element the same as the reference's element** | `tools/template-check.mjs` | **NO** | yes, same patch, palette-independent | **not wired** |
| **is the derived geometry plausible** (pitch, rows, cols) | — | — | — | **NEVER BUILT (D28)** |
| **does the picture show what the model counts** (a target with pixels) | — | — | — | **NEVER BUILT** |

So: the *execution* gates are wired; the *results* gates that compare against the operator's own rendering are **not
in the chain**, and the two questions behind the screenshot — *is the geometry plausible* and *is the model visible in
the picture* — were **never asked by any gate**.

## 2. The exact moments the definitive gates were weakened — and the one that was never built

The history was bisected by running the converter on `photos-test/b.jpg` (a photograph outside the fitted set) at every
substantial commit and counting the glass-ramp pixels in the frame:

```
T+122 3aaed44   glass 0.0%      T+129 29c44fe   glass 0.0%
T+124 d16b2e4   glass 0.8%      T+133 0783bfe   glass 0.0%
T+127 8dbdbc5   glass 0.8%      T+136 eaa6224   glass 0.0%
                                T+137 74146bc   glass 0.0%
```

**The failure is not a regression: the converter has never drawn windows on that photograph, at any commit.** No gate
lost it, because no gate ever asked. What DID change, and each with its evidence:

| moment | what changed | class | verdict |
|---|---|---|---|
| T+124 (D24) | R1's whole-frame tolerance 0.05 → **0.09** | a bar **re-derived from the desired reference** (which itself reads 0.085) | legitimate — D24 records both measurements |
| T+129 (D27) | `match` "24+ tones" and `concept` "24+ entries" → **≥12** | a bar **re-derived** (the reference's frames read 16/16/20/21) | legitimate — both counterexamples re-run and still refused |
| T+131 | universality scoped: V4/V5/V6 bind only on the judged photograph (the reference's boxes are **hand annotations**) | a gate **narrowed** | legitimate, and the narrowing is printed, but it narrowed the only cross-photograph check |
| T+133 | window panes stopped being **counted** targets (521 → 8) | a **model** correction (the reference counts buildings + cars) | legitimate — panes still break |
| **the whole session** | **no gate on derived-geometry validity; no gate on "the model's targets appear in the picture"; no gate on any photograph outside the fitted set or the four reference scenes** | **a gate never built** | **this is where the product failed** |

## 3. What improved, what regressed, what was never tested

Improved and shipped (all measured, all on the fitted photograph unless stated): V2 sky 85.7 → 60.5 % · V3 ground
71.6 → 50.2 % · V7 distance 59.67 → 55.39 % (green for the first time) · V1 palette 43 → 17 · the count 521 → 8 · the
pavement converted per surface · six verified bricks · pairing IoU 0.85 → 0.90 · R1 0.076 → 0.070.

Reverted, with the measurement that rejected it: the **photo-popularity palette** (V5 14/38.7, V7 60.15) · the
**horizon band** as painted (R1 blue −0.111) · the **intended ground erosion** (V3 57.3, V7 55.99).

Never tested: **any photograph outside the fitted one and the reference's four scenes** — the exact set the operator's
phone bypassed.

## 4. The stable version that was close and never shipped

At **T+134** the build with the reference's horizon band (painted as the base layer, runs not dither) measured **V2
42.3 % and V7 54.34 %** — the best either line has ever read — and was reverted because it cost **R1 its budget**
(blue −0.111 against 0.09). That is the one near-stable artefact not shipped, and the reason is a *bar*, not a
picture: R1's tolerance was derived from the accepted frame (D24 already superseded that frame as the target), so the
way back to it is to re-derive R1's blue budget from the reference (its own blue delta is −0.085), not to keep the
band out.

## 5. Every piece, its source, and the piece that does not exist

| piece | external source it relies on | own check |
|---|---|---|
| `downscale` | **PixelOE** (contrast-aware selection) | 3-px line survives |
| `facade` | PROTOCOL 3 — pitch measured, not typed | 9×9, 20 windows |
| `facade-photo` | v13 S8–S11: **Heckbert 1989** homography · projection profile · **Otsu 1979** / **Niblack 1986** | 30 panes, 0 invented |
| `sky-style` | v13 S6: **Perlin**-lineage value noise, smoothstep | 6/6 promises, cover 27.0 % vs ref ~28 % |
| `ground-planes` | v13 S2–S3 + **OpenCV morphology** (closing) | 5/5, 40.9 % dark plane, gap filled |
| `working-palette` | v13 S1–S2: 50-entry table, ≤12 working entries by popularity, nearest remap | 4/4, 0 cross-family moves |
| **the FINDER** (skyline, building instances, pitch, car boxes) | **none** — it is the geometry the reference is *hand-given* (`sc.buildings`, `sc.cars`, `gY`) | **no check, no contract, no refusal** |

The product is therefore a verified painter wired to an unverified finder. That is the whole audit in one sentence.

## 6. The approach that works, and the next three actions in order

The method that produced every verified step this session, to be applied now to the finder:

1. **brick** (contract + parameters with a source) → 2. **its own check** on a synthetic input → 3. **byte-identical
extraction** proof → 4. **frame gate** → 5. **chain step**.

In that order, next:

1. `pieces/lattice.js` — the lattice's validity contract (pitch within `[3, w/4] × [3, h/8]`, ≥2 rows/cols, a measured
   coverage), the refusal, and the fallback to the pane boxes the facade piece already found (b.jpg: 120 panes, thrown
   away today); `tools/piece-lattice-check.mjs` with the 432-px pitch as a must-fail.
2. Two frame lines, wireable immediately, that would have caught the screenshot: **every window region has drawn
   pixels** (b.jpg 0/69) and **no derived pitch exceeds the frame's own bounds** (b.jpg 432 vs 72).
3. R1's blue budget re-derived from the reference (D24's own rule) so the best-measured build (T+134: V2 42.3, V7
   54.34) can ship instead of being reverted.

## 7. The verdict on this audit

The shipped stable version remains **v0.5.8** (build `abb06285…`, chain 15/15, `V13 CHECK PASSED: every line` on the
judged photograph, 6 verified bricks). Nothing in this audit regressed it: the two fixes attempted this round — pinning
the glass role in the palette and rejecting out-of-frame targets — were measured (b.jpg still **0.0 %** glass; 5.jpg's
frame changed) and **reverted**, because an unverified change would repeat the fault being audited. The audit's own
deliverable is the wiring matrix above and the three ordered actions; the honest statement about the product is: it
paints to the reference on the photograph it was fitted to, and it has no gate that notices when the finder fails.

## 8. The operator's TARGET screenshot, measured against the project's reference and our frame (T+139)

The operator supplied the app's own screen on the same photograph (`TARGET.webp`, 684×1160: the tower, the checker
building, the cars, the road with the bicycle marking, the clock, `РАЗБИТО 0`, the `ОПАСНОСТЬ` gauge, the info banner,
the round chips and play button). Measured against the two things this project compares against:

| | the TARGET screen | `reference/v13/prague-tower.png` (what V1–V7 measure) | our shipped frame |
|---|---|---|---|
| the same design? | — | **yes**: the same engine, the same checker, the same cloud field, the same road | **the same scene, our rendering** |
| checker transitions across a 110-px row through the checker building | **36** (cell ≈ 3 px) | 21 (≈ 5 px) | 25 (≈ 4.4 px) |
| the sunlit band near the horizon | **present** (the Bayer dither is visible on the right) | present | **absent** (built at T+134, reverted on R1) |
| the road | flat asphalt with a subtle mottle | flat, two planes ~22 luma apart | two planes **36 luma apart** (bold patches) |
| the HUD | clock · `РАЗБИТО` · `ОПАСНОСТЬ` gauge · info banner · round chips + play, over a dark bar | — (the art only) | our own v9 layout: one top row, chips over the art, a pink button, panels below |

An earlier pixelmatch of the screenshot's cropped art against the reference read 58.8 % differing — **that was my crop
and aspect, not a different artefact**: the middle frame in the three-way comparison is visibly the same design as the
target, and the project's V1–V7 and `template-check` do measure it. So the answer to *"why can't you use the target"* is
not that it was unavailable: it is that **four specific things separate our frame from it, and each was either blocked
by a bar derived from the OLD accepted frame or never gated at all**:

1. **the horizon band** — implemented and measured at T+134 (**V2 60.5 → 42.3 %**, **V7 55.39 → 54.34 %**, both better
   than the target's own 51.4 % on that box), reverted because **R1's blue budget** (0.09, derived from the accepted
   frame under D24) forbade it. The target's own frame reads 0.085 on the same R1 measure: the budget, not the band, is
   the thing to re-derive.
2. **the checker's pitch** — the target's cells are ≈ 3 px at this size, ours ≈ 4.4 px: the plan's bay fit is not held
   to the target's pitch (and D28 already records that this fit has no validity contract).
3. **the road's contrast** — ours are the palette's neighbouring rungs, 36 luma apart, the target's asphalt planes ~22
   apart: the fixed-palette decision (REQ 58), now measurable against the target's numbers rather than argued.
4. **the HUD** — the target's screen has a game HUD (clock, `РАЗБИТО`, `ОПАСНОСТЬ` gauge, info banner, round chips and
   play over a dark bar); ours is the v9 layout. **The HUD has never been in any gate or comparison** — it is not art,
   it is the product, and it was never held to the target at all.

The method error, stated once: I let the **frame's share gates arbitrate the target** instead of letting the target
arbitrate them. D24 says the operator's file supersedes the accepted frame; it was applied to R1's tolerance once and
then not to R1's own blue budget, and the HUD was never compared. The four actions follow directly, in that order.
