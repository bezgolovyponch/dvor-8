// The stages that turn a downscaled photograph into pixel art in ONE fixed palette (ramps.js). Pure: arrays
// in, arrays out. stylise.js runs them in order; each is exported so it can be tested and measured alone.
//
//   grade      stretch the photograph's own light range, push its colour up — in OKLab, so lightness and
//              colour are moved separately and a sky does not change brightness when it gets bluer
//   mapRamps   each pixel takes a colour of the fixed palette; where it sits between two neighbouring
//              steps of the same ramp, a 2×2 checker of the two instead of a hard band
//   cleanup    single stray pixels are replaced by their neighbourhood's colour (pixel-art "orphans")
//   selOut     a one-pixel outline on the DARK side of every strong boundary, in the darker step of the
//              surface's own ramp — the pixel-art "selective outline", not a black line pasted over
//
// The order is the order a pixel artist works in: colour, then clean-up, then line.

import { toOklab } from './ramps.js';

export const CHROMA_GAIN = 1.55;   // CHOICE: how much colour the grade adds; set on the three test yards
export const CHROMA_WEIGHT = 2.2;  // CHOICE: in matching, a step in colour counts this much more than in light
export const CHECKER = 0.82;       // CHOICE: second-nearest within this share of the nearest → dither
export const EDGE_L = 0.13;        // CHOICE: OKLab lightness step that makes a boundary worth an outline
export const NEUTRAL_C = 0.05;     // MEASURED: a blue-grey concrete wall graded to 0.039, a clear sky to 0.076,
                                   // foliage to 0.086. Below this a surface has no hue worth keeping and is grey
export const FLAT = 0.0025;        // CHOICE: lightness variance (3×3) under which a surface is smooth enough to dither
export const DETAIL = 0.8;         // CHOICE: local-contrast gain on lightness before mapping

/** Grade: rgba → OKLab planes, lightness stretched to the photo's 1%..99%, chroma multiplied. */
export function grade(rgba, n) {
  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  const bins = new Uint32Array(256);
  for (let i = 0; i < n; i += 1) {
    const c = toOklab(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]);
    L[i] = c[0]; A[i] = c[1]; B[i] = c[2];
    bins[Math.max(0, Math.min(255, (c[0] * 255) | 0))] += 1;
  }
  const at = (share) => { let seen = 0; for (let i = 0; i < 256; i += 1) { seen += bins[i]; if (seen >= share * n) return i / 255; } return 1; };
  const lo = at(0.01), hi = at(0.99), span = Math.max(0.12, hi - lo);
  for (let i = 0; i < n; i += 1) {
    // stretched to 0.06..0.96, so the darkest and lightest steps of the palette are both reached
    const t = Math.max(0, Math.min(1, (L[i] - lo) / span));
    L[i] = 0.06 + 0.90 * t;
    A[i] *= CHROMA_GAIN; B[i] *= CHROMA_GAIN;
  }
  return { L, A, B };
}

/**
 * Each pixel takes a colour of the fixed palette the way a pixel artist assigns one: HUE first, then light.
 *
 * Plain nearest-colour in OKLab was tried first and failed in a specific way: overcast foliage has a hue
 * between the yellow and green ramps and little chroma, so its nearest colour was a dark yellow — every tree
 * came out olive-brown. Choosing the ramp by hue angle and only then the step by lightness keeps a tree on
 * the green ramp however dull it is. Below NEUTRAL_C of chroma there is no hue worth keeping and the pixel
 * goes to the grey ramp.
 *
 * Where a pixel sits between two neighbouring steps, a 2×2 checker of the two. Ordered dither between exactly
 * TWO colours is safe on an uneven palette: Surma's objection ("ordered dithering requires your color palette
 * to be evenly spaced", docs/style.md F24) is about a threshold matrix spread over a whole palette, not about
 * mixing a neighbouring pair.
 */
