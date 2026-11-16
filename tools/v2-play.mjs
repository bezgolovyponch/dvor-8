import { withPage } from './browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'v2-play';
const photo = process.argv[3] || 'photos-test/yard2.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
mkdirSync(out, { recursive: true });

await withPage(`${BASE}v2.html?photo=${encodeURIComponent(photo)}`, { width: 412, height: 860 }, async (page) => {
  for (let i = 0; i < 90; i += 1) { await page.wait(1000); if (await page.run('return Boolean(window.__v2 && window.__v2.ready)')) break; }
  const log = { throws: 0, pickups: 0, maxCombo: 1, gemsThrows: 0, frames: 0 };
  const frame = async (name) => {
    const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
    writeFileSync(`${out}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  };
  await frame('0-start');
  for (let turn = 0; turn < 200; turn += 1) {
    const r = JSON.parse(await page.run('return JSON.stringify(window.__v2round())'));
    log.maxCombo = Math.max(log.maxCombo, r.mult);
    if (r.over) break;
    const loot = r.onGround.filter((p) => p.rest);
    if (loot.length) {
      const before = r.throws;
      await page.run(`window.__v2throw(${loot[0].x + 1}, ${loot[0].y + 1}); window.__v2tick(2)`);
      const after = JSON.parse(await page.run('return JSON.stringify(window.__v2round())'));
      log.pickups += 1; log.gemsThrows += Math.max(0, after.throws - before);
      continue;
    }
    if (r.throws > 0) {
      const target = await page.run(`const w = window.__v2world(); const live = w.sprites.filter((s) => s.state !== 'wreck'); if (live.length) { const s = live[0]; return [s.x0 + s.w / 2, s.y0 + s.h / 2]; } const p = w.ruin.pieces.find((q) => !q.gone); return p ? [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2] : [144, 300];`);
      await page.run(`window.__v2throw(${target[0]}, ${target[1]}); window.__v2tick(20)`);
      log.throws += 1;
      if (log.throws === 6) await frame('1-mid');
    } else await page.run('window.__v2tick(30)');
  }
  await page.run('window.__v2tick(1)');
  await frame('2-end');
  const r = JSON.parse(await page.run('return JSON.stringify(window.__v2round())'));
  const endVisible = await page.run("return !document.getElementById('end').hidden");
  const endText = await page.run("return document.getElementById('end').innerText");
  await page.shot(`${out}/3-endcard.png`);
  const w = await page.run('const w = window.__v2world(); return { wrecked: w.wrecked, cars: w.sprites.length, piecesGone: w.ruin.pieces.filter((p) => p.gone).length, pieces: w.ruin.pieces.length }');
  console.log(JSON.stringify({ ...log, score: r.score, best: r.best, loot: r.loot, over: r.over, endVisible, endText: endText.replace(/\n/g, ' | '), ...w }));
});
