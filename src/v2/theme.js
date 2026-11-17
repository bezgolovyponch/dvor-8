import { GAME_PALETTE } from './engine.js';

export const RAMP = 6;
export const PAL = GAME_PALETTE.hex;

export const ROLE = {
  outline: 48, night: 49, paper: 29, aim: 40, info: 10, gold: 45, glass: 4, sky: 3, green: 9, earth: 16,
  concrete: 22, metal: 33, char: 18, smoke: 21, fire: 47, flame: 34, brick: 32, stone: 22,
};

export const rgbOf = (i) => [1, 3, 5].map((j) => parseInt(PAL[i].slice(j, j + 2), 16));

export function step(i, n) {
  if (i >= 8 * RAMP) return i;
  const base = i - (i % RAMP);
  return base + Math.max(0, Math.min(RAMP - 1, (i % RAMP) + n));
}

export const ramp = (i, steps) => steps.map((n) => rgbOf(step(i, n)));

export const COLOURS = {
  char: ramp(ROLE.char, [0, 1, 2, 3]),
  fire: [rgbOf(ROLE.fire), rgbOf(step(ROLE.gold, 0)), rgbOf(ROLE.flame), rgbOf(step(ROLE.flame, -2))],
  smoke: ramp(ROLE.smoke, [0, -1]),
  glass: ramp(ROLE.glass, [1, 0]),
  flash: rgbOf(ROLE.paper),
  interior: ramp(ROLE.char, [0, 1]),
  slab: ramp(ROLE.concrete, [1, 0, -1]),
  dust: ramp(ROLE.concrete, [1, 0]),
  coin: ramp(ROLE.gold, [-1, 0, 1]),
  gem: [rgbOf(ROLE.info), rgbOf(ROLE.glass), rgbOf(step(ROLE.glass, 1))],
  aim: rgbOf(ROLE.aim),
  outline: rgbOf(ROLE.outline),
  stone: ramp(ROLE.stone, [-2, 0, 1]),
  brick: ramp(ROLE.brick, [-1, 0, 1]),
};

export const CSS_ROLES = { night: ROLE.night, ink: ROLE.paper, hot: ROLE.aim, gold: ROLE.gold, outline: ROLE.outline };

export const CLASS_TINT = [ROLE.sky, ROLE.aim - 2, ROLE.green, ROLE.earth, ROLE.concrete, ROLE.metal, ROLE.gold, ROLE.aim].map(rgbOf);
