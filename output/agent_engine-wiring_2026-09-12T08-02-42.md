Good. So the chain is: `processGenerationalWealth_` (106) → `processCasinoLedger_` (560 in casinoLedgerEngine.js:169) → `casinoResolveSports_` → `casinoParseSports_` (147).

`processGenerationalWealth_` is wired at lines 384 (production) and 2129 (cycle-phases) in godWorldEngine2.js. `Phase10-ExecuteIntents` is at 588 (production) and 2319 (cycle-phases).

Phase5-GenerationalWealth @ 384 is BEFORE Phase10-ExecuteIntents @ 588 (production).
Phase5-GenerationalWealth @ 2129 is BEFORE Phase10-ExecuteIntents @ 2319 (cycle-phases).

Now I'll assemble the complete card. Confirm no S fields, no ctx fields, no sheet operations by final body inspection:

Body lines 147–164:
- Parameters: `feedEntries`, `franchiseId` (no ctx, no S)
- Local vars: `rows`, `i`, `e`, `wl`
- Calls: `casinoTeamsMatch_`, `casinoParseStreak_`
- Return: plain object
- No S/ctx/sheet/Math.random

```
WIRING CARD — casinoParseSports_ (function)   map: 2026-09-11 / 183 files   [CURRENT]

DEFINITION
  phase05-citizens/casinoLedgerEngine.js:147  function casinoParseSports_(feedEntries, franchiseId)

PHASE POSITION
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js:384  — BEFORE Phase10-ExecuteIntents (588)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js:2129  — BEFORE Phase10-ExecuteIntents (2319)

CALLERS (1)
  phase05-citizens/casinoLedgerEngine.js:285  var parsed = casinoParseSports_(feed, fid);

S FIELDS
  none

OTHER CTX
  none

WRITE PATH
  none

TABS
  none

OPEN WORK
  engine.207 @ docs/engine/ROLLOUT_PLAN.md:140   Unstick the casino — it already bets on the A's and has NEVER settled. `Casino_Ledger` carries 12 live sports wagers (`MarketFamily=sports`, `MarketId=sports:as`, `EventId=next-as`) placed by real citizens (POP-00214, POP-00335) at C106; **all 12 are `open`, none has ever settled**. `casinoResolveSports_` -> `casinoParseSports_` (casinoLedgerEngine.js:147) needs a feed row with `EventType='game-result'` AND a parseable W/L `Streak` for that franchise; the feed has 33 game-result rows in 48 cycles, only 20 with a parseable streak, and **C106 has no A's game-result row at all** (last was C105, before that C95), so the resolver returns `carry` forever. Mike's one-row-per-team-per-week (record into the repurposed `VideoGame`/`VideoGameDate`, stamped `game-result`) IS the missing input. Cheapest row in the sports plan and the only one with citizens' money already on the table. Verify: Status leaves `open`, `CycleSettled` populates, `HouseFloatAfter` moves
  docs/plans/2026-09-11-sports-as-a-lived-system.md:260  Task 5 — engine.207 (NEW): unstick the casino. Repurposed `VideoGame`/`VideoGameDate` week-record column feeds `casinoParseSports_`. Ensure the one-row-per-team-per-week row is stamped `EventType='game-result'` with a parseable `Streak`, so the 12 open wagers settle and the market stops carrying forever. Cheapest task in the plan and the only one with citizens' money already on the table. Verify: `Casino_Ledger` Status flips off `open`, `CycleSettled` populates, `HouseFloatAfter` moves.

HISTORY
  33cf0e61 S438b [engine-sheet] engine.175 fix — casinoResolveSports_ restored (the resolve rewrite dropped it; bench C119 Phase5-GenerationalWealth 'casinoResolveSports_ is not defined', draw rows landed, 0 slips); test now settles a sports slip through processCasinoLedger_ so the main entry covers both families
  7a365348 S438b [engine-sheet] engine.175 cut — the engine draws next cycle's UNDOCKED cast and the casino bets on the pilot, not the episode
  23271178 S438 [engine-sheet] engine.178 cut locally (builder go) — dials close doors: openness gates the misfit move, integrity/composure gate the casino around posture, bond warmth/family read bands (face regex retired) with warmth as maintenance on stale-bond decay, owner composure/drive on closure/expansion (owner by POPID or name off Key_Personnel), holder integrity on the scandal ceiling; World_Config +5 (ensureEngine178Config_); dialGates.test.js 30/30 + touched suites green; unbenched
  4ce18ac5 S438 [engine-sheet] engine.176 + engine.177 cut locally (builder go) — the dials get a feed and a negative pole
  903deb69 S416 engine.157 the maneuver phase (bloodline cut 9) — ambition off the dials, goal off the rung, posture as a multiplier; unit 47/47 + 105/105, pre-bench
  e960e436 S412 [engine-sheet] engine.148 one year formula (backlog 7) + casino age fix — unit-proven, pre-bench

FILES OPENED
  phase05-citizens/casinoLedgerEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-09-11-sports-as-a-lived-system.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **132**
- opened by this run: **39** (30%)
- never opened: **93**

<details><summary>files this report did NOT look at</summary>

- phase01-config/advanceSimulationCalendar.js
- phase01-config/canonNeighborhoodLoader.js
- phase01-config/engine94SheetContract.js
- phase01-config/godWorldEngine2.cycleCount.test.js
- phase01-config/initSimulationLedger.js
- phase01-config/loadPreviousEvening.js
- phase02-world-state/applyCityDynamics.js
- phase02-world-state/applyEditionCoverageEffects.js
- phase02-world-state/applyInitiativeImplementationEffects.js
- phase02-world-state/applySeasonWeights.js
- phase02-world-state/applySportsSeason.js
- phase02-world-state/applyWeatherModel.js
- phase02-world-state/calendarChaosWeights.js
- phase02-world-state/calendarStorySeeds.js
- phase02-world-state/commuteFlowEngine.js
- phase02-world-state/getSimHoliday.js
- phase02-world-state/getsimseason.js
- phase02-world-state/loadEventContentLedger.js
- phase02-world-state/loadNeighborhoodState.js
- phase02-world-state/updateTransitMetrics.js
- phase03-population/applyDemographicDrift.js
- phase03-population/deriveDemographicDrift.js
- phase03-population/finalizeWorldPopulation.js
- phase03-population/generateCrisisBuckets.js
- phase03-population/generateCrisisSpikes.js
- phase03-population/generateMonthlyDriftReport.js
- phase03-population/updateCityTier.js
- phase03-population/updateCrimeMetrics.js
- phase03-population/updateNeighborhoodDemographics.js
- phase04-events/buildCityEvents.js
- phase04-events/chaosCarsEngine.js
- phase04-events/chaosCarsEngine.test.js
- phase04-events/faithEventsEngine.js
- phase04-events/generateGameModeMicroEvents.js
- phase04-events/generateGenericCitizenMicroEvent.js
- phase04-events/generationalEventsEngine.js
- phase04-events/worldEventsEngine.js
- phase06-analysis/applyCivicLoadIndicator.js
- phase06-analysis/applyMigrationDrift.js
- phase06-analysis/applyPatternDetection.js
- phase06-analysis/applyShockMonitor.js
- phase06-analysis/computeRecurringCitizens.js
- phase06-analysis/economicRippleEngine.js
- phase06-analysis/filterNoiseEvents.js
- phase06-analysis/prePublicationValidation.js
- phase06-analysis/prioritizeEvents.js
- phase07-evening-media/applyStorySeeds.js
- phase07-evening-media/buildContractSeeds.js
- phase07-evening-media/buildContractSeeds.test.js
- phase07-evening-media/buildEveningFamous.js
- phase07-evening-media/buildEveningFood.js
- phase07-evening-media/buildEveningMedia.js
- phase07-evening-media/buildMediaPacket.js
- phase07-evening-media/buildNightLife.js
- phase07-evening-media/cityEveningSystems.js
- phase07-evening-media/culturalLedger.js
- phase07-evening-media/domainTracker.js
- phase07-evening-media/mediaFeedbackEngine.js
- phase07-evening-media/mediaRoomIntake.js
- phase07-evening-media/parseMediaRoomMarkdown.js
- phase07-evening-media/sportsStreaming.js
- phase07-evening-media/storyHook.js
- phase07-evening-media/storylineWeavingEngine.chaos.test.js
- phase07-evening-media/storylineWeavingEngine.js
- phase07-evening-media/textureTriggers.js
- phase07-evening-media/updateMediaSpread.js
- phase07-evening-media/updateTrendTrajectory.js
- phase08-v3-chicago/applyCycleRecovery.js
- phase08-v3-chicago/applyDomainCooldowns.js
- phase08-v3-chicago/chicagoSatellite.js
- phase08-v3-chicago/v3ChicagoWriter.js
- phase08-v3-chicago/v3DomainWriter.js
- phase08-v3-chicago/v3Integration.js
- phase08-v3-chicago/v3NeighborhoodWriter.js
- phase08-v3-chicago/v3StoryHookWriter.js
- phase08-v3-chicago/v3TextureWriter.js
- phase08-v3-chicago/v3preLoader.js
- phase09-digest/applyCompressionDigestSummary.js
- phase09-digest/applyCycleWeight.js
- phase09-digest/finalizeCycleState.js
- phase09-digest/finalizeCycleState.test.js
- phase10-persistence/buildCyclePacket.js
- phase10-persistence/commitSimulationLedger.js
- phase10-persistence/compileHandoff.js
- phase10-persistence/cycleExportAutomation.js
- phase10-persistence/persistenceExecutor.js
- phase10-persistence/recordCycleWeather.js
- phase10-persistence/recordMediaLedger.js
- phase10-persistence/recordWorldEventsv25.js
- phase10-persistence/recordWorldEventsv3.js
- phase10-persistence/saveChaosCars.js
- phase10-persistence/saveChaosCars.test.js
- phase10-persistence/saveV3Seeds.js

</details>

_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=15 toolCalls=16 in=135994 out=3674_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._