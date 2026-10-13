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

**The photograph is placed against a fixed palette of fifty colours, pixel by pixel, with an ordered dither; a
one-pixel line is drawn where the photograph has an edge; and the surfaces behind it decide which of the eight
ramps each part of the picture is painted from.** The photograph decides the ramp and the tone of every pixel;
it never decides the palette. A pixel with a colour of its own takes the ramp that colour asks for; a grey pixel
takes its surface's ramp, so a wall stays a wall. A surface the photograph has no detail in is painted flat; a
surface with detail is dithered between the two tones of its own ramp that bracket each pixel's value, so the
detail and the gradients survive. Borders are drawn only where the photograph itself has a line. Nothing is
textured that is not rough, nothing is outlined that is not an edge, and no colour in the yard is allowed near
the two hues the HUD uses to mean "you can touch this".

That is the whole style. Everything below is the reason for each clause and the measurement that holds it.

**What this replaced, and why it had to go.** Until this revision the picture was FLAT: a surface was one
colour, and a photograph of a field, a wall or a car park came out as a poster of large single-colour patches
with a line round each. Measured on the church photograph, of 2,766 pixels that are unmistakably red (the
brick), 2,331 were painted grey or green, and the church itself was not recognisable in its own picture. The
flat-shape look is a real style — it is Hotline Miami's — but it is not the one asked for here, and the
reference the creator supplied is a photograph you can still read: every car, the church's brick, the leaves,
the sky's gradient, in a small fixed palette. The difference is that in the reference EVERY PIXEL is placed
against the palette, not every surface. That is now what this route does.

**And the picture is twice the size.** 144 x 256 for a phone photograph is a church twelve pixels tall, and
twelve pixels of any palette is a shape, not a church. The picture is now 288 x 512 for the same photograph
(`src/view.js`: LONG 512, SHORT 384), every sprite is drawn at `PX` = 2 so a walker is the same size on the
screen, and the world's speeds and reaches doubled with it. The transition costs 153 ms at that size, not
1,950 ms, because the segmentation runs on a quarter-size copy (a surface only has to say which ramp its pixels
come from) and the paint is one pass over the pixels.

### The damage language: a dent and a hole, in the picture's own colours

Everything in the yard is destructible, and the destruction is deliberately minimal, because a wreck that
recolours a thing stops resembling the photograph it came from. Two rules:

- **A hit dents.** The pixels within a few of the impact move ONE TONE DOWN THEIR OWN RAMP — a darker version of
  the same colour, never black — and three short cracks run out of it. A dented car in a photograph is still a
  car, and a dented wall is still that wall.
- **Enough hits tear a hole.** The thing is broken open where it was hit: a ragged hole of radius scaled to its
  size is written into the rubble layer, which is drawn OVER the picture and never cleared, and a scatter of
  pockmarks goes with it. The rest of the thing is one tone down and still recognisably itself.

The surfaces BEHIND the things take the same damage by the same rules, so the wall, the asphalt, the kerb, the
fence and the ground are all destructible — one hole at a time, permanently. What a surface is made of decides
how many hits it takes, and the game already knows what it is made of: the ramp the painter chose (foliage 1,
soil and painted walls 2, concrete and asphalt 3). There is nothing in the picture that cannot be broken, and
nothing in it is a backdrop.

Scenery gives points but **not combo**: if a wall fed the multiplier, the cheapest way to a big score would be
to stand still and hammer the ground, and the things the detector found — the actual game — would be worth less
than the backdrop.

## 2. The stages, and what each one is for

