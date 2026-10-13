# The interim gate: what is checked BEFORE anything is reported

The creator's demand: *"create and include the interim actions check mechanism against the concept and
restrictions. Check every of your statements before you output anything."* This is that mechanism.

## Why it exists — the reason I kept going toward failure

The v6 screen the creator accepts is a **constructive render**: a flat sky, facades BUILT with window sprites,
cars DRAWN from one template, a road as planes with markings — the photograph supplies only the colours and the
geometry. Every element is placed by the program.

What I kept doing is the opposite: **a photographic pipeline that filters the picture per pixel**, with v6's
parts bolted on top. On the vector route that pipeline drives the photograph into a dark blue-violet field with
floating window frames — the second image. The reason is structural, not a bug:

1. That pipeline's job is to *approximate a photograph* with palette indices. Its every stage — segmentation,
   per-pixel tone choice, sky growth, the grades — fights the photograph's own colours, and when they lose you
   get a dark field, because the tone ladder was built for a camera image.
2. v6's parts (edges, spiral, wave, window frames) assume a world of FLAT SURFACES the program placed. Dropped
   onto a dithered photograph, a window frame floats on noise.
3. Every time I added a requirement I patched the same wrong pipeline, so each fix made the picture *busier* and
   the failure *worse* — the pattern the creator has now seen four times.

**The wrong approach is per-pixel painting of a photograph as the product's renderer.** It is removed at its
beginning, not patched again: the product renders the yard CONSTRUCTIVELY (sky plane, built facades with window
sprites, road planes with markings, cars as sprites), and the photographic pipeline is kept only as a lab
reference for colour extraction.

## The gate

`node tools/concept-check.mjs <picture.png>` — run on a screenshot BEFORE any output. It measures the frame
against the concept and fails loudly:

| # | what is checked | the concept it answers |
|---|---|---|
| 1 | the frame is not predominantly dark: mean luma in a daylight band | the yard is a place, not a murk |
| 2 | no single colour holds more than 22% of the picture | a flat field means a plane, not a failure to render |
| 3 | the sky occupies the top and is made of ONE flat tone plus cloud tones, at most 6 distinct colours | a flat sky, designed clouds (v6) |
| 4 | at least 8 window sprites are present (a frame tone inside a wall tone) | facades are BUILT, with windows |
| 5 | at least 3 things carry a 1-px outline darker than their body | objects are outlined (v6's edges) |
| 6 | the palette is the project's own: every colour in the frame is a palette entry or a documented mix | "no colour outside the table" |
| 7 | the picture is not a photograph: fewer than 40 distinct colours in the frame | the frame is DRAWN, not filtered |

Each failure prints the measured number. A row that fails blocks the report: nothing is called done while this
tool fails, and the tool is part of the baseline.


## The gate cannot be calibrated from a screenshot — measured, not assumed

The first two versions of this gate FAILED ON THE CREATOR'S OWN REFERENCE PICTURE, and that is the useful result:

| measure | the creator's reference | this project's output | why the measure failed |
|---|---|---|---|
| palette entries used | 50 of 50 | 48 of 50 | a good frame is not the one that uses few colours; both spray across the table |
| flat share | 3% | 15% | **the reference arrived as a photograph of a phone screen** — scaled, compressed, with the bezel in frame. Flatness cannot be measured through that |
| colour changes per row | 0.50 | 0.54 | same cause |

**So the gate must be fed the CANVAS, not a screenshot.** The pixels the game actually drew — one array, no
chrome, no rescale, no compression — are the only data that can calibrate a concept gate, and the honest
thresholds are the ones the creator's own accepted frame produces when measured that way. Until the harness dumps
the canvas, every threshold here is a guess and the gate says so.

**Next action, and it is the first one:** `tools/photo-shot.mjs` gains a canvas dump (`window.__canvasDump`), the
gate reads it, and the thresholds are set from the v6 screen rendered on this machine — not from a photograph of
it.
