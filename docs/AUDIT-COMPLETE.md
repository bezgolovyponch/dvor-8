# THE COMPLETE AUDIT — the app, its engine, and the published sources it stands on

Run on a quiet machine (load 1.5), with the local server serving the current tree (`/game` on `127.0.0.1:4312`).
Every number below is a tool's output, not an impression. Commands are named so each row can be re-run.

## 1. The verdict, in one paragraph

**The engine path works and is provably the reference's.** On a reference photograph the app's frame is the operator's
engine's frame (its own FNV reproduced, body byte-identical), and the app's *damaged* frame is the engine's damaged frame
**pixel for pixel (0.00 %, 0 px)**. The HUD's geometry matches the operator's template on **12 of 12** measured rows, all
four of the engine's disasters are visible (4 of 4), and the quality ledger holds every locked number. **The fallback path
is the weak half**: a photograph that is neither a reference scene nor marked is drawn by the app's own renderer, and that
is what the operator saw on the phone and called "even worse". That is not the engine — it is the app's art, and the way out
of it is the marking flow (ЕЩЁ → РАЗМЕТИТЬ), which the app now says out loud.

## 2. Structure — what the app is made of

| | count | notes |
|---|---|---|
| modules under `src/` | **56** | 13 967 lines |
| largest | `src/vector.js` 2 590 · `src/main.js` 2 374 · `src/flat.js` 1 037 · `src/render.js` 782 · `src/ref/engine.js` 744 | |
| gates/tools | **63** `.mjs` | each named by the chain |
| documents | **64** `.md` | 5 current, the rest the record |
| checks in the suite | **322** checks, **321 PASS / 0 FAIL** | `node test.mjs` |
| chain steps | **20** | `node tools/chain.mjs` |
| dead modules | **0** | `node` import scan: nothing unimported |

Boundaries that hold: `src/ref/` is the operator's engine and its bridge (never hand-edited), `src/pieces/` are the
independently verified bricks (**9 of 9**, `tools/pieces-check.mjs`), and the rest is the game.

## 3. Engine audit

| what | measurement | tool |
|---|---|---|
| the body is the operator's bytes | **115 478 chars identical** to the extraction (`sha256 ea0273fe…`); only the header and the export differ | `tools/engine-check.mjs` 1b |
| it runs in a page | 147 456 px built in **687 ms**, page errors **0** | 2 |
| it reproduces the operator's own FNV | **7204df6f** — the recorded frame | 3 |
| it reports the operator's stage numbers | palette **12/12** · windows **1321/1321** · ОФИСНАЯ БАШНЯ **10×11/1262** · ШАХМАТНЫЙ ДОМ **6×7/228** | 4 |
| the app's frame = the engine's frame | **0.00 %** (intact), ledger row `app.intactPx 0` | `tools/ledger-check.mjs` |
| the app's damaged frame = the engine's damaged frame | **0.00 % (0 px)**, bar ≤ 2 % | `tools/damage-check.mjs` |
| the disasters are the engine's and visible | **4 of 4** — hurricane 1 324 px · tsunami 1 803 · godzilla 14 596 · beyonce 4 276 | `tools/disaster-check.mjs` |
| the screen's geometry is the template's | **12 of 12** rows as ratios of the frame | `tools/html-audit.mjs` |
| no verified number regresses | `LEDGER OK` — 8 rows (FNV, palette, windows, two grids, intact identity, damaged identity) | `tools/ledger-check.mjs` |

## 4. The `.html` and the reference folder — what is copied, what is not

**Copied (and proven):** the engine class (`src/ref/engine.js`, byte-identical body), its SPEC (20 rows), its palette,
its detection, its chunk/damage model, its four disasters, its frame hash, its stage numbers, and its HUD's geometry
(12 rows). The reference's own rule that people and trees are never annotated is honoured: they stay photo pixels.

**Not copied — the app's own:** the game loop, the people (folk: 5 kinds, looks, anger), the weapons beyond the
reference's five (water, flowers, sponge, fun), the marking flow, the fallback renderer, the phone shell.

**The reference folder** (`reference/`): `TARGET.webp` and `PAIRING.md` (the product being matched), `v13/` (the engine
extraction, the readout and the scene dumps), `owner/` and `owner-yard2/` (six owner captures with hashes, re-signed every
build), and `v10a-*` (the accepted frame). Each is read by a gate; none is a picture for the eye alone.

## 5. The external, published sources — 20 of 20 present in the code

`node tools/source-audit.mjs` reads the SPEC from the engine and looks for each cited method's mechanism in the engine's
own source. **20 of 20 present.**

