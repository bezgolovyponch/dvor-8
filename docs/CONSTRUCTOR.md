# THE CONSTRUCTOR — every segment of the photograph → 8-bit pixel-art pipeline, grounded in code that exists

**Status of this document:** read-only research, persisted. Recorded **2026-10-17** (UTC). Nothing in this file
proposes a tuned constant.

**THE RULE THIS DOCUMENT OBEYS, and it is the whole point of it.** A value or an algorithm may come only from:

  (a) **a published implementation's own default** — read from that implementation's source or its declared
      metadata, quoted below with URL, file, line and commit/tag;
  (b) **a measurement of the accepted reference frame** (`reference/v10a-art-canvas.png`, with the command that
      produced the number);
  (c) **a measurement of the photograph** — the photograph's own numbers, at run time.

Any number in the pipeline that is none of the three is a defect, not a preference. Where a segment's source
genuinely does not decide a point, the point is named under OPEN QUESTION rather than filled with a value.

**Rules kept during the research:** read-only on this repository (all work in `/tmp`); every snippet below was
fetched from the URL shown during the 2026-10-17 session and is quoted verbatim; where a value is needed it is
either the implementation's own default, a measurement (`python3` + `PIL` + `numpy`, command given), or an
explicit "the source does not decide this".

**Ledger first — the ten segments, what owns them, what proves them:**

| # | Segment | Status | Module that must call it | The instrument |
|---|---|---|---|---|
| 1 | Scene parse | **FOUND** | `src/scene-parse.js` | `tools/detgate-parse.mjs` + class count 11 / sky 27.4% |
| 2 | Horizon | **FOUND** | `src/scene-parse.js:109-116` | per-column equality with `edgesToMask()` |
| 3 | Facade pitch | **PARTIAL** (no facade repo fits pitch; published primitive found) | `src/vector.js:1503-1520` | autocorrelogram top-3 lags |
| 4 | Reduction | **FOUND** | `src/pieces/downscale.js` | a 24-dark/1-bright patch → must pick dark |
| 5 | Palette / quantisation | **FOUND** | `src/flat.js:565-575` + `src/palette.js` | `entropy ≤ log2(palette size)` |
| 6 | Objects | **FOUND** (detector) / **PARTIAL** (mask→sprite) | `src/detect.js`, `src/objects.js` | `connectedComponentsWithStats` label count |
| 7 | Style / register | **FOUND** | `src/flat.js:96-110` | 8 ramps × 6 tones recovered from the frame |
| 8 | Outlines | **FOUND** | `src/vector.js:1255-1272` | perimeter integer, both implementations |
| 9 | Damage cascade | **FOUND** | `src/world.js:211-228` | 6 cells above a lost base → 5 fall |
| 10 | Gates | **FOUND** | `gates/`, plus SSIM + entropy | the three numbers below |

---

## 1. SCENE PARSE (photo → class masks)

- **STATUS: FOUND.** Read the actual pipeline source, not the docs.
- **SOURCE:** `huggingface/transformers.js`, tag **3.0.2**, commit `bd839b9849af`.
  - `src/pipelines.js` — `ImageSegmentationPipeline` (lines 2092-2205), `post_process_semantic_segmentation` wiring (1088-1097).
  - `src/processors.js` — `ImageFeatureExtractor` defaults (605-625), `thumbnail` (657-676), `preprocess` (939-1030), `post_process_semantic_segmentation` (161-213).
  - Model card metadata vendored at `vendor/seg/config.json` (`_name_or_path: nvidia/segformer-b0-finetuned-cityscapes-1024-1024`, `id2label` 0-18) and `vendor/seg/preprocessor_config.json` (`image_mean [0.485,0.456,0.406]`, `image_std [0.229,0.224,0.225]`, `resample: 2`, `size 512×512`).
- **SNIPPET — the postprocess, verbatim (`src/processors.js:176-199`):**

```js
        // 1. If target_size is not null, we need to resize the masks to the target size
        if (target_size !== null) {
            // resize the masks to the target size
            data = interpolate(data, target_size, 'bilinear', false);
        }
        const [height, width] = target_size ?? data.dims.slice(-2);
        const segmentation = new Tensor('int32', new Int32Array(height * width), [height, width]);
        // Buffer to store current largest value
        const buffer = data[0].data;
        const segmentation_data = segmentation.data;
        for (let j = 1; j < data.dims[0]; ++j) {
            const row = data[j].data;
            for (let k = 0; k < row.length; ++k) {
                if (row[k] > buffer[k]) {
                    buffer[k] = row[k];
                    segmentation_data[k] = j;
                }
            }
        }
```

- **SNIPPET — the normalisation, verbatim (`src/processors.js:1001-1020`):**

```js
        if (do_normalize ?? this.do_normalize) {
            let image_mean = this.image_mean;
            if (!Array.isArray(this.image_mean)) { image_mean = new Array(image.channels).fill(image_mean); }
            let image_std = this.image_std;
            if (!Array.isArray(this.image_std)) { image_std = new Array(image.channels).fill(image_mean); }
            if (image_mean.length !== image.channels || image_std.length !== image.channels) { throw new Error(...); }
            for (let i = 0; i < pixelData.length; i += image.channels) {
                for (let j = 0; j < image.channels; ++j) {
                    pixelData[i + j] = (pixelData[i + j] - image_mean[j]) / image_std[j];
                }
            }
        }
```

- **WHAT IT DOES MECHANICALLY.** The feature extractor is constructed from the model's own `preprocessor_config.json`, so `image_mean`, `image_std`, `rescale_factor` (1/255), `do_resize` and `resample` are *the model's* numbers, never the caller's: `this.image_mean = this.config.image_mean ?? this.config.mean` (619), `this.resample = this.config.resample ?? 2; // 2 => bilinear` (622), `this.rescale_factor = this.config.rescale_factor ?? (1 / 255);` (624). `preprocess` resizes to `size` (512×512) with one bilinear pass, converts to hwc float, multiplies by 1/255, subtracts mean and divides by std **per channel**, and hands the model `pixel_values`. The model emits **logits at 128×128** for a 512 input (SegFormer-B0's 1/4 decoder); `post_process_semantic_segmentation` **bilinearly upsamples the logits to the caller's target size first**, then argmaxes across the 19 channels to produce a single `int32` class index per pixel. Only then does `ImageSegmentationPipeline._call` split that index map into one binary mask per **label that is actually present** (`hasLabel` → `labels`), each a `RawImage(maskData, w, h, 1)` — i.e. **one channel, 0 or 255**, with `score: null` because a semantic segmentation has no per-mask score (`src/pipelines.js:2180-2196`). The label string is `this.model.config.id2label[label]` — the model's own table.

- **OUR COUNTERPART — `src/scene-parse.js`, line by line.**
  - `21-57` loads `pipeline('image-segmentation','seg',{quantized:true})` — correct API, correct module-resolution workarounds.
  - `60-67 toInput()` resizes the photograph to 512 on the long side with `drawImage`, then `80` passes a PNG data URL. **This is a second resample that upstream does not do:** the processor will *also* resize to 512×512 (`resize`, not `thumbnail`, because `size` has both height and width). Two bilinear passes where upstream has one — strictly more blur on the mask edges, and it costs a PNG round-trip. The fix is to hand the pipeline the canvas (or `RawImage`) and let `preprocess` do the only resize.
  - `84-106` reads `part.mask` as a `RawImage` and checks `data[p] > 0` — correct (channels are 1, and the mask is 0/255), and the `channels || 4` fallback is dead but harmless. It loses the class identity, which is fine because the key is the label.
  - `86` `String(part.label || '').toLowerCase()` — no mapping through `id2label` of our own: correct, upstream already did it. Note the class `'traffic light'` contains a space, so `masks['traffic light']` — anything that looks up `masks.traffic_light` silently gets `undefined`.
  - `107-116` the horizon: **ours, not upstream's** (see §2).
  - Nothing in `scene-parse.js` uses `part.score` — correct for `subtask: 'semantic'`; if the model ever resolves to `panoptic`/`instance`, `score` is non-null and the mask semantics change. A guard on `score === null` would pin the subtask.

