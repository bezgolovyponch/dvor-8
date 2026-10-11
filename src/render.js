// Drawing the yard, with the parallax and the atmospheric gradient the standard requires.
//
// Five layers, each scrolling at its own fraction of the camera. The numbers come from the standard and are
// read from state.js rather than retyped here, so a layer cannot scroll at one speed on screen and another
// in a test.
//
// The scan is a state, not a transition: an object is either still real or already replaced by its 8-bit
// copy, and the renderer draws whichever is true. There is no animation to get out of step with the data.

import { LAYERS, layerById, KINDS } from './state.js';
import { forLayer, shade, INK, SKY } from './palette.js';
import { drawReal, drawPixel, drawRock } from './sprites.js';

export const VIEW_W = 320;   // the 8-bit canvas, then scaled up by CSS. One unit here is one on-screen pixel
export const VIEW_H = 180;

// The camera. Clamped to the world so the player cannot scroll past the edges into nothing.
export function makeCamera(worldW) {
  return { x: 0, worldW, speed: 2.2 };
}
export function stepCamera(cam, input, dt) {
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  cam.x = Math.max(0, Math.min(cam.worldW - VIEW_W, cam.x + dir * cam.speed * dt));
}

export function render(ctx, world, cam, effect) {
  const t = world.time;
  // The sky, in its own band. It is the least saturated thing on screen, by the standard.
  ctx.fillStyle = forLayer(SKY[t] || SKY.day, 'sky');
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // A sun or a moon, one block, so the time of day is readable without a clock.
  ctx.fillStyle = forLayer(t === 'night' ? '#e8e8f0' : '#f0d060', 'far');
  ctx.fillRect(t === 'night' ? 250 : 60, 24, 10, 10);

  // One pass per layer, in the standard's order, each at its own parallax fraction.
  for (const layer of LAYERS) {
    const offset = Math.round(cam.x * layer.speed);
    for (const obj of world.objects) {
      if (obj.layer !== layer.id || obj.gone) continue;
      const sx = obj.x - offset;
      if (sx + obj.w < -8 || sx > VIEW_W + 8) continue;   // off screen: not drawn
      const sy = obj.y;
      // The scan decides which drawing. An object the scan has not reached is still the real thing.
      if (obj.scanned) drawPixel(ctx, obj, sx, sy, layer.id);
      else drawReal(ctx, obj, sx, sy);
    }
  }

  // The rocks in flight, and the throwing hand, on top of everything.
  for (const r of effect.rocks) drawRock(ctx, r.x, r.y, 3);

  // A scan line, while a scan is running: a moving band, drawn over the yard.
  if (effect.scanY !== null) {
    ctx.fillStyle = 'rgba(120, 240, 255, 0.20)';
    ctx.fillRect(0, effect.scanY, VIEW_W, 3);
    ctx.fillStyle = 'rgba(120, 240, 255, 0.45)';
    ctx.fillRect(0, effect.scanY, VIEW_W, 1);
  }

  // The balcony rail: the player's own vantage point, in the foreground layer, scrolling FASTER than the
  // camera. The standard is explicit that this is what creates the "I am passing this" feeling.
  ctx.fillStyle = forLayer('#4a3a2a', 'near');
  const railY = VIEW_H - 14;
  ctx.fillRect(-Math.round(cam.x * 1.25) % 40, railY, VIEW_W + 40, 14);
  ctx.fillStyle = INK;
  ctx.fillRect(0, railY, VIEW_W, 1);
}