export function mapRamps(lab, w, h, ramps) {
  const P = ramps.map((r) => toOklab(...r.rgb));
  const hueOf = (a, b) => ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
  // candidate sets: the grey ramp with the deep shadow; and for every family its own steps, plus the
  // ends of the grey ramp, so a near-black or near-white pixel can still leave the family
  const deep = ramps.findIndex((r) => r.family === 'deep');
  const greys = ramps.map((r, i) => i).filter((i) => ramps[i].family === 'neutral');
  const darkest = greys[0], lightest = greys[greys.length - 1];
  const fams = [...new Set(ramps.map((r) => r.family))].filter((f) => f !== 'neutral' && f !== 'deep');
  const famHue = fams.map((f) => {
    const mid = ramps.findIndex((r) => r.family === f && r.step === 1);
    return hueOf(P[mid][1], P[mid][2]);
  });
  const sets = fams.map((f) => [...ramps.map((r, i) => i).filter((i) => ramps[i].family === f), deep, darkest, lightest]);
  const greySet = [...greys, deep];
  const n = w * h, idx = new Uint8Array(n);
  // The ramp is chosen from the colour of the NEIGHBOURHOOD, not of the pixel: one leaf's highlight or one
  // grey pixel inside a tree must not switch ramps, or the surface breaks into speckle of two hues. The
  // step within the ramp is still chosen from the pixel's own lightness, so detail survives.
  //
  // The vote is EDGE-AWARE (a bilateral weight in OKLab): a plain box blur was tried first and carried a red
  // car's hue two pixels into the asphalt beside it, which then took the red ramp's dark step — a red halo
  // round every coloured thing. A neighbour now counts only as much as it looks like the same surface.
  const { a: ma, b: mb } = hueVote(lab, w, h);
  const mL = boxBlur(lab.L, w, h, 1), mL2 = boxBlur(lab.L.map((v) => v * v), w, h, 1);
  for (let i = 0; i < n; i += 1) {
    const l = lab.L[i], a = lab.A[i], b = lab.B[i], c = Math.hypot(ma[i], mb[i]);
    let set = greySet;
    // In shadow a phone's colour is mostly noise and white balance: a dark pixel needs more colour before it
    // is trusted to have a hue, or grey asphalt in low sun turns into a dark red streak.
    if (c >= NEUTRAL_C * (l < 0.3 ? 1.6 : 1)) {
      const hh = hueOf(ma[i], mb[i]);
      let f = 0, fd = 999;
      famHue.forEach((fh, j) => { const d = Math.abs(((hh - fh + 540) % 360) - 180); if (d < fd) { fd = d; f = j; } });
      set = sets[f];
    }
    let b1 = set[0], d1 = 1e9, b2 = set[0], d2 = 1e9;
    for (const j of set) {
      const p = P[j], d = (p[0] - l) ** 2 + CHROMA_WEIGHT * ((p[1] - a) ** 2 + (p[2] - b) ** 2);
      if (d < d1) { b2 = b1; d2 = d1; b1 = j; d1 = d; } else if (d < d2) { b2 = j; d2 = d; }
    }
    let pick = b1;
    // dither only where the surface is smooth (a sky, a wall): in texture the checker is noise on noise
    const flat = mL2[i] - mL[i] * mL[i] < FLAT;
    if (flat && d1 > CHECKER * d2) { const x = i % w, y = (i / w) | 0; if ((x + y) & 1) pick = b2; }
    idx[i] = pick;
  }
  return idx;
}

// The colour (a, b) of a pixel's surface: a 5×5 average weighted by how close each neighbour is in OKLab.
// sigma 0.06 is about the distance between two neighbouring steps of a ramp (CHOICE).
export function hueVote(lab, w, h, r = 2, sigma = 0.06) {
  const n = w * h, oa = new Float32Array(n), ob = new Float32Array(n), k = 1 / (2 * sigma * sigma);
  const { L, A, B } = lab;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    let sw = 0, sa = 0, sb = 0;
    for (let dy = -r; dy <= r; dy += 1) {
      const yy = y + dy; if (yy < 0 || yy >= h) continue;
      for (let dx = -r; dx <= r; dx += 1) {
        const xx = x + dx; if (xx < 0 || xx >= w) continue;
        const j = yy * w + xx, d = (L[j] - L[i]) ** 2 + (A[j] - A[i]) ** 2 + (B[j] - B[i]) ** 2;
        const wt = Math.exp(-d * k);
        sw += wt; sa += wt * A[j]; sb += wt * B[j];
      }
    }
    oa[i] = sa / sw; ob[i] = sb / sw;
  }
  return { a: oa, b: ob };
}

