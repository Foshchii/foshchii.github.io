// alive.js — shared "living site" behaviors for all foshchii pages.
// - human-like typewriter on the headline that carries the blinking underscore
// - content below the headline stays back, then cascades in when typing finishes
// - scroll-in reveals for sections, count-up stats, live CPH clock in the nav
// - decode/scramble hover on mono labels, cursor-following glow on cards, scroll progress hairline
// Loaded by each page's logic class via import('./alive.js') → init() → returns a dispose fn.

const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const NEIGH = {
  a: 'sq', b: 'vn', c: 'xv', d: 'sf', e: 'wr', f: 'dg', g: 'fh', h: 'gj', i: 'uo',
  j: 'hk', k: 'jl', l: 'k', m: 'n', n: 'bm', o: 'ip', p: 'o', q: 'wa', r: 'et',
  s: 'ad', t: 'ry', u: 'yi', v: 'cb', w: 'qe', x: 'zc', y: 'tu', z: 'x'
};
const GLYPHS = '!<>-_\\/[]{}—=+*^?#________';

export function init() {
  const disposers = [];
  const state = { alive: true, fast: false };
  disposers.push(() => { state.alive = false; });

  const root = document.querySelector('[data-screen-label]') || document.body;

  setupClock(root, disposers);
  setupProgressBar(disposers);
  setupScramble(root, disposers);
  setupCardGlow(root, disposers);
  setupMobileNav(root, disposers);

  const reveals = prepareReveals(root);
  const counts = prepareCountUps(root);
  scheduleRevealFailsafe(root, disposers);
  releaseWarpCover(disposers, reveals);
  setupComments(root, disposers);
  setupVisionFeed(root, disposers);
  setupWarp(disposers);
  setupFunCards(root, disposers);
  setupFlipCards(root, disposers);
  setupArticleReturn(root, disposers);

  setupTyping(root, state, disposers).then(() => {
    if (!state.alive) return;
    startReveals(reveals, disposers);
    startCountUps(counts, disposers);
  });

  return () => disposers.forEach((d) => { try { d(); } catch (e) { /* noop */ } });
}

/* ---------------- typing ---------------- */

function findCursor(root) {
  for (const s of root.querySelectorAll('h1 span')) {
    const attr = s.getAttribute('style') || '';
    if (attr.includes('om-blink') || (getComputedStyle(s).animationName || '').includes('om-blink')) return s;
  }
  return null;
}

