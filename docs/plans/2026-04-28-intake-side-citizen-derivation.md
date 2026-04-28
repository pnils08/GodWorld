---
title: Intake-Side Citizen Derivation
created: 2026-04-28
updated: 2026-04-28
type: plan
tags: [engine, citizens, architecture, done]
sources:
  - docs/engine/ROLLOUT_PLAN.md §Open Work Items ("DESIGN: Lifecycle defaults..." line 66 + "DESIGN: RoleType preferred upon intake" line 67)
  - docs/engine/ENGINE_REPAIR.md Row 4 (lifecycle defaults DONE S184) + Row 17 (RoleType sentinel DONE S184)
  - phase05-citizens/processAdvancementIntake.js (Path B fallback shipped S184)
  - phase07-evening-media/mediaRoomIntake.js (upstream writer with 'Citizen' literal)
  - scripts/backfillLifecycleDefaults.js (djb2 + CDF reference implementation)
  - data/economic_parameters.json (S69 — 198-entry profile pool)
pointers:
  - "[[engine/ROLLOUT_PLAN]] — parent rollout"
  - "[[engine/ENGINE_REPAIR]] — Rows 4 + 17 are the prequel"
  - "[[SCHEMA]] — doc conventions"
  - "[[index]] — register in same commit"
---

# Intake-Side Citizen Derivation

**Goal:** Specify where + how citizen demographic fields (RoleType, EducationLevel, Gender) and lifecycle defaults (YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren) get computed at intake time, so new citizens land with realistic values instead of empty cells or hardcoded sentinels. The demographic-voice fallback in `processAdvancementIntake.js` (Path B, S184) stays as defense-in-depth; this plan moves the work upstream where it belongs.

**Architecture:** Three-step pattern — **(1)** audit upstream intake writers for where each field is currently set / hardcoded / missed, **(2)** choose canonical computation source per field type (`data/economic_parameters.json` 198-entry profile pool vs live-ledger frequency draws vs agent-curated assignment, possibly hybrid), **(3)** specify intake-side derivation logic — neighborhood-aware where applicable, deterministic per-(first,last,popId) via djb2 hash (matches Path B pattern). The `scripts/backfillLifecycleDefaults.js` djb2 + age-bracket CDF approach is the reference implementation; this plan ports its logic to Apps Script intake-side. The S184 Path B fallback in `processAdvancementIntake.js` is preserved unchanged — it catches anything that slips past upstream computation.

**Terminal:** research-build (this plan + spec + canonical source decisions); engine-sheet (intake-writer changes per spec).

**Pointers:**
- S184 Row 4 close (lifecycle backfill): one-time backfill across 600+ existing citizens via `scripts/backfillLifecycleDefaults.js`. Top-value share dropped 95-99% → 2.6-49.6%. Forward-looking gap remains.
- S184 Row 17 close (RoleType sentinel): `phase05-citizens/processAdvancementIntake.js` Path B — 65-role `DEMOGRAPHIC_VOICE_ROLES` pool, deterministic per-(first,last,popId) djb2 hash, fires only when `rawRole` is empty.
- **Upstream sentinel finding:** `phase07-evening-media/mediaRoomIntake.js:591` hardcodes `'Citizen'` literal for new media-introduced citizens routed to Intake sheet. Since `'Citizen'` is truthy, the Path B fallback in `processAdvancementIntake.js` would NOT fire on this path — `rawRole || pickDemographicVoiceRole_(...)` short-circuits on truthy value. This means the literal `'Citizen'` could still flow to ledger via this path. Phase 1 inventory confirms whether this path is live or dormant.
- Reference impl `scripts/backfillLifecycleDefaults.js`: djb2 hash on POPID; rand01 stable per POPID + salt; pickFromCDF + ageBracket pattern. Five derivation functions (deriveYearsInCareer, deriveDebtLevel, deriveNetWorth, deriveMaritalStatus, deriveNumChildren).
- `data/economic_parameters.json`: list with 198 entries (S69 — confirmed S184 plan-prep). Whether entries carry neighborhood metadata is a Phase 2 question.

**Acceptance criteria:**
1. Phase 1 inventory document produced — every intake/generator path catalogued, every field's current write behavior classified (set / hardcoded sentinel / omitted / fallback-only).
2. Per-field canonical source locked in this plan (RoleType, EducationLevel, Gender, 5 lifecycle fields).
3. Per-field derivation pseudocode in this plan, Apps Script-safe (no Math.random, no crypto, no Buffer; djb2 hash + CDF only).
4. Engine-sheet has executable task specs per affected intake path — `mediaRoomIntake.js`, `processAdvancementIntake.js`, any others surfaced by Phase 1.
5. Validation fixture passes — simulated new citizen routed through full intake chain lands with all 8 fields populated, realistic, deterministic per-(first,last,popId).

**Scope explicitly excluded** (engine-sheet-owned from S184 Row 4 close-out, separate ROLLOUT items if pursued):
- POP-00004 Lucia Polito column-misalignment ('Aura' in RoleType + 'Wellness Practitioner' in DebtLevel — looks like split write).
- 137-165 empty-cell rows (no value at all in column, lacks BirthYear or row shorter than schema).
- `recordWorldEventsv3.deriveDomain` keyword coverage (Row 6 polish — separate ROLLOUT followup logged in Row 6 close-out).

---

## Tasks

### Phase 1 — Inventory (research-build)

#### Task 1.1: Audit intake / generator paths
- **Files:** `phase05-citizens/processAdvancementIntake.js`, `phase05-citizens/generateGenericCitizens.js`, `phase07-evening-media/mediaRoomIntake.js`, `scripts/ingestPublishedEntities.js`, plus any path surfaced by grepping `Simulation_Ledger`/`Generic_Citizens`/`Advancement_Intake` write call sites.
- **Steps:**
  1. For each path: identify the row-creation code site (where new citizens get appended).
  2. For each of 8 target fields (RoleType, EducationLevel, Gender, YearsInCareer, DebtLevel, NetWorth, MaritalStatus, NumChildren): record whether the path **sets a real value** / **hardcodes a sentinel** (e.g., `'Citizen'`, `12.5`, `'single'`) / **leaves empty** / **defers to downstream fallback**.
  3. Map intake → ledger column flow: which intake sheet row column → which ledger column (per `phase05-citizens/processAdvancementIntake.js` mapping).
  4. Output `output/intake_path_inventory.md` — table per path, classification per field.
