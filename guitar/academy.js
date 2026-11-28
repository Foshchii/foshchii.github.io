// The Guitar Academy's controller: it owns the learner's state, decides which screen to show,
// and reacts to clicks, ticks and typing. What each screen looks like lives in views.js.
import { course } from "./course.js";
import { guidedCoreLessons, guidedDays, guidedTheory } from "./guided-lessons.js";
import { mountGuidedPractice } from "./guided-practice.js";
import {
  addCount, dateKey, deviceName, emptyProgress, loadProgress, mergeProgress, progressKey, readProgress, removeEntry,
  saveProgress, setChoice, setMark, setProfile, setRecord
} from "./progress.js";
import { loadQuiz, quizKey } from "./quiz-store.js";
import { newQuestion } from "./reading.js";
import { claim, titleFor } from "./rpg.js";
import * as sync from "./sync.js";
import { app, applyUpdate, install, onAppChange, saveEverything, startApp } from "./app.js";
import { mountSession } from "./tool-session.js";
import { mountMetronome } from "./tool-metronome.js";
import { mountTuner } from "./tool-tuner.js";
import { mountChords } from "./tool-chords.js";
import { mountCompas } from "./tool-compas.js";
import {
  crest, engaged, heroContext, lessons, level, modules, readingPresets, renderHero, renderImportSummary, renderJournalEntries,
  renderLessonResults, renderModuleStatus, renderQuestion, renderRoute, todayPlan, videoInfo
} from "./views.js";

const appRoot = document.querySelector("#app");
const mainElement = document.querySelector("#main");
const announcement = document.querySelector("#announcement");
const toasts = document.querySelector("#toasts");
const banner = document.querySelector("#banner");
const root = document.documentElement;
const themeKey = "guitar-academy.theme";
const scrollKey = "guitar-academy.scroll";
const installKey = "guitar-academy.install-dismissed";
const themeColors = { light: "#f6f1e8", dark: "#16110d" };
// The date the prerendered home page carries in place of today's (see prerender_guitar.mjs).
const prerenderDate = "0000-00-00";
const device = deviceName();

const state = {
  progress: loadProgress(),
  quiz: loadQuiz(),
  storageOk: true,
  reading: { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 },
  question: null,
  answer: undefined,
  theme: "auto",
  confirmDelete: null,
  confirm: null,
  app,
  sync: null,
  syncReveal: false,
  syncMessage: "",
  joinCode: "",
  installDismissed: readFlag(installKey)
};
state.storageOk = saveProgress(state.progress);
state.question = newQuestion(state.reading.mode, state.reading.level);
let importPending;
let unmountScreen = () => {};

function readFlag(key) {
  try { return Boolean(localStorage.getItem(key)); } catch { return false; }
}

// ---------------------------------------------------------------- saving and announcing

function announce(message) {
  announcement.textContent = "";
  requestAnimationFrame(() => { announcement.textContent = message; });
}

// Save the record, tell sync, then see what the change earned (experience, quests, achievements).
function persist(message, reason) {
  const found = claim(state.progress, state.quiz, heroContext(viewState()));
  state.storageOk = saveProgress(state.progress);
  if (message) announce(state.storageOk ? message : message + " Browser storage is unavailable. Export a backup to keep these changes.");
  sync.schedule();
  celebrate(reason, found);
}

// ---------------------------------------------------------------- experience, levels and toasts

let shown = null;   // { total, level } as last shown

function heroNow() {
  return renderHero(viewState());
}

function toast(html, kind = "") {
  if (!toasts) return;
  const item = document.createElement("div");
  item.className = "toast" + (kind ? " toast--" + kind : "");
  item.innerHTML = html;
  toasts.append(item);
  while (toasts.childElementCount > 4) toasts.firstElementChild.remove();
  setTimeout(() => { item.classList.add("is-leaving"); setTimeout(() => item.remove(), 400); }, kind === "badge" ? 5200 : 3200);
}

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const symbol = name => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

