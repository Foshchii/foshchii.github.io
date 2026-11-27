// Small parts the practice tools share: their remembered settings, keeping the screen awake,
// and formatting. The tools themselves are tool-*.js; academy.js mounts one into the
// [data-tool] card of the screen that shows it and passes it `api` (see academy.js, toolApi).
const settingsKey = "guitar-academy.tools";

export function toolSettings(name, defaults) {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(settingsKey) ?? "{}")[name] ?? {}; } catch { /* nothing saved */ }
  const value = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (typeof saved[key] === typeof fallback && (typeof fallback !== "object" || fallback === null)) value[key] = saved[key];
    else if (fallback && typeof fallback === "object" && saved[key] && typeof saved[key] === "object") value[key] = { ...fallback, ...saved[key] };
  }
  return {
    value,
    save() {
      try {
        const all = JSON.parse(localStorage.getItem(settingsKey) ?? "{}");
        all[name] = value;
        localStorage.setItem(settingsKey, JSON.stringify(all));
      } catch { /* settings last until the page closes */ }
    }
  };
}

// Keeps the phone's screen on while a tool runs (a practice session, the metronome).
// Returns release(). Browsers drop the lock when the page is hidden; it is asked for again on return.
export function keepAwake() {
  let lock = null, wanted = true;
  const ask = async () => {
    if (!wanted || !("wakeLock" in navigator) || document.visibilityState !== "visible") return;
    try { lock = await navigator.wakeLock.request("screen"); } catch { /* not allowed now */ }
  };
  const again = () => { if (document.visibilityState === "visible" && wanted && (!lock || lock.released)) ask(); };
  document.addEventListener("visibilitychange", again);
  ask();
  return () => {
    wanted = false;
    document.removeEventListener("visibilitychange", again);
    lock?.release?.().catch(() => {});
    lock = null;
  };
}

export const clock = seconds => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

// The space bar, when no form field or button has the focus, works a tool's main button.
export const spaceFor = event => event.key === " " && !event.target.closest?.("input, select, textarea, button, a, summary, [contenteditable]");

export const icon = name => `<svg class="icon" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;

// Words for a tempo, as printed in scores.
export function tempoWord(bpm) {
  return bpm < 40 ? "Grave" : bpm < 60 ? "Largo" : bpm < 66 ? "Larghetto" : bpm < 76 ? "Adagio" : bpm < 108 ? "Andante"
    : bpm < 120 ? "Moderato" : bpm < 156 ? "Allegro" : bpm < 176 ? "Vivace" : bpm < 200 ? "Presto" : "Prestissimo";
}
