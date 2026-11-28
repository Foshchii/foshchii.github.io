// The academy as an app: the offline worker (sw.js), "a new version is ready", installing it on
// a phone or computer, and whether there is a connection. academy.js reads `app` and calls the
// functions; views.js draws the install card from app's fields.
export const app = {
  installable: false,     // the browser offered to install (Chrome, Edge, Android)
  installed: false,       // running as an installed app right now
  ios: false,             // iPhone or iPad Safari, which installs through Share › Add to Home Screen
  offlineReady: false,    // the worker has saved the academy for offline use
  update: false,          // a new version is waiting
  online: true
};

let promptEvent = null;
let waiting = null;
const listeners = new Set();
const changed = () => { for (const listener of listeners) listener(app); };
export const onAppChange = listener => { listeners.add(listener); return () => listeners.delete(listener); };

export function startApp() {
  if (typeof window === "undefined") return;
  const standalone = matchMedia("(display-mode: standalone)").matches || matchMedia("(display-mode: fullscreen)").matches || navigator.standalone === true;
  app.installed = standalone;
  app.ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  app.online = navigator.onLine !== false;
  matchMedia("(display-mode: standalone)").addEventListener?.("change", event => { app.installed = event.matches; changed(); });

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    promptEvent = event;
    app.installable = true;
    changed();
  });
  window.addEventListener("appinstalled", () => {
    promptEvent = null;
    app.installable = false;
    app.installed = true;
    changed();
  });
  window.addEventListener("online", () => { app.online = true; changed(); });
  window.addEventListener("offline", () => { app.online = false; changed(); });

  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  const worker = new URL("sw.js", import.meta.url);
  navigator.serviceWorker.register(worker, { scope: new URL("./", import.meta.url).pathname, updateViaCache: "none" }).then(registration => {
    const watch = installing => installing?.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) { waiting = installing; app.update = true; changed(); }
      if (installing.state === "activated") { app.offlineReady = true; changed(); }
    });
    if (registration.waiting && navigator.serviceWorker.controller) { waiting = registration.waiting; app.update = true; }
    if (registration.active) app.offlineReady = true;
    watch(registration.installing);
    registration.addEventListener("updatefound", () => watch(registration.installing));
    changed();
    // Look for a new version now and then while the app stays open.
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") registration.update().catch(() => {}); });
  }).catch(error => console.warn("Offline mode is unavailable:", error));

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading || !waiting) return;
    reloading = true;
    location.reload();
  });
}

// Show the browser's own install dialog. Resolves to true when the learner installed.
export async function install() {
  if (!promptEvent) return false;
  const event = promptEvent;
  promptEvent = null;
  app.installable = false;
  changed();
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === "accepted";
}

// Switch to the new version that is waiting (the page reloads when it takes over).
export function applyUpdate() {
  if (waiting) waiting.postMessage({ type: "activate" });
  else location.reload();
}

// Save the score videos and the reading sheets too, so that everything works offline.
export async function saveEverything() {
  const registration = await navigator.serviceWorker?.ready;
  if (!registration?.active) return false;
  return new Promise(resolve => {
    const channel = new MessageChannel();
    channel.port1.onmessage = event => resolve(Boolean(event.data?.ok));
    registration.active.postMessage({ type: "save-everything" }, [channel.port2]);
    setTimeout(() => resolve(false), 60000);
  });
}
