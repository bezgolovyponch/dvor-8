export const FRAME = { W: 288, H: 512 };
export const TILE = 16;
export const STREET = { ground: 368, walk: 380, road: 470 };
export const LANES = [418, 462];
const MAX_BUILDING_H = 288;
const MIN_W = 48, MAX_W = 128, MIN_H = 64;
const CAR_GAP = 6;
const snap = (v) => Math.max(TILE, Math.round(v / TILE) * TILE);

export function layoutBuildings(list, W = FRAME.W) {
  if (!list.length) return [];
  const tallest = Math.max(...list.map((b) => b.h));
  let items = list.map((b) => ({ ...b, lw: Math.min(MAX_W, Math.max(MIN_W, snap(b.w * 0.6))), lh: Math.max(MIN_H, snap((b.h / tallest) * MAX_BUILDING_H)) }));
  while (items.length > 1 && items.reduce((t, b) => t + b.lw, 0) > W) {
    const smallest = items.reduce((m, b) => (b.lw * b.lh < m.lw * m.lh ? b : m), items[0]);
    items = items.filter((b) => b !== smallest);
  }
  const total = items.reduce((t, b) => t + b.lw, 0);
  const gap = items.length > 1 ? Math.floor((W - total) / (items.length + 1) / TILE) * TILE : 0;
  let x = Math.max(0, Math.round((W - total - gap * (items.length - 1)) / 2 / TILE) * TILE);
  return items.map((b, i) => {
    const out = { id: i + 1, x0: x, x1: x + b.lw - 1, y0: STREET.ground - b.lh, y1: STREET.ground - 1, glass: b.glass };
    x += b.lw + gap;
    return out;
  });
}

export function layoutTrees(trees, buildings, W = FRAME.W) {
  const gaps = [];
  let prev = 0;
  for (const b of buildings) { if (b.x0 - prev >= TILE) gaps.push([prev, b.x0 - 1]); prev = b.x1 + 1; }
  if (W - prev >= TILE) gaps.push([prev, W - 1]);
  const spots = gaps.length ? gaps.map(([a, b]) => Math.round((a + b) / 2) - TILE / 2) : [];
  return trees.slice(0, Math.max(spots.length, 0)).map((_, i) => ({ x: spots[i], base: STREET.ground }));
}

export function layoutCars(cars, sizes, W = FRAME.W) {
  const lanes = LANES.map(() => ({ x: 4, list: [] }));
  const out = [];
  cars.forEach((c, i) => {
    const size = sizes[i];
    const lane = lanes.reduce((m, l) => (l.x < m.x ? l : m), lanes[0]);
    if (lane.x + size.w > W - 4) return;
    const li = lanes.indexOf(lane);
    out.push({ index: i, x0: lane.x, y0: LANES[li] - size.h, w: size.w, h: size.h, lane: li });
    lane.x += size.w + CAR_GAP;
  });
  return out;
}
