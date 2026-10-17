# THE CONSTRUCTOR LEDGER — one row per pipeline segment

Machine-readable companion to `docs/CONSTRUCTOR.md`. The authority for every value is that document;
this file exists so a script can read the same rows. Generated from `data/constructor.json` (same data, byte-identical block at the end).

**Rule carried by every row:** a value comes only from (a) a published implementation own default, (b) a measurement of the accepted reference frame, or (c) a measurement of the photograph. No tuned constants.

## Table

| segment | status | source_repo | source_file | version | licence | our_file | our_lines | gate_command | expected_value |
|---|---|---|---|---|---|---|---|---|---|
| 1. SCENE PARSE (photo -> class masks) | FOUND | huggingface/transformers.js | src/pipelines.js (ImageSegmentationPipeline 2092-2205); src/processors.js (post_process_semantic_segmentation 161-213; preprocess 939-1030) | 3.0.2 @ bd839b9849af | Apache-2.0 | src/scene-parse.js | 21-57, 60-67, 80, 84-106 (horizon 107-116 belongs to segment 2) | node --experimental-websocket tools/detgate-parse.mjs | classes 11 of 19 with sky present; mask-argmax diff 0 px; sky share 27.4% of the 288x512 frame |
| 2. HORIZON (sky/ground split) | FOUND | Bakkopi/sky-region-detector | SkyRegionDetector.py (edgesToMask, 54-98) | main @ 43b952646d67 | none declared - method only, do not copy the file | src/scene-parse.js | 109-116 | python3 gate: run edgesToMask on masks.sky and diff skylinePoints against horizon+1 | 0 columns differ; FNV hash of the two horizon arrays equal |
| 3. FACADE GEOMETRY (bay pitch, grid origin) | PARTIAL | scipy/scipy (+ numpy) | scipy/signal/_peak_finding.py (find_peaks, 729); numpy.correlate('full') | scipy HEAD @ 0feac33c7624; numpy 2.0.2 | BSD-3-Clause | src/vector.js | 1503-1520 (pitchOf); MIN_PITCH floor at src/criteria/FacadeRule.js:9 | python3 gate: print the autocorrelogram's top three lags for one facade | first peak = fundamental (e.g. 7) followed by its harmonics (14, 21); pitchOf() == peaks[0] |
| 4. REDUCTION (photo -> art grid) | FOUND | KohakuBlueleaf/PixelOE (PyPI sdist 1.0.0) and Jannchie/PixelOE.js | src/pixeloe/legacy/downscale/contrast_based.py (find_pixel 10-24, contrast_based_downscale 27-56); src/core/downscale.ts (contrastDownscale) | PixelOE 1.0.0 (PyPI sdist, Apache-2.0); PixelOE.js main @ a32908466f5d | Apache-2.0 | src/pieces/downscale.js | 29-65 (invented gates at 47-55); 71-94 (threshold 40) | node: 25-pixel patch, 24 at L=10 + 1 at L=200, through both selection rules | selectedL 10 (the dark mass) and chroma_source patch_median; ours currently selects 200 |
| 5. PALETTE / QUANTISATION | FOUND | ImageOptim/libimagequant (+ python-pillow/Pillow) | imagequant-sys/libimagequant.h; imagequant-sys/example.c 48-64; src/attr.rs (defaults); PIL/Image.py (quantize 1184-1225) | libimagequant 4.4.1 @ 9388d26902c5; Pillow 11.3.0 | GPL-3.0-or-later (gate process only, never linked); Pillow MIT-CMU (linkable) | src/flat.js (PALETTE/paletteOf) and src/palette.js | 565-575; palette.js 83-115 (dead on the photo path) | python3 -c "from PIL import Image; import numpy as np; a=np.asarray(Image.open(f).convert('RGB')).reshape(-1,3); c,n=np.unique(a,axis=0,return_counts=True); p=n/n.sum(); print(len(c), -(p*np.log2(p)).sum())" | distinct <= 50 and entropy <= 5.6439 bpp (= log2 of the 50-entry table); reference v10a-art-canvas.png prints 48 / 5.349 |
| 6. OBJECTS (instance masks -> sprites) | FOUND for the detector and the one-mass rule; PARTIAL for mask->sprite | google-ai-edge/mediapipe (documentation) and opencv/opencv | developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js (config defaults table); cv2.connectedComponentsWithStats | MediaPipe web guide fetched 2026-10-17; OpenCV imgproc reference | Apache-2.0 | src/detect.js and src/objects.js | detect.js 19-29; objects.js 22-23, 65-175 | page: detector.detect twice (model threshold vs 0.2) and print counts; python: cv2.connectedComponentsWithStats(carMask & box, connectivity=8) | n_meta and n_0.2 both printed with n_0.2 >= n_meta; kept component area and [x,y,w,h] equal cv2's exactly |
| 7. STYLE / REGISTER (palette ramps, tone ladders) | FOUND | aseprite/aseprite (+ lospec.com palette JSON) | data/extensions/endesga-palettes/edg32.gpl; src/doc/file/gpl_file.cpp (load_gpl_file 28-90) | main @ b3e34acbae81; lospec endesga-32.json fetched 2026-10-17 | Aseprite GPL-2.0/MIT split (the .gpl data is palette data); Lospec per-palette terms | src/flat.js | 96-110 (RAMPS/STEPS); 565-575 (PALETTE); src/style/register.js 19-54 | python3 gate: cluster reference/v10a-art-canvas.png's 48 colours by hue and fit a 6-tone ladder per ramp | 8 ramps recovered, each with 6 luminances strictly increasing; printed (hue,sat) pairs compared to RAMPS |
| 8. OUTLINES (1-px outline as boundary) | FOUND | ands/sproutline (+ OpenCV tutorial for MORPH_GRADIENT) | sproutline.h (s2o_thresholded_to_outlined 242-283; s2o_dilate_thresholded 211-241) | v0.10 @ a7da8950e788 | public domain | src/vector.js | 1255-1272; rule declared at src/criteria/OutlineRule.js 18-24 | python3 gate: count outline_px = \|solid AND some 4-neighbour not solid\| on the object mask, compare with our pass | outline_px equal in both implementations; outline pixels inside the sky mask == 0 (today it equals sky.__edge) |
| 9. RENDERING / DAMAGE CASCADE (cell support) | FOUND | minetest/minetest | builtin/game/falling.lua (check_single_for_falling 441; neighbour table 486-503; check_for_falling 505) | master @ db44f2f58f68 | LGPL-2.1-or-later | src/world.js | 211-228 (cascade in breakCells); 231-244 (rubble write) | node gate: synthetic grid - a 6-cell column with its base removed, then a 3x1 overhang whose column is removed | 6 taken (base + 5 above) in both implementations; the overhang row must fall in minetest's walk and currently does not in ours |
| 10. GATES (the measuring instruments) | FOUND | mapbox/pixelmatch and scikit-image/scikit-image | gates/node_modules/pixelmatch/index.js (defaultOptions 1-10, maxDelta 40-42); skimage/metrics/_structural_similarity.py 15-26,161-190; skimage/measure/entropy.py | pixelmatch 6.0.0; scikit-image v0.25.2 (HEAD b700edc8005e) | pixelmatch ISC; scikit-image BSD-3-Clause | gates/frame-diff.mjs and gates/external.sh | frame-diff.mjs 15-20; external.sh 7 (REF default), 13-14 (inline flat %) | node gates/frame-diff.mjs a.png b.png; python3: structural_similarity(..., data_range=255, channel_axis=-1); shannon_entropy(img, base=2) | 0 differing pixels between two runs of the same build; SSIM printed to 4 dp; entropy <= 5.6439 bpp for a 50-colour canvas |

