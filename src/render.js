// Drawing. The picture is rebuilt from indices through the current table on every frame, which is what
// lets a filter change everything at once and a broken thing simply be a wreck.

import { lookThrough, css, OUTLINE } from './palette.js';
import { inFocus } from './modes.js';
import { glyph, ADVANCE, GLYPH_W, GLYPH_H } from './font.js';
import { boxes, SHIP, PLANE, BANNER_H, SHADOW } from './sky.js';
import { textWidth } from './font.js';
import { PAINTS, COVER } from './decal.js';
import { bloomPixels, parcelPixels } from './kind.js';
import { weatherTable } from './weather.js';
import { beastPixels, beastAt, eventSprite } from './disaster.js';
import { edgesOf } from './world.js';
import { disasterTable, DISASTERS as DISASTERS_LOOK } from './disaster.js';
import { RAMPS, STEPS } from './flat.js';

// A GAME PIXEL IS PX PICTURE PIXELS (view.js). The picture doubled so that a photograph keeps its detail;
// every sprite is still drawn in the old units, so each one is drawn PX times bigger AROUND ITS OWN ANCHOR —
// its position stays exact and its size stays what it was on the screen. One helper, used by every sprite
// below, rather than a factor sprinkled through sixty fillRects.
const PX = 2;
function anchored(ctx, x, y, fn) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(PX, PX);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

export function makeBuffer(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return { canvas, ctx: canvas.getContext('2d'), image: new ImageData(w, h) };
}

// What is in the hand, as a handful of pixels. `spin` turns it in flight.
//
// The rule each one follows: a dark ink outline, one body colour, one lit face and one shadow, plus a
// single identifying detail that survives being six pixels across. At this size the outline is what makes
// a thing readable against a busy photograph, and the lit face is what makes it read as solid rather than
// as a sticker. `spin` swaps the silhouette on alternate frames for the things that tumble.
const THINGS = {
  // a stone: chipped, lighter on top, and it does not tumble
  stone: (c, x, y) => {
    c.fillStyle = '#0b0018'; c.fillRect(x - 3, y - 2, 6, 5);
    c.fillStyle = '#3a3040'; c.fillRect(x - 2, y - 1, 4, 3);
    c.fillStyle = '#8b8095'; c.fillRect(x - 2, y - 2, 3, 2);
    c.fillStyle = '#e8e4f0'; c.fillRect(x - 2, y - 2, 2, 1);
  },
  // a slipper: flat, floppy, and it flips end over end
  slipper: (c, x, y, spin) => {
    if (spin) {
      c.fillStyle = '#0b0018'; c.fillRect(x - 2, y - 4, 4, 8);
      c.fillStyle = '#ff6fa8'; c.fillRect(x - 1, y - 3, 2, 6);
      c.fillStyle = '#fff'; c.fillRect(x - 1, y - 3, 2, 2);
    } else {
      c.fillStyle = '#0b0018'; c.fillRect(x - 4, y - 2, 8, 5);
      c.fillStyle = '#ff6fa8'; c.fillRect(x - 3, y - 1, 6, 3);
      c.fillStyle = '#c94a80'; c.fillRect(x - 3, y + 1, 6, 1);
      c.fillStyle = '#fff'; c.fillRect(x - 1, y - 1, 3, 2);
    }
  },
  // a bottle: neck, shoulder, body, one lit edge down the glass
  bottle: (c, x, y, spin) => {
    if (spin) {
      c.fillStyle = '#0b0018'; c.fillRect(x - 3, y - 2, 7, 4);
      c.fillStyle = '#1f7a4c'; c.fillRect(x - 2, y - 1, 5, 2);
      c.fillStyle = '#35d07f'; c.fillRect(x + 1, y - 1, 2, 2);
      c.fillStyle = '#ffd23f'; c.fillRect(x - 1, y - 3, 2, 1);
    } else {
      c.fillStyle = '#0b0018'; c.fillRect(x - 2, y - 3, 4, 6); c.fillRect(x - 1, y - 6, 2, 3);
      c.fillStyle = '#1f7a4c'; c.fillRect(x - 1, y - 2, 2, 4); c.fillRect(x - 1, y - 5, 2, 3);
      c.fillStyle = '#35d07f'; c.fillRect(x - 1, y - 2, 1, 4);
      c.fillStyle = '#ffd23f'; c.fillRect(x - 1, y - 6, 2, 1);
      c.fillStyle = '#d7ffe9'; c.fillRect(x, y - 1, 1, 2);
    }
  },
  // a ball of water: it wobbles, and the highlight moves around it
  water: (c, x, y, spin) => {
    c.fillStyle = '#0b0018'; c.fillRect(x - 3, y - 3, 7, 7);
    c.fillStyle = '#2f6fd0'; c.fillRect(x - 2, y - 2, 5, 5);
    c.fillStyle = '#3f8cf0'; c.fillRect(x - 2, y - 2, 4, 4);
    c.fillStyle = '#d7f4ff'; c.fillRect(x - 2 + (spin ? 2 : 0), y - 2 + (spin ? 1 : 0), 2, 1);
    c.fillStyle = '#1b4a94'; c.fillRect(x - 2, y + 2, 4, 1);
  },
  // a brick: heavy, chipped at one end, and it does not tumble either
  brick: (c, x, y) => {
    c.fillStyle = '#0b0018'; c.fillRect(x - 4, y - 2, 9, 5);
    c.fillStyle = '#b5482f'; c.fillRect(x - 3, y - 1, 7, 3);
    c.fillStyle = '#d4664a'; c.fillRect(x - 3, y - 1, 7, 1);
    c.fillStyle = '#7a2c1c'; c.fillRect(x + 1, y, 3, 2);
    c.fillStyle = '#3a1410'; c.fillRect(x + 3, y - 1, 1, 3);
    c.fillStyle = '#e08a70'; c.fillRect(x - 3, y - 2, 3, 1);
  },
  // a ball of paint: the colour it will leave, with one lit corner, and a drop coming off it as it turns
  paint: (c, x, y, spin, rock) => {
    const [r, g, b] = PAINTS[rock?.paint ?? 0].rgb;
    c.fillStyle = '#0b0018'; c.fillRect(x - 3, y - 3, 7, 7);
    c.fillStyle = `rgb(${r},${g},${b})`; c.fillRect(x - 2, y - 2, 5, 5);
    c.fillStyle = '#ffffff'; c.fillRect(x - 2, y - 2, 2, 1);
    c.fillStyle = `rgb(${r},${g},${b})`; c.fillRect(x + (spin ? 3 : -4), y + 3, 1, 2);
  },
};

