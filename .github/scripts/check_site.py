#!/usr/bin/env python3
"""Pre-deploy checks for the site. Standard library only; needs Node for the
JavaScript syntax check.

    python3 .github/scripts/check_site.py

Catches the mistakes that are easy to make when adding or editing a page and
invisible until someone hits them on the live site:
  - links, images, scripts and stylesheets that point at a missing file, and
    #anchors that point at a missing id
  - structured data (JSON-LD) that is not valid JSON, which search engines
    silently ignore
  - a canonical or og:url that does not match the page, as happens when a new
    page is copied from an old one
  - pages missing from sitemap.xml, or sitemap and llms.txt entries that point
    at nothing
  - feed.xml out of date with the articles
  - the booking backend's VERSION out of date with its code
  - JavaScript syntax errors
"""

import json
import os
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_feed  # noqa: E402
import stamp_backend_version  # noqa: E402

ROOT = build_feed.ROOT
SITE = build_feed.SITE
NOT_INDEXED = {"404.html"}
EXTERNAL = re.compile(r"^([a-z][a-z0-9+.-]*:|//)", re.I)

errors = []


def fail(file, line, msg):
    errors.append((file, line, msg))


class Page(HTMLParser):
    def __init__(self, name):
        super().__init__()
        self.name = name
        self.ids = set()
        self.refs = []       # (line, url)
        self.jsonld = []     # (line, text)
        self.canonical = []
        self.og_url = []
        self._script = None  # (line, type, [chunks]) while inside <script>

    def handle_starttag(self, tag, attrs):
        line = self.getpos()[0]
        a = dict(attrs)
        if a.get("id"):
            self.ids.add(a["id"])
        for attr in ("href", "src"):
            if a.get(attr):
                self.refs.append((line, a[attr]))
        if a.get("srcset"):
            for candidate in a["srcset"].split(","):
                if candidate.strip():
                    self.refs.append((line, candidate.split()[0]))
        if tag == "link" and a.get("rel") == "canonical":
            self.canonical.append(a.get("href"))
        if tag == "meta" and a.get("property") == "og:url":
            self.og_url.append(a.get("content"))
        if tag == "script":
            self._script = (line, a.get("type", ""), [])

    def handle_data(self, data):
        if self._script:
            self._script[2].append(data)

    def handle_endtag(self, tag):
        if tag != "script" or not self._script:
            return
        line, kind, chunks = self._script
        text = "".join(chunks)
        if kind == "application/ld+json":
            self.jsonld.append((line, text))
        else:
            for m in re.finditer(r"""import\(\s*['"]([^'"]+)['"]\s*\)""", text):
                self.refs.append((line + text[: m.start()].count("\n"), m.group(1)))
        self._script = None


def parse(name):
    p = Page(name)
    p.feed((ROOT / name).read_text(encoding="utf-8"))
    p.close()
    return p


def url_for(page):
    return SITE if page == "index.html" else SITE + page


def page_for(url):
    """Map an absolute site URL to a file path relative to ROOT."""
    rel = unquote(urlsplit(url).path).lstrip("/")
    return rel + "index.html" if rel == "" or rel.endswith("/") else rel


def check_references(pages):
    count = 0
    for name, page in pages.items():
        for line, url in page.refs:
            if EXTERNAL.match(url):
                continue
            count += 1
            parts = urlsplit(url)
            path = unquote(parts.path)
            if not path:
                target = name
            elif path.startswith("/"):
                target = page_for(path)
            else:
                target = os.path.normpath(os.path.join(os.path.dirname(name), path))
                if path.endswith("/"):
                    target += "/index.html"
            if not (ROOT / target).is_file():
                fail(name, line, f"'{url}' points at {target}, which does not exist")
                continue
            if parts.fragment and target.endswith(".html"):
                ids = pages[target].ids if target in pages else parse(target).ids
                if parts.fragment not in ids:
                    fail(name, line, f"'{url}': {target} has no element with id=\"{parts.fragment}\"")
    return count


def check_jsonld(pages):
    count = 0
    for name, page in pages.items():
        for line, text in page.jsonld:
            count += 1
            try:
                json.loads(text)
            except json.JSONDecodeError as e:
                fail(name, line + e.lineno - 1, f"JSON-LD is not valid JSON: {e.msg}")
    return count


