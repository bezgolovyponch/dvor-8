// PIECE: FACADE-PHOTO — THE PHOTOGRAPH ITSELF IN THE WORKING PALETTE, WITH ITS DETECTED PANES RECOLOURED.
//
// This is the operator's v13 engine S8–S11 (docs/V13-ANALYSIS.md §7), ported as a piece so it can be confirmed
// alone before the pipeline uses it:
//
//   S8  every facade is a quad; a homography maps the unit square onto it (Heckbert 1989).
//   S9  the facade's own lattice: gradient projection profiles + unbiased autocorrelation (Lee & Nevatia 2004;
//       Müller, Zeng, Wonka & Van Gool 2007) -> the period and the phase.
//   S10 windows are the holes in the frame: blue >= 30% -> GLASS WALL, split by a global Otsu threshold (Otsu 1979);
//       otherwise PUNCHED WINDOWS by Niblack's local rule (L < m - max(6, 0.5*s) over 15x15); 4-connected components
//       (Rosenfeld & Pfaltz 1966); the class owning the largest component is the FRAME; the other class's compact
//       components that never touch the facade outline are PANES (size-consistency 0.4–2.5x the median).
//   S11 the facade IS the photo itself in the working palette — the pane pixels are the only ones recoloured, to one
//       glass ramp spread over the pane's own 5–95% brightness. The frame pixels stay the photograph.
//
// WHY THIS PIECE EXISTS. The bay-grid piece (src/pieces/facade.js) DRAWS a wall: flat planes plus a sprite grid on an
// axis-aligned box. Measured on the operator's Prague street (docs/AUDIT-V13.md F5), that turned old houses into a
// white-panel / blue-stripe pattern and lost the windows; on the tower it produced a three-tone checker (V5: 7 tones,
// top3 99.2%). The reference keeps the photograph and only recolours the panes (V5 reference: 16 tones, top3 58.9%).
// Copying that mechanism is the fix; inventing a better grid is not.
//
// THE PIECE OWNS ONLY ITS MASK. It never writes a pixel outside `mask`, never invents a building, and never paints
// over a pixel in `skip` (the pixels another piece already owns).
//
// WIRED AND GREEN (2026-10-18, measured). Wired after the bay loop with the instance's fitted silhouette as its extent
// (the old glass-across-the-box pass yields to it), it moved the gates:
//   V5 facade   tower tones 7 -> 23, largest 42.1% -> 17.3%, top3 99.2% -> 44.9%   (reference 16 / 26.6% / 58.9%) PASS
//   V6 windows  50 -> 513 window objects, one per pane-bearing facade                                          PASS
//   match tower dark 28.3% -> 35.6% (bar 35) · V7 distance 69.31% -> 59.67% (bar 56.66, still the next fault)
// THE TONE MAPPING IS snapV13, the reference's own two-class rule, and it was the whole difference: our entryFor put a
// blue-grey facade pixel on the violet-neutral DUSK ramp (#62556d, luma 92, a 30% plateau) where the reference's rule
// sends it to the blue ramp's dark tones. On the reference's own building mask the tower read dark 20.6% against the
// reference frame's 34.8%; with snapV13 the piece reads 36.4% on its own input. One majority pass (not v13's two)
// keeps our coarser grey ladder's thin dark mullions: measured 33.4% -> 35.6% dark, V5 unchanged. The sky-band lines in
// concept-check had to stop counting the building that is now in the band (a definition corrected, not a bar widened).

import { RAMPS, STEPS } from '../flat.js';

