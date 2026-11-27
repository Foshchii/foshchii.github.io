// The note quiz's record (note-reading/index.html keeps it under guitar-note-reading-v1), read and
// merged here so that sync and the hero screen can use it while the quiz itself is not open.
// blankQuiz, sanitizeQuiz and mergeQuiz follow blankStore, sanitizeStore and Store.merge in the
// quiz page line for line; check_guitar.mjs runs both on the same records and reports a difference.
// When you change the quiz's store, change this file the same way.
export const quizKey = "guitar-note-reading-v1";

const DEFAULT_SETTINGS = { names: "letters", sound: true, autoNext: true, listen: false, speaker: false, melNames: false, tapCounts: true, tapSpeed: "medium" };
const DEFAULT_PRACTICE = {
  notes: { strings: [1, 2, 3, 4, 5, 6], maxFret: 3, accidentals: false },
  rhythm: { rests: true, dotted: false },
  keys: { max: 2 },
  melody: { range: "treble", key: "C", rhythm: 1 },
  tap: { level: 1 },
  earint: { set: 1 },
};
const SRS_GAPS = [0, 72000000, 259200000, 604800000, 1382400000, 3024000000, 6480000000, 13824000000];
const clone = value => JSON.parse(JSON.stringify(value));

function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function blankQuiz() {
  return { v: 2, items: {}, days: [], lessons: {}, rounds: {}, levels: {}, best: {}, tunes: {}, xp: {}, runs: {}, settings: clone(DEFAULT_SETTINGS), practice: clone(DEFAULT_PRACTICE), settingsAt: 0, updated: 0, resetAt: 0 };
}

