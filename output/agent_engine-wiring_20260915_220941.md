# WIRING CARD — S.storyHooks (field)   
map: 2026-09-15 / 183 files

## DEFINITION

`ctx.summary.storyHooks` / `S.storyHooks` / `S8.storyHooks` — carried-forward story hook array written by 25 functions across Phases 4–7 and normalized at Phase8-V3Integration before final sheet persistence at Phase10-Hooks.

## WRITERS (25 functions)

### Phase 4 (Events & Chaos)
- phase04-events/generationalEventsEngine.js:322 — `runGenerationalEngine_`  
  `ctx.summary.storyHooks.push({hookType: 'CITIZEN_HOSPITALIZED', domain: 'HEALTH', …})`

- phase04-events/chaosCarsEngine.js:355 — `resolveChaosEvents_`  
  `S8.storyHooks.push({hookType: 'CITIZEN_HOSPITALIZED', domain: 'HEALTH', …})`

- phase04-events/chaosCarsEngine.js:362 — `resolveChaosEvents_`  
  `S8.storyHooks.push({hookType: 'CITIZEN_ARRESTED', domain: 'SAFETY', …})`

- phase04-events/chaosCarsEngine.js:369 — `resolveChaosEvents_`  
  `S8.storyHooks.push({hookType: 'OARI_INTERVENTION', domain: 'CIVIC', …})`

### Phase 5 (Citizens & Ledgers)
- phase05-citizens/updateCivicApprovalRatings.js:715 — `updateCivicApprovalRatings_`  
  `S.storyHooks.push(hook)` where hook.hookType = 'CIVIC_APPROVAL_SCANDAL' (no explicit domain in pushed object)

- phase05-citizens/updateCivicApprovalRatings.js:777 — `updateCivicApprovalRatings_`  
  `S.storyHooks.push(campHook)` where hookType = 'CIVIC_CHALLENGER_CAMPAIGN'

- phase05-citizens/updateCivicApprovalRatings.js:848 — `updateCivicApprovalRatings_`  
  `S.storyHooks.push(leaveHook)` where hookType = 'CIVIC_DEMOTION' or 'CIVIC_LEFT_OFFICE'

- phase05-citizens/generationalWealthEngine.js:416 — `processMoneyLoop_`  
  `ctx.summary.storyHooks.push({hookType: 'MONEY_MILESTONE'|'MONEY_SHOCK'|'DEBT_CRISIS', domain: 'COMMUNITY', …})`

- phase05-citizens/generationalWealthEngine.js:1250 — `processInheritance_`  
  `ctx.summary.storyHooks.push({hookType: 'GENERATIONAL_WEALTH_TRANSFER', …})`

- phase05-citizens/generationalWealthEngine.js:1584 — `trackWealthMobility_`  
  `ctx.summary.storyHooks.push({hookType: 'WEALTH_MOBILITY', …})`

- phase05-citizens/generationalWealthEngine.js:1775 — `trackHomeOwnership_`  
  `ctx.summary.storyHooks.push({hookType: 'HOME_PURCHASE', domain: 'BUSINESS', severity: 3, …})`

- phase05-citizens/generationalWealthEngine.js:2125 — `updateHeritage_`  
  `ctx.summary.storyHooks.push({hookType: 'HERITAGE_FOUNDED', severity: 4, …})`

- phase05-citizens/generationalWealthEngine.js:2548 — `processMoneyLoop_` (nested)  
  `ctx.summary.storyHooks.push({…})`

- phase05-citizens/generationalWealthEngine.js:2579 — `processMoneyLoop_` (nested)  
  `ctx.summary.storyHooks.push({…})`

- phase05-citizens/generationalWealthEngine.js:2593 — `processMoneyLoop_` (nested)  
  `ctx.summary.storyHooks.push({…})`

- phase05-citizens/generationalWealthEngine.js:2614 — `processMoneyLoop_` (nested)  
  `ctx.summary.storyHooks.push({…})`

- phase05-citizens/generationalWealthEngine.js:2642 — `processMoneyLoop_` (nested)  
  `ctx.summary.storyHooks.push({…})`

- phase05-citizens/civicInitiativeEngine.js:2561 — `generateOverrideStoryHook_`  
  `S.storyHooks.push(hook)` where hookType = 'MAYORAL_VETO'

