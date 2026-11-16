import { test } from 'node:test';
import assert from 'node:assert/strict';
import { silhouette, targetAt } from '../../src/v2/aim.js';
import { EMPTY } from '../../src/v2/sprites.js';

const W = 20, H = 20;
function world() {
  const px = new Int32Array(16).fill(5);
  px[0] = EMPTY;
  const chunkOf = new Int32Array(W * H).fill(-1), pix = [];
  for (let y = 10; y < 14; y += 1) for (let x = 10; x < 16; x += 1) { chunkOf[y * W + x] = 0; pix.push(y * W + x); }
  return {
    W, H, interior: new Uint8Array(W * H),
    sprites: [{ x0: 2, y0: 2, w: 4, h: 4, px }],
    ruin: { chunkOf, pieces: [{ bid: 3, pix, gone: false }] },
  };
}

test('aiming at a car picks the car, at a wall picks its building, at nothing picks nothing', () => {
  const w = world();
  assert.ok(targetAt(w, 3, 3).car);
  assert.equal(targetAt(w, 2, 2), null);
  assert.equal(targetAt(w, 12, 11).bid, 3);
  assert.equal(targetAt(w, 0, 19), null);
});

test('the silhouette is the outer ring of the object only', () => {
  const w = world();
  const ring = silhouette(w, { bid: 3 });
  assert.equal(ring.length, 2 * 6 + 2 * 2);
  assert.ok(!ring.includes(11 * W + 12));
  const car = silhouette(w, targetAt(w, 3, 3));
  assert.ok(car.includes(2 * W + 3) && !car.includes(2 * W + 2) && !car.includes(3 * W + 3));
});
