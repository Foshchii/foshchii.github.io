Static site — deploy the contents of this folder as-is.

Entry point: index.html. No build step, no server-side code.
Works on Netlify, Vercel, Cloudflare Pages, GitHub Pages, or any static host
(drag the folder in, or point the host at it).

Requires a network connection at runtime for:
  - Google Fonts (Space Grotesk, Instrument Sans, IBM Plex Mono)
  - React 18 UMD from unpkg.com
  - the booking widget's Google Apps Script calendar endpoint

Booking widget: assets/js/booking-widget.js, configured inline on contact.html
(data-api, data-email, data-durations, data-workdays, data-start/end).
It is in strict live mode: it never offers a time the calendar has not confirmed,
and shows an error instead if the calendar is unreachable.
