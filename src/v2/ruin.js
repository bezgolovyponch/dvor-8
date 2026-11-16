const PIECE_HP = 3;
const CASCADE_DELAY = 7;
const GRAVITY = 0.14;
const CRACK_STEPS = 14;
const CHIPS_PER_HIT = 10;
const DUST_PUFFS = 3;
const POINTS = { pane: 15, crack: 20, piece: 120 };
const SLAB = [132, 128, 136];
const ROOM = [[52, 44, 62], [40, 34, 50]];
const CEILING = [20, 18, 28];
const DUST = [[196, 186, 170], [160, 152, 142]];
const SHARD = [[214, 240, 252], [150, 200, 230]];

export function createRuin({ W, chunks, chunkOf, crackColour }) {
  return {
    W, chunkOf, crackColour,
    pieces: chunks.map((c) => ({ ...c, hp: PIECE_HP, gone: false, fallIn: 0, panesBroken: false })),
    blocks: [], dust: [],
  };
}

export function roomColour(piece, x, y) {
  if (y === piece.y1 || y === piece.y1 - 1) return SLAB;
  if (y === piece.y0) return CEILING;
  return ROOM[(x - piece.x0) % 9 === 0 ? 1 : 0];
}

function crack(world, piece, hx, hy, rng) {
  const { W } = world;
  for (let n = 0; n < 2; n += 1) {
    let x = hx, y = hy, a = Math.PI / 2 + (rng() - 0.5) * 2.4;
    for (let s = 0; s < CRACK_STEPS; s += 1) {
      const k = Math.floor(y) * W + Math.floor(x);
      if (k < 0 || k >= world.bg.length || world.ruin.chunkOf[k] !== piece.index || world.interior[k]) break;
      world.bg[k] = world.ruin.crackColour;
      a += (rng() - 0.5) * 1.1; x += Math.cos(a); y += Math.sin(a);
    }
  }
}

function breakPanes(world, piece, rng) {
  if (piece.panesBroken) return 0;
  piece.panesBroken = true;
  let n = 0;
  for (const pane of piece.wins) {
    for (const k of pane) {
      if (world.interior[k]) continue;
      const x = k % world.W, y = (k / world.W) | 0;
      if (rng() < 0.6) world.particles.push({ kind: 'spark', x, y, vx: (rng() - 0.5) * 1.6, vy: -rng() * 1.4, c: SHARD[n % 2], ground: piece.gy, life: 40 + rng() * 30 });
      world.interior[k] = 2;
      n += 1;
    }
  }
  return n;
}

function chips(world, piece, rng) {
  for (let i = 0; i < CHIPS_PER_HIT; i += 1) {
    const k = piece.pix[Math.floor(rng() * piece.pix.length)];
    if (world.interior[k]) continue;
    world.particles.push({
      kind: 'debris', x: k % world.W, y: (k / world.W) | 0, vx: (rng() - 0.5) * 1.4, vy: -rng() * 1.2,
      c: world.palette[world.bg[k]], ground: piece.gy,
    });
  }
}

export function detach(world, piece, rng = Math.random) {
  if (piece.gone) return;
  piece.gone = true;
  const px = [];
  for (const k of piece.pix) {
    if (world.interior[k] === 1) continue;
    const x = k % world.W, y = (k / world.W) | 0;
    const c = world.interior[k] === 2 ? roomColour(piece, x, y) : world.palette[world.bg[k]];
    px.push({ x, y, c });
    world.interior[k] = 1;
    world.roomOf.set(k, piece.index);
  }
  crumbleRim(world, piece, rng);
  if (px.length) world.ruin.blocks.push({ px, dx: 0, dy: 0, vx: 0, vy: 0.4, bottom: piece.y1, ground: piece.gy, piece: piece.index });
  world.score += POINTS.piece;
}

const RIM_DEPTH = 2;
const RIM_SHARE = 0.5;

export function crumbleRim(world, piece, rng) {
  const { W } = world, chunkOf = world.ruin.chunkOf;
  for (let y = piece.y0 - RIM_DEPTH; y <= piece.y1 + RIM_DEPTH; y += 1) {
    for (let x = piece.x0 - RIM_DEPTH; x <= piece.x1 + RIM_DEPTH; x += 1) {
      if (x >= piece.x0 && x <= piece.x1 && y >= piece.y0 && y <= piece.y1) continue;
      const k = y * W + x;
      if (x < 0 || x >= W || k < 0 || k >= chunkOf.length) continue;
      const j = chunkOf[k];
      if (j < 0 || j === piece.index || world.interior[k]) continue;
      const depth = Math.max(piece.x0 - x, x - piece.x1, piece.y0 - y, y - piece.y1);
      if (rng() > RIM_SHARE / depth) continue;
      if (rng() < 0.5) world.particles.push({ kind: 'debris', x, y, vx: (rng() - 0.5), vy: -rng(), c: world.palette[world.bg[k]], ground: piece.gy });
      world.interior[k] = 1;
    }
  }
}