export function sanitizeQuiz(d) {
  const b = blankQuiz();
  if (!d || typeof d !== "object") return b;
  const obj = x => x && typeof x === "object";
  if (obj(d.items)) Object.keys(d.items).forEach(k => {
    const r = d.items[k];
    if (!obj(r) || k.length > 40) return;
    const it = { n: Math.max(0, +r.n || 0), c: Math.max(0, +r.c || 0), h: String(r.h || "").replace(/[^01]/g, "").slice(-12), t: +r.t || 0 };
    if (typeof r.b === "number") { it.b = Math.max(0, Math.min(7, Math.round(r.b))); it.d = +r.d || 0; }
    else {
      const m = /1*$/.exec(it.h)[0].length;
      it.b = Math.min(4, m);
      it.d = it.t + SRS_GAPS[it.b];
    }
    b.items[k] = it;
  });
  if (obj(d.runs)) Object.keys(d.runs).forEach(k => {
    const r = d.runs[k];
    if (!obj(r) || !/^[a-z]{2,20}$/.test(k)) return;
    const keys = a => Array.isArray(a) ? a.filter(x => typeof x === "string" && x.length <= 40).slice(0, 120) : [];
    b.runs[k] = { done: keys(r.done), miss: keys(r.miss), right: Math.max(0, +r.right || 0), total: Math.max(0, +r.total || 0), at: +r.at || 0 };
  });
  if (Array.isArray(d.days)) b.days = d.days.filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x)).slice(-400);
  if (obj(d.lessons)) Object.keys(d.lessons).forEach(k => { if (d.lessons[k]) b.lessons[k] = +d.lessons[k] || 1; });
  if (obj(d.rounds)) Object.keys(d.rounds).forEach(k => { const r = d.rounds[k]; if (obj(r)) b.rounds[k] = { score: +r.score || 0, total: +r.total || 0, at: +r.at || 0 }; });
  if (obj(d.levels)) Object.keys(d.levels).forEach(k => {
    const r = d.levels[k];
    if (!obj(r) || !/^[a-z]{2,20}$/.test(k)) return;
    b.levels[k] = { s: Math.max(0, Math.min(3, Math.round(+r.s || 0))), p: Math.max(0, Math.min(100, +r.p || 0)), at: +r.at || 0 };
  });
  if (obj(d.best)) Object.keys(d.best).forEach(k => { const r = d.best[k]; if (obj(r) && /^[a-z]{2,12}$/.test(k)) b.best[k] = { score: Math.max(0, +r.score || 0), at: +r.at || 0 }; });
  if (obj(d.tunes)) Object.keys(d.tunes).forEach(k => { const r = d.tunes[k]; if (obj(r) && /^[a-z]{2,16}$/.test(k)) b.tunes[k] = { p: Math.max(0, Math.min(100, +r.p || 0)), at: +r.at || 0 }; });
  if (obj(d.xp)) Object.keys(d.xp).forEach(dev => {
    const e = d.xp[dev];
    if (!obj(e) || !/^[a-z0-9]{4,24}$/.test(dev)) return;
    const days = {};
    if (obj(e.d)) Object.keys(e.d).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort().slice(-60).forEach(k => { days[k] = Math.max(0, +e.d[k] || 0); });
    b.xp[dev] = { t: Math.max(0, +e.t || 0), d: days, at: +e.at || 0 };
  });
  if (obj(d.settings)) {
    if (["letters", "solfege", "both"].indexOf(d.settings.names) >= 0) b.settings.names = d.settings.names;
    if (typeof d.settings.sound === "boolean") b.settings.sound = d.settings.sound;
    if (typeof d.settings.autoNext === "boolean") b.settings.autoNext = d.settings.autoNext;
    if (typeof d.settings.listen === "boolean") b.settings.listen = d.settings.listen;
    if (typeof d.settings.speaker === "boolean") b.settings.speaker = d.settings.speaker;
    if (typeof d.settings.melNames === "boolean") b.settings.melNames = d.settings.melNames;
    if (typeof d.settings.tapCounts === "boolean") b.settings.tapCounts = d.settings.tapCounts;
    if (["slow", "medium", "fast"].indexOf(d.settings.tapSpeed) >= 0) b.settings.tapSpeed = d.settings.tapSpeed;
  }
  if (obj(d.practice)) {
    const n = d.practice.notes;
    if (n && Array.isArray(n.strings)) {
      const s = n.strings.filter(x => [1, 2, 3, 4, 5, 6].indexOf(x) >= 0);
      if (s.length) b.practice.notes.strings = s.sort();
      if ([0, 3, 5, 7, 12].indexOf(n.maxFret) >= 0) b.practice.notes.maxFret = n.maxFret;
      b.practice.notes.accidentals = !!n.accidentals;
    }
    const r = d.practice.rhythm;
    if (r) { b.practice.rhythm.rests = !!r.rests; b.practice.rhythm.dotted = !!r.dotted; }
    const k = d.practice.keys;
    if (k && [1, 2, 3, 4].indexOf(k.max) >= 0) b.practice.keys.max = k.max;
    const ml = d.practice.melody;
    if (ml) {
      if (["treble", "bass", "all", "high"].indexOf(ml.range) >= 0) b.practice.melody.range = ml.range;
      if (["C", "G", "F", "D"].indexOf(ml.key) >= 0) b.practice.melody.key = ml.key;
      if ([1, 2, 3].indexOf(ml.rhythm) >= 0) b.practice.melody.rhythm = ml.rhythm;
    }
    const tp = d.practice.tap;
    if (tp && [1, 2, 3, 4, 5].indexOf(tp.level) >= 0) b.practice.tap.level = tp.level;
    const ei = d.practice.earint;
    if (ei && [1, 2, 3].indexOf(ei.set) >= 0) b.practice.earint.set = ei.set;
  }
  b.settingsAt = +d.settingsAt || 0;
  b.updated = +d.updated || 0;
  b.resetAt = +d.resetAt || 0;
  return b;
}

