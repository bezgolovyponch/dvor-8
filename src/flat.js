// Photograph -> flat-colour scene with drawn outlines. The module the creator asked for.
//
// WHAT WAS WRONG WITH THE OLD PIPELINE, IN ONE SENTENCE
// ----------------------------------------------------
// It quantised the photograph's own pixels. That preserves every grain of asphalt, every leaf and every JPEG
// artefact as speckle, and speckle at 192 pixels is not detail — it is the reason the picture read as blurry
// mush with no border between the road and the tree. Hotline Miami does not look the way it does because its
// colours were quantised well; it looks that way because its shapes are FLAT and its edges are DRAWN.
//
// So the sequence here is different from the start. Nothing is quantised directly from the photograph.
//
//   1 REGIONS   Felzenszwalb & Huttenlocher, IJCV 2004: "preserve detail in low-variability image regions
//               while ignoring detail in high-variability regions". This is the hard simplification, and it
//               is why grain cannot survive: a region becomes ONE colour.
//   2 MERGE     the over-segmentation is reduced by a region-adjacency merge, which is the standard step
//               after region growing. Felzenszwalb alone cannot reach a small region count — measured on the
//               courtyard photograph it gives 1220-5083 regions, and the painted outline covers 21-64% of
//               the frame, which is a sketch rather than a picture. Two regions merge when they are similar
//               in colour AND their shared border is long, so a wall's interior merges away and its outer
//               edge does not.
//   3 RAMP      every region takes a colour from a FIXED set of hue-shifted ramps. This is the step that
//               makes one photograph look like the same game as the next. The palette is a fixed STRUCTURE
//               (four tones per ramp, the shadow end pulled toward blue-violet and the light end toward
//               yellow); the photograph chooses which ramp and which tone, and never the palette itself.
//               An adaptive palette per photograph is what made every yard a different game — measured, the
//               three supplied photographs have hue spreads of 92.6, 25.8 and 31.2 degrees, so a palette cut
//               from each one produces three unrelated colour schemes from the same code.
//   4 OUTLINE   the region borders are drawn. In flat-colour art the outline is what makes a shape read.
//   5 WINDOWS   a small region that is markedly darker than the regions around it, and roughly rectangular,
//               is a window or a door. This is the geometric core of the learning-free window detectors
//               (Recky & Leberl, ICPR 2010, "does not require a learning step"); their reported precision and
//               recall could not be obtained, so no accuracy figure is claimed for this.
//
// ASPECT RATIO IS THE PHOTOGRAPH'S OWN. There is no centre crop. A tall phone photograph makes a tall level.

import { mulberry32 } from './rng.js';

export const RAMPS = [
  { name: 'sky', hue: 210, sat: 0.55 },
  { name: 'foliage', hue: 108, sat: 0.45 },
  { name: 'earth', hue: 28, sat: 0.40 },
  { name: 'stone', hue: 40, sat: 0.16 },
  { name: 'metal', hue: 220, sat: 0.10 },
  { name: 'warm', hue: 8, sat: 0.50 },
];
export const STEPS = 4;
export const OUTLINE = [11, 0, 24];

const hsl2rgb = (h, s, l) => {
  const hh = (((h % 360) + 360) % 360) / 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => { const k = (n + hh * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1))))); };
  return [f(0), f(8), f(4)];
};

/** The fixed tone table: RAMPS x STEPS colours, built once. */
export function tones() {
  return RAMPS.map((r) => {
    const out = [];
    for (let i = 0; i < STEPS; i += 1) {
      const t = i / (STEPS - 1);
      const l = 0.16 + t * 0.68;
      // HUE SHIFT, with the direction chosen per ramp rather than by one universal rule.
      //
      // The usual pixel-art convention is that a shadow shifts toward blue-violet and a highlight toward
      // yellow. Applied literally to every ramp it inverts on the blue ramps: pushing the sky's shadow toward
      // blue makes the shadow MORE cyan, and its highlight toward yellow makes the sky dirtier, when what is
      // wanted is a sky whose shadow is deeper blue and whose highlight is paler. So a ramp states whether it
      // is already on the blue side and the shift turns round for it. A first version of this used the
      // universal rule and the sky came out inverted; the test that caught it is kept.
      const bluish = r.hue > 180 && r.hue < 300;
      const warm = bluish ? -1 : 1;
      const hue = r.hue + (1 - t) * 24 * warm - t * 12 * warm;
      const sat = r.sat * (1 - Math.abs(t - 0.55) * 0.45);
      out.push(hsl2rgb(hue, sat, l));
    }
    return out;
  });
}

