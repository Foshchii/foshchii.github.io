import { symbols } from "./notation-symbols.js";

const notes = {
  E3: [-7, 52], F3: [-6, 53], G3: [-5, 55], A3: [-4, 57], B3: [-3, 59],
  C4: [-2, 60], D4: [-1, 62], E4: [0, 64], F4: [1, 65], G4: [2, 67],
  A4: [3, 69], B4: [4, 71], C5: [5, 72], D5: [6, 74], E5: [7, 76],
  F5: [8, 77], G5: [9, 79]
};
const accidentals = { "C#4": [-2, 61, "♯"], Db4: [-1, 61, "♭"] };
const pitchData = pitch => notes[pitch] ?? accidentals[pitch];
export const soundingMidi = pitch => pitchData(pitch)[1] - 12;
export const openStrings = [64, 59, 55, 50, 45, 40];

export function fretPositions(pitch, frets = 4) {
  const midi = soundingMidi(pitch);
  return openStrings.flatMap((open, index) => {
    const fret = midi - open;
    return fret >= 0 && fret <= frets ? [{ string: index + 1, fret }] : [];
  });
}
const groups = {
  open: ["G4", "B4", "E5"],
  treble: ["G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"],
  bass: ["E3", "F3", "G3", "A3", "B3", "C4", "D4", "E4", "F4"]
};
const names = { notes: "Note names", frets: "String and fret", rhythm: "Rhythm", melody: "Sight-reading", keys: "Key signatures", voices: "Two voices" };
export const readingModes = Object.keys(names).map(id => ({ id, label: names[id] }));
export const readingLevels = [{ id: "open", label: "Three open strings" }, { id: "treble", label: "First-position treble" }, { id: "bass", label: "First-position bass" }];

const pick = array => array[Math.floor(Math.random() * array.length)];
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const staffY = step => 77 - step * 5;
function glyph(name, x, top, height) {
  const [path, [xmin, ymin, , ymax]] = symbols[name];
  const scale = height / (ymax - ymin);
  return `<path d="${path}" transform="translate(${x - xmin * scale} ${top + ymax * scale}) scale(${scale} ${-scale})" fill="currentColor"/>`;
}

function note(pitch, beats, x, voice) {
  const [step, , accidental] = pitchData(pitch);
  const y = staffY(step);
  const up = voice ? voice === "high" : step < 4;
  let ledger = "";
  for (let line = -6; line <= 10; line += 2) {
    if ((line < 0 && step <= line) || (line > 8 && step >= line)) {
      ledger += `<path d="M${x - 9} ${staffY(line)}h18" stroke="currentColor" stroke-width="1"/>`;
    }
  }
  const xStem = x + (up ? 5 : -5);
  const yTip = y + (up ? -28 : 28);
  const stem = beats === 4 ? "" : `<path d="M${xStem} ${y}V${yTip}" stroke="currentColor" stroke-width="1.25"/>`;
  const flag = beats === 0.5
    ? `<path d="M${xStem} ${yTip}q10 ${up ? 9 : -9} 7 ${up ? 18 : -18}q-1 ${up ? -8 : 8} -7 ${up ? -10 : 10}z" fill="currentColor"/>` : "";
  const mark = accidental ? `<text x="${x - 19}" y="${y + 6}" fill="currentColor" font-size="20">${accidental}</text>` : "";
  const dot = beats === 1.5 ? `<circle cx="${x + 9}" cy="${y - (step % 2 === 0 ? 4 : 0)}" r="1.5" fill="currentColor"/>` : "";
  return ledger + mark + `<ellipse cx="${x}" cy="${y}" rx="${beats === 4 ? 7.4 : 5.7}" ry="3.5" transform="rotate(-19 ${x} ${y})" fill="${beats >= 2 ? "#fffdf9" : "currentColor"}" stroke="currentColor" stroke-width="1.35"/>` + stem + flag + dot;
}

export function score(bars, { meter = true, timeSignature = meter, final = true, signature = [], label = "Guitar notation on a treble staff", compact = false, beatsPerBar = 4, eventOffset = 0 } = {}) {
  const width = compact ? 110 : bars.length > 2 ? 610 : bars.length > 1 ? 430 : 260;
  const height = bars.some(bar => bar.some(event => event.bass)) ? 148 : 123;
  const end = width - 14;
  const start = 55 + signature.length * 15 + (timeSignature ? 25 : 0);
  const barWidth = (end - start) / bars.length;
  const lines = Array.from({ length: 5 }, (_, index) =>
    `<path d="M11 ${staffY(index * 2)}H${end}" stroke="currentColor" stroke-width=".8"/>`).join("");
  const time = timeSignature ? `<g fill="currentColor" font-family="Georgia, serif" font-weight="bold" font-size="19"><text x="${start - 22}" y="55">${beatsPerBar}</text><text x="${start - 22}" y="75">4</text></g>` : "";
  const key = signature.map(({ symbol, step }, index) =>
    `<text x="${46 + index * 15}" y="${staffY(step) + 6}" fill="currentColor" font-size="23">${symbol}</text>`).join("");
  const music = bars.map((bar, index) => {
    let beat = 0;
    const x0 = start + index * barWidth;
    const content = bar.map(({ pitch, beats, bass }) => {
      const x = x0 + 10 + beat * (barWidth - 12) / beatsPerBar;
      beat += beats;
      const symbol = !pitch ? glyph("rest", x - 4, 44, 29)
        : bass ? note(pitch, beats, x, "high") + note(bass, beats, x, "low") : note(pitch, beats, x);
      return `<g data-score-event="${eventOffset++}">${symbol}</g>`;
    }).join("");
    if (!meter) return content;
    const right = x0 + barWidth;
    const closing = final && index === bars.length - 1
      ? `<path d="M${right - 4} 37v40" stroke="currentColor" stroke-width=".9"/>` : "";
    return content + closing + `<path d="M${right} 37v40" stroke="currentColor" stroke-width="${closing ? 2.2 : .9}"/>`;
  }).join("");
  return `<div class="score"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${lines}${glyph("clef", 18, 18, 75)}${time}${key}${music}</svg></div>`;
}

