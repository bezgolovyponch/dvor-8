# LEDGER HISTORY — every re-lock, with its reason

A lock may only move through `node tools/ledger-check.mjs --accept "<reason>"`, which appends here. A silent loosening
is impossible: the file is in git, and the gate refuses a regression before it can be recorded.

- 2026-10-27 — the ledger created (v0.6.8 state): the engine's FNV 7204df6f, palette 12, windows 1321, grids 10x11 and
  6x7, the app's pixel identity with the engine's frame 0 px intact and 0 px after ten hits. **Proof that the gate
  catches a regression**: the old damage bug (`clean` instead of `S.base`) was put back deliberately and the gate read
  `app.damagedPx 0 -> 214 REGRESSED`, LEDGER FAILED; restored, LEDGER OK.
