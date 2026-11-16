import { withPage } from './browser.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] || 'v2-out';
const photo = process.argv[3] || 'photos-test/parking.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4320/';
mkdirSync(out, { recursive: true });

await withPage(`${BASE}v2.html?photo=${encodeURIComponent(photo)}${process.env.PAL ? `&pal=${process.env.PAL}` : ''}`, { width: 412, height: 860 }, async (page) => {
  const frame = async (name) => {
    const url = await page.run("return document.getElementById('screen').toDataURL('image/png')");
    writeFileSync(`${out}/${name}.frame.png`, Buffer.from(url.split(',')[1], 'base64'));
  };
  let info = null;
  for (let i = 0; i < 120 && !(info && 'ready' in info); i += 1) {
    await page.wait(1000);
    info = await page.run('return window.__v2 || null');
  }
  console.log(JSON.stringify({ ...info, sprites: undefined, facades: undefined, spriteCount: info?.sprites?.length }));
  if (!info?.ready) return;
  if (process.env.DUMP) writeFileSync(process.env.DUMP, JSON.stringify(await page.run('return window.__v2dump()')));
  await page.run('window.__v2tick(1)');
  await page.shot(`${out}/1-built.png`);
  await frame('1');
  await page.run("document.getElementById('view').click(); window.__v2tick(1)");
  await page.shot(`${out}/2-classes.png`);
  await page.run("document.getElementById('view').click(); window.__v2tick(1)");
  await frame('0');
  await page.run("document.getElementById('view').click(); window.__v2tick(1)");
  const targets = info.sprites.slice().sort((a, b) => b.n - a.n).slice(0, 4);
  for (let round = 0; round < 3; round += 1) {
    for (const s of targets) await page.run(`window.__v2throw(${s.x0 + s.w / 2}, ${s.y0 + s.h * 0.45}); window.__v2tick(4)`);
    await page.run('window.__v2tick(14)');
  }
  await page.shot(`${out}/3-hit.png`);
  await frame('3');
  for (let round = 0; round < 6; round += 1) {
    for (const s of targets) await page.run(`window.__v2throw(${s.x0 + s.w * (0.3 + 0.1 * round)}, ${s.y0 + s.h * 0.6}); window.__v2tick(3)`);
    await page.run('window.__v2tick(10)');
  }
  const walls = (info.facades || []).filter((_, i) => i % 2 === 0).slice(0, 14);
  for (let round = 0; round < 3; round += 1) {
    for (const f of walls) await page.run(`window.__v2throw(${f.x}, ${f.y}); window.__v2tick(2)`);
    await page.run('window.__v2tick(18)');
  }
  await page.run('window.__v2tick(6)');
  await page.shot(`${out}/4-explode.png`);
  await frame('4');
  await page.run('window.__v2tick(90)');
  await page.shot(`${out}/5-after.png`);
  await frame('5');
  const end = await page.run("const w = window.__v2world(); return { score: w.score, wrecked: w.wrecked, particles: w.particles.length, states: w.sprites.map((s) => s.state).join(',') }");
  console.log(JSON.stringify(end));
  console.log(JSON.stringify({ errors: page.errors }));
  writeFileSync(`${out}/info.json`, JSON.stringify(info, null, 1));
});