- phase05-citizens/civicInitiativeEngine.js:2597 — `generateVetoStoryHook_`  
  `S.storyHooks.push(hook)` where hookType = 'MAYORAL_VETO' (no explicit domain)

- phase05-citizens/neighborhoodTrajectoryEngine.js:345 — `emitTrajectoryHooks_`  
  `S.storyHooks.push(hook)` where hookType = 'NEIGHBORHOOD_RISING'|'NEIGHBORHOOD_COOLING'|'NEIGHBORHOOD_BOOM'|'HOUSING_PRESSURE_HIGH' (NO domain field in these)

- phase05-citizens/householdFormationEngine.js:243 — `processHouseholdFormation_`  
  `S.storyHooks = S.storyHooks.concat(hooks)` — bulks in HOUSEHOLD_FORMED|HOUSEHOLD_DISSOLVED|RENT_BURDEN_CRISIS

- phase05-citizens/educationCareerEngine.js:630 — `checkSchoolQuality_`  
  `ctx.summary.storyHooks.push({hookType: 'CAREER_STAGNATION', …})`

- phase05-citizens/educationCareerEngine.js:1354 — `detectCareerMobility_`  
  `ctx.summary.storyHooks.push({hookType: 'SCHOOL_QUALITY_CRISIS', …})`

- phase05-citizens/educationCareerEngine.js:1369 — `detectCareerMobility_`  
  `ctx.summary.storyHooks.push({hookType: 'DROPOUT_WAVE', …})`

- phase05-citizens/generateCitizensEvents.js:2058 — `generateCitizensEvents_`  
  `S.storyHooks.push({hookType: 'FAMILY_CELEBRATION'|'FAMILY_CRISIS', …})`

- phase05-citizens/generateCitizensEvents.js:3114 — `generateCitizensEvents_`  
  `S.storyHooks.push({hookType: 'FAME_WATCH', severity: 3, priority: 3, …})`

- phase05-citizens/bondEngine.js:2167 — `marryCitizens_`  
  `ctx.summary.storyHooks.push({hookType: 'ROMANCE_BEGUN', severity: 3, priority: 3, …})`

- phase05-citizens/bondEngine.js:2305 — `processRomanceAndMarriage_`  
  `ctx.summary.storyHooks.push({hookType: 'SUPER_COUPLE_MARRIED'|'CITIZEN_MARRIED', …})`

- phase05-citizens/casinoLedgerEngine.js:809 — `processCasinoLedger_`  
  `S.storyHooks.push({hookType: 'CASINO_WIN'|'CASINO_DEBT'|'CASINO_LOSS', …})`

- phase05-citizens/processAdvancementIntake.js:1979 — `wireBusinessOwners_`  
  `ctx.summary.storyHooks.push({hookType: 'BUSINESS_OWNER_ARRIVED', severity: 3, priority: 2, …})`

- phase05-citizens/processAdvancementIntake.js:2226 — `formIntakeHouseholds_`  
  `ctx.summary.storyHooks.push({hookType: 'HOUSEHOLD_ARRIVED', severity: 3, priority: 2, …})`

- phase05-citizens/processAdvancementIntake.js:2344 — `wireFamilyMatch_`  
  `ctx.summary.storyHooks.push({hookType: 'FAMILY_REALIZED', severity: 3, priority: 3, …})`

- phase05-citizens/migrationTrackingEngine.js:770 — `generateMigrationHooks_`  
  `ctx.summary.storyHooks.push(moveHook)` where hookType = 'CITIZEN_RELOCATED'

- phase05-citizens/migrationTrackingEngine.js:915 — `processRelocations_`  
  `ctx.summary.storyHooks.push(forcedHook)` where hookType = 'FORCED_MIGRATION'

- phase05-citizens/migrationTrackingEngine.js:935 — `processRelocations_`  
  `ctx.summary.storyHooks.push(exodusHook)` where hookType = 'MASS_EXODUS'

### Phase 7 (Evening Media & Stories)
- phase07-evening-media/storylineWeavingEngine.js:123 — `weaveStorylines_`  
  `S.storyHooks = S.storyHooks.concat(allHooks)` — merges cross-storyline hooks (hookType: 'CROSS_STORYLINE'|'RELATIONSHIP_CLASH'|'ALLIANCE_OPPORTUNITY')

### Phase 8 (V3 Integration — Normalization)
- phase08-v3-chicago/v3Integration.js:136 — calls `storyHookEngine_` (wrapped in safeCall_)

