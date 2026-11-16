import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorld, strike, step, WEAPONS, hitPointsFor } from '../../src/v2/destruct.js';
import { EMPTY } from '../../src/v2/carsprite.js';
import { CLASS } from '../../src/v2/classes.js';
import { mulberry32 } from '../../src/rng.js';

function yard() {
  const W = 60, H = 40, w = 16, h = 8;
  const px = new Int32Array(w * h).fill(1);
  const sprite = { id: 0, label: 'car', x0: 20, y0: 20, w, h, px, glass: new Uint8Array(w * h), n0: w * h, n: w * h, state: 'whole', heat: 0, flash: 0 };
  for (let x = 4; x < 12; x += 1) sprite.glass[2 * w + x] = 1;
  const cls = new Uint8Array(W * H).fill(CLASS.ROAD);
  cls.fill(CLASS.BUILDING, 0, 10 * W);
  return createWorld({ W, H, background: new Uint16Array(W * H), palette: [[90, 90, 90], [200, 30, 30]], darker: [0, 0], cls, sprites: [sprite] });
}

test('hit points grow with the car and stay within three to six', () => {
  assert.equal(hitPointsFor(10), 3);
  assert.equal(hitPointsFor(100000), 6);
});

test('a stone takes pixels off the car and a hit point', () => {
  const world = yard(), s = world.sprites[0];
  const r = strike(world, 28, 24, WEAPONS.stone, mulberry32(1));
  assert.equal(r.target, 'car');
  assert.ok(r.removed > 0);
  assert.equal(s.hp, s.hp0 - 1);
});

test('hitting near a window shatters the whole pane', () => {
  const world = yard(), s = world.sprites[0];
  strike(world, 28, 22, WEAPONS.stone, mulberry32(2));
  assert.equal(s.glass.reduce((a, b) => a + b, 0), 0);
});

test('the car explodes after its hit points and leaves a hulk', () => {
  const world = yard(), s = world.sprites[0], rng = mulberry32(3);
  for (let i = 0; i < s.hp0; i += 1) strike(world, 28, 24, WEAPONS.stone, rng);
  assert.equal(s.state, 'wreck');
  assert.equal(world.wrecked, 1);
  assert.ok(s.px.some((v) => v <= -2), 'charred pixels remain');
  assert.ok(world.blasts.length > 0);
});

test('a wall hit opens a hole and its debris falls and settles', () => {
  const world = yard(), rng = mulberry32(4);
  const r = strike(world, 30, 5, WEAPONS.brick, rng);
  assert.equal(r.target, 'building');
  assert.ok(world.interior.some((v) => v === 1));
  for (let i = 0; i < 300; i += 1) step(world, rng);
  assert.ok(world.particles.filter((p) => p.kind === 'debris').length === 0);
});

test('sky takes no damage', () => {
  const world = yard();
  world.cls.fill(CLASS.SKY, 0, 10 * world.W);
  assert.equal(strike(world, 30, 5, WEAPONS.stone, mulberry32(5)).target, 'sky');
  assert.ok(world.sprites[0].px.every((v) => v !== EMPTY));
});
