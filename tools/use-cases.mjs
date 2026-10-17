// THE USE CASES, ONE PER PHOTOGRAPH — each with its own picture and its own gates.
//
// The gates were built on the judged photograph, and a single verdict for the whole product hides which use case it
// describes. This tool takes every photograph in the use-case list, captures it through the same harness, and prints
// for EACH: the frame's path, the mechanical gates that are meaningful on that photograph, their lines, and the
// picture. A use case is CONFIRMED when its picture exists and the gates that apply to it pass; the gates that do not
// apply are named as not-applicable rather than silently skipped.
//
//   CHROME=/tmp/chrome-nosandbox.sh node --experimental-websocket tools/use-cases.mjs [outdir]
import { withPage } from './browser.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = process.argv[2] || 'docs/use-cases';
mkdirSync(OUT, { recursive: true });

// THE USE CASES. Each says which mechanical gates APPLY and why - match's regions are the accepted frame's own
// rectangles, so they are meaningful only on the judged photograph; the plan and pairing are photo-agnostic.
const CASES = [
  { id: 'judged-v10a', photo: 'photos-test/v10a.jpg', what: 'the photograph the accepted frame was made from',
    applies: ['match', 'plan', 'pairing', 'style', 'reference'] },
  { id: 'second-yard', photo: 'photos-test/yard2-new.jpg', what: 'the operator\'s second yard: a different building, a different layout',
    applies: ['plan', 'pairing', 'style', 'reference'] },
];

const run = (cmd, args) => { try { return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return (e.stdout || '') + (e.stderr || ''); } };
const line = (s, re) => (s.split('\n').find((l) => re.test(l)) || '').trim();

let fails = 0;
const report = ['# THE USE CASES — one photograph at a time', '',
  'Each use case is a photograph the product must handle. For each: the picture, the mechanical gates that APPLY to it,',
  'and their lines. A gate that does not apply is named, not skipped silently.', ''];

for (const c of CASES) {
  const dir = `${OUT}/${c.id}`;
  mkdirSync(dir, { recursive: true });
  const base = 'http://127.0.0.1:4312/game/index.html?clean=1&news=0&clock=7.5&photo=/game/' + c.photo;
  await withPage(base, { width: 412, height: 915 }, async (page) => {
    const built = await page.run(`
      const t0 = performance.now();
      while (!window.__world && performance.now() - t0 < 60000) await new Promise((r) => setTimeout(r, 250));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      return { left: document.getElementById('left').textContent, note: document.getElementById('note').textContent.slice(0, 70) };`);
    await page.shot(`${dir}/frame.png`);
    // the raw canvas, for the gates
    const dump = await page.run(`
      const c = document.getElementById('yard'), g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data, out = [];
      for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const i = (y * c.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]); }
      const pl = window.__plan || null;
      return { w: c.width, h: c.height, px: out.join(','), plan: pl ? { bands: pl.bands, facades: (pl.facades || []).map((f) => ({ role: f.role, box: f.box })) } : null };`);
    writeFileSync(`${dir}/canvas.json`, JSON.stringify(dump));
    const g = {};
    if (c.applies.includes('match')) g.match = line(run('node', ['tools/match-check.mjs', `${dir}/canvas.json`]), /lines match/);
    if (c.applies.includes('plan')) g.plan = line(run('node', ['tools/plan-check.mjs', `${dir}/canvas.json`]), /PLAN (ACCEPTED|NOT ACCEPTED)/);
    if (c.applies.includes('pairing')) g.pairing = line(run('node', ['tools/pairing-check.mjs', c.photo, `${dir}/canvas.json`]), /PAIRED/);
    if (c.applies.includes('style')) g.style = line(run('node', ['tools/style-check.mjs', `${dir}/canvas.json`, c.photo]), /IN THE STYLE|NOT IN THE STYLE/);
    if (c.applies.includes('reference')) g.reference = line(run('node', ['tools/reference-palette-check.mjs', `${dir}/canvas.json`]), /MATCHES|DOES NOT/);
    const ok = Object.values(g).every((l) => l && !/NOT |DOES NOT|FAIL/.test(l));
    if (!ok) fails += 1;
    console.log(JSON.stringify({ case: c.id, built: built.left, ok, gates: g }));
    report.push(`## ${c.id} — ${c.what}`, '', `- photograph: \`${c.photo}\``, `- frame: \`${dir}/frame.png\``,
      `- built: ${built.left} targets`, `- gates that apply: **${c.applies.join(', ')}**`, '');
    for (const [k, v] of Object.entries(g)) report.push(`  - **${k}**: ${v || 'NO LINE'}`);
    const notApplicable = ['match', 'plan', 'pairing', 'style', 'reference'].filter((k) => !c.applies.includes(k));
    if (notApplicable.length) report.push(`  - not applicable here: ${notApplicable.join(', ')} — ${notApplicable.includes('match') ? 'match\'s regions are the ACCEPTED frame\'s own rectangles' : ''}`);
    report.push('');
  });
}
report.push('---', '', fails ? `**${fails} use case(s) NOT confirmed.**` : '**Every use case confirmed: its picture exists and every gate that applies to it passes.**', '');
writeFileSync(`${OUT}/README.md`, report.join('\n'));
console.log(fails ? `\nUSE CASES NOT CONFIRMED: ${fails}.` : `\nUSE CASES CONFIRMED: ${CASES.length}.`);
process.exit(fails ? 1 : 0);
