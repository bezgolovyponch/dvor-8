import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gaussian, hsvToRgb, msrcr, rgbToHsv, stretchHsv } from '../../src/v2/retinex.js';

test('hsv conversion round-trips', () => {
  for (const c of [[200, 120, 40], [10, 200, 90], [128, 128, 128]]) {
    const back = hsvToRgb(...rgbToHsv(...c));
    back.forEach((v, i) => assert.ok(Math.abs(v - c[i]) < 1e-6));
  }
});

test('the box-cascade gaussian keeps a flat image flat', () => {
  const out = gaussian(new Float32Array(400).fill(7), 20, 20, 5);
  assert.ok(out.every((v) => Math.abs(v - 7) < 1e-4));
});

test('msrcr lifts a dark half of the image towards the bright half', () => {
  const W = 40, H = 20, rgb = new Float32Array(W * H * 3);
  for (let k = 0; k < W * H; k += 1) { const v = k % W < 20 ? 40 : 160; rgb.set([v, v * 0.95, v * 0.9], k * 3); }
  const out = msrcr(rgb, W, H, { sigmas: [3, 8], gain: 5, offset: 25, alpha: 125, beta: 46, clip: [0.01, 0.99] });
  const dark = out[(10 * W + 5) * 3], bright = out[(10 * W + 35) * 3];
  assert.ok(bright - dark < 120);
});

test('the hsv stretch spreads saturation inside the mask', () => {
  const rgb = new Float32Array([100, 95, 90, 100, 100, 100, 120, 100, 90]);
  const out = stretchHsv(rgb, [1, 1, 1]);
  const sat = (i) => rgbToHsv(out[i * 3], out[i * 3 + 1], out[i * 3 + 2])[1];
  assert.ok(sat(2) > 0.9 && sat(1) < 0.05);
});
