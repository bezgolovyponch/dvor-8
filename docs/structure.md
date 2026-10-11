# DVOR-8 — the structure, taken apart

Written 2026-10-11 for the build on branch `walk-and-drink`. This is the game decomposed the way the Game
Skeleton Master Prompt asks (atoms → connections → loops → spectra → collisions), and then read back
against what the research so far actually found. The layered dependency map is a separate page:
`docs/pyramid.html`.

Tags, as in the master prompt: `SOURCED[n]` — on a page opened (list at the end, or `Fn` in
`docs/style.md`, or `feasibility[n]`). `DERIVED` — the builder's inference. `CREATOR` — the creator's
word. `OPEN` — not known. **The skeleton's research runs B–F have still not been done**, so every spectrum
placement and every collision below is `DERIVED`: a working answer, not the method's output.

## 1. Atoms — the smallest parts a player can perceive

| Type | Atoms in the game | Where |
|---|---|---|
| `input` | take a photograph · tap to throw · pick a filter · drag to look (depression) · go down / come up · stick to walk · jump · swig · add a photograph · «хватит» · show as a line / as a picture | `main.js` |
| `rule` | a thing takes *hp* hits, then is a wreck · hits inside the window build a combo that multiplies points · a bottle bursts over a radius · a slipper skips on · a brick needs a rest · a standing thing is solid · landing on a thing is a hit and a bounce · a swig widens the burst and loosens the hand · an empty bottle gives nothing until thrown · the street grows before its end is seen · a made yard uses only what a photograph gave · what the album holds never shrinks | `world` `modes` `walk` `drink` `street` `album` |
| `state` | hits on each thing · combo and its time left · score · how drunk · swigs left · where the walker is and how high · how long the street is · album, days, records | same |
| `resource` | swigs in the bottle — the only one, and a throw refills it for nothing | `drink.js` |
| `goal` | wreck everything standing · beat the record · walk further than before · fill the album's empty places | `world` `album` |
| `obstacle` | the things themselves, as walls · a hand that strays · a view that is soft, or dark, or leaning · a brick's weight | `walk` `modes` `view` |
| `feedback` | pause, kick, flash, pieces, the wreck that stays · brackets and pips · the pitch that climbs with a combo · the bottle's level falling at the mouth · the «градус» bar · the shadow left on the ground in a jump | `fx` `render` `audio` |
| `reward` | points × combo · «впервые: 🚲» · «новый рекорд» · «твой снимок» arriving in the street | `world` `album` `main` |
| `penalty` | **none** — `CREATOR` (brief Q8). A miss, a lapsed combo, a day away: nothing is taken | — |
| `timer` | combo window (2.5–5 s) · swig (0.7 s) · brick (0.7 s) · drink wearing off (~20 s a swig) · **the date**, which remakes the street | `modes` `drink` `album` |
| `information` | what can be hit and how much it can take · the album's empty places, named · «прыгай» the first time a thing is in the way · each mode's one-line hint | `render` `main` |
| `chance` | the bottle's stray, within a stated radius · which strips and which things a made yard gets (fixed by the date) | `modes` `street` |
| `social` | the line (what the yard held, thing by thing, and what became of it) · the picture | `album` `render` |
| `beat` | setup: the scan names the things · teach: the first tap breaks one · test: clear the yard · twist: go down into it · release: the street goes on, and tomorrow it is another | `main` |

## 2. Connections — where the hooks live

`A —edge→ B`, with the edge types of the master prompt.

- photograph —**triggers**→ detector —**gates**→ everything: no thing found, no game (`detect.js`, the "nothing recognised" card).
- tap —triggers→ throw —triggers→ hit —**feeds**→ combo —**amplifies**→ points; time —**drains**→ combo —**resets**→ multiplier (never the score).
- filter —**gates**→ what is in the hand and what can be seen; alcohol —gates→ the bottle.
- swig —drains→ bottle; swig —amplifies→ burst; swig —**dampens**→ aim; swig —gates→ throwing for 0.7 s; throw —resets→ bottle; time —drains→ drunk.
- go down —**reveals**→ the yard up close; things —gate→ the walker's path; jump —triggers→ stomp —feeds→ the same combo as a throw; stomp —triggers→ bounce —triggers→ the next stomp.
- walking right —triggers→ more street; a made yard —**escalates**→ the number of things standing; all clear, down in the yard —triggers→ more street instead of an end.
- added photograph —feeds→ the street (exact, in place of made) and —feeds→ the album with kinds the first yard did not have.
- wreck —feeds→ album; album's empty places —reveal→ what to go and photograph; date —resets→ the made street.
- end of a run —triggers→ the line and the picture —**reveal**→ the yard to someone who has not seen it.

