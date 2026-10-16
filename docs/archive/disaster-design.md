# Disasters, built out of the mechanics that already work in pixel games

The creator's verdict on the first attempt: *"completely out of style and made poorly."* Correct — what shipped
was a palette tint, a screen shake and some particles. That is a *filter*, not a disaster, and no 8-bit game ever
did it that way. This is the search for the mechanics that did, and the event built from their parts.

## What the pixel-era games actually do (each part named)

| game | year | the mechanic, as a part | what it is worth to us |
|---|---|---|---|
| **Bomberman** | 1983 | **The destruction WAVE on a grid.** A blast is not an area — it is a front that advances one cell at a time along the four axes, and each cell it reaches either resists (hard block), vanishes (soft block) or is left alone (floor). The wave has a *speed*, an *extent* and a *front you can watch coming* | this is the single most reusable part here. A disaster in this game should be **a front moving through the yard's cells**, not a whole-screen tint |
| **Rampage** | 1986 | **Damage accumulates floor by floor.** A building is a stack of tiles; each punch takes tiles off the top, the building visibly loses storeys, and it collapses when the stack is gone. The monster is unhurried | our objects already have hit points and a border; a stomp should take the thing **in pieces**, top-down or along its border, and the pieces are what is left |
| **SimCity** | 1989 | **The three-beat envelope**: a *warning* (siren + the disaster named in the news ticker), the *event* (the tornado's footprint toggles tiles to rubble as it moves; the flood raises a water line over the low ground; the monster walks a path), and the *aftermath* (rubble stays, and the player is left to rebuild) | the envelope is free and it is most of the *feel*. Our game already has a news banner and a note line — the disasters should use them as SimCity does |
| **Dig Dug** | 1982 | **Terrain carving.** The ground is a grid; the player removes cells and the *shape of the tunnels* becomes the level's content | a tsunami should not only drown objects: it should **take ground out**, leaving a different yard to play in |
| **Rampart** | 1990 | **Destruction and repair in a loop.** Cannon fire knocks holes in your walls; you rebuild between waves, and the holes are the puzzle | the aftermath beat: what a disaster tore stays torn, and the player's next run starts in the wreck — our permanence rule (D8) is already this |
| **Populous** | 1989 | **The disaster is aimed and paid for.** A disaster is a *spell* with a cursor, a cost and a visible area of effect | supports the toolbar dropdown that already exists: choosing a disaster should read as aiming one |
| **Pac-Man** | 1980 | **The bite cycle**: two-state mouth, the thing disappears into it | already used for Beyoncé's chomp |

Common to every one of them, and absent from what I shipped:

1. **A FRONT.** Something moves through the world and the damage happens *where it is*, not everywhere at once.
2. **CELLS.** The world is a grid of cells, and a cell is either intact, damaged, or gone — which is exactly our
   `idx` / `dent` / `rubble` ladder, already implemented.
3. **AN ENVELOPE.** Warning, event, aftermath — with a sound and a line of text at each beat.
4. **THE REMAINS.** The aftermath is *content*: rubble, a torn edge, a changed route — never a black hole.

## The event this game should have

**A disaster is a moving front over the yard's cells, in three beats, damaging each cell it reaches with the
game's own ladder (intact → scraped one tone → torn → void), and leaving the remains as the level.**

| beat | what happens | where it already exists |
|---|---|---|
| WARNING | the day's line in the note, a siren, the sky darkens by the grade, everything planted bends | `weather`-style grade, `note()`, `sfx.siren()` |
| IMPACT | the front advances across the yard at its own speed; every cell the front covers takes one step down the damage ladder, and things standing in it take a hit in their own border | `world.dent`, `world.rubble`, `world.wreckAlong`, `world.chip` — all written and tested |
| AFTERMATH | the front leaves, the grade lifts, the yard keeps its holes, and the score is paid for the show | `world.rubble` is never cleared (D8), `imprint()` already names what became of the yard |

Three fronts, one per disaster, all with the same skeleton:

- **HURRICANE — a vertical front sweeping sideways.** Columns take damage as the front passes, from the top of
  the frame down: the wind takes what is high first (branches, signs, wires) and the ground last. (Bomberman's
  wave, oriented like weather.)
- **TSUNAMI — a horizontal front rising, then draining.** Cells below the line drown; the drain leaves a second,
  weaker pass that scatters debris and puddles rather than deleting anything. (SimCity's flood.)
- **GODZILLA / BEYONCÉ — a moving footprint.** Each step damages the cells under the foot with `wreckAlong`, and
  the thing being stood on loses pieces in Rampage's order: top first, then the body. (Rampage.)

## What is wrong with the shipped version, in these terms

| shipped | why it fails the standard |
|---|---|
| a palette grade | it is a filter: nothing in the world changes, only the colours of the picture |
| dust particles on a random timer | no front, no cells: the damage is not *anywhere*, it is *everywhere a bit* |
| `region.gone = true` on a chomp | no remains beat: the thing is deleted, which no pixel-era disaster does |
| no warning | SimCity's siren and headline are most of the drama, and they cost nothing |
