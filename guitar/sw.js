// The Guitar Academy's offline worker. It keeps every file the academy and the note quiz need,
// so both open without a connection, and it serves them from that copy so they start at once.
// A new version arrives as a whole: the browser installs the new worker beside the old one,
// the page offers to switch ("A new version is ready"), and the next launch uses it anyway.
//
// The list of files and the version below are written by .github/scripts/stamp_guitar_sw.mjs
// from the files themselves; check_site.py fails while they are out of date. Do not edit them
// by hand: run  node .github/scripts/stamp_guitar_sw.mjs  after changing anything in guitar/.
//
// Videos from YouTube and the sync service are never stored here: they go to the network.
// The score videos and the reading sheets (PDF) are stored when Settings asks for them, or
// when one of them has been opened in full.

// <precache>
const VERSION = "62a4259c26623ce1";
const MEDIA_VERSION = "ba871a86e1aa0243";
const CORE = [
  "academy.css",
  "academy.js",
  "app.js",
  "audio.js",
  "chords.js",
  "course.js",
  "estas-guide.js",
  "fonts/OFL.txt",
  "fonts/commissioner-cyrillic.woff2",
  "fonts/commissioner-latin.woff2",
  "fonts/cormorant-garamond-cyrillic-italic.woff2",
  "fonts/cormorant-garamond-cyrillic.woff2",
  "fonts/cormorant-garamond-latin-italic.woff2",
  "fonts/cormorant-garamond-latin.woff2",
  "guided-lessons.js",
  "guided-practice.js",
  "guitar.webp",
  "icons/apple-touch-icon.png",
  "icons/favicon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/shortcut-hero.png",
  "icons/shortcut-metronome.png",
  "icons/shortcut-session.png",
  "icons/shortcut-tuner.png",
  "img/guitar-1440.avif",
  "img/guitar-720.avif",
  "img/guitar-720.webp",
  "index.html",
  "manifest.webmanifest",
  "notation-accidentals.js",
  "notation-symbols.js",
  "note-reading/icons/apple-touch-icon.png",
  "note-reading/icons/icon-192.png",
  "note-reading/icons/icon-512.png",
  "note-reading/icons/icon-maskable-512.png",
  "note-reading/index.html",
  "note-reading/manifest.webmanifest",
  "pitch.js",
  "plans.js",
  "practice-videos.js",
  "progress.js",
  "qr.js",
  "quiz-link.js",
  "quiz-store.js",
  "reading.js",
  "rpg.js",
  "support-videos.js",
  "sync-config.js",
  "sync.js",
  "tool-chords.js",
  "tool-compas.js",
  "tool-kit.js",
  "tool-metronome.js",
  "tool-session.js",
  "tool-tuner.js",
  "views.js"
];
const EXTRA = [
  "media/score-a.mp4",
  "media/score-b.mp4",
  "media/score-c.mp4",
  "media/score-d.mp4",
  "media/score-e.mp4",
  "media/score-f.mp4",
  "media/score-g.mp4",
  "media/score-h.mp4",
  "reading-sheets.pdf"
];
// </precache>

const PREFIX = "guitar-academy-";
const CACHE = PREFIX + VERSION;
const MEDIA = PREFIX + "media-" + MEDIA_VERSION;
const scope = new URL("./", self.location.href);
const pages = { "": "index.html", "index.html": "index.html", "note-reading/": "note-reading/index.html", "note-reading/index.html": "note-reading/index.html" };

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE.map(path => new Request(new URL(path, scope), { cache: "reload" })))));
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith(PREFIX) && key !== CACHE && key !== MEDIA) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if (event.data?.type === "activate") self.skipWaiting();
  if (event.data?.type === "save-everything") {
    event.waitUntil((async () => {
      let ok = true;
      try {
        const cache = await caches.open(MEDIA);
        await cache.addAll(EXTRA.map(path => new Request(new URL(path, scope), { cache: "reload" })));
      } catch { ok = false; }
      event.ports[0]?.postMessage({ ok });
    })());
  }
});

const relative = url => url.pathname.startsWith(scope.pathname) ? decodeURIComponent(url.pathname.slice(scope.pathname.length)) : null;

// A part of a stored file, for a video's range request (Safari plays videos only this way).
async function ranged(request, response) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") ?? "");
  if (!range) return response;
  const body = await response.blob();
  const start = range[1] === "" ? Math.max(0, body.size - Number(range[2])) : Number(range[1]);
  const end = range[1] !== "" && range[2] !== "" ? Math.min(Number(range[2]), body.size - 1) : body.size - 1;
  if (start >= body.size || start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${body.size}` } });
  return new Response(body.slice(start, end + 1), {
    status: 206,
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "video/mp4", "Content-Range": `bytes ${start}-${end}/${body.size}`, "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" }
  });
}

self.addEventListener("fetch", event => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  const path = relative(url);
  if (path === null || path === "sw.js") return;

  if (request.mode === "navigate") {
    const page = pages[path];
    if (!page) return;
    event.respondWith((async () => {
      const cached = await caches.match(new URL(page, scope), { cacheName: CACHE });
      if (cached) return cached;
      try { return await fetch(request); }
      catch { return (await caches.match(new URL("index.html", scope))) ?? Response.error(); }
    })());
    return;
  }

  if (EXTRA.includes(path)) {
    event.respondWith((async () => {
      const cached = await caches.match(new URL(path, scope), { cacheName: MEDIA, ignoreSearch: true });
      if (cached) return ranged(request, cached);
      const response = await fetch(request);
      if (response.status === 200 && !request.headers.has("range")) {
        const copy = response.clone();
        event.waitUntil(caches.open(MEDIA).then(cache => cache.put(new URL(path, scope), copy)).catch(() => {}));
      }
      return response;
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(new URL(path, scope), { cacheName: CACHE, ignoreSearch: true });
    if (cached) return cached;
    try {
      return await fetch(request);
    } catch {
      return (await caches.match(request, { ignoreSearch: true })) ?? Response.error();
    }
  })());
});
