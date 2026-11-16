import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridSize, lattice } from '../../src/v2/restyle.js';

test('grid size keeps floors within readable pixel heights', () => {
  assert.equal(gridSize(120, 40, [9, 16], 11), 13);
  assert.equal(gridSize(120, 2, [9, 16], 11), 8);
  assert.equal(gridSize(120, 0, [9, 16], 11), 11);
});

test('a building-sized quad gets a lattice of windows', () => {
  const W = 60, H = 80, ID = new Uint8Array(W * H);
  for (let y = 10; y < 70; y += 1) for (let x = 10; x < 50; x += 1) ID[y * W + x] = 1;
  const g = lattice({ id: 1, quad: [[10, 10], [50, 10], [50, 70], [10, 70]], rows: 0, cols: 0 }, W, H, ID);
  assert.ok(g.windows >= 12);
});

test('a sliver has too few windows to count as a building', () => {
  const W = 60, H = 80, ID = new Uint8Array(W * H);
  for (let x = 0; x < 60; x += 1) ID[40 * W + x] = 1;
  const g = lattice({ id: 1, quad: [[0, 40], [60, 40], [60, 41], [0, 41]], rows: 0, cols: 0 }, W, H, ID);
  assert.ok(g.windows < 3);
});
