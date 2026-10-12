# DVOR-8 — monetisation from proven cases, not invented hooks

Built 2026-10-12 against repository state `ac1bdd6`. This answers a different question from
[constraints.md](constraints.md): not *what keeps a player*, but **who has actually paid money for a game like
this, and for what**. Retention-through-destruction is deliberately not the subject.

The rule this file is held to, set by the creator:

> "NOT MADE UP, NOT ASSUMED structure, but defined, proven by use cases that made the game become a product
> people or advertisers were actually willing to pay for."

Every case below was verified by opening a source and quoting it. Where a figure is a third-party estimate or
a developer's self-report rather than a disclosed number, it **says so in the row**. Cases that failed
verification are in §7, not quietly dropped.

**Status key:** `VERIFIED` (opened it, words are there) · `VERIFIED-SECONDARY` (real, read in a
secondary/trade summary) · `ESTIMATE` (analytics-firm or press arithmetic, not disclosed) ·
`SELF-REPORTED` (the developer said it; not audited) · `UNVERIFIED` (justifies nothing).

---

# 1. The single most important distinction

Every case answers one question first: **who pays?**

| Payer | What they are buying | Cases where this is proven |
|---|---|---|
| **Advertisers / ad networks** | attention, placed around or in the game | Poki, CrazyGames, Flappy Bird, Crossy Road (ads), Doodle Jump (free SKU) |
| **Brands directly** | a message delivered *as* the game, or a sponsored real place | Advergame (Burger King, Chex Quest), Pokémon GO sponsored locations, Ingress portals, Snapchat Sponsored Lenses |
| **Players** | convenience, status, utility, or the game itself | Vampire Survivors, Doodle Jump (paid SKU), Geocaching Premium, Roblox, Pokémon GO IAP |
| **Licensees** | the IP on physical goods | Rovio, Pokémon Co., Terraria/Stardew merchandise |
| **A platform or acquirer** | the game, or the audience, as an asset | Wordle → NYT; Dumb Ways to Die IP → PlaySide; Niantic games → Scopely |
| **B2B buyers** | the technology | Unity Create Solutions; 8th Wall (historically) |

**The finding this document rests on:** across every case that worked at scale, **the paying party is almost
never the person having the experience.** The player plays free; advertisers, brands, licensees or an acquirer
pay. Player money does appear — but it attaches to *utility and status*, never to winning.

---

# 2. The verified case list

Eighteen cases. Payer is the column that matters.

