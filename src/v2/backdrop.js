export function backdrop({ W, H, isBuilding, isGround, ground, sky, horizon }) {
  const out = new Uint16Array(W * H);
  for (let y = 0; y < H; y += 1) {
    const row = [];
    for (let x = 0; x < W; x += 1) if (isGround(y * W + x)) row.push(x);
    for (let x = 0; x < W; x += 1) {
      const k = y * W + x;
      if (!isBuilding(k)) { out[k] = ground[k]; continue; }
      if (y < horizon || !row.length) { out[k] = sky[k]; continue; }
      let best = row[0];
      for (const gx of row) if (Math.abs(gx - x) < Math.abs(best - x)) best = gx;
      out[k] = ground[y * W + best];
    }
  }
  return out;
}

export function skeleton(piece, x, y) {
  if (y >= piece.y1 - 1) return y === piece.y1 - 1 ? 0 : 2;
  if (x === piece.x0) return 1;
  return -1;
}
