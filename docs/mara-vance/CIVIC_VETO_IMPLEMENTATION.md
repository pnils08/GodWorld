# Civic Governance Enhancement - Week 1: Mayoral Veto & Override Votes

**Implementation Date:** 2026-02-11
**Target Engine:** civicInitiativeEngine.js v1.6 → v1.7
**Sheet Changes:** Initiative_Tracker (+5 columns), Civic_Office_Ledger (+2 columns)

---

## Overview

Implement mayoral veto power and council override mechanics. Mayor can veto passed initiatives, council can override with 6+ votes.

---

## Current State

**civicInitiativeEngine.js v1.6:**
- ✅ Tracks mayor in Civic_Office_Ledger
- ✅ Code comments mention "veto power"
- ❌ No veto execution logic
- ❌ No override vote mechanics

**Initiative_Tracker (19 columns):**
```
InitiativeID, Name, Type, Status, Budget, VoteRequirement, VoteCycle,
Projection, LeadFaction, OppositionFaction, SwingVoter, Outcome,
SwingVoter2, SwingVoter2Lean, Consequences, Notes, LastUpdated,
AffectedNeighborhoods, PolicyDomain
```

**Civic_Office_Ledger (17 columns):**
```
OfficeId, Title, Type, District, Holder, PopId, TermStart, TermEnd,
TermYears, ElectionGroup, Status, LastElection, NextElection, Notes,
[blank], VotingPower, Faction
```

---

## New Columns

### Initiative_Tracker (+5 columns)

| Column | Type | Description | Example Values |
|--------|------|-------------|----------------|
| **MayoralAction** | Enum | Mayor's decision | `none`, `signed`, `vetoed` |
| **MayoralActionCycle** | Number | When action occurred | `82` |
| **VetoReason** | Text | Why mayor vetoed | `"Budget concerns - conflicts with housing priorities"` |
| **OverrideVoteCycle** | Number | When override scheduled | `84` (2 cycles after veto) |
| **OverrideOutcome** | Text | Result of override | `"OVERRIDE FAILED (4-5)"`, `"OVERRIDE PASSED (6-3)"` |

### Civic_Office_Ledger (+2 columns)

| Column | Type | Description | Example Values |
|--------|------|-------------|----------------|
| **ExecutiveActions** | JSON | Last 10 mayoral actions (mayor only) | `[{"cycle":82,"action":"vetoed","initiative":"Transit Hub","reason":"budget"}]` |
| **Approval** | Number (0-100) | Approval rating | `67` |

**Total: 7 new columns, 0 new sheets**

---

## Veto Mechanics

### When Does Mayor Veto?

**Trigger:** Initiative passes council vote (5+ yes votes)

**Veto Probability Calculation:**
```javascript
baseVetoProb = 0.10;  // 10% base veto chance

// Factors that INCREASE veto probability
if (mayorFaction !== leadFaction) {
  vetoProb += 0.40;  // Opposing faction initiative
}
if (mayorApproval < 40) {
  vetoProb += 0.20;  // Low approval = more cautious
}
if (controversy >= 7) {
  vetoProb += 0.15;  // Highly controversial
}
if (budget > 50000000) {
  vetoProb += 0.10;  // Big budget items
}

// Factors that DECREASE veto probability
if (publicSupport > 70) {
  vetoProb -= 0.30;  // Strong public support
}
if (leadFaction === mayorFaction) {
  vetoProb -= 0.20;  // Same faction support
}
if (voteMargin >= 7) {
  vetoProb -= 0.15;  // Overwhelming council support
}

// Clamp
vetoProb = Math.max(0.05, Math.min(0.75, vetoProb));
```

**Veto Reasons (Selected Based on Context):**
- Budget concerns
- Timeline issues
- Conflict with existing priorities
- Insufficient community input
- Environmental concerns
- Equity considerations
- Implementation feasibility

### Override Vote Process

**Trigger:** Mayor vetoes initiative
**Timing:** Scheduled 2 cycles after veto
**Requirement:** 6+ yes votes (supermajority)
**Status Flow:** `passed` → `vetoed` → `override-vote` → `override-passed` or `override-failed`

---

## Implementation Flow

### Phase 5: Citizens Engine (civicInitiativeEngine.js)

```
1. Process initiative vote (existing logic)
2. IF vote passes (5+ yes):
   a. Check mayoral veto probability
   b. IF mayor vetoes:
      - Update MayoralAction = 'vetoed'
      - Update Status = 'vetoed'
      - Set OverrideVoteCycle = currentCycle + 2
      - Generate MAYORAL_VETO story hook
   c. ELSE:
      - Update MayoralAction = 'signed'
      - Update Status = 'passed'
      - Apply consequences (existing logic)
3. Check for pending override votes this cycle
4. IF override vote scheduled:
   a. Re-run council vote (6+ needed)
   b. Update OverrideOutcome
   c. IF override passes:
      - Status = 'override-passed'
      - Apply consequences
      - Generate VETO_OVERRIDE story hook
   d. ELSE:
      - Status = 'override-failed'
      - Initiative dies
      - Generate VETO_UPHELD story hook
```

