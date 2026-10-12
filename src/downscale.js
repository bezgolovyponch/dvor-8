// A larger crop of the photograph in, the game's picture size out, with thin features kept.
//
// WHY NOT the browser's own resize. An area or bicubic resize averages every source pixel into the cell it
// falls in, so a one-pixel railing, a window frame or a lamp post at three source pixels to one game pixel
// becomes a third of its contrast and then vanishes in the palette. Gerstner et al., "Pixelated Image
// Abstraction" (2012), Fig. 1 names exactly that ("nearest-neighbor or cubic downsampling, both followed by
// median cut color quantization, result in detail loss and blurriness") as the baseline their method beats.
//
// THE METHOD is content-adaptive downscaling: Kopf, Shamir & Peers, "Content-Adaptive Image Downscaling",
// SIGGRAPH Asia 2013, in the EM form of Öztireli & Gross. Every output pixel is a Gaussian kernel in the
// source (centre mu, covariance sigma, colour nu). Each iteration assigns source pixels softly to the kernels
// that claim them (E step), then moves each kernel to the mean position and colour of what it claimed and
// re-fits its covariance (M step). Kernels therefore bend along edges instead of straddling them: a cell
// that sits half on a dark railing and half on the sky ends up either railing or sky, not grey.
//
// SOURCE: this is a JavaScript port of `content_adaptive.rs` in unfake.js (MIT License, (c) 2024 unfake.js
// team, https://github.com/jenissimo/unfake.js), itself a port of its opencv-ops.js. Its constants are kept
// as they are there: 5 iterations, eigenvalues clamped to [0.5, max(1, 0.5·ratio)], kernel support ±2 cells,
// and a pre-shrink so the ratio is at most 3 (the game hands in a 3× crop already, so nothing is shrunk).

const NUM_ITERATIONS = 5;

// sRGB D65 <-> CIELAB, as in the source.
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gam = (v) => { const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, Math.round(c * 255))); };
const fwd = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
const XN = 0.95047, ZN = 1.08883;
const LIN = Float64Array.from({ length: 256 }, (_, i) => lin(i));

