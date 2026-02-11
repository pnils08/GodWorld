# Civic Governance Master Reference — Mara Vance Edition

**For:** Mara Vance, City Planning Director
**Purpose:** Complete reference for Oakland civic governance mechanics
**Engine Version:** civicInitiativeEngine.js v1.7
**Last Updated:** 2026-02-11

---

## Overview

This document consolidates all civic governance mechanics for quick reference when adjudicating outcomes, answering journalist questions, or prepping press briefings.

**Quick Links:**
- [Council Structure](#council-structure)
- [Initiative Voting](#initiative-voting)
- [Mayoral Veto](#mayoral-veto-new-v17)
- [Override Votes](#override-votes-new-v17)
- [Elections](#elections)
- [Story Hook Types](#story-hook-types)

---

## Council Structure

### 9-Seat Council Model

| Position | Type | Vote Power | Special Powers |
|----------|------|------------|----------------|
| Council Members (9) | Voting | Yes | Override veto (6+ votes) |
| Mayor | Executive | **NO** | Veto power, executive orders |

**Key Principle:** Mayor does not vote on council matters but can veto passed initiatives.

### Factions

| Faction | Code | Alignment | Typical Positions |
|---------|------|-----------|-------------------|
| Oakland People's Party | OPP | Progressive | Housing, transit, social services |
| Civic Reform Coalition | CRC | Business | Economic development, infrastructure |
| Independent | IND | Swing | Case-by-case |

**Current Composition (check Civic_Office_Ledger):**
- Reference latest cycle for exact counts
- Typical split: 3-4 OPP, 3-4 CRC, 1-2 IND

---

## Initiative Voting

### Vote Requirements

| Type | Votes Needed | Used For |
|------|--------------|----------|
| Simple Majority | 5 of 9 | Standard initiatives |
| Supermajority | 6 of 9 | Charter amendments, reserve fund |

### Swing Voter Logic (v1.1)

Three tiers of swing voter calculation:

**Tier 1: Named Primary Swing Voter** (SwingVoter column)
- Probability based on Projection keywords
- "likely pass" → 70% yes
- "likely fail" → 30% yes
- "toss-up" → 50% yes
- Modified by city sentiment (±10%)

**Tier 2: Named Secondary Swing Voter** (SwingVoter2 + SwingVoter2Lean)
- "lean-yes" → 65% yes
- "likely-yes" → 75% yes
- "lean-no" → 35% yes
- "likely-no" → 25% yes
- "toss-up" → 50% yes

**Tier 3: Unnamed IND Members**
- Probability = 0.5 + (city sentiment × 0.15)
- Clamped to 15-85%

### Demographic Influence (v1.3)

Swing votes modified by affected neighborhoods' demographics:

| Initiative Type | Demographic Boost |
|----------------|-------------------|
| Health initiatives | +8% if >25% seniors, +6% if >8% sick |
| Housing/stabilization | +10% if >12% unemployed, +5% if >20% seniors |
| Transit | +6% if >55% working adults, +5% if >20% students |
| Education/youth | +10% if >25% students |
| Jobs/economic | +8% if >10% unemployed |
| Senior-specific | +12% if >20% seniors |

Maximum demographic modifier: ±15%

### Council Availability

Members with these statuses are **excluded from votes:**
- hospitalized, serious-condition, critical, injured
- deceased, resigned, retired

If available votes < required votes, initiative is delayed.

---

## Mayoral Veto (NEW v1.7)

### When Does Mayor Veto?

**Trigger:** Initiative passes council vote (5+ yes)

**Veto Probability Formula:**
```
Base: 10%

Increases:
+ 40% if opposing faction's initiative
+ 20% if mayor approval <40
+ 15% if controversy >=7
+ 10% if budget >$50M

Decreases:
- 30% if public support >70
- 20% if same faction initiative
- 15% if vote margin >=7 (overwhelming support)

Final: Clamped to 5-75%
```

### Veto Reasons (Context-Based)

Mayor selects reason from available triggers:

| Trigger | Veto Reason |
|---------|-------------|
| Budget >$50M | "Budget concerns - exceeds fiscal projections" |
| Controversy >=7 | "Insufficient community consensus" |
| Opposing faction | "Conflicts with administration priorities" |
| Timeline issues | "Implementation timeline concerns" |
| Default | "Requires additional review" / "Implementation feasibility concerns" |

### What Happens After Veto?

1. Initiative status → `vetoed`
2. Override vote scheduled (current cycle + 2)
3. Story hook generated: **MAYORAL_VETO**
4. Consequences **delayed** (not applied until override resolves)
5. Notes updated with veto reason

---

## Override Votes (NEW v1.7)

### Override Requirements

| Requirement | Value |
|-------------|-------|
| Votes Needed | **6 of 9** (supermajority) |
| Timing | 2 cycles after veto |
| Council Recount | Yes (availability may have changed) |

### Override Vote Logic

**Base votes:**
- Lead faction: votes YES (to override)
- Opposition faction: votes NO (uphold veto)
- IND members: 55% probability to override (slight bias toward council unity)

**Outcome:**
- **Override passes (6+):** Initiative proceeds, consequences applied, mayor takes political hit
- **Override fails (<6):** Initiative dies, veto upheld, mayor vindicated

### Story Hooks Generated

**VETO_OVERRIDE** (severity 8)
- Council defies mayor's veto
- Power struggle narrative
- Mayor approval -8

**VETO_UPHELD** (severity 6)
- Override fails, initiative dies
- Mayor political victory
- Mayor approval +5

---

## Elections

### Election Schedule

| Year Type | Group | Seats Up for Election |
|-----------|-------|----------------------|
| Year 2, 6, 10... | Group A | Council Districts 1, 3, 5, 7, 9 |
| Year 4, 8, 12... | Group B | Mayor, DA, Public Defender, Council Districts 2, 4, 6, 8 |

**Election Window:** Cycles 45-48 (November)
**Trigger Cycle:** 45 only (prevents duplicates)
**Years:** Even years only

### Candidate Criteria

**Eligible challengers:**
- Tier 2, 3, or 4 citizens
- Status: `active`
- Not already CIV flagged (unless journalist)

**Weighting factors:**
- Community leaders: higher weight
- Business owners: higher weight for CRC seats
- Activists: higher weight for OPP seats

### Election Engine

**Source:** `phase05-citizens/runCivicElectionsv1.js` v1.0

**Design Philosophy:** Generate story seeds, not spreadsheets. Elections are "dramatic promotions" that create narrative opportunities.

---

## Initiative Ripple Effects (v1.3)

Passed (or override-passed) initiatives create multi-cycle ripple effects:

### Ripple Durations by Domain

| Domain | Duration | Effects |
|--------|----------|---------|
| Health | 12 cycles | sick_rate ↓, sentiment ↑, community ↑ |
| Transit | 10 cycles | retail ↑, traffic impact, sentiment ↑ |
| Economic | 15 cycles | unemployment ↓, retail ↑, sentiment ↑ |
| Housing | 20 cycles | sentiment ↑↑, community ↑, stability ↑ |
| Safety | 8 cycles | sentiment ±, community ± (mixed) |
| Environment | 12 cycles | sentiment ↑, sick_rate ↓, public spaces ↑ |
| Sports | 20 cycles | retail ↑↑, traffic ↑↑, nightlife ↑, sentiment ± |
| Education | 15 cycles | sentiment ↑, community ↑, student attraction ↑ |

### Ripple Application

- **Scope:** Citywide or neighborhood-specific (AffectedNeighborhoods column)
- **Decay:** 15% reduction per cycle (exponential)
- **Expiration:** When strength reaches ~0

**Consumer:** `applyActiveInitiativeRipples_()` called in Phase 02 or 06

---

## Story Hook Types

### Initiative Voting

**INITIATIVE_VOTE** (severity 5-7)
- Standard vote outcome
- Includes vote count, swing voters
- Generates basic coverage

### Mayoral Actions

**MAYORAL_VETO** (severity 7)
```json
{
  "hookType": "MAYORAL_VETO",
  "initiative": "Lake Merritt Transit Hub",
  "mayor": "Avery Santana",
  "reason": "Budget concerns - conflicts with housing priorities",
  "overrideCycle": 84
}
```

**VETO_OVERRIDE** (severity 8)
```json
{
  "hookType": "VETO_OVERRIDE",
  "initiative": "Lake Merritt Transit Hub",
  "overrideVote": "7-2",
  "mayorStatus": "Political defeat - council defies veto"
}
```

**VETO_UPHELD** (severity 6)
```json
{
  "hookType": "VETO_UPHELD",
  "overrideVote": "4-5",
  "mayorStatus": "Political victory - veto stands"
}
```

---

## Approval Ratings (v1.7)

### What Affects Approval?

**Mayor approval tracked in Civic_Office_Ledger:**

| Action | Approval Change |
|--------|-----------------|
| Veto unpopular initiative | +3 to +8 |
| Veto popular initiative | -5 to -15 |
| Sign consensus initiative | +2 |
| Veto upheld (override fails) | +5 |
| Veto overridden | -8 |
| Base decay | -1 per cycle |

**Usage:**
- Veto probability calculation
- Town hall triggers (Week 2)
- Election forecasting

---

## Initiative Status Lifecycle

```
proposed
  ↓
active (3 cycles before vote)
  ↓
pending-vote (1 cycle before)
  ↓
VOTE OCCURS
  ↓
passed (5+ votes)
  ↓
IF mayor signs → passed (consequences applied, DONE)
IF mayor vetoes → vetoed (override scheduled)
  ↓
OVERRIDE VOTE (2 cycles later)
  ↓
override-passed (6+) → consequences applied, DONE
override-failed (<6) → initiative dies, DONE
```

**Terminal statuses:**
- `passed` (with MayoralAction='signed')
- `override-passed`
- `override-failed`
- `failed` (did not pass initial vote)
- `resolved` (manual resolution)

---

## Data Sources

### Primary Ledgers

**Initiative_Tracker** (24 columns)
- Initiative details, vote requirements, outcomes
- Swing voter assignments
- Mayoral action tracking (v1.7)
- Override vote data (v1.7)

**Civic_Office_Ledger** (19 columns)
- Office holders, terms, factions
- Council member availability
- Approval ratings (v1.7)
- Executive actions history (v1.7)

**Neighborhood_Demographics**
- Population breakdown by age, employment, health
- Used for demographic vote influence

### Engine Context

**ctx.summary fields:**
- `votesThisCycle` - Votes resolved this cycle
- `initiativeRipples` - Active ripple effects
- `storyHooks` - Generated story hooks for Media Room

---

## Common Adjudication Scenarios

### Scenario 1: Vote Count Discrepancy

**Question:** Initiative shows 5-4 vote, but only 8 council members available.

**Check:**
1. Civic_Office_Ledger Status column
2. Count members NOT in (hospitalized, deceased, resigned, etc.)
3. Verify faction totals match availability
4. Check Initiative_Tracker Notes for explanation

**Canon ruling:** If numbers don't add up, check Engine_Errors ledger. If clean run, accept engine output as canonical.

### Scenario 2: Mayor Vetoes Own Faction's Initiative

**Question:** Mayor Santana (OPP) vetoed an OPP housing initiative. Why?

**Check:**
1. Budget size (was it >$50M?)
2. Controversy level in Projection
3. Approval rating (was it <40, making her cautious?)
4. Veto probability is **non-zero** even for same faction (-20% modifier but other factors can overcome)

**Canon ruling:** Veto reasons in VetoReason column are canonical. Mayor may veto for pragmatic reasons even when politically aligned.

### Scenario 3: Override Vote Changes Outcome

**Question:** Override scheduled but council composition changed. New IND member filled vacant seat. Does override logic account for this?

**Answer:** YES. Override vote recalculates using current council state, not original vote state. Availability changes are canonical.

**Media angle:** "Council composition shift tilts override vote" is valid story hook.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v1.7 | 2026-02-11 | Mayoral veto, override votes, approval ratings, executive actions tracking |
| v1.6 | 2026-02-09 | Date parsing fix, faction whitespace trim |
| v1.5 | 2026-02-06 | Delayed initiative retry, deterministic RNG |
| v1.4 | 2026-02-05 | Manual vote execution |
| v1.3 | 2026-02-04 | Demographic influence, neighborhood ripples |
| v1.2 | 2026-02-03 | 9-seat model, mayor veto framework |
| v1.1 | 2026-02-02 | Dual swing voters |

---

## Related Documents

**In docs/mara-vance/**
- This file (master reference)
- CIVIC_VETO_IMPLEMENTATION.md (v1.7 technical spec)
- CIVIC_ELECTION_ENGINE.md (election system)
- INITIATIVE_TRACKER_VOTER_LOGIC.md (swing voter details)

**In docs/engine/**
- CIVIC_INITIATIVE_v1.5_UPGRADE.md (upgrade tracker)

**Source Code:**
- phase05-citizens/civicInitiativeEngine.js v1.7
- phase05-citizens/runCivicElectionsv1.js v1.0

---

## Quick Reference Cards

### For Press Briefings

**"How does a veto work?"**
> "If council passes an initiative, Mayor Santana has the option to veto within the same cycle. The veto cites specific concerns — budget, timeline, community consensus. Council can override with a six-vote supermajority two cycles later."

**"What's the mayor's approval rating?"**
> "Tracked in our governance ledger. Currently [CHECK Civic_Office_Ledger Approval column]. Affected by veto decisions, crisis response, and policy outcomes."

**"Why did [council member] vote that way?"**
> "Council members vote based on faction alignment, district interests, and demographic influence. IND members are true swing voters — probability-based outcomes reflect political uncertainty."

### For Canon Checks

**"Is this name consistent?"**
> Check Civic_Office_Ledger Holder column. Cross-reference with Simulation_Ledger PopId. Names are canonical once in Civic_Office_Ledger.

**"Did this vote actually happen?"**
> Check Initiative_Tracker VoteCycle and Outcome columns. If Outcome is filled, vote occurred. Notes column has vote breakdown.

**"Was there a veto?"**
> Check Initiative_Tracker MayoralAction column. Values: 'none' (pending), 'signed' (approved), 'vetoed' (blocked).

---

**End of Master Reference**

For technical implementation details, see CIVIC_VETO_IMPLEMENTATION.md.
For journalist assignments and story angles, see MEDIA_ROOM_STYLE_GUIDE.md.
