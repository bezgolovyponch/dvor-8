# Level design (requirement 3)

The progression is the PHOTOGRAPHS, not a set of hand-built stages. Every level is a real place the player has
photographed, and the same yard grows: the first photograph is the level, the next ones extend the street. Nothing
is generated, so nothing has to be balanced against invented content - what has to be balanced is the DIFFICULTY OF
WHAT IS ALREADY THERE, which is why the numbers below are counted from the photograph and not authored.

## The ladder

| level | the place | what it asks | what it teaches | evidence class |
|---|---|---|---|---|
| **1** | one yard, from the balcony | hit three things | aim, throw, that damage STAYS | MEASURED: the yard's own target count (`left`, 51 on the Prague photograph) |
| **2** | the same yard, walked into | hit one thing while a person is in frame | people are never targets | MEASURED: `strike()` refuses a person; the suite asserts it |
| **3** | the same yard, after a hit | break a WINDOW and see the glass | thing → pane → shards | MEASURED: `cellsOf` reports window cells; glass particles spawn |
| **4** | the same yard, a taller wall | take a building down one storey at a time | a chunk with no support falls | MEASURED: `breakCells` cascade, 12 cells in 2 columns |
| **5** | the same yard, in weather | the same targets through rain, snow, fog, storm | the palette is the weather | MEASURED: weather is a palette-table transform, gate rows hold |
| **6** | the same yard, a disaster | survive the siren, the impact and the calm | an event happens TO a world | MEASURED: the three-beat envelope, the front tears cells |
| **7** | the street: photograph 2 | the targets are the ones the new photograph has | the level is the place you live | MEASURED: `addPhoto` → `detectAll` → a new yard, merged into the street |
| **8** | the street, N photographs | nothing is ever restored | permanence (D8): `world.rubble` is never cleared | MEASURED: the suite asserts rubbish persists across ticks |

## The rule that shapes every level

**The yard is the level.** There is no authored geometry to walk through: the difficulty comes from what the
photograph contains - how many things, how far away, how high the windows are, whether a person is in frame. That
is why no level can be tuned by hand: tuning happens in the WORLD (weather, disaster, what is in hand), never by
moving the place around.

## What unlocks what (the same dependency discipline as `docs/PLAN.md`)

- Levels 1–2 need only the yard and the throw (built).
- Level 3 needs window sprites **and** the damage language (built, 803 window sprites on the Prague photograph).
- Level 4 needs the cell model **and** support (built).
- Levels 5–6 need the palette-table weather and the three-beat envelope (built).
- Levels 7–8 need detection on a second photograph (built) and permanence (built).
