# CROSS-AUDIT FINDINGS (independent verification of CONSTRUCTOR.md and AUDIT-REPORT.md)

> **THIS FILE IS HISTORY.** Its numbers are as of the date it was written and are kept unchanged on purpose (the
> append-only rule): they record what was true then, not what is true now. The current figures live in
> `docs/DONE-EVIDENCE.md` and are printed by the chain itself.
Recorded at HEAD 079f119, read-only audit. THE TWO DOCUMENTS STAY AS WRITTEN (historical), but the items
below are the TRUE values and supersede them. Nothing here is a preference: each was re-checked line by line.

## BROKEN in docs/CONSTRUCTOR.md - true values

 1. §7 "src/flat.js:96-110 declares RAMPS" -> RAMPS is 66-93; 96-110 is RESERVED/unReserve.
 2. §8 "OutlineRule.js is never consulted by the drawing code" -> FALSE: src/render.js:4 imports mayBeOutlined,
    src/render.js:540 calls `if (!mayBeOutlined(r)) continue;`. Only the vector.js:1258-1273 sky pass ignores it.
 3. §8/§2 "sky.__edge at 1270", block "1255-1272" -> 1272; the block is 1258-1273.
 4. §9 "(`merge`, world.js:217)" -> no merge exists in world.js; 217 is `const k = cy * c.cols + cx;`.
 5. §10a "external.sh:7 REF=reference/v10a-art.png" -> live line 7 is already `-canvas.png`; the defect it
    describes was fixed in commit 3879946 (AUDIT-REPORT says so, the two documents contradicted each other).
 6. §4/§10c "external.sh:13-14 computes the flat figure" -> 17 (compute) / 18 (print); 13-14 is the PIL import.
 7. §4 "pixelize calls outline_expansion(..., 9, 4) so the caller overrides avg/dist but not erode/dilate" ->
    it overrides erode=thickness, dilate=thickness, k=patch_size, avg=9, dist=4; the defaults 2/2/16 are never
    used (cli default --thickness 1).
 8. §1 "detgate-parse prints <w>|<h>|<classes>|..." -> it prints PREMISES / LOAD 1 / LOAD 2 / CROSS-LOAD
    (tools/detgate-parse.mjs:84-87); no pipe line. The same false format appears in AUDIT §2 layer 1 and Step 21.
 9. §4 "sha256 path 8c1eff..." -> that is the files.pythonhosted URL path, not the digest; real sha256 is
    93ff10ebd4e83024...
10. §10c "2^H 7,442" for v10a-art.png -> 7,432 (12.859 bpp).
11. §2 snippet "verbatim 57-98" omits lines 90-91 (`else: skylinePoints = np.array([0]*w)`) with no elision
    marker - and that branch IS the no-sky guard the doc says the source has and ours lacks.
12. §9 snippet is reformatted (11 table entries compressed 3/line) and elides 451-456 (the leveled-merge
    branch), so "one neighbour, no heuristics" is imprecise.

## BROKEN in docs/AUDIT-REPORT.md - true values

13. §1 item 2 "the self-test panel draws 0 rows on load" -> /tmp/det-a/selftest.json onLoad.count = 3
    (FAIL/OK/info), afterClick.count = 0. Only the post-click claim is true.
14. "the button is not wired to the panel" -> WIRED TWICE: main.js:668 addEventListener click -> runSelfTest,
    main.js:669 setTimeout -> runSelfTest. THE REAL CAUSE IS THE UNDECLARED PX (one occurrence, main.js:224);
    PX IS exported at view.js:17 and local at render.js:22 but not imported by main.js.
    THE FIX IS `import { PX } from './view.js'`, not "declare a new constant".
15. §1 item 11 / §2 layer 10 / Step 3 "G-DET-ANALYZE still to add" -> it EXISTS at HEAD and passes
    (819/819 + 417/417, dump sha256 a16d52422a20c6d0, exit 0). Step 3 is already done.
16. §1 "palette MATCHES - node tools/reference-palette-check.mjs" -> bare command = usage, exit 2; needs
    <canvas.json>. Its default reference is reference/v10a-target-hi.webp (350x652 page shot) - the very file
    the docs call a lossy resample.
17. §1 "pairing - node tools/pairing-check.mjs" -> usage, exit 2; needs <photo.jpg> <canvas.json>.
18. Step 5 "the dark/blue/white predicates in gates/external.sh" -> no such predicates exist there; they are
    not in gates/ at all.
