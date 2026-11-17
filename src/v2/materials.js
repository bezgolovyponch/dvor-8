export const FOLIAGE_HUE_MIN = Math.PI / 2;
export const FOLIAGE_HUE_MAX = Math.PI;
export const FOLIAGE_CHROMA_MIN = 4;

export function isFoliageHue(lab) {
  const [, a, b] = lab;
  const hue = Math.atan2(b, a);
  const chroma = Math.hypot(a, b);
  return hue >= FOLIAGE_HUE_MIN && hue <= FOLIAGE_HUE_MAX && chroma >= FOLIAGE_CHROMA_MIN;
}

export function greenShade(L, rampLs) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < 6; i += 1) {
    const d = Math.abs(rampLs[i] - L);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

export function applyMaterials({ base, ID, sky, seg, R, G, B, q, lab, rampLs, W, H }) {
  const N = W * H;
  const changed = new Uint8Array(N);
  for (let k = 0; k < N; k += 1) {
    if (ID[k] !== 0) continue;
    const s = seg[k];
    if ((s === 2 || s === 3 || s === 4 || s === 1 || s === 5) && sky[k] === 1) {
      sky[k] = 0;
      base[k] = q[k];
      changed[k] = 1;
    }
  }
  for (let k = 0; k < N; k += 1) {
    if (ID[k] !== 0) continue;
    const s = seg[k];
    if ((s === 2 || s === 3) && isFoliageHue(lab(R[k], G[k], B[k]))) {
      base[k] = 6 + greenShade(lab(R[k], G[k], B[k])[0], rampLs);
      changed[k] = 1;
    }
  }
  let count = 0;
  for (let k = 0; k < N; k += 1) if (changed[k]) count += 1;
  return count;
}