// VECTOR TRACE — the r9 route: flat designed surfaces with straight edges, one colour per shape.
//
// WHY THIS REPLACES THE PER-PIXEL PAINTING. The per-pixel route was faithful and unstable: it dithered every
// surface, so a photograph became a halftone print; the segmentation merged across weak boundaries, so two
// facades of similar tone became one; and the boundaries it did produce were pixel-jagged, because a region's
// edge was whatever the pixels happened to do. r9 answers all three at once by refusing to paint per pixel:
//
//   1. SKY      the area connected to the top of the frame that reads as sky. One flat blue, and 1-5 DESIGNED
//               clouds - symmetric puffs with a flat base and one shaded row - placed where they fit and never
//               touching the skyline. The photograph's own clouds are not traced.
//   2. FOLIAGE  green masses, two tones of one green, so trees read as trees and not as texture.
//   3. SHAPES   everything else is a SHAPE with straight edges: the labels are traced as contours and the
//               contours are simplified into polylines, then filled back. This is the step that makes the
//               borders un-jagged and every angle deliberate.
//   4. COLOUR   one colour per shape. Hue picks the family, brightness picks the shade, and a warm surface
//               stays in ONE family - the brick church is red brick, not pink and orange patches, which is
//               what per-pixel ramp choice did to it.
//   5. CLEAN-UP specks below MIN_SHAPE pixels are removed, and small low-contrast specks are merged into what
//               surrounds them; small HIGH-contrast things (a window, a wing mirror) are kept.
//   6. LINE     one clean one-pixel line along the skyline, and nothing else. A line everywhere is a colouring
//               book; a line nowhere loses the building.
//
// MEASURED AGAINST THE PREVIOUS ROUTE, on the three photographs (see tools/style-metrics.mjs):
//   stray single pixels, specks under 4 px, same-colour blobs per 1000 px, and jagged border share.

import { facadeWindows } from './criteria/FacadeRule.js';
import { RAMPS, STEPS, paletteOf } from './flat.js';
import { makeScene, render as renderScene, census } from './scene.js';
import { enhance, straightness } from './enhance.js';

const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

// ---- colour helpers, written the way the ramps are: hue decides the family, value decides the tone ---------
function rgb2hsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = 60 * (((g - b) / d) % 6);
    else if (mx === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  return { h: ((h % 360) + 360) % 360, s: mx ? d / mx : 0, v: mx / 255 };
}
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

// The bands the route names. SKY is blue and bright; FOLIAGE is the green band. Everything else is a material.
export const SKY_HUE = [180, 265];
export const FOLIAGE_HUE = [65, 175];
export const SKY_MIN_V = 0.42;      // a sky is bright: dark blue is a wall in shadow
export const SKY_MAX_EDGE = 0.16;   // and it is smooth: a lot of edges in a blue area is a window or a tree

export const CLEAN = {
  minShape: 4,        // below this a shape is a speck and is removed (r9: "specks under 4 pixels are removed")
  mergeContrast: 26,  // and a small shape only merges into its surroundings when it is LOW contrast
  mergeBelow: 26,     // ...up to this area
  traceAbove: 10,     // shapes at least this big get their border straightened
  rdp: 1.35,          // polyline simplification tolerance, in pixels
  clouds: [1, 5],
  cloudsInset: 10,    // a cloud never comes closer than this to the skyline
};

/** The palette entry nearest a colour, but with the family chosen by HUE and the tone by VALUE (rule 4). */
// THE SKY FAMILY BELONGS TO THE SKY MASK AND TO NOTHING ELSE.
//
// This sent ANY blue-ish pixel to the sky family: `s > 0.10 && blue hue`. On a photograph of a blue-grey city -
// grey-blue facades, blue-grey asphalt, overcast light - that is nearly every pixel, and the drawn frame came out
// 96% sky by the family gate: the blue mush with one green patch, where the foliage pass was the only one that
// escaped. A pixel is painted in the sky family only while the sky itself is being painted; everywhere else a
// blue-ish colour goes to the palette's blue-tinted NEUTRAL (metal), which is what a shadowed wall and wet asphalt
// actually are.
let paintingSky = false;
function entryFor(palette, r, g, b) {
  const { h, s, v } = rgb2hsv(r, g, b);
  const wantSky = paintingSky && s > 0.10 && h >= SKY_HUE[0] && h <= SKY_HUE[1];
  const wantLeaf = h >= FOLIAGE_HUE[0] && h <= FOLIAGE_HUE[1] && s > 0.12;
  let family = null;
  if (wantSky) family = 'sky';
  else if (wantLeaf) family = 'foliage';
  // A GREY IS NOT AUTOMATICALLY COOL. The first version sent every desaturated pixel to the metal ramp, which
  // in this palette is blue-tinted, so a concrete wall and an asphalt road came out blue - the loudest failure
  // in the first r9 render. A grey goes to the ramp on ITS OWN side of neutral: bluish to metal, otherwise stone.
  else if (s < 0.14) family = b > r + 18 ? 'metal' : 'stone';
  else if (h < 20 || h >= 340) family = 'earth';                          // reds and browns: brick, soil, rust
  else if (h < 45) family = 'warm';                                       // orange and amber: sand, lit stone
  else if (h < 65) family = 'sand';                                       // yellow
  else family = 'stone';                                                  // anything left
  const want = RAMPS.findIndex((R) => R.name === family);
  let best = 0, bestD = Infinity;
  for (let i = 0; i < palette.length - 2; i += 1) {
    if (Math.floor(i / STEPS) !== (want < 0 ? Math.floor(i / STEPS) : want)) continue;
    const c = palette[i];
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  if (bestD === Infinity) {   // no ramp of that family: fall back to the nearest of all
    for (let i = 0; i < palette.length - 2; i += 1) {
      const c = palette[i];
      const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
      if (d < bestD) { bestD = d; best = i; }
    }
  }
  return best;
}

// ---- connected components, iterative: a 288x512 frame is 147k pixels and recursion would blow the stack ----
function components(w, h, same) {
  const label = new Int32Array(w * h).fill(-1);
  const parts = [];
  const stack = new Int32Array(w * h);
  for (let start = 0; start < w * h; start += 1) {
    if (label[start] >= 0) continue;
    const id = parts.length;
    const v = same(start);
    let top = 0;
    stack[top] = start;
    label[start] = id;
    const px = [];
    let minX = w, maxX = -1, minY = h, maxY = -1;
    while (top >= 0) {
      const p = stack[top];
      top -= 1;
      px.push(p);
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
      // MARK ON PUSH, not on pop: a pixel pushed twice is a pixel visited twice, and that is what made the
      // first version of this function fill the whole picture in one component and grow an array until the
      // engine refused it ("Invalid array length").
      if (x > 0 && label[p - 1] < 0 && same(p - 1) === v) { label[p - 1] = id; top += 1; stack[top] = p - 1; }
      if (x < w - 1 && label[p + 1] < 0 && same(p + 1) === v) { label[p + 1] = id; top += 1; stack[top] = p + 1; }
      if (y > 0 && label[p - w] < 0 && same(p - w) === v) { label[p - w] = id; top += 1; stack[top] = p - w; }
      if (y < h - 1 && label[p + w] < 0 && same(p + w) === v) { label[p + w] = id; top += 1; stack[top] = p + w; }
    }
    parts.push({ id, px, minX, maxX, minY, maxY, area: px.length });
  }
  return { label, parts };
}

/** Moore boundary tracing of one component: the outline, clockwise, as pixel coordinates. */
function outline(label, w, h, id, part) {
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? false : label[y * w + x] === id);
  let sx = -1, sy = -1;
  for (let y = part.minY; y <= part.maxY && sx < 0; y += 1) for (let x = part.minX; x <= part.maxX; x += 1) if (at(x, y)) { sx = x; sy = y; break; }
  if (sx < 0) return [];
  const N = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [];
  let cx = sx, cy = sy, dir = 6;   // entered from the west neighbour
  const guard = 8 * (part.area + 8);
  for (let n = 0; n < guard; n += 1) {
    pts.push([cx, cy]);
    let found = false;
    for (let k = 0; k < 8; k += 1) {
      const d = (dir + 5 + k) % 8;               // start from the pixel we came from, then turn
      const nx = cx + N[d][0], ny = cy + N[d][1];
      if (at(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
    }
    if (!found) break;
    if (cx === sx && cy === sy && pts.length > 3) break;
  }
  return pts;
}

/** Ramer-Douglas-Peucker: what turns a pixel-jagged outline into a deliberate polyline. */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let far = -1, fd = tol;
    for (let i = a + 1; i < b; i += 1) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Fill a simplified polygon back into the frame: even-odd scanline, which is what makes the edge straight. */
function fillPolygon(mask, w, h, poly, id) {
  if (poly.length < 3) return;
  let minY = h, maxY = 0;
  for (const [, y] of poly) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  for (let y = Math.max(0, minY); y <= Math.min(h - 1, maxY); y += 1) {
    const xs = [];
    for (let i = 0; i < poly.length; i += 1) {
      const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) / (y2 - y1)) * (x2 - x1));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = Math.max(0, Math.ceil(xs[i])), x1 = Math.min(w - 1, Math.floor(xs[i + 1]));
      for (let x = x0; x <= x1; x += 1) mask[y * w + x] = id;
    }
  }
}

/**
 * The designed cloud: evenly spaced symmetric puffs on a flat base with one shaded row along the bottom.
 * "Designed" is the whole point - the photograph's clouds are not traced, because traced clouds are what made
 * the sky look like weather rather than like a picture.
 */
function cloud(mask, w, h, cx, cy, size, colour, shade) {
  const rows = Math.max(3, Math.round(size * 0.55));
  const halfBase = Math.max(3, Math.round(size * 0.5));
  for (let r = 0; r < rows; r += 1) {
    const t = r / (rows - 1);                       // 0 at the base, 1 at the top
    const half = Math.round(halfBase * (1 - 0.72 * t * t));
    const y = cy + (rows - 1 - r);
    if (y < 0 || y >= h) continue;
    for (let x = cx - half; x <= cx + half; x += 1) {
      if (x < 0 || x >= w) continue;
      mask[y * w + x] = r === 0 ? shade : colour;    // the flat base row is the shaded one
    }
  }
}

/**
 * The whole route. Returns the game's own contract - palette indices and a palette - plus the measurements that
 * say whether it worked, and the windows it found as rectangles for the game to make destroyable.
 */
