// Plays the windows and the paint on the real page in headless Chrome: a window cracked and then broken, a
// wall painted, the sky refusing paint, and what the finder makes of real photographs. Saves screenshots.
//
//   node --experimental-websocket tools/paint-check.mjs [out-dir] [photo.jpg ...]   # photos are paths under the served folder

import { withPage } from './browser.mjs';

const out = process.argv[2] || '.';
const photos = process.argv.slice(3);
const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const results = [];
// a tap at a point of the world, through the same mapping a finger goes through
const TAP = `const tap = async (wx, wy, wait = 420) => {
  const cam = window.dvor8.cam(), r = document.getElementById('frame').getBoundingClientRect(), el = document.getElementById('tilt');
  const o = { clientX: r.left + ((wx - cam.x + 0.5) / cam.w) * r.width, clientY: r.top + ((wy - cam.y + 0.5) / cam.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
  el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o));
  await new Promise((res) => setTimeout(res, wait));
};
const hold = (name) => { for (const b of document.getElementById('palette').children) if (b.textContent.includes(name)) b.click(); };
const painted = () => window.dvor8.world().paint.reduce((a, v) => a + (v ? 1 : 0), 0);`;

await withPage(`${BASE}?debug`, {}, async (page) => {
  await page.wait(2500);
  results.push({ step: 'windows in the drawn yard', ...(await page.run(`${TAP}
    document.getElementById('demoBtn').click(); await new Promise((r) => setTimeout(r, 1900));
    const w = window.dvor8.world(), panes = w.regions.filter((r) => r.kind === 'window'), pane = panes[0];
    const left0 = +document.getElementById('left').textContent, score0 = w.score;
    hold('КАМЕНЬ');
    await tap(pane.x + 3, pane.y + 3);
    const cracked = { hits: pane.hits, gone: pane.gone, score: w.score };
    return { panes: panes.length, things: w.regions.length, left0, pane: [pane.x, pane.y, pane.w, pane.h], cracked };`)) });
  await page.shot(`${out}/paint-1-cracked.png`);
  results.push({ step: 'the window breaks', ...(await page.run(`${TAP}
    const w = window.dvor8.world(), pane = w.regions.filter((r) => r.kind === 'window')[0];
    await tap(pane.x + 4, pane.y + 4, 60);
    const flying = window.dvor8.world() && document.querySelectorAll('.pop').length;
    await new Promise((r) => setTimeout(r, 120));
    return { gone: pane.gone, left: +document.getElementById('left').textContent, score: w.score, words: flying };`)) });
  await page.shot(`${out}/paint-2-broken.png`);
  await page.wait(900);
  results.push({ step: 'paint on the wall, and none on the sky', ...(await page.run(`${TAP}
    const w = window.dvor8.world(), score0 = w.score, left0 = +document.getElementById('left').textContent;
    hold('КРАСКА');
    const hands = [];
    for (const [x, y] of [[30, 120], [60, 112], [150, 118], [100, 200], [20, 150]]) { hands.push(document.getElementById('hand').textContent); await tap(x, y, 520); }
    const onWall = painted(), splats = w.decals.list.length;
    await tap(40, 12, 700);
    return { hands, onWall, splats, afterSky: painted(), skySplats: w.decals.list.length, scoreUp: w.score - score0, leftSame: left0 === +document.getElementById('left').textContent, said: [...document.querySelectorAll('.pop')].map((e) => e.textContent).slice(-3) };`)) });
  await page.shot(`${out}/paint-3-painted.png`);
  results.push({ step: 'the paint is still there after a restart? no: a clean yard is clean', ...(await page.run(`
    document.getElementById('restartBtn').click(); await new Promise((r) => setTimeout(r, 1800));
    const w = window.dvor8.world();
    return { painted: w.paint.reduce((a, v) => a + (v ? 1 : 0), 0), panesStanding: w.regions.filter((r) => r.kind === 'window' && !r.gone).length };`)) });
  await page.run(`document.getElementById('homeBtn').click();`);

  for (const [n, photo] of photos.entries()) {
    await page.run(`
      const blob = await (await fetch(${JSON.stringify(photo)})).blob(), dt = new DataTransfer();
      dt.items.add(new File([blob], 'yard.jpg', { type: 'image/jpeg' }));
      const input = document.getElementById('pic'); input.files = dt.files; input.dispatchEvent(new Event('change'));
      for (let i = 0; i < 300; i += 1) { await new Promise((r) => setTimeout(r, 100)); if (!document.getElementById('empty').hidden || /нашёл/.test(document.getElementById('note').textContent)) break; }
      await new Promise((r) => setTimeout(r, 1900));`);
    await page.shot(`${out}/paint-4-photo${n + 1}.png`);
    results.push({ step: `photo ${photo}`, ...(await page.run(`const w = window.dvor8.world();
      return { note: document.getElementById('note').textContent, things: w ? w.regions.map((r) => r.kind + ' ' + [r.x, r.y, r.w, r.h].join(',')) : [] };`)) });
    await page.run(`document.getElementById('homeBtn').click();`);
  }
  results.push({ step: 'errors', errors: page.errors.filter((e) => !/XNNPACK/.test(e)) });
});
console.log(JSON.stringify(results, null, 1));
process.exit(0);
