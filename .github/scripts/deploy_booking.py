#!/usr/bin/env python3
"""Deploy booking-api/google-apps-script.gs to Google Apps Script. Standard
library only; needs Node, for clasp (Google's Apps Script command line tool).

    CLASPRC_JSON="$(cat ~/.clasprc.json)" python3 .github/scripts/deploy_booking.py

.github/workflows/booking-deploy.yml runs it whenever the script changes on
main. It replaces the code in the Apps Script project, saves that as a new
version, and moves the site's deployment (the /exec URL in contact.html's
data-api) to it, so the URL stays the same. check_booking.py then confirms the
live backend runs this code.

It signs in with the CLASPRC_JSON secret: the ~/.clasprc.json that
`clasp login` writes. Setup: booking-api/README.md, "Automatic deploys".
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import check_booking  # noqa: E402

ROOT = check_booking.ROOT
CODE = ROOT / "booking-api" / "google-apps-script.gs"
MANIFEST = ROOT / "booking-api" / "appsscript.json"
# The "Sviatoslav Booking Widget" project: script.google.com/d/<this>/edit
SCRIPT_ID = "1cBdtPiAxbNJ-XwSyOBLTPgOzDU-NAQ1kVYj2SMCmkDyMn8-r6a7ZnMpA"
CLASP = "@google/clasp@3.4.1"
SETUP = "booking-api/README.md, \"Automatic deploys\""

# What a failure usually means, in words that say what to do.
HINTS = [
    ("has not enabled the Apps Script API",
     "Turn on the Google Apps Script API at https://script.google.com/home/usersettings, then run this again."),
    ("invalid_grant",
     "The saved Google sign-in no longer works (revoked, expired or from another account). Run `clasp login` "
     f"again and replace the CLASPRC_JSON secret ({SETUP})."),
    ("Requested entity was not found",
     f"Google cannot find the project or the deployment. Check SCRIPT_ID in {Path(__file__).name} and the "
     "data-api URL in contact.html."),
    ("does not have permission",
     "The signed-in Google account cannot edit this project. Sign in to clasp as the project's owner."),
]


def fail(message):
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::error::{message}")
    sys.exit(f"deploy failed: {message}")


def deployment_id():
    api, _tz = check_booking.widget()
    m = re.search(r"/macros/s/([\w-]+)/exec", api)
    if not m:
        fail(f"cannot find the deployment id in the data-api URL in {check_booking.PAGE}: {api}")
    return m.group(1)


def clasp(workdir, auth, *args):
    cmd = ["npx", "--yes", CLASP, "-A", str(auth), *args]
    print("$ clasp", " ".join(args), flush=True)
    r = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True)
    output = (r.stdout + r.stderr).strip()
    if output:
        print(output)
    if r.returncode:
        hint = next((h for needle, h in HINTS if needle in output), "See the output above.")
        fail(f"clasp {args[0]} failed. {hint}")
    return output


def main():
    credentials = os.environ.get("CLASPRC_JSON", "").strip()
    if not credentials:
        fail(f"the CLASPRC_JSON secret is not set, so the backend cannot be deployed automatically. Set it up "
             f"once as described in {SETUP}, or deploy by hand from the Apps Script editor.")
    try:
        json.loads(credentials)
    except json.JSONDecodeError:
        fail("the CLASPRC_JSON secret is not valid JSON. Paste the whole of ~/.clasprc.json into it.")
    if not shutil.which("npx"):
        fail("npx (Node) is not installed.")

    target = deployment_id()
    version = check_booking.stamp_backend_version.find(CODE.read_text(encoding="utf-8")).group(1)
    sha = os.environ.get("GITHUB_SHA", "")[:7] or "local"
    description = f"{version} from GitHub {sha}"

    with tempfile.TemporaryDirectory() as work:
        work = Path(work)
        auth = work / "clasprc.json"
        auth.write_text(credentials, encoding="utf-8")
        auth.chmod(0o600)
        project = work / "project"
        project.mkdir()
        # Keep the editor's file name: the project holds one file called Code.
        shutil.copyfile(CODE, project / "Code.gs")
        shutil.copyfile(MANIFEST, project / "appsscript.json")
        (project / ".clasp.json").write_text(json.dumps({"scriptId": SCRIPT_ID, "rootDir": "."}), encoding="utf-8")

        clasp(project, auth, "push", "--force")
        clasp(project, auth, "update-deployment", target, "--description", description)

    print(f"ok: deployment {target[:12]}… now runs version {version} ({description}).")


if __name__ == "__main__":
    main()
