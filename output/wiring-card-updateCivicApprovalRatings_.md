WIRING CARD — updateCivicApprovalRatings_ (engine-wiring agent, 2026-10-04 02:58, map of a tree where the file is already dirty with es's civic.43 T1 edit)

DEFINITION  phase05-citizens/updateCivicApprovalRatings.js:363  v1.5 (ES5)
PHASE       Phase5-ApprovalRatings @ godWorldEngine2.js:594 (prod) / :2272 (cycle-phases) — before Phase10-ExecuteIntents (:814 / :2478)
CALLERS     godWorldEngine2.js:594, :2272; civicApprovalState.test.js:205, :241; civicApprovalCeiling.test.js:223, :248

S FIELDS
  WRITE S.approvalChanges @:367,:1002 (readers: civicApprovalState.test.js)
  WRITE S.approvalCeilingEvents @:368,:740 (civicApprovalCeiling.test.js:231)
  WRITE S.officeDepartures @:369,:859; S.civicCampaigns @:370,:758; S.approvalTriggers @:994,:1003 — no readers outside the file
  WRITE S.storyHooks @:740,:803,:875 (CIVIC_APPROVAL_SCANDAL, CIVIC_CHALLENGER_CAMPAIGN, CIVIC_DEMOTION, CIVIC_LEFT_OFFICE)
  WRITE S.approvalHoodMoodEma @:509 → phase09-digest/finalizeCycleState.js:133
  WRITE S.approvalNeighborhoodEffects @:953,:976 → applyCityDynamics.js:1321-1322; finalizeCycleState.js:129,:133
  READ  S.neighborhoodState @:156,:200; S.editionDomainBalance @:505; S.previousCycleState @:221,:462; S.canonHoods via getDistrictHoods_

WRITE PATH  queueCellIntent_ @:933-935 → Civic_Office_Ledger Approval; @:938-943 → Status, HighApprovalStreak, AutoScandalUntilCycle, AutoScandalSource
            recordHookRipple_ @:743,:805,:877; recordRipple_ @:982-986 (approval/district-sentiment)
            also Holder (:812), PopId (:815), VotingPower (:818), Notes (:827,:843)

OFFICE-ID FILTER  :553 (dirty tree) `/^(COUNCIL|MAYOR|BOARD-OUSD)/` — HEAD e59d8b14 still `/^COUNCIL/ … /^MAYOR/`
                  :588 isMayor = officeId.indexOf('MAYOR') === 0
GETDISTRICTHOODS_ phase01-config/canonNeighborhoodLoader.js:382 → S.canonHoods.byDistrict[id.toUpperCase()] or []
                  MAYOR-01: districtHoods fetched, districtScore null (:670), cityScore used — a citywide BOARD row takes the same path

LEDGER COLS  read OfficeId, Title, District, Holder, PopId, Status, Approval, Faction, HighApprovalStreak, AutoScandalUntilCycle, AutoScandalSource, VotingPower, Notes
INITIATIVE_TRACKER read  Name, Status, ImplementationPhase, PolicyDomain, AffectedNeighborhoods, LeadFaction, OppositionFaction, NextActionCycle, InitiativeID, ProposingOffice, StageHold, Stage
ROLLOUT  civic.43 (T1 in progress), civic.33 (observe)
HISTORY  e59d8b14, 7ba27e95, 9b81a08a, 95b67423, ea3fda33, c37d85ea
