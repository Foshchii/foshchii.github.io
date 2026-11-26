#!/usr/bin/env node
/* Tests for the booking backend, booking-api/google-apps-script.gs. Node only,
 * no dependencies:
 *
 *     node .github/scripts/test_backend.js
 *
 * The script runs on Google Apps Script, so there is nothing to call here.
 * These tests load it as it is, give it fake Calendar, iCloud feed, cache,
 * lock and mail services, freeze the clock at Thursday 26 November 2026,
 * 10:00 in Copenhagen, and check what it books, refuses and offers.
 *
 * Runs in check.yml for every pull request, and in booking-deploy.yml before
 * every deploy, so a change that breaks booking never reaches the live
 * backend. Add a case here when you change what the backend accepts.       */

"use strict";
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// Apps Script reads local times in the script's time zone; so must Node.
if (process.env.TZ !== "Europe/Copenhagen") {
  const r = spawnSync(process.execPath, [__filename], { stdio: "inherit", env: { ...process.env, TZ: "Europe/Copenhagen" } });
  process.exit(r.status === null ? 1 : r.status);
}

const SCRIPT = path.join(__dirname, "..", "..", "booking-api", "google-apps-script.gs");
const NOW = Date.parse("2026-11-26T09:00:00Z");
const at = (y, mo, d, h, mi) => new Date(y, mo - 1, d, h, mi || 0);      // Copenhagen time

// An iCloud-only event: Monday 30 November, 13:00–14:00. And one every Tuesday 11:00–12:00.
const ICS = [
  "BEGIN:VCALENDAR",
  "BEGIN:VEVENT", "DTSTART;TZID=Europe/Copenhagen:20261130T130000", "DTEND;TZID=Europe/Copenhagen:20261130T140000", "SUMMARY:iCloud only", "END:VEVENT",
  "BEGIN:VEVENT", "DTSTART;TZID=Europe/Copenhagen:20261103T110000", "DTEND;TZID=Europe/Copenhagen:20261103T120000", "RRULE:FREQ=WEEKLY;BYDAY=TU", "SUMMARY:Weekly", "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

/* A fresh backend with fake services. opts.events: Google events as
 * [start, end]; opts.feed: "up" | "down"; opts.lockBusy; opts.cache: a shared
 * cache Map, to carry it from one backend to the next.                    */
function backend(opts = {}) {
  class FakeDate extends Date {
    constructor(...a) { if (a.length === 0) super(NOW); else super(...a); }
    static now() { return NOW; }
  }
  const events = (opts.events || []).map(([s, e]) => ({ s: new Date(s), e: new Date(e) }));
  const created = [], mails = [], fetches = [];
  const cache = opts.cache || new Map();
  const cal = {
    getEvents: (s, e) => events.filter(ev => ev.s < e && ev.e > s)
      .map(ev => ({ isAllDayEvent: () => false, getStartTime: () => ev.s, getEndTime: () => ev.e })),
    createEvent: (title, s, e, o) => {
      events.push({ s: new Date(s), e: new Date(e) });
      created.push({ title, start: new Date(s).toISOString(), guests: o.guests });
      return {};
    },
  };
  const sandbox = {
    Date: FakeDate, Math, JSON, String, Number, parseInt, isNaN, Array, Object, Error, RegExp,
    CalendarApp: { getDefaultCalendar: () => cal, getCalendarById: () => cal },
    UrlFetchApp: {
      fetch: (url) => {
        fetches.push(url);
        if ((opts.feed || "up") === "down") throw new Error("Address unavailable: p00-caldav.icloud.com");
        return { getResponseCode: () => 200, getContentText: () => ICS };
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: k => ({
          ICLOUD_ICS_URL: "webcal://p00-caldav.icloud.com/published/2/test",
          ICLOUD_GUEST_EMAIL: "owner@icloud.example",
          NOTIFICATION_EMAIL: "alerts@example.com",
        })[k] || null,
      }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: k => (cache.has(k) && cache.get(k).until > NOW ? cache.get(k).value : null),
        put: (k, v, sec) => cache.set(k, { value: v, until: NOW + sec * 1000 }),
      }),
    },
    LockService: { getScriptLock: () => ({ tryLock: () => !opts.lockBusy, releaseLock: () => {} }) },
    Utilities: { base64EncodeWebSafe: s => Buffer.from(String(s)).toString("base64url") },
    MailApp: { sendEmail: (to, subject) => mails.push(subject), getRemainingDailyQuota: () => 100 },
    ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: "json", JAVASCRIPT: "js" } },
    Logger: { log: () => {} },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(SCRIPT, "utf8"), sandbox, { filename: SCRIPT });
  return { gs: sandbox, created, mails, fetches, cache };
}

const request = (start, minutes, extra) => Object.assign({
  name: "Test Person", email: "test@example.com", title: "Intro call",
  start: start.toISOString(), end: new Date(start.getTime() + minutes * 60000).toISOString(), duration: String(minutes),
}, extra || {});
const times = slots => slots.map(s => new Date(s).toTimeString().slice(0, 5));
const GOOGLE = [[at(2026, 11, 30, 10), at(2026, 11, 30, 10, 30)]];   // a Google event, Monday 10:00–10:30

