# DVOR-8 — the concept, restated on the skeleton's slots

The project was rebuilt on 2026-10-11 around one sentence: **your own yard, photographed, becomes a neon
pixel level you take apart.** This file lays that out on the twelve slots of `game-skeleton/skeleton.md`.

Read this first: **the skeleton's research runs B–F have not been done.** There is no hook casebook, no
verified formula, and no question set. Everything below tagged `PROPOSED` is the builder's working answer,
written so the game could be built and judged — it is not the output of the skeleton's method and it is
the creator's to change. `CREATOR` means the creator said it. `BUILT` means it exists and is tested.

## 0. Brief

`CREATOR`, from `brief.md`: web first, mobile later; 18+; no business model; sandbox destruction; waiting
allowed, punishing loss and paid randomness not; 8-bit as a look, not a limit.

`CREATOR`, 2026-10-11, superseding the first build: the look must be attractive and Hotline Miami-like; a
real photograph of a yard is styled, its objects are analysed, then interaction starts; camera, filters
and at least basic destruction.

**One earlier line is overturned.** The first README said "nothing is scored by how much you break". The
new direction asks for Hotline Miami, whose engine is score and combo (`docs/style.md` F8). There is now a
score. If that is not what was meant, the scoring is three lines in `src/world.js`.

## 1. Hook statement — `PROPOSED`

*The moment your own, real, boring yard snaps into neon under the scan line — and the first thing you
tap in it breaks.*

## 2. Spectra settings — `PROPOSED`, on the brief's Q1 definition

| Spectrum | Position | Why |
|---|---|---|
| Stored investment | high before the first tap | the level is the player's own place; nobody else has it |
| Novelty rate | high per yard, none within one | every photograph is a new level; a yard does not change while played |
| Feedback delay | instant | ring in the same frame, impact at 110 ms |
| Input complexity | one action | tap |
| Cost of failure | none | a miss costs nothing; a combo expires, it is not taken |
| Restart friction | one tap | «ЕЩЁ РАЗ» |
| Sensory intensity | high | pause, shake, flash, pieces, pitch |
| Outcome certainty | predictable | what is under the finger is what breaks; no chance anywhere |
| Closure | open until the last thing falls | the counter of what is left is always on screen |

**The collision**, as proposed: *stored investment high* (it is my yard) meets *feedback delay instant* and
*sensory intensity high* at the first break. None of this is verified against other games — that is Run D.

## 3. Atoms and connections — `BUILT`

`input` tap → `triggers` rock → `triggers` hit → `amplifies` combo → `feeds` score.
`information` brackets on what stands, a counter of what is left. `feedback` ring, pause, shake, flash,
pieces, popup, pitch, vibration. `state` hits taken per thing. `reward` points × combo. `timer` the combo
window (2.5 s). `penalty` none. `chance` none. `social` none. `beat` scan → clear → score.

## 4. Loops

| Scale | Loop | State |
|---|---|---|
| micro, ~0.3 s | tap → ring → impact → pause, shake, pieces → next tap | `BUILT` |
| core, ~20–60 s | photograph → scan → clear the yard → score → again | `BUILT` |
| meta, days | none. No memory of past yards, no best score, no reason to come back tomorrow | **not built, not designed** |

## 5. Scenario and pacing — mostly empty

`BUILT`: one beat structure — the scan reveals, the banner counts the targets, the yard is cleared.
Nothing escalates, nothing is taught, and the brief's "the yard's own story" (Q4) does not exist yet.

## 6. Feedback and presentation — `BUILT`; see `docs/style.md`, decisions D1–D14.

## 7. Mobile session and the first 60 seconds — `BUILT`, not yet timed on a phone

Open → «СНЯТЬ ДВОР» → the phone's own camera → 1.4 s scan → tap. Two taps and one photograph to the first
break. The camera is opened through a file input, which works over plain HTTP on a local network; a live
viewfinder inside the page would need HTTPS and is not built.

## 8. Progression, renewal and planned end — not designed

A yard ends when everything in it is broken. Nothing carries over.

## 9. Business model and ethical check

No business model (`CREATOR`). No loss, no paid randomness, no waiting (`BUILT`, asserted by tests). The
filters are named for weed, alcohol and depression at the creator's request, for an 18+ audience; they
change colours and motion only. Depression is a look the player turns on and off — it is not a state the
game puts the player in, and nothing in the yard cures it (`docs/style.md` D15, D19).

## 10. Self-test — `PROPOSED`

*What would a lazy copy miss?* The photograph. With a stock picture the same code is a tapping toy; the
proposal is that the hook is the player's own place. *What breaks if a term is removed?* Without instant
feedback it is a photo filter. Without the scan it is a level that happens to look like a photo. Neither
claim has been tested with players.

## 11. Open questions

1. Is there a score at all (see slot 0)?
2. What brings a player back tomorrow (slots 4, 8)?
3. Do things have names without a model key — and does it matter that the device finds shapes, not objects?
4. Should the yard fight back or change while played (the courier and the residents from the first concept)?
5. What does each filter do beyond a look, if anything?

## What "verified engaging" means here, and what it does not

Tested, by `node test.mjs` (63 checks) and by driving the page in headless Chrome with three real
photographs of yards: every interaction works and is answered — a tap always produces a ring and then a
hit or a puff, within 150 ms; any photograph yields 4–10 targets; a break pauses, shakes, flashes, throws
pieces and leaves rubble; a combo builds and expires; a yard can be finished and restarted in one tap;
all four filters change the picture and none changes an outcome.

**Not tested, and not testable from here: whether it is fun.** Nobody has played it. Nothing has been seen
on a phone, heard through a speaker, or felt as a vibration. Whether the first break of your own yard
lands the way slot 1 proposes is a question for a person with a phone on a balcony.
