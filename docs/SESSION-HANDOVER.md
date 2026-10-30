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

## 6. Handover to another machine (same account) — added at the end of the session

Everything is in the repository and pushed (`main` = `ea10ca2`, 321 tracked files). Nothing lives only in this session's
memory; the four documents a new session must read first are:

1. `docs/SESSION-HANDOVER.md` (this file) — state, commands, open items in order.
2. `docs/STANDARD.md` — what the game is, the published pieces it composes, what is still missing.
3. `docs/PROCESS.md` — the seven-step flow and the six patterns of my own failures (with instances).
4. `docs/AUDIT-COMPLETE.md` — the measured engine/HUD/disaster/ledger/source-concepts audit and the two independent agent
   audits (§7) including the finding that the repo's "accepted canvas" is a Pillow derivative.

### Setup on the new machine

```
git clone https://github.com/bezgolovyponch/dvor-8 && cd dvor-8
python3 tools/serve.py                       # serves /game on 127.0.0.1:4312 (the port every gate reads)
node tools/verify.mjs                        # artefact claims, no browser — must print VERIFICATION: …
node test.mjs                                # 321 checks
CHROME=<a chromium binary> node tools/chain.mjs   # the full gate; CHROME may be omitted if Chrome is installed
```

The gates need only Python 3 (for PIL in `concept-audit`/`pairing-check`), Node 24, and a Chromium/Chrome binary in
`CHROME` (or the default `/Applications/Google Chrome.app`). `gates/node_modules/pngjs` is committed, so no `npm install`.

### The exact blocking item at handover

`1 CRITERIA` reads 15 of 19 because **F1, F4, P1, B1 depend on `tools/deliver-check.mjs`**, which is a browser run; at
this machine's load average (5–25, from the operator's own `llama-server`) it intermittently produces nothing, and the
criteria then report the rows as NOT MET. Everything else passes in the same run: `0k FRAME`, the page group `6…6f`,
`0 PREFLIGHT`, `0b IMPORTS`, `0c PIECES`, `0d ENGINE`, `0e DAMAGE`, `0f LEDGER`, `0g HTML`, `0h DISASTER`, `0i SEMANTICS`
(with the ladder now walking **1→2→3→4**).

**First action on the new machine:** run the chain once and, if `1 CRITERIA` blocks again, run `tools/criteria-check.mjs`
directly with `DUMP=/tmp/chain-page/canvas.json` to see which of F1/F4/P1/B1 is actually NOT MET and why — its row text
names the missing artefact. That is the only blocker between this tree and a green chain.
