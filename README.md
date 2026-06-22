# Sviatoslav Foshchii — Personal Website

A fast, accessible, responsive personal/portfolio website built with plain
**HTML, CSS and a little vanilla JavaScript** — no frameworks, no build step,
and **100% free to host** on GitHub Pages.

It also includes a **self-hosted, reusable booking widget** (your own
Calendly alternative) that you can drop into any website you build.

## ✨ Features

- **Five pages:** Home · About · Experience · Education & Certifications · Contact
- **Light/dark theme** toggle (defaults to light, remembers your choice, respects OS setting)
- **Fully responsive** — looks great from phone to desktop
- **Accessible** — semantic HTML, keyboard navigation, skip link, focus states, reduced-motion support
- **SEO & social ready** — per-page meta tags, Open Graph/Twitter cards, JSON-LD, `sitemap.xml`, `robots.txt`
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
├── education.html        # Education, certifications & skills
├── contact.html          # Contact details + booking widget
├── 404.html              # Friendly not-found page
├── assets/
│   ├── css/styles.css        # Design system + all styles
│   ├── js/main.js            # Theme, nav, scroll animations
│   ├── js/booking-widget.js  # Reusable booking widget (standalone file)
│   └── img/                  # Favicon, portrait placeholder, social image
├── booking-api/          # Optional free backend for live calendar booking
│   ├── google-apps-script.gs
│   └── README.md
├── sitemap.xml  robots.txt  .nojekyll
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
| **Contact email** | Search & replace `svyat.f8@gmail.com` across the `.html` files (it's also the booking host email and the JSON-LD). |
| **Phone / LinkedIn / location** | In each page's header/footer and `contact.html`. |
| **Colours & fonts** | CSS variables at the top of `assets/css/styles.css` (`--brand`, `--accent`, fonts). |
| **Text content** | Directly in the HTML — it's organised with clear section comments. |
| **Message form** | In `contact.html`, create a free form at [formspree.io](https://formspree.io) and replace `YOUR_FORM_ID`. |

## 📅 Booking widget

`assets/js/booking-widget.js` is a standalone, dependency-free scheduler you
own and can reuse anywhere. It works **with no backend** (visitor gets an `.ics`
invite, you get an email). To enable **live availability + automatic calendar
booking** for free, follow [`booking-api/README.md`](booking-api/README.md)
and set `data-api` on the widget in `contact.html`.

## 📄 Source content

`CV.md` and `Resume 2.md` hold the underlying CV content the site is based on.

---

Built and maintained by Sviatoslav Foshchii.
