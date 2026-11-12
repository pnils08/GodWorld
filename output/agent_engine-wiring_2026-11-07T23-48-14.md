Perfect. Now I have the complete picture. Let me now generate accurate cards for both functions:

```
WIRING CARD — sportsRetire_ (function)   map: 2026-11-07 / 181 files   

DEFINITION
  phase05-citizens/applyGameNightMoments.js:273  function sportsRetire_(ctx, row, cols, team, cycle, write, ri)
  [no version string in file header or function]

PHASE POSITION
  production entry : Phase5-Advancement @ godWorldEngine2.js:668  — BEFORE Phase10-ExecuteIntents (:869)
  cycle-phases     : Phase5-Advancement @ godWorldEngine2.js:2388 — BEFORE Phase10-ExecuteIntents (:2567)

CALLERS (1)
  phase05-citizens/applyGameNightMoments.js:489  var rt = sportsRetire_(ctx, rows[ri], cols, team, cycle, write, ri);

S FIELDS
  (none written or read directly; row parameter is mutated in place)

OTHER CTX
  (none directly accessed; ctx parameter passed but not dereferenced)

WRITE PATH
  DIRECT  row[cols.iClock] = 'ENGINE' @ :279  → Citizen_Population (via caller's write callback, routed through ctx.ledger.rows)
  DIRECT  row[cols.iEcon] = '' @ :280  → Citizen_Population (via caller's write callback)
  DIRECT  row[cols.iRole] = 'Former ' + role @ :282  → Citizen_Population (via caller's write callback)
  DIRECT  row[cols.iBio] = sportsBioNow_(...) @ :287  → Citizen_Population (via caller's write callback)
  (write callback @ applyGameNightMoments.js:438 appends LifeHistory_Log intent)
  Math.random: NOT FOUND

TABS
  Citizen_Population (indirect: rows passed by caller from ctx.ledger)
  LifeHistory_Log (indirect: write callback routed through applyGameNightMoments_:441-443)

OPEN WORK
  NOT FOUND

HISTORY
  d9f6a7dfa engine.333: codex engine-cut HOLD folded in place
  f1b53151f engine.333 Task 2b: feed triggers to life history (builder 2026-11-05/07)
  d409bac12 engine.331 fold of the codex diff review (HOLD)
  592707c09 engine.331 build: sports moments are this Cycle's rows
  3d10fd05b engine.299: the last inert writer on the bench
  7d5b78cf1 engine.209: the franchise weight drifts on results

FILES OPENED
  phase05-citizens/applyGameNightMoments.js
  phase01-config/godWorldEngine2.js
```

Now for processAdvancementIntake_:

