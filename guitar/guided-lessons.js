const check = (title, instruction, confirm) => ({ type: "check", title, instruction, confirm });
const find = (title, instruction, targets, strings = [1, 2, 3], frets = 3) =>
  ({ type: "find", title, instruction, targets, strings, frets });
const rhythm = (title, instruction, bar, division = 1) => ({ type: "rhythm", title, instruction, bar, division });
const play = (title, instruction, bars, options = {}) => ({ type: "play", title, instruction, bars, ...options });
const tune = {
  type: "tune", title: "Hear the open strings",
  instruction: "Tap a string, then play that open string on your guitar. Start with string 6, the thickest. Use your tuner to confirm E–A–D–G–B–E from thick to thin.",
};

const open = ["G4", "B4", "E5"];
const treble = ["B4", "C5", "D5", "E5", "F5", "G5"];
const first = ["G4", "A4", ...treble];

const scoreA = [
  [["G4", 1], ["B4", 1], ["E5", 2]],
  [["E5", 1], ["B4", 1], ["G4", 2]],
];
const quietPulse = [[["E5", 1], ["E5", 1], ["E5", 1], ["E5", 1]]];
const crosses = [[["E5", 1], ["B4", 1], ["E5", 1], ["B4", 1]]];
const withRests = [[["G4", 1], [null, 1], ["B4", 2]], [["E5", 1], ["B4", 1], [null, 1], ["G4", 1]]];
const halfNoteFirst = [[["E5", 2], ["G4", 1], ["B4", 1]], [["G4", 1], ["E5", 1], ["B4", 2]]];
const openPhrase = [[["B4", 1], ["E5", 1], ["B4", 2]], [["G4", 1], ["E5", 1], ["G4", 2]]];
const arpeggio = [[["E3", 1], ["G4", 1], ["B4", 1], ["E5", 1]], [["E3", 1], ["E5", 1], ["B4", 1], ["G4", 1]]];
const firstFret = [[["G4", 1], ["A4", 1], ["A4", 1], ["G4", 1]], [["B4", 1], ["A4", 1], ["G4", 2]]];
const questionAnswer = [[["G4", 1], ["A4", 1], ["B4", 1], ["E5", 1]], [["B4", 1], ["A4", 1], ["G4", 2]]];
const secondString = [[["B4", 1], ["C5", 1], ["D5", 2]], [["D5", 1], ["B4", 1], ["C5", 2]]];
const firstString = [[["E5", 1], ["F5", 1], ["G5", 2]], [["G5", 1], ["E5", 1], ["F5", 2]]];
const treblePhrase = [[["C5", 1], ["D5", 1], ["F5", 1], ["E5", 1]], [["G5", 1], ["E5", 1], ["D5", 1], ["B4", 1]]];
const newPhrase = [[["F5", 2], ["D5", 1], ["C5", 1]], [["E5", 1], ["G5", 1], [null, 1], ["E5", 1]]];

// A new single-line guitar setting of the opening of Beethoven’s public-domain theme.
const ode = [
  [["E5", 1], ["E5", 1], ["F5", 1], ["G5", 1]],
  [["G5", 1], ["F5", 1], ["E5", 1], ["D5", 1]],
  [["C5", 1], ["C5", 1], ["D5", 1], ["E5", 1]],
  [["E5", 1.5], ["D5", .5], ["D5", 2]],
];
const bassLine = [[["E3", 1], ["G3", 1], ["A3", 2]], [["B3", 1], ["D4", 1], ["E4", 2]]];
const together = [[["B4", 1, "E3"], ["E5", 1], ["D5", 1], ["B4", 1]], [["C5", 1, "A3"], ["B4", 1], ["G4", 2]]];
const cMajor = [[["C4", 1], ["D4", 1], ["E4", 1], ["F4", 1]], [["G4", 1], ["A4", 1], ["B4", 1], ["C5", 1]]];
const eighthBar = [["G4", .5], ["B4", .5], ["G4", 1], ["B4", .5], ["E5", .5], ["B4", 1]];
const dottedBar = [["E5", 1.5], ["F5", .5], ["G5", 1], ["E5", 1]];
const chromatic = [[["C4", 1], ["C#4", 1], ["Db4", 1], ["D4", 1]]];
const highLow = [[["E4", 2], ["E5", 2]], [["G4", 2], ["G5", 2]]];

const setup = check("Support the guitar", "Sit on a stable chair. Raise the neck slightly and let the guitar’s body rest against you. Bring your forearm to the guitar and reach the thin E without lifting your shoulder.",
  "My shoulder stays relaxed and the guitar feels steady");