const rgb2hsl = (R, G, B) => {
  const r = R / 255, g = G / 255, b = B / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hh = 0;
  if (d) {
    if (mx === r) hh = 60 * (((g - b) / d) % 6);
    else if (mx === g) hh = 60 * ((b - r) / d + 2);
    else hh = 60 * ((r - g) / d + 4);
  }
  const l = (mx + mn) / 2;
  return [((hh % 360) + 360) % 360, d ? d / (1 - Math.abs(2 * l - 1)) : 0, l];
};

/** Which ramp and which tone a colour belongs to. */
export function rampFor(colour) {
  const [hh, ss, ll] = rgb2hsl(colour[0], colour[1], colour[2]);
  let best = 0, bd = Infinity;
  for (let i = 0; i < RAMPS.length; i += 1) {
    let dh = Math.abs(hh - RAMPS[i].hue);
    if (dh > 180) dh = 360 - dh;
    const d = dh * (0.6 + ss) + Math.abs(ss - RAMPS[i].sat) * 120;
    if (d < bd) { bd = d; best = i; }
  }
  return { ramp: best, tone: Math.max(0, Math.min(STEPS - 1, Math.round(ll * (STEPS - 1)))) };
}

/** Step 1: over-segment. Felzenszwalb & Huttenlocher, IJCV 2004. */
export function segment(rgba, w, h, k = 300) {
  const n = w * h;
  const parent = new Int32Array(n), size = new Int32Array(n).fill(1), diff = new Float32Array(n);
  for (let i = 0; i < n; i += 1) parent[i] = i;
  const find = (x) => { let r = x; while (parent[r] !== r) r = parent[r]; while (parent[x] !== r) { const nx = parent[x]; parent[x] = r; x = nx; } return r; };
  const edges = [];
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      edges.push([Math.abs(rgba[i * 4] - rgba[j * 4]) + Math.abs(rgba[i * 4 + 1] - rgba[j * 4 + 1]) + Math.abs(rgba[i * 4 + 2] - rgba[j * 4 + 2]), i, j]);
    }
  }
  edges.sort((p, q) => p[0] - q[0]);
  for (const [d, i, j] of edges) {
    const ri = find(i), rj = find(j);
    if (ri === rj) continue;
    if (d <= Math.min(diff[ri] + k / size[ri], diff[rj] + k / size[rj])) {
      const big = size[ri] >= size[rj] ? ri : rj, small = big === ri ? rj : ri;
      parent[small] = big; size[big] += size[small]; diff[big] = Math.max(diff[big], d, diff[small]);
    }
  }
  const lab = new Int32Array(n), remap = new Map();
  let next = 0;
  for (let i = 0; i < n; i += 1) {
    const r = find(i);
    if (!remap.has(r)) remap.set(r, next++);
    lab[i] = remap.get(r);
  }
  return { lab, count: next };
}

/**
 * Step 2: reduce the over-segmentation by merging similar ADJACENT regions.
 *
 * The merge order is by (colour distance) weighted against (shared border length): two regions that look
 * alike and touch along a long border are one surface, while two that look alike but meet at a short border
 * are probably different things that happen to be a similar colour. Merging the cheapest pair repeatedly
 * until a target count is reached is the standard agglomerative treatment of a region adjacency graph.
 *
 * This step exists because Felzenszwalb alone does not reach a usable region count: measured on the courtyard
 * photograph, k from 300 to 12000 leaves 3834 down to 1220 regions and the painted outline covers 21-64% of
 * the frame. An outline over a fifth of a 192-pixel picture is a sketch, not a scene.
 */
