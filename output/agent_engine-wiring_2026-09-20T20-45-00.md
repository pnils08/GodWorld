WIRING CARD — updateCivicApprovalRatings_ (function)   map: 2026-09-20 / 184 files   [not stale]

DEFINITION
  phase05-citizens/updateCivicApprovalRatings.js:363  function updateCivicApprovalRatings_(ctx) — v1.0, engine.213, engine.139, engine.178

PHASE POSITION
  production entry : Phase5-ApprovalRatings @ godWorldEngine2.js:356  — BEFORE Phase10-ExecuteIntents (:595)
  cycle-phases     : Phase5-ApprovalRatings @ godWorldEngine2.js:2105 — BEFORE Phase10-ExecuteIntents (:2330)

CALLERS (5)
  phase01-config/godWorldEngine2.js:356  — safePhaseCall_(ctx, 'Phase5-ApprovalRatings', function() { updateCivicApprovalRatings_(ctx); })
  phase01-config/godWorldEngine2.js:2105 — safePhaseCall_(ctx, 'Phase5-ApprovalRatings', function() { updateCivicApprovalRatings_(ctx); })
  scripts/civicApprovalCeiling.test.js:223  — A.updateCivicApprovalRatings_(ctx)
  scripts/civicApprovalCeiling.test.js:248  — A.updateCivicApprovalRatings_(missingHeaderCtx)
  scripts/civicApprovalState.test.js:205  — A.updateCivicApprovalRatings_(ctx)

