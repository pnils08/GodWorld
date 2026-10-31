# TASK 2026-10-31 — codex: adversarial diff review, pipeline.99 + the stage 35 candidate

Commits `2d4348c1` and `94e024b6`. Diffs: `git show 2d4348c1 94e024b6`. Plan: `docs/plans/2026-10-11-media-extension.md` §Changelog, the three 2026-10-31 entries. Everything in `scripts/` and `lib/` is already live for the crons; the first run on it is this morning. The engine files are the candidate for PROD stage 35, with engine.316's lines (reviewed separately).

**What it claims.** Build words came out of what reporters and citizens read. Slices lost generator footers and `docs/plans` / `scripts/` POINTERS, keeping reporter guidance. The world summary lost its generator footer and its footnote names no build. Search excerpts drop `OriginGame`. `modelFreeStem` strips the model from `Citizen_Media_Usage.Context` on all three writers, whose duplicate checks compare both forms; the 524 rows already on the sheet were stripped. Hard-light lines (`processAdvancementIntake.js`) now pass through `describeUsageContext_`.

**Hunt.**
- Double credit: any path where a rerun or a late sweep credits a citizen twice now that old and new rows differ, or a dedupe still comparing a raw stem. `reconcileRheaDisposition.js`, `recordBylineUsage`, `cron-saturday-run.js`, `ingestPublishedEntities.js`, `preSaturdayCoverageSweep`.
- Lost credit: two distinct pieces that now collapse to one key because they differed only by model or a suffix after the model (`..._packet-v2_<model>-almanzar-debut`). Name a real pair from `output/cron-compare/staged/` if one exists, and what is lost.
- Anything that consumed what was removed: a parser, a slice reader, `notebooklmDailyNews`, a test fixture, or a wake that read the footer or the POINTERS block.
- The hard-light seam: `describeUsageContext_` in the Phase 5 path. Is it defined at that point in Apps Script load order, can it throw, does the `typeof` branch hide a real failure, and does the ledger LifeHistory line and the log row stay in step.
- `searchDisk`: the `OriginGame` replace on a row where the field is last, or an excerpt the regex damages.

**Out of scope.** Staged file names, `OriginGame` on the ledger, the 23 bare file names in old life records (decided). The ECL rows.

**Write to:** `docs/for-claude-review/2026-10-31-codex-pipeline99-world-facing-review.md`, verdict SHIP / SHIP-WITH-FIXES / HOLD, each finding with file:line and input → wrong output. Register it in `docs/index.md` in the same commit. No code edits, no network calls, no live runs.
