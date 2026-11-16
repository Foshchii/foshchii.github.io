// The Guitar Academy's controller: it owns the learner's state, decides which screen to show,
// and reacts to clicks, ticks and typing. What each screen looks like lives in views.js.
import { course } from "./course.js";
import { guidedCoreLessons, guidedDays, guidedTheory } from "./guided-lessons.js";
import { mountGuidedPractice } from "./guided-practice.js";
import { dateKey, loadProgress, mergeProgress, readProgress, saveProgress } from "./progress.js";
import { newQuestion } from "./reading.js";
import {
  engaged, lessons, level, modules, practisedCount, readingPresets, renderImportSummary, renderJournalEntries,
  renderLessonResults, renderModuleStatus, renderQuestion, renderRoute, videoInfo
} from "./views.js";

const app = document.querySelector("#app");
const mainElement = document.querySelector("#main");
const announcement = document.querySelector("#announcement");
const root = document.documentElement;
const themeKey = "guitar-academy.theme";
const scrollKey = "guitar-academy.scroll";
const themeColors = { light: "#f6f1e8", dark: "#16110d" };
// The date the prerendered home page carries in place of today's (see prerender_guitar.mjs).
const prerenderDate = "0000-00-00";

const state = {
  progress: loadProgress(),
  storageOk: true,
  reading: { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 },
  quiz: null,
  answer: undefined,
  theme: "auto",
  confirmDelete: null
};
state.storageOk = saveProgress(state.progress);
state.quiz = newQuestion(state.reading.mode, state.reading.level);
let importPending;
let unmountGuided = () => {};

// ---------------------------------------------------------------- saving and announcing

function announce(message) {
  announcement.textContent = "";
  requestAnimationFrame(() => { announcement.textContent = message; });
}

function persist(message) {
  state.storageOk = saveProgress(state.progress);
  if (message) announce(state.storageOk ? message : message + " Browser storage is unavailable. Export a backup to keep these changes.");
  updateProgressChip();
}

function updateProgressChip() {
  const [done, total] = practisedCount(state);
  const percent = total ? Math.round(done / total * 100) : 0;
  for (const chip of document.querySelectorAll("[data-progress-chip]")) {
    chip.querySelector(".ring-value")?.setAttribute("stroke-dasharray", `${percent} 100`);
    chip.setAttribute("aria-label", `Progress: ${done} of ${total} core exercises practised`);
  }
}

// ---------------------------------------------------------------- appearance

function savedTheme() {
  try {
    const saved = localStorage.getItem(themeKey);
    return saved === "light" || saved === "dark" ? saved : "auto";
  } catch {
    return "auto";
  }
}

function applyTheme(theme) {
  state.theme = theme;
  if (theme === "auto") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // The browser's own toolbar should match the page, not the device, once a theme is chosen.
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
    meta.content = theme === "auto" ? meta.dataset.auto : themeColors[theme];
  }
}

function chooseTheme(theme) {
  applyTheme(theme);
  try {
    if (theme === "auto") localStorage.removeItem(themeKey);
    else localStorage.setItem(themeKey, theme);
  } catch { /* the choice lasts until the page closes */ }
}

// ---------------------------------------------------------------- history: Back returns you to where you were

history.scrollRestoration = "manual";
const positions = new Map();
try {
  for (const [id, offset] of JSON.parse(sessionStorage.getItem(scrollKey) ?? "[]")) positions.set(id, offset);
} catch { /* start with nothing remembered */ }
let entry;

function rememberScroll() {
  if (entry) positions.set(entry, window.scrollY);
}

// Marks the history entry now on screen. Returns the offset to go back to when the visitor has
// been here before (Back, Forward, reload), or null when the entry is new.
function enterEntry() {
  const known = history.state?.guitar;
  if (known) {
    entry = known;
    return positions.get(known) ?? 0;
  }
  entry = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  history.replaceState({ ...history.state, guitar: entry }, "");
  return null;
}

window.addEventListener("pagehide", () => {
  rememberScroll();
  try {
    sessionStorage.setItem(scrollKey, JSON.stringify([...positions].slice(-60)));
  } catch { /* scroll positions are a convenience */ }
});

// ---------------------------------------------------------------- guided practice

