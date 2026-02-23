> **ARCHIVED** — Deployed. Moved 2026-02-16.

# Week 1: Citizen Fame Tracking - Quick Deploy Guide

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Tracks citizen fame based on media coverage. When citizens are mentioned in Cycle Pulse editions, their FameScore is updated and Generic_Citizens are flagged for promotion.

**Impact:**
- 18 new columns added across 5 sheets
- Automatic fame tracking after each cycle
- Promotion flagging for background citizens
- Zero breaking changes (all backwards compatible)

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addCitizenFameColumns.js --dry-run

# Apply migration
node scripts/addCitizenFameColumns.js
```

**Expected output:**
```
Simulation_Ledger: 7 columns added
Generic_Citizens: 3 columns added
Chicago_Citizens: 4 columns added
Storyline_Tracker: 3 columns added
Cultural_Ledger: Verified (no changes needed)

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

### 3. Test (2 minutes)

Run this in Apps Script editor:

```javascript
function testFameTracking() {
  var ss = openSimSpreadsheet_();
  var cycle = getCurrentCycle_(ss);
  var cal = getCurrentCalendarContext_(ss);

  var results = updateCitizenFameFromMedia_(ss, cycle, cal);

  Logger.log('Fame Tracking Test:');
  Logger.log('Processed: ' + results.processed + ' mentions');
  Logger.log('Updates: ' + results.simulationUpdates);
  Logger.log('Promotions: ' + results.genericPromotions);
}
```

**Expected output:**
```
Fame Tracking Test:
Processed: 0 mentions (no new data yet)
Updates: 0
Promotions: 0
```

That's it! Next cycle will automatically track fame.

---

## Verify It's Working

After next cycle runs, check logs for:

```
processMediaIntake_ v2.6: Complete.
Fame: 12 mentions → 8 updates
```

Then check Simulation_Ledger:
- FameScore column populated
- MediaMentions incrementing
- FameTrend showing rising/stable/fading

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackCitizenFameColumns.js
```

Then remove from Apps Script:
1. Delete citizenFameTracker.js
2. Remove fame tracking call from mediaRoomIntake.js line 133
3. `npx clasp push`

---

## Files Added

1. `scripts/addCitizenFameColumns.js` - Migration
2. `phase07-evening-media/citizenFameTracker.js` - Fame engine
3. `scripts/rollbackCitizenFameColumns.js` - Rollback
4. `docs/engine/WEEK1_CITIZEN_FAME_TRACKING.md` - Full docs

**Files Modified:**
1. `phase07-evening-media/mediaRoomIntake.js` (v2.5 → v2.6)

---

## Full Documentation

See: `docs/engine/WEEK1_CITIZEN_FAME_TRACKING.md`

---

**Ready to deploy? Just run the 3 commands above!**
