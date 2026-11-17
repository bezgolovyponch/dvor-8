const VEHICLES = new Set(['car', 'truck', 'bus', 'motorcycle']);
const SURE_SCORE = 0.4;
const MASK_BACKED_SCORE = 0.15;
const MASK_BACKED_COVER = 0.35;
const SAME_BOX_IOU = 0.5;
const GROUP_BOX_CARS = 2;
const SAME_BOX_COVER = 0.6;

export function overlapOfSmaller(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (ix * iy) / (Math.min(a.w * a.h, b.w * b.h) || 1);
}

const containsCentre = (outer, inner) => {
  const cx = inner.x + inner.w / 2, cy = inner.y + inner.h / 2;
  return cx > outer.x && cx < outer.x + outer.w && cy > outer.y && cy < outer.y + outer.h;
};
const MIN_PIXELS = 12;
const COLUMN_ASPECT = 1.3;
const CAR_DEPTH_PER_WIDTH = 0.7;

export function iou(a, b) {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const inter = ix * iy;
  return inter / (a.w * a.h + b.w * b.h - inter || 1);
}

export function maskCover(box, carMask, W, H) {
  const x0 = Math.max(0, Math.floor(box.x * W)), x1 = Math.min(W, Math.ceil((box.x + box.w) * W));
  const y0 = Math.max(0, Math.floor(box.y * H)), y1 = Math.min(H, Math.ceil((box.y + box.h) * H));
  let on = 0, all = 0;
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { all += 1; on += carMask[y * W + x] ? 1 : 0; }
  return all ? on / all : 0;
}

export function vehicleBoxes(detections, carMask, W, H) {
  const accepted = detections
    .filter((d) => VEHICLES.has(d.label))
    .filter((d) => d.score >= SURE_SCORE || (d.score >= MASK_BACKED_SCORE && maskCover(d, carMask, W, H) >= MASK_BACKED_COVER))
    .sort((a, b) => b.score - a.score);
  const kept = [];
  for (const d of accepted) if (!kept.some((k) => iou(k, d) > SAME_BOX_IOU || overlapOfSmaller(k, d) > SAME_BOX_COVER)) kept.push(d);
  return kept.filter((d) => kept.filter((k) => k !== d && containsCentre(d, k)).length < GROUP_BOX_CARS);
}

export function components(mask, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  const list = [];
  const stack = [];
  for (let s = 0; s < W * H; s += 1) {
    if (!mask[s] || label[s] >= 0) continue;
    const id = list.length, px = [];
    label[s] = id; stack.push(s);
    while (stack.length) {
      const i = stack.pop(); px.push(i);
      const x = i % W, y = (i / W) | 0;
      if (x > 0 && mask[i - 1] && label[i - 1] < 0) { label[i - 1] = id; stack.push(i - 1); }
      if (x < W - 1 && mask[i + 1] && label[i + 1] < 0) { label[i + 1] = id; stack.push(i + 1); }
      if (y > 0 && mask[i - W] && label[i - W] < 0) { label[i - W] = id; stack.push(i - W); }
      if (y < H - 1 && mask[i + W] && label[i + W] < 0) { label[i + W] = id; stack.push(i + W); }
    }
    list.push(px);
  }
  return { label, list };
}

const boundsOf = (px, W) => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const i of px) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};

function splitColumn(px, W) {
  const b = boundsOf(px, W);
  const width = b.x1 - b.x0 + 1, height = b.y1 - b.y0 + 1;
  if (height < width * COLUMN_ASPECT) return [px];
  const parts = Math.max(1, Math.round(height / (width * CAR_DEPTH_PER_WIDTH)));
  const out = Array.from({ length: parts }, () => []);
  for (const i of px) out[Math.min(parts - 1, Math.floor((((i / W) | 0) - b.y0) / (height / parts)))].push(i);
  return out;
}

const COLOUR_GAP = 0.075;
const MASK_LEADS = 0.45;
const MIN_KEEP_OF_BOX = 0.2;
const MIN_SOLIDITY = 0.55;

const labAt = (lab, i) => [lab[i * 3], lab[i * 3 + 1], lab[i * 3 + 2]];
const labDist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

function medianLab(samples) {
  if (!samples.length) return null;
  const m = [0, 1, 2].map((c) => samples.map((s) => s[c]).sort((a, b) => a - b)[samples.length >> 1]);
  return m;
}

const SURROUND_REACH = 12;

