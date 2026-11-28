#!/usr/bin/env node
// Checks the Guitar Academy (guitar/) the way check_site.py checks the rest of the site.
// The academy draws its screens in the browser from course.js, support-videos.js and
// estas-guide.js, so a typo in a lesson id or a missing field never shows up as a broken
// link in the HTML. This draws every screen in Node, with the code the browser runs, and reports:
//   - a lesson, module, day, video or piece that points at something that does not exist,
//     including the exercise videos in practice-videos.js and the score clips in media/
//   - a lesson whose watch URL and video id disagree
//   - a screen that fails to draw, or draws "undefined"
//   - a link inside the academy (#lesson/L07, #estas/…) that leads to "Page not found"
//   - an icon that index.html does not define
//   - chord shapes, chord-change pairs and compás cycles that are malformed (chords.js)
//   - bosses, skills and achievements that do not add up (rpg.js)
//   - quiz-store.js no longer merging the note quiz's record the way the quiz itself does
//   - a file named in a web app manifest (icons, screenshots, shortcuts) that does not exist
//   - the QR code for the sync link changing shape (qr.js)
//
//     node .github/scripts/check_guitar.mjs
//
// check_site.py runs it and reads its output: one "ERROR<tab>file<tab>message" or
// "NOTE<tab>file<tab>message" per line. It exits 0 either way; check_site.py decides.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const guitar = new URL("../../guitar/", import.meta.url);
const said = new Set();
const say = (kind, file, message) => {
  const line = `${kind}\t${file}\t${message}`;
  if (!said.has(line)) console.log(line);
  said.add(line);
};
const error = (file, message) => say("ERROR", "guitar/" + file, message);
const note = (file, message) => say("NOTE", "guitar/" + file, message);

let views, course, supportTopics, supportVideos, estasPieces, estasVideos, estasDrills, readingModes, score, emptyProgress, newQuestion, practice, guided, fretPositions;
let progressApi, rpg, chordData, quizStore, qr, plans;
try {
  views = await import(new URL("views.js", guitar));
  ({ course } = await import(new URL("course.js", guitar)));
  ({ supportTopics, supportVideos } = await import(new URL("support-videos.js", guitar)));
  ({ estasPieces, estasVideos, estasDrills } = await import(new URL("estas-guide.js", guitar)));
  ({ readingModes, score, newQuestion } = await import(new URL("reading.js", guitar)));
  ({ emptyProgress } = await import(new URL("progress.js", guitar)));
  practice = await import(new URL("practice-videos.js", guitar));
  guided = await import(new URL("guided-lessons.js", guitar));
  ({ fretPositions } = await import(new URL("reading.js", guitar)));
  progressApi = await import(new URL("progress.js", guitar));
  rpg = await import(new URL("rpg.js", guitar));
  chordData = await import(new URL("chords.js", guitar));
  quizStore = await import(new URL("quiz-store.js", guitar));
  qr = await import(new URL("qr.js", guitar));
  plans = await import(new URL("plans.js", guitar));
} catch (failure) {
  error("views.js", `the academy's modules do not load: ${failure.message}`);
  process.exit(0);
}

// ---------------------------------------------------------------- course data

const moduleIds = new Set(course.modules.map(module => module.id));
const lessonIds = new Set();
for (const module of course.modules) {
  if (!/^M\d{2}$/.test(module.id)) error("course.js", `module id "${module.id}" should look like M01`);
  for (const field of ["title", "weeks", "Prerequisite", "Goal", "Play", "Common error", "Pass", "Repair"]) {
    if (typeof module[field] !== "string" || !module[field].trim()) error("course.js", `module ${module.id} has no "${field}"`);
  }
}
if (moduleIds.size !== course.modules.length) error("course.js", "two modules share an id");

