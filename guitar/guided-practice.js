import { fretPositions, newQuestion, openStrings, score, soundingMidi } from "./reading.js";

const pitchName = pitch => pitch.replace("#", "♯").replace("b", "♭").replace(/\d$/, "");
const beatsLabel = beats => beats === 1 ? "1 beat" : `${beats} beats`;
const fretLabel = ({ string, fret }) => `String ${string} · ${fret ? `fret ${fret}` : "open"}`;
const noteName = (name, pitch) => `${name}${pitch.endsWith("5") && name === "E" ? " (high)" : ""}`;
let audio;

function notation(bars, beatsPerBar = 4) {
  let offset = 0;
  let output = "";
  for (let row = 0; row < bars.length; row += 2) {
    const pair = bars.slice(row, row + 2);
    const counts = pair.map(bar => bar.map(([pitch, beats, bass]) =>
      pitch ? `${pitchName(pitch)}${bass ? ` with bass ${pitchName(bass)}` : ""}, ${beatsLabel(beats)}` : `rest, ${beatsLabel(beats)}`).join("; ")).join(". ");
    const label = `Bar ${row + 1}${pair.length === 2 ? ` and ${row + 2}` : ""}. ${counts}.`;
    output += score(pair.map(bar => bar.map(([pitch, beats, bass]) => ({ pitch, beats, bass }))), {
      label, beatsPerBar, eventOffset: offset, timeSignature: row === 0, final: row + 2 >= bars.length,
    });
    offset += pair.flat().length;
  }
  return output;
}

function board(strings, frets, { interactive = false, tune = false } = {}) {
  const columns = Array.from({ length: frets + 1 }, (_, fret) => fret);
  return `<div class="guided-board" role="group" aria-label="${interactive ? "Choose a string and fret" : "Fretboard guide"}" style="--fret-columns:${columns.length}">
    <span></span>${columns.map(fret => `<span class="guided-board-heading">${fret || "Open"}</span>`).join("")}
    ${strings.map(string => `<span class="guided-string" title="${string === 1 ? "Thinnest string" : string === 6 ? "Thickest string" : `String ${string}`}">String ${string}</span>${columns.map(fret => {
      const key = `${string}/${fret}`;
      const label = fretLabel({ string, fret });
      const cell = `data-guided-fret="${key}"`;
      const openName = ["E", "B", "G", "D", "A", "E"][string - 1];
      return interactive ? `<button type="button" ${cell} data-guided-action="fret" aria-label="${label}${tune ? ` · ${openName}` : ""}">${tune ? openName : fret === 0 ? "◯" : fret}</button>`
        : `<span ${cell} aria-label="${label}">${fret === 0 ? "◯" : fret}</span>`;
    }).join("")}`).join("")}
  </div>`;
}

function playPositions(bars) {
  const places = bars.flatMap(bar => bar.flatMap(([pitch, , bass]) =>
    [pitch, bass].filter(Boolean).map(name => fretPositions(name)[0])));
  return {
    strings: [...new Set(places.map(item => item.string))].sort((a, b) => a - b),
    frets: Math.max(3, ...places.map(item => item.fret)),
  };
}

function countSlots(step) {
  return Array.from({ length: 4 * step.division }, (_, index) =>
    index % step.division ? `& after ${Math.floor(index / step.division) + 1}` : String(index / step.division + 1));
}

/* What happens on each count of a rhythm step: a new note starts, a note is still ringing, or a rest. */
function rhythmStory(step) {
  const story = [];
  let beat = 0;
  step.bar.forEach(([pitch, beats], event) => {
    const start = Math.round(beat * step.division), span = Math.round(beats * step.division);
    for (let k = 0; k < span; k++) story[start + k] = { kind: !pitch ? "rest" : k === 0 ? "start" : "held", pitch, from: start, span, event };
    beat += beats;
  });
  return story;
}
const slotName = (slot, division) => division === 1 ? `count ${slot + 1}` : slot % division ? `the “and” after ${Math.floor(slot / division) + 1}` : `count ${slot / division + 1}`;
const listWords = items => items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
/* "counts 1, 2 and 3", "count 1 and the “and” after 2" */
function slotsText(slots, division) {
  const counts = slots.filter(slot => slot % division === 0).map(slot => String(slot / division + 1));
  const ands = slots.filter(slot => slot % division).map(slot => String(Math.floor(slot / division) + 1));
  const parts = [];
  if (counts.length) parts.push(`${counts.length > 1 ? "counts" : "count"} ${listWords(counts)}`);
  if (ands.length) parts.push(`the “and” after ${listWords(ands)}`);
  return listWords(parts);
}

