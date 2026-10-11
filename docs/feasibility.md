# DVOR-8 — is it worth time and money?

Written 2026-10-11 for build `v0.2.0` (tag `mvp-2-real-objects`).

**Short answer: worth a few more weeks of time, in stages, each with a stop rule. Not worth money yet.**
The idea has one real asset — the level is the player's own place — and three structural problems that no
amount of polish fixes: one yard is one level, the hook is a novelty, and nothing yet brings a player back.
Whether those can be solved is cheap to find out and should be found out before anything is spent.

Tags: `SOURCED[n]` — on a page that was opened. `SNIPPET` — seen in a search result only, page not opened
or refused. `ESTIMATE` — the author's own judgment, no source. Nothing here has been tested with players.

## 1. What already exists

Nine searches were run. **No game was found that does what DVOR-8 does** — photograph your own outdoor
place, keep it recognisable, and make the real detected objects in it the targets. That is absence of
evidence from a short search, not proof that none exists. Every ingredient exists separately:

| Game | What it shares with DVOR-8 | What it does not | Tag |
|---|---|---|---|
| **Paper Game** (iOS, free, 2020) | "you can easily use your phone to take a photo. This photo is then analysed and platforms or solid objects are picked out as a sort of base for your game" | The photo becomes platforms for a platformer; objects are not recognised or named | SOURCED[1] |
| **Piclings** (iOS) | Takes your picture and turns it into a level | Same: a platformer over the photo | SNIPPET (review page refused) |
| **Pixel Press Floors** (iPad) | Photograph a drawing, it becomes a run-and-jump level | Needs a drawing on special paper, not a place | SNIPPET |
| **ChickDash** (itch.io, jam entry) | "Detects and tracks real-world objects like cars, motorcycles and pavements in real-time" | Live AR, the cars are obstacles for virtual chickens, not targets; a jam project with no numbers shown | SOURCED[2] |
| **Trolls Smash** (iOS) | AR: smash your surroundings, "cars, walls, floors, and more" | Live AR surfaces, not a kept picture of your place; closest in spirit | SNIPPET |
| **Shatter Isle** | Recognises real tabletop objects and lets game objects interact with them | Tabletop, not destruction of the objects | SNIPPET |
| **First Encounters** (Meta Quest) | Creatures "burst through players' walls"; the player's own room is the level | Needs a headset; Meta's own showcase | SNIPPET |
| **Car Spotting by MotorTrend** | Recognises real cars through the camera | A collection app, no destruction | SNIPPET |

**What this says.** The technique is not new and not hard — a jam team shipped live car detection. So
DVOR-8 has no technical moat: if it works, it can be copied in weeks. And the photo-becomes-a-level idea
has been on the App Store since at least 2020 without, as far as this search found, producing a hit. No
download or revenue figure for any of these games was found, which is itself a weak signal: successes
are written about.

## 2. What the evidence says about hooks like this one

**Novelty photo apps rise and fall in weeks.** AI avatar apps peaked in mid-December 2022 at "4.3 million
daily downloads and ~$1.8 million per day in consumer spending" and by February were at "around 952,000
combined downloads and around $507,000" — a cycle of about six weeks. Among the reasons given: "one-time
novelty appeal". `SOURCED[3]` DVOR-8's hook — *see my own yard as a game* — is the same kind of pleasure.
It is strongest the first time and weaker every time after.

**Even the best casual games lose most players in a week.** For the top 5% of hyper-casual games, day-1
retention is about 40–44% and day-7 about 15–17%. `SOURCED[4]` One report puts hyper-casual day-30
retention at 1.38%. `SNIPPET` A game with no reason to return will sit below these, not at them.

**What spreads is a result people can compare.** Wordle's emoji grid let people share a result without
spoiling it, and everyone had played the same puzzle, so a grid meant something to whoever saw it.
`SNIPPET` DVOR-8 has the opposite shape today: every player's yard is different, so a score means nothing
to anyone else.

**Fast restart and a visible score are a proven engine.** `SOURCED`, see `docs/style.md` F8–F9. This is
the part of DVOR-8 that rests on the firmest ground.

## 3. Strengths

1. **The level is yours.** Nobody else has it and no designer made it. `ESTIMATE`: this is the one thing
   competitors' games do not have, because theirs turn the photo into generic platforms.
2. **It makes a picture worth showing.** Your street, in 8-bit, with your neighbour's car labelled and
   wrecked, is a thing people show each other without being asked. `ESTIMATE`, untested.
3. **It costs nothing to run.** Detection is on the phone. No server, no model fees, no account. A static
   page can serve any number of players for free.
4. **No install.** It is a link. The distance from "look at this" to playing is one tap.

## 4. Problems, in order of seriousness

1. **One yard is one level.** A player has one balcony. After two or three clears there is nothing new.
   This is the core problem and it is structural.