- **phase07-evening-media/storyHook.js:1396 — `storyHookEngine_` NORMALIZER (Phase8-V3Integration)**
  Runs BEFORE Phase10-Hooks; normalizes carried storyHooks:
  - Maps `description` → `text` (line 1390)
  - Maps `severity` → `priority` (line 1391)
  - Maps `hookType` → `domain` IF missing (line 1392)
  - Dedupes and replaces entire `ctx.summary.storyHooks` array (line 1396)
  
  **KEY: All Phase 4–7 writers run BEFORE this normalizer. Hooks lacking explicit `domain` field get their hookType assigned as domain.**

### Phase 8 (V3 Preload)
- phase08-v3-chicago/v3preLoader.js:58 — `v3PreloadContext_` (Phase8-V3Preload, BEFORE storyHookEngine_)  
  Initializes: `if (!S.storyHooks) S.storyHooks = [];` (guard only, no push)

### Phase 10 (Persistence — Readers Only)
- **phase08-v3-chicago/v3StoryHookWriter.js:52 — `saveV3Hooks_` READER ONLY (Phase10-Hooks)**
  Reads `ctx.summary.storyHooks` and writes to Story_Hook_Deck via queueBatchAppendIntent_

## PHASE POSITION MAP

| Phase | Entry Point | Position | Function |
|-------|---|---|---|
| 4 | production & cycle-phases | Phase4-Events | runGenerationalEngine_, resolveChaosEvents_ |
| 5 | production & cycle-phases | Phase5-ApprovalRatings | updateCivicApprovalRatings_ |
| 5 | production & cycle-phases | Phase5-Generational | runGenerationalEngine_ |
| 5 | production & cycle-phases | Phase5-CitizenEvents | generateCitizensEvents_ |
| 5 | production & cycle-phases | Phase5-HouseholdFormation | processHouseholdFormation_ |
| 7 | production only (line 474) | Phase7-StorylineWeaving | weaveStorylines_ |
| 8 | production & cycle-phases | Phase8-V3Preload (line 502) | v3PreloadContext_ [guard] |
| **8** | **production & cycle-phases** | **Phase8-V3Integration (line 524)** | **storyHookEngine_ NORMALIZER** |
| 8 | production & cycle-phases | Phase8-CycleWeightSignal (line 525) | applyCycleWeight_ [reads S.storyHooks] |
| **10** | **production & cycle-phases** | **Phase10-Hooks (line 567/2308)** | **saveV3Hooks_ WRITER → Story_Hook_Deck** |
| 10 | production & cycle-phases | Phase10-ExecuteIntents (line 594) | executePersistIntents_ [executes queuedIntents] |

**CRUCIAL:** All 25 writers run BEFORE Phase8-V3Integration. The storyHookEngine_ at Phase8-V3Integration:
1. Reads the carried array `ctx.summary.storyHooks`
2. Normalizes each hook (description→text, severity→priority, hookType→domain if missing)
3. Dedupes and REPLACES the entire array at line 1396

Writers lacking explicit `domain` field (e.g., neighborhoodTrajectoryEngine) get hookType assigned as domain by the normalizer.

## READERS (outside storyHookEngine_ & saveV3Hooks_)

- phase03-population/deriveDemographicDrift.js:49 — `deriveDemographicDrift_` (Phase3)  
  `var hooks = S.storyHooks ? S.storyHooks.length : 0;` [reads length only]

- phase09-digest/applyCycleWeight.js:67 — `applyCycleWeight_` (Phase8-CycleWeightSignal, runs AFTER storyHookEngine_)  
  `var hooks = S.storyHooks || [];` [reads array]

- phase09-digest/applyCompressionDigestSummary.js:143 — `applyCompressedDigestSummary_` (Phase9)  
  `var hooks = S.storyHooks ? S.storyHooks.length : 0;` [reads length only]

- phase08-v3-chicago/applyCycleRecovery.js:157 — `applyCycleRecovery_` (Phase8-CycleWeightSignal path)  
  `var hookCount = S.storyHooks ? S.storyHooks.length : 0;` [reads length only]

- phase08-v3-chicago/v3DomainWriter.js:217 — `deriveDomainPresenceV34_` (Phase8-V3Integration, within integration)  
  `var storyHooks = S.storyHooks || [];` [reads array]

