/* =========================================================================
   SF Booking Widget — a tiny, dependency-free, self-hosted scheduler.
   "Your own Calendly", reusable on any website.

   USAGE (drop into any page):
     <div class="sf-booking"
          data-name="Sviatoslav Foshchii"
          data-email=""                   // required only for standalone bookings
          data-title="Intro call"
          data-durations="30,45,60"      // minutes, first is default
          data-timezone="Europe/Copenhagen"
          data-workdays="1,2,3,4,5"      // 0=Sun … 6=Sat
          data-start="09:00" data-end="17:00"
          data-days-ahead="21"
          data-min-days-ahead="1"        // 1 = no same-day bookings: tomorrow at the earliest (0 = today)
          data-message-label="…"         // optional: label for the free-text field
          data-api=""                    // optional backend base URL (see /booking-api)
          data-strict-live="true"        // connected mode blocks booking if live availability fails
          data-failure-mode="show">      // "show" displays an error; "hide" lets the site quietly remove booking
     </div>
     <script src="assets/js/booking-widget.js" defer></script>

   MODES
   • Standalone (no data-api): shows slots from your working hours, and on
     confirm it generates a real calendar invite (.ics) for the visitor and
     opens a pre-filled email to you. 100% free, no server, no third party.
   • Connected (data-api set): fetches *live* free/busy slots and writes the
     booking straight to your calendar via your free backend.
   ========================================================================= */
