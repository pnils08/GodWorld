# TASK — codex adversarial diff review: engine.20d (engine-sheet, 2026-10-29)

Review commit `ad53bf15` (`git show ad53bf15`). Two files: `scripts/buildWorldSummary.js`, `scripts/buildWorldSummary.test.js`.

Builder rulings, verbatim:
- 2026-10-28: "Just when it moves" — the civic lane's `initiative` seed is emitted only when the initiative moves; the `vote` seed stays.
- 2026-10-29, asked whether a new filing, a status flip (proposed → passed), a renewal vote, a renewal payout and an opening day count as moving: "Count them".

Spec the build started from: `docs/plans/2026-05-22-engine-regulatory-friction.md` §Task 5 item 2. The build departs from it in one place (a diff against last Cycle's snapshot rather than "clock == cycle"); the commit message says why. Judge that departure on the code and the snapshot data, not on the message.

Data you can read: `output/engine_audit_c111.json`, `c112`, `c113` (`snapshots.Initiative_Tracker`); `output/desk_signal_c113.json` (the published signal, built before this change). Downstream readers of the civic lane: `scripts/newsroom-fanout.js` (`laneSeeds`), `scripts/buildCivicDomainSlice.js`, `scripts/stink-scanner.js`, `scripts/cron-saturday-run.js`.

Read-only proof you may run: `node scripts/buildWorldSummary.test.js`; `node scripts/buildWorldSummary.js 113 --dry-run` (reads Sheets, writes nothing — read `main()` first).

Hunt per AGENTS.md §A review. Each finding: file:line + input → wrong output. Verdict SHIP / SHIP-WITH-FIXES / HOLD. Review the code, not the ruling.

Deliverable: `docs/for-claude-review/2026-10-29-codex-engine20d-diff-review.md`, registered per that folder's README, committed and pushed with a `codex:` message. No code changes.
