export const extraVideos = {
  "CcgPazQ0Xv8": { title: "How to tune a classical guitar", channel: "Bradford Werner", language: "English" },
  "dYC9awwT_YQ": { title: "How to sit and hold a classical guitar", channel: "Bradford Werner", language: "English" },
  "3QuYeNPKRUE": { title: "4/4: Quarter, half and whole notes", channel: "Bradford Werner", language: "English" },
  "I_eBjvIFrUc": { title: "Sight Reading for Guitar: 6/8 time", channel: "Classical Guitar 101", language: "English" },
};

const tune = ["CcgPazQ0Xv8", "Use the electronic tuner chapter. Pluck one open string at a time, starting with the thickest.", "", 234, 304];
const posture = ["dYC9awwT_YQ", "Pause once the guitar is supported. Check that your shoulder stays down as you reach string 1.", "", 51, 300];
const pad = ["GjNFvtRU4Jc", "Copy one small index-pad stroke, then pause and let your hand reset.", "No-nails technique", 274, 377];
const openNotes = ["V76vbZKFNVs", "Find open high E, B and G on the staff and on the guitar. Pause and point to the same strings on yours."];
const rhythm = ["ZJIbf4nMG3Y", "Tap a steady four-beat pulse. Clap once for each printed note and let a half note take two counts."];
const noteLengths = ["3QuYeNPKRUE", "Start at 6:22 for the difference between quarter and half notes. Count out loud as Werner demonstrates.", "", 382, 605];
const etude1 = ["V76vbZKFNVs", "Follow Etude No. 1 in the lesson. Pause after the first two bars and play them by yourself."];
const etude2 = ["V76vbZKFNVs", "Go to Werner’s Etude No. 2 demonstration and copy just the opening phrase."];
const rightHand = ["RDOqubQd9Jo", "Copy the forearm support, wrist position and place where the fingertip meets the string.", "Use fingertip pads", 187, 450];
const alternate = ["MqBL24E5L-A", "Watch the index and middle fingers take turns. Pause and copy four strokes on one open string before crossing to the next."];
const fretA = ["Lsgg_ve_Hd4", "Find A on string 3, fret 2, and copy where Werner puts his fingertip.", "First fretted note", 72, 212];
const readA = ["Lsgg_ve_Hd4", "Follow the sight-reading chapter, watching how the open notes and the new A are found on the guitar.", "", 212, 434];
const treble = ["HjKpXSuRW9I", "Follow the B–C–D and E–F–G demonstrations. Pause after the group you are practising and copy the string and fret."];
const sightRead = ["yYL-am5wMYU", "Scan the starting note, possible crossings and rhythm, then read once without restarting."];
const bassBalance = ["8Uh3Qoi-kv4", "Play the melody alone, then add a quieter bass so the top note stays audible.", "Use fingertip pads"];
const arpeggio = ["cGC6n5Zsf0o", "Copy the thumb and finger preparation, then try the pattern on open strings with your pads."];
const nocturne = ["oupEquZ-FFA", "Follow just the student line on printed page 16. Listen to the first phrase before adding the teacher part.", "Duet play-along"];
const ode = ["cvsyIbLw7rk", "Go to the Ode to Joy section and follow the opening phrase on printed page 26.", "Teaching video"];
const odeDuet = ["t0ymNVwn0b0", "Use the duet once you can keep your own beat through the four bars.", "Duet play-along"];
const brush = ["MbtK61tN22Y", "Copy a single small outward index movement on muted strings.", "Use fingertip pads"];
const compas = ["1hd6pOVaCuI", "Clap the accented beats with Kai before adding the guitar."];
const tangos = ["hGoJVEojSMg", "Clap the first example, then add a single quiet bass note or brush."];
const phrases = ["nF9eW-IZctQ", "Listen to the end of the phrase and copy the breath before the next phrase."];
const legato = ["sstArwUX2AQ", "Hear how each note connects to the next. Use the same release timing in your phrase."];
const warmup = ["mCqLx8xb7lo", "Choose one open-string movement from Werner’s routine and repeat it slowly."];
const free = ["vi42Tlb_9VU", "Follow the free stroke and check it clears the neighboring string.", "Use fingertip pads"];

