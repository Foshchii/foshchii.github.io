# Booking backend (optional, free) — Google + iCloud

Your booking widget (`assets/js/booking-widget.js`) works **with no backend at
all** — it shows your working-hours slots and, on confirm, emails you the
request and hands the visitor a calendar invite (`.ics`).

Add the backend when you want it to read your **real** availability from **both
your Google and iCloud calendars** and book into both. It's free.

| Feature                                         | No backend | With backend |
| ----------------------------------------------- | :--------: | :----------: |
| Beautiful, reusable booking UI                  |     ✅     |      ✅      |
| Visitor gets a calendar invite (`.ics`)         |     ✅     |      ✅      |
| You get emailed about the request               |     ✅     |      ✅      |
| Shows only times you're free on **Google**      |     ❌     |      ✅      |
| Shows only times you're free on **iCloud**      |     ❌     |      ✅      |
| Writes the booking to your calendar(s)          |     ❌     |      ✅      |

## How it works (and why)

The backend is a **Google Apps Script** (`google-apps-script.gs`). It runs as
*you*, so it reads/writes your Google Calendar with no API keys. For iCloud it
reads your **published calendar `.ics` feed** and creates the booking with your
iCloud address as a guest, so the event lands on your iCloud calendar too.

> Why not pure CalDAV for iCloud? Apps Script can't send the `PROPFIND`/`REPORT`
> methods CalDAV needs. The published-feed + guest-invite approach is the
> reliable, free way to cover iCloud from Apps Script. (If you'd rather have full
> two-way CalDAV sync, I can give you a free Cloudflare Worker instead — just ask.)

## Setup (~10 minutes)

### 1. Create the script
1. Go to <https://script.google.com> → **New project**.
2. Delete the sample code, paste all of `google-apps-script.gs`.
3. **Project Settings** (⚙) → set the **time zone** to `Europe/Copenhagen`
   (must match `CONFIG.timezone`).

### 2. Connect iCloud (so its busy times are respected)
1. On a Mac: **Calendar app → right-click the calendar → Share Calendar →
   Public Calendar**, copy the `webcal://…` link.
   On iCloud.com: **Calendar → ⚲ share icon → Public Calendar**, copy the link.
2. In Apps Script: **Project Settings → Script properties → Add property**
   * Name: `ICLOUD_ICS_URL`
   * Value: the link you copied (the script auto-converts `webcal://` → `https://`).
3. Open `CONFIG.icloudGuestEmail` in the script and confirm it's your iCloud
   address (`sviatoslav.foshchii@icloud.com`) so bookings are pushed there.

> Privacy note: a published iCloud calendar is readable by anyone who has the
> (long, unguessable) link. Consider publishing a dedicated "Availability"
> calendar rather than your personal one.

### 3. Test it
In the Apps Script editor, run `testIcloudFeed` then `testAvailabilityTomorrow`
(**View → Logs**). Authorize when prompted. You should see your busy blocks and
the free slots.

### 4. Deploy & connect
1. **Deploy → New deployment → Web app** — *Execute as:* **Me**, *Who has
   access:* **Anyone**.
2. Copy the **/exec URL**.
3. In `contact.html`, set it on the widget:
   ```html
   <div class="sf-booking" ... data-api="https://script.google.com/macros/s/XXXX/exec"></div>
   ```

Done — the widget now merges both calendars and books into both.

---

## Endpoint contract (if you ever swap in another backend)

Any backend exposing these two endpoints works with the widget:

**`GET {api}/availability?date=YYYY-MM-DD&duration=30&tz=Area/City`**
```json
{ "slots": ["2026-07-01T07:00:00.000Z", "2026-07-01T07:30:00.000Z"] }
```
Return free slot start times as ISO-8601 UTC strings.

**`POST {api}/book`**  (body sent as text/plain to avoid CORS preflight)
```json
{ "name":"Jane Doe","email":"jane@acme.com","message":"Re: PM role",
  "title":"Intro call","start":"2026-07-01T07:00:00.000Z",
  "end":"2026-07-01T07:30:00.000Z","duration":30,
  "host":"you@example.com","timezone":"Europe/Copenhagen" }
```
Respond `{"ok": true}` or `{"ok": false, "error": "..."}`.

## Reusing the widget on your other sites

```html
<div class="sf-booking"
     data-name="Your Name"
     data-email="you@gmail.com,you@icloud.com"
     data-title="Intro call" data-durations="30,45,60"
     data-timezone="Europe/Copenhagen"
     data-api="https://script.google.com/macros/s/XXXX/exec"></div>
<script src="https://foshchii.github.io/sv_resume/assets/js/booking-widget.js" defer></script>
```

One Apps Script backend can serve all of your sites.
