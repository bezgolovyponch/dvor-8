// How the picture sits on the screen, and the way back from a finger to a pixel.
//
// The frame tilts from side to side the whole time, the way the game this look is borrowed from does
// (docs/style.md, F9), and each filter moves it differently. Because the picture moves, a tap has to be
// carried back through exactly the same tilt and shift it was drawn with — otherwise the player hits where
// the thing would have been if the screen were still.

const DEG = Math.PI / 180;

export const LONG = 256, SHORT = 192;   // the picture in pixels: the size of an 8-bit console's screen
export const SCAN_TIME = 1.4;           // seconds; the opening must not outstay its welcome

//   angle   the tilt of the whole frame, radians      x, y   a shift of the picture inside it, pixels
//   ghost   a second, faint, offset copy (double vision), or null
export function viewMotion(filterId, t = 0, calm = false) {
  if (calm || filterId === 'depression') return { angle: 0, x: 0, y: 0, ghost: null };
  if (filterId === 'alcohol') {
    return {
      angle: (3 * Math.sin(t * 0.9) + Math.sin(t * 2.3)) * DEG,
      x: Math.round(2.6 * Math.sin(t * 0.9) + 1.4 * Math.sin(t * 2.3)),
      y: Math.round(1.2 * Math.sin(t * 1.4)),
      ghost: { dx: Math.round(4 + 2 * Math.sin(t * 0.7)), alpha: 0.3 },
    };
  }
  if (filterId === 'weed') return { angle: 1.8 * Math.sin(t * 0.45) * DEG, x: 0, y: Math.round(Math.sin(t * 0.5)), ghost: null };
  return { angle: 1.1 * Math.sin(t * 0.8) * DEG, x: 0, y: 0, ghost: null };
}

// rect is the frame's box on the page BEFORE the tilt; the tilt turns it about its centre.
export function clientToWorld(px, py, rect, angle, shift, w, h) {
  const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  const c = Math.cos(-angle), s = Math.sin(-angle);
  const dx = px - cx, dy = py - cy;
  const ux = dx * c - dy * s + rect.width / 2, uy = dx * s + dy * c + rect.height / 2;
  return { x: (ux / rect.width) * w - shift.x, y: (uy / rect.height) * h - shift.y };
}

export function worldToClient(x, y, rect, angle, shift, w, h) {
  const ux = ((x + shift.x) / w) * rect.width - rect.width / 2, uy = ((y + shift.y) / h) * rect.height - rect.height / 2;
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: ux * c - uy * s + rect.left + rect.width / 2, y: ux * s + uy * c + rect.top + rect.height / 2 };
}
