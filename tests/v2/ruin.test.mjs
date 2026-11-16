import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRuin, hitFacade, stepRuin, roomColour } from '../../src/v2/ruin.js';
import { createWorld, step, WEAPONS } from '../../src/v2/destruct.js';
import { CLASS } from '../../src/v2/classes.js';
import { mulberry32 } from '../../src/rng.js';

function tower() {
  const W = 40, H = 60, N = W * H;
  const chunkOf = new Int32Array(N).fill(-1);
  const chunks = [];
  for (let row = 0; row < 3; row += 1) {
    const y0 = 10 + row * 10, pix = [];
    for (let y = y0; y < y0 + 10; y += 1) for (let x = 10; x < 20; x += 1) { pix.push(y * W + x); chunkOf[y * W + x] = row; }
    chunks.push({ index: row, pix, wins: [[(y0 + 3) * W + 14, (y0 + 3) * W + 15]], sup: row < 2 ? [row + 1] : [], gy: 50, x0: 10, y0, x1: 19, y1: y0 + 9, near: [] });
  }
  const cls = new Uint8Array(N).fill(CLASS.ROAD);
  for (const c of chunks) for (const k of c.pix) cls[k] = CLASS.BUILDING;
  const ruin = createRuin({ W, chunks, chunkOf, crackColour: 1 });
  return createWorld({ W, H, background: new Uint16Array(N), palette: [[120, 120, 130], [10, 10, 10]], darker: [1, 1], cls, sprites: [], ruin });
}

test('the first hit breaks the windows of the piece and cracks it', () => {
  const world = tower(), rng = mulberry32(1);
  hitFacade(world, 25 * 40 + 12, WEAPONS.stone, rng);
  assert.equal(world.interior[23 * 40 + 14], 2);
  assert.ok(world.bg.some((v) => v === 1), 'a crack is drawn');
  assert.equal(world.ruin.pieces[1].gone, false);
});

test('a piece out of hit points falls as one block and opens a room', () => {
  const world = tower(), rng = mulberry32(2);
  for (let i = 0; i < 3; i += 1) hitFacade(world, 35 * 40 + 12, WEAPONS.stone, rng);
  assert.equal(world.ruin.pieces[2].gone, true);
  assert.equal(world.ruin.blocks.length, 1);
  assert.equal(world.interior[35 * 40 + 12], 1);
});

test('the falling block lands as rubble and dust', () => {
  const world = tower(), rng = mulberry32(3);
  for (let i = 0; i < 3; i += 1) hitFacade(world, 35 * 40 + 12, WEAPONS.stone, rng);
  for (let i = 0; i < 60 && world.ruin.blocks.length; i += 1) stepRuin(world, rng);
  assert.equal(world.ruin.blocks.length, 0);
  assert.ok(world.ruin.dust.length > 0);
});

test('pieces that lose their support fall by themselves', () => {
  const world = tower(), rng = mulberry32(4);
  for (let i = 0; i < 3; i += 1) hitFacade(world, 35 * 40 + 12, WEAPONS.stone, rng);
  for (let i = 0; i < 60; i += 1) step(world, rng);
  assert.ok(world.ruin.pieces.every((p) => p.gone), 'the whole column came down');
});

test('an opened room shows a floor slab at its foot', () => {
  const piece = { x0: 0, y0: 0, x1: 9, y1: 9 };
  assert.notDeepEqual(roomColour(piece, 3, 9), roomColour(piece, 3, 5));
});
