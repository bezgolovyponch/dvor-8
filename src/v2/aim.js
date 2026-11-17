import { outlinePixels } from './outline.js';
import { COLOURS } from './theme.js';
import { EMPTY } from './sprites.js';

export const AIM_COLOUR = COLOURS.aim;

function carAt(world, x, y) {
  return world.sprites.find((s) => {
    if (x < s.x0 || y < s.y0 || x >= s.x0 + s.w || y >= s.y0 + s.h) return false;
    return s.px[(y - s.y0) * s.w + x - s.x0] !== EMPTY;
  });
}

export function targetAt(world, x, y) {
  x = Math.floor(x); y = Math.floor(y);
  if (x < 0 || y < 0 || x >= world.W || y >= world.H) return null;
  const car = carAt(world, x, y);
  if (car) return { car };
  const ruin = world.ruin, k = y * world.W + x;
  if (!ruin || ruin.chunkOf[k] < 0 || world.interior[k]) return null;
  return { bid: ruin.pieces[ruin.chunkOf[k]].bid };
}

const edgesOf = (inside, W, H, cells) => outlinePixels(inside, W, H, cells);

export function silhouette(world, target) {
  const { W, H } = world;
  if (!target) return [];
  if (target.car) {
    const s = target.car, cells = [];
    const inside = (k) => {
      const x = k % W - s.x0, y = ((k / W) | 0) - s.y0;
      return x >= 0 && y >= 0 && x < s.w && y < s.h && s.px[y * s.w + x] !== EMPTY;
    };
    for (let y = 0; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) if (s.px[y * s.w + x] !== EMPTY) cells.push((s.y0 + y) * W + s.x0 + x);
    return edgesOf(inside, W, H, cells);
  }
  const ruin = world.ruin;
  const inside = (k) => k >= 0 && k < W * H && ruin.chunkOf[k] >= 0 && !world.interior[k] && ruin.pieces[ruin.chunkOf[k]].bid === target.bid;
  const cells = [];
  for (const p of ruin.pieces) if (p.bid === target.bid && !p.gone) for (const k of p.pix) if (inside(k)) cells.push(k);
  return edgesOf(inside, W, H, cells);
}
