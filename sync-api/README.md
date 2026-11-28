# Guitar Academy sync (optional, free)

The academy works without this. Progress, the journal, the hero and the note quiz are kept in the
browser, and Settings exports a JSON backup. Sync keeps the same progress on a phone, a tablet
and a computer, and on an iPhone it joins the Home Screen app with Safari, which otherwise keep
separate records.

## How it works

- **No account.** Turning sync on in the academy (Settings › Sync) makes a sync code such as
  `7QKM-2XRD-9HFA-ZP3W-R8TC`. Another device joins by opening the sync link, scanning its QR code
  or typing the code.
- **Encrypted in the browser.** From the code the browser makes a token and an AES-GCM key
  (HKDF-SHA-256). It compresses and encrypts the record before it is sent. The server keeps the
  encrypted copy under a SHA-256 hash of the token, so it can neither read the progress nor tell
  whose it is. Losing every device that knows the code loses the synced copy; each device keeps
  its own records either way.
- **Nothing is lost when two devices change things.** A sync fetches the copy, merges it with the
  device's own records (each tick, untick and deletion carries the time it was made; the note
  quiz merges the way it always has), and uploads the result with the version it replaces. If
  another device uploaded in between, the server sends the newer copy back and the browser merges
  again.
- **What is stored where.** `guitar/sync.js` is the browser side; `guitar/sync-config.js` holds the
  project URL and its publishable key; `schema.sql` here is the server side: one table,
  `guitar_sync`, that nobody can reach directly, and three functions the browser calls:
  `guitar_sync_pull`, `guitar_sync_push` and `guitar_sync_delete`. A copy may be up to 400 KB and
  all copies together up to 40 MB, so the table can share a project with other work.

## Setup (about 5 minutes)

1. Open a Supabase project (a free one is enough) and its **SQL Editor**. Paste `schema.sql` and
   run it. Running it again later is safe.
2. In **Project Settings › API Keys**, copy the project URL and the **publishable** key
   (`sb_publishable_…`). Never use a secret or service-role key here.
3. Put both in `guitar/sync-config.js`:

   ```js
   export const syncConfig = {
     url: "https://YOUR-PROJECT.supabase.co",
     key: "sb_publishable_…"
   };
   ```

4. Raise the version in `guitar/sw.js` with `node .github/scripts/stamp_guitar_sw.mjs`, run the site
   checks and publish.

To stop offering sync, empty `url` again. Devices keep their own progress. To delete every synced
copy, run `truncate public.guitar_sync;` in the SQL Editor.

## Free projects that pause

Supabase pauses a free project after a week without requests. While it is paused the academy
says that sync could not reach the service and keeps working on each device; restore the project
in the Supabase dashboard and devices catch up on their next sync.
