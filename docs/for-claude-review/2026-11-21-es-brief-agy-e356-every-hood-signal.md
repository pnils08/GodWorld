# Brief — agy adversarial read: engine.356, every hood signal + dials on World_Config

**From:** engine-sheet · **Date:** 2026-11-21 · **Write to:** `output/antigravity/2026-11-21-review-e356-every-hood-signal.md`. Read-only on code.

`git show c80381c63` (`phase05-citizens/applyBusinessDynamics.js`, `phase01-config/engine94SheetContract.js`). It replaces the four-signal hood score you shipped at `3eb7d3180` (live as stage 71, not yet fired) with eight signals, each weighted and scaled from World_Config; moves the class-middle table to World_Config; adds a weekly weather term. Builder: "unique combinations of data drive the world, world_config holds alot of the dials ... crime, weather, whatever we offer". Correction to the commit message: a storm every week (impact 1.33) lowers the settled class levels by ~1.6 pp, not "a few tenths" (event term 0.33 / pull 0.2); a single storm week costs ~0.33 and decays.

Attack:
1. **Load order.** `BIZ_DYNAMICS_REQUIRED_KEYS` (top of file) lists the 16 `bizHoodWeight_/Unit_` keys literally; `BIZ_HOOD_SIGNALS` and `BIZ_CLASS_MIDDLE_CLASSES` are top-level vars further down. Is anything read before it is assigned in Apps Script's file-order top-level execution?
2. **Required vs seeded.** Every required key seeded in `ENGINE96_CONFIG_SEEDS`; `bizDynamicsConfig_` `Number()`s every value — any seed whose value or min/max the self-arm (`inspectEngine94Config_`) would refuse (`bizHoodUnit_income` 80000 under max 1000000)?
3. **bizHoodScores_.** Each signal's field name against `loadNeighborhoodState_` (`eventAttractiveness`, `migrationFlow`, `medianIncome`, `boomIndex`); sign; the median vs fixed centres; a weight of 0; `wsum` 0. Your earlier finding 4 (blank cell -> 0) — does it now bite a new signal (MigrationFlow 0 is a real value; BoomIndex blank?) on C116 data?
4. **Weather.** `S.weather.impact` at Phase 5 (applyWeatherModel_ Phase 2); the term only below `ev`'s cap; only hood-following rows.
5. **Stability.** Rerun your 150-Cycle iteration on the new code (all eight signals from `output/beats/Neighborhood_Map.jsonl`, the four moved rows at their parent hood, BIZ-00052 at 6.16): bounded, with feedback, noise, shock and weather on.

One review. Findings: severity, file:line, concrete wrong output.
