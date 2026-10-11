# Style — findings, decisions and tests

The look and the feel of DVOR-8, what each part was taken from, and the test that holds it.

Tags: `SOURCED[n]` — stated on a page that was opened (list at the end). `SNIPPET` — seen only in a search
result, page not opened. `DERIVED[Fn]` — inferred from findings. `CHOICE` — this project's decision, no
external source; numbers set by eye.

## Findings

| # | Finding | Tag |
|---|---|---|
| F1 | On the NES a picture is not redrawn to recolour it: palette memory is rewritten and every pixel is a lookup. "Backgrounds and sprites each have 4 palettes of 4 colors"; "a 6-bit value in the palette memory area corresponds to one of 64 outputs." | SOURCED[1] |
| F2 | The NES has whole-screen colour modifiers: "each bit emphasizes 1 color while darkening the other two", and "a few games ... set all three tint bits to darken all colors." | SOURCED[2] |
| F3 | The NES greyscale bit "will remap the palette by index, not by color." A whole-screen mood is a remap. | SOURCED[1] |
| F4 | Colour cycling animates a still image by changing its palette, because "storing one image and changing its palette requires less memory and processor power than storing multiple frames." | SOURCED[3] |
| F5 | Gris begins on "colourless earth" and the player "restore[s] colour back to her world"; "the game becomes more lively as players progress." | SOURCED[4] |
| F6 | A drunk view, in a published shader: sway by "layered sine-wave motion", tilt ("a slow rotational offset"), double vision ("a secondary offset sample of the scene ... blend[ed] with the primary image"), a "warmer and slightly desaturated color palette", plus distortion, channel separation, vignette and pulsing. | SOURCED[5] |
| F7 | Unreal developers recommend the same parts: slow camera shake "for a loose, random sway", fringe, desaturation, vignette. | SOURCED[6] |
| F8 | Hotline Miami's graphics are "pixel art with a high-contrast colour palette". Points come "for each enemy they kill, with bonus points ... [for] the number of enemies killed in quick succession". "The player is able to quickly restart the current stage." A reviewer: "five seconds of action that you can lose yourself in for five hours." | SOURCED[7] |
| F9 | Hotline Miami is "rendered in garish neon pixels"; the art "operates at a low resolution"; "Bodies stay where they fall"; "Death comes fast. The restart comes faster. That loop is the entire engine." | SOURCED[8] |
| F10 | Hotline Miami's screen is "tilting and warping relentlessly from side to side". | SNIPPET (games.gg search result; the sentence was not on the page as fetched) |
| F11 | Hotline Miami 2 uses "'80s colors" and "a VHS design": "menus themselves have a VHS-style options menu and pause distortion effect." | SOURCED[9] |
| F12 | Jan Willem Nijman on one pistol shot in Nuclear Throne: the camera kicks back 6 pixels and screenshake adds 4; a hit starts "with white frame"; the game freezes "about 10-20 milliseconds whenever you hit something". | SOURCED[10] |
| F13 | Nijman's talk also lists permanence — debris and marks that stay — among the tricks. | SNIPPET (search result; the talk page returned 404) |

**Not found:** a source for how games show cannabis, or depression as distinct from grief. The weed look is
built from F4 and is a `CHOICE`; the depression look leans on F5, which is about grief.

## Decisions

