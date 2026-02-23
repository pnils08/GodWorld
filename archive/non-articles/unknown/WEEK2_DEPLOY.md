> **ARCHIVED** — Deployed. Moved 2026-02-16.

# Week 2: Arc Lifecycle Automation - Quick Deploy Guide

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Automates story arc progression through lifecycle phases (seed → opening → building → climax → resolution). Arcs now advance automatically based on duration and tension, with configurable decay rates.

**Impact:**
- 8 new columns added across 2 sheets
- Automatic phase progression
- Tension decay over time
- Resolution triggers
- Phase transition story hooks
- Zero breaking changes (backwards compatible)

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addArcLifecycleColumns.js --dry-run

# Apply migration
node scripts/addArcLifecycleColumns.js
```

**Expected output:**
```
Arc_Ledger: 5 columns added
Event_Arc_Ledger: 3 columns added

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

### 3. Wire into Engine (2 minutes)

**IMPORTANT:** Must manually add to `godWorldEngine2.js` Phase 06:

Open Apps Script editor, find Phase 06, add after `eventArcEngine_()`:

```javascript
// Phase 06: Analysis
if (typeof eventArcEngine_ === 'function') {
  eventArcEngine_(ctx);
}

// Week 2: Arc lifecycle automation
if (typeof advanceArcLifecycles_ === 'function') {
  advanceArcLifecycles_(ctx);
}
```

Save and deploy.

### 4. Test (1 minute)

Run this in Apps Script:

```javascript
function testArcLifecycle() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, eventArcs: [] }
  };

  // Load first 5 arcs
  var arcSheet = ss.getSheetByName('Arc_Ledger');
  var arcData = arcSheet.getDataRange().getValues();
  for (var i = 1; i < 6; i++) {
    ctx.summary.eventArcs.push({
      arcId: arcData[i][0],
      phase: arcData[i][5],
      tension: arcData[i][7]
    });
  }

  var results = advanceArcLifecycles_(ctx);
  Logger.log('Processed: ' + results.processed);
  Logger.log('Advanced: ' + results.advanced);
  Logger.log('Tension decayed: ' + results.tensionDecayed);
}
```

**Expected output:**
```
Processed: 5
Advanced: 0-2 (depending on arc states)
Tension decayed: 3-5
```

Done! Next cycle will auto-progress arcs.

---

## Verify It's Working

After next cycle runs, check logs for:

```
advanceArcLifecycles_ v1.0: Complete.
Processed: 15, Advanced: 2, Resolved: 1, Tension decayed: 12
```

Then check Arc_Ledger:
- PhaseDuration incrementing each cycle
- Tension slowly decreasing
- Some arcs advancing through phases
- NextPhaseTransition predicting future transitions

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackArcLifecycleColumns.js
```

Then remove from Apps Script:
1. Delete arcLifecycleEngine.js
2. Remove advanceArcLifecycles_() call from godWorldEngine2.js
3. Re-deploy

---

## Files Added

1. `scripts/addArcLifecycleColumns.js` - Migration
2. `phase06-analysis/arcLifecycleEngine.js` - Arc automation engine
3. `scripts/rollbackArcLifecycleColumns.js` - Rollback
4. `docs/engine/WEEK2_ARC_LIFECYCLE_AUTOMATION.md` - Full docs

**Files Modified:**
1. `godWorldEngine2.js` Phase 06 (manual edit required)

---

## Arc Lifecycle Phases

```
seed (2-3 cycles)
  ↓
opening (3-5 cycles)
  ↓
building (4-8 cycles)
  ↓
climax (2-4 cycles)
  ↓
resolution (1-2 cycles)
  ↓
resolved
```

**Tension decay rates:**
- seed: 5%/cycle
- opening: 8%/cycle
- building: 3%/cycle (tension building)
- climax: 2%/cycle (peak tension)
- resolution: 15%/cycle (fast resolution)

---

## Full Documentation

See: `docs/engine/WEEK2_ARC_LIFECYCLE_AUTOMATION.md`

---

**Ready to deploy? Just run the 4 commands above!**

**Note:** Don't forget step 3 - manual edit to godWorldEngine2.js Phase 06