const indexPad = check("Release the string with your fingertip", "Rest the pad of your right index on open high E. Move a little toward your palm until the string slips off. Let the finger clear string 2, then reset before the next pluck.",
  "I played four quiet notes with the pad of my index");
const alternate = check("Alternate index and middle", "Play open high E with index, middle, index, middle. Keep the unused fingers relaxed. Repeat starting with the middle finger and compare the sound.",
  "I tried both starting fingers with even volume");
const openFinder = find("Find the three open notes", "Count staff lines from the bottom. G sits on line 2, B on line 3 and high E in the top space. Click the matching open string for each note.",
  ["B4", "G4", "E5"], [1, 2, 3], 0);
const openTest = find("Read before looking down", "Say each written note aloud. Choose its open string, then play it on your guitar.",
  ["E5", "G4", "B4", "G4", "E5", "B4"], [1, 2, 3], 0);
const fretA = find("Find G and A on string 3", "Open string 3 gives G. For A, place your left middle finger just behind fret 2. Compare how G sits on a line and A sits in the space above it.",
  ["G4", "A4", "A4", "G4"], [3], 3);
const stringTwo = find("Find B, C and D", "Stay on string 2. B is open, C uses fret 1 and D uses fret 3. Use the index for fret 1 and try the little finger for fret 3.",
  ["B4", "C5", "D5", "C5"], [2], 3);
const stringOne = find("Find E, F and G", "Stay on string 1. E is open, F uses fret 1 and G uses fret 3. Say the note name as you pick the fret.",
  ["E5", "F5", "G5", "F5"], [1], 3);
const mixedTreble = find("Switch strings 1 and 2", "Read the height of each note on the staff, then choose where to play it. Open B is on the middle line. Open E is in the top space.",
  ["D5", "F5", "C5", "G5", "B4", "E5"], [1, 2], 3);
const barCounting = rhythm("Choose when to pluck", "In this bar of 4/4, a filled quarter note takes one count. A hollow half note with a stem takes two. Select the beats where a new note begins.", scoreA[0]);
const breath = check("Leave a space between phrases", "Play the first bar, then hold the last note for all its counts. Take one calm breath before starting the next phrase. Give the final note a slightly softer attack.",
  "I finished each phrase without rushing");
const odeBars = play("Play the opening of Ode to Joy", "Start on open high E. First listen to the opening, then play along. In the final bar, the next D starts on the “and” of beat 2.",
  ode, { source: "Melody by Ludwig van Beethoven (1824). Guitar setting and audio by Guitar Academy." });
const accidentals = find("Locate C-sharp and D-flat", "C♯ is written on the C ledger line with a sharp. D♭ is written on the D space with a flat. On this guitar, both are played at fret 4 of string 5.",
  ["C4", "C#4", "Db4", "D4"], [4, 5], 4);
const octave = play("Hear written pitch and sounding pitch", "Guitar notation is written an octave higher than it sounds. A small 8 below the treble clef makes that explicit. Here the first two notes are written E4 and E5 but sound as E3 and E4. Play them on string 4, fret 2, then open string 1.",
  highLow);
const bassFinder = find("Read below the staff", "Find low E, G and A, then come back to the first ledger line below the staff for C. Follow the note head, then choose the string and fret.",
  ["E3", "G3", "A3", "C4", "D4", "E4"], [4, 5, 6], 3);
const connect = check("Join two notes", "Play a note and keep it sounding until the next pluck. Try it slowly first. Use as little pressure as you need to avoid a buzz.",
  "I heard both notes clearly with a small gap or no gap");
const brush = check("Prepare a downstroke", "Rest the left fingers lightly across the strings to mute them. Sweep your right thumb pad downward on beat 1. Count the remaining beats out loud before brushing again.",
  "I kept the count steady through four downstrokes");
const symbol = check("Check a phrase on your guitar", "Practise at a pace where your hand can reset between notes. Repeat the phrase twice and give yourself a short pause between takes.",
  "I played the phrase twice at a comfortable pace");

