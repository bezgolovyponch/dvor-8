// THE DISASTER GATE — every disaster of the operator's engine must be VISIBLE in our app.
//
// The operator: "Beyoncé can't be seen... they don't look good at all, basically can't see them." The app drives the
// ENGINE'S OWN disasters (dis_hurricane / dis_tsunami / dis_godzilla / dis_beyonce) on an engine frame. This gate summons
// each through the app's own СТИХИЯ panel and refuses unless the engine's disaster reaches `impact`, throws nothing, and
// REPAINTS the picture (>= 300 px) — a disaster you cannot see is not a disaster.
//
// ONE BROWSER SESSION, FOUR SUMMONS: the first version opened four browsers and flaked under load (measured: 1 of 4 on one
// run, 4 of 4 on the next). One page, each disaster waited out before the next, is one measurement instead of four races.
import { withPage } from './browser.mjs';

const IDS = [['hurricane', 'УРАГАН'], ['tsunami', 'ЦУНАМИ'], ['godzilla', 'ГОДЗИЛЛА'], ['beyonce', 'БЕЙОНС']];
const BASE = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&debug&photo=/game/photos-test/v10a.jpg';

const rows = await withPage(BASE, { width: 412, height: 915 }, async (page) => {
  const code = [
    'const t0 = performance.now();',
    'while (!window.__world && performance.now() - t0 < 90000) await new Promise(r => setTimeout(r, 250));',
    'await new Promise(r => setTimeout(r, 3500));',
    'const c0 = window.__engineInst, cv = document.getElementById("yard");',
    'const grab = () => { const g = cv.getContext("2d"); return g.getImageData(0, 0, cv.width, cv.height).data; };',
    'const chips = [...document.querySelectorAll("#fates [role=button], #fates button")];',
    'const out = [];',
    'for (const [id, label] of ' + JSON.stringify(IDS) + ') {',
    '  const btn = chips.find(b => (b.textContent || "").includes(label));',
    '  if (!btn) { out.push({ id, label, err: "no chip" }); continue; }',
    '  const before = grab();',
    '  btn.click();',
    '  let changed = 0, dis = null, waited = 0;',
    '  const t1 = performance.now();',
    '  while (performance.now() - t1 < 30000) {',
    '    await new Promise(r => setTimeout(r, 350));',
    '    waited = Math.round(performance.now() - t1);',
    '    const after = grab(); changed = 0;',
    '    for (let k = 0; k < before.length; k += 4) if (before[k] !== after[k] || before[k+1] !== after[k+1] || before[k+2] !== after[k+2]) changed += 1;',
    '    dis = c0 && c0.dis ? c0.dis.phase : null;',
    '    if (dis === "impact" && changed >= 300) break;',
    '  }',
    '  out.push({ id, label, changed, dis, waited, err: window.__engineDisasterError || null });',
    // let this disaster finish before the next chips summon another
    '  const t2 = performance.now();',
    '  while (c0 && c0.dis && performance.now() - t2 < 40000) await new Promise(r => setTimeout(r, 300));',
    '  await new Promise(r => setTimeout(r, 500));',
    '}',
    'return out;',
  ].join('\n');
  return await page.run(code);
});

let pass = 0, fail = 0;
for (const r of rows) {
  const good = r.dis === 'impact' && !r.err && r.changed >= 300;
  console.log(`${good ? 'ok  ' : 'FAIL'}  ${(r.id + ' (' + r.label + ')').padEnd(22)} phase ${r.dis} · ${r.changed} px changed after ${r.waited} ms · ${r.err ? 'error: ' + r.err : 'no error'}`);
  if (good) pass += 1; else fail += 1;
}
console.log(`\n${fail ? 'DISASTER CHECK FAILED' : 'DISASTER CHECK PASSED'}: ${pass} of ${pass + fail} disasters are the engine's own and visible.`);
process.exit(fail ? 1 : 0);
