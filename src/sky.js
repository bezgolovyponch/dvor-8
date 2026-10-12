// What flies over the yard carrying a line of news. Pure: no canvas, no network.
//
// One thing is in the air at a time, and the two kinds take turns because they are read differently:
//   the PLANE   crosses once, right to left, towing the line behind it on a banner. Quick, and gone.
//   the SHIP    drifts in, stops over the yard, and runs the line through a board on its side — a running
//               string in the plain sense — then drifts off.
// Both can be hit with whatever is in the hand. A hit is not a kill: the plane drops its banner and
// runs, the ship's board goes dark and it climbs away, and the NEXT line comes sooner. So a throw at the
// sky turns the page. Nothing is lost by leaving them alone and nothing is lost by missing.
//
// Positions are in pixels of the VIEW (what is on screen), not of the street: the sky does not scroll
// with the ground, so whoever walks never walks out from under the news.

import { textWidth, ADVANCE } from './font.js';

export const PLANE_SPEED = 38;   // pixels a second: about six letters, slow enough to read between throws
export const SHIP_SPEED = 26;
export const BOARD_SPEED = 30;   // the line through the ship's board
export const GAP = 5;            // seconds of empty sky between two fliers
export const GAP_HIT = 1.5;      // and after one was hit
export const FIRST = 2.5;        // before the first: the yard is looked at first
export const SKY_POINTS = 25;
export const PLANE = { w: 16, h: 9, rope: 7, y: 12 };
export const BANNER_H = 11;
export const SHIP = { w: 74, h: 25, y: 7, board: { x: 6, y: 6, w: 62, h: 9 } };
export const SHADOW = 34;        // how far under a flier its shadow lies on the ground

export function makeSky(lines = []) {
  return { lines, at: 0, turn: 0, flier: null, wait: FIRST };
}

// Clear the air (a new run, the news turned off or on). The place in the lines is kept: the next run
// goes on with the next line, not the first again.
export function clearSky(sky, lines) {
  sky.lines = lines; sky.flier = null; sky.wait = FIRST;
}

function launch(sky, w) {
  const text = sky.lines[sky.at % sky.lines.length], kind = sky.turn % 2 ? 'ship' : 'plane';
  sky.at += 1; sky.turn += 1;
  // a banner is the line with a letter's width of cloth at each end
  return kind === 'plane'
    ? { kind, text, len: (text.length + 2) * ADVANCE, x: w + 2, y: PLANE.y, t: 0, hit: false, bx: 0, drop: 0 }
    : { kind, text, len: textWidth(text), x: -SHIP.w - 2, y: SHIP.y, t: 0, hit: false, scroll: 0 };
}

// One step of time over a view `w` pixels wide. Returns the flier if one took off in this step.
export function stepSky(sky, dt, w) {
  const f = sky.flier;
  if (!f) {
    if (!sky.lines.length || (sky.wait -= dt) > 0) return null;
    sky.flier = launch(sky, w);
    return sky.flier;
  }
  f.t += dt;
  let gone = false;
  if (f.kind === 'plane') {
    f.x -= PLANE_SPEED * (f.hit ? 3 : 1) * dt;
    if (f.hit) { f.drop += dt; gone = f.drop > 2.6; } else gone = f.x + PLANE.w + PLANE.rope + f.len < 0;
  } else if (f.hit) {
    f.y -= 34 * dt; gone = f.y < -SHIP.h - 6;
  } else if (f.scroll < f.len + SHIP.board.w) {
    const hold = (w - SHIP.w) / 2, step = SHIP_SPEED * dt;
    f.x += Math.max(-step, Math.min(step, hold - f.x));
    if (f.x > -SHIP.board.x) f.scroll += BOARD_SPEED * dt;   // the board is in sight: the line starts to run
  } else {
    f.x += SHIP_SPEED * dt; gone = f.x > w + 2;
  }
  if (gone) { sky.flier = null; sky.wait = f.hit ? GAP_HIT : GAP; }
  return null;
}

// Where a flier is: its body, and the sign that carries the line. A plane bobs; a banner that has been
// cut loose stays where it was cut and falls.
export function boxes(f) {
  const bob = Math.round(2 * Math.sin(f.t * 2.2)), x = Math.round(f.x), y = Math.round(f.y) + (f.kind === 'plane' ? bob : Math.round(bob / 2));
  if (f.kind === 'ship') return { body: { x, y, w: SHIP.w, h: SHIP.h }, sign: { x: x + SHIP.board.x, y: y + SHIP.board.y, w: SHIP.board.w, h: SHIP.board.h } };
  const sx = f.hit ? Math.round(f.bx) : x + PLANE.w + PLANE.rope, fall = f.hit ? Math.round(42 * f.drop * f.drop) : 0;
  return { body: { x, y, w: PLANE.w, h: PLANE.h }, sign: { x: sx, y: y - 1 + fall, w: f.len, h: BANNER_H } };
}

const inside = (b, x, y, pad) => x >= b.x - pad && x < b.x + b.w + pad && y >= b.y - pad && y < b.y + b.h + pad;

// The flier at this point of the view, if it can still be hit there.
export function hitAt(sky, x, y, pad = 4) {
  const f = sky.flier;
  if (!f || f.hit) return null;
  const b = boxes(f);
  return inside(b.body, x, y, pad) || inside(b.sign, x, y, pad) ? f : null;
}

// It was hit. Returns the points, once.
export function knock(sky) {
  const f = sky.flier;
  if (!f || f.hit) return 0;
  f.bx = f.x + PLANE.w + PLANE.rope;
  f.hit = true;
  return SKY_POINTS;
}
