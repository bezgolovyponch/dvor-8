# The prompt for Claude Design

Paste everything between the lines into Claude Design. It is self-contained: it names the target, the exact
look, the interactions, the technical constraints, the acceptance numbers, and the documentation the work is to
be verified against. It exists because this project delivered the mechanics and the pipeline but not the
**visual quality** of the reference screen (`DVOR-8 Street v6.dc.html`).

---

**Build a single-file HTML screen: a pixel-art "yard" renderer for the game DVOR-8.**

**What it must be.** One self-contained `.html` file, no build step, no framework, no external assets. A canvas
of **288×512 logical pixels**, drawn at **2× scale** (576×1024 device pixels), portrait, for a phone. All colour
comes from ONE fixed palette of **50 entries** (8 ramps × 6 tones, plus one outline colour and one void colour);
nothing may be drawn in a colour outside that table. A deterministic PRNG seeded by the date drives everything
random. The screen must run at 60 fps on a mid-range phone with no console errors.

**What it draws (the look to match).** A photograph of a city street, redrawn — never filtered — as flat pixel
art in the spirit of a 1990s arcade cabinet:

1. **Sky**: ONE flat blue plane, with **designed clouds** — symmetric puffs on a flat base, one shaded row
   along the bottom — spread evenly, never touching the skyline. The sky occupies the top ~30% and contains at
   most **8 palette entries**.
2. **Buildings**: each facade is a **built plane**, not a texture. One tone for the face, a second, darker tone
   where the surface turns away from the light. In the facade: a **window grid** of individual window sprites,
   each three parts — a dark **frame** one pixel thick, **glass** inside, and a lighter **sill** row under the
   frame — aligned in rows and columns with the photograph's own rhythm, spaced by the building's own pitch.
   Windows are the most important detail on the screen: at least **8**, typically 30-70, and each one reads as a
   window at a glance.
3. **Vegetation**: bushes and trees as **masses** of two or three greens, with a dark outline, placed where the
   photograph has them.
4. **Road**: several flat planes (the photograph's own light and dark bands, painted as distinct tones, NOT one
   fill), plus the paint on it: lane lines, arrows, crossings, cycle markings — drawn as **straight shapes**,
   never speckled.
5. **Cars and vans**: every vehicle drawn from **ONE template** in the style of *Metal Slug*'s exaggerated
   vehicles — front view as in the photograph; a **4-tone ramp** derived from that car's own paint colour; a
   **diagonal windshield glint**; an **amber running light** on each side; a **1-pixel dark outline** all round;
   the signature parts (grille, headlights) exaggerated about 1.5x so each model is recognisable at a glance.
6. **Skyline details**: distant towers as light, low-contrast blocks; overhead cables as one-pixel lines; a
   pedestrian or two as 6×10 px figures.
7. **Foreground**: the thing currently in hand (a stone, a brick, a slipper, a bottle, a paint can), drawn at
   the bottom edge, plus a flat road surface with a subtle two-tone dither.

**The interactions, exactly.**
- **Aim**: the thing under the pointer/finger is outlined in **pink (#f04f78)** — the outline is the object's own
  silhouette (the pixels where a neighbour is not part of the object), never a bounding box.
- **Info mode**: pressing the round **i** button switches to info. The thing under the pointer is outlined in
  **cyan (#30e1b9)**; a tap selects it, the selection **blinks between cyan and yellow (#f9c22b) every eighth of
  a second**, and a tooltip appears with **one true fact** about the real world (the fact must be true; pick
  from a list of documented facts about buildings, weather, materials, animals, space, sound, water, time,
  plants, cities — never repeat the same theme twice in a row).
- **Throw**: a tap outside info mode throws the thing in hand at the point tapped, with a visible arc.
- **Destruction**: a hit **scrapes the thing's pixels one tone down its own ramp**, and after enough hits tears
  a **hole along its own edges**; the remains stay on screen for the rest of the session. NO black boxes, NO
  deletion: a wrecked car is still recognisably that car, darker, with holes.
- **Disasters** (a dropdown, four of them, each with a three-beat envelope — siren, impact, calm):
  **hurricane** — a logarithmic spiral (bands of `sin(θ·2 − log(r+1)·4)`, radius 2.5 to 13) crossing the skyline
  while a vertical front sweeps the yard and tears it; **tsunami** — a wave profile
  (`y = 22 − 13·exp(−((x−12)/7)²)`, four bands white → foam → mid → deep, plus a foam arc) rising over the lower
  half, with water that **shows the street through it** (mix, never replace); **Godzilla** — a kaiju silhouette
  walking the skyline, each step breaking what is beneath it; **a huge Beyoncé head** — front view, eyes and a
  mouth with a two-frame bite that eats cars, then shakes her head twice.
- **A self-test panel**: ten named checks that run on load and print PASS/FAIL with a rerun button, e.g.
  "one renderer", "windows ≥ 8", "sky ≤ 8 entries", "no box outlines", "damage leaves remains", "no console
  errors", "palette only", "flat surfaces ≥ 55%", "transitions ≤ 0.34/px", "fact themes do not repeat".

**Acceptance numbers (measure them on the canvas, not on a screenshot).**
| measure | required |
|---|---|
| pixels identical to their right and lower neighbour | ≥ 55% |
| colour changes per pixel along a row | ≤ 0.34 |
| distinct palette entries in the sky (top fifth) | ≤ 8 |
| window sprites | ≥ 8 (typically 30-70) |
| largest single colour below the sky | ≤ 32% |
| console errors | 0 |

**Documentation to verify against** (use these, do not guess):
- Canvas API and `getImageData`: MDN — https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- The 1-px outline rule (dilation minus the shape): OpenCV morphology —
  https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html
- Marching squares and boundary tracing (for object silhouettes):
  https://en.wikipedia.org/wiki/Marching_squares · https://en.wikipedia.org/wiki/Boundary_tracing
- Ramer–Douglas–Peucker (simplifying a traced border):
  https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
- Pixel-art palettes: https://lospec.com/palette-list
- The mechanics' origins: Bomberman 1983 (a destruction WAVE advancing cell by cell),
  SimCity 1989 (the three-beat disaster envelope), Rampage 1986 (damage by pieces),
  Pac-Man 1980 (the bite cycle), Metal Slug 1996 (exaggerated vehicle sprites) —
  https://en.wikipedia.org/wiki/Bomberman_(video_game) · https://en.wikipedia.org/wiki/SimCity_(1989_video_game)
  · https://en.wikipedia.org/wiki/Rampage_(video_game) · https://en.wikipedia.org/wiki/Pac-Man
  · https://en.wikipedia.org/wiki/Metal_Slug_(video_game)

**What NOT to do** (each of these was done in this project and rejected): no per-pixel photo posterisation as
the main look; no dithering as a substitute for structure; no bounding boxes as highlights; no black rectangles
as damage; no disaster drawn as a sprite sliding across an untouched photograph; no colour outside the 50-entry
table; no claim of a result without a measured number.

---
