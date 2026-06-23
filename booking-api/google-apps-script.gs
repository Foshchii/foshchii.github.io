/**
 * SF Booking — free backend (Google + iCloud) on Google Apps Script.
 *
 * It powers your booking widget and:
 *   • reads BUSY times from your Google calendar(s) [native] AND your iCloud
 *     calendar [via its shared .ics feed], offering only slots free on BOTH;
 *   • on booking, creates the event on Google and invites your iCloud address,
 *     so the meeting lands on BOTH calendars.
 *
 * Endpoints (the widget calls these):
 *   GET  .../exec/availability?date=YYYY-MM-DD&duration=30  → { slots: [ISO,…] }
 *   POST .../exec/book   { name,email,message,title,start,end,host }  → { ok }
 *
 * WHY THIS DESIGN: Apps Script runs AS YOU (free Google calendar access, no API
 * keys) but cannot speak CalDAV (it blocks PROPFIND/REPORT). Reading iCloud via
 * its published .ics feed needs only a plain GET, and inviting your iCloud
 * address is the robust, free way to get the event onto iCloud too.
 *
 * SETUP — see booking-api/README.md. Short version:
 *   1) script.google.com → new project → paste this file.
 *   2) Project Settings (gear) → set the time zone to CONFIG.timezone.
 *   3) iCloud.com → Calendar → hover a calendar → Share → Public Calendar →
 *      copy the link. Project Settings → Script properties:
 *         ICLOUD_ICS_URL = https://pXX-caldav.icloud.com/published/2/XXXX
 *      (Leave it unset to run Google-only.)
 *   4) Deploy → New deployment → Web app → Execute as: Me, Access: Anyone.
 *   5) Copy the /exec URL into contact.html  →  data-api="…".
 */

var CONFIG = {
  googleCalendarIds: ["primary"],                    // add more IDs to merge them
  icloudGuestEmail:  "sviatoslav.foshchii@icloud.com", // invited so it lands on iCloud
  timezone:  "Europe/Copenhagen",
  workdays:  [1, 2, 3, 4, 5],   // 0=Sun … 6=Sat
  startHour: 9,                 // 09:00
  endHour:   17,                // 17:00
  stepMin:   30,
  daysAhead: 21,
  bufferMin: 60                 // don't offer slots within the next hour
};

/* ----------------------------- routing ----------------------------- */
function doGet(e) {
  if (e && e.pathInfo === "availability") return json(availability(e.parameter || {}));
  return json({ ok: true, service: "SF Booking (Google + iCloud)", endpoints: ["/availability", "/book"] });
}
function doPost(e) {
  if (e && e.pathInfo === "book") {
    try { return json(book(JSON.parse(e.postData.contents))); }
    catch (err) { return json({ ok: false, error: String(err) }); }
  }
  return json({ ok: false, error: "Unknown route" });
}

/* --------------------------- availability -------------------------- */
function availability(p) {
  var duration = parseInt(p.duration, 10) || 30;
  var parts = (p.date || "").split("-");
  if (parts.length !== 3) return { slots: [] };
  var y = +parts[0], m = +parts[1], d = +parts[2];

  var day = new Date(y, m - 1, d);
  if (CONFIG.workdays.indexOf(day.getDay()) === -1) return { slots: [] };

  var dayStart = new Date(y, m - 1, d, 0, 0, 0);
  var dayEnd   = new Date(y, m - 1, d, 23, 59, 59);
  var busy = googleBusy(dayStart, dayEnd).concat(icloudBusy(dayStart, dayEnd));

  var winStart = new Date(y, m - 1, d, CONFIG.startHour, 0, 0);
  var winEnd   = new Date(y, m - 1, d, CONFIG.endHour, 0, 0);
  var now = Date.now();
  var slots = [];

  for (var t = new Date(winStart); t.getTime() + duration * 60000 <= winEnd.getTime(); t = new Date(t.getTime() + CONFIG.stepMin * 60000)) {
    var s = new Date(t), e = new Date(t.getTime() + duration * 60000);
    if (s.getTime() < now + CONFIG.bufferMin * 60000) continue;
    var free = true;
    for (var i = 0; i < busy.length; i++) {
      if (s < busy[i].e && e > busy[i].s) { free = false; break; }
    }
    if (free) slots.push(s.toISOString());
  }
  return { slots: slots };
}

