# TASK — codex: engine.206 cut 2 diff gate — round 2

Read-only; no cron, model, Sheet write, bench, clasp or canon run. Do not commit, do not push. Write to `docs/for-claude-review/2026-10-28-codex-engine206-diff-gate2.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~25 lines. Report in one line when done.

Candidate: `66c62f13` (`git diff 2f2e7123 66c62f13 -- utilities/sportsWeekRecord.js phase02-world-state/applySportsSeason.js phase06-analysis/economicRippleEngine.js phase01-config/engine94SheetContract.js scripts/sportsWeekCity.test.js scripts/sportsFeedParser.test.js`). PROD = stage 30 = `2f2e7123`. Your round 1: `docs/archive/for-claude-review/2026-10-27-codex-engine206-diff-gate.md`; how it was folded: the plan's Task 6 §Streak bar, "Codex diff gate round 1". Rulings settled (5 straight wins → spending, 5 straight losses → slump; ordinary weeks stay under .15).

1. **Round-1 FIXes closed?** (1) no floor — a carried week files at `round(15 × signed)`; (2) the run from the week's last game row only (`entry.weekGames` set in the reader on anchor and folded rows), and a run against the week's sign carries nothing (`markSportsStreakHeadline_`, now called after the intensity); (4) the tests you named. Anything the fix itself broke — e.g. `weekGames` on `S.sportsFeedEntries` reaching another reader (casino, game-night, compileHandoff), the marking moved after `deriveSportsIntensity_`, the `|| 0` on the impact at ≥ .15?
2. **Bench receipt.** `output/engine-sheet/2026-10-27-e206-bench.log`, `2026-10-27-e206-check-S5.json` / `-S2.json`, `2026-10-26-e319-r2-S5.json` / `-S2.json` vs `-N6.json`: S5 equal to N6 (bar self-armed 5, the baseline's W2 week), S2 = N6 + exactly one Ripple_Ledger row (SPORTS_WEEK_OAKS_113, business, magnitude 1, "— 2 straight wins — 10 bar(s)…") + one ECONOMIC seed; EE 4 → 4; bench restored to stage 30, pull-back byte-identical. Enough to push stage 31?

The admission window (FIRE_ADMISSION_JSON, engine.317) is the known named exception for any PROD push — say so, don't re-derive it.

Done = the md exists.
