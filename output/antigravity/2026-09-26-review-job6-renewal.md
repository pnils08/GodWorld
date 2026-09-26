# Adversarial Review: Initiatives in the World Job 6 — Renewal (`51b604bb`, `9efb1c5e`, `65a115f1`, `fd6d3b0a`)

**Date:** 2026-09-26  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commits:**
- `51b604bb` — Job 6 engine: renewal vote (Phase 5) + credit next fire (Phase 2) + dry-close revival
- `9efb1c5e` — Job 6 moves: `renew` seat move, Sunday renew sweep, allowlists, board flag
- `65a115f1` — Job 6: renewal vote fires when due or overdue (a skipped fire never strands it)
- `fd6d3b0a` — Job 6 test: the reopen counts as one phase advance, at the fire after the credit
- `8c16432e` — Job 6: C119 overdue-gate bench proof; reopen counts once next fire; smoke note on Node-ahead-of-engine renew

**Files Inspected:**
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`ensureInitiativeRenewalColumns_`, `INITIATIVE_RENEWAL_COLUMNS_`, `INITIATIVE_RENEWABLE_PHASES_`, `renewalDryClosePhase_`, `renewalMoneyText_`, `renewalEligibility_`, Phase 5 renewal vote loop)
- [`phase02-world-state/applyInitiativeImplementationEffects.js`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js) (`planRenewalCredit_`, `planInitiativeSpend_` `renewed` flag, `renewalSlice`, in-memory reopen handling, next-fire advance handling)
- [`phase05-citizens/householdFormationEngine.js`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js) (`applyFundDisbursementBody_` `(was <phase>)` dry-close note)
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`RENEWAL_COLUMNS`)
- [`scripts/cron-civic-run.js`](file:///root/GodWorld/scripts/cron-civic-run.js) (`MOVE_TYPES`, `renewEligibility`, `validateDatawakeMoves`, `renewSweep`, `closeDeterministic`)
- [`scripts/applyTrackerUpdates.js`](file:///root/GodWorld/scripts/applyTrackerUpdates.js) (`WRITEBACK_FIELDS`, `normalizeTrackerWrite`, `renewOutcome`, move ledger status logging)
- [`scripts/civicInterventionValidation.js`](file:///root/GodWorld/scripts/civicInterventionValidation.js) (`renewRowIssue`, `renewDryClosePhase`, `RENEWABLE_PHASES`)
- [`scripts/buildCivicOfficeSlice.js`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js) (`boardRowsFor`, `boardBlock`)
- [`scripts/initiativeSpend.test.js`](file:///root/GodWorld/scripts/initiativeSpend.test.js) (42 assertions)
- [`scripts/cron-civic-tick.test.js`](file:///root/GodWorld/scripts/cron-civic-tick.test.js) (62 assertions)
- [`scripts/applyTrackerUpdates.gate.test.js`](file:///root/GodWorld/scripts/applyTrackerUpdates.gate.test.js) (34 assertions)
- [`docs/plans/2026-09-24-initiatives-in-the-world.md`](file:///root/GodWorld/docs/plans/2026-09-24-initiatives-in-the-world.md) (Job 6 design + C117–C119 bench proofs)

---

## Executive Verdict

**CLEAN PASS (VERIFIED RESILIENT & BENCH-PROVEN):**  
Job 6 establishes a rigorous renewal lifecycle for running and dry-closed civic initiatives, fulfilling the builder direction that valuable city programs (such as OARI, the Temescal Health Center, and the Stabilization Fund) should be renewed on their existing rows rather than expiring and cluttering the tracker with duplicate entities.

Key architectural mechanisms verified:
1. **Dedicated Second-Vote Column Topology:**
   `RenewalVoteCycle`, `RenewalAmount`, `RenewalOutcome`, and `RenewalCreditCycle` self-arm on `Initiative_Tracker`. The original legislative record (`VoteCycle`, `Outcome`, `Status`) is preserved untouched.
2. **Re-Fire Receipt Idempotence:**
   Non-blank `RenewalOutcome` prevents re-voting; non-blank `RenewalCreditCycle` prevents re-crediting. Same-cycle re-fires and subsequent cycle runs safely no-op.
3. **Intent Priority Decoupling & Fund Parity:**
   Renewal credit cell intents queue at priority 4, ensuring balance availability ahead of priority 5 spend/disbursement intents. The Stabilization Fund's Phase 5 tranche reads the credited balance directly from `S.initiativeDisbursement`.
4. **Targeted Capital True-Down Exemption:**
   `planInitiativeSpend_` exempts legitimately credited rows (`input.renewed`) from the operational floor clamp, while strictly retaining the true-down for non-renewed rows holding legacy unspent capital.
5. **Vote Isolation:**
   `resolveCouncilVote_` runs against council factions, sentiment, swing voters, and demographics at the row's `VoteRequirement`, but its output is mapped strictly to `RenewalOutcome`, `MilestoneNotes`, `initiativeEvents`, and story hooks. Zero leakage into `Status` or `Outcome`.
6. **Robust Sunday Fold Gating:**
   The Sunday sweep blanks previous renewal receipts. Staging failures (e.g. missing sheet columns before engine self-arm) report warnings and record `status: 'failed'` in the move ledger rather than false `applied` records.
7. **Due-or-Overdue Vote Scheduling:**
   The vote gate `rVoteCycle <= cycle` guarantees that skipped engine cycles never strand pending renewal votes, proven on SANDBOX C119.
8. **Phase Advance Conservation (§15 Aftermath):**
   Reopening a dry-closed program registers as a single phase advance at the cycle *after* credit lands (matching the one-fire lag of T7 and live ledger snapshots), never inflating immediately or looping indefinitely.

Touched tests pass 100% (42/42 spend assertions, 62/62 tick tests, 34/34 gate tests). Zero regressions or safety violations detected.

---

## Detailed Audit Against Directives

### 1. The Re-Fire Receipt — No Re-Vote, No Re-Credit
**Finding: VERIFIED RESILIENT (STRICT IDEMPOTENCE).**

- **Vote Gate ([`phase05-citizens/civicInitiativeEngine.js:606-608`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L606-L608)):**
  ```javascript
  var rVoteCycle = Number(rRow[iRenewVote]) || 0;
  if (!rVoteCycle || rVoteCycle > cycle) continue;
  if (String(rRow[iRenewOut] == null ? '' : rRow[iRenewOut]).trim() !== '') continue;
  ```
  Once the council votes, `rRow[iRenewOut]` is stamped with `'RENEWED ...'`, `'RENEWAL FAILED ...'`, or `'RENEWAL VOID ...'`. On any subsequent cycle or same-cycle re-fire, `String(rRow[iRenewOut]).trim() !== ''` halts execution immediately. A second vote cannot be taken without a new staging that explicitly blanks `RenewalOutcome`.
- **Credit Gate ([`phase02-world-state/applyInitiativeImplementationEffects.js:387-393, 817-824`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L387-L393)):**
  ```javascript
  function planRenewalCredit_(input) {
    if (String(input.outcome == null ? '' : input.outcome).trim().indexOf('RENEWED') !== 0) return null;
    if (String(input.creditCycle == null ? '' : input.creditCycle).trim() !== '') return null;
    ...
  }
  ```
  When the credit applies, `applyInitiativeImplementationEffects_` queues `queueCellIntent_` for `RenewalCreditCycle = implCycle` and sets `row[iRenewCredit] = implCycle`. On any re-fire, `input.creditCycle` is non-blank, causing `planRenewalCredit_` to return `null`. Duplicate disbursement is mathematically impossible.

---

### 2. Credit Priority 4 vs Spend/Fund Priority 5 & Fund Tranche Interaction
**Finding: VERIFIED RESILIENT (CORRECT CELL ORDER & LIVE BALANCE PROPAGATION).**

- **Priority Hierarchy:**
  - Renewal credit cell intent: priority **4** ([`applyInitiativeImplementationEffects.js:393`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L393)).
  - Job 5 operating spend cell intent: priority **5** ([`applyInitiativeImplementationEffects.js:573`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L573)).
  - Stabilization Fund household disbursement intent: priority **5** ([`householdFormationEngine.js:1310`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js#L1310)).
- **In-Memory Order Within Phase 2:**
  When credit is granted:
  `row[iBudgetRemaining] = rc.newRemaining;`
  `row[iRenewCredit] = implCycle;`
  The in-memory row is updated before the Job 5 spend block or the fund disbursement block evaluates.
- **Fund Tranche Evaluation:**
  For the Stabilization Fund (which runs in `disbursement-active`):
  `pendingDisbursement` captures `dRemaining = row[iBudgetRemaining]`, which already incorporates the renewal credit.
  In Phase 5, `householdFormationEngine.js` reads `program.remaining` from `S.initiativeDisbursement`, deducting the $400k tranche from the newly topped-up balance.
  In Phase 10, the priority 4 credit write is flushed, followed by priority 5 net debits. No balance race condition exists.

---

### 3. Capital True-Down Exemption (`planInitiativeSpend_`)
**Finding: VERIFIED RESILIENT (PREVENTS ERASURE OF RENEWAL FUNDS).**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:567, 856-859`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L567)
- **The Mechanic:**
  Under Job 5, non-renewed running programs enforce:
  `var base = Math.min(remaining, floor);`
  Where `floor = total * (1 - capitalShare)`.
  When a program receives a renewal credit, its `BudgetRemaining` rises above `floor` while `BudgetTotal` remains unchanged (preserving the weekly operational cost burn rate `floor / 52`).
  To prevent the Job 5 true-down from instantly shaving off the renewal funds:
  ```javascript
  var base = input.renewed ? remaining : Math.min(remaining, floor);
  newRemaining = Math.max(0, base - floor / Number(d.operatingWeeks));
  ```
- **Adversarial Gate Check:**
  `input.renewed` is defined as:
  `renewed: iRenewCredit !== -1 && String(row[iRenewCredit] == null ? '' : row[iRenewCredit]).trim() !== ''`
  A row can ONLY have `input.renewed === true` if `RenewalCreditCycle` has been stamped with a valid cycle number following a council `RENEWED` vote.
  For all non-renewed programs, `row[iRenewCredit]` is blank, ensuring `input.renewed === false`. Non-renewed initiatives remain strictly subject to the capital true-down clamp.

---

### 4. `resolveCouncilVote_` Isolation — Zero Status/Outcome Leakage
**Finding: VERIFIED STRICT (HISTORICAL RECORDS PRESERVED).**

- **Code Path:** [`phase05-citizens/civicInitiativeEngine.js:622-646`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L622-L646)
- **Verification:**
  - Renewal votes leverage the full civic simulation engine: council factions, mayor veto/alignment, citizen sentiment, swing voters (primary/secondary/lean), and neighborhood demographics.
  - From the result object `rResult`:
    - `rPassed = rResult.status === 'passed'`
    - Writes exclusively to `rRow[iRenewOut]` (`RenewalOutcome`).
    - Writes narrative update to `rRow[iNotes]` (`Notes`).
    - Pushes event to `S.initiativeEvents`, `S.votesThisCycle`, and `S.storyHooks`.
  - `rRow[iStatus]` (`Status`) is **never modified**.
  - `rRow[iOutcome]` (`Outcome`) is **never modified**.
  - `rRow[iVoteCycle]` (`VoteCycle`) is **never modified**.
  - Proven on SANDBOX C117: INIT-002 renewal failed (4-5), leaving its historical `Status: passed` and `Outcome: PASSED (5-4)` 100% intact.

---

### 5. Sunday Fold Staging & Move Ledger Accounting
**Finding: VERIFIED RESILIENT (ZERO FALSE 'APPLIED' ENTRIES).**

- **Code Path:** [`scripts/applyTrackerUpdates.js:247-268, 615-620, 769-774`](file:///root/GodWorld/scripts/applyTrackerUpdates.js#L247-L268)
- **Receipt Clearing:**
  When `renewSweep` schedules a renewal for cycle `cycle + 1`, `normalizeTrackerWrite` sets:
  ```javascript
  setField('RenewalVoteCycle', n);
  setField('RenewalAmount', String(tu.RenewalAmount).trim());
  setField('RenewalOutcome', '');
  setField('RenewalCreditCycle', '');
  ```
  Explicitly blanking `RenewalOutcome` and `RenewalCreditCycle` clears prior vote receipts, arming the engine for the upcoming vote.
- **Defensive Pre-Flight & Move Ledger Logging:**
  If the sheet has not yet had its renewal columns self-armed by the engine (e.g. before the first post-Job 6 cycle fire), or if `RenewalVoteCycle` is not a forward cycle:
  - `normalizeTrackerWrite` drops the fields and pushes a descriptive warning to `warnings`.
  - In `main()`:
    ```javascript
    const staged = updates.RenewalVoteCycle !== undefined || ...;
    renewOutcome[dec.initiativeId] = staged ? true : (gateWarnings.find(w => /renewal|Renewal/.test(w)) || 'renewal not written');
    ```
  - Move ledger writer:
    `const ok = writeOutcome[initId] === true ? renewOutcome[initId] : writeOutcome[initId];`
    `status: ok === true ? 'applied' : 'failed'`
  - Result: If staging fails or is skipped, the move is recorded as `status: 'failed'` with the exact gate reason in `output/cron-civic/moves/moves_c{N}.jsonl`. It never falsely posts `applied`.

---

### 6. Due-or-Overdue Vote Gate & C119 Bench Proof
**Finding: VERIFIED RESILIENT & BENCH-PROVEN.**

- **Code Path:** [`phase05-citizens/civicInitiativeEngine.js:606-608`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L606-L608)
- **Defect Resolved in Commit `65a115f1`:**
  The initial draft used `(Number(rRow[iRenewVote]) || 0) === cycle`. If an engine cycle was skipped or delayed, any staged renewal for that cycle would become permanently stranded and never vote.
  Amended to:
  ```javascript
  var rVoteCycle = Number(rRow[iRenewVote]) || 0;
  if (!rVoteCycle || rVoteCycle > cycle) continue;
  ```
  Because the Node gate rejects non-forward cycles at staging time, any `rVoteCycle < cycle` represents an overdue vote from a missed cycle.
- **SANDBOX C119 Live Proof:**
  On SANDBOX @112 (C119), INIT-002 was staged for C118 (`RenewalVoteCycle = 118`).
  The engine evaluated the row at C119:
  - The overdue gate fired (`118 <= 119`), holding the vote: **RENEWED 5-4**.
  - Spend debited normally (12,019,230.76 → 11,538,461.52).
  - 0 new `Engine_Errors` produced.

---

### 7. Reopen Phase Advance Conservation (§15 Aftermath)
**Finding: VERIFIED RESILIENT & UNIT-PROVEN.**

- **Code Path:** [`phase02-world-state/applyInitiativeImplementationEffects.js:425-430`](file:///root/GodWorld/phase02-world-state/applyInitiativeImplementationEffects.js#L425-L430), [`scripts/initiativeSpend.test.js:169-182`](file:///root/GodWorld/scripts/initiativeSpend.test.js#L169-L182)
- **The Lifecycle Trace:**
  When an exhausted program in `complete` is renewed, `planRenewalCredit_` revives it to the phase indicated by the `(was <phase>)` dry-close marker (e.g. `dispatch-live`).
  1. **Credit Fire (Fire N):**
     - In-memory phase is restored to `dispatch-live`.
     - `renewalRevived = true`.
     - Guard fires: `if (renewalRevived) phaseMoved = false;`.
     - `advanced` count for the neighborhood is **0**. The reopening write is queued to Phase 10; the world has not yet operated with the restored program.
  2. **Next Fire (Fire N+1):**
     - `previousCycleState.initiativePhases` recorded `complete` from the previous cycle's snapshot.
     - The sheet at the start of Phase 2 reads `dispatch-live`.
     - `phaseMoved` detects `complete -> dispatch-live`.
     - Because `PHASE_INTENSITY['complete'] >= 0`, the negative intensity stall guard does not block it.
     - `phaseMoved` evaluates to `true`. `advanced` count is **1**. The city registers the reopening as a major civic milestone.
  3. **Subsequent Fire (Fire N+2):**
     - `previousCycleState.initiativePhases` reads `dispatch-live`.
     - The sheet reads `dispatch-live`.
     - `phaseMoved` is `false`. `advanced` count is **0**.
  - This 3-fire progression is pinned and verified in `scripts/initiativeSpend.test.js:170-182`:
    `adv(credit) === 0` → `adv(next) === 1` → `adv(after) === 0`.

---

### 8. Consequence Routing on Failed Renewals
**Finding: VERIFIED RESILIENT (CIVIC REALITY REFLECTS DEFEAT).**

- **Code Path:** [`phase05-citizens/civicInitiativeEngine.js:656-662`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L656-L662)
- **Mechanism:**
  Per builder direction (2026-09-26), the rejection of a running program's renewal must register real emotional and civic weight across Oakland:
  ```javascript
  if (!rPassed) {
    applyInitiativeConsequences_(ctx, { outcome: 'FAILED', affectedNeighborhoods: rHoods,
      policyDomain: iPolicyDomain >= 0 ? String(rRow[iPolicyDomain] || '').trim() : '' }, rName + ' renewal', 'vote');
  }
  ```
- **Verification:**
  - When a renewal fails at council, `applyInitiativeConsequences_` applies the canonical failed vote penalty: citywide sentiment dips (`dynamics.sentiment -= 0.05`), and a negative ripple is registered across the program's target neighborhoods by policy domain.
  - A successful renewal (`rPassed === true`) bypasses this call, correctly treating continuity as maintenance rather than net-new expansion.
  - Aligns with SIM_DOCTRINE §15 / civic consequence parity without mutating initiative status or outcome columns.

---

## Local Validation Results

1. **Targeted Unit Tests:**
   - `node scripts/initiativeSpend.test.js`: **42/42 passed**.
   - `node scripts/applyTrackerUpdates.gate.test.js`: **34/34 passed**.
   - `node scripts/cron-civic-tick.test.js`: **62/62 passed**.
2. **Syntax Validation:**
   - `node --check phase05-citizens/civicInitiativeEngine.js`: Clean.
   - `node --check phase02-world-state/applyInitiativeImplementationEffects.js`: Clean.
   - `node --check scripts/applyTrackerUpdates.js`: Clean.
   - `node --check scripts/cron-civic-run.js`: Clean.
   - `node --check scripts/civicInterventionValidation.js`: Clean.

---

## Recommendation & Next Action

**RECOMMENDATION: PROCEED WITH PROD PUSH.**

Commits `51b604bb`, `9efb1c5e`, `65a115f1`, and `fd6d3b0a` are verified resilient, complete, and bench-proven.
Engine-sheet should proceed to push HEAD to PROD.