async function setupTyping(root, state, disposers) {
  const cursor = findCursor(root);
  if (!cursor) return;
  const h1 = cursor.closest('h1');
  const key = 'om-typed:' + location.pathname + location.search;
  let skip = REDUCED || !!window.__omWarpArrived;
  try { skip = skip || !!sessionStorage.getItem(key); } catch (e) { /* storage blocked */ }
  if (skip) return;

  // tokens: every char (and <br>) that sits before the cursor
  const tokens = [];
  const originals = [];
  for (const node of Array.from(h1.childNodes)) {
    if (node === cursor) break;
    originals.push(node);
    if (node.nodeName === 'BR') tokens.push('\n');
    else for (const ch of (node.textContent || '')) tokens.push(ch);
  }
  if (!tokens.length) return;

  // hold back everything below the headline; it re-enters once typing is done
  const after = [];
  let sib = h1.nextElementSibling;
  while (sib) { after.push(sib); sib = sib.nextElementSibling; }
  for (const el of after) {
    el.style.animation = 'none';
    el.style.opacity = '0';
    el.style.transform = 'translateY(16px)';
    el.style.filter = 'blur(7px)';
  }

  // let webfonts + mobile stylesheet land, then reserve the final height so nothing jumps while typing
  try { await Promise.race([document.fonts.ready, sleep(700)]); } catch (e) { /* noop */ }
  const mob = document.querySelector('link[href*="mobile.css"]');
  if (mob && !mob.sheet) {
    await new Promise((r) => {
      mob.addEventListener('load', r, { once: true });
      mob.addEventListener('error', r, { once: true });
      setTimeout(r, 800);
    });
  }
  await new Promise((r) => requestAnimationFrame(r));
  if (!state.alive) return;
  const fullH = h1.getBoundingClientRect().height;
  if (fullH > 0) h1.style.minHeight = fullH + 'px';

  originals.forEach((n) => n.remove());
  const cursorAnim = cursor.style.animation;
  cursor.style.animation = 'none'; // solid cursor while "keys are moving"

  // click the headline to fast-forward
  const ff = () => { state.fast = true; };
  h1.addEventListener('pointerdown', ff);
  disposers.push(() => h1.removeEventListener('pointerdown', ff));

  let cur = document.createTextNode('');
  h1.insertBefore(cur, cursor);
  const newLine = () => {
    h1.insertBefore(document.createElement('br'), cursor);
    cur = document.createTextNode('');
    h1.insertBefore(cur, cursor);
  };

  await sleep(340);
  let typos = 0, burst = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (!state.alive) return;
    if (state.fast) {
      for (let j = i; j < tokens.length; j++) {
        if (tokens[j] === '\n') newLine(); else cur.textContent += tokens[j];
      }
      break;
    }
    const ch = tokens[i];
    if (ch === '\n') { await sleep(150 + Math.random() * 160); newLine(); continue; }

    // occasional slip of the finger, quickly corrected
    const low = ch.toLowerCase();
    if (typos < 2 && i > 3 && i < tokens.length - 2 && NEIGH[low] && Math.random() < 0.028) {
      typos++;
      const wrong = NEIGH[low][(Math.random() * NEIGH[low].length) | 0];
      cur.textContent += (ch === low ? wrong : wrong.toUpperCase());
      await sleep(170 + Math.random() * 150);
      if (!state.alive) return;
      cur.textContent = cur.textContent.slice(0, -1);
      await sleep(90 + Math.random() * 90);
      if (!state.alive) return;
    }

    cur.textContent += ch;

    let d = 26 + Math.random() * 36;                       // base rhythm
    if (burst > 0) { d = 13 + Math.random() * 14; burst--; } // confident runs
    else if (Math.random() < 0.2) burst = 2 + ((Math.random() * 4) | 0);
    if (',;:'.includes(ch)) d += 100 + Math.random() * 140; // breath at commas
    if ('.—!?'.includes(ch)) d += 170 + Math.random() * 230; // longer at stops
    if (ch === ' ' && Math.random() < 0.22) d += 30 + Math.random() * 90;
    if (Math.random() < 0.04) d += 150 + Math.random() * 280; // thinking…
    await sleep(d);
  }
  if (!state.alive) return;

  cursor.style.animation = cursorAnim; // resume blinking
  h1.style.minHeight = ''; // release the reservation — real content takes over now
  try { sessionStorage.setItem(key, '1'); } catch (e) { /* noop */ }

  // the held-back content cascades in
  after.forEach((el, i) => {
    setTimeout(() => {
      if (!state.alive) return;
      el.style.transition = 'opacity .6s cubic-bezier(.22,.7,.3,1), transform .6s cubic-bezier(.22,.7,.3,1), filter .6s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.filter = 'blur(0)';
    }, 80 + i * 140);
  });
  await sleep(120);
}

/* ---------------- comments under articles ---------------- */
// Mounts into <div data-m="comments" data-key="…"> placed in article templates.
// When GISCUS.repoId/categoryId are filled in, real shared comments load via
// giscus.app (GitHub Discussions). Until then — and whenever giscus can't load,
// e.g. in this preview — it falls back to browser-local comments.

/* ---------------- vision hero: rec timer + soft random glitch ---------------- */
// Opt-in: only runs if the page has [data-rec] / [data-glitch] elements
// (currently just the "My vision of the future" insight hero).

function setupVisionFeed(root, disposers) {
  const recs = Array.from(root.querySelectorAll('[data-rec]'));
  if (recs.length) {
    const t0 = Date.now();
    const pad = (n) => String(n).padStart(2, '0');
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - t0) / 1000);
      const txt = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor((s % 3600) / 60)) + ':' + pad(s % 60);
      recs.forEach((el) => { el.textContent = txt; });
    }, 1000);
    disposers.push(() => clearInterval(id));
  }
  const slices = Array.from(root.querySelectorAll('[data-glitch]'));
  if (slices.length && !REDUCED) {
    let alive = true;
    const burst = (el) => {
      el.style.transform = 'translateX(' + (Math.random() * 10 - 5).toFixed(1) + 'px)';
      el.style.opacity = '.55';
      setTimeout(() => { if (alive) el.style.opacity = '0'; }, 70 + Math.random() * 90);
    };
    const schedule = () => {
      if (!alive) return;
      setTimeout(() => {
        if (!alive) return;
        burst(slices[(Math.random() * slices.length) | 0]);
        if (Math.random() < 0.35) setTimeout(() => alive && burst(slices[(Math.random() * slices.length) | 0]), 140 + Math.random() * 120);
        schedule();
      }, 2500 + Math.random() * 6500);
    };
    schedule();
    disposers.push(() => { alive = false; });
  }
}

