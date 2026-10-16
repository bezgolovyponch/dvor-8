# THE WHOLE — concept, mechanics, numbers, design, gates. Generated from the code.

Every number below is READ OUT OF THE SOURCE at the moment this file is written (`tools/` script in the commit), so
the document cannot drift away from the build. If a number here is wrong, the code is wrong.

## The concept, in one paragraph

A phone photograph of a yard becomes a playable level. The photograph is a source of **facts, not of pixels**: the
road, the ground, the people and the cars keep their own layout, while the sky, the buildings and the windows are
**drawn** in a fixed 50-entry palette. What is broken stays broken. People are never targets.

## The mechanics, and the number that defines each

| mechanic | number | where it lives |
|---|---|---|
| the photograph's own layer | **5×5 area mean per game pixel** (BLOCK = 5) | `src/criteria/RoadRule.js` |
| the palette | **6 tones × 8 ramps** = 50 entries + outline + void | `src/flat.js` |
| damage | a **6-step ladder** (scrape → tear → void) with per-material profiles (glass, brick, concrete, metal, wood) | `src/criteria/DestructionRule.js` |
| structures | cell grids with **support cascade**: a cell with nothing under it falls | `src/world.js` |
| things | **one connected mass** per thing; outlines from the owner map, so the line follows the shape after damage | `src/objects.js`, `src/render.js` |
| targets | **9 detector labels** + windows; **buildings are structural** (COCO has no building class) | `src/objects.js`, `src/main.js` |
| weapons | **0 throwables**, one baseline and the rest departures | `src/throwables.js` |
| modes | **0 view modes** (трезвый, трава, алкоголь, депрессия) | `src/modes.js` |
| the outline rule | outlined: **buildings and cars**. Never: windows, people | `src/criteria/OutlineRule.js` |

## The numbers, measured on six real photographs

| photograph | tones used | the designed sky |
|---|---|---|
| `5` | 46 | 30% |
| `a` | 28 | 21% |
| `b` | 35 | 18% |
| `yard2` | 24 | 38% |
| `web1` | 38 | 16% |
| `web2` | 25 | 24% |

Thresholds that the gates enforce, all measured rather than assumed: a frame must use **≥ 12 tones**; the largest
**non-sky** entry must own **≤ 35%** (a clear sky is legitimately large and is exempt); the page must build **≥ 1**
target with a clean console; every used name must be imported; the preamble must carry all **10** load-bearing
statements.

## The design, as a performer would state it

Silhouette first (a thing reads as one mass with a 1-px outline) · one reserved hue for interactivity (idle things
carry no outline; the aimed thing is pink, the picked one blinks) · the facade's own column and floor pitch for the
windows · the photograph's ground kept pixel-for-pixel, because the player must recognise their own yard · destruction
that leaves remains.

## The gates, and the proof they bite

```
0  PREFLIGHT   0 criteria rows · 10 composition elements · 19 parts · 10 statements
0b IMPORTS     every used name imported; every import real          mutation: deleted import -> exit 1
1  CRITERIA    every criterion has a predicate (a criterion without one counts as NOT MET)
2  COMPOSITION element -> requirement -> class -> baseline -> predicate
3  SUITE       behaviour in Node
4  DELIVERY    the mandatory lines
6  PAGE        a yard built from a real photograph, console clean   mutation: empty build -> left 0
6b TONES       a drawing, not a wash; the sky exempt                mutation: synthetic wash -> exit 1
```
