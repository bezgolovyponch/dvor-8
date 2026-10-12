// Drawing. The picture is rebuilt from indices through the current table on every frame, which is what
// lets a filter change everything at once and a broken thing simply be a wreck.

import { lookThrough, css, OUTLINE } from './palette.js';
import { inFocus } from './modes.js';
import { glyph, ADVANCE, GLYPH_W, GLYPH_H } from './font.js';
import { boxes, SHIP, PLANE, BANNER_H, SHADOW } from './sky.js';
import { textWidth } from './font.js';

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
  water: (c, x, y, spin) => { c.fillStyle = '#0b0018'; c.fillRect(x - 3, y - 3, 6, 6); c.fillStyle = '#3f8cf0'; c.fillRect(x - 2, y - 2, 4, 4); c.fillStyle = '#d7f4ff'; c.fillRect(x - 2 + (spin ? 2 : 0), y - 2, 2, 1); },
  depression: (c, x, y) => { c.fillStyle = '#3a1410'; c.fillRect(x - 3, y - 1, 7, 4); c.fillStyle = '#b5482f'; c.fillRect(x - 3, y - 2, 6, 3); c.fillStyle = '#7a2c1c'; c.fillRect(x - 3, y - 1, 6, 1); },
};

// Whoever walks the yard: a dozen pixels, drawn the way an 8-bit console would. The shadow stays on the
// ground when the body leaves it, which is what makes a jump read as a jump on a flat picture.
function person(c, me, seconds) {
  const x = Math.round(me.x), y = Math.round(me.y), by = Math.round(me.y - me.z), air = me.z > 0;
  const shade = Math.max(3, 7 - Math.round(me.z / 5));
  c.fillStyle = 'rgba(11,0,24,.6)';
  c.fillRect(x - (shade >> 1), y, shade, 2);
  c.fillStyle = '#0b0018'; c.fillRect(x - 3, by - 13, 7, 13);
  c.fillStyle = '#2a2233'; c.fillRect(x - 2, by - 12, 5, 1);
  c.fillStyle = '#ffd9a8'; c.fillRect(x - 2, by - 11, 5, 3);
  c.fillStyle = '#0b0018'; c.fillRect(x + me.face, by - 10, 1, 1);
  c.fillStyle = '#f0286e'; c.fillRect(x - 2, by - 8, 5, 4);
  c.fillStyle = '#3fe0f0';
  const stride = air ? 1 : Math.floor(me.step) % 2;
  c.fillRect(x - 2, by - 4, 2, air ? 2 : stride ? 3 : 4);
  c.fillRect(x + 1, by - 4, 2, air ? 2 : stride ? 4 : 3);
  if (air && Math.floor(seconds * 16) % 2) { c.fillStyle = '#ffd23f'; c.fillRect(x - 3, by - 9, 1, 2); c.fillRect(x + 3, by - 9, 1, 2); }   // arms up
}

// The bottle in the hand, in the corner of the view, as full as it is. At the mouth it is lifted and
// tipped, and the level falls while you watch.
function bottle(c, w, h, full, busy) {
  const tip = busy > 0 ? Math.min(1, (1 - busy) * 4, busy * 5) : 0;   // 0 held, 1 at the mouth; busy runs 1 → 0
  c.save();
  c.translate(Math.round(w - 13 - tip * (w / 2 - 13)), Math.round(h - 4 - tip * 10));
  c.rotate(-tip * 2.0);
  c.fillStyle = '#0b0018'; c.fillRect(-5, -21, 10, 22); c.fillRect(-3, -29, 6, 9);
  c.fillStyle = '#1f7a4c'; c.fillRect(-4, -20, 8, 20); c.fillRect(-2, -28, 4, 8);
  const fill = Math.round(18 * Math.max(0, Math.min(1, full)));
  c.fillStyle = '#ffb347'; c.fillRect(-3, -1 - fill, 6, fill);
  c.fillStyle = '#d7ffe9'; c.fillRect(-3, -19, 1, 12);
  c.fillStyle = '#ffd23f'; c.fillRect(-2, -30, 4, 2);
  c.restore();
}

// A line in the picture's own letters. Only the dots between `from` and `to` are drawn (a board has
// edges); `lift` raises or lowers a letter by where it stands (a banner is not flat).
function write(c, text, x, y, colour, { from = -1e9, to = 1e9, lift = null } = {}) {
  c.fillStyle = colour;
  for (let i = 0; i < text.length; i += 1) {
    const gx = x + i * ADVANCE;
    if (gx + GLYPH_W <= from || gx >= to || text[i] === ' ') continue;
    const rows = glyph(text[i]), gy = y + (lift ? lift(gx) : 0);
    for (let r = 0; r < GLYPH_H; r += 1) {
      for (let col = 0, bits = rows[r]; bits; col += 1, bits = (bits << 1) & 31) {
        if (bits & 16 && gx + col >= from && gx + col < to) c.fillRect(gx + col, gy + r, 1, 1);
      }
    }
  }
}

