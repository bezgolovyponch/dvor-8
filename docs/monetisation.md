# DVOR-8 — monetisation from proven cases, not invented hooks

Built 2026-10-12 against repository state `ac1bdd6`. This answers a different question from
[constraints.md](constraints.md): not *what keeps a player*, but **who has actually paid money for a game like
this, and for what**. Retention-through-destruction is deliberately not the subject here.

The rule this file is held to, stated by the creator:

> "NOT MADE UP, NOT ASSUMED structure, but defined, proven by use cases that made the game become a product
> people or advertisers were actually willing to pay for."

So every element below is built from an opened source. Where a number is an analytics firm's estimate rather
than a disclosed figure, it says so. Where a case failed verification, it is in §9, not quietly dropped.

**Status key:** `VERIFIED` (opened the source, words are there) · `VERIFIED-SECONDARY` (real, read in a
scholarly/trade summary) · `ESTIMATE` (third-party estimate, not disclosed) · `UNVERIFIED` (could not open —
justifies nothing).

---

# 1. The single most important distinction

Every monetisation case answers one question first: **who pays?**

| Payer | What they are buying | Which DVOR-8 property could serve it |
|---|---|---|
| **Advertisers / ad networks** | attention, placed around or inside the game | the yard as an ad surface; the portal does the selling |
| **Brands directly** | a message delivered *as* the game | a sponsored yard, a sponsored object |
| **Players** | convenience, cosmetics, content, the game itself | no-ads, extra photographs, cosmetics |
| **Licensees / merchandise** | the IP on physical goods | weak fit — see §6 |
| **A platform or acquirer** | the game, or the audience, as an asset | the Wordle route |
| **B2B buyers** | the technology | the detector pipeline, not the game |

Most failed game businesses pick the third row and hope. **Every case in §2 that worked at scale picked the
first or the second.** That is the finding this whole document rests on, and it is what §5 turns into a rule.

---

# 2. The verified cases

## 2.1 The directly applicable ones — web game portals

These matter most because DVOR-8 *is* a free browser game with no install, and these are the entities that
actually write cheques for exactly that artifact.

### C1. Poki — the platform pays the developer, and sells brand deals itself

**Source.** Poki's own developer documentation, opened 2026-10-12:
`https://developers.poki.com/guide/working-with-poki` and `https://developers.poki.com/guide/revenue-deal-types`.
**Status.** `VERIFIED` (first-party primary).

Verbatim, on the revenue model:

> "If a user comes to your game directly, through bookmarks, search, social media or through your own
> community, you get 100% of the revenue for that user. If a user comes to your game through Poki.com, or
> through a marketing effort from Poki, then Poki splits the revenue 50/50 with you, covering the cost of the
> marketing and user-acquisition effort that brought that player in."

Verbatim, on what Poki invests:

> "Marketing and promotion to reach 100M+ players and beyond / **Monetization through top-tier ad partners and
> brand deals** / A revenue share on players Poki brings to your game"

Verbatim, on the alternative deal:

> "we can offer a one-time flat license fee instead, with no revenue share"

**PAYER: advertisers and brands — not players.** Poki states plainly: *"Games on Poki earn through in-game
ads, served entirely by the Poki SDK. There are no in-app purchases and no third-party ad systems to
integrate."*

**The engagement logic Poki itself requires** (`/guide/how-monetization-works`):

- two formats only — **midroll** ads at natural breaks, signalled by the game via `commercialBreak()`, and
  **rewarded video** via `rewardedBreak()` on "an explicit player action";
- *"Rewarded content is always an optional extra and never blocks core gameplay."*
- *"the more natural stops you signal, the better the system can pick its moments"* — i.e. **the game must
  contain natural pauses**, and a game with none cannot be monetised this way;
- portrait games become eligible for **Gamebar Display ads**: *"a mobile format in the title bar that earns
  extra without any work from you."*

**And the design rule that matters most** (`/guide/monetization`):

> "Simple economies outperform complex ones: one understandable currency, clear rewards, and no secondary
> currencies (web players dislike them). Design the economy around rewarded moments from the start."
>
> "Think about monetization early. Bolted on at the end, ads feel forced; designed in from the start, they
> feel like a favor to the player."

**Why this case is the anchor.** It is a documented market in which the payer is an advertiser, the product is
a free HTML5 game, and the payment structure is published. No invention is required to place DVOR-8 in it.

### C2. Poki — and the wall DVOR-8 hits

