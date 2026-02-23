# Week 4: Storyline Resolution & Hook Lifecycle Implementation

**Status:** Ready for deployment
**Version:** v1.0
**Date:** 2026-02-11
**Part of:** Story & Narrative Enhancement Plan (FINAL WEEK)

---

## Overview

Week 4 completes the Story & Narrative Enhancement Plan by adding storyline health monitoring, automatic resolution triggers, and hook lifecycle management. Storylines now auto-detect staleness, generate wrap-up hooks, and hooks expire after prolonged disuse.

**Key Features:**
- Stale storyline detection (>10 cycles without coverage)
- Fizzled storyline auto-resolution (>15 cycles dormant)
- Resolution condition tracking
- Hook age calculation
- Hook expiration and archival
- Priority decay for aging hooks
- Wrap-up hook generation

---

## Files Created/Modified

### New Files

1. **`scripts/addStorylineResolutionColumns.js`** - Migration script
   - Adds 8 new columns across 2 sheets
   - Safe to re-run (skips existing columns)
   - Dry-run mode available

2. **`phase06-analysis/storylineHealthEngine.js`** - Storyline health engine
   - Detects stale storylines (>N cycles no coverage)
   - Auto-resolves fizzled storylines (>15 cycles)
   - Checks resolution conditions
   - Generates wrap-up hooks

3. **`phase06-analysis/hookLifecycleEngine.js`** - Hook lifecycle engine
   - Calculates hook age
   - Expires stale hooks (>5 cycles unused)
   - Decays priority over time
   - Tracks hook pickup
   - Archives expired hooks

4. **`scripts/rollbackStorylineResolutionColumns.js`** - Rollback script
   - Removes all 8 columns if needed
   - 5-second warning before deletion
   - Dry-run mode available

5. **`docs/engine/WEEK4_STORYLINE_RESOLUTION_LIFECYCLE.md`** - This file

### Modified Files

None yet - requires integration into Phase 06 processing

---

## Schema Changes

### Storyline_Tracker (+4 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| ResolutionCondition | String | "" | What makes this story "done"? (e.g., "Initiative passes") |
| StaleAfterCycles | Number | 10 | Mark stale if no coverage for N cycles |
| IsStale | Boolean | false | Flag for dormant storylines |
| WrapUpGenerated | Boolean | false | Has wrap-up hook been created? |

### Story_Hook_Deck (+4 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| HookAge | Number | 0 | Cycles since generation |
| ExpiresAfter | Number | 5 | Remove if unused for N cycles |
| IsExpired | Boolean | false | Should be archived |
| PickupCycle | Number | "" | When hook was used in edition |

**Total: 8 new columns**

---

## Storyline Health Monitoring

### Stale Detection

**Threshold:** 10 cycles without coverage (default)

**High-priority storylines:** 7 cycles (shorter threshold)

**Process:**
1. Calculate CoverageGap (current cycle - LastCoverageCycle)
2. If CoverageGap >= StaleAfterCycles → mark IsStale = true
3. Generate STALE_STORYLINE hook (severity 3)

**Example:**
```
Storyline: "Laurel District gentrification"
LastCoverageCycle: 90
Current Cycle: 102
CoverageGap: 12
StaleAfterCycles: 10
→ IsStale = true
→ STALE_STORYLINE hook generated
```

### Fizzled Auto-Resolution

**Threshold:** 15 cycles without coverage

**Process:**
1. If CoverageGap >= 15 cycles → auto-resolve
2. Set Status = "resolved"
3. Generate STORYLINE_FIZZLED hook (severity 2)

**Example:**
```
Storyline: "Oakland Park renovation"
CoverageGap: 16
→ Status = "resolved"
→ STORYLINE_FIZZLED hook generated
→ ResolutionNotes: "Auto-closed: inactive for 16 cycles"
```

### Resolution Conditions

**Manual conditions** (examples):
- "Initiative passes" → check Initiative_Tracker
- "Citizen deceased" → check Simulation_Ledger
- "10 cycles elapsed" → check cycle count

**Auto-wrap conditions:**
- MentionCount >= 5 AND CoverageGap between 5-10 cycles
- Natural conclusion detected

**Process:**
1. Check ResolutionCondition (keyword matching)
2. If condition met → generate STORYLINE_WRAP hook
3. Mark WrapUpGenerated = true
4. Media Room can write conclusion piece

