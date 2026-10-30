// Drives the real page in headless Chrome, in real time, over the DevTools protocol. No dependencies.
//
//   node --experimental-websocket tools/browser.mjs <url> '<async js returning JSON>' [screenshot.png] [width] [height]
//
// The expression runs in the page; `await` works. Used by tools/check.mjs and for looking at the game.

import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

// A LAUNCH THAT FAILS MUST SAY WHY. The launcher used to swallow the browser's stderr (`stdio: 'ignore'`) and throw the
// bare "Chrome did not start", which is what every flaky run reported - a message that names neither the cause nor the
// browser. It now keeps the tail of stderr, reports the exit code, and retries once on a fresh port, because a machine
// running other browsers can lose the race for the DevTools endpoint.
async function launch(width, height) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const dir = mkdtempSync(join(tmpdir(), 'dvor8-'));
  const chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`,
    `--window-size=${width},${height}`, '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  let tail = '';
  chrome.stderr.on('data', (b) => { tail = (tail + String(b)).slice(-600); });
  let target = null;
  for (let i = 0; i < 75 && !target; i += 1) {
    await new Promise((r) => setTimeout(r, 200));
    if (chrome.exitCode != null) break;
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
  }
  if (!target) { try { chrome.kill('SIGKILL'); } catch { /* gone */ } return { ok: false, port, dir, why: `exit ${chrome.exitCode} ${tail.replace(/\s+/g, ' ').slice(0, 240)}` }; }
  return { ok: true, chrome, port, dir };
}
export async function withPage(url, { width = 412, height = 915 } = {}, fn) {
  let launchInfo = await launch(width, height);
  if (!launchInfo.ok) {
    // ONE RETRY, on a fresh port and profile: the failure mode on a busy machine is a lost race, not a broken browser.
    await new Promise((r) => setTimeout(r, 1500));
    const again = await launch(width, height);
    if (!again.ok) throw new Error(`Chrome did not start (two attempts). First: ${launchInfo.why}. Second: ${again.why}`);
    launchInfo = again;
  }
  const { port } = launchInfo, chrome = launchInfo.chrome;
  try {
    let target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
    if (!target) throw new Error('the DevTools endpoint came up but listed no page');
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    let seq = 0;
    const waiting = new Map(), log = [];
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
      if (msg.method === 'Runtime.exceptionThrown') log.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') log.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    };
    const send = (method, params = {}) => new Promise((resolve) => { const id = (seq += 1); waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
    await send('Runtime.enable'); await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true });
    await send('Page.navigate', { url });
    await new Promise((r) => setTimeout(r, 900));
    const page = {
      errors: log,
      async run(expression) {
        const r = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
        if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text);
        return r.result.result.value;
      },
      // A CLIP IS A PICTURE OF THE THING ITS NAME SAYS. `toolbar.png` was the whole page because the caller computed a
      // box and this helper ignored it; Playwright's clip is passed straight to the CDP call.
      async shot(file, clip = null) {
        const params = { format: 'png' };
        if (clip) params.clip = { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 };
        writeFileSync(file, Buffer.from((await send('Page.captureScreenshot', params)).result.data, 'base64'));
      },
      wait: (ms) => new Promise((r) => setTimeout(r, ms)),
    };
    return await fn(page);
  } finally { chrome.kill(); }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [url, expression, file, width, height] = process.argv.slice(2);
  const out = await withPage(url, { width: Number(width) || 412, height: Number(height) || 915 }, async (page) => {
    const value = await page.run(expression || 'return document.title');
    if (file) await page.shot(file);
    return { value, errors: page.errors };
  });
  console.log(JSON.stringify(out, null, 1));
  process.exit(0);
}
