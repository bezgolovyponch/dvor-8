import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tilePieces, TILE_W, TILE_H } from '../../src/v2/pieces.js';
import { CLASS } from '../../src/v2/classes.js';

const W = 28, H = 30;
function wall() {
  const cls = new Uint8Array(W * H).fill(CLASS.SKY), idx = new Uint8Array(W * H).fill(1);
  for (let y = 6; y < 24; y += 1) for (let x = 0; x < 14; x += 1) cls[y * W + x] = CLASS.BUILDING;
  idx[8 * W + 2] = 0;
  return { cls, idx, lightness: [0.1, 0.6], W, H };
}

test('a wall is cut into tiles that rest on the tile below', () => {
  const { chunks, chunkOf } = tilePieces(wall());
  assert.equal(chunks.length, (14 / TILE_W) * (18 / TILE_H));
  const top = chunks[chunkOf[6 * W + 0]], under = chunks[chunkOf[(6 + TILE_H) * W + 0]];
  assert.deepEqual(top.sup, [under.index]);
});

test('the bottom tiles fall to the foot of the wall', () => {
  const { chunks, chunkOf } = tilePieces(wall());
  assert.equal(chunks[chunkOf[23 * W + 3]].gy, 24);
});

test('a tile window is its darkest cluster', () => {
  const { chunks, chunkOf } = tilePieces(wall());
  assert.deepEqual(chunks[chunkOf[8 * W + 2]].wins, [[8 * W + 2]]);
});

test('sky is never a piece', () => {
  assert.equal(tilePieces(wall()).chunkOf[0], -1);
});