export const dailyExercises = {
  1: [
    ["Hold the guitar", "Sit on a steady chair. Support the guitar with the neck angled up. In playing position, string 1 is the thin string nearest the floor.", [posture]],
    ["Tune the six open strings", "Pluck one string at a time without pressing a fret. From thickest to thinnest, tune E–A–D–G–B–E.", [tune]],
    ["Read and find G, B and high E", "Count the staff lines from the bottom. Match each written note below to the string it uses. Point to the string on your guitar and say the note name aloud. All three notes are open, so leave your left hand off the frets.", [openNotes]],
    ["Pluck one note without nails", "Touch open high E near the soundhole with the pad of your right index finger. Move a short distance toward your palm and let the string slip off your fingertip. Play four separate notes, with a pause after each. Then try strings 2 and 3.", [pad]],
    ["Clap Score A, then play it", "Count 1–2–3–4 before starting. Clap on beats 1, 2 and 3 in each bar. Beat 4 is the second count of the hollow note, so keep counting without a new clap or pluck. Play the first bar alone before trying both.", [noteLengths], "A"],
  ],
  2: [
    ["Play four open high E notes", "Pluck string 1 with your index pad, wait for the note to ring, then reset. Try two sets of four.", [pad]],
    ["Put the four notes on a beat", "Clap four even beats, then play one open E on each beat at 45–50 bpm.", [rhythm, pad]],
  ],
  3: [
    ["Set up the right hand", "Rest your forearm and play one quiet open high E. Check that the wrist and shoulder stay easy.", [rightHand]],
    ["Clap and play through rests", "In Score B, stop the ringing string with a light touch at the rest. Count one silent beat and carry on.", [rhythm], "B"],
  ],
  4: [
    ["Read the three notes in a new order", "Say the note and the string before you play it. In Score C, let every half note ring for two counts.", [openNotes, rhythm], "C"],
    ["Try the bass with your thumb", "Pluck open string 6 (low E) and string 5 (A) twice each. Try this by itself, between takes.", [arpeggio]],
  ],
  5: [
    ["Clap and play Etude No. 1", "Use the first two bars on printed page 14. Clap first, then play with a relaxed index stroke.", [etude1, rhythm]],
    ["Isolate a string crossing", "Choose two neighboring notes on different strings. Play only those two slowly and keep the right hand still enough to reset.", [rightHand, openNotes]],
  ],
  6: [
    ["Check your setup and record two bars", "Review the three open notes, then record Score B at 45–50 bpm. On playback, listen for the silent counts and check your shoulder in the recording.", [posture, openNotes, rhythm], "B"],
  ],
  7: [["Optional listening", "Listen to the opening of Nocturne and notice where the student phrase comes to rest.", [nocturne]]],
  8: [["Read Etude No. 2", "Use printed page 15. Find the opening note, count in for four beats, then keep the beat if you miss a note.", [etude2, sightRead]]],
  9: [
    ["Alternate index and middle", "Play i–m–i–m on open high E, then start with m. Once even, cross between open high E and B.", [alternate]],
    ["Read two familiar bars", "Return to Etude No. 2 on printed page 15. Keep the pulse as you change strings.", [etude2]],
  ],
  10: [["Clap, then alternate across G, B and high E", "Play Score C with a small i–m motion. If the crossing interrupts the beat, isolate the two notes around it.", [rhythm, alternate], "C"]],
  11: [["Learn the Nocturne student part", "Find the student staff on printed page 16. Practise four bars at your own pace before trying to join the duet.", [openNotes, nocturne]]],
  12: [
    ["Read two unfamiliar bars", "Choose two bars from printed pages 14–16. Find the three pitches, clap the rhythm, then read once at 50 bpm.", [openNotes, sightRead]],
    ["Change the attack", "Repeat a familiar phrase and make its first note a little softer.", [["3JMm6oiNdCI", "Compare how contact and plucking position change your sound.", "Use fingertip pads"]]],
  ],
  13: [
    ["Name nine notes", "Use the open-string quiz. Aim for eight correct. Say the string number as well as the note name.", [openNotes], "", ["#reading/notes", "Open the note quiz"]],
    ["Read a fresh two-bar line", "Scan the score and count at 50 bpm. If you lose the pulse, clap it once before trying again.", [rhythm, sightRead], "", ["#reading/open-melody", "Generate two bars"]],
  ],
  14: [["Optional string-crossing review", "Write down the easiest and hardest open-string crossing you tried this week.", [alternate]]],
  15: [["Fret A on string 3", "Place left-hand finger 2 just behind fret 2. Play A, then lift the finger and play open G. Use only enough pressure for a clear note.", [fretA], "D"]],
  16: [["Read open G and fretted A", "Compare their positions on the staff. Then add open B and high E. Glance down once to place finger 2 and look back at the score.", [fretA, readA], "D"]],
  17: [["Play the opening of Moderato", "On printed page 19, clap the opening once. Then practise it in two-bar blocks at 45–50 bpm.", [["Lsgg_ve_Hd4", "Watch Werner teach Moderato.", "", 434, 614], rhythm]]],
  18: [["Play the opening of A Fairy Tale", "On printed page 20, listen to the first phrase and hum the reply. Play the opening at a steady, slow pulse.", [["Lsgg_ve_Hd4", "Start at the A Fairy Tale chapter and follow the first phrase on the page.", "", 614], phrases]]],
  19: [["Play B, C and D on string 2", "Use fret 0 for B, 1 for C and 3 for D. Try left-hand finger 4 for D as Werner shows.", [treble], "E"]],
  20: [["Play E, F and G on string 1", "Use fret 0 for E, 1 for F and 3 for G. Record one quiet take and let each note ring for its full count.", [treble], "F"]],
  21: [["Optional silent review", "Point to B–C–D and E–F–G on the staff. Say each string and fret before checking.", [treble]]],
  22: [["Switch between strings 1 and 2", "Find D on string 2 fret 3 and F on string 1 fret 1 before you count in. Keep playing through a mistake.", [treble, sightRead], "G"]],
  23: [["Try two short melodies", "Open printed page 24. Name the first and last note of each melody. Repeat one at the same pace with a softer ending.", [["cvsyIbLw7rk", "Use the Five Melodies section. Follow the notes in the short melodies before the Ode to Joy section."], phrases]]],
  24: [["Clap and play Ode to Joy", "On printed page 26, clap the first phrase. Play at 48 bpm and repeat only the two bars that need work.", [ode, rhythm]]],
  25: [["Play four bars of Ode to Joy with the teacher", "Practise alone at 48–55 bpm first. Join the duet only if you can keep its pulse.", [ode, odeDuet]]],
  26: [["Read one line on a first take", "Scan for 20 seconds, count in and play once. After a break, choose a different line from printed pages 23–24.", [sightRead, treble], "G"]],
  27: [
    ["Read a fresh four-bar line", "Use unseen Score H, an unused method line or the generator. Preview once, then play through without restarting.", [sightRead], "H", ["#reading/assessment", "Generate four fresh bars"]],
    ["Play four prepared bars of Ode to Joy", "Check that your longer notes ring for their full count. Use the duet after your solo attempt.", [ode, odeDuet]],
  ],
  28: [["Optional review", "Choose the weaker Day 27 task. Try two bars at your own pace, then return to four.", [sightRead, ode]]],
};