const INK = '#0b0018', PINK = '#f0286e', CYAN = '#3fe0f0', GOLD = '#ffd23f', PALE = '#fff6c2';
const rects = (c, colour, list) => { c.fillStyle = colour; for (const [x, y, w, h] of list) c.fillRect(x, y, w, h); };

// The plane, nose to the left, and the line it tows. A banner that was cut loose falls flapping.
function plane(c, f, w, seconds) {
  const { body: { x, y }, sign } = boxes(f);
  rects(c, 'rgba(11,0,24,.35)', [[x + 2, y + SHADOW, PLANE.w - 4, 2]]);
  rects(c, INK, [[x + 1, y + 2, 15, 6], [x + 12, y - 1, 4, 4], [x + 5, y + 7, 7, 2]]);
  rects(c, PINK, [[x + 2, y + 3, 13, 4], [x + 13, y, 2, 3]]);
  rects(c, CYAN, [[x + 4, y + 3, 3, 2]]);
  rects(c, PALE, [[x + 6, y + 6, 5, 2]]);
  rects(c, GOLD, [[x + 1, y + 4, 1, 2]]);
  rects(c, Math.floor(seconds * 24) % 2 ? PALE : INK, [[x, y + 2, 1, 6]]);   // the propeller
  if (f.hit) { for (let n = 0; n < 4; n += 1) rects(c, n % 2 ? '#b9a9d6' : PALE, [[x + 18 + n * 7, y + 2 + Math.round(2 * Math.sin(f.t * 9 + n)), 3 - (n >> 1), 3 - (n >> 1)]]); }
  else rects(c, PALE, [[x + PLANE.w, y + 4, PLANE.rope, 1]]);
  const flap = f.hit ? 2.6 : 1.5, wave = (px) => Math.round(flap * Math.sin((px - sign.x) * 0.09 - f.t * 6));
  for (let bx = Math.max(sign.x, sign.x + Math.floor(-sign.x / ADVANCE) * ADVANCE); bx < Math.min(w, sign.x + sign.w); bx += ADVANCE) {
    const by = sign.y + wave(bx), end = bx === sign.x || bx + ADVANCE >= sign.x + sign.w;
    rects(c, INK, [[bx, by, ADVANCE, BANNER_H]]);
    rects(c, end ? PINK : PALE, [[bx, by + 1, ADVANCE, BANNER_H - 2]]);
  }
  write(c, f.text, sign.x + ADVANCE, sign.y + 2, INK, { from: 0, to: w, lift: wave });
}

// The airship, and the line running through the board on its side.
function ship(c, f, seconds) {
  const { body: { x, y }, sign } = boxes(f);
  rects(c, 'rgba(11,0,24,.35)', [[x + 10, y + SHADOW + 8, SHIP.w - 20, 3]]);
  rects(c, INK, [[x - 3, y + 1, 7, 7], [x - 3, y + 13, 7, 7], [x + 6, y, 62, 21], [x + 2, y + 3, 70, 15], [x, y + 6, 74, 9], [x + 27, y + 20, 20, 5]]);
  rects(c, PINK, [[x - 2, y + 2, 5, 5], [x - 2, y + 14, 5, 5]]);
  rects(c, '#3b1fa8', [[x + 7, y + 1, 60, 19], [x + 3, y + 4, 68, 13], [x + 1, y + 7, 72, 7]]);
  rects(c, CYAN, [[x + 10, y + 2, 50, 1]]);
  rects(c, PINK, [[x + 7, y + 17, 60, 2]]);
  rects(c, GOLD, [[x + 29, y + 22, 3, 1], [x + 35, y + 22, 3, 1], [x + 41, y + 22, 3, 1]]);
  rects(c, INK, [[sign.x, sign.y, sign.w, sign.h]]);
  if (f.hit) {   // a dead board: a few dots that will not settle
    for (let n = 0; n < 9; n += 1) rects(c, n % 2 ? '#b9a9d6' : PINK, [[sign.x + 2 + ((n * 37 + Math.floor(seconds * 18) * 11) % (sign.w - 4)), sign.y + 1 + ((n * 5) % 7), 2, 1]]);
  } else write(c, f.text, sign.x + sign.w - Math.round(f.scroll), sign.y + 1, GOLD, { from: sign.x + 1, to: sign.x + sign.w - 1 });
}

