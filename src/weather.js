// WEATHER — the yard's own disasters: rain, snow, fog and a storm that throws lightning.
//
// The game has always had a sky, a time of day in the news and a light taken from the photograph. What it did
// not have is the sky doing anything. A photograph of a courtyard is a place at a moment, and the moment can
// turn: rain darkens every surface and drives the passers-by off, snow lifts the whole picture and settles,
// fog eats the distance, and a storm lights the yard for a fifth of a second and leaves one thing blackened.
//
// WHAT THIS MODULE IS, in the game's own terms. The yard is stored as palette indices and drawn through a table
// (D1), so a whole-screen mood is a different table — that is the NES rule the project already decided on, and
// it is why weather here is first a GRADE on the palette and only then a set of particles. Every other game
// system that changes the look (weed, alcohol, depression) works the same way. Weather is the first one that
// changes the WORLD rather than the viewer: it moves the people, darkens what lightning hits, and leaves water
// standing.
//
// THE RULES IT IS HELD TO, which are the game's own:
//   - nothing is harmed by weather except a THING lightning strikes, and lightning has no code path to a person
//     at all (docs/concept.md on people; the brief's line on violence).
//   - it costs the player nothing: no score is lost, no combo is broken, nothing is taken away (D27).
//   - the day decides, not the player: the same day's number gives the same weather, like the street (D28), so
//     a run can be talked about.
//
// The grade numbers are CHOICE with no published source, and they say so: no paper was found that measures how
// much darker rain looks in an 8-bit palette. What IS from a source is the direction of each one — a wet
// surface is darker and less saturated because water fills the micro-shadow, a snow-lit scene is brighter and
// flatter because the ground becomes a large diffuse reflector, and fog reduces contrast with distance
// (atmospheric perspective, `standards/2d-art-environment-design.md`).

export const WEATHERS = {
  clear: {
    ru: 'ясно',
    grade: null,                       // the photograph's own light, untouched
    people: 1, wind: 0, falls: 0,
    why: 'The yard as photographed. Everything else is felt as a departure from this.',
  },
  rain: {
    ru: 'дождь',
    grade: { dark: 0.70, desat: 0.62, tint: [-4, 0, 14], lift: 0 },      // wet surfaces are darker and cooler
    people: 1.35, wind: 0.5, falls: 34, streaks: true,
    why: 'People hurry and leave sooner; every surface darkens; the yard stops being a place to stand about in.',
  },
  snow: {
    ru: 'снег',
    grade: { dark: 1.06, desat: 0.72, tint: [4, 4, 12], lift: 30 },      // snow is a large, cold, diffuse light
    people: 0.8, wind: 0.3, falls: 22, settles: true,
    why: 'The whole picture lifts and flattens, people slow down, and what falls stays where it lands.',
  },
  fog: {
    ru: 'туман',
    grade: { dark: 0.94, desat: 0.55, tint: [2, 4, 10], lift: 34, flatten: 0.5 },
    people: 0.9, wind: 0.1, falls: 0,
    why: 'Distance disappears: the far half of the street fades toward the sky and things have to be found.',
  },
  storm: {
    ru: 'гроза',
    grade: { dark: 0.60, desat: 0.5, tint: [-6, -2, 16], lift: 0, contrast: 1.18 },
    people: 1.5, wind: 1, falls: 40, streaks: true, lightning: [5, 13],
    why: 'Dark, hard and loud: the yard is lit in flashes and one standing thing is left blackened.',
  },
};

export const ORDER = ['clear', 'rain', 'snow', 'fog', 'storm'];
// How likely each is when the day is rolled. Clear is the most common because it is the photograph's own light
// and a game that is always raining cannot show a yard off; the four are otherwise even. CHOICE, no source.
const WEIGHT = { clear: 3, rain: 2, snow: 1, fog: 1, storm: 1 };

/**
 * Which weather the day brings. Deterministic: the same day's number gives the same yard, the same street and
 * the same sky (D28), so two players comparing a day are comparing the same thing.
 */
export function rollFor(day, rnd) {
  const total = ORDER.reduce((n, k) => n + WEIGHT[k], 0);
  let pick = ((day * 2654435761) % 1000) / 1000 * total;
  for (const k of ORDER) { pick -= WEIGHT[k]; if (pick <= 0) return k; }
  return 'clear';
}

export const makeWeather = (kind = 'clear', rnd = Math.random) => ({
  kind, t: 0, next: kind === 'storm' ? WEATHERS.storm.lightning[0] + rnd() * (WEATHERS.storm.lightning[1] - WEATHERS.storm.lightning[0]) : Infinity, strikes: 0,
});

