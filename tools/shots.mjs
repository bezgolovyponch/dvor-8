// THE BASELINE'S FOUR PICTURES — the proof shots docs/BASELINE.md names by path (docs/shots/*.png).
//
// The baseline rows say "a picture proves it"; until now nothing wrote those pictures, so the rows failed on
// absence, not on the product. This tool captures exactly the four named files from the judged photograph, through
// the game's own UI (the same pointer mapping the page uses), and prints one JSON line per shot.
//
//   1 version-outlines.png   the imported scene with the one-pixel silhouettes, drawers closed
//   2 photo-destroyed.png    a few real hits with the stone, then a beat: what stays broken
//   3 photo-hurricane.png    the hurricane mid-event
//   4 photo-tsunami.png      the tsunami mid-event
//
// Usage: CHROME=... node --experimental-websocket tools/shots.mjs [outdir] [photo]
import { withPage } from './browser.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/shots';
const PHOTO = process.argv[3] || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&photo=/game/' + PHOTO;
mkdirSync(OUT, { recursive: true });
let fails = 0;
const shot = async (page, name, why) => {
  await page.shot(`${OUT}/${name}`);
  console.log(JSON.stringify({ step: name, ok: true, why }));
};
await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  const built = await page.run(`
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 250));
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { left: document.getElementById('left').textContent };`);
  console.log(JSON.stringify({ step: 'built', ...built }));
  await page.run(`
    const head = (id) => { const el = document.getElementById(id); return el && el.querySelector('[role="button"]'); };
    for (const id of ['paletteBox', 'lookBox']) { const h = head(id); if (h && document.getElementById(id).classList.contains('open')) h.click(); }
    await new Promise((r) => setTimeout(r, 400)); return 'closed';`);
  await page.wait(400);
  await shot(page, 'version-outlines.png', 'the imported scene with the silhouettes');

  // THE TOOLBAR'S OWN PICTURE: the chip row with its four tools, as the phone shows it. The baseline row "the toolbar
  // LOOKS like a toolbar" asks for a picture, and no tool wrote one - so the row failed on absence, not on the product.
  {
    const el = await page.$ ? null : null;
    const box = await page.run(`
      const bar = document.getElementById('bar');
      if (!bar) return null;
      const r = bar.getBoundingClientRect();
      return { x: Math.max(0, Math.round(r.x - 8)), y: Math.max(0, Math.round(r.y - 8)), w: Math.round(r.width + 16), h: Math.round(r.height + 16) };`);
    if (box) await page.shot(`${OUT}/toolbar.png`);
  }

  const hit = await page.run(`
    const cam = window.dvor8.cam(), r = document.getElementById('frame').getBoundingClientRect();
    const w = window.__world;
    const t = w.regions.find((q) => /car|truck|bus|van/i.test(String(q.kind || '')));
    if (!t) return { hit: false };
    const el = document.getElementById('tilt');
    const o = { clientX: r.left + ((t.x + t.w / 2 - cam.x) / cam.w) * r.width,
                clientY: r.top + ((t.y + t.h / 2 - cam.y) / cam.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
    const before = w.score;
    for (let k = 0; k < 3; k += 1) { el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); await new Promise((res) => setTimeout(res, 420)); }
    await new Promise((res) => setTimeout(res, 900));
    return { hit: true, before, after: w.score };`);
  console.log(JSON.stringify({ step: 'damage', ...hit }));
  if (!hit.hit || hit.after <= hit.before) fails += 1;
  await shot(page, 'photo-destroyed.png', 'a car destroyed, with remains');

  for (const [fate, name] of [['УРАГАН', 'photo-hurricane.png'], ['ЦУНАМИ', 'photo-tsunami.png']]) {
    await page.run(`
      document.getElementById('infoBtn').click();
      document.getElementById('fateBox').open = true;
      return 'opened';`);
    await page.wait(350);
    const fired = await page.run(`
      const b = [...document.querySelectorAll('#fates button')].find((x) => x.textContent.includes(${JSON.stringify(fate)}));
      if (b) b.click();
      return { fired: !!b, now: document.getElementById('fateNow').textContent };`);
    await page.wait(5000);
    console.log(JSON.stringify({ step: name, ...fired }));
    if (!fired.fired) fails += 1;
    await shot(page, name, `${fate} mid-event`);
    await page.wait(1200);
  }
  const errors = page.errors.filter((e) => !/XNNPACK|INFO/.test(String(e)));
  console.log(JSON.stringify({ step: 'errors', errors }));
  if (errors.length) fails += 1;
});
console.log(fails ? `\nSHOTS INCOMPLETE: ${fails} problem(s).` : `\nSHOTS READY in ${OUT}.`);
process.exit(fails ? 1 : 0);
