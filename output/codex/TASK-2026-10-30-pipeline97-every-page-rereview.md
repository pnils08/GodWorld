# TASK 2026-10-30 — codex: re-review of the pipeline.97 fold (last round)

Your review: `docs/for-claude-review/2026-10-30-codex-pipeline97-every-page-review.md` (HOLD, F1–F4). The fold is one commit, `534779a0` — `git show 534779a0`. Original brief: `output/codex/TASK-2026-10-30-pipeline97-every-page.md`.

**What the fold claims.**
- F1/F2: `readsEvery(every, profile)` in `scripts/buildLivesSlice.js` — a MEDIA citizen's pages read by the old rule under either switch. `ownPageLines(root, cycle, popids, profiles, every)` applies it per doc; Ines's `pagesForPicks` applies it per doc. Tamsin's primary-event MEDIA behaviour and Ines's "a pick is hers" resolver are kept as they were (editorial, pre-existing) — only the new exposure is closed.
- F4: `approachFor(every)`; `build` hands `makeSlice` / `emptySlice` a seat copy whose approach names the rule the build ran.
- F3: decided without code — a rule marker in the cache would rebuild Lives mid-day, and a same-day Lives rebuild takes the next uncovered batch (`build` marks today's batch covered at the angle stage), so the writer would get different people than the angle picked. The switch flips on a day boundary instead. If you find the day-boundary flip itself produces a wrong output, name it.

**Hunt (the fold only).** Does `readsEvery` cover every path a reporter's PRESS filing record could reach a writer in these two seats? Does the per-doc rule in `pagesForPicks` change any switch-off output? Is any new assertion one that cannot fail?

This is the last round (one review + one re-review). **Write to:** `docs/for-claude-review/2026-10-30-codex-pipeline97-every-page-rereview.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, file:line and input → wrong output per finding. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
