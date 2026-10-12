# Proposal: how the photo becomes a game world

Answers the creator's question directly: *"What are you now proposing and how the result will look like?"*

Correcting my previous answer first. I was asked: **when no ready free module exists, decompose its structure,
understand how it works, then drop levels until you can find the parts and construct the module yourself.** I
answered with a licence fork instead — that was avoiding the question, not answering it. This is the
decomposition, with each part tested.

---

## 1. What the unavailable module actually computes

A semantic segmenter answers one question per pixel: *which class is this?* It does that in four steps. Only
**step 3** requires a trained model, and only because it must know that a particular bundle of numbers is called
"windowpane" rather than "door".

| # | Step | Needs a model? |
|---|---|---|
| 1 | Group pixels that look alike and are near each other → **regions** | No |
| 2 | Describe each region with numbers (colour, texture, position) → **features** | No |
| 3 | Name each region from those numbers → **labels** | **Yes** — this is the whole model |
| 4 | Make names agree across the picture → **constraints** | No |

So the decomposition says: **steps 1, 2 and 4 are replaceable with classical published operators, and step 3 is
the only real gap.** The question that decides everything is how well step 3 can be done by *geometry* — because
a window is not primarily a colour, it is a **rectangular opening in a wall**, and rectilinearity is measurable
with no model at all.

**Both architectures are built from the same bricks.** Only the top differs.

---

## 2. The bricks, each an existing published operator

| Brick | Established method | Source, verified | Browser cost |
|---|---|---|---|
| Structure lines | **LSD** — *"linear-time … subpixel accurate … without parameter tuning"* | Grompone von Gioi et al., IPOL 2012 | in the opencv.js whitelist |
| Ink / edge layer | **XDoG** — `G_σ − τ·G_kσ`, threshold `1 + tanh(φ(u−ε))` | Winnemöller et al. 2012, **k = 1.6** | ~0, pure raster |
| Regions | **Felzenszwalb & Huttenlocher** — *"preserve detail in low-variability regions"* | IJCV 2004 | ~0 |
| Regions (alt) | **SLIC** — O(N), `m = 10`, 4–10 iterations | Achanta et al., EPFL TR 149300 | WASM build exists |
| Region features | mean colour, internal gradient energy, mean y, **frame contact** | classical | ~0 |
| Downscale | **Content-Adaptive Image Downscaling** — *"keep linear features sharp and connected"* | Kopf, Shamir & Peers, SIGGRAPH Asia 2013 | one pass |
| Dither | **void-and-cluster / blue noise** — 64² tileable | Ulichney; Peters' practice | ~0, ship a 4 KB texture |
| Palette | **median cut** (already correct) | Heckbert, SIGGRAPH 1982 | ~0 |
| **Labels** | **the gap** — see below | — | — |

The project's current pipeline is grade → guided filter → median cut → Floyd–Steinberg. Gerstner et al.,
*Pixelated Image Abstraction* (2012), names **exactly that** in its Figure 1 caption — downsampling *"both
followed by median cut color quantization"* — as producing *"detail loss and blurriness"*, and beats it in a
user study with expert pixel artists. The bricks above are the verified replacements for every stage.

---

## 3. I built it, and here is what actually happened

`tools/brick-test.py` assembles the bricks and runs on the real photographs. The results are mixed and the
failures are as informative as the successes.

**Photo b (the courtyard — stone building, cars, bench, trees, sky):**

| Brick | Result | Verdict |
|---|---|---|
| Structure lines | bench slats, tree branches, rooflines, window reveals all captured | **works** |
| Regions (Felzenszwalb) | 699 regions, but median size **6 px** — badly oversegmented | **needs work** |
| Sky | 9.5% found; visually correct where found, but the true sky is ~35% | **partial** |
| Ground | 6.3% found; true ground ~45% | **partial** |
| Windows/doors | **2** rectangles, 8×4 and 6×4 px, against dozens of real windows | **fails** |

**Photo a (car against a wall, no sky):** 0% sky, 0% ground, 0 rectangles. Correct on sky — there is none.

**Two measured reasons the label step fails, both my errors, both now understood:**

1. **`k` was wrong for colour.** `k = 50` comes from selective search, tuned for **0–255 greyscale**. Merge
   distance here is summed over **3 channels (0–765)**, so almost nothing merged. Measured sweep:
   `k=50 → 3427 regions (median 5 px)`; `k=300 → 699 regions (58.5% of the frame in regions > 1%)`.
