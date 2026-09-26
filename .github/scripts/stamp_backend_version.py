#!/usr/bin/env python3
"""Stamp VERSION in booking-api/google-apps-script.gs.

The live booking backend runs whatever was last pasted into the Apps Script
editor and deployed, not what is in this repo, and nothing says when the two
drift apart. So the script carries a VERSION derived from its own code and
reports it from action=health, and the daily check (check_booking.py) compares
the live value with this file's.

VERSION is the first 12 hex digits of the SHA-256 of the file with the VERSION
value blanked out, so it changes whenever the code does, and only then.

Run after editing the script:
    python3 .github/scripts/stamp_backend_version.py

The site check (check_site.py) fails if VERSION is out of date.
"""

import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = "booking-api/google-apps-script.gs"
LINE = re.compile(r'^var VERSION = "([^"]*)";', re.M)


def read():
    return (ROOT / SCRIPT).read_text(encoding="utf-8")


def find(text):
    """The one `var VERSION = "…";` line."""
    found = list(LINE.finditer(text))
    if len(found) != 1:
        raise ValueError(f'expected one line like var VERSION = "…"; found {len(found)}')
    return found[0]


def version(text):
    """What VERSION should be for this code."""
    m = find(text)
    blank = text[: m.start(1)] + text[m.end(1):]
    return hashlib.sha256(blank.encode("utf-8")).hexdigest()[:12]


def stamp(text):
    m = find(text)
    return text[: m.start(1)] + version(text) + text[m.end(1):]


if __name__ == "__main__":
    text = read()
    try:
        (ROOT / SCRIPT).write_text(stamp(text), encoding="utf-8")
    except ValueError as e:
        sys.exit(f"{SCRIPT}: {e}")
    print(f"stamped {SCRIPT} with VERSION {version(text)}", file=sys.stderr)
