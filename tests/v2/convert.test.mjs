import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kuwahara, kmeans } from '../../src/v2/convert.js';

const solid = (w, h, at) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i += 1) rgba.set([...at(i % w, (i / w) | 0), 255], i * 4);
  return rgba;
};

test('kuwahara keeps a hard edge hard', () => {
  const out = kuwahara(solid(20, 4, (x) => (x < 10 ? [0, 0, 0] : [255, 255, 255])), 20, 4);
  assert.equal(out[(1 * 20 + 9) * 4], 0);
  assert.equal(out[(1 * 20 + 10) * 4], 255);
});

test('kuwahara flattens texture inside a region', () => {
  const out = kuwahara(solid(16, 16, (x, y) => ((x + y) % 2 ? [100, 100, 100] : [120, 120, 120])), 16, 16);
  assert.ok(Math.abs(out[(8 * 16 + 8) * 4] - 110) <= 2);
});

test('kmeans finds both colours of a two-colour picture', () => {
  const c = kmeans([...Array(30).fill([0.2, 0, 0]), ...Array(30).fill([0.9, 0.1, 0])], 2).sort((a, b) => a[0] - b[0]);
  assert.ok(Math.abs(c[0][0] - 0.2) < 1e-9 && Math.abs(c[1][0] - 0.9) < 1e-9);
});
