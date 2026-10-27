// THE .HTML AUDIT — the operator's template is the SPEC of the screen, and this tool measures our DOM against it.
//
// The .dc.html draws the phone at 576×1024 and positions every element in pixels inside it. Our app is drawn at its own
// scale, so the comparison is RATIOS of the frame (px / frame size) - a scale-free spec. Each row names the element, the
// template's ratio, ours, and fails when the difference is over the tolerance. This is how "check against the .html"
// becomes an instrument instead of an impression.
//
//   CHROME=... node --experimental-websocket tools/html-audit.mjs
import { readFileSync } from 'node:fs';
import { withPage } from './browser.mjs';

const HTML = process.env.V13_HTML || '/Users/m/Downloads/DVOR-8 Photo2Pixel v13.dc.html';
const T = readFileSync(HTML, 'utf8');
const num = (re) => { const m = T.match(re); return m ? Number(m[1]) : null; };
// the template's own declarations (inline styles of the phone and its HUD elements)
const spec = {
  phoneW: 576, phoneH: 1024,
  score: { left: num(/data-hud="score"[^>]*left:(\d+)px/), top: num(/data-hud="score"[^>]*top:(\d+)px/), font: num(/data-hud="score"[\s\S]{0,220}?font:italic 900 (\d+)px/) },
  danger: { right: num(/data-hud="danger"[^>]*right:(\d+)px/), top: num(/data-hud="danger"[^>]*top:(\d+)px/), segW: num(/width:(16)px;height:11px/) },
  banner: { top: num(/data-hud="banner"[^>]*top:(\d+)px/) },
  bar: { right: num(/data-hud="bar"[^>]*right:(\d+)px/), bottom: num(/data-hud="bar"[^>]*bottom:(\d+)px/), height: num(/data-hud="bar"[^>]*height:(\d+)px/) },
  info: { size: num(/data-role="info"[^>]*width:(\d+)px/) },
  chip: { w: num(/data-role="weapon"[^>]*width:(\d+)px/), h: num(/data-role="weapon"[^>]*height:(\d+)px/) },
};
const ratio = (v, of) => (v != null ? v / of : null);
const want = {
  'score.left': ratio(spec.score.left, spec.phoneW), 'score.top': ratio(spec.score.top, spec.phoneH), 'score.font': ratio(spec.score.font, spec.phoneW),
  'danger.right': ratio(spec.danger.right, spec.phoneW), 'danger.top': ratio(spec.danger.top, spec.phoneH),
  'banner.top': ratio(spec.banner.top, spec.phoneH),
  'bar.height': ratio(spec.bar.height, spec.phoneH), 'bar.bottom': ratio(spec.bar.bottom, spec.phoneH), 'bar.right': ratio(spec.bar.right, spec.phoneW),
  'info.size': ratio(spec.info.size, spec.phoneW), 'chip.w': ratio(spec.chip.w, spec.phoneW), 'chip.h': ratio(spec.chip.h, spec.phoneH),
};

const ours = await withPage('http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&debug&vector=1&photo=/game/photos-test/v10a.jpg', { width: 412, height: 915 }, async (page) => {
  return await page.run(`
    const t0 = performance.now();
    while (!window.__world && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 250));
    await new Promise(r => setTimeout(r, 2000));
    const f = document.getElementById('frame').getBoundingClientRect();
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    const score = document.getElementById('score');
    const clock = document.getElementById('clock');
    const heat = document.getElementById('heat');
    const dangerBox = document.querySelector('.hudDanger');
    const seg = heat ? heat.querySelector('u') : null;
    const bar = document.getElementById('bar');
    const info = document.getElementById('infoBtn');
    const chip = document.getElementById('palettePill');
    const banner = document.getElementById('banner');
    const cs = (el, p) => el ? getComputedStyle(el)[p] : null;
    return {
      frame: { x: f.x, y: f.y, w: f.width, h: f.height },
      score: { box: box(score), font: cs(score, 'fontSize') },
      danger: { box: box(dangerBox), meter: box(heat), seg: box(seg) },
      banner: { box: box(banner) },
      bar: box(bar), info: box(info), chip: box(chip),
      hasInfo: !!info, hasChip: !!chip, hasBar: !!bar,
    };
  `);
});
const R = (b, of) => (b ? b / of : null);
const fw = ours.frame.w, fh = ours.frame.h;
const got = {
  'score.left': R(ours.score.box ? ours.score.box.x - ours.frame.x : null, fw),
  'score.top': R(ours.score.box ? ours.score.box.y - ours.frame.y : null, fh),
  'score.font': R(parseFloat(ours.score.font), fw),
  // THE CONTAINER CARRIES THE POSITION; the meter is only drawn when there is danger to show (the app hides it until a
  // person is in the yard), so a row measured on the meter read 0x0 at the page origin - an instrument error, not a
  // layout one. The container is the positioned block the template's row describes.
  'danger.right': R(ours.danger.box ? (ours.frame.x + fw) - (ours.danger.box.x + ours.danger.box.w) : null, fw),
  'danger.top': R(ours.danger.box ? ours.danger.box.y - ours.frame.y : null, fh),
  'banner.top': R(ours.banner.box ? ours.banner.box.y - ours.frame.y : null, fh),
  'bar.height': R(ours.bar ? ours.bar.h : null, fh),
  'bar.bottom': R(ours.bar ? (ours.frame.y + fh) - (ours.bar.y + ours.bar.h) : null, fh),
  'bar.right': R(ours.bar ? (ours.frame.x + fw) - (ours.bar.x + ours.bar.w) : null, fw),
  'info.size': R(ours.info ? ours.info.w : null, fw),
  'chip.w': R(ours.chip ? ours.chip.w : null, fw),
  'chip.h': R(ours.chip ? ours.chip.h : null, fh),
};
const TOL = 0.35;           // a ratio may differ by a third: below that the difference is scale, above it is design
let bad = 0;
console.log(`THE .HTML AUDIT — the operator's screen is 576x1024; ours is ${Math.round(fw)}x${Math.round(fh)}; rows are ratios of the frame`);
console.log(`${'element'.padEnd(14)} ${'template'.padEnd(10)} ${'ours'.padEnd(10)} verdict`);
for (const k of Object.keys(want)) {
  const w = want[k], g = got[k];
  const miss = (w == null || g == null) ? null : Math.abs(g - w) / Math.max(w, 0.001);
  const okRow = miss != null && miss <= TOL;
  if (!okRow) bad += 1;
  const fmt = (v) => (v == null ? '—' : (v * 100).toFixed(1) + '%');
  console.log(`${k.padEnd(14)} ${fmt(w).padEnd(10)} ${fmt(g).padEnd(10)} ${okRow ? 'ok' : miss == null ? 'MISSING' : `off by ${(miss * 100).toFixed(0)}%`}`);
}
const total = Object.keys(want).length;
if (bad) {
  console.log(`\nHTML AUDIT: ${bad} of ${total} rows are away from the template's own geometry.`);
} else {
  console.log('\nHTML AUDIT PASSED: the screen geometry is the template\'s.');
}
