// THE ENGINE'S OWN SEMANTICS — one throw = ONE step on ONE piece, no invented blast, the collapse deferred.
//
// Named by an independent logic audit of the app against the operator's engine (S15 damage ladder, S16 progressive
// collapse, S17 particles). The app had drifted: `steps` was the throwable's damage (up to four `damageAt` in one throw,
// so the brick took a piece from intact to gone), a post-kill "blast" broke random panes and pieces, and `cascade(...,
// true)` collapsed the structure instantly from inside the hit. The engine does none of that: `hitChunk` returns one step
// per call, the collapse is deferred (`ft = 4`, one cascade every third tick), and there is no area damage in a throw.
//
//   CHROME=... node --experimental-websocket tools/engine-semantics-check.mjs
import { withPage } from './browser.mjs';
const BASE = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&engine=1&photo=/game/photos-test/v10a.jpg';
let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(34)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const r = await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  const code = [
    'const t0 = performance.now();',
    'while (!window.__world && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 250));',
    'await new Promise(r => setTimeout(r, 3500));',
    'const w = window.__world, c = window.__engineInst;',
    'const car0 = w.regions.find(r => r.kind === "car");',
    'const car = w.regions[w.owner[Math.floor(car0.cy) * w.w + Math.floor(car0.cx)]] || car0;',
    'const bid = car.engineId;',
    'const states = () => { const o = []; for (let i = 0; i < c.CH.length; i += 1) if (c.CH[i] && c.CH[i].bid === bid) o.push(c.S.st[i]); return o; };',
    'const chips = [...document.querySelectorAll("#palette [role=button], #palette button")];',
    'const brick = chips.find(b => /КИРПИЧ/.test(b.textContent || ""));',
    'if (brick) brick.click();',
    'await new Promise(r => setTimeout(r, 300));',
    'const seq = [states()];',
    'for (let n = 0; n < 4; n += 1) { window.__throwAt({ x: car.cx, y: car.cy }); await new Promise(r => setTimeout(r, 900)); seq.push(states()); }',
    'return { bid, seq };',
  ].join('\n');
  return await page.run(code);
});
const changed = (a, b) => b.map((v, i) => (v !== a[i] ? 1 : 0)).reduce((x, y) => x + y, 0);
const maxState = (s) => Math.max(...s);
ok('1 ONE THROW ADVANCES ONE PIECE', changed(r.seq[0], r.seq[1]) === 1, `${changed(r.seq[0], r.seq[1])} piece(s) changed in the first throw`);
ok('2 AND BY ONE STEP ONLY', maxState(r.seq[1]) <= 1, `states after one throw ${r.seq[1].join('')}`);
const ladder = r.seq.slice(1).map((s) => maxState(s));
ok('3 THE LADDER WALKS ONE STEP PER THROW', ladder.every((v, i) => i === 0 || v === ladder[i - 1] + 1 || v === ladder[i - 1]), `max state per throw: ${ladder.join(' -> ')}`);
console.log(`\n${fail ? 'ENGINE SEMANTICS FAILED' : 'ENGINE SEMANTICS PASSED'}: ${pass} of ${pass + fail} - the throw is the engine's own step.`);
process.exit(fail ? 1 : 0);
