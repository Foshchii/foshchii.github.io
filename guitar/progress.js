// The learner's record: what they ticked, the journal, and the things the hero screen counts.
// It lives in localStorage, travels in JSON backups and, when sync is on, between devices
// (sync.js). Every change carries the time it was made, so two devices that changed the same
// thing can agree on which change came last: an unticked box stays unticked and a deleted
// journal entry stays deleted when the other device still has them.
const storageKey = "guitar-academy.progress";
const deviceKey = "guitar-note-reading-device";   // shared with the note quiz: one id per browser
const lessonId = /^[LS]\d{2}$/;
const moduleId = /^M\d{2}$/;
// Days 1–28 are the first four weeks; 29–168 are the module plans that follow (plans.js).
const dayId = /^(?:[1-9]\d?|1[0-5]\d|16[0-8])$/;
const activityId = /^\d{4}-\d{2}-\d{2}\/(?:day-\d{1,3}|M\d{2})\/(?:10|25)\/[a-z]+$/;
const entryId = /^[a-z0-9-]{8,64}$/i;
const deviceId = /^[a-z0-9]{4,24}$/;
const metricId = /^[a-z]+\.[a-z0-9-]{1,30}$/;
const recordId = /^[a-z]+(?:\.[A-Za-z0-9#-]{1,24}){1,3}$/;
const questKey = /^(?:\d{4}-\d{2}-\d{2}|\d{4}-W\d{2}|M\d{2})\/[a-z0-9-]{2,40}$/;
const badgeId = /^[a-z0-9-]{2,40}$/;
const paths = ["", "classical", "flamenco", "both"];
const statuses = ["watched", "practised", "mastered"];
const keepDays = 400;     // days of per-device history kept for streaks and charts
const keepDevices = 24;

export function emptyProgress() {
  return {
    version: 1, lessons: {}, assessments: {}, days: {}, activities: {}, journal: [], lastLesson: null, minutes: 25,
    stamps: {}, removed: {}, profile: { name: "", path: "", at: 0 }, counters: {}, records: {}, quests: {}, badges: {}
  };
}

export function dateKey(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, "0")).join("-");
}

