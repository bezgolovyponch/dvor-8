# THE STYLE — defined and constructed first, then applied to any photograph

The conversion is primary, and the STYLE governs it. This file is the style: every value is **measured from the
creator's accepted frame** (`reference/v10a-target-hi.webp`, `10a УЛИЦА · Прага · 288×512 · PX = 2`) unless it says
CHOICE. The code that carries it is `src/style/index.js`, and `tools/style-check.mjs` measures a converted frame
against it — so "is it in the style?" is a check, not an opinion.

## The frame

| value | measured |
|---|---|
| canvas | 288 × 512, PX = 2 |
| block | **5** — 1440×2560 → 288×512 is 5.00 × 5.00 exactly, no crop, no letterbox |
| palette | 50 entries: 8 ramps × 6 tones + outline + void |

## The six parts of the style, in build order

**1 GROUND — the photograph's own pixels.** 5×5 area mean per game pixel, through the palette, never smoothed:
roads, markings, kerbs, cars, people keep their positions and their light/dark relations. *This is the part that makes
the player recognise their yard.*

**2 SKY — one flat plane + white clouds.** Measured: sky `rgb(77,156,232)` (hue 209, sat 0.77); clouds **pure white**
`rgb(255,255,255)` with one shaded row under each puff, flat bottoms, 4–9 of them, never closer than 3 px to the
skyline. **The sky region may never exceed the sky in the photograph** — the photograph decides *where*, the palette
decides *what colour*.

**3 FACADE — a flat plane with a regular grid.** One family's tones only; **no photographic texture inside a wall**
(this is what produced the noisy facades); windows on a **regular grid at the pitch measured from the photograph's own
openings** (the median gap between detected opening centres). Where the photograph shows alternating bays, the facade
is a **checkerboard** — as the accepted frame's mid-rise is.

**4 WINDOW — a sprite.** sill · frame · lip · glass. Light frame, mid blue-grey glass, pale sill. Destroyable, and
**never outlined**.

**5 OUTLINE — the rule.** Outlined kinds: **buildings and cars**. Drawn only when the thing is **aimed, picked or
damaged**, and always as its **silhouette** — never per-cell boxes. Windows and people are never outlined.

**6 HUD.** Left: `очки`, `разбито`. Right: `осталось`, `опасность` with its meter. Bottom bar: **info · current
weapon with a cycle arrow · disaster · a big round yellow throw**. (All present in the frame as of this commit.)

## Conformance, as a check

`tools/style-check.mjs` measures a converted frame and reports each line of the style's checklist: sky hue and
saturation, cloud whiteness, the grey's warmth and lightness, the sky's IoU against the photograph, the tone spread,
foreign pixels inside walls, and outlined windows. A frame is **in the style** only when every line passes.
