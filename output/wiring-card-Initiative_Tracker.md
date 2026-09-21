WIRING CARD — Initiative_Tracker (tab)   map: 2026-09-20 / 184 files   [NOT STALE]

DEFINITION
  phase05-citizens/civicInitiativeEngine.js:1852  createInitiativeTrackerSheet_() v1.6

STUB_REVERSE
  writers: [applyInitiativeImplementationEffects_, createInitiative_, updateCivicApprovalRatings_]
  readers: [applyInitiativeImplementationEffects_, createInitiativeTrackerSheet_, createInitiative_, getInitiativeSummaryForMedia_, manualRunVote, runCivicInitiativeEngine_, seedInitiativeTracker_, loadInitiatives_ (phase10), cycleRollback, setupInitiativeTrackerValidation, + 25 script readers]

SHEETS_MANIFEST
  docs/engine/SHEETS_MANIFEST.md:34  City policy, budgeting, and phase implementation.
  docs/engine/SHEETS_MANIFEST.md:155  civicInitiativeEngine.js uses own-tab; seedInitiativeTracker() is the menu creator
  docs/engine/SHEETS_MANIFEST.md:159  updateCivicApprovalRatings.js reads Initiative_Tracker

---

## WRITERS (by file and write classification)

### Engine Writers

**applyInitiativeImplementationEffects_ (Phase2-InitiativeEffects)**
  phase02-world-state/applyInitiativeImplementationEffects.js:312  queueCellIntent_(ctx, 'Initiative_Tracker', i+1, iPhase+1, 'operational', ...)
  CLASSIFICATION: FIXED INDEX
  METHOD: findImplCol_(headers, ['ImplementationPhase', ...]) resolves column index at runtime, writes via 1-based column index (iPhase+1)
  BEFORE Phase10-ExecuteIntents (line 595)

**createInitiative_ (called from scripts, not engine entry point)**
  phase05-citizens/civicInitiativeEngine.js:2815  queueAppendIntent_(ctx, 'Initiative_Tracker', row, 'createInitiative_ ' + newId, 'civic')
  CLASSIFICATION: BY NAME
  METHOD: row array built via idx(field) = header.indexOf(field), all fields set by name lookups (lines 2793-2809)
  NOT ENGINE-CALLED; script wrapper at scripts/createInitiative_.engine.js

**updateCivicApprovalRatings_ (Phase5-ApprovalRatings)**
  phase05-citizens/updateCivicApprovalRatings.js:424  (getSheetByName, reads only; NO queueCellIntent_ found for Initiative_Tracker)
  CLASSIFICATION: READ-ONLY IN THIS FUNCTION
  NOTE: STUB_REVERSE lists as writer, but code review line 424 reads sheet; no write to Initiative_Tracker detected. Verify before assuming.

### Script Writers

**scripts/applyTrackerUpdates.js**
  Line 88: sheets.updateCell(TAB, sheetRow, 'Value', values[key]) — but this writes to World_Config, not Initiative_Tracker
  Line 102: SHEET_NAME = 'Initiative_Tracker' declared
  Lines 113-122: WRITEBACK_FIELDS defines write surface (ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle, VoteCycle, LastWorkCycle, LastWorkSeat, Status)
  CLASSIFICATION: BY NAME (uses sheets.updateRowFields which operates on column names, not indices)
  CALLED FROM: cron-civic-run.js (the only sheet writer for Initiative_Tracker in civic flow)

**scripts/addMayoralVetoColumns.js**
  Line 58: const initTracker = sheetMap['Initiative_Tracker'];
  NOT CHECKED (brief reference; full write logic not read)

**scripts/buildInitiativeCards.js**
  Line 493: var data = await sheets.getSheetData('Initiative_Tracker');
  CLASSIFICATION: READ ONLY

**scripts/cron-civic-gate.js**
  Line 305: trackerRows = await sheets.getSheetAsObjects('Initiative_Tracker');
  CLASSIFICATION: READ ONLY

