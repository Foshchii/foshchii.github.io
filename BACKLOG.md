# Website Improvement Backlog

Goal: make the site stronger for job search, recruiter conversion, and AI/search discoverability.

## Priority Legend

- **P0**: Must do first; directly affects hiring clarity or trust.
- **P1**: High impact; improves discoverability and proof.
- **P2**: Useful polish; improves conversion, maintenance, or reach.

## Sprint 1: Hiring Positioning And Conversion

### P0-1: Sharpen Homepage Positioning

**Status:** Implemented in first pass.

**Problem:** The current site presents several identities at once: Application Consultant, Technical Project Manager, Salesforce Marketing Cloud specialist, AI builder, psychology background. Recruiters need one clear target.

**Implementation:**

- Rewrite the homepage hero around one primary role direction.
- Suggested positioning:
  - "Salesforce Marketing Cloud Consultant / Technical Project Manager helping teams deliver martech migrations, CRM operations, and AI-enabled marketing systems."
- Add a compact proof strip above or directly under the CTAs:
  - Salesforce Marketing Cloud delivery
  - Adobe Campaign to SFMC migration
  - PSM II + Salesforce AI/Data Cloud credentials
  - Copenhagen, open to opportunities
- Keep the AI/product angle, but make it a supporting differentiator.

**Acceptance Criteria:**

- First viewport clearly answers: who you are, what role you want, why you are credible, how to contact you.
- Primary CTA is visible without scrolling on desktop.
- Mobile first screen includes at least one CTA without requiring a long scroll.

### P0-2: Add A Recruiter-Friendly Resume Page

**Status:** Implemented as `resume.html` with downloadable PDF at `assets/Sviatoslav-Foshchii-CV.pdf`.

**Problem:** `CV.md` and `Resume 2.md` exist in the repo, but the live site does not offer a polished resume path.

**Implementation:**

- Create `resume.html`.
- Add `Resume` to the main nav and footer.
- Convert the strongest CV content into a clean web resume:
  - summary
  - target roles
  - core skills
  - experience
  - selected projects
  - certifications
  - education
  - contact
- Add a downloadable PDF as `assets/Sviatoslav-Foshchii-CV.pdf`.

**Acceptance Criteria:**

- `resume.html` is linked from every page.
- The resume page is printable.
- Recruiter can understand fit in under 60 seconds.
- Page title and meta description are recruiter-search friendly.

### P0-3: Audit Certification Language

**Status:** Implemented on the site using the existing active/expired credential labels. External credential verification remains a manual check.

**Problem:** The site says `7x Salesforce certified`, while the Education page shows some credentials as expired. This can create trust risk.

**Implementation:**

- Confirm which Salesforce credentials are currently active.
- Update hero badge and stats to precise wording:
  - "5 active Salesforce certifications" or
  - "7 Salesforce credentials earned"
- Update structured data `hasCredential` to include only accurate active/earned status.

**Acceptance Criteria:**

- No page implies an expired credential is currently active.
- Certification language is consistent across homepage, resume, and education page.

### P0-4: Fix Contact Flow

**Status:** Implemented with Option B; the placeholder form was removed.

**Problem:** The contact form still uses the Formspree placeholder. The fallback works, but it looks unfinished.

**Implementation Options:**

- Option A: Configure Formspree with a production endpoint.
- Option B: Remove the form and use direct email + booking CTAs.

**Recommended:** Option B for now. Simpler, fewer moving parts, less spam risk.

**Acceptance Criteria:**

- No placeholder endpoint remains.
- Contact page has clear paths:
  - email
  - LinkedIn
  - booking widget
- Buttons work without hidden fallback behavior.

## Sprint 2: AI/Search Discoverability

### P1-1: Rename Or Reframe `Vision` As `Insights`

**Status:** Implemented. Main navigation now points to `insights.html`; `vision.html` remains as supporting personal-direction content linked from Insights.

**Problem:** `Vision` is good personal positioning, but `Insights` is more useful for search, recruiters, and AI citation.

**Implementation:**

- Rename nav item from `Vision` to `Insights`.
- Either replace `vision.html` with `insights.html`, or keep `vision.html` as a redirect-style page linking to `insights.html`.
- Create an insights index with article cards.

**Acceptance Criteria:**

- Main nav includes `Insights`.
- Sitemap includes the insights index.
- Existing internal links are updated.

### P1-2: Create Article Template

**Status:** Implemented as static article pages under `insights/` with metadata, dates, canonical URLs and `BlogPosting` JSON-LD.

**Problem:** AI/search visibility needs crawlable, quote-worthy, dated content with clear authorship.

**Implementation:**

- Create a reusable static article layout.
- Include:
  - title
  - subtitle/dek
  - author
  - publish date
  - updated date
  - reading time
  - canonical URL
  - Open Graph metadata
  - `BlogPosting` or `Article` JSON-LD
  - internal links to projects, experience, and contact
