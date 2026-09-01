Good. Now let me make sure I have the correct line for Household_Ledger in SHEETS_MANIFEST:

The grep earlier showed line 39. Let me compile the complete card:

```
WIRING CARD — processMoneyLoop_ (function)   map: 2026-08-31 / 185 files / 1193 functions

DEFINITION
  phase05-citizens/generationalWealthEngine.js:286  function processMoneyLoop_(ctx, cycle)  v2.1 / engine.61

PHASE POSITION
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js:374  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js:2092 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (1)
  phase05-citizens/generationalWealthEngine.js:172  var loopResults = processMoneyLoop_(ctx, cycle);

S FIELDS
  READ  bankRate       @ :290  writers: processBankRate_ @phase05, finalizeCycleState_ @phase09
  READ  neighborhoodState  @ :293  writers: loadNeighborhoodState_ @phase02
  WRITE storyHooks     @ :406-407  writers: runGenerationalEngine_ @phase04, bondEngine_ @phase05, civicInitiativeEngine_ @phase05, educationCareerEngine_ @phase05, generateCitizensEvents_ @phase05, householdFormationEngine_ @phase05, migrationTrackingEngine_ @phase05, neighborhoodTrajectoryEngine_ @phase05, processAdvancementIntake_ @phase05, updateCivicApprovalRatings_ @phase05, storylineHealthEngine_ @phase06, storylineWeavingEngine_ @phase07, storyHookEngine_ @phase07

OTHER CTX
  ctx.ledger.headers @ :295 (READ)
  ctx.ledger.rows    @ :296 (READ, mutated @ :396, :398, :402)
  ctx.ledger.dirty   @ :418 (WRITE)
  ctx.ss             @ :309 (READ)

WRITE PATH
  DIRECT ctx.ledger.rows mutations @ :396 (NetWorth), :398 (DebtLevel), :402 (LifeHistory) → Simulation_Ledger
      [committed by Phase10-ExecuteIntents per parent processGenerationalWealth_ envelope]

TABS
  Household_Ledger  readers: processMoneyLoop_, trackHomeOwnership_, updateHouseholdWealth_ (+ 12 other readers)
      writers: runGenerationalEngine_, marryCitizens_, dissolveStressedHouseholds_, updateHouseholdIncomes_
      manifest: SHEETS_MANIFEST.md:39

OPEN WORK
  NOT FOUND

HISTORY
  d93a5532 S399 engine.135 D2/D4: a citizen's pay references their own hood's businesses (hoodReferencePay_); untracked re-base raise-only; five draw sites priced by the hood
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5 (ENGINE-only); 18–21-year-olds keep whatever stage they have
  aa1dce57 S398 engine.135 E1/D5: retirement is an EVENT, never an age (builder, 2026-08-30)
  bb090fa1 S398 engine.135 D5/E1 narrowing: retirement = age ≥65 or Status=Retired (not the stale CareerStage), Tier 1–2 exempt; E1 leaves Status=Retired rows alone
  feefbb48 S398 engine.135 D3: sports-franchise employers set no Income floor
  b1644c1b S398 engine.135 D3 + D6: tracked-employer Income floor (code, test-first) + 32 existing storefront rows re-based on bench

FILES OPENED
  phase05-citizens/generationalWealthEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json (via map_lookup)
  docs/engine/ROLLOUT_PLAN.md
  scripts/ctxMap.js (via map_lookup)
```

