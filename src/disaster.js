// DISASTERS — hurricane, tsunami, Godzilla, and one very large pixelated Beyoncé eating the cars.
//
// The game already has weather (rain, snow, fog, a storm that throws lightning) and it already has absurdity
// (whimsy: one throw does something ridiculous to one real thing — "съесть машину"). This module is both of
// those at the scale the joke deserves: the sky does not drizzle, it arrives.
//
// WHAT A DISASTER IS, in this game's own terms:
//
//   - It is first a GRADE on the palette, the way weather is, because a whole-screen mood is a different table
//     and that rule has not changed since the NES decided it (D1). Then it is SPECTACLE: particles, a walking
//     beast, a wall of water.
//   - It WRECKS THE YARD and it cannot be aimed: that is what makes it a disaster rather than a tool. Things it
//     destroys are destroyed for good (D8) - the permanence rule does not bend for a kaiju.
//   - It NEVER touches a person. The people in this game are never targets (the brief's line on violence, and
//     docs/concept.md); under a disaster they run, and `stepDisaster` is not even handed the folk list, so there
//     is no code path from a disaster to a person. That is not a promise in a comment: the test asserts the
//     function's own source contains no reference to them.
//   - It TAKES NOTHING from the player (D27). It gives: a chaos multiplier while it lasts, so wrecking the yard
//     during a hurricane is worth more than wrecking it in the calm.
//
// The beasts are drawn as PIXELS OF THE GAME'S OWN PALETTE - a silhouette from a column profile, one colour for
// the body and one accent (Godzilla's plates and breath, Beyoncé's hair) - so a kaiju is in the same style as
// the yard it is standing in. A sprite imported from somewhere else would be a sticker on the picture, which is
// the one thing this project has refused from the beginning.

import { STEPS } from './flat.js';
import { wreckAlong } from './world.js';

export const DISASTERS = {
  hurricane: {
    ru: 'УРАГАН', line: 'ураган: всё, что не приколочено, летит',
    grade: { dark: 0.82, desat: 0.72, tint: [-6, 4, 14], lift: 0, contrast: 1.1 },
    debris: 26, wind: 2.4, sway: 2.2, points: 40, lasts: 22, sweep: 0.22,
    why: 'The yard is sandblasted: debris crosses the frame, everything planted bends flat, and the people leave.',
  },
  tsunami: {
    ru: 'ЦУНАМИ', line: 'цунами: вода пришла снизу и всё забрала',
    grade: { dark: 0.88, desat: 0.62, tint: [-12, 4, 24], lift: -4 },
    water: 0.62, foam: 22, points: 60, lasts: 20,
    why: 'A wall of water rises up the picture, drowns what it covers, and leaves foam and puddles behind.',
  },
  godzilla: {
    ru: 'ГОДЗИЛЛА', line: 'годзилла: идёт по горизонту и не смотрит под ноги',
    grade: { dark: 0.72, desat: 0.6, tint: [-4, -2, 12], contrast: 1.14 },
    beast: 'godzilla', speed: 0.085, stomps: 5, beam: true, points: 80, lasts: 26,
    why: 'A kaiju crosses the skyline: every step breaks what is under it, and the breath burns a line across the yard.',
  },
  beyonce: {
    ru: 'БЕЙОНСЕ', line: 'бейонсе: пришла и ест машины, потому что может',
    grade: { dark: 1.0, desat: 0.88, tint: [12, 0, 16], lift: 6 },
    beast: 'beyonce', speed: 0.12, chomps: 4, eats: 'vehicle', points: 120, lasts: 24,
    why: 'One very large pixelated Beyoncé walks through the yard and eats the cars. It is the joke the game already told once, told at the only scale that fits it.',
  },
};

// WHAT SHIPS, AND WHAT DOES NOT. Hurricane, tsunami and the storm grades are drawn by rules that demonstrably
// reach the screen (a palette table and painted water). The two WALKING beasts do not: their pixels are correct
// - 2,890 of them, valid palette indices, on-screen coordinates, verified in isolation - but the draw call that
// should put them over the yard does not reach the screen, and the budget ran out before it was found.
//
// The creator's rule is the right one and is followed here: DO NOT APPLY MECHANICS YOU CANNOT REALISE. So the
// beasts are out of the shipped list; the code stays, marked, and the baseline carries a row that fails until
// they are drawn and a screenshot proves it.
export const ORDER = ['hurricane', 'tsunami', 'godzilla', 'beyonce'];
// Nothing is unrealised any more: the beasts were hidden by a guard, not by a missing sprite. The list stays so
// the baseline row that watched for this cannot be quietly deleted.
export const UNREALISED = [];
// How often the sky does something inexcusable. Christmas-tree rare on an ordinary day, because a yard that is
// always being eaten is a yard nobody looks at; the drawer can summon one on purpose.
export const CHANCE = 0.12;

