/**
 * SF Booking — free backend on Google Apps Script.
 * Connects your booking widget to your real Google Calendar:
 *   • GET  .../exec/availability?date=YYYY-MM-DD&duration=30  → free slots
 *   • POST .../exec/book   { name, email, message, title, start, end }  → creates event
 *
 * Why Apps Script? It runs AS YOU, so it can read your free/busy times and
 * create events with no API keys, no servers, and no cost.
 *
 * SETUP (5 minutes) — see booking-api/README.md for screenshots-level detail:
 *   1. https://script.google.com  →  New project, paste this file.
 *   2. Project Settings → set the time zone to your CONFIG.timezone below.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me      Who has access: Anyone
 *   4. Copy the /exec URL and put it in contact.html  →  data-api="...".
 */

var CONFIG = {
  calendarId: "primary",          // or a specific calendar's ID
  timezone:   "Europe/Copenhagen",
  workdays:   [1, 2, 3, 4, 5],    // 0=Sun … 6=Sat
  startHour:  9,                  // 09:00
  endHour:    17,                 // 17:00
  stepMin:    30,                 // gap between slot starts
  daysAhead:  21,                 // booking horizon
  bufferMin:  60                  // don't offer slots starting within the next hour
};

function doGet(e) {
  if (e && e.pathInfo === "availability") return json(availability(e.parameter || {}));
  return json({ ok: true, service: "SF Booking", endpoints: ["/availability", "/book"] });
}

function doPost(e) {
  if (e && e.pathInfo === "book") {
    try { return json(book(JSON.parse(e.postData.contents))); }
    catch (err) { return json({ ok: false, error: String(err) }); }
  }
  return json({ ok: false, error: "Unknown route" });
}

/* ---- availability: candidate slots minus busy calendar time ---- */
function availability(p) {
  var duration = parseInt(p.duration, 10) || 30;
  var parts = (p.date || "").split("-");
  if (parts.length !== 3) return { slots: [] };
  var y = +parts[0], m = +parts[1], d = +parts[2];

  var day = new Date(y, m - 1, d);
  if (CONFIG.workdays.indexOf(day.getDay()) === -1) return { slots: [] };

  var cal = getCal();
  var dayStart = new Date(y, m - 1, d, CONFIG.startHour, 0, 0);
  var dayEnd   = new Date(y, m - 1, d, CONFIG.endHour, 0, 0);
  var busy = cal.getEvents(dayStart, dayEnd);
  var now = Date.now();
  var slots = [];

  for (var t = new Date(dayStart); t.getTime() + duration * 60000 <= dayEnd.getTime(); t = new Date(t.getTime() + CONFIG.stepMin * 60000)) {
    var s = new Date(t), eEnd = new Date(t.getTime() + duration * 60000);
    if (s.getTime() < now + CONFIG.bufferMin * 60000) continue;
    var free = true;
    for (var i = 0; i < busy.length; i++) {
      if (s < busy[i].getEndTime() && eEnd > busy[i].getStartTime()) { free = false; break; }
    }
    if (free) slots.push(s.toISOString());
  }
  return { slots: slots };
}

/* ---- book: create the event + invite the guest ---- */
function book(b) {
  if (!b || !b.start || !b.end || !b.email) return { ok: false, error: "Missing fields" };
  var cal = getCal();
  var start = new Date(b.start), end = new Date(b.end);

  // Re-check the slot is still free (avoid double booking).
  var clash = cal.getEvents(start, end);
  if (clash.length) return { ok: false, error: "That time was just taken — please pick another." };

  cal.createEvent(
    (b.title || "Meeting") + " — " + (b.name || "Guest"),
    start, end,
    {
      description: "Booked via website\n\nName: " + (b.name || "") +
                   "\nEmail: " + (b.email || "") +
                   "\nNotes: " + (b.message || "—"),
      guests: b.email,
      sendInvites: true
    }
  );
  return { ok: true };
}

function getCal() {
  return CONFIG.calendarId === "primary"
    ? CalendarApp.getDefaultCalendar()
    : CalendarApp.getCalendarById(CONFIG.calendarId);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
