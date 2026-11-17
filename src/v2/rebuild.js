import { FACADE_LABEL, PANE_SHARE, chooseLattice, paneEvidence } from './lattice.js';
import { pelt } from './pelt.js';
import { msrcr, stretchHsv } from './retinex.js';

const L = FACADE_LABEL;
const RAMP = 6;
const GLASS_RAMP = [0, 6];
const GLASS_SHADES = [1, 2];
const OUTLINE = 48;
const WORKING = 48;
const COLOUR_SIZE = [360, 640];
const MODEL_HEIGHT = 512;
const MODEL_MAX_WIDTH = 2048;
const EXTENT_CLIP = [0.01, 0.99];
const EXTENT_LIMIT = { u: [-0.5, 1.5], v: [-1.5, 2.5] };
const HOUSE_MIN_WIDTH = 20;
const HOUSE_PENALTY = 3;
const BAND_ROW = 0.3;
const SHOP_FROM = 0.6;
const MIN_REGION = 20;
export const V13_TILE = { bay: 5, floor: 4 };
export const V13_REVEAL = 0.4;

const median = (a) => { const s = Float64Array.from(a).sort(); return s.length ? s[s.length >> 1] : 0; };
const quantile = (a, q) => { const s = Float64Array.from(a).sort(); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))]; };
const shade = (i, d) => { const r = Math.floor(i / RAMP) * RAMP; return Math.min(r + RAMP - 1, Math.max(r, i + d)); };

export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i], [X, Y] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y]); b.push(X);
    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y]); b.push(Y);
  }
  for (let c = 0; c < 8; c += 1) {
    let p = c;
    for (let r = c + 1; r < 8; r += 1) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r += 1) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k += 1) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return (x, y) => { const d = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d]; };
}

const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]];

export function correctedColour(crop, isBuilding, W, H) {
  const [cw, ch] = COLOUR_SIZE, c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  c.getContext('2d').drawImage(crop, 0, 0, cw, ch);
  const d = c.getContext('2d').getImageData(0, 0, cw, ch).data, rgb = new Float32Array(cw * ch * 3), mask = new Uint8Array(cw * ch);
  for (let k = 0; k < cw * ch; k += 1) {
    rgb[k * 3] = d[k * 4]; rgb[k * 3 + 1] = d[k * 4 + 1]; rgb[k * 3 + 2] = d[k * 4 + 2];
    const x = Math.floor(((k % cw) / cw) * W), y = Math.floor((((k / cw) | 0) / ch) * H);
    mask[k] = isBuilding(y * W + x) ? 1 : 0;
  }
  const out = stretchHsv(msrcr(rgb, cw, ch), mask);
  return { w: cw, h: ch, rgb: out, at: (fx, fy) => { const x = Math.min(cw - 1, Math.max(0, Math.floor(fx))), y = Math.min(ch - 1, Math.max(0, Math.floor(fy))), k = (y * cw + x) * 3; return [out[k], out[k + 1], out[k + 2]]; } };
}

const upperOf = (clip) => clip.slice(0, -2);