| # | Decision | Tag | Held by test |
|---|---|---|---|
| D1 | The yard is stored as palette indices and looked up through an 18-entry table each frame. A filter is another table. | DERIVED[F1, F3] | *a filter changes the table and nothing else* |
| D2 | Two ramps, cool and warm, eight tones each, dark purple to white and dark plum to pale gold; the middle of each is saturated. | DERIVED[F8, F9, F11]; the colours are CHOICE | *both ramps run dark to light* · *high contrast: at least 8x* · *two different hues* · *neon, not pastel* |
| D3 | The picture is 144 × 192 pixels (or 192 × 144), scaled up without smoothing. | DERIVED[F9] | — |
| D4 | A photograph is stylised in four steps: brightness stretched to the full range, warm/cool chosen per pixel, eight tones with ordered dithering, outlines where brightness changes sharply. | CHOICE | *every pixel is a palette index* · *a dark photograph is stretched* · *a daylight yard uses both ramps and has outlines* |
| D5 | Things are found on the device: patches of similar brightness and warmth, fenced by outlines, between 0.15% and 10% of the picture. Too few, and the busiest cells of a grid become targets. It finds shapes, not names. | CHOICE | *between 4 and 10 things* on a demo, a flat, a noisy and a dark picture |
| D6 | The frame tilts from side to side all the time, about 1°. | F10 is only a SNIPPET; treated as CHOICE | *the frame always leans a little* |
| D7 | Scanlines over the picture; hard offset shadows in pink and cyan on every title and button; nothing rounded. | DERIVED[F11]; details CHOICE | — (by eye) |
| D8 | A tap is answered in the same frame (a ring) and the rock lands 110 ms later. | CHOICE | *a tap is answered in the same frame* · *from tap to impact is under 150 ms* |
| D9 | Hit pause: 30 ms on a hit, 90 ms on a break. The source's figure is 10–20 ms; ours is longer because at 60 frames a second 16 ms is one frame and cannot be seen on a phone. | SOURCED[F12] for the trick; lengths CHOICE | *a break stops the game for an instant* |
| D10 | Shake: 2 px on a hit, 5 on a break, never more than 7; a white flash on impact. Scaled down from the source's 4–6 px for a picture 144 wide. | SOURCED[F12]; scale CHOICE | *a break kicks the picture, within the stated maximum* · *many breaks at once do not shake the picture off the screen* |
| D11 | What breaks leaves a void where it stood, and its pieces fall and stay as rubble along the bottom. | SOURCED[F9]; F13 SNIPPET | *every pixel of it becomes the void* · *what falls STAYS* · *rubble never piles past its cap* |
| D12 | Hits within 2.5 s of each other build a combo that multiplies points. The combo runs out on its own; a miss does not end it and nothing is ever taken away. | SOURCED[F8] for the combo; no penalty is from brief Q8 | *hits in quick succession build a combo* · *a combo runs out on its own; nothing is taken away* |
| D13 | «ЕЩЁ РАЗ» restarts the same yard at once: the photograph, the picture and the found things are kept, and no model is asked again. | SOURCED[F8, F9] | *«ещё раз» is a clean yard* |
| D14 | The pitch of a hit rises with the combo. | CHOICE | — |
| D15 | **Depression:** saturation × 0.12, brightness × 0.72, mixed toward cold blue-grey; the frame is still and the page stops drifting. | DERIVED[F2, F5]; numbers CHOICE | *depression: nearly colourless, darker, cold* · *depression holds it still* |
| D16 | **Alcohol:** saturation × 0.70, mixed 30% toward amber; the frame leans up to 4°, the picture sways, and a faint second copy is drawn offset. Distortion, channel separation and vignette from F6 are left out. | SOURCED[F6, F7]; selection CHOICE | *alcohol: warmer and less saturated* · *alcohol leans furthest and sees double* |
| D17 | **Weed:** the whole colour wheel turned by 0.30 and drifting ±0.06 on a 10.5 s cycle; the frame leans slowly. | DERIVED[F4]; that this reads as weed is CHOICE | *weed: the whole wheel is turned, and keeps turning* · *only weed moves the palette over time* |
| D18 | A filter may not reorder the tones: after the hue is turned, each colour is pulled back to the brightness it had. | CHOICE (a test failed without it) | *under every filter the ramps still run dark to light* |
| D19 | A filter is a look, never a rule. A tap is carried back through the same tilt, sway and shake the picture was drawn with. | CHOICE, from brief Q8 | *a tap lands on the pixel that was DRAWN under the finger* · *the same tap ends the same way under each* |
| D20 | With reduced motion requested by the device, nothing tilts and nothing shakes. | CHOICE | *with reduced motion asked for* |
| D21 | The photograph leaves the device only if a model key was entered, and the page says so before the picture is taken. | CHOICE | *with no key there is no recogniser and no request* · *a lane that cannot see is never sent the photograph* |

## Sources — pages opened on 2026-10-11

1. NESdev Wiki, "PPU palettes" — https://www.nesdev.org/wiki/PPU_palettes
2. NESdev Wiki, "Colour emphasis" — https://www.nesdev.org/wiki/Colour_emphasis
3. Wikipedia, "Color cycling" — https://en.wikipedia.org/wiki/Color_cycling
4. Wikipedia, "Gris" — https://en.wikipedia.org/wiki/Gris
5. xsoras, "I Am Not Okay" shader page, CurseForge — https://www.curseforge.com/minecraft/shaders/i-am-not-okay
6. Unreal Engine forums, "drunk effect" — https://forums.unrealengine.com/t/drunk-effect/320054
7. Wikipedia, "Hotline Miami" — https://en.wikipedia.org/wiki/Hotline_Miami
8. games.gg, "Hotline Miami" — https://games.gg/hotline-miami/
9. Marcus Estrada, "Aesthetic Excellence: Hotline Miami 2", Cliqist, 2015 — https://cliqist.com/2015/03/30/aesthetic-excellence-hotline-miami-2/
10. Tom Armitage, "Making Game 'Feel'", infovore.org, 2013 — https://infovore.org/tag/feel/

All ten were read through a summarising fetch. The quotations are as it returned them and have not been
checked against the pages by a second reading.
