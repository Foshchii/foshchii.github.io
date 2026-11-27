# Guitar Academy

This static section is served at https://foshchii.com/guitar/ by the portfolio's existing GitHub Pages workflow. The academy lives in this directory and uses hash routes such as #day/1 and #lesson/L02.

It is also an app: it installs on a phone or a computer, works offline, can sync progress between a learner's devices with a code (no account), and has a practice room (guided session, metronome, tuner, chord trainer, compás trainer) and a hero who earns experience for everything practised.

## Update lessons

- Edit the exported course object in course.js. Module IDs (M01–M12), lesson IDs (L01–L35 and S01–S03) and day numbers are also progress keys. Keep them stable when revising content or replacing a video. Adjust the video ID and the direct watch URL together.
- The primary video sequence follows the order of Core entries. Supplemental entries appear under their module and in search. The roadmap links to the later alzapúa lesson.
- Edit support-videos.js for the optional videos shown under technique cards, Music Reading Academy tabs and module learning goals. Add the YouTube ID and publisher metadata to supportVideos, then reference the ID under the appropriate key in supportTopics.
- Edit estas-guide.js for the Estas Tonne piece studies, listening cues and original drills. Video cues can include a starting timestamp in seconds.
- Edit plans.js for the daily practice after the first 28 days: three menus per module (M03–M12) that take turns by date, each with a reading, a technique and a music step. A tempo written as "at 50 bpm" sets the metronome in the guided session.
- A lesson or module id written in the plans (L04, M01) becomes a link to it on screen.
- Lesson materials link to the instructor's published pages. The reading-sheets PDF contains the academy's original drills. The interactive staff uses treble-clef, rest, sharp and flat outlines from Google's Noto Music font, licensed under the SIL Open Font License.
- Progress, activity checks, practice notes and the hero use localStorage. Settings exports and merges a version-1 JSON backup. Nothing in the app uploads these records unless the learner turns on sync; then an encrypted copy goes to the sync service (see Sync below). Third-party video loads when the learner selects Play video. Nothing else is requested from another site: the fonts are in fonts/.

## Note-reading quiz

