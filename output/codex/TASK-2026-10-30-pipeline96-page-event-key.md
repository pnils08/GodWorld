# TASK 2026-10-30 — codex: adversarial diff review, pipeline.96

Commit `967305d8` (one commit). Review the diff: `git show 967305d8`.

**What it claims.** pipeline.94 (your two reviews: `docs/for-claude-review/2026-10-30-codex-pipeline94-page-day-*.md`) keyed the wake page by weekday. Interview (PRESS), work-shift and exchange (CONVO/INTERVIEW/DEBATE) pages still shared one doc per citizen per Cycle, and the store appends under a taken id. Evidence in the plan: cron logs name 28 PRESS docs written 2+ times (72 answers), the index holds 30. The fix:
- `lib/citizenPage.js` — `ref` (`pageRefOf`: six letters a–p from a sha1 of the ask) after the day, before any key, only with a day.
- `scripts/scanCitizenPages.js` — splits `ref` off with the weekday; `slot` keeps the daypart grammar.
- `scripts/citizenVoice.js` `PAGE_EVENT_KEY` — PRESS + its tension lines keyed day + ref(ask); "graded:" lines unchanged.
- `scripts/cron-work-wake.js` and `scripts/citizen-exchange.js` `PAGE_DAY_KEY` — weekday only.

All three switches are false; they flip after this review. Plan: `docs/plans/2026-10-29-owed-responses.md` §pipeline.96. The rerun contract is stated there up front (same ask, same day = that interview again, appended; a differing ask = a second interview).

**Hunt.**
- Is the ask a stable, distinct key for one interview? Read what every recording caller puts in `ask` (`cron-desk-run.js` batch asks and `--record-text`, `reporterWall.js`, `cron-saturday-run.js`, and any other `citizenVoice` caller with `record`). Name an input where two distinct interviews share a ref (merge) or one interview gets a fresh ref on every call within one run (doc spam).
- Is weekday enough for work and the exchange? Read the work-wake package selection and the exchange's once-a-day guard. Name an input with two writes on one weekday.
- Every reader of a page customId, `slot`, `day` or the PRESS/work/CONVO docs — does any break, double-count, or lose a doc once the switches are on? Letters (`checkLetterEligibility.js` PAGE_CITE_RE), Rhea page lines, Pulse, newsroom sourcing, Lives/Voices, `loadOwnPageReadback`/`recentPage_` (the citizen's own memory), family-own-words usage (`isOwnWords_`).
- Tests: weakened assertions, source-text tests, a stub that does not match the store's append rule.

**Out of scope.** Already-merged docs stay as written. Grade-line keying (pipeline.77/79). What citizens should remember is the builder's call; this review is the code.

**Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline96-page-event-key-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. No code edits, no network calls, no live runs.