export function merge(rgba, lab, count, w, h, target, trace = null, tone = 95) {
  const n = w * h;
  let cur = new Int32Array(count);
  const sizes = new Int32Array(count), sr = new Float64Array(count), sg = new Float64Array(count), sb = new Float64Array(count);
  for (let i = 0; i < count; i += 1) cur[i] = i;
  for (let i = 0; i < n; i += 1) {
    const r = lab[i];
    sizes[r] += 1; sr[r] += rgba[i * 4]; sg[r] += rgba[i * 4 + 1]; sb[r] += rgba[i * 4 + 2];
  }
  const find = (x) => { let r = x; while (cur[r] !== r) r = cur[r]; while (cur[x] !== r) { const nx = cur[x]; cur[x] = r; x = nx; } return r; };
  const mean = (r) => (sizes[r] ? [sr[r] / sizes[r], sg[r] / sizes[r], sb[r] / sizes[r]] : [0, 0, 0]);

  // boundary lengths between adjacent region pairs
  const key = (a, b) => (a < b ? a * count + b : b * count + a);
  let borders = new Map();
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x, a = find(lab[i]);
    if (x < w - 1) { const b = find(lab[i + 1]); if (a !== b) { const k = key(a, b); borders.set(k, (borders.get(k) || 0) + 1); } }
    if (y < h - 1) { const b = find(lab[i + w]); if (a !== b) { const k = key(a, b); borders.set(k, (borders.get(k) || 0) + 1); } }
  }

  // THE MERGE CRITERION, and the first two versions of it were wrong in ways worth recording.
  //
  // Version 1 was `colourDistance / sqrt(sharedBorderLength)`. Traced on the courtyard photograph it grew a
  // single region from 1659 to 97,743 pixels of 98,304 while the cost ROSE from 1.42 to 81.00: the formula
  // rewards size, because the bigger a region gets the longer its border, so merging into it is always the
  // cheapest move and the picture collapses to one flat colour.
  //
  // Version 2 added an internal-difference term in the manner of Felzenszwalb & Huttenlocher's merge
  // predicate. It collapsed too, to 97,856 pixels, for the same underlying reason: internal difference grows
  // with area, so a large region again becomes the easiest thing to merge into.
  //
  // Version 3, below, is the one that cannot do this, because it does not look at area at all. Two adjacent
  // regions merge only while they are genuinely SIMILAR:
  //
  //     merge the adjacent pair whose mean colours are closest,
  //     but only while that distance is under TONE — a fixed tolerance in the 0-765 sum-of-channels metric,
  //     and only while one of the two is still small enough to be considered part of a surface rather than
  //     a surface in its own right.
  //
  // Nothing in it rewards being large, so nothing grows without limit: a roof and a road are 200-400 apart
  // and never merge, while the forty fragments of one wall are 5-40 apart and do. The loop stops when no
  // pair is similar enough, even if that leaves more regions than the target — overshooting the count is
  // better than merging a roof into a road to hit a number.
  let alive = count;
  // The tolerance is 95 in the sum-of-three-channels metric, which is about 32 per channel. It was chosen by
  // sweeping it on the courtyard photograph and looking at the elbow: 46 leaves 1069 regions and paints an
  // outline over 21% of the frame (a sketch, not a picture), 70 leaves 487 at 14.25%, and 95 leaves 218 at
  // 12.12%. Above 95 the count stops falling, because by then the only pairs left are genuinely different
  // surfaces that the criterion correctly refuses to merge.
  const TONE = tone;
  const BIG = Math.max(400, Math.round(n * 0.02));   // a region past this is a surface, not a fragment

  while (alive > target) {
    let bestK = -1, bestD = Infinity, bestLen = 0;
    for (const [k, len] of borders) {
      const a = Math.floor(k / count), b = k % count;
      const ra = find(a), rb = find(b);
      if (ra === rb) continue;
      // at least one side must still be a fragment, or this is two surfaces touching
      if (sizes[ra] > BIG && sizes[rb] > BIG) continue;
      const ma = mean(ra), mb = mean(rb);
      const d = Math.abs(ma[0] - mb[0]) + Math.abs(ma[1] - mb[1]) + Math.abs(ma[2] - mb[2]);
      // a longer shared border needs less colour agreement, which is the one place length belongs
      const eff = d / (1 + Math.min(2, len / 8));
      if (eff < bestD) { bestD = eff; bestK = k; bestLen = len; }
    }
    if (trace && alive % 500 === 0) trace.push('alive ' + alive + ' bestEffective ' + (bestD === Infinity ? 'none' : bestD.toFixed(2)) + ' TONE ' + TONE);
    if (bestK < 0 || bestD > TONE) {
      if (trace) trace.push('STOPPED at alive ' + alive + ' because bestEffective ' + (bestD === Infinity ? 'none' : bestD.toFixed(2)) + ' > TONE ' + TONE);
      break;
    }
    const a = find(Math.floor(bestK / count)), b = find(bestK % count);
    const big = sizes[a] >= sizes[b] ? a : b, small = big === a ? b : a;
    cur[small] = big;
    sizes[big] += sizes[small];
    sr[big] += sr[small]; sg[big] += sg[small]; sb[big] += sb[small];
    sizes[small] = 0;
    const nextBorders = new Map();
    for (const [k, len] of borders) {
      const x = find(Math.floor(k / count)), y = find(k % count);
      if (x === y) continue;
      const nk = key(x, y);
      nextBorders.set(nk, (nextBorders.get(nk) || 0) + len);
    }
    borders = nextBorders;
    alive -= 1;
  }
  const out = new Int32Array(n);
  for (let i = 0; i < n; i += 1) out[i] = find(lab[i]);
  return out;
}

