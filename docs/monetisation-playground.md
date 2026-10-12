# The monetisation playground

Built 2026-10-12 at repository state `ac1bdd6`, per the instruction:

> "find the right approach to the monetisation mechanic tests prerequisites, so we have to create, verify its
> validity and reasonability, the appropriate mathematical playground, where when appropriate monetisation
> methods applied we can verify and regress test the results"

**The files:**

| File | Role |
|---|---|
| `tools/monetisation-model.mjs` | the model — pure, seeded, dependency-free |
| `tools/monetisation-check.mjs` | the validation — 26 checks, three kinds, all falsifiable |

```
node tools/monetisation-check.mjs      # 26 PASS, 0 FAIL
```

---

# 1. The design principle, and the correction that produced it

**There is no single correct monetisation decomposition. The strategy decides the form.** What is mandatory is
that a form's **units and base are consistent** — the per-payer figure and the payer share must be measured
over the same period and against the same population.

An earlier revision of this file got this wrong twice, in opposite directions, and both errors are instructive:

1. **First error — declaring the object unsearchable.** "No verified revenue-per-user figure exists for AR or
   location-based games." Wrong: ARPU is *computed* from components, and the components are published.
2. **Second error — over-correcting to one form.** Having found that `ARPPU_daily × DPU/DAU` reproduces a
   filing, I declared it *the* published decomposition. Wrong again: that was **one filing's instantiation**.
   The same filing is consistent under several forms, and different strategies legitimately use different ones.

The rule now encoded:

```
ARPDAU = ad term + IAP term                              (universal identity)
LTV    = ARPDAU × Lifetime                               (universal identity)
                                  both are FILED definitions

the IAP term takes the form the STRATEGY implies:
   daily    ARPPU_daily   × (DPU / DAU)
   monthly  ARPPU_monthly × (MPU / MAU) / 30
   blended  ARPPU_period  × conversion_period / days_in_period
   ad-led   (eCPM / 1000) × fill_rate × impressions_per_DAU

valid iff units and base agree. Mixing a monthly share with a daily per-payer figure
is the only form that is always wrong, and it is kept in the model as `arpdauIap`
so the error stays measurable rather than hidden.
```

---

# 2. How the model is built

**Four layers, each independently checkable.**

**Layer 1 — retention.** A power law, because that is the form the published source prints (Google Play's LTV
whitepaper gives `y = a·x^b`). Day-1 retention *is* the coefficient `a`, so D1 and D7 pin the whole curve and
lifetime is the exact area under it.

**Layer 2 — ad impressions, gated by design AND pacing.**

```
impressions_per_DAU = sessions × min(stops_per_session, play_minutes / pacing_minutes)
```

This is the piece that makes "place the monetisation element where it is supposed to go" a number instead of an
opinion. `stops_per_session` is the designer's choice; **wall-clock time and the platform's pacing rule bound it
from above.** For DVOR-8 the stops are counted from the build: one yard cleared, one new yard arrived at, one
album moment — and the restart is deliberately *not* a stop, because `constraints.md` P6 requires the clean yard
to stay one action away.

**Layer 3 — revenue.** The identities above, with every input carrying a provenance tag.

**Layer 4 — Monte Carlo.** Every player draws engagement from the published distributions, so the output is a
distribution rather than a point estimate. Seeded, therefore replayable to the last digit.

**Provenance is mandatory.** Every constant is tagged `FILED` · `PEER` · `VENDOR` · `PLATFORM` · `DOCS` ·
`ESTIMATE`, and every `ESTIMATE` is listed at the end of every run so the next pass knows exactly what to go
and find.

---

# 3. Verification: three kinds of check

| Kind | Meaning | A failure means |
|---|---|---|
| **IDENTITY** | must hold exactly | a bug in the model or the test |
| **STRUCTURE** | must hold to a stated tolerance | a finding about the model |
| **GROUND** | regression against a public company's filed numbers | the model is wrong about the world |

The **GROUND** layer is the important one and it does not depend on any parameter I chose. Huuuge Inc. is
WSE-listed and reports under IFRS, so its KPIs are audited-quality.

**What the ground test found — and it is a finding about the *source*, not the model:**

| Form | Result vs filed ARPDAU $1.40 |
|---|---|
| A — daily: `ARPPU_day × DPU/DAU` | **$1.333 — off 4.8%** ✅ |
| B — monthly: `ARPPU_month × MPU/MAU / 30` | $2.252 — off 61% |
| C — conversion route: `ARPPU × conversion / 30` | $0.075 — off 95% |
| D — mixed (the old error) | $0.075 |

