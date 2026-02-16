> **ARCHIVED** — Architecture plan captured. Implementation tracked in PROJECT_STATUS.md. Moved 2026-02-16.

# Week 4: Gentrification & Migration - Consolidated Architecture Plan

**Date:** 2026-02-11
**Status:** Planning - Before Implementation
**Principle:** Extend existing infrastructure, don't create new sheets

---

## Consolidation Strategy

### Original Plan (POPULATION_DEMOGRAPHICS_ENHANCEMENT_PLAN.md)
- Create new **Neighborhood_Ledger** sheet with 11 columns
- Create new **Migration_Events** sheet with 9 columns
- Add 6 columns to **Simulation_Ledger**

### Consolidated Plan (This Implementation)
- **Extend Neighborhood_Map** with 11 gentrification columns (no new sheet)
- **Create Migration_Events** sheet (justified - event log, not attributes)
- Add 6 columns to **Simulation_Ledger** (as planned)

---

## Why Consolidate into Neighborhood_Map?

### Current Neighborhood_Map Schema (16 columns)
```
Timestamp, Cycle, Neighborhood,
NightlifeProfile, NoiseIndex, CrimeIndex,
RetailVitality, EventAttractiveness, Sentiment,
DemographicMarker, Holiday, HolidayPriority,
FirstFriday, CreationDay, SportsSeason, MigrationFlow
```

### Key Observations
1. **Already tracks dynamic neighborhood state**
   - Updated every cycle (has Timestamp, Cycle)
   - Has MigrationFlow (calculated by applyMigrationDrift.js)
   - Has DemographicMarker ("Stable", "pressure zone", etc.) ← This is gentrification!

2. **Perfect semantic fit for gentrification**
   - DemographicMarker can be enhanced to show gentrification phase
   - MigrationFlow already tracks population movement
   - CrimeIndex, Sentiment, RetailVitality all relate to gentrification

3. **Avoids sheet proliferation**
   - Neighborhood_Map: 16 → 27 columns (reasonable for 17 neighborhoods)
   - All neighborhood state in one place
   - Cleaner for media handoff

### Alternative Considered: Neighborhood_Demographics
- More static (Students, Adults, Seniors counts)
- Less frequently updated
- Better for demographic snapshots, not dynamic gentrification tracking
- **Decision:** Use Neighborhood_Map for gentrification

---

## Schema Changes

### 1. Neighborhood_Map (+11 columns)

**Gentrification Phase Tracking:**
```
GentrificationPhase        → none | early | accelerating | advanced | stable-affluent
DisplacementPressure       → 0-10 (0=none, 10=severe)
GentrificationStartCycle   → cycle when gentrification began
```

**Economic Indicators:**
```
MedianIncome               → $ per household
MedianIncomeChange5yr      → % change over 5 years
MedianRent                 → $ per month
MedianRentChange5yr        → % change over 5 years
```

**Demographic Shift:**
```
DemographicShiftIndex      → 0-10 (rapid demographic change)
WhitePopulationPct         → % of population
WhitePopulationChange5yr   → % change over 5 years
HighEducationPct           → % with bachelor+ degree
```

**Total: Neighborhood_Map 16 → 27 columns**

### 2. Simulation_Ledger (+6 columns)

**Citizen Migration Tracking:**
```
DisplacementRisk           → 0-10 (likelihood of forced move)
MigrationIntent            → staying | considering | planning-to-leave | left
MigrationReason            → job | family | cost | crime | opportunity | displaced
MigrationDestination       → "SF" | "NYC" | "Atlanta" | etc. (if left)
MigratedCycle              → cycle when left Oakland (0 if never left)
ReturnedCycle              → cycle when returned (0 if never returned)
```

**Total: Simulation_Ledger 25 → 31 columns**

### 3. Migration_Events (NEW SHEET - 9 columns)

**Event Log (not consolidatable - this is historical event data):**
```
EventId                    → primary key (auto-increment)
POPID                      → citizen identifier
EventType                  → moved-in | moved-out | moved-within | returned
FromNeighborhood           → origin
ToNeighborhood             → destination (or city if moved-out)
Reason                     → job | family | cost | crime | opportunity | displaced
Cycle                      → when event occurred
PushFactors                → JSON string (what drove them away)
PullFactors                → JSON string (what attracted them)
```

**Why this sheet is justified:**
- Historical event log (grows over time)
- One row per migration event (not one row per citizen)
- Enables migration pattern analysis over time
- Different cardinality than citizen or neighborhood attributes

---

## Engine Files

