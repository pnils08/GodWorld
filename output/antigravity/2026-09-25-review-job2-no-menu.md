# Adversarial Review: Initiatives in the World Job 2 — No Menu (`7bd7e7d6`)

**Date:** 2026-09-25
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)
**Target Commit:** `7bd7e7d6` (`Job 2: no menu — a seat proposes under a category and a reach (builder rulings 2026-09-25)`)
**Files Inspected:**
- [`lib/initiativePhaseContract.js`](file:///root/GodWorld/lib/initiativePhaseContract.js) (`PROPOSAL_CATEGORIES`, `PROPOSAL_REACHES`, `BUDGET_BANDS`, `stageCatalogByDomain`)
- [`scripts/civicInterventionValidation.js`](file:///root/GodWorld/scripts/civicInterventionValidation.js) (`categoryIssue`, `budgetIssue`, `reachHoods`)
- [`scripts/cron-civic-run.js`](file:///root/GodWorld/scripts/cron-civic-run.js) (`validateDatawakeMoves`, `foldMovesIntoDecisions`, `datawakeUserPrompt`)
- [`scripts/validateTrackerUpdates.js`](file:///root/GodWorld/scripts/validateTrackerUpdates.js) (`validateCandidates`)
- [`scripts/applyTrackerUpdates.js`](file:///root/GodWorld/scripts/applyTrackerUpdates.js) (candidate minting, `createInitiative` integration)
- [`scripts/buildCivicOfficeSlice.js`](file:///root/GodWorld/scripts/buildCivicOfficeSlice.js) (`loadCategoryMenu`, `loadConditionCounts`, `gamePromptView`)
- [`scripts/cron-civic-gate.js`](file:///root/GodWorld/scripts/cron-civic-gate.js) (candidate write-set digest)
- [`scripts/createInitiative.js`](file:///root/GodWorld/scripts/createInitiative.js) (`POLICY_DOMAINS`, `parseHoods`, `createInitiative`)
- Test suites: [`lib/initiativePhaseContract.test.js`](file:///root/GodWorld/lib/initiativePhaseContract.test.js), [`scripts/civicReviewFixes.test.js`](file:///root/GodWorld/scripts/civicReviewFixes.test.js), [`scripts/cron-civic-game.test.js`](file:///root/GodWorld/scripts/cron-civic-game.test.js), [`scripts/validateTrackerUpdates.test.js`](file:///root/GodWorld/scripts/validateTrackerUpdates.test.js)

---

## Verdict

**CLEAN PASS (VERIFIED RESILIENT):**
Commit `7bd7e7d6` completely retires the static `INTERVENTION_CATALOG` proposal menu on the live pipeline, establishing free-form proposals governed by:
1. `category` mapped strictly to `PolicyDomain` across the 8 builder-ruled categories (`health`, `transit`, `education`, `economic`, `workforce`, `safety`, `sports`, `environment`; `housing` excluded).
2. `reach` expanded to explicit, canonical neighborhood arrays (`hood`, `district`, `all`).
3. Dual-checked budget validation (enforced at both datawake intake and candidate fold/mint).

All 5 adversarial hunt directives were exhaustively investigated. No failure paths, loopholes, or test regressions were found. The full test suite passes cleanly at 261/261 files (0 failures).

---

## Detailed Audit Against Hunt Directives

### 1. Any Path Where a Propose Mints with EMPTY or Non-Canonical `AffectedNeighborhoods`

**Finding: NONE FOUND (Fail-Closed at Every Layer).**

Engine baseline requirement: in [`phase05-citizens/civicInitiativeEngine.js:3252`](file:///root/GodWorld/phase05-citizens/civicInitiativeEngine.js#L3252) (`civicStageBaselineFrom_`), a stamped baseline requires `hoods.length > 0`, failing with `no-target-hoods` if empty, and line 3719 drops unknown/non-canonical hoods.

Every step from move emission to sheet minting enforces non-empty canonical hoods:
1. **Intake Gate ([`scripts/civicInterventionValidation.js:56-74`](file:///root/GodWorld/scripts/civicInterventionValidation.js#L56-L74)):**
   - `reach: 'hood'`: enforces `Array.isArray(namedHoods) && namedHoods.length > 0`; otherwise returns `{ issue: 'propose-missing-hoods' }`.
   - `reach: 'district'`: maps district seats (D1–D9) to `getNeighborhoodsForDistricts(district)`. Every council district in [`lib/districtMap.js`](file:///root/GodWorld/lib/districtMap.js) contains 1–4 canonical hoods (all 22 hoods covered across D1–D9, zero empty lists).
   - `reach: 'all'`: citywide seats only; expands to `getAllNeighborhoods()` (exactly the 22 canonical hoods).
   - Missing or unknown reach: returns `propose-missing-reach` or `unknown-reach`.
2. **Authority & Canonicity Check ([`scripts/cron-civic-run.js:2560-2567`](file:///root/GodWorld/scripts/cron-civic-run.js#L2560-L2567)):**
   - For every hood in `r.hoods`, `hoodAuthorityReason(office, h, c2p)` executes. Any empty string, whitespace, non-canonical hood, or child area that does not fold to a canonical parent returns `unknown-hood(...)` and rejects the move.
   - `proposeHoods` is assigned only when all hoods clear authority and canonicity.
3. **Candidate Validation ([`scripts/validateTrackerUpdates.js:249-273`](file:///root/GodWorld/scripts/validateTrackerUpdates.js#L249-L273)):**
   - `cand.hoods` must be a non-empty array; otherwise `violations.push('candidate-no-hoods')` (a HARD gate failure).
   - Every entry is verified via `CANONICAL_HOODS.has(...)`; any non-canonical entry yields `violations.push('non-canon-hood')`.
4. **Mint Execution ([`scripts/applyTrackerUpdates.js:657-682`](file:///root/GodWorld/scripts/applyTrackerUpdates.js#L657-L682)):**
   - All hoods are folded to canonical parents via `slice.foldHood(h, c2p)` and deduplicated via `new Set(...)`.
   - In [`scripts/createInitiative.js:140-146`](file:///root/GodWorld/scripts/createInitiative.js#L140-L146), `parseHoods()` parses the string: if empty, it throws `createInitiative: AffectedNeighborhoods required`; if any hood is missing from `CANONICAL_HOODS`, it throws `createInitiative: non-canon neighborhood`.

There is zero possibility for an empty or non-canonical `AffectedNeighborhoods` string to reach `Initiative_Tracker`.

---

### 2. A District Seat Reaching Outside Its District via `reach=district` or `reach=all`

**Finding: NONE FOUND (Strictly Constrained & Dual-Gated).**

1. **`reach: 'all'` on District Seats:**
   - In [`scripts/civicInterventionValidation.js:72`](file:///root/GodWorld/scripts/civicInterventionValidation.js#L72):
     ```javascript
     if (districtSeat) return { issue: 'reach-all-is-citywide-seats-only' };
     ```
     Because `office.district` for council seats matches `/^D\d$/`, `reachHoods` immediately refuses the move.
   - Tested and verified in [`scripts/cron-civic-game.test.js:268-271`](file:///root/GodWorld/scripts/cron-civic-game.test.js#L268-L271) (`res4`).
   - Backstop gate: even if synthetic candidates circumvent the wake gate, [`scripts/validateTrackerUpdates.js:266-272`](file:///root/GodWorld/scripts/validateTrackerUpdates.js#L266-L272) evaluates `getDistrictForNeighborhood(folded) !== seat.district` for every hood, generating HARD `hood-out-of-district` violations for all out-of-district neighborhoods.
2. **`reach: 'district'` on District Seats:**
   - `getNeighborhoodsForDistricts(district)` loads strictly from `DISTRICT_NEIGHBORHOODS[district]`.
   - Verified across all 9 districts: every neighborhood mapped to `D1`..`D9` resolves back to that identical district in `getDistrictForNeighborhood()`.
   - Any user-supplied `m.hoods` in the raw move payload is completely ignored when `reach: 'district'`, preventing seat injection of alien neighborhoods.
3. **`reach: 'district'` on Citywide Seats:**
   - Evaluated at line 68: `if (!districtSeat) return { issue: 'reach-district-needs-a-district-seat' };`. Citywide seats (Mayor, Police Chief) cannot declare `reach: 'district'`.
   - Tested and verified in [`scripts/cron-civic-game.test.js:301-303`](file:///root/GodWorld/scripts/cron-civic-game.test.js#L301-L303).

---

### 3. Category String Reaching `PolicyDomain` Un-Normalized or Outside `createInitiative POLICY_DOMAINS`

**Finding: NONE FOUND (Enum-Validated & Normalized Across 4 Barriers).**

1. **Intake Validation ([`scripts/civicInterventionValidation.js:28-34`](file:///root/GodWorld/scripts/civicInterventionValidation.js#L28-L34)):**
   ```javascript
   function categoryIssue(category) {
     const { PROPOSAL_CATEGORIES } = require('../lib/initiativePhaseContract');
     if (!text(category)) return 'propose-missing-category';
     const c = category.trim().toLowerCase();
     if (!Object.hasOwn(PROPOSAL_CATEGORIES, c) || !POLICY_DOMAINS.includes(c)) return 'unknown-category';
     return null;
   }
   ```
   - Guards against prototype pollution via `Object.hasOwn(PROPOSAL_CATEGORIES, c)`. Prototype keys (`constructor`, `toString`, `__proto__`, `valueOf`) return `unknown-category`.
   - Cross-references `POLICY_DOMAINS.includes(c)`.
   - `housing` is rejected with `unknown-category(housing)` because it is not in `PROPOSAL_CATEGORIES`.
2. **Move Normalization ([`scripts/cron-civic-run.js:2607`](file:///root/GodWorld/scripts/cron-civic-run.js#L2607)):**
   `payload.category = String(m.category).trim().toLowerCase();` lowercases and strips whitespace upon acceptance.
3. **Pre-Mint Validation ([`scripts/applyTrackerUpdates.js:651-663`](file:///root/GodWorld/scripts/applyTrackerUpdates.js#L651-L663)):**
   - Re-evaluates `categoryIssue(cand.category)` and `budgetIssue(cand.category, cand.budget)`.
   - Explicitly normalizes: `policyDomain: String(cand.category).trim().toLowerCase()`.
4. **Mint Assertion ([`scripts/createInitiative.js:135-138`](file:///root/GodWorld/scripts/createInitiative.js#L135-L138)):**
   `if (POLICY_DOMAINS.indexOf(domain) < 0) throw new Error(...)`.
   Guarantees that `built.row.PolicyDomain` is strictly one of the 8 canonical domains.

---

### 4. Weakened Test Assertions in Rewritten Tests

**Finding: NONE FOUND (All Rewritten Assertions are Parity-Equal or Stricter).**

- [`lib/initiativePhaseContract.test.js:50-60`](file:///root/GodWorld/lib/initiativePhaseContract.test.js#L50-L60):
  Replaced menu-length check with comprehensive checks: all 8 categories exist, are mintable `POLICY_DOMAINS`, carry valid `BUDGET_BANDS`, `housing` is absent, and exactly the 5 non-delivering categories (`economic`, `environment`, `safety`, `sports`, `workforce`) are flagged `canDeliver: false`.
- [`scripts/civicReviewFixes.test.js:14-25`](file:///root/GodWorld/scripts/civicReviewFixes.test.js#L14-L25) (F1):
  Replaced catalog schema tests with rigorous category rejection tests: prototype pollution (`constructor`, `toString`, `__proto__`, `hasOwnProperty`), array `['health']`, legacy key `'health-service'`, `'housing'`, and object `{ health: 1 }`. Asserts valid subsequent move (`health`) is accepted.
- [`scripts/cron-civic-game.test.js`](file:///root/GodWorld/scripts/cron-civic-game.test.js):
  - **T1.3 (line 205):** Same assertion structure preserved (1 accepted, 2 rejected for `second-consequential-move`), payload updated with `category` and `reach`.
  - **T1.5 (lines 260–277):** Significantly strengthened: added assertions for `reach: 'district'` (expands to district hoods), `reach: 'all'` on district seat (rejected), missing reach (rejected), and unknown reach (rejected).
  - **T1.6 (lines 296–303):** Strengthened: added assertions for mayor `reach: 'all'` (expands to all 22 hoods) and mayor `reach: 'district'` (rejected).
  - **T1.7 (lines 305–323):** Validates missing category, legacy intervention key, housing rejection, non-playable safety accepted and blocked at Standing stageRequirement, and case-normalization of 'Economic' -> 'economic'.
  - **T1.8 (line 333):** Chief propose updated to `category: 'safety', reach: 'hood'`; asserts Chief cannot propose.
  - **T1.10 (lines 377–394):** Strengthened: verifies all 8 categories match the ruling, all 8 have budget bands, all 8 are in `POLICY_DOMAINS`, and all 8 pass validation.
  - **T1.11 (lines 396–406):** Verifies prototype properties on `category` are rejected.
  - **T1.12 (lines 408–442):** Updated to test budget bands per category; verifies newly opened safety category ($2M–$30M) accepts $10M and rejects $50M.
  - **T2.5 (lines 554, 594–595):** Asserts `c.category === 'health'`, `c.reach === 'hood'`, and `c.budget === '$20M'`.
  - **F1 (lines 1109–1123):** Tests prototype keys, non-string types, and housing against category gate.
  - **T9.255 (lines 1312–1328):** Strengthened: checks `loadCategoryMenu()` length <= 600 chars (measures at 504), verifies all 8 categories with bands and non-delivering asterisk markers (`*`), and verifies absence of housing.

---

### 5. Anything Still Reading the Old `intervention` Key on the Proposal Path

**Finding: NONE FOUND on Active Pipeline; Obsolete References Bounded in Aider Queue.**

- **Active Pipeline Clean:**
  Grep sweeps of `scripts/cron-civic-run.js`, `scripts/validateTrackerUpdates.js`, `scripts/applyTrackerUpdates.js`, `scripts/buildCivicOfficeSlice.js`, and `scripts/cron-civic-gate.js` show **zero** reads of `intervention` on the proposal path. `loadInterventionCatalog()` was completely removed from `cron-civic-run.js`.
- **Pre-Identified Aider Queue Items:**
  As documented in `docs/plans/2026-09-24-initiatives-in-the-world.md:58` and queued in `AIDER_PLAN.md:38`:
  1. `interventionIssue()` in [`scripts/civicInterventionValidation.js:6`](file:///root/GodWorld/scripts/civicInterventionValidation.js#L6) is dead code (no live callers).
  2. Unused import `const { interventionIssue } = require('./civicInterventionValidation');` at [`scripts/cron-civic-game.test.js:44`](file:///root/GodWorld/scripts/cron-civic-game.test.js#L44).
  3. Inert synthetic test fixtures at `cron-civic-game.test.js:1186, 1362` retain historical `intervention` keys in dummy test objects testing unrelated logic (geography gate and prompt length cap).

These items are completely inert and do not impact simulation execution.

---

## Validation Executed

```bash
node scripts/validateTrackerUpdates.test.js   # 19/19 PASS
node scripts/civicReviewFixes.test.js         # PASS
node lib/initiativePhaseContract.test.js      # ALL 258 PASS
node scripts/cron-civic-game.test.js          # 54/54 PASS
npm test                                      # 261/261 test files PASS (133.88s)
```

The change is clean, robust, and ready for production operations.
