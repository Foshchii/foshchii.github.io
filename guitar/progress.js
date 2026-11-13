const storageKey = "guitar-academy.progress";
const lessonId = /^[LS]\d{2}$/;
const moduleId = /^M\d{2}$/;
const dayId = /^(?:[1-9]|1\d|2[0-8])$/;
const activityId = /^\d{4}-\d{2}-\d{2}\/(?:day-\d{1,2}|M\d{2})\/(?:10|25)\/[a-z]+$/;
const entryId = /^[a-z0-9-]{8,64}$/i;
const statuses = ["watched", "practised", "mastered"];

export function emptyProgress() {
  return { version: 1, lessons: {}, assessments: {}, days: {}, activities: {}, journal: [], lastLesson: null, minutes: 25 };
}

export function dateKey(date = new Date()) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(n => String(n).padStart(2, "0")).join("-");
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
  result.journal = [...entries.values()];
  result.lastLesson = lessonId.test(raw.lastLesson) ? raw.lastLesson : null;
  result.minutes = raw.minutes === 10 ? 10 : 25;
  return result;
}

export function mergeProgress(current, incoming) {
  const journal = new Map(current.journal.map(entry => [entry.id, entry]));
  for (const entry of incoming.journal) {
    if (!journal.has(entry.id) || journal.get(entry.id).updatedAt < entry.updatedAt) journal.set(entry.id, entry);
  }
  const lessons = { ...current.lessons };
  for (const [id, flags] of Object.entries(incoming.lessons)) lessons[id] = { ...lessons[id], ...flags };
  return {
    ...current,
    lessons,
    assessments: { ...current.assessments, ...incoming.assessments },
    days: { ...current.days, ...incoming.days },
    activities: { ...current.activities, ...incoming.activities },
    journal: [...journal.values()],
    lastLesson: current.lastLesson ?? incoming.lastLesson
  };
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
