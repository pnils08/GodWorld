# Adversarial Review: engine.199 — Job Catalog Single Runtime Source (`a63ed660`, `e3f315a7`)

**Date:** 2026-09-27  
**Reviewer:** Antigravity (Standing Adversarial Review Duty per `engine-sheet`)  
**Target Commits:**
- `a63ed660` — engine.199: the job catalog has one runtime source — the Economic_Parameters tab
- `e3f315a7` — engine.199 bench-proven: SANDBOX 0908 @120 C134 clean, joins the stacked PROD ship

**Files Inspected:**
- [`utilities/citizenDerivation.js`](file:///root/GodWorld/utilities/citizenDerivation.js) (`ECONOMIC_PARAMETERS`, `economicParameters_()`, `canonicalRolesSet_()`, `lookupIncome_()`)
- [`phase01-config/godWorldEngine2.js`](file:///root/GodWorld/phase01-config/godWorldEngine2.js) (`buildIntakeSalaryPools_()`, `processIntake_()`)
- [`phase05-citizens/educationCareerEngine.js`](file:///root/GodWorld/phase05-citizens/educationCareerEngine.js) (`roleFieldOf_()`)
- [`phase05-citizens/generationalWealthEngine.js`](file:///root/GodWorld/phase05-citizens/generationalWealthEngine.js) (`jobPayTable_()`, `jobReferencePay_()`)
- [`scripts/syncEconomicParameters.js`](file:///root/GodWorld/scripts/syncEconomicParameters.js) (`diffSheet()`, `toSheetRow()`, `syncSheet()`)
- [`scripts/validateIntakeDerivation.js`](file:///root/GodWorld/scripts/validateIntakeDerivation.js) (Gate 5 structural scan)
- [`scripts/validateIntakeDerivation.contract.test.js`](file:///root/GodWorld/scripts/validateIntakeDerivation.contract.test.js) (Test 10 contract round-trip)
- Test harnesses:
  - [`scripts/careerStage.test.js`](file:///root/GodWorld/scripts/careerStage.test.js)
  - [`scripts/educationLoop.test.js`](file:///root/GodWorld/scripts/educationLoop.test.js)
  - [`scripts/employerSuccess.test.js`](file:///root/GodWorld/scripts/employerSuccess.test.js)
  - [`scripts/homeSale.test.js`](file:///root/GodWorld/scripts/homeSale.test.js)
  - [`scripts/hoodIncome.test.js`](file:///root/GodWorld/scripts/hoodIncome.test.js)
  - [`scripts/hospitalIncomePersistence.test.js`](file:///root/GodWorld/scripts/hospitalIncomePersistence.test.js)
  - [`scripts/householdIntake.test.js`](file:///root/GodWorld/scripts/householdIntake.test.js)
  - [`scripts/householdReconcile.test.js`](file:///root/GodWorld/scripts/householdReconcile.test.js)
  - [`scripts/ownerDoor.test.js`](file:///root/GodWorld/scripts/ownerDoor.test.js)
  - [`scripts/hoodBlindTables.test.js`](file:///root/GodWorld/scripts/hoodBlindTables.test.js)
- [`docs/plans/2026-09-10-economic-parameters-one-source.md`](file:///root/GodWorld/docs/plans/2026-09-10-economic-parameters-one-source.md)

---

## Executive Verdict

**CONDITIONAL PASS (ARCHITECTURALLY SOUND; 3 LATENT RISKS FLAGGED):**  
The core consolidation of engine.199 successfully eliminates the hand-baked 306-row duplicate catalog from `utilities/citizenDerivation.js`. All live engine readers (`jobPayTable_`, `roleFieldOf_`, `lookupIncome_`, `canonicalRolesSet_`, and `buildIntakeSalaryPools_`) now source through the singular `economicParameters_()` accessor, which reads the `Economic_Parameters` tab once per cycle and caches in memory. The silent degrade-to-empty guards have been removed.

However, adversarial analysis reveals three notable risks:
1. **Type Coercion Vulnerability to Cell Formatting (`Number()` vs Currency/Commas):**  
   `economicParameters_()` parses numeric fields via `Number(row[col])`. If any sheet cell contains currency symbols, thousands commas, or percentage signs (`"$56,000"`, `"56,000"`, `"22%"`), `Number()` evaluates to `NaN`. In `jobPayTable_`, `NaN` median income silently drops roles from pay calculations; in `lookupIncome_`, `NaN` leaks directly into citizen `Income` on promotion.
2. **Gate 5 Execution & Regex Blind Spots in `validateIntakeDerivation.js`:**  
   Gate 5 is effectively dead in offline/CI test environments because `validateIntakeDerivation.js` requires live Sheets credentials at line 32 and exits with code 2 before Gate 5 is ever reached. Furthermore, Gate 5's regex `/\{\s*"role"\s*:/` strictly requires double quotes, meaning any embedded JavaScript object literal using standard unquoted keys (`{ role: ... }`) or single quotes (`{ 'role': ... }`) bypasses Gate 5 completely.
3. **Empty Cell Coercion on Optional Numeric Columns:**  
   In `economicParameters_()`, `effectiveTaxRate: iTax >= 0 ? Number(row[iTax]) : null` evaluates to `0` (not `null`) whenever the column exists but a cell is empty (`Number("") === 0`).

---

## Detailed Findings Against the Hunt List

### 1. Readers Using Old Global Unguarded, Silent Fallbacks
**Status: CLEAN.**

- **Previous Silent Fallbacks Eliminated:**
  - `phase05-citizens/educationCareerEngine.js:roleFieldOf_`: The old guard `if (typeof ECONOMIC_PARAMETERS !== 'undefined' && ECONOMIC_PARAMETERS && ECONOMIC_PARAMETERS.length)` has been replaced with a direct call to `economicParameters_()`.
  - `phase05-citizens/generationalWealthEngine.js:jobPayTable_`: The old fallback `var E = (typeof ECONOMIC_PARAMETERS !== 'undefined' && ECONOMIC_PARAMETERS) ? ECONOMIC_PARAMETERS : []` has been replaced with a direct call to `economicParameters_()`.
  - `phase01-config/godWorldEngine2.js:buildIntakeSalaryPools_`: The internal `try { ... } catch (e) { ... return pools; }` block that returned empty pools on missing sheet/headers has been removed; it now directly calls `economicParameters_()`.
  - `utilities/citizenDerivation.js`: `canonicalRolesSet_()` and `lookupIncome_()` now call `economicParameters_()`.
- **Exhaustive Codebase Verification:**
  - A full codebase search confirms no occurrences of `typeof ECONOMIC_PARAMETERS` remain.
  - In `phase*/` and `utilities/`, the identifier `ECONOMIC_PARAMETERS` is referenced only in `utilities/citizenDerivation.js` (declaration, length check, and cache assignment inside `economicParameters_()`).
  - Node-side `lib/citizenDerivation.js` continues to require `data/economic_parameters.json` directly, preserving offline Node operations as specified in the plan.

---

### 2. Path Where a Failed Read Yields an Empty Catalog Instead of a Throw
**Status: VERIFIED SAFE AT ACCESSOR LEVEL; SAFEPHASECALL CONFINES CYCLE HALT.**

- **Accessor Throw Guarantees:**
  In `utilities/citizenDerivation.js`:
  ```javascript
  function economicParameters_() {
    if (ECONOMIC_PARAMETERS && ECONOMIC_PARAMETERS.length) return ECONOMIC_PARAMETERS;
    var sheet = openSimSpreadsheet_().getSheetByName('Economic_Parameters');
    if (!sheet) throw new Error('economicParameters_: Economic_Parameters tab missing — the job catalog has no other source (engine.199).');
    var data = sheet.getDataRange().getValues();
    var h = (data[0] || []).map(function (x) { return String(x).trim(); });
    var col = function (n) { return h.indexOf(n); };
    var iRole = col('Role'), iCat = col('Category'), iMin = col('IncomeMin'), iMax = col('IncomeMax'), iMed = col('MedianIncome');
    if (iRole < 0 || iCat < 0 || iMin < 0 || iMax < 0 || iMed < 0) {
      throw new Error('economicParameters_: Economic_Parameters header is [' + h.join(', ') + '] — needs Role, Category, IncomeMin, IncomeMax, MedianIncome.');
    }
    ...
    if (!out.length) throw new Error('economicParameters_: Economic_Parameters tab has no roles.');
    ECONOMIC_PARAMETERS = out;
    Logger.log('Economic_Parameters: loaded ' + out.length + ' roles');
    return out;
  }
  ```
  - Missing tab: throws `Economic_Parameters tab missing`.
  - Missing required columns (`Role`, `Category`, `IncomeMin`, `IncomeMax`, `MedianIncome`): throws naming the headers.
  - Header-only tab or 0 valid roles: throws `Economic_Parameters tab has no roles.`
  - Empty array guard: If `ECONOMIC_PARAMETERS = []` is present, `[].length` is 0 (falsy), so it does not return `[]`; it proceeds to the sheet read and throws if the tab is absent.
  - Therefore, `economicParameters_()` **never returns an empty array `[]`**.
- **Engine Execution Behavior Under Failure:**
  - Notice that all engine phases calling `economicParameters_()` (`Phase5-Intake`, `Phase5-Promotions`, `Phase5-Advancement`, `Phase5-Generational`, `Phase5-BusinessDynamics`) are invoked via `safePhaseCall_(ctx, phaseName, fn)`.
  - When `economicParameters_()` throws, `safePhaseCall_` catches the error, logs it to `Engine_Errors` via `logEngineError_()`, records `ok: false` in phase timings, and halts that sub-phase. The outer simulation run continues to subsequent phases.
  - This is superior to the old silent degradation: missing catalog data produces loud `Engine_Errors` entries rather than silent synthetic drift.

---

### 3. Type Coercion Bugs (Sheet Strings vs Numbers)
**Status: DEFECT / VULNERABILITY IDENTIFIED.**

In `utilities/citizenDerivation.js:44-53`:
```javascript
out.push({
  role: role,
  category: String(row[iCat] || '').trim(),
  incomeRange: [Number(row[iMin]), Number(row[iMax])],
  medianIncome: Number(row[iMed]),
  effectiveTaxRate: iTax >= 0 ? Number(row[iTax]) : null,
  economicOutputCategory: iOut >= 0 ? String(row[iOut] || '') : '',
  housingBurdenPct: iBurden >= 0 ? Number(row[iBurden]) : null,
  consumerProfile: iCons >= 0 ? String(row[iCons] || '') : '',
  notes: iNotes >= 0 ? String(row[iNotes] || '') : ''
});
```

1. **Unsanitized `Number()` on Human-Formatted Strings:**
   - In Google Sheets, if a user or script formats currency with a dollar sign or comma (e.g. `"$56,000"` or `"56,000"`), Apps Script `getValues()` may return a string.
   - `Number("$56,000")` and `Number("56,000")` evaluate to `NaN`.
   - **Downstream impact in `jobPayTable_()` (`generationalWealthEngine.js:758`):**
     `var med = Number(E[i].medianIncome) || 0; if (!(med > 0)) continue;`
     `med` becomes `0`, and the role is **silently omitted** from `byRole` and category aggregations.
   - **Downstream impact in `lookupIncome_()` (`citizenDerivation.js:140`):**
     Returns `E[i].medianIncome` directly (`NaN`). When `checkForPromotions.js:386` calls `var dIncome = lookupIncome_(occ)`, `NaN` is written into the citizen's `Income` cell!
   - **Downstream impact in `buildIntakeSalaryPools_()` (`godWorldEngine2.js:1543`):**
     `min: Number(E[r].incomeRange[0]) || 0, max: Number(E[r].incomeRange[1]) || 0`
     Coerces `NaN` to `0`, setting salary bands to `[0, 0]`.
   - *Mitigation recommendation:* Parse numeric fields with regex string stripping (as done in `businessProfit_` in `generationalWealthEngine.js:927`):
     `Number(String(row[iMed]).replace(/[$,\s]/g, ''))`
2. **Empty Cell Coercion on Optional Percentages:**
   - `effectiveTaxRate: iTax >= 0 ? Number(row[iTax]) : null`
   - If the `EffectiveTaxRate` column exists, `iTax >= 0` is true. If a given row has an empty cell (`""`), `Number("") === 0`.
   - Result: A blank cell becomes `0`, not `null`.
   - If a cell contains a formatted percentage like `"22%"`, `Number("22%") === NaN`.
   - *Mitigation recommendation:*
     `effectiveTaxRate: (iTax >= 0 && row[iTax] !== '' && row[iTax] != null) ? Number(String(row[iTax]).replace(/[%,\s]/g, '')) : null`
3. **Parity Check String Sensitivity in `syncEconomicParameters.js`:**
   - `diffSheet()` compares `String(r[c])` against `String(v)`.
   - If a number in Google Sheets is formatted as `"$56,000"`, `diffSheet` reports drift against JSON `56000` and refuses to sync. This currently acts as a strict guard against human formatting drift.

---

### 4. `buildIntakeSalaryPools_` Behavior Change
**Status: VERIFIED CLEAN PARITY WITH RESILIENT FAIL-LOUD CONTRACT.**

- **Consolidation:**
  `buildIntakeSalaryPools_` (`phase01-config/godWorldEngine2.js:1537-1548`) no longer opens `ctx.ss.getSheetByName('Economic_Parameters')`. It consumes `economicParameters_()`, cutting tab reads from two per cycle run to one.
- **Fail-Loud Contract:**
  The internal `try/catch` was intentionally dropped.
  - *Old behavior:* Caught any error, returned `pools = { 'blue-collar': [], ... }`. Downstream in `processIntake_`, `drawIntakeProfile_` returned `null`, silently flagging every new intake candidate with `review — no salary source for category...`.
  - *New behavior:* Throws loudly if the catalog is unreadable, cleanly failing `Phase5-Intake` via `safePhaseCall_` without corrupting intake rows.
- **Context Decoupling:**
  The `ctx` parameter is retained for call-site signature compatibility but is unused internally. Note that in unit tests, mocking `ctx.ss` no longer provides the catalog to `buildIntakeSalaryPools_`; `ECONOMIC_PARAMETERS` must be seeded or `openSimSpreadsheet_` mocked.

---

### 5. Test Harnesses Passing for the Wrong Reason
**Status: HARNESS BYPASS IDENTIFIED; CONTRACT TEST GAPS NOTED.**

1. **Harness Seeding Bypass (`ECONOMIC_PARAMETERS && ECONOMIC_PARAMETERS.length`):**
   - 8 test harnesses were modified in commit `a63ed660` to inject `ECONOMIC_PARAMETERS: JSON.parse(...)`:
     `scripts/careerStage.test.js`, `scripts/employerSuccess.test.js`, `scripts/hoodIncome.test.js`, `scripts/hospitalIncomePersistence.test.js`, `scripts/householdIntake.test.js`, `scripts/householdReconcile.test.js`, `scripts/ownerDoor.test.js`, and `scripts/educationLoop.test.js`.
   - Because `economicParameters_()` checks `if (ECONOMIC_PARAMETERS && ECONOMIC_PARAMETERS.length) return ECONOMIC_PARAMETERS;`, **none of these 8 unit test suites ever run the sheet-reading code or header validations in `economicParameters_()`**. They pass purely on the in-memory mock.
2. **Contract Test Assertion Blindness (`validateIntakeDerivation.contract.test.js` Test 10):**
   - Test 10 asserts:
     `assert('Gate 5 scans utilities/ + phase*/ for an embedded catalog', /ECONOMIC_PARAMETERS_START/.test(source) && /phase\\d/.test(source));`
   - This test verifies only that the validator's source code contains those regex literal strings; **it never actually executes Gate 5 against a dirty fixture to verify detection**.
   - Test 10 also asserts:
     `assert('a seeded catalog is kept (harness path) — no tab behind it, so a read would throw', throws(null, json) === null);`
     This explicitly validates that the harness bypass works when the tab is absent.
3. **Residual Stale Mock in `scripts/homeSale.test.js`:**
   - Line 24 of `scripts/homeSale.test.js` still contains `global.ECONOMIC_PARAMETERS = [];` (written during civic work on 2026-09-23).
   - Because `[].length === 0`, `economicParameters_()` does not treat this as seeded and falls through to `openSimSpreadsheet_()`.
   - Because `openSimSpreadsheet_` is undefined in `homeSale.test.js`, any call to `jobReferencePay_` or `jobPayTable_` in `homeSale.test.js` would immediately crash with `ReferenceError: openSimSpreadsheet_ is not defined`.
   - `homeSale.test.js` passes only because none of its 17 test cases exercise `jobReferencePay_`.
4. **Unseeded Runner in `scripts/hoodBlindTables.test.js`:**
   - Loads `utilities/citizenDerivation.js` without seeding `ECONOMIC_PARAMETERS`.
   - Passes only because it tests `deriveGender_`, which does not call `economicParameters_()`.

---

### 6. Whether Gate 5 in `scripts/validateIntakeDerivation.js` Actually Fires
**Status: DEFECT IDENTIFIED (OFFLINE DEAD-END + REGEX HOLES).**

Gate 5 in `scripts/validateIntakeDerivation.js:110-125`:
```javascript
  const fs = require('fs');
  const path = require('path');
  const root = path.resolve(__dirname, '..');
  const gsDirs = fs.readdirSync(root).filter(d => d === 'utilities' || /^phase\d/.test(d));
  for (const dir of gsDirs) {
    for (const f of fs.readdirSync(path.join(root, dir)).filter(n => n.endsWith('.js'))) {
      const src = fs.readFileSync(path.join(root, dir, f), 'utf-8');
      if (src.includes('ECONOMIC_PARAMETERS_START') || /\{\s*"role"\s*:/.test(src)) {
        failures.push('[Gate 5] ' + dir + '/' + f + ' embeds a job-catalog copy — the engine reads the Economic_Parameters tab (engine.199); edit data/economic_parameters.json and run `node scripts/syncEconomicParameters.js`');
      }
    }
  }
```

1. **Dead in Offline / Standard Test Runs:**
   - `scripts/validateIntakeDerivation.js` is not part of the standard `npm test` suite.
   - At line 32 of `validateIntakeDerivation.js`, `await sheets.getRawSheetData('Simulation_Ledger')` is called.
   - In any environment without live Sheets API access (e.g. standard local runs, sandboxed CI), the script crashes at line 32 and exits with code 2 (`main().catch(...)`). **Gate 5 at line 110 is never reached or executed.**
   - In `validateIntakeDerivation.contract.test.js`, subprocess execution of `validateIntakeDerivation.js` (Section B) is skipped unless `GODWORLD_TEST_LIVE === '1'`.
2. **False Negative: Bypassed by Standard JavaScript Syntax:**
   - The regex `/\{\s*"role"\s*:/` strictly requires double quotes around `"role"`.
   - If an engineer embeds an array of roles using standard JavaScript object syntax without quotes (`{ role: "Photographer", category: ... }`) or with single quotes (`{ 'role': ... }`), Gate 5 **fails to detect it**:
     - `/\{\s*"role"\s*:/.test('{ role: "Photographer" }')` -> `false`
     - `/\{\s*"role"\s*:/.test("{ 'role': 'Photographer' }")` -> `false`
3. **False Positive: Overbroad Trigger on Innocent Single Objects:**
   - Any single object in `phase*/` or `utilities/` that happens to use JSON-style `{"role": ...}` (for example, in a civic office definition, event fixture, or log serializer) will trip Gate 5 and fail with the message that the file "embeds a job-catalog copy".

---

## Recommendations for Engine-Sheet

1. **Harden Numeric Parsing in `economicParameters_()`:**
   Strip formatting characters before coercing to Number to protect against Sheet UI edits:
   ```javascript
   function cleanNum_(val) {
     if (val === null || val === undefined || val === '') return null;
     var n = Number(String(val).replace(/[$,%\s]/g, ''));
     return isNaN(n) ? null : n;
   }
   ```
2. **Fix Gate 5 Regex and Extract Static Runner:**
   - Change Gate 5 regex to `/\{\s*['"]?role['"]?\s*:/` or check for catalog size heuristic (e.g. count of role entries > 10).
   - Move Gate 5 out of the live Sheets-dependent `validateIntakeDerivation.js` into an offline static lint/check test (or add an offline `--static` flag so it runs in `npm test` without network).
3. **Clean Up `scripts/homeSale.test.js`:**
   Remove line 24 (`global.ECONOMIC_PARAMETERS = [];`) to eliminate dead mock state.