| # | Case | Mechanism | Figure | Payer | Status |
|---|---|---|---|---|---|
| **C1** | **Poki** (web portal) | ad revenue share; brand deals; flat licence for non-exclusive | 100% of revenue for direct users; **50/50** for Poki-acquired users; *"one-time flat license fee"* | advertisers/brands | `VERIFIED` first-party |
| **C2** | **Poki content policy** | the gate | *"Cheating, gambling, alcohol, tobacco, or other offensive material"* out of scope | — | `VERIFIED` first-party |
| **C3** | **CrazyGames** | ad revenue share; IAP *"Invite Only"* | ≤50 MB initial load; *"Adhere to PEGI12"*; 2-stage launch | advertisers | `VERIFIED` first-party |
| **C4** | **GameDistribution** | ad revenue share | *"revenue share of 33%… of the Net Revenue"* | advertisers | `VERIFIED` first-party terms |
| **C5** | **Advergaming** | brand commissions the game | *"fully-funded by the advertiser, built on a work-for-hire basis"* | **brands** | `VERIFIED` industry white paper |
| **C6** | **Burger King Xbox** | 3 advergames sold with a value meal | *"over two million units in just four weeks"*; *"a multi-million dollar budget"* | brands | `VERIFIED-SECONDARY` |
| **C7** | **Chex Quest** | Doom reskin as a cereal-box prize | *"first PC game to ever be released via cereal box prize CD"* | brand | `VERIFIED` trade press |
| **C8** | **Dumb Ways to Die** | safety campaign game; IP later sold | *"$300,000"* cost, *"at least $50 million"* media value; IP sold for *"AU$2.25 million in 2021"* | brand, then B2B buyer | `VERIFIED-SECONDARY` (agency claims) |
| **C9** | **Flappy Bird** | free app, ads only, **no IAP ever** | *"earning on average $50,000 a day from in-app ads"* | advertisers | `SELF-REPORTED` |
| **C10** | **Crossy Road** | **opt-in rewarded video** + coin IAP; **no remove-ads purchase** | *"$1 million from in-game video ads"* in 20 days; *"more than $3 million"* by GDC 2015 | advertisers **and** players | `VERIFIED` (devs); `$10M` = `ESTIMATE`, IAP-only |
| **C11** | **Vampire Survivors** | PC = one-off paid; mobile = free with optional rewarded ads | Steam `"$4.99"`; *"sold more than one million copies"* in 2–3 months | players + advertisers | `VERIFIED`; sales `SELF-REPORTED` |
| **C12** | **Doodle Jump** | paid app **plus** separate ad-supported free SKU | *"more than 10 million copies… at 99 cents"*; *"more than $7 million"* | players + advertisers | `VERIFIED`; $7M = press arithmetic |
| **C13** | **Wordle** | free, **no ads, no IAP**; value by acquisition | *"acquired for an undisclosed price in the low-seven figures"* | **acquirer** | `VERIFIED` (NYT statement) |
| **C14** | **2048** | free, open source, **no monetisation** | *"played by more than 23 million people"* | nobody — value captured by clones | `VERIFIED` (author's blog) |
| **C15** | **Pokémon GO sponsored locations** | brands pay per visit for a real place to become a Gym/PokéStop | *"partners spending less than $.50 / daily unique visit"* | **brands** | `VERIFIED` (company-disclosed rate); revenue totals `ESTIMATE` |
| **C16** | **Snapchat Sponsored Lenses** | brands pay for branded AR | *"Advertising revenue $ 5,186,077 [thousand]"* FY2025 — **no separate AR line** | **brands** | `VERIFIED` (SEC 10-K) |
| **C17** | **Roblox** | players pay; platform pays creators a share | *"Developer exchange fees 1,503,106 [thousand]"* of *"$ 4,890,551"* = **31%** | **players** (creators are payees) | `VERIFIED` (SEC 10-K) |
| **C18** | **Geocaching Premium** | free location game + optional membership | *"One year of Premium for $39.99… or monthly for $6.99"* | players | `VERIFIED` (vendor pricing) |

**Cases that are also negative results, and are as important as the positives:**

| # | Case | What it proves | Status |
|---|---|---|---|
| **N1** | **Super Mario Maker 2 / LittleBigPlanet 3 / Dreams** | sharing player-created levels is **not** separately monetised in any of them — it is a feature of a paid game, funded by sales or a subscription | `VERIFIED` |
| **N2** | **No-ads purchase revenue share** | **no source found** stating what share of casual revenue no-ads buys represent. Treat as unavailable | `UNVERIFIED` |
| **N3** | **8th Wall pricing** | the paid WebAR tiers ($9/$49/$99 per month) existed historically but the platform is now *"open source… free for everyone"* | `VERIFIED` that it is dead as a pricing case |

---

# 3. The five cases that matter most to DVOR-8

## 3.1 Poki — the payer is an advertiser, and the structure is published

`https://developers.poki.com/guide/working-with-poki` and `/guide/revenue-deal-types`. `VERIFIED`, first-party.

> "If a user comes to your game directly, through bookmarks, search, social media or through your own
> community, you get 100% of the revenue for that user. If a user comes to your game through Poki.com, or
> through a marketing effort from Poki, then Poki splits the revenue 50/50 with you."

> "**Monetization through top-tier ad partners and brand deals**"

> "we can offer a one-time flat license fee instead, with no revenue share"

And the mechanism, from `/guide/how-monetization-works`:

> "Games on Poki earn through in-game ads, served entirely by the Poki SDK. **There are no in-app purchases**
> and no third-party ad systems to integrate."

**Why it is the anchor case:** a documented market where the payer is an advertiser, the product is a free
HTML5 game, and the payment structure is published. **No invention is required to place DVOR-8 in it.**

## 3.2 Poki's content policy — and the wall DVOR-8 hits

`/guide/content-player-safety`. `VERIFIED`, first-party.

> "Poki is a playground for everyone, including kids."
>
> "What's out of scope: … **Cheating, gambling, alcohol, tobacco, or other offensive material**"
>
> "**Adult themes and misused IP are rejected immediately.**"
>
> "both Poki and its developers depend on our ad partners, and every game needs to be something an advertiser
> is comfortable placing their brand next to"

**This is decisive, and the reason given is the mechanism itself.** Advertisers pay for brand safety. DVOR-8
ships `src/drink.js` — a bottle the player drinks from, four swigs, with a state variable named `drunk` — and
a mode named for cannabis. That is not a rejection *risk*; it is rejection. It closes the entire C1 revenue
route, and with it §4.1.

## 3.3 Advergaming — the only model where the game earns before it has an audience

*IGDA Casual Games White Paper* (2008), 214 pp., opened as PDF.
`https://ifip-tc14.org/wp-content/uploads/2017/10/IGDACasualGames-WhitePaper-2008.pdf`. `VERIFIED`.

> "Advergames can best be defined as a game where the game itself is used to deliver an advertiser's message
> (as opposed to ad-supported content, where ads are simply placed around a game). These games are typically
> **fully-funded by the advertiser, built on a work-for-hire basis by a developer**, and delivered to the
> consumer for free."

> "CPMs for ads around games tend to be higher than other forms of online media – specifically for
> video-interstitials strategically placed before games or in-between levels – because advertisers are able
> to reach a more targeted and attentive audience."

> "Current CPM rates for Display advertising range from $0.50 to $20.00 or more. Generally, the ad network
> retains 20% to 40% of the total ad revenue."

**Dated caveat: those CPM values are 2008.** The *structure* is quotable with the date; the *numbers* are not
current and must never be presented as current rates.

**Burger King**, same paper: *"three original Xbox advergames, selling over 3 million units in their stores."*
Blitz Games' CEO, on the record: *"Burger King is spending a multi-million dollar budget on the production of
the games alone, and that excludes all the marketing and TV advertising"* and *"they're writing off the cost of
development as part of their marketing."* `VERIFIED-SECONDARY`; *"multi-million"* is the developer's
characterisation, not an audited figure.

**The strategic point:** in this model the advertiser is the customer. **The game does not need an audience
before it earns.** That is the difference between starving for two years and being paid to build.

## 3.4 Snapchat Sponsored Lenses — brands pay for AR, and never enough to be broken out

Snap Inc. FY2025 Form 10-K, `https://www.sec.gov/Archives/edgar/data/1564408/000156440826000013/snap-20251231.htm`.
`VERIFIED`, audited.

> "**AR Ads include Sponsored Lenses**, which allow users to interact with an advertiser's brand by enabling
> branded augmented reality experiences."

> "Advertising revenue $ 5,186,077 [thousand] … Total revenue $ 5,931,447"

**Two things follow.** First, brands demonstrably pay for branded AR over the real world — this is the single
strongest proof that "AR gamification of the real world" is a thing advertisers buy. Second, **Snap has no
AR-specific revenue line**; AR sits inside one advertising number. So the market cannot be sized from filings.
Historical prices (*"around $450,000 per sponsored lens"*, *"up to $750,000"* on peak days) are FT-reported for
2015–16 via The Verge and were never Snap-confirmed. **Do not cite lens prices as current.**

## 3.5 Pokémon GO sponsored locations — brands pay for a *place*

`https://techcrunch.com/2017/05/31/pokemon-go-sponsorship-price/`. `VERIFIED`, with a correction.

> "The company says 'Niantic's cost per visit (CPV) model visit has **partners spending less than $.50 / daily
> unique visit** to sponsored locations.'"

**This is the one company-disclosed number in the whole sponsored-location literature, and it is a *rate*, not
revenue.** The widely circulating *"$0.15 per visit"* was **retracted by Niantic** as possibly a translation
error. The $75M/$250M totals in the same article are the journalist's arithmetic. McDonald's Japan is
verified: *"3000 sponsored Pokémon Gyms in the form of McDonald's' restaurants"* (Eurogamer, 2016), still
running in 2026.

Ingress, same mechanism, sponsors named: Duane Reade, Jamba Juice, Zipcar, Lawson, Tokyo Mitsubishi Bank. AXA's
own release: *"More than 20,000 retail agencies around the world will become AXA branded in-game 'Portals'"* —
**and no fee is stated anywhere.**

---

# 4. Decomposition — the engagement formula the cases define

The creator asked for the cases to be decomposed "into appropriate logic user engagement formula, according to
the existing". This is that decomposition, built from §2.

## 4.1 What each case actually runs on

| Case | The loop that produces the paying moment |
|---|---|
| Poki / CrazyGames | session → **natural stop** → midroll; or player wants a benefit → **chooses** rewarded video. CrazyGames adds a gate: prove engagement metrics in Basic Launch *before* monetisation unlocks. |
| Poki brand deals | the portal sells the audience to brands; the developer never touches the transaction. |
| Advergame | brand commissions → game free to consumer → consumer is the brand's audience. **The player never pays and never has to return.** |
| Sponsored location (GO / Ingress) | player physically visits a real place to play → the business at that place pays per visit. **The game monetises a location, not a session.** |
| Sponsored Lenses | player points a camera at themselves or the world → brand pays per impression or flat fee. |
| Flappy Bird | free, ads only, no IAP to buy. Attention only. |
| Crossy Road | **opt-in** rewarded video for in-game currency, plus coin IAP. The player can *skip entirely*. |
| Vampire Survivors | PC: pay once. Mobile: free with *"a couple of 'watch ads' buttons"* and *"minimal… never interrupt your game, always be optional"*. |
| Doodle Jump | **two SKUs**: pay for the game, or play free with ads. |
| Geocaching | free play, optional paid membership buying **utility** (offline, premium caches, stats). |
| Roblox | players buy currency to access creators' work; platform pays creators 31%. |
| Wordle / 2048 | nobody pays during play. Value is realised (or not) at the asset level. |

## 4.2 The formula

A small web game becomes a product somebody pays for when these hold **together**:

```
PAID  ⟺  NATURAL_STOP  ∧  OPTIONAL_REWARD  ∧  SINGLE_CURRENCY  ∧  BRAND_SAFE  ∧  (ARTIFACT ∨ AUDIENCE)
```

| Term | Meaning | Proven by |
|---|---|---|
| `NATURAL_STOP` | the game contains real breaks a platform can place an ad in | Poki: *"the more natural stops you signal, the better the system can pick its moments"*; midrolls at *"between levels, after a game over, when leaving a pause"* |
| `OPTIONAL_REWARD` | a rewarded ad is the player's choice, never blocking | Poki: *"always an optional extra and never blocks core gameplay"*; Crossy Road: *"choose to watch one… or skip them entirely"*; Vampire Survivors: *"always be optional and in your control"* |
| `SINGLE_CURRENCY` | one understandable currency, no secondaries | Poki: *"Simple economies outperform complex ones… no secondary currencies (web players dislike them)"* |
| `BRAND_SAFE` | an advertiser will sit beside it | Poki: *"something an advertiser is comfortable placing their brand next to"*; CrazyGames: *"Adhere to PEGI12"* |
| `ARTIFACT ∨ AUDIENCE` | you have either something a brand can commission, **or** an audience a portal can sell | advergame: *"fully-funded by the advertiser"*; Poki: *"one-time flat license fee"*; portals pay only once audience exists |

## 4.3 The two topologies, and why the difference is the whole strategy

**Topology A — attention is sold** (advertiser → platform → developer).
Developer's job: produce `NATURAL_STOP` + `BRAND_SAFE`. Never sells anything to a player. **Requires an
audience, so it pays late.** Poki, CrazyGames, GameDistribution, Flappy Bird, Doodle Jump's free SKU.

**Topology B — the artifact is sold** (brand/buyer → developer directly).
Developer's job: produce something coherent enough to be commissioned or licensed. **Does not require an
audience, so it pays early.** Advergaming, Poki's flat licence, the Dumb Ways to Die IP sale, Wordle's
acquisition.

**And a third thing the evidence forced, which was not obvious at the start:**

> **Brand money attaches to PLACE or to the CAMERA. Player money attaches to UTILITY/STATUS or to ACCESS TO
> OTHERS' CREATIONS. No verified case shows advertisers paying for player-created content.**

That is the single most useful sentence in this document for DVOR-8, because DVOR-8's distinctive content *is*
player-created: the player's own photograph. See §5.4.

## 4.4 What the formula forbids — all sourced, none editorial

- **No ad mid-action.** Poki places midrolls at *"natural breaks"* and its system *"decides when a player is
  actually ready to see one"*. A game with no breaks cannot take midrolls at all.
- **No rewarded ad gating progress.** *"never blocks core gameplay"* (Poki); *"never interrupt your game"*
  (poncle).
- **No second currency.** Stated outright by Poki.
- **No player-pays mechanic on the self-serve route.** Poki: *"There are no in-app purchases."* CrazyGames:
  IAP is *"Invite Only"*.
- **No ad-pressure UI.** CrazyGames: *"Buttons are not sized to encourage ads or other behaviors. Buttons do
  not have delays to confuse users or encourage other behaviors."*

---

# 5. Applied to DVOR-8 — where each element goes

Nothing below is invented. Each slot names the case it is copied from.

## 5.1 What DVOR-8 already satisfies

| Formula term | DVOR-8 state | Verdict |
|---|---|---|
| `NATURAL_STOP` | yard end (`left(w) === 0`), street yard-change (`extend()`), `«ЕЩЁ РАЗ»` | **passes** |
| `OPTIONAL_REWARD` | not yet implemented — this is the build task | to build |
| `SINGLE_CURRENCY` | the album's single `progress()` count, no secondary currency anywhere | **passes** |
| `BRAND_SAFE` | fails: the drinking mechanic, and modes named for cannabis and alcohol | **fails** |
| `ARTIFACT ∨ AUDIENCE` | no audience; but the artifact is unusual — see §5.3 | open |

Plus two constraints already met, which matter mechanically:

- **Poki's emoji allowance.** *"Chat systems… games can't include them. Want players to express themselves to
  each other? An emoji system works well."* DVOR-8's share line is emoji-only (`SIGN` in `src/album.js`,
  `SHARE_MAX = 14`). **It already complies.**
