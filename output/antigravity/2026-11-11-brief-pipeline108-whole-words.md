# Brief — adversarial code review, pipeline.108 Task 8: citizens' words whole in the daily show

Reviewer: agy. Requester: research-build. Date 2026-11-11. Review only: edit nothing in the repo, commit nothing, run nothing that uploads, renders or writes a Sheet. Your one output is `output/antigravity/2026-11-11-review-pipeline108-whole-words.md`.

## Target
`output/antigravity/2026-11-11-pipeline108-whole-words.diff` (3 files, already live in the working tree; the 08:00 cron runs it).
- `scripts/notebooklmDailyNews.js`: new `wholeReflections(citizens, pageRows, exchanges)`; `exchangeSources` returns `pops`; `run()` calls it before `buildDailySources` and logs one count line.
- `scripts/buildCitizenWeekDigest.js`: each reflection in `citizens` carries `kind` (the tab's Daypart, upper-cased).
- `scripts/notebooklmDailyNews.test.js`: one new block.

Why: `citizenVoice.js:279` (PRESS) and `citizen-exchange.js:198` (CONVO / DEBATE) write `slice(0, 180)` of what a citizen said to `Reflection_Intake`; the daily show read that cell, so 15 of 19 lines in the Tue 2026-11-10 show's "Citizens in their own words" sources were 180 characters. The whole text is on the citizen's page, mirrored locally in `output/citizen_pages/index.jsonl` (`scripts/scanCitizenPages.js` `loadIndex`). Plan: `docs/plans/2026-11-09-daily-news-articles-as-sources.md` point 12 and Task 8.

## Facts you can check (read-only)
- `output/citizen_pages/index.jsonl`: one JSON row per page doc (`popId`, `cycle`, `slot`, `type`, `createdAt`, `content`). Two wakes under one key share a doc joined by `\n\n---\n\n` (`lib/citizenPage.js` header).
- `output/notebooklm/daily/c115/68f51dde275b/sources/15-reflections.md` … `24-reflections.md`: what the Tue show was given.
- `output/exchanges/exchange_c115_2026-11-09_conversation.md`, `…_2026-11-10_debate.md`: the `- participants:` line format.
- The daily notebook is not canon and nothing here writes a Sheet or a page.

## Hunt (each: CONFIRMED with the input that breaks it, or NOT FOUND with what you checked)
1. A way the prefix match puts one citizen's words, or a different entry of the same citizen, under a line it does not belong to (index rows with a `content` shape the split or `oneLine` mishandles; `type` values other than `reflection` that hold own words or that must stay out; an entry that opens with the same 60+ characters as another).
2. A way a 180-character line that IS on the index fails to match (what Sheets or `rf.full` does to the cell versus `oneLine(entry)`: leading characters, trailing whitespace, non-breaking spaces, `\r`, a slice through a surrogate pair).
3. Text that must not reach the daily notebook and now can: any index row for a citizen other than POP-00005 that carries material not written as that citizen's own words.
4. The conversation rule: a case where a CONVO / DEBATE line is dropped but the conversation source is not actually in this run's sources (`exchangeSources` skip conditions, `buildDailySources` filtering, the airs-once map), so the citizen's words air nowhere.
5. Any change in behaviour for callers of `buildDigest` other than the daily news, or for `reflectionSources` when `kind` is absent.
6. Tests that cannot fail, or a case the test names but does not reach.
7. `run()` ordering: anything between the digest build and `buildDailySources` (pack hash, manifest, resume / recovery paths) that still reads the un-replaced `citizenDigest.citizens`.

## Output format
`VERDICT: SHIP | HOLD` on line 1, then numbered findings, each with `file:line`, the exact input or state that breaks it, and CONFIRMED / NOT FOUND. Findings first, no summary of the diff, no redesign.

## Already known — do not spend the review on it
- The index is refreshed by the angle wake, not by this run; a morning that refresh fails leaves that day's answers at 180 and the log line counts them.
- A full interview answer overlaps the quote its article prints.
- The tab writers still cut at 180; other readers of that cell are untouched on purpose.
