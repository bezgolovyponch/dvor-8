import { withPage } from './browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'v2-regress';
const PHOTOS = ['yard2.jpg', '5.jpg', '2026-10-12 23.06.59.jpg', 'web2.jpg', 'parking.jpg', 'sunset.jpg'];
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
mkdirSync(out, { recursive: true });

const report = [];
for (const photo of PHOTOS) {
  await withPage(`${BASE}v2.html?photo=${encodeURIComponent(`photos-test/${photo}`)}`, { width: 412, height: 860 }, async (page) => {
    for (let i = 0; i < 90; i += 1) { await page.wait(1000); if (await page.run('return Boolean(window.__v2 && (window.__v2.ready || window.__v2.error))')) break; }
    const info = await page.run('return window.__v2');
    const name = photo.replace(/[^a-z0-9]/gi, '');
    await page.run('window.__v2tick(1)');
    const shot = async (tag) => {
      const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
      writeFileSync(`${out}/${name}.${tag}.png`, Buffer.from(url.split(',')[1], 'base64'));
    };
    await shot('a');
    const facts = await page.run(`const w = window.__v2world(); return {
      cars: w.sprites.length,
      carPixels: w.sprites.reduce((t, s) => t + s.n0, 0),
      buildings: new Set(w.ruin.pieces.map((p) => p.bid)).size,
      pieces: w.ruin.pieces.length,
      colours: new Set(Array.from(w.bg)).size,
    }`);
    report.push({ photo, ready: info.ready, error: info.error, ...facts });
  });
}
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
