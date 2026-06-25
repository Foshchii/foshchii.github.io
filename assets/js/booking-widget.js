/* =========================================================================
   SF Booking Widget — a tiny, dependency-free, self-hosted scheduler.
   "Your own Calendly", reusable on any website.

   USAGE (drop into any page):
     <div class="sf-booking"
          data-name="Sviatoslav Foshchii"
          data-email="you@example.com"
          data-title="Intro call"
          data-durations="30,45,60"      // minutes, first is default
          data-timezone="Europe/Copenhagen"
          data-workdays="1,2,3,4,5"      // 0=Sun … 6=Sat
          data-start="09:00" data-end="17:00"
          data-days-ahead="21"
          data-api="">                   // optional backend base URL (see /booking-api)
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
  .sf-booking{--sfb-accent:var(--brand,#4f46e5);--sfb-accent-ink:#fff;
    --sfb-bg:var(--surface,#fff);--sfb-alt:var(--bg-alt,#f8fafc);
    --sfb-text:var(--text,#0f172a);--sfb-muted:var(--text-muted,#475569);
    --sfb-border:var(--border,#e2e8f0);--sfb-radius:14px;
    font-family:inherit;color:var(--sfb-text);background:var(--sfb-bg);
    border:1px solid var(--sfb-border);border-radius:var(--sfb-radius);
    overflow:hidden;box-shadow:0 4px 12px rgba(15,23,42,.06)}
  .sf-booking *{box-sizing:border-box}
  .sfb-grid{display:grid;grid-template-columns:1.15fr 1fr;min-height:440px}
  .sfb-pane{padding:1.4rem 1.5rem}
  .sfb-cal{border-right:1px solid var(--sfb-border);background:var(--sfb-alt)}
  .sfb-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem}
  .sfb-month{font-weight:700;font-size:1.02rem}
  .sfb-nav{display:flex;gap:.4rem}
  .sfb-ico{width:34px;height:34px;display:grid;place-items:center;border:1px solid var(--sfb-border);
    background:var(--sfb-bg);border-radius:9px;cursor:pointer;color:var(--sfb-muted);font-size:1rem;line-height:1}
  .sfb-ico:hover:not([disabled]){color:var(--sfb-accent);border-color:var(--sfb-accent)}
  .sfb-ico[disabled]{opacity:.35;cursor:not-allowed}
  .sfb-dow,.sfb-days{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .sfb-dow span{text-align:center;font-size:.72rem;font-weight:600;color:var(--sfb-muted);
    text-transform:uppercase;letter-spacing:.05em;padding:.3rem 0}
  .sfb-day{aspect-ratio:1;display:grid;place-items:center;border:0;border-radius:9px;cursor:pointer;
    background:transparent;color:var(--sfb-text);font:inherit;font-size:.9rem;font-weight:500;position:relative}
  .sfb-day:hover:not([disabled]){background:var(--sfb-bg);box-shadow:inset 0 0 0 1px var(--sfb-accent)}
  .sfb-day[disabled]{color:var(--sfb-muted);opacity:.35;cursor:default}
  .sfb-day.is-today{box-shadow:inset 0 0 0 1px var(--sfb-border)}
  .sfb-day.is-active{background:var(--sfb-accent);color:var(--sfb-accent-ink)}
  .sfb-day.has-slots::after{content:"";position:absolute;bottom:6px;width:4px;height:4px;border-radius:50%;background:var(--sfb-accent)}
  .sfb-day.is-active.has-slots::after{background:#fff}
  .sfb-slots-title{font-weight:700;margin-bottom:.2rem}
  .sfb-tz{font-size:.78rem;color:var(--sfb-muted);margin-bottom:1rem}
  .sfb-durations{display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:1rem}
  .sfb-dur{padding:.35rem .7rem;border:1px solid var(--sfb-border);background:var(--sfb-bg);border-radius:999px;
    cursor:pointer;font:inherit;font-size:.82rem;color:var(--sfb-muted)}
  .sfb-dur.is-active{border-color:var(--sfb-accent);color:var(--sfb-accent);font-weight:600}
  .sfb-slotlist{display:grid;grid-template-columns:repeat(2,1fr);gap:.5rem;max-height:300px;overflow:auto;padding-right:2px}
  .sfb-slot{padding:.6rem;border:1px solid var(--sfb-border);background:var(--sfb-bg);border-radius:10px;
    cursor:pointer;font:inherit;font-weight:600;font-size:.9rem;color:var(--sfb-text);transition:.15s}
  .sfb-slot:hover{border-color:var(--sfb-accent);color:var(--sfb-accent);transform:translateY(-1px)}
  .sfb-empty,.sfb-loading{color:var(--sfb-muted);font-size:.9rem;padding:1.5rem 0;text-align:center}
  .sfb-field{margin-bottom:.85rem}
  .sfb-field label{display:block;font-size:.82rem;font-weight:600;margin-bottom:.3rem}
  .sfb-field input,.sfb-field textarea{width:100%;font:inherit;padding:.6rem .75rem;color:var(--sfb-text);
    background:var(--sfb-bg);border:1px solid var(--sfb-border);border-radius:9px}
  .sfb-field input:focus,.sfb-field textarea:focus{outline:none;border-color:var(--sfb-accent);
    box-shadow:0 0 0 3px color-mix(in srgb,var(--sfb-accent) 30%,transparent)}
  .sfb-summary{background:var(--sfb-alt);border:1px solid var(--sfb-border);border-radius:10px;
    padding:.75rem .9rem;font-size:.88rem;margin-bottom:1rem;display:flex;gap:.6rem;align-items:flex-start}
  .sfb-summary b{color:var(--sfb-text)}
  .sfb-btn{width:100%;padding:.75rem 1rem;border:0;border-radius:999px;cursor:pointer;font:inherit;
    font-weight:600;background:var(--sfb-accent);color:var(--sfb-accent-ink);transition:.15s}
  .sfb-btn:hover{filter:brightness(1.05);transform:translateY(-1px)}
  .sfb-btn:disabled{opacity:.6;cursor:not-allowed;transform:none}
  .sfb-link{background:none;border:0;color:var(--sfb-muted);font:inherit;font-size:.85rem;cursor:pointer;
    padding:.6rem;width:100%;margin-top:.3rem}
  .sfb-link:hover{color:var(--sfb-accent)}
  .sfb-success{padding:2.5rem 1.5rem;text-align:center}
  .sfb-check{width:60px;height:60px;border-radius:50%;background:#22c55e;color:#fff;display:grid;place-items:center;
    margin:0 auto 1.1rem;font-size:1.8rem}
  .sfb-success h3{margin:0 0 .4rem;font-size:1.25rem}
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

  // Call an Apps Script web app cross-origin. Apps Script sends no CORS headers
  // and 302-redirects, so fetch() can't read its response — but a JSONP
  // <script> load can. Resolves with the object the backend returns.
  function jsonp(url, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var cb = "sfb_cb_" + Date.now() + "_" + Math.floor(Math.random() * 1e6);
      var s = document.createElement("script");
      var timer = setTimeout(function () { cleanup(); reject(new Error("timeout")); }, timeoutMs || 20000);
      function cleanup() {
        clearTimeout(timer);
        try { delete window[cb]; } catch (e) { window[cb] = undefined; }
        if (s && s.parentNode) s.parentNode.removeChild(s);
      }
      window[cb] = function (data) { cleanup(); resolve(data); };
      s.onerror = function () { cleanup(); reject(new Error("network")); };
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
      api: (el.dataset.api || "").trim()
    };
    // data-email may be comma-separated: first = calendar organiser, all = notified.
    cfg.emails = cfg.email.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    cfg.organizer = cfg.emails[0] || cfg.email;
    var visitorTz = Intl.DateTimeFormat().resolvedOptions().timeZone || cfg.tz;
    var state = { view: new Date(), date: null, slot: null, duration: cfg.durations[0] || 30 };
    state.view.setDate(1);

    function bookable(d) {
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var max = new Date(today); max.setDate(max.getDate() + cfg.daysAhead);
      return d >= today && d <= max && cfg.workdays.indexOf(d.getDay()) !== -1;
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

    async function fetchSlots(d) {
      if (!cfg.api) return localSlots(d);
      try {
        var u = cfg.api.replace(/\/$/, "") + "?action=availability&date=" + ymd(d) +
                "&duration=" + state.duration + "&tz=" + encodeURIComponent(cfg.tz);
        var j = await jsonp(u);
        if (!j || !j.slots) return localSlots(d);   // backend not reachable → working-hours fallback
        return j.slots.map(function (s) { return new Date(s); });
      } catch (e) { return localSlots(d); }
    }

    /* ---- renderers ---- */
    function render() {
      injectStyles();
      el.innerHTML =
        '<div class="sfb-grid">' +
          '<div class="sfb-pane sfb-cal">' + calHTML() + '</div>' +
          '<div class="sfb-pane sfb-side"></div>' +
        '</div>';
      el.querySelector(".sfb-prev").onclick = function () { shiftMonth(-1); };
      el.querySelector(".sfb-next").onclick = function () { shiftMonth(1); };
      el.querySelectorAll(".sfb-day[data-d]").forEach(function (b) {
        b.onclick = function () { pickDate(new Date(b.dataset.d)); };
      });
      renderSide();
    }

    function calHTML() {
      var y = state.view.getFullYear(), m = state.view.getMonth();
      var first = new Date(y, m, 1), startPad = first.getDay();
      var days = new Date(y, m + 1, 0).getDate();
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var minMonth = today.getFullYear() * 12 + today.getMonth();
      var h = '<div class="sfb-head"><span class="sfb-month">' + MONTHS[m] + " " + y + '</span>' +
        '<span class="sfb-nav">' +
          '<button class="sfb-ico sfb-prev" aria-label="Previous month"' + ((y * 12 + m) <= minMonth ? " disabled" : "") + '>‹</button>' +
          '<button class="sfb-ico sfb-next" aria-label="Next month">›</button>' +
        '</span></div><div class="sfb-dow">' + DOW.map(function (d) { return "<span>" + d + "</span>"; }).join("") + '</div><div class="sfb-days">';
      for (var i = 0; i < startPad; i++) h += "<span></span>";
      for (var dnum = 1; dnum <= days; dnum++) {
        var d = new Date(y, m, dnum); d.setHours(0, 0, 0, 0);
        var ok = bookable(d);
        var cls = "sfb-day" + (ok ? " has-slots" : "") +
          (state.date && ymd(state.date) === ymd(d) ? " is-active" : "") +
          (ymd(d) === ymd(today) ? " is-today" : "");
        h += '<button class="' + cls + '" data-d="' + d.toISOString() + '"' + (ok ? "" : " disabled") + ">" + dnum + "</button>";
      }
      return h + "</div>";
    }

    function shiftMonth(n) { state.view.setMonth(state.view.getMonth() + n); render(); }
    function pickDate(d) { state.date = d; state.slot = null; render(); }

    async function renderSide() {
      var side = el.querySelector(".sfb-side");
      if (!state.date) {
        side.innerHTML = '<div class="sfb-slots-title">Pick a day</div>' +
          '<p class="sfb-empty">Select an available date on the left to see open times.</p>' +
          durHTML();
        wireDurations(side);
        return;
      }
      var label = state.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
      side.innerHTML = '<div class="sfb-slots-title">' + label + '</div>' +
        '<div class="sfb-tz">Times shown in ' + visitorTz.replace(/_/g, " ") + '</div>' +
        durHTML() + '<div class="sfb-loading">Loading times…</div>';
      wireDurations(side);
      var slots = await fetchSlots(state.date);
      var box = '<div class="sfb-slotlist">';
      if (!slots.length) {
        box = '<p class="sfb-empty">No open times this day. Try another date.</p>';
      } else {
        slots.forEach(function (s, i) {
          box += '<button class="sfb-slot" data-i="' + i + '">' +
            s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "</button>";
        });
        box += "</div>";
      }
      var loading = side.querySelector(".sfb-loading");
      if (loading) loading.outerHTML = box;
      side.querySelectorAll(".sfb-slot").forEach(function (b) {
        b.onclick = function () { state.slot = slots[+b.dataset.i]; renderForm(); };
      });
    }

    function durHTML() {
      if (cfg.durations.length < 2) return "";
      return '<div class="sfb-durations">' + cfg.durations.map(function (d) {
        return '<button class="sfb-dur' + (d === state.duration ? " is-active" : "") + '" data-dur="' + d + '">' + d + " min</button>";
      }).join("") + "</div>";
    }
    function wireDurations(scope) {
      scope.querySelectorAll(".sfb-dur").forEach(function (b) {
        b.onclick = function () { state.duration = +b.dataset.dur; state.slot = null; renderSide(); };
      });
    }

    function renderForm() {
      var side = el.querySelector(".sfb-side");
      var start = state.slot;
      var end = new Date(start.getTime() + state.duration * 60000);
      var when = start.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) + ", " +
                 start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + "–" +
                 end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      side.innerHTML =
        '<button class="sfb-link" style="text-align:left;width:auto;padding:.2rem 0;margin-bottom:.6rem">‹ Back to times</button>' +
        '<div class="sfb-summary"><span>📅</span><div><b>' + esc(cfg.title) + '</b><br>' + when + ' · ' + state.duration + ' min</div></div>' +
        '<div class="sfb-field"><label>Your name</label><input id="sfb-n" autocomplete="name" required></div>' +
        '<div class="sfb-field"><label>Your email</label><input id="sfb-e" type="email" autocomplete="email" required></div>' +
        '<div class="sfb-field"><label>What\'s it about? (optional)</label><textarea id="sfb-m" rows="3"></textarea></div>' +
        '<button class="sfb-btn" id="sfb-go">Confirm booking</button>';
      side.querySelector(".sfb-link").onclick = renderSide;
      side.querySelector("#sfb-go").onclick = function () { submit(side, start, end); };
    }

    async function submit(side, start, end) {
      var name = side.querySelector("#sfb-n").value.trim();
      var email = side.querySelector("#sfb-e").value.trim();
      var msg = side.querySelector("#sfb-m").value.trim();
      if (!name || !/.+@.+\..+/.test(email)) { alert("Please enter your name and a valid email."); return; }
      var btn = side.querySelector("#sfb-go"); btn.disabled = true; btn.textContent = "Booking…";

      if (cfg.api) {
        // Book via JSONP GET. A readable fetch() to Apps Script is impossible
        // (no CORS + 302 redirect), but a <script> load reaches doGet and
        // returns the result. The backend creates the event and emails invites.
        var u = cfg.api.replace(/\/$/, "") + "?action=book" +
          "&name=" + encodeURIComponent(name) +
          "&email=" + encodeURIComponent(email) +
          "&message=" + encodeURIComponent(msg) +
          "&title=" + encodeURIComponent(cfg.title) +
          "&start=" + encodeURIComponent(start.toISOString()) +
          "&end=" + encodeURIComponent(end.toISOString()) +
          "&duration=" + state.duration +
          "&host=" + encodeURIComponent(cfg.email) +
          "&timezone=" + encodeURIComponent(cfg.tz);
        try {
          var res = await jsonp(u);
          if (!res || !res.booked) throw new Error(res && res.error ? res.error : "Booking failed");
          success(start, end, name, email, msg, true);
        } catch (e) {
          btn.disabled = false; btn.textContent = "Confirm booking";
          alert("Sorry — that booking couldn't be completed (" + e.message + ").\n" +
                "Please pick another time, or email " + cfg.organizer + " directly.");
        }
        return;
      }
      // No backend configured: notify host by email + give attendee an .ics invite.
      notifyHost(start, end, name, email, msg);
      success(start, end, name, email, msg, false);
    }

    function buildICS(start, end, name, email, msg) {
      return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//SF Booking//EN","CALSCALE:GREGORIAN","METHOD:REQUEST",
        "BEGIN:VEVENT","UID:" + Date.now() + "@sf-booking","DTSTAMP:" + icsStamp(new Date()),
        "DTSTART:" + icsStamp(start),"DTEND:" + icsStamp(end),
        "SUMMARY:" + esc(cfg.title) + " — " + esc(name),
        "DESCRIPTION:" + esc(msg ? msg.replace(/\n/g, "\\n") : "Booked via website"),
        "ORGANIZER;CN=" + esc(cfg.name) + ":mailto:" + esc(cfg.organizer),
        "ATTENDEE;CN=" + esc(name) + ";RSVP=TRUE:mailto:" + esc(email),
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

    function success(start, end, name, email, msg, live) {
      el.innerHTML = '<div class="sfb-success">' +
        '<div class="sfb-check">✓</div>' +
        '<h3>' + (live ? "You're booked!" : "Booking requested!") + '</h3>' +
        '<p>' + start.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) +
          " at " + start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + '</p>' +
        '<p>' + (live
          ? "A calendar invite is on its way to " + esc(email) + "."
          : "Add it to your calendar below — " + esc(cfg.name) + " has been emailed to confirm.") + '</p>' +
        '<button class="sfb-btn" id="sfb-ics" style="max-width:260px;margin:1.2rem auto 0">Add to my calendar (.ics)</button>' +
        '<button class="sfb-link" id="sfb-again">Book another time</button>' +
      '</div>';
      el.querySelector("#sfb-ics").onclick = function () { downloadICS(start, end, name, email, msg); };
      el.querySelector("#sfb-again").onclick = function () { state.date = null; state.slot = null; render(); };
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
