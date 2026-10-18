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
import { buildHash } from './build-hash.mjs';

const OUT = process.argv[2] || '/tmp/owner-captures';
const PHOTO = process.argv[3] || 'photos-test/v10a.jpg';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&photo=/game/' + PHOTO;
mkdirSync(OUT, { recursive: true });
// THE SHEET MUST NAME THE BUILD IT DESCRIBES. A capture is evidence only for the build it photographed, and the build
// is identified by content (tools/build-hash.mjs), never by a timestamp. This line is what goes into
// docs/OWNER-CAPTURES.md when a capture is re-signed.
{ const { hash, files } = buildHash(); console.log(JSON.stringify({ step: 'build', hash, files, note: 'paste this into docs/OWNER-CAPTURES.md as build: `' + hash + '`' })); }

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
  // THE DRAWER IS OPENED BY ITS OWN HEADER, AND THAT IS VERIFIED. Measured: the page now loads with the drawers CLOSED
  // (they were open on load when this step was written), so this capture had been photographing collapsed accordions
  // for a whole release - the tool recorded `open: false` and the sheet still shipped the picture. The step clicks the
  // drawer's header, READS THE CLASS BACK, and only then shoots; a drawer that will not open is a failed capture.
  const drawer = await page.run(`
    const box = document.getElementById('paletteBox');
    if (!box.classList.contains('open')) {
      // THE CARET OPENS THE LIST. The pill cycles the weapon and a HOLD opens the drawer; the arrow inside the pill is
      // the path to the whole list (its own handler calls openList). Measured: clicking the pill alone left the box
      // closed, so the capture photographed collapsed accordions for a release.
      const arrow = document.getElementById('paletteMore');
      const target = arrow || box.querySelector('[role="button"]') || box;
      target.click();
      await new Promise((r) => setTimeout(r, 450));
    }
    return { open: box.classList.contains('open'),
      hands: document.getElementById('palette').children.length };`);
  console.log(JSON.stringify({ step: 'drawer', ...drawer }));
  if (!drawer.open) { fails += 1; console.log(JSON.stringify({ step: 'drawer', ok: false, why: 'the drawer did not open when its header was clicked' })); }
  await page.wait(250);
  await shot(page, '2-drawer-open');

  await page.run(`
    const head = (id) => { const el = document.getElementById(id); return el && el.querySelector('[role="button"]'); };
    for (const id of ['paletteBox', 'lookBox']) { const h = head(id); if (h && document.getElementById(id).classList.contains('open')) h.click(); }
    await new Promise((r) => setTimeout(r, 350));
    return { paletteOpen: document.getElementById('paletteBox').classList.contains('open'), lookOpen: document.getElementById('lookBox').classList.contains('open') };`);
  await page.wait(400);
  await shot(page, '1-imported-scene');

  // DAMAGE, ON WHAT BREAKS VISIBLY. The first version aimed at a car and the capture moved the counter while the PICTURE
  // showed nothing - the car was small and half behind the toolbar. Aiming at ONE window gave one small hole. The three
  // largest targets now take two throws each (windows first: a pane empties; cars as the fallback), so the picture
  // carries the damage the counter claims. The score is still read: a hit that changes nothing is a false capture.
  const hit = await page.run(`
    const cam = window.dvor8.cam(), r = document.getElementById('frame').getBoundingClientRect();
    const w = window.__world;
    // AND ONLY IN THE BUILDINGS. Measured: the largest "windows" on this photograph are FALSE OPENINGS IN THE SKY (the
    // clouds' bright shapes survive the ring filter where the parse calls the sky a building), so the first version's
    // three throws emptied the sky and faded its clouds - damage shown on the wrong thing. A target must sit BELOW the
    // skyline (y > 42% of the frame) to be a window in a wall.
    const targets = w.regions.filter((q) => /window|car|truck|bus|van/i.test(String(q.kind || '')) && q.cy > w.h * 0.42)
      .sort((a, b) => (b.w * b.h) - (a.w * a.h)).slice(0, 3);
    if (!targets.length) return { hit: false, why: 'nothing to aim at' };
    const el = document.getElementById('tilt');
    const before = w.score;
    let thrown = 0;
    for (const t of targets) {
      const o = { clientX: r.left + ((t.x + t.w / 2 - cam.x) / cam.w) * r.width,
                  clientY: r.top + ((t.y + t.h / 2 - cam.y) / cam.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
      for (let k = 0; k < 2; k += 1) {
        el.dispatchEvent(new PointerEvent('pointerdown', o));
        el.dispatchEvent(new PointerEvent('pointerup', o));
        await new Promise((res) => setTimeout(res, 380));
        thrown += 1;
      }
    }
    await new Promise((res) => setTimeout(res, 900));
    return { hit: true, thrown, targets: targets.length, scoreBefore: before, scoreAfter: w.score, left: document.getElementById('left').textContent };`);
  console.log(JSON.stringify({ step: 'damage', ...hit }));
  if (!hit.hit || hit.scoreAfter <= hit.scoreBefore) { fails += 1; console.log(JSON.stringify({ step: 'damage', ok: false, why: 'no measurable hit' })); }
  await shot(page, '3-after-damage');
  const errors = page.errors.filter((e) => !/XNNPACK|INFO/.test(String(e)));
  console.log(JSON.stringify({ step: 'errors', errors }));
  if (errors.length) fails += 1;
});

console.log(fails ? `\nOWNER CAPTURES INCOMPLETE: ${fails} problem(s).` : `\nOWNER CAPTURES READY in ${OUT} (412x915).`);
process.exit(fails ? 1 : 0);
