// Drawing. The picture is rebuilt from indices through the current palette on every frame, which is what
// lets a filter change everything at once and a broken thing simply be gone.

import { paletteFor, css, OUTLINE, COOL, WARM } from './palette.js';
import { ROCK_TIME } from './fx.js';

export function makeBuffer(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d'), image: new ImageData(w, h) };
}

// scanY: null once the scan is over; before that, everything below it is still the photograph.
export function draw(ctx, buf, world, fx, { filter, seconds, scanY, motion, shake }) {
  const pal = paletteFor(filter, seconds);
  const { w, h, idx, rubble, photo } = world;
  const d = buf.image.data;
  for (let y = 0, i = 0; y < h; y += 1) {
    const real = scanY !== null && y > scanY;
    for (let x = 0; x < w; x += 1, i += 1) {
      const o = i * 4;
      if (real) { d[o] = photo[o]; d[o + 1] = photo[o + 1]; d[o + 2] = photo[o + 2]; }
      else { const c = pal[rubble[i] !== 255 ? rubble[i] : idx[i]]; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; }
      d[o + 3] = 255;
    }
  }
  buf.ctx.putImageData(buf.image, 0, 0);

  const ox = motion.x + shake.x, oy = motion.y + shake.y;
  ctx.fillStyle = css(pal[OUTLINE]);
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(buf.canvas, ox, oy);
  if (motion.ghost) {
    ctx.globalAlpha = motion.ghost.alpha;
    ctx.drawImage(buf.canvas, ox + motion.ghost.dx, oy);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(ox, oy);
  // Corner brackets on everything still standing: what can be hit is never a guess.
  for (const r of world.regions) {
    if (!r.seen || r.gone) continue;
    if ((seconds * 2 + r.id * 0.37) % 1 > 0.8) continue;   // a blink, out of step with its neighbours
    const colour = r.hits ? '#fff' : css(pal[r.id % 2 ? WARM + 5 : COOL + 5]);
    const x0 = r.x - 2, y0 = r.y - 2, x1 = r.x + r.w + 1, y1 = r.y + r.h + 1, k = 5;
    // Drawn twice: a dark copy one pixel down and right, then the colour, so a bracket reads on any yard.
    for (const [dx, dy, fill] of [[1, 1, css(pal[OUTLINE])], [0, 0, colour]]) {
      ctx.fillStyle = fill;
      for (const [cx, cy, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        ctx.fillRect((sx > 0 ? cx : cx - k + 1) + dx, cy + dy, k, 1);
        ctx.fillRect(cx + dx, (sy > 0 ? cy : cy - k + 1) + dy, 1, k);
      }
    }
  }
  for (const p of fx.particles) {
    ctx.fillStyle = css(pal[p.c]);
    const s = p.life > 2.6 ? 2 : 1;
    ctx.fillRect(p.x | 0, p.y | 0, s, s);
  }
  for (const r of fx.rocks) {
    const t = Math.min(1, r.t / ROCK_TIME);
    const x = r.x0 + (r.tx - r.x0) * t, y = r.y0 + (r.ty - r.y0) * t;
    ctx.fillStyle = css(pal[WARM + 3]);
    ctx.fillRect(Math.round(x - (r.tx - r.x0) * 0.08) - 1, Math.round(y - (r.ty - r.y0) * 0.08) - 1, 2, 2);
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
  }
  for (const ring of fx.rings) {
    const rad = Math.round(2 + ring.t * 44);
    ctx.strokeStyle = css(pal[COOL + 5]);
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(ring.x) - rad + 0.5, Math.round(ring.y) - rad + 0.5, rad * 2, rad * 2);
  }
  if (scanY !== null) {
    ctx.fillStyle = css(pal[COOL + 5]);
    ctx.fillRect(-8, Math.round(scanY), w + 16, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(-8, Math.round(scanY) + 2, w + 16, 1);
  }
  ctx.restore();
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.55).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
}
