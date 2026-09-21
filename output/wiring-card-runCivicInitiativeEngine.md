WIRING CARD — runCivicInitiativeEngine_ (function)   map: 2026-09-20 / 184 files   

DEFINITION
  phase05-citizens/civicInitiativeEngine.js:91  function runCivicInitiativeEngine_(ctx)   v1.9 (2026-05-03, S199 G-R11)

PHASE POSITION
  production entry : Phase5-Initiatives @ godWorldEngine2.js:355  — BEFORE Phase5-ApprovalRatings (356) and Phase5-BusinessDynamics (360), BEFORE Phase10-ExecuteIntents (595)
  cycle-phases     : Phase5-Initiatives @ godWorldEngine2.js:2104  — BEFORE Phase5-ApprovalRatings (2105) and Phase5-BusinessDynamics (2109), BEFORE Phase10-ExecuteIntents (2330)

CALLERS (2)
  phase01-config/godWorldEngine2.js:355  safePhaseCall_(ctx, 'Phase5-Initiatives', function() { runCivicInitiativeEngine_(ctx); });
  phase01-config/godWorldEngine2.js:2104  safePhaseCall_(ctx, 'Phase5-Initiatives', function() { runCivicInitiativeEngine_(ctx); });

S FIELDS
  WRITE initiativeEvents   @ :118,377   readers: phase05-citizens/generateCitizensEvents.js::generateCitizensEvents_, phase05-citizens/generateCivicModeEvents.js::generateCivicModeEvents_, phase07-evening-media/storyHook.js::storyHookEngine_, utilities/exportCycleArtifacts.js::buildCycleContextPack_
  WRITE votesThisCycle     @ :119,387   readers: phase05-citizens/generateCivicModeEvents.js::generateCivicModeEvents_, phase05-citizens/generateMediaModeEvents.js::generateMediaModeEvents_, phase07-evening-media/storyHook.js::storyHookEngine_, utilities/exportCycleArtifacts.js::buildContinuityHints_, utilities/exportCycleArtifacts.js::buildCycleContextPack_
  WRITE grantsThisCycle    @ :120,395   readers: phase05-citizens/generateCivicModeEvents.js::generateCivicModeEvents_, phase05-citizens/generateMediaModeEvents.js::generateMediaModeEvents_, utilities/exportCycleArtifacts.js::buildCycleContextPack_
  WRITE civicDemographicContext @ :533   readers: (none)   [ORPHAN?]
  READ  cycleId            @ :102      writers: phase01-config/godWorldEngine2.js::runCyclePhases_, phase01-config/godWorldEngine2.js::runWorldCycle
  READ  cityDynamics       @ :108,1446,1680,1765,2082   writers: phase02-world-state/applyCityDynamics.js::applyCityDynamics_, phase05-citizens/civicInitiativeEngine.js::applyActiveInitiativeRipples_, phase05-citizens/civicInitiativeEngine.js::applyInitiativeConsequences_, phase05-citizens/civicInitiativeEngine.js::applyNeighborhoodRipple_

OTHER CTX
  ctx.ss (Sheets object) @ :93,99
  ctx.summary (S alias) @ :101,530
  ctx.config @ :102
  ctx.now @ :278,365,445,452,519,2896
  ctx.rng @ :95
  ctx.ledger @ :729
  ctx.writeIntents (checked in createInitiative_) @ :2815

WRITE PATH
  DIRECT  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows) @ :526 → Initiative_Tracker (cycle path, after Phase10 is NOT executed, resolves after applyEngineClockHold_ may hold/clear clocks)
  Math.random @ :2120   (in manualRunVote_, outside cycle; noted as fallback for ctx.rng unavailability)
  DIRECT  sheet.getRange(targetRow + 2, 1, 1, row.length).setValues([row]) @ :2148   (manualRunVote_ manual vote execution)

TRACKER COLUMNS RESOLVED
  Required (abort if missing):
    InitiativeID (idx 134), Name (idx 135), Type (idx 136), Status (idx 137), VoteCycle (idx 140),
    VoteRequirement (idx 139), Projection (idx 141), LeadFaction (idx 142), OppositionFaction (idx 143),
    SwingVoter (idx 144), Outcome (idx 147), Consequences (idx 148), LastUpdated (idx 150)
  
  Optional (checked with >= 0, skipped if missing):
    SwingVoter2 (idx 145, v1.1), SwingVoter2Lean (idx 146, v1.1),
    AffectedNeighborhoods (idx 151, v1.3), PolicyDomain (idx 152, v1.6),
    MayoralAction (idx 153, v1.7), MayoralActionCycle (idx 154, v1.7),
    VetoReason (idx 155, v1.7), OverrideVoteCycle (idx 156, v1.7),
    OverrideOutcome (idx 157, v1.7), ImplementationPhase (idx 158, v1.9),
    NextActionCycle (idx 159, v1.9)

