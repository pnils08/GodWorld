# Civic Initiative Engine v1.5 Upgrade Plan

**Current Version:** v1.4
**Target Version:** v1.5
**Created:** 2026-02-02
**Status:** Planning

---

## Overview

This document tracks planned fixes and upgrades for `civicInitiativeEngine.js`. Add issues discovered during cycle runs to the "Issues Found in Testing" section at the bottom.

---

## Must-Fix Items (v1.5)

### 1. Delayed Status Gets Stuck Forever

**Problem:**
When `totalAvailable < votesNeeded`, the engine returns `status: 'delayed'`. But the main loop only processes initiatives where:
```javascript
voteCycle === cycle && (status === 'active' || status === 'pending-vote')
```
Once delayed, the initiative never re-enters processing. It becomes a permanent zombie.

**Fix Spec:**

Option A (Recommended): Keep status as `pending-vote`, track delay in Notes only
```javascript
// Instead of:
return { status: 'delayed', ... }

// Do:
return {
  status: 'pending-vote',  // Keep processable
  outcome: 'DELAYED',
  notes: 'Delayed: only ' + totalAvailable + ' votes available, ' + votesNeeded + ' needed. Will retry.',
  ...
}
```
Then in main loop, skip processing if `outcome === 'DELAYED'` and voteCycle has passed, but RE-ATTEMPT if council seats improve.

Option B: Add `delayed` to the processing condition
```javascript
// Change:
if (voteCycle === cycle && (status === 'active' || status === 'pending-vote'))

// To:
if ((voteCycle <= cycle) && (status === 'active' || status === 'pending-vote' || status === 'delayed'))
```
This re-attempts delayed initiatives every cycle until they can proceed.

**Recommended:** Option B is simpler. One line change.

**Files to Change:**
- `phase05-citizens/civicInitiativeEngine.js` (line ~153)

**Testing:**
- Create initiative with VoteCycle in the past
- Set 6 council seats to "vacant" so quorum fails
- Run cycle, verify status becomes 'delayed'
- Fill 2 seats, run next cycle
- Verify initiative re-attempts and resolves

---

### 2. Math.random() Breaks Determinism

**Problem:**
Vote resolution uses `Math.random()` directly (lines 665, 702, 733, 1052), violating the V3_ARCHITECTURE determinism contract. Political outcomes differ run-to-run even with same seed.

**Fix Spec:**

Pass `ctx.rng` to vote resolution functions and replace all `Math.random()` calls:

```javascript
// In resolveCouncilVote_:
// Change:
var primaryVotedYes = Math.random() < primaryProb;

// To:
var primaryVotedYes = ctx.rng() < primaryProb;
```

**Locations to fix:**
1. Line 665: `var primaryVotedYes = Math.random() < primaryProb;`
2. Line 702: `var secondaryVotedYes = Math.random() < secondaryProb;`
3. Line 733: `var unnamedVotedYes = Math.random() < unnamedProb;`
4. Line 1052: `var approved = Math.random() < baseProb;`

**Also fix in `manualRunVote()`:**
The manual vote function builds its own ctx without rng. Need to add:
```javascript
ctx.rng = seededRng_(cycleCount);  // Or use existing utility
```

**Files to Change:**
- `phase05-citizens/civicInitiativeEngine.js`

**Testing:**
- Run same cycle twice with same seed
- Verify vote outcomes are identical
- Test manual vote with same inputs, verify reproducible

---

### 3. Ripple Consumer Missing

**Problem:**
`applyNeighborhoodRipple_()` creates ripple records in `S.initiativeRipples` but nothing consumes them. The "physics step" that applies effects over time doesn't exist.

**Fix Spec:**

Create new function `applyActiveInitiativeRipples_(ctx)` to run in Phase 02 or Phase 06:

```javascript
/**
 * Apply ongoing initiative ripple effects to neighborhoods
 * Called each cycle to decay and apply active ripples
 */
function applyActiveInitiativeRipples_(ctx) {
  var S = ctx.summary;
  var cycle = S.cycleId || 0;
  var ripples = S.initiativeRipples || [];

  var activeRipples = [];

  for (var i = 0; i < ripples.length; i++) {
    var ripple = ripples[i];

    // Skip expired ripples
    if (cycle > ripple.endCycle) {
      ripple.status = 'expired';
      continue;
    }

    // Skip not-yet-started ripples (for lag support)
    if (cycle < ripple.startCycle) {
      activeRipples.push(ripple);
      continue;
    }

    // Calculate decay factor (linear decay over duration)
    var elapsed = cycle - ripple.startCycle;
    var remaining = ripple.endCycle - cycle;
    var decayFactor = remaining / ripple.duration;

    // Apply effects to affected neighborhoods
    applyRippleEffectsToNeighborhoods_(ctx, ripple, decayFactor);

    activeRipples.push(ripple);
  }

  S.initiativeRipples = activeRipples;
}

function applyRippleEffectsToNeighborhoods_(ctx, ripple, decayFactor) {
  var effects = ripple.effects || {};
  var neighborhoods = ripple.affectedNeighborhoods || [];

  // Get neighborhood data (from ctx.neighborhoods or sheet)
  for (var n = 0; n < neighborhoods.length; n++) {
    var hood = neighborhoods[n];
    var hoodData = ctx.neighborhoods ? ctx.neighborhoods[hood] : null;

    if (!hoodData) continue;

    // Apply each effect with decay
    if (effects.sentiment_modifier) {
      hoodData.sentiment = (hoodData.sentiment || 0) +
                           (effects.sentiment_modifier * decayFactor * 0.1);
    }
    if (effects.unemployment_modifier) {
      hoodData.unemployed = Math.max(0, (hoodData.unemployed || 0) +
                            (effects.unemployment_modifier * decayFactor));
    }
    if (effects.sick_modifier) {
      hoodData.sick = Math.max(0, (hoodData.sick || 0) +
                      (effects.sick_modifier * decayFactor));
    }
    // ... other effect types
  }
}
```

