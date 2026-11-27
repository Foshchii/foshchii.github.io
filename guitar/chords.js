// Chord shapes for the chord trainer (#practice/chords), flamenco rhythm cycles for the compás
// trainer (#practice/compas), and the helpers that draw them. Only data and HTML strings here:
// views.js draws the library in Node as well as in the browser.

// Frets from string 6 (low E) to string 1 (high E): a number, or "x" for a string not played.
// Fingers: left-hand fingers 1–4 in the same order, 0 for open or unplayed. barre: [fret, from, to].
export const chords = [
  { id: "Em", name: "E minor", frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], tip: "Two fingers, all six strings. Arch the fingers so the open G string rings." },
  { id: "E", name: "E major", frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], tip: "Em with the first finger added on the G string. In flamenco this is the home chord of por arriba." },
  { id: "A", name: "A major", frets: ["x", 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], tip: "Three fingers in a row at fret 2. Let the open high E ring above them." },
  { id: "Am", name: "A minor", frets: ["x", 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], tip: "The same shape as E major, one string higher." },
  { id: "D", name: "D major", frets: ["x", "x", 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], tip: "A small triangle on the top three strings. Pluck from the open D string." },
  { id: "Dm", name: "D minor", frets: ["x", "x", 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], tip: "Like D major, with the first finger at fret 1 on the high E." },
  { id: "C", name: "C major", frets: ["x", 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], tip: "A staircase from string 5 to string 2. Keep the open G and E clear of the fingers." },
  { id: "G", name: "G major", frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], tip: "The two bass strings and the high E. Middle and ring fingers carry the outside notes." },
  { id: "E7", name: "E seventh", frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], tip: "E major with the D string left open: the seventh, D, makes it lean toward A." },
  { id: "A7", name: "A seventh", frets: ["x", 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], tip: "A major with the G string open." },
  { id: "D7", name: "D seventh", frets: ["x", "x", 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], tip: "An upside-down D. It leads naturally to G." },
  { id: "B7", name: "B seventh", frets: ["x", 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], tip: "Four fingers and the open B string. It pulls home to E minor or E major." },
  { id: "G7", name: "G seventh", frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], tip: "G with the first finger at fret 1 on the high E. It leads to C." },
  { id: "Fmaj7", name: "F major seventh", frets: ["x", "x", 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], tip: "An F with no barre: the open high E gives it a soft, open colour." },
  { id: "F", name: "F (flamenco)", frets: [1, 3, 3, 2, 1, 0], fingers: [1, 3, 4, 2, 1, 0], barre: [1, 6, 2], tip: "The first finger lies flat from string 6 to string 2 and the high E rings open: the F of por arriba." },
  { id: "Asus2", name: "A suspended second", frets: ["x", 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], tip: "Neither major nor minor. Lift the third finger from A major." }
];
export const chordIndex = new Map(chords.map(chord => [chord.id, chord]));

// The sounding pitch (MIDI) of each open string, string 6 first. Guitar music is written an octave higher.
export const openMidi = [40, 45, 50, 55, 59, 64];
export const chordMidis = chord => chord.frets.flatMap((fret, i) => fret === "x" ? [] : [openMidi[i] + fret]);

// Pairs for one-minute changes, grouped by the module that needs them.
export const changePairs = [
  { module: "M07", label: "First songs", pairs: [["Em", "A"], ["A", "D"], ["D", "E"], ["C", "G"], ["G", "D"], ["Am", "E"], ["E7", "A"], ["Em", "C"]] },
  { module: "M08", label: "Spanish colour", pairs: [["Am", "E"], ["Am", "Dm"], ["Dm", "E7"], ["E", "F"]] },
  { module: "M09", label: "Rumba", pairs: [["Am", "G"], ["G", "F"], ["F", "E"], ["Em", "D"], ["D", "C"], ["C", "B7"]] },
  { module: "M10", label: "E Phrygian and tangos", pairs: [["E", "F"], ["F", "G"], ["G", "F"], ["Am", "E7"]] },
  { module: "M11", label: "Accompaniment", pairs: [["C", "G7"], ["G", "D7"], ["A7", "D"], ["Fmaj7", "C"]] }
];

// ---------------------------------------------------------------- drawing a chord box

const label = chord => `${chord.name}: ${chord.frets.map((fret, i) => `string ${6 - i} ${fret === "x" ? "not played" : fret === 0 ? "open" : `fret ${fret}${chord.fingers[i] ? `, finger ${chord.fingers[i]}` : ""}`}`).join("; ")}`;

