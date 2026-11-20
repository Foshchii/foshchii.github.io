# Guitar Academy

This static section is served at https://foshchii.com/guitar/ by the portfolio's existing GitHub Pages workflow. The academy lives in this directory and uses hash routes such as #day/1 and #lesson/L02.

## Update lessons

- Edit the exported course object in course.js. Module IDs (M01–M12), lesson IDs (L01–L35 and S01–S03) and day numbers are also progress keys. Keep them stable when revising content or replacing a video. Adjust the video ID and the direct watch URL together.
- The primary video sequence follows the order of Core entries. Supplemental entries appear under their module and in search. The roadmap links to the later alzapúa lesson.
- Edit support-videos.js for the optional videos shown under technique cards, Music Reading Academy tabs and module learning goals. Add the YouTube ID and publisher metadata to supportVideos, then reference the ID under the appropriate key in supportTopics.
- Edit estas-guide.js for the Estas Tonne piece studies, listening cues and original drills. Video cues can include a starting timestamp in seconds.
- A lesson or module id written in the plans (L04, M01) becomes a link to it on screen.
- Lesson materials link to the instructor's published pages. The reading-sheets PDF contains the academy's original drills. The interactive staff uses treble-clef, rest, sharp and flat outlines from Google's Noto Music font, licensed under the SIL Open Font License.
- Progress, activity checks, and practice notes use localStorage. Settings exports and merges a version-1 JSON backup. Nothing in the app uploads these records. Third-party video loads when the learner selects Play video. Nothing else is requested from another site: the fonts are in fonts/.

## Note-reading quiz

- note-reading/index.html is a separate page: a quiz in twelve levels on the staff, the fretboard, note lengths, rests, key signatures and guitar signs. The academy links to it from the Music Reading Academy screen, each day's reading resources and All sections; its Academy link leads back.
- It is one self-contained file, with its styles and script written out in full (not minified), so edit it in place. It uses the academy's fonts from fonts/ and its colours, and follows the light or dark choice saved in Settings.
- Progress stays in this browser under the localStorage key guitar-note-reading-v1. Like the academy, it loads nothing from another site.
- It can listen to the guitar through the microphone: play-it questions and the Play it practice mode, sight-reading (Practice › Sight-reading: generated four-bar melodies and eight well-known tunes, followed note by note), Explore's Listen button, and a tuner under Settings › Microphone. The pitch is found in the page itself (the YIN method), from short windows that are analysed and dropped; nothing is recorded or sent. Every play-it question can also be answered by tapping the fretboard, and every melody note by tapping its name.
- The fretboard keeps the string names pinned to its left edge while it scrolls, and a question's string is filled in and lit along its length.
- note-reading/manifest.webmanifest and note-reading/icons/ make it a Home Screen app of its own, separate from the academy's: it is called Note Quiz, opens on the quiz, and its icon has a note in place of the academy's strings. On an iPhone, a Home Screen app keeps its own progress, apart from Safari's.

## How it is put together

- index.html is the frame: header, footer, the phone tab bar and the icons (one `<symbol>` each, used as `#i-name`). It also holds a copy of the home page a first-time visitor sees, so that page is on screen before any script loads.
- views.js draws every screen as HTML. It never touches the page, so the same code runs in the browser and in the checks below. Add a screen there and list its name in `routes`.
- academy.js owns the learner's state and reacts to clicks, ticks and typing: saving progress, the reading trainer, video, backup, the journal, the theme and where Back returns you to.
- progress.js validates and stores the record. reading.js draws notation and makes the reading questions.
- practice-videos.js lists the videos for each day's exercises, lesson steps and drills. guided-lessons.js holds the step-by-step exercises, and guided-practice.js runs them: views.js leaves an empty `[data-guided-practice]` card where a lesson, a day or #reading/guided has them, and academy.js starts the exercise in it.
- academy.css holds the design: colours and type as custom properties at the top (light, and dark twice: once for the device setting, once for the choice in Settings), then one block per screen.
- fonts/ holds Cormorant Garamond and Commissioner (Latin and Cyrillic) with their licence. img/ holds smaller copies of guitar.webp and the share image. icons/ and manifest.webmanifest let a phone add the academy to its home screen.

## Preview and publish

From the website repository root on a Mac with Python and Node installed, run python3 -m http.server 8000 and open http://localhost:8000/guitar/.

Before publishing, run python3 .github/scripts/check_site.py. Besides the site's links and script syntax, it draws every academy screen from the course data and reports a lesson, video or link that points at nothing, or a screen that cannot be drawn.

If you changed what a new visitor's home page shows (Day 1, the first module or lesson, or the home screen itself), also run node .github/scripts/prerender_guitar.mjs to refresh the copy in index.html. The check prints a reminder when that copy is out of date. Forgetting it breaks nothing: the page redraws itself once its script loads.

The existing GitHub Actions workflow runs on main and publishes after its checks pass. Browsers keep the stylesheet and scripts for ten minutes. When a change to academy.css or academy.js must reach everyone at once with the new index.html, raise the number in `academy.css?v=` and `academy.js?v=` in index.html.
