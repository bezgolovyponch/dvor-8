// Everything that makes a hit FEEL like a hit, and nothing that decides whether it was one.
//
// The numbers follow docs/style.md: the game stops for an instant on impact (hit pause), the picture is
// kicked (shake), a break flashes, pieces fly — and what falls STAYS, piling up along the bottom of the
// yard, so the picture at the end is a record of what was done to it (permanence).

export const ROCK_TIME = 0.11;     // seconds from tap to impact: fast enough to feel like the tap did it
export const HIT_PAUSE = 0.03;     // seconds the game holds still on a hit
export const BREAK_PAUSE = 0.09;   // and on a break
export const SHAKE_HIT = 2;        // pixels of kick
export const SHAKE_BREAK = 5;
export const SHAKE_MAX = 7;
export const GRAVITY = 260;        // pixels per second squared
export const RUBBLE_MAX = 9;       // how high rubble may pile in one column before pieces just vanish

export function makeFx() {
  return { particles: [], rocks: [], rings: [], shake: 0, freeze: 0, flash: 0, clock: 0 };
}

export function throwRock(fx, world, tx, ty, region) {
  fx.rocks.push({ x0: world.w / 2, y0: world.h + 3, tx, ty, t: 0, region });
  fx.rings.push({ x: tx, y: ty, t: 0 });   // the tap is answered in the same frame, before the rock lands
}

export function impact(fx, kind, calm = false) {
  const broke = kind === 'break';
  fx.freeze = broke ? BREAK_PAUSE : HIT_PAUSE;
  fx.flash = broke ? 1 : 0.35;
  if (!calm) fx.shake = Math.min(SHAKE_MAX, fx.shake + (broke ? SHAKE_BREAK : SHAKE_HIT));
}

export function burst(fx, debris, ox, oy, rnd, power) {
  for (const d of debris) {
    const a = Math.atan2(d.y - oy, d.x - ox) + (rnd() - 0.5) * 1.2;
    const v = power * (0.35 + rnd());
    fx.particles.push({ x: d.x, y: d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.6, c: d.c, life: 3 });
  }
}

// Advance by dt. Returns the rocks that landed this step. While the game is frozen nothing moves at all.
export function stepFx(fx, world, dt) {
  fx.clock += dt;
  if (fx.freeze > 0) { fx.freeze -= dt; return []; }
  fx.shake *= Math.exp(-9 * dt);
  if (fx.shake < 0.3) fx.shake = 0;
  fx.flash = Math.max(0, fx.flash - dt * 6);
  fx.rings = fx.rings.filter((r) => (r.t += dt) < 0.25);
  const landed = [];
  fx.rocks = fx.rocks.filter((r) => {
    r.t += dt;
    if (r.t < ROCK_TIME) return true;
    landed.push(r);
    return false;
  });
  const { w, h, rubble, heights } = world;
  fx.particles = fx.particles.filter((p) => {
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < 0 || p.x >= w) return false;
    const col = p.x | 0, floor = h - 1 - heights[col];
    if (p.y < floor) return true;
    if (heights[col] < RUBBLE_MAX) { rubble[floor * w + col] = p.c; heights[col] += 1; }
    return false;
  });
  return landed;
}

export function shakeOffset(fx) {
  return { x: Math.round(fx.shake * Math.sin(fx.clock * 91)), y: Math.round(fx.shake * Math.cos(fx.clock * 77)) };
}
