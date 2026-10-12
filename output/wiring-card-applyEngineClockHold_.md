WIRING CARD — applyEngineClockHold_ (function)   map: 2026-09-21 / 184 files / 1463 functions   [MAP FRESH]

DEFINITION
  phase05-citizens/civicInitiativeEngine.js:2916  function applyEngineClockHold_(ctx, row, cycle, engineWillAct, initId, iNextActionCycle, iNotes, iLastUpdated)    v1.9

PHASE POSITION
  production entry : Phase5-Initiatives @ godWorldEngine2.js:358  — called via runCivicInitiativeEngine_
  cycle-phases     : Phase5-Initiatives @ godWorldEngine2.js:2110 — called via runCivicInitiativeEngine_
  [Phase10-ExecuteIntents @ godWorldEngine2.js:598/2336]

CALLERS (<2 in engine, +3 in tests)
  phase05-citizens/civicInitiativeEngine.js:245   if (status === 'passed' && row[iMayoralAction] === 'signed') { … applyEngineClockHold_(…) }
  phase05-citizens/civicInitiativeEngine.js:323   [unconditional; engineWillAct = (voteCycle === cycle && (status === 'active' || status === 'pending-vote')) computed at line 322]

WRITE PATH
  DIRECT  sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows)  @ phase05-citizens/civicInitiativeEngine.js:552
           ↳ Initiative_Tracker  (BEFORE Phase10-ExecuteIntents, Phase5 write)

CELLS WRITTEN & NOTES TEXT
  NextActionCycle  @ :2920  ← clock.nextActionCycle (cycle + 1 when action='hold')
  Notes            @ :2921  ← clock.notes
                   @ :2929  ← clock.notes (when action='clear')
                   
  Text appended to Notes when action='hold':
    "[ENGINE-CLOCK n=X from=CY] " + stripped_notes
    where X = grace count (0–2), CY = origin cycle, stripped_notes = prior content minus any prior ENGINE-CLOCK marker
  
  LastUpdated      @ :2922  ← ctx.now  (when action='hold')

INSIDE runCivicInitiativeEngine_: FULL CALL SITES
  (:245) status === 'passed' && row[iMayoralAction] === 'signed'
         → action='hold': NextActionCycle advanced to cycle+1 with grace marker
         → action='clear': ENGINE-CLOCK marker removed, grace exhausted by chain re-arm
         → action='none'/'expire': no-op, row unchanged
  
  (:323) [unconditional] but engineWillAct parameter reflects (voteCycle === cycle && (status === 'active' || status === 'pending-vote'))
         → if engineWillAct=true: clock.action = 'none' (line 2965), function returns false, row unchanged
         → if engineWillAct=false: standard hold/clear/expire logic applies
         [Gate: function returns early at :2917 if iNextActionCycle < 0 || iNotes < 0]

NEXTACTIONCYCLE DOWNSTREAM READERS
  classifyInitiativeMotion_                    @ phase05-citizens/updateCivicApprovalRatings.js:1099–1102
                                                 [READER: line 1099-1102; scores as 'silence' if nextActionCycle < cycle or empty]
  
  Phase-transition reschedule trigger          @ phase05-citizens/civicInitiativeEngine.js:286–295
                                                 [READER: line 289 var nextCycle = Number(row[iNextActionCycle]) || 0]
                                                 Condition: status === 'visioning-complete' && implPhase === 'vote-ready' && nextCycle >= cycle
                                                 Action: row[iVoteCycle] = nextCycle (line 297), row[iStatus] = 'active', Notes appended
  
  engineClockHold_ helper                      @ phase05-citizens/civicInitiativeEngine.js:2943
                                                 [READER: line 2947 var parsed = parseInt(nextActionCycle, 10)]
                                                 Expiry check: Number(parsed) < Number(cycle) (line 2948)

T7 BLOCK (applyInitiativeImplementationEffects.js:377–391)
  Exact predicate:
    if (isBaylightInitiative_(name) && sportsHasOpenedBaylight_(S)) {
      if (phase !== 'operational' && phase !== 'complete') {
  
  Columns read by T7 block:
    - phase (ImplementationPhase, line 343)
    - name (Name, line 201)
    - S.sportsZones (line 394, set in earlier phase)
    [Does NOT read Stage column; Stage is read for decay at lines 418–426 in separate block]
  
  Write:
    queueCellIntent_(ctx, 'Initiative_Tracker', i+1, iPhase+1, 'operational',
                     'engine.131 T7 — a franchise is playing in Baylight, so the stadium is built',
                     'civic', 5)
    @ phase02-world-state/applyInitiativeImplementationEffects.js:384
    ↳ Writes ImplementationPhase (column iPhase) to 'operational'

HISTORY
  a342400d civic.38 Task 4 part 2 fix-ups from codex review F3/F4/F5
  411b9e69 civic.38 Task 4 part 2 fix-ups: canon guard on the baseline stamp, replayed bench data
  9b81a08a civic.38 Task 4 part 2: StageBaseline descriptor, Delivering comparator + hold, regress
  67fe9e8b civic.38 rulings (a)/(b): economic, workforce, sports not playable; per-domain margin
  82d2fac4 civic.38 Task 4 handler fix-ups from codex review db4c74a7
  7268a284 civic.38 Task 4 stage handler, first cut

OPEN WORK
  docs/plans/2026-09-19-civic-wake-game-loop.md
  docs/plans/2026-08-31-c105-chase-sessions.md
  docs/plans/2026-08-29-employment-system-cascade.md

FILES OPENED
  phase05-citizens/civicInitiativeEngine.js (definition, callers, reschedule trigger, helper)
  phase05-citizens/updateCivicApprovalRatings.js (classifyInitiativeMotion_ reader)
  phase02-world-state/applyInitiativeImplementationEffects.js (T7 block)
  phase01-config/godWorldEngine2.js (phase position)
