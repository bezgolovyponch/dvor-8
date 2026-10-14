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
  for (let tries = 0; tries < 12; tries += 1) {
    const probe = await page.run(`
      const c = document.getElementById('view') || document.querySelector('canvas');
      const g = c.getContext('2d');
      const band = Math.max(1, Math.floor(c.height * 0.08));
      const d = g.getImageData(0, 0, c.width, band).data;
      const hist = new Map();
      for (let i = 0; i < d.length; i += 4) { const k = d[i] + ',' + d[i+1] + ',' + d[i+2]; hist.set(k, (hist.get(k) || 0) + 1); }
      const top = [...hist.values()].sort((p, q) => q - p)[0] / (band * c.width);
      return { share: top, w: c.width, h: c.height };`);
    if (probe && probe.share >= 0.35) break;
    await new Promise((r) => setTimeout(r, 700));
  }
  const dump = await page.run(`
    const c = document.getElementById('view') || document.querySelector('canvas');
    const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const out = [];
    for (let y = 0; y < c.height; y += 1) for (let x = 0; x < c.width; x += 1) { const i = (y * c.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]); }
    return { w: c.width, h: c.height, px: out.join(',') };`);
  if (dump && dump.px) (await import('node:fs')).writeFileSync(`${out}/canvas.json`, JSON.stringify(dump));
  results.push({ step: 'built', ...(await page.run(`return { left: document.getElementById('left').textContent, note: document.getElementById('note').textContent.slice(0, 90) }`)) });
  await page.shot(`${out}/1-yard.png`);

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
  results.push({ step: 'errors', errors: page.errors.filter((e) => !/XNNPACK/.test(e)) });
  for (const r of results) console.log(JSON.stringify(r));
});
process.exit(0);