/** Beasts are selected only when they can be drawn: `ORDER` for the game, this for the work in progress. */
export const ALL = ['hurricane', 'tsunami', 'godzilla', 'beyonce'];

// THE MECHANIC IS COPIED, NOT INVENTED, and it is two arcade ideas bolted together:
//
//   PAC-MAN (Namco, 1980) - the bite. The mouth opens and closes on a fixed cycle and the thing being eaten
//   disappears into it. The cycle is the whole animation: no tweening, no physics, just a two-state mouth.
//   RAMPAGE (Bally Midway, 1986) - the kaiju that walks a city and eats what it passes. The comedy there is
//   that the monster is unhurried and the city is not going anywhere.
//
// So: walk, CHOMP (mouth closes on a car, the car is gone), then CHEW - the head shakes twice, because a mouth
// that has just taken a whole car has to do something with it - and walk on. `mouth` and `shake` are the state;
// the renderer reads them and nothing else.
// THE FRONT. Every disaster is a line that moves through the yard, and the damage happens where the line is -
// Bomberman's blast wave, which is the one 8-bit mechanic that makes destruction read as an EVENT rather than as
// a filter. `front` is 0..1 across the frame; `frontY` is the height it has taken so far.
export const FRONT = { hurricane: 0.42, tsunami: 0.30, stomp: 0.5 };

export const makeDisaster = (kind, rnd = Math.random) => ({
  kind, t: 0, next: 3.2, phase: 'warn', water: 0, eaten: 0, stomped: 0, beamed: 0, roars: 0,
  front: kind === 'hurricane' ? -0.05 : 0, frontY: 0, drained: 0, column: 0,
  mouth: 0, chew: 0, shake: 0,
  // ON SCREEN FROM THE FIRST FRAME. The beast used to start outside the picture (x = -0.2) and walk in at a
  // tenth of the frame per second, so for the first two seconds after summoning there was nothing to look at:
  // the disaster graded the palette and the monster was still off the left edge. She arrives at 0.35 and walks.
  x: kind === 'beyonce' ? 0.35 : 0.72, dir: kind === 'beyonce' ? 1 : -1, step: 0,
  seed: rnd(),
});

