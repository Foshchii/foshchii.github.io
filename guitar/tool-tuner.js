// The tuner (#practice/tuner): listens through the microphone and shows how far the string you
// play is from the nearest open-string pitch, E2 A2 D3 G3 B3 E4 (A4 = 440 Hz). Tapping a string
// plays its reference note. Holding each of the six strings in tune earns the day's tune-up.
import { context, pluck } from "./audio.js";
import { listen, midiOf } from "./pitch.js";
import { keepAwake } from "./tool-kit.js";

const open = [{ midi: 40, name: "E", octave: 2 }, { midi: 45, name: "A", octave: 2 }, { midi: 50, name: "D", octave: 3 },
  { midi: 55, name: "G", octave: 3 }, { midi: 59, name: "B", octave: 3 }, { midi: 64, name: "E", octave: 4 }];
const names = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
const inTune = 5;          // cents
const holdFor = 700;       // ms in tune before a string counts as tuned

export function mountTuner(root, api) {
  if (!root) return () => {};
  let stopListening = null, release = null, smooth = null, lastHeard = 0, steadySince = 0, steadyString = -1;
  const tuned = new Set();
  let rewarded = (api.todaySeconds?.("n.tuneup") ?? 0) > 0;

  root.innerHTML = `<div class="tuner" data-state="off">
    <div class="tuner-face">
      <p class="tuner-note"><b data-note>–</b><small data-octave></small></p>
      <div class="tuner-gauge" aria-hidden="true">
        <span class="tuner-zone"></span>
        ${[-50, -25, 0, 25, 50].map(c => `<span class="tuner-tick" style="--at:${(c + 50)}%"><i>${c > 0 ? "+" + c : c}</i></span>`).join("")}
        <span class="tuner-needle" data-needle></span>
      </div>
      <p class="tuner-read" data-read role="status" aria-live="polite">Tap Start, then play one open string.</p>
    </div>
    <div class="actions tuner-main"><button type="button" class="btn" data-act="listen" aria-pressed="false">Start the tuner</button></div>
    <div class="tuner-strings" role="group" aria-label="Open strings. Tap one to hear its reference note.">
      ${open.map((string, i) => `<button type="button" data-string="${i}">
        <b>${string.name}<small>${string.octave}</small></b><span>String ${6 - i}</span><span class="sr-only">: hear its note</span><i class="tuner-ok" aria-hidden="true"></i></button>`).join("")}
    </div>
    <p class="meta" data-count>Hold each string in tune for a moment: tuned strings get a tick.</p>
  </div>`;
  const $ = selector => root.querySelector(selector);
  const box = $(".tuner");

  function nearestString(midi) {
    let best = 0;
    open.forEach((string, i) => { if (Math.abs(midi - string.midi) < Math.abs(midi - open[best].midi)) best = i; });
    return best;
  }

  function show(freq) {
    const now = performance.now();
    if (!freq) {
      if (now - lastHeard > 900) {
        box.classList.remove("hears");
        $("[data-read]").textContent = "Listening. Play one open string and let it ring.";
        steadyString = -1;
      }
      return;
    }
    lastHeard = now;
    const midi = midiOf(freq);
    const index = nearestString(midi);
    const string = open[index];
    const distance = midi - string.midi;            // in semitones
    const near = Math.abs(distance) <= .6;           // close enough to tune with the needle
    const toward = Math.abs(distance) <= 3.5;        // a string far out of tune
    const target = near ? string.midi : Math.round(midi);
    const cents = (midi - target) * 100;
    smooth = smooth === null || Math.abs(cents - smooth) > 60 ? cents : smooth + (cents - smooth) * .3;
    const shown = near ? Math.max(-50, Math.min(50, smooth)) : toward ? (distance < 0 ? -50 : 50) : Math.max(-50, Math.min(50, smooth));
    const heard = names[((Math.round(midi) % 12) + 12) % 12];
    box.classList.add("hears");
    $("[data-note]").textContent = near ? string.name : heard;
    $("[data-octave]").textContent = String(Math.floor((near ? string.midi : Math.round(midi)) / 12) - 1);
    $("[data-needle]").style.setProperty("--at", `${shown + 50}%`);
    const good = near && Math.abs(smooth) <= inTune;
    box.dataset.tune = good ? "in" : near && Math.abs(smooth) <= 20 ? "near" : "off";
    const semitones = Math.abs(distance) < 1.5 ? "about a semitone" : `about ${Math.round(Math.abs(distance))} semitones`;
    $("[data-read]").textContent = near
      ? `String ${6 - index}, ${string.name}${string.octave} · ${good ? "in tune" : `${Math.abs(Math.round(smooth))} cents ${smooth < 0 ? "low: tighten the string a little" : "high: loosen the string a little"}`} · ${freq.toFixed(1)} Hz`
      : toward
      ? `${heard} · ${freq.toFixed(1)} Hz. If this is string ${6 - index} (${string.name}${string.octave}), it is ${semitones} too ${distance < 0 ? "low: tighten it" : "high: loosen it"}.`
      : `${heard} · ${freq.toFixed(1)} Hz · not near an open string`;
    for (const [i, button] of [...root.querySelectorAll("[data-string]")].entries()) button.classList.toggle("is-heard", toward && i === index);
    if (near && good) {
      if (steadyString !== index) { steadyString = index; steadySince = now; }
      else if (now - steadySince > holdFor && !tuned.has(index)) markTuned(index);
    } else steadyString = -1;
  }

  function markTuned(index) {
    tuned.add(index);
    const button = root.querySelector(`[data-string="${index}"]`);
    button?.classList.add("is-tuned");
    button?.querySelector(".sr-only")?.replaceChildren(": in tune; hear its note");
    $("[data-count]").textContent = tuned.size === 6 ? "All six strings are in tune." : `${tuned.size} of 6 strings in tune.`;
    api.announce(`String ${6 - index} is in tune.`);
    if (tuned.size === 6 && !rewarded) {
      rewarded = true;
      api.reward({ source: "tuner", skill: "ear", xp: 10, cap: 10, metric: "n.tuneup", amount: 1, label: "All six strings tuned" });
    }
  }

  async function start() {
    let ctx;
    try { ctx = await context(); } catch (error) { $("[data-read]").textContent = error.message; return; }
    box.dataset.state = "asking";
    $("[data-read]").textContent = "Allow the microphone when your browser asks.";
    try {
      stopListening = await listen(ctx, frame => show(frame.freq));
    } catch (error) {
      box.dataset.state = "off";
      $("[data-read]").textContent = error.name === "NotAllowedError" || error.name === "SecurityError"
        ? "The microphone is blocked for this site. Allow it in the browser’s settings for this website, then try again."
        : error.name === "NotSupportedError" ? error.message : "The microphone did not start. Try again.";
      return;
    }
    release = keepAwake();
    box.dataset.state = "on";
    const button = $('[data-act="listen"]');
    button.textContent = "Stop the tuner";
    button.setAttribute("aria-pressed", "true");
    $("[data-read]").textContent = "Listening. Play one open string and let it ring.";
  }

  function stop() {
    stopListening?.();
    stopListening = null;
    release?.();
    release = null;
    box.dataset.state = "off";
    box.classList.remove("hears");
    const button = $('[data-act="listen"]');
    if (button) { button.textContent = "Start the tuner"; button.setAttribute("aria-pressed", "false"); }
  }

  async function reference(index) {
    try {
      const ctx = await context();
      pluck(ctx, open[index].midi, ctx.currentTime + .03, { volume: .9 });
      if (!stopListening) $("[data-read]").textContent = `Reference: string ${6 - index}, ${open[index].name}${open[index].octave}. Play yours and compare.`;
    } catch (error) {
      $("[data-read]").textContent = error.message;
    }
  }

  function onClick(event) {
    const button = event.target.closest("button");
    if (!button) return;
    if (button.dataset.act === "listen") stopListening ? stop() : start();
    if (button.dataset.string) reference(Number(button.dataset.string));
  }
  const onHide = () => { if (document.visibilityState === "hidden") stop(); };
  root.addEventListener("click", onClick);
  document.addEventListener("visibilitychange", onHide);
  return () => {
    stop();
    root.removeEventListener("click", onClick);
    document.removeEventListener("visibilitychange", onHide);
  };
}

// The six open strings as buttons that play their reference notes, for a guided session's setup step.
export function mountStringButtons(root) {
  if (!root) return () => {};
  root.innerHTML = `<div class="tuner-strings tuner-strings--small" role="group" aria-label="Open strings. Tap one to hear it.">${open.map((string, i) =>
    `<button type="button" data-string="${i}"><b>${string.name}<small>${string.octave}</small></b><span><span class="sr-only">string </span>${6 - i}</span></button>`).join("")}</div>`;
  const onClick = async event => {
    const button = event.target.closest("[data-string]");
    if (!button) return;
    try {
      const ctx = await context();
      pluck(ctx, open[Number(button.dataset.string)].midi, ctx.currentTime + .03, { volume: .9 });
    } catch { /* no sound in this browser */ }
  };
  root.addEventListener("click", onClick);
  return () => root.removeEventListener("click", onClick);
}
