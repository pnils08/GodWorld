---
title: Adversarial Diff Review of engine.254 Task 6 (commits 67a8a912 & d257bd99)
created: 2026-09-30
updated: 2026-09-30
type: reference
tags: [engine, review, adversarial, care-justice, judicial, task6]
sources:
  - docs/plans/2026-09-21-care-and-justice-system.md
  - docs/research/2026-09-30-kimi-task6-cut.md
  - phase01-config/godWorldEngine2.js
  - phase04-events/careJusticeService.js
  - phase04-events/chaosCarsEngine.js
  - phase04-events/generationalEventsEngine.js
  - phase05-citizens/generateCivicModeEvents.js
  - phase05-citizens/generateMediaModeEvents.js
  - phase05-citizens/judicialLifecycle.js
  - phase05-citizens/runCareerEngine.js
  - phase05-citizens/runHouseholdEngine.js
  - phase10-persistence/buildCyclePacket.js
  - scripts/judicialLifecycle.test.js
  - scripts/hospitalIncomePersistence.test.js
  - scripts/careJusticeService.test.js
  - phase04-events/chaosCarsEngine.test.js
  - scripts/hospitalTalkback.test.js
pointers:
  - "[[plans/2026-09-21-care-and-justice-system]] — Task 6 cut specification"
  - "[[research/2026-09-30-kimi-task6-cut]] — prior cut review"
---

# Adversarial Code Review: Commits 67a8a912 & d257bd99 (engine.254 Task 6)

