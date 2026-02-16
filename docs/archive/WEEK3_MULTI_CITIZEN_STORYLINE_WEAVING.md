# Week 3: Multi-Citizen Storyline Weaving Implementation

**Status:** Ready for deployment
**Version:** v1.0
**Date:** 2026-02-11
**Part of:** Story & Narrative Enhancement Plan

---

## Overview

Week 3 adds cross-storyline detection and citizen role mapping. The system now identifies citizens appearing in multiple storylines, detects conflicts and alliances, and generates weaving hooks for complex multi-citizen narratives.

**Key Features:**
- Citizen role assignment (protagonist, antagonist, witness, victim, ally)
- Cross-storyline conflict detection
- Relationship web mapping
- Alliance opportunity detection
- Automatic conflict type inference

---

## Files Created/Modified

### New Files

1. **`scripts/addStorylineWeavingColumns.js`** - Migration script
   - Adds 4 new columns to Storyline_Tracker
   - Safe to re-run (skips existing columns)
   - Dry-run mode available

2. **`phase07-evening-media/storylineWeavingEngine.js`** - Storyline weaving engine
   - Detects citizens in multiple storylines
   - Assigns protagonist/antagonist/witness roles
   - Maps cross-storyline links
   - Generates weaving story hooks

3. **`scripts/rollbackStorylineWeavingColumns.js`** - Rollback script
   - Removes all 4 columns if needed
   - 5-second warning before deletion
   - Dry-run mode available

4. **`docs/engine/WEEK3_MULTI_CITIZEN_STORYLINE_WEAVING.md`** - This file

### Modified Files

None yet - requires integration into Phase 07 processing

---

## Schema Changes

### Storyline_Tracker (+4 columns)

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| CitizenRoles | JSON | "{}" | Role mapping: `{"POP-123": "protagonist", "CUL-045": "witness"}` |
| ConflictType | String | "" | personal/political/economic/romantic/ideological |
| RelationshipImpact | JSON | "{}" | Predicted relationship changes |
| CrossStorylineLinks | JSON | "[]" | Other storylines with shared citizens |

**Total: 4 new columns**

**Note:** Week 3 uses citizen columns added in Week 1 (ActiveStorylines, StorylineRole on Simulation_Ledger, Cultural_Ledger, Chicago_Citizens). No additional citizen ledger columns needed.

---

## Citizen Role Types

| Role | Description | Example |
|------|-------------|---------|
| **protagonist** | Main character driving the story | Mark Aitken leading union campaign |
| **antagonist** | Opposition/conflict creator | Council member blocking initiative |
| **witness** | Observer/commentator | Resident quoted about neighborhood change |
| **victim** | Affected by events | Family displaced by housing crisis |
| **ally** | Supporting character | Activist supporting campaign |
| **background** | Minor mention | Community member at rally |

---

## Conflict Types

| Type | Description | Example |
|------|-------------|---------|
| **personal** | Individual disputes | Neighborhood feud |
| **political** | Governance/policy conflicts | Initiative vote battle |
| **economic** | Financial/resource conflicts | Budget allocation debate |
| **romantic** | Relationship conflicts | Love triangle drama |
| **ideological** | Values/belief conflicts | Environmental vs. development |

---

## Role Assignment Logic

### Automatic Assignment

When CitizenRoles is empty, the engine auto-assigns roles:

1. **First citizen** in RelatedCitizens → `protagonist` (default)
2. **Second citizen** → `antagonist` or `ally` (based on title keywords)
   - Title contains "vs", "oppose", "clash", "conflict" → `antagonist`
   - Otherwise → `ally`
3. **Remaining citizens** → `witness`

### Title-Based Conflict Inference

When ConflictType is empty, the engine infers from title:

- "vote", "initiative", "council", "policy" → `political`
- "fund", "budget", "housing", "business" → `economic`
- "feud", "rivalry", "dispute" → `personal`
- Has antagonist → `personal` (default)
- No antagonist → `political` (default)

---

## Cross-Storyline Detection

### Multi-Storyline Citizens

Engine builds citizen-to-storyline map:

```
Citizen A appears in:
  - Storyline X (protagonist)
  - Storyline Y (antagonist)
  - Storyline Z (witness)
```

### Conflicting Roles

When a citizen is `protagonist` in one storyline and `antagonist` in another:

**Generates:** CROSS_STORYLINE hook (severity 7)

**Example:**
```
Mark Aitken:
  - "Union organizing" (protagonist)
  - "OPP pressure campaign" (antagonist)

Hook: "Mark Aitken appears in 2 storylines with conflicting roles"
```

