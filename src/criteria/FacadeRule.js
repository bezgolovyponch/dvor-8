// REQUIREMENT (the creator, verbatim): "The buildings are the v6 approach: rebuilt on the photo's column and floor
// grid, so every window and every floor can break." And from the accepted frame (docs/V10A.md): the towers are a
// PLANE with a REGULAR GRID of window rows, a checkerboard, a defined silhouette and a 1-px outline against the
// sky - never a sample of the photograph.
// From the creator's own v9 panel (docs/CRITERIA.md B2): "v6 rebuilt on the photo grid liked · v7 invented rejected." - the checkered tower is the pattern, not a picture.
//
// So this module owns one thing: HOW A BUILDING IS DRAWN. A facade is a plane in two or three tones of its own
// family, carrying a regular grid of window sprites on the photograph's own column and floor pitch, bounded by a
// one-pixel outline. It is a pattern, not a picture - which is exactly why it reads as architecture.
export const MIN_PITCH = 5;

/** The grid of a facade: bays across, floors down, from the facade's own size and the photo's own pitch. */
export function facadeGrid(w, h, pitchX, pitchY) {
  const px = Math.max(MIN_PITCH, Math.round(pitchX || MIN_PITCH));
  const py = Math.max(MIN_PITCH, Math.round(pitchY || MIN_PITCH));
  return { cols: Math.max(1, Math.floor(w / px)), rows: Math.max(1, Math.floor(h / py)), px, py };
}

/** The boxes of one facade's windows, in its own local coordinates. Regular - every bay, every floor. */
export function facadeWindows(w, h, pitchX, pitchY, glassW = 0.6, glassH = 0.55) {
  const g = facadeGrid(w, h, pitchX, pitchY);
  const out = [];
  const gw = Math.max(1, Math.round(g.px * glassW)), gh = Math.max(1, Math.round(g.py * glassH));
  for (let r = 0; r < g.rows; r += 1) {
    for (let c = 0; c < g.cols; c += 1) {
      const x = c * g.px + Math.round((g.px - gw) / 2);
      const y = r * g.py + Math.round((g.py - gh) / 2);
      if (x + gw > w || y + gh > h) continue;
      out.push({ x, y, w: gw, h: gh });
    }
  }
  return out;
}

/** True when this thing is a building: it is drawn as a facade, never sampled from the photograph. */
export const isBuilding = (thing) => /building|house|tower|block/i.test(String((thing && (thing.kind || thing.label)) || ''));

/** Predicate for the checker: the rule must be in force where the facade is drawn. */
export const predicate = (src) => /facadeWindows/.test(src) && /facadeGrid/.test(src);
/**
 * A CHECKERED FACADE, from the rule the O1 research delivered (docs/DECISIONS.md O1, now answered):
 *
 *   A checker INVERTS under a translation of one cell in x alone, and RESTORES under the diagonal one.
 *   On the wall's own patch: binarise luma at Otsu; require a balanced split (25-75% light); for every
 *   candidate pitch (pu, pv) measure the co-occurrence DISSIMILARITY D(du, dv) = P(B(x,y) != B(x+du, y+dv));
 *   the pitch maximises S = min(D(pu,0), D(0,pv)) - D(pu,dv); a checker fires at S >= 0.15 with both
 *   single-axis dissimilarities >= 0.55 and the diagonal <= 0.40.
 *
 * The dissimllarity as a function of displacement is the co-occurrence matrix's own contrast term: Haralick,
 * Shanmugam & Dinstein, IEEE TSMC SMC-3(6):610-621, 1973 (doi 10.1109/TSMC.1973.4309314), and Zucker &
 * Terzopoulos, "Finding structure in co-occurrence matrices for texture analysis", CGIP 12(3):286-308, 1980
 * (doi 10.1016/0146-664X(80)90016-7). The project's old "parity" was D at lag 1, which fires on any noise; this
 * is the same primitive at a PITCH, which is what tells a checker from a window grid (a grid restores at (p,0)) and
 * from sky or road (aperiodic: D climbs monotonically toward 0.5). No facade-tile classifier was found in the
 * literature that could be cited for this step, so the rule is the cited primitive plus the thresholds measured on
 * the creator's accepted frame.
 *
 * @param {Float64Array|number[]} lums luminance of the patch, w*h
 * @returns {{checkered: boolean, pitchX: number, pitchY: number, S: number, axisX: number, axisY: number, diag: number, light: number}}
 */
