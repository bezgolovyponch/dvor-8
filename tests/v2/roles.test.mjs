import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calm, muteTable } from '../../src/v2/roles.js';

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
