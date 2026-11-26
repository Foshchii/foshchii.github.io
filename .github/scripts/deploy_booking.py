#!/usr/bin/env python3
"""Deploy booking-api/google-apps-script.gs to Google Apps Script, check it,
and roll back if the check fails. Standard library only; needs Node, for clasp
(Google's Apps Script command line tool).

    CLASPRC_JSON="$(cat ~/.clasprc.json)" python3 .github/scripts/deploy_booking.py

.github/workflows/booking-deploy.yml runs it whenever the script changes on
main. It replaces the code in the Apps Script project, saves that as a new
version, and moves the site's deployment (the /exec URL in contact.html's
data-api) to it, so the URL stays the same. Then it runs check_booking.py's
checks on the live backend.

If they fail, the new code is the likely cause, so the deployment goes back to
the version it ran before, and that is checked too:
  - the old version passes: the site stays on it, and the run fails, saying
    the new code was rolled back;
  - the old version fails as well: the new code is not the cause (Google, the
    iCloud feed or mail is), so the deployment goes forward to the new
    version again, and the run fails with the problems found.
Either way booking is down for a minute or two at most, not until someone
notices.

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


def clasp(workdir, auth, *args, required=True):
    """Run clasp; returns its stdout, where --json output goes (npx and npm
    write their notices to stderr). A failure ends the run if `required`."""
    cmd = ["npx", "--yes", CLASP, "-A", str(auth), *args]
    print("$ clasp", " ".join(args), flush=True)
    r = subprocess.run(cmd, cwd=workdir, capture_output=True, text=True)
    output = (r.stdout + r.stderr).strip()
    if output:
        print(output)
    if r.returncode and required:
        name = next((a for a in args if not a.startswith("-")), "")
        hint = next((h for needle, h in HINTS if needle in output), "See the output above.")
        fail(f"clasp {name} failed. {hint}")
    return r.stdout if not r.returncode else None


def deployed_version(workdir, auth, target):
    """The Apps Script version the site's deployment runs now, to roll back
    to; None if clasp cannot say, and then there is no rollback."""
    out = clasp(workdir, auth, "--json", "list-deployments", required=False)
    try:
        for d in json.loads(out or ""):
            if d.get("deploymentId") == target and d.get("versionNumber"):
                return int(d["versionNumber"])
    except (ValueError, TypeError, AttributeError):
        pass
    return None


def move(workdir, auth, target, description, version=None):
    """Point the site's deployment at `version`, or at a new version made from
    the pushed code. Returns the version it now runs, if clasp says."""
    args = ["--json", "update-deployment", target, "--description", description]
    if version:
        args += ["--versionNumber", str(version)]
    out = clasp(workdir, auth, *args)
    try:
        return int(json.loads(out or "").get("versionNumber"))
    except (ValueError, TypeError, AttributeError):
        return version


def report(problems):
    annotate = os.environ.get("GITHUB_ACTIONS") == "true"
    for msg in problems:
        print(msg)
        if annotate:
            print(f"::error title=Booking backend::{check_booking.annotation(msg)}")


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

        before = deployed_version(project, auth, target)
        clasp(project, auth, "push", "--force")
        after = move(project, auth, target, description)
        print(f"deployment {target[:12]}… moved from Apps Script version {before} to {after} "
              f"({description}). Checking it…", flush=True)

        api, tz = check_booking.widget()
        problems, offered = check_booking.check(api, tz, version)
        if not problems:
            print(f"ok: the live backend runs version {version} and passes every check; {offered}.")
            return
        report(problems)
        if not before:
            fail("The new backend fails its check, and clasp could not say which version it replaced, so it "
                 "was not rolled back. Roll it back in the Apps Script editor: Deploy → Manage deployments → "
                 "pencil on the site's deployment → the previous version.")

        print(f"Rolling the deployment back to Apps Script version {before}…", flush=True)
        move(project, auth, target, f"rollback: {description} failed its check", before)
        old_problems, _ = check_booking.check(api, tz, None)
        if not old_problems:
            fail(f"The new backend (version {version}) failed its check, so the site's deployment was rolled "
                 f"back to Apps Script version {before}, which passes. Booking works; fix the problems above "
                 "and push again.")

        # The old code fails too, so the new code is not what broke it: keep the newest.
        if after:
            move(project, auth, target, description, after)
        fail("The live backend fails its check, but so does the version before this deploy, so the cause is "
             "not the new code: see the problems above. The deployment stays on the new version.")


if __name__ == "__main__":
    main()
