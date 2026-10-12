# The neighbours request: what was asked, what similar games show, and the questions that are left

Written 12 October 2026, after the first build of the request (`src/folk.js`, commit `db26794`).
Tags as elsewhere in this repo: **SOURCED** a page was opened and says this; **SNIPPET** a search result
said this and the page was not opened; **DERIVED** follows from sourced lines; **CHOICE** nobody's
evidence, a decision; **OPEN** not known.

## 1. The request, as understood

People move through the yard: a delivery courier on a bicycle, passers-by, a drunk, an angry lady. They
cannot be harmed. The player throws a ball of water; the person looks up. A hide button and a danger
meter "as in GTA": hidden, the person stops looking and leaves. Soaked again, they hide and call the
police; the police come and look; the player can go on wrecking things and soaking people; if the police
(or anyone) sees the player, the run has failed.

## 2. What is built, and where it departs from the request

| Asked | Built | Note |
|---|---|---|
| Courier on a bicycle, walkers, drunk, angry lady | All four, each with its own speed, look and temper | every number is a first guess |
| People you cannot harm | A touch on a person always throws water, whatever is in the hand | a thing under the finger wins, so nobody is soaked by accident behind a car |
| He looks up | «!» for 0.3–1.2 s, then the look | the warning is added: without it a loss is not the player's doing |
| Hide button, danger meter | СПРЯТАТЬСЯ; five marks | hidden, nothing can be thrown and the walker cannot move — **not asked**, added so hiding has a cost |
| Hidden: he stops looking and leaves | After 1.2 s hidden: «?», and he goes | |
| Soaked again: they hide and call | They run for the nearer edge, «112», 2.5 s to the call | they run off rather than hide behind a thing: there is no cover in the picture to hide behind |
| Police come and look | One officer, 3 s after the call; four looks, 1.6 s turned away between | one officer at a time; more calls make him look longer |
| Seen: failed | Meter full: «ЗАМЕТИЛИ», the run ends | the album, days and records are kept and the score still counts |

Three places where the request meets something already decided:

1. **The brief says no punishing loss** (Q8). A failed run is a loss. It is kept mild — nothing kept is
   taken — but it is the first way to lose in this game, and it is the creator's to confirm.
2. **"People are never targets"** was a line of the first build. It now reads: people *in the photograph*
   are never targets; people the game draws can only be soaked.
3. **Store risk grows again.** `feasibility.md` already lists alcohol and drug names as a rating risk.
   Evading the police is one more theme on that list.

## 3. Games that did this, and what happened to them

| Game | The same mechanic | What players and critics said | What it did commercially |
|---|---|---|---|
| **Neighbours from Hell** (2003; remaster 2020) | Prank a neighbour unseen; hide in a wardrobe or under a bed; "if Rottweiler spots Woody, the level ends in failure and the player must restart it"; scored at the door | Remaster reviews praise the prank combos and "the neighbor's exaggerated reactions"; they complain that the "viewer rating system, stealth mechanics, prank chains" were removed or broken, that there is "little incentive for replaying", and that it is dear for its length; missing levels were restored in an update after requests | PC original 69/100; remaster "Overwhelmingly Positive" on Steam (792 English reviews) — SNIPPET for the Steam figures |
| **Untitled Goose Game** (2019) | Annoy villagers from a to-do list; the stealth is inverted — "to have the mischief-making goose attract the attention of NPCs and not get caught" | "Repetitive and too short" (Game Informer); Steam reviews ask for more levels, tasks, DLC (SNIPPET) | 100,000 in two weeks on Switch; over a million in three months; a free two-player mode a year later; spread by one trailer, then by "clips and stills … shared on social media" |
| **Hello Neighbor** (2017) | Sneak into a neighbour's house; he "changed behavior based on the player's past actions" | Five public alphas "received positively"; the finished game 38/100 for "gameplay, puzzles, control scheme and technical performance" | Over 600 million YouTube views on the alphas before launch (SNIPPET); six further games and a television series |
| **Scary Teacher 3D** (mobile) | Prank a teacher in her house; caught, the round is repeated | Complaints: 30-second ads after every level, an energy and star system, poor controls (SNIPPET) | Over 30 million downloads, 4.4/5 from over a million ratings (SNIPPET) |
| **Hitman** (2016–) | Suspicion, disguise, being seen; Elusive Targets: one attempt, a few days, "the targets will not return" | The episodic, live form was praised: "impeccable chunks once a month" | Below its publisher's expectations in 2016–18 despite 13 million players; as *World of Assassination*, still fed with live content, 75 million players and a million active in December 2024 (press release) |
| **Grand Theft Auto** | The wanted level: marks that fill with what the police know | GTA 2's marks shook "when police knew the player's location"; GTA IV added a search area in which the level "does not decrease until [the player moves] outside the circle without police making visual contact" (SNIPPET) | — |

