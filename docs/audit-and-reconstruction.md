# DVOR-8 — audit, comparison, and reconstruction

Built 2026-10-12 at repository state `d360ef3`, clean tree. This is the audit the creator asked for:

> "fully audit the current state of the project, play it through and compare it to the existing successful cases,
> again, when you can't find the exact example, drop one level and focus on that part, decompose and find the
> similar described module, then you need to reassemble construct our project taking the verified existing
> successful modules as a construction material, then as a result you have to output the full structure with
> overall highest possible rate of verification"

Four sections, in that order. §5 is the requested output — the structure with a **per-module verification rate**.

---

# 1. The audit — what is actually there

## 1.1 Verification inventory, measured

| Layer | Command | Result |
|---|---|---|
| Unit + integration | `node test.mjs` | **160 PASS, 0 FAIL** |
| Real browser playthrough | `tools/check.mjs` on a real photograph | 4 modes + 1 photo, **0 page errors** |
| The walk and the street | `tools/walk-check.mjs` | passed, 0 errors |
| The people | `tools/folk-check.mjs` | full call→police→caught cycle, 0 errors |
| The sky and the news | `tools/news-check.mjs` | passed, 0 errors |
| The monetisation playground | `tools/monetisation-check.mjs` | **26 PASS, 0 FAIL** |

**160 + 26 = 186 automated checks, all passing.** Every module carries a written reason, and that is itself
tested. This is a genuinely well-instrumented small project.

## 1.2 The playthrough, read back

```
title        stage=title  score 0    left 0   hand КАМЕНЬ  note "готов искать вещи на снимке"
demo sober   score 4280   left 0   combo x4   18.7 s  369 throws   4% hits   2 splashed
demo weed    score 7040   left 0   combo x10  10.0 s  161 throws   7% hits   1 splashed
demo alcohol score 2820   left 1   combo x3   19.0 s  321 throws   4% hits   4 splashed  1 police call
demo depress score 1160   left 0   combo x2   47.3 s   49 throws  12% hits   1 splashed  1 police call
photo a.jpg  targets 1    score 975           2.3 s   50 throws   6% hits   found in 1.7 s
errors       0
```

**Read the hit rates before the scores.** 4–12% is what a blind coordinate sweep achieves; the scores measure
the harness, not the game. No conclusion about difficulty or fun can be drawn from this run, and the audit does
not draw one.

**Two real observations survive that caveat.**

1. **The detector found one target in a real photograph** ("нашёл за 1.7 с: машина"). One usable target from a
   street photograph is thin, and it is the single largest product risk already named in `docs/feasibility.md`
   stage 0. The playthrough confirms it rather than resolving it.
2. **The depression mode ran 47.3 s against 10–19 s for the others.** That is the tunnel-vision mode: it is
   *meant* to be slow. But it sits outside the 20–60 s core-loop band the concept claims for the *other* modes
   and inside it only for itself. Worth stating, not worth fixing blind.

## 1.3 The changes since the constraints were written

Two modules arrived after `docs/constraints.md` was written, and one of them **contradicts a constraint that is
now wrong**.

**`src/folk.js` — people, water, and a real loss state.** Being seen ends the run (`ЗАМЕТИЛИ`). This directly
violates what `constraints.md` §PS2 says: *"The absence of a score goal, of loss, and of any forced order is the
design's strongest evidence-backed feature."*

**The constraint was over-claimed, and the evidence says so.** The verified finding is that **autonomy** is the
strongest single predictor of enjoyment (β = .49) — not that loss is absent. The SDT paper measures autonomy,
competence and relatedness; it says nothing about losing. I turned "autonomy predicts enjoyment" into "no loss",
which is a stronger claim than the source supports.

**And the new mechanic is autonomy-supportive, not autonomy-violating**, on four tests:

| Test | Evidence in the build |
|---|---|
| Is the loss caused by the player's own action? | Yes — throwing water makes a person look up |
| Is failure telegraphed? | Yes — a star meter (`heat`), `СМОТРИТ — ПРЯЧЬСЯ`, vibration, sound |
| Is failure avoidable with a learnable action? | Yes — `hideBtn` / `KeyH`, and the test *"no single passer-by's look ends a run on its own: there is always time to hide"* |
| Is recovery instant? | Yes — restart is one tap |

**Revised constraint, replacing §PS2's Statement:**

> **Games may contain loss. What they may not contain is loss that is *imposed* rather than *caused*, or loss
> that *takes something away*.** Progress must remain monotonic; the only permitted cost of failure is the run.

