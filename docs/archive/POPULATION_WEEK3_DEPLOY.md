> **ARCHIVED** — Deployed. Moved 2026-02-16.

# Population Week 3: Education Pipeline & Career Pathways - Deploy Guide (Consolidated)

**Status:** Ready to deploy
**Time to deploy:** ~5 minutes
**Difficulty:** Easy
**Architecture:** Consolidated (no separate School_Quality sheet)

---

## What This Does

Adds education tracking, school quality metrics, and career progression mechanics to GodWorld.

**Impact:**
- 0 new sheets created (consolidated into Neighborhood_Demographics)
- 11 new columns added total:
  - 5 columns to Neighborhood_Demographics (school metrics)
  - 6 columns to Simulation_Ledger (citizen education/career)
- Education levels derived from UNI/MED/CIV flags
- Career progression tracking (student → entry → mid → senior → retired)
- Education → income correlation
- School quality affects career outcomes
- Zero breaking changes (backwards compatible)

**Note:** This is the consolidated version - school quality data is added to
Neighborhood_Demographics instead of creating a separate School_Quality sheet.
Cleaner architecture for media handoff.

---

## Deployment Steps

### 1. Run Migration (2 minutes)

```bash
cd ~/GodWorld

# See what will be added (safe, no changes)
node scripts/addEducationCareerColumns.js --dry-run

# Apply migration
node scripts/addEducationCareerColumns.js
```

**Expected output:**
```
Columns added to Neighborhood_Demographics: 5
Columns added to Simulation_Ledger: 6
Total columns added: 11
Neighborhoods with school data: 15

✅ Migration complete!
```

### 2. Deploy to Apps Script (1 minute)

```bash
git pull origin main
clasp push
```

**That's it!** The education career engine is already wired into Phase 05 - no manual editing needed.

### 3. Test (1 minute)

Run this in Apps Script:

```javascript
function testEducationCareer() {
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

  var results = processEducationCareer_(ctx);
  Logger.log('Education updated: ' + results.educationUpdated);
  Logger.log('Career advanced: ' + results.careerAdvanced);
  Logger.log('Stagnation detected: ' + results.stagnationDetected);
  Logger.log('Income adjusted: ' + results.incomeAdjusted);
}
```

**Expected output:**
```
Education updated: 500-600 (total citizens)
Career advanced: 5-15 (promotions this cycle)
Stagnation detected: 20-40 (citizens stagnant)
Income adjusted: 100-200 (income realigned to education)
```

Done! Next cycle will track education and career progression.

---

## Verify It's Working

After next cycle runs, check Simulation_Ledger for:
- **EducationLevel** populated (none, hs-dropout, hs-diploma, some-college, bachelor, graduate)
- **SchoolQuality** assigned (0-10)
- **CareerStage** tracked (student, entry-level, mid-career, senior, retired)
- **YearsInCareer** incrementing
- **CareerMobility** showing advancing/stagnant/declining
- **LastPromotionCycle** updated on promotions

Check Neighborhood_Demographics for:
- **SchoolQualityIndex** (0-10): Rockridge 9/10, West Oakland 3/10 CRISIS
- **GraduationRate** (%): Rockridge 95%, West Oakland 62%
- **CollegeReadinessRate** (%): Rockridge 78%, West Oakland 22%
- **TeacherQuality** (0-10): Quality of teachers
- **Funding** ($ per student): Rockridge $15k, West Oakland $6.5k

Check logs for:
```
processEducationCareer_ v1.0: Complete.
Education: 594, Career: 12, Stagnant: 35, Income: 150
```

---

## What If It Breaks?

**Rollback:**
```bash
cd ~/GodWorld
node scripts/rollbackEducationCareerColumns.js
```

Then remove from Apps Script:
1. Delete educationCareerEngine.js
2. Remove processEducationCareer_() call from Phase 05
3. Re-deploy

---

## Files Added/Modified

**Created:**
1. `scripts/addEducationCareerColumns.js` - Migration (consolidated architecture)
2. `phase05-citizens/educationCareerEngine.js` - Education/career engine
3. `scripts/rollbackEducationCareerColumns.js` - Rollback

