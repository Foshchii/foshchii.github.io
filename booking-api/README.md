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

Apple's feed is the one outside service every check depends on, so the script
reads it at most every five minutes and keeps the last copy it could read for
six hours. If the feed cannot be read, booking carries on with that copy and the
script emails `NOTIFICATION_EMAIL`: a short iCloud outage no longer takes
booking down. (`action=health` still reads the feed itself, so the outage shows
in the [hourly check](#hourly-check).)

When `data-api` is set, the widget runs in strict live mode by default: it
never shows times it could not confirm. If live availability cannot be
confirmed after a few tries, it says so and, with `data-fallback-href` set,
offers another way to reach you (`data-failure-mode="hide"` removes the booking
block instead). The backend also emails `NOTIFICATION_EMAIL` when availability,
booking or health checks fail. If Apps Script itself is unreachable, neither
the browser nor the script can send that email, so an
[hourly check](#hourly-check) on GitHub looks for exactly that.

**No same-day bookings.** The first bookable time is tomorrow at 00:00
Copenhagen time. The rule is in two places: `CONFIG.minDaysAhead` in the script
decides which times the backend offers and accepts, and `data-min-days-ahead`
on the widget hides today straight away, even on a page left open overnight.
Set both to `0` to allow same-day bookings again (the script still keeps
`CONFIG.bufferMin`, an hour, clear).

**Bookings are checked on the server too.** The script books a time only if
it would offer that time itself, for that length: a working day no more than
`CONFIG.daysAhead` days ahead, inside working hours, on the `CONFIG.stepMin`
grid, and free on both Google and iCloud. The widget never shows anything
else, but a page left open or a hand-made request could ask for any time. The
check and the booking run under one lock, so two visitors cannot both take the
last free time. Lengths must be listed in `CONFIG.durations`: if you add a
length to `data-durations` on a booking page, add it there too and deploy the
script, or that page will say "That meeting length is not offered".

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
4. In **Project Settings → Script properties**, set `NOTIFICATION_EMAIL` to the inbox that should receive booking widget issue alerts.

### 2. Connect iCloud (so its busy times are respected)
1. On a Mac: **Calendar app → right-click the calendar → Share Calendar →
   Public Calendar**, copy the `webcal://…` link.
   On iCloud.com: **Calendar → ⚲ share icon → Public Calendar**, copy the link.
2. In Apps Script: **Project Settings → Script properties → Add property**
   * Name: `ICLOUD_ICS_URL`
   * Value: the link you copied (the script auto-converts `webcal://` → `https://`).
3. Set the `ICLOUD_GUEST_EMAIL` script property to your iCloud address so bookings are pushed there.

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
   `psychology/contact.html` books against the same backend (as a 20-minute
   "First call … (counselling)"), so set the same URL there too.

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

> **How the widget calls it: `fetch()` first, JSONP as the fallback.** Apps
> Script's replies carry `Access-Control-Allow-Origin: *` — on the `/exec`
> 302 and on the `script.googleusercontent.com` page it redirects to — so the
> widget reads them with a plain `fetch()` **GET**, sending no cookies. That
> keeps a visitor's Google sign-in (several accounts, a work account) from
> changing the answer, and an error page arrives as an HTTP status instead of
> silence. If `fetch()` cannot get through, the widget falls back to a JSONP
> `<script>` load with a `callback` param (the backend replies
> `callback({…})`) and keeps using JSONP on that page. Availability checks
> that get no readable reply are retried (three tries at most, none started
> after 12 seconds) before the visitor sees an error; bookings never are.

---

## Troubleshooting

### "Booking was not confirmed — the calendar service did not answer in time"

That message is the widget's **timeout** branch: the call for `action=book`
got no reply in time. It is silence, not a refusal — and the
difference matters, because `route()` catches everything the handlers throw and
replies `{ok:false,error}`, which the widget prints verbatim. **If you got a
generic timeout instead of a real reason, `doGet` never reached `reply()`.**

Work through it in this order:

1. **Open `…/exec?action=health&callback=x` in a browser tab.** A healthy
   deployment prints `x({"ok":true,…})`. If you get a Google **sign-in page, an
   "Authorization needed" page, or an error page** instead, that is the whole
   bug: the widget cannot read a web page as data. Re-authorise the script and
   **Deploy → Manage deployments → New version**.
2. **Check `mail.ok` in that same response.** Booking calls `createEvent(…,
   {sendInvites:true})` and every alert goes through `MailApp` — availability
   reads no mail at all. So a revoked mail scope or a spent daily quota breaks
   booking and alerting while availability keeps working perfectly. The
   giveaway: bookings fail *and* no "Booking widget issue" alert ever arrives.
3. **Confirm the deployment is "Execute as: Me / Who has access: Anyone".**
   Anything narrower serves the sign-in page from step 1 to every visitor.
4. **Check the alert inbox** (`NOTIFICATION_EMAIL`) for
   `Booking widget issue: booking`. Its context JSON carries the slot and the
   widget's own message. No alert at all points back at step 2.

The widget does not wait out the full timeout for step 1's failure: an error
page shows up as "answered with an error (HTTP …)" or "replied with something
this page could not read" straight away. And when a booking reply is merely
*lost*, the widget re-checks the day's availability before showing an error, so
an event that was created server-side is not reported as a failure the visitor
will retry into a double booking.

### "Calendar connection needs attention — the calendar service could not be reached"

Neither `fetch()` nor the JSONP fallback got any reply, on three tries. When
`action=health` (step 1 above) answers fine, the backend is not the problem:
the visitor's connection, a browser extension or a network filter is blocking
`script.google.com` or `script.googleusercontent.com`. If the alert inbox
fills with these from many visitors at once, check step 1 and Google's [Apps
Script status](https://www.google.com/appsstatus/dashboard/).

Each `Booking widget issue` alert says how the call failed, in its context:

| Field | Meaning |
| --- | --- |
| `via` | the transport that failed: `fetch`, `jsonp`, or `fetch, then jsonp` (both) |
| `status` | the HTTP status, when Google answered with an error |
| `tries`, `ms` | how many tries, over how many milliseconds |
| `online` | `false` when the visitor's browser knew it was offline |

`online: false` is the visitor's connection. A 5xx `status` is Google's side.
`fetch, then jsonp` with no `status` and a small `ms` means something blocked
Google for that visitor. A large `ms` is a slow or cold Apps Script. To see
the backend's side of one failure, open the Apps Script project's
**Executions** page: a failed `doGet` at the alert's time means the script
failed; no `doGet` at that time means the request never reached it.

### Keep this file and the deployment in sync

The live `/exec` URL runs whatever was last pasted into the Apps Script editor
and deployed as a new version — **not** what is in this repo, and the two have
drifted before. So change the code here, never only in the editor, and after
each change:

1. Run `python3 .github/scripts/stamp_backend_version.py`. It sets `VERSION`
   in the script from the code itself; the site check fails until you do.
2. Paste the whole file into the editor and save. In **Project Settings →
   Script properties**, check that `NOTIFICATION_EMAIL` and
   `ICLOUD_GUEST_EMAIL` are set: the addresses live there, not in the code.
   Run `testHealth`, approving any new permission it asks for;
   `alerts.configured` and `icloud.guestConfigured` should both be `true`.
3. **Deploy → Manage deployments →** pencil on the site's deployment **→
   Version: New version → Deploy**.

`action=health` reports the deployed `version`, which must equal `VERSION` in
this file. If it doesn't, or the reply has no `version` at all, the editor or
the deployment is out of date. The hourly check compares them for you.

## Backend tests

`node .github/scripts/test_backend.js` loads the script as it is, gives it fake
Google services (Calendar, the iCloud feed, cache, lock, mail) and a frozen
clock, and checks what it books, refuses and offers, and what happens when the
iCloud feed is down. It runs on every pull request and before every deploy, so
a change that breaks booking does not reach the live backend. Add a case when
you change what the backend accepts.

## Automatic deploys

`.github/workflows/booking-deploy.yml` deploys the script for you whenever
`google-apps-script.gs` or `appsscript.json` changes on `main`, using
[clasp](https://github.com/google/clasp), Google's Apps Script command line
tool. It runs the backend tests, replaces the code in the "Sviatoslav Booking
Widget" project, saves a new version, moves the site's deployment (the `/exec`
URL in `contact.html`) to it, and runs the booking check. Once it is set up,
skip the paste-and-deploy steps above.

**If the new code fails the check, it is rolled back.** The deployment goes
back to the version it ran before, and that is checked too. If the old version
passes, it stays, and the run fails saying the new code was rolled back. If the
old version fails as well, the code is not the cause (Google, the iCloud feed or
mail is), so the deployment goes forward to the new version again and the run
fails with the problems found. Either way a bad change takes booking down for a
minute or two, not until someone notices.

One-time setup, on a computer with Node:

1. Turn on the **Google Apps Script API** at
   <https://script.google.com/home/usersettings>.
2. Run `npx @google/clasp@3.4.1 login` and sign in as the project's owner. It
   saves the sign-in to `~/.clasprc.json`.
3. Store that file as a repository secret called `CLASPRC_JSON`, either with
   `gh secret set CLASPRC_JSON --repo Foshchii/foshchii.github.io < ~/.clasprc.json`
   or under **Settings → Secrets and variables → Actions → New repository
   secret**, pasting the whole file.
4. Run **Actions → Deploy booking backend → Run workflow** once to check it.

The secret lets GitHub change your Apps Script projects. To withdraw it, remove
"clasp" at <https://myaccount.google.com/permissions> and delete the secret.
If a code change needs a new Google permission (a service the script did not
use before), run any function once in the editor to approve it; a deploy cannot
approve permissions.

## Hourly check

`.github/workflows/booking-health.yml` runs `.github/scripts/check_booking.py`
every hour, at 17 minutes past (GitHub sometimes starts scheduled runs late).
It calls the backend in `contact.html`'s `data-api` both ways the widget
does — a plain GET, as `fetch()` sends it, and the JSONP fallback — and fails
when:

- it doesn't answer, or answers with a Google sign-in, "Authorization needed" or
  error page instead of data
- `action=health` reports Google Calendar, the iCloud feed or mail as broken, or
  iCloud as not connected
- the `NOTIFICATION_EMAIL` or `ICLOUD_GUEST_EMAIL` script property is empty, so
  alerts or the iCloud copy of each booking would silently stop
- the deployed `version` differs from `VERSION` in this file
- `action=availability` for the next working day returns no list of slots
- a plain GET cannot be read from the site: a hop without
  `Access-Control-Allow-Origin`, or a reply that isn't JSON. The widget still
  works then, over JSONP, but that sends visitors' Google cookies and cannot
  tell an error page from a dropped connection

It tries three times over a minute first, so a blip is not reported as an
outage. A failed run is GitHub's email to you, one an hour for as long as the
outage lasts, sent to the account that added or last changed the schedule
(**Settings → Notifications → Actions** if it doesn't arrive); the run's log
says what failed and what to do.

Run it any time from **Actions → Check booking backend → Run workflow**, or
locally with `python3 .github/scripts/check_booking.py`. Pass an `/exec` URL
to check a deployment before pointing the site at it, and `--any-version` to
skip the version check (a pull request's run does: its code is not deployed
yet).

GitHub pauses scheduled workflows in a public repository after 60 days without
commits, and emails a warning first. The site keeps working; turn the check
back on from the Actions tab.

---

## Endpoint contract (if you ever swap in another backend)

The widget calls the backend over **GET**, and it routes on an `action` param.
It first asks with `fetch()` and no `callback` param, expecting plain JSON
sent with `Access-Control-Allow-Origin: *`; if that cannot get through, it
asks again with JSONP (a `callback` param), expecting the JSON wrapped as
`callback({…})`. A backend that serves only JSONP still works: the widget
falls back to it. A drop-in backend needs to support:

**`GET {api}?action=availability&date=YYYY-MM-DD&duration=30&tz=Area/City&callback=fn`**
```js
fn({ "ok": true, "slots": ["2026-07-01T07:00:00.000Z", "2026-07-01T07:30:00.000Z"] })
```
Return free slot start times as ISO-8601 UTC strings. A day past
`CONFIG.daysAhead` gets no slots, and a `duration` not in `CONFIG.durations` gets
`{ "ok": false, "error": "That meeting length is not offered." }`.

**`GET {api}?action=book&callback=fn&...`** with the booking fields as query
params: `name`, `email`, `message`, `title`, `start` (ISO), `end` (ISO),
`duration`, `host`, `timezone`. `host` is a **single** address — the calendar
organiser, i.e. the first entry in `data-email` — not the whole list.
```js
fn({ "ok": true, "booked": true })   // or fn({ "ok": false, "error": "…" })
```
The widget treats the booking as successful only when `booked` is `true`.
(The original `POST {api}/book` with a JSON body still works too.) The backend
refuses, with `ok: false` and a reason, a `start` that `availability` would not
offer for that `duration`, a `duration` not in `CONFIG.durations`, and an `end`
other than `start` plus `duration`.

**`GET {api}?action=health&callback=fn`**
```js
fn({ "ok": true,
     "version": "e6adb11a8d21",
     "google": [{ "id": "primary", "ok": true }],
     "icloud": { "configured": true, "ok": true, "guestConfigured": true },
     "mail":   { "ok": true, "remainingQuota": 97 },
     "alerts": { "configured": true } })
```
`mail` is the one to read first when booking fails but availability works:
invites and alerts both go out by mail, so a revoked scope or a spent quota
takes out exactly those two paths. `version` says which copy of the script is
deployed; the hourly check fails when it is not this repo's. The reply is
public, so it says only *whether* the alert and iCloud addresses are set,
never the addresses themselves.

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
     data-title="Intro call" data-durations="30,45,60"
     data-timezone="Europe/Copenhagen"
     data-min-days-ahead="1"
     data-strict-live="true"
     data-failure-mode="show"
     data-fallback-href="https://www.linkedin.com/in/your-name/"
     data-fallback-label="Message me on LinkedIn"
     data-api="https://script.google.com/macros/s/XXXX/exec"></div>
<script src="https://foshchii.com/assets/js/booking-widget.js" defer></script>
```

One Apps Script backend can serve all of your sites.