SUB-FUNCTION CALLERS
  classifyInitiativeMotion_
    phase05-citizens/updateCivicApprovalRatings.js:479  — classifyInitiativeMotion_(phase, nextActionCycle, cycle, prevPhase)
    scripts/civicApprovalCeiling.test.js:264  — A.classifyInitiativeMotion_('construction-planning', 103, 104)
    scripts/civicApprovalCeiling.test.js:265  — A.classifyInitiativeMotion_('operational', null, 103)
    scripts/civicApprovalCeiling.test.js:267  — A.classifyInitiativeMotion_('disbursement-active', 103, 103)
    scripts/civicApprovalCeiling.test.js:268  — A.classifyInitiativeMotion_('pilot-active', 104, 103)
    scripts/civicApprovalCeiling.test.js:272  — A.classifyInitiativeMotion_('complete', 90, 104, 'operational')
    scripts/civicApprovalCeiling.test.js:273  — A.classifyInitiativeMotion_('complete', 90, 104, 'complete')
    scripts/civicApprovalCeiling.test.js:274  — A.classifyInitiativeMotion_('stalled', 90, 104, null)
    scripts/civicApprovalCeiling.test.js:470  — A.classifyInitiativeMotion_(row.phase, row.next, 105, null)
    scripts/civicApprovalCeiling.test.js:478  — A.classifyInitiativeMotion_('implementation-active', 105, 105, 'planning')
    scripts/civicApprovalCeiling.test.js:479  — A.classifyInitiativeMotion_('implementation-active', 105, 105, 'implementation-active')
    scripts/civicApprovalCeiling.test.js:481  — A.classifyInitiativeMotion_('implementation-active', 99, 105, 'planning')
    scripts/civicApprovalCeiling.test.js:482  — A.classifyInitiativeMotion_('implementation-active', 99, 105, null)
    scripts/civicApprovalCeiling.test.js:490  — A.classifyInitiativeMotion_('complete', 105, 105, 'operational')
    scripts/civicApprovalCeiling.test.js:491  — A.classifyInitiativeMotion_('complete', 105, 105, 'complete')
    scripts/civicApprovalCeiling.test.js:495  — A.classifyInitiativeMotion_('complete', 105, 105, null)
    scripts/civicApprovalCeiling.test.js:501  — A.classifyInitiativeMotion_('implementation-active', 105, 106, null)
    scripts/civicApprovalCeiling.test.js:524  — A.classifyInitiativeMotion_(row.phase, row.next, 105, null)
    scripts/civicApprovalCeiling.test.js:606  — A.classifyInitiativeMotion_('implementation-active', 108, 109)

  approvalDeltaForInitiative_
    phase05-citizens/updateCivicApprovalRatings.js:596  — approvalDeltaForInitiative_(init.motion, owns, opposedByFaction)
    scripts/civicApprovalCeiling.test.js:276  — A.approvalDeltaForInitiative_('completed', true, false).delta
    scripts/civicApprovalCeiling.test.js:277  — A.approvalDeltaForInitiative_('complete-held', true, false).delta
    scripts/civicApprovalCeiling.test.js:278  — A.approvalDeltaForInitiative_('advanced', true, false).delta
    scripts/civicApprovalCeiling.test.js:279  — A.approvalDeltaForInitiative_('failed', false, true).delta
    scripts/civicApprovalCeiling.test.js:281  — A.approvalDeltaForInitiative_('sitting', true, false).delta
    scripts/civicApprovalCeiling.test.js:282  — A.approvalDeltaForInitiative_('silence', true, false).delta
    scripts/civicApprovalCeiling.test.js:283  — A.approvalDeltaForInitiative_('sitting', false, false).delta
    scripts/civicApprovalCeiling.test.js:284  — A.approvalDeltaForInitiative_('silence', false, false).delta
    scripts/civicApprovalCeiling.test.js:285  — A.approvalDeltaForInitiative_('silence', false, false).delta
    scripts/civicApprovalCeiling.test.js:287  — A.approvalDeltaForInitiative_('silence', true, false).delta
    scripts/civicApprovalCeiling.test.js:288  — A.approvalDeltaForInitiative_('failed', true, false).delta
    scripts/civicApprovalCeiling.test.js:289  — A.approvalDeltaForInitiative_('failed', true, false).delta
    scripts/civicApprovalCeiling.test.js:290  — A.approvalDeltaForInitiative_('sitting', true, false).delta
    scripts/civicApprovalCeiling.test.js:296  — A.approvalDeltaForInitiative_(i.motion, true, false).delta
    scripts/civicApprovalCeiling.test.js:302  — A.approvalDeltaForInitiative_(i.motion, true, false).delta
    scripts/civicApprovalCeiling.test.js:492  — A.approvalDeltaForInitiative_('completed', true, false).delta
    scripts/civicApprovalCeiling.test.js:493  — A.approvalDeltaForInitiative_('complete-held', true, false).delta
    scripts/civicApprovalCeiling.test.js:498  — A.approvalDeltaForInitiative_('sitting', true, false).delta
    scripts/civicApprovalCeiling.test.js:499  — A.approvalDeltaForInitiative_('sitting', false, false).delta
    scripts/civicApprovalCeiling.test.js:505  — A.approvalDeltaForInitiative_('advanced', true, false).delta
    scripts/civicApprovalCeiling.test.js:506  — A.approvalDeltaForInitiative_('advanced', false, false).delta
    scripts/civicApprovalCeiling.test.js:508  — A.approvalDeltaForInitiative_('advanced', false, true).delta
    scripts/civicApprovalState.test.js:160  — A.approvalDeltaForInitiative_('sitting', true, false).delta

  isFailing_
    phase05-citizens/updateCivicApprovalRatings.js:1048  — isFailing_(phase)
    scripts/civicApprovalCeiling.test.js:262  — A.isFailing_('stalled'), A.isFailing_('blocked'), A.isFailing_('operational')

  isPerforming_
    phase05-citizens/updateCivicApprovalRatings.js:1042  — isPerforming_(phase)
    scripts/civicApprovalCeiling.test.js:254  — A.isPerforming_('complete')
    scripts/civicApprovalCeiling.test.js:255  — A.isPerforming_('operational')
    scripts/civicApprovalCeiling.test.js:256  — A.isPerforming_('disbursement-active')
    scripts/civicApprovalCeiling.test.js:257  — A.isPerforming_('construction-active')
    scripts/civicApprovalCeiling.test.js:258  — A.isPerforming_('pilot-active')
    scripts/civicApprovalCeiling.test.js:259  — A.isPerforming_('construction-planning')
    scripts/civicApprovalCeiling.test.js:260  — A.isPerforming_('visioning-complete')
    scripts/civicApprovalCeiling.test.js:485  — A.isPerforming_('implementation-active')
    scripts/civicApprovalCeiling.test.js:486  — A.isPerforming_('construction-complete')

