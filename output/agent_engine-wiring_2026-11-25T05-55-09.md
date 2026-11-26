Let me check for sheets referenced in runBondEngine_ directly (not in helper functions called from it). Looking at the body, the function calls helper functions but doesn't directly reference sheets in its own code (lines 292-366). Let me verify by checking if there are any getSheetByName calls in those lines:

Based on my read of lines 292-366, I don't see any direct sheet access in runBondEngine_ itself. The sheets are accessed in the helper functions it calls. Let me now compile the final card:

Looking back at all the information:

**Definition:** phase05-citizens/bondEngine.js:292, V2.7

**Callers:**
- phase01-config/godWorldEngine2.js:765: safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); })
- phase01-config/godWorldEngine2.js:2486: safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); })
- phase08-v3-chicago/v3Integration.js:50: return runBondEngine_(ctx);

**Phase position:**
- production: Phase5-Bonds @ line 765, BEFORE Phase10-ExecuteIntents (line 967)
- cycle-phases: Phase5-Bonds @ line 2486, BEFORE Phase10-ExecuteIntents (line 2666)

**S fields in runBondEngine_ body (lines 292-366):**
- Line 308: S.holiday (READ)
- Line 309: S.holidayPriority (READ)
- Line 310: S.isFirstFriday (READ)
- Line 311: S.isCreationDay (READ)
- Line 312: S.sportsSeason (READ)
- Line 301/334: ctx.summary.relationshipBonds (READ/WRITE)
- Line 357: ctx.summary.pendingConfrontations (WRITE)

Now I'll assemble the complete card:

