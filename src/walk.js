// Down in the yard: someone who walks, jumps, and comes down on things. Pure: no canvas, no keys.
//
// The picture is seen from above and a little to the side, so the walker moves over it in two directions
// (x along the street, y nearer and further) and a jump is a third (z, straight up off the picture). A
// thing still standing is solid at its own pixels: it is walked round, or jumped — and to land ON one is
// to stomp it, which is a hit like any other and throws the walker up again.

// These are in PICTURE pixels, and the picture doubled (view.js): so they doubled, and a walker still crosses
// the yard in the same time, a jump is still the same fraction of the frame, and a thing that is 5 pixels off
// the ground is still clear. The numbers are the old ones times two, which is why they look arbitrary.
export const SPEED = 92;     // pixels per second on foot
export const JUMP = 300;     // speed leaving the ground; with FALL, a jump is about 43 pixels high and 0.6 s long
export const FALL = 1040;
export const BOUNCE = 250;   // speed off a thing that has just been stomped
export const CLEAR = 10;     // higher than this, a thing passes underneath

export function standing(world, x, y) {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= world.w || yi >= world.h) return null;
  const id = world.owner[yi * world.w + xi];
  return id >= 0 && !world.regions[id].gone ? world.regions[id] : null;
}

// What is in the way of a body, or under its feet. A thing on a wall (`flat`: a window) is neither.
export function solid(world, x, y) {
  const r = standing(world, x, y);
  return r && !r.flat ? r : null;
}

// The nearest free spot to (x, y): nobody starts inside a car.
export function freeSpot(world, x, y, top = 0) {
  for (let r = 0; r < 80; r += 2) {
    for (let a = 0; a < 16; a += 1) {
      const px = x + Math.cos((a / 16) * Math.PI * 2) * r, py = y + Math.sin((a / 16) * Math.PI * 2) * r;
      if (px >= 2 && px <= world.w - 3 && py >= top && py <= world.h - 2 && !solid(world, px, py)) return { x: px, y: py };
    }
  }
  return { x, y };
}

export function makeWalker(world, x, y, top = 0) {
  const at = freeSpot(world, x, y, top);
  // `land` counts down over 0.16 s after a jump ends, so the drawing can squash the body and kick up
  // dust. It lives on the walker rather than in the fx pool because it is a property of the body.
  return { x: at.x, y: at.y, z: 0, vz: 0, face: 1, step: 0, t: 0, far: at.x, start: at.x, down: true, land: 0 };
}

// One step of time. `input` is { x, y } in −1…1 and `jump`. `stagger` is extra, unasked-for drift in
// pixels per second (drink.js). Returns what happened: { jumped, landed, stomped: the thing or null,
// blocked: a thing was in the way }.
export function stepWalker(world, me, input, dt, { top = 0, stagger = 0 } = {}) {
  const out = { jumped: false, landed: false, stomped: null, blocked: false };
  me.t += dt;
  if (me.land > 0) me.land = Math.max(0, me.land - dt);
  let vx = input.x, vy = input.y;
  const len = Math.hypot(vx, vy);
  if (len > 1) { vx /= len; vy /= len; }
  const moving = len > 0.15;
  vx = moving ? vx * SPEED : 0; vy = moving ? vy * SPEED * 0.8 : 0;
  if (moving) {
    if (Math.abs(vx) > 4) me.face = vx > 0 ? 1 : -1;
    me.step += dt * 9;
    // the legs do not go quite where they are sent
    vx += stagger * Math.sin(me.t * 2.1); vy += stagger * 0.6 * Math.cos(me.t * 1.3);
  }
  const over = me.z > CLEAR;
  const nx = Math.max(2, Math.min(world.w - 3, me.x + vx * dt));
  if (over || !solid(world, nx, me.y)) me.x = nx; else out.blocked = true;
  const ny = Math.max(top, Math.min(world.h - 2, me.y + vy * dt));
  if (over || !solid(world, me.x, ny)) me.y = ny; else out.blocked = true;
  me.far = Math.max(me.far, me.x);

  if (me.z === 0 && me.vz === 0) {
    if (input.jump) { me.vz = JUMP; out.jumped = true; }
  }
  if (me.vz !== 0 || me.z > 0) {
    me.z += me.vz * dt;
    me.vz -= FALL * dt;
    if (me.z <= 0) {
      me.z = 0; me.vz = 0;
      const under = solid(world, me.x, me.y);
      if (under) { out.stomped = under; me.vz = BOUNCE; me.z = 0.01; } else { out.landed = true; me.land = 0.16; }
    }
  }
  return out;
}

export const walked = (me) => Math.max(0, Math.round((me.far - me.start) / 8));   // metres, at about 8 pixels to one
