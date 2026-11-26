#!/usr/bin/env python3
"""Check the live booking backend. Standard library only.

    python3 .github/scripts/check_booking.py [EXEC_URL]

The backend is a Google Apps Script web app, and when it breaks nothing says
so: the site quietly hides the booking block, and a backend that cannot answer
cannot send its own alert. This asks it what the booking widget asks, over the
JSONP GET the widget falls back to and the plain GET it tries first, and
fails when:
  - it does not answer, or answers with a web page (a Google sign-in,
    "Authorization needed" or error page) instead of data
  - action=health reports Google Calendar, the iCloud feed or mail as broken,
    or the NOTIFICATION_EMAIL or ICLOUD_GUEST_EMAIL script property as empty,
    or iCloud as not connected
  - the deployed code is not this repo's booking-api/google-apps-script.gs
    (their VERSIONs differ), i.e. the editor or the deployment is out of date
  - action=availability for the next working day returns no list of slots
  - a plain GET, the way the widget's fetch() asks first, cannot be read
    from the site: a hop without Access-Control-Allow-Origin, or no JSON

The URL comes from the booking widget's data-api in contact.html. Pass another
/exec URL to check a deployment before pointing the site at it, and
--any-version to skip the version check (booking-health.yml does, for a pull
request, whose backend is not deployed yet).
Runs every hour from .github/workflows/booking-health.yml.
"""

import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parent))
import stamp_backend_version  # noqa: E402

ROOT = stamp_backend_version.ROOT
SCRIPT = stamp_backend_version.SCRIPT
PAGE = "contact.html"
CALLBACK = "bookingCheck"
TIMEOUT = 60       # seconds per request; an Apps Script cold start can be slow
WAITS = (15, 45)   # seconds between attempts, so a blip is not reported as an outage

REDEPLOY = (f"Paste {SCRIPT} into the Apps Script editor and save, check that the "
            "NOTIFICATION_EMAIL and ICLOUD_GUEST_EMAIL script properties are set (Project "
            "Settings → Script properties), run testHealth there, then Deploy → Manage "
            "deployments → pencil on the site's deployment → Version: New version → Deploy.")
PROPERTIES = "Apps Script → Project Settings → Script properties"
# The site's own origin, which the widget's fetch() sends as Origin.
ORIGIN = "https://" + (ROOT / "CNAME").read_text(encoding="utf-8").strip()


class Problem(Exception):
    pass


def widget():
    """The booking widget's data-api and data-timezone."""
    html = (ROOT / PAGE).read_text(encoding="utf-8")
    apis = set(re.findall(r'data-api="([^"]+)"', html))
    if len(apis) != 1:
        raise SystemExit(f"{PAGE}: expected one booking widget data-api, found {len(apis)}")
    tz = re.search(r'data-timezone="([^"]+)"', html)
    return apis.pop(), tz.group(1) if tz else None


def ask(api, **params):
    """One JSONP call, made the way the widget makes it; returns the reply."""
    action = params["action"]
    url = api + ("&" if "?" in api else "?") + urlencode({**params, "callback": CALLBACK})
    try:
        with urlopen(Request(url, headers={"User-Agent": "foshchii.com booking check"}), timeout=TIMEOUT) as r:
            body = r.read().decode("utf-8", "replace")
    except HTTPError as e:
        hint = " The deployment may have been archived or deleted." if e.code == 404 else ""
        raise Problem(f"action={action}: HTTP {e.code} {e.reason}.{hint}")
    except (URLError, OSError) as e:
        raise Problem(f"action={action}: no answer ({getattr(e, 'reason', e)}).")
    m = re.fullmatch(rf"\s*{CALLBACK}\((.*)\)\s*;?\s*", body, re.S)
    if not m:
        title = re.search(r"<title>(.*?)</title>", body, re.S | re.I)
        seen = f'a web page titled "{" ".join(title.group(1).split())}"' if title else repr(body[:80])
        raise Problem(f"action={action}: answered with {seen} instead of data, which the widget "
                      "cannot read either. Usually the script needs authorising again after a code "
                      "change (run testHealth in the Apps Script editor), or the deployment is not "
                      '"Execute as: Me / Who has access: Anyone".')
    try:
        return json.loads(m.group(1))
    except json.JSONDecodeError as e:
        raise Problem(f"action={action}: the reply is not valid JSON ({e.msg}).")


def check_health(api, want):
    h = ask(api, action="health")
    if "google" not in h and "mail" not in h:
        if h.get("ok") is False:
            return [f"action=health failed: {h.get('error', 'no reason given')}."]
        return [f"action=health returned no health report, so the deployed code is older than "
                f"{SCRIPT}. {REDEPLOY}"]
    problems = []
    for cal in h.get("google", []):
        if not cal.get("ok"):
            problems.append(f"Google Calendar {cal.get('id')!r}: {cal.get('error', 'not ok')}.")
    icloud = h.get("icloud", {})
    if not icloud.get("configured"):
        problems.append("iCloud calendar is not connected (the ICLOUD_ICS_URL script property is "
                        "empty), so iCloud events do not block booking times.")
    elif not icloud.get("ok"):
        problems.append(f"iCloud calendar feed: {icloud.get('error') or 'HTTP %s' % icloud.get('status')}.")
    # Older deployments do not report these two; the version check below covers them.
    if icloud.get("configured") and icloud.get("guestConfigured") is False:
        problems.append("The ICLOUD_GUEST_EMAIL script property is empty, so new bookings are not "
                        f"added to your iCloud calendar. Set it to your iCloud address in {PROPERTIES}.")
    if h.get("alerts", {}).get("configured") is False:
        problems.append("The NOTIFICATION_EMAIL script property is empty, so the backend cannot email "
                        f"you when availability or booking breaks. Set it to your inbox in {PROPERTIES}.")
    mail = h.get("mail", {})
    if not mail.get("ok"):
        problems.append(f"Mail: {mail.get('error', 'not ok')}. Booking invites and alerts cannot be sent.")
    if h.get("ok") is not True and not problems:
        problems.append(f"action=health says ok={h.get('ok')!r}: {h.get('error', 'no reason given')}.")
    got = h.get("version")
    if want is not None and got != want:
        running = f"runs version {got}" if got else "reports no version"
        problems.append(f"The live backend {running}, but {SCRIPT} is version {want}. {REDEPLOY}")
    return problems