// Lessons, days and #reading/guided have a step-by-step exercise; guided-practice.js draws it
// into the screen's [data-guided-practice] card and keeps it running until the screen changes.
function mountGuided(page, id) {
  unmountGuided();
  unmountGuided = () => {};
  const root = app.querySelector("[data-guided-practice]");
  if (!root) return;
  if (page === "lesson") unmountGuided = mountGuidedPractice(root, guidedCoreLessons[id]);
  if (page === "reading" && id === "guided") unmountGuided = mountGuidedPractice(root, guidedTheory);
  if (page === "day") {
    const day = course.days.find(item => String(item.id) === id);
    unmountGuided = mountGuidedPractice(root, guidedDays[id], {
      optional: day?.watch.startsWith("Rest"),
      markComplete: () => {
        state.progress.days[id] = true;
        const box = app.querySelector(`[data-day="${id}"]`);
        if (box) box.checked = true;
        app.querySelector(`.daystrip [href="#day/${id}"]`)?.classList.add("complete");
        persist("Day marked complete.");
      }
    });
  }
}

// ---------------------------------------------------------------- showing a screen

function currentRoute() {
  const hash = location.hash === "#main" ? "" : location.hash;
  return (hash.slice(1) || "home").split("/");
}

function markCurrent(nav) {
  for (const item of document.querySelectorAll("[data-nav]")) {
    const [own, ...group] = item.dataset.nav.split(" ");
    if (own === nav) item.setAttribute("aria-current", "page");
    else if (group.includes(nav)) item.setAttribute("aria-current", "true");
    else item.removeAttribute("aria-current");
  }
}

// top: a scroll offset to move to, or null to leave the page where it is.
// arrive: false when redrawing the screen the visitor is already on.
function show({ top = 0, focus = true, arrive = true } = {}) {
  if (location.hash === "#main" && app.childElementCount) return;   // the skip link
  const [page, id] = currentRoute();
  if (arrive) {
    if (page === "lesson" && lessons.has(id) && state.progress.lastLesson !== id) {
      state.progress.lastLesson = id;
      persist();
    }
    if (page === "reading" && readingPresets.includes(id)) {
      Object.assign(state.reading, { mode: id === "notes" ? "notes" : "melody", level: id === "assessment" ? "treble" : "open", bars: id === "assessment" ? 4 : 2 });
      nextQuestion(true);
    }
    if (page === "settings") importPending = null;
    state.confirmDelete = null;
  }
  const { nav, html } = renderRoute(state, page, id);
  app.innerHTML = html;
  finish(nav, { top, focus, arrive, page, id });
}

function finish(nav, { top = null, focus = false, arrive = false, page, id } = {}) {
  root.classList.remove("deep", "returning");
  document.title = `${app.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim() || "Today"} · Guitar Academy`;
  markCurrent(nav);
  updateProgressChip();
  mountGuided(page, id);
  if (arrive) app.firstElementChild?.classList.add("is-entering");
  const anchor = arrive && top === 0 && page === "technique" && id ? document.getElementById("technique-" + id) : null;
  if (anchor) {
    anchor.scrollIntoView({ behavior: "instant", block: "start" });
    if (focus) anchor.focus({ preventScroll: true });
    return;
  }
  if (top !== null) window.scrollTo({ top, behavior: "instant" });
  if (focus) mainElement.focus({ preventScroll: true });
}

const redraw = () => show({ top: null, focus: false, arrive: false });

// index.html already holds the home page a first-time visitor sees, so it is on screen before
// this script arrives. When that copy is exactly what we would draw, keep it and only give the
// checklist today's date; otherwise draw the screen ourselves.
function start() {
  const restored = enterEntry();
  const [page, id] = currentRoute();
  if (page === "home" && !id && restored === null && app.childElementCount && !engaged(state.progress)) {
    const expected = document.createElement("div");
    expected.innerHTML = renderRoute({ ...state, today: prerenderDate }, "home").html;
    if (expected.innerHTML === app.innerHTML) {
      for (const input of app.querySelectorAll("[data-activity]")) {
        input.dataset.activity = input.dataset.activity.replace(prerenderDate, dateKey());
      }
      finish("home");
      return;
    }
  }
  show({ top: restored, focus: false, arrive: false });
}