- **GATE THAT PROVES IT.** `node --experimental-websocket tools/detgate-parse.mjs` already exists and prints `<w>|<h>|<classes>|<maskDiff>|<horizonDiff>|<skyHashA>|<skyHashB>|<rows>`. What only the real implementation can produce: **`classes === 11`** out of the model's 19, with `sky` present, and the sky share **27.4%** (recorded in `docs/METHODS.md:117-120`). A colour heuristic cannot emit `traffic light`, `rider`, `motorcycle` simultaneously. Add one line to make it unfakeable: rebuild the label map from our 11 masks (`argmax` of the mask stack against `id2label` order) and compare to `post_process_semantic_segmentation`'s own `segmentation.data` — expected **0 differing pixels**; any non-zero means we are not using the model's argmax.

- **OPEN QUESTION.** `resample: 2` is bilinear in transformers.js; the Python SegFormer feature extractor's own default is `PILImageResampling.BILINEAR` too, so they agree. Whether the Cityscapes-finetuned checkpoint wants `do_reduce_labels: false` is settled by the file (it is `false`), so nothing is open here.

---

## 2. HORIZON (sky/ground split)

- **STATUS: FOUND.** A real, runnable implementation of *exactly* the mechanic our Stage 2 claims (per-column sky boundary + imputation of occluded columns).
- **SOURCE:** `Bakkopi/sky-region-detector`, branch `main`, commit `43b952646d67`, file `SkyRegionDetector.py`, function `edgesToMask` (lines 54-98). It is built around the **SkyFinder** dataset (the `Skyfinder Dataset/` directories are in the repo), i.e. it is the sky-region-detection branch of that published dataset's tooling. **Licence: none declared** — copy the method, not the file.
- **SNIPPET, verbatim (`SkyRegionDetector.py:57-98`):**

```python
    # ------ Get skyline border points (column-by-column) ------
    skylinePoints = []
    for i in range(w):
        raw = edgeMask[:, i]
        try:
            # Row index of first edge from the top
            firstEdgeIndex = np.where(raw == 0)[0][0]
            # Store valid border point, exclude watermark regions
            if firstEdgeIndex > 20 and firstEdgeIndex < h-20:
                skylinePoints.append(firstEdgeIndex)
            else:
                skylinePoints.append(-1)  # No valid border point
        except:
            skylinePoints.append(-1)  # No border point in column
            continue
    skylinePoints = np.array(skylinePoints)
    validCols = np.where(skylinePoints >= 0)[0]
    if (len(validCols) > 0):
        startCol = validCols[0]
        endCol = validCols[-1]
        # Impute with row index of adjacent points
        for i in range(startCol, endCol+1):
            if skylinePoints[i] == -1:
                skylinePoints[i] = skylinePoints[i-1]
        skylinePoints[:startCol]=skylinePoints[startCol]
        skylinePoints[endCol:]=skylinePoints[endCol]
    finalMask = np.ones((h, w), dtype=np.uint8)
    for i in range(w):
        finalMask[skylinePoints[i]:, i] = 0
```

- **WHAT IT DOES MECHANICALLY.** A sky mask is turned into an edge map (`edgeInv = (edges < 5)`), and then, **column by column, the first row from the top that is not sky is the horizon**. A column with no transition gets `-1` and is then **imputed from its left neighbour** (`skylinePoints[i] = skylinePoints[i-1]`); the head and tail are padded with the first and last valid columns. The final mask is `1` above that row and `0` from it down. So the horizon is a *per-column array*, not a line, and occlusion is handled by neighbour propagation — which is the whole content of Stage 2's "interpolated along the boundary".
- **OUR COUNTERPART — `src/scene-parse.js:109-116`:**

```js
  const sky = masks.sky || new Uint8Array(w * h);
  const horizon = new Int32Array(w).fill(-1);
  for (let x = 0; x < w; x += 1) {
    for (let y = h - 1; y >= 0; y -= 1) if (sky[y * w + x]) { horizon[x] = y; break; }
  }
  let last = -1;
  for (let x = 0; x < w; x += 1) { if (horizon[x] >= 0) { last = horizon[x]; } else if (last >= 0) horizon[x] = last; }
  for (let x = w - 1; x >= 0; x -= 1) { if (horizon[x] < 0 && x + 1 < w) horizon[x] = horizon[x + 1]; }
```

  Same rule (lowest sky row = one above the first ground row), same left-to-right imputation, plus a right-to-left pass the source pads instead. Two real differences: (a) ours takes the **lowest** sky pixel, so an isolated sky-coloured hole **inside** a building (a torn wall showing sky) drags the horizon down in that column — the source takes the **first** transition, which is the building's roof; (b) ours has no "no sky at all" guard (the source: `noSky = True if (np.mean(skylinePoints) < h*0.1)`), so a photograph with no sky yields `horizon = -1` everywhere and every later consumer that does `y < horizon[x]` silently gets `0 > -1` logic. Both are fixed by taking the first non-sky row from the top and clamping columns with no sky to `h`.
- **GATE THAT PROVES IT.** Feed our `masks.sky` through both: `edgeInv = sky ? 0 : 1`, run the source's `edgesToMask`, and diff `skylinePoints` against `horizon + 1`. Expected: **0 columns differ** on a frame whose sky is a single top-connected region; the *number of differing columns* is exactly the number of columns containing an interior sky hole — which is a measurement, not a tolerance. Print both arrays' FNV hash; they must be equal.

- **OPEN QUESTION.** The source's `> 20` / `< h-20` guards exist to exclude a watermark; our frames have no watermark, so they are not derivable for us and should not be copied.

---

## 3. FACADE GEOMETRY (window/bay pitch, grid origin)

- **STATUS: PARTIAL.** I found no open-source *facade* implementation that fits a bay pitch — and I looked in five places: `api.github.com/search/repositories` for `facade window detection` (top hit `lck1201/win_det_heatmaps`, 57★ — a heatmap CNN, boxes only, no grid), `facade tiling`, `facade grid detection`, `window grid detection`, `facade parsing` (top hits `liuhantang/DeepFacade`, `wbw520/RTFP` — segmentation/line models, no pitch), plus Sourcegraph code search (`context:global facade autocorr lang:python` → **matchCount 0**) and by reading `gnishida/FacadeRectification` (Qt/C++ rectification UI) and `DmitriyKras/facade-segmentation` (U-Net + counting). None of them estimates a bay pitch. What *is* published and runnable is the primitive the residue fit is imitating: **the fundamental period of a 1-D projection profile, from its autocorrelation** — `numpy.correlate` + `scipy.signal.find_peaks`.
- **SOURCE:** `numpy.correlate` (numpy 2.0.2 installed; docstring read from the installed build) and `scipy/scipy` `scipy/signal/_peak_finding.py`, `find_peaks` at line 729, HEAD `0feac33c7624` when fetched.
- **SNIPPET — the primitive, verified against the installed numpy (`np.correlate.__doc__`) and scipy source:**

