export const MSRCR = { sigmas: [15, 80, 250], gain: 5, offset: 25, alpha: 125, beta: 46, clip: [0.01, 0.99] };
export const HSV_STRETCH_CLIP = [0.005, 0.995];
const BOX_PASSES = 3;

const percentile = (values, q) => {
  const s = Float32Array.from(values).sort();
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};

function boxBlur(src, W, H, r) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  for (let y = 0; y < H; y += 1) {
    let acc = 0;
    for (let x = -r; x <= r; x += 1) acc += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x += 1) {
      tmp[y * W + x] = acc / (2 * r + 1);
      acc += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x += 1) {
    let acc = 0;
    for (let y = -r; y <= r; y += 1) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y += 1) {
      out[y * W + x] = acc / (2 * r + 1);
      acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}

export function gaussian(src, W, H, sigma) {
  const r = Math.max(1, Math.round(Math.sqrt((12 * sigma * sigma) / BOX_PASSES + 1) / 2));
  let out = src;
  for (let i = 0; i < BOX_PASSES; i += 1) out = boxBlur(out, W, H, r);
  return out;
}

export function msrcr(rgb, W, H, p = MSRCR) {
  const N = W * H, ch = [0, 1, 2].map((c) => Float32Array.from({ length: N }, (_, k) => rgb[k * 3 + c] + 1));
  const sum = new Float32Array(N);
  for (let k = 0; k < N; k += 1) sum[k] = ch[0][k] + ch[1][k] + ch[2][k];
  const out = new Float32Array(N * 3);
  for (let c = 0; c < 3; c += 1) {
    const r = new Float32Array(N);
    for (const s of p.sigmas) {
      const blur = gaussian(ch[c], W, H, s);
      for (let k = 0; k < N; k += 1) r[k] += Math.log(ch[c][k]) - Math.log(blur[k]);
    }
    for (let k = 0; k < N; k += 1) {
      const crf = p.beta * (Math.log(p.alpha * ch[c][k]) - Math.log(sum[k]));
      out[k * 3 + c] = p.gain * ((r[k] / p.sigmas.length) * crf + p.offset);
    }
  }
  const lo = percentile(out, p.clip[0]), hi = percentile(out, p.clip[1]);
  for (let i = 0; i < out.length; i += 1) out[i] = Math.min(255, Math.max(0, ((out[i] - lo) / Math.max(1e-6, hi - lo)) * 255));
  return out;
}

export function rgbToHsv(r, g, b) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, mx ? d / mx : 0, mx];
}

export function hsvToRgb(h, s, v) {
  const c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r + m, g + m, b + m];
}

export function stretchHsv(rgb, mask, clip = HSV_STRETCH_CLIP) {
  const N = rgb.length / 3, hsv = new Float32Array(N * 3);
  for (let k = 0; k < N; k += 1) hsv.set(rgbToHsv(rgb[k * 3], rgb[k * 3 + 1], rgb[k * 3 + 2]), k * 3);
  const range = [1, 2].map((c) => {
    const v = [];
    for (let k = 0; k < N; k += 1) if (mask[k]) v.push(hsv[k * 3 + c]);
    return v.length ? [percentile(v, clip[0]), percentile(v, clip[1])] : [0, c === 1 ? 1 : 255];
  });
  const out = new Float32Array(N * 3);
  for (let k = 0; k < N; k += 1) {
    const s = Math.min(1, Math.max(0, (hsv[k * 3 + 1] - range[0][0]) / Math.max(1e-6, range[0][1] - range[0][0])));
    const v = Math.min(255, Math.max(0, ((hsv[k * 3 + 2] - range[1][0]) / Math.max(1e-6, range[1][1] - range[1][0])) * 255));
    out.set(hsvToRgb(hsv[k * 3], s, v), k * 3);
  }
  return out;
}
