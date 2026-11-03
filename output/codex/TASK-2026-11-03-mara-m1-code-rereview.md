# Re-review the Mara M1 code fold (civic.47) — the one re-review

Read-only: edit no code, commit nothing, push nothing. Write one file:
`docs/for-claude-review/2026-11-03-codex-mara-m1-code-rereview.md` — first line `VERDICT: PASS` or `VERDICT: HOLD`, then findings (severity, file:line, input → wrong output).

Your review: `docs/for-claude-review/2026-11-03-codex-mara-m1-code-review.md` (8 findings). The candidate after the fold, against `46d977c97`: `output/codex/mara-m1/change2.diff`; full tree at `/tmp/claude-0/-root-GodWorld/c629e98a-39bc-4b80-8176-91a337bf5a0a/scratchpad/wt-mara`. A second C114 dry proof with the fold: `output/codex/mara-m1/proof2/` (9 blocks, 6 promises, billed $0.28). All civic suites, `cron-desk-writer.test.js` and `maraM1.test.js` (14 tests) pass in the worktree.

Fold map:
1. Mara-only director turn: `noTrackerChangeCheck` in the check chain unless the step is due (`cron-civic-run.js` projects stage).
2. Promise status: the promise row stores `trackerAtPromise`; kept needs ImplementationPhase/Status moved and non-terminal, dropped needs a terminal Status, changed needs a rescheduled step; a deferral closes nothing; statement/answer closes record `basis: office-account` (`maraPromises.js`).
3. Block fields need values, Why must cite a Cycle; an invalid Not directing section is dropped (manifest says why) and the fallback line is gone (`filterDirectiveBlocks`, `writeOutputs`).
4. A partial commit sets the stage `partial`; the hourly tick finishes it via `resumeDirectiveCommit` before the week-closed exit (`refreshWeekState`, `runTick`).
5. Seed copy gate: `scripts/maraWorldSeed.js` (screen; `--write` copies, reads back, receipt), the exact-text list `output/mara-directives/mara-world-seed.json` and the candidate record `mara-world-seed-candidates.md`. Not run with `--write`: that waits for the builder's go on the list.
6. A Promise line must name a recorded or this-run staged promise, or the block is rejected.
7. Mara-only director output contract: `maraOnlyContract` (decision is the literal reply label; validates under `validateVoiceJson`).
8. Sunday render includes trackerUpdates; weekday render includes each move's full payload.
Also: the plan's weekday-input wording now matches the code's timing (the week before the close).

Judge: does each fold work on the current code paths, and did any fold add a defect? Only defects that would make the build wrong; this is the last round before the builder decides.
