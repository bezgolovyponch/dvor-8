// The yard as a thing that can be hit. Plain data and pure functions: no canvas, no clock of its own.
//
// The picture is an array of palette indices. Breaking something does not draw anything — it rewrites the
// indices of that thing to its own wreck, and the renderer shows whatever the array now says.

import { OUTLINE, VOID, scorchMap } from './palette.js';
import { STEPS } from './flat.js';
import { mulberry32 } from './rng.js';
import { makeDecals } from './decal.js';

// ---- AN OBJECT'S OWN BORDER, AND DAMAGE THAT FOLLOWS IT -----------------------------------------------
//
// The audit's piece B, assembled from two functions that already existed for the scenery: a Moore boundary
// trace and a Ramer-Douglas-Peucker simplification. Here they work on a REGION's own pixel list - the thing the
// detector found and the game gave hit points to - so the game finally knows the SHAPE of what it is breaking
// instead of only its box. Piece C (world.chip) then tears along that shape, and a disaster (piece D) calls the
// same path a thrown stone does.

/** The region's outline as a simplified closed polyline. Empty if the region has no pixels. */
export function borderOf(world, region) {
  const { w } = world;
  const inR = new Set(region.pixels);
  if (!inR.size) return [];
  const has = (x, y) => inR.has(y * w + x);
  let sx = -1, sy = -1;
  for (const p of region.pixels) {
    const x = p % w, y = (p / w) | 0;
    if (sx < 0 || y < sy || (y === sy && x < sx)) { sx = x; sy = y; }
  }
  const N = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const pts = [];
  let cx = sx, cy = sy, dir = 6;
  const guard = 8 * (region.pixels.length + 8);
  for (let n = 0; n < guard; n += 1) {
    pts.push([cx, cy]);
    let found = false;
    for (let k = 0; k < 8; k += 1) {
      const d = (dir + 5 + k) % 8;
      const nx = cx + N[d][0], ny = cy + N[d][1];
      if (has(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; }
    }
    if (!found) break;
    if (cx === sx && cy === sy && pts.length > 3) break;
  }
  if (pts.length < 4) return pts;
  // simplify: a border of a thing at this scale is a handful of straight runs
  const keep = new Uint8Array(pts.length);
  keep[0] = 1; keep[pts.length - 1] = 1;
  const tol = 1.4, stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    let far = -1, fd = tol;
    for (let i = a + 1; i < b; i += 1) {
      const d = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / len;
      if (d > fd) { fd = d; far = i; }
    }
    if (far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

/** Is a point inside a closed polyline? Even-odd, which is all a border needs. */
export function insideBorder(poly, x, y) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * PIECE D: a bang on a thing, in the thing's OWN SHAPE. One tone down its own ramp everywhere the blow reaches,
 * a hole torn out along the border where it landed, and the void only at the centre - never a black box, which
 * is what "wrecked" looked like before (D48, and the audit's row 26).
 */
export function wreckAlong(world, region, at = null, strength = 1) {
  const poly = borderOf(world, region);
  const cx = at ? at.x : region.cx, cy = at ? at.y : region.cy;
  const R = Math.max(2, Math.min(12, (Math.sqrt(region.area) / 3) * strength));
  const voidI = world.palette.length - 1;
  let torn = 0, dented = 0, holed = 0;
  for (const p of region.pixels) {
    const x = p % world.w, y = (p / world.w) | 0;
    const d = Math.hypot(x - cx, y - cy);
    const onBorder = poly.length > 3 && !insideBorder(poly, x, y);
    // THE HOLE IS SMALL AND IT IS ONE HOLE. A wreck is mostly the thing itself: a hole where the blow landed, a
    // torn edge along its own border, and the rest of it scraped one tone. Nothing whole is replaced by nothing.
    if (d <= Math.max(1.5, R * 0.3)) { world.rubble[p] = voidI; holed += 1; continue; }
    if (d <= R || (onBorder && (x * 3 + y * 5) % 3 === 0)) {
      world.rubble[p] = world.dent[world.idx[p]] ?? voidI; torn += 1;
    } else {
      world.idx[p] = world.dent[world.idx[p]] ?? world.idx[p]; dented += 1;
    }
  }
  return { poly, torn, dented, holed };
}

/**
 * ROLLED OVER. Water and wind do not only break a car, they put it on its roof - and a yard after a hurricane is
 * full of cars that are somewhere else than they were. The car keeps its own pixels: they are lifted a few rows
 * and scraped one tone, which at this size reads exactly as a car that has been rolled, and nothing is deleted.
 */
export function rollOver(world, region, by = 4, rnd = Math.random) {
  if (region.rolled || region.gone) return null;
  region.rolled = true;
  let moved = 0;
  const shift = Math.max(2, Math.round(by));
  for (const p of region.pixels) {
    const x = p % world.w, y = (p / world.w) | 0;
    const ny = Math.max(0, y - shift);
    const to = ny * world.w + x;
    if (world.rubble[to] === 255) { world.rubble[to] = world.dent[world.idx[p]] ?? world.idx[p]; moved += 1; }
    world.idx[p] = world.dent[world.idx[p]] ?? world.idx[p];
  }
  return { moved, shift };
}

// ---- THE ENVIRONMENT IS DESTRUCTIBLE TOO ------------------------------------------------------------------
//
// Until this, only the things the detector found could be hit: a car, a bench, a window. Everything else in the
// picture — the wall, the asphalt, the fence, the foliage — was scenery you could throw at and nothing happened.
// That is the difference between a yard you can wreck and a yard you can only tidy. So the surfaces themselves
// take damage, by the same rule as everything else: a hit is counted, enough hits break the surface open, the
// hole is permanent (D8), and what it is made of decides how many hits it takes.
//
// HOW TOUGH EACH SURFACE IS, and it is a CHOICE with a reason rather than a number picked to feel nice. The
// ramp a surface is painted from is already a statement about what it is (flat.js picks it by hue and by three
// named priors), so the toughness table is keyed by that ramp and nothing new has to be classified:
//
//   foliage  1  leaves and grass: a hit takes a hole out of it
//   pane     1  glass (a window found by frame.js): one hit, as the drawn yard's windows already take two
//   sand     2  dry ground, dust, khaki: loose, but it holds a slope
//   earth    2  soil and brick: crumbles
//   warm     2  a painted wall, a red car's panel
//   stone    3  concrete and kerb: the stuff a yard is actually built of
//   metal    3  asphalt and glass at scale: the road, which should be the hardest thing to hurt
//   sky      0  not a surface at all: a throw at the sky goes up and comes down (main.js)
//
// Points are deliberately small next to a wrecked car: chewing a hole in a wall is worth doing for the hole, not
// for the score, and a big score for scenery would make the detected things pointless.
export const ENV_TOUGH = { foliage: 1, pane: 1, sand: 2, earth: 2, warm: 2, stone: 3, metal: 3, dusk: 3, sky: 0 };
export const ENV_HIT_POINTS = 8;
export const ENV_BREAK_POINTS = 30;

export const NEAR = 14;            // a tap this close to a thing counts as a tap on it: a finger is not a pixel
                                   // (14 picture pixels — the same finger, on a picture that doubled)
export const DEBRIS_MAX = 220;     // pieces a broken thing throws; more than this is noise, not impact

export function makeWorld({ w, h, photo, idx, palette, regions, owner, seed = 1, env = null }) {
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
    w, h, photo, seed, palette, scorch: scorchMap(palette), dent: dentMap(palette),
    sw: w, yards: [{ x: 0, w, base: 0, made: false, palette }],   // one yard wide until street.js adds more
    idx: picture, owner,
    regions: regions.map((r) => ({ ...r, hits: 0, gone: false, seen: false, washed: false })),
    blooms: [], parcels: [],          // what kind actions have added to the yard (kind.js)
    // The surfaces behind the things: which flat region each pixel belongs to, and what it is made of. This is
    // flat.js's own region map handed straight through — the painter already decided the material when it chose
    // the ramp, so nothing here classifies anything.
    env: env || null,
    envHits: env ? new Int32Array(env.nr) : null,
    rubble: new Uint8Array(w * h).fill(255),   // what has fallen and stayed, as palette indices
    decals: makeDecals(), paint: new Uint8Array(w * h),   // the colour thrown at the yard, and the layer it is drawn from
    score: 0, combo: 0, comboLeft: 0, comboWindow: 2.5, maxCombo: 0,
    throws: 0, hits: 0, broken: 0, strikes: 0, time: 0, done: regions.length === 0,
  };
}

/**
 * ONE TONE DOWN, and it is the difference between a wreck and a recolour.
 *
 * `scorchMap` drives a colour to 34% of its brightness, which is right for what the VOID leaves behind — a
 * thing that is gone — and wrong for a thing that is merely wrecked. A dented car in a photograph is still a
 * car: darker where it is bent, the same colour everywhere else. So damage moves a pixel one tone down its own
 * ramp while there is a tone left to move to, and only then falls back to the scorch. Minimal, in the
 * environment's own colours, and directly recognisable as the thing it was.
 */
export function dentMap(palette) {
  const OUT = palette.length - 2, VOIDP = palette.length - 1;
  return Uint8Array.from({ length: palette.length }, (_, i) => {
    if (i === OUT || i === VOIDP) return i;
    if (i % STEPS > 0) return i - 1;                       // a tone down its own ramp, as before
    // A COLOUR WITH NOWHERE DARKER TO GO GETS ONE TONE UP, NOT THE SCORCH. This is the difference between damage
    // and a hole: a dark car hit by a disaster used to be driven to 34% brightness - a black mass where a car had
    // been, which is exactly what the creator saw on screen. A blow that exposes the surface UNDER the paint is
    // both truer (that is what a scrape looks like) and visible: the thing keeps its shape and its colour family.
    return Math.min(OUT - 1, i + 1);
  });
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

/**
 * What surface is under a point, what it is made of, and how many hits it has left. Null in the sky and on a
 * surface that is already broken open.
 */
export function surfaceAt(world, x, y) {
  if (!world.env) return null;
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= world.w || yi >= world.h) return null;
  const p = yi * world.w + xi;
  if (world.owner[p] >= 0) return null;              // a thing stands there: that is the object path, not this
  if (world.rubble[p] !== 255) return null;          // already broken open
  const r = world.env.label[p];
  const ramp = world.env.rampOf[r];
  const name = world.env.rampName ? world.env.rampName[ramp] : null;
  const role = world.env.role ? world.env.role[r] : 0;
  const tough = role === 3 ? ENV_TOUGH.pane : ENV_TOUGH[name] ?? 0;
  if (!tough) return null;                           // the sky, and anything the painter did not name
  return { r, p, name, role, tough, hits: world.envHits[r] };
}

/**
 * A hit on the environment. Enough of them break the surface open: a hole is cut where the throw landed, the
 * pieces come off as debris in the surface's own colours, and the hole stays for the rest of the run — a break
 * in this game is permanent (D8), and that goes for the wall as much as for the car.
 */
export function chip(world, x, y, damage = 1, rnd = Math.random) {
  const s = surfaceAt(world, x, y);
  if (!s) return null;
  const OUT = world.palette.length - 2, VOIDP = world.palette.length - 1;
  world.envHits[s.r] += damage;
  const broke = world.envHits[s.r] >= s.tough;
  const debris = [];
  if (!broke) {
    // a chip: the pixels immediately around the impact darken, and a few pieces come off
    for (let dy = -2; dy <= 2; dy += 1) for (let dx = -2; dx <= 2; dx += 1) {
      if (dx * dx + dy * dy > 5) continue;
      const xi = Math.round(x) + dx, yi = Math.round(y) + dy;
      if (xi < 0 || yi < 0 || xi >= world.w || yi >= world.h) continue;
      const p = yi * world.w + xi;
      if (world.env.label[p] !== s.r || world.owner[p] >= 0) continue;
      if (world.idx[p] !== OUT) debris.push({ x: xi, y: yi, c: world.idx[p], floor: yi + 4 });
      world.idx[p] = world.scorch[world.idx[p]];
    }
    return { kind: 'chip', broke: false, points: ENV_HIT_POINTS, debris, name: s.name, hits: world.envHits[s.r], tough: s.tough };
  }
  // broken open: the hole is cut with a ragged edge, the pieces fly, and what is left is the void
  const R = 3 + Math.min(3, damage);
  for (let dy = -R; dy <= R; dy += 1) for (let dx = -R; dx <= R; dx += 1) {
    const d = Math.hypot(dx, dy);
    if (d > R - (rnd() < 0.35 ? 1 : 0)) continue;    // a ragged edge rather than a circle
    const xi = Math.round(x) + dx, yi = Math.round(y) + dy;
    if (xi < 0 || yi < 0 || xi >= world.w || yi >= world.h) continue;
    const p = yi * world.w + xi;
    if (world.env.label[p] !== s.r || world.owner[p] >= 0) continue;
    if (world.idx[p] !== OUT) debris.push({ x: xi, y: yi, c: world.idx[p], floor: yi + 6 + ((dx * 7 + dy * 3) % 5) });
    world.rubble[p] = rnd() < 0.25 ? VOIDP : world.scorch[world.idx[p]];
  }
  world.broken = (world.broken || 0) + 1;
  return { kind: 'chip', broke: true, points: ENV_BREAK_POINTS, debris, name: s.name, hits: world.envHits[s.r], tough: s.tough };
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
    // BROKEN OPEN: ONE TONE DOWN, WITH A HOLE PUNCHED WHERE IT WAS HIT. The thing does not become a black
    // silhouette — it becomes the same thing, darker, with the impact torn out of it and a scatter of missing
    // pixels where the surface gave way. The hole and the pockmarks are written into `rubble`, which is drawn
    // OVER the picture and never cleared, so the damage is permanent (D8) and the rest of the thing still
    // resembles the photograph it came from.
    const every = Math.max(1, Math.ceil(region.area / DEBRIS_MAX));
    const R = Math.max(3, Math.min(9, Math.round(Math.sqrt(region.area) / 3)));
    region.pixels.forEach((p, n) => {
      const px = p % w, py = (p / w) | 0;
      const d = Math.hypot(px - x, py - y);
      if (n % every === 0 && idx[p] !== OUT) debris.push({ x: px, y: py, c: idx[p], floor: floor + ((px * 7 + py * 3) % 5) });
      // the hole and the pockmarks are the VOID or the thing's own colour gone dark — never the ink, which is
      // a line and not a material
      if (d <= R || (px * 3 + py * 5) % 7 === 0) world.rubble[p] = (px * 5 + py * 3) % 5 === 0 ? VOIDP : scorch[idx[p]];
      else idx[p] = world.dent[idx[p]];
    });
    region.gone = true;
    world.broken += 1;
    points = 100 * region.hp * world.combo;
    if (world.broken === world.regions.length) world.done = true;
  } else {
    kind = 'crack';
    // A dent where it landed — one tone down, not to black — and three jagged cracks out of it, drawn into
    // the thing itself. What stays outside the dent is the photograph's own pixel, untouched.
    for (let dy = -4; dy <= 4; dy += 1) for (let dx = -4; dx <= 4; dx += 1) {
      const xi = Math.round(x) + dx, yi = Math.round(y) + dy;
      if (dx * dx + dy * dy > 16 || xi < 0 || yi < 0 || xi >= w || yi >= world.h) continue;
      const p = yi * w + xi;
      if (owner[p] === region.id) idx[p] = world.dent[idx[p]];
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

/**
 * WHAT THE YARD BECAME. The run is not only a score: a yard can be left in ruins, or in flowers, or painted —
 * and those are different things to have done, so they are different things to say and different cards to send.
 * Every number here is something the player did, and none of them can go down (D27).
 */
export function imprint(world) {
  const flowers = world.blooms ? world.blooms.length : 0;
  const paint = world.splats || 0;
  const washed = world.washed || 0;
  const antics = world.antics || 0;
  const holes = (world.broken || 0) + (world.regions ? world.regions.filter((r) => r.gone).length : 0);
  const standing = world.regions ? world.regions.filter((r) => !r.gone).length : 0;
  // Which one the run was ABOUT. Ruins win only when there is more ruin than decoration: a yard with twelve
  // flowers and one broken crate is a yard in flowers, and the title should say so.
  const kind = flowers + paint + washed > holes ? (flowers >= paint && flowers >= washed && flowers > 0 ? 'flowers' : paint >= washed && paint > 0 ? 'paint' : washed > 0 ? 'washed' : 'quiet') : holes > 0 ? 'ruins' : 'quiet';
  return { kind, flowers, paint, washed, antics, holes, standing, words: { ruins: 'РАЗВАЛИНЫ', flowers: 'ЦВЕТЫ', paint: 'КРАСКА', washed: 'ЧИСТОТА', quiet: 'НЕТРОНУТО' }[kind] };
}

export function tick(world, dt) {
  if (!world.done) world.time += dt;
  world.comboLeft = Math.max(0, world.comboLeft - dt);
  if (world.comboLeft === 0) world.combo = 0;
}

export const left = (world) => world.regions.length - world.broken;