S FIELDS
  WRITE  approvalChanges        @ :367, 970   readers: [none]                                           [ORPHAN]
  WRITE  approvalCeilingEvents  @ :368, 717   readers: updateCivicApprovalRatings_ (:717 self-read)
  WRITE  officeDepartures       @ :369, 836   readers: updateCivicApprovalRatings_ (:836 self-read)
  WRITE  civicCampaigns         @ :370, 735   readers: updateCivicApprovalRatings_ (:735 self-read)
  WRITE  approvalHoodMoodEma    @ :493        readers: cityStateScore_ (:no source), moodLevelOf_ (:no source), finalizeCycleState_ (phase09-digest/finalizeCycleState.js)
  WRITE  approvalNeighborhoodEffects @ :930, 941-945  readers: applyCityDynamics_ (phase02-world-state/applyCityDynamics.js), updateCivicApprovalRatings_ (self-read), finalizeCycleState_ (phase09-digest/finalizeCycleState.js), initRipple (phase09-digest/finalizeCycleState.test.js)
  WRITE  approvalTriggers       @ :971        readers: [none]                                           [ORPHAN]
  WRITE  initiativePhases       @ :972        readers: finalizeCycleState_ (phase09-digest/finalizeCycleState.js) — engine.139 carry-forward per comment :427-428
  WRITE  storyHooks             @ :715, 778, 850  readers: [many: 26 writers, 28 readers — see sFields map]
  READ   absoluteCycle          @ :375        writers: [no standard writers in ENGINE_STUB_REVERSE]
  READ   cycleId                @ :375        writers: [no standard writers in ENGINE_STUB_REVERSE]
  READ   editionDomainBalance   @ :489        writers: applyEditionCoverageEffects_ (phase02-world-state/applyEditionCoverageEffects.js)
  READ   neighborhoodState      @ :500        writers: loadNeighborhoodState_ (phase02-world-state/loadNeighborhoodState.js)

OTHER CTX
  ctx.ss              @ :377  (sheet service)
  ctx.mode            @ :380  (dryRun flag)
  ctx.config.cycleCount @ :375  (fallback for cycle if S.absoluteCycle/S.cycleId absent)
  ctx.rng             @ :374  (safeRand_)
  ctx.ledger          @ :506  (seedOccupiedPopIds_)
  ctx.summary = S     @ :365, 977  (ctx alias)

WRITE PATH
  INTENT  queueCellIntent_(ctx, 'Civic_Office_Ledger', c.row, iApproval + 1, c.newApproval, …) @ :910
  INTENT  queueCellIntent_(ctx, 'Civic_Office_Ledger', cw.row, cw.col, cw.value, …) @ :918
  [DIRECT] recordHookRipple_(ctx, 'approval-ceiling', hook, 'updateCivicApprovalRatings') @ :719
  [DIRECT] recordHookRipple_(ctx, 'challenger-campaign', campHook, 'updateCivicApprovalRatings') @ :781
  [DIRECT] recordHookRipple_(ctx, seating ? 'demotion' : 'left-office', leaveHook, 'updateCivicApprovalRatings') @ :853
  [DIRECT] recordRipple_(ctx, { causeType: 'approval-shift', … }) @ :951
  Math.random — NOT PRESENT (uses ctx.rng instead via safeRand_ :374)

TABS
  Civic_Office_Ledger  writers: generationalWealthEngine_, runCivicElectionsv1_, updateCivicApprovalRatings_  readers: [17 total — engine94SheetContract, applyBusinessDynamics, civicInitiativeEngine, generateCivicModeEvents, generationalWealthEngine, runCivicElectionsv1, updateCivicApprovalRatings, updateCivicLedgerFactions, buildCyclePacket, cycleRollback, exportCitizensSnapshot, setupCivicLedgerColumns]  manifest: docs/engine/SHEETS_MANIFEST.md:159
  Initiative_Tracker    writers: applyInitiativeImplementationEffects_, civicInitiativeEngine_, updateCivicApprovalRatings_  readers: [15 total — applyInitiativeImplementationEffects, applyBusinessDynamics.test, civicInitiativeEngine (×5), updateCivicApprovalRatings, compileHandoff, cycleRollback (×3), setupInitiativeTrackerValidation]  manifest: docs/engine/SHEETS_MANIFEST.md:34

