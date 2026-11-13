import { course } from "./course.js";
import { dateKey, loadProgress, mergeProgress, readProgress, saveProgress } from "./progress.js";
import { firstScore, newQuestion, readingLevels, readingModes } from "./reading.js";

const main = document.querySelector("#app");
const announcement = document.querySelector("#announcement");
const modules = new Map(course.modules.map(item => [item.id, item]));
const lessons = new Map(course.lessons.map(item => [item.id, item]));
const core = course.lessons.filter(item => item.kind === "Core");
const method = "https://www.thisisclassicalguitar.com/free-classical-guitar-method-book-pdf/";
const statusLabels = { watched: "Video watched", practised: "Exercise practised", mastered: "Skill mastered" };
let progress = loadProgress();
let storageOk = saveProgress(progress);
let importPending;
let reading = { mode: "notes", level: "open", attempts: 0, correct: 0 };
let quiz = newQuestion(reading.mode, reading.level);
let answer;

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
function rich(value) {
  return escape(value)
    .replace(/\[([^\]\n]+)\]\((https:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}
const flags = id => progress.lessons[id] ?? {};
const coreFor = id => core.filter(lesson => lesson.module === id);
const practiced = list => list.filter(lesson => flags(lesson.id).practised).length;
const mastered = list => list.filter(lesson => flags(lesson.id).mastered).length;
const activeModule = () => course.modules.find(module => !progress.assessments[module.id]) ?? course.modules.at(-1);
const activeDay = () => course.days.find(day => !progress.days[day.id]);
const arrow = ' <span aria-hidden="true">→</span>';
const ext = (url, label, classes = "link") => `<a class="${classes}" href="${escape(url)}" target="_blank" rel="noopener">${escape(label)} <span aria-hidden="true">↗</span></a>`;
const btn = (url, label, secondary = false) => `<a class="btn${secondary ? " secondary" : ""}" href="${url}">${label}${arrow}</a>`;
const back = (url, label) => `<a class="crumb" href="${url}"><span aria-hidden="true">←</span> ${label}</a>`;
const pill = (label, good = false) => `<span class="pill${good ? " done" : ""}">${escape(label)}</span>`;
const panel = (heading, body) => `<section class="panel flow"><h2>${escape(heading)}</h2>${body}</section>`;
const pdf = '<a class="link" href="reading-sheets.pdf" target="_blank" rel="noopener">Open the reading sheets (PDF) <span aria-hidden="true">↗</span></a>';
const intro = (title, description = "", kicker = "") => `<div class="page-intro">${kicker ? `<span class="kicker">${escape(kicker)}</span>` : ""}<h1>${escape(title)}</h1>${description ? `<p>${escape(description)}</p>` : ""}</div>`;

function status(module) {
  if (progress.assessments[module.id]) return ["Assessment passed", true];
  const items = coreFor(module.id);
  if (practiced(items) === items.length) return ["Exercises practised", true];
  if (items.some(item => Object.values(flags(item.id)).some(Boolean))) return ["In progress", false];
  return ["Not started", false];
}

function lessonStatus(lesson) {
  const saved = flags(lesson.id);
  if (saved.mastered) return pill("Mastered", true);
  if (saved.practised) return pill("Practised", true);
  return saved.watched ? pill("Watched") : "";
}

function level(moduleId) {
  const number = Number(moduleId.slice(1));
  if (number < 3) return "Foundation";
  if (number < 9) return "Developing";
  return "Intermediate";
}

function persist(message) {
  storageOk = saveProgress(progress);
  if (message) announce(storageOk ? message : message + " Browser storage is unavailable. Export a backup to keep these changes.");
}

function announce(message) {
  announcement.textContent = "";
  requestAnimationFrame(() => { announcement.textContent = message; });
}

function track(value, total) {
  return `<div class="track" role="progressbar" aria-label="Core exercises practised" aria-valuenow="${value}" aria-valuemax="${total}"><span style="width:${value / total * 100}%"></span></div>`;
}

function dayLessons(day) {
  return [...new Set((day.watch.match(/\bL\d{2}\b/g) ?? []).map(id => lessons.get(id)).filter(Boolean))];
}

function sessionActivities(day, module, next) {
  const short = progress.minutes === 10;
  if (!short && day?.id === 1) {
    return [
      ["setup", "Set up and tune", "Find a relaxed sitting position.", 3],
      ["video", "Watch the opening", "Watch the first five minutes of Werner’s posture lesson.", 5],
      ["reading", "Read score A", "Name and clap G, B and high E.", 5],
      ["technique", "Pluck with flesh", "Play open strings with the pad of your index finger.", 7],
      ["music", "Play the two bars", "Read score A at 45–50 bpm.", 5]
    ];
  }
  if (short) return [
    ["setup", "Set up and tune", "Check posture and play one relaxed open note.", 1],
    ["reading", "Read one short line", "Say the notes and clap the rhythm.", 3],
    ["technique", "Play one drill", next ? next.objective : "Repeat one movement from the current module.", 3],
    ["music", "Play a phrase", "Use a short section of your current piece.", 3]
  ];
  return [
    ["setup", "Warm up and tune", "Play a few unhurried open notes.", 3],
    ["reading", "Read fresh notation", "Name the pitches and count before playing.", 5],
    ["technique", "Practise today’s technique", next ? next.objective : "Review the current module’s checkpoint.", 7],
    ["music", "Play a phrase", day ? "Use the exercise or piece in your day plan." : module.title + ".", 8],
    ["review", "Review or make a note", "Write down what to repeat next time.", 2]
  ];
}

function home() {
  const day = activeDay();
  const module = day ? course.modules[day.id <= 14 ? 0 : 1] : activeModule();
  const moduleLessons = coreFor(module.id);
  const last = lessons.get(progress.lastLesson);
  const next = dayLessons(day ?? { watch: "" })[0] ??
    (last?.module === module.id && !flags(last.id).practised ? last : moduleLessons.find(lesson => !flags(lesson.id).practised));
  const href = day ? "#day/" + day.id : next ? "#lesson/" + next.id : "#module/" + module.id;
  const activities = sessionActivities(day, module, next);
  const prefix = `${dateKey()}/${day ? "day-" + day.id : module.id}/${progress.minutes}/`;
  const checked = activities.filter(([key]) => progress.activities[prefix + key]).length;
  return `<section class="hero">
    <img src="guitar.webp" alt="" width="1440" height="960" fetchpriority="high">
    <div class="hero-content"><span class="kicker">A no-nails course</span>
    <h1>Classical guitar<br> <em>&amp; flamenco</em></h1>
    <p class="hero-copy">Read music from your first session. Build a warm fingertip tone, then bring it into Spanish guitar and songs you can sing.</p>
    <div class="actions">${btn(href, day?.id === 1 && !progress.days[1] ? "Start Day 1" : "Continue learning")}${btn("#course", "Explore curriculum", true)}</div></div>
  </section>
  <div class="dashboard">
    <section class="panel">
      <div class="panel-header"><h2>Today’s practice</h2><div class="segment" aria-label="Session length">
      ${[25, 10].map(minutes => `<button type="button" data-minutes="${minutes}" aria-pressed="${progress.minutes === minutes}">${minutes} min</button>`).join("")}
      </div></div>
      <p class="meta">${day ? `Day ${day.id} · ` : ""}<span id="activity-total">${checked} of ${activities.length} checked</span></p>
      <ul class="practice-list">${activities.map(([key, label, detail, minutes]) => `<li><label><input type="checkbox" data-activity="${prefix + key}"${progress.activities[prefix + key] ? " checked" : ""}><div><strong>${escape(label)}</strong><small>${escape(detail)}</small></div><span>${minutes} min</span></label></li>`).join("")}</ul>
      <a class="link" href="${href}">${day ? "Open today’s plan" : "Open the next activity"}${arrow}</a>
    </section>
    <aside class="stack">
      <section class="panel flow">
        <span class="kicker">Current module · ${level(module.id)}</span>
        <h2>${escape(module.title)}</h2><p class="meta">${escape(module.weeks)} · ${escape(next ? next.title : "Module review")}</p>
        <a class="link" href="#module/${module.id}">Open module${arrow}</a>
      </section>
      <section class="panel">
        <div class="title-row"><h3>Course progress</h3><a class="link" href="#progress">View progress</a></div>
        ${track(practiced(core), core.length)}
        <p class="meta">${practiced(core)} of ${core.length} core exercises practised · ${mastered(core)} skills mastered</p>
        ${last ? `<p class="meta"><a href="#lesson/${last.id}">Last opened lesson</a></p>` : ""}
      </section>
    </aside>
  </div>
  <div class="workspace-links">
    <a href="#reading">Music Reading Academy <span aria-hidden="true">→</span></a>
    <a href="#technique">Playing Without Nails <span aria-hidden="true">→</span></a>
    <a href="#repertoire">Repertoire <span aria-hidden="true">→</span></a>
  </div>`;
}

function moduleCard(module) {
  const items = coreFor(module.id);
  return `<article class="panel module-card">
    <div class="title-row"><span class="meta">${escape(module.weeks)} · ${items.length} ${items.length === 1 ? "lesson" : "lessons"}</span>${pill(...status(module))}</div>
    <h2><a href="#module/${module.id}">${escape(module.title)}</a></h2>
    <p>${rich(module.Goal)}</p><p class="meta"><strong>Prerequisite</strong> · ${rich(module.Prerequisite)}</p>
    <a class="link" href="#module/${module.id}">Open module${arrow}</a>
  </article>`;
}

function lessonList(items) {
  return `<ul class="lesson-list">${items.map(lesson => `<li><a href="#lesson/${lesson.id}">
    <span><strong>${escape(lesson.title)}</strong><small>${escape(lesson.teacher)} · ${escape(lesson.language)}${lesson.duration ? " · " + lesson.duration : ""}</small></span>
    <span>${lessonStatus(lesson) || arrow}</span></a></li>`).join("")}</ul>`;
}

function courseView() {
  return intro("Curriculum", "Twelve modules over six months. Use the checkpoints to decide when to move on.", "Classical guitar & flamenco") +
    `<div class="actions">${btn("#days", "First 28 days")}${btn("#roadmap", "Months 7–12", true)}</div>
    <div class="grid block-gap">${course.modules.map(moduleCard).join("")}</div>
    <section class="panel block-gap" id="catalogue"><div class="panel-header"><h2>Find a lesson</h2></div>
      <form class="filters" id="filters">
        <label class="field">Search<input name="query" type="search" placeholder="Title, teacher or technique"></label>
        <label class="field">Language<select name="language"><option value="">All languages</option>${["English", "Ukrainian", "Russian"].map(name => `<option>${name}</option>`).join("")}</select></label>
        <label class="field">Difficulty<select name="level"><option value="">All levels</option>${["Foundation", "Developing", "Intermediate"].map(name => `<option>${name}</option>`).join("")}</select></label>
        <label class="field">Progress<select name="status"><option value="">All lessons</option><option value="todo">Unfinished</option><option value="done">Practised</option><option value="mastered">Mastered</option></select></label>
      </form><div id="lesson-results">${lessonList(course.lessons)}</div>
    </section>`;
}

function moduleView(module) {
  const items = coreFor(module.id);
  const reviews = course.lessons.filter(item => item.module === module.id && item.kind === "Supplement");
  return back("#course", "Curriculum") + intro(module.title, "", module.weeks + " · " + level(module.id)) +
    `<div class="split"><div class="stack">
      ${panel("Lessons", lessonList(items))}
      ${reviews.length ? panel("Optional reviews", lessonList(reviews)) : ""}
      ${panel("Practice", `<p>${rich(module.Play)}</p><p><strong>Common mistake</strong> · ${rich(module["Common error"])}</p>`)}
    </div><aside class="stack">
      ${panel("Learning goals", `<p>${rich(module.Goal)}</p><p><strong>Prerequisite</strong> · ${rich(module.Prerequisite)}</p><span id="module-status">${pill(...status(module))}</span>`)}
      ${panel("Assessment", `<p>${rich(module.Pass)}</p><div class="callout"><strong>If you need more practice</strong><p>${rich(module.Repair)}</p></div>
        <div class="checks"><label><input type="checkbox" data-assessment="${module.id}"${progress.assessments[module.id] ? " checked" : ""}>Assessment passed</label></div>`)}
    </aside></div>`;
}

function video(lesson) {
  return `<div class="video"><button class="btn" type="button" data-video="${lesson.id}"><span aria-hidden="true">▶</span> Play video</button></div>
    <div class="vid-caption"><span class="meta">${escape(lesson.channel)}${lesson.duration ? " · " + escape(lesson.duration) : ""}</span>${ext(lesson.url, "Watch on YouTube")}</div>`;
}

function lessonView(lesson) {
  const module = modules.get(lesson.module);
  const id = lesson.id;
  const index = core.indexOf(lesson);
  const related = module ? `#module/${module.id}` : "#roadmap";
  const text = module ? module.title : "Months 7–12";
  const checkpoint = module ? rich(module.Pass) : "Play four soft, even thumb units without catching the string. Keep the pulse stable.";
  const prereq = module ? rich(module.Prerequisite) : "First clap the Bulerías example in time, then revisit thumb control in Module 5.";
  const practice = lesson.id === "L01" ? '<a class="link" href="#day/1">Open the full Day 1 session →</a>' : "";
  return back(related, text) + intro(lesson.title, "", `${lesson.kind === "Core" ? "Lesson " + id.slice(1) : lesson.kind} · ${lesson.language} · ${module ? level(module.id) : "Intermediate"}`) +
    `<div class="split"><div class="stack">
      <section class="panel">${video(lesson)}</section>
      ${panel("Practise", `<p class="meta">Allow 7–10 minutes for this exercise.</p><p>${escape(lesson.drill)}</p>${practice}
        ${module ? `<p><strong>Common mistake</strong> · ${rich(module["Common error"])}</p>` : ""}
        <p>${ext(lesson.material, "Lesson materials")} · ${pdf}</p>`)}
      <nav class="actions" aria-label="Lesson navigation">
        ${index > 0 ? btn("#lesson/" + core[index - 1].id, "Previous lesson", true) : ""}
        ${index >= 0 && index < core.length - 1 ? btn("#lesson/" + core[index + 1].id, "Next lesson") : ""}
        ${btn("#home", "Dashboard", true)}
      </nav>
    </div><aside class="stack">
      ${panel("What you’ll learn", `<p>${escape(lesson.objective)}</p><p class="meta">${escape(lesson.teacher)} · ${escape(lesson.language)}</p><p><strong>Prerequisite</strong> · ${prereq}</p>`)}
      ${panel("Playing without nails", `${pill(lesson.mode)}<p>${escape(lesson.adaptation)}</p><p class="meta">If the strings feel close together, use a smaller stroke and check that the next string keeps ringing.</p><a class="link" href="#technique">Technique reference${arrow}</a>`)}
      ${panel("Your progress", `<div class="checks">${Object.entries(statusLabels).map(([key, title]) => `<label><input type="checkbox" data-lesson="${id}" data-flag="${key}"${flags(id)[key] ? " checked" : ""}>${title}</label>`).join("")}</div>
      <p class="meta">Mark mastery after meeting the relevant criterion on two different days.</p>
      <details><summary>Module checkpoint</summary><p>${checkpoint}</p></details>`)}
    </aside></div>`;
}

function daysView() {
  return intro("Your first 28 days", "Start with 25 minutes a day. The sixth day of each week is for review and the seventh is for rest.") +
    `<div class="grid">${[1, 2, 3, 4].map(week => `<section class="panel flow"><h2>Week ${week}</h2><div class="week-list">${course.days.slice((week - 1) * 7, week * 7).map(day => `<a class="${progress.days[day.id] ? "complete" : ""}" href="#day/${day.id}">${day.id}${progress.days[day.id] ? " ✓" : ""}</a>`).join("")}</div><p class="meta">${["Posture and open strings", "Alternation and your first duet", "Fretted notes and melody", "Sight-reading and Ode to Joy"][week - 1]}</p></section>`).join("")}</div>`;
}

function dayView(day) {
  const first = day.id === 1;
  const module = course.modules[day.id <= 14 ? 0 : 1];
  return back("#days", "First 28 days") + intro("Day " + day.id, first ? "Your first 25 minutes with the guitar and the staff." : "", module.title) +
    `<div class="split"><div class="stack">
      ${first ? `<section class="panel">${video(lessons.get("L01"))}</section>
        ${panel("Your practice plan", `<ol class="day-steps">${course.dayOne.map(step => `<li><strong>${escape(step.title)}</strong><p>${rich(step.body)}</p></li>`).join("")}</ol>`)}
        ${panel("Score A", firstScore() + pdf)}`
      : panel("Your practice plan", `<h3>Watch or read</h3><p>${rich(day.watch)}</p><h3>Play</h3><p>${rich(day.practice)}</p>${dayLessons(day).length ? lessonList(dayLessons(day)) : ""}`)}
      <nav class="actions" aria-label="Practice day navigation">
      ${day.id > 1 ? btn("#day/" + (day.id - 1), "Previous day", true) : ""}
      ${day.id < course.days.length ? btn("#day/" + (day.id + 1), "Next day") : btn("#module/M03", "Open the next module")}
      </nav>
    </div><aside class="stack">
      ${panel(first ? "Day 1 checkpoint" : "Check your work", `<p>${first ? rich(course.dayOneTest) : "Read the plan, try the assignment and record what needs another pass."}</p>
        <div class="checks"><label><input type="checkbox" data-day="${day.id}"${progress.days[day.id] ? " checked" : ""}>Day complete</label></div>
        <a class="link" href="#module/${module.id}">Module and assessment${arrow}</a>`)}
      ${panel("Reading resources", `<p>${pdf}</p><p>${ext(method, "Werner’s free method")}</p><a class="link" href="#reading">Music Reading Academy${arrow}</a>`)}
    </aside></div>`;
}

function techniqueView() {
  return intro("Playing Without Nails", "Use a small part of the fingertip pad near its edge. Try a slightly different angle if the string catches, then compare the sound at the same volume.") +
    `<div class="grid">
      ${panel("Hand position and tone", "<p>Keep the wrist relaxed. Let the fingers release toward the palm and return easily. Move slightly toward the soundhole for a rounder tone or toward the bridge for a clearer attack.</p><p>Try four notes on open E at each position, then record both approaches and compare.</p>")}
      ${panel("Speed and control", "<p>Use compact strokes. Begin with four notes at a time and stop before tension accumulates. Add a few beats per minute only when the movement stays easy.</p><p>When a note scratches, use less pad or change the release angle. When an arpeggio loses a note, check if a neighboring finger touched the string too early.</p>")}
      ${course.techniques.map(technique => panel(technique.title, `<p>${rich(technique.body)}</p>`)).join("")}
    </div><section class="panel block-gap"><h2>Technique lessons</h2>${lessonList(["L02", "L03", "L05", "L12", "L28", "L31", "L34", "L35"].map(id => lessons.get(id)))}</section>`;
}

function readingView() {
  const scored = Boolean(quiz.answers);
  return intro("Music Reading Academy", "Read the written pitches on a guitar treble staff. Guitar sounds one octave below the written notes.") +
    `<div class="split"><div class="stack">
    <section class="panel flow"><h2>Practice</h2>
      <div class="tabs" aria-label="Reading exercise">${readingModes.map(mode => `<button type="button" class="btn secondary" data-mode="${mode.id}" aria-pressed="${mode.id === reading.mode}">${mode.label}</button>`).join("")}</div>
      ${["notes", "frets", "melody"].includes(reading.mode) ? `<label class="field">Note range<select id="reading-level">${readingLevels.map(level => `<option value="${level.id}"${level.id === reading.level ? " selected" : ""}>${level.label}</option>`).join("")}</select></label>` : ""}
      <div id="reading-question" class="flow"><h3>${quiz.prompt}</h3>${quiz.html}
      ${scored ? `<div class="answer-options">${quiz.answers.map((option, index) => {
        const chosen = answer === option;
        const correct = answer && quiz.correct.includes(option);
        return `<button type="button" class="btn secondary" data-answer="${index}"${answer ? " disabled" : ""}${correct ? ' data-correct="true"' : chosen ? ' data-wrong="true"' : ""}>${escape(option)}</button>`;
      }).join("")}</div>` : ""}
      ${scored ? `<div class="quiz-feedback" role="status">${answer ? (quiz.correct.includes(answer) ? "Correct." : "Answer: " + escape(quiz.correct[0]) + ".") : ""}</div>` : ""}
      <div class="actions"><button type="button" class="btn" data-new-question>${scored ? "Next question" : "New score"}${arrow}</button>${scored ? `<span class="meta">${reading.correct} correct out of ${reading.attempts}</span>` : ""}</div></div>
    </section></div><aside class="stack">
      ${panel("Printed practice", `<p>Start with scores A–C and save score H for your first-take assessment.</p>${pdf}`)}
      ${panel("Open-string anchors", "<p>G is on the second line, B on the middle line and high E in the top space. On the guitar these are open strings 3, 2 and 1.</p>")}
    </aside></div>`;
}

function repertoireView() {
  const pieces = [
    ["Nocturne", "Open strings · Werner p. 16", "L06"],
    ["A Fairy Tale", "First fretted note · Werner p. 20", "L08"],
    ["Ode to Joy", "First-position melody · Werner p. 26", "L11"],
    ["Au clair de la lune", "Connected melody · Werner pp. 30–34", "L16"],
    ["The Lonely Dogwood", "Open bass with melody · Werner pp. 38–44", "L17"],
    ["Little Birch Tree in the Field", "Dotted rhythm and two voices", "L19"],
    ["Greensleeves and Leyenda", "First-position reading and Spanish color", "L25"],
    ["Malagueñas", "A gentle brush and Spanish phrasing", "L26"],
    ["Siciliano", "Melody and bass balance", "L27"],
    ["Sing with guitar", "Open chords and an even beat", "L23"]
  ];
  return intro("Repertoire", "Find a piece to practise from the score, then revisit it as your tone and rhythm improve.") +
    `<div class="grid">${pieces.map(([name, skill, id]) => panel(name, `<p>${escape(skill)}</p><a class="link" href="#lesson/${id}">Lesson and score${arrow}</a>`)).join("")}</div>`;
}

function roadmapView() {
  return back("#course", "Curriculum") + intro("Months 7–12", "Continue when the foundations feel steady. Use the milestones to guide the next six months.") +
    `<div class="grid">${course.roadmap.map(item => panel("Month " + item.month, `<p>${rich(item.focus)}</p><p><strong>Milestone</strong> · ${rich(item.milestone)}</p>
      ${item.month === 10 ? '<a class="link" href="#lesson/L35">Alzapúa lesson →</a>' : ""}`)).join("")}</div>`;
}

function journalView(editId) {
  const edit = progress.journal.find(entry => entry.id === editId);
  const entries = [...progress.journal].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  const field = (key, label, wide = false) => `<label class="field${wide ? " full" : ""}">${label}${wide
    ? `<textarea name="${key}" maxlength="2000" rows="2">${escape(edit?.[key])}</textarea>`
    : `<input name="${key}" maxlength="2000" value="${escape(edit?.[key])}">`}</label>`;
  return intro("Practice journal", "Keep a brief record of what you played and what to try next. Entries stay in this browser.") +
    `<div class="split">
    <section class="panel flow"><h2>${edit ? "Edit session" : "Log a session"}</h2>
      <form id="journal-form" class="form-grid" data-edit="${edit?.id ?? ""}">
        <label class="field">Date<input required type="date" name="date" value="${edit?.date ?? dateKey()}"></label>
        <label class="field">Minutes<input required type="number" name="minutes" min="1" max="600" value="${edit?.minutes ?? progress.minutes}"></label>
        ${field("exercises", "Exercises completed")}${field("piece", "Current piece")}
        ${field("difficulty", "What was difficult?", true)}${field("notes", "What will you try next?", true)}${field("skills", "Skills improved", true)}
        <div class="actions full"><button type="submit" class="btn">Save session</button>${edit ? btn("#journal", "Cancel", true) : ""}</div>
      </form>
    </section>
    <section class="panel flow"><h2>Past sessions</h2>
    ${entries.length ? entries.map(entry => `<article class="journal-entry flow">
      <div class="title-row"><h3>${escape(entry.piece || "Practice session")}</h3><span class="meta">${entry.date} · ${entry.minutes} min</span></div>
      ${[["exercises", "Exercises"], ["difficulty", "Difficulties"], ["notes", "Next time"], ["skills", "Skills"]].filter(([key]) => entry[key]).map(([key, label]) => `<p><strong>${label}</strong> · ${escape(entry[key])}</p>`).join("")}
      <a class="link" href="#journal/${entry.id}">Edit session</a>
    </article>`).join("") : '<p class="muted">Your saved sessions will appear here.</p>'}
    </section></div>`;
}

function progressView() {
  const watched = core.filter(lesson => flags(lesson.id).watched).length;
  const tests = course.modules.filter(module => progress.assessments[module.id]).length;
  return intro("Progress", "Video views, practice and mastery are tracked separately.") +
    `<section class="panel flow"><h2>Course progress</h2>${track(practiced(core), core.length)}
      <p>${watched} videos watched · ${practiced(core)} core exercises practised · ${mastered(core)} skills mastered · ${tests} of ${course.modules.length} assessments passed</p>
      <p>${course.days.filter(day => progress.days[day.id]).length} of 28 days completed · ${progress.journal.length} practice sessions logged</p>
    </section>
    <div class="grid block-gap">${course.modules.map(module => {
      const items = coreFor(module.id);
      return panel(module.title, `<p>${practiced(items)} of ${items.length} exercises practised · ${mastered(items)} skills mastered</p>
        <p>${pill(...status(module))}</p><a class="link" href="#module/${module.id}">View module${arrow}</a>`);
    }).join("")}</div>`;
}

function settingsView() {
  return intro("Settings", "Move your practice records between devices using a JSON backup.") +
    `<div class="grid">
    ${panel("Export a backup", "<p>Download your progress, assessments, practice days and journal. Keep the file somewhere private.</p><button type=\"button\" class=\"btn\" data-export>Export JSON</button>")}
    ${panel("Import a backup", `<p>Choose a backup to preview what it contains. Import merges records with this browser’s saved progress.</p>
      <label class="field">Backup file<input id="backup-file" type="file" accept=".json,application/json"></label>
      <div id="import-feedback" class="flow" aria-live="polite"></div>`)}
    ${!storageOk ? panel("Browser storage unavailable", "<p>Changes are kept until you reload or close this page. Export a backup before leaving.</p>") : ""}
    </div>`;
}

function missingView() {
  return intro("Page not found", "Open the curriculum to find a module or lesson.") + btn("#course", "Curriculum");
}

function render({ focus = true } = {}) {
  const hash = location.hash === "#main" ? "" : location.hash;
  if (location.hash === "#main" && main.childElementCount) return;
  const [page, id] = (hash.slice(1) || "home").split("/");
  let nav = page;
  let html;
  switch (page) {
    case "home": html = home(); break;
    case "course": html = courseView(); break;
    case "module": nav = "course"; html = modules.has(id) ? moduleView(modules.get(id)) : missingView(); break;
    case "lesson":
      nav = "course";
      if (lessons.has(id)) {
        if (progress.lastLesson !== id) { progress.lastLesson = id; persist(); }
        html = lessonView(lessons.get(id));
      } else html = missingView();
      break;
    case "days": nav = "course"; html = daysView(); break;
    case "day":
      nav = "course";
      html = course.days.some(day => String(day.id) === id) ? dayView(course.days[Number(id) - 1]) : missingView();
      break;
    case "technique": html = techniqueView(); break;
    case "reading": html = readingView(); break;
    case "journal": html = journalView(id); break;
    case "progress": html = progressView(); break;
    case "settings": importPending = null; html = settingsView(); break;
    case "repertoire": html = repertoireView(); break;
    case "roadmap": nav = "course"; html = roadmapView(); break;
    default: html = missingView();
  }
  main.innerHTML = html;
  document.title = `${main.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim() || "Dashboard"} · Guitar Academy`;
  for (const item of document.querySelectorAll("[data-nav]")) {
    if (item.dataset.nav === nav) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  if (focus) {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("#main").focus({ preventScroll: true });
  }
}

function filters() {
  const { query, language, level: selectedLevel, status } = Object.fromEntries(new FormData(main.querySelector("#filters")));
  const terms = query.toLocaleLowerCase().trim().split(/\s+/);
  const matching = course.lessons.filter(lesson => {
    const text = [lesson.title, lesson.teacher, lesson.objective, lesson.adaptation, lesson.drill,
      modules.get(lesson.module)?.title].join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term)) && (!language || lesson.language === language) &&
      (!selectedLevel || level(lesson.module) === selectedLevel) &&
      (!status || (status === "todo" && !flags(lesson.id).practised) ||
        (status === "done" && flags(lesson.id).practised) || (status === "mastered" && flags(lesson.id).mastered));
  });
  main.querySelector("#lesson-results").innerHTML = matching.length ? lessonList(matching) : '<p class="muted">No lessons match those filters.</p>';
}

function nextQuestion(reset = false) {
  quiz = newQuestion(reading.mode, reading.level, reset ? undefined : quiz.key);
  answer = undefined;
  if (reset) { reading.attempts = 0; reading.correct = 0; }
}

function rerenderReading(target) {
  main.innerHTML = readingView();
  main.querySelector(target)?.focus({ preventScroll: true });
}

function playVideo(button) {
  const lesson = lessons.get(button.dataset.video);
  const embed = new URL("https://www.youtube-nocookie.com/embed/" + lesson.video);
  embed.searchParams.set("autoplay", "1");
  embed.searchParams.set("playsinline", "1");
  const iframe = document.createElement("iframe");
  iframe.src = embed.href;
  iframe.title = lesson.title;
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  button.replaceWith(iframe);
  iframe.focus();
}

function exportBackup() {
  const file = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const download = Object.assign(document.createElement("a"), { href: url, download: "guitar-academy-" + dateKey() + ".json" });
  document.body.append(download);
  download.click();
  download.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  announce("Backup downloaded.");
}

async function readBackup(input) {
  importPending = null;
  const feedback = main.querySelector("#import-feedback");
  const file = input.files[0];
  if (!file) { feedback.textContent = ""; return; }
  try {
    if (file.size > 10_000_000) throw new Error("This file is too large for a progress backup.");
    const imported = readProgress(JSON.parse(await file.text()));
    if (!input.isConnected || input.files[0] !== file) return;
    importPending = imported;
    const lessonCount = Object.values(imported.lessons).filter(flags => Object.keys(flags).length).length;
    feedback.innerHTML = `<p>${lessonCount} lessons with progress, ${Object.keys(imported.assessments).length} assessments, ${Object.keys(imported.days).length} days and ${imported.journal.length} journal entries.</p>
      <button type="button" class="btn" data-confirm-import>Merge backup</button>`;
  } catch (error) {
    if (!input.isConnected || input.files[0] !== file) return;
    feedback.textContent = error instanceof SyntaxError ? "This file is not valid JSON." : error.message;
  }
}

main.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.video) playVideo(button);
  if (button.dataset.minutes) {
    progress.minutes = Number(button.dataset.minutes);
    persist("Practice length updated.");
    main.innerHTML = home();
    main.querySelector(`[data-minutes="${progress.minutes}"]`)?.focus({ preventScroll: true });
  }
  if (button.dataset.mode) {
    reading.mode = button.dataset.mode;
    nextQuestion(true);
    rerenderReading(`[data-mode="${reading.mode}"]`);
  }
  if ("answer" in button.dataset && !answer) {
    answer = quiz.answers[Number(button.dataset.answer)];
    reading.attempts++;
    if (quiz.correct.includes(answer)) reading.correct++;
    rerenderReading("[data-new-question]");
    announce(quiz.correct.includes(answer) ? "Correct." : "Answer: " + quiz.correct[0] + ".");
  }
  if ("newQuestion" in button.dataset) {
    nextQuestion();
    rerenderReading(quiz.answers ? "[data-answer]" : "[data-new-question]");
  }
  if ("export" in button.dataset) exportBackup();
  if ("confirmImport" in button.dataset && importPending) {
    progress = mergeProgress(progress, importPending);
    persist();
    main.querySelector("#backup-file").value = "";
    main.querySelector("#import-feedback").textContent = storageOk ? "Backup merged." : "Merged for this session. Browser storage is unavailable.";
    importPending = null;
  }
});