/* ----------------------------- booking ----------------------------- */
function book(b) {
  if (!b || !b.start || !b.end || !b.email) return { ok: false, error: "Missing fields" };
  var start = new Date(b.start), end = new Date(b.end);
  var cal = getGoogleCal(CONFIG.googleCalendarIds[0]);

  // Last-second double-booking guard (Google side).
  if (cal.getEvents(start, end).length) {
    return { ok: false, error: "That time was just taken — please pick another." };
  }

  var guests = [b.email];
  if (CONFIG.icloudGuestEmail) guests.push(CONFIG.icloudGuestEmail);

  cal.createEvent(
    (b.title || "Meeting") + " — " + (b.name || "Guest"),
    start, end,
    {
      description: "Booked via website\n\nName: " + (b.name || "") +
                   "\nEmail: " + (b.email || "") +
                   "\nNotes: " + (b.message || "—"),
      guests: guests.join(","),
      sendInvites: true
    }
  );
  return { ok: true };
}

/* --------------------------- Google busy --------------------------- */
function googleBusy(start, end) {
  var out = [];
  CONFIG.googleCalendarIds.forEach(function (id) {
    var cal = getGoogleCal(id);
    if (!cal) return;
    cal.getEvents(start, end).forEach(function (ev) {
      if (ev.isAllDayEvent()) out.push({ s: ev.getAllDayStartDate(), e: ev.getAllDayEndDate() });
      else out.push({ s: ev.getStartTime(), e: ev.getEndTime() });
    });
  });
  return out;
}
function getGoogleCal(id) {
  return (!id || id === "primary") ? CalendarApp.getDefaultCalendar() : CalendarApp.getCalendarById(id);
}

/* ---------------------------- iCloud busy -------------------------- *
 * Reads the published iCloud calendar .ics feed and returns busy blocks
 * that overlap [start, end]. Handles concrete events and simple DAILY/WEEKLY
 * recurrences. (Complex RRULEs may not be fully expanded.)                */
function icloudBusy(start, end) {
  var url = prop("ICLOUD_ICS_URL");
  if (!url) return [];
  url = url.replace(/^webcal:/i, "https:");
  try {
    var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    if (res.getResponseCode() >= 300) { Logger.log("iCloud feed HTTP " + res.getResponseCode()); return []; }
    return parseIcsBusy(res.getContentText(), start, end);
  } catch (err) { Logger.log("iCloud feed error: " + err); return []; }
}

function parseIcsBusy(text, rangeStart, rangeEnd) {
  // Unfold RFC5545 line folding (continuation lines start with space/tab).
  var lines = text.replace(/\r\n[ \t]/g, "").split(/\r\n|\n|\r/);
  var out = [], cur = null;
  for (var i = 0; i < lines.length; i++) {
    var ln = lines[i];
    if (ln === "BEGIN:VEVENT") { cur = {}; continue; }
    if (ln === "END:VEVENT") {
      if (cur && cur.start && cur.end) addOccurrences(cur, rangeStart, rangeEnd, out);
      cur = null; continue;
    }
    if (!cur) continue;
    var c = ln.indexOf(":"); if (c === -1) continue;
    var key = ln.substring(0, c), val = ln.substring(c + 1);
    var name = key.split(";")[0];
    if (name === "DTSTART") { cur.start = icsDate(key, val); cur.allDay = /VALUE=DATE\b/.test(key); }
    else if (name === "DTEND") { cur.end = icsDate(key, val); }
    else if (name === "RRULE") { cur.rrule = parseRRule(val); }
  }
  return out;
}

