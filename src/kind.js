// KIND ACTIONS — the three things you can do to a yard that are not wrecking it.
//
// The game's verb is "throw something at the yard", and until now every throwable subtracted: a stone dents, a
// brick wrecks, a bottle bursts. That is the joke, and a joke told for ten minutes needs a second voice. This
// module is that voice: flowers you plant, a car you wash, a parcel you carry back to the courier who dropped
// it. They are thrown with the same hand and aimed the same way — nothing new to learn — and they are the only
// things in the game that ADD to the picture instead of taking from it.
//
// WHY IT IS ITS OWN MODULE. All three share one shape: an action, what it costs the player, what it adds to
// the world, and what it looks like while it does it. Keeping them together means the renderer has one place
// to ask "what is growing here" and "what is lying here", the tests have one place to hold the rules, and the
// yard's picture can show all of it without any of the wrecking code knowing about any of it.
//
// WHAT EACH ONE IS FOR, in the same terms the throwables use (docs/concept.md, "nothing in vain" — a thing
// must differ from the others in a way the player can feel on the first use, and say why it exists):
//
//   flowers   permanence. A wreck is dark and stays dark (D8); a flower is colour that stays colour, and the
//             yard you leave behind is the one you planted. Nothing else in the game changes a patch of ground
//             for the better and keeps it.
//   wash      restoration. A washed car is the only thing in the game that gets LIGHTER: it moves one tone up
//             its own ramp, so it is visibly cleaner without becoming a different colour, and it happens once
//             per thing because the point is the change, not the farming.
//   help      the danger meter only ever climbed. Carrying the courier's parcel back is the one action that
//             takes a mark off it, and it is aimed at a person without being aimed AT them — the opposite of
//             soaking somebody.
//
// Nothing here harms anyone, breaks anything, or takes a point away. No-loss is the game's rule (D27) and it
// applies to kind actions first.

export const FLOWERS = {
  ru: 'цветы',
  //         how long each stage takes, seconds   how many stages   what the whole flower is worth
  grow: 0.5, stages: 3, points: 30,
  why: 'Colour that stays: the only thing you can do to a yard that is still there when the run ends.',
};

export const WASH = {
  ru: 'мытьё',
  points: 45, foam: 14,          // pieces of foam thrown off the impact
  why: 'The only thing in the game that gets lighter: one tone up its own ramp, once.',
};

export const HELP = {
  ru: 'помощь',
  points: 120, heat: 0.25,       // danger taken off the meter when the parcel is returned
  why: 'The only action that lowers the danger meter, and the only one aimed at a person that is not at them.',
};

// A parcel is small: four pixels of box, a tape cross, and the courier's own brown. It is not a target: it
// cannot be broken, it does not count as something left in the yard, and hitting it does not start a combo.
export const PARCEL = { w: 6, h: 5, ru: 'посылка' };

/** Is this spot on the ground something that can hold a flower? Not the sky, not a wall's paint, not a thing. */
export function plantable(world, x, y, takesPaint) {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi < 1 || yi < 2 || xi >= world.w - 1 || yi >= world.h - 1) return false;
  const p = yi * world.w + xi;
  if (world.owner[p] >= 0) return false;                       // a thing stands there
  if (world.rubble[p] !== 255) return false;                   // something fell there
  if (world.blooms.some((b) => Math.abs(b.x - xi) < 4 && Math.abs(b.y - yi) < 4)) return false;
  return takesPaint ? takesPaint(world.surfaces?.what ?? null, world.w, world.h, xi, yi) : true;
}

/**
 * Plant a flower where the throw landed. Returns the bloom, or null when the ground will not hold one — a
 * miss costs nothing (D27), it simply does not grow.
 */
export function plant(world, x, y, rnd, takesPaint) {
  if (!plantable(world, x, y, takesPaint)) return null;
  const xi = Math.round(x), yi = Math.round(y);
  const petal = rnd() < 0.5 ? 'warm' : 'dusk';                 // two flowers, so a bed is not a stamp
  const bloom = { x: xi, y: yi, t: 0, stage: 1, seed: rnd(), petal, sway: rnd() * 6 };
  world.blooms.push(bloom);
  return bloom;
}