**scripts/rheaTwoPass.js**
  Line 112: sheets.getSheetAsObjects('Initiative_Tracker').catch(() => [])
  CLASSIFICATION: READ ONLY

**scripts/queryLedger.js**
  Line 346: const tracker = await sheets.getSheetAsObjects('Initiative_Tracker');
  CLASSIFICATION: READ ONLY

**scripts/buildDeskPackets.js**
  Line 2208: safeGet('Initiative_Tracker')
  NOT CHECKED (full logic not read)

**scripts/dumpBeatTabs.js**
  Line 71: 'Initiative_Tracker' in dump list
  CLASSIFICATION: READ/DUMP

---

## HEADER DECLARATIONS & ASSERTIONS

**PRIMARY DECLARATION:**
  phase05-citizens/civicInitiativeEngine.js:1856-1876  createInitiativeTrackerSheet_()
  Schema v1.6 (19 columns):
    InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, 
    LeadFaction, OppositionFaction, SwingVoter, Outcome, SwingVoter2, SwingVoter2Lean, 
    Consequences, Notes, LastUpdated, AffectedNeighborhoods, PolicyDomain

**WRITE ALLOWLIST:**
  scripts/applyTrackerUpdates.js:113-122  WRITEBACK_FIELDS (enforced gate, not creation)
  Includes: ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle, VoteCycle, LastWorkCycle, LastWorkSeat, Status

**ENSURE SCHEMA FUNCTIONS:**
  NOT FOUND (no ensure*Schema_ function for Initiative_Tracker detected)

**SHEET MANIFEST:**
  docs/engine/SHEETS_MANIFEST.md:34, 155, 159

**SCHEMA DOCS:**
  docs/SCHEMA.md — NOT CHECKED
  docs/SCHEMA_HEADERS.md — NOT CHECKED
  docs/engine/SHEETS_MANIFEST.md — linked above

---

## COLUMN PRESENCE AUDIT

### Requested Columns Status

| Column | Already in Repo? | Location | Notes |
|---|---|---|---|
| **Stage** | PLANNED ONLY | docs/plans/2026-09-19-civic-wake-game-loop.md:145 | Task 4 step 1 — "six new columns" for civic.38; not yet in live code |
| **StageBaseline** | PLANNED ONLY | docs/plans/2026-09-19-civic-wake-game-loop.md:145, 2026-09-20-housing-lever.md:153 | Versioned JSON baseline cohort; Task 4 schema cut pending |
| **LastStageChangeCycle** | PLANNED ONLY | docs/plans/2026-09-19-civic-wake-game-loop.md:145 | Engine-written; Task 4 step 1 |
| **LastWorkCycle** | ACTIVE | scripts/applyTrackerUpdates.js:119, 219-231 | Task 2 step 3 civic.38; warning-skip until Task 4 schema cut (line 222: "emitted but tracker has no column yet") |
| **LastWorkSeat** | ACTIVE | scripts/applyTrackerUpdates.js:120, 219-231 | Task 2 step 3 civic.38; warning-skip until Task 4 schema cut |
| **PriorPhase** | PLANNED ONLY | docs/plans/2026-09-19-civic-wake-game-loop.md:145 | Engine-written on stall; Task 4 step 3 |

### Current Live Header Order (from beats snapshot)
  File: output/beats/Initiative_Tracker.jsonl (dated 2026-09-20 16:49)
  Headers: InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle, Projection, LeadFaction, OppositionFaction, SwingVoter, Outcome, SwingVoter2, SwingVoter2Lean, Consequences, Notes, LastUpdated, AffectedNeighborhoods, PolicyDomain, MayoralAction, MayoralActionCycle, VetoReason, OverrideVoteCycle, OverrideOutcome, ImplementationPhase, MilestoneNotes, NextScheduledAction, NextActionCycle, Proposer, ProposingOffice, ProposedCycle
  (31 columns total; 19 in createInitiativeTrackerSheet_, 12 added post-creation)