### Non-Conflicting Multi-Storylines

When a citizen appears in 2+ storylines without role conflict:

**Generates:** CROSS_STORYLINE hook (severity 6)

---

## Relationship Detection

### Relationship Clashes

Detects when same citizen is `antagonist` in multiple storylines:

**Generates:** RELATIONSHIP_CLASH hook (severity 6)

**Example:**
```
Council Member Smith:
  - Antagonist in "Housing initiative battle"
  - Antagonist in "Park funding dispute"

Hook: "Smith is antagonist in both storylines"
```

### Alliance Opportunities

Detects when same citizen is `protagonist` or `ally` in multiple storylines:

**Generates:** ALLIANCE_OPPORTUNITY hook (severity 5)

**Example:**
```
Community Organizer Chen:
  - Protagonist in "Laurel cleanup campaign"
  - Ally in "District 4 safety initiative"

Hook: "Chen could bridge both storylines"
```

---

## Story Hooks Generated

### CROSS_STORYLINE

Generated when citizen appears in multiple active storylines.

```javascript
{
  hookType: 'CROSS_STORYLINE',
  citizen: 'Mark Aitken',
  storylines: ['SL-123', 'SL-456'],
  roles: [
    { storylineId: 'SL-123', title: 'Union organizing', role: 'protagonist' },
    { storylineId: 'SL-456', title: 'OPP pressure', role: 'antagonist' }
  ],
  severity: 7,  // 7 if conflicting roles, 6 otherwise
  description: 'Mark Aitken appears in 2 storylines with conflicting roles'
}
```

### RELATIONSHIP_CLASH

Generated when citizen is antagonist in multiple storylines.

```javascript
{
  hookType: 'RELATIONSHIP_CLASH',
  citizen: 'Council Member Smith',
  storyline1: 'SL-789',
  storyline2: 'SL-012',
  severity: 6,
  description: 'Smith is antagonist in both "Housing battle" and "Park dispute"'
}
```

### ALLIANCE_OPPORTUNITY

Generated when citizen is protagonist/ally in multiple storylines.

```javascript
{
  hookType: 'ALLIANCE_OPPORTUNITY',
  citizen: 'Community Organizer Chen',
  storyline1: 'SL-345',
  storyline2: 'SL-678',
  severity: 5,
  description: 'Chen could bridge "Cleanup campaign" and "Safety initiative"'
}
```

---

## Deployment Instructions

### Step 1: Run Migration (Local)

```bash
cd ~/GodWorld

# Dry run first
node scripts/addStorylineWeavingColumns.js --dry-run

# Apply migration
node scripts/addStorylineWeavingColumns.js
```