/** Blooms grow on their own clock: stage 1 sprout, 2 stem, 3 flower. Nothing takes them away. */
export function stepBlooms(world, dt) {
  for (const b of world.blooms) {
    b.t += dt;
    const want = Math.min(FLOWERS.stages, 1 + Math.floor(b.t / FLOWERS.grow));
    if (want > b.stage) b.stage = want;
  }
}

/**
 * A bloom as pixels, so the renderer and the postcard draw the same flower. The stem is the foliage ramp and
 * the flower is the warm or dusk ramp — the palette's own colours, taken by the same rule everything else in
 * the picture uses, which is what keeps a flower looking like part of the yard rather than a sticker on it.
 */
export function bloomPixels(palette, steps, bloom, seconds) {
  const { x, y, stage, sway, petal } = bloom;
  const lean = Math.round(Math.sin(seconds * 1.6 + sway) * (stage >= 3 ? 0.9 : 0.3));
  const out = [];
  const near = (name) => {
    const i = RAMPS_INDEX[name];
    return i === undefined ? 0 : i * steps;
  };
  const stem = near('foliage') + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.35)));
  const leaf = near('foliage') + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.55)));
  const head = near(petal) + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.75)));
  const heart = near(petal) + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.55)));
  out.push({ x, y: y - 1, i: stem });
  if (stage >= 2) {
    out.push({ x, y: y - 2, i: stem });
    out.push({ x: x - 1, y: y - 1, i: leaf });
    out.push({ x: x + 1, y: y - 1, i: leaf });
  }
  if (stage >= 3) {
    out.push({ x: x + lean, y: y - 3, i: head });
    out.push({ x: x + lean - 1, y: y - 3, i: heart });
    out.push({ x: x + lean + 1, y: y - 3, i: heart });
    out.push({ x: x + lean, y: y - 4, i: heart });
  }
  return out;
}

// The ramp names the palette is built from, as indices. `tones()` returns them in this order.
const RAMPS_INDEX = { sky: 0, foliage: 1, earth: 2, stone: 3, metal: 4, warm: 5, dusk: 6, sand: 7 };

/**
 * Washing a thing: every pixel of it moves one tone UP its own ramp, and only once. The hue cannot change —
 * the index arithmetic stays inside one ramp — so a red car is a lighter red car, which is what clean looks
 * like in a picture with no white to spare.
 */
export function washable(world, region) {
  return Boolean(region) && !region.gone && !region.washed && region.kind !== 'parcel' && region.kind !== WINDOW_KIND;
}

export function wash(world, region, steps) {
  if (!washable(world, region)) return null;
  const OUT = world.palette.length - 2;
  const moved = [];
  for (const p of region.pixels) {
    const v = world.idx[p];
    if (v >= OUT) continue;                                    // the ink and the void are not colours
    if (v % steps === steps - 1) continue;                     // already the lightest tone of its ramp
    const to = v + 1;
    world.idx[p] = to;
    moved.push(p);
  }
  region.washed = true;
  return { pixels: moved, points: WASH.points };
}

const WINDOW_KIND = 'window';

/** The courier puts a parcel down where they came in; it lies there until somebody carries it back. */
export function dropParcel(world, x, y, rnd) {
  const w = PARCEL.w, h = PARCEL.h;
  const xi = Math.max(2, Math.min(world.w - w - 2, Math.round(x)));
  const yi = Math.max(4, Math.min(world.h - h - 2, Math.round(y)));
  const parcel = { x: xi, y: yi, w, h, cx: xi + w / 2, cy: yi + h / 2, id: 'parcel' + world.parcels.length, kind: 'parcel', label: PARCEL.ru, taken: false, seed: rnd() };
  world.parcels.push(parcel);
  return parcel;
}

/** The parcel under a finger, if there is one: it is picked up, not hit, so the tap is answered at once. */
export function parcelAt(world, x, y, near = 6) {
  const xi = Math.round(x), yi = Math.round(y);
  return world.parcels.find((q) => !q.taken && xi >= q.x - near && xi <= q.x + q.w + near && yi >= q.y - near && yi <= q.y + q.h + near) || null;
}

