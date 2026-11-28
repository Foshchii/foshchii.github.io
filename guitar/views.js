// Every screen of the Guitar Academy, as HTML strings. Nothing in this file touches the page, so the
// same code runs in the browser (academy.js) and in Node, where
// .github/scripts/prerender_guitar.mjs writes the first-visit home page into index.html.
//
// A view reads `state`, which academy.js owns:
//   progress       the saved record (see progress.js)
//   storageOk      false when the browser refuses localStorage
//   reading        { mode, level, bars, attempts, correct } for the reading trainer
//   question       the reading trainer's current question, and answer the one chosen for it
//   theme          "auto", "light" or "dark"
//   confirmDelete  id of a journal entry waiting for "Delete" to be confirmed
//   today          optional date key, so the prerendered page does not depend on the build date
//   quiz           the note quiz's record (quiz-store.js), for the hero; may be missing
//   app            install and offline state (app.js); may be missing
//   sync           sync state (sync.js state() plus link and reveal); may be missing
//   confirm        a destructive action waiting to be confirmed ("sync-leave", "sync-erase")
//   joinCode       the code of a sync link being opened (#sync/CODE), kept out of the address
import { course } from "./course.js";
import { estasDrills, estasPieces, estasVideos } from "./estas-guide.js";
import { guidedCoreLessons, guidedDays } from "./guided-lessons.js";
import {
  dailyExercises, estasDrillVideos, estasStepVideos, extraVideos, lessonPracticeVideos, lessonStepVideos,
  modulePracticeVideos, roadmapPracticeVideos
} from "./practice-videos.js";
import { supportTopics, supportVideos } from "./support-videos.js";
import { dateKey } from "./progress.js";
import { firstPosition, firstScore, noteLocation, readingLevels, readingModes, score } from "./reading.js";
import { hero as heroOf, paths as heroPaths, rewards, skills, sourceNames } from "./rpg.js";
import { changePairs, chordIndex, palos } from "./chords.js";
import { qrSvg } from "./qr.js";
import { planFor } from "./plans.js";

export const modules = new Map(course.modules.map(item => [item.id, item]));
export const lessons = new Map(course.lessons.map(item => [item.id, item]));
export const core = course.lessons.filter(item => item.kind === "Core");
export const routes = ["home", "course", "module", "lesson", "days", "day", "technique", "estas", "reading",
  "repertoire", "roadmap", "journal", "progress", "settings", "about", "menu", "hero", "practice", "sync"];
// #practice/<tool>: the practice room's tools, each drawn by its tool-*.js into the screen's [data-tool] card.
export const practiceTools = ["session", "metronome", "tuner", "chords", "compas"];
// #reading/notes, #reading/open-melody and #reading/assessment open the trainer on a set exercise;
// #reading/guided is the step-by-step fretboard lesson.
export const readingPresets = ["assessment", "notes", "open-melody"];
export const readingScreens = [...readingPresets, "guided"];

const statusLabels = { watched: "Video watched", practised: "Exercise practised", mastered: "Skill mastered" };
const weekThemes = ["Posture and open strings", "Alternation and your first duet", "Fretted notes and melody", "Sight-reading and Ode to Joy"];
const levels = ["Foundation", "Developing", "Intermediate"];
const languageCodes = { Ukrainian: "uk", Russian: "ru" };
const repertoire = [
  ["Nocturne", "Open strings · Werner p. 16", "L06"],
  ["A Fairy Tale", "First fretted note · Werner p. 20", "L08"],
  ["Ode to Joy", "First-position melody · Werner p. 26", "L11"],
  ["Au clair de la lune", "Connected melody · Werner pp. 30–34", "L16"],
  ["The Lonely Dogwood", "Open bass and ringing arpeggios · Werner p. 41", "L17"],
  ["Little Birch Tree in the Field", "Dotted rhythm · Werner p. 57", "L19"],
  ["Greensleeves and Leyenda", "First-position reading and Spanish color", "L25"],
  ["Malagueñas", "A gentle brush and Spanish phrasing", "L26"],
  ["Siciliano", "Melody and bass balance", "L27"],
  ["Sing with guitar", "Open chords and an even beat", "L23"]
];

let state;

// ---------------------------------------------------------------- text and small parts

export const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

