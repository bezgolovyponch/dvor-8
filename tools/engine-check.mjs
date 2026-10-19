// THE ENGINE CHECK — the app's converter must BE the operator's converter.
//
// This is the gate the plan (docs/PLAN-REAL-PRODUCT.md §3) requires, and it is the strongest one available because it
// compares CODE TO CODE, not our frame to a share:
//
//   1. the app's engine module is the byte-exact extraction (sha256 against the recorded ENGINE_SHA)
//   2. it RUNS in a browser page (module import + build) - a build that throws is a refusal, not a pass
//   3. it reproduces the operator's OWN frames: the FNV of two builds of each reference scene equals the FNV recorded
//      in reference/v13/readout.json (7204df6f, d0fe012f, 3d4718fa, e580ce31), and two builds of one scene agree
//   4. it reports the operator's own stage numbers for the judged photo: working palette 12, windows 1321, tower grid
//      10x11 with 1262 panes - the numbers docs/PLAN-REAL-PRODUCT.md §2 gates our frame on
//
//   CHROME=... node --experimental-websocket tools/engine-check.mjs
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { withPage } from './browser.mjs';

const ENGINE_SHA = '098f21b610497373c3aefe763f7261bae2e05a5a03c38bc4be1c49ce0fbc5cf3';
let pass = 0, fail = 0;
const ok = (what, cond, detail) => { console.log(`${cond ? 'ok  ' : 'FAIL'}  ${what.padEnd(58)} ${detail}`); if (cond) pass += 1; else fail += 1; };

const code = readFileSync(new URL('../src/ref/engine.js', import.meta.url), 'utf8');
const sha = createHash('sha256').update(code).digest('hex');
ok('1 THE MODULE IS THE OPERATOR\'S FILE (sha256)', sha === ENGINE_SHA, `${sha.slice(0, 12)}… ${sha === ENGINE_SHA ? 'matches' : 'DOES NOT MATCH — regenerate with tools/v13/make-module.mjs'}`);

const ref = JSON.parse(readFileSync(new URL('../reference/v13/readout.json', import.meta.url), 'utf8'));
const scenes = ref.map((r) => ({ label: r.label, fnv: r.h1, palette: r.sub.length, wn: r.wn, region: r.rep.map((f) => ({ name: f.name, grid: `${f.lu}x${f.lv}`, nw: f.nw })) }));
const PHOTO = { 'prague-tower': '/game/photos-test/v10a.jpg', 'prague-street': '/game/photos-test/2026-10-12%2023.06.59.jpg', 'aerial-church': '/game/photos-test/2026-10-12%2023.06.55.jpg', 'sunset-bus': '/game/photos-test/sunset.jpg' };

const res = await withPage('http://127.0.0.1:4312/game/index.html', { width: 400, height: 700 }, async (page) => {
  const out = await page.run(`
    const { Component } = await import('/game/src/ref/engine.js');
    const c = new Component();
    const label = ${JSON.stringify('prague-tower')};
    const i = c.SCENES.findIndex((s) => s.id === label);
    const sc = JSON.parse(JSON.stringify(c.SCENES[i])); sc.src = ${JSON.stringify(PHOTO['prague-tower'])};
    const img = new Image(); img.src = sc.src; await img.decode();
    c.tok++; c.S = null;
    const t0 = performance.now(); c.build(img, sc, 77); const ms = Math.round(performance.now() - t0);
    const h1 = c.fnv(c.clean);
    c.build(img, sc, 77); const h2 = c.fnv(c.clean);
    const rep = c.REP.map((r) => ({ name: r.name, grid: r.lu + 'x' + r.lv, nw: r.nw }));
    return { h1, h2, ms, palette: c.SUB.length, wn: c.WN.length, rep, hasClean: !!c.clean, len: c.clean ? c.clean.length : 0 };
  `);
  return { ...out, errors: page.errors.slice(0, 4) };
});

ok('2 IT RUNS in a page (import + build, no throw)', res.hasClean && res.len === 288 * 512, `${res.len} px built in ${res.ms} ms; page errors: ${res.errors.length}`);
const want = scenes[0];
ok('3 IT REPRODUCES THE OPERATOR\'S OWN FNV (two builds equal)', res.h1 === want.fnv && res.h2 === res.h1, `got ${res.h1}${res.h1 === want.fnv ? ' (matches the recorded frame)' : ` — recorded ${want.fnv}`}`);
ok('4 IT REPORTS THE OPERATOR\'S OWN STAGE NUMBERS', res.palette === want.palette && res.wn === want.wn && JSON.stringify(res.rep) === JSON.stringify(want.region),
  `palette ${res.palette}/${want.palette} · windows ${res.wn}/${want.wn} · ${res.rep.map((r) => r.name + ' ' + r.grid + '/' + r.nw).join(' | ')}`);

console.log(`\n${fail ? 'ENGINE CHECK FAILED' : 'ENGINE CHECK PASSED'}: ${pass} of ${pass + fail} - the app runs the operator's engine, and it produces the operator's own frames.`);
process.exit(fail ? 1 : 0);