// ---------------------------------------------------------------- curriculum search

function filterLessons() {
  const { query, language, level: selectedLevel, status } = Object.fromEntries(new FormData(app.querySelector("#filters")));
  const terms = query.toLocaleLowerCase().trim().split(/\s+/);
  const flags = id => state.progress.lessons[id] ?? {};
  const matching = course.lessons.filter(lesson => {
    const text = [lesson.title, lesson.videoTitle, lesson.teacher, lesson.objective, lesson.adaptation, lesson.drill,
      modules.get(lesson.module)?.title].join(" ").toLocaleLowerCase();
    return terms.every(term => text.includes(term)) && (!language || lesson.language === language) &&
      (!selectedLevel || level(lesson.module) === selectedLevel) &&
      (!status || (status === "todo" && !flags(lesson.id).practised) ||
        (status === "done" && flags(lesson.id).practised) || (status === "mastered" && flags(lesson.id).mastered));
  });
  app.querySelector("#lesson-results").innerHTML = renderLessonResults(state, matching);
}

// ---------------------------------------------------------------- reading trainer

function nextQuestion(reset = false) {
  const { reading } = state;
  state.quiz = newQuestion(reading.mode, reading.level, reset ? undefined : state.quiz.key, reading.bars);
  state.answer = undefined;
  if (reset) { reading.attempts = 0; reading.correct = 0; }
}

function redrawReading(target, whole = false) {
  if (whole) redraw();
  else app.querySelector("#reading-question").innerHTML = renderQuestion(state);
  app.querySelector(target)?.focus({ preventScroll: true });
}

function chooseAnswer(index) {
  const { quiz, reading } = state;
  if (state.answer || !quiz.answers?.[index]) return;
  state.answer = quiz.answers[index];
  reading.attempts++;
  const right = quiz.correct.includes(state.answer);
  if (right) reading.correct++;
  redrawReading("[data-new-question]");
  announce(right ? "Correct." : "Answer: " + quiz.correct[0] + ".");
}

// ---------------------------------------------------------------- video

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
  const player = button.closest(".video-unloaded");
  player.classList.replace("video-unloaded", "video");
  player.replaceChildren(frame);
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

// ---------------------------------------------------------------- backup

function exportBackup() {
  const file = new Blob([JSON.stringify(state.progress, null, 2)], { type: "application/json" });
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
  const feedback = app.querySelector("#import-feedback");
  const file = input.files[0];
  if (!file) { feedback.textContent = ""; return; }
  try {
    if (file.size > 10_000_000) throw new Error("This file is too large for a progress backup.");
    const imported = readProgress(JSON.parse(await file.text()));
    if (!input.isConnected || input.files[0] !== file) return;
    importPending = imported;
    feedback.innerHTML = renderImportSummary(state, imported);
  } catch (error) {
    if (!input.isConnected || input.files[0] !== file) return;
    feedback.textContent = error instanceof SyntaxError ? "This file is not valid JSON." : error.message;
  }
}

// ---------------------------------------------------------------- journal

function redrawJournal(target) {
  app.querySelector("#journal-entries").innerHTML = renderJournalEntries(state);
  app.querySelector(target)?.focus({ preventScroll: true });
}

function deleteEntry(id) {
  state.progress.journal = state.progress.journal.filter(item => item.id !== id);
  state.confirmDelete = null;
  persist("Practice session deleted.");
  if (location.hash === "#journal/" + id) location.hash = "journal";   // it was open in the form
  else redrawJournal("#journal-entries a, #journal-form [name=date]");
}

// ---------------------------------------------------------------- events