export function parcelPixels(palette, steps, parcel) {
  const box = RAMPS_INDEX.earth * steps + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.6)));
  const tape = RAMPS_INDEX.sand * steps + Math.max(0, Math.min(steps - 1, Math.round(steps * 0.8)));
  const out = [];
  for (let dy = 0; dy < parcel.h; dy += 1) for (let dx = 0; dx < parcel.w; dx += 1) {
    if (dx === 0 || dy === 0 || dx === parcel.w - 1 || dy === parcel.h - 1) continue;
    out.push({ x: parcel.x + dx, y: parcel.y + dy, i: dx === 2 || dy === 2 ? tape : box });
  }
  return out;
}

/**
 * Carrying the parcel back. It does not matter who is holding it: the courier gets their box, the danger meter
 * loses a mark, and nothing is thrown at anybody.
 */
export function help(world, parcel, folk) {
  if (!parcel || parcel.taken) return null;
  parcel.taken = true;
  if (folk) folk.heat = Math.max(0, folk.heat - HELP.heat);
  return { points: HELP.points, heat: HELP.heat, line: 'КУРЬЕР: СПАСИБО' };
}

/** The burst a kind action throws off: green, pink and white — the yard's own colours doing something nice. */
export const blossomBurst = (x, y, rnd) => Array.from({ length: 14 }, (_, n) => ({
  x, y,
  c: 0,
  rgb: n % 3 === 0 ? '#ff6fa8' : n % 3 === 1 ? '#8bd46a' : '#fff6c2',
  floor: y + 10 + Math.floor(rnd() * 6),
}));

// ---- WHIMSY: a random thing to do to a real object, for no reason --------------------------------------
//
// The yard is made of REAL things the detector found in the player's own photograph, and the game's only verb is
// throwing something at them. Whimsy is the second verb: one throw that does something absurd and specific to
// whatever it lands on — eat the car, sit on the bench, water the plant pot, ride the bicycle — chosen at
// random from a table keyed by the thing's own kind. It is here because a photograph of your own courtyard is
// FUNNY, and a game that can only break it wastes that.
//
// Rules, the same as every other kind action: nothing is harmed, nothing is taken away, a miss costs nothing.
// The table is keyed by the labels `src/objects.js` finds, so a thing the detector cannot name is not a
// candidate — the game never invents a thing to be absurd at.
export const WHIMSY = {
  ru: 'забава', points: 60,
  why: 'One throw, one absurdity, chosen for the thing it lands on. Nothing is harmed and the yard is funnier.',
};

export const ANTICS = {
  car: ['СЪЕСТЬ МАШИНУ', 'ПОКАЗАТЬ МАШИНЕ ФОКУС', 'ПОГЛАДИТЬ КАПОТ'],
  truck: ['СЪЕСТЬ ГРУЗОВИК', 'СПЕТЬ ГРУЗОВИКУ'],
  bus: ['ЗАЙЦЕМ В АВТОБУС', 'СЪЕСТЬ АВТОБУС'],
  bicycle: ['ПРОКАТИТЬСЯ', 'ПОДКАЧАТЬ КОЛЕСО'],
  motorcycle: ['ПОРЫЧАТЬ ВМЕСТЕ', 'ПРОКАТИТЬСЯ'],
  bench: ['ПОСИДЕТЬ', 'ПОЧИНИТЬ СКАМЕЙКУ'],
  chair: ['СЕСТЬ', 'ПОКАЧАТЬСЯ'],
  'potted plant': ['ПОЛИТЬ', 'ПОГОВОРИТЬ С ЦВЕТКОМ'],
  boat: ['ПОПЛЫТЬ', 'СЪЕСТЬ ЛОДКУ'],
  window: ['ПОМЫТЬ ОКНО', 'ПОСТУЧАТЬ'],
};

/** One absurd thing to do to this kind of thing. Deterministic given the roll, so a replay is a replay. */
export function antic(kind, roll) {
  const list = ANTICS[kind];
  if (!list || !list.length) return null;
  const i = Math.min(list.length - 1, Math.floor(roll * list.length));
  return { kind, line: list[i], points: WHIMSY.points };
}

/** Points a kind action is worth, for the pop and for the score. */
export const worth = { flowers: FLOWERS.points, wash: WASH.points, help: HELP.points };
