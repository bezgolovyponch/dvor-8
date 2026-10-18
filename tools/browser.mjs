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

export async function withPage(url, { width = 412, height = 915 } = {}, fn) {
  const port = 9300 + Math.floor(Math.random() * 500);
  const chrome = spawn(CHROME, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'dvor8-'))}`,
    `--window-size=${width},${height}`, '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  try {
    let target;
    for (let i = 0; i < 50 && !target; i += 1) {
      await new Promise((r) => setTimeout(r, 200));
      try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page'); } catch { /* not up yet */ }
    }
    if (!target) throw new Error('Chrome did not start');
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
