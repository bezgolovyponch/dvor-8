# DVOR-8 — concrete constraints from the concept's philosophy and psychology

Built 2026-10-11 from repository state `fc0c61a` (tag `v0.2.0`). This file does the work that Runs B–D of the
Game Skeleton Master Prompt left empty: `sources.json`, `atoms.json`, `hooks.json` and `formula.md` were all
still at `_state: not started`, so the concept's philosophical and psychological core had never been
decomposed against evidence. It is decomposed here.

> **Note on state.** §1–§6 below were written against `fc0c61a`. The repository has since advanced to
> `ac1bdd6` ("Go down into the yard: walking, a street beyond the photograph, the bottle, an album"), which
> **changes three of the constraints below** — P1, PS2 and PS3. **Read §7 first**: it revises those three,
> replaces the thin sourcing in `docs/structure.md` with primary papers, and closes two leads that
> `structure.md` had to mark `OPEN`. Everything else in §1–§6 still stands.

Read `docs/concept.md` first for the game. This file says what the game **is allowed to claim**, what it
**must do**, and what it **must not say**.

## How to read this file

Every constraint has the same parts:

| Field | Meaning |
|---|---|
| **Statement** | the constraint, as a rule the project can break |
| **Ground** | the mechanism, and the source that carries it |
| **Evidence** | exactly what was opened, how, and the verbatim words relied on |
| **Status** | `VERIFIED` · `VERIFIED-SECONDARY` · `UNVERIFIED` · `REJECTED` |
| **Test** | a check that can fail. `[BUILT]` = already asserted in `test.mjs` or `tools/check.mjs`; `[MISSING]` = must be written |

**Status definitions.**

- `VERIFIED` — a page or PDF was opened in this run and the quoted words are in it.
- `VERIFIED-SECONDARY` — the words are real and quoted with a locator, but they were read inside a scholarly
  secondary source, not the primary book. Usable, with the caveat stated.
- `UNVERIFIED` — could not be opened. **Do not use it to justify a rule.**
- `REJECTED` — the claim is contradicted, misattributed, or has no primary source. **Do not use it, and if it
  is already in the repo, remove it.**

This follows rules 1–3 of the Master Prompt. A search snippet is not a source. Where a widely repeated number
turned out to have no primary source, that is recorded in §4 as a defect to fix, not quietly dropped.

---

# 1. The philosophical decomposition

The concept is not "a game about a yard". It is a specific epistemic situation — **a person on a balcony,
above a world they can see entirely and cannot touch, looking at that world through a machine that decides
what things are.** Every philosophical constraint below comes from that sentence.

## P1 — The balcony is a knowledge-position, and the game must be honest that it is one

**Statement.** The elevated view is not framing. It is the game's claim about how the player knows the yard,
and the game must not present that view as neutral or complete.

**Ground.** Michel de Certeau's analysis of the view from the 110th floor is literally the balcony position,
and it is hostile to it: the totalising view is a *fiction*, and it is bought by being cut off from the
practices below.

**Evidence.** de Certeau, M. (1984). *The Practice of Everyday Life*, Part III, ch. VII "Walking in the City",
trans. Steven Rendall, University of California Press. Primary text opened as a PDF scan (14 pp., 64,047
characters extracted) via the Internet Archive at
`https://web.archive.org/web/2020/https://varenne.tc.columbia.edu/texts/decrtmich84pracever-Chapter7.pdf`.
Verbatim, pp. 92–93:

> "To be lifted to the summit of the World Trade Center is to be lifted out of the city's grasp. One's body is
> no longer clasped by the streets that turn and return it according to an anonymous law… His elevation
> transfigures him into a voyeur. It puts him at a distance. It transforms the bewitching world by which one
> was 'possessed' into a text that lies before one's eyes. It allows one to read it, to be a solar Eye, looking
> down like a god. The exaltation of a scopic and gnostic drive: the fiction of knowledge is related to this
> lust to be a viewpoint and nothing more."

And, decisively for this game:

> "The panorama-city is a 'theoretical' (that is, visual) simulacrum, in short a picture, whose condition of
> possibility is an oblivion and a misunderstanding of practices."

**Status.** `VERIFIED`. (Optical-character-recognition artefacts in the scan — e.g. "lcarus" for "Icarus" —
are the scanner's, not the text's.)

**Test.** `[MISSING]` *the game never lets the player forget where they are standing*: the foreground rail is
drawn in every frame of play, and no camera state (lean, sway, shake, focus) removes it. A run of frames with
no rail fails.

**Why it binds.** The temptation is to read de Certeau as flattering the game — *you are the solar Eye*. It is
the opposite. De Certeau says that position is a **misunderstanding**, and that the people down below "live
'down below,' below the thresholds at which visibility begins" with a knowledge that is "as blind as that of
lovers in each other's arms". DVOR-8 gives the player the balcony and nothing else, so the honest move is to
keep the balcony visible and admit, in the game's own words, that the scan is a reading and not the truth.

## P2 — The scan is an apparatus, so an undetected thing is a finding, not an absence

**Statement.** The scan does not reveal the yard. It re-encodes the yard through a program with a fixed
vocabulary. Therefore the game must **report what it could not name**, as a first-class result, in the same
place it reports what it named.

**Ground.** Vilém Flusser's account of the camera as a *black box*: technical images are not windows on the
world but products of a program, and the operator controls only the input and output while being controlled by
an interior they cannot penetrate.

**Evidence.** Flusser, V. (1983/2000). *Towards a Philosophy of Photography*, trans. Anthony Mathews,
Reaktion Books. Full English text opened (174,971 characters) via the Internet Archive item
`vilem-flusser-towards-a-philosophy-of-photography-ocr`. Verbatim, "The Apparatus", p. 27:

> "It is a black box. It is precisely the obscurity of the box which motivates photographers to take
> photographs… This is precisely what is characteristic of the functioning of apparatuses: The functionary
> controls the apparatus thanks to the control of its exterior (the input and output) and is controlled by it
> thanks to the impenetrability of its interior."

Verbatim, "The Technical Image", p. 16:

> "they are not windows but images, i.e. surfaces that translate everything into states of things; like all
> images, they have a magical effect; and they entice those receiving them to project this undecoded magic onto
> the world out there."

Verbatim, "The Gesture of Photography", p. 38:

> "Photographers can only act within the program of the camera, even when they think they are acting in
> opposition to this program."

**Status.** `VERIFIED`. Corpus corroboration for the "metaprogram" sentence (same page, same wording) was also
opened: O'Riley, *Flusser Studies* — `https://www.flusserstudies.net/sites/www.flusserstudies.net/files/media/attachments/o-riley-the-unassimilable-image.pdf`, citing "(Flusser 2000: 29)".

**Test.** `[BUILT-partial]` *"the 'nothing recognised' card"* exists in `docs/concept.md` and the code names
only what the detector knows (`src/objects.js`, `TARGETS`; `src/detect.js` documents the 80 COCO classes and
that bins, trees, swings and doors are not in them). `[MISSING]` — **no test asserts that an unnamed thing is
counted and shown.** Write one: on a photograph containing a bin or a tree, the completed scan's summary names
the things it found *and* the number of candidate regions it could not name.

**Why it binds.** This is the difference between a game that lies about the world and one that shows you its
instrument. Flusser's whole point is that the apparatus's impenetrability is invisible unless it is made
visible. `docs/concept.md` already chose the honest branch ("rather than inventing targets"); this constraint
extends it from *inventing nothing* to *reporting the gap*.

## P3 — The 8-bit rendering must defamiliarise, which is a measurable effect and not a style note

**Statement.** Pixelating the yard must **slow recognition of a place the player already knows**. It is not
enough that the picture is made of squares. If the player recognises their yard as fast after the scan as
before it, the central transformation has failed.

**Ground.** Viktor Shklovsky's *ostranenie*: the purpose of the device is to make the familiar unfamiliar and
to *lengthen* perception, because perception is "an aesthetic end in itself and must be prolonged".

