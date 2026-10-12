WIRING CARD — classifyInitiativeMotion_ (function)   map: 2026-09-21 / 184 files   [map current]

DEFINITION
  phase05-citizens/updateCivicApprovalRatings.js:1047  function classifyInitiativeMotion_(phase, nextActionCycle, cycle, prevPhase) v1.5 (ES5)

PHASE POSITION
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:356  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2105  — BEFORE Phase10-ExecuteIntents (:2330)

CALLERS (9 live + 11 test)
  phase05-citizens/updateCivicApprovalRatings.js:482  motion: classifyInitiativeMotion_(phase, nextActionCycle, cycle, prevPhase)
  scripts/civicApprovalCeiling.test.js:264  A.classifyInitiativeMotion_('construction-planning', 103, 104) === 'silence'
  scripts/civicApprovalCeiling.test.js:265  A.classifyInitiativeMotion_('operational', null, 103) === 'silence'
  scripts/civicApprovalCeiling.test.js:267  A.classifyInitiativeMotion_('disbursement-active', 103, 103) === 'sitting'
  scripts/civicApprovalCeiling.test.js:268  A.classifyInitiativeMotion_('pilot-active', 104, 103) === 'sitting'
  scripts/civicApprovalCeiling.test.js:272  A.classifyInitiativeMotion_('complete', 90, 104, 'operational') === 'completed'
  scripts/civicApprovalCeiling.test.js:273  A.classifyInitiativeMotion_('complete', 90, 104, 'complete') === 'complete-held'
  scripts/civicApprovalCeiling.test.js:274  A.classifyInitiativeMotion_('stalled', 90, 104, null) === 'failed'
  scripts/civicApprovalCeiling.test.js:276  A.classifyInitiativeMotion_('construction-active', 90, 107, 'stalled') === 'sitting'
  scripts/civicApprovalCeiling.test.js:277  A.classifyInitiativeMotion_('construction-active', 107, 107, 'construction-planning') === 'advanced'
  scripts/civicApprovalCeiling.test.js:278  A.classifyInitiativeMotion_('complete', 107, 107, 'blocked') === 'complete-held'
  scripts/civicApprovalCeiling.test.js:474  A.classifyInitiativeMotion_(row.phase, row.next, 105, null) === 'sitting'
  scripts/civicApprovalCeiling.test.js:475  A.classifyInitiativeMotion_(row.phase, row.next, 105, null)
  scripts/civicApprovalCeiling.test.js:482  A.classifyInitiativeMotion_('implementation-active', 105, 105, 'planning') === 'advanced'
  scripts/civicApprovalCeiling.test.js:483  A.classifyInitiativeMotion_('implementation-active', 105, 105, 'implementation-active') === 'sitting'
  scripts/civicApprovalCeiling.test.js:485  A.classifyInitiativeMotion_('implementation-active', 99, 105, 'planning') === 'advanced'
  scripts/civicApprovalCeiling.test.js:486  A.classifyInitiativeMotion_('implementation-active', 99, 105, null) === 'silence'
  scripts/civicApprovalCeiling.test.js:494  A.classifyInitiativeMotion_('complete', 105, 105, 'operational') === 'completed'
  scripts/civicApprovalCeiling.test.js:495  A.classifyInitiativeMotion_('complete', 105, 105, 'complete') === 'complete-held'
  scripts/civicApprovalCeiling.test.js:499  A.classifyInitiativeMotion_('complete', 105, 105, null) === 'complete-held'
  scripts/civicApprovalCeiling.test.js:505  A.classifyInitiativeMotion_('implementation-active', 105, 106, null) === 'silence'
  scripts/civicApprovalCeiling.test.js:528  const m = A.classifyInitiativeMotion_(row.phase, row.next, 105, null)
  scripts/civicApprovalCeiling.test.js:610  A.classifyInitiativeMotion_('implementation-active', 108, 109) === 'silence'

BODY ANALYSIS
  The function is pure: no S. or ctx. fields accessed. It takes four parameters (phase, nextActionCycle, 
  cycle, prevPhase) and returns one of: 'silence', 'sitting', 'advanced', 'completed', 'complete-held', 'failed'.
  
  Core logic (lines 1048-1077):
  - `moved` = prevPhase exists AND differs from current phase (line 1050)
  - `revived` = moved AND prevPhase is failing AND current phase is not failing (line 1054)
  - If revived, move flag is reset to false (line 1055)
  - If current phase is performing (contains 'complete', line 1057), return 'completed' if moved, else 'complete-held'
  - If current phase is failing, return 'failed'
  - If revived, return 'sitting'
  - If moved, return 'advanced'
  - If nextActionCycle is null/undefined/'' or past current cycle, return 'silence'
  - Otherwise return 'sitting'

