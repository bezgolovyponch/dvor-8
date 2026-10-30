# SESSION HANDOVER — delivered state, proven claims, open items, and the exact commands

Written at the end of a long session, after the operator's final instructions: **gates must be externally verifiable**,
**reconstruct the engine to avoid false confirmation**, **housekeeping**, **clear the cache**, and then continue in a new
session until the game is delivered at the requested quality.

## 1. What was done for those instructions

| instruction | what was done | evidence |
|---|---|---|
| reconstruct the engine | `node tools/v13/make-module.mjs` rewrites `src/ref/engine.js` **from the pristine extraction** — no hand edit, no "declared deviation" left | module sha `9f91d1ae…` = f(extraction); extraction sha `ea0273fe…` pinned in `tools/verify.mjs` |
| gates externally verifiable | **`node tools/verify.mjs`** (no browser): recomputes the module from the extraction, checks the extraction's digest, reads the target's rules from `reference/TARGET.webp` itself, checks the judged pairing document, and **names** each browser gate with its exact command instead of faking a pass | run output: `VERIFICATION: every claim above is recomputed from a published artefact` |
| housekeeping | removed four unreferenced probe tools (`checker-discriminate`, `detgate-local`, `horizon-check`, `use-cases`); the tree keeps only what the chain, the docs or `verify.mjs` cite | the unreferenced scan returned only those four (and `verify.mjs`, now cited here) |
| clear the cache | `node tools/cache-clear.mjs` — clears build caches and proves the local server serves the files on disk by sha256 | output: `served … == disk`, `CACHE CLEARED AND SERVED FILES MATCH THE DISK` |

## 2. The proven claims (each with its own command)

| claim | command | last measured |
|---|---|---|
| the engine is the extraction, by reconstruction | `node tools/verify.mjs` | module = f(extraction), both shas printed |
| the engine runs and reports the operator's numbers | `node --experimental-websocket tools/engine-check.mjs` | 5 of 5 · FNV `7204df6f` · palette 12 · windows 1321 · grids 10×11 / 6×7 |
| the app's damaged frame is the engine's damaged frame | `tools/damage-check.mjs` | **0.00 % (0 px)** |
| one throw = one step on one piece (the engine's semantics) | `tools/engine-semantics-check.mjs` | 3 of 3 |
| the HUD's geometry is the template's | `tools/html-audit.mjs` | **12 of 12** |
| the four disasters are the engine's and visible | `tools/disaster-check.mjs` | 4 of 4 |
| no verified number regresses | `tools/ledger-check.mjs` | LEDGER OK |
| the look as rules, on the drawn canvas | `node tools/concept-step.mjs` | 5 of 6 rows (WARMTH red) |
| the whole chain | `CHROME=… node tools/chain.mjs` | see §4 |

## 3. What is STILL OPEN (in the order to attack it)

1. **`1 CRITERIA` ↔ routes**: the page group is pinned to `vector=1` while some criteria read dumps produced by other routes.
   This is the current chain blocker and the one *plumbing* defect. Fix: every criterion reads a dump whose route it names.
2. **WARMTH on the product route** — target 0.42, ours 0.00 (whole frame 1.76 % vs 0.00 %). The vector route reaches 0.55, so
   the warmth is achievable here; the loss is inside the engine's facade/clean pipeline (S10 pane recolour or the two `maj`
   passes), **not** in the snap (a declared snap change moved the row by nothing and was reverted). Gate: `tools/concept-check.mjs`
   row 3.
3. **The reference's `wrecked` metric** vs the app's "N ЦЕЛЕЙ / РАЗБИТО".
4. **Paint deals 0 damage** (in the reference it is a weapon).
5. **The fallback renderer's art is not the look** — retire it or declare it secondary (today an unmarked photo opens marking).
6. **A canvas-only target oracle** — `TARGET.webp` is a screenshot (two screenshots of one frame agree on 22.76 %), and
   `v10a-art-canvas.png` is a Pillow median-cut derivative of a different camera. Until a canvas-only target exists, the look
   is judged by rules + eye, and that must be said rather than hidden.

## 4. The state at handover, stated honestly

- suite **321 / 0**, baseline **49 / 0**, docs gate green
- engine **byte-identical to the extraction again** (all declared deviations reverted — each had been measured as ineffective)
- **the chain's last full run did not complete**: at load average **25** the headless browser cannot start, and the run stopped
  at `0i SEMANTICS` with `Chrome did not start` — an environment failure, not a game failure. Re-run when the machine is quiet:

```
python3 tools/serve.py                # serves /game on 127.0.0.1:4312 (the port every gate reads)
node tools/verify.mjs                 # the artefact claims, no browser
CHROME=/tmp/chrome-nosandbox.sh node tools/chain.mjs
```

## 5. The rule for the next session

`docs/PROCESS.md` §5 and `docs/STANDARD.md` §5: **no mechanism without a cited source, no gate without an artefact, no number
without stating whether its comparator is valid.** The pieces exist (the extraction, the detector, the HUD template, the
damage ladder, the disasters, the concept rules); the work left is composition, in the order of §3, one gate at a time.