**Example:**
```
Storyline: "Housing Initiative Battle"
ResolutionCondition: "Initiative passes"
Initiative passes in cycle 105
→ STORYLINE_WRAP hook generated (severity 6)
→ WrapUpGenerated = true
```

---

## Hook Lifecycle Management

### Hook Age Calculation

**Formula:** HookAge = CurrentCycle - CreatedCycle

**Updated:** Every cycle

**Example:**
```
Hook: TRENDING_CITIZEN (Emma Chen)
CreatedCycle: 98
Current Cycle: 103
HookAge: 5 cycles
```

### Hook Expiration

**Default threshold:** 5 cycles unused

**Process:**
1. If HookAge >= ExpiresAfter → mark IsExpired = true
2. Archive to Story_Hook_Archive (if exists)
3. OR leave in deck marked expired

**Example:**
```
Hook: FRESH_FACE (John Doe)
CreatedCycle: 95
Current Cycle: 101
HookAge: 6
ExpiresAfter: 5
→ IsExpired = true
→ Archived or marked stale
```

### Priority Decay

**Decay rate:** 10% per cycle after age 2

**Formula:** NewSeverity = max(1, CurrentSeverity - floor(HookAge × 0.1))

**Example:**
```
Hook: ARC_CLIMAX
Initial Severity: 8
HookAge: 3
Decay: floor(3 × 0.1) = 0
NewSeverity: 8 (no decay yet)

HookAge: 10
Decay: floor(10 × 0.1) = 1
NewSeverity: max(1, 8 - 1) = 7

HookAge: 20
Decay: floor(20 × 0.1) = 2
NewSeverity: max(1, 8 - 2) = 6
```

### Pickup Tracking

When hook is used in edition:
1. Set PickupCycle = current cycle
2. Mark PickedUp = "yes"
3. Hook no longer processed by lifecycle engine

**Integration point:** Edition processing calls `markHookPickedUp_(ss, hookId, cycle)`

---

## Story Hooks Generated

### STORYLINE_WRAP

Generated when storyline ready for natural conclusion.

```javascript
{
  hookType: 'STORYLINE_WRAP',
  storylineId: 'SL-123',
  title: 'Housing Initiative Battle',
  mentionCount: 8,
  severity: 6,  // 5 for normal, 6 for high-priority
  description: 'Storyline "Housing Initiative Battle" ready for wrap-up conclusion'
}
```

### STALE_STORYLINE

Generated when storyline dormant >10 cycles.

```javascript
{
  hookType: 'STALE_STORYLINE',
  storylineId: 'SL-456',
  title: 'Laurel gentrification concerns',
  coverageGap: 12,
  severity: 3,
  description: 'Storyline "Laurel gentrification concerns" dormant for 12 cycles'
}
```

**Action:** Revival angle OR mark resolved

### STORYLINE_FIZZLED

Generated when storyline auto-closed >15 cycles.

```javascript
{
  hookType: 'STORYLINE_FIZZLED',
  storylineId: 'SL-789',
  title: 'Oakland Park renovation',
  coverageGap: 16,
  severity: 2,
  description: 'Storyline "Oakland Park renovation" auto-closed after 16 cycles inactive'
}
```

---

## Deployment Instructions

### Step 1: Run Migration (Local)

```bash
cd ~/GodWorld

# Dry run first
node scripts/addStorylineResolutionColumns.js --dry-run

# Apply migration
node scripts/addStorylineResolutionColumns.js
```

