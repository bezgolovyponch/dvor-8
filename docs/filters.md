# Filters — decisions, sources and tests

A filter is the viewer's state — sober, weed, alcohol, depression — shown as a change to the palette the
yard is looked up through, plus, for two of them, a small change to the view. This file records every
decision, where it came from, and the test that holds it.

Tags: `SOURCED[n]` — stated on a page that was opened (list at the end). `DERIVED[n]` — inferred from
those pages. `CHOICE` — a design decision of this project with no external source; the numbers are
tunable and were set by eye.

## What existing games and hardware do with the same capability

| # | Finding | Tag |
|---|---|---|
| F1 | On the NES a picture is not redrawn to recolour it: 32 bytes of palette memory are rewritten, and every pixel is a lookup into them. "Backgrounds and sprites each have 4 palettes of 4 colors, located at $3F00-$3F1F"; "a 6-bit value in the palette memory area corresponds to one of 64 outputs." | SOURCED[1] |
| F2 | The NES has whole-screen colour modifiers in one register: three emphasis bits, where "each bit emphasizes 1 color while darkening the other two", and setting all three darkens the picture; "a few games ... set all three tint bits to darken all colors." | SOURCED[2] |
| F3 | The NES greyscale bit does not compute grey: it "will remap the palette by index, not by color." A whole-screen mood is a remap, not a calculation per pixel. | SOURCED[1] |
| F4 | Colour cycling changes the palette over time to animate a still image, because "storing one image and changing its palette requires less memory and processor power than storing multiple frames." Used in Sonic the Hedgehog 3, SimCity 2000, Mickey Mania and adventure-game water and lava. | SOURCED[3] |
| F5 | Gris begins on "colourless earth"; the player collects lights "and restore[s] colour back to her world"; the title is "the Spanish word for the colour grey", and "the game becomes more lively as players progress." Loss of colour is the game's picture of grief, and colour returning is its picture of recovery. | SOURCED[4] |
| F6 | A drunk view, as built in a published shader, is eight screen-space parts in one pass: sway ("drifts horizontally and vertically over time using layered sine-wave motion"), tilt, barrel distortion, double vision ("a secondary offset sample of the scene ... blend[ed] with the primary image"), red/blue channel separation, a "warmer and slightly desaturated color palette", a vignette, and brightness pulsing. | SOURCED[5] |
| F7 | Unreal developers asked for a drunk effect answer with the same parts: a slow camera shake "for a loose, random sway", fringe, desaturation by colour grading, vignette, and moving the camera itself so the character is hard to control. | SOURCED[6] |

**Not found:** a source for how games show cannabis specifically, or clinical depression as distinct from
grief. No page opened in this search addressed either. The weed filter is therefore built from F4 and
is a `CHOICE`; the depression filter leans on F5, which is about grief, and says so.

## Decisions

| # | Decision | Tag | Held by test |
|---|---|---|---|
| D1 | A filter is a palette remap applied inside `forLayer`, the one function every 8-bit colour already passes through. Nothing is redrawn and no sprite knows a filter exists. | DERIVED[F1, F3] | *sober is the identity* |
| D2 | Order is band → filter → ladder. A filter may leave its layer's saturation band; no colour may leave the 8-step ladder. | CHOICE | *under every filter every colour is still on the 8-step ladder* |
| D3 | **Depression:** saturation × 0.15, lightness × 0.82, mixed 15% toward a cold blue-grey. Nearly colourless, darker, cold. No sway, no motion. | DERIVED[F2, F5]; numbers CHOICE | *depression: nearly colourless, and darker* · *what colour is left is cold* · *sober and depression leave the view still* |
| D4 | **Alcohol, palette:** saturation × 0.75, mixed 18% toward a warm amber. | SOURCED[F6]; numbers CHOICE | *alcohol: warmer and less saturated than sober* |
| D5 | **Alcohol, view:** sway from two layered sines, at most 4 px; double vision as one extra faint copy of the picture, offset 2–6 px. Taken from F6: sway, double vision, warm desaturation. **Left out** of F6: tilt, barrel distortion, channel separation, vignette, brightness pulse — each needs per-pixel work a 2D canvas does not do cheaply, and three parts already read as drunk. | SOURCED[F6, F7]; selection CHOICE | *alcohol sways, never by more than the stated maximum, and always sees double* |
| D6 | **Weed:** saturation × 1.30, lightness × 1.04, hue drifting ±0.035 of the wheel on a 10.5 s cycle, and the view breathing by one pixel. The drift is colour cycling applied to the whole palette. | DERIVED[F4]; that this reads as "weed" is CHOICE | *weed: more saturated* · *the hue drifts with time, and comes back* · *only weed moves the palette over time* |
| D7 | Depth survives: saturation still rises from sky to yard under sober, weed and alcohol. Under depression it is not asserted — flattening the scene is what that filter does. | CHOICE | *atmospheric perspective survives the filters that keep colour* |
| D8 | A filter is a look, never a rule. It changes no hit, no break count, no rock. F7 notes that games also make a drunk character hard to control; this project does not, because the brief excludes punishing loss (Q8) and a filter that costs rocks would be one. | CHOICE, from brief Q8 | *a throw at what the player SEES hits it under every filter, sway included* |
| D9 | The pointer is mapped back through the same sway the picture was drawn with (`viewToWorld`), so under alcohol the player hits what they saw, not where it would have been sober. | CHOICE | same test |
| D10 | Things not yet scanned are filtered too, without quantising (`tint`). A filter is the viewer's state and does not wait for the scan. | CHOICE | — (seen in the screenshots, not asserted) |
| D11 | Depression is a filter the player switches on and off freely. It is not tied to a score, a timer or a failure, and nothing in the yard "cures" it. Gris ties colour to progress (F5); copying that here would make breaking things the recovery. | CHOICE | — |

## What is not verified

- No test looks at the canvas. The palette and view functions are tested; that the picture on screen
  matches was checked once by eye in headless Chrome, not by an assertion.
- The numbers in D3–D6 were chosen by eye on one yard and one sky.
- Nothing here has been seen on a phone yet.

## Sources — pages opened on 2026-10-11

1. NESdev Wiki, "PPU palettes" — https://www.nesdev.org/wiki/PPU_palettes
2. NESdev Wiki, "Colour emphasis" — https://www.nesdev.org/wiki/Colour_emphasis
3. Wikipedia, "Color cycling" — https://en.wikipedia.org/wiki/Color_cycling
4. Wikipedia, "Gris" — https://en.wikipedia.org/wiki/Gris
5. xsoras, "I Am Not Okay" shader page, CurseForge — https://www.curseforge.com/minecraft/shaders/i-am-not-okay
6. Unreal Engine forums, "drunk effect" — https://forums.unrealengine.com/t/drunk-effect/320054

Pages 1–6 were read through a summarising fetch; the quotations are as it returned them and have not been
checked against the pages by a second reading.
