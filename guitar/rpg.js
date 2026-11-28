// The hero: experience, level, six skills, streaks, quests, bosses and achievements.
// Almost all of it is worked out from the records the academy already keeps (progress.js) and
// from the note quiz's record (quiz-store.js), every time it is shown. Nothing here is a running
// total that two devices could disagree about. The only things saved for the hero are the quests
// and achievements once earned (progress.quests, progress.badges), the tallies the practice tools
// add (progress.counters) and personal bests (progress.records).
import { course } from "./course.js";
import { dateKey, earn, weekKey } from "./progress.js";

// ---------------------------------------------------------------- skills

export const skills = [
  { id: "technique", name: "Technique", icon: "wave", blurb: "Tone, both hands and the no-nails strokes." },
  { id: "reading", name: "Reading", icon: "note", blurb: "Notes on the staff and where they are on the neck." },
  { id: "rhythm", name: "Rhythm", icon: "metronome", blurb: "Pulse, counting and compás." },
  { id: "ear", name: "Ear", icon: "ear", blurb: "Listening, intervals and tuning." },
  { id: "harmony", name: "Harmony", icon: "chord", blurb: "Chords, keys and accompaniment." },
  { id: "repertoire", name: "Repertoire", icon: "sheet", blurb: "Pieces, phrasing and playing them through." }
];
const skillIds = new Set(skills.map(skill => skill.id));

// Which skill a module's lessons and its assessment train.
export const moduleSkill = {
  M01: "technique", M02: "reading", M03: "technique", M04: "reading", M05: "rhythm", M06: "reading",
  M07: "harmony", M08: "repertoire", M09: "rhythm", M10: "technique", M11: "harmony", M12: "repertoire"
};
// Today's checklist: the last part of an activity key.
const activitySkill = { setup: "technique", reading: "reading", technique: "technique", music: "repertoire" };
// The note quiz: the start of a question's key.
const quizSkill = [
  [/^(?:read|find|key|sign|int|fret|play):/, "reading"],
  [/^(?:rhy|tap):/, "rhythm"],
  [/^(?:ear|listen):/, "ear"],
  [/^chord(?:st)?:/, "harmony"]
];

// What each thing is worth.
export const rewards = {
  watched: 10, practised: 25, mastered: 50, assessment: 150, day: 40,
  activity: 8, activitiesPerDay: 6,
  journal: 10, journalPerTwoMinutes: 1, journalMinutes: 120,
  quizPoint: .5
};

// ---------------------------------------------------------------- levels and titles

// Experience needed to reach a level: 100 for level 2, then each level asks 50 more than the last.
export const levelStart = level => 100 * (level - 1) + 25 * (level - 1) * (level - 2);
const skillStart = level => 60 * (level - 1) + 15 * (level - 1) * (level - 2);

function levelFrom(xp, start) {
  let level = 1;
  while (start(level + 1) <= xp) level++;
  const from = start(level), to = start(level + 1);
  return { level, xp, into: xp - from, span: to - from, toNext: to - xp };
}
export const levelOf = xp => levelFrom(xp, levelStart);

export const titles = [
  [1, "Newcomer"], [2, "Open-String Apprentice"], [4, "Keeper of the Pulse"], [6, "First-Position Reader"],
  [8, "Fretwalker"], [11, "Melody Weaver"], [14, "Two-Voice Balancer"], [17, "Arpeggio Adept"],
  [20, "Sight-Reader"], [23, "Troubadour"], [26, "Keeper of Compás"], [30, "Rasgueado Knight"],
  [34, "Tangos Wanderer"], [38, "Falseta Smith"], [42, "Seeker of Duende"], [47, "Maestro of the Six Strings"],
  [55, "Legend of the Fingertips"]
];
export const titleFor = level => titles.filter(([from]) => from <= level).at(-1)[1];
export const nextTitle = level => titles.find(([from]) => from > level) ?? null;

export const paths = {
  classical: { name: "Classical path", motto: "Tone, reading and the long line of a melody." },
  flamenco: { name: "Flamenco path", motto: "Compás, Spanish colour and the right hand’s fire." },
  both: { name: "Troubadour’s path", motto: "Both worlds: the classical score and the flamenco cycle." }
};

