import { test } from 'node:test';
import assert from 'node:assert/strict';
import { V13Snap, ciedeIndex } from '../../src/v2/v13-snap.js';
import { srgbToLab } from '../../src/v2/ciede2000.js';

const PAL = ['#1d2b53', '#323f7a', '#4d65b4', '#4d9be6', '#8fd3ff', '#d6f1ff', '#0e3b30', '#165a4c', '#239063', '#1ebc73', '#30e1b9', '#91db69', '#2e1f1a', '#4c2f22', '#6e4a36', '#9e6b47', '#bf8f63', '#e3bd8f', '#1f1d22', '#34313a', '#4a4650', '#625e68', '#7e7a84', '#a39fa8', '#1e2230', '#323a4c', '#56627a', '#8a98ad', '#c4d0dc', '#ffffff', '#4a1414', '#6e2727', '#b33831', '#e83b3b', '#e6904e', '#fbb954', '#2e1a3a', '#5a2a5e', '#a24b6f', '#c32454', '#f04f78', '#fca790', '#5e4a22', '#8a6f30', '#c09a3e', '#f9c22b', '#fbe17a', '#fff6c2', '#1a1220', '#0b0018'];

const RGB = PAL.map(h => [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16)));
const paletteLabs = RGB.slice(0, 48).map(([r, g, b]) => srgbToLab(r, g, b));

test('ciedeIndex: pure palette colours map to themselves (index 9)', () => {
  const [r, g, b] = RGB[9];
  const idx = ciedeIndex(r, g, b, paletteLabs);
  assert.equal(idx, 9);
});

test('ciedeIndex: pure palette colours map to themselves (index 29)', () => {
  const [r, g, b] = RGB[29];
  const idx = ciedeIndex(r, g, b, paletteLabs);
  assert.equal(idx, 29);
});

test('ciedeIndex: olive grass colour [96,110,62] maps to green or olive ramp, not grey', () => {
  const idx = ciedeIndex(96, 110, 62, paletteLabs);
  const inGreenRamp = idx >= 6 && idx <= 11;
  const inOliveRamp = idx >= 42 && idx <= 47;
  const inGrey = idx >= 18 && idx <= 29;
  assert.ok(inGreenRamp || inOliveRamp, `index ${idx} should be in green ramp 6-11 or olive ramp 42-47`);
  assert.ok(!inGrey, `index ${idx} should NOT be in grey range 18-29`);
});

test('ciedeIndex: white car [235,235,238] maps to 28 or 29', () => {
  const idx = ciedeIndex(235, 235, 238, paletteLabs);
  assert.ok(idx === 28 || idx === 29, `index ${idx} should be 28 or 29`);
});

test('ciedeIndex: result is never 48 or 49 (outline/void)', () => {
  for (let r = 0; r < 256; r += 17) {
    for (let g = 0; g < 256; g += 17) {
      for (let b = 0; b < 256; b += 17) {
        const idx = ciedeIndex(r, g, b, paletteLabs);
        assert.ok(idx < 48, `index ${idx} for [${r},${g},${b}] should be < 48`);
      }
    }
  }
});

test('V13Snap with ciede2000: pure palette colours map to themselves (index 9)', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  const [r, g, b] = RGB[9];
  const idx = snap.quant(r, g, b);
  assert.equal(idx, 9);
});

test('V13Snap with ciede2000: pure palette colours map to themselves (index 29)', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  const [r, g, b] = RGB[29];
  const idx = snap.quant(r, g, b);
  assert.equal(idx, 29);
});

test('V13Snap with ciede2000: olive grass colour [96,110,62] maps to green or olive ramp, not grey', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  const idx = snap.quant(96, 110, 62);
  const inGreenRamp = idx >= 6 && idx <= 11;
  const inOliveRamp = idx >= 42 && idx <= 47;
  const inGrey = idx >= 18 && idx <= 29;
  assert.ok(inGreenRamp || inOliveRamp, `index ${idx} should be in green ramp 6-11 or olive ramp 42-47`);
  assert.ok(!inGrey, `index ${idx} should NOT be in grey range 18-29`);
});

test('V13Snap with ciede2000: white car [235,235,238] maps to 28 or 29', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  const idx = snap.quant(235, 235, 238);
  assert.ok(idx === 28 || idx === 29, `index ${idx} should be 28 or 29`);
});

test('V13Snap with ciede2000: result is never 48 or 49', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  for (let r = 0; r < 256; r += 17) {
    for (let g = 0; g < 256; g += 17) {
      for (let b = 0; b < 256; b += 17) {
        const idx = snap.quant(r, g, b);
        assert.ok(idx < 48, `index ${idx} for [${r},${g},${b}] should be < 48`);
      }
    }
  }
});

test('V13Snap with ciede2000: cache returns same result on repeated calls', () => {
  const snap = new V13Snap({ match: 'ciede2000' });
  snap.initPal();
  const idx1 = snap.quant(100, 120, 80);
  const idx2 = snap.quant(100, 120, 80);
  assert.equal(idx1, idx2);
});