const GISCUS = {
  repo: 'foshchii/foshchii.github.io',
  repoId: '',      // ← paste from giscus.app
  category: 'Announcements',
  categoryId: ''   // ← paste from giscus.app
};

function setupComments(root, disposers) {
  const host = root.querySelector('[data-m="comments"]');
  if (!host) return;
  if (GISCUS.repoId && GISCUS.categoryId) {
    const label = document.createElement('div');
    label.style.cssText = "font:400 12px 'IBM Plex Mono',monospace;color:#67E8F9;margin-bottom:18px;";
    label.textContent = 'comments';
    host.appendChild(label);
    const s = document.createElement('script');
    s.src = 'https://giscus.app/client.js';
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.setAttribute('data-repo', GISCUS.repo);
    s.setAttribute('data-repo-id', GISCUS.repoId);
    s.setAttribute('data-category', GISCUS.category);
    s.setAttribute('data-category-id', GISCUS.categoryId);
    s.setAttribute('data-mapping', 'specific');
    s.setAttribute('data-term', host.getAttribute('data-key') || location.pathname);
    s.setAttribute('data-strict', '0');
    s.setAttribute('data-reactions-enabled', '1');
    s.setAttribute('data-emit-metadata', '0');
    s.setAttribute('data-input-position', 'top');
    s.setAttribute('data-theme', 'transparent_dark');
    s.setAttribute('data-lang', 'en');
    host.appendChild(s);
    return;
  }
  setupLocalComments(host, disposers);
}