// "2026-W48": the ISO week a date belongs to (weeks start on Monday).
export function weekKey(date = new Date()) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const week = Math.ceil(((day - Date.UTC(day.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function validDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

function isMap(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function asMap(value) {
  return isMap(value) ? value : {};
}

function text(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

const time = value => Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
const amount = value => Number.isFinite(value) && value > 0 ? Math.min(value, 1e9) : 0;

// What a stamp may be attached to: one tick box, or one of the two remembered choices.
function stampable(path) {
  const [kind, id, flag, ...rest] = path.split("/");
  if (kind === "lessons") return lessonId.test(id) && statuses.includes(flag) && !rest.length;
  if (kind === "assessments") return moduleId.test(id) && flag === undefined;
  if (kind === "days") return dayId.test(id) && flag === undefined;
  if (kind === "activities") return activityId.test(path.slice(11));
  return path === "lastLesson" || path === "minutes";
}

// A device's tallies: totals for good, and per day for the last keepDays days. The last
// detailDays of those days keep every metric (for today's quests); older days keep the sums.
const detailDays = 21;
function trimDays(days) {
  const dates = Object.keys(days).sort();
  for (const old of dates.slice(0, Math.max(0, dates.length - keepDays))) delete days[old];
  for (const old of dates.slice(Math.max(0, dates.length - keepDays), Math.max(0, dates.length - detailDays))) {
    const { xp, sec } = days[old];
    days[old] = Object.fromEntries(Object.entries({ xp, sec }).filter(([, value]) => value));
  }
  return days;
}

function readCounters(raw) {
  const devices = Object.entries(asMap(raw)).filter(([id, entry]) => deviceId.test(id) && isMap(entry))
    .sort((a, b) => time(b[1].at) - time(a[1].at)).slice(0, keepDevices);
  const result = {};
  for (const [id, entry] of devices) {
    const total = {};
    for (const [metric, value] of Object.entries(asMap(entry.total))) if (metricId.test(metric) && amount(value)) total[metric] = amount(value);
    const days = {};
    for (const date of Object.keys(asMap(entry.days)).filter(validDate)) {
      const kept = {};
      for (const [metric, value] of Object.entries(asMap(entry.days[date]))) {
        if ((metric === "xp" || metric === "sec" || metricId.test(metric)) && amount(value)) kept[metric] = amount(value);
      }
      if (Object.keys(kept).length) days[date] = kept;
    }
    result[id] = { at: time(entry.at), total, days: trimDays(days) };
  }
  return result;
}

export function readProgress(raw) {
  if (!raw || typeof raw !== "object" || raw.version !== 1 ||
      !Array.isArray(raw.journal) || !isMap(raw.lessons) || !isMap(raw.assessments) || !isMap(raw.days)) {
    throw new Error("Choose a Guitar Academy JSON backup from version 1.");
  }
  const result = emptyProgress();
  for (const [id, flags] of Object.entries(asMap(raw.lessons))) {
    if (!lessonId.test(id)) continue;
    result.lessons[id] = Object.fromEntries(statuses.filter(key => flags?.[key] === true).map(key => [key, true]));
  }
  for (const [field, pattern] of [["assessments", moduleId], ["days", dayId], ["activities", activityId]]) {
    result[field] = Object.fromEntries(Object.entries(asMap(raw[field])).filter(([id, checked]) => pattern.test(id) && checked === true));
  }
  const entries = new Map();
  for (const entry of raw.journal) {
    if (!entry || typeof entry.id !== "string" || !entryId.test(entry.id) || !validDate(entry.date) ||
        !Number.isInteger(entry.minutes) || entry.minutes < 1 || entry.minutes > 600) continue;
    const fields = Object.fromEntries(["exercises", "piece", "difficulty", "notes", "skills"].map(key => [key, text(entry[key], 2000)]));
    entries.set(entry.id, { id: entry.id, date: entry.date, minutes: entry.minutes,
      updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0, ...fields });
  }
  // One order for every device, so that comparing two copies finds no difference that is not real.
  result.journal = [...entries.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  result.lastLesson = lessonId.test(raw.lastLesson) ? raw.lastLesson : null;
  result.minutes = raw.minutes === 10 ? 10 : 25;
  for (const [path, at] of Object.entries(asMap(raw.stamps))) if (time(at) && stampable(path)) result.stamps[path] = time(at);
  for (const [id, at] of Object.entries(asMap(raw.removed))) if (entryId.test(id) && time(at)) result.removed[id] = time(at);
  const profile = asMap(raw.profile);
  result.profile = { name: text(profile.name, 40), path: paths.includes(profile.path) ? profile.path : "", at: time(profile.at) };
  result.counters = readCounters(raw.counters);
  for (const [id, entry] of Object.entries(asMap(raw.records))) {
    if (recordId.test(id) && isMap(entry) && Number.isFinite(entry.v) && entry.v > 0) result.records[id] = { v: Math.min(entry.v, 1e6), at: time(entry.at) };
  }
  for (const [field, pattern] of [["quests", questKey], ["badges", badgeId]]) {
    for (const [key, at] of Object.entries(asMap(raw[field]))) if (pattern.test(key) && time(at)) result[field][key] = time(at);
  }
  // A journal entry deleted on another device: drop it here too.
  result.journal = result.journal.filter(entry => !(result.removed[entry.id] >= entry.updatedAt));
  return result;
}

// ---------------------------------------------------------------- merging two records

// The value of one tick box after a merge: whichever side changed it last wins. Records from before
// changes were timed have no stamp on either side; then a tick on either side counts.
function mergeFlags(mine, theirs, myStamps, theirStamps, pathOf) {
  const result = {};
  for (const key of new Set([...Object.keys(mine), ...Object.keys(theirs)])) {
    const path = pathOf(key);
    const a = myStamps[path] ?? 0, b = theirStamps[path] ?? 0;
    if (a === b ? mine[key] || theirs[key] : a > b ? mine[key] : theirs[key]) result[key] = true;
  }
  return result;
}

const latest = (a, b) => (b ?? 0) > (a ?? 0) ? b : a;
const earliest = (a, b) => a && b ? Math.min(a, b) : a || b;

export function mergeProgress(current, incoming) {
  const stamps = { ...current.stamps };
  for (const [path, at] of Object.entries(incoming.stamps)) stamps[path] = latest(stamps[path], at);

  const lessons = {};
  for (const id of new Set([...Object.keys(current.lessons), ...Object.keys(incoming.lessons)])) {
    lessons[id] = mergeFlags(current.lessons[id] ?? {}, incoming.lessons[id] ?? {}, current.stamps, incoming.stamps,
      flag => `lessons/${id}/${flag}`);
  }

  const removed = { ...current.removed };
  for (const [id, at] of Object.entries(incoming.removed)) removed[id] = latest(removed[id], at);
  const journal = new Map(current.journal.map(entry => [entry.id, entry]));
  for (const entry of incoming.journal) {
    if (!journal.has(entry.id) || journal.get(entry.id).updatedAt < entry.updatedAt) journal.set(entry.id, entry);
  }
  for (const [id, entry] of journal) if (removed[id] >= entry.updatedAt) journal.delete(id);

  const pick = (path, mine, theirs, fallback) => {
    const a = current.stamps[path] ?? 0, b = incoming.stamps[path] ?? 0;
    return a === b ? fallback : a > b ? mine : theirs;
  };

  const counters = { ...current.counters };
  for (const [id, entry] of Object.entries(incoming.counters)) {
    const own = counters[id];
    if (!own || entry.at > own.at) counters[id] = entry;
  }
  const records = { ...current.records };
  for (const [id, entry] of Object.entries(incoming.records)) {
    if (!records[id] || entry.v > records[id].v) records[id] = entry;
  }
  const union = field => {
    const result = { ...current[field] };
    for (const [key, at] of Object.entries(incoming[field])) result[key] = earliest(result[key], at);
    return result;
  };

  return {
    ...current,
    lessons,
    assessments: mergeFlags(current.assessments, incoming.assessments, current.stamps, incoming.stamps, id => "assessments/" + id),
    days: mergeFlags(current.days, incoming.days, current.stamps, incoming.stamps, id => "days/" + id),
    activities: mergeFlags(current.activities, incoming.activities, current.stamps, incoming.stamps, key => "activities/" + key),
    journal: [...journal.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    lastLesson: pick("lastLesson", current.lastLesson, incoming.lastLesson, current.lastLesson ?? incoming.lastLesson),
    minutes: pick("minutes", current.minutes, incoming.minutes, current.minutes),
    stamps,
    removed,
    profile: incoming.profile.at > current.profile.at ? incoming.profile : current.profile,
    counters,
    records,
    quests: union("quests"),
    badges: union("badges")
  };
}

// ---------------------------------------------------------------- changing the record

// Tick or untick one box: "lessons/L04/practised", "assessments/M02", "days/7" or
// "activities/2026-11-27/day-3/25/reading". The time goes with it (see mergeFlags).
export function setMark(progress, path, on, at = Date.now()) {
  const [kind, id, flag] = path.split("/");
  if (kind === "lessons") {
    const flags = progress.lessons[id] ??= {};
    if (on) flags[flag] = true;
    else delete flags[flag];
  } else {
    const key = kind === "activities" ? path.slice(11) : id;
    if (on) progress[kind][key] = true;
    else delete progress[kind][key];
  }
  progress.stamps[path] = at;
}

// Remember a choice that is not a tick box ("lastLesson", "minutes").
export function setChoice(progress, field, value, at = Date.now()) {
  progress[field] = value;
  progress.stamps[field] = at;
}

export function removeEntry(progress, id, at = Date.now()) {
  progress.journal = progress.journal.filter(entry => entry.id !== id);
  progress.removed[id] = at;
}

// Add to this device's own tallies. metric: "xp.reading", "sec.metronome"… Each device only ever
// writes its own entry, so adding them up never counts the same practice twice.
export function addCount(progress, device, metric, value, date = dateKey()) {
  if (!metricId.test(metric) || !deviceId.test(device) || !(value > 0)) return;
  const entry = progress.counters[device] ??= { at: 0, total: {}, days: {} };
  entry.total[metric] = (entry.total[metric] ?? 0) + value;
  const day = entry.days[date] ??= {};
  day[metric] = (day[metric] ?? 0) + value;
  const kind = metric.startsWith("xp.") ? "xp" : metric.startsWith("sec.") ? "sec" : null;
  if (kind) day[kind] = (day[kind] ?? 0) + value;
  trimDays(entry.days);
  entry.at = Math.max(Date.now(), entry.at + 1);
}

// A personal best. Returns true when value beats the one saved.
export function setRecord(progress, id, value) {
  if (!recordId.test(id) || !(value > (progress.records[id]?.v ?? 0))) return false;
  progress.records[id] = { v: Math.round(value * 10) / 10, at: Date.now() };
  return true;
}

// Quests and badges are earned once and kept. Returns true the first time.
export function earn(progress, field, key) {
  const pattern = field === "quests" ? questKey : badgeId;
  if (!pattern.test(key) || progress[field][key]) return false;
  progress[field][key] = Date.now();
  return true;
}

export function setProfile(progress, changes) {
  const name = changes.name === undefined ? progress.profile.name : text(changes.name, 40);
  const path = changes.path === undefined ? progress.profile.path : paths.includes(changes.path) ? changes.path : "";
  progress.profile = { name, path, at: Date.now() };
}

// ---------------------------------------------------------------- this browser

// The id this browser writes its tallies under. The note quiz uses the same id for its points.
export function deviceName(storage = globalThis.localStorage) {
  let id;
  try { id = storage?.getItem(deviceKey); } catch { /* storage unavailable */ }
  if (id && deviceId.test(id)) return id;
  id = "d" + Math.random().toString(36).slice(2, 11).padEnd(9, "0");
  try { storage?.setItem(deviceKey, id); } catch { /* the id lasts until the page closes */ }
  return id;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? readProgress(JSON.parse(raw)) : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(progress) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export const progressKey = storageKey;