const icon = (name, extra = "") =>
  `<svg class="icon${extra ? " " + extra : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
const arrow = icon("arrow-right");
const newTab = '<span class="sr-only"> (opens in a new tab)</span>';
const plural = (count, one, many = one + "s") => `${count} ${count === 1 ? one : many}`;

// Course copy can hold [label](https://…) links and *emphasis*.
function rich(value) {
  return escape(value)
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, `<a href="$2" target="_blank" rel="noopener">$1${newTab}</a>`)
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

// The plans refer to lessons and modules by id ("L04, first 7 minutes", "M01 assessment").
// Turn those ids into links, leaving text that is already inside a link alone.
function refs(value) {
  let inLink = false;
  return rich(value).split(/(<[^>]+>)/).map(part => {
    if (part.startsWith("<")) {
      if (part.startsWith("<a ")) inLink = true;
      else if (part === "</a>") inLink = false;
      return part;
    }
    if (inLink) return part;
    return part.replace(/\b(?:[LS]\d{2}|M\d{2})\b/g, id => {
      if (lessons.has(id)) return `<a href="#lesson/${id}" title="${escape(lessons.get(id).title)}">${id}</a>`;
      if (modules.has(id)) return `<a href="#module/${id}" title="${escape(modules.get(id).title)}">${id}</a>`;
      return id;
    });
  }).join("");
}

// A Ukrainian or Russian video keeps its original title; say so, for screen readers and hyphenation.
const titleLang = (title, language) =>
  languageCodes[language] && /[Ѐ-ӿ]/.test(title) ? ` lang="${languageCodes[language]}"` : "";

// Keeps a trailing icon on the same line as the last word of its label.
function labelled(label, trailing) {
  const text = escape(label);
  const cut = text.lastIndexOf(" ") + 1;
  return `${text.slice(0, cut)}<span class="nowrap">${text.slice(cut)}${trailing}</span>`;
}
const link = (href, label) => `<a class="link" href="${href}">${labelled(label, arrow)}</a>`;
const ext = (url, label) =>
  `<a class="link link--ext" href="${escape(url)}" target="_blank" rel="noopener">${labelled(label, icon("arrow-up-right"))}${newTab}</a>`;
const btn = (href, label, kind = "") => `<a class="btn${kind ? " btn--" + kind : ""}" href="${href}">${escape(label)}${arrow}</a>`;
const crumb = (href, label) => `<a class="crumb" href="${href}">${icon("arrow-left")}<span>${escape(label)}</span></a>`;
const pill = (label, tone = "") =>
  `<span class="pill${tone ? " pill--" + tone : ""}">${tone === "done" ? icon("check") : ""}${escape(label)}</span>`;
const pdf = `<a class="link link--ext" href="reading-sheets.pdf" target="_blank" rel="noopener">${labelled("Open the reading sheets (PDF)", icon("arrow-up-right"))}${newTab}</a>`;
const card = (heading, body, extra = "") => `<section class="card${extra ? " " + extra : ""}"><h2>${escape(heading)}</h2>${body}</section>`;
const section = (heading, body, extra = "") => `<section class="section${extra ? " " + extra : ""}"><h2>${escape(heading)}</h2>${body}</section>`;
const guidedCard = '<section class="card guided-card" data-guided-practice aria-label="Guided practice"></section>';
const callout = (heading, body) => `<div class="callout"><strong>${escape(heading)}</strong><p>${body}</p></div>`;
const check = (attributes, label, checked, extra = "") =>
  `<label class="check-row${extra ? " " + extra : ""}"><input class="check" type="checkbox" ${attributes}${checked ? " checked" : ""}><span>${label}</span></label>`;

function head({ title, lede = "", kicker = "", back = "", lang = "" }) {
  const size = title.length > 56 ? " intro--long" : title.length > 30 ? " intro--mid" : "";
  return `<header class="intro${size}">${back}${kicker ? `<p class="kicker">${escape(kicker)}</p>` : ""}<h1${lang}>${escape(title)}</h1>${lede ? `<p class="lede">${escape(lede)}</p>` : ""}</header>`;
}

function track(value, total, label = "Core exercises practised") {
  return `<div class="track" role="progressbar" aria-label="${escape(label)}" aria-valuemin="0" aria-valuenow="${value}" aria-valuemax="${total}"><span style="width:${total ? value / total * 100 : 0}%"></span></div>`;
}

function ring(value, total) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return `<svg class="ring ring--large" viewBox="0 0 36 36" role="img" aria-label="${percent}% of core exercises practised"><circle class="ring-track" cx="18" cy="18" r="15.5"></circle><circle class="ring-value" cx="18" cy="18" r="15.5" pathLength="100" stroke-dasharray="${percent} 100" transform="rotate(-90 18 18)"></circle><text class="ring-text" x="18" y="18.5">${percent}%</text></svg>`;
}

function stepsList(steps, videos) {
  return `<ol class="steps">${steps.map(([title, body], index) => `<li><h3>${escape(title)}</h3><p>${rich(body)}</p>${videoResources(videos?.[index], "Video for this exercise")}</li>`).join("")}</ol>`;
}

// ---------------------------------------------------------------- progress, read from state

const flags = id => state.progress.lessons[id] ?? {};
const coreFor = id => core.filter(lesson => lesson.module === id);
const practised = list => list.filter(lesson => flags(lesson.id).practised).length;
const mastered = list => list.filter(lesson => flags(lesson.id).mastered).length;
const activeModule = () => course.modules.find(module => !state.progress.assessments[module.id]) ?? course.modules.at(-1);
const activeDay = () => course.days.find(day => !state.progress.days[day.id]);
const restDay = day => day?.watch.startsWith("Rest");
const moduleNumber = id => Number.parseInt(id.slice(1), 10);

// True once the learner has done anything worth coming back to.
export function engaged(progress) {
  return Boolean(progress.lastLesson || progress.journal.length || progress.profile?.name ||
    [progress.lessons, progress.assessments, progress.days, progress.activities, progress.counters ?? {}, progress.quests ?? {}, progress.badges ?? {}]
      .some(map => Object.keys(map).length));
}

export function level(moduleId) {
  const number = moduleNumber(moduleId);
  if (number < 3) return levels[0];
  if (number < 9) return levels[1];
  return levels[2];
}

function status(module) {
  if (state.progress.assessments[module.id]) return ["Assessment passed", "done"];
  const items = coreFor(module.id);
  if (practised(items) === items.length) return ["Exercises practised", "done"];
  if (items.some(item => Object.values(flags(item.id)).some(Boolean))) return ["In progress", "go"];
  return ["Not started", ""];
}

function lessonStatus(lesson) {
  const saved = flags(lesson.id);
  if (saved.mastered) return pill("Mastered", "done");
  if (saved.practised) return pill("Practised", "done");
  return saved.watched ? pill("Watched", "go") : "";
}

function dayLessons(day) {
  return [...new Set((day.watch.match(/\bL\d{2}\b/g) ?? []).map(id => lessons.get(id)).filter(Boolean))];
}

function dayKind(day) {
  if (restDay(day)) return "Rest";
  if (/assessment/i.test(day.watch)) return "Assessment";
  if (day.watch.startsWith("Review")) return "Review";
  return "";
}

function sessionActivities(day, module, next) {
  if (restDay(day)) return [];
  const short = state.progress.minutes === 10;
  if (!short && day?.id === 1) {
    return [
      ["setup", "Set up and tune", "Find a relaxed sitting position.", 3],
      ["video", "Watch the setup chapter", "Watch 0:51–5:00 of Werner’s posture lesson.", 5],
      ["reading", "Read score A", "Name and clap G, B and high E.", 5],
      ["technique", "Pluck with flesh", "Play open strings with the pad of your index finger.", 7],
      ["music", "Play the two bars", "Read score A at 45–50 bpm.", 5]
    ];
  }
  if (short && day?.id === 1) return [
    ["setup", "Tune and set up", "Use the posture chapter if you need help finding a steady position.", 2],
    ["technique", "Play open high E", "Make four quiet notes with the pad of your index finger.", 4],
    ["reading", "Read score A", "Say the three pitches, clap the score, then try the first bar.", 4]
  ];
  if (short && day) return [
    ["setup", "Tune and warm up", "Play one relaxed open note.", 1],
    ["video", "Open the day plan", day.watch, 3],
    ["technique", "Try one part of the assignment", day.practice.replace(/\*/g, ""), 6]
  ];
  // After the first 28 days: the module's menu for today (plans.js), when it has one.
  const menu = planFor(module.id, state.today ?? dateKey());
  if (menu && short) return [
    ["setup", "Tune and warm up", "Tap the strings in the tuner, or play one relaxed open note.", 1],
    ["reading", ...menu.reading, 3],
    ["technique", ...menu.technique, 3],
    ["music", ...menu.music, 3]
  ];
  if (menu) return [
    ["setup", "Warm up and tune", "Tune with the tuner or its reference notes, then play a few unhurried open notes.", 3],
    ["reading", ...menu.reading, 5],
    ["technique", ...menu.technique, 7],
    ["music", ...menu.music, 8],
    ["review", "Review or make a note", "Write down what to repeat next time.", 2]
  ];
  if (short) return [
    ["setup", "Set up and tune", "Check posture and play one relaxed open note.", 1],
    ["reading", "Read one short line", "Say the notes and clap the rhythm.", 3],
    ["technique", "Play one drill", next ? next.objective : "Repeat one movement from the current module.", 3],
    ["music", "Play a phrase", "Use a short section of your current piece.", 3]
  ];
  if (day) return [
    ["setup", "Warm up and tune", "Play a few unhurried open notes.", 3],
    ["reading", "Open the day plan", day.watch, 5],
    ["technique", "Try the day’s assignment", day.practice.replace(/\*/g, ""), 7],
    ["music", "Repeat a short phrase", "Keep the pulse, then record one take.", 8],
    ["review", "Review or make a note", "Write down what to repeat next time.", 2]
  ];
  return [
    ["setup", "Warm up and tune", "Play a few unhurried open notes.", 3],
    ["reading", "Read fresh notation", "Name the pitches and count before playing.", 5],
    ["technique", "Practise today’s technique", next ? next.objective : "Review the current module’s checkpoint.", 7],
    ["music", "Play a phrase", module.title + ".", 8],
    ["review", "Review or make a note", "Write down what to repeat next time.", 2]
  ];
}

// ---------------------------------------------------------------- lists and media

function lessonNumber(lesson) {
  if (lesson.kind === "Supplement") return "S" + Number(lesson.id.slice(1));
  return lesson.id.slice(1);
}

function lessonList(items) {
  return `<ul class="rows">${items.map(lesson => `<li><a class="row" href="#lesson/${lesson.id}">
    <span class="row-num" aria-hidden="true">${lessonNumber(lesson)}</span>
    <span class="row-main"><strong${titleLang(lesson.title, lesson.language)}>${escape(lesson.title)}</strong><small>${escape(lesson.teacher)} · ${escape(lesson.language)}${lesson.duration ? " · " + escape(lesson.duration) : ""}</small></span>
    <span class="row-end">${lessonStatus(lesson)}${icon("chevron-right")}</span></a></li>`).join("")}</ul>`;
}

const primaryVideos = new Map(course.lessons.map(lesson => [lesson.video, { ...lesson, title: lesson.videoTitle ?? lesson.title }]));
export const videoInfo = id => estasVideos[id] ?? supportVideos[id] ?? extraVideos[id] ?? primaryVideos.get(id);
const videoUrl = (url, start) => start ? `${url}&t=${start}s` : url;

function videoItems(resources) {
  return resources.map(([id, cue, technique, start, end]) => {
    const video = videoInfo(id);
    const source = videoUrl("https://www.youtube.com/watch?v=" + id, start);
    const metadata = [video.channel, video.language, video.duration, technique].filter(Boolean);
    return `<li>
      <div class="support-row">
        <div class="support-text">
          <a class="support-title" href="${escape(source)}" target="_blank" rel="noopener"${titleLang(video.title, video.language)}>${labelled(video.title, icon("arrow-up-right"))}${newTab}</a>
          <p class="meta">${metadata.map(escape).join(" · ")}</p>
          <p class="support-cue">${escape(cue)}</p>
        </div>
        <button class="btn btn--ghost btn--small support-play" type="button" data-support-video="${id}" data-start="${start ?? ""}" data-end="${end ?? ""}" aria-label="Play here: ${escape(video.title)}">${icon("play")}Play here</button>
      </div>
    </li>`;
  }).join("");
}

// Videos that belong to one step, drill or exercise: folded away until asked for.
function videoResources(resources, heading = "Supporting videos", open = false) {
  if (!resources?.length) return "";
  return `<details class="support-videos disclosure"${open ? " open" : ""}><summary><span>${escape(heading)} <span class="meta">(${resources.length})</span></span></summary><ul>${videoItems(resources)}</ul></details>`;
}

// Videos that have a section or column of their own: always in view, under a heading.
function videoSection(resources, heading = "Supporting videos", headingLevel = 3) {
  if (!resources?.length) return "";
  return `<div class="support-videos"><h${headingLevel}>${escape(heading)}</h${headingLevel}><ul>${videoItems(resources)}</ul></div>`;
}

// Staff position, note name and where to play it, side by side.
function noteMap(pitches, showOctaves = false) {
  const entries = pitches.map(pitch => firstPosition.find(item => item.pitch === pitch));
  return `<table class="note-map"><thead><tr><th scope="col">On the staff</th><th scope="col">Note</th><th scope="col">On the guitar</th></tr></thead><tbody>${entries.map(({ pitch, staff, position, example }) => `<tr><td>${example}<small>${staff}</small></td><th scope="row">${showOctaves ? pitch : pitch === "E5" ? "High E" : pitch[0]}</th><td>${position}</td></tr>`).join("")}</tbody></table>`;
}

const openNoteMap = () => noteMap(["G4", "B4", "E5"]);

// A printed score with its slow play-along video (media/score-a.mp4 … score-h.mp4).
function scoreDemo(letter) {
  const scoreA = letter === "A" ? `<p><strong>Bar 1</strong> &nbsp; G (3) · B (2) · high E (1, hold through 4).<br><strong>Bar 2</strong> &nbsp; High E (1) · B (2) · G (3, hold through 4).</p><p class="meta">Numbers in brackets are string numbers. All notes use fret 0.</p>${firstScore()}` : "";
  const clip = `<video controls playsinline preload="${letter === "H" ? "none" : "metadata"}" aria-label="Score ${letter} play-along"><source src="media/score-${letter.toLowerCase()}.mp4" type="video/mp4"></video>`;
  return `<div class="score-demo"><h4>Score ${letter} play-along</h4>${scoreA}
    ${letter === "H" ? `<p>${pdf}</p><details class="disclosure"><summary>Watch the answer after your first take</summary>${clip}</details>` : `<p>Follow the highlighted note. The video shows the string, fret and count at 48 bpm.</p>${clip}<p>${pdf}</p>`}</div>`;
}

function video(lesson) {
  const label = lesson.start ? "Play chapter" : "Play video";
  const name = lesson.videoTitle ?? lesson.title;
  return `<div class="video-unloaded">
      <button class="poster-play" type="button" data-video="${lesson.id}" aria-label="${label}: ${escape(name)}">${icon("play")}<span>${label}</span></button>
      <p class="poster-note">${escape(lesson.teacher)}${lesson.duration ? " · " + escape(lesson.duration) : ""}<br>Loads from YouTube when you press play</p>
    </div>
    <div class="vid-caption"><span class="meta">${escape(lesson.channel)}${lesson.duration ? " · " + escape(lesson.duration) : ""}</span>${ext(videoUrl(lesson.url, lesson.start), "Watch on YouTube")}</div>`;
}

function heroImage() {
  const sizes = "(min-width: 1260px) 1180px, 96vw";
  return `<picture class="hero-media">
      <source type="image/avif" srcset="img/guitar-720.avif 720w, img/guitar-1440.avif 1440w" sizes="${sizes}">
      <img src="guitar.webp" srcset="img/guitar-720.webp 720w, guitar.webp 1440w" sizes="${sizes}" alt="" width="1440" height="960" fetchpriority="high" decoding="async">
    </picture>`;
}

// Which of this week's days have a checked activity or a journal entry.
function weekStrip() {
  const now = new Date();
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7);
  const logged = new Set([
    ...Object.keys(state.progress.activities).map(key => key.slice(0, 10)),
    ...state.progress.journal.map(entry => entry.date)
  ]);
  const days = Array.from({ length: 7 }, (_, offset) => dateKey(new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + offset)));
  const count = days.filter(day => logged.has(day)).length;
  return `<div class="weekstrip">
      <ol aria-hidden="true">${days.map((day, index) => `<li class="${logged.has(day) ? "is-on" : ""}${day === dateKey(now) ? " is-today" : ""}"><i></i>${"MTWTFSS"[index]}</li>`).join("")}</ol>
      <p class="meta">${count ? `${plural(count, "day")} with practice logged this week` : "No practice logged yet this week"}</p>
    </div>`;
}

// ---------------------------------------------------------------- today's plan and the hero

// What today asks for: the next day of the first four weeks, or after them the current module.
function planToday() {
  const { progress } = state;
  const day = activeDay();
  const module = day ? course.modules[day.id <= 14 ? 0 : 1] : activeModule();
  const moduleLessons = coreFor(module.id);
  const last = lessons.get(progress.lastLesson);
  const next = (day ? dayLessons(day)[0] : undefined) ??
    (last?.module === module.id && !flags(last.id).practised ? last : moduleLessons.find(lesson => !flags(lesson.id).practised));
  const href = day ? "#day/" + day.id : next ? "#lesson/" + next.id : "#module/" + module.id;
  const activities = sessionActivities(day, module, next);
  const prefix = `${state.today ?? dateKey()}/${day ? "day-" + day.id : module.id}/${progress.minutes}/`;
  const week = day ? Math.ceil(day.id / 7) : 0;
  return { day, module, next, last, href, activities, prefix, week, rest: restDay(day) };
}

const heroNow = () => {
  const plan = planToday();
  return heroOf(state.progress, state.quiz, { module: plan.module.id, plan: plan.activities.length > 0, today: state.today ?? dateKey() });
};

const number = value => Math.round(value).toLocaleString("en-US");
const dateLabel = ms => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(ms));
const roman = n => ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"][n - 1] ?? String(n);
const skillName = id => skills.find(skill => skill.id === id)?.name ?? "Practice";

function bar(value, total, label, extra = "") {
  const width = total ? Math.min(100, value / total * 100) : 0;
  return `<div class="xpbar${extra ? " " + extra : ""}" role="progressbar" aria-label="${escape(label)}" aria-valuemin="0" aria-valuenow="${Math.round(value)}" aria-valuemax="${Math.round(total)}"><span style="width:${width.toFixed(1)}%"></span></div>`;
}

// The hero's crest: a shield with the level on it.
export function crest(levelNumber, size = "") {
  return `<svg class="crest${size ? " crest--" + size : ""}" viewBox="0 0 64 70" aria-hidden="true" focusable="false"><path class="crest-shield" d="M32 3 58 12v19c0 17-11 29-26 35C17 60 6 48 6 31V12Z"/><path class="crest-rim" d="M32 9 52 16v15c0 13-8 23-20 28-12-5-20-15-20-28V16Z"/><text class="crest-level" x="32" y="37">${levelNumber}</text></svg>`;
}

function questList(quests) {
  return `<ul class="quests">${quests.map(quest => `<li class="quest${quest.done ? " is-done" : ""}">
      <span class="quest-mark" aria-hidden="true">${icon(quest.done ? "check" : "target")}</span>
      <span class="quest-main"><a href="${quest.href ?? "#hero"}">${escape(quest.title)}</a>${quest.target > 1 && !quest.done ? `${bar(quest.value, quest.target, quest.title)}<small>${quest.value} of ${quest.target}</small>` : ""}<span class="sr-only">${quest.done ? ", done" : ""}</span></span>
      <span class="quest-reward">+${quest.reward} XP</span>
    </li>`).join("")}</ul>`;
}

function dailyCard(hero, compact = false) {
  const { daily } = hero;
  const done = daily.quests.filter(quest => quest.done).length;
  return `<section class="card quest-card">
      <div class="card-head"><h2 class="card-title card-title--small">Daily quests</h2><span class="meta">${done} of ${daily.quests.length} done</span></div>
      ${questList(daily.quests)}
      <p class="quest-bonus${daily.bonus.done ? " is-done" : ""}">${icon("sparkle")}${daily.bonus.done ? `All three done: +${daily.bonus.reward} XP earned` : `Finish all three for +${daily.bonus.reward} XP`}</p>
      ${compact ? `<p class="card-foot">${link("#hero", "Weekly quests and your hero")}</p>` : ""}
    </section>`;
}

function heroStrip(hero) {
  return `<section class="card hero-card">
      <a class="hero-card-main" href="#hero">${crest(hero.level)}
        <span><span class="kicker">Level ${hero.level}</span><strong>${escape(hero.name || hero.title)}</strong>${hero.name ? `<small>${escape(hero.title)}</small>` : ""}</span>
      </a>
      ${bar(hero.into, hero.span, `Experience: ${hero.into} of ${hero.span} to level ${hero.level + 1}`)}
      <p class="hero-card-numbers"><span>${number(hero.toNext)} XP to level ${hero.level + 1}</span><span>+${number(hero.today)} today</span></p>
      <p class="hero-card-streak">${icon("flame")}<span>${hero.streak ? `${plural(hero.streak, "day")} in a row` : "Start a streak today"}</span>${hero.best > hero.streak ? `<span class="meta">Best ${hero.best}</span>` : ""}</p>
    </section>`;
}

function installNudge() {
  const app = state.app;
  if (!app || app.installed || !(app.installable || app.ios) || state.installDismissed) return "";
  return `<section class="card nudge">
      <h2 class="card-title card-title--small">${icon("phone")}Put the academy on your home screen</h2>
      <p>It opens like an app, works offline and keeps the screen awake while you practise.</p>
      <div class="actions">${app.installable ? `<button type="button" class="btn btn--small" data-install>Install the app</button>` : `<a class="btn btn--small" href="#settings">How to add it</a>`}<button type="button" class="link link--button" data-dismiss-install>Not now</button></div>
    </section>`;
}

// ---------------------------------------------------------------- views

function home() {
  const { progress } = state;
  const plan = planToday();
  const { day, module, next, last, href, activities, prefix, rest, week } = plan;
  const checked = activities.filter(([key]) => progress.activities[prefix + key]).length;
  const returning = engaged(progress);
  const openLabel = day ? "Open today’s plan" : "Open the next activity";
  const hero = returning ? heroNow() : null;

  const top = returning
    ? `<section class="hero hero--compact">
    ${heroImage()}
    <div class="hero-body">
      <p class="kicker">${day ? `Day ${day.id} of ${course.days.length} · Week ${week}` : `Module ${moduleNumber(module.id)} · ${escape(module.weeks)}`}</p>
      <h1>${rest ? "Rest day" : "Today’s practice"}</h1>
      <p class="hero-copy">${escape(day ? weekThemes[week - 1] : module.title)}</p>
      <div class="actions">${activities.length ? btn("#practice/session", "Start a guided session", "light") : ""}${btn(href, openLabel, activities.length ? "ghost" : "light")}</div>
    </div>
  </section>`
    : `<section class="hero">
    ${heroImage()}
    <div class="hero-body">
      <p class="kicker">A no-nails course</p>
      <h1>Classical guitar <em>&amp; flamenco</em></h1>
      <p class="hero-copy">Read music from your first session. Build a warm fingertip tone, learn Spanish guitar and work toward the music of Estas Tonne.</p>
      <div class="actions">${btn(href, day?.id === 1 && !progress.days[1] ? "Start Day 1" : "Continue learning", "light")}${btn("#course", "Explore curriculum", "ghost")}</div>
    </div>
  </section>
  <ul class="facts">
    <li>${icon("book")}<div><strong>${course.modules.length} modules, six months</strong><span>From your first open strings to a first improvisation.</span></div></li>
    <li>${icon("clock")}<div><strong>25 minutes a day</strong><span>Or 10 when time is short. Every day of the course has its plan.</span></div></li>
    <li>${icon("crown")}<div><strong>Level up as you practise</strong><span>Daily quests, six skills and a boss at the end of every module.</span></div></li>
  </ul>`;

  const heading = returning ? (rest ? "Today" : "Your session") : rest ? "Rest day" : "Today’s practice";
  const session = activities.length
    ? `<p class="meta">${day ? `Day ${day.id} · ` : ""}<span id="activity-total">${checked} of ${activities.length} checked</span></p>
      <ol class="practice-list">${activities.map(([key, label, detail, minutes]) => `<li>${check(`data-activity="${prefix + key}"`, `<strong>${escape(label)}</strong><small>${escape(detail)}</small>`, progress.activities[prefix + key])}<span class="mins">${minutes} min</span></li>`).join("")}</ol>`
    : `<p class="meta">Day ${day.id}</p><p>${rich(day.practice)}</p>`;

  return `${top}
  <div class="dashboard">
    <section class="card today">
      <div class="card-head"><h2>${heading}</h2>${activities.length ? `<div class="segment" role="group" aria-label="Session length">
      ${[25, 10].map(minutes => `<button type="button" data-minutes="${minutes}" aria-pressed="${progress.minutes === minutes}">${minutes} min</button>`).join("")}
      </div>` : ""}</div>
      ${session}
      <p class="card-foot">${link(href, openLabel)}${returning && activities.length ? ` <span class="sep" aria-hidden="true">·</span> ${link("#practice/session", "Step by step with a timer")}` : ""}</p>
    </section>
    <aside class="rail">
      ${hero ? heroStrip(hero) + dailyCard(hero, true) + installNudge() : ""}
      <section class="card">
        <p class="kicker">Current module · ${level(module.id)}</p>
        <h2 class="card-title"><a href="#module/${module.id}">${escape(module.title)}</a></h2>
        <p class="meta">${escape(module.weeks)}</p>
        ${next ? `<p class="next-up"><span class="label">Next lesson</span><a href="#lesson/${next.id}"${titleLang(next.title, next.language)}>${escape(next.title)}</a></p>` : `<p class="next-up"><span class="label">Next</span>Module review</p>`}
        ${link("#module/" + module.id, "Open module")}
      </section>
      <section class="card">
        <div class="card-head"><h2 class="card-title card-title--small">Course progress</h2>${link("#progress", "View progress")}</div>
        <div class="progress-summary">${ring(practised(core), core.length)}
          <p>${practised(core)} of ${core.length} core exercises practised<br><span class="meta">${plural(mastered(core), "skill")} mastered</span></p></div>
        ${returning ? weekStrip() : ""}
        ${last ? `<p class="meta last-opened">Last opened: <a href="#lesson/${last.id}"${titleLang(last.title, last.language)}>${escape(last.title)}</a></p>` : ""}
      </section>
    </aside>
  </div>
  <nav class="explore" aria-label="More to practise">
    <a href="#practice">${icon("metronome")}<span><strong>Practice room</strong><small>Guided session, metronome, tuner, chords and compás.</small></span>${arrow}</a>
    <a href="#reading">${icon("note")}<span><strong>Music Reading Academy</strong><small>Note names, frets, rhythm and sight-reading on a staff.</small></span>${arrow}</a>
    <a href="#technique">${icon("wave")}<span><strong>Playing Without Nails</strong><small>Each stroke, adapted for fingertip pads.</small></span>${arrow}</a>
    <a href="#hero">${icon("crown")}<span><strong>Your hero</strong><small>Level, skills, quests, bosses and achievements.</small></span>${arrow}</a>
    <a href="#estas">${icon("star")}<span><strong>Estas Tonne guide</strong><small>Four pieces, studied one phrase at a time.</small></span>${arrow}</a>
    <a href="#repertoire">${icon("sheet")}<span><strong>Repertoire</strong><small>Pieces to practise from the score.</small></span>${arrow}</a>
  </nav>`;
}

// The syllabus shows only a module's headline goal; the module page has the rest.
function firstSentence(text) {
  const end = text.indexOf(". ");
  return end < 0 ? text : text.slice(0, end + 1);
}

function weekSpan(items) {
  const numbers = `${items[0].weeks} ${items.at(-1).weeks}`.match(/\d+/g) ?? [];
  return numbers.length ? `Weeks ${numbers[0]}–${numbers.at(-1)}` : "";
}

function moduleRow(module) {
  const items = coreFor(module.id);
  const done = practised(items);
  return `<li class="syllabus-item">
      <span class="syllabus-num" aria-hidden="true">${String(moduleNumber(module.id)).padStart(2, "0")}</span>
      <div class="syllabus-body">
        <h3><a href="#module/${module.id}">${escape(module.title)}</a></h3>
        <p>${refs(firstSentence(module.Goal))}</p>
        <p class="meta">${escape(module.weeks)} · ${plural(items.length, "lesson")} · Before you start: ${refs(module.Prerequisite)}</p>
      </div>
      <div class="syllabus-state">${pill(...status(module))}<span class="meta">${done} of ${items.length} practised</span></div>
    </li>`;
}

function courseView() {
  return head({ kicker: "Classical guitar & flamenco", title: "Curriculum", lede: "Twelve modules over six months. Use the checkpoints to decide when to move on." }) +
    `<div class="actions">${btn("#days", "First 28 days")}${btn("#roadmap", "Months 7–12", "ghost")}</div>
    <div class="syllabus">${levels.map(name => {
      const items = course.modules.filter(module => level(module.id) === name);
      return `<section class="syllabus-group">
        <h2 class="syllabus-level">${name}<span>${weekSpan(items)}</span></h2>
        <ol class="syllabus-list">${items.map(moduleRow).join("")}</ol>
      </section>`;
    }).join("")}</div>
    <section class="card finder" id="catalogue"><h2>Find a lesson</h2>
      <form class="filters" id="filters">
        <label class="field">Search<input name="query" type="search" placeholder="Title, teacher or technique" autocomplete="off"></label>
        <label class="field">Language<select name="language"><option value="">All languages</option>${["English", "Ukrainian", "Russian"].map(name => `<option>${name}</option>`).join("")}</select></label>
        <label class="field">Difficulty<select name="level"><option value="">All levels</option>${levels.map(name => `<option>${name}</option>`).join("")}</select></label>
        <label class="field">Progress<select name="status"><option value="">All lessons</option><option value="todo">Unfinished</option><option value="done">Practised</option><option value="mastered">Mastered</option></select></label>
      </form><div id="lesson-results" aria-live="polite">${lessonList(course.lessons)}</div>
    </section>`;
}

function pager(label, previous, next) {
  const side = (item, direction) => item
    ? `<a class="pager-link pager-link--${direction}" href="${item.href}"><span class="pager-dir">${direction === "prev" ? icon("arrow-left") + escape(item.label) : escape(item.label) + arrow}</span><span class="pager-title"${item.lang ?? ""}>${escape(item.title)}</span></a>`
    : "<span></span>";
  return `<nav class="pager" aria-label="${label}">${side(previous, "prev")}${side(next, "next")}</nav>`;
}

function moduleView(module) {
  const items = coreFor(module.id);
  const reviews = course.lessons.filter(item => item.module === module.id && item.kind === "Supplement");
  const index = course.modules.indexOf(module);
  const neighbour = (other, label) => other && { href: "#module/" + other.id, label, title: other.title };
  return head({ back: crumb("#course", "Curriculum"), kicker: `Module ${moduleNumber(module.id)} · ${module.weeks} · ${level(module.id)}`, title: module.title }) +
    `<div class="cols"><div class="cols-main">
      ${section("Lessons", lessonList(items))}
      ${reviews.length ? section("Optional reviews", lessonList(reviews)) : ""}
      ${section("Practice", `<p>${refs(module.Play)}</p>${videoResources(modulePracticeVideos[module.id], "Videos for this practice")}${callout("Common mistake", refs(module["Common error"]))}${module.id === "M12" ? `<p>${link("#estas/spirit-of-time", "Spirit of Time improvisation study")}</p>` : ""}`)}
      <section class="section">${videoSection(supportTopics[module.id], "Supporting videos", 2)}</section>
    </div><aside class="cols-side">
      ${card("Learning goals", `<p>${refs(module.Goal)}</p><dl class="pairs"><dt>Before you start</dt><dd>${refs(module.Prerequisite)}</dd></dl><p id="module-status">${pill(...status(module))}</p>`)}
      ${card("Assessment", `<p>${refs(module.Pass)}</p>${callout("If you need more practice", refs(module.Repair))}${videoResources(modulePracticeVideos[module.id], "Videos to review before trying again")}
        ${check(`data-assessment="${module.id}"`, "Assessment passed", state.progress.assessments[module.id], "check-row--cta")}`)}
    </aside></div>
    ${pager("Modules", neighbour(course.modules[index - 1], "Previous module"), neighbour(course.modules[index + 1], "Next module"))}`;
}

function lessonView(lesson) {
  const module = modules.get(lesson.module);
  const id = lesson.id;
  const index = core.indexOf(lesson);
  const checkpoint = refs(lesson.checkpoint ?? (module ? module.Pass : "Play four soft, even thumb units without catching the string. Keep the pulse stable."));
  const prerequisite = refs(lesson.prerequisite ?? (module ? module.Prerequisite : "First clap the Bulerías example in time, then revisit thumb control in Module 5."));
  const dayPlan = ["L01", "L02"].includes(id) ? `<p>${link("#day/" + Number(id.slice(1)), `Open the Day ${Number(id.slice(1))} plan`)}</p>` : "";
  const practice = card("Practise", `${lesson.steps ? stepsList(lesson.steps, lessonStepVideos[id]) : ""}<p>${escape(lesson.drill)}</p>${videoResources(lessonPracticeVideos[id], "Video for this drill")}${dayPlan}
    ${lesson.mistake ? callout("Common mistake", rich(lesson.mistake)) : ""}
    <ul class="link-list"><li>${ext(lesson.material, lesson.materialLabel ?? "Lesson materials")}</li>${lesson.steps ? "" : `<li>${pdf}</li>`}</ul>`);
  const media = lesson.watch
    ? card(lesson.mediaLabel ?? "Video lesson", `<p>${escape(lesson.watch)}</p>${video(lesson)}`, "card--media")
    : `<section class="card card--media" aria-label="Video lesson">${video(lesson)}</section>`;
  const neighbour = (other, label) => other && { href: "#lesson/" + other.id, label, title: other.title, lang: titleLang(other.title, other.language) };
  return head({
    back: crumb(module ? "#module/" + module.id : "#roadmap", module ? module.title : "Months 7–12"),
    kicker: `${lesson.kind === "Core" ? "Lesson " + id.slice(1) : lesson.kind} · ${lesson.language} · ${module ? level(module.id) : "Intermediate"}`,
    title: lesson.title, lang: titleLang(lesson.title, lesson.language)
  }) +
    `<div class="cols"><div class="cols-main">
      ${guidedCoreLessons[id]?.length ? guidedCard : ""}
      ${lesson.steps || lesson.mediaLabel ? practice + media : media + practice}
      ${card("Your progress", `<div class="checks">${Object.entries(statusLabels).map(([key, title]) => check(`data-lesson="${id}" data-flag="${key}"`, title, flags(id)[key])).join("")}</div>
      <p class="meta">Mark mastery after meeting the relevant criterion on two different days.</p>
      <details class="disclosure"${lesson.checkpoint ? " open" : ""}><summary>${lesson.checkpoint ? "Lesson checkpoint" : "Module checkpoint"}</summary><p>${checkpoint}</p></details>`, "card--progress")}
      ${index >= 0 ? pager("Lesson navigation", neighbour(core[index - 1], "Previous lesson"), neighbour(core[index + 1], "Next lesson")) : ""}
      <p>${link("#home", "Back to today")}</p>
    </div><aside class="cols-side">
      ${card("What you’ll learn", `<p>${escape(lesson.objective)}</p><p class="meta">${escape(lesson.teacher)} · ${escape(lesson.language)}</p><dl class="pairs"><dt>${lesson.prerequisite || !module ? "Before this lesson" : "Before this module"}</dt><dd>${prerequisite}</dd></dl>`)}
      ${card("Playing without nails", `<p>${refs(lesson.adaptation)}</p>${link("#technique", "Technique reference")}`)}
    </aside></div>`;
}

function daysView() {
  const next = activeDay();
  return head({ title: "Your first 28 days", lede: "Use the daily plans to work through the first two modules. Review at the end of each week and take the scheduled rest days." }) +
    `<div class="weeks">${[1, 2, 3, 4].map(week => {
      const days = course.days.slice((week - 1) * 7, week * 7);
      const done = days.filter(day => state.progress.days[day.id]).length;
      return `<section class="card week">
        <div class="week-head"><p class="kicker">Week ${week}</p><h2>${weekThemes[week - 1]}</h2><p class="meta">${done} of ${days.length} days complete</p></div>
        <ol class="day-grid">${days.map(day => {
          const complete = state.progress.days[day.id];
          const kind = dayKind(day);
          const status = complete ? ", complete" : day === next ? ", up next" : "";
          return `<li><a class="day${complete ? " complete" : ""}${day === next ? " is-next" : ""}" href="#day/${day.id}"><span class="sr-only">Day </span><span class="day-num">${day.id}</span> <span class="day-tag">${complete ? icon("check") + (kind ? `<span class="sr-only">${kind}</span>` : "") : kind}</span>${status ? `<span class="sr-only">${status}</span>` : ""}</a></li>`;
        }).join("")}</ol>
      </section>`;
    }).join("")}</div>`;
}

function dayView(day) {
  const first = day.id === 1;
  const rest = restDay(day);
  const module = course.modules[day.id <= 14 ? 0 : 1];
  const week = Math.ceil(day.id / 7);
  const weekDays = course.days.slice((week - 1) * 7, week * 7);
  const related = dayLessons(day);
  const exercises = (dailyExercises[day.id] ?? []).map(([title, body, videos, sheet, jump], index) => `<li>
      <h3>${escape(title)}</h3><p>${rich(body)}</p>
      ${first && index === 2 ? openNoteMap() : ""}
      ${videoResources(videos, "Video for this exercise", first)}
      ${jump ? `<p>${link(jump[0], jump[1])}</p>` : ""}
      ${sheet ? scoreDemo(sheet) : ""}
    </li>`).join("");
  const neighbour = (other, label) => other && { href: "#day/" + other.id, label, title: "Day " + other.id + (dayKind(other) ? " · " + dayKind(other) : "") };
  return head({ back: crumb("#days", "First 28 days"), kicker: `Week ${week} · ${module.title}`, title: "Day " + day.id, lede: first ? "Start with three open strings. Learn to recognize each note on the page, find its string and play it with your fingertip pad." : rest ? "A rest day. Everything below is optional." : "" }) +
    `<nav class="daystrip" aria-label="Days of week ${week}">${weekDays.map(item => `<a href="#day/${item.id}"${item === day ? ' aria-current="page"' : ""} class="${state.progress.days[item.id] ? "complete" : ""}" aria-label="Day ${item.id}${state.progress.days[item.id] ? ", complete" : ""}">${item.id}</a>`).join("")}</nav>
    <div class="cols"><div class="cols-main">
      ${guidedDays[day.id]?.length ? guidedCard : ""}
      <details class="card card--fold"${guidedDays[day.id]?.length ? "" : " open"}><summary><span class="card-fold-title">Videos and extra practice</span><span class="meta">${plural(dailyExercises[day.id]?.length ?? 0, "exercise")} with video</span></summary>
        <ol class="steps daily-exercises">${exercises}</ol>
        ${!first && related.length ? `<details class="disclosure"><summary>Related lessons</summary>${lessonList(related)}</details>` : ""}
      </details>
      ${pager("Practice day navigation", neighbour(course.days[day.id - 2], "Previous day"),
        day.id < course.days.length ? neighbour(course.days[day.id], "Next day") : { href: "#module/M03", label: "Next module", title: modules.get("M03").title })}
    </div><aside class="cols-side">
      ${card(first ? "Day 1 checkpoint" : rest ? "Log the rest day" : "Check your work", `<p>${first ? rich(course.dayOneTest) : rest ? "Mark this day when you’re ready to move to the next plan." : "Try the assignment and make a note of what to repeat."}</p>
        ${check(`data-day="${day.id}"`, "Day complete", state.progress.days[day.id], "check-row--cta")}
        ${link("#module/" + module.id, "Module and assessment")}`)}
      ${card("Reading resources", `<ul class="link-list"><li>${link("#reading/guided", "Guided notes and fretboard")}</li><li>${pdf}</li><li>${link("#reading", "Music Reading Academy")}</li><li>${link("note-reading/", "Note-reading quiz")}</li></ul>`)}
    </aside></div>`;
}

function techniqueView() {
  const sections = [
    { id: "hand-position", title: "Hand position and tone", body: `<p>Keep the wrist relaxed. Let the fingers release toward the palm and return easily. Move slightly toward the fingerboard for a rounder tone or toward the bridge for a clearer attack.</p><p>Try four notes on the open first string at each position, then record both approaches and compare.</p><p>${link("#lesson/L02", "Start with your first notes")}</p>` },
    { id: "speed-control", title: "Speed and control", body: "<p>Use compact strokes. Begin with four notes at a time and stop before tension accumulates. Add a few beats per minute only when the movement stays easy.</p><p>When a note scratches, use less pad or change the release angle. When an arpeggio loses a note, check if a neighboring finger touched the string too early.</p>" },
    ...course.techniques.map(technique => ({ id: technique.id, title: technique.title, body: `<p>${refs(technique.body)}</p>` }))
  ];
  return head({ title: "Playing Without Nails", lede: "Use a small part of the fingertip pad near its edge. Try a slightly different angle if the string catches, then compare the sound at the same volume." }) +
    `<nav class="toc" aria-label="Techniques on this page">${sections.map(item => `<a href="#technique/${item.id}">${escape(item.title)}</a>`).join("")}</nav>
    <div class="techniques">${sections.map(item => `<section class="technique" id="technique-${item.id}" tabindex="-1">
      <div class="technique-text"><h2>${escape(item.title)}</h2>${item.body}</div>
      ${videoSection(supportTopics[item.id])}
    </section>`).join("")}</div>`;
}

function readingQuestion() {
  const { question: quiz, answer, reading } = state;
  const scored = Boolean(quiz.answers);
  const solution = quiz.bars?.map((bar, index) => `<li><strong>Bar ${index + 1}</strong><ul>${bar.map(({ pitch, beats, bass }) => `<li>${escape(noteLocation(pitch))}${bass ? ` with bass ${escape(noteLocation(bass))}` : ""} · ${beats} ${beats === 1 ? "beat" : "beats"}</li>`).join("")}</ul></li>`).join("");
  return `<h3 class="quiz-prompt">${quiz.prompt}</h3>${quiz.html}
      ${scored ? `<div class="answer-options" role="group" aria-label="Answers">${quiz.answers.map((option, index) => {
        const chosen = answer === option;
        const correct = answer && quiz.correct.includes(option);
        return `<button type="button" class="answer" data-answer="${index}"${answer ? " disabled" : ""}${correct ? ' data-correct="true"' : chosen ? ' data-wrong="true"' : ""}><kbd aria-hidden="true">${index + 1}</kbd>${escape(option)}</button>`;
      }).join("")}</div>` : ""}
      ${scored ? `<p class="quiz-feedback" role="status">${answer ? (quiz.correct.includes(answer) ? "Correct." : "Answer: " + escape(quiz.correct[0]) + ".") + (quiz.explanation ? ` <span class="meta">${escape(quiz.explanation)}</span>` : "") : ""}</p>` : ""}
      ${solution ? `<details class="disclosure"><summary>Show strings and frets after your first take</summary><ul class="solution">${solution}</ul></details>` : ""}
      <div class="actions"><button type="button" class="btn" data-new-question${scored && !answer ? " disabled" : ""}>${scored ? "Next question" : "New score"}${arrow}</button>${scored && reading.attempts ? `<span class="meta">${reading.correct} correct out of ${reading.attempts}</span>` : ""}</div>
      ${scored ? '<p class="meta keys-hint">On a keyboard, press the number beside an answer.</p>' : ""}`;
}

function readingView() {
  const { reading } = state;
  const topic = readingModes.find(mode => mode.id === reading.mode);
  return head({ title: "Music Reading Academy", lede: "Find the note on the staff, name it, then play it on the guitar. Start with the three open strings." }) +
    `<div class="actions">${btn("#reading/guided", "Learn the fretboard step by step")}${btn("note-reading/", "Play the note-reading quiz", "ghost")}</div>
    <div class="cols"><div class="cols-main">
    <section class="card trainer"><h2>Practice</h2>
      <div class="tabs" role="group" aria-label="Reading exercise">${readingModes.map(mode => `<button type="button" data-mode="${mode.id}" aria-pressed="${mode.id === reading.mode}">${mode.label}</button>`).join("")}</div>
      ${["notes", "frets", "melody"].includes(reading.mode) || reading.mode === "melody" ? `<div class="trainer-options">
        ${["notes", "frets", "melody"].includes(reading.mode) ? `<label class="field">Note range<select id="reading-level">${readingLevels.map(item => `<option value="${item.id}"${item.id === reading.level ? " selected" : ""}>${item.label}</option>`).join("")}</select></label>` : ""}
        ${reading.mode === "melody" ? `<label class="field">Length<select id="reading-bars">${[2, 4].map(bars => `<option value="${bars}"${bars === reading.bars ? " selected" : ""}>${bars} bars</option>`).join("")}</select></label>` : ""}
      </div>` : ""}
      <div id="reading-question" class="quiz">${readingQuestion()}</div>
    </section></div><aside class="cols-side">
      ${card(topic.label, videoResources(supportTopics[topic.id], "Watch before trying the exercise", true))}
      ${card("Find notes on the guitar", `<p>Count staff lines and spaces from the bottom. String 1 is the thinnest. Fret 0 means open.</p>${openNoteMap()}
        <details class="disclosure"><summary>Show all first-position natural notes</summary><p class="meta">Octave numbers refer to the notes as written. The guitar sounds one octave lower.</p>${noteMap(firstPosition.map(note => note.pitch), true)}</details>`)}
      ${card("Printed practice", `<p>Start with scores A–C and save Score H for your first-take assessment.</p><p>${pdf}</p>
        <details class="disclosure"><summary>Watch a printed exercise at 48 bpm</summary><div class="score-index">${[..."ABCDEFGH"].map(letter => `<a href="media/score-${letter.toLowerCase()}.mp4">Score ${letter}</a>`).join("")}</div></details>`)}
    </aside></div>`;
}

function guidedReadingView() {
  return head({ back: crumb("#reading", "Music Reading Academy"), title: "Read a note and find its fret", lede: "Match staff positions to the guitar, then hear what changes when you move a fret or an octave." }) +
    `<div class="cols"><div class="cols-main">${guidedCard}</div>
    <aside class="cols-side">${card("Open-string reference", openNoteMap())}</aside></div>`;
}

function repertoireView() {
  return head({ title: "Repertoire", lede: "Find a piece to practise from the score, then revisit it as your tone and rhythm improve." }) +
    `<a class="feature" href="#estas">
      <span><span class="kicker">Guide</span><strong>Estas Tonne</strong><span class="feature-copy">Study four pieces and practise the right-hand patterns with fingertip pads.</span></span>
      <span class="link">${labelled("Open the guide", arrow)}</span>
    </a>
    <ol class="rows rows--pieces">${repertoire.map(([name, skill, id], index) => `<li><a class="row" href="#lesson/${id}">
      <span class="row-num" aria-hidden="true">${index + 1}</span>
      <span class="row-main"><strong>${escape(name)}</strong><small>${escape(skill)}</small></span>
      <span class="row-end">${lessonStatus(lessons.get(id))}<span class="row-action">Lesson and score</span>${icon("chevron-right")}</span></a></li>`).join("")}</ol>`;
}

function estasView(piece) {
  if (piece) return head({ back: crumb("#estas", "Estas Tonne guide"), kicker: piece.level, title: piece.title, lede: piece.intro }) +
    `<div class="cols cols--even"><div class="cols-main">
      ${card("Practise the passage", stepsList(piece.steps, estasStepVideos[piece.id]))}
      ${card("Checkpoint", `<p>${escape(piece.checkpoint)}</p>${link("#journal", "Log a practice take")}`)}
    </div><aside class="cols-side">
      ${card("What to watch", videoResources(piece.videos, "Performances and lessons", true))}
      ${card("Scores and sources", `<ul class="link-list">${piece.links.map(([label, url]) => `<li>${ext(url, label)}</li>`).join("")}</ul>`)}
    </aside></div>`;
  return head({ title: "Estas Tonne on fingertip pads", lede: "Use the performances to hear the phrasing, then follow a tutorial or a score for one small passage. Start with the open-string pattern if you’re building your right hand." }) +
    `<div class="actions">${btn("#estas/golden-dragon", "Study The Golden Dragon")}${btn("#lesson/L02", "Learn your first pad stroke", "ghost")}</div>
    <ol class="pieces">${estasPieces.map((item, index) => `<li class="piece">
      <span class="syllabus-num" aria-hidden="true">${index + 1}</span>
      <div class="piece-body"><h2><a href="#estas/${item.id}">${escape(item.title)}</a></h2><p>${escape(item.skill)}</p><p class="meta">${escape(item.level)}</p></div>
      <span class="link">${labelled(item.start, arrow)}</span>
    </li>`).join("")}</ol>
    <section class="section"><h2>Read and play</h2>
      <p class="lede">These original exercises build the thumb pulse and phrasing used in the studies. Right-hand finger names are p (thumb), i (index), m (middle) and a (ring).</p>
      <div class="grid-2">${estasDrills.map((drill, index) => `<article class="card"><h3 class="card-title">${escape(drill.title)}</h3>${score(drill.bars, { label: drill.label })}<p>${escape(drill.focus)}</p>${videoResources(estasDrillVideos[index], "Video for this exercise")}</article>`).join("")}</div>
    </section>
    <p>${ext("https://www.estastonne.com/faq/", "Estas Tonne’s FAQ on recordings and sheet music")}</p>`;
}

function roadmapView() {
  return head({ back: crumb("#course", "Curriculum"), title: "Months 7–12", lede: "Continue when the foundations feel steady. Use the milestones to guide the next six months." }) +
    `<ol class="timeline">${course.roadmap.map(item => `<li>
      <div class="timeline-mark"><span>Month</span><strong>${item.month}</strong></div>
      <div class="timeline-body"><p>${refs(item.focus)}</p>${callout("Milestone", refs(item.milestone))}${videoResources(roadmapPracticeVideos[item.month], "Videos for this practice")}
      ${item.month === 10 ? `<p>${link("#lesson/L35", "Alzapúa lesson")}</p>` : ""}</div>
    </li>`).join("")}</ol>`;
}

function journalEntries() {
  const entries = [...state.progress.journal].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  if (!entries.length) return '<p class="muted">Your saved sessions will appear here.</p>';
  const minutes = entries.reduce((sum, entry) => sum + entry.minutes, 0);
  return `<p class="meta">${plural(entries.length, "session")} · ${plural(minutes, "minute")} in total</p>` + entries.map(entry => `<article class="journal-entry">
      <div class="entry-head"><h3>${escape(entry.piece || "Practice session")}</h3><span class="meta">${entry.date} · ${entry.minutes} min</span></div>
      ${[["exercises", "Exercises"], ["difficulty", "Difficulties"], ["notes", "Next time"], ["skills", "Skills"]].filter(([key]) => entry[key]).map(([key, label]) => `<p><strong>${label}</strong> · ${escape(entry[key])}</p>`).join("")}
      ${state.confirmDelete === entry.id
        ? `<p class="entry-actions entry-actions--confirm" role="group" aria-label="Delete this session?"><span>Delete this session?</span><button type="button" class="btn btn--danger btn--small" data-delete-entry="${entry.id}">Delete</button><button type="button" class="btn btn--ghost btn--small" data-cancel-delete>Keep</button></p>`
        : `<p class="entry-actions"><a class="link" href="#journal/${entry.id}">Edit session</a><button type="button" class="link link--button" data-ask-delete="${entry.id}">Delete</button></p>`}
    </article>`).join("");
}

function journalView(editId) {
  const edit = state.progress.journal.find(entry => entry.id === editId);
  const field = (key, label, wide = false) => `<label class="field${wide ? " full" : ""}">${label}${wide
    ? `<textarea name="${key}" maxlength="2000" rows="2">${escape(edit?.[key])}</textarea>`
    : `<input name="${key}" maxlength="2000" value="${escape(edit?.[key])}">`}</label>`;
  return head({ title: "Practice journal", lede: "Keep a brief record of what you played and what to try next. Entries stay in this browser." }) +
    `<div class="cols cols--even">
    <section class="card"><h2>${edit ? "Edit session" : "Log a session"}</h2>
      <form id="journal-form" class="form-grid" data-edit="${edit?.id ?? ""}">
        <label class="field">Date<input required type="date" name="date" value="${edit?.date ?? dateKey()}"></label>
        <label class="field">Minutes<input required type="number" inputmode="numeric" name="minutes" min="1" max="600" value="${edit?.minutes ?? state.progress.minutes}"></label>
        ${field("exercises", "Exercises completed")}${field("piece", "Current piece")}
        ${field("difficulty", "What was difficult?", true)}${field("notes", "What will you try next?", true)}${field("skills", "Skills improved", true)}
        <div class="actions full"><button type="submit" class="btn">Save session</button>${edit ? `<a class="btn btn--ghost" href="#journal">Cancel</a>` : ""}</div>
      </form>
    </section>
    <section class="card"><h2>Past sessions</h2><div id="journal-entries">${journalEntries()}</div></section></div>`;
}

function progressView() {
  const { progress } = state;
  const watched = core.filter(lesson => flags(lesson.id).watched).length;
  const tests = course.modules.filter(module => progress.assessments[module.id]).length;
  const days = course.days.filter(day => progress.days[day.id]).length;
  const stat = (key, value, total, label) => `<li data-stat="${key}"><strong>${value}${total ? `<span> of ${total}</span>` : ""}</strong>${label}</li>`;
  return head({ title: "Progress", lede: "Video views, practice and mastery are tracked separately." }) +
    `<p>${link("#hero", "Your hero: level, skills, quests and achievements")}</p>` +
    `<section class="card overview"><h2>Course progress</h2>
      <div class="overview-body">${ring(practised(core), core.length)}
        <ul class="stats">
          ${stat("watched", watched, core.length, watched === 1 ? "video watched" : "videos watched")}
          ${stat("practised", practised(core), core.length, "core exercises practised")}
          ${stat("mastered", mastered(core), 0, mastered(core) === 1 ? "skill mastered" : "skills mastered")}
          ${stat("assessments", tests, course.modules.length, "assessments passed")}
          ${stat("days", days, course.days.length, "days completed")}
          ${stat("sessions", progress.journal.length, 0, progress.journal.length === 1 ? "practice session logged" : "practice sessions logged")}
        </ul>
      </div>
    </section>
    <section class="section"><h2>By module</h2>
      <ol class="module-progress">${course.modules.map(module => {
        const items = coreFor(module.id);
        return `<li>
          <span class="syllabus-num" aria-hidden="true">${String(moduleNumber(module.id)).padStart(2, "0")}</span>
          <div class="module-progress-body"><h3><a href="#module/${module.id}">${escape(module.title)}</a></h3>
            ${track(practised(items), items.length, `${module.title}: exercises practised`)}
            <p class="meta">${practised(items)} of ${items.length} exercises practised · ${plural(mastered(items), "skill")} mastered</p></div>
          ${pill(...status(module))}
        </li>`;
      }).join("")}</ol>
    </section>`;
}

function installCard() {
  const app = state.app ?? {};
  if (app.installed) return card("The installed app", `<p>You are using the academy as an installed app. It opens from your home screen or app list and works offline.</p>`);
  if (app.installable) return card("Install the app", `<p>Add the academy to this device: it opens in its own window, works offline and keeps the screen awake during a guided session.</p><button type="button" class="btn" data-install>${icon("phone")}Install the app</button>`);
  if (app.ios) return card("Add it to your Home Screen", `<p>On an iPhone or iPad, open the academy in Safari, then:</p><ol class="plain-list install-steps"><li>Tap the Share button ${icon("share")} at the bottom or top of the screen.</li><li>Scroll down and tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. The academy opens from its own icon, full screen and offline.</li></ol><p class="meta">The Home Screen app keeps its own progress, apart from Safari’s. Turn on sync in both to share it.</p>`);
  return card("Install the app", `<p>In Chrome or Edge, use <strong>Install</strong> in the address bar or the browser’s menu. In Safari on a Mac, choose <strong>File › Add to Dock</strong>. On Android, open the browser’s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</p><p class="meta">In other browsers the academy still works offline once it has been opened.</p>`);
}

function offlineCard() {
  const app = state.app ?? {};
  return card("Offline", `<p>${app.offlineReady ? "The academy is saved on this device: lessons, the practice tools and the note quiz open without a connection. Videos from YouTube need one." : "Once the academy has loaded here, it is saved for offline use."}</p>
    <p class="meta">The score play-along videos and the reading sheets are saved when you open them, or all at once:</p>
    <button type="button" class="btn btn--ghost" data-save-everything${app.offlineReady ? "" : " disabled"}>${icon("download")}Save the videos and sheets (1 MB)</button>
    <p class="import-feedback" data-save-feedback role="status"></p>`);
}

function settingsView() {
  const sync = state.sync;
  return head({ title: "Settings", lede: "Choose how the academy looks, install it, sync it between your devices, or move your records with a JSON backup." }) +
    `<div class="grid-2">
    ${card("Sync between devices", sync?.configured
      ? `<p>${sync.on ? `Sync is on. ${escape(syncStatus(sync))}` : "Keep the same progress on your phone, tablet and computer, with no account. Your records are encrypted before they leave this device."}</p>${link("#sync", sync.on ? "Sync settings" : "Turn on sync")}`
      : `<p>Sync is not set up on this website yet. Use a backup to move your progress.</p>${link("#sync", "About sync")}`)}
    ${installCard()}
    ${card("Appearance", `<p>Follow your device, or keep the academy light or dark.</p>
      <div class="segment" role="group" aria-label="Theme">${[["auto", "Auto"], ["light", "Light"], ["dark", "Dark"]].map(([value, label]) => `<button type="button" data-theme-choice="${value}" aria-pressed="${state.theme === value}">${label}</button>`).join("")}</div>`)}
    ${offlineCard()}
    ${card("Export a backup", `<p>Download your progress, assessments, practice days, journal and hero. Keep the file somewhere private.</p><button type="button" class="btn" data-export>${icon("download")}Export JSON</button>`)}
    ${card("Import a backup", `<p>Choose a backup to preview what it contains. Import merges records with this browser’s saved progress.</p>
      <label class="field">Backup file<input id="backup-file" type="file" accept=".json,application/json"></label>
      <div id="import-feedback" class="import-feedback" aria-live="polite"></div>`)}
    ${state.storageOk ? "" : card("Browser storage unavailable", "<p>Changes are kept until you reload or close this page. Export a backup before leaving.</p>", "card--warn")}
    ${card("About the academy", `<p>How the course works, who teaches the lessons and what happens to your records.</p>${link("#about", "Read about the academy")}`)}
    </div>`;
}

function aboutView() {
  const teachers = new Map();
  for (const lesson of course.lessons) {
    const entry = teachers.get(lesson.teacher) ?? { channels: new Set(), languages: new Set(), count: 0 };
    entry.channels.add(lesson.channel);
    entry.languages.add(lesson.language);
    entry.count++;
    teachers.set(lesson.teacher, entry);
  }
  const rows = [...teachers].sort((a, b) => b[1].count - a[1].count);
  return head({ title: "About the academy", lede: "A self-study plan for classical guitar and flamenco, played with the fingertips instead of nails." }) +
    `<div class="cols"><div class="cols-main">
      ${section("How it works", `<ul class="plain-list">
        <li>${course.modules.length} modules over six months. Each has video lessons, a practice assignment and a checkpoint to pass before you move on.</li>
        <li>The first ${course.days.length} days are planned day by day, with a review at the end of each week and scheduled rest days. After them, each module has three daily menus that take turns.</li>
        <li>A session takes 25 minutes, or 10 on a short day.</li>
        <li>You read notation from the first session, and the reading trainer drills it separately.</li>
        <li>The practice room has a guided session with a timer, a metronome with a speed trainer, a tuner, a chord trainer and a compás trainer.</li>
        <li>Everything you practise earns experience for your hero: six skills, daily and weekly quests, a boss at the end of each module and achievements.</li>
        <li>It installs on a phone or computer, works offline, and can sync between your devices with a code.</li>
        <li>A roadmap of milestones covers months 7–12.</li>
      </ul><div class="actions">${btn("#course", "See the curriculum")}${btn("#days", "First 28 days", "ghost")}</div>`)}
      ${section("Teachers and sources", `<p>The lessons are videos their teachers published on YouTube. They load only when you press play, and every lesson links to the original video and to the teacher’s own materials.</p>
        <table class="table"><thead><tr><th scope="col">Teacher</th><th scope="col">Channel</th><th scope="col">Lessons</th></tr></thead>
        <tbody>${rows.map(([name, entry]) => `<tr><th scope="row"${/[Ѐ-ӿ]/.test(name) ? ` lang="${languageCodes[[...entry.languages][0]] ?? "uk"}"` : ""}>${escape(name)}</th><td>${[...entry.channels].map(escape).join(", ")}</td><td>${entry.count}</td></tr>`).join("")}</tbody></table>
        <p>The reading sheets are the academy’s own drills. The Estas Tonne guide links to the artist’s pages and to third-party lessons and tabs.</p>`)}
    </div><aside class="cols-side">
      ${card("Your practice records", `<p>Progress, checklists, journal entries and your hero are saved in this browser, on this device. There is no account. If you turn on sync, an encrypted copy that only your devices can open is kept on the sync server; otherwise nothing is uploaded.</p>${link("#settings", "Back up, sync or move your records")}`)}
      ${card("Credits", `<p>Typefaces: Cormorant Garamond and Commissioner. Staff symbols: Noto Music. All three are under the SIL Open Font License.</p><ul class="link-list"><li><a class="link link--ext" href="fonts/OFL.txt" target="_blank" rel="noopener">${labelled("Font licence", icon("arrow-up-right"))}${newTab}</a></li><li><a class="link link--ext" href="../">${labelled("foshchii.com", icon("arrow-up-right"))}</a></li></ul>`)}
    </aside></div>`;
}

function menuView() {
  const item = (href, name, title, text) => `<a href="${href}">${icon(name)}<span><strong>${title}</strong><small>${text}</small></span>${arrow}</a>`;
  return head({ title: "All sections" }) +
    `<nav class="explore explore--menu" aria-label="All sections">
      ${item("#home", "metronome", "Today", "Your session and where you left off.")}
      ${item("#course", "book", "Curriculum", "Twelve modules, the first 28 days and months 7–12.")}
      ${item("#practice", "timer", "Practice room", "Guided session, metronome, tuner, chord trainer and compás trainer.")}
      ${item("#hero", "crown", "Your hero", "Level, six skills, quests, bosses and achievements.")}
      ${item("#reading", "note", "Music Reading Academy", "Note names, frets, rhythm and sight-reading on a staff.")}
      ${item("note-reading/", "star", "Note-reading quiz", "Eighteen quiz levels on the staff and the fretboard, rhythm, dynamics, scales and chords, with sound and stars.")}
      ${item("#technique", "wave", "Playing Without Nails", "Each stroke, adapted for fingertip pads.")}
      ${item("#estas", "star", "Estas Tonne guide", "Four pieces, studied one phrase at a time.")}
      ${item("#repertoire", "sheet", "Repertoire", "Pieces to practise from the score.")}
      ${item("#journal", "journal", "Practice journal", "What you played and what to try next.")}
      ${item("#progress", "chart", "Progress", "Video views, practice and mastery.")}
      ${item("#sync", "cloud", "Sync", "The same progress on all your devices, with no account.")}
      ${item("#settings", "sliders", "Settings", "Install, offline, appearance, backup and restore.")}
      ${item("#about", "info", "About the academy", "How it works, its teachers and your records.")}
    </nav>`;
}

// ---------------------------------------------------------------- the hero

function medal(badge) {
  const symbol = { Journey: "flag", Habit: "flame", Skill: "star", Tools: "metronome" }[badge.group] ?? "star";
  return `<span class="medal" aria-hidden="true">${icon(badge.earned ? symbol : "lock")}</span>`;
}

function bossCard(chapter) {
  return `<div class="boss">
      <p class="kicker">Boss of chapter ${roman(chapter.number)}</p>
      <h4>${escape(chapter.boss.name)}</h4>
      <dl class="pairs boss-facts"><dt>Its trick</dt><dd>${refs(chapter.boss.trick)}</dd><dt>To beat it</dt><dd>${refs(chapter.boss.challenge)}</dd><dt>If it wins</dt><dd>${refs(chapter.boss.repair)}</dd></dl>
      <p class="meta">Beat it by passing the module’s assessment: +${rewards.assessment} XP for ${escape(skillName(chapter.skill))}.</p>
      ${link("#module/" + chapter.id, "Train for it in the module")}
    </div>`;
}

function heroView() {
  const hero = heroNow();
  const { progress } = state;
  const path = heroPaths[hero.path];
  const sources = Object.entries(hero.sources).filter(([, xp]) => xp > 0).sort((a, b) => b[1] - a[1]);
  const weekly = hero.weekly;
  const days = hero.weekly.days.map((date, i) => `<li class="${hero.dates.has(date) ? "is-on" : ""}${date === (state.today ?? dateKey()) ? " is-today" : ""}"><i></i>${"MTWTFSS"[i]}</li>`).join("");
  return head({ kicker: "Your hero", title: hero.name || "Your hero", lede: path ? path.motto : "Everything you practise earns experience. Level up, keep a streak, finish quests and beat the boss at the end of every module." }) +
    `<section class="card hero-sheet">
      <div class="hero-sheet-main">${crest(hero.level, "large")}
        <div class="hero-sheet-text">
          <p class="kicker">Level ${hero.level}${path ? ` · ${escape(path.name)}` : ""}</p>
          <h2>${escape(hero.title)}</h2>
          ${bar(hero.into, hero.span, `Experience: ${hero.into} of ${hero.span} to level ${hero.level + 1}`, "xpbar--large")}
          <p class="meta">${number(hero.total)} XP · ${number(hero.toNext)} to level ${hero.level + 1}${hero.next ? ` · “${escape(hero.next[1])}” at level ${hero.next[0]}` : ""}</p>
        </div>
      </div>
      <ul class="stats hero-stats">
        <li><strong>+${number(hero.today)}</strong>XP today</li>
        <li><strong>${hero.streak}</strong>${hero.streak === 1 ? "day" : "days"} in a row</li>
        <li><strong>${hero.best}</strong>best streak</li>
        <li><strong>${hero.badges.filter(badge => badge.earned).length}<span> of ${hero.badges.length}</span></strong>achievements</li>
      </ul>
      <p class="meta">One rest day in a week keeps a streak going: the course plans rest days too.</p>
    </section>
    <div class="cols"><div class="cols-main">
      ${dailyCard(hero)}
      <section class="card quest-card">
        <div class="card-head"><h2 class="card-title card-title--small">This week</h2><span class="meta">${weekly.week}</span></div>
        <div class="weekstrip"><ol aria-hidden="true">${days}</ol><p class="meta">${plural(weekly.days.filter(date => hero.dates.has(date)).length, "day")} with practice this week</p></div>
        ${questList(weekly.quests)}
      </section>
      <section class="section">
        <h2>Journey</h2>
        <p class="lede">Twelve chapters, one for each module. At the end of each waits a boss: the mistake the module warns about. Its assessment is how you beat it.</p>
        <ol class="journey">${hero.chapters.list.map(chapter => `<li class="chapter is-${chapter.state}">
          <span class="chapter-num" aria-hidden="true">${roman(chapter.number)}</span>
          <div class="chapter-body">
            <h3><a href="#module/${chapter.id}">${escape(chapter.title)}</a></h3>
            <p class="meta">${escape(chapter.weeks)} · ${escape(skillName(chapter.skill))} · ${chapter.practised} of ${chapter.lessons.length} ${chapter.lessons.length === 1 ? "lesson" : "lessons"} practised</p>
            ${chapter.state === "current" ? bossCard(chapter) : `<p class="chapter-boss">${chapter.boss.defeated ? `${icon("check")}Beaten: ` : "Boss: "}${escape(chapter.boss.name)}</p>`}
          </div>
          ${pill(chapter.state === "done" ? "Beaten" : chapter.state === "current" ? "Now" : "Ahead", chapter.state === "done" ? "done" : chapter.state === "current" ? "go" : "")}
        </li>`).join("")}</ol>
      </section>
      <section class="section">
        <h2>Achievements</h2>
        ${["Journey", "Habit", "Skill", "Tools"].map(group => `<div class="badge-group"><h3>${group}</h3><ul class="badges">${hero.badges.filter(badge => badge.group === group).map(badge => `<li class="badge${badge.earned ? " is-earned" : ""}">${medal(badge)}
          <div><strong>${escape(badge.name)}</strong><small>${escape(badge.how)}</small>${badge.earned
            ? `<span class="meta">Earned ${dateLabel(badge.earned)} · +${badge.xp} XP</span>`
            : `${bar(badge.value, badge.target, `${badge.name}: ${badge.value} of ${badge.target}`)}<span class="meta">${badge.target > 1 ? `${badge.value} of ${badge.target} · ` : ""}+${badge.xp} XP</span>`}</div></li>`).join("")}</ul></div>`).join("")}
      </section>
    </div><aside class="cols-side">
      <section class="card">
        <h2 class="card-title card-title--small">Skills</h2>
        <ul class="skills">${hero.skills.map(skill => `<li>
          <span class="skill-icon" aria-hidden="true">${icon(skill.icon)}</span>
          <div class="skill-main"><p><strong>${skill.name}</strong><span class="meta">Level ${skill.level}</span></p>
            ${bar(skill.into, skill.span, `${skill.name}: ${skill.into} of ${skill.span} to level ${skill.level + 1}`)}
            <small>${escape(skill.blurb)} ${number(skill.xp)} XP.</small></div>
        </li>`).join("")}</ul>
        <p class="meta">Lessons and bosses train their module’s skill. The note quiz trains the skills of the questions you answer, and each practice tool trains its own.</p>
      </section>
      <section class="card">
        <h2 class="card-title card-title--small">Where your experience comes from</h2>
        ${sources.length ? `<table class="table"><tbody>${sources.map(([source, xp]) => `<tr><th scope="row">${escape(sourceNames[source] ?? source)}</th><td>${number(xp)}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Nothing yet. Tick a step of today’s session to earn your first experience.</p>`}
        <details class="disclosure"><summary>What earns experience</summary>
          <ul class="plain-list">
            <li>A lesson watched ${rewards.watched}, practised ${rewards.practised}, mastered ${rewards.mastered}; a boss beaten ${rewards.assessment}.</li>
            <li>A day of the first four weeks ${rewards.day}; each step of the daily session ${rewards.activity} (up to ${rewards.activitiesPerDay} a day).</li>
            <li>A journal entry ${rewards.journal}, plus 1 for every two minutes logged (up to two hours).</li>
            <li>Note quiz points count half: 50 points are 25 XP.</li>
            <li>Practice tools: a minute of metronome 1, a chord change 1, a compás round up to 20, tuning all six strings 10.</li>
            <li>Daily quests 20 each and 30 more for all three; weekly quests 100 and 60; achievements as listed.</li>
          </ul></details>
      </section>
      <section class="card">
        <h2 class="card-title card-title--small">Name and path</h2>
        <form id="hero-form" class="flow">
          <label class="field">Your hero’s name<input name="name" maxlength="40" autocomplete="nickname" value="${escape(progress.profile?.name)}" placeholder="Leave empty to go by your title"></label>
          <fieldset class="paths"><legend>Path</legend>${Object.entries(heroPaths).map(([id, item]) => `<label class="check-row"><input class="check check--radio" type="radio" name="path" value="${id}"${progress.profile?.path === id ? " checked" : ""}><span><strong>${escape(item.name)}</strong><small>${escape(item.motto)}</small></span></label>`).join("")}</fieldset>
          <div class="actions"><button type="submit" class="btn">Save</button></div>
        </form>
      </section>
    </aside></div>`;
}

