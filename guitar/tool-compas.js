// The compás trainer (#practice/compas): flamenco rhythm cycles as a clock face, with palmas
// (accented claps loud, the others muffled), a click, and a strum pattern for the rumba. "Tap the
// accents" listens to one cycle, then grades four cycles of your taps for timing.
import { clap, click, context, pulse } from "./audio.js";
import { claps, compasSvg, isAccent, paloIndex, palos } from "./chords.js";
import { escapeHtml, keepAwake, toolSettings } from "./tool-kit.js";

const tapCycles = 4;

export function mountCompas(root, api) {
  if (!root) return () => {};
  const saved = toolSettings("compas", { palo: "rumba", tempos: {}, palmas: true, beat: true });
  const s = saved.value;
  if (!paloIndex.has(s.palo)) s.palo = "rumba";
  let run = null;   // { pulse, ctx, cycles, release, game }

  const palo = () => paloIndex.get(s.palo);
  const tempo = () => Math.max(palo().tempo[0], Math.min(palo().tempo[2], s.tempos[s.palo] ?? palo().tempo[1]));

  function draw() {
    const p = palo();
    const best = api.best?.("compas." + p.id) ?? 0;
    root.innerHTML = `<div class="compas" data-running="${Boolean(run)}">
      <div class="segment compas-palos" role="group" aria-label="Palo">${palos.map(item => `<button type="button" data-palo="${item.id}" aria-pressed="${item.id === p.id}">${escapeHtml(item.name)}</button>`).join("")}</div>
      <div class="compas-stage">
        <div class="compas-face" data-face>${compasSvg(p)}</div>
        <div class="compas-side">
          <p>${escapeHtml(p.about)}</p>
          ${p.strokes ? `<ol class="compas-strokes" aria-label="Strum pattern">${p.strokes.map((stroke, i) => `<li data-stroke="${i}"${isAccent(p, i) ? ' class="is-accent"' : ""}><b>${stroke || "·"}</b><small>${escapeHtml(p.counts[i])}</small></li>`).join("")}</ol>` : ""}
          <div class="compas-tempo">
            <button type="button" class="metro-step" data-act="slower" aria-label="Slower">−</button>
            <p class="metro-readout"><output class="metro-bpm" data-bpm>${tempo()}</output><span class="metro-unit">bpm</span></p>
            <button type="button" class="metro-step" data-act="faster" aria-label="Faster">+</button>
          </div>
          <input class="metro-slider" type="range" min="${p.tempo[0]}" max="${p.tempo[2]}" value="${tempo()}" aria-label="Tempo" data-tempo>
          <div class="compas-voices">
            <label class="check-row"><input class="check" type="checkbox" data-voice="palmas"${s.palmas ? " checked" : ""}><span>Palmas</span></label>
            <label class="check-row"><input class="check" type="checkbox" data-voice="beat"${s.beat ? " checked" : ""}><span>Click on the beat</span></label>
          </div>
        </div>
      </div>
      <div class="actions"><button type="button" class="btn" data-act="toggle" aria-pressed="${Boolean(run && !run.game)}">${run && !run.game ? "Stop" : "Play the cycle"}</button>
        <button type="button" class="btn btn--ghost" data-act="game">${run?.game ? "Stop the round" : "Tap the accents"}</button>
        <span class="meta" data-cycles>${run ? `${run.cycles} ${run.cycles === 1 ? "cycle" : "cycles"}` : ""}</span></div>
      <button type="button" class="compas-pad" data-act="pad"${run?.game ? "" : " hidden"}><b data-pad-text>Listen to one cycle…</b><span>Tap here, or press any key, on every accent</span></button>
      <p class="compas-result" data-result role="status">${best ? `Your best tap round in ${escapeHtml(p.name)}: ${best}%.` : ""}</p>
    </div>`;
  }

  function light(step) {
    for (const node of root.querySelectorAll(".compas-step.is-now, .compas-strokes .is-now")) node.classList.remove("is-now");
    root.querySelector(`.compas-step[data-step="${step}"]`)?.classList.add("is-now");
    root.querySelector(`[data-stroke="${step}"]`)?.classList.add("is-now");
  }

  async function start(game = false) {
    stop();
    let ctx;
    try { ctx = await context(); } catch (error) { api.announce(error.message); return; }
    const p = palo(), steps = p.counts.length;
    run = { ctx, cycles: 0, release: keepAwake(), game: game ? { expected: [], taps: [], start: 0, end: 0 } : null };
    draw();
    run.pulse = pulse(ctx, {
      interval: () => 60 / tempo() / p.perBeat,
      tick: (at, n) => {
        const step = n % steps;
        const accent = isAccent(p, step);
        if (s.palmas && claps(p, step)) clap(ctx, at, { accent });
        if (s.beat && step % p.perBeat === 0) click(ctx, at, accent ? "accent" : "beat", "wood", { volume: s.palmas ? .55 : 1 });
        if (run?.game) {
          const cycle = Math.floor(n / steps);
          if (cycle >= 1 && cycle <= tapCycles && accent) run.game.expected.push(at);
          if (n === steps) run.game.start = at - .3;
          if (n === steps * (tapCycles + 1)) { run.game.end = at; run.pulse.at(at + .35, finishGame); }
        }
        run?.pulse?.at(at, () => {
          light(step);
          if (step === 0 && run) {
            if (n > 0) countCycle();
            if (run.game) {
              const cycle = Math.floor(n / steps);
              const text = root.querySelector("[data-pad-text]");
              if (text) text.textContent = cycle === 0 ? "Listen to one cycle…" : cycle <= tapCycles ? `Tap the accents · cycle ${cycle} of ${tapCycles}` : "Finished";
            }
          }
        });
      }
    });
    if (game) root.querySelector('[data-act="pad"]')?.focus({ preventScroll: true });
  }

  function countCycle() {
    run.cycles++;
    const line = root.querySelector("[data-cycles]");
    if (line) line.textContent = `${run.cycles} ${run.cycles === 1 ? "cycle" : "cycles"}`;
    api.reward({ source: "compas", skill: "rhythm", xp: run.cycles % 2 ? 0 : 1, cap: 20, metric: "n.cycles", amount: 1, quiet: true });
  }

  function tap(event) {
    if (!run?.game) return;
    const ctx = run.ctx;
    const late = event?.timeStamp ? Math.max(0, (performance.now() - event.timeStamp) / 1000) : 0;
    run.game.taps.push(ctx.currentTime - late);
    const pad = root.querySelector('[data-act="pad"]');
    pad?.classList.remove("is-hit");
    void pad?.offsetWidth;
    pad?.classList.add("is-hit");
  }

  // Each accent scores 1 when a tap is within 40 ms of it, falling to 0 at 150 ms. A steady delay
  // of up to 0.2 s (headphones, a slow screen) is taken away first; extra taps cost a quarter each.
  function grade({ expected, taps, start, end }, outputLatency) {
    const inRound = taps.filter(t => t >= start && t <= end + .2).map(t => t - outputLatency);
    const nearest = t => expected.reduce((best, e) => Math.abs(t - e) < Math.abs(t - best) ? e : best, Infinity);
    const offsets = inRound.map(t => t - nearest(t)).filter(o => Math.abs(o) < .25).sort((a, b) => a - b);
    const steady = offsets.length ? Math.max(-.05, Math.min(.2, offsets[Math.floor(offsets.length / 2)])) : 0;
    const used = new Set();
    let total = 0, hits = 0;
    for (const e of expected) {
      let best = -1, error = Infinity;
      inRound.forEach((t, i) => {
        const off = Math.abs(t - steady - e);
        if (!used.has(i) && off < error) { error = off; best = i; }
      });
      if (best >= 0 && error <= .15) {
        used.add(best);
        hits++;
        total += error <= .04 ? 1 : 1 - (error - .04) / .11;
      }
    }
    const extra = inRound.length - used.size;
    const percent = expected.length ? Math.max(0, Math.round(100 * (total - extra * .25) / expected.length)) : 0;
    return { percent, hits, accents: expected.length, extra, steady };
  }

  function finishGame() {
    if (!run?.game) return;
    const result = grade(run.game, run.ctx.outputLatency || 0);
    const p = palo();
    const before = api.best?.("compas." + p.id) ?? 0;
    const isBest = result.percent > 0 && api.record?.("compas." + p.id, result.percent);
    stop();
    draw();
    const xp = Math.round(result.percent / 10) + (result.percent >= 90 ? 10 : 0);
    if (result.hits) api.reward({ source: "taps", skill: "rhythm", xp, cap: 60, metric: "n.taprounds", amount: 1, label: `${p.name}: ${result.percent}% in time` });
    const late = Math.round(result.steady * 1000);
    root.querySelector("[data-result]").textContent = `${result.percent}% in time: ${result.hits} of ${result.accents} accents${result.extra ? `, ${result.extra} extra ${result.extra === 1 ? "tap" : "taps"}` : ""}.` +
      (Math.abs(late) >= 15 ? ` You tapped about ${Math.abs(late)} ms ${late > 0 ? "late" : "early"} all the way through; that steady delay is not counted.` : "") +
      (isBest ? (before ? ` A new best for ${p.name}.` : "") : before ? ` Your best is ${before}%.` : "");
  }

  function stop() {
    if (!run) return;
    run.pulse?.stop();
    run.release();
    run = null;
    light(-1);
  }

  function setTempo(value) {
    s.tempos[s.palo] = Math.max(palo().tempo[0], Math.min(palo().tempo[2], Math.round(value)));
    saved.save();
    const out = root.querySelector("[data-bpm]");
    if (out) out.textContent = tempo();
    const slider = root.querySelector("[data-tempo]");
    if (slider) slider.value = tempo();
  }

  function onClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.palo && button.dataset.palo !== s.palo) {
      stop();
      s.palo = button.dataset.palo;
      saved.save();
      draw();
      root.querySelector(`[data-palo="${s.palo}"]`)?.focus({ preventScroll: true });
    }
    const act = button.dataset.act;
    if (act === "toggle") { if (run && !run.game) { stop(); draw(); } else start(); }
    if (act === "game") { if (run?.game) { stop(); draw(); } else start(true); }
    if (act === "slower") setTempo(tempo() - (palo().tempo[2] > 160 ? 4 : 2));
    if (act === "faster") setTempo(tempo() + (palo().tempo[2] > 160 ? 4 : 2));
  }
  function onDown(event) {
    if (event.target.closest('[data-act="pad"]')) { event.preventDefault(); tap(event); }
  }
  function onInput(event) {
    if (event.target.matches("[data-tempo]")) setTempo(Number(event.target.value));
    if (event.target.dataset.voice) { s[event.target.dataset.voice] = event.target.checked; saved.save(); }
  }
  function onKey(event) {
    if (!run?.game || event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.key === "Tab" || event.key === "Escape") return;
    if (event.target.closest?.("input, select, textarea")) return;
    event.preventDefault();
    tap(event);
  }
  root.addEventListener("click", onClick);
  root.addEventListener("pointerdown", onDown);
  root.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);
  draw();
  return () => {
    stop();
    root.removeEventListener("click", onClick);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("input", onInput);
    document.removeEventListener("keydown", onKey);
  };
}
