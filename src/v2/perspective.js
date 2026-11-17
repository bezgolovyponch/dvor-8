const EDGE_MIN = 0.06;
const MAX_SLOPE = 6;
const INSET = 3;
const TENSOR_R = 2;
const COHERENCE = 0.6;
const TOLERANCE = 0.07;
const STRIP = 16;
const STRIP_EDGELS = 200;
const STRIP_MIN_EDGELS = 30;
const COARSE_STEP = 12;
const FINE_STEP = 2;
const HORIZON_RANGE = [0.3, 0.9];
const REACH = [-3, 4];
const INSIDE_MARGIN = 0;
const FRONTAL_GAIN = 1.3;
const FLAT_DOMINANCE = 1.5;
export const AT_INFINITY = null;
export const AT_INFINITY_VP = [1, 0, 0];

const sobel = (L, W, x, y) => {
  const at = (dx, dy) => L[(y + dy) * W + x + dx];
  return [at(1, -1) + 2 * at(1, 0) + at(1, 1) - at(-1, -1) - 2 * at(-1, 0) - at(-1, 1), at(-1, 1) + 2 * at(0, 1) + at(1, 1) - at(-1, -1) - 2 * at(0, -1) - at(1, -1)];
};

export function edgels(cols, L, W, H) {
  const out = [];
  for (const c of cols) for (let y = c.top + INSET; y < c.bottom - INSET; y += 1) {
    const x = c.x;
    if (x < 1 + TENSOR_R || x >= W - 1 - TENSOR_R || y < 1 + TENSOR_R || y >= H - 1 - TENSOR_R) continue;
    const [gx0, gy0] = sobel(L, W, x, y);
    if (Math.hypot(gx0, gy0) < EDGE_MIN) continue;
    let jxx = 0, jyy = 0, jxy = 0;
    for (let j = -TENSOR_R; j <= TENSOR_R; j += 1) for (let i = -TENSOR_R; i <= TENSOR_R; i += 1) {
      const [gx, gy] = sobel(L, W, x + i, y + j);
      jxx += gx * gx; jyy += gy * gy; jxy += gx * gy;
    }
    const tr = jxx + jyy, root = Math.sqrt((jxx - jyy) ** 2 + 4 * jxy * jxy);
    if (!tr || root / tr < COHERENCE) continue;
    const a = 0.5 * Math.atan2(2 * jxy, jxx - jyy), nx = Math.cos(a), ny = Math.sin(a);
    if (Math.abs(ny) * MAX_SLOPE < Math.abs(nx)) continue;
    out.push({ x: x + 0.5, y: y + 0.5, nx, ny, w: Math.hypot(gx0, gy0) * root / tr });
  }
  return out;
}

export function support(edges, vx, vy) {
  let score = 0;
  for (const e of edges) {
    const dx = vx === AT_INFINITY ? 1 : vx - e.x, dy = vx === AT_INFINITY ? 0 : vy - e.y;
    const n = Math.hypot(dx, dy);
    if (n < 1e-9) continue;
    const err = (e.nx * dx + e.ny * dy) / n;
    if (Math.abs(err) < TOLERANCE) score += e.w * (1 - (err / TOLERANCE) ** 2);
  }
  return score;
}

const outside = (vx, span) => vx < span[0] - INSIDE_MARGIN || vx > span[1] + INSIDE_MARGIN;

export function bestOnHorizon(edges, vy, span, W, step = COARSE_STEP, around = null) {
  let best = { vx: AT_INFINITY, score: support(edges, AT_INFINITY, vy), side: 0 };
  const infinity = best.score;
  const lo = around === null ? REACH[0] * W : around - COARSE_STEP, hi = around === null ? REACH[1] * W : around + COARSE_STEP;
  for (let vx = lo; vx <= hi; vx += step) {
    if (!outside(vx, span)) continue;
    const score = support(edges, vx, vy);
    if (score > best.score) best = { vx, score, side: vx < span[0] ? -1 : 1 };
  }
  if (best.vx !== AT_INFINITY && best.score < FRONTAL_GAIN * infinity) best = { vx: AT_INFINITY, score: infinity, side: 0 };
  return best;
}

export function strips(cols, L, W, H) {
  const out = [];
  for (let i = 0; i < cols.length; i += STRIP) {
    const part = cols.slice(i, i + STRIP);
    const edges = edgels(part, L, W, H).sort((p, q) => q.w - p.w).slice(0, STRIP_EDGELS);
    out.push({ cols: part, span: [part[0].x, part[part.length - 1].x + 1], edges });
  }
  return out;
}

const gain = (s, vx, vy) => (outside(vx, s.span) ? Math.max(0, support(s.edges, vx, vy) - s.flat) : 0);