```
WIRING CARD — runBondEngine_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/bondEngine.js:292  function runBondEngine_(ctx) { … }  BOND ENGINE V2.7

PHASE POSITION
  production entry : Phase5-Bonds @ godWorldEngine2.js:765  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-Bonds @ godWorldEngine2.js:2486 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (3)
  phase01-config/godWorldEngine2.js:765  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });
  phase01-config/godWorldEngine2.js:2486 safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });
  phase08-v3-chicago/v3Integration.js:50  return runBondEngine_(ctx);

S FIELDS
  READ  holiday             @ :308   writers: advanceSimulationCalendar_, v3PreloadContext_
  READ  holidayPriority     @ :309   writers: advanceSimulationCalendar_, v3PreloadContext_
  READ  isFirstFriday       @ :310   writers: advanceSimulationCalendar_, v3PreloadContext_
  READ  isCreationDay       @ :311   writers: advanceSimulationCalendar_, v3PreloadContext_
  READ  sportsSeason        @ :312   writers: applySportsSeason_, v3PreloadContext_
  READ  relationshipBonds   @ :301   writers: createGenerationalBond_, createBond_, processGCCourtship_, processGCMarriageLottery_, loadRelationshipBonds_, purgeInactiveBonds_, seedEmergenceBonds_, seedRelationshipBonds_
  WRITE relationshipBonds   @ :334   readers: createGenerationalBond_, triggerDeathCascade_, triggerPromotionCascade_, applyAllianceBenefits_, bondExists_, checkConfrontationTriggers_, detectTriangleRivalries_, generateBondId_, generateBondSummary_, getRivalryIntensity_, processGCCourtship_, processGCMarriageLottery_, processRomanceAndMarriage_, resolveRivalry_, saveV3BondsToLedger_, updateExistingBonds_, & 20 more
  WRITE pendingConfrontations @ :357 readers: generateBondSummary_                                                                 [ORPHAN?]

OTHER CTX
  ctx.neighborhoodList      @ :297
  ctx._bondKeySet           @ :304
  ctx.bondCalendarContext   @ :314
  ctx.config                (read via config.cycleCount in helper functions)
  ctx.ledger                (read in helper functions)
  ctx.rng                   (read in helper functions for deterministic randomness)
  ctx.ss                    (spreadsheet object, accessed in helper functions)
  ctx.cache                 (read in helper functions)

WRITE PATH
  DIRECT  getRange(…).setValue(…)        @ :1083, :1168, :2501, :2539, :2730, :2801, :2935   (in processFaithJoins_, marryCitizens_, processGCCourtship_, processGCMarriageLottery_)   [after-executor? YES]
  DIRECT  appendRow(…)                   @ :2553, :2565                                       (in marryCitizens_)                                                             [after-executor? YES]
  DIRECT  setValues(…)                   @ :3155                                              (in saveV3BondsToLedger_)                                                        [after-executor? YES]
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', […])  @ :2115                            (in a helper, bond moment logging)
  Math.random is NOT present in runBondEngine_ body (v2.7: all replaced with ctx.rng)

TABS
  Neighborhood_Map         writers: updateNeighborhoodTrajectories_   readers: loadCanonNeighborhoods_, loadNeighborhoodState_, loadNeighborhoodNames_, & 7 more   manifest: (see SHEETS_MANIFEST.md)
  Faith_Organizations      writers: generateCitizensEvents_, processRelocations_          readers: processFaithJoins_, generateCitizensEvents_, & 4 more
  Household_Ledger         writers: createChildRow_, runGenerationalEngine_, marryCitizens_, & 6 more   readers: createChildRow_, formSingleParentHousehold_, marryCitizens_, & 11 more
  Family_Relationships     writers: createChildRow_, formSingleParentHousehold_, marryCitizens_, updateHeritage_, formIntakeHouseholds_   readers: createChildRow_, formSingleParentHousehold_, marryCitizens_, recordInheritanceInFamily_, & 2 more
  Generic_Citizens         writers: processIntake_, generateCitizensEvents_, processMediaUsage_, mintOutOfTownChallenger_, pickGenericCitizenChallenger_   readers: processIntake_, processGCCourtship_, processGCMarriageLottery_, & 9 more
  Simulation_Ledger        writers: ensureHeritageSchema_   readers: initSimulationLedger_, ensureBondEngineData_, diagnoseLedgerStructure, & 10 more
  Relationship_Bond_Ledger writers: ensureRelationshipBondLedgerSchema_   readers: saveV3BondsToLedger_, ensureRelationshipBondLedgerSchema_

OPEN WORK
  NOT FOUND (no entries in ROLLOUT_PLAN.md for runBondEngine_)

HISTORY
  4b0776b04 engine.356 (builder 2026-11-24: "lower it so we don't get eveyone hating each other but it's ok to have some rivalries"; …
  e788cafe7 engine.356 (builder 2026-11-24: "the cleaner way is to have the 'variants' out side of the code into world_config"): the bond engine's 17 weekly numbers are read from World_Config, seeded at the values the code held; …
  2f6751913 engine.356 (builder 2026-11-24: "let's keep marriages to boy / girl so we can make sure we know how to control the code"): the wedding gate checks man / woman itself …
  bbd105433 engine.356 bond-called moments: agy SHIP-WITH-FIXES folded — the twin line passes the other person's own gates …
  bf324305b engine.356 bond-called moments built, not benched (builder 2026-11-24: "these should fire when the bonds call for them too …
  170e05444 engine.356: agy review of tonight's cuts folded (output/antigravity/2026-11-21-review-e356-evening-and-bond-lines.md). Repo only, NOT on PROD.

FILES OPENED
  phase05-citizens/bondEngine.js
  phase01-config/godWorldEngine2.js
  phase08-v3-chicago/v3Integration.js
  docs/engine/ENGINE_STUB_REVERSE.json
```

---

WIRING CARD — runBondEngine_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/bondEngine.js:292  function runBondEngine_(ctx) { … }  BOND ENGINE V2.7

PHASE POSITION
  production entry : Phase5-Bonds @ godWorldEngine2.js:765  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-Bonds @ godWorldEngine2.js:2486 — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (3)
  phase01-config/godWorldEngine2.js:765  safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });
  phase01-config/godWorldEngine2.js:2486 safePhaseCall_(ctx, 'Phase5-Bonds', function() { runBondEngine_(ctx); });
  phase08-v3-chicago/v3Integration.js:50  return runBondEngine_(ctx);

