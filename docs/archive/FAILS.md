# The fail log — every failure, its cause, and the restriction that stops it returning

The creator's demand: *write down all the fails and errors and their causes into the mandatory baseline, and
create the restriction that will not allow you to go in circles.* This is that file. It is read by
`tools/baseline-check.mjs`.

## The circles

| # | the failure, as seen on screen | its cause, found | the fix that closed it | restriction |
|---|---|---|---|---|
| F1 | a dark blue monochrome frame | the photographic pipeline's tone ladder was built for a camera image and collapsed the yard into one ramp | surfaces are BUILT from planes; the gate measures flatness and dominance | **R3, R10** |
| F2 | black rounded rectangles where cars are | `stepDisaster`/`region.gone` wrote the VOID index over whole things | the destruction model: scrape one tone, a small hole, remains kept | **R4** |
| F3 | a rectangle round a car instead of an outline | the *region's pixels were a box* - the renderer was tracing faithfully | the adaptive cut-out in `objects.js`, no box fallback | **R1** |
| F4 | a slab of raw photograph across the top | the scan wipe drew the camera image above the line | the wipe draws the same built yard at one brightness | **R5** |
| F5 | measurements that changed with nothing changed | the gate read transient overlays and grades | `?clean=1`, and the gate reads the CANVAS dump | **R6** |
| F6 | "fixed" while nothing on screen changed | a patch script died before writing the file, and the measurement was read anyway | the script asserts its anchor and prints a confirmation | **R8** |
| F7 | a hurricane that was a sign moving across a picture | the event was an overlay on a photograph: nothing to happen TO | the built world first, then the front that tears it | **R2** |
| F8 | a black rectangle over a building | the object fundamentals pass treated a LARGE low-contrast region (a wall) as a car: it cut it out and painted its "glass" | only things below a size are cut out and templated (this commit) | **R11** |
| F9 | crosshatched outlines over whole buildings | `edgesOf` on a big noisy region returns thousands of scattered edge pixels, and every one was drawn | outlines are drawn for things, not for planes (this commit) | **R12** |
| F10 | the same failure returning a fourth time | each fix was applied to the wrong layer, patched, and reported as a fix | the dependency chain below, and the loop rule | **R13** |

| F11 | a **black block with speckles** over a building | the facade-rhythm window finder returned a rectangle the size of a building, and a window sprite is a dark frame round dark glass - at building size that is a slab | a window is clamped: under 15% of the frame in either direction and under 4% of its area; anything larger is a plane, and planes are painted by the facade pass | **R16** |

| F12 | **a MEASUREMENT ARTEFACT reported as a property of the picture** - three times in one session | the instrument measured something other than the thing named: (a) the canvas dump sampled every SECOND pixel, so a 1-px stray was invisible and the stray share read 10.7% where the truth is 2.3%; (b) the pitch finder started at 2, so a 1:1 frame was reduced by half and every number described half the drawing; (c) the sky band was a fixed top slice that contained two towers, so the sky "failed" a bar it met | **`tools/concept-check.mjs` now prints its own PREMISES and WITHHOLDS ITS VERDICT when one is violated** (1:1 dump, the named band, a whole frame); `tools/compare-ref.mjs` prints the pitch it chose. The precaution is enforced, not noted. | **R17** |

## The restriction that stops the circles

> **R13 — NO FIX IS REPORTED WITHOUT ITS PICTURE AND ITS NUMBER, AND NO FIX IS ATTEMPTED BEFORE ITS CAUSE IS
> NAMED IN THIS FILE.** If a fault returns, it is because the cause was wrong: the entry above is corrected
> BEFORE the fix is written again. Three attempts at the same fault with the same cause is a stop-and-replan, not
> a fourth attempt.

## The dependency chain and the resolution research sequence (from v6)

Taken from the creator's own working screen, in the order that screen builds them:

| step | what v6 does | where it is in this project |
|---|---|---|
| 1 | **the world is constructed**: sky plane, building faces with WINDOW GRIDS (frame, glass, sill), road planes with markings, bushes as masses | `src/vector.js` stages 5a-5e — **built** |
| 2 | **things are cut out and templated**: one car template - 4-tone ramp from its paint, windshield glint, running light, 1-px outline | `src/vector.js` stage 5d — **built** |
| 3 | **interaction is drawn from the EDGES map**: aim in pink, info in cyan, the selection blinking yellow, a tooltip with a true fact | `src/main.js` + `src/render.js` — **built** |
| 4 | **destruction follows the silhouette**: scrape one tone, tear along the edges, keep the remains | `src/world.js` `wreckAlong`/`edgesOf` — **built** |
| 5 | **events act on that world**: spiral and wave sprites with the 1-px outline, a three-beat envelope, a front that tears cells, structures and things | `src/disaster.js` + `src/main.js` — **built** |
| 6 | **the look is verified by numbers on a clean frame**, never by a screenshot of a phone | `tools/concept-check.mjs` on `canvas.json` — **built** |

**The rule that follows from the chain, and the one this project kept breaking:** a step is only begun when the
step above it is GREEN on the gate. Building an event (5) on a world that is not built (1) is what produced a
hurricane that was a sign moving, and it will not be repeated.
