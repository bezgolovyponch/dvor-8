// THE OUTLINE GATE — the creator's rule "one outline rule (the darkest palette colour, 1 px) on every target, never
// mixed" as three checkable numbers, on the LIVE page (an outline exists only while something is aimed at, marked or
// already broken, so a stored dump can never carry one).
//
// THE THREE MEASURES, defined here because the order names the bars but not the definitions (CHOICE, printed):
//   1 OBJECT-SIDE: none of the pixels the outline pass WRITES may lie on a pixel the parse says is sky. The outline is
//     drawn on the thing's own silhouette, so a pixel over the sky means it was drawn on the sky's side.
//   2 NO 2x2 OF THE INK: the dark under-pixel (#0b0018 = palette tone rgb(11,0,24)) must read as a 1-px line. The bar
//     is >= 95% of the ink pixels NOT belonging to a 2x2 block of ink.
//   3 PURITY: of the pixels the pass wrote as a state colour, >= 95% must still be exactly that colour on the canvas
//     when the frame is finished - a later pass must not repaint the outline.
// The probe (?outline=1) is the only way to know WHICH pixels were written; that is why it lives in render.js and is
// inert without the parameter.
import { withPage } from './browser.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&outline=1&photo=/game/photos-test/v10a.jpg';
let fails = 0;
const say = (ok, what) => { if (!ok) { fails += 1; console.log('FAIL  ' + what); } else console.log('ok    ' + what); };

const out = await withPage(BASE, {}, async (page) => {
  // the yard, through the page's own file input
  await page.wait(2000);
  const world = await page.run(`
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 250));
    const w = window.__world;
    if (!w) return null;
    const car = w.regions.find((r) => /car|truck|bus|van/i.test(String(r.kind || '') + ' ' + String(r.label || '')));
    const bld = w.regions.find((r) => /building|house|tower/i.test(String(r.kind || '') + ' ' + String(r.label || '')));
    return { n: w.regions.length, car: car ? { id: car.id, x: car.x, y: car.y, w: car.w, h: car.h } : null,
      bld: bld ? { id: bld.id, x: bld.x, y: bld.y, w: bld.w, h: bld.h } : null };
  `);
  if (!world) return { err: 'no world built' };
  // AIM at the car: the same mapping a finger goes through, then one animation frame so the pass draws
  const aimed = await page.run(`
    const cam = window.dvor8.cam(), r = document.getElementById('frame').getBoundingClientRect();
    const el = document.getElementById('tilt');
    const t = ${JSON.stringify(world.car)};
    const o = { clientX: r.left + ((t.x + t.w / 2 - cam.x) / cam.w) * r.width,
                clientY: r.top + ((t.y + t.h / 2 - cam.y) / cam.h) * r.height, bubbles: true, cancelable: true, pointerId: 1 };
    // THE SCAN RUNS BEFORE PLAY, AND THE AIM HANDLER IS INERT UNTIL stage === 'play': dispatch until it takes.
    for (let i = 0; i < 60 && !(window.__world.aim && window.__world.aim.id != null); i += 1) {
      el.dispatchEvent(new PointerEvent('pointermove', o));
      await new Promise((res) => setTimeout(res, 150));
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
    const probe = window.__outline;
    if (!probe) return { err: 'no __outline probe (the render did not run, or ?outline=1 is not passed through)' };
    const c = document.getElementById('yard'), g = c.getContext('2d');
    const img = g.getImageData(0, 0, c.width, c.height).data;
    const rgbAt = (p) => [img[p * 4], img[p * 4 + 1], img[p * 4 + 2]];
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    // 3 PURITY: written state pixels still carrying their written colour
    let exact = 0;
    for (let i = 0; i < probe.state.length; i += 1) {
      const want = hex(probe.colours[i]), got = rgbAt(probe.state[i]);
      if (want[0] === got[0] && want[1] === got[1] && want[2] === got[2]) exact += 1;
    }
    // 2 NO 2x2 OF THE INK
    const ink = new Set(probe.ink);
    let inBlock = 0;
    for (const p of probe.ink) {
      if (ink.has(p + 1) && ink.has(p + c.width) && ink.has(p + c.width + 1)) inBlock += 1;
    }
    // 3 THE INK IS ONE COLOUR, AND IT IS THE DARKEST THE FRAME USES. The criterion is "one outline rule (the darkest
    // palette colour, 1 px)"; the old gate measured the shape of the ink (no 2x2, purity of the state colours) and
    // never its COLOUR - a mixed-colour or light ink would have passed. Measured: the modal colour of the ink pixels
    // and the share of ink pixels carrying it; the darkest colour the canvas uses, for the comparison.
    const inkColours = new Map();
    for (const p of probe.ink) { const k = rgbAt(p).join(','); inkColours.set(k, (inkColours.get(k) || 0) + 1); }
    const inkSorted = [...inkColours.entries()].sort((a, b) => b[1] - a[1]);
    const inkTop = inkSorted[0] || ['', 0];
    const inkShare = probe.ink.length ? inkTop[1] / probe.ink.length : 0;
    let darkest = null, darkestL = 1e9;
    const seenC = new Set();
    for (let i = 0; i < img.length; i += 4) {
      const k = img[i] + ',' + img[i + 1] + ',' + img[i + 2];
      if (seenC.has(k)) continue;
      seenC.add(k);
      const l = 0.299 * img[i] + 0.587 * img[i + 1] + 0.114 * img[i + 2];
      if (l < darkestL) { darkestL = l; darkest = img[i] + ',' + img[i + 1] + ',' + img[i + 2]; }
    }
    const inkIsDarkest = inkTop[0] === darkest || (darkestL < 30 && inkColours.has(darkest));
    // 1 OBJECT-SIDE: written pixels over sky
    const sky = window.__skyMask;
    let overSky = 0;
    if (sky) for (const p of probe.state) if (sky[p]) overSky += 1;
    return { aim: !!t, n: probe.state.length, inkN: probe.ink.length, exact, inBlock, overSky, haveSky: !!sky,
      inkTop: inkTop[0], inkShare, inkKinds: inkColours.size, darkest, inkIsDarkest,
      canvas: [c.width, c.height], regions: ${world.n} };
  `);
  return aimed;
});

