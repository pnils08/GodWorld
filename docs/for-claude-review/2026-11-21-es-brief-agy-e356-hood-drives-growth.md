# Brief — agy adversarial read: engine.356, a business's success from how its hood performs

**From:** engine-sheet · **Date:** 2026-11-21
**Write your review to:** `output/antigravity/2026-11-21-review-e356-hood-drives-growth.md`. Read-only on code.

Not on PROD. No sandbox run and no test run backs it (the builder blocked both). Your read is the check. First live fire would be C117.

## Read

`git show 45710b3ed` — `phase05-citizens/applyBusinessDynamics.js` (`bizDriftOne_`, new `bizHoodScores_`, `bizMedian_`, `bizIsFranchise_`, the `followsHood` / `classMiddle` block before the row loop, two new `inputs` fields), `phase01-config/engine94SheetContract.js` (seven new `ENGINE96_CONFIG_SEEDS` rows). The commit message states the design and the offline numbers.

Builder rulings it implements: "their success should stem from how the hood performs"; the terms (hood up to 1.5 pp/Cycle from shop health, mood, crime, rising/falling vs the city's middle; events capped at 1; weekly cap 1 unchanged); choice B: sports franchises and stadiums do not follow their hood; City-wide institutions out.

## Attack these

1. **Ratchet / runaway.** Growth_Rate is a level carried week to week. Show any path where the hood term keeps pushing after a business reaches its resting level (`mid + score × span`), or where `classMiddle` itself drifts so the whole class walks up or down Cycle over Cycle (it is the median of the same businesses being pulled). Trace the loop: business growth → `S.hoodBusinessMomentum` → `v3NeighborhoodWriter` `hoodBusinessFactor_` → RetailVitality → next Cycle's `bizHoodScores_`. Does it settle or amplify?
2. **The shock-free track.** `track` / `shipPrev` moved above the hood term. Is `track` used identically by the institution settle below; is any later line reading a `track` that changed meaning?
3. **Config.** The seven keys are `BIZ_DYNAMICS_REQUIRED_KEYS`; `bizDynamicsConfig_` throws on a missing one. Does `ensureEngine96Config_` (called in `runWorldCycleLocked_` before `loadConfig_`) add them on live before Phase 5 reads them? Does `runDryRunCycle` / `replayCycle` (they call `runCyclePhases_` without the self-arm) then throw — and is that a live risk?
4. **`bizIsFranchise_`** calls `MINT_GAME_TEAMS_` (defined in `processAdvancementIntake.js`) directly. Load-order or name risk in the flat Apps Script namespace?
5. **Every reader of Growth_Rate** (runCareerEngine hiring = staff × growth/100/52, applyDemographicDrift distress, commuteFlowEngine depth, chaos, ripple, generationalWealth, closure/decline streaks in this file). Any reader whose output changes in a way the commit message does not state?
6. **Edge rows.** A business whose class has no hood-following peers (`classMiddle` missing → null → no term); a closed row; a row with a blank hood; `S.neighborhoodState` empty or a hood with `retailVitality` null; `trajectoryMomentum` blank (loadNeighborhoodState `num()` → what?).

Known and stated: `phase05-citizens/applyBusinessDynamics.test.js` and other suites assert the old vitality term; not run, not edited. `bizVitalityGain` stays on World_Config, unread by the formula.

Findings: severity, file:line, the concrete wrong output. No style notes.
