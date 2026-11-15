import { course } from "./course.js";
import { estasDrills, estasPieces, estasVideos } from "./estas-guide.js";
import { guidedCoreLessons, guidedDays, guidedTheory } from "./guided-lessons.js";
import { mountGuidedPractice } from "./guided-practice.js";
import { dailyExercises, estasDrillVideos, estasStepVideos, extraVideos, lessonPracticeVideos, lessonStepVideos, modulePracticeVideos, roadmapPracticeVideos } from "./practice-videos.js";
import { supportTopics, supportVideos } from "./support-videos.js";
import { dateKey, loadProgress, mergeProgress, readProgress, saveProgress } from "./progress.js";
import { firstPosition, firstScore, newQuestion, noteLocation, readingLevels, readingModes, score } from "./reading.js";

const main = document.querySelector("#app");
const announcement = document.querySelector("#announcement");
const modules = new Map(course.modules.map(item => [item.id, item]));
const lessons = new Map(course.lessons.map(item => [item.id, item]));
const core = course.lessons.filter(item => item.kind === "Core");
const statusLabels = { watched: "Video watched", practised: "Exercise practised", mastered: "Skill mastered" };
let progress = loadProgress();
let storageOk = saveProgress(progress);
let importPending;
let reading = { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 };
let quiz = newQuestion(reading.mode, reading.level);
let answer;
let unmountGuided = () => {};

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

const guidedPanel = '<section class="panel" data-guided-practice></section>';

const primaryVideos = new Map(course.lessons.map(lesson => [lesson.video, { ...lesson, title: lesson.videoTitle ?? lesson.title }]));
const videoInfo = id => estasVideos[id] ?? supportVideos[id] ?? extraVideos[id] ?? primaryVideos.get(id);
const videoUrl = (url, start) => start ? `${url}&t=${start}s` : url;

function videoResources(resources, heading = "Supporting videos", open = false) {
  if (!resources?.length) return "";
  const items = resources.map(([id, cue, technique, start, end]) => {
    const video = videoInfo(id);
    const source = videoUrl("https://www.youtube.com/watch?v=" + id, start);
    const metadata = [video.channel, video.language, video.duration, technique].filter(Boolean);
    return `<li>
      <div class="support-row">
        <div>
          ${ext(source, video.title)}
          <p class="meta">${metadata.map(escape).join(" · ")}</p>
          <p class="support-cue">${escape(cue)}</p>
        </div>
        <button class="support-play" type="button" data-support-video="${id}" data-start="${start ?? ""}" data-end="${end ?? ""}" aria-label="Play here: ${escape(video.title)}"><span aria-hidden="true">▶</span> Play here</button>
      </div>
    </li>`;
  });
  return `<details class="support-videos"${open ? " open" : ""}><summary>${escape(heading)} <span class="meta">(${resources.length})</span></summary><ul>${items.join("")}</ul></details>`;
}

const supportingVideos = topic => videoResources(supportTopics[topic]);
const stepsList = (steps, videos) => `<ol class="day-steps">${steps.map(([title, body], index) => `<li><h3>${escape(title)}</h3><p>${rich(body)}</p>${videoResources(videos?.[index], "Video for this exercise")}</li>`).join("")}</ol>`;

function noteMap(pitches, showOctaves = false) {
  const entries = pitches.map(pitch => firstPosition.find(item => item.pitch === pitch));
  return `<table class="note-map"><thead><tr><th scope="col">On the staff</th><th scope="col">Note</th><th scope="col">On the guitar</th></tr></thead><tbody>${entries.map(({ pitch, staff, position, example }) => `<tr><td>${example}<small>${staff}</small></td><th scope="row">${showOctaves ? pitch : pitch === "E5" ? "High E" : pitch[0]}</th><td>${position}</td></tr>`).join("")}</tbody></table>`;
}

const openNoteMap = () => noteMap(["G4", "B4", "E5"]);