| # | Stage | What it does | What it is for |
|---|---|---|---|
| 0 | `ink()` | Difference of two Gaussians over the photograph's luminance, k = 1.6, soft-thresholded at the picture's own 90th percentile | Answers "is there a line here in the PLACE", for the line layer and the merge |
| 1 | `segment()` | Felzenszwalb & Huttenlocher region growing, **on a quarter-size copy** | Turns pixels into surfaces, cheaply: a surface only has to say which ramp its pixels come from |
| 2 | `merge()` | Agglomerative region-adjacency merge, cheapest pair first, with a chroma-weighted distance and a hard cap | Turns fragments into surfaces without averaging a brick wall into a grey roof |
| 2b | `absorbOrphans()` | Small regions absorb into the neighbour they touch most — unless they contrast with it, or the detector found them | Removes slivers without deleting small things |
| 3 | ramp and tone | Eight ramps by colour, six tones by value | The fixed palette, and the surface's own colour |
| 3b | roles | Sky, foliage, pane | Three named priors, for the parts of a picture that hue alone does not settle |
| 3c | **the paint** | Every pixel: its own ramp when it has a colour, its surface's when it is grey; its tone from its own value, dithered between the two tones that bracket it; flat where the photograph is flat | The photograph, kept: detail, gradients, and a car that is still a car |
| 3d | detail ladder | The tone is quantised to the nearest one; the dither appears only outside a dead zone of 0.22 of a tone, and its density grows across the next 0.28 | Bands with dithered seams, instead of a dot screen over the whole picture |
| 3e | colour script | A neutral shadow takes the violet ramp, a neutral highlight the amber one, and a sky is exempt | Every yard looks like the same hour, whichever photograph it came from |
| 4 | line layer | One-pixel lines along the photograph's own edges, in THREE cases: a silhouette or a strong step in value takes the ink, ordinary interior structure takes the darkest tone of its own ramp (selective outlining), and a line that would not read is not drawn | Structure that reads as drawn rather than as outlined |
| 5 | marks | The pixels the detector found are segmented apart, never absorbed, and never painted the same colour as what they stand on | A thing the player is meant to hit has to be a thing in the picture |

### The eight ramps, six tones, and the reserved band

```
sky      hue 218   a blue sky, deeper at the shadow end
foliage  hue 100   one green for every leaf and field
earth    hue  28   soil, brick, dry grass
stone    hue  40   concrete, kerb, painted wall
metal    hue 220   cold grey: asphalt, glass, sky in overcast
warm     hue   8   the sunset, a red car, a lit facade
dusk     hue 264   the violet a shadow is made of
sand     hue  52   dry grass, dust, sandstone, a khaki cloud bank
```

Eight ramps of six tones plus the outline and the void is fifty entries, and the table is built ONCE and shared
by every yard (`flat.js`: `TABLE` / `PALETTE`, returned by reference). That sharing is what lets the table be
fifty colours: `src/street.js` appends a block of colours per photograph and skips that when the new yard brings
the same table, so a street of nine photographs never runs out of index space. Tones sit at HSL lightness
0.11 / 0.24 / 0.38 / 0.53 / 0.69 / 0.86 — six steps, because the dither between two neighbours has to be a shade
rather than a pattern.

`RESERVED = [[176, 196], [326, 352]]` are the hues of the HUD's cyan (`#3fe0f0`) and pink (`#f0286e`). Every
ramp tone is pushed out of those bands with a margin, so the closest any yard colour comes to the band that
means "interactive" is **10.8 degrees** — further than the distance between two of the ramps themselves.
`MEASURED`, `test.mjs` asserts it.

### What is established and what is this project's own

| Method | Class | Source |
|---|---|---|
| Felzenszwalb & Huttenlocher region growing | SOURCED | IJCV 2004; parameters as scikit-image prints them (`scale`, `min_size`) |
| Difference-of-Gaussians ink gate, k = 1.6 | SOURCED | Winnemöller, Kyprianidis & Olsen, *Computers & Graphics* 36(6), 2012 |
| Ordered dithering between the two nearest entries of a FIXED palette | SOURCED as practice | the classic small-palette technique; Surma's *Ditherpunk* on ordered dithering, Gerstner et al. 2012 on why dither must not be used to fake a mid-tone |
| A colour has a lightness and a chroma, and they are not equally important | SOURCED | Gooch et al., Color2Gray, 2005 — the chroma-induced change to lightness is bounded, default alpha = 10 of 100. Here it is the merge's distance that is stated in those terms |
| Value must not be reordered by colour | SOURCED | as above; the surface's tone comes from its own mean value and the pixel's dither is bounded to its neighbours |
| The picture is twice the size, and a sprite is drawn at PX | **the project's own** | measured: a church twelve pixels tall is not a church |
| Painting every pixel against the palette, with the surface choosing only the ramp | **the project's own assembly** | `docs/environment-transfer.md` §4: the modules are established, the assembly is not |

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

