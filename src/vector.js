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

import { RAMPS, STEPS, paletteOf } from './flat.js';

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
function entryFor(palette, r, g, b) {
  const { h, s, v } = rgb2hsv(r, g, b);
  const wantSky = s > 0.10 && h >= SKY_HUE[0] && h <= SKY_HUE[1];
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
  const clean = { ...CLEAN, ...(opts.clean || {}) };
  const n = w * h;
  const idx = new Uint8Array(n);

  // ---- 1. sky, foliage, and everything else, by hue and smoothness --------------------------------------
  const src = new Uint8ClampedArray(rgba.buffer ? rgba.buffer : rgba, rgba.byteOffset || 0, n * 4);
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
  const skyline = new Int32Array(w).fill(h);       // the first non-sky row in each column
  for (let x = 0; x < w; x += 1) for (let y = 0; y < h; y += 1) if (!sky[y * w + x]) { skyline[x] = y; break; }
  let skyN = 0;
  for (let i = 0; i < n; i += 1) if (sky[i]) skyN += 1;

  // the sky's own colour: the median of the BLUE CORE, not of the grown region — the first version averaged
  // the sunset's own clouds into the sky and painted the whole upper half of the photograph beige.
  let sr = 0, sg = 0, sb = 0, k = 0;
  for (let i = 0; i < n; i += 1) if (coreSky[i]) { sr += rgb[i * 3]; sg += rgb[i * 3 + 1]; sb += rgb[i * 3 + 2]; k += 1; }
  k = Math.max(1, k);
  const skyColour = entryFor(palette, sr / k, sg / k, sb / k);

  // ---- 2. everything that is not sky becomes shapes ------------------------------------------------------
  // A label map by colour, so shapes are areas of one colour: this is the "vector trace" input. The
  // quantisation is deliberately coarse - one family per shape is the rule, and coarse input makes big shapes.
  const key = new Int32Array(n);
  for (let i = 0; i < n; i += 1) {
    if (sky[i]) { key[i] = -1; continue; }
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2];
    const { h: hue, s, v } = rgb2hsv(r, g, b);
    const band = s < 0.16 ? 8 : Math.min(7, Math.floor(hue / 45));       // 8 = the greys, else 45-degree bands
    const shade = Math.min(3, Math.floor(v * 4));
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
    if (sky[p]) { idx[p] = skyColour; continue; }
    const id = straight[p];
    if (id < 0) { idx[p] = skyColour; continue; }
    const c = shapeColour.get(id) || [128, 128, 128];
    idx[p] = entryFor(palette, c[0], c[1], c[2]);
  }

  // ---- 5b. WINDOWS AS OBJECTS ---------------------------------------------------------------------------
  //
  // A courtyard is mostly facade, and a facade is mostly windows, so windows are where the picture has to be
  // exact: they must be VISIBLE as openings and they must be INDIVIDUAL, because the game gives each one its
  // own hit points. They are found geometrically - a dark, rectangular, filled area inside bright wall - which
  // needs no model, no depth and no colour: the wall is bright and smooth, the opening is dark and rectangular,
  // and a facade has its openings in rows and columns.
  const WIN = { minArea: 0.0003, maxArea: 0.03, aspect: [0.35, 2.6], fill: 0.62, drop: 20, group: 2, max: 48 };
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
    // IN ROWS OR COLUMNS: two openings that line up are a facade; one dark rectangle on its own is a shadow.
    const rows = new Map(), cols = new Map();
    for (const q of windowsFound) {
      rows.set(Math.round(q.cy / 12), (rows.get(Math.round(q.cy / 12)) || 0) + 1);
      cols.set(Math.round(q.cx / 12), (cols.get(Math.round(q.cx / 12)) || 0) + 1);
    }
    let kept = windowsFound.filter((q) => rows.get(Math.round(q.cy / 12)) >= WIN.group || cols.get(Math.round(q.cx / 12)) >= WIN.group);
    // ...and if a picture has no facade to line up (a courtyard seen from above, a street at an angle), keep the
    // unambiguous ones rather than nothing: a very rectangular, clearly darker opening is a window anywhere.
    if (!kept.length) kept = windowsFound.filter((q) => q.fill >= 0.72 && q.drop >= 30);
    kept.sort((a, b) => b.area - a.area);
    kept = kept.slice(0, WIN.max);
    const darkEntry = entryFor(palette, 34, 34, 46);
    for (const q of kept) for (const p of q.px) idx[p] = darkEntry;
    windowsFound.push(...kept.splice(kept.length));   // (kept is now empty; windowsFound already holds the rest)
    const final = windowsFound.filter((q) => q.px.some((p) => idx[p] === darkEntry));
    windowsFound.length = 0;
    windowsFound.push(...final);
  }

  // ---- 6. designed clouds, and one line along the skyline ------------------------------------------------
  const cloudColour = entryFor(palette, 246, 246, 250);
  const cloudShade = entryFor(palette, 196, 202, 214);
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

  return {
    idx, palette, skyline, skyN, clouds: placed, traced, removed, merged, linePixels, windows: windowsFound,
    ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    skyShare: skyN / n,
  };
}
