# assets/REGISTRY.md - every input a check may use, with its identity

RULE: a check input must be listed here. sha256 is the identity; a filename is not.

| file | role | sha256 (16) | size |
|---|---|---|---|
| `photos-test/v10a.jpg` | test photograph (the judged pair's INPUT; = 5.jpg) | `ac27afe47e54e39a` | 1440x2560 |
| `photos-test/sunset.jpg` | creator photograph (bridge/car park, 2026-10-12 23.06.50) | `fe803ed122b2ac5e` | 1440x2560 |
| `photos-test/2026-10-12 23.06.55.jpg` | creator photograph (church, balcony view) | `740d2a55d7dccac6` | 1440x2560 |
| `photos-test/2026-10-12 23.06.59.jpg` | creator photograph (street, smoke plume) | `4f12096fd72d252c` | 1440x2560 |
| `photos-test/a.jpg` | supplementary photograph (landscape, not a protocol photo) | `febc87e4c2407387` | 1600x1200 |
| `reference/v10a-target.webp` | the accepted frame as delivered (page image, 796x1310) | `ff3b0d2906773834` | 796x1310 |
| `reference/TARGET.json` | the example's measured region histograms (the 7 suite lines' judge) | `cef9e01e39c8b5bd` | 4616 B |
| `reference/v10a-art.png` | accepted frame, 288x512, antialiased (56,573 colours) - eye + derivation source | `0f16e006ee4559a9` | 288x512 |
| `reference/v10a-art-canvas.png` | DERIVED palette-exact 288x512 canvas (Pillow median-cut 48) - R1/F3 input | `9f715fa82e4c102c` | 288x512 |
| `assets/masks-car-overlay.png` | masks.car overlay screenshot (probe-parse.html, v10a) | `86dec5b5961f02b2` | 1280x800 |
| `gates/package.json` | published external judge: pixelmatch 6.0.0 + pngjs 7.0.0 (MIT) | `83557ef49b729723` | 252 B |
