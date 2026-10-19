// THE GROUND'S PLANES — piece. Contract: takes ONE paved pad (its pixels), the photograph's luma and the three tones
// the caller resolved from the palette; writes the pad's tones into `idx`; returns what it measured.
//
// It decides nothing about WHERE the ground is (the paved mask and its connected pads are the caller's) and nothing
// about which tones exist (the palette is stage 1): it is the ground's SURFACE, only.
//
// THE PARAMETERS, AND THEIR SOURCE:
//   v13 S2/S3 - the reduction is a SELECTION PER BLOCK followed by mode passes, never a per-pixel average. Measured at
//       T+133 against the operator's reference: a rung chosen from each pixel's own luma scattered the photograph's
//       asphalt grain across two rungs (speckle, a broken kerb, a blotched crossing). The tone is therefore chosen from
//       a 3x3 MEAN of the surface, and the pad's tone map gets five strict-majority passes.
//   the split share 0.40 - the reference's OWN ground on the same photograph: 45.6% mid rgb(98,94,104) + 30.9% dark
//       rgb(74,70,80), i.e. its darker plane is 30.9/(45.6+30.9) = 40% of the asphalt (D26; the sweep is in the
//       RUNLOG: p50 costs V7, p40 keeps V3 and V7 green together).
//   the paint mask - CLOSED (dilate by one, then erode by one; the project's cited morphology, OpenCV) so a stripe
//       keeps the photograph's width instead of breaking into dashes. The paint test is a bright threshold whose value
//       comes from the caller (the photograph's own painted markings are the bright pixels of the surface).
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Paint one paved pad's own planes and paint-marks into `idx` (in place).
 * @param {object} o
 * @param {number} o.w @param {number} o.h
 * @param {Uint8Array} o.idx            the frame's palette indices
 * @param {Int32Array} o.padPixels      this pad's pixels
 * @param {Float32Array} o.rgb          the photograph, n*3
 * @param {number} o.marking            the palette entry for painted markings
 * @param {number} o.dark               the palette entry for the darker plane
 * @param {number} o.light              the palette entry for the lighter plane
 * @param {number} [o.paintLuma]        a pixel brighter than this, on the surface, is paint (default 168)
 * @param {number} [o.splitShare]       the darker plane's share of the asphalt (default 0.40, the reference's own)
 * @param {number} [o.passes]           majority passes on the tone map (default 5)
 * @param {boolean} [o.split]           true: the asphalt's own two planes; false: one plane (a bright pad - the
 *                                      crossing, the kerb apron - keeps the single tone its own mean asks for)
 * @param {boolean} [o.erode]           close the mask properly (dilate then erode). DEFAULT FALSE, BY MEASUREMENT:
 *                                      the shipped code's erosion test referenced the pad object instead of the pad
 *                                      mask, so `nbr` was always 4 and the paint was only DILATED - and that
 *                                      overshoot measures BETTER on the operator's reference: with the intended
 *                                      erosion the judged frame reads V3 57.3% (against 50.2%) and V7 55.99% (against
 *                                      55.39%), because more paint on the ground reduces the asphalt's dominant
 *                                      share. The erosion is kept, switched off, with its numbers.
 * @returns {{ dark:number, light:number, paint:number, splitAt:number, tone:Int16Array }}
 */
export function paintGroundPlanes({ w, h, idx, padPixels, rgb, marking, dark, light, paintLuma = 168, splitShare = 0.40, passes = 5, split = true, erode = false }) {
  const n = w * h;
  const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  // THE TONE IS CHOSEN FROM THE SURFACE, NOT FROM THE PIXEL: a 3x3 mean of the photograph's luma, so the grain of the
  // asphalt cannot cross a rung boundary.
  const lumaMap = new Float32Array(n);
  for (let p = 0; p < n; p += 1) lumaMap[p] = luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
  const lumaOf = (p) => {
    const x = p % w, y = (p / w) | 0;
    let sum = 0, k = 0;
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      sum += lumaMap[ny * w + nx]; k += 1;
    }
    return k ? sum / k : lumaMap[p];
  };
  // the split point: the asphalt's own percentile, at the share the reference's ground carries
  const lumas = [];
  for (const p of padPixels) { const L = lumaOf(p); if (L <= paintLuma) lumas.push(L); }
  lumas.sort((a, b) => a - b);
  const splitAt = lumas.length ? lumas[Math.floor(lumas.length * splitShare)] : paintLuma;

  // the paint: bright pixels on the surface, CLOSED, so a stripe is a shape with the photograph's width
  const paint = new Uint8Array(n);
  for (const p of padPixels) if (lumaOf(p) > paintLuma) paint[p] = 1;
  const closed = new Uint8Array(n);
  for (const p of padPixels) {
    if (!paint[p]) continue;
    const x = p % w;
    closed[p] = 1;
    if (x > 0) closed[p - 1] = 1;
    if (x < w - 1) closed[p + 1] = 1;
    if (p >= w) closed[p - w] = 1;
    if (p + w < n) closed[p + w] = 1;
  }
  const isPad = new Uint8Array(n);
  for (const p of padPixels) isPad[p] = 1;
  if (erode) for (const p of padPixels) {
    if (!closed[p]) continue;
    const x = p % w;
    const nbr = (p - 1 >= 0 && isPad[p - 1] ? closed[p - 1] : 1)
      + (x < w - 1 && isPad[p + 1] ? closed[p + 1] : 1)
      + (p - w >= 0 && isPad[p - w] ? closed[p - w] : 1)
      + (p + w < n && isPad[p + w] ? closed[p + w] : 1);
    if (nbr < 4) closed[p] = 0;                        // the erosion: only the mass of a stripe survives
  }

  // -1 = not asphalt (the paint, or not this pad); 0 = the darker plane; 1 = the lighter
  const tone = new Int16Array(n).fill(-1);
  let paintPx = 0, darkPx = 0, lightPx = 0;
  for (const p of padPixels) {
    if (closed[p]) { idx[p] = marking; paintPx += 1; continue; }
    const L = lumaOf(p);
    const step = split && L < splitAt ? 0 : 1;
    tone[p] = step;
    if (step === 0) darkPx += 1; else lightPx += 1;
  }
  // a surface is a field: strict-majority passes so the asphalt's grain cannot survive as islands
  for (let pass = 0; pass < passes; pass += 1) {
    const prev = tone.slice();
    for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
      const p = y * w + x;
      if (prev[p] < 0) continue;
      const tally = new Map();
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const q = p + dy * w + dx;
        if (prev[q] < 0) continue;
        tally.set(prev[q], (tally.get(prev[q]) || 0) + 1);
      }
      let best = prev[p], bestN = 0;
      for (const [k, v] of tally) if (v > bestN) { bestN = v; best = k; }
      tone[p] = best;
    }
  }
  const out = new Int16Array(n).fill(-1);
  for (const p of padPixels) {
    if (tone[p] < 0) continue;
    const entry = tone[p] === 0 ? dark : light;
    idx[p] = entry;
    out[p] = entry;
  }
  void clamp;
  return { dark: darkPx, light: lightPx, paint: paintPx, splitAt, tone: out };
}