// Box mean over a (2r+1)² window, clamped at the edges.
export function boxBlur(src, w, h, r) {
  const tmp = new Float32Array(w * h), out = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k += 1) { const xx = x + k; if (xx >= 0 && xx < w) { s += src[y * w + xx]; c += 1; } }
    tmp[y * w + x] = s / c;
  }
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    let s = 0, c = 0;
    for (let k = -r; k <= r; k += 1) { const yy = y + k; if (yy >= 0 && yy < h) { s += tmp[yy * w + x]; c += 1; } }
    out[y * w + x] = s / c;
  }
  return out;
}

/**
 * Local contrast: L plus DETAIL × (L − its blur). A window two pixels across in a wall a shade lighter than
 * it would otherwise land on the same palette step as the wall and disappear; this is the unsharp mask,
 * applied to lightness only so it cannot shift a colour.
 */
export function detail(lab, w, h, amount = DETAIL, r = 3) {
  const src = lab.L, blur = boxBlur(src, w, h, r);
  for (let i = 0; i < src.length; i += 1) src[i] = Math.max(0, Math.min(1, src[i] + amount * (src[i] - blur[i])));
  return lab;
}

/**
 * A pixel with at most one same-coloured neighbour among its eight, and not on a one-pixel line, takes the
 * colour most of its neighbours have. Checkered dither is left alone: a checker pixel has four same-coloured
 * DIAGONAL neighbours, so it is never an orphan by this count.
 */
export function cleanup(idx, w, h, passes = 1) {
  for (let pass = 0; pass < passes; pass += 1) {
    const src = idx.slice();
    const votes = new Uint8Array(256);
    for (let y = 1; y < h - 1; y += 1) for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x, v = src[i];
      let same = 0;
      const nb = [i - w - 1, i - w, i - w + 1, i - 1, i + 1, i + w - 1, i + w, i + w + 1];
      for (const j of nb) if (src[j] === v) same += 1;
      if (same > 1) continue;
      let best = v, most = 0;
      for (const j of nb) { votes[src[j]] += 1; if (votes[src[j]] > most) { most = votes[src[j]]; best = src[j]; } }
      for (const j of nb) votes[src[j]] = 0;
      if (most >= 3) idx[i] = best;
    }
  }
  return idx;
}

/**
 * Selective outline. Where a pixel is darker than a 4-neighbour by more than EDGE_L in OKLab lightness and
 * they are different colours, the darker pixel goes one step down its own ramp (or to the deep shadow from
 * the bottom of a ramp). The line therefore sits on the darker surface, in that surface's own colour: a car
 * against asphalt gets a darker-car rim, not a black stroke. Returns how many pixels were inked.
 */
export function selOut(idx, w, h, ramps) {
  const Ls = ramps.map((r) => toOklab(...r.rgb)[0]);
  const down = ramps.map((r, i) => {
    // the next darker colour of the same family; from the bottom of a ramp, the deep shadow
    let best = -1;
    ramps.forEach((q, j) => { if (q.family === r.family && Ls[j] < Ls[i] && (best < 0 || Ls[j] > Ls[best])) best = j; });
    if (best < 0) best = ramps.findIndex((q) => q.family === 'deep');
    if (Ls[best] >= Ls[i]) best = ramps.reduce((m, q, j) => (Ls[j] < Ls[m] ? j : m), 0);
    return best;
  });
  const src = idx.slice();
  let inked = 0;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x, v = src[i];
    let edge = false;
    const look = (j) => { const u = src[j]; if (u !== v && Ls[u] - Ls[v] > EDGE_L && ramps[u].family !== ramps[v].family) edge = true; };
    if (x > 0) look(i - 1);
    if (x < w - 1) look(i + 1);
    if (y > 0) look(i - w);
    if (y < h - 1) look(i + w);
    if (edge) { idx[i] = down[v]; inked += 1; }
  }
  return inked;
}

