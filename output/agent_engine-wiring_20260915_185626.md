WIRING CARD — Neighborhood_Demographics education columns (tab)
map: 2026-09-15 / 183 files / 1402 functions

TARGET: Neighborhood_Demographics sheet, five education columns:
- SchoolQualityIndex
- GraduationRate  
- CollegeReadinessRate
- TeacherQuality
- Funding

═══════════════════════════════════════════════════════════════════════════════

DEFINITION

scripts/addEducationCareerColumns.js:1–300  ONE-TIME SETUP
  - Adds 5 education columns to Neighborhood_Demographics
  - Populates initial values from NEIGHBORHOOD_SCHOOL_DATA map (lines 61–77)
  - v1.0 — one-time migration tool, not engine

scripts/backfillNeighborhoodEducation.js:1–165  ONE-TIME BACKFILL
  - Derives education values from Neighborhood_Map MedianIncome
  - Writes 5 fields per row via updateRowFields (targeted field write, not full-row clobber)
  - Canon calibration: floors values well above crisis gates (SchoolQualityIndex ≥7, GraduationRate ≥85)
  - S247 gap-log note: prior backfill defaults were blanked each Phase 3 cycle by clobber bug (now fixed)

═══════════════════════════════════════════════════════════════════════════════

PHASE POSITION

Schema columns created: scripts/addEducationCareerColumns.js:262–266  (one-time)
Schema columns preserved: utilities/ensureNeighborhoodDemographics.js:290–303  (per-cycle)
  - batchUpdateNeighborhoodDemographics_ copies existing row to preserve unmanaged columns (S247 fix)

Per-cycle read entry: phase05-citizens/educationCareerEngine.js:213, 218  (Phase 5-EducationCareer)
  - processEducationCareer_ calls checkSchoolQuality_ @ line 213
  - processEducationCareer_ calls updateMinorSchoolQuality_ @ line 218

Phase position:
  production entry  : Phase3-NeighborhoodDemo @ phase01-config/godWorldEngine2.js:313  — updateNeighborhoodDemographics_
                      (Phase 5-EducationCareer @ line 387)  — processEducationCareer_
  cycle-phases      : Phase3-NeighborhoodDemo @ phase01-config/godWorldEngine2.js:2062  — updateNeighborhoodDemographics_
                      (Phase 5-EducationCareer @ line 2136)  — processEducationCareer_

Timeline relative to Phase10-ExecuteIntents (line 594 / 2329):
  - Phase 3 NeighborhoodDemo: BEFORE Phase 10
  - Phase 5 readers (checkSchoolQuality_, updateMinorSchoolQuality_): BEFORE Phase 10
  - S.neighborhoodDemographics loaded @ Phase 3 line 288 (updateNeighborhoodDemographics.js)

═══════════════════════════════════════════════════════════════════════════════

WRITERS (0 per-cycle engine writers; 2 one-time setup scripts)

ONE-TIME SETUP (direct sheet writes, not per-cycle):

scripts/addEducationCareerColumns.js:221  DIRECT  →  Neighborhood_Demographics
  - updateRangeByPosition('Neighborhood_Demographics', i+2, schoolQualityIdx, updateValues)
  - Populates SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding
  - Called by populateNeighborhoodSchoolData (line 165–229)

scripts/backfillNeighborhoodEducation.js:145  DIRECT  →  Neighborhood_Demographics
  - updateRowFields('Neighborhood_Demographics', p.row, fields)
  - Targeted write: SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding only
  - Preserves demographic columns (Students, Adults, Seniors, Unemployed, Sick)

PRESERVATION (per-cycle, does NOT write education columns):

utilities/ensureNeighborhoodDemographics.js:301  (batchUpdateNeighborhoodDemographics_)
  - rowData = values[existingRowIndex].slice()  — copies existing row to preserve education cols
  - Writes only 6 demographic fields: Neighborhood, Students, Adults, Seniors, Unemployed, Sick

═══════════════════════════════════════════════════════════════════════════════

READERS (engine-side)

PHASE 5 — phase05-citizens/educationCareerEngine.js