APPROVAL DELTA LOGIC & IDEMPOTENCY
  Where 'completed' motion is decided: line 1057-1061
    Conditions: (1) isPerforming_(phase) = phase.indexOf('complete') >= 0 (line 998)
                (2) moved = true (only when prevPhase differs from current phase, line 1050)
  
  Where +3 delta is paid: approvalDeltaForInitiative_:1101-1128
    Line 1102-1105: if (motion === 'completed') {
                      if (owns) return { delta: 3, reason: 'completed (+3)' };
                      if (opposed) return { delta: 0, ... };
                      return { delta: 1, ... };
                    }
  
  Idempotency protection (PAID ONLY ONCE):
    - Motion returns 'completed' only when phase CHANGES to complete (moved = true)
    - On second cycle at complete, prevPhase = 'complete', so moved = false → returns 'complete-held'
    - approvalDeltaForInitiative_ at line 1107-1110 for 'complete-held' returns delta: 0, reason: 'complete, already paid (0)'
    - This gate ensures +3 is paid exactly once, on the transition cycle only
    - Engine.213 comment (lines 1057-1061): "Finishing is an EVENT and pays once. Parked at complete is a STATE and pays nothing — this is the C103→95 pin, defused. A row left at `complete` used to score +3 to its owner every cycle, forever."

INITIATIVE_TRACKER COLUMNS READ
  The reader function (lines 435-470) extracts these columns by header lookup:
    - Name (line 435, findApprCol_ 'Name')
    - Status (line 436, 'Status')
    - ImplementationPhase (line 437, 'ImplementationPhase')  — feeds classifyInitiativeMotion_ as 'phase' arg
    - PolicyDomain (line 438, 'PolicyDomain')
    - AffectedNeighborhoods (line 439, 'AffectedNeighborhoods')
    - LeadFaction (line 440, 'LeadFaction')
    - OppositionFaction (line 441, 'OppositionFaction')
    - NextActionCycle (line 442, 'NextActionCycle')  — feeds classifyInitiativeMotion_ as 'nextActionCycle' arg
    - InitiativeID (line 443, 'InitiativeID')
    - ProposingOffice (line 445, 'ProposingOffice')
  
  Does NOT read: Stage, StageBaseline, LastStageChangeCycle. Those columns are present (per SHEETS_MANIFEST.md:155,
  ensureInitiativeStageColumns_ appends them) but not read in this cycle path. They are read by civicInitiativeEngine.js
  in Phase 5 but NOT by updateCivicApprovalRatings_'s tracker reader.

S.initiativePhases WRITE
  Line 982: S.initiativePhases = initiativePhaseMap;
  Engine.139 comment: "Phase 9 carries it forward"
  Built at lines 451-469: for each initiative row, initiativePhaseMap[initKey] = phase
  Used to detect transitions next cycle via S.previousCycleState.initiativePhases (line 453)

S FIELDS TOUCHED IN ENCLOSING FUNCTION updateCivicApprovalRatings_
  WRITE:
    previousCycleState (line 452 — read-only in this context; set by Phase 1 loadPreviousCycleState_)
    approvalHoodMoodEma @ :496
    approvalChanges @ :931
    approvalCeilingEvents @ :678
    officeDepartures @ :797
    civicCampaigns @ :696
    storyHooks @ :676, :677, :739, :740, :811, :812
    approvalNeighborhoodEffects @ :891, :902, :903, :905, :906
    initiativePhases @ :982
    approvalTriggers @ :932
  
  READ:
    neighborhoodState (line 157, via cityStateMiddle_ and districtStateScore_)
    editionDomainBalance (line 492)
    cycleId / absoluteCycle (line 326)
    previousCycleState (line 403, 452)
    approvalHoodMoodEma (line 496, then read by subsequent functions)

OTHER CTX
  ctx.summary @ :987 (assignment)
  ctx.config.cycleCount @ :326