if (out.err) { console.log(`FAIL  ${out.err}`); process.exit(1); }
const share = out.n ? out.exact / out.n : 0;
const lineShare = out.inkN ? 1 - out.inBlock / out.inkN : 0;
console.log(`PREMISES: ${out.n} outline pixels written and ${out.inkN} ink pixels, canvas ${out.canvas[0]}x${out.canvas[1]}, sky mask ${out.haveSky ? 'exposed' : 'ABSENT'}`);
say(out.n > 0, `the outline pass wrote ${out.n} pixels while a car was aimed at`);
say(out.haveSky && out.overSky === 0, `object-side: ${out.overSky} of ${out.n} written pixels lie on sky`);
say(lineShare >= 0.95, `no 2x2 of the ink: ${(100 * lineShare).toFixed(1)}% of the ${out.inkN} ink pixels are not in a 2x2 block (bar 95%)`);
say(share >= 0.95, `purity: ${(100 * share).toFixed(1)}% of the written pixels still carry the exact state colour (bar 95%)`);
// 4 ONE INK COLOUR: the criterion's own words. Bar 99% - a one-pixel line drawn from one palette entry carries one
// colour; a mixed ink is a second drawing rule.
say(out.inkN > 0 && out.inkShare >= 0.99, `one ink colour: ${(100 * out.inkShare).toFixed(1)}% of the ink is rgb(${out.inkTop}) (bar 99%, ${out.inkKinds} colour(s) in the ink)`);
say(out.inkIsDarkest, `the ink is the darkest colour the frame uses (ink rgb(${out.inkTop}) against the canvas's darkest rgb(${out.darkest}))`);
console.log(fails ? `\nTHE OUTLINE IS NOT CONFIRMED: ${fails} assertion(s) failed.` : '\nTHE OUTLINE IS CONFIRMED: object-side, 1-px ink, one ink colour, exact colour.');
process.exit(fails ? 1 : 0);
