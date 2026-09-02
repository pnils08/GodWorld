WIRING CARD — deriveEducationLevels_ (function)   map: 2026-09-02 / 186 files   [STABLE]

DEFINITION
  phase05-citizens/educationCareerEngine.js:192  function deriveEducationLevels_(ctx, rng)  v2.1

PHASE POSITION
  production entry : Phase5-EducationCareer @ godWorldEngine2.js:375  — BEFORE Phase10-ExecuteIntents (:573)
  cycle-phases     : Phase5-EducationCareer @ godWorldEngine2.js:2106 — BEFORE Phase10-ExecuteIntents (:2290)

CALLERS (1)
  phase05-citizens/educationCareerEngine.js:145  deriveEducationLevels_(ctx, rng)

CTX FIELDS
  READ  ctx.ledger.headers          @ :194
  READ  ctx.ledger.rows             @ :195
  READ  ctx.summary.cycleId         @ :210
  WRITE ctx.ledger.dirty            @ :263

WRITE PATH
  DIRECT  row[iEducation] = eduLevel @ :258  → Simulation_Ledger
  
  stampPromotion_ (called from within body lines 279–301; indirect queueAppendIntent_)
  INTENT  queueAppendIntent_(ctx, 'LifeHistory_Log', [...]) @ :293 → LifeHistory_Log

LEDGER COLUMNS (Simulation_Ledger)
  WRITE  EducationLevel         @ :199, :258
  READ   UNI (y/n)              @ :200, :225
  READ   MED (y/n)              @ :201, :235
  READ   CIV (y/n)              @ :202, :239
  READ   LifeHistory            @ :203, :228, :241
  READ   Status                 @ :204, :215
  READ   BirthYear              @ :205, :229

WRITERS OF EducationLevel (repo-wide)
  deriveEducationLevels_            @ phase05-citizens/educationCareerEngine.js:258
  processAdvancementIntake_         @ phase05-citizens/processAdvancementIntake.js:705 (Phase5-Advancement, BEFORE this function)

TABS
  Simulation_Ledger  WRITE (direct row mutation via ctx.ledger.rows array)  SHEETS_MANIFEST.md:12
  LifeHistory_Log    INTENT write via queueAppendIntent_ (line 293 in stampPromotion_)  SHEETS_MANIFEST.md:38

OPEN WORK
  ROLLOUT_PLAN.md:22  "Builder ruling: career mobility waits on EDUCATION — do not widen E3. Build order: families → households → business cascade → tier work → education"

HISTORY
  77f17734  S399 engine.135 E2+F: business success is the causation...
  cd8ec73c  S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5...
  aa1dce57  S398 engine.135 E1/D5: retirement is an EVENT, never an age...
  bb090fa1  S398 engine.135 D5/E1 narrowing: retirement = age ≥65...
  a2b6d2b1  S398 engine.135 E1/D1/D5: CareerStage derived from age...
  2942b56b  engine: stop civilian career logic from overwriting sports-layer citizens

FILES OPENED
  phase05-citizens/educationCareerEngine.js:1–267
  phase01-config/godWorldEngine2.js:375, 573, 2106, 2290
  docs/engine/SHEETS_MANIFEST.md:12, 38
  docs/engine/ROLLOUT_PLAN.md:22