- **CrazyGames' size ceiling.** *"Initial download size ≤ 50MB"*. `vendor/mediapipe/` measures **20 MB**;
  whole tree **33 MB**. **Passes** — but 20 MB is the heaviest thing in the build and the first thing to
  regress if the model is upgraded. Worth a test that fails if `vendor/` exceeds a stated ceiling.

## 5.2 Topology A — element by element

| Slot | Where exactly | Copied from | Constraint |
|---|---|---|---|
| **A1** midroll at the yard's end | the existing `done` transition, before `«ЕЩЁ РАЗ»` | Poki midrolls *"after a game over"* | **must not sit between the player and `«ЕЩЁ РАЗ»`** — see §6 |
| **A2** midroll arriving at a new yard | `street.js` `extend()` | Poki midrolls *"between levels"* | never mid-walk, never mid-throw |
| **A3** rewarded video, one optional benefit | on an explicit player action | Poki's *"a helping hand"* category: *"revives, level skips, hints, stat boost, speed-ups, or a special ability"*. Natural fit here: **re-scanning a photograph that found too few targets** | natural option primary — *"Overselling the rewarded button or delaying the alternative erodes trust"*. Must not alter what can be wrecked |
| **A4** Gamebar display ads | portrait layout | Poki: *"portrait mode also become eligible for Gamebar Display ads… earns extra without any work from you"* | none |
| **A5** no-ads purchase | own domain only | Solitaire's model; **but** Poki has no IAP at all and CrazyGames' is invite-only | out of reach until DVOR-8 has its own distribution |

