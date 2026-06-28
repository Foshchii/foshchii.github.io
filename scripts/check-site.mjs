import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://foshchii.github.io";
const ignoredDirs = new Set([".git", "node_modules", "tmp"]);
const ignoredSchemes = /^(?:https?:|mailto:|tel:|sms:|webcal:|data:|javascript:)/i;
const checks = [];
const failures = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (ignoredDirs.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(target));
    } else {
      files.push(target);
    }
  }

  return files;
}

const htmlFiles = walk(root)
  .filter((file) => file.endsWith(".html"))
  .map((file) => path.relative(root, file))
  .sort();

function fileExists(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function directoryExists(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function stripQueryAndHash(value) {
  return value.split("#")[0].split("?")[0];
}

function decodePath(value) {
  try {
    return decodeURI(value);
  } catch {
    return value;
  }
}

function resolveInternalReference(fromFile, value) {
  if (!value || value.startsWith("#")) return null;

  const cleanValue = value.trim();
  if (!cleanValue || cleanValue.startsWith("//")) return null;

  if (cleanValue.startsWith(siteOrigin)) {
    return path.join(root, new URL(cleanValue).pathname);
  }

  if (ignoredSchemes.test(cleanValue)) return null;

  const clean = decodePath(stripQueryAndHash(cleanValue)).trim();
  if (!clean) return null;

  if (clean.startsWith("/")) {
    return path.join(root, clean);
  }

  return path.resolve(root, path.dirname(fromFile), clean);
}

function collectReferences(html) {
  const refs = [];
  const patterns = [
    /\b(?:href|src|poster|action)=["']([^"']+)["']/gi,
    /\bsrcset=["']([^"']+)["']/gi,
    /\bcontent=["'](https:\/\/foshchii\.github\.io\/[^"']+)["']/gi
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(html))) {
      if (pattern.source.includes("srcset")) {
        for (const candidate of match[1].split(",")) {
          const [url] = candidate.trim().split(/\s+/);
          refs.push(url);
        }
      } else {
        refs.push(match[1]);
      }
    }
  }

  return refs;
}

function getAttr(html, selector) {
  const match = html.match(selector);
  return match ? match[1] : "";
}

function canonicalToPath(canonical) {
  if (!canonical.startsWith(siteOrigin)) return null;
  const url = new URL(canonical);
  if (url.pathname === "/") return "index.html";
  if (url.pathname.endsWith("/")) return path.join(url.pathname.slice(1), "index.html");
  return url.pathname.slice(1);
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");

for (const file of htmlFiles) {
  const absolute = path.join(root, file);
  const html = fs.readFileSync(absolute, "utf8");
  const isNoindex = /<meta\s+name=["']robots["']\s+content=["'][^"']*noindex/i.test(html);
  checks.push(`${file}: readable`);

  for (const ref of collectReferences(html)) {
    const target = resolveInternalReference(file, ref);
    if (!target) continue;

    const clean = stripQueryAndHash(ref);
    const pointsToRoot = clean === "/" || clean === ".";
    const ok = pointsToRoot
      ? directoryExists(target)
      : fileExists(target) || directoryExists(target) || fileExists(`${target}.html`);

    checks.push(`${file}: ${ref}`);
    if (!ok) {
      failures.push(`${file} references missing path: ${ref}`);
    }
  }

  const h1Count = (html.match(/<h1\b/gi) || []).length;
  checks.push(`${file}: h1`);
  if (h1Count !== 1) failures.push(`${file} must contain exactly one h1; found ${h1Count}`);

  const title = getAttr(html, /<title>([^<]+)<\/title>/i).trim();
  checks.push(`${file}: title`);
  if (!title) failures.push(`${file} is missing a title`);

  const canonical = getAttr(html, /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i).trim();
  if (!isNoindex) {
    checks.push(`${file}: canonical`);
    if (!canonical) failures.push(`${file} is missing a canonical URL`);

    const description = getAttr(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i).trim();
    checks.push(`${file}: description`);
    if (!description) failures.push(`${file} is missing a meta description`);

    const expectedPath = canonical ? canonicalToPath(canonical) : null;
    if (expectedPath && path.normalize(expectedPath) !== path.normalize(file)) {
      failures.push(`${file} canonical points to ${expectedPath}`);
    }

    if (canonical && !sitemap.includes(`<loc>${canonical}</loc>`)) {
      failures.push(`${file} canonical is missing from sitemap: ${canonical}`);
    }

    const ogImage = getAttr(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i).trim();
    checks.push(`${file}: og:image`);
    if (!ogImage) {
      failures.push(`${file} is missing og:image`);
    } else {
      const target = resolveInternalReference(file, ogImage);
      if (target && !fileExists(target)) {
        failures.push(`${file} og:image does not exist locally: ${ogImage}`);
      }
    }

    checks.push(`${file}: feed link`);
    if (!html.includes('type="application/rss+xml"') || !html.includes(`${siteOrigin}/feed.xml`)) {
      failures.push(`${file} is missing the RSS feed link`);
    }
  }

  const jsonLdBlocks = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  for (const [index, block] of jsonLdBlocks.entries()) {
    checks.push(`${file}: JSON-LD ${index + 1}`);
    try {
      JSON.parse(block[1]);
    } catch (error) {
      failures.push(`${file} has invalid JSON-LD block ${index + 1}: ${error.message}`);
    }
  }
}

const requiredFiles = [
  ".nojekyll",
  "feed.xml",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "assets/Sviatoslav-Foshchii-CV.pdf",
  "assets/css/styles.css",
  "assets/js/main.js",
  "assets/js/booking-widget.js"
];

for (const file of requiredFiles) {
  checks.push(file);
  if (!fileExists(path.join(root, file))) {
    failures.push(`Required file is missing: ${file}`);
  }
}

const feed = fs.readFileSync(path.join(root, "feed.xml"), "utf8");
checks.push("feed.xml: rss");
if (!/<rss\b[^>]*version=["']2\.0["']/i.test(feed) || !feed.includes(`${siteOrigin}/insights.html`)) {
  failures.push("feed.xml is not a valid RSS 2.0 article feed");
}

if (failures.length) {
  console.error("Site check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Site check passed: ${checks.length} checks across ${htmlFiles.length} HTML files.`);
