# Brief to agy — re-review of the fold, and the police chief's lean cut (pipeline.110)

Read-only, the one re-review. Write to `output/antigravity/2026-11-17-rereview-lean-workers.md`. No code or sheet edits, no model runs, no cron or engine runs. Live sheet reads, unit tests (`node --test scripts/workerWake.test.js`) and the no-model dry run (`node scripts/cron-civic-run.js --stage=datawake --dry-run`, also `--office=<id>`) are allowed.

Your review: `output/antigravity/2026-11-17-review-lean-workers.md`. What was taken and what was recorded, not changed: the plan's Reviews row (`docs/plans/2026-11-10-role-citizens-wake-as-themselves.md`, the row for your file).

Commits: `09cdec53d` (the fold), `248b9c3f4` (the police chief on the shared readers, his job sentence), `e0c969869` (one guarded run of his, reply in `output/engine-sheet/2026-11-16-worker-last-report-run.CHIEF-POLICE.md`; print `output/engine-sheet/2026-11-16-worker-lean-print.CHIEF-POLICE.md`).

1. Each finding marked taken: is it fixed at `e0c969869`? file:line and evidence. Anything the fold broke.
2. `readRecord` / `capLines` (`scripts/workerWake.js`): any record at C116, for any of the 14, whose rows are reordered wrongly, split, or whose note does not reach the worker through `openRouterToolLoop`'s cut. Rows with a cell holding a newline. A record whose first column is a Cycle but is not a table of rows.
3. The police chief's cut (`FILLS['CHIEF-POLICE']`): against your §7 map, each block — the rows handed in the lean pack and behind `record_read`, live at C116. Is anything he had before now unreachable? `patrol_set` still offered and staged the same way through `runWorkerDatawake`?
4. Thursday 11-19 05:45: from the files on disk, which four workers wake and on which shape.

Each finding: file:line, what is there, the evidence. No proposals for what a worker should say or what the sim should do.
