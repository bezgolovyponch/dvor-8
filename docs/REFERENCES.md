# REFERENCES — the published projects, and the LOGIC retrieved from each

Every entry states what the project does, the algorithm behind it, and what it means for this build. Sources are
linked; nothing here is remembered.

## 1. The conversion — photograph to pixel art

### 1.1 PixelOE — *Detail-Oriented Pixelization based on Contrast-Aware Outline Expansion*
[PyPI 1.0.0](https://pypi.org/project/pixeloe/1.0.0/) · [GitHub](https://github.com/KohakuBlueleaf/PixelOE) · Apache-2.0 ·
author Shih-Ying Yeh (2024). No AI, classical image processing.

**Stage 1 — contrast-aware outline expansion.** Local median vs local min/max brightness build a weight map (bright
details inside darker median areas are prioritised). The image is **eroded to shrink bright regions** and **dilated to
expand bright regions**, the two are blended by that weight, then morphological closing/opening clean the edges. The
purpose stated by the author: *make sure fine details and high-contrast edges survive the downscaling step.*

**Stage 2 — contrast-based downsampling.** Convert to LAB. For luminance, per patch: *"if a patch has skewed
distribution on low value, the minimum value will be selected to keep the dark detail and vice versa. Otherwise, keep
the center value."* Colour channels (A, B) are median-filtered. Optional: k-means palette quantisation, colour
matching, dithering.

**WHAT IT MEANS FOR US — a structural fault in this build.** Our conversion reduces each 5×5 block with an **area
mean**. An average is the one operation that destroys what the eye reads as structure. Measured on a synthetic case
(`tools/piece-downscale-check.mjs`): a 1-px dark line across a bright wall **survives 8 of 8 cells** under the
retrieved logic and **0 of 8** under an area mean (16 of 16 with stage 1 applied first). This is the mechanical reason
the facades read as texture, the window rows melt and the road markings lose their crispness.

### 1.2 The paper PixelOE builds on
*Make Your Own Sprites: Aliasing-Aware and Cell-Controllable Pixelization* (SIGGRAPH Asia 2022) — **cell-controllable**
pixelisation: the cell size is a parameter of the method, and PixelOE demonstrates that its outline expansion improves
even that neural method. Our `BLOCK = 5` is exactly a cell-size parameter, and the video's printed rule ("every block
of 5×5 photo pixels becomes one game pixel at the same position") fixes it at 5 with **zero** deviation.

### 1.3 image2pixel — a browser tool doing the same three steps
[image2pixel.app](https://image2pixel.app/) · [image2pixel.online](https://image2pixel.online/) — downscale, snap to a
palette, outline. It confirms the general shape of the pipeline (and that it can run in a browser), but it is a filter:
one frame in, one picture out, no notion of objects, damage or a level.

### 1.4 Palette discipline
[Lospec](https://lospec.com/palette-list) — the community's palette archive and the convention this build follows:
a small fixed table, ramps of tones, no colour outside it. Our 50 entries = 8 ramps × 6 tones + outline + void.

### 1.5 AI routes, considered and not taken
*Retro Diffusion* and comparable diffusion models do photo→pixel-art, but they are not deterministic, they need a GPU
and a model, and — decisively — they cannot place an object **at the same position** as in the photograph, which the
video's rule requires. The author of PixelOE makes the same point: classical methods are *predictable*.

## 2. The game — the mechanics and their precedents

| mechanic | project | the logic behind it |
|---|---|---|
| aim, throw, material-specific destruction, score | *Angry Birds* (2009) | a small set of materials with distinct break behaviour makes a throw readable without text |
| throw at objects arranged in a real-looking room | *Boom Blox* (2008) | the pile's structure, not the projectile, is the puzzle |
| pieces break off rather than the object vanishing | *Rampage* (1986) | several hits per object; the player sees progress |
| collapse when support is lost | *Red Faction: Guerrilla* (2009) | structural support is the model, not scripting |
| destruction is permanent | *Teardown* (2022) | the promise is that the world does not heal |
| walls as cells, rebuild | *Rampart* (1990) | enclosure and repair on a grid |
| a wave advancing cell by cell | *Bomberman* (1983) | a disaster is a traversal, not an explosion sprite |
| warning → event → aftermath | *SimCity* (1989) | the three-beat envelope |
| the player's own photograph as the content | *Photo Dojo* (Nintendo DS, 2010) | the closest published precedent |
| the camera as the instrument | *Pokémon Snap* (1999) | looking is the verb |

## 3. The audit: my build against the concept, using the uploaded pairs as the yardstick

The pairs uploaded several times — **photograph** (`2026-10-13 15.20.34.jpg`, the Prague street; the balcony car park)
→ **output** (`10a УЛИЦА · Прага · 288×512`; the audit screen «ВИЗУАЛЬНЫЙ АУДИТ — V6 — v9»; the video's frame at 9.8 s)
— are the yardstick. Against them:

| the concept says | my build | verdict |
|---|---|---|
| reduce 5×5 → 1 px at the same position, no crop | implemented as an **area mean** | alignment ✓ (5.00 exact), **method ✗ against §1.1** |
| keep the photograph's structure (markings, windows, edges) | the mean erases 1-px structure | **✗ — the fault §1.1 names** |
| the sky is drawn: flat plane, white clouds | ✓ palette measured and matched (hue 210/0.76, white) | ✓ |
| a facade is a flat plane with a regular grid | piece built and **confirmed standalone**; not yet assembled | **half** |
| a window is a blue-glass sprite, never outlined | sprite is grey-blue; video says **blue** | **✗ correction recorded** |
| outlines mark what you point at | renderer draws pink when aimed; video shows **gold** | **✗ correction recorded** |
| the HUD bar | four controls, order and colours measured | ✓ |
| the photograph stays recognisable | ✓ (pairing IoU 0.70, dark structures 87%) | ✓ |

**THE AUDIT'S HEADLINE:** the build's core operation contradicts the published practice it claims to follow. It
averages where the field selects, and it expands nothing before it shrinks. Fixing that is not a polish — it is the
difference between a scene that reads as a place and one that reads as texture, and the corrected piece is already
written and confirmed (`src/pieces/downscale.js`, `tools/piece-downscale-check.mjs`).