// A chord diagram as SVG: strings left (6) to right (1), frets top to bottom, the nut at the top.
export function chordSvg(chord, { size = "", showFingers = true } = {}) {
  const x = string => 14 + string * 18;        // string index 0 (low E) … 5
  const y = fret => 26 + fret * 22;            // fret line 0 is the nut
  const frets = 4;
  let marks = "";
  chord.frets.forEach((fret, i) => {
    if (fret === "x") marks += `<path class="chord-x" d="M${x(i) - 4} 7l8 8M${x(i) + 4} 7l-8 8"/>`;
    else if (fret === 0) marks += `<circle class="chord-open" cx="${x(i)}" cy="11" r="4.5"/>`;
  });
  if (chord.barre) {
    const [fret, from, to] = chord.barre;
    marks += `<rect class="chord-barre" x="${x(6 - from) - 7}" y="${y(fret) - 18}" width="${x(6 - to) - x(6 - from) + 14}" height="14" rx="7"/>`;
  }
  chord.frets.forEach((fret, i) => {
    if (typeof fret !== "number" || fret === 0) return;
    const finger = chord.fingers[i];
    marks += `<circle class="chord-dot" cx="${x(i)}" cy="${y(fret) - 11}" r="7.5"/>${showFingers && finger ? `<text class="chord-finger" x="${x(i)}" y="${y(fret) - 11}">${finger}</text>` : ""}`;
  });
  const grid = Array.from({ length: frets + 1 }, (_, fret) => `<path class="${fret ? "chord-fret" : "chord-nut"}" d="M${x(0)} ${y(fret)}H${x(5)}"/>`).join("") +
    Array.from({ length: 6 }, (_, i) => `<path class="chord-string" d="M${x(i)} ${y(0)}V${y(frets)}"/>`).join("");
  return `<svg class="chord-box${size ? " chord-box--" + size : ""}" viewBox="0 0 132 124" role="img" aria-label="${label(chord)}">${grid}${marks}</svg>`;
}

// ---------------------------------------------------------------- compás

// Flamenco rhythm cycles. counts: what you say on each step of one cycle; accents: the steps that
// are stressed (by stepLabels when two steps share a count); palmas: the steps the claps play (all
// of them when absent); strokes: a strum pattern to play with it; perBeat: steps in one beat;
// tempo: [slowest, start, fastest] in beats per minute.
export const palos = [
  { id: "rumba", name: "Rumba", module: "M09", counts: ["1", "&", "2", "&", "3", "&", "4", "&"], stepLabels: ["1", "1&", "2", "2&", "3", "3&", "4", "4&"],
    accents: ["1", "3"], strokes: ["↓", "", "↓", "↑", "×", "", "↓", "↑"], perBeat: 2, tempo: [50, 60, 100],
    about: "Module 9’s preparation groove: down on 1, down and up on 2 and its “and”, a quiet mute on 3 (↓ down, ↑ up, × mute), down and up on 4. Keep the hand moving through the empty eighths." },
  { id: "tangos", name: "Tangos", module: "M11", counts: ["1", "2", "3", "4"], accents: ["2", "3", "4"], palmas: ["2", "3", "4"], perBeat: 1, tempo: [90, 110, 140],
    about: "Four beats with the clap missing on one: the palmas answer on two, three and four. Feel the silent one as the start of each bar." },
  { id: "solea", name: "Soleá", module: "M12", counts: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], accents: ["3", "6", "8", "10", "12"], perBeat: 1, tempo: [60, 80, 110],
    about: "Twelve counts, stressed on 3, 6, 8, 10 and 12: two groups of three, then three groups of two. Alegrías share this cycle." },
  { id: "bulerias", name: "Bulerías", module: "M12", counts: ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"], accents: ["12", "3", "6", "8", "10"], perBeat: 1, tempo: [120, 160, 230],
    about: "The soleá cycle, fast and counted from 12. The alzapúa lesson (L35) works inside it." },
  { id: "seguiriyas", name: "Seguiriyas", module: "M12", counts: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"], accents: ["1", "3", "5", "8", "11"], perBeat: 1, tempo: [90, 110, 150],
    about: "Twelve counts in five uneven steps, 2 + 2 + 3 + 3 + 2: short, short, long, long, short. Slow and heavy." }
];
export const paloIndex = new Map(palos.map(palo => [palo.id, palo]));

// The cycle as a clock face: one dot per count, accents larger.
export function compasSvg(palo, { now = -1 } = {}) {
  const n = palo.counts.length, radius = 78, center = 100;
  const dots = palo.counts.map((count, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
    const cx = center + Math.cos(angle) * radius, cy = center + Math.sin(angle) * radius;
    const name = palo.stepLabels?.[i] ?? count;
    const accent = palo.accents.includes(name) || palo.accents.includes(count) && !palo.stepLabels;
    return `<g class="compas-step${accent ? " is-accent" : ""}${i === now ? " is-now" : ""}" data-step="${i}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${accent ? 15 : 10}"/><text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}">${count === "&" ? "&amp;" : count}</text></g>`;
  }).join("");
  return `<svg class="compas-clock" viewBox="0 0 200 200" role="img" aria-label="${palo.name}: ${n} counts, accents on ${palo.accents.join(", ")}"><circle class="compas-ring" cx="${center}" cy="${center}" r="${radius}"/>${dots}<text class="compas-name" x="${center}" y="${center}">${palo.name}</text></svg>`;
}

// Is this step of the cycle an accent?
export const isAccent = (palo, i) => palo.stepLabels ? palo.accents.includes(palo.stepLabels[i]) : palo.accents.includes(palo.counts[i]);
// Does the palmas part clap on this step?
export const claps = (palo, i) => !palo.palmas || palo.palmas.includes(palo.counts[i]);
