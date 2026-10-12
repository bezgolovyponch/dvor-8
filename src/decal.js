// A splat that stays where it landed. Throw a coloured ball at a wall and the colour is still there tomorrow.
//
// WHAT THIS IS, AND WHAT IT IS NOT
// --------------------------------
// The established technique for putting a mark on a surface you have already drawn is a DECAL — a projected
// patch with its own texture and opacity, composited over the surface. Engines implement it in the graphics
// pipeline (Unreal's deferred decal, Unity's Decal Projector), and none of that machinery exists or is needed
// at 192x256 in canvas 2D.
//
// What is taken from those engines is their PARAMETER SET, which is the part that is actually a design
// decision rather than a rendering trick. Unity's Decal Projector reference documents, verbatim: Width ("the
// projector scales the decal to match this value along the local X axis"), Height, Projection Depth, Pivot,
// Tiling, Offset, **Opacity** ("A value of 0 makes the decal fully transparent, a value of 1 makes the decal
// as opaque as defined by the Material"), Draw Distance, and **Start Fade** ("Values from 0 to 1 represent a
// fraction of the Draw Distance. With a value of 0.9, Unity starts fading the decal out at 90% of the Draw
// Distance and finishes fading it out at the Draw Distance").
//
// So a splat here is: position, width, height, rotation, opacity, colour, and a fade that begins past a
// draw distance. Those are the fields below, and they are Unity's, not invented.
//
// THE SIMULATION IS DELIBERATELY ABSENT. "Computer-Generated Watercolor" (Curtis, Anderson, Seims, Fleischer
// & Salesin, SIGGRAPH 1997) models paint as three layers, and the middle one is the whole idea:
//   "The shallow-water layer - where water and pigment flow above the surface of the paper. /
//    The pigment-deposition layer - where pigment is deposited onto ('adsorbed by') and lifted ('desorbed')
//    from the paper."
// A thrown ball of paint deposits and stops. It does not flow, so the shallow-water layer is not simulated
// and neither is the capillary layer. Stam's Stable Fluids (SIGGRAPH 1999) is real and would make the paint
// spread, and it is the wrong tool: it is a per-frame grid solver, and what is wanted here is a STAIN.
//
// WHERE THE SPLAT GOES AND WHAT SHAPE IT IS. Lee, Olsen & Gooch, "Interactive 3D Fluid Jet Painting" (2006),
// describe "an algorithm for generating the splatter patterns created by the impacts of a high-speed fluid
// drops", and give a shape measure rather than a size: box counting where "the largest Li is half the length
// of the shorter side of the image, and the smallest is 2 pixels", with the slope of log(Li) against
// log(Num(Li)) giving the fractal dimension. That is used here as the test for whether a splat looks like
// splatter — a round blob is not one, and a splat whose box-count slope is near 2 is a filled disc rather
// than a spray.

import { mulberry32 } from './rng.js';

// The most splats a yard will ever hold. A wall that accumulates marks uses a FIXED pool, the same bounded
// design the Source engine uses for staged glass cracks: the oldest is retired when the pool is full, so a
// long session cannot grow the per-frame cost. Unreal's decal documentation warns about the same thing from
// the other side — "Setting too many sort values on too many different decals prevents those decals from
// being sorted via state, which can harm performance."
export const DECAL_MAX = 96;

// The colours that can be thrown. Named, because a colour the player cannot ask for by name is a colour they
// will not notice they have.
export const PAINTS = [
  { name: 'красный', rgb: [214, 40, 57] },
  { name: 'синий', rgb: [43, 92, 214] },
  { name: 'жёлтый', rgb: [240, 196, 32] },
  { name: 'зелёный', rgb: [46, 160, 67] },
  { name: 'белый', rgb: [236, 232, 222] },
  { name: 'фиолетовый', rgb: [130, 56, 190] },
];

export function makeDecals() {
  return { list: [], next: 0, seed: 1 };
}

