import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vehicleBoxes, carInstances, roundCorners, overlapOfSmaller } from '../../src/v2/instances.js';

const W = 60, H = 60;
const box = (x, y, w, h, score = 0.9, label = 'car') => ({ label, score, x: x / W, y: y / H, w: w / W, h: h / H });

test('a car and a truck box on the same vehicle become one', () => {
  const kept = vehicleBoxes([box(10, 10, 20, 10), box(12, 10, 16, 10, 0.5, 'truck')], new Uint8Array(W * H), W, H);
  assert.equal(kept.length, 1);
});

test('a box holding several cars is dropped in favour of the cars', () => {
  const dets = [box(0, 0, 50, 20, 0.5), box(2, 2, 10, 8), box(20, 2, 10, 8), box(36, 2, 10, 8)];
  const kept = vehicleBoxes(dets, new Uint8Array(W * H), W, H);
  assert.equal(kept.length, 3);
});

test('a weak box counts only when the segmenter sees a car inside it', () => {
  const mask = new Uint8Array(W * H);
  for (let y = 30; y < 40; y += 1) for (let x = 30; x < 40; x += 1) mask[y * W + x] = 1;
  const kept = vehicleBoxes([box(30, 30, 10, 10, 0.2), box(5, 5, 10, 10, 0.2)], mask, W, H);
  assert.equal(kept.length, 1);
  assert.ok(Math.abs(kept[0].x - 0.5) < 1e-9);
});

test('the front car wins the pixels two boxes share', () => {
  const mask = new Uint8Array(W * H);
  for (let y = 10; y < 40; y += 1) for (let x = 10; x < 30; x += 1) mask[y * W + x] = 1;
  const { inst, list } = carInstances([box(10, 10, 20, 16), box(10, 20, 20, 20)], mask, W, H);
  assert.equal(list.length, 2);
  const front = list.find((c) => c.y1 >= 39);
  assert.equal(inst[22 * W + 15], front.id);
});

test('rounded corners cut the box corners and keep the middle', () => {
  const px = [];
  for (let y = 0; y < 10; y += 1) for (let x = 0; x < 20; x += 1) px.push(y * W + x);
  const kept = new Set(roundCorners(px, W));
  assert.ok(!kept.has(0) && kept.has(5 * W + 10));
});

test('overlap is measured against the smaller box', () => {
  assert.equal(overlapOfSmaller({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 2, w: 4, h: 4 }), 1);
});