export function dominantVanishing(allStrips, W, H) {
  const usable = allStrips.filter((s) => s.edges.length >= STRIP_MIN_EDGELS);
  if (!usable.length) return null;
  for (const s of usable) s.flat = support(s.edges, AT_INFINITY, 0);
  const total = (vx, vy) => usable.reduce((t, s) => t + gain(s, vx, vy), 0);
  let best = { vx: 0, vy: 0, score: 0 };
  for (let vy = Math.round(H * HORIZON_RANGE[0]); vy <= H * HORIZON_RANGE[1]; vy += COARSE_STEP) {
    for (let vx = REACH[0] * W; vx <= REACH[1] * W; vx += COARSE_STEP) {
      const score = total(vx, vy);
      if (score > best.score) best = { vx, vy, score };
    }
  }
  if (!best.score) return null;
  for (let step = COARSE_STEP / 2; step >= FINE_STEP / 2; step /= 2) {
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) {
      const score = total(best.vx + dx * step, best.vy + dy * step);
      if (score > best.score) best = { vx: best.vx + dx * step, vy: best.vy + dy * step, score };
    }
  }
  return [best.vx, best.vy];
}

const modeOf = (values) => {
  const count = new Map();
  for (const v of values) count.set(v, (count.get(v) || 0) + 1);
  return [...count].sort((a, b) => b[1] - a[1])[0][0];
};

const labelOf = (s, dominant) => {
  if (s.edges.length < STRIP_MIN_EDGELS || !dominant || !outside(dominant[0], s.span)) return null;
  return support(s.edges, AT_INFINITY, 0) >= FLAT_DOMINANCE * support(s.edges, dominant[0], dominant[1]) ? 'flat' : 'main';
};

export function planes(partStrips, dominant, W, minWidth) {
  const labels = partStrips.map((s) => labelOf(s, dominant));
  const known = labels.map((s, i) => (s === null ? labels.slice(0, i).reverse().find((v) => v !== null) ?? labels.find((v) => v !== null) ?? 'flat' : s));
  const smooth = known.map((s, i) => (i > 0 && i < known.length - 1 ? modeOf([known[i - 1], s, known[i + 1]]) : s));
  const runs = [];
  smooth.forEach((label, i) => {
    const last = runs[runs.length - 1];
    if (last && last.label === label) last.strips.push(partStrips[i]);
    else runs.push({ label, strips: [partStrips[i]] });
  });
  const widthOf = (r) => r.strips.reduce((t, s) => t + s.cols.length, 0);
  const merged = [];
  for (const r of runs) {
    if (merged.length && widthOf(r) < minWidth) merged[merged.length - 1].strips.push(...r.strips);
    else merged.push(r);
  }
  if (merged.length > 1 && widthOf(merged[0]) < minWidth) { merged[1].strips.unshift(...merged[0].strips); merged.shift(); }
  for (let i = merged.length - 2; i >= 1; i -= 1) {
    if (merged[i - 1].label !== merged[i + 1].label) continue;
    merged[i - 1].strips.push(...merged[i].strips, ...merged[i + 1].strips);
    merged.splice(i, 2);
  }
  return merged.map((r) => {
    const cols = r.strips.flatMap((s) => s.cols), edges = r.strips.flatMap((s) => s.edges);
    const span = [cols[0].x, cols[cols.length - 1].x + 1];
    if (r.label === 'main' && outside(dominant[0], span)) return { cols, vp: [dominant[0], dominant[1], 1] };
    return { cols, vp: AT_INFINITY_VP };
  });
}

export function interceptAt(vp, x, y, xa) {
  const [a, b, c] = vp;
  const dx = a - c * x, dy = b - c * y;
  if (Math.abs(dx) < 1e-9) return null;
  return y + dy * (xa - x) / dx;
}

const FAR_SHARE = 0.15;

export function perspectiveQuad(cols, vp) {
  const xa = cols[0].x, xb = cols[cols.length - 1].x + 1;
  if (vp[2] && !outside(vp[0] / vp[2], [xa, xb])) return null;
  const far = vp[2] ? cols.slice().sort((p, q) => Math.abs(q.x - vp[0]) - Math.abs(p.x - vp[0])).slice(0, Math.max(3, Math.round(cols.length * FAR_SHARE))) : cols;
  const median = (a) => a.slice().sort((p, q) => p - q)[a.length >> 1];
  const ref = far[0].x + 0.5;
  const t0 = interceptAt(vp, ref, median(far.map((c) => c.top)), xa);
  const b0 = interceptAt(vp, ref, median(far.map((c) => c.bottom + 1)), xa);
  if (t0 === null || b0 === null || !(b0 > t0)) return null;
  const along = (y0, x) => interceptAt(vp, xa, y0, x);
  return {
    quad: [[xa, along(t0, xa)], [xb, along(t0, xb)], [xb, along(b0, xb)], [xa, along(b0, xa)]].map(([x, y]) => [Math.round(x), Math.round(y)]),
    bottom: (x) => along(b0, x),
  };
}
