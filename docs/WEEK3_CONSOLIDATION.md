# Week 3 Consolidation: School Quality Integration

**Date:** 2026-02-11
**Architectural Decision:** Consolidate school metrics into Neighborhood_Demographics

---

## What Changed

### Before (Original Week 3 Plan)
- Create separate **School_Quality** sheet with 15 neighborhoods
- 6 columns: Neighborhood, SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding
- Separate sheet to query for school quality checks
- Total impact: **1 new sheet** + 6 columns to Simulation_Ledger

### After (Consolidated Architecture)
- Add **5 columns** to existing **Neighborhood_Demographics** sheet
- SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding
- All neighborhood metrics in one place
- Total impact: **0 new sheets** + 11 columns (5 neighborhood + 6 citizen)

---

## Why Consolidate?

### 1. Media Handoff Clarity
- Cleaner architecture for external analysis
- All neighborhood data in one place (demographics, schools, crime)
- Easier for journalists/analysts to understand the data model

### 2. Avoid Sheet Bloat
- Neighborhood_Demographics only has 15-17 rows (manageable)
- 7 → 12 columns (still reasonable width)
- Better than proliferating separate sheets for each metric type

### 3. Simpler Queries
- One query to get complete neighborhood profile
- No need to join School_Quality + Neighborhood_Demographics
- Reduces complexity in future analysis engines

### 4. Sets Pattern for Week 4
- Week 4 (Gentrification) will extend existing infrastructure
- Neighborhood_Map already has DemographicMarker field
- Consolidation pattern prevents future bloat

---

## Files Modified

### Migration Script
**scripts/addEducationCareerColumns.js**
- Changed from: Create School_Quality sheet + add 6 columns to Simulation_Ledger
- Changed to: Add 5 columns to Neighborhood_Demographics + 6 to Simulation_Ledger
- Added: `populateNeighborhoodSchoolData()` function to fill initial values

### Rollback Script
**scripts/rollbackEducationCareerColumns.js**
- Changed from: Delete School_Quality sheet + remove 6 columns
- Changed to: Remove 11 columns (5 neighborhood + 6 citizen)
- No sheet deletion needed

### Engine
**phase05-citizens/educationCareerEngine.js**
- Changed: `checkSchoolQuality_()` now reads from Neighborhood_Demographics
- Changed: Header comment updated to reflect consolidation
- No other logic changes needed

### Deployment Guide
**POPULATION_WEEK3_DEPLOY.md**
- Updated to explain consolidated architecture
- Added "Architectural Improvements" section
- Clarified expected output and verification steps

---

## Schema Changes

### Neighborhood_Demographics (5 new columns)
```
SchoolQualityIndex    → 0-10 rating (Rockridge 9, West Oakland 3)
GraduationRate        → % graduating HS (Rockridge 95%, West Oakland 62%)
CollegeReadinessRate  → % college-ready (Rockridge 78%, West Oakland 22%)
TeacherQuality        → 0-10 rating
Funding               → $ per student (Rockridge $15k, West Oakland $6.5k)
```

### Simulation_Ledger (6 new columns - unchanged)
```
EducationLevel        → none | hs-dropout | hs-diploma | some-college | bachelor | graduate
SchoolQuality         → 0-10 (from neighborhood)
CareerStage           → student | entry-level | mid-career | senior | retired
YearsInCareer         → cycles in current career
CareerMobility        → stagnant | advancing | declining
LastPromotionCycle    → cycle of last promotion
```

---

## Deployment

**Status:** Ready to deploy (tested with --dry-run)

```bash
# 1. Run migration
node scripts/addEducationCareerColumns.js --dry-run  # Verify
node scripts/addEducationCareerColumns.js             # Apply

# 2. Deploy to Apps Script
git pull origin main
clasp push
```

---

## Trade-offs

### Pros
✅ Cleaner architecture for media handoff
✅ Fewer sheets to manage
✅ All neighborhood data co-located
✅ Sets good pattern for future enhancements
✅ Simpler queries and analysis

### Cons
⚠️ Neighborhood_Demographics gets wider (7 → 12 columns)
⚠️ If we add many more neighborhood metrics, may need to revisit
⚠️ Migration slightly more complex (populate specific values per neighborhood)

### Decision
**The pros outweigh the cons.** 12 columns across 15 rows is still very manageable,
and the architectural clarity is worth it for media handoff.

---

## Lessons Learned

1. **Check for consolidation opportunities BEFORE deploying**
   - We caught this before Week 3 deployed (good!)
   - Saved the effort of migration + consolidation later

2. **Consider the end user (media/journalists)**
   - Simpler data model = easier to analyze
   - Fewer sheets = less cognitive overhead

3. **Think about future patterns**
   - Week 4 will extend existing sheets, not create new ones
   - Consolidation sets the standard

4. **Measure twice, cut once**
   - Thorough review caught potential bloat
   - Architectural decisions matter for long-term maintainability

---

**Next:** Deploy Week 3 consolidated version, then proceed to Week 4 (Gentrification).