checkSchoolQuality_(ss, ctx, cycle)  function definition @ line 1328
  READ  SchoolQualityIndex  @ line 1340 (header.indexOf)
  READ  GraduationRate      @ line 1341 (header.indexOf)
  - Reads sheet.getDataRange().getValues() (line 1332) — direct sheet read, not S.neighborhoodDemographics
  - Loops rows (line 1345), checks quality < 3 for SCHOOL_QUALITY_CRISIS (line 1353)
  - Checks gradRate < 65 for DROPOUT_WAVE (line 1369)
  - Both hooks queued to ctx.summary.storyHooks (lines 1354–1364, 1370–1380)

updateMinorSchoolQuality_(ss, ctx, cycle)  function definition @ line 671
  READ  SchoolQualityIndex  @ line 687 (header indexOf, stored in dQ var)
  - Reads demoSheet.getDataRange().getValues() (line 685) — direct sheet read
  - Builds qualityByHood map (line 690): for each hood, stores SchoolQualityIndex value
  - Reads ctx.ledger.rows (line 676) — Phase 42 §5.6 shared memory layer
  - WRITE  ctx.ledger.rows[r][iSQ] = q  @ line 713 (mutation to ledger memory, committed Phase 10)
  - Applies heritage-tier unlock: +1 to quality for Established+ lineage (line 712)

processEducationCareer_(ctx)  function definition @ line 166
  - Calls checkSchoolQuality_ @ line 213
  - Calls updateMinorSchoolQuality_ @ line 218
  - Entry point for Phase 5-EducationCareer

═══════════════════════════════════════════════════════════════════════════════

CTX STRUCTURE

S.neighborhoodDemographics  loaded @ phase03-population/updateNeighborhoodDemographics.js:288
  - map: neighborhood name → { neighborhood, students, adults, seniors, unemployed, sick, lastUpdated, totalPopulation }
  - populated by getNeighborhoodDemographics_(ss) @ utilities/ensureNeighborhoodDemographics.js:134
  - Does NOT include education columns (those read directly from sheet, not cached in ctx)

S.neighborhoodState[hood]  loaded @ phase02-world-state/loadNeighborhoodState.js:118
  - sentiment, crimeIndex, retailVitality, eventAttractiveness @ line 119–122
  - trajectory, trajectoryMomentum, housingPressure, medianRent @ line 123–126
  - migrationFlow @ line 128
  - noiseIndex, medianIncome @ line 129–130
  - incomeTier, boomExposure, boomIndex, employerCharacter @ line 131–134
  - wealthMin, wealthMax @ line 135–136

Pressure inputs available to Phase 5 (before education engine runs):
  - S.neighborhoodState[hood].housingPressure  (loaded Phase 2, line 125)
  - S.neighborhoodState[hood].crimeIndex       (loaded Phase 2, line 120)
  - S.neighborhoodState[hood].medianIncome     (loaded Phase 2, line 130)
  - S.neighborhoodState[hood].noiseIndex       (loaded Phase 2, line 129)
  - S.neighborhoodState[hood].incomeTier       (loaded Phase 2, line 131)

Education-tagged initiatives (civicInitiativeEngine):
  - Domain resolution @ line 1275: domain === 'education'
  - Name-based detection @ line 1298: indexOf('school') >= 0 || indexOf('education') >= 0
  - Ripple type @ line 1615–1618: domainLower === 'education' → rippleType = 'education'

═══════════════════════════════════════════════════════════════════════════════

WRITE PATH (education columns)

Per-cycle: NONE
  - SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding are READ-ONLY after backfill
  - No queueCellIntent_, queueAppendIntent_, queueRangeIntent_, queueReplaceIntent_ calls found
  - No Phase 10 persist intents for these columns

One-time setup: DIRECT (outside Phase 10 persistence)
  - scripts/addEducationCareerColumns.js:221  — updateRangeByPosition (direct sheet write)
  - scripts/backfillNeighborhoodEducation.js:145  — updateRowFields (direct sheet write, targetted fields only)

═══════════════════════════════════════════════════════════════════════════════

STORY HOOKS (generated by checkSchoolQuality_)

SCHOOL_QUALITY_CRISIS
  - hookType: 'SCHOOL_QUALITY_CRISIS'
  - domain: 'EDUCATION'
  - severity: 8
  - condition: SchoolQualityIndex < 3  @ line 1353
  - fields carried: neighborhood, quality, gradRate @ lines 1361–1363

DROPOUT_WAVE
  - hookType: 'DROPOUT_WAVE'
  - domain: 'EDUCATION'
  - severity: 6
  - condition: GraduationRate < 65  @ line 1369
  - fields carried: neighborhood, gradRate @ lines 1377–1378

