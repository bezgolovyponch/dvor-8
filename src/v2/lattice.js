export const FACADE_LABEL = { unknown: 0, background: 1, facade: 2, window: 3, door: 4, cornice: 5, sill: 6, balcony: 7, blind: 8, molding: 9, deco: 10, pillar: 11, shop: 12 };
export const PANE_SHARE = [0.25, 0.4];
export const TOWER_PANE_SHARE = 0.32;
export const OPENING = 0.6;
const L = FACADE_LABEL;
const PEAKS_PER_PROFILE = 4;
const MIN_BAY = 6;
const MIN_FLOOR = 12;
const TEMPLATE_MIN = 0.05;
const TEMPLATE_CUT = 0.5;
const CELL_BACKGROUND = 0.5;
const SHOP_ROW = 0.3;
const SHOP_FROM = 0.6;
const EDGE_KEEP = 0.5;
const NEAR_BEST = 0.9;
export const STOREY_M = [2.75, 3.5];
export const BAY_M = [1.25, 3.75];
const BAY_PER_FLOOR = [BAY_M[0] / STOREY_M[1], BAY_M[1] / STOREY_M[0]];

export function autocorrPeaks(profile, lo, hi, k = PEAKS_PER_PROFILE) {
  const n = profile.length;
  const mean = profile.reduce((s, v) => s + v, 0) / Math.max(1, n);
  const p = profile.map((v) => v - mean);
  if (n < 3 * lo || !p.some((v) => v !== 0)) return [];
  const ac = new Float64Array(n);
  for (let l = 0; l < n; l += 1) {
    let s = 0;
    for (let i = 0; i + l < n; i += 1) s += p[i] * p[i + l];
    ac[l] = s / (n - l);
  }
  const a0 = ac[0];
  const out = [];
  for (let l = Math.max(2, lo); l < Math.min(hi, n >> 1); l += 1) if (ac[l] > ac[l - 1] && ac[l] >= ac[l + 1] && ac[l] > 0) out.push(l);
  return out.sort((x, y) => ac[y] / a0 - ac[x] / a0).slice(0, k);
}

const isPane = (v) => v === L.window || v === L.blind;

export function shopStart(lbl, w, h) {
  for (let y = Math.floor(h * SHOP_FROM); y < h; y += 1) {
    let n = 0;
    for (let x = 0; x < w; x += 1) { const v = lbl[y * w + x]; if (v === L.shop || v === L.door) n += 1; }
    if (n / w >= SHOP_ROW) return y;
  }
  return h;
}

export function tileGrid(lbl, w, h, px, py, stop = shopStart(lbl, w, h)) {
  const T = new Float64Array(px * py), C = new Float64Array(px * py);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = (y % py) * px + (x % px);
    T[i] += isPane(lbl[y * w + x]) ? 1 : 0; C[i] += 1;
  }
  let max = 0;
  for (let i = 0; i < T.length; i += 1) { T[i] /= Math.max(1, C[i]); max = Math.max(max, T[i]); }
  if (max < TEMPLATE_MIN) return null;
  const colSum = new Float64Array(px), rowSum = new Float64Array(py);
  for (let y = 0; y < py; y += 1) for (let x = 0; x < px; x += 1) { colSum[x] += T[y * px + x]; rowSum[y] += T[y * px + x]; }
  const sx = colSum.indexOf(Math.max(...colSum)), sy = rowSum.indexOf(Math.max(...rowSum));
  const R = new Float64Array(px * py);
  for (let y = 0; y < py; y += 1) for (let x = 0; x < px; x += 1) R[(((y + (py >> 1) - sy) % py + py) % py) * px + (((x + (px >> 1) - sx) % px + px) % px)] = T[y * px + x];
  const ox = (((sx - (px >> 1)) % px) + px) % px, oy = (((sy - (py >> 1)) % py) + py) % py;
  const on = (x, y) => R[y * px + x] >= max * TEMPLATE_CUT;
  let seed = (py >> 1) * px + (px >> 1);
  if (!on(px >> 1, py >> 1)) seed = R.indexOf(Math.max(...R));
  const seen = new Uint8Array(px * py), stack = [seed];
  seen[seed] = 1;
  let x0 = px, x1 = -1, y0 = py, y1 = -1;
  while (stack.length) {
    const i = stack.pop(), x = i % px, y = (i / px) | 0;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x + 1); y0 = Math.min(y0, y); y1 = Math.max(y1, y + 1);
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= px || ny >= py || seen[ny * px + nx] || !on(nx, ny)) continue;
      seen[ny * px + nx] = 1; stack.push(ny * px + nx);
    }
  }
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const ww = Math.min(x1 - x0, OPENING * px), wh = Math.min(y1 - y0, OPENING * py);
  const area = (ww * wh) / (px * py);
  const want = area < PANE_SHARE[0] ? TOWER_PANE_SHARE : Math.min(area, PANE_SHARE[1]);
  const k = Math.sqrt(want / Math.max(area, 1e-6));
  const hw = Math.min(OPENING * px, ww * k) / 2, hh = Math.min(OPENING * py, wh * k) / 2;
  const rx0 = Math.round(mx - hw), rx1 = Math.round(mx + hw), ry0 = Math.round(my - hh), ry1 = Math.round(my + hh);
  if (rx1 - rx0 < 1 || ry1 - ry0 < 1) return null;
  const out = [];
  for (let cy = oy - py; cy < h; cy += py) for (let cx = ox - px; cx < w; cx += px) {
    const full = (rx1 - rx0) * (ry1 - ry0);
    const a0 = Math.max(0, cx + rx0), a1 = Math.min(w, cx + rx1), b0 = Math.max(0, cy + ry0), b1 = Math.min(h, cy + ry1, stop);
    if (a1 <= a0 || b1 <= b0 || (a1 - a0) * (b1 - b0) < EDGE_KEEP * full) continue;
    let bg = 0;
    for (let y = b0; y < b1; y += 1) for (let x = a0; x < a1; x += 1) if (lbl[y * w + x] === L.background) bg += 1;
    if (bg / ((a1 - a0) * (b1 - b0)) > CELL_BACKGROUND) continue;
    out.push([a0, b0, a1, b1]);
  }
  return out;
}

