# DVOR-8 v2 — what the reference games teach

| Game | Colour rule | Destruction / reward mechanic |
|---|---|---|
| Hotline Miami (2012) | Few loud colours per level; the floor is dark and flat, everything that matters is bright | Kill combo multiplier with a short window; score popups; end-of-level score; instant restart |
| Super Mario Bros. (1985) | NES palette, 3 colours + transparent per tile; interactive blocks (? / brick) differ from the flat sky and scenery | Breaking a block pops a coin and a "200"; coin counter; timer ends the level |
| Rampage (1986) | Buildings are grids of window tiles in a few colours | Damage per tile, building collapses in dust; bonuses sit in broken windows |
| Metal Slug (1996) | Muted backgrounds, saturated vehicles and pickups | Vehicles go smoking → burning → explosion → wreck; destroyed things drop crates |
| Broforce (2015) | Dark terrain, bright explosions | Everything breaks; explosions chain to neighbours; screen shake |
| Downwell (2015) | Black, white + one accent colour: the accent marks what you can touch | Kills drop gems; combo counter |
| Shovel Knight (2014) | NES discipline with a few extra colours | Dirt piles and blocks burst into bouncing gems you pick up |

## Conclusions applied

1. **Colour roles, not photo fidelity.** Background (ground, road, verges) is muted one step toward grey and darker; targets (cars, buildings) keep the full palette and the dark outline; one accent (aim pink, gold loot) is reserved for what you can act on. One fixed ramp palette for the whole game (v13 `PAL`).
2. **Destruction drops loot.** Wrecks and fallen pieces burst into coins (score) and gems (+throws), which bounce, land on the rubble, blink and vanish. A tap on loot picks it up instead of throwing.
3. **Combo.** Hits on targets within 2 s raise a multiplier (x2 … x8) shown in the HUD; a miss or a pause resets it.
4. **Chain reactions.** An exploding car damages cars and wall pieces around it; a car brought to zero catches and blows after a short fuse.
5. **A round.** A limited stack of stones; gems refill it. The round ends when stones run out and nothing is moving, with a score card and a restart.
6. **Damage states.** Car: whole → smoking → burning → explosion → burning wreck; wall piece: cracked → glass out → falls → rubble + dust (already in place).
