import { Component } from '../ref/engine.js';
import { srgbToLab, deltaE00 } from './ciede2000.js';

const GREY_CHROMA = 12;
const GREY_SATURATION = 0.26;
const HUE_WEIGHT = 2;
const COOL_GREYS = [24, 25, 26, 27];
const CACHE_SIZE = 32768;

export function ciedeIndex(r, g, b, paletteLabs) {
  const lab = srgbToLab(r, g, b);
  let best = 0, bd = Infinity;
  for (let i = 0; i < 48; i += 1) {
    const d = deltaE00(lab, paletteLabs[i]);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}

export class V13Snap extends Component {
  constructor(rule = {}) {
    super();
    this.rule = { grey: 'sat', match: 'rgb', coolGreys: false, ...rule };
    this._paletteLabs = null;
    this._quantCache = null;
  }

  isGrey(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    if (mx < 45) return true;
    if (this.rule.grey === 'chroma') { const lb = this.lab(r, g, b); return Math.hypot(lb[1], lb[2]) < GREY_CHROMA; }
    return (mx ? (mx - mn) / mx : 0) < GREY_SATURATION;
  }

  get paletteLabs() {
    if (!this._paletteLabs) {
      if (!this.RGB) this.initPal();
      this._paletteLabs = this.RGB.slice(0, 48).map(([r, g, b]) => srgbToLab(r, g, b));
    }
    return this._paletteLabs;
  }

  get quantCache() {
    if (!this._quantCache) {
      this._quantCache = new Int16Array(CACHE_SIZE);
      this._quantCache.fill(-1);
    }
    return this._quantCache;
  }

  quant(r, g, b) {
    if (this.rule.match === 'ciede2000') {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      const cache = this.quantCache;
      if (cache[key] !== -1) return cache[key];
      const idx = ciedeIndex(r, g, b, this.paletteLabs);
      cache[key] = idx;
      return idx;
    }

    const L = 0.299 * r + 0.587 * g + 0.114 * b;
    let best = 0, bd = Infinity;
    if (this.isGrey(r, g, b)) {
      for (const i of this.NEU) { const d = Math.abs(this.LUM[i] - L); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    const pool = this.rule.coolGreys ? this.CHR.concat(COOL_GREYS) : this.CHR;
    if (this.rule.match === 'lab') {
      const lb = this.lab(r, g, b), PL = this.PLAB || (this.PLAB = this.RGB.map((c) => this.lab(c[0], c[1], c[2])));
      for (const i of pool) { const p = PL[i], d = (p[0] - lb[0]) ** 2 + HUE_WEIGHT * ((p[1] - lb[1]) ** 2 + (p[2] - lb[2]) ** 2); if (d < bd) { bd = d; best = i; } }
      return best;
    }
    for (const i of pool) { const p = this.RGB[i], dr = p[0] - r, dg = p[1] - g, db = p[2] - b, d = 2 * dr * dr + 4 * dg * dg + 3 * db * db; if (d < bd) { bd = d; best = i; } }
    return best;
  }
}
