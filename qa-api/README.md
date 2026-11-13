# Questions and answers backend (free) — Google Sheets

The questions page (`psychology/questions.html`) lets visitors ask you a
question, anonymously, and comment on the answers. Everything they send lands
in a **Google Sheet** that only you can see, as **pending**. Nothing appears on
the site until you publish it, and you answer by typing in the sheet.

The backend is a **Google Apps Script** (`google-apps-script.gs`) attached to
that sheet. It runs as *you*, so there are no API keys, accounts or costs.

| Visitors can                                   | You                                        |
| ---------------------------------------------- | ------------------------------------------ |
| ask a question with a nickname, or anonymously | get an email when something new is waiting |
| read every question you've published           | publish, reject or edit each post          |
| comment on a published question                | answer in the sheet, and reply to comments |

Visitors never give an email address or make an account. The page sets no
cookies and stores nothing in their browser.

## Setup (~10 minutes)

### 1. Make the sheet and paste the script
1. Go to <https://sheets.new> and name the spreadsheet, for example
   **Psychology Q&A**.
2. **Extensions → Apps Script**. Delete the sample code and paste all of
   `google-apps-script.gs`. Save (💾).
3. Check `CONFIG.notificationEmail` at the top: it's the inbox that hears about
   new posts.

### 2. Run `setup` once
1. In the toolbar's function menu, pick **setup**, then **Run**.
2. Google asks for permission. Because this is your own script, it shows
   "Google hasn't verified this app": choose **Advanced → Go to … (unsafe)**,
   then **Allow**. It needs your sheet, sending you email, and running a daily
   clean-up.
3. Back in the sheet you now have two tabs, **Questions** and **Comments**, with
   headers, a Status dropdown, and a daily trigger that deletes rejected posts.

### 3. Deploy it as a web app
1. **Deploy → New deployment**. Select type (⚙) **Web app**.
2. **Execute as: Me**, **Who has access: Anyone**. **Deploy**.
3. Copy the **Web app URL** (it ends in `/exec`).
4. Put it in `psychology/questions.html`:
   `<div class="qa" data-api="https://script.google.com/macros/s/…/exec" …>`
   (or send it to Claude to do it).

Check it works: open the URL with `?action=health` on the end. It should say
`"ok":true` and `"ready":true`.

## Moderating

New posts arrive as rows with Status **pending**, highlighted in yellow. You get
an email for them, at most one every 15 minutes, so a burst of posts can't flood
your inbox; the sheet always has everything.

**To publish a question:** write your answer in **Answer**, then set
**Status** to **published**. It shows on the site the next time someone opens
the page. You can also publish a question first and answer it later; until
then it shows "Not answered yet".

- **Edit before publishing.** Change the Title, Question or Name cells to take
  out anything that could identify someone. Visitors are asked not to include
  such details, but some will.
- **Reject** by setting Status to **rejected**. Rejected posts are deleted
  automatically about a month after they arrived.
- **Unpublish** by setting Status back to **pending** or **rejected**. Its
  comments disappear with it.
- **Paragraphs:** a blank line in a cell starts a new paragraph on the site (in
  a cell, press ⌘/Ctrl + Enter for a line break). Web addresses in your answers
  become links; in visitors' posts they never do.
- **Comments** work the same way, in the **Comments** tab. Its **Question**
  column shows which question each one is on.
- **Replying to a comment:** post your reply on the site like anyone else, then
  in the sheet tick **From me** and publish it. It shows as "Sviatoslav",
  marked "Counsellor". Visitors can't use that name: nicknames that look like
  yours show as "Anonymous".

Don't publish questions that describe an emergency or a risk to someone's
safety. The page sends people in crisis to 112 and Livslinien, but if a post
worries you, it's yours to decide what else to do.

## Updating the script later

Paste the new code, save, then **Deploy → Manage deployments → ✏️ Edit →
Version: New version → Deploy**. The URL stays the same. (A *new deployment*
would get a new URL, and the page would need it too.)

## How it works

- The page reads published posts with `?action=list` over JSONP (a `<script>`
  load), because browsers can't read Apps Script's replies to ordinary requests
  from another site.
- New posts go as a form POST the page can't read the answer to. So each post
  carries a random request id, and the page then asks `?action=received&rid=…`
  whether it arrived. A post that was sent twice is stored once.
- Spam: a hidden field that only bots fill in, at most 40 posts an hour from
  everyone together, and length limits. Everything is moderated anyway.
- Text is stored in the sheet as plain text, so a post that starts with `=`
  can't become a formula.
- `list` returns only published rows and only the columns the page shows. The
  Received time of day, pending and rejected posts, and the sheet itself never
  leave Google.
