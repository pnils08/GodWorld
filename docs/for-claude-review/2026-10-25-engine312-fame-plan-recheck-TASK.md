# TASK — codex: re-review of engine.312 Revision 2 (your plan review folded), one round

Read-only; no cron, model, Sheet write, bench or canon run (the engine.301 bench is running from engine-sheet; do not touch SANDBOX 1004). Do not commit, do not push. Write to `docs/for-claude-review/2026-10-25-codex-engine312-plan-recheck.md`, SHIP / FIX / HOLD per hunt, file:line evidence, under ~60 lines. Report in one line when done.

Your review: `docs/for-claude-review/2026-10-25-codex-engine312-plan-review.md`. Revision 2: `docs/plans/2026-10-16-celeste-dead-slice-legends-and-interview-guards.md` §engine.312, the **Codex plan review … Revision 2** block (R1–R5 + the stated limit). Builder rulings fixed; two es readings are on the builder's morning list (unlocated rows count by type; coverage does not write LastSeenCycle).

1. **Each of your findings closed by R1–R5?** P1 allowlist + manifest (are the six coverage types right, per writer?); P2 accumulator (all pending rows, CUL row carried, nothing else writing FameScore — engine.118's floor folded into the flush); P3 cause (`sighting` +1 vs `roster` 0; pending-create start in the append; `S.paperFameByPop` over the whole loaded tab); P4 dry run + write-back matching; scope.
2. **The accumulator's mechanics.** `flushCulturalFame_` last in `buildEveningFamous_` (`phase07-evening-media/buildEveningFamous.js:100,555`): is every FameScore writer before it in both runners' phase order (`phase01-config/godWorldEngine2.js`)? Any FameScore writer outside Phase 5 / Phase 7 (scripts, Phase 10/11, the media room) that would still collide? What the registrar's other reads of `newFame` (TrendTrajectory, CityTier, the summary, `S.culturalRegistrations`) should see.
3. **Anything missing** for a build to start once engine.301 is on PROD.

Done = the md exists.
