// A photograph in, an 8-bit picture of the same yard out. Pure: arrays in, arrays out.
//
//   1. grade       more contrast, more colour, purple shadows — the look (palette.js)
//   2. guided      an edge-preserving pass that removes sensor grain and JPEG blockiness WITHOUT crossing
//                  a surface boundary
//   3. palette     the 28 colours that describe THIS yard best
//   4. diffuse     each pixel takes its nearest palette colour and passes the error to its neighbours
//   5. ink         the strongest structure lines are drawn over it, one pixel wide
//
// The yard must stay the yard. What is red in the photograph is red in the picture.
//
// WHY THESE TWO CHANGES, AND WHY THEY WERE MEASURED RATHER THAN ASSUMED
// ---------------------------------------------------------------------
// The old pipeline quantised the raw photograph with a single ordered (Bayer) dither. Two things were
// wrong, and both are sourced:
//
//   DITHER. Surma's "Ditherpunk" states it plainly: "error diffusion algorithms ... can handle arbitrary
//   color palettes, while ordered dithering requires your color palette to be evenly spaced." This palette
//   is built from the photograph by median cut, so it is NOT evenly spaced. Bayer also carries a brightness
//   bias: "an area where every pixel has a brightness of 1/255 ... a level 0 Bayer matrix of size 2x2 will
//   make one out of the four pixels white, resulting in an average brightness of 25%". Floyd-Steinberg is
//   therefore the correct family here, not merely an alternative.
//
//   SMOOTHING. Quantising raw pixels leaves the photograph's own noise as 8-bit speckle, which reads as
//   detail but is not. A guided filter (He, Sun & Tang, ECCV 2010) is the right tool, and that paper says
//   why: it behaves "like the popular bilateral filter, but has better behavior near the edges" and "does
//   not suffer from the gradient reversal artifacts" — gradient reversal being exactly what would draw a
//   halo along a roofline against the sky. It is also O(N) in the window radius.
//
//   INK. Quantising a photograph keeps its edges low-contrast, because a quantiser can only pick the nearest
//   of 28 colours and an edge is usually between two of them. The creator's words were that "the borders of
//   the structures and elements are not really detailed", and that is exactly this: the boundary is there in
//   the luminance but nothing draws it. The operator is Canny's shape without its hysteresis — Sobel, then
//   NON-MAXIMUM SUPPRESSION across the gradient direction so the ridge collapses to one pixel, then a
//   threshold. The suppression is the part that matters: without it a Sobel threshold three pixels wide
//   reads as a shadow rather than as a drawn line. Canny's own hysteresis thresholds are NOT used, and the
//   often-quoted 2:1 or 3:1 ratio between them is not cited here because Canny's paper could not be opened.
//
// The parameters were chosen by measuring five variants on two real photographs
// (tools/stylise-compare.mjs) and then LOOKING at the results, because the metric alone misled: a heavy
// smoothing pass scored BEST on surface separation while visibly erasing the bench, the tree branches and
// the car's edges. r=1 with a small epsilon is the light touch that cleans the grain and keeps the
// structure. The heavy variants remain in the tool as the evidence for that decision.

import { grade, buildPalette, nearest, luma, COLOURS, OUTLINE, SIZE } from './palette.js';
import { skyAndGround, patternAtlas, offsetAt, MATERIALS } from './materials.js';
import { render as renderFlat, RAMPS, STEPS } from './flat.js';

// WHY eps IS 0.001 AND NOT 0.01. The first shipped version used 0.01 and the creator's verdict was that
// the picture was blurred with no style. That was correct, and the mechanism is the ratio var/(var+eps):
// at eps = 0.01 a window with a colour variance of about 0.0004 — ordinary texture — gets a = 0.04, so the
// output is 96% the local mean and the texture inside every surface is averaged away along with the noise.
// At eps = 0.001 the same window gets a = 0.29, so a third of the original survives and the surface keeps
// its character. Measured across the sweep: local noise falls the same way at both settings (road sd 21.5
// at 0.01 vs 16.8 at 0.001, against 21.5 unsmoothed), while between-surface distance stops collapsing
// (19.7 at 0.01 vs 23.0 at 0.001, against 25.6 unsmoothed). eps is the single knob that decides whether
// this pass cleans the grain or erases the picture.
export const GUIDED_R = 1;         // window radius. r=1 reaches only immediate neighbours: a light touch
export const GUIDED_EPS = 0.001;   // regularisation. Small enough that texture survives; see above
export const DITHER = 26;          // kept as the exported name; now the clamp on a diffused sample
export const INK = 0.45;           // how far a structure line is taken toward the palette's darkest colour
export const INK_KEEP = 0.18;      // the share of thin edge pixels kept: the strongest fifth becomes ink
export const INK_FLOOR = 24;       // gradient magnitude below which there is no edge at all, 0-255 luma
export const SEED = 7;             // the material patterns are seeded, so a yard always looks the same

