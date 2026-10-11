// Plays the real page in headless Chrome: the demo yard in each mode, then real photographs through the
// detector. Prints what happened and saves screenshots.
//
//   python3 -m http.server 4310 &
//   node --experimental-websocket tools/check.mjs [out-dir] [photo.jpg ...]     # photos are paths under the served folder

import { withPage } from './browser.mjs';

const out = process.argv[2] || '.';
const photos = process.argv.slice(3);
const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const state = `({ stage: document.getElementById('end').hidden ? (document.getElementById('empty').hidden ? (document.getElementById('title').hidden ? 'playing' : 'title') : 'empty') : 'end',
  score: +document.getElementById('score').textContent, left: +document.getElementById('left').textContent, combo: document.getElementById('combo').textContent,
  hand: document.getElementById('hand').textContent, note: document.getElementById('note').textContent, endLine: document.getElementById('endLine').textContent, best: document.getElementById('endBest').textContent })`;
// taps: a grid swept over the picture, the way an impatient thumb would
const sweep = (gap, rounds, upto = 1) => `
  const el = document.getElementById('tilt');
  for (let k = 0; k < ${rounds}; k += 1) for (let fy = 0.06; fy < ${upto}; fy += ${gap > 300 ? 0.09 : 0.06}) for (let fx = 0.06; fx < 1; fx += ${gap > 300 ? 0.16 : 0.07}) {
    if (!document.getElementById('end').hidden) break;
    const r = document.getElementById('frame').getBoundingClientRect(), o = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, cancelable: true, pointerId: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o));
    await new Promise((res) => setTimeout(res, ${gap}));
  }`;
const results = [];

await withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  results.push({ step: 'title', ...(await page.run(`return ${state}`)) });
  await page.shot(`${out}/0-title.png`);

  const modes = ['sober', 'weed', 'alcohol', 'depression'];
  for (let i = 0; i < modes.length; i += 1) {
    await page.run(`document.getElementById('demoBtn').click(); await new Promise((r) => setTimeout(r, 1900)); document.getElementById('filters').children[${i}].click(); await new Promise((r) => setTimeout(r, 300));`);
    await page.run(i === 3 ? sweep(760, 1, 0.74).replace('fy = 0.06', 'fy = 0.5') : sweep(45, 1, 0.74));
    await page.wait(250);
    await page.shot(`${out}/1-demo-${modes[i]}.png`);
    const mid = await page.run(`return ${state}`);
    await page.run(i === 3 ? sweep(760, 1).replace('fy = 0.06', 'fy = 0.5') : sweep(30, 6));
    await page.wait(1600);
    results.push({ step: `demo ${modes[i]}`, midScore: mid.score, midLeft: mid.left, ...(await page.run(`return ${state}`)) });
    if (i === 0) await page.shot(`${out}/2-end.png`);
    await page.run(`document.getElementById('newBtn').click(); document.getElementById('filters').children[0].click();`);
  }

  for (const [n, photo] of photos.entries()) {
    await page.run(`
      const blob = await (await fetch(${JSON.stringify(photo)})).blob(), dt = new DataTransfer();
      dt.items.add(new File([blob], 'yard.jpg', { type: 'image/jpeg' }));
      const input = document.getElementById('shot'); input.files = dt.files; input.dispatchEvent(new Event('change'));
      for (let i = 0; i < 300; i += 1) { await new Promise((r) => setTimeout(r, 100)); if (!document.getElementById('empty').hidden || /нашёл/.test(document.getElementById('note').textContent)) break; }
      await new Promise((r) => setTimeout(r, 1900));`);
    await page.shot(`${out}/3-photo${n + 1}-ready.png`);
    const ready = await page.run(`return ${state}`);
    if (ready.stage === 'playing') { await page.run(sweep(30, 1)); await page.wait(300); await page.shot(`${out}/3-photo${n + 1}-played.png`); }
    results.push({ step: `photo ${photo}`, targets: ready.left, ...(await page.run(`return ${state}`)) });
    await page.run(`document.getElementById('homeBtn').click();`);
  }
  results.push({ step: 'errors', errors: page.errors.filter((e) => !/XNNPACK/.test(e)) });
});
for (const r of results) console.log(JSON.stringify(r));
process.exit(0);
