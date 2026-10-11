// Throwing. One rock, one arc, one hit.
//
// Kept deliberately plain: the brief says "really not violent style, simple". A rock knocks a thing over;
// nothing bleeds, nothing shouts, and there is no damage number. An object takes a set number of hits and
// then it is gone, which is the whole of the destruction system.

import { spendRock, hitObject } from './state.js';

export const THROW_SPEED = 240;     // world units per second

export function makeEffect() {
  return { rocks: [], scanY: null };
}

// A throw starts at the balcony (bottom left of the view) and travels toward a target.
export function throwAt(effect, world, targetX, targetY) {
  if (!spendRock(world)) return { thrown: false, reason: 'камни кончились' };
  effect.rocks.push({ x: 14, y: 150, vx: (targetX - 14) * 1.6, vy: (targetY - 150) * 1.6, life: 1.2, tx: targetX, ty: targetY });
  return { thrown: true };
}

// Advance every rock in flight. A rock that reaches its target's column resolves against the nearest
// object there, so a hit is decided by WHERE the throw was aimed rather than by pixel overlap.
export function stepEffect(effect, world, dt, onHit) {
  const landed = [];
  effect.rocks = effect.rocks.filter((r) => {
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.vy += 90 * dt;                 // a little gravity, so the arc reads as an arc
    r.life -= dt;
    const close = Math.abs(r.x - r.tx) < 6 && r.y >= r.ty - 20;
    if (close || r.life <= 0 || r.x > 640 || r.y > 200) {
      // What is AT the aim point wins. A rectangle test, because aiming must mean what it looks like:
      // a wide roof's centre used to out-compete the small object the player was pointing at.
      let best = null, bestD = 1e9;
      for (const o of world.objects) {
        if (o.gone) continue;
        const inside = r.tx >= o.x && r.tx <= o.x + o.w && r.ty >= o.y - 6 && r.ty <= o.y + o.h + 10;
        if (inside) { best = o; bestD = 0; break; }
      }
      // A near miss falls back to the closest thing, so a throw is not wasted by a few units.
      if (!best) {
        for (const o of world.objects) {
          if (o.gone) continue;
          const cx = Math.max(o.x, Math.min(r.tx, o.x + o.w));
          const cy = Math.max(o.y, Math.min(r.ty, o.y + o.h));
          const d = Math.hypot(cx - r.tx, cy - r.ty);
          if (d < bestD) { bestD = d; best = o; }
        }
      }
      if (best && bestD < 12) {
        const res = hitObject(world, best.id);
        landed.push({ target: best, ...res });
        onHit?.(best, res);
      } else {
        landed.push({ target: null, hit: false, reason: 'мимо' });
      }
      return false;
    }
    return true;
  });
  return landed;
}