// Box mean over a (2r+1) window, separable and O(N), so the radius is nearly free.
function boxMean(src, w, h, r) {
  const n = w * h, row = new Float32Array(n), out = new Float32Array(n);
  for (let y = 0; y < h; y += 1) {
    let acc = 0;
    for (let x = 0; x < w; x += 1) {
      acc += src[y * w + x];
      if (x > 2 * r) acc -= src[y * w + x - 2 * r - 1];
      row[y * w + x] = acc / Math.min(x + 1, 2 * r + 1);
    }
  }
  for (let x = 0; x < w; x += 1) {
    let acc = 0;
    for (let y = 0; y < h; y += 1) {
      acc += row[y * w + x];
      if (y > 2 * r) acc -= row[(y - 2 * r - 1) * w + x];
      out[y * w + x] = acc / Math.min(y + 1, 2 * r + 1);
    }
  }
  return out;
}

/**
 * The guided filter, per channel, with the image as its own guide (He, Sun & Tang 2010).
 *
 * For each window: a = var/(var+eps), b = mean − a·mean, then output = mean(a)·I + mean(b). Where the
 * window is flat, var ≪ eps so a → 0 and the output becomes the local mean: smoothing. Where there is an
 * edge, var ≫ eps so a → 1 and the output is the input: the edge is kept. That single ratio is the whole
 * mechanism, and it is why a boundary between two surfaces survives while the grain inside them does not.
 */
export function guided(rgba, w, h, r = GUIDED_R, eps = GUIDED_EPS) {
  const n = w * h, out = new Uint8ClampedArray(rgba.length);
  for (let ch = 0; ch < 3; ch += 1) {
    const p = new Float32Array(n);
    for (let i = 0; i < n; i += 1) p[i] = rgba[i * 4 + ch] / 255;
    const mean = boxMean(p, w, h, r);
    const pp = new Float32Array(n);
    for (let i = 0; i < n; i += 1) pp[i] = p[i] * p[i];
    const meanPp = boxMean(pp, w, h, r);
    const a = new Float32Array(n), b = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const varp = Math.max(0, meanPp[i] - mean[i] * mean[i]);
      a[i] = varp / (varp + eps);
      b[i] = mean[i] - a[i] * mean[i];
    }
    const ma = boxMean(a, w, h, r), mb = boxMean(b, w, h, r);
    for (let i = 0; i < n; i += 1) out[i * 4 + ch] = Math.max(0, Math.min(255, (ma[i] * p[i] + mb[i]) * 255));
  }
  for (let i = 3; i < out.length; i += 4) out[i] = 255;
  return out;
}

/**
 * Structure lines, drawn over a quantised picture, as palette indices.
 *
 * Sobel gradient, non-maximum suppression along the gradient, then keep the strongest `INK_KEEP` share and
 * move those pixels `INK` of the way toward the darkest colour in the palette. Taking the ink FROM the
 * palette rather than using pure black is what keeps it looking drawn in the picture's own colours instead
 * of pasted on top of it.
 *
 * It returns INDICES, not colours, because that is what the whole renderer draws from — a palette index per
 * pixel — so an ink pixel has to be a real palette entry like every other pixel, which is also why this
 * cannot invent a black the yard does not contain.
 */
