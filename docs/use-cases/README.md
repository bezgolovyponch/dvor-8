# THE USE CASES — one photograph at a time

Each use case is a photograph the product must handle. For each: the picture, the mechanical gates that APPLY to it,
and their lines. A gate that does not apply is named, not skipped silently.

## judged-v10a — the photograph the accepted frame was made from

- photograph: `photos-test/v10a.jpg`
- frame: `docs/use-cases/judged-v10a/frame.png`
- built: 58 targets
- gates that apply: **match, plan, pairing, style, reference**

  - **match**: 8 of 8 lines match the example frame.
  - **plan**: PLAN ACCEPTED: 8 of 8 structural lines.
  - **pairing**: PAIRED: the drawn sky sits where the photograph's sky is (IoU 0.85), the dark structures stay dark (81%), and the ground carries the photograph's own colours (26 tones).
  - **style**: IN THE STYLE: every line of v10a conformance passes.
  - **reference**: MATCHES THE ACCEPTED FRAME: the sky, the clouds and the darks are the accepted frame's own tones.

## second-yard — the operator's second yard: a different building, a different layout

- photograph: `photos-test/yard2-new.jpg`
- frame: `docs/use-cases/second-yard/frame.png`
- built: 48 targets
- gates that apply: **plan, pairing, style, reference**

  - **plan**: PLAN ACCEPTED: 8 of 8 structural lines.
  - **pairing**: PAIRED: the drawn sky sits where the photograph's sky is (IoU 0.94), the dark structures stay dark (80%), and the ground carries the photograph's own colours (25 tones).
  - **style**: IN THE STYLE: every line of v10a conformance passes.
  - **reference**: MATCHES THE ACCEPTED FRAME: the sky, the clouds and the darks are the accepted frame's own tones.
  - not applicable here: match — match's regions are the ACCEPTED frame's own rectangles

---

**Every use case confirmed: its picture exists and every gate that applies to it passes.**