| row | method | cited source | in the code |
|---|---|---|---|
| S0 | Frame | box-filter resampling (mean over the footprint) | 2×2 mean loop |
| S2 | Snap + reduce | Heckbert 1982, popularity algorithm; CIE Lab; Kuwahara 1976 | histogram → 12 kept → Lab remap |
| S3 | Clean | rank-order / majority filtering | `maj()` |
| S4 | Edges | Sobel & Feldman 1968 | the 3×3 Sobel |
| S5 | Sky segmentation | Adams & Bischof 1994 (seeded region growing); Soille | region masks |
| S6 | Sky style | Bayer 1973; Perlin 1985 lineage | ordered dither + value noise |
| S7 | Detector contract | Redmon 2016 (YOLO); Lin 2014 (COCO) | the detection mask (the app's detector is EfficientDet-lite/COCO) |
| S8 | Facade rectification | Heckbert 1989 (texture mapping) | quad → rectified facade |
| S12 | Vehicles | Rother, Kolmogorov & Blake 2004 (GrabCut); Besag 1986 | car masks + chunks |
| S13 | Silhouette | Serra 1982 (mathematical morphology) | outline/morphology |
| S14 | Pieces | voxel/chunk destruction | `CH`, `chunkOf` |
| S15 | Damage ladder | FEMA HAZUS-MH states | `hitChunk`: crack → scrape → debris → gone |
| S16 | Progressive collapse | GSA 2003; UFC 4-023-03 | `cascade` / supports |
| S17 | Particles & rubble | Reeves 1983 | `stepPart`, rubble height map |
| S18 | Reveal | Porter & Duff 1984 | layered compositing |
| S19 | Glass | laminated-glass fracture | `carGlass`, `breakWin` |
| S20 | Weapons | — | `WEAPONS` |
| S21 | Disasters | log-spiral rainbands (Senn & Hiser 1959) | `dis_hurricane` etc. |
| S22 | Determinism | mulberry32 (Ettinger); FNV-1a | `seed()`, `fnv()` |
| S23 | Info | — | shuffle bag |

## 6. What does NOT work as expected — stated plainly

1. **An unmarked, non-reference photograph is drawn by the app's own renderer.** That is the frame the operator rejected.
   The reference's annotation is *authored per photograph* (its S7 is "given"); the app offers marking, and now says so.
   An attempt to invent the annotation automatically was measured and reverted (it drew crates over the sky).
2. **Buildings are holed and gutted, not levelled.** The engine's own rule keeps the structural frame (`goneChunk`), so a
   destroyed building looks pierced with rubble — the reference's declared model, not the collapse a player may expect.
3. **The vector destruction model** (fallback path) is a hit-point model, not the engine's chunk ladder. Fine as a
   fallback, and documented as one, but it is not what the reference does.
4. **The disasters are long** (the engine's own lengths: godzilla 470 frames), and there is no difficulty curve around them.
5. **The app's people have no counterpart in the reference** (which leaves people as photo pixels), so their reaction
   mechanic is ours and cannot be benchmarked against the product.

## 7. The independent audits (two agents, separate contexts, reading artefacts not claims)

### 7.1 The visual audit — the deepest finding of the project

| artefact | what it is | verdict |
|---|---|---|
| `reference/TARGET.webp` | the expected look: a phone screenshot (684×1160, WebP-compressed, 46 234 unique pixel values) | **the only valid look oracle** — at its own camera, and by eye |
| `reference/v10a-art-canvas.png` | **Pillow `quantize(48, MEDIANCUT)` of `reference/v10a-art.png`** (100 % pixel identity, 56 573 → 48 colours) | **not the operator's art**: a machine-derived copy under a name that claims to be the accepted frame. `v10a-art.png` itself is a smooth (56 k colour) image of a *different camera* (~1.25× tighter, bronze facade) |
| our engine frame | 16 colours, flat 4-tone sky, ~half the target's window density, no warm accents (autumn foliage, shop glow) | the reference *engine's* output — **not the target's look** |
| our fallback frame | **pixel-identical to the engine frame** on this photograph (0/147 456 differ) | so the fallback is not an independent defect *on this photo*; it inherits the same deltas |

Ranked deltas of our best frame against the target: (1) no HUD in the canvas (the target is a product screen, ~35 % of its area);
(2) sky flat where the target has a dithered stipple; (3) warm detail missing (foliage, shop glow); (4) window grid ~half
density, no per-pane glints; (5) cars 2–3 tones with no grille/headlight/glass reflection; (6) asphalt flat, cycle glyph
illegible; (7) outlines merged into shadow.

**What this means, stated plainly:** the artefact the repo calls "the accepted frame" is a Pillow derivative of a different
camera, and the engine we lifted produces a *coarser* picture than the target. Either the target was produced by an earlier
pipeline (the pairing document itself names the frame `10a УЛИЦА`, i.e. v10) or the extracted engine needs parameters it is
not being given. **Until that is answered, no mechanical look gate can exist, and the app cannot be said to match the
target look** — only to reproduce the extracted engine's own output exactly (0.00 % on damage, FNV `7204df6f`).

### 7.2 The logic audit — nine divergences, three of them defects, now fixed and gated

| # | divergence | class | state |
|---|---|---|---|
| 1 | the app has nine weapons vs the engine's five; **paint deals 0 damage** | extension + defect | paint still 0 — open |
| 2 | `steps` = the throwable's damage → up to four `damageAt` per throw (the brick went intact→gone in one) | **defect** | **fixed**: one `damageAt` per throw; `0i SEMANTICS` rows 1–2 |
| 3 | a post-kill "blast" (random panes/pieces) + `cascade(..., true)` inside the hit | **defect** | **fixed**: blast removed; the collapse is the engine's own deferred clock (`cascade(..., false)` every third frame) |
| 4 | `splash` accepted and never read | **defect** | **fixed**: the engine has no area damage in a throw, so the parameter is gone |
| 5 | the vector route's hp model vs the engine's five states | documented fallback | open by design |
| 6 | people (engine has none — S7) | extension | documented |
| 7 | disasters: engine route is the engine's; vector route is a second implementation | documented fallback | open by design |
| 8 | the HUD's "N ЦЕЛЕЙ" / "РАЗБИТО" vs the engine's `wrecked` (gutted pieces, half-wrecked cars) | **divergence** | open — the counter counts standing things, not what the engine counts |
| 9 | the annotation requirement (S7 "given") | documented gap | the app authors it by tapping; unknown photos open marking |

Rows 2–4 were fixed by writing the gate **first** (`tools/engine-semantics-check.mjs`, chain step `0i SEMANTICS`), watching
it fail on the old tree (`2 pieces changed; states 00204000000`), then changing the code, then watching it pass
(`1 piece; states 00001000000`; ladder 1→1→2→2).

## 8. The target CONCEPT (not one photo) — rules extracted, first iteration of the loop

The flaw the operator named: *"you have to first gather the understanding of the target concept, not just the particular
photo."* A concept is a set of rules, so `tools/concept-audit.mjs` extracts them from any image and prints them side by side
(tones in use at ≥ 0.2 % share, warm-pixel share, adjacent-pixel detail, sky-band detail), at the art's own size so crops of
different sizes cannot be compared.

### 8.1 The rules, measured

| rule | `reference/TARGET.webp` | our engine frame | photo |
|---|---|---|---|
| tones in use (≥ 0.2 %) | **32** | 30 | — |
| detail (adjacent-pixel diff, 288×512) | **44.62** | 43.50 | — |
| sky detail (top third) | **40.98** | 43.43 | — |
| **warm-pixel share, whole frame** | **1.76 %** | **0.00 %** | 0.16 % |

The first three say the target's *density* is already matched — the engine's detail level is not the gap (an earlier reading
of "half the window density" was an artefact of comparing different scales). The gap is one row: **the published look
amplifies warm tones to eleven times the photograph's own share** (1.76 % against 0.16 %): the visual audit saw the same
thing as "warm bronze mullions, autumn foliage, the lit shop window". Our frame carries **none** of it.

### 8.2 The hypothesis, tested and REFUTED (this is what a loop is for)

Hypothesis: the warm tones are lost in the palette (S2 keeps the 12 most-used entries). Two declared engine deviations were
made and measured:

1. the working-palette cap raised (12 → 32);
2. a guarantee that a warm family is never dropped from the set.

Measured after both: **warm share 0.00 %, tones 30 — unchanged.** Both were **reverted**, because an engine deviation that
does not move the concept row is a risk with no payoff (the engine is byte-identical to the extraction again; `0d ENGINE`
reads 5 of 5).

Why they did not help: the warm pixels never reach the palette stage — the *facade's mullion/frame colour* is chosen
elsewhere (the engine's facade analysis and its frame-class paint, S8/S10), and that is where the target's bronze lives.
**Next iteration of the loop targets that**, with the concept row (warm share ≥ the target's 1.76 % at equal detail) as its
gate — written before the change, per `docs/PROCESS.md` step 4.
