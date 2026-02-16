# Week 2: Arc Lifecycle Automation Implementation

**Status:** Ready for deployment
**Version:** v1.0
**Date:** 2026-02-11
**Part of:** Story & Narrative Enhancement Plan

---

## Overview

Week 2 adds automatic phase progression for story arcs. Arcs now flow through lifecycle phases (seed → opening → building → climax → resolution) with automatic advancement, tension decay, and resolution triggers.

**Key Features:**
- Automatic phase progression based on duration and tension
- Tension decay over time (phase-specific rates)
- Resolution triggers (tension resolved, time expired, etc.)
- Phase transition story hooks
- Next transition cycle prediction

---

## Files Created/Modified

### New Files

1. **`scripts/addArcLifecycleColumns.js`** - Migration script
   - Adds 8 new columns across 2 sheets
   - Safe to re-run (skips existing columns)
   - Dry-run mode available

2. **`phase06-analysis/arcLifecycleEngine.js`** - Arc lifecycle engine
   - Processes active arcs each cycle
   - Advances phases automatically
   - Applies tension decay
   - Checks resolution triggers
   - Generates phase transition story hooks

3. **`scripts/rollbackArcLifecycleColumns.js`** - Rollback script
   - Removes all 8 columns if needed
   - 5-second warning before deletion
   - Dry-run mode available

4. **`docs/engine/WEEK2_ARC_LIFECYCLE_AUTOMATION.md`** - This file

### Modified Files

None yet - requires integration into godWorldEngine2.js Phase 06

---

## Schema Changes

### Arc_Ledger (+5 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| AutoAdvance | String | "yes" | yes/no - enable automatic phase progression |
| PhaseStartCycle | Number | "" | Cycle when current phase started |
| PhaseDuration | Number | 0 | Cycles in current phase so far |
| NextPhaseTransition | Number | "" | Predicted cycle for next phase transition |
| TensionDecay | Number | 0.1 | Tension decay rate per cycle (0.0-1.0) |

### Event_Arc_Ledger (+3 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| ResolutionTrigger | String | "" | What triggered resolution |
| ResolutionCycle | Number | "" | Cycle when arc was resolved |
| ResolutionNotes | String | "" | How the arc was resolved |

**Total: 8 new columns**

---

## Arc Lifecycle Phases

### Phase Order

```
seed → opening → building → climax → resolution → resolved
```

### Phase Durations

| Phase | Min Cycles | Max Cycles | Purpose |
|-------|-----------|------------|---------|
| **seed** | 2 | 3 | Setup, introduce elements |
| **opening** | 3 | 5 | Story unfolds, characters introduced |
| **building** | 4 | 8 | Tension builds, conflict develops |
| **climax** | 2 | 4 | Peak tension, critical moment |
| **resolution** | 1 | 2 | Wrap up, resolve tension |

### Advancement Triggers

| Transition | Trigger Condition |
|-----------|-------------------|
| seed → opening | Max duration reached (3 cycles) |
| opening → building | Tension ≥3.0 **OR** max duration (5 cycles) |
| building → climax | Tension ≥7.0 **OR** max duration (8 cycles) |
| climax → resolution | Tension <6.0 **OR** max duration (4 cycles) |
| resolution → resolved | Tension <2.0 **OR** max duration (2 cycles) |

---

## Tension Mechanics

### Tension Decay Rates

| Phase | Decay Rate | Effect |
|-------|-----------|--------|
| **seed** | 5% per cycle | Slow decay during setup |
| **opening** | 8% per cycle | Moderate decay as story unfolds |
| **building** | 3% per cycle | Minimal decay - tension building |
| **climax** | 2% per cycle | Very minimal - peak tension |
| **resolution** | 15% per cycle | Fast decay as story resolves |

**Example:** Arc in climax phase with tension=8.0
- Cycle 1: 8.0 - (8.0 × 0.02) = 7.84
- Cycle 2: 7.84 - (7.84 × 0.02) = 7.68
- Cycle 3: 7.68 - (7.68 × 0.02) = 7.53

### Tension Can Increase

While tension decays naturally, events can spike it:
- Crisis events: +2.0 to +5.0
- Initiative votes: +1.0 to +3.0
- Media amplification: +0.5 to +2.0
- Citizen events: +0.5 to +1.5

---

## Resolution Triggers

| Trigger | Condition | When Used |
|---------|-----------|-----------|
| **tension_resolved** | Tension <1.0 | Arc naturally winds down |
| **time_expired** | Max duration exceeded | Arc runs its course |
| **manual** | Manually set to resolved | Editor intervention |
| **crisis_ended** | Related crisis resolved | (Future enhancement) |
| **initiative_passed** | Related initiative passed/failed | (Future enhancement) |
| **storyline_closed** | Related storyline closed | (Future enhancement) |

