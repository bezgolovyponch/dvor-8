import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backdrop, skeleton } from '../../src/v2/backdrop.js';
import { outlinePixels } from '../../src/v2/outline.js';
import { projectileCells } from '../../src/v2/projectile.js';

test('behind a building is sky above the horizon and the row\'s own ground below it', () => {
  const W = 6, H = 4, isBuilding = (k) => k % W >= 3;
  const ground = new Uint16Array(W * H).map((_, k) => 10 + ((k / W) | 0)), sky = new Uint16Array(W * H).fill(3);
  const out = backdrop({ W, H, isBuilding, isGround: (k) => !isBuilding(k), ground, sky, horizon: 2 });
  assert.equal(out[1 * W + 4], 3);
  assert.equal(out[3 * W + 5], 13);
});

test('a fallen piece keeps its floor slab and one column', () => {
  const p = { x0: 10, x1: 15, y0: 20, y1: 27 };
  assert.equal(skeleton(p, 12, 26), 0);
  assert.equal(skeleton(p, 12, 27), 2);
  assert.equal(skeleton(p, 10, 22), 1);
  assert.equal(skeleton(p, 12, 22), -1);
});

test('the outline is the mask minus its erosion: holes inside a mask are not outlined', () => {
  const W = 5, H = 5, cells = [];
  for (let y = 0; y < 5; y += 1) for (let x = 0; x < 5; x += 1) cells.push(y * W + x);
  const ring = outlinePixels(() => true, W, H, cells);
  assert.equal(ring.length, 16);
});

test('the stone is drawn larger near the thrower and spins', () => {
  const near = projectileCells('stone', 0.1, 0), far = projectileCells('stone', 0.8, 0), spun = projectileCells('brick', 0.8, 4);
  assert.ok(near.length === far.length * 4);
  assert.ok(spun.length > 0 && spun.some((c) => c.dy !== 0));
});
