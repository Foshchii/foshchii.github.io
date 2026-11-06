/**
 * Questions and answers: a free backend on Google Apps Script and Google Sheets.
 *
 * It powers foshchii.com/psychology/questions.html. Visitors send questions
 * and comments without an account or an email address. Each one lands in this
 * script's Google Sheet as "pending", and nothing shows on the site until you
 * set its Status to "published". You answer a question by typing in its
 * Answer cell.
 *
 * Endpoints (the page calls these):
 *   GET  ?action=list               → { ok, questions: [...] }  published only
 *   POST action=ask      rid, name, title, question
 *   POST action=comment  rid, question, name, comment
 *   GET  ?action=received&rid=…     → { ok, received }
 *   GET  ?action=health             → { ok, service, version, ready }
 * GET requests take &callback=fn and then answer as JSONP.
 *
 * WHY POST AND THEN "received": a browser can't read Apps Script's reply to a
 * request from another site (it sends no CORS headers and redirects), so the
 * page sends a post blind, with a random request id (rid), and then asks over
 * JSONP whether a post with that id arrived.
 *
 * SETUP: see qa-api/README.md. In short: make a Google Sheet, open Extensions →
 * Apps Script, paste this file, run setup() once, then Deploy → New deployment
 * → Web app (Execute as: Me, Who has access: Anyone), and put the /exec URL in
 * psychology/questions.html as data-api="…".
 */

var CONFIG = {
  notificationEmail: "sviatoslav.foshchii@gmail.com", // gets a "new post waiting" email
  timezone: "Europe/Copenhagen",
  notifyEveryMinutes: 15,      // at most one notification email this often
  maxPostsPerHour: 40,         // all visitors together: a brake on spam floods
  deleteRejectedAfterDays: 30, // rejected posts are deleted after this long
  limits: { name: 40, title: 140, question: 3000, comment: 1500 }
};

var VERSION = "1";

var SHEETS = {
  questions: {
    name: "Questions",
    headers: ["ID", "Received", "Status", "Name", "Title", "Question", "Answer", "Published"],
    widths: { ID: 110, Received: 140, Status: 100, Name: 120, Title: 240, Question: 380, Answer: 420, Published: 140 },
    wrap: ["Title", "Question", "Answer"]
  },
  comments: {
    name: "Comments",
    headers: ["ID", "Received", "Status", "Question ID", "Question", "Name", "Comment", "From me", "Published"],
    widths: { ID: 110, Received: 140, Status: 100, "Question ID": 110, Question: 240, Name: 120, Comment: 380, "From me": 80, Published: 140 },
    wrap: ["Question", "Comment"]
  }
};

var STATUS = { pending: "pending", published: "published", rejected: "rejected" };

/* Nicknames that could pass for Sviatoslav are shown as "Anonymous". Comments
 * you write yourself are marked with the "From me" checkbox instead. */
var RESERVED_NAMES = /sviat|foshch|святослав|фощ/i;

/* ----------------------------- routing ----------------------------- */
function doGet(e) { return handle(e, "GET"); }
function doPost(e) { return handle(e, "POST"); }

/* Every request answers with JSON. An uncaught throw would make Apps Script
 * serve an HTML error page, which the page's JSONP <script> can't read. */
function handle(e, method) {
  var p = (e && e.parameter) || {};
  var out;
  try {
    out = route(String(p.action || ""), p, method);
  } catch (err) {
    console.error(err);
    out = { ok: false, error: "Something went wrong on the server." };
  }
  return reply(out, p.callback);
}

function route(action, p, method) {
  if (action === "list") return list();
  if (action === "received") return { ok: true, received: wasReceived(p.rid) };
  if (action === "health") return { ok: true, service: "Psychology Q&A", version: VERSION, ready: !!spreadsheetId() };
  if (action === "ask" || action === "comment") {
    if (method !== "POST") return { ok: false, error: "Send posts with POST." };
    return action === "ask" ? ask(p) : comment(p);
  }
  return { ok: true, service: "Psychology Q&A", endpoints: ["list", "ask", "comment", "received", "health"] };
}

/* ------------------------------ reading ----------------------------- */
/* Published questions, newest first, each with its published comments,
 * oldest first. Nothing else in the sheet ever leaves it. */
