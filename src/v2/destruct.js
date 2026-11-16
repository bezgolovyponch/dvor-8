import { CLASS } from './classes.js';
import { EMPTY } from './carsprite.js';
import { hitFacade, stepRuin, drawRuin, roomColour } from './ruin.js';

export const WEAPONS = {
  stone: { radius: 2.6, push: 1.8, shake: 3, damage: 1 },
  brick: { radius: 3.6, push: 2.6, shake: 5, damage: 2 },
};

const GRAVITY = 0.16;
const BOUNCE = 0.3;
const SETTLE_SPEED = 1.1;
const RUBBLE_STACK = 4;
const RUBBLE_KEEP = 0.45;
const BLAST_FRAMES = 14;
const MAX_PARTICLES = 5000;
const PIXELS_PER_HIT_POINT = 70;
const MIN_HP = 3;
const MAX_HP = 6;
const EXPLODE_FLY_SHARE = 0.3;
const WRECK_BURN_FRAMES = 420;
const POINTS = { pixel: 10, glass: 5, wall: 3, wreck: 500 };
const CHAR = [[18, 16, 20], [36, 34, 40], [56, 54, 60], [82, 78, 82]];
const HULK_EDGE = -2;
const HULK_GLASS = -2;
const hulkShade = (c) => -3 - Math.min(2, Math.floor((0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 70));
const FIRE = [[255, 241, 140], [255, 178, 56], [236, 92, 40], [168, 40, 44]];
const SMOKE = [[92, 88, 96], [64, 60, 70]];
const GLASS = [[220, 244, 255], [150, 206, 236]];

export const hitPointsFor = (pixels) => Math.max(MIN_HP, Math.min(MAX_HP, Math.round(pixels / PIXELS_PER_HIT_POINT) + 2));

export function createWorld({ W, H, background, palette, darker, cls, sprites, ruin = null }) {
  for (const s of sprites) { s.hp0 = hitPointsFor(s.n0); s.hp = s.hp0; }
  return {
    W, H, bg: background, palette, darker, cls, sprites,
    rubble: new Int32Array(W * H).fill(-1), interior: new Uint8Array(W * H),
    ruin, roomOf: new Map(), particles: [], blasts: [], score: 0, shake: 0, popups: [], frame: 0, wrecked: 0,
  };
}

const pack = ([r, g, b]) => (r << 16) | (g << 8) | b;

function spawn(world, p) {
  if (world.particles.length < MAX_PARTICLES) world.particles.push(p);
}

export function spriteAt(world, x, y, reach = 2) {
  const order = world.sprites.filter((s) => s.state !== 'wreck').sort((a, b) => (b.y0 + b.h) - (a.y0 + a.h));
  for (const s of order) {
    for (let dy = -reach; dy <= reach; dy += 1) for (let dx = -reach; dx <= reach; dx += 1) {
      const lx = Math.round(x) - s.x0 + dx, ly = Math.round(y) - s.y0 + dy;
      if (lx < 0 || ly < 0 || lx >= s.w || ly >= s.h) continue;
      if (s.px[ly * s.w + lx] !== EMPTY) return s;
    }
  }
  return null;
}

export function strike(world, x, y, weapon, rng) {
  world.shake = Math.max(world.shake, weapon.shake);
  const sprite = spriteAt(world, x, y);
  if (sprite) return { target: 'car', ...hitCar(world, sprite, x - sprite.x0, y - sprite.y0, weapon, rng) };
  const i = Math.round(y) * world.W + Math.round(x);
  const c = world.cls[i];
  if (world.ruin && world.ruin.chunkOf[i] >= 0) return { target: 'building', ...hitFacade(world, i, weapon, rng) };
  if (c === CLASS.BUILDING || c === CLASS.THING) return { target: 'building', removed: crater(world, x, y, weapon, rng) };
  if (c === CLASS.SKY) return { target: 'sky', removed: 0 };
  dust(world, x, y, rng);
  return { target: 'ground', removed: 0 };
}

function groundOf(s, rng) {
  return s.y0 + s.h - 1 + Math.floor(rng() * 4);
}

export function hitCar(world, s, lx, ly, weapon, rng) {
  const r = weapon.radius;
  let removed = 0, glass = 0;
  const colourOf = (v) => world.palette[v];
  const fly = (k, speed, up) => {
    const x = k % s.w, y = (k / s.w) | 0;
    const ang = Math.atan2(y - ly, x - lx) + (rng() - 0.5) * 0.8;
    spawn(world, {
      kind: 'debris', x: s.x0 + x, y: s.y0 + y, vx: Math.cos(ang) * speed * (0.5 + rng()),
      vy: Math.sin(ang) * speed * (0.5 + rng()) - up * (0.5 + rng()), c: colourOf(s.px[k]), ground: groundOf(s, rng),
    });
    s.px[k] = EMPTY;
  };
  const shatter = [];
  for (let y = 0; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) {
    const k = y * s.w + x;
    if (s.px[k] === EMPTY) continue;
    const d = Math.hypot(x - lx, y - ly);
    if (s.glass[k] && d <= r * 3) shatter.push(k);
    else if (d <= r && rng() < 1 - d / (r + 0.6)) { fly(k, weapon.push, 1.4); removed += 1; }
    else if (d <= r * 2 && s.px[k] >= 0 && s.px[k] < world.darker.length) s.px[k] = world.darker[s.px[k]];
  }
  glass = shatterPanes(world, s, shatter, rng);
  s.n = s.px.reduce((t, v) => t + (v !== EMPTY ? 1 : 0), 0);
  s.flash = 3;
  const points = removed * POINTS.pixel + glass * POINTS.glass;
  world.score += points;
  s.hp -= weapon.damage;
  if (s.hp <= 0) { explode(world, s, rng); return { removed, glass, destroyed: true, points: points + POINTS.wreck }; }
  if (s.hp <= s.hp0 / 3) s.state = 'burning';
  else if (s.hp <= (s.hp0 * 2) / 3) s.state = 'smoking';
  return { removed, glass, destroyed: false, points };
}

function shatterPanes(world, s, seeds, rng) {
  const seen = new Uint8Array(s.w * s.h);
  const stack = [...seeds];
  let n = 0;
  seeds.forEach((k) => { seen[k] = 1; });
  while (stack.length) {
    const k = stack.pop();
    if (s.px[k] === EMPTY) continue;
    const x = k % s.w, y = (k / s.w) | 0;
    spawn(world, {
      kind: 'spark', x: s.x0 + x, y: s.y0 + y, vx: (rng() - 0.5) * 2.4, vy: -rng() * 2.2, c: GLASS[n % 2], ground: groundOf(s, rng), life: 40 + rng() * 30,
    });
    s.px[k] = EMPTY; s.glass[k] = 0; n += 1;
    for (const j of [k - 1, k + 1, k - s.w, k + s.w]) {
      if (j < 0 || j >= s.px.length || seen[j] || !s.glass[j]) continue;
      if ((j === k - 1 && x === 0) || (j === k + 1 && x === s.w - 1)) continue;
      seen[j] = 1; stack.push(j);
    }
  }
  return n;
}

export function explode(world, s, rng) {
  const cx = s.w / 2, cy = s.h * 0.6;
  for (let by = 0; by < s.h; by += 2) for (let bx = 0; bx < s.w; bx += 2) {
    const block = [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]
      .filter(([x, y]) => x < s.w && y < s.h && s.px[y * s.w + x] !== EMPTY);
    if (!block.length || rng() >= EXPLODE_FLY_SHARE) continue;
    const ang = Math.atan2(by - cy, bx - cx);
    const [x, y] = block[0];
    spawn(world, {
      kind: 'debris', size: 2, x: s.x0 + x, y: s.y0 + y, vx: Math.cos(ang) * (0.6 + rng() * 1.2),
      vy: -1.6 - rng() * 2.2, c: world.palette[s.px[y * s.w + x]] || CHAR[0], ground: groundOf(s, rng),
    });
  }
  charHulk(s, world.palette);
  s.flames = Array.from({ length: Math.max(2, Math.round(s.w / 7)) }, (_, k) => ({ x: Math.round(((k + 0.5) / Math.max(2, Math.round(s.w / 7))) * s.w), y: Math.round(s.h * 0.35) }));
  world.blasts.push({ x: s.x0 + cx, y: s.y0 + cy, r: Math.max(s.w, s.h) * 0.75, t: 0 });
  for (let i = 0; i < 24; i += 1) {
    spawn(world, {
      kind: 'fire', x: s.x0 + cx + (rng() - 0.5) * s.w * 0.6, y: s.y0 + cy, vx: (rng() - 0.5) * 1.6, vy: -0.6 - rng() * 1.8, life: 24 + rng() * 30, c: FIRE[0],
    });
  }
  s.state = 'wreck';
  s.heat = WRECK_BURN_FRAMES;
  world.shake = 9;
  world.score += POINTS.wreck;
  world.wrecked += 1;
}

function crater(world, x, y, weapon, rng) {
  const r = weapon.radius + 1;
  let removed = 0;
  for (let dy = -Math.ceil(r * 2); dy <= Math.ceil(r * 2); dy += 1) for (let dx = -Math.ceil(r * 2); dx <= Math.ceil(r * 2); dx += 1) {
    const px = Math.round(x) + dx, py = Math.round(y) + dy;
    if (px < 0 || py < 0 || px >= world.W || py >= world.H) continue;
    const i = py * world.W + px, c = world.cls[i];
    if (c !== CLASS.BUILDING && c !== CLASS.THING) continue;
    const d = Math.hypot(dx, dy);
    if (d <= r && !world.interior[i] && rng() < 1.15 - d / r) {
      spawn(world, {
        kind: 'debris', x: px, y: py, vx: (dx / (d || 1)) * weapon.push * rng(), vy: -rng() * 1.5, c: world.palette[world.bg[i]], ground: wallFoot(world, px, py),
      });
      world.interior[i] = 1;
      removed += 1;
    } else if (d <= r * 2 && !world.interior[i]) {
      world.bg[i] = world.darker[world.bg[i]] ?? world.bg[i];
    }
  }
  world.score += removed * POINTS.wall;
  for (let i = 0; i < 6; i += 1) spawn(world, { kind: 'smoke', x, y, vx: (rng() - 0.5) * 0.6, vy: -0.2 - rng() * 0.4, life: 30 + rng() * 30, c: SMOKE[1] });
  return removed;
}

function wallFoot(world, x, y) {
  let yy = y;
  while (yy < world.H - 1) {
    const c = world.cls[(yy + 1) * world.W + x];
    if (c !== CLASS.BUILDING && c !== CLASS.SKY && c !== CLASS.THING) break;
    yy += 1;
  }
  return yy;
}

function dust(world, x, y, rng) {
  const c = world.palette[world.bg[Math.round(y) * world.W + Math.round(x)]];
  for (let i = 0; i < 8; i += 1) spawn(world, { kind: 'smoke', x, y, vx: (rng() - 0.5) * 1.2, vy: -rng() * 0.6, life: 14 + rng() * 14, c });
}

function settle(world, p) {
  const x = Math.round(p.x);
  if (x < 0 || x >= world.W) return;
  const size = p.size || 1;
  for (let dx = 0; dx < size && x + dx < world.W; dx += 1) {
    let y = Math.min(world.H - 1, Math.round(p.ground));
    for (let k = 0; k < RUBBLE_STACK && y > 0 && world.rubble[y * world.W + x + dx] >= 0; k += 1) y -= 1;
    for (let dy = 0; dy < size && y - dy >= 0; dy += 1) world.rubble[(y - dy) * world.W + x + dx] = pack(p.c);
  }
}

export function step(world, rng) {
  world.frame += 1;
  world.shake *= 0.82;
  for (const s of world.sprites) {
    if (s.flash > 0) s.flash -= 1;
    const burning = s.state === 'burning' || (s.state === 'wreck' && s.heat > 0);
    if (s.state === 'wreck' && s.heat > 0) s.heat -= 1;
    if (burning) {
      const sources = s.flames || [{ x: Math.round(s.w / 2), y: Math.round(s.h * 0.35) }];
      for (const f of sources) {
        if (rng() > 0.55) continue;
        spawn(world, { kind: 'fire', size: rng() < 0.35 ? 2 : 1, x: s.x0 + f.x + (rng() - 0.5) * 3, y: s.y0 + f.y, vx: (rng() - 0.5) * 0.2, vy: -0.3 - rng() * 0.35, life: 8 + rng() * 12, c: FIRE[0] });
      }
    }
    if ((burning || s.state === 'smoking') && rng() < 0.35) {
      spawn(world, { kind: 'smoke', x: s.x0 + s.w * (0.3 + rng() * 0.4), y: s.y0 + s.h * 0.3, vx: 0.15 + (rng() - 0.5) * 0.3, vy: -0.5 - rng() * 0.4, life: 50 + rng() * 40, c: SMOKE[Math.floor(rng() * 2)] });
    }
  }
  const alive = [];
  for (const p of world.particles) {
    if (p.kind === 'debris') {
      p.vy += GRAVITY; p.x += p.vx; p.y += p.vy;
      if (p.y >= p.ground) {
        if (Math.abs(p.vy) < SETTLE_SPEED) { if (rng() < RUBBLE_KEEP) settle(world, p); continue; }
        p.y = p.ground; p.vy *= -BOUNCE; p.vx *= 0.5;
      }
      if (p.x < -4 || p.x > world.W + 4) continue;
      alive.push(p);
    } else {
      p.life -= 1;
      if (p.life <= 0) continue;
      if (p.kind === 'spark') { p.vy += GRAVITY * 0.7; if (p.y >= p.ground) { p.vy *= -0.4; p.y = p.ground; } }
      if (p.kind === 'fire') {
        p.age = (p.age || 0) + 1;
        p.c = FIRE[Math.min(FIRE.length - 1, Math.floor(p.age / 4))];
        if (p.age > 14) { p.kind = 'smoke'; p.c = SMOKE[0]; p.life = 20 + rng() * 20; p.size = 1; }
      }
      if (p.kind === 'smoke') { p.vx *= 0.98; }
      p.x += p.vx; p.y += p.vy;
      alive.push(p);
    }
  }
  world.particles = alive;
  if (world.ruin) stepRuin(world, rng);
  for (const b of world.blasts) b.t += 1;
  world.blasts = world.blasts.filter((b) => b.t < BLAST_FRAMES);
}

export function compose(world, out) {
  const { W, H, palette } = world;
  const put = (i, r, g, b) => { out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255; };
  for (let i = 0; i < W * H; i += 1) {
    const c = world.interior[i] ? roomAt(world, i) : palette[world.bg[i]];
    put(i, c[0], c[1], c[2]);
    const rb = world.rubble[i];
    if (rb >= 0) put(i, (rb >> 16) & 255, (rb >> 8) & 255, rb & 255);
  }
  const order = [...world.sprites].sort((a, b) => (a.y0 + a.h) - (b.y0 + b.h));
  for (const s of order) {
    for (let y = 0; y < s.h; y += 1) for (let x = 0; x < s.w; x += 1) {
      const v = s.px[y * s.w + x];
      if (v === EMPTY) continue;
      const i = (s.y0 + y) * W + s.x0 + x;
      if (s.flash > 0 && s.flash % 2 === 1) { put(i, 255, 255, 255); continue; }
      const c = v <= -2 ? CHAR[-v - 2] : palette[v];
      put(i, c[0], c[1], c[2]);
    }
  }
  if (world.ruin) drawRuin(world, put);
  for (const b of world.blasts) drawBlast(b, put, W, H);
  for (const p of world.particles) {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    if (p.kind === 'smoke' && (x + y + world.frame) % 2) continue;
    const size = p.size || 1;
    for (let dy = 0; dy < size && y + dy < H; dy += 1) for (let dx = 0; dx < size && x + dx < W; dx += 1) put((y + dy) * W + x + dx, p.c[0], p.c[1], p.c[2]);
  }
}

export function charHulk(s, palette) {
  const rows = [];
  for (let y = 0; y < s.h; y += 1) {
    let a = -1, b = -1;
    for (let x = 0; x < s.w; x += 1) if (s.px[y * s.w + x] !== EMPTY) { if (a < 0) a = x; b = x; }
    rows.push([a, b]);
  }
  for (let y = 0; y < s.h; y += 1) {
    const [a, b] = rows[y];
    if (a < 0) continue;
    for (let x = a; x <= b; x += 1) {
      const edge = x === a || x === b || y === 0 || rows[y - 1][0] < 0 || x < rows[y - 1][0] || x > rows[y - 1][1]
        || y === s.h - 1 || rows[y + 1][0] < 0 || x < rows[y + 1][0] || x > rows[y + 1][1];
      const k = y * s.w + x, v = s.px[k];
      s.px[k] = edge ? HULK_EDGE : s.glass[k] ? HULK_GLASS : v >= 0 && palette[v] ? hulkShade(palette[v]) : -3;
      s.glass[y * s.w + x] = 0;
    }
  }
}

function drawBlast(b, put, W, H) {
  const k = b.t / BLAST_FRAMES;
  const r = b.r * (0.35 + 0.65 * Math.sin(Math.min(1, k * 1.6) * Math.PI / 2));
  const hollow = k > 0.55 ? r * (k - 0.55) * 2 : 0;
  for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
    const d = Math.hypot(dx, dy);
    if (d > r || d < hollow) continue;
    const x = Math.round(b.x + dx), y = Math.round(b.y + dy);
    if (x < 0 || y < 0 || x >= W || y >= H) continue;
    const ring = d / r;
    const c = k < 0.15 ? [255, 255, 236] : FIRE[Math.min(FIRE.length - 1, Math.floor(ring * 2 + k * 2.2))];
    put(y * W + x, c[0], c[1], c[2]);
  }
}

const INTERIOR = [[28, 24, 36], [40, 34, 48]];
const interiorShade = (i, W) => INTERIOR[(((i / W) | 0) >> 1) % 2];

function roomAt(world, i) {
  const piece = world.ruin && world.ruin.chunkOf[i] >= 0 ? world.ruin.pieces[world.ruin.chunkOf[i]] : null;
  return piece ? roomColour(piece, i % world.W, (i / world.W) | 0) : interiorShade(i, world.W);
}
