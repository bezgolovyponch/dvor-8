# Game design science — the verified formula layer

Built 2026-10-12 at repository state `ac1bdd6`. This file answers the request in order:

> 1. Research the science-based game design studies in order to find the right formula parameters and core.
> 2. If you can't locate the formula, ask more questions.
> 3. Once the formula-creation principles are found and defined, decompose the project and create its formula.
> 4. Then seek the existing documented real successful published formula where hooks, methods and palettes connect to monetisation.

**Step 1 and 2 are this file. Step 3 is not started** — per the instruction not to proceed with decomposition until the verified concept exists. Step 4 is *not* re-run here; `docs/monetisation.md` holds it, and §7 records the one part of it that was wrong.

Every claim carries a status. `VERIFIED` = a source was opened and the words are there. `VERIFIED-SECONDARY` = real, read in a scholarly/trade reproduction. `UNVERIFIED` = could not open; justifies nothing.

---

# 1. The verdict, stated first

**There is no single unified formula of game design.** This is not a failure of search. The foundational paper says so in its own words.

Hunicke, LeBlanc & Zubek, *MDA: A Formal Approach to Game Design and Game Research*, verbatim:

> "there is no Grand Unified Theory of games or formula that details the combination and proportion of elements that will result in 'fun'."

`VERIFIED` — `https://www.cs.northwestern.edu/~hunicke/MDA.pdf`, 5 pp.

And the search confirms it: **no published work formalises "a game" or "a mechanic" as an equation system.** What exists instead is a **stack of partly-verified formalisms, one per layer**, some algebraic, some diagrammatic, some merely definitional. That stack is the answer to "the formula". §3 assembles it.

**What this means for the creator's request.** The formula exists as a *composition of layers*, not as one equation. Three of the layers carry real numbers; the rest carry structure. §5 names exactly which parameters are still unmeasured — that is the honest boundary of the science, and it is where step 3's decomposition has to mark `OPEN` rather than invent.

---

# 2. The verified sources, per layer

## L1 — What a game *is* (foundational definition)

**Juul's classic game model, six features.** Juul, J. (2003). "The Game, the Player, the World: Looking for a Heart of Gameness." Keynote, Level Up, Utrecht; in *Level Up: Digital Games Research Conference Proceedings*, 30–45. Author self-archive opened. `VERIFIED`.

> "1) **Fixed rules**: Games are rule-based. 2) **Variable, quantifiable outcome**: Games have variable, quantifiable outcomes. 3) **Value assigned to possible outcomes**: That the different potential outcomes of the game are assigned different values, some being positive, some being negative. 4) **Player effort**: That the player invests effort in order to influence the outcome. (I.e. games are challenging.) 5) **Player attached to outcome**: That the players are attached to the outcomes of the game in the sense that a player will be the winner and 'happy' if a positive outcome happens, and loser and 'unhappy' if a negative outcome happens. 6) **Negotiable consequences**: The same game [set of rules] can be played with or without real-life consequences."

Caveat: quoted from the 2003 keynote, **not** from *Half-Real* (MIT Press, 2005), which was not opened.

**Salen & Zimmerman's three schemas.** *Rules of Play* (MIT Press, 2004), publisher excerpt Unit 1 "Core Concepts / The Magic Circle", opened. `VERIFIED`.

> "the answer to the question of whether games are closed or open systems depends on which schema is used to understand them: whether games are framed as RULES, as PLAY or as CULTURE."

- **RULES**: "closed systems… systems of rules prior to the actual involvement of players."
- **PLAY**: "can be either closed systems or open systems."
- **CULTURE**: "extremely open systems… the focus is on the way that the game exchanges meaning with culture at large."

Caveat: their one-line game definition ("A game is a system in which players engage in an artificial conflict…") is **not** in the excerpt — it exists only via Juul's quotation of p.96. Do not cite it as opened.

## L2 — The design-side mapping (the closest thing to a general formula)

**MDA.** Hunicke, LeBlanc & Zubek (2004). Opened as PDF. `VERIFIED`.

