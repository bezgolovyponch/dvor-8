import { Component } from '../ref/engine.js';
import { SOURCES } from './palettes.js';
import { buildPalette } from './game-palette.js';
import { nearestIndex, srgbToLab } from './ciede2000.js';

const LAYOUT = new Component().PAL;
export const GAME_PALETTE = buildPalette(LAYOUT, SOURCES);
const CHROMATIC = 48;
const KEY_BITS = 2;
const SKY_BAND_FROM = 0.76;
const SKY_BAND2_FROM = 1;

export class GameEngine extends Component {
  constructor(...args) {
    super(...args);
    this.PAL = GAME_PALETTE.hex;
    this.snapCache = new Map();
  }

  quant(r, g, b) {
    const key = ((r >> KEY_BITS) << 16) | ((g >> KEY_BITS) << 8) | (b >> KEY_BITS);
    let i = this.snapCache.get(key);
    if (i === undefined) {
      this.paletteLab = this.paletteLab || this.PAL.map((h) => srgbToLab(...[1, 3, 5].map((j) => parseInt(h.slice(j, j + 2), 16))));
      i = nearestIndex(srgbToLab(r, g, b), this.paletteLab, CHROMATIC);
      this.snapCache.set(key, i);
    }
    return i;
  }

  skyStyle(x, y) {
    const T = this.SKY || this.SKYTHEMES.day, f = 1.557 * (T.s || 1), xs = x / 1.557, ys = y / f, g = ys / 210;
    let col = g < SKY_BAND_FROM ? T.base : T.band;
    if (T.band2 && g > SKY_BAND2_FROM) col = T.band2;
    const cloud = (yy) => this.vn(xs / 20 + 3, yy / 7) * 0.65 + this.vn(xs / 7 + 9, yy / 3 + 2) * 0.35 - 0.5;
    const v = cloud(ys) - (ys > 150 ? ((ys - 150) / 60) * 0.2 : 0);
    if (v > 0.03) return cloud(ys - 2.5) > 0.03 ? T.hi : T.lo;
    return col;
  }
}