## 3. Loops

| Scale | Loop | Length | State |
|---|---|---|---|
| micro | tap → flight → hit → pause, kick, pieces → next tap | 0.1–0.35 s | built, tested |
| micro | jump → land on a thing → hit → bounce → land again | ~0.5 s a bounce | built, tested |
| micro | swig → wider, wilder → throw → full bottle | 0.7 s + a throw | built, tested |
| core | photograph → search → scan → clear from the balcony → card | 20–60 s | built; unchanged if the player never goes down |
| core | go down → walk the street → wreck on the way → «хватит» → card | as long as the player likes, to 40 yards | built, tested |
| meta | wreck → album gains a kind → empty places remain → photograph another place | days | built; **not tested with a person** |
| meta | open on a new day → the street beyond the yard is different → walk it | a day | built; not tested with a person |
| meta | finish → send the line or the picture → someone asks what that yard is | — | built; not tested with a person |

## 4. Spectra — where the game sits (`DERIVED`)

| Spectrum | v0.2.0 | this build | What moved it |
|---|---|---|---|
| Stored investment | high at first sight (it is your yard), nothing accumulates | high, **and accumulates** | album, days, records; photographs added to the street stay for «ещё раз» |
| Novelty rate | one yard, then nothing new | renewed daily and by walking | made street from the date; every added photograph |
| Closure | open until the last thing is wrecked, then closed for good | never fully closed | album's empty places; a street with more on it |
| Input complexity | one tap | one tap, plus a stick and two buttons — **only after going down** | the balcony game is still one tap |
| Outcome certainty | set by the filter | set by the filter, and inside alcohol **by the player** | swigs |
| Cost of failure | none | none | brief Q8 |
| Restart friction | one tap | one tap | — |
| Feedback delay | instant | instant | a jump leaves the ground in the same frame |
| Attribution | skill, except alcohol's stray | skill; the stray is now something the player chose | swigs |
| Social visibility | private | shareable, **not yet comparable** | the line and the picture; every yard is still different |
| Sensory intensity | medium-high, capped | the same | F15 |

## 5. Collisions — the hooks, as formula records (`DERIVED`, unverified by the Phase 5 tests)

| # | Collision event | Spectra that must meet | Mechanism claimed | Response wanted | Decays when | Risk (rule 10) |
|---|---|---|---|---|---|---|
| H1 | the scan line passes and the neighbour's car is named | stored investment high × novelty high × feedback instant | valuing what is partly one's own — `SOURCED[6]` for the effect; **its transfer to a photograph of one's yard is `DERIVED`**, and [6] says the effect "dissipated" when people destroyed what they built, which this game is about | show it to someone | the yard has been seen in pixels a few times — feasibility[3] | none |
| H2 | a second hit inside the window | feedback instant × closure open × cost of failure none | points for kills "in quick succession" — `SOURCED[F8]` | throw faster | the yard is empty | none |
| H3 | landing on the car and going up again | input one button × feedback instant × attribution skill | `OPEN` — the stomp-and-bounce lead (Super Mario Bros.) was not opened | keep bouncing, steer to the next thing | — | none |
| H4 | the bottle at the mouth, a combo running | outcome certainty chosen × timer short | autonomy, "desire to be causal agents of one's own life" — `SOURCED[4]`; that a swig is felt as such is `DERIVED` | weigh a swig against a throw | the best amount is found and repeated | names alcohol; see feasibility §4.5 |
| H5 | «впервые: 🚲» and twenty empty places | closure open × stored investment rising | "an urge to complete tasks previously initiated" — `SOURCED[1]`. The better-known claim, that unfinished tasks are *remembered* better, is **not** relied on: a 2025 meta-analysis found "no memory advantage" `SOURCED[1]`. Goal-gradient and endowed-progress leads: pages not found, `OPEN` | photograph another place; come back | the kinds near home are used up | none |
| H6 | opening on a new day | novelty renewed × timer real-world | one a day "creates a sense of scarcity, leaving players wanting more" — `SOURCED[2]`, said of a game where **everyone has the same puzzle**; here only the date is shared | come back tomorrow | made streets start to look alike | waiting only (allowed, Q8); no penalty for a missed day |
| H7 | the card, with a line of 🚗⬜🪴 | social visibility × closure | a shareable emoji result preceded Wordle's spread; "1.2 million Wordle results were shared on Twitter" in 13 days — `SOURCED[2]` | send it | — | privacy: see below |