/**
 * THE REFERENCE'S TWO-CLASS SNAP (v13 S2), against this project's palette.
 *
 * v13 snaps a photograph pixel with one rule: a grey (saturation < 0.26, or very dark) takes the nearest NEUTRAL by
 * luma; a coloured pixel takes the nearest CHROMATIC entry by weighted RGB (2,4,3). Measured on the judged tower,
 * this is why the reference's wall reads dark and ours read light: a blue-grey facade pixel (hue ~220, sat ~0.26)
 * is CHROMATIC there and lands on the blue ramp's dark tones (#323f7a, luma 58), while our entryFor measured the
 * hue against the violet-neutral DUSK ramp (264) and landed on #62556d, luma 92 - a plateau across 30% of the
 * region (our tower's p50 luma 92, the reference's 72; match-check: dark 28.3% vs 37.7%).
 *
 * The neutral set here is the grey ramp (STONE) plus the two other near-neutral ramps as FALLBACKS only when no
 * chromatic entry is closer; the chromatic set is every other entry, outline and void excepted.
 */
export function snapV13(palette, r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const L = 0.299 * r + 0.587 * g + 0.114 * b;
  const sat = mx > 0 ? (mx - mn) / mx : 0;
  const LUM = (i) => 0.299 * palette[i][0] + 0.587 * palette[i][1] + 0.114 * palette[i][2];
  const stoneBase = RAMPS.findIndex((R) => R.name === 'stone') * STEPS;
  const nRamps = Math.floor((palette.length - 2) / STEPS);
  const NEUTRAL = new Set(['stone', 'metal', 'dusk']);
  const neutralBase = new Set(RAMPS.map((R, i) => (NEUTRAL.has(R.name) ? i * STEPS : -1)).filter((i) => i >= 0));
  if (sat < 0.26 || mx < 45) {
    let best = stoneBase, bd = 1e9;
    for (let t = 0; t < STEPS; t += 1) { const d = Math.abs(LUM(stoneBase + t) - L); if (d < bd) { bd = d; best = stoneBase + t; } }
    return best;
  }
  let best = 0, bd = 1e9;
  for (let i = 0; i < palette.length - 2; i += 1) {
    if (neutralBase.has(i - (i % STEPS))) continue;
    const p = palette[i];
    const dr = p[0] - r, dg = p[1] - g, db = p[2] - b;
    const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

/** Fit y = a*x + b (vertical=false) or x = a*y + b (vertical=true), least squares with one 15% trim. */
function fitLine(pts, vertical) {
  if (pts.length < 2) return null;
  const A = pts.map(([x, y]) => (vertical ? [y, x] : [x, y]));
  const fit = (rows) => {
    let n = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
    for (const [x, y] of rows) { n += 1; sx += x; sy += y; sxx += x * x; sxy += x * y; }
    const den = n * sxx - sx * sx;
    if (!n || Math.abs(den) < 1e-9) return null;
    const a = (n * sxy - sx * sy) / den;
    return { a, b: (sy - a * sx) / n };
  };
  let f = fit(A);
  if (!f) return null;
  const res = A.map(([x, y]) => Math.abs(y - (f.a * x + f.b))).sort((p, q) => p - q);
  const cut = res[Math.floor(res.length * 0.85)] || 0;
  const keep = A.filter(([x, y]) => Math.abs(y - (f.a * x + f.b)) <= cut + 0.5);
  if (keep.length >= 3) f = fit(keep) || f;
  return f;
}

/**
 * The four lines of a mask's boundary as a quadrilateral (TL, TR, BR, BL): left/right fitted from each row's extreme
 * x, top/bottom from each column's extreme y. A silhouette cropped by the frame still yields a line, because the
 * mask's edge is the frame's edge there. Returns null when the fit is degenerate (a facade needs area).
 */
export function boundaryQuad(mask, w, h, box = null) {
  const [bx0, by0, bx1, by1] = box || [0, 0, w, h];
  const left = [], right = [], top = [], bottom = [];
  for (let y = Math.max(0, by0); y < Math.min(h, by1); y += 1) {
    let x0 = -1, x1 = -1;
    for (let x = Math.max(0, bx0); x < Math.min(w, bx1); x += 1) if (mask[y * w + x]) { if (x0 < 0) x0 = x; x1 = x; }
    if (x0 >= 0) { left.push([x0 + 0.5, y + 0.5]); right.push([x1 + 0.5, y + 0.5]); }
  }
  for (let x = Math.max(0, bx0); x < Math.min(w, bx1); x += 1) {
    let y0 = -1, y1 = -1;
    for (let y = Math.max(0, by0); y < Math.min(h, by1); y += 1) if (mask[y * w + x]) { if (y0 < 0) y0 = y; y1 = y; }
    if (y0 >= 0) { top.push([x + 0.5, y0 + 0.5]); bottom.push([x + 0.5, y1 + 0.5]); }
  }
  if (left.length < 4 || top.length < 4) return null;
  const Lf = fitLine(left, true), Rf = fitLine(right, true), Tf = fitLine(top, false), Bf = fitLine(bottom, false);
  if (!Lf || !Rf || !Tf || !Bf) return null;
  const ix = (vert, horiz) => {
    const den = 1 - vert.a * horiz.a;
    if (Math.abs(den) < 1e-9) return null;
    const x = (vert.a * horiz.b + vert.b) / den;
    return [x, horiz.a * x + horiz.b];
  };
  const TL = ix(Lf, Tf), TR = ix(Rf, Tf), BR = ix(Rf, Bf), BL = ix(Lf, Bf);
  if (!TL || !TR || !BR || !BL) return null;
  const clamp = (p) => [Math.max(0, Math.min(w - 1, p[0])), Math.max(0, Math.min(h - 1, p[1]))];
  const Q = [TL, TR, BR, BL].map(clamp);
  const area = Math.abs((Q[1][0] - Q[0][0]) * (Q[3][1] - Q[0][1]) - (Q[3][0] - Q[0][0]) * (Q[1][1] - Q[0][1]));
  return area > 120 ? Q : null;
}

/** The 3x3 homography from the unit square to Q (Heckbert 1989), and its inverse. */
export function sq2quad(Q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = Q;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (sx * dy2 - dx2 * sy) / den, h = (dx1 * sy - sx * dy1) / den;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}
export function inv3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

/** Period of a 1-D profile: unbiased autocorrelation, the SMALLEST strong peak (the reference's rule), phase by comb. */
export function period(P) {
  const n = P.length, fb = { p: 6, ph: 0, ac: 0, fb: true };
  if (n < 10) return fb;
  let m = 0; for (const v of P) m += v; m /= n;
  const x = Array.from(P, (v) => v - m);
  let e = 0; for (const v of x) e += v * v;
  if (!e) return fb;
  const maxL = Math.floor(n / 2), ac = [];
  for (let l = 0; l <= maxL + 1; l += 1) { let s = 0; for (let i = 0; i + l < n; i += 1) s += x[i] * x[i + l]; ac[l] = l < n ? s / e * n / (n - l) : 0; }
  const peaks = [];
  for (let l = 3; l <= maxL; l += 1) if (ac[l] > ac[l - 1] && ac[l] >= ac[l + 1]) peaks.push(l);
  if (!peaks.length) return fb;
  const best = Math.max(...peaks.map((l) => ac[l]));
  if (best < 0.15) return Object.assign({}, fb, { ac: best });
  const raw = peaks.find((l) => ac[l] >= 0.8 * best);
  let p = raw; while (p < 4) p *= 2;
  let ph = 0, bs = -1;
  for (let f = 0; f < p; f += 1) { let s = 0; for (let i = f; i < n; i += p) s += P[i]; if (s > bs) { bs = s; ph = f; } }
  return { p, ph, ac: ac[raw], raw, fb: false };
}

/**
 * Paint the facade from the photograph.
 *
 * @param {object} o
 * @param {Uint8Array} o.idx      the frame (palette indices), written in place
 * @param {number} o.w @param {number} o.h
 * @param {Uint8Array} o.mask     1 on this facade's own pixels (the instance mask)
 * @param {number[][]} [o.quad]   [TL,TR,BR,BL]; fitted from the mask when absent
 * @param {number[]} [o.box]      the instance's box, for the fit
 * @param {Float32Array} o.rgb    the photo at game resolution (3 per pixel)
 * @param {(r,g,b)=>number} o.quant  nearest working-palette entry for a photo colour
 * @param {number[]} o.glass      palette entries of the glass ramp, dark -> light (at least 4)
 * @param {number} o.outline      the outline entry
 * @param {Uint8Array} [o.sky]    the sky mask (a facade may not paint it)
 * @param {number} [o.groundY]    the ground line (a facade may not paint below it)
 * @param {Set<number>} [o.skip]  pixels another piece owns
 * @returns {{panes:{px:number[],x:number,y:number,w:number,h:number}[], cols:number, rows:number, frame:number, kind:string, quad:number[][]}|null}
 */
export function paintFacadePhoto({ idx, w, h, mask, quad = null, box = null, rgb, quant, glass, outline, sky = null, groundY = h, skip = null, fillQuad = false, cleanPasses = 2 }) {
  const Q = quad || boundaryQuad(mask, w, h, box);
  if (!Q) return null;
  const H = sq2quad(Q), Hi = inv3(H);
  if (!Hi) return null;
  const apply = (m, x, y) => { const ww = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / ww, (m[3] * x + m[4] * y + m[5]) / ww]; };

  // THE FACADE'S EXTENT. The instance mask is the parse's building class, and measured on the judged tower it covers
  // only ~70% of the building (the parse drops the glass and the light bands), so painting only the mask leaves the
  // rest to the old sprite passes and the face keeps its pattern. `fillQuad` takes the fitted silhouette's interior
  // instead - the quad IS the building's own outline - and the sky and the ground are still excluded pixel by pixel.
  // v13's contract is exactly this: the annotation quad is the facade's extent.
  const MP = [];
  for (let k = 0; k < w * h; k += 1) {
    const y = (k / w) | 0;
    if (y >= groundY) continue;
    if (sky && sky[k]) continue;
    if (fillQuad) {
      const x = k % w;
      let inside = false;
      for (let i = 0, j = Q.length - 1; i < Q.length; j = i++) { const [xi, yi] = Q[i], [xj, yj] = Q[j]; if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside; }
      if (!inside) continue;
    } else if (!mask[k]) continue;
    MP.push(k);
  }
  if (MP.length < 120) return null;
  const inM = new Uint8Array(w * h);
  for (const k of MP) inM[k] = 1;

  // S8/S9: rectified sampling + projection profiles, read ONLY inside the mask (a rectangle around the building
  // feeds sky and pavement into the profile — measured in the operator's own fork as a 45-px "period")
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const RU = Math.max(8, Math.round((dist(Q[0], Q[1]) + dist(Q[3], Q[2])) / 2));
  const RV = Math.max(8, Math.round((dist(Q[0], Q[3]) + dist(Q[1], Q[2])) / 2));
  const RL = new Float32Array(RU * RV), RH = new Uint8Array(RU * RV);
  for (let j = 0; j < RV; j += 1) for (let i = 0; i < RU; i += 1) {
    const p = apply(H, (i + 0.5) / RU, (j + 0.5) / RV);
    const x = Math.floor(p[0]), y = Math.floor(p[1]);
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const k = y * w + x;
    if (!inM[k]) continue;
    const o = j * RU + i;
    RL[o] = 0.299 * rgb[k * 3] + 0.587 * rgb[k * 3 + 1] + 0.114 * rgb[k * 3 + 2];
    RH[o] = 1;
  }
  const Pu = new Float32Array(Math.max(1, RU - 1)), Pv = new Float32Array(Math.max(1, RV - 1)), PuN = new Float32Array(Pu.length), PvN = new Float32Array(Pv.length);
  for (let j = 0; j < RV; j += 1) for (let i = 0; i < RU - 1; i += 1) { const o = j * RU + i; if (RH[o] && RH[o + 1]) { Pu[i] += Math.abs(RL[o + 1] - RL[o]); PuN[i] += 1; } }
  for (let j = 0; j < RV - 1; j += 1) for (let i = 0; i < RU; i += 1) { const o = j * RU + i; if (RH[o] && RH[o + RU]) { Pv[j] += Math.abs(RL[o + RU] - RL[o]); PvN[j] += 1; } }
  for (let i = 0; i < Pu.length; i += 1) Pu[i] /= Math.max(1, PuN[i]);
  for (let j = 0; j < Pv.length; j += 1) Pv[j] /= Math.max(1, PvN[j]);
  const gu = period(Pu), gv = period(Pv);

  // S10: glass or punched. Blue dominance is the stronger fact and decides first.
  let blue = 0;
  for (const k of MP) if (rgb[k * 3 + 2] - rgb[k * 3] > 10) blue += 1;
  const glassDom = blue / MP.length >= 0.3;

  const Lk = new Float32Array(w * h);
  for (const k of MP) Lk[k] = 0.299 * rgb[k * 3] + 0.587 * rgb[k * 3 + 1] + 0.114 * rgb[k * 3 + 2];

  // local mean / sd over 15x15 inside the mask (Niblack)
  const D = new Float32Array(w * h), SD = new Float32Array(w * h);
  if (!glassDom) {
    for (const k of MP) {
      const x = k % w, y = (k / w) | 0;
      let s = 0, s2 = 0, c = 0;
      for (let j = -7; j <= 7; j += 1) {
        const yy = y + j; if (yy < 0 || yy >= h) continue;
        for (let i = -7; i <= 7; i += 1) { const xx = x + i; if (xx < 0 || xx >= w) continue; const kk = yy * w + xx; if (inM[kk]) { s += Lk[kk]; s2 += Lk[kk] * Lk[kk]; c += 1; } }
      }
      const m = s / Math.max(1, c);
      D[k] = Lk[k] - m;
      SD[k] = Math.sqrt(Math.max(0, s2 / Math.max(1, c) - m * m));
    }
  }

  // Otsu over the facade's luma (glass walls)
  let T = 128;
  if (glassDom) {
    const hist = new Float64Array(256);
    for (const k of MP) hist[Math.min(255, Math.max(0, Lk[k] | 0))] += 1;
    const n = MP.length;
    let total = 0; for (let i = 0; i < 256; i += 1) total += i * hist[i];
    let wB = 0, sB = 0, best = -1;
    for (let i = 0; i < 256; i += 1) {
      wB += hist[i]; if (!wB) continue;
      const wF = n - wB; if (!wF) break;
      sB += i * hist[i];
      const mB = sB / wB, mF = (total - sB) / wF, v = wB * wF * (mB - mF) * (mB - mF);
      if (v > best) { best = v; T = i; }
    }
  }
  // THE CLASS IS THE NEARER MEAN, NOT JUST "ABOVE THE CUT". Otsu returns a cut point; a pixel whose luma equals the
  // cut is not evidence for either class, and `Lk > T` sends it silently to the bright side (measured on a synthetic
  // wall whose dark class is 21.86 and whose cut is 21: every dark pixel became "bright"). The two class means are
  // read from the data, and each pixel goes to the nearer one. No constant is added.
  let mD = 0, mB = 0;
  if (glassDom) {
    let sL = 0, nL = 0, sH = 0, nH = 0;
    for (const k of MP) { if (Lk[k] <= T) { sL += Lk[k]; nL += 1; } else { sH += Lk[k]; nH += 1; } }
    mD = nL ? sL / nL : 0; mB = nH ? sH / nH : 255;
  }
  const cls = new Int8Array(w * h).fill(-1);
  for (const k of MP) cls[k] = glassDom ? (Math.abs(Lk[k] - mD) <= Math.abs(Lk[k] - mB) ? 0 : 1) : (D[k] < -Math.max(6, 0.5 * SD[k]) ? 0 : 1);

  // 4-connected components per class, inside the mask
  const lab = new Int32Array(w * h).fill(-1), comps = [], stk = [];
  for (const k0 of MP) {
    if (lab[k0] >= 0) continue;
    const c0 = cls[k0], c = { cls: c0, px: [], x0: 1e9, y0: 1e9, x1: -1, y1: -1, edge: false, l: 0 };
    stk.length = 0; stk.push(k0); lab[k0] = comps.length;
    while (stk.length) {
      const k = stk.pop(), x = k % w, y = (k / w) | 0;
      c.px.push(k); c.l += Lk[k];
      if (x < c.x0) c.x0 = x; if (x > c.x1) c.x1 = x; if (y < c.y0) c.y0 = y; if (y > c.y1) c.y1 = y;
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) { c.edge = true; continue; }
        const n = ny * w + nx;
        if (!inM[n]) { c.edge = true; continue; }
        if (cls[n] === c0 && lab[n] < 0) { lab[n] = comps.length; stk.push(n); }
      }
    }
    c.l /= c.px.length;
    comps.push(c);
  }
  if (!comps.length) return null;
  // the frame is the class owning the largest component (for a glass wall: the largest component of any class)
  const big = glassDom ? comps.reduce((a, c) => (c.px.length > a.px.length ? c : a), comps[0]) : comps.filter((c) => c.cls === 1).reduce((a, c) => (c.px.length > (a ? a.px.length : -1) ? c : a), null);
  if (!big) return null;
  const fcls = big.cls;

  const cw = (c) => c.x1 - c.x0 + 1, chh = (c) => c.y1 - c.y0 + 1;
  const med = (a) => (a.length ? a.slice().sort((x, y) => x - y)[a.length >> 1] : 1);
  if (typeof process !== 'undefined' && process.env && process.env.PIECE_DEBUG) console.log('[piece] glassDom', glassDom, 'T', T, 'comps', comps.length, 'big cls', big.cls, big.px.length, 'classes', comps.map((c) => c.cls + ':' + c.px.length).slice(0, 12).join(' '), 'gu', gu.p, gu.fb, 'gv', gv.p, gv.fb);
  let wins = comps.filter((c) => {
    const a = c.px.length, fill = a / Math.max(1, cw(c) * chh(c)), r = chh(c) / cw(c);
    if (c.cls === fcls || a < 3) return false;
    return glassDom || (!c.edge && a <= Math.max(24, MP.length * 0.03) && fill >= 0.4 && r >= 0.4 && r <= 5);
  });
  if (typeof process !== 'undefined' && process.env && process.env.PIECE_DEBUG) console.log('[piece] wins', wins.length, wins.map((c) => c.px.length).slice(0, 8).join(','));
  if (glassDom) {
    // cut the glass area into panes on the facade's own lattice (the reference's S11 rule)
    const pw = Math.max(4, gu.p), ph = Math.max(4, gv.p);
    const out = [];
    for (const c of wins) {
      const cells = new Map();
      for (const k of c.px) {
        const uv = apply(Hi, k % w + 0.5, ((k / w) | 0) + 0.5);
        if (uv[0] < 0 || uv[0] > 1 || uv[1] < 0 || uv[1] > 1) continue;
        const key = Math.floor(uv[0] * RU / pw) * 1000 + Math.floor(uv[1] * RV / ph);
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(k);
      }
      for (const px of cells.values()) {
        if (px.length < 2) continue;
        const b = { px, x0: 1e9, y0: 1e9, x1: -1, y1: -1, l: 0 };
        for (const k of px) { const x = k % w, y = (k / w) | 0; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; b.l += Lk[k]; }
        b.l /= px.length;
        out.push(b);
      }
    }
    wins = out;
  } else if (wins.length >= 6) {
    const mh = med(wins.map(chh)), mw = med(wins.map(cw));
    wins = wins.filter((c) => chh(c) >= mh * 0.4 && chh(c) <= mh * 2.5 && cw(c) >= mw * 0.4 && cw(c) <= mw * 2.5);
  }

  // S11: the photograph is what is painted. Panes take one glass ramp, spread over the panes' own 5–95% range.
  const paneOf = new Int16Array(w * h).fill(-1);
  wins.forEach((c, i) => { for (const k of c.px) paneOf[k] = i; });
  const pl = wins.map((c) => c.l).sort((a, b) => a - b);
  const lo = pl.length ? pl[Math.floor(pl.length * 0.05)] : 0, hi = pl.length ? pl[Math.floor(pl.length * 0.95)] : 255;
  const ramp = glass.slice(0, 4);
  if (ramp.length < 2) return null;
  // S3 AFTER THE SNAP: THE WALL'S TONES ARE CLEANED BEFORE THEY ARE PAINTED. v13's S2/S3 snap the photo into the
  // working palette and then run 3x3 majority (mode) passes; without them the wall keeps the photograph's per-pixel
  // noise (measured on the tower: a dense blue/neutral speckle, V5 top3 78.8%). Two passes inside the mask, so the
  // facade reads as a wall whose tone changes in patches, not in pixels.
  const qWall = new Int32Array(w * h).fill(-1);
  for (const k of MP) qWall[k] = quant(rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]);
  for (let pass = 0; pass < cleanPasses; pass += 1) {
    const out = qWall.slice();
    for (const k of MP) {
      const x = k % w, y = (k / w) | 0;
      const cnt = new Map();
      for (let j = -1; j <= 1; j += 1) for (let i = -1; i <= 1; i += 1) {
        const xx = x + i, yy = y + j;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const kk = yy * w + xx;
        if (qWall[kk] < 0) continue;
        cnt.set(qWall[kk], (cnt.get(qWall[kk]) || 0) + 1);
      }
      let best = -1, bc = 0;
      for (const [v, c] of cnt) if (c > bc || (c === bc && v < best)) { bc = c; best = v; }
      if (bc >= 5) out[k] = best;
    }
    qWall.set(out);
  }
  let framePx = 0;
  const panes = [];
  const written = [];
  for (let wi = 0; wi < wins.length; wi += 1) {
    const c = wins[wi], t = Math.max(0, Math.min(0.999, (c.l - lo) / Math.max(1, hi - lo)));
    const col = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
    for (const k of c.px) if (!skip || !skip.has(k)) { idx[k] = col; written.push(k); }
    panes.push({ px: c.px, x: c.x0, y: c.y0, w: cw(c), h: chh(c) });
  }
  for (const k of MP) {
    if (paneOf[k] >= 0) continue;
    if (skip && skip.has(k)) continue;
    const x = k % w, y = (k / w) | 0;
    idx[k] = qWall[k] >= 0 ? qWall[k] : quant(rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]);
    written.push(k);
    framePx += 1;
    // a pixel next to the sky takes the 1-px outline (the reference's S11 rule)
    if ((x > 0 && sky && sky[k - 1] && !inM[k - 1]) || (x < w - 1 && sky && sky[k + 1] && !inM[k + 1]) || (y > 0 && sky && sky[k - w] && !inM[k - w])) idx[k] = outline;
  }
  return { panes, written, cols: Math.max(1, Math.round(RU / Math.max(4, gu.p))), rows: Math.max(1, Math.round(RV / Math.max(4, gv.p))), frame: framePx, kind: glassDom ? 'glass' : 'punched', quad: Q, period: [gu.p, gv.p], glassDom, T, frameComp: big.px.length };
}
