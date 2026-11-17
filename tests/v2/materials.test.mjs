import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFoliageHue, greenShade, applyMaterials, FOLIAGE_HUE_MIN, FOLIAGE_HUE_MAX, FOLIAGE_CHROMA_MIN } from '../../src/v2/materials.js';
import { CLASS } from '../../src/v2/classes.js';

test('FOLIAGE_HUE_MIN is 90 degrees (PI/2)', () => {
  assert.equal(FOLIAGE_HUE_MIN, Math.PI / 2);
});

test('FOLIAGE_HUE_MAX is 180 degrees (PI)', () => {
  assert.equal(FOLIAGE_HUE_MAX, Math.PI);
});

test('FOLIAGE_CHROMA_MIN is 4', () => {
  assert.equal(FOLIAGE_CHROMA_MIN, 4);
});

test('isFoliageHue true for olive Lab [55, -4, 20]', () => {
  assert.ok(isFoliageHue([55, -4, 20]));
});

test('isFoliageHue false for grey Lab [55, 0, 1]', () => {
  assert.ok(!isFoliageHue([55, 0, 1]));
});

test('isFoliageHue false for brown Lab [45, 12, 25]', () => {
  assert.ok(!isFoliageHue([45, 12, 25]));
});

test('greenShade picks nearest L', () => {
  const rampLs = [20, 40, 60, 80, 100, 120];
  assert.equal(greenShade(30, rampLs), 0);
  assert.equal(greenShade(50, rampLs), 1);
  assert.equal(greenShade(70, rampLs), 2);
  assert.equal(greenShade(90, rampLs), 3);
  assert.equal(greenShade(110, rampLs), 4);
  assert.equal(greenShade(130, rampLs), 5);
});

test('applyMaterials on 3x1 synthetic frame', () => {
  const W = 3, H = 1;
  const base = new Uint8Array([10, 10, 10]);
  const ID = new Uint8Array([0, 0, 10]);
  const sky = new Uint8Array([1, 1, 0]);
  const seg = new Uint8Array([CLASS.GREEN, CLASS.ROAD, CLASS.CAR]);
  const R = new Float32Array([100, 100, 100]);
  const G = new Float32Array([100, 100, 100]);
  const B = new Float32Array([100, 100, 100]);
  const q = new Uint8Array([5, 5, 5]);
  const lab = (r, g, b) => [60, -5, 15];
  const rampLs = [20, 40, 60, 80, 100, 120];

  const changed = applyMaterials({ base, ID, sky, seg, R, G, B, q, lab, rampLs, W, H });

  assert.equal(changed, 2);
  assert.equal(sky[0], 0);
  assert.equal(base[0], 6 + greenShade(60, rampLs));
  assert.equal(sky[1], 0);
  assert.equal(base[1], 5);
  assert.equal(ID[2], 10);
  assert.equal(sky[2], 0);
  assert.equal(base[2], 10);
});