export function hitFacade(world, k, weapon, rng) {
  const ruin = world.ruin;
  const i = ruin.chunkOf[k];
  if (i < 0) return { points: 0 };
  const piece = ruin.pieces[i];
  if (piece.gone) return { points: 0 };
  const x = k % world.W, y = (k / world.W) | 0;
  let points = 0;
  piece.hp -= weapon.damage;
  points += breakPanes(world, piece, rng) ? POINTS.pane : 0;
  crack(world, piece, x, y, rng);
  chips(world, piece, rng);
  points += POINTS.crack;
  if (piece.hp <= 0) { detach(world, piece, rng); points += POINTS.piece; }
  if (weapon.damage > 1) {
    for (const j of piece.near) {
      const n = ruin.pieces[j];
      if (n.gone) continue;
      n.hp -= 1;
      breakPanes(world, n, rng);
      if (n.hp <= 0) detach(world, n, rng);
    }
  }
  world.score += points;
  return { points };
}

function cascade(world) {
  for (const p of world.ruin.pieces) {
    if (p.gone || !p.sup.length || p.sup.some((j) => !world.ruin.pieces[j].gone)) continue;
    if (p.fallIn === 0) p.fallIn = CASCADE_DELAY;
    else if (--p.fallIn === 0) detach(world, p, world.rng);
  }
}

function land(world, b, rng) {
  for (let i = 0; i < b.px.length; i += 1) {
    const p = b.px[i];
    if (i % 3 !== 0) continue;
    world.particles.push({
      kind: 'debris', size: rng() < 0.5 ? 2 : 1, x: p.x + b.dx, y: Math.min(p.y + b.dy, b.ground - 1), vx: (rng() - 0.5) * 2.2,
      vy: -0.6 - rng() * 1.8, c: p.c, ground: b.ground - Math.floor(rng() * 3),
    });
  }
  const minX = Math.min(...b.px.map((p) => p.x)) + b.dx, maxX = Math.max(...b.px.map((p) => p.x)) + b.dx;
  for (let i = 0; i < DUST_PUFFS; i += 1) {
    world.ruin.dust.push({ x: minX + rng() * (maxX - minX), y: b.ground - 2, r: 1.5 + rng(), grow: 0.1 + rng() * 0.08, life: 30 + rng() * 20, rise: 0.12 + rng() * 0.1 });
  }
  world.shake = Math.max(world.shake, 3);
}

export function stepRuin(world, rng) {
  const ruin = world.ruin;
  world.rng = rng;
  if (world.frame % 2 === 0) cascade(world);
  const falling = [];
  for (const b of ruin.blocks) {
    b.vy += GRAVITY; b.dy += b.vy; b.dx += b.vx;
    if (b.bottom + b.dy >= b.ground) { land(world, b, rng); continue; }
    falling.push(b);
  }
  ruin.blocks = falling;
  for (const d of ruin.dust) { d.r += d.grow; d.y -= d.rise; d.life -= 1; }
  ruin.dust = ruin.dust.filter((d) => d.life > 0);
}

export function drawRuin(world, put) {
  const { W, H } = world;
  for (const b of world.ruin.blocks) {
    for (const p of b.px) {
      const x = Math.round(p.x + b.dx), y = Math.round(p.y + b.dy);
      if (x >= 0 && y >= 0 && x < W && y < H) put(y * W + x, p.c[0], p.c[1], p.c[2]);
    }
  }
  for (const d of world.ruin.dust) {
    const r = Math.ceil(d.r), fade = d.life / 50;
    for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
      const x = Math.round(d.x + dx), y = Math.round(d.y + dy);
      if (x < 0 || y < 0 || x >= W || y >= H || dx * dx + dy * dy > d.r * d.r) continue;
      if ((x + y) & 1) continue;
      if (((x * 3 + y * 5) % 4 === 0) && fade < 0.3) continue;
      const c = DUST[(dx * dx + dy * dy) > (d.r * 0.6) ** 2 ? 1 : 0];
      put(y * W + x, c[0], c[1], c[2]);
    }
  }
}