### 1. NEW: phase05-citizens/gentrificationEngine.js v1.0

**Functions:**
```javascript
processGentrification_(ctx)
  └─ detectGentrificationPhase_()        // Calculate phase per neighborhood
  └─ calculateDisplacementPressure_()    // Rent burden + income mismatch
  └─ trackDemographicShift_()            // Income/education/race changes
  └─ updateGentrificationMetrics_()      // Write to Neighborhood_Map
  └─ generateGentrificationHooks_()      // Story hooks
```

**Integration:**
- Wired into Phase 05 (godWorldEngine2.js)
- Reads Neighborhood_Map current state
- Reads Simulation_Ledger for citizen-level demographics
- Reads Household_Ledger for income data
- Writes gentrification metrics to Neighborhood_Map

### 2. NEW: phase05-citizens/migrationTrackingEngine.js v1.0

**Functions:**
```javascript
processMigrationTracking_(ctx)
  └─ assessDisplacementRisk_()           // Calculate risk per citizen
  └─ updateMigrationIntent_()            // staying → considering → planning
  └─ processMigrationEvents_()           // moved-out, moved-in, moved-within
  └─ logMigrationEvent_()                // Write to Migration_Events
  └─ calculatePushPullFactors_()         // Why they left/arrived
  └─ generateMigrationHooks_()           // Story hooks
```

**Integration:**
- Wired into Phase 05 (godWorldEngine2.js)
- Reads Simulation_Ledger (citizen income, rent, neighborhood)
- Reads Household_Ledger (household rent burden)
- Reads Neighborhood_Map (gentrification phase, displacement pressure)
- Writes to Simulation_Ledger (displacement risk, migration intent/reason)
- Writes to Migration_Events (event log)

### 3. MAYBE UPDATE: phase06-analysis/applyMigrationDrift.js v2.6 → v3.0?

**Current capabilities (v2.6):**
- Calculates MigrationFlow per neighborhood
- Writes to Neighborhood_Map column P
- Aggregate city-level migration

**Possible v3.0 enhancements:**
- Read individual migration events from Migration_Events
- Aggregate to neighborhood MigrationFlow
- Feedback loop: migration events → MigrationFlow

**Decision:** Start with separate migration tracking engine, evaluate if applyMigrationDrift needs updates after testing.

---

## Migration Scripts

### 1. scripts/addGentrificationMigrationColumns.js

**What it does:**
1. Add 11 columns to Neighborhood_Map with defaults:
   - GentrificationPhase: "none"
   - DisplacementPressure: 0
   - MedianIncome: 55000 (Oakland median)
   - MedianRent: 1800 (Oakland median)
   - All change metrics: 0
   - DemographicShiftIndex: 0
   - WhitePopulationPct: 30 (Oakland avg)
   - HighEducationPct: 45 (Oakland avg)
   - GentrificationStartCycle: 0

2. Add 6 columns to Simulation_Ledger with defaults:
   - DisplacementRisk: 0
   - MigrationIntent: "staying"
   - MigrationReason: ""
   - MigrationDestination: ""
   - MigratedCycle: 0
   - ReturnedCycle: 0

3. Create Migration_Events sheet (9 columns, starts empty)

4. Populate initial gentrification data by neighborhood:
   - Rockridge: MedianIncome $95k, MedianRent $2,800, HighEducation 72%
   - West Oakland: MedianIncome $38k, MedianRent $1,400, HighEducation 18%
   - Fruitvale: MedianIncome $42k, MedianRent $1,500, HighEducation 22%
   - etc. (15 neighborhoods with Oakland-based data)

### 2. scripts/rollbackGentrificationMigrationColumns.js

**What it does:**
1. Remove 11 columns from Neighborhood_Map
2. Remove 6 columns from Simulation_Ledger
3. Delete Migration_Events sheet

---

## Gentrification Detection Logic

### Phase Calculation
```javascript
function detectGentrificationPhase(
  incomeChange5yr,
  rentChange5yr,
  whitePopChange5yr,
  highEducationPct,
  displacementPressure
) {
  // none: No significant changes
  if (incomeChange5yr < 10 && rentChange5yr < 15) {
    return 'none';
  }

  // early: Beginning signs
  if (incomeChange5yr >= 10 && incomeChange5yr < 25 &&
      rentChange5yr >= 15 && rentChange5yr < 30) {
    return 'early';
  }

  // accelerating: Rapid changes
  if (incomeChange5yr >= 25 && incomeChange5yr < 50 &&
      rentChange5yr >= 30 && rentChange5yr < 60 &&
      displacementPressure >= 6) {
    return 'accelerating';
  }

  // advanced: Severe displacement
  if (incomeChange5yr >= 50 &&
      rentChange5yr >= 60 &&
      displacementPressure >= 8) {
    return 'advanced';
  }

  // stable-affluent: Gentrification complete
  if (incomeChange5yr < 5 &&
      rentChange5yr < 10 &&
      highEducationPct > 60) {
    return 'stable-affluent';
  }

  return 'none';
}
```

