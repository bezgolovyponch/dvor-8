// The yard as a thing that can be hit. Plain data and pure functions: no canvas, no clock of its own.
//
// The picture is an array of palette indices. Breaking something does not draw anything — it rewrites the
// indices of that thing to the void, and the renderer shows whatever the array now says.

import { OUTLINE, VOID } from './palette.js';
import { mulberry32 } from './rng.js';

export const COMBO_WINDOW = 2.5;   // seconds a combo stays alive after a hit
export const NEAR = 6;             // a tap this close to a thing counts as a tap on it
export const DEBRIS_MAX = 260;     // pieces a broken thing throws; more than this is noise, not impact

export function makeWorld({ w, h, photo, st, seg, seed = 1 }) {
  return {
    w, h, photo, seed,
    idx: Uint8Array.from(st.idx),
    owner: seg.owner,
    regions: seg.regions.map((r) => ({ ...r, hits: 0, gone: false, seen: false })),
    rubble: new Uint8Array(w * h).fill(255),   // what has fallen and stayed, as palette indices
    heights: new Uint8Array(w),                // how high the rubble stands in each column
    score: 0, combo: 0, comboLeft: 0, maxCombo: 0,
    throws: 0, hits: 0, broken: 0, strikes: 0, time: 0, done: false,
  };
}

// What is under a point. The exact pixel first; failing that, the nearest live thing within NEAR.
export function pick(world, x, y) {
  const xi = Math.round(x), yi = Math.round(y);
  const at = (px, py) => {
    if (px < 0 || py < 0 || px >= world.w || py >= world.h) return null;
    const id = world.owner[py * world.w + px];
    return id >= 0 && !world.regions[id].gone ? world.regions[id] : null;
  };
  const exact = at(xi, yi);
  if (exact) return exact;
  let best = null, bestD = NEAR + 1;
  for (let dy = -NEAR; dy <= NEAR; dy += 1) {
    for (let dx = -NEAR; dx <= NEAR; dx += 1) {
      const d = Math.hypot(dx, dy);
      if (d >= bestD) continue;
      const r = at(xi + dx, yi + dy);
      if (r) { best = r; bestD = d; }
    }
  }
  return best;
}

// One hit. Returns what happened and the pieces that came off, for the effects to throw around.
export function strike(world, region, x, y) {
  if (!region || region.gone) return null;
  const rnd = mulberry32(world.seed + (world.strikes += 1) * 7919);
  const { w, idx, owner } = world;
  region.hits += 1;
  world.hits += 1;
  world.combo = world.comboLeft > 0 ? world.combo + 1 : 1;
  world.comboLeft = COMBO_WINDOW;
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  const debris = [];
  let kind, points;
  if (region.hits >= region.hp) {
    kind = 'break';
    const every = Math.max(1, Math.ceil(region.area / DEBRIS_MAX));
    region.pixels.forEach((p, n) => {
      if (n % every === 0) debris.push({ x: p % w, y: (p / w) | 0, c: idx[p] });
      const px = p % w, py = (p / w) | 0;
      idx[p] = (px * 3 + py * 5) % 7 === 0 ? OUTLINE : VOID;
    });
    region.gone = true;
    world.broken += 1;
    points = 100 * region.hp * world.combo;
    if (world.broken === world.regions.length) world.done = true;
  } else {
    kind = 'crack';
    // Three jagged cracks out of the point of impact, drawn into the thing itself.
    const reach = Math.max(6, Math.sqrt(region.area) / 1.4);
    for (let ray = 0; ray < 3; ray += 1) {
      let a = rnd() * Math.PI * 2, px = x, py = y;
      for (let step = 0; step < reach; step += 1) {
        a += (rnd() - 0.5) * 0.9;
        px += Math.cos(a); py += Math.sin(a);
        const xi = Math.round(px), yi = Math.round(py);
        if (xi < 0 || yi < 0 || xi >= w || yi >= world.h) break;
        const p = yi * w + xi;
        if (owner[p] !== region.id) continue;
        if (idx[p] !== OUTLINE && step % 3 === 0) debris.push({ x: xi, y: yi, c: idx[p] });
        idx[p] = OUTLINE;
      }
    }
    points = 25 * world.combo;
  }
  world.score += points;
  return { kind, points, combo: world.combo, debris, region };
}

export function tick(world, dt) {
  if (!world.done) world.time += dt;
  world.comboLeft = Math.max(0, world.comboLeft - dt);
  if (world.comboLeft === 0) world.combo = 0;
}

export const left = (world) => world.regions.length - world.broken;
