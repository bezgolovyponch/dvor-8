# The baseline

Every request made of this game, and the artefact that answers it. **Run before every push:**

```
node tools/baseline-check.mjs      # 18 rows, exits non-zero on a failure
node test.mjs                      # the suite
node tools/monetisation-check.mjs  # the revenue model
```

`tools/baseline-check.mjs` is the list; this file explains why each row is on it. A row that fails is not
deleted — it is either fixed or the request it names is renegotiated with the creator in writing.

| request | answered by |
|---|---|
| A photographed yard becomes a level | `src/detect.js` — the on-device detector |
| The detector is EfficientDet-**Lite2** | `vendor/mediapipe/efficientdet_lite2.tflite` (7,515,971 B int8) |
| Real photo → 8-bit transfer, stable and measured | `src/flat.js`, `src/vector.js` |
| The r9 route: flat shapes, straight edges, designed clouds | `src/vector.js` |
| Enhance first, shadows secondary | `src/enhance.js` |
| Facade windows found as a rhythm, destroyable | `src/vector.js`, `src/main.js` |
| Everything in the picture destructible, permanently | `src/world.js` |
| Kind actions: flowers, wash, parcel, whimsy | `src/kind.js` |
| Weather: rain, snow, fog, lightning | `src/weather.js` |
| Disasters: hurricane, tsunami, Godzilla, Beyoncé | `src/disaster.js` |
| Beyoncé eats cars Pac-Man style, then shakes her head | `src/disaster.js` |
| A disaster can never touch a person | `src/disaster.js` + a suite check |
| The bottom bar: weapon, disaster, info, expand circle | `index.html` |
| Info button: true facts, random, never the same theme twice | `src/lore.js` |
| The card carries Я ЗДЕСЬ · I AM HERE, before and after | `src/render.js` |
| The share text leads with the tag, ends with hashtags | `src/album.js` |
| Nothing in vain: every module used and explained | `docs/concept.md` |
| The suite covers the modules the baseline names | `test.mjs` |

## What the baseline has already caught

It is not decoration. In the first two runs it found: the vector route painting the *drawn* demo yard black
(now gated), the beast never being handed to the renderer (invisible Godzilla), an unguarded particle colour
that threw away a whole frame, and — in its last run — that the suite had **no checks at all** for `vector.js`
or `enhance.js`, which are now written and pass.

## The disaster event, rebuilt on the pixel-era mechanics (`docs/disaster-design.md`)

| part taken from | where it came from | what it does here |
|---|---|---|
| the destruction WAVE | Bomberman (1983) | the hurricane is a vertical front sweeping sideways, damaging the cell it covers and nothing else |
| damage by pieces | Rampage (1986) | a stomp takes the thing in its own border, not whole |
| the three-beat envelope | SimCity (1989) | WARNING (siren, the disaster named, nothing damaged) → IMPACT → AFTERMATH (calm announced, holes stay) |
| the second, weaker pass | Dig Dug (1982) / Rampart (1990) | the tsunami drains as a pass that scatters debris and stains but deletes nothing |
| the bite cycle | Pac-Man (1980) | Beyoncé's chomp (withdrawn until it renders) |

What the first version got wrong, in those terms: a palette grade is a filter and not an event; dust on a random
timer has no front and no cells; `gone = true` has no remains beat. All three are fixed in
`stepDisaster`/`main.js`.
