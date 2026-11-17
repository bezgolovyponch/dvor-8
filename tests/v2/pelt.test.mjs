import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pelt, rbfGram } from '../../src/v2/pelt.js';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/pelt-ruptures.json', import.meta.url)));

test('breakpoints equal the ruptures reference for the same signal and penalty', () => {
  for (const [pen, expected] of Object.entries(fixture.breakpoints)) assert.deepEqual(pelt(fixture.signal, 20, Number(pen)), expected);
});

test('a constant signal has no inner breakpoint', () => {
  assert.deepEqual(pelt(Array.from({ length: 60 }, () => [1, 1]), 20, 3), [60]);
});

test('the rbf gram matrix is symmetric with a unit diagonal', () => {
  const K = rbfGram([[0], [1], [3]]);
  assert.equal(K[0], 1);
  assert.equal(K[1], K[3]);
});