NEXTACTIONCYCLE WIRING
  Column lookup @ :159  (optional, checked >= 0 at line 266)
  Read from row[iNextActionCycle] @ :268  (in v1.9 phase-transition reschedule, line 265-293)
  Write to row[iVoteCycle] = nextCycle @ :276  (reschedule vote to future cycle when status='visioning-complete' + ImplementationPhase='vote-ready')
  Write by applyEngineClockHold_ @ :224,302  (holds clock to cycle+1 for rows engine cannot advance; clearable by civic chain)
    - applyEngineClockHold_ @ :2890  modifies row[iNextActionCycle] @ :2894 (holds to cycle+1)
    - engineClockHold_ @ :2917  pure logic for hold/clear/expire verdicts; parses ENGINE_CLOCK_RE_ marker; grace count in Notes

IMPLEMENTATIONPHASE WIRING
  Column lookup @ :158  (optional, checked >= 0 at line 266)
  Read from row[iImplementationPhase] @ :267  (in v1.9 phase-transition reschedule)
  Comparison triggering reschedule @ :265  (status='visioning-complete' + ImplementationPhase='vote-ready' + NextActionCycle >= cycle)
  Written by offline civic chain (scripts/applyTrackerUpdates.js) per doc §2858-2860; engine reads only

STATUS WRITES (all DIRECT to Initiative_Tracker via setValues)
  @ :239  row[iStatus] = 'pending-vote'  (delayed initiatives retry as pending-vote)
  @ :277  row[iStatus] = 'active'  (v1.9 reschedule bump: visioning-complete → active when vote-ready)
  @ :362  row[iStatus] = result.status  (vote/grant resolution outcome: passed/failed/delayed)
  @ :407  row[iStatus] = 'vetoed'  (v1.7 mayoral veto)
  @ :444  row[iStatus] = 'active'  (proposed auto-advance: voteCycle - cycle <= 3)
  @ :451  row[iStatus] = 'pending-vote'  (active auto-advance: voteCycle === cycle + 1)
  @ :480  row[iStatus] = 'override-passed'  (v1.7 override vote passed)
  @ :505  row[iStatus] = 'override-failed'  (v1.7 override vote failed, veto upheld)

TABS
  Initiative_Tracker  writers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, phase05-citizens/civicInitiativeEngine.js::createInitiative_, phase05-citizens/civicInitiativeEngine.js::runCivicInitiativeEngine_ (direct line 526), phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_
               readers: phase02-world-state/applyInitiativeImplementationEffects.js::applyInitiativeImplementationEffects_, phase05-citizens/civicInitiativeEngine.js (multiple), phase05-citizens/updateCivicApprovalRatings.js::updateCivicApprovalRatings_, utilities/cycleRollback.js
  manifest: docs/engine/SHEETS_MANIFEST.md:155  (own-tab; tab created by seedInitiativeTracker_() menu function; engine.119 guards against runtime create)

CLOCK HOLD MECHANISM (v2.0 engine.138 / G-PF33)
  Lines 296-305, 2890-2911, 2917-2954: ImplementationPhase and NextActionCycle written by offline civic chain (Sundays 30 14 * * 0);
  engine applies clock hold for rows it cannot advance (no in-engine path to move, waiting on chain);
  bounded by ENGINE_CLOCK_GRACE_ = 3 cycles; marker recorded in Notes column as [ENGINE-CLOCK n=N from=CX];
  grace exhausted after 3 consecutive uncovered cycles → released to silence.
  Runs AFTER v1.9 reschedule, BEFORE vote trigger, so status/voteCycle reflect any bump; skipped for rows engine is about to resolve.

OPEN WORK
  civic.38  row 169  Civic game board — build plan filed: closed move set + Sunday-gated write path, 3-stage initiatives with losing clock, petitions from condition data, Mara confrontation, rota split
  engine.251  row 146  Housing lever: tenant rent relief carried on the initiative bus into the Household_Ledger writer; after civic.38 Task 4 step 1; wiring card + pre-mortem before the cut
  
  Plan docs:
    docs/plans/2026-09-19-civic-wake-game-loop.md (civic.38 primary plan)
    docs/plans/2026-09-20-housing-lever.md (engine.251 depends on civic.38 Task 4)

HISTORY
  ea3fda33  S463 engine.231: the raw-carried hook reaches a desk and a journalist — Phase-5 hooks go through makeHook's own match path
  3b8b51b4  S428 engine.119 Wave A — the cycle never creates a tab; the C104 crash site gets retry; pre-mortem diffs required tabs against the sheet
  5276f30a  S410 [engine-sheet] G-PF33 v2.1 — passed+signed rows are held before the skip (builder call): applyEngineClockHold_ shared
  3d0ebed1  S409 [engine-sheet] G-PF33 hold: its own stamp is not a chain re-arm — grace now accrues; bench-proven C108–C110
  c0fb250c  S406 [engine-sheet] G-PF33 — the engine holds the clock it cannot wind, for three cycles
  6233f4f4  S406 [engine-sheet] S-A follow-up — guard the Examined counter against blank rows

FILES OPENED
  phase05-citizens/civicInitiativeEngine.js (function body + header-index logic)
  phase01-config/godWorldEngine2.js (phase order + entry points)
  docs/engine/ENGINE_STUB_REVERSE.json (field map + writers/readers)
  docs/engine/SHEETS_MANIFEST.md (tab writers + carve-outs)
  docs/engine/ROLLOUT_PLAN.md (open work rows)
