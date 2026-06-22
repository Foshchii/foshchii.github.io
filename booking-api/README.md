# Booking backend (optional, free)

Your booking widget (`assets/js/booking-widget.js`) works **with no backend at
all** — it shows your working-hours slots and, on confirm, emails you the
request and hands the visitor a calendar invite (`.ics`).

Add a backend only when you want the next level:

| Feature                                    | No backend | With backend |
| ------------------------------------------ | :--------: | :----------: |
| Beautiful, reusable booking UI             |     ✅     |      ✅      |
| Visitor gets a calendar invite (`.ics`)    |     ✅     |      ✅      |
| You get emailed about the request          |     ✅     |      ✅      |
| Only shows times you're **actually free**  |     ❌     |      ✅      |
| Writes the event to your calendar for you  |     ❌     |      ✅      |
| Prevents double-booking                    |     ❌     |      ✅      |

Everything below is free.

---

## Option A — Google Calendar (recommended, easiest)

Uses **Google Apps Script** (`google-apps-script.gs`). It runs as *you*, so it
can read your free/busy times and create events with **no API keys and no
server**.

1. Go to <https://script.google.com> → **New project**.
2. Delete the sample code and paste the contents of `google-apps-script.gs`.
3. Edit the `CONFIG` block (calendar, timezone, working hours).
4. **Project Settings** (gear icon) → set the **time zone** to match `CONFIG.timezone`.
5. **Deploy → New deployment → Web app**
   * *Execute as:* **Me**
   * *Who has access:* **Anyone**
6. Authorize when prompted, then copy the **Web app URL** (ends in `/exec`).
7. In `contact.html`, set it on the widget:
   ```html
   <div class="sf-booking" ... data-api="https://script.google.com/macros/s/XXXX/exec"></div>
   ```

That's it — the widget now shows live availability and books straight into your
calendar.

---

## Option B — Outlook / Microsoft 365, iCloud, or any calendar

The widget talks to **any** backend that implements the two endpoints below, so
you can host it on a free serverless platform (e.g. **Cloudflare Workers**,
Vercel, or Netlify functions) and connect it to:

* **Outlook / Microsoft 365** → Microsoft Graph API (`/me/calendar`)
* **iCloud** → CalDAV
* **Google** → Google Calendar API (service account)

Ping me (or open an issue) and I'll add a ready-to-deploy Cloudflare Worker for
your provider. The contract it must satisfy is:

### `GET  {api}/availability?date=YYYY-MM-DD&duration=30&tz=Area/City`
```json
{ "slots": ["2026-07-01T07:00:00.000Z", "2026-07-01T07:30:00.000Z"] }
```
Return slot **start times as ISO-8601 UTC strings** — only the ones you're free.

### `POST {api}/book`   (body is JSON sent as text/plain to avoid CORS preflight)
```json
{
  "name": "Jane Doe", "email": "jane@acme.com", "message": "Re: PM role",
  "title": "Intro call", "start": "2026-07-01T07:00:00.000Z",
  "end": "2026-07-01T07:30:00.000Z", "duration": 30,
  "host": "you@example.com", "timezone": "Europe/Copenhagen"
}
```
Respond `{"ok": true}` on success, or `{"ok": false, "error": "..."}`.

> **CORS:** allow your site's origin (or `*`) and the `GET`/`POST` methods. The
> widget intentionally sends the POST body as plain text so browsers skip the
> preflight — read it with `await request.text()` then `JSON.parse(...)`.

---

## Reusing the widget on other sites

The widget is self-contained. On any other site, add:

```html
<div class="sf-booking"
     data-name="Your Name" data-email="you@example.com"
     data-title="Intro call" data-durations="30,45,60"
     data-timezone="Europe/Copenhagen"
     data-api="https://script.google.com/macros/s/XXXX/exec"></div>
<script src="https://foshchii.github.io/sv_resume/assets/js/booking-widget.js" defer></script>
```

One calendar backend can serve all of your sites.
