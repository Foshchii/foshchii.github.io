/* =========================================================================
   Psychology pages: blocks further down the page rise into place once, as
   they scroll into view.

   Progressive by design. Without this script, in a browser that lacks
   IntersectionObserver, or for a visitor who asks for reduced motion, nothing
   is ever hidden: the page is simply all there. Blocks already on screen when
   the page opens are left alone, so nothing flashes.

   The styles are in psychology/site.css (.reveal, .reveal.is-in). No
   dependencies, no storage, no requests.
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

  var fold = window.innerHeight * 0.92;
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });

  Array.prototype.forEach.call(document.querySelectorAll(BLOCKS), function (el) {
    if (el.getBoundingClientRect().top < fold) return;   // on screen already, or above it
    if (el.matches(IN_A_ROW)) {
      var place = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.transitionDelay = Math.min(place, 4) * 70 + "ms";
    }
    el.classList.add("reveal");
    observer.observe(el);
  });
})();
