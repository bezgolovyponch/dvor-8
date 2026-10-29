// THE DAMAGE GATE — our damaged frame against the operator's own engine, damaged the same way.
//
// The operator said the .html can be damaged for comparison, and that is the strongest instrument this project can have
// for the D-model: the SAME engine builds two frames, one of them is hit ten times, the other is hit ten times by the
// APP's own impact path, and the two pictures are compared pixel by pixel. A stand-in for "is our destruction the
// reference's destruction" that cannot be tuned by us: both sides are the operator's own code.
//
//   CHROME=... node --experimental-websocket tools/damage-check.mjs   ->  exit 0 when the frames agree (<= 2%)
import { withPage } from './browser.mjs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { PNG } = require('../gates/node_modules/pngjs');

const BASE = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&debug&engine=1&photo=/game/photos-test/v10a.jpg';
const r = await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  const out = await page.run(`
    // THE OPERATOR'S OWN DAMAGE (the engine alone)
    const { Component } = await import('/game/src/ref/engine.js');
    const c = new Component();
    const i = c.SCENES.findIndex((s) => s.id === 'prague-tower');
    const sc = JSON.parse(JSON.stringify(c.SCENES[i])); sc.src = '/game/photos-test/v10a.jpg';
    const img = new Image(); img.src = sc.src; await img.decode();
    c.tok++; c.S = null; c.build(img, sc, 8);
    for (let n = 0; n < 10; n++) c.damageAt(c.S, 40 + (n % 3) * 6 + 0.5, 120 + n * 9 + 0.5, []);
    const cv = document.createElement('canvas'); cv.width = c.W; cv.height = c.H;
    const g = cv.getContext('2d'); const im = g.createImageData(c.W, c.H); const o = new Uint32Array(im.data.buffer);
    for (let k = 0; k < c.W * c.H; k++) o[k] = c.P32[c.S.base[k]];
    g.putImageData(im, 0, 0);
    const gold = cv.toDataURL('image/png');
    // THE APP'S OWN DAMAGE on the same photograph (the reference scene, the engine path)
    const app = document.getElementById('yard');
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 90000) await new Promise((r) => setTimeout(r, 250));
    let t1 = performance.now();
    while (!window.__world.regions.every((r) => r.seen) && performance.now() - t1 < 60000) await new Promise((r) => setTimeout(r, 200));
    await new Promise((r) => setTimeout(r, 800));
    for (let n = 0; n < 10; n++) window.__strikeAt(40 + (n % 3) * 6, 120 + n * 9, 1);
    await new Promise((r) => setTimeout(r, 800));
    return { gold, ours: app.toDataURL('image/png'), engineFrame: !!window.__world.engineFrame };
  `);
  return out;
});
const a = PNG.sync.read(Buffer.from(r.ours.split(',')[1], 'base64'));
const b = PNG.sync.read(Buffer.from(r.gold.split(',')[1], 'base64'));
let d = 0;
for (let k = 0; k < 288 * 512; k += 1) if (a.data[k * 4] !== b.data[k * 4] || a.data[k * 4 + 1] !== b.data[k * 4 + 1] || a.data[k * 4 + 2] !== b.data[k * 4 + 2]) d += 1;
const pct = (100 * d) / (288 * 512);
console.log(`PREMISES: the same engine (ship-own build, seed 8), the same ten hits at (40,120)…, the app on the engine path (engineFrame=${r.engineFrame})`);
console.log(`DAMAGE CHECK ${pct <= 2 ? 'PASSED' : 'FAILED'}: our damaged frame differs from the operator engine's damaged frame by ${pct.toFixed(2)}% (${d} px, bar <= 2%)`);
process.exit(pct <= 2 ? 0 : 1);
