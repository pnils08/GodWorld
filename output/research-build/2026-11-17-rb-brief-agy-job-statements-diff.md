# Brief for agy — adversarial re-review of the job-statement build (engine.347 Task 5)

From research-build, 2026-11-17. Read-only: no edits to code, sheets or docs; no model runs. Write your review to `output/antigravity/2026-11-17-review-job-statements-diff.md`.

Your review of the design (`output/antigravity/2026-11-17-review-job-statements.md`) is folded: plan `docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md` §Task 5 as built and §Task 5 review reconciled. The build is commit `d65123a03` (`git show d65123a03 --stat`; `git show d65123a03 -- lib scripts world-view`). The code is on the working tree the crons run from: the first flush is the Wed 11-18 05:45 weekday wake.

## The job

1. **Does the build match the fold?** For each finding the plan marks taken, open the code and say whether it is answered, and by what line. Name any "taken" that is not.
2. **`lib/jobStatementRows.js` — trick code.** Look for: a path where `flush` or `queue` can throw into `cron-civic-run.js` or `civisJournal.js`; a sitting that can land twice (the `onSheet` identity is column A's instant — what does Sheets hand back for an ISO string written by `appendRows`, and does `new Date(r[0]).getTime()` still equal the queued instant?); a sitting that can be settled without a row and without a log line; `pendingSittings` miscounting when a spool line is torn, when two processes append at once, or when `landed` marks arrive out of order; `composeSitting` picking a mood no line showed; the retry counter never reaching `MAX_TRIES`. Read `lib/sheets.js` `getRawSheetData` / `appendRows` for the value-render and input options before answering the column A question.
3. **Tests that prove less than they say.** `lib/jobStatementRows.test.js` Test 7 is source assertions (regex on the writers). Which of them would still pass with the wiring broken? Is there a writer path with no behavioral test that could be given one cheaply?
4. **The wiring in `scripts/cron-civic-run.js`.** `commitDirectiveWrites` queues when `done(entryId)`; `opts.root` must be set on every caller (`:1239` callers, the tick's resume, the tests). The dispatcher's `.then(flush)` runs after `runChain` / `runDatawake` have already flushed — any double work or a second sheet read? Does any exported function a test calls now write under the real `output/cron-civic/job-statements/`?
5. **The four readers.** `civicPetitions.js`, `buildCivicOfficeSlice.js`, `buildCitizenWeekDigest.js`, `world-view/build.js`: is each filter on the right column for the shape that reader holds (object row from the beats dump vs positional row from the sheet)? `world-view/build.js` now requires `lib/jobStatementRows.js`, which requires `utilities/citizenDialMap.js` — does that load cleanly where the week view is built?
6. **Tomorrow 05:45.** Walk the Wed 11-18 weekday wake as it will run (`--stage=datawake`, the rota, seats and workers) and say what lands on `Reflection_Intake`, in what order, and the first thing that could make it land nothing.

## Not wanted

No rewritten code. No new mechanics beyond what a finding needs. A claim without a file:line or a number you produced is not a finding. If you could not open or run something, say so.
