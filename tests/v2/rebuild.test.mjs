import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homography, inPoly, splitHouses, standsFree, twoTones, v13PaneShare, mergeSameColour, nearestIndex } from '../../src/v2/rebuild.js';

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

test('two tones split lit and shaded blocks at the widest gap', () => {
  const split = twoTones([70, 72, 71, 40, 42]);
  assert.equal(split.cut, 42);
  assert.ok(split.gap > 25);
});

test('a facade stands free when its top meets the sky, and not when trees cover it', () => {
  const W = 4, ID = new Uint8Array(4 * 3), sky = new Uint8Array(12);
  for (let x = 0; x < 4; x += 1) { ID[W + x] = 1; ID[2 * W + x] = 1; }
  sky.fill(1, 0, 4);
  assert.ok(standsFree({ S: { ID }, sky }, 1, W));
  assert.ok(!standsFree({ S: { ID }, sky: new Uint8Array(12) }, 1, W));
});

test('mergeSameColour merges adjacent parts with same palette index', () => {
  const parts = [{ a: 0, b: 10 }, { a: 10, b: 20 }, { a: 20, b: 30 }, { a: 30, b: 40 }];
  const indexOf = (p) => (p.a < 20 ? 5 : 7);
  const merged = mergeSameColour(parts, indexOf);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].a, 0);
  assert.equal(merged[0].b, 20);
  assert.equal(merged[1].a, 20);
  assert.equal(merged[1].b, 40);
});

test('mergeSameColour does not merge non-adjacent parts with same index', () => {
  const parts = [{ a: 0, b: 10 }, { a: 10, b: 20 }, { a: 20, b: 30 }];
  const indexOf = (p) => (p.a === 10 ? 5 : 7);
  const merged = mergeSameColour(parts, indexOf);
  assert.equal(merged.length, 3);
});

test('splitHouses with paletteOf merges parts mapping to same palette index', () => {
  const W = 100, H = 60;
  const colour = { w: W, h: H, at: (x) => (x < 50 ? [200, 170, 90] : [202, 172, 92]) };
  const lab = (r, g, b) => [0, (r - g) / 2, (g - b) / 2];
  const building = { id: 1, quad: [[0, 10], [100, 10], [100, 50], [0, 50]], clip: [[0, 10], [100, 10], [100, 50], [0, 50]] };
  const paletteOf = (rgb) => (rgb[0] > 150 ? 5 : 7);
  const parts = splitHouses(building, colour, () => true, lab, W, H, paletteOf);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].quad[0][0], 0);
  assert.equal(parts[0].quad[1][0], 100);
  assert.equal(parts[0].quad[0][0], 0);
  assert.equal(parts[0].quad[1][0], 100);
});

test('splitHouses with paletteOf still splits when parts map to different palette indices', () => {
  const W = 100, H = 60;
  const colour = { w: W, h: H, at: (x) => (x < 50 ? [200, 170, 90] : [150, 150, 160]) };
  const lab = (r, g, b) => [0, (r - g) / 2, (g - b) / 2];
  const building = { id: 1, quad: [[0, 10], [100, 10], [100, 50], [0, 50]], clip: [[0, 10], [100, 10], [100, 50], [0, 50]] };
  const paletteOf = (rgb) => (rgb[0] > 180 ? 5 : 7);
  const parts = splitHouses(building, colour, () => true, lab, W, H, paletteOf);
  assert.equal(parts.length, 2);
  assert.equal(parts[0].quad[1][0], 50);
});

test('nearestIndex finds closest palette colour by Lab distance', () => {
  const comp = {
    lab: (r, g, b) => [r / 255 * 100, (r - g) / 255 * 128, (g - b) / 255 * 128],
    RGB: [[200, 170, 90], [150, 150, 160], [100, 100, 100]]
  };
  assert.equal(nearestIndex(comp, [202, 172, 92], 0, 3), 0);
  assert.equal(nearestIndex(comp, [148, 148, 158], 0, 3), 1);
});
