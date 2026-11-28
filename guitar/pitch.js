// Listening for the tuner: the microphone's sound is analysed in the page a few dozen times a
// second and dropped. Nothing is recorded or sent anywhere.
// The pitch is found with the YIN method (de Cheveigné and Kawahara, 2002), as in the note quiz
// (note-reading/index.html, yinPitch), with a longer window here because tuning needs a steadier
// reading than recognising a note.
const range = { min: 60, max: 1400, threshold: .12 };

function yin(x, rate, work) {
  const maxTau = Math.min(Math.floor(rate / range.min), Math.floor(x.length / 2) - 1);
  const minTau = Math.max(2, Math.floor(rate / range.max));
  const width = x.length - maxTau;
  if (!work.d || work.d.length < maxTau + 2) work.d = new Float32Array(maxTau + 2);
  const d = work.d;
  for (let tau = 1; tau <= maxTau; tau++) {
    let total = 0;
    for (let j = 0; j < width; j++) { const v = x[j] - x[j + tau]; total += v * v; }
    d[tau] = total;
  }
  d[0] = 1;
  let run = 0;
  for (let tau = 1; tau <= maxTau; tau++) { run += d[tau]; d[tau] = run > 0 ? d[tau] * tau / run : 1; }
  let tau = -1;
  for (let t = minTau; t <= maxTau; t++) {
    if (d[t] < range.threshold) { while (t + 1 <= maxTau && d[t + 1] < d[t]) t++; tau = t; break; }
  }
  if (tau < 0) {
    let best = minTau;
    for (let t = minTau + 1; t <= maxTau; t++) if (d[t] < d[best]) best = t;
    if (d[best] > .3) return null;
    tau = best;
  }
  // A much deeper dip at twice the period: the true note is an octave lower.
  const double = tau * 2;
  if (double + 1 <= maxTau) {
    let m = double;
    for (let t = Math.max(minTau, double - 2); t <= Math.min(maxTau, double + 2); t++) if (d[t] < d[m]) m = t;
    if (d[tau] > .1 && d[m] < d[tau] * .35) tau = m;
  }
  let exact = tau;
  if (tau > 1 && tau < maxTau) {
    const s0 = d[tau - 1], s1 = d[tau], s2 = d[tau + 1], den = s0 - 2 * s1 + s2;
    if (den > 0) exact = tau + (s0 - s2) / (2 * den);
  }
  return { freq: rate / exact, clarity: 1 - d[tau] };
}

function halve(source, out) {
  for (let i = 0; i < out.length; i++) {
    const j = 2 * i;
    out[i] = ((source[j - 1] || 0) + 3 * source[j] + 3 * (source[j + 1] || 0) + (source[j + 2] || 0)) / 8;
  }
  return out;
}

export const midiOf = freq => 69 + 12 * Math.log2(freq / 440);

// The microphone, for one listener at a time. listen(ctx, onFrame) asks for the microphone and
// calls onFrame({ freq, clarity, level }) every animation frame; it resolves to a stop function,
// or rejects with an Error whose name says why ("NotAllowedError" when it was refused).
export async function listen(ctx, onFrame) {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("This browser cannot use a microphone here."), { name: "NotSupportedError" });
  try { if (navigator.audioSession) navigator.audioSession.type = "play-and-record"; } catch { /* not supported */ }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 8192;
  analyser.smoothingTimeConstant = 0;
  source.connect(analyser);
  const raw = new Float32Array(analyser.fftSize);
  const half = new Float32Array(analyser.fftSize / 2);
  const work = {};
  let frame = 0, stopped = false;
  function loop() {
    if (stopped) return;
    frame = requestAnimationFrame(loop);
    analyser.getFloatTimeDomainData(raw);
    let power = 0;
    for (let i = raw.length - 4096; i < raw.length; i++) power += raw[i] * raw[i];
    const rms = Math.sqrt(power / 4096);
    const level = Math.max(0, Math.min(1, (20 * Math.log10(rms + 1e-9) + 60) / 54));
    let pitch = null;
    if (rms > .002) {
      halve(raw, half);
      pitch = yin(half.subarray(half.length - 2048), ctx.sampleRate / 2, work);
    }
    onFrame({ freq: pitch && pitch.clarity > .85 ? pitch.freq : null, clarity: pitch?.clarity ?? 0, level });
  }
  loop();
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    try { source.disconnect(); } catch { /* gone */ }
    for (const track of stream.getTracks()) track.stop();
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch { /* not supported */ }
  };
}
