# THE PROCESS — revised after auditing how this work was actually done

The operator: *"revise and audit your work approach and processes flow, add more agents and every step compare againts
the expected look and logic."* This is that audit: what the flow is now, what it was, and the six patterns that produced
the repeated failures.

## 1. The flow (now mandatory, in this order)

| # | step | compared against | enforced by |
|---|---|---|---|
| 1 | look at the artefact (frame, screenshot, run) | the expected look (`reference/TARGET.webp`, the engine's frame) | the eye, and `tools/look-check.mjs` where a valid comparator exists |
| 2 | name ONE fault, in the artefact's own words | the same expected artefact | R4 of `QUALITY-CONTRACT.md` |
| 3 | find its cause in the code | the expected logic (`src/ref/engine.js`, its SPEC) | reading, with line numbers quoted in `RUNLOG.md` |
| 4 | write the gate FIRST, run it on the old tree | it must FAIL | R3 |
| 5 | fix the cause, run the gate | it must PASS | R3 |
| 6 | run the whole chain | every earlier artefact must still hold | `tools/chain.mjs`, `0f LEDGER` |
| 7 | only then say it is done | the chain's verdict, not a judgement | R7 |

## 2. What the flow actually was, audited

| pattern | instance | cost it caused |
|---|---|---|
| **inventing what the reference already gives** | the band-of-chunks destruction model; the auto-scene from detector boxes | a half-erased car, crates floating over the sky; both reverted |
| **gates measuring proxies** | the pairing gate's sky heuristic applied to the engine's dithered sky (read 3 %) | nine gates failing the frame they were not written for |
| **stopping at the diagnosis** | listing "next honest steps" instead of doing them | the operator: *"why have you stopped if you know what to do?"* |
| **one instrument, two jobs** | the page group measured the vector route and then silently moved onto the engine's frame when photos were recognised by content | 6c PAIRING, 1 CRITERIA S1, 0e DAMAGE all red in one run |
| **accepting a file name as an identity** | `v10a.jpg` mapped, its byte-identical twin `5.jpg` not | "not all of the references build through the engine" |
| **treating a screenshot as a target** | comparing our canvas to `TARGET.webp` as if pixels were the spec | see §3 — the comparator is invalid, and I had been reading it as if it were not |

## 3. The comparator audit — what "compare to the expected look" can even mean here

Measured, all three numbers with `tools/look-check.mjs` and a PIL diff:

| comparison | result | verdict |
|---|---|---|
| `TARGET.webp` vs `v10a-target.webp` (the reference against itself, HUD-free band, dE ≤ 24) | **22.76 %** | **a screenshot is not a pixel target**: HUD, bezel and scale dominate. Two artefacts of the SAME frame agree on less than a quarter of their pixels. |
| the app's engine frame vs `reference/v10a-art-canvas.png` | **3.70 %** identical | that canvas is **not** the target's canvas — it is flat and posterised where `TARGET.webp` is detailed and dithered, i.e. it is an OLDER render kept under a name that claims to be the accepted frame |
| the app's fallback frame vs the same canvas | **0.79 %** identical | the fallback renderer is not the look, which is what the operator kept saying |
| the app's engine frame vs `TARGET.webp` (HUD-free band) | **14.31 %** vs the reference's own 22.76 % | the engine's frame is the same *kind* of picture as the target but the crude crop/scale alignment does not let a pixel comparison decide it |

**Therefore:** the LOOK can be compared mechanically only against a **canvas-only** artefact of the target, and this repo
does not have a valid one (`v10a-art-canvas.png` is contradicted by `TARGET.webp`). Until one exists, the look is decided
by (a) the engine's own numbers — palette 12, windows 1321, grid 10×11/1262, FNV `7204df6f` (`0d ENGINE`), its 12 HUD
geometry rows (`0g HTML`), its 4 disasters (`0h DISASTER`) — and (b) the eye on the frame. `tools/look-check.mjs` reports
the numbers and prints the self-agreement so no one mistakes 14 % for a failure of the art.

## 4. The agents (added this round)

Two independent audits run in separate contexts, each reading the artefacts rather than my claims:

- **visual audit** — the target screenshot against the engine frame, the "accepted" canvas and the fallback frame; ranks
  the visual deltas of the best candidate.
- **logic audit** — the engine's SPEC against the app's logic (weapons, damage ladder, people, disasters, HUD counting,
  the annotation requirement); each difference marked *extension* or *divergence*.

Their findings are folded into `AUDIT-COMPLETE.md` §6 and, where they name a defect, into the chain as a gate.

## 5. The rule this audit leaves behind

**A step that cannot be compared to an expected artefact is not a step.** Either the artefact exists (and the gate cites
it by path and by the number it measured), or the step says out loud that the comparator is invalid — as §3 does — instead
of reporting a percentage that looks like a verdict.