export function splitHouses(building, colour, isBuilding, lab, W, H, paletteOf = null) {
  const [[xa], [xb]] = building.quad;
  if (xb - xa < 2 * HOUSE_MIN_WIDTH) return [building];
  const inside = building.clip || building.quad, prof = [], xs = [], medians = [];
  const sx = colour.w / W, sy = colour.h / H;
  for (let x = xa; x < xb; x += 1) {
    const px = [];
    for (let y = 0; y < H; y += 1) if (isBuilding(y * W + x) && inPoly(inside, x + 0.5, y + 0.5)) px.push(colour.at((x + 0.5) * sx, (y + 0.5) * sy));
    if (px.length < 4) continue;
    const lum = px.map((p) => p[0] + p[1] + p[2]), m = median(lum), bright = px.filter((_, i) => lum[i] >= m);
    const med = [0, 1, 2].map((c) => median(bright.map((p) => p[c])));
    const l = lab(med[0], med[1], med[2]);
    prof.push([l[1], l[2]]); xs.push(x); medians.push(med);
  }
  if (prof.length < 2 * HOUSE_MIN_WIDTH) return [building];
  const cuts = pelt(prof, HOUSE_MIN_WIDTH, HOUSE_PENALTY).slice(0, -1).map((i) => xs[i]);
  if (!cuts.length) return [building];
  const edges = [xa, ...cuts, xb], q = building.quad;
  const along = (p0, p1, x) => p0[1] + (p1[1] - p0[1]) * (x - p0[0]) / Math.max(1e-9, p1[0] - p0[0]);
  const bottomAt = (x) => Math.round(along(q[3], q[2], x)), topAt = (x) => Math.round(along(q[0], q[1], x));
  const upper = upperOf(building.clip || [[xa, topAt(xa)], [xb, topAt(xb)], q[2], q[3]]);
  const roofAt = (x) => { let best = upper[0]; for (const p of upper) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p; return best[1]; };
  const parts = edges.slice(0, -1).map((a, i) => {
    const b = edges[i + 1];
    const clipTop = [[a, roofAt(a)], ...upper.filter((p) => p[0] > a && p[0] < b), [b, roofAt(b)]];
    return { a, b, quad: [[a, topAt(a)], [b, topAt(b)], [b, bottomAt(b)], [a, bottomAt(a)]], clip: [...clipTop, [b, bottomAt(b)], [a, bottomAt(a)]] };
  });
  if (!paletteOf) {
    return parts.map(({ a, b, quad, clip }) => ({ ...building, quad, clip }));
  }
  const getIndex = (part) => {
    const cols = medians.slice(xs.indexOf(part.a), xs.indexOf(part.b) + 1);
    if (!cols.length) return paletteOf([128, 128, 128]);
    const medRgb = [0, 1, 2].map((c) => median(cols.map((m) => m[c])));
    return paletteOf(medRgb);
  };
  const merged = mergeSameColour(parts, getIndex);
  return merged.map(({ a, b, quad, clip }) => ({ ...building, quad, clip }));
}

