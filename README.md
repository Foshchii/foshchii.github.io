# Sviatoslav Foshchii — Personal Website

A fast, accessible, responsive personal/portfolio website built with plain
**HTML, CSS and a little vanilla JavaScript** — no frameworks, no build step,
and **100% free to host** on GitHub Pages.

It also includes a **self-hosted, reusable booking widget** (your own
Calendly alternative) that you can drop into any website you build.

## ✨ Features

- **Recruiter-ready pages:** Home · About · Experience · Resume · Projects · Insights · Education · Contact
- **Light/dark theme** toggle (defaults to light, remembers your choice, respects OS setting)
- **Fully responsive** — looks great from phone to desktop
- **Accessible** — semantic HTML, keyboard navigation, skip link, focus states, reduced-motion support
- **SEO, AI & social ready** — per-page meta tags, Open Graph/Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`, `llms.txt`, and an RSS feed
- **Downloadable CV PDF** generated from the same positioning as the web resume
- **Subtle, tasteful animations** — scroll reveals, animated stats, language bars
- **Custom booking widget** — pick a date/time, get a calendar invite; optional free backend for live availability
- **Print-friendly** styles
- **Custom 404 page**

## 📁 Project structure

```
.
├── index.html            # Home
├── about.html            # About
├── experience.html       # Work history (timeline)
├── resume.html           # Recruiter-friendly web resume
├── education.html        # Education, certifications & skills
├── contact.html          # Contact details + booking widget
├── insights.html         # Insights index
├── insights/             # Long-form articles for search/AI visibility
├── feed.xml              # RSS feed for insight articles
├── da/ uk/ ru/           # Localised overview pages
├── 404.html              # Friendly not-found page
├── assets/
│   ├── css/styles.css        # Design system + all styles
│   ├── js/main.js            # Theme, nav, scroll animations
│   ├── js/booking-widget.js  # Reusable booking widget (standalone file)
│   ├── Sviatoslav-Foshchii-CV.pdf  # Downloadable CV
│   └── img/                  # Favicon, portrait placeholder, social image
├── booking-api/          # Optional free backend for live calendar booking
│   ├── google-apps-script.gs
│   └── README.md
├── sitemap.xml  robots.txt  llms.txt  feed.xml  .nojekyll
└── .github/workflows/deploy-pages.yml   # Auto-deploy to GitHub Pages
```

## 🚀 Run it locally

It's just static files. Either open `index.html` in your browser, or (better,
so paths and the widget behave exactly like production) run a tiny local server:

```bash
# Python 3
python3 -m http.server 8000
# then visit http://localhost:8000
```

If you prefer one repeatable project command:

```bash
npm run dev
```

Then visit <http://127.0.0.1:8000>.

## ✅ Development checks

This repo intentionally has no build step or runtime dependencies. The included
checker validates local links/assets, SEO basics, sitemap coverage, one `h1` per
page and JSON-LD syntax:

```bash
npm run check
```

To regenerate the downloadable CV PDF:

```bash
python3 scripts/generate-resume-pdf.py
```

## 🌐 Publish on GitHub Pages (free)

**Easiest — deploy from branch:**
1. Push these files to the `main` branch.
2. Repo **Settings → Pages → Build and deployment**.
3. **Source:** *Deploy from a branch* → **Branch:** `main` → **Folder:** `/ (root)` → **Save**.
4. Your site goes live at `https://<username>.github.io/<repo>/` in a minute or two.

**Or — deploy with GitHub Actions** (included): set **Source** to *GitHub Actions*.
The workflow in `.github/workflows/deploy-pages.yml` then deploys on every push to `main`.

> Cleaner URL tip: rename the repo to `foshchii.github.io` to serve the site at
> `https://foshchii.github.io/` (no `/sv_resume/` suffix). All links here are
> relative, so it works either way — just update the absolute URLs in the
> `<meta>`/`sitemap.xml`/`robots.txt`.

## 🛠️ Customise

| What | Where |
| --- | --- |
| **Your photo** | Replace `assets/img/profile-placeholder.svg` with a real photo (e.g. `profile.jpg`) and update the `<img src>` in `index.html`. |
| **Contact email** | Search & replace `sviatoslav.foshchii@gmail.com` across the `.html` files (it's also the booking host email and the JSON-LD). |
| **Phone / LinkedIn / location** | In each page's header/footer and `contact.html`. |
| **Colours & fonts** | CSS variables at the top of `assets/css/styles.css` (`--brand`, `--accent`, fonts). |
| **Text content** | Directly in the HTML — it's organised with clear section comments. |
| **Contact options** | In `contact.html`, update the email, LinkedIn and booking-widget details. |

## 📅 Booking widget

`assets/js/booking-widget.js` is a standalone, dependency-free scheduler you
own and can reuse anywhere. It works **with no backend** (visitor gets an `.ics`
invite, you get an email). To enable **live availability + automatic calendar
booking** for free, follow [`booking-api/README.md`](booking-api/README.md)
and set `data-api` on the widget in `contact.html`.

## 📄 Source content

The site content is based on Sviatoslav's [LinkedIn profile](https://www.linkedin.com/in/sviatoslav-foshchii/)
(the single source of truth for experience, certifications, education, skills and
recommendations). `CV.md` and `Resume 2.md` hold earlier underlying CV content.

---

Built and maintained by Sviatoslav Foshchii.
