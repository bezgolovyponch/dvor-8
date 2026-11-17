export function outlineOf(inside, W, H, k) {
  const x = k % W, y = (k / W) | 0;
  return x === 0 || y === 0 || x === W - 1 || y === H - 1 || !inside(k - 1) || !inside(k + 1) || !inside(k - W) || !inside(k + W);
}

export function outlinePixels(inside, W, H, cells) {
  return cells.filter((k) => outlineOf(inside, W, H, k));
}
