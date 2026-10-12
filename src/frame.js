// What in this yard can be interacted with, and how.
//
// WHERE THESE OBJECTS COME FROM, AND WHY NOT FROM A MODEL
// -------------------------------------------------------
// The two things the creator asked to be able to do are (a) break a window and (b) throw colour at a wall, so
// the yard has to know which pixels are a wall and which are a window. The obvious source is a semantic
// segmenter, and one is available under a licence this project can use — tfjs-models' DeepLab v3 with the
// ADE20K base, Apache-2.0, whose label list in `deeplab/src/config.ts` includes, verbatim: `windowpane` at
// index 9, `door` at 15, `wall` at 1, `building` at 2, `tree` at 5, `glass` at 146.
//
// It was measured and it is not used here, for two reasons that are both decisive and neither of which is the
// licence:
//
//   1. SPEED. Loading is 3.3 s and one segmentation of one photograph takes **12.9 s** at the model's own
//      513x513 crop. The yard's own scan is 1.4-1.9 s. A twelve-second wait between taking a photograph and
//      playing it is not a game; it is a download with a progress bar.
//   2. IT DOES NOT FIND THE WINDOWS THAT ARE THERE. Run on the courtyard photograph it returns 25-34 classes
//      and the ones it names are sky, tree, building, tower, car, wall, sidewalk, road, fence, bench, column,
//      floor, chair, plant, rock, railing, stairs, person — with `windowpane` and `door` absent or at 0.0%.
//      Distinguishing building from tree it does well. Finding the window openings in a wall, on a photograph
//      taken from a balcony at an angle, it does not.
//
// So the windows come from the picture itself instead, which has two advantages that matter more than
// elegance: it costs nothing, and it is right there in the pixels the player is looking at.
//
// WHAT A WINDOW IS, AT 192 PIXELS
// --------------------------------
// The first version of this file took a window to be a region ENCLOSED by the ink layer's structure lines and
// flood-filled between them. Measured on the two test photographs and the drawn yard it found no window in
// any of them: the ink lines are one pixel wide and broken, so every fill leaked out through a gap and the
// "pane" was the whole wall (photograph a: one region of 46 035 pixels, the full frame). An outline that is
// not closed cannot enclose anything. That version is kept in git-ignored `__handoff-2026-10-12/`.
//
// What survives being scaled to 192 pixels is not the outline but the CONTRAST: a window is a small, compact
// patch that is darker than the wall round it. That is the facade colour half of the learning-free
// detectors — Recky & Leberl, "Windows Detection using K-Means in CIE-LAB Color Space" (ICPR 2010), a method
// that "does not require a learning step". Their precision and recall could not be obtained (the publisher's
// portal returns 403), so no accuracy figure is claimed for this implementation and none should be inferred.
//
//   * a pixel is DARK when it is well under the mean brightness of its own neighbourhood
//   * dark pixels that touch are one patch
//   * a patch is a window when it is small, fills its own box, is not sky, not already a found thing (a car's
//     windscreen belongs to the car), and the ring just outside it is brighter and is not foliage or sky
//
// It is a guess from the picture, and it is told apart from the detector's finds in the data (`flat`) and in
// the note under the yard. It misses windows in shadow and behind branches; it can take a dark doorway or a
// sign for a window. Both are stated, not hidden.

import { SKY } from './surfaces.js';
import { GLASS_HP } from './glass.js';

export const WINDOW = 'window';
export const WINDOWS_MAX = 6;      // more than this and the yard is windows; the real things are the point
export const NEIGHBOURHOOD = 24;   // pixels each way that "the wall round it" means: wider than a pane, or a pane is its own surroundings
export const DARKER = 16;          // how far under its neighbourhood a pane pixel must be, of 255
export const FILL = 0.55;          // the share of its own box a pane must fill; a branch or a shadow fills less
export const RING_BRIGHTER = 40;   // and how much brighter the ring outside the box must be than the inside
export const SMALLEST = 6;         // game pixels a side: smaller cannot be hit with a finger, and is mostly a door handle
export const LOWEST = 0.72;        // of the picture's height: under this a dark patch is a shadow on the ground

