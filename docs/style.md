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

| F14 | Small objects "are represented by small number of pixels in the image and lack sufficient details, making them difficult to detect"; slicing the image and detecting per slice raised average precision by 5.1–6.8 points for three detectors without retraining. | SOURCED[11] |
| F15 | In a study of four versions of one action RPG — no, medium, high and extreme juiciness — "both Medium Juiciness and High Juiciness outperform No Juiciness and Extreme Juiciness across all measures" (Kao, *Entertainment Computing* 34, 2020). | SNIPPET (search result; the paper was not opened) |
| F16 | MediaPipe's ObjectDetector runs in the browser from a `.tflite` model; `detect()` calls "run synchronously and block the user interface thread". | SOURCED[12] |

| F17 | Texture synthesis by patches works by "copying and stitching together textures at various offsets"; plain tiling "is rarely satisfactory … there will be the seams in between the tiles and the image will be highly repetitive." | SOURCED[13] |
| F18 | The belt-scroll format gives "both vertical and horizontal movement along a side-scrolling environment"; it was introduced by *Nekketsu Kōha Kunio-kun* (1986). | SOURCED[14] |
| F19 | Wordle's emoji result was made by players first and then built in; after the share function was added the game "became a viral phenomenon"; one puzzle a day "creates a sense of scarcity, leaving players wanting more". | SOURCED[15] |
| F20 | People feel "an urge to complete tasks previously initiated". The stronger claim, that unfinished tasks are remembered better, "lacks universal validity" (2025 meta-analysis). | SOURCED[16] |

**Not found:** a source for how games show cannabis, or depression as distinct from grief. The weed mode is
built from F4 and is a `CHOICE`; the depression mode leans on F5, which is about grief.

## Decisions

Rewritten 2026-10-11 for the third build. What changed from the second, and why, is in `docs/concept.md`.

| # | Decision | Tag | Held by test |
|---|---|---|---|
| D1 | The yard is stored as palette indices and looked up through a table each frame. A filter's look is another table. | DERIVED[F1, F3] | *sober shows the yard's own table* |
| D2 | **The table is made from the photograph**: its 28 best colours by median cut, after a grade — contrast stretched to the photo's own range, saturation × 1.45, shadows pulled toward purple, lights toward warm white. The second build mapped brightness onto two fixed neon ramps, which turned every yard into the same heat-map. | CHOICE; "high-contrast" from F8, F9 | *a red car is red* · *a blue car is blue* · *a green tree is green* · *deep shadows and bright lights, shadows toward purple* |
| D3 | The picture is 192 × 256 pixels, about an 8-bit console's screen, with ordered dithering so plain surfaces keep texture. | DERIVED[F9]; size CHOICE | *the size of an 8-bit console screen* · *most of the palette is in use* |
| D4 | **Targets are real things found by an object detector on the device** (EfficientDet-Lite0 through MediaPipe, vendored). Nothing is uploaded. What the detector cannot name is not a target; the game invents nothing to hit. | SOURCED[F16]; the choice of model is CHOICE | `tools/check.mjs` on real photographs · *every found thing becomes a target with a name* |
| D5 | The photograph is searched whole and in 13 overlapping slices, because a car from a balcony is too small to survive shrinking the whole photo to the model's input. | SOURCED[F14] | *searched whole and in overlapping slices* · *one car seen in two slices is one car* |
| D6 | People and animals are never targets and never named. | CHOICE, from the brief's "not violent" | *people and animals are never targets* |
| D7 | A target's pixels are those in its box whose colour is unlike the ring just outside the box; if that fails, a rounded box. Each target gets a dark outline. | CHOICE | *a target's pixels are the thing, not the asphalt* · *a dark line round it, like a sprite* |
| D8 | A wrecked thing stays where it was, dark and broken, and its pieces come to rest at its own foot. | SOURCED[F9]; F13 SNIPPET | *what is left is dark, but still where the car was* · *what falls STAYS, at the foot of the thing* |
| D9 | The frame tilts about 1° all the time; scanlines; hard pink and cyan offset shadows; nothing rounded. | F10 SNIPPET, F11; details CHOICE | *the frame always leans a little* |
| D10 | A tap is answered in the same frame. Hit pause 30 ms, wreck pause 90 ms; shake 2 and 5 px, never over 7; a flash. The source gives 10–20 ms and 4–6 px for a different game; ours are set for one visible frame on a phone and a picture 192 wide. | SOURCED[F12]; amounts CHOICE | *a tap is answered in the same frame* · *a wreck stops the game for an instant* · *within the stated maximum* |
| D11 | The amounts in D10 are kept moderate on purpose and capped. | F15 SNIPPET | *many wrecks at once do not shake the picture off the screen* |
| D12 | Hits in quick succession build a combo that multiplies points; it runs out on its own; a miss costs nothing. A best score is kept on the device. | SOURCED[F8]; no penalty from brief Q8 | *hits in quick succession build a combo* · *nothing in any mode takes anything away* |
| D13 | «ЕЩЁ РАЗ» restarts the same yard at once, without searching the photograph again. | SOURCED[F8, F9] | *«ещё раз» is a clean yard* |
| D14 | **Every filter is a way to play, not only a look.** Each changes what is in the hand and what can be seen clearly. This reverses the second build's "a filter is a look, never a rule", which was reported as "the filters don't change anything". | CHOICE, at the creator's direction | *every mode but sober changes BOTH the throw and the focus* · *no two modes put the same thing in the hand* |
| D15 | **Sober — a stone.** Lands where aimed, 110 ms, everything sharp. | CHOICE | *sober: the throw lands exactly where it was aimed* |
| D16 | **Weed — a slipper.** Flies slowly, then skips to up to two more things; a combo lasts 5 s; the edges of the yard go soft; colours richer and drifting. | look DERIVED[F4]; play CHOICE | *the slipper skips on* · *a combo forgives a pause twice as long* · *the colours keep drifting* |
| D17 | **Alcohol — a bottle.** Bursts over everything within 22 px, but lands up to 10 px from where it was aimed; nothing is in focus; warm, leaning, double vision. | look SOURCED[F6, F7]; play CHOICE | *a bottle bursts over everything near* · *the hand strays, never further than the stated scatter* |
| D18 | **Depression — a brick.** Wrecks anything in one throw, 0.7 s before the next; only a small circle round the finger is visible, the rest is dark, so things have to be looked for; drag to look, tap to throw; grey, cold, still. | look DERIVED[F2, F5]; play CHOICE | *a brick wrecks a car in one throw* · *the hand is not free again at once* · *only what is near where you look can be seen* |
| D19 | No look reorders light and dark. | CHOICE (a test failed without it) | *the yard stays readable through all of them* |
| D20 | A tap is carried back through the same tilt, sway and shake the picture was drawn with. Alcohol's scatter is applied after that, on purpose. | CHOICE | *a tap lands on the pixel that was DRAWN under the finger* |
| D21 | With reduced motion requested by the device, nothing tilts and nothing shakes. | CHOICE | *with reduced motion asked for* |

