// Sound, made from oscillators and noise: no files. A phone only lets sound start from a touch, so
// `unlock` is called from the first tap.

let ac = null;
let muted = false;

export function unlock() {
  if (!ac) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) ac = new Ctx();
  }
  if (ac && ac.state === 'suspended') ac.resume();
}
export function setMuted(on) { muted = on; }

function tone(freq, dur, type = 'square', vol = 0.08, slide = 0) {
  if (!ac || muted) return;
  const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination);
  o.start(t); o.stop(t + dur);
}
function noise(dur, vol) {
  if (!ac || muted) return;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ac.createBufferSource(), g = ac.createGain();
  src.buffer = buffer; g.gain.value = vol;
  src.connect(g).connect(ac.destination);
  src.start();
}

// The pitch of a hit climbs with the combo, so a run of hits is heard as a run.
export const sfx = {
  tick: (n) => tone(520 + n * 70, 0.05, 'square', 0.05),
  ready: () => { tone(660, 0.08); setTimeout(() => tone(990, 0.12), 80); },
  throw: () => tone(260, 0.06, 'triangle', 0.05, -140),
  hit: (combo) => { noise(0.06, 0.12); tone(150 + combo * 28, 0.08, 'square', 0.09, -60); },
  break: (combo) => { noise(0.22, 0.2); tone(95, 0.25, 'sawtooth', 0.12, -55); tone(440 + combo * 60, 0.12, 'square', 0.06, 300); },
  glass: () => { noise(0.14, 0.16); tone(1900, 0.09, 'square', 0.04, -700); },
  jump: () => tone(300, 0.12, 'square', 0.05, 380),
  land: () => tone(90, 0.05, 'triangle', 0.06, -30),
  gulp: () => [0, 170, 340, 510].forEach((ms, i) => setTimeout(() => tone(190 - i * 14, 0.09, 'sine', 0.13, -70), ms)),
  empty: () => tone(700, 0.04, 'square', 0.03, -200),
  splash: () => { noise(0.16, 0.14); tone(520, 0.12, 'sine', 0.06, -380); },
  alarm: () => { tone(880, 0.07, 'square', 0.06); setTimeout(() => tone(1175, 0.1, 'square', 0.06), 70); },
  lost: () => tone(330, 0.14, 'triangle', 0.05, -110),
  phone: () => [0, 180, 360].forEach((ms) => setTimeout(() => tone(1400, 0.09, 'square', 0.04), ms)),
  siren: () => [0, 260, 520, 780].forEach((ms, i) => setTimeout(() => tone(i % 2 ? 620 : 820, 0.24, 'sawtooth', 0.05), ms)),
  seen: () => { tone(220, 0.5, 'sawtooth', 0.1, -150); noise(0.3, 0.12); },
  fly: () => tone(74, 0.7, 'sawtooth', 0.025, 26),
  paper: () => { noise(0.12, 0.1); tone(980, 0.1, 'triangle', 0.05, -520); },
  miss: () => tone(110, 0.05, 'triangle', 0.04),
  done: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'square', 0.07), i * 90)),
};