function setupLocalComments(host, disposers) {
  const key = 'om-comments:' + (host.getAttribute('data-key') || location.pathname);
  const MONO = "'IBM Plex Mono',monospace";
  const SANS = "'Instrument Sans',sans-serif";

  const load = () => { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { return []; } };
  const save = (list) => { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { /* noop */ } };
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ago = (t) => {
    const s = (Date.now() - t) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    return Math.floor(s / 86400) + 'd ago';
  };

  host.innerHTML =
    '<div style="font:400 12px ' + MONO + ';color:#67E8F9;margin-bottom:18px">comments <span data-c="count" style="color:#4B4F5A"></span></div>' +
    '<div data-c="list" style="display:flex;flex-direction:column;gap:14px"></div>' +
    '<form data-c="form" style="margin-top:22px;border:1px solid #24262C;background:#15161B;padding:20px">' +
      '<input data-c="name" placeholder="your_name" maxlength="40" style="display:block;width:100%;box-sizing:border-box;background:#101114;border:1px solid #2E323D;color:#E8E9EC;font:400 13px ' + MONO + ';padding:11px 12px;outline:none">' +
      '<textarea data-c="text" placeholder="write a comment…" maxlength="1000" rows="3" style="display:block;width:100%;box-sizing:border-box;margin-top:10px;background:#101114;border:1px solid #2E323D;color:#E8E9EC;font:400 14.5px ' + SANS + ';line-height:1.6;padding:11px 12px;outline:none;resize:vertical"></textarea>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;gap:12px">' +
        '<span style="font:400 11px ' + MONO + ';color:#4B4F5A">preview mode: comments stay in this browser · giscus takes over once deployed</span>' +
        '<button type="submit" style="background:#67E8F9;border:none;color:#101114;font:600 12.5px ' + MONO + ';padding:11px 20px;cursor:pointer;letter-spacing:.03em">post_comment →</button>' +
      '</div>' +
    '</form>';

  const list = host.querySelector('[data-c="list"]');
  const count = host.querySelector('[data-c="count"]');
  const form = host.querySelector('[data-c="form"]');
  const nameEl = host.querySelector('[data-c="name"]');
  const textEl = host.querySelector('[data-c="text"]');

  // focus glow
  [nameEl, textEl].forEach((el) => {
    el.addEventListener('focus', () => { el.style.borderColor = '#67E8F9'; });
    el.addEventListener('blur', () => { el.style.borderColor = '#2E323D'; });
  });

  const render = () => {
    const items = load();
    count.textContent = items.length ? '(' + items.length + ')' : '';
    if (!items.length) {
      list.innerHTML = '<div style="font:400 13px ' + MONO + ';color:#4B4F5A;padding:18px 0">// no comments yet — be the first</div>';
      return;
    }
    list.innerHTML = items.map((c, i) =>
      '<div style="border:1px solid #24262C;background:#15161B;padding:16px 18px">' +
        '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap">' +
          '<span style="font:500 13px ' + MONO + ';color:#67E8F9">' + esc(c.name) + '</span>' +
          '<span style="display:flex;gap:14px;align-items:baseline"><span style="font:400 11.5px ' + MONO + ';color:#4B4F5A">' + ago(c.t) + '</span>' +
          '<button data-del="' + i + '" title="delete" style="background:none;border:none;color:#4B4F5A;font:400 12px ' + MONO + ';cursor:pointer;padding:0">×</button></span>' +
        '</div>' +
        '<p style="margin:9px 0 0;font:400 14.5px/1.65 ' + SANS + ';color:#C7CAD2;white-space:pre-wrap;overflow-wrap:break-word">' + esc(c.text) + '</p>' +
      '</div>'
    ).join('');
    list.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => {
      const items2 = load();
      items2.splice(parseInt(b.getAttribute('data-del'), 10), 1);
      save(items2);
      render();
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const name = nameEl.value.trim() || 'anonymous';
    const text = textEl.value.trim();
    if (!text) { textEl.style.borderColor = '#F87171'; return; }
    const items = load();
    items.push({ name, text, t: Date.now() });
    save(items);
    textEl.value = '';
    render();
  };
  form.addEventListener('submit', onSubmit);
  disposers.push(() => form.removeEventListener('submit', onSubmit));
  render();
}

/* ---------------- return to the row you came from ---------------- */
// Rows on the writing hub carry [data-article-row]. Opening one stores its slug;
// coming back from that article scrolls the row back under the cursor and gives
// it a short cyan wash, so the list picks up where the reader left it.

function setupArticleReturn(root, disposers) {
  const KEY = 'om-return-row';
  const rows = Array.from(root.querySelectorAll('[data-article-row]'));
  if (!rows.length) return;

  const onClick = (e) => {
    const row = e.target.closest && e.target.closest('[data-article-row]');
    if (!row) return;
    try { sessionStorage.setItem(KEY, row.getAttribute('data-article-row')); } catch (err) { /* noop */ }
  };
  document.addEventListener('click', onClick, true);
  disposers.push(() => document.removeEventListener('click', onClick, true));

  let want = null;
  try { want = sessionStorage.getItem(KEY); } catch (err) { /* noop */ }
  // only restore when the previous page really was one of the articles
  if (!want || !/writing-[a-z-]+\.dc\.html/.test(document.referrer || '')) return;
  try { sessionStorage.removeItem(KEY); } catch (err) { /* noop */ }

  const row = rows.find((r) => r.getAttribute('data-article-row') === want);
  if (!row) return;
  const id = requestAnimationFrame(() => {
    const y = row.getBoundingClientRect().top + window.scrollY - 140;
    window.scrollTo({ top: Math.max(0, y) });
    if (REDUCED) return;
    row.style.transition = 'background-color .6s ease-out';
    row.style.backgroundColor = 'rgba(103,232,249,.055)';
    const fade = setTimeout(() => { row.style.backgroundColor = ''; }, 1100);
    disposers.push(() => clearTimeout(fade));
  });
  disposers.push(() => cancelAnimationFrame(id));
}

/* ---------------- scroll reveals ---------------- */

function prepareReveals(root) {
  if (REDUCED) return [];
  const set = new Set(root.querySelectorAll('[data-reveal]'));
  for (const el of Array.from(root.children)) {
    if (set.has(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.92) set.add(el);
  }
  const els = Array.from(set);
  for (const el of els) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(22px)';
  }
  return els;
}

// Belt-and-suspenders: reveals normally start once the headline finishes typing
// (see setupTyping's .then() below). If that promise chain never settles for any
// reason, nothing below the hero would ever appear — so force anything still
// sitting in its pre-reveal, translateY-offset state to its resting, visible
// state after a few seconds. Scoped to translateY (what both reveal paths use)
// plus a near-zero opacity check so it never touches unrelated at-rest-invisible
// elements (e.g. the vision page's glitch flashes, which use translateX).
function scheduleRevealFailsafe(root, disposers) {
  const id = setTimeout(() => {
    root.querySelectorAll('[style*="translateY"]').forEach((el) => {
      if (parseFloat(getComputedStyle(el).opacity) > 0.05) return;
      el.style.transition = 'opacity .5s ease, transform .5s ease, filter .5s ease';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
      el.style.filter = 'none';
    });
  }, 3200);
  disposers.push(() => clearTimeout(id));
}

function startReveals(els, disposers) {
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target;
      const extra = parseFloat(el.getAttribute('data-reveal') || '0') * 1000;
      setTimeout(() => {
        el.style.transition = 'opacity .75s cubic-bezier(.22,.7,.3,1), transform .75s cubic-bezier(.22,.7,.3,1)';
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }, extra + i * 90);
      io.unobserve(el);
    });
  }, { threshold: 0.08 });
  els.forEach((el) => io.observe(el));
  disposers.push(() => io.disconnect());
}

