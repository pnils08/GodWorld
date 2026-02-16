> **ARCHIVED** — Deployed (Week 4 gentrification engine still open). Moved 2026-02-16.

# Population Week 4: Gentrification & Migration - Deploy Guide (Consolidated)

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy
**Architecture:** Consolidated (extends Neighborhood_Map, no new Neighborhood_Ledger)

---

## What This Does

Adds gentrification tracking, displacement pressure calculation, and individual migration tracking to GodWorld.

**Impact:**
- 1 new sheet created (Migration_Events - event log)
- 17 new columns added total:
  - 11 columns to Neighborhood_Map (gentrification metrics)
  - 6 columns to Simulation_Ledger (citizen migration tracking)
- Gentrification phase detection (none → early → accelerating → advanced → stable-affluent)
- Displacement pressure calculation (0-10 scale)
- Individual migration intent tracking (staying → considering → planning-to-leave → left)
- Migration event logging (moved-in, moved-out, moved-within, returned)
- Zero breaking changes (backwards compatible)

**Note:** This is the consolidated version - gentrification metrics added to Neighborhood_Map
instead of creating a new Neighborhood_Ledger. Cleaner architecture for media handoff.

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addGentrificationMigrationColumns.js --dry-run

# Apply migration
node scripts/addGentrificationMigrationColumns.js
```

**Expected output:**
```
Columns added to Neighborhood_Map: 11
Columns added to Simulation_Ledger: 6
Total columns added: 17
Sheets created: 1
Neighborhoods with gentrification data: 15

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
git pull origin main
clasp push
```

**That's it!** The gentrification and migration engines are already wired into Phase 05 - no manual editing needed.

### 3. Test (1 minute)

Run this in Apps Script:

```javascript
function testGentrificationMigration() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: {
      cycleId: 100,
      storyHooks: []
    },
    now: new Date()
  };

  // Test gentrification engine
  var genResults = processGentrification_(ctx);
  Logger.log('Gentrification - Analyzed: ' + genResults.analyzed);
  Logger.log('Gentrification - Gentrifying: ' + genResults.gentrifying);
  Logger.log('Gentrification - Alerts: ' + genResults.alerts);

  // Test migration tracking engine
  var migResults = processMigrationTracking_(ctx);
  Logger.log('Migration - Assessed: ' + migResults.assessed);
  Logger.log('Migration - High risk: ' + migResults.highRisk);
  Logger.log('Migration - Events: ' + migResults.events);
}
```

**Expected output:**
```
Gentrification - Analyzed: 17 (neighborhoods)
Gentrification - Gentrifying: 5-7 (early/accelerating phases)
Gentrification - Alerts: 2-5 (story hooks)
Migration - Assessed: 594 (citizens)
Migration - High risk: 15-30 (displacement risk >= 7)
Migration - Events: 0 (will grow as simulation runs)
```

Done! Next cycle will track gentrification and migration.

---

## Verify It's Working

After next cycle runs, check Neighborhood_Map for:
- **GentrificationPhase**: none | early | accelerating | advanced | stable-affluent
  - West Oakland: "accelerating" (income +32%, rent +42%)
  - Fruitvale: "accelerating" (income +28%, rent +35%)
  - Rockridge: "stable-affluent" (high education 72%, low pressure)
- **DisplacementPressure**: 0-10 scale
  - West Oakland: 8/10 (CRISIS)
  - Fruitvale: 7/10 (HIGH)
  - Rockridge: 2/10 (low)
- **MedianIncome**: Rockridge $95k, West Oakland $35k
- **MedianRent**: Rockridge $2,800, West Oakland $1,350
- **DemographicShiftIndex**: 0-10 (rapid change indicator)

Check Simulation_Ledger for:
- **DisplacementRisk**: 0-10 scale per citizen
- **MigrationIntent**: staying | considering | planning-to-leave | left
- **MigrationReason**: (empty until migration occurs)
- **MigrationDestination**: (empty until migration occurs)
- **MigratedCycle**: 0 (until citizen migrates)
- **ReturnedCycle**: 0 (until citizen returns)

Check Migration_Events sheet for:
- Initially empty (event log grows as migrations occur)
- Columns: EventId, POPID, EventType, FromNeighborhood, ToNeighborhood, Reason, Cycle, PushFactors, PullFactors

Check logs for:
```
processGentrification_ v1.0: Complete.
  Analyzed: 17, Gentrifying: 5, Alerts: 3
processMigrationTracking_ v1.0: Complete.
  Assessed: 594, High risk: 24, Events: 0
```

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackGentrificationMigrationColumns.js
```

Then remove from Apps Script:
1. Delete gentrificationEngine.js
2. Delete migrationTrackingEngine.js
3. Remove processGentrification_() and processMigrationTracking_() calls from Phase 05
4. Re-deploy

---

## Files Added/Modified

**Created:**
1. `scripts/addGentrificationMigrationColumns.js` - Migration (consolidated architecture)
2. `phase05-citizens/gentrificationEngine.js` - Gentrification phase tracking
3. `phase05-citizens/migrationTrackingEngine.js` - Migration intent & event tracking
4. `scripts/rollbackGentrificationMigrationColumns.js` - Rollback

**Modified:**
1. `phase01-config/godWorldEngine2.js` - Wired both engines into Phase 05

---

## Gentrification System Mechanics

### Gentrification Phases
```
none:              No significant changes
early:             Income +10-25%, Rent +15-30%
accelerating:      Income +25-50%, Rent +30-60%, Pressure 6-8
advanced:          Income +50%+, Rent +60%+, Pressure 8-10
stable-affluent:   High education (60%+), low pressure, minimal change
```

