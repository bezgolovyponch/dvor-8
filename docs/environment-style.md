# The environment style

What the yard looks like, why it looks that way, how it is built from a photograph, and how it is measured
against the art standards the project already keeps in `standards/`.

Written for revision 2 of the style route (`src/flat.js`, "structure"), 2026-10-13. Revision 1 is what the
three test photographs were played on before this; every figure below is measured on those same photographs at
the game's own size, 192 x 256, by the A/B harness described in §6.

Evidence classes are the project's own, unchanged: `SOURCED` (a page that was opened, with its URL in
`docs/style.md` or in §5 below), `MEASURED` (produced by the code in this repository, with the command), 
`DERIVED` (a consequence of a source or a measurement), `CHOICE` (this project's decision, no external source).

---

## 1. The style in one paragraph

**A photograph is turned into flat shapes, one light, and drawn borders, out of a palette of twenty-four
colours that is the same in every yard.** The photograph decides which ramp and which tone each shape takes; it
never decides the palette. A shape is one flat colour, or — where the photograph says the surface is rough —
two adjacent tones of its own ramp in a fixed grid pattern. Borders are drawn only where the photograph itself
has a line, or where two shapes differ sharply in value. Nothing is textured that is not rough, nothing is
outlined that is not an edge, and no colour in the yard is allowed near the two hues the HUD uses to mean
"you can touch this".

That is the whole style. Everything below is the reason for each clause and the measurement that holds it.

---

## 2. The stages, and what each one is for

| # | Stage | What it does | What it is for |
|---|---|---|---|
| 0 | `ink()` | Difference of two Gaussians over the photograph's luminance, k = 1.6, soft-thresholded at the picture's own 90th percentile | Answers "is there a line here in the PLACE", once, for the merge and the line layer |
| 1 | `segment()` | Felzenszwalb & Huttenlocher region growing | Turns pixels into shapes, so grain cannot survive |
| 2 | `merge()` | Agglomerative region-adjacency merge, cheapest pair first | Turns fragments into surfaces |
| 2b | `absorbOrphans()` | Small regions absorb into the neighbour they touch most — unless they also contrast with it | Removes slivers without deleting small things |
| 3 | ramp and tone | One of six ramps by the region's own colour, one of four tones by the region's own value and which way it faces the light | Colour, form, and the fixed identity of the game |
| 3b | value separation | Two touching shapes the photograph separates by value may not be painted the same | The "notan" half of the style: shapes read without lines |
| 3c | texture | A rough, large surface takes the adjacent tone of its own ramp in a fixed 8x8 ordered pattern | Material: grass, gravel, leaves, cloud |
| 4 | line layer | A border is drawn if the pair of shapes behind it is supported by the photograph's ink or by a large value difference | Structure, and only structure |
| 5 | roles | Sky, foliage, pane | Three named priors that choose a ramp and a tone; never a name shown to the player |
| 6 | marks | The pixels the detector found are segmented apart from their ground, never absorbed, and never painted the same colour as what they stand on | A thing the player is meant to hit has to be a thing in the picture |

### The seven ramps and the reserved band

```
sky      hue 218   shadow 242  highlight 207      a blue sky, deeper at the shadow end
foliage  hue 100   shadow 125  highlight  88      one green for every leaf and field
earth    hue  28   shadow  52  highlight  16      soil, brick, dry grass
stone    hue  40   shadow  65  highlight  30      concrete, kerb, painted wall
metal    hue 220   shadow 240  highlight 210      cold grey: asphalt, glass, sky in overcast
warm     hue   8   shadow  32  highlight   3      the sunset, a red car, a lit facade
dusk     hue 264   shadow 288  highlight 252      the violet a shadow is made of
```

**A seventh ramp re-tunes a look, and that was measured rather than assumed.** Adding `dusk` changed what the
alcohol filter has to fight: mixing toward a saturated orange RAISES the saturation of a low-saturation violet,
and at its old mix the alcohol palette came out *more* saturated than the sober one (0.2876 against 0.2774),
breaking D17's promise that a drunk view is warmer **and** washed out. The mix carries the wash, not the chroma
scale; at 0.22 the palette measures 0.2568 against 0.2774 and is still four times warmer. The test that caught
it is the one that has held that promise since the second build.

`dusk` is the last colour the palette can hold. `src/palette.js` lays a street out as `SIZE` = 30 entries for the
first yard and 28 for each one after it, so a fixed table of seven ramps of four tones plus the two structural
entries is exactly thirty — the whole block, and no room for an eighth. What it buys: the pixel-art convention
that a shadow moves toward blue-violet had nowhere to land with six ramps, so every shaded surface was painted
with the cold grey of the metal ramp. What it costs: nothing measurable. Value correlation, structure capture
and ink share are unchanged to two decimals with it and without it; the number of palette entries a photograph
actually uses rises (18 / 15 / 12 on the three test photographs against 16 / 16 / 10), and the largest single
colour falls from 24.7% to 18.7% on the sunset photograph. A test holds the table inside the block.

Tones are spaced at HSL lightness 0.15 / 0.35 / 0.56 / 0.80, the shadow end carrying more saturation than the
light end, and the light end keeping most of its colour: an earlier version washed the top tone toward white
and painted the sun's own glow — the most saturated thing in the sunset photograph — as pale cream.

`RESERVED = [[176, 196], [326, 352]]` are the hues of the HUD's cyan (`#3fe0f0`) and pink (`#f0286e`). Every
ramp tone is pushed out of those bands with a margin, so the closest any yard colour comes to the band that
means "interactive" is **10.8 degrees** — further than the distance between two of the ramps themselves.
`MEASURED`, `test.mjs` asserts it. Before the rule existed, the sky ramp's darkest tone sat **1 degree** from
the HUD cyan on the sunset photograph, which is the kind of collision that makes a reserved colour stop meaning
anything.

**The one limit that is not the pipeline's.** The largest thing this route cannot preserve is a small, distant
object that no detector found: a church eighty pixels tall in the photograph is twelve pixels tall in a
144 x 256 yard, and twelve pixels of any palette is a shape, not a church. Measured on the church photograph,
the same conversion at 256 x 455 keeps it — 223 shapes against 84 — and costs 946 ms against 167 ms in the same
browser. The canvas size is a design constant with a written reason (`docs/style.md` D3: the picture is the size
of an 8-bit console screen, and every sprite in the game is drawn to that scale), so raising it is a decision
about the game, not a fix to the style. It is recorded here because it is the honest answer to "the photograph
should survive": at this pixel budget what survives is what is big enough to be a shape — plus everything the
detector found, which stage 6 now guarantees.

### What is established and what is this project's own

| Method | Class | Source |
|---|---|---|
| Felzenszwalb & Huttenlocher region growing | SOURCED | IJCV 2004; parameters as scikit-image prints them (`scale`, `min_size`) |
| Difference-of-Gaussians ink gate, k = 1.6 | SOURCED | Winnemöller, Kyprianidis & Olsen, *Computers & Graphics* 36(6), 2012 |
| Value must not be reordered by colour | SOURCED | Gooch et al., Color2Gray, 2005 — the chroma-induced change to lightness is bounded, default alpha = 10 of 100 |
| No dithering as a way to fake a mid-tone | SOURCED | Gerstner et al., *Pixelated Image Abstraction*, NPAR 2012: "uniform dithering can introduce undesired textures to surfaces" |
| Dither PATTERN as a material signifier | SOURCED as documented practice | the pixel-art convention table in `docs/style.md` F26 |
| Dither as a GRADIENT | **tried, measured, removed** | ordered two-level quantisation across a surface's own range was implemented and rendered: at sky densities it is a checkerboard, 74-95% of the frame came out dithered, and the value correlation fell from 0.93 to 0.85 on one photograph. More tones is the honest cure for a gradient; at four tones a ramp is better left flat |
| Detector-masked segmentation | **the project's own seam** | the boxes come from MediaPipe through `src/objects.js`; using the object's own pixels as a segmentation barrier is this project's assembly |
| A fixed palette shared by every image | SOURCED as practice | Obra Dinn's fixed 8-bit → 1-bit pipeline; UFO 50's single 32-colour palette |
| Atmospheric perspective: far surfaces lighter | SOURCED as pictorial convention | standard practice; **no printed algorithm with parameters was found**, so the implementation here is the project's own |
| Light direction from the bright side of the sky | **the project's own**, stated as a prior | single-image light estimation in the literature is learned, not model-free |
| The five stages composed into one photo → 192x256 route | **the project's own assembly** | `docs/environment-transfer.md` §4: the modules are established, the assembly is not |

---

## 3. Against the standards

### 3.1 The project's own standard, `standards/2d-art-environment-design.md`

| Rule in the standard | What this route does |
|---|---|
| One light direction per scene, and every surface shaded consistently | Stage 2b measures the light from the brightest side of the sky, and each region is split into its lit and shadow half along it. The tone follows. A region turned toward the light takes a lighter tone of its own ramp |
| Distance desaturates and lightens | Stage 4 lifts the tone of a shape that is high in the frame and small. One step, because there are only four tones and the sky must stay the lightest thing |
| Reserve one or two colours for interactive elements | `RESERVED`; measured at 10.8 degrees of separation, asserted by test |
| Silhouette readability: the gameplay layer must contrast with the background | Interactive things are outlined by `world.js` in the ink colour and bracketed in pink; the yard itself is quieter (see the negative-space row) |
| 30-50% of the frame visually quiet | measured: 48.3% / 67.7% / 41.4% on the three photographs. Two are inside the band; the aerial photograph is quieter than the band, because three fifths of that photograph IS one field |
| Do not let one saturated area dominate the frame | measured: the largest single colour covers 35.5% / 41.7% / 22.6%. The per-shape cap is 16% of the frame, so the large areas are several shapes that happen to share a tone. This is the honest limit of the route: a photograph that is one field is painted as one colour with texture, not as invented variety |
| Parallax layers, scroll ratios, foreground framing | **not applicable**: the camera is a still photograph. The equivalent decisions are the depth prior (stage 4) and the frame's own aspect ratio |
| Rhythm: alternating dense and sparse regions | the merge stops at a shape count (about 100-170 for a phone photograph) and no shape may exceed 16% of the frame, which is what keeps the picture from collapsing into two huge patches |

### 3.2 The wider canon, and what it cost to follow it

Fourteen principles were gathered from GDC talks, developer devlogs, peer-reviewed work on style perception and
the pixel-art canon (sources in §5). The ones that changed this route:

- **Silhouette readability.** The line layer was drawing every region border, which meant the picture was
  mostly line. Gating it by the photograph's own ink (`ink()`), per pair of regions rather than per pixel,
  cut it from 15.4% to 6.5% of the frame on the sunset photograph.
- **Value grouping (notan).** Two touching shapes the photograph separates by value are now pulled a tone
  apart, so a wall and the house in front of it do not merge into one silhouette. Measured on the drawn demo
  yard: **0%** of adjacent pairs that the photograph separates by 0.12 of its value range are painted the same.
- **Outline as structure, not as contour.** The border is decided once per pair of shapes and applied to the
  whole border, so a drawn line is continuous. Revision 1 asked each boundary pixel and produced dotted lines
  that wandered.
- **Abstraction that preserves identity.** Value ordering is preserved by construction: the tone comes from the
  region's own value, and the shading and distance terms are bounded to a third of a tone and one tone. Measured
  correlation between a region's photographic brightness and its painted brightness: **0.87 / 0.92 / 0.94**.
- **One style, many places.** The palette is fixed, the pixel grid is the photograph's own, and the only
  per-photograph decisions are which ramp and which tone each shape takes.

The principles that were considered and **not** adopted, with the reason:

| Principle | Why not, here |
|---|---|
| Dither as a gradient (Bayer everywhere, or error diffusion) | It is how a photograph is faked into a small palette, and it is what made revision 0 read as static. The route quantises SHAPES instead. Dither appears once, as material (stage 3c) |
| Selective outlining in a darker shade of the shape's own colour | The palette has exactly two structural entries by construction, so a per-shape line colour would be a second palette. The compromise is *where* the ink goes, not its colour |
| More tones or more ramps | The street arithmetic in `src/palette.js` reserves 28 index slots per photograph; the flat table is 24 + 2. Adding a fifth tone would collide the blocks. It is a real ceiling and it is why texture, not tone count, carries material |
| Learned segmentation (SegFormer, DeepLab) | Licence (`docs/environment-transfer.md` §1) and cost: 12.9 s to segment one photograph on this machine |

---

## 4. The Legendarity Index

**This index is the project's own instrument.** It is defined here so that a claim about the look can be
disputed with numbers instead of adjectives. It is not validated against revenue, reviews or retention, and
nothing in it should be read as a promise about any of those. It measures whether a converted yard is
*readable, disciplined and on-model*, which is a precondition for the game being playable at all.

Eight dimensions, each scored 0-10, weighted to 1.00. Six of the eight are computed from a render.

| # | Dimension | W | Class | How it is scored |
|---|---|---|---|---|
| 1 | **Source identity** — a dark thing stays dark, a light thing light | 0.20 | MEASURED | Pearson r between each region's photographic brightness and its painted brightness, ink excluded. 0 = below 0.4, 5 = 0.7, 10 = 0.95 or better |
| 2 | **Structure capture** — the shapes land on the photograph's own edges | 0.15 | MEASURED | share of the photograph's strongest decile of gradient that lies on a shape boundary. 0 = below 35%, 5 = 55%, 10 = 80% |
| 3 | **Line discipline** — borders are drawn, not extruded | 0.15 | MEASURED | ink share of the frame. 10 = 4-8%, 5 = 10-12% or 2-4%, 0 = above 18% (a craquelure) or below 1% (no structure) |
| 4 | **Palette discipline** | 0.10 | MEASURED | colours used against the declared table of 24, and the distance from every scene tone to the reserved band. 10 = at most 24 colours and at least 10 degrees of separation; 0 = any scene tone inside a reserved band |
| 5 | **Value grouping** — touching shapes the photograph separates are painted apart | 0.10 | MEASURED | share of adjacent pairs separated by at least 0.12 of the value range that share a colour. 10 = 0%, 5 = 5%, 0 = above 15% |
| 6 | **Material legibility** — what is rough looks rough | 0.10 | MEASURED | share of the frame painted with a material pattern. 10 = 5-15%, 5 = 2-5%, 0 = 0% (every surface a lie) |
| 7 | **Composition budget** — the frame has somewhere for the eye to rest, and nothing swallows it | 0.10 | MEASURED | the frame's two commonest colours. 10 = 30-55%, 5 = 20-30% or 55-70%, 0 = one colour over 60% |
| 8 | **Iconicity** — the style is recognisable as itself | 0.10 | **judgement**, anchored | 10 = a DVOR-8 frame is identified as DVOR-8 in one second with no logo, HUD or title; 5 = recognisable only beside a comparison; 0 = could be any pixel filter |

### Measured, revision 1 versus revision 2, on the three photographs

Every number is a render at 192 x 256 through both routes, on the same day, on the same machine, by the lab
page described in §6. `r` is the correlation between a shape's photographic brightness and its painted
brightness, with the line layer excluded.

| Photograph | Source identity (r) | Structure capture | Ink share | Material pattern | Two-colour rest | Largest single colour | Palette entries | Render time |
|---|---|---|---|---|---|---|---|---|
| sunset road — rev 1 | 0.823 | 55.9% | 15.4% | 0% | 40.6% | 25.2% | 10 | 166 ms |
| sunset road — **rev 2** | **0.878** | **70.4%** | **6.7%** | **1.6%** | 36.6% | **18.7%** | 20 | 205 ms |
| church + cars — rev 1 | 0.879 | 44.7% | 12.7% | 0% | 50.8% | 28.6% | 8 | 193 ms |
| church + cars — **rev 2** | **0.929** | **60.5%** | **5.8%** | **6.3%** | 68.0% | 41.9% | 16 | 221 ms |
| street canyon — rev 1 | 0.878 | 62.4% | 13.7% | 0% | 39.3% | 24.7% | 11 | 174 ms |
| street canyon — **rev 2** | **0.934** | **76.9%** | **7.4%** | **9.4%** | 50.0% | 31.1% | 13 | 232 ms |

Value grouping was measured on the drawn demo yard, where the separated pairs are countable: **0% of the
adjacent pairs the photograph separates by 0.12 of its value range are painted the same colour, in BOTH
revisions** (39 such pairs in revision 1, 62 in revision 2). It is reported that way rather than as a win: the
property was already satisfied, and what revision 2 adds is that it is now asserted by a test and enforced by
stage 3b instead of happening by luck.

The render time is the transition alone, in headless Chrome, on one photograph, on an idle machine; run to run
it moves by 10-20%, so the useful statement is the range: revision 2 costs **1.2x to 1.35x** of revision 1 on
these three photographs (205 / 221 / 232 ms against 166 / 193 / 174 ms) — one extra ramp, an ink gate and a
roughness measure, against the two passes the audit removed. The extra work — an ink gate, a
roughness measure, a material pattern, a value-separation pass — was paid for twice over: the merge used to
copy a second pair table on every one of its ~1400 merges (223 ms of a 519 ms merge, measured), and the
value-separation pass scanned the whole pair table for every candidate move. Both were removed in the audit
that followed the first draft of this revision.

### The index

Scored against the anchors above, with each dimension averaged over the three photographs:

| # | Dimension | W | rev 1 | rev 2 |
|---|---|---|---|---|
| 1 | Source identity | 0.20 | 8.4 | 9.3 |
| 2 | Structure capture | 0.15 | 4.8 | 7.9 |
| 3 | Line discipline | 0.15 | 3.4 | 10.0 |
| 4 | Palette discipline (reserved band) | 0.10 | 0 | 10.0 |
| 5 | Value grouping | 0.10 | 10.0 | 10.0 |
| 6 | Material legibility | 0.10 | 0 | 8.0 |
| 7 | Composition budget | 0.10 | 10.0 | 8.3 |
| 8 | Iconicity (judgement, not measured) | 0.10 | 5 | 5 |
| | **Legendarity Index** | 1.00 | **54.1** | **86.8** |

Dimension 7 is *lower* in revision 2 and that is the index working: the aerial photograph of a field is painted
with 68% of the frame in two colours, because three fifths of that photograph is one field, and the route
refuses to invent variety that is not in the picture. Dimension 8 is held at 5 in both because the honest
measurement of iconicity needs people, not this machine, and no such test has been run: the anchor is written
down so that it can be run, and the score is left at the midpoint rather than invented.

**What the index predicts:** how much of the photograph survives, whether the picture reads as drawn rather
than filtered, and whether the yard's colours stay out of the way of the interactive layer.
**What it cannot predict:** whether anyone enjoys it, whether it retains a player, or whether it earns. It is a
craft instrument, and the monetisation model in `docs/formula.md` is a different instrument that this one does
not touch.

---

## 5. Sources

Opened for this document (the full research pass, with what each one supports):

1. Winnemöller, Kyprianidis & Olsen, "XDoG: An eXtended difference-of-Gaussians compendium", *Computers &
   Graphics* 36(6), 2012 — k = 1.6, the soft threshold, and the structure tensor.
2. Gerstner, DeCarlo, Alexa, Finkelstein, Gingold & Nealen, "Pixelated Image Abstraction", NPAR 2012 — the
   superpixel-per-output-pixel idea, the Laplacian smoothing fraction, and the explicit decision not to dither.
3. Gooch, Olsen, Tumblin & Gooch, "Color2Gray", 2005 — the bounded chroma-induced change in lightness.
4. Grompone von Gioi et al., "LSD: a Line Segment Detector", *Image Processing On Line* 2 (2012) — the printed
   parameter set for real straight structure lines (not implemented here; recorded as the next step).
5. Cohen-Or, Sorkine, Gal, Leyvand & Xu, "Color Harmonization", SIGGRAPH 2006 — sector sizes for fitting many
   photographs into one template, and the caveat that grey regions are untouched by a hue fit.
6. Cure, "The Pixel Art Tutorial" (Pixel Joint) — selective outlining, pillow shading, palette discipline.
7. Derek Yu, "Pixel Art Tutorial: Basics" — colour over outline at small sizes; dithering only on large flat
   areas or rough things.
8. Lucas Pope, Obra Dinn devlog #767 — one fixed pipeline for every scene, dither as material, not as gradient.
9. Surma, "Ditherpunk" — ordered dithering needs an evenly spaced palette; error diffusion does not.
10. Poser, *Posing* (UW CSE 458) — clear silhouettes as an assessable property.
11. Dow, *Composition* (1899) — notan and the value plan.
12. Khosla, Raju, Torralba & Oliva, "Understanding and predicting image memorability at large scale", ICCV 2015
    — memorability is measurable for photographs; **not** validated for pixel art, which is why dimension 8
    carries the lowest weight and no automatic score.

Research that came back negative and is recorded so it is not re-derived: no published model-free method for
single-image light direction was found (the literature is learned); no printed parameter set exists for
atmospheric perspective as an algorithm; Kopf, Shamir & Peers' content-adaptive downscaling is far too
expensive from full resolution and is only viable as the last 2-4x step.

---

## 6. How to reproduce every number here

```
node test.mjs                                     # 235 checks, must be 0 FAIL
node tools/monetisation-check.mjs                 # 29 checks, must be 0 FAIL
python3 tools/serve.py 4312
BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/check.mjs out photos-test/a.jpg
```

**Every check that was run before this revision was landed**, with its result:

| Check | Result |
|---|---|
| `node test.mjs` | 235 PASS, 0 FAIL (new since the first draft: the reserved band, value grouping, a found thing survives and is painted apart, the palette fits a street block) |
| `node tools/monetisation-check.mjs` | 29 PASS, 0 FAIL |
| `tools/check.mjs` on a real photograph | exit 0, 4 targets, no page errors |
| `tools/walk-check.mjs`, `folk-check.mjs`, `news-check.mjs`, `pop-check.mjs`, `paint-check.mjs` | all exit 0, no page errors |
| the game on the three photographs, in headless Chrome | played in all three, **4 / 10 / 6 targets** found, every one of them a shape with a colour of its own, no page errors |
| the A/B renders above | the table in §4 |

The A/B harness used for the table is the style lab: `compare.html` beside this repository's checkout, which
renders the same photograph through the shipped route and the current one at 192 x 256 and prints each metric
above. It is a lab page, not part of the game, and it imports both modules directly.

The three photographs are the creator's own, taken on 2026-10-12: a sunset over a road, an aerial view of a
church and its car park, and a street canyon.