/* ---------------- stat count-ups ---------------- */

function prepareCountUps(root) {
  if (REDUCED) return [];
  const found = [];
  // Prefer explicit [data-countup] targets. Without any, fall back to scanning
  // for bare-number headings — but read the inline font shorthand instead of
  // getComputedStyle so the scan doesn't force a style recalc for every node.
  const explicit = Array.from(root.querySelectorAll('[data-countup]'));
  const pool = explicit.length ? explicit : root.querySelectorAll('div,span');
  for (const el of pool) {
    const t = (el.textContent || '').trim();
    if (!/^\d{1,4}\+?$/.test(t)) continue;
    if (!explicit.length) {
      const fam = el.style && el.style.fontFamily;
      const size = el.style ? parseFloat(el.style.fontSize) : NaN;
      if (!fam || !fam.includes('Space Grotesk')) continue;
      if (!(size >= 36)) continue;
    }
    const tn = Array.from(el.childNodes).find((n) => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!tn) continue;
    const target = parseInt(tn.textContent, 10);
    if (!isFinite(target)) continue;
    tn.textContent = '0';
    found.push({ el, tn, target });
  }
  return found;
}

function startCountUps(items, disposers) {
  if (!items.length) return;
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e) => {
      const item = items.find((it) => it.el === e.target);
      io.unobserve(e.target);
      if (!item) return;
      const t0 = performance.now(), dur = 900;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        item.tn.textContent = String(Math.round(item.target * eased));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.4 });
  items.forEach((it) => io.observe(it.el));
  disposers.push(() => io.disconnect());
}

/* ---------------- live nav clock ---------------- */

function setupClock(root, disposers) {
  let el = null;
  for (const d of root.querySelectorAll('div')) {
    if (d.children.length === 0 && (d.textContent || '').includes('55.676')) { el = d; break; }
  }
  if (!el) return;
  el.dataset.omNoScramble = '1';
  const base = '55.676°N, 12.568°E — CPH';
  const tick = () => {
    try {
      const t = new Date().toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Europe/Copenhagen' });
      el.textContent = base + ' ' + t;
    } catch (e) { /* keep static */ }
  };
  tick();
  const id = setInterval(tick, 1000);
  disposers.push(() => clearInterval(id));
}

/* ---------------- scroll progress hairline ---------------- */

function setupProgressBar(disposers) {
  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;height:2px;width:0;z-index:9999;background:#67E8F9;box-shadow:0 0 12px rgba(103,232,249,.75);pointer-events:none;';
  document.body.appendChild(bar);
  let raf = 0;
  const onScroll = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
    });
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
  disposers.push(() => { window.removeEventListener('scroll', onScroll); bar.remove(); });
}

/* ---------------- decode/scramble hover on mono labels ---------------- */

function setupScramble(root, disposers) {
  if (REDUCED) return;
  const onEnter = (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    if (el.childElementCount !== 0) return;
    if (el.dataset && (el.dataset.omNoScramble || el.dataset.omScrambling)) return;
    const tag = el.tagName;
    if (tag !== 'A' && tag !== 'DIV' && tag !== 'SPAN') return;
    const text = el.textContent || '';
    if (text.length < 3 || text.length > 40) return;
    const cs = getComputedStyle(el);
    if (!cs.fontFamily.includes('IBM Plex Mono')) return;
    if (parseFloat(cs.fontSize) > 14.6) return;
    const now = performance.now();
    if (el._omLast && now - el._omLast < 900) return;
    el._omLast = now;
    scramble(el, text, disposers);
  };
  document.addEventListener('pointerenter', onEnter, true);
  disposers.push(() => document.removeEventListener('pointerenter', onEnter, true));
}

