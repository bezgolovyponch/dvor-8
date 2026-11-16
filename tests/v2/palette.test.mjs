import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deltaE00 } from '../../src/v2/ciede2000.js';
import { buildPalette } from '../../src/v2/game-palette.js';
import { SOURCES } from '../../src/v2/palettes.js';
import { GAME_PALETTE } from '../../src/v2/engine.js';
import { step, RAMP } from '../../src/v2/theme.js';

test('CIEDE2000 reproduces the published Sharma test pairs', () => {
  assert.equal(deltaE00([50, 2.6772, -79.7751], [50, 0, -82.7485]).toFixed(4), '2.0425');
  assert.equal(deltaE00([50, -1.3802, -84.2814], [50, 0, -82.7485]).toFixed(4), '1.0000');
  assert.equal(deltaE00([50, 2.5, 0], [56, -27, -3]).toFixed(4), '31.9030');
});

test('every game colour comes from a published palette, each used once', () => {
  const published = new Set(SOURCES.flatMap((s) => s.colours.map((c) => `#${c.toLowerCase()}`)));
  assert.equal(GAME_PALETTE.hex.length, 50);
  assert.ok(GAME_PALETTE.hex.every((h) => published.has(h)));
  assert.equal(new Set(GAME_PALETTE.hex).size, 50);
});

test('the builder keeps the layout slot by slot', () => {
  const p = buildPalette(['#ff0000', '#0000ff'], [{ name: 'a', colours: ['0000fe', 'fe0000', '00ff00'] }]);
  assert.deepEqual(p.hex, ['#fe0000', '#0000fe']);
});

test('a ramp step stays inside its ramp', () => {
  assert.equal(step(2, 1), 3);
  assert.equal(step(5, 1), 5);
  assert.equal(step(6, -1), 6);
  assert.equal(step(48, 1), 48);
  assert.equal(RAMP, 6);
});
