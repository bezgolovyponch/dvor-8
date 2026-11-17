import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectAt, dropLoot, stepLoot, LOOT } from '../../src/v2/loot.js';
import { mulberry32 } from '../../src/rng.js';

const world = () => ({ W: 100, H: 100, frame: 0, loot: [] });

test('a wreck bursts into loot that falls and comes to rest on the ground', () => {
  const w = world();
  dropLoot(w, { x: 50, y: 40, ground: 80, coins: 3, gems: 1 }, mulberry32(1));
  assert.equal(w.loot.length, 4);
  for (let i = 0; i < 200; i += 1) stepLoot(w);
  assert.ok(w.loot.every((p) => p.rest && p.y <= 80 && p.y > 60));
});

test('a tap picks up nearby loot for points and stones, and leaves far loot', () => {
  const w = world();
  w.loot = [{ kind: 'coin', x: 10, y: 10, life: 100, rest: true }, { kind: 'gem', x: 12, y: 11, life: 100, rest: true }, { kind: 'coin', x: 80, y: 80, life: 100, rest: true }];
  const got = collectAt(w, 11, 11);
  assert.deepEqual(got, { value: LOOT.coin.value + LOOT.gem.value, throws: LOOT.gem.throws, n: 2 });
  assert.equal(w.loot.length, 1);
});

test('loot left on the ground disappears', () => {
  const w = world();
  w.loot = [{ kind: 'coin', x: 10, y: 10, life: 2, rest: true }];
  stepLoot(w); stepLoot(w);
  assert.equal(w.loot.length, 0);
});