**On A5, be honest about the evidence.** Solitaire verifies that the *model* exists. But **no source was found
for what share of casual revenue no-ads purchases represent** (N2), and the one behavioural datum available is
discouraging: *"Only 1.83% of mobile gamers spend money on in-app purchases"*, and willingness to pay to remove
ads falls from *"7%"* in week one to *"0.9%"* by week three. **Treat A5 as unproven at this scale.**

**And a correction to a common assumption.** Crossy Road — the most-cited small game of this era — **had no
remove-ads purchase at all.** Its model was opt-in rewarded video plus character IAP. The "free game + pay to
remove ads" pattern is much less proven than it looks; the proven pattern is **rewarded video**.

Also worth knowing: **rewarded video is the dominant ad format for exactly this kind of game** — TopOn's H1
2025 report has it *"contributing 39.35% of casual games revenue"*, though the same PDF elsewhere contradicts
itself and p.13 ranks *"Interstitial > Rewarded Video"* on total revenue share. Cite the direction, not a
precise share.

## 5.3 Topology B — the slot DVOR-8 is built for

**Slot B1 — a commissioned yard.**
A brand buys a **place**, not an interstitial: its own courtyard or forecourt, photographed, turned into a
DVOR-8 level whose targets are that place's real objects, with the palette taken from that place's own
photograph — which `palette.js` **already does per photograph** (*"A street of several photographs keeps every
photograph's own colours"*).

*Copied from:* C5 verbatim — *"the game itself is used to deliver an advertiser's message… fully-funded by the
advertiser."* Reinforced by C15 and C16: brands pay for a **real place** (Pokémon GO Gyms, Ingress portals) and
for **branded AR over the real world** (Snap Lenses).

*Why DVOR-8 and not another small web game:* **its content is a specific physical location, and the brand can
own that location.** No other case in §2 has an artifact whose content is a place a brand could commission.

*Hard constraint from constraints.md:* **P2 requires the game to report what it could not name.** A
commissioned yard must still do this. A brand yard that pretended the detector saw everything would break the
game's own honesty rule — and the honesty is what makes the artifact interesting.

**Slot B2 — the one-time flat licence.**
*Copied from:* Poki's non-exclusive term — *"a one-time flat license fee instead, with no revenue share"*, for
games with *"a more niche or short-term fit"*. DVOR-8 is exactly that shape. It is the smaller cheque and the
one that arrives first.

**Slot B3 — the slice-detect pipeline as a component.**
`detect.js` + `objects.js` do something specific and hard: **on-device detection of small objects in a
photograph, by slicing, with nothing uploaded**, because `docs/style.md` D5 found that a car from a balcony
does not survive shrinking the whole photo. That is licensable to any "photograph becomes a level" product.

*Honest status:* the B2B *model* is verified (Unity Create Solutions: *"$614 million"* FY2024 — though it
**shrank 29%** YoY, so engine licensing is cyclical). But **the specific WebAR precedent died**: 8th Wall's
published tiers ($9/$49/$99 per month) existed and the platform is now *"open source… free for everyone"*
(N3). So B3 is a candidate, not a claim.

## 5.4 The finding that corrects the obvious plan — sharing does not monetise the way it seems

The creator asked about "sharing capability" as part of the monetisation. The cases are unusually clear here,
and they say something counter-intuitive.

**`N1`, verified:** Super Mario Maker 2, LittleBigPlanet 3 and Dreams all let players share levels — and **none
of them monetises the sharing.** Mario Maker 2 is a $59.99 game whose level upload is *gated behind a Nintendo
Switch Online subscription*; LBP3's "Play Create Share" is a feature of the paid game; Dreams went paid, then
into the PlayStation Plus catalogue, and **live support ended September 2023**.

**The only verified case where sharing is directly monetised is Roblox** (C17), and it works the opposite way
round from DVOR-8's intuition:

> "Developer exchange fees 1,503,106 [thousand]" of revenue "$ 4,890,551 [thousand]" — **creators received 31%**,
> up from 26% in 2024. Players pay; the platform keeps ~69% and pays creators a minority share.

**And the decisive sentence from the verification:** *"No case shows advertisers paying for player-created
content. Brand money attaches to place or the camera/lens; player money attaches to utility/status or access to
others' creations."*

**What this means for DVOR-8's "play my street" idea, stated plainly:**

| Who DVOR-8's shared content is | Who would pay, per the cases | Verdict |
|---|---|---|
| a player's own photograph of their own courtyard | **players** — access to others' creations (Roblox shape) | proven model, but needs scale, an account system and a payment rail the portals do not provide |
| **a brand's commissioned place** | **brands** — this is place, not player content | **this is the one that fits the evidence** |

**So the monetisable version of sharing is B1, not a creator economy.** A brand yard shared outward is "place",
which brands pay for. A player's yard shared outward is "player content", which — in every case that was
verified — advertisers do **not** pay for, and which only Roblox has shown players will pay to access.

---

# 6. The contradiction with the brief, stated plainly

`brief.md` Q7, in the creator's own words:

> "**No hook may exist to serve a business model.**"

Q8: waiting allowed; **loss and paid randomness are not.**

**This document does not overrule that, and does not need to.** They are compatible if stated precisely:

1. **Q7 forbids a mechanic whose purpose is revenue.** §5 places every element in a **pause, a choice, or a
   separate artifact** — never in the wrecking itself. The midroll sits where the game is already stopped. The
   rewarded ad is a player's arbitrary choice with the natural option primary. A commissioned yard is a
   *different* yard, not a worse one. **No term of the core loop changes in order to earn.**
2. **Q8 forbids loss and paid randomness.** §5 contains neither: no loot box, no energy timer, no gate on the
   core action, no purchase that improves what the player can wreck.
3. **But one thing must change, and it is the blocking one: the modes' names and the bottle.** They are not a
   hook serving a business model — they are a hook *blocking* every business model. §6.1.

## 6.1 The one term DVOR-8 fails, and what it costs

`BRAND_SAFE` fails, and it fails on the mechanism the platforms state out loud.

| Route | Status today | Why |
|---|---|---|
| Poki (A1–A4) | **closed** | *"alcohol… or other offensive material"* out of scope; *"Adult themes… rejected immediately"* |
| CrazyGames | **blocked at the gate** | requires *"Adhere to PEGI12"* |
| Brand commission (B1) | **hardest hit** | a brand is precisely the party least willing to sit beside a drinking mechanic |
| Own domain, no ads | open | but then Topology A does not exist |

**The modes' mechanics do not depend on their names.** `docs/feasibility.md` §4 problem 5 already says this;
`docs/concept.md` notes the modes are named *"at the creator's request, for adults"*. What makes each mode
different lives in `modes.js` — flight, scatter, splash, chain, combo, focus. **A rename changes no mechanic
and breaks no test**, because the tests assert behaviour: *"no two modes put the same thing in the hand"*,
*"every mode but sober changes BOTH the throw and the focus"*.

**Stated as a decision, not a suggestion:** either the four names and the bottle go, or every advertiser-paid
route in §5.2 and §5.3 closes at once. There is no third option in the verified sources.

**The honest counter-argument.** The drinking mechanic is one of the better pieces of design in the build:
`drink.js` makes how drunk the player gets *their own doing*, which is exactly the autonomy the SDT evidence
favours (`constraints.md` PS2, β = .49). Removing it removes a real mechanic. This is a genuine trade between
one mechanic and **every proven revenue route simultaneously** — not a formality.

## 6.2 The second constraint this creates

Placing a midroll at the yard's end means a player who has just cleared a yard waits before restarting.
`«ЕЩЁ РАЗ»` is currently instant, and `constraints.md` P6 and PS6 depend on restoration being **one action
away** — "no real danger" is only true if nothing is permanent and nothing is gated.

**Therefore: the ad must not sit between the player and `«ЕЩЁ РАЗ»`.** Place it after the restart is available,
or let the restart happen during it. Any placement that delays the clean yard breaks a constraint this project
already proved it needs.

---

# 7. What failed verification — do not use these

1. **"$0.15 per visit" for sponsored locations.** **Retracted by Niantic** as possibly a translation error. The
   disclosed figure is *"less than $.50 / daily unique visit"*.
2. **$75M / $250M sponsored-location revenue, and "$3M/day from McDonald's".** Journalist arithmetic on a rate,
   not disclosure. No Niantic, Scopely or Pokémon Company dollar total for sponsorship exists.
3. **Crossy Road's "remove ads" purchase.** **Not supported.** Its IAPs are characters only; Google Play lists
   "Contains ads"; a contemporary reviewer *wished* an ad-free option existed.
4. **Crossy Road's "$10M".** Sensor Tower `ESTIMATE`, **IAP-only, explicitly excluding ads** — so it
   understates the game rather than describing it. Do not use it as a total.
5. **8th Wall pricing.** Historical only. The live site says *"8th Wall is now open source… now free for
   everyone."*
6. **AR-specific revenue at Snap.** None exists in the filings; AR sits inside the single advertising line.
   The $450k–$750k/day lens prices are FT-reported for 2015–16 and never Snap-confirmed.
7. **"Rovio's licensing was the majority of revenue."** False at peak: licensing was **47%** of revenue in
   **2013** but only **17%** in **2017**, the peak revenue year (€297.2M). Do not state it as a general rule.
8. **Pokémon Co.'s "$12 billion".** That is **retail sales of licensed goods**, self-reported or estimated —
   not company revenue, not profit. The Pokémon Company is private and publishes nothing.
9. **Dumb Ways to Die's "$50 million".** *Earned-media value*, not cash received; the $300,000 cost has
   unstated currency. Both are agency claims restated by trade press. The only real cash number is the
   **A$2.25M IP sale** to PlaySide.
10. **PEGI's per-descriptor thresholds.** `pegi.info`'s criteria pages returned navigation-heavy content
    without the numbered descriptors. **This document therefore never states what rating a drinking mechanic
    attracts.** It relies only on the readable operational rules: CrazyGames requires *"Adhere to PEGI12"*, and
    Poki excludes alcohol outright. Those two facts are sufficient to reach §6.1 without guessing.
11. **Merchandise royalty rates.** Unpublished in every case. Terraria's Kickstarter figure (£1,632,154 from
    15,237 backers) is the **licensee's** gross, not Re-Logic's income.
