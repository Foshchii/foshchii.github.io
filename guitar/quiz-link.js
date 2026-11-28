// Links the note quiz (note-reading/index.html) to the academy: the academy's offline worker
// keeps the quiz available offline, and the academy's sync carries the quiz's progress between
// devices. The quiz's own store (its Cloud object) registers itself with sync once this has run,
// so the quiz page does not need to know how sync works.
import * as sync from "./sync.js";
import { startApp } from "./app.js";

startApp();
window.guitarSync = sync;
window.dispatchEvent(new Event("guitar-sync-ready"));
