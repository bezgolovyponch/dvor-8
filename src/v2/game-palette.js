import { deltaE00, srgbToLab } from './ciede2000.js';

const hexToRgb = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));

export function buildPalette(layout, sources) {
  const pool = [];
  const seen = new Set();
  for (const s of sources) for (const c of s.colours) {
    const hex = `#${c.toLowerCase()}`;
    if (seen.has(hex)) continue;
    seen.add(hex);
    pool.push({ hex, lab: srgbToLab(...hexToRgb(hex)), from: s.name });
  }
  const used = new Set();
  const hex = [], from = [];
  for (const target of layout) {
    const t = srgbToLab(...hexToRgb(target));
    let best = null, bd = Infinity;
    for (const p of pool) {
      if (used.has(p.hex)) continue;
      const d = deltaE00(t, p.lab);
      if (d < bd) { bd = d; best = p; }
    }
    used.add(best.hex);
    hex.push(best.hex); from.push(best.from);
  }
  return { hex, from };
}
