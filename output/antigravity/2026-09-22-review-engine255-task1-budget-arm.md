# Adversarial Review: Initiative Budget Self-Arm (`engine.255` Task 1, `55d1fe1f`)

**Date:** 2026-09-22  
**Reviewer:** Antigravity (Standing Per-Task Review Duty)  
**Target Commit:** `55d1fe1f` (`engine.255 Task 1: Budget parsed and spendable — BudgetTotal / BudgetRemaining / LastDisburseCycle self-arm beside the stage columns and back-fill once from the Budget string`)  
**Target Plan:** [`docs/plans/2026-09-22-initiative-budget-disbursement.md`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md) §Task 1  
**Referenced Prior Reviews:**
- [`output/antigravity/2026-09-22-review-engine255-disbursement.md`](file:///root/GodWorld/output/antigravity/2026-09-22-review-engine255-disbursement.md)
- [`output/kimi/2026-09-22-review-engine255-disbursement.md`](file:///root/GodWorld/output/kimi/2026-09-22-review-engine255-disbursement.md)

**Files Inspected in `55d1fe1f`:**
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`INITIATIVE_BUDGET_COLUMNS_`, `parseBudgetMoney_`, `missingInitiativeBudgetColumns_`, `ensureInitiativeBudgetColumns_`, `planInitiativeBudgetBackfill_`, `backfillInitiativeBudgets_`, lines 130–138, 3062–3152)
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`BUDGET_COLUMNS`, `parseBudgetMoney`, lines 268–290, 892)
- [`lib/initiativePhaseContract.test.js`](file:///root/GodWorld/lib/initiativePhaseContract.test.js) (lines 77–107)
- [`docs/engine/ENGINE_STUB_MAP.md`](file:///root/GodWorld/docs/engine/ENGINE_STUB_MAP.md), [`docs/engine/ENGINE_STUB_REVERSE.json`](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.json), [`docs/engine/ENGINE_STUB_REVERSE.md`](file:///root/GodWorld/docs/engine/ENGINE_STUB_REVERSE.md)

---

## Verdict

**PASS WITH ONE TRACKED OMISSION: Commit `55d1fe1f` cleanly implements Task 1's budget self-arm and backfill, fully resolves the F6 blank-`BudgetTotal` recovery trap, and does not collide with existing `Budget` readers. However, `checkMayoralVeto_` was NOT rewired to `BudgetTotal` in this commit, leaving Acceptance Criterion 5 and the mayoral $50M scrutiny gate unfulfilled until addressed in subsequent tasks.**

---

## Executive Summary

Commit `55d1fe1f` delivers the foundation for initiative budget spending in GodWorld:
1. **Self-Arming Columns:** `INITIATIVE_BUDGET_COLUMNS_` / `BUDGET_COLUMNS` (`BudgetTotal`, `BudgetRemaining`, `LastDisburseCycle`) self-arm on the cycle path in `runCivicInitiativeEngine_` beside the stage columns using standard vector appends.
2. **Text-Identical Pure Parsers with 17-Fixture Parity:** `parseBudgetMoney_` in Apps Script and `parseBudgetMoney` in Node are text-identical, handling `$`, `M`, `B`, `K`, commas, decimals, and surrounding whitespace. Parity is verified across 17 test fixtures in `lib/initiativePhaseContract.test.js`.
3. **F6 Trap Resolution Verified:** The backfill planner checks `tBlank = curT === '' || curT === null || curT === undefined`. This allows amended no-budget proposal rows to recover on future fires once `Budget` is supplied, while preserving already-parsed `BudgetTotal` numbers and existing `BudgetRemaining` spend states.
4. **Collision Analysis on `checkMayoralVeto_` (F5):** The backfill writes exclusively to `BudgetTotal` and `BudgetRemaining`. The display string in `Budget` is untouched. Existing readers of `row[idx('Budget')]` encounter zero type collisions or regressions.
5. **Open Omission (Criterion 5):** `checkMayoralVeto_` still reads `Number(row[idx('Budget')]) || 0` at [`civicInitiativeEngine.js:2396`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L2396). The `> $50M` veto scrutiny check remains dead until rewired to `BudgetTotal`.

---

## Detailed Audit Against Review Directives

### 1. The F6 Blank-`BudgetTotal` Trap: Resolved

- **Mechanism Audited:** [`phase05-citizens/civicInitiativeEngine.js:3122-3136`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3122-L3136)
- **Question:** *Does the backfill actually resolve F6's blank-`BudgetTotal` trap?*
- **Audit Findings:**
  - In initial plan drafts, "never re-parse a row that already carries `BudgetTotal`" threatened to permanently strand rows where `Budget` started blank or unparseable (e.g. `'TBD'`), because `BudgetTotal` was left blank and would never be re-evaluated after an amendment.
  - In `55d1fe1f`, `planInitiativeBudgetBackfill_` implements:
    ```javascript
    var tBlank = curT === '' || curT === null || curT === undefined;
    var rBlank = curR === '' || curR === null || curR === undefined;
    var newT = curT, newR = curR, touched = false;
    if (tBlank) {
      var raw = row[iB];
      var rawBlank = raw === '' || raw === null || raw === undefined;
      if (!rawBlank) {
        var parsed = parseBudgetMoney_(raw);
        if (parsed !== null) { newT = parsed; touched = true; }
        else out.unparsed.push(String(row[header.indexOf('InitiativeID')] || ('row' + (r + 2))) + ':' + String(raw));
      }
    }
    var haveT = !(newT === '' || newT === null || newT === undefined) && isFinite(Number(newT));
    if (rBlank && haveT) { newR = Number(newT); touched = true; }
    if (touched) out.changed++;
    ```
  - **Lifecycle Proof:**
    - **Fresh valid proposal (`INIT-A`, `Budget: "$28M"`, `BudgetTotal: ""`):** `tBlank` is true, `parsed` is `28000000`. Both `BudgetTotal` and `BudgetRemaining` are set to `28000000`. `changed` increments. Stamped.
    - **Fresh unparseable / no-budget proposal (`INIT-D`, `Budget: "TBD"`, `BudgetTotal: ""`):** `tBlank` is true, `parsed` is `null`. `newT` and `newR` remain `""`. Row is logged to `out.unparsed`. Nothing is stamped.
    - **Amended proposal on subsequent fire (`INIT-D` amended to `"$10M"`):** On fire $N+1$, `curT` is still `""` (`tBlank` remains true). It re-reads `raw = "$10M"`, parses `10000000`, and stamps both `BudgetTotal` and `BudgetRemaining`. **The row successfully recovers.**
    - **Already parsed row (`INIT-B`, `Budget: "$45M"`, `BudgetTotal: 45000000`, `BudgetRemaining: 12000000`):** `curT` is non-blank (`tBlank = false`). Re-parsing is skipped. `newT` remains `45000000`. `rBlank` is false (`12000000` is non-blank). `newR` remains `12000000`. No clobbering.
    - **Fully spent row (`BudgetRemaining: 0`):** Because `0 !== ''` and `0 !== null`, `rBlank` evaluates to `false`. `BudgetRemaining` is **not** reset to `BudgetTotal`.
  - **Conclusion:** The F6 trap is completely resolved.

---

### 2. Collision Analysis on `Number(Budget)` & `checkMayoralVeto_` (F5)

- **Mechanism Audited:** [`phase05-citizens/civicInitiativeEngine.js:2396, 2432-2434`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L2396)
- **Question:** *Does the self-arm write collide with anything reading `Number(Budget)` directly (i.e. `checkMayoralVeto_` / F5)?*
- **Audit Findings:**
  1. **No Collision on Storage:**
     - `backfillInitiativeBudgets_` writes only to columns `iT + 1` (`BudgetTotal`) and `iR + 1` (`BudgetRemaining`).
     - The `Budget` column itself is untouched. Display strings like `"$28M"` and `"$2.1B"` are preserved intact for cards, desk packets, and voice packets.
     - A repository-wide audit confirms `checkMayoralVeto_` is the only code in the entire project that performs `Number(Budget)`.
     - Because `Budget` is not modified by the self-arm, `checkMayoralVeto_` behaves identically before and after `55d1fe1f`. It does not crash, throw, or regress.
  2. **Unfulfilled Plan Contract (Acceptance Criterion 5):**
     - Plan Acceptance Criterion 5 ([line 42](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L42)) specifies:
       > "`Number(Budget)` is read nowhere — `checkMayoralVeto_` (`civicInitiativeEngine.js:2388`, the `> 50,000,000` scrutiny term at `:2432`, dead since it was written because `Number('$28M')` is 0) reads `BudgetTotal` instead (builder call 9)."
     - In `55d1fe1f`, line 2396 was left untouched:
       ```javascript
       var budget = Number(row[idx('Budget')]) || 0;
       ```
     - Because `row[idx('Budget')]` is a display string, `budget` evaluates to `0`.
     - Consequently, `if (budget > 50000000)` at line 2432 remains a dead gate (§15) and does not apply to `INIT-006` ($2.1B) or `INIT-003` ($230M).
  - **Recommendation:** Rewire `checkMayoralVeto_` line 2396 to prefer `BudgetTotal`:
    ```javascript
    var iBT = idx('BudgetTotal');
    var budget = (iBT >= 0 && row[iBT] !== '' && row[iBT] != null) ? Number(row[iBT]) : (Number(row[idx('Budget')]) || 0);
    ```

---

### 3. Task 1 Specification Compliance

| Spec Requirement | Status | Evidence / Implementation |
|---|---|---|
| Column self-arm | **PASS** | `INITIATIVE_BUDGET_COLUMNS_ = ['BudgetTotal', 'BudgetRemaining', 'LastDisburseCycle']` appended via `ensureInitiativeBudgetColumns_` ([`civicInitiativeEngine.js:3061-3095`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3061-L3095)). |
| Lib mirror constants | **PASS** | `BUDGET_COLUMNS` exported from [`lib/initiativePhaseContract.js:273, 891`](file:///root/GodWorld/lib/initiativePhaseContract.js#L273). |
| Pure `parseBudgetMoney` | **PASS** | Text-identical implementation in both Apps Script and Node ([`civicInitiativeEngine.js:3070-3081`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3070-L3081), [`lib/initiativePhaseContract.js:278-289`](file:///root/GodWorld/lib/initiativePhaseContract.js#L278-L289)). Handles `$`, `M`, `B`, `K`, commas, whitespace, decimals, negatives, and invalid tokens. |
| Test Parity ($\ge 6$ fixtures) | **PASS** | 17 fixtures tested in [`lib/initiativePhaseContract.test.js:80-88`](file:///root/GodWorld/lib/initiativePhaseContract.test.js#L80-L88), covering all six live tracker strings (`$28M`, `$12.5M`, `$230M`, `$45M`, `$2.1B`, `$450K`, etc.). 275/275 tests pass. |
| Idempotency & Blank-only writes | **PASS** | Tested in [`lib/initiativePhaseContract.test.js:89-106`](file:///root/GodWorld/lib/initiativePhaseContract.test.js#L89-L106). Second pass produces `changed === 0` and zero API calls. |
| Schema regeneration (`regenSchemaHeaders.js`) | **PENDING LIVE** | Expected to run after the sandbox/live sheet is armed by the first engine fire. |

---

## Actionable Notes for Engine-Sheet

1. **Rewire `checkMayoralVeto_` (Criterion 5):**
   - In Task 2 or as a standalone repair, change `civicInitiativeEngine.js:2396` to read `row[idx('BudgetTotal')]` so the mayoral veto scrutiny term is no longer dead.
2. **Task 9 Proposal Validator Integration:**
   - When cutting Task 9 (`scripts/cron-civic-run.js` and `scripts/createInitiative.js`), ensure `parseBudgetMoney` is imported directly from `lib/initiativePhaseContract.js` rather than writing an ad-hoc parser.
