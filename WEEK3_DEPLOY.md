# Week 3: Multi-Citizen Storyline Weaving - Quick Deploy Guide

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy

---

## What This Does

Detects citizens appearing in multiple storylines, assigns roles (protagonist/antagonist/witness), and generates weaving hooks for complex multi-citizen narratives.

**Impact:**
- 4 new columns added to Storyline_Tracker
- Automatic citizen role assignment
- Cross-storyline conflict detection
- Relationship clash detection
- Alliance opportunity detection
- Zero breaking changes (backwards compatible)

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addStorylineWeavingColumns.js --dry-run

# Apply migration
node scripts/addStorylineWeavingColumns.js
```

**Expected output:**
```
Storyline_Tracker: 4 columns added

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
cd ~/GodWorld
git pull
npm install
npx clasp push
```

### 3. Wire into Phase 07 (2 minutes)

**Option A: Add to mediaRoomIntake.js (recommended)**

Open Apps Script editor, find `processAllIntakeSheets_()`, add after fame tracking:

```javascript
function processAllIntakeSheets_(ss, cycle, cal) {
  results.articles = processArticleIntake_(ss, cycle, cal);
  results.storylines = processStorylineIntake_(ss, cycle, cal);
  results.citizenUsage = processCitizenUsageIntake_(ss, cycle, cal);
  results.citizenRouting = routeCitizenUsageToIntake_(ss, cycle, cal);
  results.fameTracking = updateCitizenFameFromMedia_(ss, cycle, cal);

  // Week 3: Storyline weaving
  if (typeof weaveStorylines_ === 'function') {
    var ctx = {
      ss: ss,
      config: { cycleCount: cycle },
      summary: { storyHooks: [] }
    };
    results.storylineWeaving = weaveStorylines_(ctx);
  }

  return results;
}
```

**Option B: Add to Phase 07 processing directly**

Find Phase 07 processing, add after storyline intake:

```javascript
// Phase 07: Evening Media
if (typeof processStorylineIntake_ === 'function') {
  processStorylineIntake_(ctx);
}

// Week 3: Storyline weaving
if (typeof weaveStorylines_ === 'function') {
  weaveStorylines_(ctx);
}
```

Save and deploy.

### 4. Test (1 minute)

Run this in Apps Script:

```javascript
function testStorylineWeaving() {
  var ss = openSimSpreadsheet_();
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: { cycleId: 100, storyHooks: [] }
  };

  var results = weaveStorylines_(ctx);
  Logger.log('Processed: ' + results.processed);
  Logger.log('Roles assigned: ' + results.rolesAssigned);
  Logger.log('Cross-storylines: ' + results.crossStorylines);
  Logger.log('Clashes: ' + results.clashes);
  Logger.log('Alliances: ' + results.alliances);
}
```

**Expected output:**
```
Processed: 10-20 (depending on active storylines)
Roles assigned: 10-20
Cross-storylines: 0-3
Clashes: 0-2
Alliances: 0-2
```

Done! Next cycle will auto-assign roles and detect cross-storyline connections.

---

## Verify It's Working

After next cycle runs, check Storyline_Tracker for:
- CitizenRoles populated with JSON (e.g., `{"POP-00234": "protagonist"}`)
- ConflictType inferred (e.g., "political", "economic")
- CrossStorylineLinks showing connections

Check logs for:
```
weaveStorylines_ v1.0: Complete.
Processed: 15, Cross-storylines: 2, Clashes: 1, Alliances: 1
```

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackStorylineWeavingColumns.js
```

Then remove from Apps Script:
1. Delete storylineWeavingEngine.js
2. Remove weaveStorylines_() call from Phase 07
3. Re-deploy

---

## Files Added

1. `scripts/addStorylineWeavingColumns.js` - Migration
2. `phase07-evening-media/storylineWeavingEngine.js` - Weaving engine
3. `scripts/rollbackStorylineWeavingColumns.js` - Rollback
4. `docs/engine/WEEK3_MULTI_CITIZEN_STORYLINE_WEAVING.md` - Full docs

**Files Modified:**
1. Phase 07 processing (manual edit required)

---

## Citizen Role Types

```
protagonist → Main character driving the story
antagonist → Opposition/conflict creator
witness → Observer/commentator
victim → Affected by events
ally → Supporting character
background → Minor mention
```

**Auto-assignment:**
- 1st citizen in RelatedCitizens → protagonist
- 2nd citizen → antagonist (if title has "vs", "oppose", "clash") OR ally
- Remaining citizens → witness

---

## Story Hooks Generated

### CROSS_STORYLINE (severity 6-7)
When citizen appears in multiple active storylines:
- Severity 7: Conflicting roles (protagonist in one, antagonist in another)
- Severity 6: Non-conflicting roles

### RELATIONSHIP_CLASH (severity 6)
When citizen is antagonist in multiple storylines:
- Suggests complex opposition narrative

### ALLIANCE_OPPORTUNITY (severity 5)
When citizen is protagonist/ally in multiple storylines:
- Suggests bridging narrative opportunity

---

## Conflict Types

Auto-inferred from storyline title:

| Title Keywords | Conflict Type |
|----------------|---------------|
| vote, initiative, council, policy | political |
| fund, budget, housing, business | economic |
| feud, rivalry, dispute | personal |
| Has antagonist | personal (default) |
| No antagonist | political (default) |

---

## Full Documentation

See: `docs/engine/WEEK3_MULTI_CITIZEN_STORYLINE_WEAVING.md`

---

**Ready to deploy? Just run the 4 commands above!**

**Note:** Don't forget step 3 - manual edit to Phase 07 processing
