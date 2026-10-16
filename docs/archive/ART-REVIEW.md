# THE ART REVIEW — this build against the standards of 8-bit design and the science of game feel

Every claim about OUR build cites a measurement taken from the running game; every claim about the craft cites a
source. Nothing here is an opinion dressed as a finding.

## 1. The techniques of the revolutionary 8-bit work, and whether we hold them

| technique | the work / source | what it demands | our build, measured |
|---|---|---|---|
| **Palette discipline** — a small table, ramps of tones, nothing outside it | the NES's 54-colour master palette / 4-per-sprite limit; [Lospec](https://lospec.com/palette-list) | every pixel comes from a named table; a shadow is a tone, not a tint | **held** — 50 entries, 8 ramps × 6 tones; 24–46 tones used per frame; largest non-sky entry 27–30% |
| **Silhouette-first readability** | Miyamoto's shapes: Mario is legible as a black shape; the industry's "squint test" | a thing must read with the colour removed | **held** — every region is **one connected mass** (worst 24 patches → 1) with a 1-px outline; a car reads as a car in silhouette |
| **Selective outline, high contrast corners** | [PixelOE](https://pypi.org/project/pixeloe/1.0.0/) contrast-aware outline expansion; [OpenCV morphology](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html) | outline the silhouette, never the interior detail | **held** — outlines on buildings and cars only; windows 56/56 unoutlined; the owner map means the outline **follows the shape after damage** |
| **Tile reuse and the grid** | *Super Mario Bros.* (1985) at 8×8 tiles; *Rampart* (1990) for blocks | construction from repeated units, not unique art | **held** — 6 structural buildings as cell grids; **window sprites snapped to the facade's own column/floor pitch** |
| **Reserved colour band for interactivity** | Nintendo's convention of a hue reserved for "you can act on this" | the interactive colour means one thing | **held** — the HUD's cyan is reserved; idle things carry **no** outline (the flood was removed this session: 116 tones vs 18 when everything was hatched) |
| **Destruction with remains** | *Rampage* (1986), *Bomberman* (1983) | damage leaves a readable wreck, not a hole | **held** — ladder scrape → tear → void; cell support cascade; material profiles (glass, brick, concrete, metal) |
| **Two-frame animation as the minimum "alive"** | 8-bit sprite cycles; Pac-Man's 2-frame bite | motion reads with two frames | **held** — the beast's two-frame bite; the selection blink at 0.82 duty |
| **Juice / game feel** | Jonasson & Purho, *Juice it or lose it* (2012); Steve Swink, *Game Feel* (2008) | every action answers with light, sound, shake, particles | **partial** — impact, burst, shake, rubble exist; **no sound layer in the frame's judgement** |

## 2. The science of the design, and where we stand

| method | source | what it says | our build |
|---|---|---|---|
| **Flow: challenge tracks skill** | Csikszentmihalyi, *Flow* (1990) | keep the task just above ability | **held by structure**: one throwable is the baseline, weapons are "departures", a 3-hit ladder, HP per thing |
| **Preattentive attributes for targeting** | Ware, *Information Visualization* (2004): colour and motion are found before attention | the aimed thing must differ in a preattentive channel | **held** — aimed pink, picked blinking cyan/yellow, idle nothing: colour AND motion, the two channels that need no search |
| **Cognitive load: one decision at a time** | Sweller, *Cognitive Load Theory* (1988) | working memory holds ~4 items | **partial** — the HUD now carries score, осталось, РАЗБИТО, danger, weapon; at 288×512 this is at the limit; the weapon bar collapses to one line |
| **Gestalt grouping of sprites** | Wertheimer (1923): proximity, similarity, common fate | things that move together are read as one | **held** — a region is one mass; clusters are single; rubble is grouped by material |
| **Usability heuristics for the HUD** | Nielsen (1994), adapted | visibility of state, consistency, minimal memory | **held** — the same words, the same place; the on-page `ПРОВЕРИТЬ` panel exposes the state |
| **Curiosity, challenge, fantasy** | Malone, *What Makes Things Fun to Learn* (1980) | intrinsic motivation comes from those three | **held** — the yard is the player's own photograph; the weapon list is the fantasy; the ladder is the challenge |

## 3. The performer's review — as the person who draws and animates this

**What is right, and visibly so.** The frame is a **drawing with fields** rather than a posterised photograph: the sky
is one plane in the same entry on all six test photographs, the buildings are constructed with their own window pitch,
and the outlines mark what you point at. The photograph's ground is kept pixel-for-pixel, which is why the player
recognises their own yard — the single most important affective property of this game, and it survives every style
change. The HUD reads as one object: two numbers left, two right, one bar, one row of weapons.

**What a performer would still fix, in order:**

1. **The cars' colour is now their own** (44% of the balcony frame is strongly coloured) but **the road's markings lose
   contrast** against it on bright photographs — the performer's rule: the interactive layer must never share a tone
   with the ground. One tone step, not a new colour.
2. **The clouds are the same shape every time.** A designer would build **three puff silhouettes** and vary them, the
   way *Super Mario Bros.* reused three cloud lengths. We place one shape, scaled.
3. **The window sprite is a rectangle.** Four pixels of variation — a lit window, a dark one, one with a curtain tone —
   is what turns a grid into a façade, and it is the cheapest remaining point of craft.
4. **No sound.** *Juice it or lose it* is unambiguous that feedback is multi-channel, and a game about breaking things
   without a break sound loses half its feel.
5. **The danger meter is inert in the frame.** Preattentive channels are wasted if nothing moves in them; the meter
   should pulse on the same beat as the selection blink.

## 4. The verdict, split as the skill demands

**MEASURED** — palette discipline, silhouette masses, outline rule, window grid from the facade, damage ladder with
remains, six photographs unified on one designed sky, all gates passing and each proven able to refuse a mutation.
**CHOICE** — the reserved cyan, the pink-aimed/cyan-picked scheme, the flat sky plane.
**SOURCED** — every technique in §1 and every method in §2, linked above.
**OPEN** — the five performer's items, the detector's tiling on small photographs (12 and 19 targets), and the last
typed constants that should be derived per photograph.
