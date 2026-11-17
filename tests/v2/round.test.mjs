import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addLoot, checkOver, createRound, registerStrike, spendThrow, tick } from '../../src/v2/round.js';

test('quick hits on targets build a combo that multiplies points', () => {
  const r = createRound(10);
  registerStrike(r, 0, true); registerStrike(r, 30, true); registerStrike(r, 60, true);
  assert.equal(r.mult, 3);
  tick(r, 61, 100);
  assert.equal(r.score, 300);
});

test('a miss or a pause resets the combo', () => {
  const r = createRound(10);
  registerStrike(r, 0, true); registerStrike(r, 10, true); registerStrike(r, 20, false);
  assert.equal(r.mult, 1);
  registerStrike(r, 30, true); registerStrike(r, 40, true);
  tick(r, 400, 0);
  assert.equal(r.mult, 1);
});

test('stones run out, gems refill them, and the round ends only when nothing moves', () => {
  const r = createRound(1);
  assert.ok(spendThrow(r));
  assert.ok(!spendThrow(r));
  addLoot(r, { value: 50, throws: 1, n: 1 });
  assert.equal(r.throws, 1);
  spendThrow(r);
  assert.equal(checkOver(r, true), false);
  assert.equal(checkOver(r, false), true);
});