// ---------------------------------------------------------------- the practice room

const toolCards = [
  ["session", "timer", "Guided session", "Today’s plan one step at a time, with a countdown, a bell and the screen kept awake."],
  ["metronome", "metronome", "Metronome", "Tap tempo, subdivisions, three sounds and a speed trainer that raises the tempo for you."],
  ["tuner", "mic", "Tuner", "Tune through the microphone, string by string, or by ear from reference notes."],
  ["chords", "chord", "Chord trainer", "One-minute chord changes, naming chords from their boxes, and a library to hear."],
  ["compas", "hand", "Compás trainer", "Rumba, tangos, soleá, bulerías and seguiriyas with palmas, and a round to tap the accents."]
];

function todayTotal(metric) {
  const date = state.today ?? dateKey();
  return Object.values(state.progress.counters ?? {}).reduce((total, device) => total + (device.days?.[date]?.[metric] ?? 0), 0);
}
const best = prefix => Math.max(0, ...Object.entries(state.progress.records ?? {}).filter(([id]) => id.startsWith(prefix)).map(([, record]) => record.v));

function toolNote(id) {
  if (id === "session") {
    const plan = planToday();
    const done = plan.activities.filter(([key]) => state.progress.activities[plan.prefix + key]).length;
    return plan.activities.length ? `${done} of ${plan.activities.length} steps ticked today` : "A rest day in your plan";
  }
  if (id === "metronome") return `${Math.floor(todayTotal("sec.metronome") / 60)} min today`;
  if (id === "tuner") return todayTotal("n.tuneup") ? "All six strings tuned today" : "Not tuned today";
  if (id === "chords") return best("changes.") ? `Best: ${best("changes.")} changes in a minute` : "No changes counted yet";
  if (id === "compas") return best("compas.") ? `Best tap round: ${best("compas.")}%` : "No tap round yet";
  return "";
}

