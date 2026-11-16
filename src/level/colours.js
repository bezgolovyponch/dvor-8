import { deltaE00, srgbToLab } from '../v2/ciede2000.js';

export const RAMP = 6;
export const RAMPS = { blue: 0, green: 1, brown: 2, warm: 3, cool: 4, red: 5, pink: 6, gold: 7 };
export const OUTLINE = 48;
export const MIN_CONTRAST = 3;
export const MIN_HUE_GAP = 20;
export const SHADES = [1, 3, 4];
export const PREFERRED_SHADES = [3, 2, 4, 1];

export const ROLE_RAMPS = {
  sky: ['blue'],
  road: ['cool'],
  walk: ['warm'],
  plant: ['green'],
  trunk: ['brown'],
  glass: ['blue'],
  building: ['warm', 'brown', 'red', 'cool', 'gold'],
  car: ['red', 'gold', 'green', 'pink', 'blue', 'cool'],
};

const hexRgb = (h) => [1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16));

export function luminance([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export const slot = (ramp, shade) => RAMPS[ramp] * RAMP + shade;

export function shadesOf(ramp, shades = SHADES) {
  return shades.map((s) => slot(ramp, s));
}

export function assignRamps(objects, palette, backdrop) {
  const rgb = palette.map(hexRgb), lab = rgb.map((c) => srgbToLab(...c));
  const chosen = new Map();
  for (const o of objects) {
    const behind = rgb[backdrop(o)];
    const near = objects.filter((p) => p !== o && chosen.has(p.id) && o.near.includes(p.id)).map((p) => chosen.get(p.id));
    let pick = null, best = -Infinity;
    const candidates = ROLE_RAMPS[o.role];
    candidates.forEach((ramp, order) => {
      PREFERRED_SHADES.forEach((shade, rank) => {
        const mid = slot(ramp, shade);
        const c = contrast(rgb[mid], behind);
        const gap = near.length ? Math.min(...near.map((n) => deltaE00(lab[mid], lab[slot(n.ramp, n.shade)]))) : 100;
        const ok = c >= MIN_CONTRAST && gap >= MIN_HUE_GAP;
        const score = (ok ? 1000 : 0) + Math.min(gap, 60) - rank * 8 - order * 3 - ((o.seed + order) % candidates.length) * 2;
        if (score > best) { best = score; pick = { ramp, shade, ok, contrast: c, gap }; }
      });
    });
    chosen.set(o.id, pick);
  }
  return chosen;
}

export function rampFor(pick) {
  const s = pick.shade;
  return [slot(pick.ramp, Math.max(0, s - 2)), slot(pick.ramp, s), slot(pick.ramp, Math.min(RAMP - 1, s + 1))];
}
