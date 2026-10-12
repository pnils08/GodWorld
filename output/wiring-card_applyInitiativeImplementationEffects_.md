WIRING CARD — applyInitiativeImplementationEffects_ (function)   map: 2026-09-21 / 184 files   [MAP FRESH]

DEFINITION
  phase02-world-state/applyInitiativeImplementationEffects.js:194  v1.1 (ES5) — engine.45 T3e, S311
  VERSION DRIFT: header v1.1 vs Logger.log v1.0 @ :205

PHASE POSITION
  production entry : Phase2-InitiativeEffects @ godWorldEngine2.js:293  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase2-InitiativeEffects @ godWorldEngine2.js:2042 — BEFORE Phase10-ExecuteIntents (:2330)

PHASE CALLS RUNNING BEFORE (identical in both entry points)
  Phase1-LoadConfig          @ :272/:2018
  Phase1-CanonHoods          @ :277/:2026
  Phase1-AdvanceTime         @ :278/:2027
  Phase1-SeedRng             @ :279/:2028
  Phase1-Calendar            @ :280/:2029
  Phase1-ResetAudit          @ :281/:2030
  Phase1-PrevEvening         @ :282/:2031
  Phase1-PrevCycleState      @ :283/:2032
  Phase2-SportsSeason        @ :288/:2037
  Phase2-SeasonalWeights     @ :289/:2038
  Phase2-SportsFeed          @ :290/:2039
  Phase2-CivicSentiment      @ :291/:2040
  Phase2-EditionCoverage     @ :292/:2041

WRITES TO TABS (BEFORE Phase 10 executor)
  None found. No function running BEFORE applyInitiativeImplementationEffects_ writes to Neighborhood_Demographics, Neighborhood_Map, or Transit_Metrics.

CALLERS (6)
  phase01-config/godWorldEngine2.js:293   safePhaseCall_(ctx, 'Phase2-InitiativeEffects', function() { applyInitiativeImplementationEffects_(ctx); });
  phase01-config/godWorldEngine2.js:2042  safePhaseCall_(ctx, 'Phase2-InitiativeEffects', function() { applyInitiativeImplementationEffects_(ctx); });
  phase05-citizens/applyBusinessDynamics.test.js:221  sb.applyInitiativeImplementationEffects_({ summary: S, … });
  scripts/transitCauses.test.js:237  I.applyInitiativeImplementationEffects_(ctx);
  scripts/transitCauses.test.js:251  I.applyInitiativeImplementationEffects_(ctx);
  scripts/illnessInitiativeRelief.test.js:40  sandbox.applyInitiativeImplementationEffects_(ctx);
  scripts/illnessInitiativeRelief.test.js:111  sandbox.applyInitiativeImplementationEffects_(ctx);

S FIELDS
  WRITE initiativeImplementationEffects  @ :609   readers: applyCityDynamics_, initiativeTransitEffects_
  WRITE initiativeHealthRelief           @ :607   readers: updateNeighborhoodDemographics_
  WRITE initiativeNeighborhoodEffects    @ :618   readers: applyCityDynamics_, updateNeighborhoodDemographics_, driftNeighborhoodEducation_, applyBusinessDynamics_
  READ  absoluteCycle                    @ :233   writers: advanceSimulationCalendar_
  READ  cycleId                          @ :233   writers: advanceWorldTime_, v3Integration_
  READ  previousCycleState               @ :234   writers: loadPreviousCycleState_, applyShockMonitor_, finalizeCycleState_
  READ  sportsZones                      @ :394   writers: applySportsSeason_

OTHER CTX
  ctx.config        @ :233   (fallback source for cycleCount)
  ctx.ss            @ :200   (Sheets API)
  ctx.summary       @ :195   (alias S)

WRITE PATH
  INTENT  queueCellIntent_               @ :384   → Initiative_Tracker   (T7 reconciliation: Baylight phase forced to 'operational' when sports live)
  INTENT  recordRipple_                  @ :541-556  → Ripple_Ledger    (per-initiative impact recording; engine.45 T3e)
  Math.random: NOT FOUND

TABS
  Initiative_Tracker  writers: applyInitiativeImplementationEffects_, createInitiative_, updateCivicApprovalRatings_   readers: multiple (see map)
    manifest: docs/engine/SHEETS_MANIFEST.md:34 — City policy, budgeting, and phase implementation
    manifest: docs/engine/SHEETS_MANIFEST.md:155 — own-tab write carve-out: seedInitiativeTracker, ensureInitiativeStageColumns

  Ripple_Ledger  writers: recordRipple_ (called here @ :541)   readers: rippleLedger.test.js
    (no per-initiative row reader yet; rows live for full cycle)

READS S.previousCycleState & initiativeEnginePhaseMoves
  @ :234  var implPrev = S.previousCycleState || {};
  @ :240  var enginePhaseMoves = (Number(implPrev.cycle) === implCycle - 1 && implPrev.initiativeEnginePhaseMoves) ? implPrev.initiativeEnginePhaseMoves : null;
  (engine.250: detects phase TRANSITIONS; one-cycle-old gate same as engine.139)

OPEN WORK
  engine.45  ROLLOUT_PLAN.md:83 — Ripple ledger §T3e; per-initiative rows made real; open §T3d (per-hood fold), §T0 (traces)
  engine.132  civic-duty reference (no ROLLOUT line) — health initiatives delivering care mapped to S.initiativeHealthRelief, read by updateNeighborhoodDemographics
  engine.183  ROLLOUT_PLAN.md:108 — Transit slice: game day, Coliseum corrected, initiative × hoods; SHIPPED 0806aba5; unbenched
  engine.250  ROLLOUT_PLAN.md:145 — Approval + hood effects live; stall drain 0.5×; PROD @108 clasp v95
  engine.251  ROLLOUT_PLAN.md:146 — Housing lever: tenant rent relief via initiative bus (blocked)
  engine.253  ROLLOUT_PLAN.md:148 — Transit own system: builder 2026-09-21 (ready); civic ruling 2026-09-21
  civic.38   ROLLOUT_PLAN.md:172 — Civic board: 3-stage initiatives, losing clock, petitions from data; Tasks 1–5 build (Task 7 withdrawn, Task 2 rebuilt engine.250)
  docs/plans/2026-09-20-housing-lever.md — Initiative source; DOMAIN_EFFECTS reads Budget, no rent field; both entry points preserve Phase 2→5 sequences
  docs/plans/2026-09-09-transit-hood-alignment-plan.md:87 — Initiative transit slice published at S.initiativeImplementationEffects.transit

HISTORY
  f78561d0  civic.38 Task 4 upkeep: a delivered service nobody tends weakens (rulings c/e/g)
  7268a284  civic.38 Task 4 stage handler, first cut: Proposed->Funded, Standing (operational), prior-phase carry
  c57179fc  engine.250 + civic.38 Task 5 guard, business side: revival from failing phase not an advance
  7291d25e  engine.250: both hood effect buses live — Phase-2 clear, approval bus rides carry, business term pays transition
  0a8013fc  S463 engine.192: school table breathes — SchoolQualityIndex drift per Cycle off signed causes
  6ee31754  engine.183 transit × hoods — numbers carry causes (Tasks 2–6 cut, transitCauses 75/75, unbenched)

FILES OPENED
  phase02-world-state/applyInitiativeImplementationEffects.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/ROLLOUT_PLAN.md
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-09-20-housing-lever.md
  docs/plans/2026-09-09-transit-hood-alignment-plan.md
