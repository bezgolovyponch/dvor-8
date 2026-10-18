# tools/v13 — the operator's Photo→Pixel engine as a measurable reference

This folder holds the reference the product is now measured against: the engine class from
`/Users/m/Downloads/DVOR-8 Photo2Pixel v13.dc.html` (the file's lines 123–861), run at 288×512 on its own four
scenes. `docs/V13-ANALYSIS.md` is the line-by-line reading of that file; `docs/AUDIT-V13.md` is the audit of the
product against it.

## What is what

| file | what it is | how it is produced |
|---|---|---|
| `engine-v13.txt` | **THE canonical engine**, byte-exact | `refs.mjs` extracts `class Component …` from the HTML and requires this file to equal the slice; sha256 `ea0273fe…`, 115,511 chars |
| `engine.txt` | a **local fork** of the engine (sha256 `1b2cb4d1…`) | not the operator's file: `period()` picks the largest strong peak (P/phL/rawL), the rectified profile is read only inside the facade mask, and `glassDom` is decided before the checker test. Kept because those three deltas answer measured defects on the Prague street; every use of it must say so. |
| `page.html` | the generated page from the fork | written by `shot.mjs` (the old runner); superseded by `refs.mjs` |
| `refs.mjs` | the reference runner | extracts the engine from the HTML, verifies the committed extraction, builds each scene twice (FNV equal), writes `reference/v13/` |
| `shot.mjs` | the old fork runner | still works, but it runs `engine.txt`; it is not the reference |

## Run it

```
CHROME=<chrome-headless-shell wrapper with --no-sandbox> node --experimental-websocket tools/v13/refs.mjs
```

Writes, under `reference/v13/` (committed):

```
<scene>.png        the clean frame at 288×512 (index buffer, 1:1)
<scene>.id.png     the ID map (buildings pink, cars cyan)
<scene>.win.png    the window map (pane pixels yellow)
<scene>.s0.png     the box-averaged photograph (the engine's own S0)
readout.json       per scene: FNV of two builds, working palette, per-facade report, annotation, window count
provenance.json    html path + sha256, engine sha256, scene→photo map, palette
```

`node tools/v13-check.mjs <scene> <canvas.json>` reads those and measures the product against them (V1–V7).