**The self-test the skeleton asks for (slot 10).** A lazy copy would take the album and the daily street
and miss H1: without the photograph the street is a tile set and the album is a checklist. Remove H1 and
H5–H7 have nothing of the player's to stand on. Remove the detector and H1 is gone. That order is the
pyramid.

## 6. Back to the findings — what this build answers, and what it does not

Against `docs/feasibility.md` §4:

| Problem found | Answer in this build | Honest state |
|---|---|---|
| 1. One yard is one level | The street: made yards beyond the photograph, and any number (to nine) of the player's own photographs in line | Made yards are re-ordered strips and repeated things. Whether that reads as "more of my street" or as wallpaper is not known |
| 2. No reason to come back | Album, days, records, a street that changes with the date | Three mechanisms, each with a source for the mechanism and none for its working *here* |
| 3. The detector decides whether there is a game | unchanged | still untested from the creator's balcony |
| 4. Sharing has a privacy cost | The line carries no picture and no place. The picture is the game's 192-pixel picture, never the photograph | At that size a plate is about two pixels. Nothing blurs faces; a person in the photograph is a few pixels in the picture, and is still there |
| 5. The themes limit distribution | worse, not better: the bottle is now drunk on screen | App Store: apps that "encourage excessive consumption of alcohol" are rejected — feasibility `SNIPPET`. A swig here costs accuracy and wears off; it is still drinking as a mechanic |
| 6. No moat | unchanged | — |

Against the master prompt's rules: **12 (nothing in vain)** — each new module has its reason in
`docs/concept.md` and the test for that still passes; **13 (prove the core promise first)** — the promise
was not touched and every new part stands on it; **14 (checks are not evidence)** — 109 checks and a
headless play-through pass, and nobody has yet walked this street with a thumb.

What "comparable" would still take: *play my street* (feasibility §5) — the same yard for two players —
needs somewhere to keep a 15–30 KB picture. This build has no server and did not add one.

## 7. Methods used, and what each is known for

| Part | Method | Tag |
|---|---|---|
| More ground beyond the photograph | Patch-based texture synthesis: "copying and stitching together textures at various offsets". Plain tiling "is rarely satisfactory… there will be the seams in between the tiles and the image will be highly repetitive". Here: 16-pixel strips, each chosen among the five whose first column best matches the last column laid | `SOURCED[5]`; one-direction strips and the choice of five are `CHOICE` |
| Walking over a picture | Belt scroll: "both vertical and horizontal movement along a side-scrolling environment", introduced by *Nekketsu Kōha Kunio-kun* (1986) | `SOURCED[7]` |
| Jump on a flat picture | A height off the picture, with the shadow left on the ground | `CHOICE` |
| How drunk | Scales the look already sourced in `docs/style.md` F6–F7 (sway, tilt, double image) | `DERIVED[F6, F7]` |
| The shared line | An emoji row that shows the result and not the content | `SOURCED[2]` |
| Days that only count up | A streak that resets is a loss threat | `CREATOR` (Q8) |

## Sources — pages opened on 2026-10-11

1. Wikipedia, "Zeigarnik effect" — https://en.wikipedia.org/wiki/Zeigarnik_effect
2. Wikipedia, "Wordle" — https://en.wikipedia.org/wiki/Wordle
4. Wikipedia, "Self-determination theory" — https://en.wikipedia.org/wiki/Self-determination_theory
5. Wikipedia, "Texture synthesis" — https://en.wikipedia.org/wiki/Texture_synthesis
6. Wikipedia, "IKEA effect" — https://en.wikipedia.org/wiki/IKEA_effect
7. Wikipedia, "Beat 'em up" — https://en.wikipedia.org/wiki/Beat_%27em_up

(3 is unused: "Endowed progress effect" and "Goal gradient effect" returned 404 and are not cited.)
All were read through a summarising fetch; quotations are as it returned them and were not checked against
the pages by a second reading. They are encyclopaedia pages, not the primary papers.
