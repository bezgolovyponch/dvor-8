# Handover

State of DVOR-8 at the end of the stabilisation pass, and what a new chat needs to know to start work
without re-deriving any of it.

## What the game is

A browser game, no build step, dependency-free ESM. The player photographs their own courtyard; the phone finds
the things in it; the photograph becomes an 8-bit scene; the things in the scene can be hit, broken, painted and
thrown at. There is a stealth layer (someone comes out, you hide behind the window pillar) and a street that
grows as more photographs are added. Purpose: someone waiting for somebody interacts with their own
environment, plays, and shares it.

## How to run everything

```
node test.mjs                                  # 231 checks, must be 0 FAIL
node tools/monetisation-check.mjs              # 29 checks, must be 0 FAIL
python3 tools/serve.py 4312                    # serve the folder (or any static server)
BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/<harness>.mjs <outdir> photos-test/a.jpg
        # harnesses: check, walk-check, folk-check, news-check, pop-check, paint-check — all must exit 0
sh android/build.sh                            # android/out/dvor-8-0.4.0.apk (needs JDK + Android SDK)
```

The browser harnesses need a served copy. `--experimental-websocket` is required on this Node version.

## The files that matter

| File | What it is |
|---|---|
| `src/flat.js` | **The style route.** Photograph → an ink gate (difference of Gaussians) → Felzenszwalb regions → region-adjacency merge the ink can veto → one ramp and one tone per region from a FIXED palette of six ramps, with a material pattern on rough surfaces only → a line layer decided per pair of regions where the photograph has a border. Every stage, its reason and its measurement: `docs/environment-style.md`. |
| `src/stylise.js` | The seam: runs `flat.js` and answers what the rest of the game asks a styled picture for — palette index per pixel, region list, material map. |
| `src/surfaces.js` | SKY or OTHER, and nothing finer. See "what was deleted" below for why it is not a classifier. |
| `src/frame.js` | Finds windows (dark openings in a brighter wall) and decides where paint sticks. |
| `src/main.js` | Wiring and the page's behaviour. |
| `docs/formula.md` | **The formula**, with the lever table and the composition rule. |
| `docs/style.md` | Factor table F1–F32 and decisions D1–D12. Cited by number from other documents. |
| `docs/constraints.md` | The 17 constraints the game is held to, each with its source. |
| `docs/concept.md` | Every module and why it exists. **A check fails if a module is not listed here.** |

## The three rules the codebase enforces on itself

1. **A module must be used and must have its reason written in `docs/concept.md`**, or the suite fails. When a
   module is deleted, its row goes too.
2. **No source, no number.** Every constant is either a published figure with the page it came from, a
   computed consequence, or an explicit `CHOICE` with its reason. `docs/style.md` carries the evidence class.
3. **Nothing is invented to fill a gap.** Where a measurement failed — the material classifier — the code says
   so and stops, rather than guessing. That is why `surfaces.js` has two entries.

## What was deleted in this pass, and why it must not come back

The previous route quantised the photograph's own pixels (grade → guided filter → median cut → Floyd–Steinberg
→ ink lines). It was removed because it was **measured and wrong**, not because it was unfashionable:

- **The palette was per-photograph**, so every yard was a different game. The three test photographs have hue
  spreads of 92.6°, 25.8° and 31.2°; the same code produced three unrelated colour schemes.
- **Quantising a photograph keeps its noise.** Asphalt grain, leaf texture and JPEG ringing are all
  high-frequency and all become the same speckle, which is why surfaces had no border between them.

Also deleted, for the same reason: `src/materials.js` (a six-class material classifier — measured, TREE and
BENCH differ by 4.4 in colour spread and 0.7 in texture, so it put the bench in the trees) and five prototype
tools. **Do not re-add a material classifier without a model that has learned the boundaries.**

## Live defects, in priority order

1. **Windows are found by a guess.** `frame.js` looks for small dark patches filling their own box in a brighter
   wall. It finds 6 of the drawn yard's 15, and on real photographs it takes dark doorways and signs for windows.
   It is labelled as a guess in the note under the yard. **A trained segmenter is the fix**: tfjs-models
   DeepLab v3 with the ADE20K base is **Apache-2.0**, 8.8 MB, and its label list includes `windowpane` (9),
   `door` (15), `wall` (1), `building` (2), `tree` (5). Measured: 3.3 s to load, **12.9 s to segment one
   photograph**, which is why it is not in use — a thirteen-second wait between the photograph and the game.
   Reducing that cost is the single highest-value engineering task.
2. **Materials are not classified at all.** Everything that is not sky is `other`, so gravel, wall and road are
   painted but not distinguished. Same fix as above.
3. **Backlit facades flatten.** In the street-canyon photograph the shaded buildings come out as two flat greys.
4. **Sun glare becomes a red streak** on the road in the sunset photograph.
5. **Untested on a phone.** Everything is verified in headless Chrome on this machine. The APK is built and its
   contents checked against the sources, and has never been run on a device.

## What is measured and trustworthy

`docs/formula.md` is the authority. In short: `LTV = ARPDAU × lifetime` is an identity and holds exactly; the
four main levers (**retention ×1.592 > sessions/day ×1.453 > session length ×1.398 > eCPM ×1.361**) are
**exactly multiplicative**, measured ×4.400 together against a predicted ×4.400; and **more stopping points is
worth ×1.043**, the least valuable lever measured. The model **prices a design and cannot predict that a design
change will move revenue** — no study isolates a design parameter and measures an engagement outcome.

Never quote the ×51.6 payer-layer figure. It is cross-market, it is an upper bound, and the file says so.

## Next actions, in the order the evidence supports

1. **Cut the segmentation cost.** Try a smaller input, a quantised model, or segmenting a downscaled copy and
   upsampling the mask — the mask does not need 513×513 to decide which flat region is a window.
2. **Test on a phone.** Install `android/out/dvor-8-0.4.0.apk` and play one real photograph end to end.
3. **Wire the share button.** Not built. `navigator.share({ files })` with `canvas.toBlob` is the route; it
   works on iOS Safari 14+ and Android Chrome 76+ and **not on Firefox on any platform**, so it needs a
   download fallback. `navigator.share` is undefined on unsupported desktops — feature-detect with
   `navigator.canShare?.({ files: [file] })`. HTTPS and a real user gesture are both required.
4. **Then** chase the levers in the measured order, and only after a design change has been made, not before.

## What a new chat should read first

`docs/environment-style.md` for what the picture is, stage by stage, with the measurements and the Legendarity
Index; then `docs/style.md` (decisions D1–D41) for the rest of the look and the feel; then `docs/formula.md`
for what the money model is. `src/flat.js`'s header carries the same reasons beside the code. Everything else
is reference.