This is a strengthening, not a concession: it is a rule that can be tested, where "no loss" was a rule that the
project's own creator then broke.

---

# 2. The comparison — verified comparables, module by module

Each row: what the build does, what was found, and the **decisive difference**. Where no exact example exists the
search dropped one level to the nearest *described module*, as instructed.

## 2.1 The core mechanic — photograph of your own place becomes the level

| | |
|---|---|
| **Build** | camera → on-device detector → 8-bit restyle → the found objects are the destructible targets |
| **Found** | **Paper Game** (2020, `VERIFIED`): *"you can easily use your phone to take a photo. This photo is then analysed and platforms or solid objects are picked out as a sort of base for your game."* Free, level slots as IAP. **Piclings** (2011, `VERIFIED`): camera or library → level, $0.99. **Pixel Press Floors** (2014, `VERIFIED`): photograph of **special printed graph paper**, dead since 2017. **Nintendo Pictonico!** (2026, `VERIFIED`): your photos become minigames — but **faces only**, *"Your photos are not sent to Nintendo"*. **Meta First Encounters** (2023, `VERIFIED`): your real room is the arena — via **live depth mesh, no photograph** |
| **Decisive difference** | **No verified product combines a still photograph with destructible targets and a pixel-art restyle.** Nintendo ships photo→game at scale, but with faces into authored minigames. Meta ships room→level, but live and mesh-based. |
| **Verdict** | **`NOVEL` — and the novelty is narrow and specific.** The claim that survives verification is: *the real objects in the player's own photograph, detected on the device, are the things you break.* That is unoccupied. |

**What this changes.** The concept's differentiation is not "photo becomes a level" — that has shipped three
times since 2011. It is the **detection + destruction** pair. Paper Game and Piclings both turn the photo into
static geometry; nobody detected the objects and let you break them.

## 2.2 The walker and the jump

| | |
|---|---|
| **Build** | 46 px/s walk · 150 px/s launch · 520 px/s² gravity → **21.6 px apex, 0.577 s airtime** · bounce 125 px/s → **15.0 px apex** |
| **Found** | Fasterholdt, Pichlmair & Holmgård, *"You Say Jump, I Say How High?"*, **DiGRA/FDG 2016, `VERIFIED`**, Table 4, measuring shipped games in character-heights: **Mario (SMB3)** gravity 75 u/s², takeoff 13.75–15.75 u/s, **max jump 5.287 u, 0.967 s**; **Super Meat Boy** 41 u/s², takeoff 21 u/s, 5.554 u, 1.05 s; **Limbo** 6 u/s², 0.529 u, 0.85 s |
| **Decisive difference** | The build's jump is **1.31 character-heights** if a thing is ~16.5 px. Mario's is 5.29. So the build's jump is *shorter relative to its character* than the measured platformer canon — but its **airtime (0.577 s) sits between Limbo (0.85 s) and the "0.25–0.45 s to apex" heuristic**. |
| **Verdict** | **`BENCHMARKED` for airtime, `UNBENCHMARKABLE` for gravity in absolute units.** |

**Two corrections the source forces.**

1. **Do not claim the gravity is "well above Earth's."** It is 520 px/s²; that equals 9.8 m/s² unless 1 px ≈
   1.88 cm. In character-height terms measured Mario is ~7.6× Earth. The honest statement is *"genre-typical,
   measured in character-heights"* — never absolute.
2. **The bounce is `ORIGINAL TUNING` with no precedent.** No published bounce velocity exists for Mario, DKC,
   DuckTales or Hollow Knight — the mechanic is documented everywhere and quantified nowhere. The build's
   125 px/s gives a **15.0 px apex, shallower than the 21.6 px jump**. That is a coherent choice: a shallower
   bounce makes chaining a decision rather than an accident. Record it as a choice, not as a match.

## 2.3 The stomp

| | |
|---|---|
| **Build** | landing on a thing is a hit and a bounce; a jump is a hit made with the feet |
| **Found** | Mario Wiki, `VERIFIED`: *"Stomping on enemies is Mario's primary attack… Stomping first appears in Super Mario Bros. Anyone who can jump has the ability to stomp."* The **design rationale** is in the same DiGRA paper, verbatim: Mario's jump *"aids in stomping, i.e. landing vertically on enemies. This mechanic… is supported by the relatively low horizontal speed, which reduces the amount of possible landing positions, making it easier to hit a target."* Chaining is real: Hollow Knight's *"needle-bouncing"* refreshes mid-air abilities; DKC Returns gates bounce height on a timed button press. |
| **Decisive difference** | **None — this is the closest match in the whole audit.** The build's 46 px/s horizontal against a ~192 px-wide picture is *exactly* the "relatively low horizontal speed" the source credits for making stomping work. |
| **Verdict** | **`BENCHMARKED`.** The low horizontal speed is not a limitation; it is the documented precondition for the mechanic. |

