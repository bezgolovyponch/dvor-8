# THE SYSTEM — principles, types, margins, and the dependency map

Everything here is **retrieved**, not assumed. Every principle names its source: **VIDEO** (the creator's screen
recording of the visual style audit), **MEASURED** (numbers taken from the creator's accepted frame or from a
converted frame), or **REFERENCE** (published practice, linked). Every principle names the check that verifies it.

## 0. What the system is

A **photograph is converted into pixel art in a style that was defined and constructed BEFORE the conversion**, and
the result is a playable level. The audit on screen in the video is the system's own instrument: it puts the
photograph and the converted frame side by side under the title **«ВИЗУАЛЬНЫЙ АУДИТ — V6 — v9»** — *V6 is the style,
v9 is the build* — so the comparison is part of the system, not a review after it.

## 1. THE PRINCIPLES

### P1 — ALIGNMENT: one game pixel per 5×5 photo block, same position, no crop
* **Source:** VIDEO, printed on the audit screen verbatim: *"every block of 5×5 photo pixels becomes one game pixel at
  the same position, so the game frame lines up with the photo exactly."*
* **Margin:** MEASURED — 1440×2560 → 288×512 = **5.00 × 5.00 exactly**; deviation allowed: **0**. Any crop, letterbox or
  non-integer ratio breaks the principle.
* **Verified by:** `tools/pairing-check.mjs` (sky IoU ≥ 0.60 against the 5×5-reduced photograph) and
  `tools/style-check.mjs` (`block === 5`, canvas 288×512).
* **Depends on:** nothing. **Everything else depends on it.**

### P2 — THE PALETTE IS FIXED BEFORE THE CONVERSION
* **Source:** REFERENCE — the NES's 54-colour master palette and 4-per-sprite limit; [Lospec](https://lospec.com/palette-list).
* **Margin:** MEASURED — **50 entries** = 8 ramps × 6 tones + outline + void. A converted frame must use **≥ 12 distinct
  entries** and no non-sky entry may own **> 35%** of the frame (a clear sky is legitimately large and is exempt).
* **Verified by:** `tools/style-check.mjs` ("no wash"), `tools/family-check.mjs`.
* **Depends on:** nothing.

### P3 — THE STYLE'S REGISTER: mid tones carry the frame, the darkest entry is the outline
* **Source:** MEASURED from the accepted frame — its dominant grey is `rgb(89,85,95)`, lightness **0.35**; its outline
  is `rgb(11,0,24)`; the two frames' outline entries are the same entry.
* **Margin:** the dominant grey's lightness within **±0.10** of 0.35; warmth (r−b) within **±14** of −6; hue within 15°.
* **Verified by:** `tools/reference-palette-check.mjs`; the register is applied last (`src/style/register.js`).
* **Depends on:** P2. **Conflict recorded:** lifting the dark end for the register fights the spread rule of P2 —
  resolved by CONSTRUCTION (planes built in tones 2..4), not by a threshold.

### P4 — THE SKY IS DRAWN: one flat plane, white clouds, in the photograph's own sky region
* **Source:** MEASURED — accepted sky `rgb(77,156,232)` (hue 209, sat 0.77), clouds **pure white** `rgb(255,255,255)`;
  VIDEO — the audit frame shows a flat blue field with flat-bottomed white puffs.
* **Margin:** sky hue within **8°**, saturation within **0.18**; the sky region's IoU against the photograph's sky
  **≥ 0.60**; clouds **4–9**, never closer than **3 px** to the skyline; cloud entry **must be exactly white**.
* **Verified by:** `tools/style-check.mjs`, `tools/reference-palette-check.mjs`, `tools/pairing-check.mjs`.
* **Depends on:** P1 (the region comes from the photograph), P2.

