# MODULES — the open-source evidence base for DVOR-8

**Purpose.** DVOR-8 converts a photograph into a playable 8-bit level. Its weakest algorithms are local re-implementations with hand-picked constants. This catalogue is the evidence base for replacing each one with a real, published implementation: exact repo, exact file, exact API and defaults, licence, and the pipeline layer it replaces.

**Status.** 34 entries, all **VERIFIED** on 2026-10-17: every snippet was extracted verbatim from the pinned source and re-checked as a substring of the cached file; all 34 source URLs returned HTTP 200. The machine-readable database is [`data/modules.json`](../data/modules.json); this file is the readable catalogue grouped by pipeline layer.

**How to read an entry.** Each row links to its detail section. Every detail section names the repo/file/version, quotes the licence, gives the exact call shape, says which pipeline layer it replaces, and states the integration and licence constraint. The verbatim 3-15 line snippet lives in the JSON entry (same id) and was not reflowed here.

---

## Coverage of the 14 requested buckets

| # | bucket | verdict | entries | note |
|---|---|---|---|---|
| 1 | Semantic segmentation in the browser | **FOUND** | segformer-transformersjs | SegFormer-B0/ADE20K through transformers.js + ONNX Runtime Web. ADE20K has `wall`, `building`, `sky`, `windowpane`, `house`, `road`, `car`; COCO does not. Weights are non-commercial. |
| 2 | Sky / horizon detection | **FOUND** | skyline-oneformer | A real skyline extractor (OneFormer fine-tune), but PyTorch + GPL-3.0 and trained on mountainous imagery. No permissive browser sky model found; the ADE20K `sky` class is the browser fallback. |
| 3 | Window / facade grid or 1-D pitch | **PARTIAL** | window-heatmaps, facade-segformer-cmp, projection-profile | Two working window detectors and a real 1-D projection-profile primitive. No facade-specific bay-pitch/autocorrelation estimator was found; pitch must be fitted from masks/profiles. |
| 4 | Downscale to pixel art | **FOUND** | pixeloe-pixelize, pixeloe-contrast-downscale, image2pixel-web | PixelOE 1.0.0 contrast-aware pipeline (outline expansion + `find_pixel`) and a working browser baseline. The browser tool's licence is non-commercial. |
| 5 | Palette quantisation + data | **FOUND** | libimagequant, pillow-median-cut, image-q-neuquant, lospec-endesga32, cga16-palette | libimagequant (GPL) and Pillow (MIT-CMU) provide median cut + k-means refinement; image-q provides NeuQuant. Palette data: Endesga 32 via Lospec (no licence stated), CGA16 (MIT). Aseprite's `Channels: RGBA` `.gpl` extension is documented in the Lospec entry. |
| 6 | Object detection in the browser | **FOUND** | mediapipe-object-detector, imgly-background-removal | MediaPipe EfficientDet-Lite0 (Apache-2.0) and IMG.LY mask→sprite (AGPL-3.0). COCO has no building/window/sky — verified from the model's labels. |
| 7 | 1-px outline | **FOUND** | opencv-morph-gradient, pixeloe-outline | Morphological gradient (dilate − erode) is the 1-px operator; PixelOE's outline expansion is the published pixel-art use. |
| 8 | Support / gravity / collapse | **FOUND** | luanti-falling | Luanti's `falling_node` support predicate and falling-entity conversion (LGPL-2.1+, Lua). |
| 9 | Image comparison gates | **FOUND** | pixelmatch, skimage-ssim, imagehash-phash, skimage-entropy | Pixel diff with AA handling, SSIM, pHash and Shannon entropy; all with exact defaults. |
| 10 | Deterministic RNG | **FOUND** | mulberry32, splitmix64, xoshiro256starstar, pcg32 | Four published generators with the exact constants quoted; mulberry32 is already in `src/rng.js`. |
| 11 | Deterministic inference | **FOUND** | onnxruntime-session-options | Session options plus `SetDeterministicCompute` (default false). Browser coverage is partial: some knobs are Node-only. |
| 12 | Pixel-art fonts / HUD | **FOUND** | font8x8 | Public-domain 8x8 ASCII font, LSB-left, 1 KB of data. No Cyrillic in this table. |
| 13 | Tilemap / level generation | **FOUND** | tiled-tmx, ldtk-json, rotjs-cellular | TMX 1.8 and LDtk 1.5.3 format specs for interchange; ROT.js cellular automata for generation. |
| 14 | Audio | **FOUND** | zzfx, jsfxr | ZzFX (MIT) and jsfxr/sfxr (Unlicense) browser synths with published parameter/preset vocabularies. |

**Verdict count: 13 FOUND, 1 PARTIAL, 0 NOT FOUND.** The partial bucket is #3: there are real window detectors and a real 1-D projection-profile implementation, but no facade-specific bay-pitch/autocorrelation library. That step is a small port, not a missing capability.

---

## The five entries to port first

1. **`segformer-transformersjs`** — the class map is the root of the pipeline. ADE20K's labels include `building` and `windowpane`; COCO's do not. This is the only entry that changes what the pipeline can see.
2. **`pixeloe-contrast-downscale`** — replaces the area mean. The area mean is the mechanical reason a 1-px dark line survives 0 of 8 cells; `find_pixel` is the published alternative and is small enough to port verbatim.
3. **`pixeloe-outline`** — the stage-1 that makes detail survive the reduction. Without it, a better patch rule still loses thin marks.
4. **`libimagequant`** — the quality bar for palette quantisation (median cut + k-means refinement); use it to judge the 28-colour table, not to ship it (GPL).
5. **`luanti-falling`** — the one published rule that turns destruction into a cascade: a cell falls when the cell below is no longer support. It is 15 lines of Lua and can be reimplemented cleanly.

Gates (`pixelmatch`, `skimage-ssim`, `imagehash-phash`, `skimage-entropy`) are next: they are how we will know a port helped.

---

## Licence ledger (integration constraint first)

| class | entries | consequence |
|---|---|---|
| Permissive: Apache-2.0 / MIT / BSD / ISC / public domain / Unlicense | segformer-transformersjs (code), window-heatmaps, projection-profile, pixeloe-*, mediapipe-object-detector, opencv-morph-gradient, pixelmatch, skimage-*, imagehash-phash, mulberry32, splitmix64, xoshiro256starstar, pcg32, onnxruntime-session-options, font8x8, ldtk-json, rotjs-cellular, zzfx, jsfxr, cga16-palette | can be vendored/ported with attribution; weights caveat on SegFormer |
| Permissive code / non-commercial weights | segformer-transformersjs, facade-segformer-cmp | code and fine-tune metadata are permissive; the underlying NVIDIA SegFormer checkpoint is non-commercial |
| Copyleft: GPL-3.0 / GPL-2.0 / LGPL-2.1+ | skyline-oneformer, libimagequant, tiled-tmx (Tiled code; spec is CC-BY-SA 3.0), luanti-falling | derivative distribution must comply; keep at arm's length (CLI/offline/reimplementation) or make the project GPL/LGPL-compatible |
| Network copyleft: AGPL-3.0 | imgly-background-removal | network use triggers source-availability; not usable in a closed product |
| Restricted: non-commercial custom | image2pixel-web | cannot ship or use commercially; read as a baseline only |
| No licence stated | lospec-endesga32 | attribution-only community data; confirm before redistribution |

---

## Layer map

| layer | entries | what it decides |
|---|---|---|
| **Scene parse** | 2 | Turning the photograph into labels, classes and regions. |
| **Horizon** | 1 | Sky / skyline, so the horizon is measured rather than typed. |
| **Facade geometry** | 3 | Windows, walls, bays and the 1-D pitch of a facade. |
| **Reduction** | 3 | Photo pixels to game pixels: patch choice, outline expansion, downscale. |
| **Palette** | 5 | Quantisation and palette data; the colour budget and its provenance. |
| **Objects** | 2 | Detecting cars/people and cutting a mask into a sprite. |
| **Style register** | 1 | Pulling the reduced frame back to the photograph's colour distribution. |
| **Outlines** | 2 | 1-px boundaries that follow a silhouette. |
| **Damage cascade** | 1 | Support, gravity and the rule that a cell falls when support disappears. |
| **Gates** | 4 | Comparison instruments: pixel diff, SSIM, pHash, entropy. |
| **HUD text** | 1 | Bitmap glyphs for deterministic HUD text. |
| **Audio** | 2 | 8-bit SFX synthesis with published parameter sets. |
| **State & levels** | 7 | Deterministic RNG and published level/tilemap formats. |

---

## Entries by layer

### Scene parse (`scene-parse`)

