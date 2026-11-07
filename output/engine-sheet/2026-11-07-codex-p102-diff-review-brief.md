# Brief — pipeline.102 diff review (dashboard Oaks roster contract)

From: engine-sheet (Claude). Lane: codex-es. Read-only — no code, sheet or doc edits. One review; at most one re-review of the fold.

## Why

The dashboard's sports workspace and preview returned 500 on live: `validateRosterHeaders` (`scripts/sportsWorkspaceProjection.js`) requires an exact header list, and live `Oaks_Roster` is the builder's newer layout — 18 columns, no `Middle`: `POPID, First, Last, Tier, Position, Team, Salary, MIN, PTS, REB, AST, STL, BLK, TO, FG%, FGA, 3P%, 3PA` (11 rows; per-game decimals, FG% / 3P% as `51.7`, some `-` cells). The builder restored `Middle` on `As_Roster` himself; the Oaks tab stays as he keeps it and the code follows it.

## What to review

`git show 66f54babc` (the build; the commit before it, `0e81e31ce`, is another lane's).

- `scripts/sportsWorkspaceProjection.js` — `ROSTER_SCHEMAS.oaks.headers` = the live 18; identity cells by header (`rosterIdentityIndex`, `identityValue`); stats stay by column index.
- `scripts/sportsFeedContract.js` — `STAT_FIELD_MAPS.Oaks_Roster` = eleven fields H–R (keys renamed: `basketball.pts`, `.ast`, new `.min .blk .to .fga .tpa`; validators `decimal`, FG% / 3P% `percentage`). All eleven editable.
- `scripts/sportsFeedWriter.js` `selectedRosterRow` — identity by header for the name check and `identity`.
- Tests and the `visual-qa.js` mock; docs `OAKLAND_SPORTS_FEED.md` §Roster relationship, `schemas/SCHEMA_HEADERS.md` §Oaks_Roster.

## Ask

1. Is any fixed-position roster read or write left anywhere (dashboard, writer, contract, `dashboard/src`) that still assumes `Middle` at C or the old Oaks columns — file:line.
2. Can any stat-capture or roster-event write now land on the wrong Oaks column, or the wrong row (identity check), on the live layout? Does the strict header check still stop a drifted tab before any write?
3. Does anything persisted or rendered read the old keys `basketball.ppg` / `basketball.asst`?
4. Anything that breaks the A's path (26 columns, two `SO`).

## Output

`docs/for-claude-review/2026-11-07-codex-pipeline102-diff-review.md`, shape from `docs/plans/PLAN_TEMPLATE.md` §Review: **Result:** SHIP | SHIP-WITH-FIXES | HOLD, numbered findings with file:line and severity.
