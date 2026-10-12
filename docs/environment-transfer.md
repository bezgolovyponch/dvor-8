# Environment transfer: what exists, verified

Built 2026-10-12. This answers the creator's demand: find the existing, reviewed, established **modules** for
turning a photograph into a game environment with **buildings, windows, doors, asphalt, sidewalks and trees as
separate things**, before building anything.

Four independent searches were run with deliberately different angles: scene-parsing models; facade-element
detection; road/sidewalk/surface-material modules; and photo-to-pixel-art pipelines. Every claim below was
verified by opening a source. `VERIFIED` = opened and quoted. `UNVERIFIED` = could not open; it justifies
nothing and is recorded so it is not mistaken for a fact later.

---

# 1. The headline: the thing needed exists, and its licence is the blocker

**One model delivers almost exactly the class list the creator named, in 4.4 MB, running in a browser.**

| | |
|---|---|
| **Model** | SegFormer-B0, finetuned on ADE20K 150 classes — Xie et al., NeurIPS 2021 |
| **Size** | **3.8 M parameters**; ONNX int8 **4,418,863 bytes**, fp16 7,939,696 B, fp32 15,335,446 B |
| **Input** | 512×512 |
| **Accuracy** | ADE20K mIoU **37.4** single-scale (paper Table 1a) |
| **Browser** | `library_name: transformers.js`, `architectures: [SegformerForSemanticSegmentation]` — 196,547 downloads |
| **Classes we need** | verified against `ade20k-id2label.json`: **windowpane 8**, **door 14**, wall 0, building 1, sky 2, tree 4, road 6, grass 9, **sidewalk 11**, earth 13, fence 32, column 42 |
| **Licence** | **NVIDIA Source Code License**, §3.3 verbatim: *"The Work and any derivative works thereof only may be used or intended for use non-commercially… 'non-commercially' means for research or evaluation purposes only."* |

**So windows and doors ARE separately detectable** — the creator's request is technically answerable by one
existing, published, reviewed model. The obstacle is not technical.

**No permissively-licensed small ADE20K model was found in any source opened.** That is the decision point.

## The permissive alternative, and what it costs

| | |
|---|---|
| **Model** | tfjs-models **DeepLab v3, MobileNet-v2, Cityscapes base** — Apache-2.0 |
| **Classes** | 19, verbatim from `config.ts`: `'road', 'sidewalk', 'building', 'wall', 'fence', … 'vegetation', 'terrain', 'sky'` |
| **Size** | 3 shards × 4,194,304 B ≈ **12 MB** fp32, less with its documented 1- or 2-byte quantisation |
| **Licence** | **Apache-2.0** — usable |
| **Cost** | **no window, no door.** It gives surfaces, not facade elements. |

So the two routes trade against each other exactly on the creator's own list: **surfaces without windows**
(Apache, 12 MB) versus **surfaces AND windows AND doors** (4.4 MB, non-commercial).

---

# 2. What is rejected, with the reason

| Rejected | Why |
|---|---|
| **MediaPipe Image Segmenter** (already vendored) | Its only general model, DeepLab-V3, is **21 PASCAL VOC classes** read from the embedded `labelmap.txt`: car, potted plant… **no building, road, sidewalk, wall, fence, sky, grass, window or door.** MediaPipe also has **no depth task**. |
| **MediaPipe Model Maker** (train our own) | Verbatim: *"**Deprecated:** MediaPipe Model Maker is still available, but is no longer actively maintained."* Its vision tree contains `gesture_recognizer`, `image_classifier`, `object_detector` — **no `image_segmenter`**. Segmentation customisation is not documented anywhere current. This route does not exist. |
| **Mask2Former / OneFormer** | Real, but weights are **CC-BY-NC 4.0**, no ONNX in-repo, and OneFormer's smallest is **219 M** parameters. |
| **UPerNet, BiSeNetV2, DDRNet, PIDNet, STDC, ERFNet** | All real, all fast — and **all are 19/11-class Cityscapes/CamVid road models**. No ADE20K number exists in any of their papers (verified by opening each), so none gives walls, windows or doors. **One premise in the brief was wrong and is corrected:** UPerNet is *not* the original ADE20K head; it is a third-party reimplementation (Table 3 of the ADE20K paper), 80.23% on the 5-class reduced setting. |
| **DeepLabv3+ with MobileNetV3** | **Could not be verified as a published model.** The DeepLabv3+ paper's backbones are ResNet-101 and Xception only; MobileNetV3 postdates it by a year and is never used as a backbone there. |
| **Colour-only surface guessing** | LBP, GLCM and Gabor exist and are real, but **not one of their full texts could be opened**, so no accuracy is reported for any of them. The only quotable material result is RoadFormer's 92.52% Top-1 — a heavy transformer over a million-sample pavement set, not GLCM statistics. |

