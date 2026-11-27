// The metronome (#practice/metronome, and a small one inside a guided session): tempo, tap
// tempo, beats in a bar, subdivisions, three sounds and a speed trainer that adds a little tempo
// every few bars. A minute of playing earns a point of Rhythm, up to 30 a day.
import { click, context, pulse } from "./audio.js";
import { clock, escapeHtml, keepAwake, spaceFor, tempoWord, toolSettings } from "./tool-kit.js";

const slowest = 30, fastest = 240;
const clamp = bpm => Math.max(slowest, Math.min(fastest, Math.round(bpm)));
const subdivisions = [[1, "Quarter notes"], [2, "Eighth notes"], [3, "Triplets"], [4, "Sixteenth notes"]];
const voices = [["click", "Click"], ["wood", "Wood block"], ["beep", "Beep"]];

export function mountMetronome(root, api, options = {}) {
  if (!root) return () => {};
  const saved = toolSettings("metronome", { bpm: 72, beats: 4, sub: 1, accent: true, voice: "click", from: 60, to: 90, step: 2, every: 4 });
  const s = saved.value;
  if (options.bpm) s.bpm = clamp(options.bpm);
  const compact = Boolean(options.compact);
  let run = null;           // { pulse, seconds, timer, release, trainer, bars }
  let taps = [];
  let today = api.todaySeconds?.("sec.metronome") ?? 0;

  const option = (value, label, selected) => `<option value="${value}"${selected ? " selected" : ""}>${escapeHtml(label)}</option>`;
  root.innerHTML = `<div class="metro${compact ? " metro--compact" : ""}" data-running="false">
    <div class="metro-tempo">
      <button type="button" class="metro-step" data-act="slower" aria-label="Slower by one beat per minute">−</button>
      <p class="metro-readout"><output class="metro-bpm" data-bpm aria-live="polite">${s.bpm}</output><span class="metro-unit">bpm</span><span class="metro-word" data-word>${tempoWord(s.bpm)}</span></p>
      <button type="button" class="metro-step" data-act="faster" aria-label="Faster by one beat per minute">+</button>
    </div>
    ${compact ? "" : `<input class="metro-slider" type="range" min="${slowest}" max="${fastest}" step="1" value="${s.bpm}" aria-label="Tempo in beats per minute" data-tempo>`}
    <div class="metro-beats" data-beats-row aria-hidden="true"></div>
    <div class="actions metro-main">
      <button type="button" class="btn metro-go" data-act="toggle" aria-pressed="false">Start</button>
      ${compact ? "" : '<button type="button" class="btn btn--ghost" data-act="tap">Tap tempo</button>'}
    </div>
    ${compact ? "" : `<div class="metro-options">
      <label class="field">Beats in a bar<select data-field="beats">${Array.from({ length: 12 }, (_, i) => option(i + 1, String(i + 1), s.beats === i + 1)).join("")}</select></label>
      <label class="field">Each beat as<select data-field="sub">${subdivisions.map(([value, label]) => option(value, label, s.sub === value)).join("")}</select></label>
      <label class="field">Sound<select data-field="voice">${voices.map(([value, label]) => option(value, label, s.voice === value)).join("")}</select></label>
      <label class="check-row"><input class="check" type="checkbox" data-field="accent"${s.accent ? " checked" : ""}><span>Stress the first beat of each bar</span></label>
    </div>
    <details class="disclosure metro-trainer"><summary>Speed trainer</summary>
      <p>Begin where the movement is easy. The metronome adds a little speed every few bars and stops climbing at your target, so the speed arrives without tension.</p>
      <div class="trainer-grid">
        <label class="field">Start at<input type="number" inputmode="numeric" min="${slowest}" max="${fastest}" value="${s.from}" data-field="from"></label>
        <label class="field">Target<input type="number" inputmode="numeric" min="${slowest}" max="${fastest}" value="${s.to}" data-field="to"></label>
        <label class="field">Add (bpm)<input type="number" inputmode="numeric" min="1" max="20" value="${s.step}" data-field="step"></label>
        <label class="field">Every (bars)<input type="number" inputmode="numeric" min="1" max="32" value="${s.every}" data-field="every"></label>
      </div>
      <div class="actions"><button type="button" class="btn" data-act="trainer">Start the speed trainer</button></div>
      <p class="meta" data-trainer-status role="status"></p>
    </details>
    <p class="meta metro-time" data-time></p>`}
  </div>`;
  const $ = selector => root.querySelector(selector);
  const box = $(".metro");

  function drawBeats(lit = -1) {
    const row = $("[data-beats-row]");
    if (!row) return;
    if (row.childElementCount !== s.beats) row.innerHTML = Array.from({ length: s.beats }, (_, i) => `<i${i === 0 && s.accent && s.beats > 1 ? ' class="is-first"' : ""}></i>`).join("");
    [...row.children].forEach((dot, i) => dot.classList.toggle("is-on", i === lit));
  }

  function showTempo() {
    $("[data-bpm]").textContent = s.bpm;
    $("[data-word]").textContent = tempoWord(s.bpm);
    const slider = $("[data-tempo]");
    if (slider) slider.value = s.bpm;
  }

  function showTime() {
    const line = $("[data-time]");
    if (!line) return;
    const session = run ? run.seconds : 0;
    line.textContent = `${run ? `${clock(session)} this time · ` : ""}${Math.floor((today + (run?.unsaved ?? 0)) / 60)} min with the metronome today`;
  }

  function setTempo(bpm, { keep = false } = {}) {
    s.bpm = clamp(bpm);
    if (!keep && run?.trainer) { run.trainer = null; trainerStatus("Speed trainer stopped: you changed the tempo."); }
    showTempo();
    saved.save();
  }

  function trainerStatus(text) {
    const line = $("[data-trainer-status]");
    if (line) line.textContent = text;
  }

  // Practice time: every whole minute of playing is counted, and earns a point of Rhythm.
  function tickSecond() {
    if (!run || document.visibilityState !== "visible") return;
    run.seconds++;
    run.unsaved++;
    if (run.unsaved >= 60) {
      run.unsaved -= 60;
      today += 60;
      api.reward({ source: "metronome", skill: "rhythm", xp: 1, cap: 30, metric: "sec.metronome", amount: 60, quiet: true });
    }
    showTime();
  }

  async function start(trainer = null) {
    stop();
    let ctx;
    try { ctx = await context(); } catch (error) { api.announce(error.message); return; }
    if (trainer) s.bpm = clamp(trainer.from);
    showTempo();
    const beat = () => 60 / s.bpm / s.sub;
    run = { seconds: 0, unsaved: 0, trainer, bars: 0, timer: setInterval(tickSecond, 1000), release: keepAwake() };
    run.pulse = pulse(ctx, {
      interval: beat,
      tick: (at, n) => {
        const perBar = s.beats * s.sub;
        const inBar = n % perBar;
        const onBeat = inBar % s.sub === 0;
        const index = Math.floor(inBar / s.sub);
        if (inBar === 0 && n > 0 && run?.trainer) advanceTrainer();
        click(ctx, at, onBeat ? (index === 0 && s.accent && s.beats > 1 ? "accent" : "beat") : "sub", s.voice);
        if (onBeat) run?.pulse?.at(at, () => drawBeats(index));
      }
    });
    box.dataset.running = "true";
    const go = $('[data-act="toggle"]');
    go.textContent = "Stop";
    go.setAttribute("aria-pressed", "true");
    if (trainer) trainerStatus(`Speed trainer: ${s.bpm} bpm, rising to ${trainer.to}.`);
    showTime();
  }

  function advanceTrainer() {
    const trainer = run.trainer;
    run.bars++;
    if (run.bars % trainer.every || s.bpm >= trainer.to) return;
    setTempo(Math.min(trainer.to, s.bpm + trainer.step), { keep: true });
    if (s.bpm >= trainer.to) {
      trainerStatus(`Target reached: ${trainer.to} bpm. Stay here while it feels easy.`);
      api.announce(`Target tempo reached: ${trainer.to} beats per minute.`);
      api.reward({ source: "speed", skill: "technique", xp: 15, cap: 45, metric: "n.speedgoal", amount: 1, label: "Speed trainer target reached" });
      api.record?.("metronome.target", trainer.to);
      run.trainer = null;
    } else trainerStatus(`Speed trainer: ${s.bpm} bpm, rising to ${trainer.to}.`);
  }

  function stop() {
    if (!run) return;
    run.pulse?.stop();
    clearInterval(run.timer);
    run.release();
    if (run.unsaved >= 5) { api.count("sec.metronome", run.unsaved); today += run.unsaved; }
    run = null;
    box.dataset.running = "false";
    const go = $('[data-act="toggle"]');
    go.textContent = "Start";
    go.setAttribute("aria-pressed", "false");
    drawBeats();
    showTime();
  }

  function tap() {
    const now = performance.now();
    taps = taps.filter(t => now - t < 2500);
    taps.push(now);
    if (taps.length >= 2) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i]).slice(-4);
      setTempo(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
    }
  }

  function onClick(event) {
    const button = event.target.closest("[data-act]");
    if (!button) return;
    const act = button.dataset.act;
    if (act === "toggle") run ? stop() : start();
    if (act === "slower") setTempo(s.bpm - 1);
    if (act === "faster") setTempo(s.bpm + 1);
    if (act === "tap") tap();
    if (act === "trainer") {
      const from = clamp(s.from), to = clamp(s.to);
      if (to <= from) { trainerStatus("Set a target faster than the starting tempo."); return; }
      start({ from, to, step: Math.max(1, Math.min(20, Math.round(s.step))), every: Math.max(1, Math.min(32, Math.round(s.every))) });
    }
  }
  function onInput(event) {
    const field = event.target.dataset.field;
    if (event.target.matches("[data-tempo]")) setTempo(Number(event.target.value));
    if (!field) return;
    if (field === "accent") s.accent = event.target.checked;
    else if (field === "voice") s.voice = event.target.value;
    else s[field] = Number(event.target.value) || s[field];
    if (field === "beats" || field === "accent") { $("[data-beats-row]").innerHTML = ""; drawBeats(); }
    saved.save();
  }
  function onKey(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (!root.isConnected) return;
    if (spaceFor(event)) { event.preventDefault(); run ? stop() : start(); return; }
    if (event.target.closest?.("input, select, textarea")) return;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") { event.preventDefault(); setTempo(s.bpm + 1); }
    if (event.key === "ArrowDown" || event.key === "ArrowLeft") { event.preventDefault(); setTempo(s.bpm - 1); }
    if (event.key === "PageUp") { event.preventDefault(); setTempo(s.bpm + 5); }
    if (event.key === "PageDown") { event.preventDefault(); setTempo(s.bpm - 5); }
    if (!compact && (event.key === "t" || event.key === "T")) tap();
  }
  // Press and hold − or + to keep changing the tempo.
  let hold = 0;
  function onDown(event) {
    const button = event.target.closest('[data-act="slower"], [data-act="faster"]');
    if (!button) return;
    const step = button.dataset.act === "faster" ? 1 : -1;
    clearInterval(hold);
    let repeats = 0;
    hold = setInterval(() => { repeats++; setTempo(s.bpm + step * (repeats > 8 ? 5 : 1)); }, 350);
  }
  const release = () => clearInterval(hold);

  root.addEventListener("click", onClick);
  root.addEventListener("input", onInput);
  root.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
  const keyTarget = compact ? root : document;
  keyTarget.addEventListener("keydown", onKey);
  drawBeats();
  showTime();
  return () => {
    stop();
    release();
    root.removeEventListener("click", onClick);
    root.removeEventListener("input", onInput);
    root.removeEventListener("pointerdown", onDown);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    keyTarget.removeEventListener("keydown", onKey);
  };
}