export const lessonPracticeVideos = {
  L01: [posture, tune], L02: [pad, rhythm], L03: [rightHand, pad], L04: [openNotes, rhythm],
  L05: [alternate], L06: [openNotes, nocturne], L07: [fretA], L08: [fretA, readA, ["Lsgg_ve_Hd4", "Copy the first two bars of Moderato.", "", 434, 614]], L09: [treble],
  L10: [ode, sightRead], L11: [ode, odeDuet], L12: [free], L13: [warmup], L14: [legato],
  L15: [["sfQ0p3JM-Hw", "Hear the quiet and louder versions of Etude No. 3. Change the attack while keeping the beat steady."]],
  L16: [legato, ["l3Jk2N0oCF8", "Find the Au clair de la lune section, listen to the phrase and follow its printed rhythm."]],
  L17: [["hICRomux18g", "Follow Etude No. 5 with the score, first tracking the low line and then the melody."], bassBalance],
  L18: [["yatrVnPnSpk", "Find the C-major scale and eighth-note examples in Werner’s lesson."], ["YiQfBDBsZZg", "Clap the eighth-note subdivisions on a steady beat."], arpeggio],
  L19: [["jLNTZ77r6So", "Listen to the dotted rhythm in Little Birch Tree and count the subdivisions."], bassBalance],
  L20: [["TPoCxC1XAVk", "Follow the student line of Hook’s Minuet in the duet and count in threes."], rhythm],
  L21: [["yllFoq5JcyU", "Find the same figure in two registers and read each starting note."]],
  L22: [["OUdiqB9AQKU", "Watch the first chord-accompaniment demonstration, then copy its timing on muted strings."]],
  L23: [["JeTGmAbBb7U", "Use the first one-chord song. Copy one down brush per bar before humming."]],
  L24: [["QxKZvF6rFPo", "Follow the two chord shapes in your chosen song and rehearse just the change."]],
  L25: [["8obTT2lpU4Q", "Choose the Greensleeves or Leyenda section. Stop before each accidental and find its fret."]],
  L26: [["H1Lr-pXHGFg", "Follow the first phrase of Malagueñas."], brush],
  L27: [["KEtbMHqUeX4", "Listen to the first phrase of Siciliano and follow the two voices on the page."], bassBalance],
  L28: [["dUz6ek0ggVg", "Copy one down/up group at a time and substitute a muted brush for the percussive tap."]],
  L29: [compas],
  L30: [["3VpO8-oqvso", "Listen to Kai’s E Phrygian scale. Isolate F–E and sing it before you play."]],
  L31: [brush],
  L32: [tangos],
  L33: [["AzwrOyMH6l4", "Follow the fingerstyle accompaniment lesson and separate the thumb pulse first."], arpeggio],
  L34: [arpeggio, phrases, pad],
  L35: [["4rGaGpIRYGg", "Watch the isolated thumb down/up motion before trying the full Bulerías unit."], compas],
  S01: [posture, openNotes], S02: [rightHand, pad], S03: [free],
};