Same source, `/guide/content-player-safety`. **Status.** `VERIFIED` (first-party primary).

> "Poki is a playground for everyone, including kids."
>
> "What's out of scope: … **Cheating, gambling, alcohol, tobacco, or other offensive material**"
>
> "**Adult themes and misused IP are rejected immediately.**"
>
> "both Poki and its developers depend on our ad partners, and every game needs to be something an advertiser
> is comfortable placing their brand next to"

**This is decisive and it is not a technicality.** The stated reason advertisers need safe content is that
their brands sit beside it. DVOR-8 currently ships a bottle the player drinks from, four swigs at a time, and
a mode named for cannabis. Under C2 that is not a risk of rejection — it is automatic rejection, and with it
the entire C1 revenue route.

**Two more Poki barriers, both `VERIFIED` from the same page:**

- *"Chat systems expose players, especially younger ones, to real risks, so games can't include them. Want
  players to express themselves to each other? An emoji system works well."* — DVOR-8's share line is already
  emoji-only (`SIGN` in `src/album.js`), so this one **fits as built**.
- *"Excessive load size or poor performance"* is a listed reason to decline. DVOR-8's first load is ~20 MB
  (`vendor/mediapipe/` measures 20M, whole tree 33M). See §6 for how that compares to portal limits.

### C3. CrazyGames — the second portal, with different rules

**Source.** CrazyGames' own developer documentation, opened 2026-10-12:
`https://docs.crazygames.com/requirements/intro/`. **Status.** `VERIFIED` (first-party primary).

- *"The primary monetization mechanism we offer is through advertisement revenue share. Only ads served
  through our SDK are allowed"*
- *"Selected games are eligible for In-game Purchases"* — **"Invite Only"**, requiring Xsolla as the payments
  provider. So player-pays monetisation exists but is **not self-serve**.
- Technical ceilings: *"Initial download size ≤ 50MB"*, *"Total file size ≤ 250MB"*, *"File count ≤ 1500"*.
- Gameplay requirement: *"Adhere to PEGI12"*, and on Full Launch *"Land directly in gameplay"*.
- Two-stage launch: a **Basic Launch** where *"CrazyGames monetization is disabled"* and *"No external ads"*,
  then a **Full Launch** requiring the SDK.

**The engagement logic here is explicit and unusual:** the portal makes you prove retention *before* it lets
you earn. Monetisation is gated on demonstrated engagement.

**PAYER: advertisers, via the portal.** Player payment exists but is invite-only.

## 2.2 The simple-game ad case

### C4. Microsoft Solitaire Collection — a free card game monetised by ads and an ad-removal purchase

**Source.** Contemporary trade reporting opened 2026-10-12 (`newsweek.com/solitaire-microsoft-windows-10-pay-freemium-358366`,
`digitaltrends.com/computing/pay-to-remove-ads-solitaire-windows-10/`). **Status.** `VERIFIED` that the
model exists — a free, ad-supported game with a paid option to remove ads. **The revenue figure is `ESTIMATE`
or `UNVERIFIED`**: no disclosed Microsoft figure for this title was found, and third-party revenue
estimators (Sensor Tower, Bumetric) publish modelled numbers, not disclosed ones. **Do not cite a Solitaire
revenue figure.**

**PAYER: advertisers, plus players buying removal of those ads.** The mechanism is worth noting because it is
the cleanest "player pays" case that does not touch randomness, loss, or power: **the player pays to remove
the advertising, not to win.**

## 2.3 The advergame case — a brand funds the whole game

### C5. Advergaming: the advertiser is the customer, the developer is paid to build

**Source.** *IGDA Casual Games White Paper* (2008), opened as a PDF, 214 pp.
`https://ifip-tc14.org/wp-content/uploads/2017/10/IGDACasualGames-WhitePaper-2008.pdf`. **Status.**
`VERIFIED` (industry white paper, primary for the business model; **the CPM figures are 2008 and must be
dated**).

Verbatim, on the model:

> "Advergames can best be defined as a game where the game itself is used to deliver an advertiser's message
> (as opposed to ad-supported content, where ads are simply placed around a game). These games are typically
> **fully-funded by the advertiser, built on a work-for-hire basis by a developer**, and delivered to the
> consumer for free."

Verbatim, on the adjacent ad-supported model and why the audience is worth more:

> "CPMs for ads around games tend to be higher than other forms of online media – specifically for
> video-interstitials strategically placed before games or in-between levels – because advertisers are able
> to reach a more targeted and attentive audience."

Verbatim, on the value chain:

> "Current CPM rates for Display advertising range from $0.50 to $20.00 or more. Generally, the ad network
> retains 20% to 40% of the total ad revenue."

**PAYER: brands, directly, as the customer.** This is the only model in this document where **the game does
not need an audience before it earns.** The advertiser pays for the artifact.

**And the one advergame with a documented mass outcome**, verbatim from the same paper:

> "Burger King recently made headlines by releasing three original Xbox advergames, selling over 3 million
> units in their stores."

**Status.** `VERIFIED-SECONDARY` — the figure is the white paper's, not Burger King's own. Note the shape:
the games were **sold for a few dollars with a value meal**, i.e. they drove restaurant traffic rather than
game revenue. The brand's return was the meal, not the disc.

## 2.4 Cases pending verification

The following are being verified and are **not yet usable**. They appear here so the gap is visible rather
than filled from memory: Flappy Bird's reported daily ad revenue · Crossy Road's rewarded-video and
remove-ads model · Wordle's acquisition · 2048's absence of monetisation · Vampire Survivors' one-off price ·
Doodle Jump · Snap Inc.'s sponsored AR lenses · Pokémon GO's sponsored locations · Niantic/8th Wall pricing ·
Rovio's licensing share · "Dumb Ways to Die" cost and claimed media value · Geocaching membership · Roblox's
creator revenue share.

Final numbers for these are appended in §10 when verified. **Nothing in §3–§7 depends on them** — the formula
and the simulation are built from C1–C5, which are first-party sources.

---

# 3. Decomposition — the engagement formula, as the cases define it

The creator asked for the cases to be decomposed "into appropriate logic user engagement formula, according to
the existing". This is that decomposition, built only from C1–C5.

## 3.1 The formula

A web game becomes a product somebody pays for when five terms hold **at the same time**. Written as the
conditions on a session:

```
PAID  ⟺  NATURAL_STOP  ∧  OPTIONAL_REWARD  ∧  SINGLE_CURRENCY  ∧  BRAND_SAFE  ∧  LASTING_ARTIFACT
```

Each term, and where it comes from:

| Term | Meaning | Proven by |
|---|---|---|
| `NATURAL_STOP` | the game contains real breaks the platform can place an ad in | Poki: *"the more natural stops you signal, the better the system can pick its moments"*; midrolls run *"at natural breaks in the session: between levels, after a game over, when leaving a pause"* |
| `OPTIONAL_REWARD` | a rewarded ad is a **player's choice** for an in-game benefit and *"never blocks core gameplay"* | Poki's own wording, verbatim |
| `SINGLE_CURRENCY` | one understandable currency, no secondary currencies | Poki: *"Simple economies outperform complex ones… no secondary currencies (web players dislike them)"* |
| `BRAND_SAFE` | an advertiser is willing to sit beside it | Poki: *"every game needs to be something an advertiser is comfortable placing their brand next to"*; CrazyGames: *"Adhere to PEGI12"* |
| `LASTING_ARTIFACT` | the game is something a portal or a brand can buy **once** and keep serving | Poki's *"one-time flat license fee"*; the advergame's *"fully-funded by the advertiser, built on a work-for-hire basis"* |

## 3.2 The two payment topologies

The cases reduce to exactly two shapes. Everything in §5 is one or the other.

**Topology A — attention is sold (advertiser pays the platform, platform pays the developer).**
The developer's job is to produce `NATURAL_STOP` and `BRAND_SAFE`. The developer never sells anything to the
player. This is Poki, CrazyGames, and Solitaire's free tier. **It requires an audience**, so it pays late.

**Topology B — the artifact is sold (the brand or platform pays the developer directly).**
The developer's job is to produce `LASTING_ARTIFACT` — something coherent enough to be commissioned or
licensed. The advergame is this shape in its purest form: *"fully-funded by the advertiser."* Poki's
*"one-time flat license fee"* is the same shape. **It does not require an audience first**, so it can pay
early.

**The strategic consequence.** Topology A is the default plan everyone has; it is also the one that starves
you until you have players. Topology B is the one that pays a small team for a small game — and DVOR-8's
unusual property, that its level *is a real named place*, is a Topology B asset and not a Topology A asset.
That is the core of §5.

## 3.3 What the formula forbids

Derived directly from the cases, so these are not opinions:

- **No ad in the middle of an action.** Poki places midrolls at *"natural breaks"* and its system *"decides
  when a player is actually ready to see one"*. A game with no breaks cannot take midrolls at all.
- **No rewarded ad that gates progress.** *"Rewarded content is always an optional extra and never blocks
  core gameplay."*
- **No second currency.** Stated outright.
- **No player-pays mechanic in the self-serve route.** Poki: *"There are no in-app purchases."* CrazyGames:
  in-game purchases are *"Invite Only"*.
- **No ad-pressure UI.** CrazyGames' quality guidelines: *"Buttons are not sized to encourage ads or other
  behaviors. Buttons do not have delays to confuse users or encourage other behaviors."*

---

# 4. The engagement logic each case actually runs on

Separate from the money: **what the case makes the player do**, in the terms the sources use.

| Case | The loop that produces the paying moment |
|---|---|
| Poki (generic) | session → natural stop → midroll; or player wants a benefit → chooses rewarded video. **The stop is a design object, not an accident.** |
| CrazyGames | game → Basic Launch with no monetisation → prove engagement metrics → Full Launch with SDK. **Monetisation is earned by demonstrated retention.** |
| Solitaire | free play → ads → a player pays once to remove them. **The purchase is irritation-removal, not advantage.** |
| Advergame | brand commissions → game is free to the consumer → the consumer is the brand's audience. **The player never pays and never has to return.** |

**The pattern across all four.** In none of them is the paying party the person who is having the experience.
The player gets the game free; **somebody else pays for the player's attention or for the artifact.** For
DVOR-8 that is not a compromise, it is the only structure consistent with `brief.md` Q7 — see §7.

---

# 5. Applied to DVOR-8 — where the elements go

Now the simulation. Each element below is placed **only** where a case above has already proven the slot
exists. Nothing is invented; each row names the case it is copied from.

## 5.1 What DVOR-8 already has that fits, unchanged

| DVOR-8 property | Which formula term | Proven slot |
|---|---|---|
| `MAX_TARGETS = 14` things to wreck, then the yard is done | `NATURAL_STOP` — a real end-of-run break | Poki midroll *"after a game over"* |
| `«ЕЩЁ РАЗ»` — instant clean restart | the second natural stop | same |
| Walking to the street's end (`MAX_STREET`, nine photographs, forty yards) | a between-levels break | Poki midroll *"between levels"* |
| The album's `progress()` — kinds wrecked, out of all kinds | `SINGLE_CURRENCY` — **one** number, already one | *"one understandable currency"* |
| The share line (`shareText`, emoji only, `SHARE_MAX = 14`) | already matches Poki's "emoji system" allowance for player expression | Poki content policy |
| ~20 MB first load, 33 MB tree | inside CrazyGames' 50 MB initial / 250 MB total | CrazyGames technical requirements |

**This is the good news, and it is specific: DVOR-8 already satisfies four of the five formula terms as
built.** The pauses are real, the economy is already single, the sharing is already emoji-only, and the size
fits. The build is closer to monetisable than `docs/feasibility.md` suggests — with one exception, which is
§5.4.

## 5.2 Topology A — placed element by element

**Slot A1 — midroll at the end of a yard.**
*Where:* the existing `done` transition, where the yard is finished and before «ЕЩЁ РАЗ».
*Copied from:* Poki midrolls at *"natural breaks… after a game over"*, signalled by `commercialBreak()`.
*Cost to the design:* none. The break already exists; the ad is placed in it.
*Constraint:* the restart must remain one tap and must not wait on the ad.

**Slot A2 — midroll when arriving at a new yard in the street.**
*Where:* `street.js` `extend()`, between one yard and the next.
*Copied from:* Poki midrolls *"between levels"*.
*Constraint:* never mid-walk, never mid-throw. Poki's system refuses ill-timed calls anyway, but the game
should not rely on that.

**Slot A3 — rewarded video, single optional benefit, secondary position.**
*Where:* the player's choice, on an explicit action. The natural candidate the cases support is **the thing
Poki's own examples list first: "a helping hand"** — here, recovering a photograph that found too few
targets, or restoring the scan on a yard the detector could not read.
*Copied from:* Poki's rewarded categories — *"revives, level skips, hints, stat boost, speed-ups, or a special
ability"* — and its hard rule that the **natural option always sits in the primary position**:
> "The natural, non-rewarded option always sits in the primary position. Overselling the rewarded button or
> delaying the alternative erodes trust."
*What it must not be:* anything that alters what the player can wreck, because `brief.md` Q8 forbids paid
advantage-by-randomness and the design forbids power. A re-scan or an extra photograph is **content access**,
not power.