export function gridScore(rects, lbl, gray, w, h) {
  const D = new Uint8Array(w * h);
  for (const [a0, b0, a1, b1] of rects) for (let y = b0; y < b1; y += 1) D.fill(1, y * w + a0, y * w + a1);
  let inter = 0, uni = 0, n = 0, sg = 0, sd = 0, sgg = 0, sdd = 0, sgd = 0;
  for (let i = 0; i < w * h; i += 1) {
    if (lbl[i] === L.background) continue;
    const m = isPane(lbl[i]) ? 1 : 0, d = D[i], g = gray[i];
    if (d && m) inter += 1;
    if (d || m) uni += 1;
    n += 1; sg += g; sd += d; sgg += g * g; sdd += d * d; sgd += g * d;
  }
  const cov = sgd / n - (sg / n) * (sd / n), vg = sgg / n - (sg / n) ** 2, vd = sdd / n - (sd / n) ** 2;
  const corr = vg > 0 && vd > 0 ? Math.abs(cov / Math.sqrt(vg * vd)) : 0;
  return (inter / Math.max(1, uni) + corr) / 2;
}

export function chooseLattice(lbl, gray, w, h, minBay = MIN_BAY, minFloor = MIN_FLOOR) {
  const pane = Float64Array.from(lbl, (v) => (isPane(v) ? 1 : 0));
  const colG = new Float64Array(w - 1), rowG = new Float64Array(h - 1), colM = new Float64Array(w), rowM = new Float64Array(h);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const i = y * w + x;
    if (x < w - 1) colG[x] += Math.abs(gray[i + 1] - gray[i]);
    if (y < h - 1) rowG[y] += Math.abs(gray[i + w] - gray[i]);
    colM[x] += pane[i]; rowM[y] += pane[i];
  }
  const bays = new Set([...autocorrPeaks(Array.from(colG), minBay, w >> 1), ...autocorrPeaks(Array.from(colM), minBay, w >> 1)]);
  const floors = new Set([...autocorrPeaks(Array.from(rowG), minFloor, h >> 1), ...autocorrPeaks(Array.from(rowM), minFloor, h >> 1)]);
  const stop = shopStart(lbl, w, h);
  const fits = [];
  for (const px of bays) for (const py of floors) {
    if (px / py < BAY_PER_FLOOR[0] || px / py > BAY_PER_FLOOR[1]) continue;
    const rects = tileGrid(lbl, w, h, px, py, stop);
    if (!rects || !rects.length) continue;
    fits.push({ rects, bay: px, floor: py, score: gridScore(rects, lbl, gray, w, h), share: paneShare(rects, lbl, w, h) });
  }
  if (!fits.length) return null;
  const top = Math.max(...fits.map((f) => f.score));
  const off = (f) => Math.max(0, PANE_SHARE[0] - f.share, f.share - PANE_SHARE[1]);
  return fits.filter((f) => f.score >= NEAR_BEST * top).sort((a, b) => off(a) - off(b) || b.score - a.score)[0];
}

export function paneShare(rects, lbl, w, h) {
  let valid = 0, pane = 0;
  const D = new Uint8Array(w * h);
  for (const [a0, b0, a1, b1] of rects) for (let y = b0; y < b1; y += 1) D.fill(1, y * w + a0, y * w + a1);
  for (let i = 0; i < w * h; i += 1) { if (lbl[i] === L.background) continue; valid += 1; pane += D[i]; }
  return pane / Math.max(1, valid);
}

export function paneEvidence(lbl) {
  let pane = 0, valid = 0;
  for (const v of lbl) { if (v === L.background) continue; valid += 1; if (isPane(v)) pane += 1; }
  return pane / Math.max(1, valid);
}
