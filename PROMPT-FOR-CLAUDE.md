# Prompt for Claude — build DVOR-8 from an empty repository

Copy everything between the rules below into a fresh Claude session, with the repository open and empty.
It is written to be executed top to bottom, and it assumes nothing that is not in this file or in the repo.

---

## RULES

You are the executing agent. Build a working, playable MVP of **DVOR-8**, an 8-bit browser game, in this
repository. Then verify it in a real browser and report.

### Non-negotiable rules

1. **A source is a page you opened in this session.** A search snippet is not a source. Before you write any
   rule about pixel art, parallax, palette, throttling or game feel, open a real page or a real project file
   and record its URL, the date you fetched it, and the passage you relied on. If you cannot open it, the
   claim is `UNVERIFIED` and stays out of the code.
2. **Never invent a number.** Frame rates, resolutions, palette sizes and speeds appear only with a source,
   or are labelled `DERIVED` with your reasoning beside them.
3. **Verification is a gate, not a step.** Before you report, the game must be shown to run: serve it, load
   it in a real browser, scan the yard, throw a rock, and read the result back. A passing unit test is not
   evidence that the game runs.
4. **Content, not navigation.** A test that proves a screen opens proves nothing about what is on it. Assert
   counts, non-empty fields and values inside their ranges.
5. **Every unfinished item is a numbered state with a next action**, in a file, not a sentence in your
   reply. If you end your turn with "the next step is X", X must exist as a record that a later run reads.
6. **Say what you did not do.** The final report names what is missing. Do not describe a seam as an
   implementation.
7. **No violence, and no scoring by harm.** Objects tip over. Nobody is hurt. There is no damage number, no
   blood, no shouting, and no reward for breaking more.

### The game, exactly

A balcony view of a courtyard, rendered flat and 8-bit. The player scans the yard; every object the scan
recognises is **replaced** by its 8-bit copy. Then the player throws rocks and objects tip over and
disappear after a small number of hits. Six rocks. No score.

**8-bit is a look, not a limit set.** Do not impose a fixed resolution, a palette ceiling, a sprite limit or
a two-button control scheme. The only era constraint is the 8-step colour ladder.

### Build these files

    index.html          the page: a canvas, a HUD, three buttons (scan, reset, and nothing else)
    style.css           plain and dark; nothing competes with the yard
    src/state.js        the world: the five depth layers, the object kinds, what a hit does
    src/yard.js         the yard, generated from a SEED so it is deterministic and testable
    src/palette.js      the palette: quantised to the 8-step ladder, saturation banded per depth
    src/sprites.js      every object drawn twice — realistic and 8-bit — because the scan swaps them
    src/render.js       the parallax layers, the camera, and a balcony rail in the foreground
    src/scan.js         the scan; leave an async `recognise` seam for an LLM, unused by default
    src/throw.js        one rock, an arc, a hit resolved against what is AT the aim point
    src/main.js         the loop and the controls
    test.mjs            the checks
    README.md           how to run it, how to play, what is not done

### The look, and how to check it

Before writing `render.js` or `palette.js`, open a real source on 2D parallax and pixel art and extract its
numbers. Then obey them:

- **Five depth layers**, each scrolling at a fraction of the camera, the speeds strictly increasing toward
  the viewer, the gameplay layer at 1.00.
- **Atmospheric perspective**: saturation rises with proximity. The far layer must be visibly desaturated
  and the gameplay layer near-saturated. The bands must not overlap, or two depths can render identically —
  which is the "flat scene" failure sources on the subject warn about.
- **The foreground rail scrolls FASTER than the camera.** That is what makes the player feel they are on the
  balcony rather than looking at a photograph.
- **Silhouette first.** Every object kind states its silhouette class in DATA, and the test checks that the
  field exists. A shape must be identifiable before it is coloured.
- **Quantise.** Every colour goes through one function on the way out, so no draw call can escape the ladder.

Write each of those as a test that can fail, and name the source you took it from in the test's comment.

### The scan, which is the whole game's opening move

`makeScan(world, { recognise })` returns a scan object. `startScan` begins it; `stepScan` advances it and
recognises every object it reaches; a completed scan must leave **nothing** unrecognised — anything the band
passed without reaching is recognised at the end. `source` records whether recognition came from `'local'`
or `'routed'`.

**The scan must run on its own timer, not inside the animation frame.** A scan that only advances when a
frame arrives freezes the moment frames are throttled, and freezes silently, leaving the yard half-converted
forever. This exact defect was found by serving the game and watching the counter stay at zero.

### The throw

`throwAt` spends a rock and starts an arc. On landing, the rock resolves against **what is at the aim
point** — a rectangle test — and only falls back to the nearest object on a near miss. A nearest-centre rule
alone makes a wide roof out-compete the small object under the cursor, so the player hits something they did
not aim at.

`hitObject` increments `hits`; when `hits` reaches the kind's `breaks`, the object is `gone` and counted.
`spendRock` returns false at zero rocks. No infinite throwing.

### Verify, in this order

    node test.mjs                                  # every check green
    python3 -m http.server 4310 --bind 127.0.0.1   # serve it
    # load it in a real browser, then:
    #   read the canvas: is a pixel actually drawn?
    #   click scan; wait; read the HUD counter — did it reach the total?
    #   click the yard; read the rock counter — did it decrease?
    #   read the log — did something get recognised, and something get hit?

Then, and only then, report:

    what the tests show
    what the browser shows, with the numbers you read back
    what is NOT built, and the file each gap belongs in

### Report format

    ## What runs            — the exact commands and their output
    ## What the browser shows — the numbers read back from the live page
    ## What is not built     — each gap, the file it belongs in, and the next action
    ## Sources              — every URL you opened, with the date and the passage you used

### If a capability is missing

If you cannot open web pages, say so before writing any rule about art or performance, and write those
rules as `UNVERIFIED` — do not fill the gap from memory. If you cannot run a browser, say so, and report the
browser step as **not performed** rather than passing it.

---

End of prompt.