2. **No reason to come back.** A best score on the device is all there is. See section 2.
3. **The detector decides whether there is a game.** It knows 80 everyday things. An empty yard, or one
   with bins, swings and trees, has no targets. From a high balcony cars are small; this is untested on
   such a view. If it fails on the creator's own yard it fails the first user.
4. **Sharing has a privacy cost.** The picture shows real cars, possibly number plates, possibly people
   and windows. A feature that publishes "my neighbour's car, wrecked" can be used to harass. Any sharing
   feature has to blur plates and faces and has to be designed with this in mind from the start.
5. **The themes limit distribution.** On the App Store, frequent "alcohol, tobacco, or drug use or
   references" is rated 18+, and apps that "encourage excessive consumption of alcohol or illegal
   substances" are rejected. `SNIPPET` Modes named for weed, alcohol and depression put the game at 18+,
   close many ad networks, and make depression-as-a-play-mode a reputational risk if the game is ever
   seen widely. The modes' mechanics do not depend on their names.
6. **No moat.** See section 1.

## 5. On "addictive"

The brief already rules out the mechanics that make games compulsive: punishing loss and paid randomness
(`brief.md`, Q8). That is the right line and this analysis keeps it. What is worth building is a reason to
*want* to come back that the player would endorse afterwards. Three candidates, all `ESTIMATE`, all
answering problem 1 directly:

- **Everywhere is a level.** The yard is one level; every street the player walks down is another. The
  camera is the level select. This turns problem 1 around: content is wherever the player goes.
- **Play my street.** Share a link to *your* picture with its found things; a friend plays the same level
  and the scores are comparable. This gives DVOR-8 the Wordle shape — same puzzle, comparable result —
  and makes every player a level designer. It needs somewhere to store a 15–30 KB picture, and the
  privacy handling from problem 4.
- **A garage.** Keep a record of the kinds of things wrecked: first bus, first motorcycle. A collection
  rewards going out to find what is missing.

## 6. What it would cost

No money is needed for the next three stages. Hosting a static page is free; the detector is free and
vendored. Money starts only with a native app, store fees and paid acquisition — stage 3 — and should
not be spent before stage 2's numbers exist. Time, `ESTIMATE`, for one person with an AI agent:

| Stage | Question it answers | Work | Time | Stop if |
|---|---|---|---|---|
| **0** | Does it work on *your* balcony? | Take five photos from where you live; fix the detector for that view (slice sizes, a larger model) | 1–2 days | Fewer than 3 real things found in 3 of 5 photos, after fixes |
| **1** | Do people light up, and do they do it twice? | Put the link in front of 5–10 people, in person, and watch. Do not explain. | 1 week | Fewer than half take a second photo unprompted, or nobody shows it to someone else |
| **2** | Does anyone come back? | Build "everywhere is a level" and "play my street" with plate and face blurring; share the link with 50–100 people; count returns | 2–3 weeks | Day-1 return under 30% or day-7 under 10% — the level top casual games reach (section 2) |
| **3** | Is it a business? | Native app, store review, age rating, monetisation, acquisition | months, and money | Decide then, with stage 2's numbers |

Total before any money: about four to six weeks of part-time work, with two exits on the way.

## 7. Verdict

| | |
|---|---|
| As a sustained, returning game, **as it stands** | **No.** One level, no return loop, novelty hook. |
| As a toy people try once and show a friend | **Plausible**, untested. The asset is real. |
| As a game worth returning to, **if** "everywhere is a level" and "play my street" work | **Unknown, and cheap to find out.** This is the bet. |
| Worth money now | **No.** Nothing a player has done supports it yet. |
| Worth stage 0 and stage 1 | **Yes.** About a week and a half, and it answers whether the hook exists at all. |

The single most useful next step is not code: it is five photographs from the real balcony, and then
five people with the link.

## Sources — pages opened on 2026-10-11

1. indiegamesplus.com, "Paper Game review", 28 April 2020 — https://indiegamesplus.com/paper-game-review/
2. immersionfx, "ChickDash", itch.io — https://immersionfx.itch.io/chickdash
3. Sarah Perez, "The AI photo app trend has already fizzled, new data shows", TechCrunch, 13 February 2023 — https://techcrunch.com/2023/02/13/the-ai-photo-app-trend-has-already-fizzled-new-data-shows
4. GameAnalytics, "The metrics behind hyper-casual games", 26 February 2025 — https://www.gameanalytics.com/blog/the-metrics-behind-hyper-casual-games-industry-report

Read through a summarising fetch; quotations are as it returned them. Search-result-only items (`SNIPPET`):
Piclings (gamezebo.com, refused), Pixel Press Floors, Trolls Smash (moddb.com), Shatter Isle (gamesbeat.com),
First Encounters (developers.meta.com), Car Spotting (apps.apple.com), day-30 retention (segwise.ai), Wordle
(smithsonianmag.com, refused; techcrunch.com), App Store rating rules (capgo.app, Wikipedia).
