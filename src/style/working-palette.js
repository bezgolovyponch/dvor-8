// THE WORKING PALETTE — v13's S2/S3, the construction the reference draws with.
//
// The frame is built with the 50-entry table and it USES 43 tones of it. The operator's reference engine never draws
// with the whole table: S2 takes a popularity histogram over the photograph's own pixels, keeps the entries that
// carry the picture, remaps every other tone onto its nearest kept entry, and lets the mode passes settle the
// boundaries. Its frames use 16-21 tones; the v13 gate's V1 line is "distinct tones ≤ 24" (12 photo entries + up to
// 5 sky + 4 glass + outline + void) and it is red on all four of the operator's scenes without this pass.
//
// WHY IT IS A SEPARATE MODULE AND THE LAST WRITE. Every earlier pass chose a tone for a reason; this one re-decides
// nothing - it collapses the tones the frame barely uses onto their nearest neighbour. It has to run AFTER every
// other write or a later writer reintroduces an unrestricted tone set (measured at T+129: applied inside `trace`,
// the frame came out at 43 tones anyway because the car-restoration pass in src/stylise.js writes `entryFor` tones
// afterwards). Two rules keep the structure intact:
//
//   1. the STRUCTURAL entries (outline, void) are pinned - an outline is a line, never a tone to be merged;
//   2. a tone is remapped WITHIN ITS OWN FAMILY when that family kept an entry, so a green never becomes a grey.
//
// The distance is the repo's own weighted RGB (2,4,3) - the same one `snapV13` and the facade quantiser use.
import { STEPS } from '../flat.js';

/** Weighted RGB distance between two palette entries: the repo's 2,4,3 weights (green carries the eye). */
const wDist = (a, b) => (a[0] - b[0]) ** 2 * 2 + (a[1] - b[1]) ** 2 * 4 + (a[2] - b[2]) ** 2 * 3;

/**
 * Collapse the frame onto a working palette of at most `keep` tones (structural entries included).
 * @param {Uint8Array} idx      palette indices, rewritten in place
 * @param {Array<number[]>} palette
 * @param {number} keep         how many tones may survive (the V1 bar is 24; the reference reads 16-21)
 * @returns {{ kept: number, remapped: number, distinct: number }}
 */
export function reduceToWorkingPalette(idx, palette, keep = 22) {
  const outlineI = palette.length - 2, voidI = palette.length - 1;
  const counts = new Int32Array(palette.length);
  for (let p = 0; p < idx.length; p += 1) counts[idx[p]] += 1;
  const keepIt = new Uint8Array(palette.length);
  keepIt[outlineI] = 1; keepIt[voidI] = 1;
  const order = [];
  for (let i = 0; i < palette.length; i += 1) if (!keepIt[i] && counts[i] > 0) order.push(i);
  // popularity, then the table's own order: a deterministic tie-break, never insertion order of a Map
  order.sort((a, b) => counts[b] - counts[a] || a - b);
  for (const i of order.slice(0, Math.max(0, keep - 2))) keepIt[i] = 1;
  const famOf = (i) => Math.floor(i / STEPS);
  const map = new Int16Array(palette.length).fill(-1);
  for (let i = 0; i < palette.length; i += 1) {
    if (keepIt[i]) { map[i] = i; continue; }
    let best = -1, bd = Infinity;
    for (let k = 0; k < palette.length; k += 1) {
      if (!keepIt[k] || famOf(k) !== famOf(i)) continue;       // its own family first
      const d = wDist(palette[i], palette[k]);
      if (d < bd) { bd = d; best = k; }
    }
    if (best < 0) for (let k = 0; k < palette.length; k += 1) { // no entry of its family kept: the nearest kept
      if (!keepIt[k]) continue;
      const d = wDist(palette[i], palette[k]);
      if (d < bd) { bd = d; best = k; }
    }
    map[i] = best;
  }
  let remapped = 0;
  for (let p = 0; p < idx.length; p += 1) { const v = map[idx[p]]; if (v >= 0 && v !== idx[p]) { idx[p] = v; remapped += 1; } }
  const used = new Set();
  for (let p = 0; p < idx.length; p += 1) used.add(idx[p]);
  return { kept: keep, remapped, distinct: used.size };
}
