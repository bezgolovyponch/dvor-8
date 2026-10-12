// Everything that makes a hit FEEL like a hit, and nothing that decides whether it was one.
//
// The feedback now comes from a SOURCED module rather than invented numbers, after a verification pass
// found the originals had no basis (docs/game-pieces-audit.md §6, docs/style.md):
//
//   SHAKE — Eiserloh, "Juicing Your Cameras With Math", GDC 2016. Verbatim from the deck: "Maintain a
//   'trauma' level in [0,1] · Damage, stress adds trauma (+= 0.2 or 0.5) · Trauma decreases (linearly)
//   over time · Camera shake is trauma² or trauma³". The deck's own worked figures ("Trauma .30, .60, .90
//   means 3%, 22%, 73% shake" = 0.027/0.216/0.729) are the CUBE, though the same bullet names the square,
//   so the cube is the better-evidenced default and is what this file uses. Decay and amplitude follow the
//   reference implementation in Bevy's `2d_screen_shake` example (TRAUMA_DECAY_PER_SECOND 0.5,
//   MAX_TRANSLATION 20, NOISE_SPEED 20), scaled down because our picture is 192 px wide rather than 1280.
//
//   HIT PAUSE — Tomizawa & Ishikawa 2024 (SCITEPRESS) measured hit-stop on players: mean pleasant 0.37 s,
//   mean unpleasant 0.56 s, discriminant boundary x_th = 0.537 s. Lin et al. 2022 (arXiv 2208.06155) found
//   hit stop one of the three strongest drivers of perceived impact, and games without it ranked 39th of
//   44 with players calling them "dull". The pleasant band is a VR/first-person measurement and is 4-10x
//   larger than fighting-game hitlag (Guilty Gear Xrd: 7 frames light, ~10 heavy; Smash: 8-15 frames for a
//   15% hit). Kao 2020's inverted-U still applies, so we move toward the measured band WITHOUT jumping to
//   it: this is a deliberate partial adoption, not a claim that 0.37 s is right for this game.
//
// Everything else in this file remains a CHOICE with no source, and says so where it is defined.
export const HIT_PAUSE = 0.05;     // seconds the game holds still on a hit — raised toward the measured band
export const BREAK_PAUSE = 0.11;   // and on a break, still below the measured unpleasantness boundary
export const SHAKE_HIT = 2;        // pixels of kick, kept as the CEILING for a dent (see FEED)
export const SHAKE_BREAK = 5;
export const SHAKE_MAX = 7;
export const GRAVITY = 300;        // pixels per second squared
export const HOP_TIME = 0.14;      // seconds for a skipping throw to reach its next target

// The trauma model's constants. `TRAUMA_PER_*` are the magnitudes the deck gives (+= 0.2 or 0.5), split
// across our three feedback kinds. Decay is linear in trauma, per the deck.
export const TRAUMA_DENT = 0.3;
export const TRAUMA_CRACK = 0.45;
export const TRAUMA_BREAK = 0.6;
export const TRAUMA_DECAY = 0.5;   // trauma per second
export const TRAUMA_POW = 3;       // the deck's worked figures are the cube
export const SHAKE_ANGLE = 0.012;  // radians at full trauma — 4x smaller than Bevy's 10deg, matching our scale
export const NOISE_SPEED = 20;

export function makeFx(world) {
  const cx = world ? world.w / 2 : 0, cy = world ? world.h / 2 : 0;
  return { particles: [], rocks: [], rings: [], shake: 0, trauma: 0, freeze: 0, flash: 0, clock: 0, cool: 0, focus: { x: cx, y: cy, tx: cx, ty: cy },
    hand: { x: cx, y: world ? world.h + 4 : 0 }, lastRing: 1 };   // where a throw leaves from: the balcony, or the walker
}

// A throw. `from` is given for a skip from one thing to the next; otherwise it leaves the balcony.
export function throwThing(fx, world, mode, id, tx, ty, region, from = null) {
  fx.rocks.push({
    x0: from ? from.x : fx.hand.x, y0: from ? from.y : fx.hand.y, tx, ty, t: 0, dur: from ? HOP_TIME : mode.flight,
    kind: id, region, damage: mode.damage, splash: mode.splash, hops: from ? from.hops : mode.chain, touched: from ? from.touched : new Set(),
  });
  if (!from) { fx.rings.push({ x: tx, y: ty, t: 0, r: fx.lastRing || 1 }); fx.cool = mode.cooldown; }   // the tap is answered in the same frame
}