> Mechanics: "Mechanics describes the particular components of the game, at the level of data representation and algorithms."
> Dynamics: "Dynamics describes the run-time behavior of the mechanics acting on player inputs and each others' outputs over time."
> Aesthetics: "Aesthetics describes the desirable emotional responses evoked in the player, when she interacts with the game system."

**The mapping, in the paper's own words — this is the general form:**

> "From the designer's perspective, the mechanics give rise to dynamic system behavior, which in turn leads to particular aesthetic experiences. From the player's perspective, aesthetics set the tone, which is born out in observable dynamics and eventually, operable mechanics."

So the design direction is `Mechanics → Dynamics → Aesthetics`, and the player direction is the reverse. Any decomposition must run in the design direction and be *validated* in the player direction.

**The aesthetics taxonomy** (printed with the lead-in "This includes but is not limited to the taxonomy listed here"):

| # | Aesthetic | As printed |
|---|---|---|
| 1 | Sensation | Game as sense-pleasure |
| 2 | Fantasy | Game as make-believe |
| 3 | Narrative | Game as drama |
| 4 | Challenge | Game as obstacle course |
| 5 | Fellowship | Game as social framework |
| 6 | Discovery | Game as uncharted territory |
| 7 | Expression | Game as self-discovery |
| 8 | Submission | Game as pastime |

**Two corrections to how MDA is normally used.** It is an **open list**, not a closed eight. And the paper contains **no equation** — its only maths is an illustrative 2d6 distribution for Monopoly.

## L3 — What a *mechanic* is, precisely enough to code

**Sicart, M. (2008). "Defining Game Mechanics." *Game Studies* 8(2). Opened as full HTML. `VERIFIED`.**

> "game mechanics are methods invoked by agents, designed for interaction with the game state."

> "Implicit in this definition is an ontological difference between rules and mechanics. Game mechanics are concerned with the actual interaction with the game state, while rules provide the possibility space where that interaction is possible… rules are modeled after agency, while mechanics are modeled for agency."

Sub-definitions, verbatim: **core mechanics** = "the game mechanics (repeatedly) used by agents to achieve a systemically rewarded end-game state"; **compound mechanic** = "a set of related game mechanics that function together within one delimited agent interaction mode."

**Why this layer matters most for decomposition:** it is a *programmable* definition. A mechanic is a **method** invoked by an **agent** on a **state**. That maps one-to-one onto a class with methods and a state object — which is exactly the "variables/parameters/roles/classes" language.

**One correction I must record.** I earlier wrote that Sicart says mechanics are "only meaningful within an ontology of the game". He does not. He asserts an *ontological difference between rules and mechanics*, places himself in the ontology-of-games tradition (citing Juul 2005), and leaves that distinction explicitly unresolved: *"Perhaps the most significant is the ontological distinction between rules and mechanics."*

## L4 — The economy formalism (the one with executed syntax)

**Adams, E., & Dormans, J. (2012). *Game Mechanics: Advanced Game Design*. New Riders. ISBN 978-0-321-82027-3.** Opened via the publisher's own sample chapters (Ch.4 "Internal Economy" pp. 59–78; Ch.5 "Machinations" pp. 79–96) plus Dormans' 2012 University of Amsterdam PhD thesis. `VERIFIED`.

> "Economies commonly include four functions that affect resources and move them around. These are mechanics called **sources, drains, converters, and traders**."

- **Sources**: "mechanics that create new resources out of nothing."
- **Drains**: "They take resources out of the game, reducing the amount stored in an entity and removing them permanently."
- **Converters**: "Converters turn resources of one kind into another."
- **Traders**: "mechanics that move a resource from one entity to another, and another resource back in the opposite direction, according to an exchange rule."

> "Resources refer to any concept that can be measured numerically." / "Specific quantities of a resource are stored in entities."

**The formalism is executable, not merely descriptive** — verbatim:

> "The syntax of the Machinations language is formal enough to be interpreted and executed on a computer; it is close to a visual programming language designed to represent game mechanics."

> "Resource connections determine how resources move between elements, and **state connections** determine how the current distribution of resources modifies other elements in the diagram."

Node/connection taxonomy, confirmed against the current tool documentation (`www-content.machinations.io/docs/framework-basics/`), verbatim: six basic nodes — **Sources, Pools, Drains, Converters, Traders, Gates** — and two connection types — **Resource Connections, State Connections**. Activation modes: passive, interactive, automatic, starting action.