function list() {
  var questions = [], byId = {};
  readRows(SHEETS.questions).forEach(function (r) {
    if (status(r.Status) !== STATUS.published) return;
    var id = text(r.ID);
    var title = text(r.Title), question = text(r.Question);
    if (!id || (!title && !question)) return;
    var q = {
      id: id,
      name: displayName(r.Name),
      title: title,
      question: question,
      answer: text(r.Answer),
      asked: day(r.Received),
      published: day(r.Published) || day(r.Received),
      comments: [],
      _t: time(r.Published) || time(r.Received)
    };
    byId[id] = q;
    questions.push(q);
  });
  readRows(SHEETS.comments).forEach(function (r) {
    if (status(r.Status) !== STATUS.published) return;
    var q = byId[text(r["Question ID"])];
    var body = text(r.Comment);
    if (!q || !body) return;
    var mine = r["From me"] === true;
    q.comments.push({
      id: text(r.ID),
      name: mine ? "Sviatoslav" : displayName(r.Name),
      mine: mine,
      comment: body,
      date: day(r.Published) || day(r.Received),
      _t: time(r.Published) || time(r.Received)
    });
  });
  questions.sort(function (a, b) { return b._t - a._t; });
  questions.forEach(function (q) {
    q.comments.sort(function (a, b) { return a._t - b._t; });
    q.comments.forEach(function (c) { delete c._t; });
    delete q._t;
  });
  return { ok: true, questions: questions };
}

/* ------------------------------ posting ----------------------------- */
function ask(p) {
  var rid = requestId(p.rid);
  if (!rid) return { ok: false, error: "Missing request id." };
  if (wasReceived(rid)) return { ok: true };   // a retry of a post we already have
  if (p.qa_hp) return { ok: true };            // the hidden field: a bot filled it in
  var title = clean(p.title, CONFIG.limits.title, false);
  var question = clean(p.question, CONFIG.limits.question, true);
  if (!title || !question) return { ok: false, error: "Please write both a title and your question." };
  var name = cleanName(p.name);
  return store(SHEETS.questions, "q-", rid, function (id) {
    return [id, new Date(), STATUS.pending, asText(name), asText(title), asText(question), "", ""];
  }, { kind: "question", title: title, body: question });
}

function comment(p) {
  var rid = requestId(p.rid);
  if (!rid) return { ok: false, error: "Missing request id." };
  if (wasReceived(rid)) return { ok: true };
  if (p.qa_hp) return { ok: true };
  var body = clean(p.comment, CONFIG.limits.comment, true);
  if (!body) return { ok: false, error: "Please write a comment." };
  var q = findPublishedQuestion(String(p.question || ""));
  if (!q) return { ok: false, error: "That question isn't open for comments." };
  var name = cleanName(p.name);
  return store(SHEETS.comments, "c-", rid, function (id) {
    return [id, new Date(), STATUS.pending, q.id, asText(q.title), asText(name), asText(body), false, ""];
  }, { kind: "comment", title: q.title, body: body });
}

/* Appends one pending row, under a lock so two posts can't interleave. The
 * request id is remembered only after the row is written, so "received"
 * never says yes for a post that isn't in the sheet. */
function store(def, prefix, rid, makeRow, note) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return { ok: false, error: "The server is busy. Please try again." };
  try {
    if (wasReceived(rid)) return { ok: true };
    if (!withinRateLimit()) return { ok: false, error: "There are too many posts right now. Please try again later." };
    var id = prefix + Utilities.getUuid().replace(/-/g, "").slice(0, 10);
    sheetFor(def).appendRow(makeRow(id));
    markReceived(rid);
  } finally {
    lock.releaseLock();
  }
  notifySafe(note);
  return { ok: true };
}

function findPublishedQuestion(id) {
  if (!/^q-[a-z0-9]{6,20}$/.test(id)) return null;
  var rows = readRows(SHEETS.questions);
  for (var i = 0; i < rows.length; i++) {
    if (text(rows[i].ID) === id && status(rows[i].Status) === STATUS.published) {
      return { id: id, title: text(rows[i].Title) };
    }
  }
  return null;
}

/* ------------------------- spam and retries ------------------------- */
function withinRateLimit() {
  var cache = CacheService.getScriptCache();
  var key = "posts_" + Math.floor(Date.now() / 3600000);
  var n = parseInt(cache.get(key) || "0", 10) + 1;
  if (n > CONFIG.maxPostsPerHour) return false;
  cache.put(key, String(n), 3700);
  return true;
}