### P5 — A FACADE IS A FLAT PLANE WITH A REGULAR GRID
* **Source:** VIDEO (the audit frame's tower is a smooth plane with a dense regular window grid, floor by floor);
  REFERENCE — sheet/tile construction as in *Super Mario Bros.* (1985) and *Rampart* (1990).
* **Margin:** the grid's pitch is **the median gap between the openings the photograph actually shows** (no typed
  pitch); **0 foreign pixels** inside a wall mask (nothing but the family's tones or a sprite entry); where the
  photograph alternates bays, the facade is a **checkerboard**.
* **Verified by:** `tools/piece-facade-check.mjs` (5 assertions, standalone), `tools/style-check.mjs`
  ("facade carries no foreign pixel").
* **Depends on:** P1, P2, P3.

### P6 — A WINDOW IS A SPRITE, DESTROYABLE, NEVER OUTLINED
* **Source:** VIDEO (windows in the audit frame are drawn, and a broken one shows a dark hole with debris);
  REFERENCE — sprite conventions of the NES era.
* **Margin:** four parts — sill · frame · lip · glass; **0 windows outlined** at any time.
* **Verified by:** `tools/style-check.mjs` ("outlines only on buildings and cars"), the live self-evaluation
  (`WINDOWS 56 outlined 0`).
* **Depends on:** P5.

### P7 — OUTLINES MARK WHAT YOU POINT AT, AS A SILHOUETTE
* **Source:** VIDEO (the audit frame shows the tower outlined in cyan while it is being inspected — and nothing else
  outlined); the creator's rule: outlined kinds are **buildings and cars**.
* **Margin:** an outline exists **only** for a thing that is aimed, picked or damaged; it is the **outer silhouette**
  (a pixel is on it only if a 4-neighbour belongs to a different region); **0** idle things outlined; **0** windows;
  **0** people.
* **Verified by:** the live self-evaluation (outlined kinds by kind), `tools/baseline-check.mjs` (the outline row).
* **Depends on:** P1 (the mask), P5, P6.

### P8 — A THING IS ONE MASS, AND THE PHOTOGRAPH KEEPS ITS PLACES
* **Source:** REFERENCE — cut-out practice ([PixelOE](https://pypi.org/project/pixeloe/1.0.0/),
  [image2pixel-web](https://github.com/32comic/image2pixel-web)); the video's audit frame keeps the photograph's cars
  and road exactly where they are.
* **Margin:** worst-case clusters per thing **= 1**; the ground's dark structures stay dark in **≥ 60%** of the pixels
  that are dark in the photograph.
* **Verified by:** `tools/pairing-check.mjs` ("dark structures kept dark"), the live self-evaluation (`worstClusters`).
* **Depends on:** P1, P2.

### P9 — DAMAGE IS A LADDER PER MATERIAL AND IT LEAVES REMAINS
* **Source:** REFERENCE — *Angry Birds* (2009: material-specific destruction and score), *Rampage* (1986: pieces off),
  *Red Faction: Guerrilla* (2009: support-based collapse), *Teardown* (2022: permanence), *Bomberman* (1983: a cell
  wave), *SimCity* (1989: warning → event → aftermath).
* **Margin:** a ladder of **3 states** (scrape → tear → void) × **5 material profiles** (glass, brick, concrete,
  metal, wood); a cell with no support falls; **rubble persists** — no restoration pass may exist.
* **Verified by:** the destruction predicates in `tools/criteria-check.mjs` (D1, D2), the suite.
* **Depends on:** P5 (cells), P6, P8.

### P10 — THE HUD IS THE ACCEPTED BAR, AND IT IS MEASURED
* **Source:** VIDEO (the audit frame's bar: ⓘ · current weapon ▴ · СТИХИЯ ▴ · big round yellow throw; `РАЗБИТО n`
  left, danger meter right).
* **Margin:** four controls in that order; the weapon panel shows the **current** weapon and cycles on tap; the throw
  button is the largest control and is **gold `rgb(249,194,43)`**; panel borders measured from the artefact: weapon =
  cyan border with a pink shadow, disaster = pink border with a cyan shadow.
* **Verified by:** the accessibility tree (`button "i" · "КАМЕНЬ" · "СТИХИЯ" · "бросить"`), `docs/shots/toolbar.png`.
* **Depends on:** nothing (it is chrome), but it must not cover the frame (P1).

### P11 — EVERY FIX IS JUDGED BY AN INSTRUMENT THAT CAN FAIL
* **Source:** this project's own record: six session faults were my measurement, not the code (a comment grepped as an
  import, a cache wrapper iterated as a list, a transient frame captured as the frame, a phone screenshot measured for
  numbers, a hidden utility canvas measured, a crop's HUD rows read as a skyline).
* **Margin:** every instrument prints its **premises** with its verdict and **withholds** the verdict when a premise
  fails; every gate must have been **shown to refuse a deliberate fault** (mutation), or it counts as absent.
* **Verified by:** the mutation audit recorded in this session (deleted import → exit 1; synthetic wash → exit 1;
  altered load-bearing statement → exit 1).
* **Depends on:** nothing. **It governs all the others.**

## 2. THE TYPES

| type | what it is | properties | produced by |
|---|---|---|---|
| **frame** | 288×512 indices into the 50-entry palette | `idx: Int16Array`, `palette`, `owner` | the conversion |
| **sky region** | the pixels the photograph says are sky | `mask`, IoU ≥ 0.60 vs the photo's sky | P4 |
| **facade plane** | a wall's pixels | `mask`, `tones[4]`, `pitch(x,y)`, `origin(x,y)`, 0 foreign | P5 |
| **window sprite** | 4 parts in a grid cell | `sill · frame · lip · glass`, `hp`, never outlined | P6 |
| **thing** | a detected object | `pixels` (one mass), `label`, `hp`, `hits`, `own` colour | P8 |
| **structure** | a building as cells | `cells`, `support`, cascades on loss | P9 |
| **outline** | a boundary set | silhouette only, per state (aimed/picked/damaged) | P7 |
| **rubble** | what a broken thing leaves | persists; never restored | P9 |
| **HUD** | the bar and the three readouts | score · осталось · РАЗБИТО n · danger | P10 |

## 3. THE DEPENDENCY MAP

```
P1 alignment (5x5, no crop)
 ├── P4 sky        ── needs the photo's sky region ──┐
 ├── P5 facade     ── needs the wall masks + pitch ──┤
 │    ├── P6 window                                  ├── P2 palette ── P3 register
 │    └── P9 damage (cells, support)                │
 ├── P7 outline     ── needs masks (P1) and kinds (P5, P6)
 └── P8 thing       ── needs one-mass cut-outs (P1) and the palette (P2)

P10 HUD        (independent chrome, must not cover the frame)
P11 instruments (independent, govern every verification above)

ORDER OF CONSTRUCTION:  P1 → P2 → P3 → P5 → P6 → P4 → P8 → P7 → P9 → P10
ORDER OF VERIFICATION:  piece checks → style-check → pairing-check → reference-palette-check → mutation audit
```

## 4. WHAT IS VERIFIED TODAY, AND WHAT IS NOT

| principle | state |
|---|---|
| P1 alignment | **verified** — pairing IoU 0.70 on v10a, 0.71 on yard2 |
| P2 palette / no wash | **verified** — 8 conformance lines, spread ✓ |
| P3 register | **in tension** — the dominant grey is one tone low on dark photographs; resolved by construction (planes in tones 2..4), not yet applied |
| P4 sky | **verified** — hue 3° off, clouds exact white, IoU ✓ |
| P5 facade | **piece CONFIRMED standalone**; not yet assembled into the conversion |
| P6 window | **verified live** — 56 windows, 0 outlined |
| P7 outline | **rule verified live**; the renderer's silhouette-only pass is still in flight |
| P8 thing | **verified** — worst clusters 24 → 1; dark structures kept 87%/78% |
| P9 damage | **verified** by the destruction predicates |
| P10 HUD | **verified** — four controls, order and colours measured |
| P11 instruments | **verified by mutation** on three gates |

---

# THE OUTPUT FRAME, RETRIEVED FROM THE VIDEO (reference/video-output-frame.png, t = 9.8 s of 30.2 s)

The recording is 30.2 s: **first the photograph** (the audit view with the 5×5 caption), **then the corresponding
output** — the game frame, in play, with `880 очки`, `РАЗБИТО 8`, three of five danger segments lit and the bottom bar.
Its colours were read off the recording and they CONFIRM the style that was derived from the still screenshot:

| role | measured in the video's output frame | our palette after the fix | verdict |
|---|---|---|---|
| sky | `rgb(77,155,231)` — hue **210**, sat **0.76**, light 0.60 | hue 209, sat 0.75, tone `rgb(47,131,224)` | **matches** |
| clouds | `rgb(255,255,255)` pure white | the sky ramp's top tone = white | **matches** |
| road / concrete grey | `rgb(98,94,104)` — hue **264**, sat 0.05, light **0.39** | stone tone 2 `rgb(99,87,107)`, light 0.38 | **matches** |
| dark structures | `rgb(74,70,81)` — hue **262**, sat 0.07, light 0.30 | stone tone 1 `rgb(65,54,68)` | close |
| UI navy | `rgb(24,17,31)` | — | to add to the style |
| outline | `rgb(8,0,25)` | `rgb(11,0,24)` | **matches** (one family) |
| window glass | `rgb(77,100,180)` and `rgb(49,62,122)` — **BLUE** | sprite uses `rgb(92,116,152)` grey-blue | **correction needed: the glass is bluer** |

## What the output frame shows, object by object — the construction rules it fixes

1. **The tower** is a **drawn plane**: a dark blue-grey field, a **dense regular grid of windows in rows** (floor by
   floor), the glass in **two blues** (`rgb(77,100,180)` lit, `rgb(49,62,122)` shaded), and **warm horizontal floor
   bands** between the rows. **No photographic texture anywhere inside it.** Its outline is **GOLD** while it is being
   inspected — not pink, not cyan.
2. **The mid-rise** is the **checkerboard**: alternating white and dark-blue tiles on its own silhouette, with a
   pitched roof line, drawn flat.
3. **The sky** is one flat blue plane with **white, flat-bottomed clouds** — large, few, and never touching the
   skyline.
4. **The cars and the road** are the photograph's own pixels, posterised, in place — the white BMW in front, the dark
   cars behind, the bike symbol on the asphalt.
5. **Debris**: small white dots scattered where things have been broken, around the tower's base and the trees.
6. **The reticle**: a small circle with a cross, on the point being aimed at.
7. **The bar**: ⓘ (cyan ring) · weapon panel (**cyan** border, **pink** offset shadow) · СТИХИЯ ( **pink** border,
   **cyan** shadow) · a big **gold** `rgb(249,194,43)` round throw button with a dark triangle; the held stone rests on
   the road at the frame's bottom edge.

**THE TWO CORRECTIONS THIS RETRIEVAL IMPOSES ON THE BUILD:**
* **the aimed outline is GOLD**, so the renderer's aimed colour changes from pink to the palette's gold;
* **the window glass is BLUE** (`rgb(77,100,180)` / `rgb(49,62,122)`), not the grey-blue sprite in use.
