import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FACADE_LABEL, OPENING, PANE_SHARE, autocorrPeaks, chooseLattice, shopStart, tileGrid } from '../../src/v2/lattice.js';

const facade = (w, h, bay, floor, win) => {
  const lbl = new Uint8Array(w * h).fill(FACADE_LABEL.facade), gray = new Float64Array(w * h).fill(180);
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const u = x % bay, v = y % floor;
    if (u >= win[0] && u < win[1] && v >= win[2] && v < win[3]) { lbl[y * w + x] = FACADE_LABEL.window; gray[y * w + x] = 60; }
  }
  return { lbl, gray };
};

test('the period of a periodic profile is among its autocorrelation peaks', () => {
  const p = Array.from({ length: 120 }, (_, i) => (i % 15 < 5 ? 1 : 0));
  assert.ok(autocorrPeaks(p, 6, 60).includes(15));
});

test('a regular facade gives back its bay, floor and a full grid of panes', () => {
  const { lbl, gray } = facade(120, 160, 20, 32, [6, 14, 8, 22]);
  const best = chooseLattice(lbl, gray, 120, 160);
  assert.equal(best.bay, 20);
  assert.equal(best.floor, 32);
  assert.ok(best.rects.length >= 20);
});

test('panes stay inside the measured share and the opening ratio', () => {
  const { lbl } = facade(120, 160, 20, 32, [1, 19, 1, 31]);
  const rects = tileGrid(lbl, 120, 160, 20, 32);
  const [a0, b0, a1, b1] = rects[0];
  assert.ok(a1 - a0 <= OPENING * 20 + 1 && b1 - b0 <= OPENING * 32 + 1);
  assert.ok(((a1 - a0) * (b1 - b0)) / (20 * 32) <= PANE_SHARE[1] + 0.05);
});

test('a shop band in the lower part of the facade stops the window grid', () => {
  const { lbl } = facade(100, 100, 20, 25, [5, 15, 5, 18]);
  for (let y = 80; y < 100; y += 1) lbl.fill(FACADE_LABEL.shop, y * 100, (y + 1) * 100);
  assert.equal(shopStart(lbl, 100, 100), 80);
  assert.ok(tileGrid(lbl, 100, 100, 20, 25).every(([, , , b1]) => b1 <= 80));
});