**Expected output:**
```
✅ Connected: GodWorld Simulation
...
Storyline_Tracker: 4 columns added

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
- `phase07-evening-media/storylineWeavingEngine.js` (new)

### Step 3: Wire into Phase 07

Add to Phase 07 processing (after storyline processing):

**Option A: If you have storylineIntake.js or similar:**
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

**Option B: Add to mediaRoomIntake.js or similar:**
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

### Step 4: Verify Deployment

1. Open Apps Script editor
2. Verify `storylineWeavingEngine.js` is present
3. Check Phase 07 has `weaveStorylines_()` call
4. Look for `weaveStorylines_` function

---

## Testing

### Test 1: Manual Role Assignment

Run this manually in Apps Script:

```javascript
function testStorylineWeaving() {
  var ss = openSimSpreadsheet_();

  // Build minimal context
  var ctx = {
    ss: ss,
    config: { cycleCount: 100 },
    summary: {
      cycleId: 100,
      storyHooks: []
    }
  };

  Logger.log('Testing storyline weaving...');

  var results = weaveStorylines_(ctx);

  Logger.log('Storyline Weaving Test Results:');
  Logger.log('- Processed: ' + results.processed);
  Logger.log('- Roles assigned: ' + results.rolesAssigned);
  Logger.log('- Cross-storylines: ' + results.crossStorylines);
  Logger.log('- Clashes: ' + results.clashes);
  Logger.log('- Alliances: ' + results.alliances);
  Logger.log('- Errors: ' + results.errors.length);

  // Check story hooks
  Logger.log('\nStory Hooks Generated:');
  for (var i = 0; i < ctx.summary.storyHooks.length; i++) {
    var hook = ctx.summary.storyHooks[i];
    Logger.log('- ' + hook.hookType + ' (severity ' + hook.severity + '): ' + hook.description);
  }
}
```

### Test 2: Verify Role Assignment

Check Storyline_Tracker for updated CitizenRoles:

```javascript
function checkRoleAssignments() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Storyline_Tracker');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var rolesCol = headers.indexOf('CitizenRoles');
  var conflictCol = headers.indexOf('ConflictType');

  Logger.log('=== ROLE ASSIGNMENTS ===\n');

  for (var i = 1; i < Math.min(data.length, 11); i++) {
    var row = data[i];
    var title = row[headers.indexOf('Title')];
    var roles = row[rolesCol];
    var conflict = row[conflictCol];

    Logger.log('Storyline: ' + title);
    Logger.log('  Roles: ' + roles);
    Logger.log('  Conflict: ' + conflict);
    Logger.log('');
  }
}
```

### Test 3: Monitor Cross-Storyline Detection

```javascript
function monitorCrossStorylines() {
  var ss = openSimSpreadsheet_();
  var sheet = ss.getSheetByName('Storyline_Tracker');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];

  var linksCol = headers.indexOf('CrossStorylineLinks');

  Logger.log('=== CROSS-STORYLINE LINKS ===\n');

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var links = row[linksCol];

    if (links && links !== '[]') {
      var title = row[headers.indexOf('Title')];
      Logger.log('Storyline: ' + title);
      Logger.log('  Links: ' + links);
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
Phase 01-06: Standard processing
  ↓
Phase 07: Evening Media
  ↓
  ├─ processArticleIntake_() - Intake articles
  ├─ processStorylineIntake_() - Intake storylines
  ├─ processCitizenUsageIntake_() - Intake citizen mentions
  ├─ routeCitizenUsageToIntake_() - Route to intake sheets
  ├─ updateCitizenFameFromMedia_() - Week 1 fame tracking
  └─ [NEW] weaveStorylines_() - Week 3 storyline weaving
      ├─ Load active storylines
      ├─ Build citizen-storyline map
      ├─ Detect multi-storyline citizens
      ├─ Assign citizen roles (if empty)
      ├─ Detect cross-storyline conflicts
      ├─ Detect relationship clashes
      ├─ Detect alliance opportunities
      └─ Generate story hooks
  ↓
Phase 08-11: Continue processing
```

---

## Cross-Ledger Support

Week 3 works across **all citizen ledgers**:

### Citizen ID Formats

- **Simulation_Ledger:** Uses POPID (e.g., "POP-00234")
- **Cultural_Ledger:** Uses CUL-ID (e.g., "CUL-045")
- **Chicago_Citizens:** Uses CitizenId (e.g., "CHI-0012")
- **Generic_Citizens:** Uses name string (e.g., "Jane Doe")

### CitizenRoles JSON Examples

**Oakland named citizen + Cultural figure:**
```json
{
  "POP-00234": "protagonist",
  "CUL-045": "witness"
}
```

**Generic citizen (by name):**
```json
{
  "Mark Aitken": "protagonist",
  "Emma Chen": "ally"
}
```

**Chicago citizen:**
```json
{
  "CHI-0012": "antagonist"
}
```

---

## Use Cases

### Use Case 1: Auto-Role Assignment

**Scenario:** New storyline "Council vs. Activists" created with RelatedCitizens: "Mark Aitken, Council Member Smith"

**Week 3 Processing:**
1. CitizenRoles empty → trigger auto-assignment
2. Title contains "vs" → second citizen = antagonist
3. Roles assigned:
   ```json
   {
     "Mark Aitken": "protagonist",
     "Council Member Smith": "antagonist"
   }
   ```
4. ConflictType inferred: "political" (title keyword "Council")

**Result:** Roles and conflict type auto-populated

### Use Case 2: Cross-Storyline Conflict

**Scenario:**
- Storyline A: "Union organizing" - Mark Aitken (protagonist)
- Storyline B: "OPP pressure campaign" - Mark Aitken (antagonist)
- Both active this cycle

**Week 3 Processing:**
1. Build citizen map: Mark Aitken → [A, B]
2. Check roles: protagonist in A, antagonist in B → **CONFLICT**
3. Generate CROSS_STORYLINE hook (severity 7)
4. Update CrossStorylineLinks on both storylines

**Result:** Media Room alerted to complex narrative opportunity

### Use Case 3: Alliance Bridge

**Scenario:**
- Storyline X: "Laurel cleanup" - Emma Chen (protagonist)
- Storyline Y: "D4 safety" - Emma Chen (ally)
- Both active this cycle

**Week 3 Processing:**
1. Build citizen map: Emma Chen → [X, Y]
2. Check roles: protagonist + ally → **ALLIANCE**
3. Generate ALLIANCE_OPPORTUNITY hook (severity 5)
4. Update CrossStorylineLinks

**Result:** Suggestion to write piece on Chen's multi-issue activism

---

## Troubleshooting

### Problem: Roles not assigned

**Check:**
1. CitizenRoles column exists?
2. RelatedCitizens populated?
3. Storyline status = "active"?

**Debug:**
```javascript
// Check storyline data
var ss = openSimSpreadsheet_();
var sheet = ss.getSheetByName('Storyline_Tracker');
var data = sheet.getDataRange().getValues();
// Inspect row data
```

### Problem: No cross-storyline hooks generated

**Check:**
1. Multiple storylines with same citizen?
2. Both storylines active?
3. Citizen name matches exactly?

**Fix:**
Ensure RelatedCitizens uses consistent naming (e.g., "Mark Aitken" not "M. Aitken" or "Aitken, Mark")

### Problem: Conflict type always "political"

**Adjust inference logic:**
Edit `inferConflictType_()` in storylineWeavingEngine.js:

```javascript
function inferConflictType_(storyline, roles) {
  var title = storyline.title.toLowerCase();

  // Add more keywords for economic
  if (title.indexOf('fund') > -1 || title.indexOf('budget') > -1 ||
      title.indexOf('housing') > -1 || title.indexOf('business') > -1 ||
      title.indexOf('rent') > -1 || title.indexOf('development') > -1) {
    return 'economic';
  }

  // ... rest of logic
}
```

Then redeploy: `npx clasp push`

### Problem: Columns not found error

**Error:** `CitizenRoles column not found. Run migration first.`

**Fix:**
```bash
node scripts/addStorylineWeavingColumns.js
```

---

## Manual Override

### Manually Set Roles

To override auto-assignment, directly edit CitizenRoles JSON in Storyline_Tracker:

```json
{
  "POP-00234": "protagonist",
  "POP-00567": "antagonist",
  "CUL-045": "witness",
  "Mark Aitken": "victim"
}
```

### Manually Set Conflict Type

Set ConflictType column to one of:
- personal
- political
- economic
- romantic
- ideological

### Manually Set Cross-Links

Edit CrossStorylineLinks JSON:

```json
["SL-123", "SL-456", "SL-789"]
```

---

## Rollback Procedure

If you need to undo Week 3 changes:

```bash
cd ~/GodWorld

# Dry run first
node scripts/rollbackStorylineWeavingColumns.js --dry-run

# Apply rollback (5-second warning)
node scripts/rollbackStorylineWeavingColumns.js
```

**Then remove from Apps Script:**
1. Delete `storylineWeavingEngine.js`
2. Remove `weaveStorylines_()` call from Phase 07 processing
3. `npx clasp push`

---

## Next Steps: Week 4

**Week 4: Storyline Resolution & Hook Lifecycle**
- ResolutionCondition tracking
- StaleStoryline detection (>10 cycles no coverage)
- Hook expiration (>5 cycles unused)
- Wrap-up hook generation
- Adds 8 new columns across 2 sheets

---

## Reference Documents

- [Story & Narrative Enhancement Plan](STORY_NARRATIVE_ENHANCEMENT_PLAN.md) - Full 4-week plan
- [Storyline Weaving Engine v1.0](../../phase07-evening-media/storylineWeavingEngine.js) - Engine implementation
- [Week 2: Arc Lifecycle Automation](WEEK2_ARC_LIFECYCLE_AUTOMATION.md) - Previous week

---

**Deployment Checklist:**

- [ ] Migration run locally (4 columns added to Storyline_Tracker)
- [ ] storylineWeavingEngine.js deployed to Apps Script
- [ ] weaveStorylines_() wired into Phase 07 processing
- [ ] Test 1: Manual role assignment (testStorylineWeaving)
- [ ] Test 2: Verify role assignments in Storyline_Tracker
- [ ] Test 3: Monitor cross-storyline links
- [ ] Verify CitizenRoles auto-populated
- [ ] Verify ConflictType inferred
- [ ] Verify story hooks generated (CROSS_STORYLINE, RELATIONSHIP_CLASH, ALLIANCE_OPPORTUNITY)

---

**Last Updated:** 2026-02-11
**Author:** GodWorld Project Team
**Status:** ✅ Ready for deployment