### What can be said from this, and how firmly

- **I1 — The reaction is the product.** In both prank games reviewed, what is praised first is what the
  victim *does*. DERIVED from two review summaries. Our people look up and walk on; that is thin.
- **I2 — Being caught ends the attempt in every one of these games, and none of them is hated for it.**
  SOURCED for Neighbours from Hell and Scary Teacher. It supports the request's fail state — in games
  whose attempts are short. Ours are 20–60 s.
- **I3 — The commonest complaint is "too short, nothing to replay".** SOURCED (Game Informer), SNIPPET
  (Steam, both games). It is the same gap `feasibility.md` found in this game.
- **I4 — Scoring the *manner* of a prank is what players missed when it was removed** (prank chains,
  viewer rating). SNIPPET, one summary of reviews. We score a soaking flat.
- **I5 — These games travel as clips of someone being caught or fooled.** SOURCED for the Goose game,
  SNIPPET for Hello Neighbor's 600 million views. We share a line of emoji and a still picture.
- **I6 — A free mode added later brought attention back** (two-player Goose, a year on). SOURCED that it
  happened; **OPEN** what it did to sales — no figure was found.
- **I7 — Rare, one-attempt content was praised and still did not sell the game on its own.** SOURCED:
  Hitman 2016 missed expectations with it; the later numbers came with years of content and a new mode.
- **I8 — On mobile, the same idea reaches tens of millions free, and is resented for ads and energy.**
  SNIPPET. The brief already rules out paid randomness; `monetisation.md` holds the rest.

**Not found:** what any of these games earned per player; retention figures for any of them; a study of
why a caught-and-restart loop is tolerated. Nothing above shows that a change *caused* players to come
back and pay — only that it was made, and that the game did well or badly afterwards.

## 4. The concept the request points at

One sentence: **the yard has witnesses.** Wrecking things is the old game; doing it *between looks* is
the new one. The meter is the player's own greed made visible: every soaking scores and brings the end
nearer.

What the build does not yet have, in the order the evidence suggests it matters:

1. Reactions worth watching (I1) — a soaked courier who wobbles and drops his box, a lady who shakes her fist.
2. A score for how, not only whether (I4) — soaked while the police look away; two people with one run of throws.
3. A reason to play a second run that is not a higher number (I3).
4. Something to show that moves (I5).

## 5. Questions

Each is narrow, inside what this project is (a web page, one phone, no server, adults, no paid chance),
and each comes from a case above. A default is given; work goes on with the default until answered.

