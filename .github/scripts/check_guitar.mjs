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

// ---------------------------------------------------------------- every screen

const state = progress => ({
  progress, storageOk: true, reading: { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 },
  quiz: newQuestion("notes", "open"), answer: undefined, theme: "auto", confirmDelete: null, today: "0000-00-00"
});
const practised = emptyProgress();
practised.lastLesson = course.lessons[0]?.id ?? null;
practised.lessons[course.lessons[0]?.id] = { watched: true, practised: true };
practised.days[1] = true;
practised.journal.push({ id: "check-entry", date: "2026-01-01", minutes: 25, updatedAt: 1, exercises: "x", piece: "y", difficulty: "", notes: "", skills: "" });

const screens = [
  ["home"], ["course"], ["days"], ["technique"], ["estas"], ["reading"], ["reading", "guided"], ["repertoire"], ["roadmap"], ["journal"], ["journal", "check-entry"],
  ["progress"], ["settings"], ["about"], ["menu"],
  ...course.modules.map(module => ["module", module.id]),
  ...course.lessons.map(lesson => ["lesson", lesson.id]),
  ...course.days.map(day => ["day", String(day.id)]),
  ...estasPieces.map(piece => ["estas", piece.id])
];
const drawn = [];
for (const progress of [emptyProgress(), practised]) {
  for (const [page, id] of screens) {
    const name = "#" + page + (id ? "/" + id : "");
    try {
      const result = views.renderRoute(state(progress), page, id);
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
