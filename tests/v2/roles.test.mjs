import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calm, muteTable, simplifyCar } from '../../src/v2/roles.js';

const lab = (r, g, b) => [(r + g + b) / 3, r - g, b - g];

test('a saturated background colour mutes to a greyer, darker entry', () => {
  const rgb = [[200, 40, 40], [120, 100, 100], [250, 250, 250]];
  assert.equal(muteTable(rgb, lab)[0], 1);
});

test('calm turns ground speckle into one flat area', () => {
  const W = 7, H = 7, a = new Uint16Array(49).fill(3);
  a[24] = 9; a[10] = 8;
  const out = calm(a, () => true, W, H, 2, 1);
  assert.ok(out.every((v) => v === 3));
});

test('a small car becomes a flat sprite: outline, lit roof edge, body, dark sill', () => {
  const w = 6, h = 8, px = new Int32Array(w * h).fill(13), glass = new Uint8Array(w * h);
  px[2 * w + 2] = 20;
  simplifyCar({ px, glass, w, h, darker: Array.from({ length: 50 }, (_, i) => i - 1), outline: 48 });
  assert.equal(px[0], 48);
  assert.equal(px[1 * w + 2], 14);
  assert.equal(px[3 * w + 2], 13);
  assert.equal(px[6 * w + 2], 12);
});
