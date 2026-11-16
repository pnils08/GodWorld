# Brief for codex-es — review the seat template build (pipeline.110 Task 9), commit 463e3d009

Advisory review, read-only. Write findings to `docs/archive/for-claude-review/2026-11-15-codex-seat-template-review.md`. Each finding: file:line, what breaks, a concrete input that breaks it. No fixes in the tree.

**What it is.** The Mayor and nine council seats get a new weekday wake built like the police chief's (`scripts/workerWake.js`): `scripts/seatWake.js` (new), `scripts/seatWake.test.js` (new), `scripts/cron-civic-run.js` (`runSeatDatawake`, `seatMoveCtx`, `SEAT_TEMPLATE`, the `--dry-run` / `--no-write` branches, one line in `validateDatawakeMoves`). It is OFF: `--seat-template` is meant to take effect only beside `--dry-run` or `--no-write`; a live run must keep every seat on its existing JSON wake.

**Check against the code:**
1. Can any live (writing) run reach `runSeatDatawake` or the seat template? Any change to what the existing JSON seat wake or the chief's worker wake does?
2. `validateDatawakeMoves` `ctx.perRuleMoves`: does lifting the one-consequential-move cap open anything beyond the seat path? Does any per-row rule (call-vote / renew once per row a week, district, board) fail to hold when several moves arrive in one wake?
3. `seatWake.moveLedgerLines`: second+ consequential moves get `:2`, `:3`. Any reader of `output/cron-civic/moves/*.jsonl` (fold, `applyTrackerUpdates.js`, `buildCivicOfficeSlice.js`, `civicProblemContinuity.js`, `civic47Journal.js`) that parses a moveId or assumes one consequential move per seat-day?
4. `toolExecutor`: moves are validated cumulatively at tool time, then the runner validates `stage.moves` once more at the end. Can the two disagree? Is the `already filed this wake` dedupe right for propose (no initiativeId)?
5. `resident_call`: name lookup in `output/simulation_ledger_snapshot.jsonl`, the district check (`inDistrict` via `getDistrictForNeighborhood(foldHood(...))`), the hashed door pick, the `citizenVoice.js` spawn (`--json`, no `--record` — must write nothing). Any path where it writes, hangs the wake, or calls someone outside the district?
6. `dataBlocks`: anything still in the wake that tells the seat what to do or is a build note (file path, retrieval key, form field); anything of the pack's data dropped that the tools need (initiative ids, hoods, bands)?
7. Silent failures: a sheet or page read that fails and prints as an empty record instead of saying it is unavailable.

**Not in scope:** whether the wording is right (the builder's call), the Sunday hearing path, the pack's own data defects (already logged: faction approvals stale, a reporter's "filed:" line among complaints, a repeated fact).

Prints of what a seat wakes with: `output/engine-sheet/2026-11-15-seat-wake-print.council-d9.txt`, `…mayor.txt`. Tests: `node --test scripts/seatWake.test.js`.