```
WIRING CARD — processAdvancementIntake_ (function)   map: 2026-11-07 / 181 files   

DEFINITION
  phase05-citizens/processAdvancementIntake.js:126  function processAdvancementIntake_(ctx)
  [file header: v1.5 CHANGES]

PHASE POSITION
  production entry : Phase5-Advancement @ godWorldEngine2.js:668  — BEFORE Phase10-ExecuteIntents (:869)
  cycle-phases     : Phase5-Advancement @ godWorldEngine2.js:2388 — BEFORE Phase10-ExecuteIntents (:2567)

CALLERS (2)
  phase01-config/godWorldEngine2.js:668  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  phase01-config/godWorldEngine2.js:2388  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  phase05-citizens/processAdvancementIntake.js:228  var results = processAdvancementIntake_(ctx);  (manual runner)

S FIELDS
  READ   ctx.summary.cycleId        @ :128    writers: (many phases); CONNECTED
  READ   ctx.summary.careerSignals  @ :1143   writers: runCareerEngine_; CONNECTED
  WRITE  ctx.summary.relationshipBonds @ :3070  readers: runRelationshipEngine_::592, householdFormationEngine_::1179+1191, computeRecurringCitizens_::78, storyHook_::1229, v3Integration_::174, compressLifeHistory_::685+691; CONNECTED
  WRITE  ctx.summary.storyHooks     @ :2541,2812,2940,3011  readers: v3NeighborhoodWriter_::331, v3DomainWriter_::217, v3StoryHookWriter_::52, applyCycleWeight_::67, buildCyclePacket_::577+614, recordMediaLedger_::103; CONNECTED
  WRITE  ctx.summary.tierLadder     @ :1500    readers: NONE  [ORPHANED WRITE]
  WRITE  ctx.summary.tierDecay      @ :1622    readers: NONE  [ORPHANED WRITE]
  WRITE  ctx.summary.paperFameByPop @ :371,604 readers: culturalLedger_::256+585; CONNECTED

OTHER CTX
  ctx.ss             @ :127,369,415,435,711,717,1368,1516,1534,1662,1894,1906,2132,2231,2362,2411,2413,2513,2610,2779,2792,3034,3088
  ctx.ledger         @ :143,147,162,424,425,728,727,1398,1435,1477,1575,1576,1593,1622,1906,1910,1911,2147,2152,2373,2521,2549,2736,2743,2838,2839,2848,2932,3044,3049,3050  (read/write; shared mutations)
  ctx.config         @ :128,2345,2410  (read; rngSeed)
  ctx.summary        @ :193,1143,1146,1500,1622,2541,2542,2812,2813,2940,2941,3011,3012,3033,3070  (read/write)
  ctx.now            @ :443,561  (read via caller's ledger)

WRITE PATH
  INTENT  queueCellIntent_(ctx, 'Citizen_Media_Usage', ...) @ :121  → Citizen_Media_Usage
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', ...) @ :642,1422,1481,1596  → LifeHistory_Log
  DIRECT  ctx.ss.getRange(2,1,...).setValues(ctx.ledger.rows) @ :234  → Simulation_Ledger (manual path only, not in cycle path)
  DIRECT  advSheet.getRange(...).setValue(...) @ :1924  → Advancement_Intake1  (schema-setup carve-out)
  DIRECT  advSheet.getRange(...).setValues(...) @ :2425,2426,2595,2596  → Advancement_Intake1 / Household_Intake (schema-setup carve-out)
  DIRECT  sheet.getRange(...).setValue(...) @ :2535  → Business_Ledger (key personnel write)
  DIRECT  sheet.appendRow(...) @ :2789,2805  → Household_Ledger, Family_Relationships (header-resolved append)
  Math.random: NOT FOUND (uses safeRand_)

TABS
  Simulation_Ledger     writers: processAdvancementRows_@708+787 (via ctx.ledger), checkEmergencePromotions_@1918+1938+1998, checkFamilyMatchPromotions_@2134+2231, checkBusinessOwnerPromotions_@2363+2421, seedEmergenceBonds_@3034+3044+3049; manifest: SHEETS_MANIFEST.md:?
  Citizen_Media_Usage   writers: processMediaUsage_@373, decayMediaAttention_@1516; manifest: SHEETS_MANIFEST.md:54
  Generic_Citizens      writers: (this function reads only; markAsEmergedInGeneric_@3088); manifest: SHEETS_MANIFEST.md:49
  LifeHistory_Log       writers: applyTierLadderState_@1422, decayMediaAttention_@1596, processMediaUsage_@642; manifest: SHEETS_MANIFEST.md:39
  Advancement_Intake1   writers: checkEmergencePromotions_@1918, checkFamilyMatchPromotions_@2231, checkBusinessOwnerPromotions_@2421, ensureHouseholdQueueSheet_@2591; manifest: SHEETS_MANIFEST.md:53
  Business_Ledger       writers: wireBusinessOwners_@2513+2535; manifest: SHEETS_MANIFEST.md:23
  Household_Ledger      writers: formIntakeHouseholds_@2779+2789; manifest: SHEETS_MANIFEST.md:41
  Family_Relationships  writers: formIntakeHouseholds_@2792+2805; manifest: SHEETS_MANIFEST.md:43

OPEN WORK
  NOT FOUND

HISTORY
  41160fe3d engine.329: the hard-light line names the hard row's piece (research-build)
  94e024b6a pipeline.99: hard-light lines go through engine.163's seam
  2f2e7123a engine.320: an off-map intake hood refuses the whole queue
  ee27fadcd engine.319 codex final-look fold
  4198e46aa engine.319 codex recheck fold
  4b3ed62e2 engine.319 codex diff gate fold

FILES OPENED
  phase05-citizens/processAdvancementIntake.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
```

