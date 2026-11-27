// The guided session (#practice/session): today's plan from the Today screen, one step at a
// time, with a countdown, a bell when the time is up, the screen kept awake, and a small
// metronome or the open strings beside the steps that need them. At the end the session can go
// straight into the journal.
//
// api.plan() gives { title, href, steps: [{ key, kind, label, detail, minutes, done }] };
// api.tick(key) ticks a step on the Today checklist; api.log({ minutes, exercises, piece }) saves a
// journal entry.
import { bell, context } from "./audio.js";
import { mountMetronome } from "./tool-metronome.js";
import { mountStringButtons } from "./tool-tuner.js";
import { clock, escapeHtml, icon, keepAwake } from "./tool-kit.js";

const tempoIn = text => {
  const match = /(\d{2,3})(?:\s*[–-]\s*(\d{2,3}))?\s*bpm/i.exec(text ?? "");
  return match ? Number(match[1]) : null;
};

export function mountSession(root, api) {
  if (!root) return () => {};
  const plan = api.plan();
  const steps = plan.steps.map(step => ({ ...step, left: step.minutes * 60, spent: 0 }));
  let index = Math.max(0, steps.findIndex(step => !step.done));
  if (steps.every(step => step.done)) index = 0;
  let running = false, timer = 0, release = null, total = 0, finished = false, logged = false, rang = false;
  let unmountHelper = () => {};

  if (!steps.length) {
    root.innerHTML = `<div class="session session--empty"><p>${escapeHtml(plan.empty ?? "Today is a rest day in your plan. Rest is part of practice: listen to a piece you like, or open a practice tool if you want to play.")}</p>
      <div class="actions"><a class="btn" href="#practice">Open the practice room</a><a class="btn btn--ghost" href="#home">Back to today</a></div></div>`;
    return () => {};
  }

  function ring(fraction) {
    const value = Math.max(0, Math.min(1, fraction)) * 100;
    return `<svg class="session-ring" viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52"/><circle class="ring-value" cx="60" cy="60" r="52" pathLength="100" stroke-dasharray="${value.toFixed(2)} 100" transform="rotate(-90 60 60)"/></svg>`;
  }

  function helper(step) {
    if (step.kind === "setup") return `<div class="session-helper"><p class="meta">Tap a string to hear its note, or use the tuner.</p><div data-strings></div><p><a class="link" href="#practice/tuner">Open the tuner${icon("arrow-right")}</a></p></div>`;
    if (step.kind === "technique" || step.kind === "music") return `<div class="session-helper"><p class="meta">A metronome for this step${tempoIn(step.detail) ? ", set to the tempo it asks for" : ""}.</p><div data-metronome></div></div>`;
    if (step.kind === "reading") return `<div class="session-helper"><p class="meta">Practise reading here, then come back to tick the step:</p><ul class="link-list"><li><a class="link" href="#reading/notes">Reading trainer${icon("arrow-right")}</a></li><li><a class="link" href="note-reading/">Note quiz${icon("arrow-right")}</a></li><li><a class="link" href="${escapeHtml(plan.href)}">Today’s plan and scores${icon("arrow-right")}</a></li></ul></div>`;
    if (step.kind === "video") return `<div class="session-helper"><p><a class="link" href="${escapeHtml(plan.href)}">Open today’s plan and its video${icon("arrow-right")}</a></p></div>`;
    if (step.kind === "review") return `<div class="session-helper"><p class="meta">One sentence is enough: what to repeat next time. Finish the session to save it in the journal.</p></div>`;
    return "";
  }

  function draw() {
    unmountHelper();
    unmountHelper = () => {};
    if (finished) { drawSummary(); return; }
    const step = steps[index];
    const over = step.left <= 0;
    root.innerHTML = `<div class="session" data-state="${running ? "running" : "paused"}">
      <ol class="session-steps" aria-label="Steps">${steps.map((item, i) => `<li class="${item.done ? "is-done" : ""}${i === index ? " is-now" : ""}"><button type="button" data-goto="${i}" aria-label="Step ${i + 1}: ${escapeHtml(item.label)}${item.done ? ", done" : ""}"${i === index ? ' aria-current="step"' : ""}>${item.done ? icon("check") : i + 1}</button></li>`).join("")}</ol>
      <div class="session-card">
        <p class="kicker">Step ${index + 1} of ${steps.length} · ${step.minutes} min</p>
        <h2 tabindex="-1">${escapeHtml(step.label)}</h2>
        <p class="session-detail">${escapeHtml(step.detail)}</p>
        <div class="session-clock">${ring(step.left / (step.minutes * 60))}<p><b data-left>${over ? "Time" : clock(step.left)}</b><small>${over ? "Finish when you’re ready" : running ? "left" : "ready"}</small></p></div>
        <div class="actions session-actions">
          <button type="button" class="btn" data-act="run">${running ? "Pause" : step.spent ? "Resume" : "Start the timer"}</button>
          <button type="button" class="btn ${over || step.spent ? "" : "btn--ghost"}" data-act="done">${step.done ? "Next step" : "Done: tick it off"}</button>
          <button type="button" class="btn btn--ghost btn--small" data-act="more">+1 min</button>
          ${index + 1 < steps.length ? '<button type="button" class="link link--button" data-act="skip">Skip this step</button>' : ""}
        </div>
        ${helper(step)}
      </div>
      <p class="meta session-total" data-total>${clock(total)} practised in this session · ${steps.filter(item => item.done).length} of ${steps.length} steps ticked</p>
      <div class="actions"><button type="button" class="link link--button" data-act="finish">Finish the session now</button></div>
    </div>`;
    const strings = root.querySelector("[data-strings]");
    if (strings) unmountHelper = mountStringButtons(strings);
    const metronome = root.querySelector("[data-metronome]");
    if (metronome) unmountHelper = mountMetronome(metronome, api, { compact: true, bpm: tempoIn(step.detail) ?? 60 });
  }

  function drawSummary() {
    const minutes = Math.max(1, Math.round(total / 60));
    const done = steps.filter(step => step.done);
    root.innerHTML = `<div class="session session--done">
      <p class="kicker">Session complete</p>
      <h2 tabindex="-1">${done.length === steps.length ? "Every step done" : `${done.length} of ${steps.length} steps done`}</h2>
      <p>${clock(total)} of focused practice. ${done.length === steps.length ? "Well played." : "Whatever you left out can wait for tomorrow."}</p>
      ${logged ? `<p class="callout"><strong>Saved</strong>This session is in your journal.</p>` : `<form class="form-grid session-log" data-log>
        <label class="field">Minutes<input type="number" name="minutes" inputmode="numeric" min="1" max="600" value="${minutes}" required></label>
        <label class="field">Piece or focus<input name="piece" maxlength="200" value="${escapeHtml(plan.title)}"></label>
        <label class="field full">What will you try next time?<textarea name="notes" rows="2" maxlength="2000"></textarea></label>
        <div class="actions full"><button type="submit" class="btn">Save it in the journal</button></div>
      </form>`}
      <div class="actions"><a class="btn ${logged ? "" : "btn--ghost"}" href="#home">Back to today</a><a class="btn btn--ghost" href="#hero">See your hero</a></div>
    </div>`;
    root.querySelector("h2")?.focus({ preventScroll: true });
  }

  function second() {
    if (!running || document.visibilityState !== "visible") return;
    const step = steps[index];
    step.left--;
    step.spent++;
    total++;
    if (step.left === 0 && !rang) {
      rang = true;
      context().then(ctx => bell(ctx)).catch(() => {});
      try { navigator.vibrate?.([120, 80, 120]); } catch { /* not supported */ }
      api.announce(`Time for “${step.label}” is up. Tick it off when you are done.`);
    }
    const left = root.querySelector("[data-left]");
    if (left) left.textContent = step.left > 0 ? clock(step.left) : "Time";
    const value = root.querySelector(".session-ring .ring-value");
    if (value) value.setAttribute("stroke-dasharray", `${(Math.max(0, step.left) / (step.minutes * 60) * 100).toFixed(2)} 100`);
    const totalLine = root.querySelector("[data-total]");
    if (totalLine) totalLine.textContent = `${clock(total)} practised in this session · ${steps.filter(item => item.done).length} of ${steps.length} steps ticked`;
  }

  function play() {
    if (running) return;
    running = true;
    release ??= keepAwake();
    clearInterval(timer);
    timer = setInterval(second, 1000);
    context().catch(() => {});   // wakes the sound up inside the tap, for the bell
    draw();
  }
  function pause() {
    running = false;
    clearInterval(timer);
    draw();
  }
  function goTo(next) {
    index = Math.max(0, Math.min(steps.length - 1, next));
    rang = steps[index].left <= 0;
    draw();
    root.querySelector("h2")?.focus({ preventScroll: true });
  }
  function done() {
    const step = steps[index];
    if (!step.done) { step.done = true; api.tick(step.key); }
    const next = steps.findIndex((item, i) => i > index && !item.done);
    const any = steps.findIndex(item => !item.done);
    if (next >= 0 || any >= 0) goTo(next >= 0 ? next : any);
    else finish();
  }
  function finish() {
    running = false;
    clearInterval(timer);
    release?.();
    release = null;
    finished = true;
    if (total >= 30) api.count("sec.session", total);
    if (steps.every(step => step.done)) api.reward({ source: "session", skill: "general", xp: 20, cap: 20, metric: "n.session", amount: 1, label: "Guided session played to the end" });
    draw();
  }

  function onClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.goto) goTo(Number(button.dataset.goto));
    const act = button.dataset.act;
    if (act === "run") running ? pause() : play();
    if (act === "done") done();
    if (act === "skip") goTo(index + 1);
    if (act === "more") {
      const step = steps[index];
      step.left = Math.max(0, step.left) + 60;
      if (step.left > step.minutes * 60) step.minutes = Math.ceil(step.left / 60);
      rang = false;
      draw();
    }
    if (act === "finish") finish();
  }
  function onSubmit(event) {
    if (!event.target.matches("[data-log]")) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    const ok = api.log({
      minutes: Number(values.minutes),
      piece: values.piece,
      notes: values.notes,
      exercises: steps.filter(step => step.done).map(step => step.label).join("; ")
    });
    if (ok) { logged = true; draw(); }
  }
  root.addEventListener("click", onClick);
  root.addEventListener("submit", onSubmit);
  draw();
  return () => {
    if (!finished && total >= 30) api.count("sec.session", total);
    clearInterval(timer);
    release?.();
    unmountHelper();
    root.removeEventListener("click", onClick);
    root.removeEventListener("submit", onSubmit);
  };
}