function practiceHub() {
  return head({ title: "Practice room", lede: "Tools for the pulse, the ears and both hands. They work offline, and every one of them trains a skill." }) +
    `<ul class="tool-grid">${toolCards.map(([id, symbol, title, text]) => `<li><a class="tool-tile" href="#practice/${id}">
      <span class="tool-icon" aria-hidden="true">${icon(symbol)}</span>
      <span class="tool-text"><strong>${title}</strong><small>${text}</small><span class="meta">${escape(toolNote(id))}</span></span>${arrow}</a></li>`).join("")}
      <li><a class="tool-tile" href="#reading"><span class="tool-icon" aria-hidden="true">${icon("note")}</span><span class="tool-text"><strong>Reading trainer</strong><small>Note names, frets, rhythm, keys and sight-reading on the staff.</small><span class="meta">${todayTotal("n.reading")} right today</span></span>${arrow}</a></li>
      <li><a class="tool-tile" href="note-reading/"><span class="tool-icon" aria-hidden="true">${icon("star")}</span><span class="tool-text"><strong>Note quiz</strong><small>Eighteen levels with stars, ear training, sight-reading and tap the rhythm, listening through the microphone.</small><span class="meta">Its points count toward your hero</span></span>${arrow}</a></li>
    </ul>`;
}