// Store.merge, as a function of the record held here (data, changed in place), the record from
// elsewhere and this browser's device id. Returns true when data changed.
export function mergeQuiz(data, remote, device) {
  const r = sanitizeQuiz(remote);
  let changed = false;
  if (r.resetAt > (data.resetAt || 0)) {
    /* progress was reset on another device: drop what this device learned before that */
    const cut = r.resetAt, cutDay = todayStr(new Date(cut));
    Object.keys(data.items).forEach(k => { if (data.items[k].t <= cut) delete data.items[k]; });
    Object.keys(data.lessons).forEach(k => { if (data.lessons[k] <= cut) delete data.lessons[k]; });
    Object.keys(data.rounds).forEach(k => { if (data.rounds[k].at <= cut) delete data.rounds[k]; });
    Object.keys(data.levels).forEach(k => { if (data.levels[k].at <= cut) delete data.levels[k]; });
    Object.keys(data.best).forEach(k => { if (data.best[k].at <= cut) delete data.best[k]; });
    Object.keys(data.tunes).forEach(k => { if (data.tunes[k].at <= cut) delete data.tunes[k]; });
    Object.keys(data.xp).forEach(k => { if (data.xp[k].at <= cut) delete data.xp[k]; });
    data.days = data.days.filter(x => x >= cutDay);
    data.resetAt = cut;
    changed = true;
  }
  Object.keys(r.items).forEach(k => { const a = data.items[k], b = r.items[k]; if (!a || b.t > a.t) { data.items[k] = b; changed = true; } });
  const days = Array.from(new Set(data.days.concat(r.days))).sort().slice(-400);
  if (days.length !== data.days.length) { data.days = days; changed = true; }
  Object.keys(r.lessons).forEach(k => { if (!data.lessons[k]) { data.lessons[k] = r.lessons[k]; changed = true; } });
  Object.keys(r.rounds).forEach(k => { if (!data.rounds[k] || r.rounds[k].at > data.rounds[k].at) { data.rounds[k] = r.rounds[k]; changed = true; } });
  Object.keys(r.levels).forEach(k => {
    const a = data.levels[k], b = r.levels[k];
    if (!a) { data.levels[k] = b; changed = true; }
    else if (b.s > a.s || b.p > a.p) { data.levels[k] = { s: Math.max(a.s, b.s), p: Math.max(a.p, b.p), at: Math.max(a.at, b.at) }; changed = true; }
  });
  Object.keys(r.best).forEach(k => { const a = data.best[k], b = r.best[k]; if (!a || b.score > a.score) { data.best[k] = b; changed = true; } });
  Object.keys(r.tunes).forEach(k => { const a = data.tunes[k], b = r.tunes[k]; if (!a || b.p > a.p) { data.tunes[k] = b; changed = true; } });
  Object.keys(r.runs).forEach(k => { const a = data.runs[k], b = r.runs[k]; if (!a || b.at > a.at) { data.runs[k] = b; changed = true; } });
  Object.keys(r.xp).forEach(k => {
    if (k === device && data.xp[k]) return; /* this device is the only writer of its own counter */
    const a = data.xp[k], b = r.xp[k];
    if (!a || b.t > a.t || (b.t === a.t && b.at > a.at)) { data.xp[k] = b; changed = true; }
  });
  if (r.settingsAt > data.settingsAt) { data.settings = r.settings; data.practice = r.practice; data.settingsAt = r.settingsAt; changed = true; }
  return changed;
}

// What the quiz sends to the cloud (Cloud.body in the quiz page).
export function quizBody(d) {
  return { v: 2, items: d.items, days: d.days, lessons: d.lessons, rounds: d.rounds, levels: d.levels, best: d.best, tunes: d.tunes, xp: d.xp, runs: d.runs, settings: d.settings, practice: d.practice, settingsAt: d.settingsAt, updated: d.updated, resetAt: d.resetAt || 0 };
}

export function loadQuiz(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(quizKey);
    return raw ? sanitizeQuiz(JSON.parse(raw)) : blankQuiz();
  } catch {
    return blankQuiz();
  }
}

export function saveQuiz(data, storage = globalThis.localStorage) {
  try {
    storage?.setItem(quizKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}