### Displacement Pressure Calculation (0-10 scale)
```
Factors:
- Rent burden >30% income:       +2
- Rent burden >50% income:       +3
- Income gap (citizen vs median): +2-3
- Eviction rate >2%:             +2
- Rent increase >10%/year:       +1
- Rent increase >20%/year:       +2

Capped at 10/10
```

### Displacement Risk (per citizen, 0-10 scale)
```
Factors:
- Neighborhood displacement pressure:  +0 to +5 (pressure/2)
- Rent burden >50%:                    +4
- Rent burden >30%:                    +1
- No college degree:                   +2
- Age >65 (senior):                    +1

Capped at 10/10
```

### Migration Intent (based on displacement risk)
```
Risk 0-4:   staying
Risk 5-7:   considering
Risk 8-10:  planning-to-leave
Left:       (set after actual migration event)
```

---

## Neighborhood Gentrification Status (Initial)

### Accelerating Gentrification (HIGH ALERT)
```
West Oakland:
  - Median income: $35k (was ~$25k 5yr ago, +32%)
  - Median rent: $1,350 (was ~$950, +42%)
  - White population: 18% (was 3%, +15%)
  - High education: 18%
  - Displacement pressure: 8/10 (CRISIS)
  - Phase: accelerating

Fruitvale:
  - Median income: $38k (was ~$30k, +28%)
  - Median rent: $1,400 (was ~$1,035, +35%)
  - White population: 12%
  - High education: 22%
  - Displacement pressure: 7/10 (HIGH)
  - Phase: accelerating
```

### Early Gentrification (WATCH)
```
Temescal, Grand Lake, Lake Merritt, Jack London:
  - Income +10-20%
  - Rent +15-25%
  - Rising education levels
  - Displacement pressure: 4-5/10
```

### Stable Affluent (Already Gentrified)
```
Rockridge:
  - Median income: $95k
  - Median rent: $2,800
  - White population: 65%
  - High education: 72%
  - Displacement pressure: 2/10
  - Phase: stable-affluent

Piedmont Ave:
  - Median income: $88k
  - Median rent: $2,600
  - White population: 58%
  - High education: 68%
  - Displacement pressure: 3/10
  - Phase: stable-affluent
```

---

## Story Hooks Generated

### GENTRIFICATION_ACCELERATING (severity 8)
When neighborhood enters "accelerating" phase:
- "Fruitvale gentrification accelerating: rent up 35% in 5 years, displacement pressure at 7/10"
- Signals rapid neighborhood change, displacement crisis building

### GENTRIFICATION_EARLY (severity 5)
When neighborhood shows first signs:
- "Temescal showing early gentrification signs: income +18%, rent +22%"
- Signals beginning of transformation

### DISPLACEMENT_CRISIS (severity 9)
When displacement pressure >= 8:
- "West Oakland displacement crisis: pressure at 8/10"
- Signals severe housing crisis

### NEIGHBORHOOD_TRANSFORMATION (severity 6)
When demographic shift index >= 8:
- "Grand Lake demographics shifting rapidly (shift index: 8/10)"
- Signals rapid demographic change

### FORCED_MIGRATION (severity 7)
When individual citizen at severe risk (risk >= 9):
- "Maria Rodriguez at severe displacement risk in Fruitvale (risk: 9/10)"
- Signals individual displacement

### MASS_EXODUS (severity 8)
When 5+ citizens in same neighborhood planning to leave:
- "West Oakland mass displacement risk: 12 residents planning to leave"
- Signals community-level displacement

---

## Integration with Other Systems

**Week 1 (Household Formation):**
- Reads Household_Ledger for rent burden data
- Rent burden feeds displacement risk calculation

**Week 2 (Wealth Tracking):**
- Income data feeds median income calculation
- Wealth levels correlate with displacement risk

**Week 3 (Education):**
- Education levels (HighEducationPct) track gentrification
- No college degree increases displacement risk

**Existing Systems:**
- Neighborhood_Map.DemographicMarker enhanced with gentrification phase
- Neighborhood_Map.MigrationFlow (from applyMigrationDrift.js) complements migration tracking
- Crime_Metrics correlate with displacement pressure

---

## Architectural Improvements

**Consolidated Design:**
- Gentrification data lives in Neighborhood_Map (dynamic neighborhood state)
- All neighborhood tracking in one place (MigrationFlow, DemographicMarker, now gentrification)
- Extends existing infrastructure rather than creating new ledgers
- Migration_Events is event log (grows over time, different cardinality)

**Why consolidated?**
- Neighborhood_Map went from 16 → 27 columns (reasonable for 17 neighborhoods)
- Gentrification is dynamic state (updated every cycle), fits Neighborhood_Map semantics
- Avoids sheet proliferation (no Neighborhood_Ledger needed)
- Cleaner for media analysis - one sheet for neighborhood state

---

## Next Steps After Week 4

**Population & Demographics Complete!** 🎉

All 4 weeks deployed:
- ✅ Week 1: Household Formation & Family Trees
- ✅ Week 2: Generational Wealth & Inheritance
- ✅ Week 3: Education Pipeline & Career Pathways
- ✅ Week 4: Gentrification & Migration

**What's possible now:**
- Track families across generations
- Model wealth transfer and inequality
- Correlate education → income → career progression
- Detect gentrification and displacement
- Log individual migration decisions
- Generate rich story hooks for journalism

**Media Room can now write stories about:**
- Generational wealth gaps
- Education inequality by neighborhood
- Career stagnation and breakthroughs
- Gentrification and displacement
- Migration patterns and push/pull factors
- Neighborhood transformation over time

---

**Ready to deploy? Just run the 2 commands above!**

**Note:** Week 4 builds on Weeks 1-3 (household + wealth + education). Deploy those first if you haven't already.