const event = (pitch, beats, bass) => ({ pitch, beats, bass });
export function firstScore() {
  return score([[event("G4", 1), event("B4", 1), event("E5", 2)], [event("E5", 1), event("B4", 1), event("G4", 2)]],
    { label: "Exercise A. Four-four time. G quarter, B quarter, high E half. High E quarter, B quarter, G half." });
}

function positions(pitch) {
  return fretPositions(pitch).map(({ string, fret }) => `String ${string}, ${fret === 0 ? "open" : `fret ${fret}`}`);
}

export const firstPosition = Object.keys(notes).map(pitch => {
  const step = notes[pitch][0];
  const item = positions(pitch)[0];
  const staff = step < 0
    ? (step % 2 === 0 ? `Ledger line ${-step / 2} below` : `Space ${Math.ceil(-step / 2)} below`)
    : step > 8 ? (step === 9 ? "Space above the staff" : "First ledger line above")
      : step % 2 === 0 ? `Line ${step / 2 + 1}` : `Space ${(step + 1) / 2}`;
  return { pitch, staff, position: item, example: score([[event(pitch, 1)]], { meter: false, compact: true, label: `${pitch[0]} on the staff` }) };
});

export const noteLocation = pitch => `${pitch[0]} · ${positions(pitch)[0]}`;

export function newQuestion(mode, level, previous, barCount = 2) {
  const group = groups[level] ?? groups.open;
  const pitch = pick(group.filter(note => note !== previous));
  const visual = () => score([[event(pitch, 1)]], { meter: false });

  if (mode === "frets") {
    const correct = positions(pitch);
    const other = shuffle([...new Set(group.flatMap(positions))].filter(option => !correct.includes(option)));
    return { key: pitch, prompt: "Where can you play this written note in first position?", html: visual(),
      answers: shuffle([pick(correct), ...other.slice(0, 3)]), correct, explanation: noteLocation(pitch) };
  }
  if (mode === "rhythm") {
    const choices = [event("B4", .5), event("B4", 1), event("B4", 2), event(null, 1)];
    const value = pick(choices.filter(item => `${item.pitch}/${item.beats}` !== previous));
    const correct = !value.pitch ? "Quarter rest" : { .5: "Eighth note", 1: "Quarter note", 2: "Half note" }[value.beats];
    return { key: `${value.pitch}/${value.beats}`, prompt: "Which duration is shown?", html: score([[value]], { meter: false }),
      answers: ["Eighth note", "Quarter note", "Half note", "Quarter rest"], correct: [correct],
      explanation: { "Eighth note": "Play for half a beat.", "Quarter note": "Play for one beat.", "Half note": "Play once and let the note ring for two beats.", "Quarter rest": "Keep counting for one silent beat." }[correct] };
  }
  if (mode === "keys") {
    const sharp = "♯", flat = "♭";
    const signatures = [
      ["C major", []], ["G major", [{ symbol: sharp, step: 8 }]],
      ["D major", [{ symbol: sharp, step: 8 }, { symbol: sharp, step: 5 }]],
      ["F major", [{ symbol: flat, step: 4 }]],
      ["B♭ major", [{ symbol: flat, step: 4 }, { symbol: flat, step: 7 }]]
    ];
    const [name, signature] = pick(signatures.filter(([name]) => name !== previous));
    return { key: name, prompt: "Which major key matches this signature?", html: score([[]], { meter: false, signature }),
      answers: signatures.map(([name]) => name), correct: [name] };
  }
  if (mode === "melody" || mode === "voices") {
    const twoVoices = mode === "voices";
    const pitches = twoVoices ? groups.treble : group;
    const count = twoVoices ? 2 : barCount;
    let available = shuffle(pitches);
    const bars = Array.from({ length: count }, () => {
      const pattern = pick([[1, 1, 2], [2, 1, 1], [1, 1, 1, 1]]);
      const basses = ["E3", "A3", "D4"];
      return pattern.map(beats => {
        if (!available.length) available = shuffle(pitches);
        return event(available.pop(), beats, twoVoices ? pick(basses) : undefined);
      });
    });
    const label = lines => lines.map(bar => bar.map(({ pitch, beats, bass }) =>
      [pitch, bass, beats === 2 ? "half note" : "quarter note"].filter(Boolean).join(" ")).join(", ")).join(". ");
    const notation = bars.length === 4
      ? score(bars.slice(0, 2), { label: label(bars.slice(0, 2)), final: false }) +
        score(bars.slice(2), { label: label(bars.slice(2)), timeSignature: false })
      : score(bars, { label: label(bars) });
    return { prompt: twoVoices ? "Play the upper voice, then the lower voice. Finally, combine them at 45–50 bpm."
      : `Scan the ${count} bars for 20 seconds, count four beats, then play once at 45–50 bpm.`, html: notation, bars };
  }
  return { key: pitch, prompt: "What is the note name?", html: visual(),
    answers: [...new Set(group.map(p => p[0]))].sort(), correct: [pitch[0]], explanation: noteLocation(pitch) };
}
