# Week 1: Citizen Fame & Media Exposure Implementation

**Status:** Ready for deployment
**Version:** v1.0
**Date:** 2026-02-11
**Part of:** Story & Narrative Enhancement Plan

---

## Overview

Week 1 adds citizen fame tracking based on media coverage. When citizens are mentioned in Cycle Pulse editions, their fame scores are updated across all citizen ledgers, and Generic_Citizens are flagged for promotion when they receive significant coverage.

**Key Features:**
- FameScore tracking (0-100) based on media mentions
- Notoriety context ("local hero", "controversial figure", etc.)
- Fame trend tracking (rising/stable/fading)
- Automatic promotion flagging for Generic_Citizens
- Storyline coverage metrics
- Cross-ledger synchronization (Simulation, Generic, Cultural, Chicago)

---

## Files Created/Modified

### New Files

1. **`scripts/addCitizenFameColumns.js`** - Migration script
   - Adds 18 new columns across 5 sheets
   - Safe to re-run (skips existing columns)
   - Dry-run mode available

2. **`phase07-evening-media/citizenFameTracker.js`** - Fame tracking engine
   - Processes Citizen_Media_Usage mentions
   - Updates FameScore, MediaMentions, FameTrend
   - Flags Generic_Citizens for promotion
   - Syncs with all citizen ledgers

3. **`scripts/rollbackCitizenFameColumns.js`** - Rollback script
   - Removes all 18 columns if needed
   - 5-second warning before deletion
   - Dry-run mode available

4. **`docs/engine/WEEK1_CITIZEN_FAME_TRACKING.md`** - This file

### Modified Files

1. **`phase07-evening-media/mediaRoomIntake.js`** (v2.5 → v2.6)
   - Added `updateCitizenFameFromMedia_()` call in `processAllIntakeSheets_()`
   - Updated logging to include fame tracking results
   - Enhanced version header

---

## Schema Changes

### Simulation_Ledger (+7 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| FameScore | Number (0-100) | 0 | Overall fame level |
| Notoriety | String | "" | Context-based descriptor ("local hero", etc.) |
| MediaMentions | Number | 0 | Total mention count |
| LastMentionedCycle | Number | "" | Most recent cycle mentioned |
| FameTrend | String | "stable" | rising/stable/fading |
| ActiveStorylines | JSON Array | "[]" | Storyline IDs citizen is involved in |
| StorylineRole | String | "" | primary/supporting/background |

### Generic_Citizens (+3 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| PromotionCandidate | String | "no" | yes/no flag for promotion |
| PromotionScore | Number (0-100) | 0 | Score based on media mentions |
| PromotionReason | String | "" | Why flagged for promotion |

### Cultural_Ledger (0 new columns)

**No changes needed.** Existing columns used:
- FameScore (already exists)
- MediaCount (already exists)
- TrendTrajectory (already exists, synced as ascending/stable/declining)

### Chicago_Citizens (+4 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| FameScore | Number (0-100) | 0 | Overall fame level |
| MediaMentions | Number | 0 | Total mention count |
| LastMentionedCycle | Number | "" | Most recent cycle mentioned |
| FameTrend | String | "stable" | rising/stable/fading |

### Storyline_Tracker (+3 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| LastCoverageCycle | Number | "" | Last cycle covered in media |
| MentionCount | Number | 0 | How many times covered |
| CoverageGap | Number | 0 | Cycles since last mention |

### Citizen_Media_Usage (+1 column)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| FameProcessed | String | "" | "Y" when processed by fame tracker |

**Total: 18 new columns**

---

## Deployment Instructions

### Step 1: Run Migration (Local)

```bash
cd ~/GodWorld

# Dry run first to see what will be added
node scripts/addCitizenFameColumns.js --dry-run

# Apply migration
node scripts/addCitizenFameColumns.js
```

**Expected output:**
```
✅ Connected: GodWorld Simulation
...
Simulation_Ledger: 7 columns added
Generic_Citizens: 3 columns added
Chicago_Citizens: 4 columns added
Storyline_Tracker: 3 columns added
Cultural_Ledger: Verified (existing columns compatible)

✅ Migration complete!
```