---

## Story Hooks Generated

### MAYORAL_VETO
```json
{
  "hookType": "MAYORAL_VETO",
  "theme": "CIVIC",
  "severity": 7,
  "initiative": "Lake Merritt Transit Hub",
  "mayor": "Avery Santana",
  "reason": "Budget concerns - conflicts with housing priorities",
  "councilVote": "6-3",
  "overrideCycle": 84,
  "suggestedAngle": "Mayor breaks with council majority - political fallout?"
}
```

### VETO_OVERRIDE
```json
{
  "hookType": "VETO_OVERRIDE",
  "theme": "CIVIC",
  "severity": 8,
  "initiative": "Lake Merritt Transit Hub",
  "overrideVote": "7-2",
  "mayorStatus": "Political defeat - council defies veto",
  "suggestedAngle": "Power struggle - council flexes supermajority muscle"
}
```

### VETO_UPHELD
```json
{
  "hookType": "VETO_UPHELD",
  "theme": "CIVIC",
  "severity": 6,
  "initiative": "Lake Merritt Transit Hub",
  "overrideVote": "4-5",
  "mayorStatus": "Political victory - veto stands",
  "suggestedAngle": "Initiative dies - supporters vow to revive next session"
}
```

---

## Migration Script

**File:** `scripts/addMayoralVetoColumns.js`

**Operations:**
1. Add 5 columns to Initiative_Tracker (after PolicyDomain)
2. Add 2 columns to Civic_Office_Ledger (after Faction)
3. Initialize ExecutiveActions = `[]` for mayor row
4. Initialize Approval = `65` for all council members + mayor
5. Rollback function available

**Rollback Safety:**
- Creates backup before changes
- Can restore to pre-migration state
- Logs all operations

---

## Engine Changes

**File:** `phase05-citizens/civicInitiativeEngine.js`

**Version:** v1.6 → v1.7

**New Functions:**
- `checkMayoralVeto_(ctx, initiativeRow, voteResult)` - Calculate and execute veto
- `processOverrideVote_(ctx, initiativeRow, councilState)` - Handle override vote
- `updateMayorExecutiveActions_(ctx, action)` - Track mayor's actions
- `generateVetoStoryHook_(ctx, initiative, vetoData)` - Create media hooks

**Modified Functions:**
- `runCivicInitiativeEngine_(ctx)` - Add veto check + override processing
- `resolveCouncilVote_(...)` - Return additional veto context
- `applyInitiativeConsequences_(...)` - Delay consequences if vetoed

---

## Testing Scenarios

### Scenario 1: Veto + Failed Override
- Initiative: Transit hub, $45M, passes 6-3
- Mayor: OPP faction, initiative is CRC-led
- Veto: 70% probability → vetoes
- Override vote (2 cycles later): 4-5 → FAILS
- Result: Initiative dies, CRC frustrated, mayor approval +5

### Scenario 2: Veto + Successful Override
- Initiative: Affordable housing, $30M, passes 7-2
- Mayor: Business-friendly, vetoes over budget
- Override vote: 7-2 → PASSES (same coalition holds)
- Result: Mayor political defeat, approval -10, initiative proceeds

### Scenario 3: No Veto (Strong Public Support)
- Initiative: Park restoration, $5M, passes 8-1
- Public support: 85%
- Veto probability: 5% → signs
- Result: Normal consequences, mayor approval +2

### Scenario 4: Override Scheduled But Council Member Hospitalized
- Initiative vetoed, override scheduled
- Before override vote: 1 IND member hospitalized
- Override vote: 5-4 → FAILS (needed 6)
- Result: Veto upheld due to availability change

---

## Approval Rating Impact

**Veto Decision:**
- Veto unpopular initiative: Approval +3 to +8
- Veto popular initiative: Approval -5 to -15
- Sign consensus initiative: Approval +2

**Override Outcome:**
- Veto upheld: Approval +5 (political victory)
- Veto overridden: Approval -8 (political defeat)

**Base Decay:**
- All officials: -1 approval per cycle (requires ongoing positive actions)

---

## Next Steps (After Implementation)

1. Run migration script (add columns)
2. Deploy civicInitiativeEngine.js v1.7 (clasp push)
3. Test with manual vote: `manualRunVote('INIT-XXX')`
4. Monitor Engine_Errors ledger
5. Review first veto in Media Room briefing
6. **Week 2:** Add town halls (uses Approval column we just added)

---

## File Checklist

- [ ] `docs/engine/CIVIC_VETO_IMPLEMENTATION.md` (this file)
- [ ] `scripts/addMayoralVetoColumns.js` (migration script)
- [ ] `phase05-citizens/civicInitiativeEngine.js` v1.7 (engine update)
- [ ] `tests/civicVetoTestScenarios.js` (4 test scenarios)
- [ ] Update `SESSION_CONTEXT.md` (engine version, changelog)

---

**Status:** Ready for implementation
**Estimated Time:** 2-3 hours (migration + engine + tests)
**Risk:** Low (isolated to civic engine, rollback available)
