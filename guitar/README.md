# Guitar Academy

This static section is served at https://foshchii.com/guitar/ by the portfolio's existing GitHub Pages workflow. The academy lives in this directory and uses hash routes such as #day/1 and #lesson/L02.

## Update lessons

- Edit the exported course object in course.js. Module IDs (M01–M12), lesson IDs (L01–L35 and S01–S03) and day numbers are also progress keys. Keep them stable when revising content or replacing a video. Adjust the video ID and the direct watch URL together.
- The primary video sequence follows the order of Core entries. Supplemental entries appear under their module and in search. The roadmap links to the later alzapúa lesson.
- Lesson materials link to the instructor's published pages. The reading-sheets PDF contains the academy's original drills. The interactive staff uses treble-clef and rest outlines from Google's Noto Music font, licensed under the SIL Open Font License.
- Progress, activity checks, and practice notes use localStorage. Settings exports and merges a version-1 JSON backup. Nothing in the app uploads these records. Third-party video loads when the learner selects Play video.

## Preview and publish

From the website repository root on a Mac with Python and Node installed, run python3 -m http.server 8000 and open http://localhost:8000/guitar/. To check all site links and script syntax, run python3 .github/scripts/check_site.py. The existing GitHub Actions workflow runs on main and publishes after its checks pass.
