import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kmeans, despeckle, pixelate, CLASS } from '../../src/v2/pixelate.js';
import { rgbToOklab } from '../../src/v2/oklab.js';

const frameOf = (W, H, colourAt) => {
  const lab = new Float32Array(W * H * 3);
  for (let i = 0; i < W * H; i += 1) lab.set(rgbToOklab(...colourAt(i % W, (i / W) | 0)), i * 3);
  return lab;
};

test('kmeans separates two distinct colours', () => {
  const pts = [...Array(20).fill([0.2, 0, 0]), ...Array(20).fill([0.8, 0.1, 0.1])];
  const c = kmeans(pts, 2).sort((a, b) => a[0] - b[0]);
  assert.ok(Math.abs(c[0][0] - 0.2) < 1e-6 && Math.abs(c[1][0] - 0.8) < 1e-6);
});

test('despeckle replaces a lone pixel with its surroundings', () => {
  const idx = new Uint16Array(25).fill(1);
  idx[12] = 7;
  despeckle(idx, 5, 5);
  assert.equal(idx[12], 1);
});

test('a colour that only appears at the bottom of a tall frame still gets a palette entry', () => {
  const W = 120, H = 400;
  const lab = frameOf(W, H, (x, y) => (y < 340 ? [120, 180, 240] : [60, 150, 40]));
  const cls = new Uint8Array(W * H).fill(CLASS.SKY).fill(CLASS.GREEN, 340 * W);
  const { idx, palette } = pixelate({ lab, cls, inst: null, W, H });
  const [r, g, b] = palette[idx[(H - 5) * W + 10]];
  assert.ok(g > r + 40 && g > b + 40, `bottom pixel is green, got ${[r, g, b]}`);
});

test('every car instance keeps its own colours', () => {
  const W = 40, H = 40;
  const lab = frameOf(W, H, (x, y) => (x > 10 && x < 20 && y > 10 && y < 20 ? [200, 30, 40] : [90, 90, 95]));
  const inst = new Int16Array(W * H).fill(-1);
  for (let y = 11; y < 20; y += 1) for (let x = 11; x < 20; x += 1) inst[y * W + x] = 0;
  const { idx, palette, groupOf } = pixelate({ lab, cls: new Uint8Array(W * H).fill(CLASS.ROAD), inst, W, H });
  const v = idx[15 * W + 15];
  assert.equal(groupOf[v], 'car0');
  assert.ok(palette[v][0] > 150 && palette[v][1] < 90);
});
