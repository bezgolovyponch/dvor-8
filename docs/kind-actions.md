# Kind actions

The three things you can do to a yard that are not wrecking it. `src/kind.js`.

## Why the module exists

Every throwable in this game subtracts. A stone dents, a brick wrecks, a bottle bursts, a slipper knocks two
things over on its way. That is the joke, and a joke told for ten minutes wants a second voice — a reason to
look at the yard rather than only a reason to break it. These three actions are that voice, and they are all
aimed with the same hand and the same tap as everything else: nothing new to learn.

They are the only things in the game that leave the picture better than they found it:

| | what it is | what it adds | what it costs |
|---|---|---|---|
| **flowers** | a bunch thrown at bare ground | a flower that grows in three stages, sways, and is still there when the run ends | one throw, 30 points |
| **sponge** | a sponge thrown at something standing | one tone up the thing's own ramp, foam, and a shine: the only thing in the game that gets LIGHTER | one throw, 45 points, once per thing |
| **help** | a tap on the parcel the courier dropped | the box goes back, the courier nods, and the danger meter loses a mark | nothing — it is a tap, not a throw |
| **whimsy** | a throw of pure absurdity at a real thing | one action chosen at random from a table keyed by the thing's own kind: eat the car, sit on the bench, water the plant pot | one throw, 60 points |

## The rules a kind action is held to

These are the game's own rules, not new ones (`docs/concept.md`, brief Q8, D27):

- **Nothing is harmed.** `flowers` and `sponge` carry `damage: 0`; the parcel is not a target and cannot be
  broken. A kind action never breaks a thing and never lowers the score.
- **A miss costs nothing.** Flowers on the sky, a sponge on nothing: a puff, a low note, no combo lost.
- **It must feel different on the first use.** Flowers stay; a wash makes a thing lighter; the parcel is the
  only action that lowers the danger meter. A fourth action that only changed a colour would be a decoration.
- **It uses the picture, not a new layer.** A flower is drawn from the palette's own ramps (foliage for the
  stem, warm or dusk for the petals) and a wash moves an index up its own ramp, so a red car is a lighter red
  car and not a different colour. Nothing in `kind.js` knows the palette: it is handed the table and the step
  count and it picks indices by ramp.

## Whimsy: the second verb

The yard is made of real things found in the player's own photograph, and the game's only verb used to be
throwing something at them. Whimsy is the second verb: one throw does something absurd and specific to whatever
it lands on. The table is keyed by the labels `src/objects.js` finds (`car`, `truck`, `bus`, `bicycle`,
`motorcycle`, `bench`, `chair`, `potted plant`, `boat`, `window`), so the joke is always about a REAL thing in
the player's photograph, and a thing nobody named is not a candidate — the game never invents a thing to be
absurd at. The throw lands exactly where it is aimed: the randomness is in what it DOES, not in where it goes
(the bottle is the one that strays, D17).

## What the yard became

A run is not only a score. `imprint()` in `src/world.js` counts what the player did — flowers planted, paint
thrown, things washed, absurdities performed, holes torn — and decides which of those the run was ABOUT. The
end card's title and the card that is sent say it: `ДВОР: ЦВЕТЫ`, `ДВОР: КРАСКА`, `ДВОР: РАЗВАЛИНЫ`,
`ДВОР: ЧИСТОТА`, or `ХВАТИТ` when the yard was left as it was found. Ruins win only when there is more ruin
than decoration: a yard with twelve flowers and one broken crate is a yard in flowers, and the title says so.

## What each one looks like

**Flowers.** A bloom is a place, a stage and a seed. Stage 1 is a sprout, 2 adds a stem and two leaves, 3 adds a
head of three petals; each stage takes half a second. The head leans `sin(seconds · 1.6 + seed)` — a still
flower on a still picture reads as a sticker, a swaying one reads as a plant. Planting throws off eight pieces
of green and gold, and pops `+30 ЦВЕТОК`. Blooms are permanent: they survive a wreck, a wash and a restart of
the yard, and they are drawn on the card you send.

**Washing.** A sponge burst of fourteen pieces of foam, white and pale cyan, plus a settling splat; the thing's
pixels each move one tone up their own ramp, which is visible as "clean" because the palette's tones are a
ramp of one colour getting lighter; a `+45 ЧИСТО` pop and a crack-weight impact so it feels like work. Once per
thing: the point is the change, not the farming. A second wash answers `УЖЕ ЧИСТО`.

**Helping.** The courier drops a parcel when they come in — a six-by-five box in the earth ramp with a sand
tape cross — and it lies there until a finger finds it. Tapping it (no throw) returns it: fourteen pieces of
pink, green and cream, the courier's `СПАСИБО`, `+120`, and `−1 ОПАСНОСТЬ` as the meter loses a mark. This is
the only action in the game aimed at a person that is not aimed *at* them, and the only one that lowers danger.

## What is measured

`node test.mjs` holds twelve checks for this module: a flower is planted on bare ground and refused where the
ground does not take it; it grows through its stages and stops; it is drawn from two different ramps of the
palette; a wash moves every pixel one tone up its own ramp and changes no hue; a second wash is refused; a
parcel is findable by a finger; carrying it back scores, lowers danger, and cannot be done twice; both new
throwables deal no damage and are in the drawer; the parcel is drawn as a box with tape. All of it in the
palette's own colours, asserted by index.
