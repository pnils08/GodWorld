> **ARCHIVED** — Deployed. Moved 2026-02-16.

# Week 4: Storyline Resolution & Hook Lifecycle - Quick Deploy Guide

**Status:** Ready to deploy (FINAL WEEK 🎉)
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Monitors storyline health, auto-detects stale/fizzled storylines, manages hook lifecycle (age, expiration, priority decay), and generates resolution hooks.

**Impact:**
- 8 new columns added (Storyline_Tracker +4, Story_Hook_Deck +4)
- Stale storyline detection (>10 cycles no coverage)
- Fizzled storyline auto-resolution (>15 cycles)
- Hook age tracking and expiration
- Hook priority decay over time
- Wrap-up hook generation
- Zero breaking changes (backwards compatible)

**This completes the 4-week Story & Narrative Enhancement Plan!**

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addStorylineResolutionColumns.js --dry-run

# Apply migration
node scripts/addStorylineResolutionColumns.js
```

**Expected output:**
```
Storyline_Tracker: 4 columns added
Story_Hook_Deck: 4 columns added

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

### 3. Wire into Phase 06 (2 minutes)

**IMPORTANT:** Must manually add to `godWorldEngine2.js` Phase 06:

Open Apps Script editor, find Phase 06, add after arc lifecycle:

```javascript
// Phase 06: Analysis
if (typeof eventArcEngine_ === 'function') {
  eventArcEngine_(ctx);
}

// Week 2: Arc lifecycle automation
if (typeof advanceArcLifecycles_ === 'function') {
  advanceArcLifecycles_(ctx);
}

// Week 4: Storyline health monitoring
if (typeof monitorStorylineHealth_ === 'function') {
  monitorStorylineHealth_(ctx);
}

// Week 4: Hook lifecycle management
if (typeof manageHookLifecycle_ === 'function') {
  manageHookLifecycle_(ctx);
}
```

Save and deploy.

### 4. Test (1 minute)

Run this in Apps Script:

```javascript
function testStorylineHealth() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] }
  };

  var results1 = monitorStorylineHealth_(ctx);
  Logger.log('Storyline health - Processed: ' + results1.processed + ', Stale: ' + results1.stale);

  var results2 = manageHookLifecycle_(ctx);
  Logger.log('Hook lifecycle - Processed: ' + results2.processed + ', Expired: ' + results2.expired);
}
```

**Expected output:**
```
Storyline health - Processed: 10-20, Stale: 0-3
Hook lifecycle - Processed: 20-50, Expired: 0-5
```

Done! Next cycle will auto-detect stale storylines and manage hook lifecycle.

---

## Verify It's Working

After next cycle runs, check logs for:
```
monitorStorylineHealth_ v1.0: Complete.
Processed: 15, Stale: 2, Fizzled: 0, Ready to wrap: 1

manageHookLifecycle_ v1.0: Complete.
Processed: 45, Expired: 3, Priority decayed: 8
```

Then check Storyline_Tracker:
- CoverageGap incrementing each cycle
- IsStale = true for dormant storylines
- WrapUpGenerated = true when ready to wrap

Then check Story_Hook_Deck:
- HookAge incrementing each cycle
- IsExpired = true for old unused hooks
- Severity decreasing for aging hooks

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackStorylineResolutionColumns.js
```

Then remove from Apps Script:
1. Delete storylineHealthEngine.js
2. Delete hookLifecycleEngine.js
3. Remove both function calls from godWorldEngine2.js Phase 06
4. Re-deploy

---

## Files Added

1. `scripts/addStorylineResolutionColumns.js` - Migration
2. `phase06-analysis/storylineHealthEngine.js` - Storyline health engine
3. `phase06-analysis/hookLifecycleEngine.js` - Hook lifecycle engine
4. `scripts/rollbackStorylineResolutionColumns.js` - Rollback
5. `docs/engine/WEEK4_STORYLINE_RESOLUTION_LIFECYCLE.md` - Full docs

**Files Modified:**
1. `godWorldEngine2.js` Phase 06 (manual edit required)

---

## Stale Detection Thresholds

```
Normal storylines: 10 cycles without coverage → stale
High-priority storylines: 7 cycles without coverage → stale
Any storyline: 15 cycles without coverage → auto-resolve (fizzled)
```

**Coverage gap calculation:** CurrentCycle - LastCoverageCycle

---

## Hook Lifecycle Thresholds

```
Hook age: CurrentCycle - CreatedCycle
Expiration: 5 cycles unused (default)
Priority decay: 10% per cycle after age 2
Minimum priority: 1 (floor)
```

**Priority decay formula:** NewSeverity = max(1, CurrentSeverity - floor(HookAge × 0.1))

---

## Story Hooks Generated

### STORYLINE_WRAP (severity 5-6)
When storyline ready for natural conclusion:
- ResolutionCondition met OR
- 5+ mentions + 5-10 cycle gap

### STALE_STORYLINE (severity 3)
When storyline dormant >10 cycles (or >7 for high-priority):
- Suggests revival angle or closure

### STORYLINE_FIZZLED (severity 2)
When storyline auto-closed >15 cycles:
- Storyline status → "resolved"
- Marked as inactive/fizzled

---

## Storyline Resolution Conditions

**Examples of ResolutionCondition values:**
- "Initiative passes"
- "Citizen deceased"
- "10 cycles elapsed"
- "Manual review"
- (Leave empty for auto-detect based on mention count + gap)

**Future enhancement:** Automatic condition checking via Initiative_Tracker, Simulation_Ledger integration.

---

## Hook Pickup Tracking

**Integration point:** Edition processing should call:

```javascript
markHookPickedUp_(ss, hookId, currentCycle);
```

When hook is used in article generation. This:
- Sets PickupCycle = current cycle
- Marks PickedUp = "yes"
- Stops lifecycle processing for that hook

---

## Full Documentation

See: `docs/engine/WEEK4_STORYLINE_RESOLUTION_LIFECYCLE.md`

---

## 🎉 Story & Narrative Enhancement Plan — COMPLETE!

**Week 4 marks the completion of the 4-week plan:**

| Week | Feature | Columns | Status |
|------|---------|---------|--------|
| Week 1 | Citizen Fame & Media Exposure | 18 | ✅ Complete |
| Week 2 | Arc Lifecycle Automation | 8 | ✅ Complete |
| Week 3 | Multi-Citizen Storyline Weaving | 4 | ✅ Complete |
| Week 4 | Storyline Resolution & Hook Lifecycle | 8 | ✅ Complete |

**Grand Total:** 38 new columns, 6 new engines, 12 new hook types!

**What's Next:**
1. Deploy all 4 weeks to production
2. Run migration scripts locally
3. Push engines to Apps Script
4. Wire into processing phases
5. Test end-to-end narrative flow
6. Monitor storyline health and hook lifecycle over cycles

---

**Ready to deploy? Just run the 4 commands above!**

**Note:** Don't forget step 3 - manual edit to godWorldEngine2.js Phase 06
