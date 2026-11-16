import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classMap, downsample, CLASS } from '../../src/v2/classes.js';
import { oklabToRgb } from '../../src/v2/oklab.js';

test('segmenter labels map onto game classes', () => {
  const cls = classMap({ sky: Uint8Array.from([1, 0, 0]), car: Uint8Array.from([0, 1, 0]), sidewalk: Uint8Array.from([0, 0, 1]) }, 3);
  assert.deepEqual(Array.from(cls), [CLASS.SKY, CLASS.CAR, CLASS.ROAD]);
});

test('pixels no label covers take the class before them', () => {
  const cls = classMap({ sky: Uint8Array.from([1, 0, 0]) }, 3);
  assert.deepEqual(Array.from(cls), [CLASS.SKY, CLASS.SKY, CLASS.SKY]);
});

test('downsampling keeps a cell colour by its median, not its mean', () => {
  const sw = 4, sh = 4, rgba = new Uint8ClampedArray(sw * sh * 4);
  for (let i = 0; i < sw * sh; i += 1) rgba.set(i === 0 ? [255, 255, 255, 255] : [200, 20, 20, 255], i * 4);
  const lab = downsample(rgba, sw, sh, 1, 1);
  const [r, g] = oklabToRgb(lab[0], lab[1], lab[2]);
  assert.ok(Math.abs(r - 200) <= 2 && Math.abs(g - 20) <= 2);
});