---

# 3. The structural detail the creator asked for — this has a clean answer

The complaint was: *"the borders of the structures and elements are not really detailed."* Two established,
model-free, browser-capable operators fix exactly that. **Neither needs a model, a licence, or a download.**

**LSD — Line Segment Detector** (Grompone von Gioi, Jakubowicz, Morel & Randall, *Image Processing On Line* 2
(2012) 35–55, DOI `10.5201/ipol.2012.gjmr-lsd`), verbatim:

> "LSD is a linear-time Line Segment Detector giving subpixel accurate results. It is designed to work on any
> digital image **without parameter tuning**. It controls its own number of false detections: on average, one
> false alarm is allowed per image."

And it is available in a browser today: OpenCV 4.x still declares `createLineSegmentDetector`, and it is **in
the official opencv.js whitelist** (`platforms/js/opencv_js.config.py`), alongside `HoughLines`/`HoughLinesP`.

**XDoG — extended Difference of Gaussians** (Winnemöller, Kyprianidis & Olsen, *Computers & Graphics* 36(6),
2012), with its parameters as printed:

```
D_σ,k(x)     = G_σ(x) − G_kσ(x)
XDoG         = G_σ(x) − τ · G_kσ(x)
S_σ,k,p(x)   = (1 + p) · G_σ(x) − p · G_kσ(x)
threshold    = 1                          if u ≥ ε
               1 + tanh(φ · (u − ε))     otherwise
```

with the authors' own guidance: *"use k = 1.6 as a good engineering trade-off."* This is the standard
ink-from-photograph operator, and it is the direct fix for soft borders.

**Superpixels, model-free** — SLIC (Achanta et al., EPFL TR 149300), verbatim: *"performs a local clustering of
pixels in the 5-D space defined by the L,a,b values of the CIELAB color space and the x,y pixel coordinates"*;
*"Our method achieves O(N) complexity."* Two parameters only — the number of superpixels and compactness, with
*"We choose m = 10 for all the results in this paper."* A **WASM browser build exists** (`@lightly-ai/slic`).

**And segmentation without any model at all** — Felzenszwalb & Huttenlocher (IJCV 2004), whose stated property
is *"ability to preserve detail in low-variability image regions while ignoring detail in high-variability
regions"*. Parameter `k` (renamed `scale` in scikit-image); the selective-search paper uses **k = 50**.
This gives **regions**, which is what "paint the wall" needs.

---

# 4. The most important finding: the current pipeline is the published failure case

Gerstner, DeCarlo, Alexa, Finkelstein, Gingold & Nealen, **"Pixelated Image Abstraction"** (2012) — opened. Its
Figure 1 caption names **this project's exact pipeline** as the thing its method beats:

> "Attempts to represent image (a) using only 22 × 32 pixels and 8 colors using (b) nearest-neighbor or (c)
> cubic downsampling (**both followed by median cut color quantization**), result in **detail loss and
> blurriness**."

> "Through a formal user study and interviews with expert pixel artists we show that our results offer an
> improvement over the naive methods."

**That is a literature-backed diagnosis of the creator's complaint, not a guess.** The shipped pipeline is
grade → guided filter → **median cut** → **Floyd–Steinberg**: stage for stage the naive baseline.

Every stage now has a verified replacement with real parameters:

| Stage | Ships today | Established replacement | Parameters, as printed |
|---|---|---|---|
| **Downscale** 1600×1200 → 192×256 | browser `drawImage` | **Content-Adaptive Image Downscaling** (Kopf, Shamir & Peers, SIGGRAPH Asia 2013) — *"optimize the shape and locations of the downsampling kernels to better align with local image features"*, and explicitly *"effective for creating pixel art images… due to its ability to keep linear features sharp and connected"* | θ={μ,Σ,ν,σ}, σ_k init `10⁻⁴`, CIELAB, EM to convergence |
| **Palette** | median cut, 28 colours | Heckbert's median cut **is** the published method (his own thesis, opened) — but he notes his variance-bisection variant *"should tend to minimize the mean squared error much better"* | target colour count |
| **Dither** | Floyd–Steinberg | **void-and-cluster / blue noise** (Ulichney) — *"Bayer-style arrays suffer from strong periodic structure that imparts an unnatural appearance"* | arrays *"as small as 32 by 32"*; shipped practice: **64² 8-bit tileable**, Gaussian σ = 1.9 px |
| **Structure** | none | **XDoG** + **LSD** (above) | k = 1.6, σ, τ, p, ε, φ |
| **Surfaces** | none | **Felzenszwalb** (k = 50) or **SLIC** (m = 10, 4–10 iterations) | as printed |

**Unverified and therefore not claimed:** no depth-aware downscaling method exists in anything opened, and **no
paper chains these stages into a photo→192×256 pipeline.** That composition would be the project's own work —
the modules are established, the assembly is not.

---

# 5. The honest caveat that decides how much to trust any of this

Every facade-parsing accuracy is **in-domain**: CMP, eTRIMS, Graz50 and ECP are *rectified, near-frontal,
single-building crops*. The verifier's own words:

> "A hand-held balcony photo of a courtyard is off-distribution (perspective, occlusion, sky, vegetation, mixed
> styles), so **none of these accuracies transfer as a promise**."

**And the ground/sidewalk head is likely near-useless on a courtyard.** Cityscapes defines *sidewalk* verbatim
as *"delimited from the road by some obstacle, e.g. curbs or poles… Often elevated compared to the road."* A
courtyard's paving meets a path with no curb. Expect the model to call the whole ground plane `road` or `earth`
and emit no sidewalk at all.

**Which means the surface model should be treated as a prior to be corrected, not an authority.** What transfers
better is: `building`, `vegetation`/`tree`, `earth`, `grass`, and — the prize — **`windowpane` and `door`**,
because those are objects with stable appearance rather than functional road categories.

---

# 6. What this means, and the decision it needs

**Detecting windows, doors, walls, buildings, trees, road and sidewalk from a photograph is a solved problem
with a published, reviewed module that runs in a browser at 4.4 MB.** That is the answer to the request: there
*is* an established module, and it is not MediaPipe.

**One decision blocks it and it is not mine to make:**

| Route | Gets | Licence | Cost |
|---|---|---|---|
| **SegFormer-B0 ADE20K (ONNX)** | windows, doors, walls, buildings, trees, road, sidewalk, earth — **the full list** | NVIDIA non-commercial | 4.4 MB |
| **tfjs DeepLab v3 Cityscapes** | surfaces and buildings; **no window, no door** | Apache-2.0 | ~12 MB |

**`docs/feasibility.md` records `brief.md` Q7: "No hook may exist to serve a business model", and the project
has no business model yet.** On that basis the non-commercial licence is *not currently a violation* — but it
forecloses shipping commercially without a licence from NVIDIA, and it should be a knowing choice rather than a
drift.

**What I will build, pending that decision, and it is the same either way:** the whole pipeline is
licence-independent except the segmenter itself. **XDoG borders, LSD structure lines, content-adaptive
downscaling, blue-noise dither and SLIC/Felzenszwalb regions are all model-free and unencumbered** — and they
are what fix "the borders are not detailed". The segmenter sits behind one seam, so the model can be swapped
without touching the rest.

**Recommended order, and the reason for it:** do the model-free half first. It needs no licence, no download,
and it addresses the two complaints that are purely visual — soft borders and undetailed structure. Then add
windows and doors as the interactive layer once the licence question is answered.