def next_workday(today):
    """A weekday at least two days out, clear of the backend's same-day buffer."""
    day = today + timedelta(days=2)
    while day.weekday() >= 5:
        day += timedelta(days=1)
    return day


def check_availability(api, tz):
    day = next_workday(date.today())
    params = {"action": "availability", "date": day.isoformat(), "duration": 30}
    if tz:
        params["tz"] = tz
    a = ask(api, **params)
    if a.get("ok") is False:
        return [f"action=availability for {day}: {a.get('error', 'refused')}."], None
    slots = a.get("slots")
    if not isinstance(slots, list):
        return [f"action=availability for {day}: the reply has no list of slots."], None
    for s in slots:
        try:
            datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        except ValueError:
            return [f"action=availability for {day}: {s!r} is not a time."], None
    return [], f"{len(slots)} free 30-minute slots on {day}"


class _Hold(HTTPRedirectHandler):
    """Hand a redirect back instead of following it, so each hop can be checked."""

    def redirect_request(self, *args, **kwargs):
        return None


def check_fetch(api):
    """The widget's first transport: a fetch() GET with no cookies and no
    callback. The browser reads the reply only if every hop allows the site's
    origin, and after the cross-site redirect it sends Origin: null. Without
    this the widget falls back to JSONP, which sends the visitor's Google
    cookies and turns any error page into "could not be reached"."""
    url = api + ("&" if "?" in api else "?") + urlencode({"action": "health"})
    opener, origin = build_opener(_Hold), ORIGIN
    for _ in range(4):
        host = url.split("/")[2]
        try:
            with opener.open(Request(url, headers={"User-Agent": "foshchii.com booking check",
                                                   "Origin": origin}), timeout=TIMEOUT) as r:
                status, headers, body = r.status, r.headers, r.read().decode("utf-8", "replace")
        except HTTPError as e:
            status, headers, body = e.code, e.headers, ""
            e.close()
        except (URLError, OSError) as e:
            raise Problem(f"fetch() path: no answer from {host} ({getattr(e, 'reason', e)}).")
        allowed = headers.get("Access-Control-Allow-Origin")
        if allowed not in ("*", origin):
            return [f"fetch() path: {host} answers without Access-Control-Allow-Origin for {origin} "
                    f"(got {allowed!r}), so browsers cannot read it and the widget falls back to JSONP."]
        if status in (301, 302, 303, 307, 308) and headers.get("Location"):
            url, origin = headers["Location"], "null"
            continue
        if status != 200:
            return [f"fetch() path: {host} answered HTTP {status}."]
        try:
            json.loads(body)
        except ValueError:
            return [f"fetch() path: {host} answered with something other than JSON: {body[:80]!r}."]
        return []
    return ["fetch() path: more than three redirects."]


def run(api, tz, want):
    problems, offered = [], None
    try:
        problems += check_health(api, want)
    except Problem as e:
        problems.append(str(e))
    try:
        problems += check_fetch(api)
    except Problem as e:
        problems.append(str(e))
    try:
        found, offered = check_availability(api, tz)
        problems += found
    except Problem as e:
        problems.append(str(e))
    return problems, offered


def annotation(msg):
    # Backend errors are free text; keep each one a single workflow command.
    return msg.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def check(api, tz, want, waits=WAITS):
    """Every check, tried again after each wait in `waits` while any fails, so
    a blip is not reported as an outage. want=None skips the version check.
    Returns (problems, offered)."""
    for attempt, wait in enumerate((*waits, None), 1):
        problems, offered = run(api, tz, want)
        if not problems or wait is None:
            return problems, offered
        brief = "".join(f"\n  - {p if len(p) <= 120 else p[:117] + '...'}" for p in problems)
        print(f"attempt {attempt} found {len(problems)} problem(s), trying again in {wait}s:{brief}",
              file=sys.stderr)
        time.sleep(wait)


def main():
    api, tz = widget()
    args = [a for a in sys.argv[1:] if a != "--any-version"]
    if args:
        api = args[0]
    api = api.rstrip("/")
    # A pull request's backend is not deployed until it merges, so its run
    # checks everything else but not the version.
    want = None if "--any-version" in sys.argv else stamp_backend_version.find(stamp_backend_version.read()).group(1)

    problems, offered = check(api, tz, want)
    if problems:
        annotate = os.environ.get("GITHUB_ACTIONS") == "true"
        for msg in problems:
            print(msg)
            if annotate:
                print(f"::error title=Booking backend::{annotation(msg)}")
        print(f"\n{len(problems)} problem(s). Health report: {api}?action=health&callback=x\n"
              "Troubleshooting: booking-api/README.md")
        return 1
    running = f"version {want}" if want else "a deployed version"
    print(f"ok: the live backend runs {running}; Google Calendar, iCloud and mail all work; "
          f"the widget's fetch() and JSONP calls both get through; {offered}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
