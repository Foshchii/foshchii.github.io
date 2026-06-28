/* =========================================================================
   main.js — progressive enhancement for the site.
   Everything degrades gracefully: with JS off, the site is still fully usable.
   ========================================================================= */
(function () {
  "use strict";

  const root = document.documentElement;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. THEME (light default, remembers choice, respects OS) ---------- */
  const THEME_KEY = "sf-theme";
  const stored = localStorage.getItem(THEME_KEY);
  const osDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  setTheme(stored || (osDark ? "dark" : "light"));

  function setTheme(mode) {
    root.setAttribute("data-theme", mode);
    const toggle = document.querySelector(".theme-toggle");
    if (toggle) toggle.setAttribute("aria-label",
      mode === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  document.addEventListener("click", function (e) {
    const toggle = e.target.closest(".theme-toggle");
    if (!toggle) return;
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
  });

  /* ---- 2. MOBILE NAV --------------------------------------------------- */
  const menuBtn = document.querySelector(".menu-btn");
  const nav = document.getElementById("primary-nav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      const open = nav.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", String(open));
      menuBtn.classList.toggle("is-open", open);
    });
    // Close after choosing a link
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.classList.remove("is-open");
      }
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        nav.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.classList.remove("is-open");
        menuBtn.focus();
      }
    });
  }

  /* ---- 3. STICKY HEADER SHADOW ON SCROLL ------------------------------- */
  const header = document.querySelector(".site-header");
  if (header) {
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---- 4. SCROLL REVEAL ------------------------------------------------ */
  const reveals = document.querySelectorAll(".reveal");
  if (prefersReduced || !("IntersectionObserver" in window)) {
    reveals.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach((el) => io.observe(el));
  }

  /* ---- 5. ANIMATE LANGUAGE / SKILL BARS WHEN VISIBLE ------------------- */
  const bars = document.querySelectorAll(".bar > span[data-level]");
  if (bars.length) {
    const fill = (el) => { el.style.width = el.dataset.level + "%"; };
    if (prefersReduced || !("IntersectionObserver" in window)) {
      bars.forEach(fill);
    } else {
      const bo = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { fill(entry.target); obs.unobserve(entry.target); }
        });
      }, { threshold: 0.4 });
      bars.forEach((el) => bo.observe(el));
    }
  }

  /* ---- 6. COUNT-UP FOR STATS ------------------------------------------- */
  const nums = document.querySelectorAll(".num[data-count]");
  if (nums.length && !prefersReduced && "IntersectionObserver" in window) {
    const co = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || "";
        const dur = 1300;
        const start = performance.now();
        const step = (now) => {
          const p = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const val = target % 1 ? (target * eased).toFixed(1) : Math.round(target * eased);
          el.textContent = val + suffix;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        obs.unobserve(el);
      });
    }, { threshold: 0.6 });
    nums.forEach((el) => co.observe(el));
  }

  /* ---- 7. FOOTER YEAR -------------------------------------------------- */
  const yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
