import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawFacade, gridSize } from '../../src/v2/facade.js';

test('floors stay within readable pixel heights', () => {
  assert.equal(gridSize(120, 40, [9, 16], 12), 13);
  assert.equal(gridSize(120, 0, [9, 16], 12), 10);
});

test('a facade is drawn as outline, wall, floor slabs and a grid of windows', () => {
  const W = 60, H = 80, ID = new Uint8Array(W * H), base = new Uint16Array(W * H);
  for (let y = 10; y < 70; y += 1) for (let x = 10; x < 50; x += 1) ID[y * W + x] = 1;
  const colours = { outline: 48, wall: () => 22, slab: () => 21, pane: 0, paneRim: 2, paneLit: 4 };
  const wins = drawFacade({ W, H, ID, base, id: 1, quad: [[10, 10], [50, 10], [50, 70], [10, 70]], rows: 0, cols: 0, colours });
  assert.equal(base[10 * W + 20], 48);
  const used = new Set(); for (let k = 0; k < W * H; k += 1) if (ID[k]) used.add(base[k]);
  for (const c of [48, 22, 21, 0, 2]) assert.ok(used.has(c), `colour ${c}`);
  assert.ok(wins.length >= 12 && wins.every((w) => w.every((k) => base[k] <= 4)));
});