```python
def find_peaks(x, height=None, threshold=None, distance=None,
               prominence=None, width=None, wlen=None, rel_height=0.5,
               plateau_size=None):
    """
    Find peaks inside a signal based on peak properties.
    This function takes a 1-D array and finds all local maxima by
    simple comparison of neighboring values. Optionally, a subset of these
    peaks can be selected by specifying conditions for a peak's properties.
```

  and the mechanical call the profile needs (autocorrelation, `mode='full'` **must be passed**: numpy's default is `'valid'`, which silently shortens the lag axis):

```python
prof = np.abs(np.diff(gray, axis=0)).sum(axis=0).astype(float)   # vertical-gradient column profile
prof -= prof.mean()
ac = np.correlate(prof, prof, mode='full')[len(prof)-1:]          # ac[lag]
peaks, _ = scipy.signal.find_peaks(ac)                            # all defaults: no height/distance
pitch = peaks[0]                                                  # the fundamental, by construction
```

- **WHAT IT DOES MECHANICALLY.** A column profile of vertical-gradient energy peaks wherever the facade has a vertical window jamb; its autocorrelation is maximal at lag 0 and has its **first non-zero local maximum at the fundamental period** — every multiple of the bay is a later, usually larger, peak (a harmonic). That is precisely the "multiples treated as one bay" rule in the protocol: the **first** peak *is* the bay, and the 2× peak is its harmonic, so no residue-fitting or candidate scoring is needed. `find_peaks` with all defaults returns *all* local maxima; taking `peaks[0]` is the published default behaviour, not a tuned selection.
- **OUR COUNTERPART — `src/vector.js:1503-1520` (`pitchOf`).** Ours brute-forces `cand` from `MIN_PITCH` to `median(gaps)`, scores each by `1/k` residue with a tolerance of `max(1, cand*0.25)`, requires `hits >= 2`, and falls back to `Math.round(base)`. Every one of `0.25`, `hits >= 2`, `MIN_PITCH = 5` is invented; the comment at 1494-1502 documents going from 7 to 14 on one wall, i.e. the estimator is unstable exactly where the autocorrelation is stable. `MIN_PITCH = 5` is *not* invented, though, and is legitimately derivable: at 5×5→1 px a bay narrower than one game pixel cannot exist, so 5 is the grid's own resolution limit, not a preference. The fix is to replace the candidate loop with the two lines above, run on the wall's own column profile, and keep `5` only as the floor `max(5, peaks[0])`.
- **GATE THAT PROVES IT.** Print the autocorrelogram's **top three lags** for one facade. A correct implementation prints the fundamental as the first peak and its harmonic next (e.g. `lags 7, 14, 21` for a 7-px bay), and `pitchOf()`'s own answer must equal `peaks[0]`. If the top-3 lags are not integer multiples of one another, the profile is not a facade and the pass must refuse to draw a grid — which is the behaviour the protocol wants and no threshold can supply.
- **OPEN QUESTION.** Whether the bay pitch should be taken per-wall from that wall's own profile or once per photograph: the source literature takes it per facade plane, and the protocol says per facade ("the pitch is the fundamental bay fitted to their centre gaps"), so per-wall. Nothing in the code decides the *origin*; the honest origin is the first detected opening's centre, not `0`.

---

## 4. REDUCTION (photo → art grid)

- **STATUS: FOUND — and our implementation is falsifiably wrong, not merely tuned.**
- **SOURCE:** PixelOE 1.0.0, the exact artifact the repo cites: `pypi.org/project/pixeloe/1.0.0/` → sdist `pixeloe-1.0.0.tar.gz` (sha256 path `…/8c/1e/ff5997699c2ee8085dc337b2ee48865a4da9840af7d332246e7941a30327/…`), Apache-2.0 per `pyproject.toml`. File: `src/pixeloe/legacy/downscale/contrast_based.py`. The sentence our `docs/METHODS.md` quotes is in that same sdist at `PKG-INFO:295` / `README.md:255-256`.
- **SNIPPET, verbatim (`contrast_based.py:10-24`):**

```python
def find_pixel(chunks):
    mid = chunks[..., chunks.shape[-1] // 2][..., None]
    med = torch.median(chunks, dim=1, keepdims=True).values
    mu = torch.mean(chunks, dim=1, keepdims=True)
    maxi = torch.max(chunks, dim=1, keepdims=True).values
    mini = torch.min(chunks, dim=1, keepdims=True).values

    output = mid
    mini_loc = (med < mu) & (maxi - med > med - mini)
    maxi_loc = (med > mu) & (maxi - med < med - mini)

    output[mini_loc] = mini[mini_loc]
    output[maxi_loc] = maxi[maxi_loc]

    return output
```

  and the caller, which fixes the channels and the patch rule (`contrast_based.py:27-56`):

```python
def contrast_based_downscale(img, target_size=128):
    h, w, _ = img.shape
    ratio = w / h
    target_size = (target_size**2 / ratio) ** 0.5
    target_hw = (int(target_size * ratio), int(target_size))
    patch_size = max(int(round(h // target_hw[1])), int(round(w // target_hw[0])))
    img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    img_lab[:, :, 0] = apply_chunk_torch(img_lab[:, :, 0], patch_size, patch_size, find_pixel)
    img_lab[:, :, 1] = apply_chunk_torch(img_lab[:, :, 1], patch_size, patch_size,
        lambda x: torch.median(x, dim=1, keepdims=True).values)
    img_lab[:, :, 2] = apply_chunk_torch(img_lab[:, :, 2], patch_size, patch_size,
        lambda x: torch.median(x, dim=1, keepdims=True).values)
    img = cv2.cvtColor(img_lab.clip(0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
    img_sm = cv2.resize(img, target_hw, interpolation=cv2.INTER_NEAREST)
    return img_sm
```

  A JavaScript port of the same rule, same structure, ready to copy into a browser build — `Jannchie/PixelOE.js` `src/core/downscale.ts` (`contrastDownscale`, commit `a32908466f5d`):

```ts
      const centerL = lScratch[n >> 1]
      const meanL = sum / n
      const medianA = medianOfScratch(aScratch, n)
      const medianB = medianOfScratch(bScratch, n)
      const medianL = medianOfScratch(lScratch, n) // sorts lScratch — read centerL first

      let selectedL = centerL
      if (medianL < meanL && (maxL - medianL) > (medianL - minL)) { selectedL = minL }
      else if (medianL > meanL && (maxL - medianL) < (medianL - minL)) { selectedL = maxL }
```

- **WHAT IT DOES MECHANICALLY.** Work in **CIELAB**: the decision is made on **L only**, the selected pixel's **a and b are replaced by the patch's medians** (so the colour is the patch's typical chroma, not the selected pixel's). For L: `mid` = the centre pixel; if the patch's **median is below its mean AND the upper tail is longer than the lower tail**, take the **minimum**; if the median is above the mean and the upper tail is shorter, take the **maximum**; otherwise keep the centre. There is **no threshold anywhere** — the asymmetry of the distribution alone decides, which is exactly the README's "if a patch has skewed distribution on low value, the minimum value will be selected to keep the dark detail and vice versa. Otherwise, keep the center value."
- **OUR COUNTERPART — `src/pieces/downscale.js:29-65`,** specifically lines 47-55:

```js
      const span = hi - lo;
      // the skew decides which extreme to keep; a flat block keeps the pixel nearest its own mean
      const wantDark = span > 24 && mean - lo > (hi - mean) * 1.35;
      const wantBright = span > 24 && hi - mean > (mean - lo) * 1.35;
```

  Three faults, each demonstrable:
  1. `span > 24` and `* 1.35` are invented; the published rule has neither.
  2. They **invert** the rule on the case the file exists to fix. Patch of 25 pixels: 24 at L=10, one at L=200. `mean=17.6`, `med=10`, `min=10`, `max=200`. PixelOE: `med<mu` ✔ and `(200-10)=190 > (10-10)=0` ✔ → **min = 10** (the dark mass survives). Ours: `wantDark` needs `mean-lo=7.6 > 182.4×1.35=246.2` ✘; `wantBright` sees `182.4 > 7.6×1.35=10.3` ✔ → **L=200**, i.e. a block of 24 dark pixels becomes the one bright pixel. That is a 1-px dark line on a bright wall turned into a bright speck — the exact defect the header claims to have fixed.
  3. Ours copies the selected pixel's whole **RGB**; PixelOE keeps the medians of a/b. For a block straddling a window frame, ours takes the frame's blue, PixelOE takes the bay's typical chroma.
  `expandContrast` (71-94) has its own invented `threshold = 40`; PixelOE's stage-1 equivalent is `outline_expansion` in `src/pixeloe/legacy/outline.py` with `erode=2, dilate=2, k=16, avg_scale=10, dist_scale=3` — all of which are the function's own defaults (`pixelize` calls it as `outline_expansion(img, thickness, thickness, patch_size, 9, 4)`, i.e. the *caller* overrides avg/dist but not erode/dilate).
- **GATE THAT PROVES IT.** A 25-pixel unit test: `contrastDownscale([24×L=10, 1×L=200])` must select the pixel whose L is 10, and the output pixel's a/b must equal the patch medians, not the selected pixel's chroma. Print `selectedL` and `chroma_source`. Expected `10` and `patch_median`. A second, end-to-end number: on the accepted frame the pass must report the *counts* `{dark, bright, mean}` and the count of `dark` must be ≥ the count our current code reports (ours under-picks dark on every block whose bright tail is longer, which is most sky-adjacent facades) — the direction of the inequality is derived, not tuned.

- **OPEN QUESTION.** `target_size=128` is PixelOE's default for a 512-ish source; our frame is 288×512 and the protocol fixes 5×5→1 px, so the *patch size* is set by the grid (5), and `target_size` must be computed from the frame, not taken from the default. PixelOE's own parameterisation supports this (`patch_size` is computed from `h // target_hw[1]`, so giving it the frame and the patch size is the intended use).

---

## 5. PALETTE / QUANTISATION

- **STATUS: FOUND.** Three real implementations read; the one that produces a **palette-exact** canvas is `libimagequant`'s remap, and the one that is *legal to link* is Pillow's median cut.
- **SOURCE / SNIPPET A — libimagequant** (`ImageOptim/libimagequant`, tag **4.4.1**, commit `9388d26902c5`; **GPL-3.0-or-later**, see `COPYRIGHT` — so: build-time/CLI only, never linked into the game). Header `imagequant-sys/libimagequant.h`, `#define LIQ_VERSION 40003`:

```c
LIQ_EXPORT liq_error liq_set_max_colors(liq_attr* attr, int colors) LIQ_NONNULL;
LIQ_EXPORT liq_error liq_set_speed(liq_attr* attr, int speed) LIQ_NONNULL;
LIQ_EXPORT liq_error liq_set_quality(liq_attr* attr, int minimum, int maximum) LIQ_NONNULL;
LIQ_EXPORT LIQ_USERESULT liq_image *liq_image_create_rgba(const liq_attr *attr, const void *bitmap, int width, int height, double gamma) LIQ_NONNULL;
LIQ_EXPORT liq_error liq_set_dithering_level(liq_result *res, float dither_level) LIQ_NONNULL;
LIQ_EXPORT liq_error liq_write_remapped_image(liq_result *result, liq_image *input_image, void *buffer, size_t buffer_size) LIQ_NONNULL;
LIQ_EXPORT LIQ_USERESULT const liq_palette *liq_get_palette(liq_result *result) LIQ_NONNULL;
```

  and the exact sequence from its own `example.c:48-64`:

```c
    liq_attr *handle = liq_attr_create();
    liq_image *input_image = liq_image_create_rgba(handle, raw_rgba_pixels, width, height, 0);
    liq_result *quantization_result;
    if (liq_image_quantize(input_image, handle, &quantization_result) != LIQ_OK) { ... }
    size_t pixels_size = width * height;
    unsigned char *raw_8bit_pixels = malloc(pixels_size);
    liq_set_dithering_level(quantization_result, 1.0);
    liq_write_remapped_image(quantization_result, input_image, raw_8bit_pixels, pixels_size);
    const liq_palette *palette = liq_get_palette(quantization_result);
```

  **Defaults, read from `src/attr.rs`:** `max_colors: MAX_COLORS as PalLen` where `pub(crate) const MAX_COLORS: usize = if PalIndex::MAX == 255 { 256 } else { 2048 };` → **256**; `Attributes::new()` sets `speed: 0` and then calls **`let _ = attr.set_speed(4);`** → effective default **speed 4**; `target_mse: 0.` / `max_mse: None` → **no loss limit**; `dither_level: 1.` (`src/quant.rs:68`). No RNG anywhere in `src/kmeans.rs` (grep for `rand|seed|shuffle`: none) → **the palette is deterministic for a given version**.

- **SOURCE / SNIPPET B — Pillow 11.3.0** (installed at `/Users/m/Library/Python/3.9/lib/python/site-packages/PIL/Image.py`, MIT-CMU):

```python
    def quantize(self, colors: int = 256, method: int | None = None, kmeans: int = 0,
                 palette: Image | None = None, dither: Dither = Dither.FLOYDSTEINBERG) -> Image:
        ...
        if method is None:
            # defaults:
            method = Quantize.MEDIANCUT
            if self.mode == "RGBA":
                method = Quantize.FASTOCTREE
```

  with `class Quantize(IntEnum): MEDIANCUT = 0; MAXCOVERAGE = 1; FASTOCTREE = 2; LIBIMAGEQUANT = 3` (Image.py:190-194). The C side is `src/libImaging/Quant.c` at tag 11.3.0 (`ImagingQuantize(im, colors, mode, kmeans)`, 1665) which calls `k_means(...)` only `if (kmeans > 0)` (1484-1485) — so **`kmeans=0` means pure median cut**, and `pixeloe`'s `maxcover()` calls `img_pil.quantize(colors, 1, kmeans=colors)` i.e. max-coverage *plus* a refinement pass.

- **SNIPPET C — k-means, if it is ever used** (`scikit-learn`, `sklearn/cluster/_kmeans.py:1186-1230`, HEAD `85593ca7a07a`): `KMeans(n_clusters=8, init='k-means++', n_init='auto', …)`, and `n_init='auto'` means 1 run for k-means++ and 3 for random — i.e. **`random_state` unset → two runs of the game need not agree.** That alone disqualifies k-means as the palette source for a gate.

- **WHAT IT DOES MECHANICALLY.** All three answer "N colours for M pixels", but they differ in what they hand back. `libimagequant` hands back **two things**: a `liq_palette` *and*, from `liq_write_remapped_image`, **one 8-bit index per pixel into that palette** — the canvas is palette-exact *by construction*, not by inspection. Pillow hands back a `P`-mode image (indices) whose palette you can convert to RGB; with `kmeans=0` it is a pure median cut with `colors` boxes. k-means hands back three float centroids per pixel, i.e. colours that are *not* in any table and, without a seed, not even the same ones twice.
- **WHICH ONE PRODUCES A PALETTE-EXACT 288×512 CANVAS FROM THE CREATOR'S ENGINE FRAME.** Measured on the files in `reference/` (`python3` + PIL + numpy, this session):

  | file | mode / size | distinct RGB | Shannon entropy (bpp) |
  |---|---|---|---|
  | `reference/v10a-art-canvas.png` | RGB 288×512 | **48** | **5.349** |
  | `reference/v10a-art.png` | RGB 288×512 | 56,573 | 12.859 |
  | `reference/v10a-target-hi.webp` | RGB 350×652 | 35,630 | 11.267 |

  So the creator's engine frame is `v10a-art-canvas.png`, and even it is not strictly indexed: its 48 values are mostly **1-LSB variants of ~35 real colours** (`#4d9ce8`, `#4d9ce6`, `#4d9ce9`, `#4c9ce8`, `#4d9be8`, `#4e9ce8`, `#4c9ee8` all appear). The conclusion is forced: **no on-disk file is a palette-exact canvas**, so palette-exactness must be established on *our* side — an index buffer plus a table, which is exactly what `src/flat.js` already does (`TABLE`/`PALETTE`, 565-575) — and the reference may only be used after snapping to its own dominant colours. Of the three quantisers, only `libimagequant` produces the index buffer directly; **Pillow's `quantize(..., method=MEDIANCUT)` is the one that can be used inside the process (MIT-CMU), and `pngquant`/`liq` only as an external gate command.**
- **OUR COUNTERPART.** The live route is **not** `palette.js`: `vector.js:245` calls `paletteOf()`, which is `flat.js:575` returning the fixed 50-entry table (8 ramps × 6 tones + outline + void). `src/palette.js:83-106` (`buildPalette`, median cut with an invented `Math.sqrt(box.length)` weighting at line 93 and an invented `while (table.length < count) table.push(...)` backfill at 103) is **dead code on the photo path** — worth deleting or moving behind an explicit flag, because it is the file a reader will assume is in use. `nearest()` (108-115) is the correct primitive and is already the only place a colour becomes an index.
- **GATE THAT PROVES IT.** A hard, derivable bound: **the Shannon entropy of a canvas with N colours cannot exceed log₂N.** For a 50-entry table that is **5.6439 bpp**. So:
  - `python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open(f).convert('RGB')).reshape(-1,3); c,n=np.unique(a,axis=0,return_counts=True); p=n/n.sum(); print(len(c), -(p*np.log2(p)).sum())"` on our rendered frame must print **`≤ 50`** distinct colours and **≤ 5.644**. The reference canvas prints 48 / 5.349 — consistent; `v10a-art.png` prints 56,573 / 12.859 — which is how you know that file cannot be the oracle.
  - Everything that indexes must be `< palette.length`; the existing `nearest(table, …, upto = COLOURS)` default (`palette.js:108`) is the one place a wrong bound bit before (see the `scorchMap` post-mortem at 117-129).

- **OPEN QUESTION.** Whether the game's fixed table should be 50 (8×6+2) or 30 (the street's per-photograph block, `palette.js:31-33`): `MAX_YARDS = 9` with a one-byte index caps a street at 9 blocks, which is a constraint the source data does not decide.

