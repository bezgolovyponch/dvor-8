import { CLASS } from '../v2/classes.js';

const TREE_MIN_PX = 160;
const MAX_TREES = 5;
const GLASS_B = -0.025;

function components(mask, W, H, minPx) {
  const seen = new Uint8Array(W * H), out = [];
  for (let s = 0; s < W * H; s += 1) {
    if (!mask[s] || seen[s]) continue;
    const stack = [s], px = [];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop(), x = i % W;
      px.push(i);
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j < 0 || j >= W * H || !mask[j] || seen[j]) continue;
        seen[j] = 1; stack.push(j);
      }
    }
    if (px.length >= minPx) out.push(px);
  }
  return out;
}

const boxOf = (px, W) => {
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const i of px) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
};

export function inventory({ W, H, cls, lab, cars, buildings, sky }) {
  const plants = components(cls.map((c) => (c === CLASS.GREEN ? 1 : 0)), W, H, TREE_MIN_PX);
  const blds = buildings.map((b) => {
    const xs = b.quad.map((p) => p[0]), ys = b.quad.map((p) => p[1]);
    const box = { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
    let bsum = 0, n = 0;
    for (let y = Math.max(0, box.y0); y <= Math.min(H - 1, box.y1); y += 2) for (let x = Math.max(0, box.x0); x <= Math.min(W - 1, box.x1); x += 2) {
      const i = y * W + x;
      if (cls[i] !== CLASS.BUILDING) continue;
      bsum += lab[i * 3 + 2]; n += 1;
    }
    return { x: (box.x0 + box.x1) / 2, w: box.x1 - box.x0 + 1, h: box.y1 - box.y0 + 1, glass: n > 0 && bsum / n < GLASS_B };
  }).sort((a, b) => a.x - b.x);
  return {
    sky,
    buildings: blds,
    cars: cars.map((c) => ({ x: (c.x0 + c.x1) / 2, w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1, type: c.label === 'bus' ? 'bus' : c.label === 'truck' ? 'truck' : 'car' })).sort((a, b) => a.x - b.x),
    trees: plants.slice(0, MAX_TREES).map((px) => boxOf(px, W)).sort((a, b) => a.x0 - b.x0),
  };
}
