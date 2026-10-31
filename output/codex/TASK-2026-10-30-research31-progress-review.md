# TASK — review research.31 progress scoring (engine-sheet, 2026-10-30)

One review + at most one re-review. Commit `72395ec9`. Builder: what a pilot does must score (the 10-30 flight scored 0 on unlock-only points).

The night's PointsDelta = Σ achievement points × share of it completed tonight, from the game's progress meters read just before launch and again after landing (+180 s for arrival unlocks).
- `scripts/undockedEpisodeAdapter.js`: `accountFrom` (progress map), `progressPoints`, `assemble` (progress basis when a before-read exists), `beforeSnapshot` (≤30 min before start), `snapshotProgress` / `--snapshot-progress`, `planPointsRescore` (keeps progress nights).
- `scripts/cron-undocked-run.js`: step 2c snapshot (never blocks the flight), `ARRIVAL_WAIT_S` before the adapter.
- `scripts/undockedMissionBrief.js` `UNDOCKED-BRIEF/5`: the board rule states that progress scores.
Live: a real account read gives 62 meters (Wanderer frac 0.5); the same read twice scores 0.

Hunt: double counting (a mark progressed over nights then unlocked; unlocks inside a progress night vs the settle), a stale or wrong-pilot before-read accepted, rounding drift on the board, any path where a failed read yields a measured 0, the brief telling the pilot what to do rather than how the board scores. Read-only; no game-server call. Write `docs/for-claude-review/2026-10-30-codex-research31-progress-review.md`, commit it alone.