Wait, I need to be more precise about the writing flow. Let me re-examine: the function writes to `row` objects which are references to entries in `ctx.ledger.rows`. These are in-memory mutations that are NOT sheet writes directly—they're modifications to the ledger cache. The actual sheet write happens later at Phase10. This is NOT a direct sheet write via `setValue` or `appendRow`; it's a direct object mutation on the ledger. Let me clarify the write path terminology: I should call this "LEDGER MUTATION" or confirm it's not through the queue. Looking back at the patterns:
- INTENT: queueCellIntent_, queueAppendIntent_, etc.
- DIRECT: setValue, setValues, appendRow, clearContent, deleteRows, insertSheet, getRange(
- LEDGER MUTATION: ctx.ledger.rows mutations

This is a ledger mutation, which IS a form of direct write (not queued). The Phase10 executor later commits the dirty ledger to sheets.

Actually, reviewing the write path rules more carefully: "any of `queueCellIntent_|queueAppendIntent_|queueRangeIntent_|queueReplaceIntent_` = INTENT; any of `setValue|setValues|appendRow|clearContent|deleteRows|insertSheet|getRange(` = DIRECT." 

The function does neither—it mutates the in-memory ledger object. This is implicitly a "ledger mutation" which is eventually committed by Phase10. For the card, I should label this as "LEDGER MUTATION" or note that it's indirect through the ctx.ledger mechanism. Let me check if there are any actual sheet API calls:

Looking at the body again:
- Line 309: `ctx.ss.getSheetByName('Household_Ledger')` — getDataRange (sheet read)
- Line 311: `hhSheet.getDataRange().getValues();` — this is a DIRECT read, not a mutation

So the Household_Ledger is READread directly. The Simulation_Ledger rows are mutated in memory.

Let me verify once more and finalize:

```
WIRING CARD — processMoneyLoop_ (function)   map: 2026-08-31 / 185 files / 1193 functions

DEFINITION
  phase05-citizens/generationalWealthEngine.js:286  function processMoneyLoop_(ctx, cycle)  v2.1 / engine.61

PHASE POSITION
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js:374  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js:2092 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (1)
  phase05-citizens/generationalWealthEngine.js:172  var loopResults = processMoneyLoop_(ctx, cycle);

S FIELDS
  READ  bankRate           @ :290    writers: processBankRate_@phase05, finalizeCycleState_@phase09
  READ  neighborhoodState  @ :293    writers: loadNeighborhoodState_@phase02
  WRITE storyHooks         @ :406-407  readers: many (phase08–10); writers: 8 functions @phase04-07

OTHER CTX
  ctx.ledger.headers @ :295 (READ)
  ctx.ledger.rows    @ :296 (READ, mutated @ :396, :398, :402)
  ctx.ledger.dirty   @ :418 (WRITE)
  ctx.ss             @ :309 (READ)

WRITE PATH
  LEDGER MUTATION  ctx.ledger.rows[r][iNW] = nwNew     @ :396 → Simulation_Ledger (NetWorth)
  LEDGER MUTATION  ctx.ledger.rows[r][iDebt] = debt    @ :398 → Simulation_Ledger (DebtLevel)
  LEDGER MUTATION  ctx.ledger.rows[r][iLife] = ...     @ :402 → Simulation_Ledger (LifeHistory)
      [all committed Phase10-ExecuteIntents per ctx.ledger.dirty flag set @ :418]

TABS
  Household_Ledger  @ :309 (READ via getDataRange().getValues())
      readers: 17 functions incl. processMoneyLoop_, trackHomeOwnership_, updateHouseholdWealth_
      writers: runGenerationalEngine_, marryCitizens_, dissolveStressedHouseholds_, updateHouseholdIncomes_
      manifest: SHEETS_MANIFEST.md:39

OPEN WORK
  NOT FOUND

HISTORY
  d93a5532 S399 engine.135 D2/D4: a citizen's pay references their own hood's businesses
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows outside E1/D3/D5; 18–21-year-olds keep stage
  aa1dce57 S398 engine.135 E1/D5: retirement = EVENT, never age (2026-08-30)
  bb090fa1 S398 engine.135 D5/E1: retirement = age ≥65 or Status=Retired; Tier 1–2 exempt
  feefbb48 S398 engine.135 D3: sports-franchise employers = no Income floor
  b1644c1b S398 engine.135 D3+D6: tracked-employer Income floor + 32 storefront re-base (2026-08-30)

FILES OPENED
  phase05-citizens/generationalWealthEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  scripts/ctxMap.js
  docs/engine/ROLLOUT_PLAN.md
```

Actually, I should double-check my findings by making sure I haven't missed anything. Let me review the checklist:

✅ Definition: found, with version
✅ Callers: found (1 caller)
✅ Phase position: found (before Phase10 in both entry points)
✅ Body read: completed, all S.fields identified
✅ Field map: checked for bankRate, neighborhoodState, storyHooks
✅ ctxMap: checked for all three fields
✅ Other ctx fields: listed
✅ Write path: identified (ledger mutations)
✅ Tab map: checked for Household_Ledger
✅ Open work: none found
✅ History: 6 commits listed
✅ Map freshness: map is 2026-08-31, godWorldEngine2.js newest commit is 2026-08-30 (per the mapmeta lookup), so map is current

Wait, I should check for Math.random more carefully. Let me re-read that part:

Line 294: `var rng = safeRand_(ctx);` — this wraps ctx.rng
Line 354: `if (creditF > 1 && debt < 6 && rng() < (creditF - 1) * 2) {` — uses rng()
Line 371: `var shockRoll = rng();` — uses rng()
Line 373: `var hit = Math.round((1500 + rng() * 6500) / 100) * 100;` — uses rng() * 6500
Line 384: `var gift = Math.round((2000 + rng() * 13000) / 100) * 100;` — uses rng() * 13000

There is NO direct `Math.random()` call in this function. The function uses `safeRand_(ctx)` which returns an RNG function. Per the comment at line 294: "engine.61: deep-digs + shocks roll genuine dice" — this is intentional use of the safe RNG, not a violation.

Let me now finalize the card with complete accuracy:

WIRING CARD — processMoneyLoop_ (function)   map: 2026-08-31 / 185 files / 1193 functions

DEFINITION
  phase05-citizens/generationalWealthEngine.js:286  function processMoneyLoop_(ctx, cycle)  v2.1 / engine.61

PHASE POSITION
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js:374  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js:2092 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (1)
  phase05-citizens/generationalWealthEngine.js:172  var loopResults = processMoneyLoop_(ctx, cycle);

S FIELDS
  READ  bankRate           @ :290    writers: processBankRate_@phase05, finalizeCycleState_@phase09
  READ  neighborhoodState  @ :293    writers: loadNeighborhoodState_@phase02
  WRITE storyHooks         @ :406-407  readers: many (phase08–10); writers: 8+ @phase04-07

OTHER CTX
  ctx.ledger.headers @ :295 (READ)
  ctx.ledger.rows    @ :296 (READ, mutated @ :396, :398, :402)
  ctx.ledger.dirty   @ :418 (WRITE)
  ctx.ss             @ :309 (READ)

WRITE PATH
  LEDGER MUTATION  ctx.ledger.rows[r][iNW] = nwNew     @ :396 → Simulation_Ledger (NetWorth)
  LEDGER MUTATION  ctx.ledger.rows[r][iDebt] = debt    @ :398 → Simulation_Ledger (DebtLevel)
  LEDGER MUTATION  ctx.ledger.rows[r][iLife] = ...     @ :402 → Simulation_Ledger (LifeHistory)
      [all committed Phase10-ExecuteIntents per ctx.ledger.dirty flag @ :418]

TABS
  Household_Ledger  @ :309 (READ via getDataRange().getValues())
      readers: 17 functions incl. processMoneyLoop_, trackHomeOwnership_, updateHouseholdWealth_
      writers: runGenerationalEngine_, marryCitizens_, dissolveStressedHouseholds_, updateHouseholdIncomes_
      manifest: SHEETS_MANIFEST.md:39

OPEN WORK
  NOT FOUND

HISTORY
  d93a5532 S399 engine.135 D2/D4: a citizen's pay references their own hood's businesses
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows outside E1/D3/D5; 18–21-year-olds keep stage
  aa1dce57 S398 engine.135 E1/D5: retirement = EVENT, never age (2026-08-30)
  bb090fa1 S398 engine.135 D5/E1: retirement = age ≥65 or Status=Retired; Tier 1–2 exempt
  feefbb48 S398 engine.135 D3: sports-franchise employers = no Income floor
  b1644c1b S398 engine.135 D3+D6: tracked-employer Income floor + 32 storefront re-base (2026-08-30)

FILES OPENED
  phase05-citizens/generationalWealthEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  scripts/ctxMap.js
  docs/engine/ROLLOUT_PLAN.md

---

WIRING CARD — processMoneyLoop_ (function)   map: 2026-08-31 / 185 files / 1193 functions

DEFINITION
  phase05-citizens/generationalWealthEngine.js:286  function processMoneyLoop_(ctx, cycle)  v2.1 / engine.61

PHASE POSITION
  production entry : Phase5-GenerationalWealth @ godWorldEngine2.js:374  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-GenerationalWealth @ godWorldEngine2.js:2092 — BEFORE Phase10-ExecuteIntents (:2258)

CALLERS (1)
  phase05-citizens/generationalWealthEngine.js:172  var loopResults = processMoneyLoop_(ctx, cycle);

S FIELDS
  READ  bankRate           @ :290    writers: processBankRate_@phase05, finalizeCycleState_@phase09
  READ  neighborhoodState  @ :293    writers: loadNeighborhoodState_@phase02
  WRITE storyHooks         @ :406-407  readers: 22+ @phase03-10; writers: 8+ @phase04-07

OTHER CTX
  ctx.ledger.headers @ :295 (READ)
  ctx.ledger.rows    @ :296 (READ, mutated @ :396, :398, :402)
  ctx.ledger.dirty   @ :418 (WRITE)
  ctx.ss             @ :309 (READ)

WRITE PATH
  LEDGER MUTATION  ctx.ledger.rows[r][iNW] = nwNew     @ :396 → Simulation_Ledger (NetWorth)
  LEDGER MUTATION  ctx.ledger.rows[r][iDebt] = debt    @ :398 → Simulation_Ledger (DebtLevel)
  LEDGER MUTATION  ctx.ledger.rows[r][iLife] = ...     @ :402 → Simulation_Ledger (LifeHistory)
      [all committed Phase10-ExecuteIntents per ctx.ledger.dirty flag @ :418]

TABS
  Household_Ledger  @ :309 (READ via getDataRange().getValues())
      readers: 17 functions incl. processMoneyLoop_, trackHomeOwnership_, updateHouseholdWealth_
      writers: runGenerationalEngine_, marryCitizens_, dissolveStressedHouseholds_, updateHouseholdIncomes_
      manifest: SHEETS_MANIFEST.md:39

OPEN WORK
  NOT FOUND

HISTORY
  d93a5532 S399 engine.135 D2/D4: a citizen's pay references their own hood's businesses
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows outside E1/D3/D5; 18–21-year-olds keep stage
  aa1dce57 S398 engine.135 E1/D5: retirement = EVENT, never age (2026-08-30)
  bb090fa1 S398 engine.135 D5/E1: retirement = age ≥65 or Status=Retired; Tier 1–2 exempt
  feefbb48 S398 engine.135 D3: sports-franchise employers = no Income floor
  b1644c1b S398 engine.135 D3+D6: tracked-employer Income floor + 32 storefront re-base (2026-08-30)

FILES OPENED
  phase05-citizens/generationalWealthEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ENGINE_STUB_REVERSE.json
  scripts/ctxMap.js
  docs/engine/ROLLOUT_PLAN.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **137**
- opened by this run: **137** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=16 toolCalls=22 in=232282 out=8326_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._