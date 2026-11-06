// An original startup chime, synthesised with Web Audio.
let ctx: AudioContext | null = null;

function audio() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** Soft bell voice: sine + quiet octave, quick attack, long decay, through a shimmery delay. */
function bell(ac: AudioContext, out: AudioNode, freq: number, at: number, len: number, vol: number) {
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(vol, at + 0.025);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  g.connect(out);
  [
    [1, 'sine', 1],
    [2, 'triangle', 0.18],
    [3.01, 'sine', 0.05],
  ].forEach(([mult, type, level]) => {
    const o = ac.createOscillator();
    const og = ac.createGain();
    o.type = type as OscillatorType;
    o.frequency.value = freq * (mult as number);
    og.gain.value = level as number;
    o.connect(og).connect(g);
    o.start(at);
    o.stop(at + len + 0.05);
  });
}

function bus(ac: AudioContext) {
  const master = ac.createGain();
  master.gain.value = 0.5;
  const delay = ac.createDelay();
  delay.delayTime.value = 0.21;
  const fb = ac.createGain();
  fb.gain.value = 0.32;
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 2400;
  master.connect(ac.destination);
  master.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  lp.connect(ac.destination);
  return master;
}

const N = { G4: 392, C5: 523.25, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77, D6: 1174.66, E6: 1318.5 };

export function playStartup() {
  try {
    const ac = audio();
    const out = bus(ac);
    const t = ac.currentTime + 0.05;
    [N.C5, N.E5, N.G5, N.B5].forEach((f, i) => bell(ac, out, f, t + i * 0.13, 2.2, 0.16));
    // a warm chord to land on
    [N.C5 / 2, N.G5 / 2, N.E5].forEach((f) => bell(ac, out, f, t + 0.6, 3.2, 0.09));
    bell(ac, out, N.D6, t + 0.62, 2.8, 0.12);
  } catch {
    /* no audio: that's fine */
  }
}

export function playShutdown() {
  try {
    const ac = audio();
    const out = bus(ac);
    const t = ac.currentTime + 0.05;
    [N.G5, N.E5, N.C5, N.G4].forEach((f, i) => bell(ac, out, f, t + i * 0.16, 1.8, 0.14));
  } catch {
    /* ignore */
  }
}

export function playDing() {
  try {
    const ac = audio();
    bell(ac, bus(ac), N.E6, ac.currentTime + 0.02, 1, 0.12);
  } catch {
    /* ignore */
  }
}