| # | Question | The case behind it | Default until answered |
|---|---|---|---|
| Q1 | **When seen, should the run end — or should the player lose only the yard's unbanked points and play on?** | Neighbours from Hell and Scary Teacher restart the level and are liked (I2); the brief says no punishing loss | The run ends; album, days and records are kept |
| Q2 | **Should the people react in more than one way to water** — the courier dropping his delivery, the drunk laughing — before more kinds of people are added? | Both prank games are praised for the victim's reaction, not for the number of victims (I1) | Yes: reactions before new characters |
| Q3 | **Should a soaking be worth more for how it was done** — under the police's nose while they look away, or several people in one combo? | Players named the missing prank chains and viewer rating in the remaster (I4) | Yes: a multiplier for a soaking made while an officer is in the yard |
| Q4 | **Should each visit have a short list of things to do** ("soak the courier twice and get away", "wreck the car while the police look") in place of an open yard? | The Goose game is its to-do list; "nothing to replay" is its complaint and ours (I3) | Three tasks a day, made from the date like the street; untested |
| Q5 | **Should one person a day be special — one attempt, gone tomorrow?** | Hitman's Elusive Targets were praised; alone they did not sell the game (I7) | Not yet: it needs players who return daily, and none has |
| Q6 | **Should the game keep the last ten seconds before «ЗАМЕТИЛИ» as a short clip to send**, drawn in the game's own pixels? | The Goose game and Hello Neighbor spread as clips of the moment of being caught (I5) | Worth a trial: a canvas recording works without a server; size and phone support are OPEN |
| Q7 | **Should the police remember** — a second call in one run bringing two officers, or a shorter time turned away? | GTA's levels escalate; Hello Neighbor's neighbour learned from the last attempt, and was praised in alpha (SOURCED) | Escalate within a run only; nothing carried between runs, so nothing is lost by coming back |
| Q8 | **Does hiding stay free of any limit?** A player can hide for ever; only the combo is lost | GTA IV made hiding a place to reach, not a button (SNIPPET) | Free and unlimited while it is untested by a person |
| Q9 | **Is this still one game?** The balcony game was "wreck my yard"; this is "do not be seen". Should the people be a fifth mode beside the four filters, or part of every run? | Hitman 2016: more forms of content did not by themselves make the product (I7) | Part of every run, until someone has played both ways |
| Q10 | **Are police and a fail state acceptable for the store listing**, on top of alcohol and drug names? | `feasibility.md` §4; Scary Teacher is rated 12+ with a caught-and-repeat loop (SNIPPET) | OPEN — the creator's decision, and an Apple reviewer's |

## Sources — opened 12 October 2026

1. Wikipedia, "Neighbours from Hell" — https://en.wikipedia.org/wiki/Neighbours_from_Hell
2. Wikipedia, "Untitled Goose Game" — https://en.wikipedia.org/wiki/Untitled_Goose_Game
3. Wikipedia, "Hello Neighbor" — https://en.wikipedia.org/wiki/Hello_Neighbor
4. Wikipedia, "Hitman (2016 video game)" — https://en.wikipedia.org/wiki/Hitman_(2016_video_game)
5. Vaporlens, summary of Steam reviews of *Neighbours back From Hell* — https://vaporlens.app/app/1283190/neighbours_back_from_hell.md

Seen only as search results (SNIPPET): Vaporlens on *Untitled Goose Game*
(https://vaporlens.app/app/837470/untitled_goose_game); Know Your Meme on *Hello Neighbor*
(https://knowyourmeme.com/memes/hello-neighbor); Common Sense Media on *Scary Teacher 3D*
(https://www.commonsensemedia.org/app-reviews/scary-teacher-3d); IO Interactive's press release on 75
million players (https://www.gamedeveloper.com/press-release/hitman-world-of-assassination-reaches-over-75-million-players-worldwide-increasing-its-status-as-the-most-successful-hitman-game-of-all-time);
Grand Theft Wiki, "Wanted Level in GTA IV Era" (https://www.grandtheftwiki.com/Wanted_Level_in_GTA_IV_Era).

The five opened pages were read through a summarising fetch; the quotations are as it returned them.
Source 5 is itself a machine summary of reviews: its numbers are shares of what it read, not counts.
No community forum or subreddit was read directly — that part of the request is **not done**.
