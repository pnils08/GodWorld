# TASK — codex: engine.206 cut 2 diff gate — one round

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-27-codex-engine206-diff-gate.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~25 lines. Report in one line when done.

Candidate: `f2132c5f` (`git diff 2f2e7123 f2132c5f -- utilities/sportsWeekRecord.js phase02-world-state/applySportsSeason.js phase06-analysis/economicRippleEngine.js phase01-config/engine94SheetContract.js scripts/sportsWeekCity.test.js`). PROD = stage 30 = `2f2e7123`. Card: `docs/plans/2026-09-11-sports-as-a-lived-system.md` Task 6 §Builder's words (2026-10-27) + §Streak bar (engine.206 cut 2). The builder's rulings are settled — an ordinary week stays under .15; a run of 5 straight wins (spending) or losses (slump) carries a week to the business desk — do not reopen them.

1. **The streak opens, never sizes.** Is `signed` and every reader of it (wiring: transit, city dynamics, feed triggers, crisis spikes, game-night, business dynamics bar term, citizen events, neighborhood economies, evening systems, neighborhood map, franchise weight drift) untouched? Is a week at/above .15 byte-for-byte the old ripple? Is the floor-at-1 impact on a carried week honest, or does it invent economic effect?
2. **The read.** `deriveSportsWeekFromFeed_` takes the franchise's last parseable Streak among its rows this Cycle (row order) — can a rumor / off-season row's stale Streak open the gate (the week must have games: `markSportsStreakHeadline_` `wk.g > 0`)? Does the Phase-2 config path (absent → 5, unusable → Engine_Errors + no streak gate) hold, given the Phase-1 self-arm already rejects an invalid typed value (existing contract)?
3. **The away lead change** (economicRippleEngine.js, the away-bars loop): the lead is now the larger week among those that file. Any case where the old behavior changes with no streak in play?
4. **Tests.** sportsWeekCity 1c/1d — do they pin the gate both ways, the sign of a losing run, the unchanged ≥ .15 path, the away lead, the config? (The four behavior checks fail on the old Phase 2 / Phase 6 with the new helper loaded.)
5. **Bench proof shape.** `output/engine-sheet/2026-10-27-e206-bench.sh`, `2026-10-27-push-e206-bench.sh`, `2026-10-27-e206-check.js`: S5 (bar self-armed 5, the baseline's W2 Oaks week) compared with engine.320's N6 (stage 30, same prep); S2 (bench bar 2) → one Oaks SPORTS_WEEK ripple "— 2 straight wins", magnitude 1, plus a streak seed; restore to stage 30. Enough to push? Does the push script build the stage it claims? (The run's log `output/engine-sheet/2026-10-27-e206-bench.log` lands when it finishes; judge the shape if it is not there yet.)

The admission window (FIRE_ADMISSION_JSON, engine.317) is the known named exception for any PROD push — say so, don't re-derive it.

Done = the md exists.
