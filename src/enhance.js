// ENHANCE — make the FUNDAMENTAL SHAPES visible before anything tries to recognise them.
//
// The scene analysis this follows found the same thing from the other end: a photograph is not a set of
// objects, it is a set of objects times a lighting. A wall in shadow and the same wall in sun are one shape
// and two colours, and every step downstream - segmentation, edge finding, detection - reads the colour and
// mistakes it for a boundary. So the picture is prepared first, and the preparation has three jobs:
//
//   1. FLATTEN THE LIGHT. Divide out a large-radius blur: what is left is the surface's own reflectance and
//      not the lamp, the sky or the shadow falling across it. This is the single most useful step for shape
//      recognition in a courtyard photograph, where half the frame is in shadow at any hour.
//   2. OPEN THE LOCAL CONTRAST. A tile-wise mean/std normalisation (a cheap CLAHE), so a dark corner and a
//      bright facade both present their structure at the same strength.
//   3. KEEP THE STRUCTURE AND DROP THE TEXTURE. A small edge-preserving smoothing pass, so an edge that
//      survives is a shape's edge and not the grain of the asphalt.
//
// SHADOWS ARE SECONDARY. They are not deleted - a picture without any shading loses its form - but they are
// demoted from BOUNDARY to TONE: the enhancement removes them from the decision of where a shape ends, and the
// renderer puts a shadow back only as a colour on a shape that is already there. That is the whole principle:
// shape first, light second.
//
// And one measurement the analysis found decisive: DEPTH ALONE CANNOT TELL SKY FROM A DISTANT CITY. What can is
// straight-line density - a building is full of long straight edges, a cloud is not - so that is computed here,
// on the enhanced picture, and used to split sky from "distance" (towers, bridges, cranes) the way the analysis
// did. Judging sky by smoothness was tried there and rejected: it carved clouds into fake buildings.
//
// Everything here is plain arithmetic on typed arrays. No model, no dependency, and it runs on a phone.

export const FLATTEN = {
  radius: 12,     // the blur whose removal is "the lighting". Bigger than any object, smaller than the frame.
  keep: 0.85,     // how much of the original is kept on top of the reflectance (1 = no flattening)
  floor: 26,      // never divide by less than this: black stays black instead of exploding
};

export const CLAHE = { tiles: 6, clip: 3.2, strength: 0.55 };
export const DENOISE = { radius: 2, sigmaColour: 26 };   // edge-preserving, so shapes keep their edges

export const LINE = {
  gradMin: 26,        // a gradient this strong is an edge worth following
  minRun: 9,          // and a straight run this long is a line, not texture
  bins: 8,            // orientation bins: 22.5 degrees each, which covers a building's verticals and horizontals
};

/** An integral image of the luma, for constant-time box means at any radius. */
function integralOf(lum, w, h) {
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let rowSum = 0;
    for (let x = 0; x < w; x += 1) {
      rowSum += lum[y * w + x];
      I[(y + 1) * (w + 1) + (x + 1)] = I[y * (w + 1) + (x + 1)] + rowSum;
    }
  }
  return I;
}
export function boxMean(I, w, h, x, y, r) {
  const x0 = x - r < 0 ? 0 : x - r, y0 = y - r < 0 ? 0 : y - r;
  const x1 = x + r >= w ? w - 1 : x + r, y1 = y + r >= h ? h - 1 : y + r;
  const s = I[(y1 + 1) * (w + 1) + (x1 + 1)] - I[y0 * (w + 1) + (x1 + 1)] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0];
  return s / ((x1 - x0 + 1) * (y1 - y0 + 1));
}

/**
 * The enhanced picture, plus the two maps the shape work needs: how strong the edges are, and how much of the
 * neighbourhood is made of LONG STRAIGHT RUNS (which is what separates a building from a cloud).
 */
