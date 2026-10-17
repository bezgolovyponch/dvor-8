// G-DET: IS THE FRAME REPRODUCIBLE? Two runs of the SAME unpatched page, same photo, same settings, judged by the
// published pixelmatch (gates/frame-diff.mjs). Until this passes, every pixel attribution is noisy - the entry
// snapshot recorded two unpatched runs differing by 4167 px.
//
// THE CLOCK IS PINNED, AND WHY. `?news=0` removed the network headline; it did NOT remove the rest, because a
// capture also lands at a different MOMENT of the animation: the photograph takes a variable time to build, so run
// A photographs the yard at 30.1 s of its own clock and run B at 31.4 s, and a moving particle or a walker is at a
// different pixel. That is the measuring moment, not a re-rolled decision - proven by decomposition, each level
// with its own gate: G-DET-PARSE (parse bit-identical), G-DET-DETECT (detector bit-identical), G-DET-WORLD (the
// built world bit-identical), G-DET-RENDER (byte-identical at a pinned clock), G-DET-CLOCK (byte-identical across
// builds at a pinned clock). `?clock=` pins the animation clock and the time step, so this gate measures the
// RENDERER's reproducibility instead of the machine's timing. The pin is printed in the premises below.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
const PHOTO = process.env.PHOTO || 'photos-test/v10a.jpg';
const CLOCK = process.env.CLOCK || '7.5';
const BASE = process.env.BASE || `http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=${CLOCK}`;   // news off: its text is network-fed; clock pinned: see above
const out = ['/tmp/det-a', '/tmp/det-b'];
console.log(`PREMISES: two unpatched captures of the same photograph through the game's own file input · BASE ${BASE} · the page reports the pin it used, read back below`);
for (const d of out) {
  mkdirSync(d, { recursive: true });
  rmSync(`${d}/canvas.json`, { force: true });   // no stale dump may be read back as this run's pin
  execFileSync('node', ['--experimental-websocket', 'tools/photo-shot.mjs', d, PHOTO, 'ЦУНАМИ'], { env: { ...process.env, BASE }, stdio: 'ignore' });
  execFileSync('python3', ['-c', `from PIL import Image; import json; d=json.load(open('${d}/canvas.json')); Image.frombytes('RGB',(d['w'],d['h']),bytes(int(v) for v in d['px'].split(','))).save('${d}/frame.png')`]);
}
// frame-diff EXITS 1 WHEN THE FRAMES DIFFER - which is the normal case here, so its non-zero exit must not throw.
let res = '';
try { res = execFileSync('node', ['gates/frame-diff.mjs', `${out[0]}/frame.png`, `${out[1]}/frame.png`], { encoding: 'utf8' }); }
catch (e) { res = (e.stdout || '') + (e.stderr || ''); }
process.stdout.write(res);
// THE PIN IS A PREMISE, AND IT IS READ BACK FROM THE PAGES THAT WERE CAPTURED, not assumed from the URL: a
// capture whose page never applied the pin is a capture of the measuring moment, and its verdict is withheld.
// The dump is deleted before each capture, so a missing dump reads as MISSING and never as last run's pin.
const dumps = out.map((d) => {
  try { return JSON.parse(readFileSync(`${d}/canvas.json`, 'utf8')); } catch { return null; }
});
const pins = dumps.map((d) => (d && d.clockPin !== undefined ? `${d.clockPin}@${d.clock}` : 'NO DUMP'));
console.log(`CLOCK PIN READ BACK FROM THE TWO CAPTURED PAGES: ${pins.join(' · ')} (wanted ${CLOCK}@${CLOCK})`);
const pinned = dumps.every((d) => d && Number(d.clockPin) === Number(CLOCK) && Number(d.clock) === Number(CLOCK));
const px = Number((/DIFFERING PIXELS: (\d+)/.exec(res) || [])[1] || -1);
const bar = 500;
if (!pinned) {
  console.log(`G-DET VERDICT WITHHELD: the clock pin did not reach both captures (${pins.join(' · ')}), so this pair is a measurement of timing, not of the renderer.`);
  process.exit(2);
}
console.log(`G-DET ${px >= 0 && px <= bar ? 'PASS' : 'FAIL'}: ${px} px differ between two unpatched runs (bar ${bar}, photo ${PHOTO}, clock pin ${CLOCK})`);
process.exit(px >= 0 && px <= bar ? 0 : 1);