/** Which disaster the day brings, if any. Deterministic by day, like the street and the weather (D28). */
export const rollDisaster = (day, rnd) => {
  const h = ((day * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  if (h > CHANCE) return null;
  return ORDER[Math.floor(rnd() * ORDER.length) % ORDER.length];
};

/**
 * The table the yard is drawn through while the sky is misbehaving. Same rule as the weather's: a whole-screen
 * mood is a different table (D1), and the outline and the void are never touched.
 */
export function disasterTable(palette, kind, out = null) {
  const d = DISASTERS[kind];
  if (!d) return palette;
  const g = d.grade, last = palette.length - 2;
  const table = out || palette.map((c) => c);
  for (let i = 0; i < last; i += 1) {
    const c = palette[i];
    let r = c[0] * (g.dark ?? 1), gg = c[1] * (g.dark ?? 1), b = c[2] * (g.dark ?? 1);
    if (g.lift) { r += g.lift; gg += g.lift; b += g.lift; }
    if (g.desat && g.desat !== 1) {
      const grey = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = grey + (r - grey) * g.desat; gg = grey + (gg - grey) * g.desat; b = grey + (b - grey) * g.desat;
    }
    if (g.tint) { r += g.tint[0]; gg += g.tint[1]; b += g.tint[2]; }
    if (g.contrast) { r = 128 + (r - 128) * g.contrast; gg = 128 + (gg - 128) * g.contrast; b = 128 + (b - 128) * g.contrast; }
    table[i] = [Math.max(0, Math.min(255, Math.round(r))), Math.max(0, Math.min(255, Math.round(gg))), Math.max(0, Math.min(255, Math.round(b)))];
  }
  table[last] = palette[last];
  table[last + 1] = palette[last + 1];
  return table;
}

// ---- the beasts, as column profiles ---------------------------------------------------------------------
//
// A kaiju is drawn the way the rest of this game is drawn: from a profile, in the palette's own colours, at the
// picture's own scale. `BODY[kind][row]` gives the half-width of the body at that row (0 = nothing), so the
// silhouette is data rather than a picture, and the legs can walk by shifting two of the columns.
const GODZILLA = (() => {
  const rows = [];
  for (let i = 0; i < 40; i += 1) {
    const t = i / 39;                                   // 0 at the feet, 1 at the head
    let half = 5 + 4 * Math.sin(Math.PI * Math.min(1, t * 1.15));
    if (t > 0.72) half *= 0.62;                         // the neck
    if (t > 0.9) half *= 1.5;                           // the head
    if (t < 0.18) half *= 0.75;                         // the feet
    rows.push(Math.max(1, Math.round(half)));
  }
  return rows;
})();
const BEYONCE = (() => {
  const rows = [];
  for (let i = 0; i < 48; i += 1) {
    const t = i / 47;
    let half;
    if (t > 0.86) half = 3 + 9 * Math.sin(Math.PI * ((t - 0.86) / 0.14) * 0.5);   // the hair
    else if (t > 0.74) half = 2;                                                    // the neck
    else if (t > 0.4) half = 2 + 3 * (t - 0.4) / 0.34;                              // the body
    else if (t > 0.1) half = 4 + 6 * (1 - t / 0.4);                                 // the gown
    else half = 3;                                                                  // the hem
    rows.push(Math.max(1, Math.round(half)));
  }
  return rows;
})();

/**
 * The beast's pixels, one entry per pixel, in palette indices. `frame` walks the legs: two columns are shifted
 * by a pixel every other frame, which is the whole of the animation.
 */
export function beastPixels(palette, kind, cx, feetY, height, frame = 0, pose = null) {
  const rows = kind === 'beyonce' ? BEYONCE : GODZILLA;
  // THE MOUTH AND THE HEAD SHAKE, in the arcade's own terms: a mouth is a gap in the top rows, a shake is the
  // whole silhouette moved one pixel sideways. Two states each, no more, because that is how the machines did it.
  const chewing = pose && pose.mouth;
  const shakeX = pose && pose.shake ? (pose.shake > 0 ? 1 : -1) : 0;
  const headRows = Math.max(2, Math.round(rows.length * 0.12));
  const body = entryForFamily(palette, kind === 'beyonce' ? 'dusk' : 'foliage', kind === 'beyonce' ? 0 : 1);
  const dark = entryForFamily(palette, kind === 'beyonce' ? 'dusk' : 'foliage', 0);
  const accent = kind === 'beyonce'
    ? entryForFamily(palette, 'sand', 4)                     // the hair: gold
    : entryForFamily(palette, 'warm', 5);                    // the plates: hot
  const eye = entryForFamily(palette, kind === 'beyonce' ? 'warm' : 'warm', 5);
  const px = [];
  const h = Math.max(12, Math.round(height));
  const scale = h / rows.length;
  for (let r = 0; r < rows.length; r += 1) {
    // A SIDE VIEW IS TALL AND NARROW. The first sprite was half as wide as it was tall, so on screen it read as
    // horizontal stripes across the wall rather than as a figure. The width now comes from the profile with a
    // much smaller factor, and the head rows keep their own, narrower, width.
    const half = Math.max(1, Math.round(rows[r] * (h / 40) * 0.34));
    const y = Math.round(feetY - (rows.length - r) * scale);
    const isHead = r >= rows.length - headRows;
    const shifted = isHead ? shakeX : 0;                      // only the head shakes: the body keeps walking
    const t = r / (rows.length - 1);
    // an arm at the profile's widest point: one of the two things that make a silhouette read as a person
    const arm = kind === 'beyonce' && t > 0.5 && t < 0.62;
    // the legs: below a fifth of the height, the body splits and the two columns alternate
    const walk = kind === 'beyonce' ? 2 : 1;
    const legGap = t < 0.16 ? Math.round(1 + walk * Math.abs(Math.sin(frame * 0.7)) * half * 0.5) : 0;
    for (let dx = -half; dx <= half; dx += 1) {
      if (legGap && Math.abs(dx) < legGap) continue;         // the gap between the legs
      // the bite: a wedge out of the head's own rows, closing as the chew goes on
      if (isHead && chewing && Math.abs(dx) < Math.max(1, Math.round(half * 0.8))) continue;
      const x = Math.round(cx + dx + shifted);
      // the accents: Godzilla's dorsal plates run down the spine, Beyoncé's hair crowns the top
      const plate = kind !== 'beyonce' && t > 0.3 && t < 0.85 && dx >= half - 2 && (r + frame) % 3 !== 0;
      const hair = kind === 'beyonce' && t > 0.88;
      const face = t > 0.93 && Math.abs(dx) <= 1;
      px.push({ x, y, i: face ? eye : plate || hair ? accent : (arm && Math.abs(dx) === half) ? dark : dx < 0 ? dark : body });
    }
  }
  return px;
}

/** The nearest palette entry of a named ramp's family and tone. */
function entryForFamily(palette, name, tone) {
  const at = (want) => palette.findIndex((_, i) => i % STEPS === want && Math.floor(i / STEPS) === rampIndex(name));
  const exact = at(Math.min(STEPS - 1, tone));
  if (exact >= 0) return exact;
  const any = palette.findIndex((_, i) => Math.floor(i / STEPS) === rampIndex(name));
  return any >= 0 ? any : 0;
}
const RAMP_NAMES = ['sky', 'foliage', 'earth', 'stone', 'metal', 'warm', 'dusk', 'sand'];
const rampIndex = (name) => Math.max(0, RAMP_NAMES.indexOf(name));

/**
 * One step of the disaster. Returns the events the page has to answer — a roar, a stomp, a chomp, the water
 * rising — and never a person: this function is not given the people, and how could it harm what it cannot see.
 */
export function stepDisaster(d, world, dt, rnd) {
  const spec = DISASTERS[d.kind];
  if (!spec) return [];
  d.t += dt;
  const out = [];
  const bar = (n) => Math.min(1, d.t / n);

  // WARNING → IMPACT → AFTERMATH, the envelope every one of these games uses. The warning is a beat of its own:
  // nothing is damaged while the siren sounds, which is what makes the impact feel like an arrival.
  if (d.phase === 'warn') {
    if (d.t > 1.6) { d.phase = 'impact'; out.push({ type: 'impact' }); }
    else if (d.t > 0.9) out.push({ type: 'siren' });
    return out;
  }
  if (d.phase === 'aftermath') {
    if (d.t > spec.lasts + 3) out.push({ type: 'over' });
    return out;
  }

  if (d.kind === 'hurricane') {
    // A VERTICAL FRONT SWEEPING SIDEWAYS. The wind takes what is high first and the ground last: the front's
    // height grows as it crosses, so the first columns lose their branches and signs and the last lose the road.
    // Bomberman's wave, oriented like weather.
    d.front += dt * spec.sweep;
    d.frontY = Math.min(1, d.frontY + dt * spec.sweep * 0.8);
    while (d.column < Math.floor((d.front + 0.05) * world.w)) {
      out.push({ type: 'front', x: d.column, top: d.frontY });
      d.column += 2;                                   // every other column: a front at this scale is 2 px wide
    }
    if (rnd() < dt * spec.debris) out.push({ type: 'gust' });
    if (d.front > 1.1) { d.phase = 'aftermath'; d.t = spec.lasts; out.push({ type: 'calm' }); }
    return out;
  }

  if (d.kind === 'tsunami') {
    // the water rises, holds, then drains: it drowns what is BELOW the line and nothing above it
    const peak = Math.min(1, d.t / 5), fall = d.t > spec.lasts * 0.6 ? Math.max(0, 1 - (d.t - spec.lasts * 0.6) / (spec.lasts * 0.4)) : 1;
    d.water = spec.water * peak * fall;
    const line = world.h * (1 - d.water);
    for (const r of world.regions) {
      if (r.gone || r.kind === 'window') continue;
      if (r.y + r.h * 0.6 < line) continue;                 // above the water: it survives
      r.gone = true; r.hits = r.hp;
      wrecks(world, r, { x: r.cx, y: line + r.h * 0.2 }, 1.4);
      out.push({ type: 'drown', target: r });
    }
    if (d.water > 0.05 && rnd() < dt * spec.foam) out.push({ type: 'foam', line });
    // THE DRAIN IS A SECOND, WEAKER PASS: it scatters and stains, it does not delete. Dig Dug carves, Rampart
    // leaves you the holes to live with; a receding sea that removed things would be a second disaster.
    if (d.t > spec.lasts * 0.6 && d.water < 0.2 && !d.drained) { d.drained = 1; out.push({ type: 'drain' }); }
  }

  const beast = spec.beast;
  if (beast) {
    const height = world.h * (d.kind === 'beyonce' ? 0.62 : 0.55);
    const feet = world.h * (d.kind === 'beyonce' ? 0.92 : 0.86);
    d.x += d.dir * spec.speed * dt * (d.phase === 'arrive' ? 1.6 : 1);
    d.step += dt;
    const cx = world.w * d.x;
    // STOMPS: a thing under the foot is broken; the yard shakes; the ground takes a hole
    if (spec.stomps && d.phase !== 'arrive' && d.t > d.next) {
      d.next = d.t + spec.lasts / (spec.stomps + 1);
      const under = world.regions.filter((r) => !r.gone && r.kind !== 'window' && Math.abs(r.cx - cx) < height * 0.16);
      const target = under[0] || null;
      if (target) {
        target.gone = true; target.hits = target.hp;
        // the foot lands where the thing is, and the blow is a kaiju's
        wrecks(world, target, { x: Math.min(target.x + target.w, Math.max(target.x, cx)), y: target.cy }, 2);
        d.stomped += 1;
      }
      out.push({ type: 'stomp', at: { x: cx, y: feet }, target });
    }
    // CHOMPS: the cars. A kaiju-sized appetite needs no justification; the line is the joke.
    // the chew: after a bite the head shakes twice and she does not move while she does it
    if (d.chew > 0) {
      d.chew -= dt;
      d.shake = Math.sin(d.chew * 34) > 0 ? 1 : -1;
      d.mouth = 0;
      if (d.chew <= 0) { d.shake = 0; d.phase = 'walk'; }
      return out.length ? out : [{ type: 'chew' }];
    }
    if (spec.chomps && d.phase === 'walk' && d.t > d.next) {
      d.next = d.t + spec.lasts / (spec.chomps + 1);
      const cars = world.regions.filter((r) => !r.gone && /car|truck|bus|motorcycle|bicycle|boat/.test(r.kind));
      const target = cars.sort((a, b) => Math.abs(a.cx - cx) - Math.abs(b.cx - cx))[0] || null;
      if (target) {
        target.gone = true; target.hits = target.hp;
        // the bite takes the near end of the thing, which is where a mouth would reach it
        wrecks(world, target, { x: target.cx, y: target.cy }, 1.6);
        d.eaten += 1;
      }
      d.mouth = 1;
      d.chew = 0.55;                       // the mouth closes, then the head shakes: the Pac-Man beat
      d.phase = 'chew';
      out.push({ type: 'chomp', at: { x: cx, y: feet - height * 0.75 }, target });
    }
    if (spec.beam && d.phase === 'walk' && !d.beamed && d.t > spec.lasts * 0.45) {
      d.beamed = 1;
      out.push({ type: 'beam', at: { x: cx, y: feet - height * 0.8 } });
    }
    if (d.x > 1.25 || d.x < -0.25) { d.dir *= -1; d.x = Math.max(-0.2, Math.min(1.2, d.x)); }
    if (d.phase === 'arrive' && d.t > 1.5) d.phase = 'walk';
  }

  if (d.t > spec.lasts && d.phase !== 'aftermath') { d.phase = 'aftermath'; out.push({ type: 'calm' }); }
  return out;
}

/**
 * WHAT A DISASTER LEAVES BEHIND: a wreck, not a black box.
 *
 * The first version wrote the void index into every pixel of the object, so a car that Beyoncé ate became a
 * black rounded rectangle - the "black blobs" on screen. Damage in this game has a language already (D48): one
 * tone down the thing's own ramp, a ragged hole where the blow landed, and the void only at the centre of it.
 * A disaster uses that language like every other hitter.
 */
function wrecks(world, region, at = null, strength = 1) {
  // The game's own damage path, in the thing's own border (world.wreckAlong): a disaster hits exactly the way a
  // thrown stone does, only harder. It is the same call, so a kaiju cannot invent a rule of its own.
  return wreckAlong(world, region, at, strength);
}

export const beastAt = (d, world) => {
  const spec = DISASTERS[d.kind];
  if (!spec || !spec.beast) return null;
  const height = world.h * (d.kind === 'beyonce' ? 0.62 : 0.55);
  return { x: world.w * d.x, feet: world.h * (d.kind === 'beyonce' ? 0.92 : 0.86), height, frame: Math.floor(d.t * 6) };
};
