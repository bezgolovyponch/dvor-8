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
  miss: () => tone(110, 0.05, 'triangle', 0.04),
  done: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.14, 'square', 0.07), i * 90)),
};