### Step 2: Deploy to Apps Script

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

**Files deployed:**
- `phase07-evening-media/citizenFameTracker.js` (new)
- `phase07-evening-media/mediaRoomIntake.js` (updated to v2.6)

### Step 3: Verify Deployment

1. Open Apps Script editor
2. Verify `citizenFameTracker.js` is present
3. Check `mediaRoomIntake.js` header shows v2.6
4. Look for `updateCitizenFameFromMedia_` function in citizenFameTracker.js

---

## Testing

### Test 1: Manual Fame Update

Run this manually in Apps Script:

```javascript
function testFameTracking() {
  var ss = openSimSpreadsheet_();
  var cycle = getCurrentCycle_(ss);
  var cal = getCurrentCalendarContext_(ss);

  var results = updateCitizenFameFromMedia_(ss, cycle, cal);

  Logger.log('Fame Tracking Test Results:');
  Logger.log('- Processed: ' + results.processed + ' mentions');
  Logger.log('- Sim updates: ' + results.simulationUpdates);
  Logger.log('- Generic promotions: ' + results.genericPromotions);
  Logger.log('- Chicago updates: ' + results.chicagoUpdates);
  Logger.log('- Cultural syncs: ' + results.culturalSyncs);
  Logger.log('- Errors: ' + results.errors.length);
}
```

### Test 2: End-to-End Cycle Test

1. **Create test data in Citizen_Media_Usage:**
   - Add 3-4 rows with current cycle
   - Use names from Simulation_Ledger
   - Vary UsageType (mentioned, quoted, profiled, featured)

2. **Run intake processing:**
   ```javascript
   processMediaIntakeV2();
   ```

3. **Verify results:**
   - Check Simulation_Ledger: FameScore updated?
   - Check Citizen_Media_Usage: FameProcessed = "Y"?
   - Check Generic_Citizens: Any promotions flagged?

4. **Check logs:**
   ```
   Fame Tracking: 4 mentions → 3 updates, 1 promotion
   ```

### Test 3: Full Cycle Integration

1. Run a full cycle: `runSingleCycleV2()`
2. Check Phase 11 logs for:
   ```
   processMediaIntake_ v2.6: Complete.
   Fame: 12 mentions → 8 updates
   ```
3. Verify Simulation_Ledger FameScore changes
4. Verify Generic_Citizens promotions if applicable

---

## Fame Calculation Logic

### Usage Type Weights

| Usage Type | Points | Example |
|------------|--------|---------|
| featured | +15 | Front page feature article |
| profiled | +12 | In-depth profile piece |
| quoted | +8 | Direct quote in article |
| mentioned | +3 | Name mentioned in passing |
| background | +1 | Background reference |

### Fame Thresholds

| Score | Status | Description |
|-------|--------|-------------|
| 0-9 | Unknown | Not recognized |
| 10-29 | Emerging | Emerging local figure |
| 30-59 | Recognized | Recognized around Oakland |
| 60-84 | Prominent | Prominent figure |
| 85-100 | Celebrity | Local celebrity |

### Fame Trend

| Trend | Condition |
|-------|-----------|
| **rising** | +10 or more fame this cycle |
| **stable** | Minor changes, recent mentions |
| **fading** | No mentions for 5+ cycles OR declining |

### Notoriety Types

Context-based descriptors assigned based on mention context:

| Category | Descriptors |
|----------|-------------|
| **civic** | local official, civic leader, council voice, city figure |
| **sports** | athlete, team star, sports figure, player spotlight |
| **culture** | artist, cultural figure, community voice, local talent |
| **hero** | local hero, community champion, beloved figure |
| **controversy** | controversial figure, polarizing voice, debated figure |
| **emerging** | rising voice, emerging figure, new face, growing presence |

---

## Promotion Logic (Generic_Citizens)

**Threshold:** 3+ mentions OR PromotionScore ≥ 30

When threshold met:
1. PromotionCandidate = "yes"
2. PromotionScore = calculated score
3. PromotionReason = "Media coverage: N mentions in cycle X"

**Note:** Promotion flagging only. Actual promotion to Simulation_Ledger is handled by processIntakeV3 in Phase 5.

---

