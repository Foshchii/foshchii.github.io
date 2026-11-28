// Daily practice after the first 28 days. Each module from M03 on has three menus that take turns
// day by day (every device shows the same one on a given date). A menu fills the reading,
// technique and music steps of the Today checklist; the warm-up and the review stay the same.
// The steps are taken from the module's Play text, its lessons' drills, its common error and its
// assessment in course.js, and point to the practice tool that helps: a tempo written as "at 50 bpm"
// sets the metronome in the guided session.
// Each step: [label, what to do]. check_guitar.mjs checks that every module has its three menus.
export const modulePlans = {
  M03: [
    {
      reading: ["Read a line from Werner pp. 30–34", "Name the pitches, clap the rhythm, then play it at 50 bpm without stopping."],
      technique: ["Free and rest strokes", "On string 1, four i–m free strokes and four i–m rest strokes at 50 bpm, twice. Keep string 2 ringing during the free strokes (L12)."],
      music: ["Au clair de la lune, legato", "Sing the rhythm, then play four bars at 50 bpm, letting each note sound until the next one starts (L14)."]
    },
    {
      reading: ["Sight-read two fresh scores", "Reading trainer › Sight-reading, first-position treble. Count in before each score."],
      technique: ["The technique routine", "One open-string and one fretting exercise from Werner’s routine, three short sets each at 50 bpm. Relax the hand between sets (L13)."],
      music: ["Etude 3 in two dynamics", "Four bars quietly, then at a medium volume, twice each at 50 bpm, with the same pulse and contact angle (L15)."]
    },
    {
      reading: ["A note quiz level", "Play the note quiz’s next level, or its Review round if questions are due."],
      technique: ["Accent without pulling", "Make an accent with a slightly firmer short stroke at the same angle, never by pulling the string out. Accent one note in four at 50 bpm."],
      music: ["Record a phrase", "Record two bars of Au clair de la lune or Sound Picture and listen for gaps between the notes."]
    }
  ],
  M04: [
    {
      reading: ["Bass notes on strings 4–6", "Read D4/E4/F4 on string 4, A3/B3/C4 on string 5 and E3/F3/G3 on string 6. Say each note and its fret before you play it."],
      technique: ["Thumb alone, then fingers", "Etude 5: four bars of bass with p, then four bars of melody with i–m, at 48 bpm (L17)."],
      music: ["One bass under each bar", "Put one bass note under the first melody note of each bar of Etude 5 at 48 bpm."]
    },
    {
      reading: ["Bass reading in the trainer", "Reading trainer › Note names, first-position bass: ten notes. Aim for eight right."],
      technique: ["A smaller thumb stroke", "Place the thumb slightly ahead of the fingers and play the bass softer than the melody. Four bars at 48 bpm."],
      music: ["Etude 7, both voices", "Read the bass alone, sing the treble, then play both voices in two-bar loops at 48 bpm."]
    },
    {
      reading: ["Low ledger lines", "The note quiz’s level on ledger lines below the staff, or its Review round."],
      technique: ["Voices in turn", "Play the written bass of Etude 5 with p while humming the melody; then play the melody and hum the bass."],
      music: ["Etude 8, if the bass is steady", "If Etudes 5 and 7 feel controlled, read the first four bars of Etude 8 at 48 bpm; otherwise loop two bars of Etude 7."]
    }
  ],
  M05: [
    {
      reading: ["C major from C4 to C5", "Play one written octave of C major slowly, naming each note. Mark E–F and B–C: the two half steps."],
      technique: ["p–i–m–a on strings 5–3–2–1", "Four arpeggio cycles at 50 bpm, the thumb leading and the ring finger touching shallowly (L18)."],
      music: ["Angeline the Baker", "Clap and count “1 and 2 and”, then play four bars of eighths at 50 bpm."]
    },
    {
      reading: ["Count eighths", "Reading trainer › Rhythm: count each example aloud in eighths before you answer."],
      technique: ["p–i–m–i on strings 5–3–2–3", "Four cycles at 50 bpm. If the ring finger catches, practise m–a as a two-note group."],
      music: ["Etude 9", "Four bars at 50 bpm with steady subdivisions; loop the bar with the most eighths."]
    },
    {
      reading: ["Major and minor triads", "Spell C–E–G and A–C–E, play each slowly and hear the major and the minor third. The note quiz’s chords level helps."],
      technique: ["Even eighths", "Set the metronome to eighth notes at 50 bpm and play i–m eighths on one string for two minutes."],
      music: ["Record an arpeggio", "Record four uninterrupted p–i–m–a cycles at 50 bpm and listen for an even ring finger."]
    }
  ],
  M06: [
    {
      reading: ["Dotted quarter and eighth", "On page 57, clap the dotted rhythm of Little Birch Tree in the Field, counting “1 and 2 and” with the eighth on the “and” of 2 (L19)."],
      technique: ["Say every subdivision", "Tap steady eighths, then play the dotted rhythm on one note at 50 bpm without rushing the note after the dot."],
      music: ["Little Birch Tree in the Field", "Play the first phrase slowly, then at 50 bpm."]
    },
    {
      reading: ["Sight-read pp. 63–64", "Read four bars at 50 bpm. Name the opening pitch in each octave, then connect them without restarting (L21)."],
      technique: ["Two voices, one at a time", "Etude 10: the bass first, then the melody, then both together at a slow pulse."],
      music: ["Hook’s Minuet in 3/4", "Count 1–2–3, read four bars once at 50 bpm, then play along with the duet recording (L20)."]
    },
    {
      reading: ["Key signatures", "Reading trainer › Key signatures. Then read G major from G4 to G5, with F♯ on string 1 fret 2."],
      technique: ["Fresh dotted rhythms", "Clap three dotted rhythms from Reading trainer › Rhythm at 50 bpm before you check the answers."],
      music: ["C major or A minor?", "Play a short phrase that ends on C, then one that ends on A, and say which note sounds like home in each."]
    }
  ],
  M07: [
    {
      reading: ["Chord boxes", "Chord trainer › Name the chord: ten chords. Say the name aloud before you answer."],
      technique: ["One-minute changes", "Chord trainer: one round with your song’s two chords. Move one common finger at a time."],
      music: ["One brush per bar", "Count four and brush lightly down on beat 1 at 55–60 bpm while you speak or hum one verse (L22, L23)."]
    },
    {
      reading: ["Read the chord chart", "Before playing, find every chord change in your song’s chart and count the bars between them."],
      technique: ["Two brushes per bar", "At 55–60 bpm, two quarter-note brushes per bar on one chord, then across two chords (L24)."],
      music: ["Hum and play eight bars", "Hum the tune over eight bars with eight consecutive downbeats. If the guitar follows the words, go back to one stroke per bar."]
    },
    {
      reading: ["Chords on the staff", "The note quiz’s chords level, or its Review round."],
      technique: ["Silent changes", "Rehearse each chord change silently: lift, move and place the fingers together, ten times."],
      music: ["Sing a tune you know", "Sing or hum a familiar tune over two or three open chords, one brush per bar."]
    }
  ],
  M08: [
    {
      reading: ["Accidentals in Greensleeves", "Clap the opening four bars of Greensleeves or the Leyenda theme, then play them three times at 50 bpm, checking each accidental (L25)."],
      technique: ["A soft single brush", "Replace the Malagueñas rasgueado with one soft outward i brush; four times, as quietly as you can (L26)."],
      music: ["Malagueñas, first phrase", "Play it twice slowly and shape it toward its strongest note."]
    },
    {
      reading: ["The chromatic passage", "Read the chromatic passage in groups of three notes and name the notes that are altered."],
      technique: ["Am – G – F – E", "The roots of the Andalusian cadence first, then the chords. Chord trainer › Chord library has them under Spanish colour."],
      music: ["Siciliano, melody and bass", "Four bars of melody, then the bass, then both at a comfortable pulse. Record two takes and compare the balance (L27)."]
    },
    {
      reading: ["Sharps, flats and naturals", "The note quiz’s accidentals level, or its Review round."],
      technique: ["Land on the beat", "Say the rhythm of a phrase before playing it, and land its last note exactly on its beat instead of hurrying toward the familiar part."],
      music: ["Record eight bars", "Record eight prepared bars of one piece with one phrase peak you chose beforehand."]
    }
  ],
  M09: [
    {
      reading: ["Count the eighths", "Compás trainer › Rumba at 60 bpm: count all eight eighths aloud for four cycles."],
      technique: ["The muted groove", "On muted strings at 60 bpm: down on 1, down–up on 2 and its “and”, a quiet mute on 3, down–up on 4 and its “and”."],
      music: ["Add brush groups", "Keep the hand moving and add one down–up group at a time, four bars each (L28)."]
    },
    {
      reading: ["Listen for the cycle", "Listen to the compás lesson’s example once without the guitar and find where each cycle begins (L29)."],
      technique: ["Tap the accents", "Compás trainer › Rumba: one round of Tap the accents. Aim for 80% or more."],
      music: ["Eight bars at 60 bpm", "Hold the groove for eight bars without a missed downbeat. Where you would pause for a percussive sound, play a quiet mute instead."]
    },
    {
      reading: ["Rumba chords", "Chord trainer: one-minute changes on Am–G or Em–D."],
      technique: ["Clap the model", "Clap the lesson’s model for four cycles, then record four more and check that your accents line up (L29)."],
      music: ["Choose a rumba pattern", "Pick one pattern from the rumba lesson, clap its accents, then play it at 60 bpm."]
    }
  ],
  M10: [
    {
      reading: ["E Phrygian from low E", "Play E–F–G–A–B–C–D–E at 50 bpm, naming each note. Sing F–E and play it three times (L30)."],
      technique: ["Picado", "Two i–m eighths per beat at 50 bpm on one treble string, then across two strings, in rest strokes."],
      music: ["Am – G – F – E", "Play the roots first, then the chords, and let the final E settle."]
    },
    {
      reading: ["F to E by ear", "Play F–E slowly and let E settle; then find F and E by ear in a phrase you play or record."],
      technique: ["Light rasgueado", "One light outward index brush per bar across muted strings at 50 bpm, four bars, twice. Keep the wrist loose (L31)."],
      music: ["A Phrygian phrase", "Make a short phrase from E, F and G and end it on E."]
    },
    {
      reading: ["Intervals and the scale", "The note quiz’s intervals and major scale level, or its Review round."],
      technique: ["Soft attack, small motion", "Eight even pairs of rest strokes at 50 bpm. If a stroke snaps, play softer and make the motion smaller."],
      music: ["Controlled brushes", "Four bars of controlled brushes at 50 bpm without losing the pulse."]
    }
  ],
  M11: [
    {
      reading: ["Tangos palmas", "Compás trainer › Tangos: clap with the palmas for four cycles, silent on 1."],
      technique: ["p–i–m–a over Am and E", "The thumb on each chord’s bass, i–m–a on strings 3–2–1, four cycles at 50 bpm (L33)."],
      music: ["Accent the top note", "Repeat the pattern and make the top note of each cycle louder than the rest (L33)."]
    },
    {
      reading: ["Clap the example", "Clap four cycles of the tangos lesson’s example, then add one bass note in its first two bars (L32)."],
      technique: ["Separate the parts", "Practise the tangos rhythm and the accompaniment pattern on their own before you combine them."],
      music: ["Werner pp. 84–87", "One accompaniment exercise: hum the treble while you play only the bass, then play it all."]
    },
    {
      reading: ["Changes for tangos", "Chord trainer: one-minute changes on E–F or F–G."],
      technique: ["Tap the accents", "Compás trainer › Tangos: one round of Tap the accents."],
      music: ["Clear bass, louder treble", "Four bars of p–i–m–a with a steady, clear bass and a deliberately louder treble."]
    }
  ],
  M12: [
    {
      reading: ["A fresh line, no audio", "Reading trainer › Sight-reading: read a four-bar line with the pulse intact, without listening first."],
      technique: ["Space and silence", "Play an open E bass every four beats; answer a two-bar E–F–G phrase and leave one beat of silence (L34)."],
      music: ["Eight bars over E", "Extend the phrase to eight bars and record it."]
    },
    {
      reading: ["Dynamics and articulation", "The note quiz’s dynamics or articulation level, or its Review round."],
      technique: ["Back to the motif", "When the improvisation keeps running, stop for a full beat and come back to the opening motif."],
      music: ["An Am – E variation", "Improvise over Am–E with a sustained bass and one clear change of dynamics."]
    },
    {
      reading: ["Soleá and bulerías", "Compás trainer: listen to two cycles of soleá, then tap its accents."],
      technique: ["A repeating pattern", "Borrow a sustained bass and a repeating pattern you like in Estas Tonne’s playing, and loop it for two minutes."],
      music: ["Record a chorus", "Record one chorus of accompaniment while humming; listen for the motif, the silence and the change of dynamics."]
    }
  ]
};

// Which of a module's three menus a date uses.
export function planFor(moduleId, date) {
  const menus = modulePlans[moduleId];
  if (!menus) return null;
  const [y, m, d] = String(date).split("-").map(Number);
  const day = Number.isFinite(Date.UTC(y, m - 1, d)) ? Math.floor(Date.UTC(y, m - 1, d) / 86400000) : 0;
  return menus[((day % menus.length) + menus.length) % menus.length];
}
