// The yard as a thing that can be hit. Plain data and pure functions: no canvas, no clock of its own.
//
// The picture is an array of palette indices. Breaking something does not draw anything — it rewrites the
// indices of that thing to its own wreck, and the renderer shows whatever the array now says.

import { OUTLINE, VOID, scorchMap } from './palette.js';
import { mulberry32 } from './rng.js';
import { makeDecals } from './decal.js';

export const NEAR = 14;            // a tap this close to a thing counts as a tap on it: a finger is not a pixel
                                   // (14 picture pixels — the same finger, on a picture that doubled)
export const DEBRIS_MAX = 220;     // pieces a broken thing throws; more than this is noise, not impact

export function makeWorld({ w, h, photo, idx, palette, regions, owner, seed = 1 }) {
  const picture = Uint8Array.from(idx);
  // The outline index is the palette's second-to-last entry. It used to be the OUTLINE constant, which is
  // COLOURS — correct only for the median-cut route's 28-colour table. A flat palette is shorter, so the
  // constant wrote past the end and the thing's outline became an undefined colour.
  const OUT = palette.length - 2;
  // A dark line round each thing, so it stands off the yard the way a sprite does.
  for (const r of regions) {
    for (const p of r.pixels) {
      const x = p % w, y = (p / w) | 0;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || owner[p - 1] !== r.id || owner[p + 1] !== r.id || owner[p - w] !== r.id || owner[p + w] !== r.id) picture[p] = OUT;
    }
  }
  return {
    w, h, photo, seed, palette, scorch: scorchMap(palette),
    sw: w, yards: [{ x: 0, w, base: 0, made: false, palette }],   // one yard wide until street.js adds more
    idx: picture, owner,
    regions: regions.map((r) => ({ ...r, hits: 0, gone: false, seen: false, washed: false })),
    blooms: [], parcels: [],          // what kind actions have added to the yard (kind.js)
    rubble: new Uint8Array(w * h).fill(255),   // what has fallen and stayed, as palette indices
    decals: makeDecals(), paint: new Uint8Array(w * h),   // the colour thrown at the yard, and the layer it is drawn from
    score: 0, combo: 0, comboLeft: 0, comboWindow: 2.5, maxCombo: 0,
    throws: 0, hits: 0, broken: 0, strikes: 0, time: 0, done: regions.length === 0,
  };
}

// What is under a point. The exact pixel first; failing that, the nearest standing thing within NEAR.
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

// One impact on one thing. Returns what happened and the pieces that came off, for the effects to throw.
export function strike(world, region, x, y, { damage = 1, combo = 2.5 } = {}) {
  if (!region || region.gone) return null;
  const rnd = mulberry32(world.seed + (world.strikes += 1) * 7919);
  const { w, idx, owner, scorch } = world;
  const OUT = world.palette.length - 2, VOIDP = world.palette.length - 1;
  region.hits += damage;
  world.hits += 1;
  world.combo = world.comboLeft > 0 ? world.combo + 1 : 1;
  world.comboLeft = world.comboWindow = combo;
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  const floor = Math.min(world.h - 1, region.y + region.h);   // pieces come to rest at the thing's own foot
  const debris = [];
  let kind, points;
  if (region.hits >= region.hp) {
    kind = 'break';
    const every = Math.max(1, Math.ceil(region.area / DEBRIS_MAX));
    region.pixels.forEach((p, n) => {
      const px = p % w, py = (p / w) | 0;
      if (n % every === 0 && idx[p] !== OUT) debris.push({ x: px, y: py, c: idx[p], floor: floor + ((px * 7 + py * 3) % 5) });
      idx[p] = (px * 3 + py * 5) % 6 === 0 ? VOIDP : scorch[idx[p]];
    });
    region.gone = true;
    world.broken += 1;
    points = 100 * region.hp * world.combo;
    if (world.broken === world.regions.length) world.done = true;
  } else {
    kind = 'crack';
    // A dent where it landed, and three jagged cracks out of it, drawn into the thing itself.
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      const xi = Math.round(x) + dx, yi = Math.round(y) + dy;
      if (dx * dx + dy * dy > 16 || xi < 0 || yi < 0 || xi >= w || yi >= world.h) continue;
      const p = yi * w + xi;
      if (owner[p] === region.id) idx[p] = scorch[idx[p]];
    }
    const reach = Math.max(6, Math.sqrt(region.area) / 1.3);
    for (let ray = 0; ray < 3; ray += 1) {
      let a = rnd() * Math.PI * 2, px = x, py = y;
      for (let step = 0; step < reach; step += 1) {
        a += (rnd() - 0.5) * 0.9;
        px += Math.cos(a); py += Math.sin(a);
        const xi = Math.round(px), yi = Math.round(py);
        if (xi < 0 || yi < 0 || xi >= w || yi >= world.h) break;
        const p = yi * w + xi;
        if (owner[p] !== region.id) continue;
        if (idx[p] !== OUT && step % 3 === 0) debris.push({ x: xi, y: yi, c: idx[p], floor: floor + (step % 4) });
        idx[p] = OUT;
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