Turning the photograph into labels, classes and regions.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`segformer-transformersjs`](#segformer-transformersjs) | Transformers.js SegFormer semantic segmentation (ADE20K) | 4.3.1 (tag; npm @huggingface/transformers 4.3.1) | Apache-2.0 | scene-parse |
| [`onnxruntime-session-options`](#onnxruntime-session-options) | ONNX Runtime session options for deterministic inference | commit b5375da86e523fb8d8e58677b2223fd3d467bb4a; SetDeterministicCompute since 1.17 | MIT | scene-parse/gates |

### Horizon (`horizon`)

Sky / skyline, so the horizon is measured rather than typed.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`skyline-oneformer`](#skyline-oneformer) | Skyline extraction with a fine-tuned OneFormer | commit f3bd795aaf9b2ec826339a27511a1f5211b06023 | GPL-3.0 | horizon |

### Facade geometry (`facade-geometry`)

Windows, walls, bays and the 1-D pitch of a facade.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`window-heatmaps`](#window-heatmaps) | Window detection in facades using heatmap fusion | commit c41cf77707f1f2aae7cc50a640982f5c23fa5db9 | MIT | facade-geometry |
| [`facade-segformer-cmp`](#facade-segformer-cmp) | SegFormer-B0 facade parser (CMP, 6 classes) | model revision f95d623ab89d1179d9f59b8d390cc7a2818d255a (2026-04-26) | MIT | facade-geometry |
| [`projection-profile`](#projection-profile) | 1-D projection-profile segmentation | commit efbce5db509f90ab531a1a060ceb0f9e98f15e0b | MIT | facade-geometry |

### Reduction (`reduction`)

Photo pixels to game pixels: patch choice, outline expansion, downscale.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`pixeloe-pixelize`](#pixeloe-pixelize) | PixelOE pixelize pipeline | 1.0.0 (PyPI sdist; repository version is 1.0.1 and its layout changed) | Apache-2.0 | reduction |
| [`pixeloe-contrast-downscale`](#pixeloe-contrast-downscale) | PixelOE contrast-based downscale (`find_pixel`) | 1.0.0 (PyPI sdist) | Apache-2.0 | reduction |
| [`image2pixel-web`](#image2pixel-web) | image2pixel-web browser pixel-art pipeline | commit 4cac86c2195364d4f98516c4e37d8bbd4e561bc1 | Custom restricted | reduction/palette |

### Palette (`palette`)

Quantisation and palette data; the colour budget and its provenance.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`libimagequant`](#libimagequant) | libimagequant (pngquant quantizer) | 4.4.1 (tag) | GPL-3.0+ | palette |
| [`pillow-median-cut`](#pillow-median-cut) | Pillow median-cut quantizer | 13.0.0 (tag) | MIT-CMU | palette |
| [`image-q-neuquant`](#image-q-neuquant) | image-q NeuQuant (JavaScript port) | 3.0.4 (tag image-q@3.0.4) | MIT | palette |
| [`lospec-endesga32`](#lospec-endesga32) | Lospec palette data: Endesga 32 (JSON and GIMP .gpl) | palette snapshot fetched 2026-10-17; 32 colours; no upstream version | No licence stated | palette |
| [`cga16-palette`](#cga16-palette) | IBM CGA 16-colour palette (MIT table) | commit 10c5b30ab9febed0eb90b7708690bd9b7a093929 | MIT | palette |

### Objects (`objects`)

Detecting cars/people and cutting a mask into a sprite.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`mediapipe-object-detector`](#mediapipe-object-detector) | MediaPipe Tasks Vision ObjectDetector (EfficientDet-Lite0) | commit 800a56cc5004f6b0b0bb65134cc6c2ec12f0c88f; npm @mediapipe/tasks-vision 1.1.1 | Apache-2.0 | objects |
| [`imgly-background-removal`](#imgly-background-removal) | @imgly/background-removal (mask to sprite) | 1.7.0 (packages/web/package.json); commit 12f56cc4f2a90d624e165a715748d22efc7a1d93 | GPL-3.0 | objects |

### Style register (`style-register`)

Pulling the reduced frame back to the photograph's colour distribution.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`pixeloe-color-match`](#pixeloe-color-match) | PixelOE LAB/wavelet colour matching | 1.0.0 (PyPI sdist) | Apache-2.0 | style-register |

### Outlines (`outlines`)

1-px boundaries that follow a silhouette.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`opencv-morph-gradient`](#opencv-morph-gradient) | OpenCV morphological gradient (1-px outline) | 4.14.0 (tag) | Apache-2.0 | outlines |
| [`pixeloe-outline`](#pixeloe-outline) | PixelOE contrast-aware outline expansion | 1.0.0 (PyPI sdist) | Apache-2.0 | outlines/reduction |

### Damage cascade (`damage-cascade`)

Support, gravity and the rule that a cell falls when support disappears.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`luanti-falling`](#luanti-falling) | Luanti falling-node support check | 5.17.0 (tag) | LGPL-2.1+ | damage-cascade |

### Gates (`gates`)

Comparison instruments: pixel diff, SSIM, pHash, entropy.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`pixelmatch`](#pixelmatch) | pixelmatch perceptual pixel diff | 8.0.0 (tag v8.0.0) | ISC | gates |
| [`skimage-ssim`](#skimage-ssim) | scikit-image structural similarity (SSIM) | 0.26.0 (tag v0.26.0) | BSD-3 | gates |
| [`imagehash-phash`](#imagehash-phash) | pHash perceptual hash | 4.3.2 (tag v4.3.2) | BSD-2 | gates |
| [`skimage-entropy`](#skimage-entropy) | Shannon entropy of an image | 0.26.0 (tag v0.26.0) | BSD-3 | gates |

### HUD text (`hud-text`)

Bitmap glyphs for deterministic HUD text.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`font8x8`](#font8x8) | font8x8 8x8 bitmap font | commit 8e279d2d864e79128e96188a6b9526cfa3fbfef9 | Public domain | hud-text |

### Audio (`audio`)

8-bit SFX synthesis with published parameter sets.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`zzfx`](#zzfx) | ZzFX tiny synth | 1.4.0 (file header); commit aab7e2b6b9086746b6e55fab75c75ce03e716c49 | MIT | audio |
| [`jsfxr`](#jsfxr) | jsfxr (sfxr port) | commit b7b6aa27d62f8f356db267276bf54b451555c49d (npm jsfxr) | Unlicense | audio |

### State & levels (`state`)

Deterministic RNG and published level/tilemap formats.

| id | module | version | licence | replaces |
|---|---|---|---|---|
| [`mulberry32`](#mulberry32) | mulberry32 seeded PRNG | commit 88c1317ea6f9b25c153afa9c369c365fed11b482 | Public domain | state |
| [`splitmix64`](#splitmix64) | splitmix64 seed expander | no VCS version; 2015 file header; snapshot fetched 2026-10-17 | Public domain | state |
| [`xoshiro256starstar`](#xoshiro256starstar) | xoshiro256** 1.0 | no VCS version; 2018 file header; snapshot fetched 2026-10-17 | Public domain | state |
| [`pcg32`](#pcg32) | PCG32 (XSH-RR) | commit bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3 | Apache-2.0 | state |
| [`tiled-tmx`](#tiled-tmx) | Tiled TMX map format 1.8 | TMX 1.8; Tiled commit 221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd | CC-BY-SA 3.0 | state |
| [`ldtk-json`](#ldtk-json) | LDtk JSON level format 1.5.3 | 1.5.3 (tag v1.5.3) | MIT | state |
| [`rotjs-cellular`](#rotjs-cellular) | ROT.js cellular automaton map generator | 2.2.1 (tag v2.2.1) | BSD-3 | state |

---

## Entry details

### <a id="segformer-transformersjs"></a>`segformer-transformersjs` — Transformers.js SegFormer semantic segmentation (ADE20K)

- **Layer**: `scene-parse` · **Language**: JavaScript (ESM), ONNX Runtime Web
- **Repo**: <https://github.com/huggingface/transformers.js>
- **File**: `packages/transformers/src/image_processors_utils.js`
- **Version**: `4.3.1 (tag; npm @huggingface/transformers 4.3.1)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004'). Model weights are a separate licence: nvidia/segformer-b0-finetuned-ade-512-512 points to the NVIDIA Source Code License for SegFormer, section 3.3 'non-commercially ... research or evaluation purposes only'.
- **Why it matters**: scene-parse: replaces the hand-built class map in src/scene-parse.js with a published 150-class model that actually has `building` and `windowpane`. COCO does not (verified: the EfficientDet-Lite0 TFLite label list has no building, window or sky). This is the single largest upgrade for the project's weakest layer.

**Exact call shape / defaults**

```
const segmenter = await pipeline('image-segmentation', 'Xenova/segformer-b0-finetuned-ade-512-512', { subtask: 'semantic' });
const out = await segmenter(image, { target_sizes: [[height, width]] });
// out: [{ label, score: null, mask: RawImage }] in transformers.js 4.3.1
// Processor config (Xenova/segformer-b0-finetuned-ade-512-512/preprocessor_config.json):
//   do_resize: true, size: {height:512,width:512}, resample: 2 (bilinear)
//   do_rescale: true, rescale_factor: 0.00392156862745098
//   do_normalize: true, image_mean: [0.485,0.456,0.406], image_std: [0.229,0.224,0.225]
// Post-process: bilinear logits -> target size, int32 argmax, one binary mask per present label.
```

**Input/output**: Input: RawImage / URL / canvas (RGB). Processor output: pixel_values Tensor[1,3,512,512]. Pipeline output: Array<{label: string, score: null, mask: RawImage}>; mask is one-channel 0/255 at target_sizes.

**Maturity evidence**: SegFormer, Xie et al., NeurIPS 2021; nvidia/segformer-b0-finetuned-ade-512-512 has 330,689 Hugging Face downloads (API, 2026-10-17); ADE20K is the standard 150-class segmentation benchmark; transformers.js 4.3.1 is a tagged release. The model's own id2label list names wall, building, sky, windowpane, house, skyscraper, road, car, tree.

**Integration**: Browser ESM: npm `@huggingface/transformers` or a CDN import; ONNX Runtime Web WASM/WebGPU. Model download is the cost (SegFormer-B0 ONNX is tens of MB). Licence constraint: code Apache-2.0, weights non-commercial (NVIDIA), so this is research/evaluation unless the weights are replaced with a permissively licensed checkpoint.

**Risks**: Weights are non-commercial; fixed 512x512 resize distorts perspective; 150-class label noise (a wall can be labelled building and vice versa); first load downloads a model; browser memory/WASM startup; deterministic only if the ORT session is pinned (see onnxruntime-session-options).

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `segformer-transformersjs`; source URL: <https://raw.githubusercontent.com/huggingface/transformers.js/4.3.1/packages/transformers/src/image_processors_utils.js>.

### <a id="onnxruntime-session-options"></a>`onnxruntime-session-options` — ONNX Runtime session options for deterministic inference

- **Layer**: `scene-parse` · **Language**: C/C++ core, JavaScript/TypeScript bindings
- **Repo**: <https://github.com/microsoft/onnxruntime>
- **File**: `include/onnxruntime/core/session/onnxruntime_c_api.h; js/common/lib/inference-session.ts`
- **Version**: `commit b5375da86e523fb8d8e58677b2223fd3d467bb4a; SetDeterministicCompute since 1.17`
- **Licence**: MIT (LICENSE: 'MIT License').
- **Why it matters**: scene-parse/gates: the segmentation and detector outputs must be identical on every run for the frame gates to mean anything. This entry quotes the published knobs and the deterministic-compute default (false).

**Exact call shape / defaults**

```
const session = await ort.InferenceSession.create(model, {
  executionProviders: ['wasm'],
  executionMode: 'sequential',
  graphOptimizationLevel: 'disabled',
  enableCpuMemArena: false,
  enableMemPattern: false,
  intraOpNumThreads: 1
});
// C API: SetSessionExecutionMode(options, ORT_SEQUENTIAL)
//        SetDeterministicCompute(options, true)  // default false
```

**Input/output**: Input: model bytes + SessionOptions. Output: an InferenceSession whose outputs should be bit-reproducible for the same inputs on the same backend.

**Maturity evidence**: ONNX Runtime (Microsoft), used by transformers.js and MediaPipe; MIT; `SetDeterministicCompute` documented since 1.17 with 'Default is false'; the JS SessionOptions interface is published in the API docs.

**Integration**: Browser WASM; MIT. `executionMode`, `graphOptimizationLevel`, `enableCpuMemArena`, `enableMemPattern` are supported by the WASM backend; the docs mark `intraOpNumThreads` Node-only, and deterministic compute is a native GPU option, so the browser must pin what it can and test the rest.

**Risks**: ORT Web may ignore or reject options; threading/GPU reductions are not bit-identical; graph optimisation can change numerics; different EPs (WASM/WebGPU) give different results; the JS API does not expose deterministic compute.

**Snippet**: verbatim 10 lines in [`data/modules.json`](../data/modules.json) under id `onnxruntime-session-options`; source URL: <https://raw.githubusercontent.com/microsoft/onnxruntime/b5375da86e523fb8d8e58677b2223fd3d467bb4a/include/onnxruntime/core/session/onnxruntime_c_api.h>.

### <a id="skyline-oneformer"></a>`skyline-oneformer` — Skyline extraction with a fine-tuned OneFormer

- **Layer**: `horizon` · **Language**: Python, PyTorch, Hugging Face Transformers
- **Repo**: <https://github.com/0xmzk/sky-segmentation>
- **File**: `SkylineExtraction/OneFormer.py`
- **Version**: `commit f3bd795aaf9b2ec826339a27511a1f5211b06023`
- **Licence**: GPL-3.0 (LICENSE: 'GNU GENERAL PUBLIC LICENSE Version 3, 29 June 2007').
- **Why it matters**: horizon: gives a learned skyline instead of the hand-picked sky band and threshold constants in src/sky.js; the horizon row can be read from the mask instead of guessed.

**Exact call shape / defaults**

```
from SkylineExtraction.OneFormer import SkylinePipeline
pipe = SkylinePipeline(device=torch.device('cuda'))
mask = pipe.run_inference(image)  # image: np.ndarray HxWx3, RGB uint8
# default checkpoint = PRE_TRAINED_CHECKPOINT
#   mieszkok/shi-labs_oneformer_ade20k_swin_large_geopose3k_original_images900_epochs5
```

**Input/output**: Input: HxWx3 RGB uint8 numpy array. Output: HxW label map (panoptic segment ids remapped to label ids); skyline is derived from the sky/foreground boundary.

**Maturity evidence**: OneFormer, Shi et al., CVPR 2023; ADE20K-pretrained Swin-Large backbone; fine-tuned on the first 900 GeoPose3K images (repo README). The wrapper itself is a single-author project, so the evidence is the paper + backbone, not adoption of this repo.

**Integration**: PyTorch only; not browser. GPL-3.0 means a derivative integrated into DVOR-8 must be GPL-compatible. Export to ONNX or reproduce the sky class with the Apache/non-commercial SegFormer route instead.

**Risks**: GPL-3.0; PyTorch + GPU; mountainous-domain training (yards and streets differ); large checkpoint; unmaintained single-author wrapper; sky class index must be read from the checkpoint, not assumed.

**Snippet**: verbatim 12 lines in [`data/modules.json`](../data/modules.json) under id `skyline-oneformer`; source URL: <https://raw.githubusercontent.com/0xmzk/sky-segmentation/f3bd795aaf9b2ec826339a27511a1f5211b06023/SkylineExtraction/OneFormer.py>.

### <a id="window-heatmaps"></a>`window-heatmaps` — Window detection in facades using heatmap fusion

- **Layer**: `facade-geometry` · **Language**: Python, PyTorch
- **Repo**: <https://github.com/lck1201/win_det_heatmaps>
- **File**: `common_pytorch/group/tag_group.py`
- **Version**: `commit c41cf77707f1f2aae7cc50a640982f5c23fa5db9`
- **Licence**: MIT (LICENSE: 'MIT License Copyright (c) 2020 chuankang li').
- **Why it matters**: facade-geometry: provides real window boxes for the facade grid instead of typed pitch/row constants; those boxes can seed the window sprites and the 'never outline a window' rule.

**Exact call shape / defaults**

```
python infer.py --cfg /path/to/config.yaml --model /path/to/model.tar --infer /path/to/images
# core grouping API:
group_corners_on_tags(idx, parser, dets, tags, patch_width, patch_height,
                      im_width, im_height, rectify, winScoreThres) -> list[dict]
```

**Input/output**: Input: facade RGB image; network outputs corner heatmaps and tag heatmaps. Output: a list of windows, each four corners (lt, lb, rb, rt) in image coordinates plus a mean score.

**Maturity evidence**: Peer-reviewed: Li et al., 'Window Detection in Facades Using Heatmap Fusion', Journal of Computer Science and Technology 35(4):900-912, 2020; reported precision 91.4% and recall 91.0% at IoU 0.5 on a 3,418-image ZJU facade dataset. MIT licence.

**Integration**: PyTorch + custom C extensions; not browser. MIT permits porting the corner-grouping logic; for a browser pipeline export the backbone to ONNX or use the facade SegFormer mask plus projection profile.

**Risks**: Old PyTorch code, CUDA assumptions, unmaintained; trained for rectified/frontal facades; window grouping needs a tuned score threshold; checkpoint is an external download.

**Snippet**: verbatim 14 lines in [`data/modules.json`](../data/modules.json) under id `window-heatmaps`; source URL: <https://raw.githubusercontent.com/lck1201/win_det_heatmaps/c41cf77707f1f2aae7cc50a640982f5c23fa5db9/common_pytorch/group/tag_group.py>.

### <a id="facade-segformer-cmp"></a>`facade-segformer-cmp` — SegFormer-B0 facade parser (CMP, 6 classes)

- **Layer**: `facade-geometry` · **Language**: ONNX/PyTorch model; JSON config
- **Repo**: <https://huggingface.co/Marco333/segformer-b0-facade-cmp>
- **File**: `config.json`
- **Version**: `model revision f95d623ab89d1179d9f59b8d390cc7a2818d255a (2026-04-26)`
- **Licence**: MIT (model card metadata `license: mit`). Caveat: the model card says it starts from NVIDIA's ADE20K-pretrained SegFormer-B0; the base checkpoint's own licence is the non-commercial NVIDIA Source Code License, so the MIT claim covers this fine-tune only.
- **Why it matters**: facade-geometry: returns window and wall masks directly, which is exactly the geometry the facade layer needs; replaces thresholding and hand-tuned window colours.

**Exact call shape / defaults**

```
const segmenter = await pipeline('image-segmentation', 'Marco333/segformer-b0-facade-cmp', { subtask: 'semantic' });
const out = await segmenter(image, { target_sizes: [[height, width]] });
// classes: 0 background, 1 facade_wall, 2 window, 3 door, 4 balcony, 5 vegetation_occluder
// processor: 512x512, mean [0.485,0.456,0.406], std [0.229,0.224,0.225]
```

**Input/output**: Input: rectified facade RGB image. Output: HxW class ids 0-5 (or one binary mask per present label via the pipeline).

**Maturity evidence**: CMP Facade Database (378 train / 114 test rectified facades); model card reports mean IoU 0.4856, facade_wall IoU 0.867, window IoU 0.410, door IoU 0.460, balcony IoU 0.230. No peer-reviewed paper for this fine-tune; single author.

**Integration**: Browser ESM through transformers.js; MIT metadata; 512x512 input. Licence constraint: the base weights' non-commercial terms must be checked before commercial use.

**Risks**: Window IoU is only 0.410; trained on rectified frontal facades, so perspective yard photos will degrade; single-author, no paper; class imbalance; base-weights provenance.

**Snippet**: verbatim 7 lines in [`data/modules.json`](../data/modules.json) under id `facade-segformer-cmp`; source URL: <https://huggingface.co/Marco333/segformer-b0-facade-cmp/raw/f95d623ab89d1179d9f59b8d390cc7a2818d255a/config.json>.

### <a id="projection-profile"></a>`projection-profile` — 1-D projection-profile segmentation

- **Layer**: `facade-geometry` · **Language**: Python, NumPy
- **Repo**: <https://github.com/lvoegtlin/text_line_segmentation_with_projection_profile>
- **File**: `horizontal_projection.py`
- **Version**: `commit efbce5db509f90ab531a1a060ceb0f9e98f15e0b`
- **Licence**: MIT (LICENSE: 'MIT License Copyright (c) 2019 Lars Vögtlin').
- **Why it matters**: facade-geometry: the missing 1-D step for window pitch. Apply it to the column sums of a window mask or vertical-edge map to recover bay spacing and row spacing instead of the hand-picked pitch constants.

**Exact call shape / defaults**

```
getVerticalProjectionProfile(img) -> np.ndarray   # np.sum(img, axis=0)
cutWordImages(profiles, img, threshold, line_threshold,
              output_folder, img_name, extension)   # threshold is a sum-of-pixels cutoff
```

**Input/output**: Input: 2-D grayscale/binary array. Output: a 1-D profile, then intervals [start,end] where the profile stays above threshold for longer than line_threshold.

**Maturity evidence**: Projection-profile segmentation is a textbook document-analysis method; this repo is a small 2019 MIT CLI (single author, no paper, no tests), so it is a reference implementation rather than a maintained dependency.

**Integration**: Port the 14-line loop to JS; MIT; no dependencies. It is domain-generic, so the facade-specific work (which projection, which threshold) stays ours.

**Risks**: Not facade-specific; threshold and minimum-run length are hand-set; no tests; unmaintained; a projection profile alone cannot distinguish a window row from a balcony rail.

**Snippet**: verbatim 14 lines in [`data/modules.json`](../data/modules.json) under id `projection-profile`; source URL: <https://raw.githubusercontent.com/lvoegtlin/text_line_segmentation_with_projection_profile/efbce5db509f90ab531a1a060ceb0f9e98f15e0b/horizontal_projection.py>.

### <a id="pixeloe-pixelize"></a>`pixeloe-pixelize` — PixelOE pixelize pipeline

- **Layer**: `reduction` · **Language**: Python, OpenCV, NumPy, PyTorch
- **Repo**: <https://github.com/KohakuBlueleaf/PixelOE>
- **File**: `src/pixeloe/legacy/pixelize.py (PyPI 1.0.0 sdist)`
- **Version**: `1.0.0 (PyPI sdist; repository version is 1.0.1 and its layout changed)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: reduction: the published replacement for the area-mean 5x5 block reduction. Its stage 1 (outline expansion) is specifically designed so fine details survive downscaling, which is the project's documented 'windows melt / road markings vanish' fault.

**Exact call shape / defaults**

```
pixelize(img,
        mode="contrast", target_size=128, patch_size=16, pixel_size=None,
        thickness=2, color_matching=True, contrast=1.0, saturation=1.0,
        colors=None, color_quant_method="kmeans", colors_with_weight=False,
        no_upscale=False, no_downscale=False)
```

**Input/output**: Input: BGR uint8 HxWx3. Output: BGR uint8 pixel-art image at the computed target size; optional palette/quantised output.

**Maturity evidence**: PixelOE 1.0.0 on PyPI; the repository ships ComfyUI custom nodes (README); the outline-expansion stage is evaluated against 'Make Your Own Sprites: Aliasing-Aware and Cell-Controllable Pixelization' (SIGGRAPH Asia 2022) in the README.

**Integration**: Python/OpenCV/Torch; not browser. Port the outline expansion and `find_pixel` to JS (Apache-2.0 permits it), or run it offline as a reference generator for tests.

**Risks**: Python + Torch dependency for the median filters; `target_size` semantics differ from a fixed 5x5 cell; k-means quantisation is not deterministic without a seed; upscaling defaults can hide detail loss.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pixeloe-pixelize`; source URL: <https://files.pythonhosted.org/packages/8c/1e/ff5997699c2ee8085dc337b2ee48865a4da9840af7d332246e7941a30327/pixeloe-1.0.0.tar.gz>.

### <a id="pixeloe-contrast-downscale"></a>`pixeloe-contrast-downscale` — PixelOE contrast-based downscale (`find_pixel`)

- **Layer**: `reduction` · **Language**: Python, OpenCV, NumPy, PyTorch
- **Repo**: <https://github.com/KohakuBlueleaf/PixelOE>
- **File**: `src/pixeloe/legacy/downscale/contrast_based.py (PyPI 1.0.0 sdist)`
- **Version**: `1.0.0 (PyPI sdist)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: reduction: this is the exact algorithm that makes a 1-px dark line survive a patch reduction. It replaces `Math.round(sum/count)` in the block reducer and is small enough to port verbatim.

**Exact call shape / defaults**

```
find_pixel(chunks)  # chunks: patch tensor; returns one LAB value per patch
contrast_based_downscale(img, target_size=128)  # img: BGR uint8
```

**Input/output**: Input: BGR uint8 image, target size. Internal: LAB patches. Output: BGR uint8 image at target_hw, using nearest-neighbour for the final resize.

**Maturity evidence**: PixelOE 1.0.0 (PyPI), Apache-2.0; the method is the 'contrast-based downsampling' stage of the PixelOE pipeline whose outline expansion is evaluated in the SIGGRAPH Asia 2022 pixelization paper (README).

**Integration**: Port `find_pixel` to JS typed arrays; Apache-2.0; no native dependency in the port. Keep LAB conversion in the port (sRGB -> XYZ -> LAB) or use the project's existing linear-light code.

**Risks**: The condition `maxi - med == med - mini` falls back to the midpoint; patch edge handling is not specified for non-divisible sizes; the A and B LAB channels are always median-filtered while L uses the skew rule; results depend on the LAB conversion constants.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pixeloe-contrast-downscale`; source URL: <https://files.pythonhosted.org/packages/8c/1e/ff5997699c2ee8085dc337b2ee48865a4da9840af7d332246e7941a30327/pixeloe-1.0.0.tar.gz>.

### <a id="image2pixel-web"></a>`image2pixel-web` — image2pixel-web browser pixel-art pipeline

- **Layer**: `reduction` · **Language**: JavaScript (browser, no build)
- **Repo**: <https://github.com/32comic/image2pixel-web>
- **File**: `web/js/algorithms.js`
- **Version**: `commit 4cac86c2195364d4f98516c4e37d8bbd4e561bc1`
- **Licence**: Custom Restricted License (LICENSE: 'use the Software for personal, educational, or non-commercial purposes only'; 'Commercial use ... strictly prohibited without explicit written permission'). Not an OSI licence.
- **Why it matters**: reduction/palette: the closest existing browser implementation to the current pipeline, useful as an A/B baseline. Its block average is exactly the operation that destroys 1-px structure, so the database records it as the thing to replace, not the fix.

**Exact call shape / defaults**

```
processWithClassicLab(imageData, blockSize, palette)
medianCutGetPaletteInLab(imageData, colorCount)
extractBlockGridAverage(imageData, blockSize) -> {grid, cols, rows}
nearestLabColor(r, g, b, labPalette) -> [r,g,b]
```

**Input/output**: Input: ImageData + blockSize (2-20) + palette [[r,g,b],...]. Output: ImageData at block resolution.

**Maturity evidence**: Live product image2pixel.app with iOS/Android/Steam/Chrome listings (README); five documented algorithms and built-in palettes. No releases, no tests, no open licence.

**Integration**: Browser, no build step; but the licence forbids commercial use and competing derivative works, so DVOR-8 must not vendor it. Read it as a reference, or re-implement the LAB median cut (the math is standard).

**Risks**: Non-commercial custom licence; block average loses detail; no tests; the licence blocks reuse; no source maps.

**Snippet**: verbatim 13 lines in [`data/modules.json`](../data/modules.json) under id `image2pixel-web`; source URL: <https://raw.githubusercontent.com/32comic/image2pixel-web/4cac86c2195364d4f98516c4e37d8bbd4e561bc1/web/js/algorithms.js>.

### <a id="libimagequant"></a>`libimagequant` — libimagequant (pngquant quantizer)

- **Layer**: `palette` · **Language**: Rust and C
- **Repo**: <https://github.com/ImageOptim/libimagequant>
- **File**: `examples/basic.rs; C API in imagequant-sys/libimagequant.h`
- **Version**: `4.4.1 (tag)`
- **Licence**: GPL-3.0-or-later (COPYRIGHT: 'libimagequant ... contains extensive changes and additions by Kornel Lesiński licensed under GPL v3 or later').
- **Why it matters**: palette: the strongest published quantiser to replace the fixed 28-colour median-cut table; its k-means refinement and perceptual distance are the quality bar for palette gates.

**Exact call shape / defaults**

```
liq_attr *attr = liq_attr_create();
liq_set_max_colors(attr, 256);          // default max_colors = 256 (Attributes::new)
liq_set_speed(attr, 5);                 // 0..10; library default speed = 0; example uses 5
liq_set_quality(attr, 0, 100);          // min, max quality
liq_image *img = liq_image_create_rgba(attr, bitmap, w, h, 0.0); // gamma 0.0
liq_result *res = liq_quantize_image(attr, img);
liq_write_remapped_image(res, img, out, w * h);
```

**Input/output**: Input: RGBA8 bitmap + options. Output: palette (RGBA) + one index per pixel (or a remapped RGBA image with dithering).

**Maturity evidence**: libimagequant is pngquant's quantiser (pngquant.org/lib); version 4.4.1; Pillow exposes it as `Quantize.LIBIMAGEQUANT` (Pillow 13.0.0 docs/source), which is independent evidence of adoption beyond the repo itself.

**Integration**: Native C/Rust, not browser. Build to WASM or call the pngquant CLI offline; GPL-3.0-or-later contaminates a distributed derivative, so keep it at arm's length (CLI / build-time asset) unless the project is GPL.

**Risks**: GPL-3.0+; native build; Rust toolchain; determinism of k-means refinement must be checked; WASM build size; gamma and alpha handling are subtle.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `libimagequant`; source URL: <https://raw.githubusercontent.com/ImageOptim/libimagequant/4.4.1/examples/basic.rs>.

### <a id="pillow-median-cut"></a>`pillow-median-cut` — Pillow median-cut quantizer

- **Layer**: `palette` · **Language**: C and Python
- **Repo**: <https://github.com/python-pillow/Pillow>
- **File**: `src/libImaging/Quant.c (API: src/PIL/Image.py)`
- **Version**: `13.0.0 (tag)`
- **Licence**: MIT-CMU / HPND (LICENSE: 'Pillow is licensed under the open source MIT-CMU License').
- **Why it matters**: palette: the reference implementation for the median-cut route already in src/palette.js; its C code shows the box-splitting rule and its Python API supplies the exact defaults and k-means switch.

**Exact call shape / defaults**

```
Image.quantize(colors=256, method=None, kmeans=0, palette=None,
               dither=Dither.FLOYDSTEINBERG)
# method=None -> Quantize.MEDIANCUT for RGB; Quantize.FASTOCTREE for RGBA
# colors default 256; kmeans 0 = off; dither default Floyd–Steinberg
```

**Input/output**: Input: RGB/RGBA image. Output: P-mode image (palette + indices).

**Maturity evidence**: Pillow 13.0.0 is the standard Python imaging library; the median-cut implementation is in its C core and `Image.quantize` documents the default method. libimagequant support in Pillow is separately documented.

**Integration**: Python only. Port the median-cut box split to JS (the project already has a median cut); MIT-CMU licence permits it. Do not depend on Pillow at runtime.

**Risks**: Python/C extension; median cut is lower quality than libimagequant; dithering default changes the output; k-means >0 changes cost and determinism; palette size >256 rejected.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pillow-median-cut`; source URL: <https://raw.githubusercontent.com/python-pillow/Pillow/13.0.0/src/libImaging/Quant.c>.

### <a id="image-q-neuquant"></a>`image-q-neuquant` — image-q NeuQuant (JavaScript port)

- **Layer**: `palette` · **Language**: TypeScript / JavaScript
- **Repo**: <https://github.com/ibezkrovnyi/image-quantization>
- **File**: `packages/image-q/src/palette/neuquant/neuquant.ts`
- **Version**: `3.0.4 (tag image-q@3.0.4)`
- **Licence**: MIT (packages/image-q/package.json: 'license': 'MIT'; LICENSE in the package).
- **Why it matters**: palette: a browser-capable, seeded-by-data alternative to median cut/k-means; NeuQuant's fixed network size (256 default) makes the 28-colour budget explicit and gives a second quantiser for palette gates.

**Exact call shape / defaults**

```
const quantizer = new NeuQuant(distanceCalculator, 256); // colors default 256
quantizer.sample(pointContainer);
for (const {palette, progress} of quantizer.quantize()) { /* ... */ }
```

**Input/output**: Input: PointContainer of RGBA points (an image). Output: Palette (array of RGBA points) via a generator that yields progress.

**Maturity evidence**: NeuQuant by Anthony Dekker, 'Kohonen neural networks for optimal colour quantization', Network: Computation in Neural Systems 5 (1994) 351-367, quoted in the file header; image-q 3.0.4 tagged release; TypeScript port by Igor Bezkrovnyi (MIT).

**Integration**: Browser ESM via the package's `dist/esm` build (bundler) or Node; MIT. It is a library, not a drop-in script, so a small adapter is needed.

**Risks**: NeuQuant is lower quality than libimagequant; 256-network default must be lowered to 28; no worker; the 50MB repo is large to vendor; quantize() is a generator and must be drained.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `image-q-neuquant`; source URL: <https://raw.githubusercontent.com/ibezkrovnyi/image-quantization/image-q@3.0.4/packages/image-q/src/palette/neuquant/neuquant.ts>.

### <a id="lospec-endesga32"></a>`lospec-endesga32` — Lospec palette data: Endesga 32 (JSON and GIMP .gpl)

- **Layer**: `palette` · **Language**: Data: JSON and GIMP Palette text
- **Repo**: <https://lospec.com/palette-list/endesga-32>
- **File**: `endesga-32.gpl; endesga-32.json`
- **Version**: `palette snapshot fetched 2026-10-17; 32 colours; no upstream version`
- **Licence**: No licence stated on the palette page or the JSON endpoint. The file credits author ENDESGA and says it was created for NYKRA. Treat as attribution-only community data and confirm reuse terms before redistribution; the .gpl text format itself is a de-facto standard and is not licensed by this palette.
- **Why it matters**: palette: the published palette the project's ramps imitate. It gives a fixed, recognisable 32-colour target and a real interchange format, so palette gates can compare against a named standard instead of a hand-picked table.

**Exact call shape / defaults**

```
GET https://lospec.com/palette-list/endesga-32.json
  -> {"name":"Endesga 32","author":"ENDESGA","colors":["be4a2f", ... 32 hexes]}
GET https://lospec.com/palette-list/endesga-32.gpl
  -> "GIMP Palette" / "#Palette Name: ..." / "R G B hex" lines
Aseprite .gpl extension: header "GIMP Palette", "Channels: RGBA", then "R G B A name".
```

**Input/output**: HTTP GET -> JSON palette (32 hex strings) or text .gpl (32 RGB triples). Output: a palette table of 32 RGB colours.

**Maturity evidence**: Lospec is the community's palette archive; Endesga 32 is credited to ENDESGA and was created for NYKRA (palette description); the .gpl format is implemented by GIMP, Aseprite and Lospec. There is no release or formal licence.

**Integration**: Fetch or embed the JSON/GPL; browser no-build. Licence constraint: no explicit palette licence, so attribute ENDESGA/Lospec and verify before shipping. The 32 values are data, not code.

**Risks**: No explicit licence; endpoint can change; 32 colours may be too coarse or too stylised for a photograph; `.gpl` names are cosmetic and should not be used as semantic labels.

**Snippet**: verbatim 12 lines in [`data/modules.json`](../data/modules.json) under id `lospec-endesga32`; source URL: <https://lospec.com/palette-list/endesga-32.gpl>.

### <a id="cga16-palette"></a>`cga16-palette` — IBM CGA 16-colour palette (MIT table)

- **Layer**: `palette` · **Language**: C# (static colour table)
- **Repo**: <https://github.com/BenMakesGames/MonoGame.Palettes>
- **File**: `BenMakesGames.MonoGame.Palettes/CGA16.cs`
- **Version**: `commit 10c5b30ab9febed0eb90b7708690bd9b7a093929`
- **Licence**: MIT (LICENSE.md: 'MIT License Copyright (c) 2021-2024 Ben Hendel-Doying').
- **Why it matters**: palette: a hardware-authentic 16-colour constraint for the 8-bit look; a second, very small palette for collapse/flatness gates and for testing whether the frame survives at CGA depth.

**Exact call shape / defaults**

```
CGA16.Black, CGA16.Blue, CGA16.Green, CGA16.Cyan,
CGA16.Red, CGA16.Magenta, CGA16.Brown, CGA16.LightGray,
CGA16.DarkGray, CGA16.BrightBlue, CGA16.BrightGreen, CGA16.BrightCyan,
CGA16.BrightRed, CGA16.BrightMagenta, CGA16.Yellow, CGA16.White
```

**Input/output**: Static data: 16 `Color` values (RGB bytes).

**Maturity evidence**: IBM CGA/EGA standard 16-colour default palette; the table cites ModdingWiki's EGA Palette page; MIT repo. It is a data table, not an algorithm, so maturity is the standard itself.

**Integration**: Copy the 16 hex values into JS; MIT. No runtime dependency.

**Risks**: CGA vs EGA naming; 16 colours is very coarse for a photograph; the table uses the 0xAA/0x55/0xFF EGA levels, not the 2-bit RGBI bit pattern.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `cga16-palette`; source URL: <https://raw.githubusercontent.com/BenMakesGames/MonoGame.Palettes/10c5b30ab9febed0eb90b7708690bd9b7a093929/BenMakesGames.MonoGame.Palettes/CGA16.cs>.

### <a id="mediapipe-object-detector"></a>`mediapipe-object-detector` — MediaPipe Tasks Vision ObjectDetector (EfficientDet-Lite0)

- **Layer**: `objects` · **Language**: TypeScript / JavaScript / WASM
- **Repo**: <https://github.com/google-ai-edge/mediapipe>
- **File**: `mediapipe/tasks/web/vision/object_detector/object_detector.ts`
- **Version**: `commit 800a56cc5004f6b0b0bb65134cc6c2ec12f0c88f; npm @mediapipe/tasks-vision 1.1.1`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: objects: a real browser detector for cars, people, trucks and buses, replacing hand-coloured object heuristics. It also proves the COCO limit: the model's own label list contains no building, window or sky, which is why buildings must come from segmentation/structures, not COCO.

**Exact call shape / defaults**

```
const detector = await ObjectDetector.createFromOptions(wasmFileset, {
  baseOptions: { modelAssetPath:
    'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite' },
  runningMode: 'IMAGE',       // default
  scoreThreshold: 0.5,        // optional; unset = model metadata
  maxResults: 5               // optional; unset = model metadata
});
const result = detector.detect(image); // {detections:[{boundingBox, categories:[{categoryName,score}]}]}
```

**Input/output**: Input: ImageSource. Output: ObjectDetectorResult = {detections: Detection[]}; each Detection has an optional BoundingBox and Category[] {score, index, categoryName, displayName}.

**Maturity evidence**: MediaPipe (Google), Apache-2.0; EfficientDet-Lite0 is the documented lightweight COCO detector; model file is 13MB TFLite; @mediapipe/tasks-vision 1.1.1. The model's embedded labels were read directly: person, bicycle, car ... toothbrush, with no building/window/sky.

**Integration**: Browser ESM + WASM fileset (`@mediapipe/tasks-vision`); Apache-2.0. The WASM assets and the 13MB model must be hosted; no build step is possible for the model itself.

**Risks**: COCO has no building class; 320x320 input misses small windows; boxes overlap; WASM/GPU backend differs; model download; not deterministic across backends.

**Snippet**: verbatim 8 lines in [`data/modules.json`](../data/modules.json) under id `mediapipe-object-detector`; source URL: <https://raw.githubusercontent.com/google-ai-edge/mediapipe/800a56cc5004f6b0b0bb65134cc6c2ec12f0c88f/mediapipe/tasks/web/vision/object_detector/object_detector.ts>.

### <a id="imgly-background-removal"></a>`imgly-background-removal` — @imgly/background-removal (mask to sprite)

- **Layer**: `objects` · **Language**: TypeScript / JavaScript, ONNX/WASM
- **Repo**: <https://github.com/imgly/background-removal-js>
- **File**: `packages/web/src/api/v1.ts`
- **Version**: `1.7.0 (packages/web/package.json); commit 12f56cc4f2a90d624e165a715748d22efc7a1d93`
- **Licence**: AGPL-3.0 (LICENSE.md: 'GNU Affero General Public License Version 3, 19 November 2007').
- **Why it matters**: objects: the mask-to-sprite mechanism. A car/person cut-out keeps the photograph's own pixels and gains alpha, which is precisely the 'photograph is a source of facts, not pixels' rule for movable objects.

**Exact call shape / defaults**

```
removeBackground(image, configuration?) -> Promise<Blob>
segmentForeground(image, configuration?) -> Promise<Blob>
applySegmentationMask(image, mask, config?) -> Promise<Blob>
```

**Input/output**: Input: ImageSource (URL/Blob/ImageData) + optional config. Output: Blob (PNG with alpha).

**Maturity evidence**: IMG.LY production library, version 1.7.0; AGPL-3.0; runs an ONNX model fully client-side (README/package keywords 'image-segmentation', 'image-matting', 'onnx'). Maturity is commercial deployment, not a paper.

**Integration**: Browser ESM; AGPL-3.0. Network use of AGPL code triggers a source-availability obligation; for a closed project use it offline as a comparison or replace it with a permissively licensed matting model.

**Risks**: AGPL-3.0 is incompatible with a closed distribution; model download; GPU/WASM performance; alpha edges may fringe; output resolution is model-dependent; not deterministic across backends.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `imgly-background-removal`; source URL: <https://raw.githubusercontent.com/imgly/background-removal-js/12f56cc4f2a90d624e165a715748d22efc7a1d93/packages/web/src/api/v1.ts>.

### <a id="pixeloe-color-match"></a>`pixeloe-color-match` — PixelOE LAB/wavelet colour matching

- **Layer**: `style-register` · **Language**: Python, OpenCV, NumPy
- **Repo**: <https://github.com/KohakuBlueleaf/PixelOE>
- **File**: `src/pixeloe/legacy/color.py (PyPI 1.0.0 sdist)`
- **Version**: `1.0.0 (PyPI sdist)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: style-register: directly addresses the measured 'the frame is neutral where the accepted frame is blue' fault. The area-first reduction averages a region's colour; this is a published way to pull the reduced frame back to the photograph's colour distribution.

**Exact call shape / defaults**

```
match_color(source, target, level=5)  # BGR uint8 -> BGR uint8
wavelet_colorfix(inp, target, level=5)
wavelet_decomposition(inp, levels)
```

**Input/output**: Input: source and target BGR uint8 images (same size after resize). Output: source with target's LAB statistics and low-frequency colour.

**Maturity evidence**: PixelOE 1.0.0 (PyPI), Apache-2.0; the same pipeline ships ComfyUI custom nodes; the low-frequency wavelet colour-fix is the standard colour-transfer step used in the project's reference pipeline.

**Integration**: Python/OpenCV; port the mean/std LAB transfer and a small Gaussian pyramid to JS. Apache-2.0.

**Risks**: Global mean/std can wash out local colour (a red car can still go neutral); wavelet level 5 is a tuned constant; source/target order is easy to reverse; not a substitute for per-region colour families.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pixeloe-color-match`; source URL: <https://files.pythonhosted.org/packages/8c/1e/ff5997699c2ee8085dc337b2ee48865a4da9840af7d332246e7941a30327/pixeloe-1.0.0.tar.gz>.

### <a id="opencv-morph-gradient"></a>`opencv-morph-gradient` — OpenCV morphological gradient (1-px outline)

- **Layer**: `outlines` · **Language**: C++, Python, JavaScript (opencv.js)
- **Repo**: <https://github.com/opencv/opencv>
- **File**: `modules/imgproc/src/morph.dispatch.cpp`
- **Version**: `4.14.0 (tag)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: outlines: the published 1-px boundary operator that replaces the hand-drawn outline pass. It follows any shape, so a building or car gets one outline that hugs its silhouette instead of a rectangle.

**Exact call shape / defaults**

```
cv2.morphologyEx(src, cv2.MORPH_GRADIENT, kernel,
                  anchor=(-1,-1), iterations=1,
                  borderType=cv2.BORDER_CONSTANT,
                  borderValue=cv2.morphologyDefaultBorderValue())
# default kernel if none: cv2.getStructuringElement(cv2.MORPH_RECT, (3,3), (1,1))
```

**Input/output**: Input: binary/grayscale (or colour) image + structuring element. Output: edge mask where dilate != erode; 1-px wide for a 3x3 kernel.

**Maturity evidence**: OpenCV 4.14.0, the reference computer-vision library; morphological gradient is a textbook operator (dilate − erode); PixelOE uses erode/dilate in its outline expansion.

**Integration**: opencv.js WASM (~8MB) or port 3x3 erode/dilate to typed arrays; Apache-2.0. A 3x3 port is ~30 lines and avoids the WASM payload.

**Risks**: opencv.js size; gradient on colour produces 3-channel edges; needs a binarised mask or it outlines texture; border handling can add a frame edge; OpenCV 5 API differs.

**Snippet**: verbatim 5 lines in [`data/modules.json`](../data/modules.json) under id `opencv-morph-gradient`; source URL: <https://raw.githubusercontent.com/opencv/opencv/4.14.0/modules/imgproc/src/morph.dispatch.cpp>.

### <a id="pixeloe-outline"></a>`pixeloe-outline` — PixelOE contrast-aware outline expansion

- **Layer**: `outlines` · **Language**: Python, OpenCV, NumPy, PyTorch
- **Repo**: <https://github.com/KohakuBlueleaf/PixelOE>
- **File**: `src/pixeloe/legacy/outline.py (PyPI 1.0.0 sdist)`
- **Version**: `1.0.0 (PyPI sdist)`
- **Licence**: Apache-2.0 (LICENSE: 'Apache License Version 2.0, January 2004').
- **Why it matters**: outlines/reduction: this is the published stage-1 that prevents a 1-px line from disappearing in the downscale. It is the direct fix for the measured 'area mean survives 0 of 8 cells' failure.

**Exact call shape / defaults**

```
outline_expansion(img, erode=2, dilate=2, k=16, avg_scale=10, dist_scale=3)
    -> (img_out, weight)
expansion_weight(img, k=8, stride=2, avg_scale=10, dist_scale=3)
```

**Input/output**: Input: BGR uint8 image. Output: BGR uint8 expanded image + float weight map (0..1).

**Maturity evidence**: PixelOE 1.0.0 (PyPI), Apache-2.0; ComfyUI custom nodes in-repo; the README evaluates outline expansion against the SIGGRAPH Asia 2022 'Make Your Own Sprites' pixelization method.

**Integration**: Python/OpenCV/Torch; port the erode/dilate blend and sigmoid weight to JS. Apache-2.0.

**Risks**: Torch is used for median/max/min chunking; 9x9 kernels are tuned for pixel_size 6-16, not 5; parameters (avg_scale, dist_scale) are hand-tuned; can over-thicken dark edges.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pixeloe-outline`; source URL: <https://files.pythonhosted.org/packages/8c/1e/ff5997699c2ee8085dc337b2ee48865a4da9840af7d332246e7941a30327/pixeloe-1.0.0.tar.gz>.

### <a id="luanti-falling"></a>`luanti-falling` — Luanti falling-node support check

- **Layer**: `damage-cascade` · **Language**: Lua
- **Repo**: <https://github.com/luanti-org/luanti>
- **File**: `builtin/game/falling.lua`
- **Version**: `5.17.0 (tag)`
- **Licence**: LGPL-2.1-or-later (README badge `license-LGPLv2.1%2B`); textures/sounds separately CC BY-SA 3.0 in LICENSE.txt.
- **Why it matters**: damage-cascade: the published rule for 'a cell falls when its support disappears'. It replaces ad-hoc cascades with a tested support predicate (bottom cell not walkable / buildable_to) and a falling-entity conversion.

**Exact call shape / defaults**

```
core.check_single_for_falling(pos) -> boolean
core.check_for_falling(pos)       -- walks neighbours
core.spawn_falling_node(pos)
-- node opt-in: groups = { falling_node = 1 }
```

**Input/output**: Input: node position in a voxel grid. Output: boolean; side effect: node removed and a `__builtin:falling_node` entity spawned above.

**Maturity evidence**: Luanti 5.17.0 (formerly Minetest), a long-running open-source voxel engine; falling-node behaviour is part of its default game; LGPL-2.1+.

**Integration**: Reimplement the 15-line predicate in JS; LGPL applies only if the Lua code is ported/copied, so a clean-room implementation of the rule avoids it. The algorithm is a grid support check, not a physics engine.

**Risks**: Node grid, not continuous physics; falling entity is visual and lands later; only checks the cell below (not lateral support); LGPL if copied; Lua.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `luanti-falling`; source URL: <https://raw.githubusercontent.com/luanti-org/luanti/5.17.0/builtin/game/falling.lua>.

### <a id="pixelmatch"></a>`pixelmatch` — pixelmatch perceptual pixel diff

- **Layer**: `gates` · **Language**: JavaScript
- **Repo**: <https://github.com/mapbox/pixelmatch>
- **File**: `index.js`
- **Version**: `8.0.0 (tag v8.0.0)`
- **Licence**: ISC (LICENSE: 'ISC License Copyright (c) 2025, Mapbox').
- **Why it matters**: gates: the project's reference gate needs a perceptual, AA-aware pixel comparison, not raw equality. pixelmatch's 0.1 threshold and AA handling are the published defaults to quote in gate premises.

**Exact call shape / defaults**

```
pixelmatch(img1, img2, output, width, height, {
  threshold = 0.1,          // OKLab HyAB, 0..1
  includeAA = false,
  alpha = 0.1,
  aaColor = [255,255,0],
  diffColor = [255,0,0],
  checkerboard = true,
  windowSize = Infinity,
  diffMask = false
}) -> number  // mismatched pixels (or max per-window count)
```

**Input/output**: Input: two RGBA Uint8Array/Uint8ClampedArray of length w*h*4, optional output buffer. Output: diff count (number) and, if output given, a diff RGBA image.

**Maturity evidence**: Mapbox; v8.0.0; a declared dependency of jest-image-snapshot 5.x (npm metadata, 2026-10-17); the de-facto JS screenshot-diff implementation.

**Integration**: Browser and Node ESM; ISC; zero dependencies. It compares rendered frames, so the capture must be a finished frame (see the project's screenshot trap).

**Risks**: v8 threshold is OKLab HyAB, not the older YIQ; AA detection can hide real 1-px differences; requires equal dimensions; output buffer must be RGBA; not a quality metric by itself.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `pixelmatch`; source URL: <https://raw.githubusercontent.com/mapbox/pixelmatch/v8.0.0/index.js>.

### <a id="skimage-ssim"></a>`skimage-ssim` — scikit-image structural similarity (SSIM)

- **Layer**: `gates` · **Language**: Python
- **Repo**: <https://github.com/scikit-image/scikit-image>
- **File**: `src/skimage/metrics/_structural_similarity.py`
- **Version**: `0.26.0 (tag v0.26.0)`
- **Licence**: BSD-3-Clause (LICENSE.txt: 'Files: * ... License: BSD-3-Clause').
- **Why it matters**: gates: an established reference metric for the whole frame, complementing pixelmatch. It must be called with `data_range=255` and a fixed `win_size` so the premise is printable with the verdict.

**Exact call shape / defaults**

```
structural_similarity(im1, im2, *,
    win_size=None, gradient=False, data_range=None,
    channel_axis=None, gaussian_weights=False, full=False)
```

**Input/output**: Input: two arrays of the same shape; `data_range` should be 255 for uint8. Output: float SSIM (or (score, map) when full=True).

**Maturity evidence**: Wang, Bovik, Sheikh, Simoncelli, 'Image Quality Assessment: From Error Visibility to Structural Similarity', IEEE Transactions on Image Processing 13(4), 2004; scikit-image 0.26.0.

**Integration**: Python gate (or a JS port such as ssim.js); BSD-3. Run it in the offline chain, not the browser page.

**Risks**: `data_range` inferred from dtype can be wrong for float images; window size must be odd and smaller than the image; SSIM is not designed for pixel art; global score hides local faults.

**Snippet**: verbatim 12 lines in [`data/modules.json`](../data/modules.json) under id `skimage-ssim`; source URL: <https://raw.githubusercontent.com/scikit-image/scikit-image/v0.26.0/src/skimage/metrics/_structural_similarity.py>.

### <a id="imagehash-phash"></a>`imagehash-phash` — pHash perceptual hash

- **Layer**: `gates` · **Language**: Python
- **Repo**: <https://github.com/JohannesBuchner/imagehash>
- **File**: `imagehash/__init__.py`
- **Version**: `4.3.2 (tag v4.3.2)`
- **Licence**: BSD-2-Clause (LICENSE: two redistribution conditions, 'THIS SOFTWARE IS PROVIDED ... AS IS').
- **Why it matters**: gates: catches global composition/palette changes that a pixel diff misses and tolerates small AA/palette shifts. It is the right 'is this still the same picture?' gate, not a quality score.

**Exact call shape / defaults**

```
phash(image, hash_size=8, highfreq_factor=4) -> ImageHash
# image: PIL image; img_size = hash_size * highfreq_factor (32)
# ImageHash.distance(other) -> Hamming distance
```

**Input/output**: Input: PIL image. Output: ImageHash (64 boolean values for 8x8). Hamming distance is an integer 0..64.

**Maturity evidence**: pHash from Hacker Factor ('Looks Like It'), implemented by imagehash 4.3.2, the standard Python perceptual-hash package; the repo ships `find_similar_images.py` for duplicate detection.

**Integration**: Python gate; port DCT or use a JS perceptual-hash library; BSD-2. Hamming distance threshold must be printed with the verdict.

**Risks**: Resize/AA changes the hash; a palette change can flip bits; 64 bits is small; not a quality metric; scipy FFT dependency.

**Snippet**: verbatim 9 lines in [`data/modules.json`](../data/modules.json) under id `imagehash-phash`; source URL: <https://raw.githubusercontent.com/JohannesBuchner/imagehash/v4.3.2/imagehash/__init__.py>.

### <a id="skimage-entropy"></a>`skimage-entropy` — Shannon entropy of an image

- **Layer**: `gates` · **Language**: Python
- **Repo**: <https://github.com/scikit-image/scikit-image>
- **File**: `src/skimage/measure/entropy.py`
- **Version**: `0.26.0 (tag v0.26.0)`
- **Licence**: BSD-3-Clause (LICENSE.txt: 'Files: * ... License: BSD-3-Clause').
- **Why it matters**: gates: a flatness/colour-collapse measure. It is the published form of the project's '116 tones, largest 31%' gate and can be printed alongside the histogram's largest-bin share.

**Exact call shape / defaults**

```
shannon_entropy(image, base=2) -> float
# body: _, counts = unique(image, return_counts=True)
#       return scipy.stats.entropy(counts, base=base)
```

**Input/output**: Input: grayscale (M,N) array. Output: float bits (0..log2(number of levels)).

**Maturity evidence**: Shannon entropy (1948); scikit-image 0.26.0 standard measure; the implementation is a two-line wrapper over `scipy.stats.entropy`.

**Integration**: Three lines in JS (histogram + -sum p log p); BSD-3. Use it on the finished frame, not a transient overlay.

**Risks**: Entropy of a quantised image is bounded by log2(palette size); it does not measure spatial flatness; a single dominant tone lowers entropy but may be intentional (sky).

**Snippet**: verbatim 4 lines in [`data/modules.json`](../data/modules.json) under id `skimage-entropy`; source URL: <https://raw.githubusercontent.com/scikit-image/scikit-image/v0.26.0/src/skimage/measure/entropy.py>.

### <a id="font8x8"></a>`font8x8` — font8x8 8x8 bitmap font

- **Layer**: `hud-text` · **Language**: C header (data table)
- **Repo**: <https://github.com/dhepper/font8x8>
- **File**: `font8x8_basic.h`
- **Version**: `commit 8e279d2d864e79128e96188a6b9526cfa3fbfef9`
- **Licence**: Public Domain (header: 'License: Public Domain'; derived from IBM VGA public-domain 8x8 fonts).
- **Why it matters**: hud-text: a zero-dependency 1KB bitmap font for the HUD; it replaces canvas `fillText` with deterministic pixel glyphs that obey the same integer grid as the frame.

**Exact call shape / defaults**

```
font8x8_basic[128][8]
// glyph for ASCII code ch, row y: font8x8_basic[ch][y]
// README: "The least significant bit of each byte corresponds to the first
// pixel in a row." Right-shift by n to access pixel n.
```

**Input/output**: Input: ASCII code 0-127 + row 0-7. Output: 8-bit row mask.

**Maturity evidence**: Derived from IBM's public-domain VGA 8x8 font (header provenance: Marcel Sondaar / IBM public domain); README Encoding states: 'The least significant bit of each byte corresponds to the first pixel in a row'; commit 8e279d2.

**Integration**: Copy the 128x8 table into JS or load the header at build time; public domain. Render with the same 1-bit fill rule as the frame.

**Risks**: ASCII only (no Cyrillic, which the project may need for Russian HUD text); 8x8 is fixed; bit order must match the renderer; anti-aliasing must be off.

**Snippet**: verbatim 8 lines in [`data/modules.json`](../data/modules.json) under id `font8x8`; source URL: <https://raw.githubusercontent.com/dhepper/font8x8/8e279d2d864e79128e96188a6b9526cfa3fbfef9/font8x8_basic.h>.

### <a id="zzfx"></a>`zzfx` — ZzFX tiny synth

- **Layer**: `audio` · **Language**: JavaScript
- **Repo**: <https://github.com/KilledByAPixel/ZzFX>
- **File**: `ZzFX.js`
- **Version**: `1.4.0 (file header); commit aab7e2b6b9086746b6e55fab75c75ce03e716c49`
- **Licence**: MIT (ZzFX.js header: 'MIT License Copyright (c) 2019 Frank Force').
- **Why it matters**: audio: replaces hand-written WebAudio envelopes with a published 8-bit SFX synth for hits, breaks and HUD blips; tiny enough for the no-build ESM constraint.

**Exact call shape / defaults**

```
zzfx(...parameters) // -> AudioBufferSourceNode
ZZFX.play(...parameters)
ZZFX.buildSamples(volume=1, randomness=.05, frequency=220, attack=0,
  sustain=0, release=.1, shape=0, shapeCurve=1, slide=0, deltaSlide=0,
  pitchJump=0, pitchJumpTime=0, repeatTime=0, noise=0, modulation=0,
  bitCrush=0, delay=0, sustainVolume=1, decay=0, tremolo=0, filter=0)
```

**Input/output**: Input: 20 numeric parameters. Output: AudioBufferSourceNode (play) or Float32Array samples (buildSamples).

**Maturity evidence**: ZzFX 1.4.0; the README lists dozens of js13k/itch games using it (Space Huggers, Clawstrike, Cat Survivors, ...); MIT.

**Integration**: Browser ESM; MIT; no dependencies. Set `randomness: 0` for deterministic replays; create the AudioContext on a user gesture.

**Risks**: `buildSamples` multiplies by `Math.random()` through the `randomness` parameter (non-deterministic by default); creates an AudioContext at import; can clip/loud; no tracker/sequencer.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `zzfx`; source URL: <https://raw.githubusercontent.com/KilledByAPixel/ZzFX/aab7e2b6b9086746b6e55fab75c75ce03e716c49/ZzFX.js>.

### <a id="jsfxr"></a>`jsfxr` — jsfxr (sfxr port)

- **Layer**: `audio` · **Language**: JavaScript
- **Repo**: <https://github.com/chr15m/jsfxr>
- **File**: `sfxr.js`
- **Version**: `commit b7b6aa27d62f8f356db267276bf54b451555c49d (npm jsfxr)`
- **Licence**: Unlicense / public domain (UNLICENSE: 'This is free and unencumbered software released into the public domain').
- **Why it matters**: audio: the published sfxr preset vocabulary gives destruction/HUD sounds a named, reproducible definition instead of hand-tuned oscillator graphs.

**Exact call shape / defaults**

```
const sound = sfxr.generate('pickupCoin', { sound_vol: 0.25, sample_rate: 44100, sample_size: 8 });
sfxr.play(sound);
// presets: pickupCoin, laserShoot, explosion, powerUp, hitHurt, jump,
//          blipSelect, synth, tone, click, random
```

**Input/output**: Input: preset name + optional sample settings. Output: sound parameter object; `play` returns/plays via WebAudio.

**Maturity evidence**: sfxr by DrPetter (2007), jsfxr port by Eric Fredricksen, maintained by Chris McCormick; hosted at sfxr.me; Unlicense.

**Integration**: Browser script or ESM; Unlicense. Serialize the generated params to make a sound reproducible.

**Risks**: Global `riffwave` dependency in the browser script path; `random` preset is random; old code; audio context on gesture.

**Snippet**: verbatim 8 lines in [`data/modules.json`](../data/modules.json) under id `jsfxr`; source URL: <https://raw.githubusercontent.com/chr15m/jsfxr/b7b6aa27d62f8f356db267276bf54b451555c49d/sfxr.js>.

### <a id="mulberry32"></a>`mulberry32` — mulberry32 seeded PRNG

- **Layer**: `state` · **Language**: JavaScript
- **Repo**: <https://github.com/bryc/code>
- **File**: `jshash/PRNGs.md`
- **Version**: `commit 88c1317ea6f9b25c153afa9c369c365fed11b482`
- **Licence**: Public domain (file header: '*License: Public domain. Software licenses are annoying...').
- **Why it matters**: state: the project already ships these exact constants in src/rng.js. This entry is the provenance and the correctness reference: the constants and the `>>> 0` coercions are quoted from the canonical source.

**Exact call shape / defaults**

```
const rand = mulberry32(seed >>> 0);
rand() -> number in [0, 1)
// state = 32 bits; period 2^32
```

**Input/output**: Input: uint32 seed. Output: closure `() => number`.

**Maturity evidence**: bryc's PRNG page: 'very fast and passes gjrand. best 2^32 state JS PRNG'; the page benchmarks it against sfc32/jsf32/xoshiro; the implementation is widely copied (and already present in this repo).

**Integration**: Browser/Node, no dependencies; public domain. Keep the `>>> 0` after addition and the two `Math.imul` rounds exactly.

**Risks**: 32-bit state (2^32 period) is small for large worlds; not cryptographic; JavaScript number coercion can silently break the constants if `|0` is omitted; no jump/stream support.

**Snippet**: verbatim 9 lines in [`data/modules.json`](../data/modules.json) under id `mulberry32`; source URL: <https://raw.githubusercontent.com/bryc/code/88c1317ea6f9b25c153afa9c369c365fed11b482/jshash/PRNGs.md>.

### <a id="splitmix64"></a>`splitmix64` — splitmix64 seed expander

- **Layer**: `state` · **Language**: C
- **Repo**: <https://prng.di.unimi.it/splitmix64.c>
- **File**: `splitmix64.c`
- **Version**: `no VCS version; 2015 file header; snapshot fetched 2026-10-17`
- **Licence**: Public domain / CC0 (header: 'To the extent possible under law, the author has dedicated all copyright ... to the public domain worldwide').
- **Why it matters**: state: deterministic seed expansion for worlds/levels. Use it to turn one photo hash into the 4x64-bit state xoshiro256** needs, instead of an ad-hoc LCG.

**Exact call shape / defaults**

```
uint64_t next(void);       // state static uint64_t x
// z = (x += 0x9e3779b97f4a7c15);
// z = (z ^ (z >> 30)) * 0xbf58476d1ce4e5b9;
// z = (z ^ (z >> 27)) * 0x94d049bb133111eb;
// return z ^ (z >> 31);
```

**Input/output**: Input: 64-bit state (any value). Output: 64-bit value.

**Maturity evidence**: Sebastiano Vigna, 2015; header cites the Java 8 SplittableRandom paper (DOI 10.1145/2714064.2660195); the header says it passes BigCrush.

**Integration**: Port to BigInt (slow) or two 32-bit halves; public domain. It is a seeder, not the main generator.

**Risks**: 64-bit arithmetic in JS needs BigInt or hi/lo pairs; not cryptographic; the C `static` state is not reentrant; do not use it directly for large streams.

**Snippet**: verbatim 7 lines in [`data/modules.json`](../data/modules.json) under id `splitmix64`; source URL: <https://prng.di.unimi.it/splitmix64.c>.

### <a id="xoshiro256starstar"></a>`xoshiro256starstar` — xoshiro256** 1.0

- **Layer**: `state` · **Language**: C
- **Repo**: <https://prng.di.unimi.it/xoshiro256starstar.c>
- **File**: `xoshiro256starstar.c`
- **Version**: `no VCS version; 2018 file header; snapshot fetched 2026-10-17`
- **Licence**: Public domain / CC0 (header: 'To the extent possible under law, the author has dedicated all copyright ... to the public domain worldwide').
- **Why it matters**: state: a high-quality deterministic stream for damage cascades and procedural variation, with jump for parallel/independent layers. It replaces one shared Math.random and makes replays exact.

**Exact call shape / defaults**

```
uint64_t next(void);   // state: static uint64_t s[4], not all zero
void jump(void);       // 2^128 calls
void long_jump(void);  // 2^192 calls
// seed: fill s[0..3] with splitmix64 output
```

**Input/output**: Input: 4x64-bit nonzero state. Output: 64-bit value per call; jump functions advance the stream.

**Maturity evidence**: Blackman & Vigna, 2018, xoshiro256** 1.0; header: 'passes all tests we are aware of'; reference implementation used across languages; the same authors' xoshiro family is widely deployed.

**Integration**: BigInt or 32-bit halves; public domain. Seed via splitmix64; never all-zero. The 64-bit arithmetic is the integration cost.

**Risks**: 64-bit JS cost (BigInt is slow); must not seed all-zero; jump constants are easy to mistype; not cryptographic; output is 64-bit so a float conversion needs care.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `xoshiro256starstar`; source URL: <https://prng.di.unimi.it/xoshiro256starstar.c>.

### <a id="pcg32"></a>`pcg32` — PCG32 (XSH-RR)

- **Layer**: `state` · **Language**: C
- **Repo**: <https://github.com/imneme/pcg-c-basic>
- **File**: `pcg_basic.c`
- **Version**: `commit bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3`
- **Licence**: Apache-2.0 (LICENSE.txt: 'Apache License Version 2.0, January 2004').
- **Why it matters**: state: a proven seeded generator when a 64-bit state is wanted; a second implementation to cross-check mulberry32 streams and to avoid the 'hand-picked constants' pattern.

**Exact call shape / defaults**

```
pcg32_random_t rng = PCG32_INITIALIZER;
pcg32_srandom_r(&rng, initstate, initseq);
uint32_t x = pcg32_random_r(&rng);
// state = oldstate * 6364136223846793005ULL + inc;
// inc = (initseq << 1u) | 1u;
```

**Input/output**: Input: 64-bit initstate + 64-bit initseq (stream). Output: uint32_t per call.

**Maturity evidence**: Melissa O'Neill, 'PCG: A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation' (2014); PCG64 is NumPy's default BitGenerator; Apache-2.0 reference C.

**Integration**: BigInt or 32-bit halves; Apache-2.0. The increment must be odd; seed with two values (state, stream).

**Risks**: 64-bit arithmetic in JS; not cryptographic; `initseq` must be odd after the shift; the C API uses a global default RNG if `_r` variants are not used.

**Snippet**: verbatim 11 lines in [`data/modules.json`](../data/modules.json) under id `pcg32`; source URL: <https://raw.githubusercontent.com/imneme/pcg-c-basic/bc39cd76ac3d541e618606bcc6e1e5ba5e5e6aa3/pcg_basic.c>.

### <a id="tiled-tmx"></a>`tiled-tmx` — Tiled TMX map format 1.8

- **Layer**: `state` · **Language**: XML
- **Repo**: <https://github.com/mapeditor/tiled>
- **File**: `docs/reference/tmx-map-format.rst`
- **Version**: `TMX 1.8; Tiled commit 221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd`
- **Licence**: TMX specification: CC-BY-SA 3.0 Unported (footer: 'The TMX Map Format by https://www.mapeditor.org is licensed under a Creative Commons Attribution-ShareAlike 3.0 Unported License'). Tiled application: GPL-2.0 (LICENSE.GPL).
- **Why it matters**: state: a published level format so the photo-derived level can be opened, edited and diffed in Tiled instead of living only in a bespoke JSON. It also fixes the tile-size/orientation vocabulary the level generator must emit.

**Exact call shape / defaults**

```
<map version="1.8" tiledversion="..." orientation="orthogonal"
     renderorder="right-down" width="W" height="H"
     tilewidth="TW" tileheight="TH">
  <layer id="1" name="ground" width="W" height="H">
    <data encoding="csv">1,2,3,...</data>
  </layer>
</map>
```

**Input/output**: Input: XML. Output: tile grid(s) of global IDs (gids); gid 0 = empty; high bits are flip flags.

**Maturity evidence**: Tiled is the standard 2D map editor; TMX 1.8 is its current documented format; many engines/libraries import TMX (the spec links a support list); docs are CC-BY-SA 3.0.

**Integration**: Browser DOMParser, no build. The docs are CC-BY-SA 3.0 (attribution/share-alike for copied spec text); Tiled code is GPL-2.0+. An independent parser is not a derivative of the docs.

**Risks**: XML is verbose; gid flip flags are easy to mishandle; TMX has no physics/semantics; the spec's CC-BY-SA applies to copied text, not to an independent parser.

**Snippet**: verbatim 13 lines in [`data/modules.json`](../data/modules.json) under id `tiled-tmx`; source URL: <https://raw.githubusercontent.com/mapeditor/tiled/221be2066c4b0ed4bbefbcdfe25d0ad952fc51bd/docs/reference/tmx-map-format.rst>.

### <a id="ldtk-json"></a>`ldtk-json` — LDtk JSON level format 1.5.3

- **Layer**: `state` · **Language**: JSON
- **Repo**: <https://github.com/deepnight/ldtk>
- **File**: `docs/JSON_DOC.md`
- **Version**: `1.5.3 (tag v1.5.3)`
- **Licence**: MIT (LICENSE: 'MIT License Copyright (c) 2020, Sébastien Benard - Deepnight Games').
- **Why it matters**: state: a modern level format with int-grid and entity support, easier to generate than TMX and well suited to a photo-derived occupancy grid plus object entities.

**Exact call shape / defaults**

```
project.levels[].layerInstances[]: {
  __cWid, __cHei, __gridSize, __identifier, __type,
  gridTiles: [{px, src, f, t}],      // tile layers
  intGridCsv: [0,1,...],             // IntGrid layers
  entityInstances: [...]             // entity layers
}
```

**Input/output**: Input: JSON. Output: levels -> layer instances -> tiles/intgrid/entities; coordinates are pixels or grid cells depending on the field.

**Maturity evidence**: LDtk by Sébastien Benard / Deepnight Games, 1.5.3, MIT; a published level editor and JSON schema from the creator of Dead Cells.

**Integration**: JSON.parse, no build; MIT. Emit `layerInstances` with `gridTiles`/`intGridCsv`; keep the schema version in the file.

**Risks**: Schema churn across versions; `layerInstances` is null when levels are saved separately; verbose object arrays; no built-in physics semantics.

**Snippet**: verbatim 15 lines in [`data/modules.json`](../data/modules.json) under id `ldtk-json`; source URL: <https://raw.githubusercontent.com/deepnight/ldtk/v1.5.3/docs/JSON_DOC.md>.

### <a id="rotjs-cellular"></a>`rotjs-cellular` — ROT.js cellular automaton map generator

- **Layer**: `state` · **Language**: TypeScript / JavaScript
- **Repo**: <https://github.com/ondras/rot.js>
- **File**: `src/map/cellular.ts`
- **Version**: `2.2.1 (tag v2.2.1)`
- **Licence**: BSD-3-Clause (license.txt: 'Copyright (c) 2012-now(), Ondrej Zara'; three-clause BSD text).
- **Why it matters**: state: turns a photo-derived occupancy grid into a connected, playable level (caves/streets) with published born/survive rules, instead of hand-made level rules.

**Exact call shape / defaults**

```
new ROT.Map.Cellular(width, height, {
  born: [5,6,7,8],
  survive: [4,5,6,7,8],
  topology: 8
});
map.randomize(probability); // 0..1
map.create(callback);      // callback(x, y, value)
```

**Input/output**: Input: grid dimensions + rules + random fill. Output: 0/1 map (via callback or internal map).

**Maturity evidence**: ROT.js 2.2.1, a long-running JS roguelike toolkit; its README links the RogueBasin page listing rot.js-based games; BSD-3-Clause.

**Integration**: Browser ESM/UMD, no build; BSD-3. Seed ROT's RNG (`ROT.RNG.setSeed`) for determinism.

**Risks**: Cave aesthetic, not a street; needs a seed and post-processing for connectivity; cellular rules ignore the photograph; the library's RNG is separate from mulberry32.

**Snippet**: verbatim 11 lines in [`data/modules.json`](../data/modules.json) under id `rotjs-cellular`; source URL: <https://raw.githubusercontent.com/ondras/rot.js/v2.2.1/src/map/cellular.ts>.

---

## Verification

The following commands were used; all are re-runnable.

```bash
node -e "const d=JSON.parse(require('fs').readFileSync('data/modules.json','utf8')); console.log(d.length)"
# 34
```

Checks performed on 2026-10-17:

- 34/34 entries parse as a JSON array; every entry has the 15 schema fields plus `layer` and `verification`.
- 34/34 snippets are 3-15 lines and are exact substrings of the cached source at the pinned tag/commit.
- 34/34 verification URLs returned HTTP 200.
- Licences were read from the repo's own `LICENSE`, `COPYRIGHT`, `package.json` or model-card metadata; where no licence exists (`lospec-endesga32`) the entry says so rather than inventing one.
- `image2pixel-web` is source-verified but not reusable: its custom licence forbids the use this project would need. The entry records that constraint rather than hiding it.

**Not done:** no repository was cloned into DVOR-8, no code was vendored, and nothing was published. The database is evidence, not a dependency.

---

## What this database does not claim

- Stars are not maturity: the entries cite papers, release tags, standards, dependent packages or the model/benchmark, not popularity.
- A snippet is not a port: every Python/native entry names what has to be translated to browser ESM, and the licence that translation inherits.
- A model is not a licence: SegFormer code is Apache-2.0, its NVIDIA weights are non-commercial; the facade fine-tune claims MIT but starts from those weights. Both caveats are in the entries.
- The database does not decide the product's licence. It makes the consequence of each choice explicit.