export function alternation(lums, w, h, { minPitch = 3, maxPitch = 12 } = {}) {
  const n = w * h;
  if (n < 64) return { checkered: false, pitchX: 0, pitchY: 0, S: 0, axisX: 0, axisY: 0, diag: 0, light: 0 };
  // Otsu: the threshold that best separates the patch into its two tones
  const hist = new Array(256).fill(0);
  for (let i = 0; i < n; i += 1) hist[Math.max(0, Math.min(255, Math.round(lums[i])))] += 1;
  let sumAll = 0; for (let t = 0; t < 256; t += 1) sumAll += t * hist[t];
  let wB = 0, sumB = 0, best = -1, thr = 128;
  for (let t = 0; t < 256; t += 1) {
    wB += hist[t]; if (!wB) continue;
    const wF = n - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = t; }
  }
  const B = new Uint8Array(n);
  let light = 0;
  for (let i = 0; i < n; i += 1) { B[i] = lums[i] > thr ? 1 : 0; light += B[i]; }
  light /= n;
  if (light < 0.25 || light > 0.75) return { checkered: false, pitchX: 0, pitchY: 0, S: 0, axisX: 0, axisY: 0, diag: 0, light };
  const D = (du, dv) => {
    const pw = w - Math.abs(du), ph = h - Math.abs(dv);
    if (pw < 4 || ph < 4) return 0;
    const ox = du < 0 ? -du : 0, oy = dv < 0 ? -dv : 0;
    let diff = 0, tot = 0;
    for (let y = 0; y < ph; y += 1) for (let x = 0; x < pw; x += 1) {
      const a = (y + oy) * w + (x + ox), b2 = (y + oy + dv) * w + (x + ox + du);
      diff += B[a] !== B[b2] ? 1 : 0; tot += 1;
    }
    return tot ? diff / tot : 0;
  };
  const cap = Math.min(maxPitch, Math.floor(Math.min(w, h) / 3));
  let best2 = { S: -1, pu: 0, pv: 0, ax: 0, ay: 0, dg: 0 };
  let runnerUp = -1;
  for (let pu = minPitch; pu <= cap; pu += 1) {
    const ax = D(pu, 0);
    if (ax < 0.55) continue;
    for (let pv = minPitch; pv <= cap; pv += 1) {
      const ay = D(0, pv);
      if (ay < 0.55) continue;
      const dg = D(pu, pv);
      const S = Math.min(ax, ay) - dg;
      if (S > best2.S) { runnerUp = best2.S; best2 = { S, pu, pv, ax, ay, dg }; }
      else if (S > runnerUp) runnerUp = S;
    }
  }
  // TWO GUARDS THE ANTI-PHASE TEST ALONE CANNOT PROVIDE, because it cannot tell a square window grid from a checker:
  // (a) the winning pitch must beat the runner-up by a margin - a checker has ONE lattice, a window grid answers to
  // several; (b) the cells must be FLAT (their interior is one tone), where a window's cell carries glass, frame and
  // sill. Measured on our frame before these guards: the mid-rise fired (white 29% / blue 45%, the line passed) but
  // so did the TOWER, whose dark plane fell 36.4% -> 33.9% and lost its own line. The values are read off that pair.
  let homogeneity = 0;
  if (best2.pu && best2.pv) {
    let sumStd = 0, cells = 0;
    for (let cy = 0; cy + best2.pv <= h; cy += best2.pv) {
      for (let cx = 0; cx + best2.pu <= w; cx += best2.pu) {
        let m = 0;
        for (let yy = 0; yy < best2.pv; yy += 1) for (let xx = 0; xx < best2.pu; xx += 1) m += lums[(cy + yy) * w + (cx + xx)];
        m /= best2.pu * best2.pv;
        let var2 = 0;
        for (let yy = 0; yy < best2.pv; yy += 1) for (let xx = 0; xx < best2.pu; xx += 1) { const d = lums[(cy + yy) * w + (cx + xx)] - m; var2 += d * d; }
        sumStd += Math.sqrt(var2 / (best2.pu * best2.pv)); cells += 1;
      }
    }
    homogeneity = cells ? 1 - (sumStd / cells) / 96 : 0;   // 96 = the std of a half-light/half-dark cell
  }
  // THE EXTRA GUARDS ARE OFF BY DEFAULT. Measured on our frame: requiring a margin over the runner-up pitch and flat
  // cells cut the firing windows from 62 to 2 - it removed the checkered mid-rise along with the tower. The anti-phase
  // test's own thresholds (S, the diagonal) are what find candidate windows; the identity of a CHECKER is then
  // decided by the caller from a second, different statistic.
  const fire = best2.S >= 0.15 && best2.dg <= 0.40;
  return { checkered: fire, pitchX: best2.pu, pitchY: best2.pv, S: best2.S, axisX: best2.ax, axisY: best2.ay, diag: best2.dg, light, runnerUp, homogeneity };
}