function scramble(el, original, disposers) {
  el.dataset.omScrambling = '1';
  const chars = Array.from(original);
  const total = Math.max(8, Math.min(16, 6 + chars.length * 0.35));
  let frame = 0;
  const id = setInterval(() => {
    frame++;
    const progress = frame / total;
    if (progress >= 1) {
      el.textContent = original;
      delete el.dataset.omScrambling;
      clearInterval(id);
      return;
    }
    el.textContent = chars.map((ch, i) => {
      if (ch === ' ') return ' ';
      if (progress > (i / chars.length) * 0.75 + 0.22) return ch;
      if (Math.random() < 0.25) return ch;
      return GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }).join('');
  }, 34);
  disposers.push(() => { clearInterval(id); el.textContent = original; delete el.dataset.omScrambling; });
}

/* ---------------- cursor-following glow on cards ---------------- */

function setupCardGlow(root, disposers) {
  if (REDUCED) return;
  // Prefer explicit opt-in: any element tagged [data-glow]. Falls back to a
  // cheap heuristic (inline background read — no getComputedStyle, so no forced
  // style recalc across the DOM) for pages that haven't been tagged yet.
  const cards = Array.from(root.querySelectorAll('[data-glow]'));
  if (!cards.length) {
    for (const el of root.querySelectorAll('div,a')) {
      try {
        if (el.style && el.style.backgroundColor === 'rgb(21, 22, 27)' && el.offsetHeight >= 70) cards.push(el);
      } catch (e) { /* noop */ }
    }
  }
  const move = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    el.style.backgroundImage = 'radial-gradient(340px circle at ' + x + 'px ' + y + 'px, rgba(103,232,249,0.085), transparent 62%)';
  };
  const leave = (e) => { e.currentTarget.style.backgroundImage = ''; };
  cards.forEach((el) => {
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
  });
  disposers.push(() => cards.forEach((el) => {
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerleave', leave);
    el.style.backgroundImage = '';
  }));
}

// On arrival after a warp, the page's helmet script has already covered the
// viewport (reading the om-warp-in flag) so content never flashes before the
// reveal engine hides it. Once reveals are prepared, fade the cover away.
function releaseWarpCover(disposers, reveals) {
  try { sessionStorage.removeItem('om-warp-in'); } catch (e) { /* noop */ }
  const cover = document.getElementById('om-warp-cover');
  if (!cover) return;
  // Arriving via a page transition: land settled. Flag it so setupTyping skips
  // the typewriter (which would wipe the headline mid-fade — the "blink"),
  // freeze entrance keyframes at their end state, and cancel the scroll-reveal
  // choreography for this load. Then one quick fade of the cover.
  window.__omWarpArrived = true;
  document.querySelectorAll('[style*="om-rise"]').forEach((el) => { el.style.animation = 'none'; });
  if (reveals) {
    for (const el of reveals) {
      el.style.transition = 'none';
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.filter = 'none';
    }
    reveals.length = 0;
  }
  requestAnimationFrame(() => {
    cover.style.transition = 'opacity .16s linear';
    cover.style.opacity = '0';
  });
  const id = setTimeout(() => cover.remove(), 220);
  disposers.push(() => { clearTimeout(id); cover.remove(); });
}

/* ---------------- cosmic warp page transitions ---------------- */// Intercepts internal links and plays a short "space travel" effect before
// navigating. Per-link variant via data-warp="rings|streaks|spiral|burst|zoom",
// else the enclosing [data-warp-zone], else a deterministic per-link cycle.

const WARP_CSS =
  '@keyframes om-warp-ring{0%{transform:scale(.05);opacity:.95}70%{opacity:.5}100%{transform:scale(9);opacity:0}}' +
  '@keyframes om-warp-spin{from{transform:rotate(0);opacity:.9}80%{opacity:.9}to{transform:rotate(340deg);opacity:0}}' +
  '@keyframes om-warp-flash{0%{opacity:0}50%{opacity:1}100%{opacity:0}}' +
  '@keyframes om-warp-streak{0%{transform:translateY(60px) scaleY(.3);opacity:0}25%{opacity:1}100%{transform:translateY(-520px) scaleY(3.6);opacity:0}}' +
  '@keyframes om-warp-spiral{0%{transform:rotate(0) scale(.12);opacity:.95}100%{transform:rotate(720deg) scale(2.8);opacity:0}}' +
  '@keyframes om-warp-burst{0%{transform:translateY(0) scale(.4);opacity:1}100%{transform:translateY(-440px) scale(1.6);opacity:0}}' +
  '@keyframes om-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.5px)}}';