## 2.4 The people — detection, hiding, and the harmless interaction

This is where the build departs furthest from anything proven, and where the reconstruction has the most to do.

| Build parameter | Nearest verified source | Verdict |
|---|---|---|
| "being seen" is a **binary** end-of-run | **Splinter Cell: Blacklist** (Game AI Pro 2 ch. 28, `VERIFIED`): detection is a **timer** filling a HUD bar, scaled by distance, light and NPC state, with **a third intermediate state** — *"the NPC knows he saw something and will go to investigate (usually at some percentage of the progress bar)"* | **`GAP`** — the build has no investigate state |
| An accumulating danger meter | **The Last of Us** (Game AI Pro 2 ch. 4, `VERIFIED`): *"the player would only be seen if they were in the AI's vision sweet spot for **1–2 s**"* | **`BENCHMARKED`** for accumulation; the build's per-kind rates are original tuning |
| Per-kind danger rate 0.1–0.9/s, look 1.5–3 s, alarm 0.3–1.2 s | **No published real-game equivalent exists.** MGS2's own manual (`VERIFIED`) documents four phases — Normal/Alert/Evasion/Caution — and *"a gauge beneath the radar"*, with **no durations anywhere**. | **`ORIGINAL TUNING`** — must be judged as invention, not as a match |
| Graded vision by zone | Game AI Pro 2 ch. 4, `VERIFIED`: **identification certainty 1.0 / 0.7 / 0.5 / 0.4 / 0.3** across vision zones | **`GAP`** — the build treats a look as one rate with no distance or angle gradient |
| Hiding clears the alert in 1.2 s | Documented in MGS2 (gauge depletes out of sight), Blacklist (*"his window of opportunity to break LOS"*), MGS4. **No duration is published by any of them.** | **`ORIGINAL TUNING`**, and 1.2 s is *far* shorter than these games' multi-second-to-minute search phases |
| Water only; nobody can be harmed | **Untitled Goose Game** (`VERIFIED`): the groundskeeper's entire response set is *"shoo → chase"*; soaking him is a checklist objective (*"get the groundskeeper wet"*). The design vocabulary is **mischief / nuisance / prank sandbox**, with no damage model | **`BENCHMARKED` — and this is the strongest precedent in the audit** |
| A bystander calls the police, who then patrol and look in turns | **Assassin's Creed 2** notoriety, Ubisoft's own Q&A (`VERIFIED`): *"break the law one too many times and you will become 'wanted'… the authorities will search for you"*, reducible by *"Assassinate witnesses • Bribe a Herald • Get rid of warrant posters"*. GTA's wanted-level **decay timer is `UNVERIFIED`** — no citable source could be opened | **`BENCHMARKED`** for the escalation shape; the police "looking in turns" is original |

**The single most important comparison.** Untitled Goose Game proves the exact design posture: an NPC you can
only ever inconvenience, whose response is spatial rather than harmful, in a game whose vocabulary is mischief.
DVOR-8's water ball is that posture with a detection layer on top. **The harmless-interaction design is
`PROVEN`.**

## 2.5 The sky and the news

| | |
|---|---|
| **Build** | a plane towing a banner or an airship with a running board carries the day's real news; a hit turns the page |
| **Found** | **Animal Crossing balloons** (Nookipedia, `VERIFIED`): *"Balloons, also known as balloon presents, occasionally float in the air across town… carrying a present with them. The balloons can be shot down with a slingshot to obtain the present. If shot down over water, it will land in the water and be unobtainable."* **Don Carson (2000)**, `VERIFIED`, origin of "environmental storytelling": *"the story element is infused into the physical space a guest walks or rides through."* |
| **Decisive difference** | The **carrier + ranged hit + payload** structure matches Animal Crossing exactly. What does **not** exist is the **live data**: `UNVERIFIED` — *no shipped game could be found that pulls a live real-world feed into an in-world object*; GTA's radio and in-game internet are scripted ambient content. |
| **Verdict** | **`BENCHMARKED` structurally; `NOVEL` and unproven for the live feed.** The live-news element is the project's most speculative bet, and no comparable exists either way. |