**Evidence.** Shklovsky, V. (1917). «Искусство как прием» / "Art as Technique". Opened in two independent
transcriptions — Russian, `https://discours.philol.msu.ru/wp-content/uploads/2018/09/Виктор-Шкловский.-Искусство-как-прием.pdf`
(MSU philology department, print of opojaz.ru/manifests/kakpriem.html), and English, University of Warwick
teaching copy. Verbatim (Russian):

> «И вот для того, чтобы вернуть ощущение жизни, почувствовать вещи, для того, чтобы делать камень
> каменным, существует то, что называется искусством. Целью искусства является дать ощущение вещи, как
> видение, а не как узнавание; приемом искусства является прием „остранения“ вещей и прием затрудненной
> формы, увеличивающий трудность и долготу восприятия…»

Verbatim (English):

> "And art exists that one may recover the sensation of life; it exists to make one feel things, to make the
> stone stony. The purpose of art is to impart the sensation of things as they are perceived and not as they
> are known."

**Status.** `VERIFIED` in both languages. Caveat: transcriptions, not a scan of the 1917 print. Do not conflate
Russian «остранение» with Brecht's «Verfremdung».

**Corroborating perceptual evidence.** The "lengthening" is not a metaphor, it is measurable. Gruber, Ullman &
Ahissar (2021), "Oculo-retinal dynamics can explain the perception of minimal recognizable configurations",
*PNAS* 118(34):e2022792118, `https://pmc.ncbi.nlm.nih.gov/articles/PMC8403836/` — `VERIFIED`, verbatim:

> "The recognition rates of MIRCs (80 ± 4%) and subMIRCs (24 ± 4%)…"

with the reported finding that recognising these degraded patches "typically requires >2 s of viewing" against
<300 ms for full images. And Torralba, A. (2009), "How many pixels make an image?", *Visual Neuroscience*
26(1):123–131, `http://people.csail.mit.edu/torralba/publications/howmanypixels.pdf` — `VERIFIED`, verbatim:

> "very small thumbnail images at the spatial resolution of 32x32 color pixels provide enough information to
> identify the semantic category of real world scenes… this low resolution permits observers to report, with
> 80% accuracy, 4-5 of the objects that the scene contains"

