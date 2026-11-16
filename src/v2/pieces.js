import { CLASS } from './classes.js';

export const TILE_W = 7;
export const TILE_H = 6;
const MIN_PIECE = 6;
const MAX_PANE_SHARE = 0.4;

function footOf(cls, W, H) {
  const foot = new Int32Array(W).fill(H - 1);
  for (let x = 0; x < W; x += 1) {
    for (let y = H - 1; y >= 0; y -= 1) if (cls[y * W + x] === CLASS.BUILDING) { foot[x] = Math.min(H - 1, y + 1); break; }
  }
  return foot;
}

export function tilePieces({ cls, idx, lightness, W, H }) {
  const chunkOf = new Int32Array(W * H).fill(-1);
  const byTile = new Map();
  for (let i = 0; i < W * H; i += 1) {
    if (cls[i] !== CLASS.BUILDING) continue;
    const x = i % W, y = (i / W) | 0, key = Math.floor(y / TILE_H) * 10000 + Math.floor(x / TILE_W);
    if (!byTile.has(key)) byTile.set(key, []);
    byTile.get(key).push(i);
  }
  const foot = footOf(cls, W, H);
  const chunks = [];
  const indexOf = new Map();
  for (const [key, pix] of byTile) {
    if (pix.length < MIN_PIECE) continue;
    let x0 = W, y0 = H, x1 = 0, y1 = 0;
    for (const i of pix) { const x = i % W, y = (i / W) | 0; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const darkest = pix.reduce((best, i) => (lightness[idx[i]] < lightness[idx[best]] ? i : best), pix[0]);
    const pane = pix.filter((i) => idx[i] === idx[darkest]);
    const index = chunks.length;
    indexOf.set(key, index);
    for (const i of pix) chunkOf[i] = index;
    chunks.push({
      index, key, pix, wins: pane.length <= pix.length * MAX_PANE_SHARE ? [pane] : [], sup: [],
      gy: foot[Math.round((x0 + x1) / 2)], x0, y0, x1, y1, near: [],
    });
  }
  for (const c of chunks) {
    const row = Math.floor(c.key / 10000), col = c.key % 10000;
    const below = indexOf.get((row + 1) * 10000 + col);
    if (below !== undefined) c.sup = [below];
    c.near = [[row, col - 1], [row, col + 1], [row - 1, col], [row + 1, col]]
      .map(([r, k]) => indexOf.get(r * 10000 + k)).filter((j) => j !== undefined);
  }
  return { chunks, chunkOf };
}
