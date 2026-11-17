# Brief to agy — the lean worker build, adversarial review (pipeline.110)

Read-only review. Write your findings to `output/antigravity/2026-11-17-review-lean-workers.md`. Do not edit code or sheets, do not run any model, do not run the cron or the engine. Reading live sheets through `lib/sheets` (`require('/root/GodWorld/lib/env')` first) and running the unit tests (`node --test scripts/workerWake.test.js`) is allowed. A no-model dry run of the weekday list is allowed: `node scripts/cron-civic-run.js --stage=datawake --dry-run`.

## What was built (2026-11-16 → 2026-11-17)

City workers (police chief, fire chief, EMS, medical examiner, DA, deputy mayors, city manager, project directors) are data agents: they wake on the 05:45 Mon–Thu cron (`scripts/cron-civic-run.js --stage=datawake`), are handed their records, and give a weekly report on the record; council, the Mayor and the press can ask them questions. 13 of 14 now wake on the "lean" shape: a job sentence, this Cycle of each record (`window: 1`), each record whole behind `record_read`, a neighborhood behind `neighborhood_read`, their last finished report handed back, and the task last. The police chief is the 14th and is not lean yet.

Commits, oldest first: `fef03ac3e` (window), `10f64a732` (lean shape) through `a92d39b20` (only `worker/2` reports are handed back). `git log --format='%h %s' fef03ac3e^..a92d39b20 -- scripts/` lists them; the commit messages quote what each was meant to do.

Files:
- `scripts/workerWake.js` — `FILLS` (each worker's records), `recordKit`, `windowRows`, `liveArcsAt`, `JOBS`, `buildWake`, `lastReport`, `toolsFor`, `toolExecutor`, `sheetRead`, `neighborhoodRead`, `memoryRecall`, the `LIVE` switch.
- `scripts/cron-civic-run.js` — `workerRota` (~2737), `runWorkerDatawake` (~3696), `workerReplyVerdict`, `workerCallSettings`, the `--dry-run` branch (~3840).
- `scripts/canon-name-check.js` — the `citizen_lookup` changes in `d0a847f66`.
- `scripts/workerWake.test.js`.
- Your earlier review: `output/antigravity/2026-11-16-review-worker-window.md` (22 findings). The plan records which were taken: `docs/plans/2026-11-10-role-citizens-wake-as-themselves.md`, the table under "Reviews".

## Questions

1. **Your 22, checked.** For each finding the plan says was taken (1, 2, 3, 4, 9, 15–22): is it fixed in the code at `a92d39b20`? file:line, and the evidence (a test, a live read). Say plainly if one is not.
2. **Each of the 13 lean fills against the live sheet.** For each worker in `JOBS`: does every block's filter match rows that exist (vehicle names, event `Domain` values in both cases, `CauseType`, `Counterparty`, `Sector`, `Type`, column names)? Which blocks print `none` at Cycle 116 with `window: 1`, and for each, is that because nothing happened this Cycle, or because the filter or window drops something current (the class of your finding 1)? A block that is empty because of a wrong name is the finding.
3. **What `record_read` hands back.** It caps at 8,000 characters. Which records, at Cycle 116, are longer than that and get cut, and which rows does the cut drop (oldest or newest)? Does the worker learn it was cut?
4. **The last report.** `lastReport` and `rec.template`: can a record that is not a finished lean report ever be handed back as the last report? Can a finished one be missed? Dates, the `beforeDate` compare, a `--date` passed by hand.
5. **The weekly run.** `runWorkerDatawake`: retries, the model chain, `workerReplyVerdict`, `workerCallSettings`, the `noWrite` path, the page write, the patrol staging. Any path where a reply that is not a finished statement gets saved, a failure is swallowed silently, or a staged patrol setting from a failed attempt is filed.
6. **The rota.** `workerRota` reads the `datawake_<date>.results.json` files. From the files on disk now, which workers wake on each of Tue 11-17, Wed 11-18, Thu 11-19 05:45, and on which shape (`worker/1` or `worker/2`)? When does the police chief next wake, and what is he handed?
7. **The police chief's fill** (`FILLS['CHIEF-POLICE']`, built by hand before `recordKit`): list each of his blocks, the tab and rows it reads, and whether it honours `ctx.window`. For each, the `recordKit` method that reads the same rows, if one does, and what would differ in the rows handed (columns, cut, title). The "Citywide by Cycle" table and the high/low table have no kit method; say what they read.
8. **Trick code.** Anywhere in this build: a test that asserts less than its name says, a `try/catch` that turns an error into an empty result the worker reads as "none", a fallback value, a filter that silently matches nothing.

Each finding: file:line, what is there, the evidence. No proposals for what a worker should say or what the sim should do.
