# THE WIRING REVIEW — use cases → mechanical gates → the operator's exact examples → the retrieved parameters

Written at T+134. The question it answers: *is every element of the composition judged against the operator's own
rendering of that element, or against a rounded index of mine?* The answer before this round was **the latter** (the
v13 lines are shares: "one tone ≤ 60 % of the ground"). This round wires the elements to **templates**.

## 1. The three layers, element by element

| element (use case) | mechanical gate | the EXACT desired example | the retrieved parameter it tests |
|---|---|---|---|
| the sky | `v13-check` V2 · delivery S1 · **template** | `prague-tower.png` sky box (x158..288, y8..gy−70) — the operator's engine, same photograph | v13 S6: one base tone, a dithered band toward the horizon (Bayer 1973), two-octave value noise clouds (Perlin lineage), ≤8 entries |
| the road / pavement | `v13-check` V3 · **template** | the ground box (y gy+45..H−8) | v13 S2/S3: quantise + 2 mode passes · the traffic-surface rule from the accepted frame's region statistics |
| the facade | `v13-check` V5 · `match-check` tower | the biggest annotated building quad | v13 S8–S11: quad homography (Heckbert 1989), projection-profile period, Otsu (1979) / Niblack (1986), 4-connected components |
| the cars | `v13-check` V4 · `match-check` cars | the annotated car boxes | v13 S12: the photograph's pixels kept, one 1-px outline (morphological gradient, OpenCV) |
| the windows | `v13-check` V6 | the annotated pane-bearing facades | v13 S11: one object per pane |
| the palette | `v13-check` V1 · `family-check` | the reference's own tone count (16) | v13 S1: one 50-entry master palette, ≤12 working entries by popularity |
| the whole frame | `v13-check` V7 · R1 | the reference frame itself | the composition above, end to end |

## 2. What the template check measured (T+134, judged photograph, `tools/template-check.mjs`)

The bar for each element is **the reference's own measurement on the same patch**, with the reference's own
four-scene spread printed beside it. `light` and `texture` are 8×8-block agreement, measured **relative to each
patch's own mean** (the two tables' base tones differ by 18 luma in the same designed blue — an absolute test would
compare palettes, not designs).

```
element   n px     dom ours/same-patch ref   ref's own 4-scene range   tones        light  texture  verdict
sky       33280    42.1 / 51.4 %             26.4 - 57.1 %              11/11        17 %   17 %     light+texture outside
road      36000    50.2 / 45.6 %             22.3 - 45.6 %              14/12        57 %   59 %     dom outside
facade    36628    17.8 / 26.6 %             26.6 - 40.6 %              16/16        44 %   31 %     dom outside, light outside
cars       9866    24.4 / 32.8 %             17.7 - 37.9 %              12/15        51 %   49 %     texture outside
```

**Read honestly:** two of the four elements are inside the reference's own spread on the structural measure (sky
42.1 inside 26.4–57.1; cars 24.4 inside 17.7–37.9) and two are outside (the road is 4.6 points *more* dominant than
the reference on the same patch and above its four-scene maximum; the facade is *less* dominant, i.e. more varied,
than the reference anywhere). The block-level agreement is the sharper instrument: it says our sky's light is
distributed differently, our facade's light is distributed differently, our cars' texture differs on half the blocks.

## 3. The one structural conflict the wiring exposes

**S1 and the reference's sky template disagree, by construction.** The delivery rule requires the top 8 % band's most
common colour to be the blue plane at ≥35 % — i.e. a *clear zenith*. The operator's engine piles its clouds at the
top (`skyStyle` subtracts `(ys-150)/60*0.2`, measured in D25) and its own top band is blue 23 % / white 21.9 %. So the
template's light agreement on the sky cannot rise while S1 stands as written: 17 % of blocks is the measurement of
that conflict, not a bug in the cloud field.

This is D24's class a second time (a bar the desired artefact fails). The fix is *not* mine to make silently: S1 came
from the accepted frame, the template from the operator's newer file. The options, stated:

- **(a)** keep S1 (a designed plane sky, the accepted frame's look) and accept that the sky's template agreement stays
  low — the sky is then judged by V2/S1, not by the template;
- **(b)** re-derive S1 from the reference (its band: blue 23 % / white 21.9 %, the plane not the majority) and let the
  sky's clouds reach the zenith, which is what raises the template agreement to the reference's own level.

## 4. What the unified algorithm now does with these parameters (and where)

- **sky**: base tone → **two-octave value-noise clouds** (threshold lifted toward the zenith, shade from the same
  field 2.5 px higher) → the designed lobe banks. V2 60.5 %, V7 55.97 → 55.39 % after the ground's refinement.
  **THE HORIZON BAND WAS BUILT AND MEASURED, AND IT DOES NOT SHIP YET** (recorded, not hidden): ported exactly as the
  reference draws it - the BASE layer before the clouds (the order is part of the template), 3-on/2-off runs (a
  threshold dither is confetti; the suite caught that at 4.59 % stray), the reference's own 0.45 threshold - it took
  **V2 to 42.3 % and V7 to 54.34 %** (the best either line has read), but it cost **R1 its budget: blue −0.111 against
  the 0.09 tolerance**, because in this palette the band's only light tone is pure white and the band covered ~5.6 % of
  the frame. Reverted to the shipped build (`ba023002…`) with the finding recorded here and in the RUNLOG. The band is
  the natural next change, and it is now blocked on the same decision as the sky itself (see §3): with S1 re-derived
  from the reference, the band can be painted the way the reference paints it (a wide, low-density haze), not as the
  thin strip that R1's budget allows.
- **road**: surface-mean luma → two planes split at the reference's 40 % share → five mode passes → **morphologically
  closed paint**. V3 53.0 → **50.2 %**, V7 → 54.34 %.
- **facade / cars / windows**: the photo-preserving piece, the photo's pixels with one outline, one object per pane.
- **palette**: the working palette as the last write (V1 17).

All five steps take their numbers from the reference's own construction, and each is measured by a gate that reads the
reference's own example — the rounded indices remain only as *printed context*, never as the bar the template check
uses.
