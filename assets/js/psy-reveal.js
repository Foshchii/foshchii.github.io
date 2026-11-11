/* =========================================================================
   Psychology pages: blocks further down the page rise into place once, as
   they scroll into view.

   Progressive by design. Without this script, in a browser that lacks
   IntersectionObserver, or for a visitor who asks for reduced motion, nothing
   is ever hidden: the page is simply all there. Blocks already on screen when
   the page opens are left alone, so nothing flashes.

   The observer reports where each block is, so the script never measures the
   page itself. The styles are in psychology/site.css (.reveal, .reveal.is-in).
   No dependencies, no storage, no requests.
   ========================================================================= */
(function () {
  "use strict";

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