12. **2048's clones running ads.** The profiteering is documented by the author; the specific ad mechanism was
    not.
13. **AR proper does not fit the current constraints.** `brief.md` Q5 requires web first and states *"no
    mechanic may depend on platform APIs that only exist on a phone."* Live AR needs real-time camera and
    motion tracking. DVOR-8's camera use is a **photograph**, not a live feed — which is precisely why it works
    in a browser. **The creator's phrase "AR gamification of the real world" is already satisfied by what the
    game does: the real world becomes the level.** True live AR would break Q5. This is the one place where the
    request and the recorded constraints pull apart, and it should be resolved deliberately.

---

# 8. The structure, defined

```
DVOR-8 as a product
│
├── TOPOLOGY A — attention sold  (advertiser → portal → developer)
│   ├── A1  midroll at the yard's end          [Poki: "after a game over"]
│   ├── A2  midroll on a new yard              [Poki: "between levels"]
│   ├── A3  rewarded video, optional, content  [Poki rewarded list; Crossy Road; Vampire Survivors]
│   ├── A4  Gamebar display ads, portrait      [Poki: "earns extra without any work from you"]
│   └── A5  no-ads purchase                    [Solitaire — but NOT on either portal, and UNPROVEN at scale]
│
├── TOPOLOGY B — the artifact sold  (brand/buyer → developer directly)
│   ├── B1  a commissioned yard  ★             [advergame "fully-funded by the advertiser"
│   │                                          + brands pay for PLACE: Pokémon GO Gyms, Ingress portals]
│   ├── B2  one-time flat licence              [Poki non-exclusive term]
│   └── B3  the slice-detect pipeline, B2B     [Unity Create Solutions proves the model;
│                                              the WebAR precedent (8th Wall) is now free → candidate only]
│
└── GATE — BRAND_SAFE
    └── fails today on the drinking mechanic and the mode names.
        Closes A1–A4, B1 and B2 at once.
```