// Feedback, scaled to what actually happened.
//
// This used to give a dent and a full wreck the same punch. In a game whose whole verb is hitting things,
// that is the most expensive kind of sameness: the player cannot feel progress toward a break, so they
// cannot tell a chip from a finish. The three kinds now differ on every channel at once — freeze, flash,
// shake and ring — and the difference is deliberate rather than decorative:
//
//   dent   a knock. The thing moved; nothing about it changed.
//   crack  it took damage. A brighter flash and a louder ring, because this is the hit that matters.
//   break  it is gone. The only event that earns the full flash and the capped kick.
const FEED = {
  dent:  { pause: HIT_PAUSE,       flash: 0.22, trauma: TRAUMA_DENT,  ring: 0.55 },
  crack: { pause: HIT_PAUSE * 1.6, flash: 0.45, trauma: TRAUMA_CRACK, ring: 0.8 },
  break: { pause: BREAK_PAUSE,     flash: 1,    trauma: TRAUMA_BREAK, ring: 1.25 },
};

/** Peak pixel offset for a trauma level. The one place the exponent is applied. */
// The scale factor is the whole reason this curve is usable: because the response is the CUBE, trauma has
// to sit in the upper half before it is felt at all. Measured: trauma 0.3 -> 0.2 px, 0.45 -> 0.6 px,
// 0.6 -> 1.5 px, 0.9 -> 5.1 px, 1.0 -> 7.0 px. That steepness is the point — it is what makes three
// dents in a row read as a bigger jolt instead of three identical ones.
export const shakeFor = (trauma) => Math.min(SHAKE_MAX, Math.pow(trauma, TRAUMA_POW) * SHAKE_MAX);

export function impact(fx, kind, calm = false) {
  const f = FEED[kind] || FEED.dent;
  fx.freeze = Math.max(fx.freeze, f.pause);
  fx.flash = Math.max(fx.flash, f.flash);
  // Trauma ACCUMULATES, per the deck. Three dents in a row are therefore felt as one bigger jolt rather
  // than as three identical ones, which is what makes a run of hits read as escalation.
  if (!calm) { fx.trauma = Math.min(1, fx.trauma + f.trauma); fx.shake = shakeFor(fx.trauma); }
  fx.lastRing = f.ring;
}

export function burst(fx, debris, ox, oy, rnd, power) {
  for (const d of debris) {
    const a = Math.atan2(d.y - oy, d.x - ox) + (rnd() - 0.5) * 1.2;
    const v = power * (0.35 + rnd());
    // `s` is the drawn size and `spin` the tumble. Two sizes and a spin give the debris pile a texture it
    // otherwise lacks: without them every piece is a 1-px dot travelling in a straight line, which reads
    // as sparks rather than as the thing breaking apart.
    fx.particles.push({
      x: d.x, y: d.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.7,
      c: d.c, rgb: d.rgb || null, floor: d.floor ?? d.y + 6, life: 2.5,
      s: rnd() < 0.35 ? 2 : 1, spin: rnd() < 0.5 ? 0 : (rnd() < 0.5 ? 1 : 2),
    });
  }
}

// Advance by dt. Returns the throws that landed this step. While the game is frozen nothing moves at all.
export function stepFx(fx, world, dt) {
  fx.clock += dt;
  fx.focus.x += (fx.focus.tx - fx.focus.x) * Math.min(1, dt * 12);
  fx.focus.y += (fx.focus.ty - fx.focus.y) * Math.min(1, dt * 12);
  if (fx.freeze > 0) { fx.freeze -= dt; return []; }
  fx.cool = Math.max(0, fx.cool - dt);
  // Trauma decreases LINEARLY over time, per the deck — not exponentially as this file previously did.
  // Linear decay is what gives the jolt a defined end: the shake reaches exactly zero after
  // 1/TRAUMA_DECAY seconds times the trauma added, instead of trailing off asymptotically.
  fx.trauma = Math.max(0, fx.trauma - TRAUMA_DECAY * dt);
  fx.shake = shakeFor(fx.trauma);
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

/**
 * The camera's displacement this frame, from trauma.
 *
 *   shake   = trauma ^ TRAUMA_POW          (the deck's worked figures are the cube)
 *   offset  = MAX * shake * noise(t)
 *
 * `noise` is two sine waves at incommensurable frequencies rather than a random draw. That matters: the
 * GDC deck and Pichlmair & Johansen's survey both warn against random camera movement, because a random
 * per-frame offset reads as a rendering fault while a smooth one reads as force. The two frequencies are
 * deliberately not integer-related, so the path never repeats visibly. `fx.shake` is kept as the peak
 * pixel offset so existing callers and tests still read a number in pixels.
 */
export function shakeOffset(fx) {
  const t = fx.clock * NOISE_SPEED;
  const amp = fx.shake;                                   // already trauma^POW * max, in pixels
  return {
    x: Math.round(amp * Math.sin(t)),
    y: Math.round(amp * Math.cos(t * 1.37)),
    angle: +(amp / SHAKE_MAX) * SHAKE_ANGLE * Math.sin(t * 0.83),   // the lean rides the same trauma
  };
}
