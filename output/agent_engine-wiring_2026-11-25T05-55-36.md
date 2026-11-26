Perfect. Now I have all the information I need. Let me compile the wiring card:

```
WIRING CARD — generateCitizensEvents_ (function)   map: 2026-11-24 / 179 files   

DEFINITION
  phase05-citizens/generateCitizensEvents.js:451  function generateCitizensEvents_(ctx)  v2.9 (engine.67 life-state gate)

PHASE POSITION
  production entry : Phase5-CitizenEvents @ godWorldEngine2.js:755  — BEFORE Phase10-ExecuteIntents (:967)
  cycle-phases     : Phase5-CitizenEvents @ godWorldEngine2.js:2476  — BEFORE Phase10-ExecuteIntents (:2666)

CALLERS (49)
  phase01-config/godWorldEngine2.js:755  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  phase01-config/godWorldEngine2.js:2476  safePhaseCall_(ctx, 'Phase5-CitizenEvents', function() { generateCitizensEvents_(ctx); });
  scripts/citizensEventsFame.t3.test.js:98  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:118  generateCitizensEvents_(ctx);
  scripts/citizensEventsFame.t3.test.js:138  generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:129  GEN.generateCitizensEvents_(ctx);
  scripts/codedPoolDownSide.test.js:200  GEN.generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:132  try { generateCitizensEvents_(ctx); } catch (e) { threw = true; }
  scripts/contentLedgerCompose.test.js:135  try { generateCitizensEvents_(ctx2); } catch (e) { threw = true; }
  scripts/contentLedgerCompose.test.js:144  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:165  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:182  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:209  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:236  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:263  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:291  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:330  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:351  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:380  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:433  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:515  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:529  generateCitizensEvents_(capped);
  scripts/contentLedgerCompose.test.js:640  generateCitizensEvents_(ctx);
  scripts/contentLedgerCompose.test.js:776  generateCitizensEvents_(ctxA);
  scripts/coverageReport.js:133  generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:61  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:88  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:104  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:112  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:118  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:134  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:147  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:167  GEN.generateCitizensEvents_(ctx);
  scripts/engine299Graded.test.js:197  GEN.generateCitizensEvents_(ctx);
  scripts/gameNightFans.test.js:76  generateCitizensEvents_(ctx);
  scripts/griefPeriod.test.js:246  GEN.generateCitizensEvents_(normal.ctx);
  scripts/griefPeriod.test.js:247  GEN.generateCitizensEvents_(grieving.ctx);
  scripts/griefPeriod.test.js:254  GEN.generateCitizensEvents_(certain.ctx);
  scripts/griefPeriod.test.js:266  GEN.generateCitizensEvents_(sample.ctx);
  scripts/griefPeriod.test.js:284  GEN.generateCitizensEvents_(none.ctx);
  scripts/griefPeriod.test.js:290  GEN.generateCitizensEvents_(createdCycle.ctx);
  scripts/griefPeriod.test.js:295  assert('F7 full generator fails before draws when config is incomplete', throws(() => GEN.generateCitizensEvents_(bad.ctx), /missing World_Config\.griefDurationCycles/));
  scripts/testNeighborhoodLoop.js:302  generateCitizensEvents_(ctx);        // Phase 5 — T6/T7/T9 pools live
  scripts/testNeighborhoodLoop.js:484  generateCitizensEvents_(ctx);
  scripts/testNeighborhoodLoop.js:591  generateCitizensEvents_(c7);
  scripts/testNeighborhoodLoop.js:683  generateCitizensEvents_(makeCtx(94 + cy, rows, ss));
  scripts/testNeighborhoodLoop.js:830  try { generateCitizensEvents_(ctx); } catch (e) { if (cy === 0) noSpotThrew = true; else throw e; }
  scripts/testNeighborhoodLoop.js:843  generateCitizensEvents_(ctx);
  scripts/unlivedEcho.test.js:97  try { generateCitizensEvents_(ctx); } catch (e) { threw = true; break; }
  scripts/unlivedEcho.test.js:140  generateCitizensEvents_(ctx);

S FIELDS
  WRITE cycleId                @ :515   readers: 46 functions across phases
  READ  season                 @ :677   writers: advanceSimulationCalendar_, v3preLoader_
  READ  weather                @ :678   writers: advanceSimulationCalendar_, applyWeatherModel_
  READ  worldEvents            @ :679   writers: generateCrisisBuckets_, generateCrisisSpikes_, worldEventsEngine_, chaosCarsEngine_, faithEventsEngine_, applyBusinessDynamics_
  READ  cityDynamics           @ :680   writers: applyCityDynamics_, applyActiveInitiativeRipples_, applyNeighborhoodRipple_, applyInitiativeConsequences_
  READ  economicMood           @ :681   writers: calculateEconomicMood_, runEconomicRippleEngine_, applyMigrationDrift_, seedCarriedEconomicMood_
  READ  holiday                @ :684   writers: advanceSimulationCalendar_, v3preLoader_
  READ  holidayPriority        @ :685   writers: advanceSimulationCalendar_, v3preLoader_
  READ  isFirstFriday          @ :686   writers: advanceSimulationCalendar_, v3preLoader_
  READ  isCreationDay          @ :687   writers: advanceSimulationCalendar_, v3preLoader_
  READ  sportsSeason           @ :688   writers: applySportsSeason_, v3preLoader_
  READ  sportsCity             @ :689   writers: applySportsSeason_
  READ  crimeMetrics           @ :701   writers: updateCrimeMetrics_Phase3_
  READ  undockedFeedEntries    @ :615,4296   writers: loadUndockedFeed_
  READ  undockedBoard          @ :630,636   writers: loadUndockedFeed_
  READ  undockedPilots         @ :4075   writers: loadUndockedFeed_
  WRITE cycleActiveCitizens    @ :759,3224,4682   readers: detectNewBonds_, updateExistingBonds_, bondEngine_, ensureBondEngineData_, runRelationshipEngine_, computeRecurringCitizens_
  WRITE citizenEventMemory     @ :765,4685   readers: generateCitizensEvents_
  WRITE templateCooldowns      @ :1023,1032   readers: generateCitizensEvents_
  WRITE folkMemory             @ :525   readers: (none) [ORPHAN]
  READ  canonHoods             @ :1697,1729   writers: loadCanonNeighborhoods_
  READ  hoodSpots              @ :1698,1730,3498   writers: applyBusinessDynamics_
  READ  neighborhoodDynamics   @ :717   writers: applyCityDynamics_
  READ  bizIdByName            @ :1785,2288   writers: applyBusinessDynamics_
  READ  neighborhoodState      @ :2169,3890   writers: loadNeighborhoodState_
  READ  neighborhoodWeather    @ :1929   writers: (none) [PHANTOM]
  READ  previousEvening        @ :1988,3363,3485   writers: (none) [PHANTOM]
  READ  crimeByNeighborhood    @ :2214   writers: (none) [PHANTOM]
  READ  faithEvents            @ :2282   writers: (none) [PHANTOM]
  READ  contentLedger          @ :3888,3967   writers: loadEventContentLedger_
  READ  sportsFeedEntries      @ :2586   writers: (none) [PHANTOM]
  READ  sportsWeek             @ :2589,2611,4411   writers: (none) [PHANTOM]
  READ  sportsSentimentBoost   @ :2618   writers: (none) [PHANTOM]
  READ  sportsAftermath        @ :2619   writers: (none) [PHANTOM]
  READ  initiativeEvents       @ :2673   writers: (none) [PHANTOM]
  WRITE citizenEvents          @ :3037,3038,4561,4562   readers: (none) [ORPHAN]
  WRITE eventsGenerated        @ :3040,4586   readers: (none) [ORPHAN]
  WRITE storyHooks             @ :3210,3211,4467,4468   readers: (none) [ORPHAN]
  WRITE householdMoments       @ :3225   readers: (none) [ORPHAN]
  WRITE biasIntents            @ :4448,4449,4450   readers: (none) [ORPHAN]
  WRITE faithExposures         @ :4458,4459   readers: (none) [ORPHAN]
  WRITE sharedMoments          @ :4574,4576   readers: (none) [ORPHAN]
  WRITE minorsSkippedTexture   @ :4683   readers: (none) [ORPHAN]
  WRITE engine299              @ :4425,4426,4430   readers: (none) [ORPHAN]
  READ  transitState           @ :3868,3870   writers: (none) [PHANTOM]

OTHER CTX
  ctx.ledger @ :453,470,471,3208,4598  — READ/WRITE (headers, rows, dirty flag)
  ctx.config @ :515,519,667,668,2962,3088,3090,4021,4023  — READ
  ctx.ss @ :513,1760,1776,3094  — READ
  ctx.rng @ :665,666  — READ or error
  ctx.cache @ :578,579  — READ
  ctx.citizenLookup @ :818,819,834,855,879  — READ/WRITE

WRITE PATH
  DIRECT  lifeLog.getRange(...).setValues(hhLogBatch) @ :3222 → LifeHistory_Log
  DIRECT  lifeLog.getRange(...).setValues(logRows) @ :4603 → LifeHistory_Log
  DIRECT  gcSurfaceSheet.getRange(...).setValue(...) @ :4617 → Generic_Citizens
  DIRECT  gcSurfaceSheet.getRange(...).setValue(...) @ :4632 → Generic_Citizens
  INTENT  queueAppendIntent_(ctx, 'Content_Telemetry', [...]) @ :4670 → Content_Telemetry
  Math.random: NOT FOUND

TABS
  LifeHistory_Log   writers: 28 functions (processIntake_, writeCitizenEvent_, generateGameModeMicroEvents_, applyMilestone_, createChildRow_, appendBondLifeLine_, stampPromotion_, generateCitizensEvents_, generateCivicModeEvents_, generateMediaModeEvents_, applyOwnerDraw_, applyFundDisbursementBody_, judicialSettleFine_, judicialSettleLostPay_, runManeuverEngine_, processRelocations_, applyTierLadderState_, decayMediaAttention_, processMediaUsage_, runCareerEngine_, runCivicRoleEngine_, runConductEngine_, runHouseholdEngine_, runNeighborhoodEngine_, runRelationshipEngine_, recordYouthLifeHistory_, processQuotedCitizens_, emitPressureTag_)  manifest: NOT FOUND
  Content_Telemetry writers: generateCitizensEvents_  readers: none  manifest: NOT FOUND
  Generic_Citizens  writers: 5 functions (processIntake_, generateCitizensEvents_, processMediaUsage_, mintOutOfTownChallenger_, pickGenericCitizenChallenger_)  manifest: NOT FOUND
  Community_Programs  readers: 3 functions (generateCitizensEvents_, runYouthEngine_, contractSeedBackdropIndex_)  manifest: NOT FOUND
  Faith_Organizations  writers: 2 functions (generateCitizensEvents_, processRelocations_)  readers: 5 functions (processFaithJoins_, generateCitizensEvents_, processRelocations_, contractSeedBackdropIndex_, ensureFaithOrgsSchema_)  manifest: NOT FOUND
  Judicial_Ledger  NOT IN MAP (read via cache @ :578)

OPEN WORK
  NOT FOUND in ROLLOUT_PLAN.md by name
  docs/plans/2026-11-21-a-moment-has-a-place.md  (bond-call moments phase order and writer contract)
  docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md  (faith ledger member scopes, 1990 words)
  docs/plans/2026-10-10-engine-214-mood-per-hood.md  (neighborhoodStatePool_ caller, three-cut contract)
  docs/plans/2026-10-08-engine-286-game-of-life-events.md  (ECL contract extension, 8 wiring cards, outcome roll)
  docs/plans/2026-09-13-codex-dial-drift-review.md  (city conditions and signed nudge design)
  docs/plans/2026-09-09-transit-hood-alignment-plan.md  (S.transitState consumers)
  docs/plans/2026-08-21-citizen-archive.md  (phase 5 event generators, row-gone rules)

HISTORY
  4b0776b04  engine.356 (builder 2026-11-24: "lower it so we don't get eveyone hating each other but it's ok to have some rivalries"; "children can get events from youth programs , schools , sports games or teams"): a rival moment's step seeds at 0.1 and no longer holds off the fade; a line names a minor only when its own tags put it at a youth program, a school or a game, on every path that picks a person, and only such a line's twin reaches a minor's record. Proof scripts (labelled runs, a whole-week before / after comparison for the config move) and the agy brief. Not benched, suites not run — test lock. [engine/sheet]
  bbd105433  engine.356 bond-called moments: agy SHIP-WITH-FIXES folded — the twin line passes the other person's own gates (no line onto a minor's record, no spectator line onto a GAME-clock player, the life-state gate) and is not redrawn by them; a bond's line is drawn at the ordinary draw's weight; a weekly slot is counted when the line is written; a blank config cell is missing, not 0; the read fails when bonds with a moment do not gain more than those without. Plan: review row. Not run on the sandbox — the test lock is on. [engine/sheet]
  bf324305b  engine.356 bond-called moments built, not benched (builder 2026-11-24: "these should fire when the bonds call for them too … 1 of these a week per bond up to 3"; "On top"; "Marriage at 10 weeks is good"; "Move config numbers to world_config"). Each active bond rolls once a Cycle at Intensity / 10 and a call adds one $CONTACT line of its kind on top of the ordinary lines, at most 3 a person; a shared:both line lands on the other person's record too; a line that names its person moves its dial at double size; the writer hands Phase5-Bonds S.sharedMoments and a bond with a moment takes one step by kind and does not fade that week. Seven numbers on World_Config (ENGINE356_CONFIG_SEEDS). Sandbox scripts for three files; the read checks calls, the cap, twins, the size and each bond's change. Plan. [engine/sheet]
  f98837a7e  engine.356 A3: agy SHIP-WITH-FIXES folded — festival bonds mapped, an unlisted bond type names nobody, a line with no ask never draws the rival, a line that named nobody keeps no with: ask and no place:their-home; the read script hardened (active row wins, zero lines listed, rival / unknown kind / two places). 16 draft $CONTACT lines for the builder's read (not on live). Gap log G-EC73: the code's own neighborhood and meeting lines land 0 times. Plan, ROLLOUT row, NEXT. Not run on the sandbox — the test lock is on. [engine/sheet]
  847e86971  engine.356 cut A3 built, not benched (the test lock is on): the second person of a moment. The old picker read b.otherPopId, a field no bond record carries, so no line of this writer ever named anyone; replaced by pickWith_ — a bonded person by kind, a coworker (same BIZ- employer) or a housemate (same HouseholdId), asked for by with:<kind> tags on the line's row, picked only when the drawn line has $CONTACT, never offered where there is nobody. The line carries contactPopId + the kind picked; place:their-home becomes the other person's household. Template lines carry the person only when the text names them (was: every template line). Bench scripts and nine bench-only lines at output/engine-sheet/2026-11-24-e356p/. Plan: A3 read and design. [engine/sheet]
  62855ebb7  engine.356 (builder 2026-11-24: "go on the engine reading the new column"): a $PROGRAM line asks for a kind of place — at:<kind> tags matched to Community_Programs.Place_Kind (any of them), prog:<Type> still narrows; a line with neither is never offered; a program with a blank or 'none' kind is never a place. Bench scripts + five bench-only lines in output/engine-sheet/2026-11-24-e356n. node --check only; not benched, not on PROD. [engine/sheet]

FILES OPENED
  phase05-citizens/generateCitizensEvents.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **127**
- opened by this run: **127** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=18 toolCalls=25 in=747100 out=7913_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._