function buildWarpOverlay() {
  const ov = document.createElement('div');
  ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#101114;opacity:0;pointer-events:none;';
  return ov;
}

function setupWarp(disposers) {
  const style = document.createElement('style');
  style.textContent = WARP_CSS;
  document.head.appendChild(style);
  let overlay = null;
  let warpId = 0;

  const play = (href, zone) => {
    if (REDUCED) { window.location.href = href; return; }
    if (!overlay) { overlay = buildWarpOverlay(); document.body.appendChild(overlay); }
    // Quiet dissolve: fade a solid dark cover in, navigate only once it has
    // actually reached full opacity (transitionend, with a safety fallback) so
    // the cut to the next page is never visible mid-fade.
    overlay.style.transition = 'opacity .15s linear';
    overlay.style.pointerEvents = 'auto';
    try { sessionStorage.setItem('om-warp-in', '1'); } catch (e) { /* noop */ }
    let gone = false;
    const go = () => { if (!gone) { gone = true; window.location.href = href; } };
    overlay.addEventListener('transitionend', go, { once: true });
    warpId = setTimeout(go, 230);
    void overlay.offsetWidth;
    overlay.style.opacity = '1';
  };

  const onClick = (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (a.dataset.omDragged === '1') { e.preventDefault(); return; }
    const href = a.getAttribute('href') || '';
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || /^https?:\/\//i.test(href)) return;
    if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    let zone = a.getAttribute('data-warp');
    if (!zone) {
      const zc = a.closest('[data-warp-zone]');
      zone = zc ? zc.getAttribute('data-warp-zone') : '';
    }
    if (!zone) {
      const all = Array.from(document.querySelectorAll('a[href]'));
      zone = ['rings', 'streaks', 'spiral', 'burst', 'zoom'][Math.max(0, all.indexOf(a)) % 5];
    }
    play(href, zone);
  };
  document.addEventListener('click', onClick, true);
  disposers.push(() => {
    document.removeEventListener('click', onClick, true);
    clearTimeout(warpId);
    if (overlay) overlay.remove();
    style.remove();
  });
}

/* ---------------- floating, drag-and-return cards ---------------- */
// Tag any card with data-fun-card: it floats gently and can be dragged
// around, springing back to its place on release.

function setupFunCards(root, disposers) {
  if (REDUCED) return;
  const cards = Array.from(root.querySelectorAll('[data-fun-card]'));
  cards.forEach((el, i) => {
    if (!el.style.position) el.style.position = 'relative';
    const dur = (2.6 + (i % 5) * 0.32).toFixed(2);
    el.style.animation = 'om-float ' + dur + 's ease-in-out infinite';
    el.style.animationDelay = ((i % 7) * 0.17).toFixed(2) + 's';
    makeDraggable(el, disposers);
  });
}

function makeDraggable(el, disposers) {
  const floatAnim = el.style.animation;
  let sx = 0, sy = 0, moved = false, pid = null;
  const onMove = (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 6) {
      moved = true;
      el.style.animation = 'none';
      el.style.transition = 'none';
      el.style.zIndex = '40';
      el.style.cursor = 'grabbing';
    }
    if (moved) el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + (dx / 45) + 'deg)';
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (pid !== null) { try { el.releasePointerCapture(pid); } catch (err) { /* noop */ } }
    if (moved) {
      el.dataset.omDragged = '1';
      el.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
      el.style.transform = 'translate(0,0) rotate(0)';
      el.style.cursor = '';
      setTimeout(() => {
        el.style.zIndex = '';
        el.style.animation = floatAnim;
        delete el.dataset.omDragged;
      }, 650);
    }
    moved = false;
  };
  const onDown = (e) => {
    sx = e.clientX; sy = e.clientY; moved = false; pid = e.pointerId;
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };
  el.addEventListener('pointerdown', onDown);
  disposers.push(() => el.removeEventListener('pointerdown', onDown));
}

/* ---------------- flip cards ---------------- */
// <div data-flip-card data-flip-target="rotateY(180deg)"> with a
// [data-flip-inner] child holding front + back faces.

function setupFlipCards(root, disposers) {
  root.querySelectorAll('[data-flip-card]').forEach((card) => {
    const inner = card.querySelector('[data-flip-inner]');
    if (!inner) return;
    const target = card.getAttribute('data-flip-target') || 'rotateY(180deg)';
    const onClick = () => {
      const flipped = inner.dataset.flipped === '1';
      inner.style.transform = flipped ? 'none' : target;
      inner.dataset.flipped = flipped ? '0' : '1';
    };
    card.addEventListener('click', onClick);
    disposers.push(() => card.removeEventListener('click', onClick));
  });
}

