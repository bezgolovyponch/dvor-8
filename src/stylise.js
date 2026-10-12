// A photograph in, an 8-bit picture of the same yard out, in the game's ONE palette. Pure: arrays in,
// arrays out. The stages live in downscale.js, ramps.js and pixelart.js; this file runs them in order and
// keeps the guided filter, which still makes the smoothed picture the window finder and the sky/ground map
// read. Why each stage, what it replaced and the measurements behind it: docs/pixel-pipeline.md.
//
// The yard must stay the yard. What is red in the photograph is red in the picture — but in the GAME's red.
//
// WHAT CHANGED, IN ONE PARAGRAPH. The previous pipeline was grade → guided filter → median cut → Floyd-
// Steinberg → Sobel ink. Gerstner et al. (2012) name "downsampling followed by median cut" as the baseline
// pixel artists rate worst, and a palette cut from each photograph made every yard look like its own
// photograph: an overcast one grey-brown, a sunset one orange, with nothing tying them into one game. Now
// every photograph is forced into one fixed set of hue-shifted ramps, which is how pixel art gets a style.
//
import { OUTLINE_RGB, VOID_RGB } from './palette.js';
import { skyAndGround } from './materials.js';
import { masterRamps } from './ramps.js';
import { binDownscale } from './downscale.js';
import { grade, detail, mapRamps, cleanup, selOut } from './pixelart.js';

const RAMPS = masterRamps();

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
 * The photograph → the game's picture, in ONE fixed palette (ramps.js), so every yard looks like the same
 * game. The stages and the evidence for each are in docs/pixel-pipeline.md.
 *
 *   1. downscale   if a 3× crop is handed in, each game pixel is the dominant-lightness colour of its cell
 *                  (photo2pixel's bin vote), so railings, frames and posts survive the shrink
 *   2. grade       OKLab: the photo's own light range stretched, colour pushed up
 *   3. detail      local contrast on lightness, so a window a shade darker than its wall stays a window
 *   4. ramps       hue picks the ramp (from the neighbourhood), lightness picks the step; checker between
 *                  two steps only on smooth surfaces
 *   5. cleanup     stray single pixels take their neighbours' colour
 *   6. sel-out     a one-pixel line on the dark side of every boundary between two ramps
 *
 * `big` is { data, w, h }, the same crop at three picture-pixels to one (main.js already makes it for the
 * windows). Without it the small picture is used as it is.
 *
 * The return value is the shape the rest of the game was built on: palette indices, a table of 28 + 2
 * colours, the smoothed picture and the sky/ground map.
 */
export function stylise(rgba, w, h, big = null) {
  const n = w * h;
  const src = big && big.w >= w * 2 ? binDownscale(big.data, big.w, big.h, w, h) : rgba;
  const ramps = RAMPS;
  const lab = grade(src, n);
  detail(lab, w, h);
  const idx = mapRamps(lab, w, h, ramps);
  cleanup(idx, w, h);
  idx.inkDrawn = selOut(idx, w, h, ramps);
  const palette = [...ramps.map((r) => r.rgb.slice()), OUTLINE_RGB, VOID_RGB];
  const smooth = guided(src, w, h);
  const surfaces = skyAndGround(smooth, w, h);
  return { idx, palette, smooth, surfaces, ramps };
}