**The formal condition for feedback**, from Dormans' thesis ch.4, verbatim:

> "for feedback to exist, a close circuit of connections is required that consists of at least one state connection that is not an activator."

**Correction.** I asked my researcher for an "open loop / closed loop" typology. It is **not verified** — the terms appear in neither sample chapter nor the thesis. What *is* verified is the positive/negative distinction and the formal circuit condition above.

## L5 — Pattern schema (the decomposition template)

**Björk, S., Lundgren, S., & Holopainen, J. (2003). "Game Design Patterns." *Level Up* (DiGRA 2003), pp. 180–189.** Opened. `VERIFIED`.

Template fields, verbatim headings: **Name · Description · Consequences · Using the Pattern · Relations.**

> "Relations — Here the relations between different game design patterns are stated. These are basically three forms of relationship: patterns that are superior… subpatterns that can be used to implement the given pattern…, and conflicting patterns."

**The component framework**, verbatim — this is a real structural decomposition:

> "the structural framework consists of game instance, game session and play session… components… belong to one of three different categories: **bounding, temporal and objective**. The bounding category consisting of **goals, rules, and game modes**… The temporal category consists of **actions, events, end conditions, evaluation functions and closures**… The objective category consists of **players, interfaces, and game elements**."

Caveat: quoted from the 2003 DiGRA paper, **not** from *Patterns in Game Design* (2005), which is not open access. The authors' own pattern wiki (`virt10.itu.chalmers.se`) returned HTTP 500 on every attempt.

## L6 — The quantitative layer (real equations)

This is where actual mathematics exists, and all of it is **domain-specific**.

### L6a. Difficulty adjustment as a control problem

**Hunicke, R., & Chapman, V. (2004). "AI for Dynamic Difficulty Adjustment in Games." AAAI Workshop WS-04-04.** Opened. `VERIFIED`.

The Hamlet DDA system, as printed:

```
x(t) = Σ_{i=1..t} x(i)
μ_d  = E(x(t)) = Σ E(x(i)) = μ_x · t
σ²_d = V(x(t)) = Σ σ²_{x(i)} = σ²_x · t
p(x) = (1/(σ√(2π))) · e^{−(x−μ)²/2σ²}
P_s  = P(x(t) > z) = 1 − F(z)
```

**Serra, C. B., & de Classe, T. M. (2025). SBGames.** Opened. `VERIFIED`. PID control applied to DDA:

```
u(t) = K_p·e(t) + K_i·∫₀ᵗ e(τ)dτ + K_d·de(t)/dt
```

with `e(t)` the error between desired and current value of the controlled variable (score, enemy speed, spawn rate).

### L6b. Difficulty parameterised

**Corrêa, S. M., & Santos, P. R. (2022). *IEEE Latin America Transactions* 20(9).** Opened. `VERIFIED`. Their DCGM, as printed:

```
Dificuldade = (Velocidade × 3) + (Alternância entre mestres × 2) + (Física × 1)
            + (Nome do Objeto × 0.5) + (Posição × 0.5) + (Lateralidade × 1)
            + (Partes do Corpo × 0.5) + (Tempo de Resposta × 1.5)

E(Nível) = {(β₀ + βᵢ) + (γ₀ + γᵢ) × Dificuldade × ln(Performance × 100)}

fitted:  E(Nível) = (−8.385 + βᵢ) + (0.143 + γᵢ) × Dificuldade × ln(Performance × 100)
```

**This is the single most directly useful equation found for step 3.** It is a *weighted parameter sum*: a difficulty score built from named, weighted designer-set parameters, then mapped to a per-level prediction through a fitted function. That is a real, published template for turning mechanics into parameters with influence weights.

### L6c. Balance as constrained optimisation

**Hernandez, D., et al. (2020). "Metagame Autobalancing for Competitive Multiplayer Games." IEEE CoG.** Opened. `VERIFIED`.

```
graph distance:  (Σ_{i,j} |g¹_ij − g²_ij|) / n    and    (Σ_{i,j} (g¹_ij − g²_ij)²) / n
objective:       argmin_θ L(G_θ, G_t)
subject to:      θ_i^min ≤ θ_i ≤ θ_i^max   ∀ i ∈ {|θ|}
```

