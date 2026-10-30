# TASK 2026-10-30 — codex: adversarial diff review, pipeline.94

Commit `f2a94b34` (one commit). Review the diff: `git show f2a94b34`.

**What it claims.** A citizen page doc's id (`lib/citizenPage.js` appendReflection_ customId) had no day, so two same-daypart wakes in one Cycle shared one doc. The store's rule on a taken id was read as append (`old\n\n---\n\nnew`, evidence: `output/citizen_pages/index.jsonl`). The fix keys the wake's page docs by the Central weekday after the daypart; `scripts/scanCitizenPages.js` splits the weekday off so `slot` keeps its grammar; the owed journal page key (`lib/wakePerception.js` owedPageKey) carries the same weekday. `scripts/citizen-wake.js` `PAGE_DAY_KEY` is false — it flips to true after this review. Plan section: `docs/plans/2026-10-29-owed-responses.md` §pipeline.94.

**Hunt.**
- Every reader of a page customId or `slot` (grep `customId`, `slot`, `cp-POP` across `scripts/`, `lib/`) — does any break or silently drop a weekday-keyed doc once the switch is on? Letters (`checkLetterEligibility.js` PAGE_CITE_RE), Rhea (`cron-rhea-gate.js`), Lives/Voices/Pulse slices, `articleContamination.js`, `cron-desk-run.js`.
- The weekday choice: is daypart + weekday one wake per Cycle given when the wake's Cycle number flips (read `logs/citizen-wake.log`, and how citizen-wake reads its cycle)? Name an input that collides other than a Cycle longer than a week.
- The owed journal: with the switch flipped mid-Cycle, can an old-format journal line and a new-format page disagree so an owed event is receipted but not on the page, or never receipted?
- Tests: weakened assertions, source-text tests, a stub that does not match the store's rule.

**Out of scope.** PRESS and work pages merge the same way — noted, not this build. Whether weekdays belong in the sim is the builder's call; this review is the code.

**Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline94-page-day-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. No code edits, no network calls, no live runs.
