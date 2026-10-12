// Debris, dust, shards and paint droplets, spawned by the convention the original particle-systems paper
// established — and fed into the particle system the game already has, rather than a second one beside it.
//
// WHY THE CONVENTION AND NOT AN INVENTED ONE
// ------------------------------------------
// William T. Reeves, "Particle Systems - A Technique for Modeling a Class of Fuzzy Objects", ACM Transactions
// on Graphics 2(2), April 1983, defines a particle system by means and variances, and the formula is the whole
// specification, verbatim:
//
//   "InitialSpeed = MeanSpeed + Rand( ) x VarSpeed, where MeanSpeed and VarSpeed are two other parameters of
//    the particle system, the mean speed and its variance."
//
//   "To determine a particle's initial color, a particle system is given an average color, and the maximum
//    deviation from that color."
//
//   generation shapes are "sphere, circle, rectangle" with an "'ejection' angle, which is another parameter";
//   "the gravity parameter pulled them back down"; "Particles were killed when their lifetime expired, when
//   their intensity fell below the minimum intensity parameter".
//
// The per-particle attribute list it prints is "initial position, initial velocity, initial size, initial
// color, initial transparency, shape, lifetime" — which is the shape of a particle here.
//
// The companion paper fixes the sign convention this file uses. Reeves & Blau, "Approximate and Probabilistic
// Algorithms for Shading and Rendering Structured Particle Systems" (SIGGRAPH 1985), verbatim:
//
//   "Height = MeanHeight + Rand() X DeltaHeight where Rand() is a procedure returning a pseudo-random number
//    uniformly distributed between -1.0 and +1.0."
//
// So `rand()` below returns [-1, 1] and every quantity is `mean + rand() * delta`. That is deliberate: it is
// the published convention, it makes every spawner in the game read the same way, and widening a burst is then
// one number rather than a rewritten formula.
//
// There is no "texas" particle approach in either paper. The real term is STRUCTURED PARTICLE SYSTEMS.
//
// THE BUDGET, MEASURED RATHER THAN GUESSED
// ----------------------------------------
// The only source found printing particle count against measured frame rate on named hardware is a 2014 TU
// Wien bachelor's thesis on a WebGL PIC simulation (Weydemann). Its method, verbatim: "FPS were measured by
// monitoring them over the span of 10 seconds and noting minimum and maximum with constant steps per frame",
// and "The FPS are influenced chiefly by the number of particles." Its numbers, Canvas 2D:
//
//   Intel Core i3 M370 / GeForce 310 :  N=100 -> 35 FPS,  N=1000 -> 3 FPS,  N=10000 -> failed
//   Intel Core i5 4200H / GTX 760M   :  N=100 -> >60 FPS, N=1000 -> 7 FPS,  N=10000 -> 1 FPS
//
// Those prototypes also ran per-particle physics, so they are a conservative floor rather than a rendering
// budget, and the author notes "FPS values above 60 were cut off". The honest planning figure is HUNDREDS of
// live particles, not thousands. MDN's "Optimizing canvas" gives the reason to keep the count low instead of
// optimising the draw: "Avoid floating-point coordinates and use integers instead ... This forces the browser
// to do extra calculations to create the anti-aliasing effect", and "Pre-render similar primitives or
// repeating objects on an offscreen canvas."
//
// HOW MUCH FEEDBACK. Pichlmair & Johansen, "Designing Game Feel. A Survey" (IEEE Transactions on Games 2021),
// relays the one large-scale measurement of feedback quantity: juice "has to be applied adequately to the
// situation", and "medium and high levels of juiciness outperformed extreme levels and the absence of
// juiciness across the measures of player experience, intrinsic motivation, play time, and in-game
// performance." Their own reading of "Juicing" is that it "results in empowerment and provides clarity of
// feedback by communicating the importance of game events". So the presets below are graded by what happened
// and none of them is maximal.

import { mulberry32 } from './rng.js';

// Hundreds, not thousands. The cap is on the WHOLE live population, so two bursts in the same frame cannot
// together exceed it; a long session cannot grow the per-frame cost.
export const MAX_LIVE = 220;

const rand = (rnd) => rnd() * 2 - 1;   // [-1, 1], Reeves & Blau's convention
const GREY = '#b9b3c4';

