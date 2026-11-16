#!/usr/bin/env node
// Writes the Guitar Academy's first-visit home page into guitar/index.html, between
// <div id="app"> and </div><!-- /app -->, so it is on screen (and readable by crawlers)
// before any script has loaded. The page is drawn by the same code the browser runs
// (guitar/views.js), for someone with no saved progress.
//
//     node .github/scripts/prerender_guitar.mjs           rewrite guitar/index.html
//     node .github/scripts/prerender_guitar.mjs --check   exit 1 if it is out of date
//
// Run it after changing anything the home page shows to a new visitor: Day 1 in course.js,
// the first module or lesson titles, or the home view itself. If you forget, nothing breaks:
// academy.js notices the copy differs from what it would draw and redraws the screen, which
// costs first-time visitors a brief flicker. check_site.py prints a reminder.
import { readFileSync, writeFileSync } from "node:fs";

const guitar = new URL("../../guitar/", import.meta.url);
const { renderRoute } = await import(new URL("views.js", guitar));
const { emptyProgress } = await import(new URL("progress.js", guitar));
const { newQuestion } = await import(new URL("reading.js", guitar));

// academy.js swaps this placeholder for today's date when it adopts the page.
const today = "0000-00-00";
const state = {
  progress: emptyProgress(),
  storageOk: true,
  reading: { mode: "notes", level: "open", bars: 2, attempts: 0, correct: 0 },
  quiz: newQuestion("notes", "open"),
  answer: undefined,
  theme: "auto",
  confirmDelete: null,
  today
};
const home = renderRoute(state, "home").html;

const file = new URL("index.html", guitar);
const page = readFileSync(file, "utf8");
const slot = /(<div id="app">)[\s\S]*?(<\/div><!-- \/app -->)/;
if (!slot.test(page)) {
  console.error('guitar/index.html: cannot find <div id="app">…</div><!-- /app -->');
  process.exit(2);
}
const next = page.replace(slot, (_, open, close) => open + home + close);

if (process.argv.includes("--check")) {
  if (next !== page) {
    console.error("guitar/index.html: the first-visit home page is out of date; run: node .github/scripts/prerender_guitar.mjs");
    process.exit(1);
  }
} else if (next !== page) {
  writeFileSync(file, next);
  console.log("guitar/index.html: first-visit home page updated.");
} else {
  console.log("guitar/index.html: first-visit home page already up to date.");
}
