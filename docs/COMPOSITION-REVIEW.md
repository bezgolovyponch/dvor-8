# THE COMPOSITION ART-DESIGN REVIEW — ten elements, each with the gate that measures it, the number it read, and the verdict

Run at T+133 on the refined build (judged photograph `v10a.jpg`, clean frame, clock pin 7.5), against the operator's
own reference frame (`reference/v13/prague-tower.png`) and the accepted frame. A row is **MET** only when a gate
prints its line; the two rows marked **DEVIATION** are stated with their cause, not hidden.

| # | element (`docs/COMPOSITION.md`) | the gate | what it read | verdict |
|---|---|---|---|---|
| 1 | **the bands are in order** - sky, horizon line, ground, and nothing crosses the line | `plan-check` A–C | `PLAN ACCEPTED: 8 of 8 structural lines` | MET |
| 2 | **two facade archetypes** - a dark glass plane and an alternating checker | `match-check` tower + midrise lines | tower dark **35.5%** (≥35) · checker white 33% / blue 44% (both ≥8) | MET |
| 3 | **one horizon line**, the frame's spine | `plan-check` (the accepted frame's row 352) | in the 8 of 8 above | MET |
| 4 | **the facade is the photograph in the working palette**, panes recoloured | `v13-check` V5 | **17 tones · one tone 17.8% ≤35 · top3 45.4% ≤85** (reference 16/26.6/58.9) | MET |
| 5 | **windows are panes of the building**, one object per pane | `v13-check` V6 | **513** panes ≥ 132 (10% of the reference's 1321), one per pane-bearing facade | MET |
| 6 | **the ground is its own planes with the photograph's markings** | `v13-check` V3 + the eye | largest tone **50.2%** of the ground ≤60 (reference 45.6); the crossing reads as **bars**, the kerb as one line | MET |
| 7 | **one outline rule** - 1 px, buildings and cars only, never windows | `style-check` | `IN THE STYLE: every line of v10a conformance passes` (8/8) | MET |
| 8 | **the sky is designed** - one blue plane, a dithered/generated cloud field | `v13-check` V2 + delivery S1 | sky's largest tone **60.5%** ≤70 (reference 50.1) · the band's top colour is the blue plane at **41.1%** ≥35 | MET |
| 9 | **the frame's tonality** - a working palette, no wash | `v13-check` V1 + `family-check` | **17 tones** ≤24 (reference 16) · `no collapse: 17 entries · largest non-sky 18%` | MET |
| 10 | **the frame against the reference, pixel for pixel** | `v13-check` V7 + R1 | distance **55.39%** ≤56.66 (accepted frame's own 51.66) · R1 worst **0.070** @ 0.09 | MET |
| — | **DEVIATION A: the asphalt's contrast** | V3 + the eye | our two asphalt planes are the palette's neighbouring rungs (**36 luma apart**); the reference's are ~22 apart, so our roadway reads as bolder patches than its mottling | stated: the fixed 6-rung ramp's spacing, the style's own decision (REQ 58); a closer pair does not exist in the table |
| — | **DEVIATION B: the cars' grain** | `match-check` cars line + the eye | `photo-kept surfaces … 96% neutral` passes, but the cars keep more of the photograph's own texture than the reference's, which quantises them harder | stated: the cars are deliberately the photograph's pixels (REQ 58's "photo pixels plus one outline"); closing it means re-quantising them, which would move V4 |

## What this round polished, and why it is universal

1. **The count is a composition decision, not a paint detail.** «осталось» was **521** because every window pane was a
   counted target (4 buildings + 4 cars + **513 panes**). The operator's own engine counts `buildings + cars` and
   keeps panes as destruction objects (`WN`), so a pane is now `counted: false`: the HUD reads **8**, the panes still
   break and still throw glass (REQ 54), and `v13-check` V6 still sees every pane. This is not a threshold change - it
   is the difference between a piece and a target, and it applies to every photograph.
2. **The pavement conversion is per surface, not per pixel.** The roadway was speckled - two rungs scattered one pixel
   at a time, the kerb broken into dashes, the crossing a blotch - because the rung was chosen from each pixel's own
   luma, i.e. from the photograph's grain. The tone now comes from a **3×3 mean of the surface** (the project's own
   PROTOCOL step 4: a contrast-aware selection per block, not an average per pixel), the tone map gets **five**
   majority passes instead of two, and the paint mask is **morphologically closed** (dilate/erode by one - the
   project's cited morphology) so a stripe keeps its width and its continuity. Measured before → after on the same
   frame: V3 **53.0 → 50.2%**, V7 **55.97 → 55.39%**, the kerb one continuous line, the crossing solid bars.
3. **Both are in the universal path**, not in a photo-specific branch: the tone-from-surface rule and the closing
   apply to any pad the road pass finds, and the counted/piece distinction is in the world's rule, not in a scene.