OPEN WORK
  engine.213  — Approval reads the CITY, LIVE PROD @84; open: mood sawtooth (engine.214) and Mon-Thu office datawakes reaching no sheet  docs/engine/ROLLOUT_PLAN.md:128
  civic.38  — Civic game board — build plan filed: closed move set + Sunday-gated write path, 3-stage initiatives with losing clock, petitions from condition data, Mara confrontation, rota split; ready; docs/plans/2026-09-19-civic-wake-game-loop.md (Task 5 will modify this file: line 592-595 `owns` test + line 435-470 Initiative_Tracker reader to include Proposer/ProposingOffice columns; Task 5 also adds revival guard to classifyInitiativeMotion_ :1040-1060)
  docs/plans/2026-09-19-civic-wake-game-loop.md:58  — F5 owner = faction, not sponsor — updateCivicApprovalRatings.js:592-595; reader :435-444 never reads Proposer
  docs/plans/2026-09-19-civic-wake-game-loop.md:41  — Approval: classifyInitiativeMotion_ pays advanced +2 / completed +3 once each (:1037-1097); sitting is free since engine.213 (MOTION_LADDERS_.sitting = [] :1072-1076)

HISTORY
  ea3fda33 S463 engine.231: the raw-carried hook reaches a desk and a journalist
  c37d85ea engine.213d: the poll answers from a season — smoothed hood mood carried across Cycles
  548fe09d engine.213c: the mood is absolute, the middle only orders
  935b820c engine.213b: approval is a LEVEL the city sets
  35a087a7 engine.213: approval reads the city
  23271178 S438 [engine-sheet] engine.178 cut locally

FILES OPENED
  phase05-citizens/updateCivicApprovalRatings.js
  phase01-config/godWorldEngine2.js
  scripts/civicApprovalCeiling.test.js
  scripts/civicApprovalState.test.js
  scripts/createInitiative.js
  output/beats/Initiative_Tracker.jsonl
  output/beats/Civic_Office_Ledger.jsonl
  docs/engine/ROLLOUT_PLAN.md
  docs/plans/2026-09-19-civic-wake-game-loop.md

NOTES — OWNERSHIP DEFINITION & PROPOSER/PROPOSINGOFFICE CONTEXT
  Current `owns` test (line 595): var owns = isMayor || supportedByFaction;
    - isMayor: officeId.indexOf('MAYOR') === 0 (line 570)
    - supportedByFaction: init.leadFaction === faction (line 592)
    - faction: Civic_Office_Ledger row's Faction column (line 527)

  Initiative_Tracker Proposer/ProposingOffice columns (per civic.38 Task 5 context):
    - NOT currently read by updateCivicApprovalRatings_ (lines 435-444 enumerate tracked columns but exclude these)
    - Written by scripts/createInitiative.js:
      - row.Proposer = holder (officeholder name, line 143)
      - row.ProposingOffice = seat.officeId (office ID, line 144)
    - Live format examples: Proposer="Avery Santana", ProposingOffice="MAYOR-01"; Proposer="Denise Carter", ProposingOffice="COUNCIL-D1"
    - AUTHORSHIP_HEADERS: ['Proposer', 'ProposingOffice', 'ProposedCycle'] (scripts/createInitiative.js:13)

  Task 5 change preview (from civic.38 plan, not yet implemented):
    - Lines 435-470: Initiative_Tracker reader will expand to also read Proposer and ProposingOffice columns
    - Line 594: ownership test becomes: isMayor || (faction === leadFaction) || (holder === Proposer) || (officeId === ProposingOffice)
      (or similar sponsor-aligned rule — the exact boolean is Task 5 step 1, pending engine-sheet dispatch)
    - classifyInitiativeMotion_ (lines 1040-1060): will gain a revival guard — a row whose previous phase was a failing phase classifies as `sitting`, not `advanced`, on the cycle it revives