export function rhythmAttacks(bar, division) {
  let beat = 0;
  return bar.flatMap(([pitch, beats]) => {
    const slot = beat * division;
    beat += beats;
    return pitch ? [slot] : [];
  });
}

function stepBody(step, current, tempo, showHints) {
  if (step.type === "check") {
    return `<button type="button" class="btn secondary" data-guided-action="confirm">${step.confirm}</button>`;
  }
  if (step.type === "tune") {
    return board([6, 5, 4, 3, 2, 1], 0, { interactive: true, tune: true }) +
      '<button type="button" class="btn secondary" data-guided-action="confirm">I checked my tuning</button>';
  }
  if (step.type === "find") {
    const target = step.targets[current];
    const picture = score([[{ pitch: target, beats: 1 }]], { meter: false, label: `Written ${pitchName(target)} in guitar notation` });
    return `<p class="meta">Note ${current + 1} of ${step.targets.length} · String 1 is the thinnest</p>
      <div class="guided-single-note">${picture}</div>${board(step.strings, step.frets, { interactive: true })}
      <div class="actions"><button type="button" class="btn secondary" data-guided-action="hint">Show a hint</button>
      <button type="button" class="btn" data-guided-action="next-note" disabled>${current + 1 === step.targets.length ? "Finish note check" : "Next note"}</button></div>`;
  }
  if (step.type === "rhythm") {
    const slots = countSlots(step);
    const story = rhythmStory(step);
    const notes = story.filter((slot, i) => slot.from === i);
    return `${notation([step.bar])}
      <div class="guided-rhythm" style="--slots:${slots.length}">
        <p class="guided-rhythm-label">Tap the counts where you pluck a new note</p>
        <div class="guided-timeline" data-guided-timeline hidden>${notes.map(slot => `<span class="guided-block${slot.kind === "rest" ? " rest" : ""}" style="grid-column:${slot.from + 1} / span ${slot.span}" data-block="${slot.event}"><b>${slot.kind === "rest" ? "rest" : pitchName(slot.pitch)}</b>${slot.kind !== "rest" && slot.span > 1 ? "<small>still ringing →</small>" : ""}</span>`).join("")}</div>
        <div class="guided-beats" role="group" aria-label="Counts. Tap the ones where you pluck a new note.">
          ${slots.map((label, index) => `<button type="button" aria-label="${label}" aria-pressed="false" data-guided-action="beat" data-guided-beat="${index}"><b>${label.includes("&") ? "&amp;" : label}</b><small>pluck</small></button>`).join("")}
        </div>
      </div>
      <div class="actions"><button type="button" class="btn" data-guided-action="check-rhythm">Check</button><button type="button" class="btn secondary" data-guided-action="hear-rhythm">Hear it</button><button type="button" class="btn secondary" data-guided-action="show-rhythm">Show me</button><button type="button" class="btn secondary" data-guided-action="stop" disabled>Stop</button></div>
      <p class="guided-count" aria-hidden="true" data-guided-count>Hear it gives four clicks, then plays the bar while the counts light up.</p>`;
  }
  const location = playPositions(step.bars);
  return `${notation(step.bars, step.beatsPerBar)}
    <div class="guided-transport">
      <label>Tempo <select data-guided-tempo>${[36, 42, 48, 54, 60, 72].map(bpm => `<option value="${bpm}"${tempo === bpm ? " selected" : ""}>${bpm} bpm</option>`).join("")}</select></label>
      <button type="button" class="btn" data-guided-action="play">Listen and play along</button>
      <button type="button" class="btn secondary" data-guided-action="count">Count only</button>
      <button type="button" class="btn secondary" data-guided-action="stop" disabled>Stop</button>
    </div>
    <label class="guided-hints"><input type="checkbox" data-guided-hints${showHints ? " checked" : ""}>Show string and fret hints</label>
    <div data-guided-map${showHints ? "" : " hidden"}>${board(location.strings, location.frets)}</div>
    <p class="guided-count" aria-hidden="true" data-guided-count>${step.beatsPerBar ?? 4}-beat count-in · ${tempo} bpm</p>
    <button type="button" class="btn secondary" data-guided-action="confirm">I played the phrase on my guitar</button>
    ${step.fresh ? '<button type="button" class="btn secondary" data-guided-action="new-score">Generate another score</button>' : ""}
    ${step.source ? `<p class="meta">${step.source}</p>` : ""}`;
}

async function getAudio() {
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context) throw new Error("Audio unavailable");
  audio ??= new Context();
  if (audio.state !== "running") await audio.resume();
  return audio;
}