// ---------------------------------------------------------------- bosses
// Each module ends with an assessment. Its boss is the module's common mistake, and the
// assessment's pass criterion is how you beat it (both come from course.js).
export const bosses = {
  M01: "The Squeezing Grip", M02: "The Clenched Thumb", M03: "The String Puller", M04: "The Booming Thumb",
  M05: "The Snagging Ring Finger", M06: "The Hasty Dot", M07: "The Runaway Verse", M08: "The Eager Chorus",
  M09: "The Stalling Slap", M10: "The Snapping Strum", M11: "The Pattern Tyrant", M12: "The Endless Flurry"
};

// ---------------------------------------------------------------- reading the records

const lessonIndex = new Map(course.lessons.map(lesson => [lesson.id, lesson]));
const lessonSkill = id => moduleSkill[lessonIndex.get(id)?.module?.slice(0, 3)] ?? "technique";
const dayOf = ms => ms ? dateKey(new Date(ms)) : null;
const sum = values => values.reduce((total, value) => total + value, 0);

function quizPoints(quiz) {
  const byDate = {};
  let total = 0;
  for (const entry of Object.values(quiz?.xp ?? {})) {
    total += entry.t;
    for (const [date, points] of Object.entries(entry.d)) byDate[date] = (byDate[date] ?? 0) + points;
  }
  return { total, byDate };
}

// The note quiz's right answers, per skill: the quiz's points are shared out in this proportion.
function quizShares(quiz) {
  const right = Object.fromEntries(skills.map(skill => [skill.id, 0]));
  for (const [key, item] of Object.entries(quiz?.items ?? {})) {
    const skill = quizSkill.find(([pattern]) => pattern.test(key))?.[1] ?? "reading";
    right[skill] += item.c;
  }
  const all = sum(Object.values(right));
  return all ? Object.fromEntries(Object.entries(right).map(([id, count]) => [id, count / all])) : { reading: 1 };
}