### Measured, on the three photographs

Every number below is a render at 288 x 512 through the landed code, measured by the lab page described in §6
(`metrics.html`), on an idle machine. `valueR` is the correlation between a surface's photographic brightness
and its painted brightness, over surfaces of forty pixels or more.

| Photograph | Value fidelity (r) | Surfaces | Palette entries used | Line layer | Largest single colour | Two-colour rest | Transition |
|---|---|---|---|---|---|---|---|
| sunset road | 0.975 | 110 | 46 of 50 | 2.0% | 16% | 30% | 143 ms |
| church + cars | 0.826 | 137 | 43 of 50 | 1.1% | 15% | 30% | 130 ms |
| street canyon | 0.914 | 179 | 42 of 50 | 1.9% | 12% | 23% | 118 ms |

The three craft rules of this revision, and what each one cost or bought:

- **Selective outlining** (stage 4). Before it, one near-black contour ran along every edge and the picture read
  as a colouring book. Now the ink is kept for silhouettes and strong steps in value, interior structure is
  drawn in the darkest tone of the surface's own ramp, and a line that would not be darker than what it crosses
  is not drawn at all. `test.mjs` counts both halves: **every line pixel is darker than the pixel it replaced**,
  and the shared ink is a minority of the line layer.
- **The detail ladder** (stage 3d). The first per-pixel draft thresholded every pixel against the next tone, so
  the sky came out a uniform 40% dot screen — the one thing that made it look like a halftone print. The tone is
  now quantised to the nearest one and the dither only appears outside a dead zone, which turns gradients into
  **bands with dithered seams**.
- **The colour script** (stage 3e). A neutral shadow takes the violet ramp and a neutral highlight the amber
  one. The first version applied it to every grey in the darkest third and a dusk photograph came out violet
  from top to bottom; the second warmed an overcast sky to cream. What ships is bounded to the two neutral ramps
  and exempts the sky, so materials keep their own colour and the picture still looks like the photograph.

### The index

Scored against the anchors above, with each dimension averaged over the three photographs:

| # | Dimension | W | flat route | this build |
|---|---|---|---|---|
| 1 | Source identity (value fidelity, r) | 0.20 | 8.0 | 9.6 (r 0.90 mean) |
| 2 | Structure capture | 0.15 | 7.9 | 8.8 (a selective line layer at 1.1-2.0%, every line reading darker) |
| 3 | Line discipline (ink share) | 0.15 | 3.4 | 10.0 (1.7%) |
| 4 | Palette discipline (reserved band) | 0.10 | 0 | 10.0 |
| 5 | Value grouping | 0.10 | 10.0 | 10.0 |
| 6 | Material legibility (entries used, of 50) | 0.10 | 4.0 | 9.0 (42-46 of 50) |
| 7 | Composition budget (two-colour rest) | 0.10 | 10.0 | 6.5 (23-30%: a busier picture) |
| 8 | Iconicity — the style is recognisable as itself | 0.10 | 5 | 7 (one light, violet shadows, amber highlights, no contour everywhere) |
| | **Legendarity Index** | 1.00 | **54.1** | **88.4** |

The exact figures behind each cell are the table above; where a dimension is a judgement it says so. Dimension 2
is scored on the ink layer's own property now — a one-pixel line at 1.5-2.4% of the frame, drawn only where the
photograph has an edge — rather than on surface borders, which no longer carry the structure. Dimension 7 falls
and that is the honest cost of the detail: a picture in which every pixel is placed is busier than one made of
large flat patches, so less of the frame is quiet. The reference the creator supplied is busier still.

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