export function surroundOf(B, lab, carMask, W, H, ground = null) {
  const near = [];
  for (let y = Math.max(0, B.y0 - SURROUND_REACH); y < Math.min(H, B.y1 + SURROUND_REACH); y += 1) {
    for (let x = Math.max(0, B.x0 - SURROUND_REACH); x < Math.min(W, B.x1 + SURROUND_REACH); x += 1) {
      const i = y * W + x;
      if (carMask[i] || (ground && !ground[i])) continue;
      if (x >= B.x0 && x < B.x1 && y >= B.y0 && y < B.y1 && !ground) continue;
      near.push(labAt(lab, i));
    }
  }
  return medianLab(near);
}

export function fillRows(px, W) {
  const rows = new Map();
  for (const i of px) {
    const y = (i / W) | 0, x = i % W;
    const r = rows.get(y) || [x, x];
    rows.set(y, [Math.min(r[0], x), Math.max(r[1], x)]);
  }
  const out = [];
  for (const [y, [a, b]] of rows) for (let x = a; x <= b; x += 1) out.push(y * W + x);
  return out;
}

function largestPart(px, W, H) {
  const m = new Uint8Array(W * H);
  for (const i of px) m[i] = 1;
  const { list } = components(m, W, H);
  return list.reduce((best, c) => (c.length > best.length ? c : best), []);
}

const CORNER_SHARE = 0.3;

export function roundCorners(px, W) {
  if (!px.length) return px;
  const b = boundsOf(px, W);
  const r = Math.max(1, Math.round(Math.min(b.x1 - b.x0 + 1, b.y1 - b.y0 + 1) * CORNER_SHARE));
  return px.filter((i) => {
    const x = i % W, y = (i / W) | 0;
    const dx = Math.max(0, b.x0 + r - x, x - (b.x1 - r)), dy = Math.max(0, b.y0 + r - y, y - (b.y1 - r));
    return dx * dx + dy * dy <= r * r;
  });
}

const touchesBorder = (b, W, H) => b.x0 === 0 || b.y0 === 0 || b.x1 === W - 1 || b.y1 === H - 1;

export function carInstances(detections, carMask, W, H, lab = null, ground = null) {
  const boxes = vehicleBoxes(detections, carMask, W, H).map((d) => ({
    ...d, x0: Math.max(0, Math.floor(d.x * W)), y0: Math.max(0, Math.floor(d.y * H)),
    x1: Math.min(W, Math.ceil((d.x + d.w) * W)), y1: Math.min(H, Math.ceil((d.y + d.h) * H)),
  })).sort((a, b) => b.y1 - a.y1);
  const inst = new Int16Array(W * H).fill(-1);
  const claimed = new Uint8Array(W * H);
  const groups = [];
  for (const B of boxes) {
    const maskLed = maskCover(B, carMask, W, H) >= MASK_LEADS;
    const ref = lab && !maskLed ? surroundOf(B, lab, carMask, W, H, ground) : null;
    const px = [];
    for (let y = B.y0; y < B.y1; y += 1) for (let x = B.x0; x < B.x1; x += 1) {
      const i = y * W + x;
      if (claimed[i]) continue;
      if (carMask[i] || (ref && labDist(labAt(lab, i), ref) > COLOUR_GAP)) px.push(i);
    }
    const part = largestPart(px, W, H);
    const body = (maskLed ? part : roundCorners(fillRows(part, W), W)).filter((i) => !claimed[i]);
    if (body.length < Math.max(MIN_PIXELS, MIN_KEEP_OF_BOX * (B.x1 - B.x0) * (B.y1 - B.y0))) continue;
    for (const i of body) claimed[i] = 1;
    groups.push({ label: B.label, score: B.score, px: body });
  }
  const loose = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) if (carMask[i] && !claimed[i]) loose[i] = 1;
  for (const px of components(loose, W, H).list) {
    for (const part of splitColumn(px, W)) {
      const b = boundsOf(part, W);
      const area = (b.x1 - b.x0 + 1) * (b.y1 - b.y0 + 1);
      if (touchesBorder(b, W, H) || part.length / area < MIN_SOLIDITY || part.length < MIN_PIXELS * 2) continue;
      groups.push({ label: 'car', score: 0, px: part });
    }
  }
  const out = [];
  for (const g of groups) {
    const id = out.length;
    for (const i of g.px) inst[i] = id;
    out.push({ id, label: g.label, score: g.score, n: g.px.length, ...boundsOf(g.px, W) });
  }
  return { inst, list: out, boxes };
}
