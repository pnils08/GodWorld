# Adversarial Review: Owner Move Engine Integration (`engine.258`, `ced4b17c`)

**Date:** 2026-09-23  
**Reviewer:** Antigravity (Adversarial Review Duty per `engine-sheet`)  
**Target Commit:** `ced4b17c` (`engine.258: the owner move — owned ENGINE-clock units sell and buy-or-rent up (builder 2026-09-23: a home is a rung, not a cage)`)  
**Subsequent Evolution Noted:**
- `17daa559` (`engine.258b: canon anchor on non-ENGINE clocks + honest move phrase in the hook`)
- `c546a475` (`engine.258c: remove the ClockMode anchor — builder 2026-09-23: nobody is protected from their own life`)

**Files Inspected:**
- [`phase05-citizens/migrationTrackingEngine.js`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js) (`buildHouseholdHousingMap_`, `processRelocations_`, `updateHouseholdLedgerMove_`)
- [`phase05-citizens/generationalWealthEngine.js`](file:///root/GodWorld/phase05-citizens/generationalWealthEngine.js) (`sellHouseholdHome_`, `decrementHeritageHomesLate_`, `planOwnerMove_`, `executeOwnerMove_`)
- [`scripts/migrationRelocation.test.js`](file:///root/GodWorld/scripts/migrationRelocation.test.js) (Test A12)
- [`output/beats/Household_Ledger.jsonl`](file:///root/GodWorld/output/beats/Household_Ledger.jsonl) (Live production ledger snapshot)

---

## Verdict

**CONDITIONAL PASS WITH ONE CRITICAL FINANCIAL INTEGRITY DEFECT:**  
The architectural flow, phase-order handling between wealth and migration, deterministic gate evaluation, and story-hook reporting are well-designed and cleanly integrated. However, **Finding 1 is a CRITICAL financial leak**: on legacy owned rows where `HousingCost` is `0` or blank (which represents **66.7% (126 of 189) of all owned households in live `Household_Ledger`**), the equity calculation assumes $0 outstanding mortgage debt, granting households 100% of the market value of the home as liquid cash upon sale. This fabricates hundreds of thousands to millions of unbacked dollars per moving household.

---

## Executive Summary

Commit `ced4b17c` operationalizes the builder's ruling ("a home is a rung, not a cage"):
1. **The Misfit Lane for Owners:** Owned households are no longer permanently locked in place by G-EC70. When their income/profile makes them misfits moving up, they sell their origin home at prevailing market rates.
2. **Buy-or-Rent Branching:** Destination affordability is evaluated via `planOwnerMove_` against the three canonical purchase gates (NetWorth eligibility `0.35 * price`, hood wealth floor, and income carry capacity). If they qualify, they `trade-up` (paying down payment, taking new mortgage); if not, they `rent` at the destination and bank the equity.
3. **Phase-Order Alignment:** `sellHouseholdHome_` correctly detects whether Step 7 (`updateHeritage_`) has already run via `ctx.summary.heritage`. Late sales call `decrementHeritageHomesLate_` to directly decrement `Heritage_Ledger`, avoiding ghost home counts. Trade-ups use `opts.netZero = true`, preserving standing.
4. **Determinism:** Zero RNG calls are consumed in `planOwnerMove_` or `executeOwnerMove_`. The move roll consumes exactly one RNG call per unit, maintaining RNG sequence parity.

---

## Ranked Findings

### Finding 1 (CRITICAL): Massive Phantom Equity Creation on Legacy Rows (`HousingCost == 0`)

- **Files & Lines:** 
  - [`phase05-citizens/generationalWealthEngine.js:1924-1926`](file:///root/GodWorld/phase05-citizens/generationalWealthEngine.js#L1924-L1926) (`planOwnerMove_`)
  - [`phase05-citizens/generationalWealthEngine.js:1814-1816`](file:///root/GodWorld/phase05-citizens/generationalWealthEngine.js#L1814-L1816) (`sellHouseholdHome_`)
- **Severity:** CRITICAL (Money Creation / Simulation Invariant Violation)
- **Mechanism:**
  ```javascript
  var cost = Number(household.housingCost) || 0;
  var salePrice = med > 0 ? Math.round(med * 12 * HOME_PRICE_TO_RENT) : cost;
  var proceeds = Math.max(0, Math.round(salePrice - cost * (1 - HOME_DOWN)));
  ```
- **Audit of Live Data:**
  An audit of the production `output/beats/Household_Ledger.jsonl` reveals:
  - Total owned households: **189**
  - Owned households with `HousingCost == 0` or blank: **126 (66.7%)**
  - Sample rows:
    - `HH-0084-002` (Downtown): `HousingType: 'owned'`, `HousingCost: 0`, `MonthlyRent: 5661`
    - `HH-0084-003` (Bridgeport): `HousingType: 'owned'`, `HousingCost: 0`, `MonthlyRent: 6010`
    - `HH-0084-005` (Montclair): `HousingType: 'owned'`, `HousingCost: 0`, `MonthlyRent: 3762`
- **The Financial Defect:**
  When `cost === 0`, `cost * (1 - HOME_DOWN)` evaluates to `0`. The formula assumes the home has **$0 outstanding financed debt**. Consequently:
  $$\text{proceeds} = \text{salePrice} - 0 = \text{salePrice}$$
  For example, if `HH-0084-002` sells in Downtown where median rent is $3,000:
  $$\text{salePrice} = 3000 \times 12 \times 22 = \$792,000$$
  $$\text{proceeds} = \$792,000$$
  The entire market value ($792,000) is credited directly to member `NetWorth` as pure cash proceeds!
  In reality, this household pays a monthly mortgage of $5,661. Under `HOME_MORTGAGE_MONTHLY` ($0.8 \times 0.07 / 12 \approx 0.004667$), their purchase price was $\approx \$1,213,000$ and their outstanding loan was $\approx \$970,000$.
  By treating `cost` as `0`, the outstanding debt of nearly $1M is erased, and the citizen receives the entire gross asset value as unearned liquid wealth.
- **Recommended Remedy:**
  If `cost <= 0` and `monthlyRent > 0`, reconstruct the cost basis from the active mortgage:
  ```javascript
  var cost = Number(household.housingCost) || 0;
  if (cost <= 0 && Number(household.monthlyRent) > 0) {
    cost = Math.round(Number(household.monthlyRent) / HOME_MORTGAGE_MONTHLY);
  }
  ```
  If neither `housingCost` nor `monthlyRent` exists, default conservatively to initial equity:
  ```javascript
  var proceeds = cost > 0 
    ? Math.max(0, Math.round(salePrice - cost * (1 - HOME_DOWN)))
    : Math.round(salePrice * HOME_DOWN);
  ```

---

### Finding 2 (HIGH): Partial-Commit / Swallowed Error in `updateHouseholdLedgerMove_`

- **Files & Lines:** [`phase05-citizens/migrationTrackingEngine.js:880-928`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L880-L928) (`updateHouseholdLedgerMove_`)
- **Severity:** HIGH (Fail-Loud Doctrine / Multi-Ledger State Synchronization)
- **Mechanism:**
  In `processRelocations_`:
  1. `ownerReceipt = executeOwnerMove_(...)` executes:
     - `sellHouseholdHome_` updates member `NetWorth` in `ctx.ledger.rows`.
     - `LifeHistory` is appended.
     - `ctx.ledger.dirty = true` is flagged.
     - If renting up, `decrementHeritageHomesLate_` decrements `HomesOwned` on `Heritage_Ledger`.
  2. Member rows in `ctx.ledger.rows` have their `Neighborhood`, `MigrationReason`, `MigrationDestination`, and `MigratedCycle` mutated.
  3. `updateHouseholdLedgerMove_(ctx, unit.key, bestName, ownerReceipt.monthly, ownerReceipt)` is invoked.
  4. `updateHouseholdLedgerMove_` wraps all sheet access in a generic `try { ... } catch(e) { Logger.log(...) }` block. If `!sheet`, `values.length < 2`, or the household ID fails to match, it returns silently without error.
- **The Defect:**
  If `Household_Ledger` fails to update or throws an exception, the error is swallowed and logged only to GAS `Logger`.
  As a result:
  - `Simulation_Ledger` records the citizens living in `destHood` with new `NetWorth` and renting/owned status.
  - `Heritage_Ledger` records fewer homes.
  - `Household_Ledger` remains stuck in the old neighborhood, with `HousingType: 'owned'`, old mortgage, and old `HousingCost`.
- **Recommended Remedy:**
  When `ownerReceipt` is passed, `updateHouseholdLedgerMove_` must fail loudly if the row cannot be found or written:
  ```javascript
  if (ownerReceipt && !updated) {
    throw new Error('updateHouseholdLedgerMove_: failed to find and update household row ' + householdId + ' for owner move');
  }
  ```

---

### Finding 3 (MEDIUM): Strict Equality on HouseholdId Without Cell Trimming

- **Files & Lines:** [`phase05-citizens/migrationTrackingEngine.js:895, 911`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L895)
- **Severity:** MEDIUM (Silent No-Op Risk)
- **Mechanism:**
  ```javascript
  if (values[g][iHHGuard] !== householdId) continue;
  // ...
  if (values[r][iHH] !== householdId) continue;
  ```
- **The Defect:**
  Unlike `HousingType` which is sanitized via `String(...).trim().toLowerCase()`, `HouseholdId` is compared with raw strict equality `!==`. Any leading or trailing whitespace in `Household_Ledger` cell values causes the comparison to fail silently, skipping the row update entirely.
- **Recommended Remedy:**
  Sanitize the comparison:
  ```javascript
  if (String(values[r][iHH] || '').trim() !== String(householdId || '').trim()) continue;
  ```

---

### Finding 4 (MEDIUM): Weak Test Assertion and Missing Edge/Multi-Member Coverage in Test A12

- **Files & Lines:** [`scripts/migrationRelocation.test.js:517`](file:///root/GodWorld/scripts/migrationRelocation.test.js#L517)
- **Severity:** MEDIUM (Test Rigor / Regression Prevention)
- **Defects Identified:**
  1. **Weak Rent Assertion:**
     ```javascript
     assert('rent-up: moved, now renting at the destination level', 
       r.hood === 'Highgate' && r.type === 'rented' && r.cost === 0 && r.rent > 0, 
       [r.hood, r.type, r.rent, r.cost].join(',')
     );
     ```
     `r.rent > 0` is satisfied by any positive number. If `updateHouseholdLedgerMove_` failed to re-price the rent and left the old mortgage (`1386`), `r.rent > 0` would still pass. It must assert `r.rent === 3750` (the Highgate median rent).
  2. **Zero Multi-Member Household Coverage:**
     Test A12 only verifies a single-person household (`POP-O1`). It does not verify:
     - Proportional equity split across multiple adult members.
     - NetWorth deduction of down payments shared across members.
     - Verification that minor children do not receive `[Home]` life history lines.
  3. **Zero Test Coverage for Legacy `HousingCost == 0`:**
     Test A12 explicitly initializes `HousingCost: 297000`. The 66.7% live case where `HousingCost == 0` is unexercised.

---

### Positive Verifications & Architectural Strengths

1. **Phase-Order Heritage Accounting:**
   The phase order (`generationalWealthEngine` Step 6/7 $\rightarrow$ `migrationTrackingEngine`) is respected. The presence of `ctx.summary.heritage` is an unambiguous signal that Step 7 has already run this cycle. Calling `decrementHeritageHomesLate_` directly mutates `Heritage_Ledger` in real time, preventing home double-counting.
2. **Net-Zero Trade-Up Protection:**
   In trade-ups, setting `opts.netZero = true` cleanly bypasses both `homesSoldByLine` and `decrementHeritageHomesLate_`. The lineage keeps its exact standing (1 sold + 1 bought = 0 net change).
3. **RNG Stream Synchronization:**
   `planOwnerMove_`, `executeOwnerMove_`, and `sellHouseholdHome_` are completely free of RNG calls. Only the initial relocation decision roll consumes `ctx.rng`, ensuring owner relocations consume the exact same RNG sequence as renter relocations.
4. **Clean Narrative and Story Hooks:**
   When an owner moves, the reason is stamped as `MIGRATION_REASONS.OPPORTUNITY`, and the phrase correctly incorporates `ownerReceipt.phrase` (`sold up and bought in Highgate` or `sold the house in Lowmarket to rent up`), with a single unified `CITIZEN_RELOCATED` hook emitted without duplicate `HOME_SALE` spam.

---

## Action Items for `engine-sheet`

1. **Patch `planOwnerMove_` and `sellHouseholdHome_`:** Implement the `MonthlyRent / HOME_MORTGAGE_MONTHLY` reconstruction when `household.housingCost <= 0`.
2. **Harden `updateHouseholdLedgerMove_`:** Add `.trim()` to `HouseholdId` matching and throw or fail loudly if an `ownerReceipt` cannot find its corresponding row in `Household_Ledger`.
3. **Tighten Test A12:** Assert exact `destRent` ($3,750) and add a test case for `HousingCost: 0` and multi-member households.