## 2.6 The album, the days, the sharing

| | |
|---|---|
| **Build** | album of kinds ever wrecked with empty slots · days visited, never resetting · records · an emoji share line · a street rebuilt from the date · photographs the player adds |
| **Found** | **Pokédex empty slots** (Bulbapedia, `VERIFIED`): *"entries adjacent to seen Pokémon are shown as blank spaces"* — the exact empty-slot design. **Fate/Grand Order** (`VERIFIED`): ships *"total (通算) logins… cumulative and not consecutive (missing a day does not reset it)"* **alongside** a resetting consecutive streak. **Spelunky daily** (PlayStation.Blog, Derek Yu, `VERIFIED`): *"each day a set of levels is generated that has the same seed for everyone playing it."* **Wordle share grid** (`VERIFIED`): *"1.2 million Wordle results were shared on Twitter"* between 1–13 January. **Endowed progress** (Nunes & Drèze 2006 — **primary opened in an earlier pass**, 34% vs 19%, χ²(1)=8.1, p<.01) |
| **Decisive difference** | Each mechanic has a shipped precedent. **None of them has a controlled measurement of retention.** |
| **Verdict** | **`BENCHMARKED` as design; `UNPROVEN` as effect.** |

**The finding that governs all retention claims.** The researcher's summary, and it is the most important sentence
in this audit:

> *"Not one of the seven has a controlled measurement of a retention rate attributable to the mechanic. Every
> retention claim is growth/volume correlation, designer assertion, or qualitative interviews. Asserted by
> industry with no measurement found: 'empty slots drive play'; 'daily content improves return rate';
> 'player-added content extends play'."*

The only controlled result in the cluster is endowed progress (34% vs 19%). **A verification-rate table for a
retention module must therefore cap its evidence at `BENCHMARKED`, never at `PROVEN`.**

---

# 3. The reconstruction — what to build, and from what

Construction materials are verified modules from real products. Each entry gives the **source module**, what is
**adopted**, and what is **rejected**.

## 3.1 Adopt — changes worth making

| # | Adopt | From | Why | Cost |
|---|---|---|---|---|
| **R1** | **An intermediate "investigate" state** — a person who half-saw something walks toward the spot instead of the run ending | Splinter Cell: Blacklist, Game AI Pro 2 ch. 28 | This is the single largest `GAP`. It converts a binary loss into a learnable gradient and gives the player a decision | one more state per person; the `folk` FSM already has `alarm → look → lost`, so this is a fourth branch |
| **R2** | **Graded vision: certainty falls with distance** | Game AI Pro 2 ch. 4 — 1.0 / 0.7 / 0.5 / 0.4 / 0.3 by zone | The build's "look = one rate" makes position irrelevant. Grading makes *where you stand* matter, which is what makes hiding a skill | one distance term in `danger rate` |
| **R3** | **A visible progress bar per looking person**, not only the star meter | Blacklist: *"the growing HUD element… defines his window of opportunity"* | Telegraphed failure is what keeps a loss autonomy-supportive rather than arbitrary | the `render.js` passer drawing already exists |
| **R4** | **State the jump in character-heights, and stop claiming absolute gravity** | DiGRA/FDG 2016, Table 4 | Removes an unsupportable claim from `docs/style.md` | documentation only |
| **R5** | **Record the bounce as original tuning with its measured consequence** | *no precedent found* | 125 px/s gives a 15.0 px apex against a 21.6 px jump — a shallower chain hop that makes chaining deliberate | documentation only |
| **R6** | **Cite the primary source for endowed progress** | Nunes & Drèze 2006, opened earlier | Several secondary sources are in circulation; the primary is available and better | documentation only |
| **R7** | **Reframe the concept's novelty as detection + destruction**, not "photo→level" | Paper Game, Piclings, Pictonico! | Photo→level has shipped at least four times since 2011, once by Nintendo at scale. Claiming it as novel is false | `README.md` and `docs/concept.md` |

## 3.2 Keep — already verified, do not touch

