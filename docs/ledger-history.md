# LEDGER HISTORY — every re-lock, with its reason

A lock may only move through `node tools/ledger-check.mjs --accept "<reason>"`, which appends here. A silent loosening
is impossible: the file is in git, and the gate refuses a regression before it can be recorded.

- 2026-10-27 — the ledger created (v0.6.8 state): the engine's FNV 7204df6f, palette 12, windows 1321, grids 10x11 and
  6x7, the app's pixel identity with the engine's frame 0 px intact and 0 px after ten hits. **Proof that the gate
  catches a regression**: the old damage bug (`clean` instead of `S.base`) was put back deliberately and the gate read
  `app.damagedPx 0 -> 214 REGRESSED`, LEDGER FAILED; restored, LEDGER OK.
- 2026-10-27 — **re-derived the destruction rows** (after the operator's instruction: "cars don't destroy itself just
  damage... i need gradual actual destruction"). The old row `app.damagedPx` compared the app's frame to the engine's
  frame damaged PER PIXEL (0 px). The model is now a BAND of the thing's chunks plus the weapon's weight as the number
  of ladder steps, so the pixel-identity row measured a model that no longer exists and was replaced by what the new
  model promises: `damage.heavyGone` (a four-step hit takes ≥ 5 chunks of a car to gone — measured 7) and
  `damage.lostPx` (the same hit removes ≥ 100 pixels of it — measured 149). The numbers are read from the damage gate,
  one instrument, not a second implementation. The engine rows (FNV, palette, windows, grids) and the intact identity
  are unchanged.

- 2026-10-30T10:46:56.101Z — ledger re-locked: the declared concept deviation in the engine's quant() (a warm low-saturation pixel keeps its warmth - the published look's bronze mullions): the frame FNV moves from 7204df6f to 5df02351 and the concept gate WARMTH rises 0.10 -> 0.55 against the target's 0.42; the extraction is untouched (ea0273fe...) and swapping quant() back is byte-identical
  engine.fnv=5df02351 · engine.palette=12 · engine.windows=1321 · engine.grid.tower=10x11 · engine.grid.checker=6x7 · app.intactPx=0 · app.damagedPx=0

- 2026-10-30T10:56:25.790Z — ledger re-locked: the declared quant() deviation is REVERTED: measured on the PRODUCT route it did not move the warm row at all (0.00 before and after) - the 0.55 I first saw came from the vector route's dump, the same wrong-route mistake docs/PROCESS.md names. The engine is byte-identical to the extraction again and the operator's FNV 7204df6f is restored
  engine.fnv=7204df6f · engine.palette=12 · engine.windows=1321 · engine.grid.tower=10x11 · engine.grid.checker=6x7 · app.intactPx=0 · app.damagedPx=0