function addOccurrences(ev, rangeStart, rangeEnd, out) {
  var durMs = ev.end.getTime() - ev.start.getTime();
  if (durMs <= 0) durMs = ev.allDay ? 24 * 3600000 : 30 * 60000;

  if (!ev.rrule) {
    if (ev.start < rangeEnd && ev.end > rangeStart) out.push({ s: ev.start, e: ev.end });
    return;
  }
  // Expand simple recurrences across the queried window.
  var freq = ev.rrule.FREQ, interval = parseInt(ev.rrule.INTERVAL || "1", 10) || 1;
  var until = ev.rrule.UNTIL ? icsDate("X", ev.rrule.UNTIL) : null;
  var count = ev.rrule.COUNT ? parseInt(ev.rrule.COUNT, 10) : null;
  var byday = ev.rrule.BYDAY ? ev.rrule.BYDAY.split(",") : null;
  var DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  var occ = new Date(ev.start), made = 0, guard = 0;
  while (occ <= rangeEnd && guard++ < 1000) {
    if (until && occ > until) break;
    if (count && made >= count) break;
    var oEnd = new Date(occ.getTime() + durMs);
    var match = !byday || byday.some(function (b) { return DOW[b.slice(-2)] === occ.getDay(); });
    if (match && occ < rangeEnd && oEnd > rangeStart) out.push({ s: new Date(occ), e: oEnd });
    made++;
    if (freq === "DAILY") occ.setDate(occ.getDate() + interval);
    else if (freq === "WEEKLY") occ.setDate(occ.getDate() + (byday ? 1 : 7 * interval));
    else break; // MONTHLY/YEARLY not expanded
  }
}

/** Parse an ICS date value to a Date. Handles UTC (Z), all-day (VALUE=DATE)
 *  and TZID/local (assumed = CONFIG.timezone, i.e. your own calendar). */
function icsDate(key, val) {
  val = val.trim();
  if (/^\d{8}$/.test(val)) {                       // YYYYMMDD (all-day)
    return new Date(+val.slice(0, 4), +val.slice(4, 6) - 1, +val.slice(6, 8));
  }
  var mUTC = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (mUTC) return new Date(Date.UTC(+mUTC[1], +mUTC[2] - 1, +mUTC[3], +mUTC[4], +mUTC[5], +mUTC[6]));
  var mLoc = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (mLoc) return new Date(+mLoc[1], +mLoc[2] - 1, +mLoc[3], +mLoc[4], +mLoc[5], +mLoc[6]); // script tz
  return new Date(val);
}

function parseRRule(val) {
  var o = {};
  val.split(";").forEach(function (kv) { var p = kv.split("="); if (p.length === 2) o[p[0]] = p[1]; });
  return o;
}

/* ----------------------------- helpers ----------------------------- */
function prop(k) { return PropertiesService.getScriptProperties().getProperty(k) || ""; }
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* --------- run these from the editor to verify your setup ---------- */
function testIcloudFeed() {
  var url = prop("ICLOUD_ICS_URL");
  Logger.log(url ? "ICLOUD_ICS_URL set" : "ICLOUD_ICS_URL NOT set (Google-only mode)");
  var tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  var s = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0);
  var e = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 23, 59, 59);
  Logger.log("iCloud busy blocks tomorrow: " + JSON.stringify(icloudBusy(s, e)));
}
function testAvailabilityTomorrow() {
  var t = new Date(); t.setDate(t.getDate() + 1);
  var date = t.getFullYear() + "-" + ("0" + (t.getMonth() + 1)).slice(-2) + "-" + ("0" + t.getDate()).slice(-2);
  Logger.log("Slots for " + date + ": " + JSON.stringify(availability({ date: date, duration: "30" })));
}
