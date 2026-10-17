# THE PAIRING — input, output, and the mapping between them

## The pair this project is judged on

| | file | what it is |
|---|---|---|
| **INPUT** | `photos-test/v10a.jpg` (`2026-10-13 15.20.34.jpg`, 1440×2560) | the creator's photograph: a Prague street seen from a balcony — a dark tower filling the left, a checkered mid-rise at the centre, a white BMW and a dark estate on the road, the cycle-lane symbol painted on the asphalt, tram wires across the sky |
| **EXPECTED OUTPUT** | `reference/v10a-target.webp` → `docs/shots/target-v10a.webp`, cropped canvas in `reference/v10a-art-canvas.png` | the accepted frame of the same street: `10a УЛИЦА · Прага · 288×512 · PX = 2` |

## Every photograph of the creator's, and what each one is

Checked in by checksum on 2026-10-16 — identity is a hash, not a filename.

| file | md5 | what it is | role |
|---|---|---|---|
| `photos-test/v10a.jpg` = `photos-test/5.jpg` (byte-identical) | `70fdff62519414af68af04d5e5bc1112` | Prague street from a balcony, `2026-10-13 15.20.34.jpg`, 1440×2560 | **the judged pair's INPUT** |
| `reference/v10a-target.webp` + `reference/TARGET.json` | `d1b5ff3b…` / `76bbc3cc…` | the accepted frame `10a УЛИЦА · Прага · 288×512 · PX = 2` | **the example**: every frame is measured against it |
| `reference/v10a-accepted-frame-screenshot.png` | `ce8321b4e7eeae9fc31bb7a154ae377f` | the accepted frame as it appears on the page, HUD included | evidence for the EYE only — a screenshot of a screen is a third kind, never a measurement input |
| `reference/v10a-source-photo-screenshot.png` | `cc6bfd50965c56c9868da6e8bb9790f2` | the same photograph as the page shows it, header `ИСХОДНОЕ ФОТО · 1440×2560 → 288×512` | evidence for the EYE only |
| `photos-test/sunset.jpg` = `2026-10-12 23.06.50.jpg` | `8d48668684e97750d4b9b370c62f2194` | bridge and car park at sunset, a bus on the road, 1440×2560 | a creator photograph |
| `photos-test/2026-10-12 23.06.55.jpg` | `447f35327d38d388e06c065f947d6191` | balcony view: church with golden domes, parking rows, railway, 1440×2560 | a creator photograph |
| `photos-test/2026-10-12 23.06.59.jpg` | `74a4f7895bb3fcbc383fbf4d74c59f08` | narrow street, parked cars, a smoke plume, 1440×2560 | a creator photograph |

All seven are 1440×2560, aspect 0.56250 — the geometry `BLOCK = 5` describes. Photographs of any other shape
(`a.jpg`, `b.jpg`, `web1.jpg`, `web2.jpg`) are supplementary: they may be run, but no acceptance line may rest on them.

## The mapping, verified by arithmetic — not by eye

```
INPUT  photo   1440 × 2560   aspect 0.56250
OUTPUT canvas   288 ×  512   aspect 0.56250
ratio           5.00 × 5.00
```

**One game pixel per 5×5 photo block, at the same position, no crop and no letterbox.** `BLOCK = 5` is therefore not
a style choice: it is the photograph's own geometry, and it is why every element of the accepted frame sits exactly
where its counterpart sits in the photograph, at 1/5 scale.

## What is REPLACED and what is KEPT — read off the accepted frame

| element | in the photograph | in the accepted frame |
|---|---|---|
| road, kerbs, markings, the cycle-lane symbol | real pixels | **kept** — the same shapes, posterised into the palette |
| car bodies (white BMW, dark estate) | real pixels | **kept** — same positions, same light/dark relation, one thin dark outline |
| people on the left pavement | real pixels | **kept** as small dark shapes |
| sky | overcast, mottled grey-blue | **replaced** — one flat blue plane, large white cloud masses |
| the tower | dark grid of windows and mullions | **replaced** — a smooth blue-grey plane with a regular fine window grid, floor by floor, in the same silhouette |
| the checkered mid-rise | a façade of alternating dark/light tiles | **replaced** — a clean checkerboard of light tiles on the same silhouette |
| tram wires | thin dark lines | **kept** as 1-px dark lines |
| windows | openings | **drawn sprites** (frame · glass · sill), destroyable, never outlined |

## The rule this pair imposes, in one sentence

**The photograph supplies the FACTS — where things are, what shape they are, which are light and which are dark.
Everything the palette draws on top of that (sky, façades, windows) must sit at exactly those positions, at 1/5 scale.**

