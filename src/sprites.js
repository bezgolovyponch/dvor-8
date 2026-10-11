// Objects, drawn twice: once as the real thing and once as its 8-bit copy.
//
// The two drawings exist because the game's opening move is the scan. The player sees the yard as it is,
// scans it, and everything the scan recognises is REPLACED by its 8-bit copy. So every kind has a realistic
// form and a pixel form, and the pixel form is not a filter over the real one: it is a separate drawing at
// the era's scale, which is what makes the swap visible as a change rather than a blur.
//
// The drawing rule is the standard's first: SILHOUETTE FIRST. Each pixel form is built as a black shape
// first and coloured after, so each KINDS entry states its silhouette class in data and the tests check it.

import { KINDS } from './state.js';
import { forLayer, shade, INK } from './palette.js';

// Realistic form: soft gradients, no outline, drawn with the canvas primitives.
export function drawReal(ctx, obj, x, y) {
  const k = KINDS[obj.kind];
  const base = { bench: '#7a5a3a', bin: '#4a5a4a', crate: '#8a6a3a', bush: '#3a6a3a', puddle: '#6a8a9a',
    pram: '#5a4a6a', scooter: '#4a4a5a', sign: '#6a6a6a', window: '#2a3a4a', roof: '#6a4a3a', tree: '#4a6a3a', pipe: '#5a5a5a' }[obj.kind] || '#555';
  const g = ctx.createLinearGradient(x, y, x, y + k.h);
  g.addColorStop(0, base);
  g.addColorStop(1, shade(base, -0.18));
  ctx.fillStyle = g;
  ctx.beginPath();
  if (obj.kind === 'bush' || obj.kind === 'tree') {
    ctx.ellipse(x + k.w / 2, y + k.h / 2, k.w / 2, k.h / 2, 0, 0, Math.PI * 2);
  } else if (obj.kind === 'puddle') {
    ctx.ellipse(x + k.w / 2, y + k.h / 2, k.w / 2, k.h / 2, 0, 0, Math.PI * 2);
  } else {
    ctx.roundRect(x, y, k.w, k.h, 2);
  }
  ctx.fill();
  // A little real-world detail, so the two states are clearly different pictures.
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 2, y + 2, k.w - 4, 1);
  ctx.globalAlpha = 1;
}

// The 8-bit copy. Built on a grid of 2-unit pixels, outlined in INK, coloured through the layer's own
// saturation band so it cannot escape the atmospheric gradient.
export function drawPixel(ctx, obj, x, y, layer) {
  const k = KINDS[obj.kind];
  const px = 2;                                     // the pixel size, so every edge lands on the grid
  const base = { bench: '#a8783a', bin: '#5a7a5a', crate: '#b08a3a', bush: '#3a8a3a', puddle: '#7aaaca',
    pram: '#7a5a9a', scooter: '#5a5a7a', sign: '#8a8a8a', window: '#3a5a7a', roof: '#8a5a3a', tree: '#4a8a3a', pipe: '#7a7a7a' }[obj.kind] || '#888';
  const fill = forLayer(base, layer);
  const dark = shade(fill, -0.14);
  const step = (cx, cy, cw, ch) => ctx.fillRect(x + cx * px, y + cy * px, cw * px, ch * px);

  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.fillRect(x, y, k.w, k.h);
  ctx.strokeRect(x + 0.5, y + 0.5, k.w - 1, k.h - 1);

  // The silhouette detail, per kind. Each is a few blocks: the era had no room for more.
  ctx.fillStyle = dark;
  switch (obj.kind) {
    case 'bench':
      step(1, 3, 20, 1); step(1, 5, 20, 1); step(1, 7, 1, 1); step(20, 7, 1, 1);
      break;
    case 'bin':
      step(1, 1, 9, 1); step(2, 4, 7, 1); step(2, 9, 7, 1);
      break;
    case 'crate':
      step(1, 1, 8, 1); step(1, 1, 1, 8); step(8, 1, 1, 8); step(1, 8, 8, 1); step(4, 4, 2, 2);
      break;
    case 'bush':
      step(2, 2, 4, 2); step(9, 1, 3, 2); step(5, 6, 6, 2);
      break;
    case 'puddle':
      step(2, 1, 8, 1); step(14, 2, 5, 1);
      break;
    case 'pram':
      step(2, 2, 9, 6); step(1, 10, 3, 3); step(9, 10, 3, 3);
      break;
    case 'scooter':
      step(5, 1, 2, 9); step(1, 1, 5, 1); step(3, 10, 6, 2);
      break;
    case 'sign':
      step(1, 1, 7, 6); step(3, 7, 2, 10);
      break;
    case 'window':
      step(2, 2, 4, 6);
      break;
    case 'roof':
      step(0, 6, 30, 1); step(4, 3, 22, 1);
      break;
    case 'tree':
      step(4, 12, 3, 16); step(1, 3, 12, 8); step(4, 1, 6, 2);
      break;
    case 'pipe':
      step(1, 1, 3, 8); step(1, 8, 5, 2); step(1, 10, 2, 10);
      break;
    default:
      break;
  }

  // Damage: each hit takes a bite out of the shape, so the state is visible rather than counted.
  if (obj.hits > 0) {
    ctx.fillStyle = INK;
    for (let i = 0; i < obj.hits; i += 1) {
      ctx.fillRect(x + 3 + i * 5, y + 3 + (i % 3) * 4, 3, 3);
    }
  }
}

// The rock the player throws. Small, drawn as 3 blocks.
export function drawRock(ctx, x, y, r = 3) {
  ctx.fillStyle = '#9a9a9a';
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y - 1);
  ctx.lineTo(x + Math.round(r / 2), y + r);
  ctx.lineTo(x - r, y + r - 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
