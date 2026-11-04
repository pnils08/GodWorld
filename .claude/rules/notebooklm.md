---
paths:
  - "scripts/notebooklm*"
  - "config/notebooklm.json"
  - "config/audio_direction_*"
  - "docs/reference/notebookLM-CLI.md"
  - "docs/reference/NotebookLM.md"
  - "output/notebooklm/**"
  - "logs/notebooklm-daily-news.log"
---

# NotebookLM Rules

Read `docs/reference/NotebookLM.md` before changing anything here: the two notebooks, who feeds and reads them, the 08:00 daily news and its router, where to look when it is wrong. Install, login and upgrade procedure: `docs/reference/notebookLM-CLI.md`.

- Notebook IDs live in `config/notebooklm.json` only. Never copy them into a script.
- The daily notebook is not canon (`canonStatus: NOT_CANON` on every manifest). Keep it to today-only sources; `--source-ids` is a hint, not a filter.
- The daily news reports what the 18:15 write wake produced. A brief instead of a deep dive means zero passed filings: read the manifest and `logs/newsroom-fanout.log` before touching the notebook.
- NotebookLM reads what was published and ingested; it promotes nothing. Verify any quoted claim against the cited excerpt, and exact current values against the live sheet.
- A source-search or canon-search call goes through `scripts/notebooklmCanonSearch.js` (read-only, fail-closed). Push failures are non-blocking by contract; a push script that blocks a publish is a bug.
- Every change to a NotebookLM script, config key, cron, notebook or source policy adds a line to the Change log in `docs/reference/NotebookLM.md` in the same commit.