// Someone passing through the yard. The same dozen pixels as the walker, dressed by kind, and above the
// head what they are doing about you: «!» has noticed, an eye-high «!» in pink is looking, «?» has lost
// you, «112» is calling. That mark is the whole of the stealth: it must be readable at a glance.
const DRESS = {
  walker: { coat: '#b9a9d6', legs: '#2a2233', hair: '#2a2233' },
  drunk: { coat: '#35d07f', legs: '#560d6e', hair: '#7a2c1c' },
  lady: { coat: '#a3178c', legs: '#ffd9a8', hair: GOLD },
  cop: { coat: '#3b6cff', legs: '#12052e', hair: '#12052e' },
  courier: { coat: GOLD, legs: '#2a2233', hair: '#f0286e' },
};
function passer(c, p, seconds, hidden) {
  const d = DRESS[p.kind], still = p.state === 'alarm' || p.state === 'look';
  const sway = p.kind === 'drunk' && !still ? Math.round(Math.sin(p.t * 3 + p.phase)) : 0;
  const x = Math.round(p.x) + sway, y = Math.round(p.y), up = p.state === 'look' ? 1 : 0;
  const stride = still ? 0 : Math.floor((p.t + p.phase) * (p.state === 'flee' ? 14 : 7)) % 2;
  rects(c, 'rgba(11,0,24,.5)', [[x - 4, y, p.kind === 'courier' ? 13 : 8, 2]]);
  if (p.kind === 'courier') {   // the bicycle under him, and the box on his back
    const turn = Math.floor((p.t + p.phase) * 12) % 2;
    for (const wx of [x - 7, x + 3]) { rects(c, INK, [[wx, y - 5, 5, 5]]); rects(c, turn && !still ? PALE : '#b9a9d6', [[wx + 1, y - 4, 3, 3]]); rects(c, INK, [[wx + 2, y - 3, 1, 1]]); }
    rects(c, CYAN, [[x - 4, y - 6, 8, 1]]);
    rects(c, INK, [[x - p.dir * 5 - 2, y - 15, 6, 7]]); rects(c, '#ff9a2e', [[x - p.dir * 5 - 1, y - 14, 4, 5]]);
  }
  const by = p.kind === 'courier' ? y - 3 : y;
  rects(c, INK, [[x - 3, by - 13 - up, 7, 13 + up]]);
  if (p.kind === 'lady') rects(c, INK, [[x - 4, by - 7, 9, 5]]);
  rects(c, d.hair, [[x - 2, by - 12 - up, 5, 1]]);
  rects(c, '#ffd9a8', [[x - 2, by - 11 - up, 5, 3]]);
  if (up) rects(c, INK, [[x - 1, by - 11 - up, 1, 1], [x + 1, by - 11 - up, 1, 1]]);   // both eyes: the face is turned up at you
  else rects(c, INK, [[x + p.dir, by - 10, 1, 1]]);
  if (p.kind === 'cop') rects(c, GOLD, [[x, by - 12 - up, 1, 1]]);
  rects(c, d.coat, p.kind === 'lady' ? [[x - 2, by - 8, 5, 3], [x - 3, by - 6, 7, 3]] : [[x - 2, by - 8, 5, 4]]);
  if (p.kind !== 'courier') rects(c, d.legs, [[x - 2, by - (p.kind === 'lady' ? 3 : 4), 2, (p.kind === 'lady' ? 2 : 3) + stride], [x + 1, by - (p.kind === 'lady' ? 3 : 4), 2, (p.kind === 'lady' ? 3 : 4) - stride]]);
  if (p.kind === 'drunk') rects(c, '#ffb347', [[x + 3 * p.dir, by - 7, 1, 3]]);
  if (p.kind === 'lady') rects(c, PINK, [[x - 4 * p.dir, by - 5, 2, 3]]);
  if (p.wet && Math.floor(seconds * 8 + p.phase) % 3) rects(c, '#3f8cf0', [[x - 3, by - 9 + (Math.floor(seconds * 8) % 4), 1, 2], [x + 3, by - 6 - (Math.floor(seconds * 8) % 3), 1, 2]]);
  const mark = p.state === 'alarm' ? '!' : p.state === 'look' ? (hidden ? '?' : '!') : p.state === 'flee' && !p.called ? '112' : '';
  if (!mark) return;
  const mx = x - Math.floor(textWidth(mark) / 2), my = by - 23 - up - (p.state === 'look' && !hidden ? Math.floor(seconds * 10) % 2 : 0);
  rects(c, INK, [[mx - 2, my - 2, textWidth(mark) + 4, GLYPH_H + 4]]);
  write(c, mark, mx, my, p.state === 'look' ? (hidden ? CYAN : PINK) : GOLD);
}