- phase08-v3-chicago/v3NeighborhoodWriter.js:182 — `saveV3NeighborhoodMap_` (Phase10-NeighborhoodMap, after storyHookEngine_)  
  `var storyHooks = S.storyHooks || [];` [reads array]

- phase10-persistence/buildCyclePacket.js:560 — `buildCyclePacket_` (Phase10-CyclePacket)  
  `var hooks = S.storyHooks || [];` [reads array]

- phase10-persistence/buildCyclePacket.js:597 — `buildCyclePacket_` (Phase10-CyclePacket)  
  `var allHooks = S.storyHooks || [];` [reads array]

- phase10-persistence/recordMediaLedger.js:103 — `recordMediaLedger_` (Phase10-MediaLedger)  
  `var hookCount = S.storyHooks ? S.storyHooks.length : 0;` [reads length only]

## DOMAIN FIELD ANALYSIS

### Writers WITH explicit `domain` field in pushed object:
- phase04-events/generationalEventsEngine.js:322 — domain: 'HEALTH'
- phase04-events/chaosCarsEngine.js:355 — domain: 'HEALTH'
- phase04-events/chaosCarsEngine.js:362 — domain: 'SAFETY'
- phase04-events/chaosCarsEngine.js:369 — domain: 'CIVIC'
- phase05-citizens/generationalWealthEngine.js:416 — domain: 'COMMUNITY'
- phase05-citizens/generationalWealthEngine.js:1775 — domain: 'BUSINESS'

### Writers WITHOUT explicit `domain` field (rely on normalizer line 1392: hookType → domain):
- phase05-citizens/civicInitiativeEngine.js:2561, 2597 — hookType: 'MAYORAL_VETO' → domain: 'MAYORAL_VETO'
- phase05-citizens/neighborhoodTrajectoryEngine.js:345 — hookTypes without domain get hookType assigned
- phase05-citizens/householdFormationEngine.js:243 — concat'd hooks need inspection
- phase05-citizens/educationCareerEngine.js:630, 1354, 1369 — hookTypes assigned
- phase05-citizens/generateCitizensEvents.js:2058, 3114 — hookTypes assigned
- phase05-citizens/bondEngine.js:2167, 2305 — hookTypes assigned
- phase05-citizens/casinoLedgerEngine.js:809 — hookType assigned
- phase05-citizens/processAdvancementIntake.js:1979, 2226, 2344 — hookTypes assigned
- phase05-citizens/migrationTrackingEngine.js:770, 915, 935 — hookTypes assigned
- phase05-citizens/generationalWealthEngine.js:1250, 1584, 2125, 2548, 2579, 2593, 2614, 2642 — hookTypes assigned
- phase05-citizens/updateCivicApprovalRatings.js:715, 777, 848 — hookTypes assigned
- phase07-evening-media/storylineWeavingEngine.js:123 — cross-storyline hooks

## WRITE PATH (to Story_Hook_Deck sheet)

- **INTENT** `queueBatchAppendIntent_` @ phase08-v3-chicago/v3StoryHookWriter.js:91  
  Queued at Phase10-Hooks, executed at Phase10-ExecuteIntents (line 594/2329)

## OPEN WORK (ROLLOUT_PLAN.md)

| Row ID | Summary | Status |
|--------|---------|--------|
| engine.224 | **Cycle-weight signal scored after its writers (engine-sheet S461):** `applyCycleWeight_` reads `S.storyHooks` (high-priority hooks). Moved after Phase8-V3Integration. BENCH-PROVEN @38 C108–C109; PROD @90 (version 79) 2026-09-15 ~01:45 | done-pending-archive |

## GIT HISTORY

```
3b8b51b4 S428 engine.119 Wave A — the cycle never creates a tab; the C104 crash site gets retry; pre-mortem diffs required tabs against the sheet
775cfb1e S419 engine.141 — the dead tracker's two engine readers retired
1348e685 sports: add debut EventTrigger with story hook (Mike-direct S369)
1f66474a sports: add injury / injury-return EventTrigger with story hooks (Mike-direct S369)
f03bdbad S318 engine.57 P1 (partial): age-gated income + story-hook merge fix + approved plan v5
```

(Last 5 commits touching phase07-evening-media/storyHook.js and phase08-v3-chicago/v3StoryHookWriter.js)

## MAP STATUS

- Map generated: 2026-09-15
- Files scanned: 183
- Target file (storyHook.js) last commit: 3b8b51b4 (S428 engine.119) — **MAP FRESH**