The implied daily payer share from `ARPDAU / ARPPU_daily` is **0.0354**; the filed `DPU/DAU` is **0.0338**.
Those two agree to 5%. But the filed monthly conversion of 5.7% applied to MAU does not reconcile with either.

**So the honest conclusion is: the filing is internally inconsistent, and the open question is what base
Huuuge's "Monthly Conversion" is measured on, or whether the ARPPU is monthly.** The playground therefore
validates the *identity* against a filing and **never calibrates a free parameter to one.**

---

# 4. Findings the playground has already produced

1. **Anti-overstuffing, quantified.** Requesting 8 ad slots in a 5.5-minute session buys **exactly nothing**
   over requesting 3, because pacing allows 2 and the cap binds on both. Ad revenue cannot be increased by
   declaring more stops.
2. **Strategy shapes the revenue *distribution*, not just its level.** Ad-only: the top 1% of players carry
   **15.6%** of revenue — ad revenue scales with *play time*, so it is spread across the cohort. Adding a payer
   layer raises it to **41.4%**. **The same headline ARPDAU can hide either shape**, so a monetisation decision
   cannot be made on ARPDAU alone.
3. **Stickiness is not retention.** A power law cannot be fitted to DAU/MAU at all — the best fit needs a
   day-1 retention of 6.49, which is impossible. D1/D7 must come from benchmarks and must never be derived
   from DAU/MAU.
4. **The verified reward effect is preference-matching, not variability.** `η²p = .205` for matching the
   reward to the player's stated preference, versus `η²p = .004` (**not significant**) for variable-ratio
   versus fixed-ratio scheduling. A design that "adds variable rewards" because that is the folklore
   contradicts the best available evidence.

## What each design lever is worth, priced at published rates

```
profile                 LTV        x base   ARPDAU    t
dvor8_as_built          $0.0000    —        $0.0000   —
dvor8_stops_as_built    $0.1443    x1.00    $0.0317   —
dvor8_strong_retention  $0.2839    x1.95    $0.0390   137.4
dvor8_overstuffed       $0.1567    x1.08    $0.0342   10.2
dvor8_web_puzzle        $0.4970    x3.42    $0.1086   218.4
```

Read this carefully, because the interesting number is not the largest one.

- **Retention is worth ~2×.** Moving from median to top-quartile retention nearly doubles LTV. That is the
  single largest lever available, and it is the one `docs/feasibility.md` identified.
- **"Web puzzle" is worth 3.4×, but it is not a design change.** That profile simply imports CrazyGames' own
  published figures (21 minutes per play, 8.9 impressions) — it is a *different game*, and its lesson is that
  **session length dominates**. A 5.5-minute session cannot be ad-monetised the way a 21-minute one can.
- **Overstuffing is worth 1.08× — and that is measurement noise, not a gain.** The true effect is zero.

---

# 5. What the playground cannot do

Stated plainly, because overclaiming here is what went wrong before.

**It prices a design given published parameters. It cannot tell you that moving a design parameter will move
revenue.**

The reason is a specific, verified gap: **no study isolates a single design parameter and measures an
engagement outcome.** The juiciness experiments (Kao 2020, N = 3018) manipulate *aggregate* feedback and get
partial η² between .003 and .01 — under 1% of variance. Screen shake amplitude, hitstop frames and particle
counts have **no measured effect on anything**. There is no event-level affect model.

So the causal chain `design change → engagement → revenue` has a **verified first link (accounting) and an
unverified second link (design → engagement).** The playground makes the first link rigorous and marks the
second `ESTIMATE`.

**Three `ESTIMATE`s still carry weight and must be replaced, in this order:**

1. **`fill_rate`** — no published figure; set to 1.0, and it moves the whole ad term linearly.
2. **`d1_median`** — no median day-1 retention is printed; interpolated between the printed bands.
3. **All design→parameter links** — these encode DVOR-8's choices, not measurements.

---

# 6. How to test a monetisation strategy against it

1. **State the strategy's form** and check its units and base agree. A mixed form is the only automatic failure.
2. **Add a profile** to `PROFILES` naming the stops, session length and retention the strategy implies.
3. **Run `compare()`** against the base. It pairs on the same seeds, because the difference between two designs
   is smaller than the spread between players, and unpaired runs drown in that spread.
4. **Read the distribution, not just the mean** — `top1pctShareOfRevenue` distinguishes an ad-led strategy from
   a payer-led one at the same ARPDAU.
5. **If a lever moves, ask which link it moved.** If it is the accounting link, the model is right and the
   answer is arithmetic. If it is the design→engagement link, the model is guessing unless a citation says
   otherwise — and none does.