## Integration Flow

```
Cycle Pulse edition written
  ↓
editionIntake.js parses edition
  ↓
Writes to Citizen_Usage_Intake
  ↓
Phase 11: processMediaIntake_(ctx)
  ↓
  ├─ processArticleIntake_() → Press_Drafts
  ├─ processStorylineIntake_() → Storyline_Tracker
  ├─ processCitizenUsageIntake_() → Citizen_Media_Usage
  ├─ routeCitizenUsageToIntake_() → Intake/Advancement_Intake1
  └─ [NEW] updateCitizenFameFromMedia_() → Updates fame scores
      ├─ Simulation_Ledger (FameScore, MediaMentions, FameTrend)
      ├─ Generic_Citizens (PromotionCandidate, PromotionScore)
      ├─ Chicago_Citizens (FameScore, MediaMentions, FameTrend)
      ├─ Cultural_Ledger (sync with existing FameScore)
      └─ Storyline_Tracker (coverage metrics)
```

---

## Troubleshooting

### Problem: Fame tracker doesn't run

**Check:**
1. Did migration add columns? `node scripts/addCitizenFameColumns.js --dry-run`
2. Is citizenFameTracker.js deployed to Apps Script?
3. Check Apps Script logs for function errors

**Fix:**
```javascript
// Verify function exists
if (typeof updateCitizenFameFromMedia_ === 'function') {
  Logger.log('Fame tracker is available');
} else {
  Logger.log('Fame tracker NOT FOUND - check deployment');
}
```

### Problem: Columns not found error

**Error:** `FameScore column not found. Run migration first.`

**Fix:**
```bash
# Re-run migration
node scripts/addCitizenFameColumns.js
```

### Problem: Citizens not found in ledgers

**Symptom:** Mentions processed but no updates

**Check:**
1. Name matching: "John Smith" vs "John" "Smith"
2. Ledger priority: Simulation → Chicago → Cultural → Generic
3. Check logs for "Citizen not found" messages

**Fix:** Ensure citizen names in Citizen_Media_Usage match ledger names exactly

### Problem: Promotion not flagging

**Check:**
1. Mention count: Need 3+ mentions OR 30+ score
2. Citizen in Generic_Citizens (not Simulation_Ledger)
3. Check PromotionScore calculation in logs

---

## Rollback Procedure

If you need to undo Week 1 changes:

```bash
cd ~/GodWorld

# Dry run first
node scripts/rollbackCitizenFameColumns.js --dry-run

# Apply rollback (5-second warning before deletion)
node scripts/rollbackCitizenFameColumns.js
```

**Then remove from Apps Script:**
1. Delete `citizenFameTracker.js`
2. Revert `mediaRoomIntake.js` to v2.5 (remove fame tracking call)
3. `npx clasp push`

---

## Next Steps: Week 2

**Week 2: Arc Lifecycle Automation**
- Auto-advance arcs through phases (seed → opening → building → climax → resolution)
- Phase duration tracking
- Tension decay over time
- Resolution triggers based on story conditions
- Adds 8 new columns to Arc_Ledger and Event_Arc_Ledger

---

## Reference Documents

- [Story & Narrative Enhancement Plan](STORY_NARRATIVE_ENHANCEMENT_PLAN.md) - Full 4-week plan
- [Media Room Intake v2.6](../../phase07-evening-media/mediaRoomIntake.js) - Integration point
- [Citizen Fame Tracker v1.0](../../phase07-evening-media/citizenFameTracker.js) - Fame tracking engine

---

**Deployment Checklist:**

- [ ] Migration run locally (columns added)
- [ ] citizenFameTracker.js deployed to Apps Script
- [ ] mediaRoomIntake.js v2.6 deployed to Apps Script
- [ ] Test 1: Manual fame update (testFameTracking)
- [ ] Test 2: End-to-end intake test
- [ ] Test 3: Full cycle integration test
- [ ] Verify logs show fame tracking results
- [ ] Verify Simulation_Ledger fame scores updating
- [ ] Verify Generic_Citizens promotions flagging

---

**Last Updated:** 2026-02-11
**Author:** GodWorld Project Team
**Status:** ✅ Ready for deployment