export function trace(rgba, w, h, opts = {}) {
  const t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const palette = opts.palette || paletteOf();
  // FIRST ENHANCE, THEN RECOGNISE. The shapes are found on the LIGHT-FLATTENED picture, so a wall in shadow and
  // the same wall in sun are one shape instead of two, and the grain of the asphalt is not a shape at all. The
  // colours that are ultimately painted still come from the ORIGINAL pixels: the enhancement decides where a
  // shape is, never what colour it is.
  const en = opts.preEnhanced || enhance(rgba, w, h, opts.enhance || {});
  const shapeRgba = en.rgba;
  const clean = { ...CLEAN, ...(opts.clean || {}) };
  const n = w * h;
  const idx = new Uint8Array(n).fill(255);          // 255 = "not painted yet"; palette indices are 0..49

  // ---- 1. sky, foliage, and everything else, by hue and smoothness --------------------------------------
  const src = new Uint8ClampedArray(rgba.buffer ? rgba.buffer : rgba, rgba.byteOffset || 0, n * 4);
  const shapeSrc = shapeRgba;
  const cls = new Uint8Array(n);          // 0 other, 1 sky-candidate, 2 foliage
  const rgb = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2];
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
    const { h: hue, s, v } = rgb2hsv(r, g, b);
    if (v >= SKY_MIN_V && s > 0.06 && hue >= SKY_HUE[0] && hue <= SKY_HUE[1]) cls[i] = 1;
    else if (s > 0.12 && hue >= FOLIAGE_HUE[0] && hue <= FOLIAGE_HUE[1]) cls[i] = 2;
  }
  // smoothness: how much the luma moves inside a small window. A sky is smooth; a blue window is not.
  const edge = new Float32Array(n);
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const p = y * w + x;
    const c = luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
    let m = 0;
    for (const q of [p - 1, p + 1, p - w, p + w]) m = Math.max(m, Math.abs(luma(rgb[q * 3], rgb[q * 3 + 1], rgb[q * 3 + 2]) - c));
    edge[p] = m / 255;
  }
  for (let i = 0; i < n; i += 1) if (cls[i] === 1 && edge[i] > SKY_MAX_EDGE) cls[i] = 0;
  // ...AND A SKY HAS NO LONG STRAIGHT LINES. Depth alone cannot tell sky from a distant city; straight-line
  // density can, and that is what the scene analysis found decisive. So a blue area that is full of long runs
  // is not sky here either - it is a distant tower, a crane or a blue-painted facade, and it is left as a shape.
  for (let i = 0; i < n; i += 1) if (cls[i] === 1 && en.line[i] > 0.34) cls[i] = 0;

  // the sky is the sky-candidate area CONNECTED TO THE TOP: a blue car below the horizon is not sky
  const sky = new Uint8Array(n);
  const coreSky = new Uint8Array(n);
  {
    const stack = [];
    for (let x = 0; x < w; x += 1) if (cls[x] === 1) { sky[x] = 1; coreSky[x] = 1; stack.push(x); }
    while (stack.length) {
      const p = stack.pop(), x = p % w, y = (p / w) | 0;
      if (x > 0 && cls[p - 1] === 1 && !sky[p - 1]) { sky[p - 1] = 1; coreSky[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && cls[p + 1] === 1 && !sky[p + 1]) { sky[p + 1] = 1; coreSky[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && cls[p - w] === 1 && !sky[p - w]) { sky[p - w] = 1; coreSky[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && cls[p + w] === 1 && !sky[p + w]) { sky[p + w] = 1; coreSky[p + w] = 1; stack.push(p + w); }
    }
  }
  // THE SKY IS THE WHOLE SKY, NOT ONLY ITS BLUE PARTS. A photograph's own clouds are warm or grey, so taking
  // only the blue pixels left every cloud standing as a traced shape on top of a flat blue field - which is
  // what "patchwork" meant in the first render. r9's rule is that the sky is the area the camera sees at
  // infinity: so the blue core grows into whatever is next to it that is SMOOTH and bright enough to be sky,
  // and it stops at the first real edge. That is a colour-based sky finder, and it needs no depth model.
  {
    let skyLuma = 0, k2 = 0;
    for (let i = 0; i < n; i += 1) if (sky[i]) { skyLuma += luma(rgb[i * 3], rgb[i * 3 + 1], rgb[i * 3 + 2]); k2 += 1; }
    skyLuma = k2 ? skyLuma / k2 : 160;
    // ...and it grows only inside the SKY BAND. Growth without that limit ran down the concrete wall and across
    // the distant buildings - both smooth and mid-bright, both "sky" by any local test - and swallowed the left
    // half of the picture as one flat field (sky went from 22% to 40% and the yard disappeared).
    const blueLine = new Int32Array(w).fill(-1);
    for (let x = 0; x < w; x += 1) for (let y = 0; y < h; y += 1) if (sky[y * w + x]) blueLine[x] = y;
    for (let pass = 0; pass < 8; pass += 1) {
      let grew = 0;
      for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
        const p = y * w + x;
        if (sky[p]) continue;
        // ...and never more than a few rows below the blue sky in that COLUMN. The first version allowed a
        // fixed margin and then, pass by pass, the sky walked down through the distant city in photo 2: the
        // horizon moved from a third of the way down to two thirds, and the towers it swallowed were gone.
        const limit = blueLine[x] >= 0 ? blueLine[x] + 3 : -1;
        if (limit >= 0 && y > limit) continue;
        if (edge[p] > SKY_MAX_EDGE) continue;                           // a real edge: a building, a tree, a mast
        const L = luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
        // A CLOUD IS BRIGHTER THAN THE BLUE IT SITS IN, and the first bound (1.3x) rejected every one of them,
        // so a sunset sky stayed a patchwork of traced cloud shapes and no designed cloud could be placed in
        // the gaps. The band limit above is what keeps this from eating the wall; the brightness bound only has
        // to exclude things that are far too dark to be sky.
        if (L < skyLuma * 0.6 || L > skyLuma * 2.2) continue;
        if (sky[p - 1] || sky[p + 1] || sky[p - w] || sky[p + w]) { sky[p] = 1; grew += 1; }
      }
      if (!grew) break;
    }
  }
  // AN OVERCAST SKY IS STILL A SKY. The blue test above finds a blue sky; on a grey day - the creator's Prague
  // photograph is overcast - it finds nothing, and the top of the frame was painted as noisy shapes instead of a
  // plane: the gate measured 52% flat with 0.39 colour changes per pixel in the sky band. So if the blue core is
  // small, the sky is found the way the scene analysis found it: WHATEVER IS CONNECTED TO THE TOP EDGE, IS SMOOTH
  // (low edge strength) AND HAS NO LONG STRAIGHT LINES (which is what separates sky from a distant city).
  {
    let core = 0;
    for (let i = 0; i < n; i += 1) if (coreSky[i]) core += 1;
    if (core / n < 0.08) {
      const stack = [];
      // AND IT IS BOUNDED. The first version flooded from the top edge through everything smooth, which on a
      // photograph with a soft mid-ground swallows the middle of the frame - and on the fidelity fixture it
      // swallowed the green mass, painted it blue and made the vegetation check read ZERO. A sky is at the TOP and
      // it is BRIGHTER than the frame: the flood now stops at half the frame's height and refuses dark pixels.
      // THE SKY IS AS BRIGHT AS THE SKY, not as bright as the frame. Using the frame-wide mean let the flood run
      // over any bright ground: on the fidelity fixture it claimed 28,372 of 28,672 pixels as SKY - including the
      // green mass - which is why the vegetation check read zero, and on a real photograph it swallows a lit
      // pavement the same way. The reference is the TOP ROW of the picture, which is sky by definition.
      let frameLuma = 0, k3 = 0;
      for (let x2 = 0; x2 < w; x2 += 1) { frameLuma += luma(rgb[x2 * 3], rgb[x2 * 3 + 1], rgb[x2 * 3 + 2]); k3 += 1; }
      frameLuma /= Math.max(1, k3);
      // A SKYLINE IS COMPUTED FIRST, and the flood may not cross it. The flood ran before the skyline existed and
      // used half the frame as its bound, so on any picture with a bright mid-ground it claimed the ground: on the
      // fidelity fixture, 28,372 of 28,672 pixels - green mass included - were sky. The skyline is now read from
      // the EDGE MAP: for each column, the first strong line below the top tenth of the frame, or the first row
      // whose luma falls well under the top row's. Nothing below it can be sky.
      const prelim = new Int32Array(w);
      for (let x2 = 0; x2 < w; x2 += 1) {
        const topL = luma(rgb[x2 * 3], rgb[x2 * 3 + 1], rgb[x2 * 3 + 2]);
        let y2 = Math.max(1, Math.floor(h * 0.10));
        for (; y2 < h; y2 += 1) {
          const p2 = y2 * w + x2;
          const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
          if (en.line[p2] > 0.5 || L < topL - 45) break;
        }
        prelim[x2] = Math.min(h - 1, y2);
      }
      const skyish = (p2) => {
        const y = (p2 / w) | 0, x2 = p2 % w;
        if (y > prelim[x2]) return false;                 // never below the photograph's own skyline
        const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
        return L >= frameLuma - 6;
      };
      for (let x = 0; x < w; x += 1) if (!sky[x] && skyish(x) && en.line[x] < 0.35 && edge[x] < SKY_MAX_EDGE * 2.2) { sky[x] = 1; stack.push(x); }
      while (stack.length) {
        const p2 = stack.pop(), x = p2 % w, y = (p2 / w) | 0;
        const nbs = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
        for (const [nx, ny] of nbs) {
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (sky[q] || !skyish(q) || en.line[q] > 0.35 || edge[q] > SKY_MAX_EDGE * 2.2) continue;
          sky[q] = 1; stack.push(q);
        }
      }
      let grown = 0;
      for (let i = 0; i < n; i += 1) if (sky[i]) grown += 1;
      if (grown / n > 0.05) { for (let x = 0; x < w; x += 1) coreSky[x] = sky[x]; }
    }
  }
  // ---- THE SKY CANNOT BE MOST OF THE PICTURE ----------------------------------------------------------
  //
  // Every bound tried so far - brightness, half the frame, a skyline read from the edge map - was still defeated on
  // a synthetic frame whose mid-ground is bright, and the probe showed why: 28,372 of 28,672 pixels were claimed as
  // sky. A sky deeper than two thirds of the frame is not a sky, it is a flood, so the mask is CLAMPED to the
  // MEDIAN column depth: a column may reach its own skyline or the median depth plus half of it, never more. This
  // is a property of skylines, not of this fixture.
  {
    const depth = new Int32Array(w);
    for (let x2 = 0; x2 < w; x2 += 1) {
      let d2 = 0;
      for (let y2 = 0; y2 < h; y2 += 1) if (sky[y2 * w + x2]) d2 = y2 + 1;
      depth[x2] = d2;
    }
    const sorted = Array.from(depth).sort((p2, q2) => p2 - q2);
    const median = sorted[Math.floor(sorted.length / 2)] || 0;
    const cap = Math.max(Math.floor(h * 0.12), Math.min(Math.floor(h * 0.66), Math.round(median * 1.5)));
    let cut = 0;
    for (let x2 = 0; x2 < w; x2 += 1) {
      if (depth[x2] <= cap) continue;
      for (let y2 = cap; y2 < h; y2 += 1) { const p2 = y2 * w + x2; if (sky[p2]) { sky[p2] = 0; cut += 1; } }
    }
    if (cut) sky.__cut = cut;
  }
  const skyline = new Int32Array(w).fill(h);       // the first non-sky row in each column
  for (let x = 0; x < w; x += 1) for (let y = 0; y < h; y += 1) if (!sky[y * w + x]) { skyline[x] = y; break; }
  let skys = null;
  let skyN = 0;
  for (let i = 0; i < n; i += 1) if (sky[i]) skyN += 1;

  // the sky's own colour: the median of the BLUE CORE, not of the grown region — the first version averaged
  // the sunset's own clouds into the sky and painted the whole upper half of the photograph beige.
  let sr = 0, sg = 0, sb = 0, k = 0;
  for (let i = 0; i < n; i += 1) if (coreSky[i]) { sr += rgb[i * 3]; sg += rgb[i * 3 + 1]; sb += rgb[i * 3 + 2]; k += 1; }
  k = Math.max(1, k);
  const skyColour = entryFor(palette, sr / k, sg / k, sb / k);
  // ---- POLICY (docs/render-policy.md): THE SKY IS DESIGNED, NOT FAITHFUL ---------------------------------
  //
  // The sky is the one class where the photograph carries no layout: clouds move, and the creator's Prague
  // photograph is overcast, so fidelity painted the top of the frame rgb(224,219,215) - "the sky just missing" -
  // while v9 (the screen the creator accepts) uses one designed blue with designed clouds. The policy table says
  // DESIGN for the sky and FAITHFUL for the road, the cars and the green, and this is the sky's half of it.
  const designedSky = entryFor(palette, 88, 154, 226);

  // ---- 2. everything that is not sky becomes shapes ------------------------------------------------------
  // A label map by colour, so shapes are areas of one colour: this is the "vector trace" input. The
  // quantisation is deliberately coarse - one family per shape is the rule, and coarse input makes big shapes.
  const key = new Int32Array(n);
  for (let i = 0; i < n; i += 1) {
    if (sky[i]) { key[i] = -1; continue; }
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const { h: hue, s, v } = rgb2hsv(shapeSrc[i * 4], shapeSrc[i * 4 + 1], shapeSrc[i * 4 + 2]);
    const band = s < 0.16 ? 8 : Math.min(7, Math.floor(hue / 45));       // 8 = the greys, else 45-degree bands
    // THE SHADE BAND IS TAKEN FROM THE FLATTENED LUMA, not the original: this is where "shadows are secondary"
    // is actually implemented. Two halves of one wall, one lit and one in shadow, land in the same band and
    // become ONE shape; the shadow comes back later as a tone on a shape that already exists.
    const lf = en.smooth[i];
    const shade = Math.min(3, Math.floor((lf / 255) * 4));
    key[i] = band * 4 + shade;
  }
  const { label, parts } = components(w, h, (p) => key[p]);

  // ---- 3. clean-up: specks out, small low-contrast specks merged ----------------------------------------
  const area = new Int32Array(parts.length);
  for (const part of parts) area[part.id] = part.area;
  const colour = parts.map((part) => {
    let r = 0, g = 0, b = 0;
    for (const p of part.px) { r += rgb[p * 3]; g += rgb[p * 3 + 1]; b += rgb[p * 3 + 2]; }
    return [r / part.area, g / part.area, b / part.area];
  });
  const neighbourOf = (part) => {                       // the label most of its border touches
    const count = new Map();
    for (const p of part.px) {
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        const l = label[q];
        if (l === part.id) continue;
        count.set(l, (count.get(l) || 0) + 1);
      }
    }
    let best = -1, bestN = 0;
    for (const [l, c] of count) if (c > bestN) { bestN = c; best = l; }
    return best;
  };
  let removed = 0, merged = 0;
  for (const part of parts) {
    if (part.area >= clean.minShape) continue;
    const to = neighbourOf(part);
    if (to < 0) continue;
    for (const p of part.px) label[p] = to;
    removed += part.area;
  }
  for (const part of parts) {
    if (part.area < clean.minShape || part.area > clean.mergeBelow) continue;
    // low contrast with what surrounds it = texture, and texture is what r9 removes; a window or a mirror is
    // high contrast and STAYS, which is why this is a contrast test and not a size test.
    const to = neighbourOf(part);
    if (to < 0) continue;
    const a = colour[part.id], b = colour[to] || a;
    const d = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
    if (d > clean.mergeContrast) continue;
    for (const p of part.px) label[p] = to;
    merged += part.area;
  }

  // labels can now be stale (a part merged into another); rebuild ids compactly and measure again
  const remap = new Map();
  const fresh = [];
  const lab = new Int32Array(n).fill(-1);
  for (let p = 0; p < n; p += 1) {
    if (key[p] === -1) continue;
    const l = label[p];
    if (l < 0) continue;
    let id = remap.get(l);
    if (id === undefined) { id = fresh.length; remap.set(l, id); fresh.push({ id, px: [], minX: w, maxX: -1, minY: h, maxY: -1, area: 0 }); }
    const part = fresh[id];
    part.px.push(p); part.area += 1;
    const x = p % w, y = (p / w) | 0;
    if (x < part.minX) part.minX = x; if (x > part.maxX) part.maxX = x;
    if (y < part.minY) part.minY = y; if (y > part.maxY) part.maxY = y;
    lab[p] = id;
  }

  // ---- 4. straight edges: trace each shape, simplify, fill back -----------------------------------------
  const straight = new Int32Array(lab);
  let traced = 0;
  for (const part of fresh) {
    if (part.area < clean.traceAbove) continue;
    const pts = outline(lab, w, h, part.id, part);
    if (pts.length < 8) continue;
    const poly = simplify(pts, clean.rdp);
    if (poly.length < 3) continue;
    for (const p of part.px) straight[p] = -1;          // clear, then fill the simplified polygon back
    fillPolygon(straight, w, h, poly, part.id);
    traced += 1;
  }
  // whatever the polygon fill lost, take back from the original label
  for (let p = 0; p < n; p += 1) if (key[p] !== -1 && straight[p] < 0 && lab[p] >= 0) {
    const x = p % w, y = (p / w) | 0;
    let ok = false;
    for (const q of [p - 1, p + 1, p - w, p + w]) if (q >= 0 && q < n && straight[q] === lab[p]) { ok = true; break; }
    if (ok) straight[p] = lab[p];
    else straight[p] = lab[p];
  }

  // CUT THE STAIRCASE — and it has to run AFTER the take-back, because the take-back puts back exactly the
  // pixels a fill misses and those are the stepped ones. A polygon filled one row at a time still steps
  // diagonally wherever its edge is not exactly vertical or horizontal, and those steps are what the "jagged"
  // number counts. Removing the corner pixel of every two-pixel step turns a staircase into a straight run.
  const cutCorners = (map) => {
    for (let y = 1; y < h - 2; y += 1) for (let x = 1; x < w - 2; x += 1) {
      const p = y * w + x, v = map[p];
      if (v < 0) continue;
      const r = map[p + 1], d = map[p + w], rd = map[p + w + 1];
      if (r === d && r !== v && rd === r) map[p] = r;
      const l = map[p - 1], ld = map[p + w - 1];
      if (l === d && l !== v && ld === l) map[p] = l;
    }
  };
  cutCorners(straight);
  cutCorners(straight);

  // ---- 5. one colour per shape --------------------------------------------------------------------------
  const shapeColour = new Map();
  for (const part of fresh) {
    if (shapeColour.has(part.id)) continue;
    let r = 0, g = 0, b = 0, c = 0;
    for (const p of part.px) { if (straight[p] !== part.id) continue; r += rgb[p * 3]; g += rgb[p * 3 + 1]; b += rgb[p * 3 + 2]; c += 1; }
    if (!c) { for (const p of part.px) { r += rgb[p * 3]; g += rgb[p * 3 + 1]; b += rgb[p * 3 + 2]; c += 1; } }
    shapeColour.set(part.id, [r / c, g / c, b / c]);
  }
  for (let p = 0; p < n; p += 1) {
    if (sky[p]) { idx[p] = designedSky; continue; }
    const id = straight[p];
    // A PIXEL THAT IS IN NO SHAPE KEEPS ITS OWN COLOUR. This branch painted every unassigned pixel with the SKY
    // entry, so anything the shape step did not claim - a green mass, a lit pavement, an entire synthetic frame -
    // came out BLUE. That is the fault the vegetation check kept naming: the green was not eaten by the line layer
    // or by the road, it was painted as sky. Only pixels the sky analysis actually claimed are sky.
    if (id < 0) { idx[p] = entryFor(palette, rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]); continue; }
    const c = shapeColour.get(id) || [128, 128, 128];
    // A CHROMA-RICH PIXEL KEEPS ITS OWN COLOUR FAMILY. Using only the shape's MEAN colour made vegetation
    // disappear: a patch of green inside a larger, greyer shape was averaged into the wall's tone, so the
    // photograph's trees were lost - the opposite failure of the reference's invented trees, and the fidelity
    // check caught it (0 foliage pixels on a fixture that has green). Where a pixel is saturated enough to have a
    // colour of its own, that colour picks the ramp; the shape's mean decides only the quiet parts.
    const own = rgb2hsv(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
    idx[p] = own.s >= 0.22 ? entryFor(palette, rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]) : entryFor(palette, c[0], c[1], c[2]);
  }

  // ---- 5a. THE FACADES, AND ONE TONE PER FACADE --------------------------------------------------------
  //
  // The scene analysis: "buildings now each get their own shading". Two facades at right angles catch the light
  // differently and a drawing says so with a tone, not with a line - which is also what makes two adjacent
  // buildings tell themselves apart, the thing that colour-driven merging could never do.
  //
  // The plane is taken from the STRUCTURE, not from the colour: flat (few long lines of its own), bright enough
  // to be masonry, not sky and not foliage, joined into connected planes. The window pass below reads these very
  // planes, so a wall and its openings cannot disagree about where the wall is.
  const facadePlanes = (() => {
    const wallMask = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (sky[p2] || cls[p2] === 2) continue;
      const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
      if (L < 62) continue;
      if (en.line[p2] > 0.55) continue;                 // a line is an edge, not a wall face
      wallMask[p2] = 1;
    }
    return components(w, h, (p2) => wallMask[p2]).parts.filter((q) => q.area / n >= 0.015);
  })();
  {
    // Each plane's own tone, spread across the stone ramp by its mean luma, but pushed apart so two planes that
    // measure almost the same still LOOK like two planes: a drawing separates them, a photograph may not.
    const tones = facadePlanes.map((part) => {
      let L = 0;
      for (const p2 of part.px) L += luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
      return L / Math.max(1, part.px.length);
    }).sort((a, b) => a - b);
    const rank = new Map();
    facadePlanes.forEach((part, i) => rank.set(part.id, tones.indexOf(tones[i])));
    for (const part of facadePlanes) {
      let r = 0, g = 0, b = 0;
      for (const p2 of part.px) { r += rgb[p2 * 3]; g += rgb[p2 * 3 + 1]; b += rgb[p2 * 3 + 2]; }
      const c = Math.max(1, part.px.length);
      const shade = en.smooth[part.px[Math.floor(part.px.length / 2)]] / 255;
      // two steps of the plane's own ramp, chosen by its brightness, so a lit face and a shaded face differ
      const want = shade > 0.62 ? 1.16 : shade > 0.42 ? 1.0 : 0.86;
      const entry = entryFor(palette, (r / c) * want, (g / c) * want, (b / c) * want);
      // THE WALL IS BUILT, NOT PHOTOGRAPHED: one tone for the plane, and a second, darker tone on the pixels
      // whose own edges say the surface turns away - so a facade reads as masonry with light on it rather than
      // as a photograph someone tinted.
      // THE WALL IS A PLANE, NOT A PER-PIXEL DECISION (row 51).
      //
      // The first version chose the wall's tone PER PIXEL (`en.line > 0.25 ? shade : entry`), which carried the
      // photograph's own noise into the surface: the gate measured 49% flat and 0.41 colour changes per pixel at
      // the top of the frame, where the style is supposed to decide. A plane is now painted in BLOCKS of 8x8: the
      // whole plane takes its tone, and a block whose own mean is clearly darker takes the turned-away tone. Every
      // 8x8 area is one colour, the layout is still the photograph's (the blocks that are darker in the
      // photograph are the blocks that turn away), and the window sprites are drawn on top afterwards.
      // A FACADE IS THREE PLANES, NOT TWO - v9's buildings read as SOLIDS because their faces carry real value
      // steps. One tone plus a 14%-darker twin gives a lattice: every block the same value, the eye reads it as
      // wallpaper rather than as a wall. The plane's own pixels are split into their luma TERCILES and each third
      // takes a step of the SAME ramp: the lit face one tone up, the plain face at the plane's tone, the
      // turned-away face TWO tones down. Three bands of one family, two steps apart at the extremes - which is
      // what period art uses to make a box look like a box.
      const family = Math.floor(entryFor(palette, r / c, g / c, b / c) / STEPS);
      const toneAt = (n) => family * STEPS + Math.max(0, Math.min(STEPS - 1, n));
      const baseTone = Math.max(1, Math.min(STEPS - 2, Math.round((1 - (r + g + b) / (3 * 255)) * (STEPS - 1))));
      const litEntry = toneAt(baseTone + 1);
      const midEntry = toneAt(baseTone);
      const shadeEntry = toneAt(Math.max(0, baseTone - 2));
      const BLOCK = 8;
      const planeMean = (() => {
        let sum = 0, k2 = 0;
        for (const p2 of part.px) { if (sky[p2] || idx[p2] === skyColour) continue; sum += en.smooth[p2]; k2 += 1; }
        return k2 ? sum / k2 : 128;
      })();
      const blocks = new Map();
      let lo = 1e9, hi = -1e9;
      for (const p2 of part.px) {
        if (sky[p2] || idx[p2] === skyColour) continue;
        const L = en.smooth[p2];
        if (L < lo) lo = L;
        if (L > hi) hi = L;
        const bx = ((p2 % w) / BLOCK) | 0, by = (((p2 / w) | 0) / BLOCK) | 0;
        const k2 = by * 4096 + bx;
        const b2 = blocks.get(k2) || { sum: 0, n: 0, px: [] };
        b2.sum += L; b2.n += 1; b2.px.push(p2);
        blocks.set(k2, b2);
      }
      // the plane's OWN terciles decide which face a block is: the photograph says where the light falls, and the
      // palette says how far apart the faces stand
      const t1 = lo + (hi - lo) / 3, t2 = lo + ((hi - lo) * 2) / 3;
      for (const b2 of blocks.values()) {
        const m = b2.sum / b2.n;
        const face = m > t2 ? litEntry : m > t1 ? midEntry : shadeEntry;
        for (const p2 of b2.px) idx[p2] = face;
      }
      void planeMean; void entry;
    }
  }

  // ---- 5b. WINDOWS AS OBJECTS ---------------------------------------------------------------------------
  //
  // A courtyard is mostly facade, and a facade is mostly windows, so windows are where the picture has to be
  // exact: they must be VISIBLE as openings and they must be INDIVIDUAL, because the game gives each one its
  // own hit points. They are found geometrically - a dark, rectangular, filled area inside bright wall - which
  // needs no model, no depth and no colour: the wall is bright and smooth, the opening is dark and rectangular,
  // and a facade has its openings in rows and columns.
  const WIN = { minArea: 0.0003, maxArea: 0.03, aspect: [0.35, 2.6], fill: 0.62, drop: 20, group: 2, max: 48 };
  // `windowsFound` holds what the local-contrast pass found; the grid pass below adds the ones the rhythm of
  // the facade implies but the contrast test missed, and the game gets the union.
  const windowsFound = [];
  {
    // THE OPENING IS DARK RELATIVE TO ITS OWN SURROUNDINGS, measured against a blurred copy of the frame rather
    // than against a fixed threshold. A global "darker than 118" test found NOTHING on any of the three
    // photographs: a white-painted wall at dusk and a brick facade in daylight put their windows at completely
    // different absolute levels, and any single number is wrong for one of them. A box blur makes the test
    // local, which is what "an opening in a wall" actually means.
    const R = 6;
    const integral = new Float64Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y += 1) {
      let rowSum = 0;
      for (let x = 0; x < w; x += 1) {
        const p = y * w + x;
        rowSum += luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
        integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
      }
    }
    const boxMean = (x, y, r) => {
      const x0 = Math.max(0, x - r), y0 = Math.max(0, y - r), x1 = Math.min(w - 1, x + r), y1 = Math.min(h - 1, y + r);
      const sum = integral[(y1 + 1) * (w + 1) + (x1 + 1)] - integral[y0 * (w + 1) + (x1 + 1)] - integral[(y1 + 1) * (w + 1) + x0] + integral[y0 * (w + 1) + x0];
      return sum / ((x1 - x0 + 1) * (y1 - y0 + 1));
    };
    const dark = new Uint8Array(n);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const p = y * w + x;
      if (sky[p]) continue;
      const L = luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
      if (boxMean(x, y, R) - L < WIN.drop) continue;
      if (cls[p] === 2) continue;                     // foliage, not wall: a dark gap in leaves is not a window
      dark[p] = L < 150 ? 1 : 0;
    }
    const { parts: dparts } = components(w, h, (p) => dark[p]);
    for (const d of dparts) {
      if (d.area / n < WIN.minArea || d.area / n > WIN.maxArea) continue;
      const wd = d.maxX - d.minX + 1, ht = d.maxY - d.minY + 1;
      const aspect = wd / ht;
      if (aspect < WIN.aspect[0] || aspect > WIN.aspect[1]) continue;
      const fill = d.area / (wd * ht);
      if (fill < WIN.fill) continue;
      const mx = Math.round((d.minX + d.maxX) / 2), my = Math.round((d.minY + d.maxY) / 2);
      let inside = 0;
      for (const p of d.px) inside += luma(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]);
      inside /= d.area;
      windowsFound.push({ x: d.minX, y: d.minY, w: wd, h: ht, cx: d.minX + wd / 2, cy: d.minY + ht / 2, area: d.area / n, fill: +fill.toFixed(2), drop: Math.round(boxMean(mx, my, R) - inside), px: d.px });
    }
    // A FACADE IS A RHYTHM, SO SAMPLE IT AS ONE. The component test above finds a window when an opening is
    // clean and isolated; on a real street most openings are small, partly occluded or soft-edged and it finds
    // one or two. But their RHYTHM survives: project the dark pixels of a wall onto its rows and its columns and
    // the windows show up as periodic peaks even when not one of them is individually clean. That is the
    // classic facade-grammar reading and it is what makes a grid recoverable from a bad sample - which is the
    // honest fix for the under-detection recorded in D52.
    const facadeSamples = [];
    {
      const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : 0);
      const peaksOf = (profile, min) => {
        const out = [];
        for (let i = 1; i < profile.length - 1; i += 1) {
          if (profile[i] >= min && profile[i] >= profile[i - 1] && profile[i] >= profile[i + 1]) out.push(i);
        }
        // thin the peaks: neighbouring maxima are one opening
        const thin = [];
        for (const i of out) { const last = thin[thin.length - 1]; if (last === undefined || i - last > 3) thin.push(i); }
        return thin;
      };
      // A FACADE IS NOT ONE OF THE COLOUR SHAPES. Testing the colour shapes for a rhythm found NOTHING on any
      // photograph, because the quantisation splits a wall into dozens of pieces and none of them is a building.
      // The wall is instead taken from the STRUCTURE: flat (no long lines of its own), not sky, not foliage,
      // bright enough to be masonry - and then joined into one connected plane. That is what a facade is, and it
      // is the same lesson as the sky: the unit of the parse is the structure, not the colour.
      for (const part of facadePlanes) {
        if (part.area / n < 0.02) continue;                       // a wall is big
        const wd0 = part.maxX - part.minX + 1, ht0 = part.maxY - part.minY + 1;
        if (ht0 < 24 || wd0 < 24) continue;
        // how much of this plane is openings at all: a wall of brick is 3% dark, a plane that is ALL shadow is
        // not a facade and must be skipped
        let darkN = 0;
        for (const p2 of part.px) if (dark[p2]) darkN += 1;
        const darkShare = darkN / part.area;
        if (darkShare < 0.02 || darkShare > 0.6) continue;
        const rowP = new Float32Array(ht0), colP = new Float32Array(wd0);
        for (const p2 of part.px) {
          if (!dark[p2]) continue;
          rowP[((p2 / w) | 0) - part.minY] += 1;
          colP[(p2 % w) - part.minX] += 1;
        }
        const rMean = rowP.reduce((a, b) => a + b, 0) / ht0, cMean = colP.reduce((a, b) => a + b, 0) / wd0;
        const rPeaks = peaksOf(rowP, rMean * 1.3), cPeaks = peaksOf(colP, cMean * 1.3);
        if (rPeaks.length + cPeaks.length < 3) continue;          // no rhythm here
        const sizeAt = (profile, idx, mean) => {
          let a = idx, b = idx;
          while (a > 0 && profile[a - 1] > mean * 0.8) a -= 1;
          while (b < profile.length - 1 && profile[b + 1] > mean * 0.8) b += 1;
          return Math.max(3, b - a + 1);
        };
        const hgt = med(rPeaks.map((i) => sizeAt(rowP, i, rMean))) || 8;
        const wid = med(cPeaks.map((i) => sizeAt(colP, i, cMean))) || 8;
        for (const ry of rPeaks) for (const cx of cPeaks) {
          const cy = part.minY + ry, x = part.minX + cx;
          // the crossing must actually be dark in the wall
          let d2 = 0, t2 = 0;
          for (let yy = cy - 1; yy <= cy + 1; yy += 1) for (let xx = x - 1; xx <= x + 1; xx += 1) {
            if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
            t2 += 1; if (dark[yy * w + xx]) d2 += 1;
          }
          if (!t2 || d2 / t2 < 0.5) continue;
          facadeSamples.push({ x: Math.round(x - wid / 2), y: Math.round(cy - hgt / 2), w: wid, h: hgt, cx, cy, area: (wid * hgt) / n, fill: 0.7, drop: 0, sample: true, px: [] });
        }
      }
    }
    windowsFound.push(...facadeSamples);

    // IN ROWS OR COLUMNS: two openings that line up are a facade; one dark rectangle on its own is a shadow.
    const rows = new Map(), cols = new Map();
    for (const q of windowsFound) {
      rows.set(Math.round(q.cy / 12), (rows.get(Math.round(q.cy / 12)) || 0) + 1);
      cols.set(Math.round(q.cx / 12), (cols.get(Math.round(q.cx / 12)) || 0) + 1);
    }
    let kept = windowsFound.filter((q) => q.sample || rows.get(Math.round(q.cy / 12)) >= WIN.group || cols.get(Math.round(q.cx / 12)) >= WIN.group);
    // F11: A WINDOW IS SMALL. The rhythm reader could return a rectangle the size of a whole building - the
    // creator photographed it as a black block with speckles, because a window sprite is a dark frame round dark
    // glass, and at building size that is a black slab. A window is clamped to what a window can be: under 15% of
    // the frame in either direction, and under 4% of its area. Anything larger is not a window but a plane, and
    // planes are painted by the facade pass.
    kept = kept.filter((q) => q.w < w * 0.15 && q.h < h * 0.15 && (q.w * q.h) / (w * h) < 0.04);
    // ...and if a picture has no facade to line up (a courtyard seen from above, a street at an angle), keep the
    // unambiguous ones rather than nothing: a very rectangular, clearly darker opening is a window anywhere.
    if (!kept.length) kept = windowsFound.filter((q) => q.fill >= 0.72 && q.drop >= 30);
    kept.sort((a, b) => b.area - a.area);
    kept = kept.slice(0, WIN.max);
    const darkEntry = entryFor(palette, 34, 34, 46);
    for (const q of kept) for (const p of q.px) idx[p] = darkEntry;
    windowsFound.push(...kept.splice(kept.length));   // (kept is now empty; windowsFound already holds the rest)
    // a sample that came from the rhythm has no pixels of its own yet; give it the box's pixels so it paints
    for (const q of kept) if (!q.px.length) { for (let yy = q.y; yy < q.y + q.h; yy += 1) for (let xx = q.x; xx < q.x + q.w; xx += 1) if (xx >= 0 && yy >= 0 && xx < w && yy < h) q.px.push(yy * w + xx); }
    const final = windowsFound.filter((q) => q.px.some((p) => idx[p] === darkEntry));
    windowsFound.length = 0;
    windowsFound.push(...final);
  }

  // ---- 5c. THE WINDOW GRID: the fundamental detail that makes a building a building ---------------------
  //
  // A facade is not "a wall with some dark rectangles in it", it is a GRID: the openings line up in rows and
  // columns and repeat, and that repetition is most of what makes a building read as a building at this size.
  // The scene analysis this follows found the same thing from the other end ("the tower's window grid reads"),
  // and it is also how a facade is drawn by hand.
  //
  // So the windows found in 5b are treated as SAMPLES of a grid rather than as the whole answer: their centres
  // are clustered into rows and columns, the spacing and the size are taken as the median of each row, and the
  // grid is then completed across the wall where the wall actually is. That is what turns one or two found
  // openings into a facade that reads, which is the honest fix for the under-detection recorded in D52.
  const gridWindows = [];
  {
    const grp = (vals, tol) => {
      const sorted = [...vals].sort((a, b) => a - b), out = [];
      for (const v of sorted) {
        const last = out[out.length - 1];
        if (last && v - last.max <= tol) { last.vals.push(v); last.max = v; }
        else out.push({ vals: [v], max: v });
      }
      return out.map((g) => g.vals.reduce((a, b) => a + b, 0) / g.vals.length);
    };
    const sample = windowsFound.filter((q) => q.fill >= 0.6);
    if (sample.length >= 3) {
      const med = (a) => a.slice().sort((x, y) => x - y)[a.length >> 1];
      const mw = med(sample.map((q) => q.w)), mh = med(sample.map((q) => q.h));
      const rows = grp(sample.map((q) => q.cy), Math.max(4, mh * 0.6));
      const cols = grp(sample.map((q) => q.cx), Math.max(4, mw * 0.6));
      if (rows.length && cols.length) {
        // the pitch: the median gap between neighbouring columns and rows, so the grid is the building's own
        const pitch = (list, size) => {
          const gaps = [];
          for (let i = 1; i < list.length; i += 1) gaps.push(list[i] - list[i - 1]);
          const g = gaps.length ? med(gaps) : size * 1.6;
          return Math.max(size * 1.15, Math.min(size * 4, g));
        };
        const px = pitch(cols, mw), py = pitch(rows, mh);
        const frames = new Set(sample.map((q) => `${Math.round(q.cx / 6)}:${Math.round(q.cy / 6)}`));
        for (const ry of rows) for (const cxBase of cols) {
          for (let k = -3; k <= 3; k += 1) {
            const cx = Math.round(cxBase + k * px), cy = Math.round(ry);
            const x = Math.round(cx - mw / 2), y = Math.round(cy - mh / 2);
            if (x < 1 || y < 1 || x + mw >= w - 1 || y + mh >= h - 1) continue;
            const key2 = `${Math.round(cx / 6)}:${Math.round(cy / 6)}`;
            if (frames.has(key2)) continue;                        // one already found here
            // only place a window where the WALL is: the ring around it must be wall-coloured (bright, flat,
            // and not sky), otherwise the grid would march across a window, a tree, or the sky itself
            let wallish = 0, tot = 0, bright = 0;
            for (let yy = y - 3; yy <= y + mh + 3; yy += 1) {
              if (yy < 0 || yy >= h) continue;
              for (let xx = x - 3; xx <= x + mw + 3; xx += 1) {
                if (xx < 0 || xx >= w) continue;
                const p2 = yy * w + xx;
                if (xx >= x && xx < x + mw && yy >= y && yy < y + mh) continue;
                tot += 1;
                if (sky[p2]) continue;
                const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
                if (L > 92) bright += 1;
                if (en.line[p2] < 0.5) wallish += 1;
              }
            }
            if (!tot || bright / tot < 0.6 || wallish / tot < 0.7) continue;
            // and the opening itself must be darker than that wall, or it is not an opening
            let insideL = 0, c2 = 0;
            for (let yy = y; yy < y + mh; yy += 1) for (let xx = x; xx < x + mw; xx += 1) { insideL += luma(rgb[(yy * w + xx) * 3], rgb[(yy * w + xx) * 3 + 1], rgb[(yy * w + xx) * 3 + 2]); c2 += 1; }
            insideL /= Math.max(1, c2);
            let ringL = 0, r2 = 0;
            for (let yy = y - 3; yy <= y + mh + 3; yy += 1) {
              if (yy < 0 || yy >= h) continue;
              for (let xx = x - 3; xx <= x + mw + 3; xx += 1) {
                if (xx < 0 || xx >= w || (xx >= x && xx < x + mw && yy >= y && yy < y + mh)) continue;
                ringL += luma(rgb[(yy * w + xx) * 3], rgb[(yy * w + xx) * 3 + 1], rgb[(yy * w + xx) * 3 + 2]); r2 += 1;
              }
            }
            ringL /= Math.max(1, r2);
            if (ringL - insideL < 14) continue;
            gridWindows.push({ x, y, w: mw, h: mh, cx, cy, grid: true, px: (() => { const a = []; for (let yy = y; yy < y + mh; yy += 1) for (let xx = x; xx < x + mw; xx += 1) a.push(yy * w + xx); return a; })() });
          }
        }
      }
    }
  }
  if (gridWindows.length) {
    // A WINDOW IS A SPRITE OF THREE PARTS, the way v6 builds one: a dark FRAME round the opening, the GLASS
    // inside it, and a SILL of one lighter row under the frame. The first version painted each window as one
    // dark rectangle, which is a hole in a photograph rather than a window in a wall.
    const winEntry = entryFor(palette, 40, 42, 58);
    const glassEntry = entryFor(palette, 58, 74, 104);
    const frameEntry = entryFor(palette, 176, 178, 190);
    const sillEntry = entryFor(palette, 208, 206, 198);
    for (const q of [...windowsFound, ...gridWindows]) {
      // glass inside, frame round it: the outer ring of the opening is the frame, the rest is glass
      for (const p2 of q.px) {
        const x = p2 % w, y = (p2 / w) | 0;
        const onFrame = x === q.x || y === q.y || x === q.x + q.w - 1 || y === q.y + q.h - 1;
        idx[p2] = onFrame ? winEntry : glassEntry;
      }
      // and the SILL: one row of lighter masonry directly under the frame
      for (let xx = q.x; xx < q.x + q.w; xx += 1) {
        const yy = q.y + q.h + 1;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w) {
          const p2 = yy * w + xx;
          if (!sky[p2] && idx[p2] !== winEntry) idx[p2] = sillEntry;
        }
      }
      // a one-pixel frame one tone up, so a window is a window and not a hole in the picture
      for (let xx = q.x - 1; xx <= q.x + q.w; xx += 1) {
        for (const yy of [q.y - 1, q.y + q.h]) {
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          const p2 = yy * w + xx;
          if (!sky[p2] && idx[p2] !== winEntry) idx[p2] = frameEntry;
        }
      }
      for (let yy = q.y - 1; yy <= q.y + q.h; yy += 1) {
        for (const xx of [q.x - 1, q.x + q.w]) {
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) continue;
          const p2 = yy * w + xx;
          if (!sky[p2] && idx[p2] !== winEntry) idx[p2] = frameEntry;
        }
      }
    }
    windowsFound.push(...gridWindows);
  }

  // ---- 5d. THE OBJECTS: outline, body, glass -----------------------------------------------------------
  //
  // The scene analysis: "the BMW looks like a car (white body, dark glass, outline)". That is a fundamentals
  // pass - three things that make a photographed object read as an object at 288 px, and no more:
  //
  //   OUTLINE  one pixel around the thing, in the ink, so its silhouette is a shape and not a smudge
  //   BODY     one flat tone for the thing, taken from its own colour
  //   GLASS    the dark part of it - a windscreen, a window, a shadowed half - as one darker tone of the same
  //            family, split by luma rather than by a model
  //
  // The pixels come from the game's own detector marks, so this draws exactly the things the player can hit and
  // nothing else. "Real objects seem real but with all the fundamental details that create shape" is this pass:
  // the details kept are the ones that CREATE the shape, and the texture of the paint is dropped.
  let objectCount = 0;
  // ---- 5d. THE OBJECTS, CUT OUT AND REDRAWN WITH THEIR FUNDAMENTALS ------------------------------------
  //
  // "Each detector box is turned into the vehicle's exact outline" (scene analysis). The first attempt at this
  // treated the BOX as the silhouette, so every car became a black rounded rectangle; the second was withdrawn
  // for the same reason. The cut-out is what was missing, and it is the cheap version of the analysis's GrabCut:
  // a pixel inside the box belongs to the thing when its colour is UNLIKE the ring of background just outside
  // the box (the test objects.js already uses), and then the thing's own border is traced and simplified - the
  // same outline() and simplify() the scenery uses.
  //
  // What is drawn on top is the analysis's own list: OUTLINE one pixel, BODY one flat tone of the thing's own
  // colour, GLASS its dark half - the details that create the shape, and nothing else.
  if (opts.marks && opts.fundamentals !== false) {
    const marks = opts.marks;
    const { parts: boxes } = components(w, h, (p2) => (marks[p2] ? 1 : 0));
    const OUT2 = palette.length - 2;
    for (const box of boxes) {
      if (box.area < 24) continue;
      // A PLANE IS NOT A THING (R11). A wall is large and low-contrast; cutting it out and painting its "glass"
      // put a black rectangle over a building. Only things below a share of the frame are templated.
      if (box.area > n * 0.06) continue;
      const bw = box.maxX - box.minX + 1, bh = box.maxY - box.minY + 1;
      if (bw < 4 || bh < 4) continue;
      // the ring: what the background just outside the box looks like
      const ring = [];
      for (let x = box.minX - 2; x <= box.maxX + 2; x += 1) for (const y of [box.minY - 2, box.maxY + 2]) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p2 = y * w + x;
        ring.push([rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]]);
      }
      for (let y = box.minY - 2; y <= box.maxY + 2; y += 1) for (const x of [box.minX - 2, box.maxX + 2]) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p2 = y * w + x;
        ring.push([rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]]);
      }
      if (!ring.length) continue;
      // CUT OUT: unlike the ring by more than the noise of the surface it stands on
      const inside = new Uint8Array(n);
      let count = 0, sr = 0, sg = 0, sb = 0;
      const near = (p2) => {
        let best = Infinity;
        const r0 = rgb[p2 * 3], g0 = rgb[p2 * 3 + 1], b0 = rgb[p2 * 3 + 2];
        for (let k = 0; k < ring.length; k += 2) {
          const d = (r0 - ring[k][0]) ** 2 + (g0 - ring[k][1]) ** 2 + (b0 - ring[k][2]) ** 2;
          if (d < best) best = d;
        }
        return best;
      };
      for (let y = box.minY; y <= box.maxY; y += 1) for (let x = box.minX; x <= box.maxX; x += 1) {
        const p2 = y * w + x;
        if (!marks[p2]) continue;
        if (near(p2) > 34 * 34) { inside[p2] = 1; count += 1; sr += rgb[p2 * 3]; sg += rgb[p2 * 3 + 1]; sb += rgb[p2 * 3 + 2]; }
      }
      // a box whose colour is too close to its background is not a thing we can cut: leave it as painted
      if (count < 20 || count < box.area * 0.25) continue;
      const mean = [sr / count, sg / count, sb / count];
      const meanL = luma(mean[0], mean[1], mean[2]);
      const body = entryFor(palette, mean[0], mean[1], mean[2]);
      const glass = entryFor(palette, mean[0] * 0.55, mean[1] * 0.58, mean[2] * 0.66);
      const lit = entryFor(palette, Math.min(255, mean[0] * 1.2), Math.min(255, mean[1] * 1.2), Math.min(255, mean[2] * 1.2));
      // THE TEMPLATE, from the reference the creator's own screen cites (v6: "one template for all cars,
      // inspired by the exaggerated vehicles in Metal Slug"): a 4-TONE RAMP from the thing's paint colour, a
      // DIAGONAL WINDSHIELD GLINT, and an AMBER RUNNING LIGHT on the outer edge - on top of the 1-px outline the
      // edges map already draws. Nothing here is a model of a car; it is the four things that make a car read.
      const paintRamp0 = null; const glint0 = null; const amber0 = null;
      const ramp = Math.floor(body / STEPS);
      const tone = (n) => ramp * STEPS + Math.max(0, Math.min(STEPS - 1, n));
      const paintRamp = [tone(1), tone(2), tone(3), tone(4)];               // dark under, light above
      const glint = tone(5);
      const amber = entryFor(palette, 240, 176, 64);
      // THE BORDER OF THE CUT-OUT, traced and simplified: the car's own outline, not the box's
      const part = { id: 0, px: [], area: count, minX: box.minX, maxX: box.maxX, minY: box.minY, maxY: box.maxY };
      for (let p2 = 0; p2 < n; p2 += 1) if (inside[p2]) part.px.push(p2);
      const poly = simplify(outline(inside, w, h, 1, part), 1.6);
      // V9'S VERDICT, TAKEN AS THE RULE: PHOTO PIXELS PLUS ONE SHARED OUTLINE.
      //
      // The creator's own audit of their screens says it plainly - "CARS: v6-v8 cartoon template over the photo,
      // with real car edges showing around it REJECTED · v9 photo pixels plus one shared outline." So the car is
      // NOT redrawn with a 4-tone ramp, a glint and a running light. It KEEPS THE PHOTO ALREADY PAINTED THERE by
      // the shape pass, and gets exactly two things: a light clean-up (isolated pixels are handled globally by the
      // despeckle pass) and ONE 1-PIXEL OUTLINE in the darkest palette colour, along the thing's own silhouette.
      for (const p2 of part.px) {
        let border = false;
        for (const q of [p2 - 1, p2 + 1, p2 - w, p2 + w]) if (q < 0 || q >= n || !inside[q]) { border = true; break; }
        if (border) idx[p2] = OUT2;                       // the one shared outline, and nothing else
      }
      void meanL; void mean; void paintRamp0; void glint0; void amber0; void body; void glass; void lit;
      objectCount += 1;
    }
  }

  // ---- 5e. THE ROAD: one surface, flat, with its OWN MARKINGS KEPT --------------------------------------
  //
  // The analysis reads the ground as the surface whose depth increases toward the bottom of the picture; at this
  // size the same thing is "the large, smooth, bright-to-mid area in the lower part of the frame". What matters
  // for the look is what the photograph actually says on it: a road is one flat tone plus PAINT - the lane
  // lines, the arrows, the crossing. Those are the only straight white things in a yard, and a route that
  // flattens them away has thrown out the detail the player recognises the street by.
  {
    const paved = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (sky[p2] || cls[p2] === 2) continue;
      const y = (p2 / w) | 0;
      if (y < h * 0.45) continue;                       // the road is below the horizon
      if (en.line[p2] > 0.5) continue;                  // not a line: a surface
      const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
      if (L < 40 || L > 210) continue;
      paved[p2] = 1;
    }
    const { parts: pads } = components(w, h, (p2) => paved[p2]);
    const marking = entryFor(palette, 236, 236, 228);
    let roads = 0;
    for (const pad of pads) {
      if (pad.area / n < 0.06) continue;                // a road is a big surface
      roads += 1;
      // the markings are the BRIGHT pixels inside it; they stay, and they stay straight
      const brights = [];
      for (const p2 of pad.px) if (luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]) > 168) brights.push(p2);
      let r = 0, g = 0, b = 0;
      let c = 0;
      for (const p2 of pad.px) {
        const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
        if (L > 168) continue;                          // paint, not asphalt
        r += rgb[p2 * 3]; g += rgb[p2 * 3 + 1]; b += rgb[p2 * 3 + 2]; c += 1;
      }
      if (!c) continue;
      // the road's own family, taken once from its mean colour: the faithful gradation stays inside it
      const body0 = entryFor(palette, r / c, g / c, b / c);
      // THE ROAD IS A FAITHFUL PIXELATION OF THE PHOTOGRAPH (R14, L0 of docs/PLAN.md).
      //
      // The tercile version flattened the road into three tones and thereby MOVED the photograph's own layout -
      // the lane markings ended up as shaped blobs in the wrong places, the patches merged, and the creator said
      // it plainly: the road has to stay exactly as it is on the photo, only pixelated. So the road is now
      // transcribed PIXEL BY PIXEL into the palette, with the photograph's own luma deciding the tone: a marking
      // stays where it is and keeps its width, a patch keeps its edge, a kerb keeps its line.
      const ramps = palette.length / STEPS;
      for (const p2 of pad.px) {
        const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
        if (L > 168) { idx[p2] = marking; continue; }         // the paint the photograph has, where it has it
        // the asphalt's own tone: the road's ramp, its tone chosen by the pixel's own value in eight steps - a
        // faithful gradation, no dithering, and the layout untouched
        const step = Math.max(0, Math.min(STEPS - 1, Math.round(((L - 30) / 120) * (STEPS - 1))));
        idx[p2] = entryFor(palette, rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]) === 0
          ? step * 1
          : Math.floor(body0 / STEPS) * STEPS + step;
      }
      void ramps;
    }
    if (roads) sky.__roads = roads;
  }

  // ---- 5g. VEGETATION IS PAINTED LAST, IN ITS OWN RAMP ----------------------------------------------
  //
  // The fidelity check found the photograph's green being LOST: a fixture with a green mass produced zero
  // pixels in the foliage ramp, and the histogram of that render showed the green landing in the stone and sky
  // ramps instead. The cause is order: the road pass claims everything below the horizon and paints it in the
  // road's family, so a green mass standing in that band was overpainted. Vegetation is now laid down AFTER
  // every surface pass, in the foliage ramp, its own luma choosing the tone - so the photograph's trees and
  // bushes survive whatever the surfaces did, and nothing green is invented (only pixels the photograph itself
  // classed as foliage are touched).
  {
    const FOLIAGE_RAMP = Math.floor(entryFor(palette, 60, 150, 60) / STEPS);   // what the table calls green
    let painted = 0;
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (cls[p2] !== 2) continue;                    // the photograph's own green, and nothing else
      const L = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
      const tone = Math.max(0, Math.min(STEPS - 1, Math.round(((L - 30) / 120) * (STEPS - 1))));
      idx[p2] = FOLIAGE_RAMP * STEPS + tone;
      painted += 1;
    }
    if (painted) sky.__veg = painted;
  }

  // ---- 5h. THE SKY, v9'S OWN DESIGN: one blue, a light band at the horizon, designed clouds ----------
  //
  // "Finds where the sky is in the photo, then fills it with the v6 design: one blue, a light band at the
  // horizon, and designed clouds in white with two shades. 5 tones in total. The same sky shows through any hole
  // torn in a building." The cloud pixels are laid down here so a hole in a wall reveals sky, not a gap.
  {
    const skyTones = [skyColour];
    const band = entryFor(palette, 214, 232, 244);        // the light band at the horizon
    const cloudA = entryFor(palette, 250, 250, 252);
    const cloudB = entryFor(palette, 232, 236, 244);
    const cloudC = entryFor(palette, 198, 214, 232);
    for (let x = 0; x < w; x += 1) {
      const line = skyline[x];
      for (let y = Math.max(0, line - 5); y < line; y += 1) {
        const p2 = y * w + x;
        if (sky[p2]) idx[p2] = band;
      }
    }
    skys = { skyTones, band, cloudA, cloudB, cloudC };
  }

  // ---- 5i. EVERY BUILDING GETS ITS 1-PX OUTLINE AGAINST THE SKY (v9's L4) --------------------------
  //
  // v9's rule, verbatim: "an object's edge is every pixel that touches a pixel of another object. Buildings get a
  // 1-px outline against the sky." The sky is known exactly at this point, so the rule is exact: a pixel that IS
  // sky and has a neighbour that is NOT gets the shared outline colour. That is one line, in the darkest palette
  // colour, along the real skyline of the photograph - not a drawn skyline and not a box.
  {
    const OUTS = palette.length - 2;
    let drawn = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p2 = y * w + x;
        if (!sky[p2]) continue;
        if (sky[p2 - 1] && sky[p2 + 1] && sky[p2 - w] && sky[p2 + w]) continue;
        if (idx[p2] === OUTS) continue;
        if (cls[p2] === 2) continue;                        // vegetation keeps its own ramp (R15)
        idx[p2] = OUTS;
        drawn += 1;
      }
    }
    if (drawn) sky.__edge = drawn;
  }

  const windowsPx = new Set();
  for (const q of [...windowsFound, ...gridWindows]) for (const p2 of q.px) windowsPx.add(p2);

  // ---- 5i1. A WALL IS FOUND BY STRUCTURE, NOT BY HUE (the cause the delivery rule found) --------------
  //
  // The wall class was decided by HUE, and on the creator's overcast Prague photograph a grey tower's facade is
  // not blue, not warm, not green - so it fell through every class, the sky fell back to the photograph's grey and
  // the wall kept its photographic grain. The rule measured it: 9 entries, 51% flat, against a designed plane's 8
  // and 70%. A wall is now found the way the scene analysis itself defines one: A LARGE CONNECTED REGION below the
  // sky, full of STRAIGHT RUNS (mullions, window heads, floor lines) - which is what a facade is and what asphalt,
  // foliage and sky are not.
  {
    let wallN = 0;
    for (let p2 = 0; p2 < n; p2 += 1) if (cls[p2] === 1) wallN += 1;
    if (wallN / n < 0.12) {                             // the hue test did not find the facades on this photograph
      const cand = new Uint8Array(n);
      for (let p2 = 0; p2 < n; p2 += 1) {
        if (sky[p2] || cls[p2] === 2) continue;
        const y = (p2 / w) | 0;
        if (y < h * 0.06) continue;                     // never the top edge: that is sky
        cand[p2] = 1;
      }
      const { parts } = components(w, h, (p2) => cand[p2]);
      for (const part of parts) {
        if (part.area / n < 0.05) continue;             // a wall is a large surface
        let straight = 0;
        for (const p2 of part.px) if (en.line[p2] > 0.4) straight += 1;
        if (straight / part.area < 0.06) continue;      // and it is full of straight runs
        for (const p2 of part.px) { if (!sky[p2] && cls[p2] !== 2) cls[p2] = 1; }
      }
    }
  }

  // ---- 5i2. THE WALL IS DESIGNED, NOT PHOTOGRAPHED (docs/render-policy.md) ---------------------------
  //
  // The wall was the photograph's own pixels under the window sprites, and its grain fights the sprites: the
  // creator's word for it is "blurred", and the delivery rule measures it as 51% flat where a designed plane is
  // 70%+ with at most eight entries. A wall's LAYOUT is its window grid, which is drawn as sprites; the grain
  // behind it is noise. So every building pixel is repainted as a plane in 8x8 blocks: one tone of the wall's own
  // family, the lit face one tone up, the turned-away face two tones down - the same three-face rule the facade
  // pass uses, applied to the whole class rather than to the shapes it happened to identify.
  {
    const WALLCLS = 1;                                  // the wall/building class in the scene analysis
    // EACH FACADE IS ONE PLANE. The first version decided a face per 8x8 block against a GLOBAL mean, so a tower
    // lit at the top and shaded at the bottom was split into many faces: the rule measured 12 entries where a
    // designed plane allows 8. The light is now decided ONCE PER FACADE: the wall class is split into its connected
    // regions, each region takes ONE family from its own mean colour, and its pixels are split into THREE faces by
    // that region's own luma terciles. Three tones of one family, decided once - which is what v6's facades are.
    // THREE THINGS THE WALL PASS MUST NOT TOUCH, or it undoes work that is already correct:
    //   - the SKY: the designed blue is drawn above the skyline, and the wall class overlaps that band
    //   - the WINDOW SPRITES: frame, glass and sill are drawn from the openings and must stay legible
    //   - the OUTLINE: the photograph's own edge line
    const protectedPx = new Set();
    for (const q of [...windowsFound, ...gridWindows]) for (const p2 of q.px) protectedPx.add(p2);
    const wallMask = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (cls[p2] !== WALLCLS) continue;
      const y = (p2 / w) | 0, x = p2 % w;
      if (y < skyline[x] - 1) continue;                 // above the skyline it is sky, whatever the class says
      if (protectedPx.has(p2)) continue;                // a window is drawn there
      if (cls[p2] === 2) continue;                      // the photograph's green is never a wall (R15)
      if (idx[p2] === palette.length - 2) continue;     // an outline pixel
      wallMask[p2] = 1;
    }
    const fac = components(w, h, (p2) => wallMask[p2]);
    let planes = 0;
    for (const part of fac.parts) {
      if (part.area < 40) continue;
      let r0 = 0, g0 = 0, b0 = 0;
      const lums = [];
      for (const p2 of part.px) {
        r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2];
        lums.push(en.smooth[p2]);
      }
      const n0 = part.px.length;
      const family = Math.floor(entryFor(palette, r0 / n0, g0 / n0, b0 / n0) / STEPS);
      const toneOf = (t) => family * STEPS + Math.max(0, Math.min(STEPS - 1, t));
      const sorted = lums.slice().sort((x, y) => x - y);
      const t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor((sorted.length * 2) / 3)];
      const faces = [toneOf(1), toneOf(2), toneOf(4)];        // shaded, plain, lit - one family, three tones
      for (let i2 = 0; i2 < n0; i2 += 1) {
        const p2 = part.px[i2];
        idx[p2] = lums[i2] > t2 ? faces[2] : lums[i2] > t1 ? faces[1] : faces[0];
      }
      planes += 1;
    }
    // THE FACE BOUNDARY IS REFINED. Two faces meeting along the luma tercile leave a ragged edge, and flatness is
    // measured over that edge: one pass of "a wall pixel whose four neighbours agree takes their tone" makes each
    // face a field with a clean line, which is what a designed plane is.
    {
      const before = idx.slice();
      for (const p2 of wallMask.keys ? [] : []) void p2;
      for (let p2 = 0; p2 < n; p2 += 1) {
        if (!wallMask[p2] || protectedPx.has(p2)) continue;
        const up = before[p2 - w], dn = before[p2 + w], lf = before[p2 - 1], rt = before[p2 + 1];
        if (up === dn && up === lf) idx[p2] = up;
        else if (up === dn && up === rt) idx[p2] = up;
        else if (lf === rt && lf === up) idx[p2] = lf;
        else if (lf === rt && lf === dn) idx[p2] = lf;
      }
    }
    // ---- LAYER 3: THE FACADE CARRIES A REGULAR WINDOW GRID (src/criteria/FacadeRule.js) ---------------
    //
    // The accept frame's towers are a PLANE with a regular grid of window rows - every bay, every floor - which is
    // why they read as architecture while a sampled wall reads as blur. Each facade region gets its own pitch from
    // the windows the photograph actually shows on it, and the grid is drawn across the whole plane inside its mask.
    {
      const PITCH_X = 9, PITCH_Y = 11;                 // a facade's own bay and floor, in game pixels
      const winFrame = entryFor(palette, 34, 38, 54);
      const winGlassA = entryFor(palette, 96, 128, 176);
      const winGlassB = entryFor(palette, 58, 76, 110);
      let drawn = 0;
      for (const part of fac.parts) {
        if (part.area < 400) continue;
        let x0 = w, x1 = 0, y0 = h, y1 = 0;
        for (const p2 of part.px) {
          const x = p2 % w, y = (p2 / w) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        if (bw < PITCH_X * 2 || bh < PITCH_Y * 2) continue;
        const boxes = facadeWindows(bw, bh, PITCH_X, PITCH_Y);
        for (const b of boxes) {
          const gx = x0 + b.x, gy = y0 + b.y;
          const glass = ((b.x / PITCH_X | 0) + (b.y / PITCH_Y | 0)) % 2 ? winGlassA : winGlassB;
          for (let y = gy; y < gy + b.h + 2; y += 1) {
            for (let x = gx; x < gx + b.w + 2; x += 1) {
              if (x < 1 || y < 1 || x >= w - 1 || y >= h - 1) continue;
              const p2 = y * w + x;
              if (!wallMask[p2] || windowsPx.has(p2)) continue;
              const onFrame = y === gy || y === gy + b.h + 1 || x === gx || x === gx + b.w + 1;
              idx[p2] = onFrame ? winFrame : glass;
            }
          }
          drawn += 1;
        }
      }
      if (drawn) sky.__facadeWindows = drawn;

      // ---- GRAIN REMOVAL (docs/AUDIT.md, step 4): NO PHOTOGRAPH REMAINS INSIDE A WALL -----------------
      //
      // The audit found the wall still carried the photograph's grain underneath the grid, because the facade loop
      // only reached pixels inside its own connected parts and left the rest as sampled colour. A wall is a PLANE:
      // every wall-class pixel that is not a window, a sky pixel or an outline now takes the wall's own mid tone of
      // its own family. After this, the only things inside a facade are plane tones and window sprites.
      {
        let r0 = 0, g0 = 0, b0 = 0, k0 = 0;
        for (let p2 = 0; p2 < n; p2 += 1) {
          if (cls[p2] !== WALLCLS || sky[p2] || windowsPx.has(p2)) continue;
          r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2]; k0 += 1;
        }
        if (k0) {
          const family = Math.floor(entryFor(palette, r0 / k0, g0 / k0, b0 / k0) / STEPS);
          const midTone = family * STEPS + 2;
          let cleaned = 0;
          for (let p2 = 0; p2 < n; p2 += 1) {
            if (cls[p2] !== WALLCLS || sky[p2] || windowsPx.has(p2)) continue;
            if (idx[p2] === palette.length - 2) continue;          // an outline stays a line
            if (Math.floor(idx[p2] / STEPS) === family) continue;  // already this plane's family
            idx[p2] = midTone;
            cleaned += 1;
          }
          sky.__grainRemoved = cleaned;
        }
      }
    }
    sky.__wall = planes;
  }

  // ---- 5j. STRAY PIXELS ARE CLEANED (v9's rule, and the creator's eye) ---------------------------------
  //
  // v9's own panel: "stray pixels cleaned". The creator's word for the result without this is MUSH, and my canvas
  // measured why: 10.7% of the pixels differed from ALL FOUR of their neighbours - one pixel in ten standing
  // alone. Nothing that is drawn has that property: a surface is a field, a line is a run. A pixel whose
  // neighbours are dominated by one colour is a stray, and it takes that colour. Lines survive by construction: a
  // line pixel has at most three neighbours of its own colour, so it never reaches the majority threshold.
  {
    const before = idx.slice();
    let cleaned = 0;
    for (let y = 1; y < h - 1; y += 1) {
      for (let x = 1; x < w - 1; x += 1) {
        const p2 = y * w + x;
        const tally = new Map();
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (!dx && !dy) continue;
            const v = before[p2 + dy * w + dx];
            tally.set(v, (tally.get(v) || 0) + 1);
          }
        }
        let best = -1, bestN = 0;
        for (const [v, n] of tally) if (n > bestN) { bestN = n; best = v; }
        if (bestN >= 5 && before[p2] !== best && best !== palette.length - 1) { idx[p2] = best; cleaned += 1; }
      }
    }
    sky.__cleaned = cleaned;
  }

  // ---- 6. designed clouds, and one line along the skyline ------------------------------------------------
  const cloudColour = skys ? skys.cloudA : entryFor(palette, 250, 250, 252);
  const cloudShade = skys ? skys.cloudC : entryFor(palette, 198, 214, 232);
  const cloudMask = new Int32Array(n).fill(-1);
  const want = Math.max(clean.clouds[0], Math.min(clean.clouds[1], Math.round((skyN / n) * 9)));
  const size = Math.max(7, Math.round(w / 11));
  let placed = 0;
  // They are placed like a designer places them: spread across the band, staggered left and right, never near
  // the skyline. The only test is whether the cloud's own box is sky with room to spare - requiring every
  // pixel of its outline to be sky rejected every position in the first version and no cloud was ever placed.
  for (let slot = 0; slot < 9 && placed < want; slot += 1) {
    const bandY = 0.05 + 0.085 * Math.floor(slot / 3);
    const cx = Math.round(w * (0.20 + 0.30 * (slot % 3)) + (slot % 2 ? -size * 0.35 : size * 0.25));
    const cy = Math.round(h * bandY);
    const rows = Math.max(3, Math.round(size * 0.55));
    const x0 = Math.max(0, cx - Math.round(size * 0.5) - 2), x1 = Math.min(w - 1, cx + Math.round(size * 0.5) + 2);
    let fits = cy + rows < h - 1;
    for (let x = x0; x <= x1 && fits; x += 1) if (skyline[x] - (cy + rows) < clean.cloudsInset) fits = false;
    if (!fits) continue;
    let skyHere = 0, tot = 0;
    for (let y = Math.max(0, cy - 1); y <= cy + rows; y += 1) for (let x = x0; x <= x1; x += 1) { tot += 1; if (sky[y * w + x]) skyHere += 1; }
    if (tot && skyHere / tot < 0.8) continue;
    cloud(cloudMask, w, h, cx, cy, size, cloudColour, cloudShade);
    placed += 1;
  }
  for (let p = 0; p < n; p += 1) if (cloudMask[p] >= 0) idx[p] = cloudMask[p];

  // the line: one pixel where the sky meets what is not sky, and nowhere else
  const OUT = palette.length - 2;
  let linePixels = 0;
  for (let x = 1; x < w - 1; x += 1) {
    const y = skyline[x];
    if (y <= 0 || y >= h - 1) continue;
    if (sky[y * w + x]) continue;
    idx[y * w + x] = OUT; linePixels += 1;
  }

  // NOTHING UNPAINTED LEAVES THIS FUNCTION. Any pixel still at the sentinel - a hole in the shape labels, an
  // edge of the frame, a region the passes disagreed about - takes the colour of the nearest painted pixel in
  // its own row, and if the row has none, of the row above. The alternative is index 0, which is a dark blue
  // slab over the top of the picture, and that is exactly what was on screen.
  {
    let filled = 0;
    for (let y = 0; y < h; y += 1) {
      let carry = -1;
      for (let x = 0; x < w; x += 1) { const p2 = y * w + x; if (idx[p2] === 255) { if (carry >= 0) { idx[p2] = carry; filled += 1; } } else carry = idx[p2]; }
      carry = -1;
      for (let x = w - 1; x >= 0; x -= 1) { const p2 = y * w + x; if (idx[p2] === 255) { if (carry >= 0) { idx[p2] = carry; filled += 1; } } else carry = idx[p2]; }
    }
    for (let x = 0; x < w; x += 1) for (let y = 1; y < h; y += 1) {
      const p2 = y * w + x;
      if (idx[p2] === 255) { idx[p2] = idx[p2 - w]; filled += 1; }
    }
    if (filled) sky.__filled = filled;
  }

  // ---- THE SKY GUARD, AT THE END, WHERE IT CANNOT BE UNDONE ------------------------------------------
  //
  // Four times I bounded the sky in the wrong place: brightness, half the frame, an edge-map skyline and a median
  // clamp were all applied to the FALLBACK FLOOD while the over-claim came from the blue-core growth earlier in
  // the pipeline. A guard that runs before the last thing that sets the mask is not a guard. This one runs where
  // the frame is finished: a sky deeper than two thirds of the frame is a flood, the mask is clamped to its own
  // median depth, and every pixel that stops being sky is repainted in ITS OWN COLOUR FAMILY - which is what makes
  // the photograph's green survive instead of being painted as sky.
  {
    if (sky) {
      const depth = new Int32Array(w);
      for (let x2 = 0; x2 < w; x2 += 1) { let d2 = 0; for (let y2 = 0; y2 < h; y2 += 1) if (sky[y2 * w + x2]) d2 = y2 + 1; depth[x2] = d2; }
      const sorted = Array.from(depth).sort((p2, q2) => p2 - q2);
      const median = sorted[Math.floor(sorted.length / 2)] || 0;
      const cap = Math.max(Math.floor(h * 0.12), Math.min(Math.floor(h * 0.66), Math.round(median * 1.35)));
      let freed = 0;
      for (let x2 = 0; x2 < w; x2 += 1) {
        if (depth[x2] <= cap) continue;
        for (let y2 = cap; y2 < h; y2 += 1) {
          const p2 = y2 * w + x2;
          if (!sky[p2]) continue;
          sky[p2] = 0;
          idx[p2] = entryFor(palette, rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
          freed += 1;
        }
      }
      if (freed) sky.__freed = freed;
    }
  }

  // ---- AREAS FIRST: THE REDUCTION THAT MAKES IT A DRAWING RATHER THAN A POSTERISATION -------------------
  //
  // THE CORE FAULT, and the reason the phone showed blue speckle: every earlier stage mapped EACH PIXEL to a
  // palette family, and on a photograph full of foliage that produces millions of one-pixel islands. A drawing is
  // not made of isolated pixels; it is made of FIELDS with boundaries. So the frame is now reduced the way pixel
  // art is always reduced: quantise to the palette, then let a 3x3 MAJORITY FILTER grow the fields over several
  // passes, with two hard rules that keep the picture honest:
  //   - a pixel the sky analysis claimed stays sky, and a filter pass may not cross the skyline
  //   - a pixel may only be absorbed by a family that is already present in its own 3x3 neighbourhood, so an
  //     outline, a window or a green mass is never erased by a neighbour's majority
  // Only after that do the constructed elements go on top: the sky plane, the window sprites, the outlines.
  {
    const field = new Int16Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) {
      field[p2] = sky[p2] ? designedSky : entryFor(palette, rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
    }
    const PASSES = 3;
    for (let pass = 0; pass < PASSES; pass += 1) {
      const was = Int16Array.from(field);
      for (let y = 1; y < h - 1; y += 1) {
        for (let x = 1; x < w - 1; x += 1) {
          const p2 = y * w + x;
          if (sky[p2]) continue;                       // the sky is not smoothed into the buildings
          const tally = new Map();
          for (let dy = -1; dy <= 1; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              if (!dx && !dy) continue;
              const q = p2 + dy * w + dx;
              if (sky[q]) continue;                    // and the buildings are not smoothed into the sky
              const v = was[q];
              tally.set(v, (tally.get(v) || 0) + 1);
            }
          }
          let best = -1, bestN = 1;                    // a strict majority, or the pixel keeps its own family
          for (const [v, cnt] of tally) if (cnt > bestN) { bestN = cnt; best = v; }
          if (best >= 0 && !windowsPx.has(p2)) field[p2] = best;
        }
      }
    }
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (windowsPx.has(p2)) continue;                 // a window sprite is drawn, never smoothed
      if (idx[p2] === palette.length - 2) continue;    // an outline stays a line
      idx[p2] = field[p2];
    }
  }

  // ---- PAINT BY KIND: FOLIAGE IS A DRAWN MASS, NOT PHOTOGRAPHIC PIXELS -----------------------------------
  //
  // THE REASON THE PHONE SHOWED A GREEN-BROWN SMEAR. This courtyard is mostly trees, and every earlier stage kept
  // the PHOTOGRAPH's colour for every leaf and then smoothed it: reducing a photograph gives a smoother photograph,
  // never a drawing. v9's green is not a photograph - it is two or three flat greens per bush, with a drawn
  // boundary. So the foliage class is now grouped into its connected masses and each mass is painted in ONE family
  // taken from its own mean colour, with three tones inside it (lit top, mid, shaded under) - a drawn tree.
  {
    const FOLC = 2;
    const mask = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) if (cls[p2] === FOLC && !sky[p2]) mask[p2] = 1;
    const { parts } = components(w, h, (p2) => mask[p2]);
    let masses = 0;
    for (const part of parts) {
      if (part.area < 14) continue;                     // a speck of green is not a bush
      let r0 = 0, g0 = 0, b0 = 0;
      const lums = [];
      for (const p2 of part.px) {
        r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2];
        lums.push(en.smooth[p2]);
      }
      const n0 = part.px.length;
      const family = Math.floor(entryFor(palette, r0 / n0, g0 / n0, b0 / n0) / STEPS);
      const toneOf = (t) => family * STEPS + Math.max(0, Math.min(STEPS - 1, t));
      const sorted = lums.slice().sort((x, y) => x - y);
      const t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor((sorted.length * 2) / 3)];
      for (let i2 = 0; i2 < n0; i2 += 1) {
        const p2 = part.px[i2];
        if (windowsPx.has(p2)) continue;
        idx[p2] = lums[i2] > t2 ? toneOf(4) : lums[i2] > t1 ? toneOf(2) : toneOf(1);
      }
      masses += 1;
    }
    if (masses) sky.__foliage = masses;
  }

  // ---- THE SCENE, PAINTED IN ITS OWN ORDER ------------------------------------------------------------
  //
  // The pieces this pipeline computed one after another - the sky mask, the foliage masses - are handed to the scene
  // and painted by it, in the fixed order the module documents, instead of at points scattered through the trace.
  // The remaining kinds (ground, walls, objects) still travel their old paths and are marked as such: this is the
  // architecture taking over one kind at a time, not a rewrite that breaks the picture to prove a point.
  {
    const scene = makeScene(w, h);
    scene.sky = { mask: sky, tone: designedSky };
    const FOLC = 2;
    const mask = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) if (cls[p2] === FOLC && !sky[p2]) mask[p2] = 1;
    const { parts } = components(w, h, (p2) => mask[p2]);
    for (const part of parts) {
      if (part.area < 14) continue;
      let r0 = 0, g0 = 0, b0 = 0;
      const lums = [];
      for (const p2 of part.px) { r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2]; lums.push(en.smooth[p2]); }
      const n0 = part.px.length;
      const family = Math.floor(entryFor(palette, r0 / n0, g0 / n0, b0 / n0) / STEPS);
      const toneOf = (t) => family * STEPS + Math.max(0, Math.min(STEPS - 1, t));
      const sorted = lums.slice().sort((x, y) => x - y);
      const t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor((sorted.length * 2) / 3)];
      scene.foliage.push({ px: part.px, lums, t1, t2, tones: [toneOf(1), toneOf(2), toneOf(4)] });
    }
    const painted = renderScene(scene, idx, {
      paintSky: (sc, out) => {
        paintingSky = true;
        for (let p2 = 0; p2 < n; p2 += 1) if (sc.sky.mask[p2]) out[p2] = entryFor(palette, 88, 154, 226);
        paintingSky = false;
      },
      paintFoliage: (sc, out, mass) => {
        for (let i2 = 0; i2 < mass.px.length; i2 += 1) {
          const p2 = mass.px[i2];
          if (windowsPx.has(p2)) continue;
          out[p2] = mass.lums[i2] > mass.t2 ? mass.tones[2] : mass.lums[i2] > mass.t1 ? mass.tones[1] : mass.tones[0];
        }
      },
    });
    sky.__scene = census(scene);
    void painted;
  }

  return {
    // the identities this renderer resolved, so a check can measure what was decided instead of guessing a constant
    ramps: {
      foliage: Math.floor(entryFor(palette, 60, 150, 60) / STEPS),
      sky: Math.floor(entryFor(palette, 88, 154, 226) / STEPS),
      wall: Math.floor(entryFor(palette, 200, 186, 168) / STEPS),
    },
    idx, palette, skyline, skyN, clouds: placed, traced, removed, merged, linePixels, windows: windowsFound,
    planes: facadePlanes.length, objects: objectCount,
    // THE BUILDINGS THEMSELVES, as structures the game can destroy: the pixels of each facade plane. The window
    // pass already reads these planes, so a wall and its openings agree about where the wall is; now the storm
    // can tear the wall as well as pop the windows, and what is left of it is ruins (D8).
    structures: facadePlanes.slice(0, 24).map((part) => ({ pixels: part.px, x: part.minX, y: part.minY, w: part.maxX - part.minX + 1, h: part.maxY - part.minY + 1 })),
    ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    skyShare: skyN / n,
  };
}
