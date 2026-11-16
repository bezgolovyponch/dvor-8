import { test } from 'node:test';
import assert from 'node:assert/strict';
import { autoScene, columnProfile, splitAtSteps, fitLine, horizonRow, skyTheme } from '../../src/v2/scene.js';
import { CLASS } from '../../src/v2/classes.js';

const W = 100, H = 160;
function yard({ roofs }) {
  const cls = new Uint8Array(W * H).fill(CLASS.ROAD);
  for (let y = 0; y < 60; y += 1) for (let x = 0; x < W; x += 1) cls[y * W + x] = CLASS.SKY;
  for (const [x0, x1, top] of roofs) for (let y = top; y < 120; y += 1) for (let x = x0; x < x1; x += 1) cls[y * W + x] = CLASS.BUILDING;
  return cls;
}

test('a roof line that jumps splits one wall mask into two buildings', () => {
  const scene = autoScene({ cls: yard({ roofs: [[0, 40, 20], [40, 90, 50]] }), W, H });
  assert.equal(scene.buildings.length, 2);
  assert.deepEqual(scene.buildings[0].quad[0], [0, 20]);
  assert.equal(scene.buildings[1].ground, 120);
});

test('narrow wall slivers are not buildings', () => {
  assert.equal(autoScene({ cls: yard({ roofs: [[0, 10, 20]] }), W, H }).buildings.length, 0);
});

test('the horizon sits just under the sky', () => {
  assert.equal(horizonRow(yard({ roofs: [] }), W, H), 59 + 6);
});

test('column profile and step split work on a pixel list', () => {
  const px = [0, 1, 2, W + 3, 2 * W + 3].map((i) => i + 10 * W);
  const cols = columnProfile(px, W);
  assert.equal(cols.length, 4);
  assert.equal(splitAtSteps(cols).length, 1);
});

test('a line fit returns the straight line through its points', () => {
  const f = fitLine([[0, 1], [10, 21]]);
  assert.equal(f(5), 11);
});

test('sky theme follows the engine rule', () => {
  assert.equal(skyTheme(Array(10).fill([240, 120, 60])), 'sunset');
  assert.equal(skyTheme(Array(10).fill([150, 152, 155])), 'overcast');
  assert.equal(skyTheme(Array(10).fill([90, 160, 240])), 'day');
});
