# GOD WORLD ENGINE v2.x – Refactoring Checklist

**Purpose:** Tactical improvements executable on v2.x without breaking simulation continuity.
**Companion Doc:** See `V3_MIGRATION.md` for architectural context and V3 contract specs.

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress / partial
- `[x]` Complete

---

## PHASE 1 — SAFETY & FOUNDATIONS

### [x] 1. Introduce Domain-Scoped Context Objects
> **V3 ITEM** — See V3_MIGRATION.md §3 "V3 Context Contract"

Canonical ctx shape defined. Implementation deferred to V3 migration.

### [~] 2. Seeded Random Number Generator
> **V3 ITEM** — See V3_MIGRATION.md §5 "RNG Spec"

**Current:** `mulberry32_(seed)` exists in `worldEventsEngine.js`
**Gap:** Not globally attached to `ctx.rng()`; 40+ files still use `Math.random()`
**Action:** Global seeding is V3 scope; can opportunistically replace Math.random() in v2.x

### [x] 3. Ledger & Sheet Caching (Performance)
**Implemented v2.10** — `utilities/sheetCache.js`
- `cache.getData()` — read caching
- `cache.queueWrite()` / `cache.queueAppend()` — batched writes
- `cache.flush()` — end-of-cycle commit

---

## PHASE 2 — ORCHESTRATION REFACTOR

### [x] 4. Split runWorldCycle into Phase Runners
**Implemented v2.x** — `safePhaseCall_()` wrapper pattern in `godWorldEngine2.js`

11 phases operational with error isolation.

### [ ] 5. Add Phase-Level Guardrails
> **V3 ITEM** — See V3_MIGRATION.md §4 "Engine Module Interface"

V3 contract includes `engine.requires` validation. Defer to V3.

---

## PHASE 3 — POPULATION ENGINE HARDENING

### [ ] 6. Couple Illness to Mortality
**Target:** `updateWorldPopulation_()` in `phase03-population/`

**Action:** Increase death rate proportional to `illnessRate`
```javascript
// Example adjustment
const illnessDeathModifier = illnessRate * ILLNESS_MORTALITY_FACTOR;
adjustedDeathRate = baseDeathRate + illnessDeathModifier;
```
**Priority:** Medium — improves simulation realism

### [ ] 7. Clamp Migration Magnitude
**Rule:** `|migration| ≤ X% of total population`

**Action:** Add bounds check in migration calculation
```javascript
const maxMigration = totalPopulation * MAX_MIGRATION_RATE;
migration = Math.max(-maxMigration, Math.min(maxMigration, migration));
```
**Priority:** Medium — prevents runaway population swings

### [ ] 8. Replace Economy Strings with Constants
**Target:** `"strong"`, `"stable"`, `"weak"`, `"booming"`, `"unstable"`

**Action:** Create enum object, replace string comparisons
```javascript
const ECONOMY = {
  BOOMING: 'booming',
  STRONG: 'strong',
  STABLE: 'stable',
  WEAK: 'weak',
  UNSTABLE: 'unstable'
};
```
**Priority:** Low — code quality improvement

---

## PHASE 4 — INTAKE & LEDGER ROBUSTNESS

### [ ] 9. Normalize Identity Fields
**Target:** `existsInLedger_()` and intake validation

**Actions:**
- Lowercase names before comparison
- Trim whitespace
- Normalize diacritics (optional: `name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')`)

**Priority:** High — prevents duplicate entries from formatting differences

### [ ] 10. Introduce Composite Identity Hash
**Suggested key:** `firstName + lastName + birthYear + originGame`

**Purpose:** Reduce collision risk, enable faster duplicate detection
```javascript
function identityHash_(citizen) {
  return `${citizen.firstName}|${citizen.lastName}|${citizen.birthYear}|${citizen.origin}`.toLowerCase();
}
```
**Priority:** Medium — supports scaling

### [ ] 11. Transactional Intake Writes
**Actions:**
- Stage intake rows in memory array
- Validate all rows before any writes
- Commit batch only after full validation passes

**Note:** Partially supported by `sheetCache.queueAppend()` — needs validation layer

**Priority:** High — prevents partial intake corruption

---

## PHASE 5 — CONFIGURATION & TUNING

### [ ] 12. Extract Magic Numbers → PopulationTuning.js
**Target values to extract:**
- Birth/death rate modifiers
- Migration bounds
- Employment drift factors
- Illness adjustment multipliers
- Age distribution weights

**File:** `utilities/PopulationTuning.js`

**Priority:** Medium — improves maintainability

### [ ] 13. World Constants → WorldConstants.js
**Target values to extract:**
- Economy enum (from item 8)
- Season definitions
- Weather types
- Holiday lists (Audit Issue #14)
- Domain keys

**File:** `utilities/WorldConstants.js`

**Priority:** Medium — V3 prep work

---

## PHASE 6 — OBSERVABILITY & RECOVERY

### [ ] 14. Cycle Replay Mode
> **V3 ITEM** — See V3_MIGRATION.md §3 `ctx.mode`

**Actions:**
- Accept `cycleId` parameter to replay specific cycle
- Disable persistence writes during replay
- Requires seeded RNG (item 2) to be deterministic

**Priority:** V3 scope

### [ ] 15. Dry-Run Mode
> **V3 ITEM** — See V3_MIGRATION.md §3 `ctx.mode`

**Actions:**
- Skip all sheet writes
- Log intended operations only
- Useful for testing and validation

**Priority:** V3 scope

---

## COMPLETION CRITERIA

- [x] Sheet caching operational
- [x] Phase runners with error isolation
- [ ] No direct `Math.random()` in core engines
- [ ] No sheet scanned more than once per cycle (enforced)
- [ ] Tunables centralized in config files
- [ ] Identity normalization in intake

---

## RECOMMENDED EXECUTION ORDER

**V2.x Immediate (pre-V3):**
1. Item 9 — Normalize identity fields
2. Item 11 — Transactional intake writes
3. Item 6 — Couple illness to mortality
4. Item 7 — Clamp migration magnitude

**V2.x Opportunistic:**
5. Item 8 — Economy enum
6. Item 12 — PopulationTuning.js
7. Item 13 — WorldConstants.js

**V3 Scope:**
- Items 1, 2 (global), 5, 14, 15

---

## CROSS-REFERENCE

| This Checklist | V3_MIGRATION.md Section |
|----------------|-------------------------|
| Item 1 (ctx domains) | §3 V3 Context Contract |
| Item 2 (RNG) | §5 RNG Spec |
| Item 5 (guardrails) | §4 Engine Module Interface |
| Item 14-15 (modes) | §3 ctx.mode |

---

*Last updated: 2026-01-21*