// Every day something was practised: a ticked step, a journal entry, quiz points, a practice tool,
// a quest, or a lesson, day or assessment ticked that day.
export function practiceDates(progress, quiz) {
  const dates = new Set();
  for (const key of Object.keys(progress.activities)) dates.add(key.slice(0, 10));
  for (const entry of progress.journal) dates.add(entry.date);
  for (const date of quiz?.days ?? []) dates.add(date);
  for (const [date, points] of Object.entries(quizPoints(quiz).byDate)) if (points > 0) dates.add(date);
  for (const device of Object.values(progress.counters)) {
    for (const [date, day] of Object.entries(device.days)) if (day.xp > 0 || day.sec >= 60) dates.add(date);
  }
  for (const key of Object.keys(progress.quests)) if (/^\d{4}-\d{2}-\d{2}\//.test(key)) dates.add(key.slice(0, 10));
  for (const [path, at] of Object.entries(progress.stamps)) {
    const [kind, id, flag] = path.split("/");
    const on = kind === "lessons" ? progress.lessons[id]?.[flag] : kind === "days" || kind === "assessments" ? progress[kind][id] : false;
    if (on) dates.add(dayOf(at));
  }
  dates.delete(null);
  return dates;
}

const toDate = date => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const shift = (date, days) => {
  const day = toDate(date);
  day.setDate(day.getDate() + days);
  return dateKey(day);
};

// Days in a row with practice. One rest day in a calendar week does not break the run:
// the course itself schedules rest days. Today, until it is over, does not break it either.
export function streakOf(dates, today = dateKey()) {
  let count = 0;
  const rested = new Set();
  let day = dates.has(today) ? today : shift(today, -1);
  for (let guard = 0; guard < 5000; guard++, day = shift(day, -1)) {
    if (dates.has(day)) { count++; continue; }
    const week = weekKey(toDate(day));
    if (rested.has(week)) break;
    rested.add(week);
  }
  return count;
}

export function bestStreak(dates, today = dateKey()) {
  const sorted = [...dates].filter(date => date <= today).sort();
  let best = 0, run = 0, rested = new Set();
  for (let day = sorted[0], guard = 0; day && day <= today && guard < 20000; day = shift(day, 1), guard++) {
    if (dates.has(day)) { run++; best = Math.max(best, run); }
    else if (day === today) break;
    else if (run && !rested.has(weekKey(toDate(day)))) rested.add(weekKey(toDate(day)));
    else { run = 0; rested = new Set(); }
  }
  return best;
}

// ---------------------------------------------------------------- the ledger

// Where all the experience came from: { total, bySkill, bySource, byDate }.
export function ledger(progress, quiz) {
  const bySkill = Object.fromEntries([...skills.map(skill => [skill.id, 0]), ["general", 0]]);
  const bySource = {};
  const byDate = {};
  let total = 0;
  const add = (source, skill, xp, date) => {
    if (!(xp > 0)) return;
    total += xp;
    bySkill[skillIds.has(skill) ? skill : "general"] += xp;
    bySource[source] = (bySource[source] ?? 0) + xp;
    if (date) byDate[date] = (byDate[date] ?? 0) + xp;
  };
  for (const [id, flags] of Object.entries(progress.lessons)) {
    for (const flag of ["watched", "practised", "mastered"]) {
      if (flags[flag]) add("lessons", lessonSkill(id), rewards[flag], dayOf(progress.stamps[`lessons/${id}/${flag}`]));
    }
  }
  for (const id of Object.keys(progress.assessments)) add("bosses", moduleSkill[id], rewards.assessment, dayOf(progress.stamps["assessments/" + id]));
  for (const id of Object.keys(progress.days)) add("days", "general", rewards.day, dayOf(progress.stamps["days/" + id]));
  const perDay = {};
  for (const key of Object.keys(progress.activities).sort()) {
    const date = key.slice(0, 10);
    perDay[date] = (perDay[date] ?? 0) + 1;
    if (perDay[date] <= rewards.activitiesPerDay) add("steps", activitySkill[key.split("/").at(-1)] ?? "general", rewards.activity, date);
  }
  for (const entry of progress.journal) {
    add("journal", "general", rewards.journal + Math.floor(Math.min(entry.minutes, rewards.journalMinutes) / 2) * rewards.journalPerTwoMinutes, entry.date);
  }
  for (const device of Object.values(progress.counters)) {
    for (const [metric, value] of Object.entries(device.total)) {
      if (metric.startsWith("xp.")) {
        total += value;
        const skill = metric.slice(3);
        bySkill[skillIds.has(skill) ? skill : "general"] += value;
        bySource.tools = (bySource.tools ?? 0) + value;
      }
    }
    for (const [date, day] of Object.entries(device.days)) if (day.xp) byDate[date] = (byDate[date] ?? 0) + day.xp;
  }
  const points = quizPoints(quiz);
  if (points.total) {
    const xp = Math.round(points.total * rewards.quizPoint);
    total += xp;
    bySource.quiz = xp;
    for (const [skill, share] of Object.entries(quizShares(quiz))) bySkill[skill] += Math.round(xp * share);
    for (const [date, value] of Object.entries(points.byDate)) byDate[date] = (byDate[date] ?? 0) + Math.round(value * rewards.quizPoint);
  }
  for (const [key, at] of Object.entries(progress.quests)) add("quests", "general", questReward(key), /^\d{4}-\d{2}-\d{2}\//.test(key) ? key.slice(0, 10) : dayOf(at));
  for (const [id, at] of Object.entries(progress.badges)) add("achievements", "general", badgeIndex.get(id)?.xp ?? 0, dayOf(at));
  return { total: Math.round(total), bySkill, bySource, byDate };
}

export const sourceNames = {
  lessons: "Lessons watched, practised and mastered", bosses: "Bosses beaten (module assessments)", days: "Days of the first four weeks",
  steps: "Steps of the daily session", journal: "Journal entries", tools: "Practice tools", quiz: "Note quiz points",
  quests: "Quests", achievements: "Achievements"
};

// ---------------------------------------------------------------- what happened today

function onDate(progress, quiz, date) {
  const counters = Object.values(progress.counters).map(device => device.days[date] ?? {});
  const metric = name => sum(counters.map(day => day[name] ?? 0));
  const journal = progress.journal.filter(entry => entry.date === date);
  const practisedToday = Object.entries(progress.stamps).filter(([path, at]) => {
    const [kind, id, flag] = path.split("/");
    return kind === "lessons" && flag === "practised" && dayOf(at) === date && progress.lessons[id]?.practised;
  }).length;
  const quizToday = sum(Object.values(quiz?.xp ?? {}).map(entry => entry.d[date] ?? 0));
  const ear = Object.entries(quiz?.items ?? {}).filter(([key, item]) => /^(?:ear|listen):/.test(key) && dayOf(item.t) === date).length;
  return {
    steps: Object.keys(progress.activities).filter(key => key.startsWith(date + "/")).length,
    quiz: quizToday, journal: journal.length, ear,
    minutes: Math.max(sum(journal.map(entry => entry.minutes)), Math.floor(metric("sec") / 60)),
    metronome: Math.floor(metric("sec.metronome") / 60), tuned: metric("n.tuneup"), reading: metric("n.reading"),
    changes: metric("n.changes"), cycles: metric("n.cycles"), session: metric("n.session"), lessons: practisedToday
  };
}

// ---------------------------------------------------------------- quests

// Daily quests: the first asks for today's session; two more are drawn for the date, the same on
// every device. ctx: { module: the current module id, plan: true when today has practice steps }.
const dailyPool = [
  { id: "steps", title: "Tick three steps of today’s session", target: 3, value: t => t.steps, href: "#home", fixed: true },
  { id: "quiz", title: "Earn 50 points in the note quiz", target: 50, value: t => t.quiz, href: "note-reading/" },
  { id: "journal", title: "Log a practice session in the journal", target: 1, value: t => t.journal, href: "#journal" },
  { id: "metronome", title: "Practise five minutes with the metronome", target: 5, value: t => t.metronome, href: "#practice/metronome" },
  { id: "tuner", title: "Tune all six strings with the tuner", target: 1, value: t => t.tuned, href: "#practice/tuner" },
  { id: "reading", title: "Get ten notes right in the reading trainer", target: 10, value: t => t.reading, href: "#reading/notes" },
  { id: "lesson", title: "Mark a lesson as practised", target: 1, value: t => t.lessons, href: "#course" },
  { id: "minutes", title: "Practise for twenty minutes", target: 20, value: t => t.minutes, href: "#practice/session" },
  { id: "session", title: "Play a guided session to the end", target: 1, value: t => t.session, href: "#practice/session" },
  { id: "ear", title: "Answer three ear questions in the note quiz", target: 3, value: t => t.ear, href: "note-reading/#practice", from: "M02" },
  { id: "changes", title: "Play a one-minute chord change round", target: 1, value: t => t.changes, href: "#practice/chords", from: "M07" },
  { id: "compas", title: "Keep compás for eight cycles", target: 8, value: t => t.cycles, href: "#practice/compas", from: "M09" }
];
const dailyReward = 20, allThreeReward = 30, weeklyReward = 100, weeklyExtraReward = 60;

function seeded(text) {
  let hash = 2166136261;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return () => {
    hash = Math.imul(hash ^ hash >>> 15, 2246822507);
    hash = Math.imul(hash ^ hash >>> 13, 3266489909);
    return ((hash ^= hash >>> 16) >>> 0) / 4294967296;
  };
}

function draw(list, count, random) {
  const pool = [...list];
  const chosen = [];
  while (pool.length && chosen.length < count) chosen.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  return chosen;
}

const reached = (module, from) => !from || (module ?? "M01") >= from;

function questView(quest, key, value, earned, reward) {
  const done = Boolean(earned) || value >= quest.target;
  return { id: quest.id, key, title: quest.title, href: quest.href, target: quest.target, value: Math.min(value, quest.target), done, earned: Boolean(earned), reward };
}

export function dailyQuests(progress, quiz, ctx = {}, date = ctx.today ?? dateKey()) {
  const today = onDate(progress, quiz, date);
  const random = seeded("daily " + date);
  const first = ctx.plan === false ? dailyPool.find(quest => quest.id === "minutes") : dailyPool.find(quest => quest.fixed);
  const others = draw(dailyPool.filter(quest => quest !== first && !quest.fixed && reached(ctx.module, quest.from)), 2, random);
  const quests = [first, ...others].map(quest => questView(quest, `${date}/${quest.id}`, quest.value(today), progress.quests[`${date}/${quest.id}`], dailyReward));
  return { date, quests, bonus: { key: `${date}/all-three`, reward: allThreeReward, done: quests.every(quest => quest.done), earned: Boolean(progress.quests[`${date}/all-three`]) } };
}

const weeklyPool = [
  { id: "minutes", title: "Log ninety minutes of practice this week", target: 90 },
  { id: "lessons", title: "Practise three lessons this week", target: 3 },
  { id: "stars", title: "Earn three stars in the note quiz this week", target: 3 },
  { id: "best", title: "Set a personal best with a practice tool", target: 1 }
];

export function weeklyQuests(progress, quiz, ctx = {}, date = ctx.today ?? dateKey()) {
  const week = weekKey(toDate(date));
  const monday = shift(date, -((toDate(date).getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, offset) => shift(monday, offset));
  const inWeek = ms => ms && days.includes(dayOf(ms));
  const dates = practiceDates(progress, quiz);
  const values = {
    days: days.filter(day => dates.has(day)).length,
    minutes: sum(progress.journal.filter(entry => days.includes(entry.date)).map(entry => entry.minutes)),
    lessons: Object.entries(progress.stamps).filter(([path, at]) => /^lessons\/[LS]\d{2}\/practised$/.test(path) && inWeek(at) && progress.lessons[path.split("/")[1]]?.practised).length,
    stars: sum(Object.values(quiz?.levels ?? {}).filter(level => inWeek(level.at)).map(level => level.s)),
    best: Object.values(progress.records).filter(record => inWeek(record.at)).length
  };
  const fixed = { id: "days", title: "Practise on five days this week", target: 5 };
  const extra = draw(weeklyPool, 1, seeded("weekly " + week))[0];
  return {
    week, days,
    quests: [
      questView(fixed, `${week}/days`, values.days, progress.quests[`${week}/days`], weeklyReward),
      questView(extra, `${week}/${extra.id}`, values[extra.id], progress.quests[`${week}/${extra.id}`], weeklyExtraReward)
    ]
  };
}

function questReward(key) {
  const [when, id] = key.split("/");
  if (/^\d{4}-W\d{2}$/.test(when)) return id === "days" ? weeklyReward : weeklyExtraReward;
  if (/^M\d{2}$/.test(when)) return 0;
  return id === "all-three" ? allThreeReward : dailyReward;
}

// ---------------------------------------------------------------- chapters

const core = course.lessons.filter(lesson => lesson.kind === "Core");

export function chapters(progress) {
  const list = course.modules.map((module, index) => {
    const lessons = core.filter(lesson => lesson.module === module.id).map(lesson => ({
      id: lesson.id, title: lesson.title, language: lesson.language, ...progress.lessons[lesson.id]
    }));
    const defeated = Boolean(progress.assessments[module.id]);
    return {
      id: module.id, number: index + 1, title: module.title, weeks: module.weeks, skill: moduleSkill[module.id],
      lessons, practised: lessons.filter(lesson => lesson.practised).length,
      boss: { name: bosses[module.id], trick: module["Common error"], challenge: module.Pass, repair: module.Repair, defeated }
    };
  });
  const current = list.find(chapter => !chapter.boss.defeated) ?? null;
  for (const chapter of list) chapter.state = chapter.boss.defeated ? "done" : chapter === current ? "current" : "ahead";
  return { list, current };
}

// ---------------------------------------------------------------- achievements

const hours = progress => sum(progress.journal.map(entry => entry.minutes)) / 60;
const mastered = progress => Object.values(progress.lessons).filter(flags => flags.mastered).length;
const stars = quiz => sum(Object.values(quiz?.levels ?? {}).map(level => level.s));
const total = (progress, metric) => sum(Object.values(progress.counters).map(device => device.total[metric] ?? 0));
const tunedDays = progress => new Set(Object.values(progress.counters).flatMap(device =>
  Object.entries(device.days).filter(([, day]) => day["n.tuneup"]).map(([date]) => date))).size;
const languages = progress => new Set(Object.entries(progress.lessons).filter(([, flags]) => flags.watched).map(([id]) => lessonIndex.get(id)?.language)).size;
const bestOf = (progress, prefix) => Math.max(0, ...Object.entries(progress.records).filter(([id]) => id.startsWith(prefix)).map(([, record]) => record.v));
const devices = (progress, quiz) => new Set([...Object.keys(progress.counters), ...Object.keys(quiz?.xp ?? {})]).size;

// Each: [id, group, name, what to do, experience, test(facts) -> [value, target]]
const badgeList = [
  ["first-steps", "Journey", "First steps", "Complete Day 1.", 25, f => [f.days(1) ? 1 : 0, 1]],
  ["week-one", "Journey", "Week one", "Complete Days 1 to 7.", 50, f => [f.daysUpTo(7), 7]],
  ["four-weeks", "Journey", "Twenty-eight days", "Complete all of the first 28 days.", 150, f => [f.daysUpTo(28), 28]],
  ["first-boss", "Journey", "First victory", "Beat your first boss: pass a module assessment.", 50, f => [Math.min(1, f.bosses), 1]],
  ["half-way", "Journey", "Halfway there", "Beat six bosses.", 100, f => [Math.min(6, f.bosses), 6]],
  ["graduate", "Journey", "Graduate", "Beat all twelve bosses.", 300, f => [f.bosses, 12]],
  ["streak-3", "Habit", "Three in a row", "Practise three days in a row.", 25, f => [Math.min(3, f.best), 3]],
  ["streak-7", "Habit", "A full week", "Keep a seven-day streak.", 50, f => [Math.min(7, f.best), 7]],
  ["streak-30", "Habit", "A month of music", "Keep a thirty-day streak.", 150, f => [Math.min(30, f.best), 30]],
  ["streak-100", "Habit", "One hundred days", "Keep a hundred-day streak.", 400, f => [Math.min(100, f.best), 100]],
  ["journal-10", "Habit", "Keeper of the journal", "Log ten practice sessions.", 50, f => [Math.min(10, f.entries), 10]],
  ["hours-5", "Habit", "Five hours", "Log five hours of practice in the journal.", 50, f => [Math.min(5, Math.floor(f.hours)), 5]],
  ["hours-25", "Habit", "Twenty-five hours", "Log twenty-five hours of practice.", 150, f => [Math.min(25, Math.floor(f.hours)), 25]],
  ["hours-100", "Habit", "A hundred hours", "Log a hundred hours of practice.", 400, f => [Math.min(100, Math.floor(f.hours)), 100]],
  ["master-1", "Skill", "First mastery", "Mark a lesson’s skill as mastered.", 25, f => [Math.min(1, f.mastered), 1]],
  ["master-10", "Skill", "Ten skills", "Master ten lessons.", 100, f => [Math.min(10, f.mastered), 10]],
  ["quiz-stars", "Skill", "Star reader", "Collect twelve stars in the note quiz.", 50, f => [Math.min(12, f.stars), 12]],
  ["quiz-exam", "Skill", "Twelfth fret", "Pass the note quiz’s final exam.", 100, f => [f.exam ? 1 : 0, 1]],
  ["quiz-all", "Skill", "Every star", "Collect all 54 stars in the note quiz.", 300, f => [Math.min(54, f.stars), 54]],
  ["polyglot", "Skill", "Three languages", "Watch lessons in English, Ukrainian and Russian.", 50, f => [Math.min(3, f.languages), 3]],
  ["steady-clock", "Tools", "Steady as a clock", "Play for an hour with the metronome.", 50, f => [Math.min(60, Math.floor(f.metronome / 60)), 60]],
  ["speed-goal", "Tools", "Up to speed", "Reach your target tempo in the speed trainer.", 50, f => [Math.min(1, f.speedGoals), 1]],
  ["in-tune", "Tools", "Always in tune", "Tune all six strings on seven different days.", 50, f => [Math.min(7, f.tuned), 7]],
  ["quick-hands", "Tools", "Quick hands", "Make thirty chord changes in one minute.", 75, f => [Math.min(30, f.changes), 30]],
  ["en-compas", "Tools", "En compás", "Score 90% or more in a compás tap round.", 75, f => [Math.min(90, f.compas), 90]],
  ["two-devices", "Tools", "Everywhere you play", "Practise on two devices with sync on.", 25, f => [Math.min(2, f.devices), 2]],
  ["home-screen", "Tools", "On your home screen", "Open the academy as an installed app.", 25, f => [Math.min(1, f.app), 1]]
];
export const badges = badgeList.map(([id, group, name, how, xp, test]) => ({ id, group, name, how, xp, test }));
const badgeIndex = new Map(badges.map(badge => [badge.id, badge]));

function facts(progress, quiz, best) {
  return {
    days: id => Boolean(progress.days[id]),
    daysUpTo: last => Array.from({ length: last }, (_, i) => i + 1).filter(id => progress.days[id]).length,
    bosses: Object.keys(progress.assessments).length,
    best, entries: progress.journal.length, hours: hours(progress), mastered: mastered(progress), stars: stars(quiz),
    exam: (quiz?.levels?.exam?.s ?? 0) >= 1, languages: languages(progress),
    metronome: total(progress, "sec.metronome"), speedGoals: total(progress, "n.speedgoal"), tuned: tunedDays(progress),
    changes: bestOf(progress, "changes."), compas: bestOf(progress, "compas."), devices: devices(progress, quiz),
    app: total(progress, "n.app")
  };
}

// ---------------------------------------------------------------- the whole picture

export function hero(progress, quiz, ctx = {}) {
  const today = ctx.today ?? dateKey();
  const dates = practiceDates(progress, quiz);
  const best = Math.max(bestStreak(dates, today), streakOf(dates, today));
  const book = ledger(progress, quiz);
  const level = levelOf(book.total);
  const f = facts(progress, quiz, best);
  return {
    ...level, total: book.total, title: titleFor(level.level), next: nextTitle(level.level),
    name: progress.profile.name, path: progress.profile.path,
    skills: skills.map(skill => ({ ...skill, ...levelFrom(Math.round(book.bySkill[skill.id]), skillStart) })),
    general: Math.round(book.bySkill.general), sources: book.bySource, today: book.byDate[today] ?? 0, byDate: book.byDate,
    streak: streakOf(dates, today), best, dates,
    daily: dailyQuests(progress, quiz, ctx, today), weekly: weeklyQuests(progress, quiz, ctx, today),
    chapters: chapters(progress),
    badges: badges.map(badge => {
      const [value, target] = badge.test(f);
      return { ...badge, value, target, earned: progress.badges[badge.id] ?? null };
    })
  };
}

// Records the quests and achievements reached since last time. Returns what was new, so the
// screen can say so: { quests: [quest], badges: [badge] }.
export function claim(progress, quiz, ctx = {}) {
  const today = ctx.today ?? dateKey();
  const found = { quests: [], badges: [] };
  // Yesterday too: points earned late in the note quiz are claimed when the academy next opens.
  for (const date of [shift(today, -1), today]) {
    const daily = dailyQuests(progress, quiz, ctx, date);
    for (const quest of daily.quests) if (quest.done && earn(progress, "quests", quest.key)) found.quests.push(quest);
    if (daily.quests.every(quest => quest.done) && earn(progress, "quests", daily.bonus.key)) {
      found.quests.push({ id: "all-three", key: daily.bonus.key, title: "All three daily quests", reward: allThreeReward, done: true });
    }
  }
  for (const quest of weeklyQuests(progress, quiz, ctx, today).quests) {
    if (quest.done && earn(progress, "quests", quest.key)) found.quests.push(quest);
  }
  const dates = practiceDates(progress, quiz);
  const f = facts(progress, quiz, Math.max(bestStreak(dates, today), streakOf(dates, today)));
  for (const badge of badges) {
    const [value, target] = badge.test(f);
    if (value >= target && earn(progress, "badges", badge.id)) found.badges.push(badge);
  }
  return found;
}