function scoreDemo(letter) {
  const videoPath = `media/score-${letter.toLowerCase()}.mp4`;
  const scoreA = letter === "A" ? `<p><strong>Bar 1</strong> &nbsp; G (3) · B (2) · high E (1, hold through 4).<br><strong>Bar 2</strong> &nbsp; High E (1) · B (2) · G (3, hold through 4).</p><p class="meta">Numbers in brackets are string numbers. All notes use fret 0.</p>${firstScore()}` : "";
  const video = `<video controls playsinline preload="${letter === "H" ? "none" : "metadata"}" aria-label="Score ${letter} play-along"><source src="${videoPath}" type="video/mp4"></video>`;
  return `<div class="score-demo flow"><h3>Score ${letter} play-along</h3>${scoreA}
    ${letter === "H" ? `${pdf}<details><summary>Watch the answer after your first take</summary>${video}</details>` : `<p>Follow the highlighted note. The video shows the string, fret and count at 48 bpm.</p>${video}${pdf}`}</div>`;
}

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

function restDay(day) {
  return day?.watch.startsWith("Rest");
}

function sessionActivities(day, module, next) {
  if (restDay(day)) return [];
  const short = progress.minutes === 10;
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

function home() {
  const day = activeDay();
  const module = day ? course.modules[day.id <= 14 ? 0 : 1] : activeModule();
  const moduleLessons = coreFor(module.id);
  const last = lessons.get(progress.lastLesson);
  const next = (day ? dayLessons(day)[0] : undefined) ??
    (last?.module === module.id && !flags(last.id).practised ? last : moduleLessons.find(lesson => !flags(lesson.id).practised));
  const href = day ? "#day/" + day.id : next ? "#lesson/" + next.id : "#module/" + module.id;
  const activities = sessionActivities(day, module, next);
  const prefix = `${dateKey()}/${day ? "day-" + day.id : module.id}/${progress.minutes}/`;
  const checked = activities.filter(([key]) => progress.activities[prefix + key]).length;
  return `<section class="hero">
    <img src="guitar.webp" alt="" width="1440" height="960" fetchpriority="high">
    <div class="hero-content"><span class="kicker">A no-nails course</span>
    <h1>Classical guitar<br> <em>&amp; flamenco</em></h1>
    <p class="hero-copy">Read music from your first session. Build a warm fingertip tone, learn Spanish guitar and work toward the music of Estas Tonne.</p>
    <div class="actions">${btn(href, day?.id === 1 && !progress.days[1] ? "Start Day 1" : "Continue learning")}${btn("#course", "Explore curriculum", true)}</div></div>
  </section>
  <div class="dashboard">
    <section class="panel">
      <div class="panel-header"><h2>${restDay(day) ? "Rest day" : "Today’s practice"}</h2>${activities.length ? `<div class="segment" aria-label="Session length">
      ${[25, 10].map(minutes => `<button type="button" data-minutes="${minutes}" aria-pressed="${progress.minutes === minutes}">${minutes} min</button>`).join("")}
      </div>` : ""}</div>
      ${activities.length ? `
      <p class="meta">${day ? `Day ${day.id} · ` : ""}<span id="activity-total">${checked} of ${activities.length} checked</span></p>
      <ul class="practice-list">${activities.map(([key, label, detail, minutes]) => `<li><label><input type="checkbox" data-activity="${prefix + key}"${progress.activities[prefix + key] ? " checked" : ""}><div><strong>${escape(label)}</strong><small>${escape(detail)}</small></div><span>${minutes} min</span></label></li>`).join("")}</ul>` : `<p class="meta">Day ${day.id}</p><p>${rich(day.practice)}</p>`}
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
    <a href="#estas">Estas Tonne guide <span aria-hidden="true">→</span></a>
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
      ${panel("Practice", `<p>${rich(module.Play)}</p>${videoResources(modulePracticeVideos[module.id], "Videos for this practice")}
        <p><strong>Common mistake</strong> · ${rich(module["Common error"])}</p>${module.id === "M12" ? '<a class="link" href="#estas/spirit-of-time">Spirit of Time improvisation study →</a>' : ""}`)}
    </div><aside class="stack">
      ${panel("Learning goals", `<p>${rich(module.Goal)}</p><p><strong>Prerequisite</strong> · ${rich(module.Prerequisite)}</p><span id="module-status">${pill(...status(module))}</span>${supportingVideos(module.id)}`)}
      ${panel("Assessment", `<p>${rich(module.Pass)}</p><div class="callout"><strong>If you need more practice</strong><p>${rich(module.Repair)}</p>${videoResources(modulePracticeVideos[module.id], "Videos to review before trying again")}</div>
        <div class="checks"><label><input type="checkbox" data-assessment="${module.id}"${progress.assessments[module.id] ? " checked" : ""}>Assessment passed</label></div>`)}
    </aside></div>`;
}

function video(lesson) {
  return `<div class="video-unloaded"><button class="btn" type="button" data-video="${lesson.id}"><span aria-hidden="true">▶</span> Play ${lesson.start ? "chapter" : "video"}</button></div>
    <div class="vid-caption"><span class="meta">${escape(lesson.channel)}${lesson.duration ? " · " + escape(lesson.duration) : ""}</span>${ext(videoUrl(lesson.url, lesson.start), "Watch on YouTube")}</div>`;
}

function lessonView(lesson) {
  const module = modules.get(lesson.module);
  const id = lesson.id;
  const index = core.indexOf(lesson);
  const related = module ? `#module/${module.id}` : "#roadmap";
  const text = module ? module.title : "Months 7–12";
  const checkpoint = rich(lesson.checkpoint ?? (module ? module.Pass : "Play four soft, even thumb units without catching the string. Keep the pulse stable."));
  const prereq = rich(lesson.prerequisite ?? (module ? module.Prerequisite : "First clap the Bulerías example in time, then revisit thumb control in Module 5."));
  const mistake = lesson.mistake;
  const practice = ["L01", "L02"].includes(id) ? `<a class="link" href="#day/${Number(id.slice(1))}">Open the Day ${Number(id.slice(1))} plan →</a>` : "";
  const practicePanel = panel("Practise", `${lesson.steps ? stepsList(lesson.steps, lessonStepVideos[id]) : ""}<p>${escape(lesson.drill)}</p>${videoResources(lessonPracticeVideos[id], "Video for this drill")}${practice}
    ${mistake ? `<p><strong>Common mistake</strong> · ${rich(mistake)}</p>` : ""}
    <p>${ext(lesson.material, lesson.materialLabel ?? "Lesson materials")}${!lesson.steps ? ` · ${pdf}` : ""}</p>`);
  const videoPanel = lesson.watch
    ? panel(lesson.mediaLabel ?? "Video lesson", `<p>${escape(lesson.watch)}</p>${video(lesson)}`)
    : `<section class="panel">${video(lesson)}</section>`;
  return back(related, text) + intro(lesson.title, "", `${lesson.kind === "Core" ? "Lesson " + id.slice(1) : lesson.kind} · ${lesson.language} · ${module ? level(module.id) : "Intermediate"}`) +
    `<div class="split"><div class="stack">
      ${guidedCoreLessons[id] ? guidedPanel : ""}
      ${lesson.steps || lesson.mediaLabel ? practicePanel + videoPanel : videoPanel + practicePanel}
      <nav class="actions" aria-label="Lesson navigation">
        ${index > 0 ? btn("#lesson/" + core[index - 1].id, "Previous lesson", true) : ""}
        ${index >= 0 && index < core.length - 1 ? btn("#lesson/" + core[index + 1].id, "Next lesson") : ""}
        ${btn("#home", "Dashboard", true)}
      </nav>
    </div><aside class="stack">
      ${panel("What you’ll learn", `<p>${escape(lesson.objective)}</p><p class="meta">${escape(lesson.teacher)} · ${escape(lesson.language)}</p><p><strong>${lesson.prerequisite || !module ? "Before this lesson" : "Before this module"}</strong> · ${prereq}</p>`)}
      ${panel("Playing without nails", `<p>${escape(lesson.adaptation)}</p><a class="link" href="#technique">Technique reference${arrow}</a>`)}
      ${panel("Your progress", `<div class="checks">${Object.entries(statusLabels).map(([key, title]) => `<label><input type="checkbox" data-lesson="${id}" data-flag="${key}"${flags(id)[key] ? " checked" : ""}>${title}</label>`).join("")}</div>
      <p class="meta">Mark mastery after meeting the relevant criterion on two different days.</p>
      <details${lesson.checkpoint ? " open" : ""}><summary>${lesson.checkpoint ? "Lesson checkpoint" : "Module checkpoint"}</summary><p>${checkpoint}</p></details>`)}
    </aside></div>`;
}

function daysView() {
  return intro("Your first 28 days", "Use the daily plans to work through the first two modules. Review at the end of each week and take the scheduled rest days.") +
    `<div class="grid">${[1, 2, 3, 4].map(week => `<section class="panel flow"><h2>Week ${week}</h2><div class="week-list">${course.days.slice((week - 1) * 7, week * 7).map(day => `<a class="${progress.days[day.id] ? "complete" : ""}" href="#day/${day.id}">${day.id}${progress.days[day.id] ? " ✓" : ""}</a>`).join("")}</div><p class="meta">${["Posture and open strings", "Alternation and your first duet", "Fretted notes and melody", "Sight-reading and Ode to Joy"][week - 1]}</p></section>`).join("")}</div>`;
}

function dayView(day) {
  const first = day.id === 1;
  const module = course.modules[day.id <= 14 ? 0 : 1];
  const exercises = dailyExercises[day.id].map(([title, body, videos, sheet, link], index) => `<li>
    <h3>${escape(title)}</h3><p>${rich(body)}</p>
    ${first && index === 2 ? openNoteMap() : ""}
    ${videoResources(videos, "Video for this exercise", first)}
    ${link ? `<a class="link" href="${link[0]}">${escape(link[1])}${arrow}</a>` : ""}
    ${sheet ? scoreDemo(sheet) : ""}
  </li>`).join("");
  const relevant = dayLessons(day);
  const plan = `<details class="panel"><summary>Videos and extra practice</summary>
    <ol class="day-steps daily-exercises">${exercises}</ol>
    ${!first && relevant.length ? `<details><summary>Related lessons</summary>${lessonList(relevant)}</details>` : ""}</details>`;
  return back("#days", "First 28 days") + intro("Day " + day.id, first ? "Start with three open strings. Learn to recognize each note on the page, find its string and play it with your fingertip pad." : "", module.title) +
    `<div class="split"><div class="stack">
      ${guidedPanel}${plan}
      <nav class="actions" aria-label="Practice day navigation">
      ${day.id > 1 ? btn("#day/" + (day.id - 1), "Previous day", true) : ""}
      ${day.id < course.days.length ? btn("#day/" + (day.id + 1), "Next day") : btn("#module/M03", "Open the next module")}
      </nav>
    </div><aside class="stack">
      ${panel(first ? "Day 1 checkpoint" : restDay(day) ? "Log the rest day" : "Check your work", `<p>${first ? rich(course.dayOneTest) : restDay(day) ? "Mark this day when you’re ready to move to the next plan." : "Try the assignment and make a note of what to repeat."}</p>
        <div class="checks"><label><input type="checkbox" data-day="${day.id}"${progress.days[day.id] ? " checked" : ""}>Day complete</label></div>
        <a class="link" href="#module/${module.id}">Module and assessment${arrow}</a>`)}
      ${panel("Reading resources", `<a class="link" href="#reading/guided">Guided notes and fretboard${arrow}</a><p>${pdf}</p>`)}
    </aside></div>`;
}

function techniqueView() {
  return intro("Playing Without Nails", "Use a small part of the fingertip pad near its edge. Try a slightly different angle if the string catches, then compare the sound at the same volume.") +
    `<div class="grid">
      ${panel("Hand position and tone", `<p>Keep the wrist relaxed. Let the fingers release toward the palm and return easily. Move slightly toward the fingerboard for a rounder tone or toward the bridge for a clearer attack.</p><p>Try four notes on the open first string at each position, then record both approaches and compare.</p><a class="link" href="#lesson/L02">Start with your first notes${arrow}</a>${supportingVideos("hand-position")}`)}
      ${panel("Speed and control", `<p>Use compact strokes. Begin with four notes at a time and stop before tension accumulates. Add a few beats per minute only when the movement stays easy.</p><p>When a note scratches, use less pad or change the release angle. When an arpeggio loses a note, check if a neighboring finger touched the string too early.</p>${supportingVideos("speed-control")}`)}
      ${course.techniques.map(technique => panel(technique.title, `<p>${rich(technique.body)}</p>${supportingVideos(technique.id)}`)).join("")}
    </div>`;
}

function readingQuestion() {
  const scored = Boolean(quiz.answers);
  const solution = quiz.bars?.map((bar, index) => `<li><strong>Bar ${index + 1}</strong><ul>${bar.map(({ pitch, beats, bass }) => `<li>${escape(noteLocation(pitch))}${bass ? ` with bass ${escape(noteLocation(bass))}` : ""} · ${beats} ${beats === 1 ? "beat" : "beats"}</li>`).join("")}</ul></li>`).join("");
  return `<h3>${quiz.prompt}</h3>${quiz.html}
      ${scored ? `<div class="answer-options">${quiz.answers.map((option, index) => {
        const chosen = answer === option;
        const correct = answer && quiz.correct.includes(option);
        return `<button type="button" class="btn secondary" data-answer="${index}"${answer ? " disabled" : ""}${correct ? ' data-correct="true"' : chosen ? ' data-wrong="true"' : ""}>${escape(option)}</button>`;
      }).join("")}</div>` : ""}
      ${scored ? `<div class="quiz-feedback" role="status">${answer ? (quiz.correct.includes(answer) ? "Correct." : "Answer: " + escape(quiz.correct[0]) + ".") + (quiz.explanation ? ` <span class="meta">${escape(quiz.explanation)}</span>` : "") : ""}</div>` : ""}
      ${solution ? `<details><summary>Show strings and frets after your first take</summary><ul>${solution}</ul></details>` : ""}
      <div class="actions"><button type="button" class="btn" data-new-question${scored && !answer ? " disabled" : ""}>${scored ? "Next question" : "New score"}${arrow}</button>${scored ? `<span class="meta">${reading.correct} correct out of ${reading.attempts}</span>` : ""}</div>`;
}

function readingView() {
  const topic = readingModes.find(mode => mode.id === reading.mode);
  return intro("Music Reading Academy", "Find the note on the staff, name it, then play it on the guitar. Start with the three open strings.") +
    `<div class="actions block-gap">${btn("#reading/guided", "Learn the fretboard step by step")}</div><div class="split"><div class="stack">
    <section class="panel flow"><h2>Practice</h2>
      <div class="tabs" aria-label="Reading exercise">${readingModes.map(mode => `<button type="button" class="btn secondary" data-mode="${mode.id}" aria-pressed="${mode.id === reading.mode}">${mode.label}</button>`).join("")}</div>
      ${["notes", "frets", "melody"].includes(reading.mode) ? `<label class="field">Note range<select id="reading-level">${readingLevels.map(level => `<option value="${level.id}"${level.id === reading.level ? " selected" : ""}>${level.label}</option>`).join("")}</select></label>` : ""}
      ${reading.mode === "melody" ? `<label class="field">Length<select id="reading-bars">${[2, 4].map(bars => `<option value="${bars}"${bars === reading.bars ? " selected" : ""}>${bars} bars</option>`).join("")}</select></label>` : ""}
      <div id="reading-question" class="flow">${readingQuestion()}</div>
    </section></div><aside class="stack">
      ${panel(topic.label, videoResources(supportTopics[topic.id], "Watch before trying the exercise", true))}
      ${panel("Find notes on the guitar", `<p>Count staff lines and spaces from the bottom. String 1 is the thinnest. Fret 0 means open.</p>${openNoteMap()}
        <details><summary>Show all first-position natural notes</summary><p class="meta">Octave numbers refer to the notes as written. The guitar sounds one octave lower.</p>${noteMap(firstPosition.map(note => note.pitch), true)}</details>`)}
      ${panel("Printed practice", `<p>Start with scores A–C and save Score H for your first-take assessment.</p>${pdf}
        <details><summary>Watch a printed exercise at 48 bpm</summary><div class="score-index">${[..."ABCDEFGH"].map(letter => `<a class="link" href="media/score-${letter.toLowerCase()}.mp4">Score ${letter}</a>`).join("")}</div></details>`)}
    </aside></div>`;
}

function repertoireView() {
  const pieces = [
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
  return intro("Repertoire", "Find a piece to practise from the score, then revisit it as your tone and rhythm improve.") +
    `<div class="grid">${panel("Estas Tonne", `<p>Study four pieces and practise the right-hand patterns with fingertip pads.</p><a class="link" href="#estas">Open the guide${arrow}</a>`)}${pieces.map(([name, skill, id]) => panel(name, `<p>${escape(skill)}</p><a class="link" href="#lesson/${id}">Lesson and score${arrow}</a>`)).join("")}</div>`;
}

function estasView(piece) {
  if (piece) return back("#estas", "Estas Tonne guide") + intro(piece.title, piece.intro, piece.level) +
    `<div class="split"><div class="stack">
      ${panel("Practise the passage", stepsList(piece.steps, estasStepVideos[piece.id]))}
      ${panel("Checkpoint", `<p>${escape(piece.checkpoint)}</p><a class="link" href="#journal">Log a practice take${arrow}</a>`)}
    </div><aside class="stack">
      ${panel("What to watch", videoResources(piece.videos, "Performances and lessons"))}
      ${panel("Scores and sources", piece.links.map(([label, url]) => `<p>${ext(url, label)}</p>`).join(""))}
    </aside></div>`;
  return intro("Estas Tonne on fingertip pads", "Use the performances to hear the phrasing, then follow a tutorial or a score for one small passage. Start with the open-string pattern if you’re building your right hand.") +
    `<div class="actions">${btn("#estas/golden-dragon", "Study The Golden Dragon")}${btn("#lesson/L02", "Learn your first pad stroke", true)}</div>
    <div class="grid block-gap">${estasPieces.map(item => panel(item.title, `<p>${escape(item.skill)}</p><p class="meta">${escape(item.level)}</p><a class="link" href="#estas/${item.id}">${escape(item.start)}${arrow}</a>`)).join("")}</div>
    <section class="block-gap flow"><h2>Read and play</h2>
      <p>These original exercises build the thumb pulse and phrasing used in the studies. Right-hand finger names are p (thumb), i (index), m (middle) and a (ring).</p>
      <div class="grid">${estasDrills.map((drill, index) => panel(drill.title, `${score(drill.bars, { label: drill.label })}<p>${escape(drill.focus)}</p>${videoResources(estasDrillVideos[index], "Video for this exercise")}`)).join("")}</div>
    </section>
    <p class="block-gap">${ext("https://www.estastonne.com/faq/", "Estas Tonne’s FAQ on recordings and sheet music")}</p>`;
}

function roadmapView() {
  return back("#course", "Curriculum") + intro("Months 7–12", "Continue when the foundations feel steady. Use the milestones to guide the next six months.") +
    `<div class="grid">${course.roadmap.map(item => panel("Month " + item.month, `<p>${rich(item.focus)}</p><p><strong>Milestone</strong> · ${rich(item.milestone)}</p>${videoResources(roadmapPracticeVideos[item.month], "Videos for this practice")}
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
      <p>${watched} videos watched · ${practiced(core)} of ${core.length} core exercises practised · ${mastered(core)} skills mastered · ${tests} of ${course.modules.length} assessments passed</p>
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
  let guided;
  let guidedOptions;
  switch (page) {
    case "home": html = home(); break;
    case "course": html = courseView(); break;
    case "module": nav = "course"; html = modules.has(id) ? moduleView(modules.get(id)) : missingView(); break;
    case "lesson":
      nav = "course";
      if (lessons.has(id)) {
        if (progress.lastLesson !== id) { progress.lastLesson = id; persist(); }
        html = lessonView(lessons.get(id));
        guided = guidedCoreLessons[id];
      } else html = missingView();
      break;
    case "days": nav = "course"; html = daysView(); break;
    case "day": {
      nav = "course";
      const day = course.days.find(item => String(item.id) === id);
      if (day) {
        html = dayView(day);
        guided = guidedDays[id];
        guidedOptions = { optional: restDay(day), markComplete: () => {
          setCheck(progress.days, id, true);
          main.querySelector(`[data-day="${id}"]`).checked = true;
          persist("Day marked complete.");
        } };
      } else html = missingView();
      break;
    }
    case "technique": html = techniqueView(); break;
    case "estas": {
      const piece = estasPieces.find(item => item.id === id);
      html = id && !piece ? missingView() : estasView(piece);
      break;
    }
    case "reading":
      if (id === "guided") {
        html = back("#reading", "Music Reading Academy") + intro("Read a note and find its fret", "Match staff positions to the guitar, then hear what changes when you move a fret or an octave.") +
          `<div class="split"><div class="stack">${guidedPanel}</div><aside class="stack">${panel("Open-string reference", openNoteMap())}</aside></div>`;
        guided = guidedTheory;
        break;
      }
      if (["assessment", "notes", "open-melody"].includes(id)) {
        Object.assign(reading, { mode: id === "notes" ? "notes" : "melody", level: id === "assessment" ? "treble" : "open", bars: id === "assessment" ? 4 : 2 });
        nextQuestion(true);
      }
      html = readingView();
      break;
    case "journal": html = journalView(id); break;
    case "progress": html = progressView(); break;
    case "settings": importPending = null; html = settingsView(); break;
    case "repertoire": html = repertoireView(); break;
    case "roadmap": nav = "course"; html = roadmapView(); break;
    default: html = missingView();
  }
  unmountGuided();
  main.innerHTML = html;
  unmountGuided = mountGuidedPractice(main.querySelector("[data-guided-practice]"), guided, guidedOptions);
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
  quiz = newQuestion(reading.mode, reading.level, reset ? undefined : quiz.key, reading.bars);
  answer = undefined;
  if (reset) { reading.attempts = 0; reading.correct = 0; }
}

function rerenderReading(target, topicChanged = false) {
  if (topicChanged) main.innerHTML = readingView();
  else main.querySelector("#reading-question").innerHTML = readingQuestion();
  main.querySelector(target)?.focus({ preventScroll: true });
}

function videoFrame(id, title, start, end) {
  const embed = new URL("https://www.youtube-nocookie.com/embed/" + id);
  embed.searchParams.set("autoplay", "1");
  embed.searchParams.set("playsinline", "1");
  if (start) embed.searchParams.set("start", start);
  if (end) embed.searchParams.set("end", end);
  const iframe = document.createElement("iframe");
  iframe.src = embed.href;
  iframe.title = title;
  iframe.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share";
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  iframe.allowFullscreen = true;
  return iframe;
}

function playVideo(button) {
  const lesson = lessons.get(button.dataset.video);
  const frame = videoFrame(lesson.video, lesson.videoTitle ?? lesson.title, lesson.start, lesson.end);
  const player = button.parentElement;
  player.classList.replace("video-unloaded", "video");
  button.replaceWith(frame);
  frame.focus();
}

function playSupportingVideo(button) {
  const id = button.dataset.supportVideo;
  const list = button.closest(".support-videos");
  list.querySelector(".support-player")?.remove();
  const frame = videoFrame(id, videoInfo(id).title, button.dataset.start, button.dataset.end);
  const player = document.createElement("div");
  player.className = "video support-player";
  player.append(frame);
  button.closest("li").append(player);
  frame.focus();
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
  if (button.dataset.supportVideo) playSupportingVideo(button);
  if (button.dataset.minutes) {
    progress.minutes = Number(button.dataset.minutes);
    persist("Practice length updated.");
    main.innerHTML = home();
    main.querySelector(`[data-minutes="${progress.minutes}"]`)?.focus({ preventScroll: true });
  }
  if (button.dataset.mode) {
    if (reading.mode === button.dataset.mode) return;
    reading.mode = button.dataset.mode;
    nextQuestion(true);
    rerenderReading(`[data-mode="${reading.mode}"]`, true);
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
  if (input.id === "reading-bars") {
    reading.bars = Number(input.value);
    nextQuestion(true);
    rerenderReading("#reading-bars");
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