export function inkOver(idx, src, w, h, palette, strength = INK) {
  const n = w * h;
  const g = new Float32Array(n);
  for (let i = 0; i < n; i += 1) g[i] = luma([src[i * 4], src[i * 4 + 1], src[i * 4 + 2]]) * 255;
  const mag = new Float32Array(n), dir = new Float32Array(n);
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const i = y * w + x;
    const gx = -g[i - w - 1] - 2 * g[i - w] - g[i - w + 1] + g[i + w - 1] + 2 * g[i + w] + g[i + w + 1];
    const gy = -g[i - w - 1] - 2 * g[i - 1] - g[i + w - 1] + g[i - w + 1] + 2 * g[i + 1] + g[i + w + 1];
    mag[i] = Math.sqrt(gx * gx + gy * gy);
    dir[i] = Math.atan2(gy, gx);
  }
  // THE FLOOR IS NOT OPTIONAL, and leaving it out is a bug that inks the entire picture.
  //
  // In a flat region the gradient is exactly 0, and 0 is a local maximum in every direction, so
  // non-maximum suppression alone marks almost every flat pixel as a thin edge. On a synthetic two-tone
  // image that was 5704 of 6144 pixels "thin", of which the great majority had a magnitude of 0; the
  // percentile cut then landed on 0 as well, and `mag < cut` was false for them, so every one became ink.
  // Canny's first threshold is what prevents this, and it is the threshold that is kept here: a pixel is an
  // edge only if it is a local maximum AND its gradient clears a floor. The second, higher threshold and the
  // hysteresis between them are NOT used — Canny's own paper could not be opened to verify the ratio.
  const thin = new Uint8Array(n);
  const at = (x, y) => mag[Math.round(y) * w + Math.round(x)] || 0;
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const i = y * w + x;
    if (mag[i] < INK_FLOOR) continue;
    const dx = Math.cos(dir[i]), dy = Math.sin(dir[i]);
    if (mag[i] >= at(x + dx, y + dy) && mag[i] >= at(x - dx, y - dy)) thin[i] = 1;
  }
  const vals = [];
  for (let i = 0; i < n; i += 1) if (thin[i]) vals.push(mag[i]);
  if (!vals.length) return idx;
  vals.sort((a, b) => a - b);
  // `cut` is never allowed below the floor, so the strongest-share rule cannot be defeated by a picture
  // whose edges are all weak.
  const cut = Math.max(INK_FLOOR, vals[Math.floor(vals.length * (1 - INK_KEEP))]);

  let ink = 0;
  for (let i = 1; i < palette.length; i += 1) {
    if (luma(palette[i]) < luma(palette[ink])) ink = i;
  }
  const [ir, ig, ib] = palette[ink];
  const cache = new Int16Array(32768).fill(-1);
  let drawn = 0;
  for (let i = 0; i < n; i += 1) {
    if (!thin[i] || mag[i] < cut) continue;
    const own = palette[idx[i]];
    const r = (own[0] * (1 - strength) + ir * strength) | 0;
    const g = (own[1] * (1 - strength) + ig * strength) | 0;
    const b = (own[2] * (1 - strength) + ib * strength) | 0;
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    // `nearest` defaults to scanning up to COLOURS entries; the palette handed in may be shorter, so the
    // bound is passed explicitly rather than relying on the default.
    if (cache[key] < 0) cache[key] = nearest(palette, r, g, b, Math.min(palette.length, SIZE));
    idx[i] = cache[key];
    drawn += 1;
  }
  idx.inkDrawn = drawn;
  return idx;
}

/**
 * THE PHOTOGRAPH -> THE SCENE, by the flat route. This is what the game uses.
 *
 * It replaces quantising the photograph's own pixels, which is the approach that made every yard look like a
 * different game and made surfaces indistinct — see the note at the top of flat.js. The flat route segments
 * the photograph into regions, paints each region ONE colour from a fixed palette of hue-shifted ramps, draws
 * the region borders, and absorbs orphan specks.
 *
 * The palette is deliberately small. Six ramps of four tones is twenty-four colours plus the outline and the
 * void, against the twenty-eight a median cut of the photograph would produce. Fewer colours is the point:
 * the style comes from the fixed STRUCTURE, and a photograph-derived palette is what makes two yards look
 * like two products.
 */
export function styliseFlat(rgba, w, h, opts = {}) {
  const st = renderFlat(rgba, w, h, opts);
  const n = w * h;
  // THE MATERIAL MAP, and it is derived from flat.js's OWN ramp table rather than from a guess.
  //
  // Two things need to know where the sky is: the window finder skips it, and the paint refuses to land on
  // it. Both read `what`, and an earlier version of this function returned null on the grounds that flat.js
  // does not classify materials. That was honest about the naming and wrong about the consequence:
  // `takesPaint` reads `!what || ... !== SKY`, so a null map means EVERY pixel takes paint, and a thrown ball
  // of paint landed on the sky. A flaw hidden by a test whose assertion was mislabelled.
  //
  // The map is built from the ramps themselves. A pixel's palette index is `ramp * STEPS + tone`, so its ramp
  // comes straight out of the index, and the ramp's own NAME says what it is. No colour rule, no threshold:
  // flat.js already decided, and this only reads back the decision.
  const OUT_I = st.palette.length - 2;
  const what = new Uint8Array(n);
  const SKY_AT = MATERIALS.indexOf('sky');
  for (let i = 0; i < n; i += 1) {
    const k = st.idx[i];
    if (k >= OUT_I) { what[i] = MATERIALS.length - 1; continue; }
    const ramp = RAMPS[(k / STEPS) | 0];
    what[i] = ramp && ramp.name === 'sky' ? SKY_AT : MATERIALS.length - 1;
  }
  return {
    idx: st.idx, palette: st.palette,
    // `smooth` is what the window finder reads for its colour checks. The flat picture has no smoothed
    // photographic layer, so the source pixels stand in — flat colours are flat already.
    smooth: rgba,
    surfaces: { what, horizon: 0, skyShare: 0, classes: MATERIALS },
    ink: null, regions: st.regions, outlinePixels: st.outlinePixels, style: 'flat',
  };
}

