---
title: Codex review — engine.95 checkpoint and commit resumability design
created: 2026-10-08
updated: 2026-10-08
type: review
tags: [review, engine, infrastructure]
sources:
  - docs/plans/2026-07-31-platform-ceiling-resilience.md — Task 5 audit and Task 4 design
  - HEAD f9d0de9f
  - docs/engine/SHEETS_MANIFEST.md — section 9
pointers:
  - "[[../plans/2026-07-31-platform-ceiling-resilience]] — reviewed design, engine.95"
---

# Codex review — engine.95 checkpoint and commit resumability design

**Target:** `docs/plans/2026-07-31-platform-ceiling-resilience.md:116` Task 5 audit and `:139` Task 4 design, including the builder go at `:156`. Current HEAD: `f9d0de9f`; engine.94 B.3 and election deletion are included.

**Result:** HOLD — six BLOCK, three FIX, one NOTE. The approved numbers remain `wallBudgetMs=330000`, `tailReserveMs=60000`, and a bench-measured `checkpointSaveMs`. The proposed state/save/replay contract cannot safely implement those decisions yet.

**Builder's words (2026-10-07, quoted by the owning plan):** "i agree, go with those numbers".

**Scope:** Code and existing documentation inspected only; no commits, deployment, trigger creation, or Sheet access. Only this requested report is written. Source paths/lines below refer to HEAD. Schema statements are repository contracts, not live header readbacks. Existing output dirt and the pre-existing unrelated inbox file were untouched.

## Findings

### 1. FIX — Put checkpoint persistence in a Phase-10 writer; explicitly document its earlier execution. The current Git hook does not enforce the claimed location rule.

The design puts a direct checkpoint write in an unwrapped gate immediately after Phase 9 (`docs/plans/2026-07-31-platform-ceiling-resilience.md:147`). A normal intent cannot implement that write: the point of the operation is to survive returning before the executor.

`docs/engine/SHEETS_MANIFEST.md:117` requires direct writes outside Phase 10 to have a named carve-out. Its classes at `:119` distinguish error-path, own-tab, phase10-loc, and phase11; a journal written on every healthy fire is not solely an error-path write. Placing a call next to Phase 9 does not make it an existing phase10-loc exception.

**Required design change:** Locate the sheet writer/reader/validation implementation under `phase10-persistence/` (for example, a new checkpoint persistence module); the runner should call it. Add a manifest entry for `_CycleCheckpoint` that expressly authorizes the pre-executor journal/checkpoint write and its recovery writes, with a named class and ownership. Pre-create/validate the hidden tab through the deploy/setup path: the runtime tab-creation restriction is explicit at `SHEETS_MANIFEST.md:119`; an ensure intent that runs after the checkpoint is needed cannot provision it in time. Keep trigger/admission orchestration separate from the actual Sheet writer.

**Hook correction:** The current `.githooks/pre-commit:94`, `:102`, and `:114` invoke canon-leak, civic-refusal, and writer-exit checks. The writer-exit scan is for `scripts/*.js` (`scripts/auditWriterExitCodes.js:13`); there is no generic Phase-10/direct-Sheet-write gate in this hook. Passing it is not evidence of manifest compliance. Any implementation in engine substrate still lands through engine-sheet under AGENTS.md. Also correct the manifest's legacy name `ctx.writeIntents`: actual queues are `ctx.persist` (`utilities/writeIntents.js:46`), as Finding 2 demonstrates.

### 2. BLOCK — The saved state and hand-picked resume omit 20 Phase-10 phases and indispensable context.

At the proposed boundary (`phase01-config/godWorldEngine2.js:767` / `:2436`), there are **25 remaining scheduled phases: 20 before the executor, the executor, and four Phase-11 phases**. Resuming at ExecuteIntents omits digest/weather/event output, neighborhoods, both bond writers, seeds/hooks/textures, care ledgers/census, carry-forward stores, the POPID mark, and the consolidated citizen ledger.

The actual queue has three parts: `ctx.persist.replaceOps`, `.updates`, `.logs` (`utilities/writeIntents.js:46`; `phase10-persistence/persistenceExecutor.js:75`). There is no `ctx.writeIntents` queue to restore. A VM probe using the proposed field executed **zero** intents because the executor returns early without `ctx.persist` (`persistenceExecutor.js:54`). The consolidated Simulation_Ledger range does **not** exist at this boundary: `commitSimulationLedger_` creates it at `phase10-persistence/commitSimulationLedger.js:25`, called at runner `:813` / `:2476`.

#### Actual dispatch and phase inventory

Menu **Run World Cycle** targets `runWorldCycle` (`utilities/godWorldMenu.js:27`). The web fire also calls `runWorldCycle` (`utilities/webTrigger.js:43`). That wrapper admits under the script lock and invokes the **inline** `runWorldCycleLocked_` (`phase01-config/godWorldEngine2.js:413`, `:420`, `:421`). `runCyclePhases_` is called by **runDryRunCycle** (`:2036`) and **replayCycle** (`:2146`), not the production menu/web path. It has no `fire.admission` argument. A gate using that argument must therefore define its mode/entry contract on both paths.

Both functions currently contain **131 actual `safePhaseCall_` call sites**, excluding comments; both tails have the following identical order. All runner line pairs below mean `phase01-config/godWorldEngine2.js` **inline / extracted**.

The table enumerates **top-level `ctx.summary` keys read**, including conditional fallbacks and called helpers; object/array keys mean the whole relevant payload, not merely its presence. Output-only assignments are excluded. Two shared additions keep the table readable:

- **T** = `cycleRef`, `absoluteCycle`, `cycle`, read by `inWorldStamp_` at `phase01-config/advanceSimulationCalendar.js:293`. It does **not** fall back to `cycleId`; a resume containing only `cycleId` produces `C?` when this helper is used (verified in the local probe).
- Every `safePhaseCall_` also reads/appends `phaseTimings` (`godWorldEngine2.js:178`). Its error path reads/updates `auditIssues`, `engineErrorCount`, and reads `cycleId` (`:78`, `:112`, `:159`). Preserve these for every table row, including rows with no domain-summary input.

