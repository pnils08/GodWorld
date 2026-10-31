# TASK 2026-10-30 — codex: re-review of the fold, pipeline.91 (last round)

Fold commit `04fc607e`. Diff: `git show 04fc607e`. Your review: `docs/for-claude-review/2026-10-30-codex-pipeline91-search-shelves-review.md`. All four findings were verified on disk and folded. This is the one re-review; the seat decides whatever is left.

**The fold.** F1, F2: `output/slices` and `output/desk-packets` removed from `SEARCH_SHELF_DIRS`. Also shut: `output/**/meta.json`. F3: `grepFileList` returns grep's stdout on exit 2, used by all three file-list greps. F4: live cases assert a non-empty on-shelf answer + no build snippet (7), an exact No disk hits (3), exact record paths (6), and a stubbed exit 2. Added: an AND miss returns No disk hits instead of `0 file(s) matched`.

**Check only.**
- Are F1-F4 closed? Name an input that still reproduces one.
- Did the fold break anything: `grepFileList` swallowing a real error (a bad regex term, exit 2 with empty stdout, maxBuffer), the new AND-miss return vs `scripts/cron-desk-run.js` gap logging and any caller reading the old string, a held path that can pass for the wrong reason.
- One remaining shelf of the F1/F2 kind: a working paper or generator output served from `SEARCH_SHELF_DIRS`, with path and query.

**Decided, do not re-raise.** Build words inside records the shelves rightly hold are pipeline.99: the world summary footnote and generator footer, a Fruitvale tracker note, model tags in staged file names and hard-light life lines. A word filter is ruled out. No plain string in a path or a record is a Rule 2 breach unless it names the builder.

**Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline91-search-shelves-rereview.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