19. Step 11/§5 "the HUD's «осталось» is src/main.js:246" -> 249; 246 is `if (!world) return;`.
20. Step 13 gate "-> selectedL 10, chroma_source patch_median" -> the probe prints `ours picks L=210.0 -> BRIGHT`
    and downscaleContrast has no chroma_source at all (it copies whole RGB); its PixelOE line is a hardcoded
    literal, so the probe could not fail on a wrong PixelOE port.
21. Step 21 acceptance "150 classes of 150 labels" -> detgate-parse prints PRESENT classes (11 of 19 today); a
    150-class model on one photo will not print 150.
22. Appendix "concept 7 OK 1 FAIL (largest 37%)" -> not reproducible on any dump on disk: /tmp/chain-page is
    6 OK 2 FAIL at 37% (second fail: sky band largest 30% < 40%); /tmp/det-a is 7 OK 1 FAIL at 38%.
23. Step 14's dependency on Step 13 is spurious (the object mask is layer 6, not reduction); Step 17's
    dependency on Step 16 is spurious (horizon produces no walls); Step 15's "nothing structural" contradicts
    §2 layer 9's own "layers 3/6".
24. Step 2 is UNACHIEVABLE as written: the seed is consumed only post-strike (world.js:431, main.js:927), so
    different-seed = 0 px - MEASURED from the stored captures.

## VERIFIED (survived adversarial re-check, do not re-litigate)

  - PixelOE `find_pixel` 10-24 verbatim from the 1.0.0 sdist (Apache-2.0; README 255-256; PKG-INFO:295).
  - sproutline `s2o_thresholded_to_outlined` 242-266 exact 4-neighbour predicate; dilate 211-241; v0.10 public domain.
  - minetest falling.lua check_single_for_falling:441, neighbour order exact, check_for_falling:505, commit fetchable.
  - sky-region-detector edgesToMask 54-98, edgeInv:31, noSky:35, LICENSE 404 (no licence - method only).
  - transformers.js 3.0.2 processors.js 619/622/624, post_process:161, thumbnail:657, preprocess:938, normalize 1001-1020.
  - scipy find_peaks:729; aseprite gpl_file.cpp 28-40/88-93; Pillow Quantize 190-194 + quantize body 1221-1225;
    pixelmatch 6.0.0 ISC, defaultOptions 2-10, maxDelta:42.
  - entropy: canvas 48 / 5.349; v10a-art 56573 / 12.859; target-hi 35630 / 11.267; log2(50)=5.6439.
  - gates re-run: test.mjs PASS 313 FAIL 7 of 320; criteria 11/19 no dump, 15/19 with dump; match 6/7;
    style 8/8; pairing PAIRED IoU 0.66 dark 83%; baseline 31/19; preflight 17; imports 46; piece-downscale 4/4;
    detgate 0 px reproduced from the stored pair.
  - all three sprint findings CONFIRMED: vendor/seg/config.json is Cityscapes 19-class while modules.json
    describes ADE20K 150-class; the reduction inverts (24xL18 + 1xL210 -> ours 210, PixelOE rule -> 18);
    PX undeclared in main.js with the exact stored ReferenceError.

## NEXT THREE, in the cross-audit's order (with exact expected values)

  1. `import { PX } from './view.js'` in src/main.js. Gate: `node test.mjs` prints `PASS 314 FAIL 6 of 320`;
     a page run leaves selftest.json afterClick.count > 0; criteria prints `16 of 19` with BLOCKED `B4, I1, R1`.
  2. replace the home-made flat figure with ENTROPY on both frames (numpy one-liner: no skimage/scipy installed).
     Gate: `sh gates/external.sh <dump>` prints our distinct <= 50 and entropy <= 5.6439 beside
     `reference/v10a-art-canvas.png 288x512 - 48 distinct colours`, and same-frame diff `0 of 147456 = 0.00%`.
  3. port `find_pixel` (L only, a/b = patch medians). Gate: 24xL18+1xL210 -> 18 and 24xL10+1xL200 -> 10;
     `node tools/piece-downscale-check.mjs` stays 4/4 and gains this case.

## WHAT THIS AUDIT COULD NOT VERIFY

  Every browser gate (detgate*, photo-shot) needs Chromium + the :4312 server; no cv2/scipy/skimage/sklearn/torch
  is installed, so each Python gate the documents propose (horizon diff, top-3 lags, outline_px, ramp recovery,
  connectedComponentsWithStats, SSIM, shannon_entropy) is not runnable today; libimagequant attr.rs/example.c and
  the skimage/sklearn line numbers were not fetched.
