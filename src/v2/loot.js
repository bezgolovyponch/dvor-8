import { COLOURS } from './theme.js';

const GRAVITY = 0.18;
const BOUNCE = 0.45;
const LIFE = 360;
const BLINK_FROM = 90;
const PICK_REACH = 9;
export const LOOT = {
  coin: { value: 25, throws: 0, shades: COLOURS.coin },
  gem: { value: 50, throws: 1, shades: COLOURS.gem },
};

export function dropLoot(world, { x, y, ground, coins = 0, gems = 0 }, rng) {
  const out = world.loot || (world.loot = []);
  const add = (kind) => out.push({ kind, x, y, vx: (rng() - 0.5) * 2.4, vy: -1.6 - rng() * 2, ground: ground - Math.floor(rng() * 10), life: LIFE, rest: false });
  for (let i = 0; i < coins; i += 1) add('coin');
  for (let i = 0; i < gems; i += 1) add('gem');
}

export function stepLoot(world) {
  for (const p of world.loot || []) {
    p.life -= 1;
    if (p.rest) continue;
    p.vy += GRAVITY; p.x += p.vx; p.y += p.vy;
    if (p.x < 1 || p.x > world.W - 3) { p.vx = -p.vx; p.x = Math.max(1, Math.min(world.W - 3, p.x)); }
    if (p.y >= p.ground) {
      p.y = p.ground;
      if (Math.abs(p.vy) < 0.8) { p.rest = true; continue; }
      p.vy *= -BOUNCE; p.vx *= 0.6;
    }
  }
  if (world.loot) world.loot = world.loot.filter((p) => p.life > 0);
}

export function collectAt(world, x, y) {
  const got = { value: 0, throws: 0, n: 0 };
  world.loot = (world.loot || []).filter((p) => {
    if (Math.hypot(p.x + 1 - x, p.y + 1 - y) > PICK_REACH) return true;
    got.value += LOOT[p.kind].value; got.throws += LOOT[p.kind].throws; got.n += 1;
    return false;
  });
  return got;
}

export function drawLoot(world, put) {
  const { W, H } = world;
  for (const p of world.loot || []) {
    if (p.life < BLINK_FROM && (p.life >> 3) % 2) continue;
    const s = LOOT[p.kind].shades, x0 = Math.round(p.x), y0 = Math.round(p.y);
    const shine = (world.frame >> 3) % 4 === 0;
    const cells = p.kind === 'coin'
      ? [[1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 1, 2], [2, 1, 1], [3, 1, 0], [0, 2, 0], [1, 2, 1], [2, 2, 1], [3, 2, 0], [1, 3, 0], [2, 3, 0]]
      : [[1, 0, 2], [2, 0, 1], [0, 1, 1], [1, 1, shine ? 2 : 1], [2, 1, 1], [3, 1, 0], [1, 2, 0], [2, 2, 0], [1, 3, 0], [2, 3, 0]].map(([x, y, c]) => [x, y, y === 3 && x === 2 ? 0 : c]);
    for (const [dx, dy, c] of cells) {
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const col = s[c];
      put(y * W + x, col[0], col[1], col[2]);
    }
  }
}