**Expected output:**
```
✅ Connected: GodWorld Simulation
...
Storyline_Tracker: 4 columns added
Story_Hook_Deck: 4 columns added

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
- `phase06-analysis/storylineHealthEngine.js` (new)
- `phase06-analysis/hookLifecycleEngine.js` (new)

### Step 3: Wire into Phase 06

Add to `godWorldEngine2.js` Phase 06 (after arc lifecycle):

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

### Step 4: Verify Deployment

1. Open Apps Script editor
2. Verify `storylineHealthEngine.js` and `hookLifecycleEngine.js` present
3. Check `godWorldEngine2.js` has both function calls in Phase 06
4. Look for `monitorStorylineHealth_` and `manageHookLifecycle_` functions

---

## Testing

### Test 1: Storyline Health Monitoring

Run this manually in Apps Script:

```javascript
function testStorylineHealth() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] }
  };

  Logger.log('Testing storyline health monitoring...');

  var results = monitorStorylineHealth_(ctx);

  Logger.log('Storyline Health Test Results:');
  Logger.log('- Processed: ' + results.processed);
  Logger.log('- Stale: ' + results.stale);
  Logger.log('- Fizzled: ' + results.fizzled);
  Logger.log('- Ready to wrap: ' + results.wrapped);
  Logger.log('- Errors: ' + results.errors.length);

  // Check story hooks
  Logger.log('\nStory Hooks Generated:');
  for (var i = 0; i < ctx.summary.storyHooks.length; i++) {
    var hook = ctx.summary.storyHooks[i];
    Logger.log('- ' + hook.hookType + ' (severity ' + hook.severity + '): ' + hook.description);
  }
}
```

### Test 2: Hook Lifecycle Management

```javascript
function testHookLifecycle() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100 }
  };

  Logger.log('Testing hook lifecycle management...');

  var results = manageHookLifecycle_(ctx);

  Logger.log('Hook Lifecycle Test Results:');
  Logger.log('- Processed: ' + results.processed);
  Logger.log('- Expired: ' + results.expired);
  Logger.log('- Priority decayed: ' + results.decayed);
  Logger.log('- Errors: ' + results.errors.length);
}
```

### Test 3: Verify Coverage Gaps

```javascript
function checkCoverageGaps() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Storyline_Tracker');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var gapCol = headers.indexOf('CoverageGap');
  var isStaleCol = headers.indexOf('IsStale');

  Logger.log('=== COVERAGE GAPS ===\n');

  for (var i = 1; i < Math.min(data.length, 11); i++) {
    var row = data[i];
    var title = row[headers.indexOf('Title')];
    var gap = row[gapCol];
    var isStale = row[isStaleCol];

    if (gap > 0) {
      Logger.log('Storyline: ' + title);
      Logger.log('  Coverage gap: ' + gap + ' cycles');
      Logger.log('  Stale: ' + isStale);
      Logger.log('');
    }
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
  ├─ advanceArcLifecycles_() - Week 2 arc automation
  ├─ [NEW] monitorStorylineHealth_() - Week 4 stale detection
  │   ├─ Update coverage gaps
  │   ├─ Detect stale storylines
  │   ├─ Detect fizzled storylines
  │   ├─ Check resolution conditions
  │   └─ Generate STORYLINE_WRAP, STALE_STORYLINE, STORYLINE_FIZZLED hooks
  └─ [NEW] manageHookLifecycle_() - Week 4 hook lifecycle
      ├─ Calculate hook age
      ├─ Detect expired hooks
      ├─ Decay hook priority
      └─ Archive expired hooks
  ↓
Phase 07-11: Continue processing
```

---

## Use Cases

### Use Case 1: Stale Storyline Revival

**Scenario:** "Laurel gentrification" storyline dormant for 11 cycles.

**Week 4 Processing:**
1. CoverageGap = 11 (> threshold 10)
2. Set IsStale = true
3. Generate STALE_STORYLINE hook (severity 3)

**Media Room Action:**
- **Option A:** Revival angle (new development, follow-up)
- **Option B:** Mark resolved (concerns remain dormant)

### Use Case 2: Auto-Wrap Resolution

**Scenario:** "Housing Initiative" covered 8 times, gap now 6 cycles, initiative passed.

**Week 4 Processing:**
1. ResolutionCondition = "Initiative passes"
2. Check initiative status → PASSED
3. Generate STORYLINE_WRAP hook (severity 6)
4. WrapUpGenerated = true

**Media Room Action:**
- Write conclusion piece
- Mark storyline resolved
- Note resolution trigger

### Use Case 3: Hook Expiration

**Scenario:** FRESH_FACE hook for "John Doe" created 6 cycles ago, never used.

**Week 4 Processing:**
1. HookAge = 6 (> threshold 5)
2. Set IsExpired = true
3. Archive to Story_Hook_Archive

**Result:** Hook deck stays fresh, unused hooks removed

### Use Case 4: Priority Decay

**Scenario:** ARC_CLIMAX hook severity 8, created 10 cycles ago.

**Week 4 Processing:**
1. HookAge = 10
2. Decay = floor(10 × 0.1) = 1
3. NewSeverity = max(1, 8 - 1) = 7

**Result:** Aging hooks naturally deprioritized

---

## Troubleshooting

### Problem: Coverage gaps not updating

**Check:**
1. LastCoverageCycle column populated? (Week 1 column)
2. CoverageGap column exists? (Week 1 column)
3. monitorStorylineHealth_() called each cycle?

**Debug:**
```javascript
// Check storyline data
var ss = openSimSpreadsheet_();
var sheet = ss.getSheetByName('Storyline_Tracker');
var data = sheet.getDataRange().getValues();
// Inspect LastCoverageCycle and CoverageGap columns
```

### Problem: Hooks not expiring

**Check:**
1. HookAge column exists?
2. ExpiresAfter populated? (default 5)
3. manageHookLifecycle_() called each cycle?

**Fix:**
Set default ExpiresAfter values:
```javascript
// In Story_Hook_Deck, set ExpiresAfter = 5 for all hooks
```

### Problem: Storylines auto-resolving too quickly

**Adjust fizzle threshold:**
Edit FIZZLE_THRESHOLD in storylineHealthEngine.js:

```javascript
var FIZZLE_THRESHOLD = 20;  // Increase from 15 to 20 cycles
```

Then redeploy: `npx clasp push`

### Problem: Columns not found error

**Error:** `ResolutionCondition column not found. Run migration first.`

**Fix:**
```bash
node scripts/addStorylineResolutionColumns.js
```

---

## Manual Override

### Manually Set Resolution Condition

Edit Storyline_Tracker → ResolutionCondition:
- "Initiative passes"
- "Citizen deceased"
- "10 cycles elapsed"
- "Manual review"

### Manually Set Stale Threshold

Edit Storyline_Tracker → StaleAfterCycles:
- High-priority: 7 cycles
- Normal: 10 cycles
- Long-term: 15 cycles

### Manually Mark Wrap-Up Generated

Set WrapUpGenerated = true to prevent duplicate wrap hooks.

### Manually Expire Hook

Set IsExpired = true OR PickupCycle = current cycle.

---

## Rollback Procedure

If you need to undo Week 4 changes:

```bash
cd ~/GodWorld

# Dry run first
node scripts/rollbackStorylineResolutionColumns.js --dry-run

# Apply rollback (5-second warning)
node scripts/rollbackStorylineResolutionColumns.js
```

**Then remove from Apps Script:**
1. Delete `storylineHealthEngine.js`
2. Delete `hookLifecycleEngine.js`
3. Remove both function calls from godWorldEngine2.js Phase 06
4. `npx clasp push`

---

## Story & Narrative Enhancement Plan — COMPLETE! 🎉

**Week 4 marks the completion of the 4-week Story & Narrative Enhancement Plan.**

**Total Enhancements:**
- **Week 1:** Citizen Fame & Media Exposure (18 columns)
- **Week 2:** Arc Lifecycle Automation (8 columns)
- **Week 3:** Multi-Citizen Storyline Weaving (4 columns)
- **Week 4:** Storyline Resolution & Hook Lifecycle (8 columns)

**Grand Total:** 38 new columns, 6 new engine files, 12 new story hook types

---

## Reference Documents

- [Story & Narrative Enhancement Plan](STORY_NARRATIVE_ENHANCEMENT_PLAN.md) - Full 4-week plan
- [Week 1: Citizen Fame Tracking](WEEK1_CITIZEN_FAME_TRACKING.md)
- [Week 2: Arc Lifecycle Automation](WEEK2_ARC_LIFECYCLE_AUTOMATION.md)
- [Week 3: Multi-Citizen Storyline Weaving](WEEK3_MULTI_CITIZEN_STORYLINE_WEAVING.md)

---

**Deployment Checklist:**

- [ ] Migration run locally (8 columns added: Storyline_Tracker +4, Story_Hook_Deck +4)
- [ ] storylineHealthEngine.js deployed to Apps Script
- [ ] hookLifecycleEngine.js deployed to Apps Script
- [ ] Both functions wired into godWorldEngine2.js Phase 06
- [ ] Test 1: Storyline health monitoring (testStorylineHealth)
- [ ] Test 2: Hook lifecycle management (testHookLifecycle)
- [ ] Test 3: Verify coverage gaps updating
- [ ] Verify stale detection working (IsStale flag)
- [ ] Verify hook age calculation
- [ ] Verify story hooks generated (STORYLINE_WRAP, STALE_STORYLINE, STORYLINE_FIZZLED)

---

**Last Updated:** 2026-02-11
**Author:** GodWorld Project Team
**Status:** ✅ Ready for deployment (FINAL WEEK)
