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
| Site quietly hides booking if live checks fail  |     —      |      ✅      |
| You get an email alert for backend-detected issues |  ❌   |      ✅      |

## How it works (and why)

The backend is a **Google Apps Script** (`google-apps-script.gs`). It runs as
*you*, so it reads/writes your Google Calendar with no API keys. For iCloud it
reads your **published calendar `.ics` feed** and creates the booking with your
iCloud address as a guest, so the event lands on your iCloud calendar too.

When `data-api` is set, the widget runs in strict live mode by default. If live
availability cannot be confirmed, this site quietly hides the booking block,
booking CTAs and booking-related proof items for a few hours instead of showing
possibly wrong slots. The backend also emails `CONFIG.notificationEmail` when
availability, booking or health checks fail. If Apps Script itself is
unreachable, neither the browser nor the script can send that email, so a
[daily check](#daily-check) on GitHub looks for exactly that.

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
4. Confirm `CONFIG.notificationEmail` is the inbox that should receive booking
   widget issue alerts.

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
In the Apps Script editor, run `testIcloudFeed`, `testAvailabilityTomorrow`,
`testHealth` and `testIssueNotification` (**View → Logs**). Authorize when
prompted. You should see busy blocks, free slots, a healthy status object and a
test alert email.

### 4. Deploy & connect
1. **Deploy → New deployment → Web app** — *Execute as:* **Me**, *Who has
   access:* **Anyone**.
2. Copy the **/exec URL**.
3. In `contact.html`, set it on the widget:
   ```html
   <div class="sf-booking" ... data-api="https://script.google.com/macros/s/XXXX/exec"></div>
   ```

Done — the widget now merges both calendars and books into both.

After deployment, you can also open this URL in a browser to check the backend:

```text
https://script.google.com/macros/s/XXXX/exec?action=health
```

It should return `"ok":true`. If it returns `"ok":false`, the script sends an
issue alert email and the website widget will block live booking.

> **Re-deploying after a code change.** Editing the script does **not** update
> the live web app on its own. Go to **Deploy → Manage deployments →** (pencil
> to edit the active one) **→ Version: New version → Deploy**. The `/exec` URL
> stays the same, so you don't need to touch `contact.html` again. Make the
> change in this repo first — see [Keep this file and the deployment in
> sync](#keep-this-file-and-the-deployment-in-sync).

> **Why JSONP / GET?** Browsers can't read a normal `fetch()` response from
> Apps Script (it returns no CORS headers and 302-redirects). So the widget
> calls the backend with a JSONP `<script>` load over **GET**, passing a
> `callback` param; the backend replies `callback({…})`. This is the reliable,
> free way to reach Apps Script from a static site.

---

## Troubleshooting

### "Booking was not confirmed — the calendar service did not answer in time"

That message is the widget's **timeout** branch: the JSONP `<script>` for
`action=book` never called its callback. It is silence, not a refusal — and the
difference matters, because `route()` catches everything the handlers throw and
replies `{ok:false,error}`, which the widget prints verbatim. **If you got a
generic timeout instead of a real reason, `doGet` never reached `reply()`.**

Work through it in this order:

1. **Open `…/exec?action=health&callback=x` in a browser tab.** A healthy
   deployment prints `x({"ok":true,…})`. If you get a Google **sign-in page, an
   "Authorization needed" page, or an error page** instead, that is the whole
   bug: a `<script>` tag handed HTML fires `load`, not `error` — it throws a
   SyntaxError, never calls back, and the widget waits out its full timeout.
   Re-authorise the script and **Deploy → Manage deployments → New version**.
2. **Check `mail.ok` in that same response.** Booking calls `createEvent(…,
   {sendInvites:true})` and every alert goes through `MailApp` — availability
   reads no mail at all. So a revoked mail scope or a spent daily quota breaks
   booking and alerting while availability keeps working perfectly. The
   giveaway: bookings fail *and* no "Booking widget issue" alert ever arrives.
3. **Confirm the deployment is "Execute as: Me / Who has access: Anyone".**
   Anything narrower serves the sign-in page from step 1 to every visitor.
4. **Check the alert inbox** (`CONFIG.notificationEmail`) for
   `Booking widget issue: booking`. Its context JSON carries the slot and the
   widget's own message. No alert at all points back at step 2.

The widget no longer waits out the full timeout for step 1's failure — a script
that loads non-JS now reports "replied with something this page could not read"
straight away. And when a booking reply is merely *lost*, the widget re-checks
the day's availability before showing an error, so an event that was created
server-side is not reported as a failure the visitor will retry into a double
booking.

### Keep this file and the deployment in sync

The live `/exec` URL runs whatever was last pasted into the Apps Script editor
and deployed as a new version — **not** what is in this repo, and the two have
drifted before. So change the code here, never only in the editor, and after
each change:

1. Run `python3 .github/scripts/stamp_backend_version.py`. It sets `VERSION`
   in the script from the code itself; the site check fails until you do.
2. Paste the whole file into the editor, save, and run `testHealth` there,
   approving any new permission it asks for.
3. **Deploy → Manage deployments →** pencil on the site's deployment **→
   Version: New version → Deploy**.

`action=health` reports the deployed `version`, which must equal `VERSION` in
this file. If it doesn't, or the reply has no `version` at all, the editor or
the deployment is out of date. The daily check compares them for you.

## Daily check

`.github/workflows/booking-health.yml` runs `.github/scripts/check_booking.py`
every morning at 06:17 UTC. It calls the backend in `contact.html`'s `data-api`
the way the widget does, and fails when:

- it doesn't answer, or answers with a Google sign-in, "Authorization needed" or
  error page instead of data
- `action=health` reports Google Calendar, the iCloud feed or mail as broken, or
  iCloud as not connected
- the deployed `version` differs from `VERSION` in this file
- `action=availability` for the next working day returns no list of slots

It tries three times over a minute first, so a blip is not reported as an
outage. A failed run is GitHub's email to you, sent to the account that added
or last changed the schedule (**Settings → Notifications → Actions** if it
doesn't arrive); the run's log says what failed and what to do.

Run it any time from **Actions → Check booking backend → Run workflow**, or
locally with `python3 .github/scripts/check_booking.py`. Pass an `/exec` URL
to check a deployment before pointing the site at it.

GitHub pauses scheduled workflows in a public repository after 60 days without
commits, and emails a warning first. The site keeps working; turn the check
back on from the Actions tab.

---

## Endpoint contract (if you ever swap in another backend)

The widget calls the backend over **GET with JSONP** (a `callback` param);
the backend wraps its JSON reply as `callback({…})`. It routes on an `action`
param. A drop-in backend needs to support:

**`GET {api}?action=availability&date=YYYY-MM-DD&duration=30&tz=Area/City&callback=fn`**
```js
fn({ "ok": true, "slots": ["2026-07-01T07:00:00.000Z", "2026-07-01T07:30:00.000Z"] })
```
Return free slot start times as ISO-8601 UTC strings.

**`GET {api}?action=book&callback=fn&...`** with the booking fields as query
params: `name`, `email`, `message`, `title`, `start` (ISO), `end` (ISO),
`duration`, `host`, `timezone`. `host` is a **single** address — the calendar
organiser, i.e. the first entry in `data-email` — not the whole list.
```js
fn({ "ok": true, "booked": true })   // or fn({ "ok": false, "error": "…" })
```
The widget treats the booking as successful only when `booked` is `true`.
(The original `POST {api}/book` with a JSON body still works too.)

**`GET {api}?action=health&callback=fn`**
```js
fn({ "ok": true,
     "version": "e6adb11a8d21",
     "google": [{ "id": "primary", "ok": true }],
     "icloud": { "configured": true, "ok": true },
     "mail":   { "ok": true, "remainingQuota": 97 } })
```
`mail` is the one to read first when booking fails but availability works:
invites and alerts both go out by mail, so a revoked scope or a spent quota
takes out exactly those two paths. `version` says which copy of the script is
deployed; the daily check fails when it is not this repo's.

**`GET {api}?action=issue&kind=availability&message=...&callback=fn`**
```js
fn({ "ok": true, "notified": true })
```
The backend throttles repeated alerts for 30 minutes so one outage does not
flood your inbox.

The widget also retries this one as a **form-encoded `POST`** via
`navigator.sendBeacon` when the JSONP load fails, so a broken `<script>` path
does not also silence the report telling you it is broken. `doPost` routes on
`action` for exactly this reason — only a JSON body with no `action` still
defaults to `book`.

## Reusing the widget on your other sites

```html
<div class="sf-booking"
     data-name="Your Name"
     data-email="you@gmail.com,you@icloud.com"
     data-title="Intro call" data-durations="30,45,60"
     data-timezone="Europe/Copenhagen"
     data-strict-live="true"
     data-failure-mode="hide"
     data-api="https://script.google.com/macros/s/XXXX/exec"></div>
<script src="https://foshchii.com/assets/js/booking-widget.js" defer></script>
```

One Apps Script backend can serve all of your sites.