### Displacement Pressure Calculation
```javascript
function calculateDisplacementPressure(
  rentBurdenAvg,         // % of income on rent
  incomeGap,             // gap between neighborhood median and resident median
  evictionRate,          // % of households evicted
  rentIncreaseRate       // % rent increase in 1 year
) {
  var pressure = 0;

  if (rentBurdenAvg > 30) pressure += 2;
  if (rentBurdenAvg > 50) pressure += 3;

  if (incomeGap > 20) pressure += 2;
  if (incomeGap > 40) pressure += 3;

  if (evictionRate > 2) pressure += 2;
  if (evictionRate > 5) pressure += 3;

  if (rentIncreaseRate > 10) pressure += 1;
  if (rentIncreaseRate > 20) pressure += 2;

  return Math.min(pressure, 10);
}
```

---

## Story Hooks

### GENTRIFICATION_ACCELERATING (severity 8)
**When:** Neighborhood enters "accelerating" phase
**Example:** "Fruitvale gentrification accelerating: median rent up 45% in 5 years, displacement pressure at 7/10"

### DISPLACEMENT_CRISIS (severity 9)
**When:** 10+ citizens in one neighborhood have DisplacementRisk >= 8
**Example:** "West Oakland displacement crisis: 24 residents at severe risk of forced move"

### FORCED_MIGRATION (severity 7)
**When:** Citizen forced to leave due to eviction/pricing
**Example:** "Maria Rodriguez displaced from Fruitvale after rent increased 60%"

### NEIGHBORHOOD_TRANSFORMATION (severity 6)
**When:** DemographicShiftIndex >= 8
**Example:** "Temescal demographics shifting rapidly: college-educated population up 35% in 3 years"

---

## Dependencies & Integration Points

### Reads From:
- **Neighborhood_Map** (current gentrification state)
- **Simulation_Ledger** (citizen income, neighborhood, status)
- **Household_Ledger** (rent, income, rent burden) - *Week 1*
- **Crime_Metrics** (crime pressure)
- **Neighborhood_Demographics** (age distribution)

### Writes To:
- **Neighborhood_Map** (11 gentrification columns)
- **Simulation_Ledger** (6 migration tracking columns)
- **Migration_Events** (migration event log)
- **ctx.summary.storyHooks** (gentrification/displacement hooks)

### Phase 05 Wiring:
```javascript
// In godWorldEngine2.js Phase 05
safePhaseCall_(ctx, 'Phase5-Gentrification', function() {
  processGentrification_(ctx);
});

safePhaseCall_(ctx, 'Phase5-MigrationTracking', function() {
  processMigrationTracking_(ctx);
});
```

---

## Testing Plan

### 1. Migration Script Dry-Run
```bash
node scripts/addGentrificationMigrationColumns.js --dry-run
```

### 2. Engine Test (Apps Script)
```javascript
function testGentrification() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] },
    now: new Date()
  };

  var results = processGentrification_(ctx);
  Logger.log('Neighborhoods analyzed: ' + results.analyzed);
  Logger.log('Gentrifying neighborhoods: ' + results.gentrifying);
  Logger.log('Displacement pressure alerts: ' + results.alerts);
}
```

### 3. Migration Tracking Test
```javascript
function testMigrationTracking() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] },
    now: new Date()
  };

  var results = processMigrationTracking_(ctx);
  Logger.log('Displacement risk assessed: ' + results.assessed);
  Logger.log('High risk citizens: ' + results.highRisk);
  Logger.log('Migration events: ' + results.events);
}
```

---

## Next Steps

1. ✅ Review existing infrastructure (Neighborhood_Map, applyMigrationDrift.js)
2. ✅ Plan consolidation strategy
3. ⏸️ Build migration script (addGentrificationMigrationColumns.js)
4. ⏸️ Build gentrificationEngine.js
5. ⏸️ Build migrationTrackingEngine.js
6. ⏸️ Wire to Phase 05
7. ⏸️ Test with dry-run
8. ⏸️ Create deployment guide
9. ⏸️ Deploy

---

**Principle:** Measure twice, cut once. Extend existing infrastructure.