export function rgbToLab(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  const x = fwd((0.4124 * R + 0.3576 * G + 0.1805 * B) / XN);
  const y = fwd(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = fwd((0.0193 * R + 0.1192 * G + 0.9505 * B) / ZN);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
export function labToRgb(L, a, b) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const X = inv(fx) * XN, Y = inv(fy), Z = inv(fz) * ZN;
  return [
    gam(3.2406 * X - 1.5372 * Y - 0.4986 * Z),
    gam(-0.9689 * X + 1.8758 * Y + 0.0415 * Z),
    gam(0.0557 * X - 0.2040 * Y + 1.0570 * Z),
  ];
}

// Clamp the eigenvalues of [[s0,s1],[s1,s3]] to [lo,hi] and rebuild it, keeping its orientation.
function clampCov(s0, s1, s3, lo, hi) {
  const tr = s0 + s3, disc = Math.sqrt(((s0 - s3) / 2) ** 2 + s1 * s1);
  const l1 = Math.min(hi, Math.max(lo, tr / 2 + disc)), l2 = Math.min(hi, Math.max(lo, tr / 2 - disc));
  if (Math.abs(s1) < 1e-12) return s0 >= s3 ? [l1, 0, l2] : [l2, 0, l1];
  let vx = s1, vy = tr / 2 + disc - s0;
  const nrm = Math.max(1e-12, Math.hypot(vx, vy)); vx /= nrm; vy /= nrm;
  return [l1 * vx * vx + l2 * vy * vy, (l1 - l2) * vx * vy, l1 * vy * vy + l2 * vx * vx];
}

/**
 * rgba (wi × hi) → rgba (wo × ho). Pure; deterministic. Cost is about wo·ho·(4r)²·5 for a ratio r, so a 3×
 * crop to 192×256 is roughly 35 million kernel evaluations: a fraction of a second.
 */
export function adaptiveDownscale(rgba, wi, hi, wo, ho) {
  const n = wi * hi, L = new Float64Array(n), A = new Float64Array(n), B = new Float64Array(n);
  for (let i = 0; i < n; i += 1) { const c = rgbToLab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]); L[i] = c[0]; A[i] = c[1]; B[i] = c[2]; }
  const rx = wi / wo, ry = hi / ho, lo = 0.5, hiSv = Math.max(1, 0.5 * (rx + ry) / 2);
  const m = wo * ho;
  const mu = new Float64Array(m * 2), sg = new Float64Array(m * 3), nu = new Float64Array(m * 3);
  for (let y = 0; y < ho; y += 1) for (let x = 0; x < wo; x += 1) {
    const k = y * wo + x;
    mu[k * 2] = (x + 0.5) * rx; mu[k * 2 + 1] = (y + 0.5) * ry;
    sg[k * 3] = (rx / 3) ** 2; sg[k * 3 + 1] = 0; sg[k * 3 + 2] = (ry / 3) ** 2;
    nu[k * 3] = 50;
  }
  // Per-kernel claimed pixels, kept in flat reusable buffers: (pixel index, weight) pairs.
  const span = Math.ceil(4 * rx + 2) * Math.ceil(4 * ry + 2);
  const pix = new Int32Array(m * span), wt = new Float64Array(m * span), cnt = new Int32Array(m);
  const gsum = new Float64Array(n);
  for (let it = 0; it < NUM_ITERATIONS; it += 1) {
    gsum.fill(1e-9);
    for (let k = 0; k < m; k += 1) {
      const s0 = sg[k * 3], s1 = sg[k * 3 + 1], s3 = sg[k * 3 + 2];
      const iv = 1 / (s0 * s3 - s1 * s1 + 1e-9), i0 = s3 * iv, i1 = -s1 * iv, i3 = s0 * iv;
      const mx = mu[k * 2], my = mu[k * 2 + 1];
      const x0 = Math.max(0, Math.floor(mx - 2 * rx)), x1 = Math.min(wi, Math.ceil(mx + 2 * rx));
      const y0 = Math.max(0, Math.floor(my - 2 * ry)), y1 = Math.min(hi, Math.ceil(my + 2 * ry));
      let sum = 1e-9, c = 0;
      const base = k * span;
      for (let yi = y0; yi < y1; yi += 1) for (let xi = x0; xi < x1; xi += 1) {
        const dx = xi - mx, dy = yi - my;
        const w = Math.exp(-0.5 * (dx * dx * i0 + 2 * dx * dy * i1 + dy * dy * i3));
        if (w > 1e-5 && c < span) { pix[base + c] = yi * wi + xi; wt[base + c] = w; sum += w; c += 1; }
      }
      for (let j = 0; j < c; j += 1) { wt[base + j] /= sum; gsum[pix[base + j]] += wt[base + j]; }
      cnt[k] = c;
    }
    for (let k = 0; k < m; k += 1) {
      const base = k * span, c = cnt[k];
      let ws = 1e-9, px = 0, py = 0, l = 0, a = 0, b = 0;
      for (let j = 0; j < c; j += 1) {
        const i = pix[base + j], g = wt[base + j] / gsum[i];
        ws += g; px += g * (i % wi); py += g * ((i / wi) | 0); l += g * L[i]; a += g * A[i]; b += g * B[i];
      }
      px /= ws; py /= ws;
      let c0 = 0, c1 = 0, c3 = 0;
      for (let j = 0; j < c; j += 1) {
        const i = pix[base + j], g = wt[base + j] / gsum[i], dx = (i % wi) - px, dy = ((i / wi) | 0) - py;
        c0 += g * dx * dx; c1 += g * dx * dy; c3 += g * dy * dy;
      }
      mu[k * 2] = px; mu[k * 2 + 1] = py;
      const cv = clampCov(c0 / ws, c1 / ws, c3 / ws, lo, hiSv);
      sg[k * 3] = cv[0]; sg[k * 3 + 1] = cv[1]; sg[k * 3 + 2] = cv[2];
      nu[k * 3] = l / ws; nu[k * 3 + 1] = a / ws; nu[k * 3 + 2] = b / ws;
    }
  }
  const out = new Uint8ClampedArray(m * 4);
  for (let k = 0; k < m; k += 1) {
    const c = labToRgb(nu[k * 3], nu[k * 3 + 1], nu[k * 3 + 2]);
    out[k * 4] = c[0]; out[k * 4 + 1] = c[1]; out[k * 4 + 2] = c[2]; out[k * 4 + 3] = 255;
  }
  return out;
}