(function () {
  "use strict";

  /* ---------- one-time styles (scoped under .sf-booking) ---------- */
  var CSS = `
  .sf-booking{--sfb-accent:var(--brand,#4f46e5);--sfb-accent-ink:var(--brand-ink,#fff);
    --sfb-bg:var(--surface,#fff);--sfb-alt:var(--bg-alt,#f8fafc);
    --sfb-text:var(--text,#0f172a);--sfb-muted:var(--text-muted,#475569);
    --sfb-border:var(--border,#e2e8f0);--sfb-radius:0;
    font-family:inherit;color:var(--sfb-text);background:var(--sfb-bg);
    border:1px solid var(--sfb-border);border-radius:var(--sfb-radius);
    overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.06)}
  .sf-booking *{box-sizing:border-box}
  .sfb-grid{display:grid;grid-template-columns:1.15fr 1fr;min-height:440px}
  .sfb-cal,.sfb-side{min-width:0;overflow:hidden}
  .sfb-side{background:var(--sfb-bg);position:relative}
  .sfb-pane{padding:1.4rem 1.5rem}
  .sfb-cal{border-right:1px solid var(--sfb-border);background:var(--sfb-alt)}
  .sfb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
  .sfb-month{font-weight:700;font-size:1.02rem}
  .sfb-nav{display:flex;gap:.4rem}
  .sfb-ico{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--sfb-border);
    background:var(--sfb-bg);border-radius:0;cursor:pointer;color:var(--sfb-muted);font-size:1rem;line-height:1}
  .sfb-ico:hover:not([disabled]){color:var(--sfb-accent);border-color:var(--sfb-accent)}
  .sfb-ico[disabled]{opacity:.35;cursor:not-allowed}
  .sfb-dow,.sfb-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}
  .sfb-dow span{text-align:center;font-size:.72rem;font-weight:600;color:var(--sfb-muted);
    text-transform:uppercase;letter-spacing:.05em;padding:.3rem 0}
  .sfb-day{aspect-ratio:1;min-width:0;display:grid;place-items:center;border:0;border-radius:0;cursor:pointer;
    background:transparent;color:var(--sfb-text);font:inherit;font-size:.9rem;font-weight:500;position:relative}
  .sfb-day:hover:not([disabled]):not(.is-active){background:var(--sfb-bg);box-shadow:inset 0 0 0 1px var(--sfb-accent)}
  .sfb-day[disabled]{color:var(--sfb-muted);opacity:.35;cursor:default}
  .sfb-day.is-today{box-shadow:inset 0 0 0 1px var(--sfb-border)}
  .sfb-day.is-active{background:var(--sfb-accent);color:var(--sfb-accent-ink)}
  .sfb-slots-title{font-weight:700;font-size:1rem;margin:0 0 .2rem}
  .sfb-slots-title:focus,.sfb-done:focus{outline:none}
  .sfb-field input[aria-invalid="true"]{border-color:#c2410c}
  .sfb-tz{font-size:.78rem;color:var(--sfb-muted);margin-bottom:1rem}
  .sfb-durations{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}
  .sfb-dur{padding:.35rem .7rem;border:1px solid var(--sfb-border);background:var(--sfb-bg);border-radius:0;
    cursor:pointer;font:inherit;font-size:.82rem;color:var(--sfb-muted);white-space:nowrap}
  .sfb-dur.is-active{border-color:var(--sfb-accent);color:var(--sfb-accent);font-weight:600}
  .sfb-slotlist{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:.5rem;max-height:300px;overflow-y:auto;overflow-x:hidden;padding-right:2px}
  .sfb-slot{padding:.6rem .5rem;border:1px solid var(--sfb-border);background:var(--sfb-bg);border-radius:0;
    cursor:pointer;font:inherit;font-weight:600;font-size:.9rem;color:var(--sfb-text);transition:.15s;
    white-space:nowrap;text-align:center;overflow:hidden;text-overflow:ellipsis}
  .sfb-slot:hover{border-color:var(--sfb-accent);color:var(--sfb-accent);transform:translateY(-1px)}
  .sfb-empty,.sfb-loading{color:var(--sfb-muted);font-size:.9rem;padding:1.25rem 0 0;text-align:left}
  .sfb-slotlist-wrap{min-height:184px}
  .sfb-status{border:1px solid var(--sfb-border);border-radius:0;padding:.85rem .95rem;margin:1rem 0;
    font-size:.88rem;line-height:1.45;background:var(--sfb-alt);color:var(--sfb-muted)}
  .sfb-status strong{display:block;color:var(--sfb-text);margin-bottom:.25rem}
  .sfb-status p{margin:.25rem 0;color:inherit}
  .sfb-status--error{border-color:rgba(248,113,113,.35);background:rgba(248,113,113,.08);color:#FCA5A5}
  .sfb-status--error strong{color:#FCA5A5}
  .sfb-status--warning{border-color:rgba(251,191,36,.35);background:rgba(251,191,36,.08);color:#FCD34D}
  .sfb-status--warning strong{color:#FCD34D}
  .sfb-actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.75rem;align-items:center}
  .sfb-actions .sfb-btn,.sfb-actions .sfb-link{width:auto;margin:0;text-decoration:none}
  .sfb-actions .sfb-btn{display:inline-flex;align-items:center;justify-content:center;padding:.55rem .9rem}
  .sfb-btn--secondary{background:var(--sfb-alt);color:var(--sfb-text);border:1px solid var(--sfb-border)}
  .sfb-field{margin-bottom:.85rem}
  .sfb-field label{display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem}
  .sfb-field input,.sfb-field textarea{width:100%;font:inherit;padding:.6rem .75rem;color:var(--sfb-text);
    background:var(--sfb-bg);border:1px solid var(--sfb-border);border-radius:0}
  .sfb-field input:focus,.sfb-field textarea:focus{outline:none;border-color:var(--sfb-accent);
    box-shadow:0 0 0 3px color-mix(in srgb,var(--sfb-accent) 30%,transparent)}
  .sfb-summary{background:var(--sfb-alt);border:1px solid var(--sfb-border);border-radius:0;
    padding:.75rem .9rem;font-size:.88rem;margin-bottom:1rem;display:flex;gap:.6rem;align-items:flex-start}
  .sfb-summary b{color:var(--sfb-text)}
  .sfb-btn{width:100%;padding:.75rem 1rem;border:0;border-radius:0;cursor:pointer;font:inherit;
    font-weight:600;background:var(--sfb-accent);color:var(--sfb-accent-ink);transition:.15s}
  .sfb-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}
  .sfb-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .sfb-link{background:none;border:0;color:var(--sfb-muted);font:inherit;font-size:.85rem;cursor:pointer;
    padding:.6rem;width:100%;margin-top:.3rem}
  .sfb-link:hover{color:var(--sfb-accent)}
  .sfb-success{padding:2.5rem 1.5rem;text-align:center}
  .sfb-check{width:60px;height:60px;border-radius:50%;background:#22c55e;color:#fff;display:grid;place-items:center;
    margin:0 auto 1.1rem;font-size:1.8rem}
  .sfb-success .sfb-done{margin:0 0 .4rem;font-size:1.25rem}
  .sfb-success p{color:var(--sfb-muted);margin:.2rem 0}
  @media(max-width:680px){.sfb-grid{grid-template-columns:1fr}.sfb-cal{border-right:0;border-bottom:1px solid var(--sfb-border)}.sfb-slotlist{max-height:220px}}
  @media(prefers-reduced-motion:reduce){.sf-booking *{transition:none!important}}
  `;

  function injectStyles() {
    if (document.getElementById("sfb-styles")) return;
    var s = document.createElement("style");
    s.id = "sfb-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------------------------- helpers ---------------------------- */
  var MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  var DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  var pad = function (n) { return String(n).padStart(2, "0"); };
  var ymd = function (d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };

  // Build a Date for a wall-clock time in a given IANA timezone (DST-safe).
  function zonedWallToDate(y, m, d, hh, mm, tz) {
    var utc = Date.UTC(y, m - 1, d, hh, mm, 0);
    var off = tzOffset(new Date(utc), tz);
    var dt = new Date(utc - off);
    var off2 = tzOffset(dt, tz);
    if (off2 !== off) dt = new Date(utc - off2);
    return dt;
  }
  function tzOffset(date, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var p = {}; dtf.formatToParts(date).forEach(function (x) { p[x.type] = x.value; });
    var asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour === "24" ? 0 : p.hour, p.minute, p.second);
    return asUTC - date.getTime();
  }
  function icsStamp(date) {
    return date.getUTCFullYear() + pad(date.getUTCMonth() + 1) + pad(date.getUTCDate()) + "T" +
           pad(date.getUTCHours()) + pad(date.getUTCMinutes()) + pad(date.getUTCSeconds()) + "Z";
  }
  function esc(s) { return String(s == null ? "" : s); }
  function html(s) {
    return esc(s).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
  function readableError(err) {
    var msg = esc(err && err.message ? err.message : err || "calendar check failed");
    if (msg === "timeout") return "The calendar service did not answer in time.";
    if (msg === "network") return "The calendar service could not be reached.";
    if (msg === "badresponse") return "The calendar service replied with something this page could not read — its deployment may need re-authorising.";
    if (msg === "http") return "The calendar service answered with an error (HTTP " + err.status + ").";
    return msg;
  }

  /* ------------------------- talking to the backend ------------------------
     An Apps Script web app's replies carry Access-Control-Allow-Origin: *, on
     the /exec redirect and on the googleusercontent.com page it leads to, so
     fetch() can read them. fetch() goes first because it
       • leaves the visitor's Google cookies out, so being signed in to Google,
         to several accounts or to a work account cannot change the answer;
       • reports the HTTP status, so an error page is not mistaken for silence;
       • is not a cross-site <script> load, which browsers, blockers and Google
         itself all treat with suspicion.
     JSONP stays as the fallback for a browser where fetch() cannot get through.
     Both reject with "timeout", "network", "badresponse" or "http" (with a
     .status) when no readable reply came back, and say which transport failed
     in .via, so an issue report can name the cause.                         */
  function transportError(message, via, status) {
    var e = new Error(message);
    e.via = via;
    if (status) e.status = status;
    return e;
  }

  function fetchJSON(url, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 20000);
    var status;
    return fetch(url, { credentials: "omit", cache: "no-store", signal: ctrl.signal })
      .then(function (res) { status = res.status; return res.text(); })
      .then(function (text) {
        clearTimeout(timer);
        if (status < 200 || status > 299) throw transportError("http", "fetch", status);
        try { return JSON.parse(text); } catch (err) { throw transportError("badresponse", "fetch"); }
      }, function () {
        clearTimeout(timer);
        throw transportError(ctrl.signal.aborted ? "timeout" : "network", "fetch");
      });
  }

  // The page's transport: fetch(), until fetch() fails to get through where
  // JSONP succeeds. Browsers without fetch() and AbortController start on JSONP.
  var useJsonp = typeof fetch !== "function" || typeof AbortController !== "function";

  // One call to the backend. `fallback` lets a call that fetch() could not
  // deliver go out again over JSONP — only for calls that are safe to send
  // twice. A booking is not: fetch() may have reached the backend and lost
  // only the reply.
  function call(url, timeoutMs, fallback) {
    if (useJsonp) return jsonp(url, timeoutMs);
    return fetchJSON(url, timeoutMs).catch(function (err) {
      // After an HTTP error, an unreadable reply or a timeout the backend was
      // reached, or is slow, and JSONP would get the same answer.
      if (!fallback || err.message !== "network") throw err;
      return jsonp(url, timeoutMs).then(function (data) {
        useJsonp = true;
        return data;
      }, function (jerr) {
        jerr.via = "fetch, then jsonp";
        throw jerr;
      });
    });
  }

  // Call an Apps Script web app with a JSONP <script> load: the fallback
  // transport. Resolves with the object the backend returns.
  function jsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "sfb_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      var s = document.createElement("script");
      var done = false;
      var timer = setTimeout(function () { finish(transportError("timeout", "jsonp")); }, timeoutMs || 20000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
      function finish(err, data) {
        if (done) return;
        done = true;
        cleanup();
        if (err) reject(err); else resolve(data);
      }
      window[cb] = function (data) { finish(null, data); };
      s.onerror = function () { finish(transportError("network", "jsonp")); };
      // A <script> handed non-JS — an Apps Script sign-in or error page — mostly
      // fires error, not load: Google marks its pages nosniff, so the browser
      // will not run them, and that reads as "network", the same as a dropped
      // connection. Where one does load, it throws a SyntaxError and never calls
      // back; without this the widget would wait out the whole timeout. A real
      // JSONP reply runs the callback during eval, so `done` is already set by
      // the time load fires.
      s.onload = function () { setTimeout(function () { finish(transportError("badresponse", "jsonp")); }, 0); };
      s.src = url + (url.indexOf("?") === -1 ? "?" : "&") + "callback=" + cb;
      document.head.appendChild(s);
    });
  }

  /* ----------------------------- widget ---------------------------- */
  function Booking(el) {
    var cfg = {
      name: el.dataset.name || "",
      email: el.dataset.email || "",
      title: el.dataset.title || "Meeting",
      durations: (el.dataset.durations || "30").split(",").map(function (x) { return parseInt(x, 10); }).filter(Boolean),
      tz: el.dataset.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      workdays: (el.dataset.workdays || "1,2,3,4,5").split(",").map(Number),
      start: el.dataset.start || "09:00",
      end: el.dataset.end || "17:00",
      step: parseInt(el.dataset.slotStep || "30", 10),
      daysAhead: parseInt(el.dataset.daysAhead || "21", 10),
      minDaysAhead: Math.max(0, parseInt(el.dataset.minDaysAhead || "0", 10) || 0),
      messageLabel: el.dataset.messageLabel || "What's it about? (optional)",
      api: (el.dataset.api || "").trim(),
      strictLive: el.dataset.strictLive !== "false",
      failureMode: el.dataset.failureMode || "show",
      weekStart: el.dataset.weekStart === "1" ? 1 : 0,
      // the level of the widget's own headings, so they fit the page's outline
      hl: /^[2-6]$/.test(el.dataset.headingLevel || "") ? el.dataset.headingLevel : "3"
    };
    if (!cfg.api && !cfg.email.trim()) {
      el.textContent = "Booking is currently unavailable.";
      return;
    }
    // data-email may be comma-separated: first = calendar organiser, all = notified.
    cfg.emails = cfg.email.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    cfg.organizer = cfg.emails[0] || cfg.email;
    var visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || cfg.tz;
    // `load` counts the times list's loads: only the newest may paint it.
    var state = { view: new Date(), date: null, slot: null, duration: cfg.durations[0] || 30, load: 0 };
    state.view.setDate(1);

    // Today's date where the host is (data-timezone), moved on by `days`, as a
    // local midnight Date like the calendar's own days. The calendar shows the
    // host's dates, so "today" has to be the host's too, wherever the visitor is.
    function hostDate(days) {
      var parts = new Intl.DateTimeFormat("en-CA", { timeZone: cfg.tz, year: "numeric", month: "2-digit", day: "2-digit" })
        .formatToParts(new Date());
      var part = function (type) { return +parts.find(function (p) { return p.type === type; }).value; };
      return new Date(part("year"), part("month") - 1, part("day") + (days || 0));
    }

    // The first moment that may be booked: midnight at the host, data-min-days-ahead days from now.
    function earliestStart() {
      var d = hostDate(cfg.minDaysAhead);
      return zonedWallToDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), 0, 0, cfg.tz).getTime();
    }

    function bookable(d) {
      var first = hostDate(cfg.minDaysAhead);
      var max = hostDate(cfg.daysAhead);
      return d >= first && d <= max && cfg.workdays.indexOf(d.getDay()) !== -1;
    }

    // Build slot Date objects for a given calendar day, in host timezone.
    function localSlots(d) {
      var sh = cfg.start.split(":"), eh = cfg.end.split(":");
      var out = [], cur = +sh[0] * 60 + +sh[1], end = +eh[0] * 60 + +eh[1];
      while (cur + state.duration <= end) {
        out.push(zonedWallToDate(d.getFullYear(), d.getMonth() + 1, d.getDate(), Math.floor(cur / 60), cur % 60, cfg.tz));
        cur += cfg.step;
      }
      // hide past times for today
      var now = Date.now();
      return out.filter(function (x) { return x.getTime() > now + 60 * 60 * 1000; });
    }

    function mailtoHref(subject, body) {
      var to = (cfg.emails.length ? cfg.emails : [cfg.organizer]).map(encodeURIComponent).join(",");
      return "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    }

    function fallbackMailHref(reason) {
      return mailtoHref(
        "Booking request: " + cfg.title,
        "Hi " + cfg.name + ",\n\nI tried to book through your website, but the calendar widget reported: " +
          reason + "\n\nCould we find a time manually?\n"
      );
    }

    function bookingMailHref(start, end, name, email, msg, reason) {
      var when = start.toLocaleString() + " - " + end.toLocaleTimeString();
      return mailtoHref(
        "Booking request: " + cfg.title,
        "New booking request\n\nName: " + name + "\nEmail: " + email +
          "\nWhen: " + when + " (" + visitorTz + ")\nDuration: " + state.duration +
          " min\nNotes: " + (msg || "-") + "\n\nWidget status: " + reason
      );
    }

    function serviceErrorHTML(message) {
      return '<div class="sfb-status sfb-status--error" role="alert">' +
        '<strong>Calendar connection needs attention</strong>' +
        '<p>' + html(message) + '</p>' +
        '<div class="sfb-actions">' +
          (cfg.organizer ? '<a class="sfb-btn sfb-btn--secondary" href="' + fallbackMailHref(message) + '">Email directly</a>' : "") +
          '<button class="sfb-link sfb-retry" type="button">Try again</button>' +
        '</div>' +
      '</div>';
    }

    function warningHTML(message) {
      return '<div class="sfb-status sfb-status--warning" role="status">' +
        '<strong>Live calendar check unavailable</strong>' +
        '<p>' + html(message) + ' Times below are working-hour suggestions only.</p>' +
      '</div>';
    }

    function bookingErrorHTML(message, start, end, name, email, msg) {
      return '<div class="sfb-status sfb-status--error sfb-booking-error" role="alert">' +
        '<strong>Booking was not confirmed</strong>' +
        '<p>' + html(message) + '</p>' +
        '<p>Please try another time.</p>' +
        (cfg.organizer ? '<div class="sfb-actions">' +
          '<a class="sfb-btn sfb-btn--secondary" href="' + bookingMailHref(start, end, name, email, msg, message) + '">Email this request</a>' +
        '</div>' : "") +
      '</div>';
    }

    function parseLiveSlots(raw) {
      if (!Array.isArray(raw)) throw new Error("Calendar service returned an invalid availability response.");
      return raw.map(function (s) {
        var d = new Date(s);
        if (isNaN(d.getTime())) throw new Error("Calendar service returned an invalid time slot.");
        return d;
      });
    }

    // Availability is a read, so a call that got no readable reply is safe to
    // send again, and worth it: an Apps Script web app now and then fails one
    // request (a cold start, a passing error on Google's side) and answers the
    // next. Up to `attempts` tries, but none started after 12 seconds, so after
    // a timeout there is one more try at most.
    async function loadAvailability(date, timeoutMs, attempts) {
      var u = cfg.api.replace(/\/$/, "") + "?action=availability&date=" + ymd(date) +
              "&duration=" + state.duration + "&tz=" + encodeURIComponent(cfg.tz);
      var started = Date.now();
      for (var attempt = 1; ; attempt++) {
        try {
          var j = await call(u, timeoutMs || (cfg.strictLive ? 10000 : 8000), true);
          if (!j || j.ok === false) throw new Error(j && j.error ? j.error : "Calendar service did not confirm availability.");
          return parseLiveSlots(j.slots);
        } catch (err) {
          var again = attempt < (attempts || 3) && retryable(err) && Date.now() - started < 12000;
          if (!again) {
            err.tries = attempt;
            err.ms = Date.now() - started;
            throw err;
          }
          await new Promise(function (resolve) { setTimeout(resolve, attempt * 700); });
        }
      }
    }

    // Transport failures only: the request went out and nothing readable came
    // back, so the write may or may not have happened. An application error
    // from the backend ("that time was just taken") is a definite answer and
    // must never reach the re-check below — the slot would look taken and we
    // would confirm a booking that was refused.
    function lostReply(err) {
      var m = err && err.message;
      return m === "timeout" || m === "network" || m === "badresponse" || m === "http";
    }

    // Worth another try: no readable reply, except an HTTP 4xx that is no
    // passing state (a removed deployment answers 404 every time).
    function retryable(err) {
      var s = err && err.status;
      return lostReply(err) && !(s >= 400 && s < 500 && s !== 408 && s !== 429);
    }

    async function slotTaken(start) {
      try {
        // Deliberately brief: this runs after a call that already spent its
        // own timeout, and the visitor is still staring at a disabled button.
        var slots = await loadAvailability(start, 6000, 1);
        return !slots.some(function (s) { return s.getTime() === start.getTime(); });
      } catch (e) {
        return false; // can't tell — leave the booking unconfirmed
      }
    }

    // What an issue report says about a failed call, so the alert names the
    // cause, not only "could not be reached": the transport that failed, the
    // HTTP status, how many tries over how long, and whether the browser
    // thought it was online.
    function failure(err, extra) {
      var out = extra || {};
      if (err && err.via) out.via = err.via;
      if (err && err.status) out.status = err.status;
      if (err && err.tries) out.tries = err.tries;
      if (err && err.ms != null) out.ms = err.ms;
      if (typeof navigator.onLine === "boolean") out.online = navigator.onLine;
      return out;
    }

    // Failure telemetry must not ride only the transport that just failed: if
    // that is what's broken, the report is never delivered and the outage
    // stays invisible. Always surface the failure locally, then try the
    // backend over fetch() or JSONP, then over sendBeacon (a POST, so it
    // survives the GET paths being blocked or served a non-JS page).
    function reportIssue(kind, message, extra) {
      var detail = { kind: kind, message: message, source: "booking-widget", extra: extra || {} };
      if (window.console && console.warn) console.warn("[sf-booking] " + kind + ": " + message, detail.extra);
      try { document.dispatchEvent(new CustomEvent("sf-booking:issue", { detail: detail })); } catch (e) {}
      if (!cfg.api) return;

      var qs = "action=issue" +
        "&kind=" + encodeURIComponent(kind) +
        "&message=" + encodeURIComponent(message) +
        "&page=" + encodeURIComponent(location.href) +
        "&extra=" + encodeURIComponent(JSON.stringify(extra || {}));
      var base = cfg.api.replace(/\/$/, "");
      call(base + "?" + qs, 5000, true).catch(function () { beaconIssue(base, qs); });
    }

    function beaconIssue(base, qs) {
      try {
        if (!navigator.sendBeacon) return;
        // Form-encoded so Apps Script populates e.parameter and doPost can route
        // on `action` without a CORS preflight.
        navigator.sendBeacon(base, new Blob([qs], { type: "application/x-www-form-urlencoded" }));
      } catch (e) {}
    }

    function quietUnavailable(message, extra) {
      reportIssue("availability", message, extra);
      try {
        document.dispatchEvent(new CustomEvent("sf-booking:unavailable", {
          detail: { message: message, source: "booking-widget", extra: extra || {} }
        }));
      } catch (e) {}
      var wrapper = el.closest("[data-booking-dependent]") || el;
      wrapper.hidden = true;
    }

    /* ---- renderers ---- */
    // Redrawing replaces every button, which would drop keyboard focus to the
    // top of the page. `focus` names what to focus once the new parts exist.
    function render(focus) {
      injectStyles();
      el.innerHTML =
        '<div class="sfb-grid">' +
          '<div class="sfb-pane sfb-cal">' + calHTML() + '</div>' +
          '<div class="sfb-pane sfb-side"></div>' +
        '</div>';
      el.querySelector(".sfb-prev").onclick = function () { shiftMonth(-1, ".sfb-prev"); };
      el.querySelector(".sfb-next").onclick = function () { shiftMonth(1, ".sfb-next"); };
      el.querySelectorAll(".sfb-day[data-d]").forEach(function (b) {
        b.onclick = function () { pickDate(new Date(b.dataset.d)); };
      });
      renderSide();
      if (focus) {
        var target = el.querySelector(focus);
        // a month button that is now disabled cannot take focus: use the other one
        if (target && target.disabled) target = el.querySelector(".sfb-ico:not([disabled])");
        if (target) target.focus({ preventScroll: true });
      }
    }

    function calHTML() {
      var y = state.view.getFullYear(), m = state.view.getMonth();
      var first = new Date(y, m, 1), startPad = (first.getDay() - cfg.weekStart + 7) % 7;
      var dow = DOW.slice(cfg.weekStart).concat(DOW.slice(0, cfg.weekStart));
      var days = new Date(y, m + 1, 0).getDate();
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var minMonth = today.getFullYear() * 12 + today.getMonth();
      var h = '<div class="sfb-head"><span class="sfb-month" aria-live="polite">' + MONTHS[m] + " " + y + '</span>' +
        '<span class="sfb-nav">' +
          '<button type="button" class="sfb-ico sfb-prev" aria-label="Previous month"' + ((y * 12 + m) <= minMonth ? " disabled" : "") + '>‹</button>' +
          '<button type="button" class="sfb-ico sfb-next" aria-label="Next month">›</button>' +
        '</span></div><div class="sfb-dow">' + dow.map(function (d) { return '<span aria-hidden="true">' + d + "</span>"; }).join("") + '</div><div class="sfb-days">';
      for (var i = 0; i < startPad; i++) h += "<span></span>";
      for (var dnum = 1; dnum <= days; dnum++) {
        var d = new Date(y, m, dnum); d.setHours(0, 0, 0, 0);
        var ok = bookable(d);
        var cls = "sfb-day" + (ok ? " has-slots" : "") +
          (state.date && ymd(state.date) === ymd(d) ? " is-active" : "") +
          (ymd(d) === ymd(today) ? " is-today" : "");
        var active = state.date && ymd(state.date) === ymd(d);
        h += '<button type="button" class="' + cls + '" data-d="' + d.toISOString() + '"' +
          ' aria-label="' + d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) + (ok ? "" : ", unavailable") + '"' +
          (ok ? ' aria-pressed="' + (active ? "true" : "false") + '"' : " disabled") +
          (ymd(d) === ymd(today) ? ' aria-current="date"' : "") + ">" + dnum + "</button>";
      }
      return h + "</div>";
    }

    function shiftMonth(n, focus) { state.view.setMonth(state.view.getMonth() + n); render(focus); }
    function pickDate(d) {
      // focus moves to the day's heading, so a screen reader hears which day
      // was picked, and the next Tab reaches its times
      state.date = d; state.slot = null; render(".sfb-slots-title");
      // On narrow (single-column) layout, scroll the slot panel into view so the user sees it
      if (window.innerWidth <= 680) {
        var side = el.querySelector(".sfb-side");
        if (side) setTimeout(function () { side.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, 30);
      }
    }

    async function renderSide() {
      var side = el.querySelector(".sfb-side");
      // Picking another day or length starts a new load while the last one may
      // still be out. Whichever reply lands last would win, so a 60-minute view
      // could show 30-minute times, or an abandoned load's error. Only the
      // newest load may paint the list or report a failure.
      var load = ++state.load;
      if (!state.date) {
        side.innerHTML = '<h' + cfg.hl + ' class="sfb-slots-title" tabindex="-1">Pick a day</h' + cfg.hl + '>' +
          '<div class="sfb-tz">Times shown in ' + visitorTz.replace(/_/g, " ") + '</div>' +
          durHTML() +
          '<div class="sfb-slotlist-wrap"><p class="sfb-empty">Select an available date to see open times.</p></div>';
        wireDurations(side);
        return;
      }
      var capturedDate = state.date;
      var label = state.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      side.innerHTML = '<h' + cfg.hl + ' class="sfb-slots-title" tabindex="-1">' + label + '</h' + cfg.hl + '>' +
        '<div class="sfb-tz">Times shown in ' + visitorTz.replace(/_/g, " ") + '</div>' +
        durHTML() + '<div class="sfb-slotlist-wrap"></div>';
      wireDurations(side);

      function current() {
        return load === state.load && !!state.date && ymd(state.date) === ymd(capturedDate);
      }

      function paintSlots(slots) {
        if (!current()) return;
        // Never offer a time before the earliest bookable day, even if an older
        // backend or a page left open overnight would allow it.
        var earliest = earliestStart();
        slots = slots.filter(function (s) { return s.getTime() >= earliest; });
        var wrap = side.querySelector(".sfb-slotlist-wrap");
        if (!wrap) return;
        if (!slots.length) {
          wrap.innerHTML = '<p class="sfb-empty">No open times this day. Try another date.</p>';
          return;
        }
        var html = '<div class="sfb-slotlist">';
        slots.forEach(function (s, i) {
          html += '<button type="button" class="sfb-slot" data-i="' + i + '">' +
            s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</button>";
        });
        html += "</div>";
        wrap.innerHTML = html;
        wrap.querySelectorAll(".sfb-slot").forEach(function (b) {
          b.onclick = function () { state.slot = slots[+b.dataset.i]; renderForm(); };
        });
      }

      if (cfg.api && cfg.strictLive) {
        var wrap = side.querySelector(".sfb-slotlist-wrap");
        if (wrap) wrap.innerHTML = '<p class="sfb-loading" role="status">Checking live calendar availability…</p>';
        try {
          paintSlots(await loadAvailability(state.date));
        } catch (e) {
          if (!current()) return;
          var strictMessage = readableError(e);
          var strictContext = failure(e, { date: ymd(capturedDate), duration: state.duration, strictLive: true });
          if (cfg.failureMode === "hide") {
            quietUnavailable(strictMessage, strictContext);
            return;
          }
          reportIssue("availability", strictMessage, strictContext);
          if (wrap) {
            wrap.innerHTML = serviceErrorHTML(strictMessage);
            var retry = wrap.querySelector(".sfb-retry");
            if (retry) retry.onclick = renderSide;
          }
        }
        return;
      }

      paintSlots(localSlots(state.date));

      if (cfg.api) {
        try {
          paintSlots(await loadAvailability(state.date));
        } catch (e) {
          if (!current()) return;
          var fallbackWrap = side.querySelector(".sfb-slotlist-wrap");
          var fallbackMessage = readableError(e);
          reportIssue("availability", fallbackMessage, failure(e, { date: ymd(capturedDate), duration: state.duration, strictLive: false }));
          if (fallbackWrap) fallbackWrap.insertAdjacentHTML("afterbegin", warningHTML(fallbackMessage));
        }
      }
    }

    function durHTML() {
      if (cfg.durations.length < 2) return "";
      return '<div class="sfb-durations">' + cfg.durations.map(function (d) {
        return '<button type="button" class="sfb-dur' + (d === state.duration ? " is-active" : "") + '" data-dur="' + d + '">' + d + " min</button>";
      }).join("") + "</div>";
    }
    function wireDurations(scope) {
      scope.querySelectorAll(".sfb-dur").forEach(function (b) {
        b.onclick = function () { state.duration = +b.dataset.dur; state.slot = null; renderSide(); };
      });
    }

    // The form's check: whether name and email will do, and a message naming
    // just the ones that won't.
    function checkForm(side) {
      var nameOk = !!side.querySelector("#sfb-n").value.trim();
      var emailOk = /.+@.+\..+/.test(side.querySelector("#sfb-e").value.trim());
      return {
        nameOk: nameOk,
        emailOk: emailOk,
        message: !nameOk && !emailOk ? "Please enter your name and a valid email."
          : !nameOk ? "Please enter your name." : "Please enter a valid email."
      };
    }

    function renderForm() {
      var side = el.querySelector(".sfb-side");
      var start = state.slot;
      var end = new Date(start.getTime() + state.duration * 60000);
      var when = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + ", " +
                 start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "–" +
                 end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      side.innerHTML =
        '<button type="button" class="sfb-link" style="text-align:left;width:auto;padding:.2rem 0;margin-bottom:.6rem">‹ Back to times</button>' +
        '<div class="sfb-summary"><span aria-hidden="true">📅</span><div><b>' + esc(cfg.title) + '</b><br>' + when + ' · ' + state.duration + ' min</div></div>' +
        '<form class="sfb-form" novalidate>' +
        '<div class="sfb-field"><label for="sfb-n">Your name</label><input id="sfb-n" autocomplete="name" required></div>' +
        '<div class="sfb-field"><label for="sfb-e">Your email</label><input id="sfb-e" type="email" autocomplete="email" inputmode="email" required></div>' +
        '<div class="sfb-field"><label for="sfb-m">' + html(cfg.messageLabel) + '</label><textarea id="sfb-m" rows="3"></textarea></div>' +
        '<button type="submit" class="sfb-btn" id="sfb-go">Confirm booking</button>' +
        '</form>';
      side.querySelector(".sfb-link").onclick = function () {
        renderSide().then(function () {
          var t = side.querySelector(".sfb-slot") || side.querySelector(".sfb-slots-title");
          if (t) t.focus();
        });
      };
      side.querySelector(".sfb-form").onsubmit = function (e) {
        e.preventDefault();
        var go = side.querySelector("#sfb-go");
        if (!go.disabled) submit(side, start, end);
      };
      // A failed check marks the fields and shows "Check the form". Until the
      // next press of the button nothing re-checked them, so a field filled in
      // afterwards stayed red and the message stayed up. Once a check has
      // failed, check again as the visitor types.
      side.querySelector(".sfb-form").addEventListener("input", function () {
        var box = side.querySelector(".sfb-form-check");
        if (!box) return;
        var c = checkForm(side);
        side.querySelector("#sfb-n").setAttribute("aria-invalid", c.nameOk ? "false" : "true");
        side.querySelector("#sfb-e").setAttribute("aria-invalid", c.emailOk ? "false" : "true");
        if (c.nameOk && c.emailOk) { box.remove(); return; }
        var p = box.querySelector("p");
        if (p.textContent !== c.message) p.textContent = c.message;
      });
      side.querySelector("#sfb-n").focus({ preventScroll: window.innerWidth > 680 });
    }

    async function submit(side, start, end) {
      var name = side.querySelector("#sfb-n").value.trim();
      var email = side.querySelector("#sfb-e").value.trim();
      var msg = side.querySelector("#sfb-m").value.trim();
      var oldError = side.querySelector(".sfb-booking-error");
      if (oldError) oldError.remove();
      var c = checkForm(side);
      side.querySelector("#sfb-n").setAttribute("aria-invalid", c.nameOk ? "false" : "true");
      side.querySelector("#sfb-e").setAttribute("aria-invalid", c.emailOk ? "false" : "true");
      if (!c.nameOk || !c.emailOk) {
        side.querySelector("#sfb-go").insertAdjacentHTML(
          "beforebegin",
          '<div class="sfb-status sfb-status--error sfb-booking-error sfb-form-check" role="alert"><strong>Check the form</strong><p>' + c.message + '</p></div>'
        );
        side.querySelector(c.nameOk ? "#sfb-e" : "#sfb-n").focus();
        return;
      }
      var btn = side.querySelector("#sfb-go"); btn.disabled = true; btn.textContent = "Booking…";

      if (cfg.api) {
        // Book with a GET to doGet, over whichever transport this page has
        // been reaching the backend with. The backend creates the event and
        // emails the invites.
        var u = cfg.api.replace(/\/$/, "") + "?action=book" +
          "&name=" + encodeURIComponent(name) +
          "&email=" + encodeURIComponent(email) +
          "&message=" + encodeURIComponent(msg) +
          "&title=" + encodeURIComponent(cfg.title) +
          "&start=" + encodeURIComponent(start.toISOString()) +
          "&end=" + encodeURIComponent(end.toISOString()) +
          "&duration=" + state.duration +
          // Single address: data-email may list several, but only the first is
          // the calendar organiser. Sending the raw comma-joined string here
          // hands the backend something it cannot use as one mailbox.
          (cfg.organizer ? "&host=" + encodeURIComponent(cfg.organizer) : "") +
          "&timezone=" + encodeURIComponent(cfg.tz);
        try {
          // Booking writes the event and dispatches invites, so it is the
          // slowest call the widget makes — give it longer than availability.
          // No fallback and no retry: a lost reply is settled by the re-check.
          var res = await call(u, 20000, false);
          if (!res || !res.booked) throw new Error(res && res.error ? res.error : "Booking failed");
          success(start, end, name, email, msg, true);
        } catch (e) {
          var bookingMessage = readableError(e);
          // Silence is not a refusal. When the reply is lost rather than
          // returned, the backend may still have created the event — reporting
          // that as a failure invites a retry that double-books. Re-check the
          // day: if the slot we asked for is gone, the booking landed.
          var lost = lostReply(e);
          if (lost) btn.textContent = "Checking…";
          if (lost && await slotTaken(start)) {
            reportIssue("booking-late-ack", bookingMessage, failure(e, {
              start: start.toISOString(),
              end: end.toISOString(),
              duration: state.duration
            }));
            success(start, end, name, email, msg, true, true);
            return;
          }
          btn.disabled = false; btn.textContent = "Confirm booking";
          reportIssue("booking", bookingMessage, failure(e, {
            start: start.toISOString(),
            end: end.toISOString(),
            duration: state.duration
          }));
          btn.insertAdjacentHTML("beforebegin", bookingErrorHTML(bookingMessage, start, end, name, email, msg));
        }
        return;
      }
      // No backend configured: notify host by email + give attendee an .ics invite.
      notifyHost(start, end, name, email, msg);
      success(start, end, name, email, msg, false);
    }

    function buildICS(start, end, name, email, msg) {
      return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SF Booking//EN","CALSCALE:GREGORIAN","METHOD:" + (cfg.organizer ? "REQUEST" : "PUBLISH"),
        "BEGIN:VEVENT","UID:" + Date.now() + "@sf-booking","DTSTAMP:" + icsStamp(new Date()),
        "DTSTART:" + icsStamp(start),"DTEND:" + icsStamp(end),
        "SUMMARY:" + esc(cfg.title) + " — " + esc(name),
        "DESCRIPTION:" + esc(msg ? msg.replace(/\n/g, "\\n") : "Booked via website"),
        ...(cfg.organizer ? [
          "ORGANIZER;CN=" + esc(cfg.name) + ":mailto:" + esc(cfg.organizer),
          "ATTENDEE;CN=" + esc(name) + ";RSVP=TRUE:mailto:" + esc(email)
        ] : []),
        "STATUS:CONFIRMED","END:VEVENT","END:VCALENDAR"].join("\r\n");
    }
    function downloadICS(start, end, name, email, msg) {
      var blob = new Blob([buildICS(start, end, name, email, msg)], { type: "text/calendar" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "booking.ics"; document.body.appendChild(a); a.click(); a.remove();
    }
    function notifyHost(start, end, name, email, msg) {
      var when = start.toLocaleString() + " – " + end.toLocaleTimeString();
      var body = "New booking request%0D%0A%0D%0A" +
        "Name: " + encodeURIComponent(name) + "%0D%0A" +
        "Email: " + encodeURIComponent(email) + "%0D%0A" +
        "When: " + encodeURIComponent(when) + " (" + encodeURIComponent(visitorTz) + ")%0D%0A" +
        "Duration: " + state.duration + " min%0D%0A" +
        "Notes: " + encodeURIComponent(msg || "—");
      var href = "mailto:" + cfg.emails.join(",") + "?subject=" +
        encodeURIComponent("Booking request: " + cfg.title) + "&body=" + body;
      var w = window.open(href, "_blank"); if (!w) location.href = href;
    }

    // `late` marks a booking confirmed by re-checking availability rather than
    // by the backend's own reply — the event is there, but say so plainly
    // instead of implying a clean acknowledgement.
    function success(start, end, name, email, msg, live, late) {
      el.innerHTML = '<div class="sfb-success">' +
        '<div class="sfb-check" aria-hidden="true">✓</div>' +
        '<h' + cfg.hl + ' class="sfb-done" tabindex="-1">' + (live ? "You're booked!" : "Booking requested!") + '</h' + cfg.hl + '>' +
        '<p>' + start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
          " at " + start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</p>' +
        '<p>' + (live
          ? "A calendar invite is on its way to " + esc(email) + "."
          : "Add it to your calendar below — " + esc(cfg.name) + " has been emailed to confirm.") + '</p>' +
        (late
          ? '<p>The confirmation came back late, but your time is held. If the invite hasn’t arrived in a few minutes, check your spam folder.</p>'
          : "") +
        '<button type="button" class="sfb-btn" id="sfb-ics" style="max-width:260px;margin:1.2rem auto 0">Add to my calendar (.ics)</button>' +
        '<button type="button" class="sfb-link" id="sfb-again">Book another time</button>' +
      '</div>';
      el.querySelector("#sfb-ics").onclick = function () { downloadICS(start, end, name, email, msg); };
      el.querySelector("#sfb-again").onclick = function () { state.date = null; state.slot = null; render(".sfb-day.has-slots"); };
      el.querySelector(".sfb-done").focus();
    }

    render();
  }

  function initAll() {
    document.querySelectorAll(".sf-booking:not([data-sfb-init])").forEach(function (el) {
      el.setAttribute("data-sfb-init", "1");
      try { Booking(el); } catch (e) { console.error("SF Booking:", e); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  window.SFBooking = { init: initAll };
})();
