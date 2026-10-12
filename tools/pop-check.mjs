// Does every floating word stay on screen?
//
// This exists because the unit suite cannot see layout, and a clipped word is invisible to it: the game
// logic is correct, the text is correct, and the player still cannot read the one prompt that tells them to
// hide. The check drives the real page until people are looking, then measures every .pop element's real
// bounding box against the viewport.
//
//   BASE=http://127.0.0.1:4312/ node --experimental-websocket tools/pop-check.mjs

import { withPage } from './browser.mjs';

const BASE = process.env.BASE || 'http://127.0.0.1:4310/';
const out = [];

await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  await page.wait(2500);
  await page.run(`document.getElementById('demoBtn').click(); await new Promise((r) => setTimeout(r, 1900));`);

  // A sampling loop is installed FIRST and left running in the page, then the sweep happens while it
  // samples. Sampling only between actions would miss the words entirely: a .pop lives for 0.7-1.1 s and is
  // removed on animationend, so anything measured after the sweep has already gone.
  await page.run(`
    window.__seen = [];
    window.__frame = (() => { const f = document.getElementById('frame').getBoundingClientRect();
      return { left: Math.round(f.left), right: Math.round(f.right), top: Math.round(f.top), bottom: Math.round(f.bottom) }; })();
    window.__sampler = setInterval(() => {
      for (const el of document.querySelectorAll('.pop')) {
        const b = el.getBoundingClientRect();
        if (b.width === 0) continue;
        window.__seen.push({ text: el.textContent, left: Math.round(b.left), right: Math.round(b.right),
                             top: Math.round(b.top), bottom: Math.round(b.bottom), w: Math.round(b.width) });
      }
    }, 40);
    return true;`);

  // Now play: sweep the yard for hits and tag words, and stay in the open long enough for the people to
  // arrive and look, which is what produces the hide warning this check was written for.
  await page.run(`
    const el = document.getElementById('tilt');
    for (let k = 0; k < 14; k += 1) {
      for (let fy = 0.35; fy < 0.92; fy += 0.14) for (let fx = 0.12; fx < 0.94; fx += 0.16) {
        const r = document.getElementById('frame').getBoundingClientRect();
        const o = { clientX: r.left + r.width * fx, clientY: r.top + r.height * fy, bubbles: true, cancelable: true, pointerId: 1 };
        el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o));
        await new Promise((res) => setTimeout(res, 90));
      }
      await new Promise((res) => setTimeout(res, 700));
    }
    return true;`);

  const widest = await page.run(`
    clearInterval(window.__sampler);
    return { frame: window.__frame, seen: window.__seen };`);

  const f = widest.frame;
  const bad = widest.seen.filter((b) => b.left < f.left - 1 || b.right > f.right + 1);
  const widestSeen = widest.seen.slice().sort((a, b) => b.w - a.w)[0] || null;

  out.push({ step: 'words measured', count: widest.seen.length, viewport: f });
  out.push({ step: 'widest word', text: widestSeen ? widestSeen.text : null, px: widestSeen ? widestSeen.w : 0 });
  out.push({ step: 'clipped words', count: bad.length, examples: bad.slice(0, 4) });

  // Prove the specific label this was written for was actually exercised.
  const sawWarning = widest.seen.some((b) => /ПРЯЧЬСЯ|СМОТРИТ|ЗАМЕТИЛИ|ИЩЕТ/.test(b.text));
  out.push({ step: 'the hide warning appeared', yes: sawWarning });
  out.push({ step: 'page errors', errors: await page.run('return window.__errs || []') });
});

console.log(JSON.stringify(out, null, 1));
const clipped = out.find((o) => o.step === 'clipped words');
process.exit(clipped && clipped.count === 0 ? 0 : 1);
