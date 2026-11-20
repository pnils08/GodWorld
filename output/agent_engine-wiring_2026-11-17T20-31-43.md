The `ctxMap` doesn't have `workerWake` as a ctx.summary field (since it's not an engine context field). Let me verify the full extent of the module and prepare my final report. Since this is a **non-engine module** (it's in `scripts/`, not in the engine phases), I need to note that clearly in my wiring card. The target `workerWake` is the module `scripts/workerWake.js`, which is outside the engine's phase-based architecture but is a support module called by non-engine orchestration scripts.

Here is the complete wiring card:

---

```
WIRING CARD — workerWake (module)   map: 2026-11-17 / 181 files / 1793 functions

⚠️  NOT AN ENGINE FUNCTION. Target `workerWake` is scripts/workerWake.js, a non-engine support module
    outside phase01-config/godWorldEngine2.js. Called by cron-civic-run.js and cron-work-wake.js.

DEFINITION
  scripts/workerWake.js:3  the worker template (pipeline.110 Task 10; docs/reference/AGENT_BOOT_TEMPLATES.md §3)
  (no version string in file header)

MODULE STRUCTURE (NOT PHASE-BASED)
  This is a Node.js module, not an engine phase function. Exports 24 identifiers:
    Functions:  buildWake, identity, toolsFor, toolExecutor, readRecord, capLines, reportTask, 
                lastReport, neighborhoodRead, sheetRead, memoryRecall, gatherMemory, whoTheyAre, 
                isLean, isBuilt, hasFill, highLow, patrolInForce, askAndWhy, loadMoves, pastDecisions
    Constants:  JOBS (14 role definitions), FILLS (14 worker fills), LIVE (Set of live workers), 
                TOOLS (4 tools array), SHEETS (25 sheet names), LEVER_TOOLS (patrol_set)

PHASE POSITION
  NOT APPLICABLE (module is outside engine phases; no position in godWorldEngine2.js)

CALLERS (<4 direct requires>)
  scripts/cron-civic-run.js:64        const workerWake = require('./workerWake')   [pipeline.110 Task 10]
  scripts/cron-civic-run.js:1775      workerWake.identity(w.officeId || w.projectId, ...)
  scripts/cron-civic-run.js:1776      workerWake.hasFill(o.officeId)
  scripts/cron-civic-run.js:2776      workerWake.hasFill(o.officeId)
  scripts/cron-civic-run.js:2777      workerWake.slugFor(o)
  scripts/cron-civic-run.js:3709      workerWake.hasFill(officeId)
  scripts/cron-civic-run.js:3737      workerWake.buildWake({ officeId, cycle, officeMap, date })
  scripts/cron-civic-run.js:3738      workerWake.toolsFor(office.officeId, {...})
  scripts/cron-civic-run.js:3755      workerWake.toolExecutor({...})
  scripts/cron-civic-run.js:3853      workerWake.hasFill(…) [×2 calls]
  scripts/cron-civic-run.js:3856      workerWake.slugFor(row)
  scripts/cron-civic-run.js:3887      workerWake.buildWake({ officeId, cycle, officeMap, date })
  scripts/cron-civic-run.js:3889      workerWake.toolsFor(…)
  scripts/cron-work-wake.js:317       require('./workerWake').hasFill(of.officeId)
  scripts/cron-work-wake.js:420       !require('./workerWake').hasFill(value.office)
  scripts/workerWake.test.js:8        const ww = require('./workerWake');

KEY EXPORTS BRIEF
  buildWake(opts)          Assemble a worker's wake: office, system prompt, user data, memory, decisions, lean flag
  identity(officeId, map)  Who a worker is: sheet line + gathered memory (used by Sunday hearings)
  toolsFor(officeId, opts) List of tools available to this worker (sheet_read, memory_recall, record_read, neighborhood_read, citizen_lookup, canon_recall, patrol_set)
  toolExecutor(ctx)        Return async fn(name, input) that executes worker tools
  hasFill(officeId)        Boolean: is this worker built AND live
  isBuilt(officeId)        Boolean: does FILLS have this officeId
  isLean(officeId)         Boolean: does JOBS have this officeId (wakes with job task)
  readRecord(title, text, input)  Read one worker record (whole or by Cycle/word match)
  
  JOBS                     Dict of 14 role IDs → job sentences (e.g. CHIEF-FIRE, EMERG-DIR, STAFF-DM-ECON, …)
  FILLS                    Dict of 14 role IDs → async build(cycle, ctx) → {blocks, key}
  LIVE                     Set of live officeIds (currently all 14 built workers)
  SHEETS                   Array of 25 city sheet names workers can read
  TOOLS                    Array of 4 shared tools (sheet_read, citizen_lookup, canon_recall, memory_recall)

DEPENDENCIES
  require('../lib/sheets')      — getRawSheetData, getSheetAsObjects
  require('../lib/citizenPage') — recentPage_, searchPage_
  require('../lib/wakePerception')  — buildPool, loadOfficeHolders, identityLine
  require('../lib/citizenDials') — disposition
  require('./maraDirective')      — blocksFor
  require('./cron-desk-writer')   — toolCitizenLookup, toolCanonRecall
  fs, path                        — file I/O (reading recordKit, simulation snapshot, moves)

WRITE PATH (to sheets)
  NONE DIRECTLY. Module reads sheets; writes are handled by cron-civic-run.js after the wake completes
  (worker replies staged through move gate, agy 2026-11-16 #3: "levered moves staged, never executed in wake")

TABS READ (within recordKit and tool calls)
  Initiative_Tracker, Neighborhood_Map, Oakland_Sports_Feed, Civic_Office_Ledger, Faith_Organizations, 
  Faith_Ledger, Business_Ledger, Transit_Metrics, Neighborhood_Demographics, Care_Justice_Census, 
  Community_Programs, Crime_Metrics, Chaos_Cars, City_Treasury, Judicial_Ledger, WorldEvents_V3_Ledger, 
  Event_Arc_Ledger, Texture_Trigger_Log, Domain_Tracker, Cycle_Weather, Household_Ledger, 
  Employment_Roster, Hospital_Ledger, Ripple_Ledger, Carry_Forward_Store (for crisis arcs)

OPEN WORK
  pipeline.110  (in-progress, engine-sheet)
    Role citizens wake as themselves (builder 11-10). 14 of 14 workers lean and live; next: media (reporter template); council on hold
    See: docs/plans/2026-11-10-role-citizens-wake-as-themselves.md

REVIEWS / RECENT WORK
  714df6458  pipeline.110: agy's re-review folded and closed (SHIP-WITH-FIXES) — 14 workers' 90 records live C116
  248b9c3f4  pipeline.110: police chief onto lean worker — Crime, arrests, patrol records; pack 12,067 → 6,766 chars
  09cdec53d  pipeline.110: agy's review of lean worker build — record reads fixed (newest first, whole rows, notes inside cuts)
  a92d39b20  pipeline.110: lean wake's record stamped worker/2; lastReport takes only worker/2 records
  6a1140995  pipeline.110: city manager onto lean worker — Money, initiatives, services; pack 14,800 → 4,812 chars
  b887818f1  pipeline.110: economic deputy's neighborhood totals carry whole city on own row

HISTORY (git log)
  714df6458  2026-11-17  pipeline.110: agy's re-review folded and closed (SHIP-WITH-FIXES)
  248b9c3f4  2026-11-17  pipeline.110: the police chief onto the lean worker, built
  09cdec53d  2026-11-17  pipeline.110: agy's review of the lean worker build folded
  a92d39b20  2026-11-17  pipeline.110: a report from the build before lean shape is never handed back
  6a1140995  2026-11-16  pipeline.110: the city manager onto the lean worker (builder 2026-11-16)
  b887818f1  2026-11-16  pipeline.110: economic deputy's neighborhood totals carry whole city on row

FILES OPENED
  scripts/workerWake.js (definition, full module read 778 lines)
  scripts/cron-civic-run.js (caller grep)
  scripts/cron-work-wake.js (caller grep)
  scripts/workerWake.test.js (caller grep)
  docs/engine/ROLLOUT_PLAN.md (pipeline.110 entries)
  docs/plans/2026-11-10-role-citizens-wake-as-themselves.md (plan grep)
  docs/plans/2026-11-16-every-saved-word-reaches-the-dials.md (worker template mention)
```

**CONCLUSION:** `workerWake` is not part of the engine's phase-based wiring. It is a support module for the cron-civic-run orchestration harness, building worker agent wakes outside the engine's safePhaseCall_ architecture. The 14 workers (Police Chief, Emergency Director, City Manager, Economic Deputy, etc.) are configured via JOBS and FILLS constants and run on a datawake schedule (Mon–Thu 05:45). All are live as of C116. Engine phases do not call this module.

---

## Coverage (measured by the harness, not claimed by the agent)

- engine phase files in repo: **128**
- opened by this run: **128** (100%)
- never opened: **0**


_agent=engine-wiring model=anthropic/claude-haiku-4.5 provider=openrouter turns=15 toolCalls=30 in=279055 out=5466_
_Any count in the report above that disagrees with this footer is the agent's claim, not a measurement._