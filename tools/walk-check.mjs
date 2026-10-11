// Plays the walking view in headless Chrome: down into the demo yard, along the street past the end of
// the picture, a jump onto a thing, a swig under the alcohol filter. Saves screenshots.
//
//   node --experimental-websocket tools/walk-check.mjs [out-dir] [extra-photo.jpg]

import { withPage } from './browser.mjs';

const out = process.argv[2] || '.', extra = process.argv[3];
const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const key = (type, code) => `window.dispatchEvent(new KeyboardEvent('${type}', { code: '${code}', bubbles: true }));`;
const hold = (code, ms) => `${key('keydown', code)} await new Promise((r) => setTimeout(r, ${ms})); ${key('keyup', code)}`;
const state = `({ view: document.body.dataset.view, score: +document.getElementById('score').textContent, left: +document.getElementById('left').textContent,
  canvas: document.getElementById('yard').width + 'x' + document.getElementById('yard').height, sip: document.getElementById('sipBtn').textContent,
  drunk: document.getElementById('drunkBar').style.width, note: document.getElementById('note').textContent, end: document.getElementById('end').hidden ? '' : document.getElementById('endLine').textContent })`;
const results = [];
await withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.run(`document.getElementById('demoBtn').click(); await new Promise((r) => setTimeout(r, 1900));`);
  await page.run(`document.getElementById('viewBtn').click(); await new Promise((r) => setTimeout(r, 400));`);
  await page.shot(`${out}/w1-down.png`);
  results.push({ step: 'down', ...(await page.run(`return ${state}`)) });
  // up the picture to the things, jumping all the way: whatever is landed on is stomped
  await page.run(`${key('keydown', 'Space')} ${hold('ArrowUp', 1500)} ${hold('ArrowLeft', 900)} ${hold('ArrowRight', 2600)} ${key('keyup', 'Space')}`);
  await page.shot(`${out}/w2-stomp.png`);
  results.push({ step: 'jumped about', ...(await page.run(`return ${state}`)) });
  await page.run(`${key('keydown', 'Space')} ${hold('ArrowDown', 1200)} ${hold('ArrowRight', 2500)}`);
  await page.shot(`${out}/w3-seam.png`);
  await page.run(`${hold('ArrowRight', 5000)} ${key('keyup', 'Space')}`);
  await page.shot(`${out}/w3-street.png`);
  results.push({ step: 'walked right 7.5 s', ...(await page.run(`return ${state}`)) });
  if (extra) {
    await page.run(`
      const blob = await (await fetch(${JSON.stringify(extra)})).blob(), dt = new DataTransfer();
      dt.items.add(new File([blob], 'more.jpg', { type: 'image/jpeg' }));
      const input = document.getElementById('more'); input.files = dt.files; input.dispatchEvent(new Event('change'));
      for (let i = 0; i < 300; i += 1) { await new Promise((r) => setTimeout(r, 100)); if (/встал|не добавился/.test(document.getElementById('note').textContent)) break; }`);
    results.push({ step: 'photo added', ...(await page.run(`return ${state}`)) });
    await page.run(`${key('keydown', 'Space')} ${hold('ArrowRight', 9000)} ${key('keyup', 'Space')}`);
    await page.shot(`${out}/w4-photo.png`);
    results.push({ step: 'walked into it', ...(await page.run(`return ${state}`)) });
  }
  await page.run(`document.getElementById('filters').children[2].click(); await new Promise((r) => setTimeout(r, 200)); document.getElementById('sipBtn').click(); await new Promise((r) => setTimeout(r, 330));`);
  await page.shot(`${out}/w5-swig.png`);
  await page.run(`await new Promise((r) => setTimeout(r, 600)); for (let i = 0; i < 4; i += 1) { document.getElementById('sipBtn').click(); await new Promise((r) => setTimeout(r, 800)); }`);
  results.push({ step: 'bottle drunk dry', ...(await page.run(`return ${state}`)) });
  await page.shot(`${out}/w6-drunk.png`);
  await page.run(`const r = document.getElementById('frame').getBoundingClientRect(), o = { clientX: r.left + r.width * 0.7, clientY: r.top + r.height * 0.5, bubbles: true, cancelable: true, pointerId: 1 };
    document.getElementById('tilt').dispatchEvent(new PointerEvent('pointerdown', o)); await new Promise((r) => setTimeout(r, 500));`);
  results.push({ step: 'threw the empty', ...(await page.run(`return ${state}`)) });
  await page.run(`document.getElementById('viewBtn').click(); await new Promise((r) => setTimeout(r, 400));`);
  await page.shot(`${out}/w7-balcony.png`);
  await page.run(`document.getElementById('viewBtn').click(); await new Promise((r) => setTimeout(r, 300)); document.getElementById('stopBtn').click(); await new Promise((r) => setTimeout(r, 300));`);
  results.push({ step: 'enough', ...(await page.run(`return ${state}`)) });
  await page.shot(`${out}/w8-end.png`);
  results.push({ step: 'end card', news: await page.run(`return document.getElementById('endNews').textContent`), best: await page.run(`return document.getElementById('endBest').textContent`) });
  await page.run(`document.getElementById('shareBtn').click(); await new Promise((r) => setTimeout(r, 400));`);
  results.push({ step: 'shared as a line', shown: await page.run(`return document.getElementById('shared').textContent`) });
  await page.run(`document.getElementById('newBtn').click(); await new Promise((r) => setTimeout(r, 200));`);
  results.push({ step: 'title again', keep: await page.run(`return document.getElementById('keep').textContent`) });
  await page.shot(`${out}/w9-title.png`);
  await page.run(`document.getElementById('albumBtn').click(); await new Promise((r) => setTimeout(r, 200));`);
  await page.shot(`${out}/w10-album.png`);
  results.push({ step: 'errors', errors: page.errors.filter((e) => !/XNNPACK/.test(e)) });
});
for (const r of results) console.log(JSON.stringify(r));
process.exit(0);
