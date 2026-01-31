# Initiative Tracker Voter Logic Reference

**Source:** `phase05-citizens/civicInitiativeEngine.js` v1.3
**Last Updated:** Cycle 75

---

## Overview

The Initiative Tracker implements a 9-seat city council voting system where the **mayor has veto power but does NOT vote** on council matters. Votes are resolved using faction math combined with probabilistic swing voter calculations.

---

## Council Structure

| Faction | Code | Alignment |
|---------|------|-----------|
| Oakland People's Party | `OPP` | Progressive |
| Civic Reform Coalition | `CRC` | Business-oriented |
| Independent | `IND` | Swing voters |

---

## Vote Resolution Logic

The vote resolution in `resolveCouncilVote_()` follows this flow:

### 1. Base Faction Votes

```
Lead faction    → votes YES
Opposition      → votes NO
IND members     → resolved via swing voter logic
```

### 2. Swing Voter Hierarchy (v1.1)

The system processes IND members in three tiers:

| Tier | Column Source | Probability Calculation | Bounds |
|------|---------------|------------------------|--------|
| **Primary** | `SwingVoter` + `Projection` | Keyword-based (see below) | 15-85% |
| **Secondary** | `SwingVoter2` + `SwingVoter2Lean` | Lean-based values | 15-85% |
| **Unnamed IND** | City sentiment | `0.5 + (sentiment × 0.15)` | 15-85% |

Each named swing voter is processed only once. Remaining IND members use the unnamed calculation.

---

## Probability Calculations

### Primary Swing Voter (`calculateSwingProbability_`)

Based on the `Projection` field keywords:

| Projection Keyword | Base Probability |
|-------------------|------------------|
| `likely pass` | 70% |
| `lean` + `pass` | 60% |
| `likely fail` | 30% |
| `lean` + `fail` | 40% |
| `toss-up` / `uncertain` | 50% |
| `needs` (swing) | 45% |

**Modifiers applied:**
- `+ sentiment × 0.10`
- `- 0.05` if supermajority required

### Secondary Swing Voter (`calculateLeanProbability_`)

Based on `SwingVoter2Lean` field:

| Lean Value | Probability |
|------------|-------------|
| `lean-yes` / `leaning yes` | 65% |
| `likely-yes` / `likely yes` | 75% |
| `lean-no` / `leaning no` | 35% |
| `likely-no` / `likely no` | 25% |
| `toss-up` / `undecided` / `uncertain` | 50% |

**Modifiers applied:**
- `+ sentiment × 0.05` (smaller than primary, Media Room already factored context)

### Unnamed IND Members

```
probability = 0.5 + (sentiment × 0.15)
```

Where sentiment ranges from -1 to +1.

---

## Demographic Influence (v1.3)

Swing vote probability is modified based on **affected neighborhoods' demographics**. The `AffectedNeighborhoods` column (comma-separated) specifies target areas.

### Initiative Type → Demographic Alignment

| Initiative Type | Demographic Trigger | Modifier |
|----------------|---------------------|----------|
| Health / Medical / Clinic / Hospital | >25% seniors | +8% |
| Health / Medical / Clinic / Hospital | >8% sick rate | +6% |
| Housing / Stabilization / Affordable / Rent | >12% unemployed | +10% |
| Housing / Stabilization / Affordable / Rent | >20% seniors | +5% |
| Transit / BART / Bus / Transportation | >55% working adults | +6% |
| Transit / BART / Bus / Transportation | >20% students | +5% |
| Education / School / Youth / Student | >25% students | +10% |
| Jobs / Employment / Business / Economic | >10% unemployed | +8% |
| Senior / Elder / Aging / Retire | >20% seniors | +12% |
| Alternative / Response / Police / Safety | >20% students | +5% |
| Alternative / Response / Police / Safety | >25% seniors | -3% |

**Maximum demographic modifier: ±15%**

---

## Vote Requirements

| Requirement | Votes Needed | Use Case |
|-------------|--------------|----------|
| `5-4` | 5 of 9 | Simple majority (default) |
| `6-3` | 6 of 9 | Supermajority (reserve fund draws, charter amendments) |

