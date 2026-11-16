import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutBuildings, layoutCars, layoutTrees, STREET, TILE } from '../../src/level/layout.js';

test('buildings stand on the street, fit the frame and snap to whole tiles', () => {
  const b = layoutBuildings([{ x: 10, w: 140, h: 300 }, { x: 160, w: 90, h: 120 }, { x: 250, w: 200, h: 200 }]);
  assert.ok(b.every((q) => q.y1 === STREET.ground - 1 && (q.x1 - q.x0 + 1) % TILE === 0 && q.x1 < 288));
  for (let i = 1; i < b.length; i += 1) assert.ok(b[i].x0 > b[i - 1].x1);
});

test('trees go into the gaps between buildings', () => {
  const b = [{ x0: 32, x1: 95 }, { x0: 160, x1: 255 }];
  const t = layoutTrees([{}, {}, {}], b);
  assert.ok(t.every((q) => q.x + TILE <= 288 && !b.some((s) => q.x + TILE > s.x0 && q.x < s.x1)));
});

test('cars fill both lanes and never leave the frame', () => {
  const placed = layoutCars(new Array(12).fill({}), new Array(12).fill({ w: 60, h: 30 }));
  assert.ok(placed.length >= 6 && placed.every((p) => p.x0 + p.w <= 284));
  assert.deepEqual([...new Set(placed.map((p) => p.lane))].sort(), [0, 1]);
});