// Hidden: the balcony's rail is between you and the yard. The yard can still be watched through it,
// which is the point — you wait for the look to pass — but nothing can be thrown.
function rail(c, w, h) {
  rects(c, 'rgba(11,0,24,.45)', [[0, 0, w, h]]);
  const top = h - Math.round(h * 0.2);
  rects(c, INK, [[0, top, w, h - top]]);
  rects(c, CYAN, [[0, top, w, 2]]);
  for (let x = 4; x < w; x += 10) rects(c, '#12052e', [[x, top + 2, 4, h - top - 2]]);
  write(c, 'СПРЯТАН', Math.round((w - textWidth('СПРЯТАН')) / 2), top + 6, PALE);
}

// scanY: null once the scan is over; before that, everything below it is still the photograph.
// cam: the part of the street on screen ({ x, y, w, h }); the buffer and the canvas are that size.
export function draw(ctx, buf, world, fx, { filter, mode, seconds, scanY, motion, shake, cam, me = null, drink = null, flier = null, folk = null }) {
  const pal = lookThrough(world.palette, filter, seconds);
  const { idx, rubble, photo, sw } = world, W = world.w, H = world.h;
  const w = cam.w, h = cam.h, cx = cam.x, cy = cam.y;
  const d = buf.image.data;
  const focus = scanY === null ? mode.focus : null;
  const r2 = focus ? (focus.radius * Math.min(sw, H)) ** 2 : 0;
  const fxx = fx.focus.x, fyy = fx.focus.y;
  for (let vy = 0, o = 0; vy < h; vy += 1) {
    const y = vy + cy, real = scanY !== null && y > scanY;
    for (let vx = 0; vx < w; vx += 1, o += 4) {
      const x = vx + cx;
      if (real && x < sw) { const q = (y * sw + x) * 4; d[o] = photo[q]; d[o + 1] = photo[q + 1]; d[o + 2] = photo[q + 2]; d[o + 3] = 255; continue; }
      let src = y * W + x, dim = 1;
      if (focus) {
        const dist = (x - fxx) ** 2 + (y - fyy) ** 2;
        if (dist > r2) {
          // out of focus: the yard is read in blocks of three, so detail is lost but shapes are not
          src = Math.min(H - 1, y - (y % 3) + 1) * W + Math.min(W - 1, x - (x % 3) + 1);
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
  ctx.translate(ox - cx, oy - cy);
  // Corner brackets on everything still standing and in view: what can be hit is never a guess.
  for (const r of world.regions) {
    if (!r.seen || r.gone || r.x > cx + w || r.x + r.w < cx) continue;
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
  if (folk && scanY === null) for (const p of [...folk.people].sort((a, b) => a.y - b.y)) if (p.x > cx - 12 && p.x < cx + w + 12) passer(ctx, p, seconds, folk.hidden);
  if (me?.down) person(ctx, me, seconds);
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
    ctx.fillRect(cx - 8, Math.round(scanY), w + 16, 2);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(cx - 8, Math.round(scanY) + 2, w + 16, 1);
  }
  ctx.restore();
  if (flier && scanY === null) {
    ctx.save();
    ctx.translate(ox, oy);
    if (flier.kind === 'plane') plane(ctx, flier, w, seconds); else ship(ctx, flier, seconds);
    ctx.restore();
  }
  if (folk?.hidden && scanY === null) rail(ctx, w, h);
  if (drink && scanY === null) bottle(ctx, w, h, drink.full, drink.busy);
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// The first yard as it now stands, enlarged, with the result written under it: a picture to keep or send.
// It is the game's picture, not the photograph — 192 pixels across, so a number plate is two pixels and a
// face is four.
export function postcard(world, title, line) {
  const { sw, h, idx, rubble, palette } = world, k = 3, foot = 104;
  const small = makeBuffer(sw, h), d = small.image.data;
  for (let y = 0, o = 0; y < h; y += 1) for (let x = 0; x < sw; x += 1, o += 4) {
    const p = y * world.w + x, c = palette[rubble[p] !== 255 ? rubble[p] : idx[p]];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  }
  small.ctx.putImageData(small.image, 0, 0);
  const card = document.createElement('canvas');
  card.width = sw * k; card.height = h * k + foot;
  const c = card.getContext('2d');
  c.fillStyle = '#12052e'; c.fillRect(0, 0, card.width, card.height);
  c.imageSmoothingEnabled = false;
  c.drawImage(small.canvas, 0, 0, sw * k, h * k);
  c.textBaseline = 'top';
  c.font = 'italic 900 40px "Arial Black", Impact, sans-serif';
  c.fillStyle = '#f0286e'; c.fillText(title, 19, h * k + 17);
  c.fillStyle = '#ffffff'; c.fillText(title, 16, h * k + 14);
  c.font = '700 19px ui-monospace, Menlo, Consolas, monospace';
  c.fillStyle = '#fff6c2'; c.fillText(line, 16, h * k + 68, card.width - 32);
  return card;
}