**Why B1 is starred.** It is the only slot that (a) is proven by cases where brands paid, (b) does not require
an audience first, and (c) uses the one thing DVOR-8 has that no other small web game in this study has — **a
level that is a real, commissionable place.** It is also the only monetisable reading of "sharing" that the
evidence supports (§5.4).

**The order the structure implies:** fix `BRAND_SAFE` → pursue B2 and B1 (no audience needed) → then, once
players exist, unlock Topology A. CrazyGames makes that sequencing explicit in its own rules: prove engagement
in Basic Launch, *then* monetise in Full Launch.

**What this structure deliberately contains none of:** any currency to buy, any crate, any timer, any streak,
any pay-to-win, any ad in the wrecking. Every one of those is either forbidden by `brief.md` Q7/Q8 or excluded
by the platform terms quoted in §4.4.

---

# 9. Honest limits of this whole analysis

- **No verified revenue-per-user figure exists for an AR or location-based game.** The Pokémon GO lifetime
  total (~$9bn, Sensor Tower) is an `ESTIMATE`, IAP-only, and **explicitly excludes advertising** — so the
  sponsored-location money in C15 is *not inside it*, and the two cannot be added.
- **The web-portal numbers are indicative, and Poki says so:** *"The specifics above… are indicative. The real
  terms depend on the game and are set out in your agreement."*
- **CrazyGames' revenue-share percentage could not be read** — its developer portal is a JavaScript shell and
  the published figure was not obtainable. Only Poki's and GameDistribution's terms were verifiable.
- **Most figures in this document are not audited.** The audited ones are: Snap's 10-K advertising revenue,
  Roblox's 10-K creator share, Unity's segment revenue, Rovio's segment revenue, and Geocaching's published
  price. Everything from the games industry proper is self-reported, trade-press, or an analytics estimate.
- **The TopOn figure is one mediation vendor's own inventory** — a self-selected sample, not the market.
- **Nothing here establishes that any of this will work for DVOR-8.** It establishes which structures have
  paid somebody, and in which slot. Whether a brand will commission a yard is a sales question this document
  cannot answer, and the honest next step is not code: it is **one conversation with one brand**, which is
  cheap and which no amount of further research substitutes for.