**Slot A4 — Gamebar display ads, if portrait ships.**
*Copied from:* Poki — *"Games that support portrait mode also become eligible for Gamebar Display ads… earns
extra without any work from you."*
*Constraint:* none on the design. This is the cheapest proven revenue in the whole document.

**Slot A5 — the no-ads purchase, only where it is allowed.**
*Copied from:* Solitaire, the cleanest proven player-pays case that touches neither randomness nor power.
*Blocker:* Poki has no in-app purchases at all, and CrazyGames' are invite-only. So this slot **cannot be
filled on either portal** — it exists only on DVOR-8's own domain, where the payment stack is the
developer's own problem. Honest conclusion: **this slot is real but out of reach until the game has its own
distribution.**

## 5.3 Topology B — the slot DVOR-8 is uniquely built for

This is where the answer to the creator's actual question lies, and it comes from the advergame case.

**Slot B1 — a commissioned yard.**
*The move:* a brand buys a **place**, not an interstitial. The commissioned artifact is a yard the brand
supplies — its own courtyard, forecourt, or a real site it wants people to look at — turned into a DVOR-8
level with its own real objects as the targets, and its own palette taken from its own photograph (which
`palette.js` already does per photograph: *"A street of several photographs keeps every photograph's own
colours"*).
*Copied from:* the advergame model, verbatim — *"the game itself is used to deliver an advertiser's message…
fully-funded by the advertiser, built on a work-for-hire basis by a developer, and delivered to the consumer
for free."*
*Why DVOR-8 and not another game:* the level is a real place, and the palette and targets come from that
place's own photograph. **No other small web game in §2 has an artifact whose content is a specific physical
location.** That is the commissionable thing.
*What the brand gets, in the terms the same white paper uses:* *"advertisers are able to reach a more targeted
and attentive audience"* — here, an audience actively looking at the brand's own site for a minute.
*Constraint from constraints.md:* P2 requires the game to report what it could not name. A commissioned yard
must still do this. A brand yard that pretended the detector saw everything would break the game's own
honesty rule — and it is also the more interesting artifact.

**Slot B2 — the one-time flat licence.**
*Copied from:* Poki's non-exclusive deal — *"a one-time flat license fee instead, with no revenue share."*
*The shape:* DVOR-8 is exactly the kind of game this clause is for — short, self-contained, web-first, and
"a more niche or short-term fit". A flat fee is paid **before** any audience exists.
*Constraint:* Poki's own text ties the flat fee to non-exclusivity and to forgoing the marketing investment.
It is the smaller cheque, and it is the one that arrives first.

**Slot B3 — the technology, sold separately.**
*Copied from:* the B2B row in §1; the pending cases (§10) cover Niantic/8th Wall and portal licensing.
*The asset:* `detect.js` + `objects.js` already do something specific and hard — **on-device detection of
small objects in a photograph, by slicing, with nothing uploaded.** `docs/style.md` D5 records why: a car
from a balcony does not survive shrinking the whole photo. That pipeline is a licensable component for any
"photograph becomes a level" product, independent of DVOR-8's own content.
*Honest status:* `UNVERIFIED` as a business until the pending B2B cases land. Named here as a candidate, not
a claim.

## 5.4 The one term DVOR-8 fails — and it is the blocking one

`BRAND_SAFE` fails. Not marginally: C2 quotes the rule, and `src/drink.js` is a bottle the player drinks from
while playing, with the state variable named `drunk`.

This is the finding that matters, and it is worth being blunt about the consequence:

| Route | Status today | Why |
|---|---|---|
| Poki | **closed** | *"alcohol… or other offensive material"* is out of scope; *"Adult themes… rejected immediately"* |
| CrazyGames | **blocked at the gate** | requires *"Adhere to PEGI12"* |
| Brand commissions (B1) | **hardest hit** | a brand is precisely the party least willing to sit beside a drinking mechanic |
| Own domain, no ads | open | but then Topology A does not exist |

**The modes' mechanics do not depend on their names.** `docs/feasibility.md` §4 problem 5 already says this,
and `docs/concept.md` notes the modes are named for weed, alcohol and depression *"at the creator's request,
for adults"*. The numbers in `modes.js` are what make each mode different — flight, scatter, splash, chain,
combo, focus. **A rename is not a design change.** Renaming `АЛКОГОЛЬ`→`СТЕКЛО` (glass: wide burst, bad aim)
and `ТРАВА`→`МЯГКО` (soft: slow, skip, long combos) and `ДЕПРЕССИЯ`→`ТУННЕЛЬ` (tunnel vision) preserves
every mechanic and every test, because the tests assert *behaviour*: *"no two modes put the same thing in the
hand"*, *"every mode but sober changes BOTH the throw and the focus"*.

**Stated as a decision, not a suggestion:** either the four names and the bottle go, or every advertiser-paid
route in §5.2 and §5.3 is closed. There is no third option in the verified sources.

**The honest counter-argument.** The drinking mechanic is one of the better pieces of design in the build —
`drink.js` makes how drunk the player gets *their own doing*, which is exactly the autonomy the SDT evidence
favours (constraints.md PS2, β = .49). Removing it removes a real mechanic. So this is a genuine trade, not a
formality — but it is a trade between one mechanic and **every proven revenue route simultaneously**.

---

# 6. Fit against the platform ceilings, measured

| Requirement | Source | DVOR-8 actual | Verdict |
|---|---|---|---|
| Initial download ≤ 50 MB | CrazyGames technical | `vendor/mediapipe/` = 20 MB; tree = 33 MB | **passes** |
| Total file size ≤ 250 MB | CrazyGames technical | 33 MB | passes |
| File count ≤ 1500 | CrazyGames technical | well under | passes |
| Land directly in gameplay | CrazyGames gameplay | camera-first, but a menu precedes it | **needs work** |
| Adhere to PEGI12 | CrazyGames gameplay | fails on the alcohol mode | **fails** |
| Portrait mode for Gamebar ads | Poki easy-access | mobile-first layout exists | likely passes |
| No chat; emoji expression allowed | Poki content | share line is emoji-only | **passes** |
| Rewarded never blocks core gameplay | Poki | not yet implemented | to build |
| Natural stops exist | Poki | yard end, street yard-change | **passes** |
| One currency | Poki | the album's single `have/of` count | **passes** |

**Note on load size.** 20 MB is *within* the limit but is the single heaviest thing in the build, and
`docs/feasibility.md` already flags that the first load "fetches about 20 MB". It passes today; it is the
first thing to regress if the model is upgraded. Worth a test that fails if `vendor/` grows past a stated
ceiling.

---

# 7. The contradiction with the brief, stated plainly

`brief.md` Q7, in the creator's own words:

> "**No hook may exist to serve a business model.** This agrees with the ethics answer below and makes the
> rejection of paid randomness structural rather than a preference."

And Q8: waiting allowed; **loss and paid randomness are not.**

**This document does not overrule that, and it does not need to.** The two are compatible if stated precisely:

1. **Q7 forbids a mechanic whose purpose is revenue.** §5 places every element in a **pause, a choice, or a
   separate artifact** — never in the wrecking itself. The midroll sits where the game is already stopped. The
   rewarded ad is a player's arbitrary choice with the natural option primary. A commissioned yard is a
   *different* yard, not a worse one. **No term of the core loop changes to earn.**
2. **Q8 forbids loss and paid randomness.** §5 contains neither. There is no loot box, no energy timer, no
   gate on the core action, and no purchase that improves what the player can wreck.
3. **But one thing does change, and it must be said: the modes' names.** They are not a hook serving a
   business model — they are a hook *blocking* every business model. §5.4.

**The one genuine cost.** Placing midrolls at the end of a yard means the player who has just cleared a yard
waits before restarting. `«ЕЩЁ РАЗ»` is currently instant, and `constraints.md` PS6/P6 depend on restoration
being one action away. **The ad must not be between the player and «ЕЩЁ РАЗ».** Put it after the restart, or
make the restart available during it. Any placement that delays the clean yard breaks a constraint this
project already proved it needs.

---

# 8. The structure, defined

What the verified cases support, in the form the creator asked for — a defined structure, not an assumption:

```
DVOR-8 as a product
│
├── TOPOLOGY A — attention sold (advertiser → platform → developer)
│   ├── A1  midroll at the yard's end          [proven: Poki "after a game over"]
│   ├── A2  midroll on arriving at a new yard  [proven: Poki "between levels"]
│   ├── A3  rewarded video, optional, content  [proven: Poki rewarded categories]
│   ├── A4  Gamebar display ads, portrait      [proven: Poki easy-access]
│   └── A5  no-ads purchase                    [proven: Solitaire — but NOT on either portal]
│
├── TOPOLOGY B — the artifact sold (brand/platform → developer directly)
│   ├── B1  a commissioned yard                [proven: advergame, "fully-funded by the advertiser"]
│   ├── B2  one-time flat licence              [proven: Poki non-exclusive term]
│   └── B3  the slice-detect pipeline, B2B     [UNVERIFIED — pending cases in §10]
│
└── GATE — BRAND_SAFE
    └── fails today on the drinking mechanic. Closes A1–A4, B1 and B2 at once.
        The modes' names are the only thing standing between DVOR-8 and every
        verified route in this document.
```

**The order the structure implies.** Topology B is reachable without an audience; Topology A is not. So the
first real money available to this project is **B2 (a flat licence) and B1 (a commissioned yard)**, and both
are gated on the same rename. Topology A follows only after players exist, and CrazyGames' own two-stage
launch makes that gate explicit: prove engagement, *then* monetise.

**What this structure deliberately does not contain.** No currency to buy, no crate, no timer, no streak, no
pay-to-win, no ad in the wrecking. Every one of those is either forbidden by `brief.md` Q7/Q8 or excluded by
the platform terms quoted in §3.3.

---

# 9. What failed verification

Reported, not filled.

1. **No disclosed revenue figure for Microsoft Solitaire Collection.** Trade sources confirm the ads +
   ad-removal model; no Microsoft number exists. Third-party estimators publish modelled figures. **Cite the
   model, never a number.**
2. **The 2008 IGDA CPM range ($0.50–$20, network retains 20–40%) is 2008 data.** The *structure* is sound
   and quotable with the date; the *values* are not current and must not be presented as current rates.
3. **Burger King's 3 million units** is the white paper's figure, not the company's. `VERIFIED-SECONDARY`.
4. **PEGI's per-descriptor thresholds** could not be read cleanly — `pegi.info`'s criteria pages returned
   navigation-heavy content without the numbered descriptors. **Therefore this document does not state what
   PEGI rating a drinking mechanic attracts.** It states the operational rules that do have readable primary
   sources: CrazyGames requires *"Adhere to PEGI12"*, and Poki excludes alcohol outright. Those two facts are
   sufficient to reach the conclusion in §5.4 without guessing at PEGI's internal thresholds.
5. **No verified source for an AR or location-based game's revenue-per-user.** If the creator wants an AR
   business case, that gap has to be closed with the pending Pokémon GO / Snap cases in §10 — and any figure
   there will be a third-party estimate, not a disclosed number.
6. **AR proper does not fit the current constraints.** `brief.md` Q5 requires web first and says *"no mechanic
   may depend on platform APIs that only exist on a phone."* Live AR needs camera-plus-motion tracking in real
   time. DVOR-8's camera use is a **photograph**, not a live feed, which is why it works at all in a browser.
   The creator's phrase "AR gamification of the real world" is satisfied by what the game already does — **the
   real world becomes the level** — and going to true live AR would break Q5. This is worth stating because
   it is the one place where the request and the recorded constraints pull apart.

---

# 10. Pending: cases still being verified

These will be appended with sources, payer, mechanism and figure-or-`UNVERIFIED`:

**Cluster A — ad-supported and small paid games:** Flappy Bird · Crossy Road · Wordle · 2048 · Vampire
Survivors · Doodle Jump · the "remove ads" share of casual revenue.
**Cluster B — location, AR, sharing:** Pokémon GO sponsored locations · Pokémon GO lifetime consumer spend ·
Ingress sponsorships · Snap sponsored AR lenses · Niantic/8th Wall pricing · Geocaching membership ·
user-generated-level monetisation (Roblox creator share).
**Cluster C — brand, licensing, merchandise, B2B:** Rovio licensing share · Pokémon Company licensing ·
branded games (Burger King Xbox, "Dumb Ways to Die") · Stardew/Undertale merchandise · B2B/engine licensing ·
web-portal developer terms.

**How to re-verify any of them** — the same procedure as `constraints-checklist.md` §1: resolve the DOI or
URL, open the page or PDF, quote verbatim, and record whether the payer was players, advertisers, licensees or
an acquirer. A figure from an analytics firm is an `ESTIMATE` and must be labelled as one.
