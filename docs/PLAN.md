# The plan, from the foundation up

The creator's correction, and it is the spine of this plan: **the project is a stylish pixelated COPY of the
environment.** The road stays exactly as it is in the photograph, only pixelated. Buildings keep their own
geometry, their own window rhythm, their own planes. Nothing is invented, nothing is "designed freely": the
photograph supplies the layout, the palette supplies the style, and the sprites supply the things.

## The fidelity rule (R14)

> **THE ENVIRONMENT IS A FAITHFUL PIXELATED TRANSCRIPTION OF THE PHOTOGRAPH.** Every surface keeps the
> photograph's own layout — a lane marking stays where it is, a patch stays where it is, a kerb keeps its line, a
> window keeps its position and proportions. The style is applied in COLOUR (the fixed palette), EDGE (one-pixel
> outlines at the photograph's own edges) and DENSITY (no dither noise), never by moving, merging or inventing
> the layout.

## The layers, bottom up — each one is a PREREQUISITE of the one above

| # | layer | what it must deliver | depends on | MUSTs it satisfies |
|---|---|---|---|---|
| **L0** | **FOUNDATION: the photograph, faithfully pixelated** | the picture at 288×512, each pixel a palette entry, the layout untouched (road markings, kerbs, patches, facade bands, window rhythm all in their own places) | nothing | *"the road exactly how it's on photo, just pixelated"* |
| **L1** | **FIXED PALETTE AND TONE TABLE** | 50 entries, 8 ramps × 6 tones + outline + void, built once and shared; every pixel drawn through it | L0 | *"unified palette and colour"* |
| **L2** | **EDGES: the photograph's own lines** | a one-pixel line where the photograph has an edge; nothing where it has none | L0+L1 | outlines |
| **L3** | **SURFACES AS PLANES** | sky plane (from the photograph's own blue, its clouds kept as flat shapes or designed), wall planes with their own tone, road planes — all still in the photograph's own places | L0-L2 | *"buildings almost perfect"* |
| **L4** | **WINDOW SPRITES** | every opening the photograph has, as a sprite of frame + glass + sill, in the photograph's own grid | L3 | *"windows"* |
| **L5** | **OBJECTS CUT OUT AND TEMPLATED** | each detected thing cut to its own silhouette, drawn as a sprite: 4-tone ramp from its paint, glint, running light, 1-px outline | L3 | *"detailed pixelated cars"* |
| **L6** | **INTERACTION** | aim outline in pink on the object's silhouette, info in cyan, selection blinking yellow, tooltip with a true fact | L5 | *"edges and highlighting"* |
| **L7** | **DESTRUCTION** | the ladder (scrape → tear → void along the thing's own edges), remains kept | L5+L6 | *"destructibility"* |
| **L8** | **BUILDINGS DESTROY BY PIECES** | a facade is a stack of its own window/panel cells; a hit takes cells off, storey by storey (Rampage), glass shatters into particles, and the wall collapses when its cells are gone | L4+L7 | *"gradually destroying piece by piece the building"* |
| **L9** | **GLASS PARTICLES** | a broken window emits shards that fall and settle (a particle with the glass tone, `floor` set) | L4+L7 | *"windows that can be broken and glass particles"* |
| **L10** | **EVENTS** | hurricane spiral, tsunami wave, the beast — each acting ON the built world, with the three-beat envelope | L8+L9 | disasters |

**What cannot be built before what, stated plainly:** L8 and L9 are impossible before L4 (a building cannot lose
pieces it does not have) and L7 (there is no damage language). L7 is impossible before L5 (there is no silhouette
to damage). L5 is impossible before L3 (a thing cannot be cut out of a layout that was overwritten). L3 is
impossible before L0 (there is nothing to be faithful to). **Every earlier "abomination" was a later layer built
on a broken earlier one** — an event (L10) drawn over a picture that had never become a world (L3).

## The order of work, and the state

1. **L0 fidelity** — in progress: the road's planes were flattened into three tones, which MOVED the photograph's
   layout. They are being returned to a faithful pixelation (part 3 of `vector.js`).
2. **L1-L2** — in place (palette table; edges from the photograph).
3. **L3-L4** — in place (sky with designed clouds, wall planes with a turned-away tone, window sprites on the
   facade rhythm).
4. **L5** — in place (adaptive cut-out, template with ramp/glint/light).
5. **L6-L7** — in place (aim/info/blink; the destruction ladder on the edges).
6. **L8-L9** — NEXT: buildings as stacks of their own cells; a hit removes cells storey by storey; windows
   shatter into glass particles.
7. **L10** — in place but to be re-measured once L8/L9 exist.

## THE OPERATING RULE THE CREATOR DEMANDED (added after the v9 comparison)

> **NO NEW MODULES. THE ITERATION ENDS WHEN FIVE NUMBERS ARE MET ON A CLEAN FRAME OF THE REAL PHOTOGRAPH, AND
> NOTHING IS REPORTED BEFORE THEM.** Every change must move one of these, and a change that moves none is
> reverted, not reported.

| # | measure | my frame today | target | why this number |
|---|---|---|---|---|
| 1 | **isolated pixels** (differ from all four neighbours) | **10.7%** | **≤ 2%** | this is the number that separates a clean 8-bit composition from mush: one pixel in ten standing alone IS the crosshatch the creator's eye catches instantly, and it is why the frame reads as noise although every module works |
| 2 | flat share | 46% | ≥ 70% | surfaces must be fields, not textures |
| 3 | transitions per pixel | 0.37 | ≤ 0.18 | lines must be continuous and few |
| 4 | largest colour below the sky | 27% | ≤ 22% | no field may swallow the frame |
| 5 | sky colours / one-tone share | 9 / 46% | ≤ 10 / ≥ 45% | already met — kept so it cannot regress |

**What the comparison could and could not measure, honestly.** `tools/compare-ref.mjs` was written for this and
its two findings are both negative and both useful: a SCREENSHOT of the creator's screen cannot be compared with
a canvas dump at all (at any reduction it carries 47,438 distinct colours and 22.4% "isolated" pixels — that is
WebP compression, not the art), and dumping the creator's own `DVOR-8 Street v9.dc.html` through the harness
yields only its empty 300x150 canvas after three seconds, because that screen builds its yard on a photograph
that has not been loaded. So the honest state of the comparison is: **the reference cannot be measured from the
material available; my own frame can, and its isolated-pixel share is five times the target.**

**The one action that follows:** suppress single-pixel speckle at the ART scale (a despeckle pass applied to the
reduced frame, not to the 288x512 buffer), remove the remaining per-pixel tone decisions, then re-measure the five
numbers on the same clean frame. Nothing else is built until number 1 is ≤ 2%.
