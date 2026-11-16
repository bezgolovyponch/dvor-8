const MUTE_CHROMA = 0.5;
const MUTE_LIGHT = 0.88;

export function muteTable(rgb, toLab) {
  const lab = rgb.map((c) => toLab(c[0], c[1], c[2]));
  return lab.map(([L, a, b], i) => {
    const t = [L * MUTE_LIGHT, a * MUTE_CHROMA, b * MUTE_CHROMA];
    let best = i, bd = Infinity;
    lab.forEach((p, j) => {
      const d = (p[0] - t[0]) ** 2 + (p[1] - t[1]) ** 2 + (p[2] - t[2]) ** 2;
      if (d < bd) { bd = d; best = j; }
    });
    return best;
  });
}

export function calm(labels, inside, W, H, radius, passes) {
  let cur = labels;
  const votes = new Map();
  for (let p = 0; p < passes; p += 1) {
    const next = cur.slice();
    for (let k = 0; k < W * H; k += 1) {
      if (!inside(k)) continue;
      const x = k % W, y = (k / W) | 0;
      votes.clear();
      for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const n = yy * W + xx;
        if (inside(n)) votes.set(cur[n], (votes.get(cur[n]) || 0) + 1);
      }
      let best = cur[k], bv = votes.get(cur[k]) || 0;
      for (const [v, c] of votes) if (c > bv) { bv = c; best = v; }
      next[k] = best;
    }
    cur = next;
  }
  return cur;
}

export function lighter(i) {
  return i < 48 && i % 6 < 5 ? i + 1 : i;
}

export function simplifyCar({ px, glass, w, h, darker, outline }) {
  const count = new Map();
  for (let k = 0; k < px.length; k += 1) if (px[k] >= 0 && px[k] < 48 && !glass[k]) count.set(px[k], (count.get(px[k]) || 0) + 1);
  if (!count.size) return;
  const body = [...count].sort((a, b) => b[1] - a[1])[0][0];
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && px[y * w + x] >= 0;
  const out = px.slice();
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    const k = y * w + x;
    if (px[k] < 0) continue;
    if (!filled(x - 1, y) || !filled(x + 1, y) || !filled(x, y - 1) || !filled(x, y + 1)) out[k] = outline;
    else if (glass[k]) out[k] = glass[k - w] ? 1 : 3;
    else if (!filled(x, y - 2)) out[k] = lighter(body);
    else if (!filled(x, y + 3)) out[k] = darker[body];
    else out[k] = body;
  }
  px.set(out);
}