**Modified:**
1. `phase01-config/godWorldEngine2.js` - Wired education engine into Phase 05

---

## Education System Mechanics

### Education Levels (Derived from existing flags)
```
UNI=Yes or MED=Yes → bachelor or graduate
CIV=Yes → some-college
Default adults → hs-diploma (85%), hs-dropout (5%), some-college (10%)
Youth <18 → none
Students 18-22 → hs-diploma or some-college
```

### Education → Income Correlation
```
none:         $28,000/year
hs-dropout:   $30,000/year
hs-diploma:   $42,000/year
some-college: $55,000/year
bachelor:     $75,000/year
graduate:     $120,000/year

Modified by career stage:
  student:     × 0.3
  entry-level: × 0.8
  mid-career:  × 1.0
  senior:      × 1.4
  retired:     × 0.6
```

### Career Advancement
```
Entry → Mid-career:   10 cycles (~6 months) + 15% chance
Mid-career → Senior:  20 cycles (~1 year) + education-dependent:
  - hs-diploma:   5% chance
  - bachelor:     10% chance
  - graduate:     15% chance

Stagnation threshold: 40 cycles (~2 years) without advancement
```

### School Quality by Neighborhood (Consolidated in Neighborhood_Demographics)
```
EXCELLENT (9-10):
  - Rockridge (9): 95% grad rate, 78% college-ready, $15k funding
  - Piedmont Ave (8): 93% grad rate, 72% college-ready, $14k funding

GOOD (6-8):
  - Grand Lake (7), Temescal (7), Lake Merritt (6), Adams Point (6)

ADEQUATE (5):
  - Downtown, Uptown, Laurel

STRUGGLING (4):
  - Jack London, Chinatown, Brooklyn, Eastlake

CRISIS (3):
  - Fruitvale: 65% grad rate, 25% college-ready, $7k funding
  - West Oakland: 62% grad rate, 22% college-ready, $6.5k funding
```

---

## Story Hooks Generated

### SCHOOL_QUALITY_CRISIS (severity 8)
When school quality <3:
- "West Oakland schools rated critically low (quality: 3/10)"
- Signals education inequality, neighborhood decline

### DROPOUT_WAVE (severity 6)
When graduation rate <65%:
- "Fruitvale graduation rate at 62% (below crisis threshold)"
- Signals systemic education failure

### CAREER_STAGNATION (severity 3)
When no advancement 20+ cycles:
- "John Doe has not advanced in 10 years"
- Signals economic immobility, frustration

### CAREER_BREAKTHROUGH (severity 4)
When promoted 2+ levels:
- "Jane Smith promoted from entry to senior level"
- Signals success story, upward mobility

---

## Integration with Other Systems

**Week 2 (Wealth Tracking):**
- Income now adjusts based on education level
- Wealth levels recalculate with education-based income
- Education → wealth correlation established

**Career Engine:**
- Career stage tracked alongside existing career data
- Promotions feed into career advancement tracking
- Years in career accumulates over time

**Generational Events:**
- Graduation events connect to education level
- Career milestones tracked

---

## Architectural Improvements

**Consolidated Design:**
- School quality data lives in Neighborhood_Demographics
- All neighborhood metrics in one place (demographics, crime, schools)
- Fewer sheets = cleaner architecture for media handoff
- Easier to analyze neighborhoods holistically

**Why consolidated?**
- Neighborhood_Demographics went from 7 → 12 columns (still manageable)
- Only 15-17 rows (neighborhoods, not citizens)
- Avoids sheet proliferation
- Simpler for external analysis and storytelling

---

## Next: Week 4

**Gentrification Mechanics & Migration Reasons** 🏘️
- Gentrification phase tracking
- Displacement pressure calculation
- Migration reasons (job, family, cost, crime, displaced)
- Migration events tracking
- Neighborhood wealth change

**Note:** Week 4 will extend existing Neighborhood_Map and
Neighborhood_Demographics rather than creating new ledgers.

---

**Ready to deploy? Just run the 2 commands above!**

**Note:** Week 3 builds on Weeks 1-2 (household + wealth). Deploy those first if you haven't already.
