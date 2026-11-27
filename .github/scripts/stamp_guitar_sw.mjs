#!/usr/bin/env node
// Writes the Guitar Academy offline worker's file list and version into guitar/sw.js, between
// "// <precache>" and "// </precache>". The version is a hash of the files' contents, so it changes
// whenever one of them does, and installed apps then fetch the new version as a whole.
//
//     node .github/scripts/stamp_guitar_sw.mjs           rewrite guitar/sw.js
//     node .github/scripts/stamp_guitar_sw.mjs --check   exit 1 if it is out of date
//
// Run it last, after any change in guitar/ (after prerender_guitar.mjs, which changes index.html).
// CORE is every file the academy and the note quiz load; EXTRA, kept separately and only on
// request, holds the score videos and the reading sheets.
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const guitar = fileURLToPath(new URL("../../guitar/", import.meta.url));
const worker = join(guitar, "sw.js");
const skip = new Set(["sw.js", "README.md", ".DS_Store", "Thumbs.db"]);
const extra = path => path.startsWith("media/") || path === "reading-sheets.pdf";
// Files only the browser's install dialog or a link preview asks for; the app never needs them offline.
const notNeeded = path => path.startsWith("img/screens/") || path === "img/share.jpg";

function walk(folder, found = []) {
  for (const name of readdirSync(folder).sort()) {
    const full = join(folder, name);
    if (name.startsWith(".")) continue;
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(relative(guitar, full).split(sep).join("/"));
  }
  return found;
}

const files = walk(guitar).filter(path => !skip.has(path.split("/").at(-1)));
const core = files.filter(path => !extra(path) && !notNeeded(path));
const more = files.filter(extra);
const hash = list => {
  const digest = createHash("sha256");
  for (const path of list) digest.update(path + "\0").update(readFileSync(join(guitar, path))).update("\0");
  return digest.digest("hex").slice(0, 16);
};
const list = items => "[\n" + items.map(item => `  ${JSON.stringify(item)}`).join(",\n") + "\n]";
const block = `// <precache>
const VERSION = "${hash(core)}";
const MEDIA_VERSION = "${hash(more)}";
const CORE = ${list(core)};
const EXTRA = ${list(more)};
// </precache>`;

const source = readFileSync(worker, "utf8");
const slot = /\/\/ <precache>[\s\S]*?\/\/ <\/precache>/;
if (!slot.test(source)) {
  console.error("guitar/sw.js: cannot find the // <precache> … // </precache> block");
  process.exit(2);
}
const next = source.replace(slot, block);
if (process.argv.includes("--check")) {
  if (next !== source) {
    console.error("guitar/sw.js: the offline file list or version is out of date; run: node .github/scripts/stamp_guitar_sw.mjs");
    process.exit(1);
  }
} else if (next !== source) {
  writeFileSync(worker, next);
  console.log(`guitar/sw.js: version ${hash(core)}, ${core.length} files kept offline, ${more.length} more on request.`);
} else {
  console.log("guitar/sw.js: already up to date.");
}
