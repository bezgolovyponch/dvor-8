import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AT_INFINITY_VP, dominantVanishing, perspectiveQuad, planes, strips } from '../../src/v2/perspective.js';

const W = 288, H = 512, VP = [220, 300];

const receding = () => {
  const L = new Float32Array(W * H).fill(0.5);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < 160; x += 1) {
    const yAtWall = VP[1] + (y - VP[1]) * (VP[0] - 0) / (VP[0] - x);
    if (Math.floor(yAtWall / 14) % 2 === 0) L[y * W + x] = 0.2;
  }
  return L;
};

const wallCols = () => Array.from({ length: 160 }, (_, x) => ({ x, top: Math.round(VP[1] - (VP[1] - 40) * (VP[0] - x) / VP[0]), bottom: 470 }));

test('the dominant vanishing point of a receding wall lies where its lines converge', () => {
  const L = receding(), s = strips(wallCols(), L, W, H);
  const vp = dominantVanishing(s, W, H);
  assert.ok(Math.abs(vp[0] - VP[0]) < 15 && Math.abs(vp[1] - VP[1]) < 15, `vp ${vp}`);
});

test('a receding wall becomes one plane whose quad converges to the vanishing point', () => {
  const L = receding(), s = strips(wallCols(), L, W, H);
  const vp = dominantVanishing(s, W, H), facets = planes(s, vp, W, 20);
  assert.equal(facets.length, 1);
  const { quad } = perspectiveQuad(facets[0].cols, facets[0].vp);
  assert.ok(quad[1][1] - quad[0][1] > 50 && quad[3][1] - quad[2][1] > 50);
});

test('a frontal plane keeps horizontal top and bottom edges', () => {
  const cols = Array.from({ length: 60 }, (_, i) => ({ x: 100 + i, top: 200, bottom: 300 }));
  const { quad } = perspectiveQuad(cols, AT_INFINITY_VP);
  assert.equal(quad[0][1], quad[1][1]);
  assert.equal(quad[2][1], quad[3][1]);
});
