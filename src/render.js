// Drawing. The picture is rebuilt from indices through the current table on every frame, which is what
// lets a filter change everything at once and a broken thing simply be a wreck.

import { lookThrough, css, OUTLINE } from './palette.js';
import { inFocus } from './modes.js';

export function makeBuffer(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d'), image: new ImageData(w, h) };
}

// What is in the hand, as a handful of pixels. `spin` turns it in flight.
const THINGS = {
  sober: (c, x, y) => { c.fillStyle = '#2a2233'; c.fillRect(x - 2, y - 1, 4, 4); c.fillStyle = '#e8e4f0'; c.fillRect(x - 2, y - 2, 3, 3); },
  weed: (c, x, y, spin) => { c.fillStyle = '#ff6fa8'; if (spin) c.fillRect(x - 1, y - 3, 3, 6); else c.fillRect(x - 3, y - 1, 6, 3); c.fillStyle = '#fff'; c.fillRect(x - 1, y - 1, 2, 2); },
  alcohol: (c, x, y, spin) => { c.fillStyle = '#35d07f'; if (spin) { c.fillRect(x - 3, y - 1, 5, 3); c.fillRect(x + 2, y, 2, 1); } else { c.fillRect(x - 1, y - 2, 3, 5); c.fillRect(x, y - 4, 1, 2); } c.fillStyle = '#d7ffe9'; c.fillRect(x - 1, y - 1, 1, 1); },
  depression: (c, x, y) => { c.fillStyle = '#3a1410'; c.fillRect(x - 3, y - 1, 7, 4); c.fillStyle = '#b5482f'; c.fillRect(x - 3, y - 2, 6, 3); c.fillStyle = '#7a2c1c'; c.fillRect(x - 3, y - 1, 6, 1); },
};

// scanY: null once the scan is over; before that, everything below it is still the photograph.
export function draw(ctx, buf, world, fx, { filter, mode, seconds, scanY, motion, shake }) {
  const pal = lookThrough(world.palette, filter, seconds);
  const { w, h, idx, rubble, photo } = world;
  const d = buf.image.data;
  const focus = scanY === null ? mode.focus : null;
  const r2 = focus ? (focus.radius * Math.min(w, h)) ** 2 : 0;
  const fxx = fx.focus.x, fyy = fx.focus.y;
  for (let y = 0, i = 0; y < h; y += 1) {
    const real = scanY !== null && y > scanY;
    for (let x = 0; x < w; x += 1, i += 1) {
      const o = i * 4;
      if (real) { d[o] = photo[o]; d[o + 1] = photo[o + 1]; d[o + 2] = photo[o + 2]; d[o + 3] = 255; continue; }
      let src = i, dim = 1;
      if (focus) {
        const dist = (x - fxx) ** 2 + (y - fyy) ** 2;
        if (dist > r2) {
          // out of focus: the yard is read in blocks of three, so detail is lost but shapes are not
          src = Math.min(h - 1, y - (y % 3) + 1) * w + Math.min(w - 1, x - (x % 3) + 1);
          if (focus.out === 'dark') dim = dist > r2 * 2.2 ? 0.2 : 0.42;
        }
      }
      const c = pal[rubble[src] !== 255 ? rubble[src] : idx[src]];
      d[o] = c[0] * dim; d[o + 1] = c[1] * dim; d[o + 2] = c[2] * dim; d[o + 3] = 255;
    }
  }
  buf.ctx.putImageData(buf.image, 0, 0);

  const ox = motion.x + shake.x, oy = motion.y + shake.y;
  ctx.fillStyle = css(pal[OUTLINE]);
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(buf.canvas, ox, oy);
  if (motion.ghost && scanY === null) {
    ctx.globalAlpha = motion.ghost.alpha;
    ctx.drawImage(buf.canvas, ox + motion.ghost.dx, oy);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(ox, oy);
  // Corner brackets on everything still standing and in view: what can be hit is never a guess.
  for (const r of world.regions) {
    if (!r.seen || r.gone) continue;
    if (scanY === null && !inFocus(mode, world, r, fxx, fyy)) continue;
    if ((seconds * 2 + r.id * 0.37) % 1 > 0.82) continue;   // a blink, out of step with its neighbours
    const colour = r.hits ? '#ffffff' : r.id % 2 ? '#ffd23f' : '#3fe0f0';
    const x0 = r.x - 2, y0 = r.y - 2, x1 = r.x + r.w + 1, y1 = r.y + r.h + 1, k = Math.max(3, Math.min(6, Math.round(Math.min(r.w, r.h) / 3)));
    for (const [dx, dy, fill] of [[1, 1, '#0b0018'], [0, 0, colour]]) {
      ctx.fillStyle = fill;
      for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.fillRect((sx > 0 ? cx : cx - k + 1) + dx, cy + dy, k, 1);
        ctx.fillRect(cx + dx, (sy > 0 ? cy : cy - k + 1) + dy, 1, k);
      }
    }
    // how much it can still take, as pips under it
    for (let n = 0; n < r.hp - r.hits; n += 1) { ctx.fillStyle = '#0b0018'; ctx.fillRect(x0 + n * 4, y1 + 2, 4, 3); ctx.fillStyle = '#f0286e'; ctx.fillRect(x0 + n * 4, y1 + 2, 3, 2); }
  }
  for (const p of fx.particles) {
    ctx.fillStyle = p.rgb || css(pal[p.c]);
    const s = p.life > 2.2 ? 2 : 1;
    ctx.fillRect(p.x | 0, p.y | 0, s, s);
  }
  for (const r of fx.rocks) {
    const t = Math.min(1, r.t / r.dur);
    const arc = Math.sin(t * Math.PI) * Math.min(24, r.dur * 90);   // a slow throw rises higher
    const x = Math.round(r.x0 + (r.tx - r.x0) * t), y = Math.round(r.y0 + (r.ty - r.y0) * t - arc);
    (THINGS[r.kind] || THINGS.sober)(ctx, x, y, Math.floor(seconds * 14) % 2 === 0);
  }
  for (const ring of fx.rings) {
    const rad = Math.round(2 + ring.t * 44);
    ctx.strokeStyle = '#3fe0f0';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(ring.x) - rad + 0.5, Math.round(ring.y) - rad + 0.5, rad * 2, rad * 2);
  }
  if (scanY !== null) {
    ctx.fillStyle = '#3fe0f0';
    ctx.fillRect(-8, Math.round(scanY), w + 16, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(-8, Math.round(scanY) + 2, w + 16, 1);
  }
  ctx.restore();
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
}