MOTION_LADDERS_ & APPROVAL DELTA APPLICATION
  Ladders (lines 1091-1095):
    silence:  { owned: [-3, -2, -1], nearby: [-2, -1] }
    sitting:  { owned: [],           nearby: [] }
    advanced: { owned: [2, 1, 1],    nearby: [1, 1] }
  
  Applied in updateCivicApprovalRatings_ lines 620-634:
  - Called at line 606: approvalDeltaForInitiative_(init.motion, owns, opposedByFaction)
  - If motion has a ladder (line 620), dimming is applied per rung (lines 621-629)
  - If no ladder (completed/complete-held/failed), full delta is applied (line 632)

WRITE PATH
  Intent calls: None in classifyInitiativeMotion_ itself (pure function)
  In updateCivicApprovalRatings_:
    Line 723: queueCellIntent_(ctx, ledgerName, li + 1, iApproval + 1, newApproval);
              (Civic_Office_Ledger approval column write via intent queue)
  Direct writes: None in Phase 5 (approval writes queued, executed in Phase 10)

TABS
  Initiative_Tracker
    Writers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_
             phase05-citizens/civicInitiativeEngine.js::createInitiative_
             phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_
    Readers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_
             phase05-citizens/civicInitiativeEngine.js (multiple functions)
             phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_
    Manifest: docs/engine/SHEETS_MANIFEST.md:34 (description); :155 (schema detail)
  
  Civic_Office_Ledger
    Writers: phase05-citizens/generationalWealthEngine.js::updateHeritage_
             phase05-citizens/runCivicElectionsv1.js::runCivicElections_
             phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_ (approval + ceiling writes)
    Readers: Multiple (engine.94 contract, business dynamics, civic initiative, media, elections)
    Manifest: docs/engine/SHEETS_MANIFEST.md:32 (description); :159 (update note)

OPEN WORK
  docs/plans/2026-08-31-c105-chase-sessions.md:83
    "What 'sitting' actually measures" — explains that `classifyInitiativeMotion_` takes only current phase + NextActionCycle, no prior-cycle comparison, so advancement is structurally invisible by design. Ruling pinned in function comment.
  
  docs/plans/2026-09-19-civic-wake-game-loop.md:43
    "Approval: `classifyInitiativeMotion_` pays `advanced` +2 / `completed` +3 once each (updateCivicApprovalRatings.js:1037-1097); sitting is free since engine.213 (S455) — `MOTION_LADDERS_.sitting = []` (:1072-1076) — only silence drains (−3 owned/−2 nearby, :597-606)."
  
  docs/plans/2026-09-19-civic-wake-game-loop.md:155
    Ruling on failed motion stall clock: `isFailing_` already counts `stalled`; `classifyInitiativeMotion_` returns `failed` for it and `approvalDeltaForInitiative_` pays owner −2 every cycle (negatives are conditions, engine.139).
  
  docs/plans/2026-09-19-civic-wake-game-loop.md:295
    "Task 4 engine rulings, ruling 2: `classifyInitiativeMotion_` reads a blank or past `NextActionCycle` as `silence` (owner −3 ladder)."
  
  docs/plans/2026-09-19-civic-wake-game-loop.md:324
    "A staged row has one clock... `classifyInitiativeMotion_` takes a `staged` flag" (future enhancement — staged rows skip NextActionCycle for motion calculation).

HISTORY
  95b67423  civic.38 Task 5: the sponsor owns its bill; a revival from a failing phase is sitting, not advanced
  ea3fda33  S463 engine.231: the raw-carried hook reaches a desk and a journalist — Phase-5 hooks
  c37d85ea  engine.213d: the poll answers from a season — smoothed hood mood carried across Cycles
  548fe09d  engine.213c: the mood is absolute, the middle only orders — a poor/under-construction district
  935b820c  engine.213b: approval is a LEVEL the city sets — target = base + district vs middle + city level
  35a087a7  engine.213: approval reads the city — district vs city middle, city level, every desk's press

FILES OPENED
  phase05-citizens/updateCivicApprovalRatings.js
  phase01-config/godWorldEngine2.js
  docs/engine/ENGINE_STUB_REVERSE.json
  docs/engine/SHEETS_MANIFEST.md
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-08-31-c105-chase-sessions.md
  docs/plans/2026-09-19-civic-wake-game-loop.md
  docs/research/2026-09-21-codex-civic38-task4-premortem.md
  scripts/civicApprovalCeiling.test.js