/**
 * Stamp a splat. `rnd` is passed in so a yard replays identically — the rule the whole project is held to.
 *
 * The shape is built the way Lee et al. describe splatter: a core where the ball actually struck, plus
 * discrete droplets thrown outward. The droplet count and reach come from the impact's own energy rather
 * than from a constant, so a hard throw sprays and a soft one does not.
 */
export function stamp(decals, x, y, { paint = 0, power = 1, rnd = mulberry32(1) } = {}) {
  const d = {
    x, y,
    w: Math.round(3 + 5 * power),          // Unity's Width, scaled by how hard it hit
    h: Math.round(3 + 5 * power),
    rot: rnd() * Math.PI,
    opacity: 0.55 + 0.35 * Math.min(1, power),   // Unity's Opacity
    paint,
    age: 0,
    drops: [],
  };
  // Ejection cone: Reeves 1983 gives a particle system an "'ejection' angle, which is another parameter".
  // The droplets are thrown outward from the impact in all directions with a downward bias, because a wall
  // splat runs down more than it runs up.
  const n = Math.round(3 + 7 * power);
  for (let i = 0; i < n; i += 1) {
    const a = rnd() * Math.PI * 2;
    // The reach starts at the core's own edge. Measured: with drops thrown from the centre and reaching
    // at most 4.8 pixels, every one of them fell inside a core 8 pixels across and the splat was a disc.
    const reach = d.w / 2 + (0.5 + rnd() * 3.5) * power;
    d.drops.push({
      x: Math.round(Math.cos(a) * reach),
      y: Math.round(Math.sin(a) * reach * 0.8 + reach * 0.35),   // gravity's bias, not a simulation
      r: rnd() < 0.3 ? 1 : 0,
    });
  }
  if (decals.list.length >= DECAL_MAX) {
    // retire the oldest rather than grow: the pool is the budget
    decals.list[decals.next] = d;
    decals.next = (decals.next + 1) % DECAL_MAX;
  } else {
    decals.list.push(d);
  }
  return d;
}

/** Every pixel a splat claims, as {x, y, r} in world coordinates. Pure, so a test can ask what it covers. */
export function pixelsOf(d) {
  const out = [];
  const x0 = Math.round(d.x - d.w / 2), y0 = Math.round(d.y - d.h / 2);
  for (let yy = 0; yy < d.h; yy += 1) for (let xx = 0; xx < d.w; xx += 1) {
    // an ellipse, not a rectangle: paint does not land in a box
    const u = (xx + 0.5) / d.w * 2 - 1, v = (yy + 0.5) / d.h * 2 - 1;
    if (u * u + v * v <= 1) out.push({ x: x0 + xx, y: y0 + yy, r: 0 });
  }
  for (const dr of d.drops) out.push({ x: Math.round(d.x) + dr.x, y: Math.round(d.y) + dr.y, r: dr.r });
  return out;
}

export const step = (decals, dt) => {
  for (const d of decals.list) d.age += dt;
};

export const clear = (decals) => {
  decals.list.length = 0;
  decals.next = 0;
};

// How strongly a splat covers what is under it, for the renderer: Unity's Opacity, one value for the layer
// because at 192 pixels a per-splat opacity is not a difference anyone can see.
export const COVER = 0.72;

/**
 * Write every splat into the layer the renderer reads: one byte a pixel, 0 for bare and the paint's number
 * plus one otherwise. The layer is rebuilt from the list rather than drawn into, so a splat retired from the
 * pool really leaves the wall, and a later splat lies over an earlier one.
 */
export function lay(decals, layer, w, h) {
  layer.fill(0);
  const order = decals.list.length >= DECAL_MAX ? [...decals.list.slice(decals.next), ...decals.list.slice(0, decals.next)] : decals.list;
  for (const d of order) {
    for (const p of pixelsOf(d)) {
      for (let dy = 0; dy <= p.r; dy += 1) for (let dx = 0; dx <= p.r; dx += 1) {
        const x = p.x + dx, y = p.y + dy;
        if (x >= 0 && y >= 0 && x < w && y < h) layer[y * w + x] = d.paint + 1;
      }
    }
  }
  return layer;
}