## How the comparison may be made

- **positionally, feature by feature** (this file): the tower's silhouette, the mid-rise's silhouette, the cars'
  positions, the cycle symbol's position — each checked against the photograph, which is exact because the ratio is exact;
- **by eye**, against `docs/shots/target-v10a.webp`;
- **not numerically from the screenshot** — attempted twice, and it measured my crop (HUD rows and all) rather than the
  art: `best candidate 11–28% flat`, then a skyline profile of 0.00 with one spike. A photograph of a screen is a third
  kind of artefact; it proves nothing about a canvas.

---

# THE ACCEPTED OUTPUT, MEASURED (high-resolution screenshot, `reference/v10a-target-hi.webp`)

Sampled from the art area of the creator's frame — this is the palette the accepted design actually uses:

| role | accepted value | our frame today | verdict |
|---|---|---|---|
| **sky** | `rgb(77,156,232)` — hue 209, sat 0.67 | `rgb(86,118,185)` — hue 218, sat 0.54 | **too dark, too grey** |
| **clouds** | `rgb(255,255,255)` — pure white | `rgb(207,221,232)` — pale blue-grey | **wrong: clouds must be WHITE** |
| road / asphalt | `rgb(98,94,105)` — warm grey, slight magenta | `rgb(87,90,107)` | too cold |
| dark structures | `rgb(74,70,80)` · `rgb(27,18,32)` | `rgb(54,55,68)` | too cold and too light |
| outline / void | `rgb(11,0,22)` | `rgb(11,0,24)` | **the same entry** — the palettes are of one family |

## The construction, read from the accepted frame

1. **Sky**: one flat blue plane, no dither, no speckle; **large white clouds with flat bottoms**, roughly six to nine of
   them, of two or three sizes, all in the upper half, never touching the skyline.
2. **The tower (left)**: a **drawn facade** — a smooth dark plane carrying a dense **regular grid of windows** (about
   fourteen columns across its visible width, rows every few pixels); each window is a small rectangle with a lighter
   top edge. **No photographed mullions, no texture inside the plane.**
3. **The mid-rise (centre)**: a **checkerboard** of white and dark-blue tiles on the building's own silhouette, with its
   pitched roof line — the alternation is the photograph's, drawn flat.
4. **Cars**: kept from the photograph, posterised — the white BMW stays white and keeps its shape, the dark cars stay
   dark; **one thin dark outline**, no coloured hatching.
5. **Road**: the photograph's asphalt, markings, cycle symbol, kerbs — kept.
6. **HUD**: `РАЗБИТО 0` with a red badge (left) · `ОПАСНОСТЬ` with a five-segment meter (right) · bottom bar:
   ⓘ (cyan ring) · current weapon panel with ▴ · `СТИХИЯ` panel with a swirl · **big round yellow throw button**.

---

# THE PAIRING GATE'S FIRST RUN — it found a real regression (2 of 6 pairs pass)

`tools/pairing-check.mjs <photo> <canvas.json>` reduces the photograph by the same 5x5 area mean the game uses, then
measures whether the sky we DRAW occupies the pixels that are sky in the picture.

| photograph | sky in photo | sky in frame | IoU | verdict |
|---|---|---|---|---|
| `5` (Prague) | 49% | 49% | **0.69** | PAIRED |
| `yard2` (balcony) | 65% | 62% | **0.71** | PAIRED |
| `web2` (courtyard) | 49% | 60% | 0.51 | **NOT PAIRED** — 11 points too much sky |
| `b` | 35% | 42% | 0.35 | **NOT PAIRED** — 7 points too much |
| `web1` (Sanok) | 34% | 52% | 0.37 | **NOT PAIRED** — 18 points too much |
| `a` | 29% | 53% | 0.28 | **NOT PAIRED** — 24 points too much: the sky is painting over the buildings |

**The fault is a greedy sky.** It appeared when the sky's region was widened this session (the class-map candidates,
the flood threshold, and painting the sky last) — each change was made to make the sky *appear*, and the last of them
made it *overflow*. On a photograph whose sky is a third of the frame the sky now owns half of it.

**THE RULE THE ACCEPTED PAIR IMPOSES:** the designed sky is painted *in place of the photograph's sky*, at the same
positions, so **the sky region may never exceed the sky in the picture**. The photograph decides WHERE the sky is; the
palette decides what colour it is. Concretely: a pixel may be painted as sky only if it is sky-ish in the reduced
photograph (blue, or bright and near-neutral) and connected to the top edge — the same test the gate applies, so
"paired" becomes true by construction rather than by luck.