---

## READERS AUDIT

### Engine Readers (by-name via idx() / header.indexOf())

**phase05-citizens/civicInitiativeEngine.js**
  Line 99: requireTab_(ss, 'Initiative_Tracker') — reads to memory
  Lines 153-159: idx('MayoralAction'), idx('ImplementationPhase'), idx('NextActionCycle'), etc. (by name)
  CLASSIFICATION: BY NAME

**phase05-citizens/applyBusinessDynamics.test.js**
  Line 221: test fixture with Initiative_Tracker getDataRange().getValues()
  CLASSIFICATION: BY NAME (mock)

**phase05-citizens/updateCivicApprovalRatings.js**
  Lines 435-445: idx() lookups for Name, Status, ImplementationPhase, PolicyDomain, Neighborhoods, LeadFaction, OppositionFaction, NextActionCycle, InitiativeID, ProposingOffice
  CLASSIFICATION: BY NAME

**phase10-persistence/compileHandoff.js**
  Line 533: getSheetByName('Initiative_Tracker') — reads for carry-forward state
  CLASSIFICATION: BY NAME (reads full rows)

### Utility Readers

**utilities/cycleRollback.js**
  Lines 58, 164, 281: Initiative_Tracker in rollback logic with cycleCol='VoteCycle'
  CLASSIFICATION: BY NAME (uses queryLedger / structured read)

**utilities/setupInitiativeTrackerValidation.js**
  Lines 24, 193: getSheetByName('Initiative_Tracker')
  CLASSIFICATION: BY NAME

### Script Readers

**scripts/** (25+ references in map; most via getSheetAsObjects or getSheetData)
  sheets.getSheetAsObjects() returns objects keyed by header name
  CLASSIFICATION: BY NAME

Examples:
  scripts/buildInitiativeCards.js:493
  scripts/buildInitiativePackets.js:484
  scripts/buildCivicVoicePackets.js:343
  scripts/canon_check.js:36
  scripts/queryLedger.js:346
  scripts/citizen-exchange.js:334, 432
  scripts/cron-civic-gate.js:305
  scripts/rheaTwoPass.js:112

**cron-civic-run.js**
  Line 150: readBeats('Initiative_Tracker', beatsDir)
  CLASSIFICATION: BY NAME (JSON objects from JSONL)

---

## OPEN WORK & ROLLOUT

**civic.38** — docs/engine/ROLLOUT_PLAN.md (grep for row)
  Tasks 1–6 in-progress; Task 7 withdrawn (2026-09-20)
  Task 4 (engine cut) blocked until approved: adds Stage + StageBaseline + LastStageChangeCycle + PriorPhase columns
  Related: docs/plans/2026-09-19-civic-wake-game-loop.md (full design record)

**engine.250** — docs/engine/ROLLOUT_PLAN.md
  Initiative neighborhood effects bus emptied before reader phases; blocks education and business delivery channels

**civic.14** — Initiative_Tracker contract + fine-tune
  docs/plans/2026-06-01-initiative-tracker-contract.md

---

## HISTORY

  git log --oneline -6 -- phase05-citizens/civicInitiativeEngine.js:

NOT CHECKED (coordinator instruction to stop searching)

---

## FILES OPENED (read-only audit)

  phase02-world-state/applyInitiativeImplementationEffects.js
  phase05-citizens/civicInitiativeEngine.js
  phase05-citizens/updateCivicApprovalRatings.js
  scripts/applyTrackerUpdates.js
  scripts/validateTrackerUpdates.js
  docs/plans/2026-09-19-civic-wake-game-loop.md
  docs/plans/2026-09-20-housing-lever.md
  docs/engine/SHEETS_MANIFEST.md
  output/beats/Initiative_Tracker.jsonl
  docs/engine/ENGINE_STUB_REVERSE.json