const toolPages = {
  session: {
    title: "Guided session", lede: "Today’s plan, one step at a time. Start the timer, play, and tick the step off when you are done.",
    side: () => card("How it works", `<ul class="plain-list"><li>Each step has the minutes the plan gives it. A bell rings when they are up; carry on if you are in the middle of something.</li><li>Ticking a step here ticks it on the Today screen too.</li><li>The screen stays on while the timer runs, so you can leave the phone on the music stand.</li><li>At the end, save the session in your journal in one tap.</li></ul>${link("#home", "Back to today")}`)
  },
  metronome: {
    title: "Metronome", lede: "Keep the pulse, then let the speed trainer raise the tempo a little at a time while the movement stays easy.",
    side: () => card("Practising with it", `<ul class="plain-list"><li>Start where every note is easy and even. The course gives a tempo for most drills, often 45–60 bpm.</li><li>Speed comes from relaxed repetitions, not from forcing: raise the tempo by 2–4 bpm only when four clean repetitions in a row feel easy.</li><li>For eighth notes, set each beat as eighth notes and count “1 and 2 and”.</li></ul>
      <details class="disclosure"><summary>Keyboard</summary><p>Space starts and stops. The arrow keys change the tempo by 1, Page Up and Page Down by 5. T taps the tempo.</p></details>
      ${link("#technique/speed-control", "Speed and control without nails")}`)
  },
  tuner: {
    title: "Tuner", lede: "Play one open string at a time and turn its peg until the needle rests in the middle.",
    side: () => card("Tuning tips", `<ul class="plain-list"><li>Standard tuning from string 6 to string 1: E A D G B E.</li><li>Tune up to the note: if a string is sharp, loosen it below the note first, then bring it up.</li><li>New nylon strings stretch for days. Tune before every session, and again halfway if they are new.</li><li>No microphone? Tap a string above to hear its note and match it by ear.</li></ul>
      <p class="meta">The sound is analysed in this page and dropped at once. Nothing is recorded or sent.</p>`)
  },
  chords: {
    title: "Chord trainer", lede: "Learn the shapes Module 7 and the flamenco modules use, then make the changes between them quick and clean.",
    side: () => card("Reading a chord box", `<p>The six vertical lines are the strings, the thickest (6) on the left. The thick line at the top is the nut; the lines below it are frets. A dot shows where a fingertip goes, and its number which finger: 1 index, 2 middle, 3 ring, 4 little. ○ means play the string open, × leave it out.</p>
      <p>Lessons: ${["L22", "L23", "L24"].map(id => `<a href="#lesson/${id}">${id}</a>`).join(", ")} (accompaniment), <a href="#lesson/L26">L26</a> (Malagueñas) and <a href="#module/M10">M10</a> (E Phrygian).</p>`)
  },
  compas: {
    title: "Compás trainer", lede: "Hear and feel the rhythm cycle of a flamenco form, clap it with the palmas, then tap its accents and see how close you are.",
    side: () => card("What compás is", `<p>${refs(modules.get("M09").Goal)}</p><p>Clap or tap the accents before you play over them. Lessons: ${["L28", "L29", "L32", "L35"].map(id => `<a href="#lesson/${id}">${id}</a>`).join(", ")}.</p>`)
  }
};