## L7 — The psychology layer (real coefficients)

**Ryan, R. M., Rigby, C. S., & Przybylski, A. (2006). *Motivation and Emotion* 30(4):344–360.** Full PDF opened from `selfdeterminationtheory.org`. `VERIFIED`. Study 4, Table 9, **n = 730**, hierarchical OLS. `*p<.05, **p<.01`:

| DV | F | R² | Competence β | **Autonomy β** | Relatedness β | Yee-ACH | Yee-Soc | Yee-IMM |
|---|---|---|---|---|---|---|---|---|
| **Enjoyment** | 97.37** | .45 | .24** | **.49**** | .12** | −.06 | −.07 | .01 |
| **Future play** | 10.91 | .10 | .14** | .15** | .12** | −.05 | .01 | −.14 |
| Hours per week | 15.06** | .11 | .09* | −.03 | .18** | .19** | −.02 | .02 |
| Mood | 32.06** | .21 | .12** | .36** | .03 | −.21** | .08 | −.08 |

Study 1 (n = 89), Table 2: Enjoyment ← Autonomy .49**, Competence .34**.

Notes that matter: **no SEM anywhere in the paper — all models are OLS.** Study 4 is the only study with experienced players and the only one measuring relatedness.

**Nash's finding — reward scheduling.** Nagle, A., Wolf, P., Riener, R., & Novak, D. (2014). *International Journal of Serious Games* 1(4). Opened. `VERIFIED`. N = 210, 3×2 design:

- reward **sub-mode** (player-centred vs preset vs opposite-preference) main effect on Enjoyment: **F(2,174) = 22.418, p < .0001, η²p = .205**; Performance η²p = .322; Duration η²p = .134; Rounds η²p = .110
- reward **schedule** (variable-ratio vs fixed-ratio) main effect: **NOT significant** — Enjoyment F = .651, p = .421, **η²p = .004**
- Enjoyment ~ duration r = .284, p < .0001; play-again χ²(2) = 15.606, p < .0001

**This is the most useful single coefficient set for monetisation-adjacent design, and it says something unfashionable: variable-ratio reinforcement did not outperform fixed.** What mattered was whether the reward matched the player's *preference*.

**Feedback/juice.** Kao, D. (2020). *Entertainment Computing* **34:100359**. Full text obtained. `VERIFIED`. N = 3018, four juiciness levels. Competence F(3,3014) = 4.73, p < .005, partial η² = .005; autonomy F = 4.04, p < .01, η² = .004; interest/enjoyment F = 5.87, p < .001, η² = .006; time played F = 5.83, p < .001, η² = .006.

**The effect sizes are tiny — partial η² between .003 and .01, under 1% of variance, at N = 3018.** "Juiciness matters" is directionally supported and small in magnitude.

**And its follow-up contradicts the simple story.** Kao, Ballou, Gerling, Breitsohl & Deterding (2024). CHI '24, DOI `10.1145/3613904.3642656`. Opened. Pre-registered, n = 1,699, SEMs. Verbatim:

> "Structural equation models show **curiosity** as the strongest enjoyment and only playtime predictor and support theorised competence pathways. **Success dependence enhanced all motives, while amplification unexpectedly reduced them**, possibly because the tested condition unintentionally impeded players' sense of agency."

> "Every point increase in curiosity was associated with a .75 (Model A)/.76 (Model B) increase in enjoyment."

Model fit RMSEA = .048 [.044, .052], SRMR = .038.

## L8 — The measurement instruments (how the layers get validated)

**GEQ.** IJsselsteijn, de Kort & Poels. Seven components: **Immersion, Flow, Competence, Positive and Negative Affect, Tension, Challenge.** `VERIFIED` via the TU/e record; Cronbach's α from the FUGA D5.1 deliverable (N = 32): Immersion .71, Competence .87, Negative affect .71, Flow .87, Tension .87, Positive affect .76, Challenge .83 — **but Challenge α = .53 at medium difficulty.** Caveat: the reliability tables print the immersion component as "Sensory and Imaginative Immersion". The 2013 report PDF itself returned 403.