| Keep | Verified by |
|---|---|
| The low horizontal speed against the picture width | DiGRA/FDG 2016's own explanation of why stomping works |
| Water as the only thing thrown at a person | Untitled Goose Game's shoo→chase, no-damage posture |
| Escalation: bystander → police → looking in turns | AC2 notoriety, Ubisoft's own Q&A |
| People and animals never targets | The project's own tested constraint, and the ethics line |
| Album empty slots, cumulative days, records | Pokédex blank spaces; Fate/Grand Order's non-resetting counter |
| The date-seeded street | Spelunky's same-seed-for-everyone daily |
| The emoji share line | Wordle's grid |
| The carrier + ranged hit + payload pattern in the sky | Animal Crossing balloons |
| Monotonic progress, nothing losable between runs | Hades' stated intent; endowed progress 34% vs 19% |
| The 160-check instrumented build itself | This audit's playthrough |

## 3.3 Do not claim

| Claim | Status |
|---|---|
| "Photo→level is novel" | **False.** Paper Game 2020, Piclings 2011, Pixel Press Floors 2014, Nintendo Pictonico! 2026 |
| "No loss at all" | **Withdrawn** — the build has a loss state, and §1.3 shows the constraint was over-claimed, not the build |
| "Gravity well above Earth's" | **Unsupportable in absolute units** |
| "Daily content brings players back" | **Asserted by industry; no controlled measurement exists** |
| "The album's empty slots drive play" | **Same** |
| "Live news in the sky has precedent" | **No precedent found in either direction** |
| "MGS's alert timer is N seconds" | **Folklore** — Konami publishes phase structure, never durations |

---

# 4. The full structure with verification rate

The requested output. Each module: what it is, its verified construction source, and its **verification rate** —
the share of its parameters that a real, opened source supports.

**Scale:** `PROVEN` = the mechanism *and* its parameters are sourced · `BENCHMARKED` = the mechanism is sourced,
parameters are original tuning · `DESIGN-ONLY` = shipped precedents exist, no measured effect · `NOVEL` = no
precedent found, either way · `GAP` = the module is missing something the sources show is standard.

| # | Module | Source module, verified | Parameters verified | Rate |
|---|---|---|---|---|
| 1 | **Capture** — camera → on-device detector → 8-bit restyle | Paper Game, Piclings, Pictonico! (all `VERIFIED`) | detector = MediaPipe EfficientDet-Lite0, vendored, on-device; **no verified product combines photo + destructible targets + restyle** | **`NOVEL`** (the combination) |
| 2 | **Detect** — 80 COCO classes, 13 overlapping slices, score ≥ 0.4, ≤ 14 targets | `docs/style.md` F14/F16; the slice technique is sourced | slice-and-detect is sourced from a real detection paper; thresholds are `CHOICE` | **`BENCHMARKED`** |
| 3 | **Restyle** — 192×256, 28 colours from the photo's own palette | Torralba 2009 (32×32 gives 80% object reporting); MIRC cliff 80%→24% | resolution is 48× the proven threshold; the size is `CHOICE` | **`BENCHMARKED`** |
| 4 | **Modes** — four looks, each changing the hand *and* the focus | Project rule 12, tested | internally proven by the suite; no external equivalent found | **`DESIGN-ONLY`** |
| 5 | **Walk** — 46 px/s, jump 150 px/s, gravity 520 px/s² | DiGRA/FDG 2016 Table 4 (Mario, SMB, Limbo) | airtime 0.577 s is inside the measured canon; gravity `UNBENCHMARKABLE` in absolute units | **`BENCHMARKED`** |
| 6 | **Stomp** — landing is a hit; bounce 125 px/s | Mario Wiki + DiGRA's rationale (low horizontal speed) | **bounce velocity has no precedent anywhere**; 15.0 px vs 21.6 px is original tuning | **`BENCHMARKED`** mechanism, **`NOVEL`** bounce |
| 7 | **People** — five kinds, per-kind alarm/look/rate | MGS2 manual (4 phases, gauge, no durations); The Last of Us (1–2 s in the sweet spot) | **rates, look durations and 0.3–1.2 s alarm are original**; no real-game equivalent | **`GAP`** (no investigate state, no graded vision) |
| 8 | **Hide** — 1.2 s clears the look | documented in MGS2/Blacklist/MGS4 | **1.2 s is far shorter than the documented multi-second search phases; no duration is published by any source** | **`BENCHMARKED`** mechanism, **`NOVEL`** duration |
| 9 | **Harmless conflict** — water only, nobody harmed | Untitled Goose Game shoo→chase, checklist soaking | the whole posture is sourced | **`PROVEN`** |
| 10 | **Escalation** — a bystander calls the police | AC2 notoriety, Ubisoft's own Q&A | escalation shape sourced; "police look in turns" is original; **GTA decay timers `UNVERIFIED`** | **`BENCHMARKED`** |
| 11 | **Sphere** — plane/airship carries the news | Animal Crossing balloons (carrier + ranged hit + payload) | the carrier pattern is sourced; **the live feed has no precedent in either direction** | **`BENCHMARKED`** carrier, **`NOVEL`** live feed |
| 12 | **Album** — kinds ever wrecked, empty slots | Pokédex blank spaces; Pixel Gun 3D gallery | the UI pattern is shipped; **no measured effect** | **`DESIGN-ONLY`** |
| 13 | **Days** — cumulative, never resetting | Fate/Grand Order (cumulative *and* consecutive ship side by side); Waterloo IDC study on streak harm | mechanic sourced; design intent for FGO's counter is **not** stated by any source | **`BENCHMARKED`** |
| 14 | **Date-seeded street** | Spelunky daily (same seed for everyone) | mechanism sourced; no source states the seed is computed *from the date* | **`BENCHMARKED`** |
| 15 | **Share line** — emoji result | Wordle grid; 1.2M results shared 1–13 Jan | mechanism sourced; effect confounded with the game's growth | **`DESIGN-ONLY`** |
| 16 | **Add a photograph** — the player extends the world | Mario Maker 2 (10M courses); GameDiscoverCo UGC study (+75% CCU at 2y) | **correlational and vendor-commissioned**; compares titles that *ship* UGC, not players who *add* content | **`DESIGN-ONLY`** |
| 17 | **Monetisation** — four strategy-agnostic decomposition forms | Huuuge HY2021 (filed); RevenueFlex ad form; GameAnalytics benchmarks; Moreira 2021 (peer-reviewed conversion) | identities are filed; **components are vendor estimates; the filing is internally inconsistent** | **`BENCHMARKED`** |
| 18 | **Ethics** — reversible, nothing taken, people excluded | Project constraints; Rozin benign masochism; Kjærvik & Bushman (rage rooms null) | mechanism and its literature are sourced | **`PROVEN`** |

