# THE PAIRING — input, output, and the mapping between them

## The pair this project is judged on

| | file | what it is |
|---|---|---|
| **INPUT** | `photos-test/v10a.jpg` (`2026-10-13 15.20.34.jpg`, 1440×2560) | the creator's photograph: a Prague street seen from a balcony — a dark tower filling the left, a checkered mid-rise at the centre, a white BMW and a dark estate on the road, the cycle-lane symbol painted on the asphalt, tram wires across the sky |
| **EXPECTED OUTPUT** | `reference/v10a-target.webp` → `docs/shots/target-v10a.webp`, cropped canvas in `reference/v10a-art-canvas.png` | the accepted frame of the same street: `10a УЛИЦА · Прага · 288×512 · PX = 2` |

## The mapping, verified by arithmetic — not by eye

```
INPUT  photo   1440 × 2560   aspect 0.56250
OUTPUT canvas   288 ×  512   aspect 0.56250
ratio           5.00 × 5.00
```

**One game pixel per 5×5 photo block, at the same position, no crop and no letterbox.** `BLOCK = 5` is therefore not
a style choice: it is the photograph's own geometry, and it is why every element of the accepted frame sits exactly
where its counterpart sits in the photograph, at 1/5 scale.

## What is REPLACED and what is KEPT — read off the accepted frame

| element | in the photograph | in the accepted frame |
|---|---|---|
| road, kerbs, markings, the cycle-lane symbol | real pixels | **kept** — the same shapes, posterised into the palette |
| car bodies (white BMW, dark estate) | real pixels | **kept** — same positions, same light/dark relation, one thin dark outline |
| people on the left pavement | real pixels | **kept** as small dark shapes |
| sky | overcast, mottled grey-blue | **replaced** — one flat blue plane, large white cloud masses |
| the tower | dark grid of windows and mullions | **replaced** — a smooth blue-grey plane with a regular fine window grid, floor by floor, in the same silhouette |
| the checkered mid-rise | a façade of alternating dark/light tiles | **replaced** — a clean checkerboard of light tiles on the same silhouette |
| tram wires | thin dark lines | **kept** as 1-px dark lines |
| windows | openings | **drawn sprites** (frame · glass · sill), destroyable, never outlined |

## The rule this pair imposes, in one sentence

**The photograph supplies the FACTS — where things are, what shape they are, which are light and which are dark.
Everything the palette draws on top of that (sky, façades, windows) must sit at exactly those positions, at 1/5 scale.**

## How the comparison may be made

- **positionally, feature by feature** (this file): the tower's silhouette, the mid-rise's silhouette, the cars'
  positions, the cycle symbol's position — each checked against the photograph, which is exact because the ratio is exact;
- **by eye**, against `docs/shots/target-v10a.webp`;
- **not numerically from the screenshot** — attempted twice, and it measured my crop (HUD rows and all) rather than the
  art: `best candidate 11–28% flat`, then a skyline profile of 0.00 with one spike. A photograph of a screen is a third
  kind of artefact; it proves nothing about a canvas.