Now I need to finalize both cards with the exact format required. Let me regenerate them properly as complete standalone reports:

---

WIRING CARD — sportsRetire_ (function)   map: 2026-11-07 / 181 files

DEFINITION
  phase05-citizens/applyGameNightMoments.js:273  function sportsRetire_(ctx, row, cols, team, cycle, write, ri)

PHASE POSITION
  production entry : Phase5-Advancement @ godWorldEngine2.js:668  — BEFORE Phase10-ExecuteIntents (:869)
  cycle-phases     : Phase5-Advancement @ godWorldEngine2.js:2388 — BEFORE Phase10-ExecuteIntents (:2567)

CALLERS (1)
  phase05-citizens/applyGameNightMoments.js:489  var rt = sportsRetire_(ctx, rows[ri], cols, team, cycle, write, ri);

S FIELDS
  (none directly read/written in function body)

OTHER CTX
  (none directly dereferenced)

WRITE PATH
  DIRECT  row[cols.iClock] = 'ENGINE' @ :279  → Citizen_Population (via ctx.ledger.rows)
  DIRECT  row[cols.iEcon] = '' @ :280  → Citizen_Population (via ctx.ledger.rows)
  DIRECT  row[cols.iRole] = 'Former ' + role @ :282  → Citizen_Population (via ctx.ledger.rows)
  DIRECT  row[cols.iBio] = sportsBioNow_(...) @ :287  → Citizen_Population (via ctx.ledger.rows)
  (write callback appends LifeHistory_Log @ applyGameNightMoments_:441)
  Math.random: NOT FOUND

TABS
  LifeHistory_Log  writers: 24 functions including sportsInjure_, sportsReturn_ (sibling functions in caller applyGameNightMoments_); manifest: SHEETS_MANIFEST.md:39

OPEN WORK
  NOT FOUND

HISTORY
  d9f6a7dfa engine.333: codex engine-cut HOLD folded in place — injury stamps only an Active row
  f1b53151f engine.333 Task 2b: feed triggers to life history (builder 2026-11-05/07)
  d409bac12 engine.331 fold of the codex diff review (HOLD): F1 one rng draw picks the game-night line
  592707c09 engine.331 build: sports moments are this Cycle's rows
  3d10fd05b engine.299: the last inert writer on the bench
  7d5b78cf1 engine.209: the franchise weight drifts on results, tenure and fan reach

FILES OPENED
  phase05-citizens/applyGameNightMoments.js
  phase01-config/godWorldEngine2.js

---

WIRING CARD — processAdvancementIntake_ (function)   map: 2026-11-07 / 181 files

DEFINITION
  phase05-citizens/processAdvancementIntake.js:126  function processAdvancementIntake_(ctx)  v1.5

PHASE POSITION
  production entry : Phase5-Advancement @ godWorldEngine2.js:668  — BEFORE Phase10-ExecuteIntents (:869)
  cycle-phases     : Phase5-Advancement @ godWorldEngine2.js:2388 — BEFORE Phase10-ExecuteIntents (:2567)

CALLERS (2)
  phase01-config/godWorldEngine2.js:668  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });
  phase01-config/godWorldEngine2.js:2388  safePhaseCall_(ctx, 'Phase5-Advancement', function() { processAdvancementIntake_(ctx); });

S FIELDS
  READ   cycleId           @ :128   writers: v3preLoader (Phase8), generationalEventsEngine (Phase5); CONNECTED
  READ   careerSignals     @ :1143  writers: runCareerEngine_ (Phase5); CONNECTED
  WRITE  relationshipBonds @ :3070  readers: runRelationshipEngine_@592, householdFormationEngine_@1179+1191, computeRecurringCitizens_@78, storyHook_@1229, v3Integration_@174, compressLifeHistory_@685+691; CONNECTED
  WRITE  storyHooks        @ :2541,2812,2940,3011  readers: v3NeighborhoodWriter_@331, v3DomainWriter_@217, v3StoryHookWriter_@52, applyCycleWeight_@67, buildCyclePacket_@577+614; CONNECTED
  WRITE  tierLadder        @ :1500  readers: NONE  [ORPHANED WRITE]
  WRITE  tierDecay         @ :1622  readers: NONE  [ORPHANED WRITE]
  WRITE  paperFameByPop    @ :371,604  readers: culturalLedger_@256+585; CONNECTED