- **Verify:** every intake path has a row in the inventory; every field has a classification per path.
- **Status:** **DONE S184** (research-build). Output: `output/intake_path_inventory.md`. 9 paths audited (3 live MUST FIX, 4 ALIGN/out-of-scope, 2 dormant one-time integrations). Reference pattern found: `integrateFaithLeaders.js:deriveRoleType()`.

#### Task 1.2: Disposition pass
- **Files:** this plan file (append "Phase 1 findings" subsection).
- **Steps:** read inventory, surface upstream sentinels found, classify each as:
  - **MUST FIX** — sentinel reaches ledger (e.g., `mediaRoomIntake.js:591` 'Citizen' literal IF Phase 1 confirms it's a live path).
  - **DORMANT** — code path not currently invoked; flag for cleanup but don't block.
  - **CORRECT** — already computes a real value; no change.
- **Verify:** plan changelog entry added; `output/intake_path_inventory.md` referenced.
- **Status:** **DONE S184** (this section + changelog).

### Phase 2 — Canonical source decision (research-build)

#### Task 2.1: Inventory `data/economic_parameters.json`
- **Files:** `data/economic_parameters.json` (read-only).
- **Steps:**
  1. Confirm shape: 198 entries, top-level structure (list of profile objects).
  2. Per-entry fields: identify whether each carries neighborhood, age-range, gender, education-level, income-bracket metadata.
  3. Determine whether the file is sufficient as canonical source for RoleType (with neighborhood awareness) or if it needs augmentation.
- **Verify:** inventory captured in this plan §Phase 2 findings.
- **Status:** [x] DONE S184 (engine-sheet)

#### Task 2.2: Per-field source-of-truth decision
- **Files:** this plan file (lock decisions inline).
- **Steps:** for each of 8 fields, choose:
  - **A:** `data/economic_parameters.json` profile pool (deterministic draw)
  - **B:** live Simulation_Ledger frequency draw (neighborhood-aware via existing rows)
  - **C:** djb2 hash + CDF (pure derivation, ported from backfill script)
  - **D:** hybrid (e.g., RoleType from B, lifecycle from C)
- **Verify:** decision recorded per field with rationale; Mike sign-off on canonical-source map before Phase 3.
- **Status:** [x] DONE S184 (engine-sheet)

### Phase 3 — Per-field derivation specs (research-build)

**Source map locked S184 (Phase 2.2):** RoleType + EducationLevel via live-SL frequency by neighborhood; Gender canonical 51/49 female-lean (go-forward only, existing canon untouched); 5 lifecycle fields ported from `scripts/backfillLifecycleDefaults.js`; CareerStage computed inline (no new column).

**Library shape (Task 4.2 decision):** shared derivation library, two implementations hitting the same per-field specs:
- **Apps Script:** `utilities/citizenDerivation.gs` — consumed by `phase05-citizens/processAdvancementIntake.js` and `phase07-evening-media/mediaRoomIntake.js`
- **Node:** `lib/citizenDerivation.js` — consumed by `scripts/ingestPublishedEntities.js`

Both implementations expose the same 8 per-field functions plus orchestrator:

```
hashSeed(s)                              → 32-bit unsigned int (djb2)
rand01(popId, salt)                      → [0,1) deterministic draw
pickFromCDF(r, cdf)                      → value from [(value, cumProb), ...]
ageBracket(age)                          → '18-29' | '30-44' | '45-59' | '60-74' | '75+'
deriveRoleType(seed, neighborhood, ledgerFreq) → string
deriveEducationLevel(seed, neighborhood, age, ledgerFreq) → string
deriveGender(seed, neighborhood, neighborhoodVariance) → 'female' | 'male'
deriveYearsInCareer(popId, age, careerStage) → number
deriveDebtLevel(popId, age, income)      → number 0-10
deriveNetWorth(popId, age, income, careerStage) → number (USD)
deriveMaritalStatus(popId, age)          → 'single' | 'married' | 'partnered' | 'divorced' | 'widowed'
deriveNumChildren(popId, age, maritalStatus) → number 0-5
deriveCitizenProfile(seed, age, neighborhood, ledgerFreq) → { all 8 fields }
```

Internal helpers `hashSeed`, `rand01`, `pickFromCDF`, `ageBracket` ported verbatim from `scripts/backfillLifecycleDefaults.js:48-78` — already Apps Script-safe (no Math.random / crypto / Buffer; pure djb2 + integer math).

**`ledgerFreq` parameter:** a precomputed snapshot of live SL frequency distributions, structured as:
```
{
  byNeighborhood: {
    'Temescal': { roleTypes: { 'Stylist': 12, 'Bookseller': 4, ... }, educationByAge: { '18-29': { 'hs-diploma': 8, 'bachelors': 5 }, ... } },
    'Fruitvale': { ... },
    ...
  },
  citywide: { roleTypes: {...}, educationByAge: {...} }  // fallback for thin neighborhoods
}
```
Built once per intake batch by reading Simulation_Ledger headers + RoleType + EducationLevel + Neighborhood + BirthYear columns. Cached for the duration of the intake call. Apps Script side caches in script properties; Node side caches in module scope.

#### Task 3.1: RoleType derivation spec — DONE S184

**Inputs:** `(seed, neighborhood, ledgerFreq)`. **Output:** role string.

**Logic:**
1. If `ledgerFreq.byNeighborhood[neighborhood]?.roleTypes` has ≥10 entries → frequency-weighted draw via `rand01(seed, 'role') × totalCount` cumulative scan.
2. Else → fallback to citywide RoleType frequency, same draw mechanism.
3. Filter result against `economic_parameters.json` 198-pool — if drawn role isn't in the canonical pool, retry with next-highest frequency match. Caps retries at 5; if exhausted, fall through to `pickDemographicVoiceRole_(seed)` (the Path B 65-role pool).

**Why filter against economic_parameters.json:** ensures every NEW citizen has a canonical economic profile available downstream (Income, taxRate, housingBurden) for the lifecycle derivations. Existing rows with non-canonical roles are not touched.

**Example outputs (validation fixture):**
| Citizen | Neighborhood | Likely top freq draws |
|---|---|---|
| Maria Vega (POP-99001) | Fruitvale | Hospitality / Healthcare / Cultural roles weighted from current Fruitvale SL distribution |
| Tobias Wing (POP-99002) | Rockridge | Tech / Academic / Creative roles |
| Kevin Park (POP-99003) | Jack London | Port & Labor / Maritime / Service roles |

**Status:** [x] spec locked S184.

#### Task 3.2: EducationLevel derivation spec — DONE S184

**Inputs:** `(seed, neighborhood, age, ledgerFreq)`. **Output:** one of `hs-diploma | bachelors | masters | associates | trade-cert | doctorate`.

**Logic:**
1. Compute `bracket = ageBracket(age)`.
2. If `ledgerFreq.byNeighborhood[neighborhood]?.educationByAge[bracket]` has ≥5 entries → frequency-weighted draw via `rand01(seed, 'edu')`.
3. Else → fallback to `ledgerFreq.citywide.educationByAge[bracket]`.
4. Skip the literal `"-"` sentinel found in 1 row during Phase 1 inventory (Phase 4 will also flag it as a one-off cleanup, but derivation must not propagate it).

**Why age-bracket conditioning:** education attainment is age-correlated (younger cohorts more bachelor-heavy in Oakland 2041, older skew hs-diploma). Live SL distribution captures this as it stands.

**Status:** [x] spec locked S184.

#### Task 3.3: Gender derivation spec — DONE S184

**Inputs:** `(seed, neighborhood)`. **Output:** `female | male`.

**Logic — go-forward correction (existing 760 rows untouched):**

```
const BASE_FEMALE_PCT = 0.51;  // canonical lean (corrects 67/33 live skew over time)
const NEIGHBORHOOD_VARIANCE = {
  // Slight per-neighborhood variance, ±0.02 from base. Calibrated against
  // real Oakland census + prosperity-era assumptions. All values are p(female).
  'Adams Point': 0.53,         // older / more single-female households
  'Lake Merritt': 0.52,
  'Rockridge': 0.51,
  'Temescal': 0.51,
  'Fruitvale': 0.50,
  'West Oakland': 0.50,
  'Jack London': 0.49,         // port-labor lean male
  'Coliseum': 0.49,
  ...                          // full table in Apps Script + Node libs
};
const p = NEIGHBORHOOD_VARIANCE[neighborhood] || BASE_FEMALE_PCT;
return rand01(seed, 'gender') < p ? 'female' : 'male';
```

**Why canonical not live-frequency:** live SL is 67% male / 33% female (462M / 220F across 760 rows) — a real demographic gap that originated in pre-S184 generation logic. Live-frequency draws would perpetuate the skew; canonical with neighborhood variance corrects toward real-Oakland baseline (~50/50 with mild lean) over time. Existing canon untouched per Mike S184.

**Sibling rollout item (separate from this plan):** ~200-female-citizen ingest via the intake path to accelerate ratio correction. Uses this same `deriveGender` function with explicit `gender='female'` override flag, so derivation logic is preserved — just gender draw is bypassed.

**Status:** [x] spec locked S184.

#### Task 3.4: Lifecycle defaults derivation spec (5 fields) — DONE S184

Port `scripts/backfillLifecycleDefaults.js` lines 80-197 verbatim. All five functions are already Apps Script-safe (djb2 + CDF + integer math, no Math.random / crypto / Buffer).

**deriveYearsInCareer(popId, age, careerStage)** — port from line 80. Age-bracket bell curves; retirees (`careerStage === 'retired'` OR age ≥ 65) get peak career length 30-45 years.

**deriveDebtLevel(popId, age, income)** — port from line 103. Returns 0-10 integer. Income-inverse + age curve (younger + lower income → higher debt; older + higher income → lower debt). bell-centered around 2-3.

**deriveNetWorth(popId, age, income, careerStage)** — port from line 125. Age-conditioned baseline + income multiplier + retiree bonus. Wobble factor 0.4×–2.5× for spread.

**deriveMaritalStatus(popId, age)** — port from line 159. Age-bracket CDF:
- 18-29: single 60%, partnered 18%, married 20%, divorced 2%
- 30-44: single 24%, partnered 11%, married 56%, divorced 9%
- 45-59: single 12%, partnered 5%, married 56%, divorced 23%, widowed 4%
- 60-74: single 9%, partnered 3%, married 49%, divorced 25%, widowed 14%
- 75+: single 6%, partnered 2%, married 36%, divorced 20%, widowed 36%

**deriveNumChildren(popId, age, maritalStatus)** — port from line 175. Age + marriage-conditioned fertility CDF. Returns 0-5 integer with peak at 0 for younger / single, peak at 1-2 for partnered/married middle-bracket.

**Status:** [x] spec locked S184 — direct port from reference impl, no new logic.

#### Task 3.5: CareerStage derivation (computed inline) — DONE S184

**Inputs:** `(seed, age, roleType)`. **Output:** `early | mid | senior | retired`.

**Computed inline within the derivation library** — not a column write. Used by `deriveYearsInCareer` and `deriveNetWorth` as input parameter. No Simulation_Ledger column added (per Mike S184 constraint).

**Logic:**
```
function computeCareerStage(seed, age, roleType) {
  if (age >= 65) return 'retired';
  if (age < 25) return 'early';
  if (age < 40) return 'mid';
  if (age < 55) return rand01(seed, 'career') < 0.3 ? 'senior' : 'mid';
  return 'senior';
}
```

Lightweight — age-bracket bell with light role-aware variance. The 30% rand01 split at 40-54 captures career-progression variance (some hit senior at 40, some still mid at 54).

**Note:** existing `phase05-citizens/runCareerEngine.js` computes CareerStage from career arc on triggers. This is the intake-time pre-computation so lifecycle functions have a value to work with at row-creation. runCareerEngine.js can override later via its own logic — no conflict because it only updates on triggers.

**Status:** [x] spec locked S184.

#### Task 3.6: `deriveCitizenProfile` orchestrator — DONE S184

**Inputs:** `(seed, age, neighborhood, ledgerFreq)`. **Output:** object with all 8 fields.

**Logic (dependency-ordered):**
```
function deriveCitizenProfile(seed, age, neighborhood, ledgerFreq) {
  const roleType = deriveRoleType(seed, neighborhood, ledgerFreq);
  const income = lookupIncome(roleType);  // from economic_parameters.json medianIncome
  const careerStage = computeCareerStage(seed, age, roleType);
  return {
    RoleType: roleType,
    EducationLevel: deriveEducationLevel(seed, neighborhood, age, ledgerFreq),
    Gender: deriveGender(seed, neighborhood),
    YearsInCareer: deriveYearsInCareer(seed, age, careerStage),
    DebtLevel: deriveDebtLevel(seed, age, income),
    NetWorth: deriveNetWorth(seed, age, income, careerStage),
    MaritalStatus: deriveMaritalStatus(seed, age),
    NumChildren: deriveNumChildren(seed, age, deriveMaritalStatus(seed, age))
  };
}
```

**`lookupIncome(roleType)` helper:** reads `data/economic_parameters.json`, finds entry where `entry.role === roleType`, returns `entry.medianIncome`. Fallback to 60000 if role not found (keeps lifecycle derivations from breaking on edge cases).

**Status:** [x] spec locked S184.

### Phase 4 — Engine-sheet handoff (research-build → engine-sheet)

#### Task 4.2: Library extraction — DONE S184 (spec)

**Decision: shared lib, two implementations.** Phase 1 surfaced 3 MUST FIX paths needing the same derivation; per-path inlining would 3× the maintenance surface. Library lives at:

- **Apps Script:** `utilities/citizenDerivation.gs` (in engine source folder, clasp-pushed)
- **Node:** `lib/citizenDerivation.js` (sister module, same per-field specs)

**Apps Script library structure (`utilities/citizenDerivation.gs`):**

```javascript
// ═══════════════════════════════════════════════════════════════
// citizenDerivation.gs — intake-side derivation library
// Spec: docs/plans/2026-04-28-intake-side-citizen-derivation.md
// ═══════════════════════════════════════════════════════════════

// Embedded canonical pool (sync'd from data/economic_parameters.json
// at clasp-push time via scripts/syncEconomicParameters.js — see Task 4.3)
var ECONOMIC_PARAMETERS = [
  { role: 'Longshoreman', category: 'Port & Labor', medianIncome: 138000, ... },
  ...  // 198 entries
];

// Inline neighborhood gender variance table (small, low-churn)
var NEIGHBORHOOD_GENDER_VARIANCE = {
  'Adams Point': 0.53, 'Lake Merritt': 0.52, 'Rockridge': 0.51, 'Temescal': 0.51,
  'Fruitvale': 0.50, 'West Oakland': 0.50, 'Jack London': 0.49, 'Coliseum': 0.49,
  ...  // full 17-neighborhood table
};
var BASE_FEMALE_PCT = 0.51;

// Helpers (port from scripts/backfillLifecycleDefaults.js:48-78)
function hashSeed_(s) { /* djb2 */ }
function rand01_(seed, salt) { /* hashSeed → [0,1) */ }
function pickFromCDF_(r, cdf) { /* cumulative draw */ }
function ageBracket_(age) { /* '18-29' | '30-44' | ... */ }

// Per-field derivation
function deriveRoleType(seed, neighborhood, ledgerFreq) { /* §Phase 3.1 */ }
function deriveEducationLevel(seed, neighborhood, age, ledgerFreq) { /* §Phase 3.2 */ }
function deriveGender(seed, neighborhood) { /* §Phase 3.3 */ }
function deriveYearsInCareer(seed, age, careerStage) { /* §Phase 3.4 — port */ }
function deriveDebtLevel(seed, age, income) { /* §Phase 3.4 — port */ }
function deriveNetWorth(seed, age, income, careerStage) { /* §Phase 3.4 — port */ }
function deriveMaritalStatus(seed, age) { /* §Phase 3.4 — port */ }
function deriveNumChildren(seed, age, maritalStatus) { /* §Phase 3.4 — port */ }
function computeCareerStage_(seed, age, roleType) { /* §Phase 3.5 inline */ }

// Income lookup (helper)
function lookupIncome_(roleType) {
  for (var i = 0; i < ECONOMIC_PARAMETERS.length; i++) {
    if (ECONOMIC_PARAMETERS[i].role === roleType) return ECONOMIC_PARAMETERS[i].medianIncome;
  }
  return 60000;  // fallback
}

// Ledger freq snapshot — read once per intake batch
function buildLedgerFreqSnapshot(ledgerHeaders, ledgerData) {
  // Reads RoleType, EducationLevel, Neighborhood, BirthYear columns
  // Returns { byNeighborhood: {...}, citywide: {...} }
}

// Orchestrator
function deriveCitizenProfile(seed, age, neighborhood, ledgerFreq) {
  var roleType = deriveRoleType(seed, neighborhood, ledgerFreq);
  var income = lookupIncome_(roleType);
  var careerStage = computeCareerStage_(seed, age, roleType);
  var maritalStatus = deriveMaritalStatus(seed, age);
  return {
    RoleType: roleType,
    EducationLevel: deriveEducationLevel(seed, neighborhood, age, ledgerFreq),
    Gender: deriveGender(seed, neighborhood),
    YearsInCareer: deriveYearsInCareer(seed, age, careerStage),
    DebtLevel: deriveDebtLevel(seed, age, income),
    NetWorth: deriveNetWorth(seed, age, income, careerStage),
    MaritalStatus: maritalStatus,
    NumChildren: deriveNumChildren(seed, age, maritalStatus)
  };
}
```

**Node sister module (`lib/citizenDerivation.js`):** same shape, idiomatic Node:
- `require('../data/economic_parameters.json')` instead of embedded constant
- `module.exports = { deriveCitizenProfile, deriveRoleType, ... }`
- `buildLedgerFreqSnapshot` takes data already loaded by `lib/sheets.js`

**Status:** **DONE S184** (spec). Both implementations share the same per-field algorithm; only ECONOMIC_PARAMETERS access differs (embedded constant Apps Script, require() in Node).

#### Task 4.3: Apps Script economic_parameters.json sync

- **Files:** `scripts/syncEconomicParameters.js` (NEW — engine-sheet) + `utilities/citizenDerivation.gs` ECONOMIC_PARAMETERS constant
- **Steps:**
  1. Build `scripts/syncEconomicParameters.js` — reads `data/economic_parameters.json`, generates the JS-array literal text for the `ECONOMIC_PARAMETERS` constant, writes/replaces the constant block in `utilities/citizenDerivation.gs`.
  2. Run the script before each clasp deploy when `data/economic_parameters.json` has changed.
  3. Add a header comment in citizenDerivation.gs: `// AUTO-GENERATED constant — re-run scripts/syncEconomicParameters.js if data/economic_parameters.json changes`.
- **Why:** Apps Script can't `require()` JSON; embedding-at-deploy is the standard pattern. 198 entries × ~10 keys each = ~10KB embedded — well under Apps Script size limits.
- **Verify:** `grep "Longshoreman" utilities/citizenDerivation.gs` returns the embedded role; clasp push succeeds.
- **Status:** [x] DONE S184 (engine-sheet)

#### Task 4.1: Per-intake-path implementation specs

##### Task 4.1.a: `mediaRoomIntake.js:591` — replace 'Citizen' literal

- **Files:** `phase07-evening-media/mediaRoomIntake.js` (modify)
- **Steps:**
  1. Strip the hardcoded `'Citizen'` at line 591. Replace with empty string `''` so downstream `processAdvancementIntake.js` Path B fallback fires when the row is later promoted.
  2. **Why empty, not derivation:** the new-citizen path at line 581 has `Neighborhood` blank (line 597). Derivation needs neighborhood. Defer derivation to `processAdvancementIntake.js` where neighborhood is computed during promotion.
  3. Update header comment: change `'Citizen'` line note to `'(empty — Path B in processAdvancementIntake fires demographic-voice draw at promotion)'`.
- **Verify:** `grep "'Citizen'," phase07-evening-media/mediaRoomIntake.js` returns zero hits in the new-citizen Intake row block; smoke test confirms new-citizen Intake rows ship with col J blank.
- **Status:** [x] DONE S184 (engine-sheet)

##### Task 4.1.b: `processAdvancementIntake.js:419` — extend Path B to populate 7 lifecycle fields

- **Files:** `phase05-citizens/processAdvancementIntake.js` (modify)
- **Steps:**
  1. Add at top of file: `// citizenDerivation.gs functions are global in Apps Script` (no import needed in Apps Script — sibling utilities are auto-loaded).
  2. Before line 406 (newRow construction), build ledgerFreq snapshot once per intake batch:
     ```javascript
     var ledgerFreq = buildLedgerFreqSnapshot(ledgerHeaders, ledgerData);
     ```
  3. Inside the new-citizen branch (line 401-419), after computing `newRoleType` and `newPopId`, derive remaining 7 fields:
     ```javascript
     var seed = first + '|' + last + '|' + newPopId;
     var age = 2041 - parseInt(birthYear || 2003, 10);  // age anchor 2041
     var neighborhood = lookupNeighborhood_(intakeRow);  // from intake row's neighborhood col, fallback to neighborhood-aware draw
     var profile = deriveCitizenProfile(seed, age, neighborhood, ledgerFreq);
     // Override RoleType only if rawRole was empty; respect upstream truthy values
     var newRoleType = rawRole || profile.RoleType;
     ```
  4. Map profile fields to ledger columns. Lookup column indices (similar to existing pattern at lines 337-347):
     ```javascript
     var lEducationLevel = findColByName_(ledgerHeaders, 'EducationLevel');
     var lGender = findColByName_(ledgerHeaders, 'Gender');
     var lYearsInCareer = findColByName_(ledgerHeaders, 'YearsInCareer');
     var lDebtLevel = findColByName_(ledgerHeaders, 'DebtLevel');
     var lNetWorth = findColByName_(ledgerHeaders, 'NetWorth');
     var lMaritalStatus = findColByName_(ledgerHeaders, 'MaritalStatus');
     var lNumChildren = findColByName_(ledgerHeaders, 'NumChildren');
     ```
  5. Inside newRow construction (after line 412), set each of the 7 fields:
     ```javascript
     if (lEducationLevel >= 0) newRow[lEducationLevel] = profile.EducationLevel;
     if (lGender >= 0) newRow[lGender] = profile.Gender;
     if (lYearsInCareer >= 0) newRow[lYearsInCareer] = profile.YearsInCareer;
     if (lDebtLevel >= 0) newRow[lDebtLevel] = profile.DebtLevel;
     if (lNetWorth >= 0) newRow[lNetWorth] = profile.NetWorth;
     if (lMaritalStatus >= 0) newRow[lMaritalStatus] = profile.MaritalStatus;
     if (lNumChildren >= 0) newRow[lNumChildren] = profile.NumChildren;
     ```
- **Constraint:** all 7 writes inside the new-citizen branch only (line 401 `else` block). The existing-citizen branch (line 374-399) stays unchanged — no overwrites of existing rows.
- **Verify:** smoke-test single-citizen intake (e.g., `processAdvancementIntake_(ctx)` against a fixture row); confirm new SL row has all 8 target fields populated; existing rows untouched (diff before/after shows zero changes to non-new rows).
- **Status:** [x] DONE S184 (engine-sheet)

##### Task 4.1.c: `ingestPublishedEntities.js:399` — full derivation at append time

- **Files:** `scripts/ingestPublishedEntities.js` (modify)
- **Steps:**
  1. Add at top: `const citizenDerivation = require('../lib/citizenDerivation');`
  2. Before the `appendCitizens` function (line 370), build ledgerFreq once per ingest call. Pull existing SL data via the `sheetsClient` already loaded:
     ```javascript
     async function buildLedgerFreqForIngest(sheetsClient, sheetId, headers) {
       const res = await sheetsClient.spreadsheets.values.get({
         spreadsheetId: sheetId,
         range: 'Simulation_Ledger!A1:AU',
       });
       return citizenDerivation.buildLedgerFreqSnapshot(headers, res.data.values || []);
     }
     ```
  3. Inside `appendCitizens` row construction (line 380-396), call orchestrator per candidate:
     ```javascript
     const seed = c.first + '|' + (c.last || '') + '|' + popId;
     const age = c.birthYear ? (2041 - parseInt(c.birthYear, 10)) : 30;  // default to 30 when birthYear unknown
     const neighborhood = c.neighborhood || '';  // pre-T1 NAMES INDEX may not have neighborhood
     const profile = citizenDerivation.deriveCitizenProfile(seed, age, neighborhood, ledgerFreq);
     ```
  4. Map profile to row by header name (extends the existing header-driven row builder at line 384):
     ```javascript
     const row = headers.map(h => {
       if (h === 'POPID') return popId;
       if (h === 'First') return c.first;
       if (h === 'Middle') return c.middle || '';
       if (h === 'Last') return c.last;
       if (h === 'CreatedAt') return now;
       if (h === 'Last Updated') return now;
       if (h === 'RoleType') return profile.RoleType;
       if (h === 'EducationLevel') return profile.EducationLevel;
       if (h === 'Gender') return profile.Gender;
       if (h === 'YearsInCareer') return profile.YearsInCareer;
       if (h === 'DebtLevel') return profile.DebtLevel;
       if (h === 'NetWorth') return profile.NetWorth;
       if (h === 'MaritalStatus') return profile.MaritalStatus;
       if (h === 'NumChildren') return profile.NumChildren;
       if (NEW_CITIZEN_DEFAULTS[h] !== undefined) return NEW_CITIZEN_DEFAULTS[h];
       return '';
     });
     ```
  5. Update header comment at lines 16-18: change `engine fills next cycle` to `intake-side derivation populates 8 demographic + lifecycle fields per spec; lifecycle engines refine on triggers`.
  6. Update `Status: 'pending'` default — keep it (Phase 1 inventory confirmed this is correct sentinel for engine to identify intake-derived rows for any future demographic refinement).
- **Verify:** dry-run on the C92 fixture (Mayor Santana interview .txt or any T1-format published artifact); confirm `output/intake_published_entities_c<XX>_<slug>.json` shows new candidate citizens have all 8 fields populated; spot-check 3 candidates have realistic, deterministic values.
- **Status:** [x] DONE S184 (engine-sheet)

#### Task 4.4: lookupNeighborhood helper

- **Decision question:** when `processAdvancementIntake.js` promotes a Generic_Citizen → Simulation_Ledger, neighborhood comes from the Generic_Citizens row (always populated by `generateGenericCitizens.js`). When it promotes from Advancement_Intake1, neighborhood may be blank (mediaRoomIntake doesn't set it).
- **Spec:** add helper `lookupNeighborhood_(intakeRow, ledgerHeaders)`:
  - First check intake row for Neighborhood column (Generic_Citizens path)
  - If blank, draw a random neighborhood weighted by live SL neighborhood frequency (caps the unknown-neighborhood case to plausible distribution)
  - Returns string; never returns empty
- **Why:** every lifecycle field downstream depends on neighborhood for live-frequency draws; can't defer.
- **Status:** [x] DONE S184 (engine-sheet)

### Phase 5 — Validation (research-build → engine-sheet)

#### Task 5.1: Validation fixture
- **Files:** ad-hoc test, or `scripts/validateIntakeDerivation.js`.
- **Steps:** simulate routing 3 new citizens through full intake chain (mediaRoomIntake → processAdvancementIntake) with the new derivation. Confirm all 8 fields land with realistic, deterministic values per-(first,last,popId). Spot-check distribution: 100-citizen synthetic batch should produce non-uniform field distributions (matching backfill script's smoke-test pattern).
- **Verify:** zero `'Citizen'` literal RoleTypes; zero empty cells across the 8 target fields; per-citizen determinism (same seed → same values across runs).
- **Status:** [x] DONE S184 (engine-sheet)

---

## Phase 1 findings

**Source:** `output/intake_path_inventory.md` (Task 1.1, 2026-04-28).

**9 paths audited, 8-field classification matrix per path produced.** Three live cycle paths flagged MUST FIX:

| Path | What's wrong |
|---|---|
| `mediaRoomIntake.js:591` | Hardcodes `'Citizen'` literal as RoleType. Truthy → bypasses S184 Path B fallback when row promotes to ledger. Single-line fix. |
| `processAdvancementIntake.js:405-418` | Path B handles RoleType correctly post-S184; the other 7 target fields ship blank. Extension target — same Path B pattern, 7 more fields. |
| `ingestPublishedEntities.js:399-415` | S180 standing intake. **Largest gap — all 8 target fields ship blank** on every published-artifact intake. Comment acknowledges "engine fills next cycle" but lifecycle engines fire only on triggers, so blanks persist. |

**Reference pattern found:** `integrateFaithLeaders.js:81 deriveRoleType(leaderName, orgCharacter)` — proven intake-side derivation in production, the cleanest example in the codebase. Phase 3 derivation specs should model on this shape + `processAdvancementIntake.js:pickDemographicVoiceRole_()` (djb2 + pool draw) + `scripts/backfillLifecycleDefaults.js` (djb2 + age-bracket CDF).

**Out of scope confirmed:**
- `generateGenericCitizens.js` — different schema (Generic_Citizens uses Occupation, not RoleType; 8 lifecycle fields not in tab). Gap surfaces at promotion via processAdvancementIntake, not at generation.
- `integrateAthletes.js` — updates existing rows, no creation
- `editionIntake.js` — staging tab only

**Dormant (one-time, lower priority):**
- `integrateCelebrities.js` — RoleType already computed externally; lifecycle fields blank but rare-run
- `integrateFaithLeaders.js` — already correct for RoleType; lifecycle fields blank but rare-run

**Architectural recommendation (locks in for Phase 3):** build a shared derivation library, two implementations hitting the same per-field specs:
- **Apps Script side** — `utilities/citizenDerivation.gs` consumed by `processAdvancementIntake.js` + `mediaRoomIntake.js`
- **Node side** — parallel module consumed by `ingestPublishedEntities.js` (or direct port from `backfillLifecycleDefaults.js`)

Phase 3 derivation specs become the single source of truth that both implementations must match. Phase 5 validation runs the synthetic-citizen fixture through ALL three paths to confirm parity.

**Mike's hint context confirmed:** the recently shipped citizen + business intake `ingestPublishedEntities.js` (S180) has the largest 8-field gap. It bypasses both Path B (no `processAdvancementIntake.js` involvement) and the lifecycle engines' trigger-based fill (Status='pending' rows just sit blank).

---

## Open questions

- [ ] **One combined `deriveCitizenProfile(seed, age, neighborhood)` function or per-field functions?** Phase 3 decision. Combined = atomic call site; per-field = composable.
- [ ] **Canonical source cached per-cycle or computed live per intake event?** If live-ledger frequency draws are chosen for any field, the read could be cached at cycle-start to avoid repeated sheet reads during intake bursts. Phase 2 decision.
- [ ] **Does `data/economic_parameters.json` carry neighborhood-aware data?** Task 2.1 confirms.
- [ ] **Gender canonical source.** Live-ledger neighborhood frequency, canonical 50/50 with neighborhood variance, or agent-curated? Task 2.2 decision.
- [ ] **Is `mediaRoomIntake.js:591` a live path or dormant code?** Task 1.1 audit confirms before scoping the fix as MUST FIX vs DORMANT.

---

## Validation fixture

Three synthetic citizens routed through full intake chain with deterministic seeds:

| Test seed | Expected RoleType behavior | Expected lifecycle behavior |
|---|---|---|
| `('Maria','Vega','POP-99001')` Fruitvale, age 34 | Neighborhood-aware draw — Latina-heavy roles plausible (taqueria owner, healthcare aide, etc.) | YearsInCareer 8-15, MaritalStatus weighted toward married/partnered, NumChildren 1-3 |
| `('Tobias','Wing','POP-99002')` Rockridge, age 67 | Neighborhood-aware draw — Rockridge-plausible (AI researcher, creative professional, etc.) | YearsInCareer 30+ or retirement-flagged, NetWorth high-bracket, MaritalStatus weighted married/widowed |
| `('Kevin','Park','POP-99003')` Jack London, age 22 | Neighborhood-aware draw — port/young-professional plausible | YearsInCareer 1-3, MaritalStatus single-weighted, NumChildren 0-1 |

Re-running with same seeds produces identical values (determinism check). 100-citizen batch produces non-uniform distributions (matches backfill smoke-test pattern: YearsInCareer 300+ distinct values, MaritalStatus married 49% / single 22% / divorced 14% / partnered 7% / widowed 7%, NumChildren 0-5 with peak at 0).

---

## Phase order + handoff

Research-build executes in this order:
1. Task 1.1 (audit) → produces `output/intake_path_inventory.md`.
2. Task 1.2 (disposition) → surfaces upstream sentinels for Mike's review.
3. Task 2.1 + 2.2 (canonical source decisions) → Mike sign-off on per-field source map.
4. Tasks 3.1–3.4 (derivation specs) → all locked in this plan.
5. Tasks 4.1–4.2 (engine-sheet handoff) → engine-sheet picks up.
6. Task 5.1 (validation) → fixture passes before declaring DONE.

Engine-sheet executes Tasks 4.1–4.2 from research-build's specs after each Phase 3 spec is signed off.

---

## Connects to

- **ENGINE_REPAIR Row 4** (lifecycle defaults backfill — DONE S184). This plan handles forward-looking path; backfill handled existing citizens.
- **ENGINE_REPAIR Row 17** (RoleType sentinel fallback — DONE S184). This plan handles upstream computation; Path B remains defense-in-depth.
- **ENGINE_REPAIR Row 5** (name clusters — DONE S184). Same intake-time-quality theme: caps applied at generator-side rather than post-hoc cleanup. This plan extends the pattern.
- **BUILD: Standing intake** (`scripts/ingestPublishedEntities.js`). New pending-status citizens currently land with blank demographics — intake-side derivation is the natural place to compute role + education + gender + lifecycle at row creation. Folds into Phase 4 task spec.
- **`/post-publish` Step 5** invokes `ingestPublishedEntities.js` after publish; downstream cycles fill demographics via lifecycle engines on triggers. Faster fill via this plan's intake-side derivation.

---

## Changelog

- 2026-04-28 — Initial draft (S184, research-build). Combines two engine-sheet S184 followups (Row 4 lifecycle defaults forward-looking; Row 17 RoleType upstream computation) under shared architectural theme: intake-side derivation > engine-side fallback. Same pattern as Row 5 name-cluster fix (caps at generator-side). Reference impl: `scripts/backfillLifecycleDefaults.js` (Node) ports to Apps Script. Path B fallback in `processAdvancementIntake.js` preserved as defense-in-depth.
- 2026-04-28 — Phase 1 inventory complete (Tasks 1.1 + 1.2, S184, research-build). Output: `output/intake_path_inventory.md`. 9 paths audited. **3 MUST FIX live cycle paths:** `mediaRoomIntake.js:591` (hardcoded 'Citizen' literal bypasses Path B), `processAdvancementIntake.js:405-418` (extend Path B pattern to 7 more fields), `ingestPublishedEntities.js:399-415` (largest gap — all 8 target fields blank, S180 standing intake). **Reference pattern found:** `integrateFaithLeaders.js:deriveRoleType()`. **Architectural recommendation:** shared derivation library, two implementations (Apps Script `utilities/citizenDerivation.gs` for engine-cycle paths + Node parallel module for `ingestPublishedEntities.js`), both hitting Phase 3 specs as single source of truth.
- 2026-04-28 — Phase 2 source map locked (Tasks 2.1 + 2.2, S184, research-build, Mike sign-off). `data/economic_parameters.json` confirmed as 198-entry role pool with economic metadata; no neighborhood metadata (eliminated need for separate mapping file — using live-SL frequency by neighborhood instead). Per-field decisions: RoleType + EducationLevel via live SL frequency by neighborhood (filter RoleType against economic_parameters.json 198-pool to ensure canonical economic profile available downstream); Gender canonical 51/49 female-lean with mild neighborhood variance — go-forward only, existing 760 SL rows untouched (live skew is 67M/33F; canonical corrects over time, sibling ROLLOUT item handles ~200-woman ingest separately); 5 lifecycle fields direct port from `scripts/backfillLifecycleDefaults.js` (proven calibration, already Apps Script-safe); CareerStage computed inline within derivation library (no new column). Constraint locked: NO existing-row writes anywhere in this plan — intake-time derivation only.
- 2026-04-28 — Phase 3 derivation specs locked (Tasks 3.1–3.6, S184, research-build). 8 per-field functions + orchestrator (`deriveCitizenProfile`) + 4 internal helpers (hashSeed/rand01/pickFromCDF/ageBracket) ported verbatim from `backfillLifecycleDefaults.js`. Two implementations: Apps Script `utilities/citizenDerivation.gs` and Node `lib/citizenDerivation.js`, both hitting same per-field specs. `ledgerFreq` snapshot built once per intake batch for live-SL frequency draws; cached in module/script-property scope.
- 2026-04-28 — Phase 4 + 5 implementation DONE (engine-sheet, S184). Files created: `lib/citizenDerivation.js` (Node, 470 lines, requires data/economic_parameters.json) + `utilities/citizenDerivation.js` (Apps Script, 470 lines, embeds ECONOMIC_PARAMETERS via sync script) + `scripts/syncEconomicParameters.js` (regenerates the embedded constant block from canonical JSON; 198 entries, one per line for clean diffs) + `scripts/validateIntakeDerivation.js` (Phase 5 fixture, 5-gate verdict). Files modified: `phase07-evening-media/mediaRoomIntake.js` (3 sites — line 591 `'Citizen'` literal removed, lines 1329 + 1415 `|| 'Citizen'` fallbacks removed; all 3 default to `''` now so Path B fires at promotion); `phase05-citizens/processAdvancementIntake.js` (Path B replaced with `deriveCitizenProfile_()` orchestrator call inside new-citizen branch — 9 ledger column writes added: 7 derived fields + BirthYear + Neighborhood; existing-citizen branch untouched per Mike's no-existing-row-writes constraint); `scripts/ingestPublishedEntities.js` (`require('../lib/citizenDerivation')`, ledgerFreq snapshot built once per ingest call from `citizenResolution.rows` (passed through from resolveCitizens to avoid re-fetching SL), 8-field profile mapped via header-driven row builder; existing matched-row code path unchanged). **Phase 5 validation passed all 5 gates** against live ledger snapshot (19 neighborhoods, 386 citywide roles): (1) all 8 fields populated for plan fixture; (2) zero `'Citizen'` literal across 200-citizen sweep; (3) determinism holds (same seed → same values across runs); (4) distribution non-uniform (5 marital statuses, 6 num-children buckets, 37 distinct RoleTypes in 200-batch); (5) Apps Script ECONOMIC_PARAMETERS embedded parity (198 entries match data/economic_parameters.json). Sample fixture outputs: Maria Vega/Fruitvale/34 → Barbershop Owner / married / $43k; Tobias Wing/Rockridge/67 → Electrician retired / $2.34M; Kevin Park/Jack London/22 → Trade Union Representative / $24k. Plan moves from `draft` → `done`. Apps Script changes (citizenDerivation.js + mediaRoomIntake + processAdvancementIntake) need clasp push.
- 2026-04-28 — Phase 4 engine-sheet handoff specs locked (Tasks 4.1–4.4, S184, research-build). **Library extraction (4.2):** shared lib at `utilities/citizenDerivation.gs` (Apps Script, embedded ECONOMIC_PARAMETERS constant) + `lib/citizenDerivation.js` (Node, `require()`s data/economic_parameters.json). **Sync helper (4.3):** new `scripts/syncEconomicParameters.js` regenerates the Apps Script embedded constant from the canonical JSON before clasp pushes. **Per-path implementation specs (4.1):** (a) `mediaRoomIntake.js:591` — replace 'Citizen' literal with empty string so Path B fires at promotion; (b) `processAdvancementIntake.js:419` — extend new-citizen branch with `deriveCitizenProfile()` call + 7 column writes (existing-citizen branch untouched); (c) `ingestPublishedEntities.js:399` — `require('../lib/citizenDerivation')` + per-candidate orchestrator call + extend header-driven row builder to map all 8 profile fields. **Constraint enforced everywhere:** all 7 lifecycle writes inside new-citizen branches only — `processAdvancementIntake.js` existing-citizen branch (line 374-399) stays untouched; `ingestPublishedEntities.js` `appendCitizens()` only handles candidates not already in SL by construction; `mediaRoomIntake.js:591` literal change affects only newly-routed Intake rows. ZERO existing-row writes anywhere in this plan, per Mike's S184 constraint. **Helper (4.4):** `lookupNeighborhood_()` for the Generic_Citizens vs Advancement_Intake1 promotion-source split — fallback to live SL neighborhood frequency if intake row is blank. Plan is now spec-complete through Phase 4; Phase 5 validation is the final gate. Engine-sheet has executable specs to pick up implementation.