S FIELDS
  READ  holiday             @ :308   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  holidayPriority     @ :309   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  isFirstFriday       @ :310   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  isCreationDay       @ :311   writers: advanceSimulationCalendar_@phase01-config/advanceSimulationCalendar.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  sportsSeason        @ :312   writers: applySportsSeason_@phase02-world-state/applySportsSeason.js, v3PreloadContext_@phase08-v3-chicago/v3preLoader.js
  READ  relationshipBonds   @ :301   writers: createGenerationalBond_@phase04-events/generationalEventsEngine.js, createBond_@phase05-citizens/bondEngine.js, processGCCourtship_@phase05-citizens/bondEngine.js, processGCMarriageLottery_@phase05-citizens/bondEngine.js, loadRelationshipBonds_@phase05-citizens/bondPersistence.js, purgeInactiveBonds_@phase05-citizens/bondPersistence.js, seedEmergenceBonds_@phase05-citizens/processAdvancementIntake.js, seedRelationshipBonds_@phase05-citizens/seedRelationBondsv1.js
  WRITE relationshipBonds   @ :334   readers: 24 functions across phase04-events, phase05-citizens, phase06-analysis, phase07-evening-media, utilities
  WRITE pendingConfrontations @ :357 readers: generateBondSummary_@phase05-citizens/bondEngine.js                    [ORPHAN — written only in runBondEngine_]

OTHER CTX
  ctx.neighborhoodList      @ :297   (WRITE)
  ctx._bondKeySet           @ :304   (WRITE)
  ctx.bondCalendarContext   @ :314   (WRITE)

WRITE PATH
  DIRECT  getRange(…).setValue(…)        @ :1083, :1168, :2501, :2539, :2730, :2801, :2935   (via processFaithJoins_, marryCitizens_, processGCCourtship_, processGCMarriageLottery_)
  DIRECT  appendRow(…)                   @ :2553, :2565                                       (via marryCitizens_)
  DIRECT  setValues(…)                   @ :3155                                              (via saveV3BondsToLedger_)
  INTENT  queueAppendIntent_(…)          @ :2115                                              (via ??)
  Math.random: NOT FOUND in runBondEngine_ (v2.7: all replaced with ctx.rng)

TABS
  Neighborhood_Map         writers: updateNeighborhoodTrajectories_   readers: loadCanonNeighborhoods_, loadNeighborhoodState_, loadNeighborhoodNames_, civicInitiativeEngine, migrationTrackingEngine, neighborhoodTrajectoryEngine, applyMigrationDrift, v3NeighborhoodWriter, setupSportsFeedValidation   manifest: SHEETS_MANIFEST.md
  Faith_Organizations      writers: generateCitizensEvents_, processRelocations_   readers: processFaithJoins_, generateCitizensEvents_, contractSeedBackdropIndex_, ensureFaithLedger (×2)
  Household_Ledger         writers: createChildRow_, runGenerationalEngine_, marryCitizens_, casinoLedgerEngine, generationalWealthEngine, householdFormationEngine (×3)   readers: 15 functions
  Family_Relationships     writers: createChildRow_, formSingleParentHousehold_, marryCitizens_, updateHeritage_, formIntakeHouseholds_   readers: 8 functions
  Generic_Citizens         writers: processIntake_, generateCitizensEvents_, processMediaUsage_, mintOutOfTownChallenger_, pickGenericCitizenChallenger_   readers: 14 functions
  Simulation_Ledger        writers: ensureHeritageSchema_   readers: initSimulationLedger_, ensureBondEngineData_, diagnoseLedgerStructure, listNamedCitizens, ensureHeritageSchema_, runAdvancementIntakeManual, processRawCitizenUsageLog_, routeCitizenUsageToIntake_, exportSimulationLedger, archiveCitizenExits, ensureNeighborhoodDemographics, exportCitizensSnapshot
  Relationship_Bond_Ledger writers: ensureRelationshipBondLedgerSchema_   readers: saveV3BondsToLedger_, ensureRelationshipBondLedgerSchema_

OPEN WORK
  NOT FOUND

HISTORY
  4b0776b04 engine.356 (builder 2026-11-24: "lower it so we don't get eveyone hating each other but it's ok to have some rivalries" …
  e788cafe7 engine.356 (builder 2026-11-24: "the cleaner way is to have the 'variants' out side of the code into world_config"): …
  2f6751913 engine.356 (builder 2026-11-24: "let's keep marriages to boy / girl so we can make sure we know how to control the code"): …
  bbd105433 engine.356 bond-called moments: agy SHIP-WITH-FIXES folded …
  bf324305b engine.356 bond-called moments built, not benched (builder 2026-11-24 …
  170e05444 engine.356: agy review of tonight's cuts folded …

FILES OPENED
  phase05-citizens/bondEngine.js
  phase01-config/godWorldEngine2.js
  phase08-v3-chicago/v3Integration.js
  docs/engine/ENGINE_STUB_REVERSE.json
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=19 toolCalls=27 in=533411 out=7452_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._