export const guidedDays = {
  1: [setup, tune, openFinder, indexPad, barCounting,
    play("Play Score A", "Listen for the four clicks, then play along. Let each half note ring through the next beat. Use the index pad and keep the left hand off the frets.", scoreA)],
  2: [indexPad, play("One note on each click", "After the count-in, use your index pad on open high E on all four beats. Stop and relax the hand, then repeat.", quietPulse)],
  3: [rhythm("Keep counting through a rest", "A quarter rest lasts one silent beat. Select the beats where a note starts. Leave the rest and the held half note counts clear.", withRests[0]),
    play("Make room for silence", "As you reach a rest, gently touch the ringing string to stop it. Say the silent count and keep going.", withRests)],
  4: [openFinder, rhythm("Start with a half note", "Play on count 1 and let the note ring through count 2. Choose the beats that need a new pluck.", halfNoteFirst[0]),
    play("Read the open-string line", "Say the note names before playing. Then follow the score and keep all four beats in each bar.", halfNoteFirst)],
  5: [play("Read a short open-string study", "Clap the two bars first. Then play them once with your index pad. Isolate the move from open B to high E if it breaks the beat.", openPhrase), symbol],
  6: [openTest, play("Check a take with rests", "Play once with the count-in. Replay at a lower tempo if you lose track of a rest. Afterward, record one take on your device and listen for the quiet beats.", withRests)],
  7: [play("Optional listening", "Listen once and hum the last note of each bar. Notice how the second bar comes to rest.", openPhrase)],
  8: [play("Play the notes one by one", "Use the thumb for the low E and your index, middle and ring for G, B and high E. Let each string keep ringing as you add the next.", arpeggio, { ringing: true }),
    check("Keep the strings ringing", "Try the first four notes without the timer. Check that preparing a finger does not stop a string too early.", "The notes can ring together")],
  9: [alternate, play("Cross between two open strings", "Use index–middle on alternate beats. On the repeat, start with middle, then index. Keep the distance your fingers travel small.", crosses)],
  10: [rhythm("Count the held note", "Tap only when you would pluck. The opening note keeps sounding on the next count.", halfNoteFirst[0]),
    play("Alternate while changing strings", "Play both bars with alternating fingers. Stop and loop two notes if a string change makes you hesitate.", halfNoteFirst)],
  11: [play("Hold your line against a pulse", "This original phrase prepares you for a duet. Listen to your part first. Then switch to Count only and play it over the clicks.", openPhrase),
    check("Play from beginning to end", "If a note slips, keep the pulse and join again on the next beat. Save the troublesome pair for a separate repeat.", "I kept the pulse through both bars")],
  12: [play("Read one take before checking", "Look through the line for 20 seconds. Read it once with fretboard hints off, then listen to check. Repeat the final note more softly.", withRests, { showHints: false, fresh: "open" }), breath],
  13: [openTest, play("Try a two-bar reading check", "Find the first note and count four before playing. Keep the pulse while the long notes ring.", withRests, { showHints: false, fresh: "open" })],
  14: [play("Optional crossing review", "Play the two-string pattern at a slow tempo. Name the crossing that felt easiest and the one that needs another try.", crosses)],
  15: [fretA, play("Lift from A back to G", "Use only enough pressure for a clean A. Lift the left finger to play open G, then return to A without shifting the whole hand.", firstFret)],
  16: [fretA, find("Mix A with the open strings", "Use open G, B and E as anchors. When the note sits in the space immediately above G, use fret 2 of string 3.",
    ["A4", "B4", "G4", "E5", "A4"]), play("Read a four-note phrase", "Name each note once and keep the beat going when the left finger moves.", questionAnswer)],
  17: [rhythm("Clap the opening rhythm", "Find where each note starts. When the next note is held for two beats, leave the second count empty.", firstFret[1]),
    play("Connect a fretted note to an open note", "Play slowly enough to move from open B to fretted A and then open G within the same pulse.", firstFret)],
  18: [play("Listen for a question and answer", "The first bar rises. The second bar answers by moving down. Hum each bar once, then play it with its written rhythm.", questionAnswer), breath],
  19: [stringTwo, play("Play on string 2", "Practise B, C and D in order. Then follow the printed rhythm and keep D ringing for both beats.", secondString)],
  20: [stringOne, play("Play on string 1", "Read E, F and G. Keep your index near fret 1 as you reach fret 3 with your little finger if comfortable.", firstString)],
  21: [mixedTreble],
  22: [mixedTreble, play("Cross strings 1 and 2 in a melody", "Locate D on string 2 and F on string 1 before the count-in. Keep the pulse as you cross.", treblePhrase)],
  23: [play("Give two phrases different endings", "Name the first and last pitches of each bar. Play both once, then make the very last note a little softer.", newPhrase), breath],
  24: [mixedTreble, play("Learn the first two bars of Ode to Joy", "Read E–E–F–G, then G–F–E–D. Clap four steady notes per bar before using your fingertips.", ode.slice(0, 2), { source: odeBars.source })],
  25: [rhythm("Count the ending of the phrase", "Count “1 and 2 and 3 and 4 and.” The dotted note lasts one and a half beats. Select only where each note begins.", ode[3], 2), odeBars],
  26: [play("Read a fresh line", "Keep fretboard hints off for the first attempt. Scan for 20 seconds, play once at your own pace, then turn the hints on to check.", newPhrase, { showHints: false, fresh: "treble" })],
  27: [play("Try a four-bar reading check", "Preview the score, then use Count only for your first attempt. Keep going after a slip. Compare with the model afterward.", [...treblePhrase, ...newPhrase], { showHints: false, fresh: "treble" }), odeBars],
  28: [play("Optional review of two bars", "Choose a tempo you can keep. Start with just the first bar. Check which fret or rhythm needs one more repeat.", treblePhrase)],
};