**Test.** `[BUILT-partial]` the picture is 192×256 (`test.mjs`: *"the picture is the size of an 8-bit console
screen"*), most of the palette is in use, and the yard's own colours survive (*"a red car is red"*, *"a blue
car is blue"*, *"a green tree is green"*). `[MISSING]` a **recognition-latency** check: the stylised frame must
not be nameable faster than the source photograph. Practical form: a timed naming task in `tools/check.mjs`
(the human names what is in the photo, then names what is in the 8-bit frame) with the failure condition
"recognised no slower after the scan".

**Note on the resolution spec.** 192×256 is roughly 48× the pixel budget of the 32×32 condition that already
yields 80% object reporting, and well above the MIRC cliff. So resolution is not the binding constraint — the
*stylisation* is what defamiliarises. No study states 192×256; that number remains the project's `CHOICE`.

## P4 — The transformation is the game's argument: choosing is a claim about the yard, not a filter

**Statement.** A mode that only changes colour is decoration and is already forbidden by rule 12 ("nothing in
vain"). The philosophical version is sharper: if the player can choose how to see the yard, **the choice must
change what they can know or do**, because that is what makes the game an argument rather than a palette.

**Ground.** Ian Bogost's *procedural rhetoric*: games argue through their rules and processes, not through
their text or images.

**Evidence.** Bogost, I. (2007). *Persuasive Games: The Expressive Power of Videogames*, MIT Press. The
book's concept is attested by an opened scholarly bibliography — Oxford Bibliographies, "Video Games and
Communication", `https://www.oxfordbibliographies.com/display/document/obo-9780199756841/obo-9780199756841-0202.xml`
— verbatim: "Bogost defined 'procedural rhetoric' as argumentation or persuasion through procedures or rules".
**Status.** `VERIFIED-SECONDARY` — the definition is real and located, but Bogost's own page was not opened in
this run. **Do not quote Bogost directly until a primary page is opened.**

**Test.** `[BUILT]` this is the strongest existing enforcement in the project and it already matches the
constraint: `test.mjs` asserts *"every mode but sober changes BOTH the throw and the focus"*, *"no two modes
put the same thing in the hand"*, and *"every mode says what is in the hand, how to use it, and why it
exists"*. `docs/style.md` records the failure this came from ("Filters were decoration").

**Why it binds.** P4 turns P3 into a rule with teeth. Under Shklovsky the picture must be *harder to know*;
under Bogost the way it is harder must be *the player's choice*, or the difficulty is a screensaver.

## P5 — The destruction must not be framed as catharsis, and the game must say so

**Statement.** DVOR-8 may not be described, in the README, the concept, the store page or anywhere else, as
"letting off steam", "venting", "stress relief", "anger management", or "a rage room in your pocket".

**Ground.** Catharsis theory is contradicted by the strongest evidence available, and a peer-reviewed study of
a **VR smash room** — the closest published analogue to this game — found it did not relieve stress and may
have made participants angrier.

**Evidence.** Kjærvik, S. L., & Bushman, B. J. (2024). "A meta-analytic review of anger management activities
that increase or decrease arousal: What fuels or douses rage?" *Clinical Psychology Review* 109:102414.
DOI `10.1016/j.cpr.2024.102414`. Open access, full text opened. Verbatim abstract:

> "arousal-decreasing activities decreased anger and aggression (g = −0.63, [−0.82, −0.43])... In contrast,
> arousal-increasing activities were ineffective overall (g = −0.02, [−0.13, 0.09])... These findings do not
> support the ideas that venting anger or going for a run are effective anger management activities."

Scale: 154 research reports, 184 independent samples, 10,189 participants. Critically, §6.4.1 **explicitly
codes "breaking objects in a rage room"** as an aggressive arousal-increasing activity; §8.2.4.1 gives
aggressive activities g = −0.03 [−0.12, 0.05], k = 31 (ns) and "punching or kicking an object" g = −0.13
[−0.30, 0.03], k = 7 (ns). Publisher highlight: *"Popular wisdom suggests that venting reduces anger and
aggression, but it does not."*

Corroborating: Bushman, B. J. (2002). "Does Venting Anger Feed or Extinguish the Flame?" *PSPB* 28(6):724–731,
DOI `10.1177/0146167202289002` — `VERIFIED` (publisher-deposited abstract), verbatim:

> "Rumination increased rather than decreased anger and aggression. Doing nothing at all was more effective
> than venting anger. These results directly contradict catharsis theory."

Corroborating for the specific smash-room case: Han, Kim, Kim & Cho (2023), IEEE ISMAR 2023, 875–884, DOI
`10.1109/ISMAR59233.2023.00103`, `https://arxiv.org/pdf/2308.13952` — **VERIFIED** (peer-reviewed PDF opened),
on a VR Smash Room: breaking objects "may not be the best way to relieve stress… possibly make the users
angrier and more aggressive", with VR Meditation outperforming the Smash Room for stress relief.

**Status.** `VERIFIED`.

**Test.** `[MISSING]` a **claims test**: a check over `README.md`, `docs/concept.md` and `index.html` that fails
if any of the strings `venting`, `let off steam`, `blow off steam`, `stress relief`, `anger management`,
`rage room`, `catharsis`, `calm down` appears in a claim about what the player gets. The word may appear in
this constraints file and in the rejection list, which is why the test must scope itself to player-facing
claims.

**Correction of record.** The nuanced honest version of the meta-analysis is a **null**, not a reversal: the
paper does *not* show venting makes you angrier on average. Press coverage saying so overstates it. Also note
the frequently mis-quoted g = −0.63 belongs to arousal-**decreasing** activities (walking, meditation), not to
venting. Do not repeat either error.

## P6 — The pleasure is benign masochism, and it has three conditions that must all hold

**Statement.** The destruction is enjoyable only while it is **safe, voluntary, and known to be unreal**. All
three are design surface, not decoration: if any one fails, the mechanism is gone and the game becomes either
frightening or cruel.

**Ground.** Rozin et al.'s *benign masochism*: enjoyment of negative experience in the context of feeling safe.

**Evidence.** Rozin, P., Guillot, L., Fincher, K., Rozin, A., & Tsukayama, E. (2013). "Glad to be sad, and
other examples of benign masochism." *Judgment and Decision Making* 8(4):439–447. Open access PDF opened,
`https://journal.sjdm.org/12/12502a/jdm12502a.pdf`. Verbatim, abstract p. 439:

> "We explain these findings in terms of benign masochism, enjoyment of negative bodily reactions and feelings
> in the context of feeling safe, or pleasure at 'mind over body'. In accordance with benign masochism, for
> many people, the favored level of initially negative experiences is just below the level that cannot be
> tolerated."

And §1:

> "Benign masochism refers to enjoying initially negative experiences that the body (brain) falsely interprets
> as threatening. This realization that the body has been fooled, and that there is no real danger, leads to
> pleasure derived from 'mind over body.' This can also be framed as a type of mastery."

**Status.** `VERIFIED`. Note the paper's own hedge — "**for many people**" — so this is a majority mechanism,
not a universal one; the game must not assume every player feels it.

**Test.** `[BUILT-partial]` all three conditions are already enforced somewhere, but never as one rule:
*safe* — `test.mjs` *"nothing in any mode takes anything away from the player"* (every mode has damage ≥ 1 and
combo ≥ 2.5) and the photograph never leaves the device; *voluntary* — no timer, no forced goal, the player
chooses every target; *known-unreal* — `"«ЕЩЁ РАЗ» is a clean yard: same things, nothing broken, no score"`.
`[MISSING]` one test naming the three conditions together, and asserting that **restoration is reachable in
one action from every state**, because "no real danger" is only true if nothing is permanent.

**Why it binds.** P6 is what replaces P5. The game's pleasure is *mastery over a fake threat* (Rozin: "This can
also be framed as a type of mastery"), which is exactly why the catharsis frame is both wrong and unnecessary.

## P7 — "Nothing in vain" is the project's only aesthetic criterion, and it is teleological

**Statement.** A part is justified by the effect it produces in the player, not by the fact that it exists.
"It looks better" is not a reason. This is already rule 12 of the Master Prompt and the first rule of
`docs/concept.md`; the constraint here is that it is **the** criterion, with no appeal to polish.

**Ground.** This is an Aristotelian teleology applied to a build: every component has a final cause, and the
final cause is stated in words the player would recognise. The Master Prompt states it; the project already
tests it.

**Evidence.** Creator-authored and project-authored, not external scholarship: `brief.md` Q9/Q10, and
`docs/concept.md` "The rule everything is held to: nothing in vain". Also Master Prompt rule 12: *"Every part
of the game… records a `reason`: what the player gets from it, in one sentence the player would recognise. A
part with no reason is removed, not kept for later. A part that only decorates… counts as having no reason."*
**Status.** `CREATOR` — binding because the creator set it, not because a paper supports it. Recorded here so
that it is not re-litigated as a matter of taste.

**Test.** `[BUILT]` every source module carries a written reason in `docs/concept.md`, and the test suite
asserts each mode's `why` field is longer than 40 characters and that every mode differs from sober in both
throw and focus. `[MISSING]` the reason table in `docs/concept.md` is prose, and nothing mechanically fails
when a module is added to `src/` without a row. Write the check: every file in `src/` appears in the reason
table, and every named element in `index.html` is used by the game.

## P8 — What the game destroys is a real person's place, so reversibility is an ethical requirement

**Statement.** The player is wrecking **their own** yard, or their neighbour's, photographed from where they
live. The game must therefore guarantee that nothing it shows is permanent, that no real object is affected,
and that no named person or animal can ever be a target.

**Ground (a) — ownership makes the act authorisation, not vandalism.** Beggan's *mere ownership effect*: people
value an object more merely because they own it. DVOR-8's targets are the player's own surroundings, which is
what makes the act sovereign rather than destructive.

**Evidence (a).** Beggan, J. K. (1992). "On the social nature of nonsocial perception: The mere ownership
effect." *JPSP* 62(2):229–237. Opened via an archived APA PsycNet record. Verbatim:

> "Three experiments investigated whether Ss would evaluate an object more favorably merely because they owned
> it… Study 1 confirmed the existence of this mere ownership effect."

**Status.** `VERIFIED`.

**Ground (b) — real-world destruction needs a real-world model, which this game does not supply.** Zimbardo's
abandoned-car field studies are the standard citation for "disorder spreads", and they cut *against* the
premise that smashing things in a game licenses smashing things in life: the Palo Alto car was left untouched,
and destruction only began after the researchers themselves modelled it with a sledgehammer.

**Evidence (b).** Zimbardo, P. G. (1969/1970). "The Human Choice: Individuation, Reason, and Order versus
Deindividuation, Impulse, and Chaos." *Nebraska Symposium on Motivation 1969*, 237–307, pp. 287–292. Primary
scan opened, `https://stacks.stanford.edu/file/druid:wr264wd2891/1966_Human_Choice.pdf`. Verbatim:

> "In startling contrast, the Palo Alto car not only emerged untouched, but when it began to rain, one
> passerby lowered the hood so that the motor would not get wet!"

and

> "First of all, there is considerable reluctance to take that first blow… But it feels so good after the
> first smack that the next one comes more easily… Once one person had begun to wield the sledge hammer, it
> was difficult to get him to stop."

The researchers' own conclusion is that "it was necessary to have more extreme releaser cues, more explicit
models for destruction". **Status.** `VERIFIED`, with caveats: a symposium chapter, self-described
"preliminary studies", no statistics or N, and the null Palo Alto arm is routinely omitted when this study is
cited.

**Ground (c) — the honesty requirement.** No study was found showing that destroying objects in a simulation
generalises to real-world destruction. That absence is reported rather than filled.

**Status (c).** `UNVERIFIED` — and this is a **finding**: the search is recorded in §5. Do not claim either
that the game is safe *because* studies show no transfer, or that it is risky *because* studies show transfer.
Neither claim has a source.

**Test.** `[BUILT]` *"people and animals are never targets"* (asserted directly, including that `person`,
`dog`, `cat`, `bird`, `horse` are not in `TARGETS` and that merging them returns nothing). `[MISSING]` the
permanence guarantee as a test: *"nothing the player did survives «ЕЩЁ РАЗ»"* — already partly covered by the
clean-yard assertion, but it must also cover the no-photograph-leaves-device claim, which is currently
documented rather than asserted.

---

# 2. The psychological decomposition

The mechanism chain the concept actually runs on, in order. Each step is a constraint.

## PS1 — The core mechanism is effectance, and the yard must visibly change because the player acted

**Statement.** The reward is not points. It is **the feeling of efficacy**: something in the world is
different because I touched it. Every hit must leave a visible, persistent trace.

**Ground.** White's competence/effectance motivation, and the three-need model it became part of.

**Evidence.** White, R. W. (1959). "Motivation reconsidered: The concept of competence." *Psychological
Review* 66(5):297–333. Abstract opened via the Ovid journal record. Verbatim:

> "Theories of motivation built upon primary drives cannot account for playful and exploratory behavior. The
> new motivational concept of 'competence' is introduced indicating the biological significance of such
> behavior. It furthers the learning process of effective interaction with the environment. While the purpose
> is not known to animal or child, an intrinsic need to deal with the environment seems to exist and
> satisfaction ('the feeling of efficacy') is derived from it."

**Status.** `VERIFIED` at abstract level. **Caveat: the coined term "effectance motivation" does NOT appear in
the abstract that was opened, and the full text is paywalled — so do not attribute the phrase to White as a
quote.** The verified wording is "the feeling of efficacy".

Corroborating: Ryan, R. M., & Deci, E. L. (2000). *American Psychologist* 55(1):68–78, DOI
`10.1037/0003-066X.55.1.68` — `VERIFIED` (full PDF opened), verbatim:

> "The findings have led to the postulate of three innate psychological needs--competence, autonomy, and
> relatedness--which when satisfied yield enhanced self-motivation and mental health and when thwarted lead to
> diminished motivation and well-being."

**Test.** `[BUILT]` this is already the project's best-covered claim: *"a first hit on a car dents and cracks
it: the picture changes, the car stands"* and *"what falls STAYS, at the foot of the thing it came off — not at
the bottom of the photograph"*. `[MISSING]` a test that the trace is still there **after** the yard is
finished, i.e. the end state is a record and not a reset.

## PS2 — Autonomy is the strongest measured predictor of enjoyment, so the no-goal design is a finding and not a gap

**Statement.** The absence of a score goal, of loss, and of any forced order is **the design's strongest
evidence-backed feature**, not the hole that `docs/feasibility.md` treats it as. It must not be "fixed" by
adding a goal.

**Ground.** In the largest SDT game study, in-game **autonomy** was the strongest single predictor of
enjoyment — stronger than competence, and far stronger than relatedness.

**Evidence.** Ryan, R. M., Rigby, C. S., & Przybylski, A. (2006). "The motivational pull of video games: A
self-determination theory approach." *Motivation and Emotion* 30(4):344–360, DOI `10.1007/s11031-006-9051-8`.
Full PDF opened from `selfdeterminationtheory.org`. Study 4, Table 9, n = 730 — verbatim statistics:

| Outcome | F | R² | Competence β | **Autonomy β** | Relatedness β |
|---|---|---|---|---|---|
| Enjoyment | 97.37** | .45 | .24** | **.49**** | .12** |
| Future play | 10.91 | .10 | .14** | .15** | .12** |

Yee's achievement, social and immersion motives did **not** reach significance for either outcome. Study 3
(multilevel) found enjoyment predicted by autonomy β = .55, p < .01 and competence β = .35, p < .01.

**Status.** `VERIFIED`.

**Test.** `[BUILT-partial]` *"nothing in any mode takes anything away from the player"*, *"a combo runs out on
its own; nothing is taken away when it does"*, and the player chooses every target. `[MISSING]` a **regression
guard**: a test that fails if a score goal, a timer, a life counter, a fail state or a mandatory order is ever
introduced. Without it, the next iteration "improves" the game by adding the thing the evidence says to avoid.

## PS3 — A single-player build has no relatedness channel, so "no reason to come back" is structural

**Statement.** DVOR-8 cannot satisfy relatedness in its present form. That is not a content gap to be filled
with more objects; it is a missing *channel*. Either add a channel that connects two people, or state plainly
in the README that this is a single-session toy.

**Ground.** In the SDT game data, relatedness was only measurable once multiplayer was involved, and the
meta-analytic model treats the three needs as independent contributors. A single-player game with no other
person in it has no verified relatedness path.

**Evidence.** Same source as PS2: Ryan, Rigby & Przybylski 2006 — "*Study 4 surveys an on-line community with
experience in multiplayer games.*" Relatedness β = .12** for enjoyment and .12** for future play, in the only
study with a multiplayer sample. Corroborating: Przybylski, A. K., Rigby, C. S., & Ryan, R. M. (2010). "A
motivational model of video game engagement." *Review of General Psychology* 14(2):154–166, DOI
`10.1037/a0019440` — `VERIFIED` (PDF opened), verbatim:

> "both the appeal and well-being effects of video games are based in their potential to satisfy basic
> psychological needs for competence, autonomy, and relatedness."

**Status.** `VERIFIED` for the mechanism; `DERIVED` for the application to DVOR-8.

**Test.** `[MISSING]` an honest claim in the README: if no channel exists, the README says "there is no reason
to come back and this build does not claim one". A test asserts that whenever the string `come back` or
`return` appears in a player-facing claim, a named channel appears beside it.

**Note.** `docs/feasibility.md` already names this as problem 1 and 2 and proposes "play my street" as the
Wordle-shaped answer. This constraint says what that proposal actually is in mechanism terms: **it is the
relatedness channel, and it is the only one on the table.**

## PS4 — Destroying your own yard is authorised by ownership; do not design it as transgression

**Statement.** The fiction is *I can do this because it is mine*, not *I am getting away with something*.
Targets are the player's own surroundings; nothing is stolen, trespassed, or taken from anyone.

**Ground.** The mere ownership effect (P8a) plus the SDT autonomy finding (PS2): ownership is the licence, and
autonomy is what makes exercising it pleasurable. Transgression would import a threat, which P6 forbids.

**Evidence.** Beggan 1992 (`VERIFIED`, quoted at P8a). Contrast case that supports the rule: Müller,
Schwieren & Spitzer's destruction game, in which **"a framing emphasizing joint ownership of the item that can
be destroyed reduces destruction almost to zero"** — reported from a WU Vienna working paper (WP 238) and
published in *Journal of Behavioral and Experimental Economics* 97:101798. *In that game the participants
destroy other people's incomes, which is precisely the transgression DVOR-8 must not have.* **Status.**
`VERIFIED-SECONDARY` — read in the working paper, not the journal version.

**Test.** `[BUILT-partial]` targets are real detected objects in the player's own photograph; people and
animals are excluded; nothing is scored by harm. `[MISSING]` a check that no player-facing string frames the
act as trespass, theft, revenge, or getting away with something (`steal`, `get away`, `revenge`, `vandal`,
`payback`).

## PS5 — The evidence for juice says "some, not more" — DVOR-8's moderation is correct and its numbers are unsourced

**Statement.** Feedback must be **moderate and capped**. This is already the project's choice, and the
strongest available study supports it. But the specific figures the project uses are not supported by any
source, and one citation is wrong.

**Ground.** Kao's four-condition study found **both** none and extreme juiciness worse than medium and high.

**Evidence.** Kao, D. (2020). "The effects of juiciness in an action RPG." *Entertainment Computing*
34:**100359**. DOI `10.1016/j.entcom.2020.100359`. Verified against Crossref, OpenAlex and Semantic Scholar,
which returned an identical abstract. Verbatim:

> "In this paper, we perform a study (N = 3018) in which we compare four identical versions of an action
> role-playing game with varying amounts of juiciness: (1) None; (2) Medium; (3) High; and (4) Extreme. We
> find that both None and Extreme amounts of juiciness lead to significantly decreased play time,
> significantly decreased player experience, significantly decreased intrinsic motivation, and significantly
> decreased performance relative to both Medium and High."

**Status.** `VERIFIED` at abstract level. Full text not obtained (ScienceDirect returned HTTP 403 on both the
article and the PDF); **no F, p, or effect size is verified** — do not cite one.

Independent peer-reviewed corroboration, opened: Kao, Ballou, Gerling, Breitsohl & Deterding (2024), CHI '24,
DOI `10.1145/3613904.3642656` — verbatim: "in a large between-subjects online study (n=3,018), Kao found
evidence for a goldilocks effect: juiciness significantly affected competence, autonomy, presence/immersion,
as well as interest/enjoyment, playtime, and performance; however, medium and high juiciness conditions
outperformed low and extreme juiciness across all these measures". **But that same paper calls the juiciness
evidence base "mixed results, high measurement and operationalisation variance, low statistical power, and
exploratory effect searching", and its own new experiment (n=1,699) found amplification *unexpectedly reduced*
motives.** So: the direction is supported; the curve is **not settled consensus**.

**Test.** `[BUILT]` *"many wrecks at once do not shake the picture off the screen"*, `SHAKE_MAX = 7`,
`HIT_PAUSE = 0.03`, `BREAK_PAUSE = 0.09`, and *"the amounts are deliberately moderate"* in `src/fx.js`. The
moderation is enforced. `[MISSING]` a test that the **upper** bound is a ceiling and not a target — i.e. that
no tuning pass has pushed any effect to the cap in normal play.

**Defect to fix.** `docs/style.md` F15 cites "Kao, *Entertainment Computing* 34, 2020" as a **SNIPPET** (the
paper was never opened) and states the finding as "both Medium Juiciness and High Juiciness outperform No
Juiciness and Extreme Juiciness **across all measures**" — a sentence that is *not in the verified publisher
abstract*, though it is corroborated in the CHI '24 paper. F15 must be upgraded from `SNIPPET` to `SOURCED`
with the correct DOI (`…100359`, not `…100335`) and re-worded to the abstract's own claim.

## PS6 — Show completion progress, and make any head-start true

**Statement.** "Wreck everything in the yard" is a completable goal and the game does not show progress
toward it. It should. If the game ever shows progress the player did not earn, that is deception and it is
refused.

**Ground.** The goal-gradient hypothesis — effort accelerates as the goal approaches — and the endowed
progress effect, which works but works by reframing.

**Evidence (goal gradient).** Kivetz, R., Urminsky, O., & Zheng, Y. (2006). "The goal-gradient hypothesis
resurrected." *Journal of Marketing Research* 43(1):39–58. Author manuscript PDF opened. Verbatim:

> "(a) participants in a real café reward program ('buy ten coffees, get one free') purchase coffees more
> frequently the closer they are to earning a free coffee… (c) the illusion of progress toward the goal
> likewise induces purchase acceleration… and (d) a stronger tendency to accelerate toward the reward predicts
> greater retention and faster reengagement in the program."

**Status.** `VERIFIED` (author manuscript; pagination is the manuscript's).

**Evidence (endowed progress) — with the ethical limit.** Nunes, J. C., & Drèze, X. (2006). "The endowed
progress effect." *Journal of Consumer Research* 32(4):504–512, DOI `10.1086/500480`. Verbatim:

> "people provided with artificial advancement toward a goal exhibit greater persistence toward reaching the
> goal… The effect appears to depend on perceptions of task completion rather than a desire to avoid wasting
> the endowed progress."

Field result: **34% completion versus 19%**, χ²(1) = 8.1, p < .01. **Status.** `VERIFIED`.

**The constraint this creates.** The mechanism "depend[s] on perceptions of task completion". An *undeclared*
fake head-start is therefore a deception mechanism. DVOR-8's ethics line (Q8) forbids punishing loss and paid
randomness, and rule 12 forbids decoration. So: **progress must be shown, and it must be true.** A visible
count of what remains is honest framing; a pre-broken object that the player did not break is not.

**Test.** `[BUILT-partial]` `MAX_TARGETS = 14`, targets carry pips showing remaining hits, and
*"wrecking everything ends the yard"* fires when `left(w) === 0`. `[MISSING]` a **progress readout** of the
yard as a whole (`n of m wrecked`) and a test that it reaches `m of m` exactly when `done` is true — never
before.

**Honest limit.** Progress display is *consumer-behaviour* evidence, not games evidence. It is a defensible
lever, not a measured retention fix.

## PS7 — Do not build a return loop on this literature; there isn't one that supports it

**Statement.** No constraint here requires a daily loop, a streak, or a habit mechanism. Adding one would be
unsupported by the sources that were verified.

**Ground.** The popular "66 days to form a habit" is misquoted, the Zeigarnik effect does not replicate, the
near-miss effect does not transfer to video games, and no peer-reviewed source was found that explains why
players return to a *game* across days.

**Evidence — the four failures.**

1. **Zeigarnik.** Zeigarnik, B. (1927), *Psychologische Forschung* 9:1–85. Original not openable. Modern
   state, Ghibellini & Meier (2025), *Humanit. Soc. Sci. Commun.* 12:962 — `VERIFIED`, verbatim: "We found no
   memory advantage for unfinished tasks but found a general tendency to resume tasks… the Zeigarnik effect
   lacks universal validity." MacLeod (2020), *Memory & Cognition* 48:1073–1088: weighted mean IR/CR = 1.13
   (1.09 excluding Zeigarnik's own data), and "Of the studies which were intended to show a Zeigarnik effect,
   less than half actually did so". **What survives is the Ovsiankina effect — the tendency to *resume*
   interrupted tasks.** If a completion driver is wanted, that is the defensible one, not Zeigarnik.
2. **Near-miss.** Clark, L., Lawrence, A. J., Astley-Jones, F., & Gray, N. (2009). *Neuron* 61(3):481–490 —
   `VERIFIED`, verbatim: "near-misses were experienced as less pleasant, but increased desire to play. This
   effect was restricted to trials where the subject had personal control." The one non-gambling video-game
   test found the **opposite**: Finserås et al. (2021), *Int. J. Mental Health & Addiction* 19(2):418–428,
   DOI `10.1007/s11469-019-00070-9` — "Participants felt more bored and less excited when they experienced a
   near miss compared to winning by a large margin." **Do not transfer the gambling effect.**
3. **Habit.** Lally, P., van Jaarsveld, C. H. M., Potts, H. W. W., & Wardle, J. (2010). *EJSP* 40(6):998–1009,
   DOI `10.1002/ejsp.674`. Full text opened. The honest figures: **median 66 days, IQR 39–102, range 18–254,
   in a good-fit subgroup of 39** (96 recruited → 82 with adequate data → model fitted for 62). The abstract
   contains no "66 days" at all. **The number is widely misquoted; if it is used, it must be used with the IQR
   and the subgroup.**
4. **Loss aversion's "2×".** Kahneman & Tversky (1979), *Econometrica* 47(2):263–291 — full scan opened. The
   qualitative claim is there ("losses loom larger than gains", p. 279), but the strings "loss aversion",
   "coefficient", "2.25" and "twice" **do not occur in the paper**. The λ ≈ 2 / 2.25 coefficient belongs to
   Tversky & Kahneman (1992), *J. Risk & Uncertainty* 5:297–323 — which could not be opened, so the figure is
   attested second-hand via Regenwetter, Robinson & Wang (2022), *AMPPS* 5(1), DOI
   `10.1177/25152459221074653`. **Re-attribute or drop it.** DVOR-8's Q8 forbids loss-based hooks anyway, so
   the game needs this number for nothing.

**Status.** `REJECTED` for all four as design justifications.

**Test.** `[MISSING]` a claims check: no player-facing or design string may cite Zeigarnik, near-miss, the
66-day figure, or a "2×" loss-aversion coefficient as a reason for a mechanic.

## PS8 — The power fantasy must not use the vocabulary of dehumanisation

**Statement.** The game names what it wrecks. Those names must be **plain nouns for objects**. No enemy
framing, no us-and-them framing, no euphemism that makes the act sound clean.

**Ground.** Bandura's moral disengagement: disengagement proceeds through *sanitizing language*, *advantageous
comparison*, *diffusion/displacement of responsibility*, and *dehumanization*. A game that wrecks things can
avoid all four by naming exactly what is there, and DVOR-8 already does this better than most ("a car is a
car").

**Evidence.** Bandura, A. (1999). "Moral Disengagement in the Perpetration of Inhumanities." *PSPR* 3(3):193–209,
DOI `10.1207/s15327957pspr0303_3`. `VERIFIED` (abstract, via the Europe PMC publisher-deposited record).
Verbatim:

> "The moral disengagement may center on the cognitive restructuring of inhumane conduct into a benign or
> worthy one by moral justification, sanitizing language, and advantageous comparison; disavowal of a sense of
> personal agency by diffusion or displacement of responsibility; disregarding or minimizing the injurious
> effects of one's actions; and attribution of blame to, and dehumanization of, those who are victimized."

**Status.** `VERIFIED` at abstract level. The named mechanisms: moral justification; sanitizing language
(euphemistic labelling); advantageous comparison; diffusion of responsibility; displacement of responsibility;
disregarding/minimizing injurious effects; attribution of blame; dehumanization. **The numbered "eight
mechanisms" framing comes from Bandura et al. 1996, whose abstract could not be opened — do not cite the
numbered list to the 1999 paper.**

**Test.** `[BUILT]` every target has a real name with pips, people and animals are excluded, and the brief
forbids scoring by harm. `[MISSING]` a check that target labels in `src/objects.js` are plain object nouns
(no `enemy`, `target practice`, `trash`, `junk`, `victim`, or collective nouns for people).

## PS9 — The "violent games" question is contested; DVOR-8 must not lean on it either way

**Statement.** Do not cite the violent-media literature to justify or to defend the game. It is genuinely
contested, and DVOR-8 is not violence: the targets are inanimate objects the player owns, nothing is hurt, and
there is no scoring by harm.

**Evidence — both sides verified as real.**

- Anderson, C. A., et al. (2010). *Psychological Bulletin* 136(2):151–173, DOI `10.1037/a0018251` —
  `VERIFIED` (abstract), verbatim: "The evidence strongly suggests that exposure to violent video games is a
  causal risk factor for increased aggressive behavior, aggressive cognition, and aggressive affect and for
  decreased empathy and prosocial behavior." **The abstract contains no numeric effect size, and no open-access
  full text exists — the widely cited r = .15 is attributed to this paper by its critics and could not be
  confirmed inside it.**
- Ferguson, C. J. (2015). *Perspectives on Psychological Science* 10(5):646–666, DOI `10.1177/1745691615592234`
  — `VERIFIED`, verbatim: "results from 101 studies suggest that video game influences on increased aggression
  (r = .06)… are minimal… Publication bias remains a problem for studies of aggression."
- Hilgard, Engelhardt & Rouder (2017). *Psychological Bulletin* 143(7):757–774, DOI `10.1037/bul0000074` —
  `VERIFIED`, verbatim: "we detect substantial publication bias in experimental research on the effects of
  violent games on aggressive affect and aggressive behavior… after adjustment for bias, the effects… are
  estimated as being very small."

**Status.** All three `VERIFIED` at abstract level. The field is contested.

**Test.** `[MISSING]` a claims check: the README and concept may state the design's own facts (inanimate
objects, no people, no animals, no harm scoring), and may not invoke the violent-media literature.

---

# 3. The constraint table

Compact index. "Test" names what enforces it today.

| # | Constraint | Ground (verified source) | Test |
|---|---|---|---|
| P1 | The balcony stays visible; the view is a reading, not the truth | de Certeau 1984, pp. 92–93 | `[MISSING]` rail present in every frame |
| P2 | Unnamed things are reported, not hidden | Flusser 1983/2000, pp. 16, 27, 38 | `[MISSING]` scan summary counts unrecognised regions |
| P3 | Pixelation must slow recognition of a known place | Shklovsky 1917; Gruber 2021; Torralba 2009 | `[MISSING]` recognition-latency task in `tools/check.mjs` |
| P4 | A mode changes what you can know or do, not just colour | Bogost 2007 (secondary); rule 12 | `[BUILT]` mode differs in throw **and** focus |
| P5 | No catharsis claim anywhere | Kjærvik & Bushman 2024; Bushman 2002; Han 2023 | `[MISSING]` claims check on player-facing strings |
| P6 | Safe, voluntary, known-unreal — all three | Rozin et al. 2013 | `[BUILT-partial]` / `[MISSING]` one named test |
| P7 | Nothing in vain; a reason the player would recognise | CREATOR (rule 12) | `[BUILT]` mode `why` ≥ 40 chars; `[MISSING]` module reason coverage |
| P8 | Reversibility, ownership, no real harm | Beggan 1992; Zimbardo 1969 | `[BUILT]` people/animals never targets |
| PS1 | The yard visibly changes because I touched it | White 1959; Ryan & Deci 2000 | `[BUILT]` dent/crack/wreck + permanence |
| PS2 | Autonomy is the asset: no goal, no timer, no fail state | Ryan, Rigby & Przybylski 2006 (β = .49) | `[MISSING]` regression guard |
| PS3 | No relatedness channel exists; say so or build one | Ryan, Rigby & Przybylski 2006; Przybylski 2010 | `[MISSING]` README honesty check |
| PS4 | Owned, authorised — never transgression | Beggan 1992; Müller/Schwieren/Spitzer | `[MISSING]` no trespass vocabulary |
| PS5 | Moderate feedback, capped; numbers are folklore | Kao 2020 (N = 3018) | `[BUILT]` `SHAKE_MAX = 7`; `[MISSING]` ceiling-not-target |
| PS6 | Show completion progress; any head-start must be true | Kivetz 2006; Nunes & Drèze 2006 | `[MISSING]` progress readout reaches m of m exactly at `done` |
| PS7 | Do not build a return loop on this literature | Ghibellini & Meier 2025; Finserås 2021; Lally 2010 | `[MISSING]` claims check |
| PS8 | Plain object nouns; no dehumanising vocabulary | Bandura 1999 | `[MISSING]` label check |
| PS9 | Do not lean on the violent-media literature | Anderson 2010 vs Ferguson 2015 vs Hilgard 2017 | `[MISSING]` claims check |

---

# 4. Defects this work found in the repository

These are things in the current tree that the verified evidence does not support. They should be fixed in the
next iteration.

| # | Where | Defect | Fix |
|---|---|---|---|
| D1 | `docs/style.md` F15 | Cites Kao 2020 as a **SNIPPET** ("the paper was not opened") and gives the finding as a sentence not in the verified abstract. | Upgrade to `SOURCED`, correct the article number to **100359** (DOI `10.1016/j.entcom.2020.100359`), and re-word to the abstract's own claim. |
| D2 | `docs/style.md` F12, D10; `src/fx.js` header | Uses "10–20 ms" hit pause and "4–6 px" camera kick as if sourced from Nijman's talk. **No primary source states either number** — searches returned only code repos, a Valve wiki page, GitHub notes and blogs. | Relabel as `CHOICE` with the tuning reason. The verified nearby anchors are Sakurai's **four frames** and an explicit **cap** on freeze time (developer's own words), and Nijman's **30 tweaks** / **33%** chance (trade-press report of the talk, not a transcript). The project's own test *"within the stated maximum"* is already the right form. |
| D3 | Loss-aversion "2×" | Kahneman & Tversky 1979 does **not** contain it — the strings "loss aversion", "coefficient", "2.25" and "twice" are absent from the full text. | Re-attribute to Tversky & Kahneman 1992 (median λ = 2.25, attested second-hand) or drop it. The game's Q8 forbids loss hooks, so it needs the number for nothing. |
| D4 | Habit "66 days" | Widely misquoted. | If used at all: median 66, IQR 39–102, range 18–254, good-fit subgroup of 39. |
| D5 | Zeigarnik | Frequently cited as a completion driver; does not replicate. | Use the **Ovsiankina** effect (tendency to resume) if a completion driver is wanted. |
| D6 | `docs/style.md` F16 | MediaPipe `detect()` "run synchronously and block the user interface thread" — from the docs, presumably correct, not re-verified this run. | Re-open and re-confirm before quoting again. |
| D7 | `docs/feasibility.md` §1 | Competitor table mixes `SOURCED` and `SNIPPET` rows; several named games were never opened. | Keep the `SNIPPET` labels; do not promote any row to `SOURCED` without opening it. |

**One thing that is not a defect but reads like one.** `docs/concept.md` and `README.md` correctly refuse to
claim that the game is fun. That refusal is the project's own rule 14 and it is right. Nothing in this
constraints file supplies evidence that it is fun, and no constraint below should be read as claiming it.

---

# 5. What was searched and NOT found

Reported rather than filled, per rule 4.

1. **Any study showing that destroying objects in a simulation generalises to real-world destruction.** None
   found. Zimbardo's data, the closest thing, show the opposite causal ingredient: real-world social
   modelling. **This absence is a finding.**
2. **Any measure of destroy-your-own-place play.** Place-disruption research is large-scale only (drought,
   open-cut mining — Albrecht et al. 2007, *Australasian Psychiatry* 15(S1):S95–S98, `VERIFIED`: "people
   exposed to environmental change experienced negative affect that is exacerbated by a sense of
   powerlessness or lack of control over the unfolding change process"). Its own scoping review concedes
   "there is limited empirical evidence in support of this notion" (Galway et al. 2019, *IJERPH* 16(15):2662).
   **Small-scale playful alteration of your own yard is unstudied** — any inference either way is analogy.
3. **Any peer-reviewed source for why players return to a game across days.** Retention is supported only by
   health-domain habit research (Lally) and by SDT's "preference for future play", which is a single-shot
   intention, not observed multi-day retention.
4. **A primary source for pixel-art perception.** One real experimental study was found — Bao, S. (2023),
   "Pixel Art Style Affects Temporal Estimation in Visualized Situations", *Int. J. Affective Engineering*
   22(2):145–155, DOI `10.5057/ijae.IJAE-D-23-00002`, `VERIFIED` — but its dependent variable is *time
   estimation*, not recognition threshold, and it found that pixelation "did not have a big impact on
   emotions" while reliably shifting judgement toward **"an earlier period"**. **No work by a "Miyazaki" on
   pixel-art aesthetics exists; that citation is spurious and must not be used.**
5. **Bogost's own text.** *Persuasive Games* was not opened; the procedural-rhetoric definition is
   `VERIFIED-SECONDARY`. Huizinga, Salen & Zimmerman, and Caillois were not opened either. **Suits' "lusory
   attitude" and "the voluntary attempt to overcome unnecessary obstacles"** were verified via an opened
   scholarly chapter (Arjoranta 2025, `https://jonne.arjoranta.fi/repository/Arjoranta2025a.pdf`, `VERIFIED`),
   quoting Suits 2005, pp. 54–55 — usable, but flagged as secondary.
6. **Haraway's "god trick".** Not opened from a primary source this run; the phrase "god trick of seeing
   everything from nowhere" is real and carries a page number (1988, p. 581), but **do not quote it until a
   primary page is opened.**
7. **Proshansky, Fabian & Kaminoff 1983.** Bibliographic existence confirmed; the wording ("sub-structure of
   self-identity") could **not** be verified — no abstract exists in Crossref, OpenAlex, Semantic Scholar or
   Europe PMC for the record. **Do not use the wording.**
8. **"Effectance motivation" in White 1959.** The term does not appear in the abstract that was verified.
9. **Swink's *Game Feel*.** Existence confirmed via Open Library (ISBN 9780123743282); the book was not
   opened. The only Swink sentence obtained came from a third-party lecture deck. **Treat as unopened.**
10. **The auto-respawn experiment.** Tanaka, Yasuhara & Mikami (2023), DOI `10.1173/wiieej.22.04.0_203`,
    exists, but its abstract does not report the result and the PDF is restricted. The "fast restart increases
    continued play" claim therefore rests on **designer testimony (Team Meat) plus Juul's interpretive
    analysis** — not on measured behaviour.

---

# 6. The next four tasks, in dependency order

Each depends on the one before it. Do not start a later task before the earlier one is green.

1. **Fix the defects (D1–D5).** They are claims in the tree that the evidence does not support. Cheap,
   self-contained, and everything later cites these files. *Exit: `docs/style.md` F12/F15 and the `src/fx.js`
   header carry correct tags and correct numbers.*
2. **Write the `[MISSING]` checks that are pure claims tests** (P5, P7, PS3, PS4, PS7, PS8, PS9). They read
   strings, need no browser and no model, and they are what stops the project re-introducing an unsupported
   claim on the next iteration. *Exit: `test.mjs` fails if any of those strings appears in a player-facing
   claim.*
3. **Write the two behavioural checks** — P2 (the scan reports what it could not name) and PS6 (progress
   reaches m of m exactly when `done` is true). Both need real code, both are testable today against the demo
   yard. *Exit: both green in `test.mjs`.*
4. **Run the two things no test can do** — P3's recognition-latency task and the stage-0 five photographs from
   the real balcony (`docs/feasibility.md` §6). These are the only items here that can falsify the concept
   itself rather than the implementation. *Exit: a number per photograph, and a naming time per frame.*

**What still cannot be established by any of this.** Whether it is fun. Rule 14 of the Master Prompt is right
and this file does not change it: passing checks are not evidence that the game works for a person.

---

# 7. Revision against `ac1bdd6` — walking, the street, the album

Commit `ac1bdd6` added `src/walk.js` (a walker down in the yard), `src/street.js` (more yard past the
photograph), `src/drink.js` (the bottle), `src/album.js` (kinds wrecked, days, records, a shareable line), and
`docs/structure.md` (the game taken apart into atoms, edges, loops, spectra and collisions).

That commit answers two of the three problems `docs/feasibility.md` called structural, and it changes three
constraints above. It also inherits one sourcing defect that this section fixes.

## 7.1 What the commit already got right, in evidence terms

**`docs/structure.md` H5 uses the Ovsiankina effect and explicitly refuses the Zeigarnik effect.** Verbatim
from `structure.md`: *"an urge to complete tasks previously initiated" — `SOURCED[1]`. The better-known claim,
that unfinished tasks are **remembered** better, is **not** relied on: a 2025 meta-analysis found "no memory
advantage" `SOURCED[1]`.* This is independently correct and matches §PS7 above, which reached the same
conclusion from Ghibellini & Meier (2025) and MacLeod (2020). **The project got this right on its own; it
should keep doing it.**

**The day mechanism is deliberately not a streak.** `src/album.js` states the rule: *"It only ever goes up: a
streak that resets would be a punishment for staying away, and the brief rules that out."* That is `brief.md`
Q8 (loss is forbidden) enforced in a data structure, which is stronger than enforcing it in prose. No change.

**The empty places in the album do the goal-setting.** `src/album.js`: *"The empty places say what is still
out there to find — which sends the player out to photograph somewhere else."* The album has
`progress(al).have` of `KINDS.length`. This is the PS6 progress readout, built, and it turns the abstract
"wreck everything" into a visible `n of m`.

## 7.2 P1 revised — the balcony and the yard are two knowledge-positions, and the game now has both

The commit adds a walker. That looks like a contradiction of P1 ("the balcony stays visible") and it is
actually the opposite: de Certeau's chapter contains **both** positions, and the contrast between them is his
argument.

> "The ordinary practitioners of the city live 'down below,' below the thresholds at which visibility begins.
> They walk — an elementary form of this experience of the city, they are walkers, *Wandersmänner*, whose
> bodies follow the thicks and thins of an urban 'text' they write without being able to read it. These
> practitioners make use of spaces that cannot be seen; their knowledge of them is as blind as that of lovers
> in each other's arms."
> — de Certeau 1984, pp. 92–93, `VERIFIED` (same source as P1)

**Revised statement.** The game has exactly two knowledge-positions and must not blur them:

| Position | What the player can do | What they cannot | Where it lives |
|---|---|---|---|
| **The balcony** (the solar Eye) | see the whole yard, name everything the scan names, throw at any of it | touch it; know anything the detector cannot name | the scan, `modes.js`, the throw |
| **Down in the yard** (the walker) | touch it, be blocked by it, jump it, stomp it | see it whole; the view is close and partial | `walk.js`, `drink.js` |

**Constraint.** Going down must *lose* the totalising view, not keep it. The moment the walker can also see
everything, the contrast is gone and the design has just added a second camera. Testable form: while
`mode === 'walk'`, the scan overlay and the full-yard count are not available.

**Why this is stronger than the original P1.** The original said "keep the rail visible so the player
remembers they are above". The revision says the player can now *descend*, which is the exact movement de
Certeau describes and denies himself: he stays on the 110th floor, calls the view a fiction, and notes that
the knowledge down below is "blind". DVOR-8 lets the player have both and feel the difference. That is a
better realisation of the source than a permanently visible rail.

## 7.3 PS2 revised — the album adds goals without adding loss, so the regression guard changes shape

§PS2 warned that the no-goal design is an asset and must not be "fixed" by adding a goal. `ac1bdd6` added
goals — the album's empty places, the records, walking further — and **did not break the constraint**, because
none of the new goals can be failed. `album.js` keeps them all monotonic: best score, furthest walked, kinds
ever wrecked, days ever visited. Nothing decreases.

**Revised statement.** Intrinsic goals are allowed and now present. What remains forbidden is narrower and
sharper: **no goal in the game may be losable.** Concretely — no timer that ends a run, no life count, no
streak that resets, no record that can fall below an earlier record, no object that can become un-wreckable.

**Test.** Extend PS2's regression guard from "no goal" to *"no monotonic value ever decreases"*. Assert it
over `makeAlbum` directly: for every field, a second `record(...)` call with worse numbers leaves the field
unchanged.

**What this keeps from §PS2.** The SDT evidence is unchanged and still supports the design — autonomy
β = .49 remains the strongest measured predictor of enjoyment, and voluntary goals are autonomy-supportive
whereas imposed ones are not. The revision is that "autonomy" and "no goals" are not the same thing; the
evidence supports the first, and this file previously over-read it as the second.

## 7.4 PS3 revised — the relatedness channel now exists, and it is worth naming precisely

§PS3 said the game had no relatedness channel and must either build one or admit it had none. `ac1bdd6` built
one. It is worth being exact about *what* it is, because "social feature" is not the same as the mechanism the
evidence describes.

**What exists now.** `album.js` exports `shareText`, `SIGN` maps each kind to an emoji, `SHARE_MAX = 14`, and
the street can include **a photograph the player adds**, which becomes the exact next yard for anyone who
plays that street. So there are two distinct things:

1. **A shareable result** — `shareText({ things, score, combo, metres, day, url })`. This is the Wordle shape:
   one line, emoji, no spoiler, comparable. `structure.md` H7 sources Wordle's spread and tags the privacy
   issue.
2. **A shared place** — a photograph the player added appears in someone else's street. This is the
   "play my street" idea from `feasibility.md` §5, actually implemented.

**Statement.** Only (1) and (2) count as the relatedness channel. Nothing else does — in particular, adding
more kinds to find, a leaderboard, or an asynchronous "ghost" of another player is *competence* content and
does not address relatedness.

**Evidence, and its honest limit.** Ryan, Rigby & Przybylski (2006) measured relatedness **only** in a
multiplayer sample, where it contributed β = .12** to enjoyment and .12** to future play — real, significant,
and the *smallest* of the three needs in that study. `structure.md` H7's Wordle figure ("1.2 million Wordle
results were shared on Twitter" in 13 days) is a **Wikipedia** claim about a different game's spread, not a
measurement of relatedness. **Verdict: the channel is now real and defensible as design; it is not yet
evidence-backed as a retention fix, and no source verified in this run measures the effect of sharing a
game result on relatedness or on return.** Do not claim more than that.

**Test.** `[BUILT]` `shareText` exists and `SHARE_MAX` caps the line at what one yard can hold. `[MISSING]` a
claims test: any player-facing statement that sharing brings players back must cite a source, and there is
currently none — so the README may describe the line as a thing to show someone, and may not describe it as a
reason they will return.

**Privacy constraint that now binds.** A shareable line plus a photograph the player added means a picture of
a real place may reach another person. `feasibility.md` problem 4 requires plate and face blurring before any
such feature ships, and the photograph currently never leaves the device. **These two facts are now in
tension**, and the tension must be resolved explicitly rather than by accident: either the added photograph is
shared (and P8's no-data-leaves-the-device claim plus the blurring requirement both bind), or it is not (and
the "play my street" channel is local-only). `[MISSING]` a test or an explicit design note settling which.

## 7.5 The two `OPEN` leads in `structure.md` are closed — with primary sources

`docs/structure.md` H5 ends: *"Goal-gradient and endowed-progress leads: pages not found, `OPEN`"*, and its
source list notes that the "Endowed progress effect" and "Goal gradient effect" Wikipedia pages *"returned 404
and are not cited"*. Both leads are real and both were verified in this run. The Wikipedia pages failing was
not evidence that the research does not exist.

| Lead `structure.md` marked `OPEN` | Primary source, opened | Status |
|---|---|---|
| Goal-gradient | Kivetz, Urminsky & Zheng (2006), *JMR* 43(1):39–58 — author manuscript PDF opened | `VERIFIED` |
| Endowed progress | Nunes & Drèze (2006), *JCR* 32(4):504–512, DOI `10.1086/500480` — full text opened; 34% vs 19%, χ²(1) = 8.1, p < .01 | `VERIFIED` |

They do **not** change the design, and the reason is worth stating: both are about *effort accelerating as a
goal nears*, and DVOR-8's album already produces the visible near-goal state (twenty named empty places)
without either mechanism. The endowed-progress effect is additionally the one lever in this whole file that
the ethics line **rules out in its deceptive form** — it *"depend[s] on perceptions of task completion"*, so a
fake head-start is a deception. DVOR-8 should keep earning its progress.

**Action.** Replace `structure.md` H5's `OPEN` with the two citations above and the note that the mechanism is
already supplied by the album. This is a strict improvement: it turns an open question into a closed one with
a primary source, and it removes the incentive to add a variable-reward or fake-progress system later.

## 7.6 New defects

| # | Where | Defect | Fix |
|---|---|---|---|
| D8 | `docs/structure.md` sources 1–7 | All six used sources are **Wikipedia** pages, read "through a summarising fetch", and the file says so. Under Master Prompt rule 1 a source must be a page opened and a claim must rest on it; an encyclopaedia summary is a secondary summary of a secondary summary. | Replace the load-bearing ones. H5's claim now has Ghibellini & Meier (2025) and MacLeod (2020); H7's Wordle figure needs a primary trace or a `SNIPPET`-style demotion. Keep the Wikipedia rows only as leads, tagged as such. |
| D9 | `docs/structure.md` §3 loops and §4 spectra | Every spectrum placement and collision is tagged `DERIVED`, and the file says the skeleton's Runs B–F "have still not been done". | This file's §1–§2 supplies sourced anchors for the mechanism column (effectance, autonomy, benign masochism, goal gradient, ownership). Attach them so the spectra stop being entirely `DERIVED`. |
| D10 | `docs/structure.md` H7 vs `docs/feasibility.md` §4 problem 4 | A shareable result plus an added photograph implies a real place reaching another person, while `docs/concept.md` states the photograph never leaves the device. | Resolve explicitly — see §7.4 — before any share path ships. |
| D11 | `src/news.js`, `src/font.js` | Both were added **untracked and unreported**, and `test.mjs` failed on them: *"every module is used by another, or is the entry point — news.js"*. `news.js` is imported by nothing; only `news.js` imports `font.js`. The reason rows have now been added to `docs/concept.md`, which clears the reasons check, but `news.js` remains an unwired module. | Either wire it (`main.js` must import it, keeping the no-network fallback that invents nothing) or delete it. The header comment already describes behaviour the build does not have — that is a claim about a seam, which rule 6 forbids. |

## 7.7 The revised priority order

§6's four tasks still hold, with two changes.

1. **Fix the defects D1–D5 and D8.** Unchanged in kind; D8 added. Skipping D8 means citing Wikipedia for
   mechanisms that primary papers support.
2. **Claims tests, unchanged** (P5, P7, PS3, PS4, PS7, PS8, PS9), plus the new PS3 sharing claim and the
   privacy resolution in §7.4.
3. **Behavioural checks** — P2 (report the unnamed), PS6 (progress reaches `m of m` exactly at `done`; the
   album's `progress(al)` is the natural home), and the two new ones: **P1 revised** (going down loses the
   totalising view) and **PS2 revised** (no monotonic value ever decreases).
4. **The human work, unchanged** — P3's recognition-latency task and the five balcony photographs.

**One thing this revision does not change.** `docs/structure.md` opens by saying the skeleton's Runs B–F were
never done and that every collision is `DERIVED`. That is still true of `formula.md`, which remains
`_state: not started`. This file is not that formula, and does not claim to be: it is the evidence layer the
formula can now be built on.