### Outcome Determination

```javascript
var passed = yesVotes >= votesNeeded;
```

---

## Council Member Availability

Members are **excluded from voting** if their status is:

- `hospitalized`
- `serious-condition`
- `critical`
- `injured`
- `deceased`
- `resigned`
- `retired`

### Delayed Votes

If `availableVotes < votesNeeded`, the vote is **delayed** with status `DELAYED` and consequence: "Insufficient council members for vote. Delayed pending appointments."

---

## Example Vote Flow

**Initiative:** West Oakland Stabilization Fund
**Vote Requirement:** 6-3 (supermajority)

| Factor | Value |
|--------|-------|
| Lead Faction | OPP (3 available) → 3 YES |
| Opposition | CRC (3 available) → 3 NO |
| SwingVoter | "Ramon Vega" |
| Projection | "needs 1 swing" → 45% base |
| SwingVoter2 | "Leonard Tran" |
| SwingVoter2Lean | "lean-yes" → 65% base |
| Affected Neighborhoods | West Oakland (30% seniors) |
| Initiative Type | Housing/Stabilization |

**Probability Calculation:**

```
Vega:
  Base (needs swing):     45%
  + Supermajority:        -5%
  + Demographic (seniors): +5%
  = Final:                45%

Tran:
  Base (lean-yes):        65%
  + Demographic (seniors): +5%
  = Final:                70%
```

**Possible Outcomes:**
- Both vote YES → 5 YES, 3 NO → FAILED (needed 6)
- One votes YES → 4 YES, 4 NO → FAILED
- Both vote NO → 3 YES, 5 NO → FAILED

*(This initiative would need all 3 IND members voting YES to pass)*

---

## Schema Reference

The Initiative_Tracker sheet uses 17+ columns:

| Column | Field | Description |
|--------|-------|-------------|
| A | InitiativeID | Unique ID (INIT-001, etc.) |
| B | Name | Initiative name |
| C | Type | vote, grant, visioning, external |
| D | Status | proposed, active, pending-vote, passed, failed |
| E | Budget | Dollar amount |
| F | VoteRequirement | 5-4, 6-3, etc. |
| G | VoteCycle | Cycle when vote occurs |
| H | Projection | likely passes, toss-up, needs 1 swing |
| I | LeadFaction | OPP, CRC |
| J | OppositionFaction | CRC, OPP |
| K | SwingVoter | Primary swing voter name |
| L | SwingVoter2 | Secondary swing voter name |
| M | SwingVoter2Lean | lean-yes, lean-no, toss-up |
| N | Outcome | PASSED, FAILED, APPROVED, DENIED |
| O | Consequences | Result description |
| P | Notes | Running notes |
| Q | LastUpdated | Timestamp |
| R | AffectedNeighborhoods | Comma-separated neighborhood list (v1.3) |

---

## Status Lifecycle

```
proposed → active → pending-vote → passed/failed/resolved
                                 → delayed (if insufficient quorum)
```

**Auto-advance rules:**
- `proposed` → `active` when `VoteCycle - currentCycle <= 3`
- `active` → `pending-vote` when `VoteCycle = currentCycle + 1`

---

## Integration Points

The Initiative Tracker integrates with:

| System | Purpose |
|--------|---------|
| `Civic_Office_Ledger` | Council member status, factions, availability |
| `City Dynamics` | Sentiment value for unnamed swing votes |
| `Media Room` | Coverage triggers, swing voter context |
| `Event Arc Engine` | Initiative-driven story arcs |
| `Neighborhood_Demographics` | Tier 3 demographic data for vote influence |

---

## Version History

| Version | Changes |
|---------|---------|
| v1.1 | Added SwingVoter2 and SwingVoter2Lean columns; individual probability for each named IND member |
| v1.2 | Fixed column insertion bug; 9-seat council model (mayor veto only); clamped unnamed IND to 0.15-0.85 |
| v1.3 | Integrated Tier 3 Neighborhood Demographics; demographic influence on swing votes; AffectedNeighborhoods support |
