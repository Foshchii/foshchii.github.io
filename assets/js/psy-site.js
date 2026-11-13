/* =========================================================================
   Psychology pages: the three small behaviours the pages have.

   1. The phone menu. On narrow screens (800px and below) the header's links
      fold behind a "Menu" button. The button is a plain disclosure: it says
      whether the menu is open (aria-expanded), Escape closes it and returns
      focus to the button, and it closes when focus leaves the header or a
      link is chosen. Without this script the CSS never hides the links.

   2. Certificates on the Training page open full size over the page, in a
      native <dialog>, instead of replacing it.

   3. Blocks further down the page rise into place once, as they scroll into
      view. Progressive by design: without this script, in a browser that
      lacks IntersectionObserver, or for a visitor who asks for reduced
      motion, nothing is ever hidden. Blocks already on screen when the page
      opens are left alone, so nothing flashes. The observer reports where
      each block is, so the script never measures the page itself.

   The styles are in psychology/site.css (.menu-toggle, .lightbox, .reveal).
   No dependencies, no storage, no requests.
   ========================================================================= */
(function () {
  "use strict";

  /* ---- 1. the phone menu ---- */
  (function menu() {
    var header = document.querySelector(".site-header");
    var toggle = header && header.querySelector(".menu-toggle");
    var nav = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
    if (!nav) return;
    var root = document.documentElement;
    var narrow = window.matchMedia ? window.matchMedia("(max-width: 800px)") : null;

    function isOpen() { return header.classList.contains("is-open"); }

    function setOpen(open, focusToggle) {
      if (open === isOpen()) return;
      if (open) {
        // the panel starts right under the header, whatever its height
        header.style.setProperty("--menu-top", Math.round(header.getBoundingClientRect().bottom) + "px");
      }
      header.classList.toggle("is-open", open);
      root.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      var text = toggle.querySelector(".menu-text");
      if (text) text.textContent = open ? "Close" : "Menu";
      if (!open && focusToggle) toggle.focus();
    }

    toggle.addEventListener("click", function () { setOpen(!isOpen()); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) setOpen(false, true);
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("a")) setOpen(false);
    });
    header.addEventListener("focusout", function (e) {
      if (isOpen() && e.relatedTarget && !header.contains(e.relatedTarget)) setOpen(false);
    });
    if (narrow) {
      var reset = function (e) { if (!e.matches) setOpen(false); };
      if (narrow.addEventListener) narrow.addEventListener("change", reset);
      else if (narrow.addListener) narrow.addListener(reset);
    }
    // coming back to a page from the browser's history: start closed
    window.addEventListener("pageshow", function () { setOpen(false); });
  })();

  /* ---- 2. certificates open over the page ----
     Each certificate is a link to its full-size scan. Where the browser has
     <dialog>, the scan opens over the page instead of replacing it: Escape,
     the Close button or a click outside closes it, and focus returns to the
     link. Without this the link simply opens the image. */
  (function certificates() {
    var links = document.querySelectorAll("a.cert");
    if (!links.length || typeof HTMLDialogElement !== "function") return;
    var dialog = document.createElement("dialog");
    dialog.className = "lightbox";
    dialog.setAttribute("aria-label", "Certificate");
    dialog.innerHTML = '<button type="button" class="lightbox-close">Close <span aria-hidden="true">×</span></button>' +
      '<img alt=""><p class="lightbox-cap"></p>';
    document.body.appendChild(dialog);
    var img = dialog.querySelector("img");
    var cap = dialog.querySelector(".lightbox-cap");
    var opener = null;

    dialog.querySelector(".lightbox-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });
    dialog.addEventListener("close", function () {
      document.documentElement.classList.remove("lightbox-open");
      img.removeAttribute("src");
      if (opener) opener.focus();
    });

    Array.prototype.forEach.call(links, function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;  // new tab: let it be
        e.preventDefault();
        opener = a;
        var thumb = a.querySelector("img");
        var text = thumb ? thumb.getAttribute("alt") : "";
        img.src = a.getAttribute("href");
        img.alt = text;
        cap.textContent = text;
        document.documentElement.classList.add("lightbox-open");
        dialog.showModal();
      });
    });
  })();

  /* ---- 3. blocks that rise into view ---- */
  if (!("IntersectionObserver" in window)) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // The blocks that rise, and the ones laid out side by side, which follow
  // each other a beat apart.
  var BLOCKS = ".head, .cols-head, .areas article, .statement, .stats > div, .steps li, .points, " +
    ".cards > .card, .entry, .faq, .split > *, .booking-grid > *, .story > *, .profile, .pager a, .cta-panel > *";
  var IN_A_ROW = ".stats > div, .steps li, .cards > .card";
  var EDGE = 0.08;   // a block has arrived once it is this far up from the bottom of the screen

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var el = entry.target;
      var waiting = el.classList.contains("reveal");

      if (entry.isIntersecting) {
        if (waiting) el.classList.add("is-in");
        observer.unobserve(el);
        return;
      }
      if (waiting) return;

      // First report for a block that isn't in view. Leave it alone if it has
      // no box of its own (a wrapper laid out as display: contents), or if it
      // is on the screen's bottom edge or above the screen. Otherwise it is
      // still below: hide it until it arrives.
      var box = entry.boundingClientRect;
      var screen = entry.rootBounds ? entry.rootBounds.height / (1 - EDGE) : window.innerHeight;
      if ((box.width === 0 && box.height === 0) || box.top < screen) {
        observer.unobserve(el);
        return;
      }
      if (el.matches(IN_A_ROW)) {
        var place = Array.prototype.indexOf.call(el.parentNode.children, el);
        el.style.transitionDelay = Math.min(place, 4) * 70 + "ms";
      }
      el.classList.add("reveal");
    });
  }, { rootMargin: "0px 0px -" + EDGE * 100 + "% 0px", threshold: 0.01 });

  Array.prototype.forEach.call(document.querySelectorAll(BLOCKS), function (el) {
    observer.observe(el);
  });
})();