- note-reading/index.html is a separate page: a quiz in eighteen levels. Eleven cover the staff, the fretboard, note lengths, rests, key signatures and guitar signs, the twelfth is an exam at the 12th fret, and six more go beyond it: high notes above the staff, dynamics, articulation, repeats and road signs, intervals and the major scale, and chords. Practice adds signs and symbols, intervals on the staff and chords (shapes and written chords). The academy links to it from the Music Reading Academy screen, each day's reading resources and All sections; its Academy link leads back.
- It is one self-contained file, with its styles and script written out in full (not minified), so edit it in place. It uses the academy's fonts from fonts/ and its colours, and follows the light or dark choice saved in Settings.
- Progress stays in this browser under the localStorage key guitar-note-reading-v1. Every question keeps a spaced-review record (a box from 0 to 7 and a due time): a right answer sends it away for about a day, then 3 days, a week, 16 days, 35 days, 75 days and 160 days; a wrong one brings it back within a minute. Practice asks what is due first, then new items, and leaves learned ones alone until they are due; the Play page offers a Review round of everything due. A level left half way continues where it was left (runs in the store), and a finished level only asks its due questions. Answers saved before spaced review existed are turned into boxes from their run of right answers. Like the academy, it loads nothing from another site.
- It shares the academy's offline worker and sync: ../quiz-link.js registers ../sw.js and loads ../sync.js, and the quiz's Cloud object hands its record to sync when it is not running inside Claude's artifact viewer. Its points count toward the hero in the academy (half a point of experience each), shared among the skills of the questions answered.
- It can listen to the guitar through the microphone: play-it questions and the Play it practice mode, sight-reading (Practice › Sight-reading: generated four-bar melodies and eight well-known tunes, followed note by note), Explore's Listen button, and a tuner under Settings › Microphone. The pitch is found in the page itself (the YIN method), from short windows that are analysed and dropped; nothing is recorded or sent. Every play-it question can also be answered by tapping the fretboard, and every melody note by tapping its name.
- The fretboard keeps the string names pinned to its left edge while it scrolls, and a question's string is filled in and lit along its length.
- Ear training (Practice › Ear training): higher or lower, intervals (named and counted in frets, each with a well-known tune that starts with it), naming a note after a C, major or minor chords (the chord's shape is shown afterwards), and Play it back (an open string, then a note on it: play it, or tap the fretboard). The staff and accidentals levels each include one ear question.
- Tap the rhythm (Practice › Rhythm and keys, and one card in each rhythm level): two measures of rhythm, a count-in, then one tap per note on a big pad, the space bar, or the guitar or a clap through the microphone. Taps are graded after taking away a steady delay of up to 0.2 seconds, so Bluetooth headphones do not count against the player.
- note-reading/manifest.webmanifest and note-reading/icons/ make it a Home Screen app of its own, separate from the academy's: it is called Note Quiz, opens on the quiz, and its icon has a note in place of the academy's strings. On an iPhone, a Home Screen app keeps its own progress, apart from Safari's.

## The hero

- rpg.js works out the hero every time it is shown, from the academy's record and the note quiz's: experience, level and title, six skills (Technique, Reading, Rhythm, Ear, Harmony, Repertoire), streaks, daily and weekly quests, the twelve chapters with their bosses, and achievements. Nothing in it is a running total two devices could disagree about.
- What each thing is worth is in `rewards`: a lesson watched 10, practised 25, mastered 50; a module assessment 150; a day of the first four weeks 40; a step of the daily session 8 (six a day); a journal entry 10 plus 1 for every two minutes (up to two hours); note quiz points count half. Levels ask 100 experience for level 2 and 50 more for each level after that (`levelStart`); titles change at the levels in `titles`.
- Each module trains the skill in `moduleSkill`. Its boss (`bosses`) is the module's "Common error" from course.js, and passing the module's assessment beats it: the boss card shows the error, the Pass criterion and the Repair advice.
- Quests: three daily quests, the first about today's session, the other two drawn for the date (so every device shows the same ones), plus 30 for finishing all three; two weekly quests. A quest with `from` waits until that module. Achievements are listed in `badges` with the test that earns them.
- Earned quests and achievements are saved once (progress.quests, progress.badges) by `claim`, which academy.js calls after every change and when the page opens. Practice tools add to this device's tallies (progress.counters) and set personal bests (progress.records); experience from a tool is capped per day and per tool in academy.js (`toolApi.reward`).
- The hero screen is #hero. Today shows the hero card and the daily quests to a returning learner; the header shows the level.

## The practice room

- #practice lists the tools; each one is #practice/<tool> and is drawn by its own file into the screen's `[data-tool]` card: tool-session.js (today's plan one step at a time, with a countdown, a bell and the screen kept awake), tool-metronome.js (tap tempo, subdivisions, speed trainer), tool-tuner.js (microphone tuner and reference notes), tool-chords.js (one-minute changes, name the chord, the chord library) and tool-compas.js (rumba, tangos, soleá, bulerías and seguiriyas, with a tap-the-accents round). academy.js mounts the tool when the screen opens and unmounts it when the screen changes, passing `toolApi`.
- chords.js holds the chord shapes (string 6 first), the chord pairs for one-minute changes by module, and the compás cycles; check_guitar.mjs checks them. Rumba follows Module 9's preparation groove.
- audio.js makes all the tools' sounds in the page: clicks, a plucked nylon string (Karplus–Strong, softened like a fingertip and tuned exactly), strums, palmas and a bell. pitch.js finds the pitch for the tuner with the note quiz's YIN method. Nothing is recorded or sent.
- While a tool runs, a level gained shows as a toast rather than the level-up dialog, so it never interrupts playing.

## The app: install and offline

- manifest.webmanifest names the app, its icons, shortcuts (Session, Metronome, Tuner, Hero, with icons/shortcut-*.png) and the screenshots the install dialog shows (img/screens/). Settings explains installing for each browser and offers the browser's own Install button when there is one; Today offers it to a returning learner until they dismiss it.
- sw.js is the offline worker for the whole of /guitar/, the note quiz included. It keeps every file the academy needs and serves them from that copy, so the app opens at once and without a connection. Its file list and version are written by .github/scripts/stamp_guitar_sw.mjs from the files themselves; run it after any change in this directory. A new version installs beside the old one, and the page offers it with "A new version of the academy is ready" (app.js). The score videos and the reading sheets are kept when they are opened in full or when Settings › Offline saves them; videos play from that copy with range requests, as Safari needs.
- app.js registers the worker and tracks installing, updating and being online; the banner under the header says when the academy is offline.

## Sync

- sync.js keeps the same progress on all of a learner's devices without an account. Turning sync on makes a code; the code's link (#sync/CODE) or QR code (qr.js) joins another device. The record is compressed and encrypted in the browser with a key made from the code, and the server keeps only that encrypted copy under a hash of a token also made from the code.
- progress.js stamps every tick, untick and choice with its time and keeps deleted journal entries as tombstones, so merging two devices' records keeps whichever change came last. quiz-store.js merges the note quiz's record exactly as the quiz does (check_guitar.mjs compares the two).
- The server side is ../sync-api/schema.sql, for a Supabase project; ../sync-api/README.md explains it and how to set it up. sync-config.js holds the project URL and its publishable key; with the URL empty, the sync screen says sync is not set up here.

## How it is put together

- index.html is the frame: header, footer, the phone tab bar and the icons (one `<symbol>` each, used as `#i-name`). It also holds a copy of the home page a first-time visitor sees, so that page is on screen before any script loads.
- views.js draws every screen as HTML. It never touches the page, so the same code runs in the browser and in the checks below. Add a screen there and list its name in `routes`.
- academy.js owns the learner's state and reacts to clicks, ticks and typing: saving progress, the reading trainer, video, backup, the journal, the theme and where Back returns you to.
- progress.js validates, merges and stores the record; change it only through its functions (setMark, setChoice, removeEntry, addCount, setRecord, earn, setProfile), which keep the times sync needs. reading.js draws notation and makes the reading questions.
- practice-videos.js lists the videos for each day's exercises, lesson steps and drills. guided-lessons.js holds the step-by-step exercises, and guided-practice.js runs them: views.js leaves an empty `[data-guided-practice]` card where a lesson, a day or #reading/guided has them, and academy.js starts the exercise in it.
- academy.css holds the design: colours and type as custom properties at the top (light, and dark twice: once for the device setting, once for the choice in Settings), then one block per screen.
- fonts/ holds Cormorant Garamond and Commissioner (Latin and Cyrillic) with their licence. img/ holds smaller copies of guitar.webp and the share image. icons/ and manifest.webmanifest let a phone add the academy to its home screen.

## Preview and publish

From the website repository root on a Mac with Python and Node installed, run python3 -m http.server 8000 and open http://localhost:8000/guitar/.

Before publishing, run python3 .github/scripts/check_site.py. Besides the site's links and script syntax, it draws every academy screen from the course data and reports a lesson, video or link that points at nothing, or a screen that cannot be drawn.

If you changed what a new visitor's home page shows (Day 1, the first module or lesson, or the home screen itself), also run node .github/scripts/prerender_guitar.mjs to refresh the copy in index.html. The check prints a reminder when that copy is out of date. Forgetting it breaks nothing: the page redraws itself once its script loads.

After any change in this directory, run node .github/scripts/stamp_guitar_sw.mjs last (after the prerender, which changes index.html). It gives the offline worker the new file list and version; without it installed apps would keep the old version, so the check fails until it is done.

The existing GitHub Actions workflow runs on main and publishes after its checks pass. Browsers keep the stylesheet and scripts for ten minutes. When a change to academy.css or academy.js must reach everyone at once with the new index.html, raise the number in `academy.css?v=` and `academy.js?v=` in index.html. Once the offline worker has taken over, it serves each version as a whole, and the next launch after a publish picks up the new one.