Canon guard (S247):
  - All backfilled values sit at or above crisis gates: SchoolQualityIndex ≥ 7, GraduationRate ≥ 85
  - Both hooks stay dormant on live data by design (prosperity-era Oakland canon)

═══════════════════════════════════════════════════════════════════════════════

OPEN WORK (ROLLOUT entries)

engine.191  docs/engine/ROLLOUT_PLAN.md:122
  School-district roster mis-mapped: 12/29 active BIZ-00016/35 rows off-role (plumber, line cooks, taxi driver, a Grade Schooler b.2030) — `EmployerBizId` set by the Education skill tag, not the job. Targeted restore of the 12 + linker guard, never a sweep | ready | engine-sheet

engine.192  docs/engine/ROLLOUT_PLAN.md:123
  School-drift pass (education table, ruled S442 "gravitate to all systems drift" — SIM_DOCTRINE §16): SchoolQualityIndex/GraduationRate/CollegeReadinessRate/TeacherQuality/Funding move per-cycle off hood pressure, funding, initiatives, replacing the once-backfilled static values | ready | engine-sheet

═══════════════════════════════════════════════════════════════════════════════

HISTORY

phase03-population/updateNeighborhoodDemographics.js:
  5337fbff  engine.164: sim-year literal 2041 swept to the calendar's year at every engine age site
  2a8f64cb  S423 engine.134 Tasks 4–8 — the leftover hood copies read the ledger; 2–3 held behind T7
  c05a14dd  engine.135 A+B2: city employment dial pulled to the attractor
  01a1549e  engine.133 Tasks 2-7: city health system built — attractor + weather-event strain
  95a7359a  engine.132: the initiative ledger can finally touch illness — built, tested, NOT deployed
  a567f933  mags: engine.102 Task 5 — W2b land (physics literals -> World_Config reads)

utilities/ensureNeighborhoodDemographics.js:
  5337fbff  engine.164: sim-year literal 2041 swept to the calendar's year at every engine age site
  2a8f64cb  S423 engine.134 Tasks 4–8 — the leftover hood copies read the ledger; 2–3 held behind T7
  49c23fb4  civic.20 E2 + civic.21 ruling: ghost hoods retired, East Oakland demographics closed
  31f9fbb3  S256 [engine/sheet] finish roster alignment — district anchors + demographics silent-skip
  3ce0a3f4  S247 [engine/sheet] education subsystem — fix Neighborhood_Demographics clobber + canon-dormancy note
  61d3481f  fix: Resolve OAKLAND_NEIGHBORHOODS global var collision across 4 files

phase05-citizens/educationCareerEngine.js:
  ea3fda33  S463 engine.231: the raw-carried hook reaches a desk and a journalist
  fb588641  S417 engine.162 — money and education apply to every clock
  a05300f4  S412 [engine-sheet] engine.149 graduation follows the field (backlog 5)
  e960e436  S412 [engine-sheet] engine.148 one year formula (backlog 7) + casino age fix
  ba337f86  S411 [engine-sheet] engine.146 — SkillTags two truths, LIVE PROD @21
  e890f899  S411 [engine-sheet] engine.145 — the SkillTags gap: one alias table

═══════════════════════════════════════════════════════════════════════════════

FILES OPENED

phase03-population/updateNeighborhoodDemographics.js
phase05-citizens/educationCareerEngine.js
phase02-world-state/loadNeighborhoodState.js
phase05-citizens/civicInitiativeEngine.js
utilities/ensureNeighborhoodDemographics.js
scripts/addEducationCareerColumns.js
scripts/backfillNeighborhoodEducation.js
phase01-config/godWorldEngine2.js
docs/engine/ROLLOUT_PLAN.md

═══════════════════════════════════════════════════════════════════════════════

KEY FINDING: STATIC vs DRIFT

The five education columns (SchoolQualityIndex, GraduationRate, CollegeReadinessRate, TeacherQuality, Funding) are currently:
- Written once (setup scripts + backfill)
- Read every Phase 5 cycle (checkSchoolQuality_, updateMinorSchoolQuality_)
- Never updated per-cycle by the engine

Per SIM_DOCTRINE §16 (engine.192 ROLLOUT note): education columns should drift per-cycle off hood pressure inputs (housingPressure, crimeIndex, initiatives) and funding. Current state is frozen-column class. No per-cycle writer exists yet — engine.192 is the build item to add that drift mechanism.