/**
 * Spawn into the existing particle system.
 *
 * `fx.particles` is the game's single particle list, already stepped with gravity, already settling colour
 * into the rubble buffer when a particle comes to rest, already bounded by the renderer. Adding a second list
 * would mean two sets of physics that could disagree, so there is one.
 *
 * `spec` is a mean/delta pair per attribute, named as the 1983 paper names them.
 */
export function spawn(fx, x, y, spec, rnd = mulberry32(1)) {
  const {
    count = 8, countVar = 3,
    speed = 40, speedVar = 20,
    angle = -Math.PI / 2, cone = Math.PI * 2,
    size = 1, sizeVar = 0,
    life = 0.6, lifeVar = 0.25,
    colours = null,        // palette indices to draw from
    rgb = null,            // or one fixed colour, as CSS; with neither, it is grey
    settle = true,
  } = spec;

  const n = Math.max(0, Math.round(count + rand(rnd) * countVar));
  const room = Math.max(0, MAX_LIVE - fx.particles.length);
  let made = 0;
  for (let i = 0; i < Math.min(n, room); i += 1) {
    const a = angle + (rand(rnd) * cone) / 2;
    const v = Math.max(0, speed + rand(rnd) * speedVar);
    const px = Math.round(x + rand(rnd) * 2);
    const py = Math.round(y + rand(rnd) * 2);
    fx.particles.push({
      x: px, y: py,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      s: Math.max(0, Math.round(size + rand(rnd) * sizeVar)),
      c: colours && colours.length ? colours[Math.min(colours.length - 1, Math.floor(rnd() * colours.length))] : 0,
      rgb: rgb || (colours && colours.length ? null : GREY),
      t: 0,
      life: Math.max(0.05, life + rand(rnd) * lifeVar),
      // A particle with a colour of its own (rgb) never settles into the rubble: the rubble holds palette
      // indices. One that must not settle gets a floor far below, and its lifetime ends it instead.
      floor: settle ? y + 40 : 1e6,
    });
    made += 1;
  }
  return made;
}

/**
 * Throw a set of pixels as ONE piece: every pixel gets the same velocity, so a shard of glass leaves the frame
 * as a shard and not as a cloud. `pixels` are { x, y, rgb }. Bounded by the same population cap as `spawn`:
 * when there is no room for the whole piece, every n-th pixel of it is thrown, so it keeps its outline.
 */
export function fling(fx, pixels, vx, vy, life = 0.9) {
  const room = Math.max(0, MAX_LIVE - fx.particles.length);
  if (!room || !pixels.length) return 0;
  const every = Math.max(1, Math.ceil(pixels.length / room));
  let made = 0;
  for (let i = 0; i < pixels.length; i += every) {
    const p = pixels[i];
    fx.particles.push({ x: p.x, y: p.y, vx, vy, s: 1, c: 0, rgb: p.rgb, t: 0, life, floor: 1e6 });
    made += 1;
  }
  return made;
}

/**
 * The presets the game uses, each stating its numbers in one place.
 *
 * All five go through the same `spawn`, so they cannot drift apart in behaviour — the only differences are the
 * means, which is exactly the 1983 model. Glass is sharp and fast and stops quickly; dust drifts and lasts;
 * paint droplets are fast and small; a miss is a small pale puff; a shard burst off a heavy thing is wider than off a light one.
 */
export const PRESETS = {
  shard: { count: 10, countVar: 4, speed: 74, speedVar: 34, cone: Math.PI * 1.5, size: 1, sizeVar: 1, life: 0.85, lifeVar: 0.30 },
  dust: { count: 6, countVar: 3, speed: 15, speedVar: 8, cone: Math.PI, size: 0, sizeVar: 0, life: 1.15, lifeVar: 0.35 },
  paint: { count: 9, countVar: 4, speed: 58, speedVar: 26, cone: Math.PI * 0.8, size: 0, sizeVar: 1, life: 0.50, lifeVar: 0.20 },
  puff: { count: 5, countVar: 1, speed: 24, speedVar: 10, cone: Math.PI, size: 1, sizeVar: 0, life: 0.35, lifeVar: 0.10, rgb: '#e8e4f0', settle: false },
  chip: { count: 5, countVar: 2, speed: 46, speedVar: 20, cone: Math.PI * 1.2, size: 1, sizeVar: 0, life: 0.65, lifeVar: 0.25 },
};
