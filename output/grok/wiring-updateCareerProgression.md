Perfect! Now I have all the details I need. Let me now assemble the complete wiring card:

```
WIRING CARD — updateCareerProgression_ (function)   map: 2026-08-30 / 183 files / 1187 functions   [NO MAP STALE]

DEFINITION
  phase05-citizens/educationCareerEngine.js:363  function updateCareerProgression_(ctx, cycle, rng)   v2.1

PHASE POSITION
  production entry : Phase5-EducationCareer @ godWorldEngine2.js:375  — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-EducationCareer @ godWorldEngine2.js:2039  — BEFORE Phase10-ExecuteIntents (:2204)

CALLERS (1)
  phase05-citizens/educationCareerEngine.js:149  var careerResults = updateCareerProgression_(ctx, cycle, rng);

CTX FIELDS
  READ  ctx.ledger.headers  @ :365
  READ  ctx.ledger.rows  @ :366
  WRITE ctx.ledger.dirty  @ :465

S FIELDS
  (none accessed by this function)

WRITE PATH
  row[iYearsInCareer] mutation  @ :417  → Simulation_Ledger (via ctx.ledger)
  row[iCareerStage] mutation  @ :451  → Simulation_Ledger (via ctx.ledger)
  ctx.ledger.dirty assignment  @ :465  → signals Phase10-CommitLedger to write
  (no Math.random in function body; helper functions `deriveCareerStageFromAge_`, `careerStageClass_`, `isSportsLayerRow_`, `isEngineClockRow_` called but mutations only via row array)

HELPER CALLS
  deriveCareerStageFromAge_(age, yearsInCareer, currentStage)  @ :449
  careerStageClass_(stage)  @ :442, :457
  isSportsLayerRow_(row, iClockCP, iEconCP)  @ :440
  isEngineClockRow_(row, iClockCP)  @ :440

OPEN WORK
  S398 (S398 engine.135 E1: retirement is an EVENT, never an age)  docs/plans/2026-08-29-employment-system-cascade.md:172–178
  S399 (E2+F bench-proven; employer success causation for promotions/layoffs; `updateCareerProgression_` career stage now DERIVED not rolled)  docs/plans/2026-08-29-employment-system-cascade.md:173

HISTORY
  77f17734  S399 engine.135 E2+F: business success is the causation (applyEmployerSuccess_ on Growth_Rate; random promotion/layoff/shift/lateral rolls deleted)
  cd8ec73c  S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5 (ENGINE-only); 18–21-year-olds keep whatever stage they have
  aa1dce57  S398 engine.135 E1/D5: retirement is an EVENT, never an age (builder, 2026-08-30)
  bb090fa1  S398 engine.135 D5/E1 narrowing: retirement = age ≥65 or Status=Retired (not the stale CareerStage), Tier 1–2 exempt; E1 leaves Status=Retired rows alone
  a2b6d2b1  S398 engine.135 E1/D1/D5: CareerStage derived from age (calendar promotion rolls deleted), WealthLevel 10→12, retired/deceased Income 0
  2942b56b  engine: stop civilian career logic from overwriting sports-layer citizens

FILES OPENED
  phase05-citizens/educationCareerEngine.js
  phase01-config/godWorldEngine2.js
  docs/plans/2026-08-29-employment-system-cascade.md
```

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **136**
- opened by this run: **136** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=16 toolCalls=22 in=267007 out=3859_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._