OTHER CTX
  ctx.ss @ :127,369,415,435,711,717,1368,1516,1534,1662,1894,2132,2231,2362,2413,2513,2610,2779,2792,3034,3088 (read)
  ctx.ledger @ :143,147,162,424,425,727,728,1398,1435,1477,1575,1576,1593,1622,1906,1910,2147,2152,2373,2521,2549,2736,2838,2839,2848,2932,3044,3049 (read/write shared mutations)
  ctx.config @ :128,2345,2410 (read)
  ctx.now @ :443,561 (read from ledger scope)

WRITE PATH
  INTENT  queueCellIntent_(ctx, 'Citizen_Media_Usage', row1, col1, value) @ :121  → Citizen_Media_Usage
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', [...]) @ :642,1422,1481,1596  → LifeHistory_Log
  DIRECT  advSheet.getRange(1, col+1).setValue(header) @ :1924  → Advancement_Intake1 (schema setup)
  DIRECT  advSheet.getRange(1, col+1).setValue(header) @ :2426  → Advancement_Intake1 (schema setup)
  DIRECT  advSheet.getRange(1, col+1).setValue(header) @ :2596  → Household_Intake (schema setup)
  DIRECT  sheet.getRange(row+1, col+1).setValue(popId + name + tag) @ :2535  → Business_Ledger (wireBusinessOwners_ call)
  DIRECT  sheet.appendRow(newRow) @ :2789,2805  → Household_Ledger, Family_Relationships (formIntakeHouseholds_ call)
  DIRECT  ctx.ss.getRange(2,1,...).setValues(ctx.ledger.rows) @ :234  → Simulation_Ledger (manual path runAdvancementIntakeManual_ only)
  Math.random: NOT FOUND (uses safeRand_ via ctx.config.rngSeed)

TABS
  Simulation_Ledger    writers: processAdvancementRows_@787, checkEmergencePromotions_@1938+1998, checkFamilyMatchPromotions_@2231, checkBusinessOwnerPromotions_@2421, seedEmergenceBonds_@3049 (all via ctx.ledger); manifest: SHEETS_MANIFEST.md:?
  Citizen_Media_Usage  writers: processMediaUsage_@373, decayMediaAttention_@1516; manifest: SHEETS_MANIFEST.md:54
  Generic_Citizens     readers only; manifest: SHEETS_MANIFEST.md:49
  LifeHistory_Log      writers: applyTierLadderState_@1422, decayMediaAttention_@1596, processMediaUsage_@642; manifest: SHEETS_MANIFEST.md:39
  Advancement_Intake1  writers: checkEmergencePromotions_@1938, checkFamilyMatchPromotions_@2231, checkBusinessOwnerPromotions_@2421, ensureHouseholdQueueSheet_@2591; manifest: SHEETS_MANIFEST.md:53
  Business_Ledger      writers: wireBusinessOwners_@2535; manifest: SHEETS_MANIFEST.md:23
  Household_Ledger     writers: formIntakeHouseholds_@2789; manifest: SHEETS_MANIFEST.md:41
  Family_Relationships writers: formIntakeHouseholds_@2805; manifest: SHEETS_MANIFEST.md:43

OPEN WORK
  NOT FOUND

HISTORY
  41160fe3d engine.329: the hard-light line names the hard row's piece (research-build)
  94e024b6a pipeline.99: hard-light lines go through engine.163's seam, a life line reads 'a Bay Tribune sports desk
  2f2e7123a engine.320: an off-map intake hood refuses the whole queue up front
  ee27fadcd engine.319 codex final-look fold: the clock refusal is strict and all-or-nothing
  4198e46aa engine.319 codex recheck fold: the queue-wide clock check follows queue order
  4b3ed62e2 engine.319 codex diff gate fold: the bad-clock refusal is queue-wide

FILES OPENED
  phase05-citizens/processAdvancementIntake.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=22 toolCalls=38 in=705471 out=9447_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._