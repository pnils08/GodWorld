---
title: codex review — pipeline.102 Oaks roster diff
created: 2026-11-07
updated: 2026-11-07
type: review
tags: [review, sports, dashboard]
sources:
  - commit 66f54babc57f809a857d6781d865051a4a19df26
  - output/engine-sheet/2026-11-07-codex-p102-diff-review-brief.md
---

# codex review — pipeline.102 Oaks roster diff

**Target:** `66f54babc` only; dashboard sports roster projection, contract, writer, UI, and their focused tests. The preceding `0e81e31ce` is outside this review.

**Result:** HOLD

## Findings

1. **High — A bare Oaks FG% or 3P% edit can write a value at one hundredth of the reviewed number, then pass read-back.** The brief says live percent cells appear as numbers such as `51.7`, without `%`. `scripts/sportsFeedContract.js:341-344` accepts this representation; `scripts/sportsFeedWriter.js:331-347` always divides a percentage proposal by 100 before sending `userEnteredValue.numberValue`. For a plain numeric `Oaks_Roster!O` or `!Q` cell, reviewed `51.7 → 51.5` therefore writes `0.515`. `scripts/sportsFeedWriter.js:409-430` treats both `51.5` and `0.515` as equivalent, so the read-back at `scripts/sportsFeedWriter.js:1217-1226` can report success with the wrong displayed stat. The live cell's number format was not inspected; a custom percent format that displays `51.7` without a `%` would change this outcome. Resolve the stored-value/format contract before enabling these writes, and test the bare-number case through the writer, including read-back.

2. **Medium — A live `-` stat cell blocks stat capture, including an unrelated valid edit in the dashboard.** Projection preserves the literal cell (`scripts/sportsWorkspaceProjection.js:123-128`), and the UI builds all eleven stat rows from it (`dashboard/src/components/SportsIntakeWorkspace.jsx:160-185`). `validStatValue` rejects `-` (`dashboard/src/components/SportsIntakeWorkspace.jsx:77-91`); any invalid row makes `statFormReady` false (`dashboard/src/components/SportsIntakeWorkspace.jsx:191-204`), while preview submits all stat rows (`dashboard/src/components/SportsIntakeWorkspace.jsx:336-355`). Even an API request changing that cell from `-` to `8.1` fails `before` validation at `scripts/sportsFeedContract.js:531-555`. A synthetic contract probe returned `basketball.tpa must be a non-negative decimal in before`. The brief reports `-` cells on the live Oaks tab, so the claim that all eleven fields are editable does not hold for those rows. Define how an unavailable source value can be replaced, preserving exact before-value and formula checks.

## Checks without findings

- No remaining fixed-position `Middle` or old Oaks stat-column read/write was found in the scoped dashboard, writer, contract, or `dashboard/src`. Oaks identity uses the header indices and an absent Middle becomes blank (`scripts/sportsWorkspaceProjection.js:59-68,112-141`; `scripts/sportsFeedWriter.js:175-210`). Stat keys map H–R to indices 7–17 (`scripts/sportsFeedContract.js:100-114`); roster-event Team and Position writes resolve headers from the selected snapshot (`scripts/sportsFeedWriter.js:983-1017`). The selected physical row is checked against POPID and full name, then protected by row/header hashes (`scripts/sportsFeedWriter.js:175-210,270-299,818-843`).
- The exact 18-column Oaks and 26-column A's headers are checked before projection (`scripts/sportsWorkspaceProjection.js:18-40,70-103`). Preview and confirmation both load that projection (`dashboard/sportsRoutes.js:392-420,1239-1262`), and a participant write checks the selected roster headers again (`scripts/sportsFeedWriter.js:175-185,818-843`). This covers stat-capture and roster-event writes after a tab drift. The A's duplicate `SO` columns remain distinguished by stat index, while identity headers are unique (`scripts/sportsWorkspaceProjection.js:21-29,59-64`; `scripts/sportsFeedContract.js:93-98`).
- Search found no active `basketball.ppg` or `basketball.asst` reader in `scripts`, `dashboard`, engine paths, or current output JSON/JSONL. The UI indexes `statValues` by the current field key (`dashboard/src/components/SportsIntakeWorkspace.jsx:160-165`); workspace options come from the current map (`dashboard/sportsRoutes.js:1047-1059`).

## Evidence limits and wiring

- Passed: `node scripts/sportsWorkspaceProjection.test.js`, `node scripts/sportsFeedContract.test.js`, and `node dashboard/sportsRoutes.test.js`. The tests use `%` suffixed Oaks percent fixtures (`dashboard/sportsRoutes.test.js:147-156,512-516`) and do not exercise the live bare-number write. `sportsFeedWriter.test.js` was read but not run because its test creates a temporary audit file (`scripts/sportsFeedWriter.test.js:1026-1037`), outside the one-file write limit.
- The required `engine-wiring` call for `Oaks_Roster` and `As_Roster` was attempted with `--out /dev/stdout`; it ended in `[FATAL] Connection error.` No model wiring card was produced, and no extra review file was written. Local wiring trace: `dashboard/server.js:201-234` reads both raw roster snapshots and supplies the writer; `dashboard/sportsRoutes.js:392-420` projects them; `scripts/sportsFeedWriter.js:957-1017` builds the roster mutations. The local `ENGINE_STUB_REVERSE.json` sheet map has no entry for either roster tab. No live Sheet read, dashboard restart, or deployed-write proof was performed.

## Disposition

Pending engine-sheet verification and fold of each finding.

**Reconciled in:** `output/production_log_run_cycle_c114_gaps.md` G-ES6 (pipeline.102 cut + fold), 2026-11-07, engine-sheet.

### Disposition (engine-sheet, 2026-11-07)

- **F1 — verified on live, fixed in place.** Live `Oaks_Roster!O3:Q3` = `51.7` / `15.0` / `52.3`, effective numbers 51.7 / 15 / 52.3, format NUMBER `0.0` — points, not a fraction. `statCell` now writes a `percentage` as the number entered (a trailing `%` stripped); `comparableStatNumbers` reads it one way only, so a 0.515 read-back no longer passes for 51.5. Only `Oaks_Roster` uses `percentage`.
- **F2 — verified, fixed in place.** `-` is the roster's no-value mark: the contract accepts an unchanged `-` row and a `-` before that a valid value replaces (never a value turned back into `-`); the UI row check follows the same rule (dist rebuilt); the writer's pre-batch check `statValuesEqual` treats identical text as equal (the new test found it refused `-` → value).
- **Pin:** `scripts/sportsFeedWriter.test.js` Oaks case through the writer on the live layout — FG% 51.7 → 51.5 writes `{numberValue: 51.5}` and reads back `51.5`; 3PA `-` → 0.4 written; an unchanged `-` 3P% rides along. On the old code it fails at the `-` validation, and with only the dash fix applied it fails at `numberValue: 0.515`.
- Full suite 321/321. No third round.
