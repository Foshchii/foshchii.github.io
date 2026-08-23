/* Shared page boot guards. Runs outside the React lifecycle so a remount can
   neither wipe the booking widget nor strand content at opacity 0.
   Safe on every page: each guard no-ops where its target is absent. */
(function () {
  if (window.__sfPageBoot) return;
  window.__sfPageBoot = true;

  /* --- booking widget keep-alive (contact page only) --------------------- */
  var ready = function () {
    return window.SFBooking && typeof window.SFBooking.init === "function";
  };
  /* Re-init only when the host is completely empty, so the widget's own screens
     (calendar, confirmation, error) are never disturbed. */
  var ensure = function () {
    var host = document.querySelector(".sf-booking");
    if (!host || host.firstElementChild || !ready()) return;
    host.removeAttribute("data-sfb-init");
    window.SFBooking.init();
  };

  /* --- reveal failsafe --------------------------------------------------- */
  /* alive.js hides both [data-reveal] elements and untagged below-the-fold
     wrappers, marking every one with an inline translateY, then undoes it from
     observers owned by React's lifecycle — which a remount disposes, leaving
     content permanently invisible. Match alive.js's own failsafe selector, but
     only force what is at or near the viewport, so off-screen sections keep
     their reveal-on-scroll animation. */
  var forcing = false;
  var forceReveals = function () {
    if (!forcing) return;
    var nodes = document.querySelectorAll('[data-reveal], [style*="translateY"]');
    var limit = window.innerHeight * 1.15;
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (parseFloat(getComputedStyle(el).opacity) > 0.01) continue;
      var r = el.getBoundingClientRect();
      if (r.top > limit || r.bottom < -100) continue;
      el.style.transition = "none";
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }
  };

  /* body, not the immediate parent: React owns the section wrappers too, and an
     observer bound to one is orphaned when that wrapper is itself replaced. */
  var start = function () {
    if (!document.body) return false;
    new MutationObserver(function () {
      setTimeout(function () { ensure(); forceReveals(); }, 0);
    }).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["style"]
    });
    setInterval(function () { ensure(); forceReveals(); }, 1200);
    addEventListener("scroll", forceReveals, { passive: true });
    setTimeout(function () { forcing = true; forceReveals(); }, 3600);
    ensure();
    return true;
  };

  var tries = 0;
  var tick = function () {
    if (start()) return;
    if (tries++ > 200) return;
    setTimeout(tick, 50);
  };
  tick();
})();