/**
 * The cheap alternative: each output pixel is the mean colour of the MOST POPULATED lightness bin among the
 * source pixels of its cell, not the mean of all of them. A cell that is two-thirds wall and one-third dark
 * window frame becomes wall or frame, never the grey between. O(N), no iterations.
 *
 * SOURCE: photo2pixel (Apache-2.0, https://github.com/Jzou44/photo2pixel), `module_pixel_effect.py`:
 * intensity split into `param_num_bins` = 4 bins, summed over a `kernel_size` window, argmax bin, its mean
 * colour. One rule is ADDED to theirs (thin darks win, below). Ported with the window equal to the cell plus a one-source-pixel margin, which is the same
 * overlap their default kernel 10 over pixel size 16 gives in proportion. The intensity is their mean of
 * R, G and B.
 */
export function binDownscale(rgba, wi, hi, wo, ho, bins = 4, thin = true) {
  const rx = wi / wo, ry = hi / ho, out = new Uint8ClampedArray(wo * ho * 4);
  const sum = new Float64Array(bins * 3), cnt = new Uint32Array(bins), dark = new Uint32Array(bins);
  for (let y = 0; y < ho; y += 1) for (let x = 0; x < wo; x += 1) {
    sum.fill(0); cnt.fill(0);
    const x0 = Math.max(0, Math.floor(x * rx) - 1), x1 = Math.min(wi, Math.ceil((x + 1) * rx) + 1);
    const y0 = Math.max(0, Math.floor(y * ry) - 1), y1 = Math.min(hi, Math.ceil((y + 1) * ry) + 1);
    for (let yy = y0; yy < y1; yy += 1) for (let xx = x0; xx < x1; xx += 1) {
      const p = (yy * wi + xx) * 4, r = rgba[p], g = rgba[p + 1], b = rgba[p + 2];
      const k = Math.min(bins - 1, (((r + g + b) / 3 / 256) * bins) | 0);
      cnt[k] += 1; sum[k * 3] += r; sum[k * 3 + 1] += g; sum[k * 3 + 2] += b;
    }
    let best = 0;
    for (let k = 1; k < bins; k += 1) if (cnt[k] > cnt[best]) best = k;
    // THIN DARKS WIN. A railing, a pole or a window frame one source pixel wide is a third of a cell and
    // loses any vote, so it vanished (measured: a 1-px line at 3:1 came out as the light field around it).
    // Pixel art keeps such lines, so: if a bin at least two steps darker than the winner holds a whole line
    // through the cell — as many pixels as the cell is tall or wide — the cell takes that darker colour.
    if (thin) {
      dark.fill(0);
      const cx0 = Math.floor(x * rx), cx1 = Math.min(wi, Math.ceil((x + 1) * rx)), cy0 = Math.floor(y * ry), cy1 = Math.min(hi, Math.ceil((y + 1) * ry));
      for (let yy = cy0; yy < cy1; yy += 1) for (let xx = cx0; xx < cx1; xx += 1) {
        const q = (yy * wi + xx) * 4;
        dark[Math.min(bins - 1, ((((rgba[q] + rgba[q + 1] + rgba[q + 2]) / 3 / 256) * bins) | 0))] += 1;
      }
      const line = Math.min(cx1 - cx0, cy1 - cy0);
      for (let k = 0; k <= best - 2; k += 1) if (dark[k] >= line) { best = k; break; }
    }
    const o = (y * wo + x) * 4, c = Math.max(1, cnt[best]);
    out[o] = sum[best * 3] / c; out[o + 1] = sum[best * 3 + 1] / c; out[o + 2] = sum[best * 3 + 2] / c; out[o + 3] = 255;
  }
  return out;
}
