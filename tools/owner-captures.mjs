// THE OWNER'S THREE CAPTURES — the one part of the DONE list that is not the loop's to judge, prepared at
// phone size (412x915, the same viewport the page gates use) from the judged photograph.
//
//   1 the imported scene   - the yard built from photos-test/v10a.jpg, HUD and all, as a phone shows it
//   2 the drawer open      - the hand's own palette open (the drawer a thumb opens), so the eye can judge it
//   3 after damage         - a few real hits with the stone, then a moment later: what stays broken
//
// Usage: CHROME=... node --experimental-websocket tools/owner-captures.mjs [outdir] [photo]
// Prints one JSON line per capture; exits nonzero if any capture is missing or the page reports an error.
import { withPage } from './browser.mjs';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] || '/tmp/owner-captures';
const PHOTO = process.argv[3] || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&photo=/game/' + PHOTO;
mkdirSync(OUT, { recursive: true });

let fails = 0;
const shot = async (page, name) => {
  await page.shot(`${OUT}/${name}.png`);
  const ok = await page.run(`return document.getElementById('yard').width > 0`);
  if (!ok) { fails += 1; console.log(JSON.stringify({ step: name, ok: false })); return; }
  console.log(JSON.stringify({ step: name, ok: true, path: `${OUT}/${name}.png` }));
};

await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  const built = await page.run(`
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 250));
    // THE ANNOUNCEMENT MUST FADE BEFORE THE PICTURE IS TAKEN. The yard's "58 ЦЕЛЕЙ" banner is a DOM overlay that sits
    // over the art for a few seconds after the build; a capture taken then photographs the announcement, not the yard
    // (measured in every earlier sheet: the banner covered the picture's middle). Wait for it to be hidden.
    // THE BANNER FADES BY OPACITY, NOT BY display: it keeps its box and its text while the CSS animation takes it to
    // zero, so the first version of this wait looked at style.display, saw '' and shot the announcement anyway
    // (measured: the pink "58 ЦЕЛЕЙ" covered the art in every capture). The wait is on the COMPUTED opacity.
    const ban = document.getElementById('banner');
    const t1 = performance.now();
    while (ban && performance.now() - t1 < 8000) {
      const op = parseFloat(getComputedStyle(ban).opacity) || 0;
      if (op <= 0.02 && !ban.classList.contains('show') && !ban.classList.contains('hold')) break;
      await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { left: document.getElementById('left').textContent, note: document.getElementById('note').textContent.slice(0, 80),
      banner: ban ? (ban.style.display || 'shown') : 'no banner' };`);
  console.log(JSON.stringify({ step: 'built', ...built }));
  // THE DRAWERS OPEN ON LOAD, so the DRAWER capture comes first and the SCENE capture after closing them. That
  // order is deliberate: the drawer's own header toggles reliably open->closed but the reopen path depends on the
  // bar's state, and a capture that fights the UI would photograph the harness, not the game.
  const drawer = await page.run(`
    return { open: document.getElementById('paletteBox').classList.contains('open'),
      hands: document.getElementById('palette').children.length };`);
  console.log(JSON.stringify({ step: 'drawer', ...drawer }));
  if (!drawer.open) { fails += 1; console.log(JSON.stringify({ step: 'drawer', ok: false, why: 'the drawer was not open on load' })); }
  await page.wait(250);
  await shot(page, '2-drawer-open');

  await page.run(`
    const head = (id) => { const el = document.getElementById(id); return el && el.querySelector('[role="button"]'); };
    for (const id of ['paletteBox', 'lookBox']) { const h = head(id); if (h && document.getElementById(id).classList.contains('open')) h.click(); }
    await new Promise((r) => setTimeout(r, 350));
    return { paletteOpen: document.getElementById('paletteBox').classList.contains('open'), lookOpen: document.getElementById('lookBox').classList.contains('open') };`);
  await page.wait(400);
  await shot(page, '1-imported-scene');

  // DAMAGE: three taps with the stone through the page's own mapping, then a beat for the debris and the
  // permanent state to settle. A hit that changes nothing would be a false capture, so the score is read.
  const hit = await page.run(`
    const cam = window.dvor8.cam(), r = document.getElementById('frame').getBoundingClientRect();
    const w = window.__world;
    const t = w.regions.find((q) => /car|truck|bus|van/i.test(String(q.kind || '')));
    if (!t) return { hit: false, why: 'no car on this photograph' };
    const el = document.getElementById('tilt');
    const o = { clientX: r.left + ((t.x + t.w / 2 - cam.x) / cam.w) * r.width,
                clientY: r.top + ((t.y + t.h / 2 - cam.y) / cam.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
    const before = w.score;
    for (let k = 0; k < 3; k += 1) {
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      el.dispatchEvent(new PointerEvent('pointerup', o));
      await new Promise((res) => setTimeout(res, 420));
    }
    await new Promise((res) => setTimeout(res, 900));
    return { hit: true, scoreBefore: before, scoreAfter: w.score, left: document.getElementById('left').textContent };`);
  console.log(JSON.stringify({ step: 'damage', ...hit }));
  if (!hit.hit || hit.scoreAfter <= hit.scoreBefore) { fails += 1; console.log(JSON.stringify({ step: 'damage', ok: false, why: 'no measurable hit' })); }
  await shot(page, '3-after-damage');
  const errors = page.errors.filter((e) => !/XNNPACK|INFO/.test(String(e)));
  console.log(JSON.stringify({ step: 'errors', errors }));
  if (errors.length) fails += 1;
});

console.log(fails ? `\nOWNER CAPTURES INCOMPLETE: ${fails} problem(s).` : `\nOWNER CAPTURES READY in ${OUT} (412x915).`);
process.exit(fails ? 1 : 0);
