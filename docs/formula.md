# The formula

Constructed from the verified constraints and the audited lever measurements. Every term carries the class of
evidence behind it, and the classes are the ones this project has used throughout:

`IDENTITY` — a definition or an algebraic consequence. True by construction; the testbed asserts it.
`MEASURED` — computed by `tools/monetisation-model.mjs` from published parameters. Reproducible with the
command printed beside it.
`FILED` — a published figure from a real company's filing or a real game's documentation.
`ESTIMATE` — a number with no source, declared so it cannot be mistaken for the others.
`DESIGN` — a direction with a citation, **with no measured rate**. It says which way to turn a knob, never how
far the revenue moves.

---

## 1. The two identities

Everything else is built on these, and neither is a claim about this game.

```
    ARPDAU  =  adRevenue/DAU  +  IAP revenue/DAU                                    [IDENTITY]
    LTV     =  ARPDAU  ×  lifetimeDays                                              [IDENTITY]
```

Verified in the model, not asserted: with the base profile, `arpdau 0.026024 × 4.5741 dauDays per player =
0.119035`, and the reported LTV is `0.119035`. Exact to the last digit.

**`LTV = ARPDAU × lifetime` is the whole spine.** Every lever below acts on one of those two factors and on
nothing else, which is why the formula composes the way it does.

Reproduce:

```
node --input-type=module -e "
  import { PROFILES, simulateCohort } from './tools/monetisation-model.mjs';
  const s = simulateCohort(PROFILES.dvor8_stops_as_built, { n: 12000, seed: 8 });
  console.log(s.arpdau, s.totalDauDays / s.n, s.ltv);"
```

## 2. The ad factor, in full

```
    adARPDAU  =  (eCPM / 1000)  ×  fillRate  ×  impressionsPerDAU                  [IDENTITY]
    impressionsPerDAU  =  min(stopsPerSession, floor(playMinutes / pacingMinutes))  [STRUCTURE]
    fillRate  =  1.0                                                                [ESTIMATE]
```

`fillRate = 1.0` is the model's weakest number and it is declared as an estimate, not a filing. **No published
fill rate was found**, and it is the highest-priority term to replace. It is also *cancelled* in every ratio
below, because a ratio divides it out — so the lever table is unaffected by it even though the absolute LTV is.

The `min` is a real constraint with a real consequence, measured rather than assumed: a session longer than
`stops × pacingMinutes` gains **nothing**, because the player runs out of natural stopping points. Anti-
overstuffing is therefore true *on average* and false in the tail. The count is **7.9% of players**, whatever
the draw: re-derived from the model's own per-player spread (playMinutes 5.5, spread 0.35) it is **1,576 of
20,000**, against the **1,583** recorded in `docs/game-pieces-audit.md`, which came from a full cohort run
where the generator is consumed differently. The two agree to 0.4% and the share is the same to one decimal;
both are reported because a single figure quoted as exact would be false precision.

## 3. The lever table

Each lever's ratio is its effect on **LTV**, computed by the testbed at `n = 12000, seed = 8` against the base
profile `dvor8_stops_as_built` — three natural stops, ads only.

| # | Lever | Ratio on LTV | t | Acts on | Evidence |
|---|---|---|---|---|---|
| L1 | sessions/day **3.75 → 5.45** | **×1.453** | 121.4 | lifetime | `MEASURED` |
| L2 | session **5.5 → 8.5 min** | **×1.398** | 132.9 | adARPDAU, until pacing binds | `MEASURED` |
| L3 | retention **median → top quartile** | **×1.592** | 146.1 | lifetime | `MEASURED` |
| L4 | eCPM **3.05 → 4.15** (Android → iOS) | **×1.361** | 100.9 | adARPDAU | `MEASURED` |
| L5 | stops **3 → 6** | **×1.043** | 8.6 | adARPDAU, only past the pacing bound | `MEASURED` |
| L6 | ads only → **ads + a payer layer** | **×51.6** | 101.1 | ARPDAU | **UPPER BOUND ONLY — do not use** |

## 4. The composition rule, which is measured rather than assumed

**The levers multiply. They do not interact.**

Measured at `n = 12000, seed = 8`:

```
    sessions alone               ×1.453
    session length alone         ×1.398
    the two together             ×2.031      product of the two alone  ×2.031
    all four of L1..L4 together  ×4.400      product of the four alone ×4.400
```

Exact to three decimal places in both cases. So the formula closes:

```
    LTV  =  ARPDAU₀ × lifetime₀  ×  Π (lever ratios)                               [MEASURED]

         =  0.11904  ×  L1 × L2 × L3 × L4 × L5 …
```

and the four main levers compose to **×4.400**, which is the single most useful number this project has
produced: it is what "the game is well made" is worth in this model, and it is an upper bound in the sense
that no real game achieves all four at once.

