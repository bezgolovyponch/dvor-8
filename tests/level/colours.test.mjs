import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignRamps, contrast, MIN_CONTRAST, MIN_HUE_GAP, rampFor, slot } from '../../src/level/colours.js';
import { GAME_PALETTE } from '../../src/v2/engine.js';

test('the WCAG contrast ratio gives 21 for black on white and 1 for equal colours', () => {
  assert.equal(contrast([0, 0, 0], [255, 255, 255]).toFixed(1), '21.0');
  assert.equal(contrast([90, 90, 90], [90, 90, 90]), 1);
});

test('cars on the road reach the contrast floor and neighbours differ in hue', () => {
  const road = slot('cool', 1);
  const cars = [0, 1, 2, 3].map((i) => ({ id: `c${i}`, role: 'car', seed: i, near: [`c${i - 1}`, `c${i + 1}`] }));
  const picks = assignRamps(cars, GAME_PALETTE.hex, () => road);
  for (const c of cars) assert.ok(picks.get(c.id).ok, `${c.id} ${JSON.stringify(picks.get(c.id))}`);
  assert.ok([...picks.values()].every((p) => p.contrast >= MIN_CONTRAST && p.gap >= MIN_HUE_GAP));
  assert.notEqual(picks.get('c0').ramp, picks.get('c1').ramp);
});

test('a sprite ramp is three shades of one ramp around the chosen shade', () => {
  assert.deepEqual(rampFor({ ramp: 'red', shade: 3 }), [slot('red', 1), slot('red', 3), slot('red', 4)]);
});