function practiceView(id) {
  if (!id) return practiceHub();
  const page = toolPages[id];
  return head({ back: crumb("#practice", "Practice room"), title: page.title, lede: page.lede }) +
    `<div class="cols"><div class="cols-main"><section class="card tool-card" data-tool="${id}" aria-label="${escape(page.title)}"><p class="muted">${escape(page.title)} needs JavaScript.</p></section></div>
    <aside class="cols-side">${page.side()}</aside></div>`;
}

// ---------------------------------------------------------------- sync

const syncStatus = sync => {
  const ago = sync.at ? Math.round((Date.now() - sync.at) / 60000) : null;
  if (sync.status === "syncing") return "Syncing…";
  if (sync.status === "offline") return "Waiting for a connection. Changes are kept here and sync when you are back online.";
  if (sync.status === "error") return sync.error?.message ?? "Sync stopped with an error.";
  if (ago === null) return "Not synced yet.";
  return ago < 1 ? "Synced just now." : ago < 60 ? `Synced ${plural(ago, "minute")} ago.` : `Synced ${dateLabel(sync.at)}.`;
};

function syncView(code) {
  const sync = state.sync ?? { configured: false };
  const privacy = card("What is stored", `<p>Your progress is encrypted on this device with a key made from the sync code, then sent. The server keeps only that encrypted copy, under a name also made from the code, so it cannot read it or tell whose it is.</p>
    <p>Anyone with your code or link can open your synced progress and change it, so share it only with your own devices.</p>${link("#about", "About your records")}`);
  if (!sync.configured) {
    return head({ back: crumb("#settings", "Settings"), title: "Sync", lede: "Keep the same progress on your phone, tablet and computer." }) +
      `<div class="grid-2">${card("Not available here yet", `<p>Sync is not set up on this website. Your progress is safe in this browser; to move it, export a backup in Settings and import it on the other device.</p>${link("#settings", "Back up your progress")}`)}${privacy}</div>`;
  }
  const join = code ? card("Connect this device?", `<p>This link joins your synced progress:</p><p class="sync-code">${escape(code)}</p>
      <p>What this device already has is merged with it; nothing is lost on either side.</p>
      <div class="actions"><button type="button" class="btn" data-sync="join" data-code="${escape(code)}">Connect this device</button><a class="btn btn--ghost" href="#home">Not now</a></div>
      ${state.syncMessage ? `<p class="import-feedback" role="status">${escape(state.syncMessage)}</p>` : ""}`) : "";
  if (!sync.on) {
    return head({ back: crumb("#settings", "Settings"), title: "Sync", lede: "Keep the same progress on your phone, tablet and computer. No account: one code connects your devices." }) +
      (join ? `<div class="grid-2">${join}${privacy}</div>` : `<div class="grid-2">
        ${card("Turn on sync", `<p>This device makes a sync code. Show its QR code or link on your other devices to connect them.</p><div class="actions"><button type="button" class="btn" data-sync="create">${icon("cloud")}Turn on sync</button></div>`)}
        ${card("Connect to your other devices", `<p>Already syncing elsewhere? Open the sync link, scan the QR code, or type the code here.</p>
          <form id="sync-join" class="flow"><label class="field">Sync code<input name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" required></label><div class="actions"><button type="submit" class="btn">Connect</button></div></form>`)}
        ${state.syncMessage ? card("Sync", `<p role="status">${escape(state.syncMessage)}</p>`, "card--warn") : ""}
        ${privacy}</div>`);
  }
  const formatted = sync.code.match(/.{1,4}/g).join("-");
  const confirm = state.confirm;
  return head({ back: crumb("#settings", "Settings"), title: "Sync", lede: "Your progress is the same on every device that uses your sync code." }) +
    `<div class="grid-2">
      ${card("Status", `<p class="sync-status" data-sync-status role="status">${icon(sync.status === "error" ? "info" : sync.status === "offline" ? "offline" : "cloud")}<span>${escape(syncStatus(sync))}</span></p>
        <div class="actions"><button type="button" class="btn" data-sync="now"${sync.status === "syncing" ? " disabled" : ""}>Sync now</button></div>
        <p class="meta">This device syncs when the academy opens, a few seconds after each change, and every few minutes while it is open.</p>`)}
      ${card("Add another device", `<div class="sync-share">${qrSvg(sync.link, { label: "QR code with your sync link" })}
          <div class="flow"><p>Scan this with the other device’s camera, or open the link there.</p>
          <div class="actions"><button type="button" class="btn btn--small" data-sync="copy">${icon("copy")}Copy the link</button>${sync.share ? `<button type="button" class="btn btn--ghost btn--small" data-sync="share">${icon("share")}Share</button>` : ""}</div>
          <p class="meta">Code: <span class="sync-code">${state.syncReveal ? escape(formatted) : "••••-••••-••••-••••-" + escape(formatted.slice(-4))}</span> <button type="button" class="link link--button" data-sync="reveal">${state.syncReveal ? "Hide" : "Show"}</button></p></div></div>`)}
      ${card("Stop syncing", confirm === "sync-leave"
        ? `<p>Stop syncing on this device? Its progress stays here, and your other devices keep syncing.</p><p class="entry-actions entry-actions--confirm"><span>Stop on this device?</span><button type="button" class="btn btn--danger btn--small" data-sync="leave">Stop syncing</button><button type="button" class="btn btn--ghost btn--small" data-sync="cancel">Keep syncing</button></p>`
        : confirm === "sync-erase"
        ? `<p>Delete the synced copy from the server? Every device keeps its own progress but stops syncing; this cannot be undone.</p><p class="entry-actions entry-actions--confirm"><span>Delete the synced copy?</span><button type="button" class="btn btn--danger btn--small" data-sync="erase">Delete it</button><button type="button" class="btn btn--ghost btn--small" data-sync="cancel">Keep it</button></p>`
        : `<p>Stop syncing on this device only, or delete the synced copy for all of them.</p><div class="actions"><button type="button" class="btn btn--ghost btn--small" data-sync="ask-leave">Stop on this device</button><button type="button" class="btn btn--danger btn--small" data-sync="ask-erase">Delete the synced copy</button></div>`)}
      ${privacy}
    </div>`;
}

function missingView() {
  return head({ title: "Page not found", lede: "Open the curriculum to find a module or lesson." }) + `<div class="actions">${btn("#course", "Curriculum")}${btn("#home", "Today", "ghost")}</div>`;
}

function route(page, id) {
  const found = (nav, html) => ({ nav, html, found: true });
  const missing = nav => ({ nav, html: missingView(), found: false });
  switch (page) {
    case "home": return found("home", home());
    case "course": return found("course", courseView());
    case "module": return modules.has(id) ? found("course", moduleView(modules.get(id))) : missing("course");
    case "lesson": return lessons.has(id) ? found("course", lessonView(lessons.get(id))) : missing("course");
    case "days": return found("course", daysView());
    case "day": {
      const day = course.days.find(item => String(item.id) === id);
      return day ? found("course", dayView(day)) : missing("course");
    }
    case "technique": return found("technique", techniqueView());
    case "estas": {
      const piece = estasPieces.find(item => item.id === id);
      return id && !piece ? missing("estas") : found("estas", estasView(piece));
    }
    case "reading": return found("reading", id === "guided" ? guidedReadingView() : readingView());
    case "repertoire": return found("repertoire", repertoireView());
    case "roadmap": return found("course", roadmapView());
    case "journal": return found("journal", journalView(id));
    case "progress": return found("progress", progressView());
    case "settings": return found("settings", settingsView());
    case "about": return found("about", aboutView());
    case "menu": return found("menu", menuView());
    case "hero": return id ? missing("hero") : found("hero", heroView());
    case "practice": return !id || practiceTools.includes(id) ? found("practice", practiceView(id)) : missing("practice");
    case "sync": return found("sync", syncView(id ? decodeURIComponent(id) : state.joinCode ?? ""));
    default: return missing("");
  }
}

// ---------------------------------------------------------------- what academy.js calls

const using = render => (current, ...rest) => { state = current; return render(...rest); };

// The whole screen for a route: { nav, html, found }.
export const renderRoute = using((page, id) => {
  const result = route(page, id);
  return { ...result, html: `<div class="view" data-view="${result.found ? page : "missing"}">${result.html}</div>` };
});
// Parts that change without leaving the screen.
export const renderQuestion = using(readingQuestion);
export const renderLessonResults = using(items => items.length ? lessonList(items) : '<p class="muted">No lessons match those filters.</p>');
export const renderModuleStatus = using(module => pill(...status(module)));
export const renderJournalEntries = using(journalEntries);
export const renderImportSummary = using(imported => {
  const lessonCount = Object.values(imported.lessons).filter(saved => Object.keys(saved).length).length;
  return `<p>${plural(lessonCount, "lesson")} with progress, ${plural(Object.keys(imported.assessments).length, "assessment")}, ${plural(Object.keys(imported.days).length, "day")} and ${plural(imported.journal.length, "journal entry", "journal entries")}.</p>
      <button type="button" class="btn" data-confirm-import>Merge backup</button>`;
});
export const practisedCount = using(() => [practised(core), core.length]);
// The hero, as the screens show it; and what its quests need to know about today.
export const renderHero = using(() => heroNow());
export const heroContext = using(() => {
  const plan = planToday();
  return { module: plan.module.id, plan: plan.activities.length > 0 };
});
// Today's plan for the guided session (tool-session.js).
export const todayPlan = using(() => {
  const plan = planToday();
  const title = plan.day ? `Day ${plan.day.id}: ${weekThemes[plan.week - 1]}` : plan.module.title;
  return {
    title, href: plan.href,
    empty: plan.rest ? "Today is a rest day in your plan. Rest is part of practice: listen to a piece you like, or open a practice tool if you want to play." : undefined,
    steps: plan.activities.map(([key, label, detail, minutes]) => ({ key: plan.prefix + key, kind: key, label, detail, minutes, done: Boolean(state.progress.activities[plan.prefix + key]) }))
  };
});