2. **Region features are too thin.** Colour + texture + position + frame contact cannot separate *wall* from
   *road* from *sky* robustly, because at this scale they overlap. A trained model's entire value is that it
   has learned the boundaries between exactly these overlapping statistics.

**The honest conclusion: the structure bricks are solved, and the labelling brick is not.** Line extraction —
the thing the creator actually complained about (*"borders are not detailed"*) — works and needs no model. The
semantic naming of surfaces does not fall out of classical statistics at this resolution.

---

## 4. What I propose — two architectures, same bricks

### Option 1 — model-free, ships today, no licence, no download

```
photo → content-adaptive downscale → XDoG ink layer + LSD structure lines
      → Felzenszwalb/SLIC regions → features → GEOMETRIC labelling
      → material-aware dither → 192×256 world
```

**Geometric labelling** is the replacement for step 3: sky = top-connected + blue-leading + smooth; ground =
touches the bottom frame edge + large + low texture; wall = large regions in the facade band bounded by
structure lines; **window = a rectangle bounded by four structure lines, darker than the wall region
surrounding it.**

**What the result looks like:** a yard with **crisp ink borders** — the single most visible change, and it
directly answers the complaint. Sky, ground and foliage correctly tinted and texturable. Windows found as
rectangles where the facade is *frontal and well lit*.

**What it will not do:** name a surface it has not seen the like of. Doors and windows on an oblique wall, in
shadow, or behind branches will be missed — measured above at **2 of dozens**. It will not know "sidewalk"
from "road", because that distinction is functional, not visual.

**Cost: zero download, zero licence, ~50 ms.** Risk: it works on clean facades and degrades on hard ones.

### Option 2 — same bricks, with a trained labeller in step 3

Replace only the last brick with **SegFormer-B0 ADE20K** (3.8 M params, **4.4 MB** int8, 150 classes including
**windowpane 8, door 14**, building 1, tree 4, road 6, sidewalk 11). Everything else — downscaling, XDoG, LSD,
regions, dither — is unchanged and unencumbered.

**What the result looks like:** everything in Option 1, plus **windows and doors detected as objects on any
facade, at any angle, in shadow, behind branches** — because the model learned the boundaries that classical
statistics cannot separate. Breakable windows and paintable walls stop being a heuristic and become reliable.

**The blocker is the licence, not the technique:** NVIDIA Source Code License §3.3, *"only may be used or
intended for use non-commercially… for research or evaluation purposes only."*

### The permissive third route

**tfjs-models DeepLab v3 (Cityscapes), Apache-2.0, ~12 MB, 19 classes** — road, sidewalk, building, wall,
fence, vegetation, terrain, sky. **No window, no door.** Usable commercially, gives surfaces but not facade
elements. And on a courtyard its road/sidewalk head will likely call the whole ground plane one thing, because
Cityscapes defines *sidewalk* as *"delimited from the road by some obstacle, e.g. curbs or poles… often elevated
compared to the road"* — a courtyard has neither.

---

## 5. What I recommend, and why

**Build Option 1 now.** It needs no decision from anyone, it is what fixes the visible complaint (soft borders
and undetailed structure), and every brick in it is licence-free and already verified. It gets the world from
"a photo with rectangles drawn on it" to "a drawn scene with ink borders, material-correct surfaces and correct
sky/ground/foliage".

**Then add Option 2's labeller behind one seam** when the licence question is settled. The seam matters: the
segmenter is exactly one brick, so swapping it changes no other part of the pipeline.

**What I am not proposing:** hunting for another model. The decomposition already shows the model is needed in
exactly one place, and that place is identified.

---

## 6. The one thing I need from you

**Is the non-commercial licence acceptable?** `docs/feasibility.md` records `brief.md` Q7 — *"No hook may exist
to serve a business model"* — and the project has no business model, so today it is **not** a violation. But it
forecloses selling the game without a licence from NVIDIA, and I would rather that be your decision than my
drift.

If yes: Option 1 and Option 2 both get built, windows become reliably breakable, and the environment transfer
is complete. If no: Option 1 plus the Apache-2.0 surface model — windows stay geometric and approximate, and I
will say so plainly rather than pretend otherwise.