## Same data as JSON (parse this block instead of the table)

```json
[
  {
    "segment": "1. SCENE PARSE (photo -> class masks)",
    "status": "FOUND",
    "source_repo": "huggingface/transformers.js",
    "source_file": "src/pipelines.js (ImageSegmentationPipeline 2092-2205); src/processors.js (post_process_semantic_segmentation 161-213; preprocess 939-1030)",
    "version": "3.0.2 @ bd839b9849af",
    "licence": "Apache-2.0",
    "our_file": "src/scene-parse.js",
    "our_lines": "21-57, 60-67, 80, 84-106 (horizon 107-116 belongs to segment 2)",
    "gate_command": "node --experimental-websocket tools/detgate-parse.mjs",
    "expected_value": "classes 11 of 19 with sky present; mask-argmax diff 0 px; sky share 27.4% of the 288x512 frame"
  },
  {
    "segment": "2. HORIZON (sky/ground split)",
    "status": "FOUND",
    "source_repo": "Bakkopi/sky-region-detector",
    "source_file": "SkyRegionDetector.py (edgesToMask, 54-98)",
    "version": "main @ 43b952646d67",
    "licence": "none declared - method only, do not copy the file",
    "our_file": "src/scene-parse.js",
    "our_lines": "109-116",
    "gate_command": "python3 gate: run edgesToMask on masks.sky and diff skylinePoints against horizon+1",
    "expected_value": "0 columns differ; FNV hash of the two horizon arrays equal"
  },
  {
    "segment": "3. FACADE GEOMETRY (bay pitch, grid origin)",
    "status": "PARTIAL",
    "source_repo": "scipy/scipy (+ numpy)",
    "source_file": "scipy/signal/_peak_finding.py (find_peaks, 729); numpy.correlate('full')",
    "version": "scipy HEAD @ 0feac33c7624; numpy 2.0.2",
    "licence": "BSD-3-Clause",
    "our_file": "src/vector.js",
    "our_lines": "1503-1520 (pitchOf); MIN_PITCH floor at src/criteria/FacadeRule.js:9",
    "gate_command": "python3 gate: print the autocorrelogram's top three lags for one facade",
    "expected_value": "first peak = fundamental (e.g. 7) followed by its harmonics (14, 21); pitchOf() == peaks[0]"
  },
  {
    "segment": "4. REDUCTION (photo -> art grid)",
    "status": "FOUND",
    "source_repo": "KohakuBlueleaf/PixelOE (PyPI sdist 1.0.0) and Jannchie/PixelOE.js",
    "source_file": "src/pixeloe/legacy/downscale/contrast_based.py (find_pixel 10-24, contrast_based_downscale 27-56); src/core/downscale.ts (contrastDownscale)",
    "version": "PixelOE 1.0.0 (PyPI sdist, Apache-2.0); PixelOE.js main @ a32908466f5d",
    "licence": "Apache-2.0",
    "our_file": "src/pieces/downscale.js",
    "our_lines": "29-65 (invented gates at 47-55); 71-94 (threshold 40)",
    "gate_command": "node: 25-pixel patch, 24 at L=10 + 1 at L=200, through both selection rules",
    "expected_value": "selectedL 10 (the dark mass) and chroma_source patch_median; ours currently selects 200"
  },
  {
    "segment": "5. PALETTE / QUANTISATION",
    "status": "FOUND",
    "source_repo": "ImageOptim/libimagequant (+ python-pillow/Pillow)",
    "source_file": "imagequant-sys/libimagequant.h; imagequant-sys/example.c 48-64; src/attr.rs (defaults); PIL/Image.py (quantize 1184-1225)",
    "version": "libimagequant 4.4.1 @ 9388d26902c5; Pillow 11.3.0",
    "licence": "GPL-3.0-or-later (gate process only, never linked); Pillow MIT-CMU (linkable)",
    "our_file": "src/flat.js (PALETTE/paletteOf) and src/palette.js",
    "our_lines": "565-575; palette.js 83-115 (dead on the photo path)",
    "gate_command": "python3 -c \"from PIL import Image; import numpy as np; a=np.asarray(Image.open(f).convert('RGB')).reshape(-1,3); c,n=np.unique(a,axis=0,return_counts=True); p=n/n.sum(); print(len(c), -(p*np.log2(p)).sum())\"",
    "expected_value": "distinct <= 50 and entropy <= 5.6439 bpp (= log2 of the 50-entry table); reference v10a-art-canvas.png prints 48 / 5.349"
  },
  {
    "segment": "6. OBJECTS (instance masks -> sprites)",
    "status": "FOUND for the detector and the one-mass rule; PARTIAL for mask->sprite",
    "source_repo": "google-ai-edge/mediapipe (documentation) and opencv/opencv",
    "source_file": "developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js (config defaults table); cv2.connectedComponentsWithStats",
    "version": "MediaPipe web guide fetched 2026-10-17; OpenCV imgproc reference",
    "licence": "Apache-2.0",
    "our_file": "src/detect.js and src/objects.js",
    "our_lines": "detect.js 19-29; objects.js 22-23, 65-175",
    "gate_command": "page: detector.detect twice (model threshold vs 0.2) and print counts; python: cv2.connectedComponentsWithStats(carMask & box, connectivity=8)",
    "expected_value": "n_meta and n_0.2 both printed with n_0.2 >= n_meta; kept component area and [x,y,w,h] equal cv2's exactly"
  },
  {
    "segment": "7. STYLE / REGISTER (palette ramps, tone ladders)",
    "status": "FOUND",
    "source_repo": "aseprite/aseprite (+ lospec.com palette JSON)",
    "source_file": "data/extensions/endesga-palettes/edg32.gpl; src/doc/file/gpl_file.cpp (load_gpl_file 28-90)",
    "version": "main @ b3e34acbae81; lospec endesga-32.json fetched 2026-10-17",
    "licence": "Aseprite GPL-2.0/MIT split (the .gpl data is palette data); Lospec per-palette terms",
    "our_file": "src/flat.js",
    "our_lines": "96-110 (RAMPS/STEPS); 565-575 (PALETTE); src/style/register.js 19-54",
    "gate_command": "python3 gate: cluster reference/v10a-art-canvas.png's 48 colours by hue and fit a 6-tone ladder per ramp",
    "expected_value": "8 ramps recovered, each with 6 luminances strictly increasing; printed (hue,sat) pairs compared to RAMPS"
  },
  {
    "segment": "8. OUTLINES (1-px outline as boundary)",
    "status": "FOUND",
    "source_repo": "ands/sproutline (+ OpenCV tutorial for MORPH_GRADIENT)",
    "source_file": "sproutline.h (s2o_thresholded_to_outlined 242-283; s2o_dilate_thresholded 211-241)",
    "version": "v0.10 @ a7da8950e788",
    "licence": "public domain",
    "our_file": "src/vector.js",
    "our_lines": "1255-1272; rule declared at src/criteria/OutlineRule.js 18-24",
    "gate_command": "python3 gate: count outline_px = |solid AND some 4-neighbour not solid| on the object mask, compare with our pass",
    "expected_value": "outline_px equal in both implementations; outline pixels inside the sky mask == 0 (today it equals sky.__edge)"
  },
  {
    "segment": "9. RENDERING / DAMAGE CASCADE (cell support)",
    "status": "FOUND",
    "source_repo": "minetest/minetest",
    "source_file": "builtin/game/falling.lua (check_single_for_falling 441; neighbour table 486-503; check_for_falling 505)",
    "version": "master @ db44f2f58f68",
    "licence": "LGPL-2.1-or-later",
    "our_file": "src/world.js",
    "our_lines": "211-228 (cascade in breakCells); 231-244 (rubble write)",
    "gate_command": "node gate: synthetic grid - a 6-cell column with its base removed, then a 3x1 overhang whose column is removed",
    "expected_value": "6 taken (base + 5 above) in both implementations; the overhang row must fall in minetest's walk and currently does not in ours"
  },
  {
    "segment": "10. GATES (the measuring instruments)",
    "status": "FOUND",
    "source_repo": "mapbox/pixelmatch and scikit-image/scikit-image",
    "source_file": "gates/node_modules/pixelmatch/index.js (defaultOptions 1-10, maxDelta 40-42); skimage/metrics/_structural_similarity.py 15-26,161-190; skimage/measure/entropy.py",
    "version": "pixelmatch 6.0.0; scikit-image v0.25.2 (HEAD b700edc8005e)",
    "licence": "pixelmatch ISC; scikit-image BSD-3-Clause",
    "our_file": "gates/frame-diff.mjs and gates/external.sh",
    "our_lines": "frame-diff.mjs 15-20; external.sh 7 (REF default), 13-14 (inline flat %)",
    "gate_command": "node gates/frame-diff.mjs a.png b.png; python3: structural_similarity(..., data_range=255, channel_axis=-1); shannon_entropy(img, base=2)",
    "expected_value": "0 differing pixels between two runs of the same build; SSIM printed to 4 dp; entropy <= 5.6439 bpp for a 50-colour canvas"
  }
]
```

Entry count: 10. Keys per entry: segment, status, source_repo, source_file, version, licence, our_file, our_lines, gate_command, expected_value.