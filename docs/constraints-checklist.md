# DVOR-8 — constraint checklist

Companion to [constraints.md](constraints.md). That file argues the constraints; this file is the one you
**run**. Every row is a thing that can be checked, and every citation in it can be re-verified from the
procedure in §1.

Built 2026-10-11 against repo state `fc0c61a` (tag `v0.2.0`), then revised against `ac1bdd6` ("Go down into
the yard…"). Rows marked **REV** below changed in that revision; see `constraints.md` §7.

## Legend

| Mark | Meaning |
|---|---|
| `BUILT` | a check already exists and passes in `test.mjs` or `tools/check.mjs` |
| `PART` | partly enforced; the row says what is missing |
| `MISSING` | no check exists; must be written |
| `HUMAN` | cannot be automated; a person must do it |
| `N/A` | not a test — a claims or provenance rule |

---

# 1. How to re-verify a citation (do this before trusting a row)

The whole point of this work is that citations must be checkable. Procedure:

```bash
# A source is real only if you OPEN it. A snippet is not a source.

# HTML pages
curl -sL --max-time 45 -A "Mozilla/5.0" "<url>" -o /tmp/p.html ; head -c 500 /tmp/p.html

# PDFs — web_fetch refuses them, so fetch and parse
curl -sL --max-time 90 -A "Mozilla/5.0" "<url>" -o /tmp/p.pdf ; file /tmp/p.pdf   # must say "PDF"
python3 -c "from pypdf import PdfReader; r=PdfReader('/tmp/p.pdf'); \
print(len(r.pages)); print('\n'.join((p.extract_text() or '') for p in r.pages[:3]))"

# If the publisher returns 403 (ScienceDirect, SAGE, Springer, T&F, MIT, PsycNet all do),
# go through archive.org, Europe PMC, or an author/institutional copy — and say so.
curl -s --max-time 40 "https://api.crossref.org/works/<DOI>"   # does the DOI exist at all?
curl -s --max-time 40 "https://api.semanticscholar.org/graph/v1/paper/DOI:<DOI>?fields=title,abstract,year,venue,externalIds"
```

**Three rules that this run proved matter.**

1. **The DOI can be wrong while the author and year are right.** `10.1016/j.entcom.2020.100335` returns 404 —
   the real article number is `100359`. Always resolve the DOI.
2. **A number can be widely repeated and have no primary source.** "10–20 ms of hit pause" and "6 pixels of
   camera shake" appear in code, wikis and talks, and in no study.
3. **A paper can be famous for a claim it does not make.** Kahneman & Tversky 1979 does not contain the "2×"
   loss-aversion coefficient; the strings "loss aversion", "coefficient", "2.25" and "twice" are absent from
   its full text.

---

# 2. The checklist

## 2.1 Philosophical constraints

| # | Constraint | Check | Where | Status |
|---|---|---|---|---|
| P1 | The balcony is always visible; the elevated view is a reading, not the truth | Every rendered frame of play contains the foreground rail, in all four modes, through lean/sway/shake/focus | `test.mjs` + `tools/check.mjs`; assert rail pixels present in a frame captured per mode | `MISSING` |
| **P1-REV** | **The two knowledge-positions must not blur: on the balcony you see everything and touch nothing; down in the yard you touch it and cannot see it whole** | While walking, the scan overlay and the full-yard count are unavailable; from the balcony the walker's local view is not drawn | `test.mjs` | `MISSING` |
| P1b | The game does not claim the scan is the truth | Player-facing text never says the scan "sees everything", "knows", or "is accurate" | claims test | `N/A` |
| P2 | An unnamed thing is a reported finding | Completed scan reports both the named things **and** the count of candidate regions it could not name | `test.mjs` against demo yard + `tools/check.mjs` on a photo containing a bin/tree | `MISSING` |
| P2b | The apparatus is quantised and visible | Every drawn colour passes through the single quantise function | `test.mjs` (existing: "every pixel is a palette index") | `BUILT` |
| P3 | Pixelation slows recognition of a known place | Human names what is in the photograph, then names what is in the 8-bit frame; the second must be **no faster** | `tools/check.mjs` timed task, or a paper note | `HUMAN` |
| P4 | A mode changes what you can know or do | Every mode differs from sober in **both** the throw and the focus; no two modes share a hand | `test.mjs` ("every mode but sober changes BOTH the throw and the focus"; "no two modes put the same thing in the hand") | `BUILT` |
| P5 | No catharsis framing anywhere | Claims test fails on `venting`, `let off steam`, `blow off steam`, `stress relief`, `anger management`, `rage room`, `catharsis`, `calm down` in player-facing claims | claims test over `README.md`, `docs/concept.md`, `index.html` | `MISSING` |
| P6 | Safe, voluntary, known-unreal — all three hold together | One named test asserting (a) nothing is ever taken, (b) nothing is forced or timed, (c) every state returns to a clean yard in one action | `test.mjs` | `PART` (a and c exist separately; b is by construction) |
| P7 | Nothing in vain — every part states a reason | (a) every mode's `why` ≥ 40 chars; (b) every file in `src/` has a row in the reason table; (c) every named element in `index.html` is used | `test.mjs` (a exists); `test.mjs` for (b) and (c) | `PART` |
| P8 | People and animals are never targets; nothing is permanent | (a) excluded classes never become targets; (b) no player action survives «ЕЩЁ РАЗ»; (c) no photograph data leaves the device | `test.mjs` (a exists, incl. the merge returning nothing); (b) partly; (c) not asserted | `PART` |

## 2.2 Psychological constraints

| # | Constraint | Check | Where | Status |
|---|---|---|---|---|
| PS1 | The yard visibly changes because the player acted | A first hit changes the picture and the object stands; wreckage stays at the foot of the thing, not the bottom of the frame; the trace survives to the end state | `test.mjs` ("a first hit on a car dents and cracks it"; "what falls STAYS") | `BUILT` |
| PS2 | Autonomy is the asset — no goal, timer, life counter, fail state, or forced order | Regression guard that **fails** if any of these is introduced | `test.mjs` | `MISSING` |
| **PS2-REV** | **Goals are allowed; *losable* goals are not. No monotonic value may ever decrease** (best score, furthest walked, kinds ever wrecked, days ever visited) | A second `record(...)` call with worse numbers leaves every `makeAlbum` field unchanged; no streak resets, no record falls | `test.mjs` over `src/album.js` | `MISSING` |
| PS3 | No relatedness channel — say so, or build one | Whenever a player-facing claim mentions returning, a named channel appears beside it; otherwise the README states plainly that no return loop is claimed | claims test + README | `MISSING` |
| **PS3-REV** | **The channel now exists (`shareText` + an added photograph) — but it is design-defensible, not evidence-backed as a retention fix** | (a) sharing is never claimed to bring players back without a source; (b) every added photograph is an **external input to shared state**, so if it can reach another person, the no-data-leaves-device claim and the plate/face blurring requirement both bind — resolve explicitly | claims test + one explicit design note or test in `src/album.js` / `src/street.js` | `MISSING` |
| PS4 | Owned and authorised — never transgression | (a) targets are the player's own photographed objects; (b) no player-facing string uses `steal`, `get away`, `revenge`, `vandal`, `payback` | `test.mjs` (a, partly); claims test (b) | `PART` |
| PS5 | Feedback moderate and capped | (a) `SHAKE_MAX = 7` and per-event amounts within it; (b) many wrecks at once do not exceed it; (c) **normal play does not sit at the cap** | `test.mjs` (a, b exist) | `PART` |
| PS6 | Show completion progress; any head-start must be true | A yard-level readout reaches `m of m` **exactly when** `done` is true, never before; no object is pre-broken | `test.mjs` | `MISSING` |
| PS7 | Do not build a return loop on Zeigarnik / near-miss / 66-day / "2×" | Claims test: none of these is cited as the reason for a mechanic | claims test | `MISSING` |
| PS8 | Plain object nouns; no dehumanising vocabulary | Target labels in `src/objects.js` contain no `enemy`, `target practice`, `trash`, `junk`, `victim`, or collective nouns for people | `test.mjs` | `MISSING` |
| PS9 | Do not lean on the violent-media literature | Neither the README nor the concept cites it either to justify or defend | claims test | `MISSING` |

## 2.3 Repository defects to fix

| # | Item | Fix | Status |
|---|---|---|---|
| D1 | `docs/style.md` F15 tags Kao 2020 `SNIPPET` and mis-states the finding | Retag `SOURCED`; correct article number to **100359** (DOI `10.1016/j.entcom.2020.100359`); re-word to the abstract's own claim | `MISSING` |
| D2 | `docs/style.md` F12/D10 and the `src/fx.js` header present "10–20 ms" and "4–6 px" as if sourced | Relabel `CHOICE` with the tuning reason; the verified anchors are Sakurai's four frames + explicit cap, and Nijman's 30 tweaks / 33% chance | `MISSING` |
| D3 | Loss-aversion "2×" | Re-attribute to Tversky & Kahneman 1992 (median λ = 2.25, attested second-hand) or drop | `MISSING` |
| D4 | Habit "66 days" | If used: median 66, IQR 39–102, range 18–254, good-fit subgroup of 39 | `MISSING` |
| D5 | Zeigarnik cited as a completion driver | Use the Ovsiankina effect instead | `MISSING` |
| D6 | `docs/style.md` F16 MediaPipe threading claim | Re-open and re-confirm before quoting again | `MISSING` |
| D7 | `docs/feasibility.md` §1 competitor table | Keep `SNIPPET` labels; promote nothing to `SOURCED` without opening it | `N/A` |
| D8 | `docs/structure.md` sources 1–7 | All six used sources are Wikipedia pages read through a summarising fetch — a summary of a summary, and not a source under rule 1 | Replace the load-bearing ones (H5 now has Ghibellini & Meier 2025 and MacLeod 2020); keep the rest as leads only | `MISSING` |
| D9 | `docs/structure.md` §3 loops, §4 spectra | Every spectrum placement and collision is tagged `DERIVED` | Attach this file's sourced mechanism anchors (effectance, autonomy, benign masochism, goal gradient, ownership) | `MISSING` |
| D10 | `docs/structure.md` H7 vs `docs/feasibility.md` §4 problem 4 | A shareable result plus an added photograph implies a real place reaching another person, while `docs/concept.md` says the photograph never leaves the device | Resolve explicitly before any share path ships | `MISSING` |
| D11 | `src/news.js` (untracked) | Triggered a live failure of the project's own P7 check: *"every module is used by another… news.js"*. Reasons were added to `docs/concept.md` (clears the reasons check); the module is still imported by nothing, and its header describes behaviour the build does not have | Wire it into `main.js` (keeping the invents-nothing fallback), or delete it | `MISSING` — **the only failing check left: 108 pass, 1 fail** |

## 2.4 The two things no test can do

| # | Item | Who | Pass condition | Status |
|---|---|---|---|---|
| H1 | Five photographs from the real balcony (`docs/feasibility.md` §6, stage 0) | the creator | ≥ 3 real things found in 3 of 5 photographs after fixes | `HUMAN` |
| H2 | Recognisability: the 8-bit frame is not nameable faster than the photo | one person, timed | naming time after the scan ≥ naming time before it | `HUMAN` |
| H3 | Whether it is fun | anyone | — | `HUMAN` — **and no check in this file supplies it** |

---

# 3. Source re-verification table

Every citation used to justify a constraint, with what was opened and how. Re-run these before relying on a
row. `STATUS` uses the definitions in `constraints.md`.

## 3.1 Opened at full-text level

| Source | Opened how | Key verbatim | Status |
|---|---|---|---|
| de Certeau 1984, *Practice of Everyday Life*, ch. VII | PDF scan (14 pp., 64,047 chars) via `web.archive.org/web/2020/https://varenne.tc.columbia.edu/texts/decrtmich84pracever-Chapter7.pdf` | "a solar Eye, looking down like a god"; "the fiction of knowledge"; "an oblivion and a misunderstanding of practices" | `VERIFIED` |
| Flusser 1983/2000, *Towards a Philosophy of Photography* | OCR full text (174,971 chars), archive.org item `vilem-flusser-towards-a-philosophy-of-photography-ocr`; corroborated by O'Riley, *Flusser Studies* | "It is a black box"; "they are not windows but images"; "Photographers can only act within the program" | `VERIFIED` |
| Shklovsky 1917, «Искусство как прием» | RU transcription (MSU philology) + EN teaching copy (Warwick) | «делать камень каменным»; "make the stone stony"; "increase the difficulty and length of perception" | `VERIFIED` |
| Rozin et al. 2013, *Judgment and Decision Making* 8(4):439–447 | open-access PDF `journal.sjdm.org/12/12502a/jdm12502a.pdf` | "enjoyment of negative bodily reactions and feelings in the context of feeling safe"; "just below the level that cannot be tolerated" | `VERIFIED` |
| Kjærvik & Bushman 2024, *Clinical Psychology Review* 109:102414 | open access (CC BY-NC-ND) full text | "arousal-increasing activities were ineffective overall (g = −0.02)"; rage rooms coded as aggressive; "Popular wisdom suggests that venting reduces anger… but it does not." | `VERIFIED` |
| Kao 2020, *Entertainment Computing* 34:100359 | OpenAlex + Semantic Scholar + Crossref, identical text | "N = 3018"; "both None and Extreme… significantly decreased… relative to both Medium and High" | `VERIFIED` (abstract) |
| Zimbardo 1969, *Nebraska Symposium on Motivation* | Stanford Libraries scan, pp. 287–292 | "the Palo Alto car… emerged untouched"; "it was necessary to have… more explicit models for destruction" | `VERIFIED` |
| Ryan & Deci 2000, *American Psychologist* 55(1):68–78 | full PDF, `selfdeterminationtheory.org` | "three innate psychological needs--competence, autonomy, and relatedness" | `VERIFIED` |
| Ryan, Rigby & Przybylski 2006, *Motivation and Emotion* 30(4):344–360 | full PDF, Table 9, n = 730 | Autonomy β = .49** for enjoyment; relatedness only in the multiplayer study | `VERIFIED` |
| Przybylski, Rigby & Ryan 2010, *Review of General Psychology* 14(2):154–166 | full PDF | "the appeal and well-being effects of video games are based in their potential to satisfy basic psychological needs…" | `VERIFIED` |
| Kivetz, Urminsky & Zheng 2006, *JMR* 43(1):39–58 | author manuscript PDF | purchase acceleration near goal; illusion of progress; predicts retention | `VERIFIED` |
| Nunes & Drèze 2006, *JCR* 32(4):504–512 | author-uploaded full text via Internet Archive | "artificial advancement… greater persistence"; 34% vs 19%, χ²(1) = 8.1, p < .01 | `VERIFIED` |
| Lally et al. 2010, *EJSP* 40(6):998–1009 | full PDF via DSpace REST | median 66, IQR 39–102, range 18–254, good-fit subgroup of 39 | `VERIFIED` |
| Kahneman & Tversky 1979, *Econometrica* 47(2):263–291 | full JSTOR scan | "losses loom larger than gains"; **and the absence** of "loss aversion", "coefficient", "2.25", "twice" | `VERIFIED` |
| Bushman 2002, *PSPB* 28(6):724–731 | publisher-deposited abstract (Crossref) | "Doing nothing at all was more effective than venting anger." | `VERIFIED` (abstract) |
| Ferguson 2015, *Perspectives on Psych. Science* 10(5):646–666 | Europe PMC record | "influences on increased aggression (r = .06)… are minimal" | `VERIFIED` (abstract) |
| Hilgard, Engelhardt & Rouder 2017, *Psych. Bulletin* 143(7):757–774 | Europe PMC record | "substantial publication bias… effects… are estimated as being very small" | `VERIFIED` (abstract) |

## 3.2 Opened at abstract level only — do not quote the body

| Source | Why only the abstract | Status |
|---|---|---|
| White 1959, *Psychological Review* 66(5):297–333 | full text paywalled; "effectance motivation" is **not** in the verified abstract | `VERIFIED` (abstract) — quote only "the feeling of efficacy" |
| Bandura 1999, *PSPR* 3(3):193–209 | full text unobtainable; Europe PMC record used | `VERIFIED` (abstract) |
| Anderson et al. 2010, *Psych. Bulletin* 136(2):151–173 | no open-access full text exists anywhere; **no effect size in the abstract** | `VERIFIED` (abstract) |
| Han et al. 2023, IEEE ISMAR, 875–884 | peer-reviewed PDF at `arxiv.org/pdf/2308.13952` | `VERIFIED` |
| Clark et al. 2009, *Neuron* 61(3):481–490 | Europe PMC API abstract (HTML page Cloudflare-blocked) | `VERIFIED` (abstract) |
| Finserås et al. 2021, *IJMHA* 19(2):418–428 | OpenAlex abstract; publisher PDF behind a JS challenge | `VERIFIED` (abstract) |
| Beggan 1992, *JPSP* 62(2):229–237 | archived APA PsycNet record | `VERIFIED` (abstract) |
| Tanaka, Yasuhara & Mikami 2023 | abstract does **not** report the result; PDF restricted | `UNVERIFIED` — do not cite as evidence |
| Huang et al. — Kao corroboration, CHI '24 | CHI paper opened; quotes the goldilocks finding and warns the base is mixed | `VERIFIED` |
| Gruber, Ullman & Ahissar 2021, *PNAS* 118(34) | PMC full text | `VERIFIED` |
| Torralba 2009, *Visual Neuroscience* 26(1):123–131 | MIT author PDF ("in press") | `VERIFIED` |
| Bao 2023, *Int. J. Affective Engineering* 22(2):145–155 | J-STAGE PDF | `VERIFIED` |

## 3.3 Verified only inside a secondary source

| Source | Carried by | Status |
|---|---|---|
| Gombrich, *Art and Illusion*, p. 208 | Kopecky, E. H. Gombrich Archive (Warburg Institute) — confirms the Millennium Edition and that Part Three is "THE BEHOLDER'S SHARE" | `VERIFIED-SECONDARY` |
| Bartlett 1932, *Remembering*, p. 213 | Wagoner, *Routledge Handbook of the Philosophy of Memory* (2017) | `VERIFIED-SECONDARY` |
| Suits 2005, pp. 54–55 — lusory attitude | Arjoranta 2025, `jonne.arjoranta.fi/repository/Arjoranta2025a.pdf` | `VERIFIED-SECONDARY` |
| Bogost 2007 — procedural rhetoric | Oxford Bibliographies, "Video Games and Communication" | `VERIFIED-SECONDARY` |
| Müller, Schwieren & Spitzer — joint ownership reduces destruction | WU Vienna WP 238 (working paper; journal version *JBEE* 97:101798) | `VERIFIED-SECONDARY` |
| Swink 2009, *Game Feel* — "camera shake" | existence via Open Library (ISBN 9780123743282); the one sentence from a third-party lecture deck | `VERIFIED-SECONDARY` — **book itself unopened** |
| Tversky & Kahneman 1992, λ = 2.25 | Regenwetter, Robinson & Wang 2022, *AMPPS* 5(1) | `VERIFIED-SECONDARY` — paper itself unopened |

## 3.4 Do NOT use — no primary source, misattributed, or contradictory

| Claim | Why it is here |
|---|---|
| "10–20 ms of hit pause", "6 px of camera kick" | No primary source states either. Traces to code repos, a Valve wiki page and blogs. **Folklore.** |
| Loss aversion "losses loom 2× as large" attributed to Kahneman & Tversky 1979 | The 1979 full text does not contain it. Belongs to T&K 1992. |
| "66 days to form a habit" without qualification | Median for a good-fit subgroup of 39; IQR 39–102. The abstract does not state 66 at all. |
| Zeigarnik effect as a completion driver | "lacks universal validity"; weighted mean ratio 1.13. Use Ovsiankina. |
| Near-miss increases motivation, applied to games | Holds in gambling, gated by personal control; the one video-game test found the opposite. |
| "Miyazaki, aesthetics of pixel art" | **No such work exists.** Spurious — never cite it. |
| Proshansky et al. 1983 "sub-structure of self-identity" | No abstract exists in Crossref/OpenAlex/S2/Europe PMC; wording unverified. |
| Anderson et al. 2010 effect size r = .15 | Attributed to the paper by its critics; not confirmable inside it. |
| Bandura's "eight mechanisms" list attributed to the 1999 paper | The numbering comes from the 1996 JPSP paper, whose abstract was not obtainable. |
| MediaPipe `detect()` blocking the UI thread | From the docs, not re-verified this run. |
| "Any study showing game destruction generalises to real-world destruction" | **None found.** Do not assert either direction. |
| Wikipedia claims about the Zeigarnik effect / Wordle spread / IKEA effect | `docs/structure.md` D8. Encyclopaedia summaries, not sources. H5's actual claim is correct and now has primary backing; H7's Wordle figure does not. |

## 3.5 Leads closed in the revision (`constraints.md` §7.5)

`docs/structure.md` H5 marked these `OPEN` because the Wikipedia pages 404'd. The research existed.

| Lead | Primary source, opened | Status |
|---|---|---|
| Goal-gradient | Kivetz, Urminsky & Zheng 2006, *JMR* 43(1):39–58 — author manuscript PDF | `VERIFIED` |
| Endowed progress | Nunes & Drèze 2006, *JCR* 32(4):504–512, DOI `10.1086/500480` — full text; 34% vs 19%, χ²(1) = 8.1, p < .01 | `VERIFIED` |

Neither changes the design: the album already produces the visible near-goal state, and the endowed-progress
effect in its deceptive form is ruled out by `brief.md` Q8.

---

# 4. Running the checklist

```bash
cd /Users/m/DVOR-8

# 1. The checks that exist today
node test.mjs                                          # 70 checks, no browser
node --experimental-websocket tools/check.mjs out/ a.jpg   # real detector on a real photograph

# 2. Re-verify any citation before relying on it
#    see §1 — resolve the DOI, then open the page or the PDF

# 3. The claims tests, once written (task 2 in constraints.md §6)
node test.mjs --claims        # fails on any unsupported player-facing claim

# 4. What no command can do
#    H1  five photographs from the real balcony
#    H2  the recognition-latency task
#    H3  whether it is fun
```

**Order matters.** Fix the defects (D1–D7) before writing new checks, because the new checks cite the same
files. Then the claims tests, then the two behavioural checks, then the human work. Starting a later step
first just means re-doing it.
