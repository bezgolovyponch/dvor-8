// Everything that makes a hit FEEL like a hit, and nothing that decides whether it was one.
//
// The numbers follow docs/style.md: the game stops for an instant on impact (hit pause), the picture is
// kicked (shake), a break flashes, pieces fly — and what falls STAYS at the foot of the thing it came off,
// so the yard at the end is a record of what was done to it (permanence). The amounts are deliberately
// moderate: the one study found on the question reports that both too little and too much are worse
// (docs/style.md, F15).

export const HIT_PAUSE = 0.03;     // seconds the game holds still on a hit
export const BREAK_PAUSE = 0.09;   // and on a break
export const SHAKE_HIT = 2;        // pixels of kick
export const SHAKE_BREAK = 5;
export const SHAKE_MAX = 7;
export const GRAVITY = 300;        // pixels per second squared
export const HOP_TIME = 0.14;      // seconds for a skipping throw to reach its next target

export function makeFx(world) {
  const cx = world ? world.w / 2 : 0, cy = world ? world.h / 2 : 0;
  return { particles: [], rocks: [], rings: [], shake: 0, freeze: 0, flash: 0, clock: 0, cool: 0, focus: { x: cx, y: cy, tx: cx, ty: cy } };
}

// A throw. `from` is given for a skip from one thing to the next; otherwise it leaves the balcony.
export function throwThing(fx, world, mode, id, tx, ty, region, from = null) {
  fx.rocks.push({
    x0: from ? from.x : world.w / 2, y0: from ? from.y : world.h + 4, tx, ty, t: 0, dur: from ? HOP_TIME : mode.flight,
    kind: id, region, damage: mode.damage, splash: mode.splash, hops: from ? from.hops : mode.chain, touched: from ? from.touched : new Set(),
  });
  if (!from) { fx.rings.push({ x: tx, y: ty, t: 0 }); fx.cool = mode.cooldown; }   // the tap is answered in the same frame
}

export function impact(fx, kind, calm = false) {
  const broke = kind === 'break';
  fx.freeze = Math.max(fx.freeze, broke ? BREAK_PAUSE : HIT_PAUSE);
  fx.flash = Math.max(fx.flash, broke ? 1 : 0.35);
  if (!calm) fx.shake = Math.min(SHAKE_MAX, fx.shake + (broke ? SHAKE_BREAK : SHAKE_HIT));
}

export function burst(fx, debris, ox, oy, rnd, power) {
  for (const d of debris) {
    const a = Math.atan2(d.y - oy, d.x - ox) + (rnd() - 0.5) * 1.2;
    const v = power * (0.35 + rnd());
    fx.particles.push({ x: d.x, y: d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.7, c: d.c, rgb: d.rgb || null, floor: d.floor ?? d.y + 6, life: 2.5 });
  }
}

// Advance by dt. Returns the throws that landed this step. While the game is frozen nothing moves at all.
export function stepFx(fx, world, dt) {
  fx.clock += dt;
  fx.focus.x += (fx.focus.tx - fx.focus.x) * Math.min(1, dt * 12);
  fx.focus.y += (fx.focus.ty - fx.focus.y) * Math.min(1, dt * 12);
  if (fx.freeze > 0) { fx.freeze -= dt; return []; }
  fx.cool = Math.max(0, fx.cool - dt);
  fx.shake *= Math.exp(-9 * dt);
  if (fx.shake < 0.3) fx.shake = 0;
  fx.flash = Math.max(0, fx.flash - dt * 6);
  fx.rings = fx.rings.filter((r) => (r.t += dt) < 0.25);
  const landed = [];
  fx.rocks = fx.rocks.filter((r) => {
    r.t += dt;
    if (r.t < r.dur) return true;
    landed.push(r);
    return false;
  });
  const { w, h, rubble } = world;
  fx.particles = fx.particles.filter((p) => {
    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || p.x < 0 || p.x >= w) return false;
    if (p.vy < 0 || p.y < p.floor) return true;
    const y = Math.min(h - 1, Math.round(p.floor));
    if (!p.rgb) rubble[y * w + (p.x | 0)] = p.c;   // it stays where it fell
    return false;
  });
  return landed;
}

export function shakeOffset(fx) {
  return { x: Math.round(fx.shake * Math.sin(fx.clock * 91)), y: Math.round(fx.shake * Math.cos(fx.clock * 77)) };
}
