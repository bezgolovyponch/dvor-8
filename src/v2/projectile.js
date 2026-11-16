import { COLOURS } from './theme.js';

const SHAPES = {
  stone: ['.ooo.', 'ohbbo', 'obbso', 'obsso', '.ooo.'],
  brick: ['ooooooo', 'ohhhhbo', 'obbbbso', 'ooooooo'],
};
const PAINT = {
  stone: { o: COLOURS.outline, h: COLOURS.stone[2], b: COLOURS.stone[1], s: COLOURS.stone[0] },
  brick: { o: COLOURS.outline, h: COLOURS.brick[2], b: COLOURS.brick[1], s: COLOURS.brick[0] },
};
const SPIN_FRAMES = 4;
const NEAR_SHARE = 0.35;

export function projectileCells(kind, t, frame) {
  const rows = SHAPES[kind] || SHAPES.stone;
  const turned = Math.floor(frame / SPIN_FRAMES) % 2 === 1;
  const scale = t < NEAR_SHARE ? 2 : 1;
  const cells = [];
  const h = rows.length, w = rows[0].length;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const c = rows[y][x];
    if (c === '.') continue;
    const [cx, cy] = turned ? [h - 1 - y, x] : [x, y];
    const [ox, oy] = turned ? [h, w] : [w, h];
    for (let sy = 0; sy < scale; sy += 1) for (let sx = 0; sx < scale; sx += 1) {
      cells.push({ dx: cx * scale + sx - Math.floor((ox * scale) / 2), dy: cy * scale + sy - Math.floor((oy * scale) / 2), c: PAINT[kind in PAINT ? kind : 'stone'][c] });
    }
  }
  return cells;
}