def check_canonical(pages):
    for name, page in pages.items():
        if name in NOT_INDEXED:
            continue
        want = url_for(name)
        for label, got in (("canonical", page.canonical), ("og:url", page.og_url)):
            if got != [want]:
                found = ", ".join(map(str, got)) or "none"
                fail(name, 1, f"{label} should be {want} (found: {found})")


def check_sitemap(pages):
    try:
        root = ET.parse(ROOT / "sitemap.xml").getroot()
    except ET.ParseError as e:
        fail("sitemap.xml", e.position[0], f"not well-formed XML: {e}")
        return
    ns = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    listed = []
    for loc in root.findall("s:url/s:loc", ns):
        url = (loc.text or "").strip()
        rel = page_for(url)
        if not url.startswith(SITE):
            fail("sitemap.xml", 1, f"{url} is not on {SITE}")
        elif rel not in pages:
            fail("sitemap.xml", 1, f"{url} points at {rel}, which does not exist")
        elif rel in listed:
            fail("sitemap.xml", 1, f"{url} is listed more than once")
        listed.append(rel)
    for name in sorted(set(pages) - NOT_INDEXED - set(listed)):
        fail("sitemap.xml", 1, f"{name} is not listed; add {url_for(name)}")


def check_llms():
    text = (ROOT / "llms.txt").read_text(encoding="utf-8")
    for n, line in enumerate(text.splitlines(), 1):
        for url in re.findall(re.escape(SITE) + r"[^\s)>\]]*", line):
            if not (ROOT / page_for(url)).is_file():
                fail("llms.txt", n, f"{url} points at {page_for(url)}, which does not exist")


def check_feed():
    try:
        want = build_feed.render()
    except (ValueError, KeyError, json.JSONDecodeError) as e:
        fail("feed.xml", 1, f"cannot build the feed: {e}")
        return
    path = ROOT / build_feed.FEED
    if not path.is_file() or path.read_text(encoding="utf-8") != want:
        fail("feed.xml", 1, "out of date with the articles; run: python3 .github/scripts/build_feed.py")


def check_backend_version():
    script = stamp_backend_version.SCRIPT
    try:
        text = stamp_backend_version.read()
        m = stamp_backend_version.find(text)
    except (OSError, ValueError) as e:
        fail(script, 1, str(e))
        return
    if m.group(1) != stamp_backend_version.version(text):
        fail(script, text[: m.start()].count("\n") + 1,
             "VERSION is out of date with the code; run: python3 .github/scripts/stamp_backend_version.py")


def check_js():
    node = shutil.which("node")
    if not node:
        print("note: node not found, skipping the JavaScript syntax check", file=sys.stderr)
        return 0
    files = sorted(ROOT.glob("*.js")) + sorted(ROOT.glob("assets/js/*.js"))
    for f in files:
        r = subprocess.run([node, "--check", str(f)], capture_output=True, text=True)
        if r.returncode:
            rel = f.relative_to(ROOT).as_posix()
            m = re.search(re.escape(str(f)) + r":(\d+)", r.stderr)
            detail = next((l for l in r.stderr.splitlines() if "Error" in l), r.stderr.strip())
            fail(rel, int(m.group(1)) if m else 1, f"JavaScript syntax error: {detail}")
    return len(files)


def main():
    pages = {p.name: parse(p.name) for p in sorted(ROOT.glob("*.html"))}
    refs = check_references(pages)
    blocks = check_jsonld(pages)
    check_canonical(pages)
    check_sitemap(pages)
    check_llms()
    check_feed()
    check_backend_version()
    scripts = check_js()

    annotate = os.environ.get("GITHUB_ACTIONS") == "true"
    for file, line, msg in errors:
        print(f"{file}:{line}: {msg}")
        if annotate:
            print(f"::error file={file},line={line}::{msg}")
    if errors:
        print(f"\n{len(errors)} problem(s) found.")
        return 1
    print(f"ok: {len(pages)} pages, {refs} internal links, {blocks} JSON-LD blocks, "
          f"{scripts} scripts, sitemap, llms.txt, feed and backend version all check out.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
