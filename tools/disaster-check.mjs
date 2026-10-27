// THE DISASTER GATE — every disaster of the operator's engine must be VISIBLE in our app.
//
// The operator's complaint: "disasters are not well thought through... Beyoncé can't be seen... they don't look good at
// all, basically can't see them." The app now drives the ENGINE'S OWN disasters (dis_hurricane / dis_tsunami /
// dis_godzilla / dis_beyonce) on an engine frame. This gate summons each of the four through the app's own СТИХИЯ
// panel, steps the game for a second, and refuses unless:
//   1. the engine's disaster exists and has reached `impact`
//   2. no exception escaped (the engine's setState stub included)
//   3. the picture CHANGED, and by a real area (>= 300 pixels) - a disaster you cannot see is not a disaster
//
//   CHROME=... node --experimental-websocket tools/disaster-check.mjs
import { withPage } from './browser.mjs';

const IDS = [
  ['hurricane', 'УРАГАН'],
  ['tsunami', 'ЦУНАМИ'],
  ['godzilla', 'ГОДЗИЛЛА'],
  ['beyonce', 'БЕЙОНС'],
];
const BASE = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&photo=/game/photos-test/v10a.jpg';
let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(18)} ${detail}`); if (cond) pass += 1; else fail += 1; };

for (const [id, label] of IDS) {
  const r = await withPage(BASE, { width: 412, height: 915 }, async (page) => {
    return await page.run(`
      const t0 = performance.now();
      while (!window.__world && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 250));
      await new Promise(r => setTimeout(r, 3500));
      const cv = document.getElementById('yard');
      const grab = () => { const g = cv.getContext('2d'); return g.getImageData(0, 0, cv.width, cv.height).data; };
      const before = grab();
      const btn = [...document.querySelectorAll('#fates [role=button], #fates button')].find(b => (b.textContent || '').includes(${JSON.stringify(label)}));
      if (!btn) return { err: 'the panel has no button ' + ${JSON.stringify(label)} };
      btn.click();
      // WAIT FOR THE FINISHED STATE (quality contract R5): the engine's phases are siren (60 frames) -> impact, and a
      // disaster paints progressively, so a fixed 2.6 s sample caught thin first frames (measured: 1 of 4 rows passed on
      // one run and 4 of 4 on the next - the gate was sampling a transition, not the disaster).
      const c0 = window.__engineInst;
      let changed = 0, dis = null, waited = 0;
      const t1 = performance.now();
      while (performance.now() - t1 < 25000) {
        await new Promise(r => setTimeout(r, 350));
        waited = performance.now() - t1;
        const after = grab();
        changed = 0;
        for (let k = 0; k < before.length; k += 4) if (before[k] !== after[k] || before[k+1] !== after[k+1] || before[k+2] !== after[k+2]) changed += 1;
        dis = c0 && c0.dis ? c0.dis.phase : null;
        if (dis === 'impact' && changed >= 300) break;
      }
      const err = window.__engineDisasterError || null;
      const c = window.__engineInst;
      return { changed, dis: c && c.dis ? c.dis.phase : null, err, found: !!btn, waited: Math.round(waited) };
    `);
  });
  const good = r.dis === 'impact' && !r.err && r.changed >= 300;
  ok(`${id} (${label})`, good, `phase ${r.dis} · ${r.changed} px changed after ${r.waited} ms · ${r.err ? 'error: ' + r.err : 'no error'}`);
}

console.log(`\n${fail ? 'DISASTER CHECK FAILED' : 'DISASTER CHECK PASSED'}: ${pass} of ${pass + fail} disasters are the engine's own and visible.`);
process.exit(fail ? 1 : 0);
