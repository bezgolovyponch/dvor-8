# The knowledge base

Every mechanic this game needs, with a **real link** that can be opened, and the **path that already worked**
recorded so it is used again instead of being searched for twice. Rule: when a working reference exists, its
path is the PRIORITY and any other method is secondary until it beats the reference on the screen.

Links marked `USED` have been opened and used in this project. `KNOWN` are established, widely-used resources
that have not yet been opened here: check before relying on them.

## 1. The path that already worked — v6, the creator's own screen

`~/Documents/DVOR-8 Street v6.dc.html` produced the result the creator accepts, and this is the exact path it
used. **This is the priority method for anything in the list below.**

| step | what v6 does | the general rule |
|---|---|---|
| 1 | draws each thing into a small **grid** (16–40 px) with its own palette | every object is a sprite in a grid, never a texture |
| 2 | builds a **fills** map (the pixels of the thing) and an **edges** map (its outline) | the outline is computed from the silhhouette, not stored |
| 3 | `outline(g)`: a filled pixel with an empty neighbour becomes one pixel of ink `#2e222f` | this is **morphological dilation minus the shape** — the standard 1-px outline ([OpenCV morphology](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html), `USED`) |
| 4 | highlight states: pink when aiming, cyan in info mode, the selected one **blinks yellow** | interaction is shown on the EDGES map: one array, three colours |
| 5 | a tap selects, and the fact panel shows a **categorised true fact** | the tooltip is part of the object's own data |
| 6 | disasters are 32×32 grids built from maths (a spiral, a wave) and finished with the same `outline()` | an event is a sprite with an outline, not a tint over the screen |

**Where v6 is in this repo now:** the spiral and the wave are ported (`src/disaster.js`, `eventSprite`), with v6's
outline rule. Still to port, in this order: the **edges map per object**, the **highlight states**, and the
**car template** (4-tone ramp from the paint colour, diagonal windshield glint, amber running light, 1-px outline
— v6 cites *Metal Slug* for it).

## 2. Destruction, shattering and rubble

