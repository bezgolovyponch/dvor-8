// What is in your hand. Six things you can pick up, each flying and landing its own way.
//
// WHY THIS IS SEPARATE FROM THE MODES. It used to be one thing per mode: the mode WAS the throwable. That
// coupled two decisions that have nothing to do with each other — how you SEE (the mode's focus, its vision,
// its lean) and what you THROW. A player who wanted a wide splash had to accept a wandering hand; a player
// who wanted a clear view had to accept a pebble. Splitting them means the hand is a choice and the eyes are
// a choice, and either can be changed without the other.
//
// The rule every entry is held to (docs/concept.md, "nothing in vain"): it must differ from the pebble in a
// way the player can FEEL on the first throw, and say why it exists. A second object that only changed colour
// would be a decoration, and decorations are what the mode rule already forbids.
//
//   flight    seconds from release to impact
//   damage    hits dealt on impact
//   scatter   how far the aim strays, pixels      splash   radius struck around the impact, pixels
//   chain     how many more things it reaches for  cooldown seconds before the hand is free
//   weight    how far it drops on the way (pixels per second of flight) — how it LOOKS while flying
//   sky       thrown upward as well: for water, which is thrown over people rather than at them

export const THROWABLES = {
  stone: {
    label: 'камень', hint: 'точно и быстро',
    flight: 0.11, damage: 1, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 26, sky: false,
    why: 'The baseline: what you tap is what you hit. Every other thing is felt as a departure from this one.',
  },
  brick: {
    label: 'кирпич', hint: 'ломает с одного раза · тяжёлый · рука отдыхает',
    flight: 0.30, damage: 3, scatter: 0, splash: 0, chain: 0, cooldown: 0.7, weight: 74, sky: false,
    why: 'One throw, one thing gone. The long cooldown is the cost of the damage, so it is for the target you cannot afford to miss twice.',
  },
  slipper: {
    label: 'тапок', hint: 'летит не спеша и скачет по соседям · комбо держится дольше',
    flight: 0.34, damage: 1, scatter: 0, splash: 0, chain: 2, cooldown: 0, weight: 14, sky: false,
    why: 'Slow and generous: one lazy throw can touch three things. For lining things up rather than finishing them.',
  },
  bottle: {
    label: 'бутылка', hint: 'бьёт всё вокруг, но рука гуляет',
    flight: 0.16, damage: 1, scatter: 10, splash: 22, chain: 0, cooldown: 0, weight: 40, sky: false,
    why: 'Power for accuracy: it bursts over everything near where it lands, and it does not land where you pointed.',
  },
  water: {
    label: 'вода', hint: 'летит по дуге · бьёт только человека · не портит вещи',
    flight: 0.42, damage: 0, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 58, sky: true,
    why: 'The one thing you throw AT PEOPLE and never at the yard — a ball of water, which is what a balcony is actually for. It carries no damage to property, so it is the honest answer to someone standing where you cannot reach them.',
  },
  flowers: {
    label: 'цветы', hint: 'растут там, где упали · остаются навсегда', kind: 'flowers',
    flight: 0.26, damage: 0, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 18, sky: false,
    why: 'The only throw that ADDS and stays: it plants where it lands and the flower is still there at the end. Nothing to break, nothing to lose — throw it at bare ground and watch the yard change.',
  },
  sponge: {
    label: 'губка', hint: 'моет машину — светлее на тон, один раз', kind: 'wash',
    flight: 0.18, damage: 0, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 30, sky: false,
    why: 'The only thing that makes anything LIGHTER: it moves a car one tone up its own ramp, so it is visibly clean and still the same colour. Once per thing, because the point is the change and not the farming.',
  },
  whimsy: {
    label: 'забава', hint: 'случайное действие с тем, во что попадёшь · ничего не ломает', kind: 'whimsy',
    // scatter 0: the RANDOMNESS IS IN WHAT IT DOES, not in where it goes. A throw that both strayed and did a
    // random thing would be two uncertainties at once, and the bottle is the one that strays (D17).
    flight: 0.22, damage: 0, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 12, sky: false,
    why: 'The second verb. One throw does something absurd and specific to whatever it lands on — eat the car, sit on the bench, water the plant pot — picked from a table keyed by the thing the detector named. Nothing is harmed, and the yard is funnier for it.',
  },
  paint: {
    label: 'краска', hint: 'пятно остаётся на стене · ничего не ломает',
    flight: 0.24, damage: 0, scatter: 0, splash: 0, chain: 0, cooldown: 0, weight: 34, sky: false,
    why: 'The one thing that ADDS to the yard instead of taking from it: a ball of colour that stays where it landed, on a wall, a car or the ground, and is still there on the card you send. It breaks nothing, so it is how you sign a yard you have not wrecked.',
  },
};

export const ORDER = ['stone', 'brick', 'slipper', 'bottle', 'water', 'paint', 'flowers', 'sponge', 'whimsy'];

// The throwable's own numbers, with the mode's vision left alone. A mode may still sharpen the aim or add
// reach — that is its business — but it no longer decides what is in the hand.
export function throwWith(item, mode) {
  return {
    ...item,
    damage: item.damage,
    flight: item.flight,
    scatter: item.scatter,
    splash: item.splash,
    chain: item.chain,
    cooldown: item.cooldown,
    combo: mode.combo,
  };
}

// Where a throw aimed at (x, y) actually lands. Unchanged in behaviour from modes.js, but it now takes the
// throwable, because it is the thing that scatters and not the way you are looking.
export function aimWith(item, x, y, rnd) {
  if (!item.scatter) return { x, y };
  const a = rnd() * Math.PI * 2, r = item.scatter * Math.sqrt(rnd());
  return { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r };
}