---

## Deployment Instructions

### Step 1: Run Migration (Local)

```bash
cd ~/GodWorld

# Dry run first
node scripts/addArcLifecycleColumns.js --dry-run

# Apply migration
node scripts/addArcLifecycleColumns.js
```

**Expected output:**
```
✅ Connected: GodWorld Simulation
...
Arc_Ledger: 5 columns added
Event_Arc_Ledger: 3 columns added

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
- `phase06-analysis/arcLifecycleEngine.js` (new)

### Step 3: Wire into Engine

Add to `godWorldEngine2.js` in Phase 06 (after eventArcEngine_):

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

### Step 4: Verify Deployment

1. Open Apps Script editor
2. Verify `arcLifecycleEngine.js` is present
3. Check `godWorldEngine2.js` has advanceArcLifecycles_() call in Phase 06
4. Look for `advanceArcLifecycles_` function

---

## Testing

### Test 1: Manual Arc Progression

Run this manually in Apps Script:

```javascript
function testArcLifecycle() {
  var ss = openSimSpreadsheet_();

  // Build minimal context
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: {
      cycleId: 100,
      eventArcs: []
    }
  };

  // Load arcs from Arc_Ledger
  var arcSheet = ss.getSheetByName('Arc_Ledger');
  var arcData = arcSheet.getDataRange().getValues();
  var headers = arcData[0];

  // Convert to arc objects
  for (var i = 1; i < Math.min(arcData.length, 6); i++) {
    var row = arcData[i];
    var arc = {
      arcId: row[headers.indexOf('ArcId')],
      phase: row[headers.indexOf('Phase')],
      tension: Number(row[headers.indexOf('Tension')]) || 5.0,
      type: row[headers.indexOf('Type')]
    };
    ctx.summary.eventArcs.push(arc);
  }

  Logger.log('Testing arc lifecycle with ' + ctx.summary.eventArcs.length + ' arcs');

  var results = advanceArcLifecycles_(ctx);

  Logger.log('Arc Lifecycle Test Results:');
  Logger.log('- Processed: ' + results.processed);
  Logger.log('- Advanced: ' + results.advanced);
  Logger.log('- Resolved: ' + results.resolved);
  Logger.log('- Tension decayed: ' + results.tensionDecayed);
  Logger.log('- Errors: ' + results.errors.length);
}
```

### Test 2: Full Cycle Integration

1. Run a full cycle: `runSingleCycleV2()`
2. Check Phase 06 logs for:
   ```
   advanceArcLifecycles_ v1.0: Complete.
   Processed: 15, Advanced: 2, Resolved: 1, Tension decayed: 12
   ```
3. Verify Arc_Ledger updates:
   - PhaseDuration incrementing
   - Tension decreasing
   - Phase transitions occurring
4. Check for ARC_PHASE_TRANSITION story hooks in ctx.summary.storyHooks

### Test 3: Monitor Arc Progression

Create a monitoring function:

```javascript
function monitorArcProgress() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Arc_Ledger');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var arcIdCol = headers.indexOf('ArcId');
  var phaseCol = headers.indexOf('Phase');
  var tensionCol = headers.indexOf('Tension');
  var durationCol = headers.indexOf('PhaseDuration');
  var nextTransCol = headers.indexOf('NextPhaseTransition');

  Logger.log('=== ARC PROGRESS REPORT ===\n');

  for (var i = 1; i < Math.min(data.length, 11); i++) {
    var row = data[i];
    Logger.log('Arc: ' + row[arcIdCol]);
    Logger.log('  Phase: ' + row[phaseCol] + ' (duration: ' + row[durationCol] + ' cycles)');
    Logger.log('  Tension: ' + row[tensionCol]);
    Logger.log('  Next transition: cycle ' + row[nextTransCol]);
    Logger.log('');
  }
}
```

---

## Integration Flow

```
Cycle starts
  ↓
Phase 01-05: Standard processing
  ↓
Phase 06: Analysis
  ↓
  ├─ eventArcEngine_() - Generate/update arcs
  └─ [NEW] advanceArcLifecycles_() - Auto-progress arcs
      ├─ Calculate phase duration
      ├─ Apply tension decay
      ├─ Check advancement triggers
      ├─ Advance phase if ready
      ├─ Check resolution triggers
      └─ Generate story hooks
  ↓