function requestId(v) {
  v = String(v || "");
  return /^[A-Za-z0-9-]{8,64}$/.test(v) ? v : "";
}
function wasReceived(rid) {
  rid = requestId(rid);
  return !!rid && CacheService.getScriptCache().get("rid_" + rid) === "1";
}
function markReceived(rid) {
  CacheService.getScriptCache().put("rid_" + rid, "1", 21600);
}

/* ---------------------------- notifying ----------------------------- */
/* At most one email every CONFIG.notifyEveryMinutes, so a burst of posts (or
 * spam) can't use up the daily mail quota. The sheet always has everything. */
function notifySafe(note) {
  try {
    var cache = CacheService.getScriptCache();
    if (cache.get("notified")) return;
    cache.put("notified", "1", CONFIG.notifyEveryMinutes * 60);
    var subject = (note.kind === "question" ? "New question waiting: " : "New comment waiting on: ") + note.title;
    MailApp.sendEmail({
      to: CONFIG.notificationEmail,
      subject: subject.slice(0, 120),
      body:
        "Someone sent a new " + note.kind + " to your Q&A page. It stays hidden until you publish it.\n\n" +
        note.body.slice(0, 600) + (note.body.length > 600 ? "…" : "") + "\n\n" +
        "Read and moderate it in your sheet:\n" + openBook().getUrl() + "\n\n" +
        "You get at most one of these emails every " + CONFIG.notifyEveryMinutes + " minutes; the sheet has every post."
    });
  } catch (err) {
    console.error(err);
  }
}

/* ------------------------------ the sheet ----------------------------- */
var book_ = null;
function spreadsheetId() {
  return PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
}
function openBook() {
  if (book_) return book_;
  var id = spreadsheetId();
  if (!id) throw new Error("Not set up yet: run setup() once in the Apps Script editor.");
  book_ = SpreadsheetApp.openById(id);
  return book_;
}
function sheetFor(def) {
  var sh = openBook().getSheetByName(def.name);
  if (!sh) throw new Error('The "' + def.name + '" tab is missing: run setup() again.');
  return sh;
}

/* Rows as objects keyed by header, so moving columns around doesn't matter. */
function readRows(def) {
  var values = sheetFor(def).getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0].map(function (h) { return String(h).trim(); });
  return values.slice(1).map(function (row) {
    var o = {};
    head.forEach(function (h, i) { o[h] = row[i]; });
    return o;
  });
}

/* ------------------------------ helpers ----------------------------- */
function clean(v, max, multiline) {
  var s = String(v == null ? "" : v).replace(/\r\n?/g, "\n");
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  s = multiline ? s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n") : s.replace(/\s+/g, " ");
  s = s.trim();
  return s.length > max ? s.slice(0, max).trim() : s;
}
function cleanName(v) {
  return clean(v, CONFIG.limits.name, false) || "Anonymous";
}

/* A leading apostrophe makes Sheets keep a value as plain text: a post that
 * starts with "=" stays words, not a formula, and "3/4" doesn't become a date. */
function asText(s) {
  return s ? "'" + s : "";
}

