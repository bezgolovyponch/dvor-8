# THE QUALITY CONTRACT — the rules that make going in circles a build failure

Written after the operator named the failure mode: *"never go in circles in terms of quality; take precautions at every
step, mandatory, to avoid it completely."* These are not intentions; each rule is enforced by a tool that stops the
chain, and the numbers are locked in `docs/quality-ledger.json`.

## R1 — THE BAR IS AN ARTEFACT, NEVER A NUMBER WE CHOSE

A quality bar must be a measurement **of the operator's own product** (the engine's frame, its FNV, its stage numbers,
its damaged frame) or of a published source. A bar we invent ("share ≤ 60 %", "≥ 12 tones") is not a bar; it is a
preference, and it may not gate anything until it is replaced by an artefact measurement. Enforced by `0d ENGINE`,
`0e DAMAGE` and the ledger: every locked row names the artefact it comes from.

## R2 — THE LEDGER IS MONOTONIC

`docs/quality-ledger.json` holds every verified number of the product. `tools/ledger-check.mjs` measures them again on
every chain run and **refuses to continue** if any of them is worse (a larger pixel difference, a different FNV, a
different palette, a different window count, a different grid). A change may improve a row; it may never quietly worsen
one. The ledger is updated only by an explicit, recorded decision (`node tools/ledger-check.mjs --accept "<reason>"`),
which writes the new value **and** appends the reason to `docs/ledger-history.md` — so a loosening is a documented act,
never a silent edit.

## R3 — EVERY FIX ARRIVES WITH ITS GATE

A change that fixes a visible fault ships together with the check that would have caught it: the same command must fail
on the old code and pass on the new. Otherwise the fault can return unseen, which is precisely the circle. Enforced by
review order: the gate is written first, run against the old tree (it must fail), then the fix, then the chain.

## R4 — ONE FAULT AT A TIME, MEASURED ON THE ARTEFACT

The loop is: look at the artefact (render, screenshot, run the page) → name ONE fault in the artefact's own words →
find its cause in the code → fix the cause → look again. No fixing two faults in one step, and no "looks better" without
a measurement or a picture.

## R5 — TRANSIENT STATES ARE NOT THE ARTEFACT

A comparison taken during the scan wipe, a hit flash, a shake, an opening panel or a rebuild is a picture of a
transition, not of the product. Every probe waits for the finished state (`regions.every(seen)`, no flash, no shake,
no panel) and states that premise. Two of this project's "90 % wrong" measurements were exactly this.

## R6 — THE FRAME IS THE SCREEN

On a yard painted by the operator's engine, the picture is drawn 1:1 with no camera, no tilt, no shake and no
full-screen flash. Any effect that repaints the whole frame is a regression against the reference's own still screen.

## R7 — PREVENTION IS A STEP IN THE CHAIN, NOT A PROMISE

`0d ENGINE` (the module is the operator's bytes, and produces the operator's frame), `0e DAMAGE` (our damaged frame is
the engine's damaged frame) and `0f LEDGER` (no verified number regressed) run before the game is even judged. If any
of them fails, nothing downstream is read.

## R8 — CLEAR THE CACHES AND RUN THE LOCAL PAGE BEFORE SHIPPING

The operator's rule: *"always run local, clear cache, before ship new."* Enforced by `tools/cache-clear.mjs`, which is the
first step of `android/release.sh`: it removes every build cache the ship could reuse, hashes `src/main.js`, `style.css` and
`index.html`, and **re-fetches those three from the local server** to prove the served page is the files on disk. A
mismatch refuses the release. A ship is measured on the code that is published, never on a stale bundle.