- Add article styles to `assets/css/styles.css`.

**Acceptance Criteria:**

- Article pages render well on mobile and desktop.
- Article structured data validates conceptually.
- Article content is available in raw HTML without client-side rendering.

### P1-3: Publish First Three Insight Articles

**Status:** Implemented with three initial articles.

**Problem:** The site needs original, specific content that LLMs and search engines can cite.

**Recommended First Articles:**

1. `What I learned migrating from Adobe Campaign to Salesforce Marketing Cloud`
2. `How to keep marketing operations running during a platform migration`
3. `How I use AI as a project delivery partner, not a replacement`

**Content Requirements:**

- Use first-hand experience.
- Include concrete lessons, not generic advice.
- Include quotable statements.
- Avoid confidential client details.
- Link to relevant project/experience pages.

**Acceptance Criteria:**

- At least 3 article pages are live.
- Each article has unique title, description, canonical, and structured data.
- Sitemap includes all articles.

### P1-4: Improve Robots And Sitemap For AI/Search Crawlers

**Status:** Implemented.

**Problem:** Current `robots.txt` allows all crawlers, which is fine, but explicit AI crawler access makes intent clearer.

**Implementation:**

- Update `robots.txt`:

```txt
User-agent: OAI-SearchBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: *
Allow: /

Sitemap: https://foshchii.github.io/sitemap.xml
```

- Update `sitemap.xml` whenever pages/articles are added.
- Added `feed.xml` for articles.

**Acceptance Criteria:**

- `robots.txt` is explicit and valid.
- Sitemap lists every important public page.
- No outdated URLs remain.

### P1-5: Expand Structured Data

**Status:** Implemented for homepage `Person`, about `AboutPage`, resume `ProfilePage`, insights `CollectionPage`, and articles `BlogPosting`.

**Problem:** Only the homepage has `Person` structured data. More page-specific schema would help machines understand the site.

**Implementation:**

- Keep `Person` JSON-LD on homepage.
- Add `ProfilePage` or `AboutPage` schema to about/resume.
- Add `CollectionPage` schema to insights index.
- Add `BlogPosting` schema to articles.
- Add `sameAs` links:
  - LinkedIn
  - GitHub
  - live project URLs where appropriate

**Acceptance Criteria:**

- Structured data matches visible page content.
- No fake or unverifiable claims are added.
- JSON-LD is valid JSON.

### P1-6: Add `llms.txt`

**Status:** Implemented.

### P1-6a: Add Localised Overview Pages

**Status:** Implemented.

**Implementation:**

- Added Danish, Ukrainian and Russian overview pages:
  - `/da/`
  - `/uk/`
  - `/ru/`
- Added a compact language switcher to the header.
- Added `hreflang` alternates for the homepage language set.

**Acceptance Criteria:**

- Localised pages are linked from the site header.
- Localised URLs are included in the sitemap.
- The English site remains the canonical full version.

**Problem:** Some AI tools and agents may look for `/llms.txt` as a curated, Markdown-readable guide to the most important pages on a site. It is not a formal SEO ranking signal, but it is cheap to add and can help AI tools orient themselves.

**Implementation:**

- Create `/llms.txt` in the site root.
- Keep it short and factual.
- Include:
  - who the site is about
  - target roles and expertise
  - key pages: homepage, resume, experience, projects, insights, contact
  - key future articles once published
  - LinkedIn and GitHub links
- Do not include private data, unpublished details, API keys, calendar backend URLs, or claims that are not visible elsewhere on the public site.
- Update it whenever major pages/articles change.

**Acceptance Criteria:**

- `https://foshchii.github.io/llms.txt` is publicly available.
- File follows the common Markdown-style `llms.txt` convention.
- Links point only to public, canonical URLs.
- Content matches the visible site.

## Sprint 3: Proof, Portfolio, And Trust

### P1-7: Strengthen Project Case Studies

**Status:** Implemented for the three strongest proof items: SFMC migration, Keto Scanner, and this website/booking widget.

**Problem:** Projects are good, but some read like resume bullets. Case studies would give recruiters stronger proof.

**Implementation:**

- For each major project, structure content as:
  - Context
  - Challenge
  - My role
  - Actions
  - Outcome
  - Tools
  - What I learned
- Start with:
  - Adobe Campaign to SFMC migration
  - Keto Scanner
  - This website and booking widget

**Acceptance Criteria:**

- Each case study clearly separates your contribution from team/client context.
- Confidential details are avoided.
- Outcomes are concrete and credible.

### P1-8: Reframe AI Language For Enterprise Hiring

**Status:** Implemented.

**Problem:** Phrases like "vibe coding" and "AI handled the heavy lifting" may sound casual to enterprise hiring managers.