**Integration Point:**
Call from `godWorldEngine2.js` in Phase 02 (after city dynamics) or Phase 06 (during analysis):
```javascript
// In Phase 02 or 06:
if (typeof applyActiveInitiativeRipples_ === 'function') {
  applyActiveInitiativeRipples_(ctx);
}
```

**Files to Change:**
- `phase05-citizens/civicInitiativeEngine.js` (add functions)
- `phase01-config/godWorldEngine2.js` (add call in phase runner)

**Testing:**
- Pass an initiative with AffectedNeighborhoods set
- Run 3-4 cycles
- Verify neighborhood metrics change over time
- Verify effects decay and eventually expire

---

## High-Value Upgrades (Post v1.5)

### 4. Quorum vs Votes-Needed Separation

**Problem:**
Current logic delays votes if `totalAvailable < votesNeeded`. But quorum (minimum to conduct business) is different from votes to pass.

**Fix Spec:**
```javascript
var QUORUM = 5;  // Minimum to conduct business (9-seat council)

// Change delay logic:
if (totalAvailable < QUORUM) {
  return { status: 'delayed', ... };  // Can't conduct business
}
// Otherwise proceed - vote can pass or fail normally
```

**Benefit:** Allows 5-4 failures instead of delays. More realistic, more dramatic.

---

### 5. PolicyDomain Column

**Problem:**
`demoContext.initiativeType` is "vote"/"grant" not a policy domain. Demographics logic falls back to name keywording which is fragile.

**Fix Spec:**
- Add optional `PolicyDomain` column to Initiative_Tracker
- Values: Health, Housing, Transit, Safety, Economic, Education, Environment, Sports, General
- Use if present, fall back to name keywording if missing

**Schema Addition:**
```javascript
// In createInitiativeTrackerSheet_:
'PolicyDomain',        // R - Health/Housing/Transit/Safety/etc.
'AffectedNeighborhoods' // S - Comma-separated neighborhood list
```

---

### 6. AffectedNeighborhoods Column Helper

**Problem:**
`createInitiativeTrackerSheet_()` doesn't include `AffectedNeighborhoods` even though v1.3 supports it.

**Fix:** Add to schema and create `addAffectedNeighborhoodsColumn()` helper for existing sheets.

---

## Issues Found in Testing

*Add issues discovered during cycle runs here:*

| Cycle | Issue | Severity | Notes |
|-------|-------|----------|-------|
| 78 | `ss.getSheetByName is not a function` in Phase3-NeighborhoodDemo | HIGH | Function naming collision - see Bug #7 below |
| 78 | `ss.getSheetByName is not a function` in Phase5-EventArc | HIGH | Same root cause - see Bug #7 below |
| 78 | Demographics unavailable for vote | MEDIUM | Blocked by Bug #7 |
| 78 | AffectedNeighborhoods = 0 | LOW | Column was empty in Initiative_Tracker |

---

## Bug #7: Function Parameter Mismatch (ss vs ctx)

**Discovered:** Cycle 78
**Severity:** HIGH - Blocks demographics and arc engines

**Problem:**
Multiple utility functions expect `ss` (spreadsheet) as first parameter, but engine calls them with `ctx` (context object).

**Affected Functions:**

| Function | File | Line | Expects | Receives |
|----------|------|------|---------|----------|
| `updateNeighborhoodDemographics_` | utilities/ensureNeighborhoodDemographics.js | 172 | `ss` | `ctx` |
| `getCurrentCycle_` | phase10-persistence/cycleExportAutomation.js | 410 | `ss` | `ctx` |

**Root Cause:**
Naming collision between:
- `updateNeighborhoodDemographics_(ss, neighborhood, demographics, cycle)` in utilities
- `updateNeighborhoodDemographics_(ctx)` expected by engine

**Fix Options:**

**Option A: Rename utility function** (Recommended)
```javascript
// Rename to avoid collision:
function updateSingleNeighborhoodDemographics_(ss, neighborhood, demographics, cycle)
```

**Option B: Create wrapper in phase03**
```javascript
// phase03-population/updateNeighborhoodDemographics.js
function updateNeighborhoodDemographics_(ctx) {
  var ss = ctx.ss;
  // Call utility functions with ss
  ensureNeighborhoodDemographicsSchema_(ss);
  // ... rest of phase logic
}
```

**Option C: Fix getCurrentCycle_ to accept ctx**
```javascript
function getCurrentCycle_(ctxOrSs) {
  var ss = ctxOrSs.ss || ctxOrSs;  // Handle both
  // ...
}
```

**Recommended Fix Order:**
1. Check if phase03-population/updateNeighborhoodDemographics.js exists
2. If yes, it should call utility with `ctx.ss`
3. If no, create it as a wrapper
4. Fix `getCurrentCycle_` to handle both parameter types

**STATUS: FIXED**
- Renamed utility function from `updateNeighborhoodDemographics_` to `updateSingleNeighborhoodDemographics_`
- Phase03 function now correctly resolves (it expects ctx and extracts ss internally)
- File: utilities/ensureNeighborhoodDemographics.js line 174

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.4 | 2026-01 | Manual vote execution, demographic influence |
| v1.3 | 2026-01 | Neighborhood demographics integration |
| v1.2 | 2025-12 | 9-seat council model, header validation |
| v1.1 | 2025-12 | SwingVoter2 support |
| v1.0 | 2025-11 | Initial release |

---

*Run cycle 78, then update "Issues Found in Testing" section with any problems encountered.*