export function inPoly(P, x, y) {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

export function nearestIndex(comp, rgb, from, to) {
  const l = comp.lab(rgb[0], rgb[1], rgb[2]);
  let best = from, bd = Infinity;
  for (let i = from; i < to; i += 1) {
    const c = comp.RGB[i], p = comp.lab(c[0], c[1], c[2]), d = (p[0] - l[0]) ** 2 + (p[1] - l[1]) ** 2 + (p[2] - l[2]) ** 2;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

export function mergeSameColour(parts, indexOf) {
  if (parts.length <= 1) return parts;
  const out = [];
  let cur = { ...parts[0] };
  for (let i = 1; i < parts.length; i += 1) {
    const idxCur = indexOf(cur), idxNext = indexOf(parts[i]);
    if (idxCur === idxNext) {
      cur.b = parts[i].b;
    } else {
      out.push(cur);
      cur = { ...parts[i] };
    }
  }
  out.push(cur);
  return out;
}

export function standsFree(comp, id, W) {
  const S = comp.S, top = new Map();
  for (let k = 0; k < S.ID.length; k += 1) if (S.ID[k] === id && !top.has(k % W)) top.set(k % W, (k / W) | 0);
  let open = 0;
  for (const [x, y] of top) { const above = (y - 1) * W + x; if (y === 0 || comp.sky[above] || (S.ID[above] >= 1 && S.ID[above] < 10)) open += 1; }
  return top.size > 0 && open / top.size >= V13_REVEAL;
}

export function v13PaneShare(comp, region) {
  let n = 0;
  for (const k of region) if (comp.S.base[k] < GLASS_RAMP[1]) n += 1;
  return n / Math.max(1, region.length);
}

function rectify(src, srcW, toImage, MW, MH, smooth) {
  const out = new Uint8ClampedArray(MW * MH * 4), srcH = src.length / 4 / srcW;
  for (let y = 0; y < MH; y += 1) for (let x = 0; x < MW; x += 1) {
    const [fx, fy] = toImage((x + 0.5) / MW, (y + 0.5) / MH);
    const o = (y * MW + x) * 4;
    if (smooth) {
      const x0 = Math.floor(fx - 0.5), y0 = Math.floor(fy - 0.5), tx = fx - 0.5 - x0, ty = fy - 0.5 - y0;
      for (let c = 0; c < 3; c += 1) {
        let v = 0;
        for (const [dx, dy, wgt] of [[0, 0, (1 - tx) * (1 - ty)], [1, 0, tx * (1 - ty)], [0, 1, (1 - tx) * ty], [1, 1, tx * ty]]) {
          const xx = Math.min(srcW - 1, Math.max(0, x0 + dx)), yy = Math.min(srcH - 1, Math.max(0, y0 + dy));
          v += src[(yy * srcW + xx) * 4 + c] * wgt;
        }
        out[o + c] = v;
      }
    } else {
      const xx = Math.min(srcW - 1, Math.max(0, Math.floor(fx))), yy = Math.min(srcH - 1, Math.max(0, Math.floor(fy)));
      for (let c = 0; c < 3; c += 1) out[o + c] = src[(yy * srcW + xx) * 4 + c];
    }
    out[o + 3] = 255;
  }
  return out;
}

export function twoTones(values) {
  if (values.length < 2) return null;
  const s = Float64Array.from(values).sort();
  let best = null;
  for (let i = 1; i < s.length; i += 1) {
    const a = s.subarray(0, i), b = s.subarray(i), ma = a.reduce((t, v) => t + v, 0) / a.length, mb = b.reduce((t, v) => t + v, 0) / b.length;
    const score = a.length * b.length * (mb - ma) ** 2;
    if (!best || score > best.score) best = { score, cut: s[i - 1], gap: mb - ma };
  }
  return best;
}

function drawArt({ comp, lbl, MW, MH, EU, EV, photo, colour, rects, bay, floor }) {
  const at = (x, y) => lbl[Math.min(MH - 1, Math.floor(((y + 0.5) / EV) * MH)) * MW + Math.min(MW - 1, Math.floor(((x + 0.5) / EU) * MW))];
  const boxMedian = (img, keep) => {
    const v = [[], [], []];
    for (let y = 0; y < EV; y += 1) for (let x = 0; x < EU; x += 1) {
      if (!keep(at(x, y))) continue;
      const o = (Math.min(MH - 1, Math.floor(((y + 0.5) / EV) * MH)) * MW + Math.min(MW - 1, Math.floor(((x + 0.5) / EU) * MW))) * 4;
      v[0].push(img[o]); v[1].push(img[o + 1]); v[2].push(img[o + 2]);
    }
    return v[0].length ? v.map(median) : null;
  };
  const wallRgb = boxMedian(colour, (v) => v === L.facade) || boxMedian(colour, () => true);
  const wall = nearestIndex(comp, wallRgb, 0, WORKING);
  const art = new Uint8Array(EU * EV).fill(wall);
  const sx = MW / EU, sy = MH / EV, bx = Math.max(1, Math.round(bay / sx)), by = Math.max(1, Math.round(floor / sy));
  const tone = new Int8Array(EU * EV), blocks = new Map();
  for (let y = 0; y < EV; y += 1) for (let x = 0; x < EU; x += 1) {
    if (at(x, y) !== L.facade) continue;
    const o = (Math.min(MH - 1, Math.floor(((y + 0.5) / EV) * MH)) * MW + Math.min(MW - 1, Math.floor(((x + 0.5) / EU) * MW))) * 4, key = Math.floor(y / by) * 4096 + Math.floor(x / bx);
    (blocks.get(key) || blocks.set(key, []).get(key)).push(0.299 * photo[o] + 0.587 * photo[o + 1] + 0.114 * photo[o + 2]);
  }
  const light = new Map([...blocks].map(([key, v]) => [key, comp.lab(median(v), median(v), median(v))[0]]));
  const split = twoTones([...light.values()]);
  const step = comp.lab(...comp.RGB[wall])[0] - comp.lab(...comp.RGB[shade(wall, -1)])[0];
  if (split && split.gap >= step) {
    for (let y = 0; y < EV; y += 1) for (let x = 0; x < EU; x += 1) {
      const l = light.get(Math.floor(y / by) * 4096 + Math.floor(x / bx));
      if (l !== undefined && l <= split.cut) { tone[y * EU + x] = -1; art[y * EU + x] = shade(wall, -1); }
    }
  }
  for (let y = 0; y < EV; y += 1) {
    let band = 0, shop = 0;
    for (let x = 0; x < EU; x += 1) { const v = at(x, y); if (v === L.cornice || v === L.sill || v === L.molding || v === L.deco) band += 1; if (v === L.shop || v === L.door) shop += 1; }
    if (band / EU >= BAND_ROW) for (let x = 0; x < EU; x += 1) art[y * EU + x] = shade(wall, 1 + tone[y * EU + x]);
    if (y >= EV * SHOP_FROM && shop / EU >= BAND_ROW) { art.fill(shade(wall, -2), y * EU); art.fill(shade(wall, 1), y * EU, (y + 1) * EU); break; }
  }
  const glassRgb = boxMedian(photo, (v) => v === L.window) || [50, 60, 120];
  const glass = Math.min(GLASS_SHADES[1], Math.max(GLASS_SHADES[0], nearestIndex(comp, glassRgb, GLASS_RAMP[0], GLASS_RAMP[1])));
  const panes = [];
  for (const [x0, y0, x1, y1] of rects) {
    const a0 = Math.round(x0 / sx), a1 = Math.round(x1 / sx), b0 = Math.round(y0 / sy), b1 = Math.round(y1 / sy);
    if (a1 - a0 < 1 || b1 - b0 < 1) continue;
    const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < EU && y < EV) art[y * EU + x] = v; };
    const t = tone[Math.min(EV - 1, Math.max(0, b0)) * EU + Math.min(EU - 1, Math.max(0, a0))];
    for (let y = b0 - 1; y < b1; y += 1) for (let x = a0 - 1; x <= a1; x += 1) put(x, y, shade(wall, -1 + t));
    for (let y = b0; y < b1; y += 1) for (let x = a0; x < a1; x += 1) put(x, y, y === b0 || (x === a0 && a1 - a0 >= 3) ? glass + 1 : glass);
    for (let x = a0 - 1; x <= a1; x += 1) if (b1 < EV) put(x, b1, shade(wall, 1 + t));
    panes.push([a0, b0, a1, b1]);
  }
  return { art, wall, panes };
}

export async function rebuildFacade({ comp, building, crop, colour, isBuilding, parse, W, H }) {
  const S = comp.S, id = building.id, region = [];
  for (let k = 0; k < W * H; k += 1) if (S.ID[k] === id && S.base[k] !== OUTLINE && isBuilding(k)) region.push(k);
  if (region.length < MIN_REGION || v13PaneShare(comp, region) >= PANE_SHARE[0] || !standsFree(comp, id, W)) return null;
  const toUnit = homography(building.quad, UNIT), toFrame = homography(UNIT, building.quad);
  const uv = region.map((k) => toUnit((k % W) + 0.5, ((k / W) | 0) + 0.5));
  const u0 = Math.min(0, Math.max(EXTENT_LIMIT.u[0], quantile(uv.map((p) => p[0]), EXTENT_CLIP[0]))), u1 = Math.max(1, Math.min(EXTENT_LIMIT.u[1], quantile(uv.map((p) => p[0]), EXTENT_CLIP[1])));
  const v0 = Math.min(0, Math.max(EXTENT_LIMIT.v[0], quantile(uv.map((p) => p[1]), EXTENT_CLIP[0]))), v1 = Math.max(1, Math.min(EXTENT_LIMIT.v[1], quantile(uv.map((p) => p[1]), EXTENT_CLIP[1])));
  const q = building.quad, d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const RU = Math.max(8, Math.round((d(q[0], q[1]) + d(q[3], q[2])) / 2)), RV = Math.max(8, Math.round((d(q[0], q[3]) + d(q[1], q[2])) / 2));
  const EU = Math.max(8, Math.round(RU * (u1 - u0))), EV = Math.max(8, Math.round(RV * (v1 - v0)));
  const MH = MODEL_HEIGHT, MW = Math.max(64, Math.min(MODEL_MAX_WIDTH, Math.round((MH * EU) / EV)));
  const scale = crop.width / W, img = crop.getContext('2d').getImageData(0, 0, crop.width, crop.height).data;
  const toCrop = (s, t) => { const [x, y] = toFrame(u0 + s * (u1 - u0), v0 + t * (v1 - v0)); return [x * scale, y * scale]; };
  const toColour = (s, t) => { const [x, y] = toFrame(u0 + s * (u1 - u0), v0 + t * (v1 - v0)); return [(x * colour.w) / W, (y * colour.h) / H]; };
  const photo = rectify(img, crop.width, toCrop, MW, MH, true);
  const colourRgba = new Uint8ClampedArray(colour.w * colour.h * 4);
  for (let k = 0; k < colour.w * colour.h; k += 1) { colourRgba[k * 4] = colour.rgb[k * 3]; colourRgba[k * 4 + 1] = colour.rgb[k * 3 + 1]; colourRgba[k * 4 + 2] = colour.rgb[k * 3 + 2]; colourRgba[k * 4 + 3] = 255; }
  const tinted = rectify(colourRgba, colour.w, toColour, MW, MH, true);
  const canvas = document.createElement('canvas');
  canvas.width = MW; canvas.height = MH;
  canvas.getContext('2d').putImageData(new ImageData(photo, MW, MH), 0, 0);
  const raw = await parse(canvas);
  if (!raw) return null;
  const lbl = new Uint8Array(MW * MH), gray = new Float64Array(MW * MH);
  for (let y = 0; y < MH; y += 1) for (let x = 0; x < MW; x += 1) {
    const i = y * MW + x, [fx, fy] = toFrame(u0 + ((x + 0.5) / MW) * (u1 - u0), v0 + ((y + 0.5) / MH) * (v1 - v0));
    const fk = Math.floor(fy) * W + Math.floor(fx), bld = fx >= 0 && fy >= 0 && fx < W && fy < H && isBuilding(fk);
    lbl[i] = !bld ? L.background : raw[i] === L.background ? L.facade : raw[i];
    gray[i] = 0.299 * photo[i * 4] + 0.587 * photo[i * 4 + 1] + 0.114 * photo[i * 4 + 2];
  }
  const evidence = paneEvidence(lbl);
  const lattice = chooseLattice(lbl, gray, MW, MH, Math.max(6, Math.ceil((V13_TILE.bay * MW) / EU)), Math.max(12, Math.ceil((V13_TILE.floor * MH) / EV)));
  if (!lattice) return null;
  const { art, wall, panes } = drawArt({ comp, lbl, MW, MH, EU, EV, photo, colour: tinted, rects: lattice.rects, bay: lattice.bay, floor: lattice.floor });
  const wins = new Map(), paneAt = (a, b) => panes.findIndex(([x0, y0, x1, y1]) => a >= x0 && a < x1 && b >= y0 && b < y1);
  region.forEach((k, i) => {
    const [u, v] = uv[i];
    const a = Math.min(EU - 1, Math.max(0, Math.floor(((u - u0) / (u1 - u0)) * EU))), b = Math.min(EV - 1, Math.max(0, Math.floor(((v - v0) / (v1 - v0)) * EV)));
    S.base[k] = art[b * EU + a];
    const p = paneAt(a, b);
    if (p >= 0) (wins.get(p) || wins.set(p, []).get(p)).push(k);
  });
  return { wins: [...wins.values()].filter((w) => w.length >= 2), wall, bay: lattice.bay, floor: lattice.floor, fit: lattice.score, panes: panes.length, evidence, share: region.length ? region.filter((k) => S.base[k] < GLASS_RAMP[1]).length / region.length : 0 };
}

export function outlineHouses(comp, ids, W, H) {
  const S = comp.S, isB = (k) => S.ID[k] >= 1 && S.ID[k] < 10;
  const next = S.base.slice();
  for (let k = 0; k < W * H; k += 1) {
    if (!ids.has(S.ID[k]) || S.base[k] === OUTLINE) continue;
    const x = k % W, y = (k / W) | 0;
    const nb = [x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1, y > 0 ? k - W : -1, y < H - 1 ? k + W : -1].filter((n) => n >= 0);
    if (nb.some((n) => !isB(n))) next[k] = OUTLINE;
    else if (nb.some((n) => S.ID[n] !== S.ID[k] && S.ID[n] < S.ID[k])) next[k] = shade(S.base[k], -2);
  }
  S.base.set(next);
}