/**
 * The yard's table as this weather shows it. `lift` brightens, `dark` scales, `desat` pulls toward the grey of
 * the same luma, `tint` shifts the channels, `flatten` pulls everything toward the frame's own mid grey (which
 * is what fog does to distance) and `contrast` pushes away from it.
 *
 * The outline and the void are left alone: a line that fades is not a line, and the void is the absence of a
 * thing rather than a surface that can get wet.
 */
export function weatherTable(palette, weather, out = null) {
  const g = WEATHER_GRADE(weather);
  if (!g) return palette;
  const last = palette.length - 2;
  const table = out || palette.map((c) => c);
  for (let i = 0; i < last; i += 1) {
    const c = palette[i];
    const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
    let r = c[0], gg = c[1], b = c[2];
    if (g.lift) { r += g.lift; gg += g.lift; b += g.lift; }
    if (g.dark && g.dark !== 1) { r *= g.dark; gg *= g.dark; b *= g.dark; }
    if (g.desat && g.desat !== 1) {
      const grey = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = grey + (r - grey) * g.desat; gg = grey + (gg - grey) * g.desat; b = grey + (b - grey) * g.desat;
    }
    if (g.tint) { r += g.tint[0]; gg += g.tint[1]; b += g.tint[2]; }
    if (g.flatten || g.contrast) {
      const mid = 128;
      const k = g.contrast || 1, f = g.flatten || 0;
      r = r * k + (mid - r * k) * f; gg = gg * k + (mid - gg * k) * f; b = b * k + (mid - b * k) * f;
    }
    table[i] = [Math.max(0, Math.min(255, Math.round(r))), Math.max(0, Math.min(255, Math.round(gg))), Math.max(0, Math.min(255, Math.round(b)))];
  }
  table[last] = palette[last];
  table[last + 1] = palette[last + 1];
  return table;
}

const WEATHER_GRADE = (weather) => (typeof weather === 'string' ? WEATHERS[weather]?.grade : weather?.grade) || null;

/**
 * A step of weather: what falls, and what the sky does. Returns the events the page has to answer — a flash of
 * lightning, a thing struck — and never a person: `strike` is chosen from the world's standing things only.
 */
export function stepWeather(weather, world, fx, dt, rnd, view) {
  const w = WEATHERS[weather.kind];
  if (!w) return [];
  weather.t += dt;
  const out = [];
  // what falls: streaks of rain, flakes of snow. Both are capped by the frame's own area, and both are drawn by
  // the ordinary particle list, so nothing new has to be stepped or drawn for them.
  if (w.falls && fx.particles.length < 420 && view) {
    const n = Math.max(1, Math.round(w.falls * dt * (view.w / 256)));
    for (let i = 0; i < n; i += 1) {
      const x = view.x + rnd() * view.w;
      if (w.streaks) {
        fx.particles.push({ x, y: view.y - 4 - rnd() * 20, vx: -18 + rnd() * 36, vy: 220 + rnd() * 90, life: 1.6, rgb: rnd() < 0.5 ? '#9fd8ff' : '#cfe9ff', s: 1, spin: false, floor: view.y + view.h + 20, settle: false });
      } else {
        fx.particles.push({ x, y: view.y - 4 - rnd() * 30, vx: -12 + rnd() * 24, vy: 46 + rnd() * 34, life: 3.4, rgb: rnd() < 0.3 ? '#ffffff' : '#dfe9f2', s: rnd() < 0.5 ? 2 : 1, spin: false, floor: view.y + view.h + 2, settle: true, c: 0 });
      }
    }
  }
  // lightning: the sky is lit, thunder follows, and one standing thing is left blackened. It is aimed at the
  // world's things, never at the people — there is no code here that can reach one.
  if (w.lightning) {
    weather.next -= dt;
    if (weather.next <= 0) {
      weather.next = w.lightning[0] + rnd() * (w.lightning[1] - w.lightning[0]);
      weather.strikes += 1;
      const things = world.regions.filter((r) => !r.gone && r.kind !== 'window');
      const target = things.length ? things[Math.floor(rnd() * things.length)] : null;
      out.push({ type: 'lightning', target });
    }
  }
  return out;
}

/** How fast people move in this weather: they hurry out of rain and dawdle in snow. */
export const peopleSpeed = (weather) => (WEATHERS[weather?.kind]?.people ?? 1);

/** What the sky is doing, for the line under the yard. */
export const weatherLine = (weather) => {
  const w = WEATHERS[weather.kind];
  return `погода: ${w.ru}`;
};