/* ---------------- mobile burger nav ---------------- */
// The burger button is injected into the nav with display:none;
// mobile.css shows it under 760px and hides the desktop link row.

function setupMobileNav(root, disposers) {
  const nav = root.querySelector('[data-m="nav"]');
  const links = nav && nav.querySelector('[data-m="navlinks"]');
  if (!nav || !links) return;

  const btn = document.createElement('button');
  btn.setAttribute('data-m', 'burger');
  btn.setAttribute('aria-label', 'open menu');
  btn.style.cssText = 'display:none;align-items:center;gap:8px;background:transparent;border:1px solid #2E323D;color:#E8E9EC;font:500 12px "IBM Plex Mono",monospace;padding:10px 14px;cursor:pointer;letter-spacing:.04em;';
  btn.innerHTML = '<span style="color:#67E8F9;font-size:14px;line-height:1">≡</span>menu';
  nav.appendChild(btn);

  let ov = null, escFn = null;
  const close = () => {
    if (!ov) return;
    const o = ov; ov = null;
    o.style.opacity = '0';
    document.body.style.overflow = '';
    if (escFn) { document.removeEventListener('keydown', escFn); escFn = null; }
    setTimeout(() => o.remove(), 260);
  };
  const open = () => {
    if (ov) return;
    ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9998;background:rgba(13,14,17,.97);display:flex;flex-direction:column;padding:14px 20px 28px;opacity:0;transition:opacity .25s ease;overflow:auto;font-family:"IBM Plex Mono",monospace;';
    const head = document.createElement('div');
    head.style.cssText = 'display:flex;align-items:center;justify-content:space-between;padding:2px 0 14px;border-bottom:1px solid #24262C;';
    const brand = document.createElement('div');
    brand.style.cssText = 'font:400 12.5px "IBM Plex Mono",monospace;color:#7E838F;';
    brand.innerHTML = '<span style="color:#67E8F9">~</span>/foshchii';
    const x = document.createElement('button');
    x.setAttribute('aria-label', 'close menu');
    x.style.cssText = 'background:transparent;border:1px solid #2E323D;color:#E8E9EC;font:500 12px "IBM Plex Mono",monospace;padding:10px 14px;cursor:pointer;';
    x.textContent = '× close';
    x.addEventListener('click', close);
    head.appendChild(brand);
    head.appendChild(x);
    ov.appendChild(head);

    const list = document.createElement('div');
    list.style.cssText = 'display:flex;flex-direction:column;margin-top:6px;';
    Array.from(links.querySelectorAll('a')).forEach((a, i) => {
      const active = getComputedStyle(a).color === 'rgb(232, 233, 236)';
      const c = document.createElement('a');
      c.href = a.getAttribute('href') || '#';
      c.style.cssText = 'display:flex;align-items:center;gap:12px;padding:15px 2px;border-bottom:1px solid #1B1D23;text-decoration:none;font:400 19px "IBM Plex Mono",monospace;color:' + (active ? '#E8E9EC' : '#7E838F') + ';opacity:0;transform:translateY(8px);transition:opacity .3s ease ' + (50 + i * 40) + 'ms, transform .3s ease ' + (50 + i * 40) + 'ms;';
      if (active) {
        const mark = document.createElement('span');
        mark.style.cssText = 'color:#67E8F9;';
        mark.textContent = '>';
        c.appendChild(mark);
      }
      c.appendChild(document.createTextNode(a.textContent));
      list.appendChild(c);
    });
    ov.appendChild(list);

    const foot = document.createElement('div');
    foot.style.cssText = 'margin-top:auto;padding-top:24px;font:400 11.5px "IBM Plex Mono",monospace;color:#4B4F5A;display:flex;flex-direction:column;gap:6px;';
    foot.innerHTML = '<div>55.676°N, 12.568°E — CPH</div><div>sviatoslav.foshchii@gmail.com</div>';
    ov.appendChild(foot);

    document.body.appendChild(ov);
    document.body.style.overflow = 'hidden';
    escFn = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', escFn);
    requestAnimationFrame(() => {
      if (!ov) return;
      ov.style.opacity = '1';
      ov.querySelectorAll('a').forEach((el) => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; });
    });
  };
  btn.addEventListener('click', open);
  disposers.push(() => { btn.remove(); close(); });
}
