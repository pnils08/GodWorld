WIRING CARD — settleAdulthood_ (function)   map: 2026-09-02 / 186 files   ✓ fresh

DEFINITION
  phase05-citizens/educationCareerEngine.js:766  function settleAdulthood_(ctx, cycle, rng)  v2.1

PHASE POSITION
  production entry : Phase5-EducationCareer @ godWorldEngine2.js:375  — BEFORE Phase10-ExecuteIntents (:573)
  cycle-phases     : Phase5-EducationCareer @ godWorldEngine2.js:2106 — BEFORE Phase10-ExecuteIntents (:2290)

CALLERS (1)
  phase05-citizens/educationCareerEngine.js:174  results.adulthood = settleAdulthood_(ctx, cycle, rng);

S FIELDS
  (none referenced directly as S.field or ctx.summary.field)

OTHER CTX
  ctx.ledger.headers @ :768  (READ)
  ctx.ledger.rows @ :769  (READ/WRITE — modified in-place)
  ctx.ledger.dirty @ :951  (WRITE)
  ctx.ss @ :783  (READ — sheet lookups)
  ctx.summary.careerSignals @ :915  (READ)

WRITE PATH
  (no queueIntents or direct sheets)
  ctx.ledger.rows[r] direct mutation @ :799, 836, 857–873, 884, 911–912, 918, 928, 931–933
  ctx.ledger.dirty = true @ :951
  Household_Ledger read via getDataRange @ :783–792
  Neighborhood_Demographics read via getDataRange @ :957–1011 (checkSchoolQuality_)

TABS REFERENCED
  Household_Ledger  — read via getDataRange (:783), column HouseholdId/HouseholdIncome/Status
  (Neighborhood_Demographics — part of checkSchoolQuality_, not settleAdulthood_ proper)

OPEN WORK
  docs/plans/2026-08-29-employment-system-cascade.md:252  `settleAdulthood_ settled 0` — unrelated to cascade; fires on adulthood in-cycle, none at C105. No action.
  docs/plans/2026-07-27-employment-living-system.md:125–175  [x] RESOLVED (S336): capacity-aware hire draw + explicit seeking-work recording.

HISTORY
  77f17734 S399 engine.135 E2+F: business success is the causation (applyEmployerSuccess_ on Growth_Rate; random promotion/layoff/shift/lateral rolls deleted); hood admission bands gate both movers (hoodAdmits_)
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5 (ENGINE-only); 18–21-year-olds keep whatever stage they have
  aa1dce57 S398 engine.135 E1/D5: retirement is an EVENT, never an age (builder, 2026-08-30)
  bb090fa1 S398 engine.135 D5/E1 narrowing: retirement = age ≥65 or Status=Retired (not the stale CareerStage), Tier 1–2 exempt; E1 leaves Status=Retired rows alone
  a2b6d2b1 S398 engine.135 E1/D1/D5: CareerStage derived from age (calendar promotion rolls deleted), WealthLevel 10→12, retired/deceased Income 0
  2942b56b engine: stop civilian career logic from overwriting sports-layer citizens

FILES OPENED
  phase05-citizens/educationCareerEngine.js (definition + full body)
  phase01-config/godWorldEngine2.js (Phase5-EducationCareer and Phase10-ExecuteIntents lines)
  docs/engine/ENGINE_STUB_REVERSE.json (map check)
  docs/engine/SHEETS_MANIFEST.md (tab carve-outs)
  docs/engine/ROLLOUT_PLAN.md (open work search)
  docs/plans/2026-08-29-employment-system-cascade.md
  docs/plans/2026-07-27-employment-living-system.md
  docs/plans/2026-07-18-event-pools-design.md
