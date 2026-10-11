// The yard, generated from a seed.
//
// Deterministic on purpose: the same seed always produces the same yard, so a test can assert what is in it
// and a bug can be reproduced. Nothing here is random at call time — `mulberry32` is a seeded generator,
// and every position, kind and layer comes from it in a fixed order.
//
// This is the MVP's stand-in for the camera scan. The real scan will look at a photograph and identify what
// is in it; until then the yard is generated, and the module that will be replaced is this one alone.

import { KINDS, makeWorld } from './state.js';

// A small seeded generator. Not cryptographic, not shared: one yard, one stream.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(text) {
  let h = 2166136261;
  for (const ch of String(text)) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The world is 640 units wide — two screens, which is why the camera scrolls — and exactly one view tall.
// One world unit is one canvas pixel, and `y` is an object's TOP edge.
//
// It was 360 tall while the canvas was 180 and nothing converted between them, so the whole gameplay layer
// was placed below the bottom of the picture: scanned, counted, and never seen or hittable. A test now
// asserts that every object is inside the view and above the rail.
export const WORLD_W = 640;
export const WORLD_H = 180;
export const RAIL_H = 14;                 // the balcony rail covers the bottom of the view
export const GROUND = WORLD_H - RAIL_H;   // nothing may reach below this

// How many of each thing a yard holds. The counts are part of the seed's behaviour, not taste: a test can
// assert that a yard of this size has at least this many breakable objects, which is what makes it playable.
const PLAN = [
  { kind: 'bin', layer: 'yard', count: 3 },
  { kind: 'crate', layer: 'yard', count: 2 },
  { kind: 'bench', layer: 'yard', count: 2 },
  { kind: 'bush', layer: 'yard', count: 3 },
  { kind: 'puddle', layer: 'yard', count: 2 },
  { kind: 'pram', layer: 'yard', count: 1 },
  { kind: 'scooter', layer: 'yard', count: 2 },
  { kind: 'sign', layer: 'yard', count: 1 },
  { kind: 'window', layer: 'mid', count: 8 },
  { kind: 'roof', layer: 'mid', count: 3 },
  { kind: 'tree', layer: 'near', count: 3 },
  { kind: 'pipe', layer: 'near', count: 2 },
];

export function buildYard(seed = 'двор-1') {
  const world = makeWorld(seed);
  const rnd = mulberry32(hashSeed(seed));
  let n = 0;

  for (const row of PLAN) {
    for (let i = 0; i < row.count; i += 1) {
      const kind = KINDS[row.kind];
      // Mid and near things sit higher on the screen, because they are further away: the yard occupies the
      // bottom half, roofs the middle band, and the windows above them.
      const band = row.layer === 'yard' ? [WORLD_H * 0.52, GROUND]
        : row.layer === 'mid' ? [WORLD_H * 0.30, WORLD_H * 0.58]
          : [WORLD_H * 0.2, WORLD_H * 0.62];
      n += 1;
      world.objects.push({
        id: `${row.kind}-${i + 1}`,
        kind: row.kind,
        layer: row.layer,
        x: Math.round(band[0] * 0 + rnd() * (WORLD_W - kind.w - 20) + 10),
        y: Math.round(band[0] + rnd() * Math.max(0, band[1] - kind.h - band[0])),   // the whole height stays in its band
        w: kind.w,
        h: kind.h,
        hits: 0,
        gone: false,
        scanned: false,
      });
    }
  }
  // Sorted by layer depth so a renderer can walk them in order without knowing the layers.
  const order = { sky: 0, far: 1, mid: 2, near: 3, yard: 4 };
  world.objects.sort((a, b) => (order[a.layer] - order[b.layer]) || (a.y - b.y));
  return world;
}

// What the scan has found so far, and what is left. The interface reads this; nothing else computes it.
export function yardSummary(world) {
  const total = world.objects.length;
  const scanned = world.objects.filter((o) => o.scanned).length;
  const broken = world.objects.filter((o) => o.gone).length;
  const breakable = world.objects.filter((o) => !o.gone).length;
  return { total, scanned, broken, breakable, rocks: world.inventory.rocks };
}
