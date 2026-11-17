import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homography, inPoly, splitHouses, v13PaneShare } from '../../src/v2/rebuild.js';

test('the homography maps the unit square onto the quad corners', () => {
  const quad = [[10, 20], [90, 40], [95, 200], [5, 180]], f = homography([[0, 0], [1, 0], [1, 1], [0, 1]], quad);
  [[0, 0], [1, 0], [1, 1], [0, 1]].forEach((p, i) => f(...p).forEach((v, j) => assert.ok(Math.abs(v - quad[i][j]) < 1e-6)));
});

test('point in polygon', () => {
  assert.ok(inPoly([[0, 0], [10, 0], [10, 10], [0, 10]], 5, 5));
  assert.ok(!inPoly([[0, 0], [10, 0], [10, 10], [0, 10]], 15, 5));
});

test('a wall of two differently coloured houses is cut where the colour changes', () => {
  const W = 100, H = 60;
  const colour = { w: W, h: H, at: (x) => (x < 50 ? [200, 170, 90] : [150, 150, 160]) };
  const lab = (r, g, b) => [0, (r - g) / 2, (g - b) / 2];
  const building = { id: 1, quad: [[0, 10], [100, 10], [100, 50], [0, 50]], clip: [[0, 10], [100, 10], [100, 50], [0, 50]] };
  const parts = splitHouses(building, colour, () => true, lab, W, H);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].quad[1][0], 50);
});

test('the v13 pane share counts glass-ramp pixels', () => {
  const comp = { S: { base: Uint8Array.from([1, 2, 20, 20]) } };
  assert.equal(v13PaneShare(comp, [0, 1, 2, 3]), 0.5);
});