function freshScore(step) {
  const { bars } = newQuestion("melody", step.fresh, undefined, step.bars.length);
  return { ...step, bars: bars.map(bar => bar.map(({ pitch, beats }) => [pitch, beats])) };
}

export function mountGuidedPractice(root, lesson, { optional = false, markComplete } = {}) {
  if (!root || !lesson?.length) return () => {};
  const steps = lesson.map(step => step.fresh ? freshScore(step) : step);

  let index = 0;
  let noteIndex = 0;
  let noteCorrect = false;
  let tempo = 48;
  let showHints = steps[0].showHints ?? true;
  let run = 0;
  const completed = new Set();
  const timers = new Set();
  const sounds = new Set();
  const selected = new Set();
  const status = () => root.querySelector("[data-guided-feedback]");

  function feedback(text, good = false) {
    const element = status();
    element.textContent = text;
    element.dataset.correct = String(good);
  }

  function stop() {
    run++;
    for (const id of timers) clearTimeout(id);
    timers.clear();
    for (const node of sounds) node.stop();
    sounds.clear();
    root.querySelectorAll("[data-sounding]").forEach(cell => cell.removeAttribute("data-sounding"));
    root.querySelectorAll("[data-now]").forEach(cell => cell.removeAttribute("data-now"));
    const stopButton = root.querySelector('[data-guided-action="stop"]');
    if (stopButton) stopButton.disabled = true;
  }

  function tone(context, midi, start, length, click = false, quieter = false) {
    const oscillator = context.createOscillator();
    const amp = context.createGain();
    oscillator.type = click ? "sine" : "triangle";
    oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(click ? .055 : quieter ? .075 : .12, start + .008);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    oscillator.connect(amp).connect(context.destination);
    sounds.add(oscillator);
    oscillator.onended = () => {
      sounds.delete(oscillator);
      oscillator.disconnect();
      amp.disconnect();
    };
    oscillator.start(start);
    oscillator.stop(start + length);
  }

  async function preview(midi) {
    const active = run;
    try {
      const context = await getAudio();
      if (active === run) tone(context, midi, context.currentTime + .015, .75);
    } catch {
      if (active === run) feedback("Audio is unavailable in this browser. You can continue with the notation and fretboard.");
    }
  }

  function schedule(context, at, callback) {
    const id = setTimeout(() => {
      timers.delete(id);
      callback();
    }, Math.max(0, (at - context.currentTime) * 1000));
    timers.add(id);
  }

  async function playback(bars, beatsPerBar, notesOn, ringing = false, counts = 0) {
    stop();
    const active = run;
    try {
      const context = await getAudio();
      if (active !== run) return;
      const sec = 60 / tempo;
      const start = context.currentTime + .09;
      const countIn = beatsPerBar;
      const totalBeats = countIn + bars.length * beatsPerBar;
      const counter = root.querySelector("[data-guided-count]");
      const stopButton = root.querySelector('[data-guided-action="stop"]');
      if (stopButton) stopButton.disabled = false;
      for (let beat = 0; beat < totalBeats; beat++) {
        const time = start + beat * sec;
        const count = beat % beatsPerBar + 1;
        tone(context, count === 1 ? 83 : 76, time, .095, true);
        if (counter) schedule(context, time, () => {
          counter.textContent = beat < countIn ? `Count in · ${count}` : counts ? `Count ${count}` : `Bar ${Math.floor((beat - countIn) / beatsPerBar) + 1} · Beat ${count}`;
        });
      }
      /* A rhythm step lights each count (and each “and”) as it passes. */
      if (counts) for (let slot = 0; slot < beatsPerBar * counts; slot++) {
        schedule(context, start + (countIn + slot / counts) * sec, () => {
          root.querySelectorAll(".guided-beats [data-now]").forEach(cell => cell.removeAttribute("data-now"));
          root.querySelector(`[data-guided-beat="${slot}"]`)?.setAttribute("data-now", "");
        });
      }
      let elapsed = countIn;
      let note = 0;
      for (const bar of bars) {
        for (const [pitch, duration, bass] of bar) {
          const at = start + elapsed * sec;
          const currentNote = note++;
          const pitches = [pitch, bass].filter(Boolean);
          const sustain = ringing ? Math.min(2.5, totalBeats - elapsed) : duration * .95;
          if (notesOn) for (const name of pitches) tone(context, soundingMidi(name), at, sustain * sec, false, name === bass);
          schedule(context, at, () => {
            root.querySelectorAll("[data-sounding]").forEach(cell => cell.removeAttribute("data-sounding"));
            root.querySelector(`[data-score-event="${currentNote}"]`)?.setAttribute("data-sounding", "");
            root.querySelector(`[data-block="${currentNote}"]`)?.setAttribute("data-sounding", "");
            for (const name of pitches) {
              const place = fretPositions(name)[0];
              if (place) root.querySelector(`[data-guided-fret="${place.string}/${place.fret}"]`)?.setAttribute("data-sounding", "");
            }
          });
          elapsed += duration;
        }
      }
      schedule(context, start + totalBeats * sec, () => {
        stop();
        if (counter) counter.textContent = counts ? "Now tap the counts where a note started, then Check." : `Finished · ${tempo} bpm`;
      });
    } catch {
      if (active === run) feedback("Audio is unavailable in this browser. Follow the score and count the beats aloud.");
    }
  }

  function draw() {
    const step = steps[index];
    root.innerHTML = `<div class="flow guided-practice">
      <div class="guided-header"><h2>${optional ? "Optional guided review" : "Guided practice"}</h2><span class="meta">${completed.size} of ${steps.length} steps checked</span></div>
      <nav class="guided-step-nav" aria-label="Practice steps">${steps.map((item, i) => `<button type="button" data-guided-action="step" data-step="${i}"${i === index ? ' aria-current="step"' : ""} aria-label="Step ${i + 1}. ${item.title}${completed.has(i) ? ", checked" : ""}">${i + 1}${completed.has(i) ? ' <span aria-hidden="true">✓</span>' : ""}</button>`).join("")}</nav>
      <div class="flow guided-exercise">
        <h3 tabindex="-1">${step.title}</h3><p>${step.instruction}</p>
        ${stepBody(step, noteIndex, tempo, showHints)}
        <p class="guided-feedback" role="status" data-guided-feedback>${completed.has(index) ? "Step checked. You can practise it again." : ""}</p>
      </div>
      <div class="actions guided-actions">
        ${index > 0 ? '<button type="button" class="btn secondary" data-guided-action="previous">Previous step</button>' : ""}
        ${index + 1 < steps.length ? '<button type="button" class="btn" data-guided-action="next">Next step</button>' : ""}
        ${index + 1 === steps.length && markComplete ? '<button type="button" class="btn" data-guided-action="finish">Mark day complete</button>' : ""}
      </div>
    </div>`;
  }

  function goTo(step) {
    stop();
    index = step;
    noteIndex = 0;
    noteCorrect = false;
    showHints = steps[index].showHints ?? true;
    selected.clear();
    draw();
    root.querySelector(".guided-exercise h3")?.focus();
  }

  function complete(message) {
    completed.add(index);
    root.querySelector(".guided-header .meta").textContent = `${completed.size} of ${steps.length} steps checked`;
    const tab = root.querySelector('[aria-current="step"]');
    tab.setAttribute("aria-label", `Step ${index + 1}. ${steps[index].title}, checked`);
    tab.innerHTML = `${index + 1} <span aria-hidden="true">✓</span>`;
    feedback(message, true);
  }

  function checkFret(button, step) {
    if (noteCorrect && step.type === "find") return;
    const [string, fret] = button.dataset.guidedFret.split("/").map(Number);
    preview(openStrings[string - 1] + fret);
    root.querySelectorAll("[data-picked]").forEach(cell => cell.removeAttribute("data-picked"));
    if (step.type === "tune") {
      button.dataset.picked = "true";
      feedback(`Reference tone for string ${string}. Now play yours and compare.`);
      return;
    }
    const pitch = step.targets[noteIndex];
    const correct = fretPositions(pitch, step.frets).some(place => place.string === string && place.fret === fret);
    button.dataset.picked = String(correct);
    if (correct) {
      noteCorrect = true;
      feedback(`Correct. ${noteName(pitchName(pitch), pitch)} is ${fretLabel({ string, fret }).toLowerCase()}. Now play that note on your guitar.`, true);
      root.querySelector('[data-guided-action="next-note"]').disabled = false;
    } else {
      feedback(`Try again. You chose ${fretLabel({ string, fret }).toLowerCase()}. Check the note on the staff or use the hint.`);
    }
  }

  function click(event) {
    const button = event.target.closest("[data-guided-action]");
    if (!button) return;
    const step = steps[index];
    switch (button.dataset.guidedAction) {
      case "step": goTo(Number(button.dataset.step)); break;
      case "previous": goTo(index - 1); break;
      case "next": goTo(index + 1); break;
      case "finish": markComplete(); feedback("Day marked complete."); break;
      case "confirm": complete("Step checked."); break;
      case "fret": checkFret(button, step); break;
      case "hint": {
        const pitch = step.targets[noteIndex];
        const places = fretPositions(pitch, step.frets).filter(place => step.strings.includes(place.string));
        feedback(`${pitchName(pitch)} · ${places.map(fretLabel).join(" or ")}. Select that position to continue.`);
        for (const place of places) root.querySelector(`[data-guided-fret="${place.string}/${place.fret}"]`)?.setAttribute("data-hint", "");
        break;
      }
      case "next-note":
        if (noteIndex + 1 === step.targets.length) {
          complete("Note check complete. Play any notes you hesitated on one more time.");
          button.disabled = true;
          root.querySelector('[data-guided-action="next"], [data-guided-action="finish"]')?.focus();
        } else {
          noteIndex++;
          noteCorrect = false;
          stop();
          draw();
          root.querySelector(".guided-exercise h3")?.focus({ preventScroll: true });
        }
        break;
      case "beat": {
        const beat = Number(button.dataset.guidedBeat);
        if (selected.has(beat)) selected.delete(beat);
        else selected.add(beat);
        button.setAttribute("aria-pressed", String(selected.has(beat)));
        root.querySelectorAll(".guided-beats [data-result]").forEach(cell => cell.removeAttribute("data-result"));
        feedback("");
        break;
      }
      case "check-rhythm": {
        const answer = rhythmAttacks(step.bar, step.division);
        const story = rhythmStory(step);
        const name = slot => slotName(slot, step.division);
        const correct = answer.length === selected.size && answer.every(beat => selected.has(beat));
        story.forEach((slot, i) => {
          const cell = root.querySelector(`[data-guided-beat="${i}"]`);
          if (!cell) return;
          const picked = selected.has(i);
          if (picked && slot.kind === "start") cell.dataset.result = "right";
          else if (picked) cell.dataset.result = "wrong";
          else if (slot.kind === "start") cell.dataset.result = "missed";
        });
        const quiet = story.map((slot, i) => slot.kind === "held" ? `on ${name(i)} the note from ${name(slot.from)} is still ringing` : slot.kind === "rest" ? `${name(i)} is a rest` : null).filter(Boolean);
        if (correct) {
          complete(`Right: you pluck on ${slotsText(answer, step.division)}${quiet.length ? `. ${quiet[0][0].toUpperCase() + quiet[0].slice(1)}${quiet.length > 1 ? `, and ${listWords(quiet.slice(1))}` : ""}` : ""}. Clap the rhythm once while you count aloud.`);
        } else {
          const missed = answer.filter(beat => !selected.has(beat));
          const extra = [...selected].filter(beat => !answer.includes(beat)).sort((a, b) => a - b);
          const parts = [];
          if (missed.length) parts.push(`A new note starts on ${slotsText(missed, step.division)}.`);
          extra.forEach(i => parts.push(story[i].kind === "held" ? `On ${name(i)} the note from ${name(story[i].from)} is still ringing, so you don’t pluck.` : `${name(i)[0].toUpperCase() + name(i).slice(1)} is a rest: stay silent.`));
          root.querySelector("[data-guided-timeline]")?.removeAttribute("hidden");
          feedback(`Not yet. ${parts.join(" ")} The blocks above the counts show how long each note lasts.`);
        }
        break;
      }
      case "show-rhythm": {
        root.querySelector("[data-guided-timeline]")?.removeAttribute("hidden");
        feedback("Each block is one note. It starts where you pluck and stretches over the counts it lasts. Tap the counts where a block starts.");
        break;
      }
      case "hear-rhythm": playback([step.bar], 4, true, false, step.division); break;
      case "play": playback(step.bars, step.beatsPerBar ?? 4, true, step.ringing); break;
      case "count": playback(step.bars, step.beatsPerBar ?? 4, false); break;
      case "new-score":
        steps[index] = freshScore(step);
        completed.delete(index);
        goTo(index);
        break;
      case "stop":
        stop();
        root.querySelector("[data-guided-count]").textContent = "Playback stopped";
        root.querySelector('[data-guided-action="play"], [data-guided-action="hear-rhythm"]').focus();
        break;
    }
  }

  function change(event) {
    if ("guidedTempo" in event.target.dataset) {
      stop();
      tempo = Number(event.target.value);
      root.querySelector("[data-guided-count]").textContent = `Ready · ${tempo} bpm`;
    } else if ("guidedHints" in event.target.dataset) {
      showHints = event.target.checked;
      root.querySelector("[data-guided-map]").hidden = !showHints;
    }
  }

  root.addEventListener("click", click);
  root.addEventListener("change", change);
  draw();
  return () => {
    stop();
    root.removeEventListener("click", click);
    root.removeEventListener("change", change);
  };
}
