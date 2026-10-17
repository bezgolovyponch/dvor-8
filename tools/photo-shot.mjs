// ONE REAL PHOTOGRAPH, one run, screenshots of every state the checklist needs.
//
// This exists because every visual requirement was unverifiable: my inline scripts loaded the photo with a long
// await loop and never returned, while tools/check.mjs loads the same photo fine because it drives the page the
// way the harness is built to - short scripts, polling with page.wait, a screenshot per state. So the states are
// captured here, by the same primitives, in one run:
//
//   idle with the yard built -> aim highlight -> info tooltip -> a disaster mid-event -> the end card
//
// Usage: BASE=... node tools/photo-shot.mjs <outdir> photos-test/5.jpg [disaster]
import { withPage } from './browser.mjs';

const out = process.argv[2] || '.';
const photo = process.argv[3] || 'photos-test/5.jpg';
const fate = process.argv[4] || 'ЦУНАМИ';
const BASE = process.env.BASE || 'http://127.0.0.1:4312/game/';
const results = [];

await withPage(BASE, {}, async (page) => {
  await page.wait(2500);
  await page.shot(`${out}/0-title.png`);
  // the photograph, through the game's own input, exactly as check.mjs does it
  const bytes = (await import('node:fs')).readFileSync(new URL(`../${photo}`, import.meta.url));
  await page.run(`
    const input = document.getElementById('shot');
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([${Array.from(bytes.slice(0, 4)).join(',')}])], 'x.jpg'));
    input.files = dt.files;
    return 'ready';`);
  // a real file: write it into the page through a data URL, which the input accepts
  const b64 = bytes.toString('base64');
  await page.run(`
    const input = document.getElementById('shot');
    const bin = atob(${JSON.stringify(b64)});
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
    const dt = new DataTransfer();
    dt.items.add(new File([arr], 'photo.jpg', { type: 'image/jpeg' }));
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return 'sent';`);
  // the yard is built when the counter leaves 0; poll instead of sleeping a fixed time
  for (let i = 0; i < 45; i += 1) {
    await page.wait(2000);
    const left = await page.run(`return document.getElementById('left').textContent`);
    if (left && left !== '0') break;
  }
  // THE CANVAS, DUMPED AT 1:1 - every pixel, because every-second-pixel was measuring the wrong thing.
  //
  // The gate cannot measure a picture through a screenshot (the creator's own reference arrives as a photograph of
  // a phone screen and measures 3% flat there), so what is measured is the pixels the game DREW. The first version
  // took every SECOND pixel, which made "neighbour" mean two art pixels away: a 1-pixel stray - exactly the fault
  // the creator's eye catches - was invisible to the measurement, and the stray-pixel cleanup I wrote moved the
  // number by 0.2% because the instrument could not see it. The dump is now every pixel.
  // THE DUMP WAITS UNTIL THE YARD IS FINISHED BEING DRAWN. The scan wipes the frame top-down, so a dump taken
  // during it measures the TRANSIENT: the top band reads grey and the facades read as zero window sprites, and a
  // gate that is handed that frame reports the scan as a fault in the picture. It did exactly that - three
  // mandatory delivery lines failed on a frame that was still being drawn. The dump is now taken when the TOP BAND
  // IS A PLANE: retried until one colour owns at least 35% of it, which is a property of the finished sky and of
  // nothing else that appears during the scan.
  for (let tries = 0; tries < 40; tries += 1) {   // up to 28 s: the build, the scan and the first draws take that long
    const probe = await page.run(`
      const c = document.getElementById('yard') || document.getElementById('view');
      const g = c.getContext('2d');
      const band = Math.max(1, Math.floor(c.height * 0.08));
      const d = g.getImageData(0, 0, c.width, band).data;
      const hist = new Map();
      let blue = 0;
      for (let i = 0; i < d.length; i += 4) {
        const k = d[i] + ',' + d[i+1] + ',' + d[i+2];
        hist.set(k, (hist.get(k) || 0) + 1);
        if (d[i+2] > d[i] + 25) blue += 1;
      }
      const top = [...hist.values()].sort((p, q) => q - p)[0] / (band * c.width);
      return { share: top, blue: blue / (band * c.width), w: c.width, h: c.height };`);
    // THE WAIT IS FOR THE DRAWN SKY, NOT FOR "A FLAT BAND". The old condition - one colour owning 35% of the top band
    // - is satisfied by the PHOTOGRAPH's own overcast sky, so the dump and the shots were taken of the SCAN state,
    // not of the drawn frame: grey sky, dimmed photograph. That is why the sky was "fixed" four times while the
    // product's canvas measured 72% blue the whole time. The drawn sky's own signature is the condition now.
    if (probe && probe.blue >= 0.5) break;
    await new Promise((r) => setTimeout(r, 700));
  }
  const dump = await page.run(`
    const c = document.getElementById('yard') || document.getElementById('view');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const out = [];
    for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const i = (y * c.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]); }
    return { w: c.width, h: c.height, px: out.join(','), clockPin: window.__clockPin, clock: window.__clock };`);
  if (dump && dump.px) (await import('node:fs')).writeFileSync(`${out}/canvas.json`, JSON.stringify(dump));
  results.push({ step: 'built', ...(await page.run(`return { left: document.getElementById('left').textContent, note: document.getElementById('note').textContent.slice(0, 90) }`)) });
  await page.shot(`${out}/1-yard.png`);

  // THE SELF-TEST PANEL, READ FROM THE PAGE (docs/CRITERIA.md I3). The panel is drawn at load by src/main.js:669 and
  // re-run by the #selfRun button (:668). Reading it here turns I3 from a source-grep into EVIDENCE: the rows the page
  // drew by itself, then the panel EMPTIED and the button clicked, then the rows again - so the second read can only
  // come from the button. The result is written BESIDE canvas.json, which is what tools/criteria-check.mjs reads. A run
  // that skips this step leaves no file, and the criterion then says the page step did not run instead of passing on
  // the source text.
  const selfRows = `const rows = [...document.querySelectorAll('#selfRows .selfRow')].map((r) => ({
      state: (r.querySelector('b') || {}).textContent || '',
      name: (r.querySelector('span') || {}).textContent || '',
      detail: (r.querySelector('i') || {}).textContent || '' }));`;
  const selfLoad = await page.run(`${selfRows} return { count: rows.length, rows };`);
  const selfRerun = await page.run(`
    const box = document.getElementById('selfRows'), btn = document.getElementById('selfRun');
    const clearedFrom = box ? box.querySelectorAll('.selfRow').length : 0;
    if (box) box.innerHTML = '';                 // an empty box proves the rows below came from the CLICK, not from load
    // THE PAGE'S ERROR LOG IS PART OF THE EVIDENCE. A listener that throws does NOT throw at click(): the exception
    // goes to the console, which tools/browser.mjs records on page.errors. And the load-time run is wrapped in a
    // try/catch (src/main.js:669), so a row that throws leaves an EMPTY panel and no trace anywhere else - which is
    // exactly how "the panel is built" survived a source-reading recon. Both are captured here and written below.
    let error = '';
    try { if (btn) btn.click(); } catch (e) { error = String((e && e.stack) || (e && e.message) || e).split('\\n').slice(0, 3).join(' | '); }
    const again = [...document.querySelectorAll('#selfRows .selfRow')].map((r) => ({
      state: (r.querySelector('b') || {}).textContent || '',
      name: (r.querySelector('span') || {}).textContent || '',
      detail: (r.querySelector('i') || {}).textContent || '' }));
    return { clicked: !!btn, clearedFrom, count: again.length, rows: again, error: error || (window.__err ? String(window.__err) : '') };`);
  await page.wait(250);                          // the console event arrives after the evaluate's response, so let it land
  const selfErrors = page.errors.filter((e) => /runSelfTest|selfRun|selfRows|selfTest/.test(String(e))).slice(-3);
  (await import('node:fs')).writeFileSync(`${out}/selftest.json`, JSON.stringify({ onLoad: selfLoad, afterClick: selfRerun, errors: selfErrors }, null, 1));
  results.push({ step: 'selftest', onLoad: (selfLoad || {}).count || 0, clearedFrom: (selfRerun || {}).clearedFrom || 0, afterClick: (selfRerun || {}).count || 0, clicked: !!(selfRerun || {}).clicked, error: (selfRerun || {}).error || selfErrors[0] || null });

  // AIM: the thing under the finger, outlined in pink
  await page.run(`
    const el = document.getElementById('tilt'), r = document.getElementById('frame').getBoundingClientRect();
    for (const fx of [0.30, 0.45, 0.60]) {
      const o = { clientX: r.left + r.width * fx, clientY: r.top + r.height * 0.68, bubbles: true, pointerId: 1 };
      el.dispatchEvent(new PointerEvent('pointermove', o));
      await new Promise((res) => setTimeout(res, 220));
    }
    return 'aimed';`);
  await page.shot(`${out}/2-aim.png`);

  // INFO: the tooltip and its outline
  await page.run(`
    document.getElementById('infoBtn').click();
    const el = document.getElementById('tilt'), r = document.getElementById('frame').getBoundingClientRect();
    const o = { clientX: r.left + r.width * 0.45, clientY: r.top + r.height * 0.68, bubbles: true, cancelable: true, pointerId: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    return 'asked';`);
  await page.wait(900);
  results.push({ step: 'info', ...(await page.run(`return { note: document.getElementById('note').textContent.slice(0, 120) }`)) });
  await page.shot(`${out}/3-info.png`);

  // DESTROYABILITY, on the real photograph: throw at the same thing until the game has taken it apart, and
  // capture what is left. This is the check that matters for requirement 14 - remains, not a black hole.
  await page.run(`
    document.getElementById('infoBtn').click();
    const el = document.getElementById('tilt'), r = document.getElementById('frame').getBoundingClientRect();
    const o = { clientX: r.left + r.width * 0.34, clientY: r.top + r.height * 0.68, bubbles: true, cancelable: true, pointerId: 1 };
    for (let i = 0; i < 8; i += 1) { el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); await new Promise((res) => setTimeout(res, 420)); }
    return 'thrown';`);
  await page.wait(600);
  await page.shot(`${out}/6-destroyed.png`);
  results.push({ step: 'destroyed', ...(await page.run(`return { left: document.getElementById('left').textContent, score: document.getElementById('score').textContent }`)) });

  // THE DISASTER, mid-event
  await page.run(`
    document.getElementById('infoBtn').click();
    document.getElementById('fateBox').open = true;
    return 'opened';`);
  await page.wait(400);
  await page.run(`
    const b = [...document.querySelectorAll('#fates button')].find((x) => x.textContent.includes(${JSON.stringify(fate)}));
    if (b) b.click();
    return 'summoned';`);
  await page.wait(5000);
  await page.shot(`${out}/4-disaster.png`);
  await page.wait(6000);
  await page.shot(`${out}/5-disaster-late.png`);
  results.push({ step: 'disaster', ...(await page.run(`return { left: document.getElementById('left').textContent, fate: document.getElementById('fateNow').textContent, note: document.getElementById('note').textContent.slice(0, 90) }`)) });
  // THE PAGE GATE'S `console clean` MEANS THE BUILD PATH, AND IT STAYS A BUILD-PATH MEASUREMENT. The self-test step
  // above deliberately clicks #selfRun, and runSelfTest throws today (main.js:224 reads an undeclared PX) - an
  // exception from a LISTENER goes to the console, so it cannot be caught by the caller. Folding that into `errors`
  // would turn a build-path gate red for a probe the gate did not run; dropping it would hide a real fault. So it is
  // reported, in its own field, and the criterion that owns the panel (I3) reads it from selftest.json.
  const panelErrors = page.errors.filter((e) => /runSelfTest|selfRun/.test(String(e)));
  results.push({ step: 'errors', errors: page.errors.filter((e) => !/XNNPACK/.test(e) && !/runSelfTest|selfRun/.test(String(e))), panelErrors });
  for (const r of results) console.log(JSON.stringify(r));
});
process.exit(0);
