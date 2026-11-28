// Sound for the practice tools: metronome clicks, a plucked nylon string, strummed chords,
// flamenco palmas and a bell. Everything is synthesized in the page with the Web Audio API;
// no recordings are loaded. The plucked string is the Karplus–Strong method (a burst of noise
// in a short, slowly damped delay line), softened at the start like a fingertip without a nail.

let shared = null;
const strings = new Map();   // midi -> AudioBuffer of one plucked note
let noise = null;

// The page's AudioContext, created or woken up inside a tap (browsers ask for one first).
export async function context() {
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) throw new Error("This browser cannot play sound.");
  shared ??= new Context({ latencyHint: "interactive" });
  if (shared.state !== "running") {
    try { await shared.resume(); } catch { /* needs a tap */ }
  }
  try { if (navigator.audioSession && navigator.audioSession.type !== "play-and-record") navigator.audioSession.type = "playback"; } catch { /* not supported */ }
  return shared;
}
export const contextNow = () => shared;

export const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

function noiseBuffer(ctx) {
  if (noise?.sampleRate === ctx.sampleRate) return noise;
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function envelope(ctx, at, peak, attack, decay) {
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  return gain;
}

function output(ctx, destination) {
  return destination ?? ctx.destination;
}

// ---------------------------------------------------------------- metronome

// kind: "accent" (the first beat), "beat", "sub" (a subdivision). voice: "click", "wood" or "beep".
export function click(ctx, at, kind = "beat", voice = "click", { volume = 1, destination } = {}) {
  const level = (kind === "accent" ? .5 : kind === "beat" ? .32 : .16) * volume;
  if (voice === "wood") {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = kind === "accent" ? 2100 : kind === "beat" ? 1650 : 1300;
    band.Q.value = 7;
    const amp = envelope(ctx, at, level * 2.4, .001, .05);
    source.connect(band).connect(amp).connect(output(ctx, destination));
    source.start(at, Math.random() * .5, .08);
    const tone = ctx.createOscillator();
    tone.frequency.value = band.frequency.value * .5;
    const toneAmp = envelope(ctx, at, level * .5, .001, .03);
    tone.connect(toneAmp).connect(output(ctx, destination));
    tone.start(at);
    tone.stop(at + .06);
    return;
  }
  const osc = ctx.createOscillator();
  osc.type = voice === "beep" ? "sine" : "square";
  osc.frequency.value = voice === "beep" ? (kind === "accent" ? 1320 : kind === "beat" ? 880 : 660) : (kind === "accent" ? 1760 : kind === "beat" ? 1240 : 980);
  const shape = ctx.createBiquadFilter();
  shape.type = "lowpass";
  shape.frequency.value = voice === "beep" ? 8000 : 4200;
  const amp = envelope(ctx, at, voice === "beep" ? level * .6 : level * .45, .001, voice === "beep" ? .09 : .028);
  osc.connect(shape).connect(amp).connect(output(ctx, destination));
  osc.start(at);
  osc.stop(at + .12);
}

// ---------------------------------------------------------------- a plucked string

function pluckBuffer(ctx, midi) {
  const key = `${midi}@${ctx.sampleRate}`;
  if (strings.has(key)) return strings.get(key);
  const rate = ctx.sampleRate;
  const period = Math.max(2, Math.floor(rate / frequency(midi)));
  const seconds = midi < 52 ? 3.2 : midi < 64 ? 2.6 : 2;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(1, length, rate);
  const out = buffer.getChannelData(0);
  // A soft excitation: noise passed twice through a gentle low-pass, like flesh on the string.
  const line = new Float32Array(period);
  let smooth = 0;
  for (let i = 0; i < period; i++) {
    smooth += ((Math.random() * 2 - 1) - smooth) * .5;
    line[i] = smooth;
  }
  for (let pass = 0; pass < 2; pass++) for (let i = 1; i < period; i++) line[i] = (line[i] + line[i - 1]) / 2;
  let mean = 0;
  for (const value of line) mean += value / period;
  let peak = 0;
  for (let i = 0; i < period; i++) { line[i] -= mean; peak = Math.max(peak, Math.abs(line[i])); }
  for (let i = 0; i < period; i++) line[i] /= peak || 1;
  // Higher strings fade sooner; the damping keeps a nylon string's warmth.
  const damping = midi < 52 ? .9965 : midi < 64 ? .995 : .9935;
  let index = 0, previous = line[period - 1];
  for (let n = 0; n < length; n++) {
    const current = line[index];
    const next = damping * (current + previous) / 2;
    previous = current;
    line[index] = next;
    out[n] = current;
    index = (index + 1) % period;
  }
  // Fade the last tenth of a second to silence.
  const fade = Math.floor(rate * .1);
  for (let n = length - fade; n < length; n++) out[n] *= (length - n) / fade;
  const sounding = rate / (period + .5);   // the averaging filter adds half a sample of delay
  const entry = { buffer, correction: frequency(midi) / sounding };
  strings.set(key, entry);
  return entry;
}

// One note on a nylon string. midi is the sounding pitch (open low E is 40).
export function pluck(ctx, midi, at, { volume = .7, length, destination } = {}) {
  const { buffer, correction } = pluckBuffer(ctx, midi);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = correction;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = Math.min(9000, frequency(midi) * 9);
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(volume * .55, at);
  if (length) {
    amp.gain.setValueAtTime(volume * .55, at + length);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + length + .12);
  }
  source.connect(tone).connect(amp).connect(output(ctx, destination));
  source.start(at);
  source.stop(at + (length ? length + .15 : buffer.duration / correction));
  return source;
}

