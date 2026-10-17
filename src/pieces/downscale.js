// PIECE: DOWNSCALE — the photograph's own layer, reduced the way published practice reduces it.
//
// THE LOGIC IS RETRIEVED, NOT INVENTED. PixelOE ("Detail-Oriented Pixelization based on Contrast-Aware Outline
// Expansion", https://pypi.org/project/pixeloe/1.0.0/, Apache-2.0) reduces an image by SELECTING A REPRESENTATIVE
// PIXEL per patch rather than averaging it. The published rule, verbatim from the 1.0.0 sdist
// (src/pixeloe/legacy/downscale/contrast_based.py, find_pixel):
//
//   mid = chunks[..., chunks.shape[-1] // 2][..., None]
//   med = torch.median(chunks, dim=1, keepdims=True).values
//   mu  = torch.mean(chunks, dim=1, keepdims=True)
//   maxi = torch.max(chunks, dim=1, keepdims=True).values
//   mini = torch.min(chunks, dim=1, keepdims=True).values
//   output = mid
//   mini_loc = (med < mu) & (maxi - med > med - mini)
//   maxi_loc = (med > mu) & (maxi - med < med - mini)
//   output[mini_loc] = mini[mini_loc]; output[maxi_loc] = maxi[maxi_loc]
//
// and the three planes are handled differently (same file, contrast_based_downscale): L takes the selection above,
// a and b take the PATCH MEDIAN. The image is converted to Lab first (cv2.COLOR_BGR2LAB) and back after. find_pixel itself has no
// span threshold, no ratio, no skew factor (the stage-1 expansion is a separate, simplified piece - see below): an earlier revision of this file added `span > 24` and a `1.35` skew and
// INVERTED the decision on the asymmetric patch (24 dark + 1 bright kept the single bright pixel).
//
// Our build used to average each 5x5 block. An average is the one operation that destroys exactly what the eye reads
// as structure: a 1-px dark line across a bright wall vanishes into a slightly darker cell. Stage 1 below expands
// high-contrast structure BEFORE the reduction (PixelOE's own order), so the reduction has something to keep.

// sRGB -> linear, as a 256-entry table (the same transfer function cv2 applies, precomputed once).
const LIN = (() => {
  const t = new Float64Array(256);
  for (let i = 0; i < 256; i += 1) {
    const v = i / 255;
    t[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }
  return t;
})();
// CIE 1976 L*a*b* (D65), the space PixelOE converts into before it decides anything.
const EPS = 216 / 24389, KAPPA = 24389 / 27, Xn = 0.95047, Yn = 1.0, Zn = 1.08883;
const labF = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const T = new Float64Array(3);   // scratch: [L, a, b]; no per-pixel allocation in the hot loop
function rgbToLab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / Xn;
  const y = 0.2126729 * R + 0.7151522 * G + 0.0721750 * B;
  const z = (0.0193339 * R + 0.1191920 * G + 0.9503041 * B) / Zn;
  const fx = labF(x), fy = labF(y / Yn), fz = labF(z);
  T[0] = 116 * fy - 16; T[1] = 500 * (fx - fy); T[2] = 200 * (fy - fz);
  return T;
}
const labToRgb = (L, a, b) => {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = Xn * (fx ** 3 > EPS ? fx ** 3 : (116 * fx - 16) / KAPPA);
  const y = Yn * (fy ** 3 > EPS ? fy ** 3 : (116 * fy - 16) / KAPPA);
  const z = Zn * (fz ** 3 > EPS ? fz ** 3 : (116 * fz - 16) / KAPPA);
  const R = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const G = -0.9692660 * x + 1.8760108 * y + 0.0415560 * z;
  const B = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  const enc = (v) => {
    const u = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(u * 255)));
  };
  return [enc(R), enc(G), enc(B)];
};

/** Median of a copy of the first `n` entries (typed-array sort is numeric). */
const median = (src, n) => {
  const c = src.slice(0, n);
  c.sort();
  return c[(n - 1) >> 1];
};

/**
 * Reduce a frame by `block` with PixelOE's published rule: L is the min / max / centre chosen by the patch's median
 * against its mean, and both chroma planes are the patch medians.
 * @param {Uint8ClampedArray|Uint8Array} rgba source, w*h*4
 * @param {number} w @param {number} h @param {number} block
 * @returns {{ px: Uint8Array, w: number, h: number, picked: { dark: number, bright: number, mean: number } }}
 */
export function downscaleContrast(rgba, w, h, block = 5) {
  const ow = Math.floor(w / block), oh = Math.floor(h / block);
  const px = new Uint8Array(ow * oh * 4);
  const picked = { dark: 0, bright: 0, mean: 0 };
  const P = block * block;
  const L = new Float64Array(P), A = new Float64Array(P), B = new Float64Array(P);
  for (let by = 0; by < oh; by += 1) {
    for (let bx = 0; bx < ow; bx += 1) {
      let sum = 0, lo = Infinity, hi = -Infinity;
      for (let y = 0; y < block; y += 1) {
        for (let x = 0; x < block; x += 1) {
          const p = ((by * block + y) * w + (bx * block + x)) * 4;
          const lab = rgbToLab(rgba[p], rgba[p + 1], rgba[p + 2]);
          const i = y * block + x;
          L[i] = lab[0]; A[i] = lab[1]; B[i] = lab[2];
          sum += lab[0];
          if (lab[0] < lo) lo = lab[0];
          if (lab[0] > hi) hi = lab[0];
        }
      }
      const mu = sum / P, med = median(L, P);
      // find_pixel: med < mu and a bright outlier => keep the minimum; med > mu and a dark outlier => keep the
      // maximum; otherwise keep the centre pixel. No thresholds and no ratios: this is the whole rule.
      let sel;
      if (med < mu && hi - med > med - lo) { sel = lo; picked.dark += 1; }
      else if (med > mu && hi - med < med - lo) { sel = hi; picked.bright += 1; }
      else { sel = L[(P - 1) >> 1]; picked.mean += 1; }
      const [r, g, b] = labToRgb(sel, median(A, P), median(B, P));
      const o = (by * ow + bx) * 4;
      px[o] = r; px[o + 1] = g; px[o + 2] = b; px[o + 3] = 255;
    }
  }
  return { px, w: ow, h: oh, picked };
}

/**
 * Expand high-contrast structure BEFORE reducing (PixelOE stage 1, SIMPLIFIED — and the simplification is a CHOICE,
 * not the published implementation): a pixel markedly darker than its local MEAN (3x3, not a median: the code below
 * computes a mean, and that is what PixelOE's avg_scale term is) darkens its brighter 4-neighbours. The threshold of
 * 40 is a tuned constant inherited from the first version of this file; PixelOE's own outline_expansion has no such
 * threshold (it erodes/dilates with the patch size and avg/dist scales). Recorded as Q, not claimed as published.
 * The published two-stage ORDER (expand, then select) is what matters here: the rule alone selects, it never widens.
 */
export function expandContrast(rgba, w, h, { threshold = 40 } = {}) {
  const out = Uint8ClampedArray.from(rgba);
  const at = (x, y) => ((y * w + x) * 4);
  const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
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