function setCheck(map, key, checked) {
  if (checked) map[key] = true;
  else delete map[key];
}

main.addEventListener("change", event => {
  const input = event.target;
  const { lesson, flag, assessment, day, activity } = input.dataset;
  if (lesson) setCheck(progress.lessons[lesson] ??= {}, flag, input.checked);
  if (assessment) {
    setCheck(progress.assessments, assessment, input.checked);
    main.querySelector("#module-status").innerHTML = pill(...status(modules.get(assessment)));
  }
  if (day) setCheck(progress.days, day, input.checked);
  if (activity) {
    setCheck(progress.activities, activity, input.checked);
    const total = main.querySelectorAll("[data-activity]").length;
    const checked = main.querySelectorAll("[data-activity]:checked").length;
    main.querySelector("#activity-total").textContent = `${checked} of ${total} checked`;
  }
  if (lesson || assessment || day || activity) persist(input.checked ? "Progress marked." : "Progress mark removed.");
  if (input.id === "reading-level") {
    reading.level = input.value;
    nextQuestion(true);
    rerenderReading("#reading-level");
  }
  if (input.id === "backup-file") readBackup(input);
  if (input.form?.id === "filters") filters();
});

main.addEventListener("input", event => {
  if (event.target.name === "query") filters();
});

main.addEventListener("submit", event => {
  event.preventDefault();
  if (event.target.id !== "journal-form") return;
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  const entry = { ...values, id: form.dataset.edit || crypto.randomUUID(), minutes: Number(values.minutes), updatedAt: Date.now() };
  const valid = readProgress({ ...progress, journal: [entry] }).journal[0];
  if (!valid) { announce("Check the date and minutes."); return; }
  progress.journal = [...progress.journal.filter(item => item.id !== valid.id), valid];
  persist("Practice session saved.");
  if (location.hash === "#journal") render();
  else location.hash = "journal";
});

window.addEventListener("hashchange", () => render());
render({ focus: false });
