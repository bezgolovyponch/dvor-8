# THE CONCEPT, FIXED — what this game is, and the pieces it is built from

## 1. What the game is about

**You photograph your own yard from the balcony, and then you break it.** Not a platformer, not a shooter, not a
filter: a **destruction sandbox on a real place you recognise**. The photograph is the level; what is broken stays
broken; people are never targets.

The whole identity is one sentence: **the player recognises their own yard and can destroy it.** Everything else —
palette, sky, facades, weapons — exists to serve that. If the scene stops being recognisable, the game has failed even
if the drawing is beautiful; if it is recognisable but not breakable, it is a poster.

## 2. The main mechanics, in the order the player meets them

| # | mechanic | what the player does | what answers |
|---|---|---|---|
| 1 | **the photograph becomes the level** | photographs the yard | the scene is built at 1/5 scale, one game pixel per 5x5 photo block, same positions |
| 2 | **aim** | moves the finger over the scene | the thing under the finger is outlined — pink while aiming |
| 3 | **ask** | taps the `i` button | the thing is outlined and named: what it is, how many hits it takes |
| 4 | **throw** | taps the big yellow button | the current throwable flies, arcs, lands |
| 5 | **break** | hits a thing repeatedly | a LADDER per material: glass shatters, brick chips, concrete dusts, metal dents; windows crack, darken, drop their panels, then the frame falls |
| 6 | **structural collapse** | destroys what holds something up | cells with support: what loses its support falls, and the rubble stays |
| 7 | **the verbs** | cycles the weapon | nine throwables, each a different verb: smash, break in one blow, bounce along, splash, paint, plant, clean, random |
| 8 | **the lens** | picks a view mode | трезвый / трава / алкоголь / депрессия — the same yard, seen differently |
| 9 | **the accounting** | plays | score, `РАЗБИТО n`, the danger meter, and a disaster that sweeps the yard |

## 3. The verified use cases — the mechanics are not invented here

| mechanic | the proven game | what it establishes | source |
|---|---|---|---|
| throw at a structure, materials break differently, score for it | **Angry Birds** (2009) | the core loop of this game: aim, throw, material-specific destruction, score | Rovio; the material table is the design |
| throw at stacks of blocks in a room-scale scene | **Boom Blox** (2008) | throwing at objects arranged in a real-looking space, with a score and a star rating | EA / Spielberg |
| pieces break off a thing rather than a thing vanishing | **Rampage** (1986) | damage by pieces, several hits per object | Bally Midway |
| a building collapses when its support goes | **Red Faction: Guerrilla** (2009) | structural support as the destruction model | Volition |
| destruction is PERMANENT and the world is not restored | **Teardown** (2022) | "what is broken stays broken" as a design promise, not a detail | Tuxedo Labs |
| a wall is blocks, and blocks are rebuilt | **Rampart** (1990) | cells, enclosure, repair | Atari |
| a wave that advances cell by cell | **Bomberman** (1983) | the disaster that sweeps a grid | Hudson Soft |
| warning, event, aftermath | **SimCity** (1989) | the three-beat disaster envelope | Maxis |
| **the player's own photograph becomes the game asset** | **Photo Dojo** (Nintendo DS, 2010) | the closest published precedent for "your photo is the content" | Nintendo |
| a photograph is the level, not a texture | **Pokémon Snap** (1999) | the inverse verb — the camera as the instrument | HAL |
| pixel-art construction from a fixed small palette | the NES era; [Lospec](https://lospec.com/palette-list) | palette discipline, ramps, no colour outside the table | — |

**What none of them do, and we do:** take an arbitrary phone photograph of a yard and rebuild it, at the same
positions, as a drawn 8-bit scene whose objects are individually destructible. That is the novel part, and it is why
the photograph→scene mapping (5x5, 1:1, same position) is the load-bearing rule of the whole project.

## 4. THE PIECE KIT — the draft is assembled from these, never from a monolith

Each piece is a pure function over an index buffer with its own assertion, so it can be confirmed ALONE before it is
assembled. This is the fix for the conceptual error: pieces first, pipeline second.

| piece | what it draws | confirmed by |
|---|---|---|
| `sky` | one flat blue plane + white flat-bottomed clouds, in the region the photograph says is sky | pairing (IoU) + reference palette |
| `facade` | a FLAT plane in one family's tones + a regular window grid at the pitch measured from the photograph | **its own assertion: every pixel inside is a wall tone; the grid is regular; no photographic texture** |
| `window` | the sprite: light frame, mid glass, pale sill; destroyable; never outlined | its own assertion |
| `ground` | the photograph's own pixels (road, markings, kerbs) through the palette | pairing (dark structures stay dark) |
| `thing` | a detected object: one connected mass, one silhouette outline, its own colour | clustering assertion |
| `outline` | only the aimed, picked or damaged thing; silhouette only | its own assertion |
| `damage` | the ladder per material, cells with support, remains | the destruction predicates |
| `hud` | score · осталось · РАЗБИТО n · danger · the bar ⓘ КАМЕНЬ ▴ СТИХИЯ ▴ throw | the browser snapshot |

**The rule of assembly:** the pipeline may only place pieces in the scene order ground → sky → facade → window →
thing → outline, and no pass may write a pixel another piece owns.
