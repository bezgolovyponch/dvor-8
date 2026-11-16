import { test } from 'node:test';
import assert from 'node:assert/strict';
import { drawCar, carSprite, bodyRamp, EMPTY } from '../../src/v2/carsprite.js';

test('a drawn car has an outline all round, glass on top and wheels at the bottom', () => {
  const w = 24, h = 16, parts = drawCar(w, h);
  assert.equal(parts[8 * w], 'outline');
  assert.ok(parts.slice(3 * w, 6 * w).includes('glass'));
  assert.ok(parts.slice((h - 3) * w).includes('wheel'));
  assert.equal(parts[0], null);
});

test('the sprite takes the photo car colour as its body', () => {
  const palette = [], darker = [];
  const s = carSprite({ id: 0, x0: 0, y0: 0, w: 20, h: 14, body: [200, 30, 30], palette, darker });
  const body = palette[s.px[10 * 20 + 6]];
  assert.ok(body[0] > body[1] + 60, `red body, got ${body}`);
  assert.ok(s.px.some((v) => v === EMPTY));
  assert.ok(s.glass.some((v) => v === 1));
});

test('the body ramp darkens and lightens the same colour', () => {
  const [d, b, l] = bodyRamp([120, 120, 200]);
  assert.ok(d[2] < b[2] && b[2] <= l[2]);
});