Phase 07-11: Continue processing
```

---

## Story Hooks Generated

### ARC_PHASE_TRANSITION

Generated when arc advances to new phase.

```javascript
{
  hookType: 'ARC_PHASE_TRANSITION',
  arcId: 'ARC-CRISIS-123',
  arcType: 'crisis',
  oldPhase: 'building',
  newPhase: 'climax',
  tension: 7.5,
  severity: 7,
  description: 'Arc "Oakland Housing Crisis" advanced from building to climax'
}
```

**Severity:**
- climax transition: 7 (major story moment)
- resolution transition: 6 (wrapping up)
- other transitions: 5 (standard progression)

### ARC_RESOLVED

Generated when arc completes.

```javascript
{
  hookType: 'ARC_RESOLVED',
  arcId: 'ARC-CRISIS-123',
  arcType: 'crisis',
  resolutionTrigger: 'tension_resolved',
  severity: 7,
  description: 'Arc "Oakland Housing Crisis" resolved via tension_resolved'
}
```

---

## Troubleshooting

### Problem: Arcs not advancing

**Check:**
1. AutoAdvance column = "yes"?
2. Current phase in PHASE_ORDER?
3. Minimum duration met?
4. Advancement conditions met?

**Debug:**
```javascript
// Check arc state
var ss = openSimSpreadsheet_();
var sheet = ss.getSheetByName('Arc_Ledger');
var data = sheet.getDataRange().getValues();
// Find your arc and check columns
```

### Problem: Tension not decaying

**Check:**
1. TensionDecay column populated?
2. Current tension >0?
3. Arc not in resolved phase?

**Fix:**
Set default TensionDecay values:
```javascript
// In Arc_Ledger, set TensionDecay = 0.1 for all active arcs
```

### Problem: Arcs advancing too fast/slow

**Adjust durations:**
Edit DEFAULT_PHASE_DURATIONS in arcLifecycleEngine.js:

```javascript
var DEFAULT_PHASE_DURATIONS = {
  'building': { min: 6, max: 12 }  // Slower building phase
};
```

Then redeploy: `npx clasp push`

### Problem: Columns not found error

**Error:** `Lifecycle columns not found. Run migration first.`

**Fix:**
```bash
node scripts/addArcLifecycleColumns.js
```

---

## Manual Override

To manually control an arc (disable auto-progression):

1. Set AutoAdvance = "no" in Arc_Ledger
2. Arc will still have tension decay
3. Phase will not auto-advance
4. Manually update Phase column when ready

To manually resolve an arc:

1. Set Phase = "resolved" in Arc_Ledger
2. Set ResolutionTrigger = "manual" in Event_Arc_Ledger
3. Set ResolutionCycle = current cycle
4. Add ResolutionNotes describing resolution

---

## Rollback Procedure

If you need to undo Week 2 changes:

```bash
cd ~/GodWorld

# Dry run first
node scripts/rollbackArcLifecycleColumns.js --dry-run

# Apply rollback (5-second warning)
node scripts/rollbackArcLifecycleColumns.js
```

**Then remove from Apps Script:**
1. Delete `arcLifecycleEngine.js`
2. Remove `advanceArcLifecycles_()` call from godWorldEngine2.js Phase 06
3. `npx clasp push`

---

## Next Steps: Week 3

**Week 3: Multi-Citizen Storyline Weaving**
- CitizenRoles JSON (primary/supporting/background)
- ConflictType tracking
- RelationshipImpact scoring
- CrossStorylineLinks
- Adds 4 new columns to Storyline_Tracker

---

## Reference Documents

- [Story & Narrative Enhancement Plan](STORY_NARRATIVE_ENHANCEMENT_PLAN.md) - Full 4-week plan
- [Arc Lifecycle Engine v1.0](../../phase06-analysis/arcLifecycleEngine.js) - Engine implementation
- [Week 1: Citizen Fame Tracking](WEEK1_CITIZEN_FAME_TRACKING.md) - Previous week

---

**Deployment Checklist:**

- [ ] Migration run locally (columns added)
- [ ] arcLifecycleEngine.js deployed to Apps Script
- [ ] advanceArcLifecycles_() wired into godWorldEngine2.js Phase 06
- [ ] Test 1: Manual arc progression (testArcLifecycle)
- [ ] Test 2: Full cycle integration test
- [ ] Test 3: Monitor arc progress over 3-5 cycles
- [ ] Verify Arc_Ledger phase transitions occurring
- [ ] Verify tension decay working
- [ ] Verify story hooks generated (ARC_PHASE_TRANSITION, ARC_RESOLVED)

---

**Last Updated:** 2026-02-11
**Author:** GodWorld Project Team
**Status:** ✅ Ready for deployment
