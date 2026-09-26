#!/usr/bin/env python3
"""Build feed.xml, the RSS feed for the writing section.

Everything comes from the pages themselves, so the feed never says anything
the site does not:
  - article order is the order writing.html links them in
  - each item's title, summary, URL and date come from the article's own
    Article JSON-LD block
  - the channel title and description come from writing.html's meta tags

Run after adding or editing an article:
    python3 .github/scripts/build_feed.py

The site check (check_site.py) fails if feed.xml is out of date.
"""

import json
import re
import sys
from datetime import datetime, timezone
from email.utils import format_datetime
from pathlib import Path
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parents[2]
SITE = "https://foshchii.com/"
FEED = "feed.xml"
INDEX = "writing.html"


def meta(html, attr, name):
    m = re.search(rf'<meta {attr}="{re.escape(name)}" content="([^"]*)"', html)
    if not m:
        raise ValueError(f"{INDEX}: no <meta {attr}=\"{name}\">")
    return m.group(1)


def article(page):
    html = (ROOT / page).read_text(encoding="utf-8")
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
        data = json.loads(block)
        if data.get("@type") == "Article":
            return data
    raise ValueError(f"{page}: no Article JSON-LD block")


def rfc822(day):
    when = datetime.fromisoformat(day)
    return format_datetime(when if when.tzinfo else when.replace(tzinfo=timezone.utc))


def render():
    index = (ROOT / INDEX).read_text(encoding="utf-8")
    pages = list(dict.fromkeys(re.findall(r'href="/?(writing-[a-z0-9-]+\.html)"', index)))
    articles = [article(p) for p in pages]
    # Derived from the articles rather than the clock, so rebuilding an
    # unchanged site produces an identical file.
    updated = max(a.get("dateModified", a["datePublished"]) for a in articles)

    out = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
        "  <channel>",
        f"    <title>{escape(meta(index, 'property', 'og:title'))}</title>",
        f"    <link>{SITE}{INDEX}</link>",
        f"    <description>{escape(meta(index, 'name', 'description'))}</description>",
        "    <language>en</language>",
        f"    <lastBuildDate>{rfc822(updated)}</lastBuildDate>",
        f'    <atom:link href="{SITE}{FEED}" rel="self" type="application/rss+xml"/>',
    ]
    for a in articles:
        out += [
            "    <item>",
            f"      <title>{escape(a['headline'])}</title>",
            f"      <link>{escape(a['url'])}</link>",
            f'      <guid isPermaLink="true">{escape(a["url"])}</guid>',
            f"      <description>{escape(a['description'])}</description>",
            f"      <dc:creator>{escape(a['author']['name'])}</dc:creator>",
            f"      <pubDate>{rfc822(a['datePublished'])}</pubDate>",
            "    </item>",
        ]
    out += ["  </channel>", "</rss>", ""]
    return "\n".join(out)


if __name__ == "__main__":
    (ROOT / FEED).write_text(render(), encoding="utf-8")
    print(f"wrote {FEED}", file=sys.stderr)