app.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  const data = button.dataset;
  if (data.video) playVideo(button);
  if (data.supportVideo) playSupportingVideo(button);
  if (data.minutes) {
    state.progress.minutes = Number(data.minutes);
    persist("Practice length updated.");
    redraw();
    app.querySelector(`[data-minutes="${state.progress.minutes}"]`)?.focus({ preventScroll: true });
  }
  if (data.mode) {
    if (state.reading.mode === data.mode) return;
    state.reading.mode = data.mode;
    nextQuestion(true);
    redrawReading(`[data-mode="${state.reading.mode}"]`, true);
  }
  if ("answer" in data) chooseAnswer(Number(data.answer));
  if ("newQuestion" in data) {
    nextQuestion();
    redrawReading(state.quiz.answers ? "[data-answer]" : "[data-new-question]");
  }
  if ("export" in data) exportBackup();
  if ("confirmImport" in data && importPending) {
    state.progress = mergeProgress(state.progress, importPending);
    persist();
    app.querySelector("#backup-file").value = "";
    app.querySelector("#import-feedback").textContent = state.storageOk ? "Backup merged." : "Merged for this session. Browser storage is unavailable.";
    importPending = null;
  }
  if (data.themeChoice) {
    chooseTheme(data.themeChoice);
    redraw();
    app.querySelector(`[data-theme-choice="${state.theme}"]`)?.focus({ preventScroll: true });
    announce(state.theme === "auto" ? "Following your device’s appearance." : `${state.theme === "dark" ? "Dark" : "Light"} appearance on.`);
  }
  if (data.askDelete) {
    state.confirmDelete = data.askDelete;
    redrawJournal(`[data-delete-entry="${data.askDelete}"]`);
  }
  if ("cancelDelete" in data) {
    const id = state.confirmDelete;
    state.confirmDelete = null;
    redrawJournal(`[data-ask-delete="${id}"]`);
  }
  if (data.deleteEntry) deleteEntry(data.deleteEntry);
});

function setCheck(map, key, checked) {
  if (checked) map[key] = true;
  else delete map[key];
}

app.addEventListener("change", event => {
  const input = event.target;
  const { progress, reading } = state;
  const { lesson, flag, assessment, day, activity } = input.dataset;
  if (lesson) setCheck(progress.lessons[lesson] ??= {}, flag, input.checked);
  if (assessment) {
    setCheck(progress.assessments, assessment, input.checked);
    app.querySelector("#module-status").innerHTML = renderModuleStatus(state, modules.get(assessment));
  }
  if (day) {
    setCheck(progress.days, day, input.checked);
    app.querySelector(`.daystrip [href="#day/${day}"]`)?.classList.toggle("complete", input.checked);
  }
  if (activity) {
    setCheck(progress.activities, activity, input.checked);
    const total = app.querySelectorAll("[data-activity]").length;
    const checked = app.querySelectorAll("[data-activity]:checked").length;
    app.querySelector("#activity-total").textContent = `${checked} of ${total} checked`;
  }
  if (lesson || assessment || day || activity) persist(input.checked ? "Progress marked." : "Progress mark removed.");
  if (input.id === "reading-level") {
    reading.level = input.value;
    nextQuestion(true);
    redrawReading("#reading-level");
  }
  if (input.id === "reading-bars") {
    reading.bars = Number(input.value);
    nextQuestion(true);
    redrawReading("#reading-bars");
  }
  if (input.id === "backup-file") readBackup(input);
  if (input.form?.id === "filters") filterLessons();
});

app.addEventListener("input", event => {
  if (event.target.name === "query") filterLessons();
});

app.addEventListener("submit", event => {
  event.preventDefault();
  if (event.target.id !== "journal-form") return;
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  const draft = { ...values, id: form.dataset.edit || crypto.randomUUID(), minutes: Number(values.minutes), updatedAt: Date.now() };
  const valid = readProgress({ ...state.progress, journal: [draft] }).journal[0];
  if (!valid) { announce("Check the date and minutes."); return; }
  state.progress.journal = [...state.progress.journal.filter(item => item.id !== valid.id), valid];
  persist("Practice session saved.");
  if (location.hash === "#journal") show();
  else location.hash = "journal";
});

// In the reading trainer, 1–9 choose an answer.
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !/^[1-9]$/.test(event.key)) return;
  if (event.target.closest?.("input, select, textarea")) return;
  if (!app.querySelector("#reading-question [data-answer]:not(:disabled)")) return;
  event.preventDefault();
  chooseAnswer(Number(event.key) - 1);
});

window.addEventListener("hashchange", () => {
  rememberScroll();
  const restored = enterEntry();
  show({ top: restored ?? 0 });
});

applyTheme(savedTheme());
start();
