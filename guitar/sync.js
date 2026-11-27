// Sync: the same progress on a phone, a tablet and a computer, without an account.
//
// Turning sync on makes a sync code, 16 random characters and 4 check characters
// (7QKM-2XRD-9HFA-ZP3W-R8TC). Everything is worked out from the code in this browser:
//   - a token, which names the synced copy on the server, and
//   - an AES-GCM key, which encrypts it.
// The server (sync-api/schema.sql) keeps only the encrypted copy, under a hash of the token. It
// cannot read the progress, and nobody can find or open it without the code. The code never
// leaves the device except in the link or QR code the learner shows another device; the link
// keeps it after the # so it is not sent to the website either.
//
// One sync: fetch the copy, merge it into this device's records (progress.js and quiz-store.js
// merge without losing a change from either side), then upload the merged record. Uploads say
// which version they replace; if another device uploaded in between, merge again and retry.
import { syncConfig } from "./sync-config.js";
import { deviceName, loadProgress, mergeProgress, readProgress, saveProgress } from "./progress.js";
import { loadQuiz, mergeQuiz, quizBody, sanitizeQuiz, saveQuiz } from "./quiz-store.js";

const settingsKey = "guitar-academy.sync";
const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";   // Crockford's base 32: no I, L, O or U
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const everyFewMinutes = 5 * 60 * 1000;

export const configured = Boolean(syncConfig.url && syncConfig.key);

// ---------------------------------------------------------------- the code

const pickChars = count => [...crypto.getRandomValues(new Uint8Array(count))].map(byte => alphabet[byte & 31]).join("");

async function checkChars(secret) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode("guitar sync check " + secret)));
  return [hash[0], hash[1], hash[2], hash[3]].map(byte => alphabet[byte & 31]).join("");
}

export const formatCode = code => code.match(/.{1,4}/g).join("-");

// Typed or pasted text as a code: case and dashes do not matter, and O, I and L read as 0, 1 and 1.
export async function readCode(text) {
  const plain = String(text ?? "").toUpperCase().replace(/O/g, "0").replace(/[IL]/g, "1").replace(/U/g, "V").replace(/[^0-9A-Z]/g, "");
  if (plain.length !== 20 || [...plain].some(char => !alphabet.includes(char))) return null;
  return await checkChars(plain.slice(0, 16)) === plain.slice(16) ? plain : null;
}

async function newCode() {
  const secret = pickChars(16);
  return secret + await checkChars(secret);
}

// The link that joins another device: the academy's address with the code after the #.
export const linkFor = code => new URL("./#sync/" + formatCode(code), import.meta.url).href;

// ---------------------------------------------------------------- keys and sealing

const base64 = bytes => btoa(String.fromCharCode(...bytes));
const base64url = bytes => base64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function fromBase64(text) {
  const binary = atob(text);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}
const bigBase64 = bytes => {
  let text = "";
  for (let i = 0; i < bytes.length; i += 0x8000) text += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(text);
};

const keyCache = new Map();
async function keysFor(code) {
  if (keyCache.has(code)) return keyCache.get(code);
  const material = await crypto.subtle.importKey("raw", encoder.encode(code.slice(0, 16)), "HKDF", false, ["deriveBits", "deriveKey"]);
  const salt = encoder.encode("foshchii.com/guitar sync v1");
  const token = base64url(new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("token") }, material, 256)));
  const key = await crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: encoder.encode("key") }, material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  const keys = { token, key };
  keyCache.set(code, keys);
  return keys;
}

async function pipe(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

async function seal(key, payload) {
  let body = encoder.encode(JSON.stringify(payload));
  let packed = 0;
  if (typeof CompressionStream === "function") { body = await pipe(body, new CompressionStream("gzip")); packed = 1; }
  const plain = new Uint8Array(body.length + 1);
  plain[0] = packed;
  plain.set(body, 1);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain));
  const out = new Uint8Array(12 + sealed.length);
  out.set(iv);
  out.set(sealed, 12);
  return "g1." + bigBase64(out);
}

async function unseal(key, blob) {
  if (typeof blob !== "string" || !blob.startsWith("g1.")) throw new SyncError("format", "The synced copy is in a format this version does not read.");
  const raw = fromBase64(blob.slice(3));
  let plain;
  try {
    plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.subarray(0, 12) }, key, raw.subarray(12)));
  } catch {
    throw new SyncError("key", "This code does not open the synced copy.");
  }
  let body = plain.subarray(1);
  if (plain[0] === 1) {
    if (typeof DecompressionStream !== "function") throw new SyncError("format", "This browser cannot unpack the synced copy. Update it, then try again.");
    body = await pipe(body, new DecompressionStream("gzip"));
  }
  return JSON.parse(decoder.decode(body));
}

// ---------------------------------------------------------------- the server