---

## 6. OBJECTS (instance masks → sprites)

- **STATUS: FOUND for the detector and the "one mass" rule; PARTIAL for the mask→sprite step** (no pixel-art game repo does it; the generic computer-vision step is quoted instead).
- **SOURCE A — MediaPipe ObjectDetector**, vendored at `vendor/mediapipe/vision_bundle.js`; the API and defaults are from the official Web guide, `developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js` (fetched this session):

```
objectDetector = await ObjectDetector.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: `https://storage.googleapis.com/mediapipe-tasks/object_detector/efficientdet_lite0_uint8.tflite`
  },
  scoreThreshold: 0.5,
  runningMode: runningMode
});
```

  and the configuration table, verbatim: `maxResults` — *"Any positive numbers"* — default **`-1 (all results are returned)`**; `scoreThreshold` — *"Sets the prediction score threshold that overrides the one provided in the model metadata (if any). Results below this value are rejected."* — default **"Not set"**.

- **SOURCE B — the "one connected mass" rule** is `cv2.connectedComponentsWithStats` (OpenCV `imgproc`, `ConnectedComponents`), `int connectedComponentsWithStats(InputArray image, OutputArray labels, OutputArray stats, OutputArray centroids, int connectivity = 8, int ltype = CV_32S)`. Its per-component `stats` row is `[x, y, w, h, area]` — i.e. the connected component *is* the sprite box, and `area` is the pixel count. (Signature/defaults as published in the OpenCV `imgproc` reference; connectivity default 8.)

- **WHAT IT DOES MECHANICALLY.** `ObjectDetector.detect(image)` returns `detections[]`, each with `boundingBox {originX, originY, width, height}` in **input-image pixels** and `categories[0] = {categoryName, score}` — boxes, **no masks** (EfficientDet-Lite is a box detector; there is no mask head and `vendor/mediapipe/*.tflite` has no segmentation outputs). "Instance mask" therefore has to be *made*: the protocol's own answer is "the detector's box intersected with the segmentation masks" — take the SegFormer `car` class mask, cut it to the detected box, run `connectedComponentsWithStats(..., connectivity=8)`, keep the largest component by `area`. That component's `[x,y,w,h]` is the sprite's box and its label image is the sprite's alpha.
- **OUR COUNTERPART.** `src/detect.js:19-29` uses the API correctly but **overrides two published defaults**: `scoreThreshold: 0.2` (docs: not set → use the model metadata) and `maxResults: 25` (docs: `-1`). Then `src/objects.js:22-23` adds a *second, independent* gate, `MIN_SCORE = 0.4` and `MIN_AREA = 0.0008`, applied after the detector — so one decision ("is this a real thing") is made by three numbers, none of them the model's. `src/objects.js:65-175 toRegions` hand-rolls what `connectedComponentsWithStats` does: a ring of the box's perimeter (76-77), a 70th-percentile cut `Math.max(18*18, spread*1.3)` (97), a rounded-box fallback (108-110), a below-25%-kept retry (118-131), and finally a hand-written largest-cluster flood fill with `MIN 12` pixels (138-163). Every one of those constants is invented, and the file's own comment (line 80) records that the previous version produced "every outline in the game was a rectangle" — the failure mode of a ring test with a fixed cut.
- **GATE THAT PROVES IT.** Two numbers, both from the real code:
  - `detector.detect(canvas).detections.length` at **the model's own threshold** must be reported alongside the count at `0.2`; the gate prints both (`n_meta`, `n_0.2`). If `n_0.2 > n_meta` the extra detections are ours, not the model's, and every downstream "the detector found 13 cars" claim is a claim about our override.
  - For one car: `cv2.connectedComponentsWithStats(carMask & box, connectivity=8)` → print `labels.max()` and the kept component's `area` and `[x,y,w,h]`. Ours must equal it exactly (`area`, and `w,h` to the pixel). Any difference means a hand-rolled cut is fighting the published one, which is what "a car came back as 1960 pixels in FOURTEEN clusters" (objects.js:134-136) was.

- **OPEN QUESTION.** Whether a sprite should be a **cut-out with alpha** or **palette-snapped indices inside a rectangular cell**. The sources decide neither; our renderer needs the second (it draws indices), so the sprite must be snapped through `nearest()` — and that is a decision to state, not to discover.

---

## 7. STYLE / REGISTER (palette ramps, tone ladders)

- **STATUS: FOUND.** Real data + the real format-defining code, both from Aseprite's own repository, plus Lospec's open palette JSON.
- **SOURCE A — the ramps as data.** `aseprite/aseprite` (commit `b3e34acbae81`), `data/extensions/endesga-palettes/edg32.gpl` — a **GIMP palette with named tones**, which is what a "ramp" is in this art form:

```
GIMP Palette
#
# By ENDESGA Studios
# https://twitter.com/ENDESGA
#
190  74  47	Tetanus
216 118  68	Rust
234 212 170	Birch
228 166 114	Sap
184 111  80	Oak
116  63  57	Pine
 63  40  50	Darkbark
158  40  53	Blood
228  59  68	Fabric
247 118  34	Amber
254  174  52	Glow
254 231  97	Light
 99 199  77	Glade
 62 137  72	Flora
 38  92  66	Moss
```

  The same palette as open JSON: `https://lospec.com/palette-list/endesga-32.json` → `{"name":"Endesga 32","author":"ENDESGA","colors":["be4a2f","d77643",…,"c28569"]}` (32 entries, fetched this session). Note the two sources agree colour-for-colour (`be4a2f` = 190,74,47 = Tetanus).

- **SOURCE B — the format, defined by code.** `aseprite/aseprite` `src/doc/file/gpl_file.cpp:28-90`, `load_gpl_file`:

```cpp
  // Read first line, it must be "GIMP Palette"
  std::string line;
  if (!std::getline(f, line)) return NULL;
  base::trim_string(line, line);
  if (line != "GIMP Palette") return NULL;
  ...
    // Concatenate comments
    if (line[0] == '#') { line = line.substr(1); ... comment += line; ... continue; }
    // Remove properties (TODO add these properties in the palette)
    if (!std::isdigit(line[0])) { ... if (parts[0] == "Channels") { if (parts[1] == "RGBA") hasAlpha = true; } continue; }
    int r, g, b, a = 255;
    std::string entryName;
    std::istringstream lineIn(line);
    lineIn >> r >> g >> b;
    if (hasAlpha) { lineIn >> a; }
    lineIn >> entryName;
    if (lineIn.fail()) continue;
    pal->addEntry(rgba(r, g, b, a));
```

- **WHAT IT DOES MECHANICALLY.** A ramp is not derived — it is **declared**: an ordered series of named colours from one hue family (Tetanus → Rust → … → Darkbark) whose lightness is monotone and whose hue drifts across the series. The `.gpl` format is `R G B [A] <name>` with `#` comments and `Channels: RGBA` as an Aseprite extension, first line literally `GIMP Palette`; Aseprite's loader refuses the file if that line is absent, and it *keeps the names*. So the published definition of "a tone ladder" is: an ordered colour list with a name per step, in a text format a real editor reads.
- **OUR COUNTERPART — `src/flat.js:96-110`** declares `RAMPS` as 8 entries of `{name, hue, sat}` and `STEPS = 6`, then `tones()` generates 6 tones per ramp; `PALETTE` (565-575) concatenates 8×6 and appends `OUTLINE` and `[4,0,10]`. The *count* (8×6 = 48) is measured, not invented — the accepted frame's own 48 distinct values are consistent with it (§5) — but the **hue and saturation per ramp are currently typed numbers** (`sky hue 209 sat 0.75`, `stone 262/0.055`, …) with a comment claiming they were measured from the frame. The measurement that makes them legitimate is one command: for each of the frame's 48 colours, cluster by hue and fit a 6-tone ladder, then print the 8 `(hue, sat)` pairs. `src/style/register.js:19-54` then lifts tones by `maxTone = 1` — an invented step count; the published equivalent is "the next entry in the same ramp", i.e. `lift = index + 1` within the ramp, which the code already computes, so only the *number of steps* is open.
- **GATE THAT PROVES IT.** Recover the ladders from `reference/v10a-art-canvas.png` and compare to `RAMPS`: print, per ramp, `(hue, sat, 6 luminances)` and assert (a) exactly **8** hue clusters survive at a chroma cut the data itself supplies (the two neutral ramps sit within 6/255 of each other and must merge into `stone`/`metal` only if the data says so), and (b) each cluster's 6 luminances are **strictly increasing**. Monotonicity is the published property (it is what makes a ramp a ramp) and needs no threshold.

- **OPEN QUESTION.** Whether our `OUTLINE [11,0,24]` and void `[4,0,10]` are the frame's own two structural entries: the frame's two darkest values are `#090013` (9,0,19, 2.70%) and `#04000a` (4,0,10, 2.18%), so ours matches the second exactly and differs from the first by 2 in R and 5 in B. That is a measurement to make, not a choice.

---

## 8. OUTLINES (1-px outline as boundary)

- **STATUS: FOUND — two independent real implementations, one of them exactly the "solid pixel with a non-solid neighbour" rule.**
- **SOURCE A — the concept, OpenCV's own tutorial** (`docs.opencv.org/4.x/d9/d61/tutorial_py_morphological_ops.html`, fetched; page footer says OpenCV 4.13.0):

> "## 5. Morphological Gradient — It is the difference between dilation and erosion of an image. **The result will look like the outline of the object.**"
> `gradient = cv.morphologyEx(img, cv.MORPH_GRADIENT, kernel)`

  with the function's own signature `void morphologyEx(InputArray src, OutputArray dst, int op, InputArray kernel, Point anchor=Point(-1,-1), int iterations=1, int borderType=BORDER_CONSTANT, ...)`.

- **SOURCE B — a real sprite-outline implementation**: `ands/sproutline` (commit `a7da8950e788`), `sproutline.h`, **public domain**, "sprite outline detector". Two functions, both the rule we need:

```c
S2ODEF s2o_uc * s2o_thresholded_to_outlined(const s2o_uc *data, int w, int h)
{
	s2o_uc *result = (s2o_uc*)S2O_MALLOC(w * h);
	...
			if (data[y * w + x] &&
				(
					!data[y * w + x - 1] ||
					!data[y * w + x + 1] ||
					!data[y * w + x - w] ||
					!data[y * w + x + w]
				))
			{
				result[y * w + x] = 255;
			}
```

  and its dilation (the morphological-gradient half), `sproutline.h:211-241`:

```c
S2ODEF s2o_uc * s2o_dilate_thresholded(const s2o_uc *data, int w, int h)
{
	...
			for (dy = -1; dy <= 1; dy++)
			{
				for (dx = -1; dx <= 1; dx++)
				{
					cx = x + dx; cy = y + dy;
					if (cx >= 0 && cx < w && cy >= 0 && cy < h) { if (data[cy * w + cx]) { result[y * w + x] = 255; ... } }
```

- **WHAT IT DOES MECHANICALLY.** Two equivalent constructions of a one-pixel outline, both published: (i) **gradient** = dilate(mask) − mask (or dilate − erode), giving a ring *outside* the shape, thickness set by the kernel size — a 3×3 kernel gives exactly 1 px; (ii) **boundary** = keep every solid pixel that has at least one **4-neighbour** that is not solid — a 1-px line *on* the shape's own edge, no kernel, no thickness parameter. sproutline's own docs state the latter: *"indicate if the corresponding input value is part of an outline (= is solid and has a non-solid neighbour)"*. Neither needs a threshold: the mask is the decision.
- **OUR COUNTERPART — `src/vector.js:1255-1272`.** Ours draws the outline where a pixel **is sky** and has a non-sky neighbour:

```js
        const p2 = y * w + x;
        if (!sky[p2]) continue;
        if (sky[p2 - 1] && sky[p2 + 1] && sky[p2 - w] && sky[p2 + w]) continue;
        if (idx[p2] === OUTS) continue;
        if (cls[p2] === 2) continue;                        // vegetation keeps its own ramp (R15)
        idx[p2] = OUTS;
```

  This is **the same predicate applied to the complement**: it outlines the *sky's* boundary, i.e. the building's silhouette from the sky side, which accidentally matches the requirement ("buildings get a 1-px outline against the sky") but cannot outline a car against the road, and it writes the outline **into a sky pixel**, consuming sky area (a measurable share). `src/criteria/OutlineRule.js:18-24` states the real rule (`car|truck|bus|van|building|house|tower|block`) and is not consulted by the drawing code at all — the two are decoupled, which is why the outline drifts. The correct construction is sproutline's: `mayBeOutlined(kind)` → mask = that thing's pixels → boundary predicate on that mask → write the *shared* outline index, 1 px, never on windows.
- **GATE THAT PROVES IT.** One integer, computed both ways on the same frame: `outline_px = |{(x,y) : solid(x,y) ∧ ∃4-neighbour ¬solid}|`, printed by our pass and by a `numpy` rolling-min in the gate. They must be **equal**. Then the second integer: outline pixels **inside the sky mask** must be **0** (a building's outline belongs to the building, not to the sky) — with our current code it equals the count printed at line 1270 (`sky.__edge`), so the gate fails by exactly that number today, which is the proof it is the sky's boundary we are drawing.

- **OPEN QUESTION.** Whether the outline is drawn *on* the object (sproutline) or *outside* it (gradient): the requirement "1-px outline … against the sky" and "windows are destroyable but you dont need to outline them" are satisfied by both, but the gradient grows the object by 1 px while the boundary version does not, and the damage cascade (§9) is computed on cells, so the boundary version keeps geometry and damage consistent.

---

## 9. RENDERING / DAMAGE CASCADE (cell support, destruction)

- **STATUS: FOUND.** The exact rule, with the neighbour order that makes an entire column fall in one update.
- **SOURCE:** `minetest/minetest` (LGPL-2.1+), `builtin/game/falling.lua`, HEAD `db44f2f58f68`. `core.check_single_for_falling` at line 441; the ordered neighbour table at 486-503; `core.check_for_falling` at 505.
- **SNIPPET, verbatim (`falling.lua:441-477`):**

```lua
function core.check_single_for_falling(p)
	local n = core.get_node(p)
	if core.get_item_group(n.name, "falling_node") ~= 0 then
		local p_bottom = vector.offset(p, 0, -1, 0)
		-- Only spawn falling node if node below is loaded
		local n_bottom = core.get_node_or_nil(p_bottom)
		local d_bottom = n_bottom and core.registered_nodes[n_bottom.name]
		if d_bottom then
			local same = n.name == n_bottom.name
			...
			-- Otherwise only if the bottom node is considered "fall through"
			if not same and
					(not d_bottom.walkable or d_bottom.buildable_to)
					and ... then
				local success, _ = convert_to_falling_node(p, n)
				return success
			end
		end
	end
```

  and the traversal that carries the cascade (`falling.lua:486-503` + `505-520`):

```lua
-- This table is specifically ordered.
-- We don't walk diagonals, only our direct neighbors, and self.
-- Down first as likely case, but always before self. The same with sides.
-- Up must come last, so that things above self will also fall all at once.
local check_for_falling_neighbors = {
	vector.new(-1, -1,  0), vector.new( 1, -1,  0), vector.new( 0, -1, -1),
	vector.new( 0, -1,  1), vector.new( 0, -1,  0), vector.new(-1,  0,  0),
	vector.new( 1,  0,  0), vector.new( 0,  0,  1), vector.new( 0,  0, -1),
	vector.new( 0,  0,  0), vector.new( 0,  1,  0),
}
function core.check_for_falling(p)
	local s = {}
	local n = 0
	local v = 1
	while true do
		n = n + 1
		s[n] = {p = p, v = v}
		p = vector.add(p, check_for_falling_neighbors[v])
		if not core.check_single_for_falling(p) then
```

- **WHAT IT DOES MECHANICALLY.** The support predicate is **"the node directly below is not walkable / is buildable-to"** — one neighbour, no heuristics. When it holds, the node is *converted* into a falling entity (removed from the grid) and the walk **continues**, visiting down-first and **up last** precisely so that a node made unsupported by the one below it is reached *in the same call*: "Up must come last, so that things above self will also fall all at once." That single sentence is the whole damage-cascade requirement — a bottom-up sweep, and everything above a lost cell falls after it.
- **OUR COUNTERPART — `src/world.js:211-228`** (`breakCells`), which already states the same rule:

```js
  for (let cy = c.rows - 1; cy >= 0; cy -= 1) {
    for (let cx = 0; cx < c.cols; cx += 1) {
      const k = cy * c.cols + cx;
      if (c.gone.has(k)) continue;
      const below = (cy + 1) * c.cols + cx;
      if (cy === c.rows - 1) continue;                 // the ground storey rests on the ground
      if (!c.gone.has(below)) continue;
      c.gone.add(k);
      taken.push({ cx, cy, k, fell: true });
    }
  }
```

  Functionally equal for a single column, and the `cy` descending order gives the "all at once" property. Three real differences: (a) ours is a single sweep with no recursion, so it **only** propagates within a column — minetest's walk revisits each neighbour cell's own support, which is what makes an L-shaped overhang fall; (b) ours never checks the cell *beside* a lost cell, so a cell whose only support was lateral stays floating; (c) ours marks `fell: true` and then writes rubble for every taken cell (231-244) — minetest *removes* the node and lets it exist as an entity, which is the more faithful "falls" and is why a fallen storey should be re-readable as debris, not as void.
- **GATE THAT PROVES IT.** A synthetic grid, both implementations, one printed number each:
  - column of 6, destroy the bottom cell → **6 taken** (the hit + 5 above) in both. Ours prints `taken.length`; the cascade is correct iff it is 6, not 5 and not 1.
  - an L-overhang (a 3×1 row attached to a column, its column removed) → minetest's walk takes the whole row; ours takes only the column's cells and leaves the row floating. The gate prints both counts and the *name* of the cells left floating. That difference is the constructor's remaining work in this segment, and it is a real defect (`merge`, `world.js:217`).
- **OPEN QUESTION.** Whether a cell that loses *lateral* support should fall: the source's support predicate is below-only, so an overhang only falls because the walk *re-checks each neighbour*, not because it defines lateral support. That is a traversal property, not a physics rule, and it is the one to copy.

---

## 10. GATES (the measuring instruments)

- **STATUS: FOUND, all three.** Exact APIs and defaults below; two of the three are already installed in `gates/`.

### 10a. pixelmatch (installed, v6.0.0, ISC)

- **SOURCE:** `gates/node_modules/pixelmatch/index.js` (v6.0.0, ISC, Mapbox), lines 1-10 and 40-42:

```js
const defaultOptions = {
    threshold: 0.1,         // matching threshold (0 to 1); smaller is more sensitive
    includeAA: false,       // whether to skip anti-aliasing detection
    alpha: 0.1,             // opacity of original image in diff output
    aaColor: [255, 255, 0], // color of anti-aliased pixels in diff output
    diffColor: [255, 0, 0], // color of different pixels in diff output
    diffColorAlt: null,     // whether to detect dark on light differences between img1 and img2 and set an alternative color to differentiate between the two
    diffMask: false         // draw the diff over a transparent background (a mask)
};
...
// maximum acceptable square distance between two colors;
// 35215 is the maximum possible value for this metric
const maxDelta = 35215 * options.threshold * options.threshold;
```

- **Mechanically:** a pixel counts as different when its **YIQ** squared distance exceeds `35215 · threshold²`; with the default `threshold = 0.1` that is **352.15**, i.e. ~0.6% of the maximum possible. `includeAA: false` means anti-aliased pixels are drawn yellow and **not counted** — which matters enormously on palette art: a hard 1-px edge is not anti-aliased, so nothing is excused.
- **OUR COUNTERPART:** `gates/frame-diff.mjs:15-20` already prints the premise and calls `pixelmatch(A.data, B.data, diff.data, A.width, A.height, { threshold: 0.1 })`. **The defect is the reference, not the call** (`gates/external.sh:7`, `REF="${2:-reference/v10a-art.png}"`): measured, that file has **56,573 distinct colours and 12.859 bpp entropy**, so it is a resampled screenshot and no palette-exact frame can reach 0 against it. Point it at `reference/v10a-art-canvas.png` (48 colours, 5.349 bpp) and the number becomes interpretable; better, compare against the *snapped* reference.
- **Gate value:** on two runs of the same build, `DIFFERING PIXELS: 0`. Against the reference, the honest figure is not 0 (the reference is lossy) — it is the count after snapping both to the same 50-entry table, and that number is what must not regress.

### 10b. SSIM (scikit-image)

- **SOURCE:** `scikit-image` `skimage/metrics/_structural_similarity.py`, tag **v0.25.2** (HEAD `b700edc8005e`), lines 15-26 and 161-190:

```python
def structural_similarity(
    im1, im2, *, win_size=None, gradient=False, data_range=None,
    channel_axis=None, gaussian_weights=False, full=False, **kwargs,
):
...
    K1 = kwargs.pop('K1', 0.01)
    K2 = kwargs.pop('K2', 0.03)
    sigma = kwargs.pop('sigma', 1.5)
    use_sample_covariance = kwargs.pop('use_sample_covariance', True)
    if win_size is None:
        if gaussian_weights:
            r = int(truncate * sigma + 0.5)   # truncate = 3.5
            win_size = 2 * r + 1
        else:
            win_size = 7  # backwards compatibility
```

- **Mechanically:** sliding-window luminance/contrast/structure comparison; defaults are a **7×7 uniform window**, `K1=0.01`, `K2=0.03`, sample covariance; `gaussian_weights=False`. To reproduce the paper (Wang et al. 2004) the docstring itself says: *"set `gaussian_weights` to True, `sigma` to 1.5, `use_sample_covariance` to False, and specify the `data_range` argument."* For 8-bit RGB, `data_range=255` and `channel_axis=-1`.
- **OUR COUNTERPART:** **none** — no SSIM anywhere in `tools/` or `gates/` (grep: only pixelmatch). `skimage` is not installed either (`ModuleNotFoundError`), so the gate must run in a venv: `python3 -m venv /tmp/g && /tmp/g/bin/pip install scikit-image`.
- **Gate value:** `structural_similarity(ours, snapped_reference, data_range=255, channel_axis=-1)` printed to 4 dp. Because SSIM is scale-free it is the right instrument for "recognisable as the place" (structure), where pixelmatch is the right instrument for "palette-exact" (identity). Print both; never conflate them.

### 10c. flatness / entropy (published, two lines of real code)

- **SOURCE:** `scikit-image` `skimage/measure/entropy.py` (v0.25.2) — the whole implementation:

```python
from numpy import unique
from scipy.stats import entropy as scipy_entropy

def shannon_entropy(image, base=2):
    """Calculate the Shannon entropy of an image.
    The Shannon entropy is defined as S = -sum(pk * log(pk)),
    where pk are frequency/probability of pixels of value k.
    ...
    >>> shannon_entropy(data.camera())
    7.231695011055706
    """
    _, counts = unique(image, return_counts=True)
    return scipy_entropy(counts, base=base)
```

- **Mechanically:** histogram of distinct values → normalised counts → `scipy.stats.entropy`, base 2 → bits per pixel. Two published properties make it the perfect flatness instrument and both are **hard bounds, not thresholds**:
  1. **A palette of N colours cannot exceed log₂N bpp.** 50 entries → **5.6439**; 48 → 5.5850; 30 → 4.9069. So `entropy > log2(palette.length)` *proves* the frame is not palette-exact, with no freedom left.
  2. A **flat** frame's entropy collapses toward 0; a photographic frame sits near 8 (RGB) or higher when counted over triples — measured: our reference canvas **5.349**, the raw screenshot **12.859**.
- **OUR COUNTERPART:** `gates/external.sh:13-14` computes a home-made "flat" figure inline (`px[..]==px[..+1]==px[..+w]` over the reference) — an un-published measure, and it is computed **on the reference**, not on our frame. Replace it with `shannon_entropy` on both, and print `2**H` as "effective colours" beside "distinct colours".
- **Gate values from this session's measurements** (all reproducible with the one-liner in §5):

| frame | distinct | entropy | 2^H |
|---|---|---|---|
| `reference/v10a-art-canvas.png` | 48 | 5.349 | 40.7 |
| `reference/v10a-art.png` | 56,573 | 12.859 | 7,442 |
| our target (50-entry table) | ≤ 50 | **≤ 5.6439** | ≤ 50 |

  A frame that prints 51 distinct colours or 5.65 bpp is failing by construction, and nothing about it is a matter of taste.

---

## THE CONSTRUCTOR, IN ONE TABLE

| Segment | Call this | With these defaults | Instead of this in our repo |
|---|---|---|---|
| 1 Parse | `pipeline('image-segmentation','seg')` → `post_process_semantic_segmentation` (argmax after bilinear logits) | model's own `preprocessor_config.json` | the extra 512-resize in `toInput`; keep everything else |
| 2 Horizon | per-column first non-sky row + left-neighbour imputation | `-1` sentinel, pad head/tail | lowest sky row (breaks on interior holes); no no-sky guard |
| 3 Pitch | `np.correlate(prof, prof, 'full')` → `find_peaks(ac)[0]` | `find_peaks` all defaults (`distance=None`) | `pitchOf`'s candidate scoring + `0.25` tolerance + `hits>=2` |
| 4 Reduce | PixelOE `find_pixel` (L only; a/b = medians) | no thresholds at all | `span>24`, `×1.35`, full-RGB pick |
| 5 Palette | index buffer + table (`liq_write_remapped_image` shape, or Pillow MEDIANCUT in-process) | 256 max colours, dither 1.0, speed 4 | `buildPalette` (dead code), median-cut-with-sqrt-weighting |
| 6 Objects | `ObjectDetector` at its own threshold + `connectedComponentsWithStats(connectivity=8)` | `scoreThreshold` unset, `maxResults=-1` | `0.2`/`25`/`0.4`/`0.0008`/`1.3`/`18²`/`12` |
| 7 Style | `.gpl` ladders (named, monotone) | `GIMP Palette` header, `R G B name` | typed `hue`/`sat` per ramp without the measurement |
| 8 Outline | boundary predicate (solid ∧ ∃¬solid 4-neighbour) on the **object** mask | 1 px, 4-neighbour, no kernel | sky-complement predicate writing into sky |
| 9 Damage | support = below not walkable; walk down-first, **up last** | one pass, recursing into neighbours | single column sweep, no lateral re-check |
| 10 Gates | pixelmatch 0.1 · SSIM 7×7 K1 .01 K2 .03 · `shannon_entropy(base=2)` | as published | inline "flat %" on the wrong reference file |

**Licence ledger for the constructor:** PixelOE Apache-2.0 ✔ · transformers.js Apache-2.0 ✔ · MediaPipe Apache-2.0 ✔ · sproutline public domain ✔ · OpenCV Apache-2.0 ✔ · Aseprite GPL-2.0/MIT split (the `.gpl` **data** is palette data, safe; the loader code is not needed) · Pillow MIT-CMU ✔ · scipy/skimage/sklearn BSD-3 ✔ · pixelmatch ISC ✔ · **libimagequant GPL-3.0-or-later ✘ — external gate process only, never linked** · **sky-region-detector no licence ✘ — method only, do not copy the file** · Lospec palette data: user-submitted, per-palette terms (Endesga 32 is widely redistributed; check before shipping).

**What I could not fetch/verify:** commit SHAs for `minetest` and `scipy`/`sklearn` were obtained with `git ls-remote` (API rate limit hit at 60/60), so they are HEAD-at-fetch-time, not tags; `libimagequant`'s header at tag 4.4.1 declares `LIQ_VERSION_STRING "4.0.3"` (the Rust port keeps the C ABI version string — noted, not explained). No facade-pitch repository exists that I could find, and I say so in §3 rather than inventing one.

**Nothing in `/Users/m/DVOR-8` was modified by the research itself** — the three files in this change set (`docs/CONSTRUCTOR.md`, `docs/CONSTRUCTOR-LEDGER.md`, `data/constructor.json`) are the only writes, and they were authorised after the research.
