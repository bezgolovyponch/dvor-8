// THE STYLE'S REGISTER PASS — the conversion produces tones; the STYLE decides which register they sit in.
//
// Measured from the accepted frame: its dominant grey is rgb(89,85,95), lightness 0.35 — the palette is used in its
// MIDDLE register, and the darkest tones are reserved for outlines, voids and true shadow. Our conversion kept
// producing rgb(61,55,67) as its most common tone (30.7% of the frame, spread through walls AND road) because a
// photograph's asphalt and a dark tower ARE dark, and the conversion was faithfully copying that.
//
// The style therefore lifts a converted frame's neutral tones by one step, EXCEPT where a tone means something:
// outlines, voids, window sprites and anything the caller protects. This is the last thing that touches a frame, so
// no later pass can undo it.
import { RAMPS, STEPS, paletteOf } from '../flat.js';

const NEUTRAL = new Set(['stone', 'metal', 'dusk']);

/** @returns {{ lifted: number, protected: number }} */
// maxTone = 1: ONLY the darkest tone is lifted. With 2 (the first attempt) the whole neutral scale moved up and one
// tone came to own more than a third of the frame, which the style forbids ("no wash: many tones, none dominant").
// One step is enough to put the frame's register where the accepted frame has it, and it keeps the spread.
export function liftRegister(idx, { protect = new Set(), maxTone = 1, horizon = null, w = 0, h = 0, groundMaxTone = 3 } = {}) {
  const palette = paletteOf();
  const outline = palette.length - 2, voidIdx = palette.length - 1;
  // which entries may be lifted: tone 0 and 1 of the neutral ramps, but never the structural entries
  const lift = new Int16Array(palette.length).fill(-1);
  for (let r = 0; r < RAMPS.length; r += 1) {
    if (!NEUTRAL.has(RAMPS[r].name)) continue;
    for (let t = 0; t < maxTone; t += 1) lift[r * STEPS + t] = r * STEPS + t + 1;
  }
  // the ground's own lift ladder: tones 0..2 climb one step, so the asphalt lands in the mid register the accepted
  // frame uses, while the buildings above the horizon keep their darks (that is what protects the tone spread).
  const liftGround = new Int16Array(palette.length).fill(-1);
  if (horizon && horizon.length) {
    for (let r2 = 0; r2 < RAMPS.length; r2 += 1) {
      if (!NEUTRAL.has(RAMPS[r2].name)) continue;
      for (let t = 0; t < groundMaxTone; t += 1) liftGround[r2 * STEPS + t] = r2 * STEPS + t + 1;
    }
  }
  let lifted = 0, kept = 0, liftedGround = 0;
  const rows = w ? Math.floor(idx.length / w) : 0;
  void rows;
  for (let p = 0; p < idx.length; p += 1) {
    const v = idx[p];
    if (horizon && horizon.length && w) {
      const x = p % w, y = (p / w) | 0;
      if (y > (horizon[x] || 0) && !protect.has(p)) {
        const to = liftGround[v];
        if (to >= 0) { idx[p] = to; liftedGround += 1; continue; }
      }
    }
    if (v === outline || v === voidIdx || v < 0 || v >= palette.length) { kept += 1; continue; }
    if (protect.has(p)) { kept += 1; continue; }
    const to = lift[v];
    if (to >= 0) { idx[p] = to; lifted += 1; }
  }
  return { lifted, protected: kept, liftedGround };
}