export const guidedTheory = [openFinder, mixedTreble, bassFinder, octave, accidentals,
  play("Compare C, C-sharp, D-flat and D", "Listen to the two middle notes. They sound the same on this fretboard. C and C♯ are one fret apart on string 5, and D♭ and D are one semitone apart.", chromatic)];

export const guidedCoreLessons = {
  L01: [setup, tune], L02: guidedDays[2], L03: [setup, indexPad], L04: [openFinder, barCounting, guidedDays[1].at(-1)],
  L05: guidedDays[9], L06: guidedDays[11], L07: guidedDays[15], L08: guidedDays[18], L09: [stringTwo, stringOne, mixedTreble],
  L10: guidedDays[24], L11: guidedDays[25],
  L12: [check("Compare free and rest strokes", "Pluck open high E twice with index. For free stroke, clear string 2. For rest stroke, let the finger land gently on string 2. Listen at the same volume.", "I can tell where the finger ends in each stroke")],
  L13: [alternate, fretA, symbol], L14: [connect, guidedDays[16].at(-1)],
  L15: [play("Compare soft and medium", "Play two identical runs at different volumes. Keep the count and fingering the same.", openPhrase), breath],
  L16: [connect, play("Connect a short melody", "Use your fingertip pads and keep each note sounding up to the next.", newPhrase)],
  L17: [bassFinder, play("Read a bass line, then add treble", "Play the low notes alone with your thumb. In the next pass, add the treble. Two note heads on the same beat start together.", together)],
  L18: [play("Read a C-major octave", "Say each note and find its fret, then play up the scale with alternating fingers.", cMajor),
    rhythm("Count pairs of eighth notes", "Count “1 and 2 and 3 and 4 and.” Select the counts where a note begins.", eighthBar, 2),
    play("Let the arpeggio ring", "Put p on the bass and i–m–a on strings 3–2–1. Slow down so the notes overlap.", arpeggio, { ringing: true })],
  L19: [rhythm("Read a dotted quarter plus an eighth", "The dotted quarter sounds for a beat and a half. The eighth starts on the “and” of beat 2.", dottedBar, 2),
    play("Play the dotted rhythm", "Say the subdivisions before you play; then listen for the short note on the offbeat.", [dottedBar])],
  L20: [play("Feel a three-beat bar", "Count 1–2–3, with a little more weight on 1. Keep beat 3 the same length as the other beats.", [[["G4", 1], ["B4", 1], ["E5", 1]], [["D5", 1], ["B4", 2]]], { beatsPerBar: 3 })],
  L21: [octave, play("Read a bass answer", "Identify the register before you choose the string. Compare the timbre of each string at the same volume.", bassLine)],
  L22: [brush, rhythm("Mark the downbeat", "Tap only where the brush begins. Count the other three beats while the sound rings.", [["E5", 4]])],
  L23: [brush, check("Hum over the downbeat", "Choose a chord you can hold, brush softly once per bar and hum the phrase over four bars. Speak the rhythm before trying the melody.", "I can hum while keeping the downbeat")],
  L24: [check("Change from Am to E", "Try four beats of Am and four beats of E. Practise the move slowly with the left hand, then add one quiet thumb brush per bar.", "I can change chords without losing beat 1")],
  L25: [accidentals, guidedTheory.at(-1)], L26: [brush, breath],
  L27: [play("Bring the melody out above the bass", "Try the treble first, then the bass. Combine them with a slightly quieter thumb.", together), breath],
  L33: guidedDays[8],
};