| link | what it gives | class |
|---|---|---|
| [OpenCV: morphological operations](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html) | dilation/erosion — the outline rule, and the correct way to thicken or break a silhouette | `USED` |
| [Marching squares](https://en.wikipedia.org/wiki/Marching_squares) | turning a mask into contours; the basis of region borders | `USED` (conceptually, in `world.borderOf`) |
| [Boundary tracing](https://en.wikipedia.org/wiki/Boundary_tracing) | Moore-neighbour tracing, used in `borderOf` and `vector.js` | `USED` |
| [Ramer–Douglas–Peucker](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm) | simplifying a traced border into straight runs | `USED` |
| [Red Blob Games](https://www.redblobgames.com/) | the reference for grids, fields and cellular rules — for a destruction wave over cells | `KNOWN` |
| [Cellular automata cave generation](https://gamedevelopment.tutsplus.com/series/cave-generation-using-cellular-automata--gamedev-7382) | cell rules that produce ruins and rubble rather than noise | `KNOWN` |
| [js13kGames](https://js13kgames.com/) · [sources](https://github.com/js13kgames) | hundreds of complete tiny games with readable source — the best place to find a working 8-bit mechanic | `KNOWN` |

## 3. Pixel art, palettes and animation

| link | what it gives | class |
|---|---|---|
| [Lospec palette list](https://lospec.com/palette-list) | thousands of curated pixel palettes with exact hex values | `KNOWN` |
| [Lospec: dithering](https://lospec.com/pixel-art-tutorials) | the tutorials this project's dither rules follow | `KNOWN` |
| [Kenney assets](https://kenney.nl/assets) | CC0 sprite sets, including destruction and explosion frames | `KNOWN` |
| [OpenGameArt](https://opengameart.org/) | CC0/CC-BY sprites, tilesets, effect sheets | `KNOWN` |
| [itch.io pixel assets](https://itch.io/game-assets/free/tag-pixel-art) | free packs, often with animation sheets | `KNOWN` |
| [PICO-8](https://www.lexaloffle.com/pico-8.php) · [BBS carts](https://www.lexaloffle.com/bbs/?cat=7) | complete tiny games whose **source is readable in the cart** | `KNOWN` |
| [8bitworkshop](https://8bitworkshop.com/) | an in-browser IDE for real 8-bit platforms, with example ROMs | `KNOWN` |
| [NESdev wiki](https://www.nesdev.org/wiki/) | how the hardware actually drew sprites, palettes and scrolling | `KNOWN` |
| [The Book of Shaders](https://thebookofshaders.com/) | procedural patterns, useful for wind, water and fire | `KNOWN` |

## 4. The mechanics, cited by the games that invented them

| mechanic | source |
|---|---|
| destruction **wave** over cells | [Bomberman (1983)](https://en.wikipedia.org/wiki/Bomberman_(video_game)) |
| **three-beat** disaster envelope (warning, event, aftermath) | [SimCity (1989)](https://en.wikipedia.org/wiki/SimCity_(1989_video_game)) |
| kaiju **damage by pieces** | [Rampage (1986)](https://en.wikipedia.org/wiki/Rampage_(video_game)) |
| the **bite cycle** | [Pac-Man (1980)](https://en.wikipedia.org/wiki/Pac-Man) |
| exaggerated vehicle sprites, 4-tone ramp + glint | [Metal Slug (1996)](https://en.wikipedia.org/wiki/Metal_Slug_(video_game)) |
| terrain **carving**, and living with the holes | [Dig Dug (1982)](https://en.wikipedia.org/wiki/Dig_Dug) · [Rampart (1990)](https://en.wikipedia.org/wiki/Rampart_(1990_video_game)) |
| disasters as **aimed spells** with a cost | [Populous (1989)](https://en.wikipedia.org/wiki/Populous_(video_game)) |

## 5. The rule this file exists for

> **A working reference beats a new idea.** When a reference produces the result the creator accepts, take its
> path, name it in the code, and use it for the next piece. Search this file before searching the web. Add to it
> every time a path works — with the link, what it gave, and which file here used it.


## 6. THE DESTRUCTION MODEL — resolved, and now the one this game uses

Researched against the references in this file, then proved on a real photograph. The model has three parts, and
each part comes from a source rather than from taste:

| part | what it is | source |
|---|---|---|
| **1. the LADDER** | a pixel of a thing is either intact, **scraped one tone** (its own ramp, up if it has nowhere darker to go), **torn** (a hole), or **void** (taken out). Four states, checked in that order | the state ladder every 8-bit game uses for a breakable thing; here it also carries this project's permanence rule (D8) |
| **2. the CARRIER** | damage is applied **along the thing's own edges map** — a pixel is on the edge when a neighbour is not in the thing — so a blow tears the silhouette, never a box | v6's `edges` map, `DVOR-8 Street v6.dc.html`; the general rule is morphological dilation ([OpenCV](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html)) |
| **3. the TRANSITION** | the thing does not vanish: it goes **intact → wrecked in place**, losing pieces, and only a small core becomes void | [Rampage (1986)](https://en.wikipedia.org/wiki/Rampage_(video_game)) for damage by pieces; [Dig Dug (1982)](https://en.wikipedia.org/wiki/Dig_Dug) and [Rampart (1990)](https://en.wikipedia.org/wiki/Rampart_(1990_video_game)) for carving and living with the holes; v6 for a shattered pane leaving shards |

**What was tried and rejected, with the reason:**

| rejected | why |
|---|---|
| delete the region (`gone = true`) | no remains: the picture loses a car and gains nothing. This is what produced the black boxes the creator saw |
| drive every damaged pixel to the **scorch** map | a dark car became a black mass — measured: the tone-0 pixels had nowhere darker to go |
| trace and simplify a **polyline** per thing | on a large solid region the trace fell back to the box, so a car was outlined as a rectangle |
| paint the flood as a **flat colour** over the picture | the yard disappeared under an olive field |

**The rule that follows, and the reason this section exists:** the destruction model is decided and written down
BEFORE the disasters that use it are drawn. A disaster is a hitter and an envelope; it must not invent damage.


## 7. THE CORE ISSUE IN MY APPROACH — found, named, and now a rule

The creator's verdict on a screen I had called valid: *"total abomination — where is the re-rendering of the
buildings as in the v6 html? why is the hurricane just a sign moving?"* Both are true, and both have one cause.

**v6 does not filter a photograph. v6 BUILDS the frame out of sprites.** Its buildings are constructed — a wall
grid, window sprites with a frame, glass and a sill, lit and shaded faces — its cars are one template with a
4-tone ramp, a glint and an outline, and its disasters are sprites that act on that constructed world.

**I took v6's PARTS and dropped them into a photo-painting pipeline.** An edges map, a spiral, a wave: all
ported, all correct in isolation, and all sitting on top of a photograph that was still being painted per pixel.
That is why a hurricane looks like a sign moving across a picture, and why a building is a photograph with a
tint rather than a facade with windows: **there was nothing for the event to happen TO.**

The rule that follows, and it is the most important line in this file:

> **ADOPT THE REFERENCE'S ARCHITECTURE FOR THAT LAYER, NOT ITS PARTS.** When a reference produces a result the
> creator accepts, the question is not "which of its functions can I call?" but "what does it build, and in what
> order?" A sprite laid over a photograph is not a re-render. If the reference constructs a wall and puts windows
> in it, then this project constructs a wall and puts windows in it — the photograph supplies COLOURS and
> GEOMETRY, and the frame itself is built.

The order that follows from it, and the only order in which the remaining work makes sense:

1. **BUILD THE WORLD**: facades as wall planes with window sprites (frame, glass, sill) — from the geometry the
   region and facade passes already produce.
2. **BUILD THE THINGS**: the Metal Slug template — one car, 4-tone ramp from its paint, windshield glint,
   running light, 1-px outline (v6's own citation).
3. **THEN THE EVENTS**: a hurricane as a front that tears the BUILT world apart, a tsunami that floods it,
   a beast that walks through it. An event is what happens to a world, never an overlay on a picture.

## 8. Requirement 18, decomposed in layers (the licence is a research gap, not an obstacle)

My earlier answer — "the model is non-commercial, your decision" — was lazy. The searches prove the field is
layered, and the layers have different licences:

**LAYER 1 — a permissively licensed ADE20K model (windows, doors, walls as classes).**
The *backend* of SegFormer is Apache-2.0: [`nvidia/mit-b0`](https://huggingface.co/nvidia/mit-b0) is labelled
`license: apache-2.0`. The **finetune** on ADE20K is not: [`nvidia/segformer-b0-finetuned-ade-512-512`](https://huggingface.co/nvidia/segformer-b0-finetuned-ade-512-512)
is `license: other` (NVIDIA Source Code License, non-commercial). The consistent alternatives to check, in order:
[MMSegmentation's ADE20K configs](https://raw.githubusercontent.com/open-mmlab/mmsegmentation/main/configs/segformer/metafile.yaml)
(OpenMMLab, Apache-2.0 project — the weights must be confirmed per checkpoint, not assumed from the repo) and
[PaddleSeg's model zoo](https://raw.githubusercontent.com/PaddlePaddle/PaddleSeg/refs/heads/release/2.9/docs/model_zoo_overview.md)
(Apache-2.0, and it includes ADE20K 150-class models — confirm the checkpoint licence the same way).

**LAYER 2 — if no 150-class checkpoint is permissive: build the two classes we actually need.**
We do not need all 150. This game needs **window** and **wall/plane**. Those two can be trained from permissively
licensed *annotations* — CMP Facade (CC BY-SA, rectified facades with window rectangles) — on the Apache-2.0
backbone above. One head, two classes, a laptop-scale job, and no licence question at all.

**LAYER 3 — do not wait for either: cut objects out with a CLASS-AGNOSTIC model.**
This is the piece that unblocks the visual work TODAY. The requirement that is actually failing on screen is not
"know that this is a window" — the facade rhythm already finds windows — it is **"the outline must be the thing's
own shape"**. A class-agnostic segmentation model does exactly that, prompted by the detector boxes we already
have: the SAM family ([facebook/sam2-hiera-large](https://huggingface.co/facebook/sam2-hiera-large) and its mobile
variants) plus community ONNX exports such as
[`nrl-ai/samexporter-onnx-models`](https://huggingface.co/nrl-ai/samexporter-onnx-models). **Licences must be
verified per checkpoint before shipping** — that is the first action of this layer, not an assumption.

**THE ORDER, and what each piece unblocks:**

| piece | unblocks | state |
|---|---|---|
| 3a verify the SAM-family checkpoint licences and pick the smallest ONNX export | the whole of layer 3 | **DONE — `Xenova/slimsam-77-uniform`, Apache-2.0, ONNX, 13.8 MB quantized** (vision encoder 8.9 MB + prompt encoder/mask decoder 4.9 MB; fp16 20.8 MB, fp32 39.9 MB). Measured from the repository, not assumed. Also Apache-2.0 and available: `facebook/sam-vit-base`, `facebook/sam2.1-hiera-tiny` (safetensors, need conversion). NOT permissive: `nrl-ai/samexporter-onnx-models` (`other`), `ChaoningZhang/MobileSAM` (no licence tag, no files) |
| 3b wire the prompt (detector box → mask) and replace the colour cut-out | true silhouettes: outlines, damage along the silhouette, the car template on a real shape | **unblocked.** Sub-pieces, in order: **3b-1** vendor the runtime (transformers.js ESM + its ONNX/WASM backend) and load SlimSAM in the page, measuring the load cost on a phone-sized frame; **3b-2** run one prompt per detector box (the box centre/box as the prompt) and take the best mask; **3b-3** turn the mask into the region's pixels, replacing the adaptive colour cut in `objects.js`; **3b-4** measure: gate + suite on a clean frame, plus a side-by-side of the colour cut and the model cut on the Prague photograph. Each sub-piece ends with a picture and a number, and the model is used ONLY if it beats the colour cut on those |
| 1a check MMSegmentation and PaddleSeg ADE20K checkpoint licences | layer 1 | parallel to 3a |
| 2a if 1a fails: train window+wall on CMP Facade with the Apache backbone | layer 2 | after 1a |
| 4 measure: gate + suite on a clean frame | confirms the piece did what it claimed | after 3b |

**What this changes about my previous answer:** the non-commercial licence was one sentence of research about one
checkpoint, and I turned it into a blocker. Three layers exist, two of them permissive, and the one that fixes the
screen needs no class semantics at all.