| # | Phase suffix / runner lines | Summary inputs, including transitive helper inputs | Implementation evidence |
|---|---|---|---|
| 1 | Phase10-WriteDigest, 772 / 2441 | `cycleId`, `intakeProcessed`, `citizensUpdated`, `eventsGenerated`, `auditIssues`, `cycleWeight`, `cycleWeightReason`, `civicLoad`, `migrationDrift`, `patternFlag`, `shockFlag`, `storySeeds`, `eveningMedia`, `famousPeople`, `eveningFood`, `cityEvents`, `nightlife`, `eveningSports`, `streamingTrend`, `worldEvents`, `weather`, `cityDynamics`; T | `phase01-config/godWorldEngine2.js:1858` through `:1961` |
| 2 | Phase10-CycleWeather, 773 / 2442 | `weather`, `weatherSummary`, `weatherTracking`, `absoluteCycle`, `cycleId`; T | `phase10-persistence/recordCycleWeather.js:44` |
| 3 | Phase10-RecordEvents25, 774 / 2443 | `worldEvents`, `cycleId`, `season`, `holiday`, `weather`, `cityDynamics`, `civicLoad`, `shockFlag`, `patternFlag`, `migrationDrift`, `storySeeds`, `nightlifeVolume`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `month` | `phase10-persistence/recordWorldEventsv25.js:31`; also reads `ctx.now` at `:45` |
| 4 | Phase10-RecordEventsV3, 775 / 2444 | `worldEvents`, `cycleId`, `canonHoods`; T | `phase10-persistence/recordWorldEventsv3.js:71`; `phase01-config/canonNeighborhoodLoader.js:410`; also consumes RNG |
| 5 | Phase10-ChaosNbhdResolve, 780 / 2448 | `chaosNeighborhoodFold` (fresh input, replaced by merged output), `cycleId` | `phase04-events/chaosCarsEngine.js:592`, `:607`; also reads persisted prior residual |
| 6 | Phase10-NeighborhoodMap, 781 / 2449 | `cycleId`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `cityDynamics`, `weather`, `worldEvents`, `storySeeds`, `storyHooks`, `eventArcs`, `v3Arcs`, `neighborhoodMigration`, `migrationDrift`, `sportsWeek`, `crimeMetrics`, `neighborhoodDynamics`, `neighborhoodPulse`, `chaosNeighborhoodFold`, `neighborhoodState`, `hoodEmployerDepth`, `sportsZones`, `hoodBusinessMomentum`, `shockFlag`; T | `phase08-v3-chicago/v3NeighborhoodWriter.js:309`; helpers `:180`, `:198`, `:212`, `:221`, `:248`, `:255`, `:743`; also consumes RNG |
| 7 | Phase10-Bonds, 785 / 2453 | `relationshipBonds`, `relationshipBondsLoaded`, `cycleId` | `phase05-citizens/bondPersistence.js:263`; normalization also reads `ctx.ledger` at `:241` |
| 8 | Phase10-BondLedger, 786 / 2454 | `relationshipBonds`, `relationshipBondsLoaded`, `cycleId`; T | `phase05-citizens/bondEngine.js:2745`; also reads `ctx.bondCalendarContext` at `:2791` |
| 9 | Phase10-Domains, 787 / 2455 | `cycleId`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `domainPresence`, `dominantDomain`; fallback also `worldEvents`, `storySeeds`, `storyHooks`, `eventArcs`, `weather`, `sportsCity`, `cityDynamics`; T | `phase08-v3-chicago/v3DomainWriter.js:73`, fallback `:194` through `:289` |
| 10 | Phase10-Seeds, 788 / 2456 | `contractSeeds`, `cycleId`; T | `phase10-persistence/saveV3Seeds.js:91` |
| 11 | Phase10-Hooks, 789 / 2457 | `storyHooks`, `cycleId`; T | `phase08-v3-chicago/v3StoryHookWriter.js:50` |
| 12 | Phase10-Textures, 790 / 2458 | `textureTriggers`, `cycleId`; T | `phase08-v3-chicago/v3TextureWriter.js:30` |
| 13 | Phase10-CyclePacket, 792 / 2459 | Full packet-input list immediately below; T | `phase10-persistence/buildCyclePacket.js:42`, `:812`, `:857`, `:1287` |
| 14 | Phase10-CareJusticeCensus, 794 / 2461 | `absoluteCycle`, `cycleId`, `careJusticeDemand`, `careJusticeWriteStatus`, `hospitalEvents`, `judicialEvents` | `phase10-persistence/buildCyclePacket.js:1105`, `:1192` |
| 15 | Phase10-MediaLedger, 802 / 2467 | `mediaIntake`, `cycleId`, `storyHooks`, `storySeeds`, `domainPresence`, `textureTriggers`, `cityDynamics`, `worldEvents`, `nightlifeVolume`, `economicMood`, `weather`, `weatherMood`, `mediaEffects`, `eventArcs`, `cycleWeight`, `cycleWeightReason`, `civicLoad`, `shockFlag`, `patternFlag`; T | `phase10-persistence/recordMediaLedger.js:21`, `:103` through `:166` |
| 16 | Phase10-CycleSeed, 805 / 2468 | `cycleId`, `weather`, `holiday`, `worldEvents`, `worldPopulation`, `storySeeds`, `relationshipBonds`; T | `utilities/cycleModes.js:228`, checksum helper `:319`; also reads `ctx.cycleSeed` |
| 17 | Phase10-EveningSnapshot, 808 / 2471 | `eveningSnapshot` | `phase09-digest/finalizeCycleState.js:408` |
| 18 | Phase10-CycleState, 810 / 2473 | `previousCycleState`, `neighborhoodEconomies`, `cycleId`, `cycle`, `worldEvents`, `crimeSpikes`, `crimeEvents`, `crimeMetrics`, `eventsGenerated`, `storySeeds`, `mediaCoverage`, `mediaCount`, `editionSentimentBoost`, `mediaEffects`, `activityObservations`, `relocationNetFlow`, `franchiseWeightCarry`, `sportsWeek`, `sportsWeekReach`, `previousCityDynamics` | `phase09-digest/finalizeCycleState.js:488`; helpers `:438`, `:457`, `:610`; `utilities/sportsWeekRecord.js:248` |
| 19 | Phase10-PopIdHighWater, 812 / 2475 | No domain-summary input | `utilities/popIdAllocator.js:78`; reads `ctx._popIdAlloc`, config, cache |
| 20 | Phase10-CommitLedger, 813 / 2476 | No domain-summary input | `phase10-persistence/commitSimulationLedger.js:25`; requires `ctx.ledger.dirty`, `.sheet`, `.rows` |
| 21 | Phase10-ExecuteIntents, 815 / 2478 | T when normalizing LifeHistory timestamps | `phase10-persistence/persistenceExecutor.js:40`, `:430`; requires all three `ctx.persist` queues and correct `ctx.mode` |
| 22 | Phase11-MediaIntake, 824 / 2485 | `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `sportsSeason`, `simMonth`, `month`, `simYear` | `phase07-evening-media/mediaRoomIntake.js:79`, calendar helper `:179`; writes `intakeProcessed`; reads `ctx.config.cycleCount` and `ctx.ledger` (`:391`) |
| 23 | Phase11-BusinessArchive, 825 / 2486 | `businessClosures`, `cycleId` | `phase05-citizens/applyBusinessDynamics.js:734`; also reads `ctx.ledger.headers/rows` to refuse archiving employers with active tracked employees (`:745`) |
| 24 | Phase11-CitizenArchive, 826 / 2487 | `cycleId`, `simYear`; helper fallback also `absoluteCycle` | `utilities/archiveCitizenExits.js:177`, `:213`; `phase01-config/advanceSimulationCalendar.js:345`; also config, allocator and cache |
| 25 | Phase11-MaintainLifeHistoryLog, 831 / 2491 | `cycleId`; T | `utilities/archiveLifeHistory.js:76`, `:94`; trim itself scans Sheets |

**CyclePacket input expansion:** `weather`, `cityDynamics`, `worldPopulation`, `eventArcs`, `worldEvents`, `textureTriggers`, `domainPresence`, `season`, `holiday`, `holidayPriority`, `isFirstFriday`, `isCreationDay`, `cycleOfYear`, `godWorldYear`, `absoluteCycle`, `cycleId`, `cycleRef`, `cycleInMonth`, `holidayLabel`, `holidayNeighborhood`, `creationDayAnniversary`, `civicLoad`, `cycleWeight`, `cycleWeightReason`, `migrationDrift`, `patternFlag`, `shockFlag`, `demographicDrift`, `hospitalTalkback`, `dominantDomain`, `namedSpotlights`, `bondSummary`, `generationalSummary`, `generationalEvents`, `economicSummary`, `mediaSummary`, `weatherSummary`, `nightlife`, `eveningFood`, `crowdMap`, `crowdHotspots`, `eveningSafety`, `eveningTraffic`, `crimeMetrics`, `transitMetrics`, `civicLoadScore`, `civicLoadFactors`, `storyHooks`, `neighborhoodDynamics`, `shockReasons`, `shockScore`, `shockDuration`, `migrationBrief`, `neighborhoodMigration`, `neighborhoodEconomies`, `compressedLine`, `cycleSummary`, `demographicShifts`, `cityEventDetails`, plus `hospitalEvents` and `judicialEvents` in the called ledger writers. Evidence: `buildCyclePacket.js:52`, `:94`, `:165`, `:317`, `:440`, `:567`, `:633`, `:691`, `:739`, `:858`, `:1287` (all under `phase10-persistence/`). `careJusticeWriteStatus`, `hospitalCensus`, `judicialCensus`, and `cyclePacket` are outputs of this phase (`:82`, `:1085`, `:1362`, `:800`); the census phase then reads the write status.

**After the table, inline:** The catch logs a fatal error and rethrows (`godWorldEngine2.js:833`). The `finally` flushes **all** cached writes, records partial failures on `fire.commitProblem`, and verifies/repairs cycleCount (`:837`, `:841`, `:848`, `:854`, `:858`). It then reads `S.engineErrorCount`, `S.auditIssues`, `S.phaseTimings`, `S.cycleId`, and `ctx.rng.draws` for diagnostics (`:865`, `:867`, `:872`; emitter `:193`). The outer wrapper always flushes SpreadsheetApp, closes the admission, releases the lock, and surfaces close problems (`:425` through `:436`). Close reads `fire.ctx.summary.cycleId`, the raw sheet counter, and `fire.commitProblem` (`:375`). These are part of the tail, even though they are not timed phases.

**After the table, extracted:** Cache flush and partial-error logging occur at `:2494` through `:2509`; there is no counter repair, admission close, or timing emission here. The dry-run wrapper computes/logs an intent summary (`:2038`); the replay wrapper computes/logs a comparison and returns it (`:2149`). Neither is the production close path. Calling the full extracted runner for resume would replay its prefix too.

**Consequences of the proposed minimal ctx:** Current engine.94 guards require `relationshipBondsLoaded === true` in **both** master and history writers (`bondPersistence.js:271`; `bondEngine.js:2752`). Preserving bonds without that flag holds both saves. Omitting the dirty ledger loses civic turnovers and other citizen changes. Omitting the ledger from BusinessArchive bypasses the tracked-employee protection; omitting calendar context from MediaIntake silently changes recorded metadata. Re-loading `config.cycleCount` from the pre-commit sheet yields N−1, while numerous tail readers prefer it over `S.cycleId`; resume must restore the post-AdvanceTime config value N (`godWorldEngine2.js:941`).

**Required design change:** Specify either a complete, versioned Phase-9 context checkpoint that executes/reconciles all these producers, or refactor producers into a prepared-output stage before an intent-only checkpoint. Moving the gate later alone does not solve direct producer writes or their replay. Preserve RNG continuation, not merely the seed: RecordEventsV3 and NeighborhoodMap call `safeRand_`, whose config fallback restarts the stream (`utilities/safeRand.js:28`). Cache queues are private closures (`utilities/sheetCache.js:39`) with no export/import API (`:330`); JSON-stringifying the cache returns `{}` even with queued writes (local probe). Specify typed serialization for Dates (including `lastRun`), arrays and values, plus cache queue export/import. Saving only queued cache cells is not a generic snapshot of the cache API's row/append queues.

### 3. BLOCK — No late-save branch, and publishing pending before payload completion makes recovery ambiguous.

The formula at plan `:147` never uses `checkpointSaveMs`. Let E=elapsed, B=330000, T=60000, C=measured complete checkpoint cost. With an illustrative C=20000, E=325000 fails the tail test but also leaves less than C within B. The written design still starts saving. The last Phase-9 phase can itself cross B−C before this single gate executes.

**Required branches:** (a) continue only if E+T fits B, with T covering the complete remaining work; (b) otherwise checkpoint only if E+C fits B; (c) if neither fits, take an explicit over-budget stop/recovery path, preserve the admitted Cycle as incomplete, and alarm. Prevent reaching (c) where possible by checking earlier boundaries against the next indivisible phase's cost plus C. Do not describe this as a clean rollback: prior phases already wrote (Finding 7). Checkpoint cost must include serialization, all chunks, flush/readback, manifest publication, record update, and trigger setup/recovery overhead. Validate the three config values and measure before enabling the guard; the unmeasured placeholder is not the approved bench result.

**Save ordering at plan `:148` is unsafe:** Write pending manifest → write chunks → move fire record allows a kill after pending but before all chunks, including mixing old trailing rows with a new shorter payload. A parsed fragment or an existing chunk set does not prove completeness. There is no chunk count, length, payload digest, generation, build/schema version, or workbook identity in the proposed manifest.

**Required ordering/contract:**

1. Reserve a new generation in a non-resumable `writing` state without overwriting the last usable generation. Bind it to the admission identity/Cycle, spreadsheet, serializer/schema and compatible engine build.
2. Write all payload chunks with generation/index and declared total size/count; flush and verify the assembled typed payload and digest. Incomplete staging must be distinguishable from no checkpoint and from a resumable checkpoint.
3. Publish the resumable manifest/pointer **last**, then reconcile the fire record to `checkpointed` and establish its resume trigger. Define recovery for a kill between each of those operations: the verified manifest must remain usable even if the property update or trigger creation did not land. A trigger that sees only `writing` must not execute it.
4. Keep the payload until the executor, required direct tail operations, cache flush, counter readback, timing/result persistence, and terminal fire record are durably reconciled. Cleanup is last and retryable. A journal marked committed but not yet closed must be a recoverable state, not permission to start another Cycle.

The normal path has the same problem: plan `:152` writes a journal every fire but saves a payload only on the checkpoint branch. A normal fire killed during commit therefore has a pending marker and **no immutable outputs to replay**. Recomputing the Cycle from altered Sheets is not equivalent (Finding 7). Specify the normal-fire recovery payload or another durable per-operation protocol and include its cost in T.

The fallback at plan `:151` conflicts internally: checkpoint failure means “run the tail anyway,” yet guard failure means “clean-stop + alarm.” Near the budget, the former deliberately enters the tail that the gate just judged unsafe; a partly saved pending record can then coexist with a completed tail. Select a single, explicit failure-state policy and cover both inner and outer `finally` paths. The approved numbers do not resolve that policy.

### 4. BLOCK — The executor accepts 25 current append targets; there is no universal Cycle/Hash schema.

`phase10-persistence/persistenceExecutor.js:128`, `:149`, `:326`, and `:403` group arbitrary `intent.tab` values and merge single-row and batch append intents into one batch per sheet. It has no hard-coded append-target list. The table below inventories all resolved target names from current non-test engine/utility append producers, including retained callable helpers; it does not claim each runs on every Cycle. No production caller of `queueLogIntent_` was found, but its generic tab argument remains an extension point (`utilities/writeIntents.js:265`). Direct writes are outside this inventory.

Column letters are the checked-in schema layout. “Alternate” means the proposed literal `Cycle` lookup is insufficient; it does not automatically authorize using that field as a replay key.

| Append target | Cycle column in repository contract? | Producer evidence; schema evidence |
|---|---|---|
| `Generic_Citizens` | **Alternate:** H `EmergedCycle`, written as `Cycle N`; no `Cycle` | `phase01-config/godWorldEngine2.js:1643`, `:1647`; `phase05-citizens/updateCivicApprovalRatings.js:1780`, `:1784`; `schemas/SCHEMA_HEADERS.md:827` |
| `Riley_Digest` | Yes, B `Cycle` | `phase01-config/godWorldEngine2.js:1961`; schema `:1316` |
| `City_Treasury` | Yes, A `Cycle` | `phase02-world-state/applyInitiativeImplementationEffects.js:818`, `:1145`; schema `:315` |
| `Event_Arc_Ledger` | Yes, B `Cycle` | `phase03-population/generateCrisisBuckets.js:415`, `:438`, `:512`; schema `:682` |
| `LifeHistory_Log` | Yes, G `Cycle` | e.g. `phase05-citizens/runCareerEngine.js:1808`; schema `:1042` |
| `Undocked_Draw` | **Alternate:** B `DrawCycle` is N; A `TargetCycle` is the future target | `phase05-citizens/casinoLedgerEngine.js:61`, `:531`; schema `:1595` |
| `Casino_Ledger` | **Alternate:** B `CyclePlaced`, C `CycleSettled`; **house-row append has neither populated** | `phase05-citizens/casinoLedgerEngine.js:71`, `:863`, `:979`, `:993`; schema `:196` |
| `Initiative_Tracker` | **Alternate:** AE `ProposedCycle`; several other cycle fields have different meanings | retained `createInitiative_` at `phase05-citizens/civicInitiativeEngine.js:3072`, `:3100`, `:3106`; schema `:934` |
| `Content_Telemetry` | Yes, A `Cycle`; E `ContentHash` is not a generic persistence row hash | `phase05-citizens/generateCitizensEvents.js:3485`; schema `:405` |
| `Business_Ledger` | **No Cycle field** in the nine-column append | `phase05-citizens/generationalWealthEngine.js:3056`; schema `:131` |
| `Cultural_Ledger` | **Alternate:** I `FirstSeenCycle`, J mutable `LastSeenCycle`; no `Cycle` | `phase07-evening-media/culturalLedger.js:533`, `:569`; `phase05-citizens/generationalWealthEngine.js:3181`; schema `:446` |
| `Domain_Tracker` | Yes, B `Cycle` | `phase08-v3-chicago/v3DomainWriter.js:156`; schema `:544` |
| `Story_Hook_Deck` | Yes, B `Cycle` | `phase08-v3-chicago/v3StoryHookWriter.js:91`; schema `:1458` |
| `Texture_Trigger_Log` | Yes, B `Cycle` | `phase08-v3-chicago/v3TextureWriter.js:82`; schema `:1554` |
| `Cycle_Weather` | **Alternate:** A `CycleID` | `phase10-persistence/recordCycleWeather.js:105`; schema `:507` |
| `Media_Ledger` | Yes, B `Cycle` | `phase10-persistence/recordMediaLedger.js:177`; schema `:1076` |
| `WorldEvents_Ledger` | Yes, B `Cycle` | `phase10-persistence/recordWorldEventsv25.js:101`; schema `:1735` |
| `WorldEvents_V3_Ledger` | Yes, B `Cycle` | `phase10-persistence/recordWorldEventsv3.js:279`; schema `:1767` |
| `Chaos_Cars` | **Alternate:** A `CycleId` | `phase10-persistence/saveChaosCars.js:15`, `:52`; schema `:221` |
| `Story_Seed_Deck` | Yes, A `Cycle` | `phase10-persistence/saveV3Seeds.js:136`; schema `:1482` |
| `Cycle_Seeds` | **Alternate:** A `CycleID` | `utilities/cycleModes.js:243`, `:258`; schema `:489` |
| `Crime_Metrics` | **Alternate:** G `LastUpdated` stores Cycle; this is mutable current state | `utilities/ensureCrimeMetrics.js:374`, `:383`, `:492`, `:558`; schema `:423` |
| `Faith_Ledger` | Yes, B `Cycle` | `utilities/ensureFaithLedger.js:20`, `:541`, `:579`; schema `:764` |
| `Transit_Metrics` | Yes, B `Cycle` | `utilities/ensureTransitMetrics.js:15`, `:434`, `:472`; schema `:1576` |
| `Ripple_Ledger` | Yes, A `Cycle` | `utilities/rippleLedger.js:17`, `:74`; schema `:1354` |

All abbreviated “schema” references in this table are to `schemas/SCHEMA_HEADERS.md`. `Event_Arc_Ledger` remains an append target through Phase3-CrisisBuckets (`godWorldEngine2.js:551` / `:2228`), despite the disabled old Phase10-Arcs comment. **Election_Log is no longer an append target**: both election phase calls and their writer are gone. The packet retains a historical reader (`phase10-persistence/buildCyclePacket.js:1372`, `:1422`); that does not restore an append producer.

None of these contracts supplies a uniform persistence `Hash` column. Adding `(cycle,rowHash)` properties to an intent does not write either property to the Sheet: the executor emits only `intent.values` (`persistenceExecutor.js:405`, `:441`). Engine_Errors explicitly writes its hash as column J (`godWorldEngine2.js:114`, `:126`); its hash input is a diagnostic identity, not canonical row content. `computeShortHash_` can return an empty string on failure (`:150`), which cannot be accepted as a replay identity.

**Required design change:** Define a per-tab immutable append identity/cycle mapping, including the house row and Business_Ledger, or use a durable journal of operation IDs, target ranges, and exact payloads. If target schemas gain columns, update positional writers/readers and schema contracts together. If recovery hashes existing values instead, define typed canonicalization and multiplicity. Identical legitimate rows must not collapse into one event; a set of content hashes alone cannot distinguish retry copies from intentional repeated rows. Hash the actual persisted form, including padding and LifeHistory timestamp normalization (`persistenceExecutor.js:421`, `:430`), and fail on missing/invalid recovery schema rather than skipping dedup.

**Normal-fire read cost:** Zero **additional dedup reads of append targets** is achievable: decide normal/recovery mode from the admission/journal, and scan target identities only on recovery. It is not implemented, and a scheme that unconditionally loads target hashes every fire is not zero-read-cost. Normal execution already calls `getSheetByName` and `getLastRow`; admission/journal inspection, checkpoint verification, and journal writes also have cost. Distinguish those from incremental target-dedup reads. Ambiguous transient retries on an otherwise normal fire still require a safe fixed-range retry or recovery reconciliation (Finding 7).

### 5. BLOCK — A checkpoint return currently flushes the Cycle, overwrites its fire state, and cannot preserve the 131-phase result.

`admitCycleFire_` is defined in **`phase01-config/godWorldEngine2.js:277`**, not `utilities/webTrigger.js`; web delegates to it through the common wrapper. Adding `checkpointed` to `FIRE_STATES` (`:236`) is insufficient: shape validation allows missing `finishedMs` **only** for `running` (`:300`). Close unconditionally builds a fresh terminal record (`:404`), discarding added checkpoint metadata.

Returning after a checkpoint still executes the inner `finally` (`:837`) and outer `finally` (`:425`). The former flushes cycleCount/lastRun/World_Population and can directly repair cycleCount; the latter can overwrite `checkpointed` with `done` or another terminal state. A skipped cache flush alone is insufficient because `verifyCycleCountPersisted_` explicitly repairs N−1→N (`:978`, `:990`, `:1021`). Give checkpoint exit an explicit outcome honored by both finalizers: preserve the incomplete admission, avoid ordinary world-write flush/repair/close, persist only the intended checkpoint state, and release the lock.

The resume check `journal.cycle === cycleCount + 1` (plan `:149`) strands a legitimate crash window: the cache flush has landed N, but journal commit/close has not. Conversely, counter=N does not prove all other writes succeeded. Reconcile authenticated journal/admission identity, per-stage receipts and a counter of **either N−1 or N**, with a separate close-only path when the work is already committed; reject unrelated counters/generations. Block new admission for every unresolved stage, even after the counter has reached N. Do not call normal admission to “resume”: that would request N+1 or reject N as already admitted (`godWorldEngine2.js:279`, `:310`).

**Carry across the split:** original Cycle and `startedMs`; stable admission/checkpoint generation; original pre-Cycle counter/expect; engine/schema version; saved config/seed/RNG continuation; named phase progress; full completed `{phase,ms,ok}` timing entries; accumulated error/commit status; and recovery-attempt/segment timings. Keep large timing data in the checkpoint/result store with a fire-record pointer rather than assuming it fits one property. Budget a resume from its own execution start, while keeping the original start for identity/guard history and end-to-end latency.

At the Phase-9 boundary the current schedule has **106 phase entries completed and 25 remaining**. Preserve the 106 entries, add the actual remaining results, and retain one logical result per scheduled phase; record retry attempts separately. `emitPhaseTimings_` uses `timings.length`, sums `ms`, preserves `ok`, and publishes the array (`godWorldEngine2.js:193`). Reporting five resumed phases, duplicating retried phases, or inventing zero-time rows would break the current **131-phase** read convention. Keep checkpoint/save/wait/resume overhead separate from the logical phase sum, and distinguish original elapsed time, segment runtime and end-to-end runtime.

The web handler currently turns any successful return into `out.ok=true` and reports only this execution's `ranMs` and in-memory global diagnostics (`utilities/webTrigger.js:43` through `:56`). A time trigger has no channel back into that completed HTTP response. Define a checkpointed/pending response and a durable final-result read keyed to the same admission; publish the merged timing/result only after verified completion. Persist the other diagnostic objects or explicitly describe their split semantics as well. Menu and web must use the same checkpoint outcome contract.

### 6. FIX — The trigger API supports this shape; existing source does not prove authorization, delivery, or retry coverage.

The cited line is accurate: `phase10-persistence/cycleExportAutomation.js:466` calls `ScriptApp.newTrigger`. Its function is an **operator setup** (`:456`) creating a **recurring six-hour export trigger** (`:468`), not a running one-shot checkpoint/resume implementation. `appsscript.json:1` has no explicit `oauthScopes` list; the web app executes as the deploying user (`:21`). Source presence does not prove the effective menu user/deployer has granted the trigger scope in the particular project.

Google documents `https://www.googleapis.com/auth/script.scriptapp` for `newTrigger`, and installable triggers run as their creator. Verify consent for the account that creates the resume trigger; menu users and the web deployer need not be the same account. [ScriptApp authorization](https://developers.google.com/apps-script/reference/script/script-app#newTrigger(String)), [installable trigger account rules](https://developers.google.com/apps-script/guides/triggers/installable).