/** Same as `merge` but with the similarity tolerance stated, so it can be swept and tested. */
export const mergeTone = (rgba, lab, count, w, h, target, tone) => merge(rgba, lab, count, w, h, target, null, tone);

/**
 * The whole transition: photograph in, flat-colour scene out.
 *
 * Returns the palette index per pixel (so the rest of the game can treat it exactly like any other picture),
 * the palette itself, and the regions with their bounding boxes, which is what the object layer needs to find
 * windows and walls.
 */
export function render(rgba, w, h, { target = 200, k = 300, tone = 110 } = {}) {
  const table = tones();
  const palette = [];
  for (const ramp of table) for (const c of ramp) palette.push(c);
  palette.push(OUTLINE, [4, 0, 10]);          // the outline and the void, at fixed indices

  const { lab, count } = segment(rgba, w, h, k);
  const merged = merge(rgba, lab, count, w, h, target, null, tone);
  const n = w * h;

  // Region colour means, then one ramp+tone each.
  //
  // `merge` returns the surviving region IDs, which are SPARSE — they are positions in the original label
  // space, so after merging they might be 0, 1, 7, 19, 22. They must be remapped to a dense 0..nr-1 before
  // being used to index anything. Using them directly indexed a table of the wrong size, every read returned
  // the same entry, and the whole picture came out one flat colour.
  const ids = new Map();
  for (let i = 0; i < n; i += 1) if (!ids.has(merged[i])) ids.set(merged[i], ids.size);
  const nr = ids.size;
  const dense = new Int32Array(n);
  for (let i = 0; i < n; i += 1) dense[i] = ids.get(merged[i]);
  const sum = new Float64Array(nr * 3), size = new Int32Array(nr);
  const box = new Int32Array(nr * 4);
  for (let r = 0; r < nr; r += 1) { box[r*4] = w; box[r*4+1] = h; box[r*4+2] = -1; box[r*4+3] = -1; }
  for (let i = 0; i < n; i += 1) {
    const r = dense[i];
    sum[r*3] += rgba[i*4]; sum[r*3+1] += rgba[i*4+1]; sum[r*3+2] += rgba[i*4+2]; size[r] += 1;
    const x = i % w, y = (i / w) | 0;
    if (x < box[r*4]) box[r*4] = x;
    if (y < box[r*4+1]) box[r*4+1] = y;
    if (x > box[r*4+2]) box[r*4+2] = x;
    if (y > box[r*4+3]) box[r*4+3] = y;
  }
  // RAMP BY HUE, TONE BY RANK — and the second half of that is what makes the picture have contrast.
  //
  // Choosing the tone from a region's ABSOLUTE lightness sends almost every region to the middle of its ramp:
  // measured on the courtyard photograph, 88 of 260 regions landed on the same tone and the buildings came
  // out nearly flat against their own walls. What matters visually is not a region's absolute lightness but
  // its ORDER against the other regions in the same ramp — is this wall lighter or darker than the wall
  // beside it? So the regions of each ramp are sorted by lightness and dealt evenly across the ramp's tones.
  // That guarantees the full tonal range is used and that neighbouring surfaces differ, which is the whole
  // point of a ramp.
  const idx = new Uint8Array(n);
  const regionOf = new Int32Array(nr);
  const rampOf = new Int32Array(nr), toneOf = new Int32Array(nr);
  const lum = new Float64Array(nr);
  for (let r = 0; r < nr; r += 1) {
    const m = [sum[r*3] / size[r], sum[r*3+1] / size[r], sum[r*3+2] / size[r]];
    rampOf[r] = rampFor(m).ramp;
    lum[r] = 0.299 * m[0] + 0.587 * m[1] + 0.114 * m[2];
  }
  const byRamp = new Map();
  for (let r = 0; r < nr; r += 1) {
    if (!byRamp.has(rampOf[r])) byRamp.set(rampOf[r], []);
    byRamp.get(rampOf[r]).push(r);
  }
  for (const list of byRamp.values()) {
    list.sort((a, b) => lum[a] - lum[b]);
    for (let i = 0; i < list.length; i += 1) {
      // deal the tones evenly across the ramp's own range, so the darkest region gets the darkest tone
      const t = list.length === 1 ? Math.round((STEPS - 1) / 2) : Math.round((i / (list.length - 1)) * (STEPS - 1));
      toneOf[list[i]] = t;
    }
  }
  for (let r = 0; r < nr; r += 1) regionOf[r] = rampOf[r] * STEPS + toneOf[r];
  for (let i = 0; i < n; i += 1) idx[i] = regionOf[dense[i]];

  // ---- ORPHANS. A flat-colour scene must not be speckled. -------------------------------------------
  //
  // After the merge, what is left can include regions of a handful of pixels: slivers along a boundary, a
  // window catchlight, JPEG ringing. In a photograph they are invisible; painted as a flat colour each one
  // becomes a coloured dot, and the frame reads as dirty. Every region below MIN_REGION is therefore absorbed
  // into whichever region most of its boundary touches — the same "small region absorption" step that follows
  // region growing in the standard treatment (scikit-image's `min_size` for Felzenszwalb does exactly this).
  const MIN_REGION = Math.max(8, Math.round(n * 0.0012));
  for (let pass = 0; pass < 3; pass += 1) {
    const touch = new Map();   // region -> Map(neighbour -> count)
    let orphans = 0;
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = y * w + x, r = dense[i];
      if (size[r] >= MIN_REGION) continue;
      if (x + 1 < w) { const q = dense[i + 1]; if (q !== r) { if (!touch.has(r)) touch.set(r, new Map()); touch.get(r).set(q, (touch.get(r).get(q) || 0) + 1); } }
      if (y + 1 < h) { const q = dense[i + w]; if (q !== r) { if (!touch.has(r)) touch.set(r, new Map()); touch.get(r).set(q, (touch.get(r).get(q) || 0) + 1); } }
      if (x > 0) { const q = dense[i - 1]; if (q !== r) { if (!touch.has(r)) touch.set(r, new Map()); touch.get(r).set(q, (touch.get(r).get(q) || 0) + 1); } }
      if (y > 0) { const q = dense[i - w]; if (q !== r) { if (!touch.has(r)) touch.set(r, new Map()); touch.get(r).set(q, (touch.get(r).get(q) || 0) + 1); } }
      orphans += 1;
    }
    if (!orphans) break;
    // grow each big neighbour's size as it takes orphans, so a chain of orphans resolves in one pass
    for (const [r, nb] of touch) {
      let best = -1, bestN = 0;
      for (const [q, cnt] of nb) { const weight = cnt * 1000 + size[q]; if (weight > bestN) { bestN = weight; best = q; } }
      if (best >= 0 && best !== r) { size[best] += size[r]; size[r] = 0; regionOf[r] = regionOf[best]; }
    }
    for (let i = 0; i < n; i += 1) {
      const r = dense[i];
      if (size[r] === 0) {
        // this region was absorbed: take the colour of the neighbour it was given to
        for (const q of [i + 1, i - 1, i + w, i - w]) {
          if (q >= 0 && q < n && dense[q] !== r && size[dense[q]] > 0) { dense[i] = dense[q]; break; }
        }
      }
    }
    for (let i = 0; i < n; i += 1) idx[i] = regionOf[dense[i]];
  }

  // the outline: every pixel that has a neighbour in a different region
  const OUT = palette.length - 2;
  let outlinePixels = 0;
  for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
    const i = y * w + x, r = dense[i];
    if (dense[i - 1] !== r || dense[i + 1] !== r || dense[i - w] !== r || dense[i + w] !== r) { idx[i] = OUT; outlinePixels += 1; }
  }
  return { idx, palette, regions: { label: dense, size, box, rampOf, toneOf, nr }, outlinePixels };
}