export function enhance(rgba, w, h, opts = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const cfg = { ...FLATTEN, ...(opts.flatten || {}) };
  const n = w * h;
  const src = rgba.length && rgba.length >= n * 4 ? rgba : new Uint8ClampedArray(n * 4);
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i += 1) lum[i] = 0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2];
  const I = integralOf(lum, w, h);

  // ---- 1. flatten the light: out = original / localMean, renormalised ------------------------------------
  const flat = new Float32Array(n);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = y * w + x;
    const m = Math.max(cfg.floor, boxMean(I, w, h, x, y, cfg.radius));
    flat[p] = (lum[p] / m) * 128;
  }

  // ---- 2. local contrast, tile by tile (a cheap CLAHE) ----------------------------------------------------
  const T = Math.max(2, CLAHE.tiles | 0);
  const tw = Math.ceil(w / T), th = Math.ceil(h / T);
  const gain = new Float32Array(n).fill(1);
  for (let ty = 0; ty < T; ty += 1) for (let tx = 0; tx < T; tx += 1) {
    const x0 = tx * tw, x1 = Math.min(w, x0 + tw), y0 = ty * th, y1 = Math.min(h, y0 + th);
    let sum = 0, sum2 = 0, c = 0;
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { const v = flat[y * w + x]; sum += v; sum2 += v * v; c += 1; }
    if (!c) continue;
    const mean = sum / c, sd = Math.sqrt(Math.max(1e-3, sum2 / c - mean * mean));
    const k = Math.min(CLAHE.clip, 46 / sd);                    // never amplify a flat tile into noise
    for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) gain[y * w + x] = 1 + (k - 1) * CLAHE.strength;
  }
  const contrast = new Float32Array(n);
  for (let p = 0; p < n; p += 1) contrast[p] = 128 + (flat[p] - 128) * gain[p];

  // ---- 3. edge-preserving smoothing: the structure stays, the grain goes ---------------------------------
  const R = DENOISE.radius, sc = DENOISE.sigmaColour;
  const smooth = new Float32Array(n);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = y * w + x, c0 = contrast[p];
    let sum = 0, wsum = 0;
    for (let dy = -R; dy <= R; dy += 1) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -R; dx <= R; dx += 1) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const q = yy * w + xx, v = contrast[q];
        const wgt = Math.exp(-((v - c0) * (v - c0)) / (2 * sc * sc));   // a colour far away does not vote
        sum += v * wgt; wsum += wgt;
      }
    }
    smooth[p] = wsum ? sum / wsum : c0;
  }

  // ---- 4. edges and LONG STRAIGHT RUNS -------------------------------------------------------------------
  const gradX = new Float32Array(n), gradY = new Float32Array(n);
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const p = y * w + x;
    gradX[p] = smooth[p + 1] - smooth[p - 1];
    gradY[p] = smooth[p + w] - smooth[p - w];
  }
  const edge = new Float32Array(n);
  for (let p = 0; p < n; p += 1) edge[p] = Math.hypot(gradX[p], gradY[p]);
  // A run is counted along the edge's own direction, and only where the gradient keeps pointing the same way:
  // that is what makes it a LINE and not a busy patch. `line` is 0..1 - the share of a small neighbourhood that
  // is made of long straight runs, which is the sky/distance discriminator the analysis found decisive.
  const line = new Float32Array(n);
  const bin = new Uint8Array(n);
  for (let p = 0; p < n; p += 1) if (edge[p] >= LINE.gradMin) bin[p] = 1 + Math.floor(((Math.atan2(gradY[p], gradX[p]) + Math.PI) / Math.PI) * (LINE.bins - 1) * 0.999);
  const runLen = new Int16Array(n);
  const DIRS = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const p = y * w + x;
    if (!bin[p]) continue;
    const b = bin[p];
    // the direction perpendicular to the gradient: along an edge, not across it
    const ang = ((b - 1) / (LINE.bins - 1)) * Math.PI - Math.PI / 2;
    const dx = Math.sign(Math.round(Math.cos(ang))), dy = Math.sign(Math.round(Math.sin(ang)));
    const q = (y + dy) * w + (x + dx);
    if (q < 0 || q >= n) continue;
    runLen[p] = bin[q] === b ? (runLen[q] || 0) + 1 : 1;
  }
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const p = y * w + x;
    if ((runLen[p] || 0) < LINE.minRun) continue;
    const r = LINE.minRun;
    for (let dy = -2; dy <= 2; dy += 1) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx += 1) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        line[yy * w + xx] = Math.min(1, line[yy * w + xx] + 0.34);
      }
    }
  }

  return {
    lum, flat, contrast, smooth, edge, line,
    // what the renderer uses: the flattened picture, with the ORIGINAL's colour but the FLATTENED light
    rgba: (() => {
      const out = new Uint8ClampedArray(n * 4);
      for (let i = 0; i < n; i += 1) {
        const p = i;
        const scale = smooth[p] / Math.max(1, lum[p]);
        out[i * 4] = Math.max(0, Math.min(255, src[i * 4] * scale));
        out[i * 4 + 1] = Math.max(0, Math.min(255, src[i * 4 + 1] * scale));
        out[i * 4 + 2] = Math.max(0, Math.min(255, src[i * 4 + 2] * scale));
        out[i * 4 + 3] = 255;
      }
      return out;
    })(),
    ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
  };
}

/** How much of a region is made of long straight lines: the sky/distance test, in one number. */
export function straightness(line, w, h, x0, y0, x1, y1) {
  let sum = 0, c = 0;
  for (let y = Math.max(0, y0); y < Math.min(h, y1); y += 1) for (let x = Math.max(0, x0); x < Math.min(w, x1); x += 1) { sum += line[y * w + x]; c += 1; }
  return c ? sum / c : 0;
}
