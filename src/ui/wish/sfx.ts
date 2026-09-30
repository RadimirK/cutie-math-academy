// Synthesized sound effects for the recruitment animation (WebAudio, no audio files).
// The first pull is a user gesture, so the AudioContext is allowed to start.

const KEY = 'cma:wish-muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function isMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean) {
  try {
    localStorage.setItem(KEY, muted ? '1' : '0');
  } catch {
    // storage unavailable: the choice lasts for this page only
  }
  if (master) master.gain.value = muted ? 0 : VOLUME;
}

const VOLUME = 0.22;

function audio(): { ac: AudioContext; out: GainNode } | null {
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = isMuted() ? 0 : VOLUME;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return { ac: ctx, out: master! };
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.5, glideTo?: number) {
  const a = audio();
  if (!a) return;
  const t = a.ac.currentTime + start;
  const osc = a.ac.createOscillator();
  const g = a.ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.out);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(start: number, dur: number, from: number, to: number, gain = 0.4, type: BiquadFilterType = 'bandpass') {
  const a = audio();
  if (!a) return;
  const t = a.ac.currentTime + start;
  const buf = a.ac.createBuffer(1, Math.ceil(a.ac.sampleRate * dur), a.ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = a.ac.createBufferSource();
  src.buffer = buf;
  const f = a.ac.createBiquadFilter();
  f.type = type;
  f.Q.value = 2;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = a.ac.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + dur * 0.8);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(a.out);
  src.start(t);
}

/** Rising whoosh and drone while the vortex charges. */
export function sfxCharge(seconds: number) {
  noise(0, seconds, 200, 5000, 0.35);
  tone(55, 0, seconds, 'sawtooth', 0.08, 110);
  tone(110, 0, seconds, 'triangle', 0.1, 220);
}

const STEP_NOTES: Record<number, number[]> = {
  3: [523.25, 659.25, 783.99],
  4: [587.33, 739.99, 880, 1174.66],
  5: [659.25, 830.61, 987.77, 1318.51, 1661.22],
};

/** Bell chime when the card glow reaches a rarity. */
export function sfxTier(rarity: number) {
  const notes = STEP_NOTES[rarity] ?? STEP_NOTES[3]!;
  notes.forEach((f, i) => {
    tone(f, i * 0.05, 1.4, 'sine', 0.25);
    tone(f * 2, i * 0.05, 0.8, 'triangle', 0.06);
  });
  if (rarity >= 4) noise(0, 0.5, 8000, 2000, 0.15, 'highpass');
}

/** Impact of the flash: thump and a bright sweep. */
export function sfxFlash(rarity: number) {
  tone(90, 0, 0.7, 'sine', 0.7, 35);
  noise(0, 0.6, 6000, 300, 0.4, 'lowpass');
  if (rarity === 5) tone(1318.51, 0.05, 1.8, 'sine', 0.15, 2637);
}

export function sfxFlip(rarity: number) {
  tone(rarity >= 4 ? 1400 : 900, 0, 0.12, 'triangle', 0.15, rarity >= 4 ? 2200 : 1200);
  if (rarity >= 4) [1318.51, 1567.98, 2093].forEach((f, i) => tone(f, 0.04 + i * 0.06, 0.5, 'sine', 0.12));
}

/** Triumphant arpeggio for the character splash. */
export function sfxSplash(rarity: number) {
  const base = rarity === 5 ? [392, 493.88, 587.33, 739.99, 987.77] : rarity === 4 ? [440, 554.37, 659.25, 880] : [523.25, 659.25, 783.99];
  base.forEach((f, i) => tone(f, i * 0.09, 1.6, 'triangle', 0.18));
  tone(base[0]! / 2, 0, 2, 'sine', 0.2);
}

export function sfxStar() {
  tone(1760, 0, 0.25, 'square', 0.05, 2640);
}
