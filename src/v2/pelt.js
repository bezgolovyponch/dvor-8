const GRAM_CLIP = [1e-2, 1e2];
export const PELT_JUMP = 5;

export function rbfGram(signal) {
  const n = signal.length, d = new Float64Array(n * n), off = [];
  for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) {
    let s = 0;
    for (let c = 0; c < signal[i].length; c += 1) s += (signal[i][c] - signal[j][c]) ** 2;
    d[i * n + j] = s; off.push(s);
  }
  off.sort((a, b) => a - b);
  const m = off.length ? (off.length % 2 ? off[off.length >> 1] : (off[off.length / 2 - 1] + off[off.length / 2]) / 2) : 0;
  const gamma = m ? 1 / m : 1;
  const K = new Float64Array(n * n);
  for (let i = 0; i < n; i += 1) {
    K[i * n + i] = 1;
    for (let j = i + 1; j < n; j += 1) {
      const v = Math.exp(-Math.min(GRAM_CLIP[1], Math.max(GRAM_CLIP[0], d[i * n + j] * gamma)));
      K[i * n + j] = v; K[j * n + i] = v;
    }
  }
  return K;
}

export function pelt(signal, minSize, pen, jump = PELT_JUMP) {
  const n = signal.length, K = rbfGram(signal);
  const P = new Float64Array((n + 1) * (n + 1));
  for (let i = 0; i < n; i += 1) for (let j = 0; j < n; j += 1) P[(i + 1) * (n + 1) + j + 1] = K[i * n + j] + P[i * (n + 1) + j + 1] + P[(i + 1) * (n + 1) + j] - P[i * (n + 1) + j];
  const block = (a, b) => P[b * (n + 1) + b] - P[a * (n + 1) + b] - P[b * (n + 1) + a] + P[a * (n + 1) + a];
  const error = (a, b) => (b - a) - block(a, b) / (b - a);
  const best = new Map([[0, { cost: 0, cuts: [] }]]);
  let admissible = [];
  const ind = [];
  for (let k = 0; k < n; k += jump) if (k >= minSize) ind.push(k);
  ind.push(n);
  for (const bkp of ind) {
    admissible.push(Math.floor((bkp - minSize) / jump) * jump);
    const subs = [];
    for (const t of admissible) {
      const left = best.get(t);
      if (!left) continue;
      subs.push({ t, cost: left.cost + error(t, bkp) + pen, cuts: [...left.cuts, bkp] });
    }
    const min = subs.reduce((a, s) => (s.cost < a.cost ? s : a));
    best.set(bkp, min);
    admissible = subs.filter((s) => s.cost <= min.cost + pen).map((s) => s.t);
  }
  return best.get(n).cuts;
}