// Whoever walks the yard: a dozen pixels, drawn the way an 8-bit console would. The shadow stays on the
// ground when the body leaves it, which is what makes a jump read as a jump on a flat picture.
//
// `squash` is the one animation principle applied here deliberately. The body is 7 px wide and 13 px
// tall, so a landing widens it by one and shortens it by one, and a take-off does the opposite. At this
// scale one pixel of deformation IS the effect; a larger factor reads as a glitch rather than as weight.
// `hideT` sinks the body down behind the rail as you duck, so that hiding is something you can SEE happen
// instead of a state the HUD merely announces.
function person(c, me, seconds, squash = 0, hideT = 0) {
  const x = Math.round(me.x), y = Math.round(me.y), by = Math.round(me.y - me.z), air = me.z > 0;
  const shade = Math.max(3, 7 - Math.round(me.z / 5));
  const sink = Math.round(hideT * 9);                            // 0 in the open, 9 px down when fully hidden
  const bw = 7 + (squash < 0 ? 1 : 0) - (squash > 0 ? 1 : 0);    // wider on landing, narrower on take-off
  const bh = 13 - (squash < 0 ? 1 : 0) + (squash > 0 ? 1 : 0);
  const top = by - bh + sink;

  c.fillStyle = 'rgba(11,0,24,.6)';
  c.fillRect(x - (shade >> 1), y, shade, 2);
  c.fillStyle = '#0b0018'; c.fillRect(x - 3, top, bw, bh);
  c.fillStyle = '#2a2233'; c.fillRect(x - 2, top + 1, bw - 2, 1);
  c.fillStyle = '#ffd9a8'; c.fillRect(x - 2, top + 2, 5, 3);
  c.fillStyle = '#0b0018'; c.fillRect(x + me.face, top + 3, 1, 1);
  c.fillStyle = '#f0286e'; c.fillRect(x - 2, top + 5, 5, 4);
  c.fillStyle = '#3fe0f0';
  const stride = air ? 1 : Math.floor(me.step) % 2;
  c.fillRect(x - 2, by - 4 + sink, 2, air ? 2 : stride ? 3 : 4);
  c.fillRect(x + 1, by - 4 + sink, 2, air ? 2 : stride ? 4 : 3);
  if (air && Math.floor(seconds * 16) % 2) { c.fillStyle = '#ffd23f'; c.fillRect(x - 3, top + 4, 1, 2); c.fillRect(x + 3, top + 4, 1, 2); }   // arms up
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

// What a looking person can SEE, drawn as the wedge their eyesight covers.
//
// This is the missing half of the danger system. The heat meter told the player how much trouble they were
// in but never WHY, so "no levels of danger" was a fair reading: there was a number and no cause. The wedge
// is the cause made visible — it comes out of the person's own eyes, it sweeps the yard, and standing in it
// is what costs you. It also gives the per-kind rates a shape the player can learn: a courier's wedge is
// short and quick, the police's is long.
//
// Drawn in a warm colour that matches the danger meter, so the two read as one system rather than two.
function cone(c, p, w, h, hidden) {
  if (p.state !== 'look') return;
  const x = Math.round(p.x), y = Math.round(p.y);
  // where their eyes are, and how far their look reaches at this kind's rate
  const ey = y - (p.kind === 'cop' ? 12 : 10);
  const reach = Math.round(46 + (p.kind === 'cop' ? 34 : p.kind === 'courier' ? 20 : 0) + p.t * 6);
  const half = 15;                                   // half-width at the far end: a wedge, not a line
  const lean = Math.sin(p.t * 2.2 + p.phase) * 4;    // it sweeps a little, so it is alive
  const warm = hidden ? CYAN : PINK;                 // cyan when covered: the same colour the heat uses
  c.save();
  c.beginPath();
  c.moveTo(x, ey);
  c.lineTo(x + lean - half, ey + reach);
  c.lineTo(x + lean + half, ey + reach);
  c.closePath();
  c.globalAlpha = hidden ? 0.10 : 0.17;
  c.fillStyle = warm;
  c.fill();
  c.globalAlpha = hidden ? 0.30 : 0.5;
  c.strokeStyle = warm;
  c.lineWidth = 1;
  c.stroke();
  c.restore();
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
// Two passers-by of the same kind used to be pixel-identical, which made a queue of walkers read as one
// walker drawn three times. The coat stays the kind's own colour — that colour is how the player tells a
// cop from a courier at a glance, and it is not negotiable — but three things vary per person: a frame of
// height, a shoulder colour taken from the dress, and whether they wear a hat. Everything is derived from
// `p.phase`, which already exists and is deterministic, so nothing has to be stored and a replay is exact.
function look(p, d) {
  const h = (p.phase || 0) * 2654435761 % 1000 / 1000;       // 0..1, stable for the life of the person
  const tall = h > 0.66 ? 1 : h < 0.33 ? -1 : 0;
  const hat = (p.phase || 0) % 1 > 0.5;
  const trim = [d.coat, d.hair, PALE, CYAN][Math.floor(h * 4) % 4];
  return { tall, hat, trim };
}
function passer(c, p, seconds, hidden) {
  const d = DRESS[p.kind], still = p.state === 'alarm' || p.state === 'look';
  const { tall, hat, trim } = look(p, d);
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
  // `tall` is the per-person height in pixels: one shorter, one taller, one the stock size. It shifts the
  // head and the coat, never the feet, so nobody floats above their own shadow.
  const bh = 13 + tall + up;
  rects(c, INK, [[x - 3, by - bh, 7, bh]]);
  if (p.kind === 'lady') rects(c, INK, [[x - 4, by - 7, 9, 5]]);
  rects(c, d.hair, [[x - 2, by - bh + 1, 5, 1]]);
  rects(c, '#ffd9a8', [[x - 2, by - bh + 2, 5, 3]]);
  if (up) rects(c, INK, [[x - 1, by - bh + 2, 1, 1], [x + 1, by - bh + 2, 1, 1]]);   // both eyes: the face is turned up at you
  else rects(c, INK, [[x + p.dir, by - bh + 3, 1, 1]]);
  // a hat, on about half of them, in a colour drawn from the dress: it breaks the silhouette of a queue
  // without ever touching the coat colour that identifies the kind
  if (hat) { rects(c, INK, [[x - 3, by - bh - 2, 7, 2]]); rects(c, trim, [[x - 2, by - bh - 1, 5, 1]]); }
  if (p.kind === 'cop') rects(c, GOLD, [[x, by - bh + 1, 1, 1]]);
  const coatY = by - (bh - 5);
  rects(c, d.coat, p.kind === 'lady' ? [[x - 2, coatY, 5, 3], [x - 3, coatY + 2, 7, 3]] : [[x - 2, coatY, 5, 4]]);
  rects(c, trim, [[x - 2, coatY, 5, 1]]);   // the trim row: one line that varies per person
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

// Hidden: the balcony's rail comes up between you and the yard, and a gap in the planks is what you look
// through. The gap opens as the duck completes, so hiding is a movement you watch rather than a state the
// HUD announces. The yard stays fully readable through the gap — you are waiting for a look to pass, not
// losing the picture — and the drop in brightness is what tells you that you are covered.
function rail(c, w, h, hideT = 1) {
  // The window you step behind. It is made of the four things a real window has — a frame, a sill, glass
  // with a highlight on it, and a PILLAR down the middle — and the pillar is the point: it is what the
  // player hides behind, so it has to be an object with a position, not a darkening of the whole screen.
  //
  // The pillar sits over the middle and the camera slides sideways as you duck (view.js cameraFor), so the
  // yard visibly moves behind the frame. That is the difference between hiding and a filter.
  const sill = h - Math.round(h * 0.19);
  const pillarW = Math.round(18 + hideT * 26);          // the pillar grows as you commit to the duck
  const px0 = Math.round((w - pillarW) / 2);
  const frame = 5;

  // glass: very dark, and it does NOT flatten the yard behind it, because you are looking through, not at
  rects(c, 'rgba(11,0,24,.30)', [[frame, frame, w - frame * 2, sill - frame]]);
  // a diagonal highlight across the glass, the way a pane catches light
  c.save();
  c.beginPath(); c.rect(frame, frame, w - frame * 2, sill - frame); c.clip();
  c.fillStyle = 'rgba(63,224,240,.11)';
  for (let i = -h; i < w; i += 34) c.fillRect(i + Math.round(hideT * 8), frame, 12, sill);
  c.restore();

  // the frame: dark ink with a lit inner edge, all four sides
  rects(c, INK, [[0, 0, w, frame], [0, sill - frame, w, frame], [0, 0, frame, sill], [w - frame, 0, frame, sill]]);
  rects(c, '#2b1050', [[frame, frame, w - frame * 2, 1], [frame, sill - frame - 1, w - frame * 2, 1]]);
  rects(c, CYAN, [[frame, frame, w - frame * 2, 1]]);

  // the pillar, in two tones so it reads as round rather than flat
  rects(c, INK, [[px0 - 1, frame, pillarW + 2, sill - frame]]);
  rects(c, '#1b0a3c', [[px0, frame, pillarW, sill - frame]]);
  rects(c, '#2b1050', [[px0 + 1, frame, 3, sill - frame]]);
  rects(c, INK, [[px0 + pillarW - 3, frame, 3, sill - frame]]);
  // the catch: one bright line, so the pillar has a light source
  rects(c, 'rgba(63,224,240,.5)', [[px0 + Math.round(pillarW / 2) - 1, frame + 3, 2, sill - frame - 8]]);

  // the sill, below the glass, catching light on its top edge
  rects(c, INK, [[0, sill, w, h - sill]]);
  rects(c, '#12052e', [[0, sill + 3, w, h - sill - 3]]);
  rects(c, 'rgba(255,255,255,.14)', [[0, sill, w, 1]]);
  for (let x = 6; x < w; x += 14) rects(c, '#1b0a3c', [[x, sill + 4, 8, h - sill - 4]]);

  write(c, 'СПРЯТАН', Math.round((w - textWidth('СПРЯТАН')) / 2), sill + 7, PALE);
}


// scanY: null once the scan is over; before that, everything below it is still the photograph.
// cam: the part of the street on screen ({ x, y, w, h }); the buffer and the canvas are that size.
export function draw(ctx, buf, world, fx, { filter, mode, seconds, scanY, motion, shake, cam, me = null, drink = null, flier = null, folk = null, hideT = 0, land = 0, weather = null, disaster = null, clean = false }) {
  // The table the picture is drawn through: the mode's look first, then the weather's. Both are whole-screen
  // moods and both are table transforms, which is the rule the NES decided for this project (D1) — a filter is
  // a different table, and so is a sky.
  // A CLEAN FRAME IS THE RENDERER ALONE: no look, no weather, no disaster grade. Everything else in the game is a
  // transform on top of the picture, and a gate cannot judge the picture through them (restriction R6).
  const pal = clean ? world.palette : disasterTable(weatherTable(lookThrough(world.palette, filter, seconds), weather), disaster ? disaster.kind : null);
  const { idx, rubble, photo, sw, paint } = world, W = world.w, H = world.h;
  const w = cam.w, h = cam.h, cx = cam.x, cy = cam.y;
  const d = buf.image.data;
  // THE BUFFER IS CLEARED BEFORE THE PICTURE IS PAINTED INTO IT. The paint loop writes the camera's window of
  // the yard; anything outside that window kept LAST FRAME'S pixels, and on the constructive route (whose yard is
  // painted from shapes, not from a photograph) that showed up as a slab of the previous picture across the top
  // of the screen - the fault the creator photographed. A frame must start empty.
  {
    const VOID = pal[pal.length - 1] || [11, 0, 24];
    for (let i = 0; i < d.length; i += 4) {
      d[i] = VOID[0]; d[i + 1] = VOID[1]; d[i + 2] = VOID[2]; d[i + 3] = 255;
    }
  }
  const focus = scanY === null ? mode.focus : null;
  const r2 = focus ? (focus.radius * Math.min(sw, H)) ** 2 : 0;
  const fxx = fx.focus.x, fyy = fx.focus.y;
  for (let vy = 0, o = 0; vy < h; vy += 1) {
    const y = vy + cy, real = scanY !== null && y > scanY;
    for (let vx = 0; vx < w; vx += 1, o += 4) {
      const x = vx + cx;
      // THE SCAN WIPE SHOWS THE YARD, DIMMED — NOT THE RAW PHOTOGRAPH. Above the scan line the game used to draw
      // the photograph at full colour, so the top of the screen was a slab of unprocessed camera image with a hard
      // seam against the built yard below: to the creator it looked like the renderer had failed. The wipe now
      // shows THE SAME YARD, darker, so the line reads as "not looked at yet" rather than as a different picture.
      if (real) {
        const s2 = y * W + Math.min(W - 1, x);
        const base = pal[rubble[s2] !== 255 ? rubble[s2] : idx[s2]] || [12, 6, 30];
        // ONE BRIGHTNESS FOR THE WHOLE FRAME. Dimming one side of the scan line made a hard seam across the
        // picture and read as a rendering fault; the line itself and the banner are what say "still searching".
        const k = 1;
        d[o] = base[0] * k; d[o + 1] = base[1] * k; d[o + 2] = base[2] * k; d[o + 3] = 255;
        continue;
      }
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
      // Thrown colour lies OVER the picture and lets it show through, so a painted car is still that car.
      // The paint keeps its own colour under every way of looking: it is the player's mark, not the yard's.
      const stain = paint[src];
      if (stain) {
        const s = PAINTS[stain - 1].rgb;
        d[o] = (c[0] + (s[0] - c[0]) * COVER) * dim; d[o + 1] = (c[1] + (s[1] - c[1]) * COVER) * dim; d[o + 2] = (c[2] + (s[2] - c[2]) * COVER) * dim; d[o + 3] = 255;
        continue;
      }
      d[o] = c[0] * dim; d[o + 1] = c[1] * dim; d[o + 2] = c[2] * dim; d[o + 3] = 255;
    }
  }
  buf.ctx.putImageData(buf.image, 0, 0);

  const ox = motion.x + shake.x, oy = motion.y + shake.y;
  // the outline colour is the palette's second-to-last entry, not a constant: a flat palette is shorter
  ctx.fillStyle = css(pal[pal.length - 2]);
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(buf.canvas, ox, oy);
  if (motion.ghost && scanY === null) {
    ctx.globalAlpha = motion.ghost.alpha;
    ctx.drawImage(buf.canvas, ox + motion.ghost.dx, oy);
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(ox - cx, oy - cy);
  // WHAT KIND ACTIONS ADDED, drawn over the picture the way the picture draws itself: one rect per pixel of the
  // flower or the box, in the palette's own colours (kind.js picks the entries). A flower sways, because a
  // still flower on a still picture reads as a sticker; the box does not, because a box does not.
  for (const q of world.parcels) {
    if (q.taken || q.x > cx + w + 8 || q.x + q.w < cx - 8) continue;
    for (const px of parcelPixels(pal, STEPS, q)) { ctx.fillStyle = css(pal[px.i]); ctx.fillRect(px.x, px.y, 1, 1); }
  }
  for (const b of world.blooms) {
    if (b.x > cx + w + 6 || b.x < cx - 6) continue;
    for (const px of bloomPixels(pal, STEPS, b, seconds)) { ctx.fillStyle = css(pal[px.i]); ctx.fillRect(px.x, px.y, 1, 1); }
  }
  // THE HIGHLIGHT STATES, ported from the v6 screen: pink for the thing being aimed at, cyan for the thing the
  // info button is describing, and the SELECTED one BLINKS - v6 alternates its edges between cyan and yellow
  // every eighth frame, and that blink is what makes a selection read as a selection rather than as a border.
  const drawEdges = (poly, colour) => {
    if (!poly || poly.length < 3) return;
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.lineWidth = PX;
    ctx.beginPath();
    for (let i = 0; i < poly.length; i += 1) {
      const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length];
      if (i === 0) ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };
  const AIM = '#f04f78', INFO = '#30e1b9', SEL = '#f9c22b';
  if (world.aim && world.aim.edges) {
    ctx.fillStyle = AIM;
    for (const p of world.aim.edges) ctx.fillRect(p % world.w, (p / world.w) | 0, 1, 1);
  } else if (world.aim && world.aim.poly) drawEdges(world.aim.poly, AIM);
  const mark = world.infoMark;
  if (mark && seconds < mark.until) {
    const blink = Math.floor(seconds * 8) % 2 === 0;
    if (mark.edges) {
      ctx.fillStyle = blink ? SEL : INFO;
      for (const p of mark.edges) ctx.fillRect(p % world.w, (p / world.w) | 0, 1, 1);
    } else drawEdges(mark.poly, blink ? SEL : INFO);
  }

  // THE THING IS OUTLINED IN ITS OWN SHAPE — v6's rule, and the whole point of the edges map.
  //
  // What stood here was a BOX: four corner brackets drawn from the region's x/y/w/h, which is what the creator
  // photographed and called bullshit - a rectangle round a car says "a car might be in here", while an outline
  // says "THIS is the car". Every visible thing now draws its own silhouette: the pixels where a neighbour is not
  // part of it (world.edgesOf), cached per region because the shape does not change while the yard stands.
  // OUTLINED KINDS, FROM docs/MECHANICS.md: BUILDINGS AND CARS, AND NOTHING ELSE. This loop used to outline every
  // visible region, so a frame with twenty targets read as twenty rings - and windows were outlined too, doubling
  // them on every facade. The creator's rule: buildings and cars get the outline; windows are destroyable but not
  // outlined; trees, ground, people and street furniture get nothing.
  // the decision lives in src/criteria/OutlineRule.js, named after the requirement

  for (const r of world.regions) {
    if (!r.seen || r.gone || r.x > cx + w || r.x + r.w < cx) continue;
    if (!mayBeOutlined(r)) continue;
    // OUTLINES ARE FOR THINGS, NOT FOR PLANES (R12). The trace of a large, noisy region is thousands of scattered
    // pixels, and drawing every one of them crosshatched whole buildings. Above a share of the frame the outline
    // is skipped; the plane is drawn by the painter instead.
    if (r.area > world.w * world.h * 0.05) continue;
    if (scanY === null && !inFocus(mode, world, r, fxx, fyy)) continue;
    world.edgesCache = world.edgesCache || new Map();
    // THE OUTLINE IS THE SILHOUETTE, NOT EVERY INTERNAL EDGE. This used `edgesOf`, which marks a pixel that
    // differs from ANY neighbour - so a region whose interior varies at all was outlined around its interior
    // specks, and the car on the creator's phone came out as a STRIPED RING. The outline is drawn from the
    // region's OWNER map instead: a pixel belongs to the outline when one of its four neighbours belongs to a
    // DIFFERENT region. That is v9's rule - "an object's edge is every pixel that touches a pixel of another
    // object" - and it cannot stripe an interior, because an interior pixel's neighbours are all its own.
    // THE OUTLINE FOLLOWS THE SHAPE, BECAUSE THE SHAPE IS VERSIONED. Caching by id alone meant a damaged thing kept
    // the outline of its original silhouette - the wreck was drawn inside an untouched contour. `world.touch()`
    // bumps the version on every damage path, so a cached outline is used only while the version still matches.
    let edges = world.edgesCache.get(r.id);
    if (edges && edges.ver !== (r.ver || 0)) edges = null;
    if (!edges) {
      const own = world.owner || null;
      const list = [];
      if (own) {
        for (const p2 of r.pixels) {
          const x = p2 % world.w, y = (p2 / world.w) | 0;
          if (x === 0 || y === 0 || x === world.w - 1 || y === world.h - 1) { list.push(p2); continue; }
          if (own[p2 - 1] !== r.id || own[p2 + 1] !== r.id || own[p2 - world.w] !== r.id || own[p2 + world.w] !== r.id) list.push(p2);
        }
      }
      edges = own ? list : edgesOf(world, r);
      world.edgesCache.set(r.id, { ver: r.ver || 0, edges });
      edges = world.edgesCache.get(r.id).edges;
    }
    const blink = (seconds * 2 + r.id * 0.37) % 1 > 0.82;      // a blink, out of step with its neighbours
    const aimed = world.aim && world.aim.id === r.id;
    const colour = aimed ? '#f04f78' : r.hits ? '#ffffff' : blink ? '#ffd23f' : '#3fe0f0';
    for (const p2 of edges) {
      const ex = p2 % world.w, ey = (p2 / world.w) | 0;
      if (ex < cx - 1 || ex > cx + w) continue;
      ctx.fillStyle = '#0b0018';
      ctx.fillRect(ex, ey + 1, 1, 1);                            // one pixel of dark under it, so it reads on anything
      ctx.fillStyle = colour;
      ctx.fillRect(ex, ey, 1, 1);
    }
    const x0 = r.x - 2, y1 = r.y + r.h + 1;
    // how much it can still take, as pips under it
    for (let n = 0; n < r.hp - r.hits; n += 1) { ctx.fillStyle = '#0b0018'; ctx.fillRect(x0 + n * 4, y1 + 2, 4, 3); ctx.fillStyle = '#f0286e'; ctx.fillRect(x0 + n * 4, y1 + 2, 3, 2); }
  }
  if (folk && scanY === null) {
    // cones first, then the people on top, so a body is never hidden inside its own sight line
    for (const p of folk.people) if (p.x > cx - 40 && p.x < cx + w + 40) anchored(ctx, p.x, p.y, () => cone(ctx, p, w, h, folk.hidden));
    for (const p of [...folk.people].sort((a, b) => a.y - b.y)) if (p.x > cx - 24 && p.x < cx + w + 24) anchored(ctx, p.x, p.y, () => passer(ctx, p, seconds, folk.hidden));
  }
  if (me?.down) anchored(ctx, me.x, me.y, () => person(ctx, me, seconds, land > 0 ? -1 : (me.z > 0 && me.vz > 60 ? 1 : 0), hideT));
  // Dust from under the feet when a jump ends: two frames of it, which is all a 192-px picture needs to
  // make a landing read as a landing rather than as a teleport.
  if (me?.down && land > 0) {
    const lx = Math.round(me.x), ly = Math.round(me.y);
    const spread = Math.round((1 - land) * 18);
    ctx.fillStyle = 'rgba(11,0,24,.45)';
    for (const dx of [-spread, -Math.round(spread / 2), Math.round(spread / 2), spread]) ctx.fillRect(lx + dx, ly - 2, 4, 4);
  }
  for (const p of fx.particles) {
    // A PIECE WITH NEITHER A COLOUR NOR A PALETTE INDEX IS NOT A REASON TO STOP THE FRAME. The particle list is
    // shared by the throwables, the decals, the weather and now the disasters; a harness caught the whole draw
    // call throwing here (`css(undefined)`), which loses the frame rather than one speck.
    ctx.fillStyle = p.rgb || (p.c != null && pal[p.c] ? css(pal[p.c]) : '#fff6c2');
    // A tumbling piece is drawn 2x1 instead of 1x1 on alternate frames. That is the whole animation, and
    // at this scale it is enough: the eye reads the alternation as rotation.
    const s = (p.s || (p.life > 2.2 ? 2 : 1)) * PX;
    if (p.spin && Math.floor(seconds * 18 + p.x) % 2) ctx.fillRect(p.x | 0, p.y | 0, s, PX);
    else ctx.fillRect(p.x | 0, p.y | 0, s, s);
  }
  for (const r of fx.rocks) {
    const t = Math.min(1, r.t / r.dur);
    const arc = Math.sin(t * Math.PI) * Math.min(24, r.dur * 90);   // a slow throw rises higher
    const x = Math.round(r.x0 + (r.tx - r.x0) * t), y = Math.round(r.y0 + (r.ty - r.y0) * t - arc);
    anchored(ctx, x, y, () => (THINGS[r.kind] || THINGS.stone)(ctx, x, y, Math.floor(seconds * 14) % 2 === 0, r));
  }
  // The ring is the "you connected" mark, and its reach is scaled by what kind of hit it was: a dent
  // barely shows, a break throws the ring out past the thing. The colour carries the same information,
  // so the two channels agree instead of fighting.
  for (const ring of fx.rings) {
    const reach = ring.r || 1;
    const rad = Math.round(2 + ring.t * 44 * reach);
    ctx.strokeStyle = reach > 1 ? '#ffd23f' : reach > 0.7 ? '#ff9ad0' : '#3fe0f0';
    ctx.lineWidth = reach > 1 ? 2 * PX : PX;
    ctx.strokeRect(Math.round(ring.x) - rad + 0.5, Math.round(ring.y) - rad + 0.5, rad * 2, rad * 2);
  }
  if (scanY !== null) {
    ctx.fillStyle = '#3fe0f0';
    ctx.fillRect(cx - 8, Math.round(scanY), w + 16, 2 * PX);
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.fillRect(cx - 8, Math.round(scanY) + 2 * PX, w + 16, PX);
  }
  ctx.restore();
  if (flier && scanY === null) {
    ctx.save();
    ctx.translate(ox, oy);
    if (flier.kind === 'plane') plane(ctx, flier, w, seconds); else ship(ctx, flier, seconds);
    ctx.restore();
  }
  if (folk?.hidden && scanY === null) rail(ctx, w, h, hideT);
  if (drink && scanY === null) anchored(ctx, w - 20, h - 20, () => bottle(ctx, w, h, drink.full, drink.busy));
  if (fx.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(fx.flash * 0.5).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
  }
  // THE DISASTER, drawn over the yard: the water line first, then the beast, in the palette's own colours.
  if (disaster) {
    const spec = DISASTERS_LOOK[disaster.kind];
    if (disaster.water > 0.01) {
      const line = Math.round(world.h * (1 - disaster.water));
      const water = pal[pal.length - 2 - 3] || pal[4];
      const foam = pal[pal.length - 2 - 1] || pal[5];
      // A FLOOD SHOWS THE STREET THROUGH THE WATER. The first version painted a flat colour over every pixel
      // below the line and the yard disappeared under an olive field - which is what the creator saw. The water
      // now MIXES with what is under it, and only the top few rows are foam.
      const mix = (a2, b2, k) => `rgb(${Math.round(a2[0] * (1 - k) + b2[0] * k)},${Math.round(a2[1] * (1 - k) + b2[1] * k)},${Math.round(a2[2] * (1 - k) + b2[2] * k)})`;
      const depth = Math.max(1, world.h - line);
      for (let y = line; y < world.h; y += 1) {
        const k = 0.30 + 0.35 * Math.min(1, (y - line) / depth);          // deeper water hides more
        for (let x = 0; x < world.w; x += 1) {
          const p = y * world.w + x;
          const under = pal[world.rubble[p] !== 255 ? world.rubble[p] : world.idx[p]] || water;
          ctx.fillStyle = (x * 7 + y * 13) % 11 === 0 && y < line + 3 ? css(foam) : mix(under, water, k);
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
    // THE EVENT SPRITE, from the v6 screen: a spiral for the hurricane, a wave for the tsunami, both with the
    // one-pixel outline that makes them belong to the picture instead of floating over it.
    if (!spec.beast) {
      const sp = eventSprite(pal, disaster.kind, 64);            // v6 draws 32 px in a 185-wide scene: same share here
      const fx2 = disaster.kind === 'hurricane'
        ? { x: world.w * Math.max(0.06, Math.min(0.94, disaster.front)), y: world.h * 0.34 }
        : { x: world.w * 0.7, y: world.h * (1 - disaster.water) - 20 };
      for (const q of sp) {
        ctx.fillStyle = q.rgb || css(pal[q.i]);
        ctx.fillRect(fx2.x + q.x, fx2.y + q.y, 1, 1);
      }
    }
    const at = beastAt(disaster, world);
    const bx = at ? beastPixels(pal, spec.beast, at.x, at.feet, at.height, at.frame, { mouth: disaster.mouth, shake: disaster.shake }) : [];
    let drew = 0, skipped = 0, badColour = 0;
    if (at) for (const px of bx) {
      if (px.x < cx - 4 || px.x > cx + w + 4) { skipped += 1; continue; }
      if (!pal[px.i]) { badColour += 1; continue; }
      ctx.fillStyle = css(pal[px.i]);
      ctx.fillRect(px.x, px.y, 1, 1);
      drew += 1;
    }
    // A ONE-LINE PROOF THAT THE BEAST REACHED THE CANVAS. It is here because this exact fault - a beast whose
    // pixels were correct and which never appeared, hidden behind an `if (at)` guard - cost two rounds. The hook
    // is read by tools/baseline-check.mjs and by the harness, and it is cheap.
    if (typeof window !== 'undefined') window.__beast = { kind: disaster.kind, n: bx.length, drew, skipped, badColour };
  }

}

// The first yard as it now stands, enlarged, with the result written under it: a picture to keep or send.
// It is the game's picture, not the photograph — 192 pixels across, so a number plate is two pixels and a
// face is four.
export function postcard(world, title, line, opts = {}) {
  const { sw, h, idx, rubble, palette, paint } = world, k = opts.scale || 3, foot = opts.foot || 148;
  const small = makeBuffer(sw, h), d = small.image.data;
  for (let y = 0, o = 0; y < h; y += 1) for (let x = 0; x < sw; x += 1, o += 4) {
    const p = y * world.w + x, c = palette[rubble[p] !== 255 ? rubble[p] : idx[p]];
    const s = paint[p] ? PAINTS[paint[p] - 1].rgb : c;   // what was painted is on the card too
    d[o] = c[0] + (s[0] - c[0]) * COVER; d[o + 1] = c[1] + (s[1] - c[1]) * COVER; d[o + 2] = c[2] + (s[2] - c[2]) * COVER; d[o + 3] = 255;
  }
  // The flowers and the boxes are on the card too: a card that showed a wrecked yard without the flowers that
  // were planted in it would be a picture of a different run. Drawn at the picture's own scale, no sway.
  const put = (px) => {
    if (px.x < 0 || px.y < 0 || px.x >= sw || px.y >= h) return;
    const o = (px.y * sw + px.x) * 4, c = palette[px.i];
    d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
  };
  for (const q of world.parcels) if (!q.taken) for (const px of parcelPixels(palette, STEPS, q)) put(px);
  for (const b of world.blooms) for (const px of bloomPixels(palette, STEPS, b, 0)) put(px);
  small.ctx.putImageData(small.image, 0, 0);
  const card = document.createElement('canvas');
  const band = opts.band !== false ? 86 : 0;                 // the tag band, at the top
  card.width = sw * k; card.height = h * k + foot + band;
  const c = card.getContext('2d');
  c.fillStyle = '#12052e'; c.fillRect(0, 0, card.width, card.height);
  c.imageSmoothingEnabled = false;

  // THE TAG. A card that goes into WhatsApp or Telegram is a claim about a place: "I AM HERE" over the yard that
  // was just wrecked. It is the largest thing on the card on purpose - bigger than the score, bigger than the
  // title - because it is the part another person reads before they read anything else.
  if (band) {
    const tag = opts.tag || 'Я ЗДЕСЬ';
    const tagEn = opts.tagEn || 'I AM HERE';
    c.fillStyle = '#f0286e'; c.fillRect(0, 0, card.width, band);
    c.fillStyle = '#12052e'; c.fillRect(0, band - 6, card.width, 6);
    c.textBaseline = 'middle';
    c.font = 'italic 900 46px "Arial Black", Impact, sans-serif';
    c.fillStyle = '#12052e'; c.fillText(tag, 17, band / 2 + 2);
    const wTag = c.measureText(tag).width;
    c.font = '900 30px "Arial Black", Impact, sans-serif';
    c.fillStyle = '#ffffff'; c.fillText(tagEn, 17 + wTag + 14, band / 2 + 2);
    c.textBaseline = 'top';
  }

  // BEFORE AND AFTER, side by side. The photograph the yard came from, small, next to what was made of it: the
  // destruction only reads as destruction when there is something to compare it with, and the comparison is the
  // whole reason to send the card.
  // THE YARD FIRST, then the photograph as an INSET on top of it. The first version drew the inset before the
  // yard and the yard covered it: a card that shows before and after has to put the small one in front.
  c.imageSmoothingEnabled = false;
  c.drawImage(small.canvas, 0, band, sw * k, h * k);
  c.font = '700 15px ui-monospace, Menlo, monospace';
  c.fillStyle = '#fff6c2'; c.fillText('СТАЛО', 10, band + h * k - 22);
  if (opts.before) {
    const bw = Math.round(card.width * 0.30), bh = Math.round((bw / sw) * h);
    const bx = 8, by = band + 8;
    c.save();
    c.imageSmoothingEnabled = true;
    c.drawImage(opts.before, bx, by, bw, bh);
    c.imageSmoothingEnabled = false;
    c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.strokeRect(bx, by, bw, bh);
    c.fillStyle = 'rgba(18,5,46,0.85)'; c.fillRect(bx, by + bh - 24, bw, 24);
    c.font = '700 15px ui-monospace, Menlo, monospace';
    c.fillStyle = '#fff6c2'; c.fillText('БЫЛО', bx + 5, by + bh - 19);
    c.restore();
  }
  const y0 = band + h * k;
  c.textBaseline = 'top';
  c.font = 'italic 900 40px "Arial Black", Impact, sans-serif';
  c.fillStyle = '#f0286e'; c.fillText(title, 19, y0 + 17);
  c.fillStyle = '#ffffff'; c.fillText(title, 16, y0 + 14);
  c.font = '700 19px ui-monospace, Menlo, Consolas, monospace';
  c.fillStyle = '#fff6c2'; c.fillText(line, 16, y0 + 68, card.width - 32);
  if (opts.footnote) {
    c.font = '700 16px ui-monospace, Menlo, Consolas, monospace';
    c.fillStyle = '#b39ddb'; c.fillText(opts.footnote, 16, y0 + 96, card.width - 32);
  }
  return card;
}