function levelUp(hero, from) {
  const dialog = document.querySelector("#level-up");
  if (!dialog?.showModal) { announce(`Level ${hero.level}: ${hero.title}.`); return; }
  dialog.querySelector("[data-level-crest]").innerHTML = crest(hero.level, "large");
  dialog.querySelector("[data-level-title]").textContent = `Level ${hero.level}`;
  dialog.querySelector("[data-level-name]").textContent = hero.title;
  const changedTitle = titleFor(from) !== hero.title;
  dialog.querySelector("[data-level-text]").textContent = changedTitle
    ? `A new title: ${hero.title}. ${hero.toNext} XP to level ${hero.level + 1}.`
    : `${hero.toNext} XP to level ${hero.level + 1}${hero.next ? `; at level ${hero.next[0]} you become “${hero.next[1]}”` : ""}.`;
  if (!dialog.open) dialog.showModal();
}

function celebrate(reason, found = { quests: [], badges: [] }) {
  const hero = heroNow();
  updateLevelChip(hero);
  if (!shown) { shown = { total: hero.total, level: hero.level }; return; }
  const gained = hero.total - shown.total;
  for (const quest of found.quests) toast(`${symbol("target")}<span><strong>Quest complete</strong>${esc(quest.title)}</span><b>+${quest.reward} XP</b>`, "quest");
  for (const badge of found.badges) toast(`${symbol("trophy")}<span><strong>Achievement</strong>${esc(badge.name)}</span><b>+${badge.xp} XP</b>`, "badge");
  const extra = found.quests.reduce((sum, quest) => sum + quest.reward, 0) + found.badges.reduce((sum, badge) => sum + badge.xp, 0);
  if (reason && gained - extra > 0) toast(`${symbol("sparkle")}<span>${esc(reason)}</span><b>+${gained - extra} XP</b>`);
  if (found.quests.length || found.badges.length) announce([...found.quests.map(quest => "Quest complete: " + quest.title), ...found.badges.map(badge => "Achievement: " + badge.name)].join(". "));
  if (hero.level > shown.level) {
    // While a practice tool is open the learner's hands are busy: no dialog, just a toast.
    if (appRoot.querySelector("[data-tool]")) {
      toast(`${symbol("crown")}<span><strong>Level ${hero.level}</strong>${esc(hero.title)}</span>`, "badge");
      announce(`Level ${hero.level}: ${hero.title}.`);
    } else levelUp(hero, shown.level);
  }
  shown = { total: hero.total, level: hero.level };
}

function updateLevelChip(hero = heroNow()) {
  const percent = hero.span ? Math.round(hero.into / hero.span * 100) : 0;
  for (const chip of document.querySelectorAll("[data-progress-chip]")) {
    chip.querySelector(".ring-value")?.setAttribute("stroke-dasharray", `${percent} 100`);
    const label = chip.querySelector("[data-chip-level]");
    if (label) label.textContent = hero.level;
    chip.setAttribute("aria-label", `Level ${hero.level}, ${hero.title}: ${hero.toNext} XP to the next level. Open your hero`);
  }
}

// What the tools may do: earn experience (capped per day and source), count time and set bests.
const capOf = source => `cap.${source}`;
function todayCount(metric) {
  return state.progress.counters[device]?.days?.[dateKey()]?.[metric] ?? 0;
}
const toolApi = {
  announce,
  reward({ source, skill = "general", xp = 0, cap = Infinity, metric, amount = 1, label, quiet = false }) {
    const grant = Math.max(0, Math.min(xp, cap - todayCount(capOf(source))));
    if (metric) addCount(state.progress, device, metric, amount);
    if (grant > 0) {
      addCount(state.progress, device, `xp.${skill}`, grant);
      addCount(state.progress, device, capOf(source), grant);
    }
    persist(undefined, quiet ? undefined : label);
    return grant;
  },
  count(metric, amount) {
    addCount(state.progress, device, metric, amount);
    persist();
  },
  record(id, value) {
    const better = setRecord(state.progress, id, value);
    if (better) persist();
    return better;
  },
  best: id => state.progress.records[id]?.v ?? 0,
  todaySeconds: metric => Object.values(state.progress.counters).reduce((sum, entry) => sum + (entry.days?.[dateKey()]?.[metric] ?? 0), 0),
  plan: () => todayPlan(viewState()),
  tick(key) {
    setMark(state.progress, "activities/" + key, true);
    persist("Step ticked.", "Session step done");
  },
  log({ minutes, piece = "", notes = "", exercises = "" }) {
    const entry = { id: crypto.randomUUID(), date: dateKey(), minutes: Math.round(minutes), piece, notes, exercises, difficulty: "", skills: "", updatedAt: Date.now() };
    const valid = readProgress({ ...emptyProgress(), journal: [entry] }).journal[0];
    if (!valid) { announce("Check the minutes: between 1 and 600."); return false; }
    state.progress.journal.push(valid);
    persist("Practice session saved in the journal.", "Journal entry");
    return true;
  }
};

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

