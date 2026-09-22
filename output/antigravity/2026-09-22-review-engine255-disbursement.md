# Adversarial Review: Initiative Budget Disbursement (`engine.255`)

**Date:** 2026-09-22  
**Reviewer:** Antigravity (Standing Adversarial Review Duty)  
**Target Plan:** [`docs/plans/2026-09-22-initiative-budget-disbursement.md`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md)  
**Governing Canon & Doctrine:** [`docs/SIM_DOCTRINE.md`](file:///root/GodWorld/docs/SIM_DOCTRINE.md) §3, §4, §7, §14, §15, §16, §The test  
**Data Sources Audited:**
- [`output/beats/Initiative_Tracker.jsonl`](file:///root/GodWorld/output/beats/Initiative_Tracker.jsonl) (6 live tracker rows)
- [`output/beats/Household_Ledger.jsonl`](file:///root/GodWorld/output/beats/Household_Ledger.jsonl) (763 total households, 62 West Oakland households)
- [`output/citizen-names.tsv`](file:///root/GodWorld/output/citizen-names.tsv) (POP-00772 Beverly Hayes audit)
- [`phase05-citizens/householdFormationEngine.js`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js) (`detectHouseholdStress_`, `dissolveStressedHouseholds_`)
- [`phase05-citizens/migrationTrackingEngine.js`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js) (`SAVINGS_BUFFER_MONTHS`, displacement risk weights)
- [`phase05-citizens/civicInitiativeEngine.js`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js) (`checkMayoralVeto_`, `freezeCivicStageCohort_`, `civicHousingBurdenCohort_`)
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`housingBurdenCohort`, `stageCatalogByDomain`, `tendFactor`)

---

## Verdict

**REVISE BEFORE CUT: The plan is mathematically inoperable under the live 1:443 ledger scale — 6-month grants cannot move the proposed warning-or-crisis Stage 3 metric (a gate that can never fire), the $400k tranche exceeds total West Oakland demand by 9x, $28M lasts ~16,700 Cycles instead of 70, and the named doctrine test citizen (Beverly Hayes, POP-00772) has no household row.**

---

## Executive Summary

The conceptual objective of `engine.255` — spending real, depleting initiative budgets directly onto stressed citizen/household rows rather than applying a flat hood-wide discount — is fundamentally aligned with sim doctrine (§1, §2, §7, §14). However, the plan's concrete numbers and mechanical gates contain four severe architectural and arithmetic flaws:

1. **Deadlock in the Stage-3 Metric (Finding 1 - CRITICAL):** Task 6 defines the Delivering metric as the share of active rented households flagged "warning-or-crisis". Task 3 and Builder Call 2 explicitly state that a 6-month grant drops a household from crisis to warning, noting it "does not erase the flag". Because both crisis and warning households count in "warning-or-crisis", paying a grant changes the metric by **0.000**. The initiative can never achieve its delivery margin or reach Delivering.
2. **Phantom Denominator & Inconsistent Money Arithmetic (Finding 2 - CRITICAL):** The plan divides $28M by a $400k tranche to claim a "~70 Cycle lifespan paying 25–40 households/cycle". But West Oakland contains only 31 active renters total in `Household_Ledger`, and exactly **two** are stressed. Total initial grant demand is **$43,476**. With a 26-Cycle cooldown, spending across Cycles 2–26 is **$0**. Realized depletion is ~$1,672/Cycle, making $28M last **~16,745 Cycles**, violating §15 (start → peak → end → aftermath).
3. **Inert Upkeep Decay (Finding 3 - HIGH):** At the tend floor of 0.3, the $400k tranche decays to $120,000. Because total West Oakland grant demand is $43,476, the decaying tranche ceiling ($120k–$400k) remains nearly 3x above demand. Tend factor decay has zero throttling effect on disbursements.
4. **Doctrine Test Row Invalid (Finding 4 - HIGH):** Beverly Hayes (POP-00772), named as the doctrinal test row, has `"household": null` in the simulation ledger. Because the grant writer iterates exclusively over `Household_Ledger`, Beverly Hayes can never receive a grant.

---

## Ranked Findings

### Finding 1 (CRITICAL — Inoperable Gate): Task 6 Metric Defect Means Delivering Can Never Be Reached

- **File & Line:** 
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:94`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L94) (Builder call 2: grant size)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:126-127`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L126-L127) (Task 6: stressed-renter share)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:38`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L38) (Acceptance criterion 3: Delivering comparator)
  - [`docs/SIM_DOCTRINE.md:125-142`](file:///root/GodWorld/docs/SIM_DOCTRINE.md#L125-L142) (§15: A gate that can't fire is a trick)
- **Severity:** CRITICAL (Architectural Deadlock)
- **Mechanism:**
  - In Task 6 (lines 126–127), the Stage-3 measurable is defined as:
    > "per-hood **share of active rented households flagged warning-or-crisis** — the same formula as `detectHouseholdStress_` including the buffer dial — in place of the rent-burden median"
  - In Builder Call 2 (line 94), the recommended grant size is 6 months:
    > "Recommendation: 6 (half the buffer; **lowers a crisis to warning under Task 3, does not erase the flag**)."
  - In Task 3 (line 114):
    > "`bufferMonths = dialSavingsBufferMonths`; savings ≥ full buffer → skip (unchanged); **savings ≥ half → crisis capped at warning; below → unchanged.**"
- **Mathematical Impact:**
  - Let a hood have $N$ active renters, of which $W$ are in warning and $C$ are in crisis.
  - Initial metric value:
    $$\text{Stressed Share} = \frac{W + C}{N}$$
  - A 6-month grant is paid to a crisis household ($C \to C - 1$, $W \to W + 1$).
  - Post-grant metric value:
    $$\text{Stressed Share}' = \frac{(W + 1) + (C - 1)}{N} = \frac{W + C}{N}$$
  - **The change is exactly 0.000.**
  - If a grant is paid to a warning household (e.g. `HH-0108-F008`, which has $0 savings and 0.415 burden), their savings become 6 months. Under Task 3 ("savings $\ge$ half $\to$ crisis capped at warning"), they were already warning, so they **remain in warning**. $W$ is unchanged.
  - Therefore, grants of 6 months rent **cannot reduce the warning-or-crisis share**.
  - Acceptance criterion 3 ("West Oakland's stressed-renter share vs the city middle drops past the measured margin... and the row reaches Delivering") **can never be satisfied**. The initiative will sit in Standing until its losing clock expires or its budget drains silently with zero delivery credit.
- **Required Fix:**
  - Either the grant size must clear the full buffer (`GrantMonths = 12`), which fully erases the flag ($W \to W - 1$), OR the Stage-3 metric must measure **crisis share** (`crisisRenterShare`), not "warning-or-crisis", so that shifting crisis rows to warning moves the needle.

---

### Finding 2 (CRITICAL — Arithmetic Failure): $400k Tranche and 70-Cycle Lifespan Hallucinate Denominator Scale

- **File & Line:**
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:95-96`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L95-L96) (Builder calls 3 & 4: tranche & cooldown)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:76`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L76) (Tracked ledger is sample)
  - [`docs/SIM_DOCTRINE.md:40-44`](file:///root/GodWorld/docs/SIM_DOCTRINE.md#L40-L44) (§4: Everything is read through 1:443)
- **Severity:** CRITICAL (Mathematical & Operational Failure)
- **Analysis & Computed Numbers:**
  - The plan states:
    > "At 6-month grants on West Oakland's ~$1,500–3,600 leases (median rent-burden hoods, C108), a $400,000 tranche pays roughly 25–40 households a Cycle; $28M lasts ~70 Cycles at full tend. Recommendation: 400,000 — measure on the bench, re-rule."
  - An audit of the live [`output/beats/Household_Ledger.jsonl`](file:///root/GodWorld/output/beats/Household_Ledger.jsonl) reveals:
    1. **Total West Oakland households:** 62 (48 rented, 14 owned).
    2. **Active West Oakland renters:** exactly **31 households** (17 are dissolved).
    3. **Active West Oakland lease amounts:**
       - 5 households at **$3,621/mo**
       - 26 households at **$3,625/mo**
       - Min: $3,621 | Max: $3,625 | Median: $3,625 | Mean: $3,624.35
       - **There are zero leases at or near $1,500.**
    4. **Actual flagged households in West Oakland:**
       - `HH-0102-F027` (Rent $3,625, Income $81,430, Burden 0.534, Savings $12,776): **crisis**
       - `HH-0108-F008` (Rent $3,621, Income $104,654, Burden 0.415, Savings $0): **warning**
       - Remaining 29 active renters have burden $< 0.40$ or savings $\ge 12 \times \text{rent}$.
       - **Total flagged active renters in West Oakland = exactly 2 households.**
  - **Disbursement Reality:**
    - Cycle 1: Grant to `HH-0102-F027` ($6 \times 3625 = \$21,750$) + Grant to `HH-0108-F008` ($6 \times 3621 = \$21,726$).
    - **Total Cycle 1 payout:** **$43,476**.
    - Unspent tranche: $\$400,000 - \$43,476 = \$356,524$ (remains unspent because eligibility is exhausted).
    - Cycles 2 through 26: Both recipients are in cooldown (`civicGrantCooldownCycles` = 26). No other active renter is flagged.
    - **Total Cycles 2–26 payout:** **$0 per Cycle**.
  - **Actual Lifespan of $28M:**
    - Average spending rate: $\$43,476 / 26 \approx \$1,672.15\text{ per Cycle}$.
    - Lifespan:
      $$\frac{\$28,000,000}{\$1,672.15/\text{Cycle}} \approx \mathbf{16,745\text{ Cycles}}$$
    - Even in an extreme synthetic scenario where **all 31 active renters** in West Oakland were flagged and granted every 26 Cycles ($31 \times \$21,745 = \$674,095$ every 26 Cycles $\approx \$25,926$/Cycle):
      $$\frac{\$28,000,000}{\$25,926/\text{Cycle}} \approx \mathbf{1,080\text{ Cycles}}$$
  - **Root Cause:** The author looked at canon text ("295 applicants", line 28) and real-world Oakland scale, designing a $400k tranche that assumes 25–40 households are waiting every single week. Under 1:443 sampling, West Oakland only has 31 active renter rows in the world. $28M is scaled to the real city, not the 1:443 sim ledger.
- **Required Fix:**
  - The sim either needs:
    - A scaled budget for the ledger sample (e.g., $\$28\text{M} / 443 \approx \$63,200$ total, or scaled tranche of $\sim \$5,000–\$20,000$), OR
    - An accounting separation where the tracked ledger represents sample disbursements while `BudgetRemaining` tracks the macro fund, OR
    - If $28M remains literal, a tranche sized to the actual pool ($\sim \$25,000–\$45,000$) with explicit acknowledgment that $28M will never deplete inside normal gameplay without multi-hood expansion or macro burn.

---

### Finding 3 (HIGH — Inert Upkeep Gate): Tend Factor Floor (0.3) Fails to Throttle Disbursements

- **File & Line:**
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:53`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L53) (Tranche formula)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:41`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L41) (Acceptance criterion 4: untended row pays smaller tranche)
  - [`docs/SIM_DOCTRINE.md:125-142`](file:///root/GodWorld/docs/SIM_DOCTRINE.md#L125-L142) (§15: A gate that can't fire is a trick)
- **Severity:** HIGH (Defective Feedback Mechanism)
- **Mechanism:**
  - Phase 2 sets:
    $$\text{tranche} = \min(\text{remaining}, \text{civicDisburseTranche\_housing} \times \text{tend})$$
  - Recommended `civicDisburseTranche_housing` = $400,000.
  - At full tend ($\text{tend} = 1.0$): $\text{tranche} = \$400,000$.
  - At decay floor ($\text{tend} = 0.3$): $\text{tranche} = \$400,000 \times 0.3 = \mathbf{\$120,000}$.
- **Disbursement Comparison:**
  - As calculated in Finding 2, the total grant demand of the entire flagged eligible West Oakland pool is **$43,476**.
  - When $\text{tend} = 1.0$: $\min(\$400,000, \$43,476) = \mathbf{\$43,476}$ paid.
  - When $\text{tend} = 0.3$: $\min(\$120,000, \$43,476) = \mathbf{\$43,476}$ paid.
- **Consequence:**
  - Acceptance criterion 4 ("An untended row ... pays a proportionally smaller tranche; at the floor it still pays, so a neglected fund drips rather than stops") is **untrue in execution**.
  - A director who completely neglects the fund sees the exact same dollar payout and the exact same citizen relief as a director who works every single cycle. The upkeep pressure is completely neutralized because the floor tranche ceiling ($120k) dwarfs the ledger's demand ($43.5k).

---

### Finding 4 (HIGH — Canon & Doctrine Failure): Doctrinal Test Row Beverly Hayes (POP-00772) Has No Household Row

- **File & Line:**
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:35`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L35) (Pointers: Doctrine test row)
  - [`docs/SIM_DOCTRINE.md:53-57`](file:///root/GodWorld/docs/SIM_DOCTRINE.md#L53-L57) (§6: No ghost people)
  - [`docs/SIM_DOCTRINE.md:188-190`](file:///root/GodWorld/docs/SIM_DOCTRINE.md#L188-L190) (The test: does this make a row drive a fate the builder didn't choose?)
  - [`phase05-citizens/householdFormationEngine.js:118-124`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js#L118-L124) (`applyHousingDisbursement_` iteration)
- **Severity:** HIGH (Defective Grounding / Broken Validation Target)
- **Investigation & Ledger Audit:**
  - Plan line 35 proclaims:
    > "Doctrine test: does this make a row drive a fate the builder didn't choose? **Beverly Hayes (POP-00772, West Oakland, home health aide, approved C81, waiting) is the row.**"
  - Ledger inspection (`scripts/queryLedger.js citizen POP-00772` and [`output/citizen-names.tsv`](file:///root/GodWorld/output/citizen-names.tsv)):
    - POP-00772 is indeed Beverly Hayes, living in West Oakland.
    - Occupation is **"Community Director, West Oakland Community Center"** (Tier 3), NOT "home health aide".
    - Most crucially: **`"household": null`**.
    - Beverly Hayes has **no row in `Household_Ledger`**, is not a `HeadOfHousehold`, and is not listed in any household's `Members` array.
  - **Execution Path:**
    - Task 4 (`applyHousingDisbursement_`) iterates over active rows in `Household_Ledger`.
    - It matches rows where `Neighborhood == 'West Oakland'` and `HousingType == 'rented'`.
    - Because Beverly Hayes does not exist in `Household_Ledger`, the grant loop will **never see her, never evaluate her, and never grant her**.
    - Her LifeHistory will never receive the `"received a $... stabilization grant"` line.
- **Required Fix:**
  - If Beverly Hayes is the designated canonical test citizen, the sim must either form a household row for POP-00772 in `Household_Ledger` before running the bench pair, OR the plan must name an actual active, flagged head of household in West Oakland (e.g. `HH-0102-F027` / head citizen).

---

### Finding 5 (MEDIUM — Side-Effect & Asymmetry): Task 3 Alters Dissolution for Ungranted Households but Leaves Migration Risk Asymmetric

- **File & Line:**
  - [`phase05-citizens/householdFormationEngine.js:1269-1276, 1299`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js#L1269-L1276) (`detectHouseholdStress_`, `dissolveStressedHouseholds_`)
  - [`phase05-citizens/migrationTrackingEngine.js:93, 256`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L93) (`SAVINGS_BUFFER_MONTHS`, `buffered`)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:113-116`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L113-L116) (Task 3)
- **Severity:** MEDIUM (Unintended Physics Shift & Engine Disconnect)
- **Analysis:**
  1. **Impact on Ungranted Households:**
     - The prompt notes: *"say what the proportional band changes for households that get NO grant (it must change nothing for them)"*.
     - Under current code, any household with $\text{burden} \ge 0.50$ and savings $< 12 \times \text{rent}$ enters `severity = 'crisis'` and rolls a 10% chance of dissolution per Cycle ([`householdFormationEngine.js:1299`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js#L1299)).
     - Task 3 modifies `detectHouseholdStress_`: if savings $\ge 6 \times \text{rent}$ (half buffer), crisis is capped at `warning`.
     - In `dissolveStressedHouseholds_`, only `severity === 'crisis'` rolls dissolution.
     - **Result:** Any household in Oakland that receives NO grant, but happens to naturally hold between 6 and 11 months of savings while suffering high rent burden (e.g. following a wage drop or rent hike), **is now completely immune to dissolution**.
     - An audit of [`output/beats/Household_Ledger.jsonl`](file:///root/GodWorld/output/beats/Household_Ledger.jsonl) shows **7 active rented households already hold between 6 and 11.2 months of savings** (e.g. `HH-0084-359` in West Oakland at 8.06 months, `HH-0084-074` in Downtown at 11.21 months).
     - If any of these households enter $\ge 0.50$ burden, Task 3 eliminates their dissolution risk from 10% to 0% despite having received zero civic grants.
  2. **Disconnect with Migration Tracking:**
     - In [`phase05-citizens/migrationTrackingEngine.js:256`](file:///root/GodWorld/phase05-citizens/migrationTrackingEngine.js#L256):
       `var buffered = hInfo.savings >= hInfo.rent * SAVINGS_BUFFER_MONTHS;` (where constant is 12).
     - Task 3 notes modifying `migrationTrackingEngine.js` for the dial, but specifies no proportional half-buffer rule for migration.
     - If a household receives a 6-month grant, their savings are 6 months ($< 12$).
     - In `migrationTrackingEngine.js`, `buffered` evaluates to **`false`**.
     - Because `annualIncome` has not changed, $\text{rentBurden} > 50$ adds full `RENT_BURDEN_HIGH` (+4) displacement risk.
     - **Paradox:** A household saved from dissolution by a stabilization grant in `householdFormationEngine.js` receives **zero protection against displacement** in `migrationTrackingEngine.js`.

---

### Finding 6 (MEDIUM — Verification Surface): Triplicate Stress Formula Without Cross-Engine Parity Tests

- **File & Line:**
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:104, 127`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L104) (Tasks 1 & 6)
  - [`lib/initiativePhaseContract.js:579-650`](file:///root/GodWorld/lib/initiativePhaseContract.js#L579-L650) (`housingBurdenCohort`)
  - [`phase05-citizens/civicInitiativeEngine.js:3520-3561`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3520-L3561) (`civicHousingBurdenCohort_`)
  - [`phase05-citizens/householdFormationEngine.js:1247-1281`](file:///root/GodWorld/phase05-citizens/householdFormationEngine.js#L1247-L1281) (`detectHouseholdStress_`)
- **Severity:** MEDIUM (Architectural Drift Risk)
- **Analysis:**
  - The plan identifies two Node/engine mirrors:
    1. `parseBudgetMoney` in `lib/initiativePhaseContract.js` mirrored in `civicInitiativeEngine.js`, tested by `lib/initiativePhaseContract.test.js` ($\ge 6$ fixtures).
    2. `housingStressCohort` in `lib/initiativePhaseContract.js` mirrored as `civicHousingStressCohort_` in `civicInitiativeEngine.js`, tested by `lib/initiativePhaseContract.test.js` (7 fixtures).
  - **Omission:**
    - `housingStressCohort` calculates the share of households flagged warning-or-crisis, incorporating the savings buffer dial and proportional logic.
    - This is a direct duplication of `detectHouseholdStress_` in `householdFormationEngine.js`.
    - Task 6 establishes parity between `lib/initiativePhaseContract.js` and `civicInitiativeEngine.js`, but **neither has a parity test against `phase05-citizens/householdFormationEngine.js:detectHouseholdStress_`**.
    - If `detectHouseholdStress_` changes how income, savings, or exclusions are evaluated, `freezeCivicStageCohort_` and `lib/` will silently evaluate cohorts differently from how the engine actually flags households.
    - Furthermore, Task 9 (`scripts/cron-civic-run.js` and `scripts/createInitiative.js`) mentions parsing budgets but fails to mandate importing `parseBudgetMoney` from `lib/initiativePhaseContract.js`.

---

### Finding 7 (LOW — Budget Money Parsing): Live Initiative Budget Audit

- **File & Line:**
  - [`output/beats/Initiative_Tracker.jsonl`](file:///root/GodWorld/output/beats/Initiative_Tracker.jsonl)
  - [`docs/plans/2026-09-22-initiative-budget-disbursement.md:84, 104-106`](file:///root/GodWorld/docs/plans/2026-09-22-initiative-budget-disbursement.md#L84) (Task 1)
- **Severity:** LOW (Clean Inputs, Parser Requirements Concrete)
- **Audit of Live Budget Strings:**
  All six rows currently in `output/beats/Initiative_Tracker.jsonl` carry valid display strings:
  1. `INIT-001` (West Oakland Stabilization Fund): `"$28M"` $\to$ `28000000`
  2. `INIT-002` (Oakland Alternative Response Initiative): `"$12.5M"` $\to$ `12500000`
  3. `INIT-003` (Fruitvale Transit Hub Phase II): `"$230M"` $\to$ `230000000`
  4. `INIT-005` (Temescal Community Health Center): `"$45M"` $\to$ `45000000`
  5. `INIT-006` (Baylight District — Final Council Vote): `"$2.1B"` $\to$ `2100000000`
  6. `INIT-007` (Oakland Youth Apprenticeship Pipeline): `"$12.5M"` $\to$ `12500000`
- **Parser Requirements:**
  - `parseBudgetMoney_` cleanly converts all six live strings with simple `$`, `M`, `B`, `K` multipliers.
  - The parser must explicitly reject negative values, handle whitespace, decimals, and return `null` / blank on unparseable tokens so that `ensureInitiativeStageColumns_` leaves the cell blank rather than stamping `NaN`.

---

## Summary of Actionable Recommendations for Engine-Sheet

1. **Fix the Stage 3 Metric / Grant Size Alignment:**
   - Either make `civicHousingGrantMonths = 12` so granted households clear the buffer and drop out of the warning-or-crisis count, OR change `stage3Metric` in Task 6 to measure `crisisRenterShare` (down), so that capping crisis to warning actually produces a measurable drop against the city baseline.
2. **Re-scale the Tranche to the Ledger Sample:**
   - In a 1:443 world where West Oakland has only 31 active renters and 2 flagged households, a $400k tranche is completely ungrounded. Sizing `civicDisburseTranche_housing` to $\sim \$45,000$ aligns with the ledger pool and allows tend factor decay to actually function as a throttle.
3. **Resolve $28M Depletion Architecture:**
   - Acknowledge that spending $28M strictly onto tracked rows will take decades of Cycles unless the fund supports multiple neighborhoods or macro-burns off-camera.
4. **Fix Beverly Hayes (POP-00772) Canon / Test Target:**
   - Either assign POP-00772 a valid rented household in West Oakland in `Household_Ledger`, or re-point the doctrinal acceptance test to an existing active flagged head of household (e.g. `HH-0102-F027`).
5. **Align `migrationTrackingEngine.js`:**
   - Ensure the proportional half-buffer rule in Task 3 is also wired into `migrationTrackingEngine.js:256` so stabilization grants actually protect citizens from displacement risk.
6. **Add Formation-to-Civic Stress Parity Test:**
   - Add a unit test verifying that `detectHouseholdStress_` (`householdFormationEngine.js`) and `housingStressCohort` (`lib/initiativePhaseContract.js`) evaluate identical test households identically.
