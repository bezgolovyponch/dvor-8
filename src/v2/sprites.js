import { CLASS } from './classes.js';

const EMPTY = -1;
const FILL_REACH = 40;
const GLASS_TOP_SHARE = 0.65;
const OUTLINE_DARKEN = 0.6;

const isGround = (c) => c === CLASS.ROAD || c === CLASS.TERRAIN || c === CLASS.GREEN;

function nearestOutside(x, y, W, inside, cls) {
  let fallback = -1;
  for (let d = 1; d <= FILL_REACH; d += 1) {
    for (const [xx, yy] of [[x - d, y], [x + d, y], [x, y + d], [x, y - d]]) {
      if (xx < 0 || xx >= W || yy < 0 || yy * W >= cls.length) continue;
      const j = yy * W + xx;
      if (inside[j]) continue;
      if (isGround(cls[j])) return j;
      if (fallback < 0) fallback = j;
    }
  }
  return fallback;
}

export function outlineColour([r, g, b]) {
  return [Math.round(r * OUTLINE_DARKEN * 0.55), Math.round(g * OUTLINE_DARKEN * 0.5), Math.round(b * OUTLINE_DARKEN * 0.65)];
}

export function cutSprites({ idx, palette, cls, inst, list, W, H }) {
  const background = idx.slice();
  const inside = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i += 1) if (inst[i] >= 0) inside[i] = 1;
  for (let i = 0; i < W * H; i += 1) {
    if (!inside[i]) continue;
    const j = nearestOutside(i % W, (i / W) | 0, W, inside, cls);
    if (j >= 0) background[i] = idx[j];
  }
  const sprites = list.map((c) => {
    const w = c.x1 - c.x0 + 1, h = c.y1 - c.y0 + 1;
    const px = new Int32Array(w * h).fill(EMPTY);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const i = (c.y0 + y) * W + c.x0 + x;
      if (inst[i] === c.id) px[y * w + x] = idx[i];
    }
    const outline = palette.length;
    palette.push(outlineColour(darkestOf(px, palette)));
    const glass = markGlass(px, w, h, palette);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
      const k = y * w + x;
      if (px[k] === EMPTY) continue;
      const gx = c.x0 + x, gy = c.y0 + y;
      const open = (nx, ny) => nx < 0 || ny < 0 || nx >= W || ny >= H || inst[ny * W + nx] < 0;
      const edge = open(gx - 1, gy) || open(gx + 1, gy) || open(gx, gy - 1) || open(gx, gy + 1);
      if (edge) { px[k] = outline; glass[k] = 0; }
    }
    let n = 0;
    for (const v of px) if (v !== EMPTY) n += 1;
    return { id: c.id, label: c.label, x0: c.x0, y0: c.y0, w, h, px, glass, n0: n, n, state: 'whole', heat: 0, flash: 0 };
  });
  return { background, sprites };
}

const luma = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b;

function darkestOf(px, palette) {
  let best = [40, 40, 40], bl = Infinity;
  for (const v of px) if (v !== EMPTY) { const l = luma(palette[v]); if (l < bl) { bl = l; best = palette[v]; } }
  return best;
}

export function markGlass(px, w, h, palette) {
  const glass = new Uint8Array(w * h);
  const counts = new Map();
  for (let y = 0; y < Math.ceil(h * GLASS_TOP_SHARE); y += 1) for (let x = 0; x < w; x += 1) {
    const v = px[y * w + x];
    if (v !== EMPTY) counts.set(v, (counts.get(v) || 0) + 1);
  }
  const used = [...counts.keys()].sort((a, b) => luma(palette[a]) - luma(palette[b]));
  if (used.length < 3) return glass;
  const pane = used[0];
  for (let y = 0; y < Math.ceil(h * GLASS_TOP_SHARE); y += 1) for (let x = 0; x < w; x += 1) {
    if (px[y * w + x] === pane) glass[y * w + x] = 1;
  }
  return glass;
}

export { EMPTY };
