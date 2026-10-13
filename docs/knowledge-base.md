# The knowledge base

Every mechanic this game needs, with a **real link** that can be opened, and the **path that already worked**
recorded so it is used again instead of being searched for twice. Rule: when a working reference exists, its
path is the PRIORITY and any other method is secondary until it beats the reference on the screen.

Links marked `USED` have been opened and used in this project. `KNOWN` are established, widely-used resources
that have not yet been opened here: check before relying on them.

## 1. The path that already worked — v6, the creator's own screen

`~/Documents/DVOR-8 Street v6.dc.html` produced the result the creator accepts, and this is the exact path it
used. **This is the priority method for anything in the list below.**

| step | what v6 does | the general rule |
|---|---|---|
| 1 | draws each thing into a small **grid** (16–40 px) with its own palette | every object is a sprite in a grid, never a texture |
| 2 | builds a **fills** map (the pixels of the thing) and an **edges** map (its outline) | the outline is computed from the silhhouette, not stored |
| 3 | `outline(g)`: a filled pixel with an empty neighbour becomes one pixel of ink `#2e222f` | this is **morphological dilation minus the shape** — the standard 1-px outline ([OpenCV morphology](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html), `USED`) |
| 4 | highlight states: pink when aiming, cyan in info mode, the selected one **blinks yellow** | interaction is shown on the EDGES map: one array, three colours |
| 5 | a tap selects, and the fact panel shows a **categorised true fact** | the tooltip is part of the object's own data |
| 6 | disasters are 32×32 grids built from maths (a spiral, a wave) and finished with the same `outline()` | an event is a sprite with an outline, not a tint over the screen |

**Where v6 is in this repo now:** the spiral and the wave are ported (`src/disaster.js`, `eventSprite`), with v6's
outline rule. Still to port, in this order: the **edges map per object**, the **highlight states**, and the
**car template** (4-tone ramp from the paint colour, diagonal windshield glint, amber running light, 1-px outline
— v6 cites *Metal Slug* for it).

## 2. Destruction, shattering and rubble

| link | what it gives | class |
|---|---|---|
| [OpenCV: morphological operations](https://docs.opencv.org/4.x/d9/d61/tutorial_py_morphology.html) | dilation/erosion — the outline rule, and the correct way to thicken or break a silhouette | `USED` |
| [Marching squares](https://en.wikipedia.org/wiki/Marching_squares) | turning a mask into contours; the basis of region borders | `USED` (conceptually, in `world.borderOf`) |
| [Boundary tracing](https://en.wikipedia.org/wiki/Boundary_tracing) | Moore-neighbour tracing, used in `borderOf` and `vector.js` | `USED` |
| [Ramer–Douglas–Peucker](https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm) | simplifying a traced border into straight runs | `USED` |
| [Red Blob Games](https://www.redblobgames.com/) | the reference for grids, fields and cellular rules — for a destruction wave over cells | `KNOWN` |
| [Cellular automata cave generation](https://gamedevelopment.tutsplus.com/series/cave-generation-using-cellular-automata--gamedev-7382) | cell rules that produce ruins and rubble rather than noise | `KNOWN` |
| [js13kGames](https://js13kgames.com/) · [sources](https://github.com/js13kgames) | hundreds of complete tiny games with readable source — the best place to find a working 8-bit mechanic | `KNOWN` |

## 3. Pixel art, palettes and animation

| link | what it gives | class |
|---|---|---|
| [Lospec palette list](https://lospec.com/palette-list) | thousands of curated pixel palettes with exact hex values | `KNOWN` |
| [Lospec: dithering](https://lospec.com/pixel-art-tutorials) | the tutorials this project's dither rules follow | `KNOWN` |
| [Kenney assets](https://kenney.nl/assets) | CC0 sprite sets, including destruction and explosion frames | `KNOWN` |
| [OpenGameArt](https://opengameart.org/) | CC0/CC-BY sprites, tilesets, effect sheets | `KNOWN` |
| [itch.io pixel assets](https://itch.io/game-assets/free/tag-pixel-art) | free packs, often with animation sheets | `KNOWN` |
| [PICO-8](https://www.lexaloffle.com/pico-8.php) · [BBS carts](https://www.lexaloffle.com/bbs/?cat=7) | complete tiny games whose **source is readable in the cart** | `KNOWN` |
| [8bitworkshop](https://8bitworkshop.com/) | an in-browser IDE for real 8-bit platforms, with example ROMs | `KNOWN` |
| [NESdev wiki](https://www.nesdev.org/wiki/) | how the hardware actually drew sprites, palettes and scrolling | `KNOWN` |
| [The Book of Shaders](https://thebookofshaders.com/) | procedural patterns, useful for wind, water and fire | `KNOWN` |

## 4. The mechanics, cited by the games that invented them

| mechanic | source |
|---|---|
| destruction **wave** over cells | [Bomberman (1983)](https://en.wikipedia.org/wiki/Bomberman_(video_game)) |
| **three-beat** disaster envelope (warning, event, aftermath) | [SimCity (1989)](https://en.wikipedia.org/wiki/SimCity_(1989_video_game)) |
| kaiju **damage by pieces** | [Rampage (1986)](https://en.wikipedia.org/wiki/Rampage_(video_game)) |
| the **bite cycle** | [Pac-Man (1980)](https://en.wikipedia.org/wiki/Pac-Man) |
| exaggerated vehicle sprites, 4-tone ramp + glint | [Metal Slug (1996)](https://en.wikipedia.org/wiki/Metal_Slug_(video_game)) |
| terrain **carving**, and living with the holes | [Dig Dug (1982)](https://en.wikipedia.org/wiki/Dig_Dug) · [Rampart (1990)](https://en.wikipedia.org/wiki/Rampart_(1990_video_game)) |
| disasters as **aimed spells** with a cost | [Populous (1989)](https://en.wikipedia.org/wiki/Populous_(video_game)) |

## 5. The rule this file exists for

> **A working reference beats a new idea.** When a reference produces the result the creator accepts, take its
> path, name it in the code, and use it for the next piece. Search this file before searching the web. Add to it
> every time a path works — with the link, what it gave, and which file here used it.