**Implementation:**

- Replace casual AI phrasing with professional wording:
  - "AI-assisted product development"
  - "Claude Code as implementation partner"
  - "Rapid prototyping and iteration"
  - "Human-led product direction, AI-assisted execution"
- Keep personality, but avoid sounding dependent on tools.

**Acceptance Criteria:**

- AI content sounds senior, intentional, and credible.
- The site still communicates that you are hands-on with modern AI tools.

### P2-1: Add GitHub And Live Demo Proof

**Status:** Implemented. GitHub is linked from homepage content, resume, footer, projects, `llms.txt`, and localized overview pages where appropriate.

**Problem:** The Projects page links to GitHub generally, but some projects would benefit from direct proof.

**Implementation:**

- Add GitHub profile link to homepage/footer.
- For public projects, add direct repository links.
- For private/client projects, explain why no repo/demo is available.

**Acceptance Criteria:**

- Recruiters can find GitHub from homepage and footer.
- Public project links are direct and not buried.

### P2-2: Add Testimonials With Source Context

**Status:** Implemented with LinkedIn recommendation source labels.

**Problem:** Recommendations are strong, but should be framed as sourced LinkedIn recommendations where possible.

**Implementation:**

- Add "Source: LinkedIn recommendation" or similar context.
- Link to LinkedIn profile near the section.
- Keep quotes short enough to scan.

**Acceptance Criteria:**

- Testimonials feel verifiable.
- Section remains concise on mobile.

## Sprint 4: UX And Technical Polish

### P0-5: Improve Mobile Hero Layout

**Status:** Implemented in first pass.

**Problem:** On mobile, the portrait dominates the first screen and pushes the main CTA down.

**Implementation:**

- Put text before image on mobile, or reduce portrait height significantly.
- Keep CTA visible earlier.
- Ensure no horizontal overflow.

**Acceptance Criteria:**

- On a 390px-wide viewport, headline and at least one CTA are visible without excessive scrolling.
- Portrait remains polished but does not dominate the page.

### P2-3: Reduce First-Load Animation Risk

**Status:** Implemented for the homepage hero in the first pass.

**Problem:** Reveal animations can briefly make important content low-contrast or invisible during capture/loading.

**Implementation:**

- Avoid reveal animation on the main hero headline and CTA.
- Keep animations for lower sections only.
- Ensure reduced-motion support remains.

**Acceptance Criteria:**

- Hero content is readable immediately on load.
- Screenshots taken immediately after load show usable content.

### P2-4: Add Basic Analytics

**Status:** External follow-up. Requires choosing and configuring an analytics provider/account before adding the final production script.

**Problem:** There is no visibility into which pages convert or get found.

**Implementation Options:**

- Plausible
- GoatCounter
- Cloudflare Web Analytics

**Acceptance Criteria:**

- Analytics are privacy-friendly.
- No cookie banner is needed if avoidable.
- Track page views and outbound/contact clicks.

### P2-5: Extend Site Checker

**Status:** Implemented. The checker now recursively scans nested HTML pages and validates SEO basics, sitemap coverage, local references and JSON-LD syntax.

**Problem:** Current checker validates local links/assets, but not SEO essentials.

**Implementation:**

- Extend `scripts/check-site.mjs` to check:
  - every public HTML page has one `h1`
  - every public HTML page has `title`
  - every public HTML page has meta description
  - canonical URL exists
  - local Open Graph image exists
  - sitemap includes known public pages

**Acceptance Criteria:**

- `npm run check` catches missing SEO basics.
- Check remains dependency-free.

## Distribution Backlog

### P1-9: Set Up Search Indexing

**Status:** External follow-up. Requires access to Google Search Console and Bing Webmaster Tools.

**Implementation:**

- Add site to Google Search Console.
- Add site to Bing Webmaster Tools.
- Submit sitemap.
- Request indexing for homepage, resume, projects, and first insight articles.

**Acceptance Criteria:**

- Sitemap is submitted to both platforms.
- Indexing status can be monitored.

### P2-6: Promote Insight Articles

**Status:** External follow-up. Requires posting from LinkedIn/GitHub profiles.

**Implementation:**

- Share each article on LinkedIn with a short original post.
- Link back from GitHub profile README.
- Add selected article links to LinkedIn featured section.

**Acceptance Criteria:**

- At least 3 external signals point to the site.
- Articles are reachable from both search and social profiles.

## Definition Of Done For This Backlog

- Homepage clearly targets the roles you want.
- Resume page is live and linked in the nav.
- Contact flow has no placeholders.
- Credential language is accurate.
- At least 3 insight articles are published.
- Sitemap and robots are updated.
- Structured data is added for profile and articles.
- Mobile first screen is recruiter-friendly.
- `npm run check` passes.
