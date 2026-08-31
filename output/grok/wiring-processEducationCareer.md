Now let me finalize the wiring card. Based on my investigation:

1. The main function `processEducationCareer_` (lines 124-185) does NOT directly read or write S. fields
2. It does NOT directly write to sheets
3. It calls helper functions which may do those things
4. The main function reads: ctx.ledger, ctx.ss, ctx.summary.cycleId, ctx.config.cycleCount
5. The helper functions it calls handle the actual S field writes and sheet writes

For the wiring card of the MAIN FUNCTION, I should only report what the main function itself does, not its helpers:

```
WIRING CARD — processEducationCareer_ (function)   map: 2026-08-30 / 183 files   [OK]

DEFINITION
  phase05-citizens/educationCareerEngine.js:124  function processEducationCareer_(ctx) { … }     v2.1

PHASE POSITION
  production entry : Phase5-EducationCareer @ godWorldEngine2.js:375   — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-EducationCareer @ godWorldEngine2.js:2039  — BEFORE Phase10-ExecuteIntents (:2204)

CALLERS (2)
  phase01-config/godWorldEngine2.js:375  processEducationCareer_(ctx)
  phase01-config/godWorldEngine2.js:2039  processEducationCareer_(ctx)

S FIELDS
  (none read/written in function body)

OTHER CTX
  ctx.ledger @ :126   (READ — guard check for initialization)
  ctx.ss @ :131   (READ — passed to helper functions)
  ctx.summary @ :132   (READ — cycleId fallback)
  ctx.config @ :132   (READ — cycleCount fallback)
  ctx.rng via safeRand_ @ :129

WRITE PATH
  (no direct intents or writes in function body; delegated to helper functions)

TABS
  (no direct sheet access in function body; delegated to helper functions)

OPEN WORK
  docs/plans/2026-07-18-event-pools-design.md:351  educationCareerEngine.js — processEducationCareer_ (7 steps)

HISTORY
  77f17734 S399 engine.135 E2+F: business success is the causation (applyEmployerSuccess_ on Growth_Rate; random promotion/layoff/shift/lateral rolls deleted); hood admission bands gate both movers (hoodAdmits_)
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5 (ENGINE-only); 18–21-year-olds keep whatever stage they have
  aa1dce57 S398 engine.135 E1/D5: retirement is an EVENT, never an age (builder, 2026-08-30)
  bb090fa1 S398 engine.135 D5/E1 narrowing: retirement = age ≥65 or Status=Retired (not the stale CareerStage), Tier 1–2 exempt; E1 leaves Status=Retired rows alone
  a2b6d2b1 S398 engine.135 E1/D1/D5: CareerStage derived from age (calendar promotion rolls deleted), WealthLevel 10→12, retired/deceased Income 0
  2942b56b engine: stop civilian career logic from overwriting sports-layer citizens

FILES OPENED
  phase05-citizens/educationCareerEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-07-18-event-pools-design.md
```

---

WIRING CARD — processEducationCareer_ (function)   map: 2026-08-30 / 183 files   [OK]

DEFINITION
  phase05-citizens/educationCareerEngine.js:124  function processEducationCareer_(ctx) { … }     v2.1

PHASE POSITION
  production entry : Phase5-EducationCareer @ godWorldEngine2.js:375   — BEFORE Phase10-ExecuteIntents (:563)
  cycle-phases     : Phase5-EducationCareer @ godWorldEngine2.js:2039  — BEFORE Phase10-ExecuteIntents (:2204)

CALLERS (2)
  phase01-config/godWorldEngine2.js:375  processEducationCareer_(ctx)
  phase01-config/godWorldEngine2.js:2039  processEducationCareer_(ctx)

S FIELDS
  (none read/written in function body)

OTHER CTX
  ctx.ledger @ :126   (READ — guard check)
  ctx.ss @ :131   (READ — passed to helpers)
  ctx.summary @ :132   (READ — cycleId)
  ctx.config @ :132   (READ — cycleCount fallback)

WRITE PATH
  (no direct writes in function body; delegated to helpers)

TABS
  (no direct sheet access in function body; delegated to helpers)

OPEN WORK
  docs/plans/2026-07-18-event-pools-design.md:351  educationCareerEngine.js — processEducationCareer_ (7 steps)

HISTORY
  77f17734 S399 engine.135 E2+F: business success is the causation (applyEmployerSuccess_ on Growth_Rate; random promotion/layoff/shift/lateral rolls deleted); hood admission bands gate both movers (hoodAdmits_)
  cd8ec73c S398 engine.135: GAME/CIVIC/MEDIA rows are outside E1/D3/D5 (ENGINE-only); 18–21-year-olds keep whatever stage they have
  aa1dce57 S398 engine.135 E1/D5: retirement is an EVENT, never an age (builder, 2026-08-30)
  bb090fa1 S398 engine.135 D5/E1 narrowing: retirement = age ≥65 or Status=Retired (not the stale CareerStage), Tier 1–2 exempt; E1 leaves Status=Retired rows alone
  a2b6d2b1 S398 engine.135 E1/D1/D5: CareerStage derived from age (calendar promotion rolls deleted), WealthLevel 10→12, retired/deceased Income 0
  2942b56b engine: stop civilian career logic from overwriting sports-layer citizens

FILES OPENED
  phase05-citizens/educationCareerEngine.js
  phase01-config/godWorldEngine2.js
  docs/engine/SHEETS_MANIFEST.md
  docs/plans/2026-07-18-event-pools-design.md

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **136**
- opened by this run: **136** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=25 toolCalls=34 in=780743 out=6499_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._