**Yes, a one-shot time trigger can call a top-level `resumeWorldCycle` that acquires the same script lock.** `getScriptLock()` must be followed by `tryLock`/`waitLock`; it protects cooperating executions in the same script project. The first execution must release its lock before the second can acquire it. `after(60000)` is a minimum delay, not an exact delivery time. [LockService](https://developers.google.com/apps-script/reference/lock/lock-service#getScriptLock()), [ClockTriggerBuilder.after](https://developers.google.com/apps-script/reference/script/clock-trigger-builder#after(Integer)). This is API/source feasibility, not proof of an installed or authorized trigger.

**Required design change:** Under that lock, resume the matching durable generation without fresh Cycle admission. Fence duplicate/stale callbacks; preserve trigger ID/ownership and delete only the intended resume trigger. Define recovery for create failure, a kill after create but before storing its ID, lock contention, and a killed resume. A one-shot that has fired is not a retry schedule: the design's “next resume” at plan `:149` needs an explicit re-arm/watchdog/reconciliation mechanism. A hand fire that is simply refused by the pending gate is not automatic recovery. Do not rely on triggers created by one account being manageable from another account's trigger inventory.

### 7. BLOCK — Task 5's “only append is unsafe” and “blind full-cycle rerun converges” premises are false.

These are structural failures of the recovery premise at plan `:120`, `:124`, `:130`, and `:143`, not merely stale line numbers:

| Assumption | Counterexample at current HEAD | Consequence / required correction |
|---|---|---|
| Phases 1–9 write nothing | Phase3-Demographics runs at `godWorldEngine2.js:549` / `:2226`; `phase03-population/applyDemographicDrift.js:387` directly writes World_Population illness/employment/economy. Phase5 casino also directly writes household values (`phase05-citizens/casinoLedgerEngine.js:873`). These classes are documented in `SHEETS_MANIFEST.md:134`, `:146`. | A pre-Phase-10 kill has already changed the world. Same seed plus changed input state is not the same intent stream. Do not authorize a blind full-cycle rerun as a clean retry. |
| Ensure is kill-safe because tab exists | `persistenceExecutor.js:254` inserts the tab, then `:256` writes its header. A kill between them leaves an existing empty tab. The next ensure returns success without enforcing headers (`:245`). | Resume must validate/complete partially created schema, or ensure must use an explicitly recoverable provisioning contract. |
| Thrown setValues proves nothing landed | Executor recalculates append tail **inside** retry (`persistenceExecutor.js:439`), while `appendRowWithRetry_` explicitly fixes the address to handle timed-out-but-landed appends (`:217`, `:224`). | The repository itself contradicts the audit's all-or-throw inference. A fault-injection probe that lands a row then throws a transient timeout yielded two rows and zero executor errors. This models a lost acknowledgement; it is not evidence that a real timeout occurred today. Fix transient retry placement as well as cross-execution dedup. |
| Full Phase-10 replay is only intents | ChaosNbhdResolve loads/decays/adds/persists and explicitly documents non-idempotence (`phase04-events/chaosCarsEngine.js:572`, `:607`, `:642`). BondLedger directly appends (`phase05-citizens/bondEngine.js:2834`). CyclePacket directly persists care ledgers (`phase10-persistence/buildCyclePacket.js:83`), and CycleState writes several property/sheet carriers (`phase09-digest/finalizeCycleState.js:504`). | Saving/replaying only executor intents misses these outputs. Re-running all producers can duplicate history or advance residual state twice. Give direct operations saved outputs/identities and reconciliation. |
| Fixed-address range replay is always safe | CommitLedger saves all citizen rows at row 2 (`commitSimulationLedger.js:28`); Phase11-CitizenArchive subsequently deletes source rows (`utilities/archiveCitizenExits.js:236`). Replaying that saved range after an archive reintroduces archived rows. Existing archive keys then cause those restored rows to be skipped (`:205`). | A single whole-tail pending bit cannot permit replay of earlier range writes after later structural mutations. Track durable stage progress and reconcile copy/remove operations; never rewind a completed ledger commit over archive work. |
| Phase 11 is idempotent except archive appends | MediaIntake marks article/usage rows processed **before** writing downstream mentions/usages (`phase07-evening-media/mediaRoomIntake.js:241`, `:250`, `:301`, `:336`). Routing appends then marks Routed (`:446`, `:484`). | A kill can lose a downstream output in the first ordering or duplicate an intake in the second. Neither is protected by executor dedup. Give intake rows/output effects stable identities and resumable receipts. |
| The archive exception is only duplicate appends | BusinessArchive copies then deletes without an existing-copy identity check (`applyBusinessDynamics.js:779`, `:783`). CitizenArchive's existing-copy check skips the later source removal on a copy-before-delete crash (`archiveCitizenExits.js:205`). LifeHistory trim appends an archive, clears the source, then rewrites retained rows (`utilities/archiveLifeHistory.js:207`, `:216`, `:221`). | Business/history can duplicate; citizen removal can stall; a kill after the LifeHistory clear can lose retained rows permanently because only old rows were archived. A Phase-11 progress bit alone does not repair intra-phase loss. Persist a resumable operation plan/backup and reconcile each substep. |

Cell and range intents can be reapplied at the same address with the same typed values **under stable row layout and unchanged intended output**. Replace can heal a clear-before-write interruption **if the complete original payload survives**. Those narrower properties do not establish the plan's full-cycle convergence claim. The early direct-write and Phase-11 cases must be included in the stated recovery boundary, or explicitly excluded with a supported recovery path before build approval.

### 8. BLOCK — “After Phase 10 succeeds” has no usable success signal in the proposed caller.

The audit accurately observes isolated errors, but misses their implication. `executePersistIntents_` collects failures into `stats.errors` (`phase10-persistence/persistenceExecutor.js:141`, `:159`), stores stats at `:174`, then **clears every queue even when errors exist** (`:177`). `safePhaseCall_` considers a returned error-containing stats object a non-throwing phase (`phase01-config/godWorldEngine2.js:159`). The runner ignores the executor's return value (`:815`), continues to archives, and only sets `fire.commitProblem` for cache-flush faults (`:848`, `:854`).

A local missing-tab probe returned one executor error with zero queued updates retained. Therefore, “call executor; mark committed; close done” can permanently certify a partial commit. A successful cycleCount readback proves only the counter. Several direct tail helpers also swallow/log their own failures, for example `savePreviousCycleState_` at `phase09-digest/finalizeCycleState.js:548` and chaos persistence at `phase04-events/chaosCarsEngine.js:604`.

**Required design change:** Define required stage results explicitly. Do not publish committed/done or start destructive archive steps while required persistence is failed/unverified. Preserve the immutable recovery payload independently of cleared runtime queues; propagate unresolved failures through the fire record and diagnostics. Distinguish existing tolerated simulation-phase errors from failed commit/recovery operations. `SpreadsheetApp.flush()` and phaseCount alone are not a commit receipt.

### 9. FIX — The timing evidence omits producers/close costs, and the proposed bench procedure does not inject the claimed interruption.

The four named files at plan `:141` exist and support its approximate **individual** timings, but not its “Phase 10 + 11 ≈45–50s” total. Reading each file's actual timing array gives:

| Bench Cycle / source (`output/engine-sheet/`) | `ranMs` | Executor + four Phase-11 functions | **All recorded Phase-10/11 phases** | `ranMs − timing.totalMs` (all untimed work, not necessarily all tail) |
|---|---:|---:|---:|---:|
| C112 / `2026-09-20-bench-c112-fire.json:1` | 140477 | 49378 | **55476** | 4510 |
| C113 / `2026-09-20-bench-c113-fire.json:1` | 133149 | 47788 | **51771** | 4602 |
| C114 / `2026-09-20-bench-c114-fire.json:1` | 138827 | 44702 | **49752** | 3979 |
| C115 / `2026-09-20-bench-c115-fire.json:1` | 136888 | 44095 | **50915** | 7200 |

Those are historical **132-phase** runs containing Elections and predating the current care-census phase. Their full recorded tails alone are 49.752–55.476s. They neither measure current complete-tail p95 nor checkpointSaveMs; four fires do not establish a robust tail bound. The additional 168s/177s and daytime timeout claims at plan `:141` have no exact evidence file linked there and were not independently established by the four named files. Do not treat them as current measured tail/checkpoint cost. The approved 60000 remains the configured value to prove, not a value this review changes.

Budget elapsed is proposed from admission time; production acquires the lock and opens the spreadsheet before creating that timestamp (`godWorldEngine2.js:414`, `:419`, `:420`). Record total execution elapsed as well, so setup and close costs are not silently omitted from headroom.

At plan `:154`, setting `wallBudgetMs=1` forces the current two-way branch but violates a correct save-affordability guard. Use an explicit bench force-checkpoint seam with sufficient save time. Tuning a pre-Phase-10 threshold “inside the commit” cannot kill an executor already running: the threshold is not checked there. Use controlled interruption points and a real platform termination test where authorized.

**Required bench acceptance:** identical restored baseline Sheets **and** properties/caches/intake state; identical seed plus RNG continuation; normal versus resumed typed values and row multiplicity; interruption during chunk staging, after ready publication, during trigger/record handoff, after each persistence class, during direct producer writes, each archive copy/delete/clear boundary, cache flush, and counter/journal/close boundaries. Include failed writes returned as stats, missing headers, stale/duplicate callbacks, and killed one-shot recovery. Check current 131 logical phases and durable final diagnostics. Same seed on already-mutated Sheets, string-only comparisons, or replay mode (executor suppresses writes at `persistenceExecutor.js:66`) do not prove this behavior.

### 10. NOTE — Explicit citation/status reconciliation against current HEAD.

This accounts for the literal file:line claims in the Task 5 audit and Task 4 design; substantive dispositions are above.

| Plan claim/location | Current source / verdict |
|---|---|
| Task 5 read a 528-line executor (`:116`) | Current executor has 557 lines. Historical observation, not current size. |
| Ensure `:222–227` (`:124`) | Now `persistenceExecutor.js:237`, existing-tab branch `:245`; claim is incomplete for interrupted header creation. |
| Replace clear/write `:283–285`, comment `:266` (`:125`) | Now clear `:306`, write `:308`, retry comment `:288`. Two remote operations, not a transaction. |
| Cell `:347` (`:126`) | Current write `persistenceExecutor.js:370`. Conditional fixed-value replay property confirmed. |
| Range `:366` (`:127`) | Current write `:389`. Fixed address confirmed; lost acknowledgements/changed row layout invalidate the broader assurance. |
| Append `:410–412`, comment `:407–409` (`:128`) | Current tail allocation/write `:440–441`, comment `:436`; comment is an assumption contradicted by the nearby retry-safe helper at `:217`. `Election_Log` is stale as an active append example. |
| Retry `:188` (`:132`) | Function now starts `:195`; 0/2/5/12s and transient matching confirmed at `:196`, `:205`. A hard kill cannot be caught by it. |
| Hash `godWorldEngine2.js:109–110` (`:135`) | Current hash input/call `:114–115`, persisted hash `:126`, helper `:140`. A hash-writing precedent, not a generic dedup implementation. |
| `loadConfig_` / `advanceWorldTime_ :908–960` (`:148`) | LoadConfig starts `:883`; AdvanceTime `:908`; actual queued counter/date writes `:937–938`. Carrier claim confirmed; serialization/export is not built. |
| Trigger precedent `cycleExportAutomation.js:466` (`:149`) | Accurate line; recurring export setup, no evidence of granted consent for a resume creator. |
| `archiveClosedBusinesses_ :734` (`:149`) | Accurate line in `phase05-citizens/applyBusinessDynamics.js`; “only businessClosures is needed” is contradicted by its ledger employee check and the other tail inputs above. |
| Cache flush `godWorldEngine2.js:842` (`:149`) | Actual call `:841`; `:842` logs stats. Always runs in inline finally today. |
| `repairCycleCount_ :1030` (`:149`) | Function `:1016`, write/readback `:1021–1023`; `:1030` is message text. Repairs the counter stall only, not missing world writes. |
| “Waits on builder / three numbers and go” (`:61`, `:154`) | Superseded by the explicit go at `:156`. No renewed numeric approval is required; unresolved recovery design is the blocker. |

## Verification performed

- Read-only source trace through both dispatchers, all 25 remaining phases, shared summary helpers, both finalizers, admission/close, intent construction/execution, cache internals, direct writer carve-outs, append producers and checked-in schemas.
- Acorn AST inspection counted **131 scheduled calls per dispatcher** and **25 calls per tail**; recursive helper/member inspection was checked against source, with output-only assignments distinguished from reads.
- Four historical benchmark JSON timing arrays were recomputed locally; no bench was fired.
- In-memory Node VM probes loaded current `writeIntents.js`, `persistenceExecutor.js`, `sheetCache.js`, and `advanceSimulationCalendar.js`: proposed `writeIntents` ctx → 0 executions; `cycleId`-only timestamp → `C?`; missing tab → 1 error and 0 retained updates; landed-then-timeout mock → 2 rows from 1 append with 0 executor errors; cache with 1 queued write → JSON `{}`. All data/stubs were synthetic and process-local. These probes establish implementation behavior under injected conditions, not real Google service failure frequency.
- Official Google references were consulted only for trigger/authorization/locking semantics. No live consent, installation, callback, interruption, or Sheet schema was verified. No existing test suite can validate an unimplemented checkpoint protocol merely by remaining green.

## Disposition

For the reviewing Claude lane: resolve Findings 2–5, 7–8 in the owning design before implementation; incorporate Findings 1, 6 and 9 into the writer/trigger/bench contract; refresh the citations in Finding 10. Keep the builder-approved numbers. This is a design review with bounded corrections, not an engine implementation or deployment approval.

## Changelog

- 2026-10-08 (codex) — Reviewed engine.95 Tasks 4/5 at f9d0de9f; HOLD with six BLOCK, three FIX and one NOTE; enumerated both tails and 25 append targets. Code unchanged; no commits.

## Final HEAD check — 2026-10-08

HEAD advanced concurrently to `7f2b94ed` before completion. The complete `f9d0de9f..7f2b94ed` diff changes only `SESSION_CONTEXT.md`, `docs/engine/ROLLOUT_ARCHIVE.md`, and `docs/engine/ROLLOUT_PLAN.md`. The reviewed plan, code, hooks, manifest and schema sources are unchanged; all source findings and line references above therefore also apply to final HEAD `7f2b94ed`. The report passed `git diff --no-index --check`; no code or pre-existing dirty file was changed by this review.
