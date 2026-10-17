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

import { horizonFromSky } from './horizon.js';   // the one definition of "where the sky ends"
import { MIN_PITCH, alternation } from './criteria/FacadeRule.js';
import { paintCells } from './pieces/facade.js';
import { scenePlan, buildingsFrom } from './plan.js';
import { STYLE } from './style/index.js';   // the style's own measured values (src/style/index.js)
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
  cloudsInset: 3,     // a cloud never comes closer than this to the skyline (was 10: it rejected every slot)
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
export function entryFor(palette, r, g, b) {
  const { h, s, v } = rgb2hsv(r, g, b);
  let family = null;
  let bestD = Infinity;
  // SATURATION IS NOT A TIE-BREAKER, IT IS HALF THE DECISION.
  //
  // The first version weighted hue at 1.0 and saturation at 0.35, so a pixel with saturation 0.5 - green foliage,
  // a yellow kerb, a red brick - could still land in the NEUTRAL ramps (stone sat 0.15, metal 0.10, dusk 0.12) and
  // the whole frame came out grey. That is the creator's "colors are completely wrong": the photograph's colour was
  // being thrown away by an arithmetic choice. Saturation now carries comparable weight, and a pixel that HAS colour
  // is not allowed into a family that has none.
  const NEUTRAL = new Set(['stone', 'metal', 'dusk']);
  for (const R of RAMPS) {
    if (R.name === 'sky' && !paintingSky) continue;          // the sky belongs to the sky mask alone
    if (s >= 0.30 && NEUTRAL.has(R.name) && !paintingSky) continue;   // colour does not become concrete
    let dh = Math.abs(R.hue - h);
    if (dh > 180) dh = 360 - dh;
    const d = (dh / 180) * 1.0 + Math.abs((R.sat || 0) - s) * 1.1;
    if (d < bestD) { bestD = d; family = R.name; }
  }
  if (!family) family = 'stone';
  // WITHIN THE FAMILY, THE NEAREST TONE. The edit that replaced the cascade cut this loop out and the function
  // returned undefined, so every pixel took entry 0: two colours and 97% of the frame in one of them. Restored,
  // and it is the only place a tone is chosen.
  const want = RAMPS.findIndex((R) => R.name === family);
  const base = (want < 0 ? 3 : want) * STEPS;
  let bestTone = base, bestToneD = Infinity;
  // THE DARKEST TONE IS FOR OUTLINES, NOT FOR ROADS. The style (src/style/index.js, measured from the accepted frame)
  // puts the converted frame's dominant grey at lightness 0.35 — rgb(89,85,95) — while ours came out at 0.24,
  // rgb(61,55,67): the conversion was choosing tone 0 for asphalt because the photograph's asphalt is dark, and the
  // accepted style deliberately keeps the ground in the MID tones and reserves the darkest entry for the outline.
  // So a pixel brighter than a true shadow is chosen from tones 1..5.
  // AND THE ROAD SITS IN THE THIRD TONE, NOT THE SECOND. Measured after the first correction: the frame's dominant
  // grey was still rgb(61,55,67), lightness 0.24, against the style's 0.35 — the asphalt was landing one tone low,
  // because a photograph's asphalt IS dark and the accepted style deliberately lifts the ground. A pixel in the
  // ground's own range (60..150) is therefore chosen from tones 2..5; below that (true shadow) from 1..5; only a
  // near-black pixel may use tone 0, which the style reserves for outlines.
  const L2 = luma(r, g, b);
  const firstTone = L2 > 60 && L2 < 150 ? 2 : L2 > 60 ? 1 : 0;
  for (let t = firstTone; t < STEPS; t += 1) {
    const i = base + t;
    const c = palette[i];
    if (!c) continue;
    const d = (c[0] - r) ** 2 + (c[1] - g) ** 2 + (c[2] - b) ** 2;
    if (d < bestToneD) { bestToneD = d; bestTone = i; }
  }
  return bestTone;
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
  // PROTOCOL 5-#5: the register repaint (the foliage pass, which repaints the whole frame in one neutral family)
  // runs LAST and was taking the window grid back. These three hold the two apart: the wall mask as it was BEFORE
  // the openings were removed (the test an opening must pass), and the pixels the grid paints (which the repaint
  // must leave alone). Declared at function scope: this module has nested blocks and a block-scoped name here
  // throws at the return, and the throw is SWALLOWED (symptom: left 0 with a clean console).
  let spriteBays = null;
  let wallClass = null;
  const spritePx = new Map();   // pixel -> the entry the grid painted there

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
  // THE SCENE PARSE DECIDES, when it is available. Stage 1+2 of docs/METHODS.md: the `sky` class from the on-device
  // model (SegFormer-B0 Cityscapes), which is a fact about the picture rather than a threshold of mine.
  let PLAN = null;          // THE one scene plan: computed right below from the parse's buildings, read by the bays, the checker and main
  const PARSE = opts.parse && opts.parse.masks ? opts.parse.masks : null;
  // ---- THE SCENE PLAN, ONCE, AT THE TOP ---------------------------------------------------------------
  //
  // The composition as structure (bands + facade archetypes), computed from the parse's BUILDING MASK - the only
  // source that says "building" - and independent of the wall components, so it exists on every photograph (measured:
  // the second yard yields no wall fragments, and a plan built from them was null there). The bay loop, the checker
  // pass and main all read THIS plan.
  {
    const pMask = (PARSE && PARSE.building) ? PARSE.building : null;
    const planParts2 = pMask ? buildingsFrom(pMask, w, h) : [];
    PLAN = scenePlan({ w, h, horizon: Math.round(h * 0.7), parts: planParts2, rgb });
    if (typeof window !== 'undefined' && window.__planProbe) window.__planEarly = { parts: planParts2.length, facades: (PLAN.facades || []).length };
  }

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
  // THE PARSE'S SKY CLASS IS ADDED TO THE COLOUR TEST'S ANSWER (the union this build has always used), EXCEPT WHEN
  // THE MODEL SAYS THERE IS NO SKY AT ALL. photos-test/a.jpg is an AZLK against a brick wall: the parse returns
  // building/car/pole/road/sidewalk/terrain and no sky class, and the colour route then invented 8.94% of the frame
  // as designed sky with three clouds over a car. The published guard (`skylinePoints = [0]*w`) says no sky means no
  // sky; the frame now honours it. On a photograph WITH sky this line changes nothing - replacing the union is a
  // separate piece (Q15), because doing it here cost delivery lines 1 and 2b (measured).
  if (PARSE) {
    if (PARSE.sky) {
      let n2 = 0;
      for (let p2 = 0; p2 < n; p2 += 1) if (PARSE.sky[p2]) { sky[p2] = 1; n2 += 1; }
      if (typeof window !== 'undefined') window.__parseSky = n2;
    } else if (opts.parse && opts.parse.noSky) {
      sky.fill(0);
      if (typeof window !== 'undefined') window.__parseSky = 0;
    }
  }

  // THE SKY-CANDIDATE SET IS SNAPSHOTTED HERE, AND THAT IS THE WHOLE POINT.
  //
  // `cls[]` is REUSED: the wall pass later writes `cls[p] = 1` for walls, so every later question of the form
  // "is this pixel sky?" was being answered by a map that describes something else - which is why the cloud
  // placement found no sky to sit in and cloud-white measured 0% of the frame while the blue itself was fine.
  // One copy, taken before any other pass touches the map, is used by the sky region, the skyline and the clouds.
  const skyCand = cls.slice();
  let wallMaskOut = null;   // the facade block's wall mask, kept for the checker pass that must run LAST

  // AN OVERCAST SKY IS STILL A SKY. The blue test above finds a blue sky; on a grey day - the creator's Prague
  // photograph is overcast - it finds nothing, and the top of the frame was painted as noisy shapes instead of a
  // plane: the gate measured 52% flat with 0.39 colour changes per pixel in the sky band. So if the blue core is
  // small, the sky is found the way the scene analysis found it: WHATEVER IS CONNECTED TO THE TOP EDGE, IS SMOOTH
  // (low edge strength) AND HAS NO LONG STRAIGHT LINES (which is what separates sky from a distant city).
  {
    let core = 0;
    for (let i = 0; i < n; i += 1) if (coreSky[i]) core += 1;
    // THE FLOOD IS NOT ONLY FOR A GREY DAY. It ran when the blue core was small, so on this photograph - where
    // 37% of the frame passes the blue test - it never ran, and the sky region was the BLUE part alone. The white
    // clouds over it are bright and almost colourless (saturation 0.03), so they failed the blue test and were not
    // sky: the placement then rejected every cloud position for "not enough sky here" and placed NOTHING
    // (measured: placed 0, want 4, skyPixels 54 020). The flood fills the smooth, edge-free, connected-to-the-top
    // region, clouds included, and it is bounded by the same blue line and edge tests as before.
    // THE GUARD REACHES THIS FLOOD TOO. It is the colour route's rescue for an overcast sky, and after the mask was
    // emptied on a no-sky photograph it put 12,610 sky pixels back. It is skipped only when the model said "no sky".
    if (!(opts.parse && opts.parse.noSky) && core / n < 0.08) {
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
  // (NOT applied to the model's own mask would be better - cutting it cost 70 columns of an exact mask on v10a - but
  // applying that here also cost delivery lines 1 and 2b, so it is Q15, not a silent retune.)
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

  // THE HORIZON GATE'S READOUT (?horizon=1): the frame's own skyline against the parse mask's boundary, per column.
  // Diagnostics only - nothing in the build reads it. A gate that cannot see the boundary cannot judge it.
  if (typeof window !== 'undefined' && opts.horizonProbe && PARSE) {
    const maskH = horizonFromSky(PARSE.sky || new Uint8Array(n), w, h);
    let agree = 0, sum = 0, max = 0, skyPx = 0;
    for (let i = 0; i < n; i += 1) if (PARSE.sky && PARSE.sky[i]) skyPx += 1;
    for (let x = 0; x < w; x += 1) { const d = Math.abs(maskH[x] - skyline[x]); if (d <= 1) agree += 1; sum += d; if (d > max) max = d; }
    window.__frameHorizon = { cols: w, agree, mean: sum / w, max, noSky: skyPx === 0, skyPx };
  }
  let skys = null;
  let wallParts = [];
  let wallPx = new Uint8Array(0);      // the structural walls, by pixel: the sky must not paint over them
  let skyMaskFinal = null;      // the sky's region, kept so the LAST write before the return can be the sky itself
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
    // A WINDOW IS GLASS IN A LIGHT FRAME, NOT A BLACK HOLE. These were a near-black navy ring (40,42,58) round dark
    // blue glass, so on a grey facade every window read as a black or blue BLOCK - the creator's "objects clustering
    // is wrong". v6's sprite is the other way round: the frame is the light tone of the wall and the glass is a mid
    // blue-grey that reads as reflecting sky, with a paler sill under it. Three tones, none of them near-black.
    // THE GLASS IS BLUE, AND IT MUST NAME THE SKY RAMP TO GET THERE.
    //
    // Measured against the example frame (tools/match-check.mjs): its tower carries blue glass, rgb(77,100,180) lit
    // and rgb(49,62,122) shaded, while ours measured 4% blue against a required 10%. The cause is structural, not a
    // wrong number: outside sky painting the family rule excludes the sky ramp (a blue-grey pixel must not become
    // sky), so `entryFor(92,116,152)` could only reach a NEUTRAL ramp - grey glass. A window is the one place a
    // building is allowed to reflect the sky, so the sprite names the sky ramp's own tones directly.
    const SKY_I = RAMPS.findIndex((R) => R.name === 'sky') * STEPS;
    const frameEntry = entryFor(palette, 196, 198, 202);   // the frame: light, like the wall it sits in
    const winEntry = SKY_I + 1;                            // the inner lip: the sky's shade, rgb(9,34,113)
    const glassEntry = SKY_I + 2;                          // the glass: the sky's own blue, rgb(20,75,174)
    const sillEntry = entryFor(palette, 216, 214, 206);    // the sill: palest, under the frame
    // ---- THE WINDOWS SIT ON THE FACADE'S OWN GRID (docs/CRITERIA.md: "rebuilt on the photo's column and floor
    // grid"). The finder returns boxes wherever it saw a dark opening, so they landed at the photograph's own
    // jitter and read as RECTANGLES THAT CORRESPOND TO NOTHING. The known technique - and v6's own - is to take the
    // openings that WERE found, measure their pitch (the median gap between neighbouring columns and rows), and snap
    // every sprite onto that grid: rows line up, floors line up, and the facade reads as architecture.
    {
      const all = [...windowsFound, ...gridWindows];
      const med = (arr) => { const a2 = arr.slice().sort((x, y) => x - y); return a2[a2.length >> 1] || 0; };
      const cx = all.map((q) => q.cx), cy = all.map((q) => q.cy);
      const gapsX = [], gapsY = [];
      const sx = cx.slice().sort((x, y) => x - y), sy = cy.slice().sort((x, y) => x - y);
      for (let i = 1; i < sx.length; i += 1) { const g = sx[i] - sx[i - 1]; if (g > 3 && g < w * 0.5) gapsX.push(g); }
      for (let i = 1; i < sy.length; i += 1) { const g = sy[i] - sy[i - 1]; if (g > 3 && g < h * 0.5) gapsY.push(g); }
      const px2 = Math.max(6, Math.round(med(gapsX) || 0)), py2 = Math.max(6, Math.round(med(gapsY) || 0));
      if (typeof window !== 'undefined') window.__winPitch = { px: px2, py: py2, n: all.length };
      if (px2 > 6 && py2 > 6) {
        const x0 = sx[0] || 0, y0 = sy[0] || 0;
        for (const q of all) {
          const nx = Math.round((q.cx - x0) / px2) * px2 + x0;
          const ny = Math.round((q.cy - y0) / py2) * py2 + y0;
          const dx = Math.round(nx - q.cx), dy = Math.round(ny - q.cy);
          if (!dx && !dy) continue;
          q.x += dx; q.y += dy; q.cx += dx; q.cy += dy;
          for (let i2 = 0; i2 < q.px.length; i2 += 1) q.px[i2] += dy * w + dx;
        }
        // RESIZE EACH SPRITE TO ITS BAY, after snapping: the opening the finder saw is a few pixels; the bay it sits
        // in is what a window occupies on a facade. Measured against the example frame, the tower's glass must cover
        // ≥10% of the region and the finder's own boxes gave 4%.
        const nw = Math.max(3, Math.round(px2 * 0.7)), nh = Math.max(2, Math.round(py2 * 0.6));
        for (const q of all) {
          q.w = nw; q.h = nh;
          q.x = Math.round(q.cx - nw / 2); q.y = Math.round(q.cy - nh / 2);
          q.px = [];
          for (let yy = q.y; yy < q.y + nh; yy += 1) for (let xx = q.x; xx < q.x + nw; xx += 1) {
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            q.px.push(yy * w + xx);
          }
        }
        if (typeof window !== 'undefined') window.__winGrid = { px: px2, py: py2, n: all.length };
      }
    }

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
        const step = Math.max(2, Math.min(STEPS - 1, Math.round(((L - 30) / 120) * (STEPS - 1))));   // the register: mid tones carry the frame
        if (typeof window !== 'undefined') window.__roadTone = (window.__roadTone || 0) + 1;
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
    // ALL FIVE SKY TONES ARE CHOSEN WITH THE SKY FLAG ON. Wrapping only the band left the clouds resolving to the
    // stone ramp, so the criterion "one blue with designed clouds" was being met by a grey sky with grey clouds -
    // which is exactly what the frame showed.
    paintingSky = true;
    const skyColourDesigned = entryFor(palette, 88, 154, 226);
    const skyTones = [skyColourDesigned];
    const band = entryFor(palette, 214, 232, 244);        // the light band at the horizon
    const cloudA = entryFor(palette, 250, 250, 252);
    const cloudB = entryFor(palette, 232, 236, 244);
    const cloudC = entryFor(palette, 198, 214, 232);
    paintingSky = false;
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
    // `cls === 1` MEANS TWO DIFFERENT THINGS AT TWO DIFFERENT TIMES, and this pass was reading the wrong one.
    // Early on it is the SKY-CANDIDATE set (the blue test), which is snapshotted as `skyCand`; the structure pass
    // below is what writes `cls = 1` for a WALL. Counting every `cls === 1` pixel therefore counted the sky: on the
    // creator's photograph (measured at 384x512 through the page's own trace) it read 71 362 - 36% of the frame -
    // 12% guard, so the guard concluded "the hue test found the facades" and the structure pass NEVER RAN. No pixel
    // was ever marked as a wall, and the wall mask fell back to the blue speckle of the sky class: 20 168 pixels in
    // 1075 connected parts, nineteen pixels each, which the plane pass then painted as 1075 random-tone patches.
    // A wall is a pixel of class 1 that the sky analysis did NOT claim - that is the only reading of the class map
    // at this point in the frame, and it is what the guard must ask.
    let wallN = 0;
    for (let p2 = 0; p2 < n; p2 += 1) if (cls[p2] === 1 && !sky[p2]) wallN += 1;
    if (wallN / n < 0.12) {                             // the hue test did not find the facades on this photograph
      const cand = new Uint8Array(n);
      for (let p2 = 0; p2 < n; p2 += 1) {
        if (sky[p2] || cls[p2] === 2) continue;
        const y = (p2 / w) | 0;
        if (y < h * 0.06) continue;                     // never the top edge: that is sky
        cand[p2] = 1;
      }
      // A WALL IS JOINED TO THE SKY. Without this the candidate mask is ONE connected mass from the skyline down
      // to the bottom of the frame - the road, the pavement and the ground are bright, line-free surfaces too -
      // and the structure pass marked all of it as wall. Measured on the creator's photograph: a single region of
      // 127 888 pixels in a box 384 x 502, the whole lower half of the picture repainted as masonry, cars and all.
      // What separates a facade from the ground is that a facade MEETS THE SKY: its top edge IS the skyline. So a
      // component counts only when it touches a sky pixel, and the candidate mask is joined to the sky for the
      // component pass to see that. The ground touches the sky nowhere and cannot be joined.
      const nearSky = new Uint8Array(n);
      for (let p2 = 0; p2 < n; p2 += 1) {
        if (!sky[p2]) continue;
        nearSky[p2] = 1;
        if (p2 >= w) nearSky[p2 - w] = 1;
        if (p2 + w < n) nearSky[p2 + w] = 1;
        if (p2 % w) nearSky[p2 - 1] = 1;
        if (p2 % w < w - 1) nearSky[p2 + 1] = 1;
      }
      const joined = new Uint8Array(n);
      for (let p2 = 0; p2 < n; p2 += 1) joined[p2] = cand[p2] || nearSky[p2] ? 1 : 0;
      // A SPECKLE OF SKY IS A BRIDGE, AND THE FLOOD CROSSES IT. Everything that is not sky is joined, so the
      // buildings, the road, the cars and the ground form ONE region the moment a single sky-ish pixel slips
      // between them: measured on the creator's photograph, 187 587 of 196 608 pixels in one component - 96% of
      // the frame, which is why the wall pass repainted the road and the cars as masonry. The sky class is a
      // per-pixel hue test and it flickers, so those bridges always exist. A speck of sky far too small to be an
      // opening in a building is noise in the mask, not a hole in it, and removing it is what lets a building be
      // separated from the street it stands on.
      {
        const { parts: sk } = components(w, h, (p2) => (sky[p2] ? 1 : 0));
        let killed = 0;
        for (const part of sk) {
          if (part.area >= 40) continue;
          for (const p2 of part.px) { nearSky[p2] = 0; killed += 1; }
        }
        if (killed) for (let p2 = 0; p2 < n; p2 += 1) joined[p2] = cand[p2] || nearSky[p2] ? 1 : 0;
      }
      const { parts } = components(w, h, (p2) => joined[p2]);
      let ran = 0;
      for (const part of parts) {
        if (part.area / n < 0.05) continue;             // a wall is a large surface
        let meetsSky = false;
        for (const p2 of part.px) if (cand[p2] && nearSky[p2]) { meetsSky = true; break; }
        if (!meetsSky) continue;                        // the ground does not meet the sky; a facade does
        let straight = 0;
        for (const p2 of part.px) if (en.line[p2] > 0.4) straight += 1;
        if (straight / part.area < 0.06) continue;      // and it is full of straight runs
        for (const p2 of part.px) { if (!sky[p2] && cls[p2] !== 2) cls[p2] = 1; }
        ran += 1;
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
    // THE `building` CLASS, when the parse is present: a wall is what the model calls a building, not what my hue
    // test and straight-run finder guessed at (they produced 1075 fragments of ~19 px).
    if (PARSE && PARSE.building) { for (let p2 = 0; p2 < n; p2 += 1) if (PARSE.building[p2]) wallMask[p2] = 1; }

    // A THING IS NOT A WALL. The detector's own marks say where the cars, the bins and the people are, and those
    // keep their photographic pixels (the render policy: vehicles are FAITHFUL + one outline). A car body is
    // bright, smooth and free of long lines - everything the wall class looks for - so without this the cars came
    // out painted in the wall's plane tones like masonry. The marks are the only honest source for this: they are
    // what the game itself calls a thing, and the pass that draws them runs after this one.
    const thingMarks = opts.marks || null;
    for (let p2 = 0; p2 < n; p2 += 1) {
      if (cls[p2] !== WALLCLS) continue;
      const y = (p2 / w) | 0, x = p2 % w;
      if (y < skyline[x] - 1) continue;                 // above the skyline it is sky, whatever the class says
      if (protectedPx.has(p2)) continue;                // a window is drawn there
      if (cls[p2] === 2) continue;                      // the photograph's green is never a wall (R15)
      if (idx[p2] === palette.length - 2) continue;     // an outline pixel
      if (thingMarks && thingMarks[p2]) continue;       // a thing keeps its own pixels
      wallMask[p2] = 1;
    }
    // A WALL IS A PLANE, SO ITS MASK HAS NO HOLES. The class map is a per-pixel hue test and it flickers: on the
    // creator's photograph it left 20 168 wall pixels in 1075 connected parts of nineteen pixels each, and a
    // "plane" painted out of nineteen-pixel patches IS the grain the whole pass exists to remove - measured, the
    // wall band came out 33% flat with the sky's own blue as its most common colour. A hole inside a wall is wall:
    // whatever the class test missed between two wall pixels is masonry seen at the same angle, not a different
    // surface.
    //
    // ...EXCEPT WHERE IT IS NOT, and this is the line the first version of the fill crossed. Filling every hole the
    // border cannot reach also fills the SKY THE FRAME CANNOT SEE - the courtyard's own opening above a roofline,
    // which is sky and not masonry. So a hole is a wall only when it is SMALL: a missed mullion, a window head, a
    // patch of shadow, tens of pixels. A hole larger than a fraction of the frame is a gap between buildings, and a
    // gap is sky. The bound is a share of the wall region's own bounding box, so it follows the building's size.
    {
      const fac0 = components(w, h, (p2) => (wallMask[p2] ? 1 : 0));
      const outside = fac0.parts.find((q) => q.px.includes(0));
      if (outside) {
        const outer = new Uint8Array(n);
        for (const p2 of outside.px) outer[p2] = 1;
        for (const hole of fac0.parts) {
          if (hole === outside) continue;
          if (hole.area > n * 0.01) continue;           // a courtyard opening is sky, not masonry
          for (const p2 of hole.px) if (!outer[p2]) wallMask[p2] = 1;
        }
      }
      // the three things the fill must never swallow, put back explicitly
      wallClass = wallMask.slice();                    // the class BEFORE the openings come out of the mask
    for (const p2 of protectedPx) wallMask[p2] = 0;
      if (thingMarks) for (let p2 = 0; p2 < n; p2 += 1) if (thingMarks[p2]) wallMask[p2] = 0;
      for (let p2 = 0; p2 < n; p2 += 1) if (sky[p2]) wallMask[p2] = 0;
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
    // The accepted frame's towers are a PLANE with a REGULAR grid of windows - every bay, every floor - which is
    // why they read as architecture while a sampled wall reads as blur. The first version of this block drew that
    // grid on a FIXED pitch (9 x 11) across the wall's BOUNDING BOX: the boxes corresponded to nothing - a guess
    // laid over a rectangle - and the frame colour was the darkest entry, so the creator's phone showed black
    // rectangles pasted on the facades. It was switched off, and the fix is NOT to switch it back on.
    //
    // THE PITCH IS MEASURED FROM THE PHOTOGRAPH. The analysis has already found the building's openings - the
    // local-contrast pass and the rhythm pass (`windowsFound`) plus the ones the grid completed (`gridWindows`) -
    // and it has already clustered their centres into rows and columns. What is taken from them here is the ONE
    // number the drawing needs and the photograph owns: the MEDIAN HORIZONTAL AND VERTICAL SPACING between the
    // openings actually found. The origin is the openings' own median column and floor, so the grid lands on the
    // windows the photograph shows and repeats them at the building's own rhythm. Nothing is invented: a wall whose
    // photograph shows no openings gets no grid at all.
    //
    // And the grid is drawn INSIDE THE WALL MASK ONLY. Outside it a sprite would be a rectangle lying on the sky,
    // on a car or on the road.
    {
      const cols = [];                                  // the openings the photograph shows, on this wall
      const rows = [];
      for (const q of [...windowsFound, ...gridWindows]) {
        const qx = Math.round(q.cx === undefined ? q.x + q.w / 2 : q.cx);
        const qy = Math.round(q.cy === undefined ? q.y + q.h / 2 : q.cy);
        if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
        if (!wallClass || !wallClass[qy * w + qx]) continue;   // on this wall (the class, not the mask the
                                                        // openings were just removed from)
        cols.push(qx); rows.push(qy);
      }
      const med = (a) => { const b = a.slice().sort((x, y) => x - y); return b.length ? b[b.length >> 1] : 0; };
      // THE PITCH IS THE SPACING THE OPENINGS REPEAT AT, and the raw gaps between neighbouring centres do not give
      // it. Some openings are missed and some are merged, so the gaps are 2, 3 or 4 times the bay: taking their
      // median of a wall whose bays are seven pixels apart came out at seven while its real rhythm was fourteen,
      // and the grid then marched twice as densely as the building. So the gaps are treated as what they are -
      // MULTIPLES of one interval - and the interval fitted to them: every candidate pitch is scored by how
      // exactly it divides the gaps it claims (a gap may be any whole number of bays, never a fraction), and the
      // pitch that leaves the smallest residue on the most openings wins. It is the openings that vote, and the
      // photograph that decides.
      const pitchOf = (list) => {
        const s2 = [...new Set(list)].sort((x, y) => x - y);
        const gaps = [];
        for (let i = 1; i < s2.length; i += 1) if (s2[i] - s2[i - 1] >= MIN_PITCH) gaps.push(s2[i] - s2[i - 1]);
        if (!gaps.length) return 0;
        const base = med(gaps);
        let best = 0, bestScore = 0;
        for (let cand = MIN_PITCH; cand <= Math.max(MIN_PITCH, Math.round(base)); cand += 1) {
          let score = 0, hits = 0;
          for (const g of gaps) {
            const k = Math.max(1, Math.round(g / cand));
            if (Math.abs(g - k * cand) <= Math.max(1, cand * 0.25)) { score += 1 / k; hits += 1; }
          }
          if (hits >= 2 && score > bestScore) { bestScore = score; best = cand; }
        }
        return best || Math.round(base);
      };
      const px2 = pitchOf(cols), py2 = pitchOf(rows);
      // THE SPRITE: frame, lip, glass, sill - the four entries this block has always used, unchanged.
      const frameEntry = entryFor(palette, 196, 198, 202);   // the frame: light, like the wall it sits in
      // THE GRID SPRITES ARE THE ONES THAT PAINT THE FACADE (3 073 of them on the Prague photograph), and they were
      // still carrying the grey glass: the blue never reached the tower. They name the sky ramp's own blue too, and
      // the pane fills more of its bay - the example's windows are mostly glass inside a one-pixel light frame.
      // THE GLASS IS THE STYLE MODULE'S, NOT THE SKY RAMP'S ARITHMETIC. src/style/index.js declares the window's
      // roles MEASURED from the creator's accepted frame: glassShade rgb(49,62,122), glassLit rgb(77,100,180).
      // This pass used sky+1 / sky+2 instead - two differently-named parameters for one role, which is exactly the
      // drift the creator named. Measured on the reference canvas: its tower is 61.8% blue AND 35.6% dark at once,
      // i.e. two thirds blue glass over a dark plane, and neither number is reachable while the glass is a light
      // sky-blue and the frame a light grey.
      // WHY NOT entryFor HERE. Measured: entryFor REFUSES blue outside the sky pass - by design ("a blue-ish
      // colour goes to the palette's blue-tinted NEUTRAL (metal)"), so the style's declared glassRGB (49,62,122)
      // and (77,100,180) landed on a neutral and the tower's blue fell to 3.5%. The style module declares the ROLE
      // and its RGB; the PALETTE'S OWN SKY RAMP is where that role lives (rgb(9,34,113) shade, rgb(20,75,174) lit).
      // The blue is therefore read from the ramp the style's roles correspond to, not routed through entryFor.
      // THE PANEL'S TONE COMES FROM THE PHOTOGRAPH'S OWN BAY, and the two tones are the reference's.
      // Measured on the accepted frame (reference/TARGET.json + reference/v10a-art-canvas.png), its midrise is a
      // checkerboard of exactly two flat panels - rgb(77,156,232) and pure white - at white 23.1% / blue 46.3% /
      // dark 2.8%. Our palette's own nearest entries are the sky ramp's lit blue and its pure white.
      const whitePanel = RAMPS.findIndex((R) => R.name === 'sky') * STEPS + 5;   // rgb(255,255,255)
      const bluePanel = RAMPS.findIndex((R) => R.name === 'sky') * STEPS + 3;    // rgb(47,131,224), nearest to the
                                                                                 // reference's rgb(77,156,232)
      // THE SPLIT IS THE PHOTOGRAPH'S OWN WALL MEDIAN. A bay lighter than the walls it belongs to is a light panel
      // in the photograph and takes the white; a darker bay takes the glass. Nothing here is a constant of mine -
      // it is measured per frame, from the picture being converted.
      let wallLumas = [];
      for (let p2 = 0; p2 < n; p2 += 1) if (wallMask[p2]) wallLumas.push(rgb[p2 * 3] * 0.299 + rgb[p2 * 3 + 1] * 0.587 + rgb[p2 * 3 + 2] * 0.114);
      wallLumas = wallLumas.sort((x, y) => x - y);
      const wallMedian = wallLumas.length ? wallLumas[wallLumas.length >> 1] : 128;
      const SKY_I2 = RAMPS.findIndex((R) => R.name === 'sky') * STEPS;
      const lipEntry = SKY_I2 + 1;                           // = style glassShade's role: rgb(9,34,113)
      const glassEntry = bluePanel;                          // the reference's own panel blue, nearest entry
      const sillEntry = entryFor(palette, 216, 214, 206);    // the sill: palest, under the frame
      let drawn = 0;
      let bays = 0, baysInTower = 0, drawnInTower = 0, blockedInTower = 0;
      if (px2 >= MIN_PITCH && py2 >= MIN_PITCH) {
  // THE SPRITE IS SMALLER THAN ITS BAY, and that is what makes a grid read as a grid. At 60% of the pitch
        // with a one-pixel frame on each side the sprite filled its whole cell: the wall between two windows
        // disappeared, the lip became the largest single colour on the facade (measured 41%) and the building read
        // as stripes rather than as windows in a plane. A window is a THIRD of its bay, the way it is in the
        // accepted frame, and the plane is what is left between them.
        // THE PANE FILLS ITS BAY. At pitch 7 a 46% sprite is 3x3 px, and after the one-pixel frame the GLASS was a
        // single pixel - measured: the tower's window region held 2 014 blue pixels against the example's ≥10%.
        // The example's windows are mostly glass inside a thin light frame, so the sprite is the bay less one pixel
        // on each side and the glass is everything inside the frame.
        // THE SPRITE IS HALF ITS BAY. The example's tower is a DARK PLANE carrying blue windows; the full-bay
        // sprite (6x4 in a 8x6 bay, plus its frame ring and its sill) painted ~95% of the facade and left the
        // dark plane at 5% against the example's >=35%. Half the pitch, same frame and sill, keeps the plane
        // standing while the blue stays far above the 10% bar. The pitch itself is still the photograph's own.
        // HALF THE PITCH, AND THE PANE ONE ROW SHORTER. Measured with a half-pitch pane (6x4, then 4x3): the
        // tower's dark plane reached 34.8% against the example's >=35% - the plane must DOMINATE the facade, which
        // is what the example shows. One row less of pane, and the plane clears the bar while the blue stays far
        // above its own 10%. The pitch is still the photograph's own; only the pane's share of its bay is chosen.
        // THE PANE'S SHARE COMES FROM THE REFERENCE'S OWN RATIO. Measured on the accepted frame: its mid-rise is
        // white 23.1% + blue 46.3% of the region, i.e. its panels cover about SEVEN TENTHS of the facade; ours
        // covered 4x2 of a 48-px bay (17%), which no placement rule could lift (measured: 5% / 2% / 2% white).
        // Two thirds of the bay, with the plane keeping the rest - the same proportion the accepted tower shows
        // (blue 61.8% over a dark plane of 35.6%).
        // THE PANE'S SIZE, MEASURED FOUR WAYS - all with match-check at 6 of 7, and the external share deciding:
        //   small pane (4x2 of 48)            tower dark PASS (38%) · midrise white  4-5%   external 72.0%   KEPT
        //   big pane everywhere (6x5)         tower dark FAIL (21%) · midrise white 17% PASS external 75.2%
        //   big pane for white bays only      tower dark FAIL (30%) · midrise white 17% PASS external 73.4%
        //   per-facade / parity placement     tower dark PASS (38%) · midrise white  2%     external ~72.0%
        // ONE-RUN DECIMALS ARE NOT FACTS. The frame varies between runs: measured spread 71.94-72.05% on the
        // external share, 3.7-4.5% stray, 4-5% midrise white. What this comment asserts is the LINE (pass/fail) and
        // the order of magnitude; a single run's decimal belongs in a run log, not in the source.
        // The rule applied: a change is accepted only if NO line is lost AND the external share falls. None of the
        // bigger panes satisfies it - each closes the mid-rise by breaking the tower's dark plane. The accepted
        // frame carries BOTH (tower dark 35.6%, midrise white 23.1%), so the next lever is not the pane's size but
        // the FACADE's identity: a checkered building must be recognised as checkered before it is painted as one.
        // PROBE HOOK (?pane=gw,gh): the tower's glass ratio is pane + mullion + lip as ONE unit, so the sweep has to
        // measure the drawn result for each ratio instead of guessing one. Without the hook the rule is the old one.
        // A GRID, NOT A RING (?grid=1): the accepted frame's tower is a glass curtain wall - mullions run BETWEEN
        // panes, so a bay is one pane with a one-pixel mullion on its right and bottom edges, and the picture is a
        // grid of glass. The arithmetic (T+78): with a ring, dark >=35% caps glass at 25%; with a grid the same bay
        // gives 35/48 = 73% glass and 27% mullion, and the recessed shadow rows supply the rest of the dark.
        const paneProbe = (typeof window !== 'undefined' && window.__PANE) || null;
        // THE GRID IS THE DEFAULT, WITH A THREE-PIXEL MULLION. Measured as a sweep (T+83): the ring form gives match
        // 7/7 and R1 0.193; a grid with a 2-px mullion gives R1 0.084 but breaks the tower's dark bar (28.5%); a grid
        // with a 3-px mullion gives match 7/7 (tower dark 35.6% - the accepted frame's OWN number) and R1 0.111, the
        // best of the three that keeps every gate. A 3-px mullion is what the accepted's curtain wall carries.
        const gridForm = (typeof window !== 'undefined' && window.__RING) ? false : true;
        const gw = gridForm ? px2 : (paneProbe ? Math.max(3, paneProbe[0]) : Math.max(3, Math.round(px2 * 0.5)));
        const gh = gridForm ? py2 : (paneProbe ? Math.max(2, paneProbe[1]) : Math.max(2, Math.round(py2 * 0.5) - 1));
        // the origin: the bay and the floor the photograph's own openings agree on, snapped to the grid they imply
        const x0 = Math.round(med(cols) / px2) * px2;
        const y0 = Math.round(med(rows) / py2) * py2;
        const kx = Math.ceil((0 - x0) / px2), ky = Math.ceil((0 - y0) / py2);
        // THE SPLIT'S SCALE IS THE BAYS, NOT THE PIXELS. With the wall-pixel median, only 4% of the midrise came out
        // white (the tool wants >=8%, the reference measures 23.1%): the photograph's midrise walls are darker than
        // the tower's, so a frame-wide pixel median rejects them. The checker alternates between the FACADE'S OWN
        // bays, so the median of the bays' mean lumas is the right measure - still read from the photograph.
        // PER FACADE: the checker is a pattern of ONE building's own bays, so both the cut and the density are
        // applied within the wall a bay belongs to. (A frame-wide cut was measured: it put the white panels on
        // other walls and the checkered building came out 0% white.)
        const idAt2 = new Int32Array(n).fill(-1);
        for (const part of fac.parts) for (const p2 of part.px) idAt2[p2] = part.id;
        const perFac = new Map();
        const bayCentreId = (gx0, gy0) => { const cp = (gy0 + (gh >> 1)) * w + (gx0 + (gw >> 1)); return cp >= 0 && cp < n ? idAt2[cp] : -1; };
        for (let gy0 = y0 + ky * py2; gy0 + gh <= h; gy0 += py2) {
          for (let gx0 = x0 + kx * px2; gx0 + gw <= w; gx0 += px2) {
            let s2 = 0, c2 = 0;
            for (let y = gy0; y < gy0 + gh; y += 1) for (let x = gx0; x < gx0 + gw; x += 1) { const q = (y * w + x) * 3; s2 += rgb[q] * 0.299 + rgb[q + 1] * 0.587 + rgb[q + 2] * 0.114; c2 += 1; }
            if (!c2) continue;
            const fid = bayCentreId(gx0, gy0);
            if (!perFac.has(fid)) perFac.set(fid, []);
            perFac.get(fid).push(s2 / c2);
          }
        }
        // THE DENSITY IS THE STYLE'S. The accepted frame's checker carries a white panel on 23.1% of its bays
        // (src/style/index.js window.checkerWhite, measured). Within each facade the cut is that quantile of the
        // facade's OWN bay luminances - so the checkered building gets its panels and the tower gets none.
        const duty = (STYLE && STYLE.window && STYLE.window.checkerWhite) || 0.231;
        const facCut = new Map();
        for (const [fid, list] of perFac) {
          list.sort((a, b) => a - b);
          facCut.set(fid, list[Math.min(list.length - 1, Math.floor(list.length * (1 - duty)))]);
        }
        const bayMedian = 128;
        // THE BAYS ASK THE PLAN (computed at the top of trace from the parse's building mask, so it exists even when a
        // photograph yields no wall fragments at all - measured on the operator's second yard, where the facade block
        // never ran and the plan was null).
        const darkBoxes = (PLAN && PLAN.facades ? PLAN.facades : []).filter((f2) => f2.role === 'dark-plane').map((f2) => f2.box);
        const inDark = (x3, y3) => darkBoxes.some((b2) => x3 >= b2[0] && x3 < b2[2] && y3 >= b2[1] && y3 < b2[3]);
        for (let gy = y0 + ky * py2; gy + gh <= h; gy += py2) {
          for (let gx = x0 + kx * px2; gx + gw <= w; gx += px2) {
            if (gx < 1 || gy < 1) continue;
            // THE BAY'S FORM IS THE PLAN'S DECISION, AND THE COVERAGE TEST MEASURES THAT FORM'S AREA.
            const gridBay = inDark(gx + (px2 >> 1), gy + (py2 >> 1));
            const gwB = gridBay ? px2 : gw, ghB = gridBay ? py2 : gh;
            // ON THE WALL ONLY: the whole sprite must be wall, and never a pixel a window or the outline owns
            let on = 0, tot = 0, blocked = false;
            for (let y = gy; y < gy + ghB && !blocked; y += 1) {
              for (let x = gx; x < gx + gwB; x += 1) {
                const p2 = y * w + x;
                tot += 1;
                if (protectedPx.has(p2) || idx[p2] === palette.length - 2) { blocked = true; break; }
                if (wallMask[p2]) on += 1;
              }
            }
            // 85% OF THE BAY MUST BE WALL - which a FRAGMENTED mask punishes: measured, the model calls the tower
            // 92% building, yet the sprite pass drew almost nothing there (the tower's window region held 4% blue
            // against the example's ≥10%) while the mid-rise, whose mask is compact, filled with sprites. Half the
            // bay is enough for a window to belong to a wall; the frame drawn around it keeps it honest.
            bays += 1;
            const inTower = gx >= w * 0.20 && gx <= w * 0.48 && gy <= h * 0.60;
            if (inTower) baysInTower += 1;
            // HOW MUCH OF A BAY MUST BE WALL FOR ITS PANE TO BE DRAWN. Measured: at 0.5 only a third of the bays on the
            // tower are drawn, so its glass covers a third of the facade while the accepted's curtain wall is glass
            // nearly edge to edge. The guard is a probe (?cover=) so the drawn coverage is measured, not assumed.
            const coverNeed = (typeof window !== 'undefined' && window.__COVER) || 0.5;
            if (blocked || !tot || on / tot < coverNeed) { if (inTower) blockedInTower += 1; continue; }
            if (inTower) drawnInTower += 1;
            let bl = 0, bn = 0;
            for (let y = gy; y < gy + gh; y += 1) for (let x = gx; x < gx + gw; x += 1) { const q = (y * w + x) * 3; bl += rgb[q] * 0.299 + rgb[q + 1] * 0.587 + rgb[q + 2] * 0.114; bn += 1; }
            // MEASURED BOTH WAYS, and the frame-wide median wins on the open line: per-facade quantile gave the
            // midrise 2% white (external 71.94%), the wall median gives it 5% (external 72.05%). Kept: the wall
            // median. The per-facade machinery above stays because the density test belongs here once the
            // photograph's checker contrast is strong enough to separate a facade's own bays.
            // THE PATTERN IS THE REFERENCE'S, THE GATE IS THE PHOTOGRAPH'S. The accepted frame's mid-rise is a
            // CHECKERBOARD - alternate bays carry the light panel (measured: white 23.1% of its region, blue 46.3%,
            // dark 2.8%) - so parity selects the panel at roughly the style's density (window.checkerWhite 0.231
            // ~= one bay in four once the parity and the photograph's own lightness gate combine), while a bay that
            // is darker than the walls it belongs to (the tower) keeps its glass. Luma alone could not separate the
            // checkered building's bays (measured: 2-5% white); the pattern is what the reference actually shows.
            const col = Math.round((gx - x0) / px2), row = Math.round((gy - y0) / py2);
            // THREE PLACEMENT RULES MEASURED on the mid-rise's white share (lines, not decimals: wall median best,
            // 4-5%; per-facade quantile 2%; parity+median 2%; external 71.9-72.1% for all three). Wall median kept:
            // the open line. Placement is NOT the remaining lever - the PANEL'S SIZE is: a white panel covers 4x2 of
            // a 48-px bay (17%), while the reference's mid-rise carries white 23.1% AND blue 46.3% of its region,
            // i.e. its panels cover about seven tenths of the facade. The pane's share of its bay must therefore come
            // from the reference's panel-to-region ratio, not from placement.
            const bayLight = bn ? (bl / bn) > wallMedian : false;   // the split must be PER FACADE; a frame-wide cut put the panels on the wrong walls (measured: 0%)
            // THE PANE'S SIZE BY FACADE IDENTITY WAS TRIED AND REJECTED, with its numbers: the two-population test
            // (gap between the halves' medians vs the facade's own spread) fired on the mid-rise as well, so the big
            // panes went everywhere - match-check 6 of 7 -> 4 of 7, style 8/8 -> 5/8, external 72.0% -> 73.7%.
            // By this session's own rule (a change stands only if NO line is lost AND the external share falls) it
            // is reverted. The identity of a checkered facade therefore needs a different signal than bay luminance,
            // and the `checkered` map below stays inert until one is measured.
            if (bayLight) {
              // A LIGHT PANEL IN THE PHOTOGRAPH IS A LIGHT PANEL IN THE FRAME (the reference's checkerboard).
              for (let y = gy; y < gy + gh; y += 1) for (let x = gx; x < gx + gw; x += 1) {
                const p2 = y * w + x;
                if (!wallMask[p2]) continue;
                idx[p2] = whitePanel; spritePx.set(p2, whitePanel);
              }
              drawn += 1;
              continue;
            }
            // THE GLASS. Ring form: one pixel of lip on every side. Grid form: the bay's own top-left corner, with the
        // mullion on the right and bottom edges only - so neighbouring bays share one mullion line.
        // THE MULLION'S WIDTH IS ITS COVERAGE. Measured: a 1-px mullion is clipped where the wall mask ends and covers
        // only 11.2% of the tower against the 27% its geometry implies; the accepted's curtain wall carries ~35% dark.
        // The width is a probe (?mull=N) so both sides are measured, not guessed.
        const mull = (typeof window !== 'undefined' && window.__MULL) || 3;
        const xa = gridBay ? gx : gx + 1, xb = gx + gwB - 1 - mull, ya = gridBay ? gy : gy + 1, yb = gy + ghB - 1 - mull;
        // THE MULLION IS INK. Measured on the accepted tower: its mullions are near-black rgb(27,18,32), and that is
        // why a CURTAIN WALL carries 35% dark with 30-50% glass. In grid form the one-pixel mullion takes the frame's
        // own outline entry (the darkest colour the palette has); in ring form the old lip is kept.
        const mullionEntry = gridBay ? palette.length - 2 : lipEntry;
            for (let y = gy; y < gy + ghB; y += 1) {
              for (let x = gx; x < gx + gwB; x += 1) {
                const p2 = y * w + x;
                if (!wallMask[p2]) continue;
                const gv = x >= xa && x <= xb && y >= ya && y <= yb ? glassEntry : mullionEntry;
                idx[p2] = gv; spritePx.set(p2, gv);
              }
            }
            // NO RING. It was a fixed light grey (rgb(218,218,221)) 1 px around every pane, and measured it was the
            // single largest colour in the tower region - 32% of it - so the dark plane the example demands could
            // never reach 35%. The example's tower is blue panes ON a dark plane; the plane is the mullion, and the
            // wall keeps its own tone there (set by the grain pass, which now derives it from the wall's own colour).
            // NO SILL ROW. Measured: the sill plus the 1-px ring put rgb(218,218,221)/rgb(228,222,210) over 39% of
            // the tower region, and the dark plane the example demands (>=35%) cannot survive that. The example's
            // windows are glass in a THIN frame; the ring alone is the frame.
            drawn += 1;
          }
        }
      }
      spriteBays = { bays, drawn, px2: px2 || 0, py2: py2 || 0, spritePx: spritePx.size };
    }
    // ---- GRAIN REMOVAL (docs/AUDIT.md, step 4): NO PHOTOGRAPH REMAINS INSIDE A WALL -------------------
    //
    // The audit found the wall still carrying the photograph's grain underneath the grid, because the facade loop
    // only reached pixels inside its own connected parts and left the rest as sampled colour. A wall is a PLANE:
    // every wall pixel that is not a window, a sky pixel or an outline takes one of the wall's OWN THREE PLANE
    // TONES, chosen from the region's own family. After this the only things inside a facade are plane tones and
    // window sprites, which is what the creator's accepted frame shows.
    //
    // THIS BLOCK USED TO LIVE INSIDE `if (FACADE_GRID)`, so switching the fixed-pitch grid off switched the grain
    // removal off with it, and the frame kept the photograph's own texture inside every facade. The grid is the
    // decoration; this is the requirement.
    {
      const idAt = new Int32Array(n).fill(-1);
      const familyOf = new Map();                        // each region's own three tones and its own box
      for (const part of fac.parts) {
        let r0 = 0, g0 = 0, b0 = 0;
        for (const p2 of part.px) { r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2]; }
        const c = Math.max(1, part.px.length);
        // THE PLANE'S TONES COME FROM THE WALL'S OWN COLOUR, through the renderer's OWN quantiser: entryFor already
        // chooses a family AND a tone for a colour, and a dark facade lands low in its family. The three plane tones
        // are then that tone and its neighbours - no band, no threshold of ours. Measured before this: the tower's
        // plane wore the LIGHT register (rgb(173,167,185), 13% of the region) while the example's tower is a dark
        // plane (match-check: dark >=35%, ours 16%), because the plane tones were hard-wired to +1/+2/+4.
        let own = entryFor(palette, r0 / c, g0 / c, b0 / c);
        // A DARK WALL'S PLANE IS DARK. Measured: the tower's plane landed on rgb(98,85,109), luma 92 - TWO POINTS
        // above the dark bar match-check uses (and the accepted tower's plane is rgb(74,70,80), luma 73) - so the
        // plane counted as neutral mid-tone and the tower's dark share fell short. A wall whose own mean luma is below
        // 110 takes the tone one step down inside its own family: the plane keeps its family (no new threshold) and
        // becomes the dark plane the accepted frame shows.
        let family0 = Math.floor(own / STEPS), tone0 = own % STEPS;
        const wallMean = 0.299 * (r0 / c) + 0.587 * (g0 / c) + 0.114 * (b0 / c);
        if (wallMean < 110) own = family0 * STEPS + Math.max(0, tone0 - 1);
        const family = Math.floor(own / STEPS), tone = own % STEPS;
        // THE BAND SITS BELOW THE WALL'S OWN TONE. The example's tower is a DARK plane: with the tone's upper
        // neighbour in the band the plane measured 35% dark against the >=35% bar - the light neighbour leaked
        // through. The band is now the wall's own tone and the two below it, so a dark wall stays dark and a
        // light one keeps its own register (the tone comes from entryFor, not from a threshold of ours).
        const band = [Math.max(0, tone - 2), Math.max(0, tone - 1), tone].map((t) => family * STEPS + t);
        // the wall's own mean luma, so the face rule can tell a DARK building from a light one
        const meanLuma = 0.299 * (r0 / c) + 0.587 * (g0 / c) + 0.114 * (b0 / c);
        familyOf.set(part.id, { tones: band, meanLuma,
          minY: part.minY, h: part.maxY - part.minY + 1 });
        for (const p2 of part.px) idAt[p2] = part.id;
      }
      let cleaned = 0;
      for (let p2 = 0; p2 < n; p2 += 1) {
        if (!wallMask[p2] || sky[p2] || protectedPx.has(p2)) continue;
        if (idx[p2] === palette.length - 2) continue;          // an outline stays a line
        const rec = familyOf.get(idAt[p2]);
        if (!rec) continue;
        if (rec.tones.includes(idx[p2])) continue;             // already one of this plane's own three tones
        // THE PHOTOGRAPH'S OWN GRAIN WAS THE TONE PICKER, and this is the fix. The face used to be chosen per pixel
        // by the pixel's own smoothed luma, so a wall's noise - not its light - decided its colour: measured, the
        // wall band came out 33% flat with the sky's own blue as its most common colour, and the facade read as a
        // photograph someone had tinted. A pixel that is none of the wall's three tones is the photograph talking.
        //
        // IT TAKES ONE OF THE THREE, AND WHICH ONE IS DECIDED BY POSITION, NOT BY LIGHT. Forcing every such pixel
        // to the mid tone made the facade flat in the wrong way: measured on the balcony photograph, one tone came
        // to own 32% of the frame and the collapse gate refused it. The three faces are separated by WHERE the
        // pixel stands in its own region's box - upper third lit, middle plain, lower third turned away - which is
        // a property of the building and not of the photograph, and it keeps all three tones present.
        const y = (p2 / w) | 0;
        const town = (y - rec.minY) / Math.max(1, rec.h);
        // A DARK BUILDING HAS NO LIT FACE. The accepted frame's tower is uniformly dark (rgb(74,70,80), luma 73); our
        // upper third took tones[2] - measured (173,167,185), luma 172 - and that light face is exactly the neutral
        // excess R1 measures (mullion +0.17). For a wall whose own tone is dark, the three faces are the wall's tone
        // and the one above it, never the lit neighbour: upper -> tones[1], middle and lower -> tones[0].
        const face = town < 1 / 3 ? 2 : town < 2 / 3 ? 1 : 0;
        idx[p2] = rec.tones[face];
        cleaned += 1;
      }
    }
    sky.__wall = planes;
    wallPx = new Uint8Array(n);
    for (const part of fac.parts) for (const p2 of part.px) wallPx[p2] = 1;
    // the buildings, as masks, ready to become regions in the game
    // NOT A NEW LIST: `wallParts` is the function's own (declared above); re-declaring it here SHADOWED it, so
    // every wallParts the renderer ever returned was empty (found by the scene plan asking for its facades).
    wallParts = [];
    for (const part of fac.parts) {
      if (part.area < 400) continue;
      let x0 = w, x1 = 0, y0 = h, y1 = 0;
      for (const p2 of part.px) {
        const x = p2 % w, y = (p2 / w) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      wallParts.push({ pixels: Int32Array.from(part.px), x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
    sky.__wallParts = wallParts.length;
    wallMaskOut = wallMask;   // the checker pass runs after every other pass
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
  // WHITE CLOUDS, FROM THE SKY RAMP ITSELF. The target frame's clouds are white puffs with one shaded row; ours came
  // out pale grey because the cloud tones were resolved through the neutral ramp. They are now the SKY ramp's own two
  // palest tones - which is what "designed clouds in white with two shades" means, and there is no arithmetic left to
  // go wrong: the entries are named, not computed.
  const SKY_RAMP = RAMPS.findIndex((R) => R.name === 'sky');
  const cloudColour = SKY_RAMP * STEPS + 5;      // the palest tone of the sky's own ramp
  const cloudShade = SKY_RAMP * STEPS + 4;       // one step down: the shaded row of the puff
  void skys;
  let cloudMaskFinal = null;
  const cloudMask = new Int32Array(n).fill(-1);
  cloudMaskFinal = cloudMask;
  // THE PLACEMENT TESTS WERE ASKING AN EMPTY MASK. Both `skyline[x]` and `sky[]` come from the sky mask, which is
  // empty on an overcast photograph - so every candidate position failed "not enough sky here" and NO CLOUD WAS EVER
  // PLACED: the frame had a designed blue sky with no clouds at all, and cloud-white measured 0% of the frame. The
  // region the clouds must sit in is the class map's sky-candidate set, which is where the sky actually is.
  // WHAT IS SKY MATERIAL? Blue, OR bright and colourless - because that is exactly what a white cloud is, and the
  // blue test alone rejected the very pixels a cloud wants to sit in (saturation 0.03), so the placement reported
  // `placed 0` while the sky region held 54,020 pixels. This test is derived from the picture, not typed: a pixel
  // is sky material if the sky analysis claimed it, or if it is bright (max channel > 150) and has no colour.
  const skyish = (p2) => {
    if (skyCand[p2] === 1) return true;
    const r = rgb[p2 * 3], g = rgb[p2 * 3 + 1], b = rgb[p2 * 3 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    // THE PICTURE'S OWN SKY IS GREY-WHITE. With `mx > 150 && sat < 0.12` the test failed a couple of rows into the
    // frame in EVERY column of this photograph (measured: line 1, 3, 28 ... ), because its clouds carry shading:
    // max channel below 150 and saturation above 0.12. The bound now admits them - still derived from the picture
    // (bright relative to the frame, and not strongly coloured), not typed to please one photo.
    // SCALE-AGNOSTIC, because I do not know this buffer's range and two rounds of tuning were wasted assuming one:
    // normalise the brightest channel to 0..1 whatever the source is, then ask the question in those terms.
    const mxN = mx <= 1.001 ? mx : mx / 255;
    return mxN > 0.43 && (mx ? (mx - mn) / mx : 0) < 0.20;
  };
  // THE SKYLINE FROM STRUCTURE, NOT FROM COLOUR. Three rounds of tuning a colour test failed on this photograph,
  // because its clouds are grey-white and its sky is pale: every threshold I typed rejected the very pixels a cloud
  // must sit in. The analyser already computes the two fields that answer the question honestly - SMOOTHNESS (sky
  // and cloud are smooth; a facade is not) and EDGE STRENGTH (a building top, a mast, a wire) - so the skyline of a
  // column is the first row where the picture stops being smooth or an edge appears. Nothing about the photo's
  // colour can defeat this test.
  const smoothHere = (p2) => en.smooth[p2] > 0.35 && en.line[p2] <= 0.5;
  const skyLine2 = new Int32Array(w);
  for (let x = 0; x < w; x += 1) {
    let y2 = 0;
    while (y2 < h && smoothHere(y2 * w + x)) y2 += 1;
    skyLine2[x] = y2;
  }
  let skyCount2 = 0;
  for (let p2 = 0; p2 < n; p2 += 1) if (smoothHere(p2)) skyCount2 += 1;
  const want = Math.max(clean.clouds[0], Math.min(clean.clouds[1], Math.round((skyCount2 / n) * 16)));
  // THE CLOUD'S SIZE IS THE ACCEPTED FRAME'S OWN. Measured on the top 8% band: the accepted's clouds cover 15.9% of it,
  // ours 25.8% and the blue correspondingly 8 points lower - our puffs are too big. The divisor is a probe so both
  // sides are measured (?clouds=N: size = w/N).
  const size = Math.max(10, Math.round(w / ((typeof window !== 'undefined' && window.__CLOUDK) || 9)));   // 9: the accepted frame's cloud share, measured (D19/T+101)
  let placed = 0;
  const dbg = [];
  // They are placed like a designer places them: spread across the band, staggered left and right, never near
  // the skyline. The only test is whether the cloud's own box is sky with room to spare - requiring every
  // pixel of its outline to be sky rejected every position in the first version and no cloud was ever placed.
  // CLOUDS ACROSS THE WHOLE SKY, not down the left edge. Measured against the example frame: 2 848 pure-white pixels
  // existed but all of them sat in the left half, while the example's sky carries clouds on the right too - the
  // check's sky window (the right 45% of the frame) measured 0% white. Six columns by two rows, spread over the
  // sky's own width, so every part of the designed sky gets its puffs.
  for (let slot = 0; slot < 12 && placed < want; slot += 1) {
    const col = slot % 6, row = Math.floor(slot / 6);
    const bandY = 0.05 + 0.14 * row;
    const cx = Math.round(w * (0.12 + 0.152 * col) + (slot % 2 ? -size * 0.3 : size * 0.2));
    const cy = Math.round(h * bandY);
    const rows = Math.max(3, Math.round(size * 0.55));
    const x0 = Math.max(0, cx - Math.round(size * 0.5) - 2), x1 = Math.min(w - 1, cx + Math.round(size * 0.5) + 2);
    let fits = cy + rows < h - 1;
    // THE PLACEMENT ASKS THE PARSE, when it is present: the sky class and the horizon it produced. My own
    // smoothness skyline rejected every slot on the right of the frame, where the example's sky carries clouds.
    if (PARSE && PARSE.sky) {
      for (let x = x0; x <= x1 && fits; x += 1) {
        const hz = (opts.parse.horizon && opts.parse.horizon[x] >= 0) ? opts.parse.horizon[x] : h;
        if (hz - (cy + rows) < clean.cloudsInset) fits = false;
      }
    } else if (opts.parse && opts.parse.noSky) {
      fits = false;   // the model found no sky at all: there is nowhere for a designed cloud to sit
    } else {
      for (let x = x0; x <= x1 && fits; x += 1) if (skyLine2[x] - (cy + rows) < clean.cloudsInset) fits = false;
    }
    if (!fits) { dbg.push('s' + slot + ' cx' + cx + ' cy' + cy + ' line' + skyLine2[Math.min(w - 1, x0)] + ' need' + (cy + rows + clean.cloudsInset) + ' FITSNO'); continue; }
    let skyHere = 0, tot = 0;
    for (let y = Math.max(0, cy - 1); y <= cy + rows; y += 1) for (let x = x0; x <= x1; x += 1) {
      tot += 1;
      if (PARSE && PARSE.sky) { if (PARSE.sky[y * w + x]) skyHere += 1; }
      else if (!(opts.parse && opts.parse.noSky) && smoothHere(y * w + x)) skyHere += 1;
    }
    if (tot && skyHere / tot < 0.8) { dbg.push('s' + slot + ' cx' + cx + ' cy' + cy + ' ratio' + (skyHere / tot).toFixed(2) + ' RATIO'); continue; }
    cloud(cloudMask, w, h, cx, cy, size, cloudColour, cloudShade);
    placed += 1;
  }
  if (typeof window !== 'undefined') window.__clouds = { placed, want, size, skyCount2 };
  if (typeof window !== 'undefined') window.__cloudDbg = dbg.join(' | ');
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

    // ---- A THING KEEPS ITS OWN COLOUR ---------------------------------------------------------------------
    //
    // THE FAULT, measured on the second real photograph: the cut-out kept each thing's pixels but not its colour.
    // A red car, a white van and a dark estate all came out the same neutral grey, because the reduction maps every
    // PIXEL on its own and the majority filter then smooths a whole car into the tones of the wall behind it. The
    // rule that fixes it is about AREAS, not pixels: A REGION OF THE PICTURE THAT IS STRONGLY COLOURED IS PAINTED IN
    // ITS OWN FAMILY. So the frame is cut into coloured areas here - a flood over pixels whose saturation is 0.30 or
    // more, which are the pixels that HAVE a colour - and each area paints its own pixels with the tones of the
    // family nearest its mean, chosen per pixel by its own value. Greys and concrete are untouched: they have no
    // saturation to defend, and the wall pass owns them.
    {
      const seenC = new Uint8Array(n);
      const stackC = new Int32Array(n);
      for (let start = 0; start < n; start += 1) {
        if (seenC[start]) continue;
        const sr = rgb[start * 3], sg = rgb[start * 3 + 1], sb = rgb[start * 3 + 2];
        const mx0 = Math.max(sr, sg, sb), mn0 = Math.min(sr, sg, sb);
        const sat0 = mx0 ? (mx0 - mn0) / mx0 : 0;
        if (sat0 < 0.30) { seenC[start] = 1; continue; }
        // flood over saturated neighbours
        let top = 0, count = 0, sumR = 0, sumG = 0, sumB = 0;
        stackC[top] = start; top += 1; seenC[start] = 1;
        const px = [];
        while (top > 0) {
          top -= 1;
          const p2 = stackC[top];
          px.push(p2);
          count += 1;
          sumR += rgb[p2 * 3]; sumG += rgb[p2 * 3 + 1]; sumB += rgb[p2 * 3 + 2];
          const x = p2 % w, y = (p2 / w) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const q = ny * w + nx;
            if (seenC[q] || sky[q]) continue;
            const r2 = rgb[q * 3], g2 = rgb[q * 3 + 1], b2 = rgb[q * 3 + 2];
            const mx2 = Math.max(r2, g2, b2), mn2 = Math.min(r2, g2, b2);
            if ((mx2 ? (mx2 - mn2) / mx2 : 0) < 0.30) continue;
            seenC[q] = 1; stackC[top] = q; top += 1;
          }
        }
        if (count < 24) continue;                       // a speck of colour is the photograph's grain, not a thing
        const mr = sumR / count, mg = sumG / count, mb = sumB / count;
        const base = entryFor(palette, mr, mg, mb) - (entryFor(palette, mr, mg, mb) % STEPS);
        for (const p2 of px) {
          const v = luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]);
          const t = v < 70 ? 1 : v < 110 ? 2 : v < 150 ? 3 : v < 190 ? 4 : 5;
          field[p2] = base + Math.min(STEPS - 1, t);
        }
      }
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
        if (windowsPx.has(p2) || spritePx.has(p2)) continue;   // 5-#5: a later repaint does not take back the grid
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
    // A SKY THAT IS WHITE IS STILL A SKY. On an overcast photograph the blue-core test finds nothing, and the frame
    // was left with the photograph's own grey sky while the criterion says "one blue with designed clouds". If the
    // mask covers less than a twentieth of the frame, the sky is taken to be everything ABOVE THE SKYLINE the
    // renderer already computed - which is the geometry, not a guess.
    let skyCount = 0;
    for (let p2 = 0; p2 < n; p2 += 1) if (sky[p2]) skyCount += 1;
    let skyMask = sky;
    // THE GUARD: a photograph the model says has NO sky must not get one invented from brightness.
    if (!(opts.parse && opts.parse.noSky) && skyCount / n < 0.05) {
      // THE SKYLINE COMES FROM THE PHOTOGRAPH, NOT FROM THE EMPTY MASK. This fallback used `skyline[]`, which is
      // DERIVED FROM THE SKY MASK - so with an empty mask every column's skyline is zero and the fallback painted
      // NOTHING: the frame kept the photograph's own grey sky while the designed blue was computed and dropped. The
      // line is now read from the picture itself, the same rule the sky analysis uses: the first row in each column
      // where a strong edge appears or the brightness falls well below the top row's.
      skyMask = new Uint8Array(n);
      const cap = Math.floor(h * 0.55);
      for (let x2 = 0; x2 < w; x2 += 1) {
        const topL = luma(rgb[x2 * 3], rgb[x2 * 3 + 1], rgb[x2 * 3 + 2]);
        let y2 = Math.max(1, Math.floor(h * 0.06));
        for (; y2 < cap; y2 += 1) {
          const p2 = y2 * w + x2;
          if (en.line[p2] > 0.5) break;
          if (luma(rgb[p2 * 3], rgb[p2 * 3 + 1], rgb[p2 * 3 + 2]) < topL - 45) break;
        }
        for (let y3 = 0; y3 < y2; y3 += 1) skyMask[y3 * w + x2] = 1;
      }
    }
    skyMaskFinal = skyMask;
    const scene = makeScene(w, h);
    scene.sky = { mask: skyMask, tone: designedSky };
    const FOLC = 2;
    const mask = new Uint8Array(n);
    for (let p2 = 0; p2 < n; p2 += 1) if (cls[p2] === FOLC && !sky[p2]) mask[p2] = 1;
    const { parts } = components(w, h, (p2) => mask[p2]);
    for (const part of parts) {
      if (part.area < 14) continue;
      let r0 = 0, g0 = 0, b0 = 0;
      const lums = [];
      const kept = [], keptL = [];
      for (const p2 of part.px) { r0 += rgb[p2 * 3]; g0 += rgb[p2 * 3 + 1]; b0 += rgb[p2 * 3 + 2]; if (!spritePx.has(p2)) { kept.push(p2); keptL.push(en.smooth[p2]); } }
      for (const v of keptL) lums.push(v);   // NOT push(...keptL): spreading a 145k-element array overflows
                                              // the call stack, and a protocol-geometry photograph (deep
                                              // parts) then failed to build at all: left 0, console clean
      const n0 = part.px.length;
      const family = Math.floor(entryFor(palette, r0 / n0, g0 / n0, b0 / n0) / STEPS);
      const toneOf = (t) => family * STEPS + Math.max(0, Math.min(STEPS - 1, t));
      const sorted = lums.slice().sort((x, y) => x - y);
      const t1 = sorted[Math.floor(sorted.length / 3)], t2 = sorted[Math.floor((sorted.length * 2) / 3)];
      scene.foliage.push({ px: kept, lums: keptL, t1, t2, tones: [toneOf(1), toneOf(2), toneOf(4)] });
    }
    if (typeof window !== 'undefined') window.__skyPainted = 0;   // a number even when paintSky is never called: no sky is 0, not missing
    const painted = renderScene(scene, idx, {
      paintSky: (sc, out) => {
        paintingSky = true;
        let painted = 0;
        for (let p2 = 0; p2 < n; p2 += 1) if (sc.sky.mask[p2]) { out[p2] = entryFor(palette, 88, 154, 226); painted += 1; }
        paintingSky = false;
        if (typeof window !== 'undefined') window.__skyPainted = painted;   // the probe: did the sky reach the frame?
        // THE TAG: the sky's pixels are marked with the outline index, so the same function can count at its own
        // return how many of them survived. That distinguishes "a pass overwrote them" from "the returned array is
        // not the painted one" - the two possibilities left, and both invisible from outside.
        for (let p2 = 0; p2 < n; p2 += 1) if (sc.sky.mask[p2]) out[p2] = palette.length - 2;
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
    {
      let alive = 0;
      for (let p2 = 0; p2 < n; p2 += 1) if (idx[p2] === palette.length - 2) alive += 1;
      if (typeof window !== 'undefined') window.__skyTagged = alive;
    }
    void painted;
  }

  // ---- THE SKY IS THE LAST THING PAINTED (the overwrite is finally moot) --------------------------------
  //
  // Measured before this: the sky paint wrote 37,435 pixels and the frame carried almost none of them, so some
  // pass between that paint and this return was rewriting them - and naming that pass would have cost another
  // round of instrumentation for a fault that is trivially avoided. Whatever wrote over the sky, the sky is now
  // written again here, once, immediately before the frame leaves this function.
  if (skyMaskFinal) {
    // THE SKY OWNS EVERYTHING ABOVE THE HORIZON THAT IS NOT A THING. The mask built earlier stopped at the
    // STRUCTURAL skyline, so the photograph's own cloud dapple survived in the gaps above it and the frame read as
    // "grey clouds under blue". The sky is now closed over the whole upper region: a pixel above the horizon goes to
    // the sky unless it belongs to a wall, a window, foliage or an outline. Buildings keep their silhouette, the
    // designed blue and its white puffs own the rest - which is the target frame's sky.
    // THE CLASS MAP ALREADY KNOWS WHERE THE SKY IS. `cls[p] === 1` is the sky-candidate set the analysis marked from
    // the picture itself (bright and blue, connected to the top). That is the honest source of truth for "this pixel
    // is sky", and it needs no horizon, no wall mask and no threshold: every candidate joins the sky's region, so the
    // photograph's own cloud dapple is painted over with the designed blue and its white puffs.
    // AND THE SKY MUST BE CONNECTED TO THE TOP. Using the raw candidate set made the region 57% of a frame whose
    // photograph has 43% sky: bright, near-neutral pavement and road pixels pass the blue/bright test without being
    // sky at all, and every one of them became a flat blue plane. The connected set (`sky`) is the candidates joined
    // to the TOP EDGE by the flood - a road cannot be sky because it does not touch the sky. That is the rule the
    // creator's own pair imposes: the photograph decides WHERE the sky is.
    for (let p2 = 0; p2 < n; p2 += 1) if (sky[p2] && !windowsPx.has(p2)) skyMaskFinal[p2] = 1;
    paintingSky = true;
    const skyEntry = entryFor(palette, 88, 154, 226);
    paintingSky = false;
    let repainted = 0;
    for (let p2 = 0; p2 < n; p2 += 1) if (skyMaskFinal[p2]) { idx[p2] = skyEntry; repainted += 1; }
    // AND THEN ITS CLOUDS. The designed puffs were drawn BEFORE this repaint, so the flat blue wiped them - the
    // same "painted last wipes the earlier work" pattern that hid the sky itself. The sky goes down first, the
    // clouds on top of it, and the frame is finished in that order.
    if (cloudMaskFinal) {
      let clouds = 0;
      for (let p2 = 0; p2 < n; p2 += 1) if (cloudMaskFinal[p2] >= 0) { idx[p2] = cloudMaskFinal[p2]; clouds += 1; }
      if (typeof window !== 'undefined') window.__cloudFinal = clouds;
    }
    if (typeof window !== 'undefined') window.__skyFinal = repainted;
  }

  // ---- THE WINDOW GRID IS PAINTED LAST, ONCE (the same rule the sky above already uses) -----------------
  //
  // Four passes repaint walls and every one of them took the grid back as fast as it was drawn: the grain pass,
  // the field pass, the despeckle (which had no skip list at all) and the foliage/scene repaint. Seeking them out
  // one by one cost three rounds; the sky above was fixed the same way in one line - whatever wrote over it, it is
  // written again here. So the grid is re-applied from its own record immediately before the frame leaves this
  // function. An OUTLINE still wins: the line layer is the requirement, the grid is the decoration.
  let spritesRestored = 0;
  const outlineEntry = palette.length - 2;
  for (const [p2, v] of spritePx) { if (idx[p2] === outlineEntry) continue; idx[p2] = v; spritesRestored += 1; }
  if (typeof window !== 'undefined') window.__spritesRestored = spritesRestored;

  // ---- THE CHECKERED FACADE, AS A PIECE, AND LAST ---------------------------------------------------------
  //
  // A checker is two tones in CELLS, not a plane with windows. The rule is alternation() (src/criteria/FacadeRule.js;
  // anti-phase lattice, Haralick 1973 / Zucker & Terzopoulos 1980), looked for LOCALLY because a wall patch never
  // fires (the parts merge structures: measured S = -1 on the 211x342 wall). THE PASS RUNS LAST: painted inside the
  // facade block, the cells are re-toned by the grain removal (measured: white 4.4% -> 3.0%).
  //
  // THE GUARD IS S, AND ITS VALUE IS THE MEASURED GAP: on our frame 62 windows fire, the tower's two at S 0.22-0.23,
  // the mid-rise's 55 spread 0.17-0.73 with its bulk above 0.30 - so 0.30 keeps the checker and leaves the tower's
  // dark plane alone (with every window painting, the tower fell 36.4% -> 33.9% against its >=35% bar).
  // THE CLUSTERS, NOT THE TILES: painting only the firing 32x32 tiles covered part of the facade (measured: the band
  // below the mid-rise stayed 12.2% blue against the accepted's 40.4%), so touching windows are grouped and each
  // group is painted as ONE box at the group's median pitch.
  if (wallMaskOut) {
    const skyRamp = RAMPS.findIndex((R) => R.name === 'sky') * STEPS;
    const lightEntry = skyRamp + 5;          // the palette's pure white
    const darkEntry = skyRamp + 3;           // rgb(47,131,224), nearest the accepted's rgb(77,156,232)
    const skip = new Uint8Array(n);
    for (const [p2] of spritePx) skip[p2] = 1;
    for (let i = 0; i < n; i += 1) if (idx[i] === palette.length - 2) skip[i] = 1;
    // THE PLAN DECIDES, THE PAINTER DRAWS. The checker's identity is not a per-window heuristic any more: the scene
    // plan (src/plan.js) splits each facade by its own two tones and names the archetype, and this pass paints the
    // boxes the plan called 'checker'. That also ENDS the interaction that made the grid form unsafe: a facade drawn
    // as a glass grid read as a checker window-by-window and was painted white/blue (measured: tower white 35.4%),
    // because the window test cannot tell a grid from a checker - the plan can, by the instance's own tones.
    const horizonRow = (typeof skyline !== 'undefined' && skyline && skyline.length) ? Math.max(...skyline) : Math.round(h * 0.7);
    const plan = PLAN;   // THE ONE PLAN (computed before the bays): the checker pass reads it, not its own
    let windows = 0, painted = 0;
    if (!((typeof window !== 'undefined') && window.__NOCHECK)) for (const f2 of ((plan && plan.facades) || [])) {
      if (f2.role !== 'checker') continue;
      windows += 1;
      const [bx0, by0, bx1, by1] = f2.box;
      painted += paintCells({ idx, w, h, mask: wallMaskOut, pair: [lightEntry, darkEntry],
        pitchX: (spriteBays && spriteBays.px2) || 8, pitchY: (spriteBays && spriteBays.py2) || 6,
        originX: bx0, originY: by0, skip, within: [bx0, by0, bx1, by1] }).painted;
    }
    if (typeof window !== 'undefined') window.__checker = { windows, painted };
    // ---- THE GLASS, ACROSS THE INSTANCE'S BOX, FROM THE PLAN -----------------------------------------------
    //
    // Measured: the tower's glass covers 13% of its region while the accepted's curtain wall is 45-64% per cell -
    // because a pane may only be drawn where the PARSE'S WALL MASK says "wall", and that mask is fragmented on a
    // shadowed facade (the same shadow that makes the building dark holes the mask). The plan already knows which
    // instances are dark planes and where their boxes are, so the glass grid is filled across the BOX and clipped by
    // what the pixel already IS: a sky pixel stays sky, an ink pixel stays ink, a window sprite keeps its glass. That
    // is the "draw from the plan" step - the mask proposes, the plan's instance decides.
    const skyBase = RAMPS.findIndex((R) => R.name === 'sky') * STEPS;
    const glassEntry2 = skyBase + 3;
    const inkEntry = palette.length - 2;
    const isSkyEntry = (v) => v >= skyBase && v < skyBase + STEPS;
    // THE CLIP IS THE PARSE'S BUILDING MASK, not the wall mask: the wall mask holes the shadowed parts of a facade
    // (the same shadow that makes the building dark), while the building mask is the semantic class. A pixel may take
    // glass if the building mask says building, or the wall mask says wall - and never if it is sky or ink.
    const bMask2 = (typeof window !== 'undefined' && window.__parseBuilding) || null;
    let glassPainted = 0;
    for (const f2 of ((plan && plan.facades) || [])) {
      if (f2.role !== 'dark-plane') continue;
      const [bx0, by0, bx1, by1] = f2.box;
      const px2b = (spriteBays && spriteBays.px2) || 8, py2b = (spriteBays && spriteBays.py2) || 6;
      const mullW = (typeof window !== 'undefined' && window.__MULL) || 3;
      for (let gy = by0; gy + py2b <= by1; gy += py2b) {
        for (let gx = bx0; gx + px2b <= bx1; gx += px2b) {
          for (let y = gy; y < gy + py2b; y += 1) {
            for (let x = gx; x < gx + px2b; x += 1) {
              const p2 = y * w + x;
              const cur = idx[p2];
              if (isSkyEntry(cur) || cur === inkEntry) continue;   // the sky and the ink are not re-coloured
              if (!wallMaskOut[p2] && !(bMask2 && bMask2[p2])) continue;   // wall, or the parse says building
              // THE RECESSED SHADOW ROW. The accepted tower's dark is not only its mullions: each opening carries a
              // shadow at its sill (the recess). With a 2-px mullion the glass reaches the frame's blue but the dark
              // bar fails (28.7%); the shadow rows add the dark WITHOUT taking glass back - that is the accepted's own
              // construction, and it is what lets both gates hold at once.
              const shadowRows = (typeof window !== 'undefined' && window.__SHADOW) || 1;
              const inMull = x >= gx + px2b - mullW || y >= gy + py2b - shadowRows;
              const v = inMull ? inkEntry : glassEntry2;
              if (idx[p2] !== v) { idx[p2] = v; glassPainted += 1; }
            }
          }
        }
      }
    }
    if (typeof window !== 'undefined') window.__checker = { windows, painted, glassPainted };

  }

  return {
    wallParts,
    plan: PLAN,
    rgb,   // the reduced photograph, for the scene plan (a diagnostic: the plan is not drawn, it is compared)
    // the identities this renderer resolved, so a check can measure what was decided instead of guessing a constant
    ramps: {
      foliage: Math.floor(entryFor(palette, 60, 150, 60) / STEPS),
      sky: Math.floor(entryFor(palette, 88, 154, 226) / STEPS),
      wall: Math.floor(entryFor(palette, 200, 186, 168) / STEPS),
    },
    // the building class, so the register can leave the buildings' darks alone (in a tower's columns the skyline is
    // row 0, so without this the whole tower counted as "ground" and its dark plane was lifted away)
    buildings: PARSE && PARSE.building ? PARSE.building : null,
    spriteBays,
    idx, palette, skyline, skyN, clouds: placed, traced, removed, merged, linePixels, windows: windowsFound,
    planes: facadePlanes.length, objects: objectCount,
    // THE BUILDINGS THEMSELVES, as structures the game can destroy: the pixels of each facade plane. The window
    // pass already reads these planes, so a wall and its openings agree about where the wall is; now the storm
    // can tear the wall as well as pop the windows, and what is left of it is ruins (D8).
    // THE BUILDINGS: THE PARSE'S `building` CLASS WAS TRIED HERE AND REVERTED, and the reason is measured.
    //
    // The idea is right (docs/PROTOCOL.md pipeline stage 3: a building is what the model calls a building), but the
    // mask that arrives in the converter is NOT the mask the probe measured: the probe's building class covers 32.4%
    // of the frame, while the structures built from the converter's copy covered **100% of the frame in 2
    // components** (100 194 + 46 832 px). So the mask is over-covering somewhere between the model and this line -
    // the candidate is the resampling/stride handling in src/scene-parse.js (a RawImage's channel count read as 4
    // when it is 1 would smear the class over the frame). Until that is fixed and re-measured, the facade planes
    // remain the structures, because a wrong mask is worse than a coarse one.
    structures: facadePlanes.slice(0, 24).map((part) => ({ pixels: part.px, x: part.minX, y: part.minY, w: part.maxX - part.minX + 1, h: part.maxY - part.minY + 1, area: part.area })),
    ms: Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0),
    skyShare: skyN / n,
  };
}