// Only the sky is trusted from the material map. Its `earth` is everything under the horizon, walls included
// (measured on the drawn yard: 38 208 of 49 152 pixels), so it cannot say that a patch lies on the ground.

/**
 * Find the windows.
 *
 * `rgba` is the photograph at `unit` picture-pixels per game pixel (w x h), so a window that is three pixels
 * of the 192-pixel yard is still nine or twelve pixels here and has a shape to judge. `what` is the material
 * map and `owner` the pixels already claimed by things the detector found, both at the GAME's size (gw x gh),
 * either may be null. Pure: arrays in, a list of boxes in game pixels out.
 */
export function findWindows({ rgba, w, h, unit = 1, what = null, owner = null, gw = w, gh = h }) {
  const n = w * h, k = Math.max(1, Math.round(unit));
  const game = (x, y) => Math.min(gh - 1, (y / unit) | 0) * gw + Math.min(gw - 1, (x / unit) | 0);
  const luma = new Float32Array(n), spread = new Uint8Array(n), blueLead = new Uint8Array(n);
  for (let i = 0; i < n; i += 1) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    spread[i] = Math.max(r, g, b) - Math.min(r, g, b);
    blueLead[i] = b > r ? 1 : 0;
  }
  // IS THIS PIXEL ACTUALLY SKY? A material map alone is not enough to answer that.
  //
  // The flat route builds its map from its ramps, so everything on the sky RAMP is labelled sky — and that
  // ramp also catches blue-ish shadow, which put wall pixels in it. Since the ring test rejects a window
  // whose surroundings are more than 8% sky, a wall mislabelled as sky threw away almost every window:
  // measured on the drawn yard, 1 window found with the map and 6 without it. The label is therefore
  // cross-checked against the pixel's own colour, which is what actually distinguishes sky: bright, and with
  // blue leading. The map still decides where paint may land, which is a separate question with a different
  // right answer.
  const isSky = (i) => luma[i] > 110 && blueLead[i] === 1;
  // the mean of each neighbourhood, from a summed-area table: one pass, whatever the neighbourhood
  const sum = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y += 1) {
    let row = 0;
    for (let x = 0; x < w; x += 1) { row += luma[y * w + x]; sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + row; }
  }
  const mean = (x0, y0, x1, y1) => {
    const a = Math.max(0, x0), b = Math.max(0, y0), c = Math.min(w, x1 + 1), d = Math.min(h, y1 + 1);
    return (sum[d * (w + 1) + c] - sum[b * (w + 1) + c] - sum[d * (w + 1) + a] + sum[b * (w + 1) + a]) / Math.max(1, (c - a) * (d - b));
  };
  const R = NEIGHBOURHOOD * k;
  let dark = new Uint8Array(n);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x, gi = game(x, y);
    if (what && what[gi] === SKY && isSky(i)) continue;
    if (owner && owner[gi] >= 0) continue;
    if (luma[i] < mean(x - R, y - R, x + R, y + R) - DARKER) dark[i] = 1;
  }

  // An opening (wear away, then grow back): a pane joined to a shadow by a thread of dark pixels is cut loose
  // from it, and a patch too thin to be a pane is dropped. Without it the dark patches of a photograph run
  // together — measured on photograph a, the wall's window was one patch with the doorway and filled 48% of
  // its box.
  const pass = (from, all) => {
    const to = new Uint8Array(n);
    for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x, near = from[i - 1] + from[i + 1] + from[i - w] + from[i + w] + from[i];
      if (all ? near === 5 : near > 0) to[i] = 1;
    }
    return to;
  };
  for (let t = 0; t < k; t += 1) dark = pass(dark, true);
  for (let t = 0; t < k; t += 1) dark = pass(dark, false);

  const seen = new Uint8Array(n), found = [], least = SMALLEST * k;
  for (let start = 0; start < n; start += 1) {
    if (!dark[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let count = 0, minX = w, maxX = -1, minY = h, maxY = -1, inside = 0;
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      count += 1; inside += luma[p];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && dark[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (bw < least || bh < least || bw > w * 0.3 || bh > h * 0.3) continue;
    if (count / (bw * bh) < FILL) continue;                 // a pane fills its box; a branch does not
    if (bw / bh < 0.3 || bw / bh > 3.2) continue;
    if ((minY + maxY) / 2 > h * LOWEST) continue;
    if (minX <= k || minY <= k || maxX >= w - 1 - k || maxY >= h - 1 - k) continue;   // cut by the frame: no ring to judge it by
    // the ring just outside the box: a wall is brighter than the pane, and less colourful than a tree
    let ringLuma = 0, ringSpread = 0, ringSky = 0, ringN = 0;
    const m = 2 * k;
    for (let y = minY - m; y <= maxY + m; y += 1) for (let x = minX - m; x <= maxX + m; x += 1) {
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) continue;
      if (x < 0 || y < 0 || x >= w || y >= h) continue;
      const i = y * w + x, gi = game(x, y);
      ringLuma += luma[i]; ringSpread += spread[i]; ringN += 1;
      if (what && what[gi] === SKY && isSky(i)) ringSky += 1;
    }
    if (!ringN) continue;
    const contrast = ringLuma / ringN - inside / count;
    if (contrast < RING_BRIGHTER) continue;
    if (ringSpread / ringN > 84) continue;                   // foliage or a painted sign, not a wall
    if (ringSky / ringN > 0.08) continue;                    // a dark thing against the sky is a roof or a branch
    const x = Math.round(minX / unit), y = Math.round(minY / unit);
    const gbw = Math.max(1, Math.round(bw / unit)), gbh = Math.max(1, Math.round(bh / unit));
    found.push({ x, y, w: gbw, h: gbh, area: gbw * gbh, contrast });
  }
  // the clearest first, and no two on top of each other
  found.sort((a, b) => b.contrast * Math.sqrt(b.area) - a.contrast * Math.sqrt(a.area));
  const keep = [];
  for (const f of found) {
    if (keep.length >= WINDOWS_MAX) break;
    if (keep.some((o) => f.x < o.x + o.w + 2 && o.x < f.x + f.w + 2 && f.y < o.y + o.h + 2 && o.y < f.y + f.h + 2)) continue;
    keep.push(f);
  }
  return keep;
}

/**
 * Put the windows among the yard's things, as things of their own.
 *
 * A window is the whole box, because Source's breakable surface is one quad ("Faces that will be broken must
 * have exactly four sides") and a pane with a ragged edge reads as a stain. `flat` says it is ON a wall and
 * not standing in the yard: it can be thrown at, and nobody walks into it or jumps onto it.
 */
export function addWindows(windows, regions, owner, w) {
  for (const win of windows) {
    const pixels = [];
    for (let y = win.y; y < win.y + win.h; y += 1) for (let x = win.x; x < win.x + win.w; x += 1) {
      if (owner[y * w + x] === -1) pixels.push(y * w + x);
    }
    if (pixels.length < win.area * 0.8) continue;
    const id = regions.length;
    for (const p of pixels) owner[p] = id;
    regions.push({
      id, kind: WINDOW, label: 'окно', score: 0, pixels: Int32Array.from(pixels), flat: true,
      x: win.x, y: win.y, w: win.w, h: win.h, cx: win.x + win.w / 2, cy: win.y + win.h / 2, area: pixels.length,
      hp: GLASS_HP, hits: 0, gone: false, seen: false,
    });
  }
  return regions;
}

/** Whether colour sticks at a point: anywhere that is not sky. A wall, a car, the ground — all take paint. */
export const takesPaint = (what, w, h, x, y) => {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;
  return !what || what[yi * w + xi] !== SKY;
};