**Why the multiplication is not a coincidence, and not a discovery about games.** L1 and L3 scale the number
of days a player is present; L2 and L4 scale the revenue per day. `LTV = ARPDAU × lifetime` is an identity, so
a factor that only touches days and a factor that only touches daily revenue must multiply. The measurement
confirms the model is built the way its identity says it is. **It is not evidence that these four levers are
independent in a real game** — that would require a study nobody has run.

## 5. What the formula is for, and what it cannot do

**It prices a design. It does not predict that a design change will move revenue.**

The honest statement of the model's power, unchanged since it was written and still true:

- It answers *"if sessions per day were 5.45 instead of 3.75, what would that be worth, holding everything
  else?"* — **×1.453**, with a t of 121.
- It cannot answer *"if I add a daily reward, will sessions per day rise?"* **No study isolates a single design
  parameter and measures an engagement outcome.** Every arrow from a design to a parameter is `DESIGN`, and
  the table above starts *after* that arrow has been assumed.

So the formula's real use is deciding **which** parameter to chase. On the measured numbers the order is:
retention (×1.592) > sessions per day (×1.453) > session length (×1.398) > eCPM (×1.361) ≫ more stops (×1.043).

**Adding stopping points is worth almost nothing.** The thing the game already has three of is the *least*
valuable lever measured, and the two most valuable are how often a player comes back and for how long they
stay. That is a direct answer to what to build next.

## 6. Terms that must not be used, and why

**L6, ×51.6, is an upper bound and nothing else.** It comes from a cross-market comparison — social-casino
payer parameters applied to a casual game — and the two markets have nothing in common. It is kept in the file
so the error stays measurable, and it must not be quoted as an achievable improvement.

**The retention curve must be coherent.** D1 and D7 are not independent. Measured: the median curve
(`d1 0.11, d7 0.0368`) gives a lifetime of **8.84 days**; the top-quartile curve (`d1 0.2709, d7 0.075`) gives
**12.16 days**; but taking the top quartile's D1 with the median's D7 — which is what "raise D1" looks like if
D7 is left alone — gives **2.00 days**. The curve becomes so steep that almost everyone churns in the first
week, and the modelled lifetime falls by **77%** *while the retention number goes up*. The testbed carries this as
`CURVE_INCOHERENT` with a test attached, because it is an easy and completely invisible mistake: nothing about
the D1 figure looks wrong.

**No free parameter is ever calibrated to a filing.** Where a real company's published numbers are internally
inconsistent — Huuuge's filing implies a payer share of 0.0354 while its DPU/DAU is 0.0338, which agree to 5%,
yet its filed monthly conversion of 5.7% reconciles with neither — the model validates the *identity* and
declines the calibration. A model fitted to an inconsistent filing inherits the inconsistency.

## 7. The estimates still carrying weight

Declared so they cannot be mistaken for the measured terms:

| Term | Status | Consequence if wrong |
|---|---|---|
| `fillRate = 1.0` | `ESTIMATE`, no published figure | scales all absolute LTV; **cancels in every ratio** |
| `d1_median` | interpolated between printed benchmark bands | moves L3's starting point, not its ratio |
| every design → parameter link | `DESIGN`, no measurement | the formula cannot be used to promise anything |
| casual ARPPU $1.55 | `ESTIMATE`, not a filing | affects L6 only, which is already disowned |

## 8. The formula, in one block

```
    LTV   =  ARPDAU × lifetime                                               [IDENTITY]

    ARPDAU =  (eCPM/1000) × fillRate × impressionsPerDAU  +  IAP/DAU         [IDENTITY]
    impressionsPerDAU = min(stops, floor(playMinutes / pacingMinutes))       [STRUCTURE]

    lifetime  ← L1 sessions/day  ×1.453   L3 retention  ×1.592              [MEASURED]
    ARPDAU    ← L2 session length ×1.398  L4 eCPM       ×1.361              [MEASURED]
               L5 more stops      ×1.043   (nearly nothing)                 [MEASURED]

    four main levers together:  ×4.400 = 1.453 × 1.398 × 1.592 × 1.361       [MEASURED]

    NOT PREDICTIVE OF DESIGN CHANGES. Order of what to chase:
    retention > sessions/day > session length > eCPM >> more stops.
```

## 9. The check

```
node tools/monetisation-check.mjs      # 29 PASS, 0 FAIL
node tools/audit-report.mjs            # regenerates docs/audit-levers.json
```

The 29 checks are of three kinds and none of them is a plausibility judgement: `IDENTITY` (the algebra above),
`STRUCTURE` (the `min`, the discrete ad slots, the curve guard), and `GROUND` (every parameter traced to a
filing or declared an estimate). A check that could be satisfied by a wrong model would not be worth running.