| D22 | **Going down.** The same picture, 1.6× closer, following a walker who moves in two directions over it; a jump is a height off the picture with the shadow left on the ground. Standing things are solid at their own pixels. | SOURCED[F18]; zoom, speed and jump height CHOICE | *the stick moves the walker* · *a standing thing is solid* · *a jump leaves the ground in the same frame* · *the view is closer and follows* |
| D23 | **Landing on a thing is a hit**, by the same rules as a throw, and throws the walker up again. | CHOICE | *to land ON a thing is to stomp it* · *a stomp is a hit like any other* |
| D24 | **The street beyond the photograph is made only from the photograph**: 16-pixel strips of the picture with its things taken out, each chosen among the five that best continue the last column; things are copies of ones the detector really found. | SOURCED[F17]; strip width and the five CHOICE | *a made yard invents no ground* · *invents no things* · *chosen to continue the edge it joins* |
| D25 | A photograph the player adds becomes the exact next yard and **keeps its own 28 colours**: the table grows by a block per photograph, to nine. | DERIVED[D1, D2] | *an added photograph keeps its OWN colours* · *a street has an end* |
| D26 | **The bottle can be drunk.** Four swigs, 0.7 s each with the hand busy; each adds a quarter to «градус», which scales the burst (13–31 px), the stray (4–16 px), the lean and the double image, and wears off in about 20 s a swig. An empty bottle gives nothing until thrown. | look DERIVED[F6, F7]; numbers CHOICE | the whole *bottle* section |
| D27 | **What is kept only grows**: kinds wrecked, days visited, best score, furthest walked. No streak, because a streak that resets is a loss. | SOURCED[F20] for the pull of the unfinished; no-loss from brief Q8 | *a worse run takes nothing away* · *days are never lost* |
| D28 | **The made street is built from the date.** | SOURCED[F19], with the difference that players do not share a yard | *tomorrow's street is not today's* · *the same day's number makes the same street* |
| D29 | **The line to show someone** is a row of what the yard held, thing by thing, wrecked or standing; it carries no picture and no place. The picture, when asked for, is the game's 192-pixel picture, never the photograph. | SOURCED[F19]; privacy from `feasibility.md` §4.4 | *the line … says nothing about where it is* |

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

11. Akyon, Altinuc, Temizel, "Slicing Aided Hyper Inference and Fine-tuning for Small Object Detection" — https://arxiv.org/abs/2202.06934
12. Google, "Object detection guide for Web", MediaPipe — https://developers.google.com/edge/mediapipe/solutions/vision/object_detector/web_js

13. Wikipedia, "Texture synthesis" — https://en.wikipedia.org/wiki/Texture_synthesis
14. Wikipedia, "Beat 'em up" — https://en.wikipedia.org/wiki/Beat_%27em_up
15. Wikipedia, "Wordle" — https://en.wikipedia.org/wiki/Wordle
16. Wikipedia, "Zeigarnik effect" — https://en.wikipedia.org/wiki/Zeigarnik_effect

All sixteen were read through a summarising fetch. The quotations are as it returned them and have not been
checked against the pages by a second reading.