// ---------------------------------------------------------------- what runs inside a screen

// Lessons, days and #reading/guided have a step-by-step exercise; guided-practice.js draws it
// into the screen's [data-guided-practice] card. The practice room's tools draw into [data-tool].
// Each keeps running until the screen changes.
const tools = { session: mountSession, metronome: mountMetronome, tuner: mountTuner, chords: mountChords, compas: mountCompas };

function mountScreen(page, id) {
  unmountScreen();
  unmountScreen = () => {};
  const toolRoot = appRoot.querySelector("[data-tool]");
  if (toolRoot && tools[toolRoot.dataset.tool]) {
    unmountScreen = tools[toolRoot.dataset.tool](toolRoot, toolApi);
    return;
  }
  const guided = appRoot.querySelector("[data-guided-practice]");
  if (!guided) return;
  if (page === "lesson") unmountScreen = mountGuidedPractice(guided, guidedCoreLessons[id]);
  if (page === "reading" && id === "guided") unmountScreen = mountGuidedPractice(guided, guidedTheory);
  if (page === "day") {
    const day = course.days.find(item => String(item.id) === id);
    unmountScreen = mountGuidedPractice(guided, guidedDays[id], {
      optional: day?.watch.startsWith("Rest"),
      markComplete: () => {
        setMark(state.progress, "days/" + id, true);
        const box = appRoot.querySelector(`[data-day="${id}"]`);
        if (box) box.checked = true;
        appRoot.querySelector(`.daystrip [href="#day/${id}"]`)?.classList.add("complete");
        persist("Day marked complete.", `Day ${id} complete`);
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

// What the views draw from: the state, with the sync and app details of this moment.
function viewState(extra = {}) {
  const now = sync.state();
  state.sync = { ...now, link: now.code ? sync.linkFor(now.code) : "", share: typeof navigator.share === "function" };
  return { ...state, ...extra };
}

// top: a scroll offset to move to, or null to leave the page where it is.
// arrive: false when redrawing the screen the visitor is already on.
function show({ top = 0, focus = true, arrive = true } = {}) {
  if (location.hash === "#main" && appRoot.childElementCount) return;   // the skip link
  const [page, id] = currentRoute();
  if (arrive) {
    if (page === "lesson" && lessons.has(id) && state.progress.lastLesson !== id) {
      setChoice(state.progress, "lastLesson", id);
      state.storageOk = saveProgress(state.progress);
      sync.schedule();
    }
    if (page === "reading" && readingPresets.includes(id)) {
      Object.assign(state.reading, { mode: id === "notes" ? "notes" : "melody", level: id === "assessment" ? "treble" : "open", bars: id === "assessment" ? 4 : 2 });
      nextQuestion(true);
    }
    if (page === "settings") importPending = null;
    if (page !== "sync") { state.syncMessage = ""; state.syncReveal = false; state.joinCode = ""; }
    // A sync link's code is read once and taken out of the address, so it stays out of history.
    if (page === "sync" && id) {
      state.joinCode = decodeURIComponent(id);
      history.replaceState(history.state, "", "#sync");
    }
    state.confirmDelete = null;
    state.confirm = null;
  }
  const { nav, html } = renderRoute(viewState(), page, id);
  appRoot.innerHTML = html;
  finish(nav, { top, focus, arrive, page, id });
}

function finish(nav, { top = null, focus = false, arrive = false, page, id } = {}) {
  root.classList.remove("deep", "returning");
  document.title = `${appRoot.querySelector("h1")?.textContent.replace(/\s+/g, " ").trim() || "Today"} · Guitar Academy`;
  markCurrent(nav);
  updateLevelChip();
  mountScreen(page, id);
  if (arrive) appRoot.firstElementChild?.classList.add("is-entering");
  const anchor = arrive && top === 0 && page === "technique" && id ? document.getElementById("technique-" + id) : null;
  if (anchor) {
    anchor.scrollIntoView({ behavior: "instant", block: "start" });
    if (focus) anchor.focus({ preventScroll: true });
    return;
  }
  if (top !== null) window.scrollTo({ top, behavior: "instant" });
  if (focus) mainElement.focus({ preventScroll: true });
}

// Draw the screen again in place. Screens with a running tool are left alone unless asked.
function redraw({ force = false } = {}) {
  if (!force && appRoot.querySelector("[data-tool]")) { updateLevelChip(); return; }
  show({ top: null, focus: false, arrive: false });
}

// index.html already holds the home page a first-time visitor sees, so it is on screen before
// this script arrives. When that copy is exactly what we would draw, keep it and only give the
// checklist today's date; otherwise draw the screen ourselves.
function start() {
  const restored = enterEntry();
  const [page, id] = currentRoute();
  if (page === "home" && !id && restored === null && appRoot.childElementCount && !engaged(state.progress)) {
    const expected = document.createElement("div");
    expected.innerHTML = renderRoute(viewState({ today: prerenderDate }), "home").html;
    if (expected.innerHTML === appRoot.innerHTML) {
      for (const input of appRoot.querySelectorAll("[data-activity]")) {
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
  const { query, language, level: selectedLevel, status } = Object.fromEntries(new FormData(appRoot.querySelector("#filters")));
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
  appRoot.querySelector("#lesson-results").innerHTML = renderLessonResults(viewState(), matching);
}

// ---------------------------------------------------------------- reading trainer

function nextQuestion(reset = false) {
  const { reading } = state;
  state.question = newQuestion(reading.mode, reading.level, reset ? undefined : state.question?.key, reading.bars);
  state.answer = undefined;
  if (reset) { reading.attempts = 0; reading.correct = 0; }
}

function redrawReading(target, whole = false) {
  if (whole) redraw();
  else appRoot.querySelector("#reading-question").innerHTML = renderQuestion(viewState());
  appRoot.querySelector(target)?.focus({ preventScroll: true });
}

function chooseAnswer(index) {
  const { reading } = state;
  const question = state.question;
  if (state.answer || !question.answers?.[index]) return;
  state.answer = question.answers[index];
  reading.attempts++;
  const right = question.correct.includes(state.answer);
  if (right) {
    reading.correct++;
    toolApi.reward({ source: "reading", skill: "reading", xp: 2, cap: 40, metric: "n.reading", amount: 1, quiet: true });
  }
  redrawReading("[data-new-question]");
  announce(right ? "Correct." : "Answer: " + question.correct[0] + ".");
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

function offlineNote(container) {
  const note = document.createElement("p");
  note.className = "poster-note";
  note.textContent = "Videos need a connection. Everything else here works offline.";
  container.append(note);
}

function playVideo(button) {
  const lesson = lessons.get(button.dataset.video);
  const player = button.closest(".video-unloaded");
  if (navigator.onLine === false) { if (!player.querySelector(".poster-note:last-child")?.textContent.startsWith("Videos need")) offlineNote(player); return; }
  const frame = videoFrame(lesson.video, lesson.videoTitle ?? lesson.title, lesson.start, lesson.end);
  player.classList.replace("video-unloaded", "video");
  player.replaceChildren(frame);
  frame.focus();
}

function playSupportingVideo(button) {
  const id = button.dataset.supportVideo;
  const list = button.closest(".support-videos");
  list.querySelector(".support-player")?.remove();
  if (navigator.onLine === false) { announce("Videos need a connection."); return; }
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
  const feedback = appRoot.querySelector("#import-feedback");
  const file = input.files[0];
  if (!file) { feedback.textContent = ""; return; }
  try {
    if (file.size > 10_000_000) throw new Error("This file is too large for a progress backup.");
    const imported = readProgress(JSON.parse(await file.text()));
    if (!input.isConnected || input.files[0] !== file) return;
    importPending = imported;
    feedback.innerHTML = renderImportSummary(viewState(), imported);
  } catch (error) {
    if (!input.isConnected || input.files[0] !== file) return;
    feedback.textContent = error instanceof SyntaxError ? "This file is not valid JSON." : error.message;
  }
}

// ---------------------------------------------------------------- journal

function redrawJournal(target) {
  appRoot.querySelector("#journal-entries").innerHTML = renderJournalEntries(viewState());
  appRoot.querySelector(target)?.focus({ preventScroll: true });
}

function deleteEntry(id) {
  removeEntry(state.progress, id);
  state.confirmDelete = null;
  persist("Practice session deleted.");
  if (location.hash === "#journal/" + id) location.hash = "journal";   // it was open in the form
  else redrawJournal("#journal-entries a, #journal-form [name=date]");
}

// ---------------------------------------------------------------- sync

// The academy's part of what is synced: this page keeps the record in memory, so sync reads
// and merges it here (see sync.js, register).
sync.register("academy", {
  read: () => state.progress,
  merge(remote) {
    const merged = mergeProgress(state.progress, readProgress(remote));
    const before = JSON.stringify(state.progress);
    if (JSON.stringify(merged) === before) return false;
    state.progress = merged;
    state.storageOk = saveProgress(state.progress);
    return true;
  }
});
sync.onMerged(() => {
  state.quiz = loadQuiz();
  claim(state.progress, state.quiz, heroContext(viewState()));
  saveProgress(state.progress);
  shown = null;
  celebrate();
  redraw();
  announce("Progress from your other devices is here.");
});
sync.subscribe(now => {
  if (now.status === "synced" && now.on) {
    // A device that syncs counts itself once a day (the "Everywhere you play" achievement).
    if (!todayCount("n.synced")) { addCount(state.progress, device, "n.synced", 1); saveProgress(state.progress); }
  }
  const status = appRoot.querySelector("[data-sync-status]");
  if (currentRoute()[0] === "sync" && (!status || now.status !== "syncing")) redraw();
  else if (currentRoute()[0] === "settings" && now.status !== "syncing") redrawSettings();
});

// Settings shows sync, install and offline states; redraw it for them unless a backup file is
// waiting to be merged, which a redraw would drop.
function redrawSettings() {
  if (appRoot.querySelector("#backup-file")?.files?.length || importPending) return;
  redraw();
}

async function syncAction(button) {
  const action = button.dataset.sync;
  const route = currentRoute();
  if (action === "create") {
    button.disabled = true;
    const now = await sync.create();
    state.syncMessage = now.on ? "" : (now.error?.message ?? "Sync could not start. Try again.");
    if (now.on) announce("Sync is on. Add your other devices with the QR code or the link.");
    redraw();
  }
  if (action === "join") {
    button.disabled = true;
    const result = await sync.join(button.dataset.code);
    state.syncMessage = result.ok ? "" : result.message;
    announce(result.message);
    if (result.ok) state.joinCode = "";
    redraw();
  }
  if (action === "now") { await sync.syncNow(); redraw(); }
  if (action === "copy") {
    try { await navigator.clipboard.writeText(state.sync.link); announce("Sync link copied."); toast(`${symbol("copy")}<span>Sync link copied</span>`); }
    catch { announce("Copying is not allowed here. Select the code instead."); state.syncReveal = true; redraw(); }
  }
  if (action === "share") {
    try { await navigator.share({ title: "Guitar Academy sync", text: "Open this on your other device to sync your guitar practice.", url: state.sync.link }); } catch { /* cancelled */ }
  }
  if (action === "reveal") { state.syncReveal = !state.syncReveal; redraw(); appRoot.querySelector('[data-sync="reveal"]')?.focus({ preventScroll: true }); }
  if (action === "ask-leave") { state.confirm = "sync-leave"; redraw(); appRoot.querySelector('[data-sync="leave"]')?.focus({ preventScroll: true }); }
  if (action === "ask-erase") { state.confirm = "sync-erase"; redraw(); appRoot.querySelector('[data-sync="erase"]')?.focus({ preventScroll: true }); }
  if (action === "cancel") { state.confirm = null; redraw(); }
  if (action === "leave") { sync.leave(); state.confirm = null; announce("Sync is off on this device. Its progress stays here."); redraw(); }
  if (action === "erase") {
    const result = await sync.erase();
    state.confirm = null;
    state.syncMessage = result.ok ? "The synced copy is deleted. Each device keeps its own progress." : result.message;
    announce(state.syncMessage);
    redraw();
  }
  if (route[0] !== "sync" && route[0] !== "settings") redraw();
}

// ---------------------------------------------------------------- the app: install, update, offline

function drawBanner() {
  if (!banner) return;
  const parts = [];
  if (app.update) parts.push(`<p>${symbol("sparkle")}<span>A new version of the academy is ready.</span><button type="button" class="btn btn--small" data-update>Reload</button></p>`);
  if (!app.online) parts.push(`<p class="banner--quiet">${symbol("offline")}<span>Offline. Everything you do is saved here${state.sync?.on ? " and syncs when you are back online" : ""}.</span></p>`);
  banner.innerHTML = parts.join("");
  banner.hidden = !parts.length;
}
onAppChange(() => {
  drawBanner();
  const [page] = currentRoute();
  if (page === "settings") redrawSettings();
  if (page === "home" && appRoot.querySelector(".nudge, .rail") && !document.activeElement?.closest?.(".today")) refreshHomeRail();
});
banner?.addEventListener("click", event => { if (event.target.closest("[data-update]")) applyUpdate(); });

async function installApp() {
  const accepted = await install();
  announce(accepted ? "The academy is installed." : "Installation cancelled.");
  redraw();
}

// ---------------------------------------------------------------- events

appRoot.addEventListener("click", event => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.closest("[data-tool]") || button.closest("[data-guided-practice]")) return;
  const data = button.dataset;
  if (data.video) playVideo(button);
  if (data.supportVideo) playSupportingVideo(button);
  if (data.minutes) {
    setChoice(state.progress, "minutes", Number(data.minutes));
    persist("Practice length updated.");
    redraw();
    appRoot.querySelector(`[data-minutes="${state.progress.minutes}"]`)?.focus({ preventScroll: true });
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
    redrawReading(state.question.answers ? "[data-answer]" : "[data-new-question]");
  }
  if ("export" in data) exportBackup();
  if ("confirmImport" in data && importPending) {
    state.progress = mergeProgress(state.progress, importPending);
    persist(undefined, "Backup merged");
    appRoot.querySelector("#backup-file").value = "";
    appRoot.querySelector("#import-feedback").textContent = state.storageOk ? "Backup merged." : "Merged for this session. Browser storage is unavailable.";
    importPending = null;
  }
  if (data.themeChoice) {
    chooseTheme(data.themeChoice);
    redraw();
    appRoot.querySelector(`[data-theme-choice="${state.theme}"]`)?.focus({ preventScroll: true });
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
  if (data.sync) syncAction(button);
  if ("install" in data) installApp();
  if ("dismissInstall" in data) {
    state.installDismissed = true;
    try { localStorage.setItem(installKey, "1"); } catch { /* lasts until the page closes */ }
    redraw();
  }
  if ("saveEverything" in data) {
    button.disabled = true;
    const feedback = appRoot.querySelector("[data-save-feedback]");
    if (feedback) feedback.textContent = "Saving…";
    saveEverything().then(ok => {
      if (feedback) feedback.textContent = ok ? "Saved. The score videos and reading sheets now open offline." : "Not saved. Check the connection and try again.";
      button.disabled = false;
    });
  }
});

const markLabels = { watched: "Video watched", practised: "Lesson practised", mastered: "Skill mastered" };
appRoot.addEventListener("change", event => {
  const input = event.target;
  if (input.closest("[data-tool]")) return;
  const { reading } = state;
  const { lesson, flag, assessment, day, activity } = input.dataset;
  let reason;
  if (lesson) { setMark(state.progress, `lessons/${lesson}/${flag}`, input.checked); reason = markLabels[flag]; }
  if (assessment) {
    setMark(state.progress, "assessments/" + assessment, input.checked);
    appRoot.querySelector("#module-status").innerHTML = renderModuleStatus(viewState(), modules.get(assessment));
    reason = "Boss beaten";
  }
  if (day) {
    setMark(state.progress, "days/" + day, input.checked);
    appRoot.querySelector(`.daystrip [href="#day/${day}"]`)?.classList.toggle("complete", input.checked);
    reason = `Day ${day} complete`;
  }
  if (activity) {
    setMark(state.progress, "activities/" + activity, input.checked);
    const total = appRoot.querySelectorAll("[data-activity]").length;
    const checked = appRoot.querySelectorAll("[data-activity]:checked").length;
    appRoot.querySelector("#activity-total").textContent = `${checked} of ${total} checked`;
    reason = "Session step done";
  }
  if (lesson || assessment || day || activity) {
    persist(input.checked ? "Progress marked." : "Progress mark removed.", input.checked ? reason : undefined);
    if (activity && currentRoute()[0] === "home") refreshHomeRail();
  }
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

// The rail on Today (hero card and quests) follows ticks without redrawing the checklist.
function refreshHomeRail() {
  const fresh = document.createElement("div");
  fresh.innerHTML = renderRoute(viewState(), "home").html;
  const rail = appRoot.querySelector(".rail"), next = fresh.querySelector(".rail");
  if (rail && next) rail.innerHTML = next.innerHTML;
}

appRoot.addEventListener("input", event => {
  if (event.target.name === "query") filterLessons();
});

appRoot.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.closest("[data-tool]")) return;
  if (form.id === "hero-form") {
    const values = Object.fromEntries(new FormData(form));
    setProfile(state.progress, { name: values.name ?? "", path: values.path ?? "" });
    persist("Hero saved.");
    redraw();
    return;
  }
  if (form.id === "sync-join") {
    const fake = { dataset: { sync: "join", code: new FormData(form).get("code") }, disabled: false };
    syncAction(fake);
    return;
  }
  if (form.id !== "journal-form") return;
  const values = Object.fromEntries(new FormData(form));
  const draft = { ...values, id: form.dataset.edit || crypto.randomUUID(), minutes: Number(values.minutes), updatedAt: Date.now() };
  const valid = readProgress({ ...emptyProgress(), journal: [draft] }).journal[0];
  if (!valid) { announce("Check the date and minutes."); return; }
  state.progress.journal = [...state.progress.journal.filter(item => item.id !== valid.id), valid];
  persist("Practice session saved.", form.dataset.edit ? undefined : "Journal entry");
  if (location.hash === "#journal") show();
  else location.hash = "journal";
});

// In the reading trainer, 1–9 choose an answer.
document.addEventListener("keydown", event => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !/^[1-9]$/.test(event.key)) return;
  if (event.target.closest?.("input, select, textarea")) return;
  if (!appRoot.querySelector("#reading-question [data-answer]:not(:disabled)")) return;
  event.preventDefault();
  chooseAnswer(Number(event.key) - 1);
});

window.addEventListener("hashchange", () => {
  rememberScroll();
  const restored = enterEntry();
  show({ top: restored ?? 0 });
});

// Another tab or the note quiz changed what is saved: take it in.
window.addEventListener("storage", event => {
  if (event.key === progressKey && event.newValue) {
    try {
      state.progress = mergeProgress(state.progress, readProgress(JSON.parse(event.newValue)));
      celebrate(undefined, claim(state.progress, state.quiz, heroContext(viewState())));
      redraw();
    } catch { /* not a record */ }
  }
  if (event.key === quizKey) {
    state.quiz = loadQuiz();
    persist(undefined, "Note quiz");
    redraw();
  }
});
// Coming back from the note quiz (in this tab or another): its points count toward the hero.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  const quiz = loadQuiz();
  if (JSON.stringify(quiz.xp) !== JSON.stringify(state.quiz.xp) || JSON.stringify(quiz.levels) !== JSON.stringify(state.quiz.levels)) {
    state.quiz = quiz;
    persist(undefined, "Note quiz");
    redraw();
  }
});

document.querySelector("#level-up")?.addEventListener("click", event => {
  if (event.target.closest("[data-close]") || event.target === event.currentTarget) event.currentTarget.close();
});

// The installed app counts its first launch of the day (the "On your home screen" achievement).
function countLaunch() {
  if (app.installed && !todayCount("n.app")) {
    addCount(state.progress, device, "n.app", 1);
    persist();
  }
}

// A sync link (#sync/CODE) opened as the first page: keep the code in memory, not in history.
function hideCodeFromHistory() {
  const [page, id] = currentRoute();
  if (page !== "sync" || !id) return;
  state.joinCode = decodeURIComponent(id);
  history.replaceState(history.state, "", "#sync");
}

// Quests and achievements already reached when the page opens: after an update of the academy,
// a backup, or practice in the note quiz or another tab. They are shown like any other.
function claimOnArrival() {
  const found = claim(state.progress, state.quiz, heroContext(viewState()));
  if (!found.quests.length && !found.badges.length) return;
  state.storageOk = saveProgress(state.progress);
  sync.schedule();
  celebrate(undefined, found);
  if (["home", "hero"].includes(currentRoute()[0])) redraw();
}

applyTheme(savedTheme());
startApp();
sync.start();
hideCodeFromHistory();
start();
celebrate();
claimOnArrival();
countLaunch();
drawBanner();
