import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kmeans, modeFilter, Palette } from '../../src/v2/palette.js';
import { rgbToOklab } from '../../src/v2/oklab.js';
import { AAP_64 } from '../../src/v2/standard-palettes.js';

test('every colour the palette hands out is an entry of the standard palette', () => {
  const p = new Palette([[13, 200, 77]], AAP_64);
  const i = p.addLab(rgbToOklab(120, 30, 40));
  const hex = (c) => c.map((v) => v.toString(16).padStart(2, '0')).join('');
  for (const c of p.rgb) assert.ok(AAP_64.includes(hex(c)));
  assert.equal(p.addLab(rgbToOklab(121, 31, 41)), i);
});

test('darker never points back at the same colour', () => {
  const p = new Palette([], AAP_64);
  p.addLab(rgbToOklab(200, 60, 60));
  const d = p.darker([], 0);
  d.forEach((j, i) => assert.notEqual(j, i));
});

test('k-means separates two colour groups', () => {
  const s = new Float32Array([0.2, 0, 0, 0.21, 0, 0, 0.8, 0.1, 0, 0.81, 0.1, 0]);
  const c = kmeans(s, 2).map((v) => Math.round(v[0] * 10)).sort();
  assert.deepEqual(c, [2, 8]);
});

test('mode filter removes an orphan pixel', () => {
  const W = 5, H = 5, labels = new Int32Array(25).fill(1);
  labels[12] = 7;
  assert.equal(modeFilter(labels, () => true, W, H, 1, 1)[12], 1);
});