export class SyncError extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
}

async function call(name, body, { keepalive = false } = {}) {
  if (!configured) throw new SyncError("setup", "Sync is not set up on this website yet.");
  if (navigator.onLine === false) throw new SyncError("offline", "Waiting for a connection.");
  const headers = { "Content-Type": "application/json", apikey: syncConfig.key };
  if (!syncConfig.key.startsWith("sb_")) headers.Authorization = "Bearer " + syncConfig.key;
  let response;
  try {
    response = await fetch(`${syncConfig.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
      method: "POST", headers, body: JSON.stringify(body), keepalive, cache: "no-store", credentials: "omit"
    });
  } catch {
    throw new SyncError(navigator.onLine === false ? "offline" : "network", navigator.onLine === false ? "Waiting for a connection." : "The sync service did not answer. Your progress is safe on this device.");
  }
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json()).message ?? ""; } catch { /* no details */ }
    if (response.status === 413 || /too large/i.test(detail)) throw new SyncError("size", "Your records are too large to sync. Export a backup instead.");
    if (/full/i.test(detail)) throw new SyncError("full", "The sync service is full at the moment. Your progress is safe on this device.");
    throw new SyncError("server", `The sync service answered with an error (${response.status}). Your progress is safe on this device.`);
  }
  return response.json();
}

// ---------------------------------------------------------------- what is synced

// Each part of the record: read() gives this device's current copy; merge(remote) folds another
// copy in and returns true if anything here changed. The page that shows a part keeps it in
// memory, so it registers its own (academy.js for the academy, the quiz page for the quiz);
// until then the part is read from and written to localStorage directly.
const device = deviceName();
const parts = {
  academy: {
    read: () => loadProgress(),
    merge(remote) {
      const here = loadProgress();
      const merged = mergeProgress(here, readProgress(remote));
      if (same(merged, here)) return false;
      saveProgress(merged);
      return true;
    }
  },
  quiz: {
    read: () => quizBody(loadQuiz()),
    merge(remote) {
      const data = loadQuiz();
      const changed = mergeQuiz(data, remote, device);
      if (changed) saveQuiz(data);
      return changed;
    }
  }
};

export function register(name, part) {
  parts[name] = part;
  if (settings.code) schedule(400);
}

function stable(value) {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") return "{" + Object.keys(value).sort().map(key => JSON.stringify(key) + ":" + stable(value[key])).join(",") + "}";
  return JSON.stringify(value);
}
const same = (a, b) => stable(a) === stable(b);

function payload() {
  return { v: 1, academy: parts.academy.read(), quiz: parts.quiz.read(), from: device, at: Date.now() };
}

function mergeIn(remote) {
  let changed = false;
  for (const name of ["academy", "quiz"]) {
    if (!remote?.[name]) continue;
    try { changed = parts[name].merge(remote[name]) || changed; }
    catch (error) { console.warn(`Sync: the synced ${name} record could not be merged`, error); }
  }
  return changed;
}

// ---------------------------------------------------------------- state

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(settingsKey) ?? "null");
    if (saved && typeof saved.code === "string" && /^[0-9A-Z]{20}$/.test(saved.code)) {
      return { code: saved.code, version: Number.isInteger(saved.version) ? saved.version : 0, at: Number(saved.at) || 0, since: Number(saved.since) || 0 };
    }
  } catch { /* nothing saved */ }
  return { code: null, version: 0, at: 0, since: 0 };
}
let settings = readSettings();

function writeSettings(changes) {
  settings = { ...settings, ...changes };
  try {
    if (settings.code) localStorage.setItem(settingsKey, JSON.stringify(settings));
    else localStorage.removeItem(settingsKey);
  } catch { /* sync lasts until the page closes */ }
}

const listeners = new Set();
let status = settings.code ? "waiting" : "off";
let lastError = null;
let running = null;
let again = false;
let timer = 0;
let dirty = false;

export function state() {
  return { configured, on: Boolean(settings.code), code: settings.code, status, error: lastError, at: settings.at, since: settings.since, device };
}

function setStatus(next, error = null) {
  status = next;
  lastError = error;
  for (const listener of listeners) {
    try { listener(state()); } catch (failure) { console.error(failure); }
  }
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ---------------------------------------------------------------- syncing

async function cycle() {
  const { token, key } = await keysFor(settings.code);
  let remote = await call("guitar_sync_pull", { token });
  for (let attempt = 0; attempt < 4; attempt++) {
    let copy = null;
    if (remote.blob) {
      copy = await unseal(key, remote.blob);
      if (mergeIn(copy)) notifyMerged();
    }
    const mine = payload();
    if (copy && unchanged(mine, copy)) {
      writeSettings({ version: remote.version, at: Date.now() });
      return;
    }
    const result = await call("guitar_sync_push", { token, blob: await seal(key, mine), base: remote.version ?? 0 });
    if (result.ok) {
      writeSettings({ version: result.version, at: Date.now() });
      return;
    }
    remote = result;
  }
  throw new SyncError("busy", "Another device kept syncing at the same time. Try again in a moment.");
}

// True when the merged record here is what the synced copy already holds, so there is nothing to upload.
function unchanged(mine, copy) {
  try {
    return same(mine.academy, readProgress(copy.academy)) && same(mine.quiz, quizBody(sanitizeQuiz(copy.quiz)));
  } catch {
    return false;
  }
}

const mergedListeners = new Set();
function notifyMerged() {
  for (const listener of mergedListeners) {
    try { listener(); } catch (failure) { console.error(failure); }
  }
}
// Called after a sync brought in changes from another device, so the page can redraw.
export const onMerged = listener => { mergedListeners.add(listener); return () => mergedListeners.delete(listener); };

export async function syncNow() {
  if (!settings.code || !configured) return state();
  if (running) { again = true; return running; }
  clearTimeout(timer);
  dirty = false;
  setStatus("syncing");
  running = (async () => {
    try {
      await cycle();
      setStatus("synced");
    } catch (error) {
      const failure = error instanceof SyncError ? error : new SyncError("unknown", "Sync stopped with an error. Your progress is safe on this device.");
      if (!(error instanceof SyncError)) console.warn("Sync:", error);
      setStatus(failure.kind === "offline" ? "offline" : "error", failure);
    } finally {
      running = null;
    }
    if (again) { again = false; schedule(800); }
    return state();
  })();
  return running;
}

// Sync soon: after a change, a page calls this; several changes in a row make one upload.
export function schedule(delay = 2500) {
  dirty = true;
  if (!settings.code || !configured) return;
  clearTimeout(timer);
  timer = setTimeout(syncNow, delay);
}

// Turn sync on with a new code. The first upload creates the synced copy.
export async function create() {
  const code = await newCode();
  writeSettings({ code, version: 0, at: 0, since: Date.now() });
  await syncNow();
  if (status === "error") writeSettings({ code: null });
  return state();
}

// Join the synced copy another device made. Returns { ok, message }.
export async function join(text) {
  const code = await readCode(text);
  if (!code) return { ok: false, message: "That is not a sync code. Check it for a typing mistake: it has 20 letters and digits." };
  if (code === settings.code) return { ok: true, message: "This device already syncs with that code." };
  try {
    const { token } = await keysFor(code);
    const remote = await call("guitar_sync_pull", { token });
    if (!remote.blob) return { ok: false, message: "No synced progress uses that code. Check the code, or turn sync on from the device that has your progress." };
  } catch (error) {
    return { ok: false, message: error instanceof SyncError ? error.message : "Sync could not reach the service. Try again." };
  }
  writeSettings({ code, version: 0, at: 0, since: Date.now() });
  await syncNow();
  return status === "synced" ? { ok: true, message: "This device now syncs with your other devices." } : { ok: false, message: lastError?.message ?? "Sync did not finish. Try again." };
}

// Stop syncing on this device. Progress stays here, and the synced copy stays for other devices.
export function leave() {
  clearTimeout(timer);
  writeSettings({ code: null, version: 0, at: 0, since: 0 });
  setStatus("off");
}

// Delete the synced copy from the server for every device, and stop syncing here.
export async function erase() {
  if (!settings.code) return { ok: true };
  try {
    const { token } = await keysFor(settings.code);
    await call("guitar_sync_delete", { token });
  } catch (error) {
    return { ok: false, message: error instanceof SyncError ? error.message : "The synced copy could not be deleted. Try again." };
  }
  leave();
  return { ok: true };
}

// Upload what changed before the page goes away, without waiting for an answer.
async function flush() {
  if (!dirty || !settings.code || !configured || running) return;
  dirty = false;
  try {
    const { token, key } = await keysFor(settings.code);
    const blob = await seal(key, payload());
    if (blob.length < 60000) call("guitar_sync_push", { token, blob, base: settings.version }, { keepalive: true }).catch(() => {});
  } catch { /* the next sync catches up */ }
}

let started = false;
export function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => { if (settings.code) syncNow(); });
  window.addEventListener("offline", () => { if (settings.code) setStatus("offline", new SyncError("offline", "Waiting for a connection.")); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && settings.code && Date.now() - settings.at > 20000) syncNow();
    if (document.visibilityState === "hidden") flush();
  });
  setInterval(() => { if (settings.code && document.visibilityState === "visible") syncNow(); }, everyFewMinutes);
  window.addEventListener("storage", event => {
    if (event.key === settingsKey) {
      settings = readSettings();
      setStatus(settings.code ? "waiting" : "off");
    }
  });
  if (settings.code) setTimeout(syncNow, 300);
}