for (const lesson of course.lessons) {
  const where = `lesson ${lesson.id}`;
  if (!/^[LS]\d{2}$/.test(lesson.id ?? "")) error("course.js", `lesson id "${lesson.id}" should look like L01 or S01 (progress is saved under it)`);
  if (lessonIds.has(lesson.id)) error("course.js", `${where} appears twice`);
  lessonIds.add(lesson.id);
  for (const field of ["title", "teacher", "channel", "language", "url", "video", "objective", "adaptation", "material", "drill", "kind"]) {
    if (typeof lesson[field] !== "string" || !lesson[field].trim()) error("course.js", `${where} has no "${field}"`);
  }
  if (!["Core", "Supplement", "Roadmap"].includes(lesson.kind)) error("course.js", `${where} has kind "${lesson.kind}"; use Core, Supplement or Roadmap`);
  if (lesson.kind !== "Roadmap" && !moduleIds.has(lesson.module)) error("course.js", `${where} belongs to module "${lesson.module}", which does not exist`);
  if (lesson.url && lesson.video && !lesson.url.includes(lesson.video)) error("course.js", `${where}: url and video id disagree (${lesson.url} vs ${lesson.video})`);
  if (lesson.material && !/^https:\/\//.test(lesson.material)) error("course.js", `${where}: material should be an https link`);
  if (lesson.language && !["English", "Ukrainian", "Russian"].includes(lesson.language)) note("course.js", `${where} is in ${lesson.language}, which the curriculum's language filter does not list`);
  if (lesson.steps && !lesson.steps.every(step => Array.isArray(step) && step.length === 2)) error("course.js", `${where}: each step should be [title, text]`);
}
for (const module of course.modules) {
  if (!course.lessons.some(lesson => lesson.kind === "Core" && lesson.module === module.id)) error("course.js", `module ${module.id} has no Core lesson`);
}

course.days.forEach((day, index) => {
  if (day.id !== index + 1) error("course.js", `day ${index + 1} has id ${day.id}; days must run 1, 2, 3… (progress is saved under the number)`);
  for (const id of `${day.watch} ${day.practice}`.match(/\b(?:[LS]\d{2}|M\d{2})\b/g) ?? []) {
    if (!lessonIds.has(id) && !moduleIds.has(id)) error("course.js", `day ${day.id} mentions ${id}, which does not exist`);
  }
});

// ---------------------------------------------------------------- videos

for (const [topic, list] of Object.entries(supportTopics)) {
  for (const [id] of list) {
    if (!supportVideos[id] && !estasVideos[id]) error("support-videos.js", `topic "${topic}" lists video ${id}, which has no entry in supportVideos`);
  }
}
const topicsUsed = [...moduleIds, "hand-position", "speed-control", ...course.techniques.map(technique => technique.id), ...readingModes.map(mode => mode.id)];
for (const topic of topicsUsed) {
  if (!supportTopics[topic]) error("support-videos.js", `supportTopics has no "${topic}" entry, which the academy shows videos for`);
}
const pieceIds = new Set();
for (const piece of estasPieces) {
  if (pieceIds.has(piece.id)) error("estas-guide.js", `piece "${piece.id}" appears twice`);
  pieceIds.add(piece.id);
  for (const [id] of piece.videos ?? []) {
    if (!estasVideos[id] && !supportVideos[id]) error("estas-guide.js", `piece "${piece.id}" lists video ${id}, which has no entry in estasVideos or supportVideos`);
  }
}
for (const drill of estasDrills) {
  try { score(drill.bars, { label: drill.label }); } catch (failure) { error("estas-guide.js", `drill "${drill.title}" cannot be drawn: ${failure.message}`); }
}

// practice-videos.js: every list is [[video id, cue, label, start, end], …], sometimes nested per step.
const videoLists = (value, found = []) => {
  if (Array.isArray(value) && typeof value[0] === "string" && typeof value[1] === "string") found.push(value);
  else if (Array.isArray(value)) value.forEach(item => videoLists(item, found));
  else if (value && typeof value === "object") Object.values(value).forEach(item => videoLists(item, found));
  return found;
};
for (const [name, value] of Object.entries(practice)) {
  if (name === "extraVideos") continue;
  const lists = name === "dailyExercises"
    ? Object.values(value).flatMap(day => day.flatMap(exercise => exercise[2] ?? []))
    : videoLists(value);
  for (const [id, cue] of lists) {
    if (!views.videoInfo(id)) error("practice-videos.js", `${name} lists video ${id} ("${String(cue).slice(0, 40)}…"), which has no title and channel anywhere`);
  }
}
for (const day of course.days) {
  if (!Array.isArray(practice.dailyExercises[day.id]) || !practice.dailyExercises[day.id].length) error("practice-videos.js", `dailyExercises has nothing for day ${day.id}`);
}
for (const id of Object.keys(practice.lessonPracticeVideos).concat(Object.keys(practice.lessonStepVideos))) {
  if (!lessonIds.has(id)) error("practice-videos.js", `videos are listed for lesson ${id}, which does not exist`);
}
for (const id of Object.keys(practice.modulePracticeVideos)) {
  if (!moduleIds.has(id)) error("practice-videos.js", `videos are listed for module ${id}, which does not exist`);
}
for (const id of Object.keys(practice.estasStepVideos)) {
  if (!pieceIds.has(id)) error("practice-videos.js", `videos are listed for the piece "${id}", which does not exist`);
}

// guided-lessons.js: every step must be one guided-practice.js can draw, and every note it
// asks for must be playable where the step says to look for it.
const guidedTypes = new Set(["check", "tune", "find", "rhythm", "play"]);
const checkSteps = (where, steps) => {
  if (!Array.isArray(steps) || !steps.length) { error("guided-lessons.js", `${where} has no steps`); return; }
  steps.forEach((step, index) => {
    const at = `${where}, step ${index + 1}`;
    if (!guidedTypes.has(step.type)) error("guided-lessons.js", `${at} has type "${step.type}"; use ${[...guidedTypes].join(", ")}`);
    if (!step.title || !step.instruction) error("guided-lessons.js", `${at} needs a title and an instruction`);
    try {
      if (step.type === "check" && !step.confirm) error("guided-lessons.js", `${at} needs the text of its confirm button`);
      if (step.type === "find") {
        for (const pitch of step.targets ?? []) {
          if (!fretPositions(pitch, step.frets).some(place => step.strings.includes(place.string))) error("guided-lessons.js", `${at}: ${pitch} cannot be played on strings ${step.strings.join(", ")} within ${step.frets} frets`);
        }
      }
      if (step.type === "rhythm") score([step.bar.map(([pitch, beats]) => ({ pitch, beats }))]);
      if (step.type === "play" && !step.fresh) {
        for (const bar of step.bars) for (const [pitch, , bass] of bar) for (const name of [pitch, bass].filter(Boolean)) {
          if (!fretPositions(name)[0]) error("guided-lessons.js", `${at}: ${name} has no first-position fret`);
        }
        score(step.bars.map(bar => bar.map(([pitch, beats, bass]) => ({ pitch, beats, bass }))), { beatsPerBar: step.beatsPerBar ?? 4 });
      }
    } catch (failure) {
      error("guided-lessons.js", `${at} cannot be drawn: ${failure.message}`);
    }
  });
};
for (const [id, steps] of Object.entries(guided.guidedCoreLessons)) {
  if (!lessonIds.has(id)) error("guided-lessons.js", `guided steps are listed for lesson ${id}, which does not exist`);
  checkSteps(`lesson ${id}`, steps);
}
for (const [id, steps] of Object.entries(guided.guidedDays)) {
  if (!course.days.some(day => String(day.id) === id)) error("guided-lessons.js", `guided steps are listed for day ${id}, which does not exist`);
  checkSteps(`day ${id}`, steps);
}
checkSteps("the fretboard lesson (guidedTheory)", guided.guidedTheory);

// ---------------------------------------------------------------- chords and compás (chords.js)

for (const chord of chordData.chords) {
  const where = `chord ${chord.id}`;
  if (chord.frets?.length !== 6 || chord.fingers?.length !== 6) error("chords.js", `${where} needs six frets and six fingers, string 6 first`);
  chord.frets?.forEach((fret, i) => {
    if (fret !== "x" && !(Number.isInteger(fret) && fret >= 0 && fret <= 12)) error("chords.js", `${where}: string ${6 - i} has fret ${fret}; use a number or "x"`);
    const finger = chord.fingers?.[i];
    if (!Number.isInteger(finger) || finger < 0 || finger > 4) error("chords.js", `${where}: string ${6 - i} has finger ${finger}; use 0–4`);
    if (Number.isInteger(fret) && fret > 0 && !finger) error("chords.js", `${where}: string ${6 - i} is fretted but has no finger`);
    if ((fret === 0 || fret === "x") && finger) error("chords.js", `${where}: string ${6 - i} is ${fret === 0 ? "open" : "not played"} but has finger ${finger}`);
  });
  if (!chord.name || !chord.tip) error("chords.js", `${where} needs a name and a tip`);
}
for (const group of chordData.changePairs) {
  if (!moduleIds.has(group.module)) error("chords.js", `chord pairs "${group.label}" belong to module ${group.module}, which does not exist`);
  for (const pair of group.pairs) for (const id of pair) if (!chordData.chordIndex.has(id)) error("chords.js", `chord pair ${pair.join("–")} uses ${id}, which is not in the chord list`);
}
for (const palo of chordData.palos) {
  const steps = palo.stepLabels ?? palo.counts;
  if (palo.stepLabels && palo.stepLabels.length !== palo.counts.length) error("chords.js", `${palo.name}: stepLabels and counts differ in length`);
  for (const accent of palo.accents) if (!steps.includes(accent)) error("chords.js", `${palo.name}: accent ${accent} is not one of its steps`);
  for (const clap of palo.palmas ?? []) if (!palo.counts.includes(clap)) error("chords.js", `${palo.name}: palmas on ${clap}, which is not one of its counts`);
  if (palo.strokes && palo.strokes.length !== palo.counts.length) error("chords.js", `${palo.name}: one stroke per step, please`);
  const [slow, start, fast] = palo.tempo ?? [];
  if (!(slow < start && start < fast)) error("chords.js", `${palo.name}: tempo should be [slowest, start, fastest]`);
  if (!moduleIds.has(palo.module)) error("chords.js", `${palo.name} belongs to module ${palo.module}, which does not exist`);
  try { chordData.compasSvg(palo); } catch (failure) { error("chords.js", `${palo.name} cannot be drawn: ${failure.message}`); }
}

// ---------------------------------------------------------------- daily menus after day 28 (plans.js)

for (const module of course.modules.slice(2)) {
  const menus = plans.modulePlans[module.id];
  if (!Array.isArray(menus) || menus.length !== 3) { error("plans.js", `module ${module.id} needs three daily menus`); continue; }
  menus.forEach((menu, i) => {
    for (const part of ["reading", "technique", "music"]) {
      const step = menu[part];
      if (!Array.isArray(step) || step.length !== 2 || !step.every(text => typeof text === "string" && text.trim())) error("plans.js", `module ${module.id}, menu ${i + 1}: "${part}" should be [label, what to do]`);
      for (const id of `${step?.[1] ?? ""}`.match(/\b(?:[LS]\d{2}|M\d{2})\b/g) ?? []) {
        if (!lessonIds.has(id) && !moduleIds.has(id)) error("plans.js", `module ${module.id}, menu ${i + 1} mentions ${id}, which does not exist`);
      }
    }
  });
}
for (const id of Object.keys(plans.modulePlans)) if (!moduleIds.has(id)) error("plans.js", `menus are listed for module ${id}, which does not exist`);

// ---------------------------------------------------------------- the hero (rpg.js)

for (const module of course.modules) {
  if (!rpg.bosses[module.id]) error("rpg.js", `module ${module.id} has no boss in bosses`);
  if (!rpg.skills.some(skill => skill.id === rpg.moduleSkill[module.id])) error("rpg.js", `module ${module.id} trains no known skill in moduleSkill`);
}
const badgeIds = new Set();
for (const badge of rpg.badges) {
  if (badgeIds.has(badge.id)) error("rpg.js", `achievement ${badge.id} appears twice`);
  badgeIds.add(badge.id);
  if (!/^[a-z0-9-]{2,40}$/.test(badge.id)) error("rpg.js", `achievement id ${badge.id} cannot be saved (lowercase letters, digits and dashes)`);
  if (!(badge.xp > 0)) error("rpg.js", `achievement ${badge.id} is worth no experience`);
}
if (rpg.titles.some(([level], i) => i && level <= rpg.titles[i - 1][0])) error("rpg.js", "titles must be in order of level");

// A record full of everything the hero counts, to draw its screens and to test merging.
const rich = progressApi.emptyProgress();
progressApi.setMark(rich, "days/1", true, 1767225600000);
progressApi.setMark(rich, "lessons/L01/practised", true, 1767225600000);
progressApi.setMark(rich, "assessments/M01", true, 1767225600000);
progressApi.setMark(rich, "activities/2026-01-01/day-2/25/reading", true, 1767225600000);
progressApi.addCount(rich, "dcheck0001", "xp.rhythm", 12, "2026-01-01");
progressApi.addCount(rich, "dcheck0001", "sec.metronome", 600, "2026-01-01");
progressApi.setRecord(rich, "changes.Am-E", 18);
progressApi.earn(rich, "badges", "first-steps");
progressApi.earn(rich, "quests", "2026-01-01/steps");
progressApi.setProfile(rich, { name: "Check", path: "both" });
try {
  const again = progressApi.readProgress(JSON.parse(JSON.stringify(rich)));
  if (JSON.stringify(progressApi.mergeProgress(again, rich)) !== JSON.stringify(progressApi.mergeProgress(rich, again))) error("progress.js", "merging a record with its own copy depends on the order");
} catch (failure) {
  error("progress.js", `a full record does not survive a backup: ${failure.message}`);
}

// ---------------------------------------------------------------- the note quiz's store, two ways

// quiz-store.js copies the quiz page's blankStore, sanitizeStore and Store.merge. Run both on the
// same records: if the quiz changes how it keeps or merges progress, change quiz-store.js too.
{
  const { default: vm } = await import("node:vm");
  const page = readFileSync(new URL("note-reading/index.html", guitar), "utf8");
  const start = page.indexOf("const STORE_KEY = 'guitar-note-reading-v1';");
  const end = page.indexOf("/* Sync. Inside Claude's artifact viewer");
  if (start < 0 || end < 0) error("quiz-store.js", "cannot find the store code in note-reading/index.html to compare with");
  else {
    const code = page.slice(start, end);
    const quizFor = (local, device) => {
      const saved = new Map([["guitar-note-reading-device", device]]);
      if (local) saved.set("guitar-note-reading-v1", JSON.stringify(local));
      const sandbox = { localStorage: { getItem: k => saved.get(k) ?? null, setItem: (k, v) => saved.set(k, String(v)), removeItem: k => saved.delete(k) }, Cloud: { schedule() {}, writeNow() {} } };
      vm.createContext(sandbox);
      vm.runInContext(code + ";globalThis.api = { Store, sanitizeStore };", sandbox);
      return sandbox.api;
    };
    let seed = 99;
    const random = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const record = () => ({
      v: 2, days: ["2026-01-01", "2026-01-03"].filter(() => random() > .3), lessons: random() > .5 ? { names: 1767225600000 } : {},
      items: Object.fromEntries(["read:G4", "ear:iv3", "tap:a1", "chord:Am"].filter(() => random() > .3).map(key => [key, { n: 3, c: Math.floor(random() * 4), h: "101", t: 1767225600000 + Math.floor(random() * 1e8), ...(random() > .4 ? { b: 2, d: 1767225600000 } : {}) }])),
      levels: random() > .4 ? { staff: { s: Math.floor(random() * 4), p: Math.floor(random() * 100), at: 1767225600000 + Math.floor(random() * 1e8) } } : {},
      xp: Object.fromEntries(["dcheck0001", "dother0002"].filter(() => random() > .3).map(id => [id, { t: Math.floor(random() * 500), d: { "2026-01-01": 20 }, at: 1767225600000 + Math.floor(random() * 1e8) }])),
      runs: {}, rounds: {}, best: {}, tunes: random() > .5 ? { ode: { p: Math.floor(random() * 100), at: 1 } } : {},
      settings: { sound: random() > .5 }, practice: {}, settingsAt: Math.floor(random() * 3), updated: 1, resetAt: random() > .85 ? 1767225600000 + Math.floor(random() * 1e8) : 0
    });
    const sorted = value => Array.isArray(value) ? value.map(sorted) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])])) : value;
    for (let i = 0; i < 60; i++) {
      const local = record(), remote = record();
      const original = quizFor(local, "dcheck0001");
      const changedThere = original.Store.merge(JSON.parse(JSON.stringify(remote)));
      const mine = quizStore.sanitizeQuiz(JSON.parse(JSON.stringify(local)));
      const changedHere = quizStore.mergeQuiz(mine, JSON.parse(JSON.stringify(remote)), "dcheck0001");
      if (JSON.stringify(sorted(JSON.parse(JSON.stringify(original.Store.data)))) !== JSON.stringify(sorted(mine)) || changedThere !== changedHere) {
        error("quiz-store.js", "mergeQuiz no longer merges the way the note quiz's Store.merge does; bring quiz-store.js in line with note-reading/index.html");
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- the sync link's QR code (qr.js)

{
  const matrix = qr.qrMatrix("https://foshchii.com/guitar/#sync/7QKM-2XRD-9HFA-ZP3W-R8TC");
  const bits = matrix.map(row => row.map(on => on ? 1 : 0).join("")).join("");
  const { createHash } = await import("node:crypto");
  const shape = createHash("sha256").update(bits).digest("hex").slice(0, 16);
  // Checked against a QR decoder when qr.js was written; a change here means the encoder changed.
  if (matrix.length !== 33 || shape !== "d04d18745d734f7e") error("qr.js", `the sync link's QR code changed (size ${matrix.length}, shape ${shape}); decode it with a QR reader before trusting the change`);
}

// ---------------------------------------------------------------- every screen

const state = (progress, extra = {}) => ({
  progress, storageOk: true, reading: { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 },
  question: newQuestion("notes", "open"), answer: undefined, theme: "auto", confirmDelete: null, today: "0000-00-00", ...extra
});
// The hero, the sync screen and the install card each have several forms; draw the busiest too.
const busy = {
  quiz: quizStore.sanitizeQuiz({ xp: { dcheck0001: { t: 120, d: { "2026-01-01": 120 }, at: 1 } }, items: { "read:G4": { n: 2, c: 2, h: "11", t: 1, b: 1, d: 1 } }, levels: { staff: { s: 2, p: 80, at: 1 } } }),
  app: { installable: true, offlineReady: true, online: true },
  sync: { configured: true, on: true, code: "7QKM2XRD9HFAZP3WR8TC", status: "synced", at: 1767225600000, link: "https://foshchii.com/guitar/#sync/7QKM-2XRD-9HFA-ZP3W-R8TC", share: true }
};
// A learner past the first 28 days, in module 5: Today shows that module's menu.
const later = emptyProgress();
for (let day = 1; day <= 28; day++) later.days[day] = true;
for (const id of ["M01", "M02", "M03", "M04"]) later.assessments[id] = true;
const practised = emptyProgress();
practised.lastLesson = course.lessons[0]?.id ?? null;
practised.lessons[course.lessons[0]?.id] = { watched: true, practised: true };
practised.days[1] = true;
practised.journal.push({ id: "check-entry", date: "2026-01-01", minutes: 25, updatedAt: 1, exercises: "x", piece: "y", difficulty: "", notes: "", skills: "" });

const screens = [
  ["home"], ["course"], ["days"], ["technique"], ["estas"], ["reading"], ["reading", "guided"], ["repertoire"], ["roadmap"], ["journal"], ["journal", "check-entry"],
  ["progress"], ["settings"], ["about"], ["menu"], ["hero"], ["practice"], ...views.practiceTools.map(tool => ["practice", tool]),
  ["sync"], ["sync", "7QKM-2XRD-9HFA-ZP3W-R8TC"],
  ...course.modules.map(module => ["module", module.id]),
  ...course.lessons.map(lesson => ["lesson", lesson.id]),
  ...course.days.map(day => ["day", String(day.id)]),
  ...estasPieces.map(piece => ["estas", piece.id])
];
const drawn = [];
for (const [progress, extra] of [[emptyProgress(), {}], [practised, {}], [rich, busy], [practised, { app: { ios: true }, sync: { configured: true, on: false } }], [later, { today: "2026-03-02" }]]) {
  for (const [page, id] of screens) {
    const name = "#" + page + (id ? "/" + id : "");
    try {
      const result = views.renderRoute(state(progress, extra), page, id);
      if (!result.found) error("views.js", `${name} draws "Page not found"`);
      const slip = /\bundefined\b|\[object Object\]|\bNaN\b/.exec(result.html.replace(/<[^>]*>/g, " "));
      if (slip) error("views.js", `${name} shows "${slip[0]}" on screen; a field is probably missing in the course data`);
      drawn.push([name, result.html]);
    } catch (failure) {
      error("views.js", `${name} cannot be drawn: ${failure.message}`);
    }
  }
}
for (const mode of readingModes) {
  for (const level of ["open", "treble", "bass"]) {
    try { newQuestion(mode.id, level, undefined, 4); } catch (failure) { error("reading.js", `the "${mode.label}" exercise fails for the ${level} range: ${failure.message}`); }
  }
}

// ---------------------------------------------------------------- links and icons

const shell = readFileSync(new URL("index.html", guitar), "utf8");
const icons = new Set([...shell.matchAll(/<symbol id="i-([\w-]+)"/g)].map(match => match[1]));
const leadsSomewhere = href => {
  const [page, id, extra] = href.slice(1).split("/");
  if (page === "main" && !id) return true;
  if (extra !== undefined || !views.routes.includes(page)) return false;
  if (page === "reading") return !id || views.readingScreens.includes(id);
  if (page === "technique" && id) return ["hand-position", "speed-control", ...course.techniques.map(technique => technique.id)].includes(id);
  if (page === "journal") return true;                                                // #journal/<entry id>
  if (page === "sync") return true;                                                   // #sync/<code>
  if (page === "practice") return !id || views.practiceTools.includes(id);
  try {
    return views.renderRoute(state(emptyProgress()), page, id).found;
  } catch {
    return true;   // the screen itself is broken, which is already reported above
  }
};
const seen = new Set();
for (const [name, html] of [["index.html", shell], ...drawn]) {
  for (const [, href] of html.matchAll(/href="(#[^"]*)"/g)) {
    if (href.startsWith("#i-")) {
      if (!icons.has(href.slice(3)) && !seen.has(href)) error("index.html", `${name} uses the icon ${href}, which index.html does not define`);
    } else if (!leadsSomewhere(href) && !seen.has(href)) {
      error(name === "index.html" ? "index.html" : "views.js", `${name} links to ${href}, which leads to "Page not found"`);
    }
    seen.add(href);
  }
}

// ---------------------------------------------------------------- files the page asks for

const asked = new Set();
for (const [name, html] of [["index.html", shell], ...drawn]) {
  const targets = [...html.matchAll(/\b(?:href|src)="([^"#][^"]*)"/g)].map(match => match[1])
    .concat([...html.matchAll(/\bsrcset="([^"]+)"/g)].flatMap(match => match[1].split(",").map(part => part.trim().split(/\s+/)[0])));
  for (const target of targets) {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target) || asked.has(target)) continue;
    asked.add(target);
    const path = target.split(/[?#]/)[0];
    if (path && !existsSync(new URL(path, guitar))) error(name === "index.html" ? "index.html" : "views.js", `${name} asks for ${target}, which does not exist`);
  }
}

const files = new Set(readdirSync(fileURLToPath(guitar)));
for (const file of [...files].filter(name => name.endsWith(".js"))) {
  const source = readFileSync(new URL(file, guitar), "utf8");
  for (const [, target] of source.matchAll(/^\s*(?:import|export)\b[^"';]*?from\s+["']\.\/([^"'?]+)/gm)) {
    if (!files.has(target)) error(file, `imports ./${target}, which does not exist`);
  }
}
for (const [, target] of shell.matchAll(/<link rel="modulepreload" href="([^"?]+)/g)) {
  if (!existsSync(new URL(target, guitar))) error("index.html", `preloads ${target}, which does not exist`);
}

// ---------------------------------------------------------------- web app manifests

for (const name of ["manifest.webmanifest", "note-reading/manifest.webmanifest"]) {
  let manifest;
  try { manifest = JSON.parse(readFileSync(new URL(name, guitar), "utf8")); } catch (failure) { error(name, `is not valid JSON: ${failure.message}`); continue; }
  const folder = new URL(name.includes("/") ? name.slice(0, name.lastIndexOf("/") + 1) : "./", guitar);
  const files = [...(manifest.icons ?? []), ...(manifest.screenshots ?? []), ...(manifest.shortcuts ?? []).flatMap(item => item.icons ?? [])].map(item => item.src);
  for (const src of files) if (!existsSync(new URL(src, folder))) error(name, `names ${src}, which does not exist`);
  for (const item of manifest.shortcuts ?? []) {
    const hash = new URL(item.url, "https://x/guitar/").hash;
    if (hash && !leadsSomewhere(hash)) error(name, `shortcut "${item.name}" opens ${hash}, which leads to "Page not found"`);
  }
  if (!manifest.icons?.some(icon => icon.purpose?.includes("maskable"))) note(name, "has no maskable icon; Android draws the icon on a white circle");
}