let failed = 0;
function check(name, ok, detail) {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : "\n      " + detail}`);
}

/* ------------------------------- booking ------------------------------- */
const bookings = [
  ["books a free time: Mon 30 Nov 15:30, 45 min", request(at(2026, 11, 30, 15, 30), 45), true],
  ["books 20 minutes (the psychology page)", request(at(2026, 11, 30, 9), 20), true],
  ["books the last day in the window, Thu 17 Dec", request(at(2026, 12, 17, 10), 30), true],
  ["refuses a time taken on Google", request(at(2026, 11, 30, 10), 30), /not available/],
  ["refuses a time taken only on iCloud", request(at(2026, 11, 30, 13), 60), /not available/],
  ["refuses a weekly iCloud event (Tue 1 Dec 11:00)", request(at(2026, 12, 1, 11), 30), /not available/],
  ["refuses 03:00", request(at(2026, 11, 30, 3), 30), /not available/],
  ["refuses a Saturday", request(at(2026, 11, 28, 10), 30), /not available/],
  ["refuses a time off the 30-minute grid", request(at(2026, 11, 30, 10, 10), 30), /not available/],
  ["refuses a time running past 17:00", request(at(2026, 11, 30, 16, 30), 60), /not available/],
  ["refuses a day past the window", request(at(2026, 12, 18, 10), 30), /not available/],
  ["refuses a length not offered", request(at(2026, 11, 30, 9), 480), /length is not offered/],
  ["refuses an end that is not start + duration", request(at(2026, 11, 30, 11), 45, { duration: "30" }), /length is not offered/],
  ["refuses today", request(at(2026, 11, 26, 15), 30), /too soon/],
  ["refuses a start that is not a date", request(at(2026, 11, 30, 11), 30, { start: "soon" }), /not valid/],
];
for (const [name, req, want] of bookings) {
  const b = backend({ events: GOOGLE });
  const r = b.gs.route("book", req);
  const ok = want === true ? r.booked === true && b.created.length === 1 : r.ok === false && want.test(r.error) && b.created.length === 0;
  check(name, ok, JSON.stringify(r) + ` (events created: ${b.created.length})`);
}
{
  const b = backend({ events: GOOGLE });
  b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  const again = b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("refuses the same time twice", again.ok === false && b.created.length === 1, JSON.stringify(again));
}
{
  const b = backend({ events: GOOGLE, lockBusy: true });
  const r = b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("asks to try again while another booking holds the lock", r.ok === false && /Another booking/.test(r.error) && !b.created.length, JSON.stringify(r));
}
{
  const b = backend({ events: GOOGLE });
  b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("invites the visitor and the iCloud address", b.created[0] && b.created[0].guests === "test@example.com,owner@icloud.example", JSON.stringify(b.created));
}

/* ----------------------------- availability ----------------------------- */
{
  const b = backend({ events: GOOGLE });
  const r = b.gs.route("availability", { date: "2026-11-30", duration: "60" });
  check("offers Monday's free hours around Google and iCloud events",
    JSON.stringify(times(r.slots)) === JSON.stringify(["09:00", "10:30", "11:00", "11:30", "12:00", "14:00", "14:30", "15:00", "15:30", "16:00"]),
    JSON.stringify(times(r.slots)));
  const tue = b.gs.route("availability", { date: "2026-12-01", duration: "30" });
  check("leaves out the weekly iCloud event", !times(tue.slots).includes("11:00") && !times(tue.slots).includes("11:30") && times(tue.slots).includes("12:00"), JSON.stringify(times(tue.slots)));
  const last = b.gs.route("availability", { date: "2026-12-17", duration: "30" });
  const past = b.gs.route("availability", { date: "2026-12-18", duration: "30" });
  check("offers the last day of the window and nothing after", last.slots.length === 16 && past.slots.length === 0, `${last.slots.length} / ${past.slots.length}`);
  const odd = b.gs.route("availability", { date: "2026-11-30", duration: "90" });
  check("refuses a length not offered", odd.ok === false && /length is not offered/.test(odd.error), JSON.stringify(odd));
  const sat = b.gs.route("availability", { date: "2026-11-28", duration: "30" });
  check("offers nothing at the weekend", sat.slots.length === 0, JSON.stringify(sat));
}

/* -------------------------- iCloud feed and cache -------------------------- */
{
  const b = backend();
  b.gs.route("availability", { date: "2026-11-30", duration: "30" });
  b.gs.route("availability", { date: "2026-12-01", duration: "45" });
  b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("reads the iCloud feed once for many checks", b.fetches.length === 1, `fetches: ${b.fetches.length}`);
}
{
  const cache = new Map();
  backend({ cache }).gs.route("availability", { date: "2026-11-30", duration: "30" });   // a good read, kept
  cache.delete("icloud_busy");                                                           // five minutes later
  const down = backend({ cache, feed: "down" });
  const r = down.gs.route("availability", { date: "2026-11-30", duration: "60" });
  check("feed down: still offers times, from the last copy", r.ok === true && r.slots.length === 12, JSON.stringify(r));
  check("feed down: the last copy still blocks iCloud events", !times(r.slots).includes("13:00"), JSON.stringify(times(r.slots)));
  check("feed down: the alert inbox is told", down.mails.length === 1 && /icloud/.test(down.mails[0]), JSON.stringify(down.mails));
  const booked = down.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("feed down: booking still works", booked.booked === true, JSON.stringify(booked));
}
{
  const b = backend({ feed: "down" });
  const r = b.gs.route("availability", { date: "2026-11-30", duration: "30" });
  check("feed down with no copy: says so, offers nothing", r.ok === false && /iCloud availability unavailable/.test(r.error), JSON.stringify(r));
  const booked = b.gs.route("book", request(at(2026, 11, 30, 15, 30), 45));
  check("feed down with no copy: refuses to book blind", booked.ok === false && /could not be checked/.test(booked.error) && !b.created.length, JSON.stringify(booked));
}
{
  const cache = new Map();
  backend({ cache }).gs.route("availability", { date: "2026-11-30", duration: "30" });
  const h = backend({ cache, feed: "down" }).gs.route("health", {});
  check("health reads the feed itself, so an outage shows", h.ok === false && h.icloud.ok === false, JSON.stringify(h.icloud));
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
