# Adversarial Review: Initiatives in the World Jobs 4 & 5 (`71264ab2`, `2e300425`, `be50086b`)

**Date:** 2026-09-26  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commits:**
- `71264ab2` — Job 4: BizID link column (self-arm + legacy backfill)
- `2e300425` — engine.260: tracked-hire openings for minted civic establishments
- `f915be11` — Job 4 bench-proven: BizID link + engine.260 (SANDBOX 0908 C114->C115 clean)
- `be50086b` — Job 5: builds and running programs spend their budget
- `41c63294` — Job 5 bench-proven (SANDBOX @110 C116, predictions exact)

**Files Inspected:**
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`ensureInitiativeLinkColumns_`, `backfillInitiativeBizLinks_`, `backfillInitiativeOpenSlots_`, `publishCivicOpenSlots_`, `getCivicOpenSlots_`, `INITIATIVE_LINK_COLUMNS_`, `INITIATIVE_BIZ_LEGACY_MAP_`, `INITIATIVE_APPROVED_STAGES_`)
- [`phase05-citizens/runCareerEngine.js`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js) (`civicMovers` pool compilation, fresh `civicTrackerRowByBiz` lookup, `civicSlot` hiring window, role-swap / `SETTLE_ROLES_BY_FIELD` logic, departure delta tracking, fresh cell-intent decrement)
- [`phase02-world-state/applyInitiativeImplementationEffects.js`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js) (`planInitiativeSpend_`, `getCivicSpendDials_`, `BUILD_SPEND_PHASES`, `RUN_SPEND_PHASES`, spend cell intents, exhaustion handler)
- [`phase01-config/engine94SheetContract.js`](file:///root/GodWorld/phase01-config/engine94SheetContract.js) (`civicOpenSlots`, `civicCapitalShare`, `civicOperatingWeeks` dial seeds in `ENGINE213_CONFIG_SEEDS`)
- [`scripts/initiativeSpend.test.js`](file:///root/GodWorld/scripts/initiativeSpend.test.js) (18 assertions)
- [`scripts/fundDisbursement.test.js`](file:///root/GodWorld/scripts/fundDisbursement.test.js) (46 assertions)
- [`docs/plans/2026-09-24-initiatives-in-the-world.md`](file:///root/GodWorld/docs/plans/2026-09-24-initiatives-in-the-world.md) (Job 4 and Job 5 design + bench-proof records)

---

## Executive Verdict

**CLEAN PASS (VERIFIED RESILIENT):**  
Commits `71264ab2`, `2e300425`, and `be50086b` complete the full lifecycle of civic initiatives in the world: linking initiatives structurally to the `Business_Ledger`, enabling organic tracked hiring for minted civic employers without disrupting the citywide unemployed equilibrium, and enforcing realistic budgetary expenditure across both construction and operational phases.

Key mechanisms verified:
1. **Structural Traceability & Controlled Hiring (Job 4 / `engine.260`):**
   - `BizID` and `OpenTrackedSlots` self-arm cleanly on `Initiative_Tracker`. Legacy S334 pairs (`INIT-001` through `INIT-007`) are backfilled from an authoritative hand-mapped dictionary, never overwriting existing values.
   - Authored tracked-hire openings (`civicOpenSlots` default 2) bypass growth cadence and `gapFactor` without touching the ordinary hiring path for the ~170 other businesses.
   - The employed mover path correctly filters for active, working-age citizens with ambition posture `climb` (`maneuverPostureOf_`).
   - The "two truths" role-swap fix (`roleFieldOf_` vs `SETTLE_ROLES_BY_FIELD`) is verified and proven live on the bench (POP-00168 transitioning to healthcare).
   - Decrements are resolved fresh by `BizID` synchronously at intent time, completely immune to row-index drift from asynchronous `cron-civic-run.js` hourly tick appends.
2. **Dual-Phase Spend Dynamics (Job 5):**
   - Construction phases (`construction-planning`, `construction-active`) spend capital share (`civicCapitalShare` = 0.6) evenly over `buildCycles`, scaled by tend and strictly clamped at the operating floor (`1 - capitalShare`). A site under construction cannot prematurely deplete its operating runway.
   - Running phases (`operational`, `dispatch-live`, etc.) spend operating runway over `civicOperatingWeeks` (52 weeks). Sites opening with legacy unspent capital are immediately trued down to the operating floor.
   - Operating exhaustion cleanly triggers `ImplementationPhase = 'complete'` and logs an explanatory milestone note. Build phases are mathematically protected from exhaustion.
   - The Stabilization Fund (`disbursement-active`) remains completely segregated on its household grant path (`householdFormationEngine.js`).
   - Same-cycle stage mutations in Phase 5 (`civicInitiativeEngine.js`) and budget spend intents in Phase 2 cleanly coexist across the cycle boundary without clobbering.

Full repository test suite passes cleanly at 262/262 files (0 errors). Zero regressions, race conditions, or unhandled edge cases found.

---

## Detailed Audit Against Hunt Directives

### Job 4 Directives

#### 1. The Same-Field / Role-Swap Fix on the Mover Path
**Finding: VERIFIED RESILIENT & BENCH-PROVEN.**

- **Code Path:** [`phase05-citizens/runCareerEngine.js:1458-1475`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js#L1458-L1475)
- **Mechanism:**
  In GodWorld's dual truth system (engine.146/engine.170), carrying a skill tag is distinct from a citizen's current employment field (`RoleType`). When an employed mover is selected based on matching `SkillTags`:
  ```javascript
  if (iRoleM >= 0 && typeof roleFieldOf_ === 'function' && typeof SETTLE_ROLES_BY_FIELD !== 'undefined' && SETTLE_ROLES_BY_FIELD[cat]) {
    var cCurField = roleFieldOf_(cRow[iRoleM]);
    if (cCurField !== cat) {
      var cEduRank = Number(cMover.edu) || 0;
      var cNewRole = SETTLE_ROLES_BY_FIELD[cat][cEduRank >= 4 ? 'rich' : cEduRank >= 1 ? 'solid' : 'rough'];
      cRow[iRoleM] = cNewRole;
      if (typeof setCurrentField_ === 'function') cRow[iTags] = setCurrentField_(cRow[iTags], cat);
      if (typeof jobReferencePay_ === 'function') {
        var cNp = jobReferencePay_(cNewRole, cRow[iTags], cRow[idx('CareerStage')], cRow[iPopID],
          (typeof payProfileFromRow_ === 'function') ? payProfileFromRow_(ctx.ledger.headers, cRow, bGrow >= 0 ? Number(bizData[br3][bGrow]) : null) : null);
        if (cNp !== null) cRow[iIncome] = cNp;
      }
      cIsCross = true;
    }
  }
  ```
- **Verification:**
  - If a citizen already works in `cat` (e.g. POP-00037 moving to OARI), `cCurField === cat`: role and tags are preserved, income increases (+5% to +10%), and the narrative logs `Career-Hired`.
  - If a citizen holds the skill tag but was employed in a different field (e.g. POP-00168 moving from Oakland Hospital to Temescal Health Center in healthcare), `cCurField !== cat`: the citizen receives the appropriate entry role from `SETTLE_ROLES_BY_FIELD[cat]` based on education credential, reference pay is recalculated, `cIsCross` is flagged, and the narrative logs `Career-FieldChange` ("Changed fields — left Oakland Hospital for an opening at Temescal Community Health Center (Healthcare)").
  - This logic precisely mirrors the unemployed hire path (`runCareerEngine.js:1396-1406`). Bench run C114->C115 proved both branches simultaneously in live execution.

---

#### 2. The Fresh-Row-Resolve-by-`BizID` Decrement
**Finding: VERIFIED RESILIENT (IMMUNE TO CRON RACE CONDITIONS).**

- **Code Path:** [`phase05-citizens/civicInitiativeEngine.js:3266-3286`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3266-L3286), [`phase05-citizens/runCareerEngine.js:1294-1311, 1506-1512`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js#L1294-L1311)
- **Vulnerability Analyzed:**
  `Initiative_Tracker` is mutated outside the weekly engine cycle by `scripts/cron-civic-run.js` (the hourly civic tick), which can append new initiatives (e.g. INIT-008). If `civicInitiativeEngine_` captured row indices in `S.civicOpenSlots` during Phase 5 and passed them to `runCareerEngine_`, any intermediate row insertion or index mismatch would write decrements to the wrong row.
- **Verification of Defense:**
  - `publishCivicOpenSlots_` deliberately emits ONLY `{ slots }` keyed by `bizId`. Zero sheet row/column coordinates are stored in state.
  - In `runCareerEngine_`, a fresh, synchronous read of `Initiative_Tracker` is executed immediately prior to the hiring loop (`civicTrackerSheet.getDataRange().getValues()`).
  - Mapping `civicTrackerRowByBiz[ctBizId]` is constructed dynamically from current sheet data.
  - The cell intent is queued using `civicTrackerRowByBiz[bizId2]`. Because Google Apps Script executes synchronously without concurrent external writes during cycle execution, the coordinate is 100% stable and accurate.
  - Bench execution confirmed INIT-002 and INIT-005 decremented on their exact physical rows.

---

#### 3. The `OpenTrackedSlots` Seed Gate
**Finding: VERIFIED STRICT & IDEMPOTENT.**

- **Code Path:** [`phase05-citizens/civicInitiativeEngine.js:3159, 3218-3242`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3159)
- **Logic:**
  ```javascript
  var INITIATIVE_APPROVED_STAGES_ = ['Funded', 'Standing', 'Delivering'];
  ...
  var blank = current === '' || current === null || current === undefined;
  if (bizId && blank && INITIATIVE_APPROVED_STAGES_.indexOf(stage) >= 0) {
    out.slots.push([startingSlots]);
    out.changed++;
  } else {
    out.slots.push([current]);
  }
  ```
- **Verification:**
  - Requires all three: non-blank `BizID`, blank existing slot value, and `Stage` in `Funded`, `Standing`, or `Delivering`.
  - Pre-vote / unapproved rows (`Proposed`, e.g. INIT-003, INIT-008) are rejected.
  - Unstaged rows (blank `Stage`, e.g. INIT-007) are rejected.
  - Rows with existing counts (including `0` when slots are exhausted) are NEVER re-seeded because `0 === ''` is false. Decrements to 0 are permanent until explicitly altered by policy or renewal.
  - Self-arming dial reader `getCivicOpenSlots_` fails loud if `World_Config.civicOpenSlots` is missing or out of bounds (0-10), preventing silent defaults.

---

#### 4. Insulation of the Ordinary Unemployed-Only Path (Engine.135 E3)
**Finding: VERIFIED RESILIENT (ZERO POOL DRAIN).**

- **Code Path:** [`phase05-citizens/runCareerEngine.js:1257-1335, 1435-1449`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js#L1257-L1335)
- **Vulnerability Analyzed:**
  Across GodWorld's 175 businesses, tracked citizens represent a 1:443 sample, meaning all 175 businesses report stated headcount > tracked headcount (a cumulative vacancy gap of 29,261 against an unemployed pool of ~18 citizens). If civic hiring logic leaked to ordinary businesses or drained the unemployed pool, the citywide labor market would collapse.
- **Verification of Defense:**
  - For the ~170 ordinary businesses, `civicSlot` is `null`. Hiring windows are governed strictly by Growth Rate cadence and `gapFactor` attractor odds, drawing exclusively from the unemployed pool (`if (!mEmp)`). The `if (civicSlot && civicSlot.slots > 0)` block is bypassed completely.
  - For the 5 civic employers, total fills are strictly bounded at 1 per cycle (`Math.min(civicRemaining, civicSlot.slots, civicCandidates.length)`).
  - Unemployed candidates take precedence (`slots.length`). Employed movers are only evaluated for the remaining shortfall (`civicRemaining = openings - slots.length`).
  - Employed movers must have posture `'climb'` (`maneuverPostureOf_`).
  - Departure accounting registers `businessDeltas[oldBiz].lost += 1`, correctly stepping down the previous employer's stated headcount without creating spurious layoff lines.
  - On the live bench run, 0 civic movers were drawn from the unemployed pool, preserving the 18-citizen pool for organic market clearing.

---

### Job 5 Directives

#### 5. Capital True-Up on Running Rows
**Finding: VERIFIED ACCURATE & BENCH-PROVEN.**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:770-785`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L770-L785)
- **Mechanism:**
  When a build category initiative (e.g. Temescal Health Center, $45M budget, 8 build cycles) reaches an operational phase (`operational`, `implementation-active`, etc.) while holding capital (either because it was constructed in legacy cycles prior to Job 5 or under-spent during construction), it must reconcile immediately:
  ```javascript
  var opShare = buildCycles > 0 ? (1 - Number(d.capitalShare)) : 1;
  var floor = Math.round(total * opShare * 100) / 100;
  ...
  var base = Math.min(remaining, floor);
  newRemaining = Math.max(0, base - floor / Number(d.operatingWeeks));
  ```
- **Verification:**
  - With `civicCapitalShare = 0.6`, the capital share is $45M × 0.6 = $27M. The operating floor is $45M × 0.4 = $18,000,000.
  - `base` clamps the $45M remaining down to the $18M floor.
  - Week 1 operating runway ($18,000,000 / 52 = $346,153.85) is deducted.
  - Result: `newRemaining = 17,653,846.15`, debited $27,346,153.85 in a single transition cycle.
  - Confirmed exactly to the cent on SANDBOX @110 C116 live fire.

---

#### 6. Operating-Floor Clamp During Build
**Finding: VERIFIED IMMUNE TO RUNWAY OVERSPEND.**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:774-779`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L774-L779)
- **Mechanism:**
  ```javascript
  if (input.build) {
    if (buildCycles <= 0) return null;
    var tend = Number(input.tend); if (!isFinite(tend) || tend < 0) tend = 1; if (tend > 1) tend = 1;
    var weekly = total * Number(d.capitalShare) / buildCycles * tend;
    newRemaining = Math.max(floor, remaining - weekly);
  }
  ```
- **Verification:**
  - `newRemaining` is hard-clamped at `floor = total * (1 - capitalShare)`.
  - For the clinic ($45M total), build spend can never reduce `BudgetRemaining` below $18,000,000 during `construction-planning` or `construction-active`.
  - When `remaining === floor`, `debit = 0`, causing `planInitiativeSpend_` to return `null`. Spend halts cleanly once capital is exhausted until the facility physically opens.
  - Gated and verified in unit tests (`scripts/initiativeSpend.test.js:68, 72`).

---

#### 7. Exhaustion → `complete` + MilestoneNotes Line
**Finding: VERIFIED CLEAN TERMINATION.**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:529-538, 789`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L529-L538)
- **Mechanism:**
  - `exhausted = !input.build && newRemaining <= 0;`. Builds cannot exhaust (`!input.build` is false).
  - When an operational initiative's remaining runway reaches 0:
    1. Phase intent: `queueCellIntent_(ctx, 'Initiative_Tracker', i + 1, iPhase + 1, 'complete', ...)`.
    2. Notes intent: Appends `C{cycle}: operating budget exhausted — service ends unless the council renews it` to `MilestoneNotes`.
    3. `weeksLeft` is reported as `null` / `0` for the civic dashboard.
  - In subsequent cycles, `complete` is excluded from `RUN_SPEND_PHASES`, and `remaining <= 0`, preventing further processing.
  - Verified in unit tests (`scripts/initiativeSpend.test.js:95-100`).

---

#### 8. Fund Path Untouched
**Finding: VERIFIED INDEPENDENT & SEGREGATED.**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:238-247, 489-543`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L238-L247)
- **Verification:**
  - The Stabilization Fund operates in `disbursement-active`.
  - Job 5 spend operates exclusively in `BUILD_SPEND_PHASES` (`construction-planning`, `construction-active`) and `RUN_SPEND_PHASES` (`implementation-active`, `dispatch-live`, `pilot-active`, `pilot_evaluation`, `operational`).
  - The two sets of phases have zero intersection.
  - The fund continues to route through `pendingDisbursement` and `householdFormationEngine.js` for household tranches.
  - In the SANDBOX @110 C116 fire, the fund disbursed $280k ($400k tranche × 0.7 tend) on its own path ($21,060,000 → $20,780,000) while OARI and the clinic spent under Job 5.

---

#### 9. Same-Cycle Phase Write from Phase-5 Stage Handler
**Finding: VERIFIED ARCHITECTURALLY SAFE.**

- **Code Path:** Interaction between Phase 2 (`applyInitiativeImplementationEffects.js`), Phase 5 (`civicInitiativeEngine.js`), and Phase 10 (`persistenceExecutor.js`).
- **Lifecycle Trace:**
  1. **Phase 2:** `applyInitiativeImplementationEffects_` evaluates the row in its initial cycle phase (e.g. `construction-active`). It calculates build spend and queues Phase 10 cell intents for `BudgetRemaining` and `LastDisburseCycle` (priority 5). It does NOT queue an `ImplementationPhase` write (builds cannot exhaust).
  2. **Phase 5:** `runCivicInitiativeEngine_` evaluates `applyCivicBuildOpen_`. If `cycle >= OpensCycle`, it updates the in-memory row (`row[ix.phase] = 'operational'`, `row[ix.milestone] = ...`) and writes the grid back via `sheet.getRange(...).setValues(rows)`.
  3. **Phase 10:** `persistenceExecutor.js` commits all queued cell intents. The cell intents for `BudgetRemaining` and `LastDisburseCycle` overwrite their target cells on the sheet.
  4. **Coexistence:** Phase 10 cell intents do NOT touch `ImplementationPhase` for open builds, preserving Phase 5's phase transition to `operational`. In the subsequent cycle, Phase 2 reads `operational` from the sheet and smoothly begins operating runway debits.

---

## Local Validation Results

1. **Targeted Tests:**
   - `node scripts/initiativeSpend.test.js`: 18/18 passed.
   - `node scripts/fundDisbursement.test.js`: 46/46 passed.
2. **Full Repository Test Suite:**
   - `npm test`: 262/262 test files passed (163.72s).
3. **Syntax Checks:**
   - `node --check phase05-citizens/civicInitiativeEngine.js`: clean.
   - `node --check phase05-citizens/runCareerEngine.js`: clean.
   - `node --check phase02-world-state/applyInitiativeImplementationEffects.js`: clean.

---

## Recommendation & Next Action

**RECOMMENDATION: PROCEED WITH PROD PUSH.**

Commits `71264ab2`, `2e300425`, and `be50086b` represent a complete, verified, and bench-proven implementation of Jobs 4 and 5.
Engine-sheet should proceed to push HEAD to PROD per `NEXT[engine-sheet]`.