**Date:** 2026-09-30  
**Reviewer:** Antigravity (Standing Adversarial Reviewer)  
**Target Commits:**  
1. [`67a8a912`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js) (`engine.254 Task 6: detained gates, custody carried by the case`)  
2. [`d257bd99`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js) (`engine.254 Task 6: detained care admission with no open case logs blank PriorStatus instead of throwing (stranded-custody Cycle); reconcile gravity recorded as a build default`)  
**Spec Reference:** [`docs/plans/2026-09-21-care-and-justice-system.md:553-592`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L553-L592) (`### Task 6 cut — detained gates, custody carried by the case`), including folds from [`docs/research/2026-09-30-kimi-task6-cut.md`](file:///root/GodWorld/docs/research/2026-09-30-kimi-task6-cut.md)  
**Scope Inspected:** `phase01-config/`, `phase04-events/`, `phase05-citizens/`, `phase10-persistence/`, `scripts/`, `docs/`

---

## Executive Summary

| # | Hunt Target | Target Files & Lines | Status | Verdict | Summary |
|---|---|---|---|---|---|
| **H-01** | **Silent fallbacks** | [`phase05-citizens/judicialLifecycle.js:150-172, 287-300, 325-341`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L150-L172), [`phase10-persistence/buildCyclePacket.js:866-867, 1020-1031`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L866-L867) | **CONTRADICTED** | **SHIP** | Strict fail-loud discipline enforced across all rates, tabs, column counts, receipt objects, and casing invariants. The only non-throw fallback is `judicialPriorStatusForCare_` returning `''` and logging via `Logger.log` when a stranded-detained citizen enters care, which is an intentional build default folded in `d257bd99` to protect `Phase5-Generational` from failing before `Phase5-Judicial` reconciles custody. |
| **H-02** | **Status vs Case disagreement** (arrest in care, death, trade/inactive, re-arrest, reconcile, skipped Cycle) | [`phase04-events/chaosCarsEngine.js:464, 681-687`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L464), [`phase05-citizens/judicialLifecycle.js:389-450`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L389-L450), [`phase10-persistence/buildCyclePacket.js:1053-1088`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1053-L1088) | **CONTRADICTED** | **SHIP** | Status and case remain synchronized in all 6 edge cases. Health outranks custody (arrest in care emits no receipt/flip; care during custody protects status; discharge triggers re-assert); death precedes decisions and closes deceased; trade/inactive close as `<status>-reconciled` without resurrecting status; same-cycle re-arrest is mutated to transition and cross-cycle is target-excluded; reconcile self-heals stranded custody; monotone clocks catch up skipped cycles deterministically. |
| **H-03** | **Hospital_Ledger Column P (`PriorStatus`)** | [`phase04-events/generationalEventsEngine.js:173-204, 434-436, 680-681`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L173-L204), [`phase10-persistence/buildCyclePacket.js:866-867, 896-904`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L866-L867) | **CONTRADICTED** | **SHIP** | Column P is strictly located at column 16 (index 15) and asserted by name. Both writer and discharge reader throw if `PriorStatus` is `detained`. Detained care admission resolves underlying pre-custody life-state in Phase 5 from the open case. Discharge restores exact string casing and clears `StatusStartCycle`. Pre-P legacy rows safely restore to `active`. |
| **H-04** | **persistJudicialLedger_ row handling** | [`phase10-persistence/buildCyclePacket.js:1015-1115`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1015-L1115) | **CONTRADICTED** | **SHIP** | Exactly 21 columns wide, resolved by header name. Enforces one open row per POPID: throws on duplicate open rows during preload; intake on an open case updates rather than appending. Handles two receipt shapes: same-cycle re-arrest transition preserves `StatusNow` without blanking; disposition closures require `outcome` and `cyclesHeld`. Census computed over remaining open rows. |
| **H-05** | **RNG isolation (`seededRngFor_` vs `ctx.rng`)** | [`phase05-citizens/judicialLifecycle.js:13, 124-129, 428`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L13) | **CONTRADICTED** | **SHIP** | All lifecycle decision draws strictly invoke `seededRngFor_(Number(c.DecisionCycle), 'judicial:' + c.SourceEventId)`. Zero usage of `ctx.rng` for judicial decisions. Decisions are deterministic and replay-stable across cycles without shifting other engines' draw streams. |
| **H-06** | **Weakened or source-text-only tests** | [`scripts/judicialLifecycle.test.js`](file:///root/GodWorld/scripts/judicialLifecycle.test.js), [`scripts/hospitalIncomePersistence.test.js`](file:///root/GodWorld/scripts/hospitalIncomePersistence.test.js) | **CONTRADICTED** | **SHIP** | Tests are exhaustive and behavioral. 84 asserts in `judicialLifecycle.test.js` and 54 in `hospitalIncomePersistence.test.js` execute full multi-cycle VM state machines, verifying intake mapping, idempotence, re-arrest preservation, GAME clock protection, death precedence, care precedence, stranded reconcile, duplicate open row throws, and mode event gating. Zero regex or source-text asserts. |
| **H-07** | **Participation read sites & downstream readers** | [`phase04-events/careJusticeService.js:129`](file:///root/GodWorld/phase04-events/careJusticeService.js#L129), [`phase04-events/chaosCarsEngine.js:202`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L202), [`phase05-citizens/runCareerEngine.js:934`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js#L934), [`phase05-citizens/runHouseholdEngine.js:508`](file:///root/GodWorld/phase05-citizens/runHouseholdEngine.js#L508), [`scripts/sportsFeedWriter.js:457`](file:///root/GodWorld/scripts/sportsFeedWriter.js#L457), [`lib/wakePerception.js:529`](file:///root/GodWorld/lib/wakePerception.js#L529) | **CONTRADICTED** | **SHIP** | Gated at career, household, civic mode, media mode, and chaos target pools. Downstream readers are protected: sports feed 422 gate is protected by exempting `ClockMode === 'GAME'` from custody flips; wake perception fails open with empty string; crons read `Hospital_Ledger.StatusNow` and are unaffected. Council availability left ungated per F9. Parity rule with hospitalized citizens upheld. |

**Overall Verdict:** **SHIP**

---

## Detailed Findings

### H-01: Silent Fallbacks vs. Fail-Loud Validation
- **Files & Lines:**
  - [`phase05-citizens/judicialLifecycle.js:150-172`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L150-L172) (`loadJudicialRates_`)
  - [`phase05-citizens/judicialLifecycle.js:287-300`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L287-L300) (`judicialCaseData_`)
  - [`phase05-citizens/judicialLifecycle.js:325-341`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L325-L341) (`judicialPriorStatusForCare_`)
  - [`phase10-persistence/buildCyclePacket.js:866-867`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L866-L867) (`persistHospitalLedger_`)
  - [`phase10-persistence/buildCyclePacket.js:1017-1031`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1017-L1031) (`persistJudicialLedger_`)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. `loadJudicialRates_` verifies all 5 keys exist, are finite numbers, and that release + diversion + held rates sum to $1 \pm 0.001$. Any deviation throws immediately naming the key.
  2. `judicialCaseData_` throws if `Judicial_Ledger` cache is missing, tab is missing, any of the 21 columns is missing from the header row, or if multiple open rows exist for the same POPID.
  3. `persistJudicialLedger_` calls `requireTab_('Judicial_Ledger')` (fail-loud, never creating mid-run per engine.119), asserts header existence, asserts that the column count is exactly 21, and asserts that every expected field exists.
  4. In `judicialPriorStatusForCare_`, commit [`d257bd99`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L332-L338) caught the edge case where a stranded detained citizen (whose Phase 10 case write failed in an earlier cycle) enters care:
     ```javascript
     if (!open) {
       if (typeof Logger !== 'undefined') Logger.log('judicialLifecycle: detained ' + popId + ' admitted to care with no open case — PriorStatus blank');
       return '';
     }
     ```
     This fallback was an intentional, documented advisor follow-up recorded in the plan ([`docs/plans/2026-09-21-care-and-justice-system.md:583`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L583)). If it threw, `Phase5-Generational` would crash the entire cycle before reaching `Phase5-Judicial` (which heals the stranded custody). Returning `''` allows the hospital row to record known-blank PriorStatus, which safely restores to `'active'` at discharge.
  5. `hospitalPriorStatusForDischarge_` in [`phase04-events/generationalEventsEngine.js:173-204`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L173-L204) throws if cache, tab, or required headers are missing, throws if duplicate open rows exist, and throws if column P is `'detained'`.

---

### H-02: Status and Case Synchronization
- **Files & Lines:**
  - [`phase04-events/chaosCarsEngine.js:464, 681-687`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L464)
  - [`phase05-citizens/judicialLifecycle.js:389-450`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L389-L450)
  - [`phase10-persistence/buildCyclePacket.js:1053-1088`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1053-L1088)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  Every edge-case path was audited to ensure `Simulation_Ledger.Status` and `Judicial_Ledger` open rows never desynchronize:
  1. **Arrest while in care:** Line 464 of `chaosCarsEngine.js` gates `if (CHAOS_HEALTH_STATES.indexOf(curStatusW) < 0)`. If a citizen is in hospital, no judicial receipt is created and line 683 bypasses the status flip. Care outranks custody by construction (R4). If an already detained citizen is admitted to care via ordinary health, `carePriorStatus` takes the underlying life-state via `judicialPriorStatusForCare_` ([`generationalEventsEngine.js:680`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L680)), Status flips to the care state, and the judicial case remains open. If the judicial case resolves while in care, `judicialSetStatus_` is skipped via `!judicialHealthStatus_(lower)` ([`judicialLifecycle.js:439`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L439)). When medical recovery occurs, discharge restores the underlying life-state, and Phase5-Judicial immediately re-asserts `detained` if the case is still open ([`judicialLifecycle.js:445`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L445)).
  2. **Death:** In `judicialLifecycle.js:420-427`, `lower === 'deceased'` is evaluated before any case decision. The case is closed with `Outcome = 'deceased'`, `StatusNow = 'closed'`, `ResolveCycle = cycle`, and an `exit` receipt is pushed. The citizen is never recorded as released.
  3. **Trade / Inactivation:** In `judicialLifecycle.js:420-427`, `lower === 'traded' || lower === 'inactive'` closes the case with `Outcome = lower + '-reconciled'`, `StatusNow = 'closed'`, `ResolveCycle = cycle`. The citizen's ledger Status is left as `'traded'` or `'inactive'`, preventing resurrection.
  4. **Re-arrest:** Same-cycle re-arrest is converted to a transition receipt by `admitJudicialReceipt_` ([`judicialLifecycle.js:186-194`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L186-L194)). In `persistJudicialLedger_` ([`buildCyclePacket.js:1067`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1067)), the transition receipt updates `LastTransitionCycle` and `reArrestEventId` without blanking `StatusNow`. Cross-cycle re-arrest is prevented because `detained` citizens are excluded from target selection (`chaosCarsEngine.js:202`, `careJusticeService.js:129`).
  5. **Reconcile:** A stranded citizen with Status `'detained'` but no open case in `Judicial_Ledger` is detected at `judicialLifecycle.js:389-403`. A synthetic `reconcile` intake is generated (`SourceSystem: 'reconcile'`, `ChargeGravity: 'minor'`, `PriorStatus: ''`). It is opened in memory, recorded on `Judicial_Ledger` in Phase 10 as `pending`, decides at `cycle + 1`, and exits restoring `active`.
  6. **Skipped Cycle:** `advanceCase_` relies on monotone clock checks (`cycle >= judicialClock_(c, 'DecisionCycle')` and `cycle >= judicialClock_(c, 'HeldUntilCycle')`). Because decisions are seeded by `Number(c.DecisionCycle)`, evaluating a decision at `cycle > DecisionCycle` yields the exact pseudo-random decision stream as if evaluated on time.

---

### H-03: Hospital_Ledger Column P (`PriorStatus`)
- **Files & Lines:**
  - [`phase04-events/generationalEventsEngine.js:173-204`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L173-L204) (`hospitalPriorStatusForDischarge_`)
  - [`phase04-events/generationalEventsEngine.js:434-436`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L434-L436) (discharge restore)
  - [`phase04-events/generationalEventsEngine.js:680-681, 706`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L680-L681) (ordinary admission)
  - [`phase10-persistence/buildCyclePacket.js:866-867, 896-904`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L866-L867) (`persistHospitalLedger_`)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. **Schema Position:** Column P is column index 15 (16th column). `persistHospitalLedger_` explicitly validates `data[0].indexOf('PriorStatus') !== 15` and throws if displaced ([`buildCyclePacket.js:866-867`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L866-L867)). Rows appended at admission are 16 cells wide with `priorStatus` at index 15 ([`buildCyclePacket.js:901-903`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L901-L903)).
  2. **Never Detained Invariant:**
     - Enforced at admission write: `if (String(priorStatus).trim().toLowerCase() === 'detained') throw new Error('Hospital_Ledger.PriorStatus cannot be detained for ' + key);` ([`buildCyclePacket.js:898-900`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L898-L900)).
     - Enforced at discharge read: `if (String(prior).trim().toLowerCase() === 'detained') throw new Error('generationalEvents: Hospital_Ledger.PriorStatus cannot be detained for ' + popId);` ([`generationalEventsEngine.js:196-198`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L196-L198)).
  3. **Admission Resolution in Phase 5:** For a detained citizen admitted to care, `carePriorStatus = judicialPriorStatusForCare_(ctx, popId, ledgerStatus)` looks up the open judicial case in Phase 5, copying the pre-custody `PriorStatus` onto the hospital admission receipt.
  4. **Casing & Lifecycle Reset:** When discharged to `active`, `hospitalPriorStatusForDischarge_` restores the exact string casing of `PriorStatus` (e.g. `'Retired'`), and `row[iStatusStart]` is cleared to `""` ([`generationalEventsEngine.js:465-470`](file:///root/GodWorld/phase04-events/generationalEventsEngine.js#L465-L470)). Pre-P legacy rows return `''` and default cleanly to `'active'`.
  5. **Discharge Condition Expansion:** In [`phase10-persistence/buildCyclePacket.js:909`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L909), `persistHospitalLedger_` was generalized from `ev.to === 'active' || ev.to === 'deceased'` to `ev.to !== undefined && ev.to !== null && ev.to !== ''`. This ensures discharges to non-active life-states like `'Retired'` properly close open hospital rows.

---

### H-04: persistJudicialLedger_ Row Handling & Schemas
- **Files & Lines:**
  - [`phase10-persistence/buildCyclePacket.js:1015-1115`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1015-L1115)
  - [`docs/engine/SHEETS_MANIFEST.md:127`](file:///root/GodWorld/docs/engine/SHEETS_MANIFEST.md#L127)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. **Pre-Created Tab & 21 Columns:** `requireTab_(ctx.ss, 'Judicial_Ledger')` enforces that the tab must pre-exist. The writer asserts `data[0].length === 21` and resolves all 21 field indices dynamically by header name.
  2. **One Open Row per POPID:** The preload loop indexes open rows (`ResolveCycle === ''`). If a second open row is found for any POPID, it throws immediately: `if (open.hasOwnProperty(pop)) throw new Error('Judicial_Ledger has two open rows for ' + pop);` ([`buildCyclePacket.js:1042`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1042)).
  3. **Receipt Shapes:**
     - Intakes append a 21-element row and register `open[key] = rowIndex`. If an intake arrives for an already open POPID, it updates `LastTransitionCycle` instead of appending a duplicate row ([`buildCyclePacket.js:1056`](file:///root/GodWorld/phase10-persistence/buildCyclePacket.js#L1056)).
     - Transitions check `if (ev.statusNow !== undefined) row[cols.StatusNow] = ev.statusNow;`. Same-cycle re-arrest receipts omit `statusNow`, preserving the existing `pending` or `held` state.
     - Transitions and exits closing a case assert that `resolveCycle`, `outcome`, and `cyclesHeld` are defined before closing the case and deleting `open[key]`.
  4. **Census:** Lines 1099–1106 compute `judicialCensus = { pending: 0, held: 0 }` over active open cases.
  5. **Carve-out Manifest:** Registered in [`docs/engine/SHEETS_MANIFEST.md:127`](file:///root/GodWorld/docs/engine/SHEETS_MANIFEST.md#L127) under class `phase10-loc`.

---

### H-05: RNG Isolation and Replay Stability
- **Files & Lines:**
  - [`phase05-citizens/judicialLifecycle.js:13-14, 124-129, 428`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L13-L14)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. Lifecycle decisions at line 428 strictly use:
     ```javascript
     var rng = seededRngFor_(Number(c.DecisionCycle), 'judicial:' + c.SourceEventId);
     ```
  2. Global engine randomness (`ctx.rng`) is never touched for judicial decisions.
  3. Decisions depend strictly on the case's fixed `DecisionCycle` and `SourceEventId`. Because `DecisionCycle` does not advance on a missed cycle, replaying or catching up on a skipped cycle produces the exact same decision and held length.
  4. `judicialDraw_` ([`judicialLifecycle.js:124-129`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L124-L129)) enforces that `rng` must be a function, throwing if missing.

---

### H-06: Test Rigor & Integrity
- **Files & Lines:**
  - [`scripts/judicialLifecycle.test.js:390-585`](file:///root/GodWorld/scripts/judicialLifecycle.test.js#L390-L585)
  - [`scripts/hospitalIncomePersistence.test.js:424-515`](file:///root/GodWorld/scripts/hospitalIncomePersistence.test.js#L424-L515)
  - [`scripts/careJusticeService.test.js:295-300`](file:///root/GodWorld/scripts/careJusticeService.test.js#L295-L300)
  - [`phase04-events/chaosCarsEngine.test.js:89-98`](file:///root/GodWorld/phase04-events/chaosCarsEngine.test.js#L89-L98)
  - [`scripts/hospitalTalkback.test.js:115-245`](file:///root/GodWorld/scripts/hospitalTalkback.test.js#L115-L245)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. No weakened or source-text regex tests exist. All assertions inspect runtime state or thrown error names.
  2. `scripts/judicialLifecycle.test.js` (84 tests):
     - Reverse field order testing in fixture to prove column-name mapping (`fx.fields.reverse()`).
     - Multi-cycle progression through intake (pending), decision (+1 held), and completion (+2 held-served).
     - Idempotence verification (second call in same cycle produces 0 new events).
     - State precedence: death overrides decision; care state outranks custody; GAME clock retains status; traded/inactive close with reconciliation.
     - Stranded custody reconcile case opening and exit restore to `active`.
     - Error throwing: missing tab, missing headers, missing rate keys, and duplicate open POPIDs.
  3. `scripts/hospitalIncomePersistence.test.js` (54 tests):
     - Detained admission writing case PriorStatus to column P.
     - Discharge restoring casing (`Retired` -> `Retired`) and closing hospital row.
     - Pre-P legacy rows restoring to `active`.
     - Missing-bed transitions admitting with blank P.
     - Admission receipts across ordinary, heat, and ambulance preserving exact casing.
     - Career and household engines skipping detained citizens with zero RNG draws.

---

### H-07: Participation Gates and Downstream Readers
- **Files & Lines:**
  - [`phase04-events/careJusticeService.js:129`](file:///root/GodWorld/phase04-events/careJusticeService.js#L129) (`careJusticeResidentIndex_`)
  - [`phase04-events/chaosCarsEngine.js:202`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L202) (`pickCitizenTarget_`)
  - [`phase05-citizens/runCareerEngine.js:934`](file:///root/GodWorld/phase05-citizens/runCareerEngine.js#L934) (`runCareerEngine_`)
  - [`phase05-citizens/runHouseholdEngine.js:508`](file:///root/GodWorld/phase05-citizens/runHouseholdEngine.js#L508) (`runHouseholdEngine_`)
  - [`phase05-citizens/generateCivicModeEvents.js:396`](file:///root/GodWorld/phase05-citizens/generateCivicModeEvents.js#L396) (`generateCivicModeEvents_`)
  - [`phase05-citizens/generateMediaModeEvents.js:346`](file:///root/GodWorld/phase05-citizens/generateMediaModeEvents.js#L346) (`generateMediaModeEvents_`)
  - [`scripts/sportsFeedWriter.js:457`](file:///root/GodWorld/scripts/sportsFeedWriter.js#L457) (`assertStatCitizenEligible`)
  - [`lib/wakePerception.js:529`](file:///root/GodWorld/lib/wakePerception.js#L529) (`HEALTH_STATES` regex)
  - [`scripts/cron-work-wake.js:100`](file:///root/GodWorld/scripts/cron-work-wake.js#L100) (`Hospital_Ledger` status read)
- **Status:** **CONTRADICTED**
- **Verdict:** **SHIP**
- **Verification Details:**
  1. **Exclusions Added:** `detained` is excluded from career rolls, household events, civic mode events, media mode events, and chaos target selection.
  2. **Sports Feed Integrity:** `scripts/sportsFeedWriter.js:457` and `dashboard/sportsRoutes.js:766` throw 422 `sports_participant_state_invalid` on non-active/non-recovering citizens. Task 6 protects athletes by explicitly exempting `ClockMode === 'GAME'` from status flips at arrest ([`chaosCarsEngine.js:682`](file:///root/GodWorld/phase04-events/chaosCarsEngine.js#L682)), custody re-assert ([`judicialLifecycle.js:449`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L449)), and exit restore ([`judicialLifecycle.js:443`](file:///root/GodWorld/phase05-citizens/judicialLifecycle.js#L443)).
  3. **Wakes & Crons:** `lib/wakePerception.js:529` checks an inclusion regex of health states; for `detained`, it returns `''` safely without throwing. `scripts/cron-work-wake.js:100` and `scripts/civicPetitions.js:29` read `Hospital_Ledger.StatusNow`, not `Simulation_Ledger.Status`.
  4. **Council Availability:** Per Kimi finding F9, council availability is left ungated because council members' primary status resides on `Civic_Office_Ledger`, which is untouched by arrest. `civicInitiativeEngine.js` was deliberately left unmodified.
  5. **Parity Rule:** Consistent with hospitalized citizens, generational milestones, births, graduations, and education-career accrual were intentionally left ungated.

---

## Observations & Minor Documentation Notes

1. **Spec Plan Test Text Remnant (Cosmetic):**
   In [`docs/plans/2026-09-21-care-and-justice-system.md:589`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L589), the test summary line still mentions `counted unavailable in council state`. This is a stale text leftover from the initial draft; the actual specification under Mechanism 5 ([`line 577`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L577)), Kimi Review outcome ([`line 581`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L581)), and Unruled Decisions ([`line 587`](file:///root/GodWorld/docs/plans/2026-09-21-care-and-justice-system.md#L587)) correctly state that council availability is left ungated per F9.
2. **Function Collision Audit:**
   `scripts/auditFunctionCollisions.js` passes with 0 collisions across all 1,493 top-level functions in the clasp-pushed scope.

---

## Conclusion & Recommendation

Both commits `67a8a912` and `d257bd99` faithfully and robustly fulfill the folded Task 6 specification. The custody lifecycle, hospital column P persistence, fail-loud error handling, RNG isolation, and participation parity rules are sound and fully covered by behavioral tests.

**Recommendation:** **SHIP**