## 4.1 The aggregate

Of 18 modules:

| Rate | Count | Modules |
|---|---|---|
| `PROVEN` | **2** | harmless conflict · ethics |
| `BENCHMARKED` | **10** | detect · restyle · walk · stomp · hide · escalation · sphere · days · date-seed · monetisation |
| `DESIGN-ONLY` | **4** | modes · album · share line · add-a-photograph |
| `NOVEL` | **1** | capture (the detection+destruction combination) |
| `GAP` | **1** | people (detection model) |

**Overall verification rate: 12 of 18 modules (67%) have a verified construction source for their behaviour, and
2 of those are proven including parameters. 6 of 18 (33%) rest on design precedent without measurement, or on
invention.**

**That is the honest ceiling, and it is a good number.** The 33% is not a defect to hide: it is exactly the set
of claims the industry makes without measurement, and the audit's job is to stop the project repeating them as
if they were facts.

## 4.2 The one structural change

If a single change is made from this audit, it is **R1 — the intermediate investigate state.** It is the only
`GAP`, it is the module closest to the player's moment-to-moment experience, and every proven comparable has it:
Blacklist's percentage-threshold investigate, MGS's four-phase cycle, AC2's escalating search. The build goes
from *unseen* to *run over* with nothing in between, and that is the one place where the reconstruction has a
verified module to install and the project does not yet have one.

---

# 5. What this audit could not verify

Reported rather than filled, per the project's own rules.

1. **Any controlled measurement of a retention effect** for collection, daily content, or player-added content.
   Three mechanisms, zero controlled results.
2. **Any shipped game pulling a live real-world feed into an in-world object.** The live-news module has no
   precedent in either direction.
3. **GTA's wanted-level decay timer.** Every source was Cloudflare-blocked; `UNVERIFIED`, and not to be cited.
4. **Any published detection or alert timer in seconds** for MGS, Splinter Cell, AC, or Thief. The structure is
   documented everywhere; the numbers nowhere.
5. **Any published bounce velocity** for Mario, DKC, DuckTales or Hollow Knight.
6. **Meta's official First Encounters store copy** (HTTP 400) and **Nintendo's Pictonico!** specs beyond its own
   regional pages.
7. **A second independent source for Piclings and Paper Game.** Both rest on one review each; Paper Game's store
   page is delisted.
8. **Whether the photograph→level combination is actually unoccupied**, as opposed to merely unfound. The search
   covered English and Japanese queries and several store registries; an absence of evidence across a few dozen
   queries is not proof, and this audit does not present it as proof.