// A chord: the strings one after another, low to high (down) or high to low (up).
export function strum(ctx, midis, at, { direction = "down", spread = .022, volume = .55, destination } = {}) {
  const order = direction === "up" ? [...midis].reverse() : midis;
  order.forEach((midi, i) => pluck(ctx, midi, at + i * spread, { volume: volume * (direction === "up" ? .85 : 1), destination }));
}

// ---------------------------------------------------------------- palmas, cajón and a bell

// A hand clap: palmas fuertes (accent, bright and loud) or sordas (cupped, soft and dull).
export function clap(ctx, at, { accent = false, volume = 1, destination } = {}) {
  const bursts = accent ? [0, .009, .019] : [0, .011];
  for (const [i, offset] of bursts.entries()) {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx);
    const band = ctx.createBiquadFilter();
    band.type = accent ? "bandpass" : "lowpass";
    band.frequency.value = accent ? 1900 : 900;
    band.Q.value = accent ? 1.1 : .7;
    const last = i === bursts.length - 1;
    const amp = envelope(ctx, at + offset, (accent ? .9 : .32) * volume * (last ? 1 : .55), .001, last ? (accent ? .13 : .09) : .012);
    source.connect(band).connect(amp).connect(output(ctx, destination));
    source.start(at + offset, Math.random() * .6, .2);
  }
}

export function cajon(ctx, at, { volume = 1, destination } = {}) {
  const osc = ctx.createOscillator();
  osc.frequency.setValueAtTime(110, at);
  osc.frequency.exponentialRampToValueAtTime(48, at + .12);
  const amp = envelope(ctx, at, .7 * volume, .002, .16);
  osc.connect(amp).connect(output(ctx, destination));
  osc.start(at);
  osc.stop(at + .2);
}

export function bell(ctx, at = ctx.currentTime + .02, { volume = .5, destination } = {}) {
  for (const [ratio, level, decay] of [[1, 1, 1.6], [2.76, .45, .9], [5.4, .25, .5], [8.9, .12, .3]]) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 660 * ratio;
    const amp = envelope(ctx, at, level * volume * .35, .004, decay);
    osc.connect(amp).connect(output(ctx, destination));
    osc.start(at);
    osc.stop(at + decay + .05);
  }
}

// ---------------------------------------------------------------- keeping time

// Calls tick(time, n) for every pulse, n = 0, 1, 2…, a little before it is due, so sounds are
// scheduled on the audio clock and stay steady even when the page is busy. interval(n) gives
// the seconds from pulse n to pulse n + 1, so the tempo can change while it runs.
export function pulse(ctx, { interval, tick, start = ctx.currentTime + .12, lookahead = .16 }) {
  let n = 0, next = start, timer = 0, stopped = false;
  const visuals = new Set();
  function pump() {
    if (stopped) return;
    while (next < ctx.currentTime + lookahead) {
      const at = next, index = n;
      tick(at, index);
      next += interval(index);
      n++;
    }
    timer = setTimeout(pump, 25);
  }
  pump();
  return {
    stop() { stopped = true; clearTimeout(timer); for (const id of visuals) clearTimeout(id); visuals.clear(); },
    // Run fn when the audio clock reaches time (for lights and counters in step with the sound).
    at(time, fn) {
      const id = setTimeout(() => { visuals.delete(id); if (!stopped) fn(); }, Math.max(0, (time - ctx.currentTime) * 1000 - 8));
      visuals.add(id);
    }
  };
}
