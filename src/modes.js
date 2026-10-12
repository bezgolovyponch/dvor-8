// The four ways of SEEING the yard. Each is a look: how much of the yard is sharp, and how the view leans.
//
// WHAT CHANGED, AND WHY. These used to carry what is in your hand as well, which coupled two unrelated
// decisions — a player who wanted a wide splash had to accept a wandering hand. The hand is now its own
// choice (src/throwables.js) and this file is only about the eyes. The flight, damage, scatter, splash,
// chain and cooldown fields that used to live here are read from the throwable instead.
//
// The rule this file is held to (docs/concept.md, "nothing in vain"): a mode that only recoloured the
// picture was a decoration, and was reported as "the filters don't change anything". Every mode here must
// differ from sober in what you throw AND in what you can focus on, and must say why it exists.
//
//   flight    seconds from tap to impact         damage   hits dealt on impact
//   scatter   how far the aim strays, pixels     splash   radius of things struck around the impact, pixels
//   chain     how many more things it skips to   cooldown seconds before the next throw
//   combo     seconds a combo stays alive
//   focus     null = everything sharp. radius is a share of the picture's short side; outside it the yard
//             is 'soft' (out of focus) or 'dark'. radius 0 = nothing is in focus.

export const MODES = {
  sober: {
    label: 'трезвый', thing: 'камень', hint: 'точно и быстро',
    flight: 0.11, damage: 1, scatter: 0, splash: 0, chain: 0, cooldown: 0, combo: 2.5, focus: null,
    why: 'The baseline: what you tap is what you hit. Every other mode is felt as a departure from this one.',
  },
  weed: {
    label: 'трава', thing: 'тапок', hint: 'летит не спеша и скачет по соседям · комбо держится дольше',
    flight: 0.34, damage: 1, scatter: 0, splash: 0, chain: 2, cooldown: 0, combo: 5, focus: { radius: 0.42, out: 'soft' },
    why: 'Slow and generous: one lazy throw can touch three things, and a combo forgives a long pause. For lining things up.',
  },
  alcohol: {
    label: 'алкоголь', thing: 'бутылка', hint: 'бьёт всё вокруг, но рука гуляет · глоток — шире взрыв, хуже рука · пустую бросай',
    flight: 0.16, damage: 1, scatter: 10, splash: 22, chain: 0, cooldown: 0, combo: 2.5, focus: { radius: 0, out: 'soft' },
    why: 'Power for accuracy: the bottle bursts over everything near where it lands, and it does not land where you pointed.',
  },
  depression: {
    label: 'депрессия', thing: 'кирпич', hint: 'ломает с одного раза · тяжёлый · видно только там, куда смотришь',
    flight: 0.30, damage: 3, scatter: 0, splash: 0, chain: 0, cooldown: 0.7, combo: 2.5, focus: { radius: 0.20, out: 'dark' },
    why: 'Narrow and heavy: you see one small patch at a time and must look for things, and each throw is slow and final.',
  },
};
export const CHAIN_RANGE = 80;   // how far a skipping thing will reach for its next target, pixels

const gap = (r, x, y) => Math.hypot(Math.max(r.x - x, 0, x - (r.x + r.w)), Math.max(r.y - y, 0, y - (r.y + r.h)));

// Everything standing within `radius` of a point, nearest first.
export function splashTargets(world, x, y, radius) {
  return world.regions.filter((r) => !r.gone && gap(r, x, y) <= radius).sort((a, b) => gap(a, x, y) - gap(b, x, y));
}

// The next thing a skipping throw reaches for: the nearest one standing that it has not touched yet.
export function chainNext(world, from, touched, range = CHAIN_RANGE) {
  let best = null, bestD = range;
  for (const r of world.regions) {
    if (r.gone || touched.has(r.id)) continue;
    const d = Math.hypot(r.cx - from.cx, r.cy - from.cy);
    if (d < bestD) { best = r; bestD = d; }
  }
  return best;
}

// Whether a thing can be seen clearly through this mode's focus, with the eye at (fx, fy).
export function inFocus(mode, world, region, fx, fy) {
  if (!mode.focus) return true;
  return Math.hypot(region.cx - fx, region.cy - fy) <= mode.focus.radius * Math.min(world.sw ?? world.w, world.h) * 1.15;
}
