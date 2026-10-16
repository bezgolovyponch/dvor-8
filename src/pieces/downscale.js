// PIECE: DOWNSCALE — the photograph's own layer, reduced the way published practice reduces it.
//
// THE LOGIC IS RETRIEVED, NOT INVENTED. PixelOE ("Detail-Oriented Pixelization based on Contrast-Aware Outline
// Expansion", https://pypi.org/project/pixeloe/1.0.0/, Apache-2.0) reduces an image by SELECTING A REPRESENTATIVE
// PIXEL per patch rather than averaging it:
//
//   "If a patch has skewed distribution on low value, the minimum value will be selected to keep the dark detail and
//    vice versa. Otherwise, keep the center value."       — PixelOE, stage 2, luminance channel
//
// and it EXPANDS high-contrast outlines BEFORE the reduction (erode bright / dilate bright, blended by a local
// contrast weight) so that fine structure survives being shrunk.
//
// Our build averaged each 5x5 block. An average is the one operation that destroys exactly what the eye reads as
// structure: a 1-px dark line across a bright wall vanishes into a slightly darker cell. That is why the facades came
// out as texture, the window grids melted and the road markings lost their crispness.
//
// This piece implements both halves, and its own check proves the difference on a line that an average erases.

/** Luma, the one channel the decision is made on (PixelOE works in LAB's L; luma is its cheap stand-in). */
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/**
 * Reduce a frame by `block`, keeping contrast: for each block the representative pixel is the darkest one when the
 * block skews dark, the brightest when it skews bright, and the one nearest the mean otherwise.
 * @param {Uint8ClampedArray|Uint8Array} rgba source, w*h*4
 * @param {number} w @param {number} h @param {number} block
 * @returns {{ px: Uint8Array, w: number, h: number, picked: { dark: number, bright: number, mean: number } }}
 */
export function downscaleContrast(rgba, w, h, block = 5) {
  const ow = Math.floor(w / block), oh = Math.floor(h / block);
  const px = new Uint8Array(ow * oh * 4);
  const picked = { dark: 0, bright: 0, mean: 0 };
  for (let by = 0; by < oh; by += 1) {
    for (let bx = 0; bx < ow; bx += 1) {
      let sum = 0, n = 0, lo = Infinity, hi = -Infinity;
      for (let y = 0; y < block; y += 1) {
        for (let x = 0; x < block; x += 1) {
          const p = ((by * block + y) * w + (bx * block + x)) * 4;
          const L = luma(rgba[p], rgba[p + 1], rgba[p + 2]);
          sum += L; n += 1;
          if (L < lo) lo = L;
          if (L > hi) hi = L;
        }
      }
      const mean = sum / n;
      const span = hi - lo;
      // the skew decides which extreme to keep; a flat block keeps the pixel nearest its own mean
      const wantDark = span > 24 && mean - lo > (hi - mean) * 1.35;
      const wantBright = span > 24 && hi - mean > (mean - lo) * 1.35;
      let bestP = -1, bestD = Infinity;
      for (let y = 0; y < block; y += 1) {
        for (let x = 0; x < block; x += 1) {
          const p = ((by * block + y) * w + (bx * block + x)) * 4;
          const L = luma(rgba[p], rgba[p + 1], rgba[p + 2]);
          const d = wantDark ? L : wantBright ? -L : Math.abs(L - mean);
          if (d < bestD) { bestD = d; bestP = p; }
        }
      }
      const o = (by * ow + bx) * 4;
      px[o] = rgba[bestP]; px[o + 1] = rgba[bestP + 1]; px[o + 2] = rgba[bestP + 2]; px[o + 3] = rgba[bestP + 3];
      if (wantDark) picked.dark += 1; else if (wantBright) picked.bright += 1; else picked.mean += 1;
    }
  }
  return { px, w: ow, h: oh, picked };
}

/**
 * Expand high-contrast structure BEFORE reducing (PixelOE stage 1, simplified to the part that matters here): a pixel
 * markedly darker than its local median darkens its darker neighbours, so a thin line survives the block reduction.
 */
export function expandContrast(rgba, w, h, { threshold = 40 } = {}) {
  const out = Uint8ClampedArray.from(rgba);
  const at = (x, y) => ((y * w + x) * 4);
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const p = at(x, y);
      const L = luma(rgba[p], rgba[p + 1], rgba[p + 2]);
      let sum = 0;
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        const q = at(x + dx, y + dy);
        sum += luma(rgba[q], rgba[q + 1], rgba[q + 2]);
      }
      const med = sum / 9;
      if (med - L > threshold) {                       // a dark detail against a brighter surround: widen it
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const q = at(x + dx, y + dy);
          const Lq = luma(rgba[q], rgba[q + 1], rgba[q + 2]);
          if (Lq > L) { out[q] = rgba[p]; out[q + 1] = rgba[p + 1]; out[q + 2] = rgba[p + 2]; }
        }
      }
    }
  }
  return out;
}
