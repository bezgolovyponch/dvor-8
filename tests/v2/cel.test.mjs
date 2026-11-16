import { test } from 'node:test';
import assert from 'node:assert/strict';
import { celShade, regionsOf, absorbSmall, rampFor, consolidate } from '../../src/v2/cel.js';
import { CLASS } from '../../src/v2/classes.js';
import { rgbToOklab } from '../../src/v2/oklab.js';

const W = 40, H = 40;
function scene() {
  const cls = new Uint8Array(W * H), lab = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i += 1) {
    const y = (i / W) | 0, x = i % W;
    cls[i] = y < 15 ? CLASS.SKY : x < 20 ? CLASS.BUILDING : CLASS.ROAD;
    lab.set(rgbToOklab(...(y < 15 ? [120, 180, 240] : x < 20 ? [200, 190, 170] : [70, 70, 75])), i * 3);
  }
  return { cls, lab };
}

test('each region is flat: one colour where the photo is one colour', () => {
  const { cls, lab } = scene();
  const { idx, palette } = celShade({ lab, cls, W, H });
  const wall = new Set();
  for (let y = 18; y < 38; y += 1) for (let x = 2; x < 17; x += 1) wall.add(palette[idx[y * W + x]].join());
  assert.equal(wall.size, 1);
});

test('the darker region carries the ink line where it meets a lighter one', () => {
  const { cls, lab } = scene();
  const { idx, palette } = celShade({ lab, cls, W, H });
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  assert.ok(lum(palette[idx[25 * W + 20]]) < lum(palette[idx[25 * W + 30]]) - 15);
});

test('sky gets no ink line', () => {
  const { cls, lab } = scene();
  const { idx, palette } = celShade({ lab, cls, W, H });
  assert.deepEqual(palette[idx[14 * W + 5]], palette[idx[5 * W + 5]]);
});

test('regions smaller than the minimum join their neighbour', () => {
  const cls = new Uint8Array(W * H).fill(CLASS.ROAD);
  cls[200] = CLASS.THING;
  assert.equal(absorbSmall(cls, W, H)[200], CLASS.ROAD);
  assert.equal(regionsOf(cls, W, H).regions.length, 1);
});

test('a ramp goes from dark to light around the region colour', () => {
  const { ramp } = rampFor([[0.5, 0.02, 0.02], [0.52, 0.02, 0.02], [0.48, 0.02, 0.02]]);
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  assert.ok(lum(ramp[0]) < lum(ramp[1]) && lum(ramp[1]) < lum(ramp[2]));
});

test('the frame is held to the colour budget', () => {
  const palette = Array.from({ length: 50 }, (_, i) => [i * 5, 100, 200 - i * 3]);
  const idx = Uint16Array.from({ length: 50 }, (_, i) => i);
  assert.ok(new Set(consolidate(palette, idx, 8).map((c) => c.join())).size <= 8);
});