function text(v) {
  if (v == null) return "";
  return String(v).replace(/^'/, "").trim();
}
function status(v) {
  return String(v == null ? "" : v).trim().toLowerCase();
}
function displayName(v) {
  var s = text(v);
  return !s || RESERVED_NAMES.test(s) ? "Anonymous" : s;
}
function toDate(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (typeof v === "string" && v.trim()) {
    var d = new Date(v);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}
function day(v) {
  var d = toDate(v);
  return d ? Utilities.formatDate(d, CONFIG.timezone, "yyyy-MM-dd") : "";
}
function time(v) {
  var d = toDate(v);
  return d ? d.getTime() : 0;
}

function reply(obj, callback) {
  var body = JSON.stringify(obj).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  var cb = String(callback || "");
  if (/^[A-Za-z_$][\w$]{0,63}$/.test(cb)) {
    return ContentService.createTextOutput(cb + "(" + body + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

/* --------------------- run these from the editor --------------------- */
/* Run once from the Apps Script editor of the sheet (Extensions → Apps
 * Script). It remembers the sheet, adds the two tabs with their headers,
 * status dropdowns and checkboxes, and installs the daily clean-up. Safe to
 * run again: it keeps existing rows. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Open this script from its Google Sheet: Extensions → Apps Script.");
  PropertiesService.getScriptProperties().setProperty("SPREADSHEET_ID", ss.getId());
  ss.setSpreadsheetTimeZone(CONFIG.timezone);
  prepareSheet(ss, SHEETS.questions);
  prepareSheet(ss, SHEETS.comments);

  // The blank first tab a new spreadsheet comes with ("Sheet1", "Ark1", …).
  ss.getSheets().forEach(function (sh) {
    var ours = sh.getName() === SHEETS.questions.name || sh.getName() === SHEETS.comments.name;
    if (!ours && sh.getLastRow() === 0 && sh.getLastColumn() === 0) ss.deleteSheet(sh);
  });

  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === "cleanUp") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("cleanUp").timeBased().everyDays(1).atHour(4).create();
  Logger.log("Ready. The sheet is " + ss.getUrl());
}

function prepareSheet(ss, def) {
  var sh = ss.getSheetByName(def.name) || ss.insertSheet(def.name);
  if (sh.getLastRow() === 0) sh.getRange(1, 1, 1, def.headers.length).setValues([def.headers]);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  def.headers.forEach(function (h) {
    if (head.indexOf(h) === -1) throw new Error('The "' + def.name + '" tab has no "' + h + '" column. Add it back, or delete the tab and run setup() again.');
  });
  sh.getRange(1, 1, 1, head.length).setFontWeight("bold");
  sh.setFrozenRows(1);
  var rows = sh.getMaxRows() - 1;
  head.forEach(function (h, i) {
    if (def.widths[h]) sh.setColumnWidth(i + 1, def.widths[h]);
    var col = sh.getRange(2, i + 1, rows, 1);
    if (def.wrap.indexOf(h) !== -1) col.setWrap(true);
    col.setVerticalAlignment("top");
  });
  var statusCol = head.indexOf("Status") + 1;
  sh.getRange(2, statusCol, rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList([STATUS.pending, STATUS.published, STATUS.rejected], true)
      .setAllowInvalid(false).build());
  var mineCol = head.indexOf("From me") + 1;
  if (mineCol) {
    // Validation only, not insertCheckboxes(): that would fill every row with
    // FALSE, and new posts would then be appended below row 1000.
    sh.getRange(2, mineCol, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  }
  // Waiting posts stand out; rejected ones fade.
  var letter = columnLetter(statusCol);
  var all = sh.getRange(2, 1, rows, head.length);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + letter + '2="pending"')
      .setBackground("#FFF4D6").setRanges([all]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + letter + '2="rejected"')
      .setFontColor("#9A9A9A").setRanges([all]).build()
  ]);
}

function columnLetter(n) {
  var s = "";
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/* Fills in "Published" the first time you set a row to published. A simple
 * trigger: it runs on your own edits in the sheet, with no setup. */
function onEdit(e) {
  try {
    var sh = e.range.getSheet();
    if (sh.getName() !== SHEETS.questions.name && sh.getName() !== SHEETS.comments.name) return;
    var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    var statusCol = head.indexOf("Status") + 1, pubCol = head.indexOf("Published") + 1;
    if (!statusCol || !pubCol) return;
    if (statusCol < e.range.getColumn() || statusCol > e.range.getLastColumn()) return;
    for (var r = Math.max(2, e.range.getRow()); r <= e.range.getLastRow(); r++) {
      if (status(sh.getRange(r, statusCol).getValue()) !== STATUS.published) continue;
      var pub = sh.getRange(r, pubCol);
      if (!pub.getValue()) pub.setValue(new Date());
    }
  } catch (err) {
    console.error(err);
  }
}

/* Daily (installed by setup): deletes rejected posts older than
 * CONFIG.deleteRejectedAfterDays, so they aren't kept for longer than needed. */
function cleanUp() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var cutoff = Date.now() - CONFIG.deleteRejectedAfterDays * 86400000;
    [SHEETS.questions, SHEETS.comments].forEach(function (def) {
      var sh = sheetFor(def);
      var values = sh.getDataRange().getValues();
      var head = values[0].map(String);
      var st = head.indexOf("Status"), rec = head.indexOf("Received");
      for (var i = values.length - 1; i >= 1; i--) {
        var when = time(values[i][rec]);
        if (status(values[i][st]) === STATUS.rejected && when && when < cutoff) sh.deleteRow(i + 1);
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/* Shows what the page would get, in the editor's log. */
function testList() {
  Logger.log(JSON.stringify(list(), null, 2));
}
