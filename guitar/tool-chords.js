// The chord trainer (#practice/chords): hear any chord in the library, play one-minute changes
// between two chords (count each switch, beat your best), and name chords from their diagrams.
import { context, pluck, strum } from "./audio.js";
import { changePairs, chordIndex, chordMidis, chords, chordSvg } from "./chords.js";
import { clock, escapeHtml, keepAwake, toolSettings } from "./tool-kit.js";

const roundSeconds = 60;
const pairId = pair => pair.join("-");

export function mountChords(root, api) {
  if (!root) return () => {};
  const saved = toolSettings("chords", { tab: "changes", pair: "Am-E" });
  const s = saved.value;
  if (!changePairs.some(group => group.pairs.some(pair => pairId(pair) === s.pair))) s.pair = "Am-E";
  if (!["changes", "quiz", "library"].includes(s.tab)) s.tab = "changes";
  let round = null;      // { left, count, timer, release, endsAt }
  let quiz = null;       // { chord, options, answered, right, asked }

  const tabs = [["changes", "One-minute changes"], ["quiz", "Name the chord"], ["library", "Chord library"]];
  root.innerHTML = `<div class="chords">
    <div class="tabs tabs--three" role="group" aria-label="Chord exercise">${tabs.map(([id, label]) => `<button type="button" data-tab="${id}" aria-pressed="${s.tab === id}">${label}</button>`).join("")}</div>
    <div data-panel></div>
  </div>`;
  const panel = root.querySelector("[data-panel]");

  async function hear(id, arpeggio = false) {
    const chord = chordIndex.get(id);
    try {
      const ctx = await context();
      const notes = chordMidis(chord);
      if (arpeggio) notes.forEach((midi, i) => pluck(ctx, midi, ctx.currentTime + .04 + i * .32, { volume: .75 }));
      else strum(ctx, notes, ctx.currentTime + .04);
    } catch (error) { api.announce(error.message); }
  }

  // ---------------------------------------------------------------- one-minute changes
  function drawChanges() {
    const [a, b] = s.pair.split("-");
    const best = api.best?.("changes." + s.pair) ?? 0;
    panel.innerHTML = `<div class="changes" data-state="${round ? "running" : "ready"}">
      <label class="field">Chord pair<select data-pair>${changePairs.map(group => `<optgroup label="${escapeHtml(group.label)} (${group.module})">${group.pairs.map(pair =>
        `<option value="${pairId(pair)}"${pairId(pair) === s.pair ? " selected" : ""}>${pair.map(id => chordIndex.get(id).name).join(" ↔ ")}</option>`).join("")}</optgroup>`).join("")}</select></label>
      <div class="changes-pair">${[a, b].map(id => `<figure class="chord-card">${chordSvg(chordIndex.get(id))}<figcaption><strong>${escapeHtml(chordIndex.get(id).name)}</strong><button type="button" class="link link--button" data-hear="${id}">Hear it</button></figcaption></figure>`).join("")}</div>
      <div class="changes-run">
        <p class="changes-clock" data-clock aria-hidden="true">${clock(roundSeconds)}</p>
        <button type="button" class="changes-tap" data-act="tap"${round ? "" : " disabled"}><b data-count>${round?.count ?? 0}</b><span>Tap at each change</span></button>
        <p class="meta" data-best>${best ? `Your best for this pair: ${best} changes in a minute.` : "No round played with this pair yet."}</p>
      </div>
      <div class="actions"><button type="button" class="btn" data-act="round">${round ? "Stop the round" : "Start a one-minute round"}</button></div>
      <p class="meta">Strum the first chord, change, strum the second: that is one change, and each switch back counts again. Tap the big button or press the space bar each time the new chord rings. Accuracy first: a change counts only when every string sounds.</p>
      <p class="changes-result" data-result role="status"></p>
    </div>`;
  }

  async function startRound() {
    stopRound();
    let ctx;
    try { ctx = await context(); } catch (error) { api.announce(error.message); return; }
    round = { count: 0, release: keepAwake(), started: false, timers: [] };
    drawChanges();
    const button = panel.querySelector('[data-act="tap"]');
    const clockLine = panel.querySelector("[data-clock]");
    // A count-in of three clicks, then a minute.
    for (let i = 0; i < 3; i++) {
      pluck(ctx, i === 2 ? 81 : 76, ctx.currentTime + .05 + i * .6, { volume: .5, length: .08 });
      round.timers.push(setTimeout(() => { if (round) clockLine.textContent = String(3 - i); }, i * 600));
    }
    round.timers.push(setTimeout(() => {
      if (!round) return;
      round.started = true;
      round.endsAt = performance.now() + roundSeconds * 1000;
      button.disabled = false;
      button.focus({ preventScroll: true });
      api.announce("Go.");
      round.timer = setInterval(() => {
        if (!round) return;
        const left = Math.max(0, (round.endsAt - performance.now()) / 1000);
        clockLine.textContent = clock(left);
        if (left <= 0) finishRound();
      }, 200);
    }, 1800));
  }

  function finishRound() {
    if (!round) return;
    const count = round.count;
    clearInterval(round.timer);
    round.timers.forEach(clearTimeout);
    round.release();
    round = null;
    context().then(ctx => strum(ctx, chordMidis(chordIndex.get(s.pair.split("-")[1])), ctx.currentTime + .05)).catch(() => {});
    const best = api.best?.("changes." + s.pair) ?? 0;
    const isBest = count > 0 && api.record?.("changes." + s.pair, count);
    drawChanges();
    const xp = Math.min(40, count);
    if (count > 0) api.reward({ source: "changes", skill: "harmony", xp: xp + (isBest && best ? 10 : 0), cap: 150, metric: "n.changes", amount: 1, label: `${count} chord changes in a minute` });
    panel.querySelector("[data-result]").textContent = count
      ? `${count} changes in a minute.${isBest ? (best ? ` A new best: ${count - best} more than before.` : " Your first score for this pair.") : ` Your best is ${best}.`}`
      : "No changes counted. Start again and tap each time the new chord sounds.";
  }

  function stopRound() {
    if (!round) return;
    clearInterval(round.timer);
    round.timers.forEach(clearTimeout);
    round.release();
    round = null;
  }

  // ---------------------------------------------------------------- name the chord
  function newQuestion() {
    const pool = chords.filter(chord => chord.id !== quiz?.chord?.id);
    const chord = pool[Math.floor(Math.random() * pool.length)];
    const others = chords.filter(other => other !== chord).sort(() => Math.random() - .5).slice(0, 3);
    quiz = { chord, options: [chord, ...others].sort(() => Math.random() - .5), answered: null, right: quiz?.right ?? 0, asked: quiz?.asked ?? 0 };
  }
  function drawQuiz() {
    if (!quiz) newQuestion();
    const { chord, options, answered } = quiz;
    panel.innerHTML = `<div class="chord-quiz">
      <figure class="chord-card chord-card--large">${chordSvg(chord, { showFingers: false })}<figcaption><button type="button" class="link link--button" data-hear="${chord.id}">Hear it</button></figcaption></figure>
      <h2 class="quiz-prompt">Which chord is this?</h2>
      <div class="answer-options" role="group" aria-label="Answers">${options.map((option, i) => {
        const state = answered ? option === chord ? ' data-correct="true"' : option === answered ? ' data-wrong="true"' : "" : "";
        return `<button type="button" class="answer" data-option="${i}"${answered ? " disabled" : ""}${state}><kbd aria-hidden="true">${i + 1}</kbd>${escapeHtml(option.name)}</button>`;
      }).join("")}</div>
      <p class="quiz-feedback" role="status">${answered ? (answered === chord ? "Right. " : `It is ${escapeHtml(chord.name)}. `) + escapeHtml(chord.tip) : ""}</p>
      <div class="actions"><button type="button" class="btn" data-act="next"${answered ? "" : " disabled"}>Next chord</button>${quiz.asked ? `<span class="meta">${quiz.right} right out of ${quiz.asked}</span>` : ""}</div>
    </div>`;
  }
  function answer(index) {
    if (!quiz || quiz.answered || !quiz.options[index]) return;
    quiz.answered = quiz.options[index];
    quiz.asked++;
    const right = quiz.answered === quiz.chord;
    if (right) {
      quiz.right++;
      api.reward({ source: "chordquiz", skill: "harmony", xp: 3, cap: 45, metric: "n.chordquiz", amount: 1, quiet: true });
    }
    hear(quiz.chord.id);
    drawQuiz();
    panel.querySelector('[data-act="next"]')?.focus({ preventScroll: true });
    api.announce(right ? "Right." : `It is ${quiz.chord.name}.`);
  }

  // ---------------------------------------------------------------- library
  function drawLibrary() {
    const groups = [["Open chords", ["Em", "E", "Am", "A", "Dm", "D", "C", "G", "Asus2"]], ["Sevenths", ["E7", "A7", "D7", "G7", "B7", "Fmaj7"]], ["Spanish colour", ["Am", "G", "F", "E"]]];
    panel.innerHTML = `<div class="chord-library">${groups.map(([title, ids]) => `<section><h2>${title}</h2>
      ${title === "Spanish colour" ? '<p class="meta">Am – G – F – E: the descending Andalusian cadence that ends on the bright E of the Phrygian mode (Module 10).</p>' : ""}
      <div class="chord-grid">${ids.map(id => {
        const chord = chordIndex.get(id);
        return `<figure class="chord-card">${chordSvg(chord)}<figcaption><strong>${escapeHtml(chord.name)}</strong><span class="meta">${escapeHtml(chord.tip)}</span>
          <span class="chord-actions"><button type="button" class="btn btn--ghost btn--small" data-hear="${id}">Strum</button><button type="button" class="btn btn--ghost btn--small" data-arpeggio="${id}">One string at a time</button></span></figcaption></figure>`;
      }).join("")}</div></section>`).join("")}</div>`;
  }

  function draw() {
    for (const button of root.querySelectorAll("[data-tab]")) button.setAttribute("aria-pressed", String(button.dataset.tab === s.tab));
    if (s.tab === "changes") drawChanges();
    else if (s.tab === "quiz") drawQuiz();
    else drawLibrary();
  }

  function onClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.tab && button.dataset.tab !== s.tab) {
      stopRound();
      s.tab = button.dataset.tab;
      saved.save();
      draw();
      root.querySelector(`[data-tab="${s.tab}"]`)?.focus({ preventScroll: true });
    }
    if (button.dataset.hear) hear(button.dataset.hear);
    if (button.dataset.arpeggio) hear(button.dataset.arpeggio, true);
    if (button.dataset.act === "round") round ? (stopRound(), drawChanges()) : startRound();
    if (button.dataset.act === "tap" && round?.started) {
      round.count++;
      panel.querySelector("[data-count]").textContent = round.count;
    }
    if (button.dataset.act === "next") { newQuestion(); drawQuiz(); panel.querySelector("[data-option]")?.focus({ preventScroll: true }); }
    if (button.dataset.option) answer(Number(button.dataset.option));
  }
  function onChange(event) {
    if (event.target.matches("[data-pair]")) {
      stopRound();
      s.pair = event.target.value;
      saved.save();
      drawChanges();
      panel.querySelector("[data-pair]")?.focus({ preventScroll: true });
    }
  }
  function onKey(event) {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !root.isConnected) return;
    // A focused button answers the space bar itself, with a click.
    if (event.target.closest?.("input, select, textarea, button, a, summary")) return;
    if (s.tab === "changes" && event.key === " ") {
      event.preventDefault();
      if (round?.started) { round.count++; panel.querySelector("[data-count]").textContent = round.count; }
      else if (!round) startRound();
      return;
    }
    if (s.tab === "quiz" && /^[1-4]$/.test(event.key)) { event.preventDefault(); answer(Number(event.key) - 1); }
  }
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  document.addEventListener("keydown", onKey);
  draw();
  return () => {
    stopRound();
    root.removeEventListener("click", onClick);
    root.removeEventListener("change", onChange);
    document.removeEventListener("keydown", onKey);
  };
}