export function stylise(rgba, w, h) {
  const n = w * h;
  // the photograph's own darkest and brightest 1%
  const bins = new Uint32Array(256);
  for (let i = 0; i < n; i += 1) bins[Math.min(255, (luma([rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]]) * 255) | 0)] += 1;
  const at = (share) => { let seen = 0; for (let i = 0; i < 256; i += 1) { seen += bins[i]; if (seen >= share * n) return i / 255; } return 1; };
  const lo = at(0.01), hi = at(0.99);

  const graded = new Float32Array(n * 3);
  const sample = [];
  for (let i = 0; i < n; i += 1) {
    const c = grade(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], lo, hi);
    graded[i * 3] = c[0]; graded[i * 3 + 1] = c[1]; graded[i * 3 + 2] = c[2];
    if (i % 3 === 0) sample.push(c);
  }
  const palette = buildPalette(sample, COLOURS);

  // Guided pass on the graded pixels, so the palette is built from the same pixels that get quantised.
  const flat = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i += 1) {
    flat[i * 4] = graded[i * 3]; flat[i * 4 + 1] = graded[i * 3 + 1]; flat[i * 4 + 2] = graded[i * 3 + 2]; flat[i * 4 + 3] = 255;
  }
  const smooth = guided(flat, w, h);

  // Floyd-Steinberg. The error a pixel could not represent is pushed onto neighbours not yet visited,
  // which is what lets an uneven palette reproduce a smooth gradient without banding.
  // The surface map is computed BEFORE quantisation so the diffusion can be told what each pixel is made of.
  const surfaces = skyAndGround(smooth, w, h);
  const atlas = patternAtlas(SEED);
  const idx = new Uint8Array(n);
  const buf = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) { buf[i * 3] = smooth[i * 4]; buf[i * 3 + 1] = smooth[i * 4 + 1]; buf[i * 3 + 2] = smooth[i * 4 + 2]; }
  const cache = new Int16Array(32768).fill(-1);
  const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);

  for (let y = 0; y < h; y += 1) {
    // Serpentine: alternate the scan direction each row so the diffused error does not systematically
    // trail to one side, which is the usual visible artefact of a single-direction Floyd-Steinberg.
    const ltr = (y & 1) === 0;
    for (let k = 0; k < w; k += 1) {
      const x = ltr ? k : w - 1 - k;
      const i = y * w + x, p = i * 3;
      // the material's own pattern, added before the nearest colour is chosen
      const mat = offsetAt(atlas, surfaces.what, i, x, y);
      const r = clamp(buf[p] + mat), g = clamp(buf[p + 1] + mat), b = clamp(buf[p + 2] + mat);
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      // `nearest` defaults to scanning up to COLOURS entries; the palette handed in may be shorter, so the
    // bound is passed explicitly rather than relying on the default.
    if (cache[key] < 0) cache[key] = nearest(palette, r, g, b, Math.min(palette.length, SIZE));
      const q = cache[key];
      idx[i] = q;
      const er = r - palette[q][0], eg = g - palette[q][1], eb = b - palette[q][2];
      const d = ltr ? 1 : -1;
      const push = (dx, dy, wt) => {
        const nx = x + dx * d, ny = y + dy;
        if (nx < 0 || nx >= w || ny >= h) return;
        const o = (ny * w + nx) * 3;
        buf[o] += er * wt; buf[o + 1] += eg * wt; buf[o + 2] += eb * wt;
      };
      push(1, 0, 7 / 16); push(-1, 1, 3 / 16); push(0, 1, 5 / 16); push(1, 1, 1 / 16);
    }
  }
  inkOver(idx, smooth, w, h, palette);
  // The material layer uses only the two surfaces that can be found reliably: sky and ground. Sky is a FLAT
  // surface and gets no grain of its own, so it dithers as a smooth gradient instead of speckling; ground
  // gets the organic random pattern the pixel-art convention assigns to earth. Everything between the two is
  // left as it was, because those surfaces cannot be named without a model — see the measurements at the top
  // of materials.js. The split between them is the horizon this module measured.
  return { idx, palette, smooth, surfaces };
}