export const lessonStepVideos = {
  L02: [[openNotes], [pad], [pad], [rhythm, pad]],
};

export const modulePracticeVideos = {
  M01: [openNotes, rhythm, pad], M02: [fretA, treble, sightRead, ode], M03: [free, legato, ...lessonPracticeVideos.L15],
  M04: [lessonPracticeVideos.L17[0], bassBalance], M05: lessonPracticeVideos.L18,
  M06: [lessonPracticeVideos.L19[0], ["xY9Q0R0G2jM", "Identify the key signature before choosing your frets."], sightRead],
  M07: [lessonPracticeVideos.L23[0], lessonPracticeVideos.L24[0]], M08: [lessonPracticeVideos.L25[0], lessonPracticeVideos.L26[0], bassBalance],
  M09: [lessonPracticeVideos.L28[0], compas], M10: [lessonPracticeVideos.L30[0], brush, ["RSjUvNLsyJA", "Copy slow alternating rest strokes, then cross to the next string.", "Use fingertip pads"]],
  M11: [tangos, arpeggio, bassBalance], M12: [arpeggio, bassBalance, phrases, sightRead],
};

export const roadmapPracticeVideos = {
  7: [sightRead, ["yllFoq5JcyU", "Read the repeated idea in two registers before trying your own unfamiliar study."]],
  8: [bassBalance, ["I_eBjvIFrUc", "Count two groups of three eighth notes before trying the first 6/8 score.", "", 13]],
  9: [compas, tangos, ["m-s8ZJJalKA", "Hear where the accents and rasgueados fall in Soleá and Tangos."]],
  10: [...lessonPracticeVideos.L35, ["6rDTzdFUBz4", "Practise a small, slow tremolo group with the pads."]],
  11: [arpeggio, phrases, bassBalance],
  12: [sightRead, bassBalance, phrases],
};

export const estasStepVideos = {
  "golden-dragon": [
    [["7gphiFVVtUI", "Hear the repeating figure in the original performance.", "Listening", 66]],
    [["OBJTsu-ZAMA", "Watch the first right-hand riff up close.", "Technique", 66], ["kESlZfvMP4c", "Find the matching phrase in Roshi’s full tutorial."]],
    [arpeggio, pad], [brush, ["OBJTsu-ZAMA", "Compare the brush with the rhythm of the original riff.", "", 66]],
  ],
  introspection: [[["5OXcXv0rUNI", "Pause at the first phrase ending and hum it back.", "Listening"]], [["qHryKNPWZyc", "Follow the top notes in the on-screen TAB.", "Arrangement"]], [free, bassBalance], [phrases, bassBalance]],
  "paris-heart": [[["FtDfB1HElE0", "Follow the highest note through one chord change.", "Listening"]], [free, bassBalance], [phrases]],
  "spirit-of-time": [[["60GqBvKTroU", "Listen for the opening idea and where it changes.", "Listening"]], [arpeggio, pad], [phrases, bassBalance], [["60GqBvKTroU", "Replay the Kyiv version and compare it to the 2013 audio linked below.", "Listening"]]],
};

export const estasDrillVideos = [
  [arpeggio, bassBalance],
  [treble, fretA, phrases],
];