**PXI.** **Correction: there is no Mekler among the authors.** The real list is **Vanden Abeele, V., Spiel, K., Nacke, L., Johnson, D., & Gerling, K. (2020).** *IJHCS* 135:102370. Opened. `VERIFIED`. Ten constructs × 3 items. Functional: **Ease of Control, Challenge, Progress Feedback, Goals and Rules, Audiovisual Appeal.** Psychosocial: **Meaning, Immersion, Mastery, Curiosity, Autonomy.** Combined N = 529: χ²/df 2.089, TLI .947, CFI .956, RMSEA .045.

**GameFlow.** Sweetser & Wyeth (2005), *ACM CIE* 3(3). Eight elements: **Concentration, Challenge, Player Skills, Control, Clear Goals, Feedback, Immersion, Social Interaction.** `VERIFIED-SECONDARY` (ACM returns 403; obtained via an Internet Archive capture of ACM's own full-text page plus course reproductions). **It has no betas and no regression with player experience as a DV.** Its "validation" is expert heuristic review — 12 stakeholders rating 1–5 (Concentration 4.0, Challenge 2.6, Player Skills 3.4, Control 4.0, Clear Goals 4.1, Feedback 3.8, Immersion 3.4, Social Interaction 4.1, Overall 3.7). **Treat GameFlow as a criteria checklist, not a model.**

---

# 3. The composition — the formula, as the evidence supports it

There is no one equation. There is a stack. Written as the pipeline a decomposition must follow:

```
LAYER                FORMALISM                        STATUS        CARRIES NUMBERS?
─────────────────────────────────────────────────────────────────────────────────────
L1  What a game is  Juul 6 features; Salen 3 schemas  VERIFIED      no  — definitional
L2  Design mapping  MDA  M → D → A  (+8 aesthetics)  VERIFIED      no  — mapping only
L3  The unit        Sicart: method(agent, state)     VERIFIED      no  — but programmable
L4  The economy     Machinations: S/P/D/V/X/G +      VERIFIED      yes — executable syntax
                    resource & state connections
L5  The template    Björk: Name/Description/         VERIFIED      no  — schema fields
                    Consequences/Using/Relations
                    + bounding/temporal/objective
L6  The quantities  DDA control; DCGM difficulty;    VERIFIED      YES — real equations
                    balance as optimisation
L7  The psychology  SDT betas; reward-schedule η²p;  VERIFIED      YES — real coefficients
                    juiciness η²
L8  The instruments GEQ; PXI; GameFlow               VERIFIED      partly (α, fit)
```

**The composition rule.** Read top-down for definition, bottom-up for measurement:

1. **L3 defines the unit.** Every mechanic is a `method(agent, state)`. This gives the decomposition its atoms and its code shape.
2. **L4 defines the relations.** Every atom is typed as one of six nodes; every edge is a resource or state connection; feedback exists iff a closed circuit contains ≥1 non-activator state connection. This is where "connections" and "loops" become provable rather than asserted.
3. **L6 supplies the parameter weights.** DCGM's weighted sum is the published template for "spectral influence index": a named parameter with an explicit coefficient, summed into a score, then mapped through a fitted function.
4. **L2 orders the whole thing.** Anything built must be justified as Mechanics → Dynamics → Aesthetics, and validated in reverse.
5. **L7 supplies the empirical anchor.** Needs → outcomes with coefficients. This is the only layer where a design change can be *predicted* with a number attached, and those numbers are small.
6. **L8 measures the result.**

**The general formula, therefore, stated honestly:**

```
DECOMPOSITION(m)  =  method(agent, state)                     [L3]
                     ⊕ node_type ∈ {S,P,D,V,X,G}              [L4]
                     ⊕ Σ (parameter_i × weight_i)             [L6b]
                     ⊕ edges ∈ {resource, state}              [L4]
                     ⊕ loops: closed ∧ ∃ non-activator        [L4]
                     ⊕ template{Name, Description,            [L5]
                                Consequences, Using, Relations}

VALIDATION(m)     =  Mechanics → Dynamics → Aesthetics        [L2]
                     ∧ needs_satisfaction → outcome           [L7]
                     ∧ instrumented by GEQ | PXI               [L8]
```

**This is a composition of verified formalisms, and I am labelling it as mine.** No source prints it. What each source prints is its own layer, quoted in §2.

---

# 4. What the science does NOT provide

Reported rather than papered over, because step 3 must mark these `OPEN`:

1. **No formula for "fun".** Stated by MDA itself.
2. **No general algebra of game design.** No published work formalises a game or a mechanic as an equation system. Every equation found is domain-specific (DDA control, difficulty parameterisation, metagame balance).
3. **No measured relation between challenge–skill balance and enjoyment that survives scrutiny.** Two verified studies **contradict each other**, and the contradiction is the finding:
   - Cutting, Deterding, Demediuk & Sephton (2023), *Royal Society Open Science* 10:220274. **Pre-registered**, N = 311, MCTS-driven difficulty manipulation. **Enjoyment F(2,308) = 1.29, p = 0.277, η²p = 0.008**; play-again χ²(2,311) = 3.40, p = 0.183. **No inverted-U.** `VERIFIED`
   - Brändle, Wu & Schulz (2025), *Scientific Reports* 15:34153. **7,994 levels, 376,341 votes.** Linear β = 0.09, z = 44.37; **quadratic β = −0.04, z = −22.98**, both p < .001 — an inverted U. Lab replication (n = 98): linear β = 0.07, z = 2.99; squared β = −0.03, z = −3.40. `VERIFIED`. **The authors themselves flag the tautology risk** — players may rate levels they enjoyed as "intermediate difficulty".
   **Conclusion: do not treat the inverted-U as settled, and do not build a difficulty curve on it.**
4. **No experimental study isolates a single feedback parameter.** Nothing verified manipulates screen-shake amplitude, hitstop frame count, flash duration or particle count as an independent variable with a measured outcome. §6 reconciles this with what DVOR-8 currently claims.
5. **No event-level affect model.** The verified fitted affect models are **session-window** models over physiological signals and explicitly exclude gameplay events: *"this paper only uses information from the physiological state of the player leaving out game play events and game metrics."* No formal model maps a discrete game event → an affective state.
6. **Przybylski, Rigby & Ryan (2010) contains no model.** Opened: **zero figures, no SEM, no path analysis, no original coefficients.** Its only numbers are a reprint of the 2006 regressions, labelled "(From Ryan et al., 2006)". **Citing it for path coefficients is unsupported.** (It is cited that way in `docs/constraints.md` §PS3 of this repository — see §6.)

---

# 5. The ARPU correction — my earlier claim was wrong, and here is the right object

I previously wrote: *"No verified revenue-per-user figure exists for an AR or location-based game."* **That was the wrong search.** ARPU is not a primitive; it is computed from components, and the components are published. This section replaces that claim.

## 5.1 The decompositions, as printed

**The IAP side — publicly filed, `VERIFIED`.** Huuuge Inc., *Consolidated Semi-Annual Report HY2021* (WSE-listed, IFRS), verbatim:

> "**Average Revenue per Daily Active User (ARPDAU):** … calculated by dividing gross revenue (i.e. before deduction of platform fees) for the period by the number of days in the period and then dividing by the average DAU for the period."

> "**Daily Average Revenue per Paying User (ARPPU):** … dividing gross revenue from in-app purchases… by the number of days in the period and then dividing by the average DPU for the period."

**The ad side — vendor-tier, `VERIFIED` as printed.** RevenueFlex, "ARPDAU Calculator & Benchmark Guide", verbatim:

> "**ARPDAU = (eCPM/1000) × fill rate × impressions per DAU**"

**The LTV form — platform whitepaper, `VERIFIED`.** Google Play Developer Communications, "Insights for evaluating lifetime value for game developers": *"2.1. Top down: **LTV = Lifetime x ARPU**"*, plus a retention regression printed as `y = a · x^b` and a bottoms-up form `Y = c · Ln(x) + b`.

**Honest limit, stated because it matters.** **No source prints ARPDAU as a single two-term sum (IAP term + ad term).** The two sides are published separately by different classes of source. Assembling them is a modelling step — mine, not a citation:

```
ARPDAU  =  [ (gross_IAP / days) / avg_DAU ]                     ← Huuuge, filed
         +  [ (eCPM/1000) × fill_rate × impressions_per_DAU ]   ← RevenueFlex, vendor
```

## 5.2 The component values that DO exist

| Component | Value | Source | Authority |
|---|---|---|---|
| Payer conversion (CR_MAU) | **1.46% → 1.92%** | Moreira, Ramos, Barros & Ramalho (2021), IEEE CoG | **peer-reviewed** |
| Reward schedule: preference-match η²p | **.205** (schedule itself ns, η²p = .004) | Nagle et al. (2014), IJSG | **peer-reviewed** |
| D1 retention, top 25% | 26.48–27.69% (iOS 31–33%, Android 25–27%) | GameAnalytics Benchmarks 2025 (11,600 games, 1.48B MAU, CY2024) | analytics-vendor |
| D7 retention, median | 3.42–3.94% (top 25%: 7–8%) | GameAnalytics 2025 | analytics-vendor |
| Session length, casual | 5–6 min (top 25%: 8–9 min) | GameAnalytics 2025 | analytics-vendor |
| Sessions/day | 3.75 (NA/Oceania) – 5.45 (Africa) | GameAnalytics 2025 | analytics-vendor |
| Rewarded video eCPM | Android ≈$2.95–3.20 · iOS ≈$4.10–4.25 | Appodeal eCPM Report 2025 | vendor network |
| Interstitial eCPM | Android ≈$1.65–1.75 · iOS ≈$2.05–2.45 | Appodeal 2025 | vendor network |
| ARPDAU observed | $1.4/$1.0 group; $2.0/$1.4 core | Huuuge HY2021 | **filed** (social-casino-weighted) |
| ARPPU observed | $39.5/$34.6 group | Huuuge HY2021 | **filed** |
| Web puzzle: play time / D1 / impressions per play | **21 min · 6.2% · 8.9** (4.2 rewarded + 4 midgame) | CrazyGames puzzle guide | platform's own data |
| Pokémon GO lifetime revenue per download | ≈**$11.25** global, ≈**$80** Japan (IAP-only) | Sensor Tower blog (800M+ DL, $9B+) | **analytics estimate** |

**The Pokémon GO computation is the answer to the original question, and it is permitted:** $9B ÷ 800M downloads ≈ $11.25 per download, IAP-only, with the source's own explicit exclusion of ad revenue and third-party Android stores. It is arithmetic on a verified figure — not a published metric, and it must be labelled as arithmetic.

**The web case, stated honestly.** **No web/HTML5 portal publishes eCPM or RPM.** Poki and CrazyGames publish revenue-share terms and metric definitions only. So a web-game ARPU cannot be fully computed from published web-specific rates — but CrazyGames *does* publish an impressions-per-play figure (8.9) and play time (21 min) for puzzle, which combined with any mobile eCPM gives a bounded estimate.

**And the canonical academic textbook does not help here.** Drachen, Seif El-Nasr & Canossa (2013) ch. 2, opened: it supplies the taxonomy and lists ARPU/DAU/churn as *example analyses*, with **no revenue formulas at all.** Anyone citing it as a formula source is wrong. Its more interesting contribution is a warning about this whole exercise, verbatim:

> "Gameplay metrics are the most important to evaluate game design and user experience, but are **furthest from the traditional perspective of the revenue chain** in game development, and hence are generally under-prioritized."

That is the measurement gap between L7 and L8 of the stack, stated by the field's own textbook.

---

# 6. Corrections this round makes to my own earlier work

| Where | What I wrote | Correction |
|---|---|---|
| `constraints.md` §PS3 | Cited *Przybylski, Rigby & Ryan (2010)* as a motivational model | The paper **has no model** — zero figures, no path coefficients. The coefficients are Ryan et al. (2006) Study 4. Re-attribute. |
| `constraints-checklist.md` §3.1 | Listed PXI among verified items with "Mekler" | **No Mekler among the authors.** Correct list: Vanden Abeele, Spiel, Nacke, Johnson & Gerling (2020). |
| `constraints.md` §PS5 / `docs/style.md` D2 | Swink's definition of game feel as "…polish **and feedback**" | Not supported. The one peer-reviewed reproduction omits "and feedback". Drop the phrase. |
| `monetisation.md` §9 item 1 | "No verified revenue-per-user figure exists for AR or location-based games" | **Wrong object.** ARPU is computed from components; §5 gives the decomposition, the components, and the $11.25/download arithmetic. |
| `monetisation.md` §9 item 6 | "a revenue-per-user figure for AR or location games" listed as a gap | Same correction. The gap is real only for *published* ARPU; the computed RPD is available. |
| This file, first draft | "10–20 ms hit pause … no primary source" | Still correct for **DVOR-8's specific numbers** — but §7 of this file now shows a real measured parameter family exists for the concept (hitlag, 8–15 frames for a 15% hit), so the folklore finding is narrower than I stated. |

---

# 7. The parameter folklore, narrowed

`constraints.md` D2 said the hit-pause and shake numbers have no primary source. That is still true **for DVOR-8's specific values**, but the parameter *family* is better documented than I implied:

| Parameter | Verified value | Who states it | Nature |
|---|---|---|---|
| Hitlag (hitstop) | **8–15 frames for a 15%-damage hit** (Melee → Ultimate); caps **20 frames** (Melee), **30** (Brawl+) | SmashWiki, derived from shipped game data | **measured from shipped games** |
| Hitlag formula | `⌊⌊(d×0.3846154+5)×h×e⌋×c⌋` (Brawl/Smash 4) | SmashWiki | game data |
| Hitstop scaling | ∝ damage; electric ×1.5; shield ×0.67; projectiles reduced | Sakurai, *Famitsu* vol. 490-1 | practitioner |
| Hitstop cap | *"I've implemented a cap on the maximum amount of time characters can be in freeze frames"* — **no value given** | Sakurai | practitioner |
| Flinch→hurt transition | **4 frames** | Sakurai | practitioner |
| Frame budget | 60 FPS ≈ **16 ms/frame**; `1000/FPS = ms per frame` | Nystrom, *Game Programming Patterns* | textbook |
| Gravity (in games) | Earth **9.807** vs Super Meat Boy **41** vs SMB **91.28 m/s²** | Fasterholdt et al., via Pichlmair & Johansen (2022) IEEE TOG | derived from games |
| Button caching | Mario **1–2 frames**; Braid **0.23 s** | via Pichlmair & Johansen | derived from games |
| **Screen shake amplitude / duration / decay** | **NONE FOUND** | — | — |

**So the honest position is sharper than before:** hitstop has real shipped-game data and a published formula family. **Screen shake has none** — the amplitude/duration/decay vocabulary lives in talks and blogs, and I could not verify Eiserloh's trauma model from any openable primary source. DVOR-8's `SHAKE_MAX = 7` remains a `CHOICE`, and now with better grounds for saying so.

---

# 8. Open questions that block step 3

Per the instruction to ask rather than assume, these are the gaps that a decomposition cannot fill itself. Each is `OPEN` in the stack above, and each changes what step 3 can contain.

1. **Which layer is authoritative for DVOR-8?** The stack has three candidate spines — Sicart (method/agent/state, most codeable), Machinations (resources and nodes, most provable), DCGM (weighted parameters, most numeric). They give different atoms. **I will not pick on the creator's behalf.**
2. **Do the parameters want published weights or fitted ones?** DCGM publishes designer-set weights (×3, ×2, ×1…). L7 publishes fitted betas (autonomy .49). The first is a design tool, the second is evidence. They do not mix in one formula.
3. **What counts as the "spectral influence index"?** Now that L6b exists as a published template, is the index (a) a DCGM-style designer weight, (b) a fitted β from L7, or (c) the ±band/tolerance from the Master Prompt's εᵢ? **These are three different objects and produce three different documents.**
4. **Which of the eight MDA aesthetics does DVOR-8 claim?** MDA's list is open, and the paper requires you to name your aesthetics before deriving mechanics. DVOR-8's concept currently names none.

**What I have not done, per instruction:** no project decomposition, no formula for DVOR-8, no parameter assignment. The verified layer is now in place; step 3 waits on